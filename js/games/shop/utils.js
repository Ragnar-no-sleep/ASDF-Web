/**
 * ASDF Shop V2 - Shared Utilities
 *
 * Common functions used across shop components
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// SHOP UTILITIES
// ============================================

const ShopUtils = {
    // ============================================
    // SECURITY
    // ============================================

    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
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

    /**
     * Sanitize CSS color value
     * @param {string} color - Color to sanitize
     * @returns {string|null} Sanitized color or null if invalid
     */
    sanitizeColor(color) {
        if (!color) return null;
        // Only allow valid hex colors
        const hexMatch = String(color).match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
        return hexMatch ? color : null;
    },

    /**
     * Validate item ID format
     * @param {string} id - Item ID to validate
     * @returns {boolean} True if valid
     */
    isValidItemId(id) {
        if (!id || typeof id !== 'string') return false;
        // Only allow alphanumeric, underscore, hyphen (no path chars)
        return /^[a-zA-Z0-9_-]{1,50}$/.test(id);
    },

    // ============================================
    // TIER SYSTEM
    // ============================================

    /** Tier color map */
    TIER_COLORS: {
        0: '#9ca3af', 1: '#9ca3af',
        2: '#22c55e', 3: '#22c55e',
        4: '#3b82f6', 5: '#3b82f6',
        6: '#a855f7', 7: '#a855f7',
        8: '#f97316', 9: '#f97316'
    },

    /** Tier name map */
    TIER_NAMES: ['Common', 'Common', 'Uncommon', 'Uncommon', 'Rare', 'Rare', 'Epic', 'Epic', 'Legendary', 'Legendary'],

    /**
     * Get tier color
     * @param {number} tier - Tier number
     * @returns {string} Hex color
     */
    getTierColor(tier) {
        return this.TIER_COLORS[tier] || this.TIER_COLORS[0];
    },

    /**
     * Get tier name
     * @param {number} tier - Tier number
     * @returns {string} Tier name
     */
    getTierName(tier) {
        return this.TIER_NAMES[tier] || 'Common';
    },

    /**
     * Get rarity from tier
     * @param {number} tier - Tier number
     * @returns {string} Rarity name
     */
    getTierRarity(tier) {
        if (tier >= 8) return 'legendary';
        if (tier >= 6) return 'epic';
        if (tier >= 4) return 'rare';
        if (tier >= 2) return 'uncommon';
        return 'common';
    },

    // ============================================
    // LAYERS
    // ============================================

    /** Layer icons */
    LAYER_ICONS: {
        background: '🖼️',
        aura: '✨',
        skin: '🐕',
        outfit: '👕',
        eyes: '👁️',
        head: '🎩',
        held: '🗡️'
    },

    /** Valid layer names */
    VALID_LAYERS: ['background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held'],

    /**
     * Get layer icon
     * @param {string} layer - Layer type
     * @returns {string} Icon emoji
     */
    getLayerIcon(layer) {
        return this.LAYER_ICONS[layer] || '📦';
    },

    /**
     * Validate layer name
     * @param {string} layer - Layer to validate
     * @returns {boolean} True if valid
     */
    isValidLayer(layer) {
        return this.VALID_LAYERS.includes(layer);
    },

    // ============================================
    // FORMATTING
    // ============================================

    /**
     * Format price for display
     * @param {number} price - Price to format
     * @returns {string} Formatted price
     */
    formatPrice(price) {
        if (!price && price !== 0) return '???';
        if (price >= 1000000) {
            return (price / 1000000).toFixed(1) + 'M';
        }
        if (price >= 1000) {
            return (price / 1000).toFixed(1) + 'K';
        }
        return price.toLocaleString();
    },

    /**
     * Capitalize first letter
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // ============================================
    // DEBOUNCE
    // ============================================

    /**
     * Debounce function
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in ms
     * @returns {Function} Debounced function
     */
    debounce(fn, delay) {
        let timer = null;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopUtils };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopUtils = ShopUtils;
}
