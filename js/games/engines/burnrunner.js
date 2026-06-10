/**
 * ASDF Games - Burn Runner Engine
 *
 * Endless modular runner with pressure curve.
 * Visual style keeps the ASDF cyber identity while staying readable
 * on desktop and mobile viewports.
 */

'use strict';

(function () {
  const CONFIG = {
    playerSize: 46,
    playerLift: 8,
    playerBaseX: 96,
    playerBaseY: 0.22,
    physics: {
      jumpForce: -8.8,
      gravity: 0.34,
      maxSpeed: 14.6,
      acceleration: 0.032,
      maxAirJumps: 1,
      coyoteFrames: 7,
      jumpBufferFrames: 10,
    },
    baseSpeed: 5.9,
    speedCap: 14.2,
    levelDistance: 360,
    distanceScale: 0.0014,
    maxDifficultyDistance: 2_000,
    spawn: {
      baseInterval: 62,
      minInterval: 25,
      obstacleChanceBase: 0.64,
      obstacleChanceGrowth: 0.06,
      baseMaxHazards: 11,
      maxHazards: 34,
      collectibleChance: 0.38,
    },
    icons: ['S', 'R', 'B', 'C', 'T', 'L'],
    colors: {
      player: '#dc2626',
      playerTrim: '#ffcc00',
      ground: '#06050d',
      groundGrid: '#ffcc00',
      skyline: '#1f1338',
      skylineRoof: '#0b1222',
      hazard: ['#ff6b35', '#ff2d95', '#f97316', '#f43f5e', '#ffcc00', '#fff7ed'],
      collectible: '#ffcc00',
      collectText: '#fef08a',
    },
    horizon: 0.23,
    citySpeed: 1.2,
    roadPulse: 0.006,
  };

  const BURN_TYPES = [
    {
      name: 'SCAM',
      width: 52,
      height: 34,
      reward: 0,
      speedScale: 1.0,
      icon: 'S',
      body: '#ff6b35',
      accent: '#3b120b',
      panel: '#fff7ed',
      kind: 'car',
      palette: ['#ff6b35', '#ff2d95', '#3b120b', '#ffcc00', '#fff7ed'],
      danger: '#ffcc00',
    },
    {
      name: 'RUG',
      width: 48,
      height: 36,
      reward: 0,
      speedScale: 1.08,
      icon: 'R',
      body: '#f97316',
      accent: '#3b120b',
      panel: '#fff7ed',
      kind: 'truck',
      palette: ['#f97316', '#ffcc00', '#3b120b', '#fff7ed', '#ff2d95'],
      danger: '#ffcc00',
    },
    {
      name: 'BURN',
      width: 44,
      height: 34,
      reward: 0,
      speedScale: 1.14,
      icon: 'B',
      body: '#ff2d95',
      accent: '#3b120b',
      panel: '#fff7ed',
      kind: 'car',
      palette: ['#ff2d95', '#ff6b35', '#3b120b', '#ffcc00', '#fff7ed'],
      danger: '#ffcc00',
    },
    {
      name: 'CHAIN',
      width: 56,
      height: 38,
      reward: 0,
      speedScale: 1.24,
      icon: 'C',
      body: '#f43f5e',
      accent: '#3b120b',
      panel: '#fff7ed',
      kind: 'car',
      palette: ['#f43f5e', '#ff6b35', '#3b120b', '#ffcc00', '#fff7ed'],
      danger: '#ffcc00',
    },
  ];

  const BurnRunner = {
    version: '2.3.0',
    gameId: 'burnrunner',
    instance: null,
    juice: null,
    _cleanupInput: null,
    _collisionQuery: null,
    _entityQuery: null,
    _layout: null,

    start(gameId) {
      this.stop();

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('br-canvas');
      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 900,
        debug: false,
      });

      this.instance.resize();

      // Init Juice for 11/10 addictiveness
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);
      }

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('JUMP', ['Space', 'ArrowUp', 'KeyW']);
      }

      world.registerComponent('Player', { jumpsLeft: 'u8', fever: 'f32' });
      world.registerComponent('Obstacle', { type: 'u8' });
      world.registerComponent('Collectible', { value: 'u16' });

      const canvasH = this.instance.canvas.height;
      const canvasW = this.instance.canvas.width;
      const groundY = canvasH - Math.max(56, Math.round(canvasH * 0.12));
      const coyoteFrames = CONFIG.physics.coyoteFrames;
      const playerX = (canvasW * CONFIG.playerBaseX) / 1000 + 80;

      world.setResource('GameState', {
        distance: 0,
        elapsed: 0,
        tokens: 0,
        speed: CONFIG.baseSpeed,
        groundY,
        playerX,
        playerId: -1,
        jumpBuffer: 0,
        jumpBufferFrames: CONFIG.physics.jumpBufferFrames,
        coyoteTimer: 0,
        coyoteFrames,
        maxJumps: 2,
        gameOver: false,
        spawnTimer: 0,
        combo: 0,
        bestCombo: 0,
        level: 1,
        intensity: 1,
        collectiblesMissed: 0,
        feverActive: false,
        feverMeter: 0,
      });

      this.dom = {
        distance: document.getElementById('br-distance'),
        tokens: document.getElementById('br-tokens'),
        combo: document.getElementById('br-combo'),
        level: document.getElementById('br-level'),
        intensity: document.getElementById('br-intensity'),
      };
      this.setupInput();

      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Collider');
      world.addComponent(player, 'Player');

      const pIdx = world.getIndex(player);
      world.componentRegistry.get('Position').props.x[pIdx] = playerX;
      world.componentRegistry.get('Position').props.y[pIdx] =
        groundY - CONFIG.playerSize - CONFIG.playerLift;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0;
      world.componentRegistry.get('Renderable').props.size[pIdx] = CONFIG.playerSize;
      world.componentRegistry.get('Collider').props.width[pIdx] = CONFIG.playerSize * 0.74;
      world.componentRegistry.get('Collider').props.height[pIdx] = CONFIG.playerSize * 0.62;
      world.componentRegistry.get('Player').props.jumpsLeft[pIdx] =
        world.getResource('GameState').maxJumps;
      world.getResource('GameState').playerId = player;

      this._layout = { floorY: groundY };
      this._entityQuery = world.createQuery(['Position', 'Collider', 'Renderable']);
      this._collisionQuery = world.createQuery(['Position', 'Obstacle', 'Collider']);

      this.instance.onUpdate = (dt, dtMs) => {
        const state = world.getResource('GameState');

        // Update Juice
        if (this.juice) {
          this.juice.update(dt / 60, dtMs);
        }

        if (kernel.services?.hud) {
          kernel.services.hud.update(this.gameId, state);
        }
      };

      this.instance.onRender = () => {
        if (this.juice) this.juice.renderPre();
        this.draw();
        if (this.juice) this.juice.renderPost();
      };

      world.addSystem(ASDF.PersonalitySystem.create());
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
            <div class="game-hud-stat">DIST: <span id="br-distance" class="game-hud-stat-value br-stat-value--distance">0m</span></div>
            <div class="game-hud-stat">TOKENS: <span id="br-tokens" class="game-hud-stat-value br-stat-value--tokens">0</span></div>
            <div class="game-hud-stat">COMBO: <span id="br-combo" class="game-hud-stat-value">x0</span></div>
          </div>
          <div class="game-hud-top-right br-difficulty">
            <div class="game-hud-stat">INTENSITY: <span id="br-intensity" class="game-hud-stat-value br-stat-value--intensity">x1</span></div>
            <div class="game-hud-stat">LEVEL: <span id="br-level" class="game-hud-stat-value br-stat-value--level">1</span></div>
          </div>
          <div class="br-hint-bar br-hint-bar--wide">Touch / Space / Arrow Up to jump - jump between traffic for maximum speed</div>
        </div>
      `;
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const queueJump = e => {
        if (e && e.cancelable) e.preventDefault();
        const state = this.instance.world.getResource('GameState');
        if (state.gameOver) return;
        state.jumpBuffer = state.jumpBufferFrames;
      };

      const onKeyDown = e => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') queueJump(e);
      };

      document.addEventListener('keydown', onKeyDown);
      canvas.addEventListener('pointerdown', queueJump);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        canvas.removeEventListener('pointerdown', queueJump);
      };
    },

    createRunnerSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const diff = self.getDifficulty(state);
        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;
        const coll = world.componentRegistry.get('Collider').props;

        state.elapsed += dt / 60;
        state.level = diff.level;
        state.intensity = diff.intensity;
        state.distance += Math.max(0.2, state.speed) * 0.1 * dt;
        state.speed = Math.min(
          CONFIG.speedCap,
          CONFIG.baseSpeed +
            state.distance * CONFIG.distanceScale +
            diff.level * 0.42 * diff.speedScale
        );

        const groundLine = state.groundY;
        const px = pos.x[pIdx];
        const py = pos.y[pIdx];
        const pW = coll.width[pIdx];
        const pH = coll.height[pIdx];
        const ph = pH;
        const wasGrounded = py + ph >= groundLine - 1;
        if (py + ph > groundLine) {
          const wasFalling = vel.vy[pIdx] > 0;
          pos.y[pIdx] = groundLine - ph;
          vel.vy[pIdx] = 0;
          pProps.jumpsLeft[pIdx] = state.maxJumps;

          if (wasFalling && self.juice) {
            self.juice.emit('LAND', px + pW / 2, groundLine);
          }
        }

        if (wasGrounded) state.coyoteTimer = state.coyoteFrames;
        else if (state.coyoteTimer > 0) state.coyoteTimer -= dt;

        if (state.jumpBuffer > 0) {
          state.jumpBuffer -= dt;
          const canCoyoteJump = state.coyoteTimer > 0 && pProps.jumpsLeft[pIdx] === state.maxJumps;
          if (pProps.jumpsLeft[pIdx] > 0 || canCoyoteJump) {
            vel.vy[pIdx] = CONFIG.physics.jumpForce;
            pProps.jumpsLeft[pIdx] = Math.max(0, pProps.jumpsLeft[pIdx] - 1);
            state.jumpBuffer = 0;
            state.coyoteTimer = 0;

            if (self.juice) {
              self.juice.emit('JUMP', px + pW / 2, py + pH);
              // Removed shake here based on user feedback
            }
          }
        }

        vel.vy[pIdx] += CONFIG.physics.gravity * dt;

        // Fever speed boost
        const feverMult = state.feverActive ? 1.4 : 1.0;

        vel.vx[pIdx] =
          CONFIG.physics.maxSpeed *
          (0.42 + state.level * 0.02) *
          Math.min(1.12, diff.speedScale) *
          feverMult;
        vel.vx[pIdx] = Math.min(vel.vx[pIdx], CONFIG.physics.maxSpeed * 1.5);
        state.speed = Math.min(
          CONFIG.speedCap * feverMult,
          state.speed * (1 + CONFIG.physics.acceleration * dt * 0.22)
        );
        pos.x[pIdx] = state.playerX;

        const playerBottom = state.groundY;

        // Fever meter logic
        if (state.feverActive) {
          state.feverMeter -= dt * 0.15;
          if (state.feverMeter <= 0) {
            state.feverActive = false;
            state.feverMeter = 0;
          }
        } else {
          state.feverMeter = Math.max(0, state.feverMeter - dt * 0.02);
          if (state.feverMeter >= 100) {
            state.feverActive = true;
            if (self.juice) {
              self.juice.textPop(px, py - 40, 'FEVER MODE!', {
                color: '#ffcc00',
                size: 32,
                lifetime: 30,
              });
            }
          }
        }

        state.spawnTimer += dt;
        const activeHazards = self._collisionQuery ? self._collisionQuery.set.count : 0;
        const activeAll = self._entityQuery ? self._entityQuery.set.count - 1 : 0;
        const maxHazards = Math.min(
          CONFIG.spawn.maxHazards,
          CONFIG.spawn.baseMaxHazards + diff.level * 1.5
        );
        const spawnInterval = Math.max(
          CONFIG.spawn.minInterval,
          (CONFIG.spawn.baseInterval -
            diff.level * 4.2 -
            state.speed * 1.4 +
            (state.collectiblesMissed || 0) * 2) /
            feverMult
        );
        const spawnChance = Math.min(
          0.96,
          CONFIG.spawn.obstacleChanceBase + diff.level * CONFIG.spawn.obstacleChanceGrowth
        );

        if (activeHazards < maxHazards && state.spawnTimer > spawnInterval) {
          if (Math.random() < spawnChance && activeAll < maxHazards + 3) {
            self.spawnEntity(world, diff, true);
          } else if (Math.random() < CONFIG.spawn.collectibleChance) {
            self.spawnEntity(world, diff, false);
          }
          state.spawnTimer = 0;
        }

        const { dense, count } = self._entityQuery
          ? self._entityQuery.set
          : { dense: [], count: 0 };
        const obsComp = world.componentRegistry.get('Obstacle');
        const colComp = world.componentRegistry.get('Collectible');
        const obsBit = obsComp ? obsComp.bit : 0;
        const colBit = colComp ? colComp.bit : 0;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === pIdx) continue;
          const ex = pos.x[idx];
          const ey = pos.y[idx];
          const ew = coll.width[idx];
          const eh = coll.height[idx];
          pos.x[idx] -= state.speed * dt * (0.32 + state.intensity * 0.1);

          if (ex < -140) {
            if (obsBit && (world.entityMasks[idx] & obsBit) === obsBit) {
              state.combo = 0;
            }
            world.destroyEntity(world.getEntityId(idx));
            continue;
          }

          const hit = px < ex + ew && px + pW > ex && py < ey + eh && py + pH > ey;

          if (hit && obsBit && (world.entityMasks[idx] & obsBit) === obsBit) {
            if (state.feverActive) {
              // Fever mode grants invulnerability and destroys obstacles
              world.destroyEntity(world.getEntityId(idx));
              state.score = (state.score || 0) + 50;
              if (self.juice) {
                self.juice.impact(ex + ew / 2, ey + eh / 2, { intensity: 'light' });
                self.juice.textPop(ex, ey, 'SMASHED!', { color: '#ffcc00' });
              }
              continue;
            }

            state.gameOver = true;
            state.combo = 0;

            if (self.juice) {
              self.juice.impact(px + pW / 2, py + pH / 2, { intensity: 'death' }); // Just explosion, no shake
            }

            if (typeof endGame === 'function') endGame(self.gameId, Math.floor(state.distance));
          } else if (hit && colBit && (world.entityMasks[idx] & colBit) === colBit) {
            const collectible = world.componentRegistry.get('Collectible');
            const value = collectible.props.value[idx] || 1;
            state.tokens += value;
            state.combo++;
            state.feverMeter = Math.min(
              100,
              state.feverMeter + 5 + Math.min(10, state.combo * 0.5)
            );
            state.bestCombo = Math.max(state.bestCombo, state.combo);
            state.distance += value * Math.min(8, state.combo);

            if (self.juice) {
              self.juice.emit('COLLECT', ex + ew / 2, ey + eh / 2);
              self.juice.textPop(ex, ey, `+${value}`, { color: '#ffcc00', size: 24, lifetime: 25 });
              if (state.combo % 10 === 0) {
                self.juice.textPop(px, py - 60, `${state.combo} COMBO!`, {
                  color: '#fbbf24',
                  size: 28,
                  lifetime: 35,
                });
              }
            }

            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(state);
      };
    },

    getDifficulty(state) {
      const level = 1 + Math.floor(state.distance / CONFIG.levelDistance);
      const progression = Math.min(1, state.distance / CONFIG.maxDifficultyDistance);
      const intensity = 1 + progression * 0.82;
      const speedScale = 1 + Math.min(1.6, level * 0.12);
      return { level, intensity, speedScale };
    },

    spawnEntity(world, diff, isObstacle) {
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

      if (isObstacle) {
        world.addComponent(e, 'Obstacle');
        const typeIdx = Math.floor(Math.random() * BURN_TYPES.length);
        const type = BURN_TYPES[typeIdx];
        const obstacle = world.componentRegistry.get('Obstacle').props;
        pos.y[idx] = state.groundY - type.height - CONFIG.playerLift;
        rend.iconIndex[idx] = typeIdx + 1;
        rend.size[idx] = type.width;
        coll.width[idx] = type.width * (0.92 + Math.min(0.34, diff.intensity * 0.11));
        coll.height[idx] = type.height * (0.92 + Math.min(0.28, diff.intensity * 0.1));
        obstacle.type[idx] = typeIdx;
      } else {
        world.addComponent(e, 'Collectible');
        const collectible = world.componentRegistry.get('Collectible').props;
        pos.y[idx] = state.groundY - 95 - Math.random() * 88 - CONFIG.playerLift;
        rend.iconIndex[idx] = 5;
        rend.size[idx] = 27 + Math.random() * 4;
        coll.width[idx] = 24 + Math.random() * 8;
        coll.height[idx] = 24 + Math.random() * 8;
        collectible.value[idx] = Math.random() < 0.18 ? 3 : 1;
      }
    },

    updateUI(state) {
      if (this.dom.distance) this.dom.distance.textContent = `${Math.floor(state.distance)}m`;
      if (this.dom.tokens) this.dom.tokens.textContent = state.tokens;
      if (this.dom.combo) this.dom.combo.textContent = `x${state.combo}`;
      if (this.dom.level) this.dom.level.textContent = state.level || 1;
      if (this.dom.intensity) this.dom.intensity.textContent = `x${state.intensity.toFixed(2)}`;
    },

    draw() {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');
      const world = this.instance.world;
      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;

      if (visuals) {
        // Dynamic backdrop based on fever
        const theme = state.feverActive ? 'racer' : 'default';
        visuals.drawBackdrop(ctx, w, h, {
          theme: theme,
          seed: state.level,
          withNoise: true,
          allowNoise: true,
          distance: state.distance,
        });

        // Speed effects
        if (state.feverActive) {
          visuals.drawScanlines(ctx, w, h, { alpha: 0.15, density: 4 });
        }

        this.drawScrollingGround(ctx, w, h, state);
      } else {
        const skyGrad = ctx.createLinearGradient(0, 0, 0, state.groundY);
        skyGrad.addColorStop(0, '#07081a');
        skyGrad.addColorStop(1, '#1f1538');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);
        this.drawParallaxCity(ctx, w, h, state);
        this.drawGround(ctx, w, h, state);
      }

      // Movement "Wind" lines to show speed
      ctx.save();
      ctx.strokeStyle = state.feverActive ? 'rgba(255, 204, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const lineCount = state.feverActive ? 25 : 8;
      for (let i = 0; i < lineCount; i++) {
        const seed = (i * 137.5) % w;
        const ly = (i * 40 + state.distance * 2) % h;
        const lx = (seed - state.distance * 5) % w;
        const len = 30 + (i % 5) * 20;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + len, ly);
        ctx.stroke();
      }
      ctx.restore();

      const { dense, count } = this._entityQuery ? this._entityQuery.set : { dense: [], count: 0 };
      const obstacleComp = world.componentRegistry.get('Obstacle');
      const collectibleComp = world.componentRegistry.get('Collectible');
      const obsBit = obstacleComp ? obstacleComp.bit : 0;
      const colBit = collectibleComp ? collectibleComp.bit : 0;
      const coll = world.componentRegistry.get('Collider').props;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const x = pos.x[idx];
        const y = pos.y[idx];

        // Get Rotation & Scale if they exist
        const rotComp = world.componentRegistry.get('Rotation');
        const scaleComp = world.componentRegistry.get('Scale');
        const angle = rotComp ? rotComp.props.angle[idx] : 0;
        const scaleX = scaleComp ? scaleComp.props.x[idx] : 1;
        const scaleY = scaleComp ? scaleComp.props.y[idx] : 1;

        const isPlayer = idx === pIdx;
        if (isPlayer) {
          ctx.save();
          ctx.translate(x + coll.width[pIdx] * 0.5, y + coll.height[pIdx] * 0.5);
          ctx.rotate(angle);
          ctx.scale(scaleX, scaleY);
          this.drawBurnRunnerCharacter(ctx, 0, 0, state);
          ctx.restore();
          continue;
        }

        const isObstacle = obsBit && (world.entityMasks[idx] & obsBit) === obsBit;
        const isCollectible = colBit && (world.entityMasks[idx] & colBit) === colBit;
        const entityW = rend.size[idx] || 34;

        if (isObstacle) {
          const typeIndex = world.componentRegistry.get('Obstacle').props.type[idx] || 0;
          ctx.save();
          ctx.translate(x + coll.width[idx] * 0.5, y + coll.height[idx] * 0.5);
          ctx.rotate(angle);
          ctx.scale(scaleX, scaleY);
          this.drawEnhancedHazard(ctx, 0, 0, entityW, typeIndex, state);
          ctx.restore();
        } else if (isCollectible) {
          const collect = world.componentRegistry.get('Collectible');
          const v = collect.props.value[idx] || 1;
          ctx.save();
          ctx.translate(x + coll.width[idx] * 0.5, y + coll.height[idx] * 0.5);
          ctx.rotate(angle);
          ctx.scale(scaleX, scaleY);
          this.drawCollectible(ctx, 0, 0, entityW, v);
          ctx.restore();
        }
      }

      // Draw Fever Meter HUD
      this.drawFeverBar(ctx, w, h, state);
    },

    drawScrollingGround(ctx, w, h, state) {
      const groundY = state.groundY;

      // Ground base with deep purple gradient for depth
      const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
      groundGrad.addColorStop(0, '#06050d');
      groundGrad.addColorStop(1, '#1a0b2e');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, groundY, w, h - groundY);

      // FAST SIDE-SCROLLING GRID
      ctx.save();
      ctx.strokeStyle = state.feverActive ? 'rgba(255, 204, 0, 0.4)' : 'rgba(251, 146, 60, 0.2)';
      ctx.lineWidth = 2;

      const speedMult = state.feverActive ? 25 : 12;
      const gridSize = 100;
      // Scroll horizontally for a side-scroller!
      const scrollX = (state.distance * speedMult) % gridSize;

      // Vertical grid lines moving left rapidly
      for (let x = -gridSize; x < w + gridSize; x += gridSize) {
        ctx.beginPath();
        // Slight slant for dynamic speed effect
        ctx.moveTo(x - scrollX + 40, groundY);
        ctx.lineTo(x - scrollX - 40, h);
        ctx.stroke();
      }

      // Horizontal perspective lines (closer lines are thicker)
      const hLines = 4;
      for (let i = 0; i < hLines; i++) {
        const ratio = i / (hLines - 1);
        const lineY = groundY + ratio * ratio * (h - groundY); // Exponential spacing
        ctx.globalAlpha = 0.3 + ratio * 0.7;
        ctx.lineWidth = 1 + ratio * 3;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(w, lineY);
        ctx.stroke();
      }
      ctx.restore();

      // Side glow rails (The "track" edge)
      const railGlow = Math.sin(performance.now() * 0.01) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(255, 204, 0, ${railGlow})`;
      ctx.fillRect(0, groundY, w, 3);
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 10;
      ctx.fillRect(0, groundY, w, 1);
      ctx.shadowBlur = 0;
    },

    drawBurnRunnerCharacter(ctx, x, y, state) {
      const hover = Math.sin(performance.now() / 100) * 3;

      ctx.save();
      ctx.translate(x, y + hover);

      // Engine glow / Trail (The "Burn")
      const engineGlow = Math.abs(Math.sin(performance.now() / 50));
      ctx.fillStyle = state.feverActive
        ? `rgba(0, 245, 255, ${0.5 + engineGlow * 0.5})`
        : `rgba(255, 204, 0, ${0.5 + engineGlow * 0.5})`;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-50 - (state.feverActive ? 30 : 0), -5 + engineGlow * 10);
      ctx.lineTo(-20, 10);
      ctx.fill();

      // Ship Chassis (Wipeout/F-Zero style sleek wedge)
      ctx.fillStyle = '#0f172a'; // Dark chassis
      ctx.beginPath();
      ctx.moveTo(35, 5); // Nose
      ctx.lineTo(-20, -10); // Top tail
      ctx.lineTo(-20, 15); // Bottom tail
      ctx.closePath();
      ctx.fill();

      // Cockpit / Canopy
      ctx.fillStyle = state.feverActive ? '#00f5ff' : '#0ea5e9';
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-10, 2);
      ctx.closePath();
      ctx.fill();

      // Wing/Accent lines
      ctx.strokeStyle = state.feverActive ? '#00f5ff' : '#ff2d95';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(20, 5);
      ctx.lineTo(-25, -15);
      ctx.lineTo(-25, 20);
      ctx.closePath();
      ctx.stroke();

      // Glow effects
      if (state.feverActive) {
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = 15;
        ctx.stroke();
      }

      ctx.restore();
    },

    drawFeverBar(ctx, w, h, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (!visuals) return;

      const barW = 200;
      const barH = 12;
      const bx = (w - barW) / 2;
      const by = 20;

      ctx.save();
      visuals.drawStatBar(ctx, bx, by, barW, barH, state.feverMeter / 100, {
        theme: state.feverActive ? 'racer' : 'default',
        track: 'rgba(0,0,0,0.5)',
      });

      const label = state.feverActive ? '🔥 FEVER ACTIVE 🔥' : 'FEVER METER';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Orbitron';
      ctx.textAlign = 'center';
      ctx.fillText(label, w / 2, by - 8);
      ctx.restore();
    },

    drawPlayerCharacter(ctx, x, y, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      const run = Math.sin(performance.now() / 100);
      const lift = Math.sin(performance.now() / 150) * 2;

      ctx.save();
      ctx.translate(x, y + lift);

      if (state.feverActive) {
        ctx.shadowColor = '#ffcc00';
        ctx.shadowBlur = 15;
      }

      // Draw as a "Cyber Runner" instead of a car
      if (visuals) {
        // Using a variant of F1 car but styled as a character/drone
        visuals.drawF1Car(ctx, 0, 0, {
          length: CONFIG.playerSize * 1.5,
          width: CONFIG.playerSize,
          scale: 0.8,
          active: state.feverActive,
          lean: run * 0.1,
          palette: state.feverActive
            ? ['#ffcc00', '#fff', '#000', '#fb923c', '#fff']
            : ['#dc2626', '#ffcc00', '#000', '#fb923c', '#fff'],
        });
      } else {
        this.drawPlayerCar(ctx, 0, 0, 1, CONFIG.playerSize * 0.7);
      }

      ctx.restore();
    },

    drawEnhancedHazard(ctx, x, y, size, typeIndex, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      const type = BURN_TYPES[typeIndex] || BURN_TYPES[0];

      if (visuals) {
        // Using ThreatNode but with character-specific shapes
        visuals.drawThreatNode(ctx, x, y, size, {
          shape: typeIndex === 0 ? 'diamond' : typeIndex === 1 ? 'shield' : 'hex',
          primary: type.body,
          secondary: type.accent,
          accent: type.danger,
          icon: type.icon,
          label: type.name,
          intensity: state.intensity,
          threat: typeIndex + 1,
          spin: performance.now() * 0.005 + x * 0.01,
        });
      } else {
        this.drawHazard(ctx, x, y, size, typeIndex);
      }
    },

    drawParallaxCity(ctx, w, h, state) {
      const baseY = h * (CONFIG.horizon + 0.18);
      const skyline = [
        { x: 0.08, w: 0.12, h: 0.22 },
        { x: 0.27, w: 0.16, h: 0.3 },
        { x: 0.58, w: 0.14, h: 0.26 },
        { x: 0.78, w: 0.18, h: 0.34 },
      ];

      for (const building of skyline) {
        const x = w * building.x;
        const bw = w * building.w;
        const bh = h * building.h;
        ctx.fillStyle = 'rgba(20, 16, 39, 0.45)';
        ctx.fillRect(x, baseY - bh, bw, bh);
        ctx.fillStyle = 'rgba(251,191,36,0.12)';
        ctx.fillRect(x + bw * 0.22, baseY - bh + 20, 8, 8);
        ctx.fillRect(x + bw * 0.68, baseY - bh + 46, 8, 8);
      }
    },

    drawTrack(ctx, w, h, state) {
      const groundY = state.groundY;
      const sidePad = Math.max(18, w * 0.06);
      ctx.fillStyle = 'rgba(9, 5, 16, 0.82)';
      ctx.fillRect(0, groundY, w, h - groundY);

      ctx.fillStyle = 'rgba(255,204,0,0.86)';
      ctx.fillRect(sidePad, groundY + 2, w - sidePad * 2, 3);
    },

    drawGroundMarkings(ctx, w, h, state) {
      const groundY = state.groundY;
      ctx.fillStyle = 'rgba(248,113,113, 0.15)';
      for (let i = 0; i < 8; i++) {
        const y = groundY + i * 18 + (state.distance % 18) * 0.15;
        if (y > h) break;
        ctx.fillRect(24, y, w - 48, 1.5);
      }
    },

    drawPlayerCar(ctx, x, y, widthScale = 1, _heightScale = 1) {
      const lift = Math.sin(performance.now() / 120) * 1.1;
      const body = Math.max(30, 38 * widthScale);
      const height = Math.max(28, _heightScale || 32);
      const run = Math.sin(performance.now() / 130);

      ctx.save();
      ctx.translate(x, y + lift);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, height * 0.48, body * 0.58, height * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3b120b';
      this.roundRect(ctx, -body * 0.5, height * 0.26, body, height * 0.14, 4);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      this.roundRect(ctx, -body * 0.36, height * 0.18, body * 0.72, height * 0.1, 4);
      ctx.fill();

      ctx.strokeStyle = '#fff2b3';
      ctx.lineWidth = Math.max(2, height * 0.06);
      ctx.beginPath();
      ctx.moveTo(-body * 0.08, height * 0.1);
      ctx.lineTo(-body * 0.22 + run * 2, height * 0.27);
      ctx.moveTo(body * 0.08, height * 0.1);
      ctx.lineTo(body * 0.22 - run * 2, height * 0.27);
      ctx.stroke();

      ctx.fillStyle = '#ff6b35';
      this.roundRect(ctx, -body * 0.18, -height * 0.2, body * 0.36, height * 0.42, 8);
      ctx.fill();

      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(0, -height * 0.42, height * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b120b';
      this.roundRect(ctx, -height * 0.14, -height * 0.45, height * 0.28, height * 0.1, 4);
      ctx.fill();
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(height * 0.08, -height * 0.41, height * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawHazard(ctx, x, y, size, typeIndex) {
      const type = BURN_TYPES[typeIndex] || BURN_TYPES[0];
      const w = Math.max(28, size * 0.76);
      const h = Math.max(24, size * 0.62);
      const body = type.body || '#ff6b35';
      const accent = type.accent || '#3b120b';

      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.42, w * 0.56, h * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      if (typeIndex % 4 === 0) {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.42, h * 0.28);
        ctx.lineTo(-w * 0.42, h * 0.28);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff7ed';
        ctx.fillRect(-w * 0.22, h * 0.02, w * 0.44, h * 0.08);
      } else if (typeIndex % 4 === 1) {
        ctx.fillStyle = body;
        this.roundRect(ctx, -w * 0.42, -h * 0.34, w * 0.84, h * 0.68, 7);
        ctx.fill();
        ctx.fillStyle = accent;
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.arc(i * w * 0.18, -h * 0.02, h * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (typeIndex % 4 === 2) {
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(0, 0, h * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, h * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = body;
        this.roundRect(ctx, -w * 0.38, -h * 0.38, w * 0.76, h * 0.76, 5);
        ctx.fill();
        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w * 0.18, -h * 0.16);
        ctx.lineTo(w * 0.18, h * 0.16);
        ctx.moveTo(w * 0.18, -h * 0.16);
        ctx.lineTo(-w * 0.18, h * 0.16);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawVehicleTires(ctx, w, h, color) {
      const wheel = Math.max(2.2, w * 0.15);
      const half = h * 0.5;
      const spread = Math.max(w * 0.28, h * 0.56);
      ctx.fillStyle = color;
      for (const side of [-1, 1]) {
        const cx = side * spread;
        ctx.beginPath();
        ctx.ellipse(cx, half, wheel, wheel * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
        ctx.beginPath();
        ctx.ellipse(
          cx,
          half,
          Math.max(1.2, wheel * 0.66),
          Math.max(1.1, wheel * 0.46),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.fillStyle = color;
      }

      ctx.fillStyle = 'rgba(148, 163, 184, 0.42)';
      const hub = Math.max(1.4, wheel * 0.27);
      for (const side of [-1, 1]) {
        const cx = side * spread;
        ctx.fillRect(cx - hub * 0.5, half - hub * 0.5, hub, hub);
      }
    },

    drawVehicleStrip(ctx, x, y, width, height) {
      const stripeHeight = Math.max(1.1, height * 0.65);
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      const section = width / 7;
      for (let i = 0; i < 8; i++) {
        const dx = x + i * section;
        ctx.fillRect(dx, y, Math.max(1.1, section * 0.36), stripeHeight);
      }
      ctx.fillStyle = `rgba(15, 23, 42, 0.55)`;
      this.roundRect(ctx, x, y + stripeHeight * 0.18, width, Math.max(2.2, height * 0.75), 2);
      ctx.fill();
      ctx.restore();
    },

    drawVehicleSign(ctx, type, size) {
      const w = size * 1.1;
      const h = Math.max(11, size * 0.5);
      const glow = Math.sin(performance.now() * 0.006) * 0.12 + 0.34;
      const x = -w * 0.5;
      const y = -size * 0.84;
      ctx.save();
      this.roundRect(ctx, x, y, w, h, 3);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(248, 250, 252, ${0.55 + glow * 0.2})`;
      ctx.stroke();
      ctx.fillStyle = type?.danger || '#ffcc00';
      ctx.fillRect(x + w * 0.22, y + h * 0.42, w * 0.56, h * 0.12);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.76)';
      ctx.beginPath();
      ctx.arc(x + w * 0.36, y + h * 0.5, h * 0.08, 0, Math.PI * 2);
      ctx.arc(x + w * 0.5, y + h * 0.5, h * 0.08, 0, Math.PI * 2);
      ctx.arc(x + w * 0.64, y + h * 0.5, h * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawCollectible(ctx, x, y, size, value) {
      const r = size * 0.34;
      const pulse = 1 + Math.sin(performance.now() / 160) * 0.11;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);

      const glow = Math.sin(performance.now() * 0.006) * 0.08 + 0.2;
      const core = r * 1.02;
      ctx.beginPath();
      ctx.arc(0, 0, core, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,204,0,${0.18 + glow})`;
      ctx.fill();

      ctx.fillStyle = CONFIG.colors.collectible;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = CONFIG.colors.collectText;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#12071f';
      if (value > 1) {
        ctx.beginPath();
        ctx.arc(-r * 0.18, 0, r * 0.14, 0, Math.PI * 2);
        ctx.arc(r * 0.18, 0, r * 0.14, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 5; i += 1) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          const px = Math.cos(a) * r * 0.24;
          const py = Math.sin(a) * r * 0.24;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    roundRect(ctx, x, y, w, h, r) {
      const radius = Math.max(1, Math.min(r, Math.min(w, h) / 2));
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
      this._collisionQuery = null;
      this._entityQuery = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
      this._layout = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.BurnRunner = BurnRunner;
  window.BurnRunner = BurnRunner;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('burnrunner', BurnRunner);
})();
