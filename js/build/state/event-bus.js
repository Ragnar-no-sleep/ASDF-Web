/**
 * Build V2 - Event Bus
 * Pure pub/sub event system extracted from BuildState
 *
 * @version 1.0.0
 */

'use strict';

/**
 * Event Bus - Observer pattern implementation
 * Singleton for application-wide event communication
 */
const EventBus = {
  /** @type {Map<string, Set<Function>>} */
  _listeners: new Map(),

  /** @type {Array<{event: string, data: any, timestamp: number}>} */
  _history: [],

  /** Maximum history size */
  _maxHistory: 100,

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (typeof callback !== 'function') {
      console.warn('[EventBus] Callback must be a function');
      return () => {};
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  },

  /**
   * Subscribe to an event once
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const wrapper = data => {
      this._listeners.get(event)?.delete(wrapper);
      callback(data);
    };
    return this.subscribe(event, wrapper);
  },

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data = null) {
    // Track history
    this._history.push({ event, data, timestamp: Date.now() });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    // Notify listeners
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[EventBus] Error in ${event} listener:`, err);
        }
      });
    }

    // Also emit to window for external listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`build:${event}`, { detail: data }));
    }
  },

  /**
   * Remove all listeners for an event
   * @param {string} event
   */
  off(event) {
    this._listeners.delete(event);
  },

  /**
   * Clear all listeners
   */
  clear() {
    this._listeners.clear();
  },

  /**
   * Get event history
   * @param {string} [event] - Filter by event name
   * @returns {Array}
   */
  getHistory(event) {
    if (event) {
      return this._history.filter(h => h.event === event);
    }
    return [...this._history];
  },

  /**
   * Get listener count for an event
   * @param {string} event
   * @returns {number}
   */
  listenerCount(event) {
    return this._listeners.get(event)?.size || 0;
  },

  /**
   * Get all event names with listeners
   * @returns {string[]}
   */
  eventNames() {
    return Array.from(this._listeners.keys());
  },
};

export { EventBus };
export default EventBus;
