import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), VitePWA({ registerType: 'autoUpdate' })],
  base: '/Little_Hanzi_Chinese/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure clean builds
    emptyOutDir: true,
    // Add source maps for better debugging
    sourcemap: true,
    // Increase build timeout
    timeout: 120000,
  },
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0'
  },
})
