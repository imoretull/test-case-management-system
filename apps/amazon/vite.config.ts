import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const TCMS_SERVER = process.env.TCMS_SERVER_URL ?? 'http://localhost:3030';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: TCMS_SERVER,
        changeOrigin: true,
        // SSE needs the proxy to keep the connection open and not buffer.
        ws: false,
      },
    },
  },
});
