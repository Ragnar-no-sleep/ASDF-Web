/**
 * Build V2 - Animations Module
 * GSAP-powered animations for Yggdrasil renderers
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { PHI, PHI_INVERSE, phiDelays } from '../utils/phi.js';

// ============================================
// CONFIGURATION
// ============================================

const ANIM_CONFIG = {
  // Duration presets (Fibonacci-based, in seconds)
  // fib sequence: 1,1,2,3,5,8,13,21 * 0.1
  durations: {
    instant: 0,
    veryFast: 0.1,  // fib(1)
    fast: 0.2,      // fib(2)
    quick: 0.3,     // fib(3)
    normal: 0.5,    // fib(5)
    medium: 0.8,    // fib(8)
    slow: 1.3,      // fib(13)
    verySlow: 2.1   // fib(21)
  },
  // Easing presets
  easings: {
    // Standard easings
    linear: 'none',
    easeOut: 'power2.out',
    easeIn: 'power2.in',
    easeInOut: 'power2.inOut',
    // Bounce/elastic
    bounce: 'bounce.out',
    elastic: 'elastic.out(1, 0.3)',
    // Phi-based (golden ratio curve)
    phiOut: `power${PHI}.out`,
    phiIn: `power${PHI}.in`,
    phiInOut: `power${PHI}.inOut`
  },
  // Stagger presets (phi-based)
  stagger: {
    fast: 0.03,           // ~fib(3) * 0.01
    normal: 0.05,         // fib(5) * 0.01
    phi: PHI_INVERSE / 10, // 0.0618 (golden)
    slow: 0.08,           // fib(8) * 0.01
    verySlow: 0.13        // fib(13) * 0.01
  }
};

// ============================================
// GSAP LOADER
// ============================================

let gsap = null;
let ScrollTrigger = null;
let isLoaded = false;

/**
 * Load GSAP library dynamically via script tag (IIFE libraries don't work with ES module import)
 * @returns {Promise<Object>}
 */
async function loadGSAP() {
  if (isLoaded && gsap) return gsap;

  // Check if already loaded globally
  if (window.gsap) {
    gsap = window.gsap;
    ScrollTrigger = window.ScrollTrigger;
    isLoaded = true;
    return gsap;
  }

  // Load via script tag (GSAP is IIFE, not ES module)
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/gsap@3.12.4/dist/gsap.min.js';
    script.async = true;
    script.onload = () => {
      gsap = window.gsap;
      isLoaded = true;
      console.log('[Animations] GSAP loaded');

      // Try to load ScrollTrigger
      const scrollScript = document.createElement('script');
      scrollScript.src = 'https://unpkg.com/gsap@3.12.4/dist/ScrollTrigger.min.js';
      scrollScript.async = true;
      scrollScript.onload = () => {
        ScrollTrigger = window.ScrollTrigger;
        if (gsap && ScrollTrigger) {
          gsap.registerPlugin(ScrollTrigger);
        }
        resolve(gsap);
      };
      scrollScript.onerror = () => {
        console.warn('[Animations] ScrollTrigger not loaded');
        resolve(gsap);
      };
      document.head.appendChild(scrollScript);
    };
    script.onerror = () => {
      console.warn('[Animations] GSAP load failed, using CSS fallback');
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

// ============================================
// CSS FALLBACK ANIMATIONS
// ============================================

const CSSAnimations = {
  /**
   * Apply CSS transition
   * @param {Element} element
   * @param {Object} props
   * @param {Object} options
   */
  to(element, props, options = {}) {
    if (!element) return Promise.resolve();

    const duration = options.duration || ANIM_CONFIG.durations.normal;
    const easing = this.mapEasing(options.ease);

    element.style.transition = `all ${duration}s ${easing}`;

    // Apply properties
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'x') element.style.transform = `translateX(${value}px)`;
      else if (key === 'y') element.style.transform = `translateY(${value}px)`;
      else if (key === 'scale') element.style.transform = `scale(${value})`;
      else if (key === 'rotation') element.style.transform = `rotate(${value}deg)`;
      else element.style[key] = typeof value === 'number' ? `${value}px` : value;
    });

    return new Promise(resolve => {
      setTimeout(resolve, duration * 1000);
    });
  },

  /**
   * Map GSAP easing to CSS
   * @param {string} gsapEase
   * @returns {string}
   */
  mapEasing(gsapEase) {
    const map = {
      'none': 'linear',
      'power2.out': 'ease-out',
      'power2.in': 'ease-in',
      'power2.inOut': 'ease-in-out',
      'bounce.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      'elastic.out(1, 0.3)': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    };
    return map[gsapEase] || 'ease-out';
  }
};

// ============================================
// ANIMATIONS MODULE
// ============================================

const Animations = {
  /**
   * Initialize animations module
   * @returns {Promise<void>}
   */
  async init() {
    await loadGSAP();

    // Check for reduced motion preference
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    console.log('[Animations] Initialized', {
      gsap: !!gsap,
      reducedMotion: this.reducedMotion
    });
  },

  /**
   * Check if reduced motion is preferred
   */
  reducedMotion: false,

  // ==========================================
  // CORE ANIMATION METHODS
  // ==========================================

  /**
   * Animate element(s) to new state
   * @param {Element|NodeList|string} target
   * @param {Object} props
   * @param {Object} options
   * @returns {Promise}
   */
  async to(target, props, options = {}) {
    if (this.reducedMotion && !options.force) {
      // Instant change for reduced motion
      return this.set(target, props);
    }

    if (gsap) {
      return gsap.to(target, {
        ...props,
        duration: options.duration || ANIM_CONFIG.durations.normal,
        ease: options.ease || ANIM_CONFIG.easings.easeOut,
        stagger: options.stagger,
        delay: options.delay,
        onComplete: options.onComplete
      });
    }

    // CSS fallback
    const elements = typeof target === 'string' ? document.querySelectorAll(target) : [target].flat();
    return Promise.all(elements.map(el => CSSAnimations.to(el, props, options)));
  },

  /**
   * Animate element(s) from initial state
   * @param {Element|NodeList|string} target
   * @param {Object} props
   * @param {Object} options
   * @returns {Promise}
   */
  async from(target, props, options = {}) {
    if (this.reducedMotion && !options.force) {
      return Promise.resolve();
    }

    if (gsap) {
      return gsap.from(target, {
        ...props,
        duration: options.duration || ANIM_CONFIG.durations.normal,
        ease: options.ease || ANIM_CONFIG.easings.easeOut,
        stagger: options.stagger,
        delay: options.delay,
        onComplete: options.onComplete
      });
    }

    // CSS fallback - set initial then animate
    const elements = typeof target === 'string' ? document.querySelectorAll(target) : [target].flat();
    elements.forEach(el => CSSAnimations.to(el, props, { duration: 0 }));
    return this.to(target, {}, options);
  },

  /**
   * Set element(s) state immediately
   * @param {Element|NodeList|string} target
   * @param {Object} props
   */
  set(target, props) {
    if (gsap) {
      gsap.set(target, props);
    } else {
      CSSAnimations.to(target, props, { duration: 0 });
    }
  },

  /**
   * Create timeline
   * @param {Object} options
   * @returns {Object}
   */
  timeline(options = {}) {
    if (gsap) {
      return gsap.timeline(options);
    }

    // Simple CSS timeline fallback
    return {
      queue: [],
      to(target, props, position) {
        this.queue.push({ type: 'to', target, props, position });
        return this;
      },
      from(target, props, position) {
        this.queue.push({ type: 'from', target, props, position });
        return this;
      },
      async play() {
        for (const item of this.queue) {
          await CSSAnimations.to(item.target, item.props);
        }
      }
    };
  },

  // ==========================================
  // YGGDRASIL-SPECIFIC ANIMATIONS
  // ==========================================

  /**
   * Burn pulse animation
   * @param {Element} element - Burn center element
   * @param {number} intensity - 0 to 1
   */
  burnPulse(element, intensity = 0.5) {
    if (!element || this.reducedMotion) return;

    const duration = 2 - intensity * 1.5; // Faster when intense
    const scale = 1 + intensity * 0.15;

    if (gsap) {
      gsap.to(element, {
        scale: scale,
        duration: duration / 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    } else {
      element.style.animation = `burnPulse ${duration}s ease-in-out infinite`;
    }
  },

  /**
   * Stop burn pulse
   * @param {Element} element
   */
  stopBurnPulse(element) {
    if (!element) return;

    if (gsap) {
      gsap.killTweensOf(element);
      gsap.set(element, { scale: 1 });
    } else {
      element.style.animation = 'none';
    }
  },

  /**
   * Project hover effect
   * @param {Element} element
   * @param {boolean} isHovering
   */
  projectHover(element, isHovering) {
    if (!element) return;

    const props = isHovering
      ? { scale: 1.1, y: -5, filter: 'brightness(1.2)' }
      : { scale: 1, y: 0, filter: 'brightness(1)' };

    this.to(element, props, {
      duration: ANIM_CONFIG.durations.fast,
      ease: isHovering ? ANIM_CONFIG.easings.elastic : ANIM_CONFIG.easings.easeOut
    });
  },

  /**
   * Panel slide animation
   * @param {Element} panel
   * @param {string} direction - 'left', 'right', 'up', 'down'
   * @param {boolean} isOpening
   */
  async panelSlide(panel, direction = 'right', isOpening = true) {
    if (!panel) return;

    const offsets = {
      left: { x: '-100%', y: 0 },
      right: { x: '100%', y: 0 },
      up: { x: 0, y: '-100%' },
      down: { x: 0, y: '100%' }
    };

    const offset = offsets[direction] || offsets.right;

    if (isOpening) {
      this.set(panel, { x: offset.x, y: offset.y, opacity: 0 });
      panel.style.display = 'flex';

      await this.to(panel, {
        x: 0,
        y: 0,
        opacity: 1
      }, {
        duration: ANIM_CONFIG.durations.normal,
        ease: ANIM_CONFIG.easings.easeOut
      });
    } else {
      await this.to(panel, {
        x: offset.x,
        y: offset.y,
        opacity: 0
      }, {
        duration: ANIM_CONFIG.durations.fast,
        ease: ANIM_CONFIG.easings.easeIn
      });

      panel.style.display = 'none';
    }
  },

  /**
   * Intro tooltip sequence
   * @param {Element} tooltip
   * @param {Element} target - Target element to point to
   */
  async introSequence(tooltip, target) {
    if (!tooltip) return;

    // Fade in with scale
    this.set(tooltip, { opacity: 0, scale: 0.9, y: 20 });

    await this.to(tooltip, {
      opacity: 1,
      scale: 1,
      y: 0
    }, {
      duration: ANIM_CONFIG.durations.slow,
      ease: ANIM_CONFIG.easings.easeOut
    });

    // Pulse target highlight if exists
    if (target) {
      this.to(target, {
        boxShadow: '0 0 20px rgba(255, 107, 53, 0.5)'
      }, {
        duration: ANIM_CONFIG.durations.slow,
        ease: ANIM_CONFIG.easings.easeInOut,
        yoyo: true,
        repeat: 2
      });
    }
  },

  /**
   * Staggered reveal animation for lists
   * @param {NodeList|Array} elements
   * @param {Object} options
   */
  async staggerReveal(elements, options = {}) {
    if (!elements || elements.length === 0) return;

    const fromProps = {
      opacity: 0,
      y: options.direction === 'up' ? 20 : -20,
      ...options.from
    };

    const toProps = {
      opacity: 1,
      y: 0,
      ...options.to
    };

    this.set(elements, fromProps);

    await this.to(elements, toProps, {
      duration: options.duration || ANIM_CONFIG.durations.normal,
      stagger: options.stagger || ANIM_CONFIG.stagger.phi,
      ease: options.ease || ANIM_CONFIG.easings.easeOut
    });
  },

  /**
   * Phi-based staggered reveal (golden ratio delays)
   * Creates natural-feeling animation with decreasing intervals
   * @param {NodeList|Array} elements
   * @param {Object} options
   */
  async phiStaggerReveal(elements, options = {}) {
    if (!elements || elements.length === 0) return;

    const elemArray = Array.from(elements);
    const delays = phiDelays(elemArray.length, options.baseDelay || 100);

    const fromProps = {
      opacity: 0,
      y: options.direction === 'up' ? 20 : -20,
      scale: options.scale ? 0.9 : 1,
      ...options.from
    };

    const toProps = {
      opacity: 1,
      y: 0,
      scale: 1,
      ...options.to
    };

    // Set initial state
    elemArray.forEach(el => this.set(el, fromProps));

    // Animate each with phi-based delay
    const promises = elemArray.map((el, i) => {
      return this.to(el, toProps, {
        duration: options.duration || ANIM_CONFIG.durations.normal,
        delay: delays[i] / 1000, // Convert ms to seconds
        ease: options.ease || ANIM_CONFIG.easings.phiOut
      });
    });

    await Promise.all(promises);
  },

  /**
   * Particle float animation
   * @param {Element} element
   * @param {Object} options
   */
  particleFloat(element, options = {}) {
    if (!element || this.reducedMotion) return;

    const range = options.range || 10;
    const duration = options.duration || 3;

    if (gsap) {
      gsap.to(element, {
        y: `+=${range}`,
        x: `+=${range * 0.5}`,
        duration: duration,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    } else {
      element.style.animation = `particleFloat ${duration}s ease-in-out infinite`;
    }
  },

  /**
   * Camera zoom animation (Three.js or perspective)
   * @param {Object} camera - Camera object or element
   * @param {Object} target - Target position
   * @param {Object} options
   */
  async cameraZoom(camera, target, options = {}) {
    if (!camera) return;

    const duration = options.duration || ANIM_CONFIG.durations.slow;

    if (gsap && camera.position) {
      // Three.js camera
      return gsap.to(camera.position, {
        x: target.x || camera.position.x,
        y: target.y || camera.position.y,
        z: target.z || camera.position.z,
        duration: duration,
        ease: ANIM_CONFIG.easings.easeInOut,
        onUpdate: options.onUpdate
      });
    } else if (camera.style) {
      // CSS perspective element
      return this.to(camera, {
        perspective: target.z || 1000
      }, { duration });
    }
  },

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Kill all animations on target
   * @param {Element|string} target
   */
  kill(target) {
    if (gsap) {
      gsap.killTweensOf(target);
    }
  },

  /**
   * Pause all animations
   */
  pauseAll() {
    if (gsap) {
      gsap.globalTimeline.pause();
    }
  },

  /**
   * Resume all animations
   */
  resumeAll() {
    if (gsap) {
      gsap.globalTimeline.resume();
    }
  },

  /**
   * Get configuration
   * @returns {Object}
   */
  getConfig() {
    return { ...ANIM_CONFIG };
  }
};

// ============================================
// CSS KEYFRAMES INJECTION
// ============================================

// Inject fallback keyframes if needed
const injectKeyframes = () => {
  if (document.getElementById('anim-keyframes')) return;

  const style = document.createElement('style');
  style.id = 'anim-keyframes';
  style.textContent = `
    @keyframes burnPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    @keyframes particleFloat {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(5px, 10px); }
    }
  `;
  document.head.appendChild(style);
};

// Inject on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectKeyframes);
  } else {
    injectKeyframes();
  }
}

// ============================================
// EXPORTS
// ============================================

export { Animations, loadGSAP };
export default Animations;

// Global export for browser
if (typeof window !== 'undefined') {
  window.Animations = Animations;
}
