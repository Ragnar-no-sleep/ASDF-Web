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
    playerSize: 44,
    playerLift: 14,
    playerBaseX: 80,
    playerBaseY: 0.2,
    physics: {
      jumpForce: -9,
      gravity: 0.36,
      maxSpeed: 14.2,
      acceleration: 0.035,
      maxAirJumps: 1,
      coyoteFrames: 6,
      jumpBufferFrames: 8,
    },
    baseSpeed: 5.8,
    speedCap: 13.4,
    levelDistance: 340,
    distanceScale: 0.0012,
    spawn: {
      baseInterval: 56,
      minInterval: 28,
      obstacleChanceBase: 0.64,
      obstacleChanceGrowth: 0.05,
      baseMaxHazards: 10,
      maxHazards: 30,
      collectibleChance: 0.36,
    },
    icons: ['S', 'R', 'B', 'C', 'T', 'L'],
    colors: {
      player: '#dc2626',
      playerTrim: '#eab308',
      hazard: ['#a855f7', '#f97316', '#16a34a', '#f43f5e', '#38bdf8', '#facc15'],
      collectible: '#22c55e',
      collectText: '#fef08a',
    },
  };

  const BURN_TYPES = [
    {
      name: 'SCAM',
      width: 44,
      height: 38,
      reward: 0,
      speedScale: 1.0,
      icon: 'S',
      body: '#ef4444',
      accent: '#7f1d1d',
      panel: '#fee2e2',
    },
    {
      name: 'RUG',
      width: 38,
      height: 35,
      reward: 0,
      speedScale: 1.08,
      icon: 'R',
      body: '#f97316',
      accent: '#7c2d12',
      panel: '#ffedd5',
    },
    {
      name: 'BURN',
      width: 40,
      height: 39,
      reward: 0,
      speedScale: 1.15,
      icon: 'B',
      body: '#a855f7',
      accent: '#581c87',
      panel: '#e9d5ff',
    },
    {
      name: 'CHAIN',
      width: 46,
      height: 34,
      reward: 0,
      speedScale: 1.22,
      icon: 'C',
      body: '#16a34a',
      accent: '#14532d',
      panel: '#dcfce7',
    },
  ];

  const BurnRunner = {
    version: '2.3.0',
    gameId: 'burnrunner',
    instance: null,
    _cleanupInput: null,
    _layout: null,

    start(gameId) {
      this.stop();

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('br-canvas');
      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 900,
        debug: true,
      });

      this.instance.resize();

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('JUMP', ['Space', 'ArrowUp', 'KeyW']);
      }

      world.registerComponent('Player', { jumpsLeft: 'u8' });
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
      });

      this.dom = {
        distance: document.getElementById('br-distance'),
        tokens: document.getElementById('br-tokens'),
        combo: document.getElementById('br-combo'),
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
      this.instance.onUpdate = dt => {
        const state = world.getResource('GameState');
        if (kernel.services?.hud) {
          kernel.services.hud.update(this.gameId, state);
        }
      };
      this.instance.onRender = () => this.draw();
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
          <div class="br-hint-bar">Touch / Space / Arrow Up to jump</div>
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
        state.distance += state.speed * 0.1 * dt;
        state.speed = Math.min(
          CONFIG.speedCap,
          CONFIG.baseSpeed + state.distance * CONFIG.distanceScale + diff.level * 0.45
        );

        const groundLine = state.groundY;
        const px = pos.x[pIdx];
        const py = pos.y[pIdx];
        const ph = coll.height[pIdx];
        const wasGrounded = py + ph >= groundLine - 1;
        if (py + ph > groundLine) {
          pos.y[pIdx] = groundLine - ph;
          vel.vy[pIdx] = 0;
          pProps.jumpsLeft[pIdx] = state.maxJumps;
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
          }
        }

        vel.vy[pIdx] += CONFIG.physics.gravity * dt;

        vel.vx[pIdx] = diff.level * 0.2 + Math.max(0, state.speed) * 0.15;
        vel.vx[pIdx] = Math.min(vel.vx[pIdx], CONFIG.physics.maxSpeed);
        state.speed = Math.min(
          CONFIG.speedCap,
          state.speed * (1 + CONFIG.physics.acceleration * dt)
        );
        pos.x[pIdx] = state.playerX;

        const playerBottom = state.groundY;
        const pW = coll.width[pIdx];
        const pH = coll.height[pIdx];

        state.spawnTimer += dt;
        const activeHazards = world.createQuery(['Position', 'Obstacle', 'Collider']).set.count;
        const activeAll = world.createQuery(['Position', 'Renderable']).set.count - 1;
        const maxHazards = Math.min(
          CONFIG.spawn.maxHazards,
          CONFIG.spawn.baseMaxHazards + diff.level * 1.5
        );
        const spawnInterval = Math.max(
          CONFIG.spawn.minInterval,
          CONFIG.spawn.baseInterval - diff.level * 3.8 - state.speed * 2
        );
        const spawnChance = Math.min(
          0.94,
          CONFIG.spawn.obstacleChanceBase + diff.level * CONFIG.spawn.obstacleChanceGrowth * 0.12
        );

        if (activeHazards < maxHazards && state.spawnTimer > spawnInterval) {
          if (Math.random() < spawnChance && activeAll < maxHazards + 3) {
            self.spawnEntity(world, diff, true);
          } else if (Math.random() < CONFIG.spawn.collectibleChance) {
            self.spawnEntity(world, diff, false);
          }
          state.spawnTimer = 0;
        }

        const query = world.createQuery(['Position', 'Collider', 'Renderable']);
        const { dense, count } = query.set;
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

          if (ey > playerBottom + 20) {
            if (obsBit && (world.entityMasks[idx] & obsBit) === obsBit) {
              state.collectiblesMissed = (state.collectiblesMissed || 0) + 1;
              world.destroyEntity(world.getEntityId(idx));
            } else if (colBit && (world.entityMasks[idx] & colBit) === colBit) {
              world.destroyEntity(world.getEntityId(idx));
              state.tokens += 1;
              state.combo += 1;
              state.bestCombo = Math.max(state.bestCombo, state.combo);
            }
            continue;
          }

          const hit = px < ex + ew && px + pW > ex && py < ey + eh && py + pH > ey;
          if (hit && obsBit && (world.entityMasks[idx] & obsBit) === obsBit) {
            state.gameOver = true;
            state.combo = 0;
            if (ASDF.ParticleSystem) {
              ASDF.ParticleSystem.emit(world, px + pW / 2, py + pH / 2, {
                count: 30,
                colorIdx: 2,
                speed: 8,
                gravity: 0.3,
              });
            }
            self.instance.shake(15, 20);
            if (typeof endGame === 'function') endGame(self.gameId, Math.floor(state.distance));
          } else if (hit && colBit && (world.entityMasks[idx] & colBit) === colBit) {
            const collectible = world.componentRegistry.get('Collectible');
            const value = collectible.props.value[idx] || 1;
            state.tokens += value;
            state.combo++;
            state.bestCombo = Math.max(state.bestCombo, state.combo);
            state.distance += value * Math.min(8, state.combo);
            if (ASDF.ParticleSystem) {
              ASDF.ParticleSystem.emit(world, ex + ew / 2, ey + eh / 2, {
                count: 12,
                colorIdx: 1,
                speed: 4,
                gravity: 0.02,
                life: 18,
              });
            }
            world.destroyEntity(world.getEntityId(idx));
          } else if (ex < -140) {
            if (obsBit && (world.entityMasks[idx] & obsBit) === obsBit) state.combo = 0;
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(state);
      };
    },

    getDifficulty(state) {
      const level = 1 + Math.floor(state.distance / CONFIG.levelDistance);
      const intensity = Math.min(1.95, 1 + level * 0.07);
      const speedScale = 1 + level * 0.12;
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
        pos.y[idx] = state.groundY - 120 - Math.random() * 80 - CONFIG.playerLift;
        rend.iconIndex[idx] = 5;
        rend.size[idx] = 28;
        coll.width[idx] = 24 + Math.random() * 8;
        coll.height[idx] = 24 + Math.random() * 8;
        collectible.value[idx] = Math.random() < 0.18 ? 3 : 1;
      }
    },

    updateUI(state) {
      if (this.dom.distance) this.dom.distance.textContent = `${Math.floor(state.distance)}m`;
      if (this.dom.tokens) this.dom.tokens.textContent = state.tokens;
      if (this.dom.combo) this.dom.combo.textContent = `x${state.combo}`;
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

      const skyGrad = ctx.createLinearGradient(0, 0, 0, state.groundY);
      skyGrad.addColorStop(0, '#07081a');
      skyGrad.addColorStop(1, '#1f1538');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      this.drawParallaxCity(ctx, w, h, state);
      this.drawGround(ctx, w, h, state);

      const query = world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;
      const obstacleComp = world.componentRegistry.get('Obstacle');
      const collectibleComp = world.componentRegistry.get('Collectible');
      const obsBit = obstacleComp ? obstacleComp.bit : 0;
      const colBit = collectibleComp ? collectibleComp.bit : 0;
      const coll = world.componentRegistry.get('Collider').props;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const x = pos.x[idx];
        const y = pos.y[idx];
        const isPlayer = idx === pIdx;
        if (isPlayer) {
          this.drawPlayerCar(ctx, x, y, Math.max(0.5, 1), coll.height[pIdx]);
          continue;
        }

        const isObstacle = obsBit && (world.entityMasks[idx] & obsBit) === obsBit;
        const isCollectible = colBit && (world.entityMasks[idx] & colBit) === colBit;
        const entityW = rend.size[idx] || 34;

        if (isObstacle) {
          const typeIndex = world.componentRegistry.get('Obstacle').props.type[idx] || 0;
          this.drawHazard(ctx, x, y, entityW, typeIndex);
        } else if (isCollectible) {
          const collect = world.componentRegistry.get('Collectible');
          const v = collect.props.value[idx] || 1;
          this.drawCollectible(ctx, x, y, entityW, v);
        }
      }
    },

    drawParallaxCity(ctx, w, h, state) {
      const farSpeed = state.distance * 0.05;
      for (let i = 0; i < 7; i++) {
        const x = (i * 300 - farSpeed) % (7 * 300);
        const bx = x < 0 ? x + 2100 : x;
        ctx.fillStyle = 'rgba(2,8,23,0.56)';
        ctx.fillRect(bx, h * 0.25, 130, h * 0.76);
        ctx.fillStyle = 'rgba(251,191,36,0.08)';
        ctx.fillRect(bx + 24, h * 0.38, 10, 10);
        ctx.fillRect(bx + 96, h * 0.59, 10, 10);
      }

      const midSpeed = state.distance * 0.12;
      for (let i = 0; i < 5; i++) {
        const x = (i * 420 - midSpeed) % (5 * 420);
        const bx = x < 0 ? x + 2100 : x;
        ctx.fillStyle = 'rgba(30, 15, 45, 0.28)';
        ctx.fillRect(bx, h * 0.56, 168, h * 0.26);
      }
    },

    drawGround(ctx, w, h, state) {
      const groundY = state.groundY;
      ctx.fillStyle = '#06050d';
      ctx.fillRect(0, groundY, w, h - groundY);

      const gridColor = 'rgba(244, 114, 182, 0.2)';
      const gridSpeed = state.distance * 2.5;
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      for (let y = groundY; y < h; y += 26) {
        const lineY = y;
        ctx.beginPath();
        ctx.moveTo(0, lineY);
        ctx.lineTo(w, lineY);
        ctx.stroke();
      }
      for (let x = -48; x < w; x += 56) {
        const off = (gridSpeed + x * 0.25) % 64;
        ctx.beginPath();
        ctx.moveTo(x + off, groundY);
        ctx.lineTo(x + off - 90, h);
        ctx.stroke();
      }

      const speedLine = Math.min(18, Math.floor(state.speed * 0.9));
      ctx.fillStyle = 'rgba(34,197,94,0.24)';
      for (let i = 0; i < speedLine; i++) {
        const y = groundY + i * 5;
        const x = (w - ((state.distance * 5 + i * 9) % 160)) % w;
        ctx.fillRect(x, y, 22, 3);
      }
    },

    drawPlayerCar(ctx, x, y, widthScale = 1, _heightScale = 1) {
      const w = 54;
      const h = 32;
      const lift = Math.sin(performance.now() / 120) * 1.4;
      const stretch = Math.sin(performance.now() / 260) * 1.5;
      const body = Math.max(1, w * widthScale);

      ctx.save();
      ctx.translate(x, y + lift);
      ctx.fillStyle = 'rgba(2, 6, 23, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.28, body * 0.58, h * 0.18 + stretch * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = CONFIG.colors.player;
      this.roundRect(ctx, -body * 0.52, -h * 0.28, body * 1.04, h * 0.74, 8);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      this.roundRect(ctx, -body * 0.33, -h * 0.13, body * 0.66, h * 0.35, 4);
      ctx.fillStyle = CONFIG.colors.playerTrim;
      this.roundRect(ctx, -body * 0.6, -h * 0.33, body * 1.2, h * 0.12, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.fillRect(-body * 0.2, -h * 0.2, 4, 10);
      ctx.fillRect(body * 0.08, -h * 0.2, 4, 10);

      ctx.fillStyle = 'rgba(251,191,36,0.32)';
      this.roundRect(ctx, -body * 0.2, h * 0.06, body * 0.4, 4, 2);

      const tireW = body * 0.16;
      const tireH = h * 0.18;
      ctx.fillStyle = '#0f172a';
      for (const side of [-1, 1]) {
        const tx = side * body * 0.22;
        ctx.fillRect(tx - tireW * 0.5, h * 0.18, tireW, tireH);
      }
      ctx.restore();
    },

    drawHazard(ctx, x, y, size, typeIndex) {
      const type = BURN_TYPES[typeIndex] || BURN_TYPES[0];
      const w = size * 0.88;
      const h = size * 0.7;
      const body = type.body || '#ef4444';
      const accent = type.accent || '#7f1d1d';
      const panel = type.panel || '#fee2e2';
      const drift = (performance.now() * 0.0018) % (Math.PI * 2);
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = 'rgba(0,0,0,0.28)';
      ctx.shadowBlur = 8;
      const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      grad.addColorStop(0, body);
      grad.addColorStop(1, 'rgba(2,6,23,0.95)');
      ctx.fillStyle = grad;
      this.roundRect(ctx, -w / 2, -h / 2, w, h, 7);
      ctx.fill();

      ctx.fillStyle = panel;
      this.roundRect(ctx, -w * 0.3, -h * 0.22, w * 0.6, h * 0.44, 4);
      ctx.fill();

      ctx.fillStyle = accent;
      ctx.fillRect(-w * 0.38, -h * 0.05 + Math.sin(drift) * 2, w * 0.76, h * 0.09);
      ctx.fillStyle = 'rgba(248,250,252,0.95)';
      ctx.font = `700 ${Math.max(12, h * 0.46)}px ${CONFIG.iconFont || 'Orbitron, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type.icon || 'X', 0, 0);
      ctx.restore();
    },

    drawCollectible(ctx, x, y, size, value) {
      const r = size * 0.34;
      const pulse = 1 + Math.sin(performance.now() / 160) * 0.11;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);

      const orbit = performance.now() * 0.002;
      for (let i = 0; i < 10; i++) {
        const a = orbit + (Math.PI * 2 * i) / 10;
        const px = Math.cos(a) * r * 0.28;
        const py = Math.sin(a) * r * 0.28;
        ctx.fillStyle = `rgba(34,197,94,${0.45 + (i % 2) * 0.1})`;
        ctx.beginPath();
        ctx.arc(px, py, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

      const glow = Math.sin(performance.now() * 0.006) * 0.08 + 0.2;
      const core = r * 1.02;
      ctx.beginPath();
      ctx.arc(0, 0, core, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(21,128,61,${0.2 + glow})`;
      ctx.fill();

      ctx.fillStyle = CONFIG.colors.collectible;
      this.roundRect(ctx, -r * 0.58, -r * 0.58, r * 1.16, r * 1.16, 7);
      ctx.fill();

      ctx.strokeStyle = CONFIG.colors.collectText;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();

      if (value > 1) {
        ctx.fillStyle = '#052e16';
      } else {
        ctx.fillStyle = '#ecfccb';
      }
      ctx.font = `700 ${Math.max(11, r * 1.3)}px ${CONFIG.iconFont || 'Orbitron, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(value > 1 ? `x${value}` : 'coin', r * 1.18, 0);
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
