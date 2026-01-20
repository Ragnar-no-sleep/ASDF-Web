/**
 * ASDF Solana - Web3.js Compatibility Adapter
 *
 * Bridge between legacy web3.js code and new Kit implementation
 * Use this for gradual migration or when legacy libs require web3.js types
 *
 * @version 1.0.0
 */

'use strict';

import { SolanaClient } from '../kit/client.js';
import { WalletManager } from '../kit/wallet-manager.js';
import {
  transferSolToTreasury,
  transferAsdfToEscrow,
  transferTokens,
  TREASURY_WALLET,
  ESCROW_WALLET
} from '../kit/transactions.js';

// ============================================
// LEGACY API SHIM
// ============================================

/**
 * Legacy SolanaPayment API (compatible with js/games/solana.js)
 * Maps old API calls to new Kit implementation
 */
const LegacySolanaPayment = {
  connection: null,
  _initialized: false,

  /**
   * Get connection (legacy API)
   * Note: This returns a shim, not a real Connection object
   * @returns {Object}
   */
  getConnection() {
    if (!SolanaClient.rpc) {
      console.warn('[LegacyAdapter] SolanaClient not initialized, call SolanaPayment.init() first');
      return null;
    }
    // Return a shim that proxies to Kit
    return {
      _isKitShim: true,
      getLatestBlockhash: async () => SolanaClient.getLatestBlockhash(),
      getBalance: async (pubkey) => {
        const addr = typeof pubkey === 'string' ? pubkey : pubkey.toString();
        return await SolanaClient.getBalance(addr);
      },
      getAccountInfo: async (pubkey) => {
        const addr = typeof pubkey === 'string' ? pubkey : pubkey.toString();
        return await SolanaClient.getAccountInfo(addr);
      },
      confirmTransaction: async (signature, blockhash) => {
        return await SolanaClient.confirmTransaction(signature, blockhash);
      }
    };
  },

  /**
   * Get Phantom provider (legacy API)
   * Now returns the connected wallet's provider
   * @returns {Object|null}
   */
  getProvider() {
    if (!WalletManager.isConnected()) {
      // Fallback to legacy detection for backwards compat
      if (typeof window.phantom?.solana !== 'undefined') {
        return window.phantom.solana;
      }
      if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
        return window.solana;
      }
      return null;
    }

    // Return a shim that uses WalletManager
    return {
      _isKitShim: true,
      publicKey: WalletManager.connectedAccount?.publicKey || {
        toString: () => WalletManager.getAddress()
      },
      isConnected: WalletManager.isConnected(),
      connect: async () => {
        // Try to connect to first available wallet
        const wallets = WalletManager.getWallets();
        if (wallets.length === 0) throw new Error('No wallets found');
        return await WalletManager.connect(wallets[0].name);
      },
      disconnect: async () => WalletManager.disconnect(),
      signTransaction: async (tx) => WalletManager.signTransaction(tx),
      signAndSendTransaction: async (tx) => WalletManager.signAndSendTransaction(tx),
      signMessage: async (msg) => WalletManager.signMessage(msg)
    };
  },

  /**
   * Transfer SOL (legacy API)
   * @param {number} amountSOL - Amount in SOL
   * @returns {Promise<string>} Transaction signature
   */
  async transferSOL(amountSOL) {
    return await transferSolToTreasury(amountSOL);
  },

  /**
   * Transfer tokens (legacy API)
   * @param {number} amount - Token amount
   * @param {string} [destinationWallet] - Destination (defaults to escrow)
   * @returns {Promise<string>} Transaction signature
   */
  async transferTokens(amount, destinationWallet = ESCROW_WALLET) {
    if (destinationWallet === ESCROW_WALLET) {
      return await transferAsdfToEscrow(amount);
    }
    return await transferTokens(destinationWallet, amount);
  },

  // Legacy methods that are no longer needed but kept for API compat
  getTokenProgramId() {
    console.warn('[LegacyAdapter] getTokenProgramId() is deprecated');
    return { toString: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' };
  },

  getAssociatedTokenProgramId() {
    console.warn('[LegacyAdapter] getAssociatedTokenProgramId() is deprecated');
    return { toString: () => 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' };
  },

  async getAssociatedTokenAddress() {
    console.warn('[LegacyAdapter] getAssociatedTokenAddress() is deprecated, use Kit directly');
    throw new Error('Use Kit transactions.js for ATA operations');
  },

  createAssociatedTokenAccountInstruction() {
    console.warn('[LegacyAdapter] createAssociatedTokenAccountInstruction() is deprecated');
    throw new Error('Use Kit transactions.js for instruction building');
  },

  createTransferInstruction() {
    console.warn('[LegacyAdapter] createTransferInstruction() is deprecated');
    throw new Error('Use Kit transactions.js for instruction building');
  }
};

// ============================================
// TYPE CONVERSIONS
// ============================================

/**
 * Convert web3.js PublicKey to Kit address string
 * @param {Object} publicKey - web3.js PublicKey
 * @returns {string} Address string
 */
export function toAddress(publicKey) {
  if (typeof publicKey === 'string') return publicKey;
  if (publicKey?.toString) return publicKey.toString();
  throw new Error('Invalid publicKey');
}

/**
 * Convert Kit address string to legacy PublicKey-like object
 * @param {string} addressStr - Address string
 * @returns {Object} PublicKey-like object
 */
export function toPublicKeyLike(addressStr) {
  return {
    toString: () => addressStr,
    toBase58: () => addressStr,
    toBuffer: () => {
      // Decode base58 to buffer (simplified)
      console.warn('[LegacyAdapter] toBuffer() called - consider using Kit directly');
      return new Uint8Array(32); // Placeholder
    },
    equals: (other) => addressStr === toAddress(other)
  };
}

/**
 * Convert lamports to SOL (legacy helper)
 * @param {number|bigint} lamports
 * @returns {number}
 */
export function lamportsToSol(lamports) {
  return Number(lamports) / 1e9;
}

/**
 * Convert SOL to lamports (legacy helper)
 * @param {number} sol
 * @returns {number}
 */
export function solToLamports(sol) {
  return Math.round(sol * 1e9);
}

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Check if code is using legacy API
 * @returns {boolean}
 */
export function isUsingLegacyApi() {
  return typeof window.solanaWeb3 !== 'undefined';
}

/**
 * Log migration warning
 * @param {string} feature - Feature being used
 */
export function logMigrationWarning(feature) {
  console.warn(
    `[LegacyAdapter] "${feature}" is using legacy web3.js patterns. ` +
    `Consider migrating to Kit: js/solana/kit/`
  );
}

// ============================================
// EXPORTS
// ============================================

export {
  LegacySolanaPayment,
  TREASURY_WALLET,
  ESCROW_WALLET
};

// Default export for drop-in replacement
export default LegacySolanaPayment;
