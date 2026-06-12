import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function testInsert() {
  const testId = '11111111-1111-1111-1111-111111111111';
  
  console.log('--- ATTEMPTING INSERT WITH ALL COLUMNS ---');
  const { error } = await supabase.from('user_profiles').insert({
    id: testId,
    email: 'test@test.com',
    phone: '123',
    address_street: 'Main',
    points: 100,
    pokeballs: 10,
    level: 1,
    tier: 'Bronze'
  });

  if (error) {
    console.log('FAIL:', error.message);
  } else {
    console.log('SUCCESS: All columns exist.');
    await supabase.from('user_profiles').delete().eq('id', testId);
  }
}
testInsert();
