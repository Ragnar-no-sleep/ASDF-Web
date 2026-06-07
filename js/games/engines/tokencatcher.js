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
    _cleanupInput: null,
    _positionColliderQuery: null,
    _lifespanQuery: null,
    _renderQuery: null,

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
      this.stop();

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
      this._positionColliderQuery = world.createQuery(['Position', 'Collider']);
      this._lifespanQuery = world.createQuery(['Lifespan']);
      this._renderQuery = world.createQuery(['Position', 'Renderable']);

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

      const onKeyDown = e => {
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
      };

      const onKeyUp = e => {
        const key = e.key.toLowerCase();
        if (key === 'a' || key === 'd' || key === 'arrowleft' || key === 'arrowright') {
          const state = world.getResource('GameState');
          const dIdx = world.getIndex(state.droneId);
          world.componentRegistry.get('Velocity').props.vx[dIdx] = 0;
        }
      };

      const onPointerDown = e => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        const rect = canvas.getBoundingClientRect();
        const tx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const ty = (e.clientY - rect.top) * (canvas.height / rect.height);
        this.shoot(world, tx, ty);
      };

      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('pointerdown', onPointerDown);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        canvas.removeEventListener('pointerdown', onPointerDown);
      };
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
        state.difficulty = Math.min(90, state.difficulty);
        const rate = Math.max(16, 40 - state.difficulty * 0.35);
        const activeDrops = (
          self._positionColliderQuery ||
          (self._positionColliderQuery = world.createQuery(['Position', 'Collider']))
        ).set.count;
        if (activeDrops < 42 && state.spawnTimer >= rate) {
          self.spawnItem(world);
          state.spawnTimer = 0;
          state.difficulty += 0.045;
        }

        // Cleanup Lifespans
        const query =
          self._lifespanQuery || (self._lifespanQuery = world.createQuery(['Lifespan']));
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

        const movers =
          self._positionColliderQuery ||
          (self._positionColliderQuery = world.createQuery(['Position', 'Collider']));
        const { dense, count } = movers.set;

        const tokenComp = world.componentRegistry.get('Token');
        const enemyComp = world.componentRegistry.get('Enemy');
        const powerComp = world.componentRegistry.get('PowerUp');
        const tokenBit = tokenComp ? tokenComp.bit : 0;
        const enemyBit = enemyComp ? enemyComp.bit : 0;
        const powerBit = powerComp ? powerComp.bit : 0;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === dIdx) continue;

          const ex = pos.x[idx],
            ey = pos.y[idx];
          const entityMask = world.entityMasks[idx];

          if (Math.hypot(dx - ex, dy - ey) < 40) {
            if (tokenBit && (entityMask & tokenBit) === tokenBit) {
              const type = tokenComp.props.type[idx];
              if (type === 0) {
                state.score += 10;
              } else if (type === 1) {
                state.score = Math.max(0, state.score - 50);
              } else if (type === 2) {
                state.gameOver = true;
                if (typeof endGame === 'function') endGame(self.gameId, state.score);
              }
              world.destroyEntity(world.getEntityId(idx));
            } else if (enemyBit && (entityMask & enemyBit) === enemyBit) {
              state.gameOver = true;
              if (typeof endGame === 'function') endGame(self.gameId, state.score);
            } else if (powerBit && (entityMask & powerBit) === powerBit) {
              const type = powerComp.props.type[idx];
              state.activePowerUps[type] = self.powerUps[type]?.duration || 180;
              state.score += 25;
              world.destroyEntity(world.getEntityId(idx));
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
      vel.vy[idx] = Math.min(9, 2 + state.difficulty * 0.08);

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
      if (this.instance) {
        this.drawArenaBackdrop(ctx, state);
        this.drawEntities(ctx, state);
        return;
      }
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

      const query =
        this._renderQuery || (this._renderQuery = world.createQuery(['Position', 'Renderable']));
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

    drawArenaBackdrop(ctx, state) {
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#08111f');
      bg.addColorStop(0.55, '#10142d');
      bg.addColorStop(1, '#12071f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
      ctx.lineWidth = 1;
      const gridOffset = (state.frameCount * 2) % 42;
      ctx.beginPath();
      for (let x = -gridOffset; x < w; x += 42) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 64, h);
      }
      for (let y = -gridOffset; y < h; y += 42) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      state.lanes.forEach((y, lane) => {
        ctx.fillStyle = lane === 1 ? 'rgba(34, 211, 238, 0.1)' : 'rgba(148, 163, 184, 0.055)';
        this.roundRect(ctx, 18, y - 24, w - 36, 48, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(248, 250, 252, 0.18)';
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 16]);
        ctx.lineDashOffset = -state.frameCount * 2.5;
        ctx.beginPath();
        ctx.moveTo(26, y);
        ctx.lineTo(w - 26, y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
      ctx.fillRect(0, 0, w, 4);
      ctx.fillRect(0, h - 4, w, 4);
    },

    drawEntities(ctx, state) {
      const world = this.instance.world;
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const tokenComp = world.componentRegistry.get('Token');
      const enemyComp = world.componentRegistry.get('Enemy');
      const powerComp = world.componentRegistry.get('PowerUp');
      const projectileComp = world.componentRegistry.get('Projectile');
      const tokenBit = tokenComp ? tokenComp.bit : 0;
      const enemyBit = enemyComp ? enemyComp.bit : 0;
      const powerBit = powerComp ? powerComp.bit : 0;
      const projectileBit = projectileComp ? projectileComp.bit : 0;
      const query =
        this._renderQuery || (this._renderQuery = world.createQuery(['Position', 'Renderable']));
      const { dense, count } = query.set;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const tx = pos.x[idx];
        const ty = pos.y[idx];
        const size = rend.size[idx] || 30;

        if (world.getEntityId(idx) === state.droneId) {
          this.drawDrone(ctx, tx, ty + state.visualYOffset, size);
          continue;
        }

        const mask = world.entityMasks[idx];
        if (projectileBit && (mask & projectileBit) === projectileBit) {
          this.drawProjectile(ctx, tx, ty);
        } else if (tokenBit && (mask & tokenBit) === tokenBit) {
          this.drawToken(ctx, tx, ty, tokenComp.props.type[idx], size);
        } else if (enemyBit && (mask & enemyBit) === enemyBit) {
          this.drawEnemy(ctx, tx, ty, size);
        } else if (powerBit && (mask & powerBit) === powerBit) {
          this.drawPowerUp(ctx, tx, ty, powerComp.props.type[idx], size);
        }
      }
    },

    drawDrone(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      const pulse = 1 + Math.sin(performance.now() / 120) * 0.03;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 8, size * 0.7, size * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      const body = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
      body.addColorStop(0, '#312e81');
      body.addColorStop(0.45, '#22d3ee');
      body.addColorStop(1, '#7c3aed');
      ctx.fillStyle = body;
      this.roundRect(ctx, -size * 0.42, -size * 0.22, size * 0.84, size * 0.44, 14);
      ctx.fill();

      ctx.fillStyle = '#020617';
      this.roundRect(ctx, -size * 0.18, -size * 0.11, size * 0.36, size * 0.22, 8);
      ctx.fill();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-size * 0.55, -size * 0.08);
      ctx.lineTo(-size * 0.34, 0);
      ctx.moveTo(size * 0.55, -size * 0.08);
      ctx.lineTo(size * 0.34, 0);
      ctx.stroke();
      ctx.restore();
    },

    drawToken(ctx, x, y, type, size) {
      const colors =
        type === 0
          ? ['#fbbf24', '#22c55e']
          : type === 1
            ? ['#ef4444', '#f97316']
            : ['#111827', '#ef4444'];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin((performance.now() + x * 7) / 260) * 0.18);
      ctx.shadowColor = colors[0];
      ctx.shadowBlur = type === 0 ? 18 : 10;
      const grad = ctx.createRadialGradient(-size * 0.15, -size * 0.2, 2, 0, 0, size * 0.55);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, colors[0]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      this.hexPath(ctx, 0, 0, size * 0.52);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = type === 0 ? 'rgba(255,255,255,0.72)' : 'rgba(248,250,252,0.36)';
      ctx.lineWidth = 2;
      this.hexPath(ctx, 0, 0, size * 0.38);
      ctx.stroke();
      ctx.fillStyle = type === 0 ? '#052e16' : '#f8fafc';
      ctx.font = `900 ${Math.max(11, size * 0.28)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type === 0 ? 'ASDF' : type === 1 ? 'SCAM' : 'RUG', 0, 1);
      ctx.restore();
    },

    drawEnemy(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin((performance.now() + y * 3) / 180) * 0.12);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
      const grad = ctx.createLinearGradient(-size * 0.45, -size * 0.42, size * 0.45, size * 0.42);
      grad.addColorStop(0, '#450a0a');
      grad.addColorStop(0.5, '#dc2626');
      grad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.55);
      ctx.lineTo(size * 0.48, -size * 0.08);
      ctx.lineTo(size * 0.28, size * 0.46);
      ctx.lineTo(-size * 0.3, size * 0.44);
      ctx.lineTo(-size * 0.5, -size * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-size * 0.24, -size * 0.08, size * 0.15, size * 0.12);
      ctx.fillRect(size * 0.09, -size * 0.08, size * 0.15, size * 0.12);
      ctx.strokeStyle = '#fecaca';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, size * 0.24);
      ctx.lineTo(size * 0.22, size * 0.24);
      ctx.stroke();
      ctx.restore();
    },

    drawPowerUp(ctx, x, y, type, size) {
      const power = this.powerUps[type] || this.powerUps[0];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = power.color;
      ctx.shadowColor = power.color;
      ctx.shadowBlur = 16;
      this.roundRect(ctx, -size * 0.45, -size * 0.45, size * 0.9, size * 0.9, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#020617';
      ctx.font = `bold ${Math.max(10, size * 0.3)}px JetBrains Mono, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(power.name.slice(0, 2), 0, 1);
      ctx.restore();
    },

    drawProjectile(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    hexPath(ctx, x, y, r) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    },

    roundRect(ctx, x, y, w, h, r) {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    },

    stop() {
      if (this._cleanupInput) {
        this._cleanupInput();
        this._cleanupInput = null;
      }
      this._positionColliderQuery = null;
      this._lifespanQuery = null;
      this._renderQuery = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.TokenCatcher = TokenCatcher;
  window.TokenCatcher = TokenCatcher;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('tokencatcher', TokenCatcher);
})();
