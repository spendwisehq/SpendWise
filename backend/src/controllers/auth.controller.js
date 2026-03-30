// backend/src/controllers/auth.controller.js

const User = require('../models/User.model');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

//─────────────────────────────────────
// HELPER — build safe user object
//─────────────────────────────────────
const sanitizeUser = (user) => ({
  id:             user._id,
  name:           user.name,
  email:          user.email,
  avatar:         user.avatar,
  currency:       user.currency,
  language:       user.language,
  timezone:       user.timezone,
  monthlyIncome:  user.monthlyIncome,
  plan:           user.plan,
  initials:       user.initials,
  isPremium:      user.isPremium,
  isEmailVerified:user.isEmailVerified,
  notifications:  user.notifications,
  smsTracking:    user.smsTracking,
  createdAt:      user.createdAt,
});

//─────────────────────────────────────
// POST /api/auth/register
//─────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password, currency, monthlyIncome } = req.body;

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      currency:      currency      || 'INR',
      monthlyIncome: monthlyIncome || 0,
    });

    // Generate tokens
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.lastLoginAt  = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        user:         sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/auth/login
//─────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check account active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate tokens
    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token + last login
    user.refreshToken = refreshToken;
    user.lastLoginAt  = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        user:         sanitizeUser(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/auth/refresh
//─────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    // Find user and match token
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is invalid or has been revoked.',
      });
    }

    // Issue new tokens
    const newAccessToken  = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: 'Tokens refreshed.',
      data: {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/auth/logout  (protected)
//─────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/auth/me  (protected)
//─────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// PUT /api/auth/profile  (protected)
//─────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'currency', 'language', 'timezone', 'monthlyIncome', 'notifications', 'smsTracking'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// PUT /api/auth/change-password  (protected)
//─────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
};