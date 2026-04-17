// backend/src/controllers/split.controller.js

const Split = require('../models/Split.model');
const Group = require('../models/Group.model');

//─────────────────────────────────────
// HELPER — calculate balances for a group
//─────────────────────────────────────
const calculateBalances = (splits, members) => {
  // net[userId] = positive means they are owed, negative means they owe
  const net = {};

  members.forEach(m => {
    net[m.userId?.toString() || m.name] = 0;
  });

  splits.forEach(split => {
    const payerId = split.paidBy?.toString();

    split.shares.forEach(share => {
      const shareUserId = share.userId?.toString() || share.name;

      if (shareUserId === payerId) return; // payer's own share

      if (!share.isPaid) {
        // Share holder owes payer
        net[payerId]      = (net[payerId]      || 0) + share.amount;
        net[shareUserId]  = (net[shareUserId]  || 0) - share.amount;
      }
    });
  });

  // Simplify debts — who owes whom
  const debts = [];
  const creditors = Object.entries(net).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const debtors   = Object.entries(net).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);

  let i = 0, j = 0;
  const c = creditors.map(([id, amt]) => ({ id, amt }));
  const d = debtors.map(([id, amt])   => ({ id, amt: -amt }));

  while (i < c.length && j < d.length) {
    const settle = Math.min(c[i].amt, d[j].amt);
    debts.push({ from: d[j].id, to: c[i].id, amount: parseFloat(settle.toFixed(2)) });
    c[i].amt -= settle;
    d[j].amt -= settle;
    if (c[i].amt < 0.01) i++;
    if (d[j].amt < 0.01) j++;
  }

  return { net, debts };
};

//─────────────────────────────────────
// POST /api/groups/:groupId/splits
// Add expense split
//─────────────────────────────────────
const createSplit = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const {
      title, description, totalAmount, currency,
      category, date, splitType, shares,
    } = req.body;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (!group.members.some(m => m.userId?.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });
    }

    if (!title || !totalAmount) {
      return res.status(400).json({ success: false, message: 'title and totalAmount are required.' });
    }

    let finalShares = [];

    if (splitType === 'equal' || !splitType) {
      // Equal split among all members
      const memberList = shares?.length > 0 ? shares : group.members;
      const perPerson  = parseFloat((totalAmount / memberList.length).toFixed(2));

      finalShares = memberList.map((m, idx) => ({
        userId: m.userId || null,
        name:   m.name,
        amount: idx === 0
          ? parseFloat((totalAmount - perPerson * (memberList.length - 1)).toFixed(2))
          : perPerson,
        isPaid: m.userId?.toString() === req.user._id.toString(),
      }));

    } else if (splitType === 'custom') {
      // Custom amounts provided
      if (!shares?.length) {
        return res.status(400).json({ success: false, message: 'shares array is required for custom split.' });
      }
      const total = shares.reduce((s, sh) => s + sh.amount, 0);
      if (Math.abs(total - totalAmount) > 0.5) {
        return res.status(400).json({
          success: false,
          message: `Share amounts (₹${total}) must equal total amount (₹${totalAmount}).`,
        });
      }
      finalShares = shares.map(sh => ({
        userId: sh.userId || null,
        name:   sh.name,
        amount: sh.amount,
        isPaid: sh.userId?.toString() === req.user._id.toString(),
      }));

    } else if (splitType === 'percentage') {
      if (!shares?.length) {
        return res.status(400).json({ success: false, message: 'shares array is required for percentage split.' });
      }
      const totalPct = shares.reduce((s, sh) => s + sh.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        return res.status(400).json({ success: false, message: 'Percentages must add up to 100%.' });
      }
      finalShares = shares.map((sh, idx) => ({
        userId:     sh.userId || null,
        name:       sh.name,
        percentage: sh.percentage,
        amount:     parseFloat((totalAmount * sh.percentage / 100).toFixed(2)),
        isPaid:     sh.userId?.toString() === req.user._id.toString(),
      }));
    }

    const split = await Split.create({
      groupId,
      paidBy:      req.user._id,
      title,
      description: description || null,
      totalAmount,
      currency:    currency || group.currency || 'INR',
      category:    category || 'General',
      date:        date     || new Date(),
      splitType:   splitType || 'equal',
      shares:      finalShares,
    });

    // Update group total
    await Group.findByIdAndUpdate(groupId, {
      $inc: { totalExpenses: totalAmount },
    });

    return res.status(201).json({
      success: true,
      message: 'Expense split created.',
      data: { split },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/groups/:groupId/splits
// Get all splits for a group
//─────────────────────────────────────
const getSplits = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page  || '1'));
    const limit = Math.min(50, parseInt(req.query.limit || '20'));
    const skip  = (page - 1) * limit;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (!group.members.some(m => m.userId?.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not a group member.' });
    }

    const [splits, total] = await Promise.all([
      Split.find({ groupId }).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Split.countDocuments({ groupId }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        splits,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/groups/:groupId/balances
// Calculate who owes whom
//─────────────────────────────────────
const getBalances = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    if (!group.members.some(m => m.userId?.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not a group member.' });
    }

    const splits = await Split.find({ groupId, isSettled: false }).lean();
    const { net, debts } = calculateBalances(splits, group.members);

    // My balance specifically
    const myId      = req.user._id.toString();
    const myBalance = net[myId] || 0;

    const iOwe    = debts.filter(d => d.from === myId);
    const owedToMe = debts.filter(d => d.to   === myId);

    return res.status(200).json({
      success: true,
      data: {
        myBalance,
        iOwe,
        owedToMe,
        allDebts:    debts,
        netBalances: net,
        totalGroupExpenses: group.totalExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// PUT /api/groups/:groupId/splits/:splitId/settle
// Mark a share as paid / settle
//─────────────────────────────────────
const settleSplit = async (req, res, next) => {
  try {
    const { groupId, splitId } = req.params;
    const { userId } = req.body; // whose share to mark as paid

    const split = await Split.findOne({ _id: splitId, groupId });
    if (!split) {
      return res.status(404).json({ success: false, message: 'Split not found.' });
    }

    const targetUserId = userId || req.user._id.toString();

    // Find the share
    const share = split.shares.find(
      s => s.userId?.toString() === targetUserId
    );

    if (!share) {
      return res.status(404).json({ success: false, message: 'Share not found for this user.' });
    }

    share.isPaid  = true;
    share.paidAt  = new Date();

    // Check if all shares are paid
    const allPaid = split.shares.every(s =>
      s.isPaid || s.userId?.toString() === split.paidBy?.toString()
    );

    if (allPaid) {
      split.isSettled = true;
      split.settledAt = new Date();
    }

    await split.save();

    return res.status(200).json({
      success: true,
      message: allPaid ? 'Split fully settled!' : 'Share marked as paid.',
      data: { split },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/groups/:groupId/settle-all
// Settle all debts between two users
//─────────────────────────────────────
const settleAll = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { withUserId } = req.body;

    if (!withUserId) {
      return res.status(400).json({ success: false, message: 'withUserId is required.' });
    }

    // Find all splits where current user owes withUserId
    const splits = await Split.find({
      groupId,
      isSettled: false,
      paidBy: withUserId,
    });

    let settledCount = 0;

    for (const split of splits) {
      const share = split.shares.find(
        s => s.userId?.toString() === req.user._id.toString() && !s.isPaid
      );
      if (share) {
        share.isPaid = true;
        share.paidAt = new Date();
        settledCount++;

        const allPaid = split.shares.every(
          s => s.isPaid || s.userId?.toString() === split.paidBy?.toString()
        );
        if (allPaid) {
          split.isSettled = true;
          split.settledAt = new Date();
        }
        await split.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Settled ${settledCount} expense(s).`,
      data: { settledCount },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/groups/:groupId/analytics
// Group spending analytics
//─────────────────────────────────────
const getGroupAnalytics = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const group  = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    const splits = await Split.find({ groupId }).lean();

    // By category
    const byCategory = {};
    splits.forEach(s => {
      const k = s.category || 'General';
      byCategory[k] = (byCategory[k] || 0) + s.totalAmount;
    });

    // By member (how much each paid)
    const byMember = {};
    splits.forEach(s => {
      const k = s.paidBy?.toString();
      if (k) byMember[k] = (byMember[k] || 0) + s.totalAmount;
    });

    // Monthly trend
    const byMonth = {};
    splits.forEach(s => {
      const key = new Date(s.date).toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      byMonth[key] = (byMonth[key] || 0) + s.totalAmount;
    });

    return res.status(200).json({
      success: true,
      data: {
        totalExpenses:  group.totalExpenses,
        totalSplits:    splits.length,
        settledSplits:  splits.filter(s => s.isSettled).length,
        pendingSplits:  splits.filter(s => !s.isSettled).length,
        byCategory,
        byMember,
        byMonth,
        perMemberAvg:   group.members.length > 0
          ? parseFloat((group.totalExpenses / group.members.length).toFixed(2))
          : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/groups/:groupId/splits/:splitId/detail
//─────────────────────────────────────
const getSplitDetail = async (req, res, next) => {
  try {
    const { groupId, splitId } = req.params;

    const group = await Group.findById(groupId).lean();
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });

    if (!group.members.some(m => m.userId?.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Not a group member.' });
    }

    const split = await Split.findOne({ _id: splitId, groupId }).lean();
    if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

    return res.status(200).json({ success: true, data: { split } });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/groups/:groupId/splits/:splitId/comments
//─────────────────────────────────────
const addComment = async (req, res, next) => {
  try {
    const { groupId, splitId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const split = await Split.findOne({ _id: splitId, groupId });
    if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

    const comment = {
      userId: req.user._id,
      name:   req.user.name,
      text:   text.trim(),
      createdAt: new Date(),
    };

    split.comments = split.comments || [];
    split.comments.push(comment);
    await split.save();

    return res.status(201).json({ success: true, message: 'Comment added.', data: { comment } });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// DELETE /api/groups/:groupId/splits/:splitId/comments/:commentId
//─────────────────────────────────────
const deleteComment = async (req, res, next) => {
  try {
    const { groupId, splitId, commentId } = req.params;

    const split = await Split.findOne({ _id: splitId, groupId });
    if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

    const commentIndex = (split.comments || []).findIndex(
      c => c._id?.toString() === commentId
    );
    if (commentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    if (split.comments[commentIndex].userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this comment.' });
    }

    split.comments.splice(commentIndex, 1);
    await split.save();

    return res.status(200).json({ success: true, message: 'Comment deleted.' });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/groups/:groupId/splits/:splitId/bill
//─────────────────────────────────────
const uploadBill = async (req, res, next) => {
  try {
    const { groupId, splitId } = req.params;

    const split = await Split.findOne({ _id: splitId, groupId });
    if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

    // Requires a file-upload middleware (e.g. multer) mounted on this route
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    split.billUrl      = req.file.path || req.file.location || req.file.filename;
    split.billOrigName = req.file.originalname;
    await split.save();

    return res.status(200).json({
      success: true,
      message: 'Bill uploaded.',
      data: { billUrl: split.billUrl },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// DELETE /api/groups/:groupId/splits/:splitId/bill
//─────────────────────────────────────
const deleteBill = async (req, res, next) => {
  try {
    const { groupId, splitId } = req.params;

    const split = await Split.findOne({ _id: splitId, groupId });
    if (!split) return res.status(404).json({ success: false, message: 'Split not found.' });

    split.billUrl      = undefined;
    split.billOrigName = undefined;
    await split.save();

    return res.status(200).json({ success: true, message: 'Bill removed.' });
  } catch (error) {
    next(error);
  }
};

const updateSplit = async (req, res) => {
  try {
    const { groupId, splitId } = req.params;
    const { title, totalAmount, category, splitType, paidBy, notes, shares } = req.body;
 
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
 
    // Check user is a member
    const member = group.members.find(m => m.userId?.toString() === req.user._id?.toString());
    if (!member) return res.status(403).json({ message: 'Not a member of this group' });
 
    const split = await Split.findOne({ _id: splitId, groupId });
    if (!split) return res.status(404).json({ message: 'Expense not found' });
 
    // Update fields
    if (title       !== undefined) split.title       = title.trim();
    if (totalAmount !== undefined) split.totalAmount  = parseFloat(totalAmount);
    if (category    !== undefined) split.category     = category.trim();
    if (notes       !== undefined) split.notes        = notes;
 
    // Handle paidBy change
    if (paidBy !== undefined) {
      const paidByMember = group.members.find(m => m.userId?.toString() === paidBy?.toString());
      split.paidBy     = paidBy;
      split.paidByName = paidByMember?.name || split.paidByName;
    }
 
    // Handle splitType + shares change
    if (splitType !== undefined) {
      split.splitType = splitType;
      if (splitType === 'equal') {
  const memberList = (shares && shares.length > 0) ? shares : group.members;
  const perPerson = split.totalAmount / memberList.length;
  split.shares = memberList.map(m => ({
          userId:  m.userId,
          name:    m.name,
          amount:  parseFloat(perPerson.toFixed(2)),
          isPaid:  m.userId?.toString() === split.paidBy?.toString(),
        }));
      } else if (shares && Array.isArray(shares)) {
        split.shares = shares.map(s => ({
          userId:     s.userId,
          name:       s.name,
          amount:     s.amount     ? parseFloat(s.amount)     : parseFloat((split.totalAmount / group.members.length).toFixed(2)),
          percentage: s.percentage ? parseFloat(s.percentage) : undefined,
          isPaid:     s.userId?.toString() === split.paidBy?.toString(),
        }));
      }
    }
 
    await split.save();
 
    // Emit socket event if you have socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`group_${groupId}`).emit('split_updated', { groupId, split });
    }
 
    return res.status(200).json({
  success: true,
  message: 'Expense updated successfully.',
  data: { split },
});
  } catch (err) {
    console.error('[updateSplit]', err);
    res.status(500).json({ message: err.message });
  }
};
 
// ── Also add deleteSplit if missing ──────────────────────────────────────────
const deleteSplit = async (req, res) => {
  try {
    const { groupId, splitId } = req.params;
 
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
 
    const member = group.members.find(m => m.userId?.toString() === req.user._id?.toString());
    if (!member) return res.status(403).json({ message: 'Not a member' });
 
    const split = await Split.findOneAndDelete({ _id: splitId, groupId });
    if (!split) return res.status(404).json({ message: 'Expense not found' });
 
    // Update group total
    group.totalExpenses = (group.totalExpenses || 0) - split.totalAmount;
    await group.save();
 
    const io = req.app.get('io');
    if (io) io.to(`group_${groupId}`).emit('split_deleted', { groupId, splitId });
 
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
   createSplit,
   getSplits,
   getSplitDetail,    // already exists
   updateSplit,       // ← ADD
   deleteSplit,       // ← ADD
   getBalances,
   settleSplit,
   settleAll,
   getGroupAnalytics,
   addComment,
   deleteComment,
   uploadBill,
   deleteBill,
};