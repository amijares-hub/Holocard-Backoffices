import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // ── CRÍTICO para Chrome Extension ────────────────────────────────────────
    // El protocolo chrome-extension:// requiere rutas relativas (./) en lugar
    // de absolutas (/). Sin esto, los assets no cargan en el popup.
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // ── Estrategia: autoUpdate ────────────────────────────────────────────
        // El Service Worker se actualiza automáticamente en todos los dispositivos
        // cada vez que se despliega una nueva versión en Vercel.
        registerType: 'autoUpdate',
        injectRegister: 'auto',

        // ── Manifest: La Identidad de la App ─────────────────────────────────
        manifest: {
          name: 'HoloCards Admin Core',
          short_name: 'HC Admin',
          description: 'Cuartel General Administrativo de HoloCards',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/admin',
          scope: '/',
          icons: [
            {
              src: './pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: './pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },

        // ── Workbox: Estrategia de Caché ──────────────────────────────────────
        workbox: {
          // Solo cachear el App Shell: JS, CSS, HTML y assets pequeños del admin
          globPatterns: ['**/*.{js,css,html,ico,woff,woff2}', 'pwa-*.png'],
          // Excluir imágenes pesadas del storefront público
          globIgnores: ['Imagenes/**', '**/*.{mp4,webm,mp3}'],
          // Límite de tamaño por archivo (5 MB, por seguridad)
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // En contexto de extensión no hay navegación de URL clásica;
          // desactivamos navigateFallback para evitar conflictos con el popup.
          navigateFallback: null,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
