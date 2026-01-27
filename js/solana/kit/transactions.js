/**
 * ASDF Solana Kit - Transaction Builders
 *
 * Kit-native transaction construction for SOL and SPL transfers
 * Uses @solana-program/* for instruction building
 *
 * @version 1.0.0
 */

'use strict';

import {
  address,
  lamports,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstruction,
  compileTransaction,
  getBase64Encoder,
  pipe
} from 'https://esm.sh/@solana/kit@5';

// System Program for SOL transfers
import { getTransferSolInstruction } from 'https://esm.sh/@solana-program/system@0.7';

// Token Program for SPL transfers
import {
  getTransferInstruction,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  TOKEN_PROGRAM_ADDRESS
} from 'https://esm.sh/@solana-program/token@0.5';

import { SolanaClient, ASDF_TOKEN_MINT, TOKEN_DECIMALS, solToLamports } from './client.js';
import { WalletManager } from './wallet-manager.js';

// ============================================
// CONFIGURATION
// ============================================

// Treasury wallet for payments
const TREASURY_WALLET = '5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa';

// Escrow wallet for token operations
const ESCROW_WALLET = 'AR3Rcr8o4iZwGwTUG5LEx7uhcenCCZNrbgkLrjVC1v6y';

// ============================================
// SOL TRANSFER
// ============================================

/**
 * Build a SOL transfer transaction
 * @param {Object} params
 * @param {string} params.from - Sender address
 * @param {string} params.to - Recipient address
 * @param {number} params.amountSOL - Amount in SOL
 * @returns {Promise<Object>} Transaction ready for signing
 */
export async function buildSolTransfer({ from, to, amountSOL }) {
  const rpc = SolanaClient.getRpc();
  const { blockhash, lastValidBlockHeight } = await SolanaClient.getLatestBlockhash();

  const fromAddr = address(from);
  const toAddr = address(to);
  const amountLamports = solToLamports(amountSOL);

  // Build the transfer instruction
  const transferIx = getTransferSolInstruction({
    source: fromAddr,
    destination: toAddr,
    amount: amountLamports
  });

  // Create transaction message
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(fromAddr, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx),
    tx => appendTransactionMessageInstruction(transferIx, tx)
  );

  return {
    message,
    blockhash,
    lastValidBlockHeight
  };
}

/**
 * Transfer SOL to treasury
 * @param {number} amountSOL - Amount in SOL
 * @returns {Promise<string>} Transaction signature
 */
export async function transferSolToTreasury(amountSOL) {
  if (!WalletManager.isConnected()) {
    throw new Error('Wallet not connected');
  }

  const from = WalletManager.getAddress();
  const { message, blockhash, lastValidBlockHeight } = await buildSolTransfer({
    from,
    to: TREASURY_WALLET,
    amountSOL
  });

  // Sign and send via wallet
  const { signature } = await WalletManager.signAndSendTransaction(message);

  // Confirm
  const confirmation = await SolanaClient.confirmTransaction(signature, { blockhash, lastValidBlockHeight });

  if (confirmation.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.err)}`);
  }

  return signature;
}

// ============================================
// SPL TOKEN TRANSFER
// ============================================

/**
 * Build an SPL token transfer transaction
 * @param {Object} params
 * @param {string} params.from - Sender wallet address
 * @param {string} params.to - Recipient wallet address
 * @param {string} params.mint - Token mint address
 * @param {number} params.amount - Amount in token units (decimal adjusted)
 * @param {number} [params.decimals=6] - Token decimals
 * @returns {Promise<Object>} Transaction ready for signing
 */
export async function buildTokenTransfer({ from, to, mint, amount, decimals = TOKEN_DECIMALS }) {
  const rpc = SolanaClient.getRpc();
  const { blockhash, lastValidBlockHeight } = await SolanaClient.getLatestBlockhash();

  const fromAddr = address(from);
  const toAddr = address(to);
  const mintAddr = address(mint);
  const rawAmount = BigInt(Math.round(amount * Math.pow(10, decimals)));

  // Find Associated Token Accounts (ATAs)
  const [fromAta] = await findAssociatedTokenPda({
    owner: fromAddr,
    mint: mintAddr,
    tokenProgram: TOKEN_PROGRAM_ADDRESS
  });

  const [toAta] = await findAssociatedTokenPda({
    owner: toAddr,
    mint: mintAddr,
    tokenProgram: TOKEN_PROGRAM_ADDRESS
  });

  // Start building transaction message
  let message = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayer(fromAddr, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight }, tx)
  );

  // Check if destination ATA exists, create if not
  const toAtaInfo = await SolanaClient.getAccountInfo(toAta.toString());
  if (!toAtaInfo) {
    // Create ATA instruction (idempotent - won't fail if already exists)
    const createAtaIx = getCreateAssociatedTokenIdempotentInstruction({
      payer: fromAddr,
      owner: toAddr,
      mint: mintAddr,
      ata: toAta
    });
    message = appendTransactionMessageInstruction(createAtaIx, message);
  }

  // Add transfer instruction
  const transferIx = getTransferInstruction({
    source: fromAta,
    destination: toAta,
    authority: fromAddr,
    amount: rawAmount
  });
  message = appendTransactionMessageInstruction(transferIx, message);

  return {
    message,
    blockhash,
    lastValidBlockHeight
  };
}

/**
 * Transfer ASDF tokens to escrow
 * @param {number} amount - Amount in ASDF tokens
 * @returns {Promise<string>} Transaction signature
 */
export async function transferAsdfToEscrow(amount) {
  if (!WalletManager.isConnected()) {
    throw new Error('Wallet not connected');
  }

  const from = WalletManager.getAddress();
  const { message, blockhash, lastValidBlockHeight } = await buildTokenTransfer({
    from,
    to: ESCROW_WALLET,
    mint: ASDF_TOKEN_MINT,
    amount,
    decimals: TOKEN_DECIMALS
  });

  // Sign and send via wallet
  const { signature } = await WalletManager.signAndSendTransaction(message);

  // Confirm
  const confirmation = await SolanaClient.confirmTransaction(signature, { blockhash, lastValidBlockHeight });

  if (confirmation.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.err)}`);
  }

  return signature;
}

/**
 * Transfer tokens to any address
 * @param {string} toAddress - Recipient wallet address
 * @param {number} amount - Amount in tokens
 * @param {string} [mintAddress] - Token mint (defaults to ASDF)
 * @returns {Promise<string>} Transaction signature
 */
export async function transferTokens(toAddress, amount, mintAddress = ASDF_TOKEN_MINT) {
  if (!WalletManager.isConnected()) {
    throw new Error('Wallet not connected');
  }

  const from = WalletManager.getAddress();
  const { message, blockhash, lastValidBlockHeight } = await buildTokenTransfer({
    from,
    to: toAddress,
    mint: mintAddress,
    amount,
    decimals: TOKEN_DECIMALS
  });

  // Sign and send via wallet
  const { signature } = await WalletManager.signAndSendTransaction(message);

  // Confirm
  const confirmation = await SolanaClient.confirmTransaction(signature, { blockhash, lastValidBlockHeight });

  if (confirmation.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.err)}`);
  }

  return signature;
}

// ============================================
// TRANSACTION HELPERS
// ============================================

/**
 * Estimate transaction fee
 * @param {Object} message - Transaction message
 * @returns {Promise<number>} Fee in SOL
 */
export async function estimateFee(message) {
  try {
    const rpc = SolanaClient.getRpc();
    const compiled = compileTransaction(message);
    const feeResult = await rpc.getFeeForMessage(compiled).send();
    return feeResult.value ? Number(feeResult.value) / 1e9 : 0.000005; // Default 5000 lamports
  } catch {
    return 0.000005; // Fallback estimate
  }
}

/**
 * Check if user has sufficient SOL for transaction
 * @param {number} amountSOL - Amount being sent
 * @param {number} [feeBuffer=0.001] - Buffer for fees in SOL
 * @returns {Promise<boolean>}
 */
export async function hasSufficientSol(amountSOL, feeBuffer = 0.001) {
  if (!WalletManager.isConnected()) return false;

  const balance = await SolanaClient.getBalanceSOL(WalletManager.getAddress());
  return balance >= (amountSOL + feeBuffer);
}

/**
 * Check if user has sufficient ASDF tokens
 * @param {number} amount - Amount being sent
 * @returns {Promise<boolean>}
 */
export async function hasSufficientAsdf(amount) {
  if (!WalletManager.isConnected()) return false;

  const balance = await SolanaClient.getTokenBalance(WalletManager.getAddress());
  return balance >= amount;
}

// ============================================
// EXPORTS
// ============================================

export {
  TREASURY_WALLET,
  ESCROW_WALLET
};

export default {
  buildSolTransfer,
  buildTokenTransfer,
  transferSolToTreasury,
  transferAsdfToEscrow,
  transferTokens,
  estimateFee,
  hasSufficientSol,
  hasSufficientAsdf
};
