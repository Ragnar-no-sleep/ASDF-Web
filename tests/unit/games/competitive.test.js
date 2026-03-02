/**
 * ASDF Games - CompetitiveUI Tests
 * Tests the competitive mode decoupling contract:
 * - resetToPractice sets mode, toggles DOM, hides timer
 * - init() subscribes to game:mode-fallback
 * - game:mode-fallback triggers resetToPractice synchronously
 * - game:started / game:ended event structure
 *
 * This is fine.
 */

// ============================================
// SHARED FIXTURES + INLINE SUT
// ============================================

const {
  createGameEvents,
  createMockElement,
  setupElementRegistry,
} = require('../../fixtures/game-mocks');

const GameEvents = createGameEvents();

// Mock activeGameModes (defined in state.js at runtime)
const activeGameModes = {};

// DOM element registry for getElementById mock
const { elements: domElements, cleanup: cleanupRegistry } = setupElementRegistry();

afterAll(() => {
  cleanupRegistry();
});

// CompetitiveUI under test (mirrors production competitive.js)
const CompetitiveUI = {
  init() {
    if (typeof GameEvents !== 'undefined') {
      GameEvents.on('game:mode-fallback', ({ gameId }) => {
        this.resetToPractice(gameId);
      });
    }
  },

  resetToPractice(gameId) {
    activeGameModes[gameId] = 'practice';
    const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);
    const practiceBtn = document.getElementById(`practice-btn-${gameId}`);
    if (competitiveBtn) competitiveBtn.classList.remove('active');
    if (practiceBtn) practiceBtn.classList.add('active');
    const timerStat = document.getElementById(`timer-stat-${gameId}`);
    if (timerStat) timerStat.style.display = 'none';
  },
};

// ============================================
// TESTS
// ============================================

describe('CompetitiveUI', () => {
  beforeEach(() => {
    // Reset state
    Object.keys(activeGameModes).forEach(k => delete activeGameModes[k]);
    GameEvents._listeners.clear();
    Object.keys(domElements).forEach(k => delete domElements[k]);
  });

  // ============================================
  // resetToPractice
  // ============================================
  describe('resetToPractice()', () => {
    it('should set activeGameModes to practice', () => {
      activeGameModes['tokencatcher'] = 'competitive';
      CompetitiveUI.resetToPractice('tokencatcher');
      expect(activeGameModes['tokencatcher']).toBe('practice');
    });

    it('should remove active class from competitive button', () => {
      const compBtn = createMockElement('competitive-btn-tokencatcher');
      compBtn.classList.add('active');
      domElements['competitive-btn-tokencatcher'] = compBtn;

      CompetitiveUI.resetToPractice('tokencatcher');
      expect(compBtn.classList.contains('active')).toBe(false);
    });

    it('should add active class to practice button', () => {
      const practiceBtn = createMockElement('practice-btn-tokencatcher');
      domElements['practice-btn-tokencatcher'] = practiceBtn;

      CompetitiveUI.resetToPractice('tokencatcher');
      expect(practiceBtn.classList.contains('active')).toBe(true);
    });

    it('should hide timer-stat element', () => {
      const timerStat = createMockElement('timer-stat-tokencatcher');
      timerStat.style.display = 'block';
      domElements['timer-stat-tokencatcher'] = timerStat;

      CompetitiveUI.resetToPractice('tokencatcher');
      expect(timerStat.style.display).toBe('none');
    });

    it('should not throw when DOM elements are missing', () => {
      // No DOM elements registered
      expect(() => {
        CompetitiveUI.resetToPractice('nonexistent');
      }).not.toThrow();
      expect(activeGameModes['nonexistent']).toBe('practice');
    });
  });

  // ============================================
  // init
  // ============================================
  describe('init()', () => {
    it('should subscribe to game:mode-fallback', () => {
      CompetitiveUI.init();
      expect(GameEvents._listeners.has('game:mode-fallback')).toBe(true);
      expect(GameEvents._listeners.get('game:mode-fallback').length).toBe(1);
    });

    it('game:mode-fallback should trigger resetToPractice synchronously', () => {
      activeGameModes['burnrunner'] = 'competitive';

      const compBtn = createMockElement('competitive-btn-burnrunner');
      compBtn.classList.add('active');
      domElements['competitive-btn-burnrunner'] = compBtn;

      const practiceBtn = createMockElement('practice-btn-burnrunner');
      domElements['practice-btn-burnrunner'] = practiceBtn;

      const timerStat = createMockElement('timer-stat-burnrunner');
      timerStat.style.display = 'block';
      domElements['timer-stat-burnrunner'] = timerStat;

      CompetitiveUI.init();
      GameEvents.emit('game:mode-fallback', { gameId: 'burnrunner' });

      // All effects happen synchronously — no deferred state
      expect(activeGameModes['burnrunner']).toBe('practice');
      expect(compBtn.classList.contains('active')).toBe(false);
      expect(practiceBtn.classList.contains('active')).toBe(true);
      expect(timerStat.style.display).toBe('none');
    });
  });

  // ============================================
  // Lifecycle events structure
  // ============================================
  describe('lifecycle events', () => {
    it('game:started event should carry gameId and isCompetitive', () => {
      const handler = jest.fn();
      GameEvents.on('game:started', handler);

      GameEvents.emit('game:started', { gameId: 'tokencatcher', isCompetitive: true });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        gameId: 'tokencatcher',
        isCompetitive: true,
      });
    });

    it('game:ended event should carry gameId, score, and isCompetitive', () => {
      const handler = jest.fn();
      GameEvents.on('game:ended', handler);

      GameEvents.emit('game:ended', { gameId: 'burnrunner', score: 4200, isCompetitive: false });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        gameId: 'burnrunner',
        score: 4200,
        isCompetitive: false,
      });
    });

    it('game:started should reflect practice mode after fallback', () => {
      const startedHandler = jest.fn();
      GameEvents.on('game:started', startedHandler);

      // Simulate: fallback fires first, then started
      activeGameModes['dexdash'] = 'competitive';
      CompetitiveUI.init();

      GameEvents.emit('game:mode-fallback', { gameId: 'dexdash' });
      expect(activeGameModes['dexdash']).toBe('practice');

      // Now game:started reads the actual mode (practice after fallback)
      const actualMode = activeGameModes['dexdash'] || 'practice';
      GameEvents.emit('game:started', {
        gameId: 'dexdash',
        isCompetitive: actualMode === 'competitive',
      });

      expect(startedHandler).toHaveBeenCalledWith({
        gameId: 'dexdash',
        isCompetitive: false,
      });
    });
  });
});
