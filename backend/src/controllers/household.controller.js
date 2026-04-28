// backend/src/controllers/household.controller.js
// Stage 7 — Couples / Household Mode
// Endpoints: create, invite, accept, getMyHousehold, combinedDashboard,
//            updateBudget, unlink

const crypto    = require('crypto');
const Household = require('../models/Household.model');
const User      = require('../models/User.model');
const Transaction = require('../models/Transaction.model');

// ── Helper: build combined spending summary ──────────────────────────────────
const buildCombinedSummary = async (memberIds, months = 1) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const transactions = await Transaction.find({
    userId:    { $in: memberIds },
    isDeleted: false,
    date:      { $gte: since },
  }).sort({ date: -1 }).lean();

  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome  = transactions.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);

  // By category
  const byCategory = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const key = t.categoryName || 'Uncategorized';
    byCategory[key] = (byCategory[key] || 0) + t.amount;
  });

  // Per member
  const perMember = {};
  memberIds.forEach(id => { perMember[id.toString()] = { expense: 0, income: 0 }; });
  transactions.forEach(t => {
    const key = t.userId.toString();
    if (!perMember[key]) perMember[key] = { expense: 0, income: 0 };
    if (t.type === 'expense') perMember[key].expense += t.amount;
    else                       perMember[key].income  += t.amount;
  });

  // Daily trend (last 30 days)
  const dailyMap = {};
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  transactions.filter(t => t.type === 'expense' && t.date >= thirtyAgo).forEach(t => {
    const day = new Date(t.date).toISOString().slice(0, 10);
    dailyMap[day] = (dailyMap[day] || 0) + t.amount;
  });
  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));

  return { transactions, totalExpense, totalIncome, byCategory, perMember, dailyTrend };
};

// ── POST /api/household — create & invite partner ────────────────────────────
const createHousehold = async (req, res, next) => {
  try {
    const { partnerEmail, name } = req.body;
    if (!partnerEmail) {
      return res.status(400).json({ success: false, message: 'Partner email is required.' });
    }

    // Cannot invite yourself
    if (partnerEmail.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself.' });
    }

    // Check if user already has an active household
    const existing = await Household.findOne({
      members:  req.user._id,
      status:   { $in: ['active', 'pending'] },
      isActive: true,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You are already in a household. Unlink first.',
        householdId: existing._id,
      });
    }

    // Find partner
    const partner = await User.findOne({ email: partnerEmail.toLowerCase().trim() });
    if (!partner) {
      return res.status(404).json({ success: false, message: 'No user found with that email.' });
    }

    // Check partner not already in a household
    const partnerHousehold = await Household.findOne({
      members:  partner._id,
      status:   { $in: ['active', 'pending'] },
      isActive: true,
    });
    if (partnerHousehold) {
      return res.status(409).json({ success: false, message: 'That user is already in a household.' });
    }

    // Generate invite token
    const inviteToken   = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const household = await Household.create({
      createdBy:     req.user._id,
      members:       [req.user._id, partner._id],
      name:          name || `${req.user.name} & ${partner.name}`,
      status:        'pending',
      inviteToken,
      inviteExpires,
    });

    // Update both users with householdId
    await User.updateMany(
      { _id: { $in: [req.user._id, partner._id] } },
      { $set: { householdId: household._id } }
    );

    return res.status(201).json({
      success: true,
      message: `Household invite sent to ${partner.name}!`,
      data:    {
        householdId:  household._id,
        name:         household.name,
        status:       household.status,
        inviteToken,  // frontend can share this or show a link
        partner:      { _id: partner._id, name: partner.name, email: partner.email },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/household/accept — partner accepts invite ──────────────────────
const acceptInvite = async (req, res, next) => {
  try {
    const { inviteToken } = req.body;
    if (!inviteToken) {
      return res.status(400).json({ success: false, message: 'Invite token is required.' });
    }

    const household = await Household.findOne({
      inviteToken,
      status:   'pending',
      isActive: true,
    }).select('+inviteToken');

    if (!household) {
      return res.status(404).json({ success: false, message: 'Invalid or expired invite token.' });
    }
    if (household.inviteExpires < new Date()) {
      return res.status(410).json({ success: false, message: 'Invite has expired.' });
    }
    if (!household.members.map(m => m.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'This invite is not for you.' });
    }

    household.status       = 'active';
    household.linkedAt     = new Date();
    household.inviteToken  = null;
    await household.save();

    return res.status(200).json({
      success: true,
      message: 'Household linked successfully! 🎉',
      data:    { householdId: household._id, name: household.name },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/household — get my household ────────────────────────────────────
const getMyHousehold = async (req, res, next) => {
  try {
    const household = await Household.findOne({
      members:  req.user._id,
      isActive: true,
    }).populate('members', 'name email avatar financialScore plan createdAt');

    if (!household) {
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({ success: true, data: household });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/household/dashboard — combined spending data ────────────────────
const getCombinedDashboard = async (req, res, next) => {
  try {
    const household = await Household.findOne({
      members:  req.user._id,
      status:   'active',
      isActive: true,
    }).populate('members', 'name email avatar financialScore monthlyIncome currency');

    if (!household) {
      return res.status(404).json({ success: false, message: 'No active household found.' });
    }

    const memberIds = household.members.map(m => m._id);
    const months    = parseInt(req.query.months || 1);

    const summary = await buildCombinedSummary(memberIds, months);

    // Enrich perMember with names
    const enriched = {};
    household.members.forEach(m => {
      const key = m._id.toString();
      enriched[key] = {
        ...(summary.perMember[key] || { expense: 0, income: 0 }),
        name:           m.name,
        email:          m.email,
        avatar:         m.avatar,
        financialScore: m.financialScore,
        monthlyIncome:  m.monthlyIncome,
      };
    });

    const totalMonthlyIncome = household.members.reduce((s, m) => s + (m.monthlyIncome || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        household: {
          _id:          household._id,
          name:         household.name,
          members:      household.members,
          sharedBudget: household.sharedBudget,
          linkedAt:     household.linkedAt,
        },
        summary: {
          totalExpense:       summary.totalExpense,
          totalIncome:        summary.totalIncome,
          netSavings:         summary.totalIncome - summary.totalExpense,
          totalMonthlyIncome,
          byCategory:         summary.byCategory,
          perMember:          enriched,
          dailyTrend:         summary.dailyTrend,
          recentTransactions: summary.transactions.slice(0, 20),
          months,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/household/budget — update shared budget ─────────────────────────
const updateSharedBudget = async (req, res, next) => {
  try {
    const { totalLimit, currency, categoryBudgets } = req.body;

    const household = await Household.findOne({
      members:  req.user._id,
      status:   'active',
      isActive: true,
    });
    if (!household) {
      return res.status(404).json({ success: false, message: 'No active household found.' });
    }

    if (totalLimit !== undefined) household.sharedBudget.totalLimit = totalLimit;
    if (currency)                 household.sharedBudget.currency   = currency;
    if (Array.isArray(categoryBudgets)) household.sharedBudget.categoryBudgets = categoryBudgets;

    await household.save();

    return res.status(200).json({
      success: true,
      message: 'Shared budget updated.',
      data:    household.sharedBudget,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/household — unlink household ──────────────────────────────────
const unlinkHousehold = async (req, res, next) => {
  try {
    const household = await Household.findOne({
      members:  req.user._id,
      isActive: true,
    });
    if (!household) {
      return res.status(404).json({ success: false, message: 'No household found.' });
    }

    household.isActive = false;
    household.status   = 'inactive';
    await household.save();

    // Clear householdId on both members
    await User.updateMany(
      { _id: { $in: household.members } },
      { $unset: { householdId: 1 } }
    );

    return res.status(200).json({ success: true, message: 'Household unlinked.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHousehold,
  acceptInvite,
  getMyHousehold,
  getCombinedDashboard,
  updateSharedBudget,
  unlinkHousehold,
};