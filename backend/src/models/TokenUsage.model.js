// backend/src/models/TokenUsage.model.js

const mongoose = require('mongoose');

const tokenUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: { type: Number, required: true },
    year:  { type: Number, required: true },
    promptTokens:     { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens:      { type: Number, default: 0 },
    requestCount:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

tokenUsageSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('TokenUsage', tokenUsageSchema);
