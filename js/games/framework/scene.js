/**
 * ASDF Game Framework — Scene Manager
 *
 * Phaser-compatible scene lifecycle: preload -> create -> gameLoop(update+render) -> shutdown
 * Drives game loop with requestAnimationFrame and delta time
 * Pattern: Each game implements a scene config object with these methods
 *
 * @module games/framework/scene
 */

'use strict';

const SceneManager = {
  /**
   * Create a new scene
   * @param {Object} config - Scene configuration
   * @param {Function} config.preload - async function to load assets
   * @param {Function} config.create - function to initialize game state
   * @param {Function} config.update - function(dt) called each frame
   * @param {Function} config.render - function(ctx) called each frame to draw
   * @param {Function} [config.shutdown] - function called on scene stop
   * @returns {Object} Scene object
   */
  create(config = {}) {
    return {
      preload: config.preload || (() => {}),
      create: config.create || (() => {}),
      update: config.update || (() => {}),
      render: config.render || (() => {}),
      shutdown: config.shutdown || (() => {}),
      _isRunning: false,
      _startTime: 0,
      _lastTime: 0,
      _rafId: null,
    };
  },

  /**
   * Run a scene: preload -> create -> game loop
   * @param {Object} scene - Scene object from create()
   * @param {HTMLCanvasElement} canvas - Canvas element to render to
   * @param {CanvasRenderingContext2D} ctx - 2D canvas context
   */
  async run(scene, canvas, ctx) {
    if (!scene || !canvas || !ctx) {
      console.error('[SceneManager] Missing scene/canvas/ctx');
      return;
    }

    if (scene._isRunning) {
      console.warn('[SceneManager] Scene already running');
      return;
    }

    scene._isRunning = true;
    scene._startTime = performance.now();
    scene._lastTime = scene._startTime;

    // Preload phase
    try {
      await scene.preload();
    } catch (e) {
      console.error('[SceneManager] Preload error:', e);
      return;
    }

    // Create phase
    try {
      scene.create();
    } catch (e) {
      console.error('[SceneManager] Create error:', e);
      return;
    }

    // Game loop
    const gameLoop = now => {
      if (!scene._isRunning) return;

      const dt = Math.min((now - scene._lastTime) / 1000, 0.033); // Cap at 33ms
      scene._lastTime = now;

      // Update phase
      try {
        scene.update(dt);
      } catch (e) {
        console.error('[SceneManager] Update error:', e);
        return;
      }

      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render phase
      try {
        scene.render(ctx);
      } catch (e) {
        console.error('[SceneManager] Render error:', e);
        return;
      }

      scene._rafId = requestAnimationFrame(gameLoop);
    };

    scene._rafId = requestAnimationFrame(gameLoop);
  },

  /**
   * Stop a scene and clean up
   * @param {Object} scene - Scene object
   */
  stop(scene) {
    if (!scene || !scene._isRunning) return;

    scene._isRunning = false;

    if (scene._rafId) {
      cancelAnimationFrame(scene._rafId);
      scene._rafId = null;
    }

    try {
      scene.shutdown();
    } catch (e) {
      console.error('[SceneManager] Shutdown error:', e);
    }
  },

  /**
   * Check if scene is running
   * @param {Object} scene - Scene object
   * @returns {boolean} True if running
   */
  isRunning(scene) {
    return scene && scene._isRunning;
  },

  /**
   * Get elapsed time since scene started (in seconds)
   * @param {Object} scene - Scene object
   * @returns {number} Elapsed time
   */
  getElapsedTime(scene) {
    if (!scene) return 0;
    return (scene._lastTime - scene._startTime) / 1000;
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.SceneManager = SceneManager;
}
