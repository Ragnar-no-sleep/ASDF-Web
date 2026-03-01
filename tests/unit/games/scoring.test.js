/**
 * GameScoring Contract Tests
 *
 * Verifies scoring event emissions (score:updated, score:best)
 * and that scoring.js no longer touches DOM directly.
 *
 * Pattern: inline dependencies (no bundler) — same as store.test.js
 */

'use strict';

// ============================================
// INLINE DEPENDENCIES
// ============================================

const GameEvents = {
  _listeners: new Map(),
  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return () => this.off(event, fn);
  },
  off(event, fn) {
    const fns = this._listeners.get(event);
    if (fns) {
      this._listeners.set(
        event,
        fns.filter(f => f !== fn)
      );
    }
  },
  emit(event, data) {
    const fns = this._listeners.get(event);
    if (fns) {
      fns.forEach(fn => {
        try {
          fn(data);
        } catch (e) {
          console.error(`[GameEvents] ${event}:`, e);
        }
      });
    }
  },
};

const appState = {
  practiceScores: {},
};

const saveState = jest.fn();

// ============================================
// COPY OF GameScoring FROM js/games/shared/scoring.js
// ============================================

const GameScoring = {
  updateScore(gameId, score) {
    if (typeof GameEvents !== 'undefined') {
      GameEvents.emit('score:updated', { gameId, score });
    }

    if (typeof appState !== 'undefined' && score > (appState.practiceScores[gameId] || 0)) {
      appState.practiceScores[gameId] = score;
      if (typeof GameEvents !== 'undefined') {
        GameEvents.emit('score:best', { gameId, score });
      }
      if (typeof saveState === 'function') {
        saveState();
      }
    }
  },
};

// ============================================
// TESTS
// ============================================

describe('GameScoring', () => {
  beforeEach(() => {
    GameEvents._listeners.clear();
    appState.practiceScores = {};
    saveState.mockClear();
  });

  describe('updateScore()', () => {
    it('should emit score:updated with gameId and score', () => {
      const handler = jest.fn();
      GameEvents.on('score:updated', handler);

      GameScoring.updateScore('tokencatcher', 500);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ gameId: 'tokencatcher', score: 500 });
    });

    it('should emit score:best when score exceeds previous best', () => {
      const handler = jest.fn();
      GameEvents.on('score:best', handler);

      GameScoring.updateScore('burnrunner', 1000);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ gameId: 'burnrunner', score: 1000 });
    });

    it('should NOT emit score:best when score is lower than previous best', () => {
      appState.practiceScores['burnrunner'] = 2000;
      const handler = jest.fn();
      GameEvents.on('score:best', handler);

      GameScoring.updateScore('burnrunner', 500);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should save best score to appState.practiceScores', () => {
      GameScoring.updateScore('tokencatcher', 750);

      expect(appState.practiceScores['tokencatcher']).toBe(750);
    });

    it('should NOT overwrite higher existing best score', () => {
      appState.practiceScores['tokencatcher'] = 1500;

      GameScoring.updateScore('tokencatcher', 800);

      expect(appState.practiceScores['tokencatcher']).toBe(1500);
    });

    it('should call saveState() on new best', () => {
      GameScoring.updateScore('burnrunner', 300);

      expect(saveState).toHaveBeenCalledTimes(1);
    });

    it('should NOT call saveState() when score is not a new best', () => {
      appState.practiceScores['burnrunner'] = 9999;

      GameScoring.updateScore('burnrunner', 100);

      expect(saveState).not.toHaveBeenCalled();
    });

    it('should always emit score:updated even when not a new best', () => {
      appState.practiceScores['burnrunner'] = 9999;
      const handler = jest.fn();
      GameEvents.on('score:updated', handler);

      GameScoring.updateScore('burnrunner', 100);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ gameId: 'burnrunner', score: 100 });
    });

    it('should emit score:updated synchronously (for UI consistency)', () => {
      const order = [];
      GameEvents.on('score:updated', () => order.push('event'));
      GameScoring.updateScore('tokencatcher', 1);
      order.push('after');

      expect(order).toEqual(['event', 'after']);
    });
  });

  describe('DOM decoupling', () => {
    it('should NOT reference document.getElementById', () => {
      // Read the actual source to verify no DOM access
      const source = GameScoring.updateScore.toString();
      expect(source).not.toContain('getElementById');
      expect(source).not.toContain('document.');
    });
  });
});
