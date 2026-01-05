/**
 * ASDF API - Storage Abstraction Layer
 *
 * Unified storage interface for easy Redis migration:
 * - In-memory storage (current)
 * - Redis adapter (future)
 * - Automatic serialization
 * - TTL support
 * - Pub/Sub for real-time
 *
 * Philosophy: Prepare for scale, start simple
 *
 * @version 1.0.0
 *
 * Security by Design:
 * - Memory bounds
 * - Key validation
 * - Serialization safety
 */

'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');

// ============================================
// CONFIGURATION
// ============================================

const STORAGE_CONFIG = {
    // Memory limits
    maxKeys: 100000,
    maxKeySize: 256,
    maxValueSize: 1024 * 1024,  // 1MB

    // TTL
    defaultTTL: 24 * 60 * 60 * 1000,  // 24 hours
    cleanupInterval: 60 * 1000,        // 1 minute

    // Serialization
    enableCompression: false,  // Enable when using Redis

    // Pub/Sub
    maxSubscribers: 10000,
    maxChannels: 1000
};

// Storage backends
const BACKENDS = {
    MEMORY: 'memory',
    REDIS: 'redis'
};

// ============================================
// MEMORY STORAGE ADAPTER
// ============================================

class MemoryAdapter extends EventEmitter {
    constructor() {
        super();
        this.data = new Map();
        this.ttls = new Map();
        this.channels = new Map();
        this.stats = {
            gets: 0,
            sets: 0,
            deletes: 0,
            hits: 0,
            misses: 0
        };

        // Start cleanup timer
        this.cleanupTimer = setInterval(() => this.cleanup(), STORAGE_CONFIG.cleanupInterval);
    }

    /**
     * Get a value
     * @param {string} key - Key
     * @returns {Promise<any>}
     */
    async get(key) {
        this.stats.gets++;

        // Check TTL
        const ttlInfo = this.ttls.get(key);
        if (ttlInfo && Date.now() > ttlInfo.expiresAt) {
            this.data.delete(key);
            this.ttls.delete(key);
            this.stats.misses++;
            return null;
        }

        const value = this.data.get(key);
        if (value === undefined) {
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return deserialize(value);
    }

    /**
     * Set a value
     * @param {string} key - Key
     * @param {any} value - Value
     * @param {Object} options - Options
     * @returns {Promise<boolean>}
     */
    async set(key, value, options = {}) {
        validateKey(key);
        this.stats.sets++;

        const serialized = serialize(value);

        if (serialized.length > STORAGE_CONFIG.maxValueSize) {
            throw new Error('Value exceeds maximum size');
        }

        // Enforce memory limit
        if (this.data.size >= STORAGE_CONFIG.maxKeys && !this.data.has(key)) {
            this.evictOldest();
        }

        this.data.set(key, serialized);

        // Set TTL
        const ttl = options.ttl || options.ex ? options.ex * 1000 : null;
        if (ttl) {
            this.ttls.set(key, {
                expiresAt: Date.now() + ttl,
                ttl
            });
        } else {
            this.ttls.delete(key);
        }

        return true;
    }

    /**
     * Delete a key
     * @param {string} key - Key
     * @returns {Promise<boolean>}
     */
    async del(key) {
        this.stats.deletes++;
        const existed = this.data.has(key);
        this.data.delete(key);
        this.ttls.delete(key);
        return existed;
    }

    /**
     * Check if key exists
     * @param {string} key - Key
     * @returns {Promise<boolean>}
     */
    async exists(key) {
        const ttlInfo = this.ttls.get(key);
        if (ttlInfo && Date.now() > ttlInfo.expiresAt) {
            this.data.delete(key);
            this.ttls.delete(key);
            return false;
        }
        return this.data.has(key);
    }

    /**
     * Set expiration
     * @param {string} key - Key
     * @param {number} seconds - TTL in seconds
     * @returns {Promise<boolean>}
     */
    async expire(key, seconds) {
        if (!this.data.has(key)) return false;

        this.ttls.set(key, {
            expiresAt: Date.now() + seconds * 1000,
            ttl: seconds * 1000
        });
        return true;
    }

    /**
     * Get TTL remaining
     * @param {string} key - Key
     * @returns {Promise<number>} TTL in seconds, -1 if no TTL, -2 if not exists
     */
    async ttl(key) {
        if (!this.data.has(key)) return -2;

        const ttlInfo = this.ttls.get(key);
        if (!ttlInfo) return -1;

        const remaining = ttlInfo.expiresAt - Date.now();
        return remaining > 0 ? Math.ceil(remaining / 1000) : -2;
    }

    /**
     * Increment a value
     * @param {string} key - Key
     * @param {number} amount - Amount to increment
     * @returns {Promise<number>}
     */
    async incr(key, amount = 1) {
        const current = await this.get(key) || 0;
        const newValue = current + amount;
        await this.set(key, newValue);
        return newValue;
    }

    /**
     * Get multiple keys
     * @param {string[]} keys - Keys
     * @returns {Promise<Array>}
     */
    async mget(keys) {
        return Promise.all(keys.map(k => this.get(k)));
    }

    /**
     * Set multiple keys
     * @param {Object} keyValues - Key-value pairs
     * @returns {Promise<boolean>}
     */
    async mset(keyValues) {
        for (const [key, value] of Object.entries(keyValues)) {
            await this.set(key, value);
        }
        return true;
    }

    /**
     * Get keys matching pattern
     * @param {string} pattern - Pattern (supports * wildcard)
     * @returns {Promise<string[]>}
     */
    async keys(pattern) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        const result = [];

        for (const key of this.data.keys()) {
            if (regex.test(key)) {
                result.push(key);
            }
        }

        return result;
    }

    /**
     * Hash operations
     */
    async hget(key, field) {
        const hash = await this.get(key);
        return hash ? hash[field] : null;
    }

    async hset(key, field, value) {
        const hash = await this.get(key) || {};
        hash[field] = value;
        return this.set(key, hash);
    }

    async hgetall(key) {
        return await this.get(key) || {};
    }

    async hdel(key, field) {
        const hash = await this.get(key);
        if (!hash) return false;
        delete hash[field];
        return this.set(key, hash);
    }

    async hincrby(key, field, amount) {
        const hash = await this.get(key) || {};
        hash[field] = (hash[field] || 0) + amount;
        await this.set(key, hash);
        return hash[field];
    }

    /**
     * List operations
     */
    async lpush(key, ...values) {
        const list = await this.get(key) || [];
        list.unshift(...values);
        await this.set(key, list);
        return list.length;
    }

    async rpush(key, ...values) {
        const list = await this.get(key) || [];
        list.push(...values);
        await this.set(key, list);
        return list.length;
    }

    async lpop(key) {
        const list = await this.get(key);
        if (!list || list.length === 0) return null;
        const value = list.shift();
        await this.set(key, list);
        return value;
    }

    async rpop(key) {
        const list = await this.get(key);
        if (!list || list.length === 0) return null;
        const value = list.pop();
        await this.set(key, list);
        return value;
    }

    async lrange(key, start, stop) {
        const list = await this.get(key) || [];
        if (stop < 0) stop = list.length + stop + 1;
        return list.slice(start, stop);
    }

    async llen(key) {
        const list = await this.get(key);
        return list ? list.length : 0;
    }

    async ltrim(key, start, stop) {
        const list = await this.get(key);
        if (!list) return false;
        if (stop < 0) stop = list.length + stop + 1;
        await this.set(key, list.slice(start, stop));
        return true;
    }

    /**
     * Set operations
     */
    async sadd(key, ...members) {
        const set = new Set(await this.get(key) || []);
        let added = 0;
        for (const member of members) {
            if (!set.has(member)) {
                set.add(member);
                added++;
            }
        }
        await this.set(key, Array.from(set));
        return added;
    }

    async srem(key, ...members) {
        const set = new Set(await this.get(key) || []);
        let removed = 0;
        for (const member of members) {
            if (set.delete(member)) removed++;
        }
        await this.set(key, Array.from(set));
        return removed;
    }

    async smembers(key) {
        return await this.get(key) || [];
    }

    async sismember(key, member) {
        const set = await this.get(key) || [];
        return set.includes(member);
    }

    async scard(key) {
        const set = await this.get(key);
        return set ? set.length : 0;
    }

    /**
     * Sorted set operations
     */
    async zadd(key, ...args) {
        // args: [score1, member1, score2, member2, ...]
        const zset = await this.get(key) || [];
        let added = 0;

        for (let i = 0; i < args.length; i += 2) {
            const score = args[i];
            const member = args[i + 1];

            const existing = zset.findIndex(item => item.member === member);
            if (existing >= 0) {
                zset[existing].score = score;
            } else {
                zset.push({ score, member });
                added++;
            }
        }

        // Sort by score
        zset.sort((a, b) => a.score - b.score);
        await this.set(key, zset);
        return added;
    }

    async zrange(key, start, stop, withScores = false) {
        const zset = await this.get(key) || [];
        if (stop < 0) stop = zset.length + stop + 1;
        const slice = zset.slice(start, stop);

        if (withScores) {
            return slice.flatMap(item => [item.member, item.score]);
        }
        return slice.map(item => item.member);
    }

    async zrevrange(key, start, stop, withScores = false) {
        const zset = await this.get(key) || [];
        const reversed = [...zset].reverse();
        if (stop < 0) stop = reversed.length + stop + 1;
        const slice = reversed.slice(start, stop);

        if (withScores) {
            return slice.flatMap(item => [item.member, item.score]);
        }
        return slice.map(item => item.member);
    }

    async zscore(key, member) {
        const zset = await this.get(key) || [];
        const item = zset.find(i => i.member === member);
        return item ? item.score : null;
    }

    async zrank(key, member) {
        const zset = await this.get(key) || [];
        const index = zset.findIndex(i => i.member === member);
        return index >= 0 ? index : null;
    }

    async zcard(key) {
        const zset = await this.get(key);
        return zset ? zset.length : 0;
    }

    /**
     * Pub/Sub
     */
    subscribe(channel, callback) {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        this.channels.get(channel).add(callback);
        return () => this.unsubscribe(channel, callback);
    }

    unsubscribe(channel, callback) {
        const subscribers = this.channels.get(channel);
        if (subscribers) {
            subscribers.delete(callback);
            if (subscribers.size === 0) {
                this.channels.delete(channel);
            }
        }
    }

    async publish(channel, message) {
        const subscribers = this.channels.get(channel);
        if (!subscribers) return 0;

        const serialized = typeof message === 'string' ? message : JSON.stringify(message);

        for (const callback of subscribers) {
            try {
                callback(serialized, channel);
            } catch (error) {
                console.error('[Storage] Pub/Sub callback error:', error.message);
            }
        }

        return subscribers.size;
    }

    /**
     * Pattern subscribe (simplified)
     */
    psubscribe(pattern, callback) {
        // Store pattern subscription
        const key = `pattern:${pattern}`;
        if (!this.channels.has(key)) {
            this.channels.set(key, { pattern, callbacks: new Set() });
        }
        this.channels.get(key).callbacks.add(callback);
    }

    /**
     * Cleanup expired keys
     */
    cleanup() {
        const now = Date.now();
        for (const [key, ttlInfo] of this.ttls.entries()) {
            if (now > ttlInfo.expiresAt) {
                this.data.delete(key);
                this.ttls.delete(key);
            }
        }
    }

    /**
     * Evict oldest entry
     */
    evictOldest() {
        // Simple FIFO eviction
        const firstKey = this.data.keys().next().value;
        if (firstKey) {
            this.data.delete(firstKey);
            this.ttls.delete(firstKey);
        }
    }

    /**
     * Flush all data
     */
    async flushall() {
        this.data.clear();
        this.ttls.clear();
        return true;
    }

    /**
     * Get info
     */
    async info() {
        return {
            backend: BACKENDS.MEMORY,
            keys: this.data.size,
            channels: this.channels.size,
            stats: this.stats,
            memory: process.memoryUsage().heapUsed
        };
    }

    /**
     * Close connection
     */
    async close() {
        clearInterval(this.cleanupTimer);
        this.data.clear();
        this.ttls.clear();
        this.channels.clear();
    }
}

// ============================================
// REDIS ADAPTER
// ============================================

/**
 * Redis storage adapter using node-redis
 * Production-ready with:
 * - Automatic reconnection (Fibonacci backoff)
 * - Connection timeouts
 * - Error handling
 * - Separate pub/sub connection
 */
class RedisAdapter extends EventEmitter {
    constructor(config) {
        super();
        this.config = {
            url: config.url || null,
            host: config.host || 'localhost',
            port: config.port || 6379,
            password: config.password || null,
            database: config.db || 0,
            keyPrefix: config.keyPrefix || 'asdf:',
            // Timeouts (Fibonacci-inspired)
            connectTimeout: config.connectTimeout || 8000,
            commandTimeout: config.commandTimeout || 5000,
            // TLS
            tls: config.tls || null
        };
        this.client = null;
        this.subscriber = null;
        this.subscriptions = new Map();
        this.isConnected = false;
        this.stats = {
            gets: 0,
            sets: 0,
            deletes: 0,
            hits: 0,
            misses: 0,
            reconnections: 0,
            errors: 0
        };
    }

    /**
     * Build connection URL or options
     * @returns {Object}
     */
    _getConnectionOptions() {
        // If URL provided, use it directly
        if (this.config.url) {
            return {
                url: this.config.url,
                socket: {
                    connectTimeout: this.config.connectTimeout,
                    reconnectStrategy: (retries) => this._reconnectStrategy(retries)
                }
            };
        }

        // Build from individual options
        const options = {
            socket: {
                host: this.config.host,
                port: this.config.port,
                connectTimeout: this.config.connectTimeout,
                reconnectStrategy: (retries) => this._reconnectStrategy(retries)
            }
        };

        if (this.config.password) {
            options.password = this.config.password;
        }

        if (this.config.database) {
            options.database = this.config.database;
        }

        // TLS configuration
        if (this.config.tls) {
            options.socket.tls = true;
            if (typeof this.config.tls === 'object') {
                Object.assign(options.socket, this.config.tls);
            }
        }

        return options;
    }

    /**
     * Fibonacci-based reconnection strategy
     * @param {number} retries - Number of retries
     * @returns {number|Error} - Delay in ms or Error to stop
     */
    _reconnectStrategy(retries) {
        // Fibonacci sequence for delays: 1, 1, 2, 3, 5, 8, 13, 21, 34...
        const fibonacci = (n) => {
            if (n <= 1) return 1;
            let a = 1, b = 1;
            for (let i = 2; i <= n; i++) {
                [a, b] = [b, a + b];
            }
            return b;
        };

        // Max 10 retries (Fibonacci 10 = 55 seconds base delay)
        if (retries > 10) {
            console.error('[Redis] Max reconnection attempts reached');
            return new Error('Max reconnection attempts exceeded');
        }

        // Calculate delay with jitter
        const baseDelay = fibonacci(retries) * 1000;
        const jitter = Math.floor(Math.random() * 500);
        const delay = Math.min(baseDelay + jitter, 55000); // Max 55s (Fibonacci)

        console.log(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})`);
        this.stats.reconnections++;

        return delay;
    }

    /**
     * Connect to Redis
     * @returns {Promise<void>}
     */
    async connect() {
        const { createClient } = require('redis');

        const options = this._getConnectionOptions();

        // Create main client
        this.client = createClient(options);

        // Error handling
        this.client.on('error', (err) => {
            console.error('[Redis] Client error:', err.message);
            this.stats.errors++;
            this.emit('error', err);
        });

        this.client.on('connect', () => {
            console.log('[Redis] Connecting...');
        });

        this.client.on('ready', () => {
            console.log('🔴 [Redis] Connected and ready');
            this.isConnected = true;
            this.emit('ready');
        });

        this.client.on('end', () => {
            console.log('[Redis] Connection closed');
            this.isConnected = false;
            this.emit('end');
        });

        this.client.on('reconnecting', () => {
            console.log('[Redis] Reconnecting...');
            this.emit('reconnecting');
        });

        // Connect main client
        await this.client.connect();

        // Create subscriber client (separate connection for pub/sub)
        this.subscriber = this.client.duplicate();
        this.subscriber.on('error', (err) => {
            console.error('[Redis] Subscriber error:', err.message);
        });
        await this.subscriber.connect();

        console.log('[Redis] Both clients connected successfully');
    }

    /**
     * Build prefixed key
     * @param {string} key - Key
     * @returns {string}
     */
    _key(key) {
        return this.config.keyPrefix + key;
    }

    /**
     * Get a value
     * @param {string} key - Key
     * @returns {Promise<any>}
     */
    async get(key) {
        this.stats.gets++;
        try {
            const value = await this.client.get(this._key(key));
            if (value === null) {
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            return deserialize(value);
        } catch (error) {
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Set a value
     * @param {string} key - Key
     * @param {any} value - Value
     * @param {Object} options - Options
     * @returns {Promise<boolean>}
     */
    async set(key, value, options = {}) {
        validateKey(key);
        this.stats.sets++;

        try {
            const serialized = serialize(value);
            const redisOptions = {};

            // TTL support
            if (options.ttl) {
                redisOptions.PX = options.ttl; // milliseconds
            } else if (options.ex) {
                redisOptions.EX = options.ex; // seconds
            }

            await this.client.set(this._key(key), serialized, redisOptions);
            return true;
        } catch (error) {
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Delete a key
     * @param {string} key - Key
     * @returns {Promise<boolean>}
     */
    async del(key) {
        this.stats.deletes++;
        try {
            const result = await this.client.del(this._key(key));
            return result > 0;
        } catch (error) {
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Check if key exists
     * @param {string} key - Key
     * @returns {Promise<boolean>}
     */
    async exists(key) {
        const result = await this.client.exists(this._key(key));
        return result > 0;
    }

    /**
     * Set expiration
     * @param {string} key - Key
     * @param {number} seconds - TTL in seconds
     * @returns {Promise<boolean>}
     */
    async expire(key, seconds) {
        const result = await this.client.expire(this._key(key), seconds);
        return result === 1;
    }

    /**
     * Get TTL remaining
     * @param {string} key - Key
     * @returns {Promise<number>}
     */
    async ttl(key) {
        return await this.client.ttl(this._key(key));
    }

    /**
     * Increment a value
     * @param {string} key - Key
     * @param {number} amount - Amount
     * @returns {Promise<number>}
     */
    async incr(key, amount = 1) {
        if (amount === 1) {
            return await this.client.incr(this._key(key));
        }
        return await this.client.incrBy(this._key(key), amount);
    }

    /**
     * Get multiple keys
     * @param {string[]} keys - Keys
     * @returns {Promise<Array>}
     */
    async mget(keys) {
        const prefixedKeys = keys.map(k => this._key(k));
        const values = await this.client.mGet(prefixedKeys);
        return values.map(v => v ? deserialize(v) : null);
    }

    /**
     * Set multiple keys
     * @param {Object} keyValues - Key-value pairs
     * @returns {Promise<boolean>}
     */
    async mset(keyValues) {
        const entries = [];
        for (const [key, value] of Object.entries(keyValues)) {
            entries.push(this._key(key), serialize(value));
        }
        await this.client.mSet(entries);
        return true;
    }

    /**
     * Get keys matching pattern
     * @param {string} pattern - Pattern
     * @returns {Promise<string[]>}
     */
    async keys(pattern) {
        const prefixedPattern = this._key(pattern);
        const keys = await this.client.keys(prefixedPattern);
        // Remove prefix from results
        const prefixLen = this.config.keyPrefix.length;
        return keys.map(k => k.substring(prefixLen));
    }

    /**
     * Hash operations
     */
    async hget(key, field) {
        const value = await this.client.hGet(this._key(key), field);
        return value ? deserialize(value) : null;
    }

    async hset(key, field, value) {
        await this.client.hSet(this._key(key), field, serialize(value));
        return true;
    }

    async hgetall(key) {
        const hash = await this.client.hGetAll(this._key(key));
        const result = {};
        for (const [field, value] of Object.entries(hash)) {
            result[field] = deserialize(value);
        }
        return result;
    }

    async hdel(key, field) {
        const result = await this.client.hDel(this._key(key), field);
        return result > 0;
    }

    async hincrby(key, field, amount) {
        return await this.client.hIncrBy(this._key(key), field, amount);
    }

    /**
     * List operations
     */
    async lpush(key, ...values) {
        const serialized = values.map(v => serialize(v));
        return await this.client.lPush(this._key(key), serialized);
    }

    async rpush(key, ...values) {
        const serialized = values.map(v => serialize(v));
        return await this.client.rPush(this._key(key), serialized);
    }

    async lpop(key) {
        const value = await this.client.lPop(this._key(key));
        return value ? deserialize(value) : null;
    }

    async rpop(key) {
        const value = await this.client.rPop(this._key(key));
        return value ? deserialize(value) : null;
    }

    async lrange(key, start, stop) {
        const values = await this.client.lRange(this._key(key), start, stop);
        return values.map(v => deserialize(v));
    }

    async llen(key) {
        return await this.client.lLen(this._key(key));
    }

    async ltrim(key, start, stop) {
        await this.client.lTrim(this._key(key), start, stop);
        return true;
    }

    /**
     * Set operations
     */
    async sadd(key, ...members) {
        return await this.client.sAdd(this._key(key), members);
    }

    async srem(key, ...members) {
        return await this.client.sRem(this._key(key), members);
    }

    async smembers(key) {
        return await this.client.sMembers(this._key(key));
    }

    async sismember(key, member) {
        const result = await this.client.sIsMember(this._key(key), member);
        return result === 1;
    }

    async scard(key) {
        return await this.client.sCard(this._key(key));
    }

    /**
     * Sorted set operations
     */
    async zadd(key, ...args) {
        // Convert from [score1, member1, score2, member2, ...] to [{score, value}]
        const entries = [];
        for (let i = 0; i < args.length; i += 2) {
            entries.push({ score: args[i], value: args[i + 1] });
        }
        return await this.client.zAdd(this._key(key), entries);
    }

    async zrange(key, start, stop, withScores = false) {
        if (withScores) {
            const result = await this.client.zRangeWithScores(this._key(key), start, stop);
            return result.flatMap(item => [item.value, item.score]);
        }
        return await this.client.zRange(this._key(key), start, stop);
    }

    async zrevrange(key, start, stop, withScores = false) {
        if (withScores) {
            const result = await this.client.zRangeWithScores(this._key(key), start, stop, { REV: true });
            return result.flatMap(item => [item.value, item.score]);
        }
        return await this.client.zRange(this._key(key), start, stop, { REV: true });
    }

    async zscore(key, member) {
        return await this.client.zScore(this._key(key), member);
    }

    async zrank(key, member) {
        return await this.client.zRank(this._key(key), member);
    }

    async zcard(key) {
        return await this.client.zCard(this._key(key));
    }

    /**
     * Pub/Sub - Subscribe
     */
    subscribe(channel, callback) {
        const prefixedChannel = this._key(channel);

        // Track subscription
        if (!this.subscriptions.has(prefixedChannel)) {
            this.subscriptions.set(prefixedChannel, new Set());

            // Subscribe on Redis
            this.subscriber.subscribe(prefixedChannel, (message, ch) => {
                const callbacks = this.subscriptions.get(ch);
                if (callbacks) {
                    for (const cb of callbacks) {
                        try {
                            cb(message, channel);
                        } catch (error) {
                            console.error('[Redis] Subscription callback error:', error.message);
                        }
                    }
                }
            });
        }

        this.subscriptions.get(prefixedChannel).add(callback);

        // Return unsubscribe function
        return () => this.unsubscribe(channel, callback);
    }

    unsubscribe(channel, callback) {
        const prefixedChannel = this._key(channel);
        const callbacks = this.subscriptions.get(prefixedChannel);

        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.subscriptions.delete(prefixedChannel);
                this.subscriber.unsubscribe(prefixedChannel);
            }
        }
    }

    async publish(channel, message) {
        const prefixedChannel = this._key(channel);
        const serialized = typeof message === 'string' ? message : JSON.stringify(message);
        return await this.client.publish(prefixedChannel, serialized);
    }

    /**
     * Pattern subscribe
     */
    psubscribe(pattern, callback) {
        const prefixedPattern = this._key(pattern);
        this.subscriber.pSubscribe(prefixedPattern, (message, channel) => {
            try {
                callback(message, channel.substring(this.config.keyPrefix.length));
            } catch (error) {
                console.error('[Redis] Pattern subscription callback error:', error.message);
            }
        });
    }

    /**
     * Flush all data (with prefix only)
     */
    async flushall() {
        // Only delete keys with our prefix for safety
        const keys = await this.client.keys(this._key('*'));
        if (keys.length > 0) {
            await this.client.del(keys);
        }
        return true;
    }

    /**
     * Get Redis info
     */
    async info() {
        const info = await this.client.info();
        return {
            backend: BACKENDS.REDIS,
            connected: this.isConnected,
            stats: this.stats,
            serverInfo: info.substring(0, 500) + '...' // Truncate for readability
        };
    }

    /**
     * Close connections
     */
    async close() {
        if (this.subscriber) {
            await this.subscriber.quit();
        }
        if (this.client) {
            await this.client.quit();
        }
        this.isConnected = false;
        console.log('[Redis] Connections closed');
    }

    /**
     * Health check
     */
    async ping() {
        const result = await this.client.ping();
        return result === 'PONG';
    }
}

// ============================================
// STORAGE MANAGER
// ============================================

let instance = null;
let isConnecting = false;
let connectionPromise = null;

/**
 * Get storage instance (singleton)
 * @returns {MemoryAdapter|RedisAdapter}
 */
function getStorage() {
    if (!instance) {
        const backend = process.env.STORAGE_BACKEND || BACKENDS.MEMORY;

        if (backend === BACKENDS.REDIS) {
            instance = new RedisAdapter({
                // URL takes precedence (for Render, Railway, etc.)
                url: process.env.REDIS_URL || null,
                // Individual config (fallback)
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD || null,
                db: parseInt(process.env.REDIS_DB) || 0,
                keyPrefix: process.env.REDIS_PREFIX || 'asdf:',
                // TLS for cloud Redis
                tls: process.env.REDIS_TLS === 'true' ? true : null,
                // Timeouts
                connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT) || 8000,
                commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 5000
            });

            console.log('[Storage] Initializing Redis backend...');
            console.log('[Storage] Redis URL:', process.env.REDIS_URL ? process.env.REDIS_URL.replace(/:([^@]+)@/, ':***@') : 'not set');

            // Auto-connect if not already connecting
            if (!isConnecting) {
                isConnecting = true;
                connectionPromise = instance.connect()
                    .then(() => {
                        console.log('✅ [Storage] Redis connected successfully!');
                        isConnecting = false;
                    })
                    .catch((error) => {
                        console.error('❌ [Storage] Redis connection failed:', error.message);
                        console.log('[Storage] Falling back to memory storage');
                        instance = new MemoryAdapter();
                        isConnecting = false;
                    });
            }
        } else {
            instance = new MemoryAdapter();
            console.log('[Storage] Using in-memory storage (STORAGE_BACKEND=' + (process.env.STORAGE_BACKEND || 'not set') + ')');
        }
    }

    return instance;
}

/**
 * Wait for storage to be ready (useful for Redis)
 * @returns {Promise<MemoryAdapter|RedisAdapter>}
 */
async function waitForStorage() {
    const storage = getStorage();

    if (connectionPromise) {
        await connectionPromise;
    }

    return storage;
}

/**
 * Check if storage is ready
 * @returns {boolean}
 */
function isStorageReady() {
    if (!instance) return false;
    if (instance instanceof RedisAdapter) {
        return instance.isConnected;
    }
    return true; // Memory is always ready
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate key format
 * @param {string} key - Key to validate
 */
function validateKey(key) {
    if (typeof key !== 'string') {
        throw new Error('Key must be a string');
    }
    if (key.length === 0) {
        throw new Error('Key cannot be empty');
    }
    if (key.length > STORAGE_CONFIG.maxKeySize) {
        throw new Error('Key exceeds maximum size');
    }
}

/**
 * Serialize value for storage
 * @param {any} value - Value to serialize
 * @returns {string}
 */
function serialize(value) {
    if (typeof value === 'string') {
        return 's:' + value;
    }
    return 'j:' + JSON.stringify(value);
}

/**
 * Deserialize value from storage
 * @param {string} data - Serialized data
 * @returns {any}
 */
function deserialize(data) {
    if (!data) return null;

    const prefix = data.substring(0, 2);
    const content = data.substring(2);

    if (prefix === 's:') {
        return content;
    }
    if (prefix === 'j:') {
        try {
            return JSON.parse(content);
        } catch (e) {
            return null;
        }
    }

    // Legacy data without prefix
    try {
        return JSON.parse(data);
    } catch (e) {
        return data;
    }
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Key builder with namespacing
 */
const keys = {
    notification: (wallet, id) => `notif:${wallet}:${id}`,
    notificationList: (wallet) => `notif:list:${wallet}`,
    notificationPrefs: (wallet) => `notif:prefs:${wallet}`,
    notificationUnread: (wallet) => `notif:unread:${wallet}`,
    session: (id) => `session:${id}`,
    user: (wallet) => `user:${wallet}`,
    leaderboard: (type) => `lb:${type}`,
    gameSession: (id) => `game:session:${id}`,
    replay: (id) => `replay:${id}`,
    progress: (wallet) => `progress:${wallet}`,
    achievement: (wallet) => `achievement:${wallet}`,
    pubsub: {
        notifications: (wallet) => `channel:notif:${wallet}`,
        global: 'channel:global',
        leaderboard: 'channel:leaderboard',
        burns: 'channel:burns'
    }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Main interface
    getStorage,
    waitForStorage,
    isStorageReady,

    // Adapters (for testing)
    MemoryAdapter,
    RedisAdapter,

    // Key helpers
    keys,

    // Constants
    STORAGE_CONFIG,
    BACKENDS
};
