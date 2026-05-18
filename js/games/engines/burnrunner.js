/**
 * ASDF Games - Burn Runner Engine (11/10 ECS Edition)
 *
 * Endless runner game: Run through the blockchain, collect tokens, avoid obstacles
 * Features: Double jump, dash ability, shield ability, platform physics
 * Migrated to ECS for zero-allocation performance.
 */

'use strict';

(function () {
  const BurnRunner = {
    version: '2.0.0',
    gameId: 'burnrunner',
    instance: null,

    // Definitions
    obstacleTypes: [
      { icon: '💀', name: 'SCAM', width: 35, height: 40, deadly: true },
      { icon: '🚫', name: 'RUG', width: 35, height: 35, deadly: true },
      { icon: '🔥', name: 'BURN', width: 32, height: 38, deadly: true },
      { icon: '💣', name: 'BOMB', width: 32, height: 34, deadly: true },
      { icon: '🌋', name: 'LAVA', width: 40, height: 30, deadly: true },
    ],

    platformTypes: [
      { icon: '📦', name: 'CRATE', width: 45, height: 35, points: 15 },
      { icon: '🧱', name: 'BLOCK', width: 50, height: 30, points: 10 },
      { icon: '☁️', name: 'CLOUD', width: 70, height: 25, points: 30, floating: true },
    ],

    tokenType: { icon: '💎', width: 28, height: 28, points: 50 },

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

      // BurnRunner Specific Components
      world.registerComponent('Player', { jumpsLeft: 'u8', state: 'u8' });
      world.registerComponent('Obstacle', { points: 'u16' });
      world.registerComponent('Collectible', { points: 'u16', collected: 'u8' });

      // State Resource
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
        jumps: document.getElementById('br-jumps'),
        distance: document.getElementById('br-distance'),
        tokens: document.getElementById('br-tokens'),
        dashCd: document.getElementById('br-dash-cd'),
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
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // Dog
      world.componentRegistry.get('Renderable').props.size[pIdx] = 45;
      world.componentRegistry.get('Collider').props.width[pIdx] = 30;
      world.componentRegistry.get('Collider').props.height[pIdx] = 45;
      world.componentRegistry.get('Player').props.jumpsLeft[pIdx] = 2;
      world.getResource('GameState').playerId = player;

      // Systems
      world.addSystem(this.createRunnerSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      // Override Render
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx);
      this.instance.render = alpha => this.draw(alpha, defaultRender);

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
            <div class="game-hud-stat"><span class="br-stat-label">DIST</span><div id="br-distance">0m</div></div>
            <div class="game-hud-stat"><span class="br-stat-label">TOKENS</span><div id="br-tokens">0</div></div>
            <div class="game-hud-stat"><span class="br-stat-label">JUMPS</span><div id="br-jumps">2/2</div></div>
          </div>
          <div class="game-hud-bottom-right">
            <div class="br-ability" id="br-dash-ability">
              <span class="br-ability-icon">💨</span>
              <div class="br-cooldown" id="br-dash-cd"></div>
            </div>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🐕', size: 45 },
        { emoji: '💨', size: 20 },
        { emoji: '💥', size: 35 },
        { emoji: this.tokenType.icon, size: this.tokenType.width },
        ...this.obstacleTypes.map(o => ({ emoji: o.icon, size: 36 })),
        ...this.platformTypes.map(p => ({ emoji: p.icon, size: 36 })),
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
        state.speed = state.baseSpeed + state.distance * 0.001; // Gradual speedup

        const playerIdx = world.getIndex(state.playerId);
        const posProps = world.componentRegistry.get('Position').props;
        const velProps = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;
        const collProps = world.componentRegistry.get('Collider').props;
        const rendProps = world.componentRegistry.get('Renderable').props;

        // Player Gravity
        velProps.vy[playerIdx] += state.gravity * dt;

        const px = posProps.x[playerIdx];
        const py = posProps.y[playerIdx];
        const pw = collProps.width[playerIdx];
        const ph = collProps.height[playerIdx];

        let onGround = false;

        // Floor collision
        if (py + ph > state.groundY) {
          posProps.y[playerIdx] = state.groundY - ph;
          velProps.vy[playerIdx] = 0;
          onGround = true;
        }

        // Spawning
        state.spawnTimer += dt;
        if (state.spawnTimer > 120 / (state.speed / 6)) {
          state.spawnTimer = 0;
          self.spawnEntity(world);
        }

        // Environment Update & Collisions
        const query = world.createQuery(['Position', 'Velocity', 'Collider']);
        const { dense, count } = query.set;

        const obsProps = world.componentRegistry.get('Obstacle');
        const colProps = world.componentRegistry.get('Collectible');

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === playerIdx) continue; // Skip player

          // Move world left
          velProps.vx[idx] = -state.speed;

          const ex = posProps.x[idx];
          const ey = posProps.y[idx];
          const ew = collProps.width[idx];
          const eh = collProps.height[idx];

          // AABB Collision with player
          if (px < ex + ew && px + pw > ex && py < ey + eh && py + ph > ey) {
            // Check if Obstacle
            if (obsProps && obsProps.props.points[idx] !== undefined) {
              state.gameOver = true;
              rendProps.iconIndex[playerIdx] = 2; // Dead
              if (typeof endGame === 'function')
                endGame(self.gameId, Math.floor(state.distance + state.tokens * 10));
            }

            // Check if Collectible
            if (colProps && colProps.props.collected[idx] === 0) {
              colProps.props.collected[idx] = 1;
              state.tokens++;
              world.destroyEntity(world.getEntityId(idx));
            }
          }

          // Offscreen cleanup
          if (ex < -100) {
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        if (onGround) {
          pProps.jumpsLeft[playerIdx] = state.maxJumps;
        }

        self.updateUI(state);
      };
    },

    spawnEntity(world) {
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Collider');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const coll = world.componentRegistry.get('Collider').props;

      const typeRnd = Math.random();
      if (typeRnd < 0.6) {
        // Obstacle
        world.addComponent(e, 'Obstacle');
        const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
        pos.x[idx] = this.instance.canvas.width + 50;
        pos.y[idx] = state.groundY - type.height;
        rend.iconIndex[idx] = 4; // Using specific index mapping or fallback
        rend.size[idx] = type.width;
        coll.width[idx] = type.width;
        coll.height[idx] = type.height;
      } else {
        // Collectible
        world.addComponent(e, 'Collectible');
        pos.x[idx] = this.instance.canvas.width + 50;
        pos.y[idx] = state.groundY - 100 - Math.random() * 80;
        rend.iconIndex[idx] = 3;
        rend.size[idx] = this.tokenType.width;
        coll.width[idx] = this.tokenType.width;
        coll.height[idx] = this.tokenType.height;
      }
    },

    updateUI(state) {
      if (this.dom.distance) this.dom.distance.textContent = Math.floor(state.distance) + 'm';
      if (this.dom.tokens) this.dom.tokens.textContent = state.tokens;
      const pIdx = this.instance.world.getIndex(state.playerId);
      const jumps = this.instance.world.componentRegistry.get('Player').props.jumpsLeft[pIdx];
      if (this.dom.jumps) this.dom.jumps.textContent = `${jumps}/${state.maxJumps}`;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;

      // Parallax BG
      const state = this.instance.world.getResource('GameState');
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);

      // Floor
      ctx.fillStyle = '#0f0f1c';
      ctx.fillRect(0, state.groundY, w, h - state.groundY);

      const speedOffset = (state.distance * 10) % 40;
      ctx.strokeStyle = '#2d2d4a';
      ctx.beginPath();
      for (let x = -speedOffset; x < w; x += 40) {
        ctx.moveTo(x | 0, state.groundY);
        ctx.lineTo(x | 0, h);
      }
      ctx.stroke();

      // ECS Standard Render
      // Need dynamic icons mapping based on components if defaultRender is strict
      // For 11/10 we could override the icon mappings in RenderSystem or draw them manually here
      const query = this.instance.world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;
      const rend = this.instance.world.componentRegistry.get('Renderable').props;
      const obs = this.instance.world.componentRegistry.get('Obstacle');
      const col = this.instance.world.componentRegistry.get('Collectible');

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        let icon = '❓';

        if (idx === state.playerId) {
          icon = state.gameOver ? '💥' : '🐕';
        } else if (col && col.props.points[idx] !== undefined) {
          icon = '💎';
        } else if (obs && obs.props.points[idx] !== undefined) {
          // Simplification: random icon based on index or just general obstacle
          icon = this.obstacleTypes[idx % this.obstacleTypes.length].icon;
        }

        SpriteCache.draw(ctx, icon, pos.x[idx], pos.y[idx] + rend.size[idx] / 2, rend.size[idx]);
      }
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
