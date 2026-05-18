import storage from './utils/storage.js';
/**
 * ASDF Global Integration
 * Auto-loads all immersion systems on every page
 *
 * Usage: Add to any page HTML:
 *   <script type="module" src="js/asdf-integration.js"></script>
 */

import { initInteractions } from './utils/interactions.js';
import { soundSystem, initSounds } from './utils/sound-system.js';
import { achievementSystem } from './utils/achievements.js';
import { disclosureSystem } from './utils/progressive-disclosure.js';
import { initEasterEggs } from './utils/easter-eggs.js';
import { triggerBurnAnimation } from './utils/contextual-animations.js';
import { badgeManager } from './badge/manager.js';
import ASDFSolana from './solana/index.js';
import { streakManager } from './utils/streak-manager.js';

// ============================================
// AUTO-INITIALIZATION
// ============================================

function initASDF() {
  // 1. Interactions (ripples, hover, glow)
  initInteractions({
    ripples: true,
    haptics: true,
    hoverScale: true,
    glowHover: true,
    ripplesSelector: 'button, .btn, .card, .tab-btn, .stat-card, a.cta-btn',
    hoverScaleSelector: 'button, .btn, .card, .stat-card',
    glowHoverSelector: '.card, .stat-card',
  });

  // 2. Sound system (default OFF, user opt-in)
  soundSystem.toggle(false);
  initSounds({
    attachClick: true,
    attachHover: false, // Too annoying
    clickSelector: 'button, .btn, .tab-btn, a.cta-btn',
  });

  // 3. Easter eggs (Konami, secrets, etc.)
  initEasterEggs();

  // 4. Trackers (The Multi-Engine Sync)
  // achievementSystem.track('page_visit'); // G6: Handled in achievementSystem.init()
  disclosureSystem.track('page_visit');

  // Hero's Journey auto-start
  if (window.AchievementEngine) {
    window.AchievementEngine.autoArrival();
  }

  // 5. Track scroll to bottom
  // 6. Badge Manager (Gap G11)
  const initBadges = async addr => {
    if (!addr) return;
    await badgeManager.init(addr);
    await badgeManager.checkAchievements();
  };

  if (ASDFSolana) {
    ASDFSolana.on('connect', addr => initBadges(addr));
    if (ASDFSolana.isConnected()) {
      initBadges(ASDFSolana.getAddress());
    }
  }

  // 7. Dynamic Game Hub Loader (Fix for 'Orange Screen')
  if (
    window.location.pathname.includes('ignition') ||
    document.querySelector('[data-orbit-id="games"]')
  ) {
    /* 
     * DISABLED: Mixing <script defer> and import() causes "Identifier has already been declared" errors.
  ...
     * The game page handles its own script loading.
     * 
    import('./games/utils.js').then(() => {
        import('./games/shared/lifecycle.js').then(() => {
            console.log('*tail wag* Game Lifecycle Ready.');
        });
    });
    */
  }
}

// ============================================
// SCROLL TRACKING
// ============================================

function trackScrollToBottom() {
  let isAtBottom = false;

  window.addEventListener(
    'scroll',
    () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      const atBottom = scrollTop + clientHeight >= scrollHeight - 50;

      if (atBottom && !isAtBottom) {
        isAtBottom = true;

        // Mark page as scrolled
        const scrolledPages = storage.get('scrolled_pages', []);
        const currentPage = window.location.pathname;

        if (!scrolledPages.includes(currentPage)) {
          scrolledPages.push(currentPage);
          storage.set('scrolled_pages', scrolledPages);

          disclosureSystem.track('scroll_bottom');
        }
      }
    },
    { passive: true }
  );
}

// ============================================
// GLOBAL HELPERS (exposed for pages to use)
// ============================================

/**
 * Track a burn action
 * Triggers animation + achievement + disclosure tracking
 */
export function trackBurn(amount, element = null) {
  // *sniff* Synchro Triple-Moteur
  achievementSystem.track('burn_tokens', { amount });
  disclosureSystem.track('burn_tokens', { amount });

  if (window.AchievementEngine) {
    // Stage update: Burn = BELIEVER potential
    if (amount >= 1000) window.AchievementEngine.unlock('BELIEVER');
  }

  // Play sound
  soundSystem.play('burn');

  // Visual animation if element provided
  if (element) {
    triggerBurnAnimation(element, amount);
  }
}

/**
 * Track a stake action
 */
export function trackStake(amount, _element = null) {
  achievementSystem.track('stake_tokens', { amount });
  disclosureSystem.track('stake_tokens', { amount });

  if (window.AchievementEngine) {
    window.AchievementEngine.unlock('VERIFIED');
  }

  soundSystem.play('stake');
}

/**
 * Track a game play
 */
export function trackGamePlay(gameName, score, data = {}) {
  achievementSystem.track('play_game', { gameName, score, ...data });

  soundSystem.play('success');
}

/**
 * Track viewing a chart/data
 */
export function trackChartView() {
  disclosureSystem.track('view_chart');
}

/**
 * Track viewing transactions
 */
export function trackTransactionView() {
  disclosureSystem.track('view_transactions');
}

// ============================================
// AUTO-START
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initASDF);
} else {
  initASDF();
}

// ============================================
// EXPOSE GLOBALS (for non-module scripts)
// ============================================

window.ASDF = Object.assign(window.ASDF || {}, {
  trackBurn,
  trackStake,
  trackGamePlay,
  trackChartView,
  trackTransactionView,
  soundSystem,
  achievementSystem,
  disclosureSystem,
  streakManager,
});
