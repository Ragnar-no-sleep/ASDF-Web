/**
 * ASDF Games - Stake Stack Engine
 *
 * Precision stacker inspired by classic Stack, tuned for scalable and
 * professional ASDF visual language.
 */

'use strict';

(function () {
  const CONFIG = {
    baseWidthRatio: 0.54,
    baseWidthClampMin: 118,
    baseWidthClampMax: 340,
    blockHeight: 26,
    blockMinWidth: 16,
    blockJitter: 6,

    speedBase: 6.8,
    speedStep: 0.9,
    speedCurve: 0.26,
    maxSpeed: 34,

    sweepBandMultiplier: 1.08,
    sweepMin: 52,
    sweepRandomOffset: 4,
    sweepEdgeInset: 16,

    overlapRatio: 0.05,
    overlapMin: 13,
    perfectToleranceBase: 0.065,
    baseScore: 24,
    widthScoreScale: 2.0,
    perfectBonusBase: 45,
    streakBonusBase: 10,

    anchorRows: 7,
    cameraClamp: 0.54,
    messageTtlMax: 16,
    dropWindowBaseMs: 540,
    dropWindowDecay: 22,
    dropWindowMinMs: 300,
    colors: ['#0ea5e9', '#22c55e', '#facc15', '#f97316', '#a78bfa'],
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatMessage(overlap, width, perfect, level, streak) {
    if (perfect && streak >= 3) return 'CHAIN';
    if (perfect) return 'PERFECT';
    if (overlap > width * 0.8) return 'LOCKED';
    if (overlap > width * 0.45) return 'GOOD';
    return level > 4 ? 'CLOSE' : 'LOCKED';
  }

  const StakeStacker = {
    version: '4.1.0',
    gameId: 'stakestacker',
    instance: null,
    dom: null,
    profile: null,
    state: null,
    _cleanupInput: null,
    _cleanupResize: null,

    start(gameId) {
      this.stop();
      this.gameId = gameId;

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('ss-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 32,
        debug: false,
      });
      this.instance.resize();

      this.profile = this.getProfile(this.instance.canvas.width);
      this.state = this.createState();
      this.dom = {
        score: document.getElementById('ss-score'),
        level: document.getElementById('ss-level'),
        streak: document.getElementById('ss-streak'),
        message: document.getElementById('ss-message'),
      };

      this.spawnBlock();
      this.setupInput();
      this._cleanupResize = () => {
        if (!this.instance) return;
        this.instance.resize();
        this.profile = this.getProfile(this.instance.canvas.width);
      };
      window.addEventListener('resize', this._cleanupResize);

      this.instance.onUpdate = dt => this.update(dt);
      this.instance.onRender = () => this.draw();
      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = {
          cleanup: () => {
            this.stop();
          },
        };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="ss-container ss-arcade">
          <canvas id="ss-canvas" class="game-canvas"></canvas>
          <div class="ss-hud-row">
            <div class="ss-hud-badge">SCORE <span id="ss-score" class="ss-score-text">0</span></div>
            <div class="ss-hud-badge">LEVEL <span id="ss-level" class="ss-level-text">1</span></div>
            <div class="ss-streak-badge ss-streak-badge--visible">STREAK <span id="ss-streak" class="ss-streak-text">0</span></div>
          </div>
          <div id="ss-message" class="ss-feedback ss-feedback--visible">DROP</div>
          <div class="ss-hint">SPACE or tap to place the block</div>
        </div>
      `;
    },

    createState() {
      const canvas = this.instance.canvas;
      const profile = this.profile;
      return {
        score: 0,
        level: 1,
        streak: 0,
        bestStreak: 0,
        gameOver: false,
        flash: 0,
        shake: 0,
        cameraY: 0,
        targetCameraY: 0,
        message: 'DROP',
        moveClock: 0,
        messageTtl: CONFIG.messageTtlMax,
        sweepDirection: 1,
        stack: [
          {
            x: (canvas.width - profile.baseBlockWidth) / 2,
            y: canvas.height - (CONFIG.blockHeight + 18),
            width: profile.baseBlockWidth,
            height: CONFIG.blockHeight,
            color: '#94a3b8',
          },
        ],
        current: null,
      };
    },

    getProfile(canvasWidth) {
      return {
        totalWidth: canvasWidth,
        baseBlockWidth: clamp(
          Math.round(canvasWidth * CONFIG.baseWidthRatio),
          CONFIG.baseWidthClampMin,
          CONFIG.baseWidthClampMax
        ),
        edgeInset: Math.max(CONFIG.sweepEdgeInset, Math.round(canvasWidth * 0.03)),
      };
    },

    getLevelSpeed(level) {
      const speed =
        CONFIG.speedBase +
        Math.max(0, level - 1) * CONFIG.speedStep +
        Math.sqrt(level) * CONFIG.speedCurve;
      return Math.min(CONFIG.maxSpeed, speed);
    },

    getPerfectTolerance(previousWidth, level) {
      const base = previousWidth * CONFIG.perfectToleranceBase;
      return Math.max(4, base - Math.min(3, Math.floor(level * 0.45)));
    },

    getMinOverlap(previousWidth) {
      return Math.max(
        CONFIG.overlapMin,
        Math.round(previousWidth * CONFIG.overlapRatio),
        CONFIG.blockMinWidth
      );
    },

    getSweepBand(canvas, previous, level) {
      const profile = this.profile || this.getProfile(canvas.width);
      const speedBoost = 1 + level * 0.08;
      const compactLane = Math.max(0.78, 1 - level * 0.028);
      const baseSpan = clamp(
        Math.round(previous.width * CONFIG.sweepBandMultiplier * compactLane + level * 1.2),
        CONFIG.sweepMin,
        Math.min(previous.width * 1.18, canvas.width - profile.edgeInset * 2)
      );

      const drift =
        Math.sin(performance.now() * 0.0018 + level) * (CONFIG.sweepRandomOffset / speedBoost);
      const leftBase = previous.x + previous.width / 2 - baseSpan / 2 + drift;
      const rightBase = leftBase + baseSpan;

      const sweepLeft = clamp(
        Math.round(Math.min(leftBase, rightBase)),
        profile.edgeInset,
        canvas.width - previous.width - profile.edgeInset
      );
      const sweepRight = clamp(
        Math.round(Math.max(leftBase, rightBase)),
        sweepLeft + CONFIG.sweepMin,
        canvas.width - profile.edgeInset
      );

      return {
        width: Math.max(CONFIG.sweepMin, sweepRight - sweepLeft),
        sweepLeft,
        sweepRight: Math.max(sweepRight, sweepLeft + previous.width),
      };
    },

    setupInput() {
      const onDrop = event => {
        if (event && event.cancelable) event.preventDefault();
        this.dropBlock();
      };
      const onKeyDown = event => {
        if (event.code === 'Space' || event.code === 'Enter') {
          onDrop(event);
        }
      };

      document.addEventListener('keydown', onKeyDown);
      this.instance.canvas.addEventListener('pointerdown', onDrop);

      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        this.instance.canvas.removeEventListener('pointerdown', onDrop);
      };
    },

    spawnBlock() {
      const canvas = this.instance.canvas;
      const state = this.state;
      const previous = state.stack[state.stack.length - 1];
      const direction = state.sweepDirection;
      const { width, sweepLeft, sweepRight } = this.getSweepBand(canvas, previous, state.level);
      const speed = this.getLevelSpeed(state.level);
      const startX = direction > 0 ? sweepLeft : sweepRight - previous.width;

      state.sweepDirection = -state.sweepDirection;
      state.current = {
        x: startX,
        y: previous.y - CONFIG.blockHeight,
        width: previous.width,
        height: CONFIG.blockHeight,
        vx: direction * speed,
        sweepLeft,
        sweepRight,
        color: CONFIG.colors[state.level % CONFIG.colors.length],
      };
      state.moveClock = 0;
    },

    update(dt) {
      const state = this.state;
      if (state.gameOver) return;

      const dropWindow = Math.max(
        CONFIG.dropWindowMinMs,
        CONFIG.dropWindowBaseMs - state.level * CONFIG.dropWindowDecay
      );
      state.moveClock += dt;

      if (state.current && state.moveClock >= dropWindow) {
        this.dropBlock();
        return;
      }

      if (state.current) {
        state.current.x += state.current.vx * dt;
        if (
          state.current.vx > 0 &&
          state.current.x >= state.current.sweepRight - state.current.width
        ) {
          state.current.x = state.current.sweepRight - state.current.width;
          state.current.vx *= -1;
        } else if (state.current.vx < 0 && state.current.x <= state.current.sweepLeft) {
          state.current.x = state.current.sweepLeft;
          state.current.vx *= -1;
        }
      }

      state.cameraY += (state.targetCameraY - state.cameraY) * Math.min(1, dt * 0.08);
      state.flash = Math.max(0, state.flash - dt);
      state.shake = Math.max(0, state.shake - dt * 0.95);
      state.messageTtl = Math.max(0, state.messageTtl - dt * 0.06);
      this.updateUI();
    },

    dropBlock() {
      const state = this.state;
      const current = state.current;
      if (!current || state.gameOver) return;

      const previous = state.stack[state.stack.length - 1];
      const overlapStart = Math.max(current.x, previous.x);
      const overlapEnd = Math.min(current.x + current.width, previous.x + previous.width);
      const overlap = overlapEnd - overlapStart;
      const minimum = this.getMinOverlap(previous.width);

      if (overlap < minimum) {
        this.endRun();
        return;
      }

      const perfect =
        Math.abs(current.x - previous.x) <= this.getPerfectTolerance(previous.width, state.level);
      const lockedWidth = perfect ? previous.width : overlap;
      const locked = {
        x: perfect ? previous.x : overlapStart,
        y: current.y,
        width: lockedWidth,
        height: CONFIG.blockHeight,
        color: current.color,
      };

      state.stack.push(locked);
      state.current = null;

      const widthFactor = clamp(lockedWidth / previous.width, 0.4, 1);
      const streakMul = state.streak > 0 ? Math.min(10, state.streak) : 1;
      const levelMul = 1 + Math.min(2.2, state.level * 0.06);
      const gained = Math.round(
        CONFIG.baseScore * widthFactor * levelMul +
          (perfect ? CONFIG.perfectBonusBase : 0) +
          streakMul * CONFIG.streakBonusBase
      );
      state.score += gained;

      state.streak = perfect ? state.streak + 1 : 0;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.level += 1;

      state.message = formatMessage(
        lockedWidth,
        previous.width,
        perfect,
        state.level,
        state.streak
      );
      state.messageTtl = CONFIG.messageTtlMax;
      state.flash = perfect ? 0 : 12;
      state.targetCameraY = Math.max(
        0,
        state.stack.length * CONFIG.blockHeight -
          this.instance.canvas.height * CONFIG.cameraClamp -
          Math.max(0, CONFIG.anchorRows - 2) * CONFIG.blockHeight
      );

      this.spawnBlock();
    },

    endRun() {
      const state = this.state;
      state.gameOver = true;
      state.current = null;
      state.message = 'GAME OVER';
      state.messageTtl = CONFIG.messageTtlMax * 2;
      state.flash = 16;
      state.shake = 18;
      this.updateUI();
      if (typeof endGame === 'function') endGame(this.gameId, state.score);
    },

    updateUI() {
      if (!this.dom) return;

      const state = this.state;
      this.dom.score.textContent = state.score;
      this.dom.level.textContent = state.level;
      this.dom.streak.textContent = state.streak;
      this.dom.message.textContent = state.message;
      this.dom.message.style.opacity =
        state.messageTtl > 0 || state.gameOver ? '1' : state.score > 0 ? '0.35' : '0.28';
      if (state.message === 'GAME OVER' && state.gameOver) {
        this.dom.message.classList.add('ss-feedback--visible');
      }
    },

    draw() {
      const ctx = this.instance.ctx;
      const canvas = this.instance.canvas;
      const state = this.state;
      const w = canvas.width;
      const h = canvas.height;
      const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
      const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;

      ctx.save();
      ctx.clearRect(0, 0, w, h);
      this.drawBackdrop(ctx, w, h);
      this.drawTunnel(ctx, w, h, state);

      ctx.translate(shakeX, shakeY + state.cameraY);
      this.drawStack(ctx, state);
      this.drawCurrent(ctx, state.current);
      this.drawGuides(ctx, w, h);
      ctx.restore();

      if (state.flash > 0) {
        const alpha = Math.min(0.26, state.flash / 18);
        ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
        ctx.fillRect(0, 0, w, h);
      }
    },

    drawBackdrop(ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#050816');
      bg.addColorStop(0.55, '#101827');
      bg.addColorStop(1, '#07130f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    },

    drawTunnel(ctx, w, h, state) {
      const centerX = w * 0.5;
      const profile = this.profile || this.getProfile(w);
      const profileLines = Math.max(20, Math.round(h / 26));

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 1;
      for (let i = 0; i < profileLines; i++) {
        const t = i / (profileLines - 1);
        const y = h - t * (h * 0.82);
        const radius = Math.max(20, profile.totalWidth * (0.058 + t * 0.55));
        const wobble =
          Math.sin(performance.now() * 0.0012 + t * 10 + state.level * 0.2) * (6 + t * 3);

        ctx.beginPath();
        ctx.moveTo(centerX + wobble, y - 80);
        ctx.quadraticCurveTo(centerX + radius * 1.05, y - 44, centerX + wobble, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX - wobble, y - 80);
        ctx.quadraticCurveTo(centerX - radius * 1.05, y - 44, centerX - wobble, y);
        ctx.stroke();
      }

      const baselineY = Math.min(state.stack[state.stack.length - 1].y + 6, h - 24);
      const glow = clamp((h - baselineY) / Math.max(1, h - 24), 0, 1);
      ctx.fillStyle = `rgba(168, 85, 247, ${0.09 + glow * 0.08})`;
      ctx.fillRect(0, baselineY, w, h - baselineY);
    },

    drawStack(ctx, state) {
      for (const block of state.stack) {
        this.drawBlock(ctx, block);
      }
    },

    drawCurrent(ctx, current) {
      if (!current) return;
      this.drawBlock(ctx, current, true);
    },

    drawBlock(ctx, block, active = false) {
      const width = block.width;
      const height = block.height;
      const radius = 6;

      ctx.save();
      if (active) {
        const glow = 0.18 + Math.sin(performance.now() * 0.01) * 0.04;
        ctx.shadowColor = `rgba(56, 189, 248, ${glow})`;
        ctx.shadowBlur = 16;
      }

      ctx.fillStyle = block.color || '#64748b';
      this.roundRect(ctx, block.x, block.y, width, height, radius);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = active ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.24)';
      ctx.fillRect(block.x + 7, block.y + 5, Math.max(0, width - 14), 3);

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(block.x + 2, block.y + 2, width - 4, height - 4);
      ctx.restore();
    },

    drawGuides(ctx, w, h) {
      const baselineY = Math.max(20, h - 28);
      const profile = this.profile || this.getProfile(w);

      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.fillRect(w / 2 - 38, baselineY, 76, 3);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.58)';
      ctx.font = '11px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ALIGN', w / 2, baselineY - 8);

      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let y = 30; y < h; y += 44) {
        ctx.fillRect(profile.edgeInset * 0.7, y, w - profile.edgeInset * 1.4, 1);
      }
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
        window.removeEventListener('resize', this._cleanupResize);
        this._cleanupResize = null;
      }
      if (this.instance) this.instance.stop();
      this.instance = null;
      this.dom = null;
      this.state = null;
      this.profile = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.StakeStacker = StakeStacker;
  window.StakeStacker = StakeStacker;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('stakestacker', StakeStacker);
})();
