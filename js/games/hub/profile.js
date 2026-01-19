/**
 * ASDF Hub - Profile Module
 *
 * User profile with avatar, stats, achievements, and history
 *
 * @version 1.0.1
 * @security XSS protection, data validation
 */

'use strict';

// ============================================
// SECURITY UTILITIES
// ============================================

// escapeHtml provided by utils.js (loaded first)

/**
 * Validate and sanitize a number
 * @param {*} value - Value to validate
 * @param {number} defaultValue - Default if invalid
 * @returns {number}
 */
function sanitizeNumber(value, defaultValue = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : defaultValue;
}

/**
 * Validate wallet address format (Solana base58)
 * @param {string} wallet - Wallet address
 * @returns {boolean}
 */
function isValidWallet(wallet) {
    if (typeof wallet !== 'string') return false;
    // Solana addresses are 32-44 characters, base58
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet);
}

/**
 * Validate allowed history types
 */
const ALLOWED_HISTORY_TYPES = ['earn', 'purchase', 'burn', 'gift', 'refund'];

// ============================================
// PROFILE MANAGER
// ============================================

const Profile = {
    // Profile data
    data: {
        wallet: null,
        walletShort: null,
        tier: 0,
        tierName: 'Visitor',
        equipped: {},
        inventory: [],
        currency: {
            burn: 0,
            coins: 0
        },
        stats: {
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0,
            wins: 0,
            trades: 0,
            itemsOwned: 0,
            achievementsUnlocked: 0
        },
        achievements: [],
        history: []
    },

    // Inventory filter state
    inventoryFilter: 'all',

    // DOM elements
    elements: {},

    // Canvas for avatar preview
    avatarCanvas: null,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize profile module
     */
    init() {
        console.log('[Profile] Initializing...');

        // Cache DOM elements
        this.cacheElements();

        // Load data
        this.loadFromLocalStorage();

        // Setup event listeners
        this.setupEvents();

        // Initial render
        this.render();
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            container: document.getElementById('profile-section'),
            avatarCanvas: document.getElementById('profile-avatar-canvas'),
            walletAddress: document.getElementById('profile-wallet'),
            tierBadge: document.getElementById('profile-tier-badge'),
            statsGrid: document.getElementById('profile-stats-grid'),
            achievementsGrid: document.getElementById('achievements-grid'),
            historyTable: document.getElementById('history-table-body'),
            refreshBtn: document.getElementById('profile-refresh-btn'),
            // New elements
            burnBalance: document.getElementById('profile-burn-balance'),
            coinBalance: document.getElementById('profile-coin-balance'),
            inventoryGrid: document.getElementById('profile-inventory-grid'),
            inventoryFilters: document.getElementById('profile-inventory-filters'),
            openShopBtn: document.getElementById('profile-open-shop')
        };
    },

    /**
     * Setup event listeners
     */
    setupEvents() {
        // Wallet copy
        if (this.elements.walletAddress) {
            this.elements.walletAddress.addEventListener('click', () => {
                this.copyWallet();
            });
        }

        // Refresh button
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.addEventListener('click', () => {
                this.refresh();
            });
        }

        // Inventory filter buttons
        if (this.elements.inventoryFilters) {
            this.elements.inventoryFilters.addEventListener('click', (e) => {
                const btn = e.target.closest('.inv-filter-btn');
                if (!btn) return;

                // Update active state
                this.elements.inventoryFilters.querySelectorAll('.inv-filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');

                // Apply filter
                this.inventoryFilter = btn.dataset.layer;
                this.renderInventory();
            });
        }

        // Open shop button
        if (this.elements.openShopBtn) {
            this.elements.openShopBtn.addEventListener('click', () => {
                this.openShop();
            });
        }
    },

    // ============================================
    // DATA LOADING
    // ============================================

    /**
     * Load profile from localStorage
     */
    loadFromLocalStorage() {
        try {
            // Load wallet with validation
            const wallet = localStorage.getItem('connectedWallet');
            if (wallet && isValidWallet(wallet)) {
                this.data.wallet = wallet;
                this.data.walletShort = wallet.slice(0, 4) + '...' + wallet.slice(-4);
            } else {
                this.data.wallet = null;
                this.data.walletShort = null;
            }

            // Load engage tier
            const engageData = localStorage.getItem('asdf_engage');
            if (engageData) {
                const engage = JSON.parse(engageData);
                this.data.tier = engage.tier || 0;
                this.data.tierName = this.getTierName(this.data.tier);
            }

            // Load equipped items and inventory
            const shopState = localStorage.getItem('asdf_shop_state');
            if (shopState) {
                const state = JSON.parse(shopState);
                this.data.equipped = state.equipped || {};
                this.data.inventory = Array.isArray(state.inventory) ? state.inventory : [];
                this.data.stats.itemsOwned = this.data.inventory.length;
            }

            // Load currency
            const currencyData = localStorage.getItem('asdf_currency');
            if (currencyData) {
                const currency = JSON.parse(currencyData);
                this.data.currency.burn = sanitizeNumber(currency.burn, 0);
                this.data.currency.coins = sanitizeNumber(currency.coins || currency.ingame, 0);
            }

            // Load game stats
            this.loadGameStats();

            // Load achievements
            this.loadAchievements();

            // Load history
            this.loadHistory();

        } catch (e) {
            console.error('[Profile] Failed to load data:', e);
        }
    },

    /**
     * Load game statistics
     */
    loadGameStats() {
        // Pump Arena stats
        const pumpStats = localStorage.getItem('pumpArenaStats');
        if (pumpStats) {
            try {
                const stats = JSON.parse(pumpStats);
                this.data.stats.gamesPlayed = sanitizeNumber(stats.gamesPlayed, 0);
                this.data.stats.totalScore = sanitizeNumber(stats.totalProfit, 0);
                this.data.stats.bestScore = sanitizeNumber(stats.bestProfit, 0);
                this.data.stats.trades = sanitizeNumber(stats.totalTrades, 0);
            } catch (e) {
                console.warn('[Profile] Invalid pumpArenaStats data');
            }
        }

        // RPG state
        const rpgState = localStorage.getItem('pumpArenaRPG');
        if (rpgState) {
            try {
                const rpg = JSON.parse(rpgState);
                this.data.stats.wins = sanitizeNumber(rpg.wins, 0);
            } catch (e) {
                console.warn('[Profile] Invalid pumpArenaRPG data');
            }
        }
    },

    /**
     * Load achievements
     */
    loadAchievements() {
        // Define all achievements
        const allAchievements = [
            { id: 'first_trade', name: 'First Trade', icon: '📈', desc: 'Complete your first trade' },
            { id: 'profit_100', name: 'Profit Maker', icon: '💰', desc: 'Earn $100 profit' },
            { id: 'profit_1000', name: 'Rich Trader', icon: '💎', desc: 'Earn $1000 profit' },
            { id: 'games_10', name: 'Regular', icon: '🎮', desc: 'Play 10 games' },
            { id: 'games_100', name: 'Dedicated', icon: '🏆', desc: 'Play 100 games' },
            { id: 'win_streak_3', name: 'Hot Streak', icon: '🔥', desc: '3 wins in a row' },
            { id: 'cosmetic_first', name: 'Fashionista', icon: '👕', desc: 'Buy first cosmetic' },
            { id: 'cosmetic_10', name: 'Collector', icon: '🛒', desc: 'Own 10 cosmetics' },
            { id: 'tier_holder', name: 'Holder', icon: '🪙', desc: 'Become a token holder' },
            { id: 'tier_whale', name: 'Whale', icon: '🐋', desc: 'Reach whale tier' },
            { id: 'perfect_trade', name: 'Perfect', icon: '✨', desc: 'Buy at lowest, sell at highest' },
            { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', desc: 'Complete trade in 5 seconds' }
        ];

        // Load unlocked achievements
        const unlockedStr = localStorage.getItem('asdf_achievements');
        const unlocked = unlockedStr ? JSON.parse(unlockedStr) : [];

        this.data.achievements = allAchievements.map(a => ({
            ...a,
            unlocked: unlocked.includes(a.id)
        }));

        this.data.stats.achievementsUnlocked = unlocked.length;
    },

    /**
     * Load transaction history
     */
    loadHistory() {
        const historyStr = localStorage.getItem('asdf_history');
        let rawHistory = [];

        if (historyStr) {
            try {
                rawHistory = JSON.parse(historyStr);
                if (!Array.isArray(rawHistory)) {
                    rawHistory = [];
                }
            } catch (e) {
                console.warn('[Profile] Invalid history data');
                rawHistory = [];
            }
        }

        // Validate and sanitize each history entry
        this.data.history = rawHistory
            .filter(h => h && typeof h === 'object')
            .map(h => ({
                type: ALLOWED_HISTORY_TYPES.includes(h.type) ? h.type : 'earn',
                desc: String(h.desc || '').slice(0, 100), // Limit length
                amount: sanitizeNumber(h.amount, 0),
                date: this.isValidDate(h.date) ? h.date : new Date().toISOString()
            }))
            .slice(0, 50); // Max 50 entries
    },

    /**
     * Validate ISO date string
     * @param {string} dateStr - Date string to validate
     * @returns {boolean}
     */
    isValidDate(dateStr) {
        if (typeof dateStr !== 'string') return false;
        const date = new Date(dateStr);
        return !isNaN(date.getTime());
    },

    /**
     * Refresh profile data from server
     */
    async refresh() {
        console.log('[Profile] Refreshing...');

        // Show loading state
        if (this.elements.refreshBtn) {
            this.elements.refreshBtn.disabled = true;
            this.elements.refreshBtn.textContent = 'Loading...';
        }

        try {
            // Sync with backend
            if (window.ShopSync) {
                await window.ShopSync.syncInventory(window.ShopStateV2);
            }

            // Reload local data
            this.loadFromLocalStorage();

            // Re-render
            this.render();

        } catch (e) {
            console.error('[Profile] Refresh failed:', e);
        } finally {
            if (this.elements.refreshBtn) {
                this.elements.refreshBtn.disabled = false;
                this.elements.refreshBtn.textContent = 'Refresh';
            }
        }
    },

    // ============================================
    // RENDERING
    // ============================================

    /**
     * Render entire profile
     */
    render() {
        this.renderWalletInfo();
        this.renderCurrency();
        this.renderStats();
        this.renderInventory();
        this.renderAchievements();
        this.renderHistory();
        this.renderAvatar();
    },

    /**
     * Render wallet info
     */
    renderWalletInfo() {
        if (this.elements.walletAddress) {
            this.elements.walletAddress.textContent = this.data.walletShort || 'Not Connected';
        }

        if (this.elements.tierBadge) {
            this.elements.tierBadge.innerHTML = `
                <span class="tier-icon">${this.getTierIcon(this.data.tier)}</span>
                <span class="tier-name">${this.data.tierName}</span>
            `;
        }
    },

    /**
     * Render stats grid
     */
    renderStats() {
        if (!this.elements.statsGrid) return;

        const stats = this.data.stats;
        this.elements.statsGrid.innerHTML = `
            <div class="profile-stat-item">
                <div class="profile-stat-value">${stats.gamesPlayed}</div>
                <div class="profile-stat-label">Games Played</div>
            </div>
            <div class="profile-stat-item">
                <div class="profile-stat-value">$${this.formatNumber(stats.totalScore)}</div>
                <div class="profile-stat-label">Total Profit</div>
            </div>
            <div class="profile-stat-item">
                <div class="profile-stat-value">$${this.formatNumber(stats.bestScore)}</div>
                <div class="profile-stat-label">Best Score</div>
            </div>
            <div class="profile-stat-item">
                <div class="profile-stat-value">${stats.trades}</div>
                <div class="profile-stat-label">Trades</div>
            </div>
            <div class="profile-stat-item">
                <div class="profile-stat-value">${stats.itemsOwned}</div>
                <div class="profile-stat-label">Items Owned</div>
            </div>
            <div class="profile-stat-item">
                <div class="profile-stat-value">${stats.achievementsUnlocked}/${this.data.achievements.length}</div>
                <div class="profile-stat-label">Achievements</div>
            </div>
        `;
    },

    /**
     * Render achievements grid
     */
    renderAchievements() {
        if (!this.elements.achievementsGrid) return;

        // Achievements are hardcoded, but escape for defense in depth
        this.elements.achievementsGrid.innerHTML = this.data.achievements.map(a => `
            <div class="achievement-item ${a.unlocked ? '' : 'locked'}" title="${escapeHtml(a.desc)}">
                <div class="achievement-icon">${escapeHtml(a.icon)}</div>
                <div class="achievement-name">${escapeHtml(a.name)}</div>
            </div>
        `).join('');
    },

    /**
     * Render history table
     */
    renderHistory() {
        if (!this.elements.historyTable) return;

        if (this.data.history.length === 0) {
            this.elements.historyTable.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--valhalla-steel);">
                        No transactions yet
                    </td>
                </tr>
            `;
            return;
        }

        // Type is validated against whitelist, amount is sanitized number
        // Escape desc as it comes from user/external data
        this.elements.historyTable.innerHTML = this.data.history.slice(0, 10).map(h => `
            <tr>
                <td>
                    <span class="history-type ${escapeHtml(h.type)}">${escapeHtml(h.type.toUpperCase())}</span>
                </td>
                <td>${escapeHtml(h.desc)}</td>
                <td>
                    <span class="history-amount ${h.amount >= 0 ? 'positive' : 'negative'}">
                        ${h.amount >= 0 ? '+' : ''}${sanitizeNumber(h.amount, 0)} 🪙
                    </span>
                </td>
                <td>${escapeHtml(this.formatDate(h.date))}</td>
            </tr>
        `).join('');
    },

    /**
     * Render avatar preview
     */
    renderAvatar() {
        if (!this.elements.avatarCanvas) return;

        // Use ShopCanvas if available
        if (window.ShopCanvas) {
            window.ShopCanvas.init(this.elements.avatarCanvas, {
                size: 200,
                interactive: false
            });
            window.ShopCanvas.loadEquipped(this.data.equipped);
        } else if (window.CosmeticsRenderer) {
            // Fallback to CosmeticsRenderer
            window.CosmeticsRenderer.renderToCanvas(this.elements.avatarCanvas, {
                size: 200
            });
        }
    },

    /**
     * Render currency balance
     */
    renderCurrency() {
        if (this.elements.burnBalance) {
            this.elements.burnBalance.textContent = this.formatNumber(this.data.currency.burn);
        }
        if (this.elements.coinBalance) {
            this.elements.coinBalance.textContent = this.formatNumber(this.data.currency.coins);
        }
    },

    /**
     * Render inventory grid
     */
    renderInventory() {
        if (!this.elements.inventoryGrid) return;

        let items = this.data.inventory;

        // Apply filter
        if (this.inventoryFilter !== 'all') {
            items = items.filter(item => item.layer === this.inventoryFilter);
        }

        // Check if empty
        if (items.length === 0) {
            this.elements.inventoryGrid.innerHTML = `
                <div class="profile-inventory-empty">
                    <div class="empty-icon">🎨</div>
                    <div class="empty-text">${this.inventoryFilter === 'all' ? 'No cosmetics yet' : 'No items in this category'}</div>
                    <button class="btn-valhalla-secondary" onclick="Profile.openShop()">
                        Browse Shop
                    </button>
                </div>
            `;
            return;
        }

        // Render items
        this.elements.inventoryGrid.innerHTML = items.map(item => {
            const isEquipped = this.data.equipped[item.layer] === item.id;
            const tierColor = this.getItemTierColor(item.tier);
            const tierName = this.getItemTierName(item.tier);

            return `
                <div class="profile-inventory-item ${isEquipped ? 'equipped' : ''}"
                     data-item-id="${escapeHtml(item.id)}"
                     data-layer="${escapeHtml(item.layer)}"
                     title="${escapeHtml(item.name)}"
                     style="--tier-color: ${tierColor}">
                    ${item.asset_url ?
                        `<img src="${escapeHtml(item.asset_url)}" alt="${escapeHtml(item.name)}" loading="lazy"
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="item-placeholder" style="display: none;">${this.getLayerIcon(item.layer)}</div>` :
                        `<div class="item-placeholder">${this.getLayerIcon(item.layer)}</div>`
                    }
                    <div class="item-tier-badge" style="color: ${tierColor}">${tierName}</div>
                </div>
            `;
        }).join('');

        // Bind click events for equip
        this.elements.inventoryGrid.querySelectorAll('.profile-inventory-item').forEach(el => {
            el.addEventListener('click', () => {
                const itemId = el.dataset.itemId;
                const layer = el.dataset.layer;
                this.equipItem(itemId, layer);
            });
        });
    },

    /**
     * Equip an item
     * @param {string} itemId - Item ID
     * @param {string} layer - Layer type
     */
    equipItem(itemId, layer) {
        // Check if already equipped
        if (this.data.equipped[layer] === itemId) {
            // Unequip
            if (layer === 'skin') {
                this.data.equipped.skin = 'skin_default';
            } else {
                delete this.data.equipped[layer];
            }
        } else {
            // Equip
            this.data.equipped[layer] = itemId;
        }

        // Save to localStorage
        const shopState = localStorage.getItem('asdf_shop_state');
        const state = shopState ? JSON.parse(shopState) : {};
        state.equipped = this.data.equipped;
        localStorage.setItem('asdf_shop_state', JSON.stringify(state));

        // Sync with ShopV2 if available
        if (window.ShopV2 && window.ShopV2.state) {
            window.ShopV2.state.equipped = this.data.equipped;
        }

        // Sync with CosmeticsState if available
        if (window.CosmeticsState) {
            window.CosmeticsState.equipped = { ...this.data.equipped };
            window.CosmeticsState.save();
        }

        // Re-render
        this.renderInventory();
        this.renderAvatar();

        // Show feedback
        if (window.Hub) {
            window.Hub.showNotification('Equipment updated!', 'success');
        }
    },

    /**
     * Open the cosmetics shop
     */
    openShop() {
        // Use PumpArenaCosmetics if available
        if (window.PumpArenaCosmetics) {
            window.PumpArenaCosmetics.openShop();
            return;
        }

        // Navigate to shop tab
        const shopTab = document.querySelector('[data-hub-view="shop"]');
        if (shopTab) {
            shopTab.click();
        }
    },

    /**
     * Get tier color for item
     */
    getItemTierColor(tier) {
        const colors = {
            0: '#9ca3af', 1: '#9ca3af',
            2: '#22c55e', 3: '#22c55e',
            4: '#3b82f6', 5: '#3b82f6',
            6: '#a855f7', 7: '#a855f7',
            8: '#f97316', 9: '#f97316'
        };
        return colors[tier] || colors[0];
    },

    /**
     * Get tier name for item
     */
    getItemTierName(tier) {
        const names = ['Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Rare', 'Epic', 'Epic', 'Legendary', 'Legendary'];
        return names[tier] || 'Common';
    },

    /**
     * Get layer icon
     */
    getLayerIcon(layer) {
        const icons = {
            background: '🖼️',
            aura: '✨',
            skin: '🐕',
            outfit: '👕',
            eyes: '👁️',
            head: '🎩',
            held: '🗡️'
        };
        return icons[layer] || '📦';
    },

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Copy wallet to clipboard
     */
    async copyWallet() {
        if (!this.data.wallet) return;

        try {
            await navigator.clipboard.writeText(this.data.wallet);

            // Show feedback
            const el = this.elements.walletAddress;
            const original = el.textContent;
            el.textContent = 'Copied!';
            setTimeout(() => {
                el.textContent = original;
            }, 1500);
        } catch (e) {
            console.error('[Profile] Failed to copy:', e);
        }
    },

    /**
     * Get tier name
     */
    getTierName(tier) {
        const names = ['Visitor', 'Holder', 'Believer', 'Degen', 'Whale', 'Legend'];
        return names[tier] || 'Visitor';
    },

    /**
     * Get tier icon
     */
    getTierIcon(tier) {
        const icons = ['👤', '🪙', '💎', '🔥', '🐋', '👑'];
        return icons[tier] || '👤';
    },

    /**
     * Format number
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    /**
     * Format date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';

        return date.toLocaleDateString();
    },

    /**
     * Unlock achievement
     */
    unlockAchievement(id) {
        const achievement = this.data.achievements.find(a => a.id === id);
        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;
        this.data.stats.achievementsUnlocked++;

        // Save to localStorage
        const unlocked = this.data.achievements.filter(a => a.unlocked).map(a => a.id);
        localStorage.setItem('asdf_achievements', JSON.stringify(unlocked));

        // Show notification
        if (window.Hub) {
            window.Hub.showNotification(`Achievement Unlocked: ${achievement.name}!`, 'success');
        }

        // Re-render
        this.renderAchievements();
        this.renderStats();
    },

    /**
     * Add history entry
     * @param {string} type - Transaction type (must be in ALLOWED_HISTORY_TYPES)
     * @param {string} desc - Description (will be truncated to 100 chars)
     * @param {number} amount - Amount (will be sanitized)
     */
    addHistoryEntry(type, desc, amount) {
        // Validate type
        const safeType = ALLOWED_HISTORY_TYPES.includes(type) ? type : 'earn';

        // Sanitize inputs
        const entry = {
            type: safeType,
            desc: String(desc || '').slice(0, 100),
            amount: sanitizeNumber(amount, 0),
            date: new Date().toISOString()
        };

        this.data.history.unshift(entry);

        // Keep only last 50 entries
        this.data.history = this.data.history.slice(0, 50);

        // Save
        localStorage.setItem('asdf_history', JSON.stringify(this.data.history));

        // Re-render if visible
        this.renderHistory();
    }
};

// ============================================
// AUTO INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    Profile.init();
});

// Global export
if (typeof window !== 'undefined') {
    window.Profile = Profile;
}
