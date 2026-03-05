/**
 * ASDF Game Framework — Renderer Abstraction (SOLID: D — Dependency Inversion)
 *
 * Canvas 2D rendering interface
 *
 * Pattern: Factory pattern
 * Games depend on Renderer interface, not direct canvas calls
 *
 * @module games/framework/renderer
 */

'use strict';

const RendererFactory = {
  /**
   * Create a renderer instance
   * @param {string} [type='2d'] - Renderer type: '2d', 'phaser', 'webgl'
   * @param {Object} config - Renderer configuration
   * @param {HTMLCanvasElement} config.canvas - Canvas element
   * @param {number} [config.width=800] - Canvas width
   * @param {number} [config.height=600] - Canvas height
   * @returns {Object} Renderer instance (or null if type not supported)
   */
  create(type = '2d', config = {}) {
    switch (type) {
      case '2d':
        return this._create2D(config);
      default:
        console.error(`[RendererFactory] Unknown renderer type: ${type}`);
        return null;
    }
  },

  /**
   * Create 2D Canvas renderer (PRODUCTION READY)
   * @private
   */
  _create2D(config = {}) {
    const { canvas, width = 800, height = 600 } = config;

    if (!canvas) {
      console.error('[RendererFactory] 2D renderer requires canvas element');
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[RendererFactory] Failed to get 2D context');
      return null;
    }

    return {
      type: '2d',
      canvas,
      ctx,
      width,
      height,

      /**
       * Clear canvas to black
       */
      clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      },

      /**
       * Draw image sprite
       * @param {HTMLImageElement} image - Image to draw
       * @param {number} x - X position
       * @param {number} y - Y position
       * @param {number} w - Width
       * @param {number} h - Height
       * @param {number} [rotation=0] - Rotation in radians
       * @param {number} [alpha=1] - Alpha 0-1
       */
      draw(image, x, y, w, h, rotation = 0, alpha = 1) {
        if (!image) return;

        this.ctx.save();
        this.ctx.globalAlpha = alpha;

        if (rotation !== 0) {
          this.ctx.translate(x + w / 2, y + h / 2);
          this.ctx.rotate(rotation);
          this.ctx.drawImage(image, -w / 2, -h / 2, w, h);
        } else {
          this.ctx.drawImage(image, x, y, w, h);
        }

        this.ctx.restore();
      },

      /**
       * Draw filled rectangle
       * @param {number} x - X position
       * @param {number} y - Y position
       * @param {number} w - Width
       * @param {number} h - Height
       * @param {string} [color='#fff'] - Fill color
       */
      drawRect(x, y, w, h, color = '#fff') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
      },

      /**
       * Draw stroked rectangle
       * @param {number} x - X position
       * @param {number} y - Y position
       * @param {number} w - Width
       * @param {number} h - Height
       * @param {string} [color='#fff'] - Stroke color
       * @param {number} [lineWidth=1] - Line width
       */
      drawStrokeRect(x, y, w, h, color = '#fff', lineWidth = 1) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(x, y, w, h);
      },

      /**
       * Draw filled circle
       * @param {number} x - Center X
       * @param {number} y - Center Y
       * @param {number} radius - Radius
       * @param {string} [color='#fff'] - Fill color
       */
      drawCircle(x, y, radius, color = '#fff') {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
      },

      /**
       * Draw text
       * @param {string} text - Text to draw
       * @param {number} x - X position
       * @param {number} y - Y position
       * @param {Object} [style={}] - Style options
       * @param {string} [style.color='#fff'] - Text color
       * @param {string} [style.font='16px Arial'] - Font
       * @param {string} [style.align='left'] - Text alignment
       */
      drawText(text, x, y, style = {}) {
        const { color = '#fff', font = '16px Arial', align = 'left' } = style;

        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.fillText(text, x, y);
      },

      /**
       * Apply camera transform
       * @param {number} cameraX - Camera X offset
       * @param {number} cameraY - Camera Y offset
       */
      applyCamera(cameraX = 0, cameraY = 0) {
        this.ctx.save();
        this.ctx.translate(-cameraX, -cameraY);
      },

      /**
       * Reset camera transform
       */
      resetCamera() {
        this.ctx.restore();
      },
    };
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.RendererFactory = RendererFactory;
}
