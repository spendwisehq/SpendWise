// backend/src/controllers/category.controller.js

const Category = require('../models/Category.model');

//─────────────────────────────────────
// GET /api/categories
// Get all categories (system + user's own)
//─────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;

    const filter = {
      isActive: true,
      $or: [
        { isSystem: true },
        { userId: req.user._id },
      ],
    };

    if (type && ['expense', 'income', 'both'].includes(type)) {
      filter.type = { $in: [type, 'both'] };
    }

    const categories = await Category.find(filter)
      .sort({ isSystem: -1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/categories
// Create custom category
//─────────────────────────────────────
const createCategory = async (req, res, next) => {
  try {
    const { name, icon, color, type, keywords } = req.body;

    // Check duplicate for this user
    const existing = await Category.findOne({
      userId: req.user._id,
      name:   { $regex: `^${name}$`, $options: 'i' },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists.',
      });
    }

    const category = await Category.create({
      userId:   req.user._id,
      name,
      icon:     icon     || '📦',
      color:    color    || '#888780',
      type:     type     || 'expense',
      keywords: keywords || [],
      isSystem: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// PUT /api/categories/:id
// Update custom category (not system)
//─────────────────────────────────────
const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id:    req.params.id,
      userId: req.user._id,
      isSystem: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or cannot be modified.',
      });
    }

    const allowed = ['name', 'icon', 'color', 'type', 'keywords'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) category[field] = req.body[field];
    });

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: { category },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// DELETE /api/categories/:id
// Delete custom category (not system)
//─────────────────────────────────────
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id:      req.params.id,
      userId:   req.user._id,
      isSystem: false,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or cannot be deleted.',
      });
    }

    category.isActive = false;
    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};