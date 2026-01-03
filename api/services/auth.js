/**
 * ASDF API - Authentication Service
 *
 * Wallet-based authentication using Solana signatures
 * - Challenge/response for wallet verification
 * - JWT tokens for session management
 * - Balance verification on auth
 */

'use strict';

const jwt = require('jsonwebtoken');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const crypto = require('crypto');
const { getTokenBalance, isValidAddress } = require('./helius');

// Environment
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h';

// CRITICAL: Fail fast if JWT_SECRET is not configured properly
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error(
        'SECURITY ERROR: JWT_SECRET must be configured with at least 32 characters.\n' +
        'Set JWT_SECRET in your .env file or environment variables.\n' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
}
const CHALLENGE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// In-memory challenge store (use Redis in production)
const challenges = new Map();

// Token revocation blacklist (use Redis in production for distributed systems)
const revokedTokens = new Map();
const TOKEN_BLACKLIST_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Mutex for concurrent operations (simple implementation)
let challengeMutex = Promise.resolve();

/**
 * Generate authentication challenge
 * @param {string} wallet - Wallet address requesting auth
 * @returns {{challenge: string, expiresAt: number}}
 */
function generateChallenge(wallet) {
    if (!isValidAddress(wallet)) {
        throw new Error('Invalid wallet address');
    }

    // Generate random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const expiresAt = timestamp + CHALLENGE_EXPIRY;

    // Create challenge message
    const challenge = `ASDF Authentication\n\nWallet: ${wallet}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    // Store challenge
    challenges.set(wallet, {
        challenge,
        nonce,
        timestamp,
        expiresAt
    });

    // Cleanup old challenges periodically
    cleanupExpiredChallenges();

    return {
        challenge,
        expiresAt
    };
}

/**
 * Verify wallet signature and issue JWT
 * @param {string} wallet - Wallet address
 * @param {string} signature - Base58 encoded signature
 * @returns {Promise<{token: string, user: object}>}
 */
async function verifyAndAuthenticate(wallet, signature) {
    // Get stored challenge
    const stored = challenges.get(wallet);

    if (!stored) {
        throw new Error('No challenge found. Request a new challenge.');
    }

    if (Date.now() > stored.expiresAt) {
        challenges.delete(wallet);
        throw new Error('Challenge expired. Request a new challenge.');
    }

    // Verify signature
    const isValid = verifySignature(wallet, stored.challenge, signature);

    if (!isValid) {
        throw new Error('Invalid signature');
    }

    // Clear used challenge
    challenges.delete(wallet);

    // Get token balance from chain
    const { balance, isHolder } = await getTokenBalance(wallet);

    // Calculate tier based on XP (would come from DB in production)
    // For now, just use holder status
    const tier = calculateTier(0); // XP would come from database

    // Generate JWT
    const payload = {
        wallet,
        balance,
        isHolder,
        tier: tier.name,
        tierIndex: tier.index
    };

    const token = jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRY });

    return {
        token,
        user: payload
    };
}

/**
 * Verify a Solana wallet signature
 * @param {string} wallet - Wallet public key (base58)
 * @param {string} message - Original message that was signed
 * @param {string} signature - Signature (base58)
 * @returns {boolean}
 */
function verifySignature(wallet, message, signature) {
    try {
        const publicKey = bs58.decode(wallet);
        const signatureBytes = bs58.decode(signature);
        const messageBytes = new TextEncoder().encode(message);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {{valid: boolean, payload?: object, error?: string}}
 */
function verifyToken(token) {
    try {
        // Check if token is revoked first
        if (isTokenRevoked(token)) {
            return { valid: false, error: 'Token has been revoked' };
        }

        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        return { valid: true, payload };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { valid: false, error: 'Token expired' };
        }
        return { valid: false, error: 'Invalid token' };
    }
}

/**
 * Revoke a token (logout)
 * @param {string} token - JWT token to revoke
 * @returns {{success: boolean, error?: string}}
 */
function revokeToken(token) {
    try {
        // Decode without verifying to get expiry
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.exp) {
            return { success: false, error: 'Invalid token format' };
        }

        // Store token hash (not the actual token) with its expiry
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = decoded.exp * 1000; // Convert to ms

        // Only store if not already expired
        if (Date.now() < expiresAt) {
            revokedTokens.set(tokenHash, expiresAt);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to revoke token' };
    }
}

/**
 * Check if a token is revoked
 * @param {string} token - JWT token
 * @returns {boolean}
 */
function isTokenRevoked(token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return revokedTokens.has(tokenHash);
}

/**
 * Cleanup expired revoked tokens
 */
function cleanupRevokedTokens() {
    const now = Date.now();
    let cleaned = 0;

    for (const [hash, expiry] of revokedTokens.entries()) {
        if (now > expiry) {
            revokedTokens.delete(hash);
            cleaned++;
        }
    }

    if (cleaned > 0 && process.env.NODE_ENV !== 'production') {
        console.log(`[Auth] Cleaned ${cleaned} expired revoked tokens`);
    }
}

// Start cleanup interval for revoked tokens
setInterval(cleanupRevokedTokens, TOKEN_BLACKLIST_CLEANUP_INTERVAL);

/**
 * Refresh token with updated balance
 * @param {string} token - Current valid token
 * @returns {Promise<{token: string, user: object}>}
 */
async function refreshToken(token) {
    const { valid, payload, error } = verifyToken(token);

    if (!valid) {
        throw new Error(error);
    }

    // Get fresh balance
    const { balance, isHolder } = await getTokenBalance(payload.wallet);

    // Get XP from database (would be implemented)
    const xp = 0; // await db.getUserXP(payload.wallet);
    const tier = calculateTier(xp);

    const newPayload = {
        wallet: payload.wallet,
        balance,
        isHolder,
        tier: tier.name,
        tierIndex: tier.index
    };

    const newToken = jwt.sign(newPayload, JWT_SECRET, { algorithm: 'HS256', expiresIn: JWT_EXPIRY });

    return {
        token: newToken,
        user: newPayload
    };
}

/**
 * Calculate tier from XP
 * Uses Fibonacci thresholds from ASDF system
 * @param {number} xp - Total XP
 * @returns {{index: number, name: string}}
 */
function calculateTier(xp) {
    const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
    const tiers = ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'];
    const numTiers = 5;

    // Threshold = fib[tier * numTiers]
    for (let i = numTiers - 1; i >= 0; i--) {
        const threshold = fib[i * numTiers] || 0;
        if (xp >= threshold) {
            return { index: i, name: tiers[i] };
        }
    }

    return { index: 0, name: 'EMBER' };
}

// Cookie name for JWT storage (must match index.js)
const JWT_COOKIE_NAME = 'asdf_auth';

/**
 * Extract JWT token from request
 * Checks httpOnly cookie first (secure), then Authorization header (legacy fallback)
 * @param {object} req - Express request object
 * @returns {string|null}
 */
function extractToken(req) {
    // Primary: httpOnly cookie (set by cookie-parser middleware)
    if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
        return req.cookies[JWT_COOKIE_NAME];
    }

    // Fallback: Authorization header (for legacy clients during migration)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    return null;
}

/**
 * Express middleware for JWT authentication
 * Supports both httpOnly cookie and Authorization header
 */
function authMiddleware(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const { valid, payload, error } = verifyToken(token);

    if (!valid) {
        return res.status(401).json({ error });
    }

    req.user = payload;
    next();
}

/**
 * Optional auth middleware (doesn't fail if no token)
 * Supports both httpOnly cookie and Authorization header
 */
function optionalAuthMiddleware(req, res, next) {
    const token = extractToken(req);

    if (token) {
        const { valid, payload } = verifyToken(token);

        if (valid) {
            req.user = payload;
        }
    }

    next();
}

/**
 * Cleanup expired challenges with mutex to prevent race conditions
 */
async function cleanupExpiredChallenges() {
    // Use mutex to prevent concurrent cleanup operations
    challengeMutex = challengeMutex.then(() => {
        const now = Date.now();
        let cleaned = 0;
        for (const [wallet, data] of challenges.entries()) {
            if (now > data.expiresAt) {
                challenges.delete(wallet);
                cleaned++;
            }
        }
        if (cleaned > 0 && process.env.NODE_ENV !== 'production') {
            console.log(`[Auth] Cleaned ${cleaned} expired challenges`);
        }
    }).catch(() => {
        // Silently handle cleanup errors
    });
    return challengeMutex;
}

module.exports = {
    generateChallenge,
    verifyAndAuthenticate,
    verifyToken,
    refreshToken,
    revokeToken,
    isTokenRevoked,
    calculateTier,
    extractToken,
    authMiddleware,
    optionalAuthMiddleware,
    JWT_COOKIE_NAME
};
