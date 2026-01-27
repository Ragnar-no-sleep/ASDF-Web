/**
 * Yggdrasil Builder's Cosmos - Error Boundary
 * Graceful error handling and fallback UI
 *
 * Styles are in css/yggdrasil-unified.css (.cosmos-error)
 */

'use strict';

/**
 * Error types
 */
export const ErrorType = {
  WEBGL_NOT_SUPPORTED: 'webgl_not_supported',
  THREE_LOAD_FAILED: 'three_load_failed',
  INITIALIZATION_FAILED: 'initialization_failed',
  RENDER_ERROR: 'render_error',
  UNKNOWN: 'unknown',
};

/**
 * Error messages
 */
const ERROR_MESSAGES = {
  [ErrorType.WEBGL_NOT_SUPPORTED]: {
    title: 'WebGL Not Supported',
    message:
      'Your browser or device does not support WebGL, which is required for the 3D experience.',
    suggestion: 'Try using a modern browser like Chrome, Firefox, or Edge.',
  },
  [ErrorType.THREE_LOAD_FAILED]: {
    title: 'Failed to Load 3D Engine',
    message: 'Could not load the Three.js library.',
    suggestion: 'Check your internet connection and try refreshing.',
  },
  [ErrorType.INITIALIZATION_FAILED]: {
    title: 'Initialization Failed',
    message: 'The Cosmos could not be initialized.',
    suggestion: 'Try refreshing the page or clearing your browser cache.',
  },
  [ErrorType.RENDER_ERROR]: {
    title: 'Render Error',
    message: 'An error occurred while rendering the scene.',
    suggestion: 'Try refreshing the page.',
  },
  [ErrorType.UNKNOWN]: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    suggestion: 'Try refreshing the page.',
  },
};

/**
 * Error Boundary
 */
export const ErrorBoundary = {
  container: null,
  errorElement: null,
  onError: null,
  hasError: false,

  /**
   * Initialize error boundary
   */
  init(container, options = {}) {
    this.container = container;
    this.onError = options.onError || null;

    // Setup global error handlers
    this.setupGlobalHandlers();

    // Check WebGL support
    if (!this.checkWebGLSupport()) {
      this.showError(ErrorType.WEBGL_NOT_SUPPORTED);
      return false;
    }

    return true;
  },

  /**
   * Check WebGL support
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  },

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', event => {
      // Only show UI for critical errors
      if (event.error?.message?.includes('THREE') || event.error?.message?.includes('WebGL')) {
        this.showError(ErrorType.RENDER_ERROR, event.error);
      }

      if (this.onError) {
        this.onError(event.error, ErrorType.UNKNOWN);
      }
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', event => {
      if (this.onError) {
        this.onError(event.reason, ErrorType.UNKNOWN);
      }
    });
  },

  /**
   * Wrap an async function with error handling
   */
  async wrap(fn, errorType = ErrorType.UNKNOWN) {
    try {
      return await fn();
    } catch (error) {
      this.showError(errorType, error);

      if (this.onError) {
        this.onError(error, errorType);
      }

      throw error;
    }
  },

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port !== ''
    );
  },

  /**
   * Show error UI
   */
  showError(type, error = null) {
    if (this.hasError) return;
    this.hasError = true;

    const config = ERROR_MESSAGES[type] || ERROR_MESSAGES[ErrorType.UNKNOWN];
    const isDev = this.isDevelopment();

    // Create error element with CSS classes (styles in yggdrasil-unified.css)
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'cosmos-error';

    // Build error details only in development (security: no stack traces in prod)
    const errorDetails =
      error && isDev
        ? `<details class="error-details">
          <summary>Technical details (dev only)</summary>
          <pre>${this.escapeHtml(error.message || String(error))}</pre>
        </details>`
        : '';

    this.errorElement.innerHTML = `
      <div class="error-content">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h2 class="error-title">${config.title}</h2>
        <p class="error-message">${config.message}</p>
        <p class="error-suggestion">${config.suggestion}</p>
        ${errorDetails}
        <button class="error-retry" type="button">
          Refresh Page
        </button>
      </div>
    `;

    // Add to container or body
    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(this.errorElement);
    } else {
      document.body.appendChild(this.errorElement);
    }

    // Attach event listener (CSP compliant - no inline handlers)
    const retryButton = this.errorElement.querySelector('.error-retry');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        window.location.reload();
      });
    }
  },

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Clear error state
   */
  clear() {
    if (this.errorElement?.parentNode) {
      this.errorElement.parentNode.removeChild(this.errorElement);
    }
    this.errorElement = null;
    this.hasError = false;
  },

  /**
   * Dispose
   */
  dispose() {
    this.clear();
    this.container = null;
    this.onError = null;
  },
};

export default ErrorBoundary;
