/**
 * ASDF Games - DexDash Engine (11/10 ECS Edition)
 *
 * Optimized racing game with horizontal scrolling
 * Visual realism: Side-view car driving on a flat road
 * Migrated to ECS for peak zero-allocation performance
 */

'use strict';

(function () {
  const DexDash = {
    version: '2.0.0',
    gameId: 'dexdash',
    roadHeight: 250,
    instance: null,

    dexLogos: ['🦄', '🦞', '🍣', '☀️', '🌊', '💎'],
    obstacleTypes: [
      { icon: '🚧', slowdown: 2 },
      { icon: '⛔', slowdown: 3 },
      { icon: '🐌', slowdown: 1.5 },
    ],

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.gameId = gameId;
      this.createArena(arena);
      this.canvas = document.getElementById('dd-canvas');

      this.instance = new ASDF.GameInstance(this.canvas, {
        maxEntities: 500,
        debug: true,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { speed: 'f32' });
      world.registerComponent('Obstacle', { slowdown: 'f32', speedVar: 'f32' });
      world.registerComponent('Boost', { value: 'u16', speedVar: 'f32' });

      // State Resource
      world.setResource('GameState', {
        score: 0,
        distance: 0,
        gameOver: false,
        roadOffset: 0,
        maxSpeed: 8,
        keys: { up: false, down: false, left: false, right: false },
        playerId: -1,
      });

      this.dom = {
        distance: document.getElementById('dd-distance'),
        score: document.getElementById('dd-score'),
        speed: document.getElementById('dd-speed'),
      };
      this.uiState = { distance: -1, score: -1, speed: -1 };

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
      world.componentRegistry.get('Position').props.x[pIdx] = 120;
      world.componentRegistry.get('Position').props.y[pIdx] = this.canvas.height / 2;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // mapped to 🏎️
      world.componentRegistry.get('Renderable').props.size[pIdx] = 60;
      world.componentRegistry.get('Collider').props.width[pIdx] = 50;
      world.componentRegistry.get('Collider').props.height[pIdx] = 30;
      world.componentRegistry.get('Player').props.speed[pIdx] = 2;

      world.getResource('GameState').playerId = p;

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx);
      this.instance.render = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="dd-container">
          <canvas id="dd-canvas" class="game-canvas"></canvas>
          <div class="game-hud-top-center">
            <div class="game-hud-stat"><span class="dd-stat-label">DIST</span><div id="dd-distance">0m</div></div>
            <div class="game-hud-stat"><span class="dd-stat-label">SCORE</span><div id="dd-score">0</div></div>
            <div class="game-hud-stat"><span class="dd-stat-label">SPEED</span><div id="dd-speed">0</div></div>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🏎️', size: 60 },
        ...this.obstacleTypes.map(o => ({ emoji: o.icon, size: 40 })),
        ...this.dexLogos.map(l => ({ emoji: l, size: 35 })),
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    roadTop() {
      return (this.instance.canvas.height - this.roadHeight) / 2;
    },
    roadBottom() {
      return this.roadTop() + this.roadHeight;
    },

    setupInput() {
      const world = this.instance.world;
      const setKey = (e, val) => {
        const key = e.code;
        const state = world.getResource('GameState');
        if (key === 'ArrowUp' || key === 'KeyW') state.keys.up = val;
        if (key === 'ArrowDown' || key === 'KeyS') state.keys.down = val;
        if (key === 'ArrowLeft' || key === 'KeyA') state.keys.left = val;
        if (key === 'ArrowRight' || key === 'KeyD') state.keys.right = val;
      };
      document.addEventListener('keydown', e => setKey(e, true));
      document.addEventListener('keyup', e => setKey(e, false));
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pProps = world.componentRegistry.get('Player').props;
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;

        state.maxSpeed = Math.min(14, 8 + state.distance * 0.005);
        pProps.speed[pIdx] = Math.min(state.maxSpeed, pProps.speed[pIdx] + 0.01 * dt);
        state.distance += pProps.speed[pIdx] * 0.2 * dt;
        state.roadOffset = (state.roadOffset + pProps.speed[pIdx] * 10 * dt) % 100;

        const friction = Math.pow(0.92, dt);
        if (state.keys.up) vel.vy[pIdx] -= 1.5 * dt;
        if (state.keys.down) vel.vy[pIdx] += 1.5 * dt;
        if (state.keys.left) vel.vx[pIdx] -= 1.0 * dt;
        if (state.keys.right) vel.vx[pIdx] += 1.0 * dt;

        vel.vx[pIdx] *= friction;
        vel.vy[pIdx] *= friction;

        const px = pos.x[pIdx];
        const py = pos.y[pIdx];

        // Boundaries
        const rT = self.roadTop(),
          rB = self.roadBottom();
        pos.y[pIdx] = Math.max(rT + 30, Math.min(rB - 30, pos.y[pIdx]));
        pos.x[pIdx] = Math.max(60, Math.min(self.instance.canvas.width - 60, pos.x[pIdx]));

        // Spawning
        if (Math.random() < 0.02) self.spawnObstacle(world);
        if (Math.random() < 0.01) self.spawnBoost(world);

        // Movement & Collisions for entities
        const worldSpeed = pProps.speed[pIdx] * 8;

        // Obstacles
        const obsQ = world.createQuery(['Obstacle', 'Position']);
        if (obsQ.set.count > 0) {
          const obsProps = world.componentRegistry.get('Obstacle').props;
          const { dense, count } = obsQ.set;
          for (let i = count - 1; i >= 0; i--) {
            const idx = dense[i];
            pos.x[idx] -= (worldSpeed + obsProps.speedVar[idx]) * dt;
            if (Math.hypot(pos.x[idx] - px, pos.y[idx] - py) < 40) {
              pProps.speed[pIdx] = Math.max(2, pProps.speed[pIdx] - obsProps.slowdown[idx]);
              state.score = Math.max(0, state.score - 10);
              world.destroyEntity(world.getEntityId(idx));
            } else if (pos.x[idx] < -100) {
              world.destroyEntity(world.getEntityId(idx));
            }
          }
        }

        // Boosts
        const bstQ = world.createQuery(['Boost', 'Position']);
        if (bstQ.set.count > 0) {
          const bstProps = world.componentRegistry.get('Boost').props;
          const { dense, count } = bstQ.set;
          for (let i = count - 1; i >= 0; i--) {
            const idx = dense[i];
            pos.x[idx] -= (worldSpeed + bstProps.speedVar[idx]) * dt;
            if (Math.hypot(pos.x[idx] - px, pos.y[idx] - py) < 40) {
              state.score += bstProps.value[idx];
              pProps.speed[pIdx] = Math.min(
                state.maxSpeed,
                bstProps.speedVar[idx] + pProps.speed[pIdx] + 0.5
              );
              world.destroyEntity(world.getEntityId(idx));
            } else if (pos.x[idx] < -100) {
              world.destroyEntity(world.getEntityId(idx));
            }
          }
        }

        self.updateUI(state, pProps.speed[pIdx]);
      };
    },

    spawnObstacle(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Obstacle');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const obs = world.componentRegistry.get('Obstacle').props;

      const typeIdx = Math.floor(Math.random() * this.obstacleTypes.length);
      const type = this.obstacleTypes[typeIdx];

      pos.x[idx] = this.instance.canvas.width + 100;
      pos.y[idx] = this.roadTop() + 40 + Math.random() * (this.roadHeight - 80);
      rend.iconIndex[idx] = 1 + typeIdx; // 1, 2, 3
      rend.size[idx] = 40;
      obs.slowdown[idx] = type.slowdown;
      obs.speedVar[idx] = 1 + Math.random();
    },

    spawnBoost(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Boost');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const bst = world.componentRegistry.get('Boost').props;

      const typeIdx = Math.floor(Math.random() * this.dexLogos.length);

      pos.x[idx] = this.instance.canvas.width + 100;
      pos.y[idx] = this.roadTop() + 40 + Math.random() * (this.roadHeight - 80);
      rend.iconIndex[idx] = 1 + this.obstacleTypes.length + typeIdx;
      rend.size[idx] = 35;
      bst.value[idx] = 50;
      bst.speedVar[idx] = 0.5 + Math.random();
    },

    updateUI(state, pSpeed) {
      const dist = state.distance | 0;
      const speed = (pSpeed * 20) | 0;

      if (dist !== this.uiState.distance) {
        if (this.dom.distance) this.dom.distance.textContent = dist + 'm';
        this.uiState.distance = dist;
      }
      if (state.score !== this.uiState.score) {
        if (this.dom.score) this.dom.score.textContent = state.score;
        this.uiState.score = state.score;
        updateScore(this.gameId, state.score);
      }
      if (speed !== this.uiState.speed) {
        if (this.dom.speed) this.dom.speed.textContent = speed + ' km/h';
        this.uiState.speed = speed;
      }
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const state = this.instance.world.getResource('GameState');
      const rT = this.roadTop(),
        rB = this.roadBottom();
      const w = this.instance.canvas.width;

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, this.instance.canvas.height);

      ctx.fillStyle = '#151525';
      ctx.fillRect(0, rT | 0, w, this.roadHeight | 0);

      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, rT | 0);
      ctx.lineTo(w, rT | 0);
      ctx.moveTo(0, rB | 0);
      ctx.lineTo(w, rB | 0);
      ctx.stroke();

      ctx.strokeStyle = '#d97706';
      ctx.setLineDash([40, 60]);
      ctx.beginPath();
      ctx.moveTo(-state.roadOffset, (this.instance.canvas.height / 2) | 0);
      ctx.lineTo(w, (this.instance.canvas.height / 2) | 0);
      ctx.stroke();
      ctx.setLineDash([]);

      const query = this.instance.world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;
      const rend = this.instance.world.componentRegistry.get('Renderable').props;
      const vel = this.instance.world.componentRegistry.get('Velocity').props;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const rIdx = rend.iconIndex[idx];
        let icon = '❓';

        if (idx === state.playerId) {
          SpriteCache.drawTransformed(ctx, '🏎️', pos.x[idx] | 0, pos.y[idx] | 0, 60, {
            scaleX: -1,
            rotation: vel.vy[idx] * 0.03,
          });
          continue;
        } else if (rIdx > 0 && rIdx <= this.obstacleTypes.length) {
          icon = this.obstacleTypes[rIdx - 1].icon;
        } else if (rIdx > this.obstacleTypes.length) {
          icon = this.dexLogos[rIdx - this.obstacleTypes.length - 1];
        }

        SpriteCache.draw(ctx, icon, pos.x[idx] | 0, pos.y[idx] | 0, rend.size[idx]);
      }
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.DexDash = DexDash;
  window.DexDash = DexDash;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('dexdash', DexDash);
})();
