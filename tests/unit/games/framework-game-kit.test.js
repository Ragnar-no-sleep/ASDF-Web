/**
 * Tests for GameKit (games/framework/game-kit.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  // GameKit depends on other framework modules via typeof checks
  const fw = path.join(__dirname, '../../../js/games/framework');
  loadModule(path.join(fw, 'camera.js'));
  loadModule(path.join(fw, 'assets.js'));
  loadModule(path.join(fw, 'hud.js'));
  loadModule(path.join(fw, 'scene.js'));
  loadModule(path.join(fw, 'renderer.js'));
  loadModule(path.join(fw, 'game-kit.js'));
});

const GK = () => global.GameKit;

// jsdom doesn't implement canvas.getContext — mock it
function mockGetContext(canvasEl) {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'left',
    lineWidth: 1,
    globalAlpha: 1,
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
  };
  canvasEl.getContext = jest.fn(() => ctx);
  return ctx;
}

describe('GameKit (Interface Segregation)', () => {
  let container;
  let canvas;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-arena';
    document.body.appendChild(container);
    canvas = document.createElement('canvas');
    canvas.id = 'test-canvas';
    container.appendChild(canvas);
    mockGetContext(canvas);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('createCore', () => {
    it('should create minimal context with canvas', () => {
      const kit = GK().createCore({ gameId: 'test', canvas });
      expect(kit).toBeTruthy();
      expect(kit.gameId).toBe('test');
      expect(kit.canvas).toBe(canvas);
      expect(kit.ctx).toBeTruthy();
      expect(kit.version).toBe('1.0.0');
      expect(kit.state).toEqual({});
    });

    it('should find canvas via selector', () => {
      const kit = GK().createCore({ gameId: 'test', canvasSelector: '#test-canvas' });
      expect(kit.canvas).toBe(canvas);
    });

    it('should set arena via arenaSelector', () => {
      const kit = GK().createCore({ gameId: 'test', canvas, arenaSelector: '#test-arena' });
      expect(kit.arena).toBe(container);
    });

    it('should set initial state', () => {
      const kit = GK().createCore({ gameId: 'test', canvas, initialState: { score: 100 } });
      expect(kit.state.score).toBe(100);
    });

    it('should return null without canvas', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(GK().createCore({ gameId: 'test' })).toBeNull();
      spy.mockRestore();
    });

    it('core should NOT include subsystems', () => {
      const kit = GK().createCore({ gameId: 'test', canvas });
      expect(kit.timing).toBeUndefined();
      expect(kit.camera).toBeUndefined();
      expect(kit.input).toBeUndefined();
      expect(kit.hud).toBeUndefined();
    });

    it('destroy should clear canvas', () => {
      const kit = GK().createCore({ gameId: 'test', canvas });
      expect(() => kit.destroy()).not.toThrow();
    });
  });

  describe('createWithSubsystems', () => {
    it('should add camera when requested', () => {
      const kit = GK().createWithSubsystems({ gameId: 'test', canvas }, ['camera']);
      expect(kit.camera).toBeTruthy();
      expect(kit.camera.x).toBe(0);
      expect(kit.timing).toBeUndefined();
    });

    it('should add assets when requested', () => {
      const kit = GK().createWithSubsystems({ gameId: 'test', canvas }, ['assets']);
      expect(kit.assets).toBeTruthy();
    });

    it('should add scene when requested', () => {
      const kit = GK().createWithSubsystems({ gameId: 'test', canvas }, ['scene']);
      expect(kit.scene).toBeTruthy();
      expect(kit.scene._isRunning).toBe(false);
    });

    it('should add renderer when requested', () => {
      const kit = GK().createWithSubsystems({ gameId: 'test', canvas }, ['renderer']);
      expect(kit.renderer).toBeTruthy();
      expect(kit.renderer.type).toBe('2d');
    });

    it('should warn on unknown subsystem', () => {
      const spy = jest.spyOn(console, 'warn').mockImplementation();
      GK().createWithSubsystems({ gameId: 'test', canvas }, ['bogus']);
      expect(spy).toHaveBeenCalledWith('[GameKit] Unknown subsystem: bogus');
      spy.mockRestore();
    });

    it('should handle empty subsystems array', () => {
      const kit = GK().createWithSubsystems({ gameId: 'test', canvas }, []);
      expect(kit).toBeTruthy();
      expect(kit.camera).toBeUndefined();
    });

    it('should return null without canvas', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(GK().createWithSubsystems({ gameId: 'test' }, ['camera'])).toBeNull();
      spy.mockRestore();
    });

    it('destroy should cleanup subsystems', () => {
      const kit = GK().createWithSubsystems({ gameId: 'test', canvas }, ['scene']);
      expect(() => kit.destroy()).not.toThrow();
    });
  });

  describe('create (backward compat)', () => {
    it('should include default subsystems', () => {
      const kit = GK().create({ gameId: 'test', canvas });
      expect(kit).toBeTruthy();
      // Camera and scene should be present (others depend on globals)
      expect(kit.camera).toBeTruthy();
      expect(kit.scene).toBeTruthy();
      expect(kit.assets).toBeTruthy();
    });
  });

  describe('validateEngine', () => {
    it('should validate complete engine', () => {
      const result = GK().validateEngine({
        start: () => {},
        stop: () => {},
        version: '1.0.0',
        gameId: 'test',
      });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject null engine', () => {
      const result = GK().validateEngine(null);
      expect(result.valid).toBe(false);
    });

    it('should reject engine missing start', () => {
      const result = GK().validateEngine({ stop: () => {}, version: '1', gameId: 'x' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing start() method');
    });

    it('should reject engine missing stop', () => {
      const result = GK().validateEngine({ start: () => {}, version: '1', gameId: 'x' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing stop() method');
    });

    it('should reject engine missing version', () => {
      const result = GK().validateEngine({ start: () => {}, stop: () => {}, gameId: 'x' });
      expect(result.errors).toContain('Missing version property');
    });

    it('should reject engine missing gameId', () => {
      const result = GK().validateEngine({ start: () => {}, stop: () => {}, version: '1' });
      expect(result.errors).toContain('Missing gameId property');
    });
  });
});
