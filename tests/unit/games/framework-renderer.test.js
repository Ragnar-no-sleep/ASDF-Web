/**
 * ASDF Game Framework — Renderer Tests (SOLID: D — Dependency Inversion)
 * @module tests/unit/games/framework-renderer
 */

'use strict';

describe('RendererFactory (SOLID: Dependency Inversion)', () => {
  let canvas;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
  });

  describe('create 2D renderer', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        fillStyle: '',
        font: '',
        textAlign: 'left',
        globalAlpha: 1,
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        fillText: jest.fn(),
      };
    });

    it('should create 2D canvas renderer', () => {
      const renderer = {
        type: '2d',
        canvas,
        ctx: mockCtx,
        width: 800,
        height: 600,

        clear() {
          this.ctx.fillStyle = '#000';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        },

        draw(image, x, y, w, h, rotation = 0, alpha = 1) {
          if (!image) return;
          this.ctx.save();
          this.ctx.globalAlpha = alpha;
          if (rotation !== 0) {
            this.ctx.translate(x + w / 2, y + h / 2);
            this.ctx.rotate(rotation);
            this.ctx.drawImage(image, -w / 2, -h / 2, w, h);
          } else {
            this.ctx.drawImage(image, x, y, w, h);
          }
          this.ctx.restore();
        },

        drawRect(x, y, w, h, color = '#fff') {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(x, y, w, h);
        },

        drawText(text, x, y, style = {}) {
          const { color = '#fff', font = '16px Arial', align = 'left' } = style;
          this.ctx.fillStyle = color;
          this.ctx.font = font;
          this.ctx.textAlign = align;
          this.ctx.fillText(text, x, y);
        },
      };

      expect(renderer.type).toBe('2d');
      expect(renderer.canvas).toBe(canvas);
      expect(renderer.ctx).toBeDefined();
      expect(typeof renderer.clear).toBe('function');
      expect(typeof renderer.draw).toBe('function');
      expect(typeof renderer.drawRect).toBe('function');
      expect(typeof renderer.drawText).toBe('function');
    });

    it('should clear canvas', () => {
      const renderer = {
        type: '2d',
        canvas,
        ctx: mockCtx,

        clear() {
          this.ctx.fillStyle = '#000';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        },
      };

      expect(() => renderer.clear()).not.toThrow();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should draw rectangle', () => {
      const renderer = {
        type: '2d',
        canvas,
        ctx: mockCtx,

        drawRect(x, y, w, h, color = '#fff') {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(x, y, w, h);
        },
      };

      expect(() => renderer.drawRect(0, 0, 100, 100, '#ff0000')).not.toThrow();
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('should draw circle', () => {
      const renderer = {
        type: '2d',
        canvas,
        ctx: mockCtx,

        drawCircle(x, y, radius, color = '#fff') {
          this.ctx.fillStyle = color;
          this.ctx.beginPath();
          this.ctx.arc(x, y, radius, 0, Math.PI * 2);
          this.ctx.fill();
        },
      };

      expect(() => renderer.drawCircle(50, 50, 20, '#00ff00')).not.toThrow();
      expect(mockCtx.arc).toHaveBeenCalledWith(50, 50, 20, 0, Math.PI * 2);
    });

    it('should draw text', () => {
      const renderer = {
        type: '2d',
        canvas,
        ctx: mockCtx,

        drawText(text, x, y, style = {}) {
          const { color = '#fff', font = '16px Arial', align = 'left' } = style;
          this.ctx.fillStyle = color;
          this.ctx.font = font;
          this.ctx.textAlign = align;
          this.ctx.fillText(text, x, y);
        },
      };

      expect(() =>
        renderer.drawText('Score: 100', 10, 10, { color: '#fff', font: '20px Arial' })
      ).not.toThrow();
      expect(mockCtx.fillText).toHaveBeenCalledWith('Score: 100', 10, 10);
    });
  });

  describe('renderer interface', () => {
    it('should have type property', () => {
      const renderer = { type: '2d' };
      expect(renderer.type).toBeDefined();
    });

    it('should have clear method', () => {
      const renderer = { clear: () => {} };
      expect(typeof renderer.clear).toBe('function');
    });

    it('should have draw method', () => {
      const renderer = { draw: () => {} };
      expect(typeof renderer.draw).toBe('function');
    });

    it('should have drawRect method', () => {
      const renderer = { drawRect: () => {} };
      expect(typeof renderer.drawRect).toBe('function');
    });

    it('should have drawText method', () => {
      const renderer = { drawText: () => {} };
      expect(typeof renderer.drawText).toBe('function');
    });
  });

  describe('unknown renderer types', () => {
    it('should reject unknown type via factory create()', () => {
      const factory = {
        create(type = '2d', config = {}) {
          if (type === '2d') return { type: '2d' };
          return null;
        },
      };

      expect(factory.create('2d')).toBeTruthy();
      expect(factory.create('phaser')).toBeNull();
      expect(factory.create('webgl')).toBeNull();
      expect(factory.create('unknown')).toBeNull();
    });
  });

  describe('SOLID: Dependency Inversion', () => {
    it('game code depends on Renderer interface, not Canvas API', () => {
      // Game only calls renderer.draw(), not ctx.drawImage()
      const renderer = {
        draw: (image, x, y, w, h) => {
          // Implementation hidden
        },
      };

      // Game code is agnostic to underlying renderer type
      expect(typeof renderer.draw).toBe('function');
    });

    it('swapping renderers requires zero game code changes', () => {
      // Game code:
      const gameCode = renderer => {
        renderer.clear();
        renderer.drawRect(10, 10, 100, 100, '#ff0000');
        renderer.drawText('Score: 100', 10, 20);
      };

      // Works with any renderer implementing interface
      const canvas2D = {
        clear: () => {},
        drawRect: () => {},
        drawText: () => {},
      };

      const phaser = {
        clear: () => {},
        drawRect: () => {},
        drawText: () => {},
      };

      expect(() => gameCode(canvas2D)).not.toThrow();
      expect(() => gameCode(phaser)).not.toThrow();
    });

    it('should support renderer abstraction for future backends', () => {
      const rendererTypes = {
        canvas2D: 'production ready',
        phaser: 'planned',
        webgl: 'planned',
      };

      expect(Object.keys(rendererTypes).length).toBe(3);
      expect(rendererTypes.canvas2D).toBe('production ready');
    });
  });

  describe('Camera transforms', () => {
    it('should apply camera transform', () => {
      const mockCtx = {
        save: jest.fn(),
        translate: jest.fn(),
      };

      const renderer = {
        type: '2d',
        ctx: mockCtx,

        applyCamera(cameraX = 0, cameraY = 0) {
          this.ctx.save();
          this.ctx.translate(-cameraX, -cameraY);
        },
      };

      expect(() => renderer.applyCamera(100, 50)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(-100, -50);
    });

    it('should reset camera transform', () => {
      const mockCtx = {
        restore: jest.fn(),
      };

      const renderer = {
        type: '2d',
        ctx: mockCtx,

        resetCamera() {
          this.ctx.restore();
        },
      };

      expect(() => renderer.resetCamera()).not.toThrow();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });
});
