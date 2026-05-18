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

    AI_STATE: { PATROL: 0, ALERT: 1, CHASE: 2 },

    TREASURES: [
      { icon: '💎', value: 100, rarity: 0.4 },
      { icon: '🏆', value: 200, rarity: 0.3 },
      { icon: '👑', value: 500, rarity: 0.2 },
      { icon: '🌟', value: 1000, rarity: 0.1 },
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
      world.registerComponent('Player', { speed: 'f32', frozen: 'f32', viewRadius: 'u8' });
      world.registerComponent('Enemy', {
        state: 'u8',
        alert: 'f32',
        dir: 'u8',
        patrolDir: 'i8',
        patrolSteps: 'u8',
        moveTimer: 'f32',
        chaseSpeed: 'f32',
      });
      world.registerComponent('Item', { type: 'u8', value: 'u16', radius: 'u8' }); // 0:Pool, 1:Trap, 2:Key, 3:Boost, 4:Reveal, 5:Treasure
      world.registerComponent('Lifespan', { remaining: 'f32' });
      world.registerComponent('VisualEffect', { colorIndex: 'u8' });

      world.setResource('GameState', {
        score: 0,
        level: 1,
        gameOver: false,
        startTime: 0,
        timeLimit: 89,
        maze: [],
        fog: [],
        visited: new Set(),
        secretWalls: [],
        cols: 0,
        rows: 0,
        cellSize: 34,
        goal: { x: 0, y: 0, locked: true },
        hasKey: false,
        moveKeys: { up: false, down: false, left: false, right: false },
        frameCount: 0,
        showMiniMap: true,
        playerId: -1,
      });

      this.dom = {
        score: document.getElementById('lm-score'),
        level: document.getElementById('lm-level'),
        time: document.getElementById('lm-time'),
        keyIndicator: document.getElementById('lm-key-indicator'),
        minimapToggle: document.getElementById('lm-minimap-toggle'),
      };

      this.setupInput();
      this.preloadSprites();
      this.generateMaze(world);

      world.addSystem(this.createLogicSystem());

      const defaultRender = ASDF.RenderSystem.create(this.instance.ctx);
      this.instance.render = alpha => this.draw(alpha, defaultRender);

      this.instance.start();

      if (typeof activeGames !== 'undefined') {
        activeGames[gameId] = { cleanup: () => this.stop() };
      }
    },

    createArena(arena) {
      arena.innerHTML = `
        <div class="lm-container">
          <div class="lm-game-area">
            <canvas id="lm-canvas" class="game-canvas"></canvas>
            <div id="lm-key-indicator" class="lm-key-indicator"><span class="lm-key-text">🔑 KEY</span></div>
          </div>
          <div class="lm-sidebar">
            <div class="lm-stat"><span class="lm-stat-label">LIQUIDITY</span><div class="lm-stat-value--score" id="lm-score">0</div></div>
            <div class="lm-stat"><span class="lm-stat-label">LEVEL</span><div class="lm-stat-value--level" id="lm-level">1</div></div>
            <div class="lm-stat"><span class="lm-stat-label">TIME</span><div class="lm-stat-value--time" id="lm-time">1:30</div></div>
            <div class="lm-legend">🌊 +LP<br>⚠️ -LP<br>🔑 Key<br>⚡ Speed<br>👁️ Reveal<br>👾 Enemy<br>🏁 Exit<br>🔓 Secret</div>
            <button id="lm-minimap-toggle" class="lm-minimap-btn">MAP: ON</button>
          </div>
        </div>
      `;
    },

    preloadSprites() {
      const sprites = [
        { emoji: '🧑‍💻', size: 24 },
        { emoji: '🌊', size: 24 },
        { emoji: '⚠️', size: 24 },
        { emoji: '🔑', size: 24 },
        { emoji: '⚡', size: 24 },
        { emoji: '👁️', size: 24 },
        { emoji: '👾', size: 24 },
        { emoji: '😡', size: 12 },
        { emoji: '❓', size: 12 },
        { emoji: '🔒', size: 24 },
        { emoji: '🏁', size: 24 },
        ...this.TREASURES.map(t => ({ emoji: t.icon, size: 24 })),
      ];
      if (typeof SpriteCache !== 'undefined') SpriteCache.preload(sprites);
    },

    resizeCanvas(world) {
      if (!this.instance.canvas) return;
      const parent = this.instance.canvas.parentElement;
      this.instance.canvas.width = parent.clientWidth || 800;
      this.instance.canvas.height = parent.clientHeight || 600;

      const state = world.getResource('GameState');
      state.cellSize = Math.max(22, 38 - state.level * 2);

      const usableW = this.instance.canvas.width - 20;
      const usableH = this.instance.canvas.height - 20;

      state.cols = Math.floor(usableW / state.cellSize);
      state.rows = Math.floor(usableH / state.cellSize);
      if (state.cols % 2 === 0) state.cols--;
      if (state.rows % 2 === 0) state.rows--;
      state.cols = Math.max(11, Math.min(state.cols, 25));
      state.rows = Math.max(9, Math.min(state.rows, 17));
    },

    generateMaze(world) {
      this.resizeCanvas(world);
      const state = world.getResource('GameState');

      // Cleanup old entities
      const allEnts = world.createQuery(['Position']);
      const { dense, count } = allEnts.set;
      for (let i = count - 1; i >= 0; i--) {
        world.destroyEntity(world.getEntityId(dense[i]));
      }

      state.maze = Array(state.rows)
        .fill(0)
        .map(() => Array(state.cols).fill(1));

      const stack = [{ x: 1, y: 1 }];
      state.maze[1][1] = 0;

      while (stack.length > 0) {
        const curr = stack[stack.length - 1];
        const n = [];
        const dirs = [
          [0, -2],
          [2, 0],
          [0, 2],
          [-2, 0],
        ];
        for (const [dx, dy] of dirs) {
          const nx = curr.x + dx,
            ny = curr.y + dy;
          if (
            nx > 0 &&
            nx < state.cols - 1 &&
            ny > 0 &&
            ny < state.rows - 1 &&
            state.maze[ny][nx] === 1
          ) {
            n.push({ x: nx, y: ny, dx: dx / 2, dy: dy / 2 });
          }
        }
        if (n.length > 0) {
          const next = n[Math.floor(Math.random() * n.length)];
          state.maze[curr.y + next.dy][curr.x + next.dx] = 0;
          state.maze[next.y][next.x] = 0;
          stack.push(next);
        } else {
          stack.pop();
        }
      }

      for (let i = 0; i < Math.floor(state.level * 1.5); i++) {
        const x = 2 + Math.floor(Math.random() * (state.cols - 4));
        const y = 2 + Math.floor(Math.random() * (state.rows - 4));
        if (state.maze[y][x] === 1) {
          const adj = [
            state.maze[y - 1]?.[x],
            state.maze[y + 1]?.[x],
            state.maze[y]?.[x - 1],
            state.maze[y]?.[x + 1],
          ].filter(c => c === 0).length;
          if (adj >= 2) state.maze[y][x] = 0;
        }
      }

      state.fog = Array(state.rows)
        .fill(0)
        .map(() => Array(state.cols).fill(1));
      state.visited.clear();
      state.secretWalls = [];

      if (state.level >= 2) {
        for (let i = 0; i < Math.min(3, Math.floor(state.level / 2)); i++)
          this.createSecretRoom(world);
      }

      state.goal = { x: state.cols - 2, y: state.rows - 2, locked: state.level >= 3 };
      state.maze[state.goal.y][state.goal.x] = 0;
      state.hasKey = false;
      this.dom.keyIndicator.style.display = 'none';

      // Player
      const p = world.createEntity();
      world.addComponent(p, 'Position');
      world.addComponent(p, 'Renderable');
      world.addComponent(p, 'Player');
      const pIdx = world.getIndex(p);
      world.componentRegistry.get('Position').props.x[pIdx] = 1;
      world.componentRegistry.get('Position').props.y[pIdx] = 1;
      world.componentRegistry.get('Player').props.speed[pIdx] = 1;
      world.componentRegistry.get('Player').props.viewRadius[pIdx] = 3;
      world.componentRegistry.get('Renderable').props.iconIndex[pIdx] = 0; // 🧑‍💻
      state.playerId = p;

      const getEmpty = far => {
        for (let tries = 0; tries < 150; tries++) {
          const x = 1 + Math.floor(Math.random() * (state.cols - 2));
          const y = 1 + Math.floor(Math.random() * (state.rows - 2));
          if (
            state.maze[y][x] === 0 &&
            !(x === 1 && y === 1) &&
            !(x === state.goal.x && y === state.goal.y)
          ) {
            if (far && Math.abs(x - 1) + Math.abs(y - 1) < 6) continue;
            // Naive occupancy check
            const taken = world
              .createQuery(['Position'])
              .set.dense.some(
                idx =>
                  world.componentRegistry.get('Position').props.x[idx] === x &&
                  world.componentRegistry.get('Position').props.y[idx] === y
              );
            if (!taken) return { x, y };
          }
        }
        return null;
      };

      const spawnItem = (type, val, rad, iconIdx) => {
        const pos = getEmpty(false);
        if (pos) {
          const e = world.createEntity();
          world.addComponent(e, 'Position');
          world.addComponent(e, 'Renderable');
          world.addComponent(e, 'Item');
          const idx = world.getIndex(e);
          world.componentRegistry.get('Position').props.x[idx] = pos.x;
          world.componentRegistry.get('Position').props.y[idx] = pos.y;
          world.componentRegistry.get('Item').props.type[idx] = type;
          world.componentRegistry.get('Item').props.value[idx] = val;
          world.componentRegistry.get('Item').props.radius[idx] = rad;
          world.componentRegistry.get('Renderable').props.iconIndex[idx] = iconIdx;
        }
      };

      for (let i = 0; i < 4 + state.level; i++) spawnItem(0, 30 + state.level * 15, 0, 1); // Pool 🌊
      for (let i = 0; i < 3 + state.level; i++) spawnItem(1, 20 + state.level * 10, 0, 2); // Trap ⚠️
      if (state.level >= 3) spawnItem(2, 0, 0, 3); // Key 🔑
      for (let i = 0; i < 2; i++) spawnItem(3, 300, 0, 4); // Boost ⚡
      if (state.level >= 2) spawnItem(4, 0, 5, 5); // Reveal 👁️

      for (let i = 0; i < Math.floor(state.level / 2); i++) {
        const pos = getEmpty(true);
        if (pos) {
          const e = world.createEntity();
          world.addComponent(e, 'Position');
          world.addComponent(e, 'Renderable');
          world.addComponent(e, 'Enemy');
          const idx = world.getIndex(e);
          world.componentRegistry.get('Position').props.x[idx] = pos.x;
          world.componentRegistry.get('Position').props.y[idx] = pos.y;
          world.componentRegistry.get('Renderable').props.iconIndex[idx] = 6; // 👾
          const en = world.componentRegistry.get('Enemy').props;
          en.dir[idx] = Math.floor(Math.random() * 4);
          en.patrolDir[idx] = 1;
          en.chaseSpeed[idx] = 0.02 + state.level * 0.003;
          en.moveTimer[idx] = 0;
        }
      }

      state.startTime = Date.now();
      state.timeLimit = Math.max(45, 90 - state.level * 5);
    },

    createSecretRoom(world) {
      const state = world.getResource('GameState');
      for (let tries = 0; tries < 50; tries++) {
        const x = 3 + Math.floor(Math.random() * (state.cols - 6));
        const y = 3 + Math.floor(Math.random() * (state.rows - 6));
        if (state.maze[y][x] !== 1) continue;

        const adj = [
          state.maze[y - 1]?.[x],
          state.maze[y + 1]?.[x],
          state.maze[y]?.[x - 1],
          state.maze[y]?.[x + 1],
        ].filter(c => c === 0).length;
        if (adj !== 1) continue;

        const dirs = [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ];
        for (const [dx, dy] of dirs) {
          if (state.maze[y + dy][x + dx] === 1 && state.maze[y + dy * 2][x + dx * 2] === 1) {
            state.secretWalls.push({ x, y, revealed: false });
            state.maze[y + dy][x + dx] = 0;

            const rand = Math.random();
            let c = 0,
              tIdx = 0;
            for (let i = 0; i < this.TREASURES.length; i++) {
              c += this.TREASURES[i].rarity;
              if (rand <= c) {
                tIdx = i;
                break;
              }
            }
            const e = world.createEntity();
            world.addComponent(e, 'Position');
            world.addComponent(e, 'Renderable');
            world.addComponent(e, 'Item');
            const idx = world.getIndex(e);
            world.componentRegistry.get('Position').props.x[idx] = x + dx;
            world.componentRegistry.get('Position').props.y[idx] = y + dy;
            world.componentRegistry.get('Item').props.type[idx] = 5;
            world.componentRegistry.get('Item').props.value[idx] = this.TREASURES[tIdx].value;
            world.componentRegistry.get('Renderable').props.iconIndex[idx] = 11 + tIdx;
            return;
          }
        }
      }
    },

    setupInput() {
      const world = this.instance.world;
      const setKey = (e, val) => {
        const key = e.code;
        const state = world.getResource('GameState');
        if (key === 'ArrowUp' || key === 'KeyW') state.moveKeys.up = val;
        if (key === 'ArrowDown' || key === 'KeyS') state.moveKeys.down = val;
        if (key === 'ArrowLeft' || key === 'KeyA') state.moveKeys.left = val;
        if (key === 'ArrowRight' || key === 'KeyD') state.moveKeys.right = val;
      };

      let moveTimeout = null;
      document.addEventListener('keydown', e => {
        const state = world.getResource('GameState');
        if (state.gameOver) return;
        setKey(e, true);
        if (!moveTimeout) {
          moveTimeout = setTimeout(() => {
            state.moveKeys = { up: false, down: false, left: false, right: false };
            moveTimeout = null;
          }, 120);
        }
      });
      document.addEventListener('keyup', e => setKey(e, false));

      if (this.dom.minimapToggle) {
        this.dom.minimapToggle.addEventListener('click', () => {
          const state = world.getResource('GameState');
          state.showMiniMap = !state.showMiniMap;
          this.dom.minimapToggle.textContent = state.showMiniMap ? 'MAP: ON' : 'MAP: OFF';
        });
      }
    },

    createLogicSystem() {
      const self = this;
      return function (world, dt) {
        const state = world.getResource('GameState');
        if (state.gameOver) return;

        state.frameCount += dt;
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        const rem = state.timeLimit - elapsed;

        if (rem <= 0) {
          state.gameOver = true;
          setTimeout(() => endGame(self.gameId, state.score), 1000);
          return;
        }

        const pIdx = world.getIndex(state.playerId);
        const pPos = world.componentRegistry.get('Position').props;
        const pProps = world.componentRegistry.get('Player').props;
        const px = pPos.x[pIdx];
        const py = pPos.y[pIdx];

        if (pProps.frozen[pIdx] > 0) pProps.frozen[pIdx] -= dt;

        // Move Player
        if (pProps.frozen[pIdx] <= 0) {
          let dx = 0,
            dy = 0;
          if (state.moveKeys.up) dy = -1;
          if (state.moveKeys.down) dy = 1;
          if (state.moveKeys.left) dx = -1;
          if (state.moveKeys.right) dx = 1;

          if (dx !== 0 || dy !== 0) {
            const nx = px + dx,
              ny = py + dy;
            // Secret Walls
            const wIdx = state.secretWalls.findIndex(w => w.x === nx && w.y === ny && !w.revealed);
            if (wIdx !== -1) {
              state.secretWalls[wIdx].revealed = true;
              state.maze[ny][nx] = 0;
              state.score += 25;
            }

            if (
              nx >= 0 &&
              nx < state.cols &&
              ny >= 0 &&
              ny < state.rows &&
              state.maze[ny][nx] === 0
            ) {
              pPos.x[pIdx] = nx;
              pPos.y[pIdx] = ny;
              state.visited.add(`${nx},${ny}`);
            }
          }
        }

        const nx = pPos.x[pIdx],
          ny = pPos.y[pIdx];

        // Fog Update
        const vR = pProps.viewRadius[pIdx];
        for (let fy = Math.max(0, ny - vR - 2); fy <= Math.min(state.rows - 1, ny + vR + 2); fy++) {
          for (
            let fx = Math.max(0, nx - vR - 2);
            fx <= Math.min(state.cols - 1, nx + vR + 2);
            fx++
          ) {
            const dist = Math.hypot(fx - nx, fy - ny);
            if (dist <= vR) state.fog[fy][fx] = Math.max(0, state.fog[fy][fx] - 0.1 * dt);
            else if (dist <= vR + 2)
              state.fog[fy][fx] = Math.max((dist - vR) / 2, state.fog[fy][fx] - 0.05 * dt);
            if (state.visited.has(`${fx},${fy}`))
              state.fog[fy][fx] = Math.min(0.5, state.fog[fy][fx]);
          }
        }

        // Check Collisions
        const items = world.createQuery(['Item', 'Position']);
        if (items.set.count > 0) {
          const { dense, count } = items.set;
          const pos = world.componentRegistry.get('Position').props;
          const item = world.componentRegistry.get('Item').props;
          for (let i = count - 1; i >= 0; i--) {
            const idx = dense[i];
            if (pos.x[idx] === nx && pos.y[idx] === ny) {
              const type = item.type[idx];
              if (type === 0) {
                state.score += item.value[idx];
              } else if (type === 1) {
                state.score = Math.max(0, state.score - item.value[idx]);
                pProps.frozen[pIdx] = 30;
              } else if (type === 2) {
                state.hasKey = true;
                state.goal.locked = false;
              } else if (type === 3) {
                state.score += 25;
                pProps.speed[pIdx] = 2;
              } else if (type === 4) {
                const rad = item.radius[idx];
                for (let dy = -rad; dy <= rad; dy++) {
                  for (let dx = -rad; dx <= rad; dx++) {
                    const rry = ny + dy,
                      rrx = nx + dx;
                    if (rry >= 0 && rry < state.rows && rrx >= 0 && rrx < state.cols)
                      state.fog[rry][rrx] = 0;
                  }
                }
              } else if (type === 5) {
                state.score += item.value[idx];
              }
              world.destroyEntity(world.getEntityId(idx));
            }
          }
        }

        // Goal Check
        if (nx === state.goal.x && ny === state.goal.y && !state.goal.locked) {
          const timeBonus = Math.max(0, rem) * 3;
          state.score += timeBonus + state.level * 100;
          state.level++;
          self.generateMaze(world);
          return;
        }

        // Enemy AI
        const enemies = world.createQuery(['Enemy', 'Position']);
        if (enemies.set.count > 0) {
          const { dense, count } = enemies.set;
          const pos = world.componentRegistry.get('Position').props;
          const en = world.componentRegistry.get('Enemy').props;

          for (let i = 0; i < count; i++) {
            const idx = dense[i];
            const ex = pos.x[idx],
              ey = pos.y[idx];
            const dist = Math.abs(ex - nx) + Math.abs(ey - ny);

            if (dist <= 4 && pProps.frozen[pIdx] <= 0) {
              if (en.state[idx] === 0) {
                en.state[idx] = 1;
                en.alert[idx] = 60;
              } else if (en.state[idx] === 1) {
                en.alert[idx] -= dt;
                if (en.alert[idx] <= 0) en.state[idx] = 2;
              }
            } else if (en.state[idx] === 2 && dist > 6) {
              en.state[idx] = 0;
            }

            const speed = en.state[idx] === 2 ? en.chaseSpeed[idx] : 0.012 + state.level * 0.002;
            en.moveTimer[idx] += speed * dt;

            if (en.moveTimer[idx] >= 1) {
              en.moveTimer[idx] = 0;
              const dirs = [
                [0, -1],
                [1, 0],
                [0, 1],
                [-1, 0],
              ];

              if (en.state[idx] === 2) {
                const pdx = nx - ex,
                  pdy = ny - ey;
                const prefs =
                  Math.abs(pdx) > Math.abs(pdy)
                    ? [pdx > 0 ? 1 : 3, pdy > 0 ? 2 : 0]
                    : [pdy > 0 ? 2 : 0, pdx > 0 ? 1 : 3];
                let moved = false;
                for (const d of prefs) {
                  const nex = ex + dirs[d][0],
                    ney = ey + dirs[d][1];
                  if (
                    nex > 0 &&
                    nex < state.cols - 1 &&
                    ney > 0 &&
                    ney < state.rows - 1 &&
                    state.maze[ney][nex] === 0
                  ) {
                    pos.x[idx] = nex;
                    pos.y[idx] = ney;
                    en.dir[idx] = d;
                    moved = true;
                    break;
                  }
                }
                if (!moved) en.state[idx] = 0;
              } else {
                const nex = ex + dirs[en.dir[idx]][0],
                  ney = ey + dirs[en.dir[idx]][1];
                if (
                  nex > 0 &&
                  nex < state.cols - 1 &&
                  ney > 0 &&
                  ney < state.rows - 1 &&
                  state.maze[ney][nex] === 0
                ) {
                  pos.x[idx] = nex;
                  pos.y[idx] = ney;
                  en.patrolSteps[idx]++;
                  if (en.patrolSteps[idx] >= 3) {
                    en.patrolSteps[idx] = 0;
                    const nd =
                      en.patrolDir[idx] > 0 ? (en.dir[idx] + 1) % 4 : (en.dir[idx] + 3) % 4;
                    const tnx = ex + dirs[nd][0],
                      tny = ey + dirs[nd][1];
                    if (state.maze[tny][tnx] === 0) en.dir[idx] = nd;
                  }
                } else {
                  en.dir[idx] = (en.dir[idx] + 2) % 4;
                  en.patrolDir[idx] *= -1;
                  en.patrolSteps[idx] = 0;
                }
              }
            }

            if (pos.x[idx] === nx && pos.y[idx] === ny) {
              state.score = Math.max(0, state.score - (en.state[idx] === 2 ? 50 : 30));
              pProps.frozen[pIdx] = 48; // ~800ms
              en.state[idx] = 0;
            }
          }
        }

        // UI
        if (self.dom.score) self.dom.score.textContent = state.score;
        if (self.dom.level) self.dom.level.textContent = state.level;
        if (self.dom.time) {
          const m = Math.floor(Math.max(0, rem) / 60);
          const s = Math.max(0, rem) % 60;
          self.dom.time.textContent = `${m}:${s.toString().padStart(2, '0')}`;
          self.dom.time.style.color = rem <= 15 ? '#ef4444' : '';
        }
        if (self.dom.keyIndicator)
          self.dom.keyIndicator.style.display = state.hasKey ? 'block' : 'none';
      };
    },

    draw(alpha) {
      const ctx = this.instance.ctx;
      const w = this.instance.canvas.width,
        h = this.instance.canvas.height;
      const state = this.instance.world.getResource('GameState');

      ctx.clearRect(0, 0, w, h);
      const oX = (w - state.cols * state.cellSize) / 2;
      const oY = (h - state.rows * state.cellSize) / 2;
      const cS = state.cellSize;

      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          const fog = state.fog[y]?.[x] ?? 1;
          const px = oX + x * cS,
            py = oY + y * cS;

          if (state.maze[y][x] === 1) {
            const b = Math.floor(26 + (1 - fog) * 50);
            ctx.fillStyle = `rgb(${b},${b},${Math.floor(b * 1.5)})`;
          } else {
            const a = 1 - fog * 0.7;
            ctx.fillStyle = state.visited.has(`${x},${y}`)
              ? `rgba(59,130,246,${0.15 * a})`
              : `rgba(30,30,60,${a})`;
          }
          ctx.fillRect(px, py, cS, cS);
        }
      }

      state.secretWalls
        .filter(w => !w.revealed)
        .forEach(wall => {
          const pIdx = this.instance.world.getIndex(state.playerId);
          const pPos = this.instance.world.componentRegistry.get('Position').props;
          const d = Math.hypot(wall.x - pPos.x[pIdx], wall.y - pPos.y[pIdx]);
          if (d <= 2) {
            const p = 0.3 + Math.sin(state.frameCount * 0.1) * 0.15;
            ctx.fillStyle = `rgba(168,85,247,${p})`;
            ctx.fillRect(oX + wall.x * cS, oY + wall.y * cS, cS, cS);
          }
        });

      const ents = this.instance.world.createQuery(['Position', 'Renderable']);
      const { dense, count } = ents.set;
      const pos = this.instance.world.componentRegistry.get('Position').props;
      const rend = this.instance.world.componentRegistry.get('Renderable').props;
      const sS = Math.floor(cS * 0.7);

      for (let i = 0; i < count; i++) {
        const idx = dense[i];
        const ex = pos.x[idx],
          ey = pos.y[idx];
        const fog = state.fog[ey]?.[ex] ?? 1;
        if (fog > 0.7 && idx !== state.playerId) continue;

        const rIdx = rend.iconIndex[idx];
        let icon = '❓';
        if (idx === state.playerId) {
          icon = '🧑‍💻';
        } else if (rIdx === 1) {
          icon = '🌊';
        } else if (rIdx === 2) {
          icon = '⚠️';
        } else if (rIdx === 3) {
          icon = '🔑';
        } else if (rIdx === 4) {
          icon = '⚡';
        } else if (rIdx === 5) {
          icon = '👁️';
        } else if (rIdx === 6) {
          icon = '👾';
          const en = this.instance.world.componentRegistry.get('Enemy').props;
          if (en.state[idx] === 2) {
            ctx.fillStyle = `rgba(239,68,68,${0.5 + Math.sin(state.frameCount * 0.3) * 0.3})`;
            ctx.beginPath();
            ctx.arc(oX + ex * cS + cS / 2, oY + ey * cS + cS / 2, cS * 0.9, 0, Math.PI * 2);
            ctx.fill();
            SpriteCache.draw(ctx, '😡', oX + ex * cS + cS / 2, oY + ey * cS - cS * 0.1, 12);
          } else if (en.state[idx] === 1) {
            ctx.fillStyle = `rgba(251,191,36,${0.3 + Math.sin(state.frameCount * 0.2) * 0.2})`;
            ctx.beginPath();
            ctx.arc(oX + ex * cS + cS / 2, oY + ey * cS + cS / 2, cS * 0.7, 0, Math.PI * 2);
            ctx.fill();
            SpriteCache.draw(ctx, '❓', oX + ex * cS + cS / 2, oY + ey * cS - cS * 0.1, 12);
          }
        } else if (rIdx >= 11) {
          icon = this.TREASURES[rIdx - 11].icon;
        }

        const pX = oX + ex * cS + cS / 2,
          pY = oY + ey * cS + cS / 2;
        let alpha = 1;
        if (
          idx === state.playerId &&
          this.instance.world.componentRegistry.get('Player').props.frozen[idx] > 0
        )
          alpha = 0.5;

        if (rIdx >= 11) {
          SpriteCache.draw(ctx, icon, pX, pY + Math.sin(state.frameCount * 0.1 + ex) * 3, sS);
        } else {
          SpriteCache.drawTransformed(ctx, icon, pX, pY, sS, { alpha });
        }
      }

      const gFog = state.fog[state.goal.y]?.[state.goal.x] ?? 1;
      if (gFog < 0.7) {
        SpriteCache.draw(
          ctx,
          state.goal.locked ? '🔒' : '🏁',
          oX + state.goal.x * cS + cS / 2,
          oY + state.goal.y * cS + cS / 2,
          sS
        );
      }

      if (state.showMiniMap) {
        const mS = 80,
          mP = 10;
        const mcS = Math.floor(mS / Math.max(state.cols, state.rows));
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(mP - 2, mP - 2, mcS * state.cols + 4, mcS * state.rows + 4);
        ctx.strokeStyle = '#555';
        ctx.strokeRect(mP - 2, mP - 2, mcS * state.cols + 4, mcS * state.rows + 4);

        for (let y = 0; y < state.rows; y++) {
          for (let x = 0; x < state.cols; x++) {
            const v = state.visited.has(`${x},${y}`),
              f = state.fog[y]?.[x] ?? 1;
            if (f < 0.8 || v) {
              ctx.fillStyle = state.maze[y][x] === 1 ? '#333' : v ? '#3b82f6' : '#1a1a2e';
              ctx.fillRect(mP + x * mcS, mP + y * mcS, mcS, mcS);
            }
          }
        }
        const pIdx = this.instance.world.getIndex(state.playerId);
        const pPos = this.instance.world.componentRegistry.get('Position').props;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(mP + pPos.x[pIdx] * mcS, mP + pPos.y[pIdx] * mcS, mcS, mcS);
        if (gFog < 0.7) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(mP + state.goal.x * mcS, mP + state.goal.y * mcS, mcS, mcS);
        }
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
