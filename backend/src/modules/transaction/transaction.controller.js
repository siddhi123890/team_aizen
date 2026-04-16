const transactionService = require('./transaction.service');
const alertService = require('../alert/alert.service');
const graphService = require('../fraud/graph.service');
const { AppError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');

/**
 * Create a new transaction
 * POST /api/transactions
 */
const createTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionService.createTransaction(req.body);

    res.status(201).json({
      success: true,
      data: {
        transactionId: transaction._id,
        userId: transaction.userId,
        amount: transaction.amount,
        fraudScore: transaction.fraudScore,
        isFraud: transaction.isFraud,
        riskLevel: transaction.riskLevel,
        reason: transaction.reason,
        timestamp: transaction.timestamp,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all transactions with filters
 * GET /api/transactions
 */
const getTransactions = async (req, res, next) => {
  try {
    const { userId, isFraud, riskLevel, page, limit } = req.query;

    const result = await transactionService.getTransactions({
      userId,
      isFraud: isFraud === 'true' ? true : isFraud === 'false' ? false : undefined,
      riskLevel,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single transaction by ID
 * GET /api/transactions/:id
 */
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id);
    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

/**
 * Simulate normal transactions
 * POST /api/transactions/simulate
 */
const simulateNormal = async (req, res, next) => {
  try {
    const count = parseInt(req.body.count) || 10;
    const results = await transactionService.simulateNormal(Math.min(count, 50));

    res.json({
      success: true,
      message: `Simulated ${results.length} normal transactions`,
      data: {
        count: results.length,
        fraudDetected: results.filter((t) => t.isFraud).length,
        transactions: results.map((t) => ({
          transactionId: t._id,
          amount: t.amount,
          fraudScore: t.fraudScore,
          isFraud: t.isFraud,
          riskLevel: t.riskLevel,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Simulate fraud spike
 * POST /api/transactions/simulate-fraud
 */
const simulateFraud = async (req, res, next) => {
  try {
    const count = parseInt(req.body.count) || 5;
    const results = await transactionService.simulateFraud(Math.min(count, 20));

    res.json({
      success: true,
      message: `🔥 Simulated ${results.length} fraudulent transactions`,
      data: {
        count: results.length,
        fraudDetected: results.filter((t) => t.isFraud).length,
        transactions: results.map((t) => ({
          transactionId: t._id,
          amount: t.amount,
          fraudScore: t.fraudScore,
          isFraud: t.isFraud,
          riskLevel: t.riskLevel,
          reason: t.reason,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get transaction and fraud statistics
 * GET /api/stats
 */
const getStats = async (req, res, next) => {
  try {
    const [txStats, alertStats] = await Promise.all([
      transactionService.getStats(),
      alertService.getStats(),
    ]);

    const graphStats = graphService.getStats();

    res.json({
      success: true,
      data: {
        transactions: txStats,
        alerts: alertStats,
        graph: graphStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get alerts
 * GET /api/alerts
 */
const getAlerts = async (req, res, next) => {
  try {
    const { status, riskLevel, page, limit } = req.query;
    const result = await alertService.getAlerts({
      status,
      riskLevel,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update alert status
 * PATCH /api/alerts/:id
 */
const updateAlertStatus = async (req, res, next) => {
  try {
    const alert = await alertService.updateStatus(req.params.id, req.body.status);
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  simulateNormal,
  simulateFraud,
  getStats,
  getAlerts,
  updateAlertStatus,
};
