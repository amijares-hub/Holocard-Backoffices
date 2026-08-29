import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // En Vercel usamos rutas absolutas ('/') para que los assets se resuelvan
  // correctamente al navegar directo a subrutas profundas (/admin/taxonomy).
  // En Chrome Extension se requieren rutas relativas ('./') porque el protocolo
  // chrome-extension:// no admite rutas absolutas.
  const isVercel = !!process.env.VERCEL;
  return {
    base: isVercel ? '/' : './',
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
          // En Vercel (SPA web) el SW debe interceptar navegación a subrutas
          // y devolver el index.html, evitando que el browser reciba HTML en
          // lugar de JS (error: "Unexpected token '<'").
          // En Chrome Extension lo mantenemos null para evitar conflictos.
          navigateFallback: isVercel ? '/index.html' : null,
        },
      }),
    ],
    // NOTA DE SEGURIDAD: No inyectar claves de API privadas (Gemini, Stripe secret, etc.)
    // en el bundle del cliente mediante define{}.
    // Las llamadas a IA deben realizarse a través de una Edge Function o el servidor Express.
    define: {},
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
