/**
 * ASDF Game Framework — Generic Game Lifecycle (SOLID: O — Open/Closed)
 *
 * Abstract contract for all games (graphics, text-based, turn-based, etc.)
 * Pattern: Template method + plugin architecture
 *
 * All games implement: start(), stop() [required]
 * Optional: onEvent(), update(), render(), getState()
 *
 * @module games/framework/game-lifecycle
 */

'use strict';

const GameLifecycle = {
  /**
   * Create a game lifecycle instance
   * @param {Object} config - Game configuration
   * @param {string} config.gameId - Game ID
   * @returns {Object} Game lifecycle object with required contract
   */
  create(config = {}) {
    return {
      gameId: config.gameId || 'game',

      /**
       * Start game (REQUIRED)
       * Initialize state, setup resources
       * @async
       */
      async start() {
        throw new Error(`[${this.gameId}] Game.start() not implemented`);
      },

      /**
       * Stop game (REQUIRED)
       * Cleanup, destroy, save state
       * @async
       */
      async stop() {
        throw new Error(`[${this.gameId}] Game.stop() not implemented`);
      },

      /**
       * Handle custom event (optional)
       * For event-driven games (turn-based, card games, etc.)
       * @async
       * @param {string} eventName - Event name
       * @param {Object} data - Event payload
       */
      async onEvent(eventName, data) {
        // Default: no-op
      },

      /**
       * Update game logic (optional)
       * For real-time games with game loop
       * @param {number} dt - Delta time (seconds)
       */
      update(dt) {
        // Default: no-op
      },

      /**
       * Render frame (optional)
       * For graphics-based games
       * @param {CanvasRenderingContext2D} ctx - Canvas context
       */
      render(ctx) {
        // Default: no-op
      },

      /**
       * Get current game state (optional)
       * For serialization, replay, anti-cheat
       * @returns {Object} Game state
       */
      getState() {
        return {};
      },
    };
  },

  /**
   * Validate game implements contract
   * @param {Object} game - Game instance to validate
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate(game) {
    const errors = [];

    if (!game) {
      errors.push('Game is null or undefined');
      return { valid: false, errors };
    }

    if (typeof game.start !== 'function') {
      errors.push('Game must implement start() method');
    }

    if (typeof game.stop !== 'function') {
      errors.push('Game must implement stop() method');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Get game capabilities
   * @param {Object} game - Game instance
   * @returns {Object} { supportsRealTime, supportsEvents, supportsRender, supportsState }
   */
  getCapabilities(game) {
    if (!game) {
      return {
        supportsRealTime: false,
        supportsEvents: false,
        supportsRender: false,
        supportsState: false,
      };
    }

    return {
      supportsRealTime: typeof game.update === 'function',
      supportsEvents: typeof game.onEvent === 'function',
      supportsRender: typeof game.render === 'function',
      supportsState: typeof game.getState === 'function',
    };
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.GameLifecycle = GameLifecycle;
}
