// backend/src/services/upi.service.js
// STAGE 6 — Feature 2: UPI Deep-link Settlements
//
// Generates standard UPI deep-links that open directly in GPay / PhonePe / Paytm.
// Format: upi://pay?pa=user@upi&pn=Name&am=750&cu=INR&tn=Note
//
// No external dependencies — pure URL construction.

/**
 * Build a UPI payment deep-link.
 *
 * @param {object} params
 * @param {string} params.upiId     — payee VPA e.g. "user@okicici"
 * @param {string} params.name      — payee display name
 * @param {number} params.amount    — amount in INR (e.g. 750)
 * @param {string} params.note      — transaction note / description
 * @param {string} [params.txnId]   — optional merchant transaction ID
 * @param {string} [params.refUrl]  — optional reference URL
 * @returns {string} UPI deep-link string
 */
const buildUPILink = ({ upiId, name, amount, note, txnId, refUrl }) => {
  if (!upiId || !name || !amount) {
    throw new Error('upiId, name, and amount are required to build a UPI link.');
  }

  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: (note || 'SpendWise Settlement').slice(0, 50),
  });

  if (txnId)  params.set('tid', txnId);
  if (refUrl) params.set('url', refUrl);

  return `upi://pay?${params.toString()}`;
};

/**
 * Build app-specific deep-links for GPay, PhonePe, Paytm.
 * Some apps use different URI schemes or additional params.
 */
const buildAppLinks = ({ upiId, name, amount, note, txnId }) => {
  const base = buildUPILink({ upiId, name, amount, note, txnId });

  return {
    upi:       base,
    gpay:      base.replace('upi://', 'tez://upi/'),
    phonepe:   base.replace('upi://', 'phonepe://'),
    paytm:     `paytmmp://pay?${new URLSearchParams({ pa: upiId, pn: name, am: amount.toFixed(2), cu: 'INR', tn: note || 'Settlement' }).toString()}`,
    bhim:      base.replace('upi://', 'bhim://'),
    // QR code friendly (standard UPI)
    qr:        base,
  };
};

/**
 * Verify a UPI webhook callback from a payment gateway (e.g. Razorpay).
 * Returns { success, transactionId, status, amount }
 */
const parseUPIWebhook = (body) => {
  // Standardise across different UPI gateway response shapes
  const status  = body.status || body.STATUS || body.txnStatus;
  const txnId   = body.txnId || body.TXNID || body.transactionId || body.razorpay_payment_id;
  const amount  = parseFloat(body.amount || body.TXNAMOUNT || body.txnAmount || 0);
  const success = ['SUCCESS', 'success', 'CAPTURED', 'SETTLED'].includes(status);

  return { success, status, txnId, amount };
};

module.exports = { buildUPILink, buildAppLinks, parseUPIWebhook };