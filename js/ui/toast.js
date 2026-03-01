/**
 * ASDF-Web Toast Notification System
 * Non-intrusive notifications with Fibonacci timing
 *
 * Philosophy: Progressive disclosure, phi-based animations
 *
 * @module ui/toast
 *
 * @example
 * import { toast, showSuccess, showError } from './ui/toast.js';
 *
 * // Simple usage
 * showSuccess('Transaction confirmed!');
 * showError('Connection failed');
 *
 * // Advanced usage
 * toast.show({
 *   message: 'Achievement unlocked!',
 *   type: 'achievement',
 *   duration: 5000,
 *   icon: '🏆'
 * });
 */

import { eventBus, EVENTS } from '../core/event-bus.js';
import { audio } from '../audio/engine.js';

// ============================================
// CONFIGURATION
// ============================================

const _PHI = 1.618033988749895;

/**
 * Toast configuration with Fibonacci timing
 */
const TOAST_CONFIG = {
  // Container settings
  containerId: 'asdf-toast-container',
  position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
  maxVisible: 5,

  // Timing (Fibonacci ms)
  defaultDuration: 3000,
  animationDuration: 300,
  staggerDelay: 89, // Fib(11)

  // Types with colors and icons
  types: {
    success: {
      icon: '✓',
      color: '#10b981',
      sound: 'success',
    },
    error: {
      icon: '✕',
      color: '#ef4444',
      sound: 'error',
    },
    warning: {
      icon: '⚠',
      color: '#f59e0b',
      sound: 'warning',
    },
    info: {
      icon: 'ℹ',
      color: '#3b82f6',
      sound: 'info',
    },
    achievement: {
      icon: '🏆',
      color: '#8b5cf6',
      sound: 'achievement',
    },
    burn: {
      icon: '🔥',
      color: '#f97316',
      sound: 'burn',
    },
  },
};

// ============================================
// TOAST CLASS
// ============================================

/**
 * Toast notification manager
 */
class ToastManager {
  constructor() {
    /** @type {HTMLElement|null} */
    this.container = null;

    /** @type {Map<string, HTMLElement>} */
    this.activeToasts = new Map();

    /** @type {number} */
    this.toastCounter = 0;

    /** @type {Object} */
    this.config = { ...TOAST_CONFIG };

    /** @type {boolean} */
    this.initialized = false;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize toast container
   * Creates container if needed
   */
  init() {
    if (this.initialized) return;
    if (typeof document === 'undefined') return;

    this._createContainer();
    this._setupEventListeners();

    this.initialized = true;
  }

  /**
   * Create toast container element
   * @private
   */
  _createContainer() {
    // Check if container already exists
    this.container = document.getElementById(this.config.containerId);
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = this.config.containerId;
    this.container.className = `toast-container toast-${this.config.position}`;
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'polite');

    document.body.appendChild(this.container);
  }

  // CSS extracted to css/runtime-components.css

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for toast events from event bus
    eventBus.on(EVENTS.TOAST_SHOW, data => {
      this.show(data);
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Show a toast notification
   * @param {Object|string} options - Toast options or message string
   * @returns {string} Toast ID
   */
  show(options) {
    this.init();

    // Normalize options
    const opts = typeof options === 'string' ? { message: options } : { ...options };

    const {
      message,
      title = null,
      type = 'info',
      duration = this.config.defaultDuration,
      icon = null,
      closable = true,
      progress = true,
      onClick = null,
    } = opts;

    // Get type config
    const typeConfig = this.config.types[type] || this.config.types.info;

    // Generate ID
    const id = `toast-${++this.toastCounter}`;

    // Limit visible toasts
    this._enforceLimit();

    // Create toast element
    const toast = this._createToastElement({
      id,
      message,
      title,
      icon: icon || typeConfig.icon,
      color: typeConfig.color,
      closable,
      progress,
      duration,
    });

    // Add click handler
    if (onClick) {
      toast.style.cursor = 'pointer';
      toast.addEventListener('click', e => {
        if (!e.target.closest('.toast-close')) {
          onClick();
        }
      });
    }

    // Add to container
    this.container.appendChild(toast);
    this.activeToasts.set(id, toast);

    // Play sound
    if (typeConfig.sound && audio?.isEnabled?.()) {
      audio.play(typeConfig.sound);
    }

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    // Emit event
    eventBus.emit('toast:shown', { id, type, message });

    return id;
  }

  /**
   * Create toast DOM element
   * @param {Object} options - Toast options
   * @returns {HTMLElement}
   * @private
   */
  _createToastElement({ id, message, title, icon, color, closable, progress, duration }) {
    const toast = document.createElement('div');
    toast.id = id;
    toast.className = 'toast';
    toast.style.setProperty('--toast-color', color);
    toast.setAttribute('role', 'status');

    // Build content
    let html = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${this._escapeHtml(title)}</div>` : ''}
        <div class="toast-message">${this._escapeHtml(message)}</div>
      </div>
    `;

    if (closable) {
      html += `<button class="toast-close" aria-label="Close">×</button>`;
    }

    if (progress && duration > 0) {
      html += `<div class="toast-progress" style="width: 100%; transition-duration: ${duration}ms;"></div>`;
    }

    toast.innerHTML = html;

    // Add close handler
    if (closable) {
      toast.querySelector('.toast-close').addEventListener('click', () => {
        this.dismiss(id);
      });
    }

    // Start progress animation
    if (progress && duration > 0) {
      requestAnimationFrame(() => {
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar) {
          progressBar.style.width = '0%';
        }
      });
    }

    return toast;
  }

  /**
   * Dismiss a toast
   * @param {string} id - Toast ID
   */
  dismiss(id) {
    const toast = this.activeToasts.get(id);
    if (!toast) return;

    toast.classList.remove('toast-visible');
    toast.classList.add('toast-exit');

    setTimeout(() => {
      toast.remove();
      this.activeToasts.delete(id);
      eventBus.emit('toast:dismissed', { id });
    }, this.config.animationDuration);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    for (const id of this.activeToasts.keys()) {
      this.dismiss(id);
    }
  }

  /**
   * Enforce max visible limit
   * @private
   */
  _enforceLimit() {
    while (this.activeToasts.size >= this.config.maxVisible) {
      const [firstId] = this.activeToasts.keys();
      this.dismiss(firstId);
    }
  }

  /**
   * Escape HTML
   * @param {string} str
   * @returns {string}
   * @private
   */
  _escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  /**
   * Show success toast
   * @param {string} message
   * @param {Object} options
   */
  success(message, options = {}) {
    return this.show({ ...options, message, type: 'success' });
  }

  /**
   * Show error toast
   * @param {string} message
   * @param {Object} options
   */
  error(message, options = {}) {
    return this.show({ ...options, message, type: 'error', duration: 5000 });
  }

  /**
   * Show warning toast
   * @param {string} message
   * @param {Object} options
   */
  warning(message, options = {}) {
    return this.show({ ...options, message, type: 'warning' });
  }

  /**
   * Show info toast
   * @param {string} message
   * @param {Object} options
   */
  info(message, options = {}) {
    return this.show({ ...options, message, type: 'info' });
  }

  /**
   * Show achievement toast
   * @param {string} message
   * @param {Object} options
   */
  achievement(message, options = {}) {
    return this.show({
      ...options,
      message,
      type: 'achievement',
      duration: 5000,
    });
  }

  /**
   * Show burn toast
   * @param {string} message
   * @param {Object} options
   */
  burn(message, options = {}) {
    return this.show({ ...options, message, type: 'burn' });
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Set toast position
   * @param {string} position
   */
  setPosition(position) {
    this.config.position = position;
    if (this.container) {
      this.container.className = `toast-container toast-${position}`;
    }
  }

  /**
   * Get active toast count
   * @returns {number}
   */
  getActiveCount() {
    return this.activeToasts.size;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const toast = new ToastManager();

// Export class for testing
export { ToastManager };

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Show a toast notification
 * @param {Object|string} options
 * @returns {string}
 */
export function showToast(options) {
  return toast.show(options);
}

/**
 * Show success toast
 * @param {string} message
 * @param {Object} options
 */
export function showSuccess(message, options) {
  return toast.success(message, options);
}

/**
 * Show error toast
 * @param {string} message
 * @param {Object} options
 */
export function showError(message, options) {
  return toast.error(message, options);
}

/**
 * Show warning toast
 * @param {string} message
 * @param {Object} options
 */
export function showWarning(message, options) {
  return toast.warning(message, options);
}

/**
 * Show info toast
 * @param {string} message
 * @param {Object} options
 */
export function showInfo(message, options) {
  return toast.info(message, options);
}

/**
 * Dismiss a toast
 * @param {string} id
 */
export function dismissToast(id) {
  toast.dismiss(id);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts() {
  toast.dismissAll();
}

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.toast = toast;
}
