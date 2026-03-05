/**
 * Tests for SceneManager (games/framework/scene.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/scene.js'));
});

const SM = () => global.SceneManager;

describe('SceneManager', () => {
  describe('create', () => {
    it('should create scene with default no-op hooks', () => {
      const scene = SM().create();
      expect(scene._isRunning).toBe(false);
      expect(scene._rafId).toBeNull();
      expect(typeof scene.preload).toBe('function');
      expect(typeof scene.create).toBe('function');
      expect(typeof scene.update).toBe('function');
      expect(typeof scene.render).toBe('function');
      expect(typeof scene.shutdown).toBe('function');
    });

    it('should accept custom hooks', () => {
      const hooks = {
        preload: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        render: jest.fn(),
        shutdown: jest.fn(),
      };
      const scene = SM().create(hooks);
      expect(scene.preload).toBe(hooks.preload);
      expect(scene.render).toBe(hooks.render);
      expect(scene.shutdown).toBe(hooks.shutdown);
    });

    it('should initialize timing state to zero', () => {
      const scene = SM().create();
      expect(scene._startTime).toBe(0);
      expect(scene._lastTime).toBe(0);
    });
  });

  describe('run', () => {
    // jsdom has no real canvas — mock ctx
    const mockCanvas = { width: 800, height: 600 };
    const mockCtx = { fillStyle: '', fillRect: jest.fn() };

    it('should call preload then create on run', async () => {
      const preload = jest.fn();
      const create = jest.fn();
      const scene = SM().create({ preload, create });

      await SM().run(scene, mockCanvas, mockCtx);

      expect(preload).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      expect(scene._isRunning).toBe(true);
    });

    it('should not run if scene/canvas/ctx is null', async () => {
      const scene = SM().create();
      await SM().run(null, mockCanvas, mockCtx);
      await SM().run(scene, null, mockCtx);
      await SM().run(scene, mockCanvas, null);
      expect(scene._isRunning).toBe(false);
    });

    it('should not run if already running', async () => {
      const preload = jest.fn();
      const scene = SM().create({ preload });
      scene._isRunning = true;

      await SM().run(scene, mockCanvas, mockCtx);
      expect(preload).not.toHaveBeenCalled();
    });

    it('should abort if preload throws', async () => {
      const create = jest.fn();
      const scene = SM().create({
        preload: () => {
          throw new Error('load fail');
        },
        create,
      });

      const spy = jest.spyOn(console, 'error').mockImplementation();
      await SM().run(scene, mockCanvas, mockCtx);
      expect(create).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should set _startTime on run', async () => {
      const scene = SM().create();
      await SM().run(scene, mockCanvas, mockCtx);
      expect(scene._startTime).toBeGreaterThan(0);
      SM().stop(scene);
    });
  });

  describe('stop', () => {
    const mockCanvas = { width: 800, height: 600 };
    const mockCtx = { fillStyle: '', fillRect: jest.fn() };

    it('should stop running scene and call shutdown', async () => {
      const shutdown = jest.fn();
      const scene = SM().create({ shutdown });
      await SM().run(scene, mockCanvas, mockCtx);

      SM().stop(scene);
      expect(scene._isRunning).toBe(false);
      expect(scene._rafId).toBeNull();
      expect(shutdown).toHaveBeenCalledTimes(1);
    });

    it('should not stop if not running', () => {
      const shutdown = jest.fn();
      const scene = SM().create({ shutdown });
      SM().stop(scene);
      expect(shutdown).not.toHaveBeenCalled();
    });

    it('should swallow shutdown errors', async () => {
      const scene = SM().create({
        shutdown: () => {
          throw new Error('cleanup fail');
        },
      });
      await SM().run(scene, mockCanvas, mockCtx);
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(() => SM().stop(scene)).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('isRunning', () => {
    it('should return falsy for null scene', () => {
      expect(SM().isRunning(null)).toBeFalsy();
    });

    it('should track running state', async () => {
      const scene = SM().create();
      expect(SM().isRunning(scene)).toBe(false);

      await SM().run(scene, { width: 1, height: 1 }, { fillStyle: '', fillRect: jest.fn() });
      expect(SM().isRunning(scene)).toBe(true);

      SM().stop(scene);
      expect(SM().isRunning(scene)).toBe(false);
    });
  });

  describe('getElapsedTime', () => {
    it('should return 0 for null or fresh scene', () => {
      expect(SM().getElapsedTime(null)).toBe(0);
      expect(SM().getElapsedTime(SM().create())).toBe(0);
    });

    it('should compute elapsed from _lastTime - _startTime', () => {
      const scene = SM().create();
      scene._startTime = 1000;
      scene._lastTime = 3500;
      expect(SM().getElapsedTime(scene)).toBe(2.5);
    });
  });

  describe('lifecycle order', () => {
    it('should enforce preload -> create -> shutdown', async () => {
      const order = [];
      const scene = SM().create({
        preload: () => order.push('preload'),
        create: () => order.push('create'),
        shutdown: () => order.push('shutdown'),
      });

      await SM().run(scene, { width: 1, height: 1 }, { fillStyle: '', fillRect: jest.fn() });
      SM().stop(scene);

      expect(order).toEqual(['preload', 'create', 'shutdown']);
    });
  });
});
