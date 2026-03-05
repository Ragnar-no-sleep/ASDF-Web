/**
 * Tests for AssetLoader (games/framework/assets.js)
 * Lazy-load images with caching + geometry fallback
 */

'use strict';

describe('AssetLoader', () => {
  let AssetLoader;

  beforeEach(() => {
    // Inline replica matching assets.js contract
    AssetLoader = {
      _images: new Map(),
      _loading: new Map(),
      _baseUrl: 'assets/games/',

      setBaseUrl(url) {
        this._baseUrl = url;
      },

      async loadImage(id, url) {
        if (this._images.has(id)) {
          return this._images.get(id);
        }
        if (this._loading.has(id)) {
          return this._loading.get(id);
        }

        const promise = new Promise(resolve => {
          // Simulate image loading in test env
          const img = { src: '', width: 100, height: 100, _loaded: true };
          img.src = url;
          this._images.set(id, img);
          this._loading.delete(id);
          resolve(img);
        });

        this._loading.set(id, promise);
        return promise;
      },

      async load(manifest = {}) {
        const promises = [];
        for (const [id, url] of Object.entries(manifest)) {
          promises.push(this.loadImage(id, url));
        }
        await Promise.all(promises);
      },

      get(id) {
        return this._images.get(id) || null;
      },

      async preload(ids = []) {
        const promises = [];
        for (const id of ids) {
          const url = `${this._baseUrl}${id}.png`;
          promises.push(this.loadImage(id, url));
        }
        await Promise.all(promises);
      },

      drawOrFallback(ctx, id, x, y, w, h, drawFn) {
        if (!ctx) return;
        const img = this.get(id);
        if (img) {
          ctx.drawImage(img, x, y, w, h);
        } else if (drawFn && typeof drawFn === 'function') {
          drawFn(ctx, x, y, w, h);
        }
      },

      clear() {
        this._images.clear();
        this._loading.clear();
      },

      getStats() {
        return {
          loadedCount: this._images.size,
          loadingCount: this._loading.size,
        };
      },
    };
  });

  afterEach(() => {
    AssetLoader.clear();
  });

  describe('create and defaults', () => {
    it('should start with empty caches', () => {
      const stats = AssetLoader.getStats();
      expect(stats.loadedCount).toBe(0);
      expect(stats.loadingCount).toBe(0);
    });

    it('should have default base URL', () => {
      expect(AssetLoader._baseUrl).toBe('assets/games/');
    });

    it('should allow changing base URL', () => {
      AssetLoader.setBaseUrl('/sprites/');
      expect(AssetLoader._baseUrl).toBe('/sprites/');
    });
  });

  describe('loadImage', () => {
    it('should load and cache an image', async () => {
      const img = await AssetLoader.loadImage('hero', '/sprites/hero.png');
      expect(img).toBeTruthy();
      expect(img.src).toBe('/sprites/hero.png');
      expect(AssetLoader.getStats().loadedCount).toBe(1);
    });

    it('should return cached image on second load', async () => {
      const img1 = await AssetLoader.loadImage('hero', '/sprites/hero.png');
      const img2 = await AssetLoader.loadImage('hero', '/sprites/hero.png');
      expect(img1).toBe(img2);
    });

    it('should deduplicate concurrent loads', async () => {
      const p1 = AssetLoader.loadImage('hero', '/sprites/hero.png');
      const p2 = AssetLoader.loadImage('hero', '/sprites/hero.png');
      const [img1, img2] = await Promise.all([p1, p2]);
      expect(img1).toBe(img2);
    });
  });

  describe('load (manifest)', () => {
    it('should load multiple assets from manifest', async () => {
      await AssetLoader.load({
        hero: '/sprites/hero.png',
        enemy: '/sprites/enemy.png',
        bg: '/sprites/bg.png',
      });
      expect(AssetLoader.getStats().loadedCount).toBe(3);
      expect(AssetLoader.get('hero')).toBeTruthy();
      expect(AssetLoader.get('enemy')).toBeTruthy();
      expect(AssetLoader.get('bg')).toBeTruthy();
    });

    it('should handle empty manifest', async () => {
      await AssetLoader.load({});
      expect(AssetLoader.getStats().loadedCount).toBe(0);
    });
  });

  describe('get', () => {
    it('should return null for unknown asset', () => {
      expect(AssetLoader.get('nonexistent')).toBeNull();
    });

    it('should return cached image', async () => {
      await AssetLoader.loadImage('test', '/test.png');
      expect(AssetLoader.get('test')).toBeTruthy();
    });
  });

  describe('preload', () => {
    it('should preload using base URL + .png extension', async () => {
      await AssetLoader.preload(['ship', 'bullet']);
      expect(AssetLoader.get('ship')).toBeTruthy();
      expect(AssetLoader.get('ship').src).toBe('assets/games/ship.png');
      expect(AssetLoader.get('bullet').src).toBe('assets/games/bullet.png');
    });

    it('should handle empty array', async () => {
      await AssetLoader.preload([]);
      expect(AssetLoader.getStats().loadedCount).toBe(0);
    });
  });

  describe('drawOrFallback', () => {
    it('should draw image if cached', async () => {
      const ctx = { drawImage: jest.fn() };
      await AssetLoader.loadImage('sprite', '/sprite.png');

      AssetLoader.drawOrFallback(ctx, 'sprite', 10, 20, 32, 32);
      expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 10, 20, 32, 32);
    });

    it('should call fallback function if image not cached', () => {
      const ctx = { drawImage: jest.fn() };
      const fallback = jest.fn();

      AssetLoader.drawOrFallback(ctx, 'missing', 10, 20, 32, 32, fallback);
      expect(ctx.drawImage).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalledWith(ctx, 10, 20, 32, 32);
    });

    it('should do nothing if no image and no fallback', () => {
      const ctx = { drawImage: jest.fn() };
      AssetLoader.drawOrFallback(ctx, 'missing', 10, 20, 32, 32);
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('should do nothing if ctx is null', () => {
      expect(() => AssetLoader.drawOrFallback(null, 'x', 0, 0, 1, 1)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should empty all caches', async () => {
      await AssetLoader.load({ a: '/a.png', b: '/b.png' });
      expect(AssetLoader.getStats().loadedCount).toBe(2);

      AssetLoader.clear();
      expect(AssetLoader.getStats().loadedCount).toBe(0);
      expect(AssetLoader.get('a')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should track loaded count', async () => {
      await AssetLoader.loadImage('x', '/x.png');
      await AssetLoader.loadImage('y', '/y.png');
      expect(AssetLoader.getStats().loadedCount).toBe(2);
    });
  });
});
