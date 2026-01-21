/**
 * ASDF-Web Sync Manager
 * Redis-First persistence with localStorage optimistic caching
 *
 * Strategy:
 * 1. User action triggers change
 * 2. Optimistic update to localStorage (instant UI feedback)
 * 3. Async write to Redis
 * 4. On Redis success: confirm localStorage
 * 5. On Redis failure: queue for retry, emit warning
 *
 * @example
 * import { sync } from './persistence/sync.js';
 *
 * // Write with Redis sync
 * await sync.write('user:123:xp', 1000);
 *
 * // Read (Redis first, localStorage fallback)
 * const xp = await sync.read('user:123:xp', 0);
 *
 * // Start background sync
 * sync.startBackgroundSync();
 *
 * @module persistence/sync
 */

import { redis, REDIS_EVENTS } from '../core/redis-client.js';
import { eventBus, EVENTS } from '../core/event-bus.js';
import { createLogger } from '../core/debug.js';

const log = createLogger('Sync');

// ============================================
// CONFIGURATION
// ============================================

const SYNC_CONFIG = {
  cachePrefix: 'asdf_',
  // Fibonacci-based background sync interval (ms)
  backgroundSyncInterval: 21000,  // 21 seconds
  // Fibonacci-based retry delays (ms)
  retryDelays: [1000, 1000, 2000, 3000, 5000, 8000, 13000],
  // Maximum retry attempts before dropping
  maxRetries: 5,
  // Queue storage key
  queueKey: 'asdf_sync_queue'
};

// ============================================
// SYNC MANAGER CLASS
// ============================================

class SyncManager {
  constructor(config = {}) {
    this.config = { ...SYNC_CONFIG, ...config };
    this.queue = [];
    this.syncing = false;
    this.backgroundTimer = null;
    this.online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Load pending queue from localStorage
    this._loadQueue();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._handleOnline());
      window.addEventListener('offline', () => this._handleOffline());
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Write data with Redis sync and localStorage cache
   * @param {string} key - Storage key (without prefix)
   * @param {any} value - Value to store (will be JSON stringified)
   * @param {Object} options - Write options
   * @param {Function} options.transform - Custom Redis operation (receives redis client)
   * @returns {Promise<void>}
   */
  async write(key, value, options = {}) {
    const cacheKey = this.config.cachePrefix + key;
    const jsonValue = JSON.stringify(value);

    // 1. Optimistic localStorage update (instant)
    try {
      localStorage.setItem(cacheKey, jsonValue);
      log.debug(`Cache write: ${key}`);
    } catch (e) {
      log.warn(`localStorage write failed: ${e.message}`);
    }

    // 2. If offline, queue for later
    if (!this.online) {
      this._queueWrite(key, value, options);
      eventBus.emit(EVENTS.PROGRESS_OFFLINE, { key });
      return;
    }

    // 3. Async Redis write
    try {
      if (options.transform) {
        await options.transform(redis, key, value);
      } else {
        await redis.set(key, jsonValue);
      }

      log.debug(`Redis write: ${key}`);
      eventBus.emit(EVENTS.PROGRESS_SYNCED, { key });

    } catch (error) {
      log.warn(`Redis write failed: ${key} - ${error.message}`);

      // Queue for retry
      this._queueWrite(key, value, options);
      eventBus.emit(EVENTS.PROGRESS_CONFLICT, { key, error: error.message });
    }
  }

  /**
   * Read data (Redis first, localStorage fallback)
   * @param {string} key - Storage key (without prefix)
   * @param {any} defaultValue - Default if not found
   * @returns {Promise<any>}
   */
  async read(key, defaultValue = null) {
    const cacheKey = this.config.cachePrefix + key;

    // Try Redis first if online
    if (this.online) {
      try {
        const redisValue = await redis.get(key);

        if (redisValue !== null) {
          // Update localStorage cache
          try {
            localStorage.setItem(cacheKey, redisValue);
          } catch (e) {
            // Ignore localStorage errors
          }

          return this._parse(redisValue, defaultValue);
        }
      } catch (error) {
        log.warn(`Redis read failed: ${key} - ${error.message}`);
      }
    }

    // Fall back to localStorage
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached !== null) {
        return this._parse(cached, defaultValue);
      }
    } catch (e) {
      log.warn(`localStorage read failed: ${e.message}`);
    }

    return defaultValue;
  }

  /**
   * Delete key from both Redis and localStorage
   * @param {string} key - Storage key (without prefix)
   * @returns {Promise<void>}
   */
  async delete(key) {
    const cacheKey = this.config.cachePrefix + key;

    // Remove from localStorage
    try {
      localStorage.removeItem(cacheKey);
    } catch (e) {
      // Ignore
    }

    // Remove from Redis
    if (this.online) {
      try {
        await redis.del(key);
      } catch (error) {
        log.warn(`Redis delete failed: ${key}`);
      }
    }
  }

  /**
   * Start background sync process
   * @param {number} intervalMs - Sync interval (default: 21 seconds)
   */
  startBackgroundSync(intervalMs = this.config.backgroundSyncInterval) {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
    }

    this.backgroundTimer = setInterval(() => {
      this._processQueue();
    }, intervalMs);

    log.debug(`Background sync started (${intervalMs}ms interval)`);
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync() {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
      log.debug('Background sync stopped');
    }
  }

  /**
   * Force process the retry queue now
   * @returns {Promise<void>}
   */
  async forceSync() {
    await this._processQueue();
  }

  /**
   * Get queue status
   * @returns {Object}
   */
  getQueueStatus() {
    return {
      pending: this.queue.length,
      syncing: this.syncing,
      online: this.online
    };
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    const prefix = this.config.cachePrefix;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      log.debug('Cache cleared');
    } catch (e) {
      log.warn(`Clear cache failed: ${e.message}`);
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Parse JSON value safely
   */
  _parse(value, defaultValue) {
    if (value === null || value === undefined) {
      return defaultValue;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Queue a write for later retry
   */
  _queueWrite(key, value, options) {
    // Check if already in queue
    const existing = this.queue.findIndex(item => item.key === key);

    if (existing >= 0) {
      // Update existing entry
      this.queue[existing] = {
        key,
        value,
        options,
        attempts: this.queue[existing].attempts,
        timestamp: Date.now()
      };
    } else {
      // Add new entry
      this.queue.push({
        key,
        value,
        options,
        attempts: 0,
        timestamp: Date.now()
      });
    }

    this._saveQueue();
    log.debug(`Queued: ${key} (${this.queue.length} pending)`);
  }

  /**
   * Process the retry queue
   */
  async _processQueue() {
    if (this.syncing || this.queue.length === 0 || !this.online) {
      return;
    }

    this.syncing = true;

    // Process oldest first
    const item = this.queue[0];
    item.attempts++;

    try {
      if (item.options?.transform) {
        await item.options.transform(redis, item.key, item.value);
      } else {
        await redis.set(item.key, JSON.stringify(item.value));
      }

      // Success - remove from queue
      this.queue.shift();
      this._saveQueue();

      log.debug(`Synced from queue: ${item.key}`);
      eventBus.emit(EVENTS.PROGRESS_SYNCED, { key: item.key, fromQueue: true });

    } catch (error) {
      log.warn(`Queue sync failed: ${item.key} (attempt ${item.attempts})`);

      if (item.attempts >= this.config.maxRetries) {
        // Give up after max attempts
        this.queue.shift();
        this._saveQueue();

        log.warn(`Dropped after ${item.attempts} attempts: ${item.key}`);
        eventBus.emit(EVENTS.PROGRESS_CONFLICT, {
          key: item.key,
          error: error.message,
          dropped: true
        });
      }
    }

    this.syncing = false;

    // Process next item if any
    if (this.queue.length > 0) {
      const delay = this.config.retryDelays[
        Math.min(item.attempts, this.config.retryDelays.length - 1)
      ];
      setTimeout(() => this._processQueue(), delay);
    }
  }

  /**
   * Load queue from localStorage
   */
  _loadQueue() {
    try {
      const saved = localStorage.getItem(this.config.queueKey);
      if (saved) {
        this.queue = JSON.parse(saved);
        log.debug(`Loaded ${this.queue.length} pending items from queue`);
      }
    } catch (e) {
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  _saveQueue() {
    try {
      localStorage.setItem(this.config.queueKey, JSON.stringify(this.queue));
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Handle coming back online
   */
  _handleOnline() {
    this.online = true;
    log.debug('Online - processing queue');
    eventBus.emit(EVENTS.NETWORK_CHANGE, { online: true });
    this._processQueue();
  }

  /**
   * Handle going offline
   */
  _handleOffline() {
    this.online = false;
    log.debug('Offline - writes will be queued');
    eventBus.emit(EVENTS.NETWORK_CHANGE, { online: false });
    eventBus.emit(EVENTS.PROGRESS_OFFLINE, {});
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const sync = new SyncManager();

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.sync = sync;
}
