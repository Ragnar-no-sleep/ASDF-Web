/**
 * Space Shooter - Geometric Particle Pool System
 *
 * Object pool with 512 pre-allocated slots for efficient particle rendering
 * Types: ENGINE_TRAIL, BULLET_IMPACT, EXPLOSION_SMALL, EXPLOSION_LARGE, SHIELD_ABSORB, POWERUP_COLLECT
 *
 * @module games/engines/spaceshooter/particles
 */

'use strict';

const SpaceParticles = {
  /**
   * Create particle pool (Zero-Allocation 2026 Standard)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @returns {Object} Particle manager
   */
  create(ctx) {
    // Determine capacity (512 or more if needed)
    const capacity = 512;
    // itemSize 8: x, y, vx, vy, life, maxLife, size, colorInt
    const pool = typeof TypedObjectPool !== 'undefined' ? new TypedObjectPool(capacity, 8) : null;

    // Legacy fallback pool if core is missing
    const legacyPool = [];
    let legacyActiveCount = 0;
    if (!pool) {
      for (let i = 0; i < capacity; i++) {
        legacyPool.push({ active: false });
      }
    }

    // Helper to convert hex color to integer for Float32Array storage
    const hexToInt = hex => {
      // e.g. '#ffff00' -> 16776960
      if (!hex || hex[0] !== '#') return 0xffffff;
      return parseInt(hex.slice(1), 16);
    };

    // Helper to convert integer back to hex color for rendering
    const intToHex = int => {
      return '#' + int.toString(16).padStart(6, '0');
    };

    return {
      /**
       * Emit particles of a type
       * @param {string} type - Particle type (ignored for rendering, color defines it)
       * @param {number} x - Spawn X
       * @param {number} y - Spawn Y
       * @param {Object} opts - Options (count, speed, life, color, size)
       */
      emit(type, x, y, opts = {}) {
        const count = opts.count || (type === 'EXPLOSION_LARGE' ? 16 : 8);
        const speed = opts.speed || 2;
        const life = opts.life || (type === 'ENGINE_TRAIL' ? 377 : 233);
        const colorHex = opts.color || '#ffffff';
        const size = opts.size || (type === 'EXPLOSION_LARGE' ? 4 : 2);

        const colorInt = hexToInt(colorHex);

        for (let i = 0; i < count; i++) {
          if (pool) {
            const idx = pool.acquire();
            if (idx === -1) break; // Pool full

            const offset = idx * pool.itemSize;
            const data = pool.data;
            const angle = (i / count) * Math.PI * 2;
            const vel = speed + Math.random() * speed * 0.5;

            data[offset + 0] = x + (Math.random() - 0.5) * 4; // x
            data[offset + 1] = y + (Math.random() - 0.5) * 4; // y
            data[offset + 2] = Math.cos(angle) * vel; // vx
            data[offset + 3] = Math.sin(angle) * vel; // vy
            data[offset + 4] = life; // life
            data[offset + 5] = life; // maxLife
            data[offset + 6] = size; // size
            data[offset + 7] = colorInt; // colorInt
          } else {
            // Legacy implementation
            if (legacyActiveCount >= capacity) break;
            const slot = legacyPool[legacyActiveCount];
            if (!slot.active) {
              const angle = (i / count) * Math.PI * 2;
              const vel = speed + Math.random() * speed * 0.5;
              slot.x = x + (Math.random() - 0.5) * 4;
              slot.y = y + (Math.random() - 0.5) * 4;
              slot.vx = Math.cos(angle) * vel;
              slot.vy = Math.sin(angle) * vel;
              slot.life = life;
              slot.maxLife = life;
              slot.size = size;
              slot.color = colorHex;
              slot.active = true;
              legacyActiveCount++;
            }
          }
        }
      },

      /**
       * Update all active particles
       * @param {number} dt - Delta time (normalized to 60fps equivalent)
       */
      update(dt) {
        if (pool) {
          for (let i = 0; i < pool.capacity; i++) {
            if (pool.active[i] === 1) {
              const offset = i * pool.itemSize;
              const data = pool.data;

              data[offset + 0] += data[offset + 2] * dt; // x += vx
              data[offset + 1] += data[offset + 3] * dt; // y += vy
              data[offset + 3] += 0.3 * dt; // vy += gravity
              data[offset + 4] -= dt; // life -= dt

              if (data[offset + 4] <= 0) {
                pool.release(i);
              }
            }
          }
        } else {
          // Legacy update
          for (let i = legacyActiveCount - 1; i >= 0; i--) {
            const p = legacyPool[i];
            if (!p.active) continue;

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 0.3 * dt;
            p.life -= dt;

            if (p.life <= 0) {
              p.active = false;
              [legacyPool[i], legacyPool[legacyActiveCount - 1]] = [
                legacyPool[legacyActiveCount - 1],
                legacyPool[i],
              ];
              legacyActiveCount--;
            }
          }
        }
      },

      /**
       * Draw all particles (Advanced Canvas Batch Rendering)
       */
      draw() {
        ctx.save();
        if (pool) {
          // 1. Group particles by color integer
          const colorGroups = new Map();

          pool.forEach((i, data, offset) => {
            const colorInt = data[offset + 7];
            if (!colorGroups.has(colorInt)) {
              colorGroups.set(colorInt, []);
            }
            colorGroups.get(colorInt).push(offset);
          });

          // 2. Batch render each color group
          colorGroups.forEach((offsets, colorInt) => {
            ctx.fillStyle = intToHex(colorInt);

            // For particle alpha, since they vary per particle but fillStyle is global,
            // we group paths by rough alpha bands to minimize state changes,
            // or for max speed (SpaceShooter stars) we just draw them all at alpha=1
            // For visual fidelity with explosions, we can group into 10 alpha bands (0.1, 0.2...)

            const alphaBands = new Map();
            offsets.forEach(offset => {
              const life = pool.data[offset + 4];
              const maxLife = pool.data[offset + 5];
              const rawAlpha = Math.max(0, life / maxLife);
              const band = Math.ceil(rawAlpha * 10) / 10; // e.g. 0.1, 0.2 ... 1.0

              if (band > 0) {
                if (!alphaBands.has(band)) alphaBands.set(band, []);
                alphaBands.get(band).push(offset);
              }
            });

            // Draw bands
            alphaBands.forEach((bandOffsets, bandAlpha) => {
              ctx.globalAlpha = bandAlpha;
              ctx.beginPath();

              bandOffsets.forEach(offset => {
                const x = pool.data[offset + 0];
                const y = pool.data[offset + 1];
                const size = pool.data[offset + 6];

                // Draw sub-path (move to avoid connecting lines between arcs)
                ctx.moveTo(x + size, y);
                ctx.arc(x, y, size, 0, Math.PI * 2);
              });

              // One single fill call for potentially hundreds of particles
              ctx.fill();
            });
          });
        } else {
          // Legacy draw
          for (let i = 0; i < legacyActiveCount; i++) {
            const p = legacyPool[i];
            if (!p.active) continue;
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      },

      /**
       * Clear all particles
       */
      clear() {
        if (pool) {
          pool.clear();
        } else {
          for (let i = 0; i < legacyActiveCount; i++) {
            legacyPool[i].active = false;
          }
          legacyActiveCount = 0;
        }
      },

      /**
       * Get active particle count
       * @returns {number}
       */
      getCount() {
        return pool ? pool.activeCount : legacyActiveCount;
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceParticles = SpaceParticles;
}
