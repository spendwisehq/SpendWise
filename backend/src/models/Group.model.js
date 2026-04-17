// backend/src/models/Group.model.js — FULL REPLACEMENT

const mongoose = require('mongoose');
const crypto   = require('crypto');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: 100,
    },
    description: { type: String, default: null },
    icon:  { type: String, default: '👥' },
    color: { type: String, default: '#1D9E75' },
    type: {
      type: String,
      enum: ['trip', 'flat', 'office', 'family', 'event', 'other'],
      default: 'other',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name:          { type: String, required: true },
        email:         { type: String, default: null },
        phone:         { type: String, default: null },
        role:          { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt:      { type: Date, default: Date.now },
        totalPaid:     { type: Number, default: 0 },
        totalOwed:     { type: Number, default: 0 },
        walletAddress: { type: String, default: null },
      },
    ],
    totalExpenses: { type: Number, default: 0 },
    currency:      { type: String, default: 'INR' },
    isActive:      { type: Boolean, default: true },
    settledAt:     { type: Date, default: null },

    // ── Invite link ──────────────────────────────────────────────────────────
    inviteToken:     { type: String, default: null, index: true },
    inviteTokenExp:  { type: Date,   default: null }, // null = never expires

    // Blockchain
    contractAddress:  { type: String, default: null },
    deploymentTxHash: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

groupSchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// Generate a fresh invite token
groupSchema.methods.generateInviteToken = function () {
  const token = crypto.randomBytes(20).toString('hex');
  this.inviteToken    = token;
  this.inviteTokenExp = null; // never expires — admin can regenerate to invalidate
  return token;
};

groupSchema.index({ createdBy: 1 });
groupSchema.index({ 'members.userId': 1 });

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;