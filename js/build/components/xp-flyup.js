/**
 * XP Fly-up Animation Component
 * Shows visual feedback when gaining XP
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { DURATION, GAMIFICATION } from '../config/timing.js';

// ============================================
// XP FLY-UP COMPONENT
// ============================================

const XPFlyup = {
  /**
   * Initialize XP fly-up component
   */
  init() {
    this.bindEvents();
    console.log('[XPFlyup] Initialized');
  },

  /**
   * Bind to XP events
   */
  bindEvents() {
    // Listen for milestone events (simulate XP gain)
    BuildState.subscribe('onboarding:milestone', data => {
      // Award XP for milestones
      const xpAmounts = {
        introSeen: 50,
        firstProjectClick: 25,
        firstQuizComplete: 100,
        firstTrackStart: 75,
        firstModuleComplete: 150,
      };

      const amount = xpAmounts[data.milestone] || 10;
      this.show(amount);
    });

    // Listen for streak updates
    BuildState.subscribe('streak:updated', data => {
      if (data.isNew && data.streak > 1) {
        // Show bonus for streak continuation
        const bonusPercent = Math.round(data.bonus * 100);
        if (bonusPercent > 0) {
          setTimeout(() => {
            this.showBonus(`+${bonusPercent}% streak bonus!`);
          }, GAMIFICATION.BONUS_DELAY);
        }
      }
    });

    // Listen for streak milestones
    BuildState.subscribe('streak:milestone', data => {
      this.showLevelUp(`${data.milestone}-Day Streak!`);
    });

    // Listen for global XP events (from XP manager)
    if (typeof window !== 'undefined') {
      window.addEventListener('xp:gained', e => {
        if (e.detail && e.detail.amount) {
          this.show(e.detail.amount, e.detail.x, e.detail.y);
        }
      });

      window.addEventListener('xp:levelup', e => {
        if (e.detail) {
          this.showLevelUp(`Level ${e.detail.newLevel}!`);
        }
      });
    }
  },

  /**
   * Show XP fly-up animation
   * @param {number} amount - XP amount
   * @param {number} x - X position (optional, defaults to center)
   * @param {number} y - Y position (optional, defaults to center)
   */
  show(amount, x, y) {
    const el = document.createElement('div');
    el.className = 'xp-flyup';
    el.textContent = `+${amount} XP`;

    // Position
    const posX = x ?? window.innerWidth / 2;
    const posY = y ?? window.innerHeight / 2;

    el.style.left = `${posX}px`;
    el.style.top = `${posY}px`;
    el.style.transform = 'translate(-50%, -50%)';

    document.body.appendChild(el);

    // Remove after animation
    setTimeout(() => {
      el.remove();
    }, GAMIFICATION.XP_FLYUP);
  },

  /**
   * Show bonus text fly-up
   * @param {string} text - Bonus text
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  showBonus(text, x, y) {
    const el = document.createElement('div');
    el.className = 'xp-flyup xp-flyup--bonus';
    el.textContent = text;

    const posX = x ?? window.innerWidth / 2;
    const posY = y ?? window.innerHeight / 2 + 30;

    el.style.left = `${posX}px`;
    el.style.top = `${posY}px`;
    el.style.transform = 'translate(-50%, -50%)';

    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, GAMIFICATION.XP_FLYUP);
  },

  /**
   * Show level-up announcement
   * @param {string} text - Level up text
   */
  showLevelUp(text) {
    const el = document.createElement('div');
    el.className = 'xp-flyup xp-flyup--levelup';
    el.textContent = text;

    el.style.left = '50%';
    el.style.top = '40%';
    el.style.transform = 'translate(-50%, -50%)';

    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, GAMIFICATION.LEVEL_UP);
  },

  /**
   * Show XP at specific element
   * @param {HTMLElement} element - Target element
   * @param {number} amount - XP amount
   */
  showAt(element, amount) {
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    this.show(amount, x, y);
  },
};

export { XPFlyup };
export default XPFlyup;

// Global export
if (typeof window !== 'undefined') {
  window.XPFlyup = XPFlyup;
}
