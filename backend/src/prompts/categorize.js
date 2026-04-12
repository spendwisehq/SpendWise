// backend/src/prompts/categorize.js

const GUARD = require('./guard');

const categorize = ({ merchant, description, amount, type, categoryList }) => ({
  system: `${GUARD}You are a financial transaction categorizer for an Indian expense tracking app.
Given transaction details, pick the BEST matching category from the provided list.
Respond ONLY with valid JSON. No explanation.`,

  user: `Transaction:
- Merchant/Description: ${merchant || description}
- Amount: ${amount || 'unknown'}
- Type: ${type || 'expense'}

Available categories:
${categoryList}

Respond with JSON:
{
  "categoryName": "exact category name from list",
  "confidence": 0-100,
  "reason": "one line explanation"
}`,
});

const categorizeBatch = ({ merchant, amount, type, categoryList }) => ({
  system: `${GUARD}You are a transaction categorizer. Pick the best category from the list.
Respond ONLY with JSON: {"categoryName": "exact name", "confidence": 0-100}`,

  user: `Transaction: ${merchant} — ₹${amount} (${type})
Categories: ${categoryList}`,
});

module.exports = { categorize, categorizeBatch };
