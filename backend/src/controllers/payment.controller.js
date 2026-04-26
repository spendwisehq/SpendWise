// backend/src/controllers/payment.controller.js
// STAGE 6: Added Razorpay Subscriptions (createSubscription, verifySubscription,
//          cancelSubscription, getSubscriptionStatus, subscriptionWebhook)
// All existing one-time order functions preserved exactly.

const Razorpay    = require('razorpay');
const crypto      = require('crypto');
const Transaction = require('../models/Transaction.model');
const Budget      = require('../models/Budget.model');
const User        = require('../models/User.model');
const rzService   = require('../services/razorpay.service');

//─────────────────────────────────────
// Razorpay instance (one-time orders)
//─────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

//─────────────────────────────────────
// HELPER — check budget before payment
//─────────────────────────────────────
const checkBudget = async (userId, amount, categoryName) => {
  const now    = new Date();
  const budget = await Budget.findOne({
    userId,
    month: now.getMonth() + 1,
    year:  now.getFullYear(),
  });

  if (!budget) return { hasBudget: false };

  const remaining   = budget.totalBudget - budget.totalSpent;
  const percentUsed = budget.totalBudget > 0
    ? ((budget.totalSpent + amount) / budget.totalBudget) * 100 : 0;

  const catBudget = budget.categories.find(
    c => c.categoryName?.toLowerCase() === categoryName?.toLowerCase()
  );

  return {
    hasBudget:      true,
    totalBudget:    budget.totalBudget,
    totalSpent:     budget.totalSpent,
    remaining,
    afterPayment:   remaining - amount,
    percentAfter:   Math.round(percentUsed),
    willExceed:     remaining < amount,
    willHit80:      percentUsed >= 80,
    categoryBudget: catBudget || null,
  };
};

//─────────────────────────────────────
// 1. POST /api/payments/order
//─────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { amount, currency, description, categoryName, notes } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: 'Amount must be at least ₹1.' });
    }

    const budgetCheck = await checkBudget(req.user._id, amount, categoryName);

    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: currency || 'INR',
      receipt:  `sw_${req.user._id}_${Date.now()}`,
      notes: {
        userId:       req.user._id.toString(),
        description:  description || '',
        categoryName: categoryName || '',
        ...notes,
      },
    });

    const transaction = await Transaction.create({
      userId:        req.user._id,
      type:          'expense',
      amount,
      currency:      currency || 'INR',
      description:   description || 'Razorpay Payment',
      categoryName:  categoryName || 'Uncategorized',
      date:          new Date(),
      paymentMethod: 'other',
      source:        'razorpay',
      paymentData:   { razorpayOrderId: order.id, status: 'pending' },
    });

    return res.status(201).json({
      success: true,
      data: {
        order:       { id: order.id, amount: order.amount, currency: order.currency },
        transaction: { id: transaction._id },
        budgetAlert: budgetCheck.hasBudget ? {
          willExceed:   budgetCheck.willExceed,
          willHit80:    budgetCheck.willHit80,
          remaining:    budgetCheck.remaining,
          afterPayment: budgetCheck.afterPayment,
          percentAfter: budgetCheck.percentAfter,
          message: budgetCheck.willExceed
            ? `⚠️ This payment will exceed your monthly budget by ₹${Math.abs(budgetCheck.afterPayment).toFixed(0)}`
            : budgetCheck.willHit80
            ? `⚠️ This will use ${budgetCheck.percentAfter}% of your monthly budget`
            : null,
        } : null,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 2. POST /api/payments/verify
//─────────────────────────────────────
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields.' });
    }

    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { userId: req.user._id, 'paymentData.razorpayOrderId': razorpay_order_id },
      { $set: { 'paymentData.razorpayPaymentId': razorpay_payment_id, 'paymentData.status': 'completed' } },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found for this order.' });
    }

    return res.status(200).json({ success: true, message: 'Payment verified successfully.', data: { transaction } });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 3. POST /api/payments/webhook
// One-time payment webhook
//─────────────────────────────────────
const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;
    const body      = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    res.status(200).json({ success: true });

    const event   = req.body.event;
    const payment = req.body.payload?.payment?.entity;
    if (!payment) return;

    if (event === 'payment.captured') {
      await Transaction.findOneAndUpdate(
        { 'paymentData.razorpayPaymentId': payment.id },
        { $set: { 'paymentData.status': 'completed' } }
      );
    }
    if (event === 'payment.failed') {
      await Transaction.findOneAndUpdate(
        { 'paymentData.razorpayOrderId': payment.order_id },
        { $set: { 'paymentData.status': 'failed' } }
      );
    }
    if (event === 'refund.created') {
      await Transaction.findOneAndUpdate(
        { 'paymentData.razorpayPaymentId': payment.id },
        { $set: { 'paymentData.status': 'refunded' } }
      );
    }
  } catch (error) {
    console.error('Webhook error:', error.message);
  }
};

//─────────────────────────────────────
// 4. GET /api/payments/history
//─────────────────────────────────────
const getPaymentHistory = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(50, parseInt(req.query.limit || '10'));
    const skip  = (page - 1) * limit;

    const filter = { userId: req.user._id, source: 'razorpay' };
    if (req.query.status) filter['paymentData.status'] = req.query.status;

    const [payments, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: { payments, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 5. GET /api/payments/budget-check
//─────────────────────────────────────
const budgetCheck = async (req, res, next) => {
  try {
    const { amount, categoryName } = req.query;
    if (!amount) return res.status(400).json({ success: false, message: 'amount is required.' });
    const check = await checkBudget(req.user._id, parseFloat(amount), categoryName);
    return res.status(200).json({ success: true, data: check });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 6. GET /api/payments/stats
//─────────────────────────────────────
const getPaymentStats = async (req, res, next) => {
  try {
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonth, byStatus] = await Promise.all([
      Transaction.countDocuments({ userId: req.user._id, source: 'razorpay' }),
      Transaction.aggregate([
        { $match: { userId: req.user._id, source: 'razorpay', 'paymentData.status': 'completed', date: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: { userId: req.user._id, source: 'razorpay' } },
        { $group: { _id: '$paymentData.status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalPayments: total,
        thisMonth:     thisMonth[0] || { total: 0, count: 0 },
        byStatus,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 6 — Feature 1: Razorpay Subscriptions
// ─────────────────────────────────────────────────────────────────────────────

//─────────────────────────────────────
// POST /api/payments/subscribe
// Body: { planType: 'monthly' | 'annual' }
// Creates a Razorpay subscription and returns the subscription_id to frontend.
// Frontend uses Razorpay.js to open the checkout and complete the first payment.
//─────────────────────────────────────
const createSubscription = async (req, res, next) => {
  try {
    const { planType = 'monthly' } = req.body;

    if (!['monthly', 'annual'].includes(planType)) {
      return res.status(400).json({ success: false, message: 'planType must be "monthly" or "annual".' });
    }

    const user = await User.findById(req.user._id);

    // Already has an active subscription?
    if (user.razorpaySubscriptionId && user.subscriptionStatus === 'active') {
      return res.status(400).json({
        success: false,
        message: 'You already have an active subscription. Cancel it first to change plans.',
        data: { subscriptionId: user.razorpaySubscriptionId, status: user.subscriptionStatus },
      });
    }

    const subscription = await rzService.createSubscription(planType, user);

    // Store subscription ID on user (status = created, not active yet)
    user.razorpaySubscriptionId = subscription.id;
    user.subscriptionStatus     = null;  // becomes 'active' after first payment via webhook
    user.subscriptionPlan       = planType;
    await user.save({ validateBeforeSave: false });

    return res.status(201).json({
      success: true,
      message: 'Subscription created. Complete payment to activate.',
      data: {
        subscriptionId: subscription.id,
        planType,
        amount:         rzService.PLAN_PRICES[planType],
        currency:       'INR',
        keyId:          process.env.RAZORPAY_KEY_ID,
        // Pass these to Razorpay.js checkout options
        prefill: {
          name:  user.name,
          email: user.email,
          contact: user.phone || '',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/payments/subscribe/verify
// Called by frontend after Razorpay checkout completes.
// Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }
//─────────────────────────────────────
const verifySubscription = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing subscription verification fields.' });
    }

    const isValid = rzService.verifySubscriptionSignature({
      subscriptionId: razorpay_subscription_id,
      paymentId:      razorpay_payment_id,
      signature:      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid subscription signature.' });
    }

    // Fetch subscription from Razorpay to confirm status
    const rzsub = await rzService.fetchSubscription(razorpay_subscription_id);

    const user = await User.findById(req.user._id);

    // Determine plan expiry
    const planType  = user.subscriptionPlan || 'monthly';
    const monthsMap = { monthly: 1, annual: 12 };
    const months    = monthsMap[planType] || 1;

    // Grant premium
    await user.grantPremium(months);

    // Update subscription tracking fields
    user.razorpaySubscriptionId = razorpay_subscription_id;
    user.subscriptionStatus     = 'active';
    user.planRenewalDate        = rzsub.current_end
      ? new Date(rzsub.current_end * 1000)
      : new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: `🎉 Premium activated! Your ${planType} plan is now active.`,
      data: {
        plan:           'premium',
        planType,
        subscriptionId: razorpay_subscription_id,
        renewalDate:    user.planRenewalDate,
        expiresAt:      user.planExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/payments/subscribe/cancel
// Cancels the active Razorpay subscription.
// By default cancels at end of current billing cycle.
//─────────────────────────────────────
const cancelSubscription = async (req, res, next) => {
  try {
    const { immediate = false } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.razorpaySubscriptionId) {
      return res.status(400).json({ success: false, message: 'No active subscription found.' });
    }

    await rzService.cancelSubscription(user.razorpaySubscriptionId, !immediate);

    user.subscriptionStatus = 'cancelled';
    // If immediate, downgrade now; otherwise keep premium until expiry
    if (immediate) {
      user.plan = 'free';
      user.planExpiresAt = null;
    }
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: immediate
        ? 'Subscription cancelled immediately. Premium access removed.'
        : `Subscription cancelled. Premium access continues until ${user.planExpiresAt?.toLocaleDateString('en-IN') || 'end of period'}.`,
      data: {
        status:      user.subscriptionStatus,
        plan:        user.plan,
        expiresAt:   user.planExpiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/payments/subscribe/status
// Returns current subscription status for the user.
//─────────────────────────────────────
const getSubscriptionStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();

    let razorpayStatus = null;
    if (user.razorpaySubscriptionId) {
      try {
        const rzsub    = await rzService.fetchSubscription(user.razorpaySubscriptionId);
        razorpayStatus = rzsub.status;
      } catch (_) {
        razorpayStatus = 'fetch_failed';
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        plan:               user.plan,
        isPremium:          user.plan === 'premium' && (!user.planExpiresAt || new Date() < new Date(user.planExpiresAt)),
        planExpiresAt:      user.planExpiresAt,
        planRenewalDate:    user.planRenewalDate,
        subscriptionId:     user.razorpaySubscriptionId,
        subscriptionStatus: user.subscriptionStatus,
        razorpayStatus,
        subscriptionPlan:   user.subscriptionPlan,
        pricing: {
          monthly: { amount: rzService.PLAN_PRICES.monthly, label: '₹199/month' },
          annual:  { amount: rzService.PLAN_PRICES.annual,  label: '₹1,499/year (save ₹889)' },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/payments/subscribe/webhook
// Handles Razorpay subscription lifecycle events.
// PUBLIC — no auth, verified by signature.
//─────────────────────────────────────
const subscriptionWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody   = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (!rzService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Respond immediately
    res.status(200).json({ received: true });

    const event        = req.body.event;
    const subscription = req.body.payload?.subscription?.entity;
    const payment      = req.body.payload?.payment?.entity;

    if (!subscription) return;

    const user = await User.findOne({ razorpaySubscriptionId: subscription.id });
    if (!user) return;

    switch (event) {

      // ── Subscription activated after first payment ────────────────────────
      case 'subscription.activated': {
        const planType = user.subscriptionPlan || 'monthly';
        const months   = planType === 'annual' ? 12 : 1;
        await user.grantPremium(months);
        user.subscriptionStatus = 'active';
        user.planRenewalDate    = subscription.current_end
          ? new Date(subscription.current_end * 1000) : null;
        await user.save({ validateBeforeSave: false });
        console.log(`[SubWebhook] Activated: ${user.email}`);
        break;
      }

      // ── Renewal payment charged ───────────────────────────────────────────
      case 'subscription.charged': {
        const planType = user.subscriptionPlan || 'monthly';
        const months   = planType === 'annual' ? 12 : 1;
        await user.grantPremium(months);
        user.subscriptionStatus = 'active';
        user.planRenewalDate    = subscription.current_end
          ? new Date(subscription.current_end * 1000) : null;
        await user.save({ validateBeforeSave: false });

        // Log as income/expense transaction
        if (payment) {
          try {
            await Transaction.create({
              userId:       user._id,
              type:         'expense',
              amount:       payment.amount / 100,
              currency:     'INR',
              description:  `SpendWise Premium — ${planType} renewal`,
              categoryName: 'Subscription',
              date:         new Date(),
              paymentMethod:'card',
              source:       'razorpay',
              paymentData:  { razorpayPaymentId: payment.id, status: 'completed' },
            });
          } catch (_) {}
        }
        console.log(`[SubWebhook] Renewed: ${user.email}`);
        break;
      }

      // ── Payment failed — dunning ───────────────────────────────────────────
      case 'subscription.halted': {
        user.subscriptionStatus = 'halted';
        // Keep premium for grace period (3 days) — don't downgrade immediately
        const grace = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        if (!user.planExpiresAt || user.planExpiresAt > grace) {
          user.planExpiresAt = grace;
        }
        await user.save({ validateBeforeSave: false });
        console.log(`[SubWebhook] Halted (payment failed): ${user.email}`);
        break;
      }

      // ── User cancelled ────────────────────────────────────────────────────
      case 'subscription.cancelled': {
        user.subscriptionStatus = 'cancelled';
        // Premium continues until planExpiresAt (already set) — no change needed
        await user.save({ validateBeforeSave: false });
        console.log(`[SubWebhook] Cancelled: ${user.email}`);
        break;
      }

      // ── Subscription completed (all billing cycles done) ──────────────────
      case 'subscription.completed': {
        user.subscriptionStatus = 'completed';
        await user.save({ validateBeforeSave: false });
        console.log(`[SubWebhook] Completed: ${user.email}`);
        break;
      }
    }
  } catch (err) {
    console.error('[SubscriptionWebhook]', err.message);
  }
};

module.exports = {
  // Existing one-time order
  createOrder,
  verifyPayment,
  webhook,
  getPaymentHistory,
  budgetCheck,
  getPaymentStats,
  // STAGE 6 — Subscriptions
  createSubscription,
  verifySubscription,
  cancelSubscription,
  getSubscriptionStatus,
  subscriptionWebhook,
};