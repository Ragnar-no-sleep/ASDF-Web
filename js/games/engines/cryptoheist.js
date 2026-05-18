/**
 * ASDF Games - Crypto Heist Engine (11/10 ECS Edition)
 *
 * Top-down shooter survival game with lighting, stealth, and loot rarity.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const CryptoHeist = {
    version: '2.0.0',
    gameId: 'cryptoheist',
    instance: null,

    lootRarities: [
      { icon: '🪙', color: '#9ca3af', value: 5, glow: false }, // 0 Common
      { icon: '💎', color: '#22c55e', value: 13, glow: false }, // 1 Uncommon
      { icon: '💠', color: '#3b82f6', value: 34, glow: true }, // 2 Rare
      { icon: '🔮', color: '#a855f7', value: 89, glow: true }, // 3 Epic
      { icon: '👑', color: '#fbbf24', value: 233, glow: true }, // 4 Legendary
    ],

    trapTypes: [
      { icon: '⚡', name: 'SHOCK', radius: 30, duration: 60, type: 0 },
      { icon: '🔥', name: 'FIRE', radius: 40, duration: 120, type: 1 },
      { icon: '🕸️', name: 'WEB', radius: 35, duration: 90, type: 2 },
    ],

    enemyTypes: [
      { icon: '👾', hp: 1, speed: 1.6, value: 13, size: 18, vision: 120 },
      { icon: '👹', hp: 2, speed: 1.3, value: 21, size: 22, vision: 150 },
      { icon: '🤖', hp: 3, speed: 1.0, value: 34, size: 25, vision: 180 },
      { icon: '🕵️', hp: 1, speed: 1.9, value: 21, size: 20, vision: 200 },
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

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Heist Components
      world.registerComponent('Player', { angle: 'f32', stun: 'f32', slow: 'f32', burn: 'f32' });
      world.registerComponent('Enemy', {
        hp: 'u8',
        maxHp: 'u8',
        state: 'u8',
        alert: 'f32',
        targetX: 'f32',
        targetY: 'f32',
        vision: 'f32',
        pIndex: 'u8',
      });
      world.registerComponent('Bullet', { active: 'u8' });
      world.registerComponent('Loot', { value: 'u16', rarity: 'u8' });
      world.registerComponent('Trap', { type: 'u8', cooldown: 'f32', active: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32' });
      world.registerComponent('VisualEffect', { colorIndex: 'u8', iconIndex: 'u8' });

      // Global State
      world.setResource('GameState', {
        score: 0,
        wave: 1,
        kills: 0,
        gameOver: false,
        keys: { up: false, down: false, left: false, right: false },
        mouseX: 0,
        mouseY: 0,
        lastShot: 0,
        shootCooldown: 10, // frames
        spawnTimer: 0,
        spawnRate: 89,
        enemySpeed: 1.618,
        stealth: 0,
        playerId: -1,
      });

      this.dom = {
        score: document.getElementById('ch-score'),
        kills: document.getElementById('ch-kills'),
        wave: document.getElementById('ch-wave'),
        stealthBar: document.getElementById('ch-stealth-bar'),
        alertText: document.getElementById('ch-alert'),
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
      world.componentRegistry.get('Collider').props.width[pIdx] = 20;
      world.componentRegistry.get('Collider').props.height[pIdx] = 20;
      world.getResource('GameState').playerId = p;

      // Spawn Initials
      for (let i = 0; i < 3; i++) this.spawnEnemy(world);

      world.addSystem(this.createLogicSystem());
      world.addSystem(this.createCollisionSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx);
      this.instance.render = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="ch-container">
          <canvas id="ch-canvas" class="game-canvas"></canvas>
          <div class="game-hud-top-left">
            <div class="ch-stat"><span class="ch-stat-score">💰 <span id="ch-score">0</span></span></div>
            <div class="ch-stat"><span class="ch-stat-kills">💀 <span id="ch-kills">0</span></span></div>
            <div class="ch-stat"><span class="ch-stat-wave">🌊 <span id="ch-wave">1</span></span></div>
          </div>
          <div class="game-hud-top-right ch-stealth-panel">
            <div class="ch-stealth-label">STEALTH</div>
            <div class="ch-stealth-bar-track"><div id="ch-stealth-bar" class="ch-stealth-bar-fill"></div></div>
            <div id="ch-alert" class="ch-alert-text">HIDDEN</div>
          </div>
          <div class="ch-hint-bar">WASD to move | AIM with mouse | CLICK to shoot | Survive!</div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🧙', size: 28 },
        ...this.lootRarities.map(r => ({ emoji: r.icon, size: 20 })),
        ...this.enemyTypes.map(e => ({ emoji: e.icon, size: 30 })),
        ...this.trapTypes.map(t => ({ emoji: t.icon, size: 20 })),
        { emoji: '💥', size: 20 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const world = this.instance.world;

      const setKey = (e, val) => {
        const key = e.key.toLowerCase();
        const state = world.getResource('GameState');
        if (['w', 'arrowup'].includes(key)) state.keys.up = val;
        if (['s', 'arrowdown'].includes(key)) state.keys.down = val;
        if (['a', 'arrowleft'].includes(key)) state.keys.left = val;
        if (['d', 'arrowright'].includes(key)) state.keys.right = val;
      };

      document.addEventListener('keydown', e => setKey(e, true));
      document.addEventListener('keyup', e => setKey(e, false));

      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const state = world.getResource('GameState');
        state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      });

      canvas.addEventListener('pointerdown', () => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        const now = Date.now();
        if (now - state.lastShot > state.shootCooldown * 16) {
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
      world.addComponent(b, 'Collider');
      world.addComponent(b, 'Bullet');

      const bIdx = world.getIndex(b);
      world.componentRegistry.get('Position').props.x[bIdx] = pos.x[pIdx];
      world.componentRegistry.get('Position').props.y[bIdx] = pos.y[pIdx];
      world.componentRegistry.get('Velocity').props.vx[bIdx] = Math.cos(playerAngle) * 12;
      world.componentRegistry.get('Velocity').props.vy[bIdx] = Math.sin(playerAngle) * 12;
      world.componentRegistry.get('Collider').props.width[bIdx] = 6;
      world.componentRegistry.get('Collider').props.height[bIdx] = 6;
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;

        // Player Effects
        if (pProps.stun[pIdx] > 0) pProps.stun[pIdx] -= dt;
        if (pProps.slow[pIdx] > 0) pProps.slow[pIdx] -= dt;
        if (pProps.burn[pIdx] > 0) pProps.burn[pIdx] -= dt; // Add visual damage logic here if needed

        // Player Movement
        let dx = 0,
          dy = 0;
        if (pProps.stun[pIdx] <= 0) {
          if (state.keys.up) dy -= 1;
          if (state.keys.down) dy += 1;
          if (state.keys.left) dx -= 1;
          if (state.keys.right) dx += 1;
        }

        const len = Math.sqrt(dx * dx + dy * dy);
        let speed = 5;
        if (pProps.slow[pIdx] > 0) speed *= 0.5;

        if (len > 0) {
          vel.vx[pIdx] = (dx / len) * speed;
          vel.vy[pIdx] = (dy / len) * speed;
        } else {
          vel.vx[pIdx] = 0;
          vel.vy[pIdx] = 0;
        }

        // Keep Player in bounds
        const px = pos.x[pIdx];
        const py = pos.y[pIdx];
        const w = self.instance.canvas.width;
        const h = self.instance.canvas.height;
        if (px < 15) pos.x[pIdx] = 15;
        if (px > w - 15) pos.x[pIdx] = w - 15;
        if (py < 15) pos.y[pIdx] = 15;
        if (py > h - 50) pos.y[pIdx] = h - 50;

        pProps.angle[pIdx] = Math.atan2(state.mouseY - py, state.mouseX - px);

        // Spawning
        state.spawnTimer += dt;
        if (state.spawnTimer >= state.spawnRate) {
          state.spawnTimer = 0;
          self.spawnEnemy(world);
        }

        // Cleanup Lifespans
        const lsQuery = world.createQuery(['Lifespan']);
        const { dense: lsDense, count: lsCount } = lsQuery.set;
        const lsProps = world.componentRegistry.get('Lifespan').props;
        for (let i = lsCount - 1; i >= 0; i--) {
          const idx = lsDense[i];
          lsProps.remaining[idx] -= dt;
          if (lsProps.remaining[idx] <= 0) {
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        // Boundary bullets cleanup
        const bQuery = world.createQuery(['Bullet', 'Position']);
        const { dense: bDense, count: bCount } = bQuery.set;
        for (let i = bCount - 1; i >= 0; i--) {
          const idx = bDense[i];
          if (pos.x[idx] < -10 || pos.x[idx] > w + 10 || pos.y[idx] < -10 || pos.y[idx] > h + 10) {
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
        const vel = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;
        const eProps = world.componentRegistry.get('Enemy');
        const lProps = world.componentRegistry.get('Loot');
        const tProps = world.componentRegistry.get('Trap');

        const px = pos.x[pIdx];
        const py = pos.y[pIdx];

        let maxVis = 0;
        let anyChasing = false;

        // Enemies AI & Collision with Player
        if (eProps) {
          const query = world.createQuery(['Enemy', 'Position', 'Velocity']);
          const { dense, count } = query.set;
          for (let i = 0; i < count; i++) {
            const idx = dense[i];
            const ex = pos.x[idx];
            const ey = pos.y[idx];

            // Visibility
            const dist = Math.hypot(px - ex, py - ey);
            let vis = Math.max(0, 1 - dist / eProps.props.vision[idx]);
            if (Date.now() - state.lastShot < 200) vis = Math.min(1, vis + 0.5);
            maxVis = Math.max(maxVis, vis);

            // AI State Machine
            if (vis > 0.3) {
              eProps.props.alert[idx] = Math.min(100, eProps.props.alert[idx] + vis * 3 * dt);
              eProps.props.targetX[idx] = px;
              eProps.props.targetY[idx] = py;
            } else {
              eProps.props.alert[idx] = Math.max(0, eProps.props.alert[idx] - dt);
            }

            eProps.props.state[idx] =
              eProps.props.alert[idx] > 80 ? 2 : eProps.props.alert[idx] > 30 ? 1 : 0;

            if (eProps.props.state[idx] === 2) {
              anyChasing = true;
              const spd = state.enemySpeed * 1.2;
              const angle = Math.atan2(py - ey, px - ex);
              vel.vx[idx] = Math.cos(angle) * spd;
              vel.vy[idx] = Math.sin(angle) * spd;
            } else {
              vel.vx[idx] = 0;
              vel.vy[idx] = 0;
            }

            // Hit Player?
            if (dist < 20) {
              state.gameOver = true;
              if (typeof endGame === 'function')
                setTimeout(() => endGame(self.gameId, state.score), 500);
            }
          }
        }

        state.stealth = maxVis;

        // UI Alerts
        if (self.dom.alertText) {
          let msg = 'HIDDEN';
          let col = '#22c55e';
          if (anyChasing) {
            msg = 'ALERT!';
            col = '#ef4444';
          } else if (maxVis > 0.3) {
            msg = 'SPOTTED';
            col = '#fbbf24';
          }
          self.dom.alertText.textContent = msg;
          self.dom.alertText.style.color = col;
        }

        // Bullets vs Enemies
        const bullets = world.createQuery(['Bullet', 'Position']);
        if (eProps) {
          const { dense: bDense, count: bCount } = bullets.set;
          const { dense: eDense, count: eCount } = world.createQuery(['Enemy', 'Position']).set;

          for (let i = bCount - 1; i >= 0; i--) {
            const bIdx = bDense[i];
            const bx = pos.x[bIdx];
            const by = pos.y[bIdx];
            let hit = false;

            for (let j = eCount - 1; j >= 0; j--) {
              const eIdx = eDense[j];
              const ex = pos.x[eIdx];
              const ey = pos.y[eIdx];
              if (Math.hypot(bx - ex, by - ey) < 20) {
                eProps.props.hp[eIdx]--;
                if (eProps.props.hp[eIdx] <= 0) {
                  state.kills++;
                  state.score += eProps.props.points[eIdx] || 10;
                  self.spawnLoot(world, ex, ey);

                  if (state.kills > 0 && state.kills % 10 === 0) {
                    state.wave++;
                    state.spawnRate = Math.max(40, state.spawnRate - 10);
                    state.enemySpeed += 0.2;
                    self.spawnTrap(world);
                  }

                  world.destroyEntity(world.getEntityId(eIdx));
                }
                hit = true;
                break;
              }
            }
            if (hit) world.destroyEntity(world.getEntityId(bIdx));
          }
        }

        // Loot Collection
        if (lProps) {
          const { dense, count } = world.createQuery(['Loot', 'Position']).set;
          for (let i = count - 1; i >= 0; i--) {
            const lIdx = dense[i];
            if (Math.hypot(px - pos.x[lIdx], py - pos.y[lIdx]) < 25) {
              state.score += lProps.props.value[lIdx];
              world.destroyEntity(world.getEntityId(lIdx));
            }
          }
        }

        // Traps Trigger
        if (tProps) {
          const { dense, count } = world.createQuery(['Trap', 'Position']).set;
          for (let i = count - 1; i >= 0; i--) {
            const tIdx = dense[i];
            if (tProps.props.cooldown[tIdx] > 0) {
              tProps.props.cooldown[tIdx] -= dt;
            } else {
              const dist = Math.hypot(px - pos.x[tIdx], py - pos.y[tIdx]);
              if (dist < 30) {
                tProps.props.cooldown[tIdx] = 180;
                const type = tProps.props.type[tIdx];
                if (type === 0) pProps.stun[pIdx] = 60;
                if (type === 1) pProps.burn[pIdx] = 120;
                if (type === 2) pProps.slow[pIdx] = 90;
              }
            }
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
      const en = world.componentRegistry.get('Enemy').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const state = world.getResource('GameState');

      const side = Math.floor(Math.random() * 4);
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      if (side === 0) {
        pos.x[idx] = -30;
        pos.y[idx] = Math.random() * h;
      } else if (side === 1) {
        pos.x[idx] = w + 30;
        pos.y[idx] = Math.random() * h;
      } else if (side === 2) {
        pos.x[idx] = Math.random() * w;
        pos.y[idx] = -30;
      } else {
        pos.x[idx] = Math.random() * w;
        pos.y[idx] = h + 30;
      }

      const type =
        this.enemyTypes[Math.floor(Math.random() * Math.min(state.wave, this.enemyTypes.length))];
      en.hp[idx] = type.hp;
      en.maxHp[idx] = type.hp;
      en.vision[idx] = type.vision;
      rend.iconIndex[idx] = this.lootRarities.length + this.enemyTypes.indexOf(type) + 1; // dynamically map
      rend.size[idx] = type.size;
    },

    spawnLoot(world, x, y) {
      if (Math.random() > 0.5) return;

      const roll = Math.random();
      let rarity = 0;
      if (roll < 0.02) rarity = 4;
      else if (roll < 0.1) rarity = 3;
      else if (roll < 0.25) rarity = 2;
      else if (roll < 0.5) rarity = 1;

      const rData = this.lootRarities[rarity];
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Loot');
      world.addComponent(e, 'Lifespan');

      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = rarity + 1; // mapped to loot
      world.componentRegistry.get('Renderable').props.size[idx] = 20;
      world.componentRegistry.get('Loot').props.value[idx] = rData.value;
      world.componentRegistry.get('Loot').props.rarity[idx] = rarity;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 300;
    },

    spawnTrap(world) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Trap');

      const idx = world.getIndex(e);
      const margin = 80;
      world.componentRegistry.get('Position').props.x[idx] =
        margin + Math.random() * (this.instance.canvas.width - margin * 2);
      world.componentRegistry.get('Position').props.y[idx] =
        margin + Math.random() * (this.instance.canvas.height - margin * 2);

      const tIdx = Math.floor(Math.random() * this.trapTypes.length);
      world.componentRegistry.get('Trap').props.type[idx] = tIdx;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] =
        this.lootRarities.length + this.enemyTypes.length + 1 + tIdx;
      world.componentRegistry.get('Renderable').props.size[idx] = 20;
    },

    updateUI(state) {
      if (this.dom.score) this.dom.score.textContent = state.score;
      if (this.dom.kills) this.dom.kills.textContent = state.kills;
      if (this.dom.wave) this.dom.wave.textContent = state.wave;
      if (this.dom.stealthBar) this.dom.stealthBar.style.width = `${state.stealth * 100}%`;
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width;
      const h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');
      const world = this.instance.world;

      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const px = pos.x[pIdx];
      const py = pos.y[pIdx];
      const pAngle = world.componentRegistry.get('Player').props.angle[pIdx];

      // BG
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(26, 26, 62, 0.5)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Flashlight
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pAngle);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
      gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
      gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 200, -Math.PI / 8, Math.PI / 8);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();

      // Ambient
      const ambient = ctx.createRadialGradient(px, py, 0, px, py, 80);
      ambient.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
      ambient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, w, h);

      // Render Everything via custom loop to handle icons and visibility correctly
      const movers = world.createQuery(['Position', 'Renderable']);
      const rend = world.componentRegistry.get('Renderable').props;
      const { dense, count } = movers.set;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const tx = pos.x[idx];
        const ty = pos.y[idx];
        const rIdx = rend.iconIndex[idx];

        let icon = '❓';
        if (idx === state.playerId) {
          icon = '🧙';
        } else if (
          world.componentRegistry.get('Bullet') &&
          world.componentRegistry.get('Bullet').props.active[idx] !== undefined
        ) {
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(tx, ty, 5, 0, Math.PI * 2);
          ctx.fill();
          continue;
        } else if (rIdx >= 1 && rIdx <= this.lootRarities.length) {
          icon = this.lootRarities[rIdx - 1].icon;
        } else if (
          rIdx > this.lootRarities.length &&
          rIdx <= this.lootRarities.length + this.enemyTypes.length
        ) {
          icon = this.enemyTypes[rIdx - this.lootRarities.length - 1].icon;
          // Enemy UI
          const enProps = world.componentRegistry.get('Enemy').props;
          if (enProps && enProps.alert[idx] > 0) {
            ctx.fillStyle = enProps.alert[idx] > 80 ? '#ef4444' : '#fbbf24';
            ctx.fillRect(tx - 10, ty - 25, 20 * (enProps.alert[idx] / 100), 3);
          }
        } else if (rIdx > this.lootRarities.length + this.enemyTypes.length) {
          icon = this.trapTypes[rIdx - this.lootRarities.length - this.enemyTypes.length - 1].icon;
          ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
          ctx.beginPath();
          ctx.arc(tx, ty, 30, 0, Math.PI * 2);
          ctx.fill();
        }

        // Sight check
        const dist = Math.hypot(px - tx, py - ty);
        const a = Math.abs(Math.atan2(ty - py, tx - px) - pAngle);
        const inLight = dist < 200 && (a < Math.PI / 8 || Math.PI * 2 - a < Math.PI / 8);
        const alpha = inLight || dist < 80 ? 1 : 0.4;

        if (idx === state.playerId) {
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(pAngle);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(30, 0);
          ctx.stroke();
          ctx.restore();
        }

        SpriteCache.drawTransformed(ctx, icon, tx, ty, rend.size[idx], { alpha });
      }
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
