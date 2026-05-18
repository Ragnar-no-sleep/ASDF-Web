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
      { icon: '👾', hp: 3, points: 50, speed: 1.5 },
      { icon: '🤖', hp: 3, points: 40, speed: 1.8 },
      { icon: '👹', hp: 3, points: 60, speed: 1.2 },
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

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // TokenCatcher Specific Components
      world.registerComponent('Drone', { lane: 'u8', cooldown: 'f32' });
      world.registerComponent('Token', { type: 'u8' }); // 0:Good, 1:Scam, 2:Skull
      world.registerComponent('Enemy', { hp: 'u8', points: 'u16' });
      world.registerComponent('PowerUp', { type: 'u8' });
      world.registerComponent('Projectile', { active: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32' });

      // State Resource
      const laneH = 50;
      const bM = 40;
      world.setResource('GameState', {
        score: 0,
        timeLeft: 34,
        gameOver: false,
        spawnTimer: 0,
        difficulty: 0,
        frameCount: 0,
        combo: 0,
        mouseX: 0,
        mouseY: 0,
        droneId: -1,
        activePowerUps: [0, 0, 0, 0], // Magnet, Slow, Double, Shield
        lanes: [
          canvas.height - bM - laneH * 2.5,
          canvas.height - bM - laneH * 1.5,
          canvas.height - bM - laneH * 0.5,
        ],
      });

      this.dom = {
        score: document.getElementById('tc-score'),
        time: document.getElementById('tc-time'),
        combo: document.getElementById('tc-combo'),
      };

      this.setupInput();
      this.preloadSprites();

      // Create Drone (Player)
      const drone = world.createEntity();
      world.addComponent(drone, 'Position');
      world.addComponent(drone, 'Velocity');
      world.addComponent(drone, 'Renderable');
      world.addComponent(drone, 'Collider');
      world.addComponent(drone, 'Drone');

      const dIdx = world.getIndex(drone);
      world.componentRegistry.get('Position').props.x[dIdx] = canvas.width / 2;
      world.componentRegistry.get('Position').props.y[dIdx] =
        world.getResource('GameState').lanes[1];
      world.componentRegistry.get('Renderable').props.iconIndex[dIdx] = 0; // mapped to 🛸
      world.componentRegistry.get('Renderable').props.size[dIdx] = 60;
      world.componentRegistry.get('Collider').props.width[dIdx] = 50;
      world.componentRegistry.get('Collider').props.height[dIdx] = 50;
      world.componentRegistry.get('Drone').props.lane[dIdx] = 1;

      world.getResource('GameState').droneId = drone;

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(this.createCollisionSystem());
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
        <div class="tc-container tc-container--neon">
          <canvas id="tc-canvas" class="game-canvas"></canvas>
          <div class="tc-grid-overlay"></div>
          <div class="game-hud-top-left game-hud-top-left--wide tc-hud">
            <div class="game-hud-stat-lg tc-stat-box">
              <span class="game-hud-stat-lg-label tc-label">DATA BYTES</span>
              <div class="tc-score-value neon-text" id="tc-score">0</div>
            </div>
            <div class="game-hud-stat-lg tc-stat-box">
              <span class="game-hud-stat-lg-label tc-label">UPTIME</span>
              <div class="tc-time-value neon-text" id="tc-time">34</div>
            </div>
            <div class="game-hud-stat-lg tc-stat-box" id="tc-combo-container">
              <span class="game-hud-stat-lg-label tc-label">LINK LEVEL</span>
              <div class="tc-combo-value neon-text" id="tc-combo">0<span class="tc-combo-suffix">x</span></div>
            </div>
          </div>
          <div class="tc-hint-bar tc-hint-neon">
            [A/D] PILOT | [W/S] LANE | [CLICK] FIRE | CATCH NODES | AVOID SCAM
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🛸', size: 60 },
        { emoji: '🔥', size: 10 },
        ...this.goodTokens.map(t => ({ emoji: t, size: 30 })),
        ...this.scamTokens.map(t => ({ emoji: t, size: 30 })),
        { emoji: this.skullToken, size: 30 },
        ...this.powerUps.map(p => ({ emoji: p.icon, size: 28 })),
        ...this.enemyTypes.map(e => ({ emoji: e.icon, size: 35 })),
        { emoji: '💥', size: 35 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const world = this.instance.world;

      const move = (dirX, laneDelta) => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        const dIdx = world.getIndex(state.droneId);
        const vProps = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Position').props;
        const drProps = world.componentRegistry.get('Drone').props;

        vProps.vx[dIdx] = dirX * 8;

        if (laneDelta !== 0) {
          const nl = drProps.lane[dIdx] + laneDelta;
          if (nl >= 0 && nl < 3) {
            drProps.lane[dIdx] = nl;
            pProps.y[dIdx] = state.lanes[nl];
          }
        }
      };

      document.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        if (key === 'a' || key === 'arrowleft') move(-1, 0);
        else if (key === 'd' || key === 'arrowright') move(1, 0);
        else if (key === 'w' || key === 'arrowup') move(0, -1);
        else if (key === 's' || key === 'arrowdown') move(0, 1);
      });

      document.addEventListener('keyup', e => {
        const key = e.key.toLowerCase();
        if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) move(0, 0);
      });

      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const state = world.getResource('GameState');
        state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      });

      canvas.addEventListener('pointerdown', e => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        const drProps = world.componentRegistry.get('Drone').props;
        const dIdx = world.getIndex(state.droneId);
        if (drProps.cooldown[dIdx] <= 0) {
          this.shoot(world, state.mouseX, state.mouseY);
          drProps.cooldown[dIdx] = 10; // ~166ms
        }
      });
    },

    shoot(world, tx, ty) {
      const state = world.getResource('GameState');
      const dIdx = world.getIndex(state.droneId);
      const pos = world.componentRegistry.get('Position').props;

      const startX = pos.x[dIdx];
      const startY = pos.y[dIdx] - 30;

      const dx = tx - startX;
      const dy = ty - startY;
      const dist = Math.hypot(dx, dy) || 1;

      const speed = 20;

      const proj = world.createEntity();
      world.addComponent(proj, 'Position');
      world.addComponent(proj, 'Velocity');
      world.addComponent(proj, 'Renderable');
      world.addComponent(proj, 'Collider');
      world.addComponent(proj, 'Projectile');
      world.addComponent(proj, 'Lifespan');

      const pIdx = world.getIndex(proj);
      world.componentRegistry.get('Position').props.x[pIdx] = startX;
      world.componentRegistry.get('Position').props.y[pIdx] = startY;
      world.componentRegistry.get('Velocity').props.vx[pIdx] = (dx / dist) * speed;
      world.componentRegistry.get('Velocity').props.vy[pIdx] = (dy / dist) * speed;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 1; // 🔥
      world.componentRegistry.get('Renderable').props.size[pIdx] = 15;
      world.componentRegistry.get('Collider').props.width[pIdx] = 15;
      world.componentRegistry.get('Collider').props.height[pIdx] = 15;
      world.componentRegistry.get('Lifespan').props.remaining[pIdx] = 100;
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        state.frameCount += dt;

        // 1 sec timer
        if (state.frameCount % 60 < dt) {
          state.timeLeft--;
          if (state.timeLeft <= 0) {
            state.gameOver = true;
            endGame(self.gameId, state.score);
          }
        }

        // Spawning
        state.spawnTimer += dt;
        const isSlowmo = state.activePowerUps[1] > 0;
        const rate = Math.max(20, 40 - state.difficulty) * (isSlowmo ? 2 : 1);
        if (state.spawnTimer >= rate) {
          self.spawnItem(world);
          state.spawnTimer = 0;
          state.difficulty += 0.05;
        }

        // PowerUps Timer
        for (let i = 0; i < 4; i++) {
          if (state.activePowerUps[i] > 0) state.activePowerUps[i] -= dt;
        }

        // Drone cooldown
        const dIdx = world.getIndex(state.droneId);
        const drProps = world.componentRegistry.get('Drone').props;
        if (drProps.cooldown[dIdx] > 0) drProps.cooldown[dIdx] -= dt;

        // Boundary for Drone
        const pos = world.componentRegistry.get('Position').props;
        const cw = self.instance.canvas.width;
        if (pos.x[dIdx] < 30) pos.x[dIdx] = 30;
        if (pos.x[dIdx] > cw - 30) pos.x[dIdx] = cw - 30;

        // Cleanup Lifespans
        const lsQuery = world.createQuery(['Lifespan']);
        const { dense, count } = lsQuery.set;
        const lsProps = world.componentRegistry.get('Lifespan').props;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          lsProps.remaining[idx] -= dt;
          if (lsProps.remaining[idx] <= 0) {
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

        const dIdx = world.getIndex(state.droneId);
        const pos = world.componentRegistry.get('Position').props;
        const col = world.componentRegistry.get('Collider').props;

        const dx = pos.x[dIdx],
          dy = pos.y[dIdx];
        const dw = col.width[dIdx],
          dh = col.height[dIdx];

        // Tokens & Enemies
        const movers = world.createQuery(['Position', 'Collider']);
        const { dense, count } = movers.set;

        const tokenProps = world.componentRegistry.get('Token');
        const enemyProps = world.componentRegistry.get('Enemy');
        const projProps = world.componentRegistry.get('Projectile');
        const powerProps = world.componentRegistry.get('PowerUp');

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === dIdx) continue;

          const ex = pos.x[idx],
            ey = pos.y[idx];
          const ew = col.width[idx],
            eh = col.height[idx];

          // Projectile Logic vs Enemies
          if (projProps && projProps.props.active[idx] !== undefined) {
            for (let j = count - 1; j >= 0; j--) {
              const jIdx = dense[j];
              if (enemyProps && enemyProps.props.hp[jIdx] !== undefined) {
                const enx = pos.x[jIdx],
                  eny = pos.y[jIdx];
                const enw = col.width[jIdx],
                  enh = col.height[jIdx];
                if (ex < enx + enw && ex + ew > enx && ey < eny + enh && ey + eh > eny) {
                  enemyProps.props.hp[jIdx]--;
                  world.destroyEntity(world.getEntityId(idx)); // destroy proj
                  if (enemyProps.props.hp[jIdx] <= 0) {
                    state.score +=
                      enemyProps.props.points[jIdx] * (state.activePowerUps[2] > 0 ? 2 : 1);
                    self.addExplosion(world, enx, eny);
                    world.destroyEntity(world.getEntityId(jIdx));
                  }
                  break;
                }
              }
            }
            continue; // Skip drone collision for projectiles
          }

          // Magnet Effect
          if (state.activePowerUps[0] > 0 && tokenProps && tokenProps.props.type[idx] === 0) {
            const dist = Math.hypot(dx - ex, dy - ey);
            if (dist < 200) {
              world.componentRegistry.get('Velocity').props.vx[idx] += ((dx - ex) / dist) * 2;
              world.componentRegistry.get('Velocity').props.vy[idx] += ((dy - ey) / dist) * 2;
            }
          }

          // Drone Collision
          if (
            dx - dw / 2 < ex + ew / 2 &&
            dx + dw / 2 > ex - ew / 2 &&
            dy - dh / 2 < ey + eh / 2 &&
            dy + dh / 2 > ey - eh / 2
          ) {
            if (tokenProps && tokenProps.props.type[idx] !== undefined) {
              const tType = tokenProps.props.type[idx];
              if (tType === 0) {
                state.score += 10 * (state.activePowerUps[2] > 0 ? 2 : 1);
                state.combo++;
              } else if (tType === 1) {
                state.score = Math.max(0, state.score - 50);
                state.combo = 0;
              } else if (tType === 2) {
                if (state.activePowerUps[3] <= 0) {
                  state.gameOver = true;
                  endGame(self.gameId, state.score);
                } else {
                  state.activePowerUps[3] = 0; // consume shield
                  self.addExplosion(world, ex, ey);
                }
              }
              world.destroyEntity(world.getEntityId(idx));
            } else if (powerProps && powerProps.props.type[idx] !== undefined) {
              state.activePowerUps[powerProps.props.type[idx]] =
                self.powerUps[powerProps.props.type[idx]].duration;
              world.destroyEntity(world.getEntityId(idx));
            } else if (enemyProps && enemyProps.props.hp[idx] !== undefined) {
              if (state.activePowerUps[3] <= 0) {
                state.gameOver = true;
                endGame(self.gameId, state.score);
              } else {
                state.activePowerUps[3] = 0;
                self.addExplosion(world, ex, ey);
              }
              world.destroyEntity(world.getEntityId(idx));
            }
          }

          // Offscreen cleanup
          if (ey > self.instance.canvas.height + 50) {
            world.destroyEntity(world.getEntityId(idx));
          }
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

      const isSlowmo = state.activePowerUps[1] > 0;
      const baseSpeed = (2 + state.difficulty * 0.1) * (isSlowmo ? 0.5 : 1);

      const roll = Math.random();
      if (roll < 0.05) {
        // PowerUp
        world.addComponent(e, 'PowerUp');
        const pType = Math.floor(Math.random() * this.powerUps.length);
        world.componentRegistry.get('PowerUp').props.type[idx] = pType;
        rend.iconIndex[idx] = 2; // Icon resolution done in draw()
        rend.size[idx] = 28;
        col.width[idx] = 28;
        col.height[idx] = 28;
        vel.vy[idx] = baseSpeed;
      } else if (roll < 0.15) {
        // Enemy
        world.addComponent(e, 'Enemy');
        const enType = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];
        world.componentRegistry.get('Enemy').props.hp[idx] = enType.hp;
        world.componentRegistry.get('Enemy').props.points[idx] = enType.points;
        rend.iconIndex[idx] = 3;
        rend.size[idx] = 35;
        col.width[idx] = 35;
        col.height[idx] = 35;
        vel.vy[idx] = baseSpeed * 1.5;
      } else {
        // Token
        world.addComponent(e, 'Token');
        const tProps = world.componentRegistry.get('Token').props;
        if (roll < 0.25) {
          tProps.type[idx] = 2;
          rend.iconIndex[idx] = 6;
          vel.vy[idx] = baseSpeed * 1.2;
        } // Skull
        else if (roll < 0.4) {
          tProps.type[idx] = 1;
          rend.iconIndex[idx] = 5;
          vel.vy[idx] = baseSpeed * 1.3;
        } // Scam
        else {
          tProps.type[idx] = 0;
          rend.iconIndex[idx] = 4;
          vel.vy[idx] = baseSpeed;
        } // Good
        rend.size[idx] = 30;
        col.width[idx] = 30;
        col.height[idx] = 30;
      }
    },

    addExplosion(world, x, y) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Lifespan');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 7; // Explosion
      world.componentRegistry.get('Renderable').props.size[idx] = 35;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 20;
    },

    updateUI(state) {
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.time) this.dom.time.textContent = Math.ceil(state.timeLeft);
      if (this.dom.combo)
        this.dom.combo.innerHTML = `${state.combo}<span class="tc-combo-suffix">x</span>`;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      // BG
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, w, h);

      // Lanes
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 2;
      state.lanes.forEach(ly => {
        ctx.beginPath();
        ctx.moveTo(0, ly);
        ctx.lineTo(w, ly);
        ctx.stroke();
      });

      // Mapping for rendering ECS
      const query = this.instance.world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;
      const rend = this.instance.world.componentRegistry.get('Renderable').props;
      const tk = this.instance.world.componentRegistry.get('Token');
      const en = this.instance.world.componentRegistry.get('Enemy');
      const pu = this.instance.world.componentRegistry.get('PowerUp');

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        let icon = '❓';

        if (idx === state.droneId) {
          icon = state.activePowerUps[3] > 0 ? '🛡️' : '🛸';
        } else if (rend.iconIndex[idx] === 1) {
          icon = '🔥';
        } else if (rend.iconIndex[idx] === 7) {
          icon = '💥';
        } else if (tk && tk.props.type[idx] !== undefined) {
          const t = tk.props.type[idx];
          icon =
            t === 0
              ? this.goodTokens[idx % this.goodTokens.length]
              : t === 1
                ? this.scamTokens[idx % this.scamTokens.length]
                : this.skullToken;
        } else if (en && en.props.hp[idx] !== undefined) {
          icon = this.enemyTypes[idx % this.enemyTypes.length].icon;
        } else if (pu && pu.props.type[idx] !== undefined) {
          icon = this.powerUps[pu.props.type[idx]].icon;
        }

        SpriteCache.draw(ctx, icon, pos.x[idx], pos.y[idx], rend.size[idx]);
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
