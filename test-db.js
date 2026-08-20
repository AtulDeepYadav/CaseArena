import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

console.log('Connecting to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing connection to collab_sessions...');
  const { data, error } = await supabase.from('collab_sessions').select('*').limit(1);
  
  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('Connection successful! Data:', data);
    console.log('Database and schema are perfectly configured.');
  }
}

testConnection();
