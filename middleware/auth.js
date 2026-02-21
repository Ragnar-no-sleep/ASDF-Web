/**
 * Authentication Middleware
 * JWT token validation for protected endpoints
 *
 * Usage:
 * app.post('/api/protected', requireAuth, (req, res) => { ... })
 *
 * Token format: Authorization: Bearer <jwt>
 *
 * @author CYNIC
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Generate JWT token for authenticated user
 * @param {Object} payload - User data to encode
 * @returns {string} JWT token
 */
export function generateToken(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be a non-empty object');
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token without 'Bearer ' prefix
 * @returns {Object|null} Decoded payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    return null;
  }
}

/**
 * Middleware: Require valid JWT token
 * Populates req.user with decoded JWT payload
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
      });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Authorization header format (use "Bearer <token>")',
      });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid or expired token',
      });
    }

    // Attach user to request
    req.user = payload;
    req.token = token;

    next();
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication check failed',
    });
  }
}

/**
 * Middleware: Optional auth (attach user if valid token, proceed anyway)
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (scheme === 'Bearer' && token) {
        const payload = verifyToken(token);
        if (payload) {
          req.user = payload;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // Silently continue if optional auth fails
    next();
  }
}

/**
 * Middleware: Require specific role
 * @param {...string} roles - Required roles
 * @returns {Function} Express middleware
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
}

/**
 * Middleware: Require specific permission
 * @param {...string} permissions - Required permissions
 * @returns {Function} Express middleware
 */
export function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userPerms = req.user.permissions || [];
    const hasPermission = permissions.some(perm => userPerms.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required permission: ${permissions.join(' or ')}`,
      });
    }

    next();
  };
}

/**
 * Middleware: Rate limit per authenticated user
 * @param {number} limit - Max requests
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware
 */
export function rateLimitPerUser(limit = 100, windowMs = 60000) {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    const window = requests.get(userId) || [];

    // Remove old requests outside window
    const recentRequests = window.filter(timestamp => now - timestamp < windowMs);

    if (recentRequests.length >= limit) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded: ${limit} requests per ${windowMs / 1000}s`,
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000),
      });
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
}
