/**
 * ASDF Games - Competitive Mode UI
 *
 * Handles competitive mode UI (30min/day limit)
 * Extracted from ui.js for modularity
 */

'use strict';

const CompetitiveUI = {
  /**
   * Update global competitive timer display in header
   */
  updateGlobalTimer() {
    const timerContainer = document.getElementById('competitive-timer-global');
    const timerValue = document.getElementById('competitive-time-remaining');

    if (!timerContainer || !timerValue) return;

    // Show timer only if wallet connected or in test mode
    if (appState.wallet || testMode) {
      timerContainer.style.display = 'flex';
      timerValue.textContent = formatCompetitiveTimeRemaining();

      const remaining = getCompetitiveTimeRemaining();
      if (remaining <= 5 * 60 * 1000) {
        timerValue.classList.add('time-low');
      } else {
        timerValue.classList.remove('time-low');
      }

      if (remaining <= 0) {
        timerValue.classList.add('time-exhausted');
      } else {
        timerValue.classList.remove('time-exhausted');
      }
    } else {
      timerContainer.style.display = 'none';
    }
  },

  /**
   * Toggle competitive mode for a game
   * @param {string} gameId - The game ID
   */
  toggle(gameId) {
    const practiceBtn = document.getElementById(`practice-btn-${gameId}`);
    const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);

    const wantCompetitive = !competitiveBtn.classList.contains('active');

    if (wantCompetitive) {
      // Check if user can play competitive (only time limit check now)
      if (!canPlayCompetitive(gameId)) {
        alert("Temps compétitif épuisé pour aujourd'hui! Revenez demain.");
        return;
      }

      // Switch to competitive mode
      practiceBtn.classList.remove('active');
      competitiveBtn.classList.add('active');
      activeGameModes[gameId] = 'competitive';

      // Show timer
      const timerStat = document.getElementById(`timer-stat-${gameId}`);
      if (timerStat) timerStat.style.display = 'block';
      this.updateTimerDisplay(gameId);
    } else {
      // Switch to practice mode
      competitiveBtn.classList.remove('active');
      practiceBtn.classList.add('active');
      activeGameModes[gameId] = 'practice';

      // End competitive session if active
      endCompetitiveSession();

      // Hide timer
      const timerStat = document.getElementById(`timer-stat-${gameId}`);
      if (timerStat) timerStat.style.display = 'none';
    }
  },

  /**
   * Update the competitive timer display for a specific game
   * @param {string} gameId - The game ID
   */
  updateTimerDisplay(gameId) {
    const timerEl = document.getElementById(`timer-${gameId}`);
    if (timerEl) {
      const remaining = getCompetitiveTimeRemaining();
      timerEl.textContent = formatCompetitiveTimeRemaining();

      // Add warning style when low on time
      if (remaining <= 5 * 60 * 1000) {
        timerEl.classList.add('time-low');
      } else {
        timerEl.classList.remove('time-low');
      }

      if (remaining <= 0) {
        timerEl.classList.add('time-exhausted');
        // Force switch to practice mode if time exhausted
        const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);
        if (competitiveBtn && competitiveBtn.classList.contains('active')) {
          this.toggle(gameId);
        }
      }
    }
  },

  /**
   * Update all active competitive timers
   */
  updateAllTimers() {
    // Update global timer in header
    this.updateGlobalTimer();

    // Update per-game timers
    GAMES.forEach(game => {
      if (activeGameModes[game.id] === 'competitive') {
        this.updateTimerDisplay(game.id);
      }
    });
  },
};

// Legacy function exports for backwards compatibility
function updateGlobalCompetitiveTimer() {
  return CompetitiveUI.updateGlobalTimer();
}

function toggleCompetitive(gameId) {
  return CompetitiveUI.toggle(gameId);
}

function updateCompetitiveTimerDisplay(gameId) {
  return CompetitiveUI.updateTimerDisplay(gameId);
}

function updateAllCompetitiveTimers() {
  return CompetitiveUI.updateAllTimers();
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.CompetitiveUI = CompetitiveUI;
}
