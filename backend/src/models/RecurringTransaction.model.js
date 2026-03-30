// backend/src/models/RecurringTransaction.model.js

const mongoose = require('mongoose');

const recurringSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title:      { type: String, required: true, trim: true },
    merchant:   { type: String, default: null },
    amount:     { type: Number, required: true, min: 0.01 },
    currency:   { type: String, default: 'INR' },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    categoryName:  { type: String, default: 'Subscription' },
    paymentMethod: { type: String, default: 'other' },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    startDate:    { type: Date, required: true },
    endDate:      { type: Date, default: null },
    nextDueDate:  { type: Date, required: true },
    lastPaidDate: { type: Date, default: null },
    isActive:     { type: Boolean, default: true },
    autoDetected: { type: Boolean, default: false },
    reminderDaysBefore: { type: Number, default: 2 },
    totalPaid:    { type: Number, default: 0 },
    paymentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

recurringSchema.index({ userId: 1, nextDueDate: 1 });
recurringSchema.index({ userId: 1, isActive: 1 });

const RecurringTransaction = mongoose.model('RecurringTransaction', recurringSchema);
module.exports = RecurringTransaction;