/**
 * ASDF Games - High-Performance Game Ticker
 *
 * Provides a centralized, high-precision game loop with decoupling
 * between Simulation (Logic) and Rendering (Visuals).
 *
 * Scalability: Supports independent tick rates and interpolation.
 * Modularity: Engines can subscribe to tick events without owning the loop.
 */

'use strict';

const GameTicker = {
  // Config
  fps: 60,
  maxFrameTime: 250, // Prevent "spiral of death" after tab focus return

  // State
  _lastTime: 0,
  _accumulator: 0,
  _frameId: null,
  _isRunning: false,

  // Decoupled rates
  tickRate: 1000 / 60, // Fixed simulation step (60Hz)

  /**
   * Start the global ticker
   * @param {Function} updateFn - Logic update callback(dt)
   * @param {Function} renderFn - Render callback(alpha) for interpolation
   */
  start(updateFn, renderFn) {
    if (this._isRunning) return;
    this._isRunning = true;
    this._lastTime = performance.now();
    this._accumulator = 0;

    const loop = currentTime => {
      if (!this._isRunning) return;

      let frameTime = currentTime - this._lastTime;
      if (frameTime > this.maxFrameTime) frameTime = this.maxFrameTime;

      this._lastTime = currentTime;
      this._accumulator += frameTime;

      // Fixed Timestep Simulation
      // Logic runs at a constant rate regardless of rendering FPS
      while (this._accumulator >= this.tickRate) {
        try {
          updateFn(1.0); // dt is normalized to 1 unit per tickRate
        } catch (e) {
          console.error('[GameTicker] Update Error:', e);
        }
        this._accumulator -= this.tickRate;
      }

      // Variable Rate Rendering
      // Alpha is the interpolation factor (0.0 to 1.0)
      // Representing how far we are between two simulation ticks
      const alpha = this._accumulator / this.tickRate;
      try {
        renderFn(alpha);
      } catch (e) {
        console.error('[GameTicker] Render Error:', e);
      }

      this._frameId = requestAnimationFrame(loop);
    };

    this._frameId = requestAnimationFrame(loop);
    if (typeof GameEvents !== 'undefined') {
      GameEvents.emit('ticker:started', { fps: this.fps });
    }
  },

  /**
   * Stop the ticker
   */
  stop() {
    this._isRunning = false;
    if (this._frameId) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
    if (typeof GameEvents !== 'undefined') {
      GameEvents.emit('ticker:stopped');
    }
  },
};

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.GameTicker = GameTicker;
  window.GameTicker = GameTicker;
}
