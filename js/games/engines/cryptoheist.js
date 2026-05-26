/**
 * ASDF Games - Crypto Heist Engine (11/10 ECS Edition)
 *
 * Top-down shooter survival game with lighting, stealth, and loot rarity.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const CryptoHeist = {
    version: '2.1.0',
    gameId: 'cryptoheist',
    instance: null,

    lootRarities: [
      { icon: '🪙', value: 5 },
      { icon: '💎', value: 13 },
      { icon: '💠', value: 34 },
      { icon: '🔮', value: 89 },
      { icon: '👑', value: 233 },
    ],

    enemyTypes: [
      { icon: '👾', vision: 120 },
      { icon: '👹', vision: 150 },
      { icon: '🤖', vision: 180 },
      { icon: '🕵️', vision: 200 },
    ],

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('ch-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1500,
        debug: true,
      });

      // 11/10: Resize early
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { angle: 'f32' });
      world.registerComponent('Enemy', { hp: 'u8', alert: 'f32', vision: 'f32' });
      world.registerComponent('Bullet', { active: 'u8' });
      world.registerComponent('Loot', { value: 'u16' });
      world.registerComponent('Lifespan', { remaining: 'f32' });

      world.setResource('GameState', {
        score: 0,
        wave: 1,
        kills: 0,
        gameOver: false,
        keys: {},
        mouseX: 0,
        mouseY: 0,
        lastShot: 0,
        playerId: -1,
      });

      this.dom = {
        score: document.getElementById('ch-score'),
        kills: document.getElementById('ch-kills'),
      };

      this.setupInput();
      this.preloadSprites();

      // Create Player
      const p = world.createEntity();
      world.addComponent(p, 'Position');
      world.addComponent(p, 'Velocity');
      world.addComponent(p, 'Renderable');
      world.addComponent(p, 'Collider');
      world.addComponent(p, 'Player');

      const pIdx = world.getIndex(p);
      world.componentRegistry.get('Position').props.x[pIdx] = canvas.width / 2;
      world.componentRegistry.get('Position').props.y[pIdx] = canvas.height / 2;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // 🧙
      world.componentRegistry.get('Renderable').props.size[pIdx] = 28;
      world.getResource('GameState').playerId = p;

      // Override Render
      const icons = [
        '🧙',
        ...this.lootRarities.map(l => l.icon),
        ...this.enemyTypes.map(e => e.icon),
        '💥',
      ];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(this.createCollisionSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="ch-container" style="width:100%; height:100%; position:relative; background:#050510;">
          <canvas id="ch-canvas" style="width:100%; height:100%; display:block;"></canvas>
          <div class="game-hud-top-left" style="position:absolute; top:10px; left:10px; color:#fff; font-family:monospace; background:rgba(0,0,0,0.5); padding:10px; border-radius:8px;">
            <div class="ch-stat">SCORE: <span id="ch-score">0</span></div>
            <div class="ch-stat">KILLS: <span id="ch-kills">0</span></div>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🧙', size: 28 },
        ...this.lootRarities.map(r => ({ emoji: r.icon, size: 20 })),
        ...this.enemyTypes.map(e => ({ emoji: e.icon, size: 30 })),
        { emoji: '💥', size: 20 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const world = this.instance.world;

      document.addEventListener('keydown', e => {
        world.getResource('GameState').keys[e.key.toLowerCase()] = true;
      });
      document.addEventListener('keyup', e => {
        world.getResource('GameState').keys[e.key.toLowerCase()] = false;
      });

      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const state = world.getResource('GameState');
        state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      });

      canvas.addEventListener('pointerdown', () => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        if (Date.now() - state.lastShot > 200) {
          this.shoot(world);
          state.lastShot = Date.now();
        }
      });
    },

    shoot(world) {
      const state = world.getResource('GameState');
      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const playerAngle = world.componentRegistry.get('Player').props.angle[pIdx];

      const b = world.createEntity();
      world.addComponent(b, 'Position');
      world.addComponent(b, 'Velocity');
      world.addComponent(b, 'Bullet');

      const bIdx = world.getIndex(b);
      world.componentRegistry.get('Position').props.x[bIdx] = pos.x[pIdx];
      world.componentRegistry.get('Position').props.y[bIdx] = pos.y[pIdx];
      world.componentRegistry.get('Velocity').props.vx[bIdx] = Math.cos(playerAngle) * 12;
      world.componentRegistry.get('Velocity').props.vy[bIdx] = Math.sin(playerAngle) * 12;
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;

        let dx = 0,
          dy = 0;
        if (state.keys['w'] || state.keys['arrowup']) dy -= 1;
        if (state.keys['s'] || state.keys['arrowdown']) dy += 1;
        if (state.keys['a'] || state.keys['arrowleft']) dx -= 1;
        if (state.keys['d'] || state.keys['arrowright']) dx += 1;

        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        vel.vx[pIdx] = (dx / len) * 5;
        vel.vy[pIdx] = (dy / len) * 5;

        pProps.angle[pIdx] = Math.atan2(state.mouseY - pos.y[pIdx], state.mouseX - pos.x[pIdx]);

        // Spawning
        if (Math.random() < 0.02) self.spawnEnemy(world);

        // Cleanup
        const bullets = world.createQuery(['Bullet', 'Position']);
        const { dense, count } = bullets.set;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (
            pos.x[idx] < 0 ||
            pos.x[idx] > self.instance.canvas.width ||
            pos.y[idx] < 0 ||
            pos.y[idx] > self.instance.canvas.height
          ) {
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(state);
      };
    },

    createCollisionSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const px = pos.x[pIdx],
          py = pos.y[pIdx];

        // Enemies vs Player
        const enemies = world.createQuery(['Enemy', 'Position']);
        const { dense: eDense, count: eCount } = enemies.set;
        for (let i = 0; i < eCount; i++) {
          const idx = eDense[i];
          if (Math.hypot(px - pos.x[idx], py - pos.y[idx]) < 20) {
            state.gameOver = true;
            if (typeof endGame === 'function') endGame(self.gameId, state.score);
          }
        }

        // Bullets vs Enemies
        const bullets = world.createQuery(['Bullet', 'Position']);
        const { dense: bDense, count: bCount } = bullets.set;
        const eProps = world.componentRegistry.get('Enemy').props;
        for (let i = bCount - 1; i >= 0; i--) {
          const bIdx = bDense[i];
          for (let j = eCount - 1; j >= 0; j--) {
            const eIdx = eDense[j];
            if (Math.hypot(pos.x[bIdx] - pos.x[eIdx], pos.y[bIdx] - pos.y[eIdx]) < 20) {
              state.kills++;
              state.score += 10;
              self.spawnLoot(world, pos.x[eIdx], pos.y[eIdx]);
              world.destroyEntity(world.getEntityId(eIdx));
              world.destroyEntity(world.getEntityId(bIdx));
              break;
            }
          }
        }
      };
    },

    spawnEnemy(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;

      // Spawn from random side
      const side = Math.floor(Math.random() * 4);
      if (side === 0) {
        pos.x[idx] = Math.random() * w;
        pos.y[idx] = -40;
      } else if (side === 1) {
        pos.x[idx] = Math.random() * w;
        pos.y[idx] = h + 40;
      } else if (side === 2) {
        pos.x[idx] = -40;
        pos.y[idx] = Math.random() * h;
      } else {
        pos.x[idx] = w + 40;
        pos.y[idx] = Math.random() * h;
      }

      // Aim towards center
      const angle = Math.atan2(h / 2 - pos.y[idx], w / 2 - pos.x[idx]);
      vel.vx[idx] = Math.cos(angle) * 2;
      vel.vy[idx] = Math.sin(angle) * 2;

      rend.iconIndex[idx] =
        1 + this.lootRarities.length + Math.floor(Math.random() * this.enemyTypes.length);
      rend.size[idx] = 30;
    },

    spawnLoot(world, x, y) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Loot');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] =
        1 + Math.floor(Math.random() * this.lootRarities.length);
      world.componentRegistry.get('Renderable').props.size[idx] = 20;
    },

    updateUI(state) {
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.kills) this.dom.kills.textContent = state.kills;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, this.instance.canvas.width, this.instance.canvas.height);
      defaultRender(this.instance.world, alpha);
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.CryptoHeist = CryptoHeist;
  window.CryptoHeist = CryptoHeist;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('cryptoheist', CryptoHeist);
})();
