/**
 * ASDF API - Shop Service
 *
 * Handles cosmetic purchases with on-chain burns
 * - Price calculation (Fibonacci × supply)
 * - Transaction building
 * - Burn verification
 * - Inventory management
 */

'use strict';

const { buildBurnTransaction, verifyBurnTransaction, getTokenSupply, getTokenBalance } = require('./helius');
const { calculateTier } = require('./auth');

// Fibonacci sequence for pricing
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
const INITIAL_SUPPLY = 1_000_000_000;

// Pending purchases (use Redis in production)
const pendingPurchases = new Map();

// Used transaction signatures - CRITICAL: Prevents double-spend attacks
// In production: Use PostgreSQL table with UNIQUE constraint on signature
const usedSignatures = new Set();

// Shop catalog (same as frontend but authoritative)
const CATALOG = {
    backgrounds: [
        { id: 'bg_flames', name: 'Eternal Flames', tier: 0, layer: 'background' },
        { id: 'bg_blockchain', name: 'Blockchain Grid', tier: 1, layer: 'background' },
        { id: 'bg_cosmos', name: 'Cosmic Void', tier: 3, layer: 'background' },
        { id: 'bg_phoenix', name: 'Phoenix Rising', tier: 5, layer: 'background' },
        { id: 'bg_inferno', name: 'Inferno Core', tier: 7, layer: 'background' },
        { id: 'bg_transcend', name: 'Transcendence', tier: 9, layer: 'background' }
    ],
    auras: [
        { id: 'aura_ember', name: 'Ember Glow', tier: 1, layer: 'aura' },
        { id: 'aura_spark', name: 'Electric Spark', tier: 2, layer: 'aura' },
        { id: 'aura_flame', name: 'Dancing Flames', tier: 4, layer: 'aura' },
        { id: 'aura_inferno', name: 'Inferno Rage', tier: 6, layer: 'aura' },
        { id: 'aura_divine', name: 'Divine Light', tier: 8, layer: 'aura' }
    ],
    skins: [
        { id: 'skin_default', name: 'Fire Dog', tier: 0, layer: 'skin', default: true },
        { id: 'skin_golden', name: 'Golden Dog', tier: 3, layer: 'skin' },
        { id: 'skin_cyber', name: 'Cyber Dog', tier: 5, layer: 'skin' },
        { id: 'skin_ghost', name: 'Ghost Dog', tier: 7, layer: 'skin' },
        { id: 'skin_cosmic', name: 'Cosmic Dog', tier: 9, layer: 'skin' }
    ],
    outfits: [
        { id: 'outfit_hoodie', name: 'Burn Hoodie', tier: 1, layer: 'outfit' },
        { id: 'outfit_suit', name: 'Degen Suit', tier: 3, layer: 'outfit' },
        { id: 'outfit_armor', name: 'Diamond Armor', tier: 5, layer: 'outfit' },
        { id: 'outfit_robe', name: 'Cosmic Robe', tier: 7, layer: 'outfit' },
        { id: 'outfit_eternal', name: 'Eternal Vestments', tier: 9, layer: 'outfit' }
    ],
    eyes: [
        { id: 'eyes_laser', name: 'Laser Eyes', tier: 2, layer: 'eyes' },
        { id: 'eyes_diamond', name: 'Diamond Eyes', tier: 4, layer: 'eyes' },
        { id: 'eyes_fire', name: 'Fire Eyes', tier: 6, layer: 'eyes' },
        { id: 'eyes_void', name: 'Void Eyes', tier: 8, layer: 'eyes' }
    ],
    heads: [
        { id: 'head_cap', name: 'ASDF Cap', tier: 0, layer: 'head' },
        { id: 'head_crown', name: 'Burn Crown', tier: 3, layer: 'head' },
        { id: 'head_halo', name: 'Fire Halo', tier: 5, layer: 'head' },
        { id: 'head_horns', name: 'Demon Horns', tier: 7, layer: 'head' },
        { id: 'head_nimbus', name: 'Divine Nimbus', tier: 9, layer: 'head' }
    ],
    helds: [
        { id: 'held_torch', name: 'Burning Torch', tier: 1, layer: 'held' },
        { id: 'held_scepter', name: 'Burn Scepter', tier: 4, layer: 'held' },
        { id: 'held_orb', name: 'Inferno Orb', tier: 6, layer: 'held' },
        { id: 'held_staff', name: 'Cosmic Staff', tier: 8, layer: 'held' }
    ]
};

/**
 * Get all items in catalog
 */
function getAllItems() {
    return [
        ...CATALOG.backgrounds,
        ...CATALOG.auras,
        ...CATALOG.skins,
        ...CATALOG.outfits,
        ...CATALOG.eyes,
        ...CATALOG.heads,
        ...CATALOG.helds
    ];
}

/**
 * Get item by ID
 */
function getItemById(itemId) {
    return getAllItems().find(item => item.id === itemId);
}

/**
 * Calculate item price based on current supply
 * Formula: fib[tier] × currentSupply / initialSupply
 * @param {number} tier - Item tier (0-9)
 * @param {number} currentSupply - Current token supply
 * @returns {number} Price in tokens
 */
function calculatePrice(tier, currentSupply) {
    const fibValue = FIB[tier] || 0;
    return Math.floor(fibValue * currentSupply / INITIAL_SUPPLY);
}

/**
 * Apply tier discount to price
 * @param {number} price - Base price
 * @param {number} engageTier - User's engage tier (0-4)
 * @returns {number} Discounted price
 */
function applyDiscount(price, engageTier) {
    const discountPercent = (FIB[engageTier] || 0) / 100;
    return Math.floor(price * (1 - discountPercent));
}

/**
 * Check if user can access a shop tier
 * @param {number} shopTier - Item tier
 * @param {number} engageTier - User's engage tier
 * @returns {boolean}
 */
function canAccessTier(shopTier, engageTier) {
    if (shopTier <= 2) return true; // Common-Rare always accessible
    const requiredTier = Math.min(shopTier - 2, 4);
    return engageTier >= requiredTier;
}

/**
 * Get catalog with current prices
 * @param {number} engageTier - User's engage tier for discounts
 * @returns {Promise<Array>}
 */
async function getCatalogWithPrices(engageTier = 0) {
    const { current: currentSupply } = await getTokenSupply();

    return getAllItems().map(item => {
        const basePrice = calculatePrice(item.tier, currentSupply);
        const discountedPrice = applyDiscount(basePrice, engageTier);

        return {
            ...item,
            basePrice,
            price: discountedPrice,
            discount: basePrice - discountedPrice,
            accessible: canAccessTier(item.tier, engageTier)
        };
    });
}

/**
 * Initiate a purchase (returns transaction to sign)
 * @param {string} wallet - User's wallet
 * @param {string} itemId - Item to purchase
 * @param {number} engageTier - User's engage tier
 * @param {Array} ownedItems - Items user already owns
 * @returns {Promise<{transaction: string, price: number, purchaseId: string}>}
 */
async function initiatePurchase(wallet, itemId, engageTier, ownedItems = []) {
    const item = getItemById(itemId);

    if (!item) {
        throw new Error('Item not found');
    }

    if (item.default) {
        throw new Error('Cannot purchase default items');
    }

    if (ownedItems.includes(itemId)) {
        throw new Error('Item already owned');
    }

    if (!canAccessTier(item.tier, engageTier)) {
        throw new Error(`Requires higher engage tier to access ${item.name}`);
    }

    // Get current supply for pricing
    const { current: currentSupply } = await getTokenSupply();
    const basePrice = calculatePrice(item.tier, currentSupply);
    const price = applyDiscount(basePrice, engageTier);

    if (price <= 0) {
        throw new Error('Price calculation error');
    }

    // Check user balance
    const { balance } = await getTokenBalance(wallet);
    if (balance < price) {
        throw new Error(`Insufficient balance. Need ${price}, have ${balance}`);
    }

    // Build burn transaction
    const { transaction, blockhash, lastValidBlockHeight } = await buildBurnTransaction(wallet, price);

    // Generate purchase ID
    const purchaseId = `${wallet}-${itemId}-${Date.now()}`;

    // Store pending purchase (expires in 5 minutes)
    pendingPurchases.set(purchaseId, {
        wallet,
        itemId,
        item,
        price,
        blockhash,
        lastValidBlockHeight,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Cleanup old pending purchases
    cleanupPendingPurchases();

    return {
        transaction,
        price,
        purchaseId,
        item: {
            id: item.id,
            name: item.name,
            tier: item.tier
        }
    };
}

/**
 * Confirm a purchase after user signs and submits transaction
 * @param {string} purchaseId - Purchase ID from initiatePurchase
 * @param {string} signature - Transaction signature
 * @returns {Promise<{success: boolean, item: object, xpGained: number}>}
 */
async function confirmPurchase(purchaseId, signature) {
    // CRITICAL: Check for double-spend attack
    // Same signature cannot be used twice
    if (usedSignatures.has(signature)) {
        throw new Error('Transaction signature already used');
    }

    const pending = pendingPurchases.get(purchaseId);

    if (!pending) {
        throw new Error('Purchase not found or expired');
    }

    if (Date.now() > pending.expiresAt) {
        pendingPurchases.delete(purchaseId);
        throw new Error('Purchase expired');
    }

    // Verify the burn transaction on-chain
    const verification = await verifyBurnTransaction(
        signature,
        pending.wallet,
        pending.price
    );

    if (!verification.valid) {
        throw new Error(`Transaction verification failed: ${verification.error}`);
    }

    // CRITICAL: Mark signature as used BEFORE any state changes
    // In production: INSERT INTO used_signatures with DB transaction
    usedSignatures.add(signature);

    // Purchase verified! Remove from pending
    pendingPurchases.delete(purchaseId);

    // In production, this would:
    // 1. Add item to user's inventory in database
    // 2. Add XP (1:1 with burned tokens)
    // 3. Record burn in burns table
    // 4. Return updated user state

    const xpGained = pending.price; // 1:1 XP

    return {
        success: true,
        item: pending.item,
        price: pending.price,
        xpGained,
        txSignature: signature,
        // These would come from database after update:
        // newTotalXp, newTier, inventory
    };
}

/**
 * Get user's inventory (from database)
 * Placeholder - would query PostgreSQL in production
 */
async function getInventory(wallet) {
    // In production:
    // return db.query('SELECT item_id FROM inventory WHERE wallet = $1', [wallet]);

    // Placeholder: everyone starts with default skin
    return ['skin_default'];
}

/**
 * Get user's equipped items (from database)
 */
async function getEquipped(wallet) {
    // In production:
    // return db.query('SELECT * FROM equipped WHERE wallet = $1', [wallet]);

    return {
        background: null,
        aura: null,
        skin: 'skin_default',
        outfit: null,
        eyes: null,
        head: null,
        held: null
    };
}

/**
 * Equip an item
 */
async function equipItem(wallet, itemId, ownedItems) {
    const item = getItemById(itemId);

    if (!item) {
        throw new Error('Item not found');
    }

    if (!ownedItems.includes(itemId)) {
        throw new Error('Item not owned');
    }

    // In production: update equipped table
    // await db.query('UPDATE equipped SET $1 = $2 WHERE wallet = $3', [item.layer, itemId, wallet]);

    return {
        success: true,
        layer: item.layer,
        itemId
    };
}

/**
 * Unequip a layer
 */
async function unequipLayer(wallet, layer) {
    const validLayers = ['background', 'aura', 'outfit', 'eyes', 'head', 'held'];

    if (!validLayers.includes(layer)) {
        throw new Error('Invalid layer or cannot unequip required layer');
    }

    // In production: update equipped table
    // await db.query('UPDATE equipped SET $1 = NULL WHERE wallet = $2', [layer, wallet]);

    return {
        success: true,
        layer
    };
}

/**
 * Cleanup expired pending purchases
 */
function cleanupPendingPurchases() {
    const now = Date.now();
    for (const [id, purchase] of pendingPurchases.entries()) {
        if (now > purchase.expiresAt) {
            pendingPurchases.delete(id);
        }
    }
}

module.exports = {
    getAllItems,
    getItemById,
    calculatePrice,
    applyDiscount,
    canAccessTier,
    getCatalogWithPrices,
    initiatePurchase,
    confirmPurchase,
    getInventory,
    getEquipped,
    equipItem,
    unequipLayer,
    // Constants
    FIB,
    INITIAL_SUPPLY,
    CATALOG
};
