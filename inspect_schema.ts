import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function inspect() {
  console.log('--- PROFILES ---');
  const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
  if (pError) console.error('PROFILES ERROR:', pError.message);
  else console.log('PROFILES COLUMNS:', Object.keys(pData[0] || {}));

  console.log('--- USER_PROFILES ---');
  const { data: upData, error: upError } = await supabase.from('user_profiles').select('*').limit(1);
  if (upError) console.error('USER_PROFILES ERROR:', upError.message);
  else console.log('USER_PROFILES COLUMNS:', Object.keys(upData[0] || {}));
}
inspect();
