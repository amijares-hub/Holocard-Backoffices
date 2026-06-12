import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const HOMEPAGE_DESIGN = [
  {
    component_id: 'ui_header',
    category: 'header',
    ui_data: {
      logo_url: 'https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagen%20De%20Logo%20de%20Empresa/logo%20Holocard.jpg',
      menu_items: [
        { label: 'INICIO', path: '/' },
        { label: 'PRODUCTOS', path: '/catalog', hasDropdown: true },
        { label: 'NOVEDADES', path: '/catalog?filter=new' },
        { label: 'OFERTAS', path: '/catalog?filter=deals' },
        { label: 'HOW TO PLAY', path: '/how-to-play' },
        { label: 'SOBRE NOSOTROS', path: '/about' }
      ],
      announcement_bar: {
        text: '¡EVENTO MEWTWO: DOBLE EXP ACTIVA!',
        bgColor: '#EF4444',
        isActive: true
      }
    }
  },
  {
    component_id: 'ui_hero_split',
    category: 'hero',
    ui_data: {
      pokemon: {
        bgImage: '/Imagenes/pikachu_hero.png',
        bgColor: '#FBBF24',
        title: 'POKÉMON',
        subtitle: 'TRADING CARD GAME',
        description: 'Tu tienda de confianza en Canarias para el Pokémon TCG.',
        buttonText: 'VER PRODUCTOS',
        buttonLink: '/catalog?game=pokemon',
        expansionLogos: [
          'https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagenes%20de%20Cartas/me04-slider-logo-es.png',
          'https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagenes%20de%20Cartas/me05-slider-logo-es.png',
          'https://dopieoflkqfalnuvpwch.supabase.co/storage/v1/object/public/Imagenes%20de%20Cartas/me2pt5-slider-logo-es.png'
        ]
      },
      magic: {
        bgImage: '/Imagenes/liliana_hero.png',
        bgColor: '#1E1B4B',
        title: 'MAGIC',
        subtitle: 'THE GATHERING',
        description: 'Consigue tus cartas legendarias de Magic en Canarias.',
        buttonText: 'VER PRODUCTOS',
        buttonLink: '/catalog?game=mtg',
        expansionLogos: [
          '/Imagenes/Magic The Gathering/logo expansion.webp',
          '/Imagenes/Magic The Gathering/logo expansion2.webp',
          '/Imagenes/Magic The Gathering/logo expansion3.webp'
        ]
      }
    }
  },
  {
    component_id: 'ui_featured_shelves',
    category: 'shelves',
    ui_data: {
      title: 'PRODUCTOS DESTACADOS',
      filterTags: [
        { label: 'TODOS', filterCategory: 'all' },
        { label: 'SOBRES', filterCategory: 'packs' },
        { label: 'CAJAS', filterCategory: 'boxes' },
        { label: 'ACCESORIOS', filterCategory: 'accessories' }
      ]
    }
  }
];

async function seed() {
  console.log('Seeding homepage design...');
  for (const design of HOMEPAGE_DESIGN) {
    const { error } = await supabase
      .from('homepage_clon_design')
      .upsert(design, { onConflict: 'component_id' });
    
    if (error) {
      console.error(`Error seeding ${design.component_id}:`, error.message);
    } else {
      console.log(`Successfully seeded ${design.component_id}`);
    }
  }
}

seed();
