/**
 * ASDF API - PostgreSQL Database Service
 *
 * Production-ready PostgreSQL with:
 * - Connection pooling
 * - Cache-aside pattern (Redis)
 * - Automatic reconnection
 * - Query logging in dev
 *
 * Philosophy: Optimistic rollup - cache first, persist async
 *
 * @version 1.0.0
 */

'use strict';

const { getStorage } = require('./storage');

// ============================================
// CONFIGURATION
// ============================================

const DB_CONFIG = {
  // Connection pool - sized for production load
  pool: {
    min: 5, // Increased from 2 for faster response
    max: 20, // Increased from 10 for concurrent requests
    idleTimeoutMs: 30000,
    connectionTimeoutMs: 5000,
  },

  // Cache TTLs (Fibonacci-based, in seconds)
  cacheTTL: {
    leaderboard: 60, // 1 minute (frequently updated)
    userProfile: 300, // 5 minutes
    statistics: 180, // 3 minutes
    burns: 60, // 1 minute
    achievements: 600, // 10 minutes
    config: 3600, // 1 hour
  },

  // Query logging
  logQueries: process.env.NODE_ENV !== 'production',
};

// ============================================
// CONNECTION POOL
// ============================================

let pool = null;
let isConnected = false;

/**
 * Initialize database connection pool
 */
async function initialize() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('[PostgreSQL] DATABASE_URL not set - running in memory-only mode');
    return null;
  }

  try {
    const { Pool } = require('pg');

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      min: DB_CONFIG.pool.min,
      max: DB_CONFIG.pool.max,
      idleTimeoutMillis: DB_CONFIG.pool.idleTimeoutMs,
      connectionTimeoutMillis: DB_CONFIG.pool.connectionTimeoutMs,
      // Schema isolation: all ASDF tables in 'asdf' schema
      options: '-c search_path=asdf,public',
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    isConnected = true;
    console.log('✅ [PostgreSQL] Connected successfully');

    // Run migrations
    await runMigrations(pool);

    return pool;
  } catch (error) {
    console.error('❌ [PostgreSQL] Connection failed:', error.message);
    pool = null;
    isConnected = false;
    return null;
  }
}

/**
 * Get database pool
 */
function getPool() {
  return pool;
}

/**
 * Check if database is available
 */
function isAvailable() {
  return isConnected && pool !== null;
}

// ============================================
// MIGRATIONS (extracted to postgres-migrations.js)
// ============================================
const { runMigrations } = require('./postgres-migrations');

// ============================================
// CACHE-ASIDE PATTERN
// ============================================

/**
 * Get with cache-aside pattern
 * @param {string} cacheKey - Redis cache key
 * @param {Function} dbQuery - Function to query database
 * @param {number} ttl - Cache TTL in seconds
 */
async function getWithCache(cacheKey, dbQuery, ttl = 300) {
  const cache = getStorage();

  // 1. Try cache first
  try {
    const cached = await cache.get(cacheKey);
    if (cached !== null) {
      return { data: cached, source: 'cache' };
    }
  } catch (e) {
    // Cache miss or error, continue to DB
  }

  // 2. Query database
  if (!isAvailable()) {
    return { data: null, source: 'unavailable' };
  }

  try {
    const data = await dbQuery();

    // 3. Store in cache
    if (data !== null) {
      await cache.set(cacheKey, data, { ex: ttl }).catch(() => {});
    }

    return { data, source: 'database' };
  } catch (error) {
    console.error('[PostgreSQL] Query error:', error.message);
    return { data: null, source: 'error', error: error.message };
  }
}

/**
 * Write with cache invalidation
 * @param {string} cacheKey - Redis cache key to invalidate
 * @param {Function} dbWrite - Function to write to database
 */
async function writeWithInvalidation(cacheKey, dbWrite) {
  const cache = getStorage();

  if (!isAvailable()) {
    throw new Error('Database unavailable');
  }

  try {
    // 1. Write to database
    const result = await dbWrite();

    // 2. Invalidate cache
    if (cacheKey) {
      await cache.del(cacheKey).catch(() => {});
    }

    return result;
  } catch (error) {
    console.error('[PostgreSQL] Write error:', error.message);
    throw error;
  }
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Execute a query with logging
 */
async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  const start = Date.now();

  try {
    const result = await pool.query(text, params);

    if (DB_CONFIG.logQueries) {
      const duration = Date.now() - start;
      console.log(`[PostgreSQL] Query (${duration}ms):`, text.slice(0, 100));
    }

    return result;
  } catch (error) {
    console.error('[PostgreSQL] Query failed:', error.message);
    throw error;
  }
}

/**
 * Execute a transaction
 */
async function transaction(callback) {
  if (!pool) {
    throw new Error('Database not initialized');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get or create user
 */
async function getOrCreateUser(wallet) {
  const cacheKey = `user:${wallet}`;

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query(
        `
            INSERT INTO users (wallet, last_seen)
            VALUES ($1, NOW())
            ON CONFLICT (wallet) DO UPDATE SET last_seen = NOW()
            RETURNING *
        `,
        [wallet]
      );

      return result.rows[0];
    },
    DB_CONFIG.cacheTTL.userProfile
  );
}

/**
 * Update user XP
 */
async function updateUserXP(wallet, xpAmount, source) {
  const cacheKey = `user:${wallet}`;

  return writeWithInvalidation(cacheKey, async () => {
    return transaction(async client => {
      // Update user total
      await client.query(
        `
                UPDATE users SET
                    total_xp = total_xp + $2,
                    daily_xp = daily_xp + $2,
                    weekly_xp = weekly_xp + $2
                WHERE wallet = $1
            `,
        [wallet, xpAmount]
      );

      // Record history
      await client.query(
        `
                INSERT INTO xp_history (wallet, amount, source)
                VALUES ($1, $2, $3)
            `,
        [wallet, xpAmount, source]
      );

      // Get updated user
      const result = await client.query('SELECT * FROM users WHERE wallet = $1', [wallet]);
      return result.rows[0];
    });
  });
}

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

/**
 * Get leaderboard
 */
async function getLeaderboard(type = 'burns', limit = 100) {
  const cacheKey = `leaderboard:${type}:${limit}`;

  return getWithCache(
    cacheKey,
    async () => {
      let result;

      if (type === 'burns') {
        result = await query(
          `
                SELECT wallet, total_burned, burn_count, rank
                FROM leaderboard
                ORDER BY total_burned DESC
                LIMIT $1
            `,
          [limit]
        );
      } else if (type === 'xp') {
        result = await query(
          `
                SELECT wallet, total_xp, level, prestige,
                       ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
                FROM users
                ORDER BY total_xp DESC
                LIMIT $1
            `,
          [limit]
        );
      }

      return result?.rows || [];
    },
    DB_CONFIG.cacheTTL.leaderboard
  );
}

/**
 * Record burn and update leaderboard
 */
async function recordBurn(wallet, amount, signature) {
  // Invalidate leaderboard cache
  const cache = getStorage();
  await cache.del('leaderboard:burns:100').catch(() => {});

  return writeWithInvalidation(null, async () => {
    return transaction(async client => {
      // Insert burn record
      await client.query(
        `
                INSERT INTO burns (wallet, amount, signature)
                VALUES ($1, $2, $3)
                ON CONFLICT (signature) DO NOTHING
            `,
        [wallet, amount, signature]
      );

      // Update leaderboard
      await client.query(
        `
                INSERT INTO leaderboard (wallet, total_burned, burn_count, first_burn, last_burn)
                VALUES ($1, $2, 1, NOW(), NOW())
                ON CONFLICT (wallet) DO UPDATE SET
                    total_burned = leaderboard.total_burned + $2,
                    burn_count = leaderboard.burn_count + 1,
                    last_burn = NOW()
            `,
        [wallet, amount]
      );

      // Update ranks
      await client.query(`
                WITH ranked AS (
                    SELECT wallet, ROW_NUMBER() OVER (ORDER BY total_burned DESC) as new_rank
                    FROM leaderboard
                )
                UPDATE leaderboard l
                SET rank = r.new_rank
                FROM ranked r
                WHERE l.wallet = r.wallet
            `);

      return { success: true };
    });
  });
}

// ============================================
// GAME OPERATIONS
// ============================================

/**
 * Save game score
 */
async function saveGameScore(wallet, gameType, score, sessionId, metadata = {}) {
  return query(
    `
        INSERT INTO game_scores (wallet, game_type, score, session_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `,
    [wallet, gameType, score, sessionId, JSON.stringify(metadata)]
  );
}

/**
 * Get game leaderboard
 */
async function getGameLeaderboard(gameType, limit = 100) {
  const cacheKey = `game:leaderboard:${gameType}:${limit}`;

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query(
        `
            SELECT DISTINCT ON (wallet)
                wallet, score, played_at,
                ROW_NUMBER() OVER (ORDER BY score DESC) as rank
            FROM game_scores
            WHERE game_type = $1 AND verified = true
            ORDER BY wallet, score DESC
            LIMIT $2
        `,
        [gameType, limit]
      );

      return result.rows;
    },
    DB_CONFIG.cacheTTL.leaderboard
  );
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get global statistics
 */
async function getStatistics() {
  const cacheKey = 'stats:global';

  return getWithCache(
    cacheKey,
    async () => {
      const stats = await query(`
            SELECT
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM burns) as total_burns,
                (SELECT COALESCE(SUM(amount), 0) FROM burns) as total_burned,
                (SELECT COUNT(*) FROM game_scores) as total_games,
                (SELECT COUNT(*) FROM purchases) as total_purchases
        `);

      return stats.rows[0];
    },
    DB_CONFIG.cacheTTL.statistics
  );
}

// ============================================
// SHOP V2 OPERATIONS (extracted to postgres-shop.js)
// ============================================
// See postgres-shop.js for all 15 shop query functions

// ============================================
// HEALTH & CLEANUP
// ============================================

/**
 * Health check
 */
async function healthCheck() {
  if (!pool) {
    return { healthy: false, error: 'Not initialized' };
  }

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;

    return {
      healthy: true,
      latency,
      poolSize: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Close connections
 */
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    console.log('[PostgreSQL] Connections closed');
  }
}

// ============================================
// EXPORTS
// ============================================

// Import shop functions from extracted module
const shopQueries = require('./postgres-shop');

module.exports = {
  // Connection
  initialize,
  getPool,
  isAvailable,
  close,

  // Query helpers
  query,
  transaction,

  // Cache-aside
  getWithCache,
  writeWithInvalidation,

  // Users
  getOrCreateUser,
  updateUserXP,

  // Leaderboard
  getLeaderboard,
  recordBurn,

  // Games
  saveGameScore,
  getGameLeaderboard,

  // Stats
  getStatistics,
  healthCheck,

  // Shop V2 (from postgres-shop.js)
  ...shopQueries,

  // Config
  DB_CONFIG,
};
