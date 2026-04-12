const request = require('supertest');
const app     = require('../../../server-test');
const User    = require('../../models/User.model');

describe('Integration: Auth Flow', () => {
  const testUser = { name: 'Integration User', email: 'integration@spendwise.com', password: 'Secure@9876', currency: 'INR' };

  const getCookie = (res, name) => {
    const cookies = res.headers['set-cookie'] || [];
    const match = cookies.find(c => c.startsWith(`${name}=`));
    return match ? match.split(';')[0].split('=').slice(1).join('=') : null;
  };

  it('should complete full auth lifecycle: register → verify-otp → me → refresh', async () => {
    // Register
    const regRes = await request(app).post('/api/auth/register').send(testUser);
    expect(regRes.status).toBe(201);
    expect(regRes.body.data.requiresVerification).toBe(true);

    // Get OTP from DB
    const user = await User.findOne({ email: testUser.email.toLowerCase() }).select('+emailVerificationOTP +emailVerificationExpires');
    const otp = user.emailVerificationOTP;
    expect(otp).toBeDefined();

    // Verify OTP
    const verifyRes = await request(app).post('/api/auth/verify-otp').send({ email: testUser.email, otp });
    expect(verifyRes.status).toBe(200);
    const accessCookie = getCookie(verifyRes, 'sw_access');
    const refreshCookie = getCookie(verifyRes, 'sw_refresh');
    expect(accessCookie).toBeTruthy();

    // Get me
    const meRes = await request(app).get('/api/auth/me').set('Cookie', `sw_access=${accessCookie}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(testUser.email.toLowerCase());

    // Login (now verified)
    const loginRes = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
    expect(loginRes.status).toBe(200);
    const loginRefresh = getCookie(loginRes, 'sw_refresh');

    // Refresh
    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', `sw_refresh=${loginRefresh}`);
    expect(refreshRes.status).toBe(200);
    const newAccess = getCookie(refreshRes, 'sw_access');
    expect(newAccess).toBeTruthy();

    // New token works
    const me2 = await request(app).get('/api/auth/me').set('Cookie', `sw_access=${newAccess}`);
    expect(me2.status).toBe(200);
  });

  it('should reject invalid credentials', async () => {
    await User.create({ ...testUser, email: testUser.email.toLowerCase(), isEmailVerified: true, monthlyIncome: 0 });
    const res = await request(app).post('/api/auth/login').send({ email: testUser.email, password: 'Wrong@1234' });
    expect(res.status).toBe(401);
  });

  it('should reject invalid refresh tokens', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'invalid.token' });
    expect(res.status).toBe(401);
  });

  it('should reject requests with no auth', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
