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
        debug: false,
      });

      // 11/10: Resize early for correct lane calculation
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);
      }

      this._positionColliderQuery = world.createQuery(['Position', 'Collider']);
      this._renderQuery = world.createQuery(['Position', 'Renderable']);

      // Components
      world.registerComponent('Drone', { lane: 'u8', cooldown: 'f32' });
      world.registerComponent('Token', { type: 'u8' }); // 0:Good, 1:Scam, 2:Skull
      world.registerComponent('Enemy', { hp: 'u8', points: 'u8' });
      world.registerComponent('PowerUp', { type: 'u8' });
      world.registerComponent('Projectile', { active: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32' });

      // Register Personality Components
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      this._lifespanQuery = world.createQuery(['Lifespan']);

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
      world.addComponent(drone, 'Rotation');
      world.addComponent(drone, 'Scale');

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

      this.instance.onUpdate = (dt, dtMs) => {
        const state = world.getResource('GameState');
        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }
        return shouldFreeze;
      };

      this.instance.onRender = alpha => {
        if (this.juice) this.juice.renderPre();
        this.draw(alpha, defaultRender);
        if (this.juice) this.juice.renderPost();
      };

      // Systems
      world.addSystem(ASDF.PersonalitySystem.create());
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
        <div class="tc-container">
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
        for (let i = 0; i < state.activePowerUps.length; i += 1) {
          state.activePowerUps[i] = Math.max(0, state.activePowerUps[i] - dt);
        }

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
                state.score += state.activePowerUps[2] > 0 ? 20 : 10;
              } else if (type === 1) {
                state.score = Math.max(0, state.score - (state.activePowerUps[3] > 0 ? 10 : 50));
              } else if (type === 2) {
                if (state.activePowerUps[3] > 0) {
                  state.activePowerUps[3] = 0;
                  state.score += 5;
                } else {
                  state.gameOver = true;
                  if (typeof endGame === 'function') endGame(self.gameId, state.score);
                }
              }
              world.destroyEntity(world.getEntityId(idx));
            } else if (enemyBit && (entityMask & enemyBit) === enemyBit) {
              if (state.activePowerUps[3] > 0) {
                state.activePowerUps[3] = 0;
                world.destroyEntity(world.getEntityId(idx));
              } else {
                state.gameOver = true;
                if (typeof endGame === 'function') endGame(self.gameId, state.score);
              }
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
      vel.vy[idx] =
        Math.min(9, 2 + state.difficulty * 0.08) * (state.activePowerUps[1] > 0 ? 0.72 : 1);

      const roll = Math.random();
      if (roll < 0.15) {
        world.addComponent(e, 'Enemy');
        const typeIdx = Math.floor(Math.random() * this.enemyTypes.length);
        rend.iconIndex[idx] = 7 + typeIdx; // Map to icons array
        rend.size[idx] = 35;
        col.width[idx] = 35;
        col.height[idx] = 35;
      } else if (roll < 0.24) {
        world.addComponent(e, 'PowerUp');
        const typeIdx = Math.floor(Math.random() * this.powerUps.length);
        const power = world.componentRegistry.get('PowerUp').props;
        power.type[idx] = typeIdx;
        rend.iconIndex[idx] = 3 + typeIdx;
        rend.size[idx] = 32;
        col.width[idx] = 32;
        col.height[idx] = 32;
      } else {
        world.addComponent(e, 'Token');
        const tProps = world.componentRegistry.get('Token').props;
        if (roll < 0.38) {
          tProps.type[idx] = 2;
          rend.iconIndex[idx] =
            7 + this.enemyTypes.length + this.goodTokens.length + this.scamTokens.length;
        } // Skull
        else if (roll < 0.58) {
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
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          seed: state.score || 0,
        });
      } else {
        ctx.fillStyle = '#12071f';
        ctx.fillRect(0, 0, w, h);
      }

      state.lanes.forEach((y, lane) => {
        ctx.fillStyle = lane === 1 ? 'rgba(255, 204, 0, 0.1)' : 'rgba(255, 244, 204, 0.05)';
        this.roundRect(ctx, 18, y - 18, w - 36, 36, 8);
        ctx.fill();
      });

      ctx.fillStyle = 'rgba(255, 204, 0, 0.18)';
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
          this.drawDrone(ctx, tx, ty + state.visualYOffset, size, state);
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

    drawDrone(ctx, x, y, size, state = null) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.24, size * 0.34, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3b120b';
      this.roundRect(ctx, -size * 0.32, -size * 0.08, size * 0.64, size * 0.26, 9);
      ctx.fill();
      ctx.fillStyle = '#ff6b35';
      this.roundRect(ctx, -size * 0.24, -size * 0.2, size * 0.48, size * 0.34, 10);
      ctx.fill();
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.09, size * 0.16, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(-size * 0.24, size * 0.08, size * 0.055, 0, Math.PI * 2);
      ctx.arc(size * 0.24, size * 0.08, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
      if (state?.activePowerUps?.[3] > 0) {
        ctx.strokeStyle = 'rgba(255,242,179,0.86)';
        ctx.lineWidth = Math.max(2, size * 0.04);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.46, size * 0.34, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawToken(ctx, x, y, type, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin((performance.now() + x * 7) / 260) * 0.12);
      if (type === 0) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff2b3';
        ctx.lineWidth = Math.max(1.4, size * 0.07);
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 1) {
        ctx.fillStyle = '#ff6b35';
        this.roundRect(ctx, -size * 0.35, -size * 0.35, size * 0.7, size * 0.7, 7);
        ctx.fill();
        ctx.strokeStyle = '#3b120b';
        ctx.lineWidth = Math.max(2, size * 0.09);
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, size * 0.2);
        ctx.lineTo(size * 0.2, -size * 0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#3b120b';
        this.hexPath(ctx, 0, 0, size * 0.42);
        ctx.fill();
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(-size * 0.13, -size * 0.05, size * 0.07, 0, Math.PI * 2);
        ctx.arc(size * 0.13, -size * 0.05, size * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = Math.max(1.5, size * 0.05);
        ctx.beginPath();
        ctx.moveTo(-size * 0.16, size * 0.15);
        ctx.lineTo(size * 0.16, size * 0.15);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawEnemy(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin((performance.now() + y * 3) / 180) * 0.08);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.24, size * 0.32, size * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b120b';
      this.roundRect(ctx, -size * 0.24, -size * 0.08, size * 0.48, size * 0.18, 6);
      ctx.fill();
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(-size * 0.11, -size * 0.005, size * 0.04, 0, Math.PI * 2);
      ctx.arc(size * 0.11, -size * 0.005, size * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawPowerUp(ctx, x, y, type, size) {
      const colors = ['#ffcc00', '#ff6b35', '#ff2d95', '#fff2b3'];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = colors[type] || '#ffcc00';
      this.roundRect(ctx, -size * 0.36, -size * 0.36, size * 0.72, size * 0.72, 6);
      ctx.fill();
      ctx.rotate(-Math.PI / 4);
      ctx.strokeStyle = '#090510';
      ctx.fillStyle = '#090510';
      ctx.lineWidth = Math.max(2, size * 0.075);
      if (type === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.16, Math.PI * 0.2, Math.PI * 1.8);
        ctx.stroke();
        ctx.fillRect(size * 0.12, -size * 0.12, size * 0.08, size * 0.08);
      } else if (type === 1) {
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size * 0.13);
        ctx.moveTo(0, 0);
        ctx.lineTo(size * 0.12, 0);
        ctx.stroke();
      } else if (type === 2) {
        ctx.beginPath();
        ctx.arc(-size * 0.08, 0, size * 0.09, 0, Math.PI * 2);
        ctx.arc(size * 0.08, 0, size * 0.09, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.18);
        ctx.lineTo(size * 0.17, -size * 0.07);
        ctx.quadraticCurveTo(size * 0.12, size * 0.16, 0, size * 0.2);
        ctx.quadraticCurveTo(-size * 0.12, size * 0.16, -size * 0.17, -size * 0.07);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    },

    drawProjectile(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
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
