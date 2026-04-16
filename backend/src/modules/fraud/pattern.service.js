const Transaction = require('../transaction/transaction.model');
const logger = require('../../utils/logger');

/**
 * Pattern Detection Service
 * Analyzes transaction patterns using sliding window to detect anomalies
 */
class PatternService {
  constructor() {
    // Configuration thresholds
    this.FREQUENCY_THRESHOLD = 5;        // Max normal tx in 1 minute
    this.AMOUNT_MULTIPLIER = 5;           // Amount spike threshold
    this.WINDOW_SHORT = 1 * 60 * 1000;   // 1 minute window
    this.WINDOW_MEDIUM = 5 * 60 * 1000;  // 5 minute window
    this.WINDOW_LONG = 60 * 60 * 1000;   // 1 hour window
  }

  /**
   * Analyze transaction patterns for a user
   * @param {Object} transaction - Current transaction
   * @returns {Object} { score: 0-1, reasons: string[] }
   */
  async analyze(transaction) {
    try {
      const { userId, amount, timestamp } = transaction;
      const now = new Date(timestamp || Date.now());
      const reasons = [];
      let totalScore = 0;
      let factorCount = 0;

      // 1. Frequency anomaly detection (1-minute window)
      const frequencyScore = await this._checkFrequencyAnomaly(userId, now);
      if (frequencyScore > 0) {
        reasons.push(`High transaction frequency (${frequencyScore.toFixed(2)} score)`);
      }
      totalScore += frequencyScore;
      factorCount++;

      // 2. Amount anomaly detection
      const amountScore = await this._checkAmountAnomaly(userId, amount, now);
      if (amountScore > 0) {
        reasons.push(`Unusual transaction amount (${amountScore.toFixed(2)} score)`);
      }
      totalScore += amountScore;
      factorCount++;

      // 3. Velocity change detection (acceleration in tx rate)
      const velocityScore = await this._checkVelocityChange(userId, now);
      if (velocityScore > 0) {
        reasons.push(`Transaction velocity spike (${velocityScore.toFixed(2)} score)`);
      }
      totalScore += velocityScore;
      factorCount++;

      // 4. Time-of-day anomaly
      const timeScore = this._checkTimeAnomaly(now);
      if (timeScore > 0) {
        reasons.push(`Unusual transaction time`);
      }
      totalScore += timeScore;
      factorCount++;

      const finalScore = Math.min(factorCount > 0 ? totalScore / factorCount : 0, 1);

      logger.debug(`Pattern analysis for user ${userId}: score=${finalScore.toFixed(3)}`, {
        frequencyScore,
        amountScore,
        velocityScore,
        timeScore,
      });

      return {
        score: finalScore,
        reasons,
      };
    } catch (error) {
      logger.error(`Pattern analysis error: ${error.message}`);
      return { score: 0, reasons: [] };
    }
  }

  /**
   * Check frequency anomaly - count transactions in short window
   */
  async _checkFrequencyAnomaly(userId, now) {
    const windowStart = new Date(now.getTime() - this.WINDOW_SHORT);

    const recentCount = await Transaction.countDocuments({
      userId,
      timestamp: { $gte: windowStart, $lte: now },
    });

    if (recentCount >= this.FREQUENCY_THRESHOLD) {
      // Score scales from 0.5 to 1.0 based on how far above threshold
      return Math.min(0.5 + (recentCount - this.FREQUENCY_THRESHOLD) * 0.1, 1);
    }

    return 0;
  }

  /**
   * Check amount anomaly - compare against user's average
   */
  async _checkAmountAnomaly(userId, amount, now) {
    const windowStart = new Date(now.getTime() - this.WINDOW_LONG);

    const stats = await Transaction.aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: windowStart, $lte: now },
        },
      },
      {
        $group: {
          _id: null,
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length === 0 || stats[0].count < 2) {
      // Not enough history — check absolute threshold
      return amount > 10000 ? 0.5 : 0;
    }

    const avg = stats[0].avgAmount;

    if (amount > avg * this.AMOUNT_MULTIPLIER) {
      // Score scales based on how far above the multiplier
      const ratio = amount / avg;
      return Math.min(0.5 + (ratio / (this.AMOUNT_MULTIPLIER * 2)) * 0.5, 1);
    }

    return 0;
  }

  /**
   * Check velocity change - compare short vs medium window rates
   */
  async _checkVelocityChange(userId, now) {
    const shortStart = new Date(now.getTime() - this.WINDOW_SHORT);
    const mediumStart = new Date(now.getTime() - this.WINDOW_MEDIUM);

    const [shortCount, mediumCount] = await Promise.all([
      Transaction.countDocuments({
        userId,
        timestamp: { $gte: shortStart, $lte: now },
      }),
      Transaction.countDocuments({
        userId,
        timestamp: { $gte: mediumStart, $lt: shortStart },
      }),
    ]);

    // Rate per minute
    const shortRate = shortCount; // 1 min window
    const mediumRate = mediumCount / 4; // 4 min window (medium - short)

    if (mediumRate > 0 && shortRate > mediumRate * 3) {
      return Math.min(0.4 + (shortRate / mediumRate) * 0.1, 1);
    }

    return 0;
  }

  /**
   * Check time-of-day anomaly (2AM-5AM is suspicious)
   */
  _checkTimeAnomaly(timestamp) {
    const hour = timestamp.getHours();
    if (hour >= 2 && hour <= 5) {
      return 0.3;
    }
    return 0;
  }
}

module.exports = new PatternService();
