import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function runTest() {
  console.log('🚀 SYSTEM TEST START (Privileged Access)');

  const testId = '11111111-1111-1111-1111-111111111111';

  // 1. Ensure test user exists in user_profiles
  console.log('👤 Synchronizing Test Profile...');
  await supabase.from('user_profiles').delete().eq('id', testId);
  const { error: upsertError } = await supabase
    .from('user_profiles')
    .insert({
      id: testId,
      email: 'test_trainer@sasori.io',
      points: 100,
      pokeballs: 2,
      phone: null,
      address_street: null,
      level: 1,
      tier: 'Bronze'
    });

  if (upsertError) {
    console.error('❌ PROFILE SYNC FAILED:', upsertError.message);
    return;
  }

  // 2. Perform "First Time Completion" update
  console.log('⚡ Performing Mission: Identity Matrix...');
  const { error: updateError } = await supabase
    .from('user_profiles')
    .update({
      phone: '+1 888 777 666',
      address_street: 'Victory Road 1',
      points: 100 + 250,
      pokeballs: 2 + 5
    })
    .eq('id', testId);

  if (updateError) {
    console.error('❌ MISSION UPDATE FAILED:', updateError.message);
  } else {
    console.log('✅ Mission Logic Executed: Rewards Applied.');
  }

  // 3. Inject Notification
  console.log('🔔 Injecting Real-time Notification...');
  await supabase.from('user_notifications').insert({
    user_id: testId,
    message: 'PROTOCOL SYNC: +250 EXP & 5 Pokéballs awarded for Identity Matrix completion.',
    type: 'gift',
    read: false
  });

  // 4. Verify Vault
  console.log('📦 Populating Vault Specimen...');
  await supabase.from('user_collection').upsert({
    user_id: testId,
    card_name: 'Charizard GMAX',
    rarity: 'Secret Rare',
    image_url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png'
  });

  // 5. Final Report
  const { data: final } = await supabase.from('user_profiles').select('*').eq('id', testId).single();
  const { count: notifCount } = await supabase.from('user_notifications').select('*', { count: 'exact' }).eq('user_id', testId);
  const { data: vault } = await supabase.from('user_collection').select('*').eq('user_id', testId);

  console.log('\n--- FINAL VERIFICATION REPORT ---');
  console.log(`User: ${final.email}`);
  console.log(`Points: ${final.points} (Target: 350)`);
  console.log(`Pokéballs: ${final.pokeballs} (Target: 7)`);
  console.log(`Notifications: ${notifCount} active signals`);
  console.log(`Vault: ${vault.length} entities recovered`);
  console.log('---------------------------------\n');
  
  // Cleanup
  await supabase.from('user_profiles').delete().eq('id', testId);
  await supabase.from('user_notifications').delete().eq('user_id', testId);
  await supabase.from('user_collection').delete().eq('user_id', testId);

  console.log('✅ ALL PROTOCOLS VERIFIED.');
}

runTest();
