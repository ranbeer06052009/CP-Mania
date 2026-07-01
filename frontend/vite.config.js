import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/public-contests': {
        target: 'https://cp-contest-tracker-510u.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/public-contests/, '/contests/')
      }
    }
  }
})
