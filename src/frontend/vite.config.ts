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
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'KallpaCacao - Trazabilidad',
        short_name: 'KallpaCacao',
        description: 'PWA Offline-First para captura de cacao en campo',
        theme_color: '#F8FAFC',
        background_color: '#F8FAFC',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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