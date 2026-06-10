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
      primary: '#f43f5e',
      secondary: '#3b120b',
      glow: '#fff2b3',
      accent: '#ffcc00',
      level: 'critical',
      shape: 'hex',
      pulse: 1.2,
    },
    {
      primary: '#ff6b35',
      secondary: '#3b120b',
      glow: '#fff2b3',
      accent: '#ffcc00',
      level: 'elevated',
      shape: 'shield',
      pulse: 1.1,
    },
    {
      primary: '#ff2d95',
      secondary: '#2a0718',
      glow: '#fff2b3',
      accent: '#ff6b35',
      level: 'high',
      shape: 'diamond',
      pulse: 1.08,
    },
    {
      primary: '#f97316',
      secondary: '#311006',
      glow: '#fff2b3',
      accent: '#ffcc00',
      level: 'low',
      shape: 'plate',
      pulse: 1.05,
    },
    {
      primary: '#fff2b3',
      secondary: '#3b120b',
      glow: '#ffcc00',
      accent: '#ff6b35',
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  const ScamBlaster = {
    version: '2.7.0',
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

      console.log(
        '%c [ScamBlaster] SVG CURSOR ENGINE LOADED ',
        'background: #f43f5e; color: #fff; font-weight: bold;'
      );

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('sb-canvas');

      this.instance = new window.ASDF.GameInstance(canvas, {
        maxEntities: 900,
        debug: false,
      });
      this.instance.resize();

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);
      }

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
        const state = world.getResource('GameState');

        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }

        if (kernel.services?.hud) {
          kernel.services.hud.update(this.gameId, state);
        }

        return shouldFreeze;
      };

      this.instance.onRender = () => {
        if (this.juice) this.juice.renderPre();
        this.draw();
        if (this.juice) this.juice.renderPost();
      };

      world.addSystem(ASDF.PersonalitySystem.create());
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
          <div id="sb-hud" class="sb-hud game-hidden" aria-hidden="true">
            <span>SCORE <strong id="sb-score">0</strong></span>
            <span>LIVES <strong id="sb-lives">x3</strong></span>
            <span>WAVE <strong id="sb-wave">1</strong></span>
            <span>COMBO <strong id="sb-streak">x0</strong></span>
            <span id="sb-threat-count">THREATS 0</span>
          </div>
          <div id="sb-countdown" class="sb-countdown">3</div>
        </div>
      `;
    },

    setupModeSelection() {
      const fall = document.getElementById('sb-select-fall');
      const pop = document.getElementById('sb-select-pop');
      if (!fall || !pop) return;
      fall.addEventListener('click', () => this.selectMode('fall'), { once: true });
      pop.addEventListener('click', () => this.selectMode('pop'), { once: true });
    },

    selectMode(mode) {
      const state = this.instance.world.getResource('GameState');
      state.gameMode = mode;
      state.phase = 'countdown';
      this.dom.modeSelect.classList.add('sb-mode-select--hidden');
      this.dom.hud.classList.remove('game-hidden');
      this.dom.hud.setAttribute('aria-hidden', 'false');
      this.dom.countdown.classList.add('sb-countdown--visible');
    },

    setupInput() {
      const canvas = this.instance.canvas;

      // OPEN SOURCE STANDARD: Zero-latency native CSS SVG cursor (Red circle with dot)
      const cursorSvg =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%23ff0000' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%23ff0000'/%3E%3C/svg%3E";
      canvas.style.cursor = `url("${cursorSvg}") 16 16, crosshair`;

      const updateAim = e => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const state = this.instance?.world?.getResource('GameState');
        if (state) {
          state.aimX = x;
          state.aimY = y;
          state.aimActive = true;
        }
        return { x, y };
      };

      const onPointerDown = e => {
        const { x, y } = updateAim(e);
        this.shoot(x, y);
      };
      const onPointerMove = e => updateAim(e);
      const onPointerLeave = () => {
        const state = this.instance?.world?.getResource('GameState');
        if (state) state.aimActive = false;
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
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerleave', onPointerLeave);
      document.addEventListener('keydown', onKeyDown);
      this._cleanupInput = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerleave', onPointerLeave);
        document.removeEventListener('keydown', onKeyDown);
        canvas.style.cursor = 'crosshair'; // restore on exit
      };
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
            self.dom.countdown.classList.remove('sb-countdown--visible');
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

          if (this.juice) {
            // Addictive Impact
            const impactIntensity = state.streak >= 10 ? 'heavy' : 'medium';
            this.juice.impact(pos.x[idx], pos.y[idx], { intensity: impactIntensity });
            this.juice.textPop(pos.x[idx], pos.y[idx], `+${points}`, {
              color: '#fbbf24',
              size: 24 + Math.min(10, state.streak),
              lifetime: 25,
            });

            if (state.streak % 5 === 0) {
              this.juice.textPop(
                this.instance.canvas.width / 2,
                this.instance.canvas.height / 2,
                `${state.streak} STREAK!`,
                { color: '#ffcc00', size: 40, lifetime: 35 }
              );
            }
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

      if (this.juice) {
        this.juice.impact(pos.x[idx], pos.y[idx], { intensity: 'light' }); // Reduced intensity, no shake
      }

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
      // Reticle is now handled natively via CSS cursor for zero-latency
      this.drawPopBars();
    },

    drawAtmosphere(ctx, w, h, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      const groundY = h * 0.84;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          allowNoise: false,
          seed: state.wave + Math.floor(state.elapsed || 0),
        });
      } else {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#0a0a0f');
        sky.addColorStop(0.48, '#2a1005');
        sky.addColorStop(1, '#070504');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        const sunX = w / 2;
        const sunY = h * 0.38;
        const sunR = Math.max(70, Math.min(150, w * 0.16));
        ctx.save();
        const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
        sunGrad.addColorStop(0, '#fbbf24');
        sunGrad.addColorStop(0.38, '#fb923c');
        sunGrad.addColorStop(0.68, '#ea580c');
        sunGrad.addColorStop(1, '#7c2d12');
        ctx.fillStyle = sunGrad;
        ctx.globalAlpha = 0.42;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.26;
        ctx.fillStyle = '#160a05';
        for (let y = sunY - sunR * 0.42; y < sunY + sunR * 0.8; y += 18) {
          const span = Math.sqrt(Math.max(0, sunR * sunR - (y - sunY) * (y - sunY)));
          ctx.fillRect(sunX - span, y, span * 2, 7);
        }
        ctx.restore();

        ctx.fillStyle = '#160b06';
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(w * 0.16, h * 0.66);
        ctx.lineTo(w * 0.34, groundY);
        ctx.lineTo(w * 0.54, h * 0.7);
        ctx.lineTo(w * 0.72, groundY);
        ctx.lineTo(w * 0.88, h * 0.68);
        ctx.lineTo(w, groundY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#070504';
        ctx.fillRect(0, groundY, w, h - groundY);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(0, groundY, w, 4);
      }

      if (state.gameMode === 'fall') {
        const laneGap = w / CONFIG.laneCount;
        ctx.save();
        ctx.strokeStyle = 'rgba(251,146,60,0.11)';
        ctx.lineWidth = 2;
        for (let lane = 1; lane < CONFIG.laneCount; lane += 1) {
          const x = lane * laneGap;
          ctx.beginPath();
          ctx.moveTo(x, h * 0.26);
          ctx.lineTo(x, groundY);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(251,191,36,0.88)';
      ctx.font = `800 ${Math.max(12, Math.min(18, w * 0.022))}px ${CONFIG.iconFont}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('ASDF', 18, groundY + 26);
    },

    drawReticle(ctx, w, h, state) {
      if (!state || state.phase !== 'playing') return;
      const x = clamp(state.aimX || w / 2, 18, w - 18);
      const y = clamp(state.aimY || h * 0.52, 18, h - 18);
      const r = 16 + Math.sin(performance.now() * 0.008) * 1.5;

      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = state.aimActive ? 'rgba(255,247,237,0.92)' : 'rgba(255,247,237,0.54)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(251,146,60,0.45)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(251,191,36,0.92)';
      ctx.beginPath();
      ctx.moveTo(-r - 9, 0);
      ctx.lineTo(-r * 0.35, 0);
      ctx.moveTo(r * 0.35, 0);
      ctx.lineTo(r + 9, 0);
      ctx.moveTo(0, -r - 9);
      ctx.lineTo(0, -r * 0.35);
      ctx.moveTo(0, r * 0.35);
      ctx.lineTo(0, r + 9);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,247,237,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawThreatBars(ctx, w, h, state) {
      ctx.save();
      const barY = h * 0.84;
      if (state.phase === 'countdown' || state.wave > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(16, barY + 14, Math.min(w - 32, (w - 32) * ((state.wave % 8) / 8)), 5);
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
        ctx.strokeStyle = ratio > 0.5 ? '#ffcc00' : '#f43f5e';
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

      const rotComp = world.componentRegistry.get('Rotation');
      const scaleComp = world.componentRegistry.get('Scale');

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const typeIndex = enemy.typeIndex[idx] || 0;
        const theme = THREAT_THEMES[typeIndex % THREAT_THEMES.length];

        const angle = rotComp ? rotComp.props.angle[idx] : 0;
        const sx = scaleComp ? scaleComp.props.x[idx] : 1;
        const sy = scaleComp ? scaleComp.props.y[idx] : 1;

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

        ctx.save();
        ctx.translate(pos.x[idx], pos.y[idx]);
        ctx.rotate(angle);
        ctx.scale(sx, sy);
        this.drawThreat(
          ctx,
          0,
          0,
          rend.size[idx] || 36,
          typeIndex,
          threatType.label || SCAM_LABELS[typeIndex % SCAM_LABELS.length],
          threatData
        );
        ctx.restore();
      }
    },

    drawThreat(ctx, x, y, size, type, label, threatData = {}) {
      const theme = THREAT_THEMES[type % THREAT_THEMES.length];
      const enemy = this.enemyTypes[type % this.enemyTypes.length];
      const radius = Math.max(CONFIG.minThreatRadius, size);
      const intensity = clamp(threatData.intensity || 1, 1, 4);
      const pulse = 1 + Math.sin((performance.now() + x * 1.4) / 280) * 0.018 + intensity * 0.003;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, radius * 0.42, radius * 0.58, radius * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      this.drawSimpleScamSprite(ctx, radius, enemy.sprite, theme, enemy.icon);

      ctx.restore();
    },

    drawSimpleScamSprite(ctx, radius, sprite, theme, _icon) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const palette = {
        badge: ['#ffcc00', '#ff6b35', '#3b120b'],
        tile: ['#ff6b35', '#ff2d95', '#2a0718'],
        gem: ['#f97316', '#fbbf24', '#311006'],
        chip: ['#f43f5e', '#fb7185', '#3a0714'],
        trap: ['#a855f7', '#ff2d95', '#1f0b38'],
      };
      const colors = palette[sprite] || [theme.primary, theme.accent, theme.secondary];

      ctx.fillStyle = colors[0];
      ctx.strokeStyle = '#fff2b3';
      ctx.lineWidth = Math.max(2, radius * 0.05);
      ctx.beginPath();
      if (sprite === 'tile') {
        this.roundRect(ctx, -radius * 0.5, -radius * 0.38, radius, radius * 0.76, 7);
      } else if (sprite === 'gem') {
        ctx.moveTo(0, -radius * 0.6);
        ctx.lineTo(radius * 0.58, 0);
        ctx.lineTo(0, radius * 0.58);
        ctx.lineTo(-radius * 0.58, 0);
        ctx.closePath();
      } else if (sprite === 'chip') {
        this.roundRect(ctx, -radius * 0.46, -radius * 0.46, radius * 0.92, radius * 0.92, 5);
      } else if (sprite === 'trap') {
        for (let i = 0; i < 10; i += 1) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 10;
          const r = i % 2 === 0 ? radius * 0.58 : radius * 0.31;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(0, 0, radius * 0.58, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = colors[1];
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.arc(-radius * 0.14, -radius * 0.16, radius * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = colors[2];
      ctx.lineWidth = Math.max(2, radius * 0.06);
      ctx.beginPath();
      ctx.moveTo(-radius * 0.36, radius * 0.34);
      ctx.lineTo(radius * 0.36, -radius * 0.34);
      ctx.stroke();

      ctx.strokeStyle = '#fff7ed';
      ctx.fillStyle = '#fff7ed';
      ctx.lineWidth = Math.max(2, radius * 0.055);
      if (sprite === 'badge') {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
      } else if (sprite === 'tile') {
        this.roundRect(ctx, -radius * 0.2, -radius * 0.21, radius * 0.4, radius * 0.18, 3);
        ctx.fill();
        this.roundRect(ctx, -radius * 0.3, radius * 0.06, radius * 0.6, radius * 0.14, 3);
        ctx.fill();
      } else if (sprite === 'gem') {
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.29);
        ctx.lineTo(radius * 0.26, 0);
        ctx.lineTo(0, radius * 0.26);
        ctx.lineTo(-radius * 0.26, 0);
        ctx.closePath();
        ctx.stroke();
      } else if (sprite === 'chip') {
        this.roundRect(ctx, -radius * 0.2, -radius * 0.2, radius * 0.4, radius * 0.4, 3);
        ctx.stroke();
        for (let i = -1; i <= 1; i += 2) {
          ctx.beginPath();
          ctx.moveTo(i * radius * 0.34, -radius * 0.18);
          ctx.lineTo(i * radius * 0.48, -radius * 0.18);
          ctx.moveTo(i * radius * 0.34, radius * 0.18);
          ctx.lineTo(i * radius * 0.48, radius * 0.18);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(-radius * 0.2, -radius * 0.18);
        ctx.lineTo(radius * 0.2, radius * 0.18);
        ctx.moveTo(radius * 0.2, -radius * 0.18);
        ctx.lineTo(-radius * 0.2, radius * 0.18);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
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
        this.roundRect(ctx, -main * 0.54, -main * 0.48, main * 1.08, main * 0.9, inset);
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
