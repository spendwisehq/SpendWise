// backend/src/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { env } = require('../config/env');

// General API limiter
const generalLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

// Strict limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

// Business API limiter (uses API key tier — expanded in Stage 11)
const apiPlatformLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: env.apiPlatform.freeTierDailyLimit,
  keyGenerator: (req) => {
    // Use API key if present, otherwise fall back to IPv6-safe IP
    return req.headers['x-api-key'] || ipKeyGenerator(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Daily API limit reached. Upgrade your plan for more requests.',
  },
});

module.exports = { generalLimiter, authLimiter, apiPlatformLimiter };