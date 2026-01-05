/**
 * ASDF Shop V2 - Entry Point
 *
 * Initializes and coordinates all shop modules
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// SHOP INITIALIZATION
// ============================================

const ShopV2 = {
    // Module references
    state: null,
    ui: null,
    canvas: null,
    sync: null,
    favorites: null,
    purchase: null,
    currency: null,
    particles: null,
    placeholders: null,
    catalog: null,
    collections: null,
    toast: null,

    // Configuration
    config: {
        containerId: 'shop-container',
        canvasSize: 400,
        autoSync: true,
        syncInterval: 60000, // 1 minute
        debug: false
    },

    // State
    initialized: false,
    syncTimer: null,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize shop
     * @param {Object} options - Configuration options
     */
    async init(options = {}) {
        if (this.initialized) {
            console.warn('[ShopV2] Already initialized');
            return;
        }

        // Merge options
        Object.assign(this.config, options);

        console.log('[ShopV2] Initializing...');

        try {
            // Get module references
            this.state = window.ShopStateV2;
            this.ui = window.ShopUI;
            this.canvas = window.ShopCanvas;
            this.sync = window.ShopSync;
            this.favorites = window.ShopFavorites;
            this.purchase = window.ShopPurchase;
            this.currency = window.ShopCurrency;
            this.particles = window.ShopParticles;
            this.placeholders = window.ShopPlaceholders;
            this.catalog = window.ShopCatalog;
            this.collections = window.ShopCollections;
            this.toast = window.Toast;

            // Check required modules
            if (!this.state || !this.ui) {
                throw new Error('Required modules not loaded (state, ui)');
            }

            // Initialize state
            this.state.init();

            // Load from localStorage
            this.state.loadFromLocal();

            // Initialize UI
            const container = document.getElementById(this.config.containerId);
            if (container) {
                this.ui.init(container, this.state);
            }

            // Setup purchase callbacks
            if (this.purchase) {
                this.purchase.on('success', (purchase) => {
                    this.handlePurchaseSuccess(purchase);
                });
                this.purchase.on('error', (error) => {
                    this.handlePurchaseError(error);
                });
            }

            // Initial sync with backend
            if (this.config.autoSync && this.sync) {
                await this.syncWithBackend();

                // Setup periodic sync
                this.syncTimer = setInterval(() => {
                    this.syncWithBackend();
                }, this.config.syncInterval);
            }

            // Setup event listeners
            this.setupEventListeners();

            this.initialized = true;
            console.log('[ShopV2] Initialized successfully');

            // Emit ready event
            this.state.emit('shop-ready');

        } catch (error) {
            console.error('[ShopV2] Initialization failed:', error);
            this.showError('Failed to initialize shop');
        }
    },

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Listen for state changes
        this.state.subscribe('filters-changed', () => {
            this.ui.renderGrid();
        });

        this.state.subscribe('item-selected', (item) => {
            this.ui.renderPreview();
        });

        this.state.subscribe('equipped-changed', () => {
            this.ui.renderPreview();
        });

        this.state.subscribe('favorites-changed', () => {
            if (this.state.activeTab === 'favorites') {
                this.ui.renderGrid();
            }
        });

        // Listen for visibility changes (pause sync when hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseSync();
            } else {
                this.resumeSync();
            }
        });
    },

    // ============================================
    // SYNC
    // ============================================

    /**
     * Sync with backend and enrich data
     */
    async syncWithBackend() {
        if (!this.sync) return;

        try {
            await this.sync.syncAll(this.state);

            // Enrich catalog with pricing and tier info
            if (this.catalog && this.state.catalog.length > 0) {
                const enrichedCatalog = this.catalog.enrichCatalog(this.state.catalog, {
                    inventory: this.state.inventory,
                    favorites: this.state.favorites,
                    userTier: this.state.userTier || 0
                });
                this.state.setCatalog(enrichedCatalog);
            }

            // Initialize collections
            if (this.collections && this.state.collections.length > 0) {
                this.collections.init(this.state.collections, this.state.inventory);
            }

            console.log('[ShopV2] Sync complete, data enriched');
        } catch (error) {
            console.error('[ShopV2] Sync failed:', error);
        }
    },

    /**
     * Pause periodic sync
     */
    pauseSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    },

    /**
     * Resume periodic sync
     */
    resumeSync() {
        if (!this.syncTimer && this.config.autoSync) {
            this.syncTimer = setInterval(() => {
                this.syncWithBackend();
            }, this.config.syncInterval);
        }
    },

    // ============================================
    // PURCHASE
    // ============================================

    /**
     * Purchase item
     * @param {string} itemId - Item ID
     * @param {string} currency - 'burn' or 'ingame'
     */
    async purchaseItem(itemId, currency = 'burn') {
        const item = this.state.catalog.find(i => i.id === itemId);
        if (!item) {
            this.showError('Item not found');
            return;
        }

        if (!this.purchase) {
            this.showError('Purchase system not available');
            return;
        }

        // Show purchase modal
        this.showPurchaseModal(item, currency);
    },

    /**
     * Show purchase confirmation modal
     */
    showPurchaseModal(item, currency) {
        const prices = this.currency ? this.currency.getPrices(item) : { burn: item.price, ingame: item.ingame_price };
        const price = prices[currency];

        const modal = document.createElement('div');
        modal.className = 'shop-modal-overlay';
        modal.innerHTML = `
            <div class="shop-modal purchase-modal">
                <div class="modal-header">
                    <h3>Confirm Purchase</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="purchase-item-preview">
                        <div class="item-name">${item.name}</div>
                        <div class="item-tier tier-${item.tier}">${this.getTierName(item.tier)}</div>
                    </div>
                    <div class="purchase-price">
                        <span class="price-label">Price:</span>
                        <span class="price-value">${currency === 'burn' ? '🔥' : '🪙'} ${price.toLocaleString()}</span>
                    </div>
                    ${currency === 'burn' ? `
                        <p class="burn-warning">
                            This will send a transaction from your connected wallet.
                            Please confirm in your wallet when prompted.
                        </p>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-confirm">Confirm Purchase</button>
                </div>
            </div>
        `;

        // Event handlers
        modal.querySelector('.modal-close').onclick = () => modal.remove();
        modal.querySelector('.btn-cancel').onclick = () => modal.remove();
        modal.querySelector('.btn-confirm').onclick = async () => {
            modal.querySelector('.btn-confirm').disabled = true;
            modal.querySelector('.btn-confirm').textContent = 'Processing...';

            const result = await this.purchase.initiate(item, currency, this.state);

            if (result.success) {
                if (result.requiresSignature) {
                    // Handle burn purchase
                    try {
                        modal.querySelector('.btn-confirm').textContent = 'Confirm in wallet...';
                        const signature = await window.BurnPurchase.executeBurn(
                            result.price,
                            result.burnAddress
                        );
                        await this.purchase.confirm(signature, this.state);
                        modal.remove();
                        this.showSuccess('Purchase complete!');
                    } catch (e) {
                        this.purchase.cancel();
                        modal.remove();
                        this.showError('Transaction failed: ' + e.message);
                    }
                } else {
                    modal.remove();
                    this.showSuccess('Purchase complete!');
                }
            } else {
                modal.remove();
                this.showError(result.error || 'Purchase failed');
            }
        };

        document.body.appendChild(modal);
    },

    /**
     * Handle successful purchase
     */
    handlePurchaseSuccess(purchase) {
        this.showSuccess(`Successfully purchased ${purchase.item.name}!`);
        this.ui.render(); // Refresh UI
    },

    /**
     * Handle purchase error
     */
    handlePurchaseError(error) {
        this.showError(error.message || 'Purchase failed');
    },

    // ============================================
    // EQUIP
    // ============================================

    /**
     * Equip item
     * @param {string} itemId - Item ID
     */
    async equipItem(itemId) {
        const item = this.state.catalog.find(i => i.id === itemId);
        if (!item) return;

        // Optimistic update
        this.state.equipItem(itemId, item.layer);

        // Sync with server
        if (this.sync) {
            try {
                await this.sync.equipItem(itemId);
            } catch (error) {
                console.error('[ShopV2] Equip failed:', error);
                // Could revert here if needed
            }
        }

        this.ui.renderPreview();
    },

    /**
     * Unequip layer
     * @param {string} layer - Layer to unequip
     */
    async unequipLayer(layer) {
        // Optimistic update
        this.state.unequipLayer(layer);

        // Sync with server
        if (this.sync) {
            try {
                await this.sync.unequipLayer(layer);
            } catch (error) {
                console.error('[ShopV2] Unequip failed:', error);
            }
        }

        this.ui.renderPreview();
    },

    // ============================================
    // FAVORITES
    // ============================================

    /**
     * Toggle favorite
     * @param {string} itemId - Item ID
     */
    async toggleFavorite(itemId) {
        if (this.favorites) {
            await this.favorites.toggle(itemId, this.state);
        } else {
            this.state.toggleFavoriteLocal(itemId);
        }
    },

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Get tier name
     */
    getTierName(tier) {
        const names = ['Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Rare', 'Epic', 'Epic', 'Legendary', 'Legendary'];
        return names[tier] || 'Common';
    },

    /**
     * Show success notification
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    },

    /**
     * Show error notification
     */
    showError(message) {
        this.showNotification(message, 'error');
    },

    /**
     * Show notification using Toast system
     */
    showNotification(message, type = 'info') {
        if (this.toast) {
            switch (type) {
                case 'success':
                    this.toast.success(message);
                    break;
                case 'error':
                    this.toast.error(message);
                    break;
                case 'warning':
                    this.toast.warning(message);
                    break;
                default:
                    this.toast.info(message);
            }
        } else {
            // Fallback for when Toast is not available
            console.log(`[Shop ${type}] ${message}`);
        }
    },

    // ============================================
    // PUMP ARENA INTEGRATION
    // ============================================

    /**
     * Get equipped cosmetics for Pump Arena character
     * @returns {Object} Equipped items by layer
     */
    getEquippedForGame() {
        if (!this.state) return {};

        const equipped = this.state.equipped || {};
        const result = {};

        // Get full item details for each equipped item
        Object.entries(equipped).forEach(([layer, itemId]) => {
            if (itemId) {
                const item = this.state.catalog.find(i => i.id === itemId);
                if (item) {
                    result[layer] = {
                        id: item.id,
                        name: item.name,
                        asset_url: item.asset_url,
                        tier: item.tier,
                        tierColor: this.catalog ? this.catalog.getTierColor(item.tier) : '#9ca3af',
                        hasParticles: item.tier >= 5
                    };
                } else {
                    result[layer] = { id: itemId };
                }
            }
        });

        return result;
    },

    /**
     * Award in-game currency (from game wins, achievements, etc.)
     * @param {number} amount - Amount to award
     * @param {string} source - Source of the currency
     */
    async awardCurrency(amount, source = 'game') {
        if (!this.state) return;

        // Update local state
        const newBalance = (this.state.currency.ingame || 0) + amount;
        this.state.updateIngameCurrency(newBalance);

        // Show notification
        this.showNotification(`+${amount} coins earned!`, 'success');

        // Sync with server
        if (this.sync) {
            try {
                await this.sync.earnCurrency(amount, source);
            } catch (error) {
                console.error('[ShopV2] Failed to sync currency:', error);
            }
        }
    },

    /**
     * Check if user owns a specific item
     * @param {string} itemId - Item ID to check
     * @returns {boolean}
     */
    ownsItem(itemId) {
        if (!this.state) return false;
        return this.state.inventory.some(i => i.id === itemId) || itemId === 'skin_default';
    },

    /**
     * Get random owned item for a layer (for AI opponents)
     * @param {string} layer - Layer type
     * @returns {Object|null} Random item or null
     */
    getRandomItemForLayer(layer) {
        if (!this.state) return null;

        const ownedItems = this.state.inventory.filter(i => i.layer === layer);
        if (ownedItems.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * ownedItems.length);
        return ownedItems[randomIndex];
    },

    // ============================================
    // CLEANUP
    // ============================================

    /**
     * Destroy shop instance
     */
    destroy() {
        this.pauseSync();

        if (this.canvas) {
            this.canvas.destroy();
        }

        if (this.ui) {
            this.ui.destroy();
        }

        this.initialized = false;
        console.log('[ShopV2] Destroyed');
    }
};

// ============================================
// AUTO-INIT ON DOM READY
// ============================================

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Check if shop container exists
        if (document.getElementById('shop-container')) {
            // Auto-initialize
            ShopV2.init();
        }
    });
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopV2 };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopV2 = ShopV2;
}
