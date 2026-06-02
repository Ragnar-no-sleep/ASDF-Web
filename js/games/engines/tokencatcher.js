/**
 * ASDF Games - Token Catcher Engine (11/10 ECS Edition)
 *
 * Arcade game: Catch falling ASDF tokens, avoid scam tokens and skulls.
 * Features: 3-lane movement, shooting, power-ups.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const TokenCatcher = {
    version: '2.0.0',
    gameId: 'tokencatcher',
    instance: null,

    goodTokens: ['🔥', '💰', '⭐', '💎', '🪙'],
    scamTokens: ['🚨', '❌', '🦠'],
    skullToken: '💀',

    powerUps: [
      { icon: '🧲', duration: 233, color: '#3b82f6', name: 'MAGNET', type: 0 },
      { icon: '⏱️', duration: 144, color: '#a855f7', name: 'SLOW-MO', type: 1 },
      { icon: '✨', duration: 377, color: '#fbbf24', name: '2X SCORE', type: 2 },
      { icon: '🛡️', duration: 233, color: '#22c55e', name: 'SHIELD', type: 3 },
    ],

    enemyTypes: [
      { icon: '👾', hp: 3, points: 50 },
      { icon: '🤖', hp: 3, points: 40 },
      { icon: '👹', hp: 3, points: 60 },
    ],

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('tc-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1500,
        debug: true,
      });

      // 11/10: Resize early for correct lane calculation
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Drone', { lane: 'u8', cooldown: 'f32' });
      world.registerComponent('Token', { type: 'u8' }); // 0:Good, 1:Scam, 2:Skull
      world.registerComponent('Enemy', { hp: 'u8', points: 'u8' });
      world.registerComponent('PowerUp', { type: 'u8' });
      world.registerComponent('Projectile', { active: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32' });

      // State Resource
      const laneH = 50,
        bM = 40;
      world.setResource('GameState', {
        score: 0,
        timeLeft: 34,
        gameOver: false,
        spawnTimer: 0,
        difficulty: 0,
        frameCount: 0,
        droneId: -1,
        activePowerUps: [0, 0, 0, 0],
        visualYOffset: 0, // Visual jump effect
        lanes: [
          canvas.height - bM - laneH * 2.5,
          canvas.height - bM - laneH * 1.5,
          canvas.height - bM - laneH * 0.5,
        ],
      });

      this.dom = {
        score: document.getElementById('tc-score'),
        time: document.getElementById('tc-time'),
      };

      this.setupInput();
      this.preloadSprites();

      // Create Drone
      const drone = world.createEntity();
      world.addComponent(drone, 'Position');
      world.addComponent(drone, 'Velocity');
      world.addComponent(drone, 'Renderable');
      world.addComponent(drone, 'Collider');
      world.addComponent(drone, 'Drone');

      const dIdx = world.getIndex(drone);
      const lanes = world.getResource('GameState').lanes;
      world.componentRegistry.get('Position').props.x[dIdx] = canvas.width / 2;
      world.componentRegistry.get('Position').props.y[dIdx] = lanes[1];
      world.componentRegistry.get('Renderable').props.iconIndex[dIdx] = 0; // 🛸
      world.componentRegistry.get('Renderable').props.size[dIdx] = 60;
      world.componentRegistry.get('Collider').props.width[dIdx] = 50;
      world.componentRegistry.get('Collider').props.height[dIdx] = 50;
      world.componentRegistry.get('Drone').props.lane[dIdx] = 1;

      world.getResource('GameState').droneId = drone;

      // Override Render
      const icons = [
        '🛸',
        '🔥',
        '💥',
        ...this.powerUps.map(p => p.icon),
        ...this.enemyTypes.map(e => e.icon),
        ...this.goodTokens,
        ...this.scamTokens,
        '💀',
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
        <div class="tc-container tc-container--neon">
          <canvas id="tc-canvas" class="game-canvas"></canvas>
          <div class="game-hud-top-left">
            <div class="tc-stat">SCORE: <span id="tc-score">0</span></div>
            <div class="tc-stat">TIME: <span id="tc-time">34</span>s</div>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🛸', size: 60 },
        { emoji: '🔥', size: 15 },
        { emoji: '💥', size: 35 },
        ...this.powerUps.map(p => ({ emoji: p.icon, size: 28 })),
        ...this.enemyTypes.map(e => ({ emoji: e.icon, size: 35 })),
        ...this.goodTokens.map(t => ({ emoji: t, size: 30 })),
        ...this.scamTokens.map(t => ({ emoji: t, size: 30 })),
        { emoji: '💀', size: 30 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const world = this.instance.world;

      document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        const dIdx = world.getIndex(state.droneId);
        const pProps = world.componentRegistry.get('Position').props;
        const drProps = world.componentRegistry.get('Drone').props;

        if (key === 'a' || key === 'arrowleft') {
          world.componentRegistry.get('Velocity').props.vx[dIdx] = -8;
        } else if (key === 'd' || key === 'arrowright') {
          world.componentRegistry.get('Velocity').props.vx[dIdx] = 8;
        } else if ((key === 'w' || key === 'arrowup') && drProps.lane[dIdx] > 0) {
          drProps.lane[dIdx]--;
          pProps.y[dIdx] = state.lanes[drProps.lane[dIdx]];
          state.visualYOffset = -20; // Visual jump
        } else if ((key === 's' || key === 'arrowdown') && drProps.lane[dIdx] < 2) {
          drProps.lane[dIdx]++;
          pProps.y[dIdx] = state.lanes[drProps.lane[dIdx]];
          state.visualYOffset = 10; // Visual squash
        }
      });

      document.addEventListener('keyup', e => {
        const key = e.key.toLowerCase();
        if (key === 'a' || key === 'd' || key === 'arrowleft' || key === 'arrowright') {
          const state = world.getResource('GameState');
          const dIdx = world.getIndex(state.droneId);
          world.componentRegistry.get('Velocity').props.vx[dIdx] = 0;
        }
      });

      canvas.addEventListener('pointerdown', e => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        const rect = canvas.getBoundingClientRect();
        const tx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const ty = (e.clientY - rect.top) * (canvas.height / rect.height);
        this.shoot(world, tx, ty);
      });
    },

    shoot(world, tx, ty) {
      const state = world.getResource('GameState');
      const dIdx = world.getIndex(state.droneId);
      const pos = world.componentRegistry.get('Position').props;

      const startX = pos.x[dIdx],
        startY = pos.y[dIdx] - 30;
      const dx = tx - startX,
        dy = ty - startY;
      const dist = Math.hypot(dx, dy) || 1;

      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Projectile');
      world.addComponent(e, 'Lifespan');

      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = startX;
      world.componentRegistry.get('Position').props.y[idx] = startY;
      world.componentRegistry.get('Velocity').props.vx[idx] = (dx / dist) * 15;
      world.componentRegistry.get('Velocity').props.vy[idx] = (dy / dist) * 15;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 1; // 🔥
      world.componentRegistry.get('Renderable').props.size[idx] = 15;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 100;
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        state.frameCount += dt;
        if (state.frameCount % 60 < dt) {
          state.timeLeft--;
          if (state.timeLeft <= 0) {
            state.gameOver = true;
            if (typeof endGame === 'function') endGame(self.gameId, state.score);
          }
        }

        // Visual Juice decay
        state.visualYOffset *= Math.pow(0.8, dt);

        // Spawning
        state.spawnTimer += dt;
        const rate = Math.max(20, 40 - state.difficulty);
        if (state.spawnTimer >= rate) {
          self.spawnItem(world);
          state.spawnTimer = 0;
          state.difficulty += 0.05;
        }

        // Cleanup Lifespans
        const query = world.createQuery(['Lifespan']);
        const { dense, count } = query.set;
        const lifeProps = world.componentRegistry.get('Lifespan').props;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          lifeProps.remaining[idx] -= dt;
          if (lifeProps.remaining[idx] <= 0) world.destroyEntity(world.getEntityId(idx));
        }

        self.updateUI(state);
      };
    },

    createCollisionSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const dIdx = world.getIndex(state.droneId);
        const pos = world.componentRegistry.get('Position').props;
        const dx = pos.x[dIdx],
          dy = pos.y[dIdx];

        const movers = world.createQuery(['Position', 'Collider']);
        const { dense, count } = movers.set;

        const tokenProps = world.componentRegistry.get('Token');
        const enemyProps = world.componentRegistry.get('Enemy');
        const powerProps = world.componentRegistry.get('PowerUp');

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === dIdx) continue;

          const ex = pos.x[idx],
            ey = pos.y[idx];

          if (Math.hypot(dx - ex, dy - ey) < 40) {
            if (tokenProps && tokenProps.props.type[idx] !== undefined) {
              const type = tokenProps.props.type[idx];
              if (type === 0) {
                state.score += 10;
              } else if (type === 1) {
                state.score = Math.max(0, state.score - 50);
              } else if (type === 2) {
                state.gameOver = true;
                if (typeof endGame === 'function') endGame(self.gameId, state.score);
              }
              world.destroyEntity(world.getEntityId(idx));
            } else if (enemyProps && enemyProps.props.hp[idx] !== undefined) {
              state.gameOver = true;
              if (typeof endGame === 'function') endGame(self.gameId, state.score);
            }
          }

          if (ey > self.instance.canvas.height + 50) world.destroyEntity(world.getEntityId(idx));
        }
      };
    },

    spawnItem(world) {
      const cw = this.instance.canvas.width;
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Collider');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const col = world.componentRegistry.get('Collider').props;

      pos.x[idx] = 30 + Math.random() * (cw - 60);
      pos.y[idx] = -30;
      vel.vy[idx] = 2 + state.difficulty * 0.1;

      const roll = Math.random();
      if (roll < 0.15) {
        world.addComponent(e, 'Enemy');
        const typeIdx = Math.floor(Math.random() * this.enemyTypes.length);
        rend.iconIndex[idx] = 7 + typeIdx; // Map to icons array
        rend.size[idx] = 35;
        col.width[idx] = 35;
        col.height[idx] = 35;
      } else {
        world.addComponent(e, 'Token');
        const tProps = world.componentRegistry.get('Token').props;
        if (roll < 0.3) {
          tProps.type[idx] = 2;
          rend.iconIndex[idx] =
            7 + this.enemyTypes.length + this.goodTokens.length + this.scamTokens.length;
        } // Skull
        else if (roll < 0.5) {
          tProps.type[idx] = 1;
          rend.iconIndex[idx] = 7 + this.enemyTypes.length + this.goodTokens.length;
        } // Scam
        else {
          tProps.type[idx] = 0;
          rend.iconIndex[idx] = 7 + this.enemyTypes.length;
        } // Good
        rend.size[idx] = 30;
        col.width[idx] = 30;
        col.height[idx] = 30;
      }
    },

    updateUI(state) {
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.time) this.dom.time.textContent = Math.ceil(state.timeLeft);
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const state = this.instance.world.getResource('GameState');
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, this.instance.canvas.width, this.instance.canvas.height);

      // Draw background lanes
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      state.lanes.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.instance.canvas.width, y);
        ctx.stroke();
      });

      // Render entities with visual offset for the drone
      const droneId = state.droneId;
      const world = this.instance.world;
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;

      const query = world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;

      const icons = [
        '🛸',
        '🔥',
        '💥',
        ...this.powerUps.map(p => p.icon),
        ...this.enemyTypes.map(e => e.icon),
        ...this.goodTokens,
        ...this.scamTokens,
        '💀',
      ];

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const tx = pos.x[idx],
          ty = pos.y[idx];
        const icon = icons[rend.iconIndex[idx]] || '❓';
        const size = rend.size[idx] || 30;

        if (world.getEntityId(idx) === droneId) {
          SpriteCache.draw(ctx, icon, tx, ty + state.visualYOffset, size);
        } else {
          SpriteCache.draw(ctx, icon, tx, ty, size);
        }
      }
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.TokenCatcher = TokenCatcher;
  window.TokenCatcher = TokenCatcher;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('tokencatcher', TokenCatcher);
})();
