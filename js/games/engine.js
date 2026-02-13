/**
 * ASDF Games - Engine Shared Infrastructure
 *
 * Shared state and utilities used by all game engines.
 * Game implementations are in engines/*.js (loaded before this file).
 *
 * Exports: activeGames, activeGameSessions, recordGameAction,
 *          recordScoreUpdate, updateScore
 */

'use strict';

const activeGames = {};
// activeGameModes is defined in state.js (loaded before engine.js)
const activeGameSessions = {}; // Anti-cheat session tracking

// sanitizeNumber and isValidGameId are provided by shared/validation.js

// startGame() - now provided by shared/lifecycle.js
// See GameLifecycle.startGame() for implementation

/**
 * Record a game action for anti-cheat tracking
 */
function recordGameAction(gameId, actionType, data = {}) {
  const sessionId = activeGameSessions[gameId];
  if (sessionId && typeof AntiCheat !== 'undefined') {
    AntiCheat.recordAction(sessionId, actionType, data);
  }
}

/**
 * Record a score update for anti-cheat tracking
 */
function recordScoreUpdate(gameId, score, delta) {
  const sessionId = activeGameSessions[gameId];
  if (sessionId && typeof AntiCheat !== 'undefined') {
    AntiCheat.recordScore(sessionId, score, delta);
  }
}

// initializeGame() - now provided by engines/index.js
// See GameEngines for modular game routing with legacy fallback

// stopGame() - now provided by shared/lifecycle.js
// See GameLifecycle.stopGame() for implementation

function updateScore(gameId, score) {
  const scoreEl = document.getElementById(`score-${gameId}`);
  if (scoreEl) scoreEl.textContent = score;

  if (score > (appState.practiceScores[gameId] || 0)) {
    appState.practiceScores[gameId] = score;
    const bestEl = document.getElementById(`best-${gameId}`);
    if (bestEl) bestEl.textContent = score;
    saveState();
  }
}

// endGame() - now provided by shared/lifecycle.js
// See GameLifecycle.endGame() for implementation with achievements support

// ============================================
// GAME IMPLEMENTATIONS → engines/*.js
// ============================================
// All 10 games extracted to individual modules:
//   engines/tokencatcher.js, engines/burnrunner.js,
//   engines/scamblaster.js, engines/cryptoheist.js,
//   engines/pumparena.js, engines/whalewatch.js,
//   engines/stakestacker.js, engines/dexdash.js,
//   engines/burnorhold.js, engines/liquiditymaze.js
// Coordinator: engines/index.js (GameEngines)
