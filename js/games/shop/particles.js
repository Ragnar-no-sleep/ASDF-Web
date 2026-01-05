/**
 * ASDF Shop V2 - Particle Effects System
 *
 * Fibonacci-based particle effects for cosmetic items
 *
 * @version 2.0.0
 */

'use strict';

// Fibonacci sequence for particle parameters
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

// ============================================
// PARTICLE EFFECT DEFINITIONS
// ============================================

const PARTICLE_EFFECTS = {
    // Ember effect - floating fire particles
    EMBER: {
        id: 'ember',
        count: FIB[7],           // 13 particles
        speed: FIB[8] / 10,      // 2.1
        size: [3, 8],
        colors: ['#f97316', '#ea580c', '#fb923c', '#fdba74'],
        lifetime: FIB[9] * 100,  // 3400ms
        spawn: 'bottom',
        direction: 'up',
        spread: 0.3,
        fade: true,
        glow: true
    },

    // Sparkle effect - random twinkling
    SPARKLE: {
        id: 'sparkle',
        count: FIB[8],           // 21 particles
        speed: FIB[7] / 10,      // 1.3
        size: [2, 5],
        colors: ['#fbbf24', '#ffffff', '#fde68a', '#fef3c7'],
        lifetime: FIB[8] * 100,  // 2100ms
        spawn: 'random',
        direction: 'random',
        spread: 1.0,
        pulse: true,
        fade: true
    },

    // Aura glow - radial glow effect
    AURA_GLOW: {
        id: 'aura_glow',
        count: FIB[6],           // 8 particles
        speed: 0.5,
        size: [20, 40],
        colors: ['#a855f7', '#8b5cf6', '#c084fc'],
        lifetime: FIB[10] * 100, // 5500ms
        spawn: 'center',
        direction: 'radial',
        opacity: 0.3,
        blur: true,
        fade: false
    },

    // Cosmic effect - orbiting particles
    COSMIC: {
        id: 'cosmic',
        count: FIB[9],           // 34 particles
        speed: 0.8,
        size: [1, 3],
        colors: ['#60a5fa', '#818cf8', '#c084fc', '#ffffff', '#f472b6'],
        lifetime: FIB[11] * 100, // 8900ms
        spawn: 'orbit',
        direction: 'orbit',
        trail: true,
        fade: true
    },

    // Fire effect - intense flames
    FIRE: {
        id: 'fire',
        count: FIB[8],           // 21 particles
        speed: FIB[7] / 8,       // ~1.6
        size: [4, 12],
        colors: ['#ef4444', '#f97316', '#fbbf24', '#fef3c7'],
        lifetime: FIB[7] * 100,  // 1300ms
        spawn: 'bottom',
        direction: 'up',
        spread: 0.4,
        fade: true,
        glow: true,
        turbulence: true
    },

    // Electric effect - lightning sparks
    ELECTRIC: {
        id: 'electric',
        count: FIB[6],           // 8 particles
        speed: FIB[9] / 10,      // 3.4
        size: [1, 3],
        colors: ['#38bdf8', '#22d3ee', '#ffffff', '#a5f3fc'],
        lifetime: FIB[5] * 100,  // 500ms
        spawn: 'random',
        direction: 'random',
        spread: 2.0,
        lightning: true,
        fade: true
    },

    // Divine effect - ascending light
    DIVINE: {
        id: 'divine',
        count: FIB[7],           // 13 particles
        speed: FIB[6] / 10,      // 0.8
        size: [5, 15],
        colors: ['#fef9c3', '#fef08a', '#ffffff', '#fde68a'],
        lifetime: FIB[10] * 100, // 5500ms
        spawn: 'bottom',
        direction: 'up',
        spread: 0.2,
        fade: true,
        glow: true,
        pulse: true
    }
};

// ============================================
// PARTICLE SYSTEM
// ============================================

const ShopParticles = {
    /**
     * Create a particle system
     * @param {string} effectType - Effect type (EMBER, SPARKLE, etc.)
     * @param {Object} bounds - { x, y, width, height }
     * @param {string} layer - Layer this effect belongs to
     * @returns {Object} Particle system
     */
    createSystem(effectType, bounds, layer = null) {
        const config = PARTICLE_EFFECTS[effectType];
        if (!config) {
            console.warn(`[ShopParticles] Unknown effect: ${effectType}`);
            return null;
        }

        const system = {
            id: `${config.id}_${Date.now()}`,
            layer,
            config,
            bounds,
            particles: [],
            active: true,
            createdAt: Date.now()
        };

        // Initialize particles
        for (let i = 0; i < config.count; i++) {
            system.particles.push(this.spawnParticle(system));
        }

        return system;
    },

    /**
     * Spawn a single particle
     */
    spawnParticle(system) {
        const config = system.config;
        const bounds = system.bounds;

        // Calculate spawn position
        let x, y;
        switch (config.spawn) {
            case 'bottom':
                x = bounds.x + Math.random() * bounds.width;
                y = bounds.y + bounds.height;
                break;
            case 'center':
                x = bounds.x + bounds.width / 2;
                y = bounds.y + bounds.height / 2;
                break;
            case 'orbit':
                const angle = Math.random() * Math.PI * 2;
                const radius = bounds.width * 0.3 + Math.random() * bounds.width * 0.2;
                x = bounds.x + bounds.width / 2 + Math.cos(angle) * radius;
                y = bounds.y + bounds.height / 2 + Math.sin(angle) * radius;
                break;
            default: // random
                x = bounds.x + Math.random() * bounds.width;
                y = bounds.y + Math.random() * bounds.height;
        }

        // Calculate velocity
        let vx = 0, vy = 0;
        switch (config.direction) {
            case 'up':
                vx = (Math.random() - 0.5) * config.spread * 2;
                vy = -config.speed - Math.random() * config.speed * 0.5;
                break;
            case 'radial':
                const radAngle = Math.random() * Math.PI * 2;
                vx = Math.cos(radAngle) * config.speed;
                vy = Math.sin(radAngle) * config.speed;
                break;
            case 'orbit':
                // Perpendicular to radius
                const cx = bounds.x + bounds.width / 2;
                const cy = bounds.y + bounds.height / 2;
                const dx = x - cx;
                const dy = y - cy;
                vx = -dy * config.speed * 0.01;
                vy = dx * config.speed * 0.01;
                break;
            default: // random
                vx = (Math.random() - 0.5) * config.speed * 2;
                vy = (Math.random() - 0.5) * config.speed * 2;
        }

        return {
            x, y,
            vx, vy,
            size: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
            color: config.colors[Math.floor(Math.random() * config.colors.length)],
            opacity: config.opacity || 1,
            lifetime: config.lifetime * (0.7 + Math.random() * 0.6),
            age: Math.random() * config.lifetime, // Stagger initial ages
            pulsePhase: Math.random() * Math.PI * 2,
            orbitAngle: Math.random() * Math.PI * 2,
            trail: config.trail ? [] : null
        };
    },

    /**
     * Update particle system
     * @param {Object} system - Particle system
     * @param {number} deltaTime - Time since last frame (ms)
     */
    update(system, deltaTime) {
        if (!system || !system.active) return;

        const config = system.config;
        const dt = deltaTime / 16.67; // Normalize to 60fps

        for (let i = system.particles.length - 1; i >= 0; i--) {
            const p = system.particles[i];

            // Update age
            p.age += deltaTime;

            // Respawn if dead
            if (p.age >= p.lifetime) {
                system.particles[i] = this.spawnParticle(system);
                continue;
            }

            // Calculate life progress (0 to 1)
            const lifeProgress = p.age / p.lifetime;

            // Store trail position
            if (p.trail) {
                p.trail.push({ x: p.x, y: p.y, opacity: p.opacity * (1 - lifeProgress) });
                if (p.trail.length > 10) p.trail.shift();
            }

            // Apply turbulence
            if (config.turbulence) {
                p.vx += (Math.random() - 0.5) * 0.1 * dt;
            }

            // Update position
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Orbit motion
            if (config.direction === 'orbit') {
                const bounds = system.bounds;
                const cx = bounds.x + bounds.width / 2;
                const cy = bounds.y + bounds.height / 2;
                p.orbitAngle += config.speed * 0.02 * dt;
                const radius = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
                p.x = cx + Math.cos(p.orbitAngle) * radius;
                p.y = cy + Math.sin(p.orbitAngle) * radius;
            }

            // Fade out
            if (config.fade) {
                p.opacity = (config.opacity || 1) * (1 - lifeProgress);
            }

            // Pulse
            if (config.pulse) {
                p.pulsePhase += 0.1 * dt;
                const pulseFactor = 0.7 + 0.3 * Math.sin(p.pulsePhase);
                p.currentSize = p.size * pulseFactor;
            } else {
                p.currentSize = p.size;
            }
        }
    },

    /**
     * Render particle system
     * @param {Object} system - Particle system
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} canvasSize - Canvas size
     */
    render(system, ctx, canvasSize) {
        if (!system || !system.active) return;

        const config = system.config;

        ctx.save();

        for (const p of system.particles) {
            const size = p.currentSize || p.size;

            // Set composite for glow effect
            if (config.glow) {
                ctx.globalCompositeOperation = 'lighter';
            }

            // Set opacity
            ctx.globalAlpha = p.opacity;

            // Draw trail
            if (p.trail && p.trail.length > 1) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) {
                    ctx.lineTo(p.trail[i].x, p.trail[i].y);
                }
                ctx.strokeStyle = p.color;
                ctx.lineWidth = size * 0.5;
                ctx.lineCap = 'round';
                ctx.stroke();
            }

            // Draw particle
            ctx.beginPath();

            if (config.blur) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = size * 2;
            }

            if (config.lightning) {
                // Draw as line segment
                const len = size * 3;
                const angle = Math.random() * Math.PI * 2;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + Math.cos(angle) * len, p.y + Math.sin(angle) * len);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = size * 0.5;
                ctx.stroke();
            } else {
                // Draw as circle
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }

            // Reset shadow
            if (config.blur) {
                ctx.shadowBlur = 0;
            }
        }

        ctx.restore();
    },

    /**
     * Destroy particle system
     */
    destroy(system) {
        if (system) {
            system.active = false;
            system.particles = [];
        }
    },

    /**
     * Get effect config for an item tier
     * @param {number} tier - Item tier (0-9)
     * @returns {string|null} Effect type or null
     */
    getEffectForTier(tier) {
        if (tier < 3) return null;
        if (tier < 5) return 'EMBER';
        if (tier < 7) return 'SPARKLE';
        if (tier < 9) return 'COSMIC';
        return 'DIVINE';
    },

    /**
     * Get all available effects
     */
    getAvailableEffects() {
        return Object.keys(PARTICLE_EFFECTS);
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopParticles, PARTICLE_EFFECTS };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopParticles = ShopParticles;
    window.PARTICLE_EFFECTS = PARTICLE_EFFECTS;
}
