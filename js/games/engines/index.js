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

    // Shared modules
    shared: null,

    // Configuration
    config: {
        debug: false
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

        // Register game engines from window
        this.tokencatcher = typeof TokenCatcher !== 'undefined' ? TokenCatcher : null;
        this.burnrunner = typeof BurnRunner !== 'undefined' ? BurnRunner : null;
        this.scamblaster = typeof ScamBlaster !== 'undefined' ? ScamBlaster : null;
        this.cryptoheist = typeof CryptoHeist !== 'undefined' ? CryptoHeist : null;
        this.pumparena = typeof PumpArena !== 'undefined' ? PumpArena : null;
        this.whalewatch = typeof WhaleWatch !== 'undefined' ? WhaleWatch : null;
        this.stakestacker = typeof StakeStacker !== 'undefined' ? StakeStacker : null;
        this.dexdash = typeof DexDash !== 'undefined' ? DexDash : null;
        this.burnorhold = typeof BurnOrHold !== 'undefined' ? BurnOrHold : null;
        this.liquiditymaze = typeof LiquidityMaze !== 'undefined' ? LiquidityMaze : null;

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
        const engines = [];
        const gameIds = [
            'tokencatcher', 'burnrunner', 'scamblaster', 'cryptoheist',
            'pumparena', 'whalewatch', 'stakestacker', 'dexdash',
            'burnorhold', 'liquiditymaze'
        ];

        for (const id of gameIds) {
            if (this[id] !== null) {
                engines.push(id);
            }
        }
        return engines;
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

        const engine = this[gameId];

        if (engine && typeof engine.start === 'function') {
            if (this.config.debug) {
                console.log(`[GameEngines] Starting ${gameId}`);
            }
            engine.start(gameId);
        } else {
            // Fallback to legacy initializeGame function
            if (typeof initializeGame === 'function') {
                if (this.config.debug) {
                    console.log(`[GameEngines] Falling back to legacy initializeGame for ${gameId}`);
                }
                initializeGame(gameId);
            } else {
                console.warn(`[GameEngines] No engine found for: ${gameId}`);
            }
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
            totalEngines: 10,
            sharedModulesLoaded: this.shared !== null && this.shared.initialized
        };
    }
};

// Legacy compatibility: initializeGame router
// This will be called by GameLifecycle.startGame if GameEngines is not initialized
function initializeGame(gameId) {
    // If new engines are loaded, use them
    if (GameEngines.initialized && GameEngines.hasEngine(gameId)) {
        GameEngines.start(gameId);
        return;
    }

    // Fallback to legacy switch for games not yet extracted
    switch (gameId) {
        case 'tokencatcher':
            if (typeof startTokenCatcher === 'function') startTokenCatcher(gameId);
            break;
        case 'burnrunner':
            if (typeof startBurnRunner === 'function') startBurnRunner(gameId);
            break;
        case 'scamblaster':
            if (typeof startScamBlaster === 'function') startScamBlaster(gameId);
            break;
        case 'cryptoheist':
            if (typeof startCryptoHeist === 'function') startCryptoHeist(gameId);
            break;
        case 'pumparena':
            if (typeof startPumpArena === 'function') startPumpArena(gameId);
            break;
        case 'whalewatch':
            if (typeof startWhaleWatch === 'function') startWhaleWatch(gameId);
            break;
        case 'stakestacker':
            if (typeof startStakeStacker === 'function') startStakeStacker(gameId);
            break;
        case 'dexdash':
            if (typeof startDexDash === 'function') startDexDash(gameId);
            break;
        case 'burnorhold':
            if (typeof startBurnOrHold === 'function') startBurnOrHold(gameId);
            break;
        case 'liquiditymaze':
            if (typeof startLiquidityMaze === 'function') startLiquidityMaze(gameId);
            break;
        default:
            console.warn(`[initializeGame] Unknown game: ${gameId}`);
    }
}

// Export for module systems
if (typeof window !== 'undefined') {
    window.GameEngines = GameEngines;
}
