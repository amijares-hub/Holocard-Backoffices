import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkCategories() {
  const { data, error } = await supabase.from('categories').select('id, name');
  if (error) console.error(error.message);
  else console.log('Categories:', data);
}

checkCategories();
