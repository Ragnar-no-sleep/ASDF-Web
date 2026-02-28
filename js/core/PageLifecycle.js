/**
 * Page Lifecycle Management
 * Tracks timers and event listeners, cleans them up on page unload
 * to prevent memory leaks during SPA-style navigation.
 *
 * Usage:
 *   import { PageLifecycle } from './core/PageLifecycle.js';
 *   const id = setInterval(updateStats, 30000);
 *   PageLifecycle.registerTimer('burns-update', id);
 */

const timers = new Map();
const listeners = [];

export const PageLifecycle = {
  /**
   * Register an interval/timeout for automatic cleanup
   * @param {string} name Unique identifier for this timer
   * @param {number} timerId Return value from setInterval/setTimeout
   */
  registerTimer(name, timerId) {
    timers.set(name, timerId);
  },

  /**
   * Register an event listener for automatic cleanup
   * @param {EventTarget} target
   * @param {string} event
   * @param {Function} handler
   */
  registerListener(target, event, handler) {
    listeners.push({ target, event, handler });
    target.addEventListener(event, handler);
  },

  /**
   * Clear a specific timer by name
   * @param {string} name
   */
  clearTimer(name) {
    const id = timers.get(name);
    if (id !== undefined) {
      clearInterval(id);
      clearTimeout(id);
      timers.delete(name);
    }
  },

  /**
   * Clean up all registered timers and listeners
   * Called automatically on beforeunload
   */
  cleanup() {
    timers.forEach(id => {
      clearInterval(id);
      clearTimeout(id);
    });
    timers.clear();

    listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    listeners.length = 0;
  },
};

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => PageLifecycle.cleanup());
