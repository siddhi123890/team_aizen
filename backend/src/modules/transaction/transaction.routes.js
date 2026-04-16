const express = require('express');
const Joi = require('joi');
const validate = require('../../middleware/validate');
const { transactionLimiter } = require('../../middleware/rateLimiter');
const controller = require('./transaction.controller');

const router = express.Router();

// Validation schemas
const createTransactionSchema = {
  body: Joi.object({
    userId: Joi.string().required().trim().max(100),
    receiverId: Joi.string().allow(null, '').trim().max(100),
    amount: Joi.number().required().min(0.01).max(10000000),
    location: Joi.string().required().trim().max(200),
    deviceId: Joi.string().required().trim().max(200),
    timestamp: Joi.date().iso().optional(),
  }),
};

const simulateSchema = {
  body: Joi.object({
    count: Joi.number().integer().min(1).max(50).default(10),
  }),
};

const updateAlertSchema = {
  body: Joi.object({
    status: Joi.string().valid('new', 'reviewed', 'dismissed', 'confirmed').required(),
  }),
};

// ──────────────── Transactions ────────────────

// Create transaction
router.post(
  '/transactions',
  transactionLimiter,
  validate(createTransactionSchema),
  controller.createTransaction
);

// Get all transactions
router.get('/transactions', controller.getTransactions);

// Get transaction by ID
router.get('/transactions/:id', controller.getTransactionById);

// Simulate normal transactions
router.post(
  '/transactions/simulate',
  validate(simulateSchema),
  controller.simulateNormal
);

// Simulate fraud spike
router.post(
  '/transactions/simulate-fraud',
  validate(simulateSchema),
  controller.simulateFraud
);

// ──────────────── Alerts ────────────────

// Get alerts
router.get('/alerts', controller.getAlerts);

// Update alert status
router.patch('/alerts/:id', validate(updateAlertSchema), controller.updateAlertStatus);

// ──────────────── Stats ────────────────

// Get system statistics
router.get('/stats', controller.getStats);

module.exports = router;
