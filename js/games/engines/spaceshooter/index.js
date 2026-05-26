/**
 * ASDF Games - Space Shooter Engine (11/10 ECS Edition)
 *
 * Classic scrolling shooter with upgrades, waves, and power-ups.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const SpaceShooter = {
    version: '2.1.0',
    gameId: 'spaceshooter',
    instance: null,

    enemySpecs: [
      { icon: '🛸', hp: 1, speed: 2, points: 10, size: 24 },
      { icon: '👾', hp: 2, speed: 1.5, points: 20, size: 30 },
      { icon: '🛰️', hp: 3, speed: 1, points: 50, size: 32 },
    ],

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      arena.innerHTML = `<div style="width:100%; height:100%; position:relative; background:#000005;">
        <canvas id="ss-canvas" style="width:100%; height:100%; display:block;"></canvas>
        <div id="ss-hud" style="position:absolute; top:10px; left:10px; color:#fff; font-family:monospace; background:rgba(0,0,0,0.5); padding:8px; border-radius:4px; border:1px solid #333;">
            SCORE: <span id="ss-score">0</span> | WAVE: <span id="ss-wave">1</span>
        </div>
      </div>`;
      const canvas = document.getElementById('ss-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 2000,
        debug: true,
      });

      // 11/10: Resize early
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { lastShot: 'f32', fireRate: 'f32' });
      world.registerComponent('Enemy', { type: 'u8', hp: 'u8', points: 'u8' });
      world.registerComponent('Bullet', { owner: 'u8' }); // 0:Player, 1:Enemy
      world.registerComponent('Lifespan', { remaining: 'f32' });

      world.setResource('GameState', {
        score: 0,
        wave: 1,
        gameOver: false,
        playerId: -1,
        keys: {},
        spawnTimer: 0,
      });

      this.setupInput();
      this.preloadSprites();

      // Create Player
      const p = world.createEntity();
      world.addComponent(p, 'Position');
      world.addComponent(p, 'Velocity');
      world.addComponent(p, 'Renderable');
      world.addComponent(p, 'Collider');
      world.addComponent(p, 'Player');

      const idx = world.getIndex(p);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const pl = world.componentRegistry.get('Player').props;

      pos.x[idx] = canvas.width / 2;
      pos.y[idx] = canvas.height - 60;
      rend.iconIndex[idx] = 0; // 🚀
      rend.size[idx] = 32;
      pl.fireRate[idx] = 15; // frames
      pl.lastShot[idx] = 0;

      world.getResource('GameState').playerId = p;

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      // Override Render
      const icons = ['🚀', '🔥', '🛸', '👾', '🛰️', '💥'];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => {
        this.instance.ctx.fillStyle = '#000005';
        this.instance.ctx.fillRect(0, 0, canvas.width, canvas.height);
        defaultRender(world, alpha);
      };

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🚀', size: 32 },
        { emoji: '🔥', size: 10 },
        { emoji: '🛸', size: 24 },
        { emoji: '👾', size: 24 },
        { emoji: '🛰️', size: 32 },
        { emoji: '💥', size: 32 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const world = this.instance.world;
      const state = world.getResource('GameState');
      document.addEventListener('keydown', e => {
        state.keys[e.key.toLowerCase()] = true;
      });
      document.addEventListener('keyup', e => {
        state.keys[e.key.toLowerCase()] = false;
      });
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const pl = world.componentRegistry.get('Player').props;

        // Player Movement
        let vx = 0,
          vy = 0;
        if (state.keys['arrowleft'] || state.keys['a']) vx = -7;
        else if (state.keys['arrowright'] || state.keys['d']) vx = 7;
        if (state.keys['arrowup'] || state.keys['w']) vy = -5;
        else if (state.keys['arrowdown'] || state.keys['s']) vy = 5;

        vel.vx[pIdx] = vx;
        vel.vy[pIdx] = vy;

        // Bounds
        pos.x[pIdx] = Math.max(20, Math.min(self.instance.canvas.width - 20, pos.x[pIdx]));
        pos.y[pIdx] = Math.max(20, Math.min(self.instance.canvas.height - 20, pos.y[pIdx]));

        // Shooting
        pl.lastShot[pIdx] -= dt;
        if ((state.keys[' '] || state.keys['control']) && pl.lastShot[pIdx] <= 0) {
          self.spawnBullet(world, pos.x[pIdx], pos.y[pIdx] - 20);
          pl.lastShot[pIdx] = pl.fireRate[pIdx];
          if (typeof ASDF !== 'undefined' && ASDF.soundSystem) ASDF.soundSystem.play('click');
        }

        // Spawning
        state.spawnTimer += dt;
        if (state.spawnTimer > Math.max(20, 80 - state.wave * 5)) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        // Collisions
        const bullets = world.createQuery(['Bullet', 'Position']);
        const enemies = world.createQuery(['Enemy', 'Position']);
        const bPos = world.componentRegistry.get('Position').props;
        const ePos = world.componentRegistry.get('Position').props;
        const eProps = world.componentRegistry.get('Enemy').props;

        const { dense: bDense, count: bCount } = bullets.set;
        const { dense: eDense, count: eCount } = enemies.set;

        for (let i = bCount - 1; i >= 0; i--) {
          const bIdx = bDense[i];
          for (let j = eCount - 1; j >= 0; j--) {
            const eIdx = eDense[j];
            if (Math.hypot(bPos.x[bIdx] - ePos.x[eIdx], bPos.y[bIdx] - ePos.y[eIdx]) < 25) {
              state.score += eProps.points[eIdx];
              self.addEffect(world, ePos.x[eIdx], ePos.y[eIdx], 5); // 💥
              world.destroyEntity(world.getEntityId(eIdx));
              world.destroyEntity(world.getEntityId(bIdx));
              if (typeof ASDF !== 'undefined' && ASDF.soundSystem) ASDF.soundSystem.play('collect');
              break;
            }
          }
        }

        // Cleanup Lifespans
        const lsQuery = world.createQuery(['Lifespan']);
        const { dense: lDense, count: lCount } = lsQuery.set;
        const lsProps = world.componentRegistry.get('Lifespan').props;
        for (let i = lCount - 1; i >= 0; i--) {
          const idx = lDense[i];
          lsProps.remaining[idx] -= dt;
          if (lsProps.remaining[idx] <= 0) world.destroyEntity(world.getEntityId(idx));
        }

        const scoreEl = document.getElementById('ss-score');
        if (scoreEl) scoreEl.textContent = state.score;
      };
    },

    spawnBullet(world, x, y) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Bullet');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Velocity').props.vy[idx] = -12;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 1; // 🔥
      world.componentRegistry.get('Renderable').props.size[idx] = 15;
    },

    spawnEnemy(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');
      const idx = world.getIndex(e);
      const state = world.getResource('GameState');
      const typeIdx = Math.floor(Math.random() * Math.min(state.wave, this.enemyTypes.length));
      const type = this.enemySpecs[typeIdx] || this.enemySpecs[0];

      world.componentRegistry.get('Position').props.x[idx] =
        30 + Math.random() * (this.instance.canvas.width - 60);
      world.componentRegistry.get('Position').props.y[idx] = -40;
      world.componentRegistry.get('Velocity').props.vy[idx] = type.speed;
      world.componentRegistry.get('Enemy').props.points[idx] = type.points;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 2 + typeIdx;
      world.componentRegistry.get('Renderable').props.size[idx] = type.size;
    },

    addEffect(world, x, y, iconIdx) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Lifespan');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = iconIdx;
      world.componentRegistry.get('Renderable').props.size[idx] = 40;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 20;
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
