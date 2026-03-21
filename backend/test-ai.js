require('dotenv').config({ path: '../.env' });
const ai = require('./src/services/ai');

async function test() {
  try {
    const result = await ai.chat('917779082347', 'hi');
    console.log("AI result:", result);
  } catch (err) {
    console.error("AI error:", err);
  }
}

test();
