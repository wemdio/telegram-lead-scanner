import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      mangle: false,  // Completely disable variable name mangling
      compress: {
        // Minimal compression to preserve variable names
        sequences: false,
        properties: false,
        drop_debugger: false,
        drop_console: false,
        pure_funcs: [],
        keep_fargs: true,
        keep_fnames: true,
        collapse_vars: false,
        reduce_vars: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});