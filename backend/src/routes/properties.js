'use strict';
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../db/database');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// GET /api/properties
router.get('/', (req, res) => {
  const { active } = req.query;
  let query = 'SELECT * FROM properties';
  const params = [];
  if (active === 'true') {
    query += ' WHERE is_active = 1';
  } else if (active === 'false') {
    query += ' WHERE is_active = 0';
  }
  query += ' ORDER BY location ASC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/properties
router.post(
  '/',
  [
    body('location').trim().notEmpty().withMessage('location is required'),
    body('url').isURL().withMessage('url must be a valid URL'),
    body('description').optional().trim(),
    body('property_type').optional().trim(),
    body('price_range').optional().trim(),
  ],
  (req, res) => {
    if (handleValidation(req, res)) return;
    const { location, url, description, property_type, price_range } = req.body;

    const result = db
      .prepare(
        `INSERT INTO properties (location, url, description, property_type, price_range)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(location, url, description || null, property_type || null, price_range || null);

    res.status(201).json(
      db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid)
    );
  }
);

// PUT /api/properties/:id
router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('location').optional().trim().notEmpty(),
    body('url').optional().isURL(),
    body('description').optional().trim(),
    body('property_type').optional().trim(),
    body('price_range').optional().trim(),
    body('is_active').optional().isBoolean(),
  ],
  (req, res) => {
    if (handleValidation(req, res)) return;
    const id = parseInt(req.params.id);
    const prop = db.prepare('SELECT id FROM properties WHERE id = ?').get(id);
    if (!prop) return res.status(404).json({ error: 'Property not found' });

    const { location, url, description, property_type, price_range, is_active } =
      req.body;

    db.prepare(
      `UPDATE properties SET
         location      = COALESCE(?, location),
         url           = COALESCE(?, url),
         description   = COALESCE(?, description),
         property_type = COALESCE(?, property_type),
         price_range   = COALESCE(?, price_range),
         is_active     = COALESCE(?, is_active),
         updated_at    = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      location || null,
      url || null,
      description !== undefined ? description : null,
      property_type !== undefined ? property_type : null,
      price_range !== undefined ? price_range : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    res.json(db.prepare('SELECT * FROM properties WHERE id = ?').get(id));
  }
);

// DELETE /api/properties/:id
router.delete('/:id', [param('id').isInt({ min: 1 })], (req, res) => {
  if (handleValidation(req, res)) return;
  const id = parseInt(req.params.id);
  db.prepare('DELETE FROM properties WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
