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

router.use(protect);

// GET  /api/friends/search?q=john
router.get('/search', searchUsers);

// GET  /api/friends
router.get('/', getFriends);

// POST /api/friends/invite/email   { email }
// POST /api/friends/invite/sms     { phone }
router.post('/invite/email', inviteByEmail);
router.post('/invite/sms',   inviteBySMS);

// PUT    /api/friends/:id/accept
// PUT    /api/friends/:id/decline
// DELETE /api/friends/:id
router.put('/:id/accept',  acceptRequest);
router.put('/:id/decline', declineRequest);
router.delete('/:id',      removeFriend);

module.exports = router;
