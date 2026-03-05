/**
 * ASDF Game Framework — 2D Camera
 *
 * Following camera with bounds, shake, and world-to-screen transform
 * Pattern: Factory pattern, stateful camera object
 *
 * @module games/framework/camera
 */

'use strict';

const CameraFactory = {
  /**
   * Create a new 2D camera
   * @param {Object} config - Configuration
   * @param {number} config.width - Camera width (viewport width)
   * @param {number} config.height - Camera height (viewport height)
   * @param {number} [config.worldWidth=5000] - World width boundary
   * @param {number} [config.worldHeight=5000] - World height boundary
   * @param {number} [config.smoothDamp=0.1] - Damping factor for smooth follow (0-1)
   * @returns {Object} Camera instance
   */
  create(config = {}) {
    return {
      x: config.x || 0,
      y: config.y || 0,
      width: config.width || 800,
      height: config.height || 600,
      worldWidth: config.worldWidth || 5000,
      worldHeight: config.worldHeight || 5000,
      smoothDamp: config.smoothDamp || 0.1,

      // Follow target
      followTarget: null,
      followOffsetX: 0,
      followOffsetY: 0,

      // Shake
      shakeIntensity: 0,
      shakeDuration: 0,
      shakeElapsed: 0,
      shakeX: 0,
      shakeY: 0,

      // Zoom (for future)
      zoom: 1,
    };
  },

  /**
   * Set camera target to follow
   * @param {Object} entity - Entity with x, y properties
   * @param {number} [offsetX=0] - X offset from target
   * @param {number} [offsetY=0] - Y offset from target
   */
  setFollowTarget(camera, entity, offsetX = 0, offsetY = 0) {
    if (!camera) return;
    camera.followTarget = entity;
    camera.followOffsetX = offsetX;
    camera.followOffsetY = offsetY;
  },

  /**
   * Update camera (follow target, shake)
   * @param {Object} camera - Camera instance
   * @param {number} dt - Delta time in seconds
   */
  update(camera, dt) {
    if (!camera) return;

    // Follow target
    if (camera.followTarget) {
      const targetX = camera.followTarget.x + camera.followOffsetX;
      const targetY = camera.followTarget.y + camera.followOffsetY;

      // Smooth damp towards target
      camera.x += (targetX - camera.width / 2 - camera.x) * camera.smoothDamp;
      camera.y += (targetY - camera.height / 2 - camera.y) * camera.smoothDamp;
    }

    // Apply world bounds
    camera.x = Math.max(0, Math.min(camera.x, camera.worldWidth - camera.width));
    camera.y = Math.max(0, Math.min(camera.y, camera.worldHeight - camera.height));

    // Update shake
    if (camera.shakeElapsed < camera.shakeDuration) {
      camera.shakeElapsed += dt;
      const progress = camera.shakeElapsed / camera.shakeDuration;
      const currentIntensity = camera.shakeIntensity * (1 - progress); // Fade out shake
      camera.shakeX = (Math.random() - 0.5) * 2 * currentIntensity;
      camera.shakeY = (Math.random() - 0.5) * 2 * currentIntensity;
    } else {
      camera.shakeX = 0;
      camera.shakeY = 0;
    }
  },

  /**
   * Trigger camera shake
   * @param {Object} camera - Camera instance
   * @param {number} intensity - Shake intensity in pixels
   * @param {number} duration - Shake duration in seconds
   */
  shake(camera, intensity = 5, duration = 0.2) {
    if (!camera) return;
    camera.shakeIntensity = intensity;
    camera.shakeDuration = duration;
    camera.shakeElapsed = 0;
  },

  /**
   * Convert world coordinates to screen coordinates
   * @param {Object} camera - Camera instance
   * @param {number} wx - World X
   * @param {number} wy - World Y
   * @returns {Object} { x, y } screen coordinates
   */
  worldToScreen(camera, wx, wy) {
    if (!camera) return { x: wx, y: wy };
    return {
      x: wx - camera.x + camera.shakeX,
      y: wy - camera.y + camera.shakeY,
    };
  },

  /**
   * Convert screen coordinates to world coordinates
   * @param {Object} camera - Camera instance
   * @param {number} sx - Screen X
   * @param {number} sy - Screen Y
   * @returns {Object} { x, y } world coordinates
   */
  screenToWorld(camera, sx, sy) {
    if (!camera) return { x: sx, y: sy };
    return {
      x: sx + camera.x - camera.shakeX,
      y: sy + camera.y - camera.shakeY,
    };
  },

  /**
   * Apply camera transform to canvas context
   * Translate context to render world with camera offset
   * @param {Object} camera - Camera instance
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  applyTransform(ctx, camera) {
    if (!ctx || !camera) return;
    ctx.save();
    ctx.translate(-camera.x + camera.shakeX, -camera.y + camera.shakeY);
  },

  /**
   * Reset canvas context transform
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  resetTransform(ctx) {
    if (!ctx) return;
    ctx.restore();
  },

  /**
   * Get camera bounds as rect
   * @param {Object} camera - Camera instance
   * @returns {Object} { x, y, width, height }
   */
  getBounds(camera) {
    if (!camera) return { x: 0, y: 0, width: 800, height: 600 };
    return {
      x: camera.x,
      y: camera.y,
      width: camera.width,
      height: camera.height,
    };
  },

  /**
   * Check if world position is visible in camera
   * @param {Object} camera - Camera instance
   * @param {number} wx - World X
   * @param {number} wy - World Y
   * @param {number} [w=1] - Width of object
   * @param {number} [h=1] - Height of object
   * @returns {boolean} True if visible
   */
  isVisible(camera, wx, wy, w = 1, h = 1) {
    if (!camera) return true;
    return (
      wx + w > camera.x &&
      wx < camera.x + camera.width &&
      wy + h > camera.y &&
      wy < camera.y + camera.height
    );
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.CameraFactory = CameraFactory;
}
