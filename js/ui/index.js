/**
 * ASDF-Web UI Module
 * Central exports for UI components
 *
 * @module ui
 *
 * @example
 * // Import UI components
 * import { toast, modal, showSuccess, showConfirm } from './ui/index.js';
 *
 * // Toast usage
 * showSuccess('Transaction complete!');
 *
 * // Modal usage
 * const confirmed = await showConfirm({
 *   title: 'Confirm Action',
 *   message: 'Are you sure?'
 * });
 */

// Toast System
export {
  toast,
  ToastManager,
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  dismissToast,
  dismissAllToasts
} from './toast.js';

// Modal System
export {
  modal,
  ModalManager,
  openModal,
  closeModal,
  showAlert,
  showConfirm,
  showPrompt
} from './modal.js';

/**
 * Initialize all UI components
 * @param {Object} options - Init options
 * @returns {Object} UI instance
 */
export function initUI(options = {}) {
  const { toast: toastModule } = require('./toast.js');
  const { modal: modalModule } = require('./modal.js');

  toastModule.init();
  modalModule.init();

  return {
    toast: toastModule,
    modal: modalModule
  };
}

/**
 * Get UI ready state
 * @returns {boolean}
 */
export function isUIReady() {
  if (typeof window === 'undefined') return false;
  return !!(window.ASDF?.toast?.initialized && window.ASDF?.modal?.initialized);
}

// Version
export const VERSION = '1.0.0';
