'use strict';
const twilio = require('twilio');

function getClient() {
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

async function sendWhatsApp(to, body) {
  const from =
    process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const client = getClient();
  const message = await client.messages.create({ from, to: toAddr, body });
  return message.sid;
}

module.exports = { sendWhatsApp };
