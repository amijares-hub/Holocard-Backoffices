import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkSchema() {
  const { data: tags, error: e1 } = await supabase.from('tags').select('*').limit(1);
  const { data: pt, error: e2 } = await supabase.from('product_tags').select('*').limit(1);
  
  console.log('Tags columns:', tags ? Object.keys(tags[0] || {}) : 'No data');
  console.log('ProductTags columns:', pt ? Object.keys(pt[0] || {}) : 'No data');
}

checkSchema();
