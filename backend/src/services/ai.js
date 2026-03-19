const OpenAI = require('openai');
const supabase = require('../db/supabaseClient');

let _client = null;

function getClient() {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

async function getSetting(key) {
  const { data, error } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
  if (error) {
    console.error(`[Supabase] Error fetching setting ${key}:`, error.message);
    return null;
  }
  return data ? data.value : null;
}

async function getConversationHistory(phone, limit = 20) {
  const { data, error } = await supabase
    .from('conversations')
    .select('role, content')
    .eq('lead_phone', phone)
    .order('id', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[Supabase] Error fetching history for ${phone}:`, error.message);
    return [];
  }
  return (data || []).reverse();
}

async function buildSystemPrompt(phone) {
  const agentName = (await getSetting('agent_name')) || 'Priya';
  const companyName = (await getSetting('company_name')) || 'YourRealty';

  return `You are ${agentName}, a friendly and professional real estate AI assistant for ${companyName}.

Your responsibilities:
1. Warmly greet new leads and learn their property requirements (location, budget, type: flat/villa/plot, BHK count).
2. When a user asks about properties in a specific location, output an ACTION block so the system can provide the listing link.
3. When a user wants to book a property visit appointment, collect: full name, email address, preferred date & time, and property of interest. Then output a booking ACTION block.
4. Provide helpful, accurate information about the real estate market.

Rules:
- Always respond in a warm, concise, professional tone suitable for WhatsApp.
- Keep replies under 1500 characters.
- When you need to send a property listing link, respond with your normal text followed by this exact line (no spaces around the colon):
  ACTION:{"type":"property_search","location":"<location>","property_type":"<type or null>","budget":"<budget or null>"}
- When you need to book an appointment (after collecting all required info), respond with your normal text followed by:
  ACTION:{"type":"book_appointment","lead_name":"<full name>","lead_email":"<email>","lead_phone":"${phone}","property":"<property description>","preferred_datetime":"<ISO 8601 datetime in IST>"}
- Do NOT invent property listings or URLs. Let the system handle URLs.
- If the user says goodbye or thank you, wrap up politely.`;
}

async function chat(phone, userMessage) {
  const openai = getClient();
  const model = (await getSetting('openai_model')) || 'gpt-4o';

  const history = await getConversationHistory(phone);
  const messages = [
    { role: 'system', content: await buildSystemPrompt(phone) },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.4,
    max_tokens: 600,
  });

  const aiText = completion.choices[0].message.content || '';

  // Extract ACTION block if present
  const actionMatch = aiText.match(/ACTION:(\{[\s\S]*?\})\s*$/m);
  let action = null;
  let replyText = aiText;

  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]);
      replyText = aiText.slice(0, actionMatch.index).trim();
    } catch {
      action = null;
    }
  }

  // Persist messages to Supabase
  await supabase.from('conversations').insert([
    { lead_phone: phone, role: 'user', content: userMessage },
    { lead_phone: phone, role: 'assistant', content: replyText || aiText },
  ]);

  return { replyText, action };
}

module.exports = { chat };
