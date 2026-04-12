// backend/src/prompts/analysis.js

const GUARD = require('./guard');

const spendingAnalysis = ({ userName, monthlyIncome, month, year, totalExpense, totalIncome, transactionCount, byCategory }) => ({
  system: `${GUARD}You are an expert personal finance analyst for Indian users.
Analyze spending data and provide actionable insights.
Be specific, friendly, and use Indian currency context.
Respond ONLY with valid JSON.`,

  user: `User: ${userName}, Monthly Income: ₹${monthlyIncome}
Period: ${month}/${year}
Total Expense: ₹${totalExpense}
Total Income: ₹${totalIncome}
Net Savings: ₹${totalIncome - totalExpense}
Transactions: ${transactionCount}

Spending by category:
${Object.entries(byCategory).map(([k, v]) => `- ${k}: ₹${Math.round(v)}`).join('\n')}

Respond with JSON:
{
  "summary": "2-3 sentence overall summary",
  "topSpendingCategory": "category name",
  "savingsRate": 0-100,
  "spendingHealth": "good|fair|poor",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "unusualPatterns": ["pattern1"] or [],
  "monthComparison": "brief comparison note"
}`,
});

const anomalyDetection = ({ flaggedTransactions, categoryAvg }) => ({
  system: `${GUARD}You are a financial anomaly detection AI.
Analyze flagged transactions and explain why they are unusual.
Respond ONLY with valid JSON array.`,

  user: `Flagged transactions (statistically unusual):
${flaggedTransactions.map(t => `- ₹${t.amount} at ${t.merchant || 'Unknown'} (${t.categoryName}) on ${new Date(t.date).toLocaleDateString('en-IN')}`).join('\n')}

Category averages:
${Object.entries(categoryAvg).map(([k, v]) => `- ${k}: avg ₹${v.avg.toFixed(0)}, std ₹${v.std.toFixed(0)}`).join('\n')}

For each flagged transaction, respond with JSON array:
[
  {
    "merchant": "name",
    "amount": number,
    "category": "category",
    "reason": "why this is unusual (1 sentence)",
    "severity": "low|medium|high",
    "suggestion": "what to do about it (1 sentence)"
  }
]`,
});

const subscriptionDetection = ({ candidates }) => ({
  system: `${GUARD}You are a subscription detection AI for Indian users.
Analyze transaction patterns and identify subscriptions/recurring payments.
Respond ONLY with valid JSON array.`,

  user: `Candidate recurring payments:
${candidates.map(c => `- ${c.merchant}: ₹${c.avgAmt.toFixed(0)} × ${c.count} times, avg gap ${c.avgGap.toFixed(0)} days`).join('\n')}

For each, respond with JSON array:
[
  {
    "merchant": "name",
    "amount": number,
    "frequency": "daily|weekly|monthly|quarterly|yearly",
    "category": "likely category",
    "isSubscription": true/false,
    "confidence": 0-100,
    "nextExpected": "YYYY-MM-DD estimate",
    "annualCost": number,
    "canCancel": true/false,
    "suggestion": "keep/review/cancel with reason"
  }
]`,
});

const spendingForecast = ({ history, categoryBreakdown, monthlyIncome, months }) => ({
  system: `${GUARD}You are a financial forecasting AI for Indian users.
Use historical spending data to forecast future expenses.
Be realistic and account for trends. Respond ONLY with valid JSON.`,

  user: `Historical spending (last 4 months):
${history.map(h => `${h.label}: Total ₹${h.expense.toFixed(0)}`).join('\n')}

Category trends:
${Object.entries(categoryBreakdown).slice(0, 8).map(([k, v]) => `- ${k}: ₹${v.toFixed(0)}`).join('\n')}

Monthly Income: ₹${monthlyIncome}

Forecast spending for next ${months} months. Respond with JSON:
{
  "forecast": [
    {
      "month": "Month Year",
      "totalExpense": number,
      "totalIncome": number,
      "netSavings": number,
      "categories": [{ "name": "category", "amount": number }],
      "confidence": 0-100
    }
  ],
  "trend": "increasing|decreasing|stable",
  "avgMonthlyExpense": number,
  "projectedAnnualSavings": number,
  "keyRisk": "main financial risk",
  "opportunity": "main savings opportunity"
}`,
});

const budgetPrediction = ({ userName, monthlyIncome, currency, history, categoryBreakdown, nextMonthLabel }) => ({
  system: `${GUARD}You are a financial planning AI for Indian users.
Predict next month's budget based on spending history.
Be realistic and data-driven. Respond ONLY with valid JSON.`,

  user: `User: ${userName}
Monthly Income: ₹${monthlyIncome}
Currency: ${currency}

Spending history (last 4 months):
${history.map(h => `${h.label}: Expense ₹${h.expense.toFixed(0)}, Income ₹${h.income.toFixed(0)}, Savings ₹${h.savings.toFixed(0)}`).join('\n')}

Category breakdown (latest month):
${Object.entries(categoryBreakdown).map(([k, v]) => `- ${k}: ₹${v.toFixed(0)}`).join('\n')}

Predict budget for ${nextMonthLabel}.
Respond with JSON:
{
  "totalPredicted": number,
  "confidence": 0-100,
  "categories": [
    { "name": "category", "predicted": number, "trend": "up|down|stable", "reason": "brief reason" }
  ],
  "savingsPotential": number,
  "advice": "2 sentence budget advice",
  "riskLevel": "low|medium|high"
}`,
});

module.exports = {
  spendingAnalysis,
  anomalyDetection,
  subscriptionDetection,
  spendingForecast,
  budgetPrediction,
};
