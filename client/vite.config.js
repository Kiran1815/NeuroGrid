import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'NeuroGrid — Disaster Intelligence',
        short_name: 'NeuroGrid',
        description: 'Offline-first mesh communication for disaster survivors',
        start_url: '/',
        display: 'standalone',
        background_color: '#1A1208',
        theme_color: '#E67E22',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/neurogrid-production\.up\.railway\.app\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          },
          {
            urlPattern: /^https:\/\/[a-z]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 1500, // Enough for a large city and surrounding radii
                maxAgeSeconds: 60 * 60 * 24 * 60, // Keep them for 60 days
              },
              cacheableResponse: {
                statuses: [0, 200] // 0 catches opaque CORS resources
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})
