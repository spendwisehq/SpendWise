// backend/src/utils/sanitize.js

/**
 * Strip control characters (except newlines/tabs) from user input.
 */
const stripControlChars = (str) =>
  typeof str === 'string' ? str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') : '';

/**
 * Sanitize and truncate user input before embedding in LLM prompts.
 */
const sanitizeInput = (input, maxLength = 2000) => {
  if (typeof input !== 'string') return '';
  return stripControlChars(input).trim().slice(0, maxLength);
};

/**
 * Validate that a parsed JSON object contains the expected keys.
 */
const validateSchema = (obj, requiredKeys = []) => {
  if (!obj || typeof obj !== 'object') return false;
  return requiredKeys.every(key => key in obj);
};

module.exports = { sanitizeInput, stripControlChars, validateSchema };
