/**
 * ASDF Games - Stake Stacker Engine (11/10 ECS Edition)
 *
 * Block stacking puzzle game.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const StakeStacker = {
    version: '2.1.0',
    gameId: 'stakestacker',
    instance: null,

    start(gameId) {
      const arena = document.getElementById(`ss-arena`);
      if (!arena) return;

      const canvas = arena.querySelector('canvas') || document.createElement('canvas');
      if (!canvas.parentElement) arena.appendChild(canvas);

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Block', { w: 'u8', h: 'u8', state: 'u8', precision: 'u8' }); // 0:Falling, 1:Stacked
      world.registerComponent('Particle', { life: 'f32', color: 'u32' });

      world.setResource('GameState', {
        score: 0,
        level: 1,
        perfectStreak: 0,
        gameOver: false,
        stack: [],
        currentBlockId: -1,
        cameraY: 0,
        wind: 0,
      });

      this.setupInput();
      this.preloadSprites();

      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      // Override Render
      const icons = ['🧱', '✨'];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🧱', size: 32 },
        { emoji: '✨', size: 10 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const world = this.instance.world;
      const drop = () => {
        const state = world.getResource('GameState');
        if (state.gameOver || state.currentBlockId === -1) return;
        const idx = world.getIndex(state.currentBlockId);
        world.componentRegistry.get('Velocity').props.vy[idx] = 10; // Drop speed
      };

      document.addEventListener('keydown', e => {
        if (e.code === 'Space') drop();
      });
      this.instance.canvas.addEventListener('pointerdown', drop);
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        // Spawn first/next block
        if (state.currentBlockId === -1) {
          self.spawnBlock(world);
        }

        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const blocks = world.componentRegistry.get('Block').props;
        const canvasH = self.instance.canvas.height;

        // Collision & Stack logic
        const cIdx = world.getIndex(state.currentBlockId);
        const cy = pos.y[cIdx],
          cx = pos.x[cIdx];
        const targetY = canvasH - 32 - state.stack.length * 32;

        if (cy >= targetY) {
          pos.y[cIdx] = targetY;
          vel.vy[cIdx] = 0;
          vel.vx[cIdx] = 0;
          blocks.state[cIdx] = 1; // Stacked
          state.stack.push(state.currentBlockId);
          state.currentBlockId = -1;
          state.score += 10;

          if (state.stack.length % 5 === 0) state.level++;
        }

        if (cy > canvasH) state.gameOver = true;
      };
    },

    spawnBlock(world) {
      const state = world.getResource('GameState');
      const b = world.createEntity();
      world.addComponent(b, 'Position');
      world.addComponent(b, 'Velocity');
      world.addComponent(b, 'Renderable');
      world.addComponent(b, 'Block');

      const idx = world.getIndex(b);
      const w = this.instance.canvas.width;
      world.componentRegistry.get('Position').props.x[idx] = w / 2 - 16;
      world.componentRegistry.get('Position').props.y[idx] = 0;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 0; // 🧱
      world.componentRegistry.get('Renderable').props.size[idx] = 32;
      world.componentRegistry.get('Block').props.state[idx] = 0;

      state.currentBlockId = b;
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);

      const query = this.instance.world.createQuery(['Position', 'Block']);
      const { dense, count } = query.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        SpriteCache.draw(ctx, '🧱', pos.x[idx], pos.y[idx], 32);
      }

      ctx.fillStyle = '#fff';
      ctx.fillText(`SCORE: ${state.score} | LEVEL: ${state.level}`, 10, 20);
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.StakeStacker = StakeStacker;
  window.StakeStacker = StakeStacker;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('stakestacker', StakeStacker);
})();
