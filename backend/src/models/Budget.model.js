// backend/src/models/Budget.model.js

const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    totalBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    categories: [
      {
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Category',
        },
        categoryName: String,
        allocated:    { type: Number, default: 0 },
        spent:        { type: Number, default: 0 },
        color:        { type: String, default: '#1D9E75' },
        icon:         { type: String, default: '💰' },
      },
    ],
    totalSpent: {
      type: Number,
      default: 0,
    },
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
    aiInsights: {
      type: String,
      default: null,
    },
    alerts: {
      at50Percent:  { type: Boolean, default: false },
      at80Percent:  { type: Boolean, default: false },
      at100Percent: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: remaining budget
budgetSchema.virtual('remaining').get(function () {
  return this.totalBudget - this.totalSpent;
});

// Virtual: percentage used
budgetSchema.virtual('percentageUsed').get(function () {
  if (!this.totalBudget) return 0;
  return Math.round((this.totalSpent / this.totalBudget) * 100);
});

// One budget per user per month/year
budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);
module.exports = Budget;