import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Root directory
  root: '.',

  // Public assets (copied as-is)
  publicDir: 'public',

  // Build configuration
  build: {
    outDir: 'dist',
    emptyOutDir: true,

    // For now, just copy files - progressive migration
    rollupOptions: {
      input: {
        // Start with hub-majestic as the new landing
        hub: resolve(__dirname, 'hub-majestic.html'),
      },
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Copy static files
    copyPublicDir: true,

    // Minification (esbuild is faster and included by default)
    minify: 'esbuild',
  },

  // Dev server
  server: {
    port: 5173,
    open: '/hub-majestic.html',
    cors: true,
  },

  // Resolve aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
      '@css': resolve(__dirname, 'css'),
    },
  },

  // Optimize deps
  optimizeDeps: {
    include: ['three', 'gsap'],
  },
});
