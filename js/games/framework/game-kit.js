/**
 * ASDF Game Framework — GameKit Facade (SOLID: Interface Segregation)
 *
 * Three factory methods:
 * - createCore(manifest): Essential only (canvas, state, destroy)
 * - createWithSubsystems(manifest, subsystems): Pick what you need
 * - create(manifest): Legacy—all subsystems (backward compatible)
 *
 * Pattern: Facade pattern, dependency injection via manifest
 * SOLID: I — Games declare dependencies, don't get everything
 *
 * @module games/framework/game-kit
 */

'use strict';

const GameKit = {
  /**
   * Create minimal game context (core only, no subsystems)
   * SOLID: Interface Segregation — only what's needed
   *
   * @param {Object} manifest - Game manifest configuration
   * @param {string} manifest.gameId - Game ID (e.g., 'spaceshooter')
   * @param {string} [manifest.canvasSelector] - CSS selector for canvas element
   * @param {HTMLCanvasElement} [manifest.canvas] - Canvas element directly
   * @param {string} [manifest.arenaSelector] - CSS selector for arena container
   * @param {number} [manifest.canvasWidth=800] - Canvas width
   * @param {number} [manifest.canvasHeight=600] - Canvas height
   * @param {Object} [manifest.initialState] - Initial game state
   * @returns {Object} GameKit core context {gameId, version, canvas, ctx, arena, state, destroy}
   */
  createCore(manifest = {}) {
    const {
      gameId = 'game',
      canvasSelector,
      canvas,
      arenaSelector,
      canvasWidth = 800,
      canvasHeight = 600,
      initialState = {},
    } = manifest;

    // 1. Get or create canvas
    let canvasEl = canvas;
    if (!canvasEl && canvasSelector) {
      canvasEl = document.querySelector(canvasSelector);
    }
    if (!canvasEl) {
      console.error('[GameKit] Canvas not found or provided');
      return null;
    }

    canvasEl.width = canvasWidth;
    canvasEl.height = canvasHeight;
    const ctx = canvasEl.getContext('2d');

    if (!ctx) {
      console.error('[GameKit] Failed to get 2D context');
      return null;
    }

    // Core context: only essentials
    const kit = {
      // Meta
      gameId,
      version: '1.0.0',

      // DOM
      canvas: canvasEl,
      ctx,
      arena: arenaSelector ? document.querySelector(arenaSelector) : null,

      // State
      state: { ...initialState },

      // Cleanup (overridden by createWithSubsystems if subsystems added)
      destroy() {
        // Clear canvas
        if (this.ctx && this.canvas) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
      },
    };

    return kit;
  },

  /**
   * Create game context with optional subsystems (SOLID: I)
   * Games declare only what they need
   *
   * @param {Object} manifest - Game manifest configuration
   * @param {string[]} [subsystems=['timing', 'input', 'intervals', 'camera', 'hud', 'assets', 'scene']] - Which subsystems to include
   * @returns {Object} GameKit context with requested subsystems
   *
   * Available subsystems: timing, input, intervals, camera, hud, assets, scene, renderer
   */
  createWithSubsystems(manifest = {}, subsystems = []) {
    // Start with core
    const kit = this.createCore(manifest);
    if (!kit) return null;

    const {
      canvasWidth = 800,
      canvasHeight = 600,
      hud,
      assets,
      input,
      worldWidth = 5000,
      worldHeight = 5000,
    } = manifest;

    const subsystemSet = new Set(subsystems);

    // Validate subsystems
    const validSubsystems = new Set([
      'timing',
      'input',
      'intervals',
      'camera',
      'hud',
      'assets',
      'scene',
      'renderer',
    ]);
    for (const sys of subsystemSet) {
      if (!validSubsystems.has(sys)) {
        console.warn(`[GameKit] Unknown subsystem: ${sys}`);
        subsystemSet.delete(sys);
      }
    }

    // Add requested subsystems
    if (subsystemSet.has('timing')) {
      kit.timing = typeof GameTiming !== 'undefined' ? GameTiming.create() : null;
    }

    if (subsystemSet.has('input')) {
      kit.input = typeof InputManager !== 'undefined' ? InputManager.create(input || {}) : null;
    }

    if (subsystemSet.has('intervals')) {
      kit.intervals = typeof IntervalManager !== 'undefined' ? IntervalManager.create() : null;
    }

    if (subsystemSet.has('camera')) {
      kit.camera =
        typeof CameraFactory !== 'undefined'
          ? CameraFactory.create({
              width: canvasWidth,
              height: canvasHeight,
              worldWidth,
              worldHeight,
            })
          : null;
    }

    if (subsystemSet.has('hud')) {
      kit.hud =
        hud && typeof HudFactory !== 'undefined'
          ? HudFactory.create({
              gameId: kit.gameId,
              container: manifest.arenaSelector,
              items: hud.items || [],
            })
          : null;
    }

    if (subsystemSet.has('assets')) {
      kit.assets = typeof AssetLoader !== 'undefined' ? AssetLoader : null;
    }

    if (subsystemSet.has('scene')) {
      kit.scene = typeof SceneManager !== 'undefined' ? SceneManager.create() : null;
    }

    if (subsystemSet.has('renderer')) {
      kit.renderer =
        typeof RendererFactory !== 'undefined'
          ? RendererFactory.create('2d', {
              canvas: kit.canvas,
              width: canvasWidth,
              height: canvasHeight,
            })
          : null;
    }

    // Enhanced destroy: cleanup all active subsystems
    const originalDestroy = kit.destroy.bind(kit);
    kit.destroy = function () {
      // Stop scene
      if (this.scene && typeof SceneManager !== 'undefined') {
        SceneManager.stop(this.scene);
      }

      // Cleanup intervals
      if (this.intervals && typeof this.intervals.clear === 'function') {
        this.intervals.clear();
      }

      // Cleanup input
      if (this.input && typeof this.input.destroy === 'function') {
        this.input.destroy();
      }

      // Cleanup HUD
      if (this.hud && typeof this.hud.destroy === 'function') {
        this.hud.destroy();
      }

      // Call core destroy
      originalDestroy();
    };

    return kit;
  },

  /**
   * Create complete game context (BACKWARD COMPATIBLE)
   * Includes ALL subsystems for legacy games
   * @deprecated Use createCore() or createWithSubsystems() for new games
   * @param {Object} manifest - Game manifest configuration
   * @returns {Object} GameKit context with all subsystems wired
   */
  create(manifest = {}) {
    // For backward compatibility: include all subsystems
    return this.createWithSubsystems(manifest, [
      'timing',
      'input',
      'intervals',
      'camera',
      'hud',
      'assets',
      'scene',
    ]);
  },

  /**
   * Validate engine contract
   * @param {Object} engine - Engine instance
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateEngine(engine) {
    const errors = [];

    if (!engine) {
      errors.push('Engine is null or undefined');
      return { valid: false, errors };
    }

    if (typeof engine.start !== 'function') {
      errors.push('Missing start() method');
    }

    if (typeof engine.stop !== 'function') {
      errors.push('Missing stop() method');
    }

    if (!engine.version) {
      errors.push('Missing version property');
    }

    if (!engine.gameId) {
      errors.push('Missing gameId property');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.GameKit = GameKit;
}
