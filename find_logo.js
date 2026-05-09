import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dopieoflkqfalnuvpwch.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcGllb2Zsa3FmYWxudXZwd2NoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc5OTQ5MCwiZXhwIjoyMDkzMzc1NDkwfQ.szZyifyzx7vBHtaTNyH89oIGfCS-mwxfIOCMVfwSw8Q'
);

async function findLogo() {
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error('Error fetching buckets:', bucketsErr);
    return;
  }
  
  console.log('Buckets:', buckets.map(b => b.name));

  for (const bucket of buckets) {
    const { data: files, error: filesErr } = await supabase.storage.from(bucket.name).list();
    if (filesErr) {
      console.error(`Error fetching files in ${bucket.name}:`, filesErr);
      continue;
    }
    console.log(`Files in ${bucket.name}:`, files.map(f => f.name));
  }
}

findLogo();
