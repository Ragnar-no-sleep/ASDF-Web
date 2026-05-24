/**
 * ASDF Games - Game Engines Coordinator
 *
 * Central coordinator for all game engines
 * Routes game start/stop to the appropriate engine module
 * Implements Lazy Loading for scalable engine architecture
 */

'use strict';

const GameEngines = {
  // Shared modules
  shared: null,

  // Configuration
  config: {
    debug: false,
    enginesPath: '/js/games/engines/',
  },

  initialized: false,
  _loadingPromises: new Map(),
  _enginePaths: {
    spaceshooter: 'spaceshooter/index.js',
    stakestacker: 'stakestacker/index.js',
    whalewatch: 'whalewatch/index.js',
  },

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

    this.initialized = true;

    if (this.config.debug) {
      console.log('[GameEngines] Initialized');
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
    return [];
  },

  /**
   * Check if a game engine is loaded
   * @param {string} gameId - The game ID
   * @returns {boolean} True if engine is loaded
   */
  hasEngine(gameId) {
    if (typeof GameRegistry !== 'undefined') {
      return GameRegistry.has(gameId);
    }
    return false;
  },

  /**
   * Dynamically load a game engine script
   * @param {string} gameId - The game ID
   * @returns {Promise<boolean>} True if loaded successfully
   */
  async loadEngine(gameId) {
    if (this.hasEngine(gameId)) return true;

    // Prevent multiple simultaneous loads of the same engine
    if (this._loadingPromises.has(gameId)) {
      return this._loadingPromises.get(gameId);
    }

    const loadPromise = new Promise((resolve, reject) => {
      console.log(`[GameEngines] Lazy loading engine: ${gameId}...`);

      const script = document.createElement('script');
      // Use specific path if mapped, else default to flat .js
      const path = this._enginePaths[gameId] || `${gameId}.js`;
      script.src = `${this.config.enginesPath}${path}`;
      script.defer = true;

      script.onload = () => {
        console.log(`[GameEngines] Successfully loaded ${gameId}`);
        resolve(true);
      };

      script.onerror = err => {
        console.error(
          `[GameEngines] Failed to load engine script for ${gameId} at ${script.src}`,
          err
        );

        // If it wasn't a modular engine but failed, try the subfolder as fallback
        if (!this._enginePaths[gameId]) {
          const fallbackScript = document.createElement('script');
          fallbackScript.src = `${this.config.enginesPath}${gameId}/index.js`;
          fallbackScript.defer = true;
          fallbackScript.onload = () => resolve(true);
          fallbackScript.onerror = () => {
            console.error(`[GameEngines] Fallback load failed for ${gameId}`);
            reject(new Error(`Failed to load engine ${gameId}`));
          };
          document.body.appendChild(fallbackScript);
        } else {
          reject(new Error(`Failed to load modular engine ${gameId}`));
        }
      };

      document.body.appendChild(script);
    });

    this._loadingPromises.set(gameId, loadPromise);

    try {
      await loadPromise;
      return true;
    } catch (e) {
      return false;
    } finally {
      this._loadingPromises.delete(gameId);
    }
  },

  /**
   * Start a game
   * @param {string} gameId - The game ID to start
   */
  async start(gameId) {
    if (!this.initialized) {
      console.warn('[GameEngines] Not initialized, calling init()');
      this.init();
    }

    // Security: Validate gameId using the shared validation module
    const Validation = this.shared
      ? this.shared.Validation
      : typeof GameValidation !== 'undefined'
        ? GameValidation
        : null;
    if (Validation && !Validation.isValidGameId(gameId)) {
      console.error(`[GameEngines] Invalid gameId rejected: ${gameId}`);
      return;
    }

    // Lazy load the engine if not registered
    if (!this.hasEngine(gameId)) {
      const loaded = await this.loadEngine(gameId);
      if (!loaded) {
        console.error(`[GameEngines] Cannot start ${gameId}: Engine failed to load.`);
        return;
      }
    }

    let engine = null;
    if (typeof GameRegistry !== 'undefined') {
      engine = GameRegistry.get(gameId);
    }

    // Legacy Fallback for games not yet using GameRegistry
    if (!engine && typeof window !== 'undefined') {
      const classMap = {
        tokencatcher: 'TokenCatcher',
        burnrunner: 'BurnRunner',
        scamblaster: 'ScamBlaster',
        cryptoheist: 'CryptoHeist',
        dexdash: 'DexDash',
        burnorhold: 'BurnOrHold',
        liquiditymaze: 'LiquidityMaze',
        pumparena: 'PumpArena',
      };
      const className = classMap[gameId];
      if (className && window[className]) {
        engine = window[className];
        if (typeof GameRegistry !== 'undefined') {
          const wasLocked = GameRegistry._locked;
          GameRegistry._locked = false; // Temporarily unlock to register legacy
          GameRegistry.register(gameId, engine);
          if (wasLocked) GameRegistry.lock();
        }
      }
    }

    if (engine && typeof engine.start === 'function') {
      if (this.config.debug) {
        console.log(`[GameEngines] Starting ${gameId}`);
      }
      engine.start(gameId);
    } else {
      console.error(`[GameEngines] No valid engine found for: ${gameId}`);
    }
  },

  /**
   * Stop a game
   * @param {string} gameId - The game ID to stop
   */
  stop(gameId) {
    let engine = null;
    if (typeof GameRegistry !== 'undefined') {
      engine = GameRegistry.get(gameId);
    }

    // Legacy fallback check on global if registry fails
    if (!engine && typeof window !== 'undefined') {
      const classMap = {
        tokencatcher: 'TokenCatcher',
        burnrunner: 'BurnRunner',
        scamblaster: 'ScamBlaster',
        cryptoheist: 'CryptoHeist',
        dexdash: 'DexDash',
        burnorhold: 'BurnOrHold',
        liquiditymaze: 'LiquidityMaze',
        pumparena: 'PumpArena',
      };
      const className = classMap[gameId];
      if (className && window[className]) engine = window[className];
    }

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
