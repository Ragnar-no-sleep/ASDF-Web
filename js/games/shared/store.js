/**
 * ASDF Games - Centralized State Store
 *
 * Wraps appState mutations with event emission via GameEvents.
 * Callers mutate through GameStore; subscribers react to events.
 * GameStore does NOT call saveState() — caller decides when to persist.
 */

'use strict';

const GameStore = {
  // --- Wallet ---

  setWallet(publicKey) {
    appState.wallet = publicKey;
    GameEvents.emit('store:wallet-connected', { wallet: publicKey });
  },

  clearWallet() {
    endCompetitiveSession();
    appState.wallet = null;
    appState.isHolder = false;
    appState.balance = 0;
    GameEvents.emit('store:wallet-disconnected', {});
  },

  /**
   * Reset balance to zero without emitting events.
   * Used as a security precaution before async on-chain verification.
   * The subsequent checkTokenBalance() call will emit balance-changed
   * with the real verified data — one render, not two.
   */
  resetBalance() {
    appState.balance = 0;
    appState.isHolder = false;
  },

  updateBalance(balance, isHolder) {
    appState.balance = balance;
    appState.isHolder = isHolder;
    GameEvents.emit('store:balance-changed', { balance, isHolder });
  },
};

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.GameStore = GameStore;
  window.GameStore = GameStore;
}
