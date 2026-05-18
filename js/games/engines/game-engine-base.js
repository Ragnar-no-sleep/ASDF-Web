/**
 * GameEngineBase — 2026 Standard Mixin for ASDF game engines
 *
 * Provides reusable lifecycle methods extracted from common patterns.
 * UPGRADE 2.0: Integrates FixedTimestepLoop and Zero-Allocation patterns.
 *
 * @module games/engines/game-engine-base
 */

'use strict';

(function () {
  const GameEngineBase = {
    // Core properties
    gameId: null,
    canvas: null,
    ctx: null,
    physicsLoop: null, // FixedTimestepLoop instance
    state: null,
    _handlers: null,
    _active: false,
    _pools: new Map(),

    /**
     * Standard initialization logic (2026 Standard)
     * @param {string} gameId - Game identifier
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    init(gameId, canvas) {
      this.gameId = gameId;
      this.canvas = canvas;

      // 1. Context Optimization (Skip if canvas-less like WhaleWatch)
      if (canvas) {
        this.ctx = canvas.getContext('2d', {
          desynchronized: true, // Bypass browser compositor
          alpha: false, // Opaque is faster
          willReadFrequently: false,
        });
      }

      // 2. Lifecycle tracking
      this._active = true;
      this._handlers = [];
      this._pools = new Map(); // 11/10: Ensure independent pool per instance

      // 3. Initialize Loop (Fixed Timestep)
      if (typeof FixedTimestepLoop !== 'undefined' && canvas) {
        this.physicsLoop = new FixedTimestepLoop(
          60, // Physics at 60Hz
          dt => this.update(dt), // Update function
          alpha => this.draw(alpha) // Render function
        );
      } else if (!canvas) {
        console.log(`[GameEngineBase] ${gameId} initialized in headless/DOM-only mode.`);
      } else {
        console.warn('[GameEngineBase] FixedTimestepLoop missing. Falling back to legacy loop.');
      }
    },

    /**
     * Start the game loop
     */
    gameLoop() {
      if (this.physicsLoop) {
        this.physicsLoop.start();
      } else {
        // LEGACY FALLBACK
        const self = this;
        let then = performance.now();
        const loop = now => {
          if (!self._active || (self.state && self.state.gameOver)) return;
          requestAnimationFrame(loop);
          const dt = (now - then) / 1000;
          then = now;
          self.update(dt);
          self.draw();
        };
        requestAnimationFrame(loop);
      }
    },

    /**
     * Stop and cleanup
     */
    stop() {
      this._active = false;
      if (this.physicsLoop) this.physicsLoop.stop();
      if (this.state) this.state.gameOver = true;

      this.cleanupHandlers();

      // Clear references to prevent memory leaks
      this.canvas = null;
      this.ctx = null;
      this.state = null;
    },

    /**
     * Event tracking for auto-cleanup
     */
    trackHandler(target, event, handler, options = {}) {
      if (!this._handlers) this._handlers = [];
      target.addEventListener(event, handler, options);
      this._handlers.push({ target, event, handler });
    },

    // Alias for trackHandler
    track(target, event, handler, options) {
      this.trackHandler(target, event, handler, options);
    },

    cleanupHandlers() {
      if (!this._handlers) return;
      this._handlers.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      this._handlers = null;
    },

    /**
     * Object Pooling (V2 - High Performance)
     */
    spawn(type, props) {
      let pool = this._pools.get(type);
      if (!pool) {
        pool = [];
        this._pools.set(type, pool);
      }

      const obj = pool.pop() || { type };
      return Object.assign(obj, props);
    },

    recycle(obj) {
      if (!obj || !obj.type) return;
      const pool = this._pools.get(obj.type);
      if (pool) pool.push(obj);
    },

    /**
     * Common Physics: Particle Update
     * Optimized: Swaps with last element to avoid splice() O(n)
     */
    updateParticles(particles, dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        p.life -= dt;

        if (p.vy !== undefined && p.gravity) {
          p.vy += p.gravity * dt;
        }

        if (p.life <= 0) {
          // Swap and Pop (Fast delete)
          const last = particles.pop();
          if (i < particles.length) {
            particles[i] = last;
          }
          this.recycle(p);
        }
      }
      return particles;
    },

    /**
     * Canvas Resize
     */
    resizeCanvas() {
      if (!this.canvas) return;
      const parent = this.canvas.parentElement;
      if (!parent) return;

      const w = parent.clientWidth || 800;
      const h = parent.clientHeight || 600;

      // Only resize if different (prevents loop thrashing)
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    },

    /**
     * Register in global activeGames registry
     */
    registerActiveGame(gameId) {
      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.GameEngineBase = GameEngineBase;
    window.GameEngineBase = window.ASDF.GameEngineBase;
  }
})();
