require('dotenv').config({ path: '../.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testChat() {
  try {
    const contentsArray = [
      { role: 'user', parts: [{ text: "hi" }] }
    ];
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentsArray,
      config: {
        systemInstruction: "Say hello",
        temperature: 0.4,
        maxOutputTokens: 600,
      }
    });
    
    console.log("Response Object keys:", Object.keys(response));
    console.log("Response text:", response.text);
  } catch (err) {
    console.error("Chat error:", err);
  }
}

testChat();
