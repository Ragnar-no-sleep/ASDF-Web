/**
 * ASDF Games - LiquidityMaze Engine
 *
 * Maze navigation game with power-ups
 * Find the exit, collect liquidity pools, avoid traps
 * Progressive difficulty with larger mazes
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const LiquidityMaze = {
    gameId: 'liquiditymaze',
    canvas: null,
    ctx: null,
    state: null,
    moveTimeout: null,

    /**
     * Start the game
     */
    start(gameId) {
        this.gameId = gameId;
        const arena = document.getElementById(`arena-${gameId}`);
        if (!arena) return;

        this.state = {
            score: 0,
            level: 1,
            gameOver: false,
            player: { x: 0, y: 0, speed: 1, hasKey: false, frozen: false },
            goal: { x: 0, y: 0, locked: true },
            maze: [],
            cellSize: 30,
            cols: 0,
            rows: 0,
            liquidityPools: [],
            feeTraps: [],
            keys: [],
            speedBoosts: [],
            reveals: [],
            enemies: [],
            visited: new Set(),
            revealed: new Set(),
            startTime: 0,
            timeLimit: 90,
            moveKeys: { up: false, down: false, left: false, right: false },
            effects: [],
        };

        this.createArena(arena);
        this.canvas = document.getElementById('lm-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.setupInput();
        this.generateMaze();
        this.gameLoop();

        if (typeof activeGames !== 'undefined') {
            activeGames[gameId] = {
                cleanup: () => this.stop()
            };
        }
    },

    /**
     * Create arena HTML
     */
    createArena(arena) {
        arena.innerHTML = `
            <div style="width:100%;height:100%;display:flex;overflow:hidden;background:linear-gradient(180deg,#0a1628 0%,#1a2744 100%);">
                <!-- Game Area -->
                <div style="flex:1;position:relative;overflow:hidden;">
                    <canvas id="lm-canvas" style="width:100%;height:100%;"></canvas>
                    <div id="lm-key-indicator" style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.7);padding:6px 12px;border-radius:8px;display:none;">
                        <span style="color:var(--green);font-size:14px;">&#128273; KEY</span>
                    </div>
                </div>
                <!-- Stats Sidebar -->
                <div style="width:100px;background:rgba(0,0,0,0.6);padding:15px 10px;display:flex;flex-direction:column;gap:15px;border-left:2px solid #333;">
                    <div style="text-align:center;">
                        <span style="color:var(--text-muted);font-size:10px;">LIQUIDITY</span>
                        <div style="color:var(--gold);font-size:18px;font-weight:bold;" id="lm-score">0</div>
                    </div>
                    <div style="text-align:center;">
                        <span style="color:var(--text-muted);font-size:10px;">LEVEL</span>
                        <div style="color:var(--purple);font-size:18px;font-weight:bold;" id="lm-level">1</div>
                    </div>
                    <div style="text-align:center;">
                        <span style="color:var(--text-muted);font-size:10px;">TIME</span>
                        <div style="color:var(--accent-fire);font-size:18px;font-weight:bold;" id="lm-time">1:30</div>
                    </div>
                    <div style="margin-top:auto;font-size:9px;color:var(--text-muted);text-align:center;line-height:1.6;">
                        &#127754; +LP<br>
                        &#9888; -LP<br>
                        &#128273; Key<br>
                        &#9889; Speed<br>
                        &#128065; Reveal<br>
                        &#128126; Enemy<br>
                        &#127937; Exit
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Resize canvas and calculate maze dimensions
     */
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        this.state.cellSize = Math.max(22, 38 - this.state.level * 2);

        const marginX = 10;
        const marginY = 10;
        const usableWidth = this.canvas.width - marginX * 2;
        const usableHeight = this.canvas.height - marginY * 2;

        this.state.cols = Math.floor(usableWidth / this.state.cellSize);
        this.state.rows = Math.floor(usableHeight / this.state.cellSize);

        if (this.state.cols % 2 === 0) this.state.cols--;
        if (this.state.rows % 2 === 0) this.state.rows--;

        this.state.cols = Math.max(11, Math.min(this.state.cols, 25));
        this.state.rows = Math.max(9, Math.min(this.state.rows, 17));
    },

    /**
     * Generate maze using recursive backtracking
     */
    generateMaze() {
        this.resizeCanvas();
        this.state.maze = [];

        for (let y = 0; y < this.state.rows; y++) {
            this.state.maze[y] = [];
            for (let x = 0; x < this.state.cols; x++) {
                this.state.maze[y][x] = 1;
            }
        }

        const stack = [];
        const startX = 1, startY = 1;
        this.state.maze[startY][startX] = 0;
        stack.push({ x: startX, y: startY });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];

            const directions = [
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: 0, dy: 2 },
                { dx: -2, dy: 0 },
            ];

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                if (nx > 0 && nx < this.state.cols - 1 && ny > 0 && ny < this.state.rows - 1 && this.state.maze[ny][nx] === 1) {
                    neighbors.push({ x: nx, y: ny, dx: dir.dx / 2, dy: dir.dy / 2 });
                }
            }

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                this.state.maze[current.y + next.dy][current.x + next.dx] = 0;
                this.state.maze[next.y][next.x] = 0;
                stack.push({ x: next.x, y: next.y });
            } else {
                stack.pop();
            }
        }

        // Add extra paths for higher levels
        const extraPaths = Math.floor(this.state.level * 1.5);
        for (let i = 0; i < extraPaths; i++) {
            const x = 2 + Math.floor(Math.random() * (this.state.cols - 4));
            const y = 2 + Math.floor(Math.random() * (this.state.rows - 4));
            if (this.state.maze[y][x] === 1) {
                const adjacent = [
                    this.state.maze[y - 1]?.[x] === 0,
                    this.state.maze[y + 1]?.[x] === 0,
                    this.state.maze[y]?.[x - 1] === 0,
                    this.state.maze[y]?.[x + 1] === 0,
                ].filter(Boolean).length;
                if (adjacent >= 2) this.state.maze[y][x] = 0;
            }
        }

        // Player and goal
        this.state.player = { x: 1, y: 1, speed: 1, hasKey: false, frozen: false };
        this.state.goal = { x: this.state.cols - 2, y: this.state.rows - 2, locked: this.state.level >= 3 };
        this.state.maze[this.state.goal.y][this.state.goal.x] = 0;

        // Clear items
        this.state.liquidityPools = [];
        this.state.feeTraps = [];
        this.state.keys = [];
        this.state.speedBoosts = [];
        this.state.reveals = [];
        this.state.enemies = [];
        this.state.visited = new Set();
        this.state.revealed = new Set();
        this.state.effects = [];

        // Spawn items
        const poolCount = 4 + this.state.level;
        const trapCount = 3 + this.state.level;
        const enemyCount = Math.floor(this.state.level / 2);

        for (let i = 0; i < poolCount; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) this.state.liquidityPools.push({ ...pos, value: 30 + this.state.level * 15 });
        }

        for (let i = 0; i < trapCount; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) this.state.feeTraps.push({ ...pos, penalty: 20 + this.state.level * 10 });
        }

        if (this.state.level >= 3) {
            const keyPos = this.getRandomEmptyCell();
            if (keyPos) this.state.keys.push(keyPos);
            document.getElementById('lm-key-indicator').style.display = 'none';
        }

        for (let i = 0; i < 2; i++) {
            const pos = this.getRandomEmptyCell();
            if (pos) this.state.speedBoosts.push({ ...pos, duration: 300 });
        }

        if (this.state.level >= 2) {
            const pos = this.getRandomEmptyCell();
            if (pos) this.state.reveals.push({ ...pos, radius: 5 });
        }

        for (let i = 0; i < enemyCount; i++) {
            const pos = this.getRandomEmptyCellFarFromPlayer(6);
            if (pos) {
                this.state.enemies.push({
                    ...pos,
                    dir: Math.floor(Math.random() * 4),
                    speed: 0.012 + this.state.level * 0.002,
                    moveTimer: 0,
                    patrolDir: 1,
                    patrolSteps: 0,
                });
            }
        }

        this.state.startTime = Date.now();
        this.state.timeLimit = Math.max(45, 90 - this.state.level * 5);
    },

    /**
     * Get random empty cell
     */
    getRandomEmptyCell() {
        for (let tries = 0; tries < 100; tries++) {
            const x = 1 + Math.floor(Math.random() * (this.state.cols - 2));
            const y = 1 + Math.floor(Math.random() * (this.state.rows - 2));
            if (
                this.state.maze[y][x] === 0 &&
                !(x === this.state.player.x && y === this.state.player.y) &&
                !(x === this.state.goal.x && y === this.state.goal.y) &&
                !this.state.liquidityPools.some(p => p.x === x && p.y === y) &&
                !this.state.feeTraps.some(t => t.x === x && t.y === y) &&
                !this.state.keys.some(k => k.x === x && k.y === y) &&
                !this.state.speedBoosts.some(s => s.x === x && s.y === y) &&
                !this.state.reveals.some(r => r.x === x && r.y === y) &&
                !this.state.enemies.some(e => Math.floor(e.x) === x && Math.floor(e.y) === y)
            ) {
                return { x, y };
            }
        }
        return null;
    },

    /**
     * Get random empty cell far from player
     */
    getRandomEmptyCellFarFromPlayer(minDistance) {
        for (let tries = 0; tries < 150; tries++) {
            const x = 1 + Math.floor(Math.random() * (this.state.cols - 2));
            const y = 1 + Math.floor(Math.random() * (this.state.rows - 2));
            const distFromPlayer = Math.abs(x - this.state.player.x) + Math.abs(y - this.state.player.y);
            if (
                this.state.maze[y][x] === 0 &&
                distFromPlayer >= minDistance &&
                !(x === this.state.goal.x && y === this.state.goal.y) &&
                !this.state.liquidityPools.some(p => p.x === x && p.y === y) &&
                !this.state.feeTraps.some(t => t.x === x && t.y === y) &&
                !this.state.keys.some(k => k.x === x && k.y === y) &&
                !this.state.enemies.some(e => Math.floor(e.x) === x && Math.floor(e.y) === y)
            ) {
                return { x, y };
            }
        }
        return this.getRandomEmptyCell();
    },

    /**
     * Add effect
     */
    addEffect(x, y, text, color) {
        this.state.effects.push({ x, y, text, color, life: 40, vy: -1 });
    },

    /**
     * Check collisions
     */
    checkCollisions(x, y) {
        const scoreEl = document.getElementById('lm-score');
        const levelEl = document.getElementById('lm-level');
        const keyIndicator = document.getElementById('lm-key-indicator');

        // Liquidity pools
        const poolIdx = this.state.liquidityPools.findIndex(p => p.x === x && p.y === y);
        if (poolIdx !== -1) {
            const pool = this.state.liquidityPools.splice(poolIdx, 1)[0];
            this.state.score += pool.value;
            scoreEl.textContent = this.state.score;
            this.addEffect(x, y, '+' + pool.value, '#22c55e');
            recordScoreUpdate(this.gameId, this.state.score, pool.value);
        }

        // Fee traps
        const trapIdx = this.state.feeTraps.findIndex(t => t.x === x && t.y === y);
        if (trapIdx !== -1) {
            const trap = this.state.feeTraps.splice(trapIdx, 1)[0];
            this.state.score = Math.max(0, this.state.score - trap.penalty);
            scoreEl.textContent = this.state.score;
            this.addEffect(x, y, '-' + trap.penalty, '#ef4444');
            this.state.player.frozen = true;
            setTimeout(() => {
                this.state.player.frozen = false;
            }, 500);
        }

        // Keys
        const keyIdx = this.state.keys.findIndex(k => k.x === x && k.y === y);
        if (keyIdx !== -1) {
            this.state.keys.splice(keyIdx, 1);
            this.state.player.hasKey = true;
            this.state.goal.locked = false;
            keyIndicator.style.display = 'block';
            this.addEffect(x, y, 'KEY!', '#fbbf24');
        }

        // Speed boosts
        const speedIdx = this.state.speedBoosts.findIndex(s => s.x === x && s.y === y);
        if (speedIdx !== -1) {
            this.state.speedBoosts.splice(speedIdx, 1);
            this.state.score += 25;
            scoreEl.textContent = this.state.score;
            this.addEffect(x, y, 'SPEED!', '#3b82f6');
        }

        // Reveals
        const revealIdx = this.state.reveals.findIndex(r => r.x === x && r.y === y);
        if (revealIdx !== -1) {
            const reveal = this.state.reveals.splice(revealIdx, 1)[0];
            for (let dy = -reveal.radius; dy <= reveal.radius; dy++) {
                for (let dx = -reveal.radius; dx <= reveal.radius; dx++) {
                    this.state.revealed.add(`${x + dx},${y + dy}`);
                }
            }
            this.addEffect(x, y, 'REVEALED!', '#a855f7');
        }

        // Goal
        if (x === this.state.goal.x && y === this.state.goal.y) {
            if (this.state.goal.locked) {
                this.addEffect(x, y, 'NEED KEY!', '#fbbf24');
            } else {
                const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
                const timeBonus = Math.max(0, this.state.timeLimit - elapsed) * 3;
                const levelBonus = this.state.level * 100;
                const poolBonus = this.state.liquidityPools.length === 0 ? 200 : 0;
                const totalBonus = timeBonus + levelBonus + poolBonus;

                this.state.score += totalBonus;
                scoreEl.textContent = this.state.score;
                updateScore(this.gameId, this.state.score);
                recordScoreUpdate(this.gameId, this.state.score, totalBonus);

                this.state.level++;
                levelEl.textContent = this.state.level;
                this.generateMaze();
            }
        }
    },

    /**
     * Update game state
     */
    update() {
        if (this.state.gameOver) return;

        const timeEl = document.getElementById('lm-time');
        const scoreEl = document.getElementById('lm-score');

        // Update time
        const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
        const remaining = this.state.timeLimit - elapsed;
        const mins = Math.floor(Math.max(0, remaining) / 60);
        const secs = Math.max(0, remaining) % 60;
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        timeEl.style.color = remaining <= 15 ? '#ef4444' : '';

        if (remaining <= 0) {
            this.state.gameOver = true;
            this.addEffect(this.state.player.x, this.state.player.y, 'TIME UP!', '#ef4444');
            setTimeout(() => endGame(this.gameId, this.state.score), 1000);
            return;
        }

        // Movement
        if (!this.state.player.frozen) {
            let dx = 0, dy = 0;
            if (this.state.moveKeys.up) dy = -1;
            if (this.state.moveKeys.down) dy = 1;
            if (this.state.moveKeys.left) dx = -1;
            if (this.state.moveKeys.right) dx = 1;

            if (dx !== 0 || dy !== 0) {
                const newX = this.state.player.x + dx;
                const newY = this.state.player.y + dy;

                if (newX >= 0 && newX < this.state.cols && newY >= 0 && newY < this.state.rows && this.state.maze[newY][newX] === 0) {
                    this.state.player.x = newX;
                    this.state.player.y = newY;
                    this.state.visited.add(`${newX},${newY}`);
                    this.checkCollisions(newX, newY);
                }
            }
        }

        // Update enemies
        const self = this;
        this.state.enemies.forEach(enemy => {
            enemy.moveTimer += enemy.speed;
            if (enemy.moveTimer >= 1) {
                enemy.moveTimer = 0;
                const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                const [edx, edy] = dirs[enemy.dir];
                const nx = Math.floor(enemy.x) + edx;
                const ny = Math.floor(enemy.y) + edy;

                if (nx > 0 && nx < self.state.cols - 1 && ny > 0 && ny < self.state.rows - 1 && self.state.maze[ny][nx] === 0) {
                    enemy.x = nx;
                    enemy.y = ny;
                    enemy.patrolSteps++;
                    if (enemy.patrolSteps >= 3 + Math.floor(Math.random() * 3)) {
                        enemy.patrolSteps = 0;
                        const turnDir = enemy.patrolDir > 0 ? (enemy.dir + 1) % 4 : (enemy.dir + 3) % 4;
                        const [tdx, tdy] = dirs[turnDir];
                        const tnx = Math.floor(enemy.x) + tdx;
                        const tny = Math.floor(enemy.y) + tdy;
                        if (tnx > 0 && tnx < self.state.cols - 1 && tny > 0 && tny < self.state.rows - 1 && self.state.maze[tny][tnx] === 0) {
                            enemy.dir = turnDir;
                        }
                    }
                } else {
                    enemy.dir = (enemy.dir + 2) % 4;
                    enemy.patrolDir *= -1;
                    enemy.patrolSteps = 0;
                }

                if (Math.floor(enemy.x) === self.state.player.x && Math.floor(enemy.y) === self.state.player.y) {
                    self.state.score = Math.max(0, self.state.score - 30);
                    scoreEl.textContent = self.state.score;
                    self.addEffect(self.state.player.x, self.state.player.y, '-30', '#ef4444');
                    self.state.player.frozen = true;
                    setTimeout(() => {
                        self.state.player.frozen = false;
                    }, 800);
                }
            }
        });

        // Update effects
        this.state.effects = this.state.effects.filter(e => {
            e.y += e.vy;
            e.life--;
            return e.life > 0;
        });
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const offsetX = (this.canvas.width - this.state.cols * this.state.cellSize) / 2;
        const offsetY = (this.canvas.height - this.state.rows * this.state.cellSize) / 2;

        // Draw maze
        for (let y = 0; y < this.state.rows; y++) {
            for (let x = 0; x < this.state.cols; x++) {
                const px = offsetX + x * this.state.cellSize;
                const py = offsetY + y * this.state.cellSize;
                const key = `${x},${y}`;
                const isVisible = this.state.visited.has(key) || this.state.revealed.has(key) || (Math.abs(x - this.state.player.x) <= 3 && Math.abs(y - this.state.player.y) <= 3);

                if (this.state.maze[y][x] === 1) {
                    ctx.fillStyle = isVisible ? '#1a1a4e' : '#0a0a1e';
                    ctx.fillRect(px, py, this.state.cellSize, this.state.cellSize);
                } else {
                    ctx.fillStyle = this.state.visited.has(key) ? 'rgba(59,130,246,0.15)' : isVisible ? 'rgba(30,30,60,0.8)' : 'rgba(10,10,30,0.9)';
                    ctx.fillRect(px, py, this.state.cellSize, this.state.cellSize);
                }
            }
        }

        ctx.font = `${this.state.cellSize * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const isVisible = item => {
            return this.state.visited.has(`${item.x},${item.y}`) || this.state.revealed.has(`${item.x},${item.y}`) || (Math.abs(item.x - this.state.player.x) <= 3 && Math.abs(item.y - this.state.player.y) <= 3);
        };

        // Draw items
        this.state.liquidityPools.filter(isVisible).forEach(pool => {
            const px = offsetX + pool.x * this.state.cellSize + this.state.cellSize / 2;
            const py = offsetY + pool.y * this.state.cellSize + this.state.cellSize / 2;
            ctx.fillText('🌊', px, py);
        });

        this.state.feeTraps.filter(isVisible).forEach(trap => {
            const px = offsetX + trap.x * this.state.cellSize + this.state.cellSize / 2;
            const py = offsetY + trap.y * this.state.cellSize + this.state.cellSize / 2;
            ctx.fillText('⚠️', px, py);
        });

        this.state.keys.filter(isVisible).forEach(key => {
            const px = offsetX + key.x * this.state.cellSize + this.state.cellSize / 2;
            const py = offsetY + key.y * this.state.cellSize + this.state.cellSize / 2;
            ctx.fillText('🔑', px, py);
        });

        this.state.speedBoosts.filter(isVisible).forEach(boost => {
            const px = offsetX + boost.x * this.state.cellSize + this.state.cellSize / 2;
            const py = offsetY + boost.y * this.state.cellSize + this.state.cellSize / 2;
            ctx.fillText('⚡', px, py);
        });

        this.state.reveals.filter(isVisible).forEach(reveal => {
            const px = offsetX + reveal.x * this.state.cellSize + this.state.cellSize / 2;
            const py = offsetY + reveal.y * this.state.cellSize + this.state.cellSize / 2;
            ctx.fillText('👁️', px, py);
        });

        // Draw enemies
        this.state.enemies.forEach(enemy => {
            const px = offsetX + enemy.x * this.state.cellSize + this.state.cellSize / 2;
            const py = offsetY + enemy.y * this.state.cellSize + this.state.cellSize / 2;
            const distToPlayer = Math.abs(Math.floor(enemy.x) - this.state.player.x) + Math.abs(Math.floor(enemy.y) - this.state.player.y);

            if (distToPlayer <= 3) {
                const pulse = 0.3 + Math.sin(Date.now() / 150) * 0.2;
                ctx.beginPath();
                ctx.arc(px, py, this.state.cellSize * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
                ctx.fill();
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillText('👾', px, py);
        });

        // Draw goal
        const gx = offsetX + this.state.goal.x * this.state.cellSize + this.state.cellSize / 2;
        const gy = offsetY + this.state.goal.y * this.state.cellSize + this.state.cellSize / 2;
        ctx.fillText(this.state.goal.locked ? '🔒' : '🏁', gx, gy);

        // Draw player
        const ppx = offsetX + this.state.player.x * this.state.cellSize + this.state.cellSize / 2;
        const ppy = offsetY + this.state.player.y * this.state.cellSize + this.state.cellSize / 2;
        ctx.globalAlpha = this.state.player.frozen ? 0.5 : 1;
        ctx.fillText('🧑‍💻', ppx, ppy);
        ctx.globalAlpha = 1;

        // Draw effects
        ctx.font = 'bold 14px Arial';
        this.state.effects.forEach(e => {
            const ex = offsetX + e.x * this.state.cellSize + this.state.cellSize / 2;
            const ey = offsetY + e.y * this.state.cellSize + e.vy * (40 - e.life);
            ctx.globalAlpha = e.life / 40;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, ex, ey);
        });
        ctx.globalAlpha = 1;
    },

    /**
     * Game loop
     */
    gameLoop() {
        const self = this;
        function loop() {
            if (self.state.gameOver) return;
            self.update();
            self.draw();
            requestAnimationFrame(loop);
        }
        loop();
    },

    /**
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleKeyDown = (e) => {
            if (self.state.gameOver) return;
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                self.state.moveKeys.up = true;
                e.preventDefault();
            }
            if (['ArrowDown', 'KeyS'].includes(e.code)) {
                self.state.moveKeys.down = true;
                e.preventDefault();
            }
            if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                self.state.moveKeys.left = true;
                e.preventDefault();
            }
            if (['ArrowRight', 'KeyD'].includes(e.code)) {
                self.state.moveKeys.right = true;
                e.preventDefault();
            }

            if (!self.moveTimeout) {
                self.moveTimeout = setTimeout(() => {
                    self.state.moveKeys = { up: false, down: false, left: false, right: false };
                    self.moveTimeout = null;
                }, 120);
            }
        };

        this.handleKeyUp = (e) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) self.state.moveKeys.up = false;
            if (['ArrowDown', 'KeyS'].includes(e.code)) self.state.moveKeys.down = false;
            if (['ArrowLeft', 'KeyA'].includes(e.code)) self.state.moveKeys.left = false;
            if (['ArrowRight', 'KeyD'].includes(e.code)) self.state.moveKeys.right = false;
        };

        this.touchStart = null;
        this.handleTouchStart = (e) => {
            self.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };
        this.handleTouchMove = (e) => {
            if (!self.touchStart || self.state.gameOver) return;
            e.preventDefault();
            const touch = e.touches[0];
            const dx = touch.clientX - self.touchStart.x;
            const dy = touch.clientY - self.touchStart.y;
            if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    self.state.moveKeys = { up: false, down: false, left: dx < 0, right: dx > 0 };
                } else {
                    self.state.moveKeys = { up: dy < 0, down: dy > 0, left: false, right: false };
                }
                self.touchStart = { x: touch.clientX, y: touch.clientY };
                setTimeout(() => {
                    self.state.moveKeys = { up: false, down: false, left: false, right: false };
                }, 80);
            }
        };

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    },

    /**
     * Stop the game
     */
    stop() {
        this.state.gameOver = true;
        if (this.moveTimeout) clearTimeout(this.moveTimeout);
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        if (this.canvas) {
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        }
        this.canvas = null;
        this.ctx = null;
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.LiquidityMaze = LiquidityMaze;
}
