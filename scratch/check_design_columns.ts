import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkDesignTable() {
  const { data, error } = await supabase.from('homepage_clon_design').select('*').limit(1);
  if (data) {
    console.log('homepage_clon_design columns:', Object.keys(data[0] || {}));
  } else {
    console.log('Error or no data:', error);
  }
}

checkDesignTable();
