// backend/src/routes/transaction.routes.js

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
} = require('../controllers/transaction.controller');

const { protect } = require('../middleware/auth.middleware');
const {
  createTransactionValidator,
  updateTransactionValidator,
  getTransactionsValidator,
} = require('../middleware/validators/transaction.validator');

// All transaction routes are protected
router.use(protect);

// Stats + summary (before /:id to avoid conflict)
router.get('/stats',   getStats);
router.get('/summary', getSummary);

// CRUD
router.get('/',    ...getTransactionsValidator, getTransactions);
router.post('/',   ...createTransactionValidator, createTransaction);
router.get('/:id',    getTransaction);
router.put('/:id',    ...updateTransactionValidator, updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;