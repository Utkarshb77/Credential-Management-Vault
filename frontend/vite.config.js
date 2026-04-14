import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:3000',
      '/unseal': 'http://localhost:3000',
      '/seal': 'http://localhost:3000',
      '/secrets': 'http://localhost:3000',
      '/audit': 'http://localhost:3000',
    },
  },
})
