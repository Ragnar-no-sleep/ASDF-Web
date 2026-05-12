'use strict';

/**
 * Shared test fixtures for ASDF game tests.
 * Factory functions — each call returns a fresh instance to prevent cross-test pollution.
 *
 * This is fine.
 */

function createGameEvents() {
  return {
    _listeners: new Map(),
    on(event, fn) {
      if (!this._listeners.has(event)) this._listeners.set(event, []);
      this._listeners.get(event).push(fn);
      return () => this.off(event, fn);
    },
    off(event, fn) {
      const fns = this._listeners.get(event);
      if (fns) {
        this._listeners.set(
          event,
          fns.filter(f => f !== fn)
        );
      }
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
}

function createMockElement(id) {
  return {
    id,
    classList: {
      _classes: new Set(),
      add(cls) {
        this._classes.add(cls);
      },
      remove(cls) {
        this._classes.delete(cls);
      },
      contains(cls) {
        return this._classes.has(cls);
      },
    },
    style: {},
    textContent: '',
    innerHTML: '',
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    remove() {},
  };
}

function createAppState(overrides = {}) {
  return Object.assign(
    {
      wallet: null,
      isHolder: false,
      balance: 0,
      practiceScores: {},
      competitiveSessionStart: null,
    },
    overrides
  );
}

function isValidSolanaAddress(address) {
  if (typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

function setupElementRegistry() {
  const elements = {};
  const originalGetElementById = global.document ? global.document.getElementById : undefined;
  global.document = global.document || {};
  global.document.getElementById = id => elements[id] || null;

  function cleanup() {
    if (originalGetElementById) {
      global.document.getElementById = originalGetElementById;
    }
  }

  return { elements, cleanup };
}

module.exports = {
  createGameEvents,
  createMockElement,
  createAppState,
  isValidSolanaAddress,
  setupElementRegistry,
};
