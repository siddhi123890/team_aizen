const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
    },
    isFraud: {
      type: Boolean,
      required: true,
    },
    reviewedBy: {
      type: String,
      default: 'analyst',
    },
    notes: {
      type: String,
      default: '',
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

feedbackSchema.index({ transactionId: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
