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

// ============================================
// AUTO-INITIALIZATION
// ============================================

function initASDF() {
  console.log('🔥 ASDF Integration initializing...');

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

  // 4. Track page visit
  achievementSystem.track('page_visit');
  disclosureSystem.track('page_visit');

  // 5. Track scroll to bottom
  trackScrollToBottom();

  console.log('✅ ASDF Integration complete');
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
        const scrolledPages = JSON.parse(localStorage.getItem('asdf_scrolled_pages') || '[]');
        const currentPage = window.location.pathname;

        if (!scrolledPages.includes(currentPage)) {
          scrolledPages.push(currentPage);
          localStorage.setItem('asdf_scrolled_pages', JSON.stringify(scrolledPages));

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
  // Track in systems
  achievementSystem.track('burn_tokens', { amount });
  disclosureSystem.track('burn_tokens', { amount });

  // Play sound
  soundSystem.play('burn');

  // Visual animation if element provided
  if (element) {
    triggerBurnAnimation(element, amount);
  }

  console.log(`🔥 Burn tracked: ${amount} tokens`);
}

/**
 * Track a stake action
 */
export function trackStake(amount, element = null) {
  achievementSystem.track('stake_tokens', { amount });
  disclosureSystem.track('stake_tokens', { amount });

  soundSystem.play('stake');

  console.log(`💎 Stake tracked: ${amount} tokens`);
}

/**
 * Track a game play
 */
export function trackGamePlay(gameName, score, data = {}) {
  achievementSystem.track('play_game', { gameName, score, ...data });

  soundSystem.play('success');

  console.log(`🎮 Game tracked: ${gameName}, score: ${score}`);
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

window.ASDF = {
  trackBurn,
  trackStake,
  trackGamePlay,
  trackChartView,
  trackTransactionView,
  soundSystem,
  achievementSystem,
  disclosureSystem,
};
