/**
 * ASDF Shop V2 - Canvas Avatar Renderer
 *
 * Interactive Canvas for avatar preview with:
 * - 7-layer compositing
 * - Zoom/pan interaction
 * - Particle effects
 * - Image caching
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// CANVAS AVATAR RENDERER
// ============================================

const ShopCanvas = {
    // Canvas elements
    canvas: null,
    ctx: null,

    // Configuration
    baseSize: 512,
    currentSize: 512,

    // Layer order (bottom to top)
    layers: ['background', 'aura', 'skin', 'outfit', 'eyes', 'head', 'held'],

    // Image cache
    imageCache: new Map(),
    loadingImages: new Set(),

    // Animation
    animationFrame: null,
    isAnimating: false,
    lastFrameTime: 0,

    // Particle systems (managed by particles.js)
    particleSystems: [],

    // Interaction state
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    scale: 1,
    minScale: 0.5,
    maxScale: 3,

    // Current equipped items
    currentEquipped: {},

    // Callbacks
    onLoad: null,
    onError: null,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize canvas
     * @param {HTMLCanvasElement} canvasElement - Canvas element
     * @param {Object} options - Options
     */
    init(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        // Set size
        this.currentSize = options.size || this.baseSize;
        this.canvas.width = this.currentSize;
        this.canvas.height = this.currentSize;

        // Options
        this.onLoad = options.onLoad || null;
        this.onError = options.onError || null;

        // Enable interaction if specified
        if (options.interactive !== false) {
            this.enableInteraction();
        }

        // Set up high DPI
        this.setupHighDPI();

        console.log('[ShopCanvas] Initialized', this.currentSize);
    },

    /**
     * Setup high DPI canvas
     */
    setupHighDPI() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);

        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    },

    /**
     * Resize canvas
     */
    resize(size) {
        this.currentSize = size;
        this.canvas.width = size;
        this.canvas.height = size;
        this.setupHighDPI();
        this.render();
    },

    // ============================================
    // IMAGE LOADING
    // ============================================

    /**
     * Load image with caching
     * @param {string} src - Image source
     * @returns {Promise<HTMLImageElement>}
     */
    async loadImage(src) {
        // Check cache
        if (this.imageCache.has(src)) {
            return this.imageCache.get(src);
        }

        // Check if already loading
        if (this.loadingImages.has(src)) {
            // Wait for it to finish
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    if (this.imageCache.has(src)) {
                        clearInterval(checkInterval);
                        resolve(this.imageCache.get(src));
                    } else if (!this.loadingImages.has(src)) {
                        clearInterval(checkInterval);
                        reject(new Error('Image load failed'));
                    }
                }, 50);
            });
        }

        // Start loading
        this.loadingImages.add(src);

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                this.imageCache.set(src, img);
                this.loadingImages.delete(src);
                resolve(img);
            };

            img.onerror = () => {
                this.loadingImages.delete(src);
                reject(new Error(`Failed to load: ${src}`));
            };

            img.src = src;
        });
    },

    /**
     * Get asset URL for item
     */
    getAssetUrl(itemId, layer) {
        // Check if we have a real asset
        const assetPath = `/assets/cosmetics/${layer}/${itemId}.png`;

        // In dev, might use placeholders
        // Return the path - the error handler will use placeholder if needed
        return assetPath;
    },

    /**
     * Preload all images for equipped items
     */
    async preloadEquipped(equipped) {
        const loadPromises = [];

        for (const layer of this.layers) {
            const itemId = equipped[layer];
            if (itemId) {
                const url = this.getAssetUrl(itemId, layer);
                loadPromises.push(
                    this.loadImage(url).catch(() => {
                        // Use placeholder on error
                        console.warn(`[ShopCanvas] Using placeholder for ${itemId}`);
                        return null;
                    })
                );
            }
        }

        await Promise.all(loadPromises);
    },

    // ============================================
    // RENDERING
    // ============================================

    /**
     * Load and render equipped items
     */
    async loadEquipped(equipped) {
        this.currentEquipped = equipped || {};

        // Preload images
        await this.preloadEquipped(this.currentEquipped);

        // Render
        this.render();

        if (this.onLoad) {
            this.onLoad();
        }
    },

    /**
     * Preview a single item (temporary)
     */
    async previewItem(itemId, layer) {
        const previousEquipped = { ...this.currentEquipped };
        this.currentEquipped[layer] = itemId;

        try {
            const url = this.getAssetUrl(itemId, layer);
            await this.loadImage(url).catch(() => null);
            this.render();
        } catch (e) {
            // Restore on error
            this.currentEquipped = previousEquipped;
            this.render();
        }
    },

    /**
     * Main render function
     */
    render() {
        const ctx = this.ctx;
        const size = this.canvas.width / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Apply transformations
        ctx.save();
        ctx.translate(size / 2 + this.offset.x, size / 2 + this.offset.y);
        ctx.scale(this.scale, this.scale);
        ctx.translate(-size / 2, -size / 2);

        // Render each layer
        for (const layer of this.layers) {
            const itemId = this.currentEquipped[layer];
            if (!itemId) continue;

            const url = this.getAssetUrl(itemId, layer);
            const img = this.imageCache.get(url);

            if (img) {
                // Draw image centered
                ctx.drawImage(img, 0, 0, size, size);
            } else {
                // Draw placeholder
                this.drawPlaceholder(ctx, layer, itemId, size);
            }
        }

        ctx.restore();

        // Render particles on top (no transform)
        this.renderParticles();
    },

    /**
     * Draw placeholder for missing asset
     */
    drawPlaceholder(ctx, layer, itemId, size) {
        // Use ShopPlaceholders if available
        if (window.ShopPlaceholders) {
            const placeholder = window.ShopPlaceholders.generate(layer, 0, size);
            if (placeholder) {
                const img = new Image();
                img.src = placeholder;
                // Cache for future use
                const url = this.getAssetUrl(itemId, layer);
                this.imageCache.set(url, img);
            }
        }
    },

    // ============================================
    // PARTICLES
    // ============================================

    /**
     * Add particle system
     */
    addParticleSystem(system) {
        this.particleSystems.push(system);
        this.startAnimationLoop();
    },

    /**
     * Remove particle system for a layer
     */
    removeParticleSystem(layer) {
        this.particleSystems = this.particleSystems.filter(s => s.layer !== layer);
        if (this.particleSystems.length === 0) {
            this.stopAnimationLoop();
        }
    },

    /**
     * Clear all particle systems
     */
    clearParticles() {
        this.particleSystems = [];
        this.stopAnimationLoop();
    },

    /**
     * Render particles
     */
    renderParticles() {
        if (this.particleSystems.length === 0) return;

        const ctx = this.ctx;
        const size = this.canvas.width / (window.devicePixelRatio || 1);

        for (const system of this.particleSystems) {
            if (window.ShopParticles) {
                window.ShopParticles.render(system, ctx, size);
            }
        }
    },

    /**
     * Update particles
     */
    updateParticles(deltaTime) {
        for (const system of this.particleSystems) {
            if (window.ShopParticles) {
                window.ShopParticles.update(system, deltaTime);
            }
        }
    },

    // ============================================
    // ANIMATION LOOP
    // ============================================

    /**
     * Start animation loop
     */
    startAnimationLoop() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.lastFrameTime = performance.now();
        this.animate();
    },

    /**
     * Stop animation loop
     */
    stopAnimationLoop() {
        this.isAnimating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    },

    /**
     * Animation frame
     */
    animate() {
        if (!this.isAnimating) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Update particles
        this.updateParticles(deltaTime);

        // Render
        this.render();

        // Continue loop
        this.animationFrame = requestAnimationFrame(() => this.animate());
    },

    // ============================================
    // INTERACTION
    // ============================================

    /**
     * Enable mouse/touch interaction
     */
    enableInteraction() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Cursor
        this.canvas.style.cursor = 'grab';
    },

    /**
     * Handle mouse down
     */
    handleMouseDown(e) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX - this.offset.x, y: e.clientY - this.offset.y };
        this.canvas.style.cursor = 'grabbing';
    },

    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        if (!this.isDragging) return;

        this.offset.x = e.clientX - this.dragStart.x;
        this.offset.y = e.clientY - this.dragStart.y;
        this.render();
    },

    /**
     * Handle mouse up
     */
    handleMouseUp() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    },

    /**
     * Handle wheel (zoom)
     */
    handleWheel(e) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.scale * delta;

        if (newScale >= this.minScale && newScale <= this.maxScale) {
            this.scale = newScale;
            this.render();
        }
    },

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.isDragging = true;
            this.dragStart = { x: touch.clientX - this.offset.x, y: touch.clientY - this.offset.y };
        }
    },

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        e.preventDefault();

        if (e.touches.length === 1 && this.isDragging) {
            const touch = e.touches[0];
            this.offset.x = touch.clientX - this.dragStart.x;
            this.offset.y = touch.clientY - this.dragStart.y;
            this.render();
        }
    },

    /**
     * Reset view to default
     */
    resetView() {
        this.offset = { x: 0, y: 0 };
        this.scale = 1;
        this.render();
    },

    // ============================================
    // EXPORT
    // ============================================

    /**
     * Export canvas to data URL
     */
    exportToDataURL(format = 'image/png', quality = 0.92) {
        // Reset view for export
        const savedOffset = { ...this.offset };
        const savedScale = this.scale;

        this.offset = { x: 0, y: 0 };
        this.scale = 1;
        this.render();

        const dataUrl = this.canvas.toDataURL(format, quality);

        // Restore view
        this.offset = savedOffset;
        this.scale = savedScale;
        this.render();

        return dataUrl;
    },

    /**
     * Export canvas to blob
     */
    async exportToBlob(format = 'image/png', quality = 0.92) {
        return new Promise((resolve) => {
            // Reset view for export
            const savedOffset = { ...this.offset };
            const savedScale = this.scale;

            this.offset = { x: 0, y: 0 };
            this.scale = 1;
            this.render();

            this.canvas.toBlob((blob) => {
                // Restore view
                this.offset = savedOffset;
                this.scale = savedScale;
                this.render();

                resolve(blob);
            }, format, quality);
        });
    },

    // ============================================
    // CLEANUP
    // ============================================

    /**
     * Destroy canvas instance
     */
    destroy() {
        this.stopAnimationLoop();
        this.clearParticles();
        this.imageCache.clear();
        this.canvas = null;
        this.ctx = null;
    }
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopCanvas };
}

// Global export for browser
if (typeof window !== 'undefined') {
    window.ShopCanvas = ShopCanvas;
}
