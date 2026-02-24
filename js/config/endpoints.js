/**
 * ASDF-Web API Endpoints Configuration
 * Single source of truth for all API calls
 *
 * Environment:
 *   - DEV (localhost): proxied via server.cjs to /api
 *   - PROD: alonisthe.dev/{tool} (sollama58 repos)
 *
 * Tool services (sollama58):
 *   - github.com/sollama58/burns    → alonisthe.dev/burns
 *   - github.com/sollama58/forecast → alonisthe.dev/asdforecast
 *   - github.com/sollama58/holdex   → alonisthe.dev/holdex
 *   - github.com/sollama58/staking  → alonisthe.dev/staking
 *   - github.com/sollama58/ignition → alonisthe.dev/ignition
 */

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const ASDF_ENDPOINTS = {
  // Tool services (sollama58 repos, alonisthe.dev subpaths)
  burns: isDev ? '/api' : 'https://alonisthe.dev/burns',
  forecast: isDev ? '/api' : 'https://alonisthe.dev/asdforecast',
  holdex: isDev ? '/api' : 'https://alonisthe.dev/holdex',
  staking: isDev ? '/api' : 'https://alonisthe.dev/staking',
  ignition: isDev ? '/api' : 'https://alonisthe.dev/ignition',

  // Central API gateway (asdf-api on Render)
  api: isDev ? '/api' : 'https://asdf-api.onrender.com/api',
};

// Freeze for immutability
Object.freeze(ASDF_ENDPOINTS);

// Global window access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF_ENDPOINTS = ASDF_ENDPOINTS;
}

export default ASDF_ENDPOINTS;
