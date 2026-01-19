/**
 * ASDF Games - Crypto Heist Engine
 *
 * Top-down shooter survival game
 * Navigate the crypto underworld, steal tokens, evade enemies
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const CryptoHeist = {
    gameId: 'cryptoheist',
    state: null,
    canvas: null,
    ctx: null,
    timing: null,

    /**
     * Start the game
     */
    start(gameId) {
        this.gameId = gameId;
        const arena = document.getElementById(`arena-${gameId}`);
        if (!arena) return;

        this.state = {
            score: 0,
            wave: 1,
            kills: 0,
            gameOver: false,
            player: { x: 0, y: 0, size: 20, speed: 5, angle: 0 },
            enemies: [],
            bullets: [],
            tokens: [],
            effects: [],
            keys: { up: false, down: false, left: false, right: false },
            mouseX: 0,
            mouseY: 0,
            lastShot: 0,
            shootCooldown: 150,
            spawnTimer: 0,
            spawnRate: 70,
            enemySpeed: 1.8
        };

        this.createArena(arena);
        this.canvas = document.getElementById('ch-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Initialize timing for frame-independent movement
        this.timing = GameTiming.create();

        this.setupInput();

        // Spawn initial enemies
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }

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
            <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a0a2e 100%);cursor:crosshair;">
                <canvas id="ch-canvas" style="width:100%;height:100%;"></canvas>
                <div style="position:absolute;top:15px;left:15px;display:flex;gap:20px;">
                    <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--gold);font-size:14px;">&#128176; SCORE: <span id="ch-score">0</span></span>
                    </div>
                    <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--red);font-size:14px;">&#128128; KILLS: <span id="ch-kills">0</span></span>
                    </div>
                    <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--purple);font-size:14px;">&#127754; WAVE <span id="ch-wave">1</span></span>
                    </div>
                </div>
                <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:11px;text-align:center;">
                    WASD to move | AIM with mouse | CLICK to shoot | Survive the enemy waves!
                </div>
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
        this.state.player.x = this.canvas.width / 2;
        this.state.player.y = this.canvas.height / 2;
    },

    /**
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleKeyDown = (e) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                self.state.keys.up = true;
                e.preventDefault();
            }
            if (['ArrowDown', 'KeyS'].includes(e.code)) {
                self.state.keys.down = true;
                e.preventDefault();
            }
            if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                self.state.keys.left = true;
                e.preventDefault();
            }
            if (['ArrowRight', 'KeyD'].includes(e.code)) {
                self.state.keys.right = true;
                e.preventDefault();
            }
        };

        this.handleKeyUp = (e) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) self.state.keys.up = false;
            if (['ArrowDown', 'KeyS'].includes(e.code)) self.state.keys.down = false;
            if (['ArrowLeft', 'KeyA'].includes(e.code)) self.state.keys.left = false;
            if (['ArrowRight', 'KeyD'].includes(e.code)) self.state.keys.right = false;
        };

        this.handleMouseMove = (e) => {
            const rect = self.canvas.getBoundingClientRect();
            self.state.mouseX = (e.clientX - rect.left) * (self.canvas.width / rect.width);
            self.state.mouseY = (e.clientY - rect.top) * (self.canvas.height / rect.height);
        };

        this.handleClick = (e) => {
            if (!self.state.gameOver) {
                self.shoot();
            }
        };

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('click', this.handleClick);
    },

    /**
     * Spawn enemy
     */
    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        switch (side) {
            case 0: x = -30; y = Math.random() * this.canvas.height; break;
            case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = -30; break;
            case 3: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
        }

        const types = [
            { icon: '👾', health: 1, speed: this.state.enemySpeed, value: 10, size: 18 },
            { icon: '👹', health: 2, speed: this.state.enemySpeed * 0.8, value: 20, size: 22 },
            { icon: '🤖', health: 3, speed: this.state.enemySpeed * 0.6, value: 30, size: 25 }
        ];

        const typeIndex = Math.min(Math.floor(Math.random() * Math.min(this.state.wave, 3)), types.length - 1);
        const type = types[typeIndex];

        this.state.enemies.push({
            x, y,
            ...type,
            maxHealth: type.health
        });
    },

    /**
     * Spawn token
     */
    spawnToken(x, y) {
        if (Math.random() < 0.3) {
            this.state.tokens.push({
                x, y,
                size: 12,
                value: 5 + this.state.wave * 2,
                life: 300
            });
        }
    },

    /**
     * Shoot
     */
    shoot() {
        const now = Date.now();
        if (now - this.state.lastShot < this.state.shootCooldown) return;
        this.state.lastShot = now;

        const angle = Math.atan2(this.state.mouseY - this.state.player.y, this.state.mouseX - this.state.player.x);
        this.state.bullets.push({
            x: this.state.player.x,
            y: this.state.player.y,
            vx: Math.cos(angle) * 12,
            vy: Math.sin(angle) * 12,
            size: 5
        });
        recordGameAction(this.gameId, 'shoot', { angle });
    },

    /**
     * Add effect
     */
    addEffect(x, y, text, color) {
        this.state.effects.push({ x, y, text, color, life: 30, vy: -2 });
    },

    /**
     * Update game state
     * @param {number} dt - Delta time normalized to 60fps
     */
    update(dt) {
        if (this.state.gameOver) return;

        // Player movement
        let dx = 0, dy = 0;
        if (this.state.keys.up) dy -= 1;
        if (this.state.keys.down) dy += 1;
        if (this.state.keys.left) dx -= 1;
        if (this.state.keys.right) dx += 1;

        if (dx || dy) {
            const len = Math.sqrt(dx * dx + dy * dy);
            this.state.player.x += (dx / len) * this.state.player.speed * dt;
            this.state.player.y += (dy / len) * this.state.player.speed * dt;
        }

        const bottomMargin = 50;
        this.state.player.x = Math.max(this.state.player.size, Math.min(this.canvas.width - this.state.player.size, this.state.player.x));
        this.state.player.y = Math.max(this.state.player.size, Math.min(this.canvas.height - this.state.player.size - bottomMargin, this.state.player.y));

        this.state.player.angle = Math.atan2(this.state.mouseY - this.state.player.y, this.state.mouseX - this.state.player.x);

        // Spawn enemies
        this.state.spawnTimer += dt;
        if (this.state.spawnTimer >= this.state.spawnRate) {
            this.state.spawnTimer = 0;
            this.spawnEnemy();
        }

        const self = this;

        // Update enemies
        this.state.enemies.forEach(enemy => {
            const dx = self.state.player.x - enemy.x;
            const dy = self.state.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed * dt;
                enemy.y += (dy / dist) * enemy.speed * dt;
            }

            if (dist < self.state.player.size + enemy.size) {
                self.state.gameOver = true;
                self.addEffect(self.state.player.x, self.state.player.y, 'GAME OVER!', '#ef4444');
                setTimeout(() => endGame(self.gameId, self.state.score), 500);
            }
        });

        // Update bullets
        this.state.bullets = this.state.bullets.filter(bullet => {
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            for (let i = self.state.enemies.length - 1; i >= 0; i--) {
                const enemy = self.state.enemies[i];
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < bullet.size + enemy.size) {
                    enemy.health--;
                    if (enemy.health <= 0) {
                        self.state.kills++;
                        self.state.score += enemy.value;
                        document.getElementById('ch-kills').textContent = self.state.kills;
                        document.getElementById('ch-score').textContent = self.state.score;
                        self.addEffect(enemy.x, enemy.y, '+' + enemy.value, '#22c55e');
                        self.spawnToken(enemy.x, enemy.y);
                        self.state.enemies.splice(i, 1);
                        recordScoreUpdate(self.gameId, self.state.score, enemy.value);

                        if (self.state.kills > 0 && self.state.kills % 10 === 0) {
                            self.state.wave++;
                            self.state.spawnRate = Math.max(40, self.state.spawnRate - 10);
                            self.state.enemySpeed += 0.2;
                            document.getElementById('ch-wave').textContent = self.state.wave;
                            self.addEffect(self.canvas.width / 2, self.canvas.height / 2, 'WAVE ' + self.state.wave + '!', '#a855f7');
                        }
                    } else {
                        self.addEffect(enemy.x, enemy.y, '-1', '#fbbf24');
                    }
                    return false;
                }
            }

            return bullet.x > -10 && bullet.x < self.canvas.width + 10 && bullet.y > -10 && bullet.y < self.canvas.height + 10;
        });

        // Update tokens
        this.state.tokens = this.state.tokens.filter(token => {
            token.life -= dt;
            const dx = token.x - self.state.player.x;
            const dy = token.y - self.state.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < self.state.player.size + token.size) {
                self.state.score += token.value;
                document.getElementById('ch-score').textContent = self.state.score;
                self.addEffect(token.x, token.y, '+' + token.value, '#fbbf24');
                recordScoreUpdate(self.gameId, self.state.score, token.value);
                return false;
            }
            return token.life > 0;
        });

        // Update effects
        this.state.effects = this.state.effects.filter(e => {
            e.y += e.vy * dt;
            e.life -= dt;
            return e.life > 0;
        });

        updateScore(this.gameId, this.state.score);
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        ctx.strokeStyle = '#1a1a3e';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Tokens
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.state.tokens.forEach(token => {
            ctx.globalAlpha = token.life > 60 ? 1 : token.life / 60;
            ctx.fillText('🪙', token.x, token.y);
        });
        ctx.globalAlpha = 1;

        // Bullets
        ctx.fillStyle = '#fbbf24';
        this.state.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Enemies
        this.state.enemies.forEach(enemy => {
            ctx.font = `${enemy.size * 1.5}px Arial`;
            ctx.fillText(enemy.icon, enemy.x, enemy.y);

            if (enemy.health < enemy.maxHealth) {
                const barWidth = enemy.size * 1.5;
                const barHeight = 4;
                ctx.fillStyle = '#333';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth, barHeight);
                ctx.fillStyle = enemy.health > 1 ? '#22c55e' : '#ef4444';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth * (enemy.health / enemy.maxHealth), barHeight);
            }
        });

        // Player
        ctx.save();
        ctx.translate(this.state.player.x, this.state.player.y);
        ctx.rotate(this.state.player.angle);

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(40, 0);
        ctx.stroke();

        ctx.restore();

        ctx.font = '28px Arial';
        ctx.fillText('🧙', this.state.player.x, this.state.player.y);

        // Effects
        ctx.font = 'bold 18px Arial';
        this.state.effects.forEach(e => {
            ctx.globalAlpha = e.life / 30;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, e.x, e.y);
        });
        ctx.globalAlpha = 1;
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

        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.canvas.removeEventListener('click', this.handleClick);
        }

        this.canvas = null;
        this.ctx = null;
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.CryptoHeist = CryptoHeist;
}
