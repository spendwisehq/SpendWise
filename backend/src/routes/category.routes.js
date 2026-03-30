// backend/src/routes/category.routes.js

const express = require('express');
const router  = express.Router();

const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');

const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',      getCategories);
router.post('/',     createCategory);
router.put('/:id',   updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;