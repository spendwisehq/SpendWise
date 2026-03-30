// backend/src/utils/smsParser.js

/**
 * SpendWise SMS Parser
 * Handles Indian bank UPI, debit/credit SMS formats
 * Supports: SBI, HDFC, ICICI, Axis, Kotak, PNB, BOB, Canara, Yes Bank, IndusInd
 */

//─────────────────────────────────────
// PATTERNS
//─────────────────────────────────────

const DEBIT_PATTERNS = [
  // UPI debit
  /(?:debited|deducted|paid|sent|transferred)\s+(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:debited|deducted|paid|sent)/i,
  // Generic debit
  /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:debited|deducted)/i,
  // Amount first
  /(?:amount|amt)\s*(?:of\s*)?(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
];

const CREDIT_PATTERNS = [
  /(?:credited|received|deposited|added)\s+(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:credited|received|deposited)/i,
  /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)\s+(?:has been\s+)?(?:credited|received)/i,
];

const UPI_ID_PATTERN   = /(?:upi\s*(?:id|ref)?[:\s]*|vpa[:\s]*)([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i;
const REF_PATTERNS     = [
  /(?:ref(?:erence)?\s*(?:no\.?|number|#)?[:\s]*)([A-Z0-9]{8,20})/i,
  /(?:txn\s*(?:id|no\.?)?[:\s]*)([A-Z0-9]{8,20})/i,
  /(?:utr[:\s]*)([A-Z0-9]{10,22})/i,
  /(?:rrn[:\s]*)(\d{10,15})/i,
];

const MERCHANT_PATTERNS = [
  /(?:to|at|for|paid to|sent to)\s+([A-Za-z0-9\s&'.,-]{2,40})(?:\s+on|\s+via|\s+ref|\s+upi|\.|$)/i,
  /(?:merchant|shop|store)[:\s]+([A-Za-z0-9\s&'.,-]{2,40})/i,
];

const BANK_PATTERNS = {
  'SBI':       /(?:sbi|state bank)/i,
  'HDFC':      /hdfc/i,
  'ICICI':     /icici/i,
  'Axis':      /axis\s*bank/i,
  'Kotak':     /kotak/i,
  'PNB':       /(?:pnb|punjab national)/i,
  'BOB':       /(?:bob|bank of baroda)/i,
  'Canara':    /canara/i,
  'Yes Bank':  /yes\s*bank/i,
  'IndusInd':  /indusind/i,
  'IDFC':      /idfc/i,
  'Federal':   /federal\s*bank/i,
  'Union':     /union\s*bank/i,
  'Indian':    /indian\s*bank/i,
  'Paytm':     /paytm/i,
  'PhonePe':   /phonepe/i,
  'GPay':      /(?:gpay|google\s*pay)/i,
  'BHIM':      /bhim/i,
};

const BALANCE_PATTERN = /(?:avl\.?\s*bal(?:ance)?|available\s+balance|bal)[:\s]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;

//─────────────────────────────────────
// HELPERS
//─────────────────────────────────────

const parseAmount = (str) => {
  if (!str) return null;
  const clean = str.replace(/,/g, '').trim();
  const val   = parseFloat(clean);
  return isNaN(val) ? null : val;
};

const extractAmount = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseAmount(match[1]);
      if (amount && amount > 0) return amount;
    }
  }
  return null;
};

const extractRefNumber = (text) => {
  for (const pattern of REF_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return null;
};

const extractBankName = (text) => {
  for (const [bank, pattern] of Object.entries(BANK_PATTERNS)) {
    if (pattern.test(text)) return bank;
  }
  return null;
};

const extractMerchant = (text) => {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim().replace(/\s+/g, ' ').slice(0, 60);
    }
  }
  return null;
};

const extractUpiId = (text) => {
  const match = text.match(UPI_ID_PATTERN);
  return match?.[1] || null;
};

const extractBalance = (text) => {
  const match = text.match(BALANCE_PATTERN);
  return match?.[1] ? parseAmount(match[1]) : null;
};

const isSpamSMS = (text) => {
  const spamKeywords = [
    'congratulations', 'lottery', 'winner', 'prize', 'click here',
    'offer expires', 'free gift', 'otp', 'password', 'verify your',
    'loan approved', 'pre-approved',
  ];
  const lower = text.toLowerCase();
  return spamKeywords.some(k => lower.includes(k));
};

//─────────────────────────────────────
// MAIN PARSER
//─────────────────────────────────────

/**
 * Parse an SMS message and extract transaction data
 * @param {string} message - Raw SMS text
 * @returns {object|null} - Parsed transaction or null if not a financial SMS
 */
const parseSMS = (message) => {
  if (!message || typeof message !== 'string') return null;

  const text = message.trim();

  // Skip spam/OTP SMS
  if (isSpamSMS(text)) return null;

  // Determine transaction type
  let type   = null;
  let amount = null;

  const debitAmount  = extractAmount(text, DEBIT_PATTERNS);
  const creditAmount = extractAmount(text, CREDIT_PATTERNS);

  if (debitAmount && !creditAmount) {
    type   = 'expense';
    amount = debitAmount;
  } else if (creditAmount && !debitAmount) {
    type   = 'income';
    amount = creditAmount;
  } else if (debitAmount && creditAmount) {
    // Both found — pick larger context clue
    const lowerText = text.toLowerCase();
    if (lowerText.includes('debited') || lowerText.includes('paid') || lowerText.includes('sent')) {
      type   = 'expense';
      amount = debitAmount;
    } else {
      type   = 'income';
      amount = creditAmount;
    }
  }

  // Not a financial SMS
  if (!amount || !type) return null;

  // Extract metadata
  const upiId     = extractUpiId(text);
  const refNumber = extractRefNumber(text);
  const bankName  = extractBankName(text);
  const merchant  = extractMerchant(text);
  const balance   = extractBalance(text);

  // Determine payment method
  let paymentMethod = 'other';
  const lower = text.toLowerCase();
  if (upiId || lower.includes('upi'))           paymentMethod = 'upi';
  else if (lower.includes('card'))              paymentMethod = 'card';
  else if (lower.includes('netbank') || lower.includes('net banking')) paymentMethod = 'netbanking';
  else if (lower.includes('wallet'))            paymentMethod = 'wallet';
  else if (lower.includes('neft') || lower.includes('rtgs') || lower.includes('imps')) paymentMethod = 'netbanking';

  return {
    type,
    amount,
    paymentMethod,
    merchant:   merchant || bankName || null,
    smsData: {
      rawMessage: text,
      parsedAt:   new Date(),
      upiId,
      bankName,
      refNumber,
    },
    balance, // remaining balance (informational)
    confidence: calculateConfidence({ amount, type, upiId, refNumber, bankName }),
  };
};

const calculateConfidence = ({ amount, type, upiId, refNumber, bankName }) => {
  let score = 0;
  if (amount)    score += 40;
  if (type)      score += 20;
  if (upiId)     score += 20;
  if (refNumber) score += 10;
  if (bankName)  score += 10;
  return Math.min(100, score);
};

module.exports = { parseSMS };