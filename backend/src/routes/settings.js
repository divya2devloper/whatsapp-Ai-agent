const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const supabase = require('../db/supabaseClient');

const ALLOWED_KEYS = [
  'agent_name',
  'company_name',
  'gemini_model',
  'property_website_base_url',
];

// GET /api/settings
router.get('/', async (req, res) => {
  const { data: rows, error } = await supabase.from('settings').select('key, value');
  if (error) return res.status(500).json({ error: error.message });

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
    body('gemini_model')
      .optional()
      .isIn(['gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']),
    body('property_website_base_url').optional().isURL(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const upsertData = [];
    for (const key of ALLOWED_KEYS) {
      if (req.body[key] !== undefined) {
        upsertData.push({ key, value: String(req.body[key]), updated_at: new Date().toISOString() });
      }
    }

    if (upsertData.length > 0) {
      const { error } = await supabase.from('settings').upsert(upsertData, { onConflict: 'key' });
      if (error) return res.status(500).json({ error: error.message });
    }

    const { data: rows, error: fetchError } = await supabase.from('settings').select('key, value');
    if (fetchError) return res.status(500).json({ error: fetchError.message });

    const settings = {};
    for (const r of rows) {
      if (ALLOWED_KEYS.includes(r.key)) settings[r.key] = r.value;
    }
    res.json(settings);
  }
);

module.exports = router;
