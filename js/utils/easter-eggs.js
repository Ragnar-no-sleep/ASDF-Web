/**
 * ASDF Easter Eggs System
 * Hidden secrets and Konami code unlocks
 *
 * Features:
 * - Konami code detection (↑↑↓↓←→←→BA)
 * - Multiple secret sequences
 * - Visual unlock animations
 * - Persistent unlock state
 * - Sound integration
 *
 * Usage:
 *   import { initEasterEggs } from './utils/easter-eggs.js';
 *   initEasterEggs();
 */

import { soundSystem } from './sound-system.js';
import { showSuccessAnimation } from './contextual-animations.js';

// ============================================
// KONAMI CODE DETECTOR
// ============================================

class KonamiDetector {
  constructor(callback) {
    this.sequence = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];
    this.userInput = [];
    this.callback = callback;
    this.timeoutId = null;

    this.init();
  }

  init() {
    document.addEventListener('keydown', e => {
      this.handleKeyPress(e.key);
    });
  }

  handleKeyPress(key) {
    // Add key to user input
    this.userInput.push(key);

    // Keep only last N keys (sequence length)
    if (this.userInput.length > this.sequence.length) {
      this.userInput.shift();
    }

    // Reset timeout
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.userInput = [];
    }, 2000); // Reset after 2s of inactivity

    // Check if sequence matches
    if (this.isSequenceMatch()) {
      this.userInput = [];
      clearTimeout(this.timeoutId);
      this.callback();
    }
  }

  isSequenceMatch() {
    if (this.userInput.length !== this.sequence.length) return false;

    return this.sequence.every((key, index) => {
      return key.toLowerCase() === this.userInput[index].toLowerCase();
    });
  }
}

// ============================================
// SECRET SEQUENCES
// ============================================

class SecretSequenceDetector {
  constructor() {
    this.sequences = {
      asdf: {
        keys: ['a', 's', 'd', 'f'],
        unlocked: false,
        reward: 'manifesto',
      },
      burn: {
        keys: ['b', 'u', 'r', 'n'],
        unlocked: false,
        reward: 'phoenix_theme',
      },
      hodl: {
        keys: ['h', 'o', 'd', 'l'],
        unlocked: false,
        reward: 'diamond_hands',
      },
    };

    this.userInput = [];
    this.timeoutId = null;
    this.init();
  }

  init() {
    document.addEventListener('keydown', e => {
      this.handleKeyPress(e.key);
    });
  }

  handleKeyPress(key) {
    this.userInput.push(key.toLowerCase());

    // Keep only last 4 keys
    if (this.userInput.length > 4) {
      this.userInput.shift();
    }

    // Reset timeout
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.userInput = [];
    }, 1500);

    // Check all sequences
    Object.entries(this.sequences).forEach(([name, config]) => {
      if (!config.unlocked && this.checkSequence(config.keys)) {
        this.unlock(name, config);
      }
    });
  }

  checkSequence(sequence) {
    if (this.userInput.length !== sequence.length) return false;
    return sequence.every((key, index) => key === this.userInput[index]);
  }

  unlock(name, config) {
    config.unlocked = true;
    this.userInput = [];

    this.triggerUnlock(name, config.reward);
  }

  triggerUnlock(name, reward) {
    // Play sound
    soundSystem.play('success');

    // Show animation
    showSuccessAnimation(`Secret Unlocked: ${name.toUpperCase()}!`, {
      confetti: true,
    });

    // Apply reward
    this.applyReward(reward);

    // Save to localStorage
    const unlocked = this.getUnlockedSecrets();
    unlocked.push(name);
    localStorage.setItem('asdf_secrets_unlocked', JSON.stringify(unlocked));
  }

  applyReward(reward) {
    switch (reward) {
      case 'manifesto':
        this.unlockManifesto();
        break;
      case 'phoenix_theme':
        this.unlockPhoenixTheme();
        break;
      case 'diamond_hands':
        this.unlockDiamondHands();
        break;
    }
  }

  unlockManifesto() {
    // Show link to manifesto
    const link = document.createElement('a');
    link.href = '/asdf-manifesto';
    link.textContent = '📜 Read the Manifesto';
    link.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--color-fire);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      z-index: 10000;
      animation: slide-up 400ms ease-out;
    `;
    document.body.appendChild(link);
  }

  unlockPhoenixTheme() {
    // Unlock phoenix mode (red/gold theme)
    document.documentElement.setAttribute('data-theme', 'phoenix');
    localStorage.setItem('asdf_theme_phoenix_unlocked', 'true');
  }

  unlockDiamondHands() {
    // Add diamond hands badge
    const badge = document.createElement('div');
    badge.innerHTML = '💎🙌';
    badge.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      font-size: 32px;
      z-index: 10000;
      animation: scale-in 400ms ease-out;
    `;
    document.body.appendChild(badge);

    setTimeout(() => {
      badge.style.animation = 'fade-out 400ms ease-out';
      setTimeout(() => badge.remove(), 400);
    }, 3000);
  }

  getUnlockedSecrets() {
    const stored = localStorage.getItem('asdf_secrets_unlocked');
    return stored ? JSON.parse(stored) : [];
  }
}

// ============================================
// INTERACTION EASTER EGGS
// ============================================

class InteractionEasterEggs {
  constructor() {
    this.tripleClickCount = 0;
    this.logoHoverCount = 0;
    this.init();
  }

  init() {
    this.initTripleClick();
    this.initLogoHover();
    this.initScrollDetection();
  }

  /**
   * Triple-click on logo unlocks secret message
   */
  initTripleClick() {
    let clickCount = 0;
    let timeout = null;

    document.addEventListener('click', e => {
      const logo = e.target.closest('.logo, .hub-orbit-center, [data-logo]');
      if (!logo) return;

      clickCount++;

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        clickCount = 0;
      }, 500);

      if (clickCount === 3) {
        this.showSecretMessage();
        clickCount = 0;
      }
    });
  }

  showSecretMessage() {
    soundSystem.play('notification');

    const message = document.createElement('div');
    message.className = 'secret-message';
    message.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">🐕</div>
      <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">This is fine.</div>
      <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7);">Everything is under control.</div>
    `;
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10, 15, 25, 0.95);
      border: 2px solid var(--color-fire);
      border-radius: 16px;
      padding: 32px 48px;
      text-align: center;
      z-index: 10000;
      animation: scale-in 400ms ease-out;
    `;

    document.body.appendChild(message);

    setTimeout(() => {
      message.style.animation = 'fade-out 400ms ease-out';
      setTimeout(() => message.remove(), 400);
    }, 3000);
  }

  /**
   * Hover on logo 10x unlocks achievement
   */
  initLogoHover() {
    document.addEventListener(
      'mouseenter',
      e => {
        const logo = e.target.closest('.logo, .hub-orbit-center, [data-logo]');
        if (!logo) return;

        this.logoHoverCount++;

        if (this.logoHoverCount === 10) {
          this.unlockCuriosityAchievement();
        }
      },
      true
    );
  }

  unlockCuriosityAchievement() {
    soundSystem.play('success');

    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
      <div style="font-weight: 600;">Achievement Unlocked!</div>
      <div style="font-size: 13px; opacity: 0.8;">Curiosity Seeker</div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      background: #22c55e;
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      text-align: center;
      z-index: 10000;
      animation: slide-down 400ms ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fade-out 400ms ease-out';
      setTimeout(() => toast.remove(), 400);
    }, 3000);

    // Save achievement
    const achievements = JSON.parse(localStorage.getItem('asdf_achievements') || '[]');
    if (!achievements.includes('curiosity_seeker')) {
      achievements.push('curiosity_seeker');
      localStorage.setItem('asdf_achievements', JSON.stringify(achievements));
    }
  }

  /**
   * Scroll to bottom of all pages unlocks Deep Diver
   */
  initScrollDetection() {
    const scrolledPages = JSON.parse(localStorage.getItem('asdf_scrolled_pages') || '[]');

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
          this.markPageScrolled(scrolledPages);
        }
      },
      { passive: true }
    );
  }

  markPageScrolled(scrolledPages) {
    const currentPage = window.location.pathname;

    if (!scrolledPages.includes(currentPage)) {
      scrolledPages.push(currentPage);
      localStorage.setItem('asdf_scrolled_pages', JSON.stringify(scrolledPages));

      // Unlock achievement if scrolled 5+ pages
      if (scrolledPages.length >= 5) {
        this.unlockDeepDiverAchievement();
      }
    }
  }

  unlockDeepDiverAchievement() {
    const achievements = JSON.parse(localStorage.getItem('asdf_achievements') || '[]');

    if (achievements.includes('deep_diver')) return; // Already unlocked

    soundSystem.play('success');

    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">🏊</div>
      <div style="font-weight: 600;">Achievement Unlocked!</div>
      <div style="font-size: 13px; opacity: 0.8;">Deep Diver</div>
      <div style="font-size: 11px; opacity: 0.6; margin-top: 4px;">Scrolled to bottom of 5 pages</div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      background: #3b82f6;
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      text-align: center;
      z-index: 10000;
      animation: slide-down 400ms ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fade-out 400ms ease-out';
      setTimeout(() => toast.remove(), 400);
    }, 4000);

    achievements.push('deep_diver');
    localStorage.setItem('asdf_achievements', JSON.stringify(achievements));
  }
}

// ============================================
// MAIN INIT
// ============================================

let _konamiDetector = null;
let _secretSequences = null;
let _interactionEggs = null;

export function initEasterEggs() {
  // Check if Konami code already unlocked
  const konamiUnlocked = localStorage.getItem('asdf_konami_unlocked') === 'true';

  if (!konamiUnlocked) {
    _konamiDetector = new KonamiDetector(() => {
      unlockKonamiCode();
    });
  }

  // Initialize secret sequences
  _secretSequences = new SecretSequenceDetector();

  // Initialize interaction easter eggs
  _interactionEggs = new InteractionEasterEggs();

}

function unlockKonamiCode() {
  localStorage.setItem('asdf_konami_unlocked', 'true');

  soundSystem.play('success');

  // Show epic unlock animation
  const overlay = document.createElement('div');
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
    <div style="text-align: center; animation: scale-in 600ms ease-out;">
      <div style="font-size: 120px; margin-bottom: 24px;">🎮</div>
      <div style="font-size: 48px; font-weight: 700; color: #22c55e; margin-bottom: 16px;">
        KONAMI CODE!
      </div>
      <div style="font-size: 20px; color: rgba(255, 255, 255, 0.8); margin-bottom: 32px;">
        You've unlocked Developer Mode
      </div>
      <div style="font-size: 14px; color: rgba(255, 255, 255, 0.5);">
        ↑↑↓↓←→←→BA
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Create confetti
  createConfetti(overlay);

  // Remove after 4 seconds
  setTimeout(() => {
    overlay.style.animation = 'fade-out 600ms ease-out';
    setTimeout(() => {
      overlay.remove();
      enableDeveloperMode();
    }, 600);
  }, 4000);
}

function createConfetti(container) {
  const colors = ['#ff4500', '#a5f2f3', '#22c55e', '#f59e0b', '#9945ff'];
  const particleCount = 100;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const rotation = Math.random() * 360;

    particle.style.cssText = `
      position: absolute;
      left: ${x}%;
      top: ${y}%;
      width: 10px;
      height: 10px;
      background: ${color};
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      transform: rotate(${rotation}deg);
      animation: confetti-fall ${2000 + Math.random() * 2000}ms ease-in forwards;
    `;

    container.appendChild(particle);
  }
}

function enableDeveloperMode() {
  // Add developer tools badge
  const badge = document.createElement('div');
  badge.innerHTML = '🛠️ DEV';
  badge.title = 'Developer Mode Active';
  badge.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    background: #22c55e;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    z-index: 9999;
    cursor: pointer;
    animation: slide-up 400ms ease-out;
  `;

  badge.addEventListener('click', () => {
    showDeveloperPanel();
  });

  document.body.appendChild(badge);

}

function showDeveloperPanel() {
  alert(
    'Developer Panel - Coming soon!\n\nFeatures:\n- Debug mode\n- Performance stats\n- Achievement viewer\n- Secret unlocks'
  );
}
