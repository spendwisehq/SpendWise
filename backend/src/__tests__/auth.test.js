const request = require('supertest');
const app     = require('../../server-test');
const User    = require('../models/User.model');

describe('Auth API', () => {
  const testUser = { name: 'Test User', email: 'test@spendwise.com', password: 'Test@1234', currency: 'INR' };

  // Helper to extract cookie value
  const getCookie = (res, name) => {
    const cookies = res.headers['set-cookie'] || [];
    const match = cookies.find(c => c.startsWith(`${name}=`));
    return match ? match.split(';')[0].split('=').slice(1).join('=') : null;
  };

  describe('POST /api/auth/register', () => {
    it('should register and require email verification', async () => {
      const res = await request(app).post('/api/auth/register').send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.requiresVerification).toBe(true);
    });

    it('should reject duplicate verified email', async () => {
      await User.create({ ...testUser, email: testUser.email.toLowerCase(), isEmailVerified: true, monthlyIncome: 0 });
      const res = await request(app).post('/api/auth/register').send(testUser);
      expect(res.status).toBe(409);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'test@test.com' });
      expect(res.status).toBe(422);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...testUser, email: 'notanemail' });
      expect(res.status).toBe(422);
    });

    it('should reject short password', async () => {
      const res = await request(app).post('/api/auth/register').send({ ...testUser, password: '123' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should verify OTP and return user with cookies', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const user = await User.findOne({ email: testUser.email.toLowerCase() }).select('+emailVerificationOTP');
      const otp = user.emailVerificationOTP;

      const res = await request(app).post('/api/auth/verify-otp').send({ email: testUser.email, otp });
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(getCookie(res, 'sw_access')).toBeTruthy();
    });

    it('should reject invalid OTP', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      const res = await request(app).post('/api/auth/verify-otp').send({ email: testUser.email, otp: '000000' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({ ...testUser, email: testUser.email.toLowerCase(), isEmailVerified: true, monthlyIncome: 0 });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(getCookie(res, 'sw_access')).toBeTruthy();
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: 'wrongpassword' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Test@1234' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid cookie', async () => {
      const user = await User.create({ ...testUser, email: testUser.email.toLowerCase(), isEmailVerified: true, monthlyIncome: 0 });
      const loginRes = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
      const accessCookie = getCookie(loginRes, 'sw_access');

      const res = await request(app).get('/api/auth/me').set('Cookie', `sw_access=${accessCookie}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should issue new tokens with valid refresh cookie', async () => {
      await User.create({ ...testUser, email: testUser.email.toLowerCase(), isEmailVerified: true, monthlyIncome: 0 });
      const loginRes = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
      const refreshCookie = getCookie(loginRes, 'sw_refresh');

      const res = await request(app).post('/api/auth/refresh').set('Cookie', `sw_refresh=${refreshCookie}`);
      expect(res.status).toBe(200);
      expect(getCookie(res, 'sw_access')).toBeTruthy();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalidtoken' });
      expect(res.status).toBe(401);
    });
  });
});
