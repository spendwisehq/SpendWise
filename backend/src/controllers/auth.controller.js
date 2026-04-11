// backend/src/controllers/auth.controller.js
// With OTP email verification + full auth system

const User    = require('../models/User.model');
const crypto  = require('crypto');
const nodemailer = require('nodemailer');
const { authenticator } = require('otplib');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

// ── Email transporter ────────────────────────────────────────────────────────
const createTransporter = () => nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Send OTP email ────────────────────────────────────────────────────────────
const sendOTPEmail = async (email, otp, name) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"SpendWise" <${process.env.EMAIL_USER}>`,
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

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isEmailVerified) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Generate 6-digit OTP
    const otp        = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let user;
    if (existing && !existing.isEmailVerified) {
      // Update existing unverified account
      existing.name     = name;
      existing.password = password;
      existing.currency = currency || 'INR';
      existing.emailVerificationOTP     = otp;
      existing.emailVerificationExpires = otpExpires;
      await existing.save();
      user = existing;
    } else {
      // Create new user (unverified)
      user = await User.create({
        name, email, password,
        currency:  currency || 'INR',
        monthlyIncome: 0,
        isEmailVerified: false,
        emailVerificationOTP:     otp,
        emailVerificationExpires: otpExpires,
      });
    }

    // Send OTP email
    try {
      await sendOTPEmail(email, otp, name);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      // In dev mode — return OTP in response for testing
      if (process.env.NODE_ENV === 'development') {
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified.' });
    }

    if (!user.emailVerificationOTP || user.emailVerificationOTP !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as verified
    user.isEmailVerified          = true;
    user.emailVerificationOTP     = undefined;
    user.emailVerificationExpires = undefined;
    user.lastLoginAt              = new Date();

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Email verified! Welcome to SpendWise 🎉',
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

    user.emailVerificationOTP     = otp;
    user.emailVerificationExpires = otpExpires;
    await user.save({ validateBeforeSave: false });

    try {
      await sendOTPEmail(email, otp, user.name);
    } catch {
      if (process.env.NODE_ENV === 'development') {
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
      // Re-send OTP
      const otp        = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      user.emailVerificationOTP     = otp;
      user.emailVerificationExpires = otpExpires;
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

    return res.status(200).json({
      success: true, message: 'Login successful!',
      data: { user: sanitizeUser(user), accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required.' });

    let decoded;
    try { decoded = verifyRefreshToken(token); }
    catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' }); }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked.' });
    }

    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true, message: 'Tokens refreshed.',
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) { next(error); }
};

// ── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
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

module.exports = { register, verifyOTP, resendOTP, login, refreshToken, logout, getMe, updateProfile, changePassword };