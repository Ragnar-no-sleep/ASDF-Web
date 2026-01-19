/**
 * ASDF Games - Timing Utilities
 *
 * Frame-independent timing for smooth gameplay across all refresh rates
 * Target: 60 FPS baseline, scales properly on 30Hz, 144Hz, 240Hz displays
 *
 * Usage:
 *   const timing = GameTiming.create();
 *
 *   gameLoop() {
 *       const dt = timing.tick();
 *       player.x += speed * dt;  // Frame-independent movement
 *       requestAnimationFrame(gameLoop);
 *   }
 */

'use strict';

const GameTiming = {
    /**
     * Create a new timing instance for a game
     * @returns {Object} Timing instance with tick() method
     */
    create() {
        return {
            lastTime: 0,
            deltaTime: 0,
            fps: 60,
            frameCount: 0,
            fpsUpdateTime: 0,
            targetFps: 60,
            maxDelta: 0.1, // Cap at 100ms to prevent huge jumps on tab switch

            /**
             * Call at the start of each frame
             * @param {number} timestamp - requestAnimationFrame timestamp
             * @returns {number} deltaTime normalized to 60fps (1.0 = 16.67ms)
             */
            tick(timestamp) {
                if (!timestamp) timestamp = performance.now();

                if (this.lastTime === 0) {
                    this.lastTime = timestamp;
                    return 1;
                }

                // Calculate raw delta in seconds
                const rawDelta = (timestamp - this.lastTime) / 1000;
                this.lastTime = timestamp;

                // Cap delta to prevent physics explosions after tab switch
                const cappedDelta = Math.min(rawDelta, this.maxDelta);

                // Normalize to 60fps baseline (1.0 at 60fps, 0.5 at 120fps, 2.0 at 30fps)
                this.deltaTime = cappedDelta * this.targetFps;

                // Update FPS counter every 500ms
                this.frameCount++;
                if (timestamp - this.fpsUpdateTime >= 500) {
                    this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.fpsUpdateTime));
                    this.frameCount = 0;
                    this.fpsUpdateTime = timestamp;
                }

                return this.deltaTime;
            },

            /**
             * Get current FPS
             * @returns {number} Frames per second
             */
            getFps() {
                return this.fps;
            },

            /**
             * Reset timing (call when game restarts)
             */
            reset() {
                this.lastTime = 0;
                this.deltaTime = 0;
                this.frameCount = 0;
                this.fpsUpdateTime = 0;
            }
        };
    },

    /**
     * Lerp helper for smooth value transitions
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @param {number} speed - Interpolation speed (0-1)
     * @param {number} dt - Delta time
     * @returns {number} Interpolated value
     */
    lerp(current, target, speed, dt) {
        const t = 1 - Math.pow(1 - speed, dt);
        return current + (target - current) * t;
    },

    /**
     * Smooth damp for camera-like following
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @param {Object} velocity - Object with 'value' property (modified in place)
     * @param {number} smoothTime - Approximate time to reach target
     * @param {number} dt - Delta time
     * @returns {number} New value
     */
    smoothDamp(current, target, velocity, smoothTime, dt) {
        const omega = 2 / smoothTime;
        const x = omega * dt / 60; // Normalize dt
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const change = current - target;
        const temp = (velocity.value + omega * change) * dt / 60;
        velocity.value = (velocity.value - omega * temp) * exp;
        return target + (change + temp) * exp;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.GameTiming = GameTiming;
}
