/**
 * ASDF Games - Event Bus
 *
 * Decouples cross-module communication (notifications, wallet events, etc.)
 * Scalable open-source pattern (inspired by EventEmitter3/NanoEvents).
 * Features: Safe iteration, 'once' subscriptions, and easy cleanup.
 */

'use strict';

const GameEvents = {
  _listeners: new Map(),

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} fn - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push(fn);
    return () => this.off(event, fn);
  },

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} fn - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, fn) {
    const onceFn = data => {
      this.off(event, onceFn);
      fn(data);
    };
    // Keep reference to original fn for easier removal if needed
    onceFn._original = fn;
    return this.on(event, onceFn);
  },

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} fn - Callback function
   */
  off(event, fn) {
    const fns = this._listeners.get(event);
    if (fns) {
      // Filter out the exact function, or the wrapper if it was attached via 'once'
      this._listeners.set(
        event,
        fns.filter(f => f !== fn && f._original !== fn)
      );

      // Memory cleanup: remove empty arrays
      if (this._listeners.get(event).length === 0) {
        this._listeners.delete(event);
      }
    }
  },

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {any} data - Event payload
   */
  emit(event, data) {
    const fns = this._listeners.get(event);
    if (fns) {
      // Copy array before iterating to prevent issues if a listener calls off() during execution
      const fnsCopy = [...fns];
      fnsCopy.forEach(fn => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[GameEvents] Error in listener for '${event}':`, e);
        }
      });
    }
  },

  /**
   * Remove all listeners (useful for game teardown/reset)
   * @param {string} [event] - Optional specific event to clear
   */
  clear(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  },
};

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.GameEvents = GameEvents;
  window.GameEvents = GameEvents;
}
