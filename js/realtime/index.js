/**
 * ASDF-Web Realtime Module
 * Central exports for real-time functionality
 *
 * @module realtime
 *
 * @example
 * // Import realtime client
 * import { realtime, connect, disconnect } from './realtime/index.js';
 *
 * // Connect and subscribe
 * await connect();
 * realtime.subscribe('burns');
 *
 * // Listen for notifications
 * eventBus.on('realtime:burn', (data) => {
 *   console.log('New burn:', data);
 * });
 */

// Realtime Client
export {
  realtime,
  RealtimeClient,
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  isConnected,
  CONNECTION_STATE,
  MESSAGE_TYPES,
  CHANNELS
} from './client.js';

/**
 * Initialize realtime connection
 * Auto-connects with optional token
 *
 * @param {Object} options - Init options
 * @param {string} options.token - Auth token
 * @param {boolean} options.autoConnect - Auto-connect on init
 * @returns {Promise<boolean>}
 */
export async function initRealtime(options = {}) {
  const { connect: connectFn } = await import('./client.js');
  const { token = null, autoConnect = true } = options;

  if (autoConnect) {
    return connectFn(token);
  }

  return true;
}

/**
 * Get realtime connection status
 * @returns {Object}
 */
export function getRealtimeStatus() {
  if (typeof window === 'undefined') return { connected: false };

  const { realtime: rt } = window.ASDF || {};
  if (!rt) return { connected: false };

  return {
    connected: rt.isConnected(),
    state: rt.getState(),
    ...rt.getStats()
  };
}

// Version
export const VERSION = '1.0.0';
