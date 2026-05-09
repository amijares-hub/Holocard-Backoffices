import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder') 
    ? process.env.VITE_SUPABASE_ANON_KEY! 
    : process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERVER_URL = 'http://localhost:3000';

async function fullFlow() {
  console.log('🚀 Iniciando Flujo Completo de Prueba (Modo Seguro)...');

  try {
    // 1. Obtener o Crear Proveedor 'Almacén Central'
    let supplierId;
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('name', 'Almacén Central')
      .single();

    if (existingSupplier) {
      supplierId = existingSupplier.id;
      console.log('✅ Proveedor Almacén Central ya existe.');
    } else {
      const { data: newSupplier, error: sError } = await supabase
        .from('suppliers')
        .insert({ name: 'Almacén Central', delivery_time_avg: 2, is_active: true })
        .select()
        .single();
      if (sError) throw sError;
      supplierId = newSupplier.id;
      console.log('✅ Proveedor Almacén Central creado.');
    }

    // 2. Obtener o Crear Producto de prueba
    let productId;
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('sku', 'SAS-001-TEST')
      .single();

    if (existingProduct) {
      productId = existingProduct.id;
      console.log('✅ Producto SAS-001-TEST ya existe.');
    } else {
      const { data: newProduct, error: pError } = await supabase
        .from('products')
        .insert({
          sku: 'SAS-001-TEST',
          name: 'Mewtwo VSTAR Gold - High Grade',
          slug: 'mewtwo-vstar-gold-test',
          description: 'Producto de prueba para validación de flujo completo Odoo.',
          image_url: 'https://images.pokemontcg.io/swsh12.5/086_hires.png',
          meta_tags: { rarity: 'Gold Rare', set: 'Crown Zenith' }
        })
        .select()
        .single();
      if (pError) throw pError;
      productId = newProduct.id;
      console.log('✅ Producto SAS-001-TEST creado.');
    }

    // 3. Vincular Inventario
    const { error: iError } = await supabase.from('product_inventory').insert({
        product_id: productId,
        supplier_id: supplierId,
        sale_price: 150.00,
        cost_price: 110.00,
        stock: 5
    });
    
    if (iError && !iError.message.includes('already exists')) {
        console.log('⚠️ Error vinculando inventario:', iError.message);
    } else {
        console.log('✅ Inventario vinculado (o ya existía).');
    }

    // 4. Crear un Pedido de prueba (Simulando compra confirmada)
    const { data: order, error: oError } = await supabase
      .from('orders')
      .insert({
        customer_nif: 'B12345678',
        billing_address: 'Calle Falsa 123, Madrid, España',
        total_amount: 150.00,
        tax_amount: 31.50, // 21% IVA
        status: 'pending'
      })
      .select()
      .single();

    if (oError) throw oError;
    console.log(`✅ Pedido #${order.order_number} creado en Supabase.`);

    // 5. Simular Pago y disparar Webhook de Odoo
    console.log('📡 Disparando Webhook de Facturación Odoo...');
    const res = await axios.post(`${SERVER_URL}/api/webhooks/payment-confirmed`, {
      order_id: order.id
    });

    console.log('\n--- RESULTADO DE SIMULACIÓN ---');
    console.log('Status:', res.data.status);
    console.log('Mensaje:', res.data.message);
    console.log('-------------------------------');

  } catch (err: any) {
    console.error('❌ Error en el flujo:', err.response?.data || err.message);
  }
}

fullFlow();
