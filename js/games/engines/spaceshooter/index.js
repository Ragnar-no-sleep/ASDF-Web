/**
 * ASDF Games - Space Shooter Engine (11/10 ECS Edition)
 *
 * Classic scrolling shooter with upgrades, waves, and power-ups.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const SpaceShooter = {
    version: '2.2.0',
    gameId: 'spaceshooter',
    instance: null,
    _cleanupInput: null,
    _enemyQuery: null,
    _bulletQuery: null,
    _lifespanQuery: null,
    _renderQuery: null,

    enemySpecs: [
      { icon: '🛸', hp: 1, speed: 2, points: 10, size: 24 },
      { icon: '👾', hp: 2, speed: 1.5, points: 20, size: 30 },
      { icon: '🛰️', hp: 3, speed: 1, points: 50, size: 32 },
    ],

    start(gameId) {
      this.stop();

      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      arena.innerHTML = `
        <div class="sps-container">
          <canvas id="sps-canvas" class="game-canvas"></canvas>
          <div id="ss-hud" class="sps-hud">
            <span>SCORE <strong id="ss-score">0</strong></span>
            <span>WAVE <strong id="ss-wave">1</strong></span>
          </div>
          <div class="sps-hint">WASD / arrows to pilot · Space to fire</div>
        </div>
      `;
      const canvas = document.getElementById('sps-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 2000,
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
      world.registerComponent('Player', { lastShot: 'f32', fireRate: 'f32' });
      world.registerComponent('Enemy', { type: 'u8', hp: 'u8', points: 'u8' });
      world.registerComponent('Bullet', { owner: 'u8' });
      world.registerComponent('Lifespan', { remaining: 'f32' });

      // Register Personality Components
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      this._enemyQuery = world.createQuery(['Enemy', 'Position']);
      this._bulletQuery = world.createQuery(['Bullet', 'Position']);
      this._lifespanQuery = world.createQuery(['Lifespan']);

      world.setResource('GameState', {
        score: 0,
        wave: 1,
        kills: 0,
        gameOver: false,
        playerId: -1,
        keys: {},
        spawnTimer: 0,
        maxEnemies: 10,
      });

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

      const idx = world.getIndex(p);
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const pl = world.componentRegistry.get('Player').props;

      pos.x[idx] = canvas.width / 2;
      pos.y[idx] = canvas.height - 60;
      rend.iconIndex[idx] = 0; // 🚀
      rend.size[idx] = 32;
      pl.fireRate[idx] = 15;
      pl.lastShot[idx] = 0;

      world.getResource('GameState').playerId = p;

      this.instance.onUpdate = (dt, dtMs) => {
        const state = world.getResource('GameState');
        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }
        return shouldFreeze;
      };

      // Systems
      world.addSystem(ASDF.PersonalitySystem.create());
      world.addSystem(this.createLogicSystem());
      world.addSystem(ASDF.PhysicsSystem.createMovement());

      // Override Render (Atmospheric Environment)
      this.instance.onRender = alpha => {
        if (this.juice) this.juice.renderPre();
        this.draw(alpha);
        if (this.juice) this.juice.renderPost();
      };

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🚀', size: 32 },
        { emoji: '🔥', size: 10 },
        { emoji: '🛸', size: 24 },
        { emoji: '👾', size: 24 },
        { emoji: '🛰️', size: 32 },
        { emoji: '💥', size: 32 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    setupInput() {
      const world = this.instance.world;
      const state = world.getResource('GameState');
      const onKeyDown = e => {
        state.keys[e.key.toLowerCase()] = true;
      };
      const onKeyUp = e => {
        state.keys[e.key.toLowerCase()] = false;
      };
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
      };
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        const vel = world.componentRegistry.get('Velocity').props;
        const pl = world.componentRegistry.get('Player').props;

        // Player Movement
        let vx = 0,
          vy = 0;
        if (state.keys['arrowleft'] || state.keys['a']) vx = -7;
        else if (state.keys['arrowright'] || state.keys['d']) vx = 7;
        if (state.keys['arrowup'] || state.keys['w']) vy = -5;
        else if (state.keys['arrowdown'] || state.keys['s']) vy = 5;

        vel.vx[pIdx] = vx;
        vel.vy[pIdx] = vy;

        // Bounds
        pos.x[pIdx] = Math.max(20, Math.min(self.instance.canvas.width - 20, pos.x[pIdx]));
        pos.y[pIdx] = Math.max(20, Math.min(self.instance.canvas.height - 20, pos.y[pIdx]));

        // Shooting
        pl.lastShot[pIdx] -= dt;
        if ((state.keys[' '] || state.keys['control']) && pl.lastShot[pIdx] <= 0) {
          self.spawnBullet(world, pos.x[pIdx], pos.y[pIdx] - 20);
          pl.lastShot[pIdx] = pl.fireRate[pIdx];
          if (typeof ASDF !== 'undefined' && ASDF.soundSystem) ASDF.soundSystem.play('click');
        }

        state.wave = 1 + Math.floor(state.score / 350);
        state.maxEnemies = Math.min(26, 8 + state.wave * 2);

        // Spawning
        state.spawnTimer += dt;
        const enemies =
          self._enemyQuery || (self._enemyQuery = world.createQuery(['Enemy', 'Position']));
        if (
          enemies.set.count < state.maxEnemies &&
          state.spawnTimer > Math.max(14, 76 - state.wave * 4)
        ) {
          self.spawnEnemy(world);
          state.spawnTimer = 0;
        }

        // Collisions
        const bullets =
          self._bulletQuery || (self._bulletQuery = world.createQuery(['Bullet', 'Position']));
        const bPos = world.componentRegistry.get('Position').props;
        const ePos = world.componentRegistry.get('Position').props;
        const eProps = world.componentRegistry.get('Enemy').props;

        const { dense: bDense, count: bCount } = bullets.set;
        const { dense: eDense, count: eCount } = enemies.set;

        for (let i = bCount - 1; i >= 0; i--) {
          const bIdx = bDense[i];
          for (let j = eCount - 1; j >= 0; j--) {
            const eIdx = eDense[j];
            if (Math.hypot(bPos.x[bIdx] - ePos.x[eIdx], bPos.y[bIdx] - ePos.y[eIdx]) < 25) {
              state.kills++;
              state.score += eProps.points[eIdx];

              // 11/10 Impact Juice
              if (self.juice) {
                self.juice.impact(ePos.x[eIdx], ePos.y[eIdx], { intensity: 'medium' });
              } else if (ASDF.ParticleSystem) {
                ASDF.ParticleSystem.emit(world, ePos.x[eIdx], ePos.y[eIdx], {
                  count: 10,
                  colorIdx: 1,
                  speed: 4,
                });
              }
              if (!self.juice) self.instance.shake(3, 10);

              self.addEffect(world, ePos.x[eIdx], ePos.y[eIdx], 5);
              world.destroyEntity(world.getEntityId(eIdx));
              world.destroyEntity(world.getEntityId(bIdx));
              if (typeof ASDF !== 'undefined' && ASDF.soundSystem) ASDF.soundSystem.play('collect');
              break;
            }
          }
        }

        // Enemy pressure and cleanup
        for (let i = eCount - 1; i >= 0; i--) {
          const eIdx = eDense[i];
          if (Math.hypot(pos.x[pIdx] - ePos.x[eIdx], pos.y[pIdx] - ePos.y[eIdx]) < 26) {
            state.gameOver = true;
            if (self.juice) {
              self.juice.impact(pos.x[pIdx], pos.y[pIdx], { intensity: 'death' });
            } else {
              self.instance.shake(18, 24);
            }
            if (typeof endGame === 'function') endGame(self.gameId, state.score);
            break;
          }
          if (ePos.y[eIdx] > self.instance.canvas.height + 80) {
            world.destroyEntity(world.getEntityId(eIdx));
          }
        }

        // Cleanup Lifespans
        const lsQuery =
          self._lifespanQuery || (self._lifespanQuery = world.createQuery(['Lifespan']));
        const { dense: lDense, count: lCount } = lsQuery.set;
        const lsProps = world.componentRegistry.get('Lifespan').props;
        for (let i = lCount - 1; i >= 0; i--) {
          const idx = lDense[i];
          lsProps.remaining[idx] -= dt;
          if (lsProps.remaining[idx] <= 0) world.destroyEntity(world.getEntityId(idx));
        }

        const scoreEl = document.getElementById('ss-score');
        if (scoreEl) scoreEl.textContent = state.score;
        const waveEl = document.getElementById('ss-wave');
        if (waveEl) waveEl.textContent = state.wave;
      };
    },

    spawnBullet(world, x, y) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Velocity');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Bullet');
      world.addComponent(e, 'Lifespan');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Velocity').props.vy[idx] = -12;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 1;
      world.componentRegistry.get('Renderable').props.size[idx] = 15;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 70;
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
      const state = world.getResource('GameState');
      const typeIdx = Math.floor(
        Math.random() * Math.min(1 + Math.floor(state.wave / 2), this.enemySpecs.length)
      );
      const type = this.enemySpecs[typeIdx] || this.enemySpecs[0];
      const speedScale = Math.min(2.25, 1 + state.wave * 0.08);

      world.componentRegistry.get('Position').props.x[idx] =
        30 + Math.random() * (this.instance.canvas.width - 60);
      world.componentRegistry.get('Position').props.y[idx] = -40;
      world.componentRegistry.get('Velocity').props.vy[idx] = type.speed * speedScale;
      world.componentRegistry.get('Enemy').props.type[idx] = typeIdx;
      world.componentRegistry.get('Enemy').props.points[idx] = type.points;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 2 + typeIdx;
      world.componentRegistry.get('Renderable').props.size[idx] = type.size;
    },

    addEffect(world, x, y, iconIdx) {
      const e = world.createEntity();
      world.addComponent(e, 'Position');
      world.addComponent(e, 'Renderable');
      world.addComponent(e, 'Lifespan');
      const idx = world.getIndex(e);
      world.componentRegistry.get('Position').props.x[idx] = x;
      world.componentRegistry.get('Position').props.y[idx] = y;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = iconIdx;
      world.componentRegistry.get('Renderable').props.size[idx] = 40;
      world.componentRegistry.get('Lifespan').props.remaining[idx] = 20;
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          allowNoise: false,
          seed: state.score + state.wave,
        });
      } else {
        ctx.fillStyle = '#12071f';
        ctx.fillRect(0, 0, w, h);
      }

      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#fff2b3';
      for (let i = 0; i < 18; i++) {
        const x = (i * 137.5 + state.score * 0.08) % w;
        const y = (i * 243.1 + state.score * 0.12) % h;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();

      this.drawShips(ctx);
    },

    drawShips(ctx) {
      const world = this.instance.world;
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;
      const state = world.getResource('GameState');
      const playerIdx = world.getIndex(state.playerId);
      const enemyComp = world.componentRegistry.get('Enemy');
      const bulletComp = world.componentRegistry.get('Bullet');
      const lifespanComp = world.componentRegistry.get('Lifespan');
      const enemyBit = enemyComp ? enemyComp.bit : 0;
      const bulletBit = bulletComp ? bulletComp.bit : 0;
      const lifeBit = lifespanComp ? lifespanComp.bit : 0;
      const query =
        this._renderQuery || (this._renderQuery = world.createQuery(['Position', 'Renderable']));
      const { dense, count } = query.set;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const mask = world.entityMasks[idx];
        if (idx === playerIdx) {
          this.drawPlayerShip(ctx, pos.x[idx], pos.y[idx], rend.size[idx] || 34);
        } else if (enemyBit && (mask & enemyBit) === enemyBit) {
          this.drawEnemyShip(
            ctx,
            pos.x[idx],
            pos.y[idx],
            rend.size[idx] || 30,
            enemyComp.props.type[idx] || 0
          );
        } else if (bulletBit && (mask & bulletBit) === bulletBit) {
          this.drawLaser(ctx, pos.x[idx], pos.y[idx]);
        } else if (lifeBit && (mask & lifeBit) === lifeBit) {
          this.drawBurst(ctx, pos.x[idx], pos.y[idx], rend.size[idx] || 28);
        }
      }
    },

    drawPlayerShip(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.06, size * 0.26, size * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.68);
      ctx.lineTo(size * 0.16, -size * 0.24);
      ctx.lineTo(-size * 0.16, -size * 0.24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff2d95';
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, size * 0.1);
      ctx.lineTo(-size * 0.52, size * 0.42);
      ctx.lineTo(-size * 0.12, size * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(size * 0.2, size * 0.1);
      ctx.lineTo(size * 0.52, size * 0.42);
      ctx.lineTo(size * 0.12, size * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#3b120b';
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.14, size * 0.13, size * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(-size * 0.12, size * 0.46);
      ctx.lineTo(0, size * 0.74);
      ctx.lineTo(size * 0.12, size * 0.46);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawEnemyShip(ctx, x, y, size, type) {
      const palettes = [
        ['#f43f5e', '#3b120b'],
        ['#ff2d95', '#2a0718'],
        ['#ff6b35', '#311006'],
      ];
      const [hot, dark] = palettes[type % palettes.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.shadowColor = hot;
      ctx.shadowBlur = 10;
      const grad = ctx.createLinearGradient(-size, -size, size, size);
      grad.addColorStop(0, hot);
      grad.addColorStop(1, dark);
      ctx.fillStyle = grad;
      if (type === 0) {
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.5, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff7ed';
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.12, size * 0.2, size * 0.14, 0, Math.PI, 0);
        ctx.fill();
      } else if (type === 1) {
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(size * 0.42, 0);
        ctx.lineTo(0, size * 0.48);
        ctx.lineTo(-size * 0.42, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.32)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fee2e2';
      ctx.beginPath();
      ctx.arc(-size * 0.13, size * 0.04, size * 0.045, 0, Math.PI * 2);
      ctx.arc(size * 0.13, size * 0.04, size * 0.045, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawLaser(ctx, x, y) {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
      ctx.restore();
    },

    drawBurst(ctx, x, y, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.15, Math.sin(a) * size * 0.15);
        ctx.lineTo(Math.cos(a) * size * 0.55, Math.sin(a) * size * 0.55);
        ctx.stroke();
      }
      ctx.restore();
    },

    stop() {
      if (this._cleanupInput) {
        this._cleanupInput();
        this._cleanupInput = null;
      }
      this._enemyQuery = null;
      this._bulletQuery = null;
      this._lifespanQuery = null;
      this._renderQuery = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.SpaceShooter = SpaceShooter;
  window.SpaceShooter = SpaceShooter;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('spaceshooter', SpaceShooter);
})();
