'use strict';
const { google } = require('googleapis');
const nodemailer = require('nodemailer');

function buildAuth() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oAuth2Client;
}

/**
 * Create a Google Calendar event for a property visit.
 * Returns the created event object.
 */
async function createCalendarEvent({ summary, description, startIso, leadEmail }) {
  const auth = buildAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const endDate = new Date(startIso);
  endDate.setHours(endDate.getHours() + 1);

  const event = {
    summary,
    description,
    start: { dateTime: startIso, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endDate.toISOString(), timeZone: 'Asia/Kolkata' },
    attendees: leadEmail ? [{ email: leadEmail }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const response = await calendar.events.insert({
    calendarId,
    resource: event,
    sendUpdates: 'all',
  });

  return response.data;
}

/**
 * Send appointment confirmation email via Gmail (OAuth2 SMTP via nodemailer).
 */
async function sendConfirmationEmail({ to, leadName, property, scheduledAt }) {
  const auth = buildAuth();
  const accessTokenResponse = await auth.getAccessToken();
  const accessToken = accessTokenResponse.token;

  const fromEmail = process.env.GMAIL_SENDER || process.env.GOOGLE_CLIENT_ID;
  const companyName = process.env.REAL_ESTATE_COMPANY_NAME || 'YourRealty';
  const agentName = process.env.AGENT_NAME || 'Priya';

  const dt = new Date(scheduledAt).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;color:#333">
  <div style="background:#2c5282;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px">Property Visit Confirmed</h1>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p>Dear <strong>${leadName}</strong>,</p>
    <p>Thank you for your interest in ${companyName}! Your property visit appointment has been successfully booked.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tr style="background:#ebf4ff">
        <td style="padding:12px;font-weight:bold;border:1px solid #bee3f8">Property</td>
        <td style="padding:12px;border:1px solid #bee3f8">${property}</td>
      </tr>
      <tr>
        <td style="padding:12px;font-weight:bold;border:1px solid #e2e8f0">Date &amp; Time</td>
        <td style="padding:12px;border:1px solid #e2e8f0">${dt}</td>
      </tr>
    </table>
    <p>A calendar invite has been sent to this email address. Our agent will contact you to confirm the visit details.</p>
    <p>If you need to reschedule, please reply to this email or WhatsApp us.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
    <p style="color:#718096;font-size:12px">${companyName} &mdash; ${agentName} (AI Assistant)</p>
  </div>
</body>
</html>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: fromEmail,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken,
    },
  });

  await transporter.sendMail({
    from: `"${companyName} – ${agentName}" <${fromEmail}>`,
    to,
    subject: `Your Property Visit is Confirmed – ${property}`,
    html,
  });
}

module.exports = { createCalendarEvent, sendConfirmationEmail };
