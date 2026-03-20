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

// GET /api/appointments
router.get('/', (req, res) => {
  const { status, date } = req.query;
  let where = 'WHERE 1=1';
  const params = [];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (date) {
    where += ' AND DATE(scheduled_at) = ?';
    params.push(date);
  }

  const rows = db
    .prepare(
      `SELECT a.*,
         l.name AS lead_display_name
       FROM appointments a
       LEFT JOIN leads l ON l.phone = a.lead_phone
       ${where}
       ORDER BY a.scheduled_at ASC`
    )
    .all(...params);

  res.json(rows);
});

// PUT /api/appointments/:id
router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }),
    body('status').optional().isIn(['confirmed', 'cancelled', 'completed']),
    body('notes').optional().trim(),
  ],
  (req, res) => {
    if (handleValidation(req, res)) return;
    const id = parseInt(req.params.id);
    const appt = db.prepare('SELECT id FROM appointments WHERE id = ?').get(id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const { status, notes } = req.body;
    db.prepare(
      `UPDATE appointments SET
         status = COALESCE(?, status),
         notes  = COALESCE(?, notes),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(status || null, notes !== undefined ? notes : null, id);

    res.json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(id));
  }
);

// DELETE /api/appointments/:id
router.delete('/:id', [param('id').isInt({ min: 1 })], (req, res) => {
  if (handleValidation(req, res)) return;
  db.prepare('DELETE FROM appointments WHERE id = ?').run(parseInt(req.params.id));
  res.json({ success: true });
});

module.exports = router;
