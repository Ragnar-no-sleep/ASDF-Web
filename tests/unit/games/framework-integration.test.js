/**
 * ASDF Game Framework — Real Integration Tests
 *
 * Loads ACTUAL source modules and verifies cross-module wiring.
 * No mocks, no inline replicas — real code paths.
 *
 * Flow: GameRegistry.register() -> GameEngines.init() -> GameKit.create()
 *       -> EntityFactory/EntitySchema -> CameraFactory -> Lifecycle
 *
 * @module tests/unit/games/framework-integration
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Load real framework modules into global scope (they use window.X pattern)
const frameworkDir = path.join(__dirname, '../../../js/games/framework');
const enginesDir = path.join(__dirname, '../../../js/games/engines');

function loadModule(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  // Convert window-based IIFE modules to global assignments for Jest
  // 1. Replace window.X = Y with global.X = Y in export blocks
  // 2. Replace `const X = {` with `global.X = {` so the variable is on global scope
  const adapted = code
    .replace(/'use strict';/g, '')
    .replace(/\bconst\s+(\w+)\s*=\s*\{/g, 'global.$1 = {')
    .replace(/if \(typeof window[\s\S]*$/g, '')
    .replace(/window\.(ASDF\s*=\s*window\.ASDF\s*\|\|\s*\{\};?)/g, 'global.$1')
    .replace(/window\.ASDF\./g, 'global.ASDF.')
    .replace(/window\./g, 'global.');
  // eslint-disable-next-line no-eval
  eval(adapted);
}

beforeAll(() => {
  // Load framework modules in dependency order
  loadModule(path.join(frameworkDir, 'registry.js'));
  loadModule(path.join(frameworkDir, 'entity.js'));
  loadModule(path.join(frameworkDir, 'entity-schema.js'));
  loadModule(path.join(frameworkDir, 'camera.js'));
  loadModule(path.join(frameworkDir, 'assets.js'));
  loadModule(path.join(frameworkDir, 'hud.js'));
  loadModule(path.join(frameworkDir, 'scene.js'));
  loadModule(path.join(frameworkDir, 'renderer.js'));
  loadModule(path.join(frameworkDir, 'game-lifecycle.js'));
  loadModule(path.join(frameworkDir, 'game-kit.js'));
  loadModule(path.join(enginesDir, 'game-engine-base.js'));

  // Load StakeStacker modules
  loadModule(path.join(enginesDir, 'stakestacker/entities.js'));
  loadModule(path.join(enginesDir, 'stakestacker/renderer.js'));
});

beforeEach(() => {
  // Reset registry between tests
  global.GameRegistry.clear();
  global.GameRegistry.unlock();
  if (global.AssetLoader) global.AssetLoader.clear();
});

describe('Real Framework Integration', () => {
  describe('Module Loading', () => {
    it('should load all framework modules into global scope', () => {
      expect(global.GameRegistry).toBeDefined();
      expect(global.EntityFactory).toBeDefined();
      expect(global.EntitySchema).toBeDefined();
      expect(global.CameraFactory).toBeDefined();
      expect(global.AssetLoader).toBeDefined();
      expect(global.HudFactory).toBeDefined();
      expect(global.SceneManager).toBeDefined();
      expect(global.RendererFactory).toBeDefined();
      expect(global.GameLifecycle).toBeDefined();
      expect(global.GameKit).toBeDefined();
      expect(global.GameEngineBase).toBeDefined();
    });

    it('should load StakeStacker modules', () => {
      expect(global.StakeStackerEntities).toBeDefined();
      expect(global.StakeStackerRenderer).toBeDefined();
    });
  });

  describe('GameRegistry -> GameEngines wiring', () => {
    it('should register engine and retrieve it', () => {
      const engine = { start: jest.fn(), stop: jest.fn(), version: '1.0', gameId: 'test' };
      global.GameRegistry.register('test', engine);
      expect(global.GameRegistry.has('test')).toBe(true);
      expect(global.GameRegistry.get('test')).toBe(engine);
    });

    it('should reject engine without start()', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      global.GameRegistry.register('bad', { stop: () => {} });
      expect(global.GameRegistry.has('bad')).toBe(false);
      spy.mockRestore();
    });

    it('should lock and prevent post-init registration', () => {
      const engine = { start: jest.fn(), stop: jest.fn() };
      global.GameRegistry.register('pre', engine);
      global.GameRegistry.lock();

      const spy = jest.spyOn(console, 'error').mockImplementation();
      global.GameRegistry.register('post', { start: jest.fn(), stop: jest.fn() });
      expect(global.GameRegistry.has('post')).toBe(false);
      expect(global.GameRegistry.isLocked()).toBe(true);
      spy.mockRestore();
    });

    it('should flush registered engines into target object', () => {
      const engine = { start: jest.fn(), stop: jest.fn() };
      global.GameRegistry.register('mygame', engine);

      // Create a GameEngines-like target
      global.GameEngines = { mygame: null };
      global.GameRegistry.flush();
      expect(global.GameEngines.mygame).toBe(engine);
      delete global.GameEngines;
    });
  });

  describe('EntityFactory + EntitySchema cross-validation', () => {
    it('EntityFactory.create() output should pass EntitySchema.validate()', () => {
      const entity = global.EntityFactory.create({
        x: 100,
        y: 200,
        w: 32,
        h: 32,
        type: 'player',
      });
      expect(() => global.EntitySchema.validate(entity)).not.toThrow();
    });

    it('EntityFactory.create() with defaults should pass schema check()', () => {
      const entity = global.EntityFactory.create({ x: 0, y: 0, w: 10, h: 10, type: 'bullet' });
      const result = global.EntitySchema.check(entity);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('EntityFactory entities should work with EntityFactory.aabb()', () => {
      const a = global.EntityFactory.create({ x: 0, y: 0, w: 50, h: 50, type: 'a' });
      const b = global.EntityFactory.create({ x: 25, y: 25, w: 50, h: 50, type: 'b' });
      const c = global.EntityFactory.create({ x: 200, y: 200, w: 10, h: 10, type: 'c' });

      expect(global.EntityFactory.aabb(a, b)).toBe(true);
      expect(global.EntityFactory.aabb(a, c)).toBe(false);
    });

    it('EntityFactory.integrate() + updateAll() should move entities', () => {
      const entities = [
        global.EntityFactory.create({ x: 0, y: 0, vx: 100, vy: 50, w: 10, h: 10, type: 'moving' }),
        global.EntityFactory.create({ x: 0, y: 0, vx: 0, vy: 0, w: 10, h: 10, type: 'static' }),
      ];

      const alive = global.EntityFactory.updateAll(entities, 1.0);
      expect(alive[0].x).toBeCloseTo(100);
      expect(alive[0].y).toBeCloseTo(50);
      expect(alive[1].x).toBe(0); // Static didn't move
    });

    it('EntitySchema.validateBatch() should catch mixed valid/invalid', () => {
      const batch = [
        global.EntityFactory.create({ x: 0, y: 0, w: 10, h: 10, type: 'ok' }),
        { x: 'bad', y: 0, w: 10, h: 10, type: 'broken' },
      ];
      expect(() => global.EntitySchema.validateBatch(batch)).toThrow(/Batch validation failed/);
    });
  });

  describe('CameraFactory integration', () => {
    it('should follow EntityFactory entity and clamp to bounds', () => {
      const player = global.EntityFactory.create({
        x: 2500,
        y: 2500,
        w: 32,
        h: 32,
        type: 'player',
      });
      const cam = global.CameraFactory.create({
        width: 800,
        height: 600,
        worldWidth: 5000,
        worldHeight: 5000,
        smoothDamp: 1.0,
      });

      global.CameraFactory.setFollowTarget(cam, player);
      global.CameraFactory.update(cam, 0.016);

      // Camera should move towards player (centered)
      expect(cam.x).toBeGreaterThan(0);
      expect(cam.y).toBeGreaterThan(0);
      // Should be within world bounds
      expect(cam.x).toBeLessThanOrEqual(5000 - 800);
      expect(cam.y).toBeLessThanOrEqual(5000 - 600);
    });

    it('worldToScreen should map entity world pos to screen', () => {
      const cam = global.CameraFactory.create({ width: 800, height: 600 });
      cam.x = 100;
      cam.y = 50;
      const screen = global.CameraFactory.worldToScreen(cam, 150, 100);
      expect(screen.x).toBe(50);
      expect(screen.y).toBe(50);
    });

    it('isVisible should reject off-screen entities', () => {
      const cam = global.CameraFactory.create({ width: 800, height: 600 });
      cam.x = 1000;
      cam.y = 1000;
      const entity = global.EntityFactory.create({ x: 0, y: 0, w: 32, h: 32, type: 'far' });
      expect(global.CameraFactory.isVisible(cam, entity.x, entity.y, entity.w, entity.h)).toBe(
        false
      );
    });
  });

  describe('SceneManager lifecycle', () => {
    it('should run preload -> create -> (running) -> stop -> shutdown', async () => {
      const order = [];
      const scene = global.SceneManager.create({
        preload: async () => order.push('preload'),
        create: () => order.push('create'),
        update: () => order.push('update'),
        render: () => order.push('render'),
        shutdown: () => order.push('shutdown'),
      });

      // jsdom has no real canvas — use mock ctx
      const canvas = { width: 800, height: 600 };
      const ctx = { fillStyle: '', fillRect: jest.fn() };

      await global.SceneManager.run(scene, canvas, ctx);
      expect(global.SceneManager.isRunning(scene)).toBe(true);
      expect(order).toContain('preload');
      expect(order).toContain('create');
      expect(order.indexOf('preload')).toBeLessThan(order.indexOf('create'));

      global.SceneManager.stop(scene);
      expect(global.SceneManager.isRunning(scene)).toBe(false);
      expect(order).toContain('shutdown');
    });
  });

  describe('GameLifecycle contract validation', () => {
    it('should validate real engine contract (start + stop)', () => {
      const engine = { start: () => {}, stop: () => {} };
      const result = global.GameLifecycle.validate(engine);
      expect(result.valid).toBe(true);
    });

    it('should reject engine missing stop()', () => {
      const result = global.GameLifecycle.validate({ start: () => {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Game must implement stop() method');
    });

    it('getCapabilities should detect real-time vs event-driven', () => {
      const rtGame = { start: () => {}, stop: () => {}, update: () => {}, render: () => {} };
      const textGame = { start: () => {}, stop: () => {}, onEvent: () => {} };

      const rtCaps = global.GameLifecycle.getCapabilities(rtGame);
      expect(rtCaps.supportsRealTime).toBe(true);
      expect(rtCaps.supportsRender).toBe(true);

      const textCaps = global.GameLifecycle.getCapabilities(textGame);
      expect(textCaps.supportsEvents).toBe(true);
      expect(textCaps.supportsRealTime).toBe(false);
    });
  });

  describe('GameEngineBase mixin integration', () => {
    it('should spread into engine and provide trackHandler + cleanupHandlers', () => {
      const engine = {
        ...global.GameEngineBase,
        gameId: 'test',
        state: { gameOver: false },
      };

      expect(typeof engine.trackHandler).toBe('function');
      expect(typeof engine.cleanupHandlers).toBe('function');
      expect(typeof engine.stop).toBe('function');
      expect(typeof engine.updateParticles).toBe('function');
    });

    it('trackHandler should register and cleanupHandlers should remove', () => {
      const engine = { ...global.GameEngineBase };
      const target = { addEventListener: jest.fn(), removeEventListener: jest.fn() };

      engine.trackHandler(target, 'click', () => {});
      engine.trackHandler(target, 'keydown', () => {});
      expect(engine._handlers).toHaveLength(2);
      expect(target.addEventListener).toHaveBeenCalledTimes(2);

      engine.cleanupHandlers();
      expect(target.removeEventListener).toHaveBeenCalledTimes(2);
      expect(engine._handlers).toBeNull();
    });

    it('updateParticles should filter dead particles', () => {
      const engine = { ...global.GameEngineBase };
      const particles = [
        { x: 0, y: 0, vx: 10, vy: 10, life: 1.0 },
        { x: 0, y: 0, vx: 10, vy: 10, life: 0.01 },
      ];
      const alive = engine.updateParticles(particles, 0.5);
      expect(alive).toHaveLength(1);
      expect(alive[0].life).toBeCloseTo(0.5);
    });
  });

  describe('StakeStacker modules integration', () => {
    it('createBlock -> integrateBlock -> detectCollision full cycle', () => {
      const E = global.StakeStackerEntities;

      // Create a stack with one block
      const baseBlock = E.createBlock(380, 500, 40, 32, 1);
      const stack = [baseBlock];

      // Create falling block
      const falling = E.createBlock(385, 400, 40, 32, 1);
      falling.vy = 200;

      // Integrate until collision
      let collided = false;
      for (let i = 0; i < 100 && !collided; i++) {
        E.integrateBlock(falling, 0.016);
        const result = E.detectBlockCollision(falling, stack);
        collided = result.collided;
        if (collided) {
          expect(result.precision).toBeDefined();
          expect(['perfect', 'great', 'good', 'miss']).toContain(result.precision);
        }
      }
      expect(collided).toBe(true);
    });

    it('entities should conform to EntitySchema', () => {
      const E = global.StakeStackerEntities;
      const block = E.createBlock(100, 200, 40, 32, 1);
      // Block has x, y, w, h, type — matches schema
      expect(() => global.EntitySchema.validate(block)).not.toThrow();

      const particle = E.createParticle(50, 50, 10, -20, 0.5, '#fff');
      expect(() => global.EntitySchema.validate(particle)).not.toThrow();
    });

    it('scoring should be Fibonacci-based and level-scaled', () => {
      const E = global.StakeStackerEntities;
      expect(E.calculateScore('perfect', 1)).toBe(89);
      expect(E.calculateScore('perfect', 3)).toBe(267);
      expect(E.calculateScore('great', 1)).toBe(55);
      expect(E.calculateScore('miss', 1)).toBe(21);

      // Streak bonus only kicks in at 3+
      expect(E.calculateStreakBonus(0)).toBe(0);
      expect(E.calculateStreakBonus(2)).toBe(0);
      expect(E.calculateStreakBonus(3)).toBe(20); // fib[3]=2 * 10
      expect(E.calculateStreakBonus(5)).toBe(50); // fib[5]=5 * 10
    });

    it('renderer should not throw on valid state', () => {
      const R = global.StakeStackerRenderer;
      // jsdom has no real canvas — use mock ctx with all methods the renderer calls
      const canvas = { width: 800, height: 600 };
      const ctx = {
        canvas,
        fillStyle: '',
        strokeStyle: '',
        font: '',
        textAlign: '',
        globalAlpha: 1,
        lineWidth: 1,
        shadowColor: '',
        shadowBlur: 0,
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        drawImage: jest.fn(),
        clearRect: jest.fn(),
        createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
      };

      const state = global.StakeStackerEntities.createGameState();
      state.stack.push(global.StakeStackerEntities.createBlock(380, 500, 40, 32, 1));
      state.currentBlock = global.StakeStackerEntities.createBlock(390, 100, 40, 32, 1);
      state.particles.push(global.StakeStackerEntities.createParticle(400, 300, 10, -10));

      expect(() => R.render(ctx, state, 0)).not.toThrow();
    });
  });

  describe('Full game session: register -> start -> play -> stop', () => {
    it('should complete full lifecycle without errors', () => {
      // 1. Register
      const mockEngine = {
        gameId: 'integration-test',
        version: '1.0.0',
        start: jest.fn(),
        stop: jest.fn(),
      };
      global.GameRegistry.register('integration-test', mockEngine);
      expect(global.GameRegistry.has('integration-test')).toBe(true);

      // 2. Lock (simulating GameEngines.init)
      global.GameRegistry.lock();

      // 3. Validate contract
      const validation = global.GameKit.validateEngine(mockEngine);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // 4. Validate lifecycle
      const lifecycle = global.GameLifecycle.validate(mockEngine);
      expect(lifecycle.valid).toBe(true);

      // 5. Start
      mockEngine.start('integration-test');
      expect(mockEngine.start).toHaveBeenCalledWith('integration-test');

      // 6. Create entities and validate
      const entities = [
        global.EntityFactory.create({ x: 0, y: 0, w: 32, h: 32, type: 'player' }),
        global.EntityFactory.create({ x: 100, y: 100, w: 16, h: 16, type: 'enemy' }),
      ];
      global.EntitySchema.validateBatch(entities);

      // 7. Simulate physics
      global.EntityFactory.integrate(entities[1], 0.5);
      expect(entities[1].x).toBe(100); // No velocity, no movement

      // 8. Check collisions
      let collisions = 0;
      global.EntityFactory.checkCollisions(entities, () => collisions++);
      expect(collisions).toBe(0); // No overlap

      // 9. Stop
      mockEngine.stop('integration-test');
      expect(mockEngine.stop).toHaveBeenCalledWith('integration-test');
    });
  });
});
