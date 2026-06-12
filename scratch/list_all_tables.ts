import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables_list'); // If it exists
  if (error) {
    console.error('Error fetching tables via RPC:', error.message);
    // Fallback: try to query information_schema if permitted or just common tables
    const tables = ['products', 'categories', 'product_variants', 'inventory', 'orders', 'profiles'];
    for (const table of tables) {
      const { error: tError } = await supabase.from(table).select('*').limit(0);
      if (!tError) console.log(`Table exists: ${table}`);
      else console.log(`Table ${table} error: ${tError.message}`);
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
