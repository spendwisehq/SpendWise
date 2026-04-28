// backend/src/models/User.model.js
// STAGE 6 UPDATE: Added referral fields, Razorpay subscription fields, fcmToken
// All existing fields preserved exactly.

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar:   { type: String, default: null },
    phone:    { type: String, default: null, trim: true },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
    },
    language:  { type: String, default: 'en' },
    timezone:  { type: String, default: 'Asia/Kolkata' },
    monthlyIncome: { type: Number, default: 0, min: 0 },

    plan: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free',
    },
    planExpiresAt: { type: Date, default: null },

    // Wallet for blockchain
    walletAddress: { type: String, default: null, trim: true },

    // Financial score cache
    financialScore: {
      score:          { type: Number, default: null },
      grade:          { type: String, default: null },
      lastCalculated: { type: Date,   default: null },
    },

    // Notification preferences
    notifications: {
      email:         { type: Boolean, default: true },
      budgetAlerts:  { type: Boolean, default: true },
      weeklyReport:  { type: Boolean, default: true },
      anomalyAlerts: { type: Boolean, default: true },
    },

    // SMS parsing settings
    smsTracking: {
      enabled: { type: Boolean, default: false },
      phone:   { type: String,  default: null },
    },

    isEmailVerified: { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },
    lastLoginAt:     { type: Date,    default: null },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    // ─── STAGE 2: Two-Factor Authentication (TOTP) ───────────────────────────
    twoFA: {
      enabled:     { type: Boolean, default: false },
      secret:      { type: String,  default: null, select: false },
      backupCodes: { type: [String], default: [], select: false },
      enabledAt:   { type: Date,    default: null },
    },

    // ─── STAGE 6: Razorpay Subscription ──────────────────────────────────────
    // Stores the active Razorpay subscription ID so we can cancel/query it.
    razorpaySubscriptionId: {
      type:    String,
      default: null,
      trim:    true,
    },
    subscriptionStatus: {
      type:    String,
      enum:    ['active', 'halted', 'cancelled', 'completed', 'expired', null],
      default: null,
    },
    planRenewalDate: {
      type:    Date,
      default: null,
    },
    subscriptionPlan: {
      // 'monthly' | 'annual' — which Razorpay plan they subscribed to
      type:    String,
      enum:    ['monthly', 'annual', null],
      default: null,
    },

    // ─── STAGE 6: Referral Program ────────────────────────────────────────────
    // Each user gets a unique referral code on account creation.
    referralCode: {
      type:    String,
      unique:  true,
      sparse:  true,   // allows null without uniqueness conflicts
      uppercase: true,
      trim:    true,
    },
    // The user who referred this user (null if organic signup)
    referredBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
    // How many successful referrals this user has made
    referralCount: {
      type:    Number,
      default: 0,
      min:     0,
    },
    // Cumulative free premium months earned via referrals
    referralRewardMonths: {
      type:    Number,
      default: 0,
      min:     0,
    },

    // ─── STAGE 5: FCM Push Notification Token ────────────────────────────────
    // Stored when the user grants push notification permission in the browser.
    fcmToken: {
      type:    String,
      default: null,
      select:  false,
    },

    // WhatsApp bot link
    whatsappNumber: {
      type:    String,
      default: null,
      trim:    true,
    },

    otpCode:    { type: String, default: null, select: false },
    otpExpires: { type: Date,   default: null, select: false },
    otpCode: {
  type:   String,
  default: null,
  select:  false,   // never returned in queries unless explicitly selected
},
otpExpires: {
  type:    Date,
  default: null,
  select:  false,
},

    householdId: {
  type:    mongoose.Schema.Types.ObjectId,
  ref:     'Household',
  default: null,
},
 
// Whether the user allows friends to see their financial score
publicFinancialScore: {
  type:    Boolean,
  default: false,
},
 
// Badges earned from challenges
badges: {
  type: [{
    name:       { type: String, required: true },
    icon:       { type: String, default: '🏆' },
    color:      { type: String, default: '#f59e0b' },
    description:{ type: String, default: '' },
    earnedAt:   { type: Date,   default: Date.now },
    challengeId:{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', default: null },
  }],
  default: [],
},
  },
  
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Hooks ──────────────────────────────────────────────────────────────────────

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt   = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Auto-generate a referral code for new users
userSchema.pre('save', function () {
  if (this.isNew && !this.referralCode) {
    const raw  = crypto.randomBytes(6).toString('hex').toUpperCase();
    this.referralCode = `SW${raw.slice(0, 6)}`;
  }
});
// ── Methods ────────────────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Grant premium months (used by referral reward + subscription)
userSchema.methods.grantPremium = async function (months = 1) {
  const now     = new Date();
  const current = this.planExpiresAt && this.planExpiresAt > now
    ? this.planExpiresAt : now;

  this.plan           = 'premium';
  this.planExpiresAt  = new Date(current.getTime() + months * 30 * 24 * 60 * 60 * 1000);
  return this.save({ validateBeforeSave: false });
};

// ── Virtuals ───────────────────────────────────────────────────────────────────

userSchema.virtual('initials').get(function () {
  return this.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

userSchema.virtual('isPremium').get(function () {
  if (this.plan !== 'premium') return false;
  if (!this.planExpiresAt) return true;
  return new Date() < this.planExpiresAt;
});

// ── Indexes ────────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ householdId: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;