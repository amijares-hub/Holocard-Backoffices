import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkAnyProduct() {
  const { data, error } = await supabase.from('products').select('*').limit(5);
  if (error) console.error(error.message);
  else console.log('Products found:', data);
}

checkAnyProduct();
