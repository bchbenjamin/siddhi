import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: 'api.siddhi.bchbenjamin.in',
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.siddhi.bchbenjamin.in:8000',
        changeOrigin: true,
      },
    },
  },
});
