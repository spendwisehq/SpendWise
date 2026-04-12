// backend/src/routes/friend.routes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  searchUsers,
  sendRequestOrInvite,
  getRequests,
  handleRequest,
  getFriends
} = require('../controllers/friend.controller');

router.use(protect);

router.get('/search', searchUsers);
router.post('/invite', sendRequestOrInvite);
router.get('/requests', getRequests);
router.post('/requests/handle', handleRequest);
router.get('/', getFriends);

module.exports = router;
