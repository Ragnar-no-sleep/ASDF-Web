/**
 * ASDF Games - Shared Lifecycle Management
 *
 * Extracted from engine.js for modularity
 * Handles game start, stop, and end flows
 */

'use strict';

const SharedLifecycle = {
  /**
   * Start a game session
   * @param {string} gameId - The game ID to start
   */
  startGame(gameId) {
    console.log(`[SharedLifecycle] Attempting to start game: ${gameId}`);

    // Security: Validate gameId
    const isIdValid = typeof isValidGameId === 'function' ? isValidGameId(gameId) : true;
    if (!isIdValid) {
      console.error(`[SharedLifecycle] Invalid gameId: ${gameId}`);
      return;
    }

    // Hide overlay IMMEDIATELY (brute force)
    const overlay = document.getElementById(`overlay-${gameId}`);
    if (overlay) {
      console.log(`[SharedLifecycle] Hiding overlay for ${gameId}`);
      overlay.classList.add('hidden');
      overlay.style.setProperty('display', 'none', 'important');
      overlay.setAttribute('aria-hidden', 'true');
    } else {
      console.warn(`[SharedLifecycle] Overlay not found for ${gameId}`);
      // Try to find any start overlay in this modal
      const modal = document.getElementById(`modal-${gameId}`);
      if (modal) {
        const anyOverlay = modal.querySelector('.game-start-overlay');
        if (anyOverlay) {
          anyOverlay.classList.add('hidden');
          anyOverlay.style.setProperty('display', 'none', 'important');
        }
      }
    }

    // Check if starting in competitive mode
    const isCompetitive =
      typeof activeGameModes !== 'undefined' && activeGameModes[gameId] === 'competitive';

    if (isCompetitive) {
      // Verify we can still play competitive and start session
      if (typeof canPlayCompetitive === 'function' && !canPlayCompetitive(gameId)) {
        if (typeof GameEvents !== 'undefined') {
          GameEvents.emit('notify', {
            msg: 'Mode comp\u00e9titif non disponible. Basculement vers le mode entra\u00eenement.',
          });
          GameEvents.emit('game:mode-fallback', { gameId });
        }
      } else if (typeof startCompetitiveSession === 'function' && !startCompetitiveSession()) {
        if (typeof GameEvents !== 'undefined') {
          GameEvents.emit('notify', {
            msg: "Temps comp\u00e9titif \u00e9puis\u00e9 pour aujourd'hui! Basculement vers le mode entra\u00eenement.",
          });
          GameEvents.emit('game:mode-fallback', { gameId });
        }
      }
    }

    // Start anti-cheat session
    if (typeof AntiCheat !== 'undefined') {
      const session = AntiCheat.startSession(gameId);
      if (typeof activeGameSessions !== 'undefined') {
        activeGameSessions[gameId] = session.id;
      }
    }

    // Start engine in next frame to allow DOM updates
    requestAnimationFrame(() => {
      // Read mode AFTER fallback logic (may have changed from competitive to practice)
      const actualMode =
        typeof activeGameModes !== 'undefined' ? activeGameModes[gameId] : 'practice';

      if (typeof GameEvents !== 'undefined') {
        GameEvents.emit('game:started', { gameId, isCompetitive: actualMode === 'competitive' });
      }

      // Delegate to GameEngines coordinator
      console.log(`[SharedLifecycle] Calling GameEngines.start(${gameId})`);
      if (typeof GameEngines !== 'undefined') {
        try {
          GameEngines.start(gameId);
        } catch (e) {
          console.error(`[SharedLifecycle] Failed to start engine for ${gameId}:`, e);
          // Show overlay again if engine failed to load
          if (overlay) {
            overlay.classList.remove('hidden');
            overlay.style.display = '';
          }
        }
      } else {
        console.error('[SharedLifecycle] GameEngines coordinator not found');
        // Legacy fallback
        if (typeof window.startLegacyGame === 'function') {
          window.startLegacyGame(gameId);
        }
      }
    });
  },

  /**
   * Stop a game and clean up
   * @param {string} gameId - The game ID to stop
   */
  stopGame(gameId) {
    if (typeof activeGames !== 'undefined' && activeGames[gameId]) {
      if (activeGames[gameId].interval) {
        clearInterval(activeGames[gameId].interval);
      }
      if (activeGames[gameId].cleanup) {
        activeGames[gameId].cleanup();
      }
      delete activeGames[gameId];
    }
  },

  /**
   * End a game session with final score
   * @param {string} gameId - The game ID
   * @param {number} finalScore - The final score
   */
  async endGame(gameId, finalScore) {
    if (!isValidGameId(gameId)) return;

    const safeScore = sanitizeNumber(finalScore, 0, 999999999, 0);
    updateScore(gameId, safeScore);
    this.stopGame(gameId);

    const isCompetitive =
      typeof activeGameModes !== 'undefined' && activeGameModes[gameId] === 'competitive';

    // End anti-cheat session and get validation data
    let sessionData = null;
    if (typeof activeGameSessions !== 'undefined' && typeof AntiCheat !== 'undefined') {
      const sessionId = activeGameSessions[gameId];
      if (sessionId) {
        sessionData = AntiCheat.endSession(sessionId, safeScore);
        delete activeGameSessions[gameId];

        if (sessionData && !sessionData.valid) {
          console.warn(`Session flagged for ${gameId}:`, sessionData.flags);
        }
      }
    }

    // Award XP from game score (ASDF Engage integration)
    let xpResult = null;
    if (safeScore > 0 && typeof addXpFromGame === 'function') {
      xpResult = addXpFromGame(safeScore);
      if (xpResult.success) {
        if (typeof showXpNotification === 'function') {
          showXpNotification(xpResult.xpGained, gameId);
        }
        if (
          xpResult.tieredUp &&
          typeof showTierUpCelebration === 'function' &&
          typeof ASDF !== 'undefined'
        ) {
          showTierUpCelebration(ASDF.engageTierNames[xpResult.tier.index - 1], xpResult.tier.name);
        }
      }
    }

    let apiResult = null;
    let submitError = null;

    if (typeof appState !== 'undefined' && appState.wallet) {
      try {
        if (typeof ApiClient !== 'undefined') {
          apiResult = await ApiClient.submitScore(gameId, safeScore, isCompetitive, sessionData);
          if (apiResult.isNewBest) {
            appState.practiceScores[gameId] = apiResult.bestScore;
            if (typeof saveState === 'function') saveState();
            if (typeof GameEvents !== 'undefined') {
              GameEvents.emit('score:best', { gameId, score: apiResult.bestScore });
            }
          }
        }
      } catch (error) {
        console.error('Failed to submit score:', error);
        submitError = error.message;
        if (safeScore > (appState.practiceScores[gameId] || 0)) {
          appState.practiceScores[gameId] = safeScore;
          if (typeof saveState === 'function') saveState();
        }
      }
    } else if (typeof appState !== 'undefined') {
      if (safeScore > (appState.practiceScores[gameId] || 0)) {
        appState.practiceScores[gameId] = safeScore;
        if (typeof saveState === 'function') saveState();
      }
    }

    // Render game over UI
    this.renderGameOver(gameId, safeScore, xpResult, apiResult, submitError, isCompetitive);

    GameEvents.emit('game:ended', { gameId, score: safeScore, isCompetitive });
  },

  /**
   * Render the game over overlay
   * @private
   */
  renderGameOver(gameId, safeScore, xpResult, apiResult, submitError, isCompetitive) {
    const arena = document.getElementById(`arena-${gameId}`);
    if (!arena) return;

    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = `gameover-${gameId}`;
    gameOverDiv.className = 'game-over-overlay';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'game-over-title';
    titleDiv.textContent = 'GAME OVER';

    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'game-over-score';
    scoreDiv.textContent = `Score: ${safeScore.toLocaleString()}`;

    if (apiResult?.isNewBest) {
      const newBestDiv = document.createElement('div');
      newBestDiv.className = 'game-over-new-best';
      newBestDiv.textContent = 'NEW BEST SCORE!';
      gameOverDiv.appendChild(titleDiv);
      gameOverDiv.appendChild(newBestDiv);
    } else {
      gameOverDiv.appendChild(titleDiv);
    }

    gameOverDiv.appendChild(scoreDiv);

    // Show XP gained from this game
    if (xpResult && xpResult.success && xpResult.xpGained > 0) {
      const xpDiv = document.createElement('div');
      xpDiv.className = 'game-over-xp';
      xpDiv.textContent = `+${xpResult.xpGained} XP`;
      gameOverDiv.appendChild(xpDiv);

      // Show current tier progress
      const tierDiv = document.createElement('div');
      tierDiv.className = 'game-over-tier';
      const tier = xpResult.tier;

      const tierNameSpan = document.createElement('span');
      tierNameSpan.className = 'tier-name';
      if (typeof ASDF !== 'undefined' && typeof ASDF.getTierColor === 'function') {
        tierNameSpan.style.color = ASDF.getTierColor(tier.index, 'engage');
      }
      tierNameSpan.textContent = tier.name;
      tierDiv.appendChild(tierNameSpan);

      if (!tier.isMax) {
        const progressSpan = document.createElement('span');
        progressSpan.className = 'tier-progress';
        progressSpan.textContent = ` ${Math.round(tier.progress * 100)}%`;
        tierDiv.appendChild(progressSpan);
      }
      gameOverDiv.appendChild(tierDiv);
    }

    if (isCompetitive && apiResult?.rank) {
      const rankDiv = document.createElement('div');
      rankDiv.className = 'game-over-rank';
      rankDiv.textContent = `Weekly Rank: #${apiResult.rank}`;
      gameOverDiv.appendChild(rankDiv);
    }

    if (submitError) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'game-over-error';
      errorDiv.textContent = `(Score saved locally - ${submitError})`;
      gameOverDiv.appendChild(errorDiv);
    }

    const restartBtn = document.createElement('button');
    restartBtn.className = 'btn btn-primary game-over-restart';
    restartBtn.textContent = 'PLAY AGAIN';
    restartBtn.addEventListener('click', () => {
      if (typeof restartGame === 'function') {
        restartGame(gameId);
      }
    });

    gameOverDiv.appendChild(restartBtn);
    arena.appendChild(gameOverDiv);
  },
};

// Legacy function exports for backwards compatibility
function startGame(gameId) {
  return SharedLifecycle.startGame(gameId);
}

function stopGame(gameId) {
  return SharedLifecycle.stopGame(gameId);
}

async function endGame(gameId, finalScore) {
  return SharedLifecycle.endGame(gameId, finalScore);
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.SharedLifecycle = SharedLifecycle;
  window.SharedLifecycle = window.ASDF.SharedLifecycle;
}
