require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Create HTTP server
    const server = http.createServer(app);

    // 3. Initialize WebSocket
    initSocket(server);

    // 4. Start listening
    server.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════╗
║     🛡️  AI Fraud Detection System — ONLINE          ║
╠══════════════════════════════════════════════════════╣
║  🌐 HTTP Server:  http://localhost:${PORT}             ║
║  🔌 WebSocket:    ws://localhost:${PORT}               ║
║  📊 Health:       http://localhost:${PORT}/health       ║
║  🧠 AI Service:   ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}       ║
╚══════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled errors
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      shutdown('Uncaught Exception');
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
