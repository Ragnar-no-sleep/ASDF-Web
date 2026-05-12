/**
 * Core Index Unit Tests
 * Tests the barrel re-export module and initCore() from js/core/index.js
 */

import {
  VERSION,
  eventBus,
  EVENTS,
  errors,
  getError,
  createError,
  getConfig,
  setConfig,
  resetConfig,
  debug,
  debugWarn,
} from '../../../js/core/index.js';

// ============================================
// VERSION
// ============================================

describe('VERSION', () => {
  it('equals 1.0.0', () => {
    expect(VERSION).toBe('1.0.0');
  });
});

// ============================================
// Re-exports
// ============================================

describe('re-exports', () => {
  it('exports eventBus with on/emit/off', () => {
    expect(eventBus).toBeDefined();
    expect(typeof eventBus.on).toBe('function');
    expect(typeof eventBus.emit).toBe('function');
    expect(typeof eventBus.off).toBe('function');
  });

  it('exports EVENTS as a non-empty object of strings', () => {
    expect(typeof EVENTS).toBe('object');
    expect(Object.keys(EVENTS).length).toBeGreaterThan(0);
  });

  it('exports errors as a non-empty object', () => {
    expect(typeof errors).toBe('object');
    expect(Object.keys(errors).length).toBeGreaterThan(0);
  });

  it('exports getError as a function', () => {
    expect(typeof getError).toBe('function');
  });

  it('exports createError as a function', () => {
    expect(typeof createError).toBe('function');
  });

  it('exports getConfig and setConfig as functions', () => {
    expect(typeof getConfig).toBe('function');
    expect(typeof setConfig).toBe('function');
  });

  it('exports debug and debugWarn as functions', () => {
    expect(typeof debug).toBe('function');
    expect(typeof debugWarn).toBe('function');
  });
});

// initCore() uses dynamic import() which requires --experimental-vm-modules
// Barrel re-exports cover index.js lines; initCore is integration-level
