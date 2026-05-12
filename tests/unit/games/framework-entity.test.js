/**
 * Tests for EntityFactory (games/framework/entity.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/entity.js'));
});

const EF = () => global.EntityFactory;

describe('EntityFactory', () => {
  describe('create', () => {
    it('should create entity with default properties', () => {
      const e = EF().create();
      expect(e.x).toBe(0);
      expect(e.y).toBe(0);
      expect(e.vx).toBe(0);
      expect(e.vy).toBe(0);
      expect(e.w).toBe(1);
      expect(e.h).toBe(1);
      expect(e.hp).toBe(1);
      expect(e.type).toBe('entity');
      expect(e.dead).toBe(false);
    });

    it('should create entity with custom properties', () => {
      const e = EF().create({
        x: 100,
        y: 200,
        vx: 5,
        vy: -3,
        w: 32,
        h: 32,
        hp: 10,
        type: 'player',
        data: { level: 5 },
      });
      expect(e.x).toBe(100);
      expect(e.y).toBe(200);
      expect(e.vx).toBe(5);
      expect(e.vy).toBe(-3);
      expect(e.w).toBe(32);
      expect(e.h).toBe(32);
      expect(e.hp).toBe(10);
      expect(e.type).toBe('player');
      expect(e.data.level).toBe(5);
    });
  });

  describe('integrate', () => {
    it('should update position by velocity * dt', () => {
      const e = EF().create({ x: 0, y: 0, vx: 10, vy: 20 });
      EF().integrate(e, 0.1);
      expect(e.x).toBe(1);
      expect(e.y).toBe(2);
    });

    it('should not integrate dead entities', () => {
      const e = EF().create({ x: 0, y: 0, vx: 10, vy: 20 });
      e.dead = true;
      EF().integrate(e, 0.1);
      expect(e.x).toBe(0);
      expect(e.y).toBe(0);
    });

    it('should handle null entity', () => {
      expect(() => EF().integrate(null, 0.1)).not.toThrow();
    });
  });

  describe('aabb', () => {
    it('should detect collision between overlapping boxes', () => {
      const a = EF().create({ x: 0, y: 0, w: 10, h: 10 });
      const b = EF().create({ x: 5, y: 5, w: 10, h: 10 });
      expect(EF().aabb(a, b)).toBe(true);
    });

    it('should not detect collision between non-overlapping boxes', () => {
      const a = EF().create({ x: 0, y: 0, w: 10, h: 10 });
      const b = EF().create({ x: 20, y: 20, w: 10, h: 10 });
      expect(EF().aabb(a, b)).toBe(false);
    });

    it('should handle edge touching (no collision)', () => {
      const a = EF().create({ x: 0, y: 0, w: 10, h: 10 });
      const b = EF().create({ x: 10, y: 0, w: 10, h: 10 });
      expect(EF().aabb(a, b)).toBe(false);
    });

    it('should handle null entities', () => {
      const a = EF().create({ x: 0, y: 0, w: 10, h: 10 });
      expect(EF().aabb(null, a)).toBe(false);
      expect(EF().aabb(a, null)).toBe(false);
      expect(EF().aabb(null, null)).toBe(false);
    });
  });

  describe('updateAll', () => {
    it('should integrate all living entities', () => {
      const entities = [
        EF().create({ x: 0, y: 0, vx: 10, vy: 0 }),
        EF().create({ x: 0, y: 0, vx: 0, vy: 20 }),
      ];
      const updated = EF().updateAll(entities, 0.1);
      expect(updated[0].x).toBe(1);
      expect(updated[1].y).toBe(2);
    });

    it('should filter out dead entities', () => {
      const entities = [EF().create(), EF().create(), EF().create()];
      entities[1].dead = true;
      const updated = EF().updateAll(entities, 0.1);
      expect(updated.length).toBe(2);
    });

    it('should call removeFn for dead entities', () => {
      const entities = [EF().create(), EF().create()];
      entities[1].dead = true;
      const removed = [];
      EF().updateAll(entities, 0.1, e => removed.push(e));
      expect(removed.length).toBe(1);
      expect(removed[0].dead).toBe(true);
    });

    it('should handle empty array', () => {
      expect(EF().updateAll([], 0.1)).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(EF().updateAll(null, 0.1)).toEqual([]);
    });
  });

  describe('checkCollisions', () => {
    it('should call callback for colliding pairs', () => {
      const a = EF().create({ x: 0, y: 0, w: 10, h: 10 });
      const b = EF().create({ x: 5, y: 5, w: 10, h: 10 });
      const c = EF().create({ x: 100, y: 100, w: 10, h: 10 });
      const pairs = [];
      EF().checkCollisions([a, b, c], (x, y) => pairs.push([x, y]));
      expect(pairs.length).toBe(1);
      expect(pairs[0]).toEqual([a, b]);
    });

    it('should handle null/empty gracefully', () => {
      expect(() => EF().checkCollisions(null, () => {})).not.toThrow();
      expect(() => EF().checkCollisions([], null)).not.toThrow();
    });
  });

  describe('spatialPartition', () => {
    it('should group entities into grid cells', () => {
      const entities = [
        EF().create({ x: 5, y: 5, w: 1, h: 1 }),
        EF().create({ x: 15, y: 5, w: 1, h: 1 }),
        EF().create({ x: 105, y: 5, w: 1, h: 1 }),
      ];
      const grid = EF().spatialPartition(entities, 100);
      expect(grid.get('0,0').length).toBe(2);
      expect(grid.get('1,0').length).toBe(1);
    });
  });
});
