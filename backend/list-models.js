require('dotenv').config({ path: '../.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function listModels() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods.join(',')));
}

listModels();
