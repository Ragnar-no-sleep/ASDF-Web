/**
 * GameEngineBase — Shared mixin for ASDF game engines
 *
 * Provides reusable lifecycle methods extracted from common patterns
 * across 9 game engines (~700 lines of duplicated code).
 *
 * Usage (object spread):
 *   const MyGame = {
 *     ...GameEngineBase,
 *     // Override update, draw, createArena, setupInput
 *     update(dt) { ... },
 *     draw() { ... },
 *   };
 *
 * Usage (selective):
 *   const MyGame = {
 *     gameLoop: GameEngineBase.gameLoop,
 *     stop() {
 *       GameEngineBase.cleanupHandlers.call(this);
 *       this.canvas = null; this.ctx = null; this.state = null;
 *     },
 *   };
 *
 * @module games/engines/game-engine-base
 */

'use strict';

const GameEngineBase = {
  // Common properties (initialized in start)
  gameId: null,
  canvas: null,
  ctx: null,
  timing: null,
  state: null,
  _handlers: null, // Tracked event handlers for auto-cleanup
  _active: false,

  /**
   * Standard initialization logic
   * @param {string} gameId - Game identifier
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  init(gameId, canvas) {
    this.gameId = gameId;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._active = true;
    this._handlers = [];
  },

  /**
   * Standard game loop — requestAnimationFrame with delta time
   * Requires: this.state, this.timing, this.update(dt), this.draw()
   */
  gameLoop() {
    const self = this;
    const fpsInterval = 1000 / 60; // Cap to 60 FPS
    let then = performance.now();

    function loop(timestamp) {
      if (!self._active || (self.state && self.state.gameOver)) return;
      requestAnimationFrame(loop);

      const elapsed = timestamp - then;
      if (elapsed >= fpsInterval) {
        then = timestamp - (elapsed % fpsInterval);
        const dt = self.timing.tick(timestamp);
        self.update(dt);
        self.draw();
      }
    }
    requestAnimationFrame(loop);
  },

  /**
   * Object Pool properties
   */
  _pools: null,

  /**
   * Get or create a pool for a specific object type
   */
  getPool(type) {
    if (!this._pools) this._pools = {};
    if (!this._pools[type]) this._pools[type] = [];
    return this._pools[type];
  },

  /**
   * Request an object from the pool or create a new one
   */
  spawn(type, props) {
    const pool = this.getPool(type);
    let obj = pool.pop();
    if (!obj) obj = { type };
    return Object.assign(obj, props);
  },

  /**
   * Return an object to its pool
   */
  recycle(obj) {
    if (!obj.type) return;
    this.getPool(obj.type).push(obj);
  },

  /**
   * Register an event handler for automatic cleanup on stop()
   * Alias for trackHandler
   * @param {EventTarget} target - DOM element or document
   * @param {string} event - Event name (e.g., 'keydown')
   * @param {Function} handler - Event handler function
   * @param {Object} options - AddEventListener options
   */
  track(target, event, handler, options = {}) {
    this.trackHandler(target, event, handler, options);
  },

  /**
   * Register an event handler for automatic cleanup on stop()
   * @param {EventTarget} target - DOM element or document
   * @param {string} event - Event name (e.g., 'keydown')
   * @param {Function} handler - Event handler function
   * @param {Object} options - AddEventListener options
   */
  trackHandler(target, event, handler, options = {}) {
    if (!this._handlers) this._handlers = [];
    target.addEventListener(event, handler, options);
    this._handlers.push({ target, event, handler });
  },

  /**
   * Remove all tracked event handlers
   * Call this in stop() to ensure clean teardown
   */
  cleanupHandlers() {
    if (!this._handlers) return;
    this._handlers.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler);
    });
    this._handlers = null;
  },

  /**
   * Standard stop — sets gameOver, cleans handlers, nulls canvas refs
   * Override in engine if additional cleanup is needed
   */
  stop() {
    this._active = false;
    if (this.state) this.state.gameOver = true;
    this.cleanupHandlers();
    this.canvas = null;
    this.ctx = null;
    this.state = null;
    this.timing = null;
  },

  /**
   * Standard canvas resize — fills parent container
   * Requires: this.canvas
   */
  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    // Support for hidden/animating parents - use fallback if 0
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    this.canvas.width = w > 0 ? w : 800;
    this.canvas.height = h > 0 ? h : 600;
  },

  /**
   * Register engine instance in global activeGames for external cleanup
   * @param {string} gameId - Game identifier
   */
  registerActiveGame(gameId) {
    if (typeof activeGames !== 'undefined') {
      activeGames[gameId] = { cleanup: () => this.stop() };
    }
  },

  /**
   * Update particle array — common physics: position += velocity, filter by life
   * @param {Array} particles - Particle array to update
   * @param {number} dt - Delta time
   * @returns {Array} Filtered particles (alive only)
   */
  updateParticles(particles, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.life -= dt;
      if (p.vy !== undefined) p.vy += (p.gravity || 0) * dt;

      if (p.life <= 0) {
        const last = particles.pop();
        if (i < particles.length) {
          particles[i] = last;
        }
        if (this.recycle) this.recycle(p);
      }
    }
    return particles;
  },
};

// Export for both module and window contexts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.GameEngineBase = GameEngineBase;
  window.GameEngineBase = GameEngineBase;
}
