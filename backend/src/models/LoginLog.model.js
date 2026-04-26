// backend/src/models/LoginLog.model.js

const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // IP & geo
    ip: {
      type: String,
      default: 'unknown',
    },
    city: {
      type: String,
      default: 'Unknown',
    },
    country: {
      type: String,
      default: 'Unknown',
    },

    // Device fingerprint parsed from User-Agent
    device: {
      type: String,   // e.g. "Chrome 124 on Windows 10"
      default: 'Unknown device',
    },
    browser: {
      type: String,
      default: 'Unknown',
    },
    os: {
      type: String,
      default: 'Unknown',
    },
    isMobile: {
      type: Boolean,
      default: false,
    },

    // Session reference — same value stored in the refresh token payload
    // Lets us revoke exactly this session via "This wasn't me"
    sessionId: {
      type: String,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ['success', 'failed', '2fa_pending', 'revoked'],
      default: 'success',
    },

    // If user clicked "This wasn't me"
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,   // createdAt = login timestamp
  }
);

// Keep logs for 90 days only (TTL index)
loginLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
loginLogSchema.index({ user: 1, createdAt: -1 });

const LoginLog = mongoose.model('LoginLog', loginLogSchema);
module.exports = LoginLog;