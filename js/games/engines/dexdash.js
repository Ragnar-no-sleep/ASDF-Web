/**
 * ASDF Games - DexDash Engine
 *
 * Smooth movement racing game with speed effects
 * Avoid obstacles, collect boosts, watch for death traps
 * Progressive difficulty scaling
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const DexDash = {
    gameId: 'dexdash',
    state: null,
    canvas: null,
    ctx: null,
    timing: null,
    roadWidth: 380,

    dexLogos: ['🦄', '🦞', '🍣', '☀️', '🌊', '💎'],
    obstacleTypes: [
        { icon: '🚧', slowdown: 2 },
        { icon: '⛔', slowdown: 3 },
        { icon: '🐌', slowdown: 1.5 },
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
            gameOver: false,
            player: { x: 0, y: 0, vx: 0, vy: 0, speed: 2 },
            obstacles: [],
            boosts: [],
            deathTraps: [],
            distance: 0,
            baseMaxSpeed: 6,
            maxSpeed: 6,
            acceleration: 0.025,
            roadOffset: 0,
            keys: { left: false, right: false, up: false, down: false },
            effects: [],
            speedParticles: [],
            windParticles: [],
            screenShake: 0,
            turboFlash: 0,
            lastTrailTime: 0,
            difficultyMultiplier: 1,
        };

        this.createArena(arena);
        this.canvas = document.getElementById('dd-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.timing = GameTiming.create();
        this.resizeCanvas();
        this.setupInput();

        this.state.player.speed = 1.5;
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
            <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a1a3a 100%);">
                <canvas id="dd-canvas" style="width:100%;height:100%;"></canvas>
                <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:15px;">
                    <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--text-muted);font-size:10px;">DISTANCE</span>
                        <div style="color:var(--gold);font-size:16px;font-weight:bold;" id="dd-distance">0m</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--text-muted);font-size:10px;">SCORE</span>
                        <div style="color:var(--green);font-size:16px;font-weight:bold;" id="dd-score">0</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--text-muted);font-size:10px;">SPEED</span>
                        <div style="color:var(--purple);font-size:16px;font-weight:bold;" id="dd-speed">0</div>
                    </div>
                </div>
                <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:10px;background:rgba(0,0,0,0.5);padding:8px 15px;border-radius:8px;">
                    WASD or Arrows = Move | &#129412; Boost | &#128679; Slow | &#128128; Game Over
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
        this.state.player.y = this.canvas.height - 80;
    },

    /**
     * Get road boundaries
     */
    roadLeft() {
        return (this.canvas.width - this.roadWidth) / 2;
    },

    roadRight() {
        return this.roadLeft() + this.roadWidth;
    },

    /**
     * Spawn obstacle
     */
    spawnObstacle() {
        const x = this.roadLeft() + 40 + Math.random() * (this.roadWidth - 80);
        const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
        this.state.obstacles.push({
            x,
            y: -40,
            size: 35,
            fallSpeed: 1.2 + Math.random() * 0.8,
            ...type,
        });
    },

    /**
     * Spawn boost
     */
    spawnBoost() {
        const x = this.roadLeft() + 40 + Math.random() * (this.roadWidth - 80);
        this.state.boosts.push({
            x,
            y: -40,
            icon: this.dexLogos[Math.floor(Math.random() * this.dexLogos.length)],
            size: 30,
            fallSpeed: 0.9 + Math.random() * 0.5,
            value: 25 + Math.floor(this.state.distance / 100) * 5,
        });
    },

    /**
     * Spawn death trap
     */
    spawnDeathTrap() {
        const x = this.roadLeft() + 50 + Math.random() * (this.roadWidth - 100);
        this.state.deathTraps.push({
            x,
            y: -40,
            icon: '💀',
            size: 40,
            fallSpeed: 0.7 + Math.random() * 0.4,
            pulse: 0,
        });
    },

    /**
     * Add effect
     */
    addEffect(x, y, text, color) {
        this.state.effects.push({ x, y, text, color, life: 40, vy: -1.5 });
    },

    /**
     * Update game state
     * @param {number} dt - Delta time normalized to 60fps (1.0 = 16.67ms)
     */
    update(dt) {
        if (this.state.gameOver) return;

        const self = this;

        // Progressive difficulty scaling
        this.state.difficultyMultiplier = 1 + (this.state.distance / 800) * 0.3;
        this.state.maxSpeed = this.state.baseMaxSpeed + Math.floor(this.state.distance / 500) * 0.5;
        this.state.maxSpeed = Math.min(12, this.state.maxSpeed);

        // Gradual speed increase (frame-independent)
        const dynamicAccel = this.state.acceleration * (1 + this.state.distance / 3000);
        this.state.player.speed = Math.min(this.state.maxSpeed, this.state.player.speed + dynamicAccel * dt);
        this.state.distance += this.state.player.speed * 0.3 * dt;
        this.state.roadOffset = (this.state.roadOffset + this.state.player.speed * 2 * dt) % 40;

        // Smooth movement (frame-independent)
        const moveSpeed = 7;
        const friction = 0.9;

        if (this.state.keys.left) this.state.player.vx -= moveSpeed * 0.2 * dt;
        if (this.state.keys.right) this.state.player.vx += moveSpeed * 0.2 * dt;
        this.state.player.vx *= Math.pow(friction, dt);
        this.state.player.vx = Math.max(-moveSpeed, Math.min(moveSpeed, this.state.player.vx));
        this.state.player.x += this.state.player.vx * dt;

        if (this.state.keys.up) this.state.player.vy -= moveSpeed * 0.15 * dt;
        if (this.state.keys.down) this.state.player.vy += moveSpeed * 0.15 * dt;
        this.state.player.vy *= Math.pow(friction, dt);
        this.state.player.vy = Math.max(-moveSpeed * 0.7, Math.min(moveSpeed * 0.7, this.state.player.vy));
        this.state.player.y += this.state.player.vy * dt;

        // Boundary collision
        const playerHalfWidth = 20;
        if (this.state.player.x < this.roadLeft() + playerHalfWidth) {
            this.state.player.x = this.roadLeft() + playerHalfWidth;
            this.state.player.vx = Math.abs(this.state.player.vx) * 0.3;
            this.state.player.speed = Math.max(1, this.state.player.speed - 0.5);
        }
        if (this.state.player.x > this.roadRight() - playerHalfWidth) {
            this.state.player.x = this.roadRight() - playerHalfWidth;
            this.state.player.vx = -Math.abs(this.state.player.vx) * 0.3;
            this.state.player.speed = Math.max(1, this.state.player.speed - 0.5);
        }

        const minY = 100;
        const maxY = this.canvas.height - 50;
        this.state.player.y = Math.max(minY, Math.min(maxY, this.state.player.y));

        // Spawn objects
        const spawnMod = Math.min(2.5, 1 + this.state.distance * 0.0004);
        if (Math.random() < 0.008 * spawnMod) this.spawnObstacle();
        if (Math.random() < 0.004 * spawnMod) this.spawnBoost();
        if (this.state.distance > 250 && Math.random() < 0.003 * spawnMod) this.spawnDeathTrap();

        // Update obstacles (frame-independent)
        this.state.obstacles = this.state.obstacles.filter(obs => {
            obs.y += (self.state.player.speed + obs.fallSpeed * self.state.difficultyMultiplier) * dt;

            const dx = obs.x - self.state.player.x;
            const dy = obs.y - self.state.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < obs.size / 2 + 20) {
                self.state.player.speed = Math.max(0.5, self.state.player.speed - obs.slowdown);
                self.state.score = Math.max(0, self.state.score - 15);
                self.addEffect(obs.x, obs.y, '-15', '#ef4444');
                return false;
            }

            return obs.y < self.canvas.height + 50;
        });

        // Update boosts (frame-independent)
        this.state.boosts = this.state.boosts.filter(boost => {
            boost.y += (self.state.player.speed + boost.fallSpeed * self.state.difficultyMultiplier) * dt;

            const dx = boost.x - self.state.player.x;
            const dy = boost.y - self.state.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < boost.size / 2 + 20) {
                self.state.score += boost.value;
                self.state.player.speed = Math.min(self.state.maxSpeed, self.state.player.speed + 0.5);
                self.addEffect(boost.x, boost.y, '+' + boost.value, '#22c55e');
                recordScoreUpdate(self.gameId, self.state.score, boost.value);
                self.state.turboFlash = 1;
                for (let j = 0; j < 10; j++) {
                    self.state.speedParticles.push({
                        x: self.state.player.x + (Math.random() - 0.5) * 30,
                        y: self.state.player.y + (Math.random() - 0.5) * 30,
                        size: 4 + Math.random() * 6,
                        life: 30,
                        color: '#22c55e',
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                    });
                }
                return false;
            }

            return boost.y < self.canvas.height + 50;
        });

        // Update death traps (frame-independent)
        this.state.deathTraps = this.state.deathTraps.filter(trap => {
            trap.y += (self.state.player.speed * 0.7 + trap.fallSpeed * self.state.difficultyMultiplier) * dt;
            trap.pulse = (trap.pulse + 0.15 * dt) % (Math.PI * 2);

            const dx = trap.x - self.state.player.x;
            const dy = trap.y - self.state.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < trap.size / 2 + 15) {
                self.state.gameOver = true;
                self.addEffect(self.state.player.x, self.state.player.y, 'GAME OVER!', '#ef4444');
                setTimeout(() => endGame(self.gameId, self.state.score), 800);
                return false;
            }

            return trap.y < self.canvas.height + 50;
        });

        // Update effects (frame-independent)
        this.state.effects = this.state.effects.filter(e => {
            e.y += e.vy * dt;
            e.life -= dt;
            return e.life > 0;
        });

        // Speed effects
        const now = Date.now();
        if (this.state.player.speed > 3 && now - this.state.lastTrailTime > 50) {
            this.state.lastTrailTime = now;
            for (let i = 0; i < Math.floor(this.state.player.speed / 2); i++) {
                this.state.speedParticles.push({
                    x: this.state.player.x + (Math.random() - 0.5) * 20,
                    y: this.state.player.y + 20,
                    size: 3 + Math.random() * 4,
                    life: 20 + Math.random() * 15,
                    color: this.state.player.speed > 5 ? '#fbbf24' : '#8b5cf6',
                    vx: (Math.random() - 0.5) * 2,
                    vy: 2 + this.state.player.speed * 0.5,
                });
            }
        }

        // Wind particles
        if (this.state.player.speed > 4 && Math.random() < 0.3) {
            const side = Math.random() < 0.5 ? -1 : 1;
            this.state.windParticles.push({
                x: side < 0 ? this.roadLeft() + 10 : this.roadRight() - 10,
                y: Math.random() * this.canvas.height,
                length: 20 + this.state.player.speed * 8,
                life: 15,
                alpha: 0.3 + this.state.player.speed * 0.05,
            });
        }

        // Update particles (frame-independent)
        this.state.speedParticles = this.state.speedParticles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.size *= Math.pow(0.95, dt);
            return p.life > 0 && p.size > 0.5;
        });

        this.state.windParticles = this.state.windParticles.filter(p => {
            p.y += this.state.player.speed * 3 * dt;
            p.life -= dt;
            return p.life > 0 && p.y < this.canvas.height + 50;
        });

        // Screen shake (frame-independent)
        if (this.state.player.speed > 5) {
            this.state.screenShake = (this.state.player.speed - 5) * 2;
        } else {
            this.state.screenShake *= Math.pow(0.9, dt);
        }

        // Turbo flash (frame-independent)
        if (this.state.turboFlash > 0) {
            this.state.turboFlash -= 0.05 * dt;
        }

        // Update UI
        document.getElementById('dd-distance').textContent = Math.floor(this.state.distance) + 'm';
        document.getElementById('dd-speed').textContent = Math.floor(this.state.player.speed * 20) + ' km/h';
        document.getElementById('dd-score').textContent = this.state.score;
        this.state.score = Math.max(this.state.score, Math.floor(this.state.distance / 2));
        updateScore(this.gameId, this.state.score);
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;

        // Apply screen shake
        ctx.save();
        if (this.state.screenShake > 0.5) {
            const shakeX = (Math.random() - 0.5) * this.state.screenShake;
            const shakeY = (Math.random() - 0.5) * this.state.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        ctx.clearRect(-10, -10, this.canvas.width + 20, this.canvas.height + 20);

        const rLeft = this.roadLeft();
        const rRight = this.roadRight();

        // Background gradient
        const speedIntensity = Math.min(1, this.state.player.speed / 6);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGrad.addColorStop(0, `rgb(${10 + speedIntensity * 20}, ${10 + speedIntensity * 10}, ${42 + speedIntensity * 30})`);
        bgGrad.addColorStop(1, `rgb(${26 + speedIntensity * 30}, ${26 + speedIntensity * 15}, ${74 + speedIntensity * 40})`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(-10, -10, this.canvas.width + 20, this.canvas.height + 20);

        // Turbo flash
        if (this.state.turboFlash > 0) {
            ctx.fillStyle = `rgba(34, 197, 94, ${this.state.turboFlash * 0.3})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Wind particles
        this.state.windParticles.forEach(p => {
            ctx.strokeStyle = `rgba(139, 92, 246, ${p.alpha * (p.life / 15)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y + p.length);
            ctx.stroke();
        });

        // Road
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(rLeft, 0, this.roadWidth, this.canvas.height);

        // Road markings
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        const dashLength = 25 - this.state.player.speed * 2;
        ctx.setLineDash([Math.max(10, dashLength), 15]);
        ctx.beginPath();
        ctx.moveTo(this.canvas.width / 2, -this.state.roadOffset);
        ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Road edges with glow
        const edgeGlow = 10 + this.state.player.speed * 3;
        ctx.shadowColor = this.state.player.speed > 5 ? '#fbbf24' : '#8b5cf6';
        ctx.shadowBlur = edgeGlow;
        ctx.strokeStyle = this.state.player.speed > 5 ? '#fbbf24' : '#8b5cf6';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(rLeft, 0);
        ctx.lineTo(rLeft, this.canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rRight, 0);
        ctx.lineTo(rRight, this.canvas.height);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw obstacles
        this.state.obstacles.forEach(obs => {
            ctx.fillText(obs.icon, obs.x, obs.y);
        });

        // Draw boosts
        this.state.boosts.forEach(boost => {
            const float = Math.sin(Date.now() * 0.005 + boost.y * 0.1) * 4;
            ctx.fillText(boost.icon, boost.x, boost.y + float);
        });

        // Draw death traps
        this.state.deathTraps.forEach(trap => {
            const scale = 1 + Math.sin(trap.pulse) * 0.15;
            ctx.save();
            ctx.translate(trap.x, trap.y);
            ctx.scale(scale, scale);
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15 + Math.sin(trap.pulse) * 10;
            ctx.font = `${trap.size}px Arial`;
            ctx.fillText(trap.icon, 0, 0);
            ctx.restore();
        });
        ctx.shadowBlur = 0;

        // Draw speed particles
        this.state.speedParticles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Draw player
        ctx.save();
        ctx.translate(this.state.player.x, this.state.player.y);
        ctx.rotate(this.state.player.vx * 0.05);

        if (this.state.player.speed > 4) {
            ctx.shadowColor = this.state.player.speed > 5 ? '#fbbf24' : '#8b5cf6';
            ctx.shadowBlur = 10 + (this.state.player.speed - 4) * 5;
        }

        ctx.font = '40px Arial';
        ctx.fillText('🏎️', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Speed lines
        if (this.state.player.speed > 3) {
            const lineCount = Math.floor(this.state.player.speed * 2);
            const lineOpacity = (this.state.player.speed - 3) * 0.15;
            ctx.strokeStyle = `rgba(251,191,36,${Math.min(0.6, lineOpacity)})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < lineCount; i++) {
                const x = rLeft + Math.random() * this.roadWidth;
                const startY = Math.random() * this.canvas.height;
                const len = 40 + this.state.player.speed * 15 + Math.random() * 40;
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x + (Math.random() - 0.5) * 5, startY + len);
                ctx.stroke();
            }
        }

        // Motion blur
        if (this.state.player.speed > 5) {
            ctx.strokeStyle = `rgba(139, 92, 246, ${(this.state.player.speed - 5) * 0.2})`;
            ctx.lineWidth = 3;
            for (let i = 0; i < 5; i++) {
                const offsetX = (Math.random() - 0.5) * 30;
                ctx.beginPath();
                ctx.moveTo(this.state.player.x + offsetX, this.state.player.y + 20);
                ctx.lineTo(this.state.player.x + offsetX, this.state.player.y + 60 + this.state.player.speed * 8);
                ctx.stroke();
            }
        }

        // Draw effects
        ctx.font = 'bold 16px Arial';
        this.state.effects.forEach(e => {
            ctx.globalAlpha = e.life / 40;
            ctx.fillStyle = e.color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = 10;
            ctx.fillText(e.text, e.x, e.y);
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.restore();

        // Speed vignette
        if (this.state.player.speed > 4) {
            const vignetteAlpha = (this.state.player.speed - 4) * 0.1;
            const gradient = ctx.createRadialGradient(
                this.canvas.width / 2,
                this.canvas.height / 2,
                this.canvas.height * 0.3,
                this.canvas.width / 2,
                this.canvas.height / 2,
                this.canvas.height * 0.8
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(139, 92, 246, ${Math.min(0.4, vignetteAlpha)})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    /**
     * Game loop with frame-independent timing
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
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleKeyDown = (e) => {
            if (self.state.gameOver) return;
            if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                self.state.keys.left = true;
                e.preventDefault();
            }
            if (['ArrowRight', 'KeyD'].includes(e.code)) {
                self.state.keys.right = true;
                e.preventDefault();
            }
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                self.state.keys.up = true;
                e.preventDefault();
            }
            if (['ArrowDown', 'KeyS'].includes(e.code)) {
                self.state.keys.down = true;
                e.preventDefault();
            }
        };

        this.handleKeyUp = (e) => {
            if (['ArrowLeft', 'KeyA'].includes(e.code)) self.state.keys.left = false;
            if (['ArrowRight', 'KeyD'].includes(e.code)) self.state.keys.right = false;
            if (['ArrowUp', 'KeyW'].includes(e.code)) self.state.keys.up = false;
            if (['ArrowDown', 'KeyS'].includes(e.code)) self.state.keys.down = false;
        };

        this.touchX = null;
        this.handleTouchStart = (e) => {
            self.touchX = e.touches[0].clientX;
        };
        this.handleTouchMove = (e) => {
            if (self.touchX === null || self.state.gameOver) return;
            e.preventDefault();
            const currentX = e.touches[0].clientX;
            const diff = currentX - self.touchX;
            self.state.player.vx = diff * 0.05;
            self.touchX = currentX;
        };
        this.handleTouchEnd = () => {
            self.touchX = null;
        };

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd);
    },

    /**
     * Stop the game
     */
    stop() {
        this.state.gameOver = true;
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        if (this.canvas) {
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
            this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        }
        this.canvas = null;
        this.ctx = null;
        this.state = null;
        this.timing = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.DexDash = DexDash;
}
