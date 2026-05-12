/**
 * ASDF Game Framework — Entity Factory
 *
 * Plain-object entity creation, physics integration, AABB collision
 * Pattern: Factory pattern, no constructors
 * State: entity objects = plain JS objects, mutable
 *
 * @module games/framework/entity
 */

'use strict';

const EntityFactory = {
  /**
   * Create a new entity
   * @param {Object} opts - Entity options
   * @param {number} opts.x - X position
   * @param {number} opts.y - Y position
   * @param {number} [opts.vx=0] - Velocity X
   * @param {number} [opts.vy=0] - Velocity Y
   * @param {number} opts.w - Width
   * @param {number} opts.h - Height
   * @param {number} [opts.hp=1] - Health points
   * @param {string} [opts.type='entity'] - Entity type (for categorization)
   * @param {*} opts.data - Custom data object for game-specific properties
   * @returns {Object} Entity object
   */
  create(opts = {}) {
    return {
      x: opts.x || 0,
      y: opts.y || 0,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      w: opts.w || 1,
      h: opts.h || 1,
      hp: opts.hp !== undefined ? opts.hp : 1,
      type: opts.type || 'entity',
      data: opts.data || {},
      dead: false,
    };
  },

  /**
   * Integrate entity position using velocity (frame-independent with dt)
   * x += vx * dt, y += vy * dt
   * @param {Object} entity - Entity to integrate
   * @param {number} dt - Delta time in seconds
   */
  integrate(entity, dt) {
    if (!entity || entity.dead) return;
    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;
  },

  /**
   * AABB collision test: two axis-aligned bounding boxes
   * @param {Object} a - First entity
   * @param {Object} b - Second entity
   * @returns {boolean} True if colliding
   */
  aabb(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  /**
   * Update all entities: integrate position, mark dead, filter
   * @param {Array<Object>} entities - Array of entities
   * @param {number} dt - Delta time in seconds
   * @param {Function} [removeFn] - Optional callback(entity) before removing dead entity
   * @returns {Array<Object>} Filtered array of living entities
   */
  updateAll(entities, dt, removeFn) {
    if (!Array.isArray(entities)) return [];

    // Integrate all living entities
    for (const e of entities) {
      if (!e.dead) {
        this.integrate(e, dt);
      }
    }

    // Filter out dead and call removeFn
    const alive = [];
    for (const e of entities) {
      if (e.dead && removeFn) {
        removeFn(e);
      }
      if (!e.dead) {
        alive.push(e);
      }
    }

    return alive;
  },

  /**
   * Batch collision check (quadratic, suitable for N < 200 entities)
   * @param {Array<Object>} entities - Array of entities
   * @param {Function} callback - callback(a, b) on collision
   */
  checkCollisions(entities, callback) {
    if (!Array.isArray(entities) || !callback) return;

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (this.aabb(entities[i], entities[j])) {
          callback(entities[i], entities[j]);
        }
      }
    }
  },

  /**
   * Spatial partitioning helper: sort entities into grid buckets
   * Useful for optimization before collision checks
   * @param {Array<Object>} entities - Array of entities
   * @param {number} cellSize - Grid cell size
   * @returns {Map<string, Array<Object>>} Map of "x,y" -> entities in that cell
   */
  spatialPartition(entities, cellSize = 100) {
    const grid = new Map();

    for (const e of entities) {
      const cellX = Math.floor(e.x / cellSize);
      const cellY = Math.floor(e.y / cellSize);
      const key = `${cellX},${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key).push(e);
    }

    return grid;
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.EntityFactory = EntityFactory;
}
