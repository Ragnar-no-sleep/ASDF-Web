/**
 * Shared Route Helpers
 *
 * Utilities used across multiple route modules.
 * Extracted from index.js during modularization.
 *
 * @module routes/helpers
 */

'use strict';

const isProduction = process.env.NODE_ENV === 'production';

// ============================================
// JWT COOKIE CONFIGURATION
// ============================================

const JWT_COOKIE_NAME = 'asdf_auth';
const JWT_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' : 'lax',
  path: '/api',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

function setAuthCookie(res, token) {
  res.cookie(JWT_COOKIE_NAME, token, JWT_COOKIE_OPTIONS);
}

function clearAuthCookie(res) {
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api',
  });
}

function getAuthToken(req) {
  if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
    return req.cookies[JWT_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// ============================================
// ERROR SANITIZATION
// ============================================

function sanitizeError(error, context = 'unknown') {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] Error:`, message);

  if (!isProduction) return message;

  const lowerMessage = message.toLowerCase();

  const safePatterns = [
    'not found',
    'already owned',
    'insufficient balance',
    'invalid wallet',
    'item not',
    'requires higher',
    'purchase expired',
    'signature required',
    'already used',
    'cannot purchase',
    'cannot unequip',
  ];

  for (const pattern of safePatterns) {
    if (lowerMessage.includes(pattern)) return message;
  }

  if (lowerMessage.includes('jwt') || lowerMessage.includes('token')) return 'Authentication error';
  if (lowerMessage.includes('database') || lowerMessage.includes('sql')) return 'Database error';
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('helius')
  )
    return 'Network error';

  return 'Internal server error';
}

module.exports = {
  JWT_COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  getAuthToken,
  sanitizeError,
  isProduction,
};
