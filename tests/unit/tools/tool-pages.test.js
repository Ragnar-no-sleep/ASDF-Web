/**
 * Tool Page Controller Contract Tests
 *
 * Verifies structural contracts for all 5 tool pages:
 * - Uses ASDF_ENDPOINTS (not hardcoded URLs)
 * - Has init() or DOMContentLoaded listener
 * - Uses fetchWithRetry or fetch (not raw XMLHttpRequest)
 * - Error handling exists (try-catch around API calls)
 * - PageLifecycle imported for timer cleanup
 *
 * Pattern: static analysis (read source, verify contracts)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.resolve(__dirname, '../../../js');

const TOOL_PAGES = [
  { name: 'burns', file: 'burns.js', endpoint: 'burns' },
  { name: 'forecast', file: 'forecast.js', endpoint: 'forecast' },
  { name: 'holdex', file: 'holdex.js', endpoint: 'holdex' },
  { name: 'staking', file: 'staking.js', endpoint: 'staking' },
  { name: 'ignition', file: 'ignition.js', endpoint: 'ignition' },
];

describe('Tool Page Controllers', () => {
  const sources = {};

  beforeAll(() => {
    for (const tool of TOOL_PAGES) {
      const filePath = path.join(TOOLS_DIR, tool.file);
      sources[tool.name] = fs.readFileSync(filePath, 'utf8');
    }
  });

  describe.each(TOOL_PAGES)('$name.js', tool => {
    it('should import ASDF_ENDPOINTS from config', () => {
      expect(sources[tool.name]).toMatch(
        /import\s*\{[^}]*ASDF_ENDPOINTS[^}]*\}\s*from\s*['"]\.\/config\/endpoints/
      );
    });

    it(`should use ASDF_ENDPOINTS.${tool.endpoint} as API base`, () => {
      expect(sources[tool.name]).toContain(`ASDF_ENDPOINTS.${tool.endpoint}`);
    });

    it('should not hardcode API URLs', () => {
      // Allow alonisthe.dev only in comments, not in fetch calls
      const lines = sources[tool.name].split('\n');
      const codeLines = lines.filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//'));
      const code = codeLines.join('\n');
      expect(code).not.toMatch(/fetch\(['"`]https?:\/\/[^$]/);
    });

    it('should have init function or DOMContentLoaded listener', () => {
      const src = sources[tool.name];
      const hasInit = /function\s+init\s*\(/.test(src) || /async\s+function\s+init\s*\(/.test(src);
      const hasDCL = /DOMContentLoaded/.test(src);
      expect(hasInit || hasDCL).toBe(true);
    });

    it('should import PageLifecycle for timer cleanup', () => {
      expect(sources[tool.name]).toMatch(/import\s*\{[^}]*PageLifecycle[^}]*\}/);
    });

    it('should not use XMLHttpRequest', () => {
      const src = sources[tool.name];
      expect(src).not.toMatch(/new\s+XMLHttpRequest/);
    });

    it('should have try-catch error handling', () => {
      const src = sources[tool.name];
      const tryCatchBlocks = src.match(/try\s*\{/g) || [];
      // Every tool page should have at least 1 try-catch
      expect(tryCatchBlocks.length).toBeGreaterThanOrEqual(1);
    });

    it('should not use alert() for error display', () => {
      const src = sources[tool.name];
      const lines = src.split('\n');
      const codeLines = lines.filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
      const code = codeLines.join('\n');
      expect(code).not.toMatch(/\balert\s*\(/);
    });

    it('should use AudioFeedback for interaction sounds', () => {
      expect(sources[tool.name]).toMatch(/import\s*\{[^}]*AudioFeedback[^}]*\}/);
    });
  });
});

describe('Tool Page Endpoint Consistency', () => {
  it('all tool pages should reference different endpoints', () => {
    const endpoints = new Set();
    for (const tool of TOOL_PAGES) {
      endpoints.add(tool.endpoint);
    }
    expect(endpoints.size).toBe(TOOL_PAGES.length);
  });

  it('endpoints.js should define all required tool endpoints', () => {
    const endpointsFile = fs.readFileSync(path.join(TOOLS_DIR, 'config', 'endpoints.js'), 'utf8');
    for (const tool of TOOL_PAGES) {
      expect(endpointsFile).toContain(tool.endpoint);
    }
  });
});
