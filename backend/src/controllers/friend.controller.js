// backend/src/controllers/friend.controller.js
const User = require('../models/User.model');
const nodemailer = require('nodemailer');
const { env } = require('../config/env');

// Email transporter using env
const createTransporter = () => nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465,
  auth: {
    user: env.email.user,
    pass: env.email.pass,
  },
});

const sendFriendInviteEmail = async (email, fromName) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"SpendWise" <${env.email.user}>`,
    to: email,
    subject: `SpendWise — ${fromName} invited you to join!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#F8FAFC;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="background:#6366F1;color:white;display:inline-block;padding:10px 20px;border-radius:8px;font-size:18px;font-weight:700;">SpendWise</div>
        </div>
        <h2 style="color:#0F172A;margin-bottom:8px;">Hi there 👋</h2>
        <p style="color:#475569;margin-bottom:24px;">Your friend <strong>${fromName}</strong> has invited you to join SpendWise, the AI-powered personal finance and expense splitting app.</p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${env.frontend.url}/register" style="display:inline-block;background:#1D9E75;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Join SpendWise</a>
        </div>
        <p style="color:#94A3B8;font-size:12px;text-align:center;">If you did not expect this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

// 1. Search users by email or name
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 3 characters' });
    }
    
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude self
        { 
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    }).select('name email avatar initials');
    
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// 2. Send Friend Request or Invite
const sendRequestOrInvite = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const targetUser = await User.findOne({ email: email.toLowerCase() });
    
    if (targetUser) {
      // User exists -> Send friend request
      if (targetUser._id.equals(req.user._id)) {
        return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself' });
      }
      
      // Check if already friends
      if (req.user.friends.includes(targetUser._id)) {
         return res.status(400).json({ success: false, message: 'You are already friends with this user' });
      }
      
      // Check if request already sent
      if (targetUser.friendRequests.includes(req.user._id)) {
        return res.status(400).json({ success: false, message: 'Friend request already sent' });
      }
      
      targetUser.friendRequests.push(req.user._id);
      await targetUser.save({ validateBeforeSave: false });
      
      return res.status(200).json({ success: true, message: `Friend request sent to ${targetUser.name}` });
    } else {
      // User does not exist -> Send Email Invite
      try {
        await sendFriendInviteEmail(email, req.user.name);
        return res.status(200).json({ success: true, message: `Invitation email sent to ${email}` });
      } catch (emailErr) {
        console.error('Invite email failed:', emailErr.message);
        return res.status(500).json({ success: false, message: 'Failed to send invite email' });
      }
    }
  } catch (error) {
    next(error);
  }
};

// 3. Get pending requests
const getRequests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('friendRequests', 'name email avatar initials');
    return res.status(200).json({ success: true, data: user.friendRequests });
  } catch (error) {
    next(error);
  }
};

// 4. Accept/Reject friend request
const handleRequest = async (req, res, next) => {
  try {
    const { friendId, action } = req.body; // action: 'accept' | 'reject'
    const user = await User.findById(req.user._id);
    
    // Remove from requests
    user.friendRequests = user.friendRequests.filter(id => !id.equals(friendId));
    
    if (action === 'accept') {
      if (!user.friends.includes(friendId)) {
        user.friends.push(friendId);
      }
      
      // Add reciprocal
      const friend = await User.findById(friendId);
      if (friend && !friend.friends.includes(user._id)) {
        friend.friends.push(user._id);
        await friend.save({ validateBeforeSave: false });
      }
    }
    
    await user.save({ validateBeforeSave: false });
    
    return res.status(200).json({ success: true, message: `Friend request ${action}ed` });
  } catch (error) {
    next(error);
  }
};

// 5. Get friends list
const getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name email avatar initials');
    return res.status(200).json({ success: true, data: user.friends });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers,
  sendRequestOrInvite,
  getRequests,
  handleRequest,
  getFriends
};