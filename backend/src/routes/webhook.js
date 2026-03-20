'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const ai = require('../services/ai');
const twilioSvc = require('../services/twilio');
const googleSvc = require('../services/google');

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function upsertLead(phone, name, email) {
  const existing = db.prepare('SELECT id FROM leads WHERE phone = ?').get(phone);
  if (existing) {
    db.prepare(
      `UPDATE leads SET
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         status = CASE WHEN status = 'new' THEN 'active' ELSE status END,
         last_message_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE phone = ?`
    ).run(name || null, email || null, phone);
  } else {
    db.prepare(
      `INSERT INTO leads (phone, name, email, status, last_message_at)
       VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP)`
    ).run(phone, name || null, email || null);
  }
}

async function handlePropertySearch(action, phone, replyText) {
  const base =
    getSetting('property_website_base_url') ||
    'https://www.yourrealestate.com/properties';

  // Look for a matching property in the local DB first
  let listingUrl = base;
  if (action.location) {
    const prop = db
      .prepare(
        `SELECT url FROM properties
         WHERE is_active = 1
           AND lower(location) LIKE lower(?)
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(`%${action.location}%`);
    if (prop) {
      listingUrl = prop.url;
    } else {
      const params = new URLSearchParams();
      params.set('location', action.location);
      if (action.property_type) params.set('type', action.property_type);
      if (action.budget) params.set('max_price', action.budget);
      listingUrl = `${base}?${params.toString()}`;
    }
  }

  const fullReply =
    `${replyText}\n\nBrowse matching properties here:\n${listingUrl}`;
  return fullReply;
}

async function handleBookAppointment(action, phone, replyText) {
  let calendarEventId = null;

  // Create Google Calendar event (if configured)
  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
    try {
      const event = await googleSvc.createCalendarEvent({
        summary: `Property Visit – ${action.property || 'Property'}`,
        description: `Lead: ${action.lead_name}\nPhone: ${action.lead_phone}\nEmail: ${action.lead_email}\nProperty: ${action.property}\n\nBooked via WhatsApp AI Agent.`,
        startIso: action.preferred_datetime,
        leadEmail: action.lead_email,
      });
      calendarEventId = event.id || null;
    } catch (err) {
      console.error('[Google Calendar] Error:', err.message);
    }
  }

  // Send confirmation email (if configured)
  if (
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_CLIENT_ID &&
    action.lead_email
  ) {
    try {
      await googleSvc.sendConfirmationEmail({
        to: action.lead_email,
        leadName: action.lead_name,
        property: action.property,
        scheduledAt: action.preferred_datetime,
      });
    } catch (err) {
      console.error('[Gmail] Error:', err.message);
    }
  }

  // Save appointment to DB
  db.prepare(
    `INSERT INTO appointments
       (lead_phone, lead_name, lead_email, property_desc, scheduled_at, calendar_event_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    phone,
    action.lead_name || null,
    action.lead_email || null,
    action.property || null,
    action.preferred_datetime,
    calendarEventId
  );

  // Update lead name/email if we just learned them
  if (action.lead_name || action.lead_email) {
    db.prepare(
      `UPDATE leads SET
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         status = 'qualified',
         updated_at = CURRENT_TIMESTAMP
       WHERE phone = ?`
    ).run(action.lead_name || null, action.lead_email || null, phone);
  }

  const dt = new Date(action.preferred_datetime).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const fullReply =
    `${replyText}\n\n` +
    `*Appointment Confirmed!*\n` +
    `Date & Time: ${dt}\n` +
    `Property: ${action.property}\n` +
    (action.lead_email
      ? `A confirmation email has been sent to ${action.lead_email}.\n\n`
      : '\n') +
    `Our agent will be in touch soon. Thank you!`;

  return fullReply;
}

// POST /webhook/whatsapp
router.post('/whatsapp', async (req, res) => {
  // Respond to Twilio immediately to avoid timeout
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

  try {
    const body = req.body || {};
    const from = body.From || '';
    const msgBody = (body.Body || '').trim();

    if (!from || !msgBody) return;

    const phone = from.replace('whatsapp:', '').trim();

    // Upsert lead
    upsertLead(phone, null, null);

    // Get AI response
    const { replyText, action } = await ai.chat(phone, msgBody);

    let finalReply = replyText;

    if (action && action.type === 'property_search') {
      finalReply = await handlePropertySearch(action, phone, replyText);
    } else if (action && action.type === 'book_appointment') {
      finalReply = await handleBookAppointment(action, phone, replyText);
    }

    // Send WhatsApp reply
    await twilioSvc.sendWhatsApp(from, finalReply);
  } catch (err) {
    console.error('[Webhook] Error:', err);
  }
});

module.exports = router;
