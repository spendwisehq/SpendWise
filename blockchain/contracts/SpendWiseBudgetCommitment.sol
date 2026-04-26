// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/*
 * @title SpendWiseBudgetCommitment
 * @notice Users lock MATIC with a monthly spending goal.
 *         At month-end the backend oracle reports actual spend.
 *         Goal met  --- full refund + BadgeEarned event (mint badge off this)
 *         Goal miss --- configured % sent to charity wallet, rest refunded
 *
 * CHAINLINK FUNCTIONS NOTE
 * ------------------------------------------------------------------------
 * The resolveCommitment() function is designed to be called by either:
 *   (a) Your backend ORACLE_ROLE wallet (current implementation --- simple, works now)
 *   (b) A Chainlink Functions fulfillment callback (future upgrade path)
 *
 * To upgrade to Chainlink Functions later:
 *   1. Inherit FunctionsClient from chainlink contracts
 *   2. Replace resolveCommitment() with fulfillRequest() callback
 *   3. The charity/refund logic stays identical --- only the caller changes
 *
 * COMMITMENT LIFECYCLE
 * ------------------------------------------------------------
 *  ACTIVE    --- user has locked MATIC, month not over
 *  RESOLVED  --- oracle reported, funds distributed
 *  CANCELLED --- user cancelled before deadline (full refund, no badge)
 *  EXPIRED   --- past resolution deadline, emergency refund available
 *
 * ROLES
 * ---------------
 * DEFAULT_ADMIN_ROLE  --- set charity wallet, penalty %, platform fee, pause
 * ORACLE_ROLE         --- backend wallet that calls resolveCommitment()
 */
contract SpendWiseBudgetCommitment is ReentrancyGuard, AccessControl, Pausable {

    // ------ Roles ----------------------------------------
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ------ Config ----------------------------------------
    address public charityWallet;
    uint256 public penaltyBps       = 2000;  // 20% to charity on miss (adjustable)
    uint256 public platformFeeBps   = 100;   // 1% platform fee
    address public feeRecipient;

    uint256 public constant MAX_PENALTY_BPS  = 5000;  // cap at 50%
    uint256 public constant GRACE_PERIOD     = 3 days; // oracle has 3 days past deadline
    uint256 public constant MAX_LOCK_MONTHS  = 3;

    // ------ State enum ----------------------------------------
    enum State { ACTIVE, RESOLVED, CANCELLED, EXPIRED }

    // ------ Commitment struct ----------------------------------------
    struct Commitment {
        address owner;
        uint256 lockedAmount;       // MATIC locked (wei)
        uint256 spendingGoal;       // max allowed spend in USD cents (e.g. 50000 = $500.00)
        uint256 actualSpend;        // filled by oracle on resolution (USD cents)
        uint256 startTimestamp;
        uint256 deadlineTimestamp;  // when the month ends --- oracle resolves after this
        uint256 resolvedAt;
        State   state;
        bool    goalMet;
        string  category;           // e.g. "Food & Dining", "Total", "Entertainment"
        bytes32 offChainRef;        // userId hash --- links to MongoDB record
    }

    // ------ Storage ----------------------------------------
    uint256 private _nextId = 1;

    mapping(uint256 => Commitment) private _commitments;

    // owner --- list of their commitment IDs
    mapping(address => uint256[]) private _ownerCommitments;

    // ------ Events ----------------------------------------
    event CommitmentCreated(
        uint256 indexed id,
        address indexed owner,
        uint256 lockedAmount,
        uint256 spendingGoal,
        uint256 deadline,
        string  category
    );

    event CommitmentResolved(
        uint256 indexed id,
        address indexed owner,
        bool    goalMet,
        uint256 actualSpend,
        uint256 spendingGoal,
        uint256 refundAmount,
        uint256 charityAmount,
        uint256 feeAmount
    );

    event BadgeEarned(
        uint256 indexed commitmentId,
        address indexed owner,
        string  category,
        uint256 spendingGoal,
        uint256 actualSpend
    );

    event CommitmentCancelled(uint256 indexed id, address indexed owner, uint256 refundAmount);
    event EmergencyRefund(uint256 indexed id, address indexed owner, uint256 refundAmount);
    event CharityWalletUpdated(address newCharity);
    event PenaltyUpdated(uint256 newBps);

    // ------ Constructor ----------------------------------------
    constructor(
        address admin,
        address oracle,
        address _charityWallet,
        address _feeRecipient
    ) {
        require(_charityWallet != address(0), "Commitment: zero charity");
        require(_feeRecipient  != address(0), "Commitment: zero fee recipient");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE,        oracle);

        charityWallet = _charityWallet;
        feeRecipient  = _feeRecipient;
    }

    // ------ Create commitment ----------------------------------------

    /**
     * @notice Lock MATIC with a spending goal for a given period.
     * @param spendingGoal       Max allowed spend in USD cents (e.g. 50000 = $500)
     * @param durationDays       How many days the commitment runs (1---90)
     * @param category           Spending category label
     * @param offChainRef        keccak256 of your MongoDB userId --- links records
     *
     * msg.value  = MATIC to lock (must be > 0)
     */
    function createCommitment(
        uint256        spendingGoal,
        uint256        durationDays,
        string calldata category,
        bytes32        offChainRef
    )
        external
        payable
        nonReentrant
        whenNotPaused
        returns (uint256 id)
    {
        require(msg.value > 0,                              "Commitment: must lock MATIC");
        require(spendingGoal > 0,                           "Commitment: zero goal");
        require(durationDays >= 1,                          "Commitment: min 1 day");
        require(durationDays <= MAX_LOCK_MONTHS * 30,       "Commitment: max 90 days");
        require(bytes(category).length > 0,                 "Commitment: empty category");

        id = _nextId++;

        uint256 deadline = block.timestamp + (durationDays * 1 days);

        _commitments[id] = Commitment({
            owner:              msg.sender,
            lockedAmount:       msg.value,
            spendingGoal:       spendingGoal,
            actualSpend:        0,
            startTimestamp:     block.timestamp,
            deadlineTimestamp:  deadline,
            resolvedAt:         0,
            state:              State.ACTIVE,
            goalMet:            false,
            category:           category,
            offChainRef:        offChainRef
        });

        _ownerCommitments[msg.sender].push(id);

        emit CommitmentCreated(id, msg.sender, msg.value, spendingGoal, deadline, category);
    }

    // ------ Oracle resolution ----------------------------------------

    /**
     * @notice Oracle reports actual spend and distributes funds.
     *         Can only be called after deadline and within GRACE_PERIOD.
     *
     * @param id           Commitment ID
     * @param actualSpend  Actual spend in USD cents reported by backend
     *
     * DISTRIBUTION ON MISS:
     *   penaltyBps  % --- charity wallet
     *   platformFeeBps% --- fee recipient
     *   remainder       --- user refund
     *
     * DISTRIBUTION ON GOAL MET:
     *   platformFeeBps% --- fee recipient
     *   remainder       --- full user refund + BadgeEarned event
     */
    function resolveCommitment(uint256 id, uint256 actualSpend)
        external
        nonReentrant
        onlyRole(ORACLE_ROLE)
    {
        Commitment storage c = _commitments[id];

        require(c.owner != address(0),                  "Commitment: not found");
        require(c.state == State.ACTIVE,                "Commitment: not ACTIVE");
        require(block.timestamp >= c.deadlineTimestamp, "Commitment: deadline not reached");
        require(
            block.timestamp <= c.deadlineTimestamp + GRACE_PERIOD,
            "Commitment: past grace period - use emergencyRefund"
        );

        c.actualSpend  = actualSpend;
        c.resolvedAt   = block.timestamp;
        c.state        = State.RESOLVED;
        c.goalMet      = (actualSpend <= c.spendingGoal);

        uint256 locked      = c.lockedAmount;
        uint256 fee         = (locked * platformFeeBps) / 10000;
        uint256 afterFee    = locked - fee;

        uint256 charityAmount = 0;
        uint256 refundAmount;

        if (!c.goalMet) {
            charityAmount = (locked * penaltyBps) / 10000;
            if (charityAmount + fee > locked) {
                charityAmount = locked - fee;
            }
            refundAmount = locked - fee - charityAmount;
        } else {
            refundAmount = afterFee;
        }

        // ------ Transfer fee ----------------------------------------
        if (fee > 0) {
            (bool feeOk,) = feeRecipient.call{value: fee}("");
            require(feeOk, "Commitment: fee transfer failed");
        }

        // ------ Transfer charity portion ----------------------------------------
        if (charityAmount > 0) {
            (bool charityOk,) = charityWallet.call{value: charityAmount}("");
            require(charityOk, "Commitment: charity transfer failed");
        }

        // ------ Refund user ----------------------------------------
        if (refundAmount > 0) {
            (bool refundOk,) = c.owner.call{value: refundAmount}("");
            require(refundOk, "Commitment: refund transfer failed");
        }

        emit CommitmentResolved(
            id, c.owner, c.goalMet,
            actualSpend, c.spendingGoal,
            refundAmount, charityAmount, fee
        );

        // Emit badge event --- backend listens and mints FinancialScoreCert badge
        if (c.goalMet) {
            emit BadgeEarned(id, c.owner, c.category, c.spendingGoal, actualSpend);
        }
    }

    // ------ User: cancel before deadline ----------------------------------------

    /**
     * @notice User cancels commitment before the deadline.
     *         Full refund, no badge, no penalty.
     *         Once cancelled you can create a new commitment.
     */
    function cancelCommitment(uint256 id)
        external
        nonReentrant
        whenNotPaused
    {
        Commitment storage c = _commitments[id];

        require(c.owner == msg.sender,                 "Commitment: not owner");
        require(c.state == State.ACTIVE,               "Commitment: not ACTIVE");
        require(block.timestamp < c.deadlineTimestamp, "Commitment: deadline passed - wait for oracle");

        uint256 refund = c.lockedAmount;
        c.state        = State.CANCELLED;
        c.lockedAmount = 0;

        (bool ok,) = msg.sender.call{value: refund}("");
        require(ok, "Commitment: cancel refund failed");

        emit CommitmentCancelled(id, msg.sender, refund);
    }

    // ------ Emergency refund after grace period ----------------------------------------

    /**
     * @notice If oracle fails to resolve within GRACE_PERIOD, user gets full refund.
     *         No penalty --- oracle failure is not the user's fault.
     */
    function emergencyRefund(uint256 id)
        external
        nonReentrant
    {
        Commitment storage c = _commitments[id];

        require(c.owner == msg.sender,  "Commitment: not owner");
        require(c.state == State.ACTIVE,"Commitment: not ACTIVE");
        require(
            block.timestamp > c.deadlineTimestamp + GRACE_PERIOD,
            "Commitment: grace period not over"
        );

        uint256 refund = c.lockedAmount;
        c.state        = State.EXPIRED;
        c.lockedAmount = 0;

        (bool ok,) = msg.sender.call{value: refund}("");
        require(ok, "Commitment: emergency refund failed");

        emit EmergencyRefund(id, msg.sender, refund);
    }

    // ------ Admin ----------------------------------------

    function setCharityWallet(address wallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(wallet != address(0), "Commitment: zero address");
        charityWallet = wallet;
        emit CharityWalletUpdated(wallet);
    }

    function setPenaltyBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= MAX_PENALTY_BPS, "Commitment: penalty > 50%");
        penaltyBps = bps;
        emit PenaltyUpdated(bps);
    }

    function setPlatformFee(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= 500, "Commitment: fee > 5%");
        platformFeeBps = bps;
    }

    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "Commitment: zero address");
        feeRecipient = recipient;
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ------ View helpers ----------------------------------------

    function getCommitment(uint256 id) external view returns (Commitment memory) {
        return _commitments[id];
    }

    function getOwnerCommitments(address owner) external view returns (uint256[] memory) {
        return _ownerCommitments[owner];
    }

    function getActiveCommitments(address owner)
        external
        view
        returns (uint256[] memory activeIds)
    {
        uint256[] storage ids = _ownerCommitments[owner];
        uint256 count;
        for (uint256 i = 0; i < ids.length; i++) {
            if (_commitments[ids[i]].state == State.ACTIVE) count++;
        }
        activeIds = new uint256[](count);
        uint256 j;
        for (uint256 i = 0; i < ids.length; i++) {
            if (_commitments[ids[i]].state == State.ACTIVE) {
                activeIds[j++] = ids[i];
            }
        }
    }

    /**
     * @notice Compute expected distribution for a given commitment + actual spend.
     *         Call this from frontend before resolution for a preview.
     */
    function previewResolution(uint256 id, uint256 actualSpend)
        external
        view
        returns (
            bool   goalMet,
            uint256 refundAmount,
            uint256 charityAmount,
            uint256 feeAmount
        )
    {
        Commitment storage c = _commitments[id];
        require(c.owner != address(0), "Commitment: not found");

        goalMet       = (actualSpend <= c.spendingGoal);
        uint256 locked = c.lockedAmount;
        feeAmount      = (locked * platformFeeBps) / 10000;

        if (!goalMet) {
            charityAmount = (locked * penaltyBps) / 10000;
            if (charityAmount + feeAmount > locked) charityAmount = locked - feeAmount;
            refundAmount  = locked - feeAmount - charityAmount;
        } else {
            charityAmount = 0;
            refundAmount  = locked - feeAmount;
        }
    }

    // ------ ERC165 ----------------------------------------
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
