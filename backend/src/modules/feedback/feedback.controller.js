const Feedback = require('./feedback.model');
const Transaction = require('../transaction/transaction.model');
const { AppError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

/**
 * Submit feedback on a fraud prediction
 * POST /api/feedback
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { transactionId, isFraud, reviewedBy, notes } = req.body;

    // Verify transaction exists
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return next(new AppError('Transaction not found', 404));
    }

    // Check for existing feedback
    const existing = await Feedback.findOne({ transactionId });
    if (existing) {
      // Update existing feedback
      existing.isFraud = isFraud;
      existing.reviewedBy = reviewedBy || 'analyst';
      existing.notes = notes || '';
      existing.timestamp = new Date();
      await existing.save();

      logger.info(`Feedback updated for transaction ${transactionId}: isFraud=${isFraud}`);

      return res.json({
        success: true,
        message: 'Feedback updated',
        data: existing,
      });
    }

    // Create new feedback
    const feedback = new Feedback({
      transactionId,
      isFraud,
      reviewedBy: reviewedBy || 'analyst',
      notes: notes || '',
    });
    await feedback.save();

    logger.info(`Feedback submitted for transaction ${transactionId}: isFraud=${isFraud}`);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all feedback (for retraining)
 * GET /api/feedback
 */
const getFeedback = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedbacks, total] = await Promise.all([
      Feedback.find()
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('transactionId')
        .lean(),
      Feedback.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        feedbacks,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitFeedback, getFeedback };
