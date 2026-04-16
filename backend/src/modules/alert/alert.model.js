const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    fraudScore: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'dismissed', 'confirmed'],
      default: 'new',
      index: true,
    },
    amount: {
      type: Number,
    },
    location: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ status: 1, timestamp: -1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
