/**
 * ASDF-Web Event Bus
 * Central pub/sub system for application-wide event handling
 *
 * Pattern: beekeeper-studio + claude-mem
 * Philosophy: Don't trust, verify. Events are the source of truth.
 *
 * @example
 * import { eventBus } from './core/event-bus.js';
 *
 * // Subscribe to events
 * const unsubscribe = eventBus.on('wallet:connected', (data) => {
 *   console.log('Wallet connected:', data.address);
 * });
 *
 * // Emit events
 * eventBus.emit('wallet:connected', { address: '5VUui...' });
 *
 * // Unsubscribe when done
 * unsubscribe();
 *
 * @module core/event-bus
 */

/**
 * EventBus class - Singleton pattern
 * Provides publish/subscribe functionality with history tracking
 */
class EventBus {
  constructor() {
    /** @type {Map<string, Array<{callback: Function, once: boolean}>>} */
    this.listeners = new Map();

    /** @type {Array<{event: string, data: any, timestamp: number}>} */
    this.history = [];

    /** @type {number} Maximum history entries to keep */
    this.maxHistory = 100;

    /** @type {boolean} Debug mode flag */
    this.debug = false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (e.g., 'wallet:connected')
   * @param {Function} callback - Function to call when event fires
   * @param {Object} options - Subscription options
   * @param {boolean} options.once - If true, auto-unsubscribe after first call
   * @returns {Function} Unsubscribe function
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      console.error('[EventBus] Callback must be a function');
      return () => {};
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = { callback, once: Boolean(options.once) };
    this.listeners.get(event).push(listener);

    if (this.debug) {
      console.log(`[EventBus] Subscribed to: ${event}`);
    }

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event, auto-unsubscribe after first call
   * @param {string} event - Event name
   * @param {Function} callback - Function to call
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    return this.on(event, callback, { once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - The callback to remove
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex((l) => l.callback === callback);
    if (index > -1) {
      listeners.splice(index, 1);
      if (this.debug) {
        console.log(`[EventBus] Unsubscribed from: ${event}`);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name
   * @param {any} data - Data to pass to callbacks
   */
  emit(event, data) {
    // Record in history
    this.history.push({
      event,
      data,
      timestamp: Date.now()
    });

    // Trim history if needed
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (this.debug) {
      console.log(`[EventBus] Emit: ${event}`, data);
    }

    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) return;

    // Track indices of once-listeners to remove
    const toRemove = [];

    listeners.forEach((listener, index) => {
      try {
        listener.callback(data);
        if (listener.once) {
          toRemove.push(index);
        }
      } catch (error) {
        console.error(`[EventBus] Error in listener for "${event}":`, error);
      }
    });

    // Remove once-listeners (reverse order to preserve indices)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      listeners.splice(toRemove[i], 1);
    }
  }

  /**
   * Get event history
   * @param {string} [event] - Filter by event name (optional)
   * @returns {Array} History entries
   */
  getHistory(event) {
    if (event) {
      return this.history.filter((entry) => entry.event === event);
    }
    return [...this.history];
  }

  /**
   * Clear all listeners and history
   */
  clear() {
    this.listeners.clear();
    this.history = [];
    if (this.debug) {
      console.log('[EventBus] Cleared all listeners and history');
    }
  }

  /**
   * Get count of listeners for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * Get all registered event names
   * @returns {string[]} Array of event names
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Enable or disable debug mode
   * @param {boolean} enabled - Debug mode state
   */
  setDebug(enabled) {
    this.debug = Boolean(enabled);
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Standard event names (for documentation and type hints)
export const EVENTS = {
  // Wallet events
  WALLET_CONNECTING: 'wallet:connecting',
  WALLET_CONNECTED: 'wallet:connected',
  WALLET_DISCONNECTED: 'wallet:disconnected',
  WALLET_ERROR: 'wallet:error',

  // Transaction events
  TX_SUBMITTED: 'tx:submitted',
  TX_CONFIRMED: 'tx:confirmed',
  TX_FAILED: 'tx:failed',

  // Game events
  GAME_START: 'game:start',
  GAME_END: 'game:end',
  GAME_SCORE: 'game:score',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',

  // Shop events
  SHOP_PURCHASE_START: 'shop:purchase:start',
  SHOP_PURCHASE_COMPLETE: 'shop:purchase:complete',
  SHOP_PURCHASE_FAILED: 'shop:purchase:failed',

  // UI events
  MODAL_OPEN: 'ui:modal:open',
  MODAL_CLOSE: 'ui:modal:close',
  TOAST_SHOW: 'ui:toast:show',
  THEME_CHANGE: 'ui:theme:change',

  // Audio events
  AUDIO_PLAY: 'audio:play',
  AUDIO_TOGGLE: 'audio:toggle',

  // System events
  APP_READY: 'app:ready',
  APP_ERROR: 'app:error',
  NETWORK_CHANGE: 'network:change',

  // WebSocket events
  WS_CONNECTING: 'ws:connecting',
  WS_CONNECTED: 'ws:connected',
  WS_DISCONNECTED: 'ws:disconnected',
  WS_READY: 'ws:ready',
  WS_ERROR: 'ws:error',
  WS_FAILED: 'ws:failed',
  WS_NOTIFICATION: 'ws:notification',

  // Realtime notification events
  ACHIEVEMENT_UNLOCKED: 'realtime:achievement',
  LEVEL_UP: 'realtime:levelup',
  BURN_CONFIRMED: 'realtime:burn',
  WHALE_BURN: 'realtime:whale',
  LEADERBOARD_UPDATE: 'realtime:leaderboard',
  RANK_CHANGED: 'realtime:rank',
  ANNOUNCEMENT: 'realtime:announcement',

  // Quest events
  QUEST_UNLOCKED: 'quest:unlocked',
  QUEST_STARTED: 'quest:started',
  QUEST_PROGRESS: 'quest:progress',
  QUEST_SUBMITTED: 'quest:submitted',
  QUEST_VERIFIED: 'quest:verified',
  QUEST_REJECTED: 'quest:rejected',
  QUEST_COMPLETED: 'quest:completed',
  QUEST_FAILED: 'quest:failed',

  // Module events
  MODULE_UNLOCKED: 'module:unlocked',
  MODULE_STARTED: 'module:started',
  MODULE_BLOCK_COMPLETED: 'module:block_completed',
  MODULE_LESSON_COMPLETED: 'module:lesson_completed',
  MODULE_COMPLETED: 'module:completed',

  // Quiz events
  QUIZ_STARTED: 'quiz:started',
  QUIZ_ANSWERED: 'quiz:answered',
  QUIZ_PASSED: 'quiz:passed',
  QUIZ_FAILED: 'quiz:failed',

  // XP & Progression events
  XP_GAINED: 'xp:gained',
  XP_LEVEL_UP: 'xp:level_up',
  XP_STREAK_CONTINUED: 'xp:streak_continued',
  XP_STREAK_BROKEN: 'xp:streak_broken',
  XP_MILESTONE: 'xp:milestone',

  // Badge events
  BADGE_UNLOCKED: 'badge:unlocked',
  BADGE_MINTED: 'badge:minted',
  BADGE_CLAIMED: 'badge:claimed',

  // Progress sync events
  PROGRESS_SYNCED: 'progress:synced',
  PROGRESS_CONFLICT: 'progress:conflict',
  PROGRESS_OFFLINE: 'progress:offline'
};

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.events = eventBus;
  window.ASDF.EVENTS = EVENTS;
}
