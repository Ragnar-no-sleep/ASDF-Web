/**
 * ASDF Games - Shared Scoring Utilities
 *
 * Extracted from engine.js for modularity
 * Handles score updates and anti-cheat tracking
 */

'use strict';

const GameScoring = {
    /**
     * Update score display and save best score
     * @param {string} gameId - The game ID
     * @param {number} score - The new score
     */
    updateScore(gameId, score) {
        const scoreEl = document.getElementById(`score-${gameId}`);
        if (scoreEl) scoreEl.textContent = score;

        if (typeof appState !== 'undefined' && score > (appState.practiceScores[gameId] || 0)) {
            appState.practiceScores[gameId] = score;
            const bestEl = document.getElementById(`best-${gameId}`);
            if (bestEl) bestEl.textContent = score;
            if (typeof saveState === 'function') {
                saveState();
            }
        }
    },

    /**
     * Record a game action for anti-cheat tracking
     * @param {string} gameId - The game ID
     * @param {string} actionType - Type of action
     * @param {Object} data - Additional action data
     */
    recordGameAction(gameId, actionType, data = {}) {
        if (typeof activeGameSessions !== 'undefined' && typeof AntiCheat !== 'undefined') {
            const sessionId = activeGameSessions[gameId];
            if (sessionId) {
                AntiCheat.recordAction(sessionId, actionType, data);
            }
        }
    },

    /**
     * Record a score update for anti-cheat tracking
     * @param {string} gameId - The game ID
     * @param {number} score - Current score
     * @param {number} delta - Score change
     */
    recordScoreUpdate(gameId, score, delta) {
        if (typeof activeGameSessions !== 'undefined' && typeof AntiCheat !== 'undefined') {
            const sessionId = activeGameSessions[gameId];
            if (sessionId) {
                AntiCheat.recordScore(sessionId, score, delta);
            }
        }
    }
};

// Legacy function exports for backwards compatibility
function updateScore(gameId, score) {
    return GameScoring.updateScore(gameId, score);
}

function recordGameAction(gameId, actionType, data = {}) {
    return GameScoring.recordGameAction(gameId, actionType, data);
}

function recordScoreUpdate(gameId, score, delta) {
    return GameScoring.recordScoreUpdate(gameId, score, delta);
}

// Export for module systems
if (typeof window !== 'undefined') {
    window.GameScoring = GameScoring;
}
