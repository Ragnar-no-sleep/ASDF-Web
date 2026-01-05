/**
 * ASDF Shop V2 - Preview Panel Component
 *
 * Displays detailed item preview with canvas avatar and actions
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// PREVIEW PANEL
// ============================================

const ShopPreview = {
    // State
    container: null,
    currentItem: null,
    previewEquipped: {},
    canvasSize: 300,

    // Callbacks
    onPurchase: null,
    onEquip: null,
    onTryOn: null,
    onFavorite: null,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize preview panel
     * @param {HTMLElement} container - Container element
     * @param {Object} callbacks - Event callbacks
     */
    init(container, callbacks = {}) {
        this.container = container;
        this.onPurchase = callbacks.onPurchase;
        this.onEquip = callbacks.onEquip;
        this.onTryOn = callbacks.onTryOn;
        this.onFavorite = callbacks.onFavorite;

        this.render();
        console.log('[ShopPreview] Initialized');
    },

    /**
     * Set current equipped items for preview
     * @param {Object} equipped - Equipped items by layer
     */
    setEquipped(equipped) {
        this.previewEquipped = { ...equipped };
    },

    // ============================================
    // RENDERING
    // ============================================

    /**
     * Render the preview panel
     */
    render() {
        if (!this.container) return;

        if (!this.currentItem) {
            this.renderEmpty();
            return;
        }

        const item = this.currentItem;
        const tier = item.tier || 0;
        const tierColor = this.sanitizeColor(item.tierColor) || this.getTierColor(tier);
        const tierName = item.tierName || this.getTierName(tier);

        this.container.innerHTML = `
            <div class="shop-preview-panel" style="--tier-color: ${tierColor}">
                <!-- Header -->
                <div class="preview-header">
                    <h3 class="preview-title">${this.escapeHtml(item.name)}</h3>
                    <div class="preview-tier" style="color: ${tierColor}">${tierName}</div>
                </div>

                <!-- Canvas Preview -->
                <div class="preview-canvas-container">
                    <canvas id="preview-canvas" width="${this.canvasSize}" height="${this.canvasSize}"></canvas>
                    ${tier >= 5 ? '<div class="preview-particles"></div>' : ''}
                </div>

                <!-- Item Details -->
                <div class="preview-details">
                    ${this.renderItemDetails(item)}
                </div>

                <!-- Price Section -->
                <div class="preview-price-section">
                    ${this.renderPriceSection(item)}
                </div>

                <!-- Actions -->
                <div class="preview-actions">
                    ${this.renderActions(item)}
                </div>

                <!-- Collection Info -->
                ${item.collection_id ? this.renderCollectionInfo(item) : ''}
            </div>
        `;

        this.bindEvents();
        this.renderCanvas();
    },

    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
            <div class="shop-preview-panel empty">
                <div class="preview-empty">
                    <div class="empty-icon">👆</div>
                    <div class="empty-text">Select an item to preview</div>
                </div>
            </div>
        `;
    },

    /**
     * Render item details
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderItemDetails(item) {
        const details = [];

        // Layer (validate against known layers)
        const validLayers = ['background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held'];
        const layer = validLayers.includes(item.layer) ? item.layer : 'unknown';
        details.push(`
            <div class="detail-row">
                <span class="detail-label">Layer</span>
                <span class="detail-value">${this.getLayerIcon(layer)} ${this.capitalizeFirst(layer)}</span>
            </div>
        `);

        // Description
        if (item.description) {
            details.push(`
                <div class="detail-row description">
                    <p>${this.escapeHtml(item.description)}</p>
                </div>
            `);
        }

        // Limited info
        if (item.is_limited) {
            details.push(this.renderLimitedInfo(item));
        }

        // Particle effects for high tier
        if (item.tier >= 5) {
            const particleType = item.tier >= 8 ? 'Legendary' : item.tier >= 6 ? 'Epic' : 'Rare';
            details.push(`
                <div class="detail-row highlight">
                    <span class="detail-label">✨ Special Effect</span>
                    <span class="detail-value">${particleType} Particles</span>
                </div>
            `);
        }

        return details.join('');
    },

    /**
     * Render limited item info
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderLimitedInfo(item) {
        let html = '<div class="limited-info">';
        html += '<div class="limited-badge">LIMITED EDITION</div>';

        // Stock remaining
        if (item.quantity_limit) {
            const remaining = item.quantity_limit - (item.quantity_sold || 0);
            const percentage = (remaining / item.quantity_limit) * 100;
            html += `
                <div class="stock-bar">
                    <div class="stock-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="stock-text">${remaining} of ${item.quantity_limit} remaining</div>
            `;
        }

        // Time remaining
        if (item.available_until) {
            const endDate = new Date(item.available_until);
            const now = new Date();
            const hoursRemaining = Math.max(0, (endDate - now) / (1000 * 60 * 60));

            if (hoursRemaining > 0) {
                let timeText;
                if (hoursRemaining < 24) {
                    timeText = `${Math.ceil(hoursRemaining)} hours left`;
                } else {
                    timeText = `${Math.ceil(hoursRemaining / 24)} days left`;
                }
                html += `<div class="time-remaining">⏰ ${timeText}</div>`;
            }
        }

        html += '</div>';
        return html;
    },

    /**
     * Render price section
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderPriceSection(item) {
        if (item.owned) {
            return `
                <div class="price-owned">
                    <span class="owned-icon">✓</span>
                    <span>You own this item</span>
                </div>
            `;
        }

        const burnPrice = item.burnPrice || item.price || 0;
        const ingamePrice = item.ingamePrice || Math.round(burnPrice * 1.5);
        const hasDiscount = item.discount && item.discount > 0;

        return `
            <div class="price-options">
                ${item.acceptsBurn !== false ? `
                    <div class="price-option burn">
                        <div class="price-header">
                            <span class="price-icon">🔥</span>
                            <span class="price-label">Burn Tokens</span>
                        </div>
                        ${hasDiscount ? `<div class="price-original">${this.formatPrice(item.originalPrice)}</div>` : ''}
                        <div class="price-amount">${this.formatPrice(burnPrice)}</div>
                        <button class="btn-purchase btn-burn" data-currency="burn">
                            Purchase
                        </button>
                    </div>
                ` : ''}

                ${item.acceptsIngame !== false ? `
                    <div class="price-option ingame">
                        <div class="price-header">
                            <span class="price-icon">🪙</span>
                            <span class="price-label">In-Game Coins</span>
                        </div>
                        <div class="price-amount">${this.formatPrice(ingamePrice)}</div>
                        <button class="btn-purchase btn-ingame" data-currency="ingame">
                            Purchase
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render action buttons
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderActions(item) {
        const actions = [];

        // Try On button (always available)
        actions.push(`
            <button class="btn-action btn-try-on" data-action="tryOn">
                <span>👁️</span> Try On
            </button>
        `);

        // Equip button (if owned)
        if (item.owned) {
            const isEquipped = this.isItemEquipped(item);
            actions.push(`
                <button class="btn-action btn-equip ${isEquipped ? 'equipped' : ''}" data-action="equip">
                    <span>${isEquipped ? '✓' : '⚙️'}</span> ${isEquipped ? 'Equipped' : 'Equip'}
                </button>
            `);
        }

        // Favorite button
        const isFavorite = item.favorited || false;
        actions.push(`
            <button class="btn-action btn-favorite ${isFavorite ? 'active' : ''}" data-action="favorite">
                <span>${isFavorite ? '❤️' : '🤍'}</span> ${isFavorite ? 'Favorited' : 'Favorite'}
            </button>
        `);

        return actions.join('');
    },

    /**
     * Render collection info
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderCollectionInfo(item) {
        // Get collection details if ShopCollections is available
        let collectionName = item.collection_id;
        let progress = null;

        if (window.ShopCollections) {
            const collection = window.ShopCollections.get(item.collection_id);
            if (collection) {
                collectionName = collection.name;
                progress = collection.progress;
            }
        }

        return `
            <div class="preview-collection">
                <div class="collection-header">
                    <span class="collection-icon">📚</span>
                    <span class="collection-name">${this.escapeHtml(collectionName)}</span>
                </div>
                ${progress ? `
                    <div class="collection-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                        </div>
                        <span class="progress-text">${progress.owned}/${progress.total}</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // ============================================
    // CANVAS RENDERING
    // ============================================

    /**
     * Render the preview canvas
     */
    async renderCanvas() {
        const canvas = document.getElementById('preview-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Get current preview equipped + the item being previewed
        const equipped = { ...this.previewEquipped };
        if (this.currentItem) {
            equipped[this.currentItem.layer] = this.currentItem.id;
        }

        // Render layers in order
        const layerOrder = ['background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held'];

        for (const layer of layerOrder) {
            const itemId = equipped[layer];
            if (!itemId) continue;

            await this.renderLayer(ctx, layer, itemId);
        }

        // Add tier glow for high-tier items
        if (this.currentItem && this.currentItem.tier >= 5) {
            this.renderTierGlow(ctx, this.currentItem.tier);
        }
    },

    /**
     * Render a single layer
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} layer - Layer type
     * @param {string} itemId - Item ID
     */
    async renderLayer(ctx, layer, itemId) {
        // Try to get item from catalog
        let item = null;
        if (window.ShopV2 && window.ShopV2.state && window.ShopV2.state.catalog) {
            item = window.ShopV2.state.catalog.find(i => i.id === itemId);
        }

        // Try loading actual asset
        if (item && item.asset_url) {
            try {
                const img = await this.loadImage(item.asset_url);
                ctx.drawImage(img, 0, 0, this.canvasSize, this.canvasSize);
                return;
            } catch (e) {
                // Fall through to placeholder
            }
        }

        // Use placeholder renderer
        if (window.ShopPlaceholders) {
            const renderFn = window.ShopPlaceholders[`render_${layer}`];
            if (renderFn) {
                renderFn(ctx, this.canvasSize, item ? item.tier : 0);
            }
        }
    },

    /**
     * Load an image
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>}
     */
    loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        });
    },

    /**
     * Render tier glow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} tier - Item tier
     */
    renderTierGlow(ctx, tier) {
        const tierColor = this.getTierColor(tier);
        const gradient = ctx.createRadialGradient(
            this.canvasSize / 2, this.canvasSize / 2, 0,
            this.canvasSize / 2, this.canvasSize / 2, this.canvasSize / 2
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.7, 'transparent');
        gradient.addColorStop(1, tierColor + '40');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvasSize, this.canvasSize);
    },

    // ============================================
    // EVENTS
    // ============================================

    /**
     * Bind event handlers
     */
    bindEvents() {
        if (!this.container) return;

        // Purchase buttons
        this.container.querySelectorAll('.btn-purchase').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.onPurchase && this.currentItem) {
                    this.onPurchase(this.currentItem.id, btn.dataset.currency);
                }
            });
        });

        // Action buttons
        this.container.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (!this.currentItem) return;

                switch (action) {
                    case 'tryOn':
                        if (this.onTryOn) this.onTryOn(this.currentItem.id);
                        break;
                    case 'equip':
                        if (this.onEquip) this.onEquip(this.currentItem.id);
                        break;
                    case 'favorite':
                        if (this.onFavorite) this.onFavorite(this.currentItem.id);
                        btn.classList.toggle('active');
                        break;
                }
            });
        });
    },

    // ============================================
    // PUBLIC API
    // ============================================

    /**
     * Show item preview
     * @param {Object} item - Item to preview
     */
    showItem(item) {
        this.currentItem = item;
        this.render();
    },

    /**
     * Clear preview
     */
    clear() {
        this.currentItem = null;
        this.render();
    },

    /**
     * Update item (e.g., after purchase)
     * @param {Object} item - Updated item data
     */
    updateItem(item) {
        if (this.currentItem && this.currentItem.id === item.id) {
            this.currentItem = item;
            this.render();
        }
    },

    /**
     * Check if item is currently equipped
     * @param {Object} item - Item to check
     * @returns {boolean}
     */
    isItemEquipped(item) {
        return this.previewEquipped[item.layer] === item.id;
    },

    // ============================================
    // UTILITIES (delegate to ShopUtils)
    // ============================================

    getTierColor(tier) {
        return window.ShopUtils ? ShopUtils.getTierColor(tier) : '#9ca3af';
    },

    getTierName(tier) {
        return window.ShopUtils ? ShopUtils.getTierName(tier) : 'Common';
    },

    getLayerIcon(layer) {
        return window.ShopUtils ? ShopUtils.getLayerIcon(layer) : '📦';
    },

    capitalizeFirst(str) {
        return window.ShopUtils ? ShopUtils.capitalizeFirst(str) : (str || '');
    },

    formatPrice(price) {
        return window.ShopUtils ? ShopUtils.formatPrice(price) : String(price);
    },

    escapeHtml(str) {
        return window.ShopUtils ? ShopUtils.escapeHtml(str) : String(str || '');
    },

    sanitizeColor(color) {
        return window.ShopUtils ? ShopUtils.sanitizeColor(color) : null;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopPreview };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopPreview = ShopPreview;
}
