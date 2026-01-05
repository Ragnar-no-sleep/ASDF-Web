/**
 * ASDF Shop V2 - Item Card Component
 *
 * Renders individual shop item cards with tier effects
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// ITEM CARD RENDERER
// ============================================

const ShopItemCard = {
    // Click callback
    onClick: null,
    onFavoriteClick: null,

    // ============================================
    // RENDERING
    // ============================================

    /**
     * Render a single item card
     * @param {Object} item - Item data
     * @param {Object} options - Render options
     * @returns {string} HTML string
     */
    render(item, options = {}) {
        if (!item || !item.id) return '';

        const {
            showPrice = true,
            showFavorite = true,
            compact = false,
            selected = false
        } = options;

        const tier = item.tier || 0;
        const tierColor = this.sanitizeColor(item.tierColor) || this.getTierColor(tier);
        const tierName = item.tierName || this.getTierName(tier);

        // Status badges
        const badges = this.renderBadges(item);

        // Price display
        const priceHtml = showPrice ? this.renderPrice(item) : '';

        // Favorite button
        const favoriteHtml = showFavorite ? this.renderFavoriteButton(item) : '';

        // Particle effect class for high-tier items
        const particleClass = tier >= 5 ? `has-particles tier-${tier}` : '';

        // Owned indicator
        const ownedClass = item.owned ? 'owned' : '';
        const unavailableClass = item.available === false ? 'unavailable' : '';

        return `
            <div class="shop-item-card ${compact ? 'compact' : ''} ${selected ? 'selected' : ''} ${ownedClass} ${unavailableClass} ${particleClass}"
                 data-item-id="${this.escapeHtml(item.id)}"
                 data-tier="${tier}"
                 style="--tier-color: ${tierColor}">

                <!-- Tier Glow Effect -->
                <div class="card-glow" style="background: radial-gradient(circle at center, ${tierColor}30, transparent 70%)"></div>

                <!-- Thumbnail -->
                <div class="card-thumbnail">
                    ${this.renderThumbnail(item)}
                    <div class="card-layer-badge">${this.getLayerIcon(item.layer)}</div>
                    ${item.owned ? '<div class="owned-badge">Owned</div>' : ''}
                </div>

                <!-- Badges -->
                ${badges}

                <!-- Info -->
                <div class="card-info">
                    <div class="card-name" title="${this.escapeHtml(item.name)}">${this.escapeHtml(item.name)}</div>
                    <div class="card-tier" style="color: ${tierColor}">${tierName}</div>
                </div>

                <!-- Price -->
                ${priceHtml}

                <!-- Actions -->
                <div class="card-actions">
                    ${favoriteHtml}
                </div>

                <!-- Unavailable Overlay -->
                ${item.available === false ? `
                    <div class="unavailable-overlay">
                        <span>${this.escapeHtml(item.reasons?.[0]) || 'Unavailable'}</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render item thumbnail
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderThumbnail(item) {
        if (item.asset_url) {
            return `<img src="${this.escapeHtml(item.asset_url)}"
                         alt="${this.escapeHtml(item.name)}"
                         class="card-image"
                         loading="lazy"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="card-placeholder" style="display: none;">${this.getLayerIcon(item.layer)}</div>`;
        }

        // Use placeholder
        if (window.ShopPlaceholders) {
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            const renderFn = window.ShopPlaceholders[`render_${item.layer}`];
            if (renderFn) {
                renderFn(ctx, 100, item.tier || 0);
                return `<img src="${canvas.toDataURL()}" alt="${this.escapeHtml(item.name)}" class="card-image">`;
            }
        }

        // Fallback placeholder
        const tierColor = item.tierColor || this.getTierColor(item.tier || 0);
        return `<div class="card-placeholder" style="background: linear-gradient(135deg, ${tierColor}40, ${tierColor}20);">
                    ${this.getLayerIcon(item.layer)}
                </div>`;
    },

    /**
     * Render item badges
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderBadges(item) {
        const badges = [];

        // New item badge
        if (item.created_at) {
            const daysSinceCreated = (Date.now() - new Date(item.created_at)) / (1000 * 60 * 60 * 24);
            if (daysSinceCreated < 7) {
                badges.push('<span class="item-badge new">NEW</span>');
            }
        }

        // Limited item badge
        if (item.is_limited) {
            badges.push('<span class="item-badge limited">LIMITED</span>');
        }

        // Urgency badge
        if (item.urgency === 'high') {
            badges.push('<span class="item-badge urgency-high">ENDING SOON</span>');
        } else if (item.urgency === 'medium') {
            badges.push('<span class="item-badge urgency-medium">LIMITED TIME</span>');
        }

        // Stock counter for limited items
        if (item.is_limited && item.quantity_limit) {
            const remaining = item.quantity_limit - (item.quantity_sold || 0);
            const percentage = (remaining / item.quantity_limit) * 100;
            badges.push(`
                <span class="stock-badge ${percentage < 20 ? 'low' : ''}">
                    ${remaining}/${item.quantity_limit} left
                </span>
            `);
        }

        // Discount badge
        if (item.discount && item.discount > 0) {
            badges.push(`<span class="item-badge discount">-${item.discount}%</span>`);
        }

        if (badges.length === 0) return '';

        return `<div class="card-badges">${badges.join('')}</div>`;
    },

    /**
     * Render price display
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderPrice(item) {
        const burnPrice = item.burnPrice || item.price || 0;
        const ingamePrice = item.ingamePrice || Math.round(burnPrice * 1.5);
        const hasDiscount = item.discount && item.discount > 0;
        const originalPrice = hasDiscount ? item.originalPrice || Math.round(burnPrice / (1 - item.discount / 100)) : null;

        return `
            <div class="card-price">
                ${hasDiscount ? `<span class="original-price">🔥 ${this.formatPrice(originalPrice)}</span>` : ''}
                <div class="price-options">
                    ${item.acceptsBurn !== false ? `
                        <span class="price burn-price" title="Burn tokens">
                            🔥 ${this.formatPrice(burnPrice)}
                        </span>
                    ` : ''}
                    ${item.acceptsIngame !== false ? `
                        <span class="price ingame-price" title="In-game coins">
                            🪙 ${this.formatPrice(ingamePrice)}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Render favorite button
     * @param {Object} item - Item data
     * @returns {string} HTML string
     */
    renderFavoriteButton(item) {
        const isFavorite = item.favorited || false;
        return `
            <button class="favorite-btn ${isFavorite ? 'active' : ''}"
                    data-item-id="${this.escapeHtml(item.id)}"
                    title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                ${isFavorite ? '❤️' : '🤍'}
            </button>
        `;
    },

    // ============================================
    // GRID RENDERING
    // ============================================

    /**
     * Render a grid of item cards
     * @param {Array} items - Items to render
     * @param {Object} options - Grid options
     * @returns {string} HTML string
     */
    renderGrid(items, options = {}) {
        if (!Array.isArray(items) || items.length === 0) {
            return this.renderEmptyState(options.emptyMessage);
        }

        const cardOptions = {
            showPrice: options.showPrice !== false,
            showFavorite: options.showFavorite !== false,
            compact: options.compact || false
        };

        const selectedId = options.selectedId || null;

        return `
            <div class="shop-item-grid ${options.compact ? 'compact' : ''}">
                ${items.map(item => this.render(item, {
                    ...cardOptions,
                    selected: item.id === selectedId
                })).join('')}
            </div>
        `;
    },

    /**
     * Render empty state
     * @param {string} message - Custom message
     * @returns {string} HTML string
     */
    renderEmptyState(message) {
        return `
            <div class="shop-empty-state">
                <div class="empty-icon">🛍️</div>
                <div class="empty-message">${this.escapeHtml(message) || 'No items found'}</div>
                <div class="empty-hint">Try adjusting your filters</div>
            </div>
        `;
    },

    /**
     * Render loading skeleton
     * @param {number} count - Number of skeleton cards
     * @returns {string} HTML string
     */
    renderSkeleton(count = 8) {
        const skeletons = [];
        for (let i = 0; i < count; i++) {
            skeletons.push(`
                <div class="shop-item-card skeleton">
                    <div class="skeleton-thumbnail"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-name"></div>
                        <div class="skeleton-tier"></div>
                    </div>
                    <div class="skeleton-price"></div>
                </div>
            `);
        }
        return `<div class="shop-item-grid">${skeletons.join('')}</div>`;
    },

    // ============================================
    // EVENT BINDING
    // ============================================

    /**
     * Bind click events to grid
     * @param {HTMLElement} container - Container element
     * @param {Function} onItemClick - Item click callback
     * @param {Function} onFavoriteClick - Favorite click callback
     */
    bindEvents(container, onItemClick, onFavoriteClick) {
        if (!container) return;

        // Item card clicks
        container.querySelectorAll('.shop-item-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking favorite button
                if (e.target.closest('.favorite-btn')) return;

                const itemId = card.dataset.itemId;
                if (onItemClick && itemId) {
                    onItemClick(itemId);
                }
            });
        });

        // Favorite button clicks
        container.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                if (onFavoriteClick && itemId) {
                    onFavoriteClick(itemId);
                    // Toggle visual state immediately
                    btn.classList.toggle('active');
                    btn.innerHTML = btn.classList.contains('active') ? '❤️' : '🤍';
                }
            });
        });
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
    module.exports = { ShopItemCard };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopItemCard = ShopItemCard;
}
