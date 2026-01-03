/**
 * Idempotency Service - Request Deduplication
 * Ensures requests with the same idempotency key return consistent results
 * Security by Design: Prevents replay attacks, duplicate transactions
 */

const crypto = require('crypto');

// Configuration with Fibonacci-based values
const IDEMPOTENCY_CONFIG = {
    keyTTL: 24 * 60 * 60 * 1000,           // 24 hours key retention
    maxKeyLength: 64,                        // Max idempotency key length
    maxStoredResponses: 10000,               // Max cached responses
    cleanupInterval: 5 * 60 * 1000,          // 5 minutes cleanup interval
    lockTimeout: 30 * 1000,                  // 30 seconds lock timeout
    maxConcurrentRequests: 5,                // Per key concurrent limit
    responseMaxSize: 1024 * 1024,            // 1MB max response cache
    hashAlgorithm: 'sha256',

    // Methods that support idempotency
    idempotentMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],

    // Paths excluded from idempotency (already idempotent or no side effects)
    excludedPaths: [
        '/api/health',
        '/api/status',
        '/api/version'
    ]
};

// In-memory storage (use Redis in production cluster)
const idempotencyStore = new Map();
const requestLocks = new Map();

// Statistics
const stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    duplicatesPrevented: 0,
    conflictsDetected: 0,
    expiredKeys: 0,
    locksAcquired: 0,
    lockTimeouts: 0,
    invalidKeys: 0
};

/**
 * Generate fingerprint for request body
 */
function generateBodyFingerprint(body) {
    if (!body || Object.keys(body).length === 0) {
        return 'empty';
    }

    const normalized = JSON.stringify(body, Object.keys(body).sort());
    return crypto.createHash(IDEMPOTENCY_CONFIG.hashAlgorithm)
        .update(normalized)
        .digest('hex')
        .substring(0, 16);
}

/**
 * Validate idempotency key format
 */
function validateIdempotencyKey(key) {
    if (!key || typeof key !== 'string') {
        return { valid: false, reason: 'Key must be a non-empty string' };
    }

    if (key.length > IDEMPOTENCY_CONFIG.maxKeyLength) {
        return { valid: false, reason: `Key exceeds maximum length of ${IDEMPOTENCY_CONFIG.maxKeyLength}` };
    }

    // Allow alphanumeric, hyphens, underscores only
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
        return { valid: false, reason: 'Key contains invalid characters' };
    }

    return { valid: true };
}

/**
 * Create composite key from idempotency key and user context
 */
function createCompositeKey(idempotencyKey, userId, method, path) {
    const components = [
        userId || 'anonymous',
        method.toUpperCase(),
        path,
        idempotencyKey
    ];

    return crypto.createHash(IDEMPOTENCY_CONFIG.hashAlgorithm)
        .update(components.join(':'))
        .digest('hex');
}

/**
 * Acquire lock for idempotency key
 */
async function acquireLock(compositeKey, timeout = IDEMPOTENCY_CONFIG.lockTimeout) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const existingLock = requestLocks.get(compositeKey);

        if (!existingLock || existingLock.expiresAt < Date.now()) {
            const lock = {
                acquiredAt: Date.now(),
                expiresAt: Date.now() + IDEMPOTENCY_CONFIG.lockTimeout
            };
            requestLocks.set(compositeKey, lock);
            stats.locksAcquired++;
            return true;
        }

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    stats.lockTimeouts++;
    return false;
}

/**
 * Release lock for idempotency key
 */
function releaseLock(compositeKey) {
    requestLocks.delete(compositeKey);
}

/**
 * Store response for idempotency key
 */
function storeResponse(compositeKey, response, bodyFingerprint) {
    // Enforce storage limit
    if (idempotencyStore.size >= IDEMPOTENCY_CONFIG.maxStoredResponses) {
        // Remove oldest entries
        const entries = Array.from(idempotencyStore.entries())
            .sort((a, b) => a[1].createdAt - b[1].createdAt);

        const toRemove = Math.floor(IDEMPOTENCY_CONFIG.maxStoredResponses * 0.1);
        for (let i = 0; i < toRemove; i++) {
            idempotencyStore.delete(entries[i][0]);
        }
    }

    // Check response size
    const responseStr = JSON.stringify(response);
    if (responseStr.length > IDEMPOTENCY_CONFIG.responseMaxSize) {
        console.warn('[Idempotency] Response too large to cache:', compositeKey.substring(0, 16));
        return false;
    }

    idempotencyStore.set(compositeKey, {
        response: {
            statusCode: response.statusCode,
            headers: response.headers || {},
            body: response.body
        },
        bodyFingerprint,
        createdAt: Date.now(),
        expiresAt: Date.now() + IDEMPOTENCY_CONFIG.keyTTL,
        accessCount: 0
    });

    return true;
}

/**
 * Get stored response for idempotency key
 */
function getStoredResponse(compositeKey, currentBodyFingerprint) {
    const stored = idempotencyStore.get(compositeKey);

    if (!stored) {
        return null;
    }

    // Check expiration
    if (stored.expiresAt < Date.now()) {
        idempotencyStore.delete(compositeKey);
        stats.expiredKeys++;
        return null;
    }

    // Verify body fingerprint matches
    if (stored.bodyFingerprint !== currentBodyFingerprint) {
        stats.conflictsDetected++;
        return { conflict: true, message: 'Request body differs from original request with same idempotency key' };
    }

    stored.accessCount++;
    stats.cacheHits++;
    stats.duplicatesPrevented++;

    return { cached: true, response: stored.response };
}

/**
 * Idempotency middleware
 */
function idempotencyMiddleware(options = {}) {
    const config = { ...IDEMPOTENCY_CONFIG, ...options };

    return async (req, res, next) => {
        // Skip non-idempotent methods
        if (!config.idempotentMethods.includes(req.method)) {
            return next();
        }

        // Skip excluded paths
        if (config.excludedPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // Get idempotency key from header
        const idempotencyKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];

        // If no key provided, proceed without idempotency
        if (!idempotencyKey) {
            return next();
        }

        stats.totalRequests++;

        // Validate key
        const validation = validateIdempotencyKey(idempotencyKey);
        if (!validation.valid) {
            stats.invalidKeys++;
            return res.status(400).json({
                success: false,
                error: 'Invalid idempotency key',
                message: validation.reason
            });
        }

        // Get user context
        const userId = req.user?.id || req.user?.wallet || req.ip;

        // Create composite key
        const compositeKey = createCompositeKey(
            idempotencyKey,
            userId,
            req.method,
            req.path
        );

        // Generate body fingerprint
        const bodyFingerprint = generateBodyFingerprint(req.body);

        // Check for existing response
        const existing = getStoredResponse(compositeKey, bodyFingerprint);

        if (existing) {
            if (existing.conflict) {
                return res.status(422).json({
                    success: false,
                    error: 'Idempotency conflict',
                    message: existing.message
                });
            }

            if (existing.cached) {
                // Return cached response
                res.set('X-Idempotency-Replayed', 'true');

                if (existing.response.headers) {
                    Object.entries(existing.response.headers).forEach(([key, value]) => {
                        if (!['content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
                            res.set(key, value);
                        }
                    });
                }

                return res.status(existing.response.statusCode).json(existing.response.body);
            }
        }

        stats.cacheMisses++;

        // Try to acquire lock
        const lockAcquired = await acquireLock(compositeKey);

        if (!lockAcquired) {
            return res.status(409).json({
                success: false,
                error: 'Request in progress',
                message: 'A request with this idempotency key is currently being processed'
            });
        }

        // Intercept response to store it
        const originalJson = res.json.bind(res);
        let responseCaptured = false;

        res.json = function(body) {
            if (!responseCaptured) {
                responseCaptured = true;

                // Store successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    storeResponse(compositeKey, {
                        statusCode: res.statusCode,
                        headers: {
                            'content-type': res.get('content-type')
                        },
                        body
                    }, bodyFingerprint);
                }

                releaseLock(compositeKey);
            }

            return originalJson(body);
        };

        // Ensure lock is released on error
        res.on('finish', () => {
            releaseLock(compositeKey);
        });

        next();
    };
}

/**
 * Generate new idempotency key
 */
function generateIdempotencyKey() {
    return crypto.randomBytes(32).toString('hex').substring(0, IDEMPOTENCY_CONFIG.maxKeyLength);
}

/**
 * Clear expired entries
 */
function cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of idempotencyStore.entries()) {
        if (value.expiresAt < now) {
            idempotencyStore.delete(key);
            cleaned++;
        }
    }

    // Clean expired locks
    for (const [key, lock] of requestLocks.entries()) {
        if (lock.expiresAt < now) {
            requestLocks.delete(key);
        }
    }

    if (cleaned > 0) {
        stats.expiredKeys += cleaned;
        console.log(`[Idempotency] Cleaned ${cleaned} expired entries`);
    }
}

/**
 * Manually invalidate an idempotency key
 */
function invalidateKey(idempotencyKey, userId, method, path) {
    const compositeKey = createCompositeKey(idempotencyKey, userId, method, path);
    const existed = idempotencyStore.has(compositeKey);
    idempotencyStore.delete(compositeKey);
    return existed;
}

/**
 * Get statistics
 */
function getStats() {
    return {
        ...stats,
        storedResponses: idempotencyStore.size,
        activeLocks: requestLocks.size,
        hitRate: stats.totalRequests > 0
            ? ((stats.cacheHits / stats.totalRequests) * 100).toFixed(2) + '%'
            : '0%',
        config: {
            keyTTL: IDEMPOTENCY_CONFIG.keyTTL,
            maxStoredResponses: IDEMPOTENCY_CONFIG.maxStoredResponses,
            lockTimeout: IDEMPOTENCY_CONFIG.lockTimeout
        }
    };
}

// Start cleanup interval
const cleanupTimer = setInterval(cleanupExpired, IDEMPOTENCY_CONFIG.cleanupInterval);
cleanupTimer.unref();

// Graceful shutdown
function shutdown() {
    clearInterval(cleanupTimer);
    idempotencyStore.clear();
    requestLocks.clear();
    console.log('[Idempotency] Service shut down');
}

module.exports = {
    idempotencyMiddleware,
    generateIdempotencyKey,
    invalidateKey,
    validateIdempotencyKey,
    getStats,
    shutdown,
    IDEMPOTENCY_CONFIG
};
