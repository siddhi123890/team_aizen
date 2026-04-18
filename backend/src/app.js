const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Joi = require('joi');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./utils/errorHandler');
const validate = require('./middleware/validate');
const transactionRoutes = require('./modules/transaction/transaction.routes');
const authRoutes = require('./modules/auth/auth.routes');
const feedbackController = require('./modules/feedback/feedback.controller');

const app = express();

// ──────────────── Security Middleware ────────────────
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ──────────────── Body Parsing ────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ──────────────── Rate Limiting ────────────────
app.use('/api/', apiLimiter);

// ──────────────── Health Check ────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ──────────────── API Routes ────────────────
app.use('/api/auth', authRoutes);
app.use('/api', transactionRoutes);

// Feedback routes
const feedbackSchema = {
  body: Joi.object({
    transactionId: Joi.string().required(),
    isFraud: Joi.boolean().required(),
    reviewedBy: Joi.string().optional().default('analyst'),
    notes: Joi.string().optional().allow('').default(''),
  }),
};

app.post('/api/feedback', validate(feedbackSchema), feedbackController.submitFeedback);
app.get('/api/feedback', feedbackController.getFeedback);

// ──────────────── 404 Handler ────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`,
  });
});

// ──────────────── Error Handler ────────────────
app.use(errorHandler);

module.exports = app;
