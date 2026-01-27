/**
 * Debug utility for API services
 *
 * Usage:
 *   const { debug, debugWarn, debugError } = require('./debug');
 *   debug('Auth', 'Token verified');
 *   debugWarn('Cache', 'High memory usage');
 *   debugError('Helius', 'RPC failed:', error);
 *
 * Environment:
 *   - Production: Only errors logged
 *   - Development: All logs enabled
 *   - DEBUG=true: Force all logs in any environment
 */

const isProduction = process.env.NODE_ENV === 'production';
const forceDebug = process.env.DEBUG === 'true';

function debug(module, ...args) {
  if (!isProduction || forceDebug) {
    console.log(`[${module}]`, ...args);
  }
}

function debugWarn(module, ...args) {
  // Warnings always log (important for ops)
  console.warn(`[${module}]`, ...args);
}

function debugError(module, ...args) {
  // Errors always log
  console.error(`[${module}]`, ...args);
}

// Startup log - always shows
function startup(module, ...args) {
  console.log(`[${module}]`, ...args);
}

module.exports = {
  debug,
  debugWarn,
  debugError,
  startup
};
