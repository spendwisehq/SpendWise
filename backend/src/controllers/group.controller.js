// backend/src/controllers/group.controller.js
const Group = require('../models/Group.model');
const Split = require('../models/Split.model');
const User  = require('../models/User.model');

const isMember = (group, userId) => group.members.some(m => m.userId?.toString() === userId.toString());
const isAdmin  = (group, userId) => group.members.some(m => m.userId?.toString() === userId.toString() && m.role === 'admin');

// POST /api/groups
const createGroup = async (req, res, next) => {
  try {
    const { name, description, icon, color, type, currency, memberEmails } = req.body;
    if (!name?.trim()) return res.status(400).json({ success:false, message:'Group name is required.' });

    const members = [{ userId: req.user._id, name: req.user.name, email: req.user.email, role: 'admin' }];
    if (Array.isArray(memberEmails) && memberEmails.length > 0) {
      const users = await User.find({ email: { $in: memberEmails } }).lean();
      users.forEach(u => { if (u._id.toString() !== req.user._id.toString()) members.push({ userId: u._id, name: u.name, email: u.email, role: 'member' }); });
      memberEmails.forEach(email => { if (!users.find(u => u.email === email)) members.push({ userId: null, name: email.split('@')[0], email, role: 'member' }); });
    }

    const group = await Group.create({ name, description: description||null, icon: icon||'👥', color: color||'#6366F1', type: type||'other', currency: currency||req.user.currency||'INR', createdBy: req.user._id, members });
    return res.status(201).json({ success:true, message:'Group created.', data: { group } });
  } catch (error) { next(error); }
};

// GET /api/groups
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({ 'members.userId': req.user._id, isActive: true }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success:true, data: { groups, total: groups.length } });
  } catch (error) { next(error); }
};

// GET /api/groups/:id
const getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).lean();
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ success:false, message:'Not a member.' });
    const splits = await Split.find({ groupId: group._id }).sort({ date:-1 }).limit(10).lean();
    return res.status(200).json({ success:true, data: { group, recentSplits: splits } });
  } catch (error) { next(error); }
};

// PUT /api/groups/:id
const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success:false, message:'Only admins can update.' });
    ['name','description','icon','color','type'].forEach(f => { if (req.body[f] !== undefined) group[f] = req.body[f]; });
    await group.save();
    return res.status(200).json({ success:true, data: { group } });
  } catch (error) { next(error); }
};

// POST /api/groups/:id/members
const addMember = async (req, res, next) => {
  try {
    const { email, name, phone } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success:false, message:'Only admins can add members.' });

    const identifier = email || phone;
    if (!identifier) return res.status(400).json({ success:false, message:'Email or phone is required.' });

    const alreadyMember = group.members.some(m => m.email === email || m.phone === phone);
    if (alreadyMember) return res.status(409).json({ success:false, message:'Already a member.' });

    const user = email ? await User.findOne({ email }).lean() : null;
    group.members.push({ userId: user?._id || null, name: user?.name || name || identifier.split('@')[0], email: email || null, phone: phone || null, role: 'member' });
    await group.save();

    // TODO: Send invitation email/SMS when email service is configured
    return res.status(200).json({ success:true, message:'Member added.', data: { group } });
  } catch (error) { next(error); }
};

// DELETE /api/groups/:id/members/:memberId
const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success:false, message:'Only admins can remove members.' });
    group.members = group.members.filter(m => m._id?.toString() !== req.params.memberId);
    await group.save();
    return res.status(200).json({ success:true, data: { group } });
  } catch (error) { next(error); }
};

// DELETE /api/groups/:id
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success:false, message:'Only admins can delete.' });
    group.isActive = false;
    await group.save();
    return res.status(200).json({ success:true, message:'Group deleted.' });
  } catch (error) { next(error); }
};

// GET /api/groups/:id/balances — with per-member breakdown
const getBalances = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).lean();
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ success:false, message:'Not a member.' });

    const splits = await Split.find({ groupId: group._id, isSettled: false }).lean();

    // Build balance map: userId → netBalance
    const balanceMap = {};
    group.members.forEach(m => {
      if (m.userId) balanceMap[m.userId.toString()] = { name: m.name, balance: 0 };
    });

    splits.forEach(split => {
      const paidById = split.paidBy?.toString();
      if (paidById && balanceMap[paidById]) balanceMap[paidById].balance += split.totalAmount;

      split.shares.forEach(share => {
        if (share.userId && !share.isPaid) {
          const uid = share.userId.toString();
          if (balanceMap[uid]) balanceMap[uid].balance -= share.amount;
        }
      });
    });

    const myId       = req.user._id.toString();
    const myBalance  = balanceMap[myId]?.balance || 0;
    const memberBalances = Object.entries(balanceMap).map(([uid, { name, balance }]) => ({ userId: uid, name, netBalance: balance }));

    // Who I owe / who owes me
    const iOwe     = [];
    const owedToMe = [];
    splits.forEach(split => {
      const myShare = split.shares?.find(s => s.userId?.toString() === myId && !s.isPaid);
      if (myShare && split.paidBy?.toString() !== myId) {
        const payer = group.members.find(m => m.userId?.toString() === split.paidBy?.toString());
        if (payer) {
          const ex = iOwe.find(d => d.to === payer.name);
          if (ex) ex.amount += myShare.amount;
          else iOwe.push({ to: payer.name, amount: myShare.amount });
        }
      }
      if (split.paidBy?.toString() === myId) {
        split.shares?.forEach(s => {
          if (s.userId?.toString() !== myId && !s.isPaid) {
            const debtor = group.members.find(m => m.userId?.toString() === s.userId?.toString());
            if (debtor) {
              const ex = owedToMe.find(d => d.from === debtor.name);
              if (ex) ex.amount += s.amount;
              else owedToMe.push({ from: debtor.name, amount: s.amount });
            }
          }
        });
      }
    });

    return res.status(200).json({ success:true, data: { myBalance, memberBalances, iOwe, owedToMe } });
  } catch (error) { next(error); }
};

// GET /api/groups/:id/splits
const getSplits = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).lean();
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ success:false, message:'Not a member.' });
    const splits = await Split.find({ groupId: req.params.id }).sort({ date:-1 }).lean();
    return res.status(200).json({ success:true, data: { splits } });
  } catch (error) { next(error); }
};

// POST /api/groups/:id/splits
const addSplit = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success:false, message:'Group not found.' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ success:false, message:'Not a member.' });

    const { title, totalAmount, splitType, category, shares } = req.body;
    if (!title || !totalAmount) return res.status(400).json({ success:false, message:'Title and amount are required.' });

    let computedShares = [];
    const members = group.members.filter(m => m.userId);
    const count   = members.length || 1;

    if (splitType === 'equal') {
      const perPerson = totalAmount / count;
      computedShares  = members.map(m => ({ userId: m.userId, name: m.name, amount: parseFloat(perPerson.toFixed(2)), percentage: parseFloat((100/count).toFixed(2)), isPaid: m.userId.toString() === req.user._id.toString() }));
    } else if (splitType === 'custom' && Array.isArray(shares)) {
      computedShares = shares.map(s => ({ userId: s.userId, name: s.name, amount: parseFloat(s.amount), isPaid: s.userId?.toString() === req.user._id.toString() }));
    } else if (splitType === 'percentage' && Array.isArray(shares)) {
      computedShares = shares.map(s => ({ userId: s.userId, name: s.name, percentage: parseFloat(s.percentage), amount: parseFloat(((s.percentage/100)*totalAmount).toFixed(2)), isPaid: s.userId?.toString() === req.user._id.toString() }));
    }

    const split = await Split.create({ groupId: group._id, title, totalAmount, paidBy: req.user._id, splitType: splitType||'equal', shares: computedShares, category: category||'General', date: new Date() });

    // Update group total
    group.totalExpenses = (group.totalExpenses||0) + totalAmount;
    await group.save();

    return res.status(201).json({ success:true, message:'Expense added.', data: { split } });
  } catch (error) { next(error); }
};

// PUT /api/groups/:groupId/splits/:splitId/settle
const settleShare = async (req, res, next) => {
  try {
    const split = await Split.findById(req.params.splitId);
    if (!split) return res.status(404).json({ success:false, message:'Split not found.' });

    const share = split.shares.find(s => s.userId?.toString() === req.user._id.toString());
    if (share) { share.isPaid = true; share.paidAt = new Date(); }

    const allPaid = split.shares.every(s => s.isPaid || s.userId?.toString() === split.paidBy?.toString());
    if (allPaid) split.isSettled = true;
    await split.save();

    return res.status(200).json({ success:true, message:'Share settled.', data: { split } });
  } catch (error) { next(error); }
};

// GET /api/groups/:id/analytics
const getAnalytics = async (req, res, next) => {
  try {
    const splits = await Split.find({ groupId: req.params.id }).lean();
    const total  = splits.reduce((s, sp) => s + sp.totalAmount, 0);
    const byCategory = {};
    splits.forEach(s => { byCategory[s.category||'General'] = (byCategory[s.category||'General']||0) + s.totalAmount; });
    return res.status(200).json({ success:true, data: { total, count: splits.length, byCategory } });
  } catch (error) { next(error); }
};

module.exports = { createGroup, getGroups, getGroup, updateGroup, addMember, removeMember, deleteGroup, getBalances, getSplits, addSplit, settleShare, getAnalytics };