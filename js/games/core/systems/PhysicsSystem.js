/**
 * ASDF Games - 11/10 Physics System
 * Deterministic physics and collision detection for ECS entities.
 * Features: Zero-Allocation Spatial Hash and AABB checks.
 */

'use strict';

(function () {
  const PhysicsSystem = {
    /**
     * Create a Movement System (Peak RAM bandwidth)
     */
    createMovement() {
      return function (world, dt) {
        const query = world.createQuery(['Position', 'Velocity']);
        const posProps = world.componentRegistry.get('Position').props;
        const velProps = world.componentRegistry.get('Velocity').props;

        const { dense, count } = query.set;
        // 11/10: Direct index-based loop is faster than callback for thousands of entities
        for (let i = 0; i < count; i++) {
          const index = dense[i];
          posProps.x[index] += velProps.vx[index] * dt;
          posProps.y[index] += velProps.vy[index] * dt;
        }
      };
    },

    /**
     * Create a Collision System (Spatial Partitioning Optimized)
     */
    createCollision() {
      const hash = new ASDF.SpatialHash(80);
      // Zero-Allocation: Pre-allocated arrays for the physics frame
      const entities = new Uint32Array(5000);
      const candidates = new Uint32Array(500); // Max neighbors per entity check

      return function (world, dt) {
        const query = world.createQuery(['Position', 'Collider']);
        const posProps = world.componentRegistry.get('Position').props;
        const collProps = world.componentRegistry.get('Collider').props;

        const { dense, count } = query.set;
        hash.clear();

        // 1. Populate Hash
        for (let i = 0; i < count; i++) {
          const index = dense[i];
          const id = world.getEntityId(index);
          const x = posProps.x[index];
          const y = posProps.y[index];
          const w = collProps.width[index];
          const h = collProps.height[index];

          collProps.active[index] = 0; // Reset flag

          hash.insert(id, x, y, w, h);
          entities[i] = id;
        }

        // 2. Query Neighbors Only
        for (let i = 0; i < count; i++) {
          const idA = entities[i];
          const indexA = world.getIndex(idA);
          const ax = posProps.x[indexA];
          const ay = posProps.y[indexA];
          const aw = collProps.width[indexA];
          const ah = collProps.height[indexA];

          // Use optimized query that fills an array instead of creating one
          // (Requires update to SpatialHash.js)
          const neighborCount = hash.queryToArray(ax, ay, aw, ah, candidates);

          for (let j = 0; j < neighborCount; j++) {
            const idB = candidates[j];
            if (idA === idB) continue;

            const indexB = world.getIndex(idB);
            const bx = posProps.x[indexB];
            const by = posProps.y[indexB];
            const bw = collProps.width[indexB];
            const bh = collProps.height[indexB];

            // AABB Check (Classic Branchless potential)
            if (ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by) {
              collProps.active[indexA] = 1;
              collProps.active[indexB] = 1;
            }
          }
        }
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.PhysicsSystem = PhysicsSystem;
  }
})();
