// backend/src/controllers/group.controller.js — FULL REPLACEMENT

const Group  = require('../models/Group.model');
const Split  = require('../models/Split.model');
const User   = require('../models/User.model');
const crypto = require('crypto');
const { sendGroupInviteEmail } = require('../services/email.service');
const { sendFriendInviteSMS  } = require('../services/sms.service');

// ─────────────────────────────────────
// HELPERS
// ─────────────────────────────────────
const isMember = (group, userId) =>
  group.members.some(m => m.userId?.toString() === userId.toString());

const isAdmin = (group, userId) =>
  group.members.some(m => m.userId?.toString() === userId.toString() && m.role === 'admin');

// Emit real-time event if socket.io is attached to the app
const emitGroupUpdate = (req, groupId, event, payload) => {
  try {
    const io = req.app.get('io');
    if (io) io.to(`group:${groupId}`).emit(event, payload);
  } catch (_) {}
};

// ─────────────────────────────────────
// POST /api/groups
// ─────────────────────────────────────
const createGroup = async (req, res, next) => {
  try {
    const { name, description, icon, color, type, currency, memberEmails } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    const members = [{
      userId: req.user._id,
      name:   req.user.name,
      email:  req.user.email,
      role:   'admin',
    }];

    if (Array.isArray(memberEmails) && memberEmails.length > 0) {
      const users = await User.find({ email: { $in: memberEmails } }).lean();
      users.forEach(u => {
        if (u._id.toString() !== req.user._id.toString()) {
          members.push({ userId: u._id, name: u.name, email: u.email, role: 'member' });
        }
      });
      memberEmails.forEach(email => {
        if (!users.find(u => u.email === email)) {
          members.push({ userId: null, name: email.split('@')[0], email, role: 'member' });
        }
      });
    }

    const group = new Group({
      name, description: description || null,
      icon: icon || '👥', color: color || '#1D9E75',
      type: type || 'other',
      currency: currency || req.user.currency || 'INR',
      createdBy: req.user._id, members,
    });

    // Auto-generate invite token on creation
    group.generateInviteToken();
    await group.save();

    return res.status(201).json({
      success: true,
      message: 'Group created successfully.',
      data: { group },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// GET /api/groups
// ─────────────────────────────────────
const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({
      'members.userId': req.user._id,
      isActive: true,
    }).sort({ updatedAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      data: { groups, total: groups.length },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// GET /api/groups/:id
// ─────────────────────────────────────
const getGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id).lean();
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ success: false, message: 'You are not a member of this group.' });

    const splits = await Split.find({ groupId: group._id }).sort({ date: -1 }).limit(10).lean();

    return res.status(200).json({
      success: true,
      data: { group, recentSplits: splits },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// PUT /api/groups/:id
// ─────────────────────────────────────
const updateGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, message: 'Only admins can update the group.' });

    const allowed = ['name', 'description', 'icon', 'color', 'type'];
    allowed.forEach(field => { if (req.body[field] !== undefined) group[field] = req.body[field]; });
    await group.save();

    emitGroupUpdate(req, group._id, 'group_updated', { group: group.toObject() });

    return res.status(200).json({ success: true, message: 'Group updated.', data: { group } });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// POST /api/groups/:id/members
// Add member (email or phone)
// ─────────────────────────────────────
const addMember = async (req, res, next) => {
  try {
    const { email, phone, name } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, message: 'Only admins can add members.' });

    const identifier = email || phone;
    if (!identifier) return res.status(400).json({ success: false, message: 'Email or phone is required.' });

    // Check already a member
    const already = group.members.some(m =>
      (email && m.email === email) ||
      (phone && m.phone === phone)
    );
    if (already) return res.status(409).json({ success: false, message: 'This person is already in the group.' });

    // Try to find existing SpendWise user
    const existingUser = email
      ? await User.findOne({ email }).lean()
      : await User.findOne({ phone: { $regex: phone.replace(/^\+91/, '') } }).lean();

    const memberEntry = {
      userId: existingUser?._id || null,
      name:   existingUser?.name || name || (email ? email.split('@')[0] : phone),
      email:  email || existingUser?.email || null,
      phone:  phone || existingUser?.phone || null,
      role:   'member',
    };

    group.members.push(memberEntry);
    await group.save();

    // ── Send invite notification ──────────────────────────────────────────
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${group.inviteToken}`;

    if (existingUser) {
      // Already on SpendWise — send group invite email
      if (email || existingUser.email) {
        try {
          await sendGroupInviteEmail({
            to:          existingUser.email,
            inviteeName: existingUser.name,
            inviterName: req.user.name,
            groupName:   group.name,
            groupType:   group.type,
          });
        } catch (e) { console.warn('Group invite email failed:', e.message); }
      }
    } else {
      // New user — send registration invite with group join link
      if (email) {
        try {
          await sendGroupInviteEmail({
            to:          email,
            inviteeName: name || email.split('@')[0],
            inviterName: req.user.name,
            groupName:   group.name,
            groupType:   group.type,
            inviteLink,               // ← join link included for new users
            isNewUser:   true,
          });
        } catch (e) { console.warn('New user invite email failed:', e.message); }
      }
      if (phone) {
        const normalized = phone.replace(/^\+91/, '').replace(/\D/g, '');
        try {
          await sendFriendInviteSMS({
            phone:     normalized,
            fromName:  req.user.name,
            inviteLink,
          });
        } catch (e) { console.warn('SMS invite failed:', e.message); }
      }
    }

    // Emit real-time update to all group members
    emitGroupUpdate(req, group._id, 'member_added', {
      groupId: group._id,
      member:  memberEntry,
    });

    return res.status(200).json({
      success: true,
      message: existingUser
        ? `${memberEntry.name} added to group! They've been notified.`
        : `Invite sent to ${email || phone}. They'll join after creating an account.`,
      data: { group },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// DELETE /api/groups/:id/members/:memberId
// ─────────────────────────────────────
const removeMember = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, message: 'Only admins can remove members.' });

    const removedMember = group.members.find(m => m._id?.toString() === req.params.memberId);
    group.members = group.members.filter(m => m._id?.toString() !== req.params.memberId);
    await group.save();

    emitGroupUpdate(req, group._id, 'member_removed', {
      groupId:  group._id,
      memberId: req.params.memberId,
    });

    return res.status(200).json({ success: true, message: 'Member removed.', data: { group } });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// DELETE /api/groups/:id
// ─────────────────────────────────────
const deleteGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, message: 'Only admins can delete the group.' });

    group.isActive = false;
    await group.save();

    emitGroupUpdate(req, group._id, 'group_deleted', { groupId: group._id });

    return res.status(200).json({ success: true, message: 'Group deleted.' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// POST /api/groups/:id/leave
// ─────────────────────────────────────
const leaveGroup = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isMember(group, req.user._id)) return res.status(403).json({ success: false, message: 'You are not a member.' });

    const myMembership = group.members.find(m => m.userId?.toString() === req.user._id.toString());

    if (myMembership?.role === 'admin') {
      const otherAdmins = group.members.filter(m =>
        m.role === 'admin' && m.userId?.toString() !== req.user._id.toString()
      );
      if (otherAdmins.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'You are the only admin. Transfer admin to another member or delete the group.',
        });
      }
    }

    group.members = group.members.filter(m => m.userId?.toString() !== req.user._id.toString());
    await group.save();

    emitGroupUpdate(req, group._id, 'member_left', {
      groupId: group._id,
      userId:  req.user._id,
    });

    return res.status(200).json({ success: true, message: `You have left "${group.name}".` });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// GET /api/groups/join/:token   (PUBLIC — no auth required)
// Preview group before joining
// ─────────────────────────────────────
const previewInvite = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      inviteToken: req.params.token,
      isActive:    true,
    }).lean();

    if (!group) {
      return res.status(404).json({ success: false, message: 'Invite link is invalid or has expired.' });
    }

    // Return safe preview (no financial details)
    return res.status(200).json({
      success: true,
      data: {
        group: {
          _id:         group._id,
          name:        group.name,
          type:        group.type,
          icon:        group.icon,
          memberCount: group.members.length,
          memberNames: group.members.slice(0, 3).map(m => m.name),
          createdBy:   group.members.find(m => m.role === 'admin')?.name || 'Someone',
        },
      },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// POST /api/groups/join/:token   (protected — must be logged in)
// Join a group via invite link
// ─────────────────────────────────────
const joinViaLink = async (req, res, next) => {
  try {
    const group = await Group.findOne({
      inviteToken: req.params.token,
      isActive:    true,
    });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Invite link is invalid or has expired.' });
    }

    // Already a member?
    if (isMember(group, req.user._id)) {
      return res.status(200).json({
        success: true,
        message: 'You are already a member of this group.',
        data: { group, alreadyMember: true },
      });
    }

    // Add user to group
    const memberEntry = {
      userId:  req.user._id,
      name:    req.user.name,
      email:   req.user.email,
      role:    'member',
      joinedAt: new Date(),
    };

    // If they were a pending placeholder (invited by email), update that entry
    const pendingIdx = group.members.findIndex(
      m => !m.userId && m.email === req.user.email
    );

    if (pendingIdx !== -1) {
      // Upgrade pending placeholder to real user
      group.members[pendingIdx].userId   = req.user._id;
      group.members[pendingIdx].name     = req.user.name;
      group.members[pendingIdx].joinedAt = new Date();
    } else {
      group.members.push(memberEntry);
    }

    await group.save();

    // Notify existing members in real-time
    emitGroupUpdate(req, group._id, 'member_joined', {
      groupId: group._id,
      member:  memberEntry,
    });

    return res.status(200).json({
      success: true,
      message: `You joined "${group.name}"! Welcome! 🎉`,
      data: { group, alreadyMember: false },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// POST /api/groups/:id/invite/regenerate   (admin only)
// Regenerate invite token (invalidates old link)
// ─────────────────────────────────────
const regenerateInviteToken = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, message: 'Only admins can regenerate the invite link.' });

    const newToken = group.generateInviteToken();
    await group.save();

    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join/${newToken}`;

    return res.status(200).json({
      success: true,
      message: 'Invite link regenerated. The old link is now invalid.',
      data: { inviteToken: newToken, inviteLink },
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────
// PUT /api/groups/:id/members/:memberId/role
// Transfer admin role
// ─────────────────────────────────────
const transferAdmin = async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found.' });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, message: 'Only admins can transfer admin role.' });

    const target = group.members.find(m => m._id?.toString() === req.params.memberId);
    if (!target) return res.status(404).json({ success: false, message: 'Member not found.' });

    group.members.forEach(m => {
      if (m.userId?.toString() === req.user._id.toString()) m.role = 'member';
      if (m._id?.toString() === req.params.memberId)        m.role = 'admin';
    });

    await group.save();

    return res.status(200).json({
      success: true,
      message: `${target.name} is now the group admin.`,
      data: { group },
    });
  } catch (error) { next(error); }
};

module.exports = {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  addMember,
  removeMember,
  deleteGroup,
  leaveGroup,
  previewInvite,
  joinViaLink,
  regenerateInviteToken,
  transferAdmin,
};