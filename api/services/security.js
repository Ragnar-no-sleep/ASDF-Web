/**
 * ASDF API - Advanced Security Service
 *
 * Production-grade security features:
 * - Request signature verification (HMAC)
 * - Nonce-based replay protection
 * - Timestamp validation
 * - Admin role verification
 *
 * Security by Design:
 * - All sensitive operations require signed requests
 * - Nonces prevent replay attacks
 * - Timestamps prevent delayed attacks
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

// Request signing config
const SIGNING_CONFIG = {
    algorithm: 'sha256',
    maxTimestampAge: 5 * 60 * 1000,  // 5 minutes max age
    nonceExpiry: 10 * 60 * 1000,     // 10 minutes nonce validity
    headerPrefix: 'X-ASDF-'
};

// Admin wallets (should be in env or database in production)
const ADMIN_WALLETS = new Set(
    (process.env.ADMIN_WALLETS || '').split(',').filter(w => w.length > 0)
);

// Used nonces for replay protection
const usedNonces = new Map();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// ============================================
// NONCE MANAGEMENT
// ============================================

/**
 * Generate a secure nonce
 * @returns {string} Random nonce
 */
function generateNonce() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Validate and consume a nonce
 * @param {string} nonce - Nonce to validate
 * @param {string} wallet - Associated wallet
 * @returns {{valid: boolean, error?: string}}
 */
function validateNonce(nonce, wallet) {
    if (!nonce || typeof nonce !== 'string') {
        return { valid: false, error: 'Nonce required' };
    }

    // Check format (32 hex chars)
    if (!/^[a-f0-9]{32}$/i.test(nonce)) {
        return { valid: false, error: 'Invalid nonce format' };
    }

    const key = `${wallet}:${nonce}`;

    // Check if already used
    if (usedNonces.has(key)) {
        logAudit('nonce_reuse_attempt', { wallet: wallet.slice(0, 8) + '...', nonce: nonce.slice(0, 8) });
        return { valid: false, error: 'Nonce already used' };
    }

    // Mark as used with expiry
    usedNonces.set(key, Date.now() + SIGNING_CONFIG.nonceExpiry);

    return { valid: true };
}

/**
 * Cleanup expired nonces
 */
function cleanupNonces() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiry] of usedNonces.entries()) {
        if (now > expiry) {
            usedNonces.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[Security] Cleaned ${cleaned} expired nonces`);
    }
}

// Start cleanup interval
setInterval(cleanupNonces, CLEANUP_INTERVAL);

// ============================================
// REQUEST SIGNING
// ============================================

/**
 * Create a signature for request data
 * @param {Object} data - Data to sign
 * @param {string} secret - Signing secret (wallet private key derived)
 * @returns {string} HMAC signature
 */
function createSignature(data, secret) {
    const payload = JSON.stringify(sortObject(data));
    return crypto.createHmac(SIGNING_CONFIG.algorithm, secret)
        .update(payload)
        .digest('hex');
}

/**
 * Verify a request signature
 * @param {Object} data - Request data
 * @param {string} signature - Provided signature
 * @param {string} secret - Expected secret
 * @returns {boolean}
 */
function verifySignature(data, signature, secret) {
    const expected = createSignature(data, secret);

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        );
    } catch {
        return false;
    }
}

/**
 * Sort object keys for consistent signing
 */
function sortObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sortObject);
    }

    return Object.keys(obj).sort().reduce((sorted, key) => {
        sorted[key] = sortObject(obj[key]);
        return sorted;
    }, {});
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Middleware: Verify signed requests
 * Requires headers:
 * - X-ASDF-Timestamp: Unix timestamp (ms)
 * - X-ASDF-Nonce: Random nonce
 * - X-ASDF-Signature: HMAC of body + timestamp + nonce
 */
function requireSignedRequest(req, res, next) {
    const timestamp = req.headers['x-asdf-timestamp'];
    const nonce = req.headers['x-asdf-nonce'];
    const signature = req.headers['x-asdf-signature'];

    // Check all headers present
    if (!timestamp || !nonce || !signature) {
        return res.status(401).json({
            error: 'Signed request required',
            required: ['X-ASDF-Timestamp', 'X-ASDF-Nonce', 'X-ASDF-Signature']
        });
    }

    // Validate timestamp
    const ts = parseInt(timestamp, 10);
    const now = Date.now();

    if (isNaN(ts) || Math.abs(now - ts) > SIGNING_CONFIG.maxTimestampAge) {
        logAudit('signature_timestamp_invalid', {
            wallet: req.user?.wallet?.slice(0, 8) + '...',
            drift: now - ts
        });
        return res.status(401).json({ error: 'Request timestamp expired or invalid' });
    }

    // Validate nonce
    const wallet = req.user?.wallet;
    if (!wallet) {
        return res.status(401).json({ error: 'Authentication required before signed request' });
    }

    const nonceResult = validateNonce(nonce, wallet);
    if (!nonceResult.valid) {
        return res.status(401).json({ error: nonceResult.error });
    }

    // Build signing payload
    const signingData = {
        method: req.method,
        path: req.path,
        timestamp: ts,
        nonce: nonce,
        body: req.body || {}
    };

    // For now, we use the wallet address as part of the secret
    // In production, this would be a derived key from wallet signature
    const secret = `${wallet}:${process.env.API_SIGNING_SECRET || 'dev-secret'}`;

    if (!verifySignature(signingData, signature, secret)) {
        logAudit('signature_invalid', {
            wallet: wallet.slice(0, 8) + '...',
            path: req.path
        });
        return res.status(401).json({ error: 'Invalid request signature' });
    }

    // Signature valid
    req.signedRequest = true;
    next();
}

/**
 * Middleware: Require admin role
 */
function requireAdmin(req, res, next) {
    const wallet = req.user?.wallet;

    if (!wallet) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!ADMIN_WALLETS.has(wallet)) {
        logAudit('admin_access_denied', { wallet: wallet.slice(0, 8) + '...' });
        return res.status(403).json({ error: 'Admin access required' });
    }

    req.isAdmin = true;
    logAudit('admin_access', { wallet: wallet.slice(0, 8) + '...', path: req.path });
    next();
}

/**
 * Middleware: Optional signature verification
 * Doesn't fail if not signed, but marks request
 */
function optionalSignedRequest(req, res, next) {
    const signature = req.headers['x-asdf-signature'];

    if (!signature) {
        req.signedRequest = false;
        return next();
    }

    // If signature provided, validate it
    return requireSignedRequest(req, res, next);
}

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Hash sensitive data for logging
 * @param {string} data - Data to hash
 * @returns {string} Truncated hash
 */
function hashForLog(data) {
    if (!data) return 'null';
    return crypto.createHash('sha256')
        .update(String(data))
        .digest('hex')
        .slice(0, 8);
}

/**
 * Check if IP is in blocklist
 * @param {string} ip - IP address
 * @returns {boolean}
 */
const ipBlocklist = new Set();

function isBlocked(ip) {
    return ipBlocklist.has(ip);
}

/**
 * Block an IP address
 * @param {string} ip - IP to block
 * @param {string} reason - Reason for block
 */
function blockIP(ip, reason) {
    ipBlocklist.add(ip);
    logAudit('ip_blocked', { ip: hashForLog(ip), reason });
    console.warn(`[Security] Blocked IP: ${hashForLog(ip)} - ${reason}`);
}

/**
 * Get security metrics
 * @returns {Object}
 */
function getSecurityMetrics() {
    return {
        activeNonces: usedNonces.size,
        blockedIPs: ipBlocklist.size,
        adminWallets: ADMIN_WALLETS.size,
        config: {
            maxTimestampAge: SIGNING_CONFIG.maxTimestampAge,
            nonceExpiry: SIGNING_CONFIG.nonceExpiry
        }
    };
}

/**
 * Check if wallet is admin
 * @param {string} wallet - Wallet address
 * @returns {boolean}
 */
function isAdmin(wallet) {
    return ADMIN_WALLETS.has(wallet);
}

module.exports = {
    // Nonce management
    generateNonce,
    validateNonce,

    // Request signing
    createSignature,
    verifySignature,

    // Middleware
    requireSignedRequest,
    requireAdmin,
    optionalSignedRequest,

    // Utilities
    hashForLog,
    isBlocked,
    blockIP,
    isAdmin,
    getSecurityMetrics,

    // Config
    SIGNING_CONFIG
};
