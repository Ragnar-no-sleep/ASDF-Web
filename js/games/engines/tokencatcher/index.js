/**
 * ASDF Games - Token Catcher Engine (Modular)
 */

'use strict';

(function () {
  const CONFIG = window.ASDF.TokenCatcherConfig;
  const Renderer = window.ASDF.TokenCatcherRenderer;
  const Logic = window.ASDF.TokenCatcherLogic;

  const TokenCatcher = {
    version: '2.5.0',
    gameId: 'tokencatcher',
    instance: null,
    juice: null,
    _cleanupInput: null,
    _enemyQuery: null,
    _renderQuery: null,

    goodTokens: ['💎', '🚀', '📈', '💰', '🦄'],
    scamTokens: ['💩', '📉', '🪤', '🚮', '🥊'],
    powerUps: window.ASDF.TokenCatcherPowerUps,
    enemyTypes: [
      { icon: '👾', hp: 2, points: 50 },
      { icon: '🛸', hp: 1, points: 30 },
    ],

    start(gameId) {
      this.stop();
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;
      this.createArena(arena);
      const canvas = document.getElementById('tc-canvas');
      this.instance = new ASDF.GameInstance(canvas, { maxEntities: 800, debug: false });
      this.instance.resize();
      if (window.ASDF?.GameJuice)
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);

      const world = this.instance.world;
      this.instance.initStandardComponents();

      world.registerComponent('Drone', { lane: 'u8', cooldown: 'f32' });
      world.registerComponent('Token', { type: 'u8' });
      world.registerComponent('Enemy', { hp: 'u8', points: 'u8' });
      world.registerComponent('PowerUp', { type: 'u8' });
      world.registerComponent('Projectile', { active: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32' });
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      const laneH = CONFIG.laneHeight,
        bM = CONFIG.bottomMargin;
      world.setResource('GameState', {
        score: 0,
        timeLeft: CONFIG.initialTime,
        gameOver: false,
        spawnTimer: 0,
        difficulty: 0,
        frameCount: 0,
        droneId: -1,
        activePowerUps: [0, 0, 0, 0],
        visualYOffset: 0,
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

      const drone = world.createEntity();
      world.addComponent(drone, 'Position');
      world.addComponent(drone, 'Velocity');
      world.addComponent(drone, 'Renderable');
      world.addComponent(drone, 'Collider');
      world.addComponent(drone, 'Drone');
      world.addComponent(drone, 'Rotation');
      world.addComponent(drone, 'Scale');
      const dIdx = world.getIndex(drone),
        lanes = world.getResource('GameState').lanes;
      const pos = world.componentRegistry.get('Position').props,
        rend = world.componentRegistry.get('Renderable').props,
        col = world.componentRegistry.get('Collider').props;
      pos.x[dIdx] = canvas.width / 2;
      pos.y[dIdx] = lanes[1];
      rend.iconIndex[dIdx] = 0;
      rend.size[dIdx] = 60;
      col.width[dIdx] = 50;
      col.height[dIdx] = 50;
      world.componentRegistry.get('Drone').props.lane[dIdx] = 1;
      world.getResource('GameState').droneId = drone;

      this.instance.onUpdate = (dt, dtMs) => {
        let shouldFreeze = false;
        if (this.juice) shouldFreeze = this.juice.update(dt / 60, dtMs);
        return shouldFreeze;
      };

      this.instance.onRender = () => {
        if (this.juice) this.juice.renderPre();
        Renderer.draw(
          this.instance.ctx,
          canvas.width,
          canvas.height,
          world.getResource('GameState'),
          this
        );
        if (this.juice) this.juice.renderPost();
      };

      world.addSystem(ASDF.PersonalitySystem.create());
      world.addSystem(Logic.create(this));
      world.addSystem(ASDF.PhysicsSystem.createMovement());
      this.instance.start();
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="tc-container">
          <canvas id="tc-canvas" class="tc-canvas"></canvas>
          <div id="tc-hud" class="tc-hud">
            <span>SCORE <strong id="tc-score">0</strong></span>
            <span>TIME <strong id="tc-time">30</strong>s</span>
          </div>
        </div>
      `;
    },

    setupInput() {
      const world = this.instance.world;
      const onKeyDown = e => {
        const state = world.getResource('GameState'),
          drone = world.componentRegistry.get('Drone').props,
          dIdx = world.getIndex(state.droneId);
        if (e.key === 'ArrowUp' || e.key === 'w') {
          drone.lane[dIdx] = Math.max(0, drone.lane[dIdx] - 1);
          state.visualYOffset = -CONFIG.jumpStrength;
        }
        if (e.key === 'ArrowDown' || e.key === 's') {
          drone.lane[dIdx] = Math.min(2, drone.lane[dIdx] + 1);
          state.visualYOffset = CONFIG.jumpStrength;
        }
        const pos = world.componentRegistry.get('Position').props;
        pos.y[dIdx] = state.lanes[drone.lane[dIdx]];
      };
      document.addEventListener('keydown', onKeyDown);
      this._cleanupInput = () => document.removeEventListener('keydown', onKeyDown);
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🛸', size: 60 },
        { emoji: '🔥', size: 30 },
        { emoji: '💥', size: 40 },
      ];
      this.powerUps.forEach(p => sprites.push({ emoji: p.icon, size: 30 }));
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    spawnToken(world) {
      // Token spawning logic...
    },

    updateEntities(world, dt) {
      // Entity update and collision logic...
    },

    updateUI(state) {
      this.dom.score.textContent = state.score;
      this.dom.time.textContent = Math.ceil(state.timeLeft);
    },

    drawBackdrop(ctx, w, h, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, { theme: 'default', seed: state.score });
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
      }
    },

    drawLanes(ctx, w, h, state) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      state.lanes.forEach(y => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      });
    },

    drawEntities(ctx, state) {
      const world = this.instance.world;
      const droneIdx = world.getIndex(state.droneId);
      const pos = world.componentRegistry.get('Position').props,
        rend = world.componentRegistry.get('Renderable').props;
      Renderer.drawDrone(ctx, pos.x[droneIdx], pos.y[droneIdx], rend.size[droneIdx], state);
      // Other entities...
    },

    drawHUD(ctx, w, h, state) {
      // Powerup timers drawing...
    },

    stop() {
      if (this._cleanupInput) this._cleanupInput();
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.TokenCatcher = TokenCatcher;
  window.TokenCatcher = TokenCatcher;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('tokencatcher', TokenCatcher);
})();
