/**
 * ASDF Game Framework — Entity Schema Validation (SOLID: S enforcement)
 *
 * Enforces consistent entity structure across all games.
 * Prevents drift: Game A {data.hp}, Game B {data.health}, Game C {data.stats.hp}
 *
 * Pattern: Schema validation, strict contracts
 *
 * @module games/framework/entity-schema
 */

'use strict';

const EntitySchema = {
  /**
   * Required entity properties (must be present on ALL entities)
   * @type {string[]}
   */
  required: ['x', 'y', 'w', 'h', 'type'],

  /**
   * Optional entity properties (may be present)
   * @type {string[]}
   */
  optional: ['vx', 'vy', 'hp', 'data', 'dead'],

  /**
   * Validate a single entity against schema
   * @param {Object} entity - Entity to validate
   * @throws {Error} If entity fails validation
   */
  validate(entity) {
    if (!entity || typeof entity !== 'object') {
      throw new Error('[EntitySchema] Entity must be an object, got: ' + typeof entity);
    }

    for (const key of this.required) {
      if (!(key in entity)) {
        throw new Error(`[EntitySchema] Missing required property: ${key}`);
      }
    }

    // Check that x, y are numbers
    if (typeof entity.x !== 'number') {
      throw new Error(`[EntitySchema] Property 'x' must be a number, got: ${typeof entity.x}`);
    }
    if (typeof entity.y !== 'number') {
      throw new Error(`[EntitySchema] Property 'y' must be a number, got: ${typeof entity.y}`);
    }

    // Check that w, h are positive numbers
    if (typeof entity.w !== 'number' || entity.w <= 0) {
      throw new Error(`[EntitySchema] Property 'w' must be positive number, got: ${entity.w}`);
    }
    if (typeof entity.h !== 'number' || entity.h <= 0) {
      throw new Error(`[EntitySchema] Property 'h' must be positive number, got: ${entity.h}`);
    }

    // Check that type is a string
    if (typeof entity.type !== 'string') {
      throw new Error(
        `[EntitySchema] Property 'type' must be a string, got: ${typeof entity.type}`
      );
    }

    // Validate optional properties if present
    if ('vx' in entity && typeof entity.vx !== 'number') {
      throw new Error(`[EntitySchema] Property 'vx' must be a number, got: ${typeof entity.vx}`);
    }

    if ('vy' in entity && typeof entity.vy !== 'number') {
      throw new Error(`[EntitySchema] Property 'vy' must be a number, got: ${typeof entity.vy}`);
    }

    if ('hp' in entity && typeof entity.hp !== 'number') {
      throw new Error(`[EntitySchema] Property 'hp' must be a number, got: ${typeof entity.hp}`);
    }

    if ('dead' in entity && typeof entity.dead !== 'boolean') {
      throw new Error(
        `[EntitySchema] Property 'dead' must be a boolean, got: ${typeof entity.dead}`
      );
    }

    if ('data' in entity && (typeof entity.data !== 'object' || entity.data === null)) {
      throw new Error(
        `[EntitySchema] Property 'data' must be an object, got: ${typeof entity.data}`
      );
    }
  },

  /**
   * Validate batch of entities
   * Collects all errors and throws once with full report
   * @param {Array<Object>} entities - Array of entities to validate
   * @throws {Error} If any entities fail validation
   */
  validateBatch(entities) {
    if (!Array.isArray(entities)) {
      throw new Error('[EntitySchema] validateBatch requires an array');
    }

    const errors = [];

    for (let i = 0; i < entities.length; i++) {
      try {
        this.validate(entities[i]);
      } catch (e) {
        errors.push(`Entity[${i}]: ${e.message}`);
      }
    }

    if (errors.length > 0) {
      throw new Error('[EntitySchema] Batch validation failed:\n' + errors.join('\n'));
    }
  },

  /**
   * Get schema as JSON (for documentation)
   * @returns {Object} Schema definition
   */
  getSchema() {
    return {
      required: this.required,
      optional: this.optional,
      propertyTypes: {
        x: 'number (required)',
        y: 'number (required)',
        w: 'number > 0 (required)',
        h: 'number > 0 (required)',
        type: 'string (required)',
        vx: 'number (optional, default: 0)',
        vy: 'number (optional, default: 0)',
        hp: 'number (optional, default: 1)',
        dead: 'boolean (optional, default: false)',
        data: 'object (optional, for custom game-specific properties)',
      },
    };
  },

  /**
   * Check if entity conforms to schema (non-throwing)
   * @param {Object} entity - Entity to check
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  check(entity) {
    const errors = [];

    if (!entity || typeof entity !== 'object') {
      errors.push('Entity must be an object');
      return { valid: false, errors };
    }

    for (const key of this.required) {
      if (!(key in entity)) {
        errors.push(`Missing required property: ${key}`);
      }
    }

    if (typeof entity.x !== 'number') {
      errors.push(`Property 'x' must be number, got: ${typeof entity.x}`);
    }

    if (typeof entity.y !== 'number') {
      errors.push(`Property 'y' must be number, got: ${typeof entity.y}`);
    }

    if (typeof entity.w !== 'number' || entity.w <= 0) {
      errors.push(`Property 'w' must be positive number, got: ${entity.w}`);
    }

    if (typeof entity.h !== 'number' || entity.h <= 0) {
      errors.push(`Property 'h' must be positive number, got: ${entity.h}`);
    }

    if (typeof entity.type !== 'string') {
      errors.push(`Property 'type' must be string, got: ${typeof entity.type}`);
    }

    if ('vx' in entity && typeof entity.vx !== 'number') {
      errors.push(`Property 'vx' must be number, got: ${typeof entity.vx}`);
    }

    if ('vy' in entity && typeof entity.vy !== 'number') {
      errors.push(`Property 'vy' must be number, got: ${typeof entity.vy}`);
    }

    if ('hp' in entity && typeof entity.hp !== 'number') {
      errors.push(`Property 'hp' must be number, got: ${typeof entity.hp}`);
    }

    if ('dead' in entity && typeof entity.dead !== 'boolean') {
      errors.push(`Property 'dead' must be boolean, got: ${typeof entity.dead}`);
    }

    if ('data' in entity && (typeof entity.data !== 'object' || entity.data === null)) {
      errors.push(`Property 'data' must be object, got: ${typeof entity.data}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.EntitySchema = EntitySchema;
}
