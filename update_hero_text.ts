import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data: designs, error } = await supabase
    .from('homepage_clon_design')
    .select('*');

  if (error || !designs) {
    console.error('Error fetching designs:', error);
    return;
  }

  for (const design of designs) {
    if (!design.state) continue;
    
    const state = typeof design.state === 'string' ? JSON.parse(design.state) : design.state;

    if (state && state['ui_hero_split']) {
      state['ui_hero_split'].pokemon.description = 'Encuentra sobres, cajas, colecciones, y accesorios del Pokémon TCG.';
      state['ui_hero_split'].magic.description = 'Explora sobres, cajas, mazos, y accesorios de Magic: The Gathering.';
      state['ui_hero_split'].pokemon.title = 'POKÉMON';
      state['ui_hero_split'].pokemon.subtitle = 'TRADING CARD GAME';
      state['ui_hero_split'].magic.title = 'MAGIC';
      state['ui_hero_split'].magic.subtitle = 'THE GATHERING';
      
      const { error: updateError } = await supabase
        .from('homepage_clon_design')
        .update({ state })
        .eq('id', design.id);

      if (updateError) {
        console.error(`Error updating design ${design.id}:`, updateError);
      } else {
        console.log(`Successfully updated design ${design.id}.`);
      }
    }
  }
}

run();
