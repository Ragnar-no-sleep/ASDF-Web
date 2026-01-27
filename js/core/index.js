/**
 * ASDF-Web Core Module
 * Central exports for core functionality
 *
 * @module core
 *
 * @example
 * // Import everything
 * import * as core from './core/index.js';
 *
 * // Or import specific modules
 * import { eventBus, EVENTS } from './core/index.js';
 * import { errors, getError } from './core/index.js';
 * import { getConfig, setConfig } from './core/index.js';
 * import { debug, debugWarn, debugError } from './core/index.js';
 */

// Event Bus
export { eventBus, EVENTS } from './event-bus.js';

// Error Registry
export {
  errors,
  getError,
  createError,
  isASDFError,
  getSeverityColor,
  getSeverityIcon
} from './errors.js';

// Configuration
export {
  loadConfig,
  getConfig,
  setConfig,
  resetConfig,
  getAllConfig,
  mergeConfig,
  isFeatureEnabled,
  getTiming,
  getPhi,
  DEFAULTS
} from './config.js';

// Debug utilities
export {
  debug,
  debugWarn,
  debugError,
  debugInfo,
  debugTable,
  debugGroup,
  debugGroupEnd,
  createLogger,
  enableDebug,
  disableDebug
} from './debug.js';

// Redis client
export { redis, REDIS_EVENTS } from './redis-client.js';

/**
 * Initialize core modules
 * Call this on app startup
 *
 * @param {Object} options - Initialization options
 * @param {boolean} options.debug - Enable debug mode
 * @param {string} options.configPath - Path to config JSON file
 * @returns {Promise<void>}
 */
export async function initCore(options = {}) {
  const { eventBus } = await import('./event-bus.js');
  const { loadConfig, setConfig } = await import('./config.js');

  // Enable debug if requested
  if (options.debug) {
    setConfig('debug.enabled', true);
    eventBus.setDebug(true);
  }

  // Load external config if provided
  if (options.configPath) {
    await loadConfig(options.configPath);
  }

  // Emit ready event
  eventBus.emit('core:ready', {
    timestamp: Date.now(),
    debug: options.debug || false
  });

  console.log('[Core] Initialized');
}

// Version
export const VERSION = '1.0.0';
