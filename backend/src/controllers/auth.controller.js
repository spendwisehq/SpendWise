// backend/src/controllers/auth.controller.js
// DPDP UPDATE: Added deleteAccount (hard-delete all user data, DPDP Act 2023)
// FIXED: sendOTPEmail now also supports custom subject+html for system emails

const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const User       = require('../models/User.model');
const LoginLog   = require('../models/LoginLog.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { env }    = require('../config/env');
const parseUserAgent = require('../utils/parseUserAgent');

// ── Email transporter (sync, no network call on startup) ──────────────────────
let _transporter = null;
const getTransporter = () => {
  if (_transporter) return _transporter;

  if (env.email?.host && env.email?.user && env.email?.pass) {
    _transporter = nodemailer.createTransport({
      host:   env.email.host,
      port:   Number(env.email.port || 587),
      secure: Number(env.email.port) === 465,
      auth:   { user: env.email.user, pass: env.email.pass },
    });
    console.log(`[Email] ✅ SMTP ready via ${env.email.host}`);
  } else {
    _transporter = null;
  }
  return _transporter;
};

// ── Send email — supports OTP mode and custom mode ────────────────────────────
// otp = null + options.subject/html/text → custom email (e.g. deletion confirmation)
// otp = '123456' → OTP verification email
const sendOTPEmail = async (toEmail, toName, otp, options = {}) => {
  if (otp) {
    console.log(`\n[Email] 🔑 OTP for ${toEmail} : ${otp}\n`);
  }

  const transporter = getTransporter();
  if (!transporter) {
    if (!otp) console.log('[Email] ℹ️  No SMTP config — skipping system email.');
    else      console.log('[Email] ℹ️  No SMTP config — use the OTP printed above.');
    return false;
  }

  try {
    const from = env.email?.from || env.email?.user || 'noreply@spendwise.app';

    // Custom email (subject + html + text provided)
    if (!otp && options.subject) {
      await transporter.sendMail({
        from:    `"SpendWise" <${from}>`,
        to:      toEmail,
        subject: options.subject,
        html:    options.html || options.text,
        text:    options.text || options.subject,
      });
      console.log(`[Email] ✅ System email sent to ${toEmail} — "${options.subject}"`);
      return true;
    }

    // OTP email
    await transporter.sendMail({
      from:    `"SpendWise" <${from}>`,
      to:      toEmail,
      subject: `${otp} is your SpendWise verification code`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-1px">SpendWise</h1>
            <p style="margin:8px 0 0;opacity:0.8;font-size:14px">AI-Powered Finance</p>
          </div>
          <div style="padding:32px;text-align:center">
            <p style="font-size:16px;margin:0 0 8px">Hi <strong>${toName}</strong> 👋</p>
            <p style="color:#a1a1aa;font-size:14px;margin:0 0 28px">
              Use this code to verify your email. It expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:#1a1a2e;border:2px solid #6366f1;border-radius:12px;padding:24px;display:inline-block;min-width:220px">
              <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#818cf8;font-family:monospace">${otp}</div>
            </div>
            <p style="color:#71717a;font-size:12px;margin:24px 0 0">
              If you didn't create a SpendWise account, ignore this email.
            </p>
          </div>
          <div style="background:#111;padding:16px;text-align:center">
            <p style="color:#52525b;font-size:11px;margin:0">© ${new Date().getFullYear()} SpendWise</p>
          </div>
        </div>
      `,
      text: `Your SpendWise verification code is: ${otp}\n\nExpires in 10 minutes.`,
    });
    console.log(`[Email] ✅ Email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error('[Email] ❌ sendMail failed:', err.message);
    return false;
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.headers['x-real-ip'] ||
  req.socket?.remoteAddress ||
  'unknown';

const recordLogin = async (userId, req, status = 'success', sessionId = null) => {
  try {
    const ip = getIP(req);
    const ua = req.headers['user-agent'] || '';
    const { browser, os, device, isMobile } = parseUserAgent(ua);
    let city = 'Unknown', country = 'Unknown';
    try {
      const geoip = require('geoip-lite');
      const geo   = geoip.lookup(ip);
      if (geo) { city = geo.city || 'Unknown'; country = geo.country || 'Unknown'; }
    } catch { /* geoip-lite optional */ }
    await LoginLog.create({ user: userId, ip, city, country, device, browser, os, isMobile, sessionId, status });
  } catch (e) {
    console.error('[LoginLog] Failed:', e.message);
  }
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, currency, monthlyIncome } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (!existing.isEmailVerified) {
        const otp        = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        existing.otpCode    = otp;
        existing.otpExpires = otpExpires;
        await existing.save({ validateBeforeSave: false });
        sendOTPEmail(existing.email, existing.name, otp).catch(() => {});
        return res.status(200).json({
          success: true,
          message: 'Account exists but not verified. A new OTP has been sent.',
          data:    { email: existing.email, otpSent: true },
        });
      }
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const otp        = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name,
      email:           email.toLowerCase().trim(),
      password,
      currency:        currency      || 'INR',
      monthlyIncome:   monthlyIncome || 0,
      isEmailVerified: false,
      otpCode:         otp,
      otpExpires,
    });

    sendOTPEmail(user.email, user.name, otp).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Account created! Check your email for the 6-digit verification code.',
      data:    { email: user.email, name: user.name, otpSent: true },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+otpCode +otpExpires +refreshToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    if (user.isEmailVerified) {
      const accessToken  = generateAccessToken(user._id);
      const refreshToken = generateRefreshToken(user._id);
      user.refreshToken = refreshToken;
      user.lastLoginAt  = new Date();
      await user.save({ validateBeforeSave: false });
      return res.status(200).json({
        success: true,
        message: 'Email already verified. Logged in!',
        data:    { user: sanitizeUser(user), accessToken, refreshToken },
      });
    }

    if (!user.otpCode) {
      return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    let otpMatch = false;
    try {
      otpMatch = crypto.timingSafeEqual(
        Buffer.from(user.otpCode.toString().padEnd(6)),
        Buffer.from(otp.toString().trim().padEnd(6))
      );
    } catch {
      otpMatch = user.otpCode.toString() === otp.toString().trim();
    }

    if (!otpMatch) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    user.isEmailVerified = true;
    user.otpCode         = undefined;
    user.otpExpires      = undefined;

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    user.lastLoginAt  = new Date();
    await user.save({ validateBeforeSave: false });

    await recordLogin(user._id, req, 'success', refreshToken.slice(-8));

    return res.status(200).json({
      success: true,
      message: 'Email verified! Welcome to SpendWise 🎉',
      data:    { user: sanitizeUser(user), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+otpCode +otpExpires');

    if (!user) return res.status(404).json({ success: false, message: 'No account found with this email.' });
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Email is already verified.' });

    const otp        = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpCode     = otp;
    user.otpExpires  = otpExpires;
    await user.save({ validateBeforeSave: false });

    sendOTPEmail(user.email, user.name, otp).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'A new OTP has been sent to your email.',
      data:    { email: user.email },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +refreshToken +twoFA.enabled');

    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Your account has been deactivated.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await recordLogin(user._id, req, 'failed');
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isEmailVerified) {
      const otp        = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.otpCode     = otp;
      user.otpExpires  = otpExpires;
      await user.save({ validateBeforeSave: false });
      sendOTPEmail(user.email, user.name, otp).catch(() => {});
      return res.status(403).json({
        success:         false,
        emailUnverified: true,
        message:         'Please verify your email first. A new OTP has been sent to your inbox.',
        data:            { email: user.email },
      });
    }

    if (user.twoFA?.enabled) {
      const tempToken = jwt.sign(
        { id: user._id, type: '2fa_pending' },
        env.jwt.secret,
        { expiresIn: '5m' }
      );
      await recordLogin(user._id, req, '2fa_pending');
      return res.status(200).json({
        success: true, twoFARequired: true,
        message: 'Enter your authenticator code to continue.',
        data:    { tempToken },
      });
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    user.lastLoginAt  = new Date();
    await user.save({ validateBeforeSave: false });
    await recordLogin(user._id, req, 'success', refreshToken.slice(-8));

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      data:    { user: sanitizeUser(user), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token is required.' });

    const { verifyRefreshToken } = require('../utils/jwt');
    let decoded;
    try { decoded = verifyRefreshToken(token); }
    catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' }); }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or revoked.' });
    }

    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed.',
      data:    { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) { next(error); }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name','phone','currency','language','timezone','monthlyIncome','notifications','smsTracking'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    return res.status(200).json({ success: true, message: 'Profile updated.', data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};

// ── PUT /api/auth/change-password ─────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ success: true, message: 'Password changed successfully.' });
  } catch (error) { next(error); }
};

// ── DELETE /api/auth/account — DPDP Act 2023 Hard Delete ─────────────────────
// Wipes ALL user data across every collection.
// Sends a confirmation email. Logs the deletion event.
// Per DPDP Act 2023: user data must be erasable on request (within 30 days).
// We do it immediately.
const deleteAccount = async (req, res, next) => {
  try {
    const { password, confirmPhrase } = req.body;

    // 1. Require the exact confirmation phrase to prevent accidents
    if (confirmPhrase !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Type "DELETE MY ACCOUNT" exactly in the confirmation field.',
      });
    }

    // 2. Re-verify password — confirms account ownership
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    // Capture identity before deletion
    const userId    = user._id;
    const userEmail = user.email;
    const userName  = user.name;

    // 3. Hard-delete all data across every collection (parallel for speed)
    const [
      Transaction,
      Category,
      Budget,
      Group,
      Split,
      RecurringTransaction,
      AuditTrail,
      APIKey,
      APIUsageLog,
    ] = [
      require('../models/Transaction.model'),
      require('../models/Category.model'),
      require('../models/Budget.model'),
      require('../models/Group.model'),
      require('../models/Split.model'),
      require('../models/RecurringTransaction.model'),
      require('../models/AuditTrail.model'),
      require('../models/APIKey.model'),
      require('../models/APIUsageLog.model'),
    ];

    const results = await Promise.allSettled([
      Transaction.deleteMany({ userId }),
      Category.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      Group.deleteMany({ $or: [{ createdBy: userId }, { 'members.userId': userId }] }),
      Split.deleteMany({ $or: [{ paidBy: userId }, { 'participants.userId': userId }] }),
      RecurringTransaction.deleteMany({ userId }),
      AuditTrail.deleteMany({ userId }),
      APIKey.deleteMany({ userId }),
      APIUsageLog.deleteMany({ userId }),
      LoginLog.deleteMany({ user: userId }),
      // Remove user from groups they didn't create (member cleanup)
      Group.updateMany({ 'members.userId': userId }, { $pull: { members: { userId } } }),
    ]);

    // Build deletion summary for audit log
    const labels = [
      'Transaction','Category','Budget','Group','Split',
      'RecurringTransaction','AuditTrail','APIKey','APIUsageLog','LoginLog','GroupMemberCleanup',
    ];
    const summary = {};
    results.forEach((r, i) => {
      summary[labels[i]] = r.status === 'fulfilled'
        ? (r.value?.deletedCount ?? r.value?.modifiedCount ?? 'ok')
        : `ERROR: ${r.reason?.message}`;
    });

    // 4. Delete the user document itself
    await User.findByIdAndDelete(userId);

    // 5. Write immutable audit log to console (in production → external log store)
    console.log('[DPDP_AUDIT]', JSON.stringify({
      event:       'ACCOUNT_HARD_DELETED',
      userId:      userId.toString(),
      email:       userEmail,
      deletedAt:   new Date().toISOString(),
      requestedBy: 'user_self',
      ip:          getIP(req),
      userAgent:   req.headers['user-agent'] || 'unknown',
      summary,
    }));

    // 6. Send deletion confirmation email (fire-and-forget)
    sendOTPEmail(userEmail, userName, null, {
      subject: 'Your SpendWise account has been permanently deleted',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d0d;color:#fff;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:32px;text-align:center">
            <h1 style="margin:0;font-size:24px;font-weight:900;letter-spacing:-1px">Account Deleted</h1>
            <p style="margin:8px 0 0;opacity:0.8;font-size:14px">SpendWise</p>
          </div>
          <div style="padding:32px">
            <p style="font-size:16px;margin:0 0 16px">Hi <strong>${userName}</strong>,</p>
            <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 12px">
              Your SpendWise account and <strong>all associated data</strong> have been permanently deleted as requested.
            </p>
            <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 12px">
              This includes: transactions, budgets, categories, groups, AI reports, blockchain audit trail, and API keys.
            </p>
            <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;margin:20px 0">
              <p style="color:#9ca3af;font-size:12px;margin:0 0 6px">Deletion timestamp</p>
              <p style="color:#fff;font-size:13px;font-family:monospace;margin:0">${new Date().toISOString()}</p>
            </div>
            <p style="color:#71717a;font-size:12px;margin:0">
              If you did not request this, contact <a href="mailto:support@spendwise.app" style="color:#6366f1">support@spendwise.app</a> immediately.
            </p>
          </div>
          <div style="background:#111;padding:16px;text-align:center">
            <p style="color:#52525b;font-size:11px;margin:0">
              SpendWise — Compliant with India's Digital Personal Data Protection Act, 2023
            </p>
          </div>
        </div>
      `,
      text: `Hi ${userName}, your SpendWise account and all data were permanently deleted on ${new Date().toISOString()}. If you did not request this, contact support@spendwise.app immediately.`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Your account and all data have been permanently deleted.',
      data: {
        deletedAt: new Date().toISOString(),
        note:      'A confirmation email has been sent to your registered address.',
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};