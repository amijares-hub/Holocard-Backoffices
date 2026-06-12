import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function checkOrders() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) console.error(error.message);
  else if (data && data.length > 0) console.log('Order columns:', Object.keys(data[0]));
  else console.log('No orders found.');
}

checkOrders();
