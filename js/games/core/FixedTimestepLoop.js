/**
 * ASDF Games - Fixed Timestep Game Loop
 * Best Practice 2026: Decouples physics updates from rendering framerate
 */

'use strict';

class FixedTimestepLoop {
  /**
   * @param {number} targetFPS - Desired physics updates per second (e.g., 60)
   * @param {Function} updateFn - Function to call for physics simulation (receives dt in seconds)
   * @param {Function} renderFn - Function to call for drawing to canvas (receives interpolation alpha)
   */
  constructor(targetFPS, updateFn, renderFn) {
    this.timeStep = 1000 / targetFPS; // Target MS per physics tick
    this.updateFn = updateFn;
    this.renderFn = renderFn;

    this.accumulator = 0;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.isRunning = false;

    this.loop = this.loop.bind(this);
  }

  /**
   * Start the loop
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  /**
   * Stop the loop
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Main internal loop
   * @param {number} currentTime - Provided by requestAnimationFrame
   */
  loop(currentTime) {
    if (!this.isRunning) return;

    let frameTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // "Spiral of Death" protection: clamp max frame time (e.g., 250ms)
    // Prevents the loop from trying to catch up indefinitely after a hang or backgrounding
    if (frameTime > 250) {
      frameTime = 250;
    }

    this.accumulator += frameTime;

    // Fixed timestep physics updates
    while (this.accumulator >= this.timeStep) {
      // Pass fixed delta time in seconds (e.g., 0.0166 for 60FPS)
      this.updateFn(this.timeStep / 1000);
      this.accumulator -= this.timeStep;
    }

    // Render interpolation factor (0.0 to 1.0)
    // alpha represents how far we are into the next physics frame
    const alpha = this.accumulator / this.timeStep;

    // Call render with interpolation factor
    this.renderFn(alpha);

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.FixedTimestepLoop = FixedTimestepLoop;
  window.FixedTimestepLoop = FixedTimestepLoop;
}
