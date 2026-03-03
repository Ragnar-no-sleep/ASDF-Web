/**
 * GameEngineBase Mixin Unit Tests
 */

// Simulate browser globals the mixin uses
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.activeGames = {};

// Load the mixin (IIFE, sets window.GameEngineBase)
require('../../../js/games/engines/game-engine-base.js');
const GameEngineBase = window.GameEngineBase;

describe('GameEngineBase', () => {
  it('exists as a global after loading', () => {
    expect(GameEngineBase).toBeDefined();
    expect(window.ASDF.GameEngineBase).toBe(GameEngineBase);
  });

  // ============================================
  // gameLoop
  // ============================================

  describe('gameLoop', () => {
    it('calls requestAnimationFrame', () => {
      const engine = {
        state: { gameOver: false },
        timing: { tick: jest.fn(() => 16) },
        update: jest.fn(),
        draw: jest.fn(),
        gameLoop: GameEngineBase.gameLoop,
      };
      engine.gameLoop();
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  // ============================================
  // trackHandler / cleanupHandlers
  // ============================================

  describe('trackHandler + cleanupHandlers', () => {
    it('registers and cleans up event handlers', () => {
      const target = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      const handler = jest.fn();
      const engine = {
        _handlers: null,
        trackHandler: GameEngineBase.trackHandler,
        cleanupHandlers: GameEngineBase.cleanupHandlers,
      };

      engine.trackHandler(target, 'click', handler);
      expect(target.addEventListener).toHaveBeenCalledWith('click', handler);
      expect(engine._handlers).toHaveLength(1);

      engine.cleanupHandlers();
      expect(target.removeEventListener).toHaveBeenCalledWith('click', handler);
      expect(engine._handlers).toBeNull();
    });

    it('cleanupHandlers is safe when no handlers registered', () => {
      const engine = {
        _handlers: null,
        cleanupHandlers: GameEngineBase.cleanupHandlers,
      };
      expect(() => engine.cleanupHandlers()).not.toThrow();
    });
  });

  // ============================================
  // stop
  // ============================================

  describe('stop', () => {
    it('sets gameOver and nulls references', () => {
      const engine = {
        state: { gameOver: false, score: 10 },
        canvas: {},
        ctx: {},
        timing: {},
        _handlers: null,
        stop: GameEngineBase.stop,
        cleanupHandlers: GameEngineBase.cleanupHandlers,
      };

      engine.stop();
      expect(engine.canvas).toBeNull();
      expect(engine.ctx).toBeNull();
      expect(engine.state).toBeNull();
      expect(engine.timing).toBeNull();
    });

    it('is safe when state is already null', () => {
      const engine = {
        state: null,
        canvas: null,
        ctx: null,
        timing: null,
        _handlers: null,
        stop: GameEngineBase.stop,
        cleanupHandlers: GameEngineBase.cleanupHandlers,
      };
      expect(() => engine.stop()).not.toThrow();
    });
  });

  // ============================================
  // registerActiveGame
  // ============================================

  describe('registerActiveGame', () => {
    it('registers cleanup in activeGames', () => {
      global.activeGames = {};
      const engine = {
        stop: jest.fn(),
        registerActiveGame: GameEngineBase.registerActiveGame,
      };
      engine.registerActiveGame('test-game');
      expect(global.activeGames['test-game']).toBeDefined();
      global.activeGames['test-game'].cleanup();
      expect(engine.stop).toHaveBeenCalled();
    });
  });

  // ============================================
  // updateParticles
  // ============================================

  describe('updateParticles', () => {
    it('updates position and filters dead particles', () => {
      const particles = [
        { x: 0, y: 0, vx: 10, vy: 5, life: 1 },
        { x: 0, y: 0, vx: 10, vy: 5, life: 0.1 },
      ];
      const result = GameEngineBase.updateParticles(particles, 0.5);
      expect(result).toHaveLength(1); // second particle dies (0.1 - 0.5 < 0)
      expect(result[0].x).toBe(5); // 0 + 10 * 0.5
      expect(result[0].y).toBe(2.5); // 0 + 5 * 0.5
    });

    it('applies gravity to vy', () => {
      const particles = [{ x: 0, y: 0, vx: 0, vy: 0, gravity: 100, life: 2 }];
      const result = GameEngineBase.updateParticles(particles, 1);
      expect(result[0].vy).toBe(100); // 0 + 100 * 1
    });

    it('returns empty array for all dead particles', () => {
      const particles = [{ x: 0, y: 0, life: 0 }];
      expect(GameEngineBase.updateParticles(particles, 1)).toEqual([]);
    });
  });

  // ============================================
  // resizeCanvas
  // ============================================

  describe('resizeCanvas', () => {
    it('resizes canvas to parent dimensions', () => {
      const engine = {
        canvas: {
          width: 0,
          height: 0,
          parentElement: { clientWidth: 800, clientHeight: 600 },
        },
        resizeCanvas: GameEngineBase.resizeCanvas,
      };
      engine.resizeCanvas();
      expect(engine.canvas.width).toBe(800);
      expect(engine.canvas.height).toBe(600);
    });

    it('is safe when canvas is null', () => {
      const engine = { canvas: null, resizeCanvas: GameEngineBase.resizeCanvas };
      expect(() => engine.resizeCanvas()).not.toThrow();
    });
  });
});
