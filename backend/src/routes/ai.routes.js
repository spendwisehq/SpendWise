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
  categorizeBatch,
} = require('../controllers/ai.controller');

const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// All AI routes are protected
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

module.exports = router;