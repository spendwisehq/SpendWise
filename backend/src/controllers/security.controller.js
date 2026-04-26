// backend/src/controllers/security.controller.js
// Handles the security audit log endpoints:
//   GET  /api/auth/security/login-history   — paginated login log
//   POST /api/auth/security/revoke-session  — "This wasn't me" → revoke a session
//   POST /api/auth/security/revoke-all      — revoke ALL sessions (nuclear option)

const LoginLog   = require('../models/LoginLog.model');
const User       = require('../models/User.model');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// ────────────────────────────────────────────────────────────────────────────
// GET /api/auth/security/login-history  (protected)
// Returns paginated login events for the current user.
// ────────────────────────────────────────────────────────────────────────────
const getLoginHistory = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      LoginLog.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoginLog.countDocuments({ user: req.user._id }),
    ]);

    return sendPaginated(res, logs, total, page, limit, 'Login history retrieved.');
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/security/revoke-session  (protected)
// Body: { logId }
// Marks a specific session as revoked. If it matches the active refresh token,
// that token is also cleared so the session can't be extended.
// ────────────────────────────────────────────────────────────────────────────
const revokeSession = async (req, res, next) => {
  try {
    const { logId } = req.body;
    if (!logId) return sendError(res, 'logId is required.', 400);

    const log = await LoginLog.findOne({ _id: logId, user: req.user._id });
    if (!log) return sendError(res, 'Session log not found.', 404);

    if (log.status === 'revoked') {
      return sendError(res, 'This session is already revoked.', 400);
    }

    log.status    = 'revoked';
    log.revokedAt = new Date();
    await log.save();

    // If this sessionId is the currently active refresh token, clear it too
    if (log.sessionId) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    }

    return sendSuccess(res, { logId }, 'Session revoked. That device will need to log in again.');
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/security/revoke-all  (protected)
// Nuclear option — clears the refresh token and logs all sessions as revoked.
// The current request still works (access token valid) but all future refreshes fail.
// ────────────────────────────────────────────────────────────────────────────
const revokeAllSessions = async (req, res, next) => {
  try {
    // Clear refresh token on user
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

    // Mark all active logs as revoked
    await LoginLog.updateMany(
      { user: req.user._id, status: 'success' },
      { $set: { status: 'revoked', revokedAt: new Date() } }
    );

    return sendSuccess(res, {}, 'All sessions revoked. Please log in again on all devices.');
  } catch (err) {
    next(err);
  }
};

module.exports = { getLoginHistory, revokeSession, revokeAllSessions };