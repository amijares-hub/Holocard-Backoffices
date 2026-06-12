import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking games...");
  const { data: games, error: gErr } = await supabase.from('games').select('*');
  console.log('GAMES:', games, gErr);

  console.log("Checking categories...");
  const { data: cat, error: cErr } = await supabase.from('categories').select('*');
  console.log('CATEGORIES:', cat, cErr);
  
  console.log("Checking expansions...");
  const { data: exp, error: eErr } = await supabase.from('expansions').select('*');
  console.log('EXPANSIONS:', exp, eErr);
}
check();
