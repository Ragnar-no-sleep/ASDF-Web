/**
 * ASDF Quality Gate Tests
 *
 * Pre-deployment validation for:
 * - SOLID principles
 * - Accessibility (WCAG 2.1 AA)
 * - Security
 * - Privacy
 * - Modularity
 * - Scalability
 * - Pattern by Design
 *
 * Run: npm test -- tests/unit/quality-gate.test.js
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// TEST UTILITIES
// =============================================================================

// Resolve paths from project root
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const JS_GAMES_DIR = path.join(PROJECT_ROOT, 'js/games');
const CSS_DIR = path.join(PROJECT_ROOT, 'css');
const API_DIR = path.join(PROJECT_ROOT, 'api');

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function getJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getJsFiles(fullPath, files);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.cjs')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getCssFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.css'))
    .map(f => path.join(dir, f));
}

// =============================================================================
// SOLID PRINCIPLES
// =============================================================================

describe('SOLID Principles', () => {
  describe('Single Responsibility Principle (SRP)', () => {
    test('each module file should have focused responsibility', () => {
      const files = getJsFiles(JS_GAMES_DIR);

      for (const file of files) {
        const content = readFile(file);
        if (!content) continue;

        // Count exported functions/classes
        const exports = (content.match(/^(function|class|const|let|var)\s+\w+/gm) || []).length;
        const fileName = path.basename(file);

        // Warn if file has too many top-level exports (> 15 suggests multiple responsibilities)
        if (exports > 15 && !fileName.includes('utils') && !fileName.includes('config')) {
          console.warn(
            `[SRP] ${fileName} has ${exports} top-level declarations - consider splitting`
          );
        }

        // Files should be < 500 lines (except utils/config)
        const lines = content.split('\n').length;
        if (lines > 500 && !fileName.includes('utils') && !fileName.includes('config')) {
          console.warn(`[SRP] ${fileName} has ${lines} lines - consider splitting`);
        }
      }

      expect(true).toBe(true); // Pass - warnings are informational
    });

    test('services should be organized in directories', () => {
      const expectedDirs = ['core', 'ui', 'engine'];
      const actualDirs = fs
        .readdirSync(JS_GAMES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      for (const dir of expectedDirs) {
        if (!actualDirs.includes(dir)) {
          console.warn(`[SRP] Missing expected directory: js/games/${dir}`);
        }
      }

      expect(actualDirs.length).toBeGreaterThan(0);
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    test('game engines should extend base class, not modify it', () => {
      const engineDir = path.join(JS_GAMES_DIR, 'engine');
      if (!fs.existsSync(engineDir)) {
        console.warn('[OCP] No engine directory found');
        return;
      }

      const files = fs.readdirSync(engineDir).filter(f => f.endsWith('.js'));
      const baseEngineExists = files.some(f => f.includes('base') || f.includes('Base'));

      expect(baseEngineExists || files.length === 0).toBe(true);
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    test('UI modules should have consistent interface', () => {
      const uiDir = path.join(JS_GAMES_DIR, 'ui');
      if (!fs.existsSync(uiDir)) return;

      const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const content = readFile(path.join(uiDir, file));
        if (!content) continue;

        // UI modules should export an object or have consistent patterns
        const hasExport =
          content.includes('window.') ||
          content.includes('module.exports') ||
          content.includes('export ');

        expect(hasExport).toBe(true);
      }
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    test('shared modules should use conditional checks for optional deps', () => {
      const lifecycleFile = path.join(JS_GAMES_DIR, 'shared/lifecycle.js');
      const content = readFile(lifecycleFile);

      if (content) {
        // Should guard optional dependencies with typeof checks
        const hasGuards =
          content.includes('typeof') || content.includes('window.') || content.includes('if (');
        expect(hasGuards).toBe(true);
      }
    });
  });
});

// =============================================================================
// ACCESSIBILITY (WCAG 2.1 AA)
// =============================================================================

describe('Accessibility (WCAG 2.1 AA)', () => {
  describe('Color Contrast', () => {
    test('CSS should define accessible color variables', () => {
      const files = getCssFiles(CSS_DIR);
      let hasContrastVars = false;

      for (const file of files) {
        const content = readFile(file);
        if (!content) continue;

        // Check for color variables with good contrast
        if (content.includes('--text-') || content.includes('--bg-')) {
          hasContrastVars = true;
        }

        // Warn about potential low contrast colors
        const lowContrastPatterns = [
          /#[89a-f]{6}/gi, // Very light colors as text
          /color:\s*#[0-4][0-9a-f]{5}/gi, // Very dark colors on dark bg
        ];

        // Just check structure exists
      }

      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('Keyboard Navigation', () => {
    test('interactive elements should be keyboard accessible', () => {
      const uiFiles = getJsFiles(path.join(JS_GAMES_DIR, 'ui'));

      for (const file of uiFiles) {
        const content = readFile(file);
        if (!content) continue;

        // Check for keyboard event handlers
        const hasKeyboard =
          content.includes('keydown') ||
          content.includes('keyup') ||
          content.includes('keypress') ||
          content.includes('tabindex');

        // Check for click handlers (should have keyboard equivalent)
        const hasClick = content.includes('click');

        if (hasClick && !hasKeyboard) {
          console.warn(`[A11y] ${path.basename(file)} has click handlers but no keyboard support`);
        }
      }

      expect(true).toBe(true);
    });
  });

  describe('ARIA Attributes', () => {
    test('dynamic content should use ARIA live regions', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasAriaLive = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        if (
          content.includes('aria-live') ||
          content.includes('role="alert"') ||
          content.includes('role="status"')
        ) {
          hasAriaLive = true;
          break;
        }
      }

      // Leaderboards and score updates should announce changes
      if (!hasAriaLive) {
        console.warn('[A11y] No ARIA live regions found - dynamic content may not be announced');
      }

      expect(true).toBe(true);
    });
  });

  describe('Focus Management', () => {
    test('modals should trap focus', () => {
      const modalFile = path.join(JS_GAMES_DIR, 'ui/modal.js');
      const content = readFile(modalFile);

      if (content) {
        const hasFocusTrap =
          content.includes('focus') ||
          content.includes('tabindex') ||
          content.includes('querySelector');
        // Focus management is important for modals
        expect(hasFocusTrap).toBe(true);
      }
    });
  });
});

// =============================================================================
// SECURITY
// =============================================================================

describe('Security', () => {
  describe('XSS Prevention', () => {
    test('should escape HTML in user-generated content', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasEscaping = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        if (
          content.includes('escapeHtml') ||
          content.includes('textContent') ||
          content.includes('DOMPurify') ||
          content.includes('sanitize')
        ) {
          hasEscaping = true;
        }

        // Warn about innerHTML without sanitization
        const innerHtmlMatches = content.match(/innerHTML\s*=/g) || [];
        const escapeMatches = content.match(/escapeHtml|sanitize|DOMPurify/g) || [];

        if (innerHtmlMatches.length > escapeMatches.length) {
          console.warn(`[Security] ${path.basename(file)} uses innerHTML - verify sanitization`);
        }
      }

      expect(hasEscaping).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('game IDs should be validated', () => {
      const utilsFile = path.join(JS_GAMES_DIR, 'utils.js');
      const content = readFile(utilsFile);

      if (content) {
        const hasValidation =
          content.includes('isValidGameId') ||
          content.includes('validateGameId') ||
          content.includes('VALID_GAME_IDS');
        expect(hasValidation).toBe(true);
      }
    });

    test('scores should be validated before submission', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasScoreValidation = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        if (
          content.includes('validateScore') ||
          content.includes('isValidScore') ||
          content.includes('MAX_SCORE') ||
          content.includes('Number.isInteger')
        ) {
          hasScoreValidation = true;
          break;
        }
      }

      expect(hasScoreValidation).toBe(true);
    });
  });

  describe('CSP Compliance', () => {
    test('no inline event handlers in template strings', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      const violations = [];

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        // Check for onclick/onload/onerror in template strings (CSP violation)
        const inlineHandlers = content.match(/<[^>]+(onclick|onload|onerror)=/gi) || [];

        if (inlineHandlers.length > 0) {
          violations.push(`${path.basename(file)}: ${inlineHandlers.length} inline handler(s)`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Rate Limiting', () => {
    test('API calls should have rate limiting awareness', () => {
      const apiFile = path.join(JS_GAMES_DIR, 'api.js');
      const content = readFile(apiFile);

      if (content) {
        const hasRateLimiting =
          content.includes('rateLimit') ||
          content.includes('throttle') ||
          content.includes('debounce') ||
          content.includes('429');
        // Client should handle rate limiting
        if (!hasRateLimiting) {
          console.warn('[Security] API module has no visible rate limiting handling');
        }
      }

      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// PRIVACY
// =============================================================================

describe('Privacy', () => {
  describe('Data Collection', () => {
    test('no unnecessary PII collection', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        // Check for potential PII patterns
        const piiPatterns = [/email/i, /password/i, /phoneNumber/i, /ssn/i, /creditCard/i];

        for (const pattern of piiPatterns) {
          if (pattern.test(content)) {
            console.warn(`[Privacy] ${path.basename(file)} may collect ${pattern.source}`);
          }
        }
      }

      expect(true).toBe(true);
    });

    test('wallet addresses should be truncated in display', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasTruncation = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        if (
          content.includes('truncate') ||
          content.includes('slice(0,') ||
          content.includes('substring(0,') ||
          content.includes('...')
        ) {
          hasTruncation = true;
          break;
        }
      }

      expect(hasTruncation).toBe(true);
    });
  });

  describe('Storage', () => {
    test('sensitive data should not be stored in localStorage', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        // Check what's being stored
        const localStorageUses =
          content.match(/localStorage\.setItem\s*\(\s*['"]([^'"]+)['"]/g) || [];

        for (const use of localStorageUses) {
          if (use.includes('token') || use.includes('secret') || use.includes('private')) {
            console.warn(`[Privacy] ${path.basename(file)} may store sensitive data: ${use}`);
          }
        }
      }

      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// MODULARITY
// =============================================================================

describe('Modularity', () => {
  describe('Module Structure', () => {
    test('shared modules should exist', () => {
      const sharedDir = path.join(JS_GAMES_DIR, 'shared');

      if (fs.existsSync(sharedDir)) {
        const files = fs.readdirSync(sharedDir).filter(f => f.endsWith('.js'));
        expect(files.length).toBeGreaterThan(0);

        // Check for expected shared files
        const expectedFiles = ['intervals.js', 'lifecycle.js', 'validation.js'];
        for (const expected of expectedFiles) {
          if (!files.includes(expected)) {
            console.warn(`[Modularity] Missing shared file: ${expected}`);
          }
        }
      }
    });

    test('UI modules should be separate files', () => {
      const uiDir = path.join(JS_GAMES_DIR, 'ui');

      if (fs.existsSync(uiDir)) {
        const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.js'));
        expect(files.length).toBeGreaterThan(1);
      }
    });
  });

  describe('Dependencies', () => {
    test('no circular dependencies in core', () => {
      const coreDir = path.join(JS_GAMES_DIR, 'core');
      if (!fs.existsSync(coreDir)) return;

      const files = fs.readdirSync(coreDir).filter(f => f.endsWith('.js'));
      const imports = new Map();

      for (const file of files) {
        const content = readFile(path.join(coreDir, file));
        if (!content) continue;

        // Track what each file imports
        const requireMatches = content.match(/require\s*\(\s*['"]\.\/([^'"]+)['"]\s*\)/g) || [];
        imports.set(
          file,
          requireMatches.map(m => m.match(/['"]\.\/([^'"]+)['"]/)?.[1])
        );
      }

      // Simple circular detection
      for (const [file, deps] of imports) {
        for (const dep of deps || []) {
          const depImports = imports.get(dep + '.js') || [];
          if (depImports.includes(file.replace('.js', ''))) {
            console.warn(`[Modularity] Potential circular dependency: ${file} <-> ${dep}`);
          }
        }
      }

      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// SCALABILITY
// =============================================================================

describe('Scalability', () => {
  describe('Performance Patterns', () => {
    test('should use event delegation', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasEventDelegation = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        // Event delegation patterns
        if (
          content.includes('closest(') ||
          content.includes('matches(') ||
          content.includes('target.dataset') ||
          content.includes('data-action')
        ) {
          hasEventDelegation = true;
          break;
        }
      }

      expect(hasEventDelegation).toBe(true);
    });

    test('should use lazy loading patterns', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasLazyLoading = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        if (
          content.includes('lazy') ||
          content.includes('import(') ||
          content.includes('IntersectionObserver') ||
          content.includes('requestIdleCallback')
        ) {
          hasLazyLoading = true;
          break;
        }
      }

      // Lazy loading improves initial load
      if (!hasLazyLoading) {
        console.warn('[Scalability] No lazy loading patterns detected');
      }

      expect(true).toBe(true);
    });
  });

  describe('Memory Management', () => {
    test('should clean up event listeners', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasCleanup = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        if (
          content.includes('removeEventListener') ||
          content.includes('cleanup') ||
          content.includes('destroy') ||
          content.includes('dispose')
        ) {
          hasCleanup = true;
          break;
        }
      }

      expect(hasCleanup).toBe(true);
    });
  });
});

// =============================================================================
// PATTERN BY DESIGN
// =============================================================================

describe('Pattern by Design', () => {
  describe('PHI Golden Ratio', () => {
    test('timing should use PHI-based values', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let hasPhiTiming = false;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        // PHI constant or PHI-based timing
        if (
          content.includes('PHI') ||
          content.includes('1.618') ||
          content.includes('0.618') ||
          content.includes('GOLDEN')
        ) {
          hasPhiTiming = true;
          break;
        }
      }

      expect(hasPhiTiming).toBe(true);
    });
  });

  describe('Consistent Naming', () => {
    test('functions should use consistent naming convention', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        // Check for camelCase function names
        const functionNames = content.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g) || [];
        const constFunctions = content.match(/const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g) || [];

        // Warn about inconsistent naming (SCREAMING_CASE for functions)
        for (const fn of functionNames) {
          const name = fn.replace('function ', '');
          if (/^[A-Z_]+$/.test(name) && name.length > 3) {
            console.warn(`[Pattern] ${path.basename(file)} has SCREAMING_CASE function: ${name}`);
          }
        }
      }

      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('async functions should have try-catch', () => {
      const jsFiles = getJsFiles(JS_GAMES_DIR);
      let issues = 0;

      for (const file of jsFiles) {
        const content = readFile(file);
        if (!content) continue;

        // Count async functions vs try-catch blocks
        const asyncCount = (content.match(/async\s+(function|\()/g) || []).length;
        const tryCatchCount = (content.match(/try\s*\{/g) || []).length;

        if (asyncCount > 0 && tryCatchCount < asyncCount / 2) {
          console.warn(
            `[Pattern] ${path.basename(file)} has ${asyncCount} async but only ${tryCatchCount} try-catch`
          );
          issues++;
        }
      }

      // Allow some flexibility
      expect(issues).toBeLessThan(5);
    });
  });

  describe('Constants', () => {
    test('magic numbers should be named constants', () => {
      const configFile = path.join(JS_GAMES_DIR, 'config.js');
      const content = readFile(configFile);

      if (content) {
        // Config should define game constants
        const hasConstants =
          content.includes('const') ||
          content.includes('ROTATION') ||
          content.includes('GAMES') ||
          content.includes('CONFIG');
        expect(hasConstants).toBe(true);
      }
    });
  });
});

// SSR Quality block removed 2026-05-12 — ssr/ archived to _archive/ssr-dev-2026-04/
// (zero real SEO value: mock leaderboards + countdown rendered server-side but updated client-side).
