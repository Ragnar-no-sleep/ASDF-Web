/**
 * BaseEngine - Abstract Game Engine Contract
 * Vanilla JavaScript - No TypeScript, No React
 *
 * @description All arcade games extend this base class
 */

import { PixiApp } from '../pixi/app.js';
import { GameAssets } from '../pixi/assets.js';

// PixiJS loaded via CDN or import map
const { Container } = globalThis.PIXI || (await import('pixi.js'));

/**
 * Base Engine - Contract for all arcade games
 *
 * Lifecycle:
 * 1. constructor(config) - Setup config
 * 2. init(canvas) - Initialize PixiJS
 * 3. preload() - Load assets
 * 4. create() - Setup game objects
 * 5. update(delta) - Game loop (60fps)
 * 6. destroy() - Cleanup
 */
export class BaseEngine {
  // Static metadata - override in subclass
  static id = 'base';
  static name = 'Base Game';
  static description = 'Override this in subclass';
  static thumbnail = '/assets/games/default.png';
  static tags = ['arcade'];

  /**
   * @param {Object} config - Game configuration
   */
  constructor(config = {}) {
    // Config with defaults
    this.config = {
      width: 800,
      height: 600,
      backgroundColor: '#1a1a2e',
      debug: false,
      ...config,
    };

    // Game state
    this.state = {
      score: 0,
      highScore: 0,
      isRunning: false,
      isPaused: false,
      isGameOver: false,
      difficulty: 1,
      time: 0,
    };

    // PixiJS container for this game
    this.container = null;

    // Systems (injected after init)
    this.app = null;
    this.input = null;
    this.timing = null;
    this.juice = null;
    this.audio = null;

    // Callbacks
    this.onScoreChange = null;
    this.onGameOver = null;
    this.onPause = null;
    this.onResume = null;

    // Internal
    this._updateBound = this._update.bind(this);
    this._initialized = false;
  }

  /**
   * Initialize the game engine
   * @param {HTMLCanvasElement} canvas - Target canvas
   * @returns {Promise<void>}
   */
  async init(canvas) {
    if (this._initialized) {
      console.warn(`[${this.constructor.id}] Already initialized`);
      return;
    }

    // Initialize PixiJS
    this.app = await PixiApp.init(canvas, {
      background: this.config.backgroundColor,
      width: this.config.width,
      height: this.config.height,
    });

    // Create game container
    this.container = new Container();
    this.container.label = `game_${this.constructor.id}`;
    PixiApp.stage.addChild(this.container);

    // Load assets
    await this.preload();

    // Setup game
    this.create();

    // Add to ticker
    PixiApp.addUpdate(this._updateBound);

    this._initialized = true;
    console.log(`[${this.constructor.id}] Initialized`);
  }

  /**
   * Preload game assets - OVERRIDE THIS
   * @returns {Promise<void>}
   */
  async preload() {
    // Override in subclass
    // Example:
    // GameAssets.register('mygame', [
    //   { alias: 'player', src: '/assets/player.png' }
    // ]);
    // await GameAssets.load('mygame');
  }

  /**
   * Create game objects - OVERRIDE THIS
   */
  create() {
    // Override in subclass
    throw new Error(`[${this.constructor.id}] create() must be implemented`);
  }

  /**
   * Update game logic - OVERRIDE THIS
   * @param {number} delta - Frame delta (1.0 = 60fps)
   */
  update(delta) {
    // Override in subclass
  }

  /**
   * Internal update wrapper
   * @param {Object} ticker - PixiJS ticker
   */
  _update(ticker) {
    if (!this.state.isRunning || this.state.isPaused) return;

    const delta = ticker.deltaTime;
    this.state.time += delta;

    this.update(delta);
  }

  /**
   * Start the game
   */
  start() {
    this.state.isRunning = true;
    this.state.isGameOver = false;
    this.state.time = 0;
    console.log(`[${this.constructor.id}] Started`);
  }

  /**
   * Pause the game
   */
  pause() {
    if (!this.state.isRunning) return;
    this.state.isPaused = true;
    this.onPause?.();
    console.log(`[${this.constructor.id}] Paused`);
  }

  /**
   * Resume the game
   */
  resume() {
    if (!this.state.isRunning) return;
    this.state.isPaused = false;
    this.onResume?.();
    console.log(`[${this.constructor.id}] Resumed`);
  }

  /**
   * Toggle pause state
   */
  togglePause() {
    if (this.state.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  /**
   * Set score
   * @param {number} score
   */
  setScore(score) {
    this.state.score = score;

    if (score > this.state.highScore) {
      this.state.highScore = score;
    }

    this.onScoreChange?.(score);
  }

  /**
   * Add to score
   * @param {number} points
   */
  addScore(points) {
    this.setScore(this.state.score + points);
  }

  /**
   * End the game
   * @param {string} reason - Game over reason
   */
  gameOver(reason = 'default') {
    if (this.state.isGameOver) return;

    this.state.isRunning = false;
    this.state.isGameOver = true;

    console.log(`[${this.constructor.id}] Game Over:`, reason, 'Score:', this.state.score);

    this.onGameOver?.({
      score: this.state.score,
      highScore: this.state.highScore,
      time: this.state.time,
      reason,
    });
  }

  /**
   * Restart the game
   */
  restart() {
    // Reset state
    this.state.score = 0;
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.isGameOver = false;
    this.state.difficulty = 1;
    this.state.time = 0;

    // Clear container
    this.container.removeChildren();

    // Recreate game
    this.create();
    this.start();

    console.log(`[${this.constructor.id}] Restarted`);
  }

  /**
   * Destroy the game and cleanup
   */
  destroy() {
    // Remove from ticker
    PixiApp.removeUpdate(this._updateBound);

    // Cleanup input
    this.input?.cleanup?.();

    // Cleanup timing
    this.timing?.cleanup?.();

    // Destroy container and children
    if (this.container) {
      this.container.destroy({ children: true });
      this.container = null;
    }

    this._initialized = false;
    console.log(`[${this.constructor.id}] Destroyed`);
  }

  // --- Utility Methods ---

  /**
   * Get game dimensions
   * @returns {{width: number, height: number}}
   */
  get dimensions() {
    return {
      width: this.config.width,
      height: this.config.height,
    };
  }

  /**
   * Get center point
   * @returns {{x: number, y: number}}
   */
  get center() {
    return {
      x: this.config.width / 2,
      y: this.config.height / 2,
    };
  }

  /**
   * Check if point is in bounds
   * @param {number} x
   * @param {number} y
   * @param {number} margin
   * @returns {boolean}
   */
  inBounds(x, y, margin = 0) {
    return (
      x >= -margin &&
      x <= this.config.width + margin &&
      y >= -margin &&
      y <= this.config.height + margin
    );
  }

  /**
   * Clamp position to bounds
   * @param {number} x
   * @param {number} y
   * @param {number} margin
   * @returns {{x: number, y: number}}
   */
  clampToBounds(x, y, margin = 0) {
    return {
      x: Math.max(margin, Math.min(this.config.width - margin, x)),
      y: Math.max(margin, Math.min(this.config.height - margin, y)),
    };
  }

  /**
   * Simple AABB collision check
   * @param {Object} a - Object with x, y, width, height
   * @param {Object} b - Object with x, y, width, height
   * @returns {boolean}
   */
  collides(a, b) {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  /**
   * Distance between two points
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @returns {number}
   */
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Lerp between two values
   * @param {number} a - Start value
   * @param {number} b - End value
   * @param {number} t - Progress (0-1)
   * @returns {number}
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Random number in range
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Random integer in range
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  randomInt(min, max) {
    return Math.floor(this.random(min, max + 1));
  }
}

export default BaseEngine;
