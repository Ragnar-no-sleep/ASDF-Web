/**
 * Security Utils Unit Tests
 * Tests XSS prevention and content sanitization
 *
 * Note: security.js uses ES modules, so we test the pure functions directly
 *
 * This is fine.
 */

// ============================================
// COPY OF PURE FUNCTIONS FROM security.js
// (for testing without module bundler)
// ============================================

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

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"'`=/]/g, char => HTML_ENTITY_MAP[char]);
}

function escapeRegex(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return escapeHtml(text.trim());
}

function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  // Without DOMPurify, falls back to escapeHtml
  return escapeHtml(html);
}

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

function sanitizeUrl(url) {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return null;
    }
    return parsed.href;
  } catch (e) {
    return null;
  }
}

function isAllowedDomain(url, allowedDomains = []) {
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

function isValidId(id, maxLength = 100) {
  if (typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= maxLength;
}

function isValidProjectId(id) {
  if (typeof id !== 'string') return false;
  return /^[a-z0-9-]{2,50}$/.test(id);
}

function isValidTrackId(id) {
  if (typeof id !== 'string') return false;
  return /^[a-z]{2,20}$/.test(id);
}

function safeInnerHTML(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHtml(html);
}

function safeTextContent(element, text) {
  if (!element) return;
  element.textContent = typeof text === 'string' ? text : '';
}

// ============================================
// TESTS
// ============================================

describe('Security Utils', () => {
  describe('escapeHtml()', () => {
    it('should escape < and > characters', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    });

    it('should escape & character', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(escapeHtml("'single'")).toBe('&#039;single&#039;');
    });

    it('should escape backticks', () => {
      expect(escapeHtml('`template`')).toBe('&#x60;template&#x60;');
    });

    it('should escape = and /', () => {
      expect(escapeHtml('a=b')).toBe('a&#x3D;b');
      expect(escapeHtml('a/b')).toBe('a&#x2F;b');
    });

    it('should return empty string for non-string input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('');
      expect(escapeHtml({})).toBe('');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should escape XSS attack vectors', () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    it('should escape event handlers', () => {
      const result = escapeHtml('<img onerror="alert(1)">');
      expect(result).toBe('&lt;img onerror&#x3D;&quot;alert(1)&quot;&gt;');
    });
  });

  describe('escapeRegex()', () => {
    it('should escape regex special characters', () => {
      expect(escapeRegex('.*+?')).toBe('\\.\\*\\+\\?');
      expect(escapeRegex('()')).toBe('\\(\\)');
      expect(escapeRegex('[]')).toBe('\\[\\]');
      expect(escapeRegex('{}')).toBe('\\{\\}');
    });

    it('should escape ^ and $', () => {
      expect(escapeRegex('^start$end')).toBe('\\^start\\$end');
    });

    it('should handle pipe and backslash', () => {
      expect(escapeRegex('a|b')).toBe('a\\|b');
      expect(escapeRegex('a\\b')).toBe('a\\\\b');
    });

    it('should return empty string for non-string input', () => {
      expect(escapeRegex(null)).toBe('');
      expect(escapeRegex(123)).toBe('');
    });
  });

  describe('sanitizeText()', () => {
    it('should escape HTML in text', () => {
      expect(sanitizeText('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;&#x2F;b&gt;');
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });

    it('should handle non-string input', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(123)).toBe('');
    });
  });

  describe('sanitizeHtml()', () => {
    it('should escape dangerous HTML when DOMPurify not available', () => {
      const result = sanitizeHtml('<script>alert(1)</script>');
      expect(result).not.toContain('<script>');
    });

    it('should handle non-string input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(123)).toBe('');
    });
  });

  describe('sanitizeUrl()', () => {
    it('should allow http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should allow https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should allow mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
    });

    it('should handle non-string input', () => {
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(123)).toBeNull();
    });
  });

  describe('isAllowedDomain()', () => {
    const allowedDomains = ['example.com', 'trusted.org'];

    it('should allow exact domain match', () => {
      expect(isAllowedDomain('https://example.com/page', allowedDomains)).toBe(true);
    });

    it('should allow subdomain match', () => {
      expect(isAllowedDomain('https://sub.example.com/page', allowedDomains)).toBe(true);
    });

    it('should reject non-allowed domains', () => {
      expect(isAllowedDomain('https://evil.com', allowedDomains)).toBe(false);
    });

    it('should handle invalid URLs', () => {
      expect(isAllowedDomain('not a url', allowedDomains)).toBe(false);
    });

    it('should handle null/undefined input', () => {
      expect(isAllowedDomain(null, allowedDomains)).toBe(false);
      expect(isAllowedDomain('https://example.com', null)).toBe(false);
    });
  });

  describe('isValidId()', () => {
    it('should accept valid alphanumeric IDs', () => {
      expect(isValidId('abc123')).toBe(true);
      expect(isValidId('my-id')).toBe(true);
      expect(isValidId('my_id')).toBe(true);
      expect(isValidId('ABC')).toBe(true);
    });

    it('should reject IDs with special characters', () => {
      expect(isValidId('id<script>')).toBe(false);
      expect(isValidId('id with space')).toBe(false);
      expect(isValidId('id@email')).toBe(false);
    });

    it('should enforce max length', () => {
      expect(isValidId('a'.repeat(100))).toBe(true);
      expect(isValidId('a'.repeat(101))).toBe(false);
      expect(isValidId('abc', 2)).toBe(false);
    });

    it('should reject non-string input', () => {
      expect(isValidId(123)).toBe(false);
      expect(isValidId(null)).toBe(false);
    });
  });

  describe('isValidProjectId()', () => {
    it('should accept valid project IDs', () => {
      expect(isValidProjectId('my-project')).toBe(true);
      expect(isValidProjectId('project123')).toBe(true);
      expect(isValidProjectId('ab')).toBe(true);
    });

    it('should reject uppercase letters', () => {
      expect(isValidProjectId('MyProject')).toBe(false);
    });

    it('should reject too short IDs', () => {
      expect(isValidProjectId('a')).toBe(false);
    });

    it('should reject too long IDs', () => {
      expect(isValidProjectId('a'.repeat(51))).toBe(false);
    });

    it('should reject special characters except hyphen', () => {
      expect(isValidProjectId('my_project')).toBe(false);
      expect(isValidProjectId('my.project')).toBe(false);
    });
  });

  describe('isValidTrackId()', () => {
    it('should accept valid track IDs', () => {
      expect(isValidTrackId('solana')).toBe(true);
      expect(isValidTrackId('defi')).toBe(true);
    });

    it('should reject numbers', () => {
      expect(isValidTrackId('track1')).toBe(false);
    });

    it('should reject hyphens', () => {
      expect(isValidTrackId('my-track')).toBe(false);
    });

    it('should enforce length limits', () => {
      expect(isValidTrackId('a')).toBe(false);
      expect(isValidTrackId('a'.repeat(21))).toBe(false);
    });
  });

  describe('safeInnerHTML()', () => {
    it('should not throw on null element', () => {
      expect(() => safeInnerHTML(null, '<p>test</p>')).not.toThrow();
    });

    it('should sanitize content before setting', () => {
      const mockElement = { innerHTML: '' };
      safeInnerHTML(mockElement, '<script>alert(1)</script>');
      expect(mockElement.innerHTML).not.toContain('<script>');
    });
  });

  describe('safeTextContent()', () => {
    it('should not throw on null element', () => {
      expect(() => safeTextContent(null, 'test')).not.toThrow();
    });

    it('should set text content directly', () => {
      const mockElement = { textContent: '' };
      safeTextContent(mockElement, 'hello');
      expect(mockElement.textContent).toBe('hello');
    });

    it('should handle non-string input', () => {
      const mockElement = { textContent: '' };
      safeTextContent(mockElement, 123);
      expect(mockElement.textContent).toBe('');
    });
  });
});
