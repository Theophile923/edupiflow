/**
 * EduPiFlow — Backend Server
 * Node.js/Express API for Pi Network integration.
 *
 * DISCLAIMER: This app is NOT affiliated with, endorsed by, or created by the Pi Core Team.
 * PAYMENT POLICY: All payments are settled exclusively in Pi Coin.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many payment requests.' },
});
app.use('/api/payments/', paymentLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'EduPiFlow Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    network: process.env.PI_SANDBOX === 'true' ? 'testnet' : 'mainnet',
    disclaimer: 'Not affiliated with Pi Core Team.',
  });
});

// API Routes
app.use('/api/auth', require('./backend-route-auth'));
app.use('/api/payments', require('./backend-route-payments'));
app.use('/api/contracts', require('./backend-route-contracts'));
app.use('/api/escrow', require('./backend-route-escrow'));
app.use('/api/exchange-rate', require('./backend-route-exchangeRate'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ EduPiFlow backend running on port ${PORT}`);
  console.log(`🌐 Network: ${process.env.PI_SANDBOX === 'true' ? 'Testnet (Sandbox)' : 'Mainnet'}`);
  console.log(`🌍 Languages: en, fr, rw, sw`);
  console.log(`⚠️  DISCLAIMER: Not affiliated with Pi Core Team.`);
});

module.exports = app;
