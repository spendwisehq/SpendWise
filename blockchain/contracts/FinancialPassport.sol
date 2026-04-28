// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FinancialPassport
 * @notice Soulbound ERC-721. Non-transferable. One per wallet.
 *         Third-party apps call getPassport(address) for trust verification --- B2B play.
 *
 * HOW IT WORKS
 * ------------------------------------
 * 1. Backend calls issuePassport(wallet, tier, score, badgeCount) after a user
 *    reaches a minimum health score threshold (e.g. --- 55 = "Fair").
 * 2. Passport stores: tier, score, badge count, issue timestamp.
 * 3. Backend calls updatePassport() whenever health tier or score changes.
 * 4. Third-party apps (lenders, fintech, employers) call getPassport(address)
 *    --- they get tier, score, last updated --- no PII, just financial health signal.
 * 5. User calls revokePassport() to burn their own passport (right to be forgotten).
 *    Admin can also revoke if fraud is detected.
 *
 * B2B INTEGRATION PATTERN
 * ------------------------------------------------------------------------
 * External contracts call:
 *   (bool exists, uint8 tier, uint16 score, uint256 updatedAt) = passport.getPassport(userAddr);
 * They get a trust signal without any backend call --- fully on-chain.
 *
 * TIERS  (match FinancialScoreCert and backend)
 * ---------------
 *  0 = Critical  (0---39)
 *  1 = Poor      (40---54)
 *  2 = Fair      (55---69)
 *  3 = Good      (70---84)
 *  4 = Excellent (85---100)
 *
 * ROLES
 * ---------------
 * DEFAULT_ADMIN_ROLE  --- can grant ISSUER_ROLE, revoke any passport
 * ISSUER_ROLE         --- backend oracle wallet; issues and updates passports
 */
contract FinancialPassport is ERC721, AccessControl, ReentrancyGuard {

    using Strings for uint256;

    // ------ Roles ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // ------ Passport data ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    struct PassportData {
        uint8   tier;           // 0---4
        uint16  score;          // --10 (e.g. 725 = 72.5) --- matches FinancialScoreCert
        uint16  badgeCount;     // number of SpendWiseBudgetCommitment badges earned
        uint256 issuedAt;
        uint256 lastUpdated;
        uint256 updateCount;
        bool    active;         // false if revoked
    }

    // tokenId --- PassportData
    mapping(uint256 => PassportData) private _passports;

    // wallet --- tokenId (one passport per wallet)
    mapping(address => uint256) public passportOf;

    // Minimum score to be eligible for a passport (--10, so 550 = score 55.0 = "Fair")
    uint16 public minScoreThreshold = 400; // default: Poor tier and above

    uint256 private _nextTokenId = 1;

    // ------ Events ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    event PassportIssued(address indexed owner, uint256 indexed tokenId, uint8 tier, uint16 score);
    event PassportUpdated(uint256 indexed tokenId, uint8 oldTier, uint8 newTier, uint16 newScore);
    event PassportRevoked(uint256 indexed tokenId, address indexed owner, address revokedBy);
    event ThresholdUpdated(uint16 newThreshold);

    // ------ Constructor ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    constructor(address admin, address issuer)
        ERC721("SpendWise Financial Passport", "SWFP")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE,        issuer);
    }

    // ------ Issue ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Issue a financial passport to a wallet.
     * @param to          Wallet address
     * @param tier        Health tier 0---4
     * @param score       Health score --10
     * @param badgeCount  Number of budget commitment badges earned so far
     */
    function issuePassport(
        address to,
        uint8   tier,
        uint16  score,
        uint16  badgeCount
    )
        external
        onlyRole(ISSUER_ROLE)
        nonReentrant
        returns (uint256 tokenId)
    {
        require(to != address(0),          "Passport: zero address");
        require(passportOf[to] == 0,       "Passport: already has passport");
        require(tier <= 4,                 "Passport: invalid tier");
        require(score <= 1000,             "Passport: score > 1000");
        require(score >= minScoreThreshold,"Passport: score below threshold");

        tokenId = _nextTokenId++;

        _passports[tokenId] = PassportData({
            tier:        tier,
            score:       score,
            badgeCount:  badgeCount,
            issuedAt:    block.timestamp,
            lastUpdated: block.timestamp,
            updateCount: 0,
            active:      true
        });

        passportOf[to] = tokenId;
        _safeMint(to, tokenId);

        emit PassportIssued(to, tokenId, tier, score);
    }

    // ------ Update ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Update passport when score or tier changes.
     * @param tokenId     Token to update
     * @param newTier     New health tier
     * @param newScore    New score --10
     * @param newBadgeCount  Updated badge count
     */
    function updatePassport(
        uint256 tokenId,
        uint8   newTier,
        uint16  newScore,
        uint16  newBadgeCount
    )
        external
        onlyRole(ISSUER_ROLE)
    {
        require(_ownerOf(tokenId) != address(0), "Passport: nonexistent token");
        require(newTier <= 4,                     "Passport: invalid tier");
        require(newScore <= 1000,                 "Passport: score > 1000");

        PassportData storage p = _passports[tokenId];
        require(p.active, "Passport: revoked");

        uint8 oldTier = p.tier;

        p.tier        = newTier;
        p.score       = newScore;
        p.badgeCount  = newBadgeCount;
        p.lastUpdated = block.timestamp;
        p.updateCount += 1;

        emit PassportUpdated(tokenId, oldTier, newTier, newScore);
    }

    // ------ Revoke ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice User revokes their own passport (right to be forgotten / GDPR).
     *         Burns the token. Wallet can be re-issued a new one later.
     */
    function revokeMyPassport() external nonReentrant {
        uint256 tokenId = passportOf[msg.sender];
        require(tokenId != 0, "Passport: no passport");
        _revokeAndBurn(tokenId, msg.sender, msg.sender);
    }

    /**
     * @notice Admin revokes a passport (fraud / abuse detection).
     */
    function adminRevokePassport(uint256 tokenId)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        address owner = _ownerOf(tokenId);
        require(owner != address(0), "Passport: nonexistent token");
        _revokeAndBurn(tokenId, owner, msg.sender);
    }

    function _revokeAndBurn(uint256 tokenId, address owner, address revokedBy) internal {
        _passports[tokenId].active = false;
        passportOf[owner]          = 0;
        _burn(tokenId);
        emit PassportRevoked(tokenId, owner, revokedBy);
    }

    // ------ B2B read interface ------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Primary B2B integration point.
     *         External contracts / dApps call this to verify financial health.
     *
     * @param wallet    The address to check
     * @return exists       Whether a valid passport exists
     * @return tier         Health tier 0---4
     * @return score        Score --10 (divide by 10 for display)
     * @return badgeCount   Budget commitment badges earned
     * @return lastUpdated  Timestamp of last score update
     */
    function getPassport(address wallet)
        external
        view
        returns (
            bool    exists,
            uint8   tier,
            uint16  score,
            uint16  badgeCount,
            uint256 lastUpdated
        )
    {
        uint256 tokenId = passportOf[wallet];
        if (tokenId == 0) return (false, 0, 0, 0, 0);

        PassportData storage p = _passports[tokenId];
        if (!p.active) return (false, 0, 0, 0, 0);

        return (true, p.tier, p.score, p.badgeCount, p.lastUpdated);
    }

    /**
     * @notice Check if a wallet meets a minimum tier requirement.
     *         e.g. lender calls: requiresTier(userWallet, 3) --- must be "Good"
     */
    function meetsTierRequirement(address wallet, uint8 requiredTier)
        external
        view
        returns (bool)
    {
        uint256 tokenId = passportOf[wallet];
        if (tokenId == 0) return false;
        PassportData storage p = _passports[tokenId];
        return p.active && p.tier >= requiredTier;
    }

    /**
     * @notice Check if a wallet meets a minimum score requirement (--10).
     *         e.g. meetingScoreRequirement(wallet, 700) --- score --- 70.0
     */
    function meetsScoreRequirement(address wallet, uint16 requiredScore)
        external
        view
        returns (bool)
    {
        uint256 tokenId = passportOf[wallet];
        if (tokenId == 0) return false;
        PassportData storage p = _passports[tokenId];
        return p.active && p.score >= requiredScore;
    }

    // ------ Token URI --- on-chain SVG ------------------------------------------------------------------------------------------------------------------------------------------

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Passport: nonexistent token");
        PassportData memory p = _passports[tokenId];

        string memory svg  = _buildSVG(tokenId, p);
        string memory json = _buildJSON(tokenId, p, Base64.encode(bytes(svg)));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    function _buildSVG(uint256 tokenId, PassportData memory p)
        internal
        pure
        returns (string memory)
    {
        (string memory tierName, string memory color, string memory bg) = _tierMeta(p.tier);
        string memory scoreStr = _formatScore(p.score);

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">',
            '<defs>',
              '<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:', bg, '"/>',
                '<stop offset="100%" style="stop-color:#0f172a"/>',
              '</linearGradient>',
            '</defs>',
            '<rect width="320" height="200" rx="16" fill="url(#g)"/>',
            // Passport stripe
            '<rect x="0" y="0" width="8" height="200" rx="4" fill="', color, '"/>',
            // Title
            '<text x="24" y="30" font-family="monospace" font-size="10" fill="#94a3b8">SPENDWISE FINANCIAL PASSPORT</text>',
            '<text x="24" y="52" font-family="monospace" font-size="11" fill="#64748b">#', tokenId.toString(), '</text>',
            // Tier badge
            '<rect x="24" y="62" width="90" height="22" rx="11" fill="', color, '" opacity="0.2"/>',
            '<text x="69" y="77" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="', color, '">', tierName, '</text>',
            // Score
            '<text x="24" y="115" font-family="monospace" font-size="38" font-weight="bold" fill="', color, '">', scoreStr, '</text>',
            '<text x="24" y="133" font-family="sans-serif" font-size="10" fill="#64748b">FINANCIAL SCORE</text>',
            // Badges
            '<text x="24" y="162" font-family="monospace" font-size="11" fill="#94a3b8">BADGES  ', uint256(p.badgeCount).toString(), '</text>',
            '<text x="24" y="180" font-family="monospace" font-size="9" fill="#475569">UPDATES  ', p.updateCount.toString(), '</text>',
            // Soulbound mark
            '<text x="296" y="185" text-anchor="end" font-family="monospace" font-size="8" fill="#334155">SOULBOUND</text>',
            // Status dot
            '<circle cx="300" cy="20" r="6" fill="', (p.active ? color : "#ef4444"), '"/>',
            '</svg>'
        ));
    }

    function _buildJSON(uint256 tokenId, PassportData memory p, string memory svgB64)
        internal
        pure
        returns (string memory)
    {
        (string memory tierName,,) = _tierMeta(p.tier);

        return string(abi.encodePacked(
            '{"name":"SpendWise Financial Passport #', tokenId.toString(), '",',
            '"description":"Soulbound financial health passport. Non-transferable. B2B trust verification.",',
            '"image":"data:image/svg+xml;base64,', svgB64, '",',
            '"attributes":[',
              '{"trait_type":"Tier","value":"', tierName, '"},',
              '{"trait_type":"Score","value":', _formatScore(p.score), '},',
              '{"trait_type":"Badges","value":', uint256(p.badgeCount).toString(), '},',
              '{"trait_type":"Active","value":', (p.active ? "true" : "false"), '},',
              '{"trait_type":"Updates","value":', p.updateCount.toString(), '}',
            ']}'
        ));
    }

    function _tierMeta(uint8 tier)
        internal
        pure
        returns (string memory name, string memory color, string memory bg)
    {
        if (tier == 0) return ("CRITICAL",  "#ef4444", "#1a0505");
        if (tier == 1) return ("POOR",      "#f97316", "#1a0a00");
        if (tier == 2) return ("FAIR",      "#eab308", "#1a1600");
        if (tier == 3) return ("GOOD",      "#3b82f6", "#00081a");
                       return ("EXCELLENT", "#22c55e", "#001a07");
    }

    function _formatScore(uint16 score) internal pure returns (string memory) {
        return string(abi.encodePacked(
            Strings.toString(score / 10), ".", Strings.toString(score % 10)
        ));
    }

    // ------ Admin ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function setMinScoreThreshold(uint16 threshold)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(threshold <= 1000, "Passport: threshold > 1000");
        minScoreThreshold = threshold;
        emit ThresholdUpdated(threshold);
    }

    // ------ Soulbound: block all transfers ------------------------------------------------------------------------------------------------------------------------

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0), unicode"Passport: soulbound \u2014 non-transferable");
        return super._update(to, tokenId, auth);
    }

    // ------ ERC165 ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

