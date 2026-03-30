// backend/src/models/Category.model.js

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = system/default category
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    icon: {
      type: String,
      required: [true, 'Icon is required'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'],
    },
    type: {
      type: String,
      enum: ['expense', 'income', 'both'],
      default: 'expense',
    },
    isSystem: {
      type: Boolean,
      default: false, // system categories can't be deleted
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null, // for sub-categories
    },
    keywords: {
      // AI uses these for auto-categorization
      type: [String],
      default: [],
    },
    budget: {
      monthly: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

categorySchema.index({ userId: 1, name: 1 });
categorySchema.index({ isSystem: 1 });
categorySchema.index({ keywords: 1 });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;