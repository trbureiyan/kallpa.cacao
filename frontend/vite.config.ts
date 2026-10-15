import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['cacao-mark.svg'],
      manifest: {
        name: 'Cacao en campo',
        short_name: 'Cacao campo',
        description: 'Registro de recepciones de cacao con captura sin conexión.',
        theme_color: '#173d2b',
        background_color: '#f5f4ee',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/cacao-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
