/**
 * ASDF Shop V2 - Filters Component
 *
 * Handles filtering, searching, and sorting of shop items
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// FILTER CONFIGURATION
// ============================================

const FILTER_CONFIG = {
    layers: [
        { id: 'all', name: 'All Layers', icon: '🎨' },
        { id: 'background', name: 'Background', icon: '🖼️' },
        { id: 'aura', name: 'Aura', icon: '✨' },
        { id: 'skin', name: 'Skin', icon: '🐕' },
        { id: 'outfit', name: 'Outfit', icon: '👕' },
        { id: 'eyes', name: 'Eyes', icon: '👁️' },
        { id: 'head', name: 'Head', icon: '🎩' },
        { id: 'held', name: 'Held Item', icon: '🗡️' }
    ],
    rarities: [
        { id: 'all', name: 'All Rarities', color: '#9ca3af' },
        { id: 'common', name: 'Common', color: '#9ca3af' },
        { id: 'uncommon', name: 'Uncommon', color: '#22c55e' },
        { id: 'rare', name: 'Rare', color: '#3b82f6' },
        { id: 'epic', name: 'Epic', color: '#a855f7' },
        { id: 'legendary', name: 'Legendary', color: '#f97316' }
    ],
    sortOptions: [
        { id: 'tier-desc', name: 'Tier (High to Low)', field: 'tier', asc: false },
        { id: 'tier-asc', name: 'Tier (Low to High)', field: 'tier', asc: true },
        { id: 'price-desc', name: 'Price (High to Low)', field: 'price', asc: false },
        { id: 'price-asc', name: 'Price (Low to High)', field: 'price', asc: true },
        { id: 'name-asc', name: 'Name (A-Z)', field: 'name', asc: true },
        { id: 'name-desc', name: 'Name (Z-A)', field: 'name', asc: false },
        { id: 'newest', name: 'Newest First', field: 'newest', asc: false }
    ],
    ownershipOptions: [
        { id: 'all', name: 'All Items' },
        { id: 'owned', name: 'Owned Only' },
        { id: 'not-owned', name: 'Not Owned' }
    ]
};

// ============================================
// SHOP FILTERS
// ============================================

const ShopFilters = {
    // Current filter state
    filters: {
        layer: 'all',
        rarity: 'all',
        ownership: 'all',
        search: '',
        sort: 'tier-desc',
        collection: null,
        priceMin: null,
        priceMax: null,
        showLimited: true,
        showUnavailable: false
    },

    // Filter container element
    container: null,

    // Callbacks
    onFilterChange: null,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize filters
     * @param {HTMLElement} container - Container element
     * @param {Function} onChange - Callback when filters change
     */
    init(container, onChange) {
        this.container = container;
        this.onFilterChange = onChange;
        this.render();
        console.log('[ShopFilters] Initialized');
    },

    /**
     * Reset filters to default
     */
    reset() {
        this.filters = {
            layer: 'all',
            rarity: 'all',
            ownership: 'all',
            search: '',
            sort: 'tier-desc',
            collection: null,
            priceMin: null,
            priceMax: null,
            showLimited: true,
            showUnavailable: false
        };
        this.render();
        this.emitChange();
    },

    // ============================================
    // RENDERING
    // ============================================

    /**
     * Render filter UI
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="shop-filters">
                <!-- Search -->
                <div class="filter-group filter-search">
                    <div class="search-input-wrapper">
                        <span class="search-icon">🔍</span>
                        <input type="text"
                               class="filter-search-input"
                               placeholder="Search items..."
                               value="${this.escapeHtml(this.filters.search)}"
                               maxlength="50">
                        ${this.filters.search ? '<button class="search-clear">&times;</button>' : ''}
                    </div>
                </div>

                <!-- Layer Filter -->
                <div class="filter-group">
                    <label class="filter-label">Layer</label>
                    <div class="filter-chips">
                        ${FILTER_CONFIG.layers.map(layer => `
                            <button class="filter-chip ${this.filters.layer === layer.id ? 'active' : ''}"
                                    data-filter="layer"
                                    data-value="${layer.id}">
                                <span class="chip-icon">${layer.icon}</span>
                                <span class="chip-label">${layer.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Rarity Filter -->
                <div class="filter-group">
                    <label class="filter-label">Rarity</label>
                    <div class="filter-chips rarity-chips">
                        ${FILTER_CONFIG.rarities.map(rarity => `
                            <button class="filter-chip ${this.filters.rarity === rarity.id ? 'active' : ''}"
                                    data-filter="rarity"
                                    data-value="${rarity.id}"
                                    style="--rarity-color: ${rarity.color}">
                                <span class="chip-dot" style="background: ${rarity.color}"></span>
                                <span class="chip-label">${rarity.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Ownership Filter -->
                <div class="filter-group">
                    <label class="filter-label">Ownership</label>
                    <div class="filter-buttons">
                        ${FILTER_CONFIG.ownershipOptions.map(opt => `
                            <button class="filter-btn ${this.filters.ownership === opt.id ? 'active' : ''}"
                                    data-filter="ownership"
                                    data-value="${opt.id}">
                                ${opt.name}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Sort -->
                <div class="filter-group">
                    <label class="filter-label">Sort By</label>
                    <select class="filter-select" data-filter="sort">
                        ${FILTER_CONFIG.sortOptions.map(opt => `
                            <option value="${opt.id}" ${this.filters.sort === opt.id ? 'selected' : ''}>
                                ${opt.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <!-- Additional Options -->
                <div class="filter-group filter-options">
                    <label class="filter-checkbox">
                        <input type="checkbox"
                               data-filter="showLimited"
                               ${this.filters.showLimited ? 'checked' : ''}>
                        <span>Show Limited Items</span>
                    </label>
                    <label class="filter-checkbox">
                        <input type="checkbox"
                               data-filter="showUnavailable"
                               ${this.filters.showUnavailable ? 'checked' : ''}>
                        <span>Show Unavailable</span>
                    </label>
                </div>

                <!-- Active Filters Summary -->
                ${this.renderActiveFilters()}

                <!-- Reset Button -->
                <button class="filter-reset-btn" ${this.hasActiveFilters() ? '' : 'disabled'}>
                    Reset Filters
                </button>
            </div>
        `;

        this.bindEvents();
    },

    /**
     * Render active filters summary
     */
    renderActiveFilters() {
        const active = [];

        if (this.filters.layer !== 'all') {
            const layer = FILTER_CONFIG.layers.find(l => l.id === this.filters.layer);
            if (layer) active.push({ type: 'layer', label: layer.name, icon: layer.icon });
        }

        if (this.filters.rarity !== 'all') {
            const rarity = FILTER_CONFIG.rarities.find(r => r.id === this.filters.rarity);
            if (rarity) active.push({ type: 'rarity', label: rarity.name, color: rarity.color });
        }

        if (this.filters.ownership !== 'all') {
            const ownership = FILTER_CONFIG.ownershipOptions.find(o => o.id === this.filters.ownership);
            if (ownership) active.push({ type: 'ownership', label: ownership.name });
        }

        if (this.filters.search) {
            active.push({ type: 'search', label: `"${this.filters.search}"` });
        }

        if (active.length === 0) return '';

        return `
            <div class="active-filters">
                <span class="active-filters-label">Active:</span>
                ${active.map(f => `
                    <span class="active-filter-tag" data-type="${f.type}">
                        ${f.icon || ''} ${this.escapeHtml(f.label)}
                        <button class="tag-remove" data-remove="${f.type}">&times;</button>
                    </span>
                `).join('')}
            </div>
        `;
    },

    /**
     * Bind event handlers
     */
    bindEvents() {
        if (!this.container) return;

        // Search input
        const searchInput = this.container.querySelector('.filter-search-input');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.setFilter('search', e.target.value.trim());
                }, 300);
            });
        }

        // Search clear
        const searchClear = this.container.querySelector('.search-clear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                this.setFilter('search', '');
            });
        }

        // Filter chips
        this.container.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const filter = chip.dataset.filter;
                const value = chip.dataset.value;
                this.setFilter(filter, value);
            });
        });

        // Filter buttons
        this.container.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                const value = btn.dataset.value;
                this.setFilter(filter, value);
            });
        });

        // Select dropdowns
        this.container.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter, e.target.value);
            });
        });

        // Checkboxes
        this.container.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter, e.target.checked);
            });
        });

        // Active filter tag removal
        this.container.querySelectorAll('.tag-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.remove;
                this.clearFilter(type);
            });
        });

        // Reset button
        const resetBtn = this.container.querySelector('.filter-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
    },

    // ============================================
    // FILTER OPERATIONS
    // ============================================

    /**
     * Set a filter value
     * @param {string} key - Filter key
     * @param {*} value - Filter value
     */
    setFilter(key, value) {
        if (!(key in this.filters)) return;

        this.filters[key] = value;
        this.render();
        this.emitChange();
    },

    /**
     * Clear a specific filter
     * @param {string} key - Filter key to clear
     */
    clearFilter(key) {
        const defaults = {
            layer: 'all',
            rarity: 'all',
            ownership: 'all',
            search: '',
            collection: null
        };

        if (key in defaults) {
            this.filters[key] = defaults[key];
            this.render();
            this.emitChange();
        }
    },

    /**
     * Get current filters
     * @returns {Object} Current filter state
     */
    getFilters() {
        return { ...this.filters };
    },

    /**
     * Check if any filters are active
     * @returns {boolean}
     */
    hasActiveFilters() {
        return this.filters.layer !== 'all' ||
               this.filters.rarity !== 'all' ||
               this.filters.ownership !== 'all' ||
               this.filters.search !== '' ||
               this.filters.collection !== null;
    },

    /**
     * Emit filter change event
     */
    emitChange() {
        if (this.onFilterChange) {
            this.onFilterChange(this.getFilters());
        }
    },

    // ============================================
    // FILTERING LOGIC
    // ============================================

    /**
     * Apply filters to items array
     * @param {Array} items - Items to filter
     * @param {Object} context - Context with inventory, etc.
     * @returns {Array} Filtered items
     */
    applyFilters(items, context = {}) {
        if (!Array.isArray(items)) return [];

        let filtered = [...items];

        // Layer filter
        if (this.filters.layer !== 'all') {
            filtered = filtered.filter(item => item.layer === this.filters.layer);
        }

        // Rarity filter
        if (this.filters.rarity !== 'all') {
            filtered = filtered.filter(item => {
                const itemRarity = item.rarity || this.getTierRarity(item.tier);
                return itemRarity === this.filters.rarity;
            });
        }

        // Ownership filter
        if (this.filters.ownership !== 'all' && context.inventory) {
            const ownedIds = new Set(context.inventory.map(i => i.id));
            if (this.filters.ownership === 'owned') {
                filtered = filtered.filter(item => ownedIds.has(item.id));
            } else if (this.filters.ownership === 'not-owned') {
                filtered = filtered.filter(item => !ownedIds.has(item.id));
            }
        }

        // Search filter
        if (this.filters.search) {
            const searchLower = this.filters.search.toLowerCase();
            filtered = filtered.filter(item => {
                const name = (item.name || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                const layer = (item.layer || '').toLowerCase();
                return name.includes(searchLower) ||
                       desc.includes(searchLower) ||
                       layer.includes(searchLower);
            });
        }

        // Collection filter
        if (this.filters.collection) {
            filtered = filtered.filter(item => item.collection_id === this.filters.collection);
        }

        // Show limited filter
        if (!this.filters.showLimited) {
            filtered = filtered.filter(item => !item.is_limited);
        }

        // Show unavailable filter
        if (!this.filters.showUnavailable) {
            filtered = filtered.filter(item => item.available !== false);
        }

        // Apply sorting
        filtered = this.applySort(filtered);

        return filtered;
    },

    /**
     * Apply sorting to items
     * @param {Array} items - Items to sort
     * @returns {Array} Sorted items
     */
    applySort(items) {
        const sortOption = FILTER_CONFIG.sortOptions.find(o => o.id === this.filters.sort);
        if (!sortOption) return items;

        const { field, asc } = sortOption;

        return [...items].sort((a, b) => {
            let comparison = 0;

            switch (field) {
                case 'tier':
                    comparison = (b.tier || 0) - (a.tier || 0);
                    break;
                case 'price':
                    comparison = (b.burnPrice || b.price || 0) - (a.burnPrice || a.price || 0);
                    break;
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'newest':
                    comparison = new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    break;
                default:
                    comparison = 0;
            }

            return asc ? -comparison : comparison;
        });
    },

    // ============================================
    // UTILITIES (delegate to ShopUtils)
    // ============================================

    getTierRarity(tier) {
        return window.ShopUtils ? ShopUtils.getTierRarity(tier) : 'common';
    },

    escapeHtml(str) {
        return window.ShopUtils ? ShopUtils.escapeHtml(str) : String(str || '');
    }
};

// Export configuration
ShopFilters.CONFIG = FILTER_CONFIG;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopFilters, FILTER_CONFIG };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopFilters = ShopFilters;
}
