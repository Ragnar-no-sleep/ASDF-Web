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

      const canvas = document.createElement('canvas');
      canvas.width = arena.clientWidth || 800;
      canvas.height = arena.clientHeight || 600;
      arena.innerHTML = '';
      arena.appendChild(canvas);

      // Create Game Instance (11/10 Standard)
      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 15000, // Overhead for peak stress
        debug: true,
      });
      const world = this.instance.world;
      const ctx = this.instance.ctx;

      // Register Systems (11/10 modular init)
      world.addSystem(ASDF.InputSystem.init(world));
      world.addSystem(ASDF.PhysicsSystem.createMovement());
      world.addSystem(ASDF.PhysicsSystem.createCollision());
      const render = ASDF.RenderSystem.create(ctx);

      // We must init standard components before manual entity creation
      this.instance.initStandardComponents();

      // Create Player
      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Controllable');
      world.addComponent(player, 'Collider');

      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const coll = world.componentRegistry.get('Collider').props;
      const ctrl = world.componentRegistry.get('Controllable').props;

      const playerIdx = world.getIndex(player);
      pos.x[playerIdx] = canvas.width / 2;
      pos.y[playerIdx] = canvas.height / 2;
      rend.iconIndex[playerIdx] = 0; // Dog
      rend.size[playerIdx] = 40;
      coll.width[playerIdx] = 40;
      coll.height[playerIdx] = 40;
      ctrl.speed[playerIdx] = 5;

      // Spawn 10,000 random fires (STRESS TEST 11/10)
      const vel = world.componentRegistry.get('Velocity').props;
      for (let i = 0; i < 10000; i++) {
        const fire = world.createEntity();
        const fireIdx = world.getIndex(fire);
        world.addComponent(fire, 'Position');
        world.addComponent(fire, 'Velocity');
        world.addComponent(fire, 'Renderable');
        world.addComponent(fire, 'Collider');

        pos.x[fireIdx] = Math.random() * canvas.width;
        pos.y[fireIdx] = Math.random() * canvas.height;
        vel.vx[fireIdx] = (Math.random() - 0.5) * 4;
        vel.vy[fireIdx] = (Math.random() - 0.5) * 4;

        rend.iconIndex[fireIdx] = 1; // Fire
        rend.size[fireIdx] = 15;
        coll.width[fireIdx] = 15;
        coll.height[fireIdx] = 15;
      }

      // Override instance render for collision feedback
      this.instance.render = alpha => {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Feedback System: Update colors based on collision
        const colliders = world.createQuery(['Collider', 'Renderable']);
        const collProps = world.componentRegistry.get('Collider').props;
        const rendProps = world.componentRegistry.get('Renderable').props;

        const { dense, count } = colliders.set;
        for (let i = 0; i < count; i++) {
          const index = dense[i];
          const id = world.getEntityId(index);
          if (collProps.active[index] === 1) {
            rendProps.iconIndex[index] = 2; // Skull on collision
          } else {
            rendProps.iconIndex[index] = id === player ? 0 : 1;
          }
        }

        render(world, alpha);
      };

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    stop() {
      if (this.instance) {
        this.instance.stop();
      }
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.ECSDemo = ECSDemo;
    if (typeof GameRegistry !== 'undefined') {
      GameRegistry.register('ecsdemos', ECSDemo);
    }
  }
})();
