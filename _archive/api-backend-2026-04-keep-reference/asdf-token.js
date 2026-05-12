/**
 * ASDF Token Domain Service (Layer 4)
 *
 * Business logic for ASDF token operations.
 * Uses solana.js (Layer 3) — never touches transport or URLs.
 *
 * Shape contracts (backwards-compatible with client.js):
 *   getTokenBalance  → { balance: number, rawBalance: string, isHolder: boolean }
 *   getSupplyStats   → { current, currentRaw, burned, burnedRaw }
 *   getBatchTokenBalances → Map<string, {balance, rawBalance, isHolder}>
 *
 * @see docs/ARCH-HELIUS.md Section 12
 */

'use strict';

const solana = require('./helius/solana');
const { ASDF } = require('./helius/config');

/**
 * Get token balance + holder status for a wallet.
 * Business rule: holder = balance >= MIN_HOLDER_BALANCE.
 *
 * @param {string} walletAddress
 * @returns {Promise<{balance: number, rawBalance: string, isHolder: boolean}>}
 */
async function getTokenBalance(walletAddress) {
  const result = await solana.getTokenAccountsByOwner(walletAddress, ASDF.MINT);

  let totalRaw = 0n;
  for (const acct of result.value || []) {
    const amount = acct.account?.data?.parsed?.info?.tokenAmount?.amount;
    if (amount) totalRaw += BigInt(amount);
  }

  const balance = Number(totalRaw) / 10 ** ASDF.DECIMALS;
  return {
    balance,
    rawBalance: totalRaw.toString(),
    isHolder: balance >= ASDF.MIN_HOLDER_BALANCE,
  };
}

/**
 * Check if a wallet holds the minimum ASDF balance.
 * @param {string} walletAddress
 * @returns {Promise<boolean>}
 */
async function isHolder(walletAddress) {
  const { isHolder: holds } = await getTokenBalance(walletAddress);
  return holds;
}

/**
 * Get supply stats with burn calculation.
 *
 * Return shape matches client.js getTokenSupply:
 *   { current, currentRaw, burned, burnedRaw }
 *
 * @returns {Promise<{current: number, currentRaw: string, burned: number, burnedRaw: string}>}
 */
async function getSupplyStats() {
  const supply = await solana.getTokenSupply(ASDF.MINT);
  const current = supply.uiAmount;
  const initial = ASDF.INITIAL_SUPPLY;
  const burned = initial - current;

  return {
    current,
    currentRaw: supply.amount,
    burned,
    burnedRaw: String(Math.floor(burned * 10 ** ASDF.DECIMALS)),
  };
}

/**
 * Batch holder status with concurrency limit.
 * @param {string[]} walletAddresses
 * @returns {Promise<Map<string, {balance, rawBalance, isHolder}>>}
 */
async function getBatchTokenBalances(walletAddresses) {
  const results = new Map();
  const BATCH = 5; // Fibonacci concurrency

  for (let i = 0; i < walletAddresses.length; i += BATCH) {
    const batch = walletAddresses.slice(i, i + BATCH);
    const settled = await Promise.allSettled(batch.map(w => getTokenBalance(w)));
    settled.forEach((r, idx) => {
      results.set(
        batch[idx],
        r.status === 'fulfilled'
          ? r.value
          : { balance: 0, rawBalance: '0', isHolder: false, error: r.reason.message }
      );
    });
  }
  return results;
}

/**
 * Get priority fee (passthrough to solana.js for route convenience).
 * @param {string[]} accountKeys
 * @returns {Promise<number>}
 */
async function getPriorityFeeEstimate(accountKeys) {
  return solana.getPriorityFeeEstimate(accountKeys);
}

module.exports = {
  getTokenBalance,
  isHolder,
  getSupplyStats,
  getBatchTokenBalances,
  getPriorityFeeEstimate,
};
