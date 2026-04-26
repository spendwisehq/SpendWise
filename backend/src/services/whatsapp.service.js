// backend/src/services/whatsapp.service.js
// Twilio WhatsApp integration for SpendWise bot.
//
// Setup:
//   npm install twilio
//   Add to backend/.env:
//     TWILIO_ACCOUNT_SID=ACxxxxxx
//     TWILIO_AUTH_TOKEN=xxxxxx
//     TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886   ← Twilio sandbox number
//
// Twilio sandbox setup:
//   1. Sign up at https://console.twilio.com
//   2. Go to Messaging → Try it Out → Send a WhatsApp Message
//   3. Follow sandbox join instructions
//   4. Set webhook URL to: POST https://your-domain.com/api/automation/whatsapp/webhook
//
// Message format the bot understands:
//   "swiggy 250"              → expense: Swiggy ₹250
//   "salary 45000 income"     → income: Salary ₹45000
//   "coffee 80 food"          → expense with category hint
//   "balance"                 → replies with this month's summary
//   "help"                    → replies with usage instructions

const config = require('../config/env');

let twilioClient = null;

const getClient = () => {
  if (!twilioClient) {
    // Lazy-load so the app doesn't crash if Twilio isn't configured
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env');
    }
    const twilio = require('twilio');
    twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

/**
 * Send a WhatsApp message via Twilio.
 * @param {string} to   — recipient number in WhatsApp format: "whatsapp:+919876543210"
 * @param {string} body — message text
 */
const sendMessage = async (to, body) => {
  const from = config.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  const client = getClient();
  return client.messages.create({ from, to, body });
};

/**
 * Parse an incoming WhatsApp message into a transaction intent.
 *
 * Patterns supported:
 *   "<merchant> <amount>"                  → expense
 *   "<merchant> <amount> income"           → income
 *   "<merchant> <amount> <category hint>"  → expense with hint
 *   "balance"                              → summary request
 *   "help"                                 → help text
 *
 * Returns:
 *   { type: 'transaction', merchant, amount, transactionType, categoryHint }
 *   { type: 'balance' }
 *   { type: 'help' }
 *   { type: 'unknown' }
 */
const parseMessage = (text = '') => {
  const t = text.trim().toLowerCase();

  if (t === 'balance' || t === 'bal' || t === 'summary') {
    return { type: 'balance' };
  }

  if (t === 'help' || t === 'hi' || t === 'hello' || t === 'start') {
    return { type: 'help' };
  }

  // Match: <words> <number> [optional words]
  // e.g. "swiggy 250", "coffee 80 food dining", "salary 45000 income"
  const match = t.match(/^(.+?)\s+(\d[\d,.]*)\s*(.*)$/);
  if (!match) return { type: 'unknown', raw: text };

  const merchant   = match[1].trim();
  const amount     = parseFloat(match[2].replace(/,/g, ''));
  const rest       = (match[3] || '').trim();

  const isIncome   = rest.includes('income') || rest.includes('salary') || rest.includes('credit');
  const categoryHint = rest.replace(/income|salary|credit|expense/gi, '').trim() || null;

  return {
    type:            'transaction',
    merchant:        merchant.charAt(0).toUpperCase() + merchant.slice(1),
    amount,
    transactionType: isIncome ? 'income' : 'expense',
    categoryHint,
    raw:             text,
  };
};

/**
 * Build the help message text.
 */
const helpText = () => `*SpendWise Bot* 💸

*Log an expense:*
  swiggy 250
  amazon 1499

*Log income:*
  salary 45000 income
  freelance 8000 income

*With category hint:*
  coffee 80 food
  ola 200 transport

*Check balance:*
  balance

*Commands:*
  help — show this message

_Amounts in ₹. Transactions are logged instantly._`;

module.exports = { sendMessage, parseMessage, helpText };