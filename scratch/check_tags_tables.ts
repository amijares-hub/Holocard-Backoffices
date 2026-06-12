import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkTags() {
  const { data: tags, error: e1 } = await supabase.from('tags').select('name').limit(1);
  const { data: pt, error: e2 } = await supabase.from('product_tags').select('*').limit(1);
  
  console.log('Tags table exists:', !e1);
  console.log('ProductTags table exists:', !e2);
}

checkTags();
