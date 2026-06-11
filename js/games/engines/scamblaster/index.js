/**
 * ASDF Games - Scam Blaster Engine (Modular)
 */

'use strict';

(function () {
  const CONFIG = window.ASDF.ScamBlasterConfig;
  const Renderer = window.ASDF.ScamBlasterRenderer;
  const Logic = window.ASDF.ScamBlasterLogic;
  const THREAT_THEMES = window.ASDF.ScamBlasterThemes;
  const SCAM_LABELS = window.ASDF.ScamBlasterLabels;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const ScamBlaster = {
    version: '2.8.0',
    gameId: 'scamblaster',
    instance: null,
    juice: null,
    _cleanupInput: null,
    _cleanupResize: null,
    _resizeTimer: null,
    _enemyQuery: null,
    _lifespanQuery: null,
    layout: null,

    enemyTypes: [
      { icon: 'A', label: 'SCAM', points: 8, speed: 1.2, size: 34, sprite: 'badge' },
      { icon: 'S', label: 'RUG', points: 13, speed: 1.4, size: 40, sprite: 'tile' },
      { icon: 'D', label: 'BOT', points: 21, speed: 1.6, size: 45, sprite: 'gem' },
      { icon: 'F', label: 'FAKE', points: 34, speed: 1.8, size: 34, sprite: 'chip' },
      { icon: 'X', label: 'PHISH', points: 55, speed: 1.3, size: 55, sprite: 'trap' },
    ],

    start(gameId) {
      this.stop();
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;
      this.createArena(arena);
      const canvas = document.getElementById('sb-canvas');
      this.instance = new window.ASDF.GameInstance(canvas, { maxEntities: 900, debug: false });
      this.instance.resize();
      if (window.ASDF?.GameJuice)
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();
      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('MOVE_LEFT', ['KeyA', 'ArrowLeft']);
        input.mapAction('MOVE_RIGHT', ['KeyD', 'ArrowRight']);
        input.mapAction('FIRE', ['Space', 'Enter']);
      }

      world.registerComponent('Enemy', { hp: 'u8', points: 'u8', typeIndex: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32', initial: 'f32' });
      world.registerComponent('ThreatMeta', { level: 'u8', age: 'f32', intensity: 'f32' });
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      world.setResource('GameState', {
        score: 0,
        lives: 3,
        wave: 1,
        phase: 'select',
        gameMode: null,
        spawnTimer: 0,
        countdown: CONFIG.countdownSeconds,
        shots: 0,
        hits: 0,
        streak: 0,
        bestStreak: 0,
        level: 1,
        elapsed: 0,
        threatCount: 0,
        aimX: canvas.width / 2,
        aimY: canvas.height * 0.52,
        aimActive: false,
      });

      this.dom = {
        score: document.getElementById('sb-score'),
        lives: document.getElementById('sb-lives'),
        modeSelect: document.getElementById('sb-mode-select'),
        hud: document.getElementById('sb-hud'),
        countdown: document.getElementById('sb-countdown'),
        streak: document.getElementById('sb-streak'),
        wave: document.getElementById('sb-wave'),
        threatCount: document.getElementById('sb-threat-count'),
      };

      this.setupModeSelection();
      this.setupInput();
      this.updateLayout();
      this._enemyQuery = world.createQuery(['Position', 'Enemy', 'ThreatMeta']);
      this._lifespanQuery = world.createQuery(['Lifespan', 'Enemy', 'Position']);

      this.instance.onUpdate = (dt, dtMs) => {
        let shouldFreeze = false;
        if (this.juice) shouldFreeze = this.juice.update(dt / 60, dtMs);
        if (kernel.services?.hud)
          kernel.services.hud.update(this.gameId, world.getResource('GameState'));
        return shouldFreeze;
      };

      this.instance.onRender = () => {
        if (this.juice) this.juice.renderPre();
        Renderer.draw(this);
        if (this.juice) this.juice.renderPost();
      };

      world.addSystem(ASDF.PersonalitySystem.create());
      world.addSystem(Logic.create(this));
      world.addSystem(ASDF.PhysicsSystem.createMovement());
      this.instance.start();

      const onResize = () => {
        if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
        this._resizeTimer = window.setTimeout(() => {
          this.instance.resize();
          this.updateLayout();
        }, 120);
      };
      this._cleanupResize = () => window.removeEventListener('resize', onResize);
      window.addEventListener('resize', onResize);
    },

    updateLayout() {
      const w = this.instance.canvas.width;
      this.layout = {
        lanePadding: Math.max(12, w * CONFIG.lanePadding),
        laneWidth: Math.max(72, Math.floor((w * (1 - CONFIG.lanePadding * 2)) / CONFIG.laneCount)),
        centerY: this.instance.canvas.height * 0.18,
      };
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="sb-container">
          <canvas id="sb-canvas" class="sb-canvas"></canvas>
          <div id="sb-mode-select" class="sb-mode-select">
            <h2 class="sb-mode-title">SCAM BLASTER</h2>
            <div class="sb-mode-btns">
              <button id="sb-select-fall" class="game-btn game-btn-success sb-mode-btn">FALL MODE</button>
              <button id="sb-select-pop" class="game-btn game-btn-purple sb-mode-btn">POP MODE</button>
            </div>
          </div>
          <div id="sb-hud" class="sb-hud game-hidden">
            <span>SCORE <strong id="sb-score">0</strong></span><span>LIVES <strong id="sb-lives">x3</strong></span>
            <span>WAVE <strong id="sb-wave">1</strong></span><span>COMBO <strong id="sb-streak">x0</strong></span>
            <span id="sb-threat-count">THREATS 0</span>
          </div>
          <div id="sb-countdown" class="sb-countdown">3</div>
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
      this.dom.modeSelect.classList.add('sb-mode-select--hidden');
      this.dom.hud.classList.remove('game-hidden');
      this.dom.countdown.classList.add('sb-countdown--visible');
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const cursorSvg =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%23ff0000' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%23ff0000'/%3E%3C/svg%3E";
      canvas.style.cursor = `url("${cursorSvg}") 16 16, crosshair`;
      canvas.onpointerdown = e => {
        const r = canvas.getBoundingClientRect();
        this.shoot(
          (e.clientX - r.left) * (canvas.width / r.width),
          (e.clientY - r.top) * (canvas.height / r.height)
        );
      };
      this._cleanupInput = () => {
        canvas.onpointerdown = null;
        canvas.style.cursor = 'crosshair';
      };
    },

    getDifficulty(state) {
      const level = 1 + Math.floor(state.elapsed / CONFIG.waveScale);
      const intensity = 1 + Math.min(1.7, level * 0.06);
      return {
        level,
        wave: Math.max(1, 1 + Math.floor(state.score / 520)),
        spawnInterval: Math.max(
          CONFIG.spawnIntervalFloor,
          Math.round(
            CONFIG.spawnIntervalBase / intensity -
              Math.min(32, state.wave * 0.32) -
              state.streak * 0.45
          )
        ),
        threatSpeed: 1 + level * CONFIG.baseSpeedScale + Math.min(1.2, state.score / 2600),
      };
    },

    spawnEnemy(world, diff, columnHint = 0) {
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');
      world.addComponent(e, 'ThreatMeta');
      world.addComponent(e, 'Rotation');
      world.addComponent(e, 'Scale');
      const typeIdx =
        (Math.floor(Math.random() * this.enemyTypes.length) + state.wave + columnHint) %
        this.enemyTypes.length;
      const type = this.enemyTypes[typeIdx];
      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const en = world.componentRegistry.get('Enemy').props;
      const meta = world.componentRegistry.get('ThreatMeta').props;
      const layout = this.layout;
      const lane = Math.floor(Math.random() * CONFIG.laneCount);
      const x =
        layout.lanePadding +
        (lane + 0.5) *
          (Math.max(56, this.instance.canvas.width - layout.lanePadding * 2) / CONFIG.laneCount);
      if (state.gameMode === 'fall') {
        pos.x[idx] = clamp(x, 52, this.instance.canvas.width - 52);
        pos.y[idx] = -42;
        vel.vy[idx] = type.speed * diff.threatSpeed * (1 + state.wave * 0.045);
      } else {
        pos.x[idx] = clamp(x, 72, this.instance.canvas.width - 72);
        pos.y[idx] = 80 + Math.random() * (this.instance.canvas.height - 260);
        world.addComponent(e, 'Lifespan');
        const life = world.componentRegistry.get('Lifespan').props;
        const scaledLife = Math.max(
          42,
          CONFIG.popBaseLife - state.wave * CONFIG.popLifeLossPerWave
        );
        life.initial[idx] = scaledLife;
        life.remaining[idx] = scaledLife;
      }
      meta.level[idx] = state.wave;
      meta.intensity[idx] = diff.threatSpeed;
      meta.age[idx] = 0;
      en.typeIndex[idx] = typeIdx;
      en.hp[idx] = 1;
      en.points[idx] = Math.round(type.points + Math.floor(state.wave * 1.5));
      rend.iconIndex[idx] = typeIdx;
      rend.size[idx] = type.size + Math.min(8, Math.floor(state.level * 0.42));
    },

    shoot(x, y) {
      const state = this.instance.world.getResource('GameState');
      if (state.phase !== 'playing') return;
      const { dense, count } = this._enemyQuery.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;
      const rend = this.instance.world.componentRegistry.get('Renderable').props;
      const en = this.instance.world.componentRegistry.get('Enemy').props;
      state.shots++;
      for (let i = count - 1; i >= 0; i--) {
        const idx = dense[i];
        const dx = pos.x[idx] - x,
          dy = pos.y[idx] - y;
        if (dx * dx + dy * dy < Math.pow(rend.size[idx] * 0.94, 2)) {
          state.hits++;
          state.streak++;
          state.bestStreak = Math.max(state.bestStreak, state.streak);
          const pts = Math.round(en.points[idx] * (1 + Math.floor(state.streak / 5) * 0.25));
          state.score += pts;
          state.wave = 1 + Math.floor(state.score / 520);
          if (this.juice) {
            this.juice.impact(pos.x[idx], pos.y[idx], {
              intensity: state.streak >= 10 ? 'heavy' : 'medium',
            });
            this.juice.textPop(pos.x[idx], pos.y[idx], `+${pts}`, {
              color: '#fbbf24',
              size: 24 + Math.min(10, state.streak),
            });
          }
          this.instance.world.destroyEntity(this.instance.world.getEntityId(idx));
          return;
        }
      }
      state.streak = 0;
    },

    loseLife(world, id) {
      const state = world.getResource('GameState');
      const pos = world.componentRegistry.get('Position').props;
      if (this.juice)
        this.juice.impact(pos.x[world.getIndex(id)], pos.y[world.getIndex(id)], {
          intensity: 'light',
        });
      state.lives--;
      state.streak = 0;
      world.destroyEntity(id);
      if (state.lives <= 0 && typeof endGame === 'function') endGame(this.gameId, state.score);
    },

    updateUI(state) {
      this.dom.score.textContent = state.score;
      this.dom.streak.textContent = `x${state.streak}`;
      this.dom.wave.textContent = state.wave;
      this.dom.lives.textContent = `x${Math.max(0, state.lives)}`;
    },

    drawAtmosphere(ctx, w, h, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          seed: state.wave + Math.floor(state.elapsed || 0),
        });
      } else {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
      }
    },

    drawThreats(ctx) {
      const world = this.instance.world;
      const { dense, count } = this._enemyQuery.set;
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const enemy = world.componentRegistry.get('Enemy').props;
      const meta = world.componentRegistry.get('ThreatMeta').props;
      const rot = world.componentRegistry.get('Rotation')?.props;
      const scale = world.componentRegistry.get('Scale')?.props;
      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const type = enemy.typeIndex[idx] || 0;
        ctx.save();
        ctx.translate(pos.x[idx], pos.y[idx]);
        ctx.rotate(rot ? rot.angle[idx] : 0);
        ctx.scale(scale ? scale.x[idx] : 1, scale ? scale.y[idx] : 1);
        Renderer.drawThreat(
          ctx,
          0,
          0,
          rend.size[idx] || 36,
          type,
          SCAM_LABELS[type % SCAM_LABELS.length],
          { intensity: meta.intensity[idx], age: meta.age[idx] },
          this
        );
        ctx.restore();
      }
    },

    drawThreatBars(ctx, w, h, state) {
      if (state.phase === 'playing') {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(16, h * 0.84 + 14, Math.min(w - 32, (w - 32) * ((state.wave % 8) / 8)), 5);
      }
    },

    drawPopBars() {
      const state = this.instance.world.getResource('GameState');
      if (state.gameMode !== 'pop') return;
      const world = this.instance.world;
      const { dense, count } = this._lifespanQuery.set;
      const pos = world.componentRegistry.get('Position').props;
      const life = world.componentRegistry.get('Lifespan').props;
      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const ratio = Math.max(0, life.remaining[idx] / life.initial[idx]);
        this.instance.ctx.strokeStyle = ratio > 0.5 ? '#ffcc00' : '#f43f5e';
        this.instance.ctx.lineWidth = 2.8;
        this.instance.ctx.beginPath();
        this.instance.ctx.arc(
          pos.x[idx],
          pos.y[idx],
          35,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * ratio
        );
        this.instance.ctx.stroke();
      }
    },

    stop() {
      if (this._cleanupInput) this._cleanupInput();
      if (this._cleanupResize) this._cleanupResize();
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.ScamBlaster = ScamBlaster;
  window.ScamBlaster = ScamBlaster;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('scamblaster', ScamBlaster);
})();
