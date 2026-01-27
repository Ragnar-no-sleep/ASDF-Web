/**
 * ASDF Games - Shared Modules Index
 *
 * Central export for all shared game utilities
 * Load order: validation.js, scoring.js, lifecycle.js, canvas.js, input.js, intervals.js, index.js
 */

'use strict';

const GameShared = {
    // Module references (populated after all modules load)
    Validation: null,
    Scoring: null,
    Lifecycle: null,
    Canvas: null,
    Input: null,
    Intervals: null,
    Juice: null,

    initialized: false,

    /**
     * Initialize shared modules
     * Call this after all shared modules are loaded
     */
    init() {
        if (this.initialized) return;

        // Get references to loaded modules
        this.Validation = typeof GameValidation !== 'undefined' ? GameValidation : null;
        this.Scoring = typeof GameScoring !== 'undefined' ? GameScoring : null;
        this.Lifecycle = typeof GameLifecycle !== 'undefined' ? GameLifecycle : null;
        this.Canvas = typeof CanvasManager !== 'undefined' ? CanvasManager : null;
        this.Input = typeof InputManager !== 'undefined' ? InputManager : null;
        this.Intervals = typeof IntervalManager !== 'undefined' ? IntervalManager : null;
        this.Juice = typeof GameJuice !== 'undefined' ? GameJuice : null;

        // Validate all modules loaded
        const missing = [];
        if (!this.Validation) missing.push('validation.js');
        if (!this.Scoring) missing.push('scoring.js');
        if (!this.Lifecycle) missing.push('lifecycle.js');
        if (!this.Canvas) missing.push('canvas.js');
        if (!this.Input) missing.push('input.js');
        if (!this.Intervals) missing.push('intervals.js');
        if (!this.Juice) missing.push('juice.js');

        if (missing.length > 0) {
            console.warn('[GameShared] Missing modules:', missing.join(', '));
        }

        this.initialized = true;
        console.log('[GameShared] Initialized');
    },

    /**
     * Create a complete game context with all utilities
     * @param {string} gameId - The game ID
     * @param {HTMLCanvasElement} canvas - The game canvas
     * @returns {Object} Game context with all utilities
     */
    createContext(gameId, canvas) {
        if (!this.initialized) this.init();

        const ctx = canvas ? canvas.getContext('2d') : null;
        const intervals = this.Intervals ? this.Intervals.create() : null;
        const input = this.Input && canvas ? this.Input.create({ canvas }) : null;
        const juice = this.Juice && canvas && ctx ? this.Juice.create(canvas, ctx) : null;

        return {
            gameId,
            canvas,
            ctx,
            intervals,
            input,
            juice,

            // Convenience methods
            updateScore: (score) => updateScore(gameId, score),
            recordAction: (type, data) => recordGameAction(gameId, type, data),
            recordScore: (score, delta) => recordScoreUpdate(gameId, score, delta),
            endGame: (score) => endGame(gameId, score),

            // Cleanup method
            cleanup() {
                if (intervals) intervals.cleanup();
                if (input) input.cleanup();
                if (juice) juice.cleanup();
            }
        };
    }
};

// Export for module systems
if (typeof window !== 'undefined') {
    window.GameShared = GameShared;
}
