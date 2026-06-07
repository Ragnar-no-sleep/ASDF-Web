/**
 * ASDF Games - Scam Blaster Engine
 *
 * Shooter game: neutralize scam artifacts and rug campaigns.
 * Visuals and pacing are tuned in an arcade way for desktop and mobile.
 */

'use strict';

(function () {
  const CONFIG = {
    spawnIntervalBase: 58,
    spawnIntervalFloor: 18,
    baseMaxThreats: 14,
    laneCount: 8,
    lanePadding: 0.04,
    minThreatRadius: 30,
    popBaseLife: 88,
    popLifeLossPerWave: 2.1,
    baseSpeedScale: 0.038,
    iconFont: 'Orbitron, sans-serif',
    countdownSeconds: 3,
    waveScale: 6.5,
    popScoreScale: 1.18,
    gridCell: 62,
    entityPulseSpeed: 0.0025,
  };

  const SCAM_LABELS = ['SCAM', 'RUG', 'BOT', 'FAKE', 'PHISH', 'DRIFT'];
  const THREAT_THEMES = [
    {
      primary: '#ef4444',
      secondary: '#7f1d1d',
      glow: '#fca5a5',
      accent: '#f87171',
      level: 'critical',
      shape: 'hex',
      pulse: 1.2,
    },
    {
      primary: '#f97316',
      secondary: '#7c2d12',
      glow: '#fed7aa',
      accent: '#fdba74',
      level: 'elevated',
      shape: 'shield',
      pulse: 1.1,
    },
    {
      primary: '#a855f7',
      secondary: '#581c87',
      glow: '#ddd6fe',
      accent: '#d8b4fe',
      level: 'high',
      shape: 'diamond',
      pulse: 1.08,
    },
    {
      primary: '#22c55e',
      secondary: '#14532d',
      glow: '#bbf7d0',
      accent: '#86efac',
      level: 'low',
      shape: 'plate',
      pulse: 1.05,
    },
    {
      primary: '#38bdf8',
      secondary: '#0c4a6e',
      glow: '#bae6fd',
      accent: '#7dd3fc',
      level: 'low',
      shape: 'plate',
      pulse: 1.06,
    },
    {
      primary: '#f43f5e',
      secondary: '#9f1239',
      glow: '#fda4af',
      accent: '#fb7185',
      level: 'critical',
      shape: 'hex',
      pulse: 1.18,
    },
  ];

  const ScamBlaster = {
    version: '2.7.0',
    gameId: 'scamblaster',
    instance: null,
    _cleanupInput: null,
    _cleanupResize: null,
    _resizeTimer: null,
    _enemyQuery: null,
    _lifespanQuery: null,
    layout: null,

    enemyTypes: [
      { icon: 'S', label: 'SCAM', points: 8, speed: 1.2, size: 34 },
      { icon: 'R', label: 'RUG', points: 13, speed: 1.4, size: 40 },
      { icon: 'B', label: 'BOT', points: 21, speed: 1.6, size: 45 },
      { icon: 'F', label: 'FAKE', points: 34, speed: 1.8, size: 34 },
      { icon: 'T', label: 'PHISH', points: 55, speed: 1.3, size: 55 },
    ],

    start(gameId) {
      this.stop();

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('sb-canvas');

      this.instance = new window.ASDF.GameInstance(canvas, {
        maxEntities: 900,
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
        input.mapAction('FIRE', ['Space', 'Enter']);
      }

      world.registerComponent('Enemy', { hp: 'u8', points: 'u8', typeIndex: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32', initial: 'f32' });
      world.registerComponent('ThreatMeta', { level: 'u8', age: 'f32', intensity: 'f32' });

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

      this.instance.onUpdate = () => {
        const state = world.getResource('GameState');
        if (kernel.services.hud) {
          kernel.services.hud.update(this.gameId, state);
        }
      };

      this.instance.onRender = () => this.draw();

      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());
      this.instance.start();

      const onResize = () => {
        if (this._resizeTimer) window.clearTimeout(this._resizeTimer);
        this._resizeTimer = window.setTimeout(() => {
          this.instance.resize();
          this.updateLayout();
        }, 120);
      };
      this._cleanupResize = () => {
        window.removeEventListener('resize', onResize);
      };
      window.addEventListener('resize', onResize);
    },

    updateLayout() {
      if (!this.instance || !this.instance.canvas) return;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      this.layout = {
        lanePadding: Math.max(12, w * CONFIG.lanePadding),
        laneWidth: Math.max(72, Math.floor((w * (1 - CONFIG.lanePadding * 2)) / CONFIG.laneCount)),
        centerY: h * 0.18,
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
            SCORE: <span id="sb-score" class="sb-score-label sb-score-value">0</span> | LIVES: <span id="sb-lives" class="sb-life-value">x3</span> | WAVE: <span id="sb-wave" class="sb-wave-value">1</span>
          </div>
          <div id="sb-streak" class="sb-streak">x0</div>
          <div id="sb-threat-count" class="sb-threat-count">THREATS 0</div>
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
      this.dom.modeSelect.style.display = 'none';
      this.dom.hud.classList.remove('game-hidden');
      this.dom.countdown.style.display = 'block';
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const onPointerDown = e => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        this.shoot(x, y);
      };
      const onKeyDown = e => {
        if (e.code === 'Space' || e.code === 'Enter') {
          if (e.cancelable) e.preventDefault();
          const state = this.instance.world.getResource('GameState');
          const x = this.layout
            ? this.layout.centerX || this.instance.canvas.width / 2
            : this.instance.canvas.width / 2;
          const y = this.instance.canvas.height * 0.52;
          this.shoot(x, y);
        }
      };
      canvas.addEventListener('pointerdown', onPointerDown);
      document.addEventListener('keydown', onKeyDown);
      this._cleanupInput = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        document.removeEventListener('keydown', onKeyDown);
        canvas.style.cursor = '';
      };
      const svgCursor =
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="%23ef4444" stroke-width="2"/><path d="M 0 25 L 17 25 M 33 25 L 50 25 M 25 0 L 25 17 M 25 33 L 25 50" stroke="%23ef4444" stroke-width="2"/><circle cx="25" cy="25" r="3" fill="%23ef4444"/></svg>';
      canvas.style.cursor = `url('${svgCursor}') 25 25, crosshair`;
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

        const diff = self.getDifficulty(state);
        state.elapsed += dt / 60;
        state.wave = diff.wave;
        state.level = diff.level;
        state.spawnTimer += dt;
        state.threatCount = self._enemyQuery ? self._enemyQuery.set.count : 0;

        const maxEnemies = Math.min(44, CONFIG.baseMaxThreats + state.wave * 2);
        if (state.threatCount < maxEnemies && state.spawnTimer >= diff.spawnInterval) {
          const toSpawn = Math.min(2, Math.max(1, Math.floor((state.wave + 1) / 2)));
          for (let i = 0; i < toSpawn; i += 1) {
            self.spawnEnemy(world, diff, i);
          }
          state.spawnTimer = Math.max(0, state.spawnTimer - diff.spawnInterval);
        }

        const { dense, count } = self._enemyQuery ? self._enemyQuery.set : { dense: [], count: 0 };
        const pos = world.componentRegistry.get('Position').props;
        const meta = world.componentRegistry.get('ThreatMeta').props;
        const canvasH = self.instance.canvas.height;

        for (let i = count - 1; i >= 0; i -= 1) {
          const idx = dense[i];
          meta.age[idx] += dt;

          if (state.gameMode === 'fall' && pos.y[idx] > canvasH - 52) {
            self.loseLife(world, world.getEntityId(idx));
          }
        }

        const { dense: lsDense, count: lsCount } = self._lifespanQuery
          ? self._lifespanQuery.set
          : { dense: [], count: 0 };
        const lifeProps = world.componentRegistry.get('Lifespan').props;
        const enemyComp = world.componentRegistry.get('Enemy');
        const enemyBit = enemyComp ? enemyComp.bit : 0;
        for (let i = lsCount - 1; i >= 0; i -= 1) {
          const idx = lsDense[i];
          lifeProps.remaining[idx] -= dt;
          if (lifeProps.remaining[idx] <= 0) {
            const isEnemy = enemyBit && (world.entityMasks[idx] & enemyBit) === enemyBit;
            if (isEnemy && state.gameMode === 'pop') {
              self.loseLife(world, world.getEntityId(idx));
            } else {
              world.destroyEntity(world.getEntityId(idx));
            }
          }
        }

        self.updateUI(state);
      };
    },

    getDifficulty(state) {
      const level = 1 + Math.floor(state.elapsed / CONFIG.waveScale);
      const intensity = 1 + Math.min(1.7, level * 0.06);
      const wave = Math.max(1, 1 + Math.floor(state.score / 520));
      const spawnInterval = Math.max(
        CONFIG.spawnIntervalFloor,
        Math.round(
          CONFIG.spawnIntervalBase / intensity -
            Math.min(32, state.wave * 0.32) -
            state.streak * 0.45
        )
      );
      const threatSpeed = 1 + level * CONFIG.baseSpeedScale + Math.min(1.2, state.score / 2600);
      return { level, wave, spawnInterval, threatSpeed };
    },

    spawnEnemy(world, diff, columnHint = 0) {
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');
      world.addComponent(e, 'ThreatMeta');

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

      const layout = this.layout || { lanePadding: 16, laneWidth: 100 };
      const lane = Math.floor(Math.random() * CONFIG.laneCount);
      const usable = Math.max(56, this.instance.canvas.width - layout.lanePadding * 2);
      const x = layout.lanePadding + (lane + 0.5) * (usable / CONFIG.laneCount);

      if (state.gameMode === 'fall') {
        pos.x[idx] = Math.max(
          52,
          Math.min(
            this.instance.canvas.width - 52,
            x + (Math.random() - 0.5) * layout.laneWidth * 0.28
          )
        );
        pos.y[idx] = -42;
        vel.vy[idx] = type.speed * diff.threatSpeed * (1 + state.wave * 0.045);
      } else {
        pos.x[idx] = Math.max(72, Math.min(this.instance.canvas.width - 72, x));
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
      const world = this.instance.world;
      const state = world.getResource('GameState');
      if (state.phase !== 'playing') return;

      const { dense, count } = this._enemyQuery ? this._enemyQuery.set : { dense: [], count: 0 };
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const en = world.componentRegistry.get('Enemy').props;

      state.shots++;
      for (let i = count - 1; i >= 0; i -= 1) {
        const idx = dense[i];
        const hitZone = (rend.size[idx] || 36) * 0.94;
        const dx = pos.x[idx] - x;
        const dy = pos.y[idx] - y;
        if (dx * dx + dy * dy < hitZone * hitZone) {
          state.hits++;
          state.streak++;
          state.bestStreak = Math.max(state.bestStreak, state.streak);
          const multiplier = 1 + Math.floor(state.streak / 5) * 0.25;
          const points = Math.round((en.points[idx] || 8) * multiplier);
          state.score += points;
          state.wave = 1 + Math.floor(state.score / 520);

          if (ASDF?.ParticleSystem) {
            ASDF.ParticleSystem.emit(world, pos.x[idx], pos.y[idx], {
              count: 12 + Math.min(18, state.streak),
              colorIdx: state.streak >= 5 ? 5 : 1,
              speed: 3 + Math.min(5, state.streak * 0.2),
            });
          }

          world.destroyEntity(world.getEntityId(idx));
          return;
        }
      }

      state.streak = 0;
    },

    loseLife(world, id) {
      const state = world.getResource('GameState');
      const pos = world.componentRegistry.get('Position').props;
      const idx = world.getIndex(id);

      if (ASDF?.ParticleSystem) {
        ASDF.ParticleSystem.emit(world, pos.x[idx], pos.y[idx], {
          count: 20,
          colorIdx: 2,
          speed: 5,
        });
      }

      this.instance.shake(10, 15);
      state.lives -= 1;
      state.streak = 0;
      world.destroyEntity(id);

      if (state.lives <= 0) {
        if (typeof endGame === 'function') endGame(this.gameId, state.score);
      }
    },

    updateUI(state) {
      this.dom.score.textContent = String(state.score);
      this.dom.streak.textContent = `x${state.streak}`;
      this.dom.wave.textContent = String(state.wave);
      this.dom.lives.textContent = `x${Math.max(0, state.lives)}`;
      if (this.dom.threatCount) {
        this.dom.threatCount.textContent = `THREATS ${state.threatCount}`;
      }
    },

    draw() {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      this.drawAtmosphere(ctx, w, h, state);
      this.drawThreats(ctx);
      this.drawThreatBars(ctx, w, h, state);
      this.drawPopBars();
    },

    drawAtmosphere(ctx, w, h, state) {
      const pulse = 1 + Math.sin(performance.now() * 0.0015) * 0.02;
      const bg = ctx.createRadialGradient(w / 2, h * 0.12, 0, w / 2, h * 2, Math.max(w, h));
      bg.addColorStop(0, '#050510');
      bg.addColorStop(1, '#0a0516');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const strip = Math.floor((state.elapsed || 0) * 60);
      const shift = (strip * 1.6 * pulse) % 80;
      ctx.save();
      for (let y = -80; y < h + 80; y += CONFIG.gridCell) {
        const alpha = 0.24 - Math.min(0.2, y / h);
        const gx = (strip * 0.8 + y * 0.15 + shift) % 90;
        ctx.fillStyle = `rgba(56,189,248,${Math.max(0.03, alpha)})`;
        ctx.fillRect(((gx + w * 0.18) % w) - 14, y, 2, 26);
        ctx.fillRect(((w - gx) % w) - 4, y + 12, 2, 18);
      }
      for (let x = 0; x < w; x += CONFIG.gridCell) {
        const gx = (x + strip * 2.5) % CONFIG.gridCell;
        ctx.strokeStyle = `rgba(148,163,184,${0.12 + (gx / CONFIG.gridCell) * 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + Math.sin((x + strip) * 0.01) * 4, 0);
        ctx.lineTo(x + Math.sin((x + strip) * 0.01) * 4, h);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawThreatBars(ctx, w, h, state) {
      const barY = h * 0.94;
      const alpha = 0.15 + (state.elapsed % 1) * 0.02;
      const t = performance.now() * 0.0015;
      ctx.save();
      ctx.fillStyle = `rgba(251,191,36,${alpha})`;
      for (let i = 0; i < 40; i++) {
        const x = (i * 48 + Math.sin(t + i * 0.24) * 18) % w;
        ctx.fillRect(x, barY + Math.sin(t + i * 0.2) * 3, 12, 4);
      }
      if (state.phase === 'countdown' || state.wave > 1) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.16)';
        ctx.fillRect(0, barY + 7, Math.min(w, (w * Math.max(0.2, state.score % 5000)) / 5000), 2);
      }
      ctx.restore();
    },

    drawPopBars() {
      const state = this.instance.world.getResource('GameState');
      if (state.gameMode !== 'pop') return;

      const world = this.instance.world;
      const { dense, count } = this._lifespanQuery
        ? this._lifespanQuery.set
        : { dense: [], count: 0 };
      const pos = world.componentRegistry.get('Position').props;
      const life = world.componentRegistry.get('Lifespan').props;
      const ctx = this.instance.ctx;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const remaining = life.remaining[idx];
        const total = life.initial[idx];
        const ratio = Math.max(0, remaining / total);
        const y = pos.y[idx];
        const x = pos.x[idx];
        const r = 35;
        ctx.strokeStyle = ratio > 0.5 ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
      }
    },

    drawThreats(ctx) {
      const world = this.instance.world;
      const { dense, count } = this._enemyQuery ? this._enemyQuery.set : { dense: [], count: 0 };
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const enemy = world.componentRegistry.get('Enemy').props;
      const meta = world.componentRegistry.get('ThreatMeta')?.props;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const typeIndex = enemy.typeIndex[idx] || 0;
        const theme = THREAT_THEMES[typeIndex % THREAT_THEMES.length];
        const threatData = meta
          ? {
              level: theme.level,
              intensity: meta.intensity[idx] || 1,
              age: meta.age[idx] || 0,
            }
          : {};
        const threatType = this.enemyTypes[typeIndex] || {
          label: SCAM_LABELS[typeIndex % SCAM_LABELS.length],
        };
        this.drawThreat(
          ctx,
          pos.x[idx],
          pos.y[idx],
          rend.size[idx] || 36,
          typeIndex,
          threatType.label || SCAM_LABELS[typeIndex % SCAM_LABELS.length],
          threatData
        );
      }
    },

    drawThreat(ctx, x, y, size, type, label, threatData = {}) {
      const theme = THREAT_THEMES[type % THREAT_THEMES.length];
      const enemy = this.enemyTypes[type % this.enemyTypes.length];
      const threatPulse = 1 + Math.sin((performance.now() + x * 1.9) / 170) * 0.05;
      const riskPulse =
        Math.sin(performance.now() * CONFIG.entityPulseSpeed + x * 0.04) * 0.5 + 0.5;
      const pulse =
        threatPulse *
        (1 + (theme.pulse - 1) * Math.min(1, threatData.intensity || 1) + riskPulse * 0.04);
      const radius = Math.max(CONFIG.minThreatRadius, size);
      const glyph = enemy.icon;
      const threatLevel = threatData.level || theme.level;
      const tilt = Math.min(
        0.14,
        Math.abs(Math.sin(performance.now() * 0.0015 + y * 0.025)) * 0.14
      );
      const ring = radius * 0.2 * (threatData.intensity || 1) * (1 + (threatData.age || 0) * 0.01);
      const speedPulse = 1 + Math.min(0.85, (threatData.intensity || 0) * 0.12);

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse * speedPulse, pulse * speedPulse);
      ctx.rotate(Math.sin((performance.now() + x) * 0.0008) * tilt);

      const halo = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * 1.06);
      halo.addColorStop(0, `${theme.glow}00`);
      halo.addColorStop(1, `${theme.glow}66`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.06, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.beginPath();
      ctx.ellipse(0, radius * 0.16, radius * 0.6, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      const shell = ctx.createLinearGradient(
        -radius * 0.56,
        -radius * 0.56,
        radius * 0.56,
        radius * 0.56
      );
      shell.addColorStop(0, theme.primary);
      shell.addColorStop(1, theme.secondary);
      ctx.fillStyle = shell;
      this.drawThreatHull(ctx, theme.shape, radius);
      ctx.fill();

      ctx.strokeStyle = `rgba(251, 191, 36, ${0.2 + (threatData.intensity || 1) * 0.08})`;
      ctx.lineWidth = Math.max(1.4, radius * 0.025);
      this.drawThreatHull(ctx, theme.shape, radius * 0.98);
      ctx.stroke();

      ctx.strokeStyle = `rgba(248,250,252,${0.2 + (ring / radius) * 0.22})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const start = (i / 4) * Math.PI * 2;
        const end = start + Math.PI * 0.44;
        ctx.arc(0, 0, radius * 0.72, start + (i % 2) * 0.08, end);
      }
      ctx.stroke();

      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = Math.max(12, ring + 8);
      ctx.fillStyle = theme.accent;
      ctx.font = `900 ${Math.max(9, radius * 0.24)}px ${CONFIG.iconFont}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(glyph, 0, -radius * 0.03);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b1220';
      ctx.font = `700 ${Math.max(9, radius * 0.19)}px ${CONFIG.iconFont}`;
      ctx.fillText(label, 0, radius * 0.32);

      const barY = radius * 0.56;
      const barW = radius * 1.24;
      const severity =
        threatLevel === 'critical'
          ? 0.94
          : threatLevel === 'high'
            ? 0.72
            : threatLevel === 'elevated'
              ? 0.52
              : 0.32;
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.fillRect(-barW * 0.5, barY, barW, 4.5);
      ctx.fillStyle = theme.primary;
      ctx.fillRect(-barW * 0.5, barY, barW * severity, 4.5);

      const threatTagColor =
        threatLevel === 'critical' ? '#f87171' : threatLevel === 'high' ? '#fb7185' : '#93c5fd';
      ctx.fillStyle = threatTagColor;
      ctx.font = `700 ${Math.max(8, radius * 0.14)}px ${CONFIG.iconFont}`;
      ctx.fillText(`RISK ${Math.round((threatData.intensity || 1) * 100)}%`, 0, radius * 0.86);

      ctx.strokeStyle = 'rgba(255,255,255,0.34)';
      ctx.lineWidth = 2;
      ctx.stroke();

      for (let i = -1; i <= 1; i++) {
        const y = radius * (0.34 + i * 0.1);
        ctx.fillStyle =
          threatLevel === 'critical' && i === 0 ? 'rgba(239,68,68,0.34)' : 'rgba(255,255,255,0.26)';
        ctx.beginPath();
        ctx.moveTo(-radius * 0.34 + Math.abs(i) * 4, y);
        ctx.lineTo(radius * 0.34 - Math.abs(i) * 4, y);
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.restore();
    },

    drawThreatHull(ctx, shape, radius) {
      const main = radius * 0.58;
      const inset = radius * 0.14;
      if (shape === 'shield') {
        ctx.beginPath();
        ctx.moveTo(0, -main * 0.95);
        ctx.quadraticCurveTo(main, -main * 0.55, main * 0.95, -inset * 0.2);
        ctx.quadraticCurveTo(main * 1.1, main * 0.85, 0, main * 1.02);
        ctx.quadraticCurveTo(-main * 1.1, main * 0.85, -main * 0.95, -inset * 0.2);
        ctx.quadraticCurveTo(-main, -main * 0.55, 0, -main * 0.95);
        ctx.closePath();
        return;
      }

      if (shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(0, -main);
        ctx.lineTo(main * 0.72, -main * 0.22);
        ctx.lineTo(main * 0.22, main * 0.9);
        ctx.lineTo(-main * 0.22, main * 0.9);
        ctx.lineTo(-main * 0.72, -main * 0.22);
        ctx.closePath();
        return;
      }

      if (shape === 'plate') {
        ctx.beginPath();
        ctx.roundRect(-main * 0.54, -main * 0.48, main * 1.08, main * 0.9, inset);
        return;
      }

      // hex / default
      ctx.beginPath();
      for (let i = 0; i <= 6; i += 1) {
        const a = Math.PI * 2 * (i / 6) - Math.PI / 6;
        const px = Math.cos(a) * main * 1.1;
        const py = Math.sin(a) * main * 0.88;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    },

    stop() {
      if (this._cleanupInput) {
        this._cleanupInput();
        this._cleanupInput = null;
      }
      if (this._cleanupResize) {
        this._cleanupResize();
        this._cleanupResize = null;
      }
      if (this._resizeTimer) {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = null;
      }
      this._enemyQuery = null;
      this._lifespanQuery = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.ScamBlaster = ScamBlaster;
  window.ScamBlaster = ScamBlaster;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('scamblaster', ScamBlaster);
})();
