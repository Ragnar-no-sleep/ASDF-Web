/**
 * ASDF Games - LiquidityMaze Engine (11/10 ECS Edition)
 *
 * Maze navigation game with power-ups, fog of war, and mini-map.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const LiquidityMaze = {
    version: '2.1.0',
    gameId: 'liquiditymaze',
    instance: null,
    _cleanupInput: null,
    _positionQuery: null,

    TREASURES: [
      { icon: '💎', value: 100 },
      { icon: '🏆', value: 200 },
      { icon: '👑', value: 500 },
      { icon: '🌟', value: 1000 },
    ],

    start(gameId) {
      this.stop();

      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('lm-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: false,
      });

      // 11/10: Resize early for correct grid calculation
      this.instance.resize();

      const world = this.instance.world;
      const kernel = window.ASDF.Kernel;
      this.instance.initStandardComponents();

      // 11/10 Juice System
      if (window.ASDF?.GameJuice) {
        this.juice = window.ASDF.GameJuice.create(canvas, this.instance.ctx);
      }

      this._positionQuery = world.createQuery(['Position', 'Renderable']);

      // Configure Input Hub
      if (kernel.getPlugin('InputHub')) {
        const input = kernel.getPlugin('InputHub');
        input.mapAction('MOVE_UP', ['KeyW', 'ArrowUp']);
        input.mapAction('MOVE_DOWN', ['KeyS', 'ArrowDown']);
        input.mapAction('MOVE_LEFT', ['KeyA', 'ArrowLeft']);
        input.mapAction('MOVE_RIGHT', ['KeyD', 'ArrowRight']);
      }

      // Components
      world.registerComponent('Player', { frozen: 'f32', viewRadius: 'u8' });
      world.registerComponent('Enemy', { state: 'u8', moveTimer: 'f32' });
      world.registerComponent('Item', { type: 'u8', value: 'u16' });

      // Register Personality Components
      world.registerComponent('Rotation', { angle: 'f32' });
      world.registerComponent('Scale', { x: 'f32', y: 'f32' });

      world.setResource('GameState', {
        score: 0,
        level: 1,
        gameOver: false,
        maze: [],
        fog: [],
        visited: new Set(),
        cols: 15,
        rows: 11,
        cellSize: 34,
        playerId: -1,
        keys: {},
        entities: [],
      });

      this.setupInput();
      this.preloadSprites();
      this.generateMaze(world);

      // Update Loop
      this.instance.onUpdate = (dt, dtMs) => {
        const state = world.getResource('GameState');

        // Update Juice
        let shouldFreeze = false;
        if (this.juice) {
          shouldFreeze = this.juice.update(dt / 60, dtMs);
        }

        if (kernel.services?.hud) {
          kernel.services.hud.update(this.gameId, state);
          // Custom LM HUD
          const levelEl = document.getElementById('lm-level');
          if (levelEl) levelEl.textContent = state.level;
        }

        return shouldFreeze;
      };

      // Override Render
      this.instance.onRender = alpha => {
        if (this.juice) this.juice.renderPre();
        this.draw(alpha);
        if (this.juice) this.juice.renderPost();
      };

      world.addSystem(ASDF.PersonalitySystem.create());
      world.addSystem(this.createLogicSystem());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="lm-container">
          <canvas id="lm-canvas" class="lm-canvas"></canvas>
          <div class="lm-hud">
            SCORE: <span id="lm-score">0</span> | LEVEL: <span id="lm-level">1</span>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🧑‍💻', size: 24 },
        { emoji: '🌊', size: 24 },
        { emoji: '⚠️', size: 24 },
        { emoji: '👾', size: 24 },
        ...this.TREASURES.map(t => ({ emoji: t.icon, size: 24 })),
        { emoji: '🏁', size: 24 },
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    generateMaze(world) {
      const state = world.getResource('GameState');
      if (state.entities) {
        state.entities.forEach(id => world.destroyEntity(id));
      }
      state.entities = [];

      // Calculate cellSize to fit the canvas
      state.cellSize = Math.floor(
        Math.min(this.instance.canvas.width / state.cols, this.instance.canvas.height / state.rows)
      );

      state.maze = Array(state.rows)
        .fill(0)
        .map(() => Array(state.cols).fill(1));

      // Simple room maze with corridor
      for (let y = 1; y < state.rows - 1; y++) {
        for (let x = 1; x < state.cols - 1; x++) {
          const isMainRoute = x === 1 || y === state.rows - 2 || x === state.cols - 2;
          const isPoolWall =
            x % 4 === 0 && y > 2 && y < state.rows - 2 && (y + state.level) % 3 !== 0;
          const isFeeTrap =
            y % 4 === 0 && x > 2 && x < state.cols - 2 && (x + state.level) % 5 === 0;
          state.maze[y][x] = isMainRoute || (!isPoolWall && !isFeeTrap) ? 0 : 1;
        }
      }

      // Ensure spawn and goal are always clear
      state.maze[1][1] = 0;
      state.maze[state.rows - 2][state.cols - 2] = 0;

      state.fog = Array(state.rows)
        .fill(0)
        .map(() => Array(state.cols).fill(1));

      // Player
      const p = world.createEntity();
      world.addComponent(p, 'Position');
      world.addComponent(p, 'Renderable');
      world.addComponent(p, 'Player');
      world.addComponent(p, 'Rotation');
      world.addComponent(p, 'Scale');
      const idx = world.getIndex(p);
      world.componentRegistry.get('Position').props.x[idx] = 1;
      world.componentRegistry.get('Position').props.y[idx] = 1;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 0; // 🧑‍💻
      world.componentRegistry.get('Player').props.viewRadius[idx] = 3;
      state.playerId = p;
      state.entities.push(p);

      for (let i = 0; i < Math.min(4, this.TREASURES.length); i++) {
        const treasure = this.TREASURES[i];
        const e = world.createEntity();
        world.addComponent(e, 'Position');
        world.addComponent(e, 'Renderable');
        world.addComponent(e, 'Item');
        world.addComponent(e, 'Rotation');
        world.addComponent(e, 'Scale');

        const eIdx = world.getIndex(e);
        const tx = 2 + ((i * 3 + state.level) % (state.cols - 4));
        const ty = 2 + ((i * 2 + state.level) % (state.rows - 4));
        const gx = state.maze[ty][tx] === 0 ? tx : 2 + i;
        const gy = state.maze[ty][tx] === 0 ? ty : 2 + i;

        world.componentRegistry.get('Position').props.x[eIdx] = gx;
        world.componentRegistry.get('Position').props.y[eIdx] = gy;
        world.componentRegistry.get('Renderable').props.iconIndex[eIdx] = 7 + i;
        world.componentRegistry.get('Renderable').props.size[eIdx] = 24;
        world.componentRegistry.get('Item').props.type[eIdx] = i;
        world.componentRegistry.get('Item').props.value[eIdx] = treasure.value;
        state.entities.push(e);
      }
    },

    setupInput() {
      const world = this.instance.world;
      const onKeyDown = e => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        let dx = 0,
          dy = 0;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') dy = -1;
        else if (e.code === 'KeyS' || e.code === 'ArrowDown') dy = 1;
        else if (e.code === 'KeyA' || e.code === 'ArrowLeft') dx = -1;
        else if (e.code === 'KeyD' || e.code === 'ArrowRight') dx = 1;

        if (state.maze[pos.y[pIdx] + dy]?.[pos.x[pIdx] + dx] === 0) {
          if (e.cancelable) e.preventDefault();
          pos.x[pIdx] += dx;
          pos.y[pIdx] += dy;
        }
      };

      document.addEventListener('keydown', onKeyDown);
      this._cleanupInput = () => {
        document.removeEventListener('keydown', onKeyDown);
      };
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        const pIdx = world.getIndex(state.playerId);
        const px = world.componentRegistry.get('Position').props.x[pIdx];
        const py = world.componentRegistry.get('Position').props.y[pIdx];

        // Fog Reveal
        const vR = world.componentRegistry.get('Player').props.viewRadius[pIdx];
        for (let fy = Math.max(0, py - vR); fy <= Math.min(state.rows - 1, py + vR); fy++) {
          for (let fx = Math.max(0, px - vR); fx <= Math.min(state.cols - 1, px + vR); fx++) {
            state.fog[fy][fx] = 0;
          }
        }

        const scoreEl = document.getElementById('lm-score');
        if (scoreEl) scoreEl.textContent = state.score;

        const itemComp = world.componentRegistry.get('Item');
        const itemBit = itemComp ? itemComp.bit : 0;
        const entities =
          self._positionQuery ||
          (self._positionQuery = world.createQuery(['Position', 'Renderable']));
        const { dense, count } = entities.set;
        for (let i = count - 1; i >= 0; i--) {
          const idx = dense[i];
          if (idx === pIdx || !(world.entityMasks[idx] & itemBit)) continue;
          const ix = world.componentRegistry.get('Position').props.x[idx];
          const iy = world.componentRegistry.get('Position').props.y[idx];
          if (ix === px && iy === py) {
            const val = itemComp.props.value[idx];
            state.score += val;

            if (self.juice) {
              const cx = offsetX + ix * cS + cS / 2;
              const cy = offsetY + iy * cS + cS / 2;
              self.juice.impact(cx, cy, { intensity: 'light' });
              self.juice.textPop(cx, cy, `+${val}`, { color: '#fbbf24', size: 18 });
            }

            world.destroyEntity(world.getEntityId(idx));
          }
        }

        // Goal Check
        if (px === state.cols - 2 && py === state.rows - 2) {
          state.score += 100;
          state.level++;

          if (self.juice) {
            const cx = offsetX + px * cS + cS / 2;
            const cy = offsetY + py * cS + cS / 2;
            self.juice.impact(cx, cy, { intensity: 'medium' });
            self.juice.textPop(cx, cy, 'LEVEL UP', { color: '#22c55e', size: 28 });
          }

          self.generateMaze(world);
        }
      };
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');
      if (this.instance) {
        this.drawMazeScene(ctx, w, h, state);
        return;
      }
      const cS = state.cellSize;

      const offsetX = (w - state.cols * cS) / 2;
      const offsetY = (h - state.rows * cS) / 2;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#050510';
      ctx.fillRect(0, 0, w, h);

      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          const px = offsetX + x * cS,
            py = offsetY + y * cS;
          if (state.maze[y][x] === 1) {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(px, py, cS, cS);
          }
          if (state.fog[y][x] > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(px, py, cS, cS);
          }
        }
      }

      const query =
        this._positionQuery ||
        (this._positionQuery = this.instance.world.createQuery(['Position', 'Renderable']));
      const { dense, count } = query.set;
      const world = this.instance.world;
      const pos = world.componentRegistry.get('Position').props;
      const rend = world.componentRegistry.get('Renderable').props;

      const icons = [
        '🧑‍💻',
        '🌊',
        '⚠️',
        '🔑',
        '⚡',
        '👁️',
        '👾',
        ...this.TREASURES.map(t => t.icon),
        '🏁',
      ];

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const gx = pos.x[idx],
          gy = pos.y[idx];

        if (state.fog[gy | 0]?.[gx | 0] > 0.5 && world.getEntityId(idx) !== state.playerId) {
          continue;
        }

        const screenX = offsetX + gx * cS + cS / 2;
        const screenY = offsetY + gy * cS + cS / 2;
        const icon = icons[rend.iconIndex[idx]] || '❓';

        if (typeof SpriteCache !== 'undefined') {
          SpriteCache.draw(ctx, icon, screenX, screenY, rend.size[idx] || 24);
        }
      }

      // Draw goal always if revealed
      if (state.fog[state.rows - 2][state.cols - 2] === 0) {
        SpriteCache.draw(
          ctx,
          '🏁',
          offsetX + (state.cols - 2) * cS + cS / 2,
          offsetY + (state.rows - 2) * cS + cS / 2,
          24
        );
      }
    },

    drawMazeScene(ctx, w, h, state) {
      const cS = state.cellSize;
      const offsetX = (w - state.cols * cS) / 2;
      const offsetY = (h - state.rows * cS) / 2;

      const visuals = window.ASDF?.ArcadeVisuals || window.ArcadeVisuals;
      if (visuals) {
        visuals.drawBackdrop(ctx, w, h, {
          theme: 'default',
          seed: state.score || state.level || 0,
        });
      } else {
        ctx.fillStyle = '#12071f';
        ctx.fillRect(0, 0, w, h);
      }

      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          const px = offsetX + x * cS;
          const py = offsetY + y * cS;
          if (state.maze[y][x] === 1) this.drawMazeWall(ctx, px, py, cS);
          else this.drawMazeFloor(ctx, px, py, cS, state.fog[y][x] === 0);
        }
      }

      this.drawMazeEntities(ctx, state, offsetX, offsetY, cS);
      this.drawMazeGoal(ctx, state, offsetX, offsetY, cS);
      this.drawFog(ctx, state, offsetX, offsetY, cS);
    },

    drawMazeFloor(ctx, x, y, size, revealed) {
      ctx.fillStyle = revealed ? 'rgba(42, 16, 38, 0.88)' : 'rgba(19, 10, 31, 0.66)';
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
      if (revealed) {
        ctx.strokeStyle = 'rgba(248,250,252,0.06)';
        ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
      }
    },

    drawMazeWall(ctx, x, y, size) {
      ctx.fillStyle = '#3b120b';
      this.roundRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
      ctx.fill();
    },

    drawMazeEntities(ctx, state, offsetX, offsetY, cS) {
      const world = this.instance.world;
      const pos = world.componentRegistry.get('Position').props;
      const itemComp = world.componentRegistry.get('Item');
      const itemBit = itemComp ? itemComp.bit : 0;
      const query =
        this._positionQuery ||
        (this._positionQuery = world.createQuery(['Position', 'Renderable']));
      const { dense, count } = query.set;

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const gx = pos.x[idx];
        const gy = pos.y[idx];
        if (state.fog[gy | 0]?.[gx | 0] > 0.5 && world.getEntityId(idx) !== state.playerId) {
          continue;
        }
        const x = offsetX + gx * cS + cS / 2;
        const y = offsetY + gy * cS + cS / 2;
        if (world.getEntityId(idx) === state.playerId) {
          this.drawMazeRunner(ctx, x, y, cS);
        } else if (itemBit && (world.entityMasks[idx] & itemBit) === itemBit) {
          this.drawTreasure(ctx, x, y, itemComp.props.type[idx], cS);
        }
      }
    },

    drawMazeRunner(ctx, x, y, cS) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, cS * 0.24, cS * 0.22, cS * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6b35';
      this.roundRect(ctx, -cS * 0.14, -cS * 0.03, cS * 0.28, cS * 0.26, 6);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(0, -cS * 0.2, cS * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3b120b';
      this.roundRect(ctx, -cS * 0.1, -cS * 0.23, cS * 0.2, cS * 0.08, 4);
      ctx.fill();
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = Math.max(1.5, cS * 0.045);
      ctx.beginPath();
      ctx.moveTo(-cS * 0.08, cS * 0.08);
      ctx.lineTo(-cS * 0.18, cS * 0.21);
      ctx.moveTo(cS * 0.08, cS * 0.08);
      ctx.lineTo(cS * 0.18, cS * 0.21);
      ctx.stroke();
      ctx.restore();
    },

    drawTreasure(ctx, x, y, type, cS) {
      const colors = ['#ffcc00', '#ff6b35', '#ff2d95', '#f97316'];
      const color = colors[type % colors.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = color;
      if (type === 0) {
        ctx.beginPath();
        ctx.arc(0, 0, cS * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff2b3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, cS * 0.1, 0, Math.PI * 2);
        ctx.stroke();
      } else if (type === 1) {
        ctx.rotate(Math.PI / 4);
        this.roundRect(ctx, -cS * 0.15, -cS * 0.15, cS * 0.3, cS * 0.3, 4);
        ctx.fill();
        ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = '#fff7ed';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -cS * 0.11);
        ctx.lineTo(cS * 0.1, 0);
        ctx.lineTo(0, cS * 0.1);
        ctx.lineTo(-cS * 0.1, 0);
        ctx.closePath();
        ctx.stroke();
      } else if (type === 2) {
        ctx.beginPath();
        ctx.moveTo(-cS * 0.18, cS * 0.1);
        ctx.lineTo(-cS * 0.1, -cS * 0.16);
        ctx.lineTo(0, cS * 0.02);
        ctx.lineTo(cS * 0.1, -cS * 0.16);
        ctx.lineTo(cS * 0.18, cS * 0.1);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 5; i += 1) {
          const outer = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          const inner = outer + Math.PI / 5;
          const px = Math.cos(outer) * cS * 0.18;
          const py = Math.sin(outer) * cS * 0.18;
          const ix = Math.cos(inner) * cS * 0.08;
          const iy = Math.sin(inner) * cS * 0.08;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    drawMazeGoal(ctx, state, offsetX, offsetY, cS) {
      if (state.fog[state.rows - 2][state.cols - 2] !== 0) return;
      const x = offsetX + (state.cols - 2) * cS + cS / 2;
      const y = offsetY + (state.rows - 2) * cS + cS / 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, cS * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.moveTo(-cS * 0.1, cS * 0.12);
      ctx.lineTo(0, -cS * 0.16);
      ctx.lineTo(cS * 0.12, cS * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawFog(ctx, state, offsetX, offsetY, cS) {
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          if (state.fog[y][x] === 0) continue;
          ctx.fillStyle = 'rgba(9, 5, 16, 0.82)';
          ctx.fillRect(offsetX + x * cS, offsetY + y * cS, cS, cS);
        }
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
      this._positionQuery = null;
      if (this.instance) this.instance.stop();
      this.instance = null;
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.LiquidityMaze = LiquidityMaze;
  window.LiquidityMaze = LiquidityMaze;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('liquiditymaze', LiquidityMaze);
})();
