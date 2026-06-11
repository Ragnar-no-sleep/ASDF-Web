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
    _enemyQuery: null,
    _bulletQuery: null,
    _lootQuery: null,
    _renderQuery: null,

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
        debug: false,
      });

      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);
      }

      // Components
      world.registerComponent('Player', { angle: 'f32', lightFlicker: 'f32' });
      world.registerComponent('Enemy', { hp: 'u8', alert: 'f32', vision: 'f32' });
      world.registerComponent('Bullet', { active: 'u8' });
      world.registerComponent('Loot', { value: 'u16' });

      // Register Personality Components
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      this._enemyQuery = world.createQuery(['Enemy', 'Position']);
      this._bulletQuery = world.createQuery(['Bullet', 'Position']);
      this._lootQuery = world.createQuery(['Loot', 'Position']);

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
        ambientAlpha: 0.68,
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
      world.addComponent(p, 'Rotation');
      world.addComponent(p, 'Scale');

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

      this.instance.onUpdate = (dt, dtMs) => {
        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }
        return shouldFreeze;
      };

      this.instance.onRender = alpha => {
        if (this.juice) this.juice.renderPre();
        this.draw(alpha, defaultRender);
        if (this.juice) this.juice.renderPost();
      };

      // Systems
      world.addSystem(ASDF.PersonalitySystem.create());
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
        <div class="ch-container">
          <canvas id="ch-canvas" class="ch-canvas"></canvas>
          <div id="ch-hud" class="ch-hud">
            <div class="ch-stat">
              <div class="ch-stat-label">ASDF SCORE</div>
              <div class="ch-stat-value"><span id="ch-score">0</span><span class="ch-stat-unit">$ASDF</span></div>
            </div>
            <div class="ch-stat-killline">
              CLEARED: <span id="ch-kills">0</span>
            </div>
          </div>
          <div class="ch-hint-bar">
            WASD / CLICK
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
        const enemies =
          self._enemyQuery || (self._enemyQuery = world.createQuery(['Enemy', 'Position']));
        const spawnInterval = Math.max(20, 72 - state.wave * 4);
        if (enemies.set.count < state.maxEnemies && state.spawnTimer >= spawnInterval) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        // Bounds Cleanup
        const bullets =
          self._bulletQuery || (self._bulletQuery = world.createQuery(['Bullet', 'Position']));
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
        const enemies =
          self._enemyQuery || (self._enemyQuery = world.createQuery(['Enemy', 'Position']));
        const { dense: eDense, count: eCount } = enemies.set;
        for (let i = eCount - 1; i >= 0; i--) {
          const idx = eDense[i];
          if (Math.hypot(px - pos.x[idx], py - pos.y[idx]) < 22) {
            state.gameOver = true;
            if (self.juice) {
              self.juice.impact(pos.x[idx], pos.y[idx], { intensity: 'death' });
            } else {
              self.instance.shake(20, 30);
            }
            if (typeof endGame === 'function') endGame(self.gameId, state.score);
          }
        }

        // Bullets vs Enemies
        const bullets =
          self._bulletQuery || (self._bulletQuery = world.createQuery(['Bullet', 'Position']));
        const { dense: bDense, count: bCount } = bullets.set;
        for (let i = bCount - 1; i >= 0; i--) {
          const bIdx = bDense[i];
          for (let j = eCount - 1; j >= 0; j--) {
            const eIdx = eDense[j];
            if (Math.hypot(pos.x[bIdx] - pos.x[eIdx], pos.y[bIdx] - pos.y[eIdx]) < 25) {
              state.kills++;
              state.score += 15;
              self.spawnLoot(world, pos.x[eIdx], pos.y[eIdx]);

              if (self.juice) {
                self.juice.impact(pos.x[eIdx], pos.y[eIdx], { intensity: 'medium' });
              } else if (ASDF.ParticleSystem) {
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
        const loots =
          self._lootQuery || (self._lootQuery = world.createQuery(['Loot', 'Position']));
        const { dense: lDense, count: lCount } = loots.set;
        const lootProps = world.componentRegistry.get('Loot').props;
        for (let i = lCount - 1; i >= 0; i--) {
          const idx = lDense[i];
          if (i > 26) {
            world.destroyEntity(world.getEntityId(idx));
            continue;
          }
          if (Math.hypot(px - pos.x[idx], py - pos.y[idx]) < 25) {
            const gained = lootProps.value[idx];
            state.score += gained;

            if (self.juice) {
              self.juice.impact(pos.x[idx], pos.y[idx], { intensity: 'light' });
              self.juice.textPop(pos.x[idx], pos.y[idx], `+${gained}`, {
                color: '#fbbf24',
                size: 18,
              });
            }

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
      world.addComponent(e, 'Rotation');
      world.addComponent(e, 'Scale');

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
      // Pitch black obscure floor for stealth vibe
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, w, h);

      // Subtle tactical grid
      ctx.strokeStyle = '#0a0a14';
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

      ctx.fillStyle = 'rgba(255,204,0,0.02)';
      ctx.fillRect(0, h * 0.88, w, 2);
    },

    drawHeistEntities(ctx, world, state) {
      const pos = world.componentRegistry.get('Position').props;
      const lootComp = world.componentRegistry.get('Loot');
      const enemyComp = world.componentRegistry.get('Enemy');
      const bulletComp = world.componentRegistry.get('Bullet');
      const lootBit = lootComp ? lootComp.bit : 0;
      const enemyBit = enemyComp ? enemyComp.bit : 0;
      const bulletBit = bulletComp ? bulletComp.bit : 0;
      const query =
        this._renderQuery ||
        (this._renderQuery = this.instance.world.createQuery(['Position', 'Renderable']));
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
      const palette = ['#ffcc00', '#ff6b35', '#ff2d95', '#f97316', '#fff7ed'];
      const color = palette[tier];
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = color;
      if (tier <= 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff2b3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tier <= 3) {
        ctx.rotate(Math.PI / 4);
        this.roundRect(ctx, -10, -10, 20, 20, 4);
        ctx.fill();
        ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-12, 7);
        ctx.lineTo(-7, -9);
        ctx.lineTo(0, 2);
        ctx.lineTo(7, -9);
        ctx.lineTo(12, 7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    drawSentry(ctx, x, y, vision) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 13, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b120b';
      this.roundRect(ctx, -10, -4, 20, 8, 5);
      ctx.fill();
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(-5, 0, 2.2, 0, Math.PI * 2);
      ctx.arc(5, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,247,237,0.42)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 18, -0.4, 0.4);
      ctx.stroke();
      ctx.restore();
    },

    drawTracer(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawPlayerAgent(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 10, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (Thief cloak - dark grey/black)
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(-2, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      // Head (Hooded)
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(2, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      // Skin / Face
      ctx.fillStyle = '#fca5a5'; // skin tone
      ctx.beginPath();
      ctx.arc(4, 0, 6, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.fill();

      // Bandana / Mask covering mouth
      ctx.fillStyle = '#030712';
      ctx.fillRect(4, -5, 5, 10);

      // Gun (Pistol/Silencer)
      ctx.fillStyle = '#4b5563';
      this.roundRect(ctx, 8, 4, 16, 4, 2);
      ctx.fill();

      // Silencer
      ctx.fillStyle = '#1f2937';
      this.roundRect(ctx, 22, 4.5, 10, 3, 1);
      ctx.fill();

      // Hands holding gun
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(9, 6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    drawSightline(ctx, x, y, angle, range) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(251,191,36,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * range, y + Math.sin(angle) * range);
      ctx.stroke();
      ctx.restore();
    },

    drawLightMask(ctx, w, h, x, y, angle, range, ambientAlpha) {
      ctx.save();
      // More atmospheric darkness (84% opacity)
      ctx.fillStyle = `rgba(3, 3, 12, 0.84)`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';

      // Focused aura around player
      const radial = ctx.createRadialGradient(x, y, 20, x, y, range * 0.85);
      radial.addColorStop(0, 'rgba(0,0,0,1)');
      radial.addColorStop(0.6, 'rgba(0,0,0,0.6)');
      radial.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.arc(x, y, range * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Tactical flashlight beam (100 degree cone, shorter range than before)
      const beamHalf = Math.PI / 3.6;
      const cx = x + Math.cos(angle) * 30;
      const cy = y + Math.sin(angle) * 30;

      const beam = ctx.createRadialGradient(cx, cy, 0, cx, cy, range * 2.0);
      beam.addColorStop(0, 'rgba(0,0,0,1)');
      beam.addColorStop(0.8, 'rgba(0,0,0,0.85)');
      beam.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, range * 2.0, angle - beamHalf, angle + beamHalf);
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
      this._enemyQuery = null;
      this._bulletQuery = null;
      this._lootQuery = null;
      this._renderQuery = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.CryptoHeist = CryptoHeist;
  window.CryptoHeist = CryptoHeist;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('cryptoheist', CryptoHeist);
})();
