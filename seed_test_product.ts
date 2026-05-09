import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder') 
    ? process.env.VITE_SUPABASE_ANON_KEY! 
    : process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log('🌱 Cargando producto de prueba...');

  try {
    // 1. Crear Proveedor si no existe
    const { data: supplier, error: sError } = await supabase
      .from('suppliers')
      .upsert({ name: 'Odoo Central', delivery_time_avg: 4, is_active: true }, { onConflict: 'name' })
      .select()
      .single();

    if (sError) throw sError;
    console.log('✅ Proveedor listo:', supplier.name);

    // 2. Crear Producto
    const { data: product, error: pError } = await supabase
      .from('products')
      .upsert({
        sku: 'PKM-TEST-001',
        name: 'Charizard VMAX Shiny - Edición Especial',
        slug: 'charizard-vmax-shiny-test',
        description: 'Carta de prueba para validación de arquitectura multi-proveedor.',
        image_url: 'https://images.pokemontcg.io/swsh45/107_hires.png',
        meta_tags: { rarity: 'Secret Rare', set: 'Shining Fates' }
      }, { onConflict: 'sku' })
      .select()
      .single();

    if (pError) throw pError;
    console.log('✅ Producto listo:', product.name);

    // 3. Crear Inventario (Margen del 20%)
    const { error: iError } = await supabase
      .from('product_inventory')
      .upsert({
        product_id: product.id,
        supplier_id: supplier.id,
        sale_price: 120.00,
        cost_price: 90.00, // Margen > 15%
        stock: 10
      }, { onConflict: 'product_id,supplier_id' });

    if (iError) throw iError;
    console.log('✅ Inventario vinculado correctamente.');

    console.log('\n✨ Éxito: Producto de prueba cargado. Ya debería aparecer en /api/cards');

  } catch (err: any) {
    console.error('❌ Error cargando datos:', err.message);
  }
}

seed();
