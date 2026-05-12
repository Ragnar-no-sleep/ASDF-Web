/**
 * Tests for EntitySchema (games/framework/entity-schema.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/entity-schema.js'));
});

const ES = () => global.EntitySchema;

describe('EntitySchema (Data Consistency)', () => {
  describe('validate', () => {
    it('should accept valid entity with required properties', () => {
      expect(() => ES().validate({ x: 100, y: 200, w: 32, h: 32, type: 'player' })).not.toThrow();
    });

    it('should accept entity with optional properties', () => {
      expect(() =>
        ES().validate({
          x: 0,
          y: 0,
          w: 10,
          h: 10,
          type: 'enemy',
          vx: 5,
          vy: -3,
          hp: 20,
          dead: false,
          data: {},
        })
      ).not.toThrow();
    });

    it('should reject null entity', () => {
      expect(() => ES().validate(null)).toThrow(/must be an object/);
    });

    it('should reject non-object entity', () => {
      expect(() => ES().validate('not an object')).toThrow(/must be an object/);
    });

    it('should reject entity missing required x', () => {
      expect(() => ES().validate({ y: 0, w: 10, h: 10, type: 'e' })).toThrow(
        /Missing required property: x/
      );
    });

    it('should reject entity missing required y', () => {
      expect(() => ES().validate({ x: 0, w: 10, h: 10, type: 'e' })).toThrow(
        /Missing required property: y/
      );
    });

    it('should reject entity missing required w', () => {
      expect(() => ES().validate({ x: 0, y: 0, h: 10, type: 'e' })).toThrow(
        /Missing required property: w/
      );
    });

    it('should reject entity missing required h', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, type: 'e' })).toThrow(
        /Missing required property: h/
      );
    });

    it('should reject entity missing required type', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10 })).toThrow(
        /Missing required property: type/
      );
    });

    it('should reject non-number x', () => {
      expect(() => ES().validate({ x: 'zero', y: 0, w: 10, h: 10, type: 'e' })).toThrow(
        /Property 'x' must be a number/
      );
    });

    it('should reject non-number y', () => {
      expect(() => ES().validate({ x: 0, y: 'zero', w: 10, h: 10, type: 'e' })).toThrow(
        /Property 'y' must be a number/
      );
    });

    it('should reject non-positive w', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 0, h: 10, type: 'e' })).toThrow(
        /Property 'w' must be positive number/
      );
    });

    it('should reject non-positive h', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: -5, type: 'e' })).toThrow(
        /Property 'h' must be positive number/
      );
    });

    it('should reject non-string type', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10, type: 123 })).toThrow(
        /Property 'type' must be a string/
      );
    });

    it('should reject invalid optional vx', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10, type: 'e', vx: 'fast' })).toThrow(
        /Property 'vx' must be a number/
      );
    });

    it('should reject invalid optional vy', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10, type: 'e', vy: true })).toThrow(
        /Property 'vy' must be a number/
      );
    });

    it('should reject invalid optional hp', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10, type: 'e', hp: 'full' })).toThrow(
        /Property 'hp' must be a number/
      );
    });

    it('should reject invalid optional dead', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10, type: 'e', dead: 1 })).toThrow(
        /Property 'dead' must be a boolean/
      );
    });

    it('should reject invalid optional data', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10, type: 'e', data: 'str' })).toThrow(
        /Property 'data' must be an object/
      );
    });

    it('should accept data as empty object', () => {
      expect(() => ES().validate({ x: 0, y: 0, w: 10, h: 10, type: 'e', data: {} })).not.toThrow();
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple valid entities', () => {
      expect(() =>
        ES().validateBatch([
          { x: 0, y: 0, w: 10, h: 10, type: 'player' },
          { x: 100, y: 100, w: 20, h: 20, type: 'enemy' },
        ])
      ).not.toThrow();
    });

    it('should report errors for invalid entities', () => {
      expect(() =>
        ES().validateBatch([
          { x: 0, y: 0, w: 10, h: 10, type: 'ok' },
          { x: 'bad', y: 100, w: 20, h: 20, type: 'enemy' },
        ])
      ).toThrow(/Batch validation failed/);
    });

    it('should collect all errors in batch', () => {
      try {
        ES().validateBatch([
          { y: 0, w: 10, h: 10, type: 'a' },
          { x: 0, y: 0, h: 10, type: 'b' },
          { x: 0, y: 0, w: 10, type: 'c' },
        ]);
        throw new Error('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('Entity[0]');
        expect(e.message).toContain('Entity[1]');
        expect(e.message).toContain('Entity[2]');
      }
    });

    it('should reject non-array input', () => {
      expect(() => ES().validateBatch(null)).toThrow(/requires an array/);
      expect(() => ES().validateBatch({})).toThrow(/requires an array/);
    });
  });

  describe('check (non-throwing)', () => {
    it('should return valid: true for valid entity', () => {
      const result = ES().check({ x: 0, y: 0, w: 10, h: 10, type: 'e' });
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return valid: false for invalid entity', () => {
      const result = ES().check({ x: 'bad', y: 0, w: 10, h: 10, type: 'e' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should collect multiple errors', () => {
      const result = ES().check({ x: 'bad', w: -10, type: 123 });
      expect(result.errors.length).toBeGreaterThan(2);
    });

    it('should handle null entity', () => {
      const result = ES().check(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('getSchema', () => {
    it('should return schema definition', () => {
      const schema = ES().getSchema();
      expect(schema.required).toContain('x');
      expect(schema.required).toContain('type');
      expect(schema.optional).toContain('hp');
      expect(schema.propertyTypes).toBeDefined();
    });
  });

  describe('Data Consistency across games (SOLID: S)', () => {
    it('StakeStacker entities should conform', () => {
      expect(() =>
        ES().validate({ x: 0, y: 0, w: 40, h: 40, type: 'stake', data: { value: 100 } })
      ).not.toThrow();
    });

    it('WhaleWatch entities should conform', () => {
      expect(() =>
        ES().validate({ x: 100, y: 200, w: 50, h: 50, type: 'whale', vx: 10, vy: 5 })
      ).not.toThrow();
    });

    it('ScamBlaster entities should conform', () => {
      expect(() =>
        ES().validate({ x: 300, y: 400, w: 20, h: 20, type: 'projectile', vx: 15, hp: 1 })
      ).not.toThrow();
    });
  });
});
