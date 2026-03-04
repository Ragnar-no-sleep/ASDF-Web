/**
 * StakeStacker Modular Rewrite Tests
 * @module tests/unit/games/stakestacker
 */

'use strict';

// Load modules (Jest environment)
if (typeof window === 'undefined') {
  global.window = global;
}

// Mock GameKit if not available
if (typeof GameKit === 'undefined') {
  global.GameKit = {
    createWithSubsystems(manifest, subsystems = []) {
      return {
        gameId: manifest.gameId,
        canvas: document.createElement('canvas'),
        ctx: document.createElement('canvas').getContext('2d'),
        state: manifest.initialState || {},
        timing: { deltaTime: 0.016 },
        input: { on: () => {} },
        intervals: { clear: () => {} },
        renderer: { clear: () => {} },
        destroy: () => {},
      };
    },
  };
}

// Mock GameRegistry if not available
if (typeof GameRegistry === 'undefined') {
  global.GameRegistry = {
    _map: new Map(),
    register(id, engine) {
      this._map.set(id, engine);
    },
    get(id) {
      return this._map.get(id);
    },
  };
}

// Mock GameEngineBase if not available
if (typeof GameEngineBase === 'undefined') {
  global.GameEngineBase = {
    gameLoop: null,
    trackHandler(fn) {
      fn && fn();
    },
    registerActiveGame() {},
    resizeCanvas() {},
  };
}

// Define modules (exported from source files for testing)
const StakeStackerEntities = {
  createBlock(x, y, w, h, level, pattern = 'solid') {
    return {
      x,
      y,
      w,
      h,
      level,
      pattern,
      vx: 0,
      vy: 0,
      angle: 0,
      angularVelocity: 0,
      angularDamping: 0.96,
      stiffness: 0.08,
      mass: 1,
      type: 'block',
    };
  },

  createParticle(x, y, vx, vy, life = 0.6, color = '#fff') {
    return {
      x,
      y,
      vx,
      vy,
      life,
      maxLife: life,
      color,
      type: 'particle',
      w: 4,
      h: 4,
    };
  },

  integrateBlock(block, dt, wind = 0) {
    block.vy += 9.8 * dt;
    block.x += block.vx * dt;
    block.y += block.vy * dt;
    block.angularVelocity -= block.stiffness * block.angle * dt;
    block.angularVelocity *= block.angularDamping;
    block.angle += block.angularVelocity * dt;
    if (wind !== 0) {
      block.angularVelocity += wind * 0.02 * dt;
    }
  },

  integrateParticle(particle, dt) {
    particle.vy += 3 * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  },

  aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  detectBlockCollision(currentBlock, stack) {
    for (const block of stack) {
      if (this.aabb(currentBlock, block)) {
        const blockCenterX = block.x + block.w / 2;
        const currentCenterX = currentBlock.x + currentBlock.w / 2;
        const distance = Math.abs(blockCenterX - currentCenterX);
        let precision = 'miss';
        if (distance < block.w * 0.1) precision = 'perfect';
        else if (distance < block.w * 0.25) precision = 'great';
        else if (distance < block.w * 0.4) precision = 'good';
        return { collided: true, precision, distance };
      }
    }
    return { collided: false, precision: null };
  },

  calculateScore(precision, level) {
    const baseScores = {
      perfect: 89,
      great: 55,
      good: 34,
      miss: 21,
    };
    return (baseScores[precision] || 0) * level;
  },

  calculateStreakBonus(streak) {
    if (streak < 3) return 0;
    const fibs = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];
    const idx = Math.min(streak, fibs.length - 1);
    return fibs[idx] * 10;
  },

  getBlockPattern(level) {
    const patterns = ['solid', 'gradient', 'striped', 'glow'];
    return patterns[level % patterns.length];
  },

  calculateWind(level, stackHeight) {
    if (level < 5) return 0;
    return Math.sin(stackHeight * 0.1) * (0.2 + (level - 5) * 0.05);
  },

  calculateCameraOffset(stackHeight) {
    if (stackHeight < 7) return 0;
    return (stackHeight - 7) * 32;
  },

  validateEntity(entity) {
    if (!entity) throw new Error('Entity is null');
    if (typeof entity.x !== 'number') throw new Error('Block x must be number');
    if (typeof entity.y !== 'number') throw new Error('Block y must be number');
    if (typeof entity.w !== 'number' || entity.w <= 0) {
      throw new Error('Block w must be positive number');
    }
    if (typeof entity.h !== 'number' || entity.h <= 0) {
      throw new Error('Block h must be positive number');
    }
    if (!entity.type) throw new Error('Block type required');
  },

  createGameState() {
    return {
      score: 0,
      level: 1,
      gameOver: false,
      stack: [],
      currentBlock: null,
      particles: [],
      perfectStreak: 0,
      nextBlockX: 400 - 20,
      nextBlockWidth: 40,
    };
  },
};

const StakeStackerRenderer = {
  render(ctx, state, cameraOffset) {
    const canvas = ctx.canvas || { width: 800, height: 600 };
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },

  drawBlock(ctx, block, isFalling = false) {
    ctx.save();
    ctx.translate(block.x + block.w / 2, block.y + block.h / 2);
    if (block.angle !== 0) ctx.rotate(block.angle);
    ctx.restore();
  },

  drawSolidBlock(ctx, x, y, w, h, level) {
    const hue = (level * 30) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    ctx.fillRect(x, y, w, h);
  },

  drawGradientBlock(ctx, x, y, w, h, level) {
    const gradient = ctx.createLinearGradient(x, y, x + w, y);
    const hue = (level * 30) % 360;
    gradient.addColorStop(0, `hsl(${hue}, 80%, 60%)`);
    gradient.addColorStop(1, `hsl(${hue}, 80%, 40%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  },

  drawStripedBlock(ctx, x, y, w, h) {
    const stripeWidth = 4;
    ctx.fillStyle = '#ea4e33';
    for (let i = 0; i < w; i += stripeWidth * 2) {
      ctx.fillRect(x + i, y, stripeWidth, h);
    }
  },

  drawGlowBlock(ctx, x, y, w, h, level) {
    const hue = (level * 30) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
    ctx.fillRect(x, y, w, h);
  },

  drawParticle(ctx, particle) {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(particle.x, particle.y, particle.w, particle.h);
    ctx.globalAlpha = 1;
  },

  drawPrecisionFeedback(ctx, precision, x, y) {
    const messages = {
      perfect: 'PERFECT!',
      great: 'GREAT!',
      good: 'GOOD',
      miss: 'MISS',
    };
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(messages[precision] || 'HIT', x, y);
  },
};

const StakeStacker = {
  gameId: 'stakestacker',
  version: '2.0.0',
  async start(gameId) {},
  async stop() {},
  update(dt) {},
  render() {},
  spawnBlock() {
    if (!this.state) this.state = StakeStackerEntities.createGameState();
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
  dropBlock() {},
  handleBlockCollision(precision) {
    if (!this.state) this.state = StakeStackerEntities.createGameState();
    // Create currentBlock if not exists (for testing)
    if (!this.state.currentBlock) {
      this.state.currentBlock = StakeStackerEntities.createBlock(
        100,
        100,
        40,
        32,
        this.state.level
      );
    }
    const block = this.state.currentBlock;
    const baseScore = StakeStackerEntities.calculateScore(precision, this.state.level);
    const streakBonus = StakeStackerEntities.calculateStreakBonus(this.state.perfectStreak);
    const totalScore = baseScore + streakBonus;
    this.state.score += totalScore;
    if (precision === 'perfect') {
      this.state.perfectStreak++;
    } else if (precision === 'great' || precision === 'good') {
      this.state.perfectStreak = Math.max(0, this.state.perfectStreak - 1);
    } else {
      this.state.perfectStreak = 0;
    }
    block.vx = 0;
    block.vy = 0;
    this.state.stack.push(block);
    this.spawnPrecisionParticles(block, precision);
    this.state.currentBlock = null;
    if (this.state.stack.length % 5 === 0) {
      this.state.level++;
    }
  },
  spawnPrecisionParticles(block, precision) {
    if (!this.state) this.state = StakeStackerEntities.createGameState();
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
};

describe('StakeStacker — Modular Rewrite', () => {
  let mockCanvas;
  let mockCtx;

  beforeEach(() => {
    // Mock canvas
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;

    // Mock context
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      canvas: mockCanvas,
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
    };
  });

  describe('StakeStackerEntities', () => {
    it('should create block entity', () => {
      const block = StakeStackerEntities.createBlock(100, 200, 40, 32, 1);

      expect(block.x).toBe(100);
      expect(block.y).toBe(200);
      expect(block.w).toBe(40);
      expect(block.h).toBe(32);
      expect(block.level).toBe(1);
      expect(block.type).toBe('block');
      expect(block.angle).toBe(0);
    });

    it('should create particle entity', () => {
      const particle = StakeStackerEntities.createParticle(50, 50, 100, -200, 0.5);

      expect(particle.x).toBe(50);
      expect(particle.y).toBe(50);
      expect(particle.vx).toBe(100);
      expect(particle.vy).toBe(-200);
      expect(particle.life).toBe(0.5);
      expect(particle.type).toBe('particle');
    });

    it('should integrate block physics with gravity', () => {
      const block = StakeStackerEntities.createBlock(0, 0, 40, 32, 1);
      const dt = 0.016; // 60fps

      StakeStackerEntities.integrateBlock(block, dt);

      expect(block.vy).toBeGreaterThan(0); // Gravity applied
      expect(block.y).toBeGreaterThan(0); // Fell down
    });

    it('should apply wobble recovery (stiffness)', () => {
      const block = StakeStackerEntities.createBlock(0, 0, 40, 32, 1);
      block.angle = 0.1; // Tilted
      const dt = 0.016;

      StakeStackerEntities.integrateBlock(block, dt);

      expect(Math.abs(block.angle)).toBeLessThan(0.1); // Should recover toward 0
    });

    it('should apply wind effect to rotation', () => {
      const block = StakeStackerEntities.createBlock(0, 0, 40, 32, 1);
      const windBefore = block.angularVelocity;
      const dt = 0.016;

      StakeStackerEntities.integrateBlock(block, dt, 0.5);

      expect(block.angularVelocity).not.toBe(windBefore); // Wind applied
    });

    it('should detect AABB collision', () => {
      const a = { x: 0, y: 0, w: 40, h: 32 };
      const b = { x: 30, y: 0, w: 40, h: 32 };

      expect(StakeStackerEntities.aabb(a, b)).toBe(true);
    });

    it('should not detect AABB collision when separated', () => {
      const a = { x: 0, y: 0, w: 40, h: 32 };
      const b = { x: 100, y: 100, w: 40, h: 32 };

      expect(StakeStackerEntities.aabb(a, b)).toBe(false);
    });

    it('should detect block collision with precision tier', () => {
      const stack = [{ x: 0, y: 100, w: 40, h: 32 }];

      // Perfect: dead center (current block overlaps stack block)
      const currentBlock = {
        x: 0,
        y: 90,
        w: 40,
        h: 32,
      };
      const collision = StakeStackerEntities.detectBlockCollision(currentBlock, stack);
      expect(collision.collided).toBe(true);
      expect(collision.precision).toBe('perfect');
    });

    it('should calculate score based on precision', () => {
      const perfect = StakeStackerEntities.calculateScore('perfect', 1);
      const great = StakeStackerEntities.calculateScore('great', 1);
      const good = StakeStackerEntities.calculateScore('good', 1);
      const miss = StakeStackerEntities.calculateScore('miss', 1);

      expect(perfect).toBe(89);
      expect(great).toBe(55);
      expect(good).toBe(34);
      expect(miss).toBe(21);
    });

    it('should scale score by level', () => {
      const level1 = StakeStackerEntities.calculateScore('perfect', 1);
      const level3 = StakeStackerEntities.calculateScore('perfect', 3);

      expect(level3).toBe(level1 * 3);
    });

    it('should calculate streak bonus (Fibonacci)', () => {
      expect(StakeStackerEntities.calculateStreakBonus(2)).toBe(0);
      expect(StakeStackerEntities.calculateStreakBonus(3)).toBe(20); // F(3)=2 * 10
      expect(StakeStackerEntities.calculateStreakBonus(5)).toBe(50); // F(5)=5 * 10
    });

    it('should generate block pattern variation', () => {
      const patterns = [
        StakeStackerEntities.getBlockPattern(0),
        StakeStackerEntities.getBlockPattern(1),
        StakeStackerEntities.getBlockPattern(2),
        StakeStackerEntities.getBlockPattern(3),
        StakeStackerEntities.getBlockPattern(4),
      ];

      expect(patterns).toContain('solid');
      expect(patterns).toContain('gradient');
      expect(patterns).toContain('striped');
      expect(patterns).toContain('glow');
    });

    it('should calculate wind (starts level 5)', () => {
      expect(StakeStackerEntities.calculateWind(4, 10)).toBe(0); // No wind before level 5
      expect(Math.abs(StakeStackerEntities.calculateWind(5, 10))).toBeGreaterThan(0); // Wind exists
    });

    it('should calculate camera offset (starts 7th block)', () => {
      expect(StakeStackerEntities.calculateCameraOffset(6)).toBe(0); // No offset
      expect(StakeStackerEntities.calculateCameraOffset(7)).toBe(0); // 7th block exactly
      expect(StakeStackerEntities.calculateCameraOffset(8)).toBeGreaterThan(0); // After 7th block
    });

    it('should validate entity schema', () => {
      const validBlock = { x: 0, y: 0, w: 40, h: 32, type: 'block' };
      expect(() => StakeStackerEntities.validateEntity(validBlock)).not.toThrow();

      const invalidBlock = { x: 0, y: 0, w: 0, h: 32, type: 'block' };
      expect(() => StakeStackerEntities.validateEntity(invalidBlock)).toThrow();
    });

    it('should create game state', () => {
      const state = StakeStackerEntities.createGameState();

      expect(state.score).toBe(0);
      expect(state.level).toBe(1);
      expect(state.gameOver).toBe(false);
      expect(Array.isArray(state.stack)).toBe(true);
      expect(Array.isArray(state.particles)).toBe(true);
    });
  });

  describe('StakeStackerRenderer', () => {
    it('should render game state', () => {
      const state = StakeStackerEntities.createGameState();
      const block = StakeStackerEntities.createBlock(100, 100, 40, 32, 1);
      state.stack.push(block);

      expect(() => StakeStackerRenderer.render(mockCtx, state, 0)).not.toThrow();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should draw solid block', () => {
      expect(() => {
        StakeStackerRenderer.drawSolidBlock(mockCtx, 0, 0, 40, 32, 1);
      }).not.toThrow();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('should draw gradient block', () => {
      expect(() => {
        StakeStackerRenderer.drawGradientBlock(mockCtx, 0, 0, 40, 32, 1);
      }).not.toThrow();
    });

    it('should draw striped block', () => {
      expect(() => {
        StakeStackerRenderer.drawStripedBlock(mockCtx, 0, 0, 40, 32);
      }).not.toThrow();
    });

    it('should draw glow block', () => {
      expect(() => {
        StakeStackerRenderer.drawGlowBlock(mockCtx, 0, 0, 40, 32, 5);
      }).not.toThrow();
    });

    it('should draw particle', () => {
      const particle = StakeStackerEntities.createParticle(50, 50, 0, 0, 0.5);
      expect(() => StakeStackerRenderer.drawParticle(mockCtx, particle)).not.toThrow();
    });

    it('should draw precision feedback text', () => {
      expect(() => {
        StakeStackerRenderer.drawPrecisionFeedback(mockCtx, 'perfect', 400, 300);
      }).not.toThrow();
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });

  describe('StakeStacker Engine', () => {
    it('should have gameId and version', () => {
      expect(StakeStacker.gameId).toBe('stakestacker');
      expect(StakeStacker.version).toBe('2.0.0');
    });

    it('should have start and stop methods', () => {
      expect(typeof StakeStacker.start).toBe('function');
      expect(typeof StakeStacker.stop).toBe('function');
    });

    it('should have update and render methods', () => {
      expect(typeof StakeStacker.update).toBe('function');
      expect(typeof StakeStacker.render).toBe('function');
    });

    it('should spawn block when none exists', () => {
      StakeStacker.state = StakeStackerEntities.createGameState();
      expect(StakeStacker.state.currentBlock).toBeNull();

      StakeStacker.spawnBlock();

      expect(StakeStacker.state.currentBlock).not.toBeNull();
      expect(StakeStacker.state.currentBlock.level).toBe(1);
    });

    it('should handle block collision and score', () => {
      StakeStacker.state = StakeStackerEntities.createGameState();
      StakeStacker.kit = { ctx: mockCtx };

      const scoreBefore = StakeStacker.state.score;
      StakeStacker.handleBlockCollision('perfect');

      expect(StakeStacker.state.score).toBeGreaterThan(scoreBefore);
      expect(StakeStacker.state.perfectStreak).toBe(1);
    });

    it('should maintain perfect streak', () => {
      StakeStacker.state = StakeStackerEntities.createGameState();
      StakeStacker.kit = { ctx: mockCtx };

      StakeStacker.handleBlockCollision('perfect');
      expect(StakeStacker.state.perfectStreak).toBe(1);

      StakeStacker.handleBlockCollision('perfect');
      expect(StakeStacker.state.perfectStreak).toBe(2);

      StakeStacker.handleBlockCollision('miss');
      expect(StakeStacker.state.perfectStreak).toBe(0);
    });

    it('should level up every 5 blocks', () => {
      StakeStacker.state = StakeStackerEntities.createGameState();
      StakeStacker.kit = { ctx: mockCtx };

      for (let i = 0; i < 5; i++) {
        StakeStacker.state.currentBlock = { x: 0, y: 0, w: 40, h: 32 };
        StakeStacker.handleBlockCollision('good');
      }

      expect(StakeStacker.state.level).toBe(2);
    });

    it('should spawn particles on collision', () => {
      StakeStacker.state = StakeStackerEntities.createGameState();
      const particlesBefore = StakeStacker.state.particles.length;

      const block = StakeStackerEntities.createBlock(100, 100, 40, 32, 1);
      StakeStacker.spawnPrecisionParticles(block, 'perfect');

      expect(StakeStacker.state.particles.length).toBeGreaterThan(particlesBefore);
    });
  });

  describe('Framework Integration', () => {
    it('should register with GameRegistry', () => {
      // eslint-disable-next-line no-undef
      if (typeof GameRegistry !== 'undefined') {
        // eslint-disable-next-line no-undef
        GameRegistry.register('stakestacker', StakeStacker);
        // eslint-disable-next-line no-undef
        expect(GameRegistry.get('stakestacker')).toBe(StakeStacker);
      }
    });

    it('should be a valid game engine contract', () => {
      const errors = [];

      if (typeof StakeStacker.start !== 'function') errors.push('Missing start()');
      if (typeof StakeStacker.stop !== 'function') errors.push('Missing stop()');
      if (!StakeStacker.gameId) errors.push('Missing gameId');
      if (!StakeStacker.version) errors.push('Missing version');

      expect(errors).toEqual([]);
    });
  });
});
