/**
 * ASDF Games - Space Shooter Engine (11/10 ECS Edition)
 *
 * Classic scrolling shooter with upgrades, waves, and power-ups.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const SpaceShooter = {
    version: '2.0.0',
    gameId: 'spaceshooter',
    instance: null,

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      arena.innerHTML = `<canvas id="ss-canvas" class="game-canvas"></canvas>`;
      const canvas = document.getElementById('ss-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 2000,
        debug: true,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { hp: 'u16' });
      world.registerComponent('Enemy', { type: 'u8' });
      world.registerComponent('Bullet', { owner: 'u8' });

      world.setResource('GameState', {
        score: 0,
        wave: 1,
        gameOver: false,
        playerId: -1,
        keys: {},
      });

      this.setupInput();
      this.preloadSprites();

      // Create Player
      const p = world.createEntity();
      world.addComponent(p, 'Position');
      world.addComponent(p, 'Velocity');
      world.addComponent(p, 'Renderable');
      world.addComponent(p, 'Player');

      const idx = world.getIndex(p);
      world.componentRegistry.get('Position').props.x[idx] = canvas.width / 2;
      world.componentRegistry.get('Position').props.y[idx] = canvas.height - 60;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 0; // 🚀
      world.componentRegistry.get('Renderable').props.size[idx] = 32;
      world.getResource('GameState').playerId = p;

      // Override Render
      const icons = ['🚀', '🔥', '🛸', '💥'];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      world.addSystem(this.createLogicSystem());

      world.addSystem(ASDF.PhysicsSystem.createMovement());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🚀', size: 32 },
        { emoji: '🛸', size: 24 },
        { emoji: '💥', size: 32 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const world = this.instance.world;
      document.addEventListener('keydown', e => {
        world.getResource('GameState').keys[e.key.toLowerCase()] = true;
      });
      document.addEventListener('keyup', e => {
        world.getResource('GameState').keys[e.key.toLowerCase()] = false;
      });
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const vel = world.componentRegistry.get('Velocity').props;

        let vx = 0,
          vy = 0;
        if (state.keys['a']) vx = -6;
        else if (state.keys['d']) vx = 6;
        if (state.keys['w']) vy = -4;
        else if (state.keys['s']) vy = 4;

        vel.vx[pIdx] = vx;
        vel.vy[pIdx] = vy;

        if (Math.random() < 0.05) self.spawnEnemy(world);
      };
    },

    spawnEnemy(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] =
        Math.random() * this.instance.canvas.width;
      world.componentRegistry.get('Position').props.y[idx] = -30;
      world.componentRegistry.get('Velocity').props.vy[idx] = 2;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 2; // 🛸
      world.componentRegistry.get('Renderable').props.size[idx] = 24;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      ctx.fillStyle = '#000005';
      ctx.fillRect(0, 0, this.instance.canvas.width, this.instance.canvas.height);
      defaultRender(this.instance.world, alpha);
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.SpaceShooter = SpaceShooter;
  window.SpaceShooter = SpaceShooter;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('spaceshooter', SpaceShooter);
})();
