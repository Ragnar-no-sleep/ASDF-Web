/**
 * ASDF-Web Error Registry
 * Centralized error catalog for consistent error handling
 *
 * Pattern: beekeeper-studio
 * Philosophy: Don't trust, verify. Every error has a code.
 *
 * @example
 * import { errors, getError, createError } from './core/errors.js';
 *
 * // Use predefined error
 * throw errors.WALLET_NOT_CONNECTED;
 *
 * // Get error by code (safe fallback)
 * const err = getError('UNKNOWN_CODE'); // Returns default error
 *
 * // Create custom error with context
 * const err = createError('RPC_ERROR', { endpoint: 'mainnet' });
 *
 * @module core/errors
 */

/**
 * Error definition structure
 * @typedef {Object} ASDFError
 * @property {string} code - Unique error code
 * @property {string} name - Human-readable error name
 * @property {string} message - User-friendly error message
 * @property {string|null} action - Suggested action ('retry', 'connect', 'wait', null)
 * @property {string} [severity] - Error severity ('info', 'warning', 'error', 'critical')
 */

/**
 * Centralized error catalog
 * @type {Object<string, ASDFError>}
 */
export const errors = {
  // ============================================
  // WALLET ERRORS
  // ============================================
  WALLET_NOT_CONNECTED: {
    code: 'WALLET_NOT_CONNECTED',
    name: 'Wallet Required',
    message: 'Please connect your wallet to continue.',
    action: 'connect',
    severity: 'warning'
  },
  WALLET_REJECTED: {
    code: 'WALLET_REJECTED',
    name: 'Transaction Rejected',
    message: 'You rejected the transaction in your wallet.',
    action: null,
    severity: 'info'
  },
  WALLET_TIMEOUT: {
    code: 'WALLET_TIMEOUT',
    name: 'Wallet Timeout',
    message: 'Wallet did not respond in time. Please try again.',
    action: 'retry',
    severity: 'warning'
  },
  WALLET_NOT_FOUND: {
    code: 'WALLET_NOT_FOUND',
    name: 'No Wallet Found',
    message: 'No Solana wallet detected. Please install Phantom or Solflare.',
    action: null,
    severity: 'error'
  },
  WALLET_WRONG_NETWORK: {
    code: 'WALLET_WRONG_NETWORK',
    name: 'Wrong Network',
    message: 'Please switch your wallet to Solana mainnet.',
    action: null,
    severity: 'warning'
  },

  // ============================================
  // NETWORK ERRORS
  // ============================================
  RPC_TIMEOUT: {
    code: 'RPC_TIMEOUT',
    name: 'Network Timeout',
    message: 'Failed to connect to Solana. Please try again.',
    action: 'retry',
    severity: 'error'
  },
  RPC_RATE_LIMITED: {
    code: 'RPC_RATE_LIMITED',
    name: 'Rate Limited',
    message: 'Too many requests. Please wait a moment.',
    action: 'wait',
    severity: 'warning'
  },
  RPC_ERROR: {
    code: 'RPC_ERROR',
    name: 'Network Error',
    message: 'Connection to Solana failed. Check your internet.',
    action: 'retry',
    severity: 'error'
  },
  RPC_UNAVAILABLE: {
    code: 'RPC_UNAVAILABLE',
    name: 'Service Unavailable',
    message: 'Solana network is temporarily unavailable.',
    action: 'wait',
    severity: 'critical'
  },

  // ============================================
  // TRANSACTION ERRORS
  // ============================================
  TX_FAILED: {
    code: 'TX_FAILED',
    name: 'Transaction Failed',
    message: 'Transaction could not be processed. No funds were deducted.',
    action: 'retry',
    severity: 'error'
  },
  TX_EXPIRED: {
    code: 'TX_EXPIRED',
    name: 'Transaction Expired',
    message: 'Transaction took too long and expired. Please try again.',
    action: 'retry',
    severity: 'warning'
  },
  TX_INSUFFICIENT_FUNDS: {
    code: 'TX_INSUFFICIENT_FUNDS',
    name: 'Insufficient Funds',
    message: 'Not enough SOL for transaction fees.',
    action: null,
    severity: 'error'
  },
  TX_SIMULATION_FAILED: {
    code: 'TX_SIMULATION_FAILED',
    name: 'Simulation Failed',
    message: 'Transaction simulation failed. The operation cannot be completed.',
    action: null,
    severity: 'error'
  },

  // ============================================
  // GAME ERRORS
  // ============================================
  GAME_SESSION_EXPIRED: {
    code: 'GAME_SESSION_EXPIRED',
    name: 'Session Expired',
    message: 'Your game session has expired. Start a new game.',
    action: 'restart',
    severity: 'warning'
  },
  GAME_SESSION_INVALID: {
    code: 'GAME_SESSION_INVALID',
    name: 'Invalid Session',
    message: 'Game session is not valid. Please start a new game.',
    action: 'restart',
    severity: 'error'
  },
  SCORE_VALIDATION_FAILED: {
    code: 'SCORE_VALIDATION_FAILED',
    name: 'Invalid Score',
    message: 'Score could not be validated. Please try again.',
    action: 'retry',
    severity: 'error'
  },
  GAME_NOT_FOUND: {
    code: 'GAME_NOT_FOUND',
    name: 'Game Not Found',
    message: 'This game is not available.',
    action: null,
    severity: 'error'
  },
  GAME_LOAD_FAILED: {
    code: 'GAME_LOAD_FAILED',
    name: 'Game Load Failed',
    message: 'Could not load game assets. Please refresh the page.',
    action: 'retry',
    severity: 'error'
  },

  // ============================================
  // SHOP ERRORS
  // ============================================
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    name: 'Insufficient Balance',
    message: "You don't have enough ASDF tokens for this purchase.",
    action: null,
    severity: 'warning'
  },
  ITEM_NOT_AVAILABLE: {
    code: 'ITEM_NOT_AVAILABLE',
    name: 'Item Unavailable',
    message: 'This item is no longer available.',
    action: null,
    severity: 'warning'
  },
  ITEM_ALREADY_OWNED: {
    code: 'ITEM_ALREADY_OWNED',
    name: 'Already Owned',
    message: 'You already own this item.',
    action: null,
    severity: 'info'
  },
  PURCHASE_FAILED: {
    code: 'PURCHASE_FAILED',
    name: 'Purchase Failed',
    message: 'Transaction failed. Your tokens were not spent.',
    action: 'retry',
    severity: 'error'
  },
  PURCHASE_PENDING: {
    code: 'PURCHASE_PENDING',
    name: 'Purchase Pending',
    message: 'A purchase is already in progress. Please wait.',
    action: 'wait',
    severity: 'info'
  },

  // ============================================
  // AUTH ERRORS
  // ============================================
  AUTH_EXPIRED: {
    code: 'AUTH_EXPIRED',
    name: 'Session Expired',
    message: 'Your session has expired. Please reconnect your wallet.',
    action: 'reconnect',
    severity: 'warning'
  },
  AUTH_INVALID: {
    code: 'AUTH_INVALID',
    name: 'Invalid Signature',
    message: 'Wallet signature could not be verified.',
    action: 'retry',
    severity: 'error'
  },
  AUTH_CHALLENGE_FAILED: {
    code: 'AUTH_CHALLENGE_FAILED',
    name: 'Challenge Failed',
    message: 'Could not generate authentication challenge.',
    action: 'retry',
    severity: 'error'
  },

  // ============================================
  // API ERRORS
  // ============================================
  API_ERROR: {
    code: 'API_ERROR',
    name: 'API Error',
    message: 'Server error occurred. Please try again later.',
    action: 'retry',
    severity: 'error'
  },
  API_NOT_FOUND: {
    code: 'API_NOT_FOUND',
    name: 'Not Found',
    message: 'The requested resource was not found.',
    action: null,
    severity: 'error'
  },
  API_VALIDATION: {
    code: 'API_VALIDATION',
    name: 'Validation Error',
    message: 'Invalid request data. Please check your input.',
    action: null,
    severity: 'warning'
  },

  // ============================================
  // GENERIC ERRORS
  // ============================================
  UNKNOWN: {
    code: 'UNKNOWN',
    name: 'Unknown Error',
    message: 'Something went wrong. Please try again.',
    action: 'retry',
    severity: 'error'
  },
  OFFLINE: {
    code: 'OFFLINE',
    name: 'Offline',
    message: 'You appear to be offline. Check your connection.',
    action: null,
    severity: 'warning'
  },
  MAINTENANCE: {
    code: 'MAINTENANCE',
    name: 'Under Maintenance',
    message: 'The service is temporarily under maintenance.',
    action: 'wait',
    severity: 'info'
  }
};

/**
 * Get error by code with safe fallback
 * @param {string} code - Error code
 * @returns {ASDFError} Error object (returns UNKNOWN if not found)
 */
export function getError(code) {
  return errors[code] || errors.UNKNOWN;
}

/**
 * Create error with additional context
 * @param {string} code - Error code
 * @param {Object} context - Additional context data
 * @returns {ASDFError & {context: Object}} Error with context
 */
export function createError(code, context = {}) {
  const baseError = getError(code);
  return {
    ...baseError,
    context,
    timestamp: Date.now()
  };
}

/**
 * Check if an object is an ASDF error
 * @param {any} obj - Object to check
 * @returns {boolean} True if valid ASDF error
 */
export function isASDFError(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.code === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.message === 'string'
  );
}

/**
 * Get error severity color for UI
 * @param {string} severity - Error severity
 * @returns {string} CSS color variable
 */
export function getSeverityColor(severity) {
  const colors = {
    info: 'var(--asdf-blue, #3b82f6)',
    warning: 'var(--asdf-gold, #f59e0b)',
    error: 'var(--asdf-orange, #ea4e33)',
    critical: 'var(--asdf-red, #ef4444)'
  };
  return colors[severity] || colors.error;
}

/**
 * Get error severity icon for UI
 * @param {string} severity - Error severity
 * @returns {string} Icon character/emoji
 */
export function getSeverityIcon(severity) {
  const icons = {
    info: 'i',
    warning: '!',
    error: 'x',
    critical: '!!'
  };
  return icons[severity] || icons.error;
}

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.errors = errors;
  window.ASDF.getError = getError;
  window.ASDF.createError = createError;
}
