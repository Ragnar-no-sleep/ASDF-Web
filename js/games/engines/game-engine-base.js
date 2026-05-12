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

  /**
   * Standard game loop — requestAnimationFrame with delta time
   * Requires: this.state, this.timing, this.update(dt), this.draw()
   */
  gameLoop() {
    const self = this;
    function loop(timestamp) {
      if (!self.state || self.state.gameOver) return;
      const dt = self.timing.tick(timestamp);
      self.update(dt);
      self.draw();
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  },

  /**
   * Register an event handler for automatic cleanup on stop()
   * @param {EventTarget} target - DOM element or document
   * @param {string} event - Event name (e.g., 'keydown')
   * @param {Function} handler - Event handler function
   */
  trackHandler(target, event, handler) {
    if (!this._handlers) this._handlers = [];
    target.addEventListener(event, handler);
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
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
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
    return particles.filter(p => {
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.life -= dt;
      if (p.vy !== undefined) p.vy += (p.gravity || 0) * dt;
      return p.life > 0;
    });
  },
};

// Export for both module and window contexts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.GameEngineBase = GameEngineBase;
  window.GameEngineBase = GameEngineBase;
}
