'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const webhookRouter = require('./routes/webhook');
const leadsRouter = require('./routes/leads');
const propertiesRouter = require('./routes/properties');
const appointmentsRouter = require('./routes/appointments');
const statsRouter = require('./routes/stats');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiters
// Webhook: 120 requests/min per IP (accommodates Twilio retries)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// Admin API: 300 requests/min per IP (generous for dashboard use)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check (no rate limit needed)
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Routes with rate limiting
app.use('/webhook', webhookLimiter, webhookRouter);
app.use('/api/leads', apiLimiter, leadsRouter);
app.use('/api/properties', apiLimiter, propertiesRouter);
app.use('/api/appointments', apiLimiter, appointmentsRouter);
app.use('/api/stats', apiLimiter, statsRouter);
app.use('/api/settings', apiLimiter, settingsRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`WhatsApp Real Estate Agent backend running on port ${PORT}`);
});

module.exports = app;

