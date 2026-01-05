/**
 * ASDF Shop V2 - Favorites Management
 *
 * Handles favorite items with localStorage + API sync
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// FAVORITES MANAGER
// ============================================

const ShopFavorites = {
    // Storage key
    STORAGE_KEY: 'asdf_shop_favorites',

    // ============================================
    // LOCAL STORAGE
    // ============================================

    /**
     * Get favorites from localStorage
     * @returns {string[]} Array of item IDs
     */
    getLocal() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('[ShopFavorites] Failed to read localStorage:', e);
            return [];
        }
    },

    /**
     * Save favorites to localStorage
     * @param {string[]} favorites - Array of item IDs
     */
    saveLocal(favorites) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
        } catch (e) {
            console.error('[ShopFavorites] Failed to save to localStorage:', e);
        }
    },

    /**
     * Add favorite locally
     * @param {string} itemId - Item ID
     * @returns {string[]} Updated favorites
     */
    addLocal(itemId) {
        const favorites = this.getLocal();
        if (!favorites.includes(itemId)) {
            favorites.push(itemId);
            this.saveLocal(favorites);
        }
        return favorites;
    },

    /**
     * Remove favorite locally
     * @param {string} itemId - Item ID
     * @returns {string[]} Updated favorites
     */
    removeLocal(itemId) {
        let favorites = this.getLocal();
        favorites = favorites.filter(id => id !== itemId);
        this.saveLocal(favorites);
        return favorites;
    },

    /**
     * Toggle favorite locally
     * @param {string} itemId - Item ID
     * @returns {{ favorites: string[], added: boolean }}
     */
    toggleLocal(itemId) {
        const favorites = this.getLocal();
        const index = favorites.indexOf(itemId);

        if (index === -1) {
            favorites.push(itemId);
            this.saveLocal(favorites);
            return { favorites, added: true };
        } else {
            favorites.splice(index, 1);
            this.saveLocal(favorites);
            return { favorites, added: false };
        }
    },

    /**
     * Check if item is favorited
     * @param {string} itemId - Item ID
     * @returns {boolean}
     */
    isFavorite(itemId) {
        return this.getLocal().includes(itemId);
    },

    // ============================================
    // API SYNC
    // ============================================

    /**
     * Sync favorites with server
     * @param {Object} state - Shop state
     */
    async syncWithServer(state) {
        if (!window.ShopSync) {
            console.warn('[ShopFavorites] ShopSync not available');
            return;
        }

        try {
            // Fetch server favorites
            const serverFavorites = await window.ShopSync.fetchFavorites();
            const serverIds = serverFavorites.map(f => f.id || f.item_id || f);

            // Get local favorites
            const localFavorites = this.getLocal();

            // Merge: union of both
            const merged = [...new Set([...serverIds, ...localFavorites])];

            // Save merged locally
            this.saveLocal(merged);

            // Update state if provided
            if (state) {
                state.setFavorites(merged);
            }

            // Push local-only favorites to server
            const localOnly = localFavorites.filter(id => !serverIds.includes(id));
            for (const itemId of localOnly) {
                try {
                    await window.ShopSync.toggleFavorite(itemId);
                } catch (e) {
                    console.warn(`[ShopFavorites] Failed to sync ${itemId} to server`);
                }
            }

            console.log('[ShopFavorites] Synced with server:', merged.length, 'favorites');
            return merged;

        } catch (error) {
            console.error('[ShopFavorites] Sync failed:', error);
            // Return local favorites as fallback
            return this.getLocal();
        }
    },

    /**
     * Toggle favorite with optimistic update
     * @param {string} itemId - Item ID
     * @param {Object} state - Shop state
     */
    async toggle(itemId, state) {
        // Optimistic local update
        const { favorites, added } = this.toggleLocal(itemId);

        // Update state immediately
        if (state) {
            state.setFavorites(favorites);
            state.emit('favorite-toggled', { itemId, added });
        }

        // Sync with server in background
        if (window.ShopSync) {
            try {
                await window.ShopSync.toggleFavorite(itemId);
            } catch (error) {
                // Revert on error
                console.error('[ShopFavorites] Server toggle failed, reverting:', error);
                this.toggleLocal(itemId); // Revert
                if (state) {
                    state.setFavorites(this.getLocal());
                    state.emit('favorite-toggle-failed', { itemId, error });
                }
            }
        }

        return { favorites: this.getLocal(), added };
    },

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Get favorite items from catalog
     * @param {Array} catalog - Shop catalog
     * @returns {Array} Favorite items
     */
    getFavoriteItems(catalog) {
        const favoriteIds = this.getLocal();
        return catalog.filter(item => favoriteIds.includes(item.id));
    },

    /**
     * Clear all favorites
     */
    clearAll() {
        this.saveLocal([]);
    },

    /**
     * Export favorites (for backup)
     * @returns {Object} Export data
     */
    export() {
        return {
            favorites: this.getLocal(),
            exportedAt: new Date().toISOString()
        };
    },

    /**
     * Import favorites (from backup)
     * @param {Object} data - Import data
     */
    import(data) {
        if (data && Array.isArray(data.favorites)) {
            const current = this.getLocal();
            const merged = [...new Set([...current, ...data.favorites])];
            this.saveLocal(merged);
            return merged;
        }
        return this.getLocal();
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopFavorites };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopFavorites = ShopFavorites;
}
