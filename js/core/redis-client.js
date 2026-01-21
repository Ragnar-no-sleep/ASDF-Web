/**
 * ASDF-Web Redis Client
 * Primary data store client with optimistic localStorage caching
 *
 * Strategy: Redis-First
 * - All writes go to Redis first via backend proxy
 * - localStorage acts as read cache for offline/fallback
 * - Optimistic updates with eventual consistency
 *
 * @example
 * import { redis, REDIS_EVENTS } from './core/redis-client.js';
 *
 * // String operations
 * await redis.set('user:123:xp', 1000);
 * const xp = await redis.get('user:123:xp');
 *
 * // Hash operations
 * await redis.hset('user:123:progress', 'dev', 500);
 * const progress = await redis.hgetall('user:123:progress');
 *
 * // Sorted sets (leaderboards)
 * await redis.zadd('leaderboard:xp', 1000, 'user:123');
 * const top10 = await redis.zrevrange('leaderboard:xp', 0, 9, true);
 *
 * @module core/redis-client
 */

import { eventBus, EVENTS } from './event-bus.js';
import { getConfig } from './config.js';
import { createError } from './errors.js';

// ============================================
// CONFIGURATION
// ============================================

const REDIS_CONFIG = {
  apiUrl: '/api/redis',
  timeout: 5000,
  maxRetries: 3,
  // Fibonacci-based retry delays (ms)
  retryDelays: [1000, 1000, 2000, 3000, 5000],
  // Cache settings
  cachePrefix: 'asdf_redis_',
  cacheTTL: 300000 // 5 minutes in-memory cache
};

// Allowed Redis methods (whitelist for security)
const ALLOWED_METHODS = [
  // Strings
  'GET', 'SET', 'DEL', 'INCR', 'INCRBY', 'DECR', 'DECRBY',
  'MGET', 'MSET', 'SETNX', 'SETEX', 'TTL', 'EXPIRE',
  // Hashes
  'HGET', 'HSET', 'HDEL', 'HGETALL', 'HMGET', 'HMSET',
  'HINCRBY', 'HEXISTS', 'HKEYS', 'HVALS', 'HLEN',
  // Sets
  'SADD', 'SREM', 'SMEMBERS', 'SISMEMBER', 'SCARD', 'SUNION', 'SINTER',
  // Lists
  'LPUSH', 'RPUSH', 'LPOP', 'RPOP', 'LRANGE', 'LLEN', 'LINDEX',
  // Sorted Sets (leaderboards)
  'ZADD', 'ZREM', 'ZSCORE', 'ZRANK', 'ZREVRANK',
  'ZRANGE', 'ZREVRANGE', 'ZRANGEBYSCORE', 'ZCOUNT', 'ZCARD',
  // Keys
  'EXISTS', 'KEYS', 'TYPE', 'SCAN'
];

// ============================================
// REDIS CLIENT CLASS
// ============================================

class RedisClient {
  constructor(config = {}) {
    this.config = { ...REDIS_CONFIG, ...config };
    this.connected = false;
    this.cache = new Map();
    this.pendingQueue = [];
    this.retryCount = 0;
  }

  // ============================================
  // CORE REQUEST METHOD
  // ============================================

  /**
   * Make a request to Redis via backend proxy
   * @param {string} method - Redis command (e.g., 'GET', 'SET')
   * @param {Array} params - Command parameters
   * @returns {Promise<any>} Redis response
   */
  async request(method, params = []) {
    const upperMethod = method.toUpperCase();

    // Validate method
    if (!ALLOWED_METHODS.includes(upperMethod)) {
      throw new Error(`Redis method not allowed: ${method}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: upperMethod,
          params
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Redis error: ${response.status}`);
      }

      const result = await response.json();

      // Mark as connected on success
      if (!this.connected) {
        this.connected = true;
        this.retryCount = 0;
        eventBus.emit(REDIS_EVENTS.CONNECTED, { timestamp: Date.now() });
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw createError('REDIS_TIMEOUT', { method, params });
      }

      // Handle connection failure
      if (this.connected) {
        this.connected = false;
        eventBus.emit(REDIS_EVENTS.DISCONNECTED, { error: error.message });
      }

      throw createError('REDIS_ERROR', { method, params, error: error.message });
    }
  }

  /**
   * Request with automatic retry
   * @param {string} method - Redis command
   * @param {Array} params - Command parameters
   * @returns {Promise<any>} Redis response
   */
  async requestWithRetry(method, params = []) {
    let lastError;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.request(method, params);
      } catch (error) {
        lastError = error;

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelays[attempt] || 5000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // ============================================
  // STRING OPERATIONS
  // ============================================

  /**
   * Get a value by key
   * @param {string} key - Redis key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    return this.requestWithRetry('GET', [key]);
  }

  /**
   * Set a value
   * @param {string} key - Redis key
   * @param {string|number} value - Value to set
   * @param {Object} options - Options (ex: seconds TTL, nx: only if not exists)
   * @returns {Promise<string>} 'OK' on success
   */
  async set(key, value, options = {}) {
    const params = [key, value];

    if (options.ex) params.push('EX', options.ex);
    if (options.px) params.push('PX', options.px);
    if (options.nx) params.push('NX');
    if (options.xx) params.push('XX');

    return this.requestWithRetry('SET', params);
  }

  /**
   * Delete keys
   * @param {...string} keys - Keys to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  async del(...keys) {
    return this.requestWithRetry('DEL', keys);
  }

  /**
   * Increment a key
   * @param {string} key - Redis key
   * @returns {Promise<number>} New value
   */
  async incr(key) {
    return this.requestWithRetry('INCR', [key]);
  }

  /**
   * Increment by amount
   * @param {string} key - Redis key
   * @param {number} increment - Amount to increment
   * @returns {Promise<number>} New value
   */
  async incrby(key, increment) {
    return this.requestWithRetry('INCRBY', [key, increment]);
  }

  /**
   * Check if key exists
   * @param {string} key - Redis key
   * @returns {Promise<number>} 1 if exists, 0 if not
   */
  async exists(key) {
    return this.requestWithRetry('EXISTS', [key]);
  }

  /**
   * Set TTL on key
   * @param {string} key - Redis key
   * @param {number} seconds - TTL in seconds
   * @returns {Promise<number>} 1 if set, 0 if key doesn't exist
   */
  async expire(key, seconds) {
    return this.requestWithRetry('EXPIRE', [key, seconds]);
  }

  // ============================================
  // HASH OPERATIONS
  // ============================================

  /**
   * Get hash field
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @returns {Promise<string|null>}
   */
  async hget(key, field) {
    return this.requestWithRetry('HGET', [key, field]);
  }

  /**
   * Set hash field
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @param {string|number} value - Field value
   * @returns {Promise<number>} 1 if new field, 0 if updated
   */
  async hset(key, field, value) {
    return this.requestWithRetry('HSET', [key, field, value]);
  }

  /**
   * Get all hash fields and values
   * @param {string} key - Hash key
   * @returns {Promise<Object>} Object with field:value pairs
   */
  async hgetall(key) {
    const result = await this.requestWithRetry('HGETALL', [key]);

    // Convert array result to object if needed
    if (Array.isArray(result)) {
      const obj = {};
      for (let i = 0; i < result.length; i += 2) {
        obj[result[i]] = result[i + 1];
      }
      return obj;
    }

    return result || {};
  }

  /**
   * Increment hash field
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @param {number} increment - Amount to increment
   * @returns {Promise<number>} New value
   */
  async hincrby(key, field, increment) {
    return this.requestWithRetry('HINCRBY', [key, field, increment]);
  }

  /**
   * Delete hash field
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @returns {Promise<number>} 1 if deleted, 0 if not found
   */
  async hdel(key, field) {
    return this.requestWithRetry('HDEL', [key, field]);
  }

  // ============================================
  // SET OPERATIONS
  // ============================================

  /**
   * Add members to set
   * @param {string} key - Set key
   * @param {...string} members - Members to add
   * @returns {Promise<number>} Number of members added
   */
  async sadd(key, ...members) {
    return this.requestWithRetry('SADD', [key, ...members]);
  }

  /**
   * Get all set members
   * @param {string} key - Set key
   * @returns {Promise<string[]>} Array of members
   */
  async smembers(key) {
    return this.requestWithRetry('SMEMBERS', [key]);
  }

  /**
   * Check if member exists in set
   * @param {string} key - Set key
   * @param {string} member - Member to check
   * @returns {Promise<number>} 1 if member, 0 if not
   */
  async sismember(key, member) {
    return this.requestWithRetry('SISMEMBER', [key, member]);
  }

  /**
   * Remove members from set
   * @param {string} key - Set key
   * @param {...string} members - Members to remove
   * @returns {Promise<number>} Number removed
   */
  async srem(key, ...members) {
    return this.requestWithRetry('SREM', [key, ...members]);
  }

  // ============================================
  // LIST OPERATIONS
  // ============================================

  /**
   * Push to left of list
   * @param {string} key - List key
   * @param {...string} elements - Elements to push
   * @returns {Promise<number>} New length
   */
  async lpush(key, ...elements) {
    return this.requestWithRetry('LPUSH', [key, ...elements]);
  }

  /**
   * Push to right of list
   * @param {string} key - List key
   * @param {...string} elements - Elements to push
   * @returns {Promise<number>} New length
   */
  async rpush(key, ...elements) {
    return this.requestWithRetry('RPUSH', [key, ...elements]);
  }

  /**
   * Get range from list
   * @param {string} key - List key
   * @param {number} start - Start index
   * @param {number} stop - Stop index (-1 for end)
   * @returns {Promise<string[]>} Array of elements
   */
  async lrange(key, start, stop) {
    return this.requestWithRetry('LRANGE', [key, start, stop]);
  }

  /**
   * Get list length
   * @param {string} key - List key
   * @returns {Promise<number>} Length
   */
  async llen(key) {
    return this.requestWithRetry('LLEN', [key]);
  }

  // ============================================
  // SORTED SET OPERATIONS (Leaderboards)
  // ============================================

  /**
   * Add to sorted set
   * @param {string} key - Sorted set key
   * @param {number} score - Score
   * @param {string} member - Member
   * @returns {Promise<number>} Number added
   */
  async zadd(key, score, member) {
    return this.requestWithRetry('ZADD', [key, score, member]);
  }

  /**
   * Get score of member
   * @param {string} key - Sorted set key
   * @param {string} member - Member
   * @returns {Promise<string|null>} Score or null
   */
  async zscore(key, member) {
    return this.requestWithRetry('ZSCORE', [key, member]);
  }

  /**
   * Get rank of member (0-based, lowest first)
   * @param {string} key - Sorted set key
   * @param {string} member - Member
   * @returns {Promise<number|null>} Rank or null
   */
  async zrank(key, member) {
    return this.requestWithRetry('ZRANK', [key, member]);
  }

  /**
   * Get reverse rank (highest first)
   * @param {string} key - Sorted set key
   * @param {string} member - Member
   * @returns {Promise<number|null>} Rank or null
   */
  async zrevrank(key, member) {
    return this.requestWithRetry('ZREVRANK', [key, member]);
  }

  /**
   * Get range by rank (lowest first)
   * @param {string} key - Sorted set key
   * @param {number} start - Start rank
   * @param {number} stop - Stop rank
   * @param {boolean} withScores - Include scores
   * @returns {Promise<Array>} Members (with scores if requested)
   */
  async zrange(key, start, stop, withScores = false) {
    const params = [key, start, stop];
    if (withScores) params.push('WITHSCORES');
    return this.requestWithRetry('ZRANGE', params);
  }

  /**
   * Get range by rank (highest first) - for leaderboards
   * @param {string} key - Sorted set key
   * @param {number} start - Start rank
   * @param {number} stop - Stop rank
   * @param {boolean} withScores - Include scores
   * @returns {Promise<Array>} Members (with scores if requested)
   */
  async zrevrange(key, start, stop, withScores = false) {
    const params = [key, start, stop];
    if (withScores) params.push('WITHSCORES');
    return this.requestWithRetry('ZREVRANGE', params);
  }

  /**
   * Get count in sorted set
   * @param {string} key - Sorted set key
   * @returns {Promise<number>} Count
   */
  async zcard(key) {
    return this.requestWithRetry('ZCARD', [key]);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Check connection status
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Ping the server (health check)
   * @returns {Promise<boolean>}
   */
  async ping() {
    try {
      await this.request('GET', ['__ping__']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get JSON value (convenience method)
   * @param {string} key - Redis key
   * @returns {Promise<any>} Parsed JSON or null
   */
  async getJSON(key) {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Set JSON value (convenience method)
   * @param {string} key - Redis key
   * @param {any} value - Value to serialize
   * @param {Object} options - Set options
   * @returns {Promise<string>}
   */
  async setJSON(key, value, options = {}) {
    return this.set(key, JSON.stringify(value), options);
  }
}

// ============================================
// REDIS EVENTS
// ============================================

export const REDIS_EVENTS = {
  CONNECTED: 'redis:connected',
  DISCONNECTED: 'redis:disconnected',
  ERROR: 'redis:error',
  RETRY: 'redis:retry'
};

// ============================================
// SINGLETON INSTANCE
// ============================================

export const redis = new RedisClient();

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.redis = redis;
  window.ASDF.REDIS_EVENTS = REDIS_EVENTS;
}
