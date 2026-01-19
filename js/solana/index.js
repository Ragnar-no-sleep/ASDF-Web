/**
 * ASDF Solana Integration - Main Entry Point
 *
 * Kit-first Solana integration with Wallet Standard multi-wallet support
 *
 * Usage in HTML:
 * ```html
 * <script type="importmap">
 * {
 *   "imports": {
 *     "@solana/kit": "https://esm.sh/@solana/kit@5",
 *     "@solana-program/system": "https://esm.sh/@solana-program/system@0.7",
 *     "@solana-program/token": "https://esm.sh/@solana-program/token@0.5"
 *   }
 * }
 * </script>
 * <script type="module" src="js/solana/index.js"></script>
 * ```
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// IMPORTS
// ============================================

// Kit modules
import { SolanaClient, ASDF_TOKEN_MINT, TOKEN_DECIMALS, solToLamports, lamportsToSol, isValidAddress, address } from './kit/client.js';
import { WalletManager, WALLET_STANDARD_FEATURES } from './kit/wallet-manager.js';
import {
  buildSolTransfer,
  buildTokenTransfer,
  transferSolToTreasury,
  transferAsdfToEscrow,
  transferTokens,
  estimateFee,
  hasSufficientSol,
  hasSufficientAsdf,
  TREASURY_WALLET,
  ESCROW_WALLET
} from './kit/transactions.js';

// Legacy adapter (for backwards compatibility)
import { LegacySolanaPayment, toAddress, toPublicKeyLike } from './web3-compat/adapter.js';

// ============================================
// ASDF SOLANA FACADE
// ============================================

/**
 * Main ASDF Solana API
 * Provides a clean interface to all Solana functionality
 */
const ASDFSolana = {
  /**
   * Initialize Solana integration
   * @param {Object} options
   * @param {string} [options.cluster='mainnet'] - Cluster
   * @param {string} [options.apiKey] - Helius API key
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    console.log('[ASDFSolana] Initializing...');

    // Get API key from config if not provided
    const apiKey = options.apiKey || window.CONFIG?.HELIUS_API_KEY;

    // Initialize RPC client
    await SolanaClient.init({
      cluster: options.cluster || 'mainnet',
      apiKey
    });

    // Initialize wallet manager
    await WalletManager.init();

    console.log('[ASDFSolana] Ready');

    // Expose legacy API for backwards compat
    window.SolanaPayment = LegacySolanaPayment;
  },

  // ============================================
  // WALLET MANAGEMENT
  // ============================================

  /**
   * Get available wallets
   * @returns {Array<{name: string, icon: string}>}
   */
  getWallets() {
    return WalletManager.getWallets();
  },

  /**
   * Connect to a wallet
   * @param {string} walletName - Wallet name (e.g., 'Phantom', 'Backpack')
   * @returns {Promise<{address: string, wallet: string}>}
   */
  async connect(walletName) {
    return await WalletManager.connect(walletName);
  },

  /**
   * Disconnect wallet
   * @returns {Promise<void>}
   */
  async disconnect() {
    return await WalletManager.disconnect();
  },

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return WalletManager.isConnected();
  },

  /**
   * Get connected wallet address
   * @returns {string|null}
   */
  getAddress() {
    return WalletManager.getAddress();
  },

  /**
   * Add wallet event listener
   * @param {'connect'|'disconnect'|'walletsChanged'} event
   * @param {Function} callback
   */
  on(event, callback) {
    WalletManager.on(event, callback);
  },

  /**
   * Remove wallet event listener
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    WalletManager.off(event, callback);
  },

  // ============================================
  // BALANCE QUERIES
  // ============================================

  /**
   * Get SOL balance
   * @param {string} [address] - Address (defaults to connected wallet)
   * @returns {Promise<number>} Balance in SOL
   */
  async getBalanceSOL(address) {
    const addr = address || WalletManager.getAddress();
    if (!addr) throw new Error('No address provided and wallet not connected');
    return await SolanaClient.getBalanceSOL(addr);
  },

  /**
   * Get ASDF token balance
   * @param {string} [address] - Address (defaults to connected wallet)
   * @returns {Promise<number>} Token balance
   */
  async getTokenBalance(address) {
    const addr = address || WalletManager.getAddress();
    if (!addr) throw new Error('No address provided and wallet not connected');
    return await SolanaClient.getTokenBalance(addr);
  },

  // ============================================
  // TRANSACTIONS
  // ============================================

  /**
   * Transfer SOL to treasury
   * @param {number} amountSOL - Amount in SOL
   * @returns {Promise<string>} Transaction signature
   */
  async transferSOL(amountSOL) {
    return await transferSolToTreasury(amountSOL);
  },

  /**
   * Transfer ASDF tokens to escrow
   * @param {number} amount - Token amount
   * @returns {Promise<string>} Transaction signature
   */
  async transferTokens(amount) {
    return await transferAsdfToEscrow(amount);
  },

  /**
   * Transfer tokens to any address
   * @param {string} toAddress - Recipient
   * @param {number} amount - Amount
   * @param {string} [mint] - Token mint (defaults to ASDF)
   * @returns {Promise<string>} Transaction signature
   */
  async transferTokensTo(toAddress, amount, mint) {
    return await transferTokens(toAddress, amount, mint);
  },

  /**
   * Check if user has enough SOL
   * @param {number} amountSOL - Amount needed
   * @returns {Promise<boolean>}
   */
  async hasSufficientSol(amountSOL) {
    return await hasSufficientSol(amountSOL);
  },

  /**
   * Check if user has enough ASDF
   * @param {number} amount - Amount needed
   * @returns {Promise<boolean>}
   */
  async hasSufficientAsdf(amount) {
    return await hasSufficientAsdf(amount);
  },

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Validate a Solana address
   * @param {string} address
   * @returns {boolean}
   */
  isValidAddress(address) {
    return isValidAddress(address);
  },

  /**
   * Get explorer URL for a signature
   * @param {string} signature - Transaction signature
   * @param {'tx'|'address'|'token'} [type='tx']
   * @returns {string}
   */
  getExplorerUrl(signature, type = 'tx') {
    const cluster = SolanaClient.cluster === 'mainnet' ? '' : `?cluster=${SolanaClient.cluster}`;
    return `https://solscan.io/${type}/${signature}${cluster}`;
  },

  // ============================================
  // ADVANCED
  // ============================================

  /**
   * Get the underlying Kit RPC client
   * @returns {Object}
   */
  getRpc() {
    return SolanaClient.getRpc();
  },

  /**
   * Get the WalletManager instance
   * @returns {Object}
   */
  getWalletManager() {
    return WalletManager;
  },

  /**
   * Get latest blockhash
   * @returns {Promise<{blockhash: string, lastValidBlockHeight: bigint}>}
   */
  async getLatestBlockhash() {
    return await SolanaClient.getLatestBlockhash();
  },

  // ============================================
  // CONSTANTS
  // ============================================

  ASDF_TOKEN_MINT,
  TOKEN_DECIMALS,
  TREASURY_WALLET,
  ESCROW_WALLET
};

// ============================================
// GLOBAL EXPORTS
// ============================================

// Export for ES modules
export {
  ASDFSolana,
  SolanaClient,
  WalletManager,
  // Transaction builders
  buildSolTransfer,
  buildTokenTransfer,
  transferSolToTreasury,
  transferAsdfToEscrow,
  transferTokens,
  // Utilities
  solToLamports,
  lamportsToSol,
  isValidAddress,
  address,
  // Legacy compat
  LegacySolanaPayment,
  toAddress,
  toPublicKeyLike
};

// Default export
export default ASDFSolana;

// Expose on window for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDFSolana = ASDFSolana;

  // Auto-init if CONFIG exists
  if (window.CONFIG?.HELIUS_API_KEY) {
    ASDFSolana.init().catch(err => {
      console.error('[ASDFSolana] Auto-init failed:', err);
    });
  }
}
