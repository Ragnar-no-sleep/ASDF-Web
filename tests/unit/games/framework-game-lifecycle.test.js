/**
 * Tests for GameLifecycle (games/framework/game-lifecycle.js)
 * Loads REAL source module — no inline replicas.
 */

'use strict';

const path = require('path');
const { loadModule } = require('../../fixtures/load-module');

beforeAll(() => {
  loadModule(path.join(__dirname, '../../../js/games/framework/game-lifecycle.js'));
});

const GL = () => global.GameLifecycle;

describe('GameLifecycle (SOLID: Open/Closed)', () => {
  describe('create', () => {
    it('should create game with required methods', () => {
      const game = GL().create({ gameId: 'testgame' });

      expect(typeof game.start).toBe('function');
      expect(typeof game.stop).toBe('function');
      expect(game.gameId).toBe('testgame');
    });

    it('should create game with optional methods', () => {
      const game = GL().create({ gameId: 'testgame' });

      expect(typeof game.onEvent).toBe('function');
      expect(typeof game.update).toBe('function');
      expect(typeof game.render).toBe('function');
      expect(typeof game.getState).toBe('function');
    });

    it('should have default gameId if not provided', () => {
      const game = GL().create();
      expect(game.gameId).toBe('game');
    });

    it('should throw on unimplemented start()', async () => {
      const game = GL().create({ gameId: 'raw' });
      await expect(game.start()).rejects.toThrow('[raw] Game.start() not implemented');
    });

    it('should throw on unimplemented stop()', async () => {
      const game = GL().create({ gameId: 'raw' });
      await expect(game.stop()).rejects.toThrow('[raw] Game.stop() not implemented');
    });

    it('should return empty state by default', () => {
      const game = GL().create();
      expect(game.getState()).toEqual({});
    });
  });

  describe('validate', () => {
    it('should validate game with required methods implemented', () => {
      const game = { start: async () => {}, stop: async () => {} };
      const result = GL().validate(game);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject null game', () => {
      const result = GL().validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Game is null or undefined');
    });

    it('should reject game without start()', () => {
      const result = GL().validate({ stop: async () => {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Game must implement start() method');
    });

    it('should reject game without stop()', () => {
      const result = GL().validate({ start: async () => {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Game must implement stop() method');
    });

    it('should reject game missing both required methods', () => {
      const result = GL().validate({ someOtherMethod: () => {} });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });

  describe('getCapabilities', () => {
    it('should detect real-time game (has update)', () => {
      const cap = GL().getCapabilities({
        start: () => {},
        stop: () => {},
        update: dt => {},
        render: ctx => {},
      });
      expect(cap.supportsRealTime).toBe(true);
      expect(cap.supportsRender).toBe(true);
      expect(cap.supportsEvents).toBe(false);
    });

    it('should detect event-driven game (has onEvent, no update)', () => {
      const cap = GL().getCapabilities({
        start: () => {},
        stop: () => {},
        onEvent: async () => {},
      });
      expect(cap.supportsRealTime).toBe(false);
      expect(cap.supportsEvents).toBe(true);
      expect(cap.supportsRender).toBe(false);
    });

    it('should detect state-aware game (has getState)', () => {
      const cap = GL().getCapabilities({
        start: () => {},
        stop: () => {},
        getState: () => ({ score: 100 }),
      });
      expect(cap.supportsState).toBe(true);
    });

    it('should return all false for null game', () => {
      const cap = GL().getCapabilities(null);
      expect(cap.supportsRealTime).toBe(false);
      expect(cap.supportsEvents).toBe(false);
      expect(cap.supportsRender).toBe(false);
      expect(cap.supportsState).toBe(false);
    });
  });

  describe('Game Types (SOLID: O — extensible)', () => {
    it('should support real-time graphics game', () => {
      const game = {
        start: async () => {},
        stop: async () => {},
        update: () => {},
        render: () => {},
      };
      expect(GL().validate(game).valid).toBe(true);
      expect(GL().getCapabilities(game).supportsRealTime).toBe(true);
      expect(GL().getCapabilities(game).supportsRender).toBe(true);
    });

    it('should support turn-based game', () => {
      const game = {
        start: async () => {},
        stop: async () => {},
        onEvent: async () => {},
        getState: () => ({ board: [], turn: 'player' }),
      };
      expect(GL().validate(game).valid).toBe(true);
      const cap = GL().getCapabilities(game);
      expect(cap.supportsEvents).toBe(true);
      expect(cap.supportsState).toBe(true);
      expect(cap.supportsRealTime).toBe(false);
    });

    it('should support text adventure game', () => {
      const game = {
        start: async () => {},
        stop: async () => {},
        onEvent: async () => {},
      };
      expect(GL().validate(game).valid).toBe(true);
      expect(GL().getCapabilities(game).supportsEvents).toBe(true);
      expect(GL().getCapabilities(game).supportsRender).toBe(false);
    });

    it('should support roguelike dungeon crawler', () => {
      const game = {
        start: async () => {},
        stop: async () => {},
        update: () => {},
        render: () => {},
        onEvent: async () => {},
        getState: () => ({ player: { x: 5, y: 5 } }),
      };
      expect(GL().validate(game).valid).toBe(true);
      const cap = GL().getCapabilities(game);
      expect(cap.supportsRealTime).toBe(true);
      expect(cap.supportsEvents).toBe(true);
      expect(cap.supportsRender).toBe(true);
      expect(cap.supportsState).toBe(true);
    });
  });
});
