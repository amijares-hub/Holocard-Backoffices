import { createClient } from '@supabase/supabase-js';

const url = 'https://dopieoflkqfalnuvpwch.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcGllb2Zsa3FmYWxudXZwd2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTk0OTAsImV4cCI6MjA5MzM3NTQ5MH0.wDsDhIQv7zXpxlF25xGF9ZQmcm_G8DZRqQUWV6k-fKE';
const supabase = createClient(url, key);

async function test() {
  console.log('=== TEST 1: WRITE announcement ===');
  const { error: writeErr } = await supabase.from('system_settings').upsert({
    id: 'content_announcement',
    category: 'content',
    setting_key: 'content_announcement',
    value: { value: { active: true, message: 'TEST: SISTEMA OPERATIVO', color: 'bg-red-600' } },
    updated_at: new Date().toISOString()
  });
  console.log(writeErr ? `WRITE FAILED: ${writeErr.message} (code: ${writeErr.code})` : 'WRITE OK');

  console.log('\n=== TEST 2: READ announcement ===');
  const { data, error: readErr } = await supabase
    .from('system_settings')
    .select('*')
    .eq('id', 'content_announcement')
    .single();
  if (readErr) {
    console.log(`READ FAILED: ${readErr.message}`);
  } else {
    console.log('READ OK:', JSON.stringify(data.value, null, 2));
  }

  console.log('\n=== TEST 3: WRITE audit log ===');
  const { error: auditErr } = await supabase.from('system_audit_logs').insert({
    action: 'TEST_PERSISTENCE',
    setting_id: 'content_announcement',
    old_value: {},
    new_value: { value: 'TEST: SISTEMA OPERATIVO' }
  });
  console.log(auditErr ? `AUDIT FAILED: ${auditErr.message} (code: ${auditErr.code})` : 'AUDIT OK');

  console.log('\n=== TEST 4: READ suppliers ===');
  const { data: suppliers, error: supErr } = await supabase.from('suppliers').select('*');
  console.log(supErr ? `SUPPLIERS FAILED: ${supErr.message}` : `SUPPLIERS OK: ${JSON.stringify(suppliers)}`);

  console.log('\n=== ALL TESTS COMPLETE ===');
}

test();
