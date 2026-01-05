/**
 * ASDF API - Shop V2 Service
 *
 * Cosmetic shop with:
 * - Fibonacci-based dynamic pricing
 * - Dual currency support (burn + in-game)
 * - Hybrid rarity (time, quantity, tier)
 * - Collections and favorites
 *
 * @version 2.0.0
 */

'use strict';

const db = require('./postgres');
const { getStorage } = require('./storage');

// ============================================
// CONSTANTS (Fibonacci-based)
// ============================================

const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
const INITIAL_SUPPLY = 1_000_000_000;

const LAYERS = ['background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held'];

const RARITY_CONFIG = {
    common: { fibIndex: 7, color: '#9ca3af', multiplier: 1 },
    uncommon: { fibIndex: 9, color: '#22c55e', multiplier: 1.5 },
    rare: { fibIndex: 11, color: '#3b82f6', multiplier: 2 },
    epic: { fibIndex: 13, color: '#a855f7', multiplier: 3 },
    legendary: { fibIndex: 15, color: '#f97316', multiplier: 5 }
};

const TIER_NAMES = [
    'Basic', 'Common', 'Uncommon', 'Rare', 'Elite',
    'Epic', 'Legendary', 'Mythic', 'Divine', 'Transcendent'
];

const CURRENCY = {
    BURN: 'burn',
    INGAME: 'ingame'
};

// Pending purchases (in-memory, use Redis in production)
const pendingPurchases = new Map();
const usedSignatures = new Set();
const PURCHASE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// INITIAL CATALOG (for seeding)
// ============================================

const INITIAL_ITEMS = [
    // Backgrounds
    { id: 'bg_flames', name: 'Eternal Flames', layer: 'background', tier: 0, asset: 'bg_flames.png' },
    { id: 'bg_blockchain', name: 'Blockchain Grid', layer: 'background', tier: 1, asset: 'bg_blockchain.png' },
    { id: 'bg_cosmos', name: 'Cosmic Void', layer: 'background', tier: 3, asset: 'bg_cosmos.png' },
    { id: 'bg_phoenix', name: 'Phoenix Rising', layer: 'background', tier: 5, asset: 'bg_phoenix.png' },
    { id: 'bg_inferno', name: 'Inferno Core', layer: 'background', tier: 7, asset: 'bg_inferno.png' },
    { id: 'bg_transcend', name: 'Transcendence', layer: 'background', tier: 9, asset: 'bg_transcend.png' },

    // Auras
    { id: 'aura_ember', name: 'Ember Glow', layer: 'aura', tier: 1, asset: 'aura_ember.png' },
    { id: 'aura_spark', name: 'Electric Spark', layer: 'aura', tier: 2, asset: 'aura_spark.png' },
    { id: 'aura_flame', name: 'Dancing Flames', layer: 'aura', tier: 4, asset: 'aura_flame.png' },
    { id: 'aura_inferno', name: 'Inferno Rage', layer: 'aura', tier: 6, asset: 'aura_inferno.png' },
    { id: 'aura_divine', name: 'Divine Light', layer: 'aura', tier: 8, asset: 'aura_divine.png' },

    // Skins
    { id: 'skin_default', name: 'Fire Dog', layer: 'skin', tier: 0, asset: 'skin_default.png', default: true },
    { id: 'skin_golden', name: 'Golden Dog', layer: 'skin', tier: 3, asset: 'skin_golden.png' },
    { id: 'skin_cyber', name: 'Cyber Dog', layer: 'skin', tier: 5, asset: 'skin_cyber.png' },
    { id: 'skin_ghost', name: 'Ghost Dog', layer: 'skin', tier: 7, asset: 'skin_ghost.png' },
    { id: 'skin_cosmic', name: 'Cosmic Dog', layer: 'skin', tier: 9, asset: 'skin_cosmic.png' },

    // Outfits
    { id: 'outfit_hoodie', name: 'Burn Hoodie', layer: 'outfit', tier: 1, asset: 'outfit_hoodie.png' },
    { id: 'outfit_suit', name: 'Degen Suit', layer: 'outfit', tier: 3, asset: 'outfit_suit.png' },
    { id: 'outfit_armor', name: 'Diamond Armor', layer: 'outfit', tier: 5, asset: 'outfit_armor.png' },
    { id: 'outfit_robe', name: 'Cosmic Robe', layer: 'outfit', tier: 7, asset: 'outfit_robe.png' },
    { id: 'outfit_eternal', name: 'Eternal Vestments', layer: 'outfit', tier: 9, asset: 'outfit_eternal.png' },

    // Eyes
    { id: 'eyes_laser', name: 'Laser Eyes', layer: 'eyes', tier: 2, asset: 'eyes_laser.png' },
    { id: 'eyes_diamond', name: 'Diamond Eyes', layer: 'eyes', tier: 4, asset: 'eyes_diamond.png' },
    { id: 'eyes_fire', name: 'Fire Eyes', layer: 'eyes', tier: 6, asset: 'eyes_fire.png' },
    { id: 'eyes_void', name: 'Void Eyes', layer: 'eyes', tier: 8, asset: 'eyes_void.png' },

    // Heads
    { id: 'head_cap', name: 'ASDF Cap', layer: 'head', tier: 0, asset: 'head_cap.png' },
    { id: 'head_crown', name: 'Burn Crown', layer: 'head', tier: 3, asset: 'head_crown.png' },
    { id: 'head_halo', name: 'Fire Halo', layer: 'head', tier: 5, asset: 'head_halo.png' },
    { id: 'head_horns', name: 'Demon Horns', layer: 'head', tier: 7, asset: 'head_horns.png' },
    { id: 'head_nimbus', name: 'Divine Nimbus', layer: 'head', tier: 9, asset: 'head_nimbus.png' },

    // Held items
    { id: 'held_torch', name: 'Burning Torch', layer: 'held', tier: 1, asset: 'held_torch.png' },
    { id: 'held_scepter', name: 'Burn Scepter', layer: 'held', tier: 4, asset: 'held_scepter.png' },
    { id: 'held_orb', name: 'Inferno Orb', layer: 'held', tier: 6, asset: 'held_orb.png' },
    { id: 'held_staff', name: 'Cosmic Staff', layer: 'held', tier: 8, asset: 'held_staff.png' }
];

// ============================================
// PRICING
// ============================================

/**
 * Get Fibonacci number
 */
function getFib(n) {
    if (n < 0 || n >= FIB.length) return FIB[FIB.length - 1];
    return FIB[n];
}

/**
 * Calculate item price based on tier and supply
 * @param {number} tier - Item tier (0-9)
 * @param {number} currentSupply - Current token supply
 * @returns {number} Price in tokens
 */
function calculatePrice(tier, currentSupply = INITIAL_SUPPLY) {
    const basePrice = getFib(tier + 3) * 100; // tier 0 = fib[3]*100 = 200
    const supplyMultiplier = currentSupply / INITIAL_SUPPLY;
    return Math.max(1, Math.floor(basePrice * supplyMultiplier));
}

/**
 * Apply engage tier discount
 * @param {number} price - Base price
 * @param {number} engageTier - User's engage tier (0-4)
 * @returns {number} Discounted price
 */
function applyDiscount(price, engageTier) {
    const discountPercent = getFib(engageTier + 1); // tier 0 = 1%, tier 4 = 5%
    const discount = Math.floor(price * discountPercent / 100);
    return Math.max(1, price - discount);
}

/**
 * Get price with all calculations
 */
function getItemPrice(item, currentSupply, engageTier = 0) {
    if (item.is_default) return 0;
    if (item.price_override) return applyDiscount(item.price_override, engageTier);

    const basePrice = calculatePrice(item.tier, currentSupply);
    return applyDiscount(basePrice, engageTier);
}

/**
 * Get in-game currency price (1.5x burn price, no tier discount)
 */
function getIngamePrice(item, currentSupply) {
    if (item.is_default) return 0;
    if (item.ingame_price) return item.ingame_price;

    const burnPrice = calculatePrice(item.tier, currentSupply);
    return Math.floor(burnPrice * 1.5);
}

// ============================================
// AVAILABILITY
// ============================================

/**
 * Check if item is available for purchase
 */
function checkAvailability(item, userEngageTier = 0) {
    const now = Date.now();
    const result = {
        available: true,
        reasons: [],
        urgency: 'none' // none, low, medium, high
    };

    // Check if active
    if (!item.is_active) {
        result.available = false;
        result.reasons.push('Item not available');
        return result;
    }

    // Check time window
    if (item.available_from) {
        const fromDate = new Date(item.available_from).getTime();
        if (now < fromDate) {
            result.available = false;
            result.reasons.push(`Available from ${new Date(item.available_from).toLocaleDateString()}`);
        }
    }

    if (item.available_until) {
        const untilDate = new Date(item.available_until).getTime();
        if (now > untilDate) {
            result.available = false;
            result.reasons.push('No longer available');
        } else {
            const remaining = untilDate - now;
            const oneDay = 24 * 60 * 60 * 1000;
            const oneWeek = 7 * oneDay;

            if (remaining < oneDay) {
                result.urgency = 'high';
                result.reasons.push(`Ends in ${formatDuration(remaining)}`);
            } else if (remaining < oneWeek) {
                result.urgency = 'medium';
                result.reasons.push(`${Math.ceil(remaining / oneDay)} days left`);
            }
        }
    }

    // Check quantity limit
    if (item.quantity_limit) {
        const remaining = item.quantity_limit - (item.quantity_sold || 0);
        if (remaining <= 0) {
            result.available = false;
            result.reasons.push('Sold out');
        } else if (remaining <= 10) {
            result.urgency = result.urgency === 'high' ? 'high' : 'medium';
            result.reasons.push(`${remaining} left`);
        } else if (remaining <= 50) {
            result.reasons.push(`${remaining} remaining`);
        }
    }

    // Check tier requirement
    if (item.required_tier > userEngageTier) {
        result.available = false;
        result.reasons.push(`Requires ${TIER_NAMES[item.required_tier]} tier`);
    }

    return result;
}

/**
 * Format duration for display
 */
function formatDuration(ms) {
    const hours = Math.floor(ms / (60 * 60 * 1000));
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

// ============================================
// CATALOG
// ============================================

/**
 * Initialize shop with seed data
 */
async function initializeShop() {
    if (!db.isAvailable()) {
        console.log('[ShopV2] Database not available, skipping seed');
        return;
    }

    try {
        // Check if already seeded
        const { data: items } = await db.getShopCatalog({});
        if (items && items.length > 0) {
            console.log(`[ShopV2] Already seeded with ${items.length} items`);
            return;
        }

        // Seed initial items
        await db.seedShopItems(INITIAL_ITEMS);
        console.log(`[ShopV2] Seeded ${INITIAL_ITEMS.length} initial items`);

    } catch (error) {
        console.error('[ShopV2] Failed to initialize:', error.message);
    }
}

/**
 * Get catalog for display
 */
async function getCatalog(filters = {}, wallet = null, currentSupply = INITIAL_SUPPLY, engageTier = 0) {
    const { data: items } = await db.getShopCatalog(filters);
    if (!items) return [];

    // Get user inventory if wallet provided
    let ownedIds = [];
    if (wallet) {
        const { data: inventory } = await db.getUserShopInventory(wallet);
        ownedIds = (inventory || []).map(i => i.id);
    }

    // Enrich items with pricing and availability
    return items.map(item => {
        const availability = checkAvailability(item, engageTier);
        const burnPrice = getItemPrice(item, currentSupply, engageTier);
        const ingamePrice = getIngamePrice(item, currentSupply);

        const currencyModes = item.currency_modes || ['burn'];

        return {
            ...item,
            // Pricing
            burnPrice,
            ingamePrice,
            basePrice: calculatePrice(item.tier, currentSupply),
            discount: calculatePrice(item.tier, currentSupply) - burnPrice,

            // Availability
            ...availability,
            owned: ownedIds.includes(item.id),

            // Currencies accepted
            acceptsBurn: currencyModes.includes('burn'),
            acceptsIngame: currencyModes.includes('ingame'),

            // Display helpers
            tierName: TIER_NAMES[item.tier],
            tierColor: getTierColor(item.tier),
            rarityConfig: RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common
        };
    });
}

/**
 * Get tier color
 */
function getTierColor(tier) {
    if (tier <= 1) return RARITY_CONFIG.common.color;
    if (tier <= 3) return RARITY_CONFIG.uncommon.color;
    if (tier <= 5) return RARITY_CONFIG.rare.color;
    if (tier <= 7) return RARITY_CONFIG.epic.color;
    return RARITY_CONFIG.legendary.color;
}

/**
 * Get single item with full details
 */
async function getItem(itemId, wallet = null, currentSupply = INITIAL_SUPPLY, engageTier = 0) {
    const { data: item } = await db.getShopItem(itemId);
    if (!item) return null;

    // Check ownership
    let owned = false;
    if (wallet) {
        const { data: inventory } = await db.getUserShopInventory(wallet);
        owned = (inventory || []).some(i => i.id === itemId);
    }

    const availability = checkAvailability(item, engageTier);
    const burnPrice = getItemPrice(item, currentSupply, engageTier);
    const ingamePrice = getIngamePrice(item, currentSupply);
    const currencyModes = item.currency_modes || ['burn'];

    return {
        ...item,
        burnPrice,
        ingamePrice,
        basePrice: calculatePrice(item.tier, currentSupply),
        discount: calculatePrice(item.tier, currentSupply) - burnPrice,
        ...availability,
        owned,
        acceptsBurn: currencyModes.includes('burn'),
        acceptsIngame: currencyModes.includes('ingame'),
        tierName: TIER_NAMES[item.tier],
        tierColor: getTierColor(item.tier),
        rarityConfig: RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common
    };
}

// ============================================
// INVENTORY & EQUIPMENT
// ============================================

/**
 * Get user inventory
 */
async function getInventory(wallet) {
    const { data: items } = await db.getUserShopInventory(wallet);
    return items || [];
}

/**
 * Get equipped items
 */
async function getEquipped(wallet) {
    const { data: equipped } = await db.getUserEquipped(wallet);
    return equipped;
}

/**
 * Equip an item
 */
async function equipItem(wallet, itemId) {
    // Verify ownership
    const { data: inventory } = await db.getUserShopInventory(wallet);
    const owns = (inventory || []).some(i => i.id === itemId);

    if (!owns && itemId !== 'skin_default') {
        throw new Error('Item not owned');
    }

    // Get item to find layer
    const { data: item } = await db.getShopItem(itemId);
    if (!item && itemId !== 'skin_default') {
        throw new Error('Item not found');
    }

    const layer = item?.layer || 'skin';
    return db.setEquippedItem(wallet, layer, itemId);
}

/**
 * Unequip a layer
 */
async function unequipLayer(wallet, layer) {
    if (layer === 'skin') {
        // Reset to default skin
        return db.setEquippedItem(wallet, 'skin', 'skin_default');
    }

    return db.setEquippedItem(wallet, layer, null);
}

// ============================================
// FAVORITES
// ============================================

/**
 * Get user favorites
 */
async function getFavorites(wallet) {
    const { data: favorites } = await db.getUserFavorites(wallet);
    return favorites || [];
}

/**
 * Toggle favorite status
 */
async function toggleFavorite(wallet, itemId) {
    const { data: favorites } = await db.getUserFavorites(wallet);
    const isFavorited = (favorites || []).some(f => f.id === itemId);

    if (isFavorited) {
        await db.removeFavorite(wallet, itemId);
        return { favorited: false };
    } else {
        await db.addFavorite(wallet, itemId);
        return { favorited: true };
    }
}

// ============================================
// COLLECTIONS
// ============================================

/**
 * Get collections with progress
 */
async function getCollections(wallet = null) {
    const { data: collections } = await db.getCollections(wallet);
    return collections || [];
}

// ============================================
// EVENTS
// ============================================

/**
 * Get active shop events
 */
async function getActiveEvents() {
    const { data: events } = await db.getActiveEvents();
    return events || [];
}

// ============================================
// CURRENCY
// ============================================

/**
 * Get user currency balance
 */
async function getCurrencyBalance(wallet) {
    const { data: currency } = await db.getUserCurrency(wallet);
    return currency;
}

/**
 * Earn in-game currency
 */
async function earnCurrency(wallet, amount, source, sourceId = null) {
    if (amount <= 0) throw new Error('Amount must be positive');
    return db.addUserCurrency(wallet, amount, source, sourceId);
}

// ============================================
// PURCHASE FLOW
// ============================================

/**
 * Initiate a purchase (two-phase)
 * @returns Purchase session for client to sign/confirm
 */
async function initiatePurchase(wallet, itemId, currency, currentSupply = INITIAL_SUPPLY, engageTier = 0) {
    // Get item
    const item = await getItem(itemId, wallet, currentSupply, engageTier);
    if (!item) {
        throw new Error('Item not found');
    }

    // Check already owned
    if (item.owned) {
        throw new Error('Item already owned');
    }

    // Check availability
    if (!item.available) {
        throw new Error(item.reasons[0] || 'Item not available');
    }

    // Validate currency
    if (currency === CURRENCY.BURN && !item.acceptsBurn) {
        throw new Error('Item does not accept burn currency');
    }
    if (currency === CURRENCY.INGAME && !item.acceptsIngame) {
        throw new Error('Item does not accept in-game currency');
    }

    // Get price based on currency
    const price = currency === CURRENCY.BURN ? item.burnPrice : item.ingamePrice;

    // For in-game currency, check balance
    if (currency === CURRENCY.INGAME) {
        const { data: userCurrency } = await db.getUserCurrency(wallet);
        if (!userCurrency || userCurrency.balance < price) {
            throw new Error('Insufficient in-game currency');
        }
    }

    // Create purchase session
    const purchaseId = `${wallet}_${itemId}_${Date.now()}`;
    const session = {
        purchaseId,
        wallet,
        itemId,
        itemName: item.name,
        currency,
        price,
        engageTier,
        discount: item.discount,
        expiresAt: Date.now() + PURCHASE_EXPIRY_MS,
        status: 'pending'
    };

    pendingPurchases.set(purchaseId, session);

    // Return session info for client
    // If burn currency, client needs to build and sign transaction
    // If in-game currency, client just confirms
    return {
        purchaseId,
        itemId,
        itemName: item.name,
        currency,
        price,
        discount: item.discount,
        expiresAt: session.expiresAt,
        requiresSignature: currency === CURRENCY.BURN
    };
}

/**
 * Confirm purchase
 * @param {string} purchaseId - Purchase session ID
 * @param {string} signature - Transaction signature (for burn) or null (for in-game)
 */
async function confirmPurchase(purchaseId, signature = null) {
    // Get pending purchase
    const session = pendingPurchases.get(purchaseId);
    if (!session) {
        throw new Error('Purchase session not found or expired');
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
        pendingPurchases.delete(purchaseId);
        throw new Error('Purchase session expired');
    }

    // Check not already processed
    if (session.status !== 'pending') {
        throw new Error('Purchase already processed');
    }

    const { wallet, itemId, currency, price, engageTier, discount } = session;

    // For burn currency, verify signature
    if (currency === CURRENCY.BURN) {
        if (!signature) {
            throw new Error('Transaction signature required');
        }

        // Check signature not already used
        if (usedSignatures.has(signature)) {
            throw new Error('Transaction signature already used');
        }

        // Mark signature as used BEFORE processing
        usedSignatures.add(signature);

        // TODO: Verify on-chain transaction via helius service
        // For now, we trust the client (in production, verify!)
    }

    // For in-game currency, deduct balance
    if (currency === CURRENCY.INGAME) {
        try {
            await db.spendUserCurrency(wallet, price, 'shop_purchase', itemId);
        } catch (error) {
            pendingPurchases.delete(purchaseId);
            throw new Error('Failed to deduct currency: ' + error.message);
        }
    }

    // Record purchase
    await db.recordShopPurchase(
        wallet,
        itemId,
        price,
        currency,
        signature,
        engageTier,
        discount
    );

    // Update session status
    session.status = 'completed';
    pendingPurchases.delete(purchaseId);

    return {
        success: true,
        itemId,
        price,
        currency,
        xpGranted: currency === CURRENCY.BURN ? price : Math.floor(price / 2)
    };
}

// ============================================
// CLEANUP
// ============================================

/**
 * Clean expired purchase sessions
 */
function cleanupExpiredSessions() {
    const now = Date.now();
    for (const [id, session] of pendingPurchases) {
        if (now > session.expiresAt) {
            pendingPurchases.delete(id);
        }
    }
}

// Run cleanup every minute
setInterval(cleanupExpiredSessions, 60 * 1000);

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Constants
    FIB,
    LAYERS,
    RARITY_CONFIG,
    TIER_NAMES,
    CURRENCY,
    INITIAL_ITEMS,

    // Pricing
    getFib,
    calculatePrice,
    applyDiscount,
    getItemPrice,
    getIngamePrice,

    // Availability
    checkAvailability,

    // Catalog
    initializeShop,
    getCatalog,
    getItem,
    getTierColor,

    // Inventory
    getInventory,
    getEquipped,
    equipItem,
    unequipLayer,

    // Favorites
    getFavorites,
    toggleFavorite,

    // Collections
    getCollections,

    // Events
    getActiveEvents,

    // Currency
    getCurrencyBalance,
    earnCurrency,

    // Purchase
    initiatePurchase,
    confirmPurchase
};
