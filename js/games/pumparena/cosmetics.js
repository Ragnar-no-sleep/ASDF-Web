/**
 * Pump Arena - Cosmetics Bridge
 * Connects ShopV2 with Pump Arena game
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// COSMETICS LAYER CONFIGURATION
// ============================================

const COSMETIC_LAYERS = {
    background: { order: 0, name: 'Background', icon: '🖼️' },
    aura: { order: 1, name: 'Aura', icon: '✨' },
    skin: { order: 2, name: 'Skin', icon: '🐕' },
    outfit: { order: 3, name: 'Outfit', icon: '👕' },
    eyes: { order: 4, name: 'Eyes', icon: '👁️' },
    head: { order: 5, name: 'Head', icon: '🎩' },
    held: { order: 6, name: 'Held Item', icon: '🗡️' }
};

// Default cosmetics (everyone starts with these)
const DEFAULT_COSMETICS = {
    skin: 'skin_default'
};

// ============================================
// COSMETICS STATE
// ============================================

const CosmeticsState = {
    equipped: { ...DEFAULT_COSMETICS },
    inventory: [],

    /**
     * Initialize cosmetics from localStorage
     */
    init() {
        this.load();
        this.syncWithShop();
    },

    /**
     * Load cosmetics from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem('pumparena_cosmetics');
            if (stored) {
                const data = JSON.parse(stored);
                // Validate equipped - only allow valid layer keys and sanitized itemIds
                if (data.equipped && typeof data.equipped === 'object') {
                    const validEquipped = {};
                    Object.keys(COSMETIC_LAYERS).forEach(layer => {
                        const itemId = data.equipped[layer];
                        if (itemId && this.isValidItemId(itemId)) {
                            validEquipped[layer] = itemId;
                        }
                    });
                    this.equipped = { ...DEFAULT_COSMETICS, ...validEquipped };
                }
                // Validate inventory - filter to valid item IDs only
                if (Array.isArray(data.inventory)) {
                    this.inventory = data.inventory.filter(id => this.isValidItemId(id));
                }
            }
        } catch (e) {
            console.error('[Cosmetics] Load error:', e);
        }
    },

    /**
     * Validate item ID format (delegate to ShopUtils if available)
     * @param {string} id - Item ID to validate
     * @returns {boolean} True if valid
     */
    isValidItemId(id) {
        if (window.ShopUtils) {
            return ShopUtils.isValidItemId(id);
        }
        // Fallback validation
        if (!id || typeof id !== 'string') return false;
        return /^[a-zA-Z0-9_-]{1,50}$/.test(id);
    },

    /**
     * Save cosmetics to localStorage
     */
    save() {
        try {
            localStorage.setItem('pumparena_cosmetics', JSON.stringify({
                equipped: this.equipped,
                inventory: this.inventory
            }));
        } catch (e) {
            console.error('[Cosmetics] Save error:', e);
        }
    },

    /**
     * Sync with ShopV2 if available
     */
    syncWithShop() {
        if (window.ShopV2 && window.ShopV2.state) {
            // Pull equipped items from shop
            const shopEquipped = window.ShopV2.state.equipped;
            if (shopEquipped) {
                Object.keys(COSMETIC_LAYERS).forEach(layer => {
                    if (shopEquipped[layer]) {
                        this.equipped[layer] = shopEquipped[layer];
                    }
                });
            }

            // Pull inventory from shop
            if (window.ShopV2.state.inventory) {
                this.inventory = window.ShopV2.state.inventory.map(item => item.id);
            }

            this.save();
        }
    },

    /**
     * Equip a cosmetic item
     * @param {string} layer - Layer to equip to
     * @param {string} itemId - Item ID
     */
    equip(layer, itemId) {
        if (!COSMETIC_LAYERS[layer]) return false;

        this.equipped[layer] = itemId;
        this.save();

        // Sync with ShopV2
        if (window.ShopV2) {
            window.ShopV2.equipItem(itemId);
        }

        // Emit event
        document.dispatchEvent(new CustomEvent('pumparena:cosmetic-changed', {
            detail: { layer, itemId }
        }));

        return true;
    },

    /**
     * Unequip a layer
     * @param {string} layer - Layer to unequip
     */
    unequip(layer) {
        if (!COSMETIC_LAYERS[layer]) return false;
        if (layer === 'skin') {
            this.equipped.skin = 'skin_default';
        } else {
            delete this.equipped[layer];
        }
        this.save();

        // Sync with ShopV2
        if (window.ShopV2) {
            window.ShopV2.unequipLayer(layer);
        }

        document.dispatchEvent(new CustomEvent('pumparena:cosmetic-changed', {
            detail: { layer, itemId: null }
        }));

        return true;
    },

    /**
     * Get equipped cosmetics
     * @returns {Object} Equipped items by layer
     */
    getEquipped() {
        return { ...this.equipped };
    },

    /**
     * Check if player owns an item
     * @param {string} itemId - Item ID
     * @returns {boolean}
     */
    owns(itemId) {
        if (itemId === 'skin_default') return true;

        // Check ShopV2 first
        if (window.ShopV2 && window.ShopV2.ownsItem) {
            return window.ShopV2.ownsItem(itemId);
        }

        return this.inventory.includes(itemId);
    }
};

// ============================================
// COSMETICS RENDERING
// ============================================

const CosmeticsRenderer = {
    // Image cache
    imageCache: new Map(),

    /**
     * Get cosmetic asset URL
     * @param {string} itemId - Item ID
     * @returns {string|null} Asset URL or null
     */
    getAssetUrl(itemId) {
        // Validate itemId to prevent path traversal
        if (!CosmeticsState.isValidItemId(itemId)) {
            return null;
        }

        // Check ShopV2 catalog for item
        if (window.ShopV2 && window.ShopV2.state && window.ShopV2.state.catalog) {
            const item = window.ShopV2.state.catalog.find(i => i.id === itemId);
            if (item && item.asset_url) {
                return item.asset_url;
            }
        }

        // Fallback to placeholder path (itemId already validated)
        return `/assets/cosmetics/${itemId}.png`;
    },

    /**
     * Load an image with caching
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(url) {
        if (this.imageCache.has(url)) {
            return Promise.resolve(this.imageCache.get(url));
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(url, img);
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load: ${url}`));
            img.src = url;
        });
    },

    /**
     * Render equipped cosmetics to a canvas
     * @param {HTMLCanvasElement} canvas - Target canvas
     * @param {Object} options - Render options
     */
    async renderToCanvas(canvas, options = {}) {
        const ctx = canvas.getContext('2d');
        const size = options.size || Math.min(canvas.width, canvas.height);
        const x = options.x || (canvas.width - size) / 2;
        const y = options.y || (canvas.height - size) / 2;

        // Clear area
        if (options.clear !== false) {
            ctx.clearRect(x, y, size, size);
        }

        const equipped = CosmeticsState.getEquipped();
        const layers = Object.entries(COSMETIC_LAYERS)
            .sort((a, b) => a[1].order - b[1].order);

        // Render each layer
        for (const [layer, config] of layers) {
            const itemId = equipped[layer];
            if (!itemId) continue;

            try {
                const url = this.getAssetUrl(itemId);
                const img = await this.loadImage(url);
                ctx.drawImage(img, x, y, size, size);
            } catch (e) {
                // Item image not found, render placeholder
                if (options.renderPlaceholder !== false) {
                    this.renderLayerPlaceholder(ctx, layer, x, y, size);
                }
            }
        }
    },

    /**
     * Render a placeholder for missing cosmetic
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} layer - Layer type
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} size - Size
     */
    renderLayerPlaceholder(ctx, layer, x, y, size) {
        // Use ShopPlaceholders if available
        if (window.ShopPlaceholders && window.ShopPlaceholders[`render_${layer}`]) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d');
            window.ShopPlaceholders[`render_${layer}`](tempCtx, size);
            ctx.drawImage(tempCanvas, x, y);
            return;
        }

        // Basic fallback placeholder
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    /**
     * Get CSS styles for portrait display
     * @returns {string} CSS styles
     */
    getPortraitStyles() {
        const equipped = CosmeticsState.getEquipped();
        const styles = [];

        // Get tier color from equipped skin
        if (window.ShopV2 && window.ShopV2.state && equipped.skin) {
            const skinItem = window.ShopV2.state.catalog.find(i => i.id === equipped.skin);
            if (skinItem && skinItem.tierColor) {
                const color = this.sanitizeColor(skinItem.tierColor);
                if (color) {
                    styles.push(`border-color: ${color}`);
                    styles.push(`box-shadow: 0 0 20px ${color}40`);
                }
            }
        }

        return styles.join('; ');
    },

    /**
     * Sanitize CSS color value (delegate to ShopUtils if available)
     * @param {string} color - Color to sanitize
     * @returns {string|null} Sanitized color or null if invalid
     */
    sanitizeColor(color) {
        if (window.ShopUtils) {
            return ShopUtils.sanitizeColor(color);
        }
        // Fallback validation
        if (!color) return null;
        const hexMatch = String(color).match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
        return hexMatch ? color : null;
    }
};

// ============================================
// GAME INTEGRATION
// ============================================

const PumpArenaCosmetics = {
    /**
     * Initialize cosmetics system
     */
    init() {
        CosmeticsState.init();
        this.setupEventListeners();
        console.log('[PumpArenaCosmetics] Initialized');
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for shop purchases
        document.addEventListener('pumparena:item-purchased', (e) => {
            if (e.detail.category === 'cosmetics') {
                CosmeticsState.inventory.push(e.detail.item.id);
                CosmeticsState.save();
            }
        });

        // Listen for ShopV2 changes
        if (window.ShopV2 && window.ShopV2.state) {
            window.ShopV2.state.subscribe('equipped-changed', () => {
                CosmeticsState.syncWithShop();
            });
        }

        // Listen for battle victories to award currency
        document.addEventListener('pumparena:battle-victory', (e) => {
            const rewards = e.detail.rewards || {};
            // Award coins based on battle rewards (10% of token rewards as shop coins)
            if (rewards.tokens && window.ShopV2) {
                const coins = Math.ceil(rewards.tokens * 0.1);
                window.ShopV2.awardCurrency(coins, 'battle');
            }
        });

        // Listen for ranking promotions for bonus coins
        document.addEventListener('pumparena:ranking-promotion', (e) => {
            if (window.ShopV2) {
                const bonus = e.detail.tier ? (e.detail.tier.minPoints || 10) : 10;
                window.ShopV2.awardCurrency(bonus, 'ranking');
            }
        });
    },

    /**
     * Open cosmetics shop modal
     */
    openShop() {
        // If ShopV2 is available and has a UI, use it
        if (window.ShopV2 && window.ShopV2.ui) {
            this.showShopModal();
        } else {
            this.showPreviewModal();
        }
    },

    /**
     * Show full shop modal
     */
    showShopModal() {
        const modal = document.createElement('div');
        modal.className = 'game-modal-overlay cosmetics-modal';
        modal.innerHTML = `
            <div class="game-modal-panel" style="max-width: 900px; max-height: 90vh; overflow: hidden;">
                <div class="modal-header" style="background: linear-gradient(135deg, #a855f720, #ec489920); border-bottom: 1px solid #a855f740; padding: 15px 20px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 24px;">✨</span>
                        <div>
                            <h3 style="color: #fff; margin: 0; font-size: 18px;">Cosmetics Shop</h3>
                            <div style="color: #c084fc; font-size: 12px;">Customize your character</div>
                        </div>
                    </div>
                    <button class="modal-close-btn" style="background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; padding: 5px;">&times;</button>
                </div>
                <div id="shop-modal-content" style="height: calc(90vh - 80px); overflow: auto;">
                    <div id="shop-modal-container" style="min-height: 100%;"></div>
                </div>
            </div>
        `;

        // Close handlers
        modal.querySelector('.modal-close-btn').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);

        // Initialize ShopV2 in the modal container (unique ID to avoid conflict with games.html)
        setTimeout(() => {
            const container = document.getElementById('shop-modal-container');
            if (!container) return;

            if (window.ShopV2 && !window.ShopV2.initialized) {
                window.ShopV2.init({ containerId: 'shop-modal-container' });
            } else if (window.ShopV2 && window.ShopV2.ui) {
                window.ShopV2.ui.init(container, window.ShopV2.state);
            }
        }, 100);
    },

    /**
     * Show preview modal (when shop not fully available)
     */
    showPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'game-modal-overlay';
        modal.innerHTML = `
            <div class="game-modal-panel" style="max-width: 500px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #a855f720, #ec489920); padding: 20px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 10px;">✨🎨🔥</div>
                    <h3 style="color: #fff; margin: 0;">Cosmetics Coming Soon!</h3>
                </div>
                <div class="modal-body" style="padding: 20px; text-align: center;">
                    <p style="color: #c084fc; margin-bottom: 20px;">
                        The cosmetics shop is being prepared with amazing items:
                    </p>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                        <div style="background: #1a1a2e; border: 1px solid #a855f740; border-radius: 10px; padding: 15px;">
                            <div style="font-size: 24px; margin-bottom: 5px;">🐕</div>
                            <div style="color: #fff; font-size: 12px;">Unique Skins</div>
                        </div>
                        <div style="background: #1a1a2e; border: 1px solid #a855f740; border-radius: 10px; padding: 15px;">
                            <div style="font-size: 24px; margin-bottom: 5px;">✨</div>
                            <div style="color: #fff; font-size: 12px;">Auras & Effects</div>
                        </div>
                        <div style="background: #1a1a2e; border: 1px solid #a855f740; border-radius: 10px; padding: 15px;">
                            <div style="font-size: 24px; margin-bottom: 5px;">👕</div>
                            <div style="color: #fff; font-size: 12px;">Outfits</div>
                        </div>
                        <div style="background: #1a1a2e; border: 1px solid #a855f740; border-radius: 10px; padding: 15px;">
                            <div style="font-size: 24px; margin-bottom: 5px;">🎩</div>
                            <div style="color: #fff; font-size: 12px;">Accessories</div>
                        </div>
                    </div>
                    <p style="color: #888; font-size: 12px;">
                        Win battles to earn coins for the shop!
                    </p>
                </div>
                <div style="padding: 15px 20px; border-top: 1px solid #333;">
                    <button class="modal-close-btn" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #a855f7, #7c3aed); border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">
                        Got it!
                    </button>
                </div>
            </div>
        `;

        modal.querySelector('.modal-close-btn').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
    },

    /**
     * Award coins from game activities
     * @param {number} amount - Amount to award
     * @param {string} source - Source of coins
     */
    awardCoins(amount, source = 'game') {
        if (window.ShopV2) {
            window.ShopV2.awardCurrency(amount, source);
        }
    },

    /**
     * Get equipped cosmetics for battle display
     * @returns {Object} Equipped items with full details
     */
    getEquippedForBattle() {
        if (window.ShopV2 && window.ShopV2.getEquippedForGame) {
            return window.ShopV2.getEquippedForGame();
        }
        return CosmeticsState.getEquipped();
    },

    /**
     * Get random cosmetics for NPC/enemy
     * @returns {Object} Random cosmetic setup
     */
    getRandomNPCCosmetics() {
        const cosmetics = {};

        Object.keys(COSMETIC_LAYERS).forEach(layer => {
            if (window.ShopV2 && window.ShopV2.getRandomItemForLayer) {
                const item = window.ShopV2.getRandomItemForLayer(layer);
                if (item) {
                    cosmetics[layer] = item;
                }
            }
        });

        return cosmetics;
    }
};

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaCosmetics = PumpArenaCosmetics;
    window.CosmeticsState = CosmeticsState;
    window.CosmeticsRenderer = CosmeticsRenderer;
    window.COSMETIC_LAYERS = COSMETIC_LAYERS;
}

// Auto-init when DOM ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PumpArenaCosmetics.init());
    } else {
        PumpArenaCosmetics.init();
    }
}
