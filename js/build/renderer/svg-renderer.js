/**
 * Build V2 - SVG Renderer
 * Fallback renderer wrapping existing SVG tree
 * Provides common interface with Three.js renderer
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';
import { TreeComponent } from '../components/tree.js';
import { $, $$, addClass, removeClass, setStyles } from '../utils/dom.js';

// ============================================
// CONFIGURATION
// ============================================

const SVG_CONFIG = {
  // Animation settings (CSS-based)
  transitionDuration: 300,
  // Pulse animation
  pulseEnabled: true,
  // Hover effects
  hoverScale: 1.08,
  // Performance
  throttleHover: 16 // ~60fps
};

// ============================================
// SVG RENDERER STATE
// ============================================

let container = null;
let svgElement = null;
let isInitialized = false;
let hoverThrottleId = null;
let animationFrameId = null;

// ============================================
// SVG RENDERER
// ============================================

const SVGRenderer = {
  /**
   * Renderer type identifier
   */
  type: 'svg',

  /**
   * Initialize SVG renderer
   * @param {HTMLElement} containerEl - Container element
   * @param {Object} options - Configuration options
   */
  async init(containerEl, options = {}) {
    if (isInitialized) {
      console.warn('[SVGRenderer] Already initialized');
      return;
    }

    container = containerEl;

    // Find existing SVG or wait for TreeComponent to create it
    svgElement = $('svg', container) || $('.yggdrasil-svg', container);

    if (!svgElement) {
      console.log('[SVGRenderer] Waiting for TreeComponent SVG...');
      // TreeComponent handles SVG creation, we just enhance it
      await this.waitForSVG();
    }

    // Apply renderer-specific enhancements
    this.applyEnhancements(options);

    // Bind hover interactions
    this.bindInteractions();

    isInitialized = true;
    console.log('[SVGRenderer] Initialized');

    return this;
  },

  /**
   * Wait for SVG element to be created by TreeComponent
   * @returns {Promise<void>}
   */
  waitForSVG() {
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations, obs) => {
        svgElement = $('svg', container) || $('.yggdrasil-svg', container);
        if (svgElement) {
          obs.disconnect();
          resolve();
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true
      });

      // Timeout fallback
      setTimeout(() => {
        observer.disconnect();
        svgElement = $('svg', container);
        resolve();
      }, 2000);
    });
  },

  /**
   * Apply SVG-specific enhancements
   * @param {Object} options
   */
  applyEnhancements(options = {}) {
    if (!svgElement) return;

    // Add renderer class for CSS targeting
    addClass(svgElement, 'svg-renderer');

    // Apply reduced motion if needed
    if (options.capabilities?.reducedMotion) {
      addClass(svgElement, 'reduced-motion');
    }

    // Enable hardware acceleration via CSS
    setStyles(svgElement, {
      willChange: 'transform',
      transform: 'translateZ(0)'
    });

    // Enhance tree nodes for better interactions
    const nodes = $$('.tree-node, .realm', svgElement);
    nodes.forEach(node => {
      // Ensure nodes are interactive
      setStyles(node, {
        cursor: 'pointer',
        transition: `transform ${SVG_CONFIG.transitionDuration}ms ease-out`
      });
    });
  },

  /**
   * Bind interaction handlers
   */
  bindInteractions() {
    if (!svgElement) return;

    // Throttled hover effect
    svgElement.addEventListener('mousemove', (e) => {
      if (hoverThrottleId) return;

      hoverThrottleId = setTimeout(() => {
        this.handleHover(e);
        hoverThrottleId = null;
      }, SVG_CONFIG.throttleHover);
    });

    // Mouse leave - reset
    svgElement.addEventListener('mouseleave', () => {
      this.resetHoverEffects();
    });
  },

  /**
   * Handle hover interactions
   * @param {MouseEvent} e
   */
  handleHover(e) {
    const node = e.target.closest('.tree-node, .realm');

    if (node) {
      // Apply hover scale
      this.highlightNode(node);
    } else {
      this.resetHoverEffects();
    }
  },

  /**
   * Highlight a specific node
   * @param {Element} node
   */
  highlightNode(node) {
    // Reset others first
    const allNodes = $$('.tree-node, .realm', svgElement);
    allNodes.forEach(n => {
      if (n !== node) {
        removeClass(n, 'hovered');
        n.style.transform = '';
      }
    });

    // Highlight target
    addClass(node, 'hovered');

    // Get node center for transform-origin
    const rect = node.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setStyles(node, {
      transformOrigin: `${centerX}px ${centerY}px`,
      transform: `scale(${SVG_CONFIG.hoverScale})`
    });
  },

  /**
   * Reset all hover effects
   */
  resetHoverEffects() {
    const nodes = $$('.tree-node.hovered, .realm.hovered', svgElement);
    nodes.forEach(node => {
      removeClass(node, 'hovered');
      node.style.transform = '';
    });
  },

  /**
   * Update renderer (called on state changes)
   * @param {Object} data - Update data
   */
  update(data = {}) {
    if (!isInitialized) return;

    // Handle project selection
    if (data.selectedProject) {
      this.selectProject(data.selectedProject);
    }

    // Handle filter changes
    if (data.filter) {
      this.applyFilter(data.filter);
    }

    // Handle burn intensity update
    if (typeof data.burnIntensity === 'number') {
      this.updateBurnIntensity(data.burnIntensity);
    }
  },

  /**
   * Select/highlight a project node
   * @param {string} projectId
   */
  selectProject(projectId) {
    // Reset previous selection
    const selected = $$('.tree-node.selected, .realm.selected', svgElement);
    selected.forEach(el => removeClass(el, 'selected'));

    // Select new
    const node = $(`[data-project="${projectId}"]`, svgElement);
    if (node) {
      addClass(node, 'selected');

      // Emit selection event
      BuildState.emit('renderer:nodeSelected', { projectId });
    }
  },

  /**
   * Apply status filter
   * @param {string} status - 'all', 'live', 'building', 'planned'
   */
  applyFilter(status) {
    const nodes = $$('.tree-node, .realm', svgElement);

    nodes.forEach(node => {
      const nodeStatus = node.dataset.status;

      if (status === 'all' || nodeStatus === status) {
        removeClass(node, 'filtered-out');
        node.style.opacity = '';
      } else {
        addClass(node, 'filtered-out');
        node.style.opacity = '0.3';
      }
    });
  },

  /**
   * Update burn intensity visualization
   * @param {number} intensity - 0 to 1
   */
  updateBurnIntensity(intensity) {
    const heart = $('.tree-heart, .nordic-sun', svgElement);
    if (!heart) return;

    // Map intensity to pulse speed (faster = more burns)
    const minDuration = 800;
    const maxDuration = 2500;
    const duration = maxDuration - (intensity * (maxDuration - minDuration));

    heart.style.setProperty('--burn-pulse-duration', `${duration}ms`);

    // Update glow intensity
    const glowIntensity = 0.3 + (intensity * 0.7);
    heart.style.setProperty('--burn-glow-intensity', glowIntensity);
  },

  /**
   * Animate camera to node (SVG version: scroll + highlight)
   * @param {string} projectId
   * @param {Object} options
   */
  focusOnNode(projectId, options = {}) {
    const node = $(`[data-project="${projectId}"]`, svgElement);
    if (!node) return;

    // Scroll node into view
    node.scrollIntoView({
      behavior: options.instant ? 'instant' : 'smooth',
      block: 'center',
      inline: 'center'
    });

    // Pulse animation
    addClass(node, 'focusing');
    setTimeout(() => {
      removeClass(node, 'focusing');
    }, 600);

    this.selectProject(projectId);
  },

  /**
   * Get node position in screen coordinates
   * @param {string} projectId
   * @returns {Object|null} {x, y, width, height}
   */
  getNodePosition(projectId) {
    const node = $(`[data-project="${projectId}"]`, svgElement);
    if (!node) return null;

    const rect = node.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  },

  /**
   * Resize handler
   */
  resize() {
    // SVG scales automatically via viewBox
    // Just emit event for any listeners
    BuildState.emit('renderer:resize', {
      width: container?.clientWidth || 0,
      height: container?.clientHeight || 0
    });
  },

  /**
   * Start render loop (no-op for SVG, CSS handles animations)
   */
  startLoop() {
    // SVG uses CSS animations, no render loop needed
    console.log('[SVGRenderer] CSS animations active');
  },

  /**
   * Stop render loop
   */
  stopLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  },

  /**
   * Pause animations
   */
  pause() {
    if (svgElement) {
      addClass(svgElement, 'paused');
    }
  },

  /**
   * Resume animations
   */
  resume() {
    if (svgElement) {
      removeClass(svgElement, 'paused');
    }
  },

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isReady() {
    return isInitialized;
  },

  /**
   * Get renderer info
   * @returns {Object}
   */
  getInfo() {
    return {
      type: 'svg',
      initialized: isInitialized,
      nodeCount: svgElement ? $$('.tree-node, .realm', svgElement).length : 0
    };
  },

  /**
   * Dispose renderer
   */
  dispose() {
    this.stopLoop();

    if (hoverThrottleId) {
      clearTimeout(hoverThrottleId);
      hoverThrottleId = null;
    }

    if (svgElement) {
      removeClass(svgElement, 'svg-renderer', 'reduced-motion', 'paused');
    }

    container = null;
    svgElement = null;
    isInitialized = false;

    console.log('[SVGRenderer] Disposed');
  }
};

// ============================================
// EXPORTS
// ============================================

export { SVGRenderer };
export default SVGRenderer;

// Global export for browser
if (typeof window !== 'undefined') {
  window.SVGRenderer = SVGRenderer;
}
