// backend/src/controllers/automation.controller.js

const multer    = require('multer');
const { parseSMS }        = require('../utils/smsParser');
const { processReceipt }  = require('../utils/ocrParser');
const { uploadToCloudinary } = require('../utils/cloudinary');
const Transaction = require('../models/Transaction.model');
const Category    = require('../models/Category.model');
const User        = require('../models/User.model');

//─────────────────────────────────────
// MULTER — memory storage for Cloudinary
//─────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpg, png, webp, heic)'));
    }
  },
});

//─────────────────────────────────────
// HELPER — auto-categorize from keywords
//─────────────────────────────────────
const autoCategorizeSMS = async (parsed, userId) => {
  const searchText = [
    parsed.merchant || '',
    parsed.smsData?.upiId || '',
    parsed.smsData?.bankName || '',
  ].join(' ').toLowerCase();

  if (!searchText.trim()) return { categoryId: null, categoryName: 'Uncategorized' };

  // Find matching category by keywords
  const categories = await Category.find({
    isActive: true,
    keywords: { $exists: true, $not: { $size: 0 } },
    $or: [{ isSystem: true }, { userId }],
  });

  let bestMatch     = null;
  let bestScore     = 0;

  for (const cat of categories) {
    const score = cat.keywords.filter(kw =>
      searchText.includes(kw.toLowerCase())
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  return bestMatch
    ? { categoryId: bestMatch._id, categoryName: bestMatch.name }
    : { categoryId: null, categoryName: 'Uncategorized' };
};

//─────────────────────────────────────
// POST /api/automation/sms/parse
// Manual SMS parsing (user pastes SMS)
//─────────────────────────────────────
const parseSMSManual = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SMS message is required.',
      });
    }

    const parsed = parseSMS(message);

    if (!parsed) {
      return res.status(422).json({
        success: false,
        message: 'Could not extract transaction data from this SMS.',
        tip: 'Make sure this is a bank/UPI transaction SMS.',
      });
    }

    // Auto-categorize
    const { categoryId, categoryName } = await autoCategorizeSMS(parsed, req.user._id);

    return res.status(200).json({
      success: true,
      message: 'SMS parsed successfully.',
      data: {
        parsed: {
          ...parsed,
          categoryId,
          categoryName,
        },
        confidence: parsed.confidence,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/automation/sms/create
// Parse SMS + auto-create transaction
//─────────────────────────────────────
const createFromSMS = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'SMS message is required.' });
    }

    const parsed = parseSMS(message);

    if (!parsed || !parsed.amount) {
      return res.status(422).json({
        success: false,
        message: 'Could not extract a valid transaction from this SMS.',
      });
    }

    // Check for duplicate (same ref number)
    if (parsed.smsData?.refNumber) {
      const existing = await Transaction.findOne({
        userId: req.user._id,
        'smsData.refNumber': parsed.smsData.refNumber,
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'This transaction was already imported.',
          data: { transaction: existing },
        });
      }
    }

    // Auto-categorize
    const { categoryId, categoryName } = await autoCategorizeSMS(parsed, req.user._id);

    // Create transaction
    const transaction = await Transaction.create({
      userId:        req.user._id,
      type:          parsed.type,
      amount:        parsed.amount,
      currency:      req.user.currency || 'INR',
      merchant:      parsed.merchant || null,
      categoryId,
      categoryName,
      date:          new Date(),
      paymentMethod: parsed.paymentMethod,
      source:        'sms',
      smsData:       parsed.smsData,
      aiData: {
        categorizedBy: categoryId ? 'rule' : 'user',
        confidence:    parsed.confidence,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction created from SMS.',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/automation/sms/webhook
// MSG91 webhook — receives SMS from user's phone
//─────────────────────────────────────
const smsWebhook = async (req, res, next) => {
  try {
    // MSG91 sends data in various formats
    const message = req.body.message || req.body.text || req.body.sms || '';
    const mobile  = req.body.mobile  || req.body.from || '';

    // Acknowledge immediately (MSG91 needs fast response)
    res.status(200).json({ success: true, message: 'Webhook received.' });

    if (!message) return;

    // Find user by phone number
    const user = await User.findOne({
      'smsTracking.enabled': true,
      'smsTracking.phone':   mobile.replace(/\D/g, '').slice(-10),
    });

    if (!user) return; // No user linked to this phone

    const parsed = parseSMS(message);
    if (!parsed?.amount) return;

    // Duplicate check
    if (parsed.smsData?.refNumber) {
      const exists = await Transaction.findOne({
        userId: user._id,
        'smsData.refNumber': parsed.smsData.refNumber,
      });
      if (exists) return;
    }

    const { categoryId, categoryName } = await autoCategorizeSMS(parsed, user._id);

    await Transaction.create({
      userId:        user._id,
      type:          parsed.type,
      amount:        parsed.amount,
      currency:      user.currency || 'INR',
      merchant:      parsed.merchant || null,
      categoryId,
      categoryName,
      date:          new Date(),
      paymentMethod: parsed.paymentMethod,
      source:        'sms',
      smsData:       parsed.smsData,
      aiData: {
        categorizedBy: categoryId ? 'rule' : 'user',
        confidence:    parsed.confidence,
      },
    });
  } catch (error) {
    // Don't crash webhook — just log
    console.error('SMS webhook error:', error.message);
  }
};

//─────────────────────────────────────
// POST /api/automation/ocr/upload
// Upload receipt → Cloudinary → OCR stub
//─────────────────────────────────────
const uploadReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided.',
      });
    }

    // Upload to Cloudinary
    const uploaded = await uploadToCloudinary(req.file.buffer, {
      folder:  'spendwise/receipts',
      publicId: `receipt_${req.user._id}_${Date.now()}`,
    });

    // Process with OCR (stub for now)
    const ocrResult = await processReceipt(uploaded.url);

    return res.status(200).json({
      success: true,
      message: ocrResult.ocrActive
        ? 'Receipt processed successfully.'
        : 'Receipt uploaded. Please fill in transaction details.',
      data: {
        imageUrl:   uploaded.url,
        publicId:   uploaded.publicId,
        ocrActive:  ocrResult.ocrActive,
        confidence: ocrResult.confidence,
        parsed:     ocrResult.parsed || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// POST /api/automation/ocr/create
// Create transaction from OCR result
//─────────────────────────────────────
const createFromOCR = async (req, res, next) => {
  try {
    const {
      amount, type, merchant, categoryId,
      date, paymentMethod, imageUrl, notes,
    } = req.body;

    if (!amount || !type) {
      return res.status(400).json({
        success: false,
        message: 'Amount and type are required.',
      });
    }

    let categoryName = 'Uncategorized';
    let resolvedCategoryId = categoryId || null;

    if (categoryId) {
      const Category = require('../models/Category.model');
      const cat = await Category.findOne({
        _id: categoryId,
        $or: [{ userId: req.user._id }, { isSystem: true }],
      });
      if (cat) {
        categoryName       = cat.name;
        resolvedCategoryId = cat._id;
      }
    }

    const transaction = await Transaction.create({
      userId:        req.user._id,
      type,
      amount:        parseFloat(amount),
      currency:      req.user.currency || 'INR',
      merchant:      merchant || null,
      categoryId:    resolvedCategoryId,
      categoryName,
      date:          date || new Date(),
      paymentMethod: paymentMethod || 'other',
      source:        'ocr',
      notes:         notes || null,
      ocrData: {
        receiptUrl:  imageUrl || null,
        confidence:  req.body.confidence || null,
        rawText:     req.body.rawText    || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Transaction created from receipt.',
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// GET /api/automation/sms/status
// Check SMS tracking status for current user
//─────────────────────────────────────
const getSMSStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({
      success: true,
      data: {
        smsTracking: user.smsTracking,
        webhookUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/automation/sms/webhook`,
      },
    });
  } catch (error) {
    next(error);
  }
};

//─────────────────────────────────────
// PUT /api/automation/sms/toggle
// Enable/disable SMS tracking
//─────────────────────────────────────
const toggleSMSTracking = async (req, res, next) => {
  try {
    const { enabled, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'smsTracking.enabled': Boolean(enabled),
          'smsTracking.phone':   phone ? phone.replace(/\D/g, '').slice(-10) : req.user.smsTracking?.phone,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: `SMS tracking ${enabled ? 'enabled' : 'disabled'}.`,
      data: { smsTracking: user.smsTracking },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upload,
  parseSMSManual,
  createFromSMS,
  smsWebhook,
  uploadReceipt,
  createFromOCR,
  getSMSStatus,
  toggleSMSTracking,
};