require('dotenv').config({ path: '../.env' });
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: 'Hello world',
      config: {
        outputDimensionality: 768,
      }
    });
    console.log("Success with gemini-embedding-001! Length:", res.embeddings[0].values.length);
  } catch (err) {
    console.error("Error with gemini-embedding-001:", err.message);
  }
}

test();
