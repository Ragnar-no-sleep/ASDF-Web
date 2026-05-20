/**
 * ASDF Games - Burn Runner Engine (11/10 ECS Edition)
 *
 * Endless runner game: Run through the blockchain, collect tokens, avoid obstacles
 * Migrated to ECS for zero-allocation performance.
 */

'use strict';

(function () {
  const BurnRunner = {
    version: '2.0.0',
    gameId: 'burnrunner',
    instance: null,

    obstacleTypes: [
      { icon: '💀', name: 'SCAM', width: 35, height: 40 },
      { icon: '🚫', name: 'RUG', width: 35, height: 35 },
      { icon: '🔥', name: 'BURN', width: 32, height: 38 },
      { icon: '💣', name: 'BOMB', width: 32, height: 34 },
    ],

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('br-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { jumpsLeft: 'u8' });
      world.registerComponent('Obstacle', { type: 'u8' });
      world.registerComponent('Collectible', { value: 'u16' });

      world.setResource('GameState', {
        distance: 0,
        tokens: 0,
        speed: 6,
        baseSpeed: 6,
        gravity: 0.4,
        jumpForce: -9,
        maxJumps: 2,
        gameOver: false,
        spawnTimer: 0,
        groundY: canvas.height - 50,
        playerId: -1,
      });

      this.dom = {
        distance: document.getElementById('br-distance'),
        tokens: document.getElementById('br-tokens'),
      };

      this.setupInput();
      this.preloadSprites();

      // Create Player
      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Collider');
      world.addComponent(player, 'Player');

      const pIdx = world.getIndex(player);
      world.componentRegistry.get('Position').props.x[pIdx] = 80;
      world.componentRegistry.get('Position').props.y[pIdx] = canvas.height - 100;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // 🐕
      world.componentRegistry.get('Renderable').props.size[pIdx] = 45;
      world.componentRegistry.get('Collider').props.width[pIdx] = 30;
      world.componentRegistry.get('Collider').props.height[pIdx] = 45;
      world.componentRegistry.get('Player').props.jumpsLeft[pIdx] = 2;
      world.getResource('GameState').playerId = player;

      // Override Render
      const icons = ['🐕', '💥', '💎', ...this.obstacleTypes.map(o => o.icon)];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      // Systems
      world.addSystem(this.createRunnerSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="br-container">
          <canvas id="br-canvas" class="game-canvas"></canvas>
          <div class="game-hud-top-left">
            <div class="game-hud-stat">DIST: <span id="br-distance">0m</span></div>
            <div class="game-hud-stat">TOKENS: <span id="br-tokens">0</span></div>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🐕', size: 45 },
        { emoji: '💎', size: 28 },
        { emoji: '💥', size: 35 },
        ...this.obstacleTypes.map(o => ({ emoji: o.icon, size: 36 })),
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const jump = e => {
        if (e && e.cancelable) e.preventDefault();
        const world = this.instance.world;
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const playerIdx = world.getIndex(state.playerId);
        const pProps = world.componentRegistry.get('Player').props;
        const vProps = world.componentRegistry.get('Velocity').props;

        if (pProps.jumpsLeft[playerIdx] > 0) {
          vProps.vy[playerIdx] = state.jumpForce;
          pProps.jumpsLeft[playerIdx]--;
        }
      };

      document.addEventListener('keydown', e => {
        if (e.code === 'Space') jump(e);
      });
      canvas.addEventListener('pointerdown', jump);
    },

    createRunnerSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        state.distance += state.speed * 0.1 * dt;
        state.speed = state.baseSpeed + state.distance * 0.001;

        const playerIdx = world.getIndex(state.playerId);
        const posProps = world.componentRegistry.get('Position').props;
        const velProps = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;
        const collProps = world.componentRegistry.get('Collider').props;
        const rendProps = world.componentRegistry.get('Renderable').props;

        velProps.vy[playerIdx] += state.gravity * dt;

        const py = posProps.y[playerIdx];
        const ph = collProps.height[playerIdx];

        if (py + ph > state.groundY) {
          posProps.y[playerIdx] = state.groundY - ph;
          velProps.vy[playerIdx] = 0;
          pProps.jumpsLeft[playerIdx] = state.maxJumps;
        }

        // Spawning
        state.spawnTimer += dt;
        if (state.spawnTimer > 120 / (state.speed / 6)) {
          state.spawnTimer = 0;
          self.spawnEntity(world);
        }

        // Collisions
        const px = posProps.x[playerIdx],
          pw = collProps.width[playerIdx];
        const query = world.createQuery(['Position', 'Collider']);
        const { dense, count } = query.set;

        const obsProps = world.componentRegistry.get('Obstacle');
        const colProps = world.componentRegistry.get('Collectible');

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === playerIdx) continue;

          posProps.x[idx] -= state.speed * dt;

          const ex = posProps.x[idx],
            ey = posProps.y[idx];
          const ew = collProps.width[idx],
            eh = collProps.height[idx];

          if (
            px < ex + ew &&
            px + pw > ex &&
            posProps.y[playerIdx] < ey + eh &&
            posProps.y[playerIdx] + ph > ey
          ) {
            if (obsProps && obsProps.props.type[idx] !== undefined) {
              state.gameOver = true;
              rendProps.iconIndex[playerIdx] = 1; // 💥
              if (typeof endGame === 'function') endGame(self.gameId, Math.floor(state.distance));
            } else if (colProps && colProps.props.value[idx] !== undefined) {
              state.tokens++;
              world.destroyEntity(world.getEntityId(idx));
            }
          }

          if (ex < -100) world.destroyEntity(world.getEntityId(idx));
        }

        self.updateUI(state);
      };
    },

    spawnEntity(world) {
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Collider');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const coll = world.componentRegistry.get('Collider').props;

      pos.x[idx] = this.instance.canvas.width + 50;

      if (Math.random() < 0.6) {
        world.addComponent(e, 'Obstacle');
        const typeIdx = Math.floor(Math.random() * this.obstacleTypes.length);
        const type = this.obstacleTypes[typeIdx];
        pos.y[idx] = state.groundY - type.height;
        rend.iconIndex[idx] = 3 + typeIdx; // Map to icons array
        rend.size[idx] = type.width;
        coll.width[idx] = type.width;
        coll.height[idx] = type.height;
      } else {
        world.addComponent(e, 'Collectible');
        pos.y[idx] = state.groundY - 100 - Math.random() * 80;
        rend.iconIndex[idx] = 2; // 💎
        rend.size[idx] = 28;
        coll.width[idx] = 28;
        coll.height[idx] = 28;
      }
    },

    updateUI(state) {
      if (this.dom.distance) this.dom.distance.textContent = Math.floor(state.distance) + 'm';
      if (this.dom.tokens) this.dom.tokens.textContent = state.tokens;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0f0f1c';
      ctx.fillRect(0, state.groundY, w, h - state.groundY);

      defaultRender(this.instance.world, alpha);
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.BurnRunner = BurnRunner;
  window.BurnRunner = BurnRunner;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('burnrunner', BurnRunner);
})();
