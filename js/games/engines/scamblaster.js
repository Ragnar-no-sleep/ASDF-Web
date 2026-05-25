/**
 * ASDF Games - Scam Blaster Engine (11/10 ECS Edition)
 *
 * Shooter game: Shoot down scam tokens and rug projects
 * Migrated to ECS for peak performance and modularity.
 */

'use strict';

(function () {
  const ScamBlaster = {
    version: '2.1.0',
    gameId: 'scamblaster',
    instance: null,

    enemyTypes: [
      { icon: '🪙', points: 8, speed: 1.2, size: 34 },
      { icon: '🔴', points: 13, speed: 1.4, size: 40 },
      { icon: '💀', points: 21, speed: 1.6, size: 45 },
      { icon: '🦠', points: 34, speed: 1.8, size: 34 },
      { icon: '👤', points: 55, speed: 1.3, size: 55 },
    ],

    start(gameId) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) {
        console.error(`[ScamBlaster] Arena arena-${gameId} not found`);
        return;
      }

      this.createArena(arena);
      const canvas = document.getElementById('sb-canvas');

      if (!window.ASDF || !window.ASDF.GameInstance) {
        console.error('[ScamBlaster] ASDF Framework not loaded correctly');
        return;
      }

      this.instance = new window.ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      const world = this.instance.world;
      this.instance.initStandardComponents();
      this.instance.resize();

      // Components
      world.registerComponent('Enemy', { hp: 'u8', points: 'u8', typeIndex: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32', initial: 'f32' });

      // State
      world.setResource('GameState', {
        score: 0,
        lives: 3,
        wave: 1,
        phase: 'select',
        gameMode: null,
        spawnTimer: 0,
        countdown: 3,
      });

      this.dom = {
        score: document.getElementById('sb-score'),
        lives: document.getElementById('sb-lives'),
        modeSelect: document.getElementById('sb-mode-select'),
        hud: document.getElementById('sb-hud'),
        countdown: document.getElementById('sb-countdown'),
      };

      this.setupModeSelection();
      this.setupInput();

      // Render Hook
      const icons = [...this.enemyTypes.map(e => e.icon), '💥', '💔'];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      // Logic System
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      this.instance.start();
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="sb-container" style="width:100%; height:100%; position:relative; background:#000;">
          <canvas id="sb-canvas" style="width:100%; height:100%; display:block;"></canvas>
          <div id="sb-mode-select" class="game-mode-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.8); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:100;">
            <h2 style="color:#fff; margin-bottom:20px;">TARGET: SCAMS</h2>
            <div style="display:flex; gap:20px;">
              <button id="sb-select-fall" class="game-btn game-btn-success">FALL MODE</button>
              <button id="sb-select-pop" class="game-btn game-btn-purple">POP MODE</button>
            </div>
          </div>
          <div id="sb-hud" class="game-hidden" style="position:absolute; top:10px; left:10px; color:#fff; pointer-events:none;">
            SCORE: <span id="sb-score">0</span> | LIVES: <span id="sb-lives">❤️❤️❤️</span>
          </div>
          <div id="sb-countdown" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:80px; display:none; pointer-events:none;">3</div>
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
      this.dom.hud.classList.remove('game-hidden');
      this.dom.countdown.style.display = 'block';
    },

    setupInput() {
      const canvas = this.instance.canvas;
      canvas.addEventListener('pointerdown', e => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        this.shoot(x, y);
      });
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
        if (state.spawnTimer >= 60) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        // Cleanup Lifespans
        const query = world.createQuery(['Lifespan']);
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

    spawnEnemy(world) {
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');

      const typeIdx = Math.floor(Math.random() * this.enemyTypes.length);
      const type = this.enemyTypes[typeIdx];
      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const en = world.componentRegistry.get('Enemy').props;

      pos.x[idx] = 50 + Math.random() * (this.instance.canvas.width - 100);
      pos.y[idx] = -40;
      vel.vy[idx] = type.speed;

      en.typeIndex[idx] = typeIdx;
      en.hp[idx] = 1;
      en.points[idx] = type.points;
      rend.iconIndex[idx] = typeIdx;
      rend.size[idx] = type.size;
    },

    shoot(x, y) {
      const world = this.instance.world;
      const state = world.getResource('GameState');
      if (state.phase !== 'playing') return;

      const enemies = world.createQuery(['Position', 'Enemy']);
      const { dense, count } = enemies.set;
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const en = world.componentRegistry.get('Enemy').props;

      for (let i = count - 1; i >= 0; i--) {
        const idx = dense[i];
        if (Math.hypot(pos.x[idx] - x, pos.y[idx] - y) < rend.size[idx]) {
          state.score += en.points[idx];
          this.addEffect(world, pos.x[idx], pos.y[idx], this.enemyTypes.length); // 💥
          world.destroyEntity(world.getEntityId(idx));
          return;
        }
      }
    },

    addEffect(world, x, y, iconIdx) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Lifespan');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = iconIdx;
      world.componentRegistry.get('Renderable').props.size[idx] = 40;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 20;
      world.componentRegistry.get('Lifespan').props.initial[idx] = 20;
    },

    updateUI(state) {
      this.dom.score.textContent = state.score;
      this.dom.lives.innerHTML = '❤️'.repeat(Math.max(0, state.lives));
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, this.instance.canvas.width, this.instance.canvas.height);
      defaultRender(this.instance.world, alpha);
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
