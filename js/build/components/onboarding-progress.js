/**
 * Onboarding Progress Component
 * Shows a small progress indicator during FTUE
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { addClass, removeClass } from '../utils/dom.js';

// ============================================
// ONBOARDING PROGRESS COMPONENT
// ============================================

let progressElement = null;
let isComplete = false;

const OnboardingProgress = {
  /**
   * Initialize onboarding progress indicator
   */
  init() {
    // Check if onboarding is already complete
    const progress = BuildState.getOnboardingProgress();
    if (progress >= 100) {
      isComplete = true;
      return;
    }

    // Create progress element
    this.create();

    // Subscribe to milestone events
    BuildState.subscribe('onboarding:milestone', () => {
      this.update();
    });

    BuildState.subscribe('onboarding:complete', () => {
      this.complete();
    });

    console.log('[OnboardingProgress] Initialized');
  },

  /**
   * Create progress element
   */
  create() {
    if (progressElement) return;

    progressElement = document.createElement('div');
    progressElement.className = 'onboarding-progress';
    progressElement.setAttribute('aria-label', 'Onboarding progress');
    progressElement.setAttribute('role', 'progressbar');

    const progress = BuildState.getOnboardingProgress();

    progressElement.innerHTML = `
      <span class="onboarding-progress__label">Getting started</span>
      <div class="onboarding-progress__bar">
        <div class="onboarding-progress__fill" style="width: ${progress}%"></div>
      </div>
      <span class="onboarding-progress__text">${progress}%</span>
    `;

    document.body.appendChild(progressElement);

    // Show with animation
    requestAnimationFrame(() => {
      addClass(progressElement, 'onboarding-progress--visible');
    });
  },

  /**
   * Update progress
   */
  update() {
    if (!progressElement || isComplete) return;

    const progress = BuildState.getOnboardingProgress();
    const fill = progressElement.querySelector('.onboarding-progress__fill');
    const text = progressElement.querySelector('.onboarding-progress__text');

    if (fill) fill.style.width = `${progress}%`;
    if (text) text.textContent = `${progress}%`;

    progressElement.setAttribute('aria-valuenow', progress);

    if (progress >= 100) {
      this.complete();
    }
  },

  /**
   * Complete onboarding and hide progress
   */
  complete() {
    if (!progressElement || isComplete) return;

    isComplete = true;

    // Update to 100% first
    const fill = progressElement.querySelector('.onboarding-progress__fill');
    const text = progressElement.querySelector('.onboarding-progress__text');
    const label = progressElement.querySelector('.onboarding-progress__label');

    if (fill) fill.style.width = '100%';
    if (text) text.textContent = '100%';
    if (label) label.textContent = 'Welcome, Builder!';

    // Hide after delay
    setTimeout(() => {
      if (progressElement) {
        removeClass(progressElement, 'onboarding-progress--visible');

        setTimeout(() => {
          progressElement?.remove();
          progressElement = null;
        }, 300);
      }
    }, 2000);
  },

  /**
   * Check if onboarding is complete
   * @returns {boolean}
   */
  isComplete() {
    return isComplete;
  },

  /**
   * Reset for testing
   */
  reset() {
    isComplete = false;
    if (progressElement) {
      progressElement.remove();
      progressElement = null;
    }
  },
};

export { OnboardingProgress };
export default OnboardingProgress;

// Global export
if (typeof window !== 'undefined') {
  window.OnboardingProgress = OnboardingProgress;
}
