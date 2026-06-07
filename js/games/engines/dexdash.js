/**
 * ASDF Games - DexDash Engine
 *
 * Scalable arcade racer with perspective road, longer anticipation window,
 * and progressive challenge by distance.
 */

'use strict';

(function () {
  const CONFIG = {
    lanes: 4,
    roadWidthRatio: 0.98,
    roadMinWidth: 520,
    roadMaxWidth: 2700,
    playerYRatio: 0.84,
    playerWidth: 74,
    playerHeight: 38,
    obstacleWidth: 64,
    obstacleHeight: 70,
    trackLookaheadPadding: 78,
    roadCeilingHeight: 0.025,
    boostSize: 44,

    speedStart: 3.6,
    speedCap: 18.4,
    acceleration: 0.02,
    worldSpeedBase: 2.28,
    worldSpeedScale: 0.88,

    spawnBaseMs: 66,
    spawnMinMs: 16,
    spawnSlope: 2.2,
    spawnLeadMultiplier: 6.6,
    boostChanceBase: 0.15,
    boostChanceGrowth: 0.005,
    boostChanceMax: 0.32,

    laneColor: '#e2e8f0',
    laneDashLength: 52,
    roadFade: 0.22,
    horizonYRatio: 0.028,
    roadNarrowRatio: 0.16,
    nearRoadBoost: 1.16,
    trackSpanMultiplier: 3.2,

    distancePerLevel: 340,
    collisionPenalty: 80,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  const DexDash = {
    version: '4.1.0',
    gameId: 'dexdash',
    instance: null,
    canvas: null,
    dom: {},
    _cleanupInput: null,
    _resizeTimer: null,
    trafficQuery: null,

    start(gameId) {
      this.stop();
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      this.canvas = document.getElementById('dd-canvas');

      this.instance = new ASDF.GameInstance(this.canvas, {
        maxEntities: 900,
        debug: true,
      });
      this.instance.resize();

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('MOVE_LEFT', ['ArrowLeft', 'KeyA']);
        input.mapAction('MOVE_RIGHT', ['ArrowRight', 'KeyD']);
      }

      world.registerComponent('Player', { speed: 'f32', steer: 'f32' });
      world.registerComponent('Obstacle', { kind: 'u8', damage: 'f32' });
      world.registerComponent('Boost', { value: 'u16' });

      const canvas = this.instance.canvas;
      const spawnLead = Math.round(
        Math.max(CONFIG.roadMinWidth, canvas.height * CONFIG.spawnLeadMultiplier)
      );
      const trackSpan = Math.round(
        spawnLead * CONFIG.trackSpanMultiplier + canvas.height * CONFIG.playerYRatio
      );

      world.setResource('GameState', {
        score: 0,
        distance: 0,
        gameOver: false,
        roadOffset: 0,
        spawnTimer: 0,
        level: 1,
        pace: 1,
        maxSpeed: CONFIG.speedStart,
        playerId: -1,
        keys: {},
        laneJitter: 0,
        boostUsed: 0,
        spawnLead,
        trackSpan,
      });

      this.dom = {
        distance: document.getElementById('dd-distance'),
        score: document.getElementById('dd-score'),
        speed: document.getElementById('dd-speed'),
      };
      this.setupInput();

      const layout = this.getRoadLayout();
      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Collider');
      world.addComponent(player, 'Player');

      const pIdx = world.getIndex(player);
      world.componentRegistry.get('Position').props.x[pIdx] = layout.centerX;
      world.componentRegistry.get('Position').props.y[pIdx] =
        this.instance.canvas.height * CONFIG.playerYRatio;
      world.componentRegistry.get('Renderable').props.size[pIdx] = CONFIG.playerHeight;
      world.componentRegistry.get('Collider').props.width[pIdx] = CONFIG.playerWidth * 0.96;
      world.componentRegistry.get('Collider').props.height[pIdx] = CONFIG.playerHeight * 0.86;
      world.componentRegistry.get('Player').props.speed[pIdx] = CONFIG.speedStart;
      world.getResource('GameState').playerId = player;

      this.trafficQuery = world.createQuery(['Position', 'Renderable']);

      this.instance.onUpdate = () => {
        const state = world.getResource('GameState');
        if (kernel.services?.hud) kernel.services.hud.update(this.gameId, state);
        this.updateUI(state, world.componentRegistry.get('Player').props.speed[pIdx]);
      };

      this.instance.onRender = () => this.draw();
      this.instance.world.addSystem(this.createLogicSystem());
      this.instance.world.addSystem(ASDF.PhysicsSystem.createMovement());
      this.instance.start();

      this._cleanupResize = () => {
        const state = world.getResource('GameState');
        if (!state || !this.instance) return;
        this.instance.resize();
        const c = this.instance.canvas;
        const spawnLead = Math.round(
          Math.max(CONFIG.roadMinWidth, c.height * CONFIG.spawnLeadMultiplier)
        );
        state.spawnLead = spawnLead;
        state.trackSpan = Math.round(
          spawnLead * CONFIG.trackSpanMultiplier + c.height * CONFIG.playerYRatio
        );
      };
      const resizeHandler = () => {
        if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
        this._resizeTimer = window.setTimeout(this._cleanupResize, 100);
      };
      window.addEventListener('resize', resizeHandler);
      this._cleanupResize();
      this._cleanupResizeHandler = resizeHandler;

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="dd-container">
          <canvas id="dd-canvas" class="game-canvas dd-canvas"></canvas>
          <div class="dd-hud">
            <div class="dd-stat">DIST <span id="dd-distance" class="dd-stat-distance">0m</span></div>
            <div class="dd-stat">SCORE <span id="dd-score" class="dd-stat-score">0</span></div>
            <div class="dd-stat">SPEED <span id="dd-speed" class="dd-stat-speed">0 km/h</span></div>
          </div>
        </div>
      `;
    },

    setupInput() {
      const world = this.instance.world;
      const getKeys = () => world.getResource('GameState');
      const onKeyDown = event => {
        const state = getKeys();
        if (!state) return;
        if (
          event.code === 'ArrowLeft' ||
          event.code === 'ArrowRight' ||
          event.code === 'KeyA' ||
          event.code === 'KeyD'
        ) {
          event.preventDefault();
          state.keys[event.code] = true;
        }
      };
      const onKeyUp = event => {
        const state = getKeys();
        if (!state) return;
        state.keys[event.code] = false;
      };

      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
      };
    },

    getRoadLayout() {
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const targetWidth = clamp(
        w * CONFIG.roadWidthRatio,
        CONFIG.roadMinWidth,
        CONFIG.roadMaxWidth
      );
      const width = Math.min(targetWidth, w - 44);
      const left = (w - width) / 2;
      const horizonY = h * CONFIG.horizonYRatio;
      return {
        left,
        right: left + width,
        width,
        centerX: w / 2,
        laneWidth: width / CONFIG.lanes,
        horizonY,
        h,
      };
    },

    getLevelFromDistance(distance) {
      return 1 + Math.floor(distance / CONFIG.distancePerLevel);
    },

    getBoostChance(level) {
      return clamp(
        CONFIG.boostChanceBase + level * CONFIG.boostChanceGrowth,
        CONFIG.boostChanceBase,
        CONFIG.boostChanceMax
      );
    },

    getDifficulty(state) {
      const base = Math.floor(state.distance / CONFIG.distancePerLevel);
      const level = 1 + Math.max(0, base);
      const pace = 1 + Math.min(2.0, level * 0.09);
      const maxSpeed = clamp(
        CONFIG.speedStart + base * 0.44 + state.distance * 0.002,
        CONFIG.speedStart,
        CONFIG.speedCap
      );
      const spawnInterval = clamp(
        CONFIG.spawnBaseMs - level * CONFIG.spawnSlope,
        CONFIG.spawnMinMs,
        CONFIG.spawnBaseMs * 0.45
      );
      const maxTraffic = Math.min(45, 13 + level * 2);
      return { level, pace, maxSpeed, spawnInterval, maxTraffic };
    },

    getRoadWidth(layout, depth) {
      const eased = Math.pow(depth, 0.78) * CONFIG.nearRoadBoost;
      return clamp(
        layout.width * CONFIG.roadNarrowRatio,
        lerp(layout.width * CONFIG.roadNarrowRatio, layout.width, eased),
        layout.width
      );
    },

    getRoadLeft(layout, depth) {
      const width = this.getRoadWidth(layout, depth);
      return layout.left + (layout.width - width) * 0.5;
    },

    getTrackDepth(worldY, state) {
      return clamp((worldY + state.spawnLead) / state.trackSpan, 0, 1);
    },

    projectY(depth, layout) {
      return layout.horizonY + Math.pow(depth, 0.78) * (layout.h - layout.horizonY);
    },

    projectEntity(worldX, worldY, layout, state) {
      const depth = this.getTrackDepth(worldY, state);
      if (depth <= 0) return null;
      const roadWidth = this.getRoadWidth(layout, depth);
      const roadLeft = this.getRoadLeft(layout, depth);
      const xNorm = clamp((worldX - layout.left) / Math.max(1, layout.width), 0, 1);
      const x = roadLeft + xNorm * roadWidth;
      const y = this.projectY(depth, layout);
      const scale = clamp(0.2 + Math.pow(depth, 0.7) * 0.8, 0.2, 1);
      return {
        x,
        y,
        scale,
        visible: worldY < state.spawnLead + layout.h + 200,
      };
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const player = world.componentRegistry.get('Player').props;
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const collider = world.componentRegistry.get('Collider').props;
        const layout = self.getRoadLayout();

        const difficulty = self.getDifficulty(state);
        state.level = difficulty.level;
        state.pace = difficulty.pace;
        state.maxSpeed = difficulty.maxSpeed;
        player.speed[pIdx] = Math.min(
          state.maxSpeed,
          player.speed[pIdx] + CONFIG.acceleration * dt * difficulty.pace
        );

        state.distance += player.speed[pIdx] * 0.24 * dt;
        state.roadOffset = (state.roadOffset + player.speed[pIdx] * 7.3 * dt) % 360;

        const left = state.keys.ArrowLeft || state.keys.KeyA;
        const right = state.keys.ArrowRight || state.keys.KeyD;
        if (left) vel.vx[pIdx] -= 1.1 * difficulty.pace * dt;
        if (right) vel.vx[pIdx] += 1.1 * difficulty.pace * dt;
        vel.vx[pIdx] *= Math.pow(0.87, dt);
        player.steer[pIdx] = clamp(vel.vx[pIdx] / 14, -1, 1);

        const carHalf = CONFIG.playerWidth * 0.5;
        pos.x[pIdx] = clamp(pos.x[pIdx], layout.left + carHalf + 4, layout.right - carHalf - 4);
        pos.y[pIdx] = self.instance.canvas.height * CONFIG.playerYRatio;

        state.spawnTimer += dt;
        const worldSpeed = CONFIG.worldSpeedBase + player.speed[pIdx] * CONFIG.worldSpeedScale;
        const query = self.trafficQuery || world.createQuery(['Position', 'Renderable']);
        const activeTraffic = query.set.count - 1;
        const crowdFactor = Math.min(1, activeTraffic / Math.max(1, difficulty.maxTraffic));
        const safeSpawnInterval = Math.max(
          difficulty.spawnInterval * (0.8 + crowdFactor * 0.55),
          CONFIG.spawnMinMs
        );
        while (state.spawnTimer >= safeSpawnInterval) {
          self.spawnTraffic(world);
          state.spawnTimer -= safeSpawnInterval;
        }
        const { dense, count } = query.set;
        const obstacleComp = world.componentRegistry.get('Obstacle');
        const boostComp = world.componentRegistry.get('Boost');
        const obstacleBit = obstacleComp ? obstacleComp.bit : 0;
        const boostBit = boostComp ? boostComp.bit : 0;
        const playerY = pos.y[pIdx];
        const playerHalfWidth = CONFIG.playerWidth * 0.58;
        const playerHalfHeight = CONFIG.playerHeight * 0.62;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === pIdx) continue;
          pos.y[idx] += worldSpeed * dt;
          const dx = Math.abs(pos.x[idx] - pos.x[pIdx]);
          const dy = pos.y[idx] - playerY;

          const hit =
            Math.abs(dy) < (playerHalfHeight + collider.height[idx] * 0.5) * 0.66 &&
            dx < (playerHalfWidth + collider.width[idx] * 0.5) * 0.9;

          if (hit && obstacleBit && (world.entityMasks[idx] & obstacleBit) === obstacleBit) {
            player.speed[pIdx] = Math.max(
              CONFIG.speedStart * 0.76,
              player.speed[pIdx] - obstacleComp.props.damage[idx]
            );
            const penalty = Math.round(Math.max(30, CONFIG.collisionPenalty / 2));
            state.score = Math.max(0, state.score - penalty);
            self.instance.shake(10, 10);
            world.destroyEntity(world.getEntityId(idx));
            continue;
          }

          if (hit && boostBit && (world.entityMasks[idx] & boostBit) === boostBit) {
            const value = boostComp.props.value[idx] || 72;
            player.speed[pIdx] = Math.min(state.maxSpeed + 1.8, player.speed[pIdx] + 1.3);
            state.score += value * (1 + self.getDifficulty(state).level * 0.12);
            state.boostUsed += 1;
            self.instance.shake(5, 8);
            world.destroyEntity(world.getEntityId(idx));
            continue;
          }

          if (pos.y[idx] > playerY + layout.h * 0.5) {
            if (obstacleBit && (world.entityMasks[idx] & obstacleBit) === obstacleBit) {
              state.score += 6 + difficulty.level;
            } else {
              state.boostUsed = Math.max(0, state.boostUsed - 1);
            }
            world.destroyEntity(world.getEntityId(idx));
          }
        }
      };
    },

    spawnTraffic(world) {
      const state = world.getResource('GameState');
      const layout = this.getRoadLayout();
      const difficulty = this.getDifficulty(state);
      const lane = Math.floor(Math.random() * CONFIG.lanes);
      const jitter = Math.min(0.42, layout.laneWidth * 0.18) * (Math.random() - 0.5);
      const x = layout.left + layout.laneWidth * (lane + 0.5) + jitter;

      const isBoost = Math.random() < this.getBoostChance(difficulty.level);
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Collider');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const collider = world.componentRegistry.get('Collider').props;

      pos.x[idx] = clamp(x, layout.left + 2, layout.right - 2);
      pos.y[idx] = -Math.round(state.spawnLead * (0.6 + Math.random() * 0.55));
      rend.iconIndex[idx] = isBoost ? 2 : 1;

      if (isBoost) {
        world.addComponent(e, 'Boost');
        const boost = world.componentRegistry.get('Boost').props;
        boost.value[idx] = 72 + difficulty.level * 1.2;
        rend.size[idx] = CONFIG.boostSize;
        collider.width[idx] = CONFIG.boostSize * 0.85;
        collider.height[idx] = CONFIG.boostSize * 0.85;
      } else {
        world.addComponent(e, 'Obstacle');
        const obstacle = world.componentRegistry.get('Obstacle').props;
        const kind = Math.floor(
          Math.random() * Math.min(5, 2 + Math.floor(difficulty.level * 0.28))
        );
        obstacle.kind[idx] = kind;
        obstacle.damage[idx] = 1.12 + kind * 0.32 + difficulty.level * 0.07;
        rend.size[idx] = CONFIG.obstacleHeight + Math.min(18, kind * 2.4);
        collider.width[idx] = CONFIG.obstacleWidth + Math.min(20, kind * 3.4);
        collider.height[idx] = CONFIG.obstacleHeight + Math.min(18, kind * 3.1);
      }
    },

    updateUI(state, speed) {
      if (this.dom.distance) this.dom.distance.textContent = `${Math.floor(state.distance)}m`;
      if (this.dom.score) this.dom.score.textContent = `${Math.floor(state.score)}`;
      if (this.dom.speed) this.dom.speed.textContent = `${Math.round(speed * 22)} km/h`;
    },

    draw() {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');
      const layout = this.getRoadLayout();

      this.drawWorld(ctx, w, h, state, layout);
      this.drawEntities(ctx, state, layout);
      this.drawVignette(ctx, w, h);
    },

    drawWorld(ctx, w, h, state, layout) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#07111f');
      sky.addColorStop(0.5, '#0d1730');
      sky.addColorStop(1, '#0a111b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      this.drawSidebars(ctx, w, h, state, layout);
      this.drawPerspectiveRoad(ctx, h, state, layout);
    },

    drawSidebars(ctx, w, h, state, layout) {
      const roadW = this.getRoadWidth(layout, 1);
      const left = this.getRoadLeft(layout, 1);
      const right = left + roadW;
      const barDepth = Math.max(1, Math.round(h * 0.2));

      ctx.fillStyle = '#12281d';
      ctx.fillRect(0, 0, left, h);
      ctx.fillRect(right, 0, w - right, h);

      for (let y = -barDepth; y < h + barDepth; y += 90) {
        const x = (state.roadOffset + y * 0.42) % 90;
        ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
        ctx.fillRect(left - 32 + x * 0.05, y, 28, 48);
        ctx.fillStyle = 'rgba(226, 232, 240, 0.3)';
        ctx.fillRect(left - 86, y + 14, 34, 32);
        ctx.fillStyle = 'rgba(34, 197, 94, 0.42)';
        ctx.fillRect(right + 58, y + 16, 28, 44);
      }
    },

    drawPerspectiveRoad(ctx, h, state, layout) {
      const steps = 44;
      const laneColor = CONFIG.laneColor;
      const hBase = layout.h;

      // Road body with depth bands
      for (let i = 0; i < steps; i++) {
        const tA = i / steps;
        const tB = (i + 1) / steps;
        const yA = this.projectY(tA, layout);
        const yB = this.projectY(tB, layout);
        const wA = this.getRoadWidth(layout, tA);
        const wB = this.getRoadWidth(layout, tB);
        const xA = this.getRoadLeft(layout, tA);
        const xB = this.getRoadLeft(layout, tB);
        const shade = 0.04 + (i % 2) * 0.015;

        ctx.fillStyle = `rgba(31, 41, 55, ${shade})`;
        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(xA + wA, yA);
        ctx.lineTo(xB + wB, yB);
        ctx.lineTo(xB, yB);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `rgba(15, 23, 42, ${0.18 + (i / steps) * 0.12})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(xA + wA, yA);
        ctx.lineTo(xB + wB, yB);
        ctx.lineTo(xB, yB);
        ctx.closePath();
        ctx.stroke();
      }

      // Road edges and center lane guides
      ctx.setLineDash([]);
      for (let edge = 0; edge <= 1; edge++) {
        const color = edge === 0 ? 'rgba(34, 197, 94, 0.72)' : 'rgba(226, 232, 240, 0.7)';
        const width = 4.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const y = this.projectY(t, layout);
          const roadWidth = this.getRoadWidth(layout, t);
          const leftEdge = this.getRoadLeft(layout, t);
          const x = edge === 0 ? leftEdge : leftEdge + roadWidth;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      for (let lane = 1; lane < CONFIG.lanes; lane++) {
        const color = 'rgba(226, 232, 240, 0.46)';
        const dash = CONFIG.laneDashLength;
        const gap = 16;
        ctx.strokeStyle = laneColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([dash, gap]);
        ctx.lineDashOffset = state.roadOffset;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const y = this.projectY(t, layout);
          const roadWidth = this.getRoadWidth(layout, t);
          const leftEdge = this.getRoadLeft(layout, t);
          const x = leftEdge + (roadWidth * lane) / CONFIG.lanes;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Horizon markers / lane depth reference
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.14)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const y = this.projectY(t * 0.85, layout);
        const roadWidth = this.getRoadWidth(layout, t * 0.85);
        const leftEdge = this.getRoadLeft(layout, t * 0.85);
        const centerY = y + i * 12;
        ctx.beginPath();
        ctx.moveTo(leftEdge + roadWidth * 0.25, y);
        ctx.lineTo(leftEdge + roadWidth * 0.75, y);
        ctx.stroke();
        if (i === 0) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.fillRect(leftEdge + roadWidth * 0.42, centerY, roadWidth * 0.16, 2);
        }
      }
      ctx.setLineDash([]);
    },

    drawEntities(ctx, state, layout) {
      const world = this.instance.world;
      const query = this.trafficQuery || world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;
      const pIdx = world.getIndex(world.getResource('GameState').playerId);
      const player = world.componentRegistry.get('Player').props;
      const pos = world.componentRegistry.get('Position').props;
      const obstacleComp = world.componentRegistry.get('Obstacle');
      const boostComp = world.componentRegistry.get('Boost');
      const obstacleBit = obstacleComp ? obstacleComp.bit : 0;
      const boostBit = boostComp ? boostComp.bit : 0;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        if (idx === pIdx) continue;
        const projected = this.projectEntity(pos.x[idx], pos.y[idx], layout, state);
        if (!projected || !projected.visible) continue;

        const mask = world.entityMasks[idx];
        if (boostBit && (mask & boostBit) === boostBit) {
          this.drawBoost(ctx, projected, 1);
        } else if (obstacleBit && (mask & obstacleBit) === obstacleBit) {
          const kind = obstacleComp.props.kind[idx] || 0;
          this.drawTraffic(ctx, projected, kind);
        }
      }

      const playerProjected = this.projectEntity(pos.x[pIdx], pos.y[pIdx], layout, state);
      this.drawPlayerCar(ctx, playerProjected.x, playerProjected.y, player.steer[pIdx]);
    },

    drawTraffic(ctx, projected, kind) {
      const { x, y, scale } = projected;
      const safe = scale * 90;
      const carWidth = Math.max(20, safe * (0.58 + kind * 0.04));
      const carHeight = Math.max(26, safe * (0.42 + kind * 0.03));
      const palette = [
        ['#1d4ed8', '#60a5fa'],
        ['#581c87', '#c084fc'],
        ['#334155', '#94a3b8'],
        ['#f59e0b', '#fb923c'],
        ['#16a34a', '#4ade80'],
      ];
      const c = palette[kind % palette.length];
      const dark = `rgba(15, 23, 42, ${0.24 + Math.min(0.23, scale * 0.6)})`;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.shadowColor = 'rgba(0,0,0,0.34)';
      ctx.shadowBlur = Math.max(6, 16 * scale);

      const bodyLength = carWidth * 1.08;
      const bodyHeight = carHeight * 0.64;
      const nose = carWidth * 0.16;
      const wingY = bodyHeight * 0.18;

      ctx.fillStyle = '#020617';
      this.roundRect(
        ctx,
        -bodyLength / 2 + 15,
        bodyHeight * 0.4,
        carWidth * 0.84,
        bodyHeight * 0.18,
        4
      );

      ctx.fillStyle = c[0];
      this.roundRect(ctx, -bodyLength / 2, -bodyHeight * 0.06, bodyLength, bodyHeight, 6);

      ctx.fillStyle = c[1];
      this.roundRect(
        ctx,
        -bodyLength * 0.46,
        -bodyHeight * 0.18,
        bodyLength * 0.31,
        bodyHeight * 0.58,
        4
      );
      this.roundRect(
        ctx,
        bodyLength * 0.15,
        -bodyHeight * 0.18,
        bodyLength * 0.31,
        bodyHeight * 0.58,
        4
      );

      ctx.fillStyle = dark;
      for (let side = -1; side <= 1; side += 2) {
        const wx = side * bodyLength * 0.26;
        ctx.fillRect(
          wx - bodyHeight * 0.08,
          bodyHeight * 0.04,
          bodyHeight * 0.16,
          bodyHeight * 0.86
        );
      }
      ctx.fillStyle = 'rgba(251, 191, 36, 0.32)';
      for (let side = -1; side <= 1; side += 2) {
        const wx = side * bodyLength * 0.26;
        this.roundRect(ctx, wx - bodyHeight * 0.04, bodyHeight * 0.2, bodyHeight * 0.08, 2.2, 1.2);
      }

      ctx.fillStyle = c[1];
      ctx.beginPath();
      ctx.moveTo(bodyLength / 2 - nose, -bodyHeight * 0.12);
      ctx.lineTo(bodyLength / 2 + carWidth * 0.18, -bodyHeight * 0.21);
      ctx.lineTo(bodyLength / 2 + carWidth * 0.18, bodyHeight * 0.17);
      ctx.lineTo(bodyLength / 2 - nose, bodyHeight * 0.02);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
      this.roundRect(ctx, -bodyLength * 0.1, -bodyHeight * 0.42, bodyLength * 0.2, 3.6, 2);
      this.roundRect(
        ctx,
        bodyLength * -0.15,
        -bodyHeight * 0.05,
        bodyLength * 0.3,
        bodyHeight * 0.18,
        2
      );

      ctx.fillStyle = dark;
      this.roundRect(ctx, -bodyLength * 0.04, wingY, bodyLength * 0.08, 2.6, 2);
      this.roundRect(ctx, -bodyLength * 0.44, wingY + 1.1, bodyLength * 0.88, 1.4, 1.6);
      ctx.restore();
    },

    drawBoost(ctx, projected, intensity = 1) {
      const { x, y, scale } = projected;
      const size = 26 * scale * (0.9 + Math.min(0.5, intensity));
      const grad = ctx.createLinearGradient(-size, -size, size, size);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(1, '#67e8f9');
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = grad;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = Math.max(8, size * 1.8);
      this.roundRect(ctx, -size, -size, size * 2, size * 2, 8);
      ctx.fill();
      ctx.restore();
    },

    drawPlayerCar(ctx, x, y, steer = 0) {
      const length = 84;
      const width = 46;
      const t = Math.max(-1, Math.min(1, steer));
      const body = '#dc2626';
      const sidewall = '#0b1220';
      const stripe = '#fde68a';
      const glass = '#7c3aed';
      const glow = '#facc15';

      const wheelOffset = width * 0.24;
      const wheelW = width * 0.18;
      const wheelH = width * 0.2;
      const rail = width * 0.05;

      ctx.save();
      ctx.translate(x, y + width * 0.18);
      ctx.rotate(t * 0.04);

      ctx.fillStyle = 'rgba(2, 6, 23, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, width * 0.24, width * 0.56, width * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = sidewall;
      this.roundRect(
        -length * 0.34,
        width * 0.08,
        length * 0.08,
        width * 0.18,
        Math.max(2, width * 0.03)
      );
      ctx.fill();
      this.roundRect(
        length * 0.26,
        width * 0.08,
        length * 0.08,
        width * 0.18,
        Math.max(2, width * 0.03)
      );
      ctx.fill();

      ctx.fillStyle = body;
      ctx.shadowColor = 'rgba(251, 191, 36, 0.34)';
      ctx.shadowBlur = 14;
      this.roundRect(-length * 0.22, -width * 0.04, length * 0.52, width * 0.56, 11);
      ctx.fill();
      ctx.shadowBlur = 0;

      const shell = ctx.createLinearGradient(-length * 0.22, 0, length * 0.3, 0);
      shell.addColorStop(0, '#b91c1c');
      shell.addColorStop(0.52, '#ef4444');
      shell.addColorStop(1, '#dc2626');
      ctx.fillStyle = shell;
      this.roundRect(-length * 0.2, -width * 0.01, length * 0.5, width * 0.48, 9);
      ctx.fill();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = 1.2;
      this.roundRect(-length * 0.18, -width * 0.05, length * 0.49, width * 0.5, 8);
      ctx.stroke();

      ctx.fillStyle = stripe;
      this.roundRect(-length * 0.15, -width * 0.03, length * 0.38, width * 0.09, 4);
      this.roundRect(-length * 0.2, width * 0.16, length * 0.18, width * 0.07, 4);

      const frontWingW = length * 0.18;
      const rearWingW = length * 0.14;
      const wingY = width * 0.26;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      this.roundRect(-frontWingW * 0.32, wingY, frontWingW, width * 0.08, 2);
      this.roundRect(length * 0.26, wingY + width * 0.08, rearWingW, width * 0.07, 2);

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.68)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(length * 0.28, width * 0.22);
      ctx.lineTo(length * 0.49, width * 0.16);
      ctx.stroke();

      for (const side of [-1, 1]) {
        const cx = side * wheelOffset;
        const frontY = width * 0.22;
        const rearY = width * 0.0;

        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.ellipse(cx - wheelW * 0.55, frontY, wheelW * 0.5, wheelH * 0.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + wheelW * 0.55, frontY, wheelW * 0.5, wheelH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - wheelW * 0.55, rearY, wheelW * 0.5, wheelH * 0.5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + wheelW * 0.55, rearY, wheelW * 0.5, wheelH * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#334155';
        ctx.fillRect(cx - wheelW * 0.24, frontY - wheelH * 0.5, wheelW * 0.48, wheelH * 0.55);
        ctx.fillRect(cx - wheelW * 0.24, rearY - wheelH * 0.5, wheelW * 0.48, wheelH * 0.55);

        ctx.fillStyle = rail;
        ctx.fillRect(cx - rail * 0.5, width * 0.04, rail, width * 0.16);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.85)';
        ctx.fillRect(cx - rail * 0.5, width * 0.06, rail * 0.4, width * 0.1);
      }

      ctx.fillStyle = glow;
      this.roundRect(-length * 0.09, -width * 0.14, length * 0.11, width * 0.17, 6);
      this.roundRect(length * 0.22, -width * 0.1, length * 0.12, width * 0.12, 6);

      const cockpitW = width * 0.34;
      const cockpitH = width * 0.14;
      ctx.fillStyle = glass;
      this.roundRect(-cockpitW * 0.5, -width * 0.02, cockpitW, cockpitH, 4);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.12)';
      this.roundRect(-cockpitW * 0.42, -width * 0.01, cockpitW * 0.84, cockpitH * 0.7, 2);
      ctx.restore();
    },

    drawVignette(ctx, w, h) {
      const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.76);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.44)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
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
      if (this._cleanupResizeHandler) {
        window.removeEventListener('resize', this._cleanupResizeHandler);
        this._cleanupResizeHandler = null;
      }
      if (this._resizeTimer) {
        window.clearTimeout(this._resizeTimer);
        this._resizeTimer = null;
      }
      if (this.instance) this.instance.stop();
      this.instance = null;
      this.canvas = null;
      this.trafficQuery = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.DexDash = DexDash;
  window.DexDash = DexDash;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('dexdash', DexDash);
})();
