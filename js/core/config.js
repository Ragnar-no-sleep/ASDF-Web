/**
 * ASDF-Web Configuration System
 * Configuration loader with deep merge and environment awareness
 *
 * Pattern: particles.js
 * Philosophy: Sensible defaults, user overrides, external config
 *
 * @example
 * import { loadConfig, getConfig, setConfig } from './core/config.js';
 *
 * // Load external config (merges with defaults)
 * await loadConfig('/config/app.json');
 *
 * // Get config value with fallback
 * const timeout = getConfig('api.timeout', 30000);
 *
 * // Set runtime config
 * setConfig('audio.enabled', false);
 *
 * @module core/config
 */

/**
 * Golden ratio constant for calculations
 */
const PHI = 1.618033988749895;

/**
 * Default configuration
 * These are sensible defaults that work out of the box
 */
const DEFAULTS = {
  // API Configuration
  api: {
    baseUrl: '/api',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000
  },

  // Audio Configuration
  audio: {
    enabled: true,
    volume: 0.3,
    baseFrequency: 432
  },

  // Game Configuration
  game: {
    maxScore: 999999,
    sessionTimeout: 300000, // 5 minutes
    antiCheatEnabled: true
  },

  // UI Configuration
  ui: {
    theme: 'dark',
    animations: true,
    toastDuration: 3000,
    modalAnimationDuration: 300
  },

  // Solana Configuration
  solana: {
    network: 'mainnet-beta',
    commitment: 'confirmed',
    confirmTimeout: 60000
  },

  // Timing Configuration (Fibonacci-based)
  timing: {
    tick: 100, // Base tick
    fast: 300, // Fast animation
    medium: 500, // Medium animation
    slow: 800, // Slow animation
    slower: 1300, // Slower animation
    slowest: 2100 // Slowest animation
  },

  // Debug Configuration
  debug: {
    enabled: false,
    logLevel: 'warn', // 'debug', 'info', 'warn', 'error'
    showEventBus: false
  },

  // Feature Flags
  features: {
    audioFeedback: true,
    websocketReconnect: true,
    offlineMode: false
  },

  // Phi Constants (for calculations)
  phi: {
    value: PHI,
    inverse: 1 / PHI, // 0.618...
    squared: PHI * PHI, // 2.618...
    inverseSquared: 1 / (PHI * PHI) // 0.382...
  }
};

/**
 * Current configuration state
 * @type {Object}
 */
let config = deepClone(DEFAULTS);

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);

  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Deep merge two objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object (overrides target)
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;

  const output = deepClone(target);

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        output[key] = deepClone(sourceValue);
      }
    }
  }

  return output;
}

/**
 * Load configuration from a JSON file
 * Merges loaded config with existing config
 *
 * @param {string} path - Path to JSON config file
 * @returns {Promise<Object>} Merged configuration
 */
export async function loadConfig(path) {
  try {
    const response = await fetch(path);

    if (!response.ok) {
      console.warn(`[Config] Failed to load: ${path} (${response.status})`);
      return config;
    }

    const userConfig = await response.json();
    config = deepMerge(config, userConfig);

    if (config.debug.enabled) {
      console.log('[Config] Loaded:', path);
    }

    return config;
  } catch (error) {
    console.warn(`[Config] Error loading ${path}:`, error.message);
    return config;
  }
}

/**
 * Get a config value by path
 *
 * @param {string} path - Dot-notation path (e.g., 'api.timeout')
 * @param {any} defaultValue - Value to return if path not found
 * @returns {any} Config value or default
 *
 * @example
 * getConfig('api.timeout'); // 30000
 * getConfig('api.missing', 'fallback'); // 'fallback'
 * getConfig('timing'); // { tick: 100, fast: 300, ... }
 */
export function getConfig(path, defaultValue) {
  if (!path) return config;

  const keys = path.split('.');
  let value = config;

  for (const key of keys) {
    if (value === undefined || value === null) {
      return defaultValue;
    }
    value = value[key];
  }

  return value !== undefined ? value : defaultValue;
}

/**
 * Set a config value by path
 *
 * @param {string} path - Dot-notation path (e.g., 'audio.enabled')
 * @param {any} value - Value to set
 *
 * @example
 * setConfig('audio.enabled', false);
 * setConfig('debug.enabled', true);
 */
export function setConfig(path, value) {
  if (!path) return;

  const keys = path.split('.');
  let obj = config;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!obj[key] || typeof obj[key] !== 'object') {
      obj[key] = {};
    }
    obj = obj[key];
  }

  obj[keys[keys.length - 1]] = value;

  if (config.debug.enabled) {
    console.log(`[Config] Set: ${path} =`, value);
  }
}

/**
 * Reset configuration to defaults
 */
export function resetConfig() {
  config = deepClone(DEFAULTS);
  if (config.debug.enabled) {
    console.log('[Config] Reset to defaults');
  }
}

/**
 * Get the full configuration object
 * @returns {Object} Current configuration
 */
export function getAllConfig() {
  return deepClone(config);
}

/**
 * Merge additional config into current config
 * @param {Object} additionalConfig - Config to merge
 * @returns {Object} Updated configuration
 */
export function mergeConfig(additionalConfig) {
  config = deepMerge(config, additionalConfig);
  return config;
}

/**
 * Check if a feature flag is enabled
 * @param {string} feature - Feature name
 * @returns {boolean} True if feature is enabled
 */
export function isFeatureEnabled(feature) {
  return Boolean(getConfig(`features.${feature}`, false));
}

/**
 * Get timing value by name
 * @param {string} name - Timing name ('fast', 'medium', 'slow', etc.)
 * @returns {number} Timing in milliseconds
 */
export function getTiming(name) {
  return getConfig(`timing.${name}`, getConfig('timing.medium', 500));
}

/**
 * Get phi-based value
 * @param {string} type - 'value', 'inverse', 'squared', 'inverseSquared'
 * @returns {number} Phi constant
 */
export function getPhi(type = 'value') {
  return getConfig(`phi.${type}`, PHI);
}

// Export defaults for reference
export { DEFAULTS };

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.config = {
    load: loadConfig,
    get: getConfig,
    set: setConfig,
    reset: resetConfig,
    getAll: getAllConfig,
    merge: mergeConfig,
    isFeatureEnabled,
    getTiming,
    getPhi,
    DEFAULTS
  };
}
