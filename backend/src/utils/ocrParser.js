// backend/src/utils/ocrParser.js

/**
 * SpendWise OCR Parser
 * Currently a smart stub — extracts what it can from text.
 * Plug in Tesseract.js or Google Vision by replacing extractTextFromImage().
 */

//─────────────────────────────────────
// TEXT EXTRACTION (stub — replace with real OCR)
//─────────────────────────────────────

/**
 * Extract text from image URL
 * Replace this function body with Tesseract.js or Google Vision when ready.
 */
const extractTextFromImage = async (imageUrl) => {
  // ── TESSERACT EXAMPLE (uncomment when ready) ──────────────────
  // const Tesseract = require('tesseract.js');
  // const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
  // return { text, confidence: data.confidence };

  // ── GOOGLE VISION EXAMPLE (uncomment when ready) ──────────────
  // const vision = require('@google-cloud/vision');
  // const client = new vision.ImageAnnotatorClient();
  // const [result] = await client.textDetection(imageUrl);
  // const text = result.fullTextAnnotation?.text || '';
  // return { text, confidence: 95 };

  // ── STUB: return null to signal OCR not yet active ─────────────
  return { text: null, confidence: 0 };
};

//─────────────────────────────────────
// RECEIPT TEXT PARSER
//─────────────────────────────────────

const AMOUNT_PATTERNS = [
  /(?:total|amount|grand total|net amount|bill amount)[:\s]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
];

const DATE_PATTERNS = [
  /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
  /(\d{4}[\/\-]\d{2}[\/\-]\d{2})/,
];

const MERCHANT_PATTERNS = [
  /^([A-Za-z0-9\s&'.,-]{3,50})\n/,
  /(?:sold by|merchant|store|shop)[:\s]+([A-Za-z0-9\s&'.,-]{3,50})/i,
];

const parseReceiptText = (text) => {
  if (!text) return null;

  let amount   = null;
  let date     = null;
  let merchant = null;

  // Extract amount
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) { amount = val; break; }
    }
  }

  // Extract date
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) { date = parsed; break; }
    }
  }

  // Extract merchant
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) { merchant = match[1].trim(); break; }
  }

  return { amount, date, merchant, rawText: text };
};

//─────────────────────────────────────
// MAIN EXPORT
//─────────────────────────────────────

/**
 * Process a receipt image and extract transaction data
 * @param {string} imageUrl - Cloudinary URL of the uploaded receipt
 * @returns {object} - Extracted transaction data + OCR metadata
 */
const processReceipt = async (imageUrl) => {
  const { text, confidence } = await extractTextFromImage(imageUrl);

  if (!text) {
    return {
      success:    false,
      ocrActive:  false,
      message:    'OCR engine not yet configured. Image saved — data entry required.',
      imageUrl,
      confidence: 0,
      parsed:     null,
    };
  }

  const parsed = parseReceiptText(text);

  return {
    success:   true,
    ocrActive: true,
    imageUrl,
    confidence,
    parsed,
    rawText: text,
  };
};

module.exports = { processReceipt };