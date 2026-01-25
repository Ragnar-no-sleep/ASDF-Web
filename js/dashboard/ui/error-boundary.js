/**
 * Yggdrasil Builder's Cosmos - Error Boundary
 * Graceful error handling and fallback UI
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
    } catch (e) {
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
   * Show error UI
   */
  showError(type, error = null) {
    if (this.hasError) return;
    this.hasError = true;

    const config = ERROR_MESSAGES[type] || ERROR_MESSAGES[ErrorType.UNKNOWN];

    // Create error element
    this.errorElement = document.createElement('div');
    this.errorElement.className = 'cosmos-error';
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
        ${
          error
            ? `<details class="error-details">
          <summary>Technical details</summary>
          <pre>${this.escapeHtml(error.message || String(error))}</pre>
        </details>`
            : ''
        }
        <button class="error-retry" onclick="location.reload()">
          Refresh Page
        </button>
      </div>
    `;

    // Apply styles
    this.applyStyles();

    // Add to container or body
    if (this.container) {
      this.container.innerHTML = '';
      this.container.appendChild(this.errorElement);
    } else {
      document.body.appendChild(this.errorElement);
    }
  },

  /**
   * Apply error UI styles
   */
  applyStyles() {
    if (!this.errorElement) return;

    Object.assign(this.errorElement.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #020812 0%, #0a1628 100%)',
      zIndex: '10000',
      fontFamily: "'Inter', -apple-system, sans-serif",
    });

    const content = this.errorElement.querySelector('.error-content');
    if (content) {
      Object.assign(content.style, {
        textAlign: 'center',
        maxWidth: '400px',
        padding: '40px',
        color: '#e0e0e0',
      });
    }

    const icon = this.errorElement.querySelector('.error-icon');
    if (icon) {
      Object.assign(icon.style, {
        color: '#ff4444',
        marginBottom: '24px',
      });
    }

    const title = this.errorElement.querySelector('.error-title');
    if (title) {
      Object.assign(title.style, {
        margin: '0 0 12px',
        fontSize: '24px',
        fontWeight: '700',
        color: '#fff',
      });
    }

    const message = this.errorElement.querySelector('.error-message');
    if (message) {
      Object.assign(message.style, {
        margin: '0 0 8px',
        fontSize: '14px',
        color: '#aaa',
        lineHeight: '1.6',
      });
    }

    const suggestion = this.errorElement.querySelector('.error-suggestion');
    if (suggestion) {
      Object.assign(suggestion.style, {
        margin: '0 0 24px',
        fontSize: '13px',
        color: '#666',
      });
    }

    const details = this.errorElement.querySelector('.error-details');
    if (details) {
      Object.assign(details.style, {
        marginBottom: '24px',
        textAlign: 'left',
        fontSize: '12px',
        color: '#666',
      });

      const pre = details.querySelector('pre');
      if (pre) {
        Object.assign(pre.style, {
          marginTop: '8px',
          padding: '12px',
          background: 'rgba(255, 0, 0, 0.1)',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '100px',
          fontSize: '11px',
          color: '#ff6666',
        });
      }
    }

    const button = this.errorElement.querySelector('.error-retry');
    if (button) {
      Object.assign(button.style, {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #ff4444, #ff6644)',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
      });

      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 4px 20px rgba(255, 68, 68, 0.4)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = 'none';
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
