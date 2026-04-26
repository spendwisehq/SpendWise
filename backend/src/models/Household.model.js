// backend/src/models/Household.model.js
// Stage 7 — Couples / Household mode
// Two users link accounts → combined spending dashboard, shared budget,
// per-transaction privacy flag (shared | private)

const mongoose = require('mongoose');

// ── Shared budget allocation per category ─────────────────────────────────────
const sharedBudgetItemSchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, trim: true },
    categoryId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    monthlyLimit: { type: Number, required: true, min: 0 },
    icon:         { type: String, default: '📦' },
    color:        { type: String, default: '#6366f1' },
  },
  { _id: true }
);

// ── Main Household schema ─────────────────────────────────────────────────────
const householdSchema = new mongoose.Schema(
  {
    // The two linked members
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (v) => v.length === 2,
        message:   'A household must have exactly 2 members.',
      },
    },

    // Who created / initiated the link
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },

    // Display name for the household (e.g. "Minaz & Priya")
    name: {
      type:      String,
      trim:      true,
      maxlength: 60,
      default:   'Our Household',
    },

    // Status of the link
    status: {
      type:    String,
      enum:    ['pending', 'active', 'inactive'],
      default: 'pending',
    },

    // Shared monthly budget (optional — household can skip this)
    sharedBudget: {
      totalLimit:      { type: Number, default: 0, min: 0 },
      currency:        { type: String, default: 'INR' },
      categoryBudgets: { type: [sharedBudgetItemSchema], default: [] },
    },

    // Invitation token (pending state)
    inviteToken:   { type: String, default: null, select: false },
    inviteExpires: { type: Date,   default: null },

    // When the other member accepted
    linkedAt: { type: Date, default: null },

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
householdSchema.index({ members: 1 });
householdSchema.index({ createdBy: 1 });
householdSchema.index({ status: 1 });
householdSchema.index({ inviteToken: 1 }, { sparse: true });

// ── Virtual: is the household fully linked ────────────────────────────────────
householdSchema.virtual('isLinked').get(function () {
  return this.status === 'active';
});

const Household = mongoose.model('Household', householdSchema);
module.exports = Household;