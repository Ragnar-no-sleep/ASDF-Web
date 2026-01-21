/**
 * ASDF Solana - Wallet Standard Manager
 *
 * Multi-wallet support using Wallet Standard
 * Works with existing web3.js v1 infrastructure
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// WALLET STANDARD MANAGER
// ============================================

const WalletStandard = {
  /** @type {Map<string, Object>} Discovered wallets */
  wallets: new Map(),

  /** @type {Object|null} Currently connected wallet */
  connectedWallet: null,

  /** @type {string|null} Connected address */
  connectedAddress: null,

  /** @type {Function[]} Event listeners */
  listeners: [],

  /** @type {boolean} Initialization state */
  initialized: false,

  /**
   * Initialize and discover wallets
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;

    console.log('[WalletStandard] Initializing...');

    // Wait for wallets to register
    await this._waitForWallets(2000);

    // Discover all wallets
    this._discoverWallets();

    // Listen for changes
    this._setupListeners();

    this.initialized = true;
    console.log(`[WalletStandard] Found ${this.wallets.size} wallets`);

    // Try auto-reconnect
    await this._tryAutoReconnect();
  },

  /**
   * Wait for wallet extensions to load
   * @private
   */
  async _waitForWallets(maxWait) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      if (this._hasAnyWallet()) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  },

  /**
   * Check if any wallet is available
   * @private
   */
  _hasAnyWallet() {
    return !!(
      window.phantom?.solana ||
      window.solana?.isPhantom ||
      window.backpack ||
      window.solflare?.isSolflare ||
      window.glow
    );
  },

  /**
   * Discover all available wallets
   * @private
   */
  _discoverWallets() {
    this.wallets.clear();

    // Phantom
    const phantom = window.phantom?.solana || window.solana;
    if (phantom?.isPhantom) {
      this.wallets.set('Phantom', {
        name: 'Phantom',
        icon: 'https://phantom.app/img/logo.png',
        provider: phantom,
      });
    }

    // Backpack
    if (window.backpack) {
      this.wallets.set('Backpack', {
        name: 'Backpack',
        icon: 'https://backpack.app/logo.png',
        provider: window.backpack,
      });
    }

    // Solflare
    if (window.solflare?.isSolflare) {
      this.wallets.set('Solflare', {
        name: 'Solflare',
        icon: 'https://solflare.com/favicon.ico',
        provider: window.solflare,
      });
    }

    // Glow
    if (window.glow) {
      this.wallets.set('Glow', {
        name: 'Glow',
        icon: 'https://glow.app/favicon.ico',
        provider: window.glow,
      });
    }

    // Coinbase Wallet
    if (window.coinbaseSolana) {
      this.wallets.set('Coinbase', {
        name: 'Coinbase Wallet',
        icon: 'https://www.coinbase.com/favicon.ico',
        provider: window.coinbaseSolana,
      });
    }
  },

  /**
   * Setup event listeners
   * @private
   */
  _setupListeners() {
    // Poll for new wallets
    setInterval(() => {
      const prevCount = this.wallets.size;
      this._discoverWallets();
      if (this.wallets.size !== prevCount) {
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
      const savedWallet = localStorage.getItem('asdf_wallet');
      if (!savedWallet) return;

      const wallet = this.wallets.get(savedWallet);
      if (!wallet?.provider) return;

      // Check if already connected
      if (wallet.provider.isConnected && wallet.provider.publicKey) {
        this.connectedWallet = wallet;
        this.connectedAddress = wallet.provider.publicKey.toString();
        this._emit('connect', { address: this.connectedAddress, wallet: savedWallet });
        console.log(`[WalletStandard] Auto-reconnected to ${savedWallet}`);
      }
    } catch (e) {
      console.warn('[WalletStandard] Auto-reconnect failed:', e.message);
      localStorage.removeItem('asdf_wallet');
    }
  },

  /**
   * Get list of available wallets
   * @returns {Array<{name: string, icon: string}>}
   */
  getWallets() {
    return Array.from(this.wallets.values()).map((w) => ({
      name: w.name,
      icon: w.icon,
    }));
  },

  /**
   * Connect to a wallet
   * @param {string} walletName
   * @returns {Promise<{address: string, wallet: string}>}
   */
  async connect(walletName) {
    const wallet = this.wallets.get(walletName);
    if (!wallet) {
      const available = Array.from(this.wallets.keys()).join(', ');
      throw new Error(`Wallet "${walletName}" not found. Available: ${available}`);
    }

    try {
      console.log(`[WalletStandard] Connecting to ${walletName}...`);

      const resp = await wallet.provider.connect();
      const address = resp.publicKey.toString();

      this.connectedWallet = wallet;
      this.connectedAddress = address;

      localStorage.setItem('asdf_wallet', walletName);

      this._emit('connect', { address, wallet: walletName });

      console.log(`[WalletStandard] Connected: ${address}`);

      return { address, wallet: walletName };
    } catch (error) {
      if (error.message?.includes('User rejected')) {
        throw new Error('Connection rejected by user');
      }
      throw error;
    }
  },

  /**
   * Disconnect current wallet
   */
  async disconnect() {
    if (!this.connectedWallet) return;

    try {
      await this.connectedWallet.provider.disconnect();
    } catch (e) {
      console.warn('[WalletStandard] Disconnect error:', e.message);
    }

    const wallet = this.connectedWallet?.name;
    this.connectedWallet = null;
    this.connectedAddress = null;
    localStorage.removeItem('asdf_wallet');

    this._emit('disconnect', { wallet });
    console.log('[WalletStandard] Disconnected');
  },

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connectedAddress !== null;
  },

  /**
   * Get connected address
   * @returns {string|null}
   */
  getAddress() {
    return this.connectedAddress;
  },

  /**
   * Get the provider for transaction signing
   * @returns {Object|null}
   */
  getProvider() {
    return this.connectedWallet?.provider || null;
  },

  /**
   * Sign and send a transaction
   * @param {Object} transaction - web3.js Transaction object
   * @returns {Promise<{signature: string}>}
   */
  async signAndSendTransaction(transaction) {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }
    return await this.connectedWallet.provider.signAndSendTransaction(transaction);
  },

  /**
   * Sign a transaction (without sending)
   * @param {Object} transaction
   * @returns {Promise<Object>}
   */
  async signTransaction(transaction) {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }
    return await this.connectedWallet.provider.signTransaction(transaction);
  },

  /**
   * Sign a message
   * @param {Uint8Array} message
   * @returns {Promise<{signature: Uint8Array}>}
   */
  async signMessage(message) {
    if (!this.connectedWallet) {
      throw new Error('No wallet connected');
    }
    return await this.connectedWallet.provider.signMessage(message);
  },

  /**
   * Add event listener
   * @param {'connect'|'disconnect'|'walletsChanged'} event
   * @param {Function} callback
   */
  on(event, callback) {
    this.listeners.push({ event, callback });
  },

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.listeners = this.listeners.filter(
      (l) => !(l.event === event && l.callback === callback)
    );
  },

  /**
   * Emit event
   * @private
   */
  _emit(event, data) {
    for (const l of this.listeners) {
      if (l.event === event) {
        try {
          l.callback(data);
        } catch (e) {
          console.error('[WalletStandard] Event error:', e);
        }
      }
    }
  },
};

// ============================================
// EXPORTS
// ============================================

// Expose globally
if (typeof window !== 'undefined') {
  window.WalletStandard = WalletStandard;
}

export { WalletStandard };
export default WalletStandard;
