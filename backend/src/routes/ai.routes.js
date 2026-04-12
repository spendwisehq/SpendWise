// backend/src/routes/ai.routes.js

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

module.exports = router;