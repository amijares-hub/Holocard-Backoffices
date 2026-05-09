import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SERVER_URL = 'http://localhost:3000';

async function testGamification() {
  console.log('🎮 Iniciando Simulación de Gamificación (Nivel 1)...');

  try {
    // 1. Crear un usuario de prueba en auth.users
    const testEmail = `ash.ketchum.${Date.now()}@sasorilabs.com`;
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'securepassword123',
      email_confirm: true
    });

    if (authErr) throw authErr;
    const userId = authUser.user.id;
    console.log(`✅ Entrenador creado: ${testEmail}`);

    // Crear su perfil (forzando nivel 1)
    const { error: profileErr } = await supabase.from('user_profiles').insert({
      id: userId,
      level: 1,
      exp: 0,
      battle_pass_points: 0,
      pokeballs: 5
    });
    
    if (profileErr && !profileErr.message.includes('already exists')) throw profileErr;
    console.log('✅ Hoja de personaje inicializada (Nivel 1, 0 EXP, 0 BP).');

    // 2. Obtener el producto de prueba (Mewtwo)
    const { data: product, error: pErr } = await supabase
      .from('products')
      .select('id, name')
      .eq('sku', 'SAS-001-TEST')
      .single();

    if (pErr) throw new Error('Producto de prueba no encontrado. ¿Ejecutaste el script de carga anterior?');

    // Nos aseguramos que tenga stock para la prueba
    await supabase.rpc('decrement_stock', { p_id: product.id, qty: -10 });
    // O mejor un update directo por si el rpc falla con negativos
    await supabase.from('product_inventory').update({ stock: 10 }).eq('product_id', product.id);

    console.log(`🛒 Carrito listo: 1x ${product.name} (150€)`);

    // 3. Simular el Checkout a través de nuestro endpoint
    const payload = {
      userId: userId,
      cart: [
        { id: product.id, name: product.name, price: 150.00, quantity: 1 }
      ],
      fiscalData: { nif: 'X1234567Y', address: 'Pueblo Paleta 1' }
    };

    console.log('📡 Disparando Endpoint /api/checkout/simulate...');
    const res = await axios.post(`${SERVER_URL}/api/checkout/simulate`, payload);

    console.log('\n--- 🏆 RESULTADO DEL CHECKOUT GAMIFICADO ---');
    console.log('Status:', res.data.status);
    console.log('Mensaje:', res.data.progress.message);
    
    // Verificar base de datos para ver el Battle Pass Points
    const { data: finalProfile } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    
    console.log('\n📊 HOJA DE PERSONAJE ACTUALIZADA:');
    console.log(`- Nivel actual: ${finalProfile.level}`);
    console.log(`- EXP acumulada: ${finalProfile.exp} / 1000 (para Nivel 2)`);
    console.log(`- Battle Pass Pts: ${finalProfile.battle_pass_points}`);
    console.log(`- Pokéballs Disp.: ${finalProfile.pokeballs}`);
    console.log('--------------------------------------------');

    // Limpieza
    await supabase.auth.admin.deleteUser(userId);

  } catch (err: any) {
    console.error('❌ Error en simulación:', err.response?.data || err.message);
  }
}

testGamification();
