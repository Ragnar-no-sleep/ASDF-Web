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
  // Connection pool
  pool: {
    min: 2,
    max: 10,
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
    await runMigrations();

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
// MIGRATIONS
// ============================================

const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                wallet VARCHAR(50) PRIMARY KEY,
                created_at TIMESTAMP DEFAULT NOW(),
                last_seen TIMESTAMP DEFAULT NOW(),
                total_xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                prestige INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 0,
                streak_last_date DATE,
                settings JSONB DEFAULT '{}',
                metadata JSONB DEFAULT '{}'
            );

            -- Burns history
            CREATE TABLE IF NOT EXISTS burns (
                id SERIAL PRIMARY KEY,
                wallet VARCHAR(50) NOT NULL,
                amount DECIMAL(20, 6) NOT NULL,
                signature VARCHAR(100) UNIQUE,
                burned_at TIMESTAMP DEFAULT NOW(),
                metadata JSONB DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_burns_wallet ON burns(wallet);
            CREATE INDEX IF NOT EXISTS idx_burns_date ON burns(burned_at);

            -- Leaderboard (materialized for performance)
            CREATE TABLE IF NOT EXISTS leaderboard (
                wallet VARCHAR(50) PRIMARY KEY,
                total_burned DECIMAL(20, 6) DEFAULT 0,
                burn_count INTEGER DEFAULT 0,
                first_burn TIMESTAMP,
                last_burn TIMESTAMP,
                rank INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank);
            CREATE INDEX IF NOT EXISTS idx_leaderboard_burned ON leaderboard(total_burned DESC);

            -- Game scores
            CREATE TABLE IF NOT EXISTS game_scores (
                id SERIAL PRIMARY KEY,
                wallet VARCHAR(50) NOT NULL,
                game_type VARCHAR(50) NOT NULL,
                score INTEGER NOT NULL,
                verified BOOLEAN DEFAULT false,
                session_id VARCHAR(100),
                played_at TIMESTAMP DEFAULT NOW(),
                metadata JSONB DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_scores_wallet ON game_scores(wallet);
            CREATE INDEX IF NOT EXISTS idx_scores_game ON game_scores(game_type, score DESC);

            -- Achievements
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                wallet VARCHAR(50) NOT NULL,
                achievement_id VARCHAR(50) NOT NULL,
                unlocked_at TIMESTAMP DEFAULT NOW(),
                progress JSONB DEFAULT '{}',
                UNIQUE(wallet, achievement_id)
            );
            CREATE INDEX IF NOT EXISTS idx_achievements_wallet ON achievements(wallet);

            -- Shop purchases
            CREATE TABLE IF NOT EXISTS purchases (
                id SERIAL PRIMARY KEY,
                wallet VARCHAR(50) NOT NULL,
                item_id VARCHAR(50) NOT NULL,
                price_asdf DECIMAL(20, 6),
                burn_signature VARCHAR(100),
                purchased_at TIMESTAMP DEFAULT NOW(),
                metadata JSONB DEFAULT '{}'
            );
            CREATE INDEX IF NOT EXISTS idx_purchases_wallet ON purchases(wallet);

            -- Inventory
            CREATE TABLE IF NOT EXISTS inventory (
                wallet VARCHAR(50) NOT NULL,
                item_id VARCHAR(50) NOT NULL,
                quantity INTEGER DEFAULT 1,
                equipped BOOLEAN DEFAULT false,
                acquired_at TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY(wallet, item_id)
            );

            -- Notifications
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                wallet VARCHAR(50) NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255),
                body TEXT,
                data JSONB DEFAULT '{}',
                read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(wallet, read);

            -- Sessions
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(100) PRIMARY KEY,
                wallet VARCHAR(50) NOT NULL,
                device_info JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                revoked BOOLEAN DEFAULT false
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON sessions(wallet);

            -- Audit log
            CREATE TABLE IF NOT EXISTS audit_log (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(50) NOT NULL,
                wallet VARCHAR(50),
                data JSONB DEFAULT '{}',
                ip_address VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);

            -- Migrations tracking
            CREATE TABLE IF NOT EXISTS migrations (
                version INTEGER PRIMARY KEY,
                name VARCHAR(100),
                applied_at TIMESTAMP DEFAULT NOW()
            );
        `,
  },
  {
    version: 2,
    name: 'add_referrals',
    up: `
            CREATE TABLE IF NOT EXISTS referrals (
                id SERIAL PRIMARY KEY,
                referrer_wallet VARCHAR(50) NOT NULL,
                referred_wallet VARCHAR(50) UNIQUE NOT NULL,
                code VARCHAR(20) NOT NULL,
                reward_claimed BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
            CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
        `,
  },
  {
    version: 3,
    name: 'add_progression',
    up: `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_xp INTEGER DEFAULT 0;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0;

            CREATE TABLE IF NOT EXISTS xp_history (
                id SERIAL PRIMARY KEY,
                wallet VARCHAR(50) NOT NULL,
                amount INTEGER NOT NULL,
                source VARCHAR(50) NOT NULL,
                multiplier DECIMAL(4, 2) DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_xp_wallet ON xp_history(wallet);
            CREATE INDEX IF NOT EXISTS idx_xp_date ON xp_history(created_at);
        `,
  },
  {
    version: 4,
    name: 'shop_v2_cosmetics',
    up: `
            -- ============================================
            -- SHOP V2: Cosmetic Shop System
            -- ============================================

            -- Collections: Sets of items with unlock bonuses
            CREATE TABLE IF NOT EXISTS collections (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                icon VARCHAR(20),
                unlock_bonus JSONB DEFAULT NULL,
                required_pieces SMALLINT DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- Shop Items: Dynamic, admin-managed cosmetic items
            CREATE TABLE IF NOT EXISTS shop_items (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                layer VARCHAR(20) NOT NULL CHECK (layer IN ('background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held')),
                tier SMALLINT NOT NULL CHECK (tier BETWEEN 0 AND 9),
                rarity VARCHAR(20) DEFAULT 'common',
                asset_url VARCHAR(255),
                thumbnail_url VARCHAR(255),

                -- Availability constraints (hybrid rarity)
                is_limited BOOLEAN DEFAULT FALSE,
                quantity_limit INTEGER DEFAULT NULL,
                quantity_sold INTEGER DEFAULT 0,
                available_from TIMESTAMPTZ DEFAULT NULL,
                available_until TIMESTAMPTZ DEFAULT NULL,
                required_tier SMALLINT DEFAULT 0,

                -- Pricing
                base_fib_index SMALLINT NOT NULL,
                price_override INTEGER DEFAULT NULL,
                currency_modes JSONB DEFAULT '["burn"]',
                ingame_price INTEGER DEFAULT NULL,

                -- Collections
                collection_id VARCHAR(50) REFERENCES collections(id) ON DELETE SET NULL,
                set_position SMALLINT DEFAULT NULL,

                -- Visual effects
                particle_config JSONB DEFAULT NULL,

                -- Metadata
                is_active BOOLEAN DEFAULT TRUE,
                is_default BOOLEAN DEFAULT FALSE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_shop_items_layer ON shop_items(layer);
            CREATE INDEX IF NOT EXISTS idx_shop_items_tier ON shop_items(tier);
            CREATE INDEX IF NOT EXISTS idx_shop_items_collection ON shop_items(collection_id);
            CREATE INDEX IF NOT EXISTS idx_shop_items_active ON shop_items(is_active, available_from, available_until);

            -- User Favorites: Favorited items per wallet
            CREATE TABLE IF NOT EXISTS user_favorites (
                wallet VARCHAR(44) NOT NULL,
                item_id VARCHAR(50) NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (wallet, item_id)
            );
            CREATE INDEX IF NOT EXISTS idx_favorites_wallet ON user_favorites(wallet);

            -- User Equipped: Currently equipped cosmetics per layer
            CREATE TABLE IF NOT EXISTS user_equipped (
                wallet VARCHAR(44) PRIMARY KEY,
                background VARCHAR(50) REFERENCES shop_items(id) ON DELETE SET NULL,
                aura VARCHAR(50) REFERENCES shop_items(id) ON DELETE SET NULL,
                skin VARCHAR(50) REFERENCES shop_items(id) ON DELETE SET NULL DEFAULT 'skin_default',
                outfit VARCHAR(50) REFERENCES shop_items(id) ON DELETE SET NULL,
                eyes VARCHAR(50) REFERENCES shop_items(id) ON DELETE SET NULL,
                head VARCHAR(50) REFERENCES shop_items(id) ON DELETE SET NULL,
                held VARCHAR(50) REFERENCES shop_items(id) ON DELETE SET NULL,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );

            -- User Currency: In-game currency balance
            CREATE TABLE IF NOT EXISTS user_currency (
                wallet VARCHAR(44) PRIMARY KEY,
                balance BIGINT DEFAULT 0,
                total_earned BIGINT DEFAULT 0,
                total_spent BIGINT DEFAULT 0,
                last_updated TIMESTAMPTZ DEFAULT NOW()
            );

            -- Currency Transactions: Audit trail for in-game currency
            CREATE TABLE IF NOT EXISTS currency_transactions (
                id SERIAL PRIMARY KEY,
                wallet VARCHAR(44) NOT NULL,
                amount INTEGER NOT NULL,
                balance_after BIGINT NOT NULL,
                source VARCHAR(50) NOT NULL,
                source_id VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_currency_tx_wallet ON currency_transactions(wallet);
            CREATE INDEX IF NOT EXISTS idx_currency_tx_date ON currency_transactions(created_at);

            -- Shop Events: Rotations, flash sales, limited drops
            CREATE TABLE IF NOT EXISTS shop_events (
                id VARCHAR(50) PRIMARY KEY,
                event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('rotation', 'flash_sale', 'limited_drop', 'seasonal')),
                name VARCHAR(100) NOT NULL,
                description TEXT,
                item_ids JSONB NOT NULL DEFAULT '[]',
                discount_percent SMALLINT DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
                starts_at TIMESTAMPTZ NOT NULL,
                ends_at TIMESTAMPTZ NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_events_active ON shop_events(is_active, starts_at, ends_at);

            -- Shop Admin Log: Audit trail for admin actions
            CREATE TABLE IF NOT EXISTS shop_admin_log (
                id SERIAL PRIMARY KEY,
                admin_wallet VARCHAR(44) NOT NULL,
                action VARCHAR(50) NOT NULL,
                target_type VARCHAR(30) NOT NULL,
                target_id VARCHAR(100),
                old_value JSONB,
                new_value JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_admin_log_date ON shop_admin_log(created_at);

            -- Update purchases table for v2 compatibility
            ALTER TABLE purchases ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'burn';
            ALTER TABLE purchases ADD COLUMN IF NOT EXISTS engage_tier SMALLINT DEFAULT 0;
            ALTER TABLE purchases ADD COLUMN IF NOT EXISTS discount_applied INTEGER DEFAULT 0;
            ALTER TABLE purchases ADD COLUMN IF NOT EXISTS xp_granted INTEGER DEFAULT 0;
        `,
  },
];

/**
 * Run pending migrations
 */
async function runMigrations() {
  if (!pool) return;

  const client = await pool.connect();

  try {
    // Get current version
    let currentVersion = 0;
    try {
      const result = await client.query('SELECT MAX(version) as version FROM migrations');
      currentVersion = result.rows[0]?.version || 0;
    } catch (e) {
      // Table doesn't exist yet, will be created
    }

    // Run pending migrations
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        console.log(`[PostgreSQL] Running migration ${migration.version}: ${migration.name}`);

        await client.query('BEGIN');
        try {
          await client.query(migration.up);
          await client.query(
            'INSERT INTO migrations (version, name) VALUES ($1, $2) ON CONFLICT (version) DO NOTHING',
            [migration.version, migration.name]
          );
          await client.query('COMMIT');
          console.log(`[PostgreSQL] Migration ${migration.version} complete`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    }
  } finally {
    client.release();
  }
}

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
// SHOP V2 OPERATIONS
// ============================================

/**
 * Seed initial shop items from catalog
 * @param {Array} items - Array of item objects
 */
async function seedShopItems(items) {
  if (!isAvailable()) {
    throw new Error('Database unavailable');
  }

  return transaction(async client => {
    for (const item of items) {
      await client.query(
        `
                INSERT INTO shop_items (
                    id, name, description, layer, tier, rarity,
                    asset_url, base_fib_index, is_default, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    layer = EXCLUDED.layer,
                    tier = EXCLUDED.tier,
                    updated_at = NOW()
            `,
        [
          item.id,
          item.name,
          item.description || null,
          item.layer,
          item.tier,
          item.rarity || 'common',
          item.asset || null,
          item.tier, // base_fib_index = tier for initial items
          item.default || false,
        ]
      );
    }
    return { seeded: items.length };
  });
}

/**
 * Get shop catalog with filters
 * @param {Object} filters - { layer, tier, rarity, collection, is_active }
 */
async function getShopCatalog(filters = {}) {
  const cacheKey = `shop:catalog:${JSON.stringify(filters)}`;

  return getWithCache(
    cacheKey,
    async () => {
      let whereClause = 'WHERE is_active = true';
      const params = [];
      let paramIndex = 1;

      if (filters.layer) {
        whereClause += ` AND layer = $${paramIndex++}`;
        params.push(filters.layer);
      }
      if (filters.tier !== undefined) {
        whereClause += ` AND tier = $${paramIndex++}`;
        params.push(filters.tier);
      }
      if (filters.rarity) {
        whereClause += ` AND rarity = $${paramIndex++}`;
        params.push(filters.rarity);
      }
      if (filters.collection_id) {
        whereClause += ` AND collection_id = $${paramIndex++}`;
        params.push(filters.collection_id);
      }

      // Check time availability
      whereClause += ` AND (available_from IS NULL OR available_from <= NOW())`;
      whereClause += ` AND (available_until IS NULL OR available_until > NOW())`;

      const result = await query(
        `
            SELECT * FROM shop_items
            ${whereClause}
            ORDER BY sort_order ASC, tier ASC, name ASC
        `,
        params
      );

      return result.rows;
    },
    60
  ); // 1 minute cache
}

/**
 * Get single shop item by ID
 */
async function getShopItem(itemId) {
  const cacheKey = `shop:item:${itemId}`;

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query('SELECT * FROM shop_items WHERE id = $1', [itemId]);
      return result.rows[0] || null;
    },
    300
  );
}

/**
 * Get user's shop inventory (owned items)
 */
async function getUserShopInventory(wallet) {
  const cacheKey = `shop:inventory:${wallet}`;

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query(
        `
            SELECT i.*, inv.acquired_at
            FROM inventory inv
            JOIN shop_items i ON i.id = inv.item_id
            WHERE inv.wallet = $1
            ORDER BY inv.acquired_at DESC
        `,
        [wallet]
      );

      return result.rows;
    },
    60
  );
}

/**
 * Get user's equipped items
 */
async function getUserEquipped(wallet) {
  const cacheKey = `shop:equipped:${wallet}`;

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query(
        `
            SELECT * FROM user_equipped WHERE wallet = $1
        `,
        [wallet]
      );

      if (result.rows[0]) {
        return result.rows[0];
      }

      // Return default equipped
      return {
        wallet,
        background: null,
        aura: null,
        skin: 'skin_default',
        outfit: null,
        eyes: null,
        head: null,
        held: null,
      };
    },
    60
  );
}

/**
 * Set equipped item for a layer
 * Uses column mapping to prevent SQL injection - never interpolate user input
 */
async function setEquippedItem(wallet, layer, itemId) {
  const cacheKey = `shop:equipped:${wallet}`;

  // Column mapping - only these exact column names are allowed
  // This prevents SQL injection by using a strict whitelist
  const LAYER_COLUMNS = Object.freeze({
    background: 'background',
    aura: 'aura',
    skin: 'skin',
    outfit: 'outfit',
    eyes: 'eyes',
    head: 'head',
    held: 'held',
  });

  const columnName = LAYER_COLUMNS[layer];
  if (!columnName) {
    throw new Error('Invalid layer');
  }

  return writeWithInvalidation(cacheKey, async () => {
    // Use the validated column name from our frozen whitelist
    await query(
      `
            INSERT INTO user_equipped (wallet, ${columnName}, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (wallet) DO UPDATE SET
                ${columnName} = $2,
                updated_at = NOW()
        `,
      [wallet, itemId]
    );

    return { success: true, layer, itemId };
  });
}

/**
 * Get user's favorites
 */
async function getUserFavorites(wallet) {
  const cacheKey = `shop:favorites:${wallet}`;

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query(
        `
            SELECT i.*, f.created_at as favorited_at
            FROM user_favorites f
            JOIN shop_items i ON i.id = f.item_id
            WHERE f.wallet = $1
            ORDER BY f.created_at DESC
        `,
        [wallet]
      );

      return result.rows;
    },
    60
  );
}

/**
 * Add item to favorites
 */
async function addFavorite(wallet, itemId) {
  const cacheKey = `shop:favorites:${wallet}`;

  return writeWithInvalidation(cacheKey, async () => {
    await query(
      `
            INSERT INTO user_favorites (wallet, item_id)
            VALUES ($1, $2)
            ON CONFLICT (wallet, item_id) DO NOTHING
        `,
      [wallet, itemId]
    );

    return { success: true };
  });
}

/**
 * Remove item from favorites
 */
async function removeFavorite(wallet, itemId) {
  const cacheKey = `shop:favorites:${wallet}`;

  return writeWithInvalidation(cacheKey, async () => {
    await query(
      `
            DELETE FROM user_favorites
            WHERE wallet = $1 AND item_id = $2
        `,
      [wallet, itemId]
    );

    return { success: true };
  });
}

/**
 * Get collections with user progress
 */
async function getCollections(wallet = null) {
  const cacheKey = wallet ? `shop:collections:${wallet}` : 'shop:collections:all';

  return getWithCache(
    cacheKey,
    async () => {
      const collections = await query(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM shop_items WHERE collection_id = c.id) as total_items
            FROM collections c
            WHERE c.is_active = true
            ORDER BY c.name ASC
        `);

      if (wallet) {
        // Add owned count per collection
        for (const col of collections.rows) {
          const owned = await query(
            `
                    SELECT COUNT(*) as count
                    FROM inventory inv
                    JOIN shop_items i ON i.id = inv.item_id
                    WHERE inv.wallet = $1 AND i.collection_id = $2
                `,
            [wallet, col.id]
          );
          col.owned_count = parseInt(owned.rows[0]?.count || 0);
        }
      }

      return collections.rows;
    },
    120
  );
}

/**
 * Get active shop events
 */
async function getActiveEvents() {
  const cacheKey = 'shop:events:active';

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query(`
            SELECT * FROM shop_events
            WHERE is_active = true
              AND starts_at <= NOW()
              AND ends_at > NOW()
            ORDER BY ends_at ASC
        `);

      return result.rows;
    },
    60
  );
}

/**
 * Get user currency balance
 */
async function getUserCurrency(wallet) {
  const cacheKey = `shop:currency:${wallet}`;

  return getWithCache(
    cacheKey,
    async () => {
      const result = await query(
        `
            SELECT * FROM user_currency WHERE wallet = $1
        `,
        [wallet]
      );

      if (result.rows[0]) {
        return result.rows[0];
      }

      // Create new entry
      await query(
        `
            INSERT INTO user_currency (wallet) VALUES ($1)
            ON CONFLICT (wallet) DO NOTHING
        `,
        [wallet]
      );

      return { wallet, balance: 0, total_earned: 0, total_spent: 0 };
    },
    30
  );
}

/**
 * Add in-game currency to user
 */
async function addUserCurrency(wallet, amount, source, sourceId = null) {
  const cacheKey = `shop:currency:${wallet}`;

  return writeWithInvalidation(cacheKey, async () => {
    return transaction(async client => {
      // Update balance
      const result = await client.query(
        `
                INSERT INTO user_currency (wallet, balance, total_earned)
                VALUES ($1, $2, $2)
                ON CONFLICT (wallet) DO UPDATE SET
                    balance = user_currency.balance + $2,
                    total_earned = user_currency.total_earned + $2,
                    last_updated = NOW()
                RETURNING *
            `,
        [wallet, amount]
      );

      // Record transaction
      await client.query(
        `
                INSERT INTO currency_transactions (wallet, amount, balance_after, source, source_id)
                VALUES ($1, $2, $3, $4, $5)
            `,
        [wallet, amount, result.rows[0].balance, source, sourceId]
      );

      return result.rows[0];
    });
  });
}

/**
 * Spend in-game currency
 */
async function spendUserCurrency(wallet, amount, source, sourceId = null) {
  const cacheKey = `shop:currency:${wallet}`;

  return writeWithInvalidation(cacheKey, async () => {
    return transaction(async client => {
      // Check balance
      const check = await client.query('SELECT balance FROM user_currency WHERE wallet = $1', [
        wallet,
      ]);
      const currentBalance = check.rows[0]?.balance || 0;

      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Update balance
      const result = await client.query(
        `
                UPDATE user_currency SET
                    balance = balance - $2,
                    total_spent = total_spent + $2,
                    last_updated = NOW()
                WHERE wallet = $1
                RETURNING *
            `,
        [wallet, amount]
      );

      // Record transaction
      await client.query(
        `
                INSERT INTO currency_transactions (wallet, amount, balance_after, source, source_id)
                VALUES ($1, $2, $3, $4, $5)
            `,
        [wallet, -amount, result.rows[0].balance, source, sourceId]
      );

      return result.rows[0];
    });
  });
}

/**
 * Record shop purchase
 */
async function recordShopPurchase(
  wallet,
  itemId,
  price,
  currency,
  signature = null,
  engageTier = 0,
  discount = 0
) {
  const inventoryCacheKey = `shop:inventory:${wallet}`;
  const cache = getStorage();
  await cache.del(inventoryCacheKey).catch(() => {});

  return transaction(async client => {
    // Add to purchases
    await client.query(
      `
            INSERT INTO purchases (wallet, item_id, price_asdf, burn_signature, currency, engage_tier, discount_applied, xp_granted)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $3)
        `,
      [wallet, itemId, price, signature, currency, engageTier, discount]
    );

    // Add to inventory
    await client.query(
      `
            INSERT INTO inventory (wallet, item_id, quantity)
            VALUES ($1, $2, 1)
            ON CONFLICT (wallet, item_id) DO UPDATE SET
                quantity = inventory.quantity + 1
        `,
      [wallet, itemId]
    );

    // Increment quantity_sold if limited
    await client.query(
      `
            UPDATE shop_items SET quantity_sold = quantity_sold + 1
            WHERE id = $1 AND is_limited = true
        `,
      [itemId]
    );

    return { success: true, xpGranted: price };
  });
}

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

  // Shop V2
  seedShopItems,
  getShopCatalog,
  getShopItem,
  getUserShopInventory,
  getUserEquipped,
  setEquippedItem,
  getUserFavorites,
  addFavorite,
  removeFavorite,
  getCollections,
  getActiveEvents,
  getUserCurrency,
  addUserCurrency,
  spendUserCurrency,
  recordShopPurchase,

  // Config
  DB_CONFIG,
};
