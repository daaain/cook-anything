import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src/mcp',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'src/lib/mcp/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/mcp/mcp-app.html'),
    },
  },
  css: {
    postcss: resolve(__dirname, 'postcss.config.mjs'),
  },
});
