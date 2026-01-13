import type { NextConfig } from 'next';

const API_URL = process.env.API_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,

  // Fix Turbopack workspace root detection
  turbopack: {
    root: '.',
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'alonisthe.dev',
      },
    ],
  },

  // Rewrites to proxy vanilla HTML pages through Express
  async rewrites() {
    return [
      // Existing vanilla pages served by Express on port 3001
      { source: '/burns', destination: `${API_URL}/burns` },
      { source: '/asdforecast', destination: `${API_URL}/asdforecast` },
      { source: '/holdex', destination: `${API_URL}/holdex` },
      { source: '/ignition', destination: `${API_URL}/ignition` },
      { source: '/story', destination: `${API_URL}/story` },
      { source: '/privacy', destination: `${API_URL}/privacy` },
      { source: '/widget', destination: `${API_URL}/widget` },
      { source: '/health', destination: `${API_URL}/health` },
      // API routes
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
