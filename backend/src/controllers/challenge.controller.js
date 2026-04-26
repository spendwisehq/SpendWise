// backend/src/controllers/challenge.controller.js
// Stage 7 — Financial Challenges
// Full CRUD + join/leave + progress update + leaderboard + badge award

const Challenge   = require('../models/Challenge.model');
const User        = require('../models/User.model');
const Transaction = require('../models/Transaction.model');

// ── Helper: compute progress for a participant ───────────────────────────────
const computeProgress = async (userId, challenge) => {
  const { type, targetCategory, startDate, endDate } = challenge;

  const query = {
    userId,
    isDeleted: false,
    date:      { $gte: startDate, $lte: endDate || new Date() },
  };

  if (type === 'no_spend' || type === 'category_limit') {
    if (targetCategory) query.categoryName = targetCategory;
    query.type = 'expense';
  } else if (type === 'savings_target') {
    // progress = income - expense
  } else if (type === 'spend_limit') {
    query.type = 'expense';
  } else if (type === 'transaction_count') {
    query.type = 'expense';
  }

  const txns = await Transaction.find(query).lean();

  if (type === 'transaction_count') return txns.length;
  if (type === 'savings_target') {
    const income  = txns.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return Math.max(0, income - expense);
  }
  return txns.reduce((s, t) => s + t.amount, 0);
};

// ── POST /api/challenges — create a challenge ────────────────────────────────
const createChallenge = async (req, res, next) => {
  try {
    const {
      title, description, type, targetCategory, targetValue,
      currency, startDate, endDate, visibility, maxParticipants, badge,
    } = req.body;

    if (!title || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'title, type, startDate, and endDate are required.',
      });
    }

    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'endDate must be after startDate.' });
    }

    const now    = new Date();
    const status = start > now ? 'upcoming' : 'active';

    const challenge = await Challenge.create({
      createdBy:       req.user._id,
      title,
      description:     description || '',
      type,
      targetCategory:  targetCategory || null,
      targetValue:     targetValue || 0,
      currency:        currency || req.user.currency || 'INR',
      startDate:       start,
      endDate:         end,
      status,
      visibility:      visibility || 'public',
      maxParticipants: maxParticipants || null,
      badge:           badge || null,
      // Creator auto-joins
      participants: [{
        userId:   req.user._id,
        name:     req.user.name,
        joinedAt: now,
      }],
    });

    return res.status(201).json({
      success: true,
      message: 'Challenge created!',
      data:    challenge,
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/challenges — list challenges (public + user's own) ───────────────
const getChallenges = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      isActive: true,
      $or: [
        { visibility: 'public' },
        { 'participants.userId': req.user._id },
        { createdBy: req.user._id },
      ],
    };

    if (status) query.status = status;
    if (type)   query.type   = type;

    const [challenges, total] = await Promise.all([
      Challenge.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name avatar')
        .lean(),
      Challenge.countDocuments(query),
    ]);

    // Flag which ones the current user is participating in
    const userId = req.user._id.toString();
    const enriched = challenges.map(c => ({
      ...c,
      isParticipant: c.participants.some(p => p.userId.toString() === userId),
      isCreator:     c.createdBy._id?.toString() === userId || c.createdBy.toString() === userId,
      myProgress:    c.participants.find(p => p.userId.toString() === userId) || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        challenges: enriched,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/challenges/:id — single challenge detail ────────────────────────
const getChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('createdBy',        'name avatar financialScore')
      .populate('participants.userId', 'name avatar financialScore')
      .lean();

    if (!challenge || !challenge.isActive) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }

    const userId = req.user._id.toString();
    const enriched = {
      ...challenge,
      isParticipant: challenge.participants.some(p =>
        (p.userId?._id || p.userId)?.toString() === userId
      ),
      isCreator: challenge.createdBy._id?.toString() === userId,
    };

    return res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/challenges/:id/join — join a challenge ─────────────────────────
const joinChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge || !challenge.isActive) {
      return res.status(404).json({ success: false, message: 'Challenge not found.' });
    }
    if (challenge.status === 'completed' || challenge.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Challenge is no longer active.' });
    }
    if (challenge.visibility === 'private') {
      return res.status(403).json({ success: false, message: 'This challenge is private.' });
    }

    const userId  = req.user._id.toString();
    const already = challenge.participants.some(p => p.userId.toString() === userId);
    if (already) {
      return res.status(409).json({ success: false, message: 'You are already in this challenge.' });
    }

    if (challenge.maxParticipants && challenge.participants.length >= challenge.maxParticipants) {
      return res.status(400).json({ success: false, message: 'Challenge is full.' });
    }

    // Compute existing progress from transactions
    const currentValue = await computeProgress(req.user._id, challenge);

    challenge.participants.push({
      userId:       req.user._id,
      name:         req.user.name,
      joinedAt:     new Date(),
      currentValue,
    });

    await challenge.save();

    return res.status(200).json({
      success: true,
      message: `Joined challenge: ${challenge.title}! 🎯`,
      data:    { challengeId: challenge._id, currentValue },
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/challenges/:id/leave — leave a challenge ─────────────────────
const leaveChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    const userId = req.user._id.toString();
    const idx    = challenge.participants.findIndex(p => p.userId.toString() === userId);
    if (idx === -1) {
      return res.status(400).json({ success: false, message: 'You are not in this challenge.' });
    }

    challenge.participants.splice(idx, 1);
    await challenge.save();

    return res.status(200).json({ success: true, message: 'Left challenge.' });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/challenges/:id/progress — refresh my progress ──────────────────
const refreshProgress = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    const userId    = req.user._id.toString();
    const participant = challenge.participants.find(p => p.userId.toString() === userId);
    if (!participant) {
      return res.status(400).json({ success: false, message: 'You are not in this challenge.' });
    }

    const currentValue = await computeProgress(req.user._id, challenge);
    participant.currentValue = currentValue;

    // Check completion for savings_target
    const goalMet =
      (challenge.type === 'savings_target'     && currentValue >= challenge.targetValue) ||
      (challenge.type === 'spend_limit'        && currentValue <= challenge.targetValue) ||
      (challenge.type === 'category_limit'     && currentValue <= challenge.targetValue) ||
      (challenge.type === 'no_spend'           && currentValue === 0)                    ||
      (challenge.type === 'transaction_count'  && currentValue <= challenge.targetValue);

    if (goalMet && !participant.completed && new Date() >= new Date(challenge.endDate)) {
      participant.completed    = true;
      participant.completedAt  = new Date();
      participant.badgeEarned  = true;
    }

    await challenge.save();

    return res.status(200).json({
      success: true,
      data: {
        currentValue,
        targetValue: challenge.targetValue,
        completed:   participant.completed,
        goalMet,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/challenges/:id/leaderboard — ranked participants ─────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('participants.userId', 'name avatar financialScore')
      .lean();

    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    // Sort by progress (higher is better for savings/spend challenges; lower for spend_limit)
    const sorted = [...challenge.participants].sort((a, b) => {
      if (challenge.type === 'spend_limit' || challenge.type === 'category_limit' ||
          challenge.type === 'no_spend'    || challenge.type === 'transaction_count') {
        return a.currentValue - b.currentValue; // lower is better
      }
      return b.currentValue - a.currentValue;   // higher is better
    });

    const leaderboard = sorted.map((p, i) => ({
      rank:          i + 1,
      userId:        p.userId?._id || p.userId,
      name:          p.userId?.name  || p.name,
      avatar:        p.userId?.avatar,
      financialScore: p.userId?.financialScore,
      currentValue:  p.currentValue,
      completed:     p.completed,
      completedAt:   p.completedAt,
      badgeEarned:   p.badgeEarned,
      joinedAt:      p.joinedAt,
    }));

    const myRank = leaderboard.findIndex(
      l => l.userId?.toString() === req.user._id.toString()
    );

    return res.status(200).json({
      success: true,
      data: {
        leaderboard,
        myRank:       myRank === -1 ? null : myRank + 1,
        totalPlayers: leaderboard.length,
        challenge:    { title: challenge.title, type: challenge.type, targetValue: challenge.targetValue },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/challenges/:id — edit challenge (creator only) ───────────────────
const updateChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });
    if (challenge.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot edit a completed challenge.' });
    }

    const allowed = ['title', 'description', 'badge', 'maxParticipants', 'visibility'];
    allowed.forEach(key => { if (req.body[key] !== undefined) challenge[key] = req.body[key]; });

    await challenge.save();
    return res.status(200).json({ success: true, data: challenge });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/challenges/:id — cancel challenge (creator only) ──────────────
const deleteChallenge = async (req, res, next) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!challenge) return res.status(404).json({ success: false, message: 'Challenge not found.' });

    challenge.status   = 'cancelled';
    challenge.isActive = false;
    await challenge.save();

    return res.status(200).json({ success: true, message: 'Challenge cancelled.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createChallenge,
  getChallenges,
  getChallenge,
  joinChallenge,
  leaveChallenge,
  refreshProgress,
  getLeaderboard,
  updateChallenge,
  deleteChallenge,
};