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
   * CANONICAL implementation - use this instead of local copies
   *
   * @param {*} value - Value to sanitize
   * @param {number} [min=0] - Minimum allowed value (default: 0)
   * @param {number} [max=Infinity] - Maximum allowed value (default: Infinity)
   * @param {number} [defaultValue=0] - Default if invalid (default: 0)
   * @returns {number} Sanitized number
   *
   * @example
   * // Full signature (score clamping)
   * sanitizeNumber(score, 0, 999999999, 0)
   *
   * @example
   * // Simple (just ensure finite number)
   * sanitizeNumber(value) // returns 0 if invalid
   *
   * @example
   * // With default only
   * sanitizeNumber(value, undefined, undefined, 100)
   */
  sanitizeNumber(value, min = 0, max = Infinity, defaultValue = 0) {
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
  },
};

// Legacy function exports for backwards compatibility
function sanitizeNumber(value, min = 0, max = Infinity, defaultValue = 0) {
  return GameValidation.sanitizeNumber(value, min, max, defaultValue);
}

function isValidGameId(gameId) {
  return GameValidation.isValidGameId(gameId);
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.GameValidation = GameValidation;
}
