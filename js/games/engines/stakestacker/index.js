/**
 * ASDF Games - Stake Stack Engine
 *
 * Precision stacker inspired by classic Stack, tuned for scalable and
 * professional ASDF visual language.
 */

'use strict';

(function () {
  const CONFIG = {
    baseBlockWidth: 140, // Fixed width for perfect square
    blockDepth: 140, // Fixed depth for perfect square
    blockHeight: 36, // Taller height for a chunky slab
    blockMinWidth: 1, // Only lose if you miss completely
    blockJitter: 6,

    speedBase: 10.5,
    speedStep: 1.1,
    speedCurve: 0.2,
    maxSpeed: 45,

    sweepBandMultiplier: 1.02,
    sweepMin: 64,
    sweepRandomOffset: 4,
    sweepEdgeInset: 18,

    overlapRatio: 0.0, // No minimum ratio
    overlapMin: 1, // At least 1 pixel must touch
    perfectToleranceBase: 0.08,
    baseScore: 24,
    widthScoreScale: 2.0,
    perfectBonusBase: 45,
    streakBonusBase: 10,

    anchorRows: 7,
    cameraClamp: 0.58,
    messageTtlMax: 16,
    dropWindowBaseMs: 182,
    dropWindowDecay: 28,
    dropWindowMinMs: 72,
    previewPulseMs: 720,
    colors: ['#ffcc00', '#ff8a1f', '#ff6b35', '#ff2d95', '#fff2b3'],
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

      console.log(
        '%c [StakeStacker] V2 ISOMETRIC ENGINE LOADED ',
        'background: #ffcc00; color: #000; font-weight: bold;'
      );

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('ss-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 32,
        debug: false,
      });
      this.instance.resize();

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);
      }

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

      this.instance.onUpdate = (dt, dtMs) => {
        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }
        this.update(dt);
        return shouldFreeze;
      };

      this.instance.onRender = () => {
        if (this.juice) this.juice.renderPre();
        this.draw();
        if (this.juice) this.juice.renderPost();
      };

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
            color: '#ffcc00',
          },
        ],
        current: null,
        debris: [],
      };
    },

    getProfile(canvasWidth) {
      return {
        totalWidth: canvasWidth,
        baseBlockWidth: CONFIG.baseBlockWidth,
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
      const compactLane = Math.max(0.58, 1 - level * 0.028);
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
      const speed = this.getLevelSpeed(state.level);

      // Alternate axis every level
      const axis = state.level % 2 === 0 ? 'z' : 'x';

      // Sweep bounds
      const sweepRange = 240;
      const axisPos = axis === 'x' ? previous.x : previous.z || 0;
      const sweepLeft = axisPos - sweepRange;
      const sweepRight = axisPos + sweepRange;

      const currentDim = axis === 'x' ? previous.width : previous.depth || 140;
      const startPos = direction > 0 ? sweepLeft : sweepRight - currentDim;

      state.sweepDirection = -state.sweepDirection;
      state.current = {
        x: axis === 'x' ? startPos : previous.x,
        z: axis === 'z' ? startPos : previous.z || 0,
        y: previous.y - CONFIG.blockHeight,
        width: previous.width,
        depth: previous.depth || 140,
        height: CONFIG.blockHeight,
        vx: axis === 'x' ? direction * speed : 0,
        vz: axis === 'z' ? direction * speed : 0,
        axis: axis,
        sweepLeft,
        sweepRight,
        color: CONFIG.colors[state.level % CONFIG.colors.length],
      };
      state.moveClock = 0;
      console.log(`[StakeStacker] Level ${state.level} - Moving on axis: ${axis.toUpperCase()}`);
    },

    update(dt) {
      const state = this.state;
      if (state.gameOver) return;

      state.moveClock += dt;

      if (state.current) {
        state.current.x += state.current.vx * dt;
        state.current.z += state.current.vz * dt;

        // Ping pong on X axis
        if (state.current.axis === 'x') {
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

        // Ping pong on Z axis
        if (state.current.axis === 'z') {
          if (
            state.current.vz > 0 &&
            state.current.z >= state.current.sweepRight - state.current.depth
          ) {
            state.current.z = state.current.sweepRight - state.current.depth;
            state.current.vz *= -1;
          } else if (state.current.vz < 0 && state.current.z <= state.current.sweepLeft) {
            state.current.z = state.current.sweepLeft;
            state.current.vz *= -1;
          }
        }
      }

      state.cameraY += (state.targetCameraY - state.cameraY) * Math.min(1, dt * 0.08);
      state.flash = Math.max(0, state.flash - dt);
      state.shake = Math.max(0, state.shake - dt * 0.95);
      state.messageTtl = Math.max(0, state.messageTtl - dt * 0.06);

      // Update debris
      if (state.debris) {
        for (let i = state.debris.length - 1; i >= 0; i--) {
          const d = state.debris[i];
          d.x += (d.vx || 0) * dt;
          d.z += (d.vz || 0) * dt;
          d.y += d.vy * dt;
          d.vy += 1.8 * dt; // Stronger gravity for fast fall
          if (d.y - state.cameraY > this.instance.canvas.height + 100) {
            state.debris.splice(i, 1);
          }
        }
      }

      this.drawPrecisionIndicator();
      this.updateUI();
    },

    dropBlock() {
      const state = this.state;
      const current = state.current;
      if (!current || state.gameOver) return;

      const previous = state.stack[state.stack.length - 1];
      const isX = current.axis === 'x';

      const currentPos = isX ? current.x : current.z;
      const previousPos = isX ? previous.x : previous.z || 0;
      const currentDim = isX ? current.width : current.depth;

      const overlapStart = Math.max(currentPos, previousPos);
      const overlapEnd = Math.min(currentPos + currentDim, previousPos + currentDim);
      const overlap = overlapEnd - overlapStart;
      const minimum = CONFIG.overlapMin;

      if (overlap < minimum) {
        this.endRun();
        return;
      }

      const perfect =
        Math.abs(currentPos - previousPos) <= this.getPerfectTolerance(currentDim, state.level);
      const lockedDim = perfect ? currentDim : overlap;
      const lockedPos = perfect ? previousPos : overlapStart;

      const locked = {
        x: isX ? lockedPos : current.x,
        z: isX ? current.z : lockedPos,
        y: current.y,
        width: isX ? lockedDim : current.width,
        depth: isX ? current.depth : lockedDim,
        height: CONFIG.blockHeight,
        color: current.color,
      };

      if (!perfect) {
        // Create debris for the chopped part
        const cutLeft = currentPos < previousPos;
        const debrisDim = currentDim - lockedDim;
        const debrisPos = cutLeft ? currentPos : overlapEnd;

        if (debrisDim > 0 && state.debris) {
          state.debris.push({
            x: isX ? debrisPos : current.x,
            z: isX ? current.z : debrisPos,
            y: current.y,
            width: isX ? debrisDim : current.width,
            depth: isX ? current.depth : debrisDim,
            height: CONFIG.blockHeight,
            color: current.color,
            vy: 2, // Initial fall speed
            vx: isX ? (cutLeft ? -4 : 4) : 0, // Horizontal knockback outward
            vz: !isX ? (cutLeft ? -4 : 4) : 0,
          });
        }
      }

      state.stack.push(locked);
      state.current = null;

      const widthFactor = clamp(lockedDim / currentDim, 0.4, 1);
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

      state.message = formatMessage(lockedDim, currentDim, perfect, state.level, state.streak);

      if (this.juice) {
        if (perfect) {
          this.juice.impact(locked.x + locked.width / 2, locked.y, { intensity: 'medium' });
          this.juice.textPop(locked.x + locked.width / 2, locked.y, state.message, {
            color: '#ffcc00',
            size: 32,
          });
        } else {
          this.juice.impact(locked.x + locked.width / 2, locked.y, { intensity: 'light' });
        }
      }

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

      if (this.juice) {
        this.juice.impact(this.instance.canvas.width / 2, this.instance.canvas.height / 2, {
          intensity: 'death',
        });
      }

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
      const active = state.messageTtl > 0 || state.gameOver || state.score === 0;
      this.dom.message.classList.toggle('ss-feedback--visible', active);
      this.dom.message.classList.toggle('ss-feedback--dim', !active);
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

      if (state.debris) {
        for (const d of state.debris) {
          this.drawBlock(ctx, d);
        }
      }

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
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          allowNoise: false,
          seed: (this.state ? this.state.score : 0) + (this.state ? this.state.level : 0),
        });
      } else {
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#050816');
        bg.addColorStop(0.55, '#101827');
        bg.addColorStop(1, '#07130f');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
      }
    },

    drawTunnel(ctx, w, h, state) {
      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawStackGrid(
          ctx,
          w,
          h,
          h * 0.09,
          (performance.now() + state.stack.length * 22 + state.moveClock * 1.7) * 0.001
        );
        return;
      }
      const baselineY = Math.min(state.stack[state.stack.length - 1].y + 6, h - 24);
      const glow = clamp((h - baselineY) / Math.max(1, h - 24), 0, 1);
      ctx.fillStyle = `rgba(255, 204, 0, ${0.06 + glow * 0.08})`;
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
      this.drawTarget(ctx, current);
    },

    drawTarget(ctx, current) {
      const state = this.state;
      if (!state) return;
      const previous = state.stack[state.stack.length - 1];
      if (!previous) return;
      const pulse = (1 + Math.sin(performance.now() / CONFIG.previewPulseMs)) * 0.5;
      const glow = 0.18 + pulse * 0.1;
      ctx.save();
      ctx.globalAlpha = clamp(glow, 0.17, 0.45);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.86)';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([7, 8]);
      ctx.strokeRect(previous.x, previous.y, previous.width, previous.height);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.fillRect(previous.x + previous.width * 0.5 - 4, previous.y - 14, 8, 10);
      ctx.restore();
    },

    drawBlock(ctx, block, active = false) {
      const w = block.width;
      const h = block.height;
      const z = 140; // True square depth (matches baseBlockWidth)

      // True Isometric/Cabinet Projection offsets (45-degree pseudo-3D)
      const dx = z * 0.45;
      const dy = z * 0.45;

      const x = block.x;
      const y = block.y;

      ctx.save();
      if (active) {
        const glow = 0.18 + Math.sin(performance.now() * 0.01) * 0.04;
        ctx.shadowColor = `rgba(255, 204, 0, ${glow})`;
        ctx.shadowBlur = 12;
      }

      const baseColor = block.color || '#64748b';

      // Top face (Lightest)
      // We manually brighten the top face for a beautiful light source effect
      ctx.fillStyle = this.brightenHex(baseColor, 1.25);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w + dx, y - dy);
      ctx.lineTo(x + dx, y - dy);
      ctx.closePath();
      ctx.fill();

      // Front face (Base color)
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();

      // Right side face (Darkest/Shadowed)
      ctx.fillStyle = this.brightenHex(baseColor, 0.65);
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w + dx, y - dy);
      ctx.lineTo(x + w + dx, y + h - dy);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();

      // Crisp White Edges (Ketchapp Stack aesthetic)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      // Top outline
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w + dx, y - dy);
      ctx.lineTo(x + dx, y - dy);
      ctx.closePath();
      ctx.stroke();

      // Front right corner edge
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();

      // Top right corner edge
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w + dx, y - dy);
      ctx.stroke();

      ctx.restore();
    },

    brightenHex(hex, factor) {
      if (!hex.startsWith('#')) return hex;
      let r = parseInt(hex.slice(1, 3), 16);
      let g = parseInt(hex.slice(3, 5), 16);
      let b = parseInt(hex.slice(5, 7), 16);
      r = Math.min(255, Math.floor(r * factor));
      g = Math.min(255, Math.floor(g * factor));
      b = Math.min(255, Math.floor(b * factor));
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },

    drawGuides(ctx, w, h) {
      const baselineY = Math.max(20, h - 28);
      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.fillRect(w / 2 - 38, baselineY, 76, 3);
    },

    drawPrecisionIndicator() {
      if (!this.state || !this.state.current || !this.dom || !this.dom.message) return;
      const state = this.state;
      const current = state.current;
      const previous = state.stack[state.stack.length - 1];
      const overlapStart = Math.max(current.x, previous.x);
      const overlapEnd = Math.min(current.x + current.width, previous.x + previous.width);
      const overlap = overlapEnd - overlapStart;
      const min = this.getMinOverlap(previous.width);
      const perfect = this.getPerfectTolerance(previous.width, state.level);
      const tolerance = Math.abs(current.x - previous.x) <= perfect;
      const gap = state.score > 0 && overlap >= 0 ? Math.max(0, min - overlap) : 0;
      if (!tolerance && overlap < min + 12) {
        state.message = gap > 0 ? 'MISALIGN' : 'DROP';
        state.messageTtl = Math.min(CONFIG.messageTtlMax, state.messageTtl + 2);
        this.dom.message.textContent = gap > 0 ? `CORRECT +${Math.max(1, min - gap)}` : 'DROP';
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
