// backend/src/services/webhook.service.js
// Webhook delivery service — transforms SpendWise's API from pull-only to push.
// API consumers register URLs here; SpendWise calls them on key events.
//
// Supported events:
//   transaction.created   — fired after POST /api/transactions
//   budget.exceeded       — fired when spending crosses 50/80/100% threshold
//   anomaly.detected      — fired when AI flags an unusual transaction
//
// Delivery guarantees:
//   • 3 retries with exponential backoff (1s → 2s → 4s)
//   • HMAC-SHA256 signature on every request (X-SpendWise-Signature header)
//   • Delivery is non-blocking (fire-and-forget from route handlers)
//   • Failed deliveries are logged but don't affect the main response

const crypto = require('crypto');
const WebhookEndpoint = require('../models/WebhookEndpoint.model');

// ── Build the HMAC signature ──────────────────────────────────────────────────
// Consumers verify this to confirm the request is genuinely from SpendWise.
// Formula: HMAC-SHA256(secret, "timestamp.body_json")
const buildSignature = (secret, timestamp, body) => {
  const payload = `${timestamp}.${JSON.stringify(body)}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

// ── Deliver to a single endpoint with retries ────────────────────────────────
const deliverWithRetry = async (endpoint, event, payload, maxRetries = 3) => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildSignature(endpoint.secret, timestamp, payload);

  const body = JSON.stringify({
    event,
    timestamp,
    data: payload,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use native fetch (Node 18+) — no extra dependency needed
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 10_000); // 10s timeout

      const response = await fetch(endpoint.url, {
        method:  'POST',
        headers: {
          'Content-Type':          'application/json',
          'X-SpendWise-Event':     event,
          'X-SpendWise-Timestamp': timestamp,
          'X-SpendWise-Signature': `sha256=${signature}`,
          'User-Agent':            'SpendWise-Webhook/1.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        console.log(`[Webhook] ✅ ${event} → ${endpoint.url} (${response.status})`);
        return { success: true, status: response.status };
      }

      console.warn(`[Webhook] ⚠️  ${event} → ${endpoint.url} got ${response.status} (attempt ${attempt}/${maxRetries})`);
    } catch (err) {
      console.error(`[Webhook] ❌ ${event} → ${endpoint.url} attempt ${attempt} failed: ${err.message}`);
    }

    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }

  console.error(`[Webhook] 💀 ${event} → ${endpoint.url} permanently failed after ${maxRetries} attempts`);
  return { success: false };
};

// ── Main dispatcher ───────────────────────────────────────────────────────────
// Call this from any controller to fire webhooks for a given user + event.
// This is intentionally non-blocking: it never throws, never awaits upstream.
const fireWebhook = (userId, event, payload) => {
  // Validate event name
  const VALID_EVENTS = ['transaction.created', 'budget.exceeded', 'anomaly.detected'];
  if (!VALID_EVENTS.includes(event)) {
    console.warn(`[Webhook] Unknown event: ${event}`);
    return;
  }

  // Async work runs in the background — caller continues immediately
  (async () => {
    try {
      // Find all active endpoints for this user that subscribe to this event
      const endpoints = await WebhookEndpoint.find({
        userId,
        isActive: true,
        events:   event,
      }).lean();

      if (endpoints.length === 0) return;

      // Deliver to all endpoints concurrently
      await Promise.allSettled(
        endpoints.map(ep => deliverWithRetry(ep, event, payload))
      );
    } catch (err) {
      console.error('[Webhook] Dispatcher error:', err.message);
    }
  })();
};

module.exports = { fireWebhook, buildSignature };