/**
 * ASDF Games - DexDash Engine
 *
 * Top-down arcade racer with a scalable road renderer and canvas-native car art.
 */

'use strict';

(function () {
  const CONFIG = {
    lanes: 4,
    roadWidthRatio: 0.86,
    roadMinWidth: 420,
    roadMaxWidth: 980,
    playerYRatio: 0.86,
    playerWidth: 66,
    playerHeight: 118,
    obstacleWidth: 64,
    obstacleHeight: 72,
    boostSize: 44,
    baseSpeed: 3.4,
    maxSpeedStart: 9,
    maxSpeedCap: 16,
    acceleration: 0.018,
    lateralAccel: 1.18,
    lateralFriction: 0.87,
    spawnBase: 58,
    spawnMin: 24,
  };

  const DexDash = {
    version: '3.0.0',
    gameId: 'dexdash',
    instance: null,
    canvas: null,
    dom: {},
    _cleanupInput: null,
    config: CONFIG,

    start(gameId) {
      this.stop();

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      this.canvas = document.getElementById('dd-canvas');

      this.instance = new ASDF.GameInstance(this.canvas, {
        maxEntities: 700,
        debug: true,
      });
      this.instance.resize();

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('MOVE_LEFT', ['KeyA', 'ArrowLeft']);
        input.mapAction('MOVE_RIGHT', ['KeyD', 'ArrowRight']);
      }

      world.registerComponent('Player', { speed: 'f32', steer: 'f32' });
      world.registerComponent('Obstacle', { kind: 'u8', damage: 'f32' });
      world.registerComponent('Boost', { value: 'u16' });

      world.setResource('GameState', {
        score: 0,
        distance: 0,
        gameOver: false,
        roadOffset: 0,
        maxSpeed: CONFIG.maxSpeedStart,
        spawnTimer: 0,
        keys: {},
        playerId: -1,
      });

      this.dom = {
        distance: document.getElementById('dd-distance'),
        score: document.getElementById('dd-score'),
        speed: document.getElementById('dd-speed'),
      };

      this.setupInput();

      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Collider');
      world.addComponent(player, 'Player');

      const pIdx = world.getIndex(player);
      const layout = this.getRoadLayout();
      world.componentRegistry.get('Position').props.x[pIdx] = layout.centerX;
      world.componentRegistry.get('Position').props.y[pIdx] =
        this.canvas.height * CONFIG.playerYRatio;
      world.componentRegistry.get('Renderable').props.size[pIdx] = CONFIG.playerHeight;
      world.componentRegistry.get('Collider').props.width[pIdx] = CONFIG.playerWidth * 0.72;
      world.componentRegistry.get('Collider').props.height[pIdx] = CONFIG.playerHeight * 0.82;
      world.componentRegistry.get('Player').props.speed[pIdx] = CONFIG.baseSpeed;
      world.getResource('GameState').playerId = player;

      this.instance.onUpdate = () => {
        const state = world.getResource('GameState');
        const speed = world.componentRegistry.get('Player').props.speed[pIdx];
        if (kernel.services.hud) kernel.services.hud.update(this.gameId, state);
        this.updateUI(state, speed);
      };

      this.instance.onRender = alpha => this.draw(alpha);
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());
      this.instance.start();

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
      const state = () => world.getResource('GameState');
      const onKeyDown = e => {
        if (
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight' ||
          e.code === 'KeyA' ||
          e.code === 'KeyD'
        ) {
          if (e.cancelable) e.preventDefault();
          state().keys[e.code] = true;
        }
      };
      const onKeyUp = e => {
        state().keys[e.code] = false;
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
      const roadWidth = Math.max(
        Math.min(w * CONFIG.roadWidthRatio, CONFIG.roadMaxWidth),
        Math.min(CONFIG.roadMinWidth, w - 36)
      );
      const left = (w - roadWidth) / 2;
      const laneWidth = roadWidth / CONFIG.lanes;
      return {
        left,
        right: left + roadWidth,
        width: roadWidth,
        centerX: w / 2,
        laneWidth,
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

        state.maxSpeed = Math.min(
          CONFIG.maxSpeedCap,
          CONFIG.maxSpeedStart + state.distance * 0.004
        );
        player.speed[pIdx] = Math.min(
          state.maxSpeed,
          player.speed[pIdx] + CONFIG.acceleration * dt
        );
        state.distance += player.speed[pIdx] * 0.24 * dt;
        state.roadOffset = (state.roadOffset + player.speed[pIdx] * 7.5 * dt) % 220;

        const steeringLeft = state.keys.ArrowLeft || state.keys.KeyA;
        const steeringRight = state.keys.ArrowRight || state.keys.KeyD;
        if (steeringLeft) vel.vx[pIdx] -= CONFIG.lateralAccel * dt;
        if (steeringRight) vel.vx[pIdx] += CONFIG.lateralAccel * dt;
        vel.vx[pIdx] *= Math.pow(CONFIG.lateralFriction, dt);
        player.steer[pIdx] = Math.max(-1, Math.min(1, vel.vx[pIdx] / 12));

        const layout = self.getRoadLayout();
        const carHalf = CONFIG.playerWidth * 0.5;
        pos.x[pIdx] = Math.max(
          layout.left + carHalf,
          Math.min(layout.right - carHalf, pos.x[pIdx])
        );
        pos.y[pIdx] = self.instance.canvas.height * CONFIG.playerYRatio;

        state.spawnTimer += dt;
        const spawnInterval = Math.max(
          CONFIG.spawnMin + 8,
          CONFIG.spawnBase - state.distance / 210
        );
        const trafficCount = world.createQuery(['Position', 'Renderable']).set.count;
        if (trafficCount < 22 && state.spawnTimer >= spawnInterval) {
          self.spawnTraffic(world);
          state.spawnTimer = 0;
        }

        const worldSpeed = 4.2 + player.speed[pIdx] * 2.15;
        const query = world.createQuery(['Position', 'Renderable']);
        const { dense, count } = query.set;
        const obstacleComp = world.componentRegistry.get('Obstacle');
        const boostComp = world.componentRegistry.get('Boost');
        const obstacleBit = obstacleComp ? obstacleComp.bit : 0;
        const boostBit = boostComp ? boostComp.bit : 0;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === pIdx) continue;

          pos.y[idx] += worldSpeed * dt;
          const entityMask = world.entityMasks[idx];
          const dx = Math.abs(pos.x[idx] - pos.x[pIdx]);
          const dy = Math.abs(pos.y[idx] - pos.y[pIdx]);
          const hit =
            dx < (collider.width[pIdx] + (collider.width[idx] || CONFIG.obstacleWidth)) * 0.5 &&
            dy < (collider.height[pIdx] + (collider.height[idx] || CONFIG.obstacleHeight)) * 0.5;

          if (hit && obstacleBit && (entityMask & obstacleBit) === obstacleBit) {
            player.speed[pIdx] = Math.max(
              CONFIG.baseSpeed,
              player.speed[pIdx] - obstacleComp.props.damage[idx]
            );
            state.score = Math.max(0, state.score - 25);
            if (ASDF.ParticleSystem) {
              ASDF.ParticleSystem.emit(world, pos.x[idx], pos.y[idx], {
                count: 18,
                colorIdx: 2,
                speed: 5,
              });
            }
            self.instance.shake(8, 12);
            world.destroyEntity(world.getEntityId(idx));
          } else if (hit && boostBit && (entityMask & boostBit) === boostBit) {
            player.speed[pIdx] = Math.min(state.maxSpeed + 1.5, player.speed[pIdx] + 1.25);
            state.score += boostComp.props.value[idx] || 50;
            if (ASDF.ParticleSystem) {
              ASDF.ParticleSystem.emit(world, pos.x[idx], pos.y[idx], {
                count: 14,
                colorIdx: 5,
                speed: 4,
              });
            }
            world.destroyEntity(world.getEntityId(idx));
          } else if (pos.y[idx] > self.instance.canvas.height + 120) {
            if (obstacleBit && (entityMask & obstacleBit) === obstacleBit) state.score += 5;
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(state, player.speed[pIdx]);
      };
    },

    spawnTraffic(world) {
      const layout = this.getRoadLayout();
      const lane = Math.floor(Math.random() * CONFIG.lanes);
      const x = layout.left + layout.laneWidth * (lane + 0.5);
      const isBoost = Math.random() < 0.24;
      const e = world.createEntity();

      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Collider');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const collider = world.componentRegistry.get('Collider').props;

      pos.x[idx] = x + (Math.random() - 0.5) * Math.min(24, layout.laneWidth * 0.18);
      pos.y[idx] = -140;

      if (isBoost) {
        world.addComponent(e, 'Boost');
        world.componentRegistry.get('Boost').props.value[idx] = 75;
        rend.iconIndex[idx] = 2;
        rend.size[idx] = CONFIG.boostSize;
        collider.width[idx] = CONFIG.boostSize;
        collider.height[idx] = CONFIG.boostSize;
      } else {
        world.addComponent(e, 'Obstacle');
        const obstacle = world.componentRegistry.get('Obstacle').props;
        obstacle.kind[idx] = Math.floor(Math.random() * 3);
        obstacle.damage[idx] = 1.7 + obstacle.kind[idx] * 0.45;
        rend.iconIndex[idx] = 1;
        rend.size[idx] = CONFIG.obstacleHeight;
        collider.width[idx] = CONFIG.obstacleWidth;
        collider.height[idx] = CONFIG.obstacleHeight;
      }
    },

    updateUI(state, pSpeed) {
      if (this.dom.distance) this.dom.distance.textContent = `${state.distance | 0}m`;
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.speed) this.dom.speed.textContent = `${Math.round(pSpeed * 22)} km/h`;
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');
      const layout = this.getRoadLayout();

      this.drawWorld(ctx, w, h, state, layout);
      this.drawEntities(ctx, state, layout, alpha);
      this.drawVignette(ctx, w, h);
    },

    drawWorld(ctx, w, h, state, layout) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#07111f');
      sky.addColorStop(0.48, '#0b1630');
      sky.addColorStop(1, '#101018');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      this.drawTrackside(ctx, w, h, state, layout);

      this.drawLongTrackDepth(ctx, w, h, state, layout);

      ctx.fillStyle = '#20232d';
      ctx.fillRect(layout.left, 0, layout.width, h);

      const roadGrad = ctx.createLinearGradient(layout.left, 0, layout.right, 0);
      roadGrad.addColorStop(0, '#171922');
      roadGrad.addColorStop(0.08, '#2f3440');
      roadGrad.addColorStop(0.5, '#252936');
      roadGrad.addColorStop(0.92, '#2f3440');
      roadGrad.addColorStop(1, '#171922');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(layout.left, 0, layout.width, h);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let y = -180 + state.roadOffset * 1.15; y < h + 180; y += 96) {
        const depth = y / h;
        ctx.globalAlpha = 0.03 + Math.max(0, depth) * 0.04;
        ctx.fillRect(layout.left + 16, y, layout.width - 32, 22);
      }
      ctx.globalAlpha = 1;

      this.drawRoadEdges(ctx, h, layout);
      this.drawLaneMarkers(ctx, h, state, layout);
    },

    drawLongTrackDepth(ctx, w, h, state, layout) {
      const horizonY = h * 0.08;
      ctx.save();
      ctx.fillStyle = '#07111f';
      ctx.fillRect(0, 0, w, horizonY);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(layout.left + layout.width * 0.1, horizonY);
      ctx.lineTo(layout.left, h);
      ctx.moveTo(layout.right - layout.width * 0.1, horizonY);
      ctx.lineTo(layout.right, h);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(248, 250, 252, 0.06)';
      const offset = state.roadOffset % 54;
      for (let y = horizonY + offset; y < h; y += 54) {
        const scale = 0.25 + (y / h) * 0.75;
        const span = layout.width * scale;
        ctx.beginPath();
        ctx.moveTo(layout.centerX - span / 2, y);
        ctx.lineTo(layout.centerX + span / 2, y);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawTrackside(ctx, w, h, state, layout) {
      const stripeOffset = state.roadOffset % 96;
      ctx.fillStyle = '#12281d';
      ctx.fillRect(0, 0, layout.left, h);
      ctx.fillRect(layout.right, 0, w - layout.right, h);

      for (let y = -96 + stripeOffset; y < h + 96; y += 96) {
        ctx.fillStyle = '#1f7a43';
        ctx.fillRect(layout.left - 42, y, 28, 42);
        ctx.fillRect(layout.right + 14, y + 38, 28, 42);
        ctx.fillStyle = '#0d3b2a';
        ctx.fillRect(layout.left - 84, y + 24, 34, 54);
        ctx.fillRect(layout.right + 50, y - 12, 34, 54);
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
      ctx.fillRect(0, 0, layout.left, h);
      ctx.fillRect(layout.right, 0, w - layout.right, h);
    },

    drawRoadEdges(ctx, h, layout) {
      ctx.fillStyle = '#e8eef8';
      ctx.fillRect(layout.left - 8, 0, 8, h);
      ctx.fillRect(layout.right, 0, 8, h);

      const curbColors = ['#e11d48', '#f8fafc'];
      for (let y = 0; y < h; y += 32) {
        ctx.fillStyle = curbColors[((y / 32) % 2) | 0];
        ctx.fillRect(layout.left - 18, y, 10, 32);
        ctx.fillRect(layout.right + 8, y, 10, 32);
      }
    },

    drawLaneMarkers(ctx, h, state, layout) {
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.62)';
      ctx.lineWidth = 4;
      ctx.setLineDash([58, 42]);
      ctx.lineDashOffset = state.roadOffset;
      for (let i = 1; i < CONFIG.lanes; i++) {
        const x = layout.left + layout.laneWidth * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(layout.left + 18, 18, layout.width - 36, h - 36);
    },

    drawEntities(ctx, state) {
      const world = this.instance.world;
      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const player = world.componentRegistry.get('Player').props;
      const obstacleComp = world.componentRegistry.get('Obstacle');
      const boostComp = world.componentRegistry.get('Boost');
      const obstacleBit = obstacleComp ? obstacleComp.bit : 0;
      const boostBit = boostComp ? boostComp.bit : 0;
      const query = world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        if (idx === pIdx) continue;
        const mask = world.entityMasks[idx];
        if (boostBit && (mask & boostBit) === boostBit) {
          this.drawBoost(ctx, pos.x[idx], pos.y[idx]);
        } else if (obstacleBit && (mask & obstacleBit) === obstacleBit) {
          const kind = obstacleComp.props.kind[idx] || 0;
          this.drawTraffic(ctx, pos.x[idx], pos.y[idx], kind);
        }
      }

      this.drawPlayerCar(ctx, pos.x[pIdx], pos.y[pIdx], player.steer[pIdx]);
    },

    drawPlayerCar(ctx, x, y, steer = 0) {
      const width = CONFIG.playerWidth;
      const height = CONFIG.playerHeight;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(steer * 0.08);

      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.beginPath();
      ctx.ellipse(0, height * 0.13, width * 0.58, height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#05070c';
      ctx.fillRect(-width * 0.62, -height * 0.28, 10, 30);
      ctx.fillRect(width * 0.47, -height * 0.28, 10, 30);
      ctx.fillRect(-width * 0.62, height * 0.18, 10, 34);
      ctx.fillRect(width * 0.47, height * 0.18, 10, 34);

      ctx.fillStyle = '#111827';
      this.roundRect(ctx, -width * 0.62, -height * 0.48, width * 1.24, 10, 4);
      ctx.fill();
      this.roundRect(ctx, -width * 0.54, height * 0.38, width * 1.08, 12, 5);
      ctx.fill();

      const body = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
      body.addColorStop(0, '#7f1d1d');
      body.addColorStop(0.18, '#ef4444');
      body.addColorStop(0.5, '#f97316');
      body.addColorStop(0.82, '#ef4444');
      body.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(0, -height * 0.55);
      ctx.lineTo(width * 0.28, -height * 0.26);
      ctx.lineTo(width * 0.34, height * 0.34);
      ctx.lineTo(width * 0.16, height * 0.52);
      ctx.lineTo(-width * 0.16, height * 0.52);
      ctx.lineTo(-width * 0.34, height * 0.34);
      ctx.lineTo(-width * 0.28, -height * 0.26);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#111827';
      this.roundRect(ctx, -width * 0.24, -height * 0.08, width * 0.48, height * 0.22, 8);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      this.roundRect(ctx, -width * 0.18, -height * 0.03, width * 0.36, height * 0.1, 5);
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-width * 0.24, -height * 0.5, width * 0.48, 5);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-width * 0.22, -height * 0.45, 9, 5);
      ctx.fillRect(width * 0.08, -height * 0.45, 9, 5);

      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(-3, -height * 0.46, 6, height * 0.86);
      ctx.fillStyle = '#020617';
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ASDF', 0, height * 0.28);
      ctx.restore();
    },

    drawTraffic(ctx, x, y, kind) {
      const palettes = [
        ['#1d4ed8', '#60a5fa'],
        ['#581c87', '#c084fc'],
        ['#334155', '#94a3b8'],
      ];
      const [dark, light] = palettes[kind % palettes.length];
      const width = CONFIG.obstacleWidth;
      const height = CONFIG.obstacleHeight;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 10, width * 0.55, height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      const body = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
      body.addColorStop(0, dark);
      body.addColorStop(0.5, light);
      body.addColorStop(1, dark);
      ctx.fillStyle = body;
      this.roundRect(ctx, -width / 2, -height / 2, width, height, 10);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      this.roundRect(ctx, -width * 0.28, -height * 0.22, width * 0.56, height * 0.24, 6);
      ctx.fill();
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(-width * 0.36, height * 0.38, 12, 5);
      ctx.fillRect(width * 0.18, height * 0.38, 12, 5);
      ctx.restore();
    },

    drawBoost(ctx, x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      const grad = ctx.createLinearGradient(-24, -24, 24, 24);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(1, '#67e8f9');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 18;
      this.roundRect(ctx, -22, -22, 44, 44, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7, 9);
      ctx.lineTo(0, -10);
      ctx.lineTo(8, 9);
      ctx.stroke();
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
      if (this.instance) this.instance.stop();
      this.instance = null;
      this.canvas = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.DexDash = DexDash;
  window.DexDash = DexDash;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('dexdash', DexDash);
})();
