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

const PHI = 1.618033988749895;

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
    full: '95vw'
  }
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

    this._injectStyles();
    this._setupEventListeners();

    this.initialized = true;
  }

  /**
   * Inject CSS styles
   * @private
   */
  _injectStyles() {
    if (document.getElementById('asdf-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'asdf-modal-styles';
    style.textContent = `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9998;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        transition: opacity ${MODAL_CONFIG.backdropAnimationDuration}ms ease-out;
      }

      .modal-backdrop.modal-visible {
        opacity: 1;
      }

      .modal-dialog {
        position: relative;
        background: #111;
        border: 1px solid #333;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
        transition: all ${MODAL_CONFIG.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      .modal-visible .modal-dialog {
        opacity: 1;
        transform: scale(1) translateY(0);
      }

      .modal-sm .modal-dialog { width: ${MODAL_CONFIG.sizes.sm}; }
      .modal-md .modal-dialog { width: ${MODAL_CONFIG.sizes.md}; }
      .modal-lg .modal-dialog { width: ${MODAL_CONFIG.sizes.lg}; }
      .modal-xl .modal-dialog { width: ${MODAL_CONFIG.sizes.xl}; }
      .modal-full .modal-dialog { width: ${MODAL_CONFIG.sizes.full}; }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #333;
      }

      .modal-title {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin: 0;
      }

      .modal-close {
        background: none;
        border: none;
        color: #71717a;
        cursor: pointer;
        padding: 8px;
        margin: -8px;
        font-size: 24px;
        line-height: 1;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .modal-close:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      .modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        color: #a1a1aa;
        line-height: 1.6;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid #333;
        background: rgba(0, 0, 0, 0.2);
      }

      .modal-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
      }

      .modal-btn-secondary {
        background: transparent;
        border-color: #333;
        color: #a1a1aa;
      }

      .modal-btn-secondary:hover {
        border-color: #555;
        color: #fff;
      }

      .modal-btn-primary {
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        color: #fff;
      }

      .modal-btn-primary:hover {
        filter: brightness(1.1);
        transform: translateY(-1px);
      }

      .modal-btn-danger {
        background: #dc2626;
        color: #fff;
      }

      .modal-btn-danger:hover {
        background: #ef4444;
      }

      .modal-icon {
        text-align: center;
        font-size: 48px;
        margin-bottom: 16px;
      }

      .modal-confirm .modal-body {
        text-align: center;
        padding: 24px;
      }

      .modal-confirm .modal-title {
        margin-bottom: 8px;
      }

      .modal-confirm .modal-footer {
        justify-content: center;
      }

      @media (max-width: 480px) {
        .modal-backdrop {
          padding: 8px;
          align-items: flex-end;
        }
        .modal-dialog {
          width: 100% !important;
          max-height: 85vh;
          border-radius: 16px 16px 0 0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Listen for modal events from event bus
    eventBus.on(EVENTS.MODAL_OPEN, (data) => {
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
      onClose = null
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
      className
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
    return new Promise((resolve) => {
      this.resolvePromise = (action) => {
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
          ${actions.map(action => {
            const btnClass = action.primary ? 'modal-btn-primary' :
              action.danger ? 'modal-btn-danger' : 'modal-btn-secondary';
            return `
              <button class="modal-btn ${btnClass}" data-action="${action.action || action.label}">
                ${this._escapeHtml(action.label)}
              </button>
            `;
          }).join('')}
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="modal-dialog">
        ${title || closable ? `
          <div class="modal-header">
            ${title ? `<h2 class="modal-title" id="${id}-title">${this._escapeHtml(title)}</h2>` : '<div></div>'}
            ${closable ? '<button class="modal-close" aria-label="Close">×</button>' : ''}
          </div>
        ` : ''}
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
    const opts = typeof options === 'string'
      ? { message: options }
      : options;

    return this.open({
      title: opts.title || 'Alert',
      content: `<p>${this._escapeHtml(opts.message)}</p>`,
      icon: opts.icon || 'ℹ️',
      size: 'sm',
      className: 'modal-confirm',
      closable: false,
      actions: [
        { label: opts.okText || 'OK', action: 'ok', primary: true }
      ]
    });
  }

  /**
   * Show confirm dialog
   * @param {Object} options
   * @returns {Promise<boolean>}
   */
  async confirm(options) {
    const opts = typeof options === 'string'
      ? { message: options }
      : options;

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
          danger: opts.danger
        }
      ]
    });

    return result === 'confirm';
  }

  /**
   * Show prompt dialog
   * @param {Object} options
   * @returns {Promise<string|null>}
   */
  async prompt(options) {
    const opts = typeof options === 'string'
      ? { message: options }
      : options;

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
          style="
            width: 100%;
            padding: 12px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
            margin-top: 12px;
          "
        />
      `,
      size: 'sm',
      closable: false,
      actions: [
        { label: opts.cancelText || 'Cancel', action: 'cancel' },
        { label: opts.submitText || 'Submit', action: 'submit', primary: true }
      ]
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
