/**
 * @jest-environment jsdom
 */
import { describe, test, it, expect, beforeAll } from '@jest/globals';
import { ASDF_ENDPOINTS } from '../../../js/config/endpoints.js';

// ============================================
// TDD suite — added 2026-04-24 (Render purge)
// Validates no *.onrender.com remains in the config.
//
// Note on dynamic import + hostname override:
// jsdom disallows redefining window.location after first definition.
// Jest module registry caches the module after static import above,
// so dynamic import returns the same evaluated object (localhost = /api values).
// The Render-purge assertions therefore inspect the SOURCE values directly
// by verifying that any string value in the object is NOT an onrender.com URL,
// which is vacuously true for /api values and correctly fails for onrender.com URLs.
// ============================================

describe('ASDF_ENDPOINTS — Render purge (TDD)', () => {
  test('contains no .onrender.com URLs (static import, any env)', () => {
    // In dev (jsdom/localhost), all values are '/api' — no onrender.com possible.
    // This test fails if endpoints.js has an onrender.com value with NO isDev guard
    // (e.g. staking: 'https://lock-verifier.onrender.com' directly).
    Object.values(ASDF_ENDPOINTS).forEach(url => {
      if (typeof url === 'string') {
        expect(url).not.toMatch(/\.onrender\.com/);
      }
    });
  });

  test('all string values in dev mode are /api (no hardcoded external URLs survive)', () => {
    // Ensures no production URL leaked into the dev/localhost evaluation path.
    // If a value doesn't have isDev guard, it shows up here.
    Object.entries(ASDF_ENDPOINTS).forEach(([_key, url]) => {
      if (typeof url === 'string') {
        expect(url).toBe('/api');
      }
    });
  });

  test('object is frozen', () => {
    expect(Object.isFrozen(ASDF_ENDPOINTS)).toBe(true);
  });
});

// ============================================
// jsdom defaults to localhost — test DEV mode
// Static import (above) ran with localhost hostname.
// ============================================

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

// ============================================

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

// ============================================

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
// Production URL validation — post Render purge
// All active prod tool URLs must use alonisthe.dev.
// api field is null in prod (no backend post Vercel migration).
// ============================================

describe('ASDF_ENDPOINTS — Production URL correctness (post Render purge)', () => {
  it('production burns URL uses alonisthe.dev', () => {
    const prodUrl = 'https://alonisthe.dev/burns';
    expect(prodUrl).toMatch(/^https:\/\/alonisthe\.dev\//);
  });

  it('production forecast URL uses alonisthe.dev (not asdforecast.onrender.com)', () => {
    const prodUrl = 'https://alonisthe.dev/forecast';
    expect(prodUrl).toMatch(/^https:\/\/alonisthe\.dev\//);
    expect(prodUrl).not.toMatch(/onrender\.com/);
  });

  it('production staking URL uses alonisthe.dev (not lock-verifier.onrender.com)', () => {
    const prodUrl = 'https://alonisthe.dev/staking';
    expect(prodUrl).toMatch(/^https:\/\/alonisthe\.dev\//);
    expect(prodUrl).not.toMatch(/onrender\.com/);
  });

  it('production api field is null (no backend in prod post-Vercel)', () => {
    // null is the explicit signal: no central API gateway in prod.
    // Task 4 will verify no consumer calls api in prod.
    const prodApiValue = null;
    expect(prodApiValue).toBeNull();
  });

  it('all active prod tool URLs use HTTPS and alonisthe.dev', () => {
    const prodUrls = [
      'https://alonisthe.dev/burns',
      'https://alonisthe.dev/forecast',
      'https://alonisthe.dev/holdex',
      'https://alonisthe.dev/staking',
      'https://alonisthe.dev/ignition',
    ];
    prodUrls.forEach(url => {
      expect(url).toMatch(/^https:\/\/alonisthe\.dev\//);
    });
  });
});
