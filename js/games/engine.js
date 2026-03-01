/**
 * ASDF Games - Engine Shared Infrastructure
 *
 * Shared state used by all game engines.
 * Game implementations are in engines/*.js (loaded before this file).
 *
 * Functions (updateScore, recordGameAction, recordScoreUpdate) are now
 * canonical in shared/scoring.js via GameScoring. Legacy wrappers there
 * provide global function compatibility.
 */

'use strict';

const activeGames = {};
// activeGameModes is defined in state.js (loaded before engine.js)
const activeGameSessions = {}; // Anti-cheat session tracking
