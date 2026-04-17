const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'userId is required'],
      index: true,
    },
    receiverId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    // ── PaySim-style balance & type fields (for ensemble ML) ──
    txnType: {
      type: String,
      enum: ['TRANSFER', 'CASH_OUT', 'PAYMENT', 'DEBIT', 'CASH_IN'],
      default: 'TRANSFER',
    },
    step: {
      type: Number,
      default: 1,
    },
    oldbalanceOrg: {
      type: Number,
      default: 0,
    },
    newbalanceOrig: {
      type: Number,
      default: 0,
    },
    oldbalanceDest: {
      type: Number,
      default: 0,
    },
    newbalanceDest: {
      type: Number,
      default: 0,
    },
    location: {
      type: String,
      required: [true, 'location is required'],
    },
    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    isFraud: {
      type: Boolean,
      default: false,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    reason: {
      type: String,
      default: '',
    },
    mlScore: {
      type: Number,
      default: 0,
    },
    patternScore: {
      type: Number,
      default: 0,
    },
    graphScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient fraud queries
transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ isFraud: 1, timestamp: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
