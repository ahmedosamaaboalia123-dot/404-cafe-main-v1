import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
          if (id.includes('node_modules/react-router')) return 'vendor-router'
          if (id.includes('node_modules/@tanstack')) return 'vendor-query'
          if (id.includes('node_modules/axios')) return 'vendor-http'
          if (/node_modules[\\/](socket\.io|engine\.io|socket.io|engine.io)/.test(id)) return 'vendor-realtime'
          if (/node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id)) return 'vendor-form'
          if (id.includes('node_modules/@fingerprintjs')) return 'vendor-fingerprint'
          if (/node_modules[\\/](qrcode|dijkstrajs)[\\/]/.test(id)) return 'vendor-qrcode'
          if (/node_modules[\\/](recharts|d3-|@reduxjs|immer|decimal.js-light)[\\/]/.test(id)) return 'vendor-charts'
          if (id.includes('node_modules/zustand')) return 'vendor-state'
          if (id.includes('node_modules/date-fns')) return 'vendor-date'
          return undefined
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
})
