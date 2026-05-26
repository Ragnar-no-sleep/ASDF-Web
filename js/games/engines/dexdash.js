/**
 * ASDF Games - DexDash Engine (11/10 ECS Edition)
 *
 * Optimized racing game with horizontal scrolling.
 * Side-view car driving on a flat road.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const DexDash = {
    version: '2.1.0',
    gameId: 'dexdash',
    roadHeight: 250,
    instance: null,

    dexLogos: ['🦄', '🦞', '🍣', '☀️', '🌊', '💎'],
    obstacleTypes: [{ icon: '🚧' }, { icon: '⛔' }, { icon: '🐌' }],

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      this.canvas = document.getElementById('dd-canvas');

      this.instance = new ASDF.GameInstance(this.canvas, {
        maxEntities: 500,
        debug: true,
      });

      // 11/10: Resize early for correct road placement
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { speed: 'f32' });
      world.registerComponent('Obstacle', { slowdown: 'f32' });
      world.registerComponent('Boost', { value: 'u16' });

      world.setResource('GameState', {
        score: 0,
        distance: 0,
        gameOver: false,
        roadOffset: 0,
        maxSpeed: 8,
        keys: {},
        playerId: -1,
      });

      this.dom = {
        distance: document.getElementById('dd-distance'),
        score: document.getElementById('dd-score'),
        speed: document.getElementById('dd-speed'),
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
      world.componentRegistry.get('Position').props.x[pIdx] = 120;
      // Place car on the road (offset from bottom)
      world.componentRegistry.get('Position').props.y[pIdx] = this.roadBottom() - 40;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // 🏎️
      world.componentRegistry.get('Renderable').props.size[pIdx] = 60;
      world.componentRegistry.get('Player').props.speed[pIdx] = 2;

      world.getResource('GameState').playerId = p;

      // Override Render
      const icons = ['🏎️', ...this.obstacleTypes.map(o => o.icon), ...this.dexLogos];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

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
            <div class="dd-stat">DIST: <span id="dd-distance">0m</span></div>
            <div class="dd-stat">SCORE: <span id="dd-score">0</span></div>
            <div class="dd-stat">SPEED: <span id="dd-speed">0</span></div>
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
      document.addEventListener('keydown', e => {
        world.getResource('GameState').keys[e.code] = true;
      });
      document.addEventListener('keyup', e => {
        world.getResource('GameState').keys[e.code] = false;
      });
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

        if (state.keys['ArrowUp'] || state.keys['KeyW']) vel.vy[pIdx] -= 1 * dt;
        if (state.keys['ArrowDown'] || state.keys['KeyS']) vel.vy[pIdx] += 1 * dt;

        vel.vy[pIdx] *= Math.pow(0.9, dt);

        // Bounds
        const rT = self.roadTop(),
          rB = self.roadBottom();
        pos.y[pIdx] = Math.max(rT + 30, Math.min(rB - 30, pos.y[pIdx]));

        // Spawning
        if (Math.random() < 0.02) self.spawnObstacle(world);

        // Movement & Cleanup
        const worldSpeed = pProps.speed[pIdx] * 8;
        const query = world.createQuery(['Position', 'Renderable']);
        const { dense, count } = query.set;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === pIdx) continue;
          pos.x[idx] -= worldSpeed * dt;
          if (Math.hypot(pos.x[idx] - pos.x[pIdx], pos.y[idx] - pos.y[pIdx]) < 40) {
            pProps.speed[pIdx] = Math.max(2, pProps.speed[pIdx] - 2);
            world.destroyEntity(world.getEntityId(idx));
          } else if (pos.x[idx] < -100) {
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(state, pProps.speed[pIdx]);
      };
    },

    spawnObstacle(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      const idx = world.getIndex(e);
      const typeIdx = Math.floor(Math.random() * this.obstacleTypes.length);
      world.componentRegistry.get('Position').props.x[idx] = this.instance.canvas.width + 100;
      world.componentRegistry.get('Position').props.y[idx] =
        this.roadTop() + 40 + Math.random() * (this.roadHeight - 80);
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 1 + typeIdx;
      world.componentRegistry.get('Renderable').props.size[idx] = 40;
    },

    updateUI(state, pSpeed) {
      if (this.dom.distance) this.dom.distance.textContent = (state.distance | 0) + 'm';
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.speed) this.dom.speed.textContent = ((pSpeed * 20) | 0) + ' km/h';
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const rT = this.roadTop(),
        rB = this.roadBottom();

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, this.instance.canvas.height);
      ctx.fillStyle = '#151525';
      ctx.fillRect(0, rT, w, this.roadHeight);

      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, rT);
      ctx.lineTo(w, rT);
      ctx.moveTo(0, rB);
      ctx.lineTo(w, rB);
      ctx.stroke();

      // Dashed middle line
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
      ctx.setLineDash([30, 30]);
      ctx.beginPath();
      ctx.moveTo(0, rT + this.roadHeight / 2);
      ctx.lineTo(w, rT + this.roadHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const world = this.instance.world;
      const state = world.getResource('GameState');
      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;

      // Custom car render for orientation
      SpriteCache.drawTransformed(ctx, '🏎️', pos.x[pIdx], pos.y[pIdx], 60, {
        scaleX: 1, // Face right
        rotation: vel.vy[pIdx] * 0.05, // Tilt based on vertical movement
      });

      // Render other entities (RenderSystem skip player)
      const query = world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;
      const rend = world.componentRegistry.get('Renderable').props;
      const icons = ['🏎️', ...this.obstacleTypes.map(o => o.icon), ...this.dexLogos];

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        if (idx === pIdx) continue;
        const icon = icons[rend.iconIndex[idx]] || '❓';
        SpriteCache.draw(ctx, icon, pos.x[idx], pos.y[idx], rend.size[idx]);
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
