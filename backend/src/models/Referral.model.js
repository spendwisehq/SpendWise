// backend/src/models/Referral.model.js
// STAGE 6 — Feature 3: Referral Program
// Tracks every referral: who referred whom, reward status, abuse prevention.

const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    // The user who shared their referral code
    referrer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // The new user who signed up using the code
    referee: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true,  // one referee can only be referred once
      index:    true,
    },

    // The referral code that was used
    code: {
      type:     String,
      required: true,
      uppercase: true,
      trim:     true,
    },

    // Reward status
    status: {
      type:    String,
      enum:    ['pending', 'completed', 'rewarded', 'invalid', 'expired'],
      default: 'pending',
      index:   true,
    },

    // Reward details
    reward: {
      referrerMonths: { type: Number, default: 1 },   // months of premium for referrer
      refereeMonths:  { type: Number, default: 1 },   // months of premium for referee
      awardedAt:      { type: Date,   default: null },
    },

    // Completion tracking
    completedAt: { type: Date, default: null },  // when referee made first transaction
    rewardedAt:  { type: Date, default: null },  // when premium was actually granted

    // Abuse prevention
    referrerIP:  { type: String, default: null },
    refereeIP:   { type: String, default: null },
    isSuspicious:{ type: Boolean, default: false },
    flagReason:  { type: String,  default: null },

    // Chain depth — prevents pyramid abuse (max depth 2)
    chainDepth: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index — a referrer can refer many people, but each referee is unique
referralSchema.index({ referrer: 1, referee: 1 }, { unique: true });
referralSchema.index({ code: 1, status: 1 });

const Referral = mongoose.model('Referral', referralSchema);
module.exports = Referral;