/**
 * ASDF Games - High-Performance Game Ticker (v2 - Variable Timestep)
 *
 * Provides a centralized, highly fluid game loop.
 * Scales perfectly to monitor refresh rate (60Hz, 144Hz, 240Hz) by passing
 * a normalized delta-time (dt) directly to the update function.
 *
 * Avoids the over-engineered "fixed timestep with interpolation" pattern
 * which causes visual stuttering if the draw functions aren't built for it.
 */

'use strict';

const GameTicker = {
  _frameId: null,
  _isRunning: false,
  _lastTime: 0,

  /**
   * Start the global ticker
   * @param {Function} updateFn - Logic & Render callback(dt). dt is normalized (1.0 at 60fps)
   * @param {Function} renderFn - Backward compatibility for engines still passing 2 args
   */
  start(updateFn, renderFn) {
    if (this._isRunning) return;
    this._isRunning = true;
    this._lastTime = performance.now();

    const loop = currentTime => {
      if (!this._isRunning) return;

      // Calculate raw delta in seconds
      let rawDelta = (currentTime - this._lastTime) / 1000;
      this._lastTime = currentTime;

      // Cap delta at 100ms (10fps minimum) to prevent physics exploding
      // when the user switches tabs or the browser hangs.
      if (rawDelta > 0.1) rawDelta = 0.1;

      // Normalize dt to a 60fps baseline.
      // If the screen is 144Hz, rawDelta is ~0.0069s, dt will be ~0.416
      // If the screen is 60Hz, rawDelta is ~0.0166s, dt will be ~1.0
      const dt = rawDelta * 60;

      try {
        // Run update and draw in the same cycle for absolute zero-latency
        // between physics calculations and screen rendering.
        updateFn(dt);
        if (renderFn) renderFn(1.0); // alpha is always 1.0 when perfectly synced
      } catch (e) {
        console.error('[GameTicker] Update/Render Error:', e);
      }

      this._frameId = requestAnimationFrame(loop);
    };

    this._frameId = requestAnimationFrame(loop);

    if (typeof GameEvents !== 'undefined') {
      GameEvents.emit('ticker:started');
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
