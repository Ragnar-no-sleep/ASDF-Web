/**
 * ASDF Games - BaseEngine Module Tests
 * Tests game engine lifecycle, state management, and utility functions
 *
 * This is fine.
 */

// ============================================
// COPY OF PURE FUNCTIONS FROM js/games/engines/BaseEngine.js
// ============================================

/**
 * BaseEngine - Abstract Game Engine Contract
 * Simplified version for testing without PixiJS dependencies
 */
class BaseEngine {
  static id = 'base';
  static name = 'Base Game';
  static description = 'Override this in subclass';
  static thumbnail = '/assets/games/default.png';
  static tags = ['arcade'];

  constructor(config = {}) {
    this.config = {
      width: 800,
      height: 600,
      backgroundColor: '#1a1a2e',
      debug: false,
      ...config,
    };

    this.state = {
      score: 0,
      highScore: 0,
      isRunning: false,
      isPaused: false,
      isGameOver: false,
      difficulty: 1,
      time: 0,
    };

    this.container = null;
    this.app = null;
    this.input = null;
    this.timing = null;
    this.juice = null;
    this.audio = null;

    this.onScoreChange = null;
    this.onGameOver = null;
    this.onPause = null;
    this.onResume = null;

    this._initialized = false;
  }

  start() {
    this.state.isRunning = true;
    this.state.isGameOver = false;
    this.state.time = 0;
  }

  pause() {
    if (!this.state.isRunning) return;
    this.state.isPaused = true;
    this.onPause?.();
  }

  resume() {
    if (!this.state.isRunning) return;
    this.state.isPaused = false;
    this.onResume?.();
  }

  togglePause() {
    if (this.state.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  setScore(score) {
    this.state.score = score;
    if (score > this.state.highScore) {
      this.state.highScore = score;
    }
    this.onScoreChange?.(score);
  }

  addScore(points) {
    this.setScore(this.state.score + points);
  }

  gameOver(reason = 'default') {
    if (this.state.isGameOver) return;

    this.state.isRunning = false;
    this.state.isGameOver = true;

    this.onGameOver?.({
      score: this.state.score,
      highScore: this.state.highScore,
      time: this.state.time,
      reason,
    });
  }

  restart() {
    this.state.score = 0;
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.isGameOver = false;
    this.state.difficulty = 1;
    this.state.time = 0;
  }

  get dimensions() {
    return {
      width: this.config.width,
      height: this.config.height,
    };
  }

  get center() {
    return {
      x: this.config.width / 2,
      y: this.config.height / 2,
    };
  }

  inBounds(x, y, margin = 0) {
    return (
      x >= -margin &&
      x <= this.config.width + margin &&
      y >= -margin &&
      y <= this.config.height + margin
    );
  }

  clampToBounds(x, y, margin = 0) {
    return {
      x: Math.max(margin, Math.min(this.config.width - margin, x)),
      y: Math.max(margin, Math.min(this.config.height - margin, y)),
    };
  }

  collides(a, b) {
    return (
      a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
    );
  }

  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  randomInt(min, max) {
    return Math.floor(this.random(min, max + 1));
  }
}

// ============================================
// TESTS
// ============================================

describe('BaseEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new BaseEngine();
  });

  // ============================================
  // STATIC PROPERTIES
  // ============================================
  describe('Static Properties', () => {
    it('should have default static id', () => {
      expect(BaseEngine.id).toBe('base');
    });

    it('should have default static name', () => {
      expect(BaseEngine.name).toBe('Base Game');
    });

    it('should have default description', () => {
      expect(BaseEngine.description).toBe('Override this in subclass');
    });

    it('should have default thumbnail', () => {
      expect(BaseEngine.thumbnail).toBe('/assets/games/default.png');
    });

    it('should have default tags', () => {
      expect(BaseEngine.tags).toContain('arcade');
    });
  });

  // ============================================
  // CONSTRUCTOR
  // ============================================
  describe('constructor()', () => {
    it('should set default config values', () => {
      expect(engine.config.width).toBe(800);
      expect(engine.config.height).toBe(600);
      expect(engine.config.backgroundColor).toBe('#1a1a2e');
      expect(engine.config.debug).toBe(false);
    });

    it('should merge custom config', () => {
      const customEngine = new BaseEngine({ width: 1024, height: 768, debug: true });
      expect(customEngine.config.width).toBe(1024);
      expect(customEngine.config.height).toBe(768);
      expect(customEngine.config.debug).toBe(true);
      expect(customEngine.config.backgroundColor).toBe('#1a1a2e'); // default preserved
    });

    it('should initialize state to defaults', () => {
      expect(engine.state.score).toBe(0);
      expect(engine.state.highScore).toBe(0);
      expect(engine.state.isRunning).toBe(false);
      expect(engine.state.isPaused).toBe(false);
      expect(engine.state.isGameOver).toBe(false);
      expect(engine.state.difficulty).toBe(1);
      expect(engine.state.time).toBe(0);
    });

    it('should initialize systems to null', () => {
      expect(engine.app).toBeNull();
      expect(engine.input).toBeNull();
      expect(engine.timing).toBeNull();
      expect(engine.juice).toBeNull();
      expect(engine.audio).toBeNull();
    });

    it('should initialize callbacks to null', () => {
      expect(engine.onScoreChange).toBeNull();
      expect(engine.onGameOver).toBeNull();
      expect(engine.onPause).toBeNull();
      expect(engine.onResume).toBeNull();
    });
  });

  // ============================================
  // GAME LIFECYCLE
  // ============================================
  describe('Game Lifecycle', () => {
    describe('start()', () => {
      it('should set isRunning to true', () => {
        engine.start();
        expect(engine.state.isRunning).toBe(true);
      });

      it('should reset isGameOver to false', () => {
        engine.state.isGameOver = true;
        engine.start();
        expect(engine.state.isGameOver).toBe(false);
      });

      it('should reset time to 0', () => {
        engine.state.time = 1000;
        engine.start();
        expect(engine.state.time).toBe(0);
      });
    });

    describe('pause()', () => {
      it('should set isPaused to true when running', () => {
        engine.start();
        engine.pause();
        expect(engine.state.isPaused).toBe(true);
      });

      it('should not pause when not running', () => {
        engine.pause();
        expect(engine.state.isPaused).toBe(false);
      });

      it('should call onPause callback', () => {
        const onPause = jest.fn();
        engine.onPause = onPause;
        engine.start();
        engine.pause();
        expect(onPause).toHaveBeenCalled();
      });
    });

    describe('resume()', () => {
      it('should set isPaused to false', () => {
        engine.start();
        engine.pause();
        engine.resume();
        expect(engine.state.isPaused).toBe(false);
      });

      it('should not resume when not running', () => {
        engine.state.isPaused = true;
        engine.resume();
        expect(engine.state.isPaused).toBe(true);
      });

      it('should call onResume callback', () => {
        const onResume = jest.fn();
        engine.onResume = onResume;
        engine.start();
        engine.pause();
        engine.resume();
        expect(onResume).toHaveBeenCalled();
      });
    });

    describe('togglePause()', () => {
      it('should pause when not paused', () => {
        engine.start();
        engine.togglePause();
        expect(engine.state.isPaused).toBe(true);
      });

      it('should resume when paused', () => {
        engine.start();
        engine.pause();
        engine.togglePause();
        expect(engine.state.isPaused).toBe(false);
      });
    });

    describe('gameOver()', () => {
      beforeEach(() => {
        engine.start();
        engine.setScore(100); // Use setScore to update highScore too
        engine.state.time = 500;
      });

      it('should set isRunning to false', () => {
        engine.gameOver();
        expect(engine.state.isRunning).toBe(false);
      });

      it('should set isGameOver to true', () => {
        engine.gameOver();
        expect(engine.state.isGameOver).toBe(true);
      });

      it('should call onGameOver callback with data', () => {
        const onGameOver = jest.fn();
        engine.onGameOver = onGameOver;
        engine.gameOver('collision');

        expect(onGameOver).toHaveBeenCalledWith({
          score: 100,
          highScore: 100,
          time: 500,
          reason: 'collision',
        });
      });

      it('should use default reason if not provided', () => {
        const onGameOver = jest.fn();
        engine.onGameOver = onGameOver;
        engine.gameOver();

        expect(onGameOver).toHaveBeenCalledWith(
          expect.objectContaining({
            reason: 'default',
          })
        );
      });

      it('should not trigger twice', () => {
        const onGameOver = jest.fn();
        engine.onGameOver = onGameOver;
        engine.gameOver();
        engine.gameOver();

        expect(onGameOver).toHaveBeenCalledTimes(1);
      });
    });

    describe('restart()', () => {
      beforeEach(() => {
        engine.start();
        engine.setScore(500);
        engine.state.difficulty = 5;
        engine.state.time = 10000;
        engine.pause();
      });

      it('should reset score to 0', () => {
        engine.restart();
        expect(engine.state.score).toBe(0);
      });

      it('should preserve highScore', () => {
        engine.restart();
        expect(engine.state.highScore).toBe(500);
      });

      it('should reset isRunning to false', () => {
        engine.restart();
        expect(engine.state.isRunning).toBe(false);
      });

      it('should reset isPaused to false', () => {
        engine.restart();
        expect(engine.state.isPaused).toBe(false);
      });

      it('should reset isGameOver to false', () => {
        engine.state.isGameOver = true;
        engine.restart();
        expect(engine.state.isGameOver).toBe(false);
      });

      it('should reset difficulty to 1', () => {
        engine.restart();
        expect(engine.state.difficulty).toBe(1);
      });

      it('should reset time to 0', () => {
        engine.restart();
        expect(engine.state.time).toBe(0);
      });
    });
  });

  // ============================================
  // SCORING
  // ============================================
  describe('Scoring', () => {
    describe('setScore()', () => {
      it('should set the score', () => {
        engine.setScore(100);
        expect(engine.state.score).toBe(100);
      });

      it('should update highScore if score is higher', () => {
        engine.setScore(100);
        expect(engine.state.highScore).toBe(100);

        engine.setScore(200);
        expect(engine.state.highScore).toBe(200);
      });

      it('should not decrease highScore', () => {
        engine.setScore(200);
        engine.setScore(50);
        expect(engine.state.highScore).toBe(200);
      });

      it('should call onScoreChange callback', () => {
        const onScoreChange = jest.fn();
        engine.onScoreChange = onScoreChange;
        engine.setScore(100);

        expect(onScoreChange).toHaveBeenCalledWith(100);
      });
    });

    describe('addScore()', () => {
      it('should add to existing score', () => {
        engine.setScore(100);
        engine.addScore(50);
        expect(engine.state.score).toBe(150);
      });

      it('should handle negative points', () => {
        engine.setScore(100);
        engine.addScore(-30);
        expect(engine.state.score).toBe(70);
      });

      it('should call onScoreChange', () => {
        const onScoreChange = jest.fn();
        engine.onScoreChange = onScoreChange;
        engine.addScore(10);

        expect(onScoreChange).toHaveBeenCalledWith(10);
      });
    });
  });

  // ============================================
  // GETTERS
  // ============================================
  describe('Getters', () => {
    describe('dimensions', () => {
      it('should return width and height from config', () => {
        expect(engine.dimensions).toEqual({ width: 800, height: 600 });
      });

      it('should reflect custom dimensions', () => {
        const customEngine = new BaseEngine({ width: 1920, height: 1080 });
        expect(customEngine.dimensions).toEqual({ width: 1920, height: 1080 });
      });
    });

    describe('center', () => {
      it('should return center point', () => {
        expect(engine.center).toEqual({ x: 400, y: 300 });
      });

      it('should calculate center for custom dimensions', () => {
        const customEngine = new BaseEngine({ width: 1000, height: 500 });
        expect(customEngine.center).toEqual({ x: 500, y: 250 });
      });
    });
  });

  // ============================================
  // UTILITY METHODS
  // ============================================
  describe('Utility Methods', () => {
    describe('inBounds()', () => {
      it('should return true for point inside bounds', () => {
        expect(engine.inBounds(400, 300)).toBe(true);
        expect(engine.inBounds(0, 0)).toBe(true);
        expect(engine.inBounds(800, 600)).toBe(true);
      });

      it('should return false for point outside bounds', () => {
        expect(engine.inBounds(-1, 300)).toBe(false);
        expect(engine.inBounds(801, 300)).toBe(false);
        expect(engine.inBounds(400, -1)).toBe(false);
        expect(engine.inBounds(400, 601)).toBe(false);
      });

      it('should respect margin parameter', () => {
        expect(engine.inBounds(-10, 300, 10)).toBe(true);
        expect(engine.inBounds(810, 300, 10)).toBe(true);
        expect(engine.inBounds(-11, 300, 10)).toBe(false);
      });
    });

    describe('clampToBounds()', () => {
      it('should not change point inside bounds', () => {
        expect(engine.clampToBounds(400, 300)).toEqual({ x: 400, y: 300 });
      });

      it('should clamp point outside bounds', () => {
        expect(engine.clampToBounds(-100, -100)).toEqual({ x: 0, y: 0 });
        expect(engine.clampToBounds(1000, 1000)).toEqual({ x: 800, y: 600 });
      });

      it('should respect margin parameter', () => {
        expect(engine.clampToBounds(0, 0, 10)).toEqual({ x: 10, y: 10 });
        expect(engine.clampToBounds(800, 600, 10)).toEqual({ x: 790, y: 590 });
      });
    });

    describe('collides()', () => {
      it('should detect overlapping rectangles', () => {
        const a = { x: 0, y: 0, width: 100, height: 100 };
        const b = { x: 50, y: 50, width: 100, height: 100 };
        expect(engine.collides(a, b)).toBe(true);
      });

      it('should not detect non-overlapping rectangles', () => {
        const a = { x: 0, y: 0, width: 100, height: 100 };
        const b = { x: 200, y: 200, width: 100, height: 100 };
        expect(engine.collides(a, b)).toBe(false);
      });

      it('should detect edge-touching rectangles as not colliding', () => {
        const a = { x: 0, y: 0, width: 100, height: 100 };
        const b = { x: 100, y: 0, width: 100, height: 100 };
        expect(engine.collides(a, b)).toBe(false);
      });
    });

    describe('distance()', () => {
      it('should calculate distance between two points', () => {
        expect(engine.distance(0, 0, 3, 4)).toBe(5); // 3-4-5 triangle
        expect(engine.distance(0, 0, 0, 0)).toBe(0);
      });

      it('should handle negative coordinates', () => {
        expect(engine.distance(-3, -4, 0, 0)).toBe(5);
      });
    });

    describe('lerp()', () => {
      it('should return start value at t=0', () => {
        expect(engine.lerp(0, 100, 0)).toBe(0);
      });

      it('should return end value at t=1', () => {
        expect(engine.lerp(0, 100, 1)).toBe(100);
      });

      it('should return midpoint at t=0.5', () => {
        expect(engine.lerp(0, 100, 0.5)).toBe(50);
      });

      it('should extrapolate beyond 0-1 range', () => {
        expect(engine.lerp(0, 100, 2)).toBe(200);
        expect(engine.lerp(0, 100, -1)).toBe(-100);
      });
    });

    describe('random()', () => {
      it('should return value within range', () => {
        for (let i = 0; i < 100; i++) {
          const value = engine.random(10, 20);
          expect(value).toBeGreaterThanOrEqual(10);
          expect(value).toBeLessThan(20);
        }
      });

      it('should handle negative ranges', () => {
        const value = engine.random(-20, -10);
        expect(value).toBeGreaterThanOrEqual(-20);
        expect(value).toBeLessThan(-10);
      });
    });

    describe('randomInt()', () => {
      it('should return integer within range', () => {
        for (let i = 0; i < 100; i++) {
          const value = engine.randomInt(1, 6);
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(6);
        }
      });

      it('should include both min and max', () => {
        const results = new Set();
        for (let i = 0; i < 1000; i++) {
          results.add(engine.randomInt(1, 3));
        }
        expect(results.has(1)).toBe(true);
        expect(results.has(2)).toBe(true);
        expect(results.has(3)).toBe(true);
      });
    });
  });

  // ============================================
  // INHERITANCE
  // ============================================
  describe('Inheritance', () => {
    class TestGame extends BaseEngine {
      static id = 'testgame';
      static name = 'Test Game';
      static description = 'A test game for unit testing';

      constructor(config) {
        super(config);
        this.customProperty = true;
      }

      customMethod() {
        return 'custom';
      }
    }

    it('should allow static property override', () => {
      expect(TestGame.id).toBe('testgame');
      expect(TestGame.name).toBe('Test Game');
    });

    it('should inherit parent methods', () => {
      const game = new TestGame();
      expect(typeof game.start).toBe('function');
      expect(typeof game.setScore).toBe('function');
      expect(typeof game.collides).toBe('function');
    });

    it('should allow custom properties', () => {
      const game = new TestGame();
      expect(game.customProperty).toBe(true);
    });

    it('should allow custom methods', () => {
      const game = new TestGame();
      expect(game.customMethod()).toBe('custom');
    });

    it('should inherit default config', () => {
      const game = new TestGame();
      expect(game.config.width).toBe(800);
      expect(game.config.height).toBe(600);
    });

    it('should merge custom config', () => {
      const game = new TestGame({ width: 1024 });
      expect(game.config.width).toBe(1024);
      expect(game.config.height).toBe(600);
    });
  });
});
