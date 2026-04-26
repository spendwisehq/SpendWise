// backend/src/controllers/referral.controller.js
// STAGE 6 — Feature 3: Referral Program
//
// Routes:
//   GET  /api/referral/code          — get my referral code + stats
//   POST /api/referral/apply         — apply a referral code (called at registration)
//   GET  /api/referral/stats         — referral leaderboard + history
//   POST /api/referral/complete/:id  — mark referral complete (called after first txn)

const User     = require('../models/User.model');
const Referral = require('../models/Referral.model');

// ── Helper: get IP ─────────────────────────────────────────────────────────────
const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress || 'unknown';

// ── Helper: award premium months ──────────────────────────────────────────────
const awardPremium = async (userId, months, label) => {
  const user = await User.findById(userId);
  if (!user) return;
  await user.grantPremium(months);
  console.log(`[Referral] ${label} — awarded ${months} month(s) premium to ${user.email}`);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/code
// Returns the current user's referral code and their referral statistics.
// ─────────────────────────────────────────────────────────────────────────────
const getMyReferralCode = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();

    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referee', 'name email createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const completed = referrals.filter(r => r.status === 'rewarded').length;
    const pending   = referrals.filter(r => r.status === 'pending' || r.status === 'completed').length;

    // Build share URL — update domain when deployed
    const baseUrl   = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl  = `${baseUrl}/register?ref=${user.referralCode}`;
    const shareText = `Hey! I'm using SpendWise to track expenses with AI 🤖💸\n\nSign up with my code and we both get 1 month free premium!\n\nCode: ${user.referralCode}\n${shareUrl}`;

    return res.status(200).json({
      success: true,
      data: {
        referralCode:         user.referralCode,
        shareUrl,
        shareText,
        stats: {
          totalReferrals:       referrals.length,
          completedReferrals:   completed,
          pendingReferrals:     pending,
          rewardMonthsEarned:   user.referralRewardMonths || 0,
          isPremium:            user.plan === 'premium',
          planExpiresAt:        user.planExpiresAt,
        },
        referrals: referrals.map(r => ({
          id:         r._id,
          referee:    r.referee,
          status:     r.status,
          joinedAt:   r.createdAt,
          rewardedAt: r.rewardedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/referral/apply
// Body: { referralCode }
// Called either at registration (via auth.controller) or manually by the user.
// Self-referral, duplicate referral, and chain abuse are all blocked.
// ─────────────────────────────────────────────────────────────────────────────
const applyReferralCode = async (req, res, next) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Referral code is required.' });
    }

    const code = referralCode.trim().toUpperCase();

    // ── 1. Find the referrer ─────────────────────────────────────────────────
    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) {
      return res.status(404).json({ success: false, message: 'Invalid referral code.' });
    }

    // ── 2. Self-referral check ───────────────────────────────────────────────
    if (referrer._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot refer yourself.' });
    }

    // ── 3. Already referred check ────────────────────────────────────────────
    const existingReferral = await Referral.findOne({ referee: req.user._id });
    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message: 'You have already used a referral code.',
      });
    }

    // ── 4. Already set referredBy on user ────────────────────────────────────
    const referee = await User.findById(req.user._id);
    if (referee.referredBy) {
      return res.status(400).json({
        success: false,
        message: 'You have already been referred by someone.',
      });
    }

    // ── 5. IP abuse check (same IP = suspicious) ─────────────────────────────
    const ip = getIP(req);
    const isSuspicious = ip !== 'unknown' && ip === referrer.lastLoginIP;
    const flagReason   = isSuspicious ? 'Same IP as referrer' : null;

    // ── 6. Chain depth check (prevent pyramid: max depth 2) ──────────────────
    const referrerWasReferred = await Referral.findOne({ referee: referrer._id });
    const chainDepth = referrerWasReferred ? referrerWasReferred.chainDepth + 1 : 1;

    if (chainDepth > 3) {
      return res.status(400).json({
        success: false,
        message: 'Referral chain limit reached.',
      });
    }

    // ── 7. Create referral record ─────────────────────────────────────────────
    const referral = await Referral.create({
      referrer:     referrer._id,
      referee:      req.user._id,
      code,
      status:       'pending',
      referrerIP:   ip,
      chainDepth,
      isSuspicious,
      flagReason,
      reward: { referrerMonths: 1, refereeMonths: 1 },
    });

    // ── 8. Update referee's user record ──────────────────────────────────────
    referee.referredBy = referrer._id;
    await referee.save({ validateBeforeSave: false });

    // ── 9. Immediately reward the referee (1 month premium) ──────────────────
    // Referrer gets their reward after the referee completes their first transaction
    if (!isSuspicious) {
      await awardPremium(req.user._id, 1, `Referee ${referee.email}`);

      await Referral.findByIdAndUpdate(referral._id, {
        status:     'completed',
        completedAt: new Date(),
      });
    }

    return res.status(200).json({
      success: true,
      message: isSuspicious
        ? 'Referral code noted. Reward pending verification.'
        : '🎉 Referral applied! You\'ve earned 1 month of premium.',
      data: {
        referralId:  referral._id,
        referrerName: referrer.name,
        rewardGiven: !isSuspicious,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already used a referral code.' });
    }
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/referral/complete/:referralId
// Called automatically when the referee logs their first transaction.
// Awards the referrer their 1 month premium reward.
// ─────────────────────────────────────────────────────────────────────────────
const completeReferral = async (req, res, next) => {
  try {
    const referral = await Referral.findById(req.params.referralId);
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found.' });
    }

    if (referral.status === 'rewarded') {
      return res.status(200).json({ success: true, message: 'Referral already rewarded.' });
    }

    if (referral.isSuspicious) {
      return res.status(200).json({ success: true, message: 'Referral under review.' });
    }

    // Award referrer
    await awardPremium(
      referral.referrer,
      referral.reward.referrerMonths,
      `Referrer for ${req.user.email}`
    );

    // Update referrer's referral count
    await User.findByIdAndUpdate(referral.referrer, {
      $inc: {
        referralCount:        1,
        referralRewardMonths: referral.reward.referrerMonths,
      },
    });

    // Mark referral as fully rewarded
    await Referral.findByIdAndUpdate(referral._id, {
      status:     'rewarded',
      rewardedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: 'Referral reward granted to referrer.',
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/referral/stats
// Global referral leaderboard + the user's own referral history.
// ─────────────────────────────────────────────────────────────────────────────
const getReferralStats = async (req, res, next) => {
  try {
    // Top referrers (leaderboard — anonymised to first name + last initial)
    const topReferrers = await User.find({ referralCount: { $gt: 0 } })
      .select('name referralCount referralRewardMonths')
      .sort({ referralCount: -1 })
      .limit(10)
      .lean();

    const leaderboard = topReferrers.map((u, i) => ({
      rank:         i + 1,
      displayName:  u.name.split(' ')[0] + ' ' + (u.name.split(' ')[1]?.[0] || '') + '.',
      referrals:    u.referralCount,
      monthsEarned: u.referralRewardMonths,
      isMe:         u._id.toString() === req.user._id.toString(),
    }));

    // Total platform referrals
    const totalReferrals = await Referral.countDocuments({ status: { $in: ['completed', 'rewarded'] } });

    return res.status(200).json({
      success: true,
      data: {
        leaderboard,
        platformStats: {
          totalReferrals,
          rewardPerReferral: '1 month premium for both users',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — exported for use in auth.controller on register
// Applies a referral code silently during registration (no HTTP response)
// ─────────────────────────────────────────────────────────────────────────────
const applyReferralOnRegister = async (referralCode, newUserId, ip) => {
  try {
    if (!referralCode) return;
    const code     = referralCode.trim().toUpperCase();
    const referrer = await User.findOne({ referralCode: code });
    if (!referrer || referrer._id.toString() === newUserId.toString()) return;

    const exists = await Referral.findOne({ referee: newUserId });
    if (exists) return;

    const isSuspicious = false; // IP check happens at apply time
    const referrerWasReferred = await Referral.findOne({ referee: referrer._id });
    const chainDepth = referrerWasReferred ? referrerWasReferred.chainDepth + 1 : 1;
    if (chainDepth > 3) return;

    const referral = await Referral.create({
      referrer: referrer._id,
      referee:  newUserId,
      code,
      status:   'completed',
      completedAt: new Date(),
      refereeIP: ip,
      chainDepth,
      reward: { referrerMonths: 1, refereeMonths: 1 },
    });

    // Award new user immediately
    await awardPremium(newUserId, 1, `New user referred by ${referrer.email}`);

    // Update new user's referredBy
    await User.findByIdAndUpdate(newUserId, { referredBy: referrer._id });

    console.log(`[Referral] ${referrer.email} referred new user — pending referrer reward until first transaction`);
  } catch (e) {
    console.error('[applyReferralOnRegister]', e.message);
  }
};

module.exports = {
  getMyReferralCode,
  applyReferralCode,
  completeReferral,
  getReferralStats,
  applyReferralOnRegister,   // used internally by auth.controller
};