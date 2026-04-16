const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on('disconnect', (reason) => {
      logger.info(`Client disconnected: ${socket.id} - Reason: ${reason}`);
    });

    socket.on('subscribe_alerts', () => {
      socket.join('fraud_alerts');
      logger.info(`Client ${socket.id} subscribed to fraud alerts`);
    });

    socket.on('subscribe_transactions', () => {
      socket.join('transactions');
      logger.info(`Client ${socket.id} subscribed to transactions`);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initSocket first.');
  }
  return io;
};

const emitNewTransaction = (transaction) => {
  if (io) {
    io.to('transactions').emit('new_transaction', transaction);
    logger.debug(`Emitted new_transaction: ${transaction._id}`);
  }
};

const emitFraudDetected = (alert) => {
  if (io) {
    io.to('fraud_alerts').emit('fraud_detected', alert);
    io.emit('fraud_detected', alert); // Also broadcast globally
    logger.warn(`Emitted fraud_detected alert for transaction: ${alert.transactionId}`);
  }
};

module.exports = { initSocket, getIO, emitNewTransaction, emitFraudDetected };
