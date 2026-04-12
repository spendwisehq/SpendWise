// backend/src/__tests__/payment.controller.test.js

const request = require('supertest');
const crypto  = require('crypto');

// Set env vars before app loads
process.env.RAZORPAY_KEY_ID        = 'rzp_test_key123';
process.env.RAZORPAY_KEY_SECRET    = 'test_razorpay_secret_key';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

// Mock Razorpay SDK
const mockOrdersCreate = jest.fn();
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: mockOrdersCreate },
  }));
});

const app = require('../../server-test');
const Transaction = require('../models/Transaction.model');
const Budget      = require('../models/Budget.model');
const { createAuthenticatedUser } = require('./helpers');

describe('💳 Payment Controller', () => {
  let accessToken;
  let userId;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Re-set env vars after dotenv may have overwritten them during app load
    process.env.RAZORPAY_KEY_ID         = 'rzp_test_key123';
    process.env.RAZORPAY_KEY_SECRET     = 'test_razorpay_secret_key';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

    const auth = await createAuthenticatedUser({ name: 'Pay Tester', email: `pay${Date.now()}@test.com` });
    accessToken = auth.accessToken;
    userId      = auth.userId;

    // Default mock: Razorpay orders.create returns a valid order
    mockOrdersCreate.mockResolvedValue({
      id: 'order_test123',
      amount: 50000,
      currency: 'INR',
      receipt: `sw_${userId}_${Date.now()}`,
    });
  });

  // ─────────────────────────────────────
  // POST /api/payments/order
  // ─────────────────────────────────────
  describe('POST /api/payments/order', () => {
    it('should create a payment order', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 500, description: 'Test payment', categoryName: 'Shopping' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order.id).toBe('order_test123');
      expect(res.body.data.transaction.id).toBeDefined();
      expect(res.body.data.keyId).toBe('rzp_test_key123');
    });

    it('should reject amount less than 1', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least/i);
    });

    it('should include budget alert when budget exists', async () => {
      const now = new Date();
      await Budget.create({
        userId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalBudget: 10000,
        totalSpent: 9000,
        categories: [],
      });

      const res = await request(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 2000, description: 'Big purchase' });

      expect(res.status).toBe(201);
      expect(res.body.data.budgetAlert).toBeDefined();
      expect(res.body.data.budgetAlert.willExceed).toBe(true);
    });

    it('should not include budget alert when no budget', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 100 });

      expect(res.status).toBe(201);
      expect(res.body.data.budgetAlert).toBeNull();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/payments/order')
        .send({ amount: 100 });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────
  // POST /api/payments/verify
  // ─────────────────────────────────────
  describe('POST /api/payments/verify', () => {
    let orderId;

    beforeEach(async () => {
      // Create a pending payment transaction
      const orderRes = await request(app)
        .post('/api/payments/order')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 500, description: 'Test' });
      orderId = orderRes.body.data.order.id;
    });

    it('should verify payment with valid signature', async () => {
      const paymentId = 'pay_test456';
      const body = `${orderId}|${paymentId}`;
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.paymentData.status).toBe('completed');
    });

    it('should reject invalid signature', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: 'pay_test456',
          razorpay_signature: 'invalid_signature_hash',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid signature/i);
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ razorpay_order_id: orderId });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/missing/i);
    });

    it('should return 404 when transaction not found for order', async () => {
      const fakeOrderId = 'order_nonexistent';
      const paymentId = 'pay_test789';
      const body = `${fakeOrderId}|${paymentId}`;
      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          razorpay_order_id: fakeOrderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        });

      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────
  // POST /api/payments/webhook
  // ─────────────────────────────────────
  describe('POST /api/payments/webhook', () => {
    it('should handle payment.captured event', async () => {
      // Create a transaction with payment data
      await Transaction.create({
        userId,
        type: 'expense',
        amount: 500,
        source: 'razorpay',
        paymentData: {
          razorpayOrderId: 'order_wh1',
          razorpayPaymentId: 'pay_wh1',
          status: 'pending',
        },
        date: new Date(),
      });

      const payload = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_wh1', order_id: 'order_wh1' } } },
      };

      const signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', signature)
        .send(payload);

      expect(res.status).toBe(200);

      // Verify transaction updated
      const txn = await Transaction.findOne({ 'paymentData.razorpayPaymentId': 'pay_wh1' });
      expect(txn.paymentData.status).toBe('completed');
    });

    it('should reject invalid webhook signature', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-razorpay-signature', 'invalid_sig')
        .send({ event: 'payment.captured', payload: {} });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────
  // GET /api/payments/history
  // ─────────────────────────────────────
  describe('GET /api/payments/history', () => {
    beforeEach(async () => {
      await Transaction.create([
        { userId, type: 'expense', amount: 100, source: 'razorpay', paymentData: { status: 'completed' }, date: new Date() },
        { userId, type: 'expense', amount: 200, source: 'razorpay', paymentData: { status: 'pending' }, date: new Date() },
        { userId, type: 'expense', amount: 300, source: 'razorpay', paymentData: { status: 'completed' }, date: new Date() },
      ]);
    });

    it('should return paginated payment history', async () => {
      const res = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toHaveLength(3);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/payments/history?status=completed')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────
  // GET /api/payments/budget-check
  // ─────────────────────────────────────
  describe('GET /api/payments/budget-check', () => {
    it('should return budget status', async () => {
      const now = new Date();
      await Budget.create({
        userId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalBudget: 10000,
        totalSpent: 5000,
        categories: [],
      });

      const res = await request(app)
        .get('/api/payments/budget-check?amount=2000')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.hasBudget).toBe(true);
      expect(res.body.data.remaining).toBe(5000);
      expect(res.body.data.willExceed).toBe(false);
    });

    it('should return 400 without amount', async () => {
      const res = await request(app)
        .get('/api/payments/budget-check')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────
  // GET /api/payments/stats
  // ─────────────────────────────────────
  describe('GET /api/payments/stats', () => {
    it('should return payment stats', async () => {
      await Transaction.create({
        userId,
        type: 'expense',
        amount: 1000,
        source: 'razorpay',
        paymentData: { status: 'completed' },
        date: new Date(),
      });

      const res = await request(app)
        .get('/api/payments/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalPayments).toBe(1);
      expect(res.body.data.razorpayKeyId).toBeDefined();
    });
  });
});
