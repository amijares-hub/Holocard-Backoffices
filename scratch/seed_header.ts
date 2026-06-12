import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  const headerData = {
    logo_url: "https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagen%20De%20Logo%20de%20Empresa/logo%20Holocard.jpg",
    menu_items: [
      { label: 'INICIO', path: '/' },
      { label: 'PRODUCTOS', path: '/catalog', hasDropdown: true },
      { label: 'NOVEDADES', path: '/catalog?filter=new' },
      { label: 'OFERTAS', path: '/catalog?filter=deals' },
      { label: 'HOW TO PLAY', path: '/how-to-play' },
      { label: 'SOBRE NOSOTROS', path: '/about' }
    ],
    announcement_bar: {
      text: "¡BIENVENIDO A HOLOCARD: LA MEJOR EXPERIENCIA TCG EN CANARIAS!",
      bgColor: "#EF4444",
      isActive: true
    }
  };

  const { error } = await supabase
    .from('homepage_clon_design')
    .upsert({ 
      component_id: 'ui_header', 
      category: 'header', 
      ui_data: headerData 
    }, { onConflict: 'component_id' });

  if (error) console.error('Error seeding header:', error);
  else console.log('Header seeded successfully');
}

seed();
