import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

console.log('VITE CONFIG LOADED')

export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — changes rarely
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Data layer — changes rarely
          'vendor-data': ['swr', 'axios'],

          // Animation library — changes rarely
          'vendor-motion': ['framer-motion'],

          // Monitoring — changes rarely
          'vendor-sentry': ['@sentry/react'],
        },
      },
    },
  },

  server: {
    host: '0.0.0.0',
    strictPort: true,

    allowedHosts: [
      '.ngrok-free.dev',
      '.trycloudflare.com',
      'localhost',
      '127.0.0.1'
    ]
  },

  preview: {
    host: '0.0.0.0',
    strictPort: true,

    allowedHosts: [
      '.ngrok-free.dev',
      '.trycloudflare.com',
      'localhost',
      '127.0.0.1'
    ]
  }
})