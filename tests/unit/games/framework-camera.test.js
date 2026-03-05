/**
 * Tests for CameraFactory (games/framework/camera.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/camera.js'));
});

const CF = () => global.CameraFactory;

describe('CameraFactory', () => {
  describe('create', () => {
    it('should create camera with defaults', () => {
      const cam = CF().create();
      expect(cam.x).toBe(0);
      expect(cam.y).toBe(0);
      expect(cam.width).toBe(800);
      expect(cam.height).toBe(600);
      expect(cam.worldWidth).toBe(5000);
      expect(cam.worldHeight).toBe(5000);
      expect(cam.zoom).toBe(1);
      expect(cam.followTarget).toBeNull();
      expect(cam.shakeIntensity).toBe(0);
    });

    it('should accept custom config', () => {
      const cam = CF().create({ width: 1920, height: 1080, worldWidth: 10000, smoothDamp: 0.2 });
      expect(cam.width).toBe(1920);
      expect(cam.height).toBe(1080);
      expect(cam.worldWidth).toBe(10000);
      expect(cam.smoothDamp).toBe(0.2);
    });
  });

  describe('setFollowTarget', () => {
    it('should set follow target and offset', () => {
      const cam = CF().create();
      const entity = { x: 100, y: 200 };
      CF().setFollowTarget(cam, entity, 10, 20);
      expect(cam.followTarget).toBe(entity);
      expect(cam.followOffsetX).toBe(10);
      expect(cam.followOffsetY).toBe(20);
    });

    it('should handle null camera gracefully', () => {
      expect(() => CF().setFollowTarget(null, { x: 0, y: 0 })).not.toThrow();
    });
  });

  describe('update', () => {
    it('should move camera towards follow target', () => {
      const cam = CF().create({ smoothDamp: 1.0 });
      CF().setFollowTarget(cam, { x: 1000, y: 1000 });
      CF().update(cam, 0.016);
      expect(cam.x).toBeCloseTo(1000 - 400, 0);
      expect(cam.y).toBeCloseTo(1000 - 300, 0);
    });

    it('should clamp to world bounds (min)', () => {
      const cam = CF().create();
      cam.x = -100;
      cam.y = -200;
      CF().update(cam, 0.016);
      expect(cam.x).toBe(0);
      expect(cam.y).toBe(0);
    });

    it('should clamp to world bounds (max)', () => {
      const cam = CF().create({ width: 800, height: 600, worldWidth: 1000, worldHeight: 800 });
      cam.x = 9999;
      cam.y = 9999;
      CF().update(cam, 0.016);
      expect(cam.x).toBe(200);
      expect(cam.y).toBe(200);
    });

    it('should not move without follow target', () => {
      const cam = CF().create();
      CF().update(cam, 0.016);
      expect(cam.x).toBe(0);
      expect(cam.y).toBe(0);
    });

    it('should handle null camera', () => {
      expect(() => CF().update(null, 0.016)).not.toThrow();
    });
  });

  describe('shake', () => {
    it('should set shake parameters and reset elapsed', () => {
      const cam = CF().create();
      CF().shake(cam, 10, 0.5);
      expect(cam.shakeIntensity).toBe(10);
      expect(cam.shakeDuration).toBe(0.5);
      expect(cam.shakeElapsed).toBe(0);
    });

    it('should produce non-zero offset during active shake', () => {
      const cam = CF().create();
      CF().shake(cam, 20, 1.0);
      CF().update(cam, 0.1);
      expect(cam.shakeX !== 0 || cam.shakeY !== 0).toBe(true);
    });

    it('should zero out shake after duration expires', () => {
      const cam = CF().create();
      CF().shake(cam, 10, 0.2);
      cam.shakeElapsed = 0.3;
      CF().update(cam, 0.016);
      expect(cam.shakeX).toBe(0);
      expect(cam.shakeY).toBe(0);
    });
  });

  describe('worldToScreen / screenToWorld', () => {
    it('should convert correctly', () => {
      const cam = CF().create();
      cam.x = 100;
      cam.y = 50;
      expect(CF().worldToScreen(cam, 200, 150)).toEqual({ x: 100, y: 100 });
      expect(CF().screenToWorld(cam, 100, 100)).toEqual({ x: 200, y: 150 });
    });

    it('should be inverse operations', () => {
      const cam = CF().create();
      cam.x = 250;
      cam.y = 175;
      const screen = CF().worldToScreen(cam, 500, 400);
      const back = CF().screenToWorld(cam, screen.x, screen.y);
      expect(back.x).toBeCloseTo(500);
      expect(back.y).toBeCloseTo(400);
    });

    it('should pass through for null camera', () => {
      expect(CF().worldToScreen(null, 42, 99)).toEqual({ x: 42, y: 99 });
      expect(CF().screenToWorld(null, 42, 99)).toEqual({ x: 42, y: 99 });
    });
  });

  describe('applyTransform / resetTransform', () => {
    it('should save/translate/restore context', () => {
      const ctx = { save: jest.fn(), translate: jest.fn(), restore: jest.fn() };
      const cam = CF().create();
      cam.x = 50;
      cam.y = 30;

      CF().applyTransform(ctx, cam);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.translate).toHaveBeenCalledWith(-50, -30);

      CF().resetTransform(ctx);
      expect(ctx.restore).toHaveBeenCalled();
    });

    it('should handle null arguments', () => {
      expect(() => CF().applyTransform(null, {})).not.toThrow();
      expect(() => CF().resetTransform(null)).not.toThrow();
    });
  });

  describe('getBounds', () => {
    it('should return camera viewport rect', () => {
      const cam = CF().create({ width: 1024, height: 768 });
      cam.x = 200;
      cam.y = 150;
      expect(CF().getBounds(cam)).toEqual({ x: 200, y: 150, width: 1024, height: 768 });
    });

    it('should return default for null', () => {
      expect(CF().getBounds(null)).toEqual({ x: 0, y: 0, width: 800, height: 600 });
    });
  });

  describe('isVisible', () => {
    it('should detect visible entities', () => {
      const cam = CF().create({ width: 800, height: 600 });
      expect(CF().isVisible(cam, 100, 100, 50, 50)).toBe(true);
    });

    it('should reject fully offscreen entities', () => {
      const cam = CF().create({ width: 800, height: 600 });
      expect(CF().isVisible(cam, 900, 100, 50, 50)).toBe(false);
      expect(CF().isVisible(cam, -100, 100, 50, 50)).toBe(false);
      expect(CF().isVisible(cam, 100, 700, 50, 50)).toBe(false);
    });

    it('should accept partially visible entities', () => {
      const cam = CF().create({ width: 800, height: 600 });
      expect(CF().isVisible(cam, 790, 100, 50, 50)).toBe(true);
    });

    it('should return true for null camera', () => {
      expect(CF().isVisible(null, 0, 0)).toBe(true);
    });
  });
});
