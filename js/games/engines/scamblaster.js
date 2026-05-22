/**
 * ASDF Games - Scam Blaster Engine (11/10 ECS Edition)
 *
 * Shooter game: Shoot down scam tokens and rug projects
 * Migrated to ECS for peak performance and modularity.
 */

'use strict';

(function () {
  const ScamBlaster = {
    version: '2.0.0',
    gameId: 'scamblaster',
    instance: null,

    // Data Definitions
    enemyTypes: [
      { icon: '🪙', name: 'SCAM COIN', points: 8, speed: 1, size: 34 },
      { icon: '🔴', name: 'RUG TOKEN', points: 13, speed: 1.2, size: 40 },
      { icon: '💀', name: 'HONEYPOT', points: 21, speed: 1.4, size: 45 },
      { icon: '🦠', name: 'MALWARE', points: 34, speed: 1.6, size: 34 },
      { icon: '👤', name: 'FAKE DEV', points: 55, speed: 1.3, size: 55 },
      { icon: '🛡️', name: 'SHIELDED', points: 89, speed: 0.8, size: 50, hp: 2 },
      { icon: '🧬', name: 'SPLITTER', points: 34, speed: 1.1, size: 45, splitter: true },
    ],

    powerUpTypes: [
      { icon: '❤️', name: 'LIFE', effect: 'life', chance: 0.05 },
      { icon: '🌟', name: 'SPREAD', effect: 'spread', chance: 0.08, duration: 300 },
      { icon: '⚡', name: 'PIERCE', effect: 'pierce', chance: 0.08, duration: 300 },
      { icon: '❄️', name: 'FREEZE', effect: 'slow', chance: 0.06, duration: 200 },
      { icon: '💰', name: 'BONUS', effect: 'score', chance: 0.1 },
    ],

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('sb-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Register Components
      world.registerComponent('Enemy', {
        points: 'u16',
        hp: 'u8',
        maxHp: 'u8',
        typeIndex: 'u8',
        slowed: 'u8',
      });
      world.registerComponent('Lifespan', { remaining: 'f32', initial: 'f32' });

      // State Resource
      world.setResource('GameState', {
        score: 0,
        lives: 3,
        wave: 1,
        phase: 'select',
        gameMode: null,
        countdown: 3,
        spawnTimer: 0,
        combo: 0,
        lastKillFrame: 0,
      });

      this.dom = {
        lives: document.getElementById('sb-lives'),
        score: document.getElementById('sb-score'),
        wave: document.getElementById('sb-wave'),
        combo: document.getElementById('sb-combo'),
        countdown: document.getElementById('sb-countdown'),
        modeSelect: document.getElementById('sb-mode-select'),
        hud: document.getElementById('sb-hud'),
        wallet: document.getElementById('sb-wallet'),
      };

      this.setupModeSelection();
      this.setupInput();
      this.preloadSprites();

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      // Use the new onRender hook (Maximum stability)
      const icons = [...this.enemyTypes.map(e => e.icon), '💥'];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="sb-container">
          <canvas id="sb-canvas" class="game-canvas"></canvas>
          <div id="sb-mode-select" class="game-mode-overlay">
            <h2 class="sb-title">🎯 SCAM BLASTER</h2>
            <div class="game-flex-row">
              <button id="sb-select-fall" class="game-btn game-btn-success">FALL MODE</button>
              <button id="sb-select-pop" class="game-btn game-btn-purple">POP MODE</button>
            </div>
          </div>
          <div id="sb-hud" class="game-hidden">
            <div class="game-hud-tl">
              <div class="game-hud-stat">SCORE: <span id="sb-score">0</span></div>
              <div class="game-hud-stat">WAVE: <span id="sb-wave">1</span></div>
              <div class="game-hud-stat">COMBO: <span id="sb-combo">-</span></div>
            </div>
            <div class="game-hud-tr">
              <div id="sb-lives">❤️❤️❤️</div>
            </div>
            <div id="sb-wallet" class="sb-wallet">💼 YOUR WALLET</div>
          </div>
          <div id="sb-countdown" class="game-countdown"></div>
        </div>
      `;
    },

    setupModeSelection() {
      document.getElementById('sb-select-fall').onclick = () => this.selectMode('fall');
      document.getElementById('sb-select-pop').onclick = () => this.selectMode('pop');
    },

    selectMode(mode) {
      const state = this.instance.world.getResource('GameState');
      state.gameMode = mode;
      state.phase = 'countdown';
      this.dom.modeSelect.style.display = 'none';
      this.dom.hud.style.display = 'block';
      this.dom.countdown.style.display = 'block';
      if (mode === 'fall') this.dom.wallet.style.display = 'flex';
    },

    setupInput() {
      const canvas = this.instance.canvas;
      canvas.addEventListener('pointerdown', e => {
        const rect = canvas.getBoundingClientRect();
        // Scale coordinates to internal canvas resolution
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        this.shoot(x, y);
      });
      // Hardware cursor for zero-latency
      const svgCursor = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="%23ef4444" stroke-width="2"/><path d="M 0 25 L 17 25 M 33 25 L 50 25 M 25 0 L 25 17 M 25 33 L 25 50" stroke="%23ef4444" stroke-width="2"/><circle cx="25" cy="25" r="3" fill="%23ef4444"/></svg>`;
      canvas.style.cursor = `url('${svgCursor}') 25 25, crosshair`;
    },

    preloadSprites() {
      const sprites = [
        ...this.enemyTypes.map(e => ({ emoji: e.icon, size: e.size })),
        { emoji: '💥', size: 35 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.phase === 'select') return;

        if (state.phase === 'countdown') {
          state.countdown -= dt / 60;
          if (state.countdown <= 0) {
            state.phase = 'playing';
            self.dom.countdown.style.display = 'none';
          } else {
            self.dom.countdown.textContent = Math.ceil(state.countdown);
          }
          return;
        }

        // Spawn
        state.spawnTimer += dt;
        if (state.spawnTimer >= Math.max(20, 80 - state.wave * 5)) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        // Mode specific logic
        const walletY = self.instance.canvas.height - 90;
        const enemies = world.createQuery(['Position', 'Enemy']);
        const { dense, count } = enemies.set;
        const pos = world.componentRegistry.get('Position').props;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (state.gameMode === 'fall' && pos.y[idx] > walletY) {
            self.loseLife(world, world.getEntityId(idx));
          }
        }

        // Lifespan
        const lifespans = world.createQuery(['Lifespan']);
        const lifeProps = world.componentRegistry.get('Lifespan').props;
        const { dense: lDense, count: lCount } = lifespans.set;
        for (let i = lCount - 1; i >= 0; i--) {
          const idx = lDense[i];
          lifeProps.remaining[idx] -= dt;
          if (lifeProps.remaining[idx] <= 0) {
            if (world.componentRegistry.get('Enemy').props.hp[idx] !== undefined) {
              self.loseLife(world, world.getEntityId(idx));
            } else {
              world.destroyEntity(world.getEntityId(idx));
            }
          }
        }

        self.updateUI(state);
      };
    },

    spawnEnemy(world) {
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');

      const type =
        this.enemyTypes[Math.floor(Math.random() * Math.min(state.wave, this.enemyTypes.length))];
      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const en = world.componentRegistry.get('Enemy').props;

      if (state.gameMode === 'fall') {
        pos.x[idx] = 40 + Math.random() * (this.instance.canvas.width - 80);
        pos.y[idx] = -40;
        vel.vy[idx] = type.speed * (1.5 + state.wave * 0.1);
      } else {
        pos.x[idx] = 60 + Math.random() * (this.instance.canvas.width - 120);
        pos.y[idx] = 60 + Math.random() * (this.instance.canvas.height - 180);
        world.addComponent(e, 'Lifespan');
        const life = world.componentRegistry.get('Lifespan').props;
        life.initial[idx] = 100 - state.wave * 4;
        life.remaining[idx] = life.initial[idx];
      }

      en.typeIndex[idx] = this.enemyTypes.indexOf(type);
      en.hp[idx] = type.hp || 1;
      en.points[idx] = type.points;
      rend.iconIndex[idx] = en.typeIndex[idx];
      rend.size[idx] = type.size;
    },

    shoot(x, y) {
      const world = this.instance.world;
      const state = world.getResource('GameState');
      const query = world.createQuery(['Position', 'Enemy']);
      const { dense, count } = query.set;
      const pos = world.componentRegistry.get('Position').props;
      const en = world.componentRegistry.get('Enemy').props;
      const rend = world.componentRegistry.get('Renderable').props;

      for (let i = count - 1; i >= 0; i--) {
        const idx = dense[i];
        const dx = x - pos.x[idx];
        const dy = y - pos.y[idx];
        if (Math.sqrt(dx * dx + dy * dy) < rend.size[idx]) {
          state.score += en.points[idx];
          this.addExplosion(world, pos.x[idx], pos.y[idx]);
          world.destroyEntity(world.getEntityId(idx));
          return;
        }
      }
    },

    loseLife(world, id) {
      const state = world.getResource('GameState');
      state.lives--;
      this.addExplosion(world, 0, 0); // TODO: proper pos
      world.destroyEntity(id);
      if (state.lives <= 0) endGame(this.gameId, state.score);
    },

    addExplosion(world, x, y) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Lifespan');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = this.enemyTypes.length; // Explosion (last icon)
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 20;
      world.componentRegistry.get('Lifespan').props.initial[idx] = 20;
    },

    updateUI(state) {
      this.dom.score.textContent = state.score;
      this.dom.lives.innerHTML = '❤️'.repeat(Math.max(0, state.lives));
      this.dom.wave.textContent = state.wave;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, this.instance.canvas.width, this.instance.canvas.height);

      const world = this.instance.world;
      const state = world.getResource('GameState');

      // Use Standard Render System
      defaultRender(world, alpha);

      // Game-specific Overlay (Pop Rings)
      if (state.gameMode === 'pop') {
        const query = world.createQuery(['Position', 'Renderable', 'Lifespan']);
        const { dense, count } = query.set;
        const pos = world.componentRegistry.get('Position').props;
        const rend = world.componentRegistry.get('Renderable').props;
        const life = world.componentRegistry.get('Lifespan').props;

        ctx.lineWidth = 2;
        for (let i = 0; i < count; i++) {
          const idx = dense[i];
          if (life.remaining[idx] === undefined) continue;

          const progress = life.remaining[idx] / life.initial[idx];
          ctx.strokeStyle = progress > 0.5 ? '#22c55e' : '#ef4444';
          ctx.beginPath();
          ctx.arc(
            pos.x[idx],
            pos.y[idx],
            rend.size[idx] + 5,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * progress
          );
          ctx.stroke();
        }
      }
    },

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.ScamBlaster = ScamBlaster;
  window.ScamBlaster = ScamBlaster;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('scamblaster', ScamBlaster);
})();
