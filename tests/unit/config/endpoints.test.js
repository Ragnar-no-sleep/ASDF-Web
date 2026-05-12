/**
 * @jest-environment jsdom
 */
import { describe, test, it, expect } from '@jest/globals';
import { ASDF_ENDPOINTS } from '../../../js/config/endpoints.js';

// ============================================
// TDD suite — added 2026-04-24 (Render purge)
//
// jsdom default hostname is localhost, so static import evaluates endpoints.js
// in dev mode where every tool value is '/api'. We can't easily test the prod
// branch from a jsdom test (window.location is not redefinable post-eval), so
// our structural guards target what we CAN inspect:
//
// - No '.onrender.com' substring anywhere — fails if a value is hardcoded without isDev guard
// - All string values are '/api' in dev — fails if an isDev guard is missing
// - Object is frozen — fails if Object.freeze was dropped or replaced
// ============================================

describe('ASDF_ENDPOINTS — Render purge (TDD)', () => {
  test('contains no .onrender.com URLs (any env)', () => {
    Object.values(ASDF_ENDPOINTS).forEach(url => {
      if (typeof url === 'string') {
        expect(url).not.toMatch(/\.onrender\.com/);
      }
    });
  });

  test('all string values in dev mode are /api (no hardcoded external URLs survive)', () => {
    Object.entries(ASDF_ENDPOINTS).forEach(([_key, url]) => {
      if (typeof url === 'string') {
        expect(url).toBe('/api');
      }
    });
  });
});

describe('ASDF_ENDPOINTS — Development (jsdom/localhost)', () => {
  it('all tool endpoints point to /api proxy in dev', () => {
    expect(ASDF_ENDPOINTS.burns).toBe('/api');
    expect(ASDF_ENDPOINTS.holdex).toBe('/api');
    expect(ASDF_ENDPOINTS.ignition).toBe('/api');
    expect(ASDF_ENDPOINTS.forecast).toBe('/api');
    expect(ASDF_ENDPOINTS.staking).toBe('/api');
  });

  it('api field is /api in dev', () => {
    expect(ASDF_ENDPOINTS.api).toBe('/api');
  });
});

describe('ASDF_ENDPOINTS — Immutability', () => {
  it('is frozen (Object.freeze)', () => {
    expect(Object.isFrozen(ASDF_ENDPOINTS)).toBe(true);
  });

  it('silently ignores property assignment', () => {
    const original = ASDF_ENDPOINTS.burns;
    try {
      ASDF_ENDPOINTS.burns = 'https://evil.com';
    } catch {
      // TypeError in strict mode — expected
    }
    expect(ASDF_ENDPOINTS.burns).toBe(original);
  });

  it('silently ignores property addition', () => {
    try {
      ASDF_ENDPOINTS.newProp = 'injected';
    } catch {
      // TypeError in strict mode — expected
    }
    expect(ASDF_ENDPOINTS.newProp).toBeUndefined();
  });
});

describe('ASDF_ENDPOINTS — Structure', () => {
  it('has exactly 6 endpoint keys', () => {
    expect(Object.keys(ASDF_ENDPOINTS)).toHaveLength(6);
  });

  it('contains all required tool keys', () => {
    const required = ['burns', 'forecast', 'holdex', 'staking', 'ignition', 'api'];
    required.forEach(key => {
      expect(ASDF_ENDPOINTS).toHaveProperty(key);
    });
  });

  it('is also available on window.ASDF_ENDPOINTS', () => {
    expect(window.ASDF_ENDPOINTS).toBe(ASDF_ENDPOINTS);
  });
});

// ============================================
// Production URL validation — reads the actual source file (not literals).
// This is the only way to inspect the prod branch from jsdom: parse the source
// and assert on what's written. A literal-against-literal test cannot regress.
// ============================================

describe('ASDF_ENDPOINTS — Production URL correctness (source-level)', () => {
  it('endpoints.js source contains no .onrender.com after Render purge', () => {
    // Read the source file via Node fs — bypasses jsdom module cache and lets us
    // inspect both prod and dev branches in a single string.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../../js/config/endpoints.js'), 'utf8');
    // Strip comments to avoid matching documentation
    const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(/\.onrender\.com/);
  });

  it('endpoints.js source uses alonisthe.dev for all 5 tools in prod branch', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../../js/config/endpoints.js'), 'utf8');
    ['burns', 'forecast', 'holdex', 'staking', 'ignition'].forEach(tool => {
      expect(src).toMatch(new RegExp(`'https://alonisthe\\.dev/${tool}'`));
    });
  });
});
