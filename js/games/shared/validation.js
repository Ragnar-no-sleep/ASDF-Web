/**
 * ASDF Games - Shared Validation Utilities
 *
 * Extracted from engine.js for modularity
 * Provides input validation and sanitization
 */

'use strict';

const GameValidation = {
    /**
     * Sanitize a number within bounds
     * @param {*} value - Value to sanitize
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {number} defaultValue - Default if invalid
     * @returns {number} Sanitized number
     */
    sanitizeNumber(value, min, max, defaultValue) {
        const num = Number(value);
        if (!Number.isFinite(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    },

    /**
     * Check if a game ID is valid
     * Delegates to global VALID_GAME_IDS if available
     * @param {string} gameId - The game ID to validate
     * @returns {boolean} True if valid
     */
    isValidGameId(gameId) {
        if (typeof VALID_GAME_IDS !== 'undefined') {
            return VALID_GAME_IDS.has(gameId);
        }
        // Fallback to GAMES array if VALID_GAME_IDS not loaded
        if (typeof GAMES !== 'undefined') {
            return GAMES.some(g => g.id === gameId);
        }
        return false;
    }
};

// Legacy function exports for backwards compatibility
function sanitizeNumber(value, min, max, defaultValue) {
    return GameValidation.sanitizeNumber(value, min, max, defaultValue);
}

function isValidGameId(gameId) {
    return GameValidation.isValidGameId(gameId);
}

// Export for module systems
if (typeof window !== 'undefined') {
    window.GameValidation = GameValidation;
}
