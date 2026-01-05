/**
 * ASDF Shop V2 - Placeholder Asset Generator
 *
 * Generates programmatic placeholder images for missing cosmetic assets
 * Uses tier-based colors and layer-specific designs
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// COLOR PALETTES
// ============================================

const TIER_COLORS = {
    0: { primary: '#9ca3af', secondary: '#6b7280', accent: '#d1d5db' }, // Common gray
    1: { primary: '#9ca3af', secondary: '#6b7280', accent: '#d1d5db' }, // Common gray
    2: { primary: '#22c55e', secondary: '#16a34a', accent: '#86efac' }, // Uncommon green
    3: { primary: '#22c55e', secondary: '#16a34a', accent: '#86efac' }, // Uncommon green
    4: { primary: '#3b82f6', secondary: '#2563eb', accent: '#93c5fd' }, // Rare blue
    5: { primary: '#3b82f6', secondary: '#2563eb', accent: '#93c5fd' }, // Rare blue
    6: { primary: '#a855f7', secondary: '#9333ea', accent: '#d8b4fe' }, // Epic purple
    7: { primary: '#a855f7', secondary: '#9333ea', accent: '#d8b4fe' }, // Epic purple
    8: { primary: '#f97316', secondary: '#ea580c', accent: '#fed7aa' }, // Legendary orange
    9: { primary: '#f97316', secondary: '#ea580c', accent: '#fed7aa' }  // Legendary orange
};

const LAYER_ICONS = {
    background: '🌌',
    aura: '✨',
    skin: '🐕',
    outfit: '👕',
    eyes: '👁️',
    head: '🎩',
    held: '🗡️'
};

// ============================================
// PLACEHOLDER GENERATOR
// ============================================

const ShopPlaceholders = {
    // Cache for generated placeholders
    cache: new Map(),

    /**
     * Generate placeholder image
     * @param {string} layer - Layer type
     * @param {number} tier - Item tier (0-9)
     * @param {number} size - Image size
     * @returns {string} Data URL
     */
    generate(layer, tier = 0, size = 256) {
        const cacheKey = `${layer}_${tier}_${size}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const colors = TIER_COLORS[tier] || TIER_COLORS[0];

        // Generate based on layer type
        switch (layer) {
            case 'background':
                this.drawBackground(ctx, colors, size);
                break;
            case 'aura':
                this.drawAura(ctx, colors, size);
                break;
            case 'skin':
                this.drawSkin(ctx, colors, size);
                break;
            case 'outfit':
                this.drawOutfit(ctx, colors, size);
                break;
            case 'eyes':
                this.drawEyes(ctx, colors, size);
                break;
            case 'head':
                this.drawHead(ctx, colors, size);
                break;
            case 'held':
                this.drawHeld(ctx, colors, size);
                break;
            default:
                this.drawDefault(ctx, colors, size, layer);
        }

        const dataUrl = canvas.toDataURL('image/png');
        this.cache.set(cacheKey, dataUrl);
        return dataUrl;
    },

    /**
     * Draw background placeholder
     */
    drawBackground(ctx, colors, size) {
        // Radial gradient
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size * 0.7
        );
        gradient.addColorStop(0, colors.accent);
        gradient.addColorStop(0.5, colors.primary);
        gradient.addColorStop(1, colors.secondary);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add some decorative elements
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 2 + Math.random() * 5;

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = colors.accent;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    /**
     * Draw aura placeholder
     */
    drawAura(ctx, colors, size) {
        // Transparent with glow rings
        ctx.clearRect(0, 0, size, size);

        const center = size / 2;
        const rings = 3;

        for (let i = rings; i > 0; i--) {
            const radius = (size / 2.5) * (i / rings);
            const alpha = 0.2 + (rings - i) * 0.15;

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 15 + (rings - i) * 5;
            ctx.stroke();
        }

        // Inner glow
        ctx.globalAlpha = 0.4;
        const innerGradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, size / 3
        );
        innerGradient.addColorStop(0, colors.accent);
        innerGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = innerGradient;
        ctx.fillRect(0, 0, size, size);
        ctx.globalAlpha = 1;
    },

    /**
     * Draw skin placeholder (dog silhouette)
     */
    drawSkin(ctx, colors, size) {
        ctx.clearRect(0, 0, size, size);

        const scale = size / 256;
        ctx.save();
        ctx.scale(scale, scale);

        // Simple dog shape
        ctx.fillStyle = colors.primary;

        // Body
        ctx.beginPath();
        ctx.ellipse(128, 160, 50, 40, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.beginPath();
        ctx.ellipse(128, 100, 35, 30, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.ellipse(100, 75, 12, 20, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(156, 75, 12, 20, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.ellipse(128, 115, 15, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#1a1a24';
        ctx.beginPath();
        ctx.arc(115, 95, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(141, 95, 5, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(117, 93, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(143, 93, 2, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.fillStyle = colors.primary;
        ctx.fillRect(95, 180, 15, 40);
        ctx.fillRect(145, 180, 15, 40);

        // Tail
        ctx.beginPath();
        ctx.moveTo(178, 150);
        ctx.quadraticCurveTo(210, 130, 195, 100);
        ctx.lineWidth = 10;
        ctx.strokeStyle = colors.primary;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Draw outfit placeholder
     */
    drawOutfit(ctx, colors, size) {
        ctx.clearRect(0, 0, size, size);

        const scale = size / 256;
        ctx.save();
        ctx.scale(scale, scale);

        // T-shirt shape
        ctx.fillStyle = colors.primary;
        ctx.beginPath();

        // Collar
        ctx.moveTo(100, 120);
        ctx.lineTo(128, 140);
        ctx.lineTo(156, 120);

        // Right shoulder
        ctx.lineTo(180, 130);
        ctx.lineTo(185, 160);

        // Right sleeve
        ctx.lineTo(175, 165);
        ctx.lineTo(165, 140);

        // Right side
        ctx.lineTo(160, 200);

        // Bottom
        ctx.lineTo(96, 200);

        // Left side
        ctx.lineTo(91, 140);
        ctx.lineTo(81, 165);

        // Left sleeve
        ctx.lineTo(71, 160);
        ctx.lineTo(76, 130);

        ctx.closePath();
        ctx.fill();

        // Collar detail
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(100, 120);
        ctx.lineTo(128, 140);
        ctx.lineTo(156, 120);
        ctx.stroke();

        // Logo (simple star)
        ctx.fillStyle = colors.accent;
        this.drawStar(ctx, 128, 165, 15, 5);

        ctx.restore();
    },

    /**
     * Draw eyes placeholder
     */
    drawEyes(ctx, colors, size) {
        ctx.clearRect(0, 0, size, size);

        const scale = size / 256;
        ctx.save();
        ctx.scale(scale, scale);

        // Two glowing eyes
        const eyeY = 100;
        const leftX = 100;
        const rightX = 156;

        // Glow
        ctx.globalAlpha = 0.5;
        const glowRadius = 25;
        const glowGradient = ctx.createRadialGradient(leftX, eyeY, 0, leftX, eyeY, glowRadius);
        glowGradient.addColorStop(0, colors.primary);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(leftX - glowRadius, eyeY - glowRadius, glowRadius * 2, glowRadius * 2);

        const glowGradient2 = ctx.createRadialGradient(rightX, eyeY, 0, rightX, eyeY, glowRadius);
        glowGradient2.addColorStop(0, colors.primary);
        glowGradient2.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient2;
        ctx.fillRect(rightX - glowRadius, eyeY - glowRadius, glowRadius * 2, glowRadius * 2);

        // Eyes
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.ellipse(leftX, eyeY, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(rightX, eyeY, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(leftX, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightX, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw head item placeholder
     */
    drawHead(ctx, colors, size) {
        ctx.clearRect(0, 0, size, size);

        const scale = size / 256;
        ctx.save();
        ctx.scale(scale, scale);

        // Crown/hat shape
        ctx.fillStyle = colors.primary;

        // Base
        ctx.beginPath();
        ctx.ellipse(128, 90, 50, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crown points
        ctx.beginPath();
        ctx.moveTo(78, 90);
        ctx.lineTo(88, 50);
        ctx.lineTo(98, 75);
        ctx.lineTo(113, 40);
        ctx.lineTo(128, 70);
        ctx.lineTo(143, 40);
        ctx.lineTo(158, 75);
        ctx.lineTo(168, 50);
        ctx.lineTo(178, 90);
        ctx.closePath();
        ctx.fill();

        // Gems
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(88, 55, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(128, 50, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(168, 55, 5, 0, Math.PI * 2);
        ctx.fill();

        // Band
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.ellipse(128, 90, 50, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw held item placeholder
     */
    drawHeld(ctx, colors, size) {
        ctx.clearRect(0, 0, size, size);

        const scale = size / 256;
        ctx.save();
        ctx.scale(scale, scale);

        // Sword/staff shape
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';

        // Handle
        ctx.beginPath();
        ctx.moveTo(180, 200);
        ctx.lineTo(150, 170);
        ctx.stroke();

        // Blade/staff
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(150, 170);
        ctx.lineTo(80, 100);
        ctx.stroke();

        // Tip glow
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.arc(80, 100, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(80, 100, 6, 0, Math.PI * 2);
        ctx.fill();

        // Guard
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.ellipse(150, 170, 15, 5, -0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Draw default placeholder
     */
    drawDefault(ctx, colors, size, layer) {
        // Simple colored square with icon
        ctx.fillStyle = colors.primary;
        ctx.fillRect(0, 0, size, size);

        // Border
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, size - 4, size - 4);

        // Icon text
        const icon = LAYER_ICONS[layer] || '❓';
        ctx.font = `${size / 3}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = colors.accent;
        ctx.fillText(icon, size / 2, size / 2);
    },

    /**
     * Draw a star shape
     */
    drawStar(ctx, cx, cy, radius, points) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? radius : radius / 2;
            const angle = (Math.PI / points) * i - Math.PI / 2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    },

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    },

    /**
     * Get tier colors
     */
    getTierColors(tier) {
        return TIER_COLORS[tier] || TIER_COLORS[0];
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopPlaceholders, TIER_COLORS, LAYER_ICONS };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopPlaceholders = ShopPlaceholders;
    window.TIER_COLORS = TIER_COLORS;
}
