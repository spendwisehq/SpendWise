// backend/src/routes/referral.routes.js

const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');

const {
  getMyReferralCode,
  applyReferralCode,
  completeReferral,
  getReferralStats,
} = require('../controllers/referral.controller');

router.use(protect);

// GET  /api/referral/code           — get my code + stats
router.get('/code',   getMyReferralCode);

// POST /api/referral/apply          — apply someone else's code
router.post('/apply', applyReferralCode);

// GET  /api/referral/stats          — leaderboard
router.get('/stats',  getReferralStats);

// POST /api/referral/complete/:referralId — award referrer after first transaction
router.post('/complete/:referralId', completeReferral);

module.exports = router;