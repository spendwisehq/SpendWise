// backend/src/models/AIReport.model.js

const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['weekly', 'monthly', 'custom', 'anomaly', 'budget_prediction'],
      required: true,
    },
    period: {
      startDate: { type: Date, required: true },
      endDate:   { type: Date, required: true },
    },
    summary: {
      totalIncome:   { type: Number, default: 0 },
      totalExpense:  { type: Number, default: 0 },
      netSavings:    { type: Number, default: 0 },
      savingsRate:   { type: Number, default: 0 },
      topCategory:   { type: String, default: null },
      transactionCount: { type: Number, default: 0 },
    },
    categoryBreakdown: [
      {
        categoryName: String,
        amount:       Number,
        percentage:   Number,
        count:        Number,
        color:        String,
      },
    ],
    insights:    { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    anomalies: [
      {
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        description:   String,
        severity:      { type: String, enum: ['low', 'medium', 'high'] },
        amount:        Number,
      },
    ],
    budgetPrediction: {
      nextMonthEstimate: { type: Number, default: null },
      byCategory: [
        {
          categoryName: String,
          predicted:    Number,
          suggested:    Number,
        },
      ],
      confidence: { type: Number, default: null },
    },
    financialScore: {
      score:     { type: Number, default: null },
      grade:     { type: String, default: null },
      breakdown: {
        savingsRate:     { type: Number, default: null },
        budgetAdherence: { type: Number, default: null },
        consistency:     { type: Number, default: null },
        debtManagement:  { type: Number, default: null },
      },
    },
    rawAiResponse: { type: String, default: null, select: false },
    isRead:        { type: Boolean, default: false },
    generatedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

aiReportSchema.index({ userId: 1, type: 1, generatedAt: -1 });
aiReportSchema.index({ userId: 1, isRead: 1 });

const AIReport = mongoose.model('AIReport', aiReportSchema);
module.exports = AIReport;