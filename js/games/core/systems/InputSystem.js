/**
 * ASDF Games - 11/10 Input System
 * Decoupled input tracking via World Resources.
 */

'use strict';

(function () {
  const InputSystem = {
    /**
     * Create and initialize the Input Resource and System
     * @param {World} world - The ECS World to attach the resource to
     * @param {Element} target - The element to listen on
     */
    init(world, target = window) {
      const keys = {};

      target.addEventListener('keydown', e => {
        keys[e.code] = true;
      });

      target.addEventListener('keyup', e => {
        keys[e.code] = false;
      });

      // Register as a resource for 11/10 modularity
      world.setResource('Input', { keys });

      return function (world, dt) {
        const input = world.getResource('Input');
        if (!input) return;

        const { keys } = input;
        const query = world.createQuery(['Velocity', 'Controllable']);
        const velProps = world.componentRegistry.get('Velocity').props;
        const ctrlProps = world.componentRegistry.get('Controllable').props;

        const { dense, count } = query.set;
        for (let i = 0; i < count; i++) {
          const index = dense[i];
          const speed = ctrlProps.speed[index] || 2;

          let vx = 0;
          let vy = 0;

          if (keys['ArrowUp'] || keys['KeyW']) vy -= speed;
          if (keys['ArrowDown'] || keys['KeyS']) vy += speed;
          if (keys['ArrowLeft'] || keys['KeyA']) vx -= speed;
          if (keys['ArrowRight'] || keys['KeyD']) vx += speed;

          velProps.vx[index] = vx;
          velProps.vy[index] = vy;
        }
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.InputSystem = InputSystem;
  }
})();
