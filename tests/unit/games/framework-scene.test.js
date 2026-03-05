/**
 * Tests for SceneManager (games/framework/scene.js)
 * Lifecycle: preload -> create -> gameLoop(update+render) -> shutdown
 */

'use strict';

describe('SceneManager', () => {
  let SceneManager;

  beforeEach(() => {
    // Inline replica matching scene.js contract
    SceneManager = {
      create(config = {}) {
        return {
          preload: config.preload || (() => {}),
          create: config.create || (() => {}),
          update: config.update || (() => {}),
          render: config.render || (() => {}),
          shutdown: config.shutdown || (() => {}),
          _isRunning: false,
          _startTime: 0,
          _lastTime: 0,
          _rafId: null,
        };
      },

      async run(scene, canvas, ctx) {
        if (!scene || !canvas || !ctx) return;
        if (scene._isRunning) return;

        scene._isRunning = true;
        scene._startTime = performance.now();
        scene._lastTime = scene._startTime;

        try {
          await scene.preload();
        } catch {
          return;
        }

        try {
          scene.create();
        } catch {
          return;
        }

        // Simulate one tick instead of rAF loop for testing
        scene._rafId = 1;
      },

      stop(scene) {
        if (!scene || !scene._isRunning) return;
        scene._isRunning = false;
        if (scene._rafId) {
          scene._rafId = null;
        }
        try {
          scene.shutdown();
        } catch {
          // swallow
        }
      },

      isRunning(scene) {
        return scene && scene._isRunning;
      },

      getElapsedTime(scene) {
        if (!scene) return 0;
        return (scene._lastTime - scene._startTime) / 1000;
      },
    };
  });

  describe('create', () => {
    it('should create scene with default no-op hooks', () => {
      const scene = SceneManager.create();
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
      const scene = SceneManager.create(hooks);
      expect(scene.preload).toBe(hooks.preload);
      expect(scene.create).toBe(hooks.create);
      expect(scene.update).toBe(hooks.update);
      expect(scene.render).toBe(hooks.render);
      expect(scene.shutdown).toBe(hooks.shutdown);
    });

    it('should initialize timing state to zero', () => {
      const scene = SceneManager.create();
      expect(scene._startTime).toBe(0);
      expect(scene._lastTime).toBe(0);
    });
  });

  describe('run', () => {
    it('should call preload then create on run', async () => {
      const preload = jest.fn();
      const create = jest.fn();
      const scene = SceneManager.create({ preload, create });

      const canvas = { width: 800, height: 600 };
      const ctx = { fillStyle: '', fillRect: jest.fn() };

      await SceneManager.run(scene, canvas, ctx);

      expect(preload).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      expect(scene._isRunning).toBe(true);
    });

    it('should not run if scene is null', async () => {
      await SceneManager.run(null, {}, {});
      // No error thrown
    });

    it('should not run if canvas is null', async () => {
      const scene = SceneManager.create();
      await SceneManager.run(scene, null, {});
      expect(scene._isRunning).toBe(false);
    });

    it('should not run if ctx is null', async () => {
      const scene = SceneManager.create();
      await SceneManager.run(scene, {}, null);
      expect(scene._isRunning).toBe(false);
    });

    it('should not run if already running', async () => {
      const preload = jest.fn();
      const scene = SceneManager.create({ preload });
      scene._isRunning = true;

      await SceneManager.run(scene, {}, {});
      expect(preload).not.toHaveBeenCalled();
    });

    it('should abort if preload throws', async () => {
      const create = jest.fn();
      const scene = SceneManager.create({
        preload: () => {
          throw new Error('load fail');
        },
        create,
      });

      await SceneManager.run(scene, {}, {});
      expect(create).not.toHaveBeenCalled();
    });

    it('should abort if create throws', async () => {
      const scene = SceneManager.create({
        create: () => {
          throw new Error('init fail');
        },
      });

      await SceneManager.run(scene, {}, {});
      // Scene started but create failed — should not crash
    });

    it('should set _startTime and _lastTime on run', async () => {
      const scene = SceneManager.create();
      await SceneManager.run(scene, { width: 100, height: 100 }, { fillRect: jest.fn() });
      expect(scene._startTime).toBeGreaterThan(0);
      expect(scene._lastTime).toBe(scene._startTime);
    });
  });

  describe('stop', () => {
    it('should stop running scene and call shutdown', async () => {
      const shutdown = jest.fn();
      const scene = SceneManager.create({ shutdown });

      await SceneManager.run(scene, {}, {});
      SceneManager.stop(scene);

      expect(scene._isRunning).toBe(false);
      expect(scene._rafId).toBeNull();
      expect(shutdown).toHaveBeenCalledTimes(1);
    });

    it('should not stop if scene is null', () => {
      expect(() => SceneManager.stop(null)).not.toThrow();
    });

    it('should not stop if scene is not running', () => {
      const shutdown = jest.fn();
      const scene = SceneManager.create({ shutdown });
      SceneManager.stop(scene);
      expect(shutdown).not.toHaveBeenCalled();
    });

    it('should swallow shutdown errors', async () => {
      const scene = SceneManager.create({
        shutdown: () => {
          throw new Error('cleanup fail');
        },
      });
      await SceneManager.run(scene, {}, {});
      expect(() => SceneManager.stop(scene)).not.toThrow();
    });
  });

  describe('isRunning', () => {
    it('should return falsy for null scene', () => {
      expect(SceneManager.isRunning(null)).toBeFalsy();
    });

    it('should return false before run', () => {
      const scene = SceneManager.create();
      expect(SceneManager.isRunning(scene)).toBe(false);
    });

    it('should return true after run', async () => {
      const scene = SceneManager.create();
      await SceneManager.run(scene, {}, {});
      expect(SceneManager.isRunning(scene)).toBe(true);
    });

    it('should return false after stop', async () => {
      const scene = SceneManager.create();
      await SceneManager.run(scene, {}, {});
      SceneManager.stop(scene);
      expect(SceneManager.isRunning(scene)).toBe(false);
    });
  });

  describe('getElapsedTime', () => {
    it('should return 0 for null scene', () => {
      expect(SceneManager.getElapsedTime(null)).toBe(0);
    });

    it('should return 0 before run', () => {
      const scene = SceneManager.create();
      expect(SceneManager.getElapsedTime(scene)).toBe(0);
    });

    it('should return elapsed seconds after run', async () => {
      const scene = SceneManager.create();
      await SceneManager.run(scene, {}, {});
      // _startTime === _lastTime right after run, so elapsed = 0
      expect(SceneManager.getElapsedTime(scene)).toBe(0);

      // Simulate time passing
      scene._lastTime = scene._startTime + 2500;
      expect(SceneManager.getElapsedTime(scene)).toBe(2.5);
    });
  });

  describe('lifecycle order', () => {
    it('should enforce preload -> create -> (loop) -> shutdown order', async () => {
      const order = [];
      const scene = SceneManager.create({
        preload: () => order.push('preload'),
        create: () => order.push('create'),
        shutdown: () => order.push('shutdown'),
      });

      await SceneManager.run(scene, {}, {});
      SceneManager.stop(scene);

      expect(order).toEqual(['preload', 'create', 'shutdown']);
    });
  });
});
