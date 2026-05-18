/**
 * StakeStacker Game Engine — Block stacking puzzle
 * Coordinator: GameEngineBase Zero-Allocation
 * @module games/engines/stakestacker
 */

'use strict';

const StakeStacker = {
  ...GameEngineBase,
  gameId: 'stakestacker',
  version: '2.0.1', // Zero-allocation rewrite

  start(gameId) {
    const arena = document.querySelector('#ss-arena');
    if (!arena) return;

    let canvas = arena.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ss-canvas';
      canvas.className = 'game-canvas';
      arena.appendChild(canvas);
    }

    this.init(gameId, canvas);
    this.resizeCanvas();

    this.state = StakeStackerEntities.createGameState();

    this.setupInput();

    // Start game loop (2026 Standard)
    this.gameLoop();

    this.registerActiveGame(gameId);
  },

  setupInput() {
    this.track(document, 'keydown', e => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.dropBlock();
      }
    });

    this.track(this.canvas, 'click', e => {
      e.preventDefault();
      this.dropBlock();
    });

    this.track(this.canvas, 'touchstart', e => {
      e.preventDefault();
      this.dropBlock();
    });

    // Resize handler
    this.track(window, 'resize', () => this.resizeCanvas());
  },

  stop() {
    GameEngineBase.stop.call(this);
  },

  /**
   * Game update: physics, collision, scoring
   */
  update(dt) {
    if (this.state.gameOver) return;

    // Spawn current block if none exists
    if (!this.state.currentBlock) {
      this.spawnBlock();
    }

    // Update current block physics
    const wind = StakeStackerEntities.calculateWind(this.state.level, this.state.stack.length);
    StakeStackerEntities.integrateBlock(this.state.currentBlock, dt, wind);

    // Check collision
    const collision = StakeStackerEntities.detectBlockCollision(
      this.state.currentBlock,
      this.state.stack
    );

    if (collision.collided) {
      this.handleBlockCollision(collision.precision);
    }

    // Check if block fell off (game over)
    if (this.state.currentBlock.y > 600) {
      this.state.gameOver = true;
    }

    // Update particles (Zero-Allocation Pool)
    if (this.state.particlePool) {
      const pool = this.state.particlePool;
      for (let i = 0; i < pool.capacity; i++) {
        if (pool.active[i] === 1) {
          const offset = i * pool.itemSize;
          const data = pool.data;

          data[offset + 3] += 3 * dt; // vy += gravity
          data[offset + 0] += data[offset + 2] * dt; // x += vx
          data[offset + 1] += data[offset + 3] * dt; // y += vy
          data[offset + 4] -= dt; // life -= dt

          if (data[offset + 4] <= 0) {
            pool.release(i);
          }
        }
      }
    } else {
      // Legacy fallback
      for (let i = this.state.particles.length - 1; i >= 0; i--) {
        const p = this.state.particles[i];
        StakeStackerEntities.integrateParticle(p, dt);
        if (p.life <= 0) {
          this.state.particles.splice(i, 1);
        }
      }
    }
  },

  /**
   * Render game state
   */
  draw(alpha) {
    if (this.state.gameOver) return; // Could render a game over screen here
    const cameraOffset = StakeStackerEntities.calculateCameraOffset(this.state.stack.length);
    StakeStackerRenderer.render(this.ctx, this.state, cameraOffset);
  },

  /**
   * Spawn new block at top
   */
  spawnBlock() {
    const pattern = StakeStackerEntities.getBlockPattern(this.state.level);
    this.state.currentBlock = StakeStackerEntities.createBlock(
      this.state.nextBlockX,
      -50,
      this.state.nextBlockWidth,
      32,
      this.state.level,
      pattern
    );
  },

  /**
   * Drop block manually (spacebar)
   */
  dropBlock() {
    if (this.state.currentBlock && !this.state.gameOver) {
      // Apply downward velocity
      this.state.currentBlock.vy = 500;
    }
  },

  /**
   * Handle collision: score, update stack, spawn particles
   */
  handleBlockCollision(precision) {
    const block = this.state.currentBlock;

    // Calculate score
    const baseScore = StakeStackerEntities.calculateScore(precision, this.state.level);
    const streakBonus = StakeStackerEntities.calculateStreakBonus(this.state.perfectStreak);
    const totalScore = baseScore + streakBonus;

    this.state.score += totalScore;

    // Update streak
    if (precision === 'perfect') {
      this.state.perfectStreak++;
    } else if (precision === 'great' || precision === 'good') {
      this.state.perfectStreak = Math.max(0, this.state.perfectStreak - 1);
    } else {
      this.state.perfectStreak = 0;
    }

    // Add block to stack
    block.vx = 0;
    block.vy = 0;
    this.state.stack.push(block);

    // Spawn particles
    this.spawnPrecisionParticles(block, precision);

    // Next block
    this.state.currentBlock = null;

    // Level up every 5 blocks
    if (this.state.stack.length % 5 === 0) {
      this.state.level++;
    }
  },

  /**
   * Spawn visual feedback particles (Zero-Allocation Pool)
   */
  spawnPrecisionParticles(block, precision) {
    const count = { perfect: 12, great: 8, good: 4, miss: 2 }[precision] || 2;
    const hexColor = {
      perfect: '#4ade80',
      great: '#f59e0b',
      good: '#60a5fa',
      miss: '#ef4444',
    }[precision];

    const centerX = block.x + block.w / 2;
    const centerY = block.y + block.h / 2;

    const colorInt = parseInt(hexColor.slice(1), 16);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 200 + Math.random() * 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      if (this.state.particlePool) {
        const idx = this.state.particlePool.acquire();
        if (idx !== -1) {
          const offset = idx * this.state.particlePool.itemSize;
          const data = this.state.particlePool.data;
          // itemSize 7: x, y, vx, vy, life, maxLife, colorInt
          data[offset + 0] = centerX;
          data[offset + 1] = centerY;
          data[offset + 2] = vx;
          data[offset + 3] = vy;
          data[offset + 4] = 0.6; // life
          data[offset + 5] = 0.6; // maxLife
          data[offset + 6] = colorInt; // color
        }
      } else {
        this.state.particles.push(
          StakeStackerEntities.createParticle(centerX, centerY, vx, vy, 0.6, hexColor)
        );
      }
    }
  },
};

// Spread GameEngineBase methods
if (typeof GameEngineBase !== 'undefined') {
  Object.assign(StakeStacker, GameEngineBase);
}

// Register with framework
if (typeof GameRegistry !== 'undefined') {
  GameRegistry.register('stakestacker', StakeStacker);
}

// Export
if (typeof window !== 'undefined') {
  window.StakeStacker = StakeStacker;
}
