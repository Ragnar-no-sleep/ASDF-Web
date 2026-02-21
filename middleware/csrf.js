/**
 * CSRF Protection Middleware
 * Implements token-based CSRF prevention for state-changing requests
 *
 * Usage:
 * app.use(csrfProtection); // Attach CSRF middleware
 * app.get('/form', (req, res) => {
 *   res.send(`<form method="post"><input name="_csrf" value="${req.csrfToken()}" /></form>`);
 * });
 * app.post('/action', csrfProtection, (req, res) => { ... })
 *
 * @author CYNIC
 */

import crypto from 'crypto';

/**
 * Store for CSRF tokens (in production, use Redis or session store)
 * Format: { tokenId: { token, timestamp } }
 * Cleaned up after expiry (15 minutes)
 */
const tokenStore = new Map();
const TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL = 60 * 1000; // Run cleanup every minute

/**
 * Cleanup expired tokens periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of tokenStore.entries()) {
    if (now - data.timestamp > TOKEN_EXPIRY) {
      tokenStore.delete(id);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Generate a new CSRF token
 * @returns {string} Random token (256-bit hex)
 */
export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store a CSRF token with unique ID
 * @param {string} token - The CSRF token to store
 * @returns {string} Unique token ID for cookie
 */
export function storeToken(token) {
  const tokenId = crypto.randomBytes(16).toString('hex');
  tokenStore.set(tokenId, {
    token,
    timestamp: Date.now(),
  });
  return tokenId;
}

/**
 * Verify CSRF token and ID
 * @param {string} tokenId - Token ID from cookie
 * @param {string} token - Token from request body/header
 * @returns {boolean} True if token is valid and not expired
 */
export function verifyToken(tokenId, token) {
  if (!tokenId || !token) return false;

  const stored = tokenStore.get(tokenId);
  if (!stored) return false;

  // Check expiry
  if (Date.now() - stored.timestamp > TOKEN_EXPIRY) {
    tokenStore.delete(tokenId);
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const match = crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(token)).valueOf();

  // Remove token after use (prevents replay)
  tokenStore.delete(tokenId);

  return match;
}

/**
 * CSRF Protection Middleware
 * Generates tokens and validates them on state-changing requests
 * Uses SameSite cookies for additional protection
 *
 * @returns {Function} Express middleware
 */
export function csrfProtection(req, res, next) {
  // Generate token if not present
  const generateAndAttach = () => {
    const token = generateToken();
    const tokenId = storeToken(token);

    // Attach to request for template rendering
    res.locals.csrfToken = token;
    res.locals.csrfTokenId = tokenId;

    // Set token ID in secure, httpOnly, SameSite cookie
    res.cookie('_csrf_id', tokenId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_EXPIRY,
    });
  };

  // For GET/HEAD/OPTIONS: just generate token
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    generateAndAttach();
    return next();
  }

  // For POST/PUT/DELETE/PATCH: validate token
  const tokenId = req.cookies._csrf_id;
  const token =
    req.body._csrf ||
    req.headers['x-csrf-token'] ||
    req.headers['x-token'] ||
    req.headers['csrf-token'];

  if (!token) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF token missing',
    });
  }

  if (!verifyToken(tokenId, token)) {
    // Generate new token for retry
    generateAndAttach();

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid CSRF token',
    });
  }

  // Generate new token for next request
  generateAndAttach();
  next();
}

/**
 * Middleware to attach csrfToken() helper to req/res
 * Useful for template rendering
 *
 * @returns {Function} Express middleware
 */
export function csrfTokenGenerator(req, res, next) {
  res.locals.csrfToken = () => {
    const token = generateToken();
    const tokenId = storeToken(token);
    res.cookie('_csrf_id', tokenId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: TOKEN_EXPIRY,
    });
    return token;
  };

  next();
}

/**
 * Skip CSRF validation for specific routes
 * Useful for webhooks or API tokens that don't support CSRF
 *
 * @param {string[]} paths - Array of paths to skip
 * @returns {Function} Express middleware
 */
export function csrfSkip(paths = []) {
  return (req, res, next) => {
    if (paths.some(path => req.path.startsWith(path))) {
      return next();
    }
    csrfProtection(req, res, next);
  };
}
