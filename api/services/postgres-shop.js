'use strict';

// ============================================
// SHOP V2 SERVICE MODULE
// ============================================
// Extracted from postgres.js (lines 865-1423)
// All 15 shop functions with exact SQL and logic preservation

// Lazy require to avoid circular dependency (postgres.js requires this file)
let _pg = null;
function pg() {
  if (!_pg) _pg = require('./postgres');
  return _pg;
}
function isAvailable() {
  return pg().isAvailable();
}
function transaction(cb) {
  return pg().transaction(cb);
}
function query(text, params) {
  return pg().query(text, params);
}
function getWithCache(key, fn, ttl) {
  return pg().getWithCache(key, fn, ttl);
}
function writeWithInvalidation(key, fn) {
  return pg().writeWithInvalidation(key, fn);
}

const { getStorage } = require('./storage');

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
 * Get shop catalog with filters and pagination
 * @param {Object} filters - { layer, tier, rarity, collection_id, limit, offset }
 */
async function getShopCatalog(filters = {}) {
  // Extract pagination params (not part of cache key for filtered results)
  const limit = Math.min(filters.limit || 50, 100);
  const offset = filters.offset || 0;
  const filterKey = { ...filters };
  delete filterKey.limit;
  delete filterKey.offset;

  const cacheKey = `shop:catalog:${JSON.stringify(filterKey)}:${limit}:${offset}`;

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

      // Get total count for pagination metadata
      const countResult = await query(
        `SELECT COUNT(*) as total FROM shop_items ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || 0);

      // Get paginated items
      params.push(limit, offset);
      const result = await query(
        `
            SELECT * FROM shop_items
            ${whereClause}
            ORDER BY sort_order ASC, tier ASC, name ASC
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `,
        params
      );

      return {
        items: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + result.rows.length < total,
        },
      };
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
 * Get user's shop inventory (owned items) with pagination
 * @param {string} wallet - User wallet address
 * @param {Object} options - { limit, offset }
 */
async function getUserShopInventory(wallet, options = {}) {
  const limit = Math.min(options.limit || 50, 100);
  const offset = options.offset || 0;
  const cacheKey = `shop:inventory:${wallet}:${limit}:${offset}`;

  return getWithCache(
    cacheKey,
    async () => {
      // Get total count
      const countResult = await query('SELECT COUNT(*) as total FROM inventory WHERE wallet = $1', [
        wallet,
      ]);
      const total = parseInt(countResult.rows[0]?.total || 0);

      // Get paginated items
      const result = await query(
        `
            SELECT i.*, inv.acquired_at
            FROM inventory inv
            JOIN shop_items i ON i.id = inv.item_id
            WHERE inv.wallet = $1
            ORDER BY inv.acquired_at DESC
            LIMIT $2 OFFSET $3
        `,
        [wallet, limit, offset]
      );

      return {
        items: result.rows,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + result.rows.length < total,
        },
      };
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
 * Optimized: Single query with LEFT JOIN instead of N+1
 */
async function getCollections(wallet = null) {
  const cacheKey = wallet ? `shop:collections:${wallet}` : 'shop:collections:all';

  return getWithCache(
    cacheKey,
    async () => {
      if (wallet) {
        // Single query: collections + total items + owned count
        const result = await query(
          `
          SELECT
            c.*,
            COUNT(DISTINCT si.id) as total_items,
            COUNT(DISTINCT inv.item_id) as owned_count
          FROM collections c
          LEFT JOIN shop_items si ON si.collection_id = c.id AND si.is_active = true
          LEFT JOIN inventory inv ON inv.item_id = si.id AND inv.wallet = $1
          WHERE c.is_active = true
          GROUP BY c.id
          ORDER BY c.name ASC
          `,
          [wallet]
        );
        return result.rows;
      } else {
        // No wallet: just collections with total items
        const result = await query(`
          SELECT
            c.*,
            COUNT(si.id) as total_items
          FROM collections c
          LEFT JOIN shop_items si ON si.collection_id = c.id AND si.is_active = true
          WHERE c.is_active = true
          GROUP BY c.id
          ORDER BY c.name ASC
        `);
        return result.rows;
      }
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
// EXPORTS
// ============================================

module.exports = {
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
};
