// backend/src/routes/household.routes.js
// Stage 7 — Household / Couples Mode

const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');

const {
  createHousehold,
  acceptInvite,
  getMyHousehold,
  getCombinedDashboard,
  updateSharedBudget,
  unlinkHousehold,
} = require('../controllers/household.controller');

// POST   /api/household          — create household & invite partner
router.post('/',         protect, createHousehold);

// POST   /api/household/accept   — accept an invite by token
router.post('/accept',   protect, acceptInvite);

// GET    /api/household          — get my household info
router.get('/',          protect, getMyHousehold);

// GET    /api/household/dashboard — combined spending dashboard
router.get('/dashboard', protect, getCombinedDashboard);

// PUT    /api/household/budget   — update shared budget
router.put('/budget',    protect, updateSharedBudget);

// DELETE /api/household          — unlink / dissolve household
router.delete('/',       protect, unlinkHousehold);

module.exports = router;