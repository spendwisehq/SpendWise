// backend/src/routes/webhook.routes.js
// CRUD for webhook endpoint management.
// All routes require JWT auth — these are per-user webhook registrations.
//
// POST   /api/webhooks          — register a new endpoint
// GET    /api/webhooks          — list all my endpoints
// PUT    /api/webhooks/:id      — update label/url/events/isActive
// DELETE /api/webhooks/:id      — remove an endpoint
// POST   /api/webhooks/:id/test — send a test ping to an endpoint

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth.middleware');
const WebhookEndpoint = require('../models/WebhookEndpoint.model');
const { buildSignature } = require('../services/webhook.service');

router.use(protect);

// ── POST /api/webhooks — register ────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { url, label, events } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: 'url is required.' });
    }
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'events array is required (e.g. ["transaction.created"]).' });
    }

    const VALID_EVENTS = ['transaction.created', 'budget.exceeded', 'anomaly.detected'];
    const invalid = events.filter(e => !VALID_EVENTS.includes(e));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid events: ${invalid.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}`,
      });
    }

    // Enforce a reasonable limit per user
    const existing = await WebhookEndpoint.countDocuments({ userId: req.user._id });
    if (existing >= 10) {
      return res.status(429).json({ success: false, message: 'Maximum 10 webhook endpoints per user.' });
    }

    // Create — secret is auto-generated in pre-save hook
    const endpoint = new WebhookEndpoint({
      userId: req.user._id,
      url,
      label:  label || 'My Webhook',
      events,
    });
    await endpoint.save();

    // Return the plaintext secret ONCE — it cannot be retrieved again
    // (stored as plaintext in this model because it's a signing secret, not a password)
    const withSecret = await WebhookEndpoint.findById(endpoint._id).select('+secret');

    return res.status(201).json({
      success: true,
      message: 'Webhook endpoint registered. Save the secret — it will not be shown again.',
      data: {
        id:      withSecret._id,
        url:     withSecret.url,
        label:   withSecret.label,
        events:  withSecret.events,
        secret:  withSecret.secret,  // ← shown once
        isActive: withSecret.isActive,
        createdAt: withSecret.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /api/webhooks — list ──────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const endpoints = await WebhookEndpoint.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { endpoints },
    });
  } catch (error) {
    next(error);
  }
});

// ── PUT /api/webhooks/:id — update ────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook ID.' });
    }

    const { url, label, events, isActive } = req.body;
    const updates = {};
    if (url      !== undefined) updates.url      = url;
    if (label    !== undefined) updates.label    = label;
    if (events   !== undefined) updates.events   = events;
    if (isActive !== undefined) updates.isActive = isActive;

    const endpoint = await WebhookEndpoint.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found.' });
    }

    return res.status(200).json({ success: true, message: 'Webhook updated.', data: { endpoint } });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /api/webhooks/:id — remove ────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook ID.' });
    }

    const endpoint = await WebhookEndpoint.findOneAndDelete({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found.' });
    }

    return res.status(200).json({ success: true, message: 'Webhook endpoint removed.' });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/webhooks/:id/test — test ping ───────────────────────────────────
// Sends a fake "ping" event to the endpoint so the consumer can verify it works.
router.post('/:id/test', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid webhook ID.' });
    }

    const endpoint = await WebhookEndpoint.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    }).select('+secret');

    if (!endpoint) {
      return res.status(404).json({ success: false, message: 'Webhook endpoint not found.' });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const testPayload = {
      event:     'ping',
      timestamp,
      data: {
        message:    'This is a test delivery from SpendWise.',
        endpointId: endpoint._id,
        sentAt:     new Date().toISOString(),
      },
    };

    const signature = buildSignature(endpoint.secret, timestamp, testPayload.data);

    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(endpoint.url, {
        method:  'POST',
        headers: {
          'Content-Type':          'application/json',
          'X-SpendWise-Event':     'ping',
          'X-SpendWise-Timestamp': timestamp,
          'X-SpendWise-Signature': `sha256=${signature}`,
          'User-Agent':            'SpendWise-Webhook/1.0',
        },
        body:   JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      return res.status(200).json({
        success: true,
        data: {
          delivered:  response.ok,
          statusCode: response.status,
          message:    response.ok
            ? 'Test ping delivered successfully.'
            : `Endpoint responded with ${response.status}.`,
        },
      });
    } catch (fetchErr) {
      return res.status(200).json({
        success: true,
        data: {
          delivered:  false,
          statusCode: null,
          message:    `Delivery failed: ${fetchErr.message}`,
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;