/**
 * ASDF API - Helius Service Barrel
 *
 * Re-exports all Helius/ASDF functions from their canonical sources.
 * Existing callers of require('./services/helius') resolve here automatically
 * via Node.js directory index resolution — zero import breakage.
 *
 * Migration strategy (PR3):
 *   - Domain functions → new Layer 4 services (asdf-token, burn-tracker)
 *   - Constants → helius/config.js
 *   - Legacy utils (isValidAddress, healthCheck, etc.) → client.js (until PR4)
 *
 * @see docs/ARCH-HELIUS.md Section 15
 */

'use strict';

const client = require('./client');
const asdfToken = require('../asdf-token');
const burnTracker = require('../burn-tracker');
const { ASDF, PRIORITY_FEE, redactApiKey } = require('./config');
const providers = require('./providers');

// ==== Provider Registration (one-time, module scope) ====

if (providers.size() === 0) {
  const apiKey = process.env.HELIUS_API_KEY;

  if (apiKey) {
    providers.register('helius-gk', {
      rpcUrl: 'https://mainnet.helius-rpc.com',
      restUrl: 'https://api.helius.xyz',
      apiKey,
      capabilities: ['rpc', 'das', 'enhanced', 'priority'],
      weight: 10,
    });
  }

  providers.register('solana-pub', {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    capabilities: ['rpc'],
    weight: 1,
  });
}

// ==== Exports ====

module.exports = {
  // Legacy fallback — everything from client.js (will shrink in PR4)
  ...client,

  // Layer 4: ASDF Token (overrides client.js versions)
  getTokenBalance: asdfToken.getTokenBalance,
  getTokenSupply: asdfToken.getSupplyStats,
  getBatchTokenBalances: asdfToken.getBatchTokenBalances,
  getPriorityFeeEstimate: asdfToken.getPriorityFeeEstimate,
  isHolder: asdfToken.isHolder,

  // Layer 4: Burn Tracker (overrides client.js versions)
  buildBurnTransaction: burnTracker.buildBurnTransaction,
  verifyBurnTransaction: burnTracker.verifyBurnTransaction,
  getRecentBurns: burnTracker.getRecentBurns,
  getWalletBurnHistory: burnTracker.getWalletBurnHistory,

  // Constants from config (overrides client.js versions)
  ASDF_TOKEN_MINT: ASDF.MINT,
  TOKEN_DECIMALS: ASDF.DECIMALS,
  MIN_HOLDER_BALANCE: ASDF.MIN_HOLDER_BALANCE,
  PRIORITY_FEE_CONFIG: PRIORITY_FEE,
  redactApiKey,
};
