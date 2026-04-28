// frontend/src/api/auth.api.js
// STAGE 2 UPDATE: Added 2FA and security log endpoints

import api from './axios';

const authAPI = {
  // ── Existing ──────────────────────────────────────────────────────────────
  register:       (data) => api.post('/auth/register',       data).then(r => r.data),
  verifyOTP:      (data) => api.post('/auth/verify-otp',     data).then(r => r.data),
  resendOTP:      (data) => api.post('/auth/resend-otp',     data).then(r => r.data),
  login:          (data) => api.post('/auth/login',          data).then(r => r.data),
  logout:         ()     => api.post('/auth/logout'),
  refresh:        (data) => api.post('/auth/refresh',        data).then(r => r.data),
  getMe:          ()     => api.get('/auth/me').then(r => r.data),
  updateProfile:  (data) => api.put('/auth/profile',         data).then(r => r.data),
  changePassword: (data) => api.put('/auth/change-password', data).then(r => r.data),
  deleteAccount: (data) => api.delete('/auth/account', { data }),

  // ── Stage 2: 2FA ─────────────────────────────────────────────────────────
  // 1. Call setup to get the otpauth URL (render as QR)
  setup2FA:         ()     => api.post('/auth/2fa/setup').then(r => r.data),
  // 2. User scans QR, enters first TOTP code — activates 2FA
  enable2FA:        (data) => api.post('/auth/2fa/enable',  data).then(r => r.data),
  // 3. Disable (requires password + TOTP)
  disable2FA:       (data) => api.post('/auth/2fa/disable', data).then(r => r.data),
  // 4. After login when twoFARequired=true, verify the TOTP
  verify2FALogin:   (data) => api.post('/auth/2fa/verify',  data).then(r => r.data),
  // 5. Regenerate backup codes (requires TOTP)
  regenerateBackupCodes: (data) => api.post('/auth/2fa/backup-codes', data).then(r => r.data),

  // ── Stage 2: Security log ─────────────────────────────────────────────────
  getLoginHistory:  (params) => api.get('/auth/security/login-history',   { params }).then(r => r.data),
  revokeSession:    (data)   => api.post('/auth/security/revoke-session',  data).then(r => r.data),
  revokeAllSessions: ()      => api.post('/auth/security/revoke-all').then(r => r.data),
};

export default authAPI;
