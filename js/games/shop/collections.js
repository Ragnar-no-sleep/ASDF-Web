/**
 * ASDF Shop V2 - Collections Module
 *
 * Tracks collection progress and unlocks collection bonuses
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// COLLECTIONS MANAGER
// ============================================

const ShopCollections = {
    // Collection definitions (can be overridden by API data)
    definitions: new Map(),

    // User's collection progress
    progress: new Map(),

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize collections from API data
     * @param {Array} collections - Collection data from API
     * @param {Array} inventory - User's inventory items
     */
    init(collections, inventory = []) {
        this.definitions.clear();
        this.progress.clear();

        // Load collection definitions
        if (Array.isArray(collections)) {
            collections.forEach(col => {
                this.definitions.set(col.id, {
                    id: col.id,
                    name: col.name,
                    description: col.description || '',
                    icon: col.icon || '📦',
                    itemIds: col.item_ids || [],
                    requiredPieces: col.required_pieces || col.item_ids?.length || 0,
                    bonus: col.unlock_bonus || null,
                    isActive: col.is_active !== false
                });
            });
        }

        // Calculate progress from inventory
        this.calculateProgress(inventory);

        console.log(`[ShopCollections] Initialized with ${this.definitions.size} collections`);
    },

    /**
     * Calculate collection progress from inventory
     * @param {Array} inventory - User's owned items
     */
    calculateProgress(inventory) {
        const ownedIds = new Set(inventory.map(item => item.id || item));

        this.definitions.forEach((collection, colId) => {
            const ownedInCollection = collection.itemIds.filter(id => ownedIds.has(id));
            const progress = {
                collectionId: colId,
                ownedCount: ownedInCollection.length,
                totalCount: collection.itemIds.length,
                ownedItems: ownedInCollection,
                missingItems: collection.itemIds.filter(id => !ownedIds.has(id)),
                isComplete: ownedInCollection.length >= collection.requiredPieces,
                percentage: collection.itemIds.length > 0
                    ? Math.round((ownedInCollection.length / collection.itemIds.length) * 100)
                    : 0
            };
            this.progress.set(colId, progress);
        });
    },

    // ============================================
    // QUERIES
    // ============================================

    /**
     * Get all collections with progress
     * @returns {Array} Collections with progress data
     */
    getAll() {
        const result = [];
        this.definitions.forEach((def, id) => {
            const progress = this.progress.get(id) || { ownedCount: 0, percentage: 0 };
            result.push({
                ...def,
                ...progress
            });
        });
        return result.sort((a, b) => b.percentage - a.percentage);
    },

    /**
     * Get a specific collection
     * @param {string} collectionId - Collection ID
     * @returns {Object|null} Collection with progress
     */
    get(collectionId) {
        const def = this.definitions.get(collectionId);
        if (!def) return null;

        const progress = this.progress.get(collectionId) || { ownedCount: 0, percentage: 0 };
        return { ...def, ...progress };
    },

    /**
     * Get collections that contain an item
     * @param {string} itemId - Item ID
     * @returns {Array} Collections containing the item
     */
    getForItem(itemId) {
        const collections = [];
        this.definitions.forEach((def, id) => {
            if (def.itemIds.includes(itemId)) {
                const progress = this.progress.get(id);
                collections.push({ ...def, ...progress });
            }
        });
        return collections;
    },

    /**
     * Get completed collections
     * @returns {Array} Completed collections
     */
    getCompleted() {
        return this.getAll().filter(c => c.isComplete);
    },

    /**
     * Get in-progress collections
     * @returns {Array} In-progress collections (has some items, not complete)
     */
    getInProgress() {
        return this.getAll().filter(c => c.ownedCount > 0 && !c.isComplete);
    },

    /**
     * Get collection items with owned status
     * @param {string} collectionId - Collection ID
     * @param {Array} catalog - Full item catalog
     * @returns {Array} Items in collection with owned status
     */
    getCollectionItems(collectionId, catalog) {
        const collection = this.get(collectionId);
        if (!collection) return [];

        const ownedSet = new Set(collection.ownedItems);

        return collection.itemIds
            .map(itemId => {
                const item = catalog.find(i => i.id === itemId);
                if (!item) return null;
                return {
                    ...item,
                    owned: ownedSet.has(itemId),
                    inCollection: collectionId
                };
            })
            .filter(Boolean);
    },

    // ============================================
    // BONUSES
    // ============================================

    /**
     * Get all active collection bonuses
     * @returns {Array} Active bonuses
     */
    getActiveBonuses() {
        const bonuses = [];
        this.getCompleted().forEach(collection => {
            if (collection.bonus) {
                bonuses.push({
                    collectionId: collection.id,
                    collectionName: collection.name,
                    ...collection.bonus
                });
            }
        });
        return bonuses;
    },

    /**
     * Check if a specific bonus is active
     * @param {string} bonusType - Bonus type to check
     * @returns {Object|null} Bonus if active
     */
    hasBonus(bonusType) {
        return this.getActiveBonuses().find(b => b.type === bonusType) || null;
    },

    /**
     * Calculate total bonus value for a type
     * @param {string} bonusType - Bonus type
     * @returns {number} Total bonus value
     */
    getTotalBonus(bonusType) {
        return this.getActiveBonuses()
            .filter(b => b.type === bonusType)
            .reduce((sum, b) => sum + (b.value || 0), 0);
    },

    // ============================================
    // UI HELPERS
    // ============================================

    /**
     * Render collection progress bar HTML
     * @param {string} collectionId - Collection ID
     * @returns {string} HTML string
     */
    renderProgressBar(collectionId) {
        const collection = this.get(collectionId);
        if (!collection) return '';

        const percentage = collection.percentage;
        const complete = collection.isComplete;

        return `
            <div class="collection-progress ${complete ? 'complete' : ''}">
                <div class="collection-progress-bar" style="width: ${percentage}%"></div>
                <span class="collection-progress-text">
                    ${collection.ownedCount}/${collection.totalCount}
                    ${complete ? '✓' : ''}
                </span>
            </div>
        `;
    },

    /**
     * Render collection card HTML
     * @param {string} collectionId - Collection ID
     * @returns {string} HTML string
     */
    renderCard(collectionId) {
        const collection = this.get(collectionId);
        if (!collection) return '';

        return `
            <div class="collection-card ${collection.isComplete ? 'complete' : ''}"
                 data-collection-id="${collection.id}">
                <div class="collection-icon">${collection.icon}</div>
                <div class="collection-info">
                    <h4 class="collection-name">${this.escapeHtml(collection.name)}</h4>
                    ${this.renderProgressBar(collectionId)}
                </div>
                ${collection.bonus ? `
                    <div class="collection-bonus ${collection.isComplete ? 'active' : ''}">
                        ${this.renderBonus(collection.bonus)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render bonus display
     * @param {Object} bonus - Bonus object
     * @returns {string} HTML string
     */
    renderBonus(bonus) {
        if (!bonus) return '';

        const icons = {
            discount: '💰',
            xp_boost: '⭐',
            exclusive_item: '🎁',
            title: '🏆',
            effect: '✨'
        };

        const icon = icons[bonus.type] || '🎁';
        return `<span class="bonus-icon">${icon}</span> ${this.escapeHtml(bonus.description || bonus.type)}`;
    },

    /**
     * Escape HTML for safe rendering
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    },

    // ============================================
    // EVENTS
    // ============================================

    /**
     * Handle item acquisition (update progress)
     * @param {string} itemId - Acquired item ID
     * @param {Object} shopState - Shop state reference
     */
    onItemAcquired(itemId, shopState) {
        // Recalculate progress
        this.calculateProgress(shopState.inventory);

        // Check for newly completed collections
        const collections = this.getForItem(itemId);
        collections.forEach(collection => {
            if (collection.isComplete) {
                this.onCollectionComplete(collection, shopState);
            }
        });
    },

    /**
     * Handle collection completion
     * @param {Object} collection - Completed collection
     * @param {Object} shopState - Shop state reference
     */
    onCollectionComplete(collection, shopState) {
        console.log(`[ShopCollections] Collection complete: ${collection.name}`);

        // Emit event
        if (shopState && shopState.emit) {
            shopState.emit('collection-complete', {
                collection,
                bonus: collection.bonus
            });
        }

        // Could trigger notification, achievement, etc.
        if (window.Hub && window.Hub.showNotification) {
            window.Hub.showNotification(
                `Collection Complete: ${collection.name}! ${collection.bonus ? 'Bonus unlocked!' : ''}`,
                'success'
            );
        }
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopCollections };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopCollections = ShopCollections;
}
