/**
 * ASDF Games - Scam Blaster Engine
 *
 * Shooter game: Shoot down scam tokens and rug projects
 * Two modes: Fall mode (protect wallet) and Pop mode (click before vanish)
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const ScamBlaster = {
    gameId: 'scamblaster',
    state: null,
    canvas: null,
    ctx: null,
    timing: null,

    enemyTypes: [
        { icon: '🪙', name: 'SCAM COIN', points: 10, speed: 1, size: 40 },
        { icon: '🔴', name: 'RUG TOKEN', points: 25, speed: 1.2, size: 45 },
        { icon: '💀', name: 'HONEYPOT', points: 50, speed: 1.4, size: 50 },
        { icon: '🦠', name: 'MALWARE', points: 75, speed: 1.6, size: 40 },
        { icon: '👤', name: 'FAKE DEV', points: 100, speed: 1.3, size: 55 }
    ],

    /**
     * Start the game
     */
    start(gameId) {
        this.gameId = gameId;
        const arena = document.getElementById(`arena-${gameId}`);
        if (!arena) return;

        this.state = {
            score: 0,
            lives: 3,
            wave: 1,
            gameOver: false,
            phase: 'select',
            countdown: 3,
            gameMode: null,
            crosshair: { x: 0, y: 0 },
            enemies: [],
            explosions: [],
            spawnTimer: 0,
            spawnRate: 80,
            baseSpeed: 1.5,
            enemySpeed: 1.5,
            frameCount: 0
        };

        this.createArena(arena);
        this.canvas = document.getElementById('sb-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Initialize timing for frame-independent movement
        this.timing = GameTiming.create();

        this.setupModeSelection();
        this.setupInput();
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
            <div style="width:100%;height:100%;position:relative;overflow:hidden;cursor:crosshair;">
                <canvas id="sb-canvas" style="width:100%;height:100%;"></canvas>
                <div id="sb-mode-select" style="position:absolute;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;">
                    <h2 style="color:var(--gold);font-size:28px;margin-bottom:10px;">&#127919; SCAM BLASTER</h2>
                    <p style="color:var(--text-muted);font-size:14px;margin-bottom:30px;">Choose your game mode:</p>
                    <div style="display:flex;gap:20px;">
                        <button id="sb-select-fall" style="padding:20px 30px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#16a34a);border:3px solid #4ade80;color:#fff;cursor:pointer;text-align:center;transition:transform 0.2s;">
                            <div style="font-size:40px;margin-bottom:8px;">&#128229;</div>
                            <div style="font-size:16px;font-weight:bold;">FALL MODE</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:5px;">Enemies fall down<br>Protect your wallet!</div>
                        </button>
                        <button id="sb-select-pop" style="padding:20px 30px;border-radius:12px;background:linear-gradient(135deg,#a855f7,#7c3aed);border:3px solid #c084fc;color:#fff;cursor:pointer;text-align:center;transition:transform 0.2s;">
                            <div style="font-size:40px;margin-bottom:8px;">&#128165;</div>
                            <div style="font-size:16px;font-weight:bold;">POP MODE</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:5px;">Enemies pop up anywhere<br>Click before they vanish!</div>
                        </button>
                    </div>
                </div>
                <div id="sb-hud" style="display:none;">
                    <div style="position:absolute;top:12px;left:12px;display:flex;gap:12px;">
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);">
                            <span style="color:#a78bfa;font-size:10px;">SCORE</span>
                            <div style="color:#fbbf24;font-size:18px;font-weight:bold;" id="sb-score">0</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);">
                            <span style="color:#a78bfa;font-size:10px;">WAVE</span>
                            <div style="color:#a855f7;font-size:18px;font-weight:bold;" id="sb-wave">1</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);">
                            <span style="color:#a78bfa;font-size:10px;">SPEED</span>
                            <div style="color:#22c55e;font-size:14px;font-weight:bold;" id="sb-speed">1.0x</div>
                        </div>
                    </div>
                    <div style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);" id="sb-lives">&#10084;&#10084;&#10084;</div>
                    <div id="sb-wallet" style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:85%;height:50px;background:linear-gradient(90deg,rgba(139,92,246,0.4),rgba(251,191,36,0.4));border:2px solid #fbbf24;border-radius:10px;display:none;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(251,191,36,0.3);">
                        <span style="font-size:22px;">&#128188;</span>
                        <span style="margin-left:8px;color:#fbbf24;font-weight:bold;">YOUR WALLET</span>
                    </div>
                </div>
                <div id="sb-countdown" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:72px;font-weight:bold;color:#fff;text-shadow:0 0 30px rgba(251,191,36,0.8);display:none;"></div>
            </div>
        `;
    },

    /**
     * Resize canvas
     */
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.walletZone = { y: this.canvas.height - 90, height: 50 };
    },

    /**
     * Setup mode selection
     */
    setupModeSelection() {
        const self = this;
        document.getElementById('sb-select-fall').onclick = () => self.selectMode('fall');
        document.getElementById('sb-select-pop').onclick = () => self.selectMode('pop');
    },

    /**
     * Select game mode
     */
    selectMode(mode) {
        this.state.gameMode = mode;
        document.getElementById('sb-mode-select').style.display = 'none';
        document.getElementById('sb-hud').style.display = 'block';
        document.getElementById('sb-countdown').style.display = 'block';

        if (mode === 'fall') {
            document.getElementById('sb-wallet').style.display = 'flex';
        }

        this.state.phase = 'countdown';
        this.state.countdown = 3;
        document.getElementById('sb-countdown').textContent = '3';
    },

    /**
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleMove = (e) => {
            const rect = self.canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            self.state.crosshair.x = x * (self.canvas.width / rect.width);
            self.state.crosshair.y = y * (self.canvas.height / rect.height);
        };

        this.handleClick = (e) => {
            self.handleMove(e);
            self.shoot(self.state.crosshair.x, self.state.crosshair.y);
        };

        this.canvas.addEventListener('mousemove', this.handleMove);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('touchmove', this.handleMove);
        this.canvas.addEventListener('touchstart', this.handleClick);
    },

    /**
     * Spawn enemy
     */
    spawnEnemy() {
        const type = this.enemyTypes[Math.min(Math.floor(Math.random() * (this.state.wave + 1)), this.enemyTypes.length - 1)];

        if (this.state.gameMode === 'fall') {
            this.state.enemies.push({
                x: Math.random() * (this.canvas.width - 80) + 40,
                y: -50,
                vy: type.speed * this.state.enemySpeed,
                ...type
            });
        } else {
            this.state.enemies.push({
                x: 60 + Math.random() * (this.canvas.width - 120),
                y: 60 + Math.random() * (this.canvas.height - 180),
                vy: 0,
                lifespan: 90 + Math.random() * 60,
                maxLife: 90 + Math.random() * 60,
                ...type
            });
        }
    },

    /**
     * Shoot at position
     */
    shoot(x, y) {
        if (this.state.gameOver || this.state.phase !== 'playing') return;

        let hit = false;
        this.state.enemies = this.state.enemies.filter(enemy => {
            const dx = x - enemy.x;
            const dy = y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < enemy.size) {
                this.state.score += enemy.points;
                hit = true;
                this.state.explosions.push({ x: enemy.x, y: enemy.y, life: 20, icon: '💥' });
                return false;
            }
            return true;
        });

        if (!hit) {
            this.state.explosions.push({ x, y, life: 10, icon: '💨' });
        }
    },

    /**
     * Update game state
     * @param {number} dt - Delta time normalized to 60fps
     */
    update(dt) {
        if (this.state.gameOver) return;
        if (this.state.phase === 'select') return;

        if (this.state.phase === 'countdown') {
            this.state.frameCount += dt;
            if (this.state.frameCount >= 60) {
                this.state.countdown--;
                this.state.frameCount = 0;
                if (this.state.countdown <= 0) {
                    this.state.phase = 'playing';
                    document.getElementById('sb-countdown').style.display = 'none';
                } else {
                    document.getElementById('sb-countdown').textContent = this.state.countdown;
                }
            }
            return;
        }

        this.state.frameCount += dt;

        const timeBonus = this.state.frameCount * 0.00003;
        this.state.enemySpeed = this.state.baseSpeed + this.state.wave * 0.4 + timeBonus;

        const speedEl = document.getElementById('sb-speed');
        if (speedEl) speedEl.textContent = this.state.enemySpeed.toFixed(1) + 'x';

        this.state.spawnTimer += dt;
        const dynamicSpawnRate = Math.max(25, this.state.spawnRate - this.state.wave * 8 - this.state.frameCount * 0.01);
        if (this.state.spawnTimer >= dynamicSpawnRate) {
            this.spawnEnemy();
            this.state.spawnTimer = 0;
        }

        const livesEl = document.getElementById('sb-lives');
        const scoreEl = document.getElementById('sb-score');
        const waveEl = document.getElementById('sb-wave');
        const self = this;

        this.state.enemies = this.state.enemies.filter(enemy => {
            if (self.state.gameMode === 'fall') {
                enemy.y += enemy.vy * self.state.enemySpeed * dt;

                if (enemy.y > self.walletZone.y) {
                    self.state.lives--;
                    self.state.explosions.push({ x: enemy.x, y: enemy.y, life: 25, icon: '💔' });
                    if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

                    if (self.state.lives <= 0) {
                        self.state.gameOver = true;
                        endGame(self.gameId, self.state.score);
                    }
                    return false;
                }
            } else {
                enemy.lifespan -= self.state.enemySpeed * 0.5 * dt;
                if (enemy.lifespan <= 0) {
                    self.state.lives--;
                    self.state.explosions.push({ x: enemy.x, y: enemy.y, life: 25, icon: '💔' });
                    if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

                    if (self.state.lives <= 0) {
                        self.state.gameOver = true;
                        endGame(self.gameId, self.state.score);
                    }
                    return false;
                }
            }
            return true;
        });

        if (this.state.score >= this.state.wave * 300) {
            this.state.wave++;
            if (waveEl) waveEl.textContent = this.state.wave;
            this.state.baseSpeed += 0.3;
        }

        this.state.explosions = this.state.explosions.filter(exp => {
            exp.life -= dt;
            return exp.life > 0;
        });

        if (scoreEl) scoreEl.textContent = this.state.score;
        updateScore(this.gameId, this.state.score);
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;

        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.5, '#151530');
        bgGrad.addColorStop(1, '#1a1a3a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.state.enemies.forEach(enemy => {
            if (this.state.gameMode === 'pop' && enemy.lifespan !== undefined) {
                const progress = enemy.lifespan / enemy.maxLife;
                const radius = enemy.size + 8;

                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
                ctx.stroke();

                const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#fbbf24' : '#ef4444';
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
                ctx.stroke();
            }

            ctx.font = `${enemy.size}px Arial`;
            ctx.fillText(enemy.icon, enemy.x, enemy.y);
        });

        this.state.explosions.forEach(exp => {
            ctx.globalAlpha = exp.life / 25;
            const scale = 1 + (25 - exp.life) * 0.06;
            ctx.font = `${35 * scale}px Arial`;
            ctx.fillText(exp.icon, exp.x, exp.y);
        });
        ctx.globalAlpha = 1;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.state.crosshair.x, this.state.crosshair.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.state.crosshair.x - 25, this.state.crosshair.y);
        ctx.lineTo(this.state.crosshair.x - 8, this.state.crosshair.y);
        ctx.moveTo(this.state.crosshair.x + 8, this.state.crosshair.y);
        ctx.lineTo(this.state.crosshair.x + 25, this.state.crosshair.y);
        ctx.moveTo(this.state.crosshair.x, this.state.crosshair.y - 25);
        ctx.lineTo(this.state.crosshair.x, this.state.crosshair.y - 8);
        ctx.moveTo(this.state.crosshair.x, this.state.crosshair.y + 8);
        ctx.lineTo(this.state.crosshair.x, this.state.crosshair.y + 25);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(this.state.crosshair.x, this.state.crosshair.y, 3, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * Game loop
     */
    gameLoop() {
        const self = this;
        function loop(timestamp) {
            if (self.state.gameOver) return;
            const dt = self.timing.tick(timestamp);
            self.update(dt);
            self.draw();
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    },

    /**
     * Stop the game
     */
    stop() {
        this.state.gameOver = true;

        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.handleMove);
            this.canvas.removeEventListener('click', this.handleClick);
            this.canvas.removeEventListener('touchmove', this.handleMove);
            this.canvas.removeEventListener('touchstart', this.handleClick);
        }

        this.canvas = null;
        this.ctx = null;
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.ScamBlaster = ScamBlaster;
}
