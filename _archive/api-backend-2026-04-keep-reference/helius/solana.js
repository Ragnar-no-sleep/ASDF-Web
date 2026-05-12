/**
 * Helius RPC Layer — Solana Client (Layer 3)
 *
 * Pure Solana operations using transport.js.
 * Returns RAW blockchain data — no business logic (isHolder, burned, etc.).
 * Defines caching policy per operation.
 *
 * This is what Layer 4 (domain services) imports.
 * This will replace client.js once domain extraction (PR3) is complete.
 *
 * @see docs/ARCH-HELIUS.md Section 11
 */

'use strict';

const { rpcCall, restCall } = require('./transport');
const { CAPABILITIES } = require('./providers');
const { CACHE_TTL, PRIORITY_FEE, CONFIRMATION } = require('./config');

// ==== Reads (cacheable) ====

/**
 * Get SOL balance for an address.
 * @param {string} address
 * @returns {Promise<number>} Balance in lamports
 */
async function getBalance(address) {
  return rpcCall('getBalance', [address], {
    cacheKey: `bal:${address}`,
    cacheTTL: CACHE_TTL.tokenBalance,
  });
}

/**
 * Get token accounts for a wallet + mint.
 * Returns RAW RPC response — business logic (sum, isHolder) is Layer 4.
 * @param {string} walletAddress
 * @param {string} mintAddress
 * @returns {Promise<{value: Array}>}
 */
async function getTokenAccountsByOwner(walletAddress, mintAddress) {
  return rpcCall(
    'getTokenAccountsByOwner',
    [walletAddress, { mint: mintAddress }, { encoding: 'jsonParsed' }],
    { cacheKey: `taccts:${walletAddress}:${mintAddress}`, cacheTTL: CACHE_TTL.tokenBalance }
  );
}

/**
 * Get token supply for a mint.
 * Returns raw supply data — burn math is Layer 4.
 * @param {string} mintAddress
 * @returns {Promise<{amount: string, decimals: number, uiAmount: number}>}
 */
async function getTokenSupply(mintAddress) {
  const result = await rpcCall('getTokenSupply', [mintAddress], {
    cacheKey: `supply:${mintAddress}`,
    cacheTTL: CACHE_TTL.tokenSupply,
  });
  return {
    amount: result.value.amount,
    decimals: result.value.decimals,
    uiAmount: result.value.uiAmount,
  };
}

/**
 * Get dynamic priority fee estimate from Helius.
 * @param {string[]} accountKeys  Accounts involved (for locality-aware fee)
 * @returns {Promise<number>} Fee in microLamports, clamped to [min, max]
 */
async function getPriorityFeeEstimate(accountKeys = []) {
  const result = await rpcCall(
    'getPriorityFeeEstimate',
    [
      {
        accountKeys: accountKeys.length > 0 ? accountKeys : undefined,
        options: { priorityLevel: PRIORITY_FEE.level, recommended: true },
      },
    ],
    {
      capability: CAPABILITIES.PRIORITY,
      cacheKey: 'pfee',
      cacheTTL: CACHE_TTL.priorityFee,
    }
  );

  const fee = result?.priorityFeeEstimate ?? PRIORITY_FEE.default;
  return Math.max(PRIORITY_FEE.min, Math.min(fee, PRIORITY_FEE.max));
}

// ==== DAS API (Helius-only, cacheable) ====

/**
 * Get asset metadata via DAS API.
 * @param {string} assetId
 * @returns {Promise<object>}
 */
async function getAsset(assetId) {
  return rpcCall('getAsset', [{ id: assetId }], {
    capability: CAPABILITIES.DAS,
    cacheKey: `das:${assetId}`,
    cacheTTL: CACHE_TTL.das,
  });
}

/**
 * Get assets owned by an address via DAS API.
 * @param {string} ownerAddress
 * @param {number} page
 * @returns {Promise<object>}
 */
async function getAssetsByOwner(ownerAddress, page = 1) {
  return rpcCall('getAssetsByOwner', [{ ownerAddress, page, limit: 100 }], {
    capability: CAPABILITIES.DAS,
    cacheKey: `dasown:${ownerAddress}:${page}`,
    cacheTTL: CACHE_TTL.dasOwner,
  });
}

// ==== Enhanced Transactions (Helius REST API) ====

/**
 * Get parsed transactions for an address via Helius Enhanced API.
 * @param {string} address
 * @param {object} params  Query params (type, source, etc.)
 * @param {object} cacheOpts  { cacheKey?, cacheTTL? }
 * @returns {Promise<Array>}
 */
async function getEnhancedTransactions(address, params = {}, cacheOpts = {}) {
  return restCall(`/v0/addresses/${address}/transactions`, {
    params,
    ...cacheOpts,
  });
}

// ==== Writes (never cached) ====

/**
 * Submit a signed transaction to the network.
 * @param {string} serializedBase64
 * @returns {Promise<string>} Transaction signature
 */
async function sendTransaction(serializedBase64) {
  return rpcCall('sendTransaction', [
    serializedBase64,
    {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    },
  ]);
}

/**
 * Get a recent blockhash for transaction construction.
 * Unwraps the RPC response to return a flat object.
 * @param {string} commitment
 * @returns {Promise<{blockhash: string, lastValidBlockHeight: number}>}
 */
async function getLatestBlockhash(commitment = 'confirmed') {
  const result = await rpcCall('getLatestBlockhash', [{ commitment }]);
  return {
    blockhash: result.value.blockhash,
    lastValidBlockHeight: Number(result.value.lastValidBlockHeight),
  };
}

// ==== Verification (never cached) ====

/**
 * Get a parsed transaction by signature.
 * Used by burn verification — must always be fresh.
 * @param {string} signature
 * @param {object} opts
 * @returns {Promise<object|null>}
 */
async function getParsedTransaction(signature, opts = {}) {
  const { commitment = 'confirmed' } = opts;
  return rpcCall('getParsedTransaction', [
    signature,
    {
      commitment,
      maxSupportedTransactionVersion: 0,
    },
  ]);
}

/**
 * Get signature status for confirmation polling.
 * @param {string} signature
 * @returns {Promise<object|null>}
 */
async function getSignatureStatus(signature) {
  const result = await rpcCall('getSignatureStatuses', [[signature]]);
  return result.value?.[0] || null;
}

// ==== Confirmation (polling convenience) ====

/**
 * Poll for transaction confirmation.
 * @param {string} signature
 * @param {object} opts  { commitment?, maxAttempts?, delayMs? }
 * @returns {Promise<{confirmed: boolean, slot?: number, error?: string}>}
 */
async function waitForConfirmation(signature, opts = {}) {
  const {
    commitment = CONFIRMATION.commitment,
    maxAttempts = CONFIRMATION.maxAttempts,
    delayMs = CONFIRMATION.delayMs,
  } = opts;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await getSignatureStatus(signature);
      if (status) {
        if (status.err) {
          return { confirmed: false, error: 'Transaction failed on-chain', slot: status.slot };
        }
        const isConfirmed =
          commitment === 'confirmed'
            ? status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized'
            : status.confirmationStatus === 'finalized';
        if (isConfirmed) {
          return {
            confirmed: true,
            slot: status.slot,
            confirmationStatus: status.confirmationStatus,
          };
        }
      }
    } catch {
      // Swallow — will retry on next iteration
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return { confirmed: false, error: 'Confirmation timeout' };
}

// ==== Health ====

/**
 * Get current slot — lightweight health indicator.
 * @returns {Promise<number>}
 */
async function getSlot() {
  return rpcCall('getSlot', []);
}

module.exports = {
  // Reads
  getBalance,
  getTokenAccountsByOwner,
  getTokenSupply,
  getPriorityFeeEstimate,
  // DAS
  getAsset,
  getAssetsByOwner,
  // Enhanced
  getEnhancedTransactions,
  // Writes
  sendTransaction,
  getLatestBlockhash,
  // Verification
  getParsedTransaction,
  getSignatureStatus,
  waitForConfirmation,
  // Health
  getSlot,
};
