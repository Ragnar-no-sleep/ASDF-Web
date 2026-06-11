/**
 * ASDF Games - 11/10 Particle System
 * High-performance, zero-allocation particle engine for visual juice.
 * Integrated with ECS for peak fluidity.
 */

'use strict';

(function () {
  const ParticleSystem = {
    /**
     * Initialize Particle Components in the world
     * @param {ECS.World} world
     */
    init(world) {
      if (!world.componentRegistry.has('Particle')) {
        world.registerComponent('Particle', {
          life: 'f32',
          maxLife: 'f32',
          size: 'u8',
          colorIndex: 'u8', // Mapping to a color palette
          gravity: 'f32',
          friction: 'f32',
        });
      }
    },

    /**
     * Create a burst of particles
     * @param {ECS.World} world
     * @param {number} x, y - Position
     * @param {Object} options - { count, colorIdx, size, speed, gravity }
     */
    emit(world, x, y, options = {}) {
      const count = options.count || 10;
      const posProps = world.componentRegistry.get('Position').props;
      const velProps = world.componentRegistry.get('Velocity').props;
      const partProps = world.componentRegistry.get('Particle').props;
      const rendProps = world.componentRegistry.get('Renderable').props;

      for (let i = 0; i < count; i++) {
        const entity = world.createEntity();
        world.addComponent(entity, 'Position');
        world.addComponent(entity, 'Velocity');
        world.addComponent(entity, 'Particle');
        world.addComponent(entity, 'Renderable');

        const idx = world.getIndex(entity);
        posProps.x[idx] = x;
        posProps.y[idx] = y;

        const angle = Math.random() * Math.PI * 2;
        const speed = (options.speed || 2) * (0.5 + Math.random());
        velProps.vx[idx] = Math.cos(angle) * speed;
        velProps.vy[idx] = Math.sin(angle) * speed;

        partProps.life[idx] = options.life || 30 + Math.random() * 30;
        partProps.maxLife[idx] = partProps.life[idx];
        partProps.size[idx] = options.size || 4;
        partProps.colorIndex[idx] = options.colorIdx || 0;
        partProps.gravity[idx] = options.gravity || 0.05;
        partProps.friction[idx] = options.friction || 0.98;

        rendProps.iconIndex[idx] = 255; // Special marker for primitive particle rendering
        rendProps.size[idx] = partProps.size[idx];
        rendProps.alpha[idx] = 1.0;
      }
    },

    /**
     * The Particle Update System
     */
    update() {
      return function (world, dt) {
        const query = world.createQuery(['Position', 'Velocity', 'Particle', 'Renderable']);
        const posProps = world.componentRegistry.get('Position').props;
        const velProps = world.componentRegistry.get('Velocity').props;
        const partProps = world.componentRegistry.get('Particle').props;
        const rendProps = world.componentRegistry.get('Renderable').props;

        const { dense, count } = query.set;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];

          // 1. Physics
          velProps.vy[idx] += partProps.gravity[idx] * dt;
          velProps.vx[idx] *= Math.pow(partProps.friction[idx], dt);
          velProps.vy[idx] *= Math.pow(partProps.friction[idx], dt);

          // 2. Life
          partProps.life[idx] -= dt;
          if (partProps.life[idx] <= 0) {
            world.destroyEntity(world.getEntityId(idx));
            continue;
          }

          // 3. Visual Update (Alpha fade & size shrink)
          const lifeAlpha = partProps.life[idx] / partProps.maxLife[idx];
          rendProps.alpha[idx] = lifeAlpha;
          // Scale size down slightly as they die
          rendProps.size[idx] = Math.max(1, partProps.size[idx] * lifeAlpha);
        }
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.ParticleSystem = ParticleSystem;
  }
})();
