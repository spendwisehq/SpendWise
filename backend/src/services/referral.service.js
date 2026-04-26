// backend/src/services/razorpay.service.js
// STAGE 6 — Razorpay Subscriptions helper
//
// Setup in Razorpay Dashboard:
//   1. Go to Subscriptions → Plans → Create Plan
//   2. Create two plans:
//        Plan Name: SpendWise Monthly Premium
//        Interval: 1 month | Amount: ₹199
//        → Copy Plan ID → add to .env as RAZORPAY_PLAN_MONTHLY=plan_xxxxx
//
//        Plan Name: SpendWise Annual Premium
//        Interval: 12 months | Amount: ₹1499
//        → Copy Plan ID → add to .env as RAZORPAY_PLAN_ANNUAL=plan_yyyyy
//
// .env vars needed:
//   RAZORPAY_KEY_ID=rzp_test_xxxxx
//   RAZORPAY_KEY_SECRET=xxxxx
//   RAZORPAY_WEBHOOK_SECRET=xxxxx
//   RAZORPAY_PLAN_MONTHLY=plan_xxxxx
//   RAZORPAY_PLAN_ANNUAL=plan_yyyyy

const Razorpay = require('razorpay');
const crypto   = require('crypto');

let _client = null;

const getClient = () => {
  if (!_client) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
    }
    _client = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _client;
};

// Plan ID map — reads from .env
const PLAN_IDS = {
  monthly: () => process.env.RAZORPAY_PLAN_MONTHLY,
  annual:  () => process.env.RAZORPAY_PLAN_ANNUAL,
};

const PLAN_PRICES = {
  monthly: 199,
  annual:  1499,
};

/**
 * Create a new Razorpay subscription for a user.
 * @param {string} planType  — 'monthly' | 'annual'
 * @param {object} user      — Mongoose user document
 * @returns Razorpay subscription object
 */
const createSubscription = async (planType, user) => {
  const planId = PLAN_IDS[planType]?.();
  if (!planId) {
    throw new Error(`Razorpay plan ID not configured for plan "${planType}". Add RAZORPAY_PLAN_${planType.toUpperCase()} to .env`);
  }

  const rz = getClient();
  const subscription = await rz.subscriptions.create({
    plan_id:         planId,
    total_count:     planType === 'annual' ? 12 : 120,  // max billing cycles
    quantity:        1,
    customer_notify: 1,   // Razorpay sends renewal reminder emails
    notes: {
      userId:    user._id.toString(),
      userEmail: user.email,
      userName:  user.name,
      planType,
    },
  });

  return subscription;
};

/**
 * Fetch a subscription by ID.
 */
const fetchSubscription = async (subscriptionId) => {
  return getClient().subscriptions.fetch(subscriptionId);
};

/**
 * Cancel a subscription immediately or at period end.
 * @param {string} subscriptionId
 * @param {boolean} cancelAtCycleEnd — if true, cancels at end of billing cycle
 */
const cancelSubscription = async (subscriptionId, cancelAtCycleEnd = true) => {
  return getClient().subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
};

/**
 * Verify Razorpay webhook signature.
 * Returns true if valid.
 */
const verifyWebhookSignature = (rawBody, signature) => {
  const secret   = process.env.RAZORPAY_WEBHOOK_SECRET;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
};

/**
 * Verify subscription payment signature (returned on frontend after payment).
 */
const verifySubscriptionSignature = ({ subscriptionId, paymentId, signature }) => {
  const body     = `${paymentId}|${subscriptionId}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expected === signature;
};

module.exports = {
  getClient,
  createSubscription,
  fetchSubscription,
  cancelSubscription,
  verifyWebhookSignature,
  verifySubscriptionSignature,
  PLAN_PRICES,
};