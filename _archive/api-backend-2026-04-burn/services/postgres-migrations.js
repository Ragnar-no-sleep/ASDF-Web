'use strict';

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
  {
    version: 5,
    name: 'performance_indexes',
    up: `
            -- ============================================
            -- PERFORMANCE OPTIMIZATION: Additional Indexes
            -- Based on AUDIT-SYNTHESIS-K1 findings
            -- ============================================

            -- Sessions: Index for expired session cleanup
            CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)
                WHERE revoked = false;

            -- Inventory: Index for wallet lookups
            CREATE INDEX IF NOT EXISTS idx_inventory_wallet ON inventory(wallet);

            -- Users: Index for activity queries
            CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen DESC);

            -- Burns: Composite index for timeframe queries
            CREATE INDEX IF NOT EXISTS idx_burns_wallet_date ON burns(wallet, burned_at DESC);

            -- Game scores: Index for wallet+game type queries
            CREATE INDEX IF NOT EXISTS idx_scores_wallet_game ON game_scores(wallet, game_type);

            -- Purchases: Index for wallet history
            CREATE INDEX IF NOT EXISTS idx_purchases_wallet_date ON purchases(wallet, purchased_at DESC);

            -- Session expiration: Add default expiration (24h) for new sessions
            ALTER TABLE sessions
                ALTER COLUMN expires_at SET DEFAULT NOW() + INTERVAL '24 hours';
        `,
  },
];

/**
 * Run pending migrations
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 */
async function runMigrations(pool) {
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

module.exports = { MIGRATIONS, runMigrations };
