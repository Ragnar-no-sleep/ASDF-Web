/**
 * ASDF Shop V2 - Backend Sync
 *
 * Handles API communication and state synchronization
 *
 * @version 2.0.1
 * @security CSRF protection, URL validation
 */

'use strict';

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Validate API URL to prevent hijacking
 * Only allows relative URLs or URLs from same origin
 * @param {string} url - URL to validate
 * @returns {string} Validated URL or default
 */
function validateApiUrl(url) {
    if (!url || typeof url !== 'string') return '/api';

    // Allow relative paths
    if (url.startsWith('/') && !url.startsWith('//')) {
        return url;
    }

    // Allow same origin only
    try {
        const parsedUrl = new URL(url, window.location.origin);
        if (parsedUrl.origin === window.location.origin) {
            return parsedUrl.pathname;
        }
    } catch (e) {
        console.warn('[ShopSync] Invalid API URL:', url);
    }

    return '/api';
}

// ============================================
// API CONFIGURATION
// ============================================

const API_BASE = validateApiUrl(window.ASDF_API_URL || '/api');
const API_V2 = `${API_BASE}/v2`;

// ============================================
// SYNC MANAGER
// ============================================

const ShopSync = {
    // Cache for API responses
    _cache: new Map(),
    _cacheExpiry: 60 * 1000, // 1 minute

    // CSRF token
    _csrfToken: null,

    // ============================================
    // CSRF TOKEN MANAGEMENT
    // ============================================

    /**
     * Get CSRF token from meta tag or fetch from server
     * @returns {string|null} CSRF token
     */
    getCsrfToken() {
        // Try to get from meta tag first
        if (!this._csrfToken) {
            const meta = document.querySelector('meta[name="csrf-token"]');
            if (meta) {
                this._csrfToken = meta.getAttribute('content');
            }
        }

        // Try to get from cookie (Django-style double submit)
        if (!this._csrfToken) {
            const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
            if (match) {
                this._csrfToken = decodeURIComponent(match[1]);
            }
        }

        return this._csrfToken;
    },

    /**
     * Refresh CSRF token from server
     */
    async refreshCsrfToken() {
        try {
            const response = await fetch(`${API_V2}/csrf-token`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                this._csrfToken = data.token;
            }
        } catch (e) {
            console.warn('[ShopSync] Failed to refresh CSRF token:', e);
        }
    },

    // ============================================
    // HTTP HELPERS
    // ============================================

    /**
     * Make authenticated API request with CSRF protection
     */
    async fetch(endpoint, options = {}) {
        // Validate endpoint - only allow relative paths
        let url;
        if (endpoint.startsWith('http')) {
            // Validate external URLs
            try {
                const parsedUrl = new URL(endpoint);
                if (parsedUrl.origin !== window.location.origin) {
                    throw new Error('Cross-origin requests not allowed');
                }
                url = endpoint;
            } catch (e) {
                throw new Error('Invalid endpoint URL');
            }
        } else {
            url = `${API_V2}${endpoint}`;
        }

        // Build headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add CSRF token for state-changing methods
        const method = (options.method || 'GET').toUpperCase();
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const csrfToken = this.getCsrfToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
        }

        const response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers
        });

        if (!response.ok) {
            // Handle CSRF token expiry
            if (response.status === 403) {
                await this.refreshCsrfToken();
            }
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return response.json();
    },

    /**
     * Cached GET request
     */
    async cachedGet(endpoint, ttl = this._cacheExpiry) {
        const cacheKey = endpoint;
        const cached = this._cache.get(cacheKey);

        if (cached && Date.now() < cached.expiry) {
            return cached.data;
        }

        const data = await this.fetch(endpoint);
        this._cache.set(cacheKey, { data, expiry: Date.now() + ttl });
        return data;
    },

    /**
     * Invalidate cache for endpoint
     */
    invalidateCache(endpoint) {
        if (endpoint) {
            this._cache.delete(endpoint);
        } else {
            this._cache.clear();
        }
    },

    // ============================================
    // CATALOG
    // ============================================

    /**
     * Fetch catalog from API
     */
    async fetchCatalog(filters = {}) {
        const params = new URLSearchParams();
        if (filters.layer) params.set('layer', filters.layer);
        if (filters.tier !== undefined) params.set('tier', filters.tier);
        if (filters.rarity) params.set('rarity', filters.rarity);
        if (filters.collection_id) params.set('collection_id', filters.collection_id);

        const query = params.toString();
        const endpoint = `/shop/catalog${query ? `?${query}` : ''}`;

        const result = await this.fetch(endpoint);
        return result.items || [];
    },

    /**
     * Fetch single item
     */
    async fetchItem(itemId) {
        const result = await this.fetch(`/shop/item/${itemId}`);
        return result.item;
    },

    // ============================================
    // INVENTORY
    // ============================================

    /**
     * Fetch user inventory
     */
    async fetchInventory() {
        const result = await this.fetch('/shop/inventory');
        return {
            inventory: result.inventory || [],
            equipped: result.equipped || {}
        };
    },

    // ============================================
    // FAVORITES
    // ============================================

    /**
     * Fetch user favorites
     */
    async fetchFavorites() {
        const result = await this.fetch('/shop/favorites');
        return result.favorites || [];
    },

    /**
     * Toggle favorite on server
     */
    async toggleFavorite(itemId) {
        const result = await this.fetch(`/shop/favorites/${itemId}`, {
            method: 'POST'
        });
        this.invalidateCache('/shop/favorites');
        return result;
    },

    /**
     * Remove favorite
     */
    async removeFavorite(itemId) {
        const result = await this.fetch(`/shop/favorites/${itemId}`, {
            method: 'DELETE'
        });
        this.invalidateCache('/shop/favorites');
        return result;
    },

    // ============================================
    // COLLECTIONS
    // ============================================

    /**
     * Fetch collections
     */
    async fetchCollections() {
        const result = await this.cachedGet('/shop/collections', 2 * 60 * 1000);
        return result.collections || [];
    },

    // ============================================
    // EVENTS
    // ============================================

    /**
     * Fetch active events
     */
    async fetchEvents() {
        const result = await this.cachedGet('/shop/events');
        return result.events || [];
    },

    // ============================================
    // EQUIPMENT
    // ============================================

    /**
     * Equip item on server
     */
    async equipItem(itemId) {
        const result = await this.fetch('/shop/equip', {
            method: 'POST',
            body: JSON.stringify({ itemId })
        });
        this.invalidateCache('/shop/inventory');
        return result;
    },

    /**
     * Unequip layer on server
     */
    async unequipLayer(layer) {
        const result = await this.fetch('/shop/unequip', {
            method: 'POST',
            body: JSON.stringify({ layer })
        });
        this.invalidateCache('/shop/inventory');
        return result;
    },

    // ============================================
    // PURCHASE
    // ============================================

    /**
     * Initiate purchase
     */
    async initiatePurchase(itemId, currency = 'burn') {
        const result = await this.fetch('/shop/purchase/initiate', {
            method: 'POST',
            body: JSON.stringify({ itemId, currency })
        });
        return result;
    },

    /**
     * Confirm purchase
     */
    async confirmPurchase(purchaseId, signature = null) {
        const result = await this.fetch('/shop/purchase/confirm', {
            method: 'POST',
            body: JSON.stringify({ purchaseId, signature })
        });
        this.invalidateCache('/shop/inventory');
        this.invalidateCache('/shop/catalog');
        return result;
    },

    // ============================================
    // CURRENCY
    // ============================================

    /**
     * Fetch currency balance
     */
    async fetchCurrencyBalance() {
        const result = await this.fetch('/currency/balance');
        return result;
    },

    /**
     * Earn currency (from game wins, etc.)
     */
    async earnCurrency(amount, source, sourceId = null) {
        const result = await this.fetch('/currency/earn', {
            method: 'POST',
            body: JSON.stringify({ amount, source, sourceId })
        });
        return result;
    },

    // ============================================
    // FULL SYNC
    // ============================================

    /**
     * Sync all shop data
     */
    async syncAll(state) {
        if (state.isSyncing) return;

        state.isSyncing = true;
        state.setLoading(true);

        try {
            // Fetch all data in parallel
            const [catalog, inventoryData, favorites, collections, events] = await Promise.all([
                this.fetchCatalog(),
                this.fetchInventory().catch(() => ({ inventory: [], equipped: {} })),
                this.fetchFavorites().catch(() => []),
                this.fetchCollections().catch(() => []),
                this.fetchEvents().catch(() => [])
            ]);

            // Update state
            state.setCatalog(catalog);
            state.setInventory(inventoryData.inventory);
            state.setEquipped(inventoryData.equipped);
            state.setFavorites(favorites.map(f => f.id));
            state.setCollections(collections);
            state.setEvents(events);

            // Try to get currency balance
            try {
                const currency = await this.fetchCurrencyBalance();
                state.updateIngameCurrency(currency.balance || 0);
            } catch (e) {
                // Currency might not be available for unauthenticated users
            }

            state.lastSync = Date.now();
            state.saveToLocal();
            state.emit('sync-complete');

            console.log('[ShopSync] Full sync complete');

        } catch (error) {
            console.error('[ShopSync] Sync failed:', error);
            state.setError(error.message);
            state.emit('sync-error', error);

        } finally {
            state.isSyncing = false;
            state.setLoading(false);
        }
    },

    /**
     * Sync inventory only
     */
    async syncInventory(state) {
        try {
            const { inventory, equipped } = await this.fetchInventory();
            state.setInventory(inventory);
            state.setEquipped(equipped);
            state.saveToLocal();
        } catch (error) {
            console.error('[ShopSync] Inventory sync failed:', error);
        }
    },

    /**
     * Sync favorites only
     */
    async syncFavorites(state) {
        try {
            const favorites = await this.fetchFavorites();
            state.setFavorites(favorites.map(f => f.id));
        } catch (error) {
            console.error('[ShopSync] Favorites sync failed:', error);
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopSync };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopSync = ShopSync;
}
