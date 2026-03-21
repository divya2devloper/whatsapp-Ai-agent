const { GoogleGenAI } = require('@google/genai');
const supabase = require('../db/supabaseClient');

let _client = null;

function getClient() {
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
  let promptText = await getSetting('system_prompt');

  if (!promptText) {
    const agentName = (await getSetting('agent_name')) || 'Priya';
    const companyName = (await getSetting('company_name')) || 'YourRealty';
    promptText = `You are ${agentName}, a friendly and professional real estate AI assistant for ${companyName}.

Your responsibilities:
1. Warmly greet new leads and learn their property requirements (location, budget, type: flat/villa/plot, BHK count).
2. When a user asks about properties in a specific location, output an ACTION block so the system can provide the listing link.
3. When a user wants to book a property visit appointment, collect: full name, email address, preferred date & time, and property of interest. Then output a booking ACTION block.
4. Provide helpful, accurate information about the real estate market.

Rules:
- Always respond in a warm, concise, professional tone suitable for WhatsApp.
- Keep replies under 1500 characters.
- Do NOT invent property listings or URLs. Let the system handle URLs.
- If the user says goodbye or thank you, wrap up politely.`;
  }

  // Always append the strict ACTION block rules to ensure tool use works regardless of the persona
  promptText += `\n\nCRITICAL SYSTEM RULES (NEVER IGNORE):
- When you need to send a property listing link, respond with your normal text followed by this exact line (no spaces around the colon):
  ACTION:{"type":"property_search","location":"<location>","property_type":"<type or null>","budget":"<budget or null>"}
- When you need to book an appointment (after collecting all required info), respond with your normal text followed by:
  ACTION:{"type":"book_appointment","lead_name":"<full name>","lead_email":"<email>","lead_phone":"${phone}","property":"<property description>","preferred_datetime":"<ISO 8601 datetime in IST>"}`;

  // Fetch Custom Q&A Pairs to inject as exact directives
  try {
    const { data: qaPairs, error: qaError } = await supabase
      .from('ai_training_qa')
      .select('question, answer')
      .eq('is_active', true);
    
    if (!qaError && qaPairs && qaPairs.length > 0) {
      promptText += `\n\n--- SPECIFIC Q&A TRAINING (Always follow these exactly) ---\n`;
      qaPairs.forEach((qa, idx) => {
        promptText += `Q${idx + 1}: ${qa.question}\nA${idx + 1}: ${qa.answer}\n`;
      });
    }
  } catch (err) {
    // Gracefully handle if table doesn't exist yet
    console.error('[Supabase] Could not fetch Q&A pairs (this is normal if the table hasn\'t been created):', err.message);
  }

  return promptText;
}

async function chat(phone, userMessage) {
  const ai = getClient();
  const model = (await getSetting('gemini_model')) || 'gemini-2.5-flash';

  const history = await getConversationHistory(phone);
  let systemPromptContent = await buildSystemPrompt(phone);

  // --- KNOWLEDGE BASE (RAG) RETRIEVAL ---
  let contextChunks = "";
  try {
    // Embed the user's message
    const embedRes = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: userMessage,
      config: { outputDimensionality: 768 }
    });
    const embedding = embedRes.embeddings[0].values;

    // Search Supabase for closest documents
    const { data: matchedChunks, error: matchError } = await supabase.rpc('match_knowledge_chunks', {
      query_embedding: `[${embedding.join(',')}]`,
      match_count: 3
    });

    if (!matchError && matchedChunks && matchedChunks.length > 0) {
      contextChunks = matchedChunks.map(c => c.content).join('\n\n');
      systemPromptContent += `\n\n--- KNOWLEDGE BASE CONTEXT (Use this to answer questions if relevant) ---\n${contextChunks}\n`;
    }
  } catch (err) {
    // Gracefully handle if pgvector or table isn't set up yet
    console.error('[Supabase] Could not fetch knowledge chunks (this is normal if pgvector isn\'t initialized):', err.message);
  }

  const contentsArray = history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
  contentsArray.push({ role: 'user', parts: [{ text: userMessage }] });

  const response = await ai.models.generateContent({
    model: model,
    contents: contentsArray,
    config: {
      systemInstruction: systemPromptContent,
      temperature: 0.4,
      maxOutputTokens: 600,
    }
  });

  const aiText = response.text || '';

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
