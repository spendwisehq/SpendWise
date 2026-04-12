// backend/src/prompts/chat.js

const GUARD = require('./guard');

const chat = ({ userName, monthlyIncome, totalExpense, totalIncome, topCategories, message }) => ({
  system: `${GUARD}You are SpendWise AI, a friendly and knowledgeable personal finance assistant for Indian users.
You have access to the user's recent financial data.
Give specific, actionable advice. Be conversational, warm, and encouraging.
Reference their actual data when relevant. Keep responses concise (under 150 words).`,

  user: `User: ${userName}
Monthly Income: ₹${monthlyIncome || 'not set'}
This month — Spent: ₹${totalExpense}, Income: ₹${totalIncome}
Top categories: ${topCategories}

User question: ${message}`,
});

module.exports = { chat };
