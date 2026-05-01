/**
 * StakeStacker Game Entities — Block physics, particle effects, precision system
 * @module games/engines/stakestacker/entities
 */

'use strict';

const StakeStackerEntities = {
  /**
   * Create block entity
   * Wobble physics: angle + angular velocity + damping
   */
  createBlock(x, y, w, h, level, pattern = 'solid') {
    return {
      x,
      y,
      w,
      h,
      level,
      pattern, // 'solid', 'gradient', 'striped', 'glow'
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

  /**
   * Create particle for visual feedback
   */
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

  /**
   * Update block physics: wobble and gravity
   */
  integrateBlock(block, dt, wind = 0) {
    // Gravity
    block.vy += 9.8 * dt;
    block.x += block.vx * dt;
    block.y += block.vy * dt;

    // Wobble recovery (stiffness restores to 0 angle)
    block.angularVelocity -= block.stiffness * block.angle * dt;
    block.angularVelocity *= block.angularDamping;
    block.angle += block.angularVelocity * dt;

    // Wind effect (horizontal force on angle)
    if (wind !== 0) {
      block.angularVelocity += wind * 0.02 * dt;
    }
  },

  /**
   * Update particle: gravity, fade
   */
  integrateParticle(particle, dt) {
    particle.vy += 3 * dt; // Lighter gravity
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  },

  /**
   * AABB collision detection
   */
  aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  /**
   * Detect collision between currentBlock and stack
   * Returns collision info: { collided, precision }
   */
  detectBlockCollision(currentBlock, stack) {
    for (const block of stack) {
      if (this.aabb(currentBlock, block)) {
        // Calculate precision tier (perfect/great/good/miss)
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

  /**
   * Calculate score for precision tier
   * Fibonacci scaling: perfect=89, great=55, good=34, miss=21
   */
  calculateScore(precision, level) {
    const baseScores = {
      perfect: 89,
      great: 55,
      good: 34,
      miss: 21,
    };
    return (baseScores[precision] || 0) * level;
  },

  /**
   * Calculate streak bonus (Fibonacci progression)
   */
  calculateStreakBonus(streak) {
    if (streak < 3) return 0;
    // Fibonacci: F(3)=2, F(4)=3, F(5)=5, F(6)=8, F(7)=13
    const fibs = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];
    const idx = Math.min(streak, fibs.length - 1);
    return fibs[idx] * 10;
  },

  /**
   * Generate block pattern variation
   * Affects visual rendering, not gameplay
   */
  getBlockPattern(level) {
    const patterns = ['solid', 'gradient', 'striped', 'glow'];
    return patterns[level % patterns.length];
  },

  /**
   * Wind system: starts level 5, increases with height
   */
  calculateWind(level, stackHeight) {
    if (level < 5) return 0;
    return Math.sin(stackHeight * 0.1) * (0.2 + (level - 5) * 0.05);
  },

  /**
   * Camera offset (follows stack, starts at 7th block)
   */
  calculateCameraOffset(stackHeight) {
    if (stackHeight < 7) return 0;
    return (stackHeight - 7) * 32;
  },

  /**
   * Validate entity against schema
   */
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

  /**
   * Create game state container
   */
  createGameState() {
    return {
      score: 0,
      level: 1,
      gameOver: false,
      stack: [],
      currentBlock: null,
      particles: [],
      particlePool: typeof TypedObjectPool !== 'undefined' ? new TypedObjectPool(100, 7) : null, // Zero-Allocation pool
      perfectStreak: 0,
      nextBlockX: 400 - 20, // Centered
      nextBlockWidth: 40,
    };
  },
};

if (typeof window !== 'undefined') {
  window.StakeStackerEntities = StakeStackerEntities;
}
