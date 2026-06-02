import storage from './storage.js';
/**
 * ASDF Progressive Disclosure System
 * Gradually reveal features as users explore and engage
 *
 * Features:
 * - Smart tooltips (appear after first action)
 * - Feature unlocks (advanced features after basic usage)
 * - Pro tips (milestone-based hints)
 * - Breadcrumb hints (guide discovery)
 * - Onboarding flow (optional, skippable)
 *
 * Usage:
 *   import { disclosureSystem } from './utils/progressive-disclosure.js';
 *   disclosureSystem.reveal('advanced_charts');
 */

import { soundSystem } from './sound-system.js';

// ============================================
// FEATURE DEFINITIONS
// ============================================

const FEATURES = {
  // === BASIC → ADVANCED ===
  advanced_charts: {
    id: 'advanced_charts',
    name: 'Advanced Charts',
    description: 'Unlock detailed analytics and custom timeframes',
    requirement: { type: 'view_chart', count: 3 },
    category: 'tools',
  },

  theme_customization: {
    id: 'theme_customization',
    name: 'Theme Customization',
    description: 'Customize colors, fonts, and layout',
    requirement: { type: 'daily_visit', count: 5 },
    category: 'settings',
  },

  burn_calculator: {
    id: 'burn_calculator',
    name: 'Burn Calculator',
    description: 'Calculate optimal burn amounts and timing',
    requirement: { type: 'burn_tokens', count: 3 },
    category: 'tools',
  },

  stake_optimizer: {
    id: 'stake_optimizer',
    name: 'Stake Optimizer',
    description: 'Get recommendations for stake timing and amount',
    requirement: { type: 'stake_tokens', count: 2 },
    category: 'tools',
  },

  export_data: {
    id: 'export_data',
    name: 'Export Data',
    description: 'Export your transaction history as CSV',
    requirement: { type: 'view_transactions', count: 10 },
    category: 'tools',
  },

  api_access: {
    id: 'api_access',
    name: 'API Access',
    description: 'Get API key for programmatic access',
    requirement: { type: 'daily_visit', count: 14 },
    category: 'advanced',
  },

  // === PRO TIPS ===
  tip_keyboard_shortcuts: {
    id: 'tip_keyboard_shortcuts',
    name: 'Keyboard Shortcuts',
    description: 'Press "?" to see all keyboard shortcuts',
    requirement: { type: 'interaction_count', count: 20 },
    category: 'tip',
  },

  tip_batch_operations: {
    id: 'tip_batch_operations',
    name: 'Batch Operations',
    description: 'Hold Shift to select multiple items',
    requirement: { type: 'burn_tokens', count: 5 },
    category: 'tip',
  },

  tip_dark_patterns: {
    id: 'tip_dark_patterns',
    name: 'No Dark Patterns',
    description: 'This app has zero dark patterns. Everything is transparent.',
    requirement: { type: 'daily_visit', count: 1 },
    category: 'tip',
  },
};

// ============================================
// PRO TIPS
// ============================================

const PRO_TIPS = [
  {
    id: 'tip_1',
    message: '💡 Tip: Press "?" to see keyboard shortcuts',
    requirement: { type: 'interaction_count', count: 10 },
  },
  {
    id: 'tip_2',
    message: '💡 Tip: Click your K-Score to see the breakdown',
    requirement: { type: 'daily_visit', count: 3 },
  },
  {
    id: 'tip_3',
    message: '💡 Tip: Hold Shift to select multiple items for batch operations',
    requirement: { type: 'burn_tokens', count: 3 },
  },
  {
    id: 'tip_4',
    message: '💡 Tip: This app respects your privacy. No tracking, no dark patterns.',
    requirement: { type: 'first_visit', count: 1 },
  },
  {
    id: 'tip_5',
    message: '💡 Tip: Scroll down to discover hidden features',
    requirement: { type: 'page_visit', count: 5 },
  },
];

// ============================================
// PROGRESSIVE DISCLOSURE SYSTEM
// ============================================

class ProgressiveDisclosure {
  constructor() {
    this.progress = this.loadProgress();
    this.unlockedFeatures = this.loadUnlockedFeatures();
    this.shownTips = this.loadShownTips();

    this.init();
  }

  init() {
    // Track interactions
    this.trackInteractions();

    // Check for new reveals
    this.checkReveals();
  }

  /**
   * Load progress from localStorage
   */
  loadProgress() {
    const stored = storage.get('disclosure_progress');
    if (!stored) return {};
    return typeof stored === 'object' ? stored : JSON.parse(stored);
  }

  /**
   * Load unlocked features
   */
  loadUnlockedFeatures() {
    const stored = storage.get('unlocked_features');
    if (!stored) return [];
    return typeof stored === 'object' ? stored : JSON.parse(stored);
  }

  /**
   * Load shown tips
   */
  loadShownTips() {
    const stored = storage.get('shown_tips');
    if (!stored) return [];
    return typeof stored === 'object' ? stored : JSON.parse(stored);
  }

  /**
   * Save progress
   */
  saveProgress() {
    storage.set('disclosure_progress', this.progress);
    localStorage.setItem('asdf_unlocked_features', JSON.stringify(this.unlockedFeatures));
    storage.set('shown_tips', this.shownTips);
  }

  /**
   * Track an action/event
   */
  track(actionType, data = {}) {
    if (!this.progress[actionType]) {
      this.progress[actionType] = { count: 0, data: [] };
    }

    this.progress[actionType].count += 1;
    this.progress[actionType].data.push({
      timestamp: Date.now(),
      ...data,
    });

    this.saveProgress();
    this.checkReveals();
  }

  /**
   * Check if any features should be revealed
   */
  checkReveals() {
    // Check features
    Object.values(FEATURES).forEach(feature => {
      if (this.unlockedFeatures.includes(feature.id)) return;

      if (this.checkRequirement(feature.requirement)) {
        this.reveal(feature);
      }
    });

    // Check pro tips
    PRO_TIPS.forEach(tip => {
      if (this.shownTips.includes(tip.id)) return;

      if (this.checkRequirement(tip.requirement)) {
        this.showTip(tip);
      }
    });
  }

  /**
   * Check if requirement is met
   */
  checkRequirement(requirement) {
    const { type, count } = requirement;
    const progress = this.progress[type];

    if (!progress) return false;

    return progress.count >= count;
  }

  /**
   * Reveal a feature
   */
  reveal(feature) {
    this.unlockedFeatures.push(feature.id);
    this.saveProgress();

    // Show unlock notification
    this.showUnlockNotification(feature);

    // Play sound
    soundSystem.play('notification');

    // Trigger custom event
    window.dispatchEvent(
      new CustomEvent('asdf:feature:unlocked', {
        detail: feature,
      })
    );
  }

  /**
   * Show unlock notification
   */
  showUnlockNotification(feature) {
    const notification = document.createElement('div');
    notification.className = 'disclosure-notification';
    notification.innerHTML = `
      <div class="disclosure-notification-header">
        <span class="pd-notif-icon">🔓</span>
        <span class="pd-notif-label">New Feature Unlocked!</span>
      </div>
      <div class="disclosure-notification-body">
        <div class="disclosure-notification-name">${feature.name}</div>
        <div class="disclosure-notification-desc">${feature.description}</div>
      </div>
    `;

    notification.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      max-width: 320px;
      background: rgba(10, 15, 25, 0.95);
      border: 2px solid var(--color-fire);
      border-radius: 12px;
      padding: 16px;
      z-index: 10000;
      animation: slide-down 400ms ease-out;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    `;

    document.body.appendChild(notification);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'fade-out 400ms ease-out';
      setTimeout(() => notification.remove(), 400);
    }, 5000);
  }

  /**
   * Show a pro tip
   */
  showTip(tip) {
    this.shownTips.push(tip.id);
    this.saveProgress();

    const toast = document.createElement('div');
    toast.className = 'disclosure-tip-toast';
    toast.textContent = tip.message;

    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      max-width: 320px;
      background: #3b82f6;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      animation: slide-up 400ms ease-out;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(toast);

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      toast.style.animation = 'fade-out 400ms ease-out';
      setTimeout(() => toast.remove(), 400);
    }, 6000);
  }

  /**
   * Track interactions (clicks, hovers, etc.)
   */
  trackInteractions() {
    let interactionCount = 0;

    document.addEventListener('click', () => {
      interactionCount++;

      if (interactionCount % 10 === 0) {
        this.track('interaction_count');
      }
    });
  }

  /**
   * Check if feature is unlocked
   */
  isUnlocked(featureId) {
    return this.unlockedFeatures.includes(featureId);
  }

  /**
   * Get all features with unlock status
   */
  getAllFeatures() {
    return Object.values(FEATURES).map(feature => ({
      ...feature,
      unlocked: this.unlockedFeatures.includes(feature.id),
      progress: this.getFeatureProgress(feature),
    }));
  }

  /**
   * Get progress for specific feature
   */
  getFeatureProgress(feature) {
    const { type, count } = feature.requirement;
    const progress = this.progress[type];

    if (!progress) return 0;

    return Math.min((progress.count / count) * 100, 100);
  }
}

// Singleton instance
export const disclosureSystem = new ProgressiveDisclosure();

// ============================================
// SMART TOOLTIPS
// ============================================

/**
 * Show smart tooltip (appears once, then saved)
 * @param {HTMLElement} element - Element to attach tooltip to
 * @param {string} message - Tooltip message
 * @param {string} id - Unique tooltip ID
 */
export function showSmartTooltip(element, message, id) {
  const shownTooltips = JSON.parse(localStorage.getItem('asdf_shown_tooltips') || '[]');

  if (shownTooltips.includes(id)) return; // Already shown

  const tooltip = document.createElement('div');
  tooltip.className = 'smart-tooltip';
  tooltip.innerHTML = `
    <div class="smart-tooltip-arrow"></div>
    <div class="smart-tooltip-message">${message}</div>
    <button class="smart-tooltip-close">Got it</button>
  `;

  tooltip.style.cssText = `
    position: absolute;
    background: rgba(10, 15, 25, 0.95);
    border: 1px solid var(--color-fire);
    border-radius: 8px;
    padding: 12px 16px;
    z-index: 10000;
    animation: scale-in 300ms ease-out;
    max-width: 250px;
  `;

  // Position tooltip
  const rect = element.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2 - 125}px`;
  tooltip.style.top = `${rect.bottom + 12}px`;

  document.body.appendChild(tooltip);

  // Close handler
  tooltip.querySelector('.smart-tooltip-close').addEventListener('click', () => {
    shownTooltips.push(id);
    localStorage.setItem('asdf_shown_tooltips', JSON.stringify(shownTooltips));
    tooltip.remove();
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (tooltip.parentNode) {
      shownTooltips.push(id);
      localStorage.setItem('asdf_shown_tooltips', JSON.stringify(shownTooltips));
      tooltip.remove();
    }
  }, 10000);
}

// ============================================
// ONBOARDING FLOW
// ============================================

/**
 * Show onboarding flow (first-time user guide)
 */
export function showOnboarding() {
  const hasSeenOnboarding = localStorage.getItem('asdf_onboarding_complete') === 'true';

  if (hasSeenOnboarding) return;

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fade-in 400ms ease-out;
  `;

  overlay.innerHTML = `
    <div class="pd-onboarding-inner">
      <div class="pd-onboarding-icon">👋</div>
      <div class="pd-onboarding-heading">Welcome to ASDF</div>
      <div class="pd-onboarding-body">
        This is a living ecosystem. Features unlock as you explore.
        <br><br>
        No dark patterns. No tracking. Just building.
      </div>
      <div class="pd-onboarding-actions">
        <button class="onboarding-skip pd-btn-skip">
          Skip
        </button>
        <button class="onboarding-start pd-btn-start">
          Let's Go
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event handlers
  overlay.querySelector('.onboarding-skip').addEventListener('click', () => {
    localStorage.setItem('asdf_onboarding_complete', 'true');
    overlay.remove();
  });

  overlay.querySelector('.onboarding-start').addEventListener('click', () => {
    localStorage.setItem('asdf_onboarding_complete', 'true');
    overlay.remove();
    // Could start a guided tour here
  });
}
