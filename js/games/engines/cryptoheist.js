/**
 * ASDF Games - Crypto Heist Engine (11/10 ECS Edition)
 *
 * Top-down stealth survival with dynamic lighting and visual juice.
 * Features: High-performance light masking, soft-shadows, and 144Hz fluidity.
 */

'use strict';

(function () {
  const CryptoHeist = {
    version: '2.2.0',
    gameId: 'cryptoheist',
    instance: null,
    _cleanupInput: null,

    lootRarities: [
      { icon: '🪙', value: 5, color: '#9ca3af' },
      { icon: '💎', value: 13, color: '#22c55e' },
      { icon: '💠', value: 34, color: '#3b82f6' },
      { icon: '🔮', value: 89, color: '#a855f7' },
      { icon: '👑', value: 233, color: '#fbbf24' },
    ],

    enemyTypes: [
      { icon: '👾', vision: 140, speed: 1.8 },
      { icon: '👹', vision: 180, speed: 1.5 },
      { icon: '🤖', vision: 200, speed: 1.2 },
      { icon: '🕵️', vision: 240, speed: 2.1 },
    ],

    icons: [],

    start(gameId) {
      this.stop();

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('ch-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1500,
        debug: true,
      });

      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { angle: 'f32', lightFlicker: 'f32' });
      world.registerComponent('Enemy', { hp: 'u8', alert: 'f32', vision: 'f32' });
      world.registerComponent('Bullet', { active: 'u8' });
      world.registerComponent('Loot', { value: 'u16' });

      world.setResource('GameState', {
        score: 0,
        wave: 1,
        kills: 0,
        gameOver: false,
        spawnTimer: 0,
        difficulty: 1,
        maxEnemies: 10,
        keys: {},
        mouseX: 0,
        mouseY: 0,
        lastShot: 0,
        playerId: -1,
        lightRange: 250,
        ambientAlpha: 0.95, // Very dark environment
      });

      this.dom = {
        score: document.getElementById('ch-score'),
        kills: document.getElementById('ch-kills'),
      };

      this.setupInput();
      this.preloadSprites();

      // Create Player
      const p = world.createEntity();
      world.addComponent(p, 'Position');
      world.addComponent(p, 'Velocity');
      world.addComponent(p, 'Renderable');
      world.addComponent(p, 'Collider');
      world.addComponent(p, 'Player');

      const pIdx = world.getIndex(p);
      world.componentRegistry.get('Position').props.x[pIdx] = canvas.width / 2;
      world.componentRegistry.get('Position').props.y[pIdx] = canvas.height / 2;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // 🧙
      world.componentRegistry.get('Renderable').props.size[pIdx] = 28;
      world.getResource('GameState').playerId = p;

      // Override Render for Dynamic Lighting
      this.icons = [
        '🧙',
        ...this.lootRarities.map(l => l.icon),
        ...this.enemyTypes.map(e => e.icon),
        '💥',
      ];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, this.icons);
      this.instance.onRender = alpha => this.draw(alpha, defaultRender);

      // Systems
      world.addSystem(this.createLogicSystem());
      world.addSystem(this.createCollisionSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="ch-container" style="width:100%; height:100%; position:relative; background:#000; overflow:hidden;">
          <canvas id="ch-canvas" style="width:100%; height:100%; display:block;"></canvas>
          <div id="ch-hud" style="position:absolute; top:15px; left:15px; color:#fff; font-family:Orbitron, sans-serif; pointer-events:none; background:rgba(0,0,0,0.6); padding:12px; border-radius:8px; border:1px solid #333;">
            <div style="font-size:10px; color:#666; margin-bottom:4px;">RECOVERED DATA</div>
            <div style="font-size:24px; color:#fbbf24; font-weight:bold;"><span id="ch-score">0</span> <span style="font-size:12px;">$ASDF</span></div>
            <div style="margin-top:8px; font-size:12px; color:#ef4444;">SYSTEM PURGE: <span id="ch-kills">0</span></div>
          </div>
          <div style="position:absolute; bottom:15px; left:50%; transform:translateX(-50%); color:rgba(255,255,255,0.4); font-family:monospace; font-size:10px;">
            WASD: PILOT | MOUSE: AIM | CLICK: FIRE
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🧙', size: 28 },
        ...this.lootRarities.map(r => ({ emoji: r.icon, size: 20 })),
        ...this.enemyTypes.map(e => ({ emoji: e.icon, size: 30 })),
        { emoji: '💥', size: 20 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const world = this.instance.world;

      const onKeyDown = e => {
        const state = world.getResource('GameState');
        if (state) state.keys[e.key.toLowerCase()] = true;
      };
      const onKeyUp = e => {
        const state = world.getResource('GameState');
        if (state) state.keys[e.key.toLowerCase()] = false;
      };

      const onMouseMove = e => {
        const rect = canvas.getBoundingClientRect();
        const state = world.getResource('GameState');
        if (state) {
          state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
          state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        }
      };

      const onPointerDown = () => {
        const state = world.getResource('GameState');
        if (!state || state.gameOver) return;
        const now = performance.now();
        if (now - state.lastShot > 150) {
          this.shoot(world);
          state.lastShot = now;
        }
      };

      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('pointerdown', onPointerDown);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('pointerdown', onPointerDown);
      };
    },

    shoot(world) {
      const state = world.getResource('GameState');
      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const playerAngle = world.componentRegistry.get('Player').props.angle[pIdx];

      const b = world.createEntity();
      world.addComponent(b, 'Position');
      world.addComponent(b, 'Velocity');
      world.addComponent(b, 'Bullet');
      world.addComponent(b, 'Renderable');

      const bIdx = world.getIndex(b);
      const bPos = world.componentRegistry.get('Position').props;
      const bVel = world.componentRegistry.get('Velocity').props;
      const bRend = world.componentRegistry.get('Renderable').props;

      bPos.x[bIdx] = pos.x[pIdx] + Math.cos(playerAngle) * 20;
      bPos.y[bIdx] = pos.y[pIdx] + Math.sin(playerAngle) * 20;
      bVel.vx[bIdx] = Math.cos(playerAngle) * 12;
      bVel.vy[bIdx] = Math.sin(playerAngle) * 12;
      bRend.iconIndex[bIdx] = this.icons.indexOf('💥') || 0;
      bRend.size[bIdx] = 8;

      if (typeof ASDF !== 'undefined' && ASDF.soundSystem) ASDF.soundSystem.play('click');
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (!state || state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;

        // Player Movement
        let dx = 0,
          dy = 0;
        if (state.keys['w'] || state.keys['arrowup']) dy -= 1;
        if (state.keys['s'] || state.keys['arrowdown']) dy += 1;
        if (state.keys['a'] || state.keys['arrowleft']) dx -= 1;
        if (state.keys['d'] || state.keys['arrowright']) dx += 1;

        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        vel.vx[pIdx] = (dx / len) * 4.5;
        vel.vy[pIdx] = (dy / len) * 4.5;

        // Mouse Aim
        const angle = Math.atan2(state.mouseY - pos.y[pIdx], state.mouseX - pos.x[pIdx]);
        pProps.angle[pIdx] = angle;

        // Light Flicker (Juice)
        pProps.lightFlicker[pIdx] =
          1.0 + Math.sin(performance.now() * 0.01) * 0.05 + Math.random() * 0.02;

        state.wave = 1 + Math.floor(state.kills / 10);
        state.difficulty = Math.min(3.2, 1 + state.wave * 0.09);
        state.maxEnemies = Math.min(30, 8 + state.wave * 2);

        // Spawning
        state.spawnTimer += dt;
        const enemies = world.createQuery(['Enemy', 'Position']);
        const spawnInterval = Math.max(20, 72 - state.wave * 4);
        if (enemies.set.count < state.maxEnemies && state.spawnTimer >= spawnInterval) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        // Bounds Cleanup
        const bullets = world.createQuery(['Bullet', 'Position']);
        const { dense, count } = bullets.set;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (
            pos.x[idx] < 0 ||
            pos.x[idx] > self.instance.canvas.width ||
            pos.y[idx] < 0 ||
            pos.y[idx] > self.instance.canvas.height
          ) {
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(state);
      };
    },

    createCollisionSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const px = pos.x[pIdx],
          py = pos.y[pIdx];

        // Enemies vs Player
        const enemies = world.createQuery(['Enemy', 'Position']);
        const { dense: eDense, count: eCount } = enemies.set;
        for (let i = eCount - 1; i >= 0; i--) {
          const idx = eDense[i];
          if (Math.hypot(px - pos.x[idx], py - pos.y[idx]) < 22) {
            state.gameOver = true;
            self.instance.shake(20, 30);
            if (typeof endGame === 'function') endGame(self.gameId, state.score);
          }
        }

        // Bullets vs Enemies
        const bullets = world.createQuery(['Bullet', 'Position']);
        const { dense: bDense, count: bCount } = bullets.set;
        for (let i = bCount - 1; i >= 0; i--) {
          const bIdx = bDense[i];
          for (let j = eCount - 1; j >= 0; j--) {
            const eIdx = eDense[j];
            if (Math.hypot(pos.x[bIdx] - pos.x[eIdx], pos.y[bIdx] - pos.y[eIdx]) < 25) {
              state.kills++;
              state.score += 15;
              self.spawnLoot(world, pos.x[eIdx], pos.y[eIdx]);

              if (ASDF.ParticleSystem) {
                ASDF.ParticleSystem.emit(world, pos.x[eIdx], pos.y[eIdx], {
                  count: 8,
                  colorIdx: 2,
                });
              }

              world.destroyEntity(world.getEntityId(eIdx));
              world.destroyEntity(world.getEntityId(bIdx));
              break;
            }
          }
        }

        // Loot Collection
        const loots = world.createQuery(['Loot', 'Position']);
        const { dense: lDense, count: lCount } = loots.set;
        const lootProps = world.componentRegistry.get('Loot').props;
        for (let i = lCount - 1; i >= 0; i--) {
          const idx = lDense[i];
          if (i > 26) {
            world.destroyEntity(world.getEntityId(idx));
            continue;
          }
          if (Math.hypot(px - pos.x[idx], py - pos.y[idx]) < 25) {
            state.score += lootProps.value[idx];
            if (typeof ASDF !== 'undefined' && ASDF.soundSystem) ASDF.soundSystem.play('collect');
            world.destroyEntity(world.getEntityId(idx));
          }
        }
      };
    },

    spawnEnemy(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Enemy');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const vel = world.componentRegistry.get('Velocity').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const en = world.componentRegistry.get('Enemy').props;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;

      const side = Math.floor(Math.random() * 4);
      if (side === 0) {
        pos.x[idx] = Math.random() * w;
        pos.y[idx] = -50;
      } else if (side === 1) {
        pos.x[idx] = Math.random() * w;
        pos.y[idx] = h + 50;
      } else if (side === 2) {
        pos.x[idx] = -50;
        pos.y[idx] = Math.random() * h;
      } else {
        pos.x[idx] = w + 50;
        pos.y[idx] = Math.random() * h;
      }

      const typeIdx = Math.floor(Math.random() * this.enemyTypes.length);
      const type = this.enemyTypes[typeIdx];
      const state = world.getResource('GameState');
      const angle = Math.atan2(h / 2 - pos.y[idx], w / 2 - pos.x[idx]);
      vel.vx[idx] = Math.cos(angle) * type.speed * state.difficulty;
      vel.vy[idx] = Math.sin(angle) * type.speed * state.difficulty;

      en.hp[idx] = 1;
      en.vision[idx] = type.vision;
      rend.iconIndex[idx] = 1 + this.lootRarities.length + typeIdx;
      rend.size[idx] = 30;
    },

    spawnLoot(world, x, y) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Loot');
      const idx = world.getIndex(e);
      const l = world.componentRegistry.get('Loot').props;
      const r = world.componentRegistry.get('Renderable').props;

      const rarityIdx = Math.floor(Math.random() * this.lootRarities.length);
      const rarity = this.lootRarities[rarityIdx];

      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      l.value[idx] = rarity.value;
      r.iconIndex[idx] = 1 + rarityIdx;
      r.size[idx] = 22;
    },

    updateUI(state) {
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.kills) this.dom.kills.textContent = state.kills;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const world = this.instance.world;
      const state = world.getResource('GameState');
      if (this.instance) {
        this.drawHeistScene(ctx, w, h, world, state, alpha);
        return;
      }

      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const pProps = world.componentRegistry.get('Player').props;
      const px = pos.x[pIdx],
        py = pos.y[pIdx];
      const pAngle = pProps.angle[pIdx];
      const flicker = pProps.lightFlicker[pIdx] || 1;

      // 1. Procedural Floor Grid (Base)
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      // Draw grid only partially (it will be masked by light anyway)
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 40) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // 2. Main Render (Clipped/Masked by Flashlight)
      ctx.save();

      // Create Flashlight Mask
      ctx.beginPath();
      ctx.moveTo(px, py);
      const beamHalfWidth = Math.PI / 6;
      ctx.arc(px, py, state.lightRange * flicker, pAngle - beamHalfWidth, pAngle + beamHalfWidth);
      ctx.closePath();

      // Also add a small circle around player for immediate visibility
      ctx.arc(px, py, 60 * flicker, 0, Math.PI * 2);

      ctx.clip();

      // Draw high-detail grid where light hits
      ctx.strokeStyle = '#2d2d5a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Render Entities in light
      defaultRender(world, alpha);

      ctx.restore();

      // 3. Post-Processing: Dark Ambient Overlay
      const ambient = ctx.createRadialGradient(px, py, 50, px, py, state.lightRange * 1.2);
      ambient.addColorStop(0, 'rgba(0,0,0,0)');
      ambient.addColorStop(1, `rgba(5,5,16,${state.ambientAlpha})`);
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, w, h);

      // 4. Flashlight Beam Polish (Glow)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beamGrad = ctx.createRadialGradient(px, py, 0, px, py, state.lightRange);
      beamGrad.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
      beamGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = beamGrad;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(px, py, state.lightRange, pAngle - beamHalfWidth, pAngle + beamHalfWidth);
      ctx.fill();
      ctx.restore();
    },

    drawHeistScene(ctx, w, h, world, state, alpha) {
      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const player = world.componentRegistry.get('Player').props;
      const px = pos.x[pIdx];
      const py = pos.y[pIdx];
      const angle = player.angle[pIdx];
      const flicker = player.lightFlicker[pIdx] || 1;

      this.drawVaultFloor(ctx, w, h, state);
      this.drawHeistEntities(ctx, world, state, alpha);
      this.drawLightMask(ctx, w, h, px, py, angle, state.lightRange * flicker, state.ambientAlpha);
      this.drawPlayerAgent(ctx, px, py, angle);
      this.drawSightline(ctx, px, py, angle, state.lightRange * 0.85);
    },

    drawVaultFloor(ctx, w, h, state) {
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#050914');
      bg.addColorStop(0.55, '#0b1022');
      bg.addColorStop(1, '#10081b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 1;
      const offset = (performance.now() / 80) % 48;
      ctx.beginPath();
      for (let x = -offset; x < w; x += 48) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = -offset; y < h; y += 48) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.12)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const y = ((state.score + i * 137) % (h + 160)) - 80;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * 0.25, y + 45, w * 0.72, y - 45, w, y + 20);
        ctx.stroke();
      }
    },

    drawHeistEntities(ctx, world, state) {
      const pos = world.componentRegistry.get('Position').props;
      const lootComp = world.componentRegistry.get('Loot');
      const enemyComp = world.componentRegistry.get('Enemy');
      const bulletComp = world.componentRegistry.get('Bullet');
      const lootBit = lootComp ? lootComp.bit : 0;
      const enemyBit = enemyComp ? enemyComp.bit : 0;
      const bulletBit = bulletComp ? bulletComp.bit : 0;
      const query = world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        if (world.getEntityId(idx) === state.playerId) continue;
        const mask = world.entityMasks[idx];
        if (lootBit && (mask & lootBit) === lootBit) {
          this.drawLoot(ctx, pos.x[idx], pos.y[idx], lootComp.props.value[idx]);
        } else if (enemyBit && (mask & enemyBit) === enemyBit) {
          this.drawSentry(ctx, pos.x[idx], pos.y[idx], enemyComp.props.vision[idx]);
        } else if (bulletBit && (mask & bulletBit) === bulletBit) {
          this.drawTracer(ctx, pos.x[idx], pos.y[idx]);
        }
      }
    },

    drawLoot(ctx, x, y, value) {
      const tier = value >= 200 ? 4 : value >= 80 ? 3 : value >= 30 ? 2 : value >= 10 ? 1 : 0;
      const palette = ['#9ca3af', '#22c55e', '#3b82f6', '#a855f7', '#fbbf24'];
      const color = palette[tier];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      const grad = ctx.createLinearGradient(-16, -16, 16, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.38, color);
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      this.roundRect(ctx, -15, -15, 30, 30, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    },

    drawSentry(ctx, x, y, vision) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(vision, 220), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0,0,0,0.36)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 23, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#7f1d1d';
      this.roundRect(ctx, -17, -17, 34, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-11, -4, 22, 8);
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(-9, -2, 6, 4);
      ctx.fillRect(3, -2, 6, 4);
      ctx.restore();
    },

    drawTracer(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawPlayerAgent(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 7, 18, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      const suit = ctx.createLinearGradient(-16, 0, 16, 0);
      suit.addColorStop(0, '#0f172a');
      suit.addColorStop(0.5, '#22d3ee');
      suit.addColorStop(1, '#312e81');
      ctx.fillStyle = suit;
      this.roundRect(ctx, -16, -13, 32, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(19, 0);
      ctx.lineTo(6, -6);
      ctx.lineTo(6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawSightline(ctx, x, y, angle, range) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const beamHalf = Math.PI / 8;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, range);
      grad.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
      grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range, angle - beamHalf, angle + beamHalf);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawLightMask(ctx, w, h, x, y, angle, range, ambientAlpha) {
      ctx.save();
      ctx.fillStyle = `rgba(2, 6, 23, ${ambientAlpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';

      const radial = ctx.createRadialGradient(x, y, 16, x, y, range);
      radial.addColorStop(0, 'rgba(0,0,0,0.9)');
      radial.addColorStop(0.62, 'rgba(0,0,0,0.35)');
      radial.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(x, y, range, 0, Math.PI * 2);
      ctx.fill();

      const beamHalf = Math.PI / 5.6;
      const beam = ctx.createRadialGradient(x, y, 0, x, y, range * 1.18);
      beam.addColorStop(0, 'rgba(0,0,0,0.9)');
      beam.addColorStop(0.78, 'rgba(0,0,0,0.4)');
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range * 1.18, angle - beamHalf, angle + beamHalf);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
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
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.CryptoHeist = CryptoHeist;
  window.CryptoHeist = CryptoHeist;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('cryptoheist', CryptoHeist);
})();
