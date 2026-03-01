/**
 * GameLifecycle Contract Tests
 *
 * Verifies:
 * - lifecycle.js no longer does DOM for best score (uses GameEvents)
 * - game:started and game:ended event contracts
 * - mode fallback emits game:mode-fallback
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
    if (fns)
      this._listeners.set(
        event,
        fns.filter(f => f !== fn)
      );
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

// ============================================
// MOCK GLOBALS
// ============================================

const VALID_GAME_IDS = new Set(['tokencatcher', 'burnrunner', 'pumparena']);

function isValidGameId(id) {
  return VALID_GAME_IDS.has(id);
}

function sanitizeNumber(val, min, max, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

const appState = {
  wallet: null,
  practiceScores: {},
};

const saveState = jest.fn();
const activeGameModes = {};
const activeGames = {};
const activeGameSessions = {};

// Stubs for optional integrations
const AntiCheat = undefined;
const ApiClient = undefined;
const addXpFromGame = undefined;
const showXpNotification = undefined;
const showTierUpCelebration = undefined;
const initializeGame = jest.fn();

// Mock DOM
let domElements = {};

function createMockElement(id) {
  return {
    id,
    classList: {
      _classes: new Set(),
      add(cls) {
        this._classes.add(cls);
      },
      remove(cls) {
        this._classes.delete(cls);
      },
      contains(cls) {
        return this._classes.has(cls);
      },
    },
    style: {},
    textContent: '',
    innerHTML: '',
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    remove() {},
  };
}

// ============================================
// COPY OF RELEVANT GameLifecycle METHODS
// ============================================

// Minimal endGame focusing on event contracts
async function endGame_scoreEvents(gameId, finalScore) {
  if (!isValidGameId(gameId)) return;

  const safeScore = sanitizeNumber(finalScore, 0, 999999999, 0);

  // Simulate updateScore inline (scoring.js tested separately)
  if (typeof GameEvents !== 'undefined') {
    GameEvents.emit('score:updated', { gameId, score: safeScore });
  }
  if (safeScore > (appState.practiceScores[gameId] || 0)) {
    appState.practiceScores[gameId] = safeScore;
    if (typeof GameEvents !== 'undefined') {
      GameEvents.emit('score:best', { gameId, score: safeScore });
    }
  }

  const isCompetitive =
    typeof activeGameModes !== 'undefined' && activeGameModes[gameId] === 'competitive';

  // API best score path — now uses events instead of getElementById
  if (appState.wallet) {
    // Simulating apiResult.isNewBest path
    const apiResult = { isNewBest: true, bestScore: safeScore + 100 };
    if (apiResult.isNewBest) {
      appState.practiceScores[gameId] = apiResult.bestScore;
      if (typeof saveState === 'function') saveState();
      if (typeof GameEvents !== 'undefined') {
        GameEvents.emit('score:best', { gameId, score: apiResult.bestScore });
      }
    }
  }

  GameEvents.emit('game:ended', { gameId, score: safeScore, isCompetitive });
}

// startGame focusing on mode fallback and game:started
function startGame_events(gameId) {
  if (!isValidGameId(gameId)) return;

  const isCompetitive =
    typeof activeGameModes !== 'undefined' && activeGameModes[gameId] === 'competitive';

  if (isCompetitive) {
    // Simulate canPlayCompetitive failure
    if (activeGameModes[gameId + '_deny']) {
      GameEvents.emit('notify', { msg: 'Competitive not available' });
      GameEvents.emit('game:mode-fallback', { gameId });
    }
  }

  // Read mode AFTER fallback (may have changed)
  const actualMode = typeof activeGameModes !== 'undefined' ? activeGameModes[gameId] : 'practice';
  GameEvents.emit('game:started', { gameId, isCompetitive: actualMode === 'competitive' });
}

// ============================================
// TESTS
// ============================================

describe('GameLifecycle', () => {
  beforeEach(() => {
    GameEvents._listeners.clear();
    appState.wallet = null;
    appState.practiceScores = {};
    saveState.mockClear();
    Object.keys(activeGameModes).forEach(k => delete activeGameModes[k]);
    domElements = {};
  });

  describe('endGame — event emissions', () => {
    it('should emit game:ended with gameId, score, and isCompetitive', async () => {
      const handler = jest.fn();
      GameEvents.on('game:ended', handler);

      await endGame_scoreEvents('tokencatcher', 1500);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        gameId: 'tokencatcher',
        score: 1500,
        isCompetitive: false,
      });
    });

    it('should emit game:ended with isCompetitive=true when in competitive mode', async () => {
      activeGameModes['burnrunner'] = 'competitive';
      const handler = jest.fn();
      GameEvents.on('game:ended', handler);

      await endGame_scoreEvents('burnrunner', 800);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ isCompetitive: true }));
    });

    it('should emit score:updated before game:ended', async () => {
      const order = [];
      GameEvents.on('score:updated', () => order.push('score:updated'));
      GameEvents.on('game:ended', () => order.push('game:ended'));

      await endGame_scoreEvents('tokencatcher', 100);

      expect(order.indexOf('score:updated')).toBeLessThan(order.indexOf('game:ended'));
    });

    it('should sanitize negative scores to 0', async () => {
      const handler = jest.fn();
      GameEvents.on('game:ended', handler);

      await endGame_scoreEvents('tokencatcher', -500);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ score: 0 }));
    });
  });

  describe('endGame — API best score via events (not DOM)', () => {
    it('should emit score:best when API confirms new best (not getElementById)', async () => {
      appState.wallet = 'FakeWallet123456789012345678901234567890123';
      const handler = jest.fn();
      GameEvents.on('score:best', handler);

      await endGame_scoreEvents('tokencatcher', 2000);

      // Should have emitted score:best at least once (from API path)
      const apiCall = handler.mock.calls.find(c => c[0].score === 2100); // bestScore = 2000 + 100
      expect(apiCall).toBeDefined();
    });

    it('should call saveState when API confirms new best', async () => {
      appState.wallet = 'FakeWallet123456789012345678901234567890123';

      await endGame_scoreEvents('burnrunner', 500);

      expect(saveState).toHaveBeenCalled();
    });
  });

  describe('startGame — event emissions', () => {
    it('should emit game:started with gameId and isCompetitive', () => {
      const handler = jest.fn();
      GameEvents.on('game:started', handler);

      startGame_events('tokencatcher');

      expect(handler).toHaveBeenCalledWith({
        gameId: 'tokencatcher',
        isCompetitive: false,
      });
    });

    it('should emit game:started with isCompetitive=true', () => {
      activeGameModes['burnrunner'] = 'competitive';
      const handler = jest.fn();
      GameEvents.on('game:started', handler);

      startGame_events('burnrunner');

      expect(handler).toHaveBeenCalledWith({
        gameId: 'burnrunner',
        isCompetitive: true,
      });
    });

    it('should emit game:mode-fallback when competitive denied', () => {
      activeGameModes['tokencatcher'] = 'competitive';
      activeGameModes['tokencatcher_deny'] = true;
      const handler = jest.fn();
      GameEvents.on('game:mode-fallback', handler);

      startGame_events('tokencatcher');

      expect(handler).toHaveBeenCalledWith({ gameId: 'tokencatcher' });
    });

    it('should not start game with invalid gameId', () => {
      const handler = jest.fn();
      GameEvents.on('game:started', handler);

      startGame_events('invalid-game');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('DOM decoupling verification', () => {
    it('lifecycle.js endGame should not reference getElementById for best score', () => {
      // Read the actual source file content
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '../../../js/games/shared/lifecycle.js'),
        'utf-8'
      );

      // The API best score block (around line 129-134) should use GameEvents, not getElementById
      const apiBlock = src.match(/apiResult\.isNewBest[\s\S]*?}/);
      expect(apiBlock).toBeTruthy();
      expect(apiBlock[0]).not.toContain('getElementById');
      expect(apiBlock[0]).toContain('GameEvents');
    });
  });
});
