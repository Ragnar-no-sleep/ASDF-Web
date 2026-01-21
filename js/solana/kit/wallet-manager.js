/**
 * ASDF Solana Kit - Wallet Manager
 *
 * Wallet Standard implementation for multi-wallet support
 * Supports: Phantom, Backpack, Solflare, and any Wallet Standard compliant wallet
 *
 * @version 1.0.0
 */

'use strict';

import { address } from 'https://esm.sh/@solana/kit@5';

// ============================================
// WALLET STANDARD FEATURE DETECTION
// ============================================

const WALLET_STANDARD_FEATURES = {
  CONNECT: 'standard:connect',
  DISCONNECT: 'standard:disconnect',
  EVENTS: 'standard:events',
  SIGN_MESSAGE: 'solana:signMessage',
  SIGN_TRANSACTION: 'solana:signTransaction',
  SIGN_AND_SEND: 'solana:signAndSendTransaction'
};

// ============================================
// WALLET MANAGER
// ============================================

/**
 * Multi-wallet manager using Wallet Standard
 * Auto-discovers all installed wallets
 */
const WalletManager = {
  /** @type {Map<string, Object>} Discovered wallets */
  wallets: new Map(),

  /** @type {Object|null} Currently connected wallet */
  connectedWallet: null,

  /** @type {Object|null} Currently connected account */
  connectedAccount: null,

  /** @type {Function[]} Event listeners */
  listeners: [],

  /** @type {boolean} Initialization state */
  initialized: false,

  /**
   * Initialize wallet manager and discover wallets
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    // Wait for wallets to register (they may load async)
    await this._waitForWallets();

    // Discover all registered wallets
    this._discoverWallets();

    // Listen for new wallet registrations
    this._listenForWalletChanges();

    this.initialized = true;
    console.log(`[WalletManager] Initialized, found ${this.wallets.size} wallets`);

    // Try to reconnect from previous session
    await this._tryAutoReconnect();
  },

  /**
   * Wait for wallets to register (browser extension loading)
   * @private
   */
  async _waitForWallets() {
    // Wallets register on window.navigator.wallets or via get/register pattern
    const maxWait = 2000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (this._hasWalletStandard()) {
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  },

  /**
   * Check if Wallet Standard is available
   * @private
   */
  _hasWalletStandard() {
    return typeof window !== 'undefined' && (
      window.navigator?.wallets ||
      window.solana ||
      window.phantom?.solana ||
      window.backpack
    );
  },

  /**
   * Discover all available wallets
   * @private
   */
  _discoverWallets() {
    this.wallets.clear();

    // Check for Wallet Standard wallets array
    if (window.navigator?.wallets) {
      for (const wallet of window.navigator.wallets) {
        if (this._isValidWallet(wallet)) {
          this.wallets.set(wallet.name, wallet);
        }
      }
    }

    // Fallback: Check for individual wallet globals
    // Phantom
    if (window.phantom?.solana || window.solana?.isPhantom) {
      const phantom = window.phantom?.solana || window.solana;
      this.wallets.set('Phantom', this._wrapLegacyWallet('Phantom', phantom, 'https://phantom.app/img/logo.png'));
    }

    // Backpack
    if (window.backpack) {
      this.wallets.set('Backpack', this._wrapLegacyWallet('Backpack', window.backpack, 'https://backpack.app/logo.png'));
    }

    // Solflare
    if (window.solflare?.isSolflare) {
      this.wallets.set('Solflare', this._wrapLegacyWallet('Solflare', window.solflare, 'https://solflare.com/favicon.ico'));
    }

    // Glow
    if (window.glow) {
      this.wallets.set('Glow', this._wrapLegacyWallet('Glow', window.glow, 'https://glow.app/favicon.ico'));
    }
  },

  /**
   * Wrap a legacy wallet (pre-Wallet Standard) in standard interface
   * @private
   */
  _wrapLegacyWallet(name, provider, iconUrl) {
    return {
      name,
      icon: iconUrl,
      provider,
      features: {
        [WALLET_STANDARD_FEATURES.CONNECT]: {
          connect: async () => {
            const resp = await provider.connect();
            return [{
              address: resp.publicKey.toString(),
              publicKey: resp.publicKey
            }];
          }
        },
        [WALLET_STANDARD_FEATURES.DISCONNECT]: {
          disconnect: async () => {
            await provider.disconnect();
          }
        },
        [WALLET_STANDARD_FEATURES.SIGN_TRANSACTION]: {
          signTransaction: async (transaction) => {
            return await provider.signTransaction(transaction);
          }
        },
        [WALLET_STANDARD_FEATURES.SIGN_AND_SEND]: {
          signAndSendTransaction: async (transaction, options) => {
            return await provider.signAndSendTransaction(transaction, options);
          }
        },
        [WALLET_STANDARD_FEATURES.SIGN_MESSAGE]: {
          signMessage: async (message) => {
            return await provider.signMessage(message);
          }
        }
      },
      accounts: provider.publicKey ? [{
        address: provider.publicKey.toString(),
        publicKey: provider.publicKey
      }] : []
    };
  },

  /**
   * Check if a wallet object is valid
   * @private
   */
  _isValidWallet(wallet) {
    return wallet && typeof wallet.name === 'string' && wallet.features;
  },

  /**
   * Listen for new wallet registrations
   * @private
   */
  _listenForWalletChanges() {
    // Modern Wallet Standard event
    if (window.addEventListener) {
      window.addEventListener('wallet-standard:app-ready', () => {
        this._discoverWallets();
        this._emit('walletsChanged', this.getWallets());
      });
    }

    // Poll for new wallets (fallback)
    setInterval(() => {
      const previousCount = this.wallets.size;
      this._discoverWallets();
      if (this.wallets.size !== previousCount) {
        this._emit('walletsChanged', this.getWallets());
      }
    }, 5000);
  },

  /**
   * Try to reconnect from previous session
   * @private
   */
  async _tryAutoReconnect() {
    try {
      const savedWallet = localStorage.getItem('asdf_connected_wallet');
      if (!savedWallet) return;

      const wallet = this.wallets.get(savedWallet);
      if (!wallet) return;

      // Check if already connected
      const provider = wallet.provider || wallet;
      if (provider.isConnected || provider.publicKey) {
        this.connectedWallet = wallet;
        this.connectedAccount = {
          address: provider.publicKey.toString(),
          publicKey: provider.publicKey
        };
        this._emit('connect', this.connectedAccount);
        console.log(`[WalletManager] Auto-reconnected to ${savedWallet}`);
      }
    } catch (e) {
      console.warn('[WalletManager] Auto-reconnect failed:', e.message);
      localStorage.removeItem('asdf_connected_wallet');
    }
  },

  /**
   * Get list of available wallets
   * @returns {Array<{name: string, icon: string}>}
   */
  getWallets() {
    return Array.from(this.wallets.entries()).map(([name, wallet]) => ({
      name,
      icon: wallet.icon || '',
      installed: true
    }));
  },

  /**
   * Connect to a specific wallet
   * @param {string} walletName - Name of wallet to connect
   * @returns {Promise<{address: string}>}
   */
  async connect(walletName) {
    const wallet = this.wallets.get(walletName);
    if (!wallet) {
      throw new Error(`Wallet "${walletName}" not found. Available: ${Array.from(this.wallets.keys()).join(', ')}`);
    }

    try {
      let accounts;

      // Try Wallet Standard connect
      if (wallet.features?.[WALLET_STANDARD_FEATURES.CONNECT]) {
        accounts = await wallet.features[WALLET_STANDARD_FEATURES.CONNECT].connect();
      }
      // Fallback to legacy provider
      else if (wallet.provider?.connect) {
        const resp = await wallet.provider.connect();
        accounts = [{
          address: resp.publicKey.toString(),
          publicKey: resp.publicKey
        }];
      } else {
        throw new Error('Wallet does not support connect');
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      this.connectedWallet = wallet;
      this.connectedAccount = accounts[0];

      // Save for auto-reconnect
      localStorage.setItem('asdf_connected_wallet', walletName);

      this._emit('connect', this.connectedAccount);

      console.log(`[WalletManager] Connected to ${walletName}: ${this.connectedAccount.address}`);

      return {
        address: this.connectedAccount.address,
        wallet: walletName
      };

    } catch (error) {
      if (error.message?.includes('User rejected')) {
        throw new Error('Connection rejected by user');
      }
      throw error;
    }
  },

  /**
   * Disconnect current wallet
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (!this.connectedWallet) return;

    try {
      if (this.connectedWallet.features?.[WALLET_STANDARD_FEATURES.DISCONNECT]) {
        await this.connectedWallet.features[WALLET_STANDARD_FEATURES.DISCONNECT].disconnect();
      } else if (this.connectedWallet.provider?.disconnect) {
        await this.connectedWallet.provider.disconnect();
      }
    } catch (e) {
      console.warn('[WalletManager] Disconnect error:', e.message);
    }

    const previousWallet = this.connectedWallet?.name;
    this.connectedWallet = null;
    this.connectedAccount = null;
    localStorage.removeItem('asdf_connected_wallet');

    this._emit('disconnect', { wallet: previousWallet });

    console.log('[WalletManager] Disconnected');
  },

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connectedAccount !== null;
  },

  /**
   * Get connected address
   * @returns {string|null}
   */
  getAddress() {
    return this.connectedAccount?.address || null;
  },

  /**
   * Get connected address as Kit address type
   * @returns {Address|null}
   */
  getKitAddress() {
    const addr = this.getAddress();
    return addr ? address(addr) : null;
  },

  /**
   * Sign a transaction
   * @param {Object} transaction - Transaction to sign
   * @returns {Promise<Object>} Signed transaction
   */
  async signTransaction(transaction) {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    const feature = this.connectedWallet.features?.[WALLET_STANDARD_FEATURES.SIGN_TRANSACTION];
    if (feature) {
      return await feature.signTransaction(transaction);
    }

    if (this.connectedWallet.provider?.signTransaction) {
      return await this.connectedWallet.provider.signTransaction(transaction);
    }

    throw new Error('Wallet does not support transaction signing');
  },

  /**
   * Sign and send a transaction
   * @param {Object} transaction - Transaction to sign and send
   * @param {Object} [options] - Send options
   * @returns {Promise<{signature: string}>}
   */
  async signAndSendTransaction(transaction, options = {}) {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    const feature = this.connectedWallet.features?.[WALLET_STANDARD_FEATURES.SIGN_AND_SEND];
    if (feature) {
      return await feature.signAndSendTransaction(transaction, options);
    }

    if (this.connectedWallet.provider?.signAndSendTransaction) {
      return await this.connectedWallet.provider.signAndSendTransaction(transaction, options);
    }

    throw new Error('Wallet does not support signAndSendTransaction');
  },

  /**
   * Sign a message
   * @param {Uint8Array} message - Message to sign
   * @returns {Promise<{signature: Uint8Array}>}
   */
  async signMessage(message) {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }

    const feature = this.connectedWallet.features?.[WALLET_STANDARD_FEATURES.SIGN_MESSAGE];
    if (feature) {
      return await feature.signMessage(message);
    }

    if (this.connectedWallet.provider?.signMessage) {
      return await this.connectedWallet.provider.signMessage(message);
    }

    throw new Error('Wallet does not support message signing');
  },

  /**
   * Add event listener
   * @param {string} event - Event name ('connect', 'disconnect', 'walletsChanged')
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
  },

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    this.listeners = this.listeners.filter(
      l => !(l.event === event && l.callback === callback)
    );
  },

  /**
   * Emit event
   * @private
   */
  _emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (e) {
          console.error(`[WalletManager] Event listener error:`, e);
        }
      }
    }
  }
};

// ============================================
// EXPORTS
// ============================================

export { WalletManager, WALLET_STANDARD_FEATURES };
export default WalletManager;
