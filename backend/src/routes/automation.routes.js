// backend/src/routes/automation.routes.js

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const { protect } = require('../middleware/auth.middleware');

const {
  parseSMSMessage,
  createFromSMS,
  smsWebhook,
  getSMSStatus,
  toggleSMSTracking,
  uploadReceipt,
  createFromOCR,
  importCSV,
  handleWhatsAppMessage,   // STAGE 4
} = require('../controllers/Automation.controller');

// ── Multer config for receipt / CSV uploads ──────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits:    { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.csv'];
    const ext     = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type ${ext} not supported`));
  },
});

// ── SMS routes (protected) ───────────────────────────────────────────────────
router.use('/sms', protect);
router.post('/sms/parse',          parseSMSMessage);
router.post('/sms/create',         createFromSMS);
router.get ('/sms/status',         getSMSStatus);
router.post('/sms/toggle',         toggleSMSTracking);

// ── SMS webhook (public — called by SMS gateway) ─────────────────────────────
router.post('/sms/webhook',        smsWebhook);

// ── OCR / Receipt routes (protected) ─────────────────────────────────────────
router.post('/ocr/upload',  protect, upload.single('receipt'), uploadReceipt);
router.post('/ocr/create',  protect, createFromOCR);

// ── CSV Import (protected) ───────────────────────────────────────────────────
router.post('/import/csv',  protect, upload.single('file'), importCSV);

// ── STAGE 4: WhatsApp Bot webhook (public — called by Twilio) ─────────────────
// Twilio sends POST requests here when a user messages your WhatsApp number.
// No auth middleware — Twilio doesn't send JWT tokens.
// The controller itself validates the sender against the User DB.
router.post('/whatsapp/webhook', handleWhatsAppMessage);

module.exports = router;