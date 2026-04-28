// backend/src/controllers/auth.controller.js
// With OTP email verification + httpOnly cookie auth

const User    = require('../models/User.model');
const crypto  = require('crypto');
const nodemailer = require('nodemailer');
const { authenticator } = require('otplib');
const { env } = require('../config/env');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

// ── Cookie config ─────────────────────────────────────────────────────────────
const COOKIE_BASE = {
  httpOnly: true,
  secure:   env.isProd,
  sameSite: 'lax',
  path:     '/',
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('sw_access', accessToken, {
    ...COOKIE_BASE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('sw_refresh', refreshToken, {
    ...COOKIE_BASE,
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path:   '/api/auth',
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie('sw_access',  { path: '/' });
  res.clearCookie('sw_refresh', { path: '/api/auth' });
};

// ── Email transporter ────────────────────────────────────────────────────────
const createTransporter = () => nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465,
  auth: {
    user: env.email.user,
    pass: env.email.pass,
  },
});

// ── Send OTP email ────────────────────────────────────────────────────────────
const sendOTPEmail = async (email, otp, name) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"SpendWise" <${env.email.user}>`,
    to: email,
    subject: 'SpendWise — Verify Your Email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#F8FAFC;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:#6366F1;color:white;display:inline-block;padding:10px 20px;border-radius:8px;font-size:18px;font-weight:700;">SpendWise</div>
        </div>
        <h2 style="color:#0F172A;margin-bottom:8px;">Hi ${name || 'there'} 👋</h2>
        <p style="color:#475569;margin-bottom:24px;">Please verify your email address to activate your SpendWise account.</p>
        <div style="background:white;border:2px solid #6366F1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <p style="color:#6366F1;font-size:13px;font-weight:600;margin-bottom:8px;letter-spacing:0.5px;text-transform:uppercase;">Your Verification Code</p>
          <div style="font-size:40px;font-weight:800;color:#0F172A;letter-spacing:8px;">${otp}</div>
          <p style="color:#94A3B8;font-size:12px;margin-top:12px;">This code expires in 10 minutes</p>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;">If you did not create a SpendWise account, you can safely ignore this email.</p>
      </div>
    `,
  });
};

// ── Helper ───────────────────────────────────────────────────────────────────
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
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, currency } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isEmailVerified) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const otp        = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let user;
    if (existing && !existing.isEmailVerified) {
      existing.name     = name;
      existing.password = password;
      existing.currency = currency || 'INR';
      existing.emailVerifyOTP       = otp;
      existing.emailVerifyOTPExpiry = otpExpires;
      await existing.save();
      user = existing;
    } else {
      user = await User.create({
        name, email, password,
        currency:  currency || 'INR',
        monthlyIncome: 0,
        isEmailVerified: false,
        emailVerifyOTP:       otp,
        emailVerifyOTPExpiry: otpExpires,
      });
    }

    try {
      await sendOTPEmail(email, otp, name);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      if (env.isDev) {
        return res.status(201).json({
          success: true,
          message: 'Account created! (Dev mode: OTP returned in response)',
          data: { email, otp, devMode: true },
        });
      }
      return res.status(500).json({ success: false, message: 'Failed to send verification email. Check your email address.' });
    }

    return res.status(201).json({
      success: true,
      message: `Verification code sent to ${email}. Please check your inbox.`,
      data: { email, requiresVerification: true },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+emailVerifyOTP +emailVerifyOTPExpiry');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    if (!user.emailVerifyOTP || user.emailVerifyOTP !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    if (!user.emailVerifyOTPExpiry || user.emailVerifyOTPExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    user.isEmailVerified      = true;
    user.emailVerifyOTP       = undefined;
    user.emailVerifyOTPExpiry = undefined;
    user.lastLoginAt          = new Date();

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Email verified! Welcome to SpendWise',
      data: { user: sanitizeUser(user), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/resend-otp ────────────────────────────────────────────────
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    const otp        = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.emailVerifyOTP       = otp;
    user.emailVerifyOTPExpiry = otpExpires;
    await user.save({ validateBeforeSave: false });

    try {
      await sendOTPEmail(email, otp, user.name);
    } catch {
      if (env.isDev) {
        return res.status(200).json({ success: true, message: 'Dev mode: OTP resent.', data: { otp } });
      }
      return res.status(500).json({ success: false, message: 'Failed to send email.' });
    }

    return res.status(200).json({ success: true, message: `New verification code sent to ${email}.` });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');

    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    if (!user.isEmailVerified) {
      const otp        = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.emailVerifyOTP       = otp;
      user.emailVerifyOTPExpiry = otpExpires;
      await user.save({ validateBeforeSave: false });

      try { await sendOTPEmail(user.email, otp, user.name); } catch {}

      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. A new code has been sent.',
        data: { requiresVerification: true, email: user.email },
      });
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    user.lastLoginAt   = new Date();
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      success: true, message: 'Login successful!',
      data: { user: sanitizeUser(user), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
const refreshTokenFn = async (req, res, next) => {
  try {
    const token = req.cookies?.sw_refresh || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required.' });

    let decoded;
    try { decoded = verifyRefreshToken(token); }
    catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' }); }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      if (user) {
        user.refreshToken = null;
        await user.save({ validateBeforeSave: false });
      }
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'Refresh token revoked. Please login again.' });
    }

    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      success: true, message: 'Tokens refreshed.',
      data: { user: sanitizeUser(user), accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) { next(error); }
};

// ── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    clearAuthCookies(res);
    return res.status(200).json({ success: true, message: 'Logged out.' });
  } catch (error) { next(error); }
};

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};

// ── PUT /api/auth/profile ────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name','phone','currency','language','timezone','monthlyIncome','notifications','smsTracking'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    return res.status(200).json({ success: true, message: 'Profile updated.', data: { user: sanitizeUser(user) } });
  } catch (error) { next(error); }
};

// ── PUT /api/auth/change-password ────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password incorrect.' });
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ success: true, message: 'Password changed.' });
  } catch (error) { next(error); }
};

module.exports = { register, verifyOTP, resendOTP, login, refreshToken: refreshTokenFn, logout, getMe, updateProfile, changePassword };
