// backend/src/controllers/Automation.controller.js
// STAGE 4 ADDITION:
//   handleWhatsAppMessage — Feature 5: WhatsApp Bot webhook
//
// All pre-existing functions (SMS, OCR, etc.) are preserved exactly as they were.
// Only the WhatsApp section is new — search for "STAGE 4" to find changes.

const path          = require('path');
const fs            = require('fs');
const Transaction   = require('../models/Transaction.model');
const User          = require('../models/User.model');
const Category      = require('../models/Category.model');
const { parseSMS }  = require('../utils/smsParser');
const { parseReceiptText } = require('../utils/ocrParser');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { askClaudeJSON }      = require('../services/groq.service');
// STAGE 4 — WhatsApp imports
const whatsapp = require('../services/whatsapp.service');

// ─── Existing: SMS Parse (unchanged) ─────────────────────────────────────────
const parseSMSMessage = async (req, res, next) => {
  try {
    const { message, sender } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'SMS message is required.' });

    const parsed = parseSMS(message, sender);
    return res.status(200).json({ success: true, data: { parsed, raw: message } });
  } catch (error) {
    next(error);
  }
};

// ─── Existing: SMS Create (unchanged) ────────────────────────────────────────
const createFromSMS = async (req, res, next) => {
  try {
    const { message, sender } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'SMS message is required.' });

    const parsed = parseSMS(message, sender);
    if (!parsed.amount || !parsed.type) {
      return res.status(200).json({
        success: true,
        data: { created: false, parsed, reason: 'Could not extract transaction data from SMS.' },
      });
    }

    const category = await Category.findOne({
      $or: [{ isSystem: true }, { userId: req.user._id }],
      isActive: true,
    }).lean();

    const transaction = await Transaction.create({
      userId:        req.user._id,
      type:          parsed.type,
      amount:        parsed.amount,
      merchant:      parsed.merchant,
      description:   parsed.description || parsed.merchant,
      categoryId:    category?._id,
      categoryName:  category?.name || 'Uncategorized',
      date:          parsed.date || new Date(),
      paymentMethod: parsed.paymentMethod || 'upi',
      source:        'sms',
      rawSMS:        message,
      smsMetadata:   { sender, parsedAt: new Date(), confidence: parsed.confidence },
    });

    return res.status(201).json({ success: true, data: { created: true, transaction, parsed } });
  } catch (error) {
    next(error);
  }
};

// ─── Existing: SMS Webhook (unchanged) ───────────────────────────────────────
const smsWebhook = async (req, res, next) => {
  try {
    const { message, sender, msisdn } = req.body;
    const smsText   = message || req.body.text || req.body.body;
    const smsSender = sender || msisdn || req.body.from;

    if (!smsText) return res.status(200).json({ success: true, message: 'No message content' });

    const parsed = parseSMS(smsText, smsSender);
    if (parsed.amount && parsed.type) {
      // Find user by phone — simplified: try to match msisdn in User model
      // In production you'd have a phone→userId lookup
      console.log('SMS Webhook received:', { parsed, sender: smsSender });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─── Existing: SMS Status / Toggle (unchanged) ───────────────────────────────
const getSMSStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    return res.status(200).json({
      success: true,
      data: {
        smsTrackingEnabled: user.smsTrackingEnabled || false,
        webhookUrl:         `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/automation/sms/webhook`,
      },
    });
  } catch (error) {
    next(error);
  }
};

const toggleSMSTracking = async (req, res, next) => {
  try {
    const user    = await User.findById(req.user._id);
    user.smsTrackingEnabled = !user.smsTrackingEnabled;
    await user.save();
    return res.status(200).json({ success: true, data: { smsTrackingEnabled: user.smsTrackingEnabled } });
  } catch (error) {
    next(error);
  }
};

// ─── Existing: OCR Upload (unchanged) ────────────────────────────────────────
const uploadReceipt = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Receipt image is required.' });

    const cloudinaryUrl = await uploadToCloudinary(req.file.path, 'receipts');

    // Run Tesseract OCR
    const Tesseract = require('tesseract.js');
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng', {
      logger: () => {},
    });

    const parsed = parseReceiptText(text);

    // Clean up temp file
    fs.unlink(req.file.path, () => {});

    return res.status(200).json({
      success: true,
      data: { imageUrl: cloudinaryUrl, rawText: text, parsed },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Existing: Create from OCR (unchanged) ───────────────────────────────────
const createFromOCR = async (req, res, next) => {
  try {
    const { merchant, amount, date, imageUrl, rawText } = req.body;

    if (!amount || !merchant) {
      return res.status(400).json({ success: false, message: 'merchant and amount are required.' });
    }

    const category = await Category.findOne({
      isActive: true,
      $or: [{ isSystem: true }, { userId: req.user._id }],
    }).lean();

    const transaction = await Transaction.create({
      userId:       req.user._id,
      type:         'expense',
      amount:       Number(amount),
      merchant,
      description:  merchant,
      categoryId:   category?._id,
      categoryName: category?.name || 'Uncategorized',
      date:         date ? new Date(date) : new Date(),
      paymentMethod:'other',
      source:       'ocr',
      receiptUrl:   imageUrl,
      ocrRawText:   rawText,
    });

    return res.status(201).json({ success: true, data: { transaction } });
  } catch (error) {
    next(error);
  }
};

// ─── Existing: CSV Import (unchanged if present) ─────────────────────────────
const importCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'CSV file is required.' });

    const csv    = require('csv-parser');
    const rows   = [];
    const stream = fs.createReadStream(req.file.path).pipe(csv());

    await new Promise((resolve, reject) => {
      stream.on('data', row => rows.push(row));
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    fs.unlink(req.file.path, () => {});

    const created = [];
    const errors  = [];

    for (const row of rows) {
      try {
        const amount = parseFloat(row.amount || row.Amount || 0);
        const type   = (row.type || row.Type || 'expense').toLowerCase();
        const merchant = row.merchant || row.Merchant || row.description || row.Description || 'Unknown';

        if (!amount || amount <= 0) { errors.push({ row, reason: 'Invalid amount' }); continue; }

        const txn = await Transaction.create({
          userId:       req.user._id,
          type,
          amount,
          merchant,
          description:  merchant,
          categoryName: row.category || row.Category || 'Uncategorized',
          date:         row.date     ? new Date(row.date)   : new Date(),
          paymentMethod: row.paymentMethod || 'other',
          source:       'csv',
        });
        created.push(txn._id);
      } catch (e) {
        errors.push({ row, reason: e.message });
      }
    }

    return res.status(200).json({
      success: true,
      data: { imported: created.length, errors: errors.length, errorDetails: errors.slice(0, 10) },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 4 — Feature 5: WhatsApp Bot Webhook
// POST /api/automation/whatsapp/webhook
//
// Called by Twilio when a user sends a WhatsApp message to the bot number.
// Twilio sends form-encoded body with: Body, From, To, NumMedia, etc.
//
// Flow:
//   1. Parse incoming message
//   2. Find user by phone number (WhatsApp number → User.phone)
//   3. If 'help'    → reply with usage instructions
//   4. If 'balance' → reply with this month's summary
//   5. If transaction → AI-categorize → create → reply with confirmation
//   6. If unknown   → reply asking for correct format
// ─────────────────────────────────────────────────────────────────────────────
const handleWhatsAppMessage = async (req, res, next) => {
  // Twilio expects a 200 response with TwiML or empty body immediately
  // We respond first, then process (fire-and-forget pattern)
  res.set('Content-Type', 'text/xml');
  res.status(200).send('<Response></Response>');  // Empty TwiML = no auto-reply (we use REST API)

  try {
    const incomingBody = req.body.Body || '';
    const fromNumber   = req.body.From || '';   // e.g. "whatsapp:+919876543210"
    const toNumber     = req.body.To   || '';

    if (!incomingBody || !fromNumber) return;

    console.log(`[WhatsApp] Incoming from ${fromNumber}: "${incomingBody}"`);

    // ── 1. Normalise the phone number (strip "whatsapp:+" prefix) ─────────────
    const phoneRaw = fromNumber.replace('whatsapp:', '').replace(/^\+/, '');

    // ── 2. Look up user by phone number ───────────────────────────────────────
    const user = await User.findOne({
      $or: [
        { phone: phoneRaw },
        { phone: `+${phoneRaw}` },
        { whatsappNumber: fromNumber },
      ],
    }).lean();

    // ── 3. Parse intent ───────────────────────────────────────────────────────
    const intent = whatsapp.parseMessage(incomingBody);

    if (!user) {
      // User not registered — invite them to link their account
      await whatsapp.sendMessage(
        fromNumber,
        `👋 Hi! You're not linked to a SpendWise account yet.\n\nOpen the app → Settings → Link WhatsApp to connect this number.\n\n_SpendWise.app_`
      );
      return;
    }

    // ── 4. Handle: help ───────────────────────────────────────────────────────
    if (intent.type === 'help') {
      await whatsapp.sendMessage(fromNumber, whatsapp.helpText());
      return;
    }

    // ── 5. Handle: balance summary ────────────────────────────────────────────
    if (intent.type === 'balance') {
      const now       = new Date();
      const start     = new Date(now.getFullYear(), now.getMonth(), 1);
      const end       = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const txns      = await Transaction.find({
        userId: user._id, isDeleted: false, date: { $gte: start, $lte: end },
      }).lean();

      const income    = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense   = txns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const savings   = income - expense;
      const month     = now.toLocaleString('en-IN', { month: 'long' });

      const topCats   = {};
      txns.filter(t => t.type === 'expense').forEach(t => {
        const k = t.categoryName || 'Other';
        topCats[k] = (topCats[k] || 0) + t.amount;
      });
      const top3 = Object.entries(topCats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, v]) => `  • ${k}: ₹${v.toLocaleString('en-IN')}`)
        .join('\n');

      const reply = `📊 *${month} Summary*\n\n` +
        `💚 Income:  ₹${income.toLocaleString('en-IN')}\n` +
        `🔴 Expense: ₹${expense.toLocaleString('en-IN')}\n` +
        `💰 Savings: ₹${savings.toLocaleString('en-IN')}\n\n` +
        (top3 ? `*Top categories:*\n${top3}\n\n` : '') +
        `_${txns.length} transactions this month_`;

      await whatsapp.sendMessage(fromNumber, reply);
      return;
    }

    // ── 6. Handle: transaction ────────────────────────────────────────────────
    if (intent.type === 'transaction') {
      const { merchant, amount, transactionType, categoryHint } = intent;

      // AI-categorize (reuse existing endpoint logic inline)
      let categoryName = 'Uncategorized';
      let categoryId   = null;
      try {
        const categories = await Category.find({
          isActive: true,
          $or: [{ isSystem: true }, { userId: user._id }],
        }).lean();

        const hint   = categoryHint || merchant;
        const catList = categories.map(c => c.name).join(', ');

        const result = await askClaudeJSON(
          `You are a transaction categorizer. Respond ONLY with JSON: {"categoryName": "exact name", "confidence": 0-100}`,
          `Transaction: ${hint} — ₹${amount} (${transactionType})\nCategories: ${catList}`
        );

        const matched = categories.find(c => c.name.toLowerCase() === result.categoryName?.toLowerCase());
        if (matched) { categoryName = matched.name; categoryId = matched._id; }
      } catch (_) { /* use default */ }

      // Create transaction
      const txn = await Transaction.create({
        userId:        user._id,
        type:          transactionType,
        amount,
        merchant,
        description:   merchant,
        categoryId,
        categoryName,
        date:          new Date(),
        paymentMethod: 'other',
        source:        'whatsapp',
        notes:         `Via WhatsApp bot`,
      });

      const sign    = transactionType === 'income' ? '+' : '-';
      const emoji   = transactionType === 'income' ? '💚' : '🔴';
      const reply   =
        `${emoji} *Logged!*\n\n` +
        `${merchant}\n` +
        `${sign}₹${amount.toLocaleString('en-IN')}\n` +
        `📂 ${categoryName}\n\n` +
        `Reply *balance* to see your summary.`;

      await whatsapp.sendMessage(fromNumber, reply);
      return;
    }

    // ── 7. Unknown message ────────────────────────────────────────────────────
    await whatsapp.sendMessage(
      fromNumber,
      `I didn't understand that. 🤔\n\nTry:\n  swiggy 250\n  salary 45000 income\n  balance\n\nReply *help* for more.`
    );
  } catch (err) {
    console.error('[WhatsApp webhook error]', err);
    // Already sent 200 response — nothing more to do
  }
};

module.exports = {
  parseSMSMessage,
  createFromSMS,
  smsWebhook,
  getSMSStatus,
  toggleSMSTracking,
  uploadReceipt,
  createFromOCR,
  importCSV,
  handleWhatsAppMessage,  // STAGE 4
};