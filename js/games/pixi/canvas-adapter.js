/**
 * Canvas2D to PixiJS Adapter
 * Vanilla JavaScript - No TypeScript, No React
 *
 * @description Permet aux jeux Canvas2D existants de fonctionner avec PixiJS
 * sans réécriture complète. Migration progressive.
 *
 * Usage:
 *   // Au lieu de:
 *   const ctx = canvas.getContext('2d');
 *
 *   // Utiliser:
 *   const ctx = await CanvasAdapter.create(canvas, { usePixi: true });
 *
 *   // Même API que Canvas2D
 *   ctx.fillStyle = '#ff0000';
 *   ctx.fillRect(10, 10, 100, 50);
 */

import { PixiApp } from './app.js';

// PixiJS loaded via CDN or import map
const PIXI = globalThis.PIXI || (await import('pixi.js'));
const { Container, Graphics, Text, Sprite, Texture } = PIXI;

/**
 * Canvas2D Compatible Context backed by PixiJS
 */
class PixiContext {
  constructor(pixiApp, canvas) {
    this.app = pixiApp;
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;

    // Graphics object for immediate-mode drawing
    this.graphics = new Graphics();
    this.app.stage.addChild(this.graphics);

    // Text cache for performance
    this.textCache = new Map();

    // Current state (Canvas2D compatible)
    this._fillStyle = '#000000';
    this._strokeStyle = '#000000';
    this._lineWidth = 1;
    this._globalAlpha = 1;
    this._font = '16px Arial';
    this._textAlign = 'left';
    this._textBaseline = 'top';

    // State stack for save/restore
    this._stateStack = [];

    // Path for complex shapes
    this._pathStarted = false;
    this._pathX = 0;
    this._pathY = 0;
  }

  // --- Style Properties ---

  get fillStyle() {
    return this._fillStyle;
  }
  set fillStyle(value) {
    this._fillStyle = value;
  }

  get strokeStyle() {
    return this._strokeStyle;
  }
  set strokeStyle(value) {
    this._strokeStyle = value;
  }

  get lineWidth() {
    return this._lineWidth;
  }
  set lineWidth(value) {
    this._lineWidth = value;
  }

  get globalAlpha() {
    return this._globalAlpha;
  }
  set globalAlpha(value) {
    this._globalAlpha = value;
  }

  get font() {
    return this._font;
  }
  set font(value) {
    this._font = value;
  }

  get textAlign() {
    return this._textAlign;
  }
  set textAlign(value) {
    this._textAlign = value;
  }

  get textBaseline() {
    return this._textBaseline;
  }
  set textBaseline(value) {
    this._textBaseline = value;
  }

  // --- Drawing Methods ---

  clearRect(x, y, width, height) {
    this.graphics.clear();
    // Clear text cache periodically
    if (this.textCache.size > 100) {
      for (const [key, text] of this.textCache) {
        text.visible = false;
      }
    }
  }

  fillRect(x, y, width, height) {
    const color = this._parseColor(this._fillStyle);
    this.graphics.rect(x, y, width, height).fill({ color, alpha: this._globalAlpha });
  }

  strokeRect(x, y, width, height) {
    const color = this._parseColor(this._strokeStyle);
    this.graphics
      .rect(x, y, width, height)
      .stroke({ color, width: this._lineWidth, alpha: this._globalAlpha });
  }

  // --- Path Methods ---

  beginPath() {
    this._pathStarted = true;
  }

  moveTo(x, y) {
    this._pathX = x;
    this._pathY = y;
    this.graphics.moveTo(x, y);
  }

  lineTo(x, y) {
    this.graphics.lineTo(x, y);
    this._pathX = x;
    this._pathY = y;
  }

  closePath() {
    this._pathStarted = false;
  }

  arc(x, y, radius, startAngle, endAngle, counterClockwise = false) {
    // PixiJS uses different arc API
    if (Math.abs(endAngle - startAngle) >= Math.PI * 2) {
      // Full circle
      this.graphics.circle(x, y, radius);
    } else {
      this.graphics.arc(x, y, radius, startAngle, endAngle, counterClockwise);
    }
  }

  roundRect(x, y, width, height, radii) {
    const radius = typeof radii === 'number' ? radii : radii[0] || 0;
    this.graphics.roundRect(x, y, width, height, radius);
  }

  fill() {
    const color = this._parseColor(this._fillStyle);
    this.graphics.fill({ color, alpha: this._globalAlpha });
  }

  stroke() {
    const color = this._parseColor(this._strokeStyle);
    this.graphics.stroke({ color, width: this._lineWidth, alpha: this._globalAlpha });
  }

  // --- Text Methods ---

  fillText(text, x, y) {
    const cacheKey = `${text}_${this._font}_${this._fillStyle}`;
    let textObj = this.textCache.get(cacheKey);

    if (!textObj) {
      textObj = new Text({
        text,
        style: {
          fontFamily: this._parseFontFamily(this._font),
          fontSize: this._parseFontSize(this._font),
          fill: this._fillStyle,
        },
      });
      this.app.stage.addChild(textObj);
      this.textCache.set(cacheKey, textObj);
    }

    textObj.visible = true;
    textObj.alpha = this._globalAlpha;
    textObj.position.set(x, y);

    // Handle alignment
    if (this._textAlign === 'center') {
      textObj.anchor.x = 0.5;
    } else if (this._textAlign === 'right') {
      textObj.anchor.x = 1;
    } else {
      textObj.anchor.x = 0;
    }

    if (this._textBaseline === 'middle') {
      textObj.anchor.y = 0.5;
    } else if (this._textBaseline === 'bottom') {
      textObj.anchor.y = 1;
    } else {
      textObj.anchor.y = 0;
    }
  }

  strokeText(text, x, y) {
    // PixiJS doesn't have direct stroke text, use fill with stroke style
    const origFill = this._fillStyle;
    this._fillStyle = this._strokeStyle;
    this.fillText(text, x, y);
    this._fillStyle = origFill;
  }

  measureText(text) {
    // Approximate measurement
    const fontSize = this._parseFontSize(this._font);
    return {
      width: text.length * fontSize * 0.6,
    };
  }

  // --- State Management ---

  save() {
    this._stateStack.push({
      fillStyle: this._fillStyle,
      strokeStyle: this._strokeStyle,
      lineWidth: this._lineWidth,
      globalAlpha: this._globalAlpha,
      font: this._font,
      textAlign: this._textAlign,
      textBaseline: this._textBaseline,
    });
  }

  restore() {
    if (this._stateStack.length > 0) {
      const state = this._stateStack.pop();
      Object.assign(this, {
        _fillStyle: state.fillStyle,
        _strokeStyle: state.strokeStyle,
        _lineWidth: state.lineWidth,
        _globalAlpha: state.globalAlpha,
        _font: state.font,
        _textAlign: state.textAlign,
        _textBaseline: state.textBaseline,
      });
    }
  }

  // --- Image Drawing ---

  drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
    // Basic drawImage support
    // For full support, would need texture caching
    console.warn('[PixiContext] drawImage not fully implemented, use Sprite directly');
  }

  // --- Transforms (basic support) ---

  translate(x, y) {
    this.graphics.position.set(this.graphics.position.x + x, this.graphics.position.y + y);
  }

  rotate(angle) {
    this.graphics.rotation += angle;
  }

  scale(x, y) {
    this.graphics.scale.set(this.graphics.scale.x * x, this.graphics.scale.y * y);
  }

  resetTransform() {
    this.graphics.position.set(0, 0);
    this.graphics.rotation = 0;
    this.graphics.scale.set(1, 1);
  }

  // --- Helper Methods ---

  _parseColor(color) {
    if (typeof color === 'number') return color;
    if (color.startsWith('#')) {
      return parseInt(color.slice(1), 16);
    }
    if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        return (r << 16) | (g << 8) | b;
      }
    }
    // Named colors (basic)
    const colors = {
      white: 0xffffff,
      black: 0x000000,
      red: 0xff0000,
      green: 0x00ff00,
      blue: 0x0000ff,
      yellow: 0xffff00,
    };
    return colors[color.toLowerCase()] || 0x000000;
  }

  _parseFontSize(font) {
    const match = font.match(/(\d+)px/);
    return match ? parseInt(match[1]) : 16;
  }

  _parseFontFamily(font) {
    const parts = font.split(' ');
    return parts[parts.length - 1] || 'Arial';
  }

  // --- Cleanup ---

  destroy() {
    this.graphics.destroy();
    for (const text of this.textCache.values()) {
      text.destroy();
    }
    this.textCache.clear();
  }
}

/**
 * Canvas Adapter - Factory
 */
export const CanvasAdapter = {
  /**
   * Create a context (Canvas2D or PixiJS based on options)
   * @param {HTMLCanvasElement} canvas
   * @param {Object} options
   * @returns {Promise<CanvasRenderingContext2D|PixiContext>}
   */
  async create(canvas, options = {}) {
    const usePixi = options.usePixi ?? false;

    if (!usePixi) {
      // Return native Canvas2D context
      return canvas.getContext('2d');
    }

    // Initialize PixiJS
    const app = await PixiApp.init(canvas, {
      background: options.background || '#1a1a2e',
      width: canvas.width,
      height: canvas.height,
      ...options,
    });

    // Return PixiJS-backed context
    return new PixiContext(app, canvas);
  },

  /**
   * Check if context is PixiJS-backed
   * @param {Object} ctx
   * @returns {boolean}
   */
  isPixiContext(ctx) {
    return ctx instanceof PixiContext;
  },

  /**
   * Get underlying PixiJS app (if using Pixi)
   * @param {Object} ctx
   * @returns {Application|null}
   */
  getPixiApp(ctx) {
    if (ctx instanceof PixiContext) {
      return ctx.app;
    }
    return null;
  },
};

export { PixiContext };
export default CanvasAdapter;
