// backend/src/services/groq.service.js

const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PRIMARY_MODEL  = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'llama-3.1-8b-instant';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Send a prompt to Groq with 3-attempt retry + exponential backoff + model fallback.
 * Returns { content, usage, model }.
 */
const askLLM = async (systemPrompt, userPrompt, opts = {}) => {
  const { maxTokens = 1024, model = PRIMARY_MODEL } = opts;
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      });

      return {
        content: completion.choices[0]?.message?.content || '',
        usage:   completion.usage || null,
        model,
      };
    } catch (error) {
      lastError = error;
      if (error.status && error.status < 500 && error.status !== 429) throw error;
      if (attempt < 3) await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  // Primary exhausted — try fallback model once
  if (model === PRIMARY_MODEL) {
    try {
      return await askLLM(systemPrompt, userPrompt, { maxTokens, model: FALLBACK_MODEL });
    } catch { /* fallback also failed */ }
  }

  throw lastError;
};

/**
 * Extract JSON from LLM text that may include markdown fences or preamble.
 */
const extractJSON = (text) => {
  const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Failed to extract JSON from LLM response');
  }
};

/**
 * Ask Groq for a JSON response with retry + extraction fallback.
 * Returns { data, usage, model }.
 */
const askLLMJSON = async (systemPrompt, userPrompt, opts = {}) => {
  const { content, usage, model } = await askLLM(systemPrompt, userPrompt, opts);
  return { data: extractJSON(content), usage, model };
};

/**
 * Streaming chat completion — returns an async iterator of chunks.
 */
const askLLMStream = async (systemPrompt, userPrompt, opts = {}) => {
  const { maxTokens = 512, model = PRIMARY_MODEL } = opts;
  return groq.chat.completions.create({
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  });
};

module.exports = { askLLM, askLLMJSON, askLLMStream, PRIMARY_MODEL, FALLBACK_MODEL };
