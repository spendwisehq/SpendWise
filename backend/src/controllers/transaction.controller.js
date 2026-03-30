// backend/src/controllers/transaction.controller.js

const Transaction = require('../models/Transaction.model');
const Category    = require('../models/Category.model');
const Budget      = require('../models/Budget.model');

//─────────────────────────────────────
// HELPER — build filter query
//─────────────────────────────────────
const buildFilter = (userId, query) => {
  const filter = { userId, isDeleted: false };

  // Type filter
  if (query.type && ['expense', 'income', 'transfer'].includes(query.type)) {
    filter.type = query.type;
  }

  // Category filter
  if (query.categoryId) {
    filter.categoryId = query.categoryId;
  }

  // Payment method filter
  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }

  // Source filter
  if (query.source) {
    filter.source = query.source;
  }

  // Tags filter
  if (query.tags) {
    const tags = query.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length > 0) filter.tags = { $in: tags };
  }

  // Amount range
  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = parseFloat(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = parseFloat(query.maxAmount);
  }

  // Date range
  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  // Month + Year shortcut
  if (query.month && query.year) {
    const month = parseInt(query.month);
    const year  = parseInt(query.year);
    filter.date = {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

  // Search (merchant or description)
  if (query.search) {
    filter.$or = [
      { merchant:    { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { notes:       { $regex: query.search, $options: 'i' } },
    ];
  }

  return filter;
};

//─────────────────────────────────────
// HELPER — update budget spent
//─────────────────────────────────────
const syncBudget = async (userId, date, categoryId, amountDelta) => {
  try {
    const d     = new Date(date);
    const month = d.getMonth() + 1;
    const year  = d.getFullYear();

    const budget = await Budget.findOne({ userId, month, year });
    if (!budget) return;

    // Update total spent
    budget.totalSpent = Math.max(0, budget.totalSpent + amountDelta);

    // Update category spent
    if (categoryId) {
      const cat = budget.categories.find(
        c => c.categoryId?.toString() === categoryId.toString()
      );
      if (cat) {
        cat.spent = Math.max(0, cat.spent + amountDelta);
      }
    }

    // Update alerts
    const pct = budget.totalBudget > 0
      ? (budget.totalSpent / budget.totalBudget) * 100
      : 0;
    if (pct >= 50)  budget.alerts.at50Percent  = true;
    if (pct >= 80)  budget.alerts.at80Percent  = true;
    if (pct >= 100) budget.alerts.at100Percent = true;

    await budget.save();
  } catch (_) {
    // Budget sync is non-critical — don't fail transaction ops
  }
};

//─────────────────────────────────────
// POST /api/transactions
// Create transaction
//─────────────────────────────────────
const createTransaction = async (req, res, next) => {
  try {
    const {
      type, amount, currency, merchant, description,
      categoryId, date, paymentMethod, tags, notes, source,
    } = req.body;

    // Resolve category name
    let categoryName = 'Uncategorized';
    let resolvedCategoryId = categoryId || null;

    if (categoryId) {
      const category = await Category.findOne({
        _id: categoryId,
        $or: [{ userId: req.user._id }, { isSystem: true }],
      });
      if (category) {
        categoryName      = category.name;
        resolvedCategoryId = category._id;
      }
    }

    const transaction = await Transaction.create({
      userId:        req.user._id,
      type,
      amount,
      currency:      currency      || req.user.currency || 'INR',
      merchant:      merchant      || null,
      description:   description   || null,
      categoryId:    resolvedCategoryId,
      categoryName,
      date:          date          || new Date(),
      paymentMethod: paymentMethod || 'other',
      source:        source        || 'manual',
      tags:          tags          || [],
      notes:         notes         || null,
    });

    // Sync budget for expenses
    if (type === 'expense' && resolvedCategoryId) {
      await syncBudget(req.user._id, transaction.date, resolvedCategoryId, amount);
    }

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully.',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/transactions
// List with filter + pagination + sort
//─────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const skip  = (page - 1) * limit;

    // Sort
    const sortField   = ['date', 'amount', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy : 'date';
    const sortOrder   = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort        = { [sortField]: sortOrder };

    const filter = buildFilter(req.user._id, req.query);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('categoryId', 'name icon color')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext:    page < Math.ceil(total / limit),
          hasPrev:    page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/transactions/:id
// Get single transaction
//─────────────────────────────────────
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    }).populate('categoryId', 'name icon color');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// PUT /api/transactions/:id
// Update transaction
//─────────────────────────────────────
const updateTransaction = async (req, res, next) => {
  try {
    const existing = await Transaction.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    const allowed = [
      'type', 'amount', 'currency', 'merchant', 'description',
      'categoryId', 'date', 'paymentMethod', 'tags', 'notes',
    ];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Resolve category name if categoryId changed
    if (updates.categoryId) {
      const category = await Category.findOne({
        _id: updates.categoryId,
        $or: [{ userId: req.user._id }, { isSystem: true }],
      });
      if (category) {
        updates.categoryName = category.name;
      }
    }

    // Reverse old budget impact, apply new
    if (existing.type === 'expense') {
      await syncBudget(req.user._id, existing.date, existing.categoryId, -existing.amount);
    }

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('categoryId', 'name icon color');

    if (transaction.type === 'expense') {
      await syncBudget(req.user._id, transaction.date, transaction.categoryId, transaction.amount);
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully.',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// DELETE /api/transactions/:id
// Soft delete
//─────────────────────────────────────
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found.',
      });
    }

    await transaction.softDelete();

    // Reverse budget impact
    if (transaction.type === 'expense') {
      await syncBudget(req.user._id, transaction.date, transaction.categoryId, -transaction.amount);
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/transactions/summary
// Totals + breakdown for a period
//─────────────────────────────────────
const getSummary = async (req, res, next) => {
  try {
    // Default: current month
    const now   = new Date();
    const month = parseInt(req.query.month || now.getMonth() + 1);
    const year  = parseInt(req.query.year  || now.getFullYear());

    const filter = {
      userId:    req.user._id,
      isDeleted: false,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59, 999),
      },
    };

    const [summary] = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id:            null,
          totalIncome:    { $sum: { $cond: [{ $eq: ['$type', 'income']  }, '$amount', 0] } },
          totalExpense:   { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          totalTransfer:  { $sum: { $cond: [{ $eq: ['$type', 'transfer']}, '$amount', 0] } },
          count:          { $sum: 1 },
          avgTransaction: { $avg: '$amount' },
        },
      },
      {
        $project: {
          _id:           0,
          totalIncome:   1,
          totalExpense:  1,
          totalTransfer: 1,
          count:         1,
          avgTransaction: { $round: ['$avgTransaction', 2] },
          netSavings:    { $subtract: ['$totalIncome', '$totalExpense'] },
        },
      },
    ]);

    // Category breakdown
    const breakdown = await Transaction.aggregate([
      { $match: { ...filter, type: 'expense' } },
      {
        $group: {
          _id:          '$categoryName',
          total:        { $sum: '$amount' },
          count:        { $sum: 1 },
          categoryId:   { $first: '$categoryId' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    // Daily trend (for chart)
    const dailyTrend = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id:     { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          income:  { $sum: { $cond: [{ $eq: ['$type', 'income']  }, '$amount', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        period: { month, year },
        summary: summary || {
          totalIncome: 0, totalExpense: 0, totalTransfer: 0,
          count: 0, avgTransaction: 0, netSavings: 0,
        },
        categoryBreakdown: breakdown,
        dailyTrend,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/transactions/stats
// Overall stats for dashboard
//─────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const now          = new Date();
    const thisMonth    = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const baseFilter = { userId: req.user._id, isDeleted: false };

    const [thisMonthStats, lastMonthStats, recentTransactions] = await Promise.all([
      // This month
      Transaction.aggregate([
        { $match: { ...baseFilter, date: thisMonth } },
        {
          $group: {
            _id:          null,
            totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            totalIncome:  { $sum: { $cond: [{ $eq: ['$type', 'income']  }, '$amount', 0] } },
            count:        { $sum: 1 },
          },
        },
      ]),
      // Last month
      Transaction.aggregate([
        { $match: { ...baseFilter, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        {
          $group: {
            _id:          null,
            totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            totalIncome:  { $sum: { $cond: [{ $eq: ['$type', 'income']  }, '$amount', 0] } },
          },
        },
      ]),
      // Recent 5
      Transaction.find(baseFilter)
        .populate('categoryId', 'name icon color')
        .sort({ date: -1 })
        .limit(5)
        .lean(),
    ]);

    const current  = thisMonthStats[0]  || { totalExpense: 0, totalIncome: 0, count: 0 };
    const previous = lastMonthStats[0]  || { totalExpense: 0, totalIncome: 0 };

    const expenseChange = previous.totalExpense > 0
      ? (((current.totalExpense - previous.totalExpense) / previous.totalExpense) * 100).toFixed(1)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        thisMonth: {
          totalExpense:  current.totalExpense,
          totalIncome:   current.totalIncome,
          netSavings:    current.totalIncome - current.totalExpense,
          transactionCount: current.count,
        },
        comparison: {
          expenseChange:  parseFloat(expenseChange),
          expenseTrend:   current.totalExpense > previous.totalExpense ? 'up' : 'down',
        },
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getStats,
};