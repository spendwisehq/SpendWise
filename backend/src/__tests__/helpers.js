// backend/src/__tests__/helpers.js
// Shared test utilities — creates verified users directly in the DB

const User = require('../models/User.model');
const { generateAccessToken } = require('../utils/jwt');

/**
 * Create a verified user directly in the DB and return a valid JWT.
 * Bypasses the register→OTP→verify flow for controller tests that
 * just need an authenticated user.
 */
async function createAuthenticatedUser(overrides = {}) {
  const defaults = {
    name: 'Test User',
    email: `user_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
    password: 'Test@1234',
    currency: 'INR',
    isEmailVerified: true,
    monthlyIncome: 0,
  };
  const data = { ...defaults, ...overrides };
  const user = await User.create(data);
  const accessToken = generateAccessToken(user._id);
  return { user, accessToken, userId: user._id.toString() };
}

module.exports = { createAuthenticatedUser };
