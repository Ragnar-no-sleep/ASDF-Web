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
    version: '1.1.0', // Fibonacci timing
    gameId: 'stakestacker',
    state: null,
    canvas: null,
    ctx: null,
    timing: null,
    juice: null,

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
                <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:20px;">
                    <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--gold);">Score: <span id="ss-score">0</span></span>
                    </div>
                    <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                        <span style="color:var(--purple);">Height: <span id="ss-level">0</span></span>
                    </div>
                </div>
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
        });

        document.getElementById('ss-score').textContent = '0';
        document.getElementById('ss-level').textContent = '0';

        this.spawnBlock();
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

        this.state.currentBlock = {
            x: 0,
            y: lastBlock.y - this.state.blockHeight - 5,
            width: lastBlock.width,
            height: this.state.blockHeight,
            color: this.getBlockColor(this.state.level),
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

        if (overlapWidth <= 0) {
            // Missed completely
            this.state.gameOver = true;
            endGame(this.gameId, this.state.score);
            return;
        }

        // Perfect or partial?
        const isPerfect = Math.abs(current.x - last.x) < 5;

        if (isPerfect) {
            this.state.perfectStreak++;
            this.state.score += 50 + this.state.perfectStreak * 10;
            current.x = last.x;
            current.width = last.width;
        } else {
            this.state.perfectStreak = 0;
            this.state.score += Math.floor(overlapWidth / 2);
            current.x = overlapStart;
            current.width = overlapWidth;
        }

        this.state.blocks.push({ ...current });
        document.getElementById('ss-score').textContent = this.state.score;
        updateScore(this.gameId, this.state.score);

        if (current.width < 10) {
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

        this.state.currentBlock.x += this.state.speed * this.state.direction * dt;

        if (this.state.currentBlock.x + this.state.currentBlock.width > this.canvas.width) {
            this.state.direction = -1;
        } else if (this.state.currentBlock.x < 0) {
            this.state.direction = 1;
        }
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

        // Draw stacked blocks
        this.state.blocks.forEach((block, i) => {
            ctx.fillStyle = block.color;
            ctx.fillRect(block.x, block.y, block.width, block.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(block.x, block.y, block.width, block.height);

            // APY label
            if (i > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${(i * 2.5).toFixed(1)}% APY`, block.x + block.width / 2, block.y + 22);
            }
        });

        // Draw current block
        if (this.state.currentBlock) {
            ctx.fillStyle = this.state.currentBlock.color;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(
                this.state.currentBlock.x,
                this.state.currentBlock.y,
                this.state.currentBlock.width,
                this.state.currentBlock.height
            );
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(
                this.state.currentBlock.x,
                this.state.currentBlock.y,
                this.state.currentBlock.width,
                this.state.currentBlock.height
            );
        }

        ctx.restore();

        // Perfect streak indicator (fixed position)
        if (this.state.perfectStreak > 1) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 ${this.state.perfectStreak}x PERFECT!`, this.canvas.width / 2, 80);
        }

        // Height indicator
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
