const request = require('supertest');
const app     = require('../../server-test');
const { createAuthenticatedUser } = require('./helpers');

describe('Group & Split API', () => {
  let tokenA, tokenB, tokenC, userAId, userBId, userCId;

  beforeEach(async () => {
    const [authA, authB, authC] = await Promise.all([
      createAuthenticatedUser({ name: 'Alice', email: `alice${Date.now()}@test.com` }),
      createAuthenticatedUser({ name: 'Bob',   email: `bob${Date.now()}@test.com` }),
      createAuthenticatedUser({ name: 'Carol', email: `carol${Date.now()}@test.com` }),
    ]);
    tokenA = authA.accessToken; userAId = authA.userId;
    tokenB = authB.accessToken; userBId = authB.userId;
    tokenC = authC.accessToken; userCId = authC.userId;
  });

  const createGroup = async (data = {}, token = tokenA) => {
    return request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({ name: 'Trip', type: 'trip', ...data });
  };

  // GROUP CRUD
  describe('POST /api/groups', () => {
    it('should create a group with creator as admin', async () => {
      const res = await createGroup();
      expect(res.status).toBe(201);
      expect(res.body.data.group.members[0].role).toBe('admin');
    });

    it('should reject group without name', async () => {
      const res = await createGroup({ name: '' });
      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/groups').send({ name: 'X' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/groups', () => {
    it('should return groups where user is a member', async () => {
      await createGroup();
      await createGroup({ name: 'Second' });
      const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.groups).toHaveLength(2);
    });

    it('should not return other users groups', async () => {
      await createGroup();
      const res = await request(app).get('/api/groups').set('Authorization', `Bearer ${tokenB}`);
      expect(res.body.data.groups).toHaveLength(0);
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should return group details', async () => {
      const group = (await createGroup()).body.data.group;
      const res = await request(app).get(`/api/groups/${group._id}`).set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
    });

    it('should reject non-member', async () => {
      const group = (await createGroup()).body.data.group;
      const res = await request(app).get(`/api/groups/${group._id}`).set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent group', async () => {
      const res = await request(app).get('/api/groups/000000000000000000000000').set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/groups/:id', () => {
    it('should allow admin to update', async () => {
      const group = (await createGroup()).body.data.group;
      const res = await request(app).put(`/api/groups/${group._id}`).set('Authorization', `Bearer ${tokenA}`).send({ name: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.group.name).toBe('Updated');
    });
  });

  describe('DELETE /api/groups/:id', () => {
    it('should soft-delete group', async () => {
      const group = (await createGroup()).body.data.group;
      const res = await request(app).delete(`/api/groups/${group._id}`).set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const list = await request(app).get('/api/groups').set('Authorization', `Bearer ${tokenA}`);
      expect(list.body.data.groups).toHaveLength(0);
    });
  });

  // MEMBERS
  describe('POST /api/groups/:id/members', () => {
    it('should add a member by email', async () => {
      const group = (await createGroup()).body.data.group;
      const bobUser = await require('../models/User.model').findById(userBId);
      const res = await request(app).post(`/api/groups/${group._id}/members`).set('Authorization', `Bearer ${tokenA}`).send({ email: bobUser.email });
      expect(res.status).toBe(200);
      expect(res.body.data.group.members).toHaveLength(2);
    });
  });

  // SPLITS
  describe('POST /api/groups/:groupId/splits', () => {
    let groupId, bobEmail, carolEmail;

    beforeEach(async () => {
      const [bobUser, carolUser] = await Promise.all([
        require('../models/User.model').findById(userBId),
        require('../models/User.model').findById(userCId),
      ]);
      bobEmail = bobUser.email;
      carolEmail = carolUser.email;
      const group = (await createGroup({ memberEmails: [bobEmail, carolEmail] })).body.data.group;
      groupId = group._id;
    });

    it('should create equal split among all members', async () => {
      const res = await request(app).post(`/api/groups/${groupId}/splits`).set('Authorization', `Bearer ${tokenA}`).send({ title: 'Dinner', totalAmount: 900, splitType: 'equal' });
      expect(res.status).toBe(201);
      expect(res.body.data.split.shares).toHaveLength(3);
      const total = res.body.data.split.shares.reduce((s, sh) => s + sh.amount, 0);
      expect(total).toBe(900);
    });

    it('should create custom split', async () => {
      const res = await request(app).post(`/api/groups/${groupId}/splits`).set('Authorization', `Bearer ${tokenA}`).send({
        title: 'Hotel', totalAmount: 1000, splitType: 'custom',
        shares: [
          { userId: userAId, name: 'Alice', amount: 500 },
          { userId: userBId, name: 'Bob', amount: 300 },
          { userId: userCId, name: 'Carol', amount: 200 },
        ],
      });
      expect(res.status).toBe(201);
    });

    it('should reject custom split with mismatched total', async () => {
      const res = await request(app).post(`/api/groups/${groupId}/splits`).set('Authorization', `Bearer ${tokenA}`).send({
        title: 'Bad', totalAmount: 1000, splitType: 'custom',
        shares: [{ userId: userAId, name: 'Alice', amount: 200 }, { userId: userBId, name: 'Bob', amount: 200 }],
      });
      expect(res.status).toBe(400);
    });

    it('should create percentage split', async () => {
      const res = await request(app).post(`/api/groups/${groupId}/splits`).set('Authorization', `Bearer ${tokenA}`).send({
        title: 'Travel', totalAmount: 1000, splitType: 'percentage',
        shares: [
          { userId: userAId, name: 'Alice', percentage: 50 },
          { userId: userBId, name: 'Bob', percentage: 30 },
          { userId: userCId, name: 'Carol', percentage: 20 },
        ],
      });
      expect(res.status).toBe(201);
      expect(res.body.data.split.shares.find(s => s.name === 'Alice').amount).toBe(500);
    });

    it('should reject split without title', async () => {
      const res = await request(app).post(`/api/groups/${groupId}/splits`).set('Authorization', `Bearer ${tokenA}`).send({ totalAmount: 500 });
      expect(res.status).toBe(400);
    });
  });

  // BALANCES
  describe('GET /api/groups/:groupId/balances', () => {
    it('should calculate correct balances', async () => {
      const bobUser = await require('../models/User.model').findById(userBId);
      const group = (await createGroup({ memberEmails: [bobUser.email] })).body.data.group;
      await request(app).post(`/api/groups/${group._id}/splits`).set('Authorization', `Bearer ${tokenA}`).send({ title: 'Dinner', totalAmount: 1000, splitType: 'equal' });
      const res = await request(app).get(`/api/groups/${group._id}/balances`).set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.myBalance).toBe(500);
    });
  });

  // SETTLE
  describe('PUT /api/groups/:groupId/splits/:splitId/settle', () => {
    it('should mark share as paid', async () => {
      const bobUser = await require('../models/User.model').findById(userBId);
      const group = (await createGroup({ memberEmails: [bobUser.email] })).body.data.group;
      const splitRes = await request(app).post(`/api/groups/${group._id}/splits`).set('Authorization', `Bearer ${tokenA}`).send({ title: 'Dinner', totalAmount: 1000, splitType: 'equal' });
      const splitId = splitRes.body.data.split._id;
      const res = await request(app).put(`/api/groups/${group._id}/splits/${splitId}/settle`).set('Authorization', `Bearer ${tokenB}`).send({ userId: userBId });
      expect(res.status).toBe(200);
      expect(res.body.data.split.isSettled).toBe(true);
    });
  });
});
