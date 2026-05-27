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

    start(gameId) {
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
      const icons = [
        '🧙',
        ...this.lootRarities.map(l => l.icon),
        ...this.enemyTypes.map(e => e.icon),
        '💥',
      ];
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
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

      document.addEventListener('keydown', e => {
        const state = world.getResource('GameState');
        if (state) state.keys[e.key.toLowerCase()] = true;
      });
      document.addEventListener('keyup', e => {
        const state = world.getResource('GameState');
        if (state) state.keys[e.key.toLowerCase()] = false;
      });

      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const state = world.getResource('GameState');
        if (state) {
          state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
          state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
        }
      });

      canvas.addEventListener('pointerdown', () => {
        const state = world.getResource('GameState');
        if (!state || state.gameOver) return;
        const now = performance.now();
        if (now - state.lastShot > 150) {
          this.shoot(world);
          state.lastShot = now;
        }
      });
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
      bRend.iconIndex[bIdx] = icons.indexOf('💥') || 0; // mapped below
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

        // Spawning
        if (Math.random() < 0.025) self.spawnEnemy(world);

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
        for (let i = count - 1; i >= 0; i--) {
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
      const angle = Math.atan2(h / 2 - pos.y[idx], w / 2 - pos.x[idx]);
      vel.vx[idx] = Math.cos(angle) * type.speed;
      vel.vy[idx] = Math.sin(angle) * type.speed;

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

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.CryptoHeist = CryptoHeist;
  window.CryptoHeist = CryptoHeist;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('cryptoheist', CryptoHeist);
})();
