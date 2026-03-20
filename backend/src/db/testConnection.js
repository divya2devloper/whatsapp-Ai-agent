'use strict';
const supabase = require('./supabaseClient');

async function testConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.SUPABASE_URL);
  
  const tables = ['leads', 'conversations', 'properties', 'appointments', 'settings'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`✅ Table "${table}": Connected (Empty)`);
        } else if (error.message.includes('relation "' + table + '" does not exist')) {
          console.log(`❌ Table "${table}": NOT FOUND`);
        } else {
          console.error(`❌ Table "${table}": Error - ${error.message}`);
        }
      } else {
        console.log(`✅ Table "${table}": Connected (OK)`);
      }
    } catch (err) {
      console.error(`❌ Table "${table}": Critical failure - ${err.message}`);
    }
  }
}

testConnection();
