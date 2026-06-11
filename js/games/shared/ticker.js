/**
 * ASDF Games - High-Performance Game Ticker (v3 - "SmoothFlow")
 *
 * Centralized game loop designed for "Steam-like" fluidity.
 * Features: Sub-frame input synchronization and jitter-free delta-time.
 */

'use strict';

const GameTicker = {
  _frameId: null,
  _isRunning: false,
  _lastTime: 0,
  _inputBuffer: [], // Stores events that happened between frames

  /**
   * Start the global ticker
   * @param {Function} updateFn - callback(dt, inputBuffer)
   * @param {Function} renderFn - Backward compatibility for engines still passing 2 args
   */
  start(updateFn, renderFn) {
    if (this._isRunning) return;
    this._isRunning = true;
    this._lastTime = performance.now();
    this._inputBuffer = [];

    const loop = currentTime => {
      if (!this._isRunning) return;

      // 1. Precise timing
      let rawDelta = (currentTime - this._lastTime) / 1000;
      this._lastTime = currentTime;

      // Spiral of death prevention (max 100ms)
      if (rawDelta > 0.1) rawDelta = 0.1;

      // 60fps normalization (1.0 = 16.6ms)
      const dt = rawDelta * 60;

      // 2. High-Priority Input Processing
      // We pass the current buffer of events to the game before updating
      const frameInputs = [...this._inputBuffer];
      this._inputBuffer = [];

      try {
        // Run update and draw in one atomic operation
        updateFn(dt, frameInputs);
        if (renderFn) renderFn(1.0);
      } catch (e) {
        console.error('[GameTicker] Loop Error:', e);
      }

      this._frameId = requestAnimationFrame(loop);
    };

    this._frameId = requestAnimationFrame(loop);

    if (typeof GameEvents !== 'undefined') {
      GameEvents.emit('ticker:started');
    }
  },

  /**
   * Capture an input event to be processed in the next frame
   * This preserves the sub-frame timing of the action.
   */
  queueInput(type, data) {
    if (!this._isRunning) return;
    this._inputBuffer.push({
      type,
      data,
      timestamp: performance.now(),
    });
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
    this._inputBuffer = [];
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
