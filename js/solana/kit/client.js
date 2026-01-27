/**
 * ASDF Solana Kit - RPC Client
 *
 * Kit-first RPC client with Helius support
 * @see https://github.com/anza-xyz/kit
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// IMPORTS (direct from esm.sh CDN)
// ============================================

import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  lamports,
  getBase58Decoder,
  getBase58Encoder
} from 'https://esm.run/@solana/web3.js@2';

// ============================================
// CONFIGURATION
// ============================================

const RPC_CONFIG = {
  // Helius mainnet (API key loaded from env/config)
  mainnet: {
    http: 'https://mainnet.helius-rpc.com/?api-key=',
    ws: 'wss://mainnet.helius-rpc.com/?api-key='
  },
  // Devnet for testing
  devnet: {
    http: 'https://api.devnet.solana.com',
    ws: 'wss://api.devnet.solana.com'
  },
  // Local validator
  local: {
    http: 'http://127.0.0.1:8899',
    ws: 'ws://127.0.0.1:8900'
  }
};

// ASDF Token mint address
const ASDF_TOKEN_MINT = '9zB5wRarXMj86MymwLumSKA1Dx35zPqqKfcZtK1Spump';
const TOKEN_DECIMALS = 6;

// ============================================
// SOLANA CLIENT
// ============================================

/**
 * ASDF Solana Client (Kit-based)
 * Singleton pattern for app-wide RPC access
 */
const SolanaClient = {
  /** @type {ReturnType<typeof createSolanaRpc> | null} */
  rpc: null,

  /** @type {ReturnType<typeof createSolanaRpcSubscriptions> | null} */
  subscriptions: null,

  /** Current cluster */
  cluster: 'mainnet',

  /** API key for Helius */
  apiKey: null,

  /**
   * Initialize the Solana client
   * @param {Object} options
   * @param {string} [options.cluster='mainnet'] - Cluster to connect to
   * @param {string} [options.apiKey] - Helius API key (required for mainnet)
   * @param {string} [options.customRpcUrl] - Custom RPC URL (overrides cluster)
   * @returns {Promise<void>}
   */
  async init(options = {}) {
    const { cluster = 'mainnet', apiKey, customRpcUrl } = options;

    this.cluster = cluster;
    this.apiKey = apiKey;

    // Determine RPC URL
    let httpUrl, wsUrl;

    if (customRpcUrl) {
      httpUrl = customRpcUrl;
      wsUrl = customRpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    } else if (cluster === 'mainnet' && apiKey) {
      httpUrl = RPC_CONFIG.mainnet.http + apiKey;
      wsUrl = RPC_CONFIG.mainnet.ws + apiKey;
    } else {
      const config = RPC_CONFIG[cluster] || RPC_CONFIG.devnet;
      httpUrl = config.http;
      wsUrl = config.ws;
    }

    // Create RPC client
    this.rpc = createSolanaRpc(httpUrl);

    // Create subscriptions client for WebSocket
    try {
      this.subscriptions = createSolanaRpcSubscriptions(wsUrl);
    } catch (e) {
      console.warn('[SolanaClient] WebSocket subscriptions not available:', e.message);
      this.subscriptions = null;
    }

    console.log(`[SolanaClient] Initialized on ${cluster}`);
  },

  /**
   * Get current slot
   * @returns {Promise<bigint>}
   */
  async getSlot() {
    if (!this.rpc) throw new Error('SolanaClient not initialized');
    return await this.rpc.getSlot().send();
  },

  /**
   * Get SOL balance for an address
   * @param {string} addressStr - Base58 address string
   * @returns {Promise<bigint>} Balance in lamports
   */
  async getBalance(addressStr) {
    if (!this.rpc) throw new Error('SolanaClient not initialized');
    const addr = address(addressStr);
    const result = await this.rpc.getBalance(addr).send();
    return result.value;
  },

  /**
   * Get SOL balance formatted
   * @param {string} addressStr - Base58 address string
   * @returns {Promise<number>} Balance in SOL
   */
  async getBalanceSOL(addressStr) {
    const balanceLamports = await this.getBalance(addressStr);
    return Number(balanceLamports) / 1e9;
  },

  /**
   * Get recent blockhash
   * @returns {Promise<{blockhash: string, lastValidBlockHeight: bigint}>}
   */
  async getLatestBlockhash() {
    if (!this.rpc) throw new Error('SolanaClient not initialized');
    const result = await this.rpc.getLatestBlockhash().send();
    return result.value;
  },

  /**
   * Get account info
   * @param {string} addressStr - Base58 address string
   * @returns {Promise<Object|null>}
   */
  async getAccountInfo(addressStr) {
    if (!this.rpc) throw new Error('SolanaClient not initialized');
    const addr = address(addressStr);
    const result = await this.rpc.getAccountInfo(addr, { encoding: 'base64' }).send();
    return result.value;
  },

  /**
   * Get token balance for ASDF token
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<number>} Token balance (decimal adjusted)
   */
  async getTokenBalance(walletAddress) {
    if (!this.rpc) throw new Error('SolanaClient not initialized');

    // Get token accounts for this wallet
    const result = await this.rpc.getTokenAccountsByOwner(
      address(walletAddress),
      { mint: address(ASDF_TOKEN_MINT) },
      { encoding: 'jsonParsed' }
    ).send();

    if (!result.value || result.value.length === 0) {
      return 0;
    }

    // Sum all token account balances (usually just one)
    let total = 0;
    for (const account of result.value) {
      const info = account.account.data.parsed?.info;
      if (info?.tokenAmount?.uiAmount) {
        total += info.tokenAmount.uiAmount;
      }
    }

    return total;
  },

  /**
   * Send and confirm a transaction
   * @param {Uint8Array} signedTransaction - Signed transaction bytes
   * @returns {Promise<string>} Transaction signature
   */
  async sendTransaction(signedTransaction) {
    if (!this.rpc) throw new Error('SolanaClient not initialized');

    const signature = await this.rpc.sendTransaction(signedTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    }).send();

    return signature;
  },

  /**
   * Confirm a transaction
   * @param {string} signature - Transaction signature
   * @param {Object} blockhashContext - Blockhash and lastValidBlockHeight
   * @returns {Promise<{err: any}>}
   */
  async confirmTransaction(signature, blockhashContext) {
    if (!this.rpc) throw new Error('SolanaClient not initialized');

    // Poll for confirmation
    const maxRetries = 30;
    const retryDelay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      const result = await this.rpc.getSignatureStatuses([signature]).send();
      const status = result.value[0];

      if (status) {
        if (status.err) {
          return { err: status.err };
        }
        if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
          return { err: null };
        }
      }

      // Check if blockhash expired
      const currentSlot = await this.getSlot();
      if (blockhashContext?.lastValidBlockHeight && currentSlot > blockhashContext.lastValidBlockHeight) {
        return { err: 'BlockhashExpired' };
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }

    return { err: 'ConfirmationTimeout' };
  },

  /**
   * Get RPC instance (for advanced usage)
   * @returns {ReturnType<typeof createSolanaRpc>}
   */
  getRpc() {
    if (!this.rpc) throw new Error('SolanaClient not initialized');
    return this.rpc;
  }
};

// ============================================
// UTILITY EXPORTS
// ============================================

/**
 * Convert SOL to lamports
 * @param {number} sol - Amount in SOL
 * @returns {bigint} Amount in lamports
 */
export function solToLamports(sol) {
  return BigInt(Math.round(sol * 1e9));
}

/**
 * Convert lamports to SOL
 * @param {bigint|number} lamps - Amount in lamports
 * @returns {number} Amount in SOL
 */
export function lamportsToSol(lamps) {
  return Number(lamps) / 1e9;
}

/**
 * Validate a Solana address
 * @param {string} addressStr - Address to validate
 * @returns {boolean}
 */
export function isValidAddress(addressStr) {
  try {
    if (!addressStr || typeof addressStr !== 'string') return false;
    if (addressStr.length < 32 || addressStr.length > 44) return false;

    // Try to decode as base58
    const decoder = getBase58Decoder();
    const bytes = decoder.decode(addressStr);
    return bytes.length === 32;
  } catch {
    return false;
  }
}

// ============================================
// EXPORTS
// ============================================

export { SolanaClient, ASDF_TOKEN_MINT, TOKEN_DECIMALS };
export { address, lamports } from 'https://esm.run/@solana/web3.js@2';

// Default export
export default SolanaClient;
