/**
 * ASDF-Web API Endpoints Configuration
 * Single source of truth for all API calls.
 *
 * Environment:
 *   - DEV (localhost): proxied via dev server to /api
 *   - PROD (asdf-web.vercel.app / hub.alonisthe.dev): alonisthe.dev/{tool}
 *
 * Tool services (sollama58 backends, proxied by alonisthe.dev):
 *   - github.com/sollama58/ASDFBurnTracker -> alonisthe.dev/burns          (ALIVE 200 as of 2026-04-24)
 *   - github.com/sollama58/ASDForecast     -> alonisthe.dev/forecast       (state: silent — see narrative fallback)
 *   - github.com/sollama58/HolDex          -> alonisthe.dev/holdex         (state: silent)
 *   - github.com/sollama58/TokenVotingUtil -> alonisthe.dev/staking        (state: silent)
 *   - github.com/sollama58/ignition        -> alonisthe.dev/ignition       (state: silent)
 *
 * Render legacy URLs purged 2026-04-24 (post Vercel migration).
 * Narrative fallback strategy: Pillar 4 spec — when a backend returns 5xx,
 * surface CYNIC-framed copy instead of blank UI.
 */

const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const ASDF_ENDPOINTS = Object.freeze({
  burns: isDev ? '/api' : 'https://alonisthe.dev/burns',
  forecast: isDev ? '/api' : 'https://alonisthe.dev/forecast',
  holdex: isDev ? '/api' : 'https://alonisthe.dev/holdex',
  staking: isDev ? '/api' : 'https://alonisthe.dev/staking',
  ignition: isDev ? '/api' : 'https://alonisthe.dev/ignition',
  // Central API gateway — DISABLED post Render migration.
  // ASDF-Web own backend is being archived; clients should not call /api/* on prod.
  api: isDev ? '/api' : null,
});

// Global window access for non-module scripts (preserved during ES module migration)
if (typeof window !== 'undefined') {
  window.ASDF_ENDPOINTS = ASDF_ENDPOINTS;
}

export default ASDF_ENDPOINTS;
