const Transaction = require('./transaction.model');
const fraudService = require('../fraud/fraud.service');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class TransactionService {
  /**
   * Create a new transaction and trigger fraud detection
   */
  async createTransaction(data) {
    try {
      const transaction = new Transaction({
        userId: data.userId,
        receiverId: data.receiverId || null,
        amount: data.amount,
        location: data.location,
        deviceId: data.deviceId,
        timestamp: data.timestamp || new Date(),
      });

      // Save first, then analyze (so it's in DB for pattern queries)
      await transaction.save();
      logger.info(`Transaction created: ${transaction._id} | User: ${data.userId} | Amount: ${data.amount}`);

      // Trigger fraud detection pipeline (async, but we await for the response)
      const analyzedTransaction = await fraudService.analyze(transaction);

      return analyzedTransaction;
    } catch (error) {
      logger.error(`Transaction creation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions({ userId, isFraud, riskLevel, page = 1, limit = 20 } = {}) {
    try {
      const filter = {};
      if (userId) filter.userId = userId;
      if (typeof isFraud === 'boolean') filter.isFraud = isFraud;
      if (riskLevel) filter.riskLevel = riskLevel;

      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        Transaction.find(filter)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments(filter),
      ]);

      return {
        transactions,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to get transactions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a single transaction by ID
   */
  async getTransactionById(id) {
    const transaction = await Transaction.findById(id).lean();
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return transaction;
  }

  /**
   * Simulate normal transactions for demo purposes
   */
  async simulateNormal(count = 10) {
    const cities = ['New York', 'London', 'Tokyo', 'Mumbai', 'Berlin', 'Sydney', 'Toronto', 'Paris'];
    const users = ['user_001', 'user_002', 'user_003', 'user_004', 'user_005'];
    const receivers = ['merchant_001', 'merchant_002', 'merchant_003', 'user_006', 'user_007'];
    const devices = ['iphone_14', 'pixel_7', 'samsung_s23', 'macbook_pro', 'ipad_air'];

    const results = [];

    for (let i = 0; i < count; i++) {
      const data = {
        userId: users[Math.floor(Math.random() * users.length)],
        receiverId: receivers[Math.floor(Math.random() * receivers.length)],
        amount: Math.round((Math.random() * 500 + 10) * 100) / 100, // $10-$510
        location: cities[Math.floor(Math.random() * cities.length)],
        deviceId: devices[Math.floor(Math.random() * devices.length)],
      };

      const tx = await this.createTransaction(data);
      results.push(tx);

      // Small delay to spread transactions
      await new Promise((r) => setTimeout(r, 100));
    }

    logger.info(`Simulated ${count} normal transactions`);
    return results;
  }

  /**
   * Simulate fraudulent transactions for demo purposes
   */
  async simulateFraud(count = 5) {
    const results = [];
    const userId = 'fraud_user_' + uuidv4().slice(0, 6);

    // Rapid-fire high-amount transactions from same user to multiple receivers
    for (let i = 0; i < count; i++) {
      const data = {
        userId,
        receiverId: `mule_account_${i + 1}`,
        amount: Math.round((Math.random() * 50000 + 10000) * 100) / 100, // $10K-$60K
        location: i % 2 === 0 ? 'Lagos' : 'Moscow', // Alternating locations (suspicious)
        deviceId: `unknown_device_${i}`, // Different devices (suspicious)
      };

      const tx = await this.createTransaction(data);
      results.push(tx);

      // Very short delay (rapid-fire = suspicious)
      await new Promise((r) => setTimeout(r, 50));
    }

    logger.warn(`🔥 Simulated ${count} FRAUD transactions for demo`);
    return results;
  }

  /**
   * Get transaction statistics
   */
  async getStats() {
    try {
      const [total, fraudulent, totalAmount] = await Promise.all([
        Transaction.countDocuments(),
        Transaction.countDocuments({ isFraud: true }),
        Transaction.aggregate([
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      return {
        totalTransactions: total,
        fraudulentTransactions: fraudulent,
        fraudRate: total > 0 ? ((fraudulent / total) * 100).toFixed(2) + '%' : '0%',
        totalVolume: totalAmount.length > 0 ? totalAmount[0].total : 0,
      };
    } catch (error) {
      logger.error(`Failed to get transaction stats: ${error.message}`);
      return { totalTransactions: 0, fraudulentTransactions: 0, fraudRate: '0%', totalVolume: 0 };
    }
  }
}

module.exports = new TransactionService();
