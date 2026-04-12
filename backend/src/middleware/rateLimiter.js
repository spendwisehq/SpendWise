// backend/src/middleware/rateLimiter.js

const rateLimit          = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { env }            = require('../config/env');

const generalLimiter = env.isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: env.rateLimit.windowMs,
      max: env.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please try again later.' },
    });

const authLimiter = env.isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
    });

// IP-based AI limiter (applied at app level before auth)
const aiLimiter = env.isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max:      10,
      standardHeaders: true,
      legacyHeaders:   false,
      message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
    });

// Per-user AI limiter (applied inside routes, after auth middleware)
// Premium users: 30 req/min, Free users: 10 req/min
const userAiLimiter = env.isTest
  ? (req, res, next) => next()
  : rateLimit({
  windowMs: 60 * 1000,
  max:      (req) => {
    const plan = req.user?.plan;
    if (plan === 'premium' || plan === 'growth' || req.user?.isPremium) return 30;
    if (plan === 'starter') return 20;
    return 10; // free tier
  },
  keyGenerator: (req) => `user_ai_${req.user?._id?.toString() || ipKeyGenerator(req)}`,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'AI rate limit exceeded. Please wait a moment.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Upload limit reached. Try again in 1 hour.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many payment requests. Please wait.' },
});

const apiPlatformLimiter = rateLimit({
  windowMs:     24 * 60 * 60 * 1000,
  max:          env.apiPlatform.freeTierDailyLimit,
  keyGenerator: (req) => req.headers['x-api-key'] || ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Daily API limit reached. Upgrade your plan.' },
});

module.exports = { generalLimiter, authLimiter, aiLimiter, userAiLimiter, uploadLimiter, paymentLimiter, apiPlatformLimiter };
