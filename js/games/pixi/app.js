/**
 * PixiJS v8 Application Wrapper
 * Vanilla JavaScript - No TypeScript, No React
 *
 * @description Singleton pattern for PixiJS Application management
 */

// PixiJS loaded via CDN or import map
const { Application } = globalThis.PIXI || (await import('pixi.js'));

/**
 * PixiJS Application Singleton
 */
export const PixiApp = {
  /** @type {Application|null} */
  instance: null,

  /** @type {boolean} */
  initialized: false,

  /**
   * Initialize PixiJS Application
   * @param {HTMLCanvasElement} canvas - Target canvas element
   * @param {Object} options - Configuration options
   * @returns {Promise<Application>}
   */
  async init(canvas, options = {}) {
    if (this.initialized && this.instance) {
      console.warn('[PixiApp] Already initialized, returning existing instance');
      return this.instance;
    }

    const app = new Application();

    await app.init({
      canvas,
      background: options.background || '#1a1a2e',
      resolution: options.resolution || window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: options.antialias !== false,
      powerPreference: 'high-performance',
      ...options,
    });

    // Handle resize
    if (options.resizeTo) {
      app.resizeTo = options.resizeTo;
    }

    this.instance = app;
    this.initialized = true;

    console.log('[PixiApp] Initialized', {
      width: app.screen.width,
      height: app.screen.height,
      renderer: app.renderer.type === 1 ? 'WebGL' : 'WebGPU',
    });

    return app;
  },

  /**
   * Get the application instance
   * @returns {Application|null}
   */
  get app() {
    return this.instance;
  },

  /**
   * Get the stage container
   * @returns {Container|null}
   */
  get stage() {
    return this.instance?.stage || null;
  },

  /**
   * Get the ticker for game loop
   * @returns {Ticker|null}
   */
  get ticker() {
    return this.instance?.ticker || null;
  },

  /**
   * Get the renderer
   * @returns {Renderer|null}
   */
  get renderer() {
    return this.instance?.renderer || null;
  },

  /**
   * Get screen dimensions
   * @returns {{width: number, height: number}}
   */
  get screen() {
    return this.instance?.screen || { width: 0, height: 0 };
  },

  /**
   * Add update callback to ticker
   * @param {Function} callback - Update function (receives delta)
   * @param {Object} context - Callback context
   * @returns {Function} - The callback for removal
   */
  addUpdate(callback, context = null) {
    if (!this.instance) {
      console.error('[PixiApp] Not initialized');
      return null;
    }
    this.instance.ticker.add(callback, context);
    return callback;
  },

  /**
   * Remove update callback from ticker
   * @param {Function} callback - Update function to remove
   * @param {Object} context - Callback context
   */
  removeUpdate(callback, context = null) {
    if (!this.instance) return;
    this.instance.ticker.remove(callback, context);
  },

  /**
   * Pause the game loop
   */
  pause() {
    if (this.instance) {
      this.instance.ticker.stop();
    }
  },

  /**
   * Resume the game loop
   */
  resume() {
    if (this.instance) {
      this.instance.ticker.start();
    }
  },

  /**
   * Set target FPS
   * @param {number} fps - Target frames per second
   */
  setFPS(fps) {
    if (this.instance) {
      this.instance.ticker.maxFPS = fps;
    }
  },

  /**
   * Destroy the application and cleanup
   */
  destroy() {
    if (this.instance) {
      this.instance.destroy(true, { children: true, texture: true });
      this.instance = null;
      this.initialized = false;
      console.log('[PixiApp] Destroyed');
    }
  },

  /**
   * Reset for new game (keeps app, clears stage)
   */
  reset() {
    if (this.instance) {
      this.instance.stage.removeChildren();
    }
  },
};

export default PixiApp;
