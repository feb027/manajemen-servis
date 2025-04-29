import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: [
      'localhost', 
      '127.0.0.1', 
      'c8f5-180-243-188-59.ngrok-free.app'
    ]
  }
})
