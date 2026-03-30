// backend/src/services/claude.service.js
// ✅ Switched from Anthropic to Google Gemini (free tier)

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = () => genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || 'gemini-pro',
});

/**
 * Send a prompt to Gemini and get a text response
 */
const askClaude = async (systemPrompt, userPrompt, maxTokens = 1024) => {
  const model = getModel();
  const prompt = `${systemPrompt}\n\n${userPrompt}`;
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens },
  });
  return result.response.text() || '';
};

/**
 * Ask Gemini and parse JSON response
 */
const askClaudeJSON = async (systemPrompt, userPrompt, maxTokens = 1024) => {
  const text = await askClaude(systemPrompt, userPrompt, maxTokens);
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
};

module.exports = { askClaude, askClaudeJSON };