// backend/src/controllers/ai.controller.js

const { askLLM, askLLMJSON, askLLMStream, FALLBACK_MODEL } = require('../services/groq.service');
const { trackTokens }        = require('../services/tokenTracking.service');
const { getCached, setCache } = require('../services/aiCache.service');
const { sanitizeInput }       = require('../utils/sanitize');
const { categorize, categorizeBatch }     = require('../prompts/categorize');
const { spendingAnalysis }                = require('../prompts/analysis');
const { insights: insightsPrompt, recommendations: recommendationsPrompt, financialScore: scorePrompt } = require('../prompts/insights');
const { chat: chatPrompt }               = require('../prompts/chat');
const Transaction = require('../models/Transaction.model');
const Category    = require('../models/Category.model');
const User        = require('../models/User.model');

//─────────────────────────────────────
// HELPER — fetch user's recent data
//─────────────────────────────────────
const getUserFinancialData = async (userId, months = 3) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const [transactions, categories, user] = await Promise.all([
    Transaction.find({
      userId,
      isDeleted: false,
      date: { $gte: since },
    }).sort({ date: -1 }).limit(200).lean(),
    Category.find({
      $or: [{ isSystem: true }, { userId }],
      isActive: true,
    }).lean(),
    User.findById(userId).lean(),
  ]);

  const categoryTotals = {};
  transactions.forEach(t => {
    if (t.type === 'expense') {
      const key = t.categoryName || 'Uncategorized';
      categoryTotals[key] = (categoryTotals[key] || 0) + t.amount;
    }
  });

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  return { transactions, categories, user, categoryTotals, totalExpense, totalIncome, currency: user?.currency || 'INR' };
};

//─────────────────────────────────────
// 1. POST /api/ai/categorize
//─────────────────────────────────────
const categorizeTransaction = async (req, res, next) => {
  try {
    const { merchant, description, amount, type } = req.body;

    if (!merchant && !description) {
      return res.status(400).json({ success: false, message: 'merchant or description is required.' });
    }

    const categories = await Category.find({
      isActive: true,
      $or: [{ isSystem: true }, { userId: req.user._id }],
    }).lean();

    const categoryList = categories
      .map(c => `${c.name} (${c.type}) — keywords: ${c.keywords.join(', ')}`)
      .join('\n');

    const prompts = categorize({
      merchant: sanitizeInput(merchant, 200),
      description: sanitizeInput(description, 500),
      amount,
      type,
      categoryList,
    });

    const { data: result, usage } = await askLLMJSON(prompts.system, prompts.user, { model: FALLBACK_MODEL });
    await trackTokens(req.user._id, usage);

    const matched = categories.find(
      c => c.name.toLowerCase() === result.categoryName?.toLowerCase()
    );

    return res.status(200).json({
      success: true,
      data: {
        categoryId:    matched?._id   || null,
        categoryName:  matched?.name  || result.categoryName || 'Uncategorized',
        categoryIcon:  matched?.icon  || '📦',
        categoryColor: matched?.color || '#888780',
        confidence:    result.confidence,
        reason:        result.reason,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 2. GET /api/ai/analysis
//─────────────────────────────────────
const getSpendingAnalysis = async (req, res, next) => {
  try {
    const month = parseInt(req.query.month || new Date().getMonth() + 1);
    const year  = parseInt(req.query.year  || new Date().getFullYear());

    // Check cache
    const cacheKey = `analysis:${month}:${year}`;
    const cached = await getCached(req.user._id, 'analysis_cache', cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      userId: req.user._id, isDeleted: false,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: { analysis: null, message: 'No transactions found for this period.' },
      });
    }

    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const totalIncome  = transactions.filter(t => t.type === 'income' ).reduce((s, t) => s + t.amount, 0);

    const byCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      const k = t.categoryName || 'Uncategorized';
      byCategory[k] = (byCategory[k] || 0) + t.amount;
    });

    const user = await User.findById(req.user._id).lean();

    const prompts = spendingAnalysis({
      userName: user.name,
      monthlyIncome: user.monthlyIncome || 0,
      month, year,
      totalExpense: Math.round(totalExpense),
      totalIncome: Math.round(totalIncome),
      transactionCount: transactions.length,
      byCategory,
    });

    const { data: analysis, usage } = await askLLMJSON(prompts.system, prompts.user, { maxTokens: 1024 });
    await trackTokens(req.user._id, usage);

    const responseData = {
      period: { month, year },
      totals: { totalExpense, totalIncome, netSavings: totalIncome - totalExpense },
      byCategory,
      analysis,
    };

    await setCache(req.user._id, 'analysis_cache', cacheKey, responseData);

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 3. GET /api/ai/insights
//─────────────────────────────────────
const getInsights = async (req, res, next) => {
  try {
    const { transactions, categoryTotals, totalExpense, totalIncome, user, currency } =
      await getUserFinancialData(req.user._id, 3);

    if (transactions.length < 3) {
      return res.status(200).json({
        success: true,
        data: { insights: [], message: 'Add more transactions to get personalized insights.' },
      });
    }

    const merchantCounts = {};
    transactions.forEach(t => {
      if (t.merchant) merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
    });
    const topMerchants = Object.entries(merchantCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count}x)`)
      .join(', ');

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k, v]) => `- ${k}: ₹${v.toFixed(0)}`)
      .join('\n');

    const prompts = insightsPrompt({
      userName: user.name,
      monthlyIncome: user.monthlyIncome || 0,
      currency,
      totalExpense: Math.round(totalExpense),
      totalIncome: Math.round(totalIncome),
      transactionCount: transactions.length,
      topCategories,
      topMerchants,
    });

    const { data: insights, usage } = await askLLMJSON(prompts.system, prompts.user, { maxTokens: 1500 });
    await trackTokens(req.user._id, usage);

    return res.status(200).json({
      success: true,
      data: { insights: Array.isArray(insights) ? insights : [] },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 4. GET /api/ai/recommendations
//─────────────────────────────────────
const getRecommendations = async (req, res, next) => {
  try {
    // Check cache
    const cacheKey = 'recommendations';
    const cached = await getCached(req.user._id, 'recommendations_cache', cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const { transactions, categoryTotals, totalExpense, totalIncome, user, currency } =
      await getUserFinancialData(req.user._id, 2);

    if (transactions.length < 5) {
      return res.status(200).json({
        success: true,
        data: { recommendations: [], message: 'Add more transactions to get recommendations.' },
      });
    }

    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : '0';

    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${k}: ₹${v.toFixed(0)}`)
      .join('\n');

    const prompts = recommendationsPrompt({
      userName: user.name,
      monthlyIncome: user.monthlyIncome,
      plan: user.plan,
      currency,
      totalExpense: Math.round(totalExpense),
      totalIncome: Math.round(totalIncome),
      savings: Math.round(totalIncome - totalExpense),
      savingsRate,
      categoryBreakdown,
    });

    const { data: recs, usage } = await askLLMJSON(prompts.system, prompts.user, { maxTokens: 1500 });
    await trackTokens(req.user._id, usage);

    const responseData = {
      recommendations: Array.isArray(recs) ? recs : [],
      basedOn: {
        months: 2,
        transactions: transactions.length,
        totalExpense,
        totalIncome,
      },
    };

    await setCache(req.user._id, 'recommendations_cache', cacheKey, responseData);

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 5. GET /api/ai/score
//─────────────────────────────────────
const getFinancialScore = async (req, res, next) => {
  try {
    // Check cache
    const cacheKey = 'score';
    const cached = await getCached(req.user._id, 'score_cache', cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const { transactions, categoryTotals, totalExpense, totalIncome, user } =
      await getUserFinancialData(req.user._id, 3);

    if (transactions.length < 5) {
      return res.status(200).json({
        success: true,
        data: { score: null, message: 'Add at least 5 transactions to calculate your financial score.' },
      });
    }

    const savingsRate     = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    const monthlyIncome   = user?.monthlyIncome || 0;
    const avgMonthlySpend = totalExpense / 3;

    const essentialCategories = ['Food & Dining', 'Groceries', 'Rent & Housing', 'Utilities', 'Health & Medical', 'Transportation'];
    const essentialSpend = Object.entries(categoryTotals)
      .filter(([k]) => essentialCategories.some(e => k.toLowerCase().includes(e.toLowerCase().split(' ')[0])))
      .reduce((s, [, v]) => s + v, 0);
    const discretionarySpend = totalExpense - essentialSpend;

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, v]) => `${k}: ₹${v.toFixed(0)}`)
      .join(', ');

    const prompts = scorePrompt({
      monthlyIncome,
      avgMonthlySpend: Math.round(avgMonthlySpend),
      totalIncome: Math.round(totalIncome),
      totalExpense: Math.round(totalExpense),
      savingsRate: savingsRate.toFixed(1),
      essentialSpend: Math.round(essentialSpend),
      discretionarySpend: Math.round(discretionarySpend),
      transactionCount: transactions.length,
      topCategories,
    });

    const { data: scoreData, usage } = await askLLMJSON(prompts.system, prompts.user, { maxTokens: 1024 });
    await trackTokens(req.user._id, usage);

    await User.findByIdAndUpdate(req.user._id, {
      'financialScore.score':          scoreData.score,
      'financialScore.grade':          scoreData.grade,
      'financialScore.lastCalculated': new Date(),
    });

    const responseData = {
      ...scoreData,
      meta: {
        calculatedAt:     new Date(),
        basedOnMonths:    3,
        transactionCount: transactions.length,
      },
    };

    await setCache(req.user._id, 'score_cache', cacheKey, responseData);

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 6. POST /api/ai/chat
//─────────────────────────────────────
const chatWithAI = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const cleanMessage = sanitizeInput(message, 1000);

    const { totalExpense, totalIncome, categoryTotals, user } =
      await getUserFinancialData(req.user._id, 1);

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} ₹${v.toFixed(0)}`)
      .join(', ');

    const prompts = chatPrompt({
      userName: user.name,
      monthlyIncome: user.monthlyIncome,
      totalExpense: Math.round(totalExpense),
      totalIncome: Math.round(totalIncome),
      topCategories,
      message: cleanMessage,
    });

    const { content: reply, usage } = await askLLM(prompts.system, prompts.user, { maxTokens: 512 });
    await trackTokens(req.user._id, usage);

    return res.status(200).json({
      success: true,
      data: { reply, timestamp: new Date() },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 6b. POST /api/ai/chat/stream (SSE)
//─────────────────────────────────────
const chatWithAIStream = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const cleanMessage = sanitizeInput(message, 1000);

    const { totalExpense, totalIncome, categoryTotals, user } =
      await getUserFinancialData(req.user._id, 1);

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k} ₹${v.toFixed(0)}`)
      .join(', ');

    const prompts = chatPrompt({
      userName: user.name,
      monthlyIncome: user.monthlyIncome,
      totalExpense: Math.round(totalExpense),
      totalIncome: Math.round(totalIncome),
      topCategories,
      message: cleanMessage,
    });

    // SSE headers
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });

    const stream = await askLLMStream(prompts.system, prompts.user, { maxTokens: 512 });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ token: delta })}\n\n`);
      }
      // Track usage from final chunk
      if (chunk.x_groq?.usage) {
        await trackTokens(req.user._id, chunk.x_groq.usage);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    if (!res.headersSent) return next(error);
    res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
    res.end();
  }
};

//─────────────────────────────────────
// 7. POST /api/ai/categorize-batch
//─────────────────────────────────────
const categorizeBatchFn = async (req, res, next) => {
  try {
    const { transactionIds } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'transactionIds array is required.' });
    }

    if (transactionIds.length > 20) {
      return res.status(400).json({ success: false, message: 'Max 20 transactions per batch.' });
    }

    const transactions = await Transaction.find({
      _id: { $in: transactionIds },
      userId: req.user._id,
    }).lean();

    const categories = await Category.find({
      isActive: true,
      $or: [{ isSystem: true }, { userId: req.user._id }],
    }).lean();

    const categoryList = categories.map(c => c.name).join(', ');
    const results = [];

    for (const txn of transactions) {
      try {
        const prompts = categorizeBatch({
          merchant: sanitizeInput(txn.merchant || txn.description || 'Unknown', 200),
          amount: txn.amount,
          type: txn.type,
          categoryList,
        });

        const { data: result, usage } = await askLLMJSON(prompts.system, prompts.user, {
          maxTokens: 256,
          model: FALLBACK_MODEL,
        });
        await trackTokens(req.user._id, usage);

        const matched = categories.find(c => c.name.toLowerCase() === result.categoryName?.toLowerCase());

        if (matched) {
          await Transaction.findByIdAndUpdate(txn._id, {
            categoryId:   matched._id,
            categoryName: matched.name,
            'aiData.categorizedBy': 'ai',
            'aiData.confidence':    result.confidence,
          });
          results.push({ id: txn._id, categoryName: matched.name, confidence: result.confidence, success: true });
        } else {
          results.push({ id: txn._id, success: false, reason: 'No matching category found' });
        }
      } catch {
        results.push({ id: txn._id, success: false, reason: 'AI error' });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        processed: results.length,
        succeeded: results.filter(r => r.success).length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  categorizeTransaction,
  getSpendingAnalysis,
  getInsights,
  getRecommendations,
  getFinancialScore,
  chatWithAI,
  chatWithAIStream,
  categorizeBatch: categorizeBatchFn,
};
