// backend/src/models/WebhookEndpoint.model.js
// Stores webhook endpoint registrations for API consumers.
// Each endpoint belongs to a user and subscribes to one or more events.

const mongoose = require('mongoose');
const crypto   = require('crypto');

const WebhookEndpointSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // The URL SpendWise will POST to when a subscribed event fires
    url: {
      type:     String,
      required: true,
      trim:     true,
      validate: {
        validator: (v) => /^https?:\/\/.+/.test(v),
        message:   'URL must start with http:// or https://',
      },
    },

    // Human-readable label (e.g. "My Accounting App")
    label: {
      type:    String,
      trim:    true,
      default: 'My Webhook',
      maxlength: 100,
    },

    // Events this endpoint is subscribed to
    events: {
      type:     [String],
      enum:     ['transaction.created', 'budget.exceeded', 'anomaly.detected'],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message:   'At least one event must be selected.',
      },
    },

    // HMAC-SHA256 signing secret — shown once at creation, then hashed for storage
    // Consumers use this to verify X-SpendWise-Signature header
    secret: {
      type:   String,
      select: false, // never returned in queries unless explicitly requested
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    // Delivery statistics (informational — not used for retry logic)
    stats: {
      totalDelivered: { type: Number, default: 0 },
      totalFailed:    { type: Number, default: 0 },
      lastDeliveredAt:{ type: Date,   default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Generate a cryptographically random secret before saving (only on create)
WebhookEndpointSchema.pre('save', function (next) {
  if (this.isNew && !this.secret) {
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Index for fast lookup by userId + event (used in fireWebhook dispatcher)
WebhookEndpointSchema.index({ userId: 1, events: 1, isActive: 1 });

module.exports = mongoose.model('WebhookEndpoint', WebhookEndpointSchema);