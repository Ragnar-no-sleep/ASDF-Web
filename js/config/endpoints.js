/**
 * ASDF-Web API Endpoints Configuration
 * Single source of truth for all API calls
 *
 * Environment:
 *   - DEV (localhost): proxied via server.cjs to /api
 *   - PROD: alonisthe.dev/{tool} (sollama58 repos)
 *
 * Tool services (sollama58):
 *   - github.com/sollama58/ASDFBurnTracker → alonisthe.dev/burns
 *   - github.com/sollama58/ASDForecast     → alonisthe.dev/asdforecast
 *   - github.com/sollama58/HolDex          → alonisthe.dev/holdex
 *   - github.com/sollama58/TokenVotingUtil → lock-verifier.onrender.com (TVU direct)
 *   - github.com/sollama58/ignition        → alonisthe.dev/ignition
 */

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const ASDF_ENDPOINTS = {
  // Tool services (sollama58 repos, alonisthe.dev subpaths)
  burns: isDev ? '/api' : 'https://alonisthe.dev/burns',
  forecast: isDev ? '/api' : 'https://alonisthe.dev/asdforecast',
  holdex: isDev ? '/api' : 'https://alonisthe.dev/holdex',
  // Staking: TokenVotingUtil (lock-verifier.onrender.com) — direct until alonisthe.dev/staking proxies
  staking: 'https://lock-verifier.onrender.com',
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
