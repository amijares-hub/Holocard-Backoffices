import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkVariants() {
  const { data, error } = await supabase.from('product_variants').select('*').limit(1);
  if (error) {
    console.error('Error fetching variants:', error.message);
  } else if (data && data.length > 0) {
    console.log('Variant columns:', Object.keys(data[0]));
  } else {
    console.log('No variants found.');
  }
}

checkVariants();
