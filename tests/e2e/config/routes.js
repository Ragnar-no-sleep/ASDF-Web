// @ts-check

/**
 * Data-driven route definitions for E2E smoke tests.
 * Single source of truth — add a route = add one object.
 */

/** Page routes — expect 200 + text/html */
export const PAGE_ROUTES = [
  { path: '/', label: 'Hub (Landing)' },
  { path: '/story', label: 'Learn (Story)' },
  { path: '/quick-start', label: 'Learn (Quick Start)' },
  { path: '/build', label: 'Build' },
  { path: '/games', label: 'Games' },
  { path: '/burns', label: 'Burns' },
  { path: '/forecast', label: 'Forecast' },
  { path: '/holdex', label: 'HolDex' },
  { path: '/staking', label: 'Staking' },
  { path: '/ignition', label: 'Ignition' },
  { path: '/deep-learn', label: 'Deep Learn' },
  { path: '/ecosystem-map', label: 'Ecosystem Map' },
  { path: '/me', label: 'Me (Profile)' },
  { path: '/terrier', label: 'Terrier (CYNIC)' },
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/widget', label: 'Widget' },
].map(r => ({ ...r, maxLoadMs: 5000, maxTtfbMs: 2000 }));

/** Redirect routes — expect 301 + location header */
export const REDIRECT_ROUTES = [
  { path: '/tools', expectedLocation: '/', label: 'Tools redirect' },
  { path: '/asdforecast', expectedLocation: '/forecast', label: 'ASDForecast redirect' },
];

/** API routes — expect 200 JSON */
export const API_ROUTES = [
  {
    path: '/health',
    label: 'Health check',
    expectedKeys: ['status', 'timestamp', 'uptime'],
  },
];

/** External API endpoints — soft-fail (never break build) */
export const EXTERNAL_APIS = [
  { url: 'https://alonisthe.dev/burns', label: 'Burns API' },
  { url: 'https://asdforecast.onrender.com', label: 'Forecast API' },
  { url: 'https://alonisthe.dev/holdex', label: 'HolDex API' },
  { url: 'https://lock-verifier.onrender.com', label: 'Staking API' },
  { url: 'https://alonisthe.dev/ignition', label: 'Ignition API' },
];

/** Security headers config */
export const SECURITY_HEADERS = {
  required: {
    'content-security-policy': true,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': true,
  },
  absent: ['x-powered-by'],
  cspDirectives: ['default-src', 'script-src-attr', 'style-src-attr'],
};

/** Routes spot-checked for security headers (representative sample) */
export const HEADER_CHECK_ROUTES = ['/', '/burns', '/privacy'];

/** Privacy page — required h2 section headings (RGPD compliance) */
export const PRIVACY_SECTIONS = [
  'Information We Collect',
  'How We Use Information',
  'Data Security',
  'Data Retention',
  'Your Rights',
  'Contact Us',
];
