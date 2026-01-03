/**
 * ASDF Shop - Cosmetic & Avatar System
 *
 * PHILOSOPHY:
 * - Prices derived from fib[tier] * currentSupply / initialSupply
 * - 100% of revenue goes to BURN
 * - More burns = cheaper prices (flywheel)
 * - Rarity tied to total ecosystem burns
 *
 * LAYERS (7 total):
 * 0: background - Required, behind everything
 * 1: aura       - Optional, glow effects
 * 2: skin       - Required, base character
 * 3: outfit     - Optional, clothing
 * 4: eyes       - Optional, expressions
 * 5: head       - Optional, hats/hair
 * 6: held       - Optional, items in hand
 */

'use strict';

// Storage keys
const SHOP_STORAGE_KEY = 'asdf_shop_v1';
const SHOP_INTEGRITY_KEY = 'asdf_shop_integrity';

// Shop state
const ShopState = {
    inventory: [],          // Owned item IDs
    equipped: {             // Currently equipped per layer
        background: null,
        aura: null,
        skin: 'skin_default',
        outfit: null,
        eyes: null,
        head: null,
        held: null
    },
    totalSpent: 0,          // Total tokens spent in shop
    purchaseHistory: [],    // Purchase records
    lastUpdate: null
};

// Ecosystem state (would come from API in production)
let EcosystemState = {
    currentSupply: 1_000_000_000,
    totalBurned: 0
};

// ============================================
// CATALOG - All available items
// ============================================

const ShopCatalog = {
    // Background items (layer 0)
    backgrounds: [
        { id: 'bg_flames', name: 'Eternal Flames', tier: 0, layer: 'background', asset: 'bg_flames.png' },
        { id: 'bg_blockchain', name: 'Blockchain Grid', tier: 1, layer: 'background', asset: 'bg_blockchain.png' },
        { id: 'bg_cosmos', name: 'Cosmic Void', tier: 3, layer: 'background', asset: 'bg_cosmos.png' },
        { id: 'bg_phoenix', name: 'Phoenix Rising', tier: 5, layer: 'background', asset: 'bg_phoenix.png' },
        { id: 'bg_inferno', name: 'Inferno Core', tier: 7, layer: 'background', asset: 'bg_inferno.png' },
        { id: 'bg_transcend', name: 'Transcendence', tier: 9, layer: 'background', asset: 'bg_transcend.png' }
    ],

    // Aura items (layer 1)
    auras: [
        { id: 'aura_ember', name: 'Ember Glow', tier: 1, layer: 'aura', asset: 'aura_ember.png' },
        { id: 'aura_spark', name: 'Electric Spark', tier: 2, layer: 'aura', asset: 'aura_spark.png' },
        { id: 'aura_flame', name: 'Dancing Flames', tier: 4, layer: 'aura', asset: 'aura_flame.png' },
        { id: 'aura_inferno', name: 'Inferno Rage', tier: 6, layer: 'aura', asset: 'aura_inferno.png' },
        { id: 'aura_divine', name: 'Divine Light', tier: 8, layer: 'aura', asset: 'aura_divine.png' }
    ],

    // Skin items (layer 2)
    skins: [
        { id: 'skin_default', name: 'Fire Dog', tier: 0, layer: 'skin', asset: 'skin_default.png', default: true },
        { id: 'skin_golden', name: 'Golden Dog', tier: 3, layer: 'skin', asset: 'skin_golden.png' },
        { id: 'skin_cyber', name: 'Cyber Dog', tier: 5, layer: 'skin', asset: 'skin_cyber.png' },
        { id: 'skin_ghost', name: 'Ghost Dog', tier: 7, layer: 'skin', asset: 'skin_ghost.png' },
        { id: 'skin_cosmic', name: 'Cosmic Dog', tier: 9, layer: 'skin', asset: 'skin_cosmic.png' }
    ],

    // Outfit items (layer 3)
    outfits: [
        { id: 'outfit_hoodie', name: 'Burn Hoodie', tier: 1, layer: 'outfit', asset: 'outfit_hoodie.png' },
        { id: 'outfit_suit', name: 'Degen Suit', tier: 3, layer: 'outfit', asset: 'outfit_suit.png' },
        { id: 'outfit_armor', name: 'Diamond Armor', tier: 5, layer: 'outfit', asset: 'outfit_armor.png' },
        { id: 'outfit_robe', name: 'Cosmic Robe', tier: 7, layer: 'outfit', asset: 'outfit_robe.png' },
        { id: 'outfit_eternal', name: 'Eternal Vestments', tier: 9, layer: 'outfit', asset: 'outfit_eternal.png' }
    ],

    // Eye items (layer 4)
    eyes: [
        { id: 'eyes_laser', name: 'Laser Eyes', tier: 2, layer: 'eyes', asset: 'eyes_laser.png' },
        { id: 'eyes_diamond', name: 'Diamond Eyes', tier: 4, layer: 'eyes', asset: 'eyes_diamond.png' },
        { id: 'eyes_fire', name: 'Fire Eyes', tier: 6, layer: 'eyes', asset: 'eyes_fire.png' },
        { id: 'eyes_void', name: 'Void Eyes', tier: 8, layer: 'eyes', asset: 'eyes_void.png' }
    ],

    // Head items (layer 5)
    heads: [
        { id: 'head_cap', name: 'ASDF Cap', tier: 0, layer: 'head', asset: 'head_cap.png' },
        { id: 'head_crown', name: 'Burn Crown', tier: 3, layer: 'head', asset: 'head_crown.png' },
        { id: 'head_halo', name: 'Fire Halo', tier: 5, layer: 'head', asset: 'head_halo.png' },
        { id: 'head_horns', name: 'Demon Horns', tier: 7, layer: 'head', asset: 'head_horns.png' },
        { id: 'head_nimbus', name: 'Divine Nimbus', tier: 9, layer: 'head', asset: 'head_nimbus.png' }
    ],

    // Held items (layer 6)
    helds: [
        { id: 'held_torch', name: 'Burning Torch', tier: 1, layer: 'held', asset: 'held_torch.png' },
        { id: 'held_scepter', name: 'Burn Scepter', tier: 4, layer: 'held', asset: 'held_scepter.png' },
        { id: 'held_orb', name: 'Inferno Orb', tier: 6, layer: 'held', asset: 'held_orb.png' },
        { id: 'held_staff', name: 'Cosmic Staff', tier: 8, layer: 'held', asset: 'held_staff.png' }
    ],

    /**
     * Get all items in catalog
     */
    getAll() {
        return [
            ...this.backgrounds,
            ...this.auras,
            ...this.skins,
            ...this.outfits,
            ...this.eyes,
            ...this.heads,
            ...this.helds
        ];
    },

    /**
     * Get item by ID
     */
    getById(id) {
        return this.getAll().find(item => item.id === id);
    },

    /**
     * Get items by layer
     */
    getByLayer(layer) {
        const layerMap = {
            background: this.backgrounds,
            aura: this.auras,
            skin: this.skins,
            outfit: this.outfits,
            eyes: this.eyes,
            head: this.heads,
            held: this.helds
        };
        return layerMap[layer] || [];
    },

    /**
     * Get items by tier
     */
    getByTier(tier) {
        return this.getAll().filter(item => item.tier === tier);
    }
};

// ============================================
// INTEGRITY & VALIDATION
// ============================================

function generateShopHash(data) {
    const str = JSON.stringify({
        inventory: data.inventory.sort(),
        totalSpent: data.totalSpent
    });
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return ((hash ^ (navigator.userAgent.length + screen.width)) >>> 0).toString(36);
}

function verifyShopIntegrity(data) {
    try {
        const storedHash = localStorage.getItem(SHOP_INTEGRITY_KEY);
        if (!storedHash) return true;
        return storedHash === generateShopHash(data);
    } catch {
        return false;
    }
}

function validateShopSchema(data) {
    if (typeof data !== 'object' || data === null) return false;
    if (!Array.isArray(data.inventory)) return false;
    if (typeof data.equipped !== 'object') return false;
    if (typeof data.totalSpent !== 'number' || !Number.isFinite(data.totalSpent)) return false;
    if (!Array.isArray(data.purchaseHistory)) return false;

    // Validate inventory items exist in catalog
    for (const id of data.inventory) {
        if (typeof id !== 'string') return false;
        if (!ShopCatalog.getById(id) && id !== 'skin_default') return false;
    }

    return true;
}

// ============================================
// STATE MANAGEMENT
// ============================================

function loadShopState() {
    try {
        const saved = localStorage.getItem(SHOP_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (validateShopSchema(parsed)) {
                if (!verifyShopIntegrity(parsed)) {
                    console.warn('Shop integrity check failed, resetting');
                    resetShopState();
                    return;
                }
                Object.assign(ShopState, parsed);
            } else {
                console.warn('Invalid shop schema, using defaults');
                resetShopState();
            }
        }
    } catch (e) {
        console.warn('Failed to load shop state:', e);
        resetShopState();
    }

    // Ensure default skin is always in inventory
    if (!ShopState.inventory.includes('skin_default')) {
        ShopState.inventory.push('skin_default');
    }
}

function saveShopState() {
    try {
        ShopState.lastUpdate = Date.now();
        localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(ShopState));
        localStorage.setItem(SHOP_INTEGRITY_KEY, generateShopHash(ShopState));
    } catch (e) {
        console.warn('Failed to save shop state:', e);
    }
}

function resetShopState() {
    ShopState.inventory = ['skin_default'];
    ShopState.equipped = {
        background: null,
        aura: null,
        skin: 'skin_default',
        outfit: null,
        eyes: null,
        head: null,
        held: null
    };
    ShopState.totalSpent = 0;
    ShopState.purchaseHistory = [];
    ShopState.lastUpdate = null;
    localStorage.removeItem(SHOP_STORAGE_KEY);
    localStorage.removeItem(SHOP_INTEGRITY_KEY);
}

// ============================================
// PRICING
// ============================================

/**
 * Get current price for an item
 * @param {Object|string} item - Item object or ID
 * @returns {number} Price in tokens
 */
function getItemPrice(item) {
    if (typeof item === 'string') {
        item = ShopCatalog.getById(item);
    }
    if (!item) return 0;

    return ASDF.shop.getPrice(item.tier, EcosystemState.currentSupply);
}

/**
 * Get discounted price for user
 * @param {Object|string} item - Item object or ID
 * @param {number} engageTier - User's engage tier
 * @returns {number} Discounted price
 */
function getDiscountedPrice(item, engageTier) {
    const basePrice = getItemPrice(item);
    return ASDF.shop.applyDiscount(basePrice, engageTier);
}

/**
 * Get maximum supply for a tier
 * @param {number} tier - Shop tier
 * @returns {number} Max supply
 */
function getTierMaxSupply(tier) {
    return ASDF.shop.getMaxSupply(tier, EcosystemState.totalBurned);
}

// ============================================
// PURCHASING
// ============================================

/**
 * Check if user can purchase an item
 * @param {string} itemId - Item ID
 * @param {number} engageTier - User's engage tier
 * @param {number} userBalance - User's token balance
 * @returns {Object} Purchase eligibility
 */
function canPurchase(itemId, engageTier, userBalance) {
    const item = ShopCatalog.getById(itemId);
    if (!item) {
        return { can: false, reason: 'Item not found' };
    }

    // Already owned
    if (ShopState.inventory.includes(itemId)) {
        return { can: false, reason: 'Already owned' };
    }

    // Check tier access
    if (!ASDF.shop.canAccess(item.tier, engageTier)) {
        return { can: false, reason: `Requires higher engage tier` };
    }

    // Check price
    const price = getDiscountedPrice(item, engageTier);
    if (userBalance < price) {
        return { can: false, reason: 'Insufficient balance', needed: price - userBalance };
    }

    return { can: true, price: price };
}

/**
 * Purchase an item
 * @param {string} itemId - Item ID
 * @param {number} engageTier - User's engage tier
 * @param {number} userBalance - User's token balance
 * @returns {Object} Purchase result
 */
function purchaseItem(itemId, engageTier, userBalance) {
    const eligibility = canPurchase(itemId, engageTier, userBalance);
    if (!eligibility.can) {
        return { success: false, error: eligibility.reason };
    }

    const item = ShopCatalog.getById(itemId);
    const price = eligibility.price;

    // Add to inventory
    ShopState.inventory.push(itemId);
    ShopState.totalSpent += price;

    // Record purchase
    ShopState.purchaseHistory.unshift({
        itemId: itemId,
        itemName: item.name,
        tier: item.tier,
        price: price,
        timestamp: Date.now()
    });
    if (ShopState.purchaseHistory.length > 100) {
        ShopState.purchaseHistory.pop();
    }

    saveShopState();

    // Add XP from burn (shop purchase = burn)
    const xpResult = addXpFromBurn(price, 'shop');

    return {
        success: true,
        item: item,
        price: price,
        xpGained: xpResult.xpGained,
        tieredUp: xpResult.tieredUp,
        newTier: xpResult.tier
    };
}

// ============================================
// EQUIPMENT
// ============================================

/**
 * Equip an item
 * @param {string} itemId - Item ID
 * @returns {Object} Result
 */
function equipItem(itemId) {
    // Check if owned
    if (!ShopState.inventory.includes(itemId)) {
        return { success: false, error: 'Item not owned' };
    }

    const item = ShopCatalog.getById(itemId);
    if (!item) {
        return { success: false, error: 'Item not found' };
    }

    // Equip to correct layer
    ShopState.equipped[item.layer] = itemId;
    saveShopState();

    return { success: true, layer: item.layer, item: item };
}

/**
 * Unequip an item from a layer
 * @param {string} layer - Layer to unequip
 * @returns {Object} Result
 */
function unequipLayer(layer) {
    const layerInfo = ASDF.avatarLayers.find(l => l.id === layer);
    if (!layerInfo) {
        return { success: false, error: 'Invalid layer' };
    }

    // Can't unequip required layers (skin must stay equipped)
    if (layerInfo.required && layer === 'skin') {
        return { success: false, error: 'Cannot unequip skin' };
    }

    ShopState.equipped[layer] = null;
    saveShopState();

    return { success: true, layer: layer };
}

/**
 * Get currently equipped items
 * @returns {Object} Equipped items per layer
 */
function getEquipped() {
    const equipped = {};
    for (const layer of ASDF.avatarLayers) {
        const itemId = ShopState.equipped[layer.id];
        equipped[layer.id] = itemId ? ShopCatalog.getById(itemId) : null;
    }
    return equipped;
}

// ============================================
// INVENTORY
// ============================================

/**
 * Get user's inventory
 * @returns {Array} Owned items
 */
function getInventory() {
    return ShopState.inventory.map(id => ShopCatalog.getById(id)).filter(Boolean);
}

/**
 * Get inventory by layer
 * @param {string} layer - Layer to filter
 * @returns {Array} Items for layer
 */
function getInventoryByLayer(layer) {
    return getInventory().filter(item => item.layer === layer);
}

/**
 * Check if user owns an item
 * @param {string} itemId - Item ID
 * @returns {boolean} Ownership status
 */
function ownsItem(itemId) {
    return ShopState.inventory.includes(itemId);
}

// ============================================
// SHOP UI HELPERS
// ============================================

/**
 * Get shop catalog with prices and availability
 * @param {number} engageTier - User's engage tier
 * @param {number} userBalance - User's token balance
 * @returns {Array} Catalog with UI info
 */
function getShopCatalogForUI(engageTier, userBalance) {
    return ShopCatalog.getAll().map(item => {
        const basePrice = getItemPrice(item);
        const discountedPrice = getDiscountedPrice(item, engageTier);
        const eligibility = canPurchase(item.id, engageTier, userBalance);

        return {
            ...item,
            basePrice: basePrice,
            price: discountedPrice,
            discount: basePrice - discountedPrice,
            owned: ownsItem(item.id),
            equipped: ShopState.equipped[item.layer] === item.id,
            canPurchase: eligibility.can,
            purchaseReason: eligibility.reason,
            tierName: ASDF.shopTierNames[item.tier],
            tierColor: ASDF.getTierColor(item.tier, 'shop')
        };
    });
}

/**
 * Get purchase history
 * @param {number} limit - Max records
 * @returns {Array} Purchase history
 */
function getPurchaseHistory(limit = 20) {
    return ShopState.purchaseHistory.slice(0, limit);
}

/**
 * Update ecosystem state (call with API data)
 * @param {Object} data - Ecosystem data
 */
function updateEcosystemState(data) {
    if (typeof data.currentSupply === 'number' && data.currentSupply > 0) {
        EcosystemState.currentSupply = data.currentSupply;
    }
    if (typeof data.totalBurned === 'number' && data.totalBurned >= 0) {
        EcosystemState.totalBurned = data.totalBurned;
    }
}

// ============================================
// INITIALIZATION
// ============================================

function initShop() {
    loadShopState();
    console.log('[ASDF Shop] Initialized:', ShopState.inventory.length, 'items owned');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShop);
} else {
    initShop();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ShopState,
        ShopCatalog,
        EcosystemState,
        getItemPrice,
        getDiscountedPrice,
        getTierMaxSupply,
        canPurchase,
        purchaseItem,
        equipItem,
        unequipLayer,
        getEquipped,
        getInventory,
        getInventoryByLayer,
        ownsItem,
        getShopCatalogForUI,
        getPurchaseHistory,
        updateEcosystemState,
        resetShopState
    };
}
