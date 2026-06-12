import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function diag() {
  console.log('--- DIAGNOSTIC: PROFILES TABLE ---');
  
  const { error: e1 } = await supabase.from('profiles').select('id').limit(1);
  console.log('Column "id":', e1 ? `MISSING (${e1.message})` : 'EXISTS');
  
  const { error: e2 } = await supabase.from('profiles').select('phone').limit(1);
  console.log('Column "phone":', e2 ? `MISSING (${e2.message})` : 'EXISTS');
  
  const { error: e3 } = await supabase.from('profiles').select('address_street').limit(1);
  console.log('Column "address_street":', e3 ? `MISSING (${e3.message})` : 'EXISTS');
  
  const { error: e4 } = await supabase.from('profiles').select('points').limit(1);
  console.log('Column "points":', e4 ? `MISSING (${e4.message})` : 'EXISTS');

  const { error: e5 } = await supabase.from('profiles').select('level').limit(1);
  console.log('Column "level":', e5 ? `MISSING (${e5.message})` : 'EXISTS');
}
diag();
