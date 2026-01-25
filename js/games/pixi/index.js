/**
 * PixiJS Wrapper - Module Exports
 * Vanilla JavaScript - No TypeScript, No React
 *
 * Usage (ES modules):
 *   import { PixiApp, GameAssets, SpritePool } from './pixi/index.js';
 *
 * Usage (script tag):
 *   <script src="https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js"></script>
 *   <script type="module" src="./pixi/index.js"></script>
 */
import { CanvasAdapter } from './pixi/index.js';
export { PixiApp } from './app.js';
export { GameAssets } from './assets.js';
export { ObjectPool, SpritePool, ParticlePool } from './pools.js';
export { CanvasAdapter, PixiContext } from './canvas-adapter.js';

// Re-export PixiJS primitives for convenience
const PIXI = globalThis.PIXI || (await import('pixi.js'));

export const {
  Container,
  Sprite,
  Graphics,
  Text,
  BitmapText,
  Texture,
  Assets,
  Ticker,
  Rectangle,
  Point,
} = PIXI;

/**
 * Quick setup helper
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 * @returns {Promise<{app: Application, stage: Container}>}
 */
export async function setupPixi(canvas, options = {}) {
  const { PixiApp } = await import('./app.js');

  const app = await PixiApp.init(canvas, options);

  return {
    app,
    stage: PixiApp.stage,
    ticker: PixiApp.ticker,
  };
}

export default {
  PixiApp,
  GameAssets,
  ObjectPool,
  SpritePool,
  ParticlePool,
  setupPixi,
};
