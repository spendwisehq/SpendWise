// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FinancialScoreCert
 * @notice Dynamic NFT --- on-chain SVG, no IPFS dependency.
 *
 * HOW IT WORKS
 * ------------------------------------
 * 1. Backend calls mintCert(userAddress, score, tier) when a user first
 *    connects their wallet.
 * 2. Every time the backend recalculates the user's financial health score,
 *    it calls updateScore(tokenId, newScore).
 *    The NFT image + metadata update instantly --- no IPFS pin needed.
 * 3. Auto-update rule: score change --- 5 points triggers a ScoreUpdated event
 *    that your backend listens for to sync off-chain state.
 * 4. tokenURI() returns a fully on-chain base64-encoded JSON with an embedded
 *    SVG --- opens directly in any NFT marketplace.
 *
 * TIERS  (match your existing backend health tiers)
 * ---------------
 *  0 = Critical   (score 0---39)   --- red
 *  1 = Poor        (score 40---54)  --- orange
 *  2 = Fair        (score 55---69)  --- yellow
 *  3 = Good        (score 70---84)  --- blue
 *  4 = Excellent   (score 85---100) --- green
 *
 * ROLES
 * ---------------
 * DEFAULT_ADMIN_ROLE  --- can grant / revoke MINTER_ROLE
 * MINTER_ROLE         --- your backend oracle wallet
 */
contract FinancialScoreCert is ERC721, AccessControl, ReentrancyGuard {

    using Strings for uint256;

    // ------ Roles ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // ------ Score data ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    struct ScoreData {
        uint16  score;          // 0---1000 (we store x10 for decimals, display /10)
        uint8   tier;           // 0---4
        uint256 lastUpdated;    // block.timestamp
        uint256 mintedAt;       // block.timestamp at mint
        uint256 updateCount;    // how many times score has changed
    }

    // tokenId --- ScoreData
    mapping(uint256 => ScoreData) private _scores;

    // wallet --- tokenId (one cert per wallet)
    mapping(address => uint256) public certOf;

    // tokenId counter
    uint256 private _nextTokenId = 1;

    // Minimum score delta to emit ScoreUpdated event (5 points = 50 in x10 storage)
    uint16 public constant MIN_DELTA = 50;

    // ------ Events ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    event CertMinted(address indexed owner, uint256 indexed tokenId, uint16 score, uint8 tier);
    event ScoreUpdated(uint256 indexed tokenId, uint16 oldScore, uint16 newScore, uint8 newTier);

    // ------ Constructor ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    constructor(address admin, address minter)
        ERC721("SpendWise Financial Score Certificate", "SWFSC")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE,        minter);
    }

    // ------ Mint ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Mint a score cert for a user. One per wallet enforced.
     * @param to        User's wallet address
     * @param score     Financial health score -- 10  (e.g. 725 = score 72.5)
     * @param tier      Health tier 0---4
     */
    function mintCert(address to, uint16 score, uint8 tier)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
        returns (uint256 tokenId)
    {
        require(to != address(0),        "FinancialScoreCert: zero address");
        require(certOf[to] == 0,         "FinancialScoreCert: already has cert");
        require(score <= 1000,           "FinancialScoreCert: score > 1000");
        require(tier <= 4,               "FinancialScoreCert: invalid tier");

        tokenId = _nextTokenId++;

        _scores[tokenId] = ScoreData({
            score:       score,
            tier:        tier,
            lastUpdated: block.timestamp,
            mintedAt:    block.timestamp,
            updateCount: 0
        });

        certOf[to] = tokenId;
        _safeMint(to, tokenId);

        emit CertMinted(to, tokenId, score, tier);
    }

    // ------ Update ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    /**
     * @notice Update score for an existing cert.
     *         Emits ScoreUpdated if delta --- 5 points (50 in x10 storage).
     * @param tokenId   The token to update
     * @param newScore  New score -- 10
     * @param newTier   New health tier 0---4
     */
    function updateScore(uint256 tokenId, uint16 newScore, uint8 newTier)
        external
        onlyRole(MINTER_ROLE)
    {
        require(_ownerOf(tokenId) != address(0), "FinancialScoreCert: nonexistent token");
        require(newScore <= 1000,                 "FinancialScoreCert: score > 1000");
        require(newTier <= 4,                     "FinancialScoreCert: invalid tier");

        ScoreData storage sd = _scores[tokenId];
        uint16 oldScore = sd.score;

        sd.score       = newScore;
        sd.tier        = newTier;
        sd.lastUpdated = block.timestamp;
        sd.updateCount += 1;

        // Only emit if meaningful change (--- 5 points)
        uint16 delta = newScore > oldScore ? newScore - oldScore : oldScore - newScore;
        if (delta >= MIN_DELTA) {
            emit ScoreUpdated(tokenId, oldScore, newScore, newTier);
        }
    }

    // ------ On-chain SVG + metadata ---------------------------------------------------------------------------------------------------------------------------------------------

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "FinancialScoreCert: nonexistent token");

        ScoreData memory sd = _scores[tokenId];

        string memory svg    = _buildSVG(tokenId, sd);
        string memory svgB64 = Base64.encode(bytes(svg));
        string memory json   = _buildJSON(tokenId, sd, svgB64);

        return string(abi.encodePacked(
            "data:application/json;base64,",
            Base64.encode(bytes(json))
        ));
    }

    // ------ SVG builder ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function _buildSVG(uint256 tokenId, ScoreData memory sd)
        internal
        pure
        returns (string memory)
    {
        (
            string memory tierName,
            string memory primaryColor,
            string memory accentColor,
            string memory bgColor
        ) = _tierStyle(sd.tier);

        // Display score as "72.5" from stored 725
        string memory scoreDisplay = _formatScore(sd.score);

        // Arc: full circle = 283 (circumference of r=45), fill proportional to score/1000
        uint256 arcLen = (uint256(sd.score) * 283) / 1000;
        string memory arcStr = arcLen.toString();

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">',
            '<defs>',
              '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:', bgColor, ';stop-opacity:1"/>',
                '<stop offset="100%" style="stop-color:#0f172a;stop-opacity:1"/>',
              '</linearGradient>',
              '<filter id="glow">',
                '<feGaussianBlur stdDeviation="3" result="blur"/>',
                '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>',
              '</filter>',
            '</defs>',

            // Background
            '<rect width="300" height="300" rx="20" fill="url(#bg)"/>',

            // Outer ring (track)
            '<circle cx="150" cy="140" r="80" fill="none" stroke="#1e293b" stroke-width="12"/>',

            // Score arc
            '<circle cx="150" cy="140" r="80" fill="none"',
              ' stroke="', primaryColor, '"',
              ' stroke-width="12"',
              ' stroke-dasharray="', arcStr, ' 283"',
              ' stroke-dashoffset="71"',
              ' stroke-linecap="round"',
              ' transform="rotate(-90 150 140)"',
              ' filter="url(#glow)"',
            '/>',

            // Inner accent circle
            '<circle cx="150" cy="140" r="60" fill="none" stroke="', accentColor, '" stroke-width="1" opacity="0.3"/>',

            // Score text
            '<text x="150" y="130" text-anchor="middle" font-family="monospace"',
              ' font-size="32" font-weight="bold" fill="', primaryColor, '" filter="url(#glow)">',
              scoreDisplay,
            '</text>',
            '<text x="150" y="155" text-anchor="middle" font-family="sans-serif"',
              ' font-size="11" fill="#94a3b8">FINANCIAL SCORE</text>',

            // Tier badge
            '<rect x="110" y="165" width="80" height="22" rx="11" fill="', primaryColor, '" opacity="0.2"/>',
            '<text x="150" y="180" text-anchor="middle" font-family="sans-serif"',
              ' font-size="11" font-weight="bold" fill="', primaryColor, '">',
              tierName,
            '</text>',

            // Bottom info
            '<text x="20" y="240" font-family="monospace" font-size="9" fill="#475569">SpendWise Financial Passport</text>',
            '<text x="20" y="255" font-family="monospace" font-size="9" fill="#475569">Cert #', tokenId.toString(), '</text>',
            '<text x="20" y="270" font-family="monospace" font-size="9" fill="#475569">Updates: ', sd.updateCount.toString(), '</text>',

            // Decorative corner dots
            '<circle cx="272" cy="258" r="3" fill="', primaryColor, '" opacity="0.5"/>',
            '<circle cx="262" cy="268" r="2" fill="', primaryColor, '" opacity="0.3"/>',
            '<circle cx="280" cy="268" r="2" fill="', primaryColor, '" opacity="0.3"/>',

            '</svg>'
        ));
    }

    // ------ JSON metadata builder ---------------------------------------------------------------------------------------------------------------------------------------------------

    function _buildJSON(uint256 tokenId, ScoreData memory sd, string memory svgB64)
        internal
        pure
        returns (string memory)
    {
        (string memory tierName,,,) = _tierStyle(sd.tier);

        return string(abi.encodePacked(
            '{"name":"SpendWise Score Cert #', tokenId.toString(), '",',
            '"description":"On-chain financial health certificate. Score updates automatically.",',
            '"image":"data:image/svg+xml;base64,', svgB64, '",',
            '"attributes":[',
              '{"trait_type":"Score","value":', _formatScore(sd.score), '},',
              '{"trait_type":"Tier","value":"', tierName, '"},',
              '{"trait_type":"Tier Index","value":', uint256(sd.tier).toString(), '},',
              '{"trait_type":"Update Count","value":', sd.updateCount.toString(), '},',
              '{"trait_type":"Minted At","value":', sd.mintedAt.toString(), '}',
            ']}'
        ));
    }

    // ------ Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function _tierStyle(uint8 tier)
        internal
        pure
        returns (
            string memory tierName,
            string memory primaryColor,
            string memory accentColor,
            string memory bgColor
        )
    {
        if (tier == 0) return ("CRITICAL",  "#ef4444", "#fca5a5", "#1a0505");
        if (tier == 1) return ("POOR",      "#f97316", "#fdba74", "#1a0a00");
        if (tier == 2) return ("FAIR",      "#eab308", "#fde047", "#1a1600");
        if (tier == 3) return ("GOOD",      "#3b82f6", "#93c5fd", "#00081a");
                       return ("EXCELLENT", "#22c55e", "#86efac", "#001a07");
    }

    /**
     * @dev Convert stored x10 score (e.g. 725) to display string "72.5"
     *      Integer scores (e.g. 700) display as "70.0"
     */
    function _formatScore(uint16 score) internal pure returns (string memory) {
        uint256 whole   = score / 10;
        uint256 decimal = score % 10;
        return string(abi.encodePacked(whole.toString(), ".", decimal.toString()));
    }

    // ------ View helpers ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    function getScore(uint256 tokenId) external view returns (ScoreData memory) {
        require(_ownerOf(tokenId) != address(0), "FinancialScoreCert: nonexistent token");
        return _scores[tokenId];
    }

    function getScoreByWallet(address wallet) external view returns (ScoreData memory) {
        uint256 tokenId = certOf[wallet];
        require(tokenId != 0, "FinancialScoreCert: no cert for this wallet");
        return _scores[tokenId];
    }

    // ------ Soulbound: transfers disabled ------------------------------------------------------------------------------------------------------------------------
    // Score certs are identity-bound --- they should not be tradeable.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow minting (from == 0) but block transfers
        require(from == address(0), unicode"FinancialScoreCert: soulbound \u2014 non-transferable");
        return super._update(to, tokenId, auth);
    }

    // ------ ERC165 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

