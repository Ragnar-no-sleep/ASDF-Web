/**
 * ASDF Games - Bootstrap (Composition Root)
 *
 * This is the single place where all dependencies are wired.
 * Services are registered here and resolved lazily when needed.
 *
 * Load order:
 *   1. container.js (GameServices)
 *   2. facades.js (createFacade, installFacades)
 *   3. bootstrap.js (this file - registers services)
 *   4. Other modules (use GameServices.get() or legacy globals)
 */

'use strict';

/**
 * Register all core services
 * Called once at application startup
 */
function bootstrapServices() {
  // Prevent double bootstrap
  if (GameServices.stats().registered > 0) {
    console.warn('[Bootstrap] Services already registered');
    return;
  }

  console.log('[Bootstrap] Registering services...');

  // ============================================
  // TIER 1: Core Configuration
  // ============================================

  // Config service - wraps the global CONFIG object
  GameServices.register('config', () => {
    // If CONFIG already exists (loaded by config.js), use it
    if (typeof CONFIG !== 'undefined' && !CONFIG.__isFacade__) {
      return CONFIG;
    }
    // Otherwise return DEFAULT_CONFIG
    if (typeof DEFAULT_CONFIG !== 'undefined') {
      return { ...DEFAULT_CONFIG };
    }
    throw new Error('[Bootstrap] CONFIG not available');
  });

  // Games list - wraps the GAMES array
  GameServices.register('games', () => {
    if (typeof GAMES !== 'undefined' && !GAMES.__isFacade__) {
      return GAMES;
    }
    throw new Error('[Bootstrap] GAMES not available');
  });

  // Reward slots mapping
  GameServices.register('rewardSlots', () => {
    if (typeof REWARD_SLOTS !== 'undefined' && !REWARD_SLOTS.__isFacade__) {
      return REWARD_SLOTS;
    }
    return { 1: 5, 2: 2, 3: 1 }; // Default
  });

  // Valid game IDs set
  GameServices.register('validGameIds', () => {
    if (typeof VALID_GAME_IDS !== 'undefined') {
      return VALID_GAME_IDS;
    }
    // Derive from games list
    const games = GameServices.get('games');
    return new Set(games.map(g => g.id));
  });

  // ============================================
  // TIER 2: State Management
  // ============================================

  // App state - wraps the global appState object
  GameServices.register('state', () => {
    if (typeof appState !== 'undefined') {
      return appState;
    }
    throw new Error('[Bootstrap] appState not available');
  });

  // Active game modes tracker
  GameServices.register('gameModes', () => {
    if (typeof activeGameModes !== 'undefined') {
      return activeGameModes;
    }
    return {}; // Default empty
  });

  // ============================================
  // TIER 3: API & Network
  // ============================================

  // API client
  GameServices.register('api', () => {
    if (typeof ApiClient !== 'undefined') {
      return ApiClient;
    }
    throw new Error('[Bootstrap] ApiClient not available');
  });

  // Rate limiter
  GameServices.register('rateLimiter', () => {
    if (typeof RateLimiter !== 'undefined') {
      return RateLimiter;
    }
    // Return stub if not available
    return {
      canMakeCall: () => true,
    };
  });

  // ============================================
  // TIER 4: Utilities
  // ============================================

  // Anti-cheat system
  GameServices.register('antiCheat', () => {
    if (typeof AntiCheat !== 'undefined') {
      return AntiCheat;
    }
    // Return stub
    return {
      startSession: () => {},
      recordAction: () => {},
      endSession: () => ({ valid: true }),
      isSessionValid: () => true,
    };
  });

  // Sprite cache
  GameServices.register('spriteCache', () => {
    if (typeof SpriteCache !== 'undefined') {
      return SpriteCache;
    }
    return null;
  });

  // ============================================
  // TIER 5: UI Modules
  // ============================================

  GameServices.register('ui.rotation', () => {
    if (typeof GameRotation !== 'undefined') {
      return GameRotation;
    }
    return null;
  });

  GameServices.register('ui.leaderboard', () => {
    if (typeof LeaderboardUI !== 'undefined') {
      return LeaderboardUI;
    }
    return null;
  });

  GameServices.register('ui.competitive', () => {
    if (typeof CompetitiveUI !== 'undefined') {
      return CompetitiveUI;
    }
    return null;
  });

  GameServices.register('ui.grid', () => {
    if (typeof GridUI !== 'undefined') {
      return GridUI;
    }
    return null;
  });

  GameServices.register('ui.modal', () => {
    if (typeof ModalUI !== 'undefined') {
      return ModalUI;
    }
    return null;
  });

  // ============================================
  // TIER 6: Game Engines
  // ============================================

  GameServices.register('engines', () => {
    if (typeof GameEngines !== 'undefined') {
      return GameEngines;
    }
    return null;
  });

  // ============================================
  // TIER 7: External Dependencies (Browser APIs)
  // ============================================

  // Document (for testing/SSR compatibility)
  GameServices.register('document', () => {
    if (typeof document !== 'undefined') {
      return document;
    }
    return null;
  });

  // LocalStorage wrapper
  GameServices.register('storage', () => {
    if (typeof localStorage !== 'undefined') {
      return {
        get: key => {
          try {
            return localStorage.getItem(key);
          } catch {
            return null;
          }
        },
        set: (key, value) => {
          try {
            localStorage.setItem(key, value);
            return true;
          } catch {
            return false;
          }
        },
        remove: key => {
          try {
            localStorage.removeItem(key);
          } catch {
            // Ignore
          }
        },
      };
    }
    // Memory fallback for SSR/testing
    const memStore = new Map();
    return {
      get: key => memStore.get(key) || null,
      set: (key, value) => {
        memStore.set(key, value);
        return true;
      },
      remove: key => memStore.delete(key),
    };
  });

  // Wallet provider
  GameServices.register('wallet', () => {
    if (typeof window !== 'undefined' && window.phantom?.solana) {
      return window.phantom.solana;
    }
    return null;
  });

  console.log('[Bootstrap] Registered', GameServices.stats().registered, 'services');
}

/**
 * Initialize the application with DI
 * Call this from main.js after all scripts are loaded
 */
function initializeWithDI() {
  // Register services
  bootstrapServices();

  // Install legacy facades (optional - for backward compatibility)
  if (typeof installFacades === 'function') {
    installFacades();
  }

  // Boot container (lock it)
  GameServices.boot([
    'config', // Eager load config
    'games', // Eager load games
    'state', // Eager load state
  ]);

  console.log('[Bootstrap] Initialization complete', GameServices.stats());
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.bootstrapServices = bootstrapServices;
  window.initializeWithDI = initializeWithDI;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bootstrapServices, initializeWithDI };
}
