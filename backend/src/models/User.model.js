// backend/src/models/User.model.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: [true,'Name required'], trim: true, minlength: 2, maxlength: 50 },
  email:    { type: String, required: [true,'Email required'], unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, required: [true,'Password required'], minlength: 6, select: false },
  avatar:   { type: String, default: null },
  phone:    { type: String, default: null, trim: true },
  currency: { type: String, default: 'INR', enum: ['INR','USD','EUR','GBP','AED'] },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  monthlyIncome: { type: Number, default: 0, min: 0 },
  plan:          { type: String, enum: ['free','premium'], default: 'free' },
  planExpiresAt: { type: Date, default: null },
  walletAddress: { type: String, default: null, trim: true },
  financialScore: {
    score: { type: Number, default: null },
    grade: { type: String, default: null },
    lastCalculated: { type: Date, default: null },
  },
  notifications: {
    email:        { type: Boolean, default: true },
    budgetAlerts: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: true },
    anomalyAlerts:{ type: Boolean, default: true },
  },
  smsTracking: {
    enabled: { type: Boolean, default: false },
    phone:   { type: String, default: null },
  },
  // ── Email verification ──────────────────────────────
  isEmailVerified:          { type: Boolean, default: false },
  emailVerificationOTP:     { type: String, default: null, select: false },
  emailVerificationExpires: { type: Date,   default: null, select: false },
  // ── Friends ─────────────────────────────────────────
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // ────────────────────────────────────────────────────
  isActive:    { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  refreshToken:{ type: String, default: null, select: false },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.virtual('initials').get(function () {
  return this.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
});

userSchema.virtual('isPremium').get(function () {
  if (this.plan !== 'premium') return false;
  if (!this.planExpiresAt) return true;
  return new Date() < this.planExpiresAt;
});

userSchema.index({ email: 1 });
userSchema.index({ walletAddress: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);
module.exports = User;