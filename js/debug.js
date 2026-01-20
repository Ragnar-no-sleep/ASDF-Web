/**
 * Debug utility - Only logs in development mode
 *
 * Usage:
 *   import { debug, debugWarn, debugError } from './debug.js';
 *   debug('MyModule', 'Initializing...');
 *   debugWarn('MyModule', 'Something fishy');
 *   debugError('MyModule', 'Failed:', error);
 *
 * Enable in browser console:
 *   localStorage.setItem('DEBUG', 'true');
 *
 * Disable:
 *   localStorage.removeItem('DEBUG');
 */

const isDebugEnabled = () => {
  try {
    return localStorage.getItem('DEBUG') === 'true' ||
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

export function debug(module, ...args) {
  if (isDebugEnabled()) {
    console.log(`[${module}]`, ...args);
  }
}

export function debugWarn(module, ...args) {
  if (isDebugEnabled()) {
    console.warn(`[${module}]`, ...args);
  }
}

export function debugError(module, ...args) {
  // Errors always log
  console.error(`[${module}]`, ...args);
}

// For non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.debug = debug;
  window.ASDF.debugWarn = debugWarn;
  window.ASDF.debugError = debugError;
}
