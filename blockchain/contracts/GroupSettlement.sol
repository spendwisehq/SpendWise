// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GroupSettlement
 * @notice Trustless escrow for SpendWise group expense settlements.
 *
 * HOW IT WORKS
 * ------------------------------------
 * 1. A group creator calls createSettlement() with the list of members and
 *    their required deposit amounts (in MATIC wei).
 * 2. Each member calls deposit() to lock their MATIC into the contract.
 * 3. Once ALL members have deposited, the settlement is ACTIVE.
 * 4. Any THRESHOLD members (default = all) call approve() to release funds.
 *    On reaching the threshold, executeSettlement() distributes to payees.
 * 5. If something goes wrong, any member can raise a dispute. The arbitrator
 *    wallet (set per settlement) resolves it --- either force-release or refund.
 * 6. After EXPIRY_PERIOD (default 30 days), any member can trigger emergency
 *    refund if the settlement was never executed.
 *
 * SETTLEMENT STATES
 * ---------------------------------------------------
 *  PENDING    --- created, waiting for all deposits
 *  ACTIVE     --- all deposits received, awaiting approvals
 *  EXECUTED   --- funds distributed, terminal
 *  DISPUTED   --- dispute raised, awaiting arbitrator
 *  REFUNDED   --- all funds returned, terminal
 *  EXPIRED    --- past expiry, refundable
 *
 * ROLES (global contract roles)
 * ---------------
 * DEFAULT_ADMIN_ROLE  --- can pause/unpause, update platform fee
 * ARBITRATOR_ROLE     --- can resolve disputes on any settlement
 *
 * Per-settlement arbitrator is set at creation and may be a different address.
 */
contract GroupSettlement is ReentrancyGuard, AccessControl, Pausable {

    // ------ Roles ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    // ------ Config ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    uint256 public constant EXPIRY_PERIOD   = 30 days;
    uint256 public constant MAX_MEMBERS     = 20;
    uint256 public platformFeeBps           = 50;   // 0.5% --- adjustable by admin
    address public feeRecipient;

    // ------ Settlement state enum ---------------------------------------------------------------------------------------------------------------------------------------------------
    enum State { PENDING, ACTIVE, EXECUTED, DISPUTED, REFUNDED, EXPIRED }

    // ------ Per-payee payout spec ---------------------------------------------------------------------------------------------------------------------------------------------------
    struct Payee {
        address wallet;
        uint256 amount;   // how much this payee receives on execution (wei)
    }

    // ------ Core settlement struct ------------------------------------------------------------------------------------------------------------------------------------------------
    struct Settlement {
        address   creator;
        string    description;        // e.g. "Goa trip July 2025"
        address[] members;
        uint256[] requiredDeposits;   // parallel array: members[i] must deposit requiredDeposits[i]
        Payee[]   payees;             // who gets paid on execution
        uint256   totalRequired;      // sum of all requiredDeposits
        uint256   totalDeposited;     // running total
        uint256   approvalThreshold;  // # approvals needed (default = member count)
        uint256   approvalCount;
        address   arbitrator;         // per-settlement dispute resolver
        uint256   createdAt;
        uint256   expiresAt;
        State     state;
        string    disputeReason;
        bool      arbitratorResolved;
    }

    // ------ Storage ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    uint256 private _nextId = 1;

    mapping(uint256 => Settlement)          private _settlements;
    mapping(uint256 => mapping(address => uint256)) public deposited;    // id --- member --- amount deposited
    mapping(uint256 => mapping(address => bool))    public hasApproved;  // id --- member --- approved?
    mapping(uint256 => bool)                        public isMember;     // packed key used differently below

    // settlementId --- member --- isMember
    mapping(uint256 => mapping(address => bool)) private _isMember;

    // ------ Events ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    event SettlementCreated(uint256 indexed id, address indexed creator, uint256 totalRequired);
    event Deposited(uint256 indexed id, address indexed member, uint256 amount);
    event SettlementActive(uint256 indexed id);
    event Approved(uint256 indexed id, address indexed member, uint256 approvalCount);
    event SettlementExecuted(uint256 indexed id, uint256 totalPaid);
    event DisputeRaised(uint256 indexed id, address indexed raisedBy, string reason);
    event DisputeResolved(uint256 indexed id, address indexed arbitrator, bool released);
    event Refunded(uint256 indexed id, address indexed member, uint256 amount);
    event EmergencyRefund(uint256 indexed id);
    event PlatformFeeUpdated(uint256 newBps);

    // ------ Constructor ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    constructor(address admin, address arbitrator, address _feeRecipient) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ARBITRATOR_ROLE,    arbitrator);
        feeRecipient = _feeRecipient;
    }

    // ------ Create settlement ---------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Create a new group settlement.
     * @param members          Array of member addresses (includes creator)
     * @param requiredDeposits Parallel array --- how much each member must deposit (wei)
     * @param payees           Who gets paid on execution and how much
     * @param description      Human-readable label for the settlement
     * @param arbitrator       Address that can resolve disputes (use address(0) for global arbitrator)
     * @param approvalThreshold Number of approvals needed to execute (0 = require all)
     */
    function createSettlement(
        address[] calldata members,
        uint256[] calldata requiredDeposits,
        Payee[]   calldata payees,
        string    calldata description,
        address            arbitrator,
        uint256            approvalThreshold
    )
        external
        whenNotPaused
        returns (uint256 id)
    {
        require(members.length >= 2, unicode"GroupSettlement: need \u2265 2 members");
        require(members.length <= MAX_MEMBERS,                "GroupSettlement: too many members");
        require(members.length == requiredDeposits.length,   "GroupSettlement: length mismatch");
        require(payees.length  >= 1,                         "GroupSettlement: no payees");

        // Validate payee amounts sum == total deposits
        uint256 totalRequired;
        for (uint256 i = 0; i < requiredDeposits.length; i++) {
            require(requiredDeposits[i] > 0, "GroupSettlement: zero deposit");
            totalRequired += requiredDeposits[i];
        }

        uint256 payeeTotal;
        for (uint256 i = 0; i < payees.length; i++) {
            require(payees[i].wallet != address(0), "GroupSettlement: zero payee");
            payeeTotal += payees[i].amount;
        }

        // Payee total must equal total deposits minus platform fee
        // We validate this loosely --- exact fee deducted at execution
        require(payeeTotal <= totalRequired, "GroupSettlement: payees exceed deposits");

        id = _nextId++;

        Settlement storage s = _settlements[id];
        s.creator           = msg.sender;
        s.description       = description;
        s.totalRequired     = totalRequired;
        s.approvalThreshold = approvalThreshold == 0 ? members.length : approvalThreshold;
        s.arbitrator        = arbitrator == address(0) ? address(0) : arbitrator;
        s.createdAt         = block.timestamp;
        s.expiresAt         = block.timestamp + EXPIRY_PERIOD;
        s.state             = State.PENDING;

        for (uint256 i = 0; i < members.length; i++) {
            require(members[i] != address(0), "GroupSettlement: zero member");
            s.members.push(members[i]);
            s.requiredDeposits.push(requiredDeposits[i]);
            _isMember[id][members[i]] = true;
        }

        for (uint256 i = 0; i < payees.length; i++) {
            s.payees.push(payees[i]);
        }

        emit SettlementCreated(id, msg.sender, totalRequired);
    }

    // ------ Deposit ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Member deposits their required MATIC.
     *         Send exactly the required amount --- no more, no less.
     */
    function deposit(uint256 id)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        Settlement storage s = _settlements[id];

        require(s.createdAt != 0,           "GroupSettlement: not found");
        require(s.state == State.PENDING,   "GroupSettlement: not in PENDING state");
        require(_isMember[id][msg.sender],  "GroupSettlement: not a member");
        require(deposited[id][msg.sender] == 0, "GroupSettlement: already deposited");
        require(block.timestamp < s.expiresAt,  "GroupSettlement: expired");

        // Find required deposit for this member
        uint256 required = _requiredFor(id, msg.sender);
        require(msg.value == required, "GroupSettlement: wrong deposit amount");

        deposited[id][msg.sender] = msg.value;
        s.totalDeposited += msg.value;

        emit Deposited(id, msg.sender, msg.value);

        // Check if all members have deposited
        if (s.totalDeposited >= s.totalRequired) {
            s.state = State.ACTIVE;
            emit SettlementActive(id);
        }
    }

    // ------ Approve ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Member approves execution of the settlement.
     *         Once threshold is reached, settlement auto-executes.
     */
    function approve(uint256 id)
        external
        nonReentrant
        whenNotPaused
    {
        Settlement storage s = _settlements[id];

        require(s.state == State.ACTIVE,      "GroupSettlement: not ACTIVE");
        require(_isMember[id][msg.sender],    "GroupSettlement: not a member");
        require(!hasApproved[id][msg.sender], "GroupSettlement: already approved");
        require(block.timestamp < s.expiresAt,"GroupSettlement: expired");

        hasApproved[id][msg.sender] = true;
        s.approvalCount++;

        emit Approved(id, msg.sender, s.approvalCount);

        if (s.approvalCount >= s.approvalThreshold) {
            _executeSettlement(id);
        }
    }

    // ------ Execute (internal) ------------------------------------------------------------------------------------------------------------------------------------------------------------

    function _executeSettlement(uint256 id) internal {
        Settlement storage s = _settlements[id];
        s.state = State.EXECUTED;

        uint256 totalPaid;
        uint256 fee = (s.totalDeposited * platformFeeBps) / 10000;

        // Pay platform fee first
        if (fee > 0 && feeRecipient != address(0)) {
            (bool feeOk,) = feeRecipient.call{value: fee}("");
            require(feeOk, "GroupSettlement: fee transfer failed");
        }

        // Distribute to payees
        for (uint256 i = 0; i < s.payees.length; i++) {
            uint256 payout = s.payees[i].amount;
            if (payout == 0) continue;

            (bool ok,) = s.payees[i].wallet.call{value: payout}("");
            require(ok, "GroupSettlement: payee transfer failed");
            totalPaid += payout;
        }

        emit SettlementExecuted(id, totalPaid);
    }

    // ------ Dispute ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Any member can raise a dispute, pausing the settlement.
     * @param reason  Human-readable explanation
     */
    function raiseDispute(uint256 id, string calldata reason)
        external
        whenNotPaused
    {
        Settlement storage s = _settlements[id];

        require(s.state == State.ACTIVE,     "GroupSettlement: not ACTIVE");
        require(_isMember[id][msg.sender],   "GroupSettlement: not a member");
        require(bytes(reason).length > 0,    "GroupSettlement: empty reason");

        s.state         = State.DISPUTED;
        s.disputeReason = reason;

        emit DisputeRaised(id, msg.sender, reason);
    }

    /**
     * @notice Arbitrator resolves a dispute.
     * @param id        Settlement ID
     * @param release   true = release funds to payees, false = refund all members
     */
    function resolveDispute(uint256 id, bool release)
        external
        nonReentrant
    {
        Settlement storage s = _settlements[id];

        require(s.state == State.DISPUTED, "GroupSettlement: not DISPUTED");

        // Accept resolution from: per-settlement arbitrator OR global ARBITRATOR_ROLE
        require(
            msg.sender == s.arbitrator || hasRole(ARBITRATOR_ROLE, msg.sender),
            "GroupSettlement: not arbitrator"
        );

        s.arbitratorResolved = true;

        if (release) {
            _executeSettlement(id);
        } else {
            _refundAll(id);
        }

        emit DisputeResolved(id, msg.sender, release);
    }

    // ------ Refund helpers ------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Any member can trigger emergency refund after expiry.
     */
    function emergencyRefund(uint256 id)
        external
        nonReentrant
    {
        Settlement storage s = _settlements[id];

        require(
            s.state == State.PENDING || s.state == State.ACTIVE,
            "GroupSettlement: cannot refund in current state"
        );
        require(block.timestamp >= s.expiresAt, "GroupSettlement: not yet expired");
        require(_isMember[id][msg.sender],       "GroupSettlement: not a member");

        s.state = State.EXPIRED;
        _refundAll(id);

        emit EmergencyRefund(id);
    }

    function _refundAll(uint256 id) internal {
        Settlement storage s = _settlements[id];
        s.state = State.REFUNDED;

        for (uint256 i = 0; i < s.members.length; i++) {
            address member  = s.members[i];
            uint256 amount  = deposited[id][member];
            if (amount == 0) continue;

            deposited[id][member] = 0;

            (bool ok,) = member.call{value: amount}("");
            require(ok, "GroupSettlement: refund transfer failed");

            emit Refunded(id, member, amount);
        }
    }

    // ------ Admin ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function setPlatformFee(uint256 newBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newBps <= 500, "GroupSettlement: fee > 5%");
        platformFeeBps = newBps;
        emit PlatformFeeUpdated(newBps);
    }

    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "GroupSettlement: zero address");
        feeRecipient = recipient;
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ------ View helpers ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function getSettlement(uint256 id) external view returns (Settlement memory) {
        return _settlements[id];
    }

    function getState(uint256 id) external view returns (State) {
        return _settlements[id].state;
    }

    function getMemberDeposited(uint256 id, address member) external view returns (uint256) {
        return deposited[id][member];
    }

    function _requiredFor(uint256 id, address member) internal view returns (uint256) {
        Settlement storage s = _settlements[id];
        for (uint256 i = 0; i < s.members.length; i++) {
            if (s.members[i] == member) return s.requiredDeposits[i];
        }
        return 0;
    }

    function requiredDepositFor(uint256 id, address member) external view returns (uint256) {
        return _requiredFor(id, member);
    }

    // ERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

