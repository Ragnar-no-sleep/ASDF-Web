/**
 * ASDF Games - Shared Lifecycle Management
 *
 * Handles game start, stop, and end flows.
 * Evolution 2026: Move from legacy spaghetti to a robust state-driven manager.
 */

'use strict';

(function () {
  const GameLifecycle = {
    /** @type {Map<string, string>} Current state per gameId */
    states: new Map(),

    /**
     * Start a game session
     * @param {string} gameId - The game ID to start
     */
    startGame(gameId) {
      console.log(`[GameLifecycle] Starting: ${gameId}`);

      // 1. Validation
      if (typeof isValidGameId === 'function' && !isValidGameId(gameId)) {
        console.error(`[GameLifecycle] Invalid gameId rejected: ${gameId}`);
        return;
      }

      // 2. UI Reset
      this._resetGameUI(gameId);

      // 3. Mode Handling (Competitive vs Practice)
      const isCompetitive = this._handleModeSetup(gameId);

      // 4. Anti-Cheat Initialization
      this._initAntiCheat(gameId);

      // 5. Engine Ignition
      this.states.set(gameId, 'PLAYING');

      requestAnimationFrame(async () => {
        if (typeof GameEvents !== 'undefined') {
          GameEvents.emit('game:started', {
            gameId,
            isCompetitive:
              typeof activeGameModes !== 'undefined' && activeGameModes[gameId] === 'competitive',
          });
        }

        if (typeof GameEngines !== 'undefined') {
          try {
            await GameEngines.start(gameId);
          } catch (e) {
            console.error(`[GameLifecycle] Engine crash on start for ${gameId}:`, e);
            this._restoreOverlay(gameId);
          }
        } else if (typeof window.startLegacyGame === 'function') {
          window.startLegacyGame(gameId);
        }
      });
    },

    /**
     * Stop a game and clean up resources
     * @param {string} gameId - The game ID to stop
     */
    stopGame(gameId) {
      this.states.set(gameId, 'IDLE');

      if (typeof activeGames !== 'undefined' && activeGames[gameId]) {
        const game = activeGames[gameId];
        if (game.interval) clearInterval(game.interval);
        if (game.cleanup) game.cleanup();
        if (game.stop) game.stop(); // 11/10 Standard compatibility
        delete activeGames[gameId];
      }

      // Cleanup Ticker if modern context used
      if (typeof GameShared !== 'undefined' && GameShared.Ticker) {
        GameShared.Ticker.stop();
      }
    },

    /**
     * End a game session with final score
     * @param {string} gameId - The game ID
     * @param {number} finalScore - The final score
     */
    async endGame(gameId, finalScore) {
      if (this.states.get(gameId) === 'ENDED') return; // Prevent double trigger
      this.states.set(gameId, 'ENDED');

      const safeScore =
        typeof sanitizeNumber === 'function'
          ? sanitizeNumber(finalScore, 0, 999999999, 0)
          : finalScore;

      // Update local bests immediately
      if (typeof updateScore === 'function') updateScore(gameId, safeScore);

      this.stopGame(gameId);

      // Anti-Cheat & XP Integration
      const sessionData = this._finalizeAntiCheat(gameId, safeScore);
      const xpResult = this._handleXpAwards(gameId, safeScore);

      // API Submission
      let apiResult = null;
      let submitError = null;

      if (typeof appState !== 'undefined' && appState.wallet) {
        try {
          if (typeof ApiClient !== 'undefined') {
            const isComp =
              typeof activeGameModes !== 'undefined' && activeGameModes[gameId] === 'competitive';
            apiResult = await ApiClient.submitScore(gameId, safeScore, isComp, sessionData);
            this._handleApiResult(gameId, apiResult);
          }
        } catch (error) {
          console.error('[GameLifecycle] API Error:', error);
          submitError = error.message;
        }
      }

      // Final UI
      this.renderGameOver(gameId, safeScore, xpResult, apiResult, submitError);

      if (typeof GameEvents !== 'undefined') {
        GameEvents.emit('game:ended', { gameId, score: safeScore });
      }
    },

    /**
     * Reset UI elements for game start
     * @private
     */
    _resetGameUI(gameId) {
      const overlay = document.getElementById(`overlay-${gameId}`);
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.style.display = 'none';
      }

      const gameOver = document.getElementById(`gameover-${gameId}`);
      if (gameOver) gameOver.remove();
    },

    /**
     * Restore overlay if something fails
     * @private
     */
    _restoreOverlay(gameId) {
      const overlay = document.getElementById(`overlay-${gameId}`);
      if (overlay) {
        overlay.classList.remove('hidden');
        overlay.style.display = '';
      }
    },

    /**
     * Handle mode logic
     * @private
     */
    _handleModeSetup(gameId) {
      if (typeof activeGameModes === 'undefined') return false;
      if (activeGameModes[gameId] !== 'competitive') return false;

      if (typeof canPlayCompetitive === 'function' && !canPlayCompetitive(gameId)) {
        this._notifyFallback(gameId, 'Mode comp\u00e9titif non disponible.');
        return false;
      }

      if (typeof startCompetitiveSession === 'function' && !startCompetitiveSession()) {
        this._notifyFallback(gameId, 'Temps comp\u00e9titif \u00e9puis\u00e9!');
        return false;
      }

      return true;
    },

    _notifyFallback(gameId, msg) {
      if (typeof GameEvents !== 'undefined') {
        GameEvents.emit('notify', { msg: `${msg} Retour au mode entraînement.` });
        GameEvents.emit('game:mode-fallback', { gameId });
      }
    },

    /**
     * Anti-Cheat hooks
     * @private
     */
    _initAntiCheat(gameId) {
      if (typeof AntiCheat !== 'undefined') {
        const session = AntiCheat.startSession(gameId);
        if (typeof activeGameSessions !== 'undefined') {
          activeGameSessions[gameId] = session.id;
        }
      }
    },

    _finalizeAntiCheat(gameId, score) {
      if (typeof activeGameSessions !== 'undefined' && typeof AntiCheat !== 'undefined') {
        const sessionId = activeGameSessions[gameId];
        if (sessionId) {
          const data = AntiCheat.endSession(sessionId, score);
          delete activeGameSessions[gameId];
          return data;
        }
      }
      return null;
    },

    /**
     * XP Integration hooks
     * @private
     */
    _handleXpAwards(gameId, score) {
      if (score > 0 && typeof addXpFromGame === 'function') {
        const result = addXpFromGame(score);
        if (result.success) {
          if (typeof showXpNotification === 'function') showXpNotification(result.xpGained, gameId);
          if (result.tieredUp && typeof showTierUpCelebration === 'function') {
            const tierName = result.tier.name;
            const prevTierName =
              typeof ASDF !== 'undefined' ? ASDF.engageTierNames[result.tier.index - 1] : '';
            showTierUpCelebration(prevTierName, tierName);
          }
        }
        return result;
      }
      return null;
    },

    /**
     * API Success handling
     * @private
     */
    _handleApiResult(gameId, result) {
      if (result && result.isNewBest && typeof appState !== 'undefined') {
        appState.practiceScores[gameId] = result.bestScore;
        if (typeof saveState === 'function') saveState();
        if (typeof GameEvents !== 'undefined') {
          GameEvents.emit('score:best', { gameId, score: result.bestScore });
        }
      }
    },

    /**
     * Render Game Over Screen
     * 11/10 Standard: Uses a modular fragment builder
     */
    renderGameOver(gameId, score, xpResult, apiResult, error) {
      const arena = document.getElementById(`arena-${gameId}`);
      if (!arena) return;

      const overlay = document.createElement('div');
      overlay.id = `gameover-${gameId}`;
      overlay.className = 'game-over-overlay';

      const isNewBest =
        apiResult?.isNewBest ||
        (typeof appState !== 'undefined' && score > (appState.practiceScores[gameId] || 0));

      overlay.innerHTML = `
        <div class="game-over-title">GAME OVER</div>
        ${isNewBest ? '<div class="game-over-new-best">NEW BEST SCORE!</div>' : ''}
        <div class="game-over-score">Score: ${score.toLocaleString()}</div>
        ${this._getGameOverXpTemplate(xpResult)}
        ${apiResult?.rank ? `<div class="game-over-rank">Weekly Rank: #${apiResult.rank}</div>` : ''}
        ${error ? `<div class="game-over-error">(Score saved locally)</div>` : ''}
        <button class="btn btn-primary game-over-restart" data-action="restart-game" data-game="${gameId}">
          PLAY AGAIN
        </button>
      `;

      // Event listener for restart is handled by delegation in main.js
      arena.appendChild(overlay);
    },

    _getGameOverXpTemplate(result) {
      if (!result || !result.success || result.xpGained <= 0) return '';

      const tier = result.tier;
      const progress = tier.isMax
        ? ''
        : `<span class="tier-progress"> ${Math.round(tier.progress * 100)}%</span>`;
      const color =
        typeof ASDF !== 'undefined' && typeof ASDF.getTierColor === 'function'
          ? ASDF.getTierColor(tier.index, 'engage')
          : '#fff';

      return `
        <div class="game-over-xp">+${result.xpGained} XP</div>
        <div class="game-over-tier">
          <span class="tier-name" style="color: ${color}">${tier.name}</span>
          ${progress}
        </div>
      `;
    },
  };

  // Legacy exports
  window.startGame = gameId => GameLifecycle.startGame(gameId);
  window.stopGame = gameId => GameLifecycle.stopGame(gameId);
  window.endGame = (gameId, score) => GameLifecycle.endGame(gameId, score);

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.GameLifecycle = GameLifecycle;
    window.GameLifecycle = window.ASDF.GameLifecycle;
  }
})();
