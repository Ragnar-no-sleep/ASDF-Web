/**
 * ASDF Shop V2 - Dual Currency Handler
 *
 * Manages burn (Solana) and in-game currency
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// FIBONACCI PRICING
// ============================================

const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];

/**
 * Get Fibonacci number at index
 */
function getFib(n) {
    if (n < 0) return 0;
    if (n < FIB.length) return FIB[n];
    // Calculate for larger indices
    let a = FIB[FIB.length - 2];
    let b = FIB[FIB.length - 1];
    for (let i = FIB.length; i <= n; i++) {
        const temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

// ============================================
// CURRENCY MANAGER
// ============================================

const ShopCurrency = {
    // Storage key
    STORAGE_KEY: 'asdf_currency',

    // Currency types
    TYPES: {
        BURN: 'burn',
        INGAME: 'ingame'
    },

    // Conversion rate (1 burn = X ingame for display purposes)
    CONVERSION_RATE: 1.5,

    // ============================================
    // PRICING
    // ============================================

    /**
     * Calculate base price using Fibonacci
     * @param {number} tier - Item tier (0-9)
     * @returns {number} Base price in burn currency
     */
    calculateBasePrice(tier) {
        return getFib(tier + 3) * 100;
    },

    /**
     * Calculate price with supply multiplier
     * @param {number} tier - Item tier
     * @param {number} currentSupply - Current supply
     * @param {number} initialSupply - Initial supply
     */
    calculateDynamicPrice(tier, currentSupply = 1000, initialSupply = 1000) {
        const basePrice = this.calculateBasePrice(tier);
        const supplyMultiplier = currentSupply / initialSupply;
        return Math.max(1, Math.floor(basePrice * supplyMultiplier));
    },

    /**
     * Get prices for both currencies
     * @param {Object} item - Shop item
     * @returns {Object} { burn: number, ingame: number }
     */
    getPrices(item) {
        // If item has explicit prices, use those
        if (item.prices) {
            return item.prices;
        }

        // Calculate from tier
        const burnPrice = item.price || this.calculateBasePrice(item.tier || 0);
        const ingamePrice = item.ingame_price || Math.floor(burnPrice * this.CONVERSION_RATE);

        return {
            burn: burnPrice,
            ingame: ingamePrice
        };
    },

    /**
     * Apply discount to price
     * @param {number} price - Original price
     * @param {number} discountPercent - Discount percentage
     */
    applyDiscount(price, discountPercent) {
        return Math.floor(price * (1 - discountPercent / 100));
    },

    /**
     * Format price for display
     * @param {number} amount - Price amount
     * @param {string} currency - Currency type
     */
    formatPrice(amount, currency = 'burn') {
        const icon = currency === 'burn' ? '🔥' : '🪙';
        return `${icon} ${amount.toLocaleString()}`;
    },

    // ============================================
    // BALANCE MANAGEMENT
    // ============================================

    /**
     * Get local balance
     */
    getLocalBalance() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                return {
                    ingame: data.ingame || 0,
                    totalEarned: data.totalEarned || 0,
                    totalSpent: data.totalSpent || 0
                };
            }
        } catch (e) {
            console.error('[ShopCurrency] Failed to read localStorage:', e);
        }
        return { ingame: 0, totalEarned: 0, totalSpent: 0 };
    },

    /**
     * Save local balance
     */
    saveLocalBalance(balance) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(balance));
        } catch (e) {
            console.error('[ShopCurrency] Failed to save to localStorage:', e);
        }
    },

    /**
     * Update in-game balance locally
     * @param {number} newBalance - New balance
     */
    updateBalance(newBalance) {
        const current = this.getLocalBalance();
        current.ingame = newBalance;
        this.saveLocalBalance(current);
        return current;
    },

    /**
     * Add to in-game balance
     * @param {number} amount - Amount to add
     * @param {string} source - Source of earnings
     */
    addBalance(amount, source = 'unknown') {
        const current = this.getLocalBalance();
        current.ingame += amount;
        current.totalEarned += amount;
        this.saveLocalBalance(current);

        console.log(`[ShopCurrency] Earned ${amount} from ${source}. Balance: ${current.ingame}`);
        return current;
    },

    /**
     * Spend from in-game balance
     * @param {number} amount - Amount to spend
     * @returns {boolean} Success
     */
    spendBalance(amount) {
        const current = this.getLocalBalance();
        if (current.ingame < amount) {
            return false;
        }
        current.ingame -= amount;
        current.totalSpent += amount;
        this.saveLocalBalance(current);
        return true;
    },

    // ============================================
    // SERVER SYNC
    // ============================================

    /**
     * Sync balance with server
     */
    async syncWithServer(state) {
        if (!window.ShopSync) {
            return this.getLocalBalance();
        }

        try {
            const serverBalance = await window.ShopSync.fetchCurrencyBalance();
            const balance = {
                ingame: serverBalance.balance || 0,
                totalEarned: serverBalance.total_earned || 0,
                totalSpent: serverBalance.total_spent || 0
            };

            this.saveLocalBalance(balance);

            if (state) {
                state.updateIngameCurrency(balance.ingame);
            }

            return balance;
        } catch (error) {
            console.error('[ShopCurrency] Sync failed:', error);
            return this.getLocalBalance();
        }
    },

    /**
     * Earn currency (with server sync)
     * @param {number} amount - Amount earned
     * @param {string} source - Source (game_win, quest, etc.)
     * @param {string} sourceId - Optional source ID
     */
    async earn(amount, source, sourceId = null) {
        // Optimistic local update
        const local = this.addBalance(amount, source);

        // Sync with server
        if (window.ShopSync) {
            try {
                const result = await window.ShopSync.earnCurrency(amount, source, sourceId);
                if (result.balance !== undefined) {
                    this.updateBalance(result.balance);
                }
            } catch (error) {
                console.error('[ShopCurrency] Server earn failed:', error);
                // Keep optimistic update
            }
        }

        return local;
    },

    // ============================================
    // TIER SYSTEM
    // ============================================

    /**
     * Get tier info
     */
    getTierInfo(tier) {
        const tiers = {
            0: { name: 'Common', color: '#9ca3af', minPrice: 100 },
            1: { name: 'Common', color: '#9ca3af', minPrice: 100 },
            2: { name: 'Uncommon', color: '#22c55e', minPrice: 200 },
            3: { name: 'Uncommon', color: '#22c55e', minPrice: 300 },
            4: { name: 'Rare', color: '#3b82f6', minPrice: 500 },
            5: { name: 'Rare', color: '#3b82f6', minPrice: 800 },
            6: { name: 'Epic', color: '#a855f7', minPrice: 1300 },
            7: { name: 'Epic', color: '#a855f7', minPrice: 2100 },
            8: { name: 'Legendary', color: '#f97316', minPrice: 3400 },
            9: { name: 'Legendary', color: '#f97316', minPrice: 5500 }
        };
        return tiers[tier] || tiers[0];
    },

    /**
     * Get rarity name from tier
     */
    getRarityName(tier) {
        if (tier <= 1) return 'common';
        if (tier <= 3) return 'uncommon';
        if (tier <= 5) return 'rare';
        if (tier <= 7) return 'epic';
        return 'legendary';
    },

    // ============================================
    // UI HELPERS
    // ============================================

    /**
     * Render currency display
     * @param {Object} currency - { burn, ingame }
     * @returns {string} HTML string
     */
    renderDisplay(currency) {
        return `
            <div class="shop-currency-display">
                <div class="currency-item burn-currency">
                    <span class="currency-icon">🔥</span>
                    <span class="currency-amount">${(currency.burn || 0).toLocaleString()}</span>
                </div>
                <div class="currency-item ingame-currency">
                    <span class="currency-icon">🪙</span>
                    <span class="currency-amount">${(currency.ingame || 0).toLocaleString()}</span>
                </div>
            </div>
        `;
    },

    /**
     * Render price selector
     * @param {Object} item - Shop item
     * @param {string} selectedCurrency - Currently selected
     */
    renderPriceSelector(item, selectedCurrency = 'burn') {
        const prices = this.getPrices(item);
        const modes = item.currency_modes || ['burn', 'ingame'];

        let html = '<div class="shop-price-selector">';

        if (modes.includes('burn')) {
            const selected = selectedCurrency === 'burn' ? 'selected' : '';
            html += `
                <button class="price-option ${selected}" data-currency="burn">
                    <span class="price-icon">🔥</span>
                    <span class="price-amount">${prices.burn.toLocaleString()}</span>
                </button>
            `;
        }

        if (modes.includes('ingame')) {
            const selected = selectedCurrency === 'ingame' ? 'selected' : '';
            html += `
                <button class="price-option ${selected}" data-currency="ingame">
                    <span class="price-icon">🪙</span>
                    <span class="price-amount">${prices.ingame.toLocaleString()}</span>
                </button>
            `;
        }

        html += '</div>';
        return html;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopCurrency, getFib };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopCurrency = ShopCurrency;
}
