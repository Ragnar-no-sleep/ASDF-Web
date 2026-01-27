/**
 * ASDF Games - Leaderboard UI
 *
 * Handles leaderboard display and rendering
 * Extracted from ui.js for modularity
 */

'use strict';

const LeaderboardUI = {
  /**
   * Render main leaderboards (weekly and cycle)
   */
  async renderLeaderboards() {
    const currentGame = getCurrentGame();

    const weeklyEl = document.getElementById('weekly-leaderboard');
    const cycleEl = document.getElementById('cycle-leaderboard');

    if (weeklyEl) weeklyEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';
    if (cycleEl) cycleEl.innerHTML = '<div class="leaderboard-loading">Loading...</div>';

    try {
      const [weeklyResponse, cycleResponse] = await Promise.all([
        ApiClient.getWeeklyLeaderboard(currentGame.id, 10).catch(() => ({ leaderboard: [] })),
        ApiClient.getCycleLeaderboard(10).catch(() => ({ leaderboard: [] })),
      ]);

      const weeklyData = weeklyResponse.leaderboard || [];
      const cycleData = cycleResponse.leaderboard || [];

      if (weeklyEl) {
        weeklyEl.innerHTML =
          weeklyData.length > 0
            ? this.renderWeeklyLeaderboard(weeklyData)
            : '<div class="leaderboard-empty">No scores yet this week. Be the first!</div>';
      }

      if (cycleEl) {
        cycleEl.innerHTML =
          cycleData.length > 0
            ? this.renderCycleLeaderboard(cycleData)
            : '<div class="leaderboard-empty">No reward slots earned yet.</div>';
      }
    } catch (error) {
      console.error('Failed to load leaderboards:', error);

      const mockWeeklyData = [{ rank: 1, player: 'Connect to see...', score: 0 }];
      const mockCycleData = [{ rank: 1, player: 'Connect to see...', slots: 0 }];

      if (weeklyEl) weeklyEl.innerHTML = this.renderWeeklyLeaderboard(mockWeeklyData);
      if (cycleEl) cycleEl.innerHTML = this.renderCycleLeaderboard(mockCycleData);
    }
  },

  /**
   * Render weekly leaderboard HTML
   * @param {Array} data - Leaderboard entries
   * @returns {string} HTML string
   */
  renderWeeklyLeaderboard(data) {
    return data
      .map(entry => {
        // Validate numeric values from API (defense-in-depth)
        const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
        const score = Number.isFinite(entry.score) ? Math.floor(entry.score) : 0;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const isYou =
          appState.wallet &&
          typeof entry.player === 'string' &&
          entry.player.includes(appState.wallet.slice(0, 4));
        const slots = REWARD_SLOTS[rank] || 0;
        const slotBadge =
          slots > 0
            ? `<span style="color: var(--gold); font-size: 11px; margin-left: 8px;">+${slots} slots</span>`
            : '';

        return `
            <div class="leaderboard-item ${isYou ? 'you' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-player" style="flex: 1;">
                    ${isYou ? ' You' : escapeHtml(String(entry.player || ''))}
                    ${slotBadge}
                </div>
                <div class="leaderboard-score">${score.toLocaleString()}</div>
            </div>
        `;
      })
      .join('');
  },

  /**
   * Render cycle leaderboard HTML
   * @param {Array} data - Leaderboard entries
   * @returns {string} HTML string
   */
  renderCycleLeaderboard(data) {
    return data
      .map(entry => {
        // Validate numeric values from API (defense-in-depth)
        const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
        const slots = Number.isFinite(entry.slots) ? Math.floor(entry.slots) : 0;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const isYou =
          appState.wallet &&
          typeof entry.player === 'string' &&
          entry.player.includes(appState.wallet.slice(0, 4));

        return `
            <div class="leaderboard-item ${isYou ? 'you' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-player">${isYou ? ' You' : escapeHtml(String(entry.player || ''))}</div>
                <div class="leaderboard-score" style="color: var(--gold);">${slots} slots</div>
            </div>
        `;
      })
      .join('');
  },

  /**
   * Switch between leaderboard tabs (weekly/cycle)
   * @param {string} period - 'weekly' or 'cycle'
   */
  switchTab(period) {
    // Update tab buttons
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.period === period);
    });

    // Show/hide leaderboard lists
    document.querySelectorAll('.leaderboard-list').forEach(list => {
      list.classList.remove('active');
    });

    const activeList = document.getElementById(`${period}-leaderboard`);
    if (activeList) {
      activeList.classList.add('active');
    }
  },

  /**
   * Show mini leaderboard panel for a game
   * @param {string} gameId - The game ID
   */
  showMini(gameId) {
    const panel = document.getElementById(`leaderboard-panel-${gameId}`);
    if (panel) {
      panel.style.display = 'block';
      this.loadMini(gameId);
    }
  },

  /**
   * Hide mini leaderboard panel for a game
   * @param {string} gameId - The game ID
   */
  hideMini(gameId) {
    const panel = document.getElementById(`leaderboard-panel-${gameId}`);
    if (panel) {
      panel.style.display = 'none';
    }
  },

  /**
   * Load mini leaderboard for a specific game
   * @param {string} gameId - The game ID
   */
  async loadMini(gameId) {
    const container = document.getElementById(`leaderboard-mini-${gameId}`);
    if (!container) return;

    try {
      const response = await ApiClient.getWeeklyLeaderboard(gameId, 5);
      const data = response.leaderboard || [];

      if (data.length === 0) {
        container.innerHTML = '<div class="leaderboard-empty">No scores yet</div>';
        return;
      }

      container.innerHTML = data
        .map(entry => {
          const rank = Number.isFinite(entry.rank) ? Math.floor(entry.rank) : 0;
          const score = Number.isFinite(entry.score) ? Math.floor(entry.score) : 0;
          const rankClass =
            rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
          const isYou =
            appState.wallet &&
            typeof entry.player === 'string' &&
            entry.player.includes(appState.wallet.slice(0, 4));

          return `
                <div class="mini-leaderboard-item ${isYou ? 'you' : ''}">
                    <span class="mini-rank ${rankClass}">#${rank}</span>
                    <span class="mini-player">${isYou ? 'You' : escapeHtml(String(entry.player || ''))}</span>
                    <span class="mini-score">${score.toLocaleString()}</span>
                </div>
            `;
        })
        .join('');
    } catch (error) {
      container.innerHTML = '<div class="leaderboard-empty">Unable to load</div>';
    }
  },
};

// Legacy function exports for backwards compatibility
async function renderLeaderboards() {
  return LeaderboardUI.renderLeaderboards();
}

function renderWeeklyLeaderboard(data) {
  return LeaderboardUI.renderWeeklyLeaderboard(data);
}

function renderCycleLeaderboard(data) {
  return LeaderboardUI.renderCycleLeaderboard(data);
}

function switchLeaderboardTab(period) {
  return LeaderboardUI.switchTab(period);
}

function showLeaderboard(gameId) {
  return LeaderboardUI.showMini(gameId);
}

function hideLeaderboard(gameId) {
  return LeaderboardUI.hideMini(gameId);
}

async function loadMiniLeaderboard(gameId) {
  return LeaderboardUI.loadMini(gameId);
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.LeaderboardUI = LeaderboardUI;
}
