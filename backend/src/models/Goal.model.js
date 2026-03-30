// backend/src/models/Goal.model.js

const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: null,
      maxlength: 500,
    },
    icon:  { type: String, default: '🎯' },
    color: { type: String, default: '#1D9E75' },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target must be at least 1'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    deadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
    },
    category: {
      type: String,
      enum: ['emergency', 'travel', 'education', 'gadget', 'home', 'vehicle', 'wedding', 'other'],
      default: 'other',
    },
    contributions: [
      {
        amount:      { type: Number, required: true },
        date:        { type: Date, default: Date.now },
        note:        { type: String, default: null },
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Transaction',
          default: null,
        },
      },
    ],
    aiSuggestions: {
      monthlySavingNeeded: { type: Number, default: null },
      achievableBy:        { type: Date,   default: null },
      tips:                { type: [String], default: [] },
      lastUpdated:         { type: Date,   default: null },
    },
    // Blockchain certificate
    certificateTokenId: { type: String, default: null },
    certificateTxHash:  { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: progress percentage
goalSchema.virtual('progressPercent').get(function () {
  if (!this.targetAmount) return 0;
  return Math.min(Math.round((this.currentAmount / this.targetAmount) * 100), 100);
});

// Virtual: remaining amount
goalSchema.virtual('remainingAmount').get(function () {
  return Math.max(this.targetAmount - this.currentAmount, 0);
});

// Virtual: days remaining
goalSchema.virtual('daysRemaining').get(function () {
  if (!this.deadline) return null;
  const diff = new Date(this.deadline) - new Date();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
});

goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, deadline: 1 });

const Goal = mongoose.model('Goal', goalSchema);
module.exports = Goal;