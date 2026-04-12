// backend/src/services/tokenTracking.service.js

const TokenUsage = require('../models/TokenUsage.model');

/**
 * Increment token usage counters for a user in the current month.
 * Non-critical — failures are silently swallowed.
 */
const trackTokens = async (userId, usage) => {
  if (!usage || !userId) return;
  const now = new Date();
  try {
    await TokenUsage.findOneAndUpdate(
      { userId, month: now.getMonth() + 1, year: now.getFullYear() },
      {
        $inc: {
          promptTokens:     usage.prompt_tokens     || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens:      usage.total_tokens      || 0,
          requestCount:     1,
        },
      },
      { upsert: true }
    );
  } catch { /* non-critical */ }
};

module.exports = { trackTokens };
