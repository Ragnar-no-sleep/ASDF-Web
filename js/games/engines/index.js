/**
 * ASDF Games - Game Engines Coordinator
 *
 * Central coordinator for all game engines
 * Routes game start/stop to the appropriate engine module
 *
 * Pattern: 1 factory per product
 * Each game has its own file in engines/[gamename].js
 */

'use strict';

const GameEngines = {
  // Module references (populated as games are loaded)
  tokencatcher: null,
  burnrunner: null,
  scamblaster: null,
  cryptoheist: null,
  pumparena: null,
  whalewatch: null,
  stakestacker: null,
  dexdash: null,
  burnorhold: null,
  liquiditymaze: null,
  spaceshooter: null,

  // Shared modules
  shared: null,

  // Configuration
  config: {
    debug: false,
  },

  initialized: false,

  /**
   * Initialize the game engines coordinator
   * @param {Object} options - Configuration options
   */
  async init(options = {}) {
    if (this.initialized) return;

    this.config = { ...this.config, ...options };

    // Get reference to shared modules
    if (typeof GameShared !== 'undefined') {
      this.shared = GameShared;
      GameShared.init();
    }

    // Flush GameRegistry entries into this object (single source of truth)
    if (typeof GameRegistry !== 'undefined') {
      GameRegistry.flush();
      GameRegistry.lock(); // Prevent post-init registration (SOLID: O)
    }

    this.initialized = true;

    if (this.config.debug) {
      console.log('[GameEngines] Initialized with engines:', this.getLoadedEngines());
    }
  },

  /**
   * Get list of loaded game engines
   * @returns {string[]} Array of loaded game IDs
   */
  getLoadedEngines() {
    if (typeof GameRegistry !== 'undefined') {
      return GameRegistry.getAll();
    }
    // Fallback: scan own properties for engine objects
    return Object.keys(this).filter(
      k => this[k] !== null && typeof this[k] === 'object' && typeof this[k].start === 'function'
    );
  },

  /**
   * Check if a game engine is loaded
   * @param {string} gameId - The game ID
   * @returns {boolean} True if engine is loaded
   */
  hasEngine(gameId) {
    return this[gameId] !== null && this[gameId] !== undefined;
  },

  /**
   * Start a game
   * @param {string} gameId - The game ID to start
   */
  start(gameId) {
    if (!this.initialized) {
      console.warn('[GameEngines] Not initialized, calling init()');
      this.init();
    }

    let engine = this[gameId];

    // Fallback for games not yet using GameRegistry
    if (!engine && typeof window !== 'undefined') {
      const classMap = {
        'tokencatcher': 'TokenCatcher',
        'burnrunner': 'BurnRunner',
        'scamblaster': 'ScamBlaster',
        'cryptoheist': 'CryptoHeist',
        'dexdash': 'DexDash',
        'burnorhold': 'BurnOrHold',
        'liquiditymaze': 'LiquidityMaze',
        'pumparena': 'PumpArena'
      };
      
      const className = classMap[gameId];
      if (className && window[className]) {
        engine = window[className];
        // Auto-register for next time
        this.register(gameId, engine);
      }
    }

    if (engine && typeof engine.start === 'function') {
      if (this.config.debug) {
        console.log(`[GameEngines] Starting ${gameId}`);
      }
      engine.start(gameId);
    } else {
      console.warn(`[GameEngines] No engine found for: ${gameId}`);
    }
  },

  /**
   * Stop a game
   * @param {string} gameId - The game ID to stop
   */
  stop(gameId) {
    const engine = this[gameId];

    if (engine && typeof engine.stop === 'function') {
      if (this.config.debug) {
        console.log(`[GameEngines] Stopping ${gameId}`);
      }
      engine.stop(gameId);
    } else {
      // Fallback to legacy stopGame function
      if (typeof stopGame === 'function') {
        stopGame(gameId);
      }
    }
  },

  /**
   * Register a game engine
   * @param {string} gameId - The game ID
   * @param {Object} engine - The engine object with start/stop methods
   */
  register(gameId, engine) {
    if (!engine || typeof engine.start !== 'function') {
      console.error(`[GameEngines] Invalid engine for ${gameId}: missing start() method`);
      return;
    }

    this[gameId] = engine;

    if (this.config.debug) {
      console.log(`[GameEngines] Registered engine: ${gameId}`);
    }
  },

  /**
   * Get engine statistics
   * @returns {Object} Engine stats
   */
  getStats() {
    return {
      initialized: this.initialized,
      loadedEngines: this.getLoadedEngines(),
      totalEngines: this.getLoadedEngines().length,
      sharedModulesLoaded: this.shared !== null && this.shared.initialized,
    };
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.GameEngines = GameEngines;
  window.GameEngines = window.ASDF.GameEngines;
}
