/**
 * ASDF Leaderboard Plugin
 * Centralizes fetching and caching of game rankings.
 */

'use strict';

(function () {
  const LeaderboardPlugin = {
    name: 'LeaderboardPlugin',
    cache: new Map(),

    init(kernel) {
      this.kernel = kernel;
      kernel.registerService('leaderboards', this);
    },

    /**
     * Fetch weekly leaderboard for a game
     */
    async getWeekly(gameId, limit = 10) {
      const api = this.kernel.services.api;
      if (!api) return { scores: [] };

      try {
        const data = await api.getWeeklyLeaderboard(gameId, limit);
        this.cache.set(`weekly:${gameId}`, data.scores);
        return data;
      } catch (e) {
        console.error(`[LeaderboardPlugin] Failed to fetch weekly for ${gameId}:`, e);
        return { scores: this.cache.get(`weekly:${gameId}`) || [] };
      }
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.LeaderboardPlugin = LeaderboardPlugin;
})();
