import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      react(),
      nodePolyfills({
        include: ['stream', 'util'],
        globals: { Buffer: true, global: true, process: true },
      }),
    ],
  server: {
    port: 5173,
    host: true, // Listen on all local IPs
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/s3-proxy': {
        target: 'https://smartbuddyiot.s3.ap-south-1.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/s3-proxy/, '')
      }
    }
  }
  };
});
