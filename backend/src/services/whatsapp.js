const axios = require('axios');

/**
 * Sends a WhatsApp message using the official Meta Cloud API.
 * @param {string} to - The recipient's phone number without the explicit '+' (e.g., '14155551234')
 * @param {string} text - The message to send
 */
async function sendWhatsApp(to, text) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.error('Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID in environment variables.');
    return;
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    // Clean up '+' from phone number if present as Meta expects country code without symbol
    const cleanTo = to.replace('+', '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('[WhatsApp Meta] Failed to send message:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  sendWhatsApp,
};
