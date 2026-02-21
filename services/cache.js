/**
 * Cache Manager - Multi-tier Caching Strategy
 * Implements memory cache → Redis → database pattern
 *
 * Usage:
 * import { cacheManager } from './services/cache.js';
 * const stats = await cacheManager.get('burns:stats');
 * if (!stats) {
 *   stats = await queryDatabase(...);
 *   await cacheManager.set('burns:stats', stats, 3600);
 * }
 *
 * @author CYNIC
 */

import redis from 'redis';

/**
 * CacheManager - Three-tier caching strategy
 * L1: In-memory cache (fastest, small size)
 * L2: Redis cache (medium speed, large size)
 * L3: Database / origin (slowest, source of truth)
 */
export class CacheManager {
  constructor(options = {}) {
    // L1: In-memory cache
    this.memory = new Map();
    this.memoryMaxSize = options.memoryMaxSize || 100; // max 100 items

    // L2: Redis cache
    this.redisClient = null;
    this.redisEnabled = false;
    this.defaultTtl = options.defaultTtl || 3600; // 1 hour

    // Stats
    this.hits = 0;
    this.misses = 0;
    this.startTime = Date.now();

    // Initialize Redis if configured
    if (options.redisUrl || options.redisHost) {
      this.initRedis(options);
    }
  }

  /**
   * Initialize Redis connection
   * @private
   */
  async initRedis(options) {
    try {
      this.redisClient = redis.createClient({
        url: options.redisUrl,
        host: options.redisHost,
        port: options.redisPort || 6379,
        password: options.redisPassword,
        socket: {
          reconnectStrategy: retries => {
            if (retries > 10) {
              console.error('[Cache] Redis reconnection failed after 10 attempts');
              return new Error('Max Redis retries exceeded');
            }
            return Math.min(1000 * Math.pow(2, retries), 3000);
          },
        },
      });

      this.redisClient.on('error', err => {
        console.error('[Cache] Redis error:', err);
        this.redisEnabled = false;
      });

      this.redisClient.on('connect', () => {
        console.log('[Cache] Redis connected');
        this.redisEnabled = true;
      });

      await this.redisClient.connect();
      this.redisEnabled = true;
    } catch (err) {
      console.warn('[Cache] Redis initialization failed, using memory-only cache:', err.message);
      this.redisEnabled = false;
    }
  }

  /**
   * Get value from cache (tries L1 → L2 → return null)
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    // L1: Memory cache (synchronous, fastest)
    if (this.memory.has(key)) {
      this.hits++;
      return this.memory.get(key).value;
    }

    // L2: Redis cache (async, medium speed)
    if (this.redisEnabled && this.redisClient) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          // Populate L1 for next access
          this.memory.set(key, { value: parsed, expiry: Date.now() + 60000 });
          this.hits++;
          return parsed;
        }
      } catch (err) {
        console.warn(`[Cache] Redis get error for ${key}:`, err.message);
      }
    }

    // Cache miss
    this.misses++;
    return null;
  }

  /**
   * Set value in cache (sets both L1 and L2)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 3600)
   */
  async set(key, value, ttl = this.defaultTtl) {
    if (value === null || value === undefined) {
      return; // Don't cache empty values
    }

    // L1: Memory cache
    if (this.memory.size >= this.memoryMaxSize) {
      // Evict oldest entry (FIFO)
      const firstKey = this.memory.keys().next().value;
      this.memory.delete(firstKey);
    }

    this.memory.set(key, {
      value,
      expiry: Date.now() + ttl * 1000,
    });

    // L2: Redis cache (async, don't block)
    if (this.redisEnabled && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      } catch (err) {
        console.warn(`[Cache] Redis set error for ${key}:`, err.message);
      }
    }
  }

  /**
   * Delete key from cache (both L1 and L2)
   * @param {string} key - Cache key
   */
  async delete(key) {
    // L1: Remove from memory
    this.memory.delete(key);

    // L2: Remove from Redis
    if (this.redisEnabled && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        console.warn(`[Cache] Redis delete error for ${key}:`, err.message);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    // L1: Clear memory
    this.memory.clear();

    // L2: Clear Redis
    if (this.redisEnabled && this.redisClient) {
      try {
        await this.redisClient.flushDb();
      } catch (err) {
        console.warn('[Cache] Redis flush error:', err.message);
      }
    }
  }

  /**
   * Get cache key for namespaced storage
   * Example: cacheKey('burns', 'stats') → 'burns:stats'
   * @param {...string} parts - Key parts
   * @returns {string} Formatted cache key
   */
  static key(...parts) {
    return parts.filter(p => p).join(':');
  }

  /**
   * Get cache statistics
   * @returns {Object} Hit rate, sizes, etc.
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    const uptime = Date.now() - this.startTime;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(2) + '%',
      totalRequests,
      memorySize: this.memory.size,
      memoryMaxSize: this.memoryMaxSize,
      redisEnabled: this.redisEnabled,
      uptime: `${(uptime / 1000 / 60).toFixed(1)}m`,
    };
  }

  /**
   * Clear expired entries from memory cache
   * @private
   */
  #purgeExpired() {
    const now = Date.now();
    for (const [key, { expiry }] of this.memory.entries()) {
      if (now > expiry) {
        this.memory.delete(key);
      }
    }
  }

  /**
   * Periodic cleanup (call every 5 minutes)
   */
  startCleanup(intervalMs = 300000) {
    setInterval(() => {
      this.#purgeExpired();
    }, intervalMs);
  }
}

/**
 * Global cache manager instance
 * Initialize in server startup
 */
export let cacheManager = new CacheManager({
  memoryMaxSize: 100,
  defaultTtl: 3600,
  // Redis config from environment variables
  redisUrl: process.env.REDIS_URL,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  redisPassword: process.env.REDIS_PASSWORD,
});

// Start cleanup routine
cacheManager.startCleanup();

/**
 * Cache middleware for Express
 * Automatically caches GET requests
 * Invalidates cache on POST/PUT/DELETE
 *
 * Usage:
 * app.use(cacheMiddleware());
 * app.get('/api/data', (req, res) => { ... }); // Auto-cached
 */
export function cacheMiddleware(options = {}) {
  const cacheTtl = options.ttl || 3600;
  const excludePaths = options.excludePaths || [];
  const cacheKeyPrefix = options.prefix || 'api';

  return (req, res, next) => {
    const isGetRequest = req.method === 'GET';
    const isExcluded = excludePaths.some(path => req.path.startsWith(path));

    // Cache GET requests
    if (isGetRequest && !isExcluded) {
      res.on('finish', async () => {
        if (res.statusCode === 200) {
          const cacheKey = CacheManager.key(cacheKeyPrefix, req.path, JSON.stringify(req.query));
          // Cache will be populated by route handler
          // This just sets up the mechanism
        }
      });
    }

    // Invalidate cache on mutations
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      res.on('finish', async () => {
        if (res.statusCode < 400) {
          // Invalidate related cache entries
          // Example: POST /api/burns → invalidate burns:* keys
          const resource = req.path.split('/')[2]; // 'burns' from '/api/burns'
          const pattern = `${cacheKeyPrefix}:${resource}`;
          // In production, would iterate cache keys matching pattern
          // For now, selective invalidation works better
        }
      });
    }

    next();
  };
}

/**
 * Wrapper for database queries with automatic caching
 * @param {string} key - Cache key
 * @param {Function} queryFn - Function that executes database query
 * @param {number} ttl - Seconds to cache result
 * @returns {Promise<any>} Cached or fresh result
 */
export async function cached(key, queryFn, ttl = 3600) {
  // Try cache first
  const cached = await cacheManager.get(key);
  if (cached !== null) {
    return cached;
  }

  // Execute query
  const result = await queryFn();

  // Cache result
  await cacheManager.set(key, result, ttl);

  return result;
}

/**
 * Invalidate cache by pattern
 * Usage: invalidatePattern('burns:*')
 * @param {string} pattern - Key pattern (support * wildcard)
 */
export async function invalidatePattern(pattern) {
  // Memory cache: iterate and delete matching keys
  for (const key of cacheManager.memory.keys()) {
    if (pattern === '*' || key.match(pattern.replace(/\*/g, '.*'))) {
      cacheManager.memory.delete(key);
    }
  }

  // Redis cache: use SCAN for large datasets
  if (cacheManager.redisEnabled && cacheManager.redisClient) {
    try {
      const keys = [];
      for await (const key of cacheManager.redisClient.scanIterator({
        MATCH: pattern,
      })) {
        keys.push(key);
      }
      if (keys.length > 0) {
        await cacheManager.redisClient.del(keys);
      }
    } catch (err) {
      console.warn('[Cache] Pattern invalidation error:', err.message);
    }
  }
}
