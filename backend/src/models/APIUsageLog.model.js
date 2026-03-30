// backend/src/models/APIUsageLog.model.js

const mongoose = require('mongoose');

const apiUsageLogSchema = new mongoose.Schema(
  {
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'APIKey',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    endpoint:     { type: String, required: true },
    method:       { type: String, required: true },
    statusCode:   { type: Number, required: true },
    responseTime: { type: Number, default: null }, // ms
    ipAddress:    { type: String, default: null },
    userAgent:    { type: String, default: null },
    requestBody:  { type: Object, default: null, select: false },
    error:        { type: String, default: null },
    createdAt:    { type: Date, default: Date.now },
  },
  { timestamps: false }
);

apiUsageLogSchema.index({ apiKeyId: 1, createdAt: -1 });
apiUsageLogSchema.index({ userId: 1, createdAt: -1 });

const APIUsageLog = mongoose.model('APIUsageLog', apiUsageLogSchema);
module.exports = APIUsageLog;