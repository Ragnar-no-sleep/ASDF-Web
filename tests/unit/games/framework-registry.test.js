/**
 * Tests for GameRegistry (games/framework/registry.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/registry.js'));
});

const GR = () => global.GameRegistry;

describe('GameRegistry', () => {
  afterEach(() => {
    GR().clear();
    GR().unlock();
  });

  describe('register', () => {
    it('should register a valid engine', () => {
      const engine = { start: () => {}, stop: () => {} };
      GR().register('testgame', engine);

      expect(GR().has('testgame')).toBe(true);
      expect(GR().get('testgame')).toBe(engine);
    });

    it('should reject invalid gameId', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      GR().register(null, { start: () => {} });
      GR().register(123, { start: () => {} });
      spy.mockRestore();

      expect(GR().has(null)).toBe(false);
    });

    it('should reject engine without start method', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation();
      GR().register('badgame', { stop: () => {} });
      spy.mockRestore();

      expect(GR().has('badgame')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no engines registered', () => {
      expect(GR().getAll()).toEqual([]);
    });

    it('should return all registered engine IDs', () => {
      GR().register('game1', { start: () => {} });
      GR().register('game2', { start: () => {} });
      GR().register('game3', { start: () => {} });

      const all = GR().getAll();
      expect(all.length).toBe(3);
      expect(all).toContain('game1');
      expect(all).toContain('game2');
      expect(all).toContain('game3');
    });
  });

  describe('clear', () => {
    it('should clear all engines', () => {
      GR().register('game1', { start: () => {} });
      GR().register('game2', { start: () => {} });
      GR().clear();
      expect(GR().getAll()).toEqual([]);
    });
  });

  describe('lock / unlock', () => {
    it('should prevent registration when locked', () => {
      GR().lock();
      const spy = jest.spyOn(console, 'error').mockImplementation();
      GR().register('late', { start: () => {} });
      spy.mockRestore();

      expect(GR().has('late')).toBe(false);
    });

    it('should report locked state', () => {
      expect(GR().isLocked()).toBe(false);
      GR().lock();
      expect(GR().isLocked()).toBe(true);
    });

    it('should allow registration after unlock', () => {
      GR().lock();
      GR().unlock();
      GR().register('unlocked', { start: () => {} });
      expect(GR().has('unlocked')).toBe(true);
    });
  });

  describe('getMap', () => {
    it('should return the internal Map', () => {
      GR().register('x', { start: () => {} });
      const map = GR().getMap();
      expect(map).toBeInstanceOf(Map);
      expect(map.has('x')).toBe(true);
    });
  });
});
