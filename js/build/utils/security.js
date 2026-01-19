/**
 * Build V2 - Security Utilities
 * XSS Prevention and Content Sanitization
 *
 * @version 2.0.0
 */

'use strict';

// ============================================
// HTML ESCAPING
// ============================================

/**
 * HTML entity map for escaping
 */
const HTML_ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escape HTML special characters to prevent XSS
 * @param {*} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"'`=/]/g, char => HTML_ENTITY_MAP[char]);
}

/**
 * Escape text for use in regex
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeRegex(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// DOMPURIFY CONFIGURATION
// ============================================

/**
 * Allowed HTML tags for sanitization
 */
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'pre', 'code', 'blockquote', 'hr',
  'svg', 'path', 'circle', 'rect', 'line', 'g', 'defs',
  'linearGradient', 'radialGradient', 'stop', 'marker',
  'polygon', 'text', 'textPath', 'use', 'tspan', 'ellipse'
];

/**
 * Allowed HTML attributes for sanitization
 */
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id', 'style',
  'data-*', 'type', 'value', 'placeholder', 'disabled',
  'target', 'rel', 'width', 'height', 'viewBox', 'd',
  'fill', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-dasharray', 'opacity', 'transform', 'preserveAspectRatio',
  'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'font-family', 'font-size', 'font-weight', 'text-anchor',
  'startOffset', 'offset', 'stop-color', 'stop-opacity',
  'markerWidth', 'markerHeight', 'refX', 'refY', 'orient',
  'points', 'rx', 'ry'
];

/**
 * Forbidden HTML tags
 */
const FORBID_TAGS = ['script', 'iframe', 'object', 'embed', 'form'];

/**
 * Forbidden HTML attributes
 */
const FORBID_ATTR = ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'];

/**
 * Sanitize HTML content using DOMPurify or fallback
 * @param {*} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';

  // Use DOMPurify if available
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: true,
      ADD_ATTR: ['target'],
      FORBID_TAGS,
      FORBID_ATTR
    });
  }

  // Fallback to basic escaping if DOMPurify not loaded
  console.warn('[Security] DOMPurify not loaded, using basic escaping');
  return escapeHtml(html);
}

/**
 * Sanitize text for display (no HTML allowed)
 * @param {*} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return escapeHtml(text.trim());
}

// ============================================
// SAFE DOM OPERATIONS
// ============================================

/**
 * Safely set innerHTML with sanitization
 * @param {Element} element - DOM element
 * @param {string} html - HTML content
 */
export function safeInnerHTML(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHtml(html);
}

/**
 * Safely set textContent (always safe, no HTML)
 * @param {Element} element - DOM element
 * @param {string} text - Text content
 */
export function safeTextContent(element, text) {
  if (!element) return;
  element.textContent = typeof text === 'string' ? text : '';
}

/**
 * Create a safe text node
 * @param {string} text - Text content
 * @returns {Text} Text node
 */
export function createSafeTextNode(text) {
  return document.createTextNode(typeof text === 'string' ? text : '');
}

// ============================================
// URL VALIDATION
// ============================================

/**
 * Allowed URL protocols
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * Validate and sanitize a URL
 * @param {string} url - URL to validate
 * @returns {string|null} Sanitized URL or null if invalid
 */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      console.warn('[Security] Blocked URL protocol:', parsed.protocol);
      return null;
    }
    return parsed.href;
  } catch (e) {
    // Not a valid URL
    return null;
  }
}

/**
 * Check if URL is from allowed domains
 * @param {string} url - URL to check
 * @param {string[]} allowedDomains - Array of allowed domains
 * @returns {boolean}
 */
export function isAllowedDomain(url, allowedDomains = []) {
  if (!url || !Array.isArray(allowedDomains)) return false;

  try {
    const parsed = new URL(url);
    return allowedDomains.some(domain => {
      return parsed.hostname === domain || parsed.hostname.endsWith('.' + domain);
    });
  } catch (e) {
    return false;
  }
}

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validate alphanumeric ID
 * @param {*} id - ID to validate
 * @param {number} maxLength - Maximum length
 * @returns {boolean}
 */
export function isValidId(id, maxLength = 100) {
  if (typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= maxLength;
}

/**
 * Validate project ID format
 * @param {*} id - ID to validate
 * @returns {boolean}
 */
export function isValidProjectId(id) {
  if (typeof id !== 'string') return false;
  return /^[a-z0-9-]{2,50}$/.test(id);
}

/**
 * Validate track ID format
 * @param {*} id - ID to validate
 * @returns {boolean}
 */
export function isValidTrackId(id) {
  if (typeof id !== 'string') return false;
  return /^[a-z]{2,20}$/.test(id);
}

// ============================================
// EXPORTS FOR NON-MODULE ENVIRONMENTS
// ============================================

if (typeof window !== 'undefined') {
  window.BuildSecurity = {
    escapeHtml,
    escapeRegex,
    sanitizeHtml,
    sanitizeText,
    safeInnerHTML,
    safeTextContent,
    createSafeTextNode,
    sanitizeUrl,
    isAllowedDomain,
    isValidId,
    isValidProjectId,
    isValidTrackId
  };
}
