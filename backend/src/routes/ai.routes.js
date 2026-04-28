// backend/src/routes/ai.routes.js
// STAGE 4: added GET /goal-coach

const express = require('express');
const router  = express.Router();

const {
  categorizeTransaction,
  getSpendingAnalysis,
  getInsights,
  getRecommendations,
  getFinancialScore,
  chatWithAI,
  chatWithAIStream,
  categorizeBatch,
  getGoalCoachPlan,   // STAGE 4
} = require('../controllers/ai.controller');

const { protect } = require('../middleware/auth.middleware');
const { userAiLimiter } = require('../middleware/rateLimiter');
const {
  categorizeValidator,
  categorizeBatchValidator,
  chatValidator,
  analysisValidator,
} = require('../middleware/validators/ai.validator');

// All AI routes are protected + per-user rate limited
router.use(protect);
router.use(userAiLimiter);

// Categorization
router.post('/categorize',       categorizeValidator,      categorizeTransaction);
router.post('/categorize-batch', categorizeBatchValidator,  categorizeBatch);

// Analysis + insights
router.get('/analysis',          analysisValidator,         getSpendingAnalysis);
router.get('/insights',          getInsights);
router.get('/recommendations',   getRecommendations);
router.get('/score',             getFinancialScore);

// Chat
router.post('/chat',             chatValidator,             chatWithAI);
router.post('/chat/stream',      chatValidator,             chatWithAIStream);

// STAGE 4 — AI Goal Coach
// GET /api/ai/goal-coach?goalName=Emergency+Fund&targetAmount=100000&currentSavings=30000&targetDate=2026-12-31
router.get('/goal-coach',        getGoalCoachPlan);

module.exports = router;