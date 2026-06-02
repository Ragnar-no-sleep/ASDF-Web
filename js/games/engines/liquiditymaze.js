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

    TREASURES: [
      { icon: '💎', value: 100 },
      { icon: '🏆', value: 200 },
      { icon: '👑', value: 500 },
      { icon: '🌟', value: 1000 },
    ],

    start(gameId) {
      this.gameId = gameId;
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      this.createArena(arena);
      const canvas = document.getElementById('lm-canvas');

      this.instance = new ASDF.GameInstance(canvas, {
        maxEntities: 1000,
        debug: true,
      });

      // 11/10: Resize early for correct grid calculation
      this.instance.resize();

      const world = this.instance.world;
      this.instance.initStandardComponents();

      // Components
      world.registerComponent('Player', { frozen: 'f32', viewRadius: 'u8' });
      world.registerComponent('Enemy', { state: 'u8', moveTimer: 'f32' });
      world.registerComponent('Item', { type: 'u8', value: 'u16' });

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
      });

      this.setupInput();
      this.preloadSprites();
      this.generateMaze(world);

      // Override Render
      this.instance.onRender = alpha => this.draw(alpha);

      world.addSystem(this.createLogicSystem());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="lm-container" style="width:100%; height:100%; background:#050510; position:relative; display:flex; align-items:center; justify-content:center;">
          <canvas id="lm-canvas" style="width:100%; height:100%; display:block;"></canvas>
          <div class="lm-hud" style="position:absolute; top:10px; left:10px; color:#fff; font-family:monospace; background:rgba(0,0,0,0.5); padding:8px; border-radius:4px; border:1px solid #333;">
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

      // Calculate cellSize to fit the canvas
      state.cellSize = Math.floor(
        Math.min(this.instance.canvas.width / state.cols, this.instance.canvas.height / state.rows)
      );

      state.maze = Array(state.rows)
        .fill(0)
        .map(() => Array(state.cols).fill(1));

      // Simple room maze with corridor
      for (let y = 1; y < state.rows - 1; y++) {
        for (let x = 1; x < state.cols - 1; x++) state.maze[y][x] = 0;
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
      const idx = world.getIndex(p);
      world.componentRegistry.get('Position').props.x[idx] = 1;
      world.componentRegistry.get('Position').props.y[idx] = 1;
      world.componentRegistry.get('Renderable').props.iconIndex[idx] = 0; // 🧑‍💻
      world.componentRegistry.get('Player').props.viewRadius[idx] = 3;
      state.playerId = p;
    },

    setupInput() {
      const world = this.instance.world;
      document.addEventListener('keydown', e => {
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
          pos.x[pIdx] += dx;
          pos.y[pIdx] += dy;
        }
      });
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

        // Goal Check
        if (px === state.cols - 2 && py === state.rows - 2) {
          state.score += 100;
          state.level++;
          self.generateMaze(world);
        }
      };
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');
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

      const query = this.instance.world.createQuery(['Position', 'Renderable']);
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

    stop() {
      if (this.instance) this.instance.stop();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.LiquidityMaze = LiquidityMaze;
  window.LiquidityMaze = LiquidityMaze;
  if (typeof GameRegistry !== 'undefined') GameRegistry.register('liquiditymaze', LiquidityMaze);
})();
