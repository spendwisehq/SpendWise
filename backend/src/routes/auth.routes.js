// backend/src/routes/auth.routes.js
// STAGE 2 UPDATE: Added 2FA routes and security/login-history routes
// STAGE 7 FIX:    Added /verify-otp and /resend-otp for email verification flow
// DPDP UPDATE:    Added DELETE /account (hard-delete, DPDP Act 2023)

const express = require('express');
const router  = express.Router();

const {
  register,
  verifyOTP,
  resendOTP,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,   // ← DPDP
} = require('../controllers/auth.controller');

const {
  setup2FA,
  enable2FA,
  disable2FA,
  verify2FALogin,
  regenerateBackupCodes,
} = require('../controllers/twofa.controller');

const {
  getLoginHistory,
  revokeSession,
  revokeAllSessions,
} = require('../controllers/security.controller');

const { protect }     = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} = require('../middleware/validators/auth.validator');

// ── Public routes ──────────────────────────────────────────────────────────
router.post('/register',   authLimiter, ...registerValidator, register);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/resend-otp', authLimiter, resendOTP);
router.post('/login',      authLimiter, ...loginValidator, login);
router.post('/refresh',    refreshToken);

// 2FA verify at login (public — user doesn't have a full session yet)
router.post('/2fa/verify', authLimiter, verify2FALogin);

// ── Protected routes ───────────────────────────────────────────────────────
router.use(protect);

router.post('/logout',         logout);
router.get('/me',              getMe);
router.put('/profile',         updateProfile);
router.put('/change-password', ...changePasswordValidator, changePassword);

// 2FA management (requires full session)
router.post('/2fa/setup',        setup2FA);
router.post('/2fa/enable',       enable2FA);
router.post('/2fa/disable',      disable2FA);
router.post('/2fa/backup-codes', regenerateBackupCodes);

// Security / login history
router.get('/security/login-history',   getLoginHistory);
router.post('/security/revoke-session', revokeSession);
router.post('/security/revoke-all',     revokeAllSessions);

// ── DPDP Act 2023 — Hard delete ────────────────────────────────────────────
// Requires: { password, confirmPhrase: "DELETE MY ACCOUNT" }
// Permanently erases all user data from every collection.
router.delete('/account', deleteAccount);

module.exports = router;