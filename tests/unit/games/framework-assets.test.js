/**
 * Tests for AssetLoader (games/framework/assets.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/assets.js'));
});

const AL = () => global.AssetLoader;

describe('AssetLoader', () => {
  afterEach(() => {
    AL().clear();
    AL().setBaseUrl('assets/games/');
  });

  describe('defaults', () => {
    it('should start with empty caches', () => {
      const stats = AL().getStats();
      expect(stats.loadedCount).toBe(0);
      expect(stats.loadingCount).toBe(0);
    });

    it('should have default base URL', () => {
      expect(AL()._baseUrl).toBe('assets/games/');
    });

    it('should allow changing base URL', () => {
      AL().setBaseUrl('/sprites/');
      expect(AL()._baseUrl).toBe('/sprites/');
    });
  });

  describe('loadImage', () => {
    it('should create Image and set src', () => {
      // jsdom Image never fires onload/onerror (no network)
      // so we test the synchronous setup, not the async resolution
      const promise = AL().loadImage('test', '/test.png');
      expect(promise).toBeInstanceOf(Promise);
      expect(AL()._loading.has('test')).toBe(true);
    });

    it('should cache and return same result on second call', async () => {
      // Manually inject into cache to test cache path
      const fakeImg = { src: '/hero.png', width: 64, height: 64 };
      AL()._images.set('hero', fakeImg);

      const result = await AL().loadImage('hero', '/hero.png');
      expect(result).toBe(fakeImg);
    });

    it('should deduplicate concurrent loads', () => {
      // Inject loading promise — async loadImage returns awaited version
      const pending = new Promise(() => {}); // Never resolves
      AL()._loading.set('dup', pending);

      const result = AL().loadImage('dup', '/dup.png');
      // Result is a new promise (async wrapper) but _loading entry unchanged
      expect(result).toBeInstanceOf(Promise);
      expect(AL()._loading.get('dup')).toBe(pending);
    });
  });

  describe('get', () => {
    it('should return null for unknown asset', () => {
      expect(AL().get('nonexistent')).toBeNull();
    });

    it('should return cached image', () => {
      AL()._images.set('cached', { src: '/x.png' });
      expect(AL().get('cached')).toBeTruthy();
    });
  });

  describe('load (manifest)', () => {
    it('should call loadImage for each entry', async () => {
      const spy = jest.spyOn(AL(), 'loadImage').mockResolvedValue(null);
      await AL().load({ a: '/a.png', b: '/b.png', c: '/c.png' });
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith('a', '/a.png');
      spy.mockRestore();
    });

    it('should handle empty manifest', async () => {
      await AL().load({});
      expect(AL().getStats().loadedCount).toBe(0);
    });
  });

  describe('preload', () => {
    it('should construct URLs from baseUrl + id + .png', async () => {
      const spy = jest.spyOn(AL(), 'loadImage').mockResolvedValue(null);
      await AL().preload(['ship', 'bullet']);
      expect(spy).toHaveBeenCalledWith('ship', 'assets/games/ship.png');
      expect(spy).toHaveBeenCalledWith('bullet', 'assets/games/bullet.png');
      spy.mockRestore();
    });
  });

  describe('drawOrFallback', () => {
    it('should draw image if cached', () => {
      const ctx = { drawImage: jest.fn() };
      const img = { src: '/sprite.png' };
      AL()._images.set('sprite', img);

      AL().drawOrFallback(ctx, 'sprite', 10, 20, 32, 32);
      expect(ctx.drawImage).toHaveBeenCalledWith(img, 10, 20, 32, 32);
    });

    it('should call fallback when image missing', () => {
      const ctx = { drawImage: jest.fn() };
      const fallback = jest.fn();

      AL().drawOrFallback(ctx, 'missing', 10, 20, 32, 32, fallback);
      expect(ctx.drawImage).not.toHaveBeenCalled();
      expect(fallback).toHaveBeenCalledWith(ctx, 10, 20, 32, 32);
    });

    it('should do nothing without image or fallback', () => {
      const ctx = { drawImage: jest.fn() };
      AL().drawOrFallback(ctx, 'missing', 0, 0, 1, 1);
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('should handle null ctx', () => {
      expect(() => AL().drawOrFallback(null, 'x', 0, 0, 1, 1)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should empty all caches', () => {
      AL()._images.set('a', {});
      AL()._loading.set('b', Promise.resolve());
      AL().clear();
      expect(AL().getStats()).toEqual({ loadedCount: 0, loadingCount: 0 });
    });
  });
});
