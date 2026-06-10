/**
 * ASDF Games - ECS Demo (The 11/10 Engine Proof of Concept)
 * Demonstrates high-performance ECS with thousands of entities.
 */

'use strict';

(function () {
  const ECSDemo = {
    gameId: 'ecsdemo',
    instance: null,

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      arena.innerHTML = `<canvas id="ecs-canvas" class="game-canvas"></canvas>`;
      const canvas = document.getElementById('ecs-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 15000,
        debug: false,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Register Personality Components
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      // Systems
      world.addSystem(ASDF.InputSystem.init(world));
      world.addSystem(ASDF.PersonalitySystem.create());
      world.addSystem(ASDF.PhysicsSystem.createMovement());
      world.addSystem(ASDF.PhysicsSystem.createCollision());

      // Icons: 0:Dog, 1:Fire, 2:Skull
      const icons = ['🐕', '🔥', '💀'];
      const renderSystem = ASDF.RenderSystem.create(this.instance.ctx, icons);

      // Create Player
      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Controllable');
      world.addComponent(player, 'Collider');
      world.addComponent(player, 'Rotation');
      world.addComponent(player, 'Scale');

      const pIdx = world.getIndex(player);
      world.componentRegistry.get('Position').props.x[pIdx] = canvas.width / 2;
      world.componentRegistry.get('Position').props.y[pIdx] = canvas.height / 2;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0;
      world.componentRegistry.get('Renderable').props.size[pIdx] = 40;
      world.componentRegistry.get('Collider').props.width[pIdx] = 40;
      world.componentRegistry.get('Collider').props.height[pIdx] = 40;
      world.componentRegistry.get('Controllable').props.speed[pIdx] = 5;

      // Spawn 5000 fires
      for (let i = 0; i < 5000; i++) {
        const fire = world.createEntity();
        world.addComponent(fire, 'Position');
        world.addComponent(fire, 'Velocity');
        world.addComponent(fire, 'Renderable');
        world.addComponent(fire, 'Collider');
        world.addComponent(fire, 'Rotation');
        world.addComponent(fire, 'Scale');

        const idx = world.getIndex(fire);
        world.componentRegistry.get('Position').props.x[idx] = Math.random() * canvas.width;
        world.componentRegistry.get('Position').props.y[idx] = Math.random() * canvas.height;
        world.componentRegistry.get('Velocity').props.vx[idx] = (Math.random() - 0.5) * 4;
        world.componentRegistry.get('Velocity').props.vy[idx] = (Math.random() - 0.5) * 4;
        world.componentRegistry.get('Renderable').props.iconIndex[idx] = 1;
        world.componentRegistry.get('Renderable').props.size[idx] = 15;
        world.componentRegistry.get('Collider').props.width[idx] = 15;
        world.componentRegistry.get('Collider').props.height[idx] = 15;
      }

      this.instance.onRender = alpha => {
        const ctx = this.instance.ctx;
        const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
        if (visuals) {
          visuals.drawBackdrop(ctx, canvas.width, canvas.height, {
            theme: 'default',
            allowNoise: false,
          });
        } else {
          ctx.fillStyle = '#12071f';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Collision visual feedback
        const colliders = world.createQuery(['Collider', 'Renderable']);
        const { dense, count } = colliders.set;
        const cProps = world.componentRegistry.get('Collider').props;
        const rProps = world.componentRegistry.get('Renderable').props;
        for (let i = 0; i < count; i++) {
          const idx = dense[i];
          const id = world.getEntityId(idx);
          if (cProps.active[idx] === 1) {
            rProps.iconIndex[idx] = 2; // Skull
          } else {
            rProps.iconIndex[idx] = id === player ? 0 : 1;
          }
        }

        renderSystem(world, alpha);
      };

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.ECSDemo = ECSDemo;
    if (typeof GameRegistry !== 'undefined') GameRegistry.register('ecsdemos', ECSDemo);
  }
})();
