const { body, query, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const categorizeValidator = [
  body('merchant')
    .optional()
    .isString().withMessage('merchant must be a string.')
    .isLength({ max: 200 }).withMessage('merchant must be under 200 characters.'),

  body('description')
    .optional()
    .isString().withMessage('description must be a string.')
    .isLength({ max: 500 }).withMessage('description must be under 500 characters.'),

  body('amount')
    .optional()
    .isNumeric().withMessage('amount must be a number.'),

  body('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('type must be income or expense.'),

  validate,
];

const categorizeBatchValidator = [
  body('transactionIds')
    .isArray({ min: 1, max: 20 }).withMessage('transactionIds must be an array of 1–20 IDs.'),

  body('transactionIds.*')
    .isMongoId().withMessage('Each transactionId must be a valid ID.'),

  validate,
];

const chatValidator = [
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required.')
    .isLength({ max: 1000 }).withMessage('Message must be under 1000 characters.'),

  validate,
];

const analysisValidator = [
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('month must be 1–12.'),

  query('year')
    .optional()
    .isInt({ min: 2000, max: 2100 }).withMessage('year must be 2000–2100.'),

  validate,
];

const forecastValidator = [
  query('months')
    .optional()
    .isInt({ min: 1, max: 12 }).withMessage('months must be 1–12.'),

  validate,
];

module.exports = {
  categorizeValidator,
  categorizeBatchValidator,
  chatValidator,
  analysisValidator,
  forecastValidator,
};
