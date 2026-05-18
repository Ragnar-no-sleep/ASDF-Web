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

    enemySpecs: {
      SCOUT: { hp: 1, speed: 2.5, points: 1, width: 12, height: 20, iconIdx: 2 },
      FIGHTER: { hp: 3, speed: 1.8, points: 3, width: 16, height: 24, iconIdx: 3 },
      TANKER: { hp: 8, speed: 0.8, points: 5, width: 32, height: 24, iconIdx: 4 },
      BOMBER: { hp: 5, speed: 1.2, points: 8, width: 20, height: 20, iconIdx: 5 },
    },

    powerUpTypes: [
      { name: 'SHIELD', icon: '🛡️', type: 0 },
      { name: 'RAPID_FIRE', icon: '⚡', type: 1 },
      { name: 'SPREAD_SHOT', icon: '🌟', type: 2 },
      { name: 'NUKE', icon: '💣', type: 3 },
      { name: 'HEALTH_PACK', icon: '❤️', type: 4 },
    ],

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`) || this.createArena();
      const canvas = arena.querySelector('canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 2000,
        debug: true,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Space Components
      world.registerComponent('Player', {
        hp: 'u16',
        maxHp: 'u16',
        shield: 'u16',
        maxShield: 'u16',
        fireRate: 'u16',
        lastShot: 'f32',
        spread: 'u8',
        rapidTimer: 'f32',
        invincible: 'f32',
        nukes: 'u8',
      });
      world.registerComponent('Enemy', {
        type: 'u8',
        hp: 'u8',
        points: 'u8',
        timer: 'f32',
        shootInterval: 'u16',
      });
      world.registerComponent('Bullet', { damage: 'u8', owner: 'u8' }); // 0:Player, 1:Enemy
      world.registerComponent('PowerUp', { type: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32' });

      world.setResource('GameState', {
        score: 0,
        wave: 1,
        gameOver: false,
        spawnTimer: 0,
        waveTimer: 0,
        playerId: -1,
        keys: {},
      });

      this.setupInput();
      this.preloadSprites();

      // Create Player Ship
      const p = world.createEntity();
      world.addComponent(p, 'Position');
      world.addComponent(p, 'Velocity');
      world.addComponent(p, 'Renderable');
      world.addComponent(p, 'Collider');
      world.addComponent(p, 'Player');

      const pIdx = world.getIndex(p);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const coll = world.componentRegistry.get('Collider').props;
      const pl = world.componentRegistry.get('Player').props;

      pos.x[pIdx] = canvas.width / 2;
      pos.y[pIdx] = canvas.height - 60;
      rend.iconIndex[pIdx] = 0; // 🚀
      rend.size[pIdx] = 32;
      coll.width[pIdx] = 24;
      coll.height[pIdx] = 32;
      pl.hp[pIdx] = 100;
      pl.maxHp[pIdx] = 100;
      pl.fireRate[pIdx] = 233;

      world.getResource('GameState').playerId = p;

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(this.createCollisionSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx);
      this.instance.render = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena() {
      const div = document.createElement('div');
      div.id = `arena-${this.gameId}`;
      div.innerHTML = `<canvas class="game-canvas"></canvas>`;
      document.getElementById('game-container').appendChild(div);
      return div;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🚀', size: 32 },
        { emoji: '🔥', size: 10 },
        { emoji: '🛸', size: 24 },
        { emoji: '👾', size: 24 },
        { emoji: '🛰️', size: 32 },
        { emoji: '💥', size: 32 },
        ...this.powerUpTypes.map(p => ({ emoji: p.icon, size: 20 })),
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
        if (state.keys['arrowleft'] || state.keys['a']) vx = -6;
        else if (state.keys['arrowright'] || state.keys['d']) vx = 6;
        if (state.keys['arrowup'] || state.keys['w']) vy = -4;
        else if (state.keys['arrowdown'] || state.keys['s']) vy = 4;

        vel.vx[pIdx] = vx;
        vel.vy[pIdx] = vy;

        // Auto-fire
        pl.lastShot[pIdx] -= dt;
        if (pl.lastShot[pIdx] <= 0) {
          self.spawnBullet(world, pos.x[pIdx], pos.y[pIdx] - 16, 0);
          if (pl.spread[pIdx] >= 1) {
            self.spawnBullet(world, pos.x[pIdx] - 8, pos.y[pIdx] - 16, -1);
            self.spawnBullet(world, pos.x[pIdx] + 8, pos.y[pIdx] - 16, 1);
          }
          pl.lastShot[pIdx] = pl.fireRate[pIdx] / 16;
        }

        // Spawning Enemies
        state.spawnTimer += dt;
        if (state.spawnTimer > Math.max(30, 100 - state.wave * 10)) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        // Entities Update
        const canvasH = self.instance.canvas.height;
        const query = world.createQuery(['Position', 'Bullet']);
        const { dense, count } = query.set;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (pos.y[idx] < -20 || pos.y[idx] > canvasH + 20)
            world.destroyEntity(world.getEntityId(idx));
        }

        const eQuery = world.createQuery(['Position', 'Enemy']);
        const { dense: eDense, count: eCount } = eQuery.set;
        const eProps = world.componentRegistry.get('Enemy').props;
        const eVel = world.componentRegistry.get('Velocity').props;
        for (let i = eCount - 1; i >= 0; i--) {
          const idx = eDense[i];
          eProps.timer[idx] += dt;
          if (eProps.type[idx] === 0) eVel.vx[idx] = Math.sin(eProps.timer[idx] * 0.05) * 3;
          if (pos.y[idx] > canvasH + 50) world.destroyEntity(world.getEntityId(idx));
        }

        if (pl.hp[pIdx] <= 0) state.gameOver = true;
      };
    },

    createCollisionSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pPos = world.componentRegistry.get('Position').props;
        const pPl = world.componentRegistry.get('Player').props;
        const pColl = world.componentRegistry.get('Collider').props;

        const bullets = world.createQuery(['Position', 'Collider', 'Bullet']);
        const enemies = world.createQuery(['Position', 'Collider', 'Enemy']);
        const { dense: bDense, count: bCount } = bullets.set;
        const { dense: eDense, count: eCount } = enemies.set;

        const bPos = world.componentRegistry.get('Position').props;
        const bColl = world.componentRegistry.get('Collider').props;
        const bProps = world.componentRegistry.get('Bullet').props;
        const ePos = world.componentRegistry.get('Position').props;
        const eColl = world.componentRegistry.get('Collider').props;
        const eProps = world.componentRegistry.get('Enemy').props;

        // Bullets vs Enemies
        for (let i = bCount - 1; i >= 0; i--) {
          const bIdx = bDense[i];
          if (bProps.owner[bIdx] !== 0) continue; // Only player bullets

          for (let j = eCount - 1; j >= 0; j--) {
            const eIdx = eDense[j];
            if (Math.hypot(bPos.x[bIdx] - ePos.x[eIdx], bPos.y[bIdx] - ePos.y[eIdx]) < 25) {
              eProps.hp[eIdx]--;
              world.destroyEntity(world.getEntityId(bIdx));
              if (eProps.hp[eIdx] <= 0) {
                state.score += eProps.points[eIdx];
                self.addExplosion(world, ePos.x[eIdx], ePos.y[eIdx]);
                world.destroyEntity(world.getEntityId(eIdx));
              }
              break;
            }
          }
        }

        // Enemy Bullets vs Player
        for (let i = bCount - 1; i >= 0; i--) {
          const bIdx = bDense[i];
          if (bProps.owner[bIdx] !== 1) continue;
          if (Math.hypot(bPos.x[bIdx] - pPos.x[pIdx], bPos.y[bIdx] - pPos.y[pIdx]) < 20) {
            pPl.hp[pIdx] -= 10;
            world.destroyEntity(world.getEntityId(bIdx));
          }
        }
      };
    },

    spawnBullet(world, x, y, vx) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Collider');
      world.addComponent(e, 'Bullet');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Velocity').props.vx[idx] = vx;
      world.componentRegistry.get('Velocity').props.vy[idx] = -10;
      world.componentRegistry.get('Bullet').props.owner[idx] = 0;
    },

    spawnEnemy(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');
      const idx = world.getIndex(e);
      const w = this.instance.canvas.width;
      world.componentRegistry.get('Position').props.x[idx] = Math.random() * w;
      world.componentRegistry.get('Position').props.y[idx] = -30;
      world.componentRegistry.get('Velocity').props.vy[idx] = 2;
      world.componentRegistry.get('Enemy').props.type[idx] = 0;
      world.componentRegistry.get('Enemy').props.hp[idx] = 1;
      world.componentRegistry.get('Enemy').props.points[idx] = 1;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 2; // 🛸
      world.componentRegistry.get('Renderable').props.size[idx] = 24;
    },

    addExplosion(world, x, y) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Lifespan');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 5; // 💥
      world.componentRegistry.get('Renderable').props.size[idx] = 32;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 20;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;

      // Starfield
      ctx.fillStyle = '#000005';
      ctx.fillRect(0, 0, w, h);

      // Simple ECS Render
      const query = this.instance.world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;
      const rend = this.instance.world.componentRegistry.get('Renderable').props;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const icon = rend.iconIndex[idx] === 0 ? '🚀' : rend.iconIndex[idx] === 5 ? '💥' : '🛸';
        SpriteCache.draw(ctx, icon, pos.x[idx], pos.y[idx], rend.size[idx]);
      }

      // HUD
      const state = this.instance.world.getResource('GameState');
      ctx.fillStyle = '#fff';
      ctx.fillText(`SCORE: ${state.score}`, 10, 20);
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
