/**
 * ASDF API - Helius Smart Rate Limiter
 *
 * Adaptive rate limiting for Helius API:
 * - Sliding window algorithm
 * - Per-endpoint quotas
 * - Adaptive limits based on response headers
 * - Burst capacity management
 * - Backpressure mechanism
 * - Fair queuing across wallets
 *
 * @author Helius Engineering Standards
 * @version 1.0.0
 *
 * Security by Design:
 * - DoS protection
 * - Fair resource allocation
 * - Graceful degradation
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const RATE_LIMIT_CONFIG = {
    // Helius tier limits (requests per second)
    tiers: {
        free: { rps: 10, burst: 20 },
        developer: { rps: 50, burst: 100 },
        business: { rps: 200, burst: 500 },
        enterprise: { rps: 1000, burst: 2000 }
    },

    // Current tier (from env or default)
    currentTier: process.env.HELIUS_TIER || 'developer',

    // Window settings
    slidingWindowMs: 1000,     // 1 second window
    windowCount: 60,           // Track 60 windows (1 minute history)

    // Per-wallet limits (fraction of total)
    walletQuotaFraction: 0.1,  // Each wallet gets 10% max
    maxConcurrentPerWallet: 5,

    // Endpoint weights (some endpoints cost more)
    endpointWeights: {
        'getAsset': 1,
        'getAssetsByOwner': 2,
        'getAssetBatch': 3,
        'getSignatureStatuses': 1,
        'getBalance': 1,
        'getMultipleAccounts': 2,
        'simulateTransaction': 3,
        'sendTransaction': 5,
        'default': 1
    },

    // Backpressure settings
    backpressure: {
        softThreshold: 0.7,    // Start slowing at 70%
        hardThreshold: 0.9,    // Start rejecting at 90%
        cooldownMs: 5000       // Cooldown after hard limit
    },

    // Retry settings (Fibonacci-based)
    retryDelaysMs: [55, 89, 144, 233, 377, 610]
};

// ============================================
// STATE
// ============================================

// Sliding window counters
const windows = [];
let currentWindowIndex = 0;

// Per-wallet tracking
const walletUsage = new Map();

// Per-endpoint tracking
const endpointUsage = new Map();

// Concurrent request tracking
const activeRequests = new Map();  // requestId -> {wallet, endpoint, startTime}

// Backpressure state
let backpressureActive = false;
let backpressureCooldownUntil = 0;

// Adaptive limit (updated from response headers)
let adaptiveLimit = null;
let lastHeaderUpdate = 0;

// Statistics
const stats = {
    totalRequests: 0,
    allowedRequests: 0,
    throttledRequests: 0,
    backpressureEvents: 0,
    adaptiveAdjustments: 0
};

// Initialize windows
for (let i = 0; i < RATE_LIMIT_CONFIG.windowCount; i++) {
    windows.push({ timestamp: 0, count: 0, weight: 0 });
}

// ============================================
// CORE RATE LIMITING
// ============================================

/**
 * Check if request is allowed
 * @param {Object} options - Request options
 * @returns {{allowed: boolean, waitMs?: number, reason?: string}}
 */
function checkLimit(options = {}) {
    const {
        wallet = 'anonymous',
        endpoint = 'default',
        weight = null
    } = options;

    stats.totalRequests++;

    // Get effective weight
    const effectiveWeight = weight || getEndpointWeight(endpoint);

    // Get current tier limits
    const tierConfig = RATE_LIMIT_CONFIG.tiers[RATE_LIMIT_CONFIG.currentTier];
    const effectiveLimit = adaptiveLimit || tierConfig.rps;
    const burstLimit = tierConfig.burst;

    // Rotate window if needed
    rotateWindow();

    // Calculate current usage
    const usage = calculateUsage();
    const usageRatio = usage.weightedCount / effectiveLimit;

    // Check backpressure cooldown
    if (Date.now() < backpressureCooldownUntil) {
        stats.throttledRequests++;
        return {
            allowed: false,
            waitMs: backpressureCooldownUntil - Date.now(),
            reason: 'backpressure_cooldown'
        };
    }

    // Check hard limit
    if (usageRatio >= RATE_LIMIT_CONFIG.backpressure.hardThreshold) {
        triggerBackpressure();
        stats.throttledRequests++;
        return {
            allowed: false,
            waitMs: RATE_LIMIT_CONFIG.backpressure.cooldownMs,
            reason: 'hard_limit'
        };
    }

    // Check burst limit
    const currentWindow = windows[currentWindowIndex];
    if (currentWindow.count >= burstLimit) {
        stats.throttledRequests++;
        return {
            allowed: false,
            waitMs: RATE_LIMIT_CONFIG.slidingWindowMs - (Date.now() - currentWindow.timestamp),
            reason: 'burst_limit'
        };
    }

    // Check per-wallet limit
    const walletCheck = checkWalletLimit(wallet, effectiveWeight, effectiveLimit);
    if (!walletCheck.allowed) {
        stats.throttledRequests++;
        return walletCheck;
    }

    // Check concurrent limit per wallet
    const concurrentCheck = checkConcurrentLimit(wallet);
    if (!concurrentCheck.allowed) {
        stats.throttledRequests++;
        return concurrentCheck;
    }

    // Allowed - record usage
    recordUsage(wallet, endpoint, effectiveWeight);
    stats.allowedRequests++;

    // Return with soft limit warning
    if (usageRatio >= RATE_LIMIT_CONFIG.backpressure.softThreshold) {
        return {
            allowed: true,
            warning: 'approaching_limit',
            usageRatio: usageRatio.toFixed(2)
        };
    }

    return { allowed: true };
}

/**
 * Acquire a request slot
 * @param {Object} options - Request options
 * @returns {Promise<{requestId: string, release: Function}>}
 */
async function acquire(options = {}) {
    const check = checkLimit(options);

    if (!check.allowed) {
        if (check.waitMs && check.waitMs < 5000) {
            // Wait and retry
            await sleep(check.waitMs);
            return acquire(options);
        }
        throw new Error(`Rate limited: ${check.reason}`);
    }

    const requestId = generateRequestId();
    const { wallet = 'anonymous', endpoint = 'default' } = options;

    activeRequests.set(requestId, {
        wallet,
        endpoint,
        startTime: Date.now()
    });

    const release = () => {
        activeRequests.delete(requestId);
        releaseWalletConcurrent(wallet);
    };

    return { requestId, release };
}

/**
 * Create middleware for Express
 * @param {Object} options - Middleware options
 * @returns {Function}
 */
function middleware(options = {}) {
    return (req, res, next) => {
        const wallet = req.wallet || 'anonymous';
        const endpoint = req.path.split('/').pop() || 'default';

        const check = checkLimit({ wallet, endpoint });

        if (!check.allowed) {
            // Set retry-after header
            if (check.waitMs) {
                res.set('Retry-After', Math.ceil(check.waitMs / 1000));
            }

            res.set('X-RateLimit-Limit', getTierLimit());
            res.set('X-RateLimit-Remaining', Math.max(0, getRemainingQuota()));
            res.set('X-RateLimit-Reset', getResetTime());

            return res.status(429).json({
                error: 'Rate Limited',
                reason: check.reason,
                retryAfter: check.waitMs
            });
        }

        // Add rate limit headers
        res.set('X-RateLimit-Limit', getTierLimit());
        res.set('X-RateLimit-Remaining', getRemainingQuota());
        res.set('X-RateLimit-Reset', getResetTime());

        if (check.warning) {
            res.set('X-RateLimit-Warning', check.warning);
        }

        next();
    };
}

// ============================================
// SLIDING WINDOW
// ============================================

/**
 * Rotate to new window if needed
 */
function rotateWindow() {
    const now = Date.now();
    const windowMs = RATE_LIMIT_CONFIG.slidingWindowMs;
    const currentWindow = windows[currentWindowIndex];

    if (now - currentWindow.timestamp >= windowMs) {
        // Move to next window
        currentWindowIndex = (currentWindowIndex + 1) % RATE_LIMIT_CONFIG.windowCount;
        windows[currentWindowIndex] = {
            timestamp: now,
            count: 0,
            weight: 0
        };
    }
}

/**
 * Calculate usage over sliding window
 * @returns {{count: number, weightedCount: number}}
 */
function calculateUsage() {
    const now = Date.now();
    const windowMs = RATE_LIMIT_CONFIG.slidingWindowMs;
    let count = 0;
    let weightedCount = 0;

    for (const window of windows) {
        if (now - window.timestamp < windowMs * RATE_LIMIT_CONFIG.windowCount) {
            count += window.count;
            weightedCount += window.weight;
        }
    }

    // Normalize to per-second
    const seconds = (RATE_LIMIT_CONFIG.windowCount * windowMs) / 1000;
    return {
        count,
        weightedCount: weightedCount / seconds
    };
}

/**
 * Record request usage
 * @param {string} wallet - Wallet address
 * @param {string} endpoint - Endpoint name
 * @param {number} weight - Request weight
 */
function recordUsage(wallet, endpoint, weight) {
    const window = windows[currentWindowIndex];
    window.count++;
    window.weight += weight;

    // Update wallet usage
    const walletData = walletUsage.get(wallet) || {
        count: 0,
        weight: 0,
        concurrent: 0,
        lastRequest: 0
    };
    walletData.count++;
    walletData.weight += weight;
    walletData.concurrent++;
    walletData.lastRequest = Date.now();
    walletUsage.set(wallet, walletData);

    // Update endpoint usage
    const endpointData = endpointUsage.get(endpoint) || { count: 0 };
    endpointData.count++;
    endpointUsage.set(endpoint, endpointData);
}

// ============================================
// PER-WALLET LIMITING
// ============================================

/**
 * Check wallet-specific limit
 * @param {string} wallet - Wallet address
 * @param {number} weight - Request weight
 * @param {number} totalLimit - Total RPS limit
 * @returns {{allowed: boolean, waitMs?: number, reason?: string}}
 */
function checkWalletLimit(wallet, weight, totalLimit) {
    const walletData = walletUsage.get(wallet);
    if (!walletData) return { allowed: true };

    const walletLimit = totalLimit * RATE_LIMIT_CONFIG.walletQuotaFraction;
    const now = Date.now();

    // Calculate wallet's recent usage
    if (now - walletData.lastRequest < 1000) {
        if (walletData.weight > walletLimit) {
            return {
                allowed: false,
                waitMs: 1000 - (now - walletData.lastRequest),
                reason: 'wallet_quota_exceeded'
            };
        }
    } else {
        // Reset wallet counters after 1 second
        walletData.weight = 0;
        walletData.count = 0;
    }

    return { allowed: true };
}

/**
 * Check concurrent request limit per wallet
 * @param {string} wallet - Wallet address
 * @returns {{allowed: boolean, reason?: string}}
 */
function checkConcurrentLimit(wallet) {
    const walletData = walletUsage.get(wallet);
    if (!walletData) return { allowed: true };

    if (walletData.concurrent >= RATE_LIMIT_CONFIG.maxConcurrentPerWallet) {
        return {
            allowed: false,
            reason: 'concurrent_limit_exceeded'
        };
    }

    return { allowed: true };
}

/**
 * Release concurrent slot for wallet
 * @param {string} wallet - Wallet address
 */
function releaseWalletConcurrent(wallet) {
    const walletData = walletUsage.get(wallet);
    if (walletData && walletData.concurrent > 0) {
        walletData.concurrent--;
    }
}

// ============================================
// ADAPTIVE LIMITING
// ============================================

/**
 * Update limit from response headers
 * @param {Object} headers - Response headers
 */
function updateFromHeaders(headers) {
    const rateLimit = headers['x-ratelimit-limit'];
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];

    if (rateLimit) {
        const newLimit = parseInt(rateLimit, 10);
        if (newLimit !== adaptiveLimit) {
            adaptiveLimit = newLimit;
            stats.adaptiveAdjustments++;
            lastHeaderUpdate = Date.now();

            logAudit('rate_limit_adjusted', {
                previousLimit: adaptiveLimit,
                newLimit,
                source: 'headers'
            });
        }
    }

    // If we're running low, back off
    if (remaining !== undefined) {
        const remainingCount = parseInt(remaining, 10);
        if (remainingCount < 10) {
            triggerSoftBackpressure();
        }
    }
}

/**
 * Handle rate limit response (429)
 * @param {Object} response - Error response
 */
function handleRateLimitResponse(response) {
    const retryAfter = response.headers?.['retry-after'];

    if (retryAfter) {
        const waitMs = parseInt(retryAfter, 10) * 1000;
        backpressureCooldownUntil = Date.now() + waitMs;
    } else {
        triggerBackpressure();
    }

    stats.backpressureEvents++;

    logAudit('rate_limit_hit', {
        retryAfter,
        adaptiveLimit
    });
}

// ============================================
// BACKPRESSURE
// ============================================

/**
 * Trigger hard backpressure
 */
function triggerBackpressure() {
    backpressureActive = true;
    backpressureCooldownUntil = Date.now() + RATE_LIMIT_CONFIG.backpressure.cooldownMs;
    stats.backpressureEvents++;

    // Reduce adaptive limit
    if (adaptiveLimit) {
        adaptiveLimit = Math.floor(adaptiveLimit * 0.8);
    }

    logAudit('backpressure_triggered', {
        cooldownMs: RATE_LIMIT_CONFIG.backpressure.cooldownMs
    });
}

/**
 * Trigger soft backpressure (slow down)
 */
function triggerSoftBackpressure() {
    backpressureActive = true;

    // Reduce adaptive limit slightly
    if (adaptiveLimit) {
        adaptiveLimit = Math.floor(adaptiveLimit * 0.95);
    }
}

/**
 * Release backpressure
 */
function releaseBackpressure() {
    backpressureActive = false;

    // Gradually restore limit
    const tierLimit = RATE_LIMIT_CONFIG.tiers[RATE_LIMIT_CONFIG.currentTier].rps;
    if (adaptiveLimit && adaptiveLimit < tierLimit) {
        adaptiveLimit = Math.min(adaptiveLimit * 1.1, tierLimit);
    }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Get endpoint weight
 * @param {string} endpoint - Endpoint name
 * @returns {number}
 */
function getEndpointWeight(endpoint) {
    return RATE_LIMIT_CONFIG.endpointWeights[endpoint] ||
           RATE_LIMIT_CONFIG.endpointWeights.default;
}

/**
 * Get tier limit
 * @returns {number}
 */
function getTierLimit() {
    return adaptiveLimit ||
           RATE_LIMIT_CONFIG.tiers[RATE_LIMIT_CONFIG.currentTier].rps;
}

/**
 * Get remaining quota
 * @returns {number}
 */
function getRemainingQuota() {
    const usage = calculateUsage();
    const limit = getTierLimit();
    return Math.max(0, Math.floor(limit - usage.weightedCount));
}

/**
 * Get reset timestamp
 * @returns {number}
 */
function getResetTime() {
    return Math.ceil(Date.now() / 1000) + 1;
}

/**
 * Generate request ID
 * @returns {string}
 */
function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// METRICS
// ============================================

/**
 * Get rate limiter statistics
 * @returns {Object}
 */
function getStats() {
    const usage = calculateUsage();
    const tierConfig = RATE_LIMIT_CONFIG.tiers[RATE_LIMIT_CONFIG.currentTier];

    return {
        ...stats,
        currentTier: RATE_LIMIT_CONFIG.currentTier,
        tierLimit: tierConfig.rps,
        adaptiveLimit,
        currentUsage: {
            count: usage.count,
            weightedRps: usage.weightedCount.toFixed(2)
        },
        usageRatio: ((usage.weightedCount / getTierLimit()) * 100).toFixed(2) + '%',
        backpressureActive,
        backpressureCooldownUntil: backpressureCooldownUntil > Date.now()
            ? new Date(backpressureCooldownUntil).toISOString()
            : null,
        activeRequests: activeRequests.size,
        uniqueWallets: walletUsage.size,
        throttleRate: stats.totalRequests > 0
            ? ((stats.throttledRequests / stats.totalRequests) * 100).toFixed(2) + '%'
            : '0%'
    };
}

/**
 * Get per-wallet statistics
 * @param {string} wallet - Wallet address
 * @returns {Object}
 */
function getWalletStats(wallet) {
    const data = walletUsage.get(wallet);
    if (!data) {
        return { found: false };
    }

    return {
        found: true,
        requestCount: data.count,
        weightedUsage: data.weight,
        concurrent: data.concurrent,
        lastRequest: new Date(data.lastRequest).toISOString()
    };
}

/**
 * Reset statistics
 */
function resetStats() {
    stats.totalRequests = 0;
    stats.allowedRequests = 0;
    stats.throttledRequests = 0;
    stats.backpressureEvents = 0;
    walletUsage.clear();
    endpointUsage.clear();
}

// ============================================
// CLEANUP
// ============================================

// Clean up stale wallet entries every minute
setInterval(() => {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [wallet, data] of walletUsage.entries()) {
        if (now - data.lastRequest > staleThreshold) {
            walletUsage.delete(wallet);
        }
    }

    // Gradually release backpressure
    if (backpressureActive && Date.now() > backpressureCooldownUntil) {
        releaseBackpressure();
    }
}, 60000);

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Core
    checkLimit,
    acquire,
    middleware,

    // Adaptive
    updateFromHeaders,
    handleRateLimitResponse,

    // Backpressure
    triggerBackpressure,
    releaseBackpressure,

    // Stats
    getStats,
    getWalletStats,
    resetStats,

    // Config
    RATE_LIMIT_CONFIG,
    getEndpointWeight,
    getTierLimit,
    getRemainingQuota
};
