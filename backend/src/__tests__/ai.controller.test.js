// backend/src/__tests__/ai.controller.test.js

const request = require('supertest');

// Mock external services before app loads
jest.mock('../services/groq.service', () => ({
  askLLM: jest.fn().mockResolvedValue({
    content: 'Here is some financial advice.',
    usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
    model: 'llama-3.3-70b-versatile',
  }),
  askLLMJSON: jest.fn().mockResolvedValue({
    data: { categoryName: 'Food & Dining', confidence: 92, reason: 'Restaurant transaction' },
    usage: { prompt_tokens: 40, completion_tokens: 20, total_tokens: 60 },
  }),
  askLLMStream: jest.fn(),
  PRIMARY_MODEL: 'llama-3.3-70b-versatile',
  FALLBACK_MODEL: 'llama-3.1-8b-instant',
}));

jest.mock('../services/tokenTracking.service', () => ({
  trackTokens: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/aiCache.service', () => ({
  getCached: jest.fn().mockResolvedValue(null),
  setCache: jest.fn().mockResolvedValue(undefined),
  invalidateUserCache: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../../server-test');
const Category = require('../models/Category.model');
const { askLLMJSON, askLLM } = require('../services/groq.service');
const { getCached } = require('../services/aiCache.service');
const { trackTokens } = require('../services/tokenTracking.service');
const { createAuthenticatedUser } = require('./helpers');

describe('🤖 AI Controller', () => {
  let accessToken;

  const seedCategories = [
    { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#FF6B6B', keywords: ['food', 'swiggy', 'zomato', 'restaurant'], isSystem: true, isActive: true },
    { name: 'Transportation', type: 'expense', icon: '🚗', color: '#4DA6FF', keywords: ['uber', 'ola', 'metro', 'fuel'], isSystem: true, isActive: true },
    { name: 'Shopping', type: 'expense', icon: '🛒', color: '#F59E0B', keywords: ['amazon', 'flipkart', 'mall'], isSystem: true, isActive: true },
  ];

  const createTransactions = async (token, count = 6) => {
    const txns = [];
    for (let i = 0; i < count; i++) {
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: i % 3 === 0 ? 'income' : 'expense',
          amount: 500 + i * 100,
          merchant: ['Swiggy', 'Uber', 'Amazon', 'Salary', 'Flipkart', 'Zomato'][i % 6],
          categoryName: i % 3 === 0 ? 'Salary' : seedCategories[i % 3].name,
          paymentMethod: 'upi',
          date: new Date().toISOString(),
        });
      txns.push(res.body.data.transaction);
    }
    return txns;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const auth = await createAuthenticatedUser({ name: 'AI Tester', email: `ai${Date.now()}@test.com` });
    accessToken = auth.accessToken;
    await Category.create(seedCategories);
  });

  // ─────────────────────────────────────
  // POST /api/ai/categorize
  // ─────────────────────────────────────
  describe('POST /api/ai/categorize', () => {
    it('should categorize a transaction', async () => {
      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ merchant: 'Swiggy', description: 'Food delivery', amount: 350, type: 'expense' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.categoryName).toBe('Food & Dining');
      expect(res.body.data.confidence).toBe(92);
      expect(trackTokens).toHaveBeenCalled();
    });

    it('should return 400 when no merchant or description', async () => {
      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 350, type: 'expense' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should match category from DB and return icon/color', async () => {
      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ merchant: 'Zomato', amount: 200, type: 'expense' });

      expect(res.status).toBe(200);
      expect(res.body.data.categoryIcon).toBe('🍔');
      expect(res.body.data.categoryColor).toBe('#FF6B6B');
    });

    it('should fallback when AI returns unmatched category', async () => {
      askLLMJSON.mockResolvedValueOnce({
        data: { categoryName: 'NonExistent Category', confidence: 50, reason: 'unsure' },
        usage: { total_tokens: 30 },
      });

      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ merchant: 'Some weird place', amount: 999, type: 'expense' });

      expect(res.status).toBe(200);
      expect(res.body.data.categoryId).toBeNull();
      expect(res.body.data.categoryIcon).toBe('📦');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/ai/categorize')
        .send({ merchant: 'Test', amount: 100 });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────
  // GET /api/ai/analysis
  // ─────────────────────────────────────
  describe('GET /api/ai/analysis', () => {
    it('should return analysis for month with transactions', async () => {
      await createTransactions(accessToken, 4);

      askLLMJSON.mockResolvedValueOnce({
        data: { summary: 'Good spending habits', tips: ['Reduce dining out'] },
        usage: { total_tokens: 100 },
      });

      const now = new Date();
      const res = await request(app)
        .get(`/api/ai/analysis?month=${now.getMonth() + 1}&year=${now.getFullYear()}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBeDefined();
      expect(res.body.data.totals).toBeDefined();
    });

    it('should return null analysis when no transactions', async () => {
      const res = await request(app)
        .get('/api/ai/analysis?month=1&year=2020')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.analysis).toBeNull();
    });

    it('should return cached data when available', async () => {
      const cachedData = { period: { month: 4, year: 2026 }, analysis: { cached: true } };
      getCached.mockResolvedValueOnce(cachedData);

      const res = await request(app)
        .get('/api/ai/analysis?month=4&year=2026')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(cachedData);
      expect(askLLMJSON).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────
  // GET /api/ai/insights
  // ─────────────────────────────────────
  describe('GET /api/ai/insights', () => {
    it('should return insights with sufficient transactions', async () => {
      await createTransactions(accessToken, 6);

      askLLMJSON.mockResolvedValueOnce({
        data: [
          { title: 'Dining Spike', description: 'Your dining spending increased 20%', type: 'warning' },
        ],
        usage: { total_tokens: 80 },
      });

      const res = await request(app)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.insights)).toBe(true);
    });

    it('should return message when insufficient transactions', async () => {
      const res = await request(app)
        .get('/api/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toMatch(/more transactions/i);
    });
  });

  // ─────────────────────────────────────
  // GET /api/ai/recommendations
  // ─────────────────────────────────────
  describe('GET /api/ai/recommendations', () => {
    it('should return recommendations with sufficient data', async () => {
      await createTransactions(accessToken, 8);

      askLLMJSON.mockResolvedValueOnce({
        data: [{ title: 'Cook more', description: 'Save ₹2000/month by cooking at home', priority: 'high' }],
        usage: { total_tokens: 90 },
      });

      const res = await request(app)
        .get('/api/ai/recommendations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
      expect(res.body.data.basedOn).toBeDefined();
    });

    it('should return message when insufficient transactions', async () => {
      const res = await request(app)
        .get('/api/ai/recommendations')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toMatch(/more transactions/i);
    });
  });

  // ─────────────────────────────────────
  // GET /api/ai/score
  // ─────────────────────────────────────
  describe('GET /api/ai/score', () => {
    it('should calculate financial score', async () => {
      await createTransactions(accessToken, 8);

      askLLMJSON.mockResolvedValueOnce({
        data: { score: 72, grade: 'B', breakdown: { savings: 60, diversity: 80 } },
        usage: { total_tokens: 70 },
      });

      const res = await request(app)
        .get('/api/ai/score')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBe(72);
      expect(res.body.data.grade).toBe('B');
      expect(res.body.data.meta).toBeDefined();
    });

    it('should return null score when insufficient data', async () => {
      const res = await request(app)
        .get('/api/ai/score')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.score).toBeNull();
      expect(res.body.data.message).toMatch(/at least 5/i);
    });
  });

  // ─────────────────────────────────────
  // POST /api/ai/chat
  // ─────────────────────────────────────
  describe('POST /api/ai/chat', () => {
    it('should return AI reply', async () => {
      await createTransactions(accessToken, 2);

      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'How much did I spend on food?' });

      expect(res.status).toBe(200);
      expect(res.body.data.reply).toBeDefined();
      expect(res.body.data.timestamp).toBeDefined();
    });

    it('should return 422 for empty message', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '' });

      expect(res.status).toBe(422);
    });

    it('should return 422 for missing message', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(res.status).toBe(422);
    });
  });

  // ─────────────────────────────────────
  // POST /api/ai/categorize-batch
  // ─────────────────────────────────────
  describe('POST /api/ai/categorize-batch', () => {
    it('should categorize multiple transactions', async () => {
      const txns = await createTransactions(accessToken, 3);
      const ids = txns.map(t => t._id);

      const res = await request(app)
        .post('/api/ai/categorize-batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionIds: ids });

      expect(res.status).toBe(200);
      expect(res.body.data.processed).toBe(3);
      expect(res.body.data.results).toHaveLength(3);
    });

    it('should return 422 for empty array', async () => {
      const res = await request(app)
        .post('/api/ai/categorize-batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionIds: [] });

      expect(res.status).toBe(422);
    });

    it('should return 422 when exceeding batch limit', async () => {
      const fakeIds = Array.from({ length: 21 }, (_, i) => `00000000000000000000000${i}`);

      const res = await request(app)
        .post('/api/ai/categorize-batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionIds: fakeIds });

      expect(res.status).toBe(422);
    });

    it('should handle partial AI failures gracefully', async () => {
      const txns = await createTransactions(accessToken, 2);
      const ids = txns.map(t => t._id);

      // First call succeeds, second throws
      askLLMJSON
        .mockResolvedValueOnce({
          data: { categoryName: 'Food & Dining', confidence: 90 },
          usage: { total_tokens: 30 },
        })
        .mockRejectedValueOnce(new Error('Groq timeout'));

      const res = await request(app)
        .post('/api/ai/categorize-batch')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ transactionIds: ids });

      expect(res.status).toBe(200);
      expect(res.body.data.succeeded).toBeLessThanOrEqual(res.body.data.processed);
    });
  });

  // ─────────────────────────────────────
  // Error handling
  // ─────────────────────────────────────
  describe('Error handling', () => {
    it('should handle Groq service errors gracefully', async () => {
      askLLMJSON.mockRejectedValueOnce(new Error('Groq API rate limit exceeded'));

      const res = await request(app)
        .post('/api/ai/categorize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ merchant: 'TestMerchant', amount: 100, type: 'expense' });

      expect(res.status).toBe(500);
    });
  });
});
