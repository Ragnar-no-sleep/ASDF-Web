/**
 * ASDF Game Framework — Asset Loader
 *
 * Lazy-load Kenney sprites + geometry fallback
 * Kenney sprites are CC0 licensed
 * If load fails, games remain playable with geometry shapes
 *
 * Pattern: Lazy loading with caching, fallback support
 *
 * @module games/framework/assets
 */

'use strict';

const AssetLoader = {
  _images: new Map(), // id -> HTMLImageElement
  _loading: new Map(), // id -> Promise
  _baseUrl: 'assets/games/',

  /**
   * Set base URL for assets (default: 'assets/games/')
   * @param {string} url - Base URL
   */
  setBaseUrl(url) {
    this._baseUrl = url;
  },

  /**
   * Load a single image asset
   * @param {string} id - Asset ID
   * @param {string} url - Full URL or relative path
   * @returns {Promise<HTMLImageElement>} Resolves when loaded or fails gracefully
   */
  async loadImage(id, url) {
    if (this._images.has(id)) {
      return this._images.get(id);
    }

    if (this._loading.has(id)) {
      return this._loading.get(id);
    }

    const promise = new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this._images.set(id, img);
        this._loading.delete(id);
        resolve(img);
      };

      img.onerror = () => {
        console.warn(`[AssetLoader] Failed to load ${id}: ${url}`);
        this._loading.delete(id);
        resolve(null); // Resolve with null, allow fallback rendering
      };

      img.src = url;
    });

    this._loading.set(id, promise);
    return promise;
  },

  /**
   * Load manifest of assets
   * @param {Object} manifest - { id: 'url' } map
   * @returns {Promise<void>}
   */
  async load(manifest = {}) {
    const promises = [];
    for (const [id, url] of Object.entries(manifest)) {
      promises.push(this.loadImage(id, url));
    }
    await Promise.all(promises);
  },

  /**
   * Get cached image
   * @param {string} id - Asset ID
   * @returns {HTMLImageElement|null} Cached image or null
   */
  get(id) {
    return this._images.get(id) || null;
  },

  /**
   * Eagerly preload a list of asset IDs
   * @param {string[]} ids - Array of asset IDs
   * @returns {Promise<void>}
   */
  async preload(ids = []) {
    const promises = [];
    for (const id of ids) {
      const url = `${this._baseUrl}${id}.png`;
      promises.push(this.loadImage(id, url));
    }
    await Promise.all(promises);
  },

  /**
   * Draw image or fallback to geometry function
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} id - Asset ID
   * @param {number} x - Draw X position
   * @param {number} y - Draw Y position
   * @param {number} w - Draw width
   * @param {number} h - Draw height
   * @param {Function} [drawFn] - Fallback function(ctx, x, y, w, h)
   */
  drawOrFallback(ctx, id, x, y, w, h, drawFn) {
    if (!ctx) return;

    const img = this.get(id);
    if (img) {
      ctx.drawImage(img, x, y, w, h);
    } else if (drawFn && typeof drawFn === 'function') {
      drawFn(ctx, x, y, w, h);
    }
  },

  /**
   * Clear all cached assets (for testing)
   */
  clear() {
    this._images.clear();
    this._loading.clear();
  },

  /**
   * Get cache statistics
   * @returns {Object} { loadedCount, loadingCount }
   */
  getStats() {
    return {
      loadedCount: this._images.size,
      loadingCount: this._loading.size,
    };
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.AssetLoader = AssetLoader;
}
