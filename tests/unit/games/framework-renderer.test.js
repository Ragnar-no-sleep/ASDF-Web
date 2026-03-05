/**
 * Tests for RendererFactory (games/framework/renderer.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/renderer.js'));
});

const RF = () => global.RendererFactory;

// jsdom doesn't implement canvas.getContext — mock it
function createMockCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
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
  canvas.getContext = jest.fn(() => ctx);
  return { canvas, ctx };
}

describe('RendererFactory (SOLID: Dependency Inversion)', () => {
  let canvas, ctx;

  beforeEach(() => {
    ({ canvas, ctx } = createMockCanvas());
  });

  describe('create', () => {
    it('should create 2D renderer with valid canvas', () => {
      const renderer = RF().create('2d', { canvas });
      expect(renderer).toBeTruthy();
      expect(renderer.type).toBe('2d');
      expect(renderer.canvas).toBe(canvas);
      expect(renderer.ctx).toBeTruthy();
    });

    it('should default to 2D type', () => {
      const renderer = RF().create(undefined, { canvas });
      expect(renderer.type).toBe('2d');
    });

    it('should return null for unknown type', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(RF().create('webgl', { canvas })).toBeNull();
      expect(RF().create('phaser', { canvas })).toBeNull();
      spy.mockRestore();
    });

    it('should return null without canvas', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      expect(RF().create('2d', {})).toBeNull();
      spy.mockRestore();
    });

    it('should set width and height from config', () => {
      const renderer = RF().create('2d', { canvas, width: 1920, height: 1080 });
      expect(renderer.width).toBe(1920);
      expect(renderer.height).toBe(1080);
    });
  });

  describe('2D renderer methods', () => {
    let renderer;

    beforeEach(() => {
      renderer = RF().create('2d', { canvas });
    });

    it('should have all interface methods', () => {
      expect(typeof renderer.clear).toBe('function');
      expect(typeof renderer.draw).toBe('function');
      expect(typeof renderer.drawRect).toBe('function');
      expect(typeof renderer.drawStrokeRect).toBe('function');
      expect(typeof renderer.drawCircle).toBe('function');
      expect(typeof renderer.drawText).toBe('function');
      expect(typeof renderer.applyCamera).toBe('function');
      expect(typeof renderer.resetCamera).toBe('function');
    });

    it('clear should fill canvas with black', () => {
      renderer.clear();
      expect(renderer.ctx.fillStyle).toBe('#000');
      expect(renderer.ctx.fillRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
    });

    it('drawRect should fill rectangle', () => {
      renderer.drawRect(10, 20, 100, 50, '#ff0000');
      expect(renderer.ctx.fillRect).toHaveBeenCalledWith(10, 20, 100, 50);
      expect(renderer.ctx.fillStyle).toBe('#ff0000');
    });

    it('drawCircle should draw arc', () => {
      renderer.drawCircle(50, 50, 20, '#00ff00');
      expect(renderer.ctx.arc).toHaveBeenCalledWith(50, 50, 20, 0, Math.PI * 2);
    });

    it('drawText should render text', () => {
      renderer.drawText('Score: 100', 10, 20, { color: '#fff', font: '20px Arial' });
      expect(renderer.ctx.fillText).toHaveBeenCalledWith('Score: 100', 10, 20);
    });

    it('draw should skip null image', () => {
      renderer.draw(null, 0, 0, 10, 10);
      expect(renderer.ctx.drawImage).not.toHaveBeenCalled();
    });

    it('applyCamera should save and translate', () => {
      renderer.applyCamera(100, 50);
      expect(renderer.ctx.save).toHaveBeenCalled();
      expect(renderer.ctx.translate).toHaveBeenCalledWith(-100, -50);
    });

    it('resetCamera should restore context', () => {
      renderer.applyCamera(0, 0);
      renderer.resetCamera();
      expect(renderer.ctx.restore).toHaveBeenCalled();
    });
  });
});
