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

    // Multi-page app configuration
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        learn: resolve(__dirname, 'learn.html'),
        deepLearn: resolve(__dirname, 'deep-learn.html'),
        build: resolve(__dirname, 'build.html'),
        games: resolve(__dirname, 'games.html'),
        burns: resolve(__dirname, 'burns.html'),
        holdex: resolve(__dirname, 'holdex.html'),
        forecast: resolve(__dirname, 'forecast.html'),
        privacy: resolve(__dirname, 'privacy.html'),
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
    open: '/',
    cors: true,
    proxy: {
      // Proxy API calls to avoid CORS in development
      '/api': {
        target: 'https://asdf-api.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
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
