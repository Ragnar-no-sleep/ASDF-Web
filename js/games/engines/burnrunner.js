/**
 * ASDF Games - Burn Runner Engine (11/10 ECS Edition)
 *
 * Endless runner game: Run through the blockchain, collect tokens, avoid obstacles
 * Migrated to ECS for zero-allocation performance.
 */

'use strict';

(function () {
  const BurnRunner = {
    version: '2.0.0',
    gameId: 'burnrunner',
    instance: null,
    _cleanupInput: null,
    icons: ['🐕', '💥', '💎'],

    obstacleTypes: [
      { icon: '💀', name: 'SCAM', width: 35, height: 40 },
      { icon: '🚫', name: 'RUG', width: 35, height: 35 },
      { icon: '🔥', name: 'BURN', width: 32, height: 38 },
      { icon: '💣', name: 'BOMB', width: 32, height: 34 },
    ],

    start(gameId) {
      this.stop();

      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('br-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      // 11/10: Resize early to get correct dimensions for logic
      this.instance.resize();

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      // Configure Input Hub
      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('JUMP', ['Space', 'ArrowUp', 'KeyW']);
      }

      // Components
      world.registerComponent('Player', { jumpsLeft: 'u8' });
      world.registerComponent('Obstacle', { type: 'u8' });
      world.registerComponent('Collectible', { value: 'u16' });

      world.setResource('GameState', {
        distance: 0,
        tokens: 0,
        speed: 6,
        baseSpeed: 6,
        maxSpeed: 13.5,
        gravity: 0.4,
        jumpForce: -9,
        maxJumps: 2,
        gameOver: false,
        spawnTimer: 0,
        groundY: canvas.height - 50,
        playerId: -1,
        jumpBuffer: 0,
        jumpBufferFrames: 8,
        coyoteTimer: 0,
        coyoteFrames: 6,
        combo: 0,
        bestCombo: 0,
      });

      this.dom = {
        distance: document.getElementById('br-distance'),
        tokens: document.getElementById('br-tokens'),
        combo: document.getElementById('br-combo'),
      };

      this.setupInput();
      this.preloadSprites();

      // Create Player
      const player = world.createEntity();
      world.addComponent(player, 'Position');
      world.addComponent(player, 'Velocity');
      world.addComponent(player, 'Renderable');
      world.addComponent(player, 'Collider');
      world.addComponent(player, 'Player');

      const pIdx = world.getIndex(player);
      world.componentRegistry.get('Position').props.x[pIdx] = 80;
      world.componentRegistry.get('Position').props.y[pIdx] = canvas.height - 100;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // 🐕
      world.componentRegistry.get('Renderable').props.size[pIdx] = 45;
      world.componentRegistry.get('Collider').props.width[pIdx] = 30;
      world.componentRegistry.get('Collider').props.height[pIdx] = 45;
      world.componentRegistry.get('Player').props.jumpsLeft[pIdx] = 2;
      world.getResource('GameState').playerId = player;

      // Update Loop
      this.instance.onUpdate = dt => {
        const state = world.getResource('GameState');
        if (kernel.services.hud) {
          kernel.services.hud.update(this.gameId, state);
          // Custom BR HUD
          if (this.dom.distance) this.dom.distance.textContent = Math.floor(state.distance) + 'm';
          if (this.dom.tokens) this.dom.tokens.textContent = state.tokens;
        }
      };

      // Override Render
      this.icons = ['🐕', '💥', '💎', ...this.obstacleTypes.map(o => o.icon)];
      this.instance.onRender = alpha => this.draw(alpha);

      // Systems
      world.addSystem(this.createRunnerSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="br-container">
          <canvas id="br-canvas" class="game-canvas"></canvas>
          <div class="game-hud-top-left">
            <div class="game-hud-stat">DIST: <span id="br-distance">0m</span></div>
            <div class="game-hud-stat">TOKENS: <span id="br-tokens">0</span></div>
            <div class="game-hud-stat">COMBO: <span id="br-combo">x0</span></div>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🐕', size: 45 },
        { emoji: '💎', size: 28 },
        { emoji: '💥', size: 35 },
        ...this.obstacleTypes.map(o => ({ emoji: o.icon, size: 36 })),
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const canvas = this.instance.canvas;
      const queueJump = e => {
        if (e && e.cancelable) e.preventDefault();
        const world = this.instance.world;
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        state.jumpBuffer = state.jumpBufferFrames;
      };

      const onKeyDown = e => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') queueJump(e);
      };

      document.addEventListener('keydown', onKeyDown);
      canvas.addEventListener('pointerdown', queueJump);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        canvas.removeEventListener('pointerdown', queueJump);
      };
    },

    createRunnerSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        state.distance += state.speed * 0.1 * dt;
        state.speed = Math.min(state.maxSpeed, state.baseSpeed + state.distance * 0.0012);

        const playerIdx = world.getIndex(state.playerId);
        const posProps = world.componentRegistry.get('Position').props;
        const velProps = world.componentRegistry.get('Velocity').props;
        const pProps = world.componentRegistry.get('Player').props;
        const collProps = world.componentRegistry.get('Collider').props;
        const rendProps = world.componentRegistry.get('Renderable').props;

        velProps.vy[playerIdx] += state.gravity * dt;

        const py = posProps.y[playerIdx];
        const ph = collProps.height[playerIdx];

        const wasGrounded = py + ph >= state.groundY - 1;
        if (py + ph > state.groundY) {
          posProps.y[playerIdx] = state.groundY - ph;
          velProps.vy[playerIdx] = 0;
          pProps.jumpsLeft[playerIdx] = state.maxJumps;
        }

        if (wasGrounded) {
          state.coyoteTimer = state.coyoteFrames;
        } else if (state.coyoteTimer > 0) {
          state.coyoteTimer -= dt;
        }

        if (state.jumpBuffer > 0) {
          state.jumpBuffer -= dt;
          const canCoyoteJump =
            state.coyoteTimer > 0 && pProps.jumpsLeft[playerIdx] === state.maxJumps;

          if (pProps.jumpsLeft[playerIdx] > 0 || canCoyoteJump) {
            velProps.vy[playerIdx] = state.jumpForce;
            pProps.jumpsLeft[playerIdx] = Math.max(0, pProps.jumpsLeft[playerIdx] - 1);
            state.jumpBuffer = 0;
            state.coyoteTimer = 0;
          }
        }

        // Spawning
        state.spawnTimer += dt;
        const activeHazards = world.createQuery(['Position', 'Collider']).set.count;
        if (activeHazards < 24 && state.spawnTimer > Math.max(42, 120 / (state.speed / 6))) {
          state.spawnTimer = 0;
          self.spawnEntity(world);
        }

        // Collisions
        const px = posProps.x[playerIdx],
          pw = collProps.width[playerIdx];
        const query = world.createQuery(['Position', 'Collider']);
        const { dense, count } = query.set;

        const obsComp = world.componentRegistry.get('Obstacle');
        const colComp = world.componentRegistry.get('Collectible');
        const obsBit = obsComp ? obsComp.bit : 0;
        const colBit = colComp ? colComp.bit : 0;

        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === playerIdx) continue;

          posProps.x[idx] -= state.speed * dt;

          const ex = posProps.x[idx],
            ey = posProps.y[idx];
          const ew = collProps.width[idx],
            eh = collProps.height[idx];

          if (
            px < ex + ew &&
            px + pw > ex &&
            posProps.y[playerIdx] < ey + eh &&
            posProps.y[playerIdx] + ph > ey
          ) {
            const entityMask = world.entityMasks[idx];
            if (obsBit && (entityMask & obsBit) === obsBit) {
              state.gameOver = true;
              state.combo = 0;
              rendProps.iconIndex[playerIdx] = 1; // 💥

              // 11/10 Visual Juice
              if (ASDF.ParticleSystem) {
                ASDF.ParticleSystem.emit(world, px + pw / 2, py + ph / 2, {
                  count: 30,
                  colorIdx: 2,
                  speed: 8,
                  gravity: 0.3,
                });
              }
              self.instance.shake(15, 20);

              if (typeof endGame === 'function') endGame(self.gameId, Math.floor(state.distance));
            } else if (colBit && (entityMask & colBit) === colBit) {
              const value = colComp.props.value[idx] || 1;
              state.tokens += value;
              state.combo++;
              state.bestCombo = Math.max(state.bestCombo, state.combo);
              state.distance += value * Math.min(10, state.combo);

              if (ASDF.ParticleSystem) {
                ASDF.ParticleSystem.emit(world, ex + ew / 2, ey + eh / 2, {
                  count: 12,
                  colorIdx: 1,
                  speed: 4,
                  gravity: 0.02,
                  life: 18,
                });
              }

              world.destroyEntity(world.getEntityId(idx));
            }
          }

          if (ex < -100) {
            if (obsBit && (world.entityMasks[idx] & obsBit) === obsBit) state.combo = 0;
            world.destroyEntity(world.getEntityId(idx));
          }
        }

        self.updateUI(state);
      };
    },

    spawnEntity(world) {
      const state = world.getResource('GameState');
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Collider');

      const idx = world.getIndex(e);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const coll = world.componentRegistry.get('Collider').props;

      pos.x[idx] = this.instance.canvas.width + 50;

      if (Math.random() < 0.6) {
        world.addComponent(e, 'Obstacle');
        const typeIdx = Math.floor(Math.random() * this.obstacleTypes.length);
        const type = this.obstacleTypes[typeIdx];
        pos.y[idx] = state.groundY - type.height;
        rend.iconIndex[idx] = 3 + typeIdx; // Map to icons array
        rend.size[idx] = type.width;
        coll.width[idx] = type.width;
        coll.height[idx] = type.height;
      } else {
        world.addComponent(e, 'Collectible');
        const collectible = world.componentRegistry.get('Collectible').props;
        pos.y[idx] = state.groundY - 100 - Math.random() * 80;
        rend.iconIndex[idx] = 2; // 💎
        rend.size[idx] = 28;
        coll.width[idx] = 28;
        coll.height[idx] = 28;
        collectible.value[idx] = Math.random() < 0.15 ? 3 : 1;
        if (collectible.value[idx] > 1) rend.size[idx] = 34;
      }
    },

    updateUI(state) {
      if (this.dom.distance) this.dom.distance.textContent = Math.floor(state.distance) + 'm';
      if (this.dom.tokens) this.dom.tokens.textContent = state.tokens;
      if (this.dom.combo) this.dom.combo.textContent = `x${state.combo}`;
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      // 1. Cyberpunk Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, state.groundY);
      skyGrad.addColorStop(0, '#0a0a1a');
      skyGrad.addColorStop(1, '#2d1b4e');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Parallax Skyline (Layer 1: Far Buildings)
      ctx.fillStyle = '#150a25';
      const farSpeed = state.distance * 0.05;
      for (let i = 0; i < 5; i++) {
        const x = (i * 300 - farSpeed) % (5 * 300);
        const bx = x < 0 ? x + 1500 : x;
        ctx.fillRect(bx, state.groundY - 150, 120, 150);
        // Small windows
        ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
        ctx.fillRect(bx + 20, state.groundY - 130, 10, 10);
        ctx.fillRect(bx + 90, state.groundY - 100, 10, 10);
        ctx.fillStyle = '#150a25';
      }

      // 3. Parallax Skyline (Layer 2: Mid Buildings)
      ctx.fillStyle = '#0f051a';
      const midSpeed = state.distance * 0.15;
      for (let i = 0; i < 6; i++) {
        const x = (i * 250 - midSpeed) % (6 * 250);
        const bx = x < 0 ? x + 1500 : x;
        ctx.fillRect(bx, state.groundY - 100, 150, 100);
      }

      // 4. Animated Ground (Grid)
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, state.groundY, w, h - state.groundY);

      ctx.strokeStyle = '#4c1d95';
      ctx.lineWidth = 1;
      const gridOff = (state.distance * 5) % 40;
      ctx.beginPath();
      // Vertical lines (Perspective-like)
      for (let x = -gridOff; x < w; x += 40) {
        ctx.moveTo(x, state.groundY);
        ctx.lineTo(x - 50, h);
      }
      // Horizontal lines
      for (let y = state.groundY; y < h; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(251, 191, 36, 0.16)';
      ctx.lineWidth = 2;
      const lineCount = Math.min(18, Math.floor(6 + state.speed));
      for (let i = 0; i < lineCount; i++) {
        const y = 40 + ((i * 73 + state.distance * 9) % Math.max(80, state.groundY - 80));
        const x = (w - ((state.distance * 18 + i * 137) % (w + 180))) | 0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 80 + state.speed * 4, y);
        ctx.stroke();
      }

      // 5. Entities
      const world = this.instance.world;
      const pIdx = world.getIndex(state.playerId);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;

      const query = world.createQuery(['Position', 'Renderable']);
      const { dense, count } = query.set;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const tx = pos.x[idx],
          ty = pos.y[idx];
        const size = rend.size[idx] || 40;

        if (idx === pIdx) {
          // Flip the dog (🐕) to face RIGHT
          if (typeof SpriteCache !== 'undefined' && SpriteCache.drawTransformed) {
            SpriteCache.drawTransformed(ctx, this.icons[0], tx, ty, size, {
              scaleX: -1,
              rotation: 0,
            });
          } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.icons[0], tx, ty);
          }
        } else {
          const icon = this.icons[rend.iconIndex[idx]] || '❓';
          if (typeof SpriteCache !== 'undefined') {
            SpriteCache.draw(ctx, icon, tx, ty, size);
          } else {
            ctx.font = `${size}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, tx, ty);
          }
        }
      }
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
  window.ASDF.BurnRunner = BurnRunner;
  window.BurnRunner = BurnRunner;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('burnrunner', BurnRunner);
})();
