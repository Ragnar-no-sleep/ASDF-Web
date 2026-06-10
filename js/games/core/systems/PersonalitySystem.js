/**
 * ASDF Games - Personality System
 * Procedural animation and "Game Feel" behaviors.
 * Makes entities feel alive without complex math.
 */

'use strict';

(function () {
  const PersonalitySystem = {
    create() {
      return function (world, dt) {
        const query = world.createQuery(['Position', 'Renderable']);

        // Ensure required components are registered
        const rotComp = world.registerComponent('Rotation', { angle: 'f32' });
        const scaleComp = world.registerComponent('Scale', { x: 'f32', y: 'f32' });

        const velComp = world.componentRegistry.get('Velocity');

        const posProps = world.componentRegistry.get('Position').props;
        const velProps = velComp ? velComp.props : null;
        const rotProps = rotComp.props;
        const scaleProps = scaleComp.props;

        const time = performance.now() / 1000;

        query.forEach(entityId => {
          const index = entityId & 0xffffff;

          // 1. Idle Breath (Subtle scale pulsing)
          const breath = 1 + Math.sin(time * 3 + index) * 0.03;
          scaleProps.x[index] = breath;
          scaleProps.y[index] = breath;

          // 2. Velocity-based behavior
          if (velProps) {
            const vx = velProps.vx[index];
            const vy = velProps.vy[index];

            // Tilting when moving horizontally
            rotProps.angle[index] = vx * 0.015;

            // Squash and Stretch based on vertical velocity
            if (Math.abs(vy) > 0.5) {
              const stretch = Math.min(0.3, Math.abs(vy) * 0.02);
              scaleProps.y[index] = breath + stretch;
              scaleProps.x[index] = breath - stretch;
            }
          }

          // 3. Entity-specific "Personality" traits based on ID
          // (Some entities jitter slightly, others are steady)
          if (entityId % 7 === 0) {
            const jitter = (Math.random() - 0.5) * 0.02;
            rotProps.angle[index] += jitter;
          }
        });
      };
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.PersonalitySystem = PersonalitySystem;
  }
})();
