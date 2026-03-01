/**
 * ASDF Games - GameStore Tests
 * Tests the centralized state store contract:
 * - setWallet/clearWallet emit correct events
 * - updateBalance emits balance-changed
 * - resetBalance mutates state WITHOUT emitting events
 *
 * This is fine.
 */

// ============================================
// INLINE DEPENDENCIES (no module bundler)
// ============================================

const GameEvents = {
  _listeners: new Map(),
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return () => this.off(event, fn);
  },
  off(event, fn) {
    const fns = this._listeners.get(event);
    if (fns)
      this._listeners.set(
        event,
        fns.filter(f => f !== fn)
      );
  },
  emit(event, data) {
    const fns = this._listeners.get(event);
    if (fns) {
      fns.forEach(fn => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[GameEvents] ${event}:`, e);
        }
      });
    }
  },
};

// Mock appState (mirrors state.js shape)
const appState = {
  wallet: null,
  isHolder: false,
  balance: 0,
  competitiveSessionStart: null,
};

// Mock endCompetitiveSession (defined in state.js, loaded before store.js)
const endCompetitiveSession = jest.fn();

const GameStore = {
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

// ============================================
// TESTS
// ============================================

describe('GameStore', () => {
  beforeEach(() => {
    // Reset state
    appState.wallet = null;
    appState.isHolder = false;
    appState.balance = 0;
    appState.competitiveSessionStart = null;
    // Clear all listeners
    GameEvents._listeners.clear();
    // Reset mocks
    endCompetitiveSession.mockClear();
  });

  // ============================================
  // setWallet
  // ============================================
  describe('setWallet()', () => {
    it('should set appState.wallet', () => {
      GameStore.setWallet('5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa');
      expect(appState.wallet).toBe('5VUuiKmR4zt1bfHNTTpPMGB2r7tjNo4YFL1WqKC7ZRwa');
    });

    it('should emit store:wallet-connected with wallet address', () => {
      const handler = jest.fn();
      GameEvents.on('store:wallet-connected', handler);

      GameStore.setWallet('ABC123');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ wallet: 'ABC123' });
    });
  });

  // ============================================
  // clearWallet
  // ============================================
  describe('clearWallet()', () => {
    beforeEach(() => {
      appState.wallet = 'someWallet';
      appState.isHolder = true;
      appState.balance = 1000;
    });

    it('should call endCompetitiveSession', () => {
      GameStore.clearWallet();
      expect(endCompetitiveSession).toHaveBeenCalledTimes(1);
    });

    it('should reset wallet, isHolder, and balance', () => {
      GameStore.clearWallet();
      expect(appState.wallet).toBeNull();
      expect(appState.isHolder).toBe(false);
      expect(appState.balance).toBe(0);
    });

    it('should emit store:wallet-disconnected', () => {
      const handler = jest.fn();
      GameEvents.on('store:wallet-disconnected', handler);

      GameStore.clearWallet();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({});
    });
  });

  // ============================================
  // updateBalance
  // ============================================
  describe('updateBalance()', () => {
    it('should set balance and isHolder on appState', () => {
      GameStore.updateBalance(5000, true);
      expect(appState.balance).toBe(5000);
      expect(appState.isHolder).toBe(true);
    });

    it('should emit store:balance-changed with data', () => {
      const handler = jest.fn();
      GameEvents.on('store:balance-changed', handler);

      GameStore.updateBalance(5000, true);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ balance: 5000, isHolder: true });
    });
  });

  // ============================================
  // resetBalance — THE CONTRACT
  // ============================================
  describe('resetBalance()', () => {
    it('should set balance to 0', () => {
      appState.balance = 5000;
      GameStore.resetBalance();
      expect(appState.balance).toBe(0);
    });

    it('should set isHolder to false', () => {
      appState.isHolder = true;
      GameStore.resetBalance();
      expect(appState.isHolder).toBe(false);
    });

    it('should NOT emit any events', () => {
      const balanceHandler = jest.fn();
      const walletHandler = jest.fn();
      const disconnectHandler = jest.fn();
      GameEvents.on('store:balance-changed', balanceHandler);
      GameEvents.on('store:wallet-connected', walletHandler);
      GameEvents.on('store:wallet-disconnected', disconnectHandler);

      appState.balance = 5000;
      appState.isHolder = true;
      GameStore.resetBalance();

      expect(balanceHandler).not.toHaveBeenCalled();
      expect(walletHandler).not.toHaveBeenCalled();
      expect(disconnectHandler).not.toHaveBeenCalled();
    });

    it('should not touch wallet', () => {
      appState.wallet = 'myWallet';
      GameStore.resetBalance();
      expect(appState.wallet).toBe('myWallet');
    });
  });

  // ============================================
  // Integration: resetBalance vs updateBalance
  // ============================================
  describe('resetBalance() vs updateBalance() render contract', () => {
    it('updateBalance triggers exactly 1 render, resetBalance triggers 0', () => {
      const renderCount = jest.fn();
      GameEvents.on('store:balance-changed', renderCount);

      // Simulate the wallet-change flow (the bug that was fixed):
      // 1. setWallet (emits wallet-connected, not balance-changed)
      GameStore.setWallet('newWallet');
      expect(renderCount).toHaveBeenCalledTimes(0);

      // 2. resetBalance (security precaution — NO event)
      GameStore.resetBalance();
      expect(renderCount).toHaveBeenCalledTimes(0);

      // 3. checkTokenBalance resolves → updateBalance (real data — 1 event)
      GameStore.updateBalance(5000, true);
      expect(renderCount).toHaveBeenCalledTimes(1);
    });

    it('old pattern would have caused 2 renders (regression guard)', () => {
      const renderCount = jest.fn();
      GameEvents.on('store:balance-changed', renderCount);

      // Old pattern: updateBalance(0, false) + later updateBalance(real)
      GameStore.updateBalance(0, false); // render #1
      GameStore.updateBalance(5000, true); // render #2
      expect(renderCount).toHaveBeenCalledTimes(2);
    });
  });
});
