/**
 * ASDF Score Service
 * Unified score submission and leaderboard management.
 */

'use strict';

(function () {
  const ScoreService = {
    name: 'ScoreService',

    init(kernel) {
      this.kernel = kernel;
      kernel.registerService('scores', this);

      // Automatically submit score when game ends
      kernel.on('game:ended', ({ gameId, score }) => {
        this.submit(gameId, score);
      });
    },

    /**
     * Submit score to the backend
     */
    async submit(gameId, score) {
      console.log(`[ScoreService] Submitting score for ${gameId}: ${score}`);

      const api = this.kernel.services.api;
      if (!api) {
        console.warn('[ScoreService] API service not found, score not submitted.');
        return;
      }

      try {
        const result = await api.submitScore(gameId, score);
        this.kernel.emit('score:submitted', { gameId, score, result });

        if (result.isNewBest) {
          this.kernel.emit('score:new-best', { gameId, score });
        }
      } catch (e) {
        console.error('[ScoreService] Submission failed:', e);
        this.kernel.emit('score:error', { gameId, error: e });
      }
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.ScoreService = ScoreService;
})();
