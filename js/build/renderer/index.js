/**
 * Build V2 - Renderer Factory
 * Progressive enhancement: Three.js when capable, SVG fallback
 *
 * @version 1.0.0
 */

'use strict';

import { BuildState } from '../state.js';

// ============================================
// CONFIGURATION
// ============================================

const RENDERER_CONFIG = {
  // Minimum WebGL requirements
  webgl: {
    minVersion: 1,
    requiredExtensions: ['OES_texture_float'],
    maxTextureSize: 2048,
  },
  // Performance thresholds
  performance: {
    minFPS: 30,
    testDuration: 500, // ms
  },
  // User preferences
  respectReducedMotion: true,
  allowUserOverride: true,
};

// ============================================
// RENDERER FACTORY
// ============================================

const RendererFactory = {
  /**
   * Current active renderer
   */
  current: null,

  /**
   * Renderer type ('three' | 'svg')
   */
  type: null,

  /**
   * Capabilities detected
   */
  capabilities: {
    webgl: false,
    webgl2: false,
    reducedMotion: false,
    mobile: false,
    lowPower: false,
  },

  /**
   * Initialize the appropriate renderer
   * @param {HTMLElement} container - Container element for rendering
   * @param {Object} options - Override options
   * @returns {Promise<Object>} The initialized renderer
   */
  async init(container, options = {}) {
    console.log('[RendererFactory] Detecting capabilities...');

    // Detect all capabilities
    await this.detectCapabilities();

    // Determine which renderer to use
    const useThree = this.shouldUseThree(options);

    if (useThree) {
      console.log('[RendererFactory] Using Three.js renderer');
      this.type = 'three';
      const { ThreeRenderer } = await import('./three-renderer.js');
      this.current = ThreeRenderer;
    } else {
      console.log('[RendererFactory] Using SVG renderer (fallback)');
      this.type = 'svg';
      const { SVGRenderer } = await import('./svg-renderer.js');
      this.current = SVGRenderer;
      // Clear any saved preference when falling back to SVG automatically
      // This prevents persisting fallback as a "preference"
      const savedPref = localStorage.getItem('asdf-renderer-preference');
      if (savedPref === 'svg') {
        console.log('[RendererFactory] Clearing stale SVG preference');
        localStorage.removeItem('asdf-renderer-preference');
      }
    }

    // Initialize the chosen renderer
    await this.current.init(container, {
      ...options,
      capabilities: this.capabilities,
    });

    // Emit event
    BuildState.emit('renderer:ready', {
      type: this.type,
      capabilities: this.capabilities,
    });

    return this.current;
  },

  /**
   * Detect device/browser capabilities
   */
  async detectCapabilities() {
    // Check reduced motion preference
    this.capabilities.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Check if mobile
    this.capabilities.mobile = this.isMobileDevice();

    // Check low power mode (battery saver)
    this.capabilities.lowPower = await this.isLowPowerMode();

    // Check WebGL support
    this.capabilities.webgl = this.detectWebGL(1);
    this.capabilities.webgl2 = this.detectWebGL(2);

    console.log('[RendererFactory] Capabilities:', this.capabilities);
  },

  /**
   * Detect WebGL support
   * @param {number} version - 1 or 2
   * @returns {boolean}
   */
  detectWebGL(version = 1) {
    try {
      const canvas = document.createElement('canvas');
      const contextName = version === 2 ? 'webgl2' : 'webgl';
      const gl = canvas.getContext(contextName) || canvas.getContext('experimental-webgl');

      if (!gl) return false;

      // Check for required extensions
      if (version === 1) {
        const requiredExtensions = RENDERER_CONFIG.webgl.requiredExtensions;
        for (const ext of requiredExtensions) {
          if (!gl.getExtension(ext)) {
            console.warn(`[RendererFactory] Missing WebGL extension: ${ext}`);
            // Don't fail, just warn - extension may not be critical
          }
        }
      }

      // Check max texture size
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (maxTextureSize < RENDERER_CONFIG.webgl.maxTextureSize) {
        console.warn(`[RendererFactory] Low max texture size: ${maxTextureSize}`);
      }

      // Clean up
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) loseContext.loseContext();

      return true;
    } catch (e) {
      console.warn('[RendererFactory] WebGL detection failed:', e.message);
      return false;
    }
  },

  /**
   * Check if device is mobile
   * Uses UA detection only - window width should NOT affect WebGL decision
   * @returns {boolean}
   */
  isMobileDevice() {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    console.log(
      '[RendererFactory] Mobile UA check:',
      isMobileUA,
      'UA:',
      navigator.userAgent.substring(0, 50)
    );
    return isMobileUA;
  },

  /**
   * Check if device is in low power mode
   * @returns {Promise<boolean>}
   */
  async isLowPowerMode() {
    // Check Battery API if available
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        // Consider low power if battery < 20% and not charging
        return battery.level < 0.2 && !battery.charging;
      } catch (e) {
        // Battery API not supported or blocked
      }
    }

    // Check for Save-Data header hint
    if ('connection' in navigator) {
      const connection = navigator.connection;
      if (connection.saveData) return true;
      // Slow connection might indicate need for lighter rendering
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        return true;
      }
    }

    return false;
  },

  /**
   * Determine if Three.js should be used
   * @param {Object} options - Override options
   * @returns {boolean}
   */
  shouldUseThree(options = {}) {
    console.log('[RendererFactory] shouldUseThree() checking with options:', options);
    console.log('[RendererFactory] Current capabilities:', this.capabilities);

    // User can force a specific renderer
    if (options.forceRenderer) {
      console.log('[RendererFactory] Forced renderer:', options.forceRenderer);
      return options.forceRenderer === 'three';
    }

    // Check URL parameter override
    const urlParams = new URLSearchParams(window.location.search);
    const rendererParam = urlParams.get('renderer');
    if (rendererParam === 'three') {
      console.log('[RendererFactory] URL param forces Three.js');
      return true;
    }
    if (rendererParam === 'svg') {
      console.log('[RendererFactory] URL param forces SVG');
      return false;
    }

    // Check localStorage preference
    if (RENDERER_CONFIG.allowUserOverride) {
      const savedPref = localStorage.getItem('asdf-renderer-preference');
      console.log('[RendererFactory] localStorage preference:', savedPref);
      if (savedPref === 'three') return true;
      if (savedPref === 'svg') return false;
    }

    // Respect reduced motion preference
    if (RENDERER_CONFIG.respectReducedMotion && this.capabilities.reducedMotion) {
      console.log('[RendererFactory] Reduced motion preferred, using SVG');
      return false;
    }

    // Skip Three.js on low power mode
    if (this.capabilities.lowPower) {
      console.log('[RendererFactory] Low power mode, using SVG');
      return false;
    }

    // Need at least WebGL 1
    if (!this.capabilities.webgl) {
      console.log('[RendererFactory] No WebGL support, using SVG');
      return false;
    }

    // On mobile, prefer SVG for better battery life
    // unless explicitly enabled
    if (this.capabilities.mobile && !options.mobileThree) {
      console.log('[RendererFactory] Mobile device, using SVG for battery');
      return false;
    }

    // All checks passed, use Three.js
    console.log('[RendererFactory] All checks passed -> using Three.js');
    return true;
  },

  /**
   * Switch to a different renderer at runtime
   * @param {string} type - 'three' or 'svg'
   * @param {HTMLElement} container - Container element
   */
  async switchRenderer(type, container) {
    if (type === this.type) return;

    console.log(`[RendererFactory] Switching to ${type} renderer`);

    // Dispose current renderer
    if (this.current && this.current.dispose) {
      await this.current.dispose();
    }

    // Load and init new renderer
    if (type === 'three') {
      const { ThreeRenderer } = await import('./three-renderer.js');
      const { PerformanceManager } = await import('./performance.js');

      // Reset performance tracking before init to avoid false downgrades
      PerformanceManager.reset();
      // Set a grace period - prevent adaptation for 10 seconds after switch
      PerformanceManager.adaptation.lastChange = performance.now();

      this.current = ThreeRenderer;
    } else {
      const { SVGRenderer } = await import('./svg-renderer.js');
      this.current = SVGRenderer;
    }

    this.type = type;

    await this.current.init(container, {
      capabilities: this.capabilities,
    });

    // Save preference
    if (RENDERER_CONFIG.allowUserOverride) {
      localStorage.setItem('asdf-renderer-preference', type);
    }

    BuildState.emit('renderer:switched', { type });
  },

  /**
   * Get current renderer
   * @returns {Object}
   */
  getRenderer() {
    return this.current;
  },

  /**
   * Get renderer type
   * @returns {string}
   */
  getType() {
    return this.type;
  },

  /**
   * Get capabilities
   * @returns {Object}
   */
  getCapabilities() {
    return { ...this.capabilities };
  },

  /**
   * Dispose all renderers
   */
  async dispose() {
    if (this.current && this.current.dispose) {
      await this.current.dispose();
    }
    this.current = null;
    this.type = null;
  },
};

// ============================================
// EXPORTS
// ============================================

export { RendererFactory };
export default RendererFactory;

// Global export for browser
if (typeof window !== 'undefined') {
  window.RendererFactory = RendererFactory;
}
