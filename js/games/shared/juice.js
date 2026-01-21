/**
 * ASDF Games - Juice System
 * Unified visual feedback: particles, screen shake, flash effects
 *
 * Philosophy: Every action deserves feedback. Make it feel alive.
 * "This is fine." - ASDF
 *
 * @version 1.0.0
 *
 * Usage:
 *   const juice = GameJuice.create(canvas, ctx);
 *   juice.burst(x, y, { icon: '✨', count: 8 });
 *   juice.shake(5, 200);
 *   juice.flash('#ff0000', 100);
 *   juice.update(dt);
 *   juice.render();
 */

'use strict';

// ===========================================
// CONSTANTS (Fibonacci/Phi-based)
// ===========================================

const JUICE_TIMING = Object.freeze({
    // Particle lifetimes (frames normalized at 60fps)
    LIFETIME: {
        INSTANT: 10,
        VERY_SHORT: 15,
        SHORT: 25,
        NORMAL: 40,
        LONG: 65,
        VERY_LONG: 105
    },

    // Effect durations (ms)
    DURATION: {
        FLASH: 100,
        SHAKE_SHORT: 150,
        SHAKE_NORMAL: 300,
        SHAKE_LONG: 500,
        FREEZE_FRAME: 50
    },

    // Physics
    GRAVITY: 0.15,
    FRICTION: 0.98,
    BOUNCE: 0.6
});

const JUICE_PRESETS = Object.freeze({
    // Preset particle configurations
    SCORE: {
        icon: '+',
        count: 1,
        lifetime: JUICE_TIMING.LIFETIME.NORMAL,
        velocityY: -2,
        velocityX: 0,
        gravity: 0,
        fadeOut: true,
        scale: true,
        color: '#fbbf24'
    },
    COLLECT: {
        icon: '✨',
        count: 6,
        lifetime: JUICE_TIMING.LIFETIME.SHORT,
        spread: 3,
        gravity: 0.1,
        fadeOut: true
    },
    DAMAGE: {
        icon: '💥',
        count: 8,
        lifetime: JUICE_TIMING.LIFETIME.SHORT,
        spread: 5,
        gravity: 0.2,
        fadeOut: true
    },
    TRAIL: {
        icon: '•',
        count: 1,
        lifetime: JUICE_TIMING.LIFETIME.VERY_SHORT,
        velocityX: 0,
        velocityY: 0,
        gravity: 0,
        fadeOut: true,
        size: 8
    },
    JUMP: {
        icon: '💨',
        count: 5,
        lifetime: JUICE_TIMING.LIFETIME.SHORT,
        spread: 2,
        velocityY: 1,
        gravity: 0,
        fadeOut: true
    },
    LAND: {
        icon: '💨',
        count: 4,
        lifetime: JUICE_TIMING.LIFETIME.SHORT,
        spread: 3,
        velocityY: -0.5,
        gravity: 0,
        fadeOut: true
    },
    EXPLOSION: {
        icons: ['🔥', '💥', '✨', '💫'],
        count: 12,
        lifetime: JUICE_TIMING.LIFETIME.NORMAL,
        spread: 6,
        gravity: 0.15,
        fadeOut: true
    },
    SPARKLE: {
        icon: '✨',
        count: 3,
        lifetime: JUICE_TIMING.LIFETIME.NORMAL,
        spread: 1,
        gravity: -0.05,
        fadeOut: true,
        size: 14
    },
    DEATH: {
        icons: ['💀', '☠️', '💥'],
        count: 10,
        lifetime: JUICE_TIMING.LIFETIME.LONG,
        spread: 8,
        gravity: 0.2,
        fadeOut: true
    }
});

// ===========================================
// PARTICLE CLASS
// ===========================================

class Particle {
    constructor(options = {}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.icon = options.icon || '•';
        this.size = options.size || 16;
        this.life = options.lifetime || JUICE_TIMING.LIFETIME.NORMAL;
        this.maxLife = this.life;
        this.gravity = options.gravity ?? JUICE_TIMING.GRAVITY;
        this.friction = options.friction ?? JUICE_TIMING.FRICTION;
        this.fadeOut = options.fadeOut ?? true;
        this.scale = options.scale ?? false;
        this.color = options.color || null;
        this.rotation = options.rotation || 0;
        this.rotationSpeed = options.rotationSpeed || 0;
        this.text = options.text || null;
    }

    update(dt) {
        // Apply velocity (frame-independent)
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Apply gravity
        this.vy += this.gravity * dt;

        // Apply friction
        this.vx *= Math.pow(this.friction, dt);
        this.vy *= Math.pow(this.friction, dt);

        // Apply rotation
        this.rotation += this.rotationSpeed * dt;

        // Decrease life
        this.life -= dt;

        return this.life > 0;
    }

    getAlpha() {
        if (!this.fadeOut) return 1;
        return Math.max(0, this.life / this.maxLife);
    }

    getScale() {
        if (!this.scale) return 1;
        const progress = 1 - (this.life / this.maxLife);
        // Ease out scale (starts big, shrinks)
        return 1 + (1 - progress) * 0.5;
    }
}

// ===========================================
// SCREEN EFFECTS
// ===========================================

class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.elapsed = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    trigger(intensity = 5, duration = 300) {
        // Stack shakes (don't reset if already shaking)
        this.intensity = Math.max(this.intensity, intensity);
        this.duration = Math.max(this.duration - this.elapsed, duration);
        this.elapsed = 0;
    }

    update(dtMs) {
        if (this.duration <= 0) {
            this.offsetX = 0;
            this.offsetY = 0;
            return;
        }

        this.elapsed += dtMs;

        if (this.elapsed >= this.duration) {
            this.duration = 0;
            this.intensity = 0;
            this.offsetX = 0;
            this.offsetY = 0;
            return;
        }

        // Decay intensity over time (phi-based easing)
        const progress = this.elapsed / this.duration;
        const decay = 1 - Math.pow(progress, 0.618);
        const currentIntensity = this.intensity * decay;

        // Random offset
        this.offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
        this.offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
    }

    apply(ctx) {
        if (this.offsetX !== 0 || this.offsetY !== 0) {
            ctx.translate(this.offsetX, this.offsetY);
        }
    }

    reset(ctx) {
        if (this.offsetX !== 0 || this.offsetY !== 0) {
            ctx.translate(-this.offsetX, -this.offsetY);
        }
    }

    isActive() {
        return this.duration > 0;
    }
}

class ScreenFlash {
    constructor() {
        this.color = null;
        this.duration = 0;
        this.elapsed = 0;
        this.alpha = 0;
    }

    trigger(color = '#ffffff', duration = 100) {
        this.color = color;
        this.duration = duration;
        this.elapsed = 0;
        this.alpha = 1;
    }

    update(dtMs) {
        if (this.duration <= 0) return;

        this.elapsed += dtMs;

        if (this.elapsed >= this.duration) {
            this.duration = 0;
            this.alpha = 0;
            return;
        }

        // Fade out (phi-based easing)
        const progress = this.elapsed / this.duration;
        this.alpha = 1 - Math.pow(progress, 0.382);
    }

    render(ctx, width, height) {
        if (this.alpha <= 0 || !this.color) return;

        ctx.save();
        ctx.globalAlpha = this.alpha * 0.4; // Max 40% opacity
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }

    isActive() {
        return this.duration > 0;
    }
}

class FreezeFrame {
    constructor() {
        this.duration = 0;
        this.elapsed = 0;
    }

    trigger(duration = 50) {
        this.duration = duration;
        this.elapsed = 0;
    }

    update(dtMs) {
        if (this.duration <= 0) return false;

        this.elapsed += dtMs;

        if (this.elapsed >= this.duration) {
            this.duration = 0;
            return false;
        }

        return true; // Game should freeze
    }

    isActive() {
        return this.duration > 0;
    }
}

// ===========================================
// JUICE MANAGER
// ===========================================

const GameJuice = {
    /**
     * Create a new juice instance for a game
     * @param {HTMLCanvasElement} canvas - Game canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @returns {Object} Juice instance
     */
    create(canvas, ctx) {
        const particles = [];
        const shake = new ScreenShake();
        const flash = new ScreenFlash();
        const freeze = new FreezeFrame();

        return {
            particles,
            shake,
            flash,
            freeze,
            canvas,
            ctx,

            // =========================================
            // PARTICLE EMITTERS
            // =========================================

            /**
             * Emit particles in a burst pattern
             * @param {number} x - Center X
             * @param {number} y - Center Y
             * @param {Object} options - Burst options
             */
            burst(x, y, options = {}) {
                const preset = options.preset ? JUICE_PRESETS[options.preset] : {};
                const config = { ...preset, ...options };

                const count = config.count || 6;
                const spread = config.spread || 4;
                const icons = config.icons || [config.icon || '✨'];

                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                    const speed = spread * (0.5 + Math.random() * 0.5);

                    particles.push(new Particle({
                        x: x + (Math.random() - 0.5) * 10,
                        y: y + (Math.random() - 0.5) * 10,
                        vx: Math.cos(angle) * speed + (config.velocityX || 0),
                        vy: Math.sin(angle) * speed + (config.velocityY || 0),
                        icon: icons[Math.floor(Math.random() * icons.length)],
                        size: config.size || 16,
                        lifetime: config.lifetime || JUICE_TIMING.LIFETIME.SHORT,
                        gravity: config.gravity ?? JUICE_TIMING.GRAVITY,
                        fadeOut: config.fadeOut ?? true,
                        color: config.color
                    }));
                }
            },

            /**
             * Emit floating text (score popup, etc)
             * @param {number} x - X position
             * @param {number} y - Y position
             * @param {string} text - Text to display
             * @param {Object} options - Text options
             */
            textPop(x, y, text, options = {}) {
                particles.push(new Particle({
                    x,
                    y,
                    vx: options.vx || 0,
                    vy: options.vy || -2,
                    icon: '',
                    text: text,
                    size: options.size || 20,
                    lifetime: options.lifetime || JUICE_TIMING.LIFETIME.NORMAL,
                    gravity: options.gravity ?? 0,
                    fadeOut: true,
                    scale: true,
                    color: options.color || '#fbbf24'
                }));
            },

            /**
             * Emit trail particle (for moving objects)
             * @param {number} x - X position
             * @param {number} y - Y position
             * @param {Object} options - Trail options
             */
            trail(x, y, options = {}) {
                particles.push(new Particle({
                    x,
                    y,
                    vx: options.vx || (Math.random() - 0.5) * 0.5,
                    vy: options.vy || (Math.random() - 0.5) * 0.5,
                    icon: options.icon || '•',
                    size: options.size || 8,
                    lifetime: options.lifetime || JUICE_TIMING.LIFETIME.VERY_SHORT,
                    gravity: 0,
                    fadeOut: true,
                    color: options.color
                }));
            },

            /**
             * Emit ring of particles (shield, power-up)
             * @param {number} x - Center X
             * @param {number} y - Center Y
             * @param {Object} options - Ring options
             */
            ring(x, y, options = {}) {
                const count = options.count || 8;
                const radius = options.radius || 30;
                const expandSpeed = options.expandSpeed || 2;

                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    particles.push(new Particle({
                        x: x + Math.cos(angle) * radius,
                        y: y + Math.sin(angle) * radius,
                        vx: Math.cos(angle) * expandSpeed,
                        vy: Math.sin(angle) * expandSpeed,
                        icon: options.icon || '✨',
                        size: options.size || 16,
                        lifetime: options.lifetime || JUICE_TIMING.LIFETIME.SHORT,
                        gravity: 0,
                        fadeOut: true
                    }));
                }
            },

            /**
             * Emit using preset
             * @param {string} presetName - Name of preset
             * @param {number} x - X position
             * @param {number} y - Y position
             * @param {Object} overrides - Override preset values
             */
            emit(presetName, x, y, overrides = {}) {
                const preset = JUICE_PRESETS[presetName.toUpperCase()];
                if (!preset) {
                    console.warn(`[GameJuice] Unknown preset: ${presetName}`);
                    return;
                }
                this.burst(x, y, { ...preset, ...overrides });
            },

            // =========================================
            // SCREEN EFFECTS
            // =========================================

            /**
             * Trigger screen shake
             * @param {number} intensity - Shake intensity (pixels)
             * @param {number} duration - Duration in ms
             */
            triggerShake(intensity = 5, duration = 300) {
                shake.trigger(intensity, duration);
            },

            /**
             * Trigger screen flash
             * @param {string} color - Flash color (hex)
             * @param {number} duration - Duration in ms
             */
            triggerFlash(color = '#ffffff', duration = 100) {
                flash.trigger(color, duration);
            },

            /**
             * Trigger freeze frame (hitstop)
             * @param {number} duration - Duration in ms
             */
            triggerFreeze(duration = 50) {
                freeze.trigger(duration);
            },

            /**
             * Combined impact effect (shake + flash + particles)
             * @param {number} x - X position
             * @param {number} y - Y position
             * @param {Object} options - Impact options
             */
            impact(x, y, options = {}) {
                const intensity = options.intensity || 'medium';

                switch (intensity) {
                    case 'light':
                        this.triggerShake(3, 100);
                        this.emit('COLLECT', x, y);
                        break;
                    case 'medium':
                        this.triggerShake(5, 200);
                        this.triggerFlash('#ffffff', 50);
                        this.emit('DAMAGE', x, y);
                        break;
                    case 'heavy':
                        this.triggerShake(10, 400);
                        this.triggerFlash('#ff0000', 100);
                        this.triggerFreeze(30);
                        this.emit('EXPLOSION', x, y);
                        break;
                    case 'death':
                        this.triggerShake(15, 500);
                        this.triggerFlash('#ff0000', 150);
                        this.triggerFreeze(100);
                        this.emit('DEATH', x, y);
                        break;
                }
            },

            // =========================================
            // UPDATE & RENDER
            // =========================================

            /**
             * Update all effects (call in game loop)
             * @param {number} dt - Delta time (normalized, 1.0 = 60fps)
             * @param {number} dtMs - Delta time in milliseconds
             * @returns {boolean} True if game should freeze this frame
             */
            update(dt, dtMs = dt * 16.67) {
                // Update freeze frame
                const shouldFreeze = freeze.update(dtMs);

                // Update screen effects
                shake.update(dtMs);
                flash.update(dtMs);

                // Update particles (filter dead ones)
                for (let i = particles.length - 1; i >= 0; i--) {
                    if (!particles[i].update(dt)) {
                        particles.splice(i, 1);
                    }
                }

                return shouldFreeze;
            },

            /**
             * Render all effects (call in game render)
             * Call renderPre before game render, renderPost after
             */
            renderPre() {
                // Apply screen shake transform
                shake.apply(ctx);
            },

            renderPost() {
                // Reset screen shake transform
                shake.reset(ctx);

                // Render particles
                for (const p of particles) {
                    ctx.save();
                    ctx.globalAlpha = p.getAlpha();

                    if (p.text) {
                        // Text particle
                        const scale = p.getScale();
                        ctx.font = `bold ${Math.round(p.size * scale)}px Arial`;
                        ctx.fillStyle = p.color || '#fbbf24';
                        ctx.shadowColor = p.color || '#fbbf24';
                        ctx.shadowBlur = 5;
                        ctx.textAlign = 'center';
                        ctx.fillText(p.text, p.x, p.y);
                    } else {
                        // Icon particle
                        if (p.rotation !== 0) {
                            ctx.translate(p.x, p.y);
                            ctx.rotate(p.rotation);
                            ctx.translate(-p.x, -p.y);
                        }
                        ctx.font = `${p.size}px Arial`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        if (p.color) {
                            ctx.fillStyle = p.color;
                        }
                        ctx.fillText(p.icon, p.x, p.y);
                    }

                    ctx.restore();
                }

                // Render screen flash (on top of everything)
                flash.render(ctx, canvas.width, canvas.height);
            },

            /**
             * Simple render (combines pre and post)
             * Use this if you don't need shake on game elements
             */
            render() {
                this.renderPost();
            },

            // =========================================
            // UTILITIES
            // =========================================

            /**
             * Clear all particles
             */
            clear() {
                particles.length = 0;
            },

            /**
             * Get particle count
             * @returns {number}
             */
            getParticleCount() {
                return particles.length;
            },

            /**
             * Check if any effects are active
             * @returns {boolean}
             */
            isActive() {
                return particles.length > 0 || shake.isActive() || flash.isActive() || freeze.isActive();
            },

            /**
             * Cleanup
             */
            cleanup() {
                particles.length = 0;
                shake.intensity = 0;
                shake.duration = 0;
                flash.duration = 0;
                freeze.duration = 0;
            }
        };
    },

    // Expose presets for external configuration
    PRESETS: JUICE_PRESETS,
    TIMING: JUICE_TIMING
};

// ===========================================
// LEGACY FUNCTION EXPORTS (backwards compatible)
// ===========================================

/**
 * Create burst particles (legacy)
 * @deprecated Use GameJuice.create() instead
 */
function createBurstParticles(x, y, options) {
    console.warn('[GameJuice] createBurstParticles is deprecated. Use GameJuice.create().burst()');
    return [];
}

/**
 * Update particles array (legacy helper)
 * @param {Array} particles - Particle array
 * @param {number} dt - Delta time
 * @returns {Array} Filtered particles
 */
function updateParticles(particles, dt) {
    return particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity || 0.15) * dt;
        p.life -= dt;
        return p.life > 0;
    });
}

/**
 * Render particles (legacy helper)
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} particles
 */
function renderParticles(ctx, particles) {
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 30));
        ctx.font = `${p.size || 16}px Arial`;
        ctx.fillText(p.icon, p.x, p.y);
    });
    ctx.globalAlpha = 1;
}

// ===========================================
// EXPORT FOR BROWSER (global scope)
// ===========================================

if (typeof window !== 'undefined') {
    window.GameJuice = GameJuice;
    window.JUICE_PRESETS = JUICE_PRESETS;
    window.JUICE_TIMING = JUICE_TIMING;

    // Legacy helpers
    window.updateParticles = updateParticles;
    window.renderParticles = renderParticles;
}

// Log initialization (dev only)
if (typeof console !== 'undefined' && typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    console.log('[GameJuice] Juice system loaded. Presets:', Object.keys(JUICE_PRESETS).join(', '));
}
