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
    roadWidthRatio: 0.78,
    roadMinWidth: 420,
    roadMaxWidth: 1700,
    playerYRatio: 0.84,
    playerWidth: 72,
    playerHeight: 96,
    obstacleWidth: 64,
    obstacleHeight: 76,
    trackLookaheadPadding: 108,
    roadCeilingHeight: 0.014,
    boostSize: 44,
    anticipationScaleBySpeed: 0.015,
    horizonDistance: 0.008,

    speedStart: 3.8,
    speedCap: 19.6,
    acceleration: 0.02,
    worldSpeedBase: 2.18,
    worldSpeedScale: 0.82,

    spawnBaseMs: 62,
    spawnMinMs: 16,
    spawnSlope: 1.9,
    spawnLeadHeightScale: 3.35,
    trackSpanReserve: 2.45,
    boostChanceBase: 0.15,
    boostChanceGrowth: 0.005,
    boostChanceMax: 0.32,

    laneColor: '#e2e8f0',
    laneDashLength: 40,
    roadFade: 0.2,
    horizonYRatio: 0.006,
    roadNarrowRatio: 0.16,
    nearRoadBoost: 1.02,
    perspectivePower: 0.9,
    spawnLeadScale: 2.2,
    worldStretch: 1.12,

    distancePerLevel: 300,
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
    _layout: null,

    getSpawnLead(canvasHeight) {
      return Math.round(
        Math.max(CONFIG.roadMinWidth, canvasHeight * CONFIG.spawnLeadHeightScale) *
          CONFIG.spawnLeadScale
      );
    },

    getTrackSpan(canvasHeight, spawnLead) {
      return Math.round(
        Math.max(
          spawnLead * (0.9 + CONFIG.anticipationScaleBySpeed),
          spawnLead + canvasHeight * CONFIG.trackSpanReserve,
          canvasHeight * 0.9
        )
      );
    },

    start(gameId) {
      this.stop();
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      this.canvas = document.getElementById('dd-canvas');

      this.instance = new ASDF.GameInstance(this.canvas, {
        maxEntities: 900,
        debug: false,
      });
      this.instance.resize();

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(this.canvas, this.instance.ctx);
      }

      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('MOVE_LEFT', ['ArrowLeft', 'KeyA']);
        input.mapAction('MOVE_RIGHT', ['ArrowRight', 'KeyD']);
      }

      world.registerComponent('Player', { speed: 'f32', steer: 'f32' });
      world.registerComponent('Obstacle', { kind: 'u8', damage: 'f32' });
      world.registerComponent('Boost', { value: 'u16' });

      // Register Personality Components
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      const canvas = this.instance.canvas;
      const spawnLead = this.getSpawnLead(canvas.height);
      const trackSpan = this.getTrackSpan(canvas.height, spawnLead);

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
        bounce: 0,
        suspensionPhase: 0,
      });

      this.dom = {
        distance: document.getElementById('dd-distance'),
        score: document.getElementById('dd-score'),
        speed: document.getElementById('dd-speed'),
      };
      this.setupInput();
      this._layout = this.getRoadLayout();

      const layout = this._layout || this.getRoadLayout();
      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Collider');
      world.addComponent(player, 'Player');
      world.addComponent(player, 'Rotation');
      world.addComponent(player, 'Scale');

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

      this.instance.onUpdate = (dt, dtMs) => {
        const state = world.getResource('GameState');

        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }

        if (kernel.services?.hud) kernel.services.hud.update(this.gameId, state);
        this.updateUI(state, world.componentRegistry.get('Player').props.speed[pIdx]);

        return shouldFreeze;
      };

      this.instance.onRender = () => {
        if (this.juice) this.juice.renderPre();
        this.draw();
        if (this.juice) this.juice.renderPost();
      };

      this.instance.world.addSystem(ASDF.PersonalitySystem.create());
      this.instance.world.addSystem(this.createLogicSystem());
      this.instance.world.addSystem(ASDF.PhysicsSystem.createMovement());
      this.instance.start();

      this._cleanupResize = () => {
        const state = world.getResource('GameState');
        if (!state || !this.instance) return;
        this.instance.resize();
        const c = this.instance.canvas;
        const spawnLead = this.getSpawnLead(c.height);
        state.spawnLead = spawnLead;
        state.trackSpan = this.getTrackSpan(c.height, spawnLead);
        this._layout = this.getRoadLayout();
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
      const horizonY = h * (CONFIG.horizonYRatio + CONFIG.horizonDistance);
      const lanes = CONFIG.lanes;

      const layout = {
        left,
        right: left + width,
        width,
        centerX: w / 2,
        laneWidth: width / lanes,
        horizonY,
        h,
        lanes,
        roadWidth(depth) {
          const eased =
            Math.pow(clamp(depth, 0, 1), CONFIG.perspectivePower) * CONFIG.nearRoadBoost;
          return clamp(
            width * CONFIG.roadNarrowRatio,
            lerp(width * CONFIG.roadNarrowRatio, width, eased),
            width
          );
        },
        roadLeft(depth) {
          const roadW = this.roadWidth(depth);
          return left + (width - roadW) * 0.5;
        },
        projectY(depth) {
          return (
            horizonY +
            Math.pow(clamp(depth, 0, 1), CONFIG.perspectivePower) *
              (h - horizonY) *
              CONFIG.worldStretch
          );
        },
      };

      return layout;
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
      return layout.roadWidth(depth);
    },

    getRoadLeft(layout, depth) {
      return layout.roadLeft(depth);
    },

    getTrackDepth(worldY, state) {
      const pacing = 0.78 + state.level * CONFIG.anticipationScaleBySpeed;
      return clamp((worldY + state.spawnLead * pacing) / (state.trackSpan * 0.95), 0, 1);
    },

    projectY(depth, layout) {
      return layout.projectY(depth);
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
        const layout = self._layout || self.getRoadLayout();

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
        state.suspensionPhase += dt * (0.052 + player.speed[pIdx] * 0.006);
        state.bounce = Math.max(0, state.bounce - dt * 0.032);

        const left = state.keys.ArrowLeft || state.keys.KeyA;
        const right = state.keys.ArrowRight || state.keys.KeyD;
        if (left) vel.vx[pIdx] -= 1.1 * difficulty.pace * dt;
        if (right) vel.vx[pIdx] += 1.1 * difficulty.pace * dt;
        vel.vx[pIdx] *= Math.pow(0.87, dt);
        player.steer[pIdx] = clamp(vel.vx[pIdx] / 14, -1, 1);
        if ((left || right) && Math.abs(player.steer[pIdx]) > 0.08) {
          state.bounce = Math.min(0.5, state.bounce + 0.01 * dt);
        }

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
            state.bounce = 1.15;

            if (self.juice) {
              self.juice.impact(pos.x[idx], pos.y[idx], { intensity: 'medium' });
              self.juice.textPop(pos.x[idx], pos.y[idx], `-${penalty}`, {
                color: '#ef4444',
                size: 24,
              });
            } else {
              self.instance.shake(10, 10);
            }

            world.destroyEntity(world.getEntityId(idx));
            continue;
          }

          if (hit && boostBit && (world.entityMasks[idx] & boostBit) === boostBit) {
            const value = boostComp.props.value[idx] || 72;
            player.speed[pIdx] = Math.min(state.maxSpeed + 1.8, player.speed[pIdx] + 1.3);
            const scoreGained = Math.round(value * (1 + self.getDifficulty(state).level * 0.12));
            state.score += scoreGained;
            state.boostUsed += 1;
            state.bounce = Math.max(state.bounce, 0.55);

            if (self.juice) {
              self.juice.impact(pos.x[idx], pos.y[idx], { intensity: 'light' });
              self.juice.textPop(pos.x[idx], pos.y[idx], `+${scoreGained}`, {
                color: '#fbbf24',
                size: 28,
              });
            } else {
              self.instance.shake(5, 8);
            }

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
      const layout = this._layout || this.getRoadLayout();
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
      const spawnDepth = 0.42 + Math.random() * 0.34;
      pos.y[idx] = -Math.round(state.spawnLead * spawnDepth);
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
      const layout = this._layout || this.getRoadLayout();

      this.drawWorld(ctx, w, h, state, layout);
      this.drawEntities(ctx, state, layout);
      this.drawVignette(ctx, w, h);
    },

    drawWorld(ctx, w, h, state, layout) {
      this.drawRaceBackdrop(ctx, w, h, state, layout);
      this.drawSidebars(ctx, w, h, state, layout);
      this.drawPerspectiveRoad(ctx, h, state, layout);
    },

    drawRaceBackdrop(ctx, w, h, state, layout) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          seed: state.level,
          distance: state.distance,
          allowNoise: true,
          withNoise: true,
        });
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#111827');
        sky.addColorStop(0.46, '#1f2937');
        sky.addColorStop(1, '#0f1519');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        const horizon = layout.horizonY + h * 0.06;
        ctx.fillStyle = '#17251d';
        ctx.beginPath();
        ctx.moveTo(0, horizon + h * 0.08);
        ctx.lineTo(w * 0.18, horizon + h * 0.02);
        ctx.lineTo(w * 0.36, horizon + h * 0.07);
        ctx.lineTo(w * 0.55, horizon);
        ctx.lineTo(w * 0.76, horizon + h * 0.06);
        ctx.lineTo(w, horizon + h * 0.02);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        const haze = ctx.createLinearGradient(0, horizon - 10, 0, horizon + h * 0.18);
        haze.addColorStop(0, 'rgba(255,255,255,0.16)');
        haze.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, Math.max(0, horizon - 12), w, h * 0.18);
      }
    },

    drawSidebars(ctx, w, h, state, layout) {
      const roadW = this.getRoadWidth(layout, 1);
      const left = this.getRoadLeft(layout, 1);
      const right = left + roadW;
      const horizon = layout.horizonY;

      ctx.fillStyle = '#26351f';
      ctx.fillRect(0, horizon, w, h - horizon);

      const shoulder = ctx.createLinearGradient(0, horizon, 0, h);
      shoulder.addColorStop(0, '#3f2b1a');
      shoulder.addColorStop(1, '#5b351d');
      ctx.fillStyle = shoulder;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(left, h);
      ctx.lineTo(layout.roadLeft(0), layout.projectY(0));
      ctx.lineTo(0, horizon);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(right, h);
      ctx.lineTo(layout.roadLeft(0) + layout.roadWidth(0), layout.projectY(0));
      ctx.lineTo(w, horizon);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.strokeStyle = 'rgba(226,232,240,0.45)';
      ctx.lineWidth = 2;
      for (let side = 0; side <= 1; side += 1) {
        ctx.beginPath();
        for (let i = 0; i <= 28; i += 1) {
          const t = i / 28;
          const x = layout.roadLeft(t) + layout.roadWidth(t) * side + (side ? 14 : -14) * t;
          const y = layout.projectY(t);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      const postGap = 90;
      for (let y = horizon + ((state.roadOffset * 0.55) % postGap); y < h + postGap; y += postGap) {
        const t = clamp((y - horizon) / Math.max(1, h - horizon), 0, 1);
        const edgeLeft = layout.roadLeft(t);
        const edgeRight = edgeLeft + layout.roadWidth(t);
        const postH = 12 + t * 28;
        const postW = 3 + t * 5;
        ctx.fillStyle = 'rgba(248,250,252,0.75)';
        ctx.fillRect(edgeLeft - 22 * t, y - postH, postW, postH);
        ctx.fillRect(edgeRight + 18 * t, y - postH, postW, postH);
      }
      ctx.restore();
    },

    drawPerspectiveRoad(ctx, h, state, layout) {
      const steps = 64;
      const farLeft = this.getRoadLeft(layout, 0);
      const farRight = farLeft + this.getRoadWidth(layout, 0);
      const nearLeft = this.getRoadLeft(layout, 1);
      const nearRight = nearLeft + this.getRoadWidth(layout, 1);

      ctx.fillStyle = '#2d3238';
      ctx.beginPath();
      ctx.moveTo(farLeft, this.projectY(0, layout));
      ctx.lineTo(farRight, this.projectY(0, layout));
      ctx.lineTo(nearRight, this.projectY(1, layout));
      ctx.lineTo(nearLeft, this.projectY(1, layout));
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < steps; i++) {
        const tA = i / steps;
        const tB = (i + 1) / steps;
        const yA = this.projectY(tA, layout);
        const yB = this.projectY(tB, layout);
        const wA = this.getRoadWidth(layout, tA);
        const wB = this.getRoadWidth(layout, tB);
        const xA = this.getRoadLeft(layout, tA);
        const xB = this.getRoadLeft(layout, tB);
        const shade = i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.035)';

        ctx.fillStyle = shade;
        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(xA + wA, yA);
        ctx.lineTo(xB + wB, yB);
        ctx.lineTo(xB, yB);
        ctx.closePath();
        ctx.fill();
      }

      ctx.setLineDash([]);
      for (let edge = 0; edge <= 1; edge++) {
        ctx.strokeStyle = 'rgba(248,250,252,0.82)';
        ctx.lineWidth = 3.2;
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

      for (let lane = 1; lane < CONFIG.lanes; lane += 1) {
        const dash = CONFIG.laneDashLength;
        const gap = 16;
        ctx.strokeStyle = lane === CONFIG.lanes / 2 ? '#facc15' : 'rgba(248,250,252,0.72)';
        ctx.lineWidth = lane === CONFIG.lanes / 2 ? 2.6 : 2.1;
        ctx.setLineDash([dash, gap]);
        ctx.lineDashOffset = state.roadOffset * (lane === CONFIG.lanes / 2 ? 1.05 : 0.9);
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

      ctx.setLineDash([]);
      for (let i = 0; i < steps; i += 3) {
        const tA = i / steps;
        const tB = Math.min(1, (i + 1) / steps);
        const yA = this.projectY(tA, layout);
        const yB = this.projectY(tB, layout);
        const wA = this.getRoadWidth(layout, tA);
        const wB = this.getRoadWidth(layout, tB);
        const xA = this.getRoadLeft(layout, tA);
        const xB = this.getRoadLeft(layout, tB);
        for (let side = 0; side <= 1; side += 1) {
          const dir = side === 0 ? 1 : -1;
          const edgeA = xA + (side ? wA : 0);
          const edgeB = xB + (side ? wB : 0);
          ctx.fillStyle = i % 6 === 0 ? '#ef4444' : '#f8fafc';
          ctx.beginPath();
          ctx.moveTo(edgeA, yA);
          ctx.lineTo(edgeA + dir * wA * 0.018, yA);
          ctx.lineTo(edgeB + dir * wB * 0.018, yB);
          ctx.lineTo(edgeB, yB);
          ctx.closePath();
          ctx.fill();
        }
      }
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
      if (playerProjected) {
        this.drawPlayerCar(ctx, playerProjected.x, playerProjected.y, player.steer[pIdx], state);
      }
    },

    drawTraffic(ctx, projected, kind) {
      const { x, y, scale } = projected;
      const safe = Math.max(0.18, scale);
      if (kind <= 1) {
        const paints = [
          ['#1d4ed8', '#f8fafc', '#0f172a'],
          ['#b91c1c', '#fef2f2', '#111827'],
        ];
        this.drawRoadCar(ctx, x, y, safe, paints[kind % paints.length], kind);
      } else if (kind === 2) {
        this.drawTrafficCone(ctx, x, y, safe);
      } else if (kind === 3) {
        this.drawRoadBarrier(ctx, x, y, safe);
      } else {
        this.drawTireStack(ctx, x, y, safe);
      }
    },

    drawBoost(ctx, projected, intensity = 1) {
      const { x, y, scale } = projected;
      const size = 28 * scale * (0.9 + Math.min(0.5, intensity));
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.42, size * 0.62, size * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = Math.max(5, size * 0.75);
      ctx.fillStyle = '#16a34a';
      this.roundRect(ctx, -size * 0.38, -size * 0.56, size * 0.76, size * 1.02, size * 0.12);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#f8fafc';
      this.roundRect(ctx, -size * 0.24, -size * 0.42, size * 0.48, size * 0.22, size * 0.06);
      ctx.fill();
      ctx.strokeStyle = '#064e3b';
      ctx.lineWidth = Math.max(1.4, size * 0.08);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-size * 0.1, size * 0.02, size * 0.2, size * 0.26);
      ctx.restore();
    },

    drawPlayerCar(ctx, x, y, steer = 0, state = {}) {
      const suspension =
        Math.sin((state.suspensionPhase || 0) * 5.4) * 2.2 + Math.min(9, (state.bounce || 0) * 8);
      this.drawRaceCar(ctx, x, y - suspension, {
        width: 58,
        length: 116,
        body: '#dc2626',
        stripe: '#f8fafc',
        glass: '#111827',
        accent: '#facc15',
        steer,
        shadowScale: 1 - Math.min(0.18, (state.bounce || 0) * 0.08),
        active: true,
      });
    },

    drawRoadCar(ctx, x, y, scale, palette, kind) {
      this.drawRaceCar(ctx, x, y, {
        width: Math.max(34, 50 * scale),
        length: Math.max(58, 92 * scale),
        body: palette[0],
        stripe: palette[1],
        glass: palette[2],
        accent: '#facc15',
        steer: Math.sin(performance.now() * 0.001 + kind) * 0.08,
        shadowScale: 1,
        active: false,
      });
    },

    drawRaceCar(ctx, x, y, opts = {}) {
      const {
        width = 54,
        length = 104,
        body = '#dc2626',
        stripe = '#f8fafc',
        glass = '#111827',
        accent = '#facc15',
        steer = 0,
        shadowScale = 1,
        active = false,
      } = opts;
      const w = width;
      const l = length;
      const lean = clamp(steer, -1, 1) * 0.08;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean);

      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath();
      ctx.ellipse(0, l * 0.3, w * 0.72 * shadowScale, l * 0.12 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111827';
      const wheelW = w * 0.18;
      const wheelH = l * 0.17;
      for (const side of [-1, 1]) {
        this.roundRect(ctx, side * w * 0.42 - wheelW / 2, -l * 0.32, wheelW, wheelH, 3);
        ctx.fill();
        this.roundRect(ctx, side * w * 0.42 - wheelW / 2, l * 0.12, wheelW, wheelH, 3);
        ctx.fill();
      }

      const bodyGrad = ctx.createLinearGradient(-w * 0.32, -l * 0.46, w * 0.32, l * 0.46);
      bodyGrad.addColorStop(0, active ? '#ef4444' : body);
      bodyGrad.addColorStop(1, body);
      ctx.fillStyle = bodyGrad;
      this.roundRect(ctx, -w * 0.34, -l * 0.46, w * 0.68, l * 0.92, 9);
      ctx.fill();

      ctx.fillStyle = stripe;
      this.roundRect(ctx, -w * 0.055, -l * 0.43, w * 0.11, l * 0.7, 2);
      ctx.fill();

      ctx.fillStyle = glass;
      this.roundRect(ctx, -w * 0.22, -l * 0.19, w * 0.44, l * 0.18, 4);
      ctx.fill();
      this.roundRect(ctx, -w * 0.18, l * 0.08, w * 0.36, l * 0.16, 4);
      ctx.fill();

      ctx.fillStyle = accent;
      this.roundRect(ctx, -w * 0.26, -l * 0.49, w * 0.52, l * 0.05, 2);
      ctx.fill();
      if (active) {
        ctx.fillStyle = 'rgba(248,250,252,0.88)';
        ctx.fillRect(-w * 0.2, -l * 0.48, w * 0.14, l * 0.025);
        ctx.fillRect(w * 0.06, -l * 0.48, w * 0.14, l * 0.025);
      }

      ctx.restore();
    },

    drawTrafficCone(ctx, x, y, scale) {
      const s = Math.max(18, 44 * scale);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.42, s * 0.42, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.58);
      ctx.lineTo(s * 0.44, s * 0.34);
      ctx.lineTo(-s * 0.44, s * 0.34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-s * 0.23, -s * 0.02, s * 0.46, s * 0.12);
      ctx.fillStyle = '#9a3412';
      this.roundRect(ctx, -s * 0.5, s * 0.3, s, s * 0.18, 3);
      ctx.fill();
      ctx.restore();
    },

    drawRoadBarrier(ctx, x, y, scale) {
      const w = Math.max(48, 88 * scale);
      const h = Math.max(22, 34 * scale);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.beginPath();
      ctx.ellipse(0, h * 0.72, w * 0.45, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      this.roundRect(ctx, -w * 0.5, -h * 0.45, w, h * 0.9, 4);
      ctx.fill();
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = Math.max(1.5, scale * 2);
      ctx.stroke();
      ctx.fillStyle = '#f97316';
      for (let i = -2; i <= 2; i += 1) {
        ctx.save();
        ctx.translate(i * w * 0.18, 0);
        ctx.rotate(-0.55);
        ctx.fillRect(-w * 0.04, -h * 0.58, w * 0.08, h * 1.16);
        ctx.restore();
      }
      ctx.restore();
    },

    drawTireStack(ctx, x, y, scale) {
      const s = Math.max(22, 46 * scale);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.52, s * 0.54, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i += 1) {
        const offset = (i - 1) * s * 0.24;
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(offset, 0, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4b5563';
        ctx.beginPath();
        ctx.arc(offset, 0, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }
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
      this._layout = null;
      this.trafficQuery = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.DexDash = DexDash;
  window.DexDash = DexDash;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('dexdash', DexDash);
})();
