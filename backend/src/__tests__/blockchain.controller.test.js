const request = require('supertest');
const app     = require('../../server-test');
const Transaction = require('../models/Transaction.model');
const AuditTrail  = require('../models/AuditTrail.model');
const { createAuthenticatedUser } = require('./helpers');

describe('Blockchain Audit API', () => {
  let accessToken, userId;

  const testTransaction = {
    type: 'expense', amount: 500, merchant: 'Swiggy',
    categoryName: 'Food & Dining', paymentMethod: 'upi', date: new Date().toISOString(),
  };

  beforeEach(async () => {
    const auth = await createAuthenticatedUser({ name: 'Auditor', email: `audit${Date.now()}@test.com` });
    accessToken = auth.accessToken;
    userId = auth.userId;
  });

  const createTxn = async () => {
    const res = await request(app).post('/api/transactions').set('Authorization', `Bearer ${accessToken}`).send(testTransaction);
    return res.body.data.transaction._id;
  };

  describe('POST /api/blockchain/audit/:transactionId', () => {
    it('should audit a single transaction', async () => {
      const txnId = await createTxn();
      const res = await request(app).post(`/api/blockchain/audit/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.hash).toBeDefined();
      expect(res.body.data.chainHash).toBeDefined();
    });

    it('should return 404 for non-existent transaction', async () => {
      const res = await request(app).post('/api/blockchain/audit/000000000000000000000000').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });

    it('should be idempotent (re-auditing same transaction)', async () => {
      const txnId = await createTxn();
      await request(app).post(`/api/blockchain/audit/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      const res = await request(app).post(`/api/blockchain/audit/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/blockchain/audit-all', () => {
    it('should audit all unaudited transactions', async () => {
      await createTxn();
      await createTxn();
      const res = await request(app).post('/api/blockchain/audit-all').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.audited).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/blockchain/verify/:transactionId', () => {
    it('should verify an audited transaction', async () => {
      const txnId = await createTxn();
      await request(app).post(`/api/blockchain/audit/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      const res = await request(app).get(`/api/blockchain/verify/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(true);
    });

    it('should detect tampered transaction', async () => {
      const txnId = await createTxn();
      await request(app).post(`/api/blockchain/audit/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      // Tamper the transaction amount directly
      await Transaction.findByIdAndUpdate(txnId, { amount: 99999 });
      const res = await request(app).get(`/api/blockchain/verify/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(false);
    });
  });

  describe('GET /api/blockchain/verify-chain', () => {
    it('should verify intact chain', async () => {
      const id1 = await createTxn();
      const id2 = await createTxn();
      await request(app).post(`/api/blockchain/audit/${id1}`).set('Authorization', `Bearer ${accessToken}`);
      await request(app).post(`/api/blockchain/audit/${id2}`).set('Authorization', `Bearer ${accessToken}`);
      const res = await request(app).get('/api/blockchain/verify-chain').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(true);
    });

    it('should detect broken chain', async () => {
      const id1 = await createTxn();
      const id2 = await createTxn();
      await request(app).post(`/api/blockchain/audit/${id1}`).set('Authorization', `Bearer ${accessToken}`);
      await request(app).post(`/api/blockchain/audit/${id2}`).set('Authorization', `Bearer ${accessToken}`);
      // Tamper the chain hash directly
      const audit = await AuditTrail.findOne({ transactionId: id2 });
      if (audit) {
        await AuditTrail.findByIdAndUpdate(audit._id, { chainHash: 'tampered_hash' });
      }
      const res = await request(app).get('/api/blockchain/verify-chain').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
    });
  });

  describe('GET /api/blockchain/trail', () => {
    it('should return audit trail', async () => {
      const txnId = await createTxn();
      await request(app).post(`/api/blockchain/audit/${txnId}`).set('Authorization', `Bearer ${accessToken}`);
      const res = await request(app).get('/api/blockchain/trail').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.entries).toHaveLength(1);
    });
  });

  describe('GET /api/blockchain/stats', () => {
    it('should return blockchain stats', async () => {
      const res = await request(app).get('/api/blockchain/stats').set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });
});
