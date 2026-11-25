import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-196.png', 'icons/apple-icon-180.png'],
      manifest: {
        name: 'Little Hanzi Chinese',
        short_name: 'Chinese',
        description: 'Chinese reading tool with pinyin alongside each word',
        theme_color: '#f4f7fa',
        background_color: '#f4f7fa',
        display: 'standalone',
        scope: '/Little_Hanzi_Chinese/',
        start_url: '/Little_Hanzi_Chinese/',
        icons: [
          {
            src: 'icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/manifest-icon-192.maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/manifest-icon-512.maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  base: '/Little_Hanzi_Chinese/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    timeout: 120000,
  },
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
  },
})
