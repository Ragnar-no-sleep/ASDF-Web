/**
 * CSRF Protection Middleware
 * Implements token-based CSRF prevention for state-changing requests
 *
 * Usage:
 * const { csrfProtection, generateToken } = require('./middleware/csrf');
 * app.get('/form', (req, res) => {
 *   const token = generateToken();
 *   res.json({ csrfToken: token });
 * });
 * app.post('/action', csrfProtection, (req, res) => { ... })
 *
 * Token can be sent via:
 * - x-csrf-token header
 * - X-CSRF-Token header
 * - _csrf body parameter
 *
 * @author CYNIC
 */

'use strict';

const crypto = require('crypto');

/**
 * Store for CSRF tokens (in production, use Redis or session store)
 * Format: { token: { signature, timestamp } }
 * Cleaned up after expiry (1 hour)
 */
const tokenStore = new Map();
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Run cleanup every 5 minutes

/**
 * Cleanup expired tokens periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (now - data.timestamp > TOKEN_EXPIRY) {
      tokenStore.delete(token);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Generate a new CSRF token (256-bit random hex)
 * @returns {string} Random token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store a CSRF token
 * @param {string} token - The CSRF token to store
 * @returns {boolean} True if stored successfully
 */
function storeToken(token) {
  if (!token || typeof token !== 'string' || token.length < 32) {
    return false;
  }
  tokenStore.set(token, {
    timestamp: Date.now(),
  });
  return true;
}

/**
 * Verify CSRF token
 * @param {string} token - Token from request body/header
 * @returns {boolean} True if token is valid and not expired
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const stored = tokenStore.get(token);
  if (!stored) {
    return false;
  }

  // Check expiry
  if (Date.now() - stored.timestamp > TOKEN_EXPIRY) {
    tokenStore.delete(token);
    return false;
  }

  // Remove token after use (prevents replay)
  tokenStore.delete(token);

  return true;
}

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens on state-changing requests (POST, PUT, DELETE, PATCH)
 * For GET/HEAD/OPTIONS: passes through without validation
 *
 * @returns {Function} Express middleware
 */
function csrfProtection(req, res, next) {
  // For GET/HEAD/OPTIONS: pass through
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // For state-changing requests: validate CSRF token
  const token = req.headers['x-csrf-token'] || req.headers['x-token'] || req.body?._csrf;

  if (!token) {
    return res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token is required for state-changing requests',
    });
  }

  if (!verifyToken(token)) {
    return res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token is invalid or expired',
    });
  }

  next();
}

module.exports = {
  generateToken,
  storeToken,
  verifyToken,
  csrfProtection,
};
