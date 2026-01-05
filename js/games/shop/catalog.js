/**
 * ASDF Shop V2 - Catalog Module
 *
 * Fibonacci pricing, tier management, and item enrichment
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// FIBONACCI PRICING SYSTEM
// ============================================

/**
 * Fibonacci sequence for pricing tiers
 * Index maps to tier (0-9)
 */
const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];

/**
 * Base prices by layer type (in ASDF tokens)
 */
const LAYER_BASE_PRICES = {
    background: 100,
    aura: 150,
    skin: 200,
    outfit: 175,
    eyes: 125,
    head: 250,
    held: 225
};

/**
 * Tier names and colors
 */
const TIER_CONFIG = {
    0: { name: 'Common', color: '#9ca3af', rarity: 'common' },
    1: { name: 'Common', color: '#9ca3af', rarity: 'common' },
    2: { name: 'Uncommon', color: '#22c55e', rarity: 'uncommon' },
    3: { name: 'Uncommon', color: '#22c55e', rarity: 'uncommon' },
    4: { name: 'Rare', color: '#3b82f6', rarity: 'rare' },
    5: { name: 'Rare', color: '#3b82f6', rarity: 'rare' },
    6: { name: 'Epic', color: '#a855f7', rarity: 'epic' },
    7: { name: 'Epic', color: '#a855f7', rarity: 'epic' },
    8: { name: 'Legendary', color: '#f97316', rarity: 'legendary' },
    9: { name: 'Legendary', color: '#f97316', rarity: 'legendary' }
};

/**
 * Rarity drop weights (for random generation)
 */
const RARITY_WEIGHTS = {
    common: 50,
    uncommon: 30,
    rare: 15,
    epic: 4,
    legendary: 1
};

// ============================================
// CATALOG MANAGER
// ============================================

const ShopCatalog = {
    // Cached enriched items
    _cache: new Map(),

    // ============================================
    // PRICING CALCULATIONS
    // ============================================

    /**
     * Calculate price based on Fibonacci tier
     * @param {string} layer - Item layer type
     * @param {number} tier - Item tier (0-9)
     * @param {Object} options - Additional options
     * @returns {number} Calculated price
     */
    calculatePrice(layer, tier, options = {}) {
        const basePrice = LAYER_BASE_PRICES[layer] || 100;
        const fibMultiplier = FIBONACCI[tier] || 1;

        let price = basePrice * fibMultiplier;

        // Apply limited edition multiplier
        if (options.isLimited) {
            price *= 1.5;
        }

        // Apply event discount
        if (options.discountPercent) {
            price *= (1 - options.discountPercent / 100);
        }

        return Math.round(price);
    },

    /**
     * Calculate in-game currency price (1.5x burn price)
     * @param {number} burnPrice - Burn token price
     * @returns {number} In-game currency price
     */
    calculateIngamePrice(burnPrice) {
        return Math.round(burnPrice * 1.5);
    },

    /**
     * Get all prices for an item
     * @param {Object} item - Item object
     * @returns {Object} Prices object
     */
    getPrices(item) {
        const burnPrice = item.burnPrice || this.calculatePrice(item.layer, item.tier, {
            isLimited: item.is_limited,
            discountPercent: item.discount
        });

        const ingamePrice = item.ingamePrice || this.calculateIngamePrice(burnPrice);

        return {
            burn: burnPrice,
            ingame: ingamePrice,
            original: item.is_limited ? Math.round(burnPrice / 1.5) : burnPrice,
            discount: item.discount || 0
        };
    },

    // ============================================
    // TIER MANAGEMENT
    // ============================================

    /**
     * Get tier configuration
     * @param {number} tier - Tier number (0-9)
     * @returns {Object} Tier config
     */
    getTierConfig(tier) {
        return TIER_CONFIG[tier] || TIER_CONFIG[0];
    },

    /**
     * Get tier name
     * @param {number} tier - Tier number
     * @returns {string} Tier name
     */
    getTierName(tier) {
        return this.getTierConfig(tier).name;
    },

    /**
     * Get tier color
     * @param {number} tier - Tier number
     * @returns {string} Hex color
     */
    getTierColor(tier) {
        return this.getTierConfig(tier).color;
    },

    /**
     * Get rarity from tier
     * @param {number} tier - Tier number
     * @returns {string} Rarity name
     */
    getRarity(tier) {
        return this.getTierConfig(tier).rarity;
    },

    /**
     * Get tier from rarity
     * @param {string} rarity - Rarity name
     * @returns {number} Minimum tier for rarity
     */
    getTierFromRarity(rarity) {
        const rarityTiers = {
            common: 0,
            uncommon: 2,
            rare: 4,
            epic: 6,
            legendary: 8
        };
        return rarityTiers[rarity] || 0;
    },

    // ============================================
    // ITEM ENRICHMENT
    // ============================================

    /**
     * Enrich a raw item with calculated properties
     * @param {Object} item - Raw item from API
     * @param {Object} context - Additional context (inventory, events)
     * @returns {Object} Enriched item
     */
    enrichItem(item, context = {}) {
        if (!item || !item.id) return null;

        // Check cache
        const cacheKey = `${item.id}-${context.eventId || ''}`;
        if (this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            // Update dynamic properties
            cached.owned = context.inventory?.some(i => i.id === item.id) || false;
            cached.favorited = context.favorites?.includes(item.id) || false;
            return cached;
        }

        const tier = item.tier ?? 0;
        const tierConfig = this.getTierConfig(tier);

        // Calculate availability
        const availability = this.checkAvailability(item, context);

        // Calculate prices
        const prices = this.getPrices(item);

        // Calculate urgency for limited items
        const urgency = this.calculateUrgency(item);

        const enriched = {
            // Original properties
            ...item,

            // Tier properties
            tier,
            tierName: tierConfig.name,
            tierColor: tierConfig.color,
            rarity: item.rarity || tierConfig.rarity,

            // Pricing
            burnPrice: prices.burn,
            ingamePrice: prices.ingame,
            originalPrice: prices.original,
            discount: prices.discount,
            acceptsBurn: item.currency_modes?.includes('burn') ?? true,
            acceptsIngame: item.currency_modes?.includes('ingame') ?? true,

            // Availability
            available: availability.available,
            reasons: availability.reasons,
            urgency,

            // Ownership
            owned: context.inventory?.some(i => i.id === item.id) || false,
            favorited: context.favorites?.includes(item.id) || false,

            // Display helpers
            displayPrice: this.formatPrice(prices.burn),
            layerDisplay: this.capitalizeFirst(item.layer),

            // Particles for high tier items
            hasParticles: tier >= 5,
            particleType: tier >= 8 ? 'legendary' : tier >= 6 ? 'epic' : tier >= 5 ? 'rare' : null
        };

        // Cache enriched item
        this._cache.set(cacheKey, enriched);

        return enriched;
    },

    /**
     * Enrich entire catalog
     * @param {Array} items - Raw items from API
     * @param {Object} context - Context with inventory, favorites, events
     * @returns {Array} Enriched items
     */
    enrichCatalog(items, context = {}) {
        if (!Array.isArray(items)) return [];
        return items.map(item => this.enrichItem(item, context)).filter(Boolean);
    },

    /**
     * Check item availability
     * @param {Object} item - Item to check
     * @param {Object} context - Context
     * @returns {Object} { available: boolean, reasons: string[] }
     */
    checkAvailability(item, context = {}) {
        const reasons = [];
        const now = new Date();

        // Check time window
        if (item.available_from && new Date(item.available_from) > now) {
            reasons.push('Not yet available');
        }
        if (item.available_until && new Date(item.available_until) < now) {
            reasons.push('No longer available');
        }

        // Check quantity
        if (item.is_limited && item.quantity_limit) {
            const remaining = item.quantity_limit - (item.quantity_sold || 0);
            if (remaining <= 0) {
                reasons.push('Sold out');
            }
        }

        // Check tier requirement
        if (item.required_tier && context.userTier !== undefined) {
            if (context.userTier < item.required_tier) {
                reasons.push(`Requires ${this.getTierName(item.required_tier)} tier`);
            }
        }

        // Check if already owned
        if (context.inventory?.some(i => i.id === item.id)) {
            reasons.push('Already owned');
        }

        return {
            available: reasons.length === 0,
            reasons
        };
    },

    /**
     * Calculate urgency level for limited items
     * @param {Object} item - Item to check
     * @returns {string|null} 'high', 'medium', 'low', or null
     */
    calculateUrgency(item) {
        if (!item.is_limited) return null;

        // Check quantity urgency
        if (item.quantity_limit) {
            const remaining = item.quantity_limit - (item.quantity_sold || 0);
            const percentRemaining = remaining / item.quantity_limit;

            if (percentRemaining <= 0.1) return 'high';
            if (percentRemaining <= 0.3) return 'medium';
            if (percentRemaining <= 0.5) return 'low';
        }

        // Check time urgency
        if (item.available_until) {
            const now = new Date();
            const end = new Date(item.available_until);
            const hoursRemaining = (end - now) / (1000 * 60 * 60);

            if (hoursRemaining <= 24) return 'high';
            if (hoursRemaining <= 72) return 'medium';
            if (hoursRemaining <= 168) return 'low'; // 1 week
        }

        return null;
    },

    // ============================================
    // SORTING & FILTERING
    // ============================================

    /**
     * Sort items by various criteria
     * @param {Array} items - Items to sort
     * @param {string} sortBy - Sort criterion
     * @param {boolean} ascending - Sort direction
     * @returns {Array} Sorted items
     */
    sortItems(items, sortBy = 'tier', ascending = false) {
        const sortFunctions = {
            tier: (a, b) => (b.tier || 0) - (a.tier || 0),
            price: (a, b) => (b.burnPrice || 0) - (a.burnPrice || 0),
            name: (a, b) => (a.name || '').localeCompare(b.name || ''),
            layer: (a, b) => (a.layer || '').localeCompare(b.layer || ''),
            newest: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
            urgency: (a, b) => {
                const urgencyOrder = { high: 3, medium: 2, low: 1, null: 0 };
                return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
            }
        };

        const sortFn = sortFunctions[sortBy] || sortFunctions.tier;
        const sorted = [...items].sort(sortFn);

        return ascending ? sorted.reverse() : sorted;
    },

    /**
     * Group items by a property
     * @param {Array} items - Items to group
     * @param {string} groupBy - Property to group by
     * @returns {Object} Grouped items
     */
    groupItems(items, groupBy = 'layer') {
        const groups = {};
        items.forEach(item => {
            const key = item[groupBy] || 'other';
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });
        return groups;
    },

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Format price for display
     * @param {number} price - Price to format
     * @returns {string} Formatted price
     */
    formatPrice(price) {
        if (price >= 1000000) {
            return (price / 1000000).toFixed(1) + 'M';
        }
        if (price >= 1000) {
            return (price / 1000).toFixed(1) + 'K';
        }
        return price.toLocaleString();
    },

    /**
     * Capitalize first letter
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Clear the cache
     */
    clearCache() {
        this._cache.clear();
    },

    /**
     * Get layer order for sorting
     * @param {string} layer - Layer name
     * @returns {number} Order index
     */
    getLayerOrder(layer) {
        const order = {
            background: 0,
            aura: 1,
            skin: 2,
            outfit: 3,
            eyes: 4,
            head: 5,
            held: 6
        };
        return order[layer] ?? 99;
    },

    /**
     * Get random rarity based on weights
     * @returns {string} Random rarity
     */
    getRandomRarity() {
        const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
            random -= weight;
            if (random <= 0) {
                return rarity;
            }
        }

        return 'common';
    }
};

// Export constants for external use
ShopCatalog.FIBONACCI = FIBONACCI;
ShopCatalog.LAYER_BASE_PRICES = LAYER_BASE_PRICES;
ShopCatalog.TIER_CONFIG = TIER_CONFIG;
ShopCatalog.RARITY_WEIGHTS = RARITY_WEIGHTS;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopCatalog, FIBONACCI, LAYER_BASE_PRICES, TIER_CONFIG };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopCatalog = ShopCatalog;
}
