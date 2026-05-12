/**
 * ASDF-Web Modal System
 * Accessible modal dialogs with Fibonacci animations
 *
 * Philosophy: Focus trap, keyboard navigation, phi-based timing
 *
 * @module ui/modal
 *
 * @example
 * import { modal, openModal, closeModal } from './ui/modal.js';
 *
 * // Simple confirm dialog
 * const confirmed = await modal.confirm({
 *   title: 'Confirm Action',
 *   message: 'Are you sure you want to proceed?'
 * });
 *
 * // Custom modal
 * modal.open({
 *   title: 'Custom Modal',
 *   content: '<div>Custom HTML content</div>',
 *   actions: [
 *     { label: 'Cancel', action: 'close' },
 *     { label: 'Submit', action: 'submit', primary: true }
 *   ]
 * });
 */

import { eventBus, EVENTS } from '../core/event-bus.js';
import { audio } from '../audio/engine.js';

// ============================================
// CONFIGURATION
// ============================================

const _PHI = 1.618033988749895;

/**
 * Modal configuration with Fibonacci timing
 */
const MODAL_CONFIG = {
  // Container settings
  containerId: 'asdf-modal-container',

  // Timing (Fibonacci ms)
  animationDuration: 300,
  backdropAnimationDuration: 200,

  // Behavior
  closeOnBackdrop: true,
  closeOnEscape: true,
  trapFocus: true,

  // Sizing
  sizes: {
    sm: '400px',
    md: '500px',
    lg: '700px',
    xl: '900px',
    full: '95vw',
  },
};

// ============================================
// MODAL CLASS
// ============================================

/**
 * Modal dialog manager
 */
class ModalManager {
  constructor() {
    /** @type {HTMLElement|null} */
    this.container = null;

    /** @type {HTMLElement|null} */
    this.currentModal = null;

    /** @type {HTMLElement|null} */
    this.previousFocus = null;

    /** @type {boolean} */
    this.initialized = false;

    /** @type {Object} */
    this.config = { ...MODAL_CONFIG };

    /** @type {Function|null} */
    this.resolvePromise = null;

    /** @type {number} */
    this.modalCounter = 0;

    // Bind methods
    this._handleKeydown = this._handleKeydown.bind(this);
    this._handleBackdropClick = this._handleBackdropClick.bind(this);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize modal system
   */
  init() {
    if (this.initialized) return;
    if (typeof document === 'undefined') return;

    this._setupEventListeners();

    this.initialized = true;
  }

  // CSS extracted to css/runtime-components.css

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for modal events from event bus
    eventBus.on(EVENTS.MODAL_OPEN, data => {
      this.open(data);
    });

    eventBus.on(EVENTS.MODAL_CLOSE, () => {
      this.close();
    });
  }

  // ============================================
  // KEYBOARD & FOCUS
  // ============================================

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event
   * @private
   */
  _handleKeydown(event) {
    if (event.key === 'Escape' && this.config.closeOnEscape) {
      this.close('escape');
      return;
    }

    if (event.key === 'Tab' && this.config.trapFocus) {
      this._trapFocus(event);
    }
  }

  /**
   * Trap focus within modal
   * @param {KeyboardEvent} event
   * @private
   */
  _trapFocus(event) {
    if (!this.currentModal) return;

    const focusable = this.currentModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }

  /**
   * Handle backdrop click
   * @param {MouseEvent} event
   * @private
   */
  _handleBackdropClick(event) {
    if (event.target === this.container && this.config.closeOnBackdrop) {
      this.close('backdrop');
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Open a modal dialog
   * @param {Object} options - Modal options
   * @returns {Promise<string>} Resolves with action name when closed
   */
  open(options = {}) {
    this.init();

    const {
      title = '',
      content = '',
      size = 'md',
      closable = true,
      icon = null,
      actions = [],
      className = '',
      onClose = null,
    } = options;

    // Close existing modal
    if (this.currentModal) {
      this.close('replace');
    }

    // Store previous focus
    this.previousFocus = document.activeElement;

    // Create modal
    const id = `modal-${++this.modalCounter}`;
    this.container = this._createModalElement({
      id,
      title,
      content,
      size,
      closable,
      icon,
      actions,
      className,
    });

    document.body.appendChild(this.container);
    this.currentModal = this.container.querySelector('.modal-dialog');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Add event listeners
    document.addEventListener('keydown', this._handleKeydown);
    this.container.addEventListener('click', this._handleBackdropClick);

    // Play sound
    if (audio?.isEnabled?.()) {
      audio.play('modalOpen');
    }

    // Animate in
    requestAnimationFrame(() => {
      this.container.classList.add('modal-visible');

      // Focus first focusable element
      setTimeout(() => {
        const focusable = this.currentModal?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, MODAL_CONFIG.animationDuration);
    });

    // Emit event
    eventBus.emit('modal:opened', { id, title });

    // Return promise
    return new Promise(resolve => {
      this.resolvePromise = action => {
        if (onClose) onClose(action);
        resolve(action);
      };
    });
  }

  /**
   * Create modal DOM element
   * @param {Object} options
   * @returns {HTMLElement}
   * @private
   */
  _createModalElement({ id, title, content, size, closable, icon, actions, className }) {
    const backdrop = document.createElement('div');
    backdrop.id = id;
    backdrop.className = `modal-backdrop modal-${size} ${className}`.trim();
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', `${id}-title`);

    let actionsHtml = '';
    if (actions.length > 0) {
      actionsHtml = `
        <div class="modal-footer">
          ${actions
            .map(action => {
              const btnClass = action.primary
                ? 'modal-btn-primary'
                : action.danger
                  ? 'modal-btn-danger'
                  : 'modal-btn-secondary';
              return `
              <button class="modal-btn ${btnClass}" data-action="${action.action || action.label}">
                ${this._escapeHtml(action.label)}
              </button>
            `;
            })
            .join('')}
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="modal-dialog">
        ${
          title || closable
            ? `
          <div class="modal-header">
            ${title ? `<h2 class="modal-title" id="${id}-title">${this._escapeHtml(title)}</h2>` : '<div></div>'}
            ${closable ? '<button class="modal-close" aria-label="Close">×</button>' : ''}
          </div>
        `
            : ''
        }
        <div class="modal-body">
          ${icon ? `<div class="modal-icon">${icon}</div>` : ''}
          ${content}
        </div>
        ${actionsHtml}
      </div>
    `;

    // Add close button handler
    const closeBtn = backdrop.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close('close'));
    }

    // Add action button handlers
    backdrop.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.close(action);
      });
    });

    return backdrop;
  }

  /**
   * Close the current modal
   * @param {string} action - Action that triggered close
   */
  close(action = 'close') {
    if (!this.container) return;

    // Animate out
    this.container.classList.remove('modal-visible');

    // Remove after animation
    setTimeout(() => {
      this.container?.remove();
      this.container = null;
      this.currentModal = null;

      // Restore body scroll
      document.body.style.overflow = '';

      // Remove event listeners
      document.removeEventListener('keydown', this._handleKeydown);

      // Restore focus
      if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
        this.previousFocus.focus();
      }

      // Play sound
      if (audio?.isEnabled?.()) {
        audio.play('modalClose');
      }

      // Resolve promise
      if (this.resolvePromise) {
        this.resolvePromise(action);
        this.resolvePromise = null;
      }

      // Emit event
      eventBus.emit('modal:closed', { action });
    }, MODAL_CONFIG.animationDuration);
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
   * Show alert dialog
   * @param {Object} options
   * @returns {Promise<string>}
   */
  alert(options) {
    const opts = typeof options === 'string' ? { message: options } : options;

    return this.open({
      title: opts.title || 'Alert',
      content: `<p>${this._escapeHtml(opts.message)}</p>`,
      icon: opts.icon || 'ℹ️',
      size: 'sm',
      className: 'modal-confirm',
      closable: false,
      actions: [{ label: opts.okText || 'OK', action: 'ok', primary: true }],
    });
  }

  /**
   * Show confirm dialog
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async confirm(options) {
    const opts = typeof options === 'string' ? { message: options } : options;

    const result = await this.open({
      title: opts.title || 'Confirm',
      content: `<p>${this._escapeHtml(opts.message)}</p>`,
      icon: opts.icon || '❓',
      size: 'sm',
      className: 'modal-confirm',
      closable: false,
      actions: [
        { label: opts.cancelText || 'Cancel', action: 'cancel' },
        {
          label: opts.confirmText || 'Confirm',
          action: 'confirm',
          primary: !opts.danger,
          danger: opts.danger,
        },
      ],
    });

    return result === 'confirm';
  }

  /**
   * Show prompt dialog
   * @param {Object} options
   * @returns {Promise<string|null>}
   */
  async prompt(options) {
    const opts = typeof options === 'string' ? { message: options } : options;

    const inputId = `prompt-input-${Date.now()}`;

    const result = await this.open({
      title: opts.title || 'Enter Value',
      content: `
        <p>${this._escapeHtml(opts.message || '')}</p>
        <input
          type="${opts.type || 'text'}"
          id="${inputId}"
          class="modal-input"
          placeholder="${opts.placeholder || ''}"
          value="${opts.defaultValue || ''}"
        />
      `,
      size: 'sm',
      closable: false,
      actions: [
        { label: opts.cancelText || 'Cancel', action: 'cancel' },
        { label: opts.submitText || 'Submit', action: 'submit', primary: true },
      ],
    });

    if (result === 'submit') {
      const input = document.getElementById(inputId);
      return input ? input.value : null;
    }

    return null;
  }

  /**
   * Check if modal is open
   * @returns {boolean}
   */
  isOpen() {
    return !!this.currentModal;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const modal = new ModalManager();

// Export class for testing
export { ModalManager };

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Open modal
 * @param {Object} options
 * @returns {Promise<string>}
 */
export function openModal(options) {
  return modal.open(options);
}

/**
 * Close modal
 * @param {string} action
 */
export function closeModal(action) {
  modal.close(action);
}

/**
 * Show alert dialog
 * @param {Object|string} options
 * @returns {Promise<string>}
 */
export function showAlert(options) {
  return modal.alert(options);
}

/**
 * Show confirm dialog
 * @param {Object|string} options
 * @returns {Promise<boolean>}
 */
export function showConfirm(options) {
  return modal.confirm(options);
}

/**
 * Show prompt dialog
 * @param {Object|string} options
 * @returns {Promise<string|null>}
 */
export function showPrompt(options) {
  return modal.prompt(options);
}

// ============================================
// GLOBAL ACCESS
// ============================================

if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.modal = modal;
}
