// backend/src/models/Challenge.model.js
// Stage 7 — Financial Challenges
// Users can create or join time-boxed spending challenges.
// Progress is tracked per-participant; badges awarded on completion.

const mongoose = require('mongoose');

// ── Badge definition ──────────────────────────────────────────────────────────
const badgeSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    icon:        { type: String, default: '🏆' },
    description: { type: String, default: '' },
    color:       { type: String, default: '#f59e0b' },
  },
  { _id: false }
);

// ── Per-participant progress ───────────────────────────────────────────────────
const participantSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:         { type: String, default: '' },   // denormalised for leaderboard queries
    joinedAt:     { type: Date, default: Date.now },
    // Current spend / saved towards the challenge goal (updated by cron or on txn save)
    currentValue: { type: Number, default: 0, min: 0 },
    // Did they complete the challenge? (set when challenge ends or goal reached)
    completed:    { type: Boolean, default: false },
    completedAt:  { type: Date,   default: null },
    // Rank at completion (1-indexed; null until resolved)
    rank:         { type: Number, default: null },
    // Badge awarded on completion
    badgeEarned:  { type: Boolean, default: false },
  },
  { _id: true }
);

// ── Main Challenge schema ─────────────────────────────────────────────────────
const challengeSchema = new mongoose.Schema(
  {
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    title: {
      type:      String,
      required:  [true, 'Challenge title is required'],
      trim:      true,
      maxlength: 80,
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: 500,
      default:   '',
    },

    // Type drives how progress is measured
    type: {
      type: String,
      enum: [
        'no_spend',           // zero spending in a category
        'savings_target',     // save X amount
        'spend_limit',        // keep total spend under X
        'category_limit',     // keep a specific category under X
        'transaction_count',  // limit number of transactions
      ],
      required: true,
    },

    // Applies to category_limit / no_spend challenges
    targetCategory: {
      type:    String,
      default: null,
      trim:    true,
    },

    // Numeric goal (amount in INR, or count for transaction_count)
    targetValue: {
      type:    Number,
      default: 0,
      min:     0,
    },

    currency: { type: String, default: 'INR' },

    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },

    // Challenge status
    status: {
      type:    String,
      enum:    ['upcoming', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
    },

    // Public = anyone can join; private = invite-only
    visibility: {
      type:    String,
      enum:    ['public', 'private'],
      default: 'public',
    },

    // Max participants (null = unlimited)
    maxParticipants: { type: Number, default: null },

    // Participants array
    participants: { type: [participantSchema], default: [] },

    // Badge awarded to winners/completers
    badge: { type: badgeSchema, default: null },

    // Winner(s) userId(s) — resolved when challenge ends
    winners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Soft-delete
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
challengeSchema.index({ status: 1 });
challengeSchema.index({ createdBy: 1 });
challengeSchema.index({ 'participants.userId': 1 });
challengeSchema.index({ startDate: 1, endDate: 1 });
challengeSchema.index({ visibility: 1, status: 1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────
challengeSchema.virtual('participantCount').get(function () {
  return this.participants?.length || 0;
});

challengeSchema.virtual('daysLeft').get(function () {
  if (!this.endDate) return 0;
  const diff = this.endDate - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

challengeSchema.virtual('daysTotal').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
});

const Challenge = mongoose.model('Challenge', challengeSchema);
module.exports = Challenge;