/**
 * ASDF Games - Event Bus
 *
 * Decouples cross-module communication (notifications, wallet events, etc.)
 * Proven pattern from ShopState internal bus.
 */

'use strict';

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

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.GameEvents = GameEvents;
  window.GameEvents = GameEvents;
}
