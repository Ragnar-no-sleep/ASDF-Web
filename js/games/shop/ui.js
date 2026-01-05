/**
 * ASDF Shop V2 - Main UI Component
 *
 * Renders the complete shop interface with:
 * - Header with currency display
 * - Tab navigation
 * - Filter sidebar
 * - Item grid
 * - Preview panel
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// UI RENDERER
// ============================================

const ShopUI = {
    // Container element
    container: null,

    // State reference
    state: null,

    // Sub-component references
    canvasInstance: null,

    // Configuration
    config: {
        gridColumns: 4,
        itemsPerPage: 24,
        showFilters: true,
        showPreview: true
    },

    // Current page
    currentPage: 0,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize shop UI
     * @param {HTMLElement} container - Container element
     * @param {Object} state - ShopStateV2 instance
     * @param {Object} options - UI options
     */
    init(container, state, options = {}) {
        this.container = container;
        this.state = state;
        this.config = { ...this.config, ...options };

        // Subscribe to state changes
        this.subscribeToState();

        // Initial render
        this.render();

        console.log('[ShopUI] Initialized');
    },

    /**
     * Subscribe to state events
     */
    subscribeToState() {
        this.state.subscribe('catalog-updated', () => this.renderItemGrid());
        this.state.subscribe('filters-updated', () => this.renderItemGrid());
        this.state.subscribe('tab-changed', () => this.renderTabs());
        this.state.subscribe('item-selected', (item) => this.renderPreview(item));
        this.state.subscribe('preview-updated', () => this.updateCanvasPreview());
        this.state.subscribe('favorites-updated', () => this.renderItemGrid());
        this.state.subscribe('equipped-updated', () => this.updateCanvasPreview());
        this.state.subscribe('currency-updated', () => this.renderHeader());
        this.state.subscribe('loading-changed', (loading) => this.setLoading(loading));
        this.state.subscribe('error', (error) => this.showError(error));
    },

    // ============================================
    // MAIN RENDER
    // ============================================

    /**
     * Render complete shop UI
     */
    render() {
        this.container.innerHTML = `
            <div class="shop-container">
                ${this.renderHeaderHTML()}
                ${this.renderTabsHTML()}
                <div class="shop-content">
                    ${this.config.showFilters ? this.renderFiltersHTML() : ''}
                    <div class="shop-main">
                        <div class="shop-grid" id="shop-grid">
                            ${this.renderItemGridHTML()}
                        </div>
                        ${this.renderPaginationHTML()}
                    </div>
                    ${this.config.showPreview ? this.renderPreviewHTML() : ''}
                </div>
            </div>
            <div class="shop-loading" id="shop-loading" style="display: none;">
                <div class="shop-loading-spinner"></div>
                <span>Loading...</span>
            </div>
        `;

        // Attach event listeners
        this.attachEventListeners();

        // Initialize canvas
        this.initCanvas();
    },

    // ============================================
    // HEADER
    // ============================================

    renderHeaderHTML() {
        const events = this.state.events || [];
        const activeEvent = events[0];

        return `
            <div class="shop-header">
                <div class="shop-header-left">
                    <h2 class="shop-title">
                        <span class="shop-title-icon">🛍️</span>
                        Cosmetic Shop
                    </h2>
                    ${activeEvent ? `
                        <div class="shop-event-banner">
                            <span class="shop-event-icon">🎉</span>
                            <span class="shop-event-name">${this.escapeHtml(activeEvent.name)}</span>
                            ${activeEvent.discount_percent > 0 ? `<span class="shop-event-discount">-${activeEvent.discount_percent}%</span>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="shop-header-right">
                    <div class="shop-currency" title="Token Balance">
                        <span class="currency-icon">🔥</span>
                        <span class="currency-amount" id="currency-burn">${this.formatNumber(this.state.currency.burn)}</span>
                    </div>
                    <div class="shop-currency" title="Arena Coins">
                        <span class="currency-icon">🪙</span>
                        <span class="currency-amount" id="currency-ingame">${this.formatNumber(this.state.currency.ingame)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderHeader() {
        const header = this.container.querySelector('.shop-header-right');
        if (header) {
            header.innerHTML = `
                <div class="shop-currency" title="Token Balance">
                    <span class="currency-icon">🔥</span>
                    <span class="currency-amount" id="currency-burn">${this.formatNumber(this.state.currency.burn)}</span>
                </div>
                <div class="shop-currency" title="Arena Coins">
                    <span class="currency-icon">🪙</span>
                    <span class="currency-amount" id="currency-ingame">${this.formatNumber(this.state.currency.ingame)}</span>
                </div>
            `;
        }
    },

    // ============================================
    // TABS
    // ============================================

    renderTabsHTML() {
        const tabs = [
            { id: 'all', label: 'All Items', icon: '🏪' },
            { id: 'inventory', label: 'Inventory', icon: '📦' },
            { id: 'collections', label: 'Collections', icon: '📚' },
            { id: 'favorites', label: 'Favorites', icon: '⭐' }
        ];

        return `
            <div class="shop-tabs">
                ${tabs.map(tab => `
                    <button class="shop-tab ${this.state.activeTab === tab.id ? 'active' : ''}"
                            data-tab="${tab.id}">
                        <span class="shop-tab-icon">${tab.icon}</span>
                        <span class="shop-tab-label">${tab.label}</span>
                        ${tab.id === 'favorites' ? `<span class="shop-tab-count">${this.state.favorites.length}</span>` : ''}
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderTabs() {
        const tabsContainer = this.container.querySelector('.shop-tabs');
        if (tabsContainer) {
            tabsContainer.innerHTML = this.renderTabsHTML().replace(/<div class="shop-tabs">|<\/div>$/g, '');
            this.attachTabListeners();
        }
        this.currentPage = 0;
        this.renderItemGrid();
    },

    // ============================================
    // FILTERS
    // ============================================

    renderFiltersHTML() {
        const layers = ['background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held'];
        const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

        return `
            <div class="shop-sidebar">
                <div class="shop-filters">
                    <div class="shop-filter-section">
                        <h4 class="shop-filter-title">Search</h4>
                        <input type="text" class="shop-search" id="shop-search"
                               placeholder="Search items..."
                               value="${this.escapeHtml(this.state.filters.search || '')}">
                    </div>

                    <div class="shop-filter-section">
                        <h4 class="shop-filter-title">Layer</h4>
                        <div class="shop-filter-options">
                            <button class="shop-filter-btn ${!this.state.filters.layer ? 'active' : ''}"
                                    data-filter="layer" data-value="">All</button>
                            ${layers.map(layer => `
                                <button class="shop-filter-btn ${this.state.filters.layer === layer ? 'active' : ''}"
                                        data-filter="layer" data-value="${layer}">
                                    ${this.capitalizeFirst(layer)}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="shop-filter-section">
                        <h4 class="shop-filter-title">Rarity</h4>
                        <div class="shop-filter-options">
                            <button class="shop-filter-btn ${!this.state.filters.rarity ? 'active' : ''}"
                                    data-filter="rarity" data-value="">All</button>
                            ${rarities.map(rarity => `
                                <button class="shop-filter-btn rarity-${rarity} ${this.state.filters.rarity === rarity ? 'active' : ''}"
                                        data-filter="rarity" data-value="${rarity}">
                                    ${this.capitalizeFirst(rarity)}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="shop-filter-section">
                        <h4 class="shop-filter-title">Ownership</h4>
                        <div class="shop-filter-options">
                            <button class="shop-filter-btn ${this.state.filters.owned === null ? 'active' : ''}"
                                    data-filter="owned" data-value="">All</button>
                            <button class="shop-filter-btn ${this.state.filters.owned === true ? 'active' : ''}"
                                    data-filter="owned" data-value="true">Owned</button>
                            <button class="shop-filter-btn ${this.state.filters.owned === false ? 'active' : ''}"
                                    data-filter="owned" data-value="false">Not Owned</button>
                        </div>
                    </div>

                    <button class="shop-filter-reset" id="filter-reset">
                        Reset Filters
                    </button>
                </div>

                ${this.renderCollectionsListHTML()}
            </div>
        `;
    },

    renderCollectionsListHTML() {
        const collections = this.state.collections || [];
        if (collections.length === 0) return '';

        return `
            <div class="shop-collections-list">
                <h4 class="shop-filter-title">Collections</h4>
                ${collections.map(col => `
                    <div class="shop-collection-item ${this.state.filters.collection === col.id ? 'active' : ''}"
                         data-collection="${col.id}">
                        <span class="collection-icon">${col.icon || '📦'}</span>
                        <span class="collection-name">${this.escapeHtml(col.name)}</span>
                        <span class="collection-progress">${col.owned_count || 0}/${col.total_items}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // ============================================
    // ITEM GRID
    // ============================================

    renderItemGridHTML() {
        const items = this.state.getTabItems();
        const start = this.currentPage * this.config.itemsPerPage;
        const pageItems = items.slice(start, start + this.config.itemsPerPage);

        if (pageItems.length === 0) {
            return `
                <div class="shop-empty">
                    <span class="shop-empty-icon">🔍</span>
                    <p>No items found</p>
                    ${this.state.activeTab !== 'all' ? '<p class="shop-empty-hint">Try a different tab or reset filters</p>' : ''}
                </div>
            `;
        }

        return pageItems.map(item => this.renderItemCard(item)).join('');
    },

    renderItemGrid() {
        const grid = this.container.querySelector('#shop-grid');
        if (grid) {
            grid.innerHTML = this.renderItemGridHTML();
            this.attachItemListeners();
        }
        this.renderPagination();
    },

    renderItemCard(item) {
        const isSelected = this.state.selectedItem?.id === item.id;
        const isFavorited = this.state.isFavorited(item.id);
        const isEquipped = this.state.isEquipped(item.id);

        // Get availability badges
        const badges = [];
        if (item.is_limited) badges.push({ class: 'limited', text: 'LIMITED' });
        if (item.urgency === 'high') badges.push({ class: 'ending', text: 'ENDING SOON' });
        if (item.owned) badges.push({ class: 'owned', text: 'OWNED' });
        if (isEquipped) badges.push({ class: 'equipped', text: 'EQUIPPED' });

        // Get placeholder or real image
        const imageUrl = item.asset_url || (window.ShopPlaceholders ?
            window.ShopPlaceholders.generate(item.layer, item.tier, 128) :
            '');

        return `
            <div class="shop-item ${isSelected ? 'selected' : ''} ${item.owned ? 'owned' : ''}"
                 data-item-id="${item.id}"
                 style="--tier-color: ${item.tierColor || '#9ca3af'}">
                <div class="shop-item-image">
                    <img src="${imageUrl}" alt="${this.escapeHtml(item.name)}" loading="lazy">
                    ${badges.length > 0 ? `
                        <div class="shop-item-badges">
                            ${badges.map(b => `<span class="shop-badge ${b.class}">${b.text}</span>`).join('')}
                        </div>
                    ` : ''}
                    <button class="shop-item-favorite ${isFavorited ? 'active' : ''}"
                            data-favorite="${item.id}"
                            title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                        ${isFavorited ? '⭐' : '☆'}
                    </button>
                </div>
                <div class="shop-item-info">
                    <span class="shop-item-layer">${this.escapeHtml(this.capitalizeFirst(item.layer))}</span>
                    <h4 class="shop-item-name">${this.escapeHtml(item.name)}</h4>
                    <div class="shop-item-tier" style="color: ${this.escapeHtml(item.tierColor)}">
                        ${this.escapeHtml(item.tierName || 'Common')}
                    </div>
                    ${!item.owned ? `
                        <div class="shop-item-prices">
                            ${item.acceptsBurn ? `
                                <span class="shop-price burn">🔥 ${this.formatNumber(item.burnPrice)}</span>
                            ` : ''}
                            ${item.acceptsIngame ? `
                                <span class="shop-price ingame">🪙 ${this.formatNumber(item.ingamePrice)}</span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // ============================================
    // PAGINATION
    // ============================================

    renderPaginationHTML() {
        const items = this.state.getTabItems();
        const totalPages = Math.ceil(items.length / this.config.itemsPerPage);

        if (totalPages <= 1) return '<div class="shop-pagination"></div>';

        return `
            <div class="shop-pagination">
                <button class="shop-page-btn" data-page="prev" ${this.currentPage === 0 ? 'disabled' : ''}>
                    ← Prev
                </button>
                <span class="shop-page-info">
                    Page ${this.currentPage + 1} of ${totalPages}
                </span>
                <button class="shop-page-btn" data-page="next" ${this.currentPage >= totalPages - 1 ? 'disabled' : ''}>
                    Next →
                </button>
            </div>
        `;
    },

    renderPagination() {
        const paginationContainer = this.container.querySelector('.shop-pagination');
        if (paginationContainer) {
            paginationContainer.outerHTML = this.renderPaginationHTML();
            this.attachPaginationListeners();
        }
    },

    // ============================================
    // PREVIEW PANEL
    // ============================================

    renderPreviewHTML() {
        return `
            <div class="shop-preview">
                <div class="shop-preview-canvas-container">
                    <canvas id="shop-avatar-canvas" width="300" height="300"></canvas>
                    <div class="shop-preview-controls">
                        <button class="preview-control-btn" id="preview-reset" title="Reset view">↺</button>
                        <button class="preview-control-btn" id="preview-export" title="Export image">💾</button>
                    </div>
                </div>
                <div class="shop-preview-details" id="shop-preview-details">
                    <p class="shop-preview-hint">Select an item to preview</p>
                </div>
            </div>
        `;
    },

    renderPreview(item) {
        const details = this.container.querySelector('#shop-preview-details');
        if (!details) return;

        if (!item) {
            details.innerHTML = '<p class="shop-preview-hint">Select an item to preview</p>';
            return;
        }

        const isFavorited = this.state.isFavorited(item.id);
        const isOwned = item.owned;
        const isEquipped = this.state.isEquipped(item.id);

        details.innerHTML = `
            <h3 class="preview-item-name">${this.escapeHtml(item.name)}</h3>
            <div class="preview-item-meta">
                <span class="preview-layer">${this.escapeHtml(this.capitalizeFirst(item.layer))}</span>
                <span class="preview-tier" style="color: ${this.escapeHtml(item.tierColor)}">${this.escapeHtml(item.tierName)}</span>
            </div>
            ${item.description ? `<p class="preview-description">${this.escapeHtml(item.description)}</p>` : ''}

            ${!item.available ? `
                <div class="preview-unavailable">
                    <span class="unavailable-icon">⚠️</span>
                    <span>${this.escapeHtml(item.reasons?.join(', ') || 'Not available')}</span>
                </div>
            ` : ''}

            ${item.is_limited ? `
                <div class="preview-limited">
                    ${item.quantity_limit ? `<span>Stock: ${item.quantity_limit - (item.quantity_sold || 0)} / ${item.quantity_limit}</span>` : ''}
                    ${item.available_until ? `<span>Ends: ${new Date(item.available_until).toLocaleDateString()}</span>` : ''}
                </div>
            ` : ''}

            <div class="preview-actions">
                <button class="preview-btn try-on" data-action="tryOn" data-item="${item.id}">
                    👁️ Try On
                </button>
                <button class="preview-btn favorite ${isFavorited ? 'active' : ''}"
                        data-action="favorite" data-item="${item.id}">
                    ${isFavorited ? '⭐ Favorited' : '☆ Favorite'}
                </button>
            </div>

            ${isOwned ? `
                <div class="preview-owned-actions">
                    ${isEquipped ? `
                        <button class="preview-btn unequip" data-action="unequip" data-layer="${item.layer}">
                            ✓ Equipped - Click to Remove
                        </button>
                    ` : `
                        <button class="preview-btn equip" data-action="equip" data-item="${item.id}">
                            🎨 Equip Item
                        </button>
                    `}
                </div>
            ` : `
                <div class="preview-purchase">
                    <div class="preview-prices">
                        ${item.acceptsBurn ? `
                            <div class="preview-price">
                                <span class="price-label">Burn Price</span>
                                <span class="price-amount burn">🔥 ${this.formatNumber(item.burnPrice)}</span>
                                ${item.discount > 0 ? `<span class="price-discount">-${Math.round(item.discount / item.basePrice * 100)}%</span>` : ''}
                            </div>
                        ` : ''}
                        ${item.acceptsIngame ? `
                            <div class="preview-price">
                                <span class="price-label">Coin Price</span>
                                <span class="price-amount ingame">🪙 ${this.formatNumber(item.ingamePrice)}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${item.available ? `
                        <button class="preview-btn purchase" data-action="purchase" data-item="${item.id}">
                            💳 Purchase
                        </button>
                    ` : ''}
                </div>
            `}
        `;

        this.attachPreviewListeners();
    },

    // ============================================
    // CANVAS
    // ============================================

    initCanvas() {
        const canvas = this.container.querySelector('#shop-avatar-canvas');
        if (!canvas || !window.ShopCanvas) return;

        this.canvasInstance = Object.create(ShopCanvas);
        this.canvasInstance.init(canvas, {
            size: 300,
            interactive: true,
            onLoad: () => console.log('[ShopUI] Canvas loaded'),
            onError: (err) => console.error('[ShopUI] Canvas error:', err)
        });

        // Load current equipped
        this.updateCanvasPreview();
    },

    updateCanvasPreview() {
        if (!this.canvasInstance) return;

        const equipped = this.state.getCurrentEquipped();
        this.canvasInstance.loadEquipped(equipped);

        // Add particles for high-tier equipped items
        this.canvasInstance.clearParticles();
        if (window.ShopParticles) {
            for (const layer of ['aura', 'skin']) {
                const itemId = equipped[layer];
                if (itemId) {
                    const item = this.state.catalog.find(i => i.id === itemId);
                    if (item && item.tier >= 5) {
                        const effectType = ShopParticles.getEffectForTier(item.tier);
                        if (effectType) {
                            const system = ShopParticles.createSystem(effectType, {
                                x: 0, y: 0,
                                width: 300, height: 300
                            }, layer);
                            if (system) {
                                this.canvasInstance.addParticleSystem(system);
                            }
                        }
                    }
                }
            }
        }
    },

    // ============================================
    // EVENT LISTENERS
    // ============================================

    attachEventListeners() {
        this.attachTabListeners();
        this.attachFilterListeners();
        this.attachItemListeners();
        this.attachPaginationListeners();
        this.attachPreviewListeners();
        this.attachCanvasListeners();
    },

    attachTabListeners() {
        this.container.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.state.setActiveTab(tab.dataset.tab);
            });
        });
    },

    attachFilterListeners() {
        // Search input
        const search = this.container.querySelector('#shop-search');
        if (search) {
            let debounceTimer;
            search.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.state.updateFilters({ search: e.target.value });
                }, 300);
            });
        }

        // Filter buttons
        this.container.querySelectorAll('.shop-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                let value = btn.dataset.value;

                // Convert value types
                if (value === '') value = null;
                else if (value === 'true') value = true;
                else if (value === 'false') value = false;

                this.state.updateFilters({ [filter]: value });
            });
        });

        // Reset button
        const reset = this.container.querySelector('#filter-reset');
        if (reset) {
            reset.addEventListener('click', () => {
                this.state.resetFilters();
                const search = this.container.querySelector('#shop-search');
                if (search) search.value = '';
            });
        }

        // Collection items
        this.container.querySelectorAll('.shop-collection-item').forEach(item => {
            item.addEventListener('click', () => {
                const colId = item.dataset.collection;
                const current = this.state.filters.collection;
                this.state.updateFilters({ collection: current === colId ? null : colId });
            });
        });
    },

    attachItemListeners() {
        // Item cards
        this.container.querySelectorAll('.shop-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't select if clicking favorite button
                if (e.target.closest('.shop-item-favorite')) return;
                this.state.selectItem(item.dataset.itemId);
            });
        });

        // Favorite buttons
        this.container.querySelectorAll('.shop-item-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.favorite;
                this.handleFavoriteToggle(itemId);
            });
        });
    },

    attachPaginationListeners() {
        this.container.querySelectorAll('.shop-page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.page;
                if (action === 'prev' && this.currentPage > 0) {
                    this.currentPage--;
                } else if (action === 'next') {
                    this.currentPage++;
                }
                this.renderItemGrid();
            });
        });
    },

    attachPreviewListeners() {
        this.container.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const itemId = btn.dataset.item;
                const layer = btn.dataset.layer;

                switch (action) {
                    case 'tryOn':
                        this.handleTryOn(itemId);
                        break;
                    case 'favorite':
                        this.handleFavoriteToggle(itemId);
                        break;
                    case 'equip':
                        this.handleEquip(itemId);
                        break;
                    case 'unequip':
                        this.handleUnequip(layer);
                        break;
                    case 'purchase':
                        this.handlePurchase(itemId);
                        break;
                }
            });
        });
    },

    attachCanvasListeners() {
        const resetBtn = this.container.querySelector('#preview-reset');
        if (resetBtn && this.canvasInstance) {
            resetBtn.addEventListener('click', () => {
                this.canvasInstance.resetView();
            });
        }

        const exportBtn = this.container.querySelector('#preview-export');
        if (exportBtn && this.canvasInstance) {
            exportBtn.addEventListener('click', () => {
                const dataUrl = this.canvasInstance.exportToDataURL();
                const link = document.createElement('a');
                link.download = 'asdf-avatar.png';
                link.href = dataUrl;
                link.click();
            });
        }
    },

    // ============================================
    // HANDLERS
    // ============================================

    async handleFavoriteToggle(itemId) {
        // Optimistic update
        const wasFavorited = this.state.toggleFavoriteLocal(itemId);

        // Sync with server
        if (window.ShopSync) {
            try {
                await ShopSync.toggleFavorite(itemId);
            } catch (err) {
                // Revert on error
                this.state.toggleFavoriteLocal(itemId);
                this.showError('Failed to update favorite');
            }
        }
    },

    handleTryOn(itemId) {
        const item = this.state.catalog.find(i => i.id === itemId);
        if (item) {
            this.state.previewItem(itemId);
        }
    },

    async handleEquip(itemId) {
        const item = this.state.catalog.find(i => i.id === itemId);
        if (!item) return;

        // Optimistic update
        this.state.equipItemLocal(itemId, item.layer);

        // Sync with server
        if (window.ShopSync) {
            try {
                await ShopSync.equipItem(itemId);
            } catch (err) {
                this.showError('Failed to equip item');
            }
        }

        // Update preview
        this.renderPreview(item);
    },

    async handleUnequip(layer) {
        // Optimistic update
        this.state.unequipLayerLocal(layer);

        // Sync with server
        if (window.ShopSync) {
            try {
                await ShopSync.unequipLayer(layer);
            } catch (err) {
                this.showError('Failed to unequip item');
            }
        }

        // Update preview if item still selected
        if (this.state.selectedItem) {
            this.renderPreview(this.state.selectedItem);
        }
    },

    handlePurchase(itemId) {
        const item = this.state.catalog.find(i => i.id === itemId);
        if (!item) return;

        // Emit purchase event for external handling
        this.state.emit('purchase-requested', item);

        // Or use ShopPurchase if available
        if (window.ShopPurchase) {
            window.ShopPurchase.showPurchaseModal(item, this.state);
        }
    },

    // ============================================
    // UTILITIES
    // ============================================

    setLoading(loading) {
        const loadingEl = this.container.querySelector('#shop-loading');
        if (loadingEl) {
            loadingEl.style.display = loading ? 'flex' : 'none';
        }
    },

    showError(message) {
        console.error('[ShopUI] Error:', message);
        // Could show toast notification here
    },

    /**
     * Escape HTML to prevent XSS - optimized version
     * @param {*} str - Value to escape
     * @returns {string} Escaped string
     */
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    },

    /**
     * Format number for display - with validation
     * @param {*} num - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(num) {
        const n = Number(num);
        if (!Number.isFinite(n)) return '0';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
    },

    /**
     * Capitalize first letter - with validation
     * @param {*} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // ============================================
    // CLEANUP
    // ============================================

    destroy() {
        if (this.canvasInstance) {
            this.canvasInstance.destroy();
        }
        this.container.innerHTML = '';
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopUI };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopUI = ShopUI;
}
