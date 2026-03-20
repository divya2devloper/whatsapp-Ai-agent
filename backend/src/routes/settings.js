'use strict';
const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../db/database');

const ALLOWED_KEYS = [
  'agent_name',
  'company_name',
  'openai_model',
  'property_website_base_url',
];

// GET /api/settings
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) {
    if (ALLOWED_KEYS.includes(r.key)) settings[r.key] = r.value;
  }
  res.json(settings);
});

// PUT /api/settings
router.put(
  '/',
  [
    body('agent_name').optional().trim().notEmpty(),
    body('company_name').optional().trim().notEmpty(),
    body('openai_model')
      .optional()
      .isIn(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']),
    body('property_website_base_url').optional().isURL(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const upsert = db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
    );

    for (const key of ALLOWED_KEYS) {
      if (req.body[key] !== undefined) {
        upsert.run(key, req.body[key]);
      }
    }

    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      if (ALLOWED_KEYS.includes(r.key)) settings[r.key] = r.value;
    }
    res.json(settings);
  }
);

module.exports = router;
