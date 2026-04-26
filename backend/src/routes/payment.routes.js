// backend/src/routes/payment.routes.js
// STAGE 6: Added subscription routes

const express = require('express');
const router  = express.Router();

const {
  createOrder,
  verifyPayment,
  webhook,
  getPaymentHistory,
  budgetCheck,
  getPaymentStats,
  // STAGE 6
  createSubscription,
  verifySubscription,
  cancelSubscription,
  getSubscriptionStatus,
  subscriptionWebhook,
} = require('../controllers/payment.controller');

const { protect } = require('../middleware/auth.middleware');

// ── PUBLIC — webhooks (no auth, signature-verified) ──────────────────────────
router.post('/webhook',              express.raw({ type: 'application/json' }), webhook);
router.post('/subscribe/webhook',    express.raw({ type: 'application/json' }), subscriptionWebhook);

// ── PROTECTED ────────────────────────────────────────────────────────────────
router.use(protect);

// One-time payment
router.post('/order',         createOrder);
router.post('/verify',        verifyPayment);
router.get('/history',        getPaymentHistory);
router.get('/budget-check',   budgetCheck);
router.get('/stats',          getPaymentStats);

// STAGE 6 — Razorpay Subscriptions
// POST /api/payments/subscribe              — create subscription
// POST /api/payments/subscribe/verify       — verify after checkout
// POST /api/payments/subscribe/cancel       — cancel subscription
// GET  /api/payments/subscribe/status       — get current status
router.post('/subscribe',           createSubscription);
router.post('/subscribe/verify',    verifySubscription);
router.post('/subscribe/cancel',    cancelSubscription);
router.get('/subscribe/status',     getSubscriptionStatus);

module.exports = router;