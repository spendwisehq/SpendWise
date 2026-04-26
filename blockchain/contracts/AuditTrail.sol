// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AuditTrail
 * @notice Merkle-batch audit system for SpendWise.
 *
 * HOW IT WORKS
 * ------------
 * 1. Backend collects all transactions for a given day.
 * 2. Off-chain: build a Merkle tree from (userId, transactionId, hash, chainHash).
 * 3. Once per day the backend calls anchorDailyRoot() with the Merkle root.
 *    Only one ORACLE_ROLE address may call this.
 * 4. Anyone can later call verifyTransaction() with a leaf + proof to prove
 *    a specific transaction was in that day's batch - no trust required.
 * 5. The contract never stores individual hashes on-chain, just the daily root.
 *    This gives O(1) gas per day regardless of transaction volume.
 *
 * ROLES
 * -----
 * DEFAULT_ADMIN_ROLE  - can grant / revoke ORACLE_ROLE
 * ORACLE_ROLE         - your backend service wallet; anchors daily roots
 * ARBITRATOR_ROLE     - can invalidate a root if tampering is proven off-chain
 */
contract AuditTrail is AccessControl, ReentrancyGuard {

    // -- Roles ----------------------------------------------------------------
    bytes32 public constant ORACLE_ROLE     = keccak256("ORACLE_ROLE");
    bytes32 public constant ARBITRATOR_ROLE = keccak256("ARBITRATOR_ROLE");

    // -- Data structures ------------------------------------------------------

    struct DailyBatch {
        bytes32 merkleRoot;       // Merkle root of all tx leaves for this day
        uint256 txCount;          // Number of transactions in the batch
        uint256 anchoredAt;       // Block timestamp when anchored
        uint256 anchoredBlock;    // Block number when anchored
        bool    invalidated;      // Arbitrator can flag if tamper proof found
        string  ipfsCid;          // Optional: full leaf set stored off-chain
    }

    // date string (e.g. "2025-07-15") -> batch
    mapping(string => DailyBatch) private _batches;

    // Ordered list of date keys for iteration / UI
    string[] public batchDates;

    // Per-user daily root index: userId (bytes32) -> date -> root
    // Lets you query "what root covers this user on this date?"
    mapping(bytes32 => mapping(string => bytes32)) private _userDailyRoot;

    // -- Events ---------------------------------------------------------------

    event BatchAnchored(
        string  indexed date,
        bytes32 indexed merkleRoot,
        uint256         txCount,
        uint256         anchoredAt,
        string          ipfsCid
    );

    event BatchInvalidated(
        string  indexed date,
        bytes32 indexed merkleRoot,
        address         arbitrator,
        string          reason
    );

    event TransactionVerified(
        string  indexed date,
        bytes32 indexed leafHash,
        address         verifiedBy
    );

    // -- Constructor ----------------------------------------------------------

    constructor(address admin, address oracle, address arbitrator) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ORACLE_ROLE,        oracle);
        _grantRole(ARBITRATOR_ROLE,    arbitrator);
    }

    // -- Core: anchor a daily batch -------------------------------------------

    /**
     * @notice Anchor the Merkle root for a given date's transaction batch.
     * @param date      ISO date string, e.g. "2025-07-15"
     * @param root      Merkle root computed off-chain from transaction leaves
     * @param txCount   Number of leaves (transactions) in the tree
     * @param ipfsCid   Optional IPFS CID where the full leaf list is stored
     *
     * Can only be called once per date. If you need to amend, invalidate + re-anchor.
     */
    function anchorDailyRoot(
        string  calldata date,
        bytes32          root,
        uint256          txCount,
        string  calldata ipfsCid
    )
        external
        onlyRole(ORACLE_ROLE)
        nonReentrant
    {
        require(root != bytes32(0),                "AuditTrail: zero root");
        require(bytes(date).length == 10,          "AuditTrail: date must be YYYY-MM-DD");
        require(txCount > 0,                       "AuditTrail: empty batch");
        require(_batches[date].anchoredAt == 0,    "AuditTrail: date already anchored");

        _batches[date] = DailyBatch({
            merkleRoot:    root,
            txCount:       txCount,
            anchoredAt:    block.timestamp,
            anchoredBlock: block.number,
            invalidated:   false,
            ipfsCid:       ipfsCid
        });

        batchDates.push(date);

        emit BatchAnchored(date, root, txCount, block.timestamp, ipfsCid);
    }

    // -- Verification ---------------------------------------------------------

    /**
     * @notice Verify that a transaction leaf is included in a day's batch.
     * @param date      The date string this transaction belongs to
     * @param leaf      keccak256 of the transaction data (see leafFor() helper)
     * @param proof     Merkle proof array (generated off-chain)
     * @return valid    true if the leaf is proven in the anchored root
     *
     * LEAF CONSTRUCTION (must match backend):
     *   leaf = keccak256(abi.encodePacked(
     *              userId,         // bytes32
     *              transactionId,  // bytes32
     *              hash,           // bytes32 (your off-chain chain hash)
     *              blockIndex      // uint256
     *          ))
     */
    function verifyTransaction(
        string   calldata date,
        bytes32           leaf,
        bytes32[] calldata proof
    )
        external
        returns (bool valid)
    {
        DailyBatch storage batch = _batches[date];
        require(batch.anchoredAt != 0,   "AuditTrail: date not anchored");
        require(!batch.invalidated,      "AuditTrail: batch invalidated");

        valid = MerkleProof.verify(proof, batch.merkleRoot, leaf);

        if (valid) {
            emit TransactionVerified(date, leaf, msg.sender);
        }
    }

    /**
     * @notice Pure view version of verify - no event, no state change.
     *         Useful for front-end read-only checks.
     */
    function verifyTransactionView(
        string    calldata date,
        bytes32            leaf,
        bytes32[] calldata proof
    )
        external
        view
        returns (bool)
    {
        DailyBatch storage batch = _batches[date];
        if (batch.anchoredAt == 0 || batch.invalidated) return false;
        return MerkleProof.verify(proof, batch.merkleRoot, leaf);
    }

    // -- Arbitrator: invalidate a bad batch -----------------------------------

    /**
     * @notice Mark a daily batch as invalidated (e.g. proof of tampered data found).
     *         Does NOT delete - history is preserved; the flag prevents future proofs.
     */
    function invalidateBatch(
        string calldata date,
        string calldata reason
    )
        external
        onlyRole(ARBITRATOR_ROLE)
    {
        DailyBatch storage batch = _batches[date];
        require(batch.anchoredAt != 0, "AuditTrail: date not anchored");
        require(!batch.invalidated,    "AuditTrail: already invalidated");

        batch.invalidated = true;

        emit BatchInvalidated(date, batch.merkleRoot, msg.sender, reason);
    }

    // -- View helpers ---------------------------------------------------------

    function getBatch(string calldata date)
        external
        view
        returns (DailyBatch memory)
    {
        return _batches[date];
    }

    function batchCount() external view returns (uint256) {
        return batchDates.length;
    }

    /**
     * @notice Compute a leaf the same way the backend should.
     *         Call this from tests to ensure consistency.
     */
    function leafFor(
        bytes32 userId,
        bytes32 transactionId,
        bytes32 txHash,
        uint256 blockIndex
    )
        external
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(userId, transactionId, txHash, blockIndex));
    }

    /**
     * @notice Returns the most recent N batch dates (latest first).
     *         Useful for dashboard queries.
     */
    function recentDates(uint256 n)
        external
        view
        returns (string[] memory)
    {
        uint256 total  = batchDates.length;
        uint256 count  = n > total ? total : n;
        string[] memory result = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = batchDates[total - 1 - i];
        }
        return result;
    }
}
