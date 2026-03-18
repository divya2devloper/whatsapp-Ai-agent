'use strict';
const express = require('express');
const { param, body, validationResult } = require('express-validator');
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

// GET /api/leads
router.get('/', (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE 1=1';
  const params = [];

  if (status) {
    where += ' AND l.status = ?';
    params.push(status);
  }
  if (search) {
    where += ' AND (l.phone LIKE ? OR l.name LIKE ? OR l.email LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const leads = db
    .prepare(
      `SELECT l.*,
         (SELECT COUNT(*) FROM conversations c WHERE c.lead_phone = l.phone AND c.role = 'user') AS message_count,
         (SELECT COUNT(*) FROM appointments a WHERE a.lead_phone = l.phone AND a.status = 'confirmed') AS appointment_count
       FROM leads l
       ${where}
       ORDER BY l.last_message_at DESC NULLS LAST, l.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, parseInt(limit), offset);

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM leads l ${where}`)
    .get(...params).n;

  res.json({ leads, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/leads/:phone
router.get(
  '/:phone',
  [param('phone').trim().notEmpty()],
  (req, res) => {
    if (handleValidation(req, res)) return;
    const phone = req.params.phone;

    const lead = db.prepare('SELECT * FROM leads WHERE phone = ?').get(phone);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const conversations = db
      .prepare(
        `SELECT id, role, content, created_at
         FROM conversations WHERE lead_phone = ?
         ORDER BY id ASC`
      )
      .all(phone);

    const appointments = db
      .prepare(
        `SELECT * FROM appointments WHERE lead_phone = ? ORDER BY scheduled_at ASC`
      )
      .all(phone);

    res.json({ lead, conversations, appointments });
  }
);

// PUT /api/leads/:phone
router.put(
  '/:phone',
  [
    param('phone').trim().notEmpty(),
    body('status')
      .optional()
      .isIn(['new', 'active', 'qualified', 'converted', 'closed']),
    body('name').optional().trim(),
    body('email').optional().isEmail(),
    body('notes').optional().trim(),
  ],
  (req, res) => {
    if (handleValidation(req, res)) return;
    const phone = req.params.phone;
    const { status, name, email, notes } = req.body;

    const lead = db.prepare('SELECT id FROM leads WHERE phone = ?').get(phone);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    db.prepare(
      `UPDATE leads SET
         status = COALESCE(?, status),
         name   = COALESCE(?, name),
         email  = COALESCE(?, email),
         notes  = COALESCE(?, notes),
         updated_at = CURRENT_TIMESTAMP
       WHERE phone = ?`
    ).run(status || null, name || null, email || null, notes || null, phone);

    res.json(db.prepare('SELECT * FROM leads WHERE phone = ?').get(phone));
  }
);

// DELETE /api/leads/:phone
router.delete('/:phone', [param('phone').trim().notEmpty()], (req, res) => {
  if (handleValidation(req, res)) return;
  const phone = req.params.phone;
  db.prepare('DELETE FROM conversations WHERE lead_phone = ?').run(phone);
  db.prepare('DELETE FROM appointments WHERE lead_phone = ?').run(phone);
  db.prepare('DELETE FROM leads WHERE phone = ?').run(phone);
  res.json({ success: true });
});

module.exports = router;
