import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkProducts() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    console.error('Error fetching products:', error.message);
  } else if (data && data.length > 0) {
    console.log('Product columns:', Object.keys(data[0]));
  } else {
    console.log('No products found, checking table definition...');
    const { data: tableData, error: tableError } = await supabase.rpc('get_table_columns', { table_name: 'products' });
    if (tableError) console.error('Table info error:', tableError.message);
    else console.log('Columns:', tableData);
  }
}

checkProducts();
