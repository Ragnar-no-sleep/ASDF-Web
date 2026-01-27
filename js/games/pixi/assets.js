/**
 * PixiJS v8 Asset Management
 * Vanilla JavaScript - No TypeScript, No React
 *
 * @description Bundle-based asset loading with caching
 */

// PixiJS loaded via CDN or import map
const { Assets } = globalThis.PIXI || (await import('pixi.js'));

/**
 * Game Asset Manager
 */
export const GameAssets = {
  /** @type {Map<string, Array>} */
  bundles: new Map(),

  /** @type {Set<string>} */
  loadedBundles: new Set(),

  /**
   * Register an asset bundle
   * @param {string} bundleName - Unique bundle identifier
   * @param {Array<{alias: string, src: string}>} assets - Assets to register
   */
  register(bundleName, assets) {
    if (this.bundles.has(bundleName)) {
      console.warn(`[GameAssets] Bundle "${bundleName}" already registered`);
      return;
    }

    this.bundles.set(bundleName, assets);
    Assets.addBundle(bundleName, assets);

    console.log(`[GameAssets] Registered bundle "${bundleName}" with ${assets.length} assets`);
  },

  /**
   * Load an asset bundle
   * @param {string} bundleName - Bundle to load
   * @returns {Promise<Object>} - Loaded assets
   */
  async load(bundleName) {
    if (this.loadedBundles.has(bundleName)) {
      console.log(`[GameAssets] Bundle "${bundleName}" already loaded`);
      return Assets.get(bundleName);
    }

    if (!this.bundles.has(bundleName)) {
      throw new Error(`[GameAssets] Bundle "${bundleName}" not registered`);
    }

    console.log(`[GameAssets] Loading bundle "${bundleName}"...`);
    const assets = await Assets.loadBundle(bundleName);
    this.loadedBundles.add(bundleName);

    console.log(`[GameAssets] Bundle "${bundleName}" loaded`);
    return assets;
  },

  /**
   * Preload bundles in background
   * @param {string[]} bundleNames - Bundles to preload
   * @returns {Promise<void>}
   */
  async preload(bundleNames) {
    const toLoad = bundleNames.filter(name => !this.loadedBundles.has(name));

    if (toLoad.length === 0) return;

    console.log(`[GameAssets] Preloading ${toLoad.length} bundles in background`);

    for (const name of toLoad) {
      if (this.bundles.has(name)) {
        Assets.backgroundLoad(this.bundles.get(name).map(a => a.src));
      }
    }
  },

  /**
   * Load a single asset
   * @param {string} src - Asset path
   * @param {string} alias - Optional alias
   * @returns {Promise<any>}
   */
  async loadSingle(src, alias = null) {
    if (alias) {
      return Assets.load({ alias, src });
    }
    return Assets.load(src);
  },

  /**
   * Get a loaded asset by alias
   * @param {string} alias - Asset alias
   * @returns {any}
   */
  get(alias) {
    return Assets.get(alias);
  },

  /**
   * Check if asset is loaded
   * @param {string} alias - Asset alias
   * @returns {boolean}
   */
  has(alias) {
    return Assets.cache.has(alias);
  },

  /**
   * Unload a bundle to free memory
   * @param {string} bundleName - Bundle to unload
   */
  async unload(bundleName) {
    if (!this.loadedBundles.has(bundleName)) return;

    const assets = this.bundles.get(bundleName);
    if (assets) {
      for (const asset of assets) {
        await Assets.unload(asset.alias || asset.src);
      }
    }

    this.loadedBundles.delete(bundleName);
    console.log(`[GameAssets] Unloaded bundle "${bundleName}"`);
  },

  /**
   * Clear all loaded assets
   */
  async clear() {
    for (const bundleName of this.loadedBundles) {
      await this.unload(bundleName);
    }
    this.loadedBundles.clear();
    console.log('[GameAssets] All assets cleared');
  },

  /**
   * Get loading progress for a bundle
   * @param {string} bundleName - Bundle name
   * @param {Function} onProgress - Progress callback (0-1)
   * @returns {Promise<Object>}
   */
  async loadWithProgress(bundleName, onProgress) {
    if (!this.bundles.has(bundleName)) {
      throw new Error(`[GameAssets] Bundle "${bundleName}" not registered`);
    }

    return Assets.loadBundle(bundleName, onProgress);
  },
};

export default GameAssets;
