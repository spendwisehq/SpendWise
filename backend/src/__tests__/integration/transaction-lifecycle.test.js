const request = require('supertest');

jest.mock('../../services/groq.service', () => ({
  askLLM: jest.fn().mockResolvedValue({ content: 'Advice', usage: { total_tokens: 20 }, model: 'llama-3.3-70b-versatile' }),
  askLLMJSON: jest.fn().mockResolvedValue({ data: { categoryName: 'Food & Dining', confidence: 95, reason: 'Food' }, usage: { total_tokens: 20 } }),
  askLLMStream: jest.fn(),
  PRIMARY_MODEL: 'llama-3.3-70b-versatile',
  FALLBACK_MODEL: 'llama-3.1-8b-instant',
}));
jest.mock('../../services/tokenTracking.service', () => ({ trackTokens: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../services/aiCache.service', () => ({ getCached: jest.fn().mockResolvedValue(null), setCache: jest.fn().mockResolvedValue(undefined), invalidateUserCache: jest.fn().mockResolvedValue(undefined) }));

const app = require('../../../server-test');
const Category = require('../../models/Category.model');
const { createAuthenticatedUser } = require('../helpers');

describe('Integration: Transaction Lifecycle', () => {
  let accessToken;

  beforeEach(async () => {
    const auth = await createAuthenticatedUser({ name: 'Lifecycle', email: `life${Date.now()}@test.com` });
    accessToken = auth.accessToken;
    await Category.create([
      { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#FF6B6B', keywords: ['swiggy'], isSystem: true, isActive: true },
      { name: 'Shopping', type: 'expense', icon: '🛒', color: '#F59E0B', keywords: ['amazon'], isSystem: true, isActive: true },
    ]);
  });

  it('should complete full lifecycle: create → categorize → edit → delete', async () => {
    // Create
    const createRes = await request(app).post('/api/transactions').set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'expense', amount: 350, merchant: 'Swiggy', paymentMethod: 'upi', date: new Date().toISOString() });
    expect(createRes.status).toBe(201);
    const txnId = createRes.body.data.transaction._id;

    // AI Categorize
    const catRes = await request(app).post('/api/ai/categorize').set('Authorization', `Bearer ${accessToken}`)
      .send({ merchant: 'Swiggy', amount: 350, type: 'expense' });
    expect(catRes.status).toBe(200);
    expect(catRes.body.data.categoryName).toBe('Food & Dining');

    // Edit
    const editRes = await request(app).put(`/api/transactions/${txnId}`).set('Authorization', `Bearer ${accessToken}`)
      .send({ categoryName: 'Food & Dining', amount: 400 });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.transaction.amount).toBe(400);

    // Delete
    const delRes = await request(app).delete(`/api/transactions/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(delRes.status).toBe(200);

    // Verify deleted
    const list = await request(app).get('/api/transactions').set('Authorization', `Bearer ${accessToken}`);
    expect(list.body.data.transactions).toHaveLength(0);
  });

  it('should isolate transactions between users', async () => {
    await request(app).post('/api/transactions').set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'expense', amount: 999, merchant: 'Private', paymentMethod: 'cash', date: new Date().toISOString() });

    const user2 = await createAuthenticatedUser({ name: 'Other', email: `other${Date.now()}@test.com` });
    const list = await request(app).get('/api/transactions').set('Authorization', `Bearer ${user2.accessToken}`);
    expect(list.body.data.transactions).toHaveLength(0);
  });
});
