/**
 * ASDF Security Utilities
 *
 * Security by Design - Defense in depth
 * - HTML sanitization (XSS prevention)
 * - Input validation
 * - Logging controls
 * - Error sanitization
 */

'use strict';

const SecurityUtils = (function() {
    // ============================================
    // ENVIRONMENT DETECTION
    // ============================================

    const isProduction = window.location.hostname !== 'localhost' &&
                         !window.location.hostname.includes('127.0.0.1');

    // ============================================
    // HTML SANITIZATION (XSS Prevention)
    // ============================================

    // HTML entities map for escaping
    const HTML_ENTITIES = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * Escape HTML entities to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHtml(str) {
        if (typeof str !== 'string') {
            return String(str);
        }
        return str.replace(/[&<>"'`=\/]/g, char => HTML_ENTITIES[char]);
    }

    /**
     * Sanitize string for safe HTML insertion
     * Removes all HTML tags and escapes entities
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    function sanitizeText(str) {
        if (typeof str !== 'string') {
            return String(str);
        }
        // Remove HTML tags
        const stripped = str.replace(/<[^>]*>/g, '');
        // Escape remaining entities
        return escapeHtml(stripped);
    }

    /**
     * Create safe text node (alternative to innerHTML for text)
     * @param {string} text - Text content
     * @returns {Text} Text node
     */
    function createTextNode(text) {
        return document.createTextNode(String(text));
    }

    /**
     * Safely set text content (no HTML parsing)
     * @param {HTMLElement} element - Target element
     * @param {string} text - Text to set
     */
    function setTextContent(element, text) {
        element.textContent = String(text);
    }

    // ============================================
    // INPUT VALIDATION
    // ============================================

    /**
     * Validate Solana wallet address format
     * @param {string} address - Address to validate
     * @returns {boolean} Is valid
     */
    function isValidSolanaAddress(address) {
        if (typeof address !== 'string') return false;
        // Base58 character set, 32-44 characters
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }

    /**
     * Validate numeric input
     * @param {any} value - Value to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    function validateNumber(value, options = {}) {
        const { min = -Infinity, max = Infinity, integer = false } = options;

        const num = Number(value);

        if (isNaN(num) || !isFinite(num)) {
            return { valid: false, error: 'Invalid number' };
        }

        if (integer && !Number.isInteger(num)) {
            return { valid: false, error: 'Must be integer' };
        }

        if (num < min) {
            return { valid: false, error: `Must be at least ${min}` };
        }

        if (num > max) {
            return { valid: false, error: `Must be at most ${max}` };
        }

        return { valid: true, value: num };
    }

    /**
     * Validate string input
     * @param {any} value - Value to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    function validateString(value, options = {}) {
        const {
            minLength = 0,
            maxLength = Infinity,
            pattern = null,
            allowEmpty = false
        } = options;

        if (typeof value !== 'string') {
            return { valid: false, error: 'Must be a string' };
        }

        if (!allowEmpty && value.trim().length === 0) {
            return { valid: false, error: 'Cannot be empty' };
        }

        if (value.length < minLength) {
            return { valid: false, error: `Must be at least ${minLength} characters` };
        }

        if (value.length > maxLength) {
            return { valid: false, error: `Must be at most ${maxLength} characters` };
        }

        if (pattern && !pattern.test(value)) {
            return { valid: false, error: 'Invalid format' };
        }

        return { valid: true, value: value.trim() };
    }

    /**
     * Sanitize item ID for catalog lookup
     * @param {string} itemId - Item ID to validate
     * @returns {string|null} Sanitized ID or null if invalid
     */
    function sanitizeItemId(itemId) {
        if (typeof itemId !== 'string') return null;
        // Item IDs are alphanumeric with underscores
        if (!/^[a-z0-9_]{1,50}$/.test(itemId)) return null;
        return itemId;
    }

    // ============================================
    // PRODUCTION LOGGING
    // ============================================

    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };

    // In production, only show warnings and errors
    const currentLogLevel = isProduction ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

    /**
     * Safe logging wrapper - respects production mode
     */
    const Logger = {
        debug(...args) {
            if (currentLogLevel <= LOG_LEVELS.DEBUG) {
                console.log('[DEBUG]', ...args);
            }
        },

        info(...args) {
            if (currentLogLevel <= LOG_LEVELS.INFO) {
                console.log('[INFO]', ...args);
            }
        },

        warn(...args) {
            if (currentLogLevel <= LOG_LEVELS.WARN) {
                console.warn('[WARN]', ...args);
            }
        },

        error(...args) {
            if (currentLogLevel <= LOG_LEVELS.ERROR) {
                // In production, sanitize error details
                if (isProduction) {
                    console.error('[ERROR]', 'An error occurred');
                } else {
                    console.error('[ERROR]', ...args);
                }
            }
        },

        // Always log security events
        security(...args) {
            console.warn('[SECURITY]', ...args);
        }
    };

    // ============================================
    // ERROR SANITIZATION
    // ============================================

    /**
     * Sanitize error for user display
     * @param {Error|string} error - Error to sanitize
     * @returns {string} Safe error message
     */
    function sanitizeError(error) {
        // Generic user-friendly messages for production
        const genericMessages = {
            'network': 'Network error. Please check your connection.',
            'auth': 'Authentication error. Please reconnect your wallet.',
            'validation': 'Invalid input. Please check and try again.',
            'server': 'Server error. Please try again later.',
            'default': 'An error occurred. Please try again.'
        };

        if (!isProduction) {
            // In development, show full error
            return error instanceof Error ? error.message : String(error);
        }

        // In production, return generic message
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

        if (message.includes('network') || message.includes('fetch')) {
            return genericMessages.network;
        }
        if (message.includes('auth') || message.includes('token') || message.includes('jwt')) {
            return genericMessages.auth;
        }
        if (message.includes('invalid') || message.includes('validation')) {
            return genericMessages.validation;
        }
        if (message.includes('500') || message.includes('server')) {
            return genericMessages.server;
        }

        return genericMessages.default;
    }

    /**
     * Wrap async function with error sanitization
     * @param {Function} fn - Async function to wrap
     * @returns {Function} Wrapped function
     */
    function withErrorHandling(fn) {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                Logger.error('Operation failed:', error);
                throw new Error(sanitizeError(error));
            }
        };
    }

    // ============================================
    // RATE LIMITING (Client-side)
    // ============================================

    const rateLimiters = new Map();

    /**
     * Check if action is rate limited
     * @param {string} key - Action identifier
     * @param {number} maxCalls - Max calls allowed
     * @param {number} windowMs - Time window in ms
     * @returns {boolean} Can proceed
     */
    function checkRateLimit(key, maxCalls = 10, windowMs = 60000) {
        const now = Date.now();

        if (!rateLimiters.has(key)) {
            rateLimiters.set(key, { calls: [], window: windowMs, max: maxCalls });
        }

        const limiter = rateLimiters.get(key);

        // Remove old calls outside window
        limiter.calls = limiter.calls.filter(time => now - time < windowMs);

        if (limiter.calls.length >= maxCalls) {
            Logger.warn(`Rate limit exceeded for: ${key}`);
            return false;
        }

        limiter.calls.push(now);
        return true;
    }

    // ============================================
    // CSP VIOLATION REPORTING
    // ============================================

    // Listen for CSP violations
    if (typeof document !== 'undefined') {
        document.addEventListener('securitypolicyviolation', (event) => {
            Logger.security('CSP Violation:', {
                directive: event.violatedDirective,
                blockedURI: event.blockedURI,
                documentURI: event.documentURI
            });
        });
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Environment
        isProduction,

        // HTML Sanitization
        escapeHtml,
        sanitizeText,
        createTextNode,
        setTextContent,

        // Input Validation
        isValidSolanaAddress,
        validateNumber,
        validateString,
        sanitizeItemId,

        // Logging
        Logger,
        LOG_LEVELS,

        // Error Handling
        sanitizeError,
        withErrorHandling,

        // Rate Limiting
        checkRateLimit
    };
})();

// Make available globally
window.SecurityUtils = SecurityUtils;

// Convenience exports
window.escapeHtml = SecurityUtils.escapeHtml;
window.Logger = SecurityUtils.Logger;
