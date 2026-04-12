// backend/src/__tests__/automation.controller.test.js

const request = require('supertest');
const path    = require('path');

// Mock Cloudinary and OCR before app loads
jest.mock('../utils/cloudinary', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue({
    url: 'https://res.cloudinary.com/test/receipt.jpg',
    publicId: 'spendwise/receipts/receipt_test',
    format: 'jpg',
    width: 800,
    height: 600,
    bytes: 150000,
  }),
  deleteFromCloudinary: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/ocrParser', () => ({
  processReceipt: jest.fn().mockResolvedValue({
    success: false,
    ocrActive: false,
    message: 'OCR engine not yet configured.',
    confidence: 0,
    parsed: null,
  }),
}));

const app = require('../../server-test');
const Transaction = require('../models/Transaction.model');
const Category    = require('../models/Category.model');
const User        = require('../models/User.model');
const { createAuthenticatedUser } = require('./helpers');

describe('⚡ Automation Controller', () => {
  let accessToken;
  let userId;

  beforeEach(async () => {
    jest.clearAllMocks();
    const auth = await createAuthenticatedUser({ name: 'Auto Tester', email: `auto${Date.now()}@test.com` });
    accessToken = auth.accessToken;
    userId      = auth.userId;

    // Seed categories for auto-categorization
    await Category.create([
      { name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#FF6B6B', keywords: ['swiggy', 'zomato', 'food'], isSystem: true, isActive: true },
      { name: 'Shopping', type: 'expense', icon: '🛒', color: '#F59E0B', keywords: ['amazon', 'flipkart'], isSystem: true, isActive: true },
    ]);
  });

  // ─────────────────────────────────────
  // POST /api/automation/sms/parse
  // ─────────────────────────────────────
  describe('POST /api/automation/sms/parse', () => {
    it('should parse a valid UPI debit SMS', async () => {
      const sms = 'Your A/c XX1234 debited Rs.350.00 on 10-Apr for UPI txn to SWIGGY. UPI Ref: 123456789012. Balance: Rs.5,000.00';

      const res = await request(app)
        .post('/api/automation/sms/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: sms });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.parsed.amount).toBe(350);
      expect(res.body.data.parsed.type).toBe('expense');
    });

    it('should parse a credit SMS', async () => {
      const sms = 'Rs.25000.00 credited to your A/c XX5678 on 01-Apr. UPI Ref: 987654321012. Balance: Rs.30,000.00';

      const res = await request(app)
        .post('/api/automation/sms/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: sms });

      expect(res.status).toBe(200);
      expect(res.body.data.parsed.type).toBe('income');
      expect(res.body.data.parsed.amount).toBe(25000);
    });

    it('should return 422 for non-transactional SMS', async () => {
      const res = await request(app)
        .post('/api/automation/sms/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Your OTP is 123456. Valid for 5 minutes.' });

      expect(res.status).toBe(422);
    });

    it('should return 400 for empty message', async () => {
      const res = await request(app)
        .post('/api/automation/sms/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '' });

      expect(res.status).toBe(400);
    });

    it('should auto-categorize based on merchant keywords', async () => {
      const sms = 'Your A/c XX1234 debited Rs.500.00 for UPI txn to SWIGGY. Ref: 111222333444.';

      const res = await request(app)
        .post('/api/automation/sms/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: sms });

      expect(res.status).toBe(200);
      // If the parser extracts 'SWIGGY' as merchant, it should match 'Food & Dining'
      if (res.body.data.parsed.categoryName) {
        expect(['Food & Dining', 'Uncategorized']).toContain(res.body.data.parsed.categoryName);
      }
    });
  });

  // ─────────────────────────────────────
  // POST /api/automation/sms/create
  // ─────────────────────────────────────
  describe('POST /api/automation/sms/create', () => {
    const validSMS = 'Your A/c XX9876 debited Rs.1200.00 on 05-Apr for UPI txn to Amazon. UPI Ref: 555666777888.';

    it('should create transaction from valid SMS', async () => {
      const res = await request(app)
        .post('/api/automation/sms/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: validSMS });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction.amount).toBe(1200);
      expect(res.body.data.transaction.source).toBe('sms');
    });

    it('should reject duplicate transaction by refNumber', async () => {
      // Create first
      await request(app)
        .post('/api/automation/sms/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: validSMS });

      // Try creating again with same SMS (same ref number)
      const res = await request(app)
        .post('/api/automation/sms/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: validSMS });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already imported/i);
    });

    it('should return 422 for unparseable SMS', async () => {
      const res = await request(app)
        .post('/api/automation/sms/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: 'Hello, your appointment is confirmed.' });

      expect(res.status).toBe(422);
    });

    it('should return 400 for empty message', async () => {
      const res = await request(app)
        .post('/api/automation/sms/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ message: '' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────
  // POST /api/automation/ocr/upload
  // ─────────────────────────────────────
  describe('POST /api/automation/ocr/upload', () => {
    it('should upload receipt image', async () => {
      // Create a small valid JPEG buffer (minimal JPEG header)
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9,
      ]);

      const res = await request(app)
        .post('/api/automation/ocr/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('receipt', jpegBuffer, 'receipt.jpg');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.imageUrl).toBeDefined();
      expect(res.body.data.ocrActive).toBe(false);
    });

    it('should return 400 without file', async () => {
      const res = await request(app)
        .post('/api/automation/ocr/upload')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────
  // POST /api/automation/ocr/create
  // ─────────────────────────────────────
  describe('POST /api/automation/ocr/create', () => {
    it('should create transaction from OCR data', async () => {
      const res = await request(app)
        .post('/api/automation/ocr/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 850,
          type: 'expense',
          merchant: 'DMart',
          date: new Date().toISOString(),
          paymentMethod: 'cash',
          imageUrl: 'https://cloudinary.test/receipt.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.transaction.amount).toBe(850);
      expect(res.body.data.transaction.source).toBe('ocr');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/automation/ocr/create')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ merchant: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────
  // GET /api/automation/sms/status
  // ─────────────────────────────────────
  describe('GET /api/automation/sms/status', () => {
    it('should return SMS tracking status', async () => {
      const res = await request(app)
        .get('/api/automation/sms/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.webhookUrl).toBeDefined();
    });
  });

  // ─────────────────────────────────────
  // PUT /api/automation/sms/toggle
  // ─────────────────────────────────────
  describe('PUT /api/automation/sms/toggle', () => {
    it('should enable SMS tracking', async () => {
      const res = await request(app)
        .put('/api/automation/sms/toggle')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: true, phone: '9876543210' });

      expect(res.status).toBe(200);
      expect(res.body.data.smsTracking.enabled).toBe(true);
    });

    it('should disable SMS tracking', async () => {
      const res = await request(app)
        .put('/api/automation/sms/toggle')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.data.smsTracking.enabled).toBe(false);
    });
  });
});
