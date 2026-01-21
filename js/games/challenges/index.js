/**
 * ASDF Games - Daily Challenges Module
 *
 * Handles daily/weekly challenges with Fibonacci-based rewards
 * Integrates with the gamification backend
 *
 * @version 1.0.0
 */
'use strict';

const GameChallenges = (function() {
  // Cache
  let currentChallenges = [];
  let challengeProgress = {};
  let lastFetch = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch active challenges from backend
   */
  async function fetchChallenges(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && currentChallenges.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      return currentChallenges;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return [];

      const response = await fetch('/api/games/challenges', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch challenges');

      const data = await response.json();
      currentChallenges = data.challenges || [];
      challengeProgress = data.progress || {};
      lastFetch = now;

      return currentChallenges;
    } catch (error) {
      console.error('Error fetching challenges:', error);
      return currentChallenges; // Return cached if available
    }
  }

  /**
   * Get challenge progress for current user
   */
  function getProgress(challengeId) {
    return challengeProgress[challengeId] || { current: 0, completed: false };
  }

  /**
   * Update local progress after game completion
   */
  function updateLocalProgress(gameId, score, metrics) {
    currentChallenges.forEach(challenge => {
      if (challenge.completed) return;

      const progress = challengeProgress[challenge.id] || { current: 0, completed: false };

      // Check if this game contributes to the challenge
      if (challenge.gameId && challenge.gameId !== gameId) return;

      switch (challenge.type) {
        case 'score':
          if (score >= challenge.target) {
            progress.current = challenge.target;
            progress.completed = true;
          }
          break;

        case 'games_played':
          progress.current++;
          if (progress.current >= challenge.target) {
            progress.completed = true;
          }
          break;

        case 'total_score':
          progress.current += score;
          if (progress.current >= challenge.target) {
            progress.completed = true;
          }
          break;

        case 'streak':
          // Handled by backend
          break;

        case 'perfect':
          if (metrics?.perfectRound || metrics?.noMistakes) {
            progress.current++;
            if (progress.current >= challenge.target) {
              progress.completed = true;
            }
          }
          break;
      }

      challengeProgress[challenge.id] = progress;
    });
  }

  /**
   * Render challenges widget for game lobby
   */
  function renderChallengesWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    fetchChallenges().then(challenges => {
      if (challenges.length === 0) {
        container.innerHTML = '<p class="text-muted">No active challenges</p>';
        return;
      }

      const html = `
        <div class="challenges-widget">
          <h4 class="challenges-title">
            <span class="challenge-icon">⚔️</span> Daily Challenges
          </h4>
          <div class="challenges-list">
            ${challenges.map(c => renderChallengeCard(c)).join('')}
          </div>
        </div>
      `;
      container.innerHTML = html;
    });
  }

  /**
   * Render a single challenge card
   */
  function renderChallengeCard(challenge) {
    const progress = getProgress(challenge.id);
    const percentage = Math.min(100, Math.round((progress.current / challenge.target) * 100));
    const isComplete = progress.completed || percentage >= 100;

    const difficultyClass = {
      'easy': 'badge-success',
      'medium': 'badge-warning',
      'hard': 'badge-danger',
      'legendary': 'badge-legendary'
    }[challenge.difficulty] || 'badge-secondary';

    const timeLeft = getTimeRemaining(challenge.expiresAt);

    return `
      <div class="challenge-card ${isComplete ? 'challenge-complete' : ''}" data-challenge-id="${challenge.id}">
        <div class="challenge-header">
          <span class="challenge-name">${escapeHtml(challenge.name)}</span>
          <span class="badge ${difficultyClass}">${challenge.difficulty}</span>
        </div>
        <p class="challenge-description">${escapeHtml(challenge.description)}</p>
        <div class="challenge-progress">
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="progress-text">${progress.current} / ${challenge.target}</span>
        </div>
        <div class="challenge-footer">
          <span class="challenge-reward">
            <span class="xp-icon">✦</span> ${challenge.xpReward} XP
          </span>
          <span class="challenge-timer ${timeLeft.urgent ? 'timer-urgent' : ''}">
            ${timeLeft.text}
          </span>
        </div>
        ${isComplete && !challenge.claimed ? `
          <button class="btn btn-sm btn-gold claim-reward-btn" data-challenge-id="${challenge.id}">
            Claim Reward
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Calculate time remaining for challenge
   */
  function getTimeRemaining(expiresAt) {
    const now = Date.now();
    const expires = new Date(expiresAt).getTime();
    const remaining = expires - now;

    if (remaining <= 0) {
      return { text: 'Expired', urgent: true };
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return { text: `${days}d left`, urgent: false };
    }

    if (hours > 0) {
      return { text: `${hours}h ${minutes}m left`, urgent: hours < 2 };
    }

    return { text: `${minutes}m left`, urgent: true };
  }

  /**
   * Claim completed challenge reward
   */
  async function claimReward(challengeId) {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`/api/games/challenges/${challengeId}/claim`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to claim reward');

      const data = await response.json();

      // Update local state
      const challenge = currentChallenges.find(c => c.id === challengeId);
      if (challenge) {
        challenge.claimed = true;
      }

      // Show notification
      if (typeof GameRewards !== 'undefined') {
        GameRewards.showXPGain(data.xpAwarded, 'Challenge Complete!');
      }

      return data;
    } catch (error) {
      console.error('Error claiming reward:', error);
      throw error;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Initialize event listeners
   */
  function init() {
    // Delegate click handler for claim buttons
    document.addEventListener('click', async (e) => {
      if (e.target.classList.contains('claim-reward-btn')) {
        const challengeId = e.target.dataset.challengeId;
        e.target.disabled = true;
        e.target.textContent = 'Claiming...';

        try {
          await claimReward(challengeId);
          e.target.textContent = 'Claimed!';
          e.target.classList.remove('btn-gold');
          e.target.classList.add('btn-secondary');
        } catch (error) {
          e.target.disabled = false;
          e.target.textContent = 'Claim Reward';
        }
      }
    });
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    fetchChallenges,
    getProgress,
    updateLocalProgress,
    renderChallengesWidget,
    claimReward
  };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameChallenges;
}
