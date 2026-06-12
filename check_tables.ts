import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkTables() {
  const tables = ['user_profiles', 'user_notifications', 'user_collection'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
    console.log(`Table "${t}":`, error ? `ERROR (${error.message})` : 'EXISTS');
  }
}
checkTables();
