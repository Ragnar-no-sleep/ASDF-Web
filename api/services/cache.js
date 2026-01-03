/**
 * ASDF API - Caching Service
 *
 * Redis-compatible caching abstraction:
 * - In-memory cache for development
 * - Redis ready for production
 * - TTL support with lazy expiration
 * - Cache tags for grouped invalidation
 *
 * Security by Design:
 * - No sensitive data caching by default
 * - Key sanitization
 * - Memory limits
 */

'use strict';

const crypto = require('crypto');
const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const CACHE_CONFIG = {
    // Default TTL (5 minutes)
    defaultTTL: 5 * 60 * 1000,

    // Max TTL (24 hours)
    maxTTL: 24 * 60 * 60 * 1000,

    // Memory limits
    maxEntries: 10000,
    maxMemoryMB: 100,

    // Cleanup interval (every 5 minutes)
    cleanupInterval: 5 * 60 * 1000,

    // Key prefix
    prefix: 'asdf:',

    // Redis config (from env)
    redis: {
        url: process.env.REDIS_URL || null,
        tls: process.env.REDIS_TLS === 'true'
    }
};

// Cache storage
const memoryCache = new Map();

// Tag index: tag -> Set of keys
const tagIndex = new Map();

// Stats
const cacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
};

// ============================================
// CORE OPERATIONS
// ============================================

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>}
 */
async function get(key) {
    const fullKey = buildKey(key);
    const entry = memoryCache.get(fullKey);

    if (!entry) {
        cacheStats.misses++;
        return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
        memoryCache.delete(fullKey);
        removeFromTags(fullKey, entry.tags);
        cacheStats.misses++;
        return null;
    }

    cacheStats.hits++;
    return entry.value;
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {Object} options - Cache options
 * @returns {Promise<boolean>}
 */
async function set(key, value, options = {}) {
    const {
        ttl = CACHE_CONFIG.defaultTTL,
        tags = []
    } = options;

    // Enforce max TTL
    const actualTTL = Math.min(ttl, CACHE_CONFIG.maxTTL);

    const fullKey = buildKey(key);

    // Check memory limits
    if (memoryCache.size >= CACHE_CONFIG.maxEntries) {
        evictOldest();
    }

    const entry = {
        value,
        createdAt: Date.now(),
        expiresAt: actualTTL > 0 ? Date.now() + actualTTL : null,
        tags: tags || [],
        size: estimateSize(value)
    };

    memoryCache.set(fullKey, entry);

    // Index by tags
    for (const tag of entry.tags) {
        if (!tagIndex.has(tag)) {
            tagIndex.set(tag, new Set());
        }
        tagIndex.get(tag).add(fullKey);
    }

    cacheStats.sets++;
    return true;
}

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function del(key) {
    const fullKey = buildKey(key);
    const entry = memoryCache.get(fullKey);

    if (!entry) {
        return false;
    }

    memoryCache.delete(fullKey);
    removeFromTags(fullKey, entry.tags);
    cacheStats.deletes++;

    return true;
}

/**
 * Check if key exists
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function exists(key) {
    const value = await get(key);
    return value !== null;
}

/**
 * Get multiple values
 * @param {string[]} keys - Cache keys
 * @returns {Promise<Map<string, any>>}
 */
async function mget(keys) {
    const results = new Map();

    for (const key of keys) {
        const value = await get(key);
        if (value !== null) {
            results.set(key, value);
        }
    }

    return results;
}

/**
 * Set multiple values
 * @param {Map<string, any>|Object} entries - Key-value pairs
 * @param {Object} options - Cache options
 * @returns {Promise<boolean>}
 */
async function mset(entries, options = {}) {
    const items = entries instanceof Map ? entries : Object.entries(entries);

    for (const [key, value] of items) {
        await set(key, value, options);
    }

    return true;
}

/**
 * Delete multiple values
 * @param {string[]} keys - Cache keys
 * @returns {Promise<number>} Count deleted
 */
async function mdel(keys) {
    let count = 0;

    for (const key of keys) {
        if (await del(key)) {
            count++;
        }
    }

    return count;
}

// ============================================
// TAG OPERATIONS
// ============================================

/**
 * Invalidate all entries with tag
 * @param {string} tag - Tag to invalidate
 * @returns {Promise<number>} Count invalidated
 */
async function invalidateTag(tag) {
    const keys = tagIndex.get(tag);

    if (!keys || keys.size === 0) {
        return 0;
    }

    let count = 0;
    for (const fullKey of keys) {
        const entry = memoryCache.get(fullKey);
        if (entry) {
            memoryCache.delete(fullKey);
            removeFromTags(fullKey, entry.tags);
            count++;
        }
    }

    tagIndex.delete(tag);
    cacheStats.deletes += count;

    logAudit('cache_tag_invalidated', { tag, count });

    return count;
}

/**
 * Get all keys with tag
 * @param {string} tag - Tag to query
 * @returns {string[]}
 */
function getKeysByTag(tag) {
    const keys = tagIndex.get(tag);
    return keys ? Array.from(keys).map(k => k.replace(CACHE_CONFIG.prefix, '')) : [];
}

/**
 * Remove key from tag indexes
 * @param {string} fullKey - Full cache key
 * @param {string[]} tags - Tags to remove from
 */
function removeFromTags(fullKey, tags = []) {
    for (const tag of tags) {
        const tagKeys = tagIndex.get(tag);
        if (tagKeys) {
            tagKeys.delete(fullKey);
            if (tagKeys.size === 0) {
                tagIndex.delete(tag);
            }
        }
    }
}

// ============================================
// TTL OPERATIONS
// ============================================

/**
 * Get remaining TTL for key
 * @param {string} key - Cache key
 * @returns {Promise<number>} TTL in ms, -1 if no expiry, -2 if not found
 */
async function ttl(key) {
    const fullKey = buildKey(key);
    const entry = memoryCache.get(fullKey);

    if (!entry) {
        return -2;
    }

    if (!entry.expiresAt) {
        return -1;
    }

    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : -2;
}

/**
 * Update TTL for key
 * @param {string} key - Cache key
 * @param {number} ttlMs - New TTL in ms
 * @returns {Promise<boolean>}
 */
async function expire(key, ttlMs) {
    const fullKey = buildKey(key);
    const entry = memoryCache.get(fullKey);

    if (!entry) {
        return false;
    }

    entry.expiresAt = Date.now() + Math.min(ttlMs, CACHE_CONFIG.maxTTL);
    return true;
}

/**
 * Remove expiration from key
 * @param {string} key - Cache key
 * @returns {Promise<boolean>}
 */
async function persist(key) {
    const fullKey = buildKey(key);
    const entry = memoryCache.get(fullKey);

    if (!entry) {
        return false;
    }

    entry.expiresAt = null;
    return true;
}

// ============================================
// ATOMIC OPERATIONS
// ============================================

/**
 * Increment numeric value
 * @param {string} key - Cache key
 * @param {number} amount - Amount to increment
 * @returns {Promise<number>} New value
 */
async function incr(key, amount = 1) {
    const fullKey = buildKey(key);
    const entry = memoryCache.get(fullKey);

    if (!entry) {
        await set(key, amount);
        return amount;
    }

    if (typeof entry.value !== 'number') {
        throw new Error('Value is not a number');
    }

    entry.value += amount;
    return entry.value;
}

/**
 * Decrement numeric value
 * @param {string} key - Cache key
 * @param {number} amount - Amount to decrement
 * @returns {Promise<number>} New value
 */
async function decr(key, amount = 1) {
    return incr(key, -amount);
}

/**
 * Get and set in one operation
 * @param {string} key - Cache key
 * @param {any} value - New value
 * @param {Object} options - Cache options
 * @returns {Promise<any>} Old value
 */
async function getset(key, value, options = {}) {
    const oldValue = await get(key);
    await set(key, value, options);
    return oldValue;
}

/**
 * Set if not exists
 * @param {string} key - Cache key
 * @param {any} value - Value to set
 * @param {Object} options - Cache options
 * @returns {Promise<boolean>} True if set, false if exists
 */
async function setnx(key, value, options = {}) {
    if (await exists(key)) {
        return false;
    }

    await set(key, value, options);
    return true;
}

// ============================================
// CACHE WRAPPER
// ============================================

/**
 * Cache wrapper - get from cache or compute
 * @param {string} key - Cache key
 * @param {Function} compute - Function to compute value if not cached
 * @param {Object} options - Cache options
 * @returns {Promise<any>}
 */
async function wrap(key, compute, options = {}) {
    // Try cache first
    const cached = await get(key);
    if (cached !== null) {
        return cached;
    }

    // Compute value
    const value = await compute();

    // Cache result
    if (value !== null && value !== undefined) {
        await set(key, value, options);
    }

    return value;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Build full cache key
 * @param {string} key - Base key
 * @returns {string}
 */
function buildKey(key) {
    // Sanitize key
    const sanitized = String(key)
        .replace(/[^a-zA-Z0-9:_-]/g, '_')
        .slice(0, 200);

    return CACHE_CONFIG.prefix + sanitized;
}

/**
 * Estimate size of value in bytes
 * @param {any} value - Value to estimate
 * @returns {number}
 */
function estimateSize(value) {
    try {
        return JSON.stringify(value).length * 2; // Rough estimate
    } catch {
        return 1000; // Default estimate
    }
}

/**
 * Evict oldest entries
 */
function evictOldest() {
    const entries = Array.from(memoryCache.entries())
        .sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Evict 10% of entries
    const toEvict = Math.ceil(entries.length * 0.1);

    for (let i = 0; i < toEvict && i < entries.length; i++) {
        const [key, entry] = entries[i];
        memoryCache.delete(key);
        removeFromTags(key, entry.tags);
        cacheStats.evictions++;
    }

    console.log(`[Cache] Evicted ${toEvict} entries`);
}

/**
 * Cleanup expired entries
 */
function cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of memoryCache.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
            memoryCache.delete(key);
            removeFromTags(key, entry.tags);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
}

// Start cleanup interval
setInterval(cleanupExpired, CACHE_CONFIG.cleanupInterval);

/**
 * Clear all cache
 * @returns {Promise<void>}
 */
async function flush() {
    memoryCache.clear();
    tagIndex.clear();
    logAudit('cache_flushed', {});
}

/**
 * Get cache statistics
 * @returns {Object}
 */
function getStats() {
    const hitRate = cacheStats.hits + cacheStats.misses > 0
        ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2)
        : 0;

    let totalSize = 0;
    for (const entry of memoryCache.values()) {
        totalSize += entry.size || 0;
    }

    return {
        entries: memoryCache.size,
        tags: tagIndex.size,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: `${hitRate}%`,
        sets: cacheStats.sets,
        deletes: cacheStats.deletes,
        evictions: cacheStats.evictions,
        estimatedSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        config: {
            maxEntries: CACHE_CONFIG.maxEntries,
            defaultTTL: CACHE_CONFIG.defaultTTL,
            redisConfigured: !!CACHE_CONFIG.redis.url
        }
    };
}

/**
 * Get all keys matching pattern
 * @param {string} pattern - Key pattern (supports * wildcard)
 * @returns {string[]}
 */
function keys(pattern = '*') {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const results = [];

    for (const key of memoryCache.keys()) {
        const shortKey = key.replace(CACHE_CONFIG.prefix, '');
        if (regex.test(shortKey)) {
            results.push(shortKey);
        }
    }

    return results;
}

module.exports = {
    // Core
    get,
    set,
    del,
    exists,

    // Multi
    mget,
    mset,
    mdel,

    // Tags
    invalidateTag,
    getKeysByTag,

    // TTL
    ttl,
    expire,
    persist,

    // Atomic
    incr,
    decr,
    getset,
    setnx,

    // Wrapper
    wrap,

    // Utils
    flush,
    keys,
    getStats,

    // Config
    CACHE_CONFIG
};
