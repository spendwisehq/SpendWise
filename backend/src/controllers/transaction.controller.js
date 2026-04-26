// backend/src/controllers/transaction.controller.js
// STAGE 5 ADDITIONS:
//   exportCSV       — Feature 3: CSV Export
//   exportPDF       — Feature 2: PDF Export (pdfkit)
//   getWrappedData  — Feature 4: Annual Spending Wrapped

const Transaction = require('../models/Transaction.model');
const Category    = require('../models/Category.model');
const Budget      = require('../models/Budget.model');
const { invalidateUserCache } = require('../services/aiCache.service');
const { askClaudeJSON }       = require('../services/groq.service');
const { fireWebhook }         = require('../services/webhook.service');

//─────────────────────────────────────
// HELPER — build filter query
//─────────────────────────────────────
const buildFilter = (userId, query) => {
  const filter = { userId, isDeleted: false };

  if (query.type && ['expense', 'income', 'transfer'].includes(query.type)) {
    filter.type = query.type;
  }
  if (query.categoryId)     filter.categoryId    = query.categoryId;
  if (query.paymentMethod)  filter.paymentMethod = query.paymentMethod;
  if (query.source)         filter.source        = query.source;

  if (query.tags) {
    const tags = query.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length > 0) filter.tags = { $in: tags };
  }

  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = parseFloat(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = parseFloat(query.maxAmount);
  }

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (query.month && query.year) {
    const month = parseInt(query.month);
    const year  = parseInt(query.year);
    filter.date = {
      $gte: new Date(year, month - 1, 1),
      $lte: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }

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

    budget.totalSpent = Math.max(0, budget.totalSpent + amountDelta);

    if (categoryId) {
      const cat = budget.categories.find(
        c => c.categoryId?.toString() === categoryId.toString()
      );
      if (cat) cat.spent = Math.max(0, cat.spent + amountDelta);
    }

    const pct = budget.totalBudget > 0
      ? (budget.totalSpent / budget.totalBudget) * 100 : 0;
    if (pct >= 50)  budget.alerts.at50Percent  = true;
    if (pct >= 80)  budget.alerts.at80Percent  = true;
    if (pct >= 100) budget.alerts.at100Percent = true;

    await budget.save();
  } catch (_) {}
};

//─────────────────────────────────────
// POST /api/transactions/categorize
//─────────────────────────────────────
const categorizeTransaction = async (req, res, next) => {
  try {
    const { name, type = 'expense' } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Transaction name is required (min 2 characters).',
      });
    }

    const systemPrompt = `You are a financial transaction categorizer for Indian users.
Given a transaction name and type, respond with ONLY a valid JSON object — no markdown, no explanation.
Format: {"category": "<category>", "confidence": <0.0-1.0>}

Valid categories ONLY:
- Uncategorized
- Education
- Entertainment
- Food & Dining
- Groceries
- Health & Medical
- Investment
- Other
- Personal Care
- Rent & Housing
- Shopping
- Transportation
- Travel
- Utilities
- Salary
- Freelance

Rules:
- For income type: prefer Salary, Freelance, Investment, Other
- Indian brands: Swiggy/Zomato/Blinkit=Food & Dining, Ola/Uber/Metro=Transportation,
  Myntra/Amazon/Flipkart/Meesho=Shopping, BYJU/Unacademy/Coursera=Education,
  Apollo/Medplus/1mg/Pharmeasy=Health & Medical, Netflix/Hotstar/Spotify/PrimeVideo=Entertainment,
  BigBasket/JioMart/DMart=Groceries, MakeMyTrip/Goibibo/Airbnb=Travel,
  Electricity/Gas/Water/Jio/Airtel/BSNL=Utilities, Zerodha/Groww/Upstox=Investment,
  Gym/Salon/Spa=Personal Care, Rent/PG/Society=Rent & Housing
- confidence: 0.95 for well-known brands, 0.7-0.85 for partial matches, 0.5 for guesses`;

    const userPrompt = `Transaction name: "${name.trim()}", Type: ${type}`;
    const result     = await askClaudeJSON(systemPrompt, userPrompt, 150);

    const VALID_CATEGORIES = [
      'Uncategorized','Education','Entertainment','Food & Dining','Groceries',
      'Health & Medical','Investment','Other','Personal Care','Rent & Housing',
      'Shopping','Transportation','Travel','Utilities','Salary','Freelance',
    ];

    const category   = VALID_CATEGORIES.includes(result.category) ? result.category : 'Uncategorized';
    const confidence = typeof result.confidence === 'number'
      ? Math.min(1, Math.max(0, result.confidence)) : 0.7;

    return res.status(200).json({ success: true, data: { category, confidence } });
  } catch (error) {
    return res.status(200).json({ success: true, data: { category: 'Uncategorized', confidence: 0 } });
  }
};

//─────────────────────────────────────
// POST /api/transactions
//─────────────────────────────────────
const createTransaction = async (req, res, next) => {
  try {
    const {
      type, amount, currency, merchant, description,
      categoryId, categoryName: incomingCategoryName,
      date, paymentMethod, tags, notes, source,
    } = req.body;

    let categoryName       = incomingCategoryName || 'Uncategorized';
    let resolvedCategoryId = categoryId || null;

    if (categoryId) {
      const category = await Category.findOne({
        _id: categoryId,
        $or: [{ userId: req.user._id }, { isSystem: true }],
      });
      if (category) {
        categoryName       = category.name;
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

    fireWebhook(req.user._id, 'transaction.created', {
  id:          transaction._id,
  type:        transaction.type,
  amount:      transaction.amount,
  currency:    transaction.currency,
  merchant:    transaction.merchant,
  description: transaction.description,
  categoryName:transaction.categoryName,
  date:        transaction.date,
});

    if (type === 'expense' && resolvedCategoryId) {
      await syncBudget(req.user._id, transaction.date, resolvedCategoryId, amount);
    }

    // Invalidate AI cache so next analysis reflects new data
    await invalidateUserCache(req.user._id);

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
//─────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const skip  = (page - 1) * limit;

    const sortField = ['date', 'amount', 'createdAt'].includes(req.query.sortBy)
      ? req.query.sortBy : 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort      = { [sortField]: sortOrder };

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
//─────────────────────────────────────
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    }).populate('categoryId', 'name icon color');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    return res.status(200).json({ success: true, data: { transaction } });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// PUT /api/transactions/:id
//─────────────────────────────────────
const updateTransaction = async (req, res, next) => {
  try {
    const existing = await Transaction.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const allowed = [
      'type', 'amount', 'currency', 'merchant', 'description',
      'categoryId', 'categoryName', 'date', 'paymentMethod', 'tags', 'notes',
    ];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.categoryId) {
      const category = await Category.findOne({
        _id: updates.categoryId,
        $or: [{ userId: req.user._id }, { isSystem: true }],
      });
      if (category) updates.categoryName = category.name;
    }

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
//─────────────────────────────────────
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    await transaction.softDelete();

    if (transaction.type === 'expense') {
      await syncBudget(req.user._id, transaction.date, transaction.categoryId, -transaction.amount);
    }

    return res.status(200).json({ success: true, message: 'Transaction deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/transactions/summary
//─────────────────────────────────────
const getSummary = async (req, res, next) => {
  try {
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
          totalIncome:    { $sum: { $cond: [{ $eq: ['$type', 'income']   }, '$amount', 0] } },
          totalExpense:   { $sum: { $cond: [{ $eq: ['$type', 'expense']  }, '$amount', 0] } },
          totalTransfer:  { $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$amount', 0] } },
          count:          { $sum: 1 },
          avgTransaction: { $avg: '$amount' },
        },
      },
      {
        $project: {
          _id: 0, totalIncome: 1, totalExpense: 1, totalTransfer: 1, count: 1,
          avgTransaction: { $round: ['$avgTransaction', 2] },
          netSavings: { $subtract: ['$totalIncome', '$totalExpense'] },
        },
      },
    ]);

    const breakdown = await Transaction.aggregate([
      { $match: { ...filter, type: 'expense' } },
      {
        $group: {
          _id:        '$categoryName',
          total:      { $sum: '$amount' },
          count:      { $sum: 1 },
          categoryId: { $first: '$categoryId' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

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
//─────────────────────────────────────
const getStats = async (req, res, next) => {
  try {
    const now             = new Date();
    const thisMonth       = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    const lastMonthStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const baseFilter      = { userId: req.user._id, isDeleted: false };

    const [thisMonthStats, lastMonthStats, recentTransactions] = await Promise.all([
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
          totalExpense:     current.totalExpense,
          totalIncome:      current.totalIncome,
          netSavings:       current.totalIncome - current.totalExpense,
          transactionCount: current.count,
        },
        comparison: {
          expenseChange: parseFloat(expenseChange),
          expenseTrend:  current.totalExpense > previous.totalExpense ? 'up' : 'down',
        },
        recentTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 5 — Feature 3: CSV Export
// GET /api/transactions/export/csv?month=4&year=2026
// Streams a downloadable CSV of all transactions in the selected period.
// If no month/year given, exports ALL transactions.
// ─────────────────────────────────────────────────────────────────────────────
const exportCSV = async (req, res, next) => {
  try {
    const filter = buildFilter(req.user._id, req.query);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .lean();

    // Build filename
    const periodLabel = req.query.month && req.query.year
      ? `${req.query.year}-${String(req.query.month).padStart(2, '0')}`
      : 'all';
    const filename = `SpendWise_Transactions_${periodLabel}.csv`;

    // CSV Header
    const headers = [
      'Date', 'Type', 'Merchant / Description', 'Category',
      'Amount (₹)', 'Payment Method', 'Notes', 'Source',
    ];

    // CSV rows
    const rows = transactions.map(t => {
      const date    = new Date(t.date).toLocaleDateString('en-IN');
      const name    = (t.merchant || t.description || '').replace(/,/g, ' ');
      const notes   = (t.notes   || '').replace(/,/g, ' ');
      return [
        date,
        t.type,
        name,
        t.categoryName || 'Uncategorized',
        t.amount.toFixed(2),
        t.paymentMethod || 'other',
        notes,
        t.source || 'manual',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 5 — Feature 2: PDF Export
// GET /api/transactions/export/pdf?month=4&year=2026
// Generates a polished monthly statement PDF using pdfkit.
// Install: npm install pdfkit
// ─────────────────────────────────────────────────────────────────────────────
const exportPDF = async (req, res, next) => {
  try {
    const now   = new Date();
    const month = parseInt(req.query.month || now.getMonth() + 1);
    const year  = parseInt(req.query.year  || now.getFullYear());

    const filter = buildFilter(req.user._id, { ...req.query, month, year });
    const transactions = await Transaction.find(filter).sort({ date: 1 }).lean();

    const User = require('../models/User.model');
    const user = await User.findById(req.user._id).lean();

    // Aggregates
    const totalIncome  = transactions.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netSavings   = totalIncome - totalExpense;

    // Category breakdown
    const byCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const k = t.categoryName || 'Uncategorized';
      byCategory[k] = (byCategory[k] || 0) + t.amount;
    });

    const monthName = new Date(year, month - 1, 1)
      .toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const filename  = `SpendWise_Statement_${year}-${String(month).padStart(2, '0')}.pdf`;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Brand header ─────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill('#1D9E75');
    doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
       .text('SpendWise', 50, 22);
    doc.fontSize(11).font('Helvetica')
       .text('AI-Powered Personal Finance', 50, 48);
    doc.fontSize(11).text(`Monthly Statement — ${monthName}`, 0, 30, { align: 'right' });
    doc.moveDown(3);

    // ── User info ─────────────────────────────────────────────────────────────
    doc.fillColor('#1A1A1A').fontSize(13).font('Helvetica-Bold')
       .text(`Statement for: ${user.name}`);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
       .text(`Email: ${user.email}`)
       .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`);
    doc.moveDown(1);

    // ── Summary boxes ─────────────────────────────────────────────────────────
    const drawBox = (x, y, w, h, bg, label, value, valColor) => {
      doc.rect(x, y, w, h).fill(bg);
      doc.fillColor('#555555').fontSize(9).font('Helvetica')
         .text(label, x + 10, y + 10, { width: w - 20 });
      doc.fillColor(valColor || '#1A1A1A').fontSize(16).font('Helvetica-Bold')
         .text(`₹${Math.abs(value).toLocaleString('en-IN')}`, x + 10, y + 26, { width: w - 20 });
    };

    const boxY = doc.y + 10;
    drawBox(50,  boxY, 150, 65, '#E8F8F2', 'Total Income',  totalIncome,  '#1D9E75');
    drawBox(215, boxY, 150, 65, '#FEF0EE', 'Total Expense', totalExpense, '#E85D24');
    drawBox(380, boxY, 165, 65,
      netSavings >= 0 ? '#EEF4FE' : '#FEF0EE',
      'Net Savings', netSavings,
      netSavings >= 0 ? '#378ADD' : '#E85D24');

    doc.y = boxY + 80;

    // ── Category breakdown ────────────────────────────────────────────────────
    if (Object.keys(byCategory).length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1A1A1A')
         .text('Spending by Category');
      doc.moveDown(0.5);

      const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      sorted.forEach(([cat, amt]) => {
        const barW = Math.min(300, (amt / totalExpense) * 300);
        doc.fontSize(10).font('Helvetica').fillColor('#333333').text(cat, 50, doc.y, { continued: true, width: 180 });
        doc.fillColor('#1D9E75').text(`₹${amt.toLocaleString('en-IN')}`, { align: 'right', width: 495 });
        doc.rect(50, doc.y, barW, 5).fill('#1D9E7533');
        doc.moveDown(0.8);
      });
      doc.moveDown(0.5);
    }

    // ── Transactions table ────────────────────────────────────────────────────
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1A1A1A')
       .text('Transaction Details');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    doc.rect(50, tableTop, 495, 22).fill('#F0F0F0');
    doc.fillColor('#555555').fontSize(9).font('Helvetica-Bold');
    doc.text('Date',      55,  tableTop + 6, { width: 65 });
    doc.text('Merchant',  120, tableTop + 6, { width: 150 });
    doc.text('Category',  270, tableTop + 6, { width: 100 });
    doc.text('Type',      370, tableTop + 6, { width: 55 });
    doc.text('Amount',    425, tableTop + 6, { width: 115, align: 'right' });

    doc.y = tableTop + 26;

    // Table rows
    transactions.forEach((t, i) => {
      if (doc.y > 720) { doc.addPage(); }

      const rowY = doc.y;
      if (i % 2 === 0) doc.rect(50, rowY - 2, 495, 18).fill('#FAFAFA');

      const date    = new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      const name    = (t.merchant || t.description || '—').slice(0, 30);
      const cat     = (t.categoryName || 'Uncategorized').slice(0, 18);
      const color   = t.type === 'income' ? '#1D9E75' : t.type === 'expense' ? '#E85D24' : '#378ADD';
      const sign    = t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '';

      doc.fillColor('#333333').fontSize(9).font('Helvetica');
      doc.text(date,  55,  rowY, { width: 65 });
      doc.text(name,  120, rowY, { width: 145 });
      doc.text(cat,   270, rowY, { width: 95 });
      doc.fillColor(color).text(t.type, 370, rowY, { width: 55 });
      doc.text(`${sign}₹${t.amount.toLocaleString('en-IN')}`, 425, rowY, { width: 115, align: 'right' });

      doc.y = rowY + 18;
    });

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#AAAAAA').font('Helvetica')
       .text(
         `SpendWise — AI-Powered Personal Finance | Generated ${new Date().toISOString()} | ${transactions.length} transactions`,
         50, doc.y, { align: 'center', width: 495 }
       );

    doc.end();
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 5 — Feature 4: Annual Spending Wrapped data
// GET /api/transactions/wrapped?year=2026
// Returns aggregated annual stats for the Wrapped card.
// ─────────────────────────────────────────────────────────────────────────────
const getWrappedData = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year || new Date().getFullYear());

    const filter = {
      userId:    req.user._id,
      isDeleted: false,
      date: {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31, 23, 59, 59),
      },
    };

    const transactions = await Transaction.find(filter).lean();

    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { wrapped: null, message: 'No transactions found for this year.' },
      });
    }

    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes  = transactions.filter(t => t.type === 'income');

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome  = incomes.reduce((s,  t) => s + t.amount, 0);
    const savingsRate  = totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

    // Biggest category
    const byCategory = {};
    expenses.forEach(t => {
      const k = t.categoryName || 'Uncategorized';
      byCategory[k] = (byCategory[k] || 0) + t.amount;
    });
    const biggestCategory = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])[0];

    // Most used merchant
    const byMerchant = {};
    transactions.forEach(t => {
      if (t.merchant) byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + 1;
    });
    const topMerchant = Object.entries(byMerchant)
      .sort((a, b) => b[1] - a[1])[0];

    // Most expensive single transaction
    const mostExpensive = expenses.sort((a, b) => b.amount - a.amount)[0];

    // Best saving month
    const monthlyData = {};
    transactions.forEach(t => {
      const m = new Date(t.date).getMonth();
      if (!monthlyData[m]) monthlyData[m] = { income: 0, expense: 0 };
      if (t.type === 'income')  monthlyData[m].income  += t.amount;
      if (t.type === 'expense') monthlyData[m].expense += t.amount;
    });
    const bestMonth = Object.entries(monthlyData)
      .map(([m, d]) => ({ month: parseInt(m), savings: d.income - d.expense }))
      .sort((a, b) => b.savings - a.savings)[0];

    const bestMonthName = bestMonth
      ? new Date(year, bestMonth.month, 1).toLocaleString('en-IN', { month: 'long' })
      : null;

    // Daily average spend
    const daysInYear   = 365;
    const dailyAverage = Math.round(totalExpense / daysInYear);

    // Transaction streaks
    const txDates = [...new Set(
      transactions.map(t => new Date(t.date).toDateString())
    )].length;

    const User = require('../models/User.model');
    const user = await User.findById(req.user._id).lean();

    return res.status(200).json({
      success: true,
      data: {
        wrapped: {
          year,
          userName:       user.name,
          totalExpense,
          totalIncome,
          savingsRate,
          transactionCount: transactions.length,
          activeDays:       txDates,
          dailyAverage,
          biggestCategory:  biggestCategory
            ? { name: biggestCategory[0], amount: biggestCategory[1] } : null,
          topMerchant:      topMerchant
            ? { name: topMerchant[0], count: topMerchant[1] } : null,
          mostExpensive:    mostExpensive
            ? { merchant: mostExpensive.merchant || mostExpensive.description, amount: mostExpensive.amount, category: mostExpensive.categoryName } : null,
          bestSavingMonth:  bestMonthName
            ? { name: bestMonthName, savings: bestMonth.savings } : null,
          financialScore:   user.financialScore?.score || null,
          scoreGrade:       user.financialScore?.grade || null,
        },
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
  categorizeTransaction,
  // STAGE 5
  exportCSV,
  exportPDF,
  getWrappedData,
};