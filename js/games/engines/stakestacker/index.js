/**
 * StakeStacker Game Engine — Block stacking puzzle
 * Coordinator: wires GameKit subsystems + game loop
 * @module games/engines/stakestacker
 */

'use strict';

const StakeStacker = {
  gameId: 'stakestacker',
  version: '2.0.0', // Modular rewrite

  async start(gameId) {
    // Create game kit with required subsystems
    this.kit = GameKit.createWithSubsystems(
      {
        gameId: 'stakestacker',
        arenaSelector: '#ss-arena',
        inputConfig: {
          keys: ['space'],
          mouse: true,
        },
        initialState: StakeStackerEntities.createGameState(),
      },
      ['timing', 'input', 'intervals', 'renderer']
    );

    // Game state
    this.state = this.kit.state;

    // Input handlers
    this.kit.input.on('action', () => this.dropBlock());
    this.trackHandler(() =>
      document.addEventListener('keydown', e => {
        if (e.code === 'Space') {
          e.preventDefault();
          this.dropBlock();
        }
      })
    );

    // Game loop
    this.gameLoop = () => {
      const dt = this.kit.timing.deltaTime;

      if (!this.state.gameOver) {
        this.update(dt);
      }

      this.render();

      if (!this.state.gameOver) {
        requestAnimationFrame(this.gameLoop);
      }
    };

    // Start game loop
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(this.gameLoop);
    }
  },

  async stop() {
    // Cleanup
    if (this.kit) {
      this.kit.destroy();
    }
    this.state.gameOver = true;
  },

  /**
   * Game update: physics, collision, scoring
   */
  update(dt) {
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

    // Update particles
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      StakeStackerEntities.integrateParticle(p, dt);
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  },

  /**
   * Render game state
   */
  render() {
    const cameraOffset = StakeStackerEntities.calculateCameraOffset(this.state.stack.length);
    StakeStackerRenderer.render(this.kit.ctx, this.state, cameraOffset);
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
   * Spawn visual feedback particles
   */
  spawnPrecisionParticles(block, precision) {
    const count = { perfect: 12, great: 8, good: 4, miss: 2 }[precision] || 2;
    const color = {
      perfect: '#4ade80',
      great: '#f59e0b',
      good: '#60a5fa',
      miss: '#ef4444',
    }[precision];

    const centerX = block.x + block.w / 2;
    const centerY = block.y + block.h / 2;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 200 + Math.random() * 100;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.state.particles.push(
        StakeStackerEntities.createParticle(centerX, centerY, vx, vy, 0.5, color)
      );
    }
  },

  // GameEngineBase mixin methods (spread these in)
  gameLoop: null,
  trackHandler(fn) {
    // Track event handler for cleanup
    if (!this._handlers) this._handlers = [];
    this._handlers.push(fn);
  },
  registerActiveGame() {
    if (typeof GameStore !== 'undefined') {
      GameStore.setActiveGame(this.gameId);
    }
  },
  resizeCanvas() {
    if (this.kit && this.kit.canvas) {
      this.kit.canvas.width = window.innerWidth;
      this.kit.canvas.height = window.innerHeight;
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
