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
        alpha: false,
      });

      if (!this.ctx) {
        throw new Error('[GameInstance] Failed to get 2D context');
      }

      this.world = new ECS.World(options.maxEntities || 2000);
      this.inspector = options.debug ? new ASDF.DevInspector(this.world) : null;

      // Hooks for game-specific logic
      this.onUpdate = null;
      this.onRender = null;

      // Camera & Juice (11/10 Standard)
      this.camera = {
        x: 0,
        y: 0,
        shakeIntensity: 0,
        shakeTimer: 0,
      };

      this.loop = new FixedTimestepLoop(
        options.fps || 60,
        dt => {
          try {
            // Update Camera Shake
            if (this.camera.shakeTimer > 0) {
              this.camera.shakeTimer -= dt;
              if (this.camera.shakeTimer <= 0) {
                this.camera.shakeIntensity = 0;
                this.camera.x = 0;
                this.camera.y = 0;
              } else {
                this.camera.x = (Math.random() - 0.5) * this.camera.shakeIntensity;
                this.camera.y = (Math.random() - 0.5) * this.camera.shakeIntensity;
              }
            }

            this.world.update(dt);
            if (this.onUpdate) this.onUpdate(dt);
            if (this.inspector) this.inspector.update(dt);
          } catch (e) {
            console.error('[GameInstance] Update crash:', e);
            this.stop();
          }
        },
        alpha => {
          try {
            if (this.onRender) {
              // Apply Camera Transform before render
              this.ctx.save();
              this.ctx.translate(this.camera.x, this.camera.y);

              this.onRender(alpha);

              this.ctx.restore();
            } else {
              // Default background
              this.ctx.fillStyle = '#0a0a0f';
              this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
          } catch (e) {
            console.error('[GameInstance] Render crash:', e);
            this.stop();
          }
        }
      );

      this.initialized = false;
      this._standardComponentsInited = false;
    }

    /**
     * Trigger a camera shake effect
     * @param {number} intensity - Peak pixels to offset
     * @param {number} duration - Frames to shake
     */
    shake(intensity = 5, duration = 20) {
      this.camera.shakeIntensity = intensity;
      this.camera.shakeTimer = duration;
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

      // 11/10: Universal Juice
      if (typeof ASDF !== 'undefined' && ASDF.ParticleSystem) {
        ASDF.ParticleSystem.init(this.world);
        this.world.addSystem(ASDF.ParticleSystem.update());
      }

      this._standardComponentsInited = true;
    }

    /**
     * Start the game
     */
    start() {
      this.initStandardComponents();
      this.resize();
      if (!this.initialized) {
        this.initialized = true;
      }
      this.loop.start();
    }

    /**
     * Resize canvas to match container
     */
    resize() {
      if (!this.canvas) return;
      const parent = this.canvas.parentElement;
      if (!parent) return;

      const w = parent.clientWidth || 800;
      const h = parent.clientHeight || 600;

      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
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
