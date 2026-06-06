import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  // Local dev runs at site root; production keeps the GitHub Pages subpath.
  base: command === 'serve' ? '/' : '/ASDF-Web/',

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
        staking: resolve(__dirname, 'staking.html'),
        ignition: resolve(__dirname, 'ignition.html'),
        me: resolve(__dirname, 'me.html'),
        terrier: resolve(__dirname, 'terrier.html'),
        ecosystemMap: resolve(__dirname, 'ecosystem-map.html'),
      },
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Manual chunks for better code splitting
        manualChunks: id => {
          // Three.js and related
          if (id.includes('three-renderer') || id.includes('node_modules/three')) {
            return 'three-renderer';
          }
          // SVG renderer fallback
          if (id.includes('svg-renderer')) {
            return 'svg-renderer';
          }
          // Performance monitoring
          if (id.includes('renderer/performance')) {
            return 'performance';
          }
          // Large data files - courses and formations
          if (id.includes('data/courses') || id.includes('data/formations')) {
            return 'courses-data';
          }
          // Skills data
          if (id.includes('data/skills')) {
            return 'skills-data';
          }
          // Yggdrasil unified (heavy component)
          if (id.includes('yggdrasil-unified')) {
            return 'yggdrasil-unified';
          }
          // Games engine
          if (id.includes('js/games/')) {
            return 'games';
          }
        },
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
      // Proxy API calls to local API (3001) or fallback to production
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
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
    include: ['three'],
  },
}));
