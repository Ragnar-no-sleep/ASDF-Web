/**
 * ASDF Shop V2 - State Management
 *
 * Central state manager with event system and localStorage sync
 *
 * @version 2.0.1
 * @security Data validation for localStorage
 */

'use strict';

// Storage keys (V2 - renamed to avoid conflict with shop.js)
const SHOP_STORAGE_KEY_V2 = 'asdf_shop_v2';
const FAVORITES_STORAGE_KEY_V2 = 'asdf_shop_favorites_v2';

// ============================================
// DATA VALIDATION UTILITIES
// ============================================

/**
 * Valid layer names for equipped items
 */
const VALID_LAYERS = ['background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held'];

/**
 * Validate item ID format
 * @param {*} id - ID to validate
 * @returns {boolean}
 */
function isValidItemId(id) {
    if (typeof id !== 'string') return false;
    // Item IDs should be alphanumeric with underscores, max 100 chars
    return /^[a-zA-Z0-9_-]{1,100}$/.test(id);
}

/**
 * Validate equipped object structure
 * @param {*} equipped - Object to validate
 * @returns {Object} Validated equipped object
 */
function validateEquipped(equipped) {
    const defaultEquipped = {
        background: null,
        aura: null,
        skin: 'skin_default',
        outfit: null,
        eyes: null,
        head: null,
        held: null
    };

    if (!equipped || typeof equipped !== 'object') {
        return defaultEquipped;
    }

    const validated = { ...defaultEquipped };

    for (const layer of VALID_LAYERS) {
        const value = equipped[layer];
        if (value === null || value === undefined) {
            validated[layer] = layer === 'skin' ? 'skin_default' : null;
        } else if (isValidItemId(value)) {
            validated[layer] = value;
        } else {
            validated[layer] = layer === 'skin' ? 'skin_default' : null;
            console.warn(`[ShopState] Invalid item ID for layer ${layer}:`, value);
        }
    }

    return validated;
}

/**
 * Validate favorites array
 * @param {*} favorites - Array to validate
 * @returns {Array} Validated favorites array
 */
function validateFavorites(favorites) {
    if (!Array.isArray(favorites)) {
        return [];
    }

    return favorites.filter(id => {
        if (isValidItemId(id)) {
            return true;
        }
        console.warn('[ShopState] Invalid favorite ID:', id);
        return false;
    }).slice(0, 500); // Limit to 500 favorites
}

/**
 * Validate timestamp
 * @param {*} timestamp - Timestamp to validate
 * @returns {number|null}
 */
function validateTimestamp(timestamp) {
    const num = Number(timestamp);
    if (!Number.isFinite(num)) return null;
    // Must be within reasonable range (year 2020 to 2100)
    if (num < 1577836800000 || num > 4102444800000) return null;
    return num;
}

// ============================================
// STATE DEFINITION
// ============================================

const ShopStateV2 = {
    // Catalog data (from API)
    catalog: [],
    collections: [],
    events: [],

    // User state
    inventory: [],
    equipped: {
        background: null,
        aura: null,
        skin: 'skin_default',
        outfit: null,
        eyes: null,
        head: null,
        held: null
    },
    favorites: [],
    currency: {
        burn: 0,
        ingame: 0
    },

    // UI state
    filters: {
        layer: null,
        rarity: null,
        priceMin: 0,
        priceMax: Infinity,
        owned: null, // true, false, or null (all)
        search: '',
        collection: null
    },
    activeTab: 'all', // all, inventory, collections, favorites
    selectedItem: null,
    previewEquipped: null, // Temporary preview state
    isLoading: false,
    error: null,

    // Sync state
    lastSync: null,
    isSyncing: false,

    // Event listeners
    _listeners: new Map(),

    // ============================================
    // EVENT SYSTEM
    // ============================================

    /**
     * Subscribe to state changes
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            this._listeners.get(event)?.delete(callback);
        };
    },

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data = null) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`[ShopState] Error in ${event} listener:`, err);
                }
            });
        }

        // Also emit to window for external listeners
        window.dispatchEvent(new CustomEvent(`shop:${event}`, { detail: data }));
    },

    // ============================================
    // CATALOG METHODS
    // ============================================

    /**
     * Set catalog items
     */
    setCatalog(items) {
        this.catalog = items || [];
        this.emit('catalog-updated', this.catalog);
    },

    /**
     * Get filtered catalog
     */
    getFilteredCatalog() {
        let items = [...this.catalog];

        // Apply filters
        if (this.filters.layer) {
            items = items.filter(i => i.layer === this.filters.layer);
        }

        if (this.filters.rarity) {
            items = items.filter(i => i.rarity === this.filters.rarity);
        }

        if (this.filters.priceMin > 0) {
            items = items.filter(i => i.burnPrice >= this.filters.priceMin);
        }

        if (this.filters.priceMax < Infinity) {
            items = items.filter(i => i.burnPrice <= this.filters.priceMax);
        }

        if (this.filters.owned === true) {
            items = items.filter(i => i.owned);
        } else if (this.filters.owned === false) {
            items = items.filter(i => !i.owned);
        }

        if (this.filters.collection) {
            items = items.filter(i => i.collection_id === this.filters.collection);
        }

        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            items = items.filter(i =>
                i.name.toLowerCase().includes(search) ||
                i.layer.toLowerCase().includes(search)
            );
        }

        return items;
    },

    /**
     * Get items for current tab
     */
    getTabItems() {
        switch (this.activeTab) {
            case 'inventory':
                return this.inventory;
            case 'favorites':
                return this.favorites.map(id => this.catalog.find(i => i.id === id)).filter(Boolean);
            case 'collections':
                return this.getFilteredCatalog().filter(i => i.collection_id);
            default:
                return this.getFilteredCatalog();
        }
    },

    // ============================================
    // FILTER METHODS
    // ============================================

    /**
     * Update filters
     */
    updateFilters(newFilters) {
        this.filters = { ...this.filters, ...newFilters };
        this.emit('filters-updated', this.filters);
    },

    /**
     * Reset filters
     */
    resetFilters() {
        this.filters = {
            layer: null,
            rarity: null,
            priceMin: 0,
            priceMax: Infinity,
            owned: null,
            search: '',
            collection: null
        };
        this.emit('filters-updated', this.filters);
    },

    /**
     * Set active tab
     */
    setActiveTab(tab) {
        this.activeTab = tab;
        this.emit('tab-changed', tab);
    },

    // ============================================
    // SELECTION & PREVIEW
    // ============================================

    /**
     * Select an item for viewing
     */
    selectItem(itemId) {
        this.selectedItem = this.catalog.find(i => i.id === itemId) || null;
        this.emit('item-selected', this.selectedItem);
    },

    /**
     * Preview item (try on)
     */
    previewItem(itemId) {
        const item = this.catalog.find(i => i.id === itemId);
        if (!item) return;

        // Create preview equipped state
        this.previewEquipped = { ...this.equipped };
        this.previewEquipped[item.layer] = itemId;
        this.emit('preview-updated', this.previewEquipped);
    },

    /**
     * Reset preview
     */
    resetPreview() {
        this.previewEquipped = null;
        this.emit('preview-updated', null);
    },

    /**
     * Get current equipped (or preview if active)
     */
    getCurrentEquipped() {
        return this.previewEquipped || this.equipped;
    },

    // ============================================
    // INVENTORY & EQUIPMENT
    // ============================================

    /**
     * Set inventory
     */
    setInventory(items) {
        this.inventory = items || [];
        this.emit('inventory-updated', this.inventory);
    },

    /**
     * Set equipped items (with validation)
     */
    setEquipped(equipped) {
        this.equipped = validateEquipped(equipped);
        this.emit('equipped-updated', this.equipped);
    },

    /**
     * Equip an item locally (with validation)
     */
    equipItemLocal(itemId, layer) {
        // Validate layer
        if (!VALID_LAYERS.includes(layer)) {
            console.warn('[ShopState] Invalid layer:', layer);
            return false;
        }

        // Validate itemId
        if (!isValidItemId(itemId)) {
            console.warn('[ShopState] Invalid item ID:', itemId);
            return false;
        }

        this.equipped[layer] = itemId;
        this.emit('equipped-updated', this.equipped);
        this.saveToLocal();
        return true;
    },

    /**
     * Unequip a layer locally (with validation)
     */
    unequipLayerLocal(layer) {
        // Validate layer
        if (!VALID_LAYERS.includes(layer)) {
            console.warn('[ShopState] Invalid layer:', layer);
            return false;
        }

        if (layer === 'skin') {
            this.equipped.skin = 'skin_default';
        } else {
            this.equipped[layer] = null;
        }
        this.emit('equipped-updated', this.equipped);
        this.saveToLocal();
        return true;
    },

    /**
     * Check if item is owned
     */
    ownsItem(itemId) {
        return this.inventory.some(i => i.id === itemId) || itemId === 'skin_default';
    },

    /**
     * Check if item is equipped
     */
    isEquipped(itemId) {
        return Object.values(this.equipped).includes(itemId);
    },

    // ============================================
    // FAVORITES
    // ============================================

    /**
     * Set favorites (with validation)
     */
    setFavorites(favorites) {
        this.favorites = validateFavorites(favorites);
        this.saveFavoritesToLocal();
        this.emit('favorites-updated', this.favorites);
    },

    /**
     * Toggle favorite locally (with validation)
     */
    toggleFavoriteLocal(itemId) {
        // Validate itemId
        if (!isValidItemId(itemId)) {
            console.warn('[ShopState] Invalid item ID for favorite:', itemId);
            return false;
        }

        const index = this.favorites.indexOf(itemId);
        if (index >= 0) {
            this.favorites.splice(index, 1);
        } else {
            // Limit to 500 favorites
            if (this.favorites.length >= 500) {
                console.warn('[ShopState] Maximum favorites reached');
                return false;
            }
            this.favorites.push(itemId);
        }
        this.saveFavoritesToLocal();
        this.emit('favorites-updated', this.favorites);
        return index < 0; // Returns true if now favorited
    },

    /**
     * Check if item is favorited
     */
    isFavorited(itemId) {
        return this.favorites.includes(itemId);
    },

    // ============================================
    // CURRENCY
    // ============================================

    /**
     * Set currency balances
     */
    setCurrency(burnBalance, ingameBalance) {
        this.currency.burn = burnBalance || 0;
        this.currency.ingame = ingameBalance || 0;
        this.emit('currency-updated', this.currency);
    },

    /**
     * Update in-game currency
     */
    updateIngameCurrency(amount) {
        this.currency.ingame = amount;
        this.emit('currency-updated', this.currency);
    },

    // ============================================
    // COLLECTIONS & EVENTS
    // ============================================

    /**
     * Set collections
     */
    setCollections(collections) {
        this.collections = collections || [];
        this.emit('collections-updated', this.collections);
    },

    /**
     * Set events
     */
    setEvents(events) {
        this.events = events || [];
        this.emit('events-updated', this.events);
    },

    // ============================================
    // LOADING STATE
    // ============================================

    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.emit('loading-changed', isLoading);
    },

    /**
     * Set error
     */
    setError(error) {
        this.error = error;
        this.emit('error', error);
    },

    // ============================================
    // PERSISTENCE
    // ============================================

    /**
     * Save state to localStorage
     */
    saveToLocal() {
        try {
            const data = {
                equipped: this.equipped,
                favorites: this.favorites,
                lastSync: this.lastSync
            };
            localStorage.setItem(SHOP_STORAGE_KEY_V2, JSON.stringify(data));
        } catch (e) {
            console.warn('[ShopState] Failed to save to localStorage:', e);
        }
    },

    /**
     * Save favorites to localStorage
     */
    saveFavoritesToLocal() {
        try {
            localStorage.setItem(FAVORITES_STORAGE_KEY_V2, JSON.stringify(this.favorites));
        } catch (e) {
            console.warn('[ShopState] Failed to save favorites:', e);
        }
    },

    /**
     * Load state from localStorage with validation
     */
    loadFromLocal() {
        try {
            // Load main state
            const saved = localStorage.getItem(SHOP_STORAGE_KEY_V2);
            if (saved) {
                let data;
                try {
                    data = JSON.parse(saved);
                } catch (parseError) {
                    console.warn('[ShopState] Corrupted localStorage data, resetting');
                    localStorage.removeItem(SHOP_STORAGE_KEY_V2);
                    return;
                }

                if (data && typeof data === 'object') {
                    // Validate and apply equipped
                    if (data.equipped) {
                        this.equipped = validateEquipped(data.equipped);
                    }
                    // Validate and apply lastSync
                    if (data.lastSync) {
                        this.lastSync = validateTimestamp(data.lastSync);
                    }
                }
            }

            // Load favorites with validation
            const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY_V2);
            if (savedFavorites) {
                let favoritesData;
                try {
                    favoritesData = JSON.parse(savedFavorites);
                } catch (parseError) {
                    console.warn('[ShopState] Corrupted favorites data, resetting');
                    localStorage.removeItem(FAVORITES_STORAGE_KEY_V2);
                    return;
                }

                this.favorites = validateFavorites(favoritesData);
            }

            console.log('[ShopState] Loaded from localStorage (validated)');
        } catch (e) {
            console.warn('[ShopState] Failed to load from localStorage:', e);
        }
    },

    /**
     * Clear local storage
     */
    clearLocal() {
        localStorage.removeItem(SHOP_STORAGE_KEY_V2);
        localStorage.removeItem(FAVORITES_STORAGE_KEY_V2);
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize state
     */
    init() {
        this.loadFromLocal();
        console.log('[ShopState] Initialized');
        this.emit('initialized');
    },

    /**
     * Reset state
     */
    reset() {
        this.catalog = [];
        this.collections = [];
        this.events = [];
        this.inventory = [];
        this.equipped = {
            background: null,
            aura: null,
            skin: 'skin_default',
            outfit: null,
            eyes: null,
            head: null,
            held: null
        };
        this.favorites = [];
        this.currency = { burn: 0, ingame: 0 };
        this.filters = {
            layer: null,
            rarity: null,
            priceMin: 0,
            priceMax: Infinity,
            owned: null,
            search: '',
            collection: null
        };
        this.activeTab = 'all';
        this.selectedItem = null;
        this.previewEquipped = null;
        this.isLoading = false;
        this.error = null;
        this.lastSync = null;
        this.clearLocal();
        this.emit('reset');
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopStateV2 };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopStateV2 = ShopStateV2;
}
