// backend/src/routes/automation.routes.js

const express = require('express');
const router  = express.Router();

const {
  upload,
  parseSMSManual,
  createFromSMS,
  smsWebhook,
  uploadReceipt,
  createFromOCR,
  getSMSStatus,
  toggleSMSTracking,
} = require('../controllers/automation.controller');

const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');

//─────────────────────────────────────
// PUBLIC — MSG91 webhook (no auth)
//─────────────────────────────────────
router.post('/sms/webhook', smsWebhook);

//─────────────────────────────────────
// PROTECTED — all other routes
//─────────────────────────────────────
router.use(protect);

// SMS
router.get('/sms/status',   getSMSStatus);
router.put('/sms/toggle',   toggleSMSTracking);
router.post('/sms/parse',   parseSMSManual);
router.post('/sms/create',  createFromSMS);

// OCR / Receipt
router.post('/ocr/upload',  upload.single('receipt'), uploadReceipt);
router.post('/ocr/create',  createFromOCR);

module.exports = router;