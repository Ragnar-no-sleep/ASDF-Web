/**
 * ASDF Games - StakeStacker Engine
 *
 * Block stacking puzzle game
 * Stack blocks perfectly for bonus points
 * Camera scrolls up from 7th block
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const StakeStacker = {
    version: '1.2.0', // Physics wobble + wind + near-miss feedback
    gameId: 'stakestacker',
    state: null,
    canvas: null,
    ctx: null,
    timing: null,
    juice: null,

    // Block visual varieties
    blockPatterns: ['solid', 'gradient', 'striped', 'glow'],

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
            blocks: [],
            currentBlock: null,
            baseWidth: 233,       // fib[11]
            blockHeight: 34,      // fib[8]
            direction: 1,
            speed: 5,             // fib[4]
            perfectStreak: 0,
            cameraOffset: 0,
            // Perfect streak bonus: Fibonacci scaling
            streakMultiplier: 1,
            // Physics wobble
            wobble: {
                angle: 0,
                velocity: 0,
                damping: 0.95,
                stiffness: 0.03,
                maxAngle: 0.05 // Max wobble angle in radians
            },
            // Wind system (increases with height)
            wind: {
                strength: 0,
                direction: 1,
                changeTimer: 0,
                gustTimer: 0,
                gustStrength: 0
            },
            // Visual effects
            particles: [],
            perfectGlow: 0,
            lastDropOffset: 0, // For near-miss feedback
            frameCount: 0
        };

        this.createArena(arena);
        this.canvas = document.getElementById('ss-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Initialize timing for frame-independent movement
        this.timing = GameTiming.create();

        this.setupInput();

        // Initialize with small delay to ensure DOM is ready
        setTimeout(() => {
            this.resizeCanvas();
            this.initGame();
            this.gameLoop();
        }, 50);

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
            <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 50%,#1a1a2e 100%);">
                <canvas id="ss-canvas" style="width:100%;height:100%;"></canvas>
                <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:15px;">
                    <div style="background:rgba(0,0,0,0.5);padding:8px 14px;border-radius:8px;">
                        <span style="color:var(--gold);">&#128176; <span id="ss-score">0</span></span>
                    </div>
                    <div style="background:rgba(0,0,0,0.5);padding:8px 14px;border-radius:8px;">
                        <span style="color:var(--purple);">&#127959; <span id="ss-level">0</span></span>
                    </div>
                    <div id="ss-streak" style="display:none;background:linear-gradient(135deg,#f97316,#fbbf24);padding:8px 14px;border-radius:8px;">
                        <span style="color:white;font-weight:bold;">&#128293; x<span id="ss-streak-count">0</span></span>
                    </div>
                </div>
                <div id="ss-wind" style="position:absolute;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.4);padding:4px 12px;border-radius:12px;font-size:11px;display:none;">
                    <span style="color:#60a5fa;">&#127788; Wind: <span id="ss-wind-dir">←</span> <span id="ss-wind-strength">0</span></span>
                </div>
                <div id="ss-feedback" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:28px;font-weight:bold;opacity:0;transition:opacity 0.3s;pointer-events:none;text-shadow:0 0 20px currentColor;"></div>
                <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:12px;">
                    CLICK or SPACE to drop block
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
    },

    /**
     * Initialize game
     */
    initGame() {
        this.state.blocks = [];
        this.state.level = 0;
        this.state.score = 0;
        this.state.gameOver = false;
        this.state.perfectStreak = 0;

        if (this.canvas.width === 0 || this.canvas.height === 0) {
            this.resizeCanvas();
        }

        // Base block (centered at bottom)
        const baseX = (this.canvas.width - this.state.baseWidth) / 2;
        const baseY = this.canvas.height - 60;

        this.state.blocks.push({
            x: baseX,
            y: baseY,
            width: this.state.baseWidth,
            height: this.state.blockHeight,
            color: this.getBlockColor(0),
            pattern: 'solid',
            perfect: false
        });

        document.getElementById('ss-score').textContent = '0';
        document.getElementById('ss-level').textContent = '0';
        document.getElementById('ss-streak').style.display = 'none';
        document.getElementById('ss-wind').style.display = 'none';

        this.spawnBlock();
    },

    /**
     * Show feedback message
     */
    showFeedback(text, color) {
        const feedback = document.getElementById('ss-feedback');
        if (!feedback) return;
        feedback.textContent = text;
        feedback.style.color = color;
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 800);
    },

    /**
     * Spawn particles
     */
    spawnParticles(x, y, color, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            this.state.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 30 + Math.random() * 20,
                color: color,
                size: 3 + Math.random() * 3
            });
        }
    },

    /**
     * Update wind system
     */
    updateWind(dt) {
        const wind = this.state.wind;

        // Wind only starts at level 5
        if (this.state.level < 5) {
            wind.strength = 0;
            return;
        }

        // Show wind indicator
        document.getElementById('ss-wind').style.display = 'block';

        // Base wind strength increases with height (max at level 15)
        const heightFactor = Math.min((this.state.level - 5) / 10, 1);
        const baseStrength = heightFactor * 2;

        // Change wind direction periodically
        wind.changeTimer += dt;
        if (wind.changeTimer > 180) { // Every 3 seconds at 60fps
            wind.changeTimer = 0;
            wind.direction = Math.random() > 0.5 ? 1 : -1;
        }

        // Random gusts
        wind.gustTimer += dt;
        if (wind.gustTimer > 60 && Math.random() < 0.02) {
            wind.gustStrength = (Math.random() * 1.5) * heightFactor;
            wind.gustTimer = 0;
        }
        wind.gustStrength *= 0.95; // Decay

        wind.strength = (baseStrength + wind.gustStrength) * wind.direction;

        // Update UI
        const dirEl = document.getElementById('ss-wind-dir');
        const strEl = document.getElementById('ss-wind-strength');
        if (dirEl) dirEl.textContent = wind.direction > 0 ? '→' : '←';
        if (strEl) strEl.textContent = Math.abs(wind.strength).toFixed(1);
    },

    /**
     * Get block color by index
     */
    getBlockColor(index) {
        const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];
        return colors[index % colors.length];
    },

    /**
     * Spawn a new block
     */
    spawnBlock() {
        const lastBlock = this.state.blocks[this.state.blocks.length - 1];
        this.state.level++;

        // Pick block pattern based on streak
        const pattern = this.state.perfectStreak >= 3 ? 'glow' :
                       this.blockPatterns[this.state.level % this.blockPatterns.length];

        this.state.currentBlock = {
            x: 0,
            y: lastBlock.y - this.state.blockHeight - 5,
            width: lastBlock.width,
            height: this.state.blockHeight,
            color: this.getBlockColor(this.state.level),
            pattern: pattern,
            perfect: false
        };

        this.state.direction = 1;
        this.state.speed = Math.min(12, 5 + this.state.level * 0.5);

        document.getElementById('ss-level').textContent = this.state.level;

        // From the 7th block, progressively scroll camera up
        if (this.state.level >= 7) {
            const targetOffset = (this.state.level - 6) * (this.state.blockHeight + 5);
            this.state.cameraOffset = targetOffset;
        }
    },

    /**
     * Drop the current block
     */
    dropBlock() {
        if (!this.state.currentBlock || this.state.gameOver) return;

        const current = this.state.currentBlock;
        const last = this.state.blocks[this.state.blocks.length - 1];

        // Calculate overlap
        const overlapStart = Math.max(current.x, last.x);
        const overlapEnd = Math.min(current.x + current.width, last.x + last.width);
        const overlapWidth = overlapEnd - overlapStart;
        const offset = Math.abs(current.x - last.x);

        this.state.lastDropOffset = offset;

        if (overlapWidth <= 0) {
            // Missed completely
            this.showFeedback('MISS!', '#ef4444');
            this.state.gameOver = true;

            // Add wobble on miss
            this.state.wobble.velocity = 0.1 * (current.x < last.x ? 1 : -1);

            endGame(this.gameId, this.state.score);
            return;
        }

        // Determine precision level
        const isPerfect = offset < 3;
        const isGreat = !isPerfect && offset < 10;
        const isGood = !isPerfect && !isGreat && offset < 20;

        // Update streak display
        const streakEl = document.getElementById('ss-streak');
        const streakCountEl = document.getElementById('ss-streak-count');

        if (isPerfect) {
            this.state.perfectStreak++;
            const fibBonus = [1, 1, 2, 3, 5, 8, 13][Math.min(this.state.perfectStreak, 6)];
            this.state.score += 50 + fibBonus * 10;
            current.x = last.x;
            current.width = last.width;
            current.perfect = true;

            // Feedback
            if (this.state.perfectStreak >= 3) {
                this.showFeedback(`🔥 PERFECT x${this.state.perfectStreak}!`, '#fbbf24');
            } else {
                this.showFeedback('✨ PERFECT!', '#22c55e');
            }

            // Particles
            this.spawnParticles(current.x + current.width / 2, current.y, '#fbbf24', 12);
            this.state.perfectGlow = 30;

            // Update streak UI
            if (this.state.perfectStreak >= 2) {
                streakEl.style.display = 'block';
                streakCountEl.textContent = this.state.perfectStreak;
            }

            // Minimal wobble on perfect
            this.state.wobble.velocity += 0.01;
        } else {
            this.state.perfectStreak = 0;
            streakEl.style.display = 'none';

            const baseScore = Math.floor(overlapWidth / 2);
            this.state.score += baseScore;
            current.x = overlapStart;
            current.width = overlapWidth;
            current.perfect = false;

            // Feedback based on precision
            if (isGreat) {
                this.showFeedback('GREAT!', '#3b82f6');
                this.spawnParticles(current.x + current.width / 2, current.y, '#3b82f6', 6);
            } else if (isGood) {
                this.showFeedback('GOOD', '#a855f7');
            } else {
                this.showFeedback(`${Math.floor(overlapWidth)}px`, '#9ca3af');
            }

            // Add wobble based on how off-center the drop was
            const wobbleStrength = Math.min(offset / 100, 0.08);
            this.state.wobble.velocity += wobbleStrength * (current.x < last.x ? 1 : -1);
        }

        this.state.blocks.push({ ...current });
        document.getElementById('ss-score').textContent = this.state.score;
        updateScore(this.gameId, this.state.score);

        if (current.width < 10) {
            this.showFeedback('TOO SMALL!', '#ef4444');
            this.state.gameOver = true;
            endGame(this.gameId, this.state.score);
            return;
        }

        this.spawnBlock();
    },

    /**
     * Update game state
     * @param {number} dt - Delta time normalized to 60fps
     */
    update(dt) {
        if (this.state.gameOver || !this.state.currentBlock) return;

        this.state.frameCount += dt;

        // Update wind system
        this.updateWind(dt);

        // Apply wind to current block movement
        const windEffect = this.state.wind.strength * 0.3;
        this.state.currentBlock.x += (this.state.speed * this.state.direction + windEffect) * dt;

        // Bounce off edges
        if (this.state.currentBlock.x + this.state.currentBlock.width > this.canvas.width) {
            this.state.direction = -1;
            this.state.currentBlock.x = this.canvas.width - this.state.currentBlock.width;
        } else if (this.state.currentBlock.x < 0) {
            this.state.direction = 1;
            this.state.currentBlock.x = 0;
        }

        // Update wobble physics (spring simulation)
        const wobble = this.state.wobble;
        const targetAngle = 0;
        const force = (targetAngle - wobble.angle) * wobble.stiffness;
        wobble.velocity += force;
        wobble.velocity *= wobble.damping;
        wobble.angle += wobble.velocity;
        wobble.angle = Math.max(-wobble.maxAngle, Math.min(wobble.maxAngle, wobble.angle));

        // Update particles
        this.state.particles = this.state.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.life--;
            p.size *= 0.97;
            return p.life > 0 && p.size > 0.5;
        });

        // Decay perfect glow
        if (this.state.perfectGlow > 0) {
            this.state.perfectGlow--;
        }
    },

    /**
     * Draw a block with pattern
     */
    drawBlock(block, index) {
        const ctx = this.ctx;
        const { x, y, width, height, color, pattern, perfect } = block;

        // Glow effect for perfect blocks
        if (perfect || pattern === 'glow') {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
        }

        // Draw based on pattern
        switch (pattern) {
            case 'gradient': {
                const gradient = ctx.createLinearGradient(x, y, x, y + height);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, this.adjustColor(color, -40));
                ctx.fillStyle = gradient;
                break;
            }
            case 'striped': {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, width, height);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                for (let sx = 0; sx < width; sx += 8) {
                    ctx.fillRect(x + sx, y, 4, height);
                }
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                return; // Already drawn
            }
            case 'glow': {
                const glowGradient = ctx.createRadialGradient(
                    x + width / 2, y + height / 2, 0,
                    x + width / 2, y + height / 2, width / 2
                );
                glowGradient.addColorStop(0, this.adjustColor(color, 30));
                glowGradient.addColorStop(1, color);
                ctx.fillStyle = glowGradient;
                break;
            }
            default:
                ctx.fillStyle = color;
        }

        ctx.fillRect(x, y, width, height);
        ctx.shadowBlur = 0;

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // APY label
        if (index > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${(index * 2.5).toFixed(1)}% APY`, x + width / 2, y + 22);
        }
    },

    /**
     * Adjust color brightness
     */
    adjustColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply camera offset (scroll up from 7th block)
        ctx.save();
        ctx.translate(0, this.state.cameraOffset);

        // Apply wobble rotation (pivot at tower base)
        if (this.state.blocks.length > 0) {
            const baseBlock = this.state.blocks[0];
            const pivotX = baseBlock.x + baseBlock.width / 2;
            const pivotY = baseBlock.y + baseBlock.height;
            ctx.translate(pivotX, pivotY);
            ctx.rotate(this.state.wobble.angle);
            ctx.translate(-pivotX, -pivotY);
        }

        // Draw stacked blocks with patterns
        this.state.blocks.forEach((block, i) => {
            this.drawBlock(block, i);
        });

        // Draw current block (no wobble applied)
        ctx.restore();
        ctx.save();
        ctx.translate(0, this.state.cameraOffset);

        if (this.state.currentBlock) {
            const curr = this.state.currentBlock;

            // Pulsing glow when streak active
            if (this.state.perfectGlow > 0) {
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 10 + Math.sin(this.state.frameCount * 0.2) * 5;
            }

            ctx.fillStyle = curr.color;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(curr.x, curr.y, curr.width, curr.height);
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(curr.x, curr.y, curr.width, curr.height);

            // Wind indicator on block
            if (this.state.wind.strength !== 0) {
                ctx.fillStyle = '#60a5fa';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                const windArrow = this.state.wind.direction > 0 ? '→' : '←';
                ctx.fillText(windArrow, curr.x + curr.width / 2, curr.y - 5);
            }
        }

        ctx.restore();

        // Draw particles (screen space, no camera offset)
        ctx.save();
        ctx.translate(0, this.state.cameraOffset);
        this.state.particles.forEach(p => {
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 50;
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.restore();

        // Height indicator (fixed position)
        if (this.state.level >= 7) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Tower Height: ${this.state.level} blocks`, this.canvas.width / 2, this.canvas.height - 40);
        }
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
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleInput = (e) => {
            if (e.type === 'keydown' && e.code !== 'Space') return;
            e.preventDefault();
            self.dropBlock();
        };

        document.addEventListener('keydown', this.handleInput);
        this.canvas.addEventListener('click', this.handleInput);
    },

    /**
     * Stop the game
     */
    stop() {
        this.state.gameOver = true;
        document.removeEventListener('keydown', this.handleInput);
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.handleInput);
        }
        this.canvas = null;
        this.ctx = null;
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.StakeStacker = StakeStacker;
}
