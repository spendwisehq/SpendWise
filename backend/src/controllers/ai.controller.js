// backend/src/controllers/ai.controller.js
// STAGE 4 ADDITIONS:
//   getGoalCoachPlan  — Feature 2: AI Goal Coach (GET /api/ai/goal-coach/:goalId)

const { askClaude, askClaudeJSON } = require('../services/groq.service');
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

  return {
    transactions,
    categories,
    user,
    categoryTotals,
    totalExpense,
    totalIncome,
    currency: user?.currency || 'INR',
  };
};

//─────────────────────────────────────
// 1. POST /api/ai/categorize
//─────────────────────────────────────
const categorizeTransaction = async (req, res, next) => {
  try {
    const { merchant, description, amount, type, name } = req.body;
    const label = merchant || description || name;

    if (!label) {
      return res.status(400).json({ success: false, message: 'merchant, description, or name is required.' });
    }

    const categories = await Category.find({
      isActive: true,
      $or: [{ isSystem: true }, { userId: req.user._id }],
    }).lean();

    const categoryList = categories
      .map(c => `${c.name} (${c.type}) — keywords: ${c.keywords.join(', ')}`)
      .join('\n');

    const systemPrompt = `You are a financial transaction categorizer for an Indian expense tracking app.
Given transaction details, pick the BEST matching category from the provided list.
Respond ONLY with valid JSON. No explanation.`;

    const userPrompt = `Transaction:
- Merchant/Description: ${label}
- Amount: ${amount || 'unknown'}
- Type: ${type || 'expense'}

Available categories:
${categoryList}

Respond with JSON:
{
  "categoryName": "exact category name from list",
  "confidence": 0-100,
  "reason": "one line explanation"
}`;

    const result = await askClaudeJSON(systemPrompt, userPrompt);
    const matched = categories.find(
      c => c.name.toLowerCase() === result.categoryName?.toLowerCase()
    );

    return res.status(200).json({
      success: true,
      data: {
        categoryId:    matched?._id    || null,
        categoryName:  matched?.name   || result.categoryName || 'Uncategorized',
        category:      matched?.name   || result.categoryName || 'Uncategorized', // alias for frontend
        categoryIcon:  matched?.icon   || '📦',
        categoryColor: matched?.color  || '#888780',
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

    const startDate = new Date(year, month - 1, 1);
    const endDate   = new Date(year, month, 0, 23, 59, 59);

    const transactions = await Transaction.find({
      userId:    req.user._id,
      isDeleted: false,
      date:      { $gte: startDate, $lte: endDate },
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

    const systemPrompt = `You are an expert personal finance analyst for Indian users.
Respond ONLY with valid JSON.`;

    const userPrompt = `User: ${user.name}, Monthly Income: ₹${user.monthlyIncome || 0}
Period: ${month}/${year}
Total Expense: ₹${totalExpense.toFixed(0)}
Total Income: ₹${totalIncome.toFixed(0)}
Net Savings: ₹${(totalIncome - totalExpense).toFixed(0)}
Transactions: ${transactions.length}

Spending by category:
${Object.entries(byCategory).map(([k, v]) => `- ${k}: ₹${v.toFixed(0)}`).join('\n')}

Respond with JSON:
{
  "summary": "2-3 sentence overall summary",
  "topSpendingCategory": "category name",
  "savingsRate": 0-100,
  "spendingHealth": "good|fair|poor",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "unusualPatterns": ["pattern1"] or [],
  "monthComparison": "brief comparison note"
}`;

    const analysis = await askClaudeJSON(systemPrompt, userPrompt, 1024);

    return res.status(200).json({
      success: true,
      data: {
        period: { month, year },
        totals: { totalExpense, totalIncome, netSavings: totalIncome - totalExpense },
        byCategory,
        analysis,
      },
    });
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
      .map(([name, count]) => `${name} (${count}x)`);

    const systemPrompt = `You are a smart personal finance advisor for Indian users.
Generate specific, actionable financial insights based on real spending data.
Respond ONLY with valid JSON array.`;

    const userPrompt = `User: ${user.name}
Monthly Income: ₹${user.monthlyIncome || 0}
Currency: ${currency}
Last 3 months data:
- Total Spent: ₹${totalExpense.toFixed(0)}
- Total Income: ₹${totalIncome.toFixed(0)}
- Transactions: ${transactions.length}

Top categories:
${Object.entries(categoryTotals).sort((a,b) => b[1]-a[1]).slice(0,6).map(([k,v]) => `- ${k}: ₹${v.toFixed(0)}`).join('\n')}

Frequent merchants: ${topMerchants.join(', ')}

Generate 5 personalized insights. Respond with JSON array:
[
  {
    "type": "warning|tip|achievement|alert",
    "title": "short title",
    "message": "specific actionable message (2 sentences max)",
    "category": "category this insight relates to",
    "potentialSaving": number or null,
    "priority": "high|medium|low"
  }
]`;

    const insights = await askClaudeJSON(systemPrompt, userPrompt, 1500);

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
    const { transactions, categoryTotals, totalExpense, totalIncome, user, currency } =
      await getUserFinancialData(req.user._id, 2);

    if (transactions.length < 5) {
      return res.status(200).json({
        success: true,
        data: { recommendations: [], message: 'Add more transactions to get recommendations.' },
      });
    }

    const systemPrompt = `You are a certified financial planner specializing in personal finance for young Indians.
Give practical, realistic recommendations based on actual spending behavior.
Respond ONLY with valid JSON array.`;

    const userPrompt = `User Profile:
- Name: ${user.name}
- Monthly Income: ₹${user.monthlyIncome || 'not set'}
- Plan: ${user.plan}
- Currency: ${currency}

Last 2 months spending:
- Total Expense: ₹${totalExpense.toFixed(0)}
- Total Income: ₹${totalIncome.toFixed(0)}
- Savings: ₹${(totalIncome - totalExpense).toFixed(0)}
- Savings Rate: ${totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0}%

By category:
${Object.entries(categoryTotals).sort((a,b) => b[1]-a[1]).map(([k,v]) => `- ${k}: ₹${v.toFixed(0)}`).join('\n')}

Generate 4 specific recommendations. Respond with JSON array:
[
  {
    "title": "action title",
    "description": "specific recommendation with numbers (3 sentences max)",
    "impact": "high|medium|low",
    "category": "relevant category",
    "estimatedMonthlySaving": number or null,
    "actionSteps": ["step1", "step2"]
  }
]`;

    const recommendations = await askClaudeJSON(systemPrompt, userPrompt, 1500);

    return res.status(200).json({
      success: true,
      data: {
        recommendations: Array.isArray(recommendations) ? recommendations : [],
        basedOn: { months: 2, transactions: transactions.length, totalExpense, totalIncome },
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 5. GET /api/ai/score
//─────────────────────────────────────
const getFinancialScore = async (req, res, next) => {
  try {
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

    const systemPrompt = `You are a financial health scoring system for Indian users.
Score the user's financial health from 0-100.
Respond ONLY with valid JSON.`;

    const userPrompt = `Financial Data (last 3 months):
- Monthly Income declared: ₹${monthlyIncome}
- Avg Monthly Spend: ₹${avgMonthlySpend.toFixed(0)}
- Total Income (transactions): ₹${totalIncome.toFixed(0)}
- Total Expense: ₹${totalExpense.toFixed(0)}
- Savings Rate: ${savingsRate.toFixed(1)}%
- Essential Spend: ₹${essentialSpend.toFixed(0)}
- Discretionary Spend: ₹${discretionarySpend.toFixed(0)}
- Transaction Count: ${transactions.length}

Top categories: ${Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k}: ₹${v.toFixed(0)}`).join(', ')}

Respond with JSON:
{
  "score": 0-100,
  "grade": "A+|A|B+|B|C+|C|D|F",
  "label": "Excellent|Very Good|Good|Fair|Needs Improvement|Poor",
  "breakdown": {
    "savingsScore": 0-25,
    "spendingScore": 0-25,
    "consistencyScore": 0-25,
    "essentialsScore": 0-25
  },
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "nextSteps": ["action1", "action2", "action3"],
  "summary": "2-3 sentence summary of financial health"
}`;

    const scoreData = await askClaudeJSON(systemPrompt, userPrompt, 1024);

    await User.findByIdAndUpdate(req.user._id, {
      'financialScore.score':          scoreData.score,
      'financialScore.grade':          scoreData.grade,
      'financialScore.lastCalculated': new Date(),
    });

    return res.status(200).json({
      success: true,
      data: {
        ...scoreData,
        meta: { calculatedAt: new Date(), basedOnMonths: 3, transactionCount: transactions.length },
      },
    });
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

    const { totalExpense, totalIncome, categoryTotals, user } =
      await getUserFinancialData(req.user._id, 1);

    const systemPrompt = `You are SpendWise AI, a friendly and knowledgeable personal finance assistant for Indian users.
You have access to the user's recent financial data.
Give specific, actionable advice. Be conversational, warm, and encouraging.
Reference their actual data when relevant. Keep responses concise (under 150 words).`;

    const userPrompt = `User: ${user.name}
Monthly Income: ₹${user.monthlyIncome || 'not set'}
This month — Spent: ₹${totalExpense.toFixed(0)}, Income: ₹${totalIncome.toFixed(0)}
Top categories: ${Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ₹${v.toFixed(0)}`).join(', ')}

User question: ${message}`;

    const reply = await askClaude(systemPrompt, userPrompt, 512);

    return res.status(200).json({
      success: true,
      data: { reply, timestamp: new Date() },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// 7. POST /api/ai/categorize-batch
//─────────────────────────────────────
const categorizeBatch = async (req, res, next) => {
  try {
    const { transactionIds } = req.body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'transactionIds array is required.' });
    }
    if (transactionIds.length > 20) {
      return res.status(400).json({ success: false, message: 'Max 20 transactions per batch.' });
    }

    const transactions = await Transaction.find({
      _id:    { $in: transactionIds },
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
        const systemPrompt = `You are a transaction categorizer. Pick the best category from the list.
Respond ONLY with JSON: {"categoryName": "exact name", "confidence": 0-100}`;

        const userPrompt = `Transaction: ${txn.merchant || txn.description || 'Unknown'} — ₹${txn.amount} (${txn.type})
Categories: ${categoryList}`;

        const result  = await askClaudeJSON(systemPrompt, userPrompt, 256);
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

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 4 — Feature 2: AI Goal Coach
// GET /api/ai/goal-coach
// Body (optional): { goalName, targetAmount, currentSavings, targetDate }
// Returns a week-by-week savings plan with category-specific cuts
// ─────────────────────────────────────────────────────────────────────────────
const getGoalCoachPlan = async (req, res, next) => {
  try {
    const { goalName, targetAmount, currentSavings, targetDate } = req.query;

    if (!targetAmount || isNaN(Number(targetAmount))) {
      return res.status(400).json({
        success: false,
        message: 'targetAmount is required as a query param (number).',
      });
    }

    const { transactions, categoryTotals, totalExpense, totalIncome, user, currency } =
      await getUserFinancialData(req.user._id, 3);

    if (transactions.length < 3) {
      return res.status(200).json({
        success: true,
        data: {
          plan: null,
          message: 'Add at least 3 transactions so the AI can build a personalized plan.',
        },
      });
    }

    // Calculate how many weeks remain
    const dueDate  = targetDate ? new Date(targetDate) : null;
    const weeksLeft = dueDate
      ? Math.max(1, Math.round((dueDate - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
      : 12; // default 12 weeks if no target date

    const gap = Number(targetAmount) - Number(currentSavings || 0);
    const weeklyRequired = gap / weeksLeft;
    const avgMonthlySpend = totalExpense / 3;

    const systemPrompt = `You are an expert AI financial coach for Indian users.
You create detailed, realistic, week-by-week savings plans tailored to the user's ACTUAL spending data.
Be encouraging, specific, and always reference real numbers from the data.
Respond ONLY with valid JSON.`;

    const userPrompt = `User: ${user.name}
Goal: ${goalName || 'Savings Goal'}
Target Amount: ₹${Number(targetAmount).toLocaleString('en-IN')}
Already Saved: ₹${Number(currentSavings || 0).toLocaleString('en-IN')}
Gap to Close: ₹${gap.toLocaleString('en-IN')}
Weeks Available: ${weeksLeft}
Weekly Savings Needed: ₹${weeklyRequired.toFixed(0)}

Monthly Income: ₹${user.monthlyIncome || totalIncome / 3 || 0}
Avg Monthly Spend: ₹${avgMonthlySpend.toFixed(0)}
Currency: ${currency}

Current spending by category (last 3 months total):
${Object.entries(categoryTotals).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`- ${k}: ₹${v.toFixed(0)} total (₹${(v/3).toFixed(0)}/mo)`).join('\n')}

Build a week-by-week savings plan. Respond with JSON:
{
  "feasible": true|false,
  "summary": "2-3 sentence overall assessment",
  "weeklyTargetSaving": number,
  "categoriesToCut": [
    {
      "category": "category name",
      "currentMonthly": number,
      "suggestedMonthly": number,
      "saving": number,
      "tip": "specific actionable tip for this category"
    }
  ],
  "weeklyPlan": [
    {
      "week": 1,
      "focus": "theme for this week",
      "target": number,
      "checkIn": "specific thing to review at end of week",
      "tip": "one practical tip"
    }
  ],
  "milestone": {
    "halfway": "what happens at the halfway point",
    "completion": "celebration message when goal is reached"
  },
  "riskFactors": ["risk1", "risk2"],
  "alternativeTimeline": "if not feasible in given time, suggest a realistic alternative"
}
Limit weeklyPlan to ${Math.min(weeksLeft, 8)} weeks (summarise the rest if needed).`;

    const plan = await askClaudeJSON(systemPrompt, userPrompt, 2000);

    return res.status(200).json({
      success: true,
      data: {
        goal: {
          name:            goalName || 'Savings Goal',
          targetAmount:    Number(targetAmount),
          currentSavings:  Number(currentSavings || 0),
          gap,
          weeksLeft,
          weeklyRequired,
          targetDate:      dueDate,
        },
        plan,
        generatedAt: new Date(),
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
  categorizeBatch,
  getGoalCoachPlan,   // STAGE 4
};