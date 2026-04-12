// backend/src/prompts/insights.js

const GUARD = require('./guard');

const insights = ({ userName, monthlyIncome, currency, totalExpense, totalIncome, transactionCount, topCategories, topMerchants }) => ({
  system: `${GUARD}You are a smart personal finance advisor for Indian users.
Generate specific, actionable financial insights based on real spending data.
Each insight must be practical and tailored to the user's actual behavior.
Respond ONLY with valid JSON array.`,

  user: `User: ${userName}
Monthly Income: ₹${monthlyIncome}
Currency: ${currency}
Last 3 months data:
- Total Spent: ₹${totalExpense}
- Total Income: ₹${totalIncome}
- Transactions: ${transactionCount}

Top categories:
${topCategories}

Frequent merchants: ${topMerchants}

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
]`,
});

const recommendations = ({ userName, monthlyIncome, plan, currency, totalExpense, totalIncome, savings, savingsRate, categoryBreakdown }) => ({
  system: `${GUARD}You are a certified financial planner specializing in personal finance for young Indians.
Give practical, realistic recommendations based on actual spending behavior.
Be encouraging but honest. Reference specific numbers from the data.
Respond ONLY with valid JSON array.`,

  user: `User Profile:
- Name: ${userName}
- Monthly Income: ₹${monthlyIncome || 'not set'}
- Plan: ${plan}
- Currency: ${currency}

Last 2 months spending:
- Total Expense: ₹${totalExpense}
- Total Income: ₹${totalIncome}
- Savings: ₹${savings}
- Savings Rate: ${savingsRate}%

By category:
${categoryBreakdown}

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
]`,
});

const financialScore = ({ monthlyIncome, avgMonthlySpend, totalIncome, totalExpense, savingsRate, essentialSpend, discretionarySpend, transactionCount, topCategories }) => ({
  system: `${GUARD}You are a financial health scoring system for Indian users.
Score the user's financial health from 0-100 based on key metrics.
Be honest but constructive. Respond ONLY with valid JSON.`,

  user: `Financial Data (last 3 months):
- Monthly Income declared: ₹${monthlyIncome}
- Avg Monthly Spend: ₹${avgMonthlySpend}
- Total Income (transactions): ₹${totalIncome}
- Total Expense: ₹${totalExpense}
- Savings Rate: ${savingsRate}%
- Essential Spend: ₹${essentialSpend}
- Discretionary Spend: ₹${discretionarySpend}
- Transaction Count: ${transactionCount}

Top categories: ${topCategories}

Calculate financial score. Respond with JSON:
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
}`,
});

const scoreCommentary = ({ scores, trend }) => ({
  system: `${GUARD}You are a financial coach. Give brief encouraging commentary on a user's financial score trend. Max 2 sentences.`,

  user: `Score trend over ${scores.length} months: ${scores.map(s => `${s.label}: ${s.score}`).join(', ')}. Overall change: ${trend > 0 ? '+' : ''}${trend.toFixed(0)} points.`,
});

module.exports = { insights, recommendations, financialScore, scoreCommentary };
