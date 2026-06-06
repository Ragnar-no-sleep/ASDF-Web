/**
 * ASDF Games - Stake Stacker Engine
 *
 * Precision stacker: align moving staking blocks, lock overlap, and build a
 * stable validator tower before the platform becomes too small.
 */

'use strict';

(function () {
  const CONFIG = {
    baseWidth: 190,
    blockHeight: 28,
    baseSpeed: 3.2,
    speedStep: 0.22,
    minWidth: 18,
    perfectMargin: 8,
    colors: ['#38bdf8', '#22c55e', '#fbbf24', '#f472b6', '#a78bfa'],
  };

  const StakeStacker = {
    version: '3.0.0',
    gameId: 'stakestacker',
    instance: null,
    _cleanupInput: null,
    dom: null,

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

      const w = canvas.width;
      const h = canvas.height;
      this.state = {
        score: 0,
        level: 1,
        streak: 0,
        bestStreak: 0,
        gameOver: false,
        shake: 0,
        cameraY: 0,
        targetCameraY: 0,
        message: 'DROP',
        flash: 0,
        stack: [
          {
            x: w / 2 - CONFIG.baseWidth / 2,
            y: h - 54,
            width: CONFIG.baseWidth,
            height: CONFIG.blockHeight,
            color: '#64748b',
          },
        ],
        current: null,
      };

      this.dom = {
        score: document.getElementById('ss-score'),
        level: document.getElementById('ss-level'),
        streak: document.getElementById('ss-streak'),
        message: document.getElementById('ss-message'),
      };

      this.spawnBlock();
      this.setupInput();

      this.instance.onUpdate = dt => this.update(dt);
      this.instance.onRender = () => this.draw();
      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
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
          <div class="ss-hint">Space / tap to lock the staking block</div>
        </div>
      `;
    },

    setupInput() {
      const drop = e => {
        if (e && e.cancelable) e.preventDefault();
        this.dropBlock();
      };
      const onKeyDown = e => {
        if (e.code === 'Space' || e.code === 'Enter') drop(e);
      };

      document.addEventListener('keydown', onKeyDown);
      this.instance.canvas.addEventListener('pointerdown', drop);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        this.instance.canvas.removeEventListener('pointerdown', drop);
      };
    },

    spawnBlock() {
      const canvas = this.instance.canvas;
      const state = this.state;
      const previous = state.stack[state.stack.length - 1];
      const direction = state.level % 2 === 0 ? -1 : 1;
      const startX = Math.min(canvas.width - previous.width, Math.max(0, previous.x));

      state.current = {
        x: startX,
        y: previous.y - CONFIG.blockHeight,
        width: previous.width,
        height: CONFIG.blockHeight,
        vx: direction * (CONFIG.baseSpeed + state.level * CONFIG.speedStep),
        color: CONFIG.colors[state.level % CONFIG.colors.length],
      };
    },

    update(dt) {
      const state = this.state;
      if (state.gameOver) return;

      const block = state.current;
      if (block) {
        block.x += block.vx * dt;
        if (block.vx > 0 && block.x > this.instance.canvas.width) {
          block.x = -block.width;
        } else if (block.vx < 0 && block.x + block.width < 0) {
          block.x = this.instance.canvas.width;
        }
      }

      state.cameraY += (state.targetCameraY - state.cameraY) * Math.min(1, dt * 0.08);
      state.shake = Math.max(0, state.shake - dt);
      state.flash = Math.max(0, state.flash - dt);
      this.updateUI();
    },

    dropBlock() {
      const state = this.state;
      const current = state.current;
      if (state.gameOver || !current) return;

      const previous = state.stack[state.stack.length - 1];
      const overlapStart = Math.max(current.x, previous.x);
      const overlapEnd = Math.min(current.x + current.width, previous.x + previous.width);
      const overlap = overlapEnd - overlapStart;

      if (overlap < CONFIG.minWidth) {
        this.endRun();
        return;
      }

      const miss = Math.abs(current.x - previous.x);
      const perfect = miss <= CONFIG.perfectMargin;
      const locked = {
        x: perfect ? previous.x : overlapStart,
        y: current.y,
        width: perfect ? previous.width : overlap,
        height: CONFIG.blockHeight,
        color: current.color,
      };

      state.stack.push(locked);
      state.current = null;
      state.streak = perfect ? state.streak + 1 : 0;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      state.score += Math.round(locked.width + 20 + state.streak * 12);
      state.level += 1;
      state.message = perfect ? 'PERFECT' : 'LOCKED';
      state.flash = 18;
      state.shake = perfect ? 0 : 5;
      state.targetCameraY = Math.max(
        0,
        state.stack.length * CONFIG.blockHeight - this.instance.canvas.height * 0.5
      );

      this.spawnBlock();
    },

    endRun() {
      const state = this.state;
      state.gameOver = true;
      state.message = 'TOWER LOST';
      state.shake = 18;
      this.updateUI();
      if (typeof endGame === 'function') endGame(this.gameId, state.score);
    },

    updateUI() {
      if (!this.dom) return;
      this.dom.score.textContent = this.state.score;
      this.dom.level.textContent = this.state.level;
      this.dom.streak.textContent = this.state.streak;
      this.dom.message.textContent = this.state.message;
      this.dom.message.style.opacity = this.state.flash > 0 || this.state.gameOver ? '1' : '0.35';
    },

    draw() {
      const ctx = this.instance.ctx;
      const canvas = this.instance.canvas;
      const w = canvas.width;
      const h = canvas.height;
      const state = this.state;
      const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;

      ctx.save();
      ctx.clearRect(0, 0, w, h);
      this.drawBackdrop(ctx, w, h);
      ctx.translate(shakeX, state.cameraY);

      for (const block of state.stack) {
        this.drawBlock(ctx, block);
      }
      if (state.current) this.drawBlock(ctx, state.current, true);

      ctx.restore();
      this.drawGuides(ctx, w, h);
    },

    drawBackdrop(ctx, w, h) {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#050816');
      bg.addColorStop(0.55, '#101827');
      bg.addColorStop(1, '#07130f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - 80, h);
        ctx.stroke();
      }
      for (let y = 36; y < h; y += 42) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    },

    drawBlock(ctx, block, active = false) {
      const radius = 7;
      ctx.save();
      ctx.shadowColor = active ? block.color : 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = active ? 18 : 8;
      ctx.fillStyle = block.color;
      this.roundRect(ctx, block.x, block.y, block.width, block.height, radius);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(block.x + 8, block.y + 6, Math.max(0, block.width - 16), 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.24)';
      ctx.stroke();
      ctx.restore();
    },

    drawGuides(ctx, w, h) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.fillRect(w / 2 - 34, h - 22, 68, 3);
      ctx.fillStyle = 'rgba(226, 232, 240, 0.58)';
      ctx.font = '11px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VALIDATOR TOWER', w / 2, h - 30);
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
      this.dom = null;
      this.state = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.StakeStacker = StakeStacker;
  window.StakeStacker = StakeStacker;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('stakestacker', StakeStacker);
})();
