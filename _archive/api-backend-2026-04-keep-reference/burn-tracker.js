/**
 * Burn Tracker Domain Service (Layer 4)
 *
 * Business logic for ASDF burn operations.
 * Uses solana.js (Layer 3) for RPC, @solana/web3.js for tx construction.
 *
 * Shape contracts (backwards-compatible with client.js):
 *   buildBurnTransaction   → { transaction: base64, blockhash, lastValidBlockHeight, priorityFee }
 *   verifyBurnTransaction  → { valid, actualAmount?, signature?, slot?, blockTime?, error? }
 *   getRecentBurns         → Array<{ signature, wallet, amount, timestamp, slot }>
 *   getWalletBurnHistory   → { burns: Array, totalBurned, burnCount }
 *
 * @see docs/ARCH-HELIUS.md Section 13
 */

'use strict';

const { PublicKey, Transaction, ComputeBudgetProgram } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createBurnInstruction } = require('@solana/spl-token');
const solana = require('./helius/solana');
const { ASDF } = require('./helius/config');
const cache = require('./helius/middleware/cache');

/**
 * Build an unsigned burn transaction for the user to sign client-side.
 * @param {string} walletAddress
 * @param {number} amount  UI amount (not raw)
 * @returns {Promise<{transaction: string, blockhash: string, lastValidBlockHeight: number, priorityFee: number}>}
 */
async function buildBurnTransaction(walletAddress, amount) {
  const wallet = new PublicKey(walletAddress);
  const mint = new PublicKey(ASDF.MINT);
  const tokenAccount = await getAssociatedTokenAddress(mint, wallet);

  // Parallel: blockhash + priority fee
  const [blockInfo, priorityFee] = await Promise.all([
    solana.getLatestBlockhash(),
    solana.getPriorityFeeEstimate([mint.toBase58(), tokenAccount.toBase58()]),
  ]);

  const rawAmount = BigInt(Math.floor(amount * 10 ** ASDF.DECIMALS));

  const transaction = new Transaction({
    feePayer: wallet,
    blockhash: blockInfo.blockhash,
    lastValidBlockHeight: blockInfo.lastValidBlockHeight,
  });

  // Order: compute limit, priority fee, burn
  transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }));
  transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }));
  transaction.add(createBurnInstruction(tokenAccount, mint, wallet, rawAmount));

  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return {
    transaction: serialized.toString('base64'),
    blockhash: blockInfo.blockhash,
    lastValidBlockHeight: blockInfo.lastValidBlockHeight,
    priorityFee,
  };
}

/**
 * Verify a burn transaction on-chain.
 * @param {string} signature
 * @param {string} expectedWallet
 * @param {number} expectedAmount  UI amount
 * @returns {Promise<{valid: boolean, actualAmount?: number, error?: string}>}
 */
async function verifyBurnTransaction(signature, expectedWallet, expectedAmount) {
  const tx = await solana.getParsedTransaction(signature);

  if (!tx) {
    throw new Error('Transaction not found - may still be processing');
  }

  if (tx.meta?.err) {
    return { valid: false, error: 'Transaction failed on-chain' };
  }

  // Find burn instruction
  const instructions = tx.transaction.message.instructions;
  const burnIx = instructions.find(ix => ix.program === 'spl-token' && ix.parsed?.type === 'burn');

  if (!burnIx) {
    return { valid: false, error: 'No burn instruction found' };
  }

  const info = burnIx.parsed.info;

  // Security: verify mint
  if (info.mint !== ASDF.MINT) {
    return { valid: false, error: 'Wrong token mint' };
  }

  // Security: verify authority
  if (info.authority !== expectedWallet) {
    return { valid: false, error: 'Wrong wallet' };
  }

  // Verify amount with tolerance
  const actualAmount = Number(info.amount) / 10 ** ASDF.DECIMALS;
  if (Math.abs(actualAmount - expectedAmount) > 0.000001) {
    return {
      valid: false,
      error: 'Amount mismatch',
      actualAmount,
      expectedAmount,
    };
  }

  // Invalidate cached balance for this wallet (they just burned)
  cache.invalidate(`taccts:${expectedWallet}`);

  return {
    valid: true,
    actualAmount,
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
  };
}

/**
 * Get recent burns via Helius Enhanced Transactions API.
 * @param {number} limit
 * @returns {Promise<Array<{signature, wallet, amount, timestamp, slot}>>}
 */
async function getRecentBurns(limit = 20) {
  const txs = await solana.getEnhancedTransactions(
    ASDF.MINT,
    { type: 'BURN' },
    {
      cacheKey: `burns:${limit}`,
      cacheTTL: 120_000,
    }
  );

  return txs.slice(0, limit).map(tx => ({
    signature: tx.signature,
    wallet: tx.feePayer,
    amount: tx.tokenTransfers?.[0]?.tokenAmount || 0,
    timestamp: tx.timestamp,
    slot: tx.slot,
  }));
}

/**
 * Get burn history for a specific wallet.
 * @param {string} walletAddress
 * @param {number} limit
 * @returns {Promise<{burns: Array, totalBurned: number, burnCount: number}>}
 */
async function getWalletBurnHistory(walletAddress, limit = 50) {
  const txs = await solana.getEnhancedTransactions(
    walletAddress,
    { type: 'BURN' },
    {
      cacheKey: `burnhist:${walletAddress}`,
      cacheTTL: 300_000,
    }
  );

  // Filter for ASDF token burns only
  const asdfBurns = txs.filter(tx =>
    tx.tokenTransfers?.some(t => t.mint === ASDF.MINT && t.tokenAmount < 0)
  );

  const burns = asdfBurns.slice(0, limit).map(tx => {
    const transfer = tx.tokenTransfers.find(t => t.mint === ASDF.MINT);
    return {
      signature: tx.signature,
      amount: Math.abs(transfer?.tokenAmount || 0),
      timestamp: tx.timestamp,
      slot: tx.slot,
    };
  });

  return {
    burns,
    totalBurned: burns.reduce((sum, b) => sum + b.amount, 0),
    burnCount: burns.length,
  };
}

module.exports = {
  buildBurnTransaction,
  verifyBurnTransaction,
  getRecentBurns,
  getWalletBurnHistory,
};
