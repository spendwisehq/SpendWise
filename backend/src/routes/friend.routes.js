// backend/src/routes/friend.routes.js

const express    = require('express');
const router     = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  inviteByEmail,
  inviteBySMS,
  getFriends,
  acceptRequest,
  declineRequest,
  removeFriend,
  searchUsers,
} = require('../controllers/friend.controller');

// All routes require authentication
router.use(protect);

// ── Search ────────────────────────────────────────────────────────────────────
// GET  /api/friends/search?q=john
router.get('/search', searchUsers);

// ── My Friends List ───────────────────────────────────────────────────────────
// GET  /api/friends   → returns friends + pendingReceived + pendingSent in one call
router.get('/', getFriends);

// ── Invite ────────────────────────────────────────────────────────────────────
// POST /api/friends/invite/email   { email }
// POST /api/friends/invite/sms     { phone }
router.post('/invite/email', inviteByEmail);
router.post('/invite/sms',   inviteBySMS);

// ── Aliases expected by the frontend ─────────────────────────────────────────
// Frontend calls POST /friends/request  instead of /friends/invite/email
router.post('/request', inviteByEmail);

// ── Accept / Decline / Remove ─────────────────────────────────────────────────
// PUT    /api/friends/:id/accept
// PUT    /api/friends/:id/decline
// DELETE /api/friends/:id
router.put('/:id/accept',   acceptRequest);
router.put('/:id/decline',  declineRequest);
router.delete('/:id',       removeFriend);

module.exports = router;