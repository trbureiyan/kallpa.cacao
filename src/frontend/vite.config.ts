// vite.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'KallpaCacao - Trazabilidad',
        short_name: 'KallpaCacao',
        description: 'PWA Offline-First para captura de cacao en campo',
        theme_color: '#F3F9F4',
        background_color: '#F3F9F4',
        display: 'standalone',
        icons: [
          // un solo SVG vectorial: sirve a cualquier tamaño y evita PNG generados a mano
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // solo subconjunto latin: el español no usa los demás y cada uno pesa en red limitada
        globIgnores: ['**/*-latin-ext-*.woff2', '**/*-vietnamese-*.woff2', '**/*-cyrillic*.woff2', '**/*-greek*.woff2'],
        navigateFallback: 'index.html', // <--- AQUÍ: Garantiza que recargar offline devuelva la PWA
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});