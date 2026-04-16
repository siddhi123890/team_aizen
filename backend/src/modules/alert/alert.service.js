const Alert = require('./alert.model');
const logger = require('../../utils/logger');

class AlertService {
  /**
   * Create a new fraud alert
   */
  async createAlert(alertData) {
    try {
      const alert = new Alert(alertData);
      await alert.save();
      logger.warn(`🚨 Alert created: ${alert._id} | User: ${alertData.userId} | Score: ${alertData.fraudScore} | Risk: ${alertData.riskLevel}`);
      return alert;
    } catch (error) {
      logger.error(`Failed to create alert: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get alerts with optional filters and pagination
   */
  async getAlerts({ status, riskLevel, page = 1, limit = 20 } = {}) {
    try {
      const filter = {};
      if (status) filter.status = status;
      if (riskLevel) filter.riskLevel = riskLevel;

      const skip = (page - 1) * limit;

      const [alerts, total] = await Promise.all([
        Alert.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .populate('transactionId')
          .lean(),
        Alert.countDocuments(filter),
      ]);

      return {
        alerts,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to get alerts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update alert status
   */
  async updateStatus(alertId, status) {
    try {
      const alert = await Alert.findByIdAndUpdate(
        alertId,
        { status },
        { new: true, runValidators: true }
      );
      if (!alert) throw new Error('Alert not found');
      logger.info(`Alert ${alertId} status updated to: ${status}`);
      return alert;
    } catch (error) {
      logger.error(`Failed to update alert status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getStats() {
    try {
      const [total, newAlerts, highRisk] = await Promise.all([
        Alert.countDocuments(),
        Alert.countDocuments({ status: 'new' }),
        Alert.countDocuments({ riskLevel: 'high' }),
      ]);

      return { total, new: newAlerts, highRisk };
    } catch (error) {
      logger.error(`Failed to get alert stats: ${error.message}`);
      return { total: 0, new: 0, highRisk: 0 };
    }
  }
}

module.exports = new AlertService();
