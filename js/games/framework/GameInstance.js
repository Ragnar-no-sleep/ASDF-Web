/**
 * ASDF Games - 11/10 Game Instance
 * Unified entry point for ECS-based games.
 */

'use strict';

(function () {
  class GameInstance {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', {
        desynchronized: true,
        alpha: false,
      });

      if (!this.ctx) {
        console.warn('[GameInstance] Desynchronized context failed, falling back to standard.');
        this.ctx = canvas.getContext('2d');
      }

      this.world = new ECS.World(options.maxEntities || 2000);
      this.inspector = options.debug ? new ASDF.DevInspector(this.world) : null;

      this.loop = new FixedTimestepLoop(
        options.fps || 60,
        this.update.bind(this),
        this.render.bind(this)
      );

      this.initialized = false;
      this._standardComponentsInited = false;
    }

    /**
     * Define standard components with strict RAM-optimized typing
     */
    initStandardComponents() {
      if (this._standardComponentsInited) return;
      this.world.registerComponent('Position', { x: 'f32', y: 'f32' });
      this.world.registerComponent('Velocity', { vx: 'f32', vy: 'f32' });
      this.world.registerComponent('Renderable', { iconIndex: 'u8', size: 'u8', alpha: 'f32' });
      this.world.registerComponent('Collider', { width: 'u16', height: 'u16', active: 'u8' });
      this.world.registerComponent('Controllable', { speed: 'f32' });
      this._standardComponentsInited = true;
    }

    /**
     * Start the game
     */
    start() {
      if (!this.initialized) {
        this.initStandardComponents();
        this.initialized = true;
      }
      this.loop.start();
    }

    /**
     * Stop the game
     */
    stop() {
      this.loop.stop();
      if (this.inspector && this.inspector.container) {
        this.inspector.container.remove();
      }
    }

    update(dt) {
      this.world.update(dt);
      if (this.inspector) this.inspector.update(dt);
    }

    render(alpha) {
      this.ctx.fillStyle = '#0a0a0f';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.GameInstance = GameInstance;
  }
})();
