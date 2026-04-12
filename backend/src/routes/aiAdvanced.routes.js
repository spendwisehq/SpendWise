// backend/src/routes/aiAdvanced.routes.js

const express = require('express');
const router  = express.Router();

const {
  predictBudget,
  detectAnomalies,
  detectSubscriptions,
  spendingForecast,
  scoreHistory,
  listSubscriptions,
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

module.exports = router;