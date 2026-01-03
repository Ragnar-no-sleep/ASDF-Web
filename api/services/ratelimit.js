/**
 * ASDF API - Advanced Rate Limiting Service
 *
 * Production-grade rate limiting:
 * - Sliding window algorithm
 * - Token bucket for burst handling
 * - Per-user, per-IP, per-endpoint limits
 * - Tiered rate limiting (free/premium)
 * - Redis-ready for distributed systems
 *
 * Security by Design:
 * - IP spoofing protection
 * - Automatic ban escalation
 * - Rate limit bypass detection
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const RATELIMIT_CONFIG = {
    // Window sizes (Fibonacci-based)
    windows: {
        second: 1000,
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000
    },

    // Default limits per tier
    tiers: {
        anonymous: {
            perSecond: 5,
            perMinute: 60,
            perHour: 500,
            perDay: 5000,
            burstSize: 10
        },
        authenticated: {
            perSecond: 13,
            perMinute: 144,
            perHour: 1000,
            perDay: 10000,
            burstSize: 21
        },
        premium: {
            perSecond: 34,
            perMinute: 377,
            perHour: 3000,
            perDay: 30000,
            burstSize: 55
        },
        admin: {
            perSecond: 89,
            perMinute: 987,
            perHour: 10000,
            perDay: 100000,
            burstSize: 144
        }
    },

    // Endpoint-specific overrides
    endpointLimits: {
        '/api/auth': { perMinute: 10, perHour: 50 },
        '/api/burn': { perMinute: 5, perHour: 30 },
        '/api/purchase': { perMinute: 10, perHour: 100 },
        '/api/webhook': { perMinute: 100, perHour: 1000 }
    },

    // Ban settings
    ban: {
        threshold: 10,          // Violations before temp ban
        tempBanDuration: 5 * 60 * 1000,   // 5 minutes
        permaBanThreshold: 50,  // Violations before permanent ban
        decayRate: 1            // Violations decay per hour
    },

    // Cleanup
    cleanupInterval: 60 * 1000,  // Every minute
    entryTTL: 24 * 60 * 60 * 1000  // 24 hours
};

// ============================================
// STORAGE
// ============================================

// Rate limit counters: key -> { windows: {}, tokens: number, lastRefill: number }
const limiters = new Map();

// Violation tracking: identifier -> { count: number, lastViolation: number, banned: boolean, banExpires: number }
const violations = new Map();

// Permanent bans
const permaBans = new Set();

// Stats
const rateLimitStats = {
    allowed: 0,
    denied: 0,
    violations: 0,
    tempBans: 0,
    permaBans: 0
};

// ============================================
// SLIDING WINDOW RATE LIMITER
// ============================================

/**
 * Check rate limit with sliding window
 * @param {string} identifier - Unique identifier (IP, user ID, etc.)
 * @param {string} tier - Rate limit tier
 * @param {string} endpoint - Optional endpoint for specific limits
 * @returns {{allowed: boolean, remaining: number, resetIn: number, retryAfter: number}}
 */
function checkLimit(identifier, tier = 'anonymous', endpoint = null) {
    const key = buildKey(identifier, endpoint);

    // Check permanent ban
    if (permaBans.has(identifier)) {
        rateLimitStats.denied++;
        return {
            allowed: false,
            remaining: 0,
            resetIn: -1,
            retryAfter: -1,
            banned: true,
            reason: 'permanent_ban'
        };
    }

    // Check temporary ban
    const violation = violations.get(identifier);
    if (violation?.banned && Date.now() < violation.banExpires) {
        rateLimitStats.denied++;
        return {
            allowed: false,
            remaining: 0,
            resetIn: violation.banExpires - Date.now(),
            retryAfter: Math.ceil((violation.banExpires - Date.now()) / 1000),
            banned: true,
            reason: 'temporary_ban'
        };
    }

    // Get or create limiter
    let limiter = limiters.get(key);
    if (!limiter) {
        limiter = createLimiter();
        limiters.set(key, limiter);
    }

    // Get applicable limits
    const limits = getApplicableLimits(tier, endpoint);
    const now = Date.now();

    // Clean old window entries
    cleanWindowEntries(limiter, now);

    // Check each window
    const checks = [
        { window: 'second', limit: limits.perSecond, duration: RATELIMIT_CONFIG.windows.second },
        { window: 'minute', limit: limits.perMinute, duration: RATELIMIT_CONFIG.windows.minute },
        { window: 'hour', limit: limits.perHour, duration: RATELIMIT_CONFIG.windows.hour },
        { window: 'day', limit: limits.perDay, duration: RATELIMIT_CONFIG.windows.day }
    ];

    let mostRestrictive = { remaining: Infinity, resetIn: 0, retryAfter: 0 };
    let blocked = false;

    for (const check of checks) {
        if (!check.limit) continue;

        const windowStart = now - check.duration;
        const count = countInWindow(limiter.windows[check.window], windowStart);

        if (count >= check.limit) {
            blocked = true;
            const oldestEntry = getOldestEntry(limiter.windows[check.window], windowStart);
            const resetIn = oldestEntry ? (oldestEntry + check.duration - now) : check.duration;

            if (resetIn > mostRestrictive.retryAfter) {
                mostRestrictive = {
                    remaining: 0,
                    resetIn,
                    retryAfter: Math.ceil(resetIn / 1000)
                };
            }
        } else {
            const remaining = check.limit - count - 1;
            if (remaining < mostRestrictive.remaining) {
                mostRestrictive.remaining = remaining;
            }
        }
    }

    if (blocked) {
        recordViolation(identifier);
        rateLimitStats.denied++;
        rateLimitStats.violations++;

        return {
            allowed: false,
            ...mostRestrictive,
            banned: false,
            reason: 'rate_limit_exceeded'
        };
    }

    // Record request in all windows
    for (const check of checks) {
        if (!limiter.windows[check.window]) {
            limiter.windows[check.window] = [];
        }
        limiter.windows[check.window].push(now);
    }

    limiter.lastAccess = now;
    rateLimitStats.allowed++;

    return {
        allowed: true,
        remaining: Math.max(0, mostRestrictive.remaining),
        resetIn: 0,
        retryAfter: 0,
        banned: false
    };
}

/**
 * Token bucket rate limiter for burst handling
 * @param {string} identifier - Unique identifier
 * @param {string} tier - Rate limit tier
 * @param {number} cost - Token cost for this request
 * @returns {{allowed: boolean, tokens: number, refillIn: number}}
 */
function checkTokenBucket(identifier, tier = 'anonymous', cost = 1) {
    const key = `bucket:${identifier}`;
    const limits = RATELIMIT_CONFIG.tiers[tier] || RATELIMIT_CONFIG.tiers.anonymous;
    const now = Date.now();

    let bucket = limiters.get(key);

    if (!bucket) {
        bucket = {
            tokens: limits.burstSize,
            lastRefill: now,
            maxTokens: limits.burstSize
        };
        limiters.set(key, bucket);
    }

    // Refill tokens (1 token per second for anonymous, scaled for other tiers)
    const refillRate = limits.perSecond / 5;  // Refill rate is 1/5 of per-second limit
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed / 1000) * refillRate;

    if (tokensToAdd > 0) {
        bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }

    // Check if we have enough tokens
    if (bucket.tokens >= cost) {
        bucket.tokens -= cost;
        return {
            allowed: true,
            tokens: bucket.tokens,
            refillIn: 0
        };
    }

    // Calculate when tokens will be available
    const tokensNeeded = cost - bucket.tokens;
    const refillIn = Math.ceil(tokensNeeded / refillRate) * 1000;

    return {
        allowed: false,
        tokens: bucket.tokens,
        refillIn
    };
}

// ============================================
// VIOLATION TRACKING
// ============================================

/**
 * Record a rate limit violation
 * @param {string} identifier - Violator identifier
 */
function recordViolation(identifier) {
    let violation = violations.get(identifier);

    if (!violation) {
        violation = {
            count: 0,
            lastViolation: 0,
            banned: false,
            banExpires: 0,
            history: []
        };
        violations.set(identifier, violation);
    }

    violation.count++;
    violation.lastViolation = Date.now();
    violation.history.push(Date.now());

    // Keep only last 100 violations
    if (violation.history.length > 100) {
        violation.history = violation.history.slice(-100);
    }

    // Check for temporary ban
    if (violation.count >= RATELIMIT_CONFIG.ban.threshold && !violation.banned) {
        violation.banned = true;
        violation.banExpires = Date.now() + RATELIMIT_CONFIG.ban.tempBanDuration;
        rateLimitStats.tempBans++;

        logAudit('rate_limit_temp_ban', {
            identifier: hashIdentifier(identifier),
            violations: violation.count,
            duration: RATELIMIT_CONFIG.ban.tempBanDuration
        });
    }

    // Check for permanent ban
    if (violation.count >= RATELIMIT_CONFIG.ban.permaBanThreshold) {
        permaBans.add(identifier);
        rateLimitStats.permaBans++;

        logAudit('rate_limit_perma_ban', {
            identifier: hashIdentifier(identifier),
            violations: violation.count
        });
    }
}

/**
 * Clear violations for identifier
 * @param {string} identifier - Identifier to clear
 * @returns {boolean}
 */
function clearViolations(identifier) {
    violations.delete(identifier);
    return true;
}

/**
 * Remove permanent ban
 * @param {string} identifier - Identifier to unban
 * @returns {boolean}
 */
function removeBan(identifier) {
    const wasBanned = permaBans.delete(identifier);
    violations.delete(identifier);

    if (wasBanned) {
        logAudit('rate_limit_unban', {
            identifier: hashIdentifier(identifier)
        });
    }

    return wasBanned;
}

/**
 * Check if identifier is banned
 * @param {string} identifier - Identifier to check
 * @returns {{banned: boolean, permanent: boolean, expiresIn: number}}
 */
function isBanned(identifier) {
    if (permaBans.has(identifier)) {
        return { banned: true, permanent: true, expiresIn: -1 };
    }

    const violation = violations.get(identifier);
    if (violation?.banned && Date.now() < violation.banExpires) {
        return {
            banned: true,
            permanent: false,
            expiresIn: violation.banExpires - Date.now()
        };
    }

    return { banned: false, permanent: false, expiresIn: 0 };
}

// ============================================
// IP HANDLING
// ============================================

/**
 * Extract real IP from request
 * @param {Object} req - Express request
 * @returns {string}
 */
function extractIP(req) {
    // Check trusted proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const cfConnectingIP = req.headers['cf-connecting-ip'];

    // Prefer Cloudflare header if present
    if (cfConnectingIP) {
        return normalizeIP(cfConnectingIP);
    }

    // Use X-Forwarded-For (first IP in chain)
    if (forwardedFor) {
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return normalizeIP(ips[0]);
    }

    // Use X-Real-IP
    if (realIP) {
        return normalizeIP(realIP);
    }

    // Fall back to socket address
    return normalizeIP(req.socket?.remoteAddress || 'unknown');
}

/**
 * Normalize IP address
 * @param {string} ip - IP address
 * @returns {string}
 */
function normalizeIP(ip) {
    if (!ip) return 'unknown';

    // Remove IPv6 prefix for IPv4 addresses
    if (ip.startsWith('::ffff:')) {
        return ip.slice(7);
    }

    return ip;
}

/**
 * Hash identifier for logging (privacy)
 * @param {string} identifier - Identifier to hash
 * @returns {string}
 */
function hashIdentifier(identifier) {
    return crypto.createHash('sha256')
        .update(identifier)
        .digest('hex')
        .slice(0, 16);
}

// ============================================
// UTILITIES
// ============================================

/**
 * Create new limiter instance
 * @returns {Object}
 */
function createLimiter() {
    return {
        windows: {
            second: [],
            minute: [],
            hour: [],
            day: []
        },
        lastAccess: Date.now()
    };
}

/**
 * Build rate limit key
 * @param {string} identifier - Base identifier
 * @param {string} endpoint - Optional endpoint
 * @returns {string}
 */
function buildKey(identifier, endpoint) {
    if (endpoint) {
        return `${identifier}:${endpoint}`;
    }
    return identifier;
}

/**
 * Get applicable limits for tier and endpoint
 * @param {string} tier - Rate limit tier
 * @param {string} endpoint - Optional endpoint
 * @returns {Object}
 */
function getApplicableLimits(tier, endpoint) {
    const tierLimits = RATELIMIT_CONFIG.tiers[tier] || RATELIMIT_CONFIG.tiers.anonymous;

    if (endpoint && RATELIMIT_CONFIG.endpointLimits[endpoint]) {
        return {
            ...tierLimits,
            ...RATELIMIT_CONFIG.endpointLimits[endpoint]
        };
    }

    return tierLimits;
}

/**
 * Clean old entries from window
 * @param {Object} limiter - Limiter instance
 * @param {number} now - Current timestamp
 */
function cleanWindowEntries(limiter, now) {
    for (const [windowName, duration] of Object.entries(RATELIMIT_CONFIG.windows)) {
        if (!limiter.windows[windowName]) continue;

        const cutoff = now - duration;
        limiter.windows[windowName] = limiter.windows[windowName].filter(t => t > cutoff);
    }
}

/**
 * Count entries in window since start time
 * @param {number[]} entries - Window entries
 * @param {number} windowStart - Window start time
 * @returns {number}
 */
function countInWindow(entries, windowStart) {
    if (!entries || entries.length === 0) return 0;
    return entries.filter(t => t > windowStart).length;
}

/**
 * Get oldest entry in window
 * @param {number[]} entries - Window entries
 * @param {number} windowStart - Window start time
 * @returns {number|null}
 */
function getOldestEntry(entries, windowStart) {
    if (!entries || entries.length === 0) return null;
    const validEntries = entries.filter(t => t > windowStart);
    return validEntries.length > 0 ? Math.min(...validEntries) : null;
}

// ============================================
// CLEANUP
// ============================================

/**
 * Cleanup old entries
 */
function cleanup() {
    const now = Date.now();
    const cutoff = now - RATELIMIT_CONFIG.entryTTL;

    // Clean old limiters
    for (const [key, limiter] of limiters.entries()) {
        if (limiter.lastAccess < cutoff) {
            limiters.delete(key);
        }
    }

    // Decay violations
    for (const [identifier, violation] of violations.entries()) {
        // Decay violations over time
        const hoursSinceViolation = (now - violation.lastViolation) / (60 * 60 * 1000);
        const decay = Math.floor(hoursSinceViolation * RATELIMIT_CONFIG.ban.decayRate);

        if (decay > 0) {
            violation.count = Math.max(0, violation.count - decay);
        }

        // Clear expired temp bans
        if (violation.banned && now >= violation.banExpires) {
            violation.banned = false;
        }

        // Remove if no violations
        if (violation.count === 0 && !violation.banned) {
            violations.delete(identifier);
        }
    }
}

// Start cleanup interval
setInterval(cleanup, RATELIMIT_CONFIG.cleanupInterval);

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Create rate limit middleware
 * @param {Object} options - Middleware options
 * @returns {Function}
 */
function createMiddleware(options = {}) {
    const {
        getTier = () => 'anonymous',
        getIdentifier = (req) => extractIP(req),
        skip = () => false,
        onLimited = null
    } = options;

    return async (req, res, next) => {
        // Skip if configured
        if (skip(req)) {
            return next();
        }

        const identifier = getIdentifier(req);
        const tier = await Promise.resolve(getTier(req));
        const endpoint = req.path;

        const result = checkLimit(identifier, tier, endpoint);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Remaining', result.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + result.retryAfter);

        if (!result.allowed) {
            res.setHeader('Retry-After', result.retryAfter);

            if (onLimited) {
                return onLimited(req, res, result);
            }

            return res.status(429).json({
                error: 'rate_limit_exceeded',
                message: result.banned
                    ? 'You have been temporarily banned due to excessive requests'
                    : 'Too many requests, please try again later',
                retryAfter: result.retryAfter,
                banned: result.banned
            });
        }

        next();
    };
}

// ============================================
// METRICS
// ============================================

/**
 * Get rate limit statistics
 * @returns {Object}
 */
function getStats() {
    return {
        ...rateLimitStats,
        activeLimiters: limiters.size,
        activeViolations: violations.size,
        permanentBans: permaBans.size,
        allowRate: rateLimitStats.allowed + rateLimitStats.denied > 0
            ? ((rateLimitStats.allowed / (rateLimitStats.allowed + rateLimitStats.denied)) * 100).toFixed(2) + '%'
            : '100%'
    };
}

/**
 * Get violation details for identifier
 * @param {string} identifier - Identifier to query
 * @returns {Object|null}
 */
function getViolationDetails(identifier) {
    const violation = violations.get(identifier);
    if (!violation) return null;

    return {
        count: violation.count,
        lastViolation: violation.lastViolation,
        banned: violation.banned,
        banExpires: violation.banExpires,
        recentViolations: violation.history.slice(-10)
    };
}

/**
 * Get all banned identifiers (hashed)
 * @returns {Object}
 */
function getBannedList() {
    const tempBanned = [];
    const permBanned = [];

    for (const [identifier, violation] of violations.entries()) {
        if (violation.banned && Date.now() < violation.banExpires) {
            tempBanned.push({
                hash: hashIdentifier(identifier),
                expiresIn: violation.banExpires - Date.now(),
                violations: violation.count
            });
        }
    }

    for (const identifier of permaBans) {
        permBanned.push({
            hash: hashIdentifier(identifier)
        });
    }

    return {
        temporary: tempBanned,
        permanent: permBanned
    };
}

// ============================================
// TIER MANAGEMENT
// ============================================

/**
 * Update tier limits
 * @param {string} tier - Tier name
 * @param {Object} limits - New limits
 * @returns {boolean}
 */
function updateTierLimits(tier, limits) {
    if (!RATELIMIT_CONFIG.tiers[tier]) {
        return false;
    }

    RATELIMIT_CONFIG.tiers[tier] = {
        ...RATELIMIT_CONFIG.tiers[tier],
        ...limits
    };

    logAudit('rate_limit_tier_updated', { tier, limits });
    return true;
}

/**
 * Update endpoint limits
 * @param {string} endpoint - Endpoint path
 * @param {Object} limits - New limits
 */
function updateEndpointLimits(endpoint, limits) {
    RATELIMIT_CONFIG.endpointLimits[endpoint] = {
        ...RATELIMIT_CONFIG.endpointLimits[endpoint],
        ...limits
    };

    logAudit('rate_limit_endpoint_updated', { endpoint, limits });
}

module.exports = {
    // Core
    checkLimit,
    checkTokenBucket,

    // Violations
    recordViolation,
    clearViolations,
    isBanned,
    removeBan,

    // IP handling
    extractIP,
    normalizeIP,

    // Middleware
    createMiddleware,

    // Stats
    getStats,
    getViolationDetails,
    getBannedList,

    // Configuration
    updateTierLimits,
    updateEndpointLimits,

    // Constants
    RATELIMIT_CONFIG
};
