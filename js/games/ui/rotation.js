/**
 * ASDF Games - Rotation System
 *
 * Handles game rotation cycle (9-week rotation based on PHI)
 * Extracted from ui.js for modularity
 */

'use strict';

const GameRotation = {
  /**
   * Get current week index in the rotation cycle
   * @returns {number} Week index (0 to CYCLE_WEEKS-1)
   */
  getCurrentWeekIndex() {
    const now = Date.now();
    const epochMs = CONFIG.ROTATION_EPOCH.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeksSinceEpoch = Math.floor((now - epochMs) / weekMs);
    return weeksSinceEpoch % CONFIG.CYCLE_WEEKS;
  },

  /**
   * Get the current featured game
   * @returns {Object} Current game object
   */
  getCurrentGame() {
    return GAMES[this.getCurrentWeekIndex()];
  },

  /**
   * Get next rotation time (next Monday 00:00 UTC)
   * @returns {Date} Next rotation date
   */
  getNextRotationTime() {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

    const nextMonday = new Date(now);
    nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
    nextMonday.setUTCHours(0, 0, 0, 0);

    return nextMonday;
  },

  /**
   * Update countdown display elements
   */
  updateCountdown() {
    const now = Date.now();
    const target = this.getNextRotationTime().getTime();
    const diff = Math.max(0, target - now);

    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const secs = Math.floor((diff % (60 * 1000)) / 1000);

    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minsEl = document.getElementById('countdown-mins');
    const secsEl = document.getElementById('countdown-secs');

    if (daysEl) daysEl.textContent = days;
    if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
    if (minsEl) minsEl.textContent = mins.toString().padStart(2, '0');
    if (secsEl) secsEl.textContent = secs.toString().padStart(2, '0');
  },

  /**
   * Update featured game display
   */
  updateFeaturedGame() {
    const game = this.getCurrentGame();
    const iconEl = document.getElementById('featured-game-icon');
    const nameEl = document.getElementById('featured-game-name');
    const descEl = document.getElementById('featured-game-desc');

    if (iconEl) iconEl.textContent = game.icon;
    if (nameEl) nameEl.textContent = game.name;
    if (descEl) descEl.textContent = game.description;
  },
};

// Legacy function exports for backwards compatibility
function getCurrentWeekIndex() {
  return GameRotation.getCurrentWeekIndex();
}

function getCurrentGame() {
  return GameRotation.getCurrentGame();
}

function getNextRotationTime() {
  return GameRotation.getNextRotationTime();
}

function updateCountdown() {
  return GameRotation.updateCountdown();
}

function updateFeaturedGame() {
  return GameRotation.updateFeaturedGame();
}

// Export for module systems
if (typeof window !== 'undefined') {
  window.GameRotation = GameRotation;
}
