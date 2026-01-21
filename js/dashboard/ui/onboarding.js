/**
 * Yggdrasil Builder's Cosmos - FTUE Onboarding
 * First-Time User Experience overlay
 */

'use strict';

const STORAGE_KEY = 'yggdrasil_onboarding_seen';

/**
 * Onboarding steps configuration
 */
const STEPS = [
  {
    icon: '🌳',
    title: 'Welcome to Yggdrasil',
    description: 'The World Tree of Web3 builders. Your skills grow here.',
    highlight: null
  },
  {
    icon: '🏝️',
    title: 'Explore Islands',
    description: 'Each island is a project. Click one to discover its skills.',
    highlight: 'islands'
  },
  {
    icon: '🔥',
    title: 'The Burning Core',
    description: 'At the heart: real burns. Every transaction fuels the ecosystem.',
    highlight: 'core'
  }
];

/**
 * Onboarding Overlay
 */
export const Onboarding = {
  overlay: null,
  currentStep: 0,
  onComplete: null,
  container: null,

  /**
   * Initialize onboarding
   */
  init(container, options = {}) {
    this.container = container;
    this.onComplete = options.onComplete || null;
    return this;
  },

  /**
   * Check if onboarding should show
   */
  shouldShow() {
    return !localStorage.getItem(STORAGE_KEY);
  },

  /**
   * Show onboarding if first time
   */
  showIfFirstTime() {
    if (this.shouldShow()) {
      this.show();
      return true;
    }
    return false;
  },

  /**
   * Force show onboarding
   */
  show() {
    this.currentStep = 0;
    this.createOverlay();
    this.renderStep();
  },

  /**
   * Create overlay DOM
   */
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'onboarding-overlay';
    this.overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-card">
        <button class="onboarding-skip" aria-label="Skip tutorial">Skip</button>
        <div class="onboarding-icon"></div>
        <h2 class="onboarding-title"></h2>
        <p class="onboarding-description"></p>
        <div class="onboarding-dots"></div>
        <button class="onboarding-next">Next</button>
      </div>
    `;

    this.applyStyles();

    // Event listeners
    this.overlay.querySelector('.onboarding-skip').addEventListener('click', () => this.complete());
    this.overlay.querySelector('.onboarding-next').addEventListener('click', () => this.nextStep());
    this.overlay.querySelector('.onboarding-backdrop').addEventListener('click', () => this.nextStep());

    // Keyboard
    this.handleKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.nextStep();
      if (e.key === 'Escape') this.complete();
    };
    window.addEventListener('keydown', this.handleKeydown);

    // Add to DOM
    (this.container || document.body).appendChild(this.overlay);

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });
  },

  /**
   * Render current step
   */
  renderStep() {
    const step = STEPS[this.currentStep];
    const card = this.overlay.querySelector('.onboarding-card');

    // Update content
    this.overlay.querySelector('.onboarding-icon').textContent = step.icon;
    this.overlay.querySelector('.onboarding-title').textContent = step.title;
    this.overlay.querySelector('.onboarding-description').textContent = step.description;

    // Update dots
    const dotsHtml = STEPS.map((_, i) =>
      `<span class="dot ${i === this.currentStep ? 'active' : ''}"></span>`
    ).join('');
    this.overlay.querySelector('.onboarding-dots').innerHTML = dotsHtml;

    // Update button
    const nextBtn = this.overlay.querySelector('.onboarding-next');
    nextBtn.textContent = this.currentStep === STEPS.length - 1 ? "Let's Build" : 'Next';

    // Animate card
    card.classList.remove('step-enter');
    void card.offsetWidth; // Force reflow
    card.classList.add('step-enter');
  },

  /**
   * Go to next step
   */
  nextStep() {
    if (this.currentStep < STEPS.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.complete();
    }
  },

  /**
   * Complete onboarding
   */
  complete() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    // Animate out
    this.overlay.classList.remove('visible');
    this.overlay.classList.add('hiding');

    setTimeout(() => {
      this.dispose();
      if (this.onComplete) this.onComplete();
    }, 400);
  },

  /**
   * Reset onboarding (for testing)
   */
  reset() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Apply styles
   */
  applyStyles() {
    if (!this.overlay) return;

    // Overlay container
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '10000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: '0',
      transition: 'opacity 0.4s ease'
    });

    // Backdrop
    const backdrop = this.overlay.querySelector('.onboarding-backdrop');
    Object.assign(backdrop.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'radial-gradient(circle at center, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.9) 100%)',
      backdropFilter: 'blur(4px)'
    });

    // Card
    const card = this.overlay.querySelector('.onboarding-card');
    Object.assign(card.style, {
      position: 'relative',
      background: 'linear-gradient(145deg, rgba(20, 30, 50, 0.95), rgba(10, 15, 30, 0.98))',
      borderRadius: '24px',
      padding: '48px 40px',
      maxWidth: '420px',
      width: '90%',
      textAlign: 'center',
      boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 100, 50, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      fontFamily: "'Inter', -apple-system, sans-serif"
    });

    // Skip button
    const skipBtn = this.overlay.querySelector('.onboarding-skip');
    Object.assign(skipBtn.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      background: 'none',
      border: 'none',
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '14px',
      cursor: 'pointer',
      padding: '8px 12px',
      borderRadius: '8px',
      transition: 'color 0.2s, background 0.2s'
    });
    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.color = 'rgba(255, 255, 255, 0.8)';
      skipBtn.style.background = 'rgba(255, 255, 255, 0.05)';
    });
    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.color = 'rgba(255, 255, 255, 0.4)';
      skipBtn.style.background = 'none';
    });

    // Icon
    const icon = this.overlay.querySelector('.onboarding-icon');
    Object.assign(icon.style, {
      fontSize: '64px',
      marginBottom: '24px',
      display: 'block'
    });

    // Title
    const title = this.overlay.querySelector('.onboarding-title');
    Object.assign(title.style, {
      margin: '0 0 16px',
      fontSize: '28px',
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: '-0.5px'
    });

    // Description
    const description = this.overlay.querySelector('.onboarding-description');
    Object.assign(description.style, {
      margin: '0 0 32px',
      fontSize: '16px',
      lineHeight: '1.6',
      color: 'rgba(255, 255, 255, 0.7)'
    });

    // Dots
    const dots = this.overlay.querySelector('.onboarding-dots');
    Object.assign(dots.style, {
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '32px'
    });

    // Next button
    const nextBtn = this.overlay.querySelector('.onboarding-next');
    Object.assign(nextBtn.style, {
      background: 'linear-gradient(135deg, #ff6644, #ff4422)',
      border: 'none',
      borderRadius: '12px',
      padding: '16px 48px',
      fontSize: '16px',
      fontWeight: '600',
      color: '#ffffff',
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      boxShadow: '0 4px 20px rgba(255, 68, 34, 0.3)'
    });
    nextBtn.addEventListener('mouseenter', () => {
      nextBtn.style.transform = 'translateY(-2px)';
      nextBtn.style.boxShadow = '0 8px 30px rgba(255, 68, 34, 0.4)';
    });
    nextBtn.addEventListener('mouseleave', () => {
      nextBtn.style.transform = 'translateY(0)';
      nextBtn.style.boxShadow = '0 4px 20px rgba(255, 68, 34, 0.3)';
    });

    // Add CSS for dots and animations
    this.addDynamicStyles();
  },

  /**
   * Add dynamic CSS
   */
  addDynamicStyles() {
    if (document.getElementById('onboarding-styles')) return;

    const style = document.createElement('style');
    style.id = 'onboarding-styles';
    style.textContent = `
      .onboarding-overlay.visible {
        opacity: 1;
      }
      .onboarding-overlay.hiding {
        opacity: 0;
        pointer-events: none;
      }
      .onboarding-card.step-enter {
        animation: stepEnter 0.4s ease;
      }
      @keyframes stepEnter {
        0% {
          opacity: 0.5;
          transform: scale(0.95);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      .onboarding-dots .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }
      .onboarding-dots .dot.active {
        width: 24px;
        border-radius: 4px;
        background: linear-gradient(90deg, #ff6644, #ff4422);
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Dispose
   */
  dispose() {
    if (this.handleKeydown) {
      window.removeEventListener('keydown', this.handleKeydown);
    }
    if (this.overlay?.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
  }
};

export default Onboarding;
