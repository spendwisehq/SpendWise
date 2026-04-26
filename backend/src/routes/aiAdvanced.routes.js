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

router.use(protect);

router.get('/predict-budget',     predictBudget);
router.get('/anomalies',          detectAnomalies);
router.get('/subscriptions',      detectSubscriptions);
router.get('/subscriptions/list', listSubscriptions);
router.get('/forecast',           spendingForecast);
router.get('/score-history',      scoreHistory);

// STAGE 4 — Feature 3: Tax Deduction Identifier
// GET /api/ai/advanced/tax-deductions
router.get('/tax-deductions',     getTaxDeductions);

// STAGE 4 — Feature 4: Bill Negotiation Suggester
// GET /api/ai/advanced/negotiate
router.get('/negotiate',          getBillNegotiationSuggestions);

module.exports = router;