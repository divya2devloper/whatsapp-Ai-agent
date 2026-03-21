const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const ai = require('../services/ai');
const whatsappSvc = require('../services/whatsapp');
const googleSvc = require('../services/google');

async function getSetting(key) {
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  if (error) return null;
  return data ? data.value : null;
}

async function upsertLead(phone, name, email) {
  const { data: existing, error } = await supabase.from('leads').select('id, status').eq('phone', phone).maybeSingle();
  
  const updateData = {
    phone,
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (name) updateData.name = name;
  if (email) updateData.email = email;

  if (existing) {
    if (existing.status === 'new') updateData.status = 'active';
    await supabase.from('leads').update(updateData).eq('phone', phone);
  } else {
    updateData.status = 'active';
    await supabase.from('leads').insert([updateData]);
  }
}

async function handlePropertySearch(action, phone, replyText) {
  const base =
    (await getSetting('property_website_base_url')) ||
    'https://www.yourrealestate.com/properties';

  // Look for a matching property in the local DB first
  let listingUrl = base;
  if (action.location) {
    const { data: prop, error } = await supabase
      .from('properties')
      .select('url')
      .eq('is_active', true)
      .ilike('location', `%${action.location}%`)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

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

  // Save appointment to Supabase
  await supabase.from('appointments').insert([
    {
      lead_phone: phone,
      lead_name: action.lead_name || null,
      lead_email: action.lead_email || null,
      property_desc: action.property || null,
      scheduled_at: action.preferred_datetime,
      calendar_event_id: calendarEventId,
    },
  ]);

  // Update lead name/email if we just learned them
  if (action.lead_name || action.lead_email) {
    const updateLead = {
      status: 'qualified',
      updated_at: new Date().toISOString(),
    };
    if (action.lead_name) updateLead.name = action.lead_name;
    if (action.lead_email) updateLead.email = action.lead_email;

    await supabase.from('leads').update(updateLead).eq('phone', phone);
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

// GET /webhook/whatsapp (Meta Verification)
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'suthar123';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// POST /webhook/whatsapp
router.post('/whatsapp', async (req, res) => {
  const body = req.body;

  // Immediately respond 200 to acknowledge receipt of the event
  res.status(200).send('EVENT_RECEIVED');
  
  console.log('[Webhook POST] Received payload:', JSON.stringify(body, null, 2));

  try {
    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        const value = body.entry[0].changes[0].value;
        const msg = value.messages[0];
        
        let from = msg.from; 
        const msgBody = msg.text ? msg.text.body.trim() : '';
        const name = value.contacts && value.contacts[0] && value.contacts[0].profile ? value.contacts[0].profile.name : null;

        if (!from || !msgBody) return;

        // Ensure from number is formatted appropriately (no +)
        const phone = from.replace('+', '').trim();

        // Upsert lead using the name from WhatsApp profile if available
        await upsertLead(phone, name, null);

        // Get AI response
        const { replyText, action } = await ai.chat(phone, msgBody);

        let finalReply = replyText;

        if (action && action.type === 'property_search') {
          finalReply = await handlePropertySearch(action, phone, replyText);
        } else if (action && action.type === 'book_appointment') {
          finalReply = await handleBookAppointment(action, phone, replyText);
        }

        // Send WhatsApp reply using official Meta Cloud API
        await whatsappSvc.sendWhatsApp(phone, finalReply);
      }
    }
  } catch (err) {
    console.error('[Webhook] Error formatting/sending message:', err);
  }
});

module.exports = router;
