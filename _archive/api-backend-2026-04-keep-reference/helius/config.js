/**
 * Helius RPC Layer — Configuration
 *
 * Single source of truth for all Helius/ASDF constants.
 * Replaces scattered config across client.js, enhanced.js, ws.js.
 *
 * @see docs/ARCH-HELIUS.md Section 3
 */

'use strict';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

const ASDF = Object.freeze({
  MINT: process.env.ASDF_TOKEN_MINT || '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump',
  DECIMALS: 6,
  INITIAL_SUPPLY: 1_000_000_000,
  MIN_HOLDER_BALANCE: 1_000_000,
});

const CACHE_TTL = Object.freeze({
  tokenSupply: 60_000,
  tokenBalance: 30_000,
  recentBurns: 120_000,
  priorityFee: 10_000,
  burnHistory: 300_000,
  das: 60_000,
  dasOwner: 120_000,
});

const PRIORITY_FEE = Object.freeze({
  default: 50_000,
  min: 10_000,
  max: 500_000,
  level: 'Medium',
});

const CONFIRMATION = Object.freeze({
  maxAttempts: 30,
  delayMs: 2_000,
  commitment: 'confirmed',
});

/**
 * Redact API key from URL for safe logging.
 * @param {string} url
 * @returns {string}
 */
function redactApiKey(url) {
  if (!url) return '';
  return url.replace(/api-key=[^&]+/, 'api-key=REDACTED');
}

module.exports = {
  HELIUS_API_KEY,
  ASDF,
  CACHE_TTL,
  PRIORITY_FEE,
  CONFIRMATION,
  redactApiKey,
};
