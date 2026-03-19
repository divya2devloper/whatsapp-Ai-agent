'use strict';
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const { createCalendarEvent, deleteCalendarEvent } = require('../services/google');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// GET /api/appointments
router.get('/', async (req, res) => {
  const { status, date } = req.query;

  let query = supabase
    .from('appointments')
    .select('*, leads(name)')
    .order('scheduled_at', { ascending: true });

  if (status) query = query.eq('status', status);
  if (date) {
    query = query
      .gte('scheduled_at', `${date}T00:00:00Z`)
      .lte('scheduled_at', `${date}T23:59:59Z`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const rows = data.map(appt => ({
    ...appt,
    lead_display_name: appt.leads ? appt.leads.name : null,
  }));

  res.json(rows);
});

// POST /api/appointments  — manual booking + Google Calendar sync
router.post(
  '/',
  [
    body('lead_phone').notEmpty().withMessage('lead_phone is required'),
    body('scheduled_at').isISO8601().withMessage('scheduled_at must be a valid ISO date'),
    body('property_desc').optional().trim(),
    body('lead_name').optional().trim(),
    body('lead_email').optional().isEmail(),
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;

    const { lead_phone, lead_name, lead_email, property_desc, scheduled_at, notes } = req.body;

    // Auto-create the lead if it doesn't exist yet (prevents FK violation)
    await supabase.from('leads').upsert(
      {
        phone: lead_phone,
        name: lead_name || null,
        email: lead_email || null,
        status: 'new',
      },
      { onConflict: 'phone', ignoreDuplicates: true }
    );

    let calendarEventId = null;
    let calendarEventLink = null;

    // Try to create Google Calendar event (non-fatal if it fails)
    try {
      if (
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_REFRESH_TOKEN &&
        !process.env.GOOGLE_CLIENT_ID.startsWith('xxx')
      ) {
        const gcEvent = await createCalendarEvent({
          summary: `Property Visit – ${lead_name || lead_phone}`,
          description: property_desc || '',
          startIso: scheduled_at,
          leadEmail: lead_email || null,
        });
        calendarEventId = gcEvent.id;
        calendarEventLink = gcEvent.htmlLink;
      }
    } catch (gcErr) {
      console.warn('Google Calendar sync failed (non-fatal):', gcErr.message);
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        lead_phone,
        lead_name: lead_name || null,
        lead_email: lead_email || null,
        property_desc: property_desc || null,
        scheduled_at,
        notes: notes || null,
        status: 'confirmed',
        calendar_event_id: calendarEventId,
        calendar_event_link: calendarEventLink,
      }])
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ ...data[0], calendar_event_link: calendarEventLink });
  }
);

// PUT /api/appointments/:id
router.put(
  '/:id',
  [
    param('id').isInt(),
    body('status').optional().isIn(['confirmed', 'cancelled', 'completed']),
    body('notes').optional().trim(),
  ],
  async (req, res) => {
    if (handleValidation(req, res)) return;
    const id = req.params.id;

    const { status, notes } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Appointment not found' });

    res.json(data[0]);
  }
);

// DELETE /api/appointments/:id  — also deletes the Google Calendar event
router.delete('/:id', [param('id').isInt()], async (req, res) => {
  if (handleValidation(req, res)) return;
  const id = req.params.id;

  // Fetch appointment first to get calendar_event_id
  const { data: appt } = await supabase.from('appointments').select('calendar_event_id').eq('id', id).single();

  if (appt?.calendar_event_id) {
    try {
      await deleteCalendarEvent(appt.calendar_event_id);
    } catch (gcErr) {
      console.warn('Google Calendar delete failed (non-fatal):', gcErr.message);
    }
  }

  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

module.exports = router;
