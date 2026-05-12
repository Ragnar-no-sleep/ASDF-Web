/**
 * ASDF Game Framework — Registry Lock Tests (SOLID: O — Open/Closed)
 * @module tests/unit/games/framework-registry-lock
 */

'use strict';

describe('GameRegistry Lock (SOLID: Open/Closed)', () => {
  let registry;

  beforeEach(() => {
    // Simplified GameRegistry for testing
    registry = {
      _map: new Map(),
      _locked: false,

      register(gameId, engine) {
        if (this._locked) {
          console.error('[GameRegistry] Registry locked. Cannot register after GameEngines.init()');
          return;
        }

        if (!gameId || typeof gameId !== 'string') {
          console.error('[GameRegistry] Invalid gameId:', gameId);
          return;
        }
        if (!engine || typeof engine.start !== 'function') {
          console.error(`[GameRegistry] Invalid engine for ${gameId}: missing start() method`);
          return;
        }
        this._map.set(gameId, engine);
      },

      get(gameId) {
        return this._map.get(gameId);
      },

      has(gameId) {
        return this._map.has(gameId);
      },

      clear() {
        this._map.clear();
      },

      lock() {
        this._locked = true;
      },

      unlock() {
        this._locked = false;
      },

      isLocked() {
        return this._locked;
      },
    };
  });

  describe('register before lock', () => {
    it('should allow registration before lock', () => {
      const mockEngine = { start: () => {}, stop: () => {} };
      registry.register('testgame', mockEngine);

      expect(registry.has('testgame')).toBe(true);
    });

    it('should accept multiple registrations before lock', () => {
      const engine1 = { start: () => {}, stop: () => {} };
      const engine2 = { start: () => {}, stop: () => {} };
      const engine3 = { start: () => {}, stop: () => {} };

      registry.register('game1', engine1);
      registry.register('game2', engine2);
      registry.register('game3', engine3);

      expect(registry.has('game1')).toBe(true);
      expect(registry.has('game2')).toBe(true);
      expect(registry.has('game3')).toBe(true);
    });
  });

  describe('register after lock', () => {
    it('should reject registration after lock', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      registry.lock();
      const mockEngine = { start: () => {}, stop: () => {} };
      registry.register('newgame', mockEngine);

      expect(registry.has('newgame')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[GameRegistry] Registry locked. Cannot register after GameEngines.init()'
      );
      consoleSpy.mockRestore();
    });

    it('should prevent post-init registration attempts', () => {
      const engine1 = { start: () => {}, stop: () => {} };
      registry.register('game1', engine1);

      registry.lock();

      const engine2 = { start: () => {}, stop: () => {} };
      registry.register('game2', engine2);

      expect(registry.has('game1')).toBe(true);
      expect(registry.has('game2')).toBe(false);
    });
  });

  describe('lock/unlock/isLocked', () => {
    it('should track locked state', () => {
      expect(registry.isLocked()).toBe(false);

      registry.lock();
      expect(registry.isLocked()).toBe(true);

      registry.unlock();
      expect(registry.isLocked()).toBe(false);
    });

    it('should allow re-registration after unlock (testing only)', () => {
      registry.lock();

      const mockEngine = { start: () => {}, stop: () => {} };
      registry.register('game1', mockEngine);
      expect(registry.has('game1')).toBe(false);

      // Unlock for test isolation
      registry.unlock();

      registry.register('game1', mockEngine);
      expect(registry.has('game1')).toBe(true);
    });
  });

  describe('clear ignores lock (testing)', () => {
    it('should clear even when locked', () => {
      const mockEngine = { start: () => {}, stop: () => {} };
      registry.register('game1', mockEngine);
      registry.lock();

      registry.clear();

      expect(registry.has('game1')).toBe(false);
    });
  });

  describe('SOLID: Open/Closed Principle', () => {
    it('registry is open for extension (before lock)', () => {
      const gameA = { start: () => {}, stop: () => {} };
      const gameB = { start: () => {}, stop: () => {} };

      registry.register('gameA', gameA);
      registry.register('gameB', gameB);

      expect(registry.has('gameA')).toBe(true);
      expect(registry.has('gameB')).toBe(true);
    });

    it('registry is closed for modification (after lock)', () => {
      const gameA = { start: () => {}, stop: () => {} };
      registry.register('gameA', gameA);

      registry.lock();

      const gameB = { start: () => {}, stop: () => {} };
      registry.register('gameB', gameB);

      // GameB cannot be registered
      expect(registry.has('gameB')).toBe(false);
      // GameA still accessible
      expect(registry.has('gameA')).toBe(true);
    });
  });

  describe('Test isolation pattern', () => {
    it('should reset registry between tests', () => {
      // This test simulates what happens in beforeEach
      registry.unlock();
      registry.clear();

      const mockEngine = { start: () => {}, stop: () => {} };
      registry.register('testgame', mockEngine);

      expect(registry.has('testgame')).toBe(true);
      expect(registry.isLocked()).toBe(false);
    });
  });
});
