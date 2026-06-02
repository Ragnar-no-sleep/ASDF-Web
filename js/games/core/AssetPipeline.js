/**
 * ASDF Asset Pipeline
 * High-performance, modular resource loader and cache.
 *
 * Support for:
 * - Sprites (Emojis, SVGs, PNGs)
 * - Audio (SFX, Ambient)
 * - Data (JSON configs, Game balance)
 */

'use strict';

(function () {
  const AssetPipeline = {
    name: 'AssetPipeline',
    cache: new Map(),
    queue: new Set(),

    /**
     * Plugin initialization
     */
    init(kernel) {
      this.kernel = kernel;
      kernel.registerService('assets', this);
    },

    /**
     * Load multiple assets in parallel
     * @param {Object[]} assets - Array of { id, type, url }
     */
    async loadBatch(assets) {
      console.log(`[AssetPipeline] Loading batch of ${assets.length} assets...`);
      const results = await Promise.all(assets.map(a => this.load(a)));
      return results;
    },

    /**
     * Load a single asset
     * @param {Object} asset - { id, type, url, data }
     */
    async load(asset) {
      if (this.cache.has(asset.id)) {
        return this.cache.get(asset.id);
      }

      let promise;
      switch (asset.type) {
        case 'sprite':
          promise = this._loadSprite(asset);
          break;
        case 'audio':
          promise = this._loadAudio(asset);
          break;
        case 'json':
          promise = this._loadJSON(asset);
          break;
        default:
          promise = Promise.resolve(asset.data);
      }

      this.cache.set(asset.id, promise);
      const result = await promise;
      this.cache.set(asset.id, result); // Replace promise with actual result
      return result;
    },

    /**
     * Sprite Loader (compatible with SpriteCache)
     */
    async _loadSprite(asset) {
      if (typeof SpriteCache !== 'undefined') {
        // Pre-render emoji or SVG
        SpriteCache.preload([{ emoji: asset.data, size: asset.size || 60 }]);
        return asset.data;
      }
      return asset.data;
    },

    /**
     * JSON Loader
     */
    async _loadJSON(asset) {
      try {
        const resp = await fetch(asset.url);
        return await resp.json();
      } catch (e) {
        console.error(`[AssetPipeline] Failed to load JSON: ${asset.url}`, e);
        return null;
      }
    },

    /**
     * Audio Loader
     */
    async _loadAudio(asset) {
      // Basic implementation, could be expanded with Howler
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.src = asset.url;
        audio.oncanplaythrough = () => resolve(audio);
        audio.onerror = reject;
      });
    },

    /**
     * Get asset from cache
     */
    get(id) {
      return this.cache.get(id);
    },

    /**
     * Clear cache
     */
    clear() {
      this.cache.clear();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.AssetPipeline = AssetPipeline;
})();
