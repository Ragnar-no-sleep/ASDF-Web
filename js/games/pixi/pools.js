/**
 * Object Pooling System
 * Vanilla JavaScript - No TypeScript, No React
 *
 * @description Reuse objects to avoid GC pressure in game loops
 */

/**
 * Generic Object Pool
 */
export class ObjectPool {
  /**
   * @param {Function} factory - Function that creates new objects
   * @param {Function} reset - Function that resets an object for reuse
   * @param {number} initialSize - Initial pool size
   */
  constructor(factory, reset = null, initialSize = 20) {
    this.factory = factory;
    this.reset = reset || (obj => obj);
    this.pool = [];
    this.active = new Set();

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Get an object from the pool
   * @returns {any}
   */
  acquire() {
    let obj;

    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.factory();
    }

    this.active.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool
   * @param {any} obj - Object to return
   */
  release(obj) {
    if (!this.active.has(obj)) return;

    this.active.delete(obj);
    this.reset(obj);
    this.pool.push(obj);
  }

  /**
   * Release all active objects
   */
  releaseAll() {
    for (const obj of this.active) {
      this.reset(obj);
      this.pool.push(obj);
    }
    this.active.clear();
  }

  /**
   * Get pool statistics
   * @returns {{available: number, active: number, total: number}}
   */
  get stats() {
    return {
      available: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size,
    };
  }

  /**
   * Destroy pool and all objects
   * @param {Function} destructor - Optional cleanup function for each object
   */
  destroy(destructor = null) {
    if (destructor) {
      for (const obj of this.pool) destructor(obj);
      for (const obj of this.active) destructor(obj);
    }
    this.pool = [];
    this.active.clear();
  }
}

/**
 * Sprite Pool - Specialized for PixiJS Sprites
 */
export class SpritePool {
  /**
   * @param {Function} createSprite - Factory function for sprites
   * @param {number} initialSize - Initial pool size
   */
  constructor(createSprite, initialSize = 50) {
    this.createSprite = createSprite;
    this.pool = [];
    this.active = new Set();

    // Pre-populate
    for (let i = 0; i < initialSize; i++) {
      const sprite = this.createSprite();
      sprite.visible = false;
      this.pool.push(sprite);
    }
  }

  /**
   * Get a sprite from the pool
   * @returns {Sprite}
   */
  acquire() {
    let sprite;

    if (this.pool.length > 0) {
      sprite = this.pool.pop();
    } else {
      sprite = this.createSprite();
    }

    sprite.visible = true;
    sprite.alpha = 1;
    sprite.scale.set(1);
    sprite.rotation = 0;
    sprite.tint = 0xffffff;

    this.active.add(sprite);
    return sprite;
  }

  /**
   * Return a sprite to the pool
   * @param {Sprite} sprite
   */
  release(sprite) {
    if (!this.active.has(sprite)) return;

    this.active.delete(sprite);
    sprite.visible = false;
    this.pool.push(sprite);
  }

  /**
   * Release all active sprites
   */
  releaseAll() {
    for (const sprite of this.active) {
      sprite.visible = false;
      this.pool.push(sprite);
    }
    this.active.clear();
  }

  /**
   * Get pool statistics
   */
  get stats() {
    return {
      available: this.pool.length,
      active: this.active.size,
      total: this.pool.length + this.active.size,
    };
  }

  /**
   * Destroy pool and all sprites
   */
  destroy() {
    for (const sprite of this.pool) sprite.destroy();
    for (const sprite of this.active) sprite.destroy();
    this.pool = [];
    this.active.clear();
  }
}

/**
 * Particle Pool - Optimized for high-frequency spawn/despawn
 */
export class ParticlePool {
  /**
   * @param {Container} container - Parent container for particles
   * @param {Function} createParticle - Factory function
   * @param {number} maxParticles - Maximum particles allowed
   */
  constructor(container, createParticle, maxParticles = 500) {
    this.container = container;
    this.createParticle = createParticle;
    this.maxParticles = maxParticles;

    this.pool = [];
    this.active = [];

    // Pre-populate
    for (let i = 0; i < Math.min(100, maxParticles); i++) {
      const particle = this.createParticle();
      particle.visible = false;
      this.container.addChild(particle);
      this.pool.push(particle);
    }
  }

  /**
   * Spawn a particle
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} props - Additional properties
   * @returns {Object|null} - Particle or null if at max
   */
  spawn(x, y, props = {}) {
    // Enforce max particles
    if (this.active.length >= this.maxParticles) {
      // Recycle oldest
      const oldest = this.active.shift();
      this.resetParticle(oldest);
      this.pool.push(oldest);
    }

    let particle;

    if (this.pool.length > 0) {
      particle = this.pool.pop();
    } else {
      particle = this.createParticle();
      this.container.addChild(particle);
    }

    // Setup particle
    particle.x = x;
    particle.y = y;
    particle.visible = true;
    particle.alpha = props.alpha ?? 1;
    particle.scale.set(props.scale ?? 1);
    particle.rotation = props.rotation ?? 0;
    particle.tint = props.tint ?? 0xffffff;

    // Custom properties
    particle.vx = props.vx ?? 0;
    particle.vy = props.vy ?? 0;
    particle.life = props.life ?? 60;
    particle.maxLife = particle.life;
    particle.gravity = props.gravity ?? 0;
    particle.friction = props.friction ?? 1;

    this.active.push(particle);
    return particle;
  }

  /**
   * Update all active particles
   * @param {number} delta - Frame delta
   */
  update(delta) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];

      // Physics
      p.vy += p.gravity * delta;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      // Life
      p.life -= delta;
      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio;

      // Dead?
      if (p.life <= 0) {
        this.resetParticle(p);
        this.active.splice(i, 1);
        this.pool.push(p);
      }
    }
  }

  /**
   * Reset particle to default state
   * @param {Object} particle
   */
  resetParticle(particle) {
    particle.visible = false;
    particle.alpha = 1;
    particle.scale.set(1);
    particle.rotation = 0;
    particle.tint = 0xffffff;
    particle.vx = 0;
    particle.vy = 0;
  }

  /**
   * Clear all particles
   */
  clear() {
    for (const p of this.active) {
      this.resetParticle(p);
      this.pool.push(p);
    }
    this.active = [];
  }

  /**
   * Get statistics
   */
  get stats() {
    return {
      available: this.pool.length,
      active: this.active.length,
      max: this.maxParticles,
    };
  }

  /**
   * Destroy pool
   */
  destroy() {
    for (const p of this.pool) p.destroy();
    for (const p of this.active) p.destroy();
    this.pool = [];
    this.active = [];
  }
}

export default { ObjectPool, SpritePool, ParticlePool };
