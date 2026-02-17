/**
 * ASDF Contextual Animations
 * Triggered animations for user actions (burns, stakes, trades)
 *
 * Features:
 * - Burn animation (flame burst + particles)
 * - Stake animation (lock + glow)
 * - K-Score counter animation (progressive)
 * - Chart draw animation (line/bar graphs)
 *
 * Usage:
 *   import { triggerBurnAnimation, triggerStakeAnimation } from './utils/contextual-animations.js';
 *   triggerBurnAnimation(element, amount);
 */

import { animateCounter } from './interactions.js';

// ============================================
// BURN ANIMATION
// ============================================

/**
 * Triggers a burn animation (flame burst + particles)
 * @param {HTMLElement} element - Element to animate from
 * @param {number} amount - Amount burned (affects particle count)
 * @param {Object} options - Animation options
 */
export function triggerBurnAnimation(element, amount = 100, options = {}) {
  const defaults = {
    particleCount: Math.min(Math.ceil(amount / 10), 50), // 1 particle per 10 tokens, max 50
    duration: 2000,
    color: '#ff4500',
    sound: true,
  };

  const config = { ...defaults, ...options };

  // Get element position
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  // Create particle container
  const container = document.createElement('div');
  container.className = 'burn-animation-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 9999;
  `;
  document.body.appendChild(container);

  // Create flame burst
  const flameBurst = document.createElement('div');
  flameBurst.className = 'flame-burst';
  flameBurst.style.cssText = `
    position: absolute;
    left: ${centerX}px;
    top: ${centerY}px;
    width: 100px;
    height: 100px;
    background: radial-gradient(circle, ${config.color} 0%, transparent 70%);
    border-radius: 50%;
    transform: translate(-50%, -50%) scale(0);
    animation: flame-burst 600ms ease-out forwards;
  `;
  container.appendChild(flameBurst);

  // Create particles
  for (let i = 0; i < config.particleCount; i++) {
    const particle = document.createElement('div');
    const angle = (Math.PI * 2 * i) / config.particleCount + (Math.random() - 0.5) * 0.5;
    const velocity = 100 + Math.random() * 150;
    const size = 3 + Math.random() * 5;
    const lifetime = 1000 + Math.random() * 1000;

    particle.style.cssText = `
      position: absolute;
      left: ${centerX}px;
      top: ${centerY}px;
      width: ${size}px;
      height: ${size}px;
      background: ${config.color};
      border-radius: 50%;
      pointer-events: none;
      animation: burn-particle ${lifetime}ms ease-out forwards;
      --angle: ${angle}rad;
      --velocity: ${velocity}px;
    `;
    container.appendChild(particle);
  }

  // Add glow pulse to element
  element.classList.add('burn-glow-active');

  // Cleanup
  setTimeout(() => {
    element.classList.remove('burn-glow-active');
    container.remove();
  }, config.duration);

  // Optional sound (would need audio file)
  if (config.sound && window.burnSound) {
    window.burnSound.play();
  }
}

// ============================================
// STAKE ANIMATION
// ============================================

/**
 * Triggers a stake/lock animation
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} isStaking - true for stake, false for unstake
 * @param {Object} options - Animation options
 */
export function triggerStakeAnimation(element, isStaking = true, options = {}) {
  const defaults = {
    duration: 1000,
    color: isStaking ? '#10b981' : '#f59e0b',
  };

  const config = { ...defaults, ...options };

  // Add lock icon animation
  const lockIcon = document.createElement('div');
  lockIcon.className = isStaking ? 'stake-lock-animation' : 'stake-unlock-animation';
  lockIcon.innerHTML = isStaking ? '🔒' : '🔓';
  lockIcon.style.cssText = `
    position: absolute;
    font-size: 48px;
    transform: translate(-50%, -50%) scale(0);
    animation: ${isStaking ? 'lock-close' : 'lock-open'} ${config.duration}ms ease-out forwards;
  `;

  // Position relative to element
  const rect = element.getBoundingClientRect();
  lockIcon.style.left = `${rect.left + rect.width / 2}px`;
  lockIcon.style.top = `${rect.top + rect.height / 2}px`;

  document.body.appendChild(lockIcon);

  // Glow effect on element
  element.style.transition = `box-shadow ${config.duration}ms ease-out`;
  element.style.boxShadow = `0 0 30px ${config.color}`;

  // Cleanup
  setTimeout(() => {
    element.style.boxShadow = '';
    lockIcon.remove();
  }, config.duration);
}

// ============================================
// K-SCORE ANIMATION
// ============================================

/**
 * Animates K-Score update with visual feedback
 * @param {HTMLElement} element - Element displaying K-Score
 * @param {number} oldValue - Previous K-Score
 * @param {number} newValue - New K-Score
 * @param {Object} options - Animation options
 */
export function animateKScore(element, oldValue, newValue, options = {}) {
  const defaults = {
    duration: 1500,
    showDelta: true,
  };

  const config = { ...defaults, ...options };
  const delta = newValue - oldValue;

  // Animate counter
  animateCounter(element, oldValue, newValue, config.duration);

  // Show delta badge
  if (config.showDelta && delta !== 0) {
    const deltaBadge = document.createElement('span');
    deltaBadge.className = 'k-score-delta';
    deltaBadge.textContent = delta > 0 ? `+${delta}` : delta;
    deltaBadge.style.cssText = `
      position: absolute;
      top: -20px;
      right: -10px;
      background: ${delta > 0 ? '#22c55e' : '#ef4444'};
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      animation: delta-pop 1s ease-out forwards;
    `;

    element.style.position = 'relative';
    element.appendChild(deltaBadge);

    setTimeout(() => {
      deltaBadge.remove();
    }, 1000);
  }

  // Pulse effect
  element.classList.add(delta > 0 ? 'k-score-up' : 'k-score-down');
  setTimeout(() => {
    element.classList.remove('k-score-up', 'k-score-down');
  }, config.duration);
}

// ============================================
// CHART DRAW ANIMATION
// ============================================

/**
 * Animates SVG path drawing (for charts)
 * @param {SVGPathElement} pathElement - SVG path to animate
 * @param {number} duration - Animation duration (ms)
 */
export function animateChartDraw(pathElement, duration = 2000) {
  const length = pathElement.getTotalLength();

  // Set up the starting positions
  pathElement.style.strokeDasharray = length;
  pathElement.style.strokeDashoffset = length;

  // Trigger animation
  pathElement.style.transition = `stroke-dashoffset ${duration}ms ease-in-out`;
  pathElement.style.strokeDashoffset = '0';

  // Cleanup
  setTimeout(() => {
    pathElement.style.strokeDasharray = '';
    pathElement.style.strokeDashoffset = '';
  }, duration);
}

/**
 * Animates multiple chart paths in sequence
 * @param {SVGPathElement[]} paths - Array of SVG paths
 * @param {number} stagger - Delay between each path (ms)
 * @param {number} duration - Duration per path (ms)
 */
export function animateChartDrawSequence(paths, stagger = 200, duration = 1500) {
  paths.forEach((path, index) => {
    setTimeout(() => {
      animateChartDraw(path, duration);
    }, index * stagger);
  });
}

/**
 * Animates bars growing from bottom
 * @param {HTMLElement[]} bars - Array of bar elements
 * @param {number} stagger - Delay between each bar (ms)
 * @param {number} duration - Duration per bar (ms)
 */
export function animateBarChart(bars, stagger = 100, duration = 1000) {
  bars.forEach((bar, index) => {
    const targetHeight = bar.dataset.height || bar.style.height;

    // Start from 0
    bar.style.height = '0';
    bar.style.transition = `height ${duration}ms ease-out`;

    setTimeout(() => {
      bar.style.height = targetHeight;
    }, index * stagger);
  });
}

// ============================================
// TRANSACTION SUCCESS/ERROR
// ============================================

/**
 * Shows success animation with confetti
 * @param {string} message - Success message
 * @param {Object} options - Animation options
 */
export function showSuccessAnimation(message, options = {}) {
  const defaults = {
    duration: 3000,
    confetti: true,
    sound: true,
  };

  const config = { ...defaults, ...options };

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'success-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    animation: fade-in 300ms ease-out;
  `;

  // Create message card
  const card = document.createElement('div');
  card.className = 'success-card';
  card.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 16px;">✓</div>
    <div style="font-size: 24px; font-weight: 600; color: #22c55e;">${message}</div>
  `;
  card.style.cssText = `
    background: rgba(10, 15, 25, 0.95);
    border: 2px solid #22c55e;
    border-radius: 16px;
    padding: 32px 48px;
    text-align: center;
    animation: scale-in 400ms ease-out;
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Confetti
  if (config.confetti) {
    createConfetti(overlay);
  }

  // Auto-dismiss
  setTimeout(() => {
    overlay.style.animation = 'fade-out 300ms ease-out';
    setTimeout(() => overlay.remove(), 300);
  }, config.duration);
}

/**
 * Shows error animation
 * @param {string} message - Error message
 * @param {Object} options - Animation options
 */
export function showErrorAnimation(message, options = {}) {
  const defaults = {
    duration: 4000,
  };

  const config = { ...defaults, ...options };

  // Create toast
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.innerHTML = `
    <div style="font-size: 24px; margin-right: 12px;">⚠️</div>
    <div style="font-size: 16px;">${message}</div>
  `;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: #ef4444;
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    z-index: 10000;
    animation: slide-down 300ms ease-out;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  `;

  document.body.appendChild(toast);

  // Shake animation
  setTimeout(() => {
    toast.style.animation = 'shake 400ms ease-in-out';
  }, 100);

  // Auto-dismiss
  setTimeout(() => {
    toast.style.animation = 'fade-out 300ms ease-out';
    setTimeout(() => toast.remove(), 300);
  }, config.duration);
}

// ============================================
// HELPER: CONFETTI
// ============================================

function createConfetti(container) {
  const colors = ['#ff4500', '#a5f2f3', '#22c55e', '#f59e0b', '#9945ff'];
  const particleCount = 50;

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
      animation: confetti-fall ${1000 + Math.random() * 2000}ms ease-in forwards;
    `;

    container.appendChild(particle);
  }
}

// ============================================
// CSS INJECTION (for animations)
// ============================================

const style = document.createElement('style');
style.textContent = `
  @keyframes flame-burst {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
  }

  @keyframes burn-particle {
    0% {
      transform: translate(-50%, -50%);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%)
                 translateX(calc(cos(var(--angle)) * var(--velocity)))
                 translateY(calc(sin(var(--angle)) * var(--velocity) - 100px));
      opacity: 0;
    }
  }

  .burn-glow-active {
    box-shadow: 0 0 40px rgba(255, 69, 0, 0.8) !important;
    animation: burn-pulse 600ms ease-out !important;
  }

  @keyframes burn-pulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.5); }
  }

  @keyframes lock-close {
    0% { transform: translate(-50%, -50%) scale(0) rotate(-45deg); opacity: 0; }
    50% { transform: translate(-50%, -50%) scale(1.2) rotate(0deg); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0; }
  }

  @keyframes lock-open {
    0% { transform: translate(-50%, -50%) scale(0) rotate(45deg); opacity: 0; }
    50% { transform: translate(-50%, -50%) scale(1.2) rotate(0deg); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0; }
  }

  .k-score-up {
    animation: k-score-bump-up 500ms ease-out;
  }

  .k-score-down {
    animation: k-score-bump-down 500ms ease-out;
  }

  @keyframes k-score-bump-up {
    0%, 100% { transform: scale(1); color: inherit; }
    50% { transform: scale(1.15); color: #22c55e; }
  }

  @keyframes k-score-bump-down {
    0%, 100% { transform: scale(1); color: inherit; }
    50% { transform: scale(0.95); color: #ef4444; }
  }

  @keyframes delta-pop {
    0% { transform: translateY(0) scale(0); opacity: 0; }
    50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
    100% { transform: translateY(-20px) scale(1); opacity: 0; }
  }

  @keyframes confetti-fall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }

  @keyframes fade-out {
    to { opacity: 0; }
  }
`;
document.head.appendChild(style);

// ============================================
// ALIASES — compatibility shims
// ============================================

/**
 * burnParticles — alias for triggerBurnAnimation
 * Called from burns.js as contextualAnimations.burnParticles(sourceEl, targetEl)
 */
export function burnParticles(element, _targetEl, options = {}) {
  return triggerBurnAnimation(element, 100, options);
}
