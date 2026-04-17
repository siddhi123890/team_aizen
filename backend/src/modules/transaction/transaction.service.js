const Transaction = require('./transaction.model');
const fraudService = require('../fraud/fraud.service');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

// ── In-memory user balance tracker (for realistic simulations) ──
const userBalances = {};

function _getOrInitBalance(userId, initialAmount = null) {
  if (!userBalances[userId]) {
    // Random initial balance between $1K and $50K
    userBalances[userId] = initialAmount !== null
      ? initialAmount
      : Math.round((Math.random() * 49000 + 1000) * 100) / 100;
  }
  return userBalances[userId];
}

class TransactionService {
  /**
   * Create a new transaction and trigger fraud detection
   */
  async createTransaction(data) {
    try {
      // ── Calculate balance fields if not provided ──
      const amount = data.amount;
      const oldbalanceOrg = data.oldbalanceOrg ?? _getOrInitBalance(data.userId);
      const newbalanceOrig = data.newbalanceOrig ?? Math.max(0, oldbalanceOrg - amount);

      // Receiver balance
      const receiverId = data.receiverId || 'unknown';
      const oldbalanceDest = data.oldbalanceDest ?? _getOrInitBalance(receiverId);
      const newbalanceDest = data.newbalanceDest ?? (oldbalanceDest + amount);

      // Update in-memory balances
      userBalances[data.userId] = newbalanceOrig;
      userBalances[receiverId] = newbalanceDest;

      // Determine transaction type
      const txnType = data.txnType || (amount > 5000 ? 'TRANSFER' : 'CASH_OUT');

      // Calculate step (hourly time period of the day)
      const now = data.timestamp ? new Date(data.timestamp) : new Date();
      const step = data.step ?? now.getHours();

      const transaction = new Transaction({
        userId: data.userId,
        receiverId: data.receiverId || null,
        amount,
        location: data.location,
        deviceId: data.deviceId,
        timestamp: now,
        // ── PaySim balance fields ──
        txnType,
        step,
        oldbalanceOrg,
        newbalanceOrig,
        oldbalanceDest,
        newbalanceDest,
      });

      // Save first, then analyze (so it's in DB for pattern queries)
      await transaction.save();
      logger.info(`Transaction created: ${transaction._id} | User: ${data.userId} | Amount: $${amount} | Type: ${txnType} | Balance: $${oldbalanceOrg} → $${newbalanceOrig}`);

      // Trigger fraud detection pipeline
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
   * Generates realistic balance data for the ensemble ML models
   */
  async simulateNormal(count = 10) {
    const cities = ['New York', 'London', 'Tokyo', 'Mumbai', 'Berlin', 'Sydney', 'Toronto', 'Paris'];
    const users = ['user_001', 'user_002', 'user_003', 'user_004', 'user_005'];
    const receivers = ['merchant_001', 'merchant_002', 'merchant_003', 'user_006', 'user_007'];
    const devices = ['iphone_14', 'pixel_7', 'samsung_s23', 'macbook_pro', 'ipad_air'];

    const results = [];

    for (let i = 0; i < count; i++) {
      const userId = users[Math.floor(Math.random() * users.length)];
      const receiverId = receivers[Math.floor(Math.random() * receivers.length)];
      const amount = Math.round((Math.random() * 500 + 10) * 100) / 100; // $10-$510

      // Ensure user has balance
      const oldbalanceOrg = _getOrInitBalance(userId, Math.random() * 20000 + 2000);
      const newbalanceOrig = Math.max(0, oldbalanceOrg - amount);
      const oldbalanceDest = _getOrInitBalance(receiverId, Math.random() * 10000 + 500);
      const newbalanceDest = oldbalanceDest + amount;

      const data = {
        userId,
        receiverId,
        amount,
        location: cities[Math.floor(Math.random() * cities.length)],
        deviceId: devices[Math.floor(Math.random() * devices.length)],
        txnType: amount > 200 ? 'TRANSFER' : 'CASH_OUT',
        oldbalanceOrg,
        newbalanceOrig,
        oldbalanceDest,
        newbalanceDest,
      };

      const tx = await this.createTransaction(data);
      results.push(tx);

      // Small delay to spread transactions
      await new Promise((r) => setTimeout(r, 100));
    }

    logger.info(`Simulated ${count} normal transactions with balance data`);
    return results;
  }

  /**
   * Simulate fraudulent transactions for demo purposes
   * Creates PaySim-style fraud patterns: balance drain, discrepancies, rapid-fire
   */
  async simulateFraud(count = 5) {
    const results = [];
    const userId = 'fraud_user_' + uuidv4().slice(0, 6);

    // Give the fraud user a large starting balance
    const startingBalance = Math.round((Math.random() * 200000 + 100000) * 100) / 100;
    _getOrInitBalance(userId, startingBalance);

    for (let i = 0; i < count; i++) {
      const currentBalance = _getOrInitBalance(userId);

      // Fraud pattern: drain balance rapidly to mule accounts
      const drainRatio = (i === count - 1) ? 1.0 : (0.3 + Math.random() * 0.3); // Last one drains all
      const amount = Math.round(currentBalance * drainRatio * 100) / 100;

      const muleId = `mule_account_${i + 1}`;
      const oldbalanceOrg = currentBalance;

      // KEY FRAUD SIGNAL: Balance drops to 0 regardless of amount
      // This creates error_balance_orig ≠ 0 (the #1 feature for XGBoost, 45.85% importance)
      // Real PaySim fraud: oldBalance=100K, amount=50K, newBalance=0 → error=50K (money vanished!)
      const newbalanceOrig = 0;

      // Mule account: starts at 0, doesn't keep the money (destination discrepancy)
      const oldbalanceDest = 0;
      const newbalanceDest = 0; // Money "disappeared" — clear fraud signal

      const data = {
        userId,
        receiverId: muleId,
        amount: Math.max(0.01, amount),
        location: i % 2 === 0 ? 'Lagos' : 'Moscow', // Alternating locations
        deviceId: `unknown_device_${i}`, // Different devices
        txnType: 'TRANSFER',
        step: i + 1, // Rapid sequential steps
        oldbalanceOrg,
        newbalanceOrig,
        oldbalanceDest,
        newbalanceDest,
      };

      const tx = await this.createTransaction(data);
      results.push(tx);

      // Very short delay (rapid-fire = suspicious)
      await new Promise((r) => setTimeout(r, 50));
    }

    logger.warn(`[SIMULATION] Simulated ${count} FRAUD transactions with balance drain pattern (starting: $${startingBalance.toLocaleString()})`);
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
