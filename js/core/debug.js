/**
 * ASDF-Web Debug Utilities
 * Environment-aware logging with module prefixes
 *
 * @example
 * import { debug, debugWarn, debugError } from './core/debug.js';
 *
 * debug('MyModule', 'Initializing...');
 * debugWarn('MyModule', 'Something fishy');
 * debugError('MyModule', 'Failed:', error);
 *
 * // Enable in browser console:
 * localStorage.setItem('DEBUG', 'true');
 *
 * // Or enable specific modules:
 * localStorage.setItem('DEBUG', 'Wallet,Game');
 *
 * @module core/debug
 */

/**
 * Check if debug mode is enabled
 * @returns {boolean|string} True, false, or comma-separated module list
 */
function getDebugSetting() {
  try {
    const setting = localStorage.getItem('DEBUG');
    if (!setting) {
      // Auto-enable on localhost
      return (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      );
    }
    return setting === 'true' ? true : setting;
  } catch {
    return false;
  }
}

/**
 * Check if a specific module should log
 * @param {string} module - Module name
 * @returns {boolean} True if module should log
 */
function shouldLog(module) {
  const setting = getDebugSetting();

  if (setting === true) return true;
  if (setting === false) return false;

  // Check if module is in the list
  const enabledModules = String(setting)
    .split(',')
    .map((m) => m.trim().toLowerCase());
  return enabledModules.includes(module.toLowerCase());
}

/**
 * Format timestamp for logs
 * @returns {string} Formatted time
 */
function formatTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
}

/**
 * Debug log - only shows in development/debug mode
 * @param {string} module - Module name (e.g., 'Wallet', 'Game')
 * @param {...any} args - Arguments to log
 */
export function debug(module, ...args) {
  if (shouldLog(module)) {
    console.log(`[${formatTime()}][${module}]`, ...args);
  }
}

/**
 * Debug warning - only shows in development/debug mode
 * @param {string} module - Module name
 * @param {...any} args - Arguments to log
 */
export function debugWarn(module, ...args) {
  if (shouldLog(module)) {
    console.warn(`[${formatTime()}][${module}]`, ...args);
  }
}

/**
 * Debug error - ALWAYS logs (errors are important)
 * @param {string} module - Module name
 * @param {...any} args - Arguments to log
 */
export function debugError(module, ...args) {
  // Errors always log regardless of debug setting
  console.error(`[${formatTime()}][${module}]`, ...args);
}

/**
 * Debug info - only shows in development/debug mode
 * @param {string} module - Module name
 * @param {...any} args - Arguments to log
 */
export function debugInfo(module, ...args) {
  if (shouldLog(module)) {
    console.info(`[${formatTime()}][${module}]`, ...args);
  }
}

/**
 * Debug table - only shows in development/debug mode
 * @param {string} module - Module name
 * @param {any} data - Data to display as table
 */
export function debugTable(module, data) {
  if (shouldLog(module)) {
    console.log(`[${formatTime()}][${module}] Table:`);
    console.table(data);
  }
}

/**
 * Debug group - creates a collapsible group
 * @param {string} module - Module name
 * @param {string} label - Group label
 */
export function debugGroup(module, label) {
  if (shouldLog(module)) {
    console.groupCollapsed(`[${formatTime()}][${module}] ${label}`);
  }
}

/**
 * Debug group end - ends the current group
 * @param {string} module - Module name
 */
export function debugGroupEnd(module) {
  if (shouldLog(module)) {
    console.groupEnd();
  }
}

/**
 * Create a scoped logger for a specific module
 * @param {string} module - Module name
 * @returns {Object} Logger object with log, warn, error, info methods
 *
 * @example
 * const log = createLogger('Wallet');
 * log.debug('Connected');
 * log.warn('Low balance');
 * log.error('Failed:', err);
 */
export function createLogger(module) {
  return {
    debug: (...args) => debug(module, ...args),
    warn: (...args) => debugWarn(module, ...args),
    error: (...args) => debugError(module, ...args),
    info: (...args) => debugInfo(module, ...args),
    table: (data) => debugTable(module, data),
    group: (label) => debugGroup(module, label),
    groupEnd: () => debugGroupEnd(module)
  };
}

/**
 * Enable debug mode programmatically
 * @param {boolean|string} value - true, false, or comma-separated module list
 */
export function enableDebug(value = true) {
  try {
    if (value === false) {
      localStorage.removeItem('DEBUG');
    } else {
      localStorage.setItem('DEBUG', String(value));
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Disable debug mode
 */
export function disableDebug() {
  enableDebug(false);
}

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.debug = debug;
  window.ASDF.debugWarn = debugWarn;
  window.ASDF.debugError = debugError;
  window.ASDF.debugInfo = debugInfo;
  window.ASDF.createLogger = createLogger;
  window.ASDF.enableDebug = enableDebug;
  window.ASDF.disableDebug = disableDebug;
}
