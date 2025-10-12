import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chat/api": {
        target: "http://localhost:5005",
        changeOrigin: true,
      },
    },
  },
});