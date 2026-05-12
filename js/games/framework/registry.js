/**
 * ASDF Game Registry — Self-Registration Map
 *
 * Central registry for all game engines.
 * Each engine file ends with: GameRegistry.register('gameid', ModuleInstance)
 * Replaces typeof polling in engines/index.js
 *
 * @module games/framework/registry
 */

'use strict';

const GameRegistry = {
  _map: new Map(),
  _locked: false,

  /**
   * Register a game engine
   * SOLID: O (Open/Closed) — locked after GameEngines.init()
   * @param {string} gameId - The game ID (e.g., 'spaceshooter')
   * @param {Object} engine - The engine object with start/stop/version properties
   */
  register(gameId, engine) {
    if (this._locked) {
      console.error('[GameRegistry] Registry locked. Cannot register after GameEngines.init()');
      return;
    }

    if (!gameId || typeof gameId !== 'string') {
      console.error('[GameRegistry] Invalid gameId:', gameId);
      return;
    }
    if (!engine || typeof engine.start !== 'function') {
      console.error(`[GameRegistry] Invalid engine for ${gameId}: missing start() method`);
      return;
    }
    this._map.set(gameId, engine);
  },

  /**
   * Get a registered engine by ID
   * @param {string} gameId - The game ID
   * @returns {Object|undefined} The engine object or undefined
   */
  get(gameId) {
    return this._map.get(gameId);
  },

  /**
   * Flush all registered engines into GameEngines object
   * Call once during GameEngines.init() to populate from registry
   */
  flush() {
    if (typeof GameEngines === 'undefined') {
      console.warn('[GameRegistry] GameEngines not found, skipping flush');
      return;
    }

    for (const [gameId, engine] of this._map) {
      GameEngines[gameId] = engine;
    }
  },

  /**
   * Get list of all registered game IDs
   * @returns {string[]} Array of game IDs
   */
  getAll() {
    return Array.from(this._map.keys());
  },

  /**
   * Check if a game is registered
   * @param {string} gameId - The game ID
   * @returns {boolean} True if registered
   */
  has(gameId) {
    return this._map.has(gameId);
  },

  /**
   * Get all registered engines
   * @returns {Map} Map of gameId -> engine
   */
  getMap() {
    return this._map;
  },

  /**
   * Clear registry (for testing only, ignores lock)
   */
  clear() {
    this._map.clear();
  },

  /**
   * Lock registry to prevent post-init registration
   * Called by GameEngines.init()
   */
  lock() {
    this._locked = true;
  },

  /**
   * Unlock registry (TEST ONLY)
   * Used in beforeEach for test isolation
   */
  unlock() {
    this._locked = false;
  },

  /**
   * Check if registry is locked
   * @returns {boolean} True if locked
   */
  isLocked() {
    return this._locked;
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.GameRegistry = GameRegistry;
}
