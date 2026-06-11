/**
 * Shop Routes Module
 *
 * Handles all shop-related endpoints:
 * - Shop V1: Basic catalog, inventory, purchase, equip
 * - Shop V2: Enhanced catalog with filters, collections, favorites, dual currency
 * - CSRF token generation
 */

'use strict';

const crypto = require('crypto');
const express = require('express');
const router = express.Router();

// Helpers
const { sanitizeError } = require('./helpers');

// CSRF Protection
const { csrfProtection, generateToken, storeToken } = require('../../middleware/csrf.cjs');

// Services
const {
  getCatalogWithPrices,
  initiatePurchase,
  confirmPurchase,
  getInventory,
  getEquipped,
  equipItem,
  unequipLayer,
  getShopMetrics,
} = require('../services/shop');

const shopV2 = require('../services/shopV2');
const { getTokenSupply } = require('../services/helius');
const { authMiddleware, optionalAuthMiddleware } = require('../services/auth');
const db = require('../services/postgres');

// Initialize shop (seed items on startup)
shopV2.initializeShop().catch(err => console.error('[ShopV2] Init error:', err.message));

// ============================================
// SHOP V1 ROUTES
// ============================================

/**
 * Get shop catalog with prices
 * GET /shop/catalog
 */
router.get('/shop/catalog', optionalAuthMiddleware, async (req, res) => {
  try {
    const engageTier = req.user?.tierIndex || 0;
    const catalog = await getCatalogWithPrices(engageTier);

    // If authenticated, mark owned items
    if (req.user) {
      const inventory = await getInventory(req.user.wallet);
      catalog.forEach(item => {
        item.owned = inventory.includes(item.id);
      });
    }

    res.json({ items: catalog });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'catalog') });
  }
});

/**
 * Get user's inventory
 * GET /shop/inventory
 */
router.get('/shop/inventory', authMiddleware, async (req, res) => {
  try {
    const inventory = await getInventory(req.user.wallet);
    const equipped = await getEquipped(req.user.wallet);

    res.json({ inventory, equipped });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'inventory') });
  }
});

/**
 * Initiate purchase (returns transaction to sign)
 * POST /shop/purchase
 * Requires CSRF token via x-csrf-token header
 * Supports idempotency key header for safe retries
 */
router.post('/shop/purchase', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { itemId } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] || null;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    // Validate itemId format (alphanumeric with underscores)
    if (!/^[a-z0-9_]{1,50}$/.test(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const inventory = await getInventory(req.user.wallet);

    const result = await initiatePurchase(
      req.user.wallet,
      itemId,
      req.user.tierIndex,
      inventory,
      idempotencyKey
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'purchase-init') });
  }
});

/**
 * Confirm purchase after signing
 * POST /shop/purchase/confirm
 * Requires CSRF token via x-csrf-token header
 */
router.post('/shop/purchase/confirm', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { purchaseId, signature } = req.body;

    if (!purchaseId || !signature) {
      return res.status(400).json({ error: 'Purchase ID and signature required' });
    }

    const result = await confirmPurchase(purchaseId, signature);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'purchase-confirm') });
  }
});

/**
 * Equip an item
 * POST /shop/equip
 */
router.post('/shop/equip', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;
    const inventory = await getInventory(req.user.wallet);

    const result = await equipItem(req.user.wallet, itemId, inventory);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'equip') });
  }
});

/**
 * Unequip a layer
 * POST /shop/unequip
 */
router.post('/shop/unequip', authMiddleware, async (req, res) => {
  try {
    const { layer } = req.body;

    const result = await unequipLayer(req.user.wallet, layer);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'unequip') });
  }
});

// ============================================
// CSRF TOKEN ENDPOINT
// ============================================

/**
 * Get CSRF token for state-changing requests
 * GET /v2/csrf-token
 * Returns a token that must be sent in x-csrf-token header on subsequent POST/PUT/DELETE requests
 */
router.get('/v2/csrf-token', (req, res) => {
  try {
    const token = generateToken();
    storeToken(token);

    res.json({
      token,
      expires: 3600, // 1 hour in seconds
      header: 'x-csrf-token',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
});

// ============================================
// SHOP V2 ROUTES (Enhanced Cosmetic Shop)
// ============================================

/**
 * Get shop v2 catalog with filters
 * GET /v2/shop/catalog
 * Query: ?layer=background&tier=3&rarity=rare&collection=dogs
 */
router.get('/v2/shop/catalog', optionalAuthMiddleware, async (req, res) => {
  try {
    const { layer, tier, rarity, collection_id, limit, offset } = req.query;
    const engageTier = req.user?.tierIndex || 0;
    const wallet = req.user?.wallet || null;

    // Get current supply for dynamic pricing
    const supply = await getTokenSupply();
    const currentSupply = supply?.current || 1_000_000_000;

    const filters = {};
    if (layer) {
      filters.layer = layer;
    }
    if (tier !== undefined) {
      filters.tier = parseInt(tier);
    }
    if (rarity) {
      filters.rarity = rarity;
    }
    if (collection_id) {
      filters.collection_id = collection_id;
    }
    // Pagination
    if (limit) {
      filters.limit = parseInt(limit);
    }
    if (offset) {
      filters.offset = parseInt(offset);
    }

    const { items, pagination } = await shopV2.getCatalog(
      filters,
      wallet,
      currentSupply,
      engageTier
    );

    res.json({
      items,
      pagination,
      supply: currentSupply,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'shop-v2-catalog') });
  }
});

/**
 * Get single item details
 * GET /v2/shop/item/:itemId
 */
router.get('/v2/shop/item/:itemId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    const engageTier = req.user?.tierIndex || 0;
    const wallet = req.user?.wallet || null;

    const supply = await getTokenSupply();
    const currentSupply = supply?.current || 1_000_000_000;

    const item = await shopV2.getItem(itemId, wallet, currentSupply, engageTier);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'shop-v2-item') });
  }
});

/**
 * Get user's inventory
 * GET /v2/shop/inventory
 */
router.get('/v2/shop/inventory', authMiddleware, async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);

    const { items, pagination } = await shopV2.getInventory(req.user.wallet, options);
    const equipped = await shopV2.getEquipped(req.user.wallet);

    res.json({ inventory: items, pagination, equipped });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'shop-v2-inventory') });
  }
});

/**
 * Get user's favorites
 * GET /v2/shop/favorites
 */
router.get('/v2/shop/favorites', authMiddleware, async (req, res) => {
  try {
    const favorites = await shopV2.getFavorites(req.user.wallet);
    res.json({ favorites });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'shop-v2-favorites') });
  }
});

/**
 * Toggle favorite
 * POST /v2/shop/favorites/:itemId
 */
router.post('/v2/shop/favorites/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!/^[a-z0-9_]{1,50}$/.test(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    const result = await shopV2.toggleFavorite(req.user.wallet, itemId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'shop-v2-favorite') });
  }
});

/**
 * Remove favorite
 * DELETE /v2/shop/favorites/:itemId
 */
router.delete('/v2/shop/favorites/:itemId', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.params;
    await db.removeFavorite(req.user.wallet, itemId);
    res.json({ success: true, favorited: false });
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'shop-v2-unfavorite') });
  }
});

/**
 * Get collections with progress
 * GET /v2/shop/collections
 */
router.get('/v2/shop/collections', optionalAuthMiddleware, async (req, res) => {
  try {
    const wallet = req.user?.wallet || null;
    const collections = await shopV2.getCollections(wallet);
    res.json({ collections });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'shop-v2-collections') });
  }
});

/**
 * Get active shop events
 * GET /v2/shop/events
 */
router.get('/v2/shop/events', async (req, res) => {
  try {
    const events = await shopV2.getActiveEvents();
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'shop-v2-events') });
  }
});

/**
 * Initiate v2 purchase (supports dual currency)
 * POST /v2/shop/purchase/initiate
 * Requires CSRF token via x-csrf-token header
 * Body: { itemId, currency: 'burn' | 'ingame' }
 */
router.post('/v2/shop/purchase/initiate', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { itemId, currency = 'burn' } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    if (!/^[a-z0-9_]{1,50}$/.test(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID format' });
    }

    if (!['burn', 'ingame'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency type' });
    }

    const supply = await getTokenSupply();
    const currentSupply = supply?.current || 1_000_000_000;

    const result = await shopV2.initiatePurchase(
      req.user.wallet,
      itemId,
      currency,
      currentSupply,
      req.user.tierIndex || 0
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'shop-v2-purchase-init') });
  }
});

/**
 * Confirm v2 purchase
 * POST /v2/shop/purchase/confirm
 * Requires CSRF token via x-csrf-token header
 * Body: { purchaseId, signature? }
 */
router.post('/v2/shop/purchase/confirm', authMiddleware, csrfProtection, async (req, res) => {
  try {
    const { purchaseId, signature } = req.body;

    if (!purchaseId) {
      return res.status(400).json({ error: 'Purchase ID required' });
    }

    const result = await shopV2.confirmPurchase(purchaseId, signature);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'shop-v2-purchase-confirm') });
  }
});

/**
 * Equip v2 item
 * POST /v2/shop/equip
 */
router.post('/v2/shop/equip', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }

    const result = await shopV2.equipItem(req.user.wallet, itemId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'shop-v2-equip') });
  }
});

/**
 * Unequip v2 layer
 * POST /v2/shop/unequip
 */
router.post('/v2/shop/unequip', authMiddleware, async (req, res) => {
  try {
    const { layer } = req.body;

    if (!layer) {
      return res.status(400).json({ error: 'Layer required' });
    }

    const result = await shopV2.unequipLayer(req.user.wallet, layer);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'shop-v2-unequip') });
  }
});

/**
 * Get in-game currency balance
 * GET /v2/currency/balance
 */
router.get('/v2/currency/balance', authMiddleware, async (req, res) => {
  try {
    const currency = await shopV2.getCurrencyBalance(req.user.wallet);
    res.json(currency);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'currency-balance') });
  }
});

/**
 * Earn in-game currency (internal use, should be secured)
 * POST /v2/currency/earn
 */
router.post('/v2/currency/earn', authMiddleware, async (req, res) => {
  try {
    const { amount, source, sourceId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    if (!source) {
      return res.status(400).json({ error: 'Source required' });
    }

    // Limit earning to prevent abuse (max 1000 per call)
    const safeAmount = Math.min(amount, 1000);

    const result = await shopV2.earnCurrency(req.user.wallet, safeAmount, source, sourceId);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: sanitizeError(error, 'currency-earn') });
  }
});

module.exports = router;
