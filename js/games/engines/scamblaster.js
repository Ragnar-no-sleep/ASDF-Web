/**
 * ASDF Games - Scam Blaster Engine (11/10 ECS Edition)
 *
 * Shooter game: Shoot down scam tokens and rug projects.
 * Features: High-performance ECS, Sprite Batching, Visual Interpolation.
 */

'use strict';

(function () {
  const ScamBlaster = {
    version: '2.3.0',
    gameId: 'scamblaster',
    instance: null,
    _cleanupInput: null,

    enemyTypes: [
      { icon: '🪙', points: 8, speed: 1.2, size: 34 },
      { icon: '🔴', points: 13, speed: 1.4, size: 40 },
      { icon: '💀', points: 21, speed: 1.6, size: 45 },
      { icon: '🦠', points: 34, speed: 1.8, size: 34 },
      { icon: '👤', points: 55, speed: 1.3, size: 55 },
    ],

    start(gameId) {
      this.stop();

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('sb-canvas');

      this.instance = new window.ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      this.instance.resize();

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      // Configure Input Hub for logical actions
      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('MOVE_LEFT', ['KeyA', 'ArrowLeft']);
        input.mapAction('MOVE_RIGHT', ['KeyD', 'ArrowRight']);
        input.mapAction('FIRE', ['Space', 'Enter']);
      }

      world.registerComponent('Enemy', { hp: 'u8', points: 'u8', typeIndex: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32', initial: 'f32' });

      world.setResource('GameState', {
        score: 0,
        lives: 3,
        wave: 1,
        phase: 'select',
        gameMode: null,
        spawnTimer: 0,
        countdown: 3,
        shots: 0,
        hits: 0,
        streak: 0,
        bestStreak: 0,
      });

      this.dom = {
        score: document.getElementById('sb-score'),
        lives: document.getElementById('sb-lives'),
        modeSelect: document.getElementById('sb-mode-select'),
        hud: document.getElementById('sb-hud'),
        countdown: document.getElementById('sb-countdown'),
        streak: document.getElementById('sb-streak'),
      };

      this.setupModeSelection();
      this.setupInput();

      const icons = [...this.enemyTypes.map(e => e.icon), '💥', '💔'];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);

      // Update Loop
      this.instance.onUpdate = dt => {
        const state = world.getResource('GameState');
        // Let HUDManager handle the DOM
        if (kernel.services.hud) {
          kernel.services.hud.update(this.gameId, state);
        }
      };

      this.instance.onRender = alpha => this.draw(alpha);

      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      this.instance.start();
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
            SCORE: <span id="sb-score" class="sb-score-label">0</span> | LIVES: <span id="sb-lives">❤️❤️❤️</span>
          </div>
          <div id="sb-streak" class="sb-streak">x0</div>
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
      canvas.addEventListener('pointerdown', onPointerDown);
      this._cleanupInput = () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.style.cursor = '';
      };
      const svgCursor = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="18" fill="none" stroke="%23ef4444" stroke-width="2"/><path d="M 0 25 L 17 25 M 33 25 L 50 25 M 25 0 L 25 17 M 25 33 L 25 50" stroke="%23ef4444" stroke-width="2"/><circle cx="25" cy="25" r="3" fill="%23ef4444"/></svg>`;
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

        state.spawnTimer += dt;
        const spawnInterval = Math.max(24, 60 - state.score / 90 - state.wave * 2);
        const activeEnemies = world.createQuery(['Position', 'Enemy']).set.count;
        if (
          activeEnemies < Math.min(34, 14 + state.wave * 3) &&
          state.spawnTimer >= spawnInterval
        ) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        const query = world.createQuery(['Position', 'Enemy']);
        const { dense, count } = query.set;
        const pos = world.componentRegistry.get('Position').props;
        const canvasH = self.instance.canvas.height;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (state.gameMode === 'fall' && pos.y[idx] > canvasH - 60) {
            self.loseLife(world, world.getEntityId(idx));
          }
        }

        const lsQuery = world.createQuery(['Lifespan']);
        const { dense: lsDense, count: lsCount } = lsQuery.set;
        const lifeProps = world.componentRegistry.get('Lifespan').props;
        const enemyComp = world.componentRegistry.get('Enemy');
        const enemyBit = enemyComp ? enemyComp.bit : 0;
        for (let i = lsCount - 1; i >= 0; i--) {
          const idx = lsDense[i];
          lifeProps.remaining[idx] -= dt;
          if (lifeProps.remaining[idx] <= 0) {
            const isEnemy = enemyBit && (world.entityMasks[idx] & enemyBit) === enemyBit;
            if (isEnemy && state.gameMode === 'pop') self.loseLife(world, world.getEntityId(idx));
            else world.destroyEntity(world.getEntityId(idx));
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

      const typeIdx = Math.floor(Math.random() * this.enemyTypes.length);
      const type = this.enemyTypes[typeIdx];
      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const en = world.componentRegistry.get('Enemy').props;

      if (state.gameMode === 'fall') {
        pos.x[idx] = 50 + Math.random() * (this.instance.canvas.width - 100);
        pos.y[idx] = -40;
        vel.vy[idx] = type.speed;
      } else {
        pos.x[idx] = 100 + Math.random() * (this.instance.canvas.width - 200);
        pos.y[idx] = 100 + Math.random() * (this.instance.canvas.height - 200);
        world.addComponent(e, 'Lifespan');
        const life = world.componentRegistry.get('Lifespan').props;
        life.initial[idx] = 90;
        life.remaining[idx] = 90;
      }

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

      state.shots++;
      for (let i = count - 1; i >= 0; i--) {
        const idx = dense[i];
        if (Math.hypot(pos.x[idx] - x, pos.y[idx] - y) < rend.size[idx]) {
          state.hits++;
          state.streak++;
          state.bestStreak = Math.max(state.bestStreak, state.streak);
          const multiplier = 1 + Math.floor(state.streak / 5) * 0.25;
          state.score += Math.round(en.points[idx] * multiplier);
          state.wave = 1 + Math.floor(state.score / 500);

          if (typeof ASDF !== 'undefined' && ASDF.ParticleSystem) {
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

      if (typeof ASDF !== 'undefined' && ASDF.ParticleSystem) {
        ASDF.ParticleSystem.emit(world, pos.x[idx], pos.y[idx], {
          count: 20,
          colorIdx: 2,
          speed: 5,
        });
      }

      // 11/10 Physical Feedback
      this.instance.shake(10, 15);

      state.lives--;
      state.streak = 0;
      world.destroyEntity(id);
      if (state.lives <= 0) endGame(this.gameId, state.score);
    },

    updateUI(state) {
      this.dom.score.textContent = state.score;
      if (this.dom.streak) this.dom.streak.textContent = `x${state.streak}`;
      this.dom.lives.innerHTML = '❤️'.repeat(Math.max(0, state.lives));
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      this.drawThreats(ctx);

      if (state.gameMode === 'pop') {
        const query = this.instance.world.createQuery(['Position', 'Lifespan', 'Enemy']);
        const { dense, count } = query.set;
        const pos = this.instance.world.componentRegistry.get('Position').props;
        const life = this.instance.world.componentRegistry.get('Lifespan').props;
        for (let i = 0; i < count; i++) {
          const idx = dense[i];
          const p = life.remaining[idx] / life.initial[idx];
          ctx.strokeStyle = p > 0.5 ? '#22c55e' : '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(pos.x[idx], pos.y[idx], 35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
          ctx.stroke();
        }
      }
    },

    drawThreats(ctx) {
      const world = this.instance.world;
      const query = world.createQuery(['Position', 'Enemy']);
      const { dense, count } = query.set;
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const enemy = world.componentRegistry.get('Enemy').props;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        this.drawThreat(
          ctx,
          pos.x[idx],
          pos.y[idx],
          rend.size[idx] || 36,
          enemy.typeIndex[idx] || 0
        );
      }
    },

    drawThreat(ctx, x, y, size, type) {
      const palettes = [
        ['#ef4444', '#7f1d1d', 'SCAM'],
        ['#f97316', '#7c2d12', 'RUG'],
        ['#a855f7', '#581c87', 'BOT'],
        ['#22c55e', '#14532d', 'FAKE'],
        ['#94a3b8', '#334155', 'WHALE'],
      ];
      const [hot, dark, label] = palettes[type % palettes.length];
      const pulse = 1 + Math.sin((performance.now() + x * 3) / 180) * 0.04;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = hot;
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, size * 0.18, size * 0.58, size * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      const grad = ctx.createLinearGradient(-size * 0.5, -size * 0.5, size * 0.5, size * 0.5);
      grad.addColorStop(0, hot);
      grad.addColorStop(1, dark);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.58);
      ctx.lineTo(size * 0.5, -size * 0.18);
      ctx.lineTo(size * 0.38, size * 0.44);
      ctx.lineTo(0, size * 0.58);
      ctx.lineTo(-size * 0.38, size * 0.44);
      ctx.lineTo(-size * 0.5, -size * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.34)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = `900 ${Math.max(8, size * 0.22)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 1);
      ctx.restore();
    },

    stop() {
      if (this._cleanupInput) {
        this._cleanupInput();
        this._cleanupInput = null;
      }
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.ScamBlaster = ScamBlaster;
  window.ScamBlaster = ScamBlaster;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('scamblaster', ScamBlaster);
})();
