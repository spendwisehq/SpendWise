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
  categorizeBatch,
  getGoalCoachPlan,   // STAGE 4
} = require('../controllers/ai.controller');

const { protect } = require('../middleware/auth.middleware');

router.use(protect);

// Categorization
router.post('/categorize',       categorizeTransaction);
router.post('/categorize-batch', categorizeBatch);

// Analysis + insights
router.get('/analysis',          getSpendingAnalysis);
router.get('/insights',          getInsights);
router.get('/recommendations',   getRecommendations);
router.get('/score',             getFinancialScore);

// Chat
router.post('/chat',             chatWithAI);

// STAGE 4 — AI Goal Coach
// GET /api/ai/goal-coach?goalName=Emergency+Fund&targetAmount=100000&currentSavings=30000&targetDate=2026-12-31
router.get('/goal-coach',        getGoalCoachPlan);

module.exports = router;