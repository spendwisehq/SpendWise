// backend/src/routes/transaction.routes.js
// STAGE 5: added /export/csv, /export/pdf, /wrapped

const express = require('express');
const router  = express.Router();

const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getStats,
  categorizeTransaction,
  // STAGE 5
  exportCSV,
  exportPDF,
  getWrappedData,
} = require('../controllers/transaction.controller');

const { protect } = require('../middleware/auth.middleware');
const {
  createTransactionValidator,
  updateTransactionValidator,
  getTransactionsValidator,
} = require('../middleware/validators/transaction.validator');

// All routes protected
router.use(protect);

// ── AI Categorization ──────────────────────────────────────────────────────
router.post('/categorize', categorizeTransaction);

// ── Stats + Summary ────────────────────────────────────────────────────────
router.get('/stats',   getStats);
router.get('/summary', getSummary);

// ── STAGE 5: Export routes (before /:id to avoid conflict) ────────────────
// GET /api/transactions/export/csv?month=4&year=2026   (or no params = all)
router.get('/export/csv', exportCSV);
// GET /api/transactions/export/pdf?month=4&year=2026
router.get('/export/pdf', exportPDF);
// GET /api/transactions/wrapped?year=2026
router.get('/wrapped', getWrappedData);

// ── CRUD ───────────────────────────────────────────────────────────────────
router.get('/',    ...getTransactionsValidator, getTransactions);
router.post('/',   ...createTransactionValidator, createTransaction);
router.get('/:id',    getTransaction);
router.put('/:id',    ...updateTransactionValidator, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;