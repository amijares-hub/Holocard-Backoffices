import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function refreshCache() {
  console.log('🔄 TRIGGERING CACHE REFRESH...');
  
  // Try to create the columns if they are missing
  // Since I can't run raw SQL easily via the client without an RPC, 
  // I will just try to insert a row with JUST the columns I know exist (id, email).
  
  const testId = '22222222-2222-2222-2222-222222222222';
  const { error } = await supabase.from('user_profiles').upsert({
    id: testId,
    email: 'cache_test@sasori.io'
  });

  if (error) {
    console.error('❌ CACHE TEST FAILED:', error.message);
  } else {
    console.log('✅ BASE INSERT SUCCESSful. Checking for other columns again...');
    const { data, error: e2 } = await supabase.from('user_profiles').select('*').eq('id', testId).single();
    if (e2) console.log('Columns still missing in select *');
    else console.log('AVAILABLE COLUMNS:', Object.keys(data));
  }
}
refreshCache();
