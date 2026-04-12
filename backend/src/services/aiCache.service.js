// backend/src/services/aiCache.service.js

const AIReport = require('../models/AIReport.model');

const TTL = {
  analysis_cache:        6  * 60 * 60 * 1000, // 6 hours
  score_cache:           24 * 60 * 60 * 1000, // 24 hours
  recommendations_cache: 12 * 60 * 60 * 1000, // 12 hours
};

/**
 * Retrieve a cached AI response if it hasn't expired.
 */
const getCached = async (userId, type, cacheKey) => {
  const entry = await AIReport.findOne({
    userId,
    type,
    cacheKey,
    expiresAt: { $gt: new Date() },
  }).lean();
  return entry?.cachedResponse || null;
};

/**
 * Store an AI response in cache with the appropriate TTL.
 */
const setCache = async (userId, type, cacheKey, response) => {
  const ttl = TTL[type] || TTL.analysis_cache;
  const now = new Date();
  await AIReport.findOneAndUpdate(
    { userId, type, cacheKey },
    {
      userId,
      type,
      cacheKey,
      cachedResponse: response,
      expiresAt: new Date(Date.now() + ttl),
      generatedAt: now,
      period: { startDate: now, endDate: now },
    },
    { upsert: true }
  );
};

/**
 * Invalidate all cached AI responses for a user (called when new transaction is created).
 */
const invalidateUserCache = async (userId) => {
  await AIReport.deleteMany({
    userId,
    type: { $in: ['analysis_cache', 'score_cache', 'recommendations_cache'] },
  });
};

module.exports = { getCached, setCache, invalidateUserCache };
