import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// O navegador fala só com o Vite; o Vite repassa /api para o backend (sem CORS e sem "localhost" no código).
const alvoApi = process.env.API_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true, proxy: { '/api': alvoApi } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.js'], testTimeout: 15000 },
  preview: { host: '0.0.0.0', port: 5173, allowedHosts: true, proxy: { '/api': alvoApi } },
});
