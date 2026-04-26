// backend/src/routes/aiAdvanced.routes.js
// STAGE 4: added /tax-deductions and /negotiate routes

const express = require('express');
const router  = express.Router();

const {
  predictBudget,
  detectAnomalies,
  detectSubscriptions,
  spendingForecast,
  scoreHistory,
  listSubscriptions,
  getTaxDeductions,             // STAGE 4
  getBillNegotiationSuggestions, // STAGE 4
} = require('../controllers/aiAdvanced.controller');

const { protect } = require('../middleware/auth.middleware');
const { userAiLimiter } = require('../middleware/rateLimiter');
const { analysisValidator, forecastValidator } = require('../middleware/validators/ai.validator');

router.use(protect);
router.use(userAiLimiter);

router.get('/predict-budget',       analysisValidator,   predictBudget);
router.get('/anomalies',            analysisValidator,   detectAnomalies);
router.get('/subscriptions',        detectSubscriptions);
router.get('/subscriptions/list',   listSubscriptions);
router.get('/forecast',             forecastValidator,   spendingForecast);
router.get('/score-history',        scoreHistory);
router.get('/tax-deductions',       getTaxDeductions);
router.get('/negotiate',            getBillNegotiationSuggestions);

module.exports = router;