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
   * Create particle pool
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @returns {Object} Particle manager
   */
  create(ctx) {
    const poolSize = 512;
    const pool = [];

    // Pre-allocate pool
    for (let i = 0; i < poolSize; i++) {
      pool.push({
        type: null,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0,
        size: 0,
        color: '#fff',
        active: false,
      });
    }

    let activeCount = 0;

    return {
      /**
       * Emit particles of a type
       * @param {string} type - Particle type
       * @param {number} x - Spawn X
       * @param {number} y - Spawn Y
       * @param {Object} opts - Options (count, speed, life, color, size)
       */
      emit(type, x, y, opts = {}) {
        const count = opts.count || (type === 'EXPLOSION_LARGE' ? 16 : 8);
        const speed = opts.speed || 2;
        const life = opts.life || (type === 'ENGINE_TRAIL' ? 377 : 233);
        const color = opts.color || '#fff';
        const size = opts.size || (type === 'EXPLOSION_LARGE' ? 4 : 2);

        for (let i = 0; i < count; i++) {
          if (activeCount >= poolSize) break;

          const slot = pool[activeCount];
          if (!slot.active) {
            const angle = (i / count) * Math.PI * 2;
            const vel = speed + Math.random() * speed * 0.5;

            slot.type = type;
            slot.x = x + (Math.random() - 0.5) * 4;
            slot.y = y + (Math.random() - 0.5) * 4;
            slot.vx = Math.cos(angle) * vel;
            slot.vy = Math.sin(angle) * vel;
            slot.life = life;
            slot.maxLife = life;
            slot.size = size;
            slot.color = color;
            slot.active = true;

            activeCount++;
          }
        }
      },

      /**
       * Update all active particles
       * @param {number} dt - Delta time
       */
      update(dt) {
        for (let i = activeCount - 1; i >= 0; i--) {
          const p = pool[i];
          if (!p.active) continue;

          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 0.3 * dt; // Light gravity
          p.life -= dt;

          if (p.life <= 0) {
            p.active = false;
            // Swap with last active
            [pool[i], pool[activeCount - 1]] = [pool[activeCount - 1], pool[i]];
            activeCount--;
          }
        }
      },

      /**
       * Draw all particles
       */
      draw() {
        ctx.save();
        for (let i = 0; i < activeCount; i++) {
          const p = pool[i];
          if (!p.active) continue;

          const alpha = p.life / p.maxLife;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      },

      /**
       * Clear all particles
       */
      clear() {
        for (let i = 0; i < activeCount; i++) {
          pool[i].active = false;
        }
        activeCount = 0;
      },

      /**
       * Get active particle count
       * @returns {number}
       */
      getCount() {
        return activeCount;
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceParticles = SpaceParticles;
}
