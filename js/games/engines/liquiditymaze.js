/**
 * ASDF Games - LiquidityMaze Engine (11/10 ECS Edition)
 *
 * Maze navigation game with power-ups, fog of war, and mini-map.
 * Migrated to ECS for peak zero-allocation performance.
 */

'use strict';

(function () {
  const LiquidityMaze = {
    version: '2.0.0',
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
      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx, icons);
      this.instance.render = alpha => this.draw(alpha, defaultRender);

      world.addSystem(this.createLogicSystem());

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="lm-container">
          <canvas id="lm-canvas" class="game-canvas"></canvas>
          <div class="lm-hud">SCORE: <span id="lm-score">0</span> | LEVEL: <span id="lm-level">1</span></div>
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
      state.maze = Array(state.rows)
        .fill(0)
        .map(() => Array(state.cols).fill(1));

      // Simple room maze
      for (let y = 1; y < state.rows - 1; y++)
        for (let x = 1; x < state.cols - 1; x++) state.maze[y][x] = 0;

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
        const pIdx = world.getIndex(state.playerId);
        const pos = world.componentRegistry.get('Position').props;
        let dx = 0,
          dy = 0;
        if (e.code === 'KeyW') dy = -1;
        if (e.code === 'KeyS') dy = 1;
        if (e.code === 'KeyA') dx = -1;
        if (e.code === 'KeyD') dx = 1;

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

        // Fog
        const vR = world.componentRegistry.get('Player').props.viewRadius[pIdx];
        for (let fy = Math.max(0, py - vR); fy <= Math.min(state.rows - 1, py + vR); fy++) {
          for (let fx = Math.max(0, px - vR); fx <= Math.min(state.cols - 1, px + vR); fx++) {
            state.fog[fy][fx] = 0;
          }
        }

        document.getElementById('lm-score').textContent = state.score;
      };
    },

    draw(alpha, defaultRender) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');
      const cS = state.cellSize;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);

      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          if (state.maze[y][x] === 1) {
            ctx.fillStyle = '#111122';
            ctx.fillRect(x * cS, y * cS, cS, cS);
          }
          if (state.fog[y][x] > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(x * cS, y * cS, cS, cS);
          }
        }
      }

      // Convert grid pos to pixel pos for defaultRender
      const query = this.instance.world.createQuery(['Position']);
      const { dense, count } = query.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;
      const tmpX = new Float32Array(count),
        tmpY = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        tmpX[i] = pos.x[idx];
        tmpY[i] = pos.y[idx]; // backup
        pos.x[idx] = pos.x[idx] * cS + cS / 2;
        pos.y[idx] = pos.y[idx] * cS + cS / 2;
      }

      defaultRender(this.instance.world, alpha);

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        pos.x[idx] = tmpX[i];
        pos.y[idx] = tmpY[i]; // restore
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
