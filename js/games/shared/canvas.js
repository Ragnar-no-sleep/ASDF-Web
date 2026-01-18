/**
 * ASDF Games - Shared Canvas Management
 *
 * Provides canvas setup, resize handling, and rendering utilities
 */

'use strict';

const CanvasManager = {
    /**
     * Setup a game canvas with proper sizing
     * @param {string} canvasId - The canvas element ID
     * @param {HTMLElement} container - The parent container element
     * @returns {Object} Canvas context and dimensions
     */
    setup(canvasId, container) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas not found: ${canvasId}`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        this.resize(canvas, container);

        return {
            canvas,
            ctx,
            width: canvas.width,
            height: canvas.height
        };
    },

    /**
     * Resize canvas to fit container
     * @param {HTMLCanvasElement} canvas - The canvas element
     * @param {HTMLElement} container - The parent container
     * @returns {Object} New dimensions
     */
    resize(canvas, container) {
        const rect = container ? container.getBoundingClientRect() : canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        return { width: canvas.width, height: canvas.height };
    },

    /**
     * Clear the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    clear(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
    },

    /**
     * Draw text with shadow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Drawing options
     */
    drawText(ctx, text, x, y, options = {}) {
        const {
            font = '16px Arial',
            color = '#ffffff',
            align = 'center',
            baseline = 'middle',
            shadow = null
        } = options;

        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        if (shadow) {
            ctx.shadowColor = shadow.color || '#000000';
            ctx.shadowBlur = shadow.blur || 5;
            ctx.shadowOffsetX = shadow.offsetX || 0;
            ctx.shadowOffsetY = shadow.offsetY || 0;
        }

        ctx.fillStyle = color;
        ctx.fillText(text, x, y);

        if (shadow) {
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    },

    /**
     * Draw a progress bar
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Bar width
     * @param {number} height - Bar height
     * @param {number} progress - Progress (0-1)
     * @param {Object} colors - Color options
     */
    drawProgressBar(ctx, x, y, width, height, progress, colors = {}) {
        const {
            background = '#1f2937',
            fill = '#22c55e',
            border = null
        } = colors;

        // Background
        ctx.fillStyle = background;
        ctx.fillRect(x, y, width, height);

        // Progress
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, width * Math.max(0, Math.min(1, progress)), height);

        // Border
        if (border) {
            ctx.strokeStyle = border;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, width, height);
        }
    }
};

// Export for module systems
if (typeof window !== 'undefined') {
    window.CanvasManager = CanvasManager;
}
