// backend/src/controllers/twofa.controller.js
// Handles all TOTP-based 2FA lifecycle:
//   POST /api/auth/2fa/setup       — generate secret + QR URI
//   POST /api/auth/2fa/enable      — confirm first TOTP code & activate
//   POST /api/auth/2fa/disable     — turn off 2FA (requires password + TOTP)
//   POST /api/auth/2fa/verify      — verify TOTP at login (returns full tokens)
//   GET  /api/auth/2fa/backup-codes — regenerate backup codes

const speakeasy = require('speakeasy');
const crypto    = require('crypto');
const bcrypt    = require('bcryptjs');
const User      = require('../models/User.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');

// ── Helper: hash a backup code ───────────────────────────────────────────────
const hashCode = async (code) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
};

// ── Helper: build the same sanitized user shape as auth.controller ───────────
const sanitizeUser = (user) => ({
  id:              user._id,
  name:            user.name,
  email:           user.email,
  avatar:          user.avatar,
  currency:        user.currency,
  language:        user.language,
  timezone:        user.timezone,
  monthlyIncome:   user.monthlyIncome,
  plan:            user.plan,
  initials:        user.initials,
  isPremium:       user.isPremium,
  isEmailVerified: user.isEmailVerified,
  notifications:   user.notifications,
  smsTracking:     user.smsTracking,
  createdAt:       user.createdAt,
  twoFAEnabled:    user.twoFA?.enabled ?? false,
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/setup  (protected)
// Generates a new TOTP secret and returns the otpauth URL for QR rendering.
// The secret is saved as PENDING (not enabled yet) until /enable confirms it.
// ────────────────────────────────────────────────────────────────────────────
const setup2FA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+twoFA.secret');

    if (user.twoFA?.enabled) {
      return sendError(res, '2FA is already enabled on this account.', 400);
    }

    // Generate a new TOTP secret
    const secret = speakeasy.generateSecret({
      name:   `SpendWise (${user.email})`,
      issuer: 'SpendWise',
      length: 20,
    });

    // Persist pending secret (not enabled yet)
    user.twoFA = {
      ...user.twoFA,
      enabled:  false,
      secret:   secret.base32,
      enabledAt: null,
    };
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, {
      otpauthUrl: secret.otpauth_url,   // Used to render QR via frontend library
      manualKey:  secret.base32,        // Shown for manual entry
    }, 'Scan the QR code in your authenticator app, then confirm with a code.');
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/enable  (protected)
// Body: { totp: "123456" }
// Validates the first TOTP code and marks 2FA as active.
// Also generates 8 single-use backup codes.
// ────────────────────────────────────────────────────────────────────────────
const enable2FA = async (req, res, next) => {
  try {
    const { totp } = req.body;
    if (!totp) return sendError(res, 'TOTP code is required.', 400);

    const user = await User.findById(req.user._id).select('+twoFA.secret +twoFA.backupCodes');

    if (!user.twoFA?.secret) {
      return sendError(res, 'Please call /2fa/setup first to generate a secret.', 400);
    }
    if (user.twoFA.enabled) {
      return sendError(res, '2FA is already enabled.', 400);
    }

    // Verify the TOTP code — allow 1 window (30s) of drift
    const isValid = speakeasy.totp.verify({
      secret:   user.twoFA.secret,
      encoding: 'base32',
      token:    totp.toString().replace(/\s/g, ''),
      window:   1,
    });

    if (!isValid) {
      return sendError(res, 'Invalid TOTP code. Make sure your device clock is correct.', 401);
    }

    // Generate 8 backup codes (plain for display, hashed for storage)
    const plainCodes  = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()  // e.g. "A3F2C1D9"
    );
    const hashedCodes = await Promise.all(plainCodes.map(hashCode));

    user.twoFA.enabled     = true;
    user.twoFA.backupCodes = hashedCodes;
    user.twoFA.enabledAt   = new Date();
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, {
      backupCodes: plainCodes,  // Shown ONCE — user must save these
      message: 'Store these backup codes safely. They cannot be shown again.',
    }, '2FA enabled successfully!');
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/disable  (protected)
// Body: { password, totp }
// Requires both current password AND a valid TOTP (or backup code).
// ────────────────────────────────────────────────────────────────────────────
const disable2FA = async (req, res, next) => {
  try {
    const { password, totp } = req.body;
    if (!password || !totp) return sendError(res, 'Password and TOTP code are required.', 400);

    const user = await User.findById(req.user._id)
      .select('+password +twoFA.secret +twoFA.backupCodes');

    if (!user.twoFA?.enabled) {
      return sendError(res, '2FA is not enabled on this account.', 400);
    }

    // Verify password
    const pwMatch = await user.comparePassword(password);
    if (!pwMatch) return sendError(res, 'Incorrect password.', 401);

    // Verify TOTP
    const totpValid = speakeasy.totp.verify({
      secret:   user.twoFA.secret,
      encoding: 'base32',
      token:    totp.toString().replace(/\s/g, ''),
      window:   1,
    });

    if (!totpValid) return sendError(res, 'Invalid TOTP code.', 401);

    // Disable
    user.twoFA.enabled     = false;
    user.twoFA.secret      = null;
    user.twoFA.backupCodes = [];
    user.twoFA.enabledAt   = null;
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, {}, '2FA has been disabled. Your account is less secure now.');
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/verify  (public — called after password login when 2FA is on)
// Body: { tempToken, totp }
// tempToken is a short-lived JWT issued by /login when user has 2FA enabled.
// Returns full accessToken + refreshToken on success.
// ────────────────────────────────────────────────────────────────────────────
const verify2FALogin = async (req, res, next) => {
  try {
    const { tempToken, totp } = req.body;
    if (!tempToken || !totp) {
      return sendError(res, 'Temp token and TOTP code are required.', 400);
    }

    // Verify tempToken
    const jwt = require('jsonwebtoken');
    const { env } = require('../config/env');
    let decoded;
    try {
      decoded = jwt.verify(tempToken, env.jwt.secret);
    } catch {
      return sendError(res, 'Temp token is invalid or expired. Please login again.', 401);
    }

    if (decoded.type !== '2fa_pending') {
      return sendError(res, 'Invalid token type.', 401);
    }

    const user = await User.findById(decoded.id)
      .select('+twoFA.secret +twoFA.backupCodes +refreshToken');

    if (!user || !user.isActive) {
      return sendError(res, 'User not found or deactivated.', 401);
    }

    // Try TOTP first
    const cleanToken = totp.toString().replace(/\s/g, '');
    let isValid = speakeasy.totp.verify({
      secret:   user.twoFA.secret,
      encoding: 'base32',
      token:    cleanToken,
      window:   1,
    });

    // Fall back to backup code
    if (!isValid && user.twoFA.backupCodes?.length) {
      for (let i = 0; i < user.twoFA.backupCodes.length; i++) {
        const match = await bcrypt.compare(cleanToken.toUpperCase(), user.twoFA.backupCodes[i]);
        if (match) {
          // Consume the backup code
          user.twoFA.backupCodes.splice(i, 1);
          await user.save({ validateBeforeSave: false });
          isValid = true;
          break;
        }
      }
    }

    if (!isValid) return sendError(res, 'Invalid TOTP code or backup code.', 401);

    // Issue full session tokens
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    user.lastLoginAt  = new Date();
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, {
      user:         sanitizeUser(user),
      accessToken,
      refreshToken,
    }, 'Login successful!');
  } catch (err) {
    next(err);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/backup-codes  (protected)
// Regenerates backup codes (invalidates old ones). Requires TOTP to confirm.
// ────────────────────────────────────────────────────────────────────────────
const regenerateBackupCodes = async (req, res, next) => {
  try {
    const { totp } = req.body;
    if (!totp) return sendError(res, 'TOTP code is required.', 400);

    const user = await User.findById(req.user._id)
      .select('+twoFA.secret +twoFA.backupCodes');

    if (!user.twoFA?.enabled) {
      return sendError(res, '2FA is not enabled.', 400);
    }

    const isValid = speakeasy.totp.verify({
      secret:   user.twoFA.secret,
      encoding: 'base32',
      token:    totp.toString().replace(/\s/g, ''),
      window:   1,
    });

    if (!isValid) return sendError(res, 'Invalid TOTP code.', 401);

    const plainCodes  = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    const hashedCodes = await Promise.all(plainCodes.map(hashCode));

    user.twoFA.backupCodes = hashedCodes;
    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, {
      backupCodes: plainCodes,
    }, 'New backup codes generated. Old ones are now invalid.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  setup2FA,
  enable2FA,
  disable2FA,
  verify2FALogin,
  regenerateBackupCodes,
};