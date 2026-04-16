const axios = require('axios');
const patternService = require('./pattern.service');
const graphService = require('./graph.service');
const alertService = require('../alert/alert.service');
const { emitNewTransaction, emitFraudDetected } = require('../../config/socket');
const logger = require('../../utils/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Weights for the composite fraud score
const WEIGHTS = {
  ml: 0.5,
  pattern: 0.3,
  graph: 0.2,
};

// Risk level thresholds
const RISK_THRESHOLDS = {
  high: 0.7,
  medium: 0.3,
};

/**
 * Main Fraud Detection Orchestrator
 * Combines ML, pattern, and graph analysis into a final fraud score
 */
class FraudService {
  /**
   * Run the full fraud detection pipeline on a transaction
   * @param {Object} transaction - Mongoose transaction document
   * @returns {Object} Updated transaction with fraud scores
   */
  async analyze(transaction) {
    try {
      logger.info(`Starting fraud analysis for transaction: ${transaction._id}`);

      // Run all 3 detection engines in parallel
      const [mlResult, patternResult, graphResult] = await Promise.allSettled([
        this._getMLScore(transaction),
        patternService.analyze(transaction),
        Promise.resolve(graphService.analyze(transaction)),
      ]);

      // Extract scores (default to 0 if engine fails)
      const mlScore = mlResult.status === 'fulfilled' ? mlResult.value.score : 0;
      const mlReason = mlResult.status === 'fulfilled' ? mlResult.value.reason : '';
      const patternScore = patternResult.status === 'fulfilled' ? patternResult.value.score : 0;
      const patternReasons = patternResult.status === 'fulfilled' ? patternResult.value.reasons : [];
      const graphScore = graphResult.status === 'fulfilled' ? graphResult.value.score : 0;
      const graphReasons = graphResult.status === 'fulfilled' ? graphResult.value.reasons : [];

      // Calculate composite fraud score
      const fraudScore =
        WEIGHTS.ml * mlScore +
        WEIGHTS.pattern * patternScore +
        WEIGHTS.graph * graphScore;

      // Determine risk level
      let riskLevel = 'low';
      if (fraudScore >= RISK_THRESHOLDS.high) riskLevel = 'high';
      else if (fraudScore >= RISK_THRESHOLDS.medium) riskLevel = 'medium';

      // Build explainability reason
      const allReasons = [];
      if (mlReason) allReasons.push(mlReason);
      allReasons.push(...patternReasons, ...graphReasons);

      const reason = allReasons.length > 0
        ? allReasons.join(' | ')
        : 'No anomalies detected';

      const isFraud = fraudScore >= RISK_THRESHOLDS.high;

      // Update the transaction document
      transaction.fraudScore = Math.round(fraudScore * 1000) / 1000;
      transaction.isFraud = isFraud;
      transaction.riskLevel = riskLevel;
      transaction.reason = reason;
      transaction.mlScore = Math.round(mlScore * 1000) / 1000;
      transaction.patternScore = Math.round(patternScore * 1000) / 1000;
      transaction.graphScore = Math.round(graphScore * 1000) / 1000;

      await transaction.save();

      // Emit real-time update
      emitNewTransaction(transaction.toObject());

      // If fraud detected, create alert and emit
      if (isFraud) {
        logger.warn(`[URGENT] FRAUD DETECTED: Transaction ${transaction._id} | Score: ${fraudScore.toFixed(3)} | Reason: ${reason}`);

        const alert = await alertService.createAlert({
          transactionId: transaction._id,
          userId: transaction.userId,
          fraudScore: transaction.fraudScore,
          riskLevel,
          reason,
          amount: transaction.amount,
          location: transaction.location,
        });

        emitFraudDetected({
          ...alert.toObject(),
          transaction: transaction.toObject(),
        });
      } else {
        logger.info(`Transaction ${transaction._id} cleared | Score: ${fraudScore.toFixed(3)} | Risk: ${riskLevel}`);
      }

      return transaction;
    } catch (error) {
      logger.error(`Fraud analysis failed for transaction ${transaction._id}: ${error.message}`);
      // Don't fail the transaction — save with 0 score
      transaction.fraudScore = 0;
      transaction.reason = 'Fraud analysis failed — defaulting to safe';
      await transaction.save();
      return transaction;
    }
  }

  /**
   * Call the Python AI service for ML-based prediction
   */
  async _getMLScore(transaction) {
    try {
      // Calculate frequency (recent tx count for this user in last 5 min)
      const Transaction = require('../transaction/transaction.model');
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

      const recentCount = await Transaction.countDocuments({
        userId: transaction.userId,
        timestamp: { $gte: fiveMinAgo },
      });

      // Check location and device changes
      const lastTx = await Transaction.findOne({
        userId: transaction.userId,
        _id: { $ne: transaction._id },
      }).sort({ timestamp: -1 });

      const locationChange = lastTx && lastTx.location !== transaction.location ? 1 : 0;
      const deviceChange = lastTx && lastTx.deviceId !== transaction.deviceId ? 1 : 0;

      const payload = {
        amount: transaction.amount,
        frequency: recentCount,
        location_change: locationChange,
        device_change: deviceChange,
      };

      const response = await axios.post(`${AI_SERVICE_URL}/predict`, payload, {
        timeout: 5000, // 5 second timeout
      });

      const { fraud_score, reason } = response.data;

      logger.debug(`ML prediction for ${transaction._id}: score=${fraud_score}`, payload);

      return {
        score: fraud_score || 0,
        reason: reason || '',
      };
    } catch (error) {
      logger.warn(`AI service unavailable: ${error.message}. Using fallback scoring.`);
      // Fallback: simple rule-based scoring
      return this._fallbackMLScore(transaction);
    }
  }

  /**
   * Fallback scoring when AI service is unavailable
   */
  _fallbackMLScore(transaction) {
    let score = 0;
    const reasons = [];

    // High amount check
    if (transaction.amount > 10000) {
      score += 0.3;
      reasons.push('High transaction amount');
    }
    if (transaction.amount > 50000) {
      score += 0.3;
      reasons.push('Very high transaction amount');
    }

    return {
      score: Math.min(score, 1),
      reason: reasons.join(' | ') || 'Fallback scoring (AI service unavailable)',
    };
  }
}

module.exports = new FraudService();
