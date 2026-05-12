/**
 * Config Module Unit Tests
 * Tests the REAL source at js/core/config.js
 *
 * Covers: getConfig, setConfig, resetConfig, getAllConfig, mergeConfig,
 * loadConfig, isFeatureEnabled, getTiming, getPhi, DEFAULTS
 */

import {
  getConfig,
  setConfig,
  resetConfig,
  getAllConfig,
  mergeConfig,
  loadConfig,
  isFeatureEnabled,
  getTiming,
  getPhi,
  DEFAULTS,
} from '../../../js/core/config.js';

beforeEach(() => {
  resetConfig();
});

// ============================================
// DEFAULTS
// ============================================

describe('DEFAULTS', () => {
  it('has all expected top-level sections', () => {
    expect(DEFAULTS).toHaveProperty('api');
    expect(DEFAULTS).toHaveProperty('audio');
    expect(DEFAULTS).toHaveProperty('game');
    expect(DEFAULTS).toHaveProperty('ui');
    expect(DEFAULTS).toHaveProperty('solana');
    expect(DEFAULTS).toHaveProperty('timing');
    expect(DEFAULTS).toHaveProperty('debug');
    expect(DEFAULTS).toHaveProperty('features');
    expect(DEFAULTS).toHaveProperty('phi');
  });

  it('api.timeout defaults to 30000', () => {
    expect(DEFAULTS.api.timeout).toBe(30000);
  });

  it('phi.value is the golden ratio', () => {
    expect(DEFAULTS.phi.value).toBeCloseTo(1.618033988749895, 10);
  });
});

// ============================================
// getConfig
// ============================================

describe('getConfig', () => {
  it('returns full config when path is empty/null', () => {
    const full = getConfig(null);
    expect(full).toHaveProperty('api');
    expect(full).toHaveProperty('phi');
  });

  it('resolves dot-notation path (api.timeout)', () => {
    expect(getConfig('api.timeout')).toBe(30000);
  });

  it('resolves single-level path', () => {
    const api = getConfig('api');
    expect(api).toHaveProperty('timeout', 30000);
    expect(api).toHaveProperty('retries', 3);
  });

  it('returns defaultValue for missing path', () => {
    expect(getConfig('api.nonexistent', 'fallback')).toBe('fallback');
  });

  it('returns undefined for missing path with no default', () => {
    expect(getConfig('api.nonexistent')).toBeUndefined();
  });

  it('handles null in the chain gracefully', () => {
    setConfig('test', null);
    expect(getConfig('test.deep.path', 'safe')).toBe('safe');
  });

  it('resolves deeply nested paths', () => {
    expect(getConfig('solana.network')).toBe('mainnet-beta');
  });
});

// ============================================
// setConfig
// ============================================

describe('setConfig', () => {
  it('sets a simple nested path', () => {
    setConfig('api.timeout', 5000);
    expect(getConfig('api.timeout')).toBe(5000);
  });

  it('creates intermediary objects for deep paths', () => {
    setConfig('custom.deep.nested.value', 42);
    expect(getConfig('custom.deep.nested.value')).toBe(42);
  });

  it('does not affect sibling keys', () => {
    setConfig('api.timeout', 5000);
    expect(getConfig('api.retries')).toBe(3);
  });

  it('no-ops for empty path', () => {
    setConfig('', 'value');
    // Should not throw and config should be unchanged
    expect(getConfig('api.timeout')).toBe(30000);
  });

  it('no-ops for null path', () => {
    setConfig(null, 'value');
    expect(getConfig('api.timeout')).toBe(30000);
  });

  it('sets boolean values', () => {
    setConfig('debug.enabled', true);
    expect(getConfig('debug.enabled')).toBe(true);
  });
});

// ============================================
// resetConfig
// ============================================

describe('resetConfig', () => {
  it('restores default after setConfig changes', () => {
    setConfig('api.timeout', 1);
    resetConfig();
    expect(getConfig('api.timeout')).toBe(30000);
  });

  it('removes custom keys added via setConfig', () => {
    setConfig('custom.key', 'value');
    resetConfig();
    expect(getConfig('custom.key')).toBeUndefined();
  });

  it('is safe to call multiple times', () => {
    resetConfig();
    resetConfig();
    expect(getConfig('api.timeout')).toBe(30000);
  });
});

// ============================================
// getAllConfig
// ============================================

describe('getAllConfig', () => {
  it('returns all expected sections', () => {
    const all = getAllConfig();
    expect(all).toHaveProperty('api');
    expect(all).toHaveProperty('audio');
    expect(all).toHaveProperty('phi');
  });

  it('returns a deep clone — mutation does not affect live config', () => {
    const all = getAllConfig();
    all.api.timeout = 1;
    expect(getConfig('api.timeout')).toBe(30000);
  });

  it('reflects setConfig changes', () => {
    setConfig('api.timeout', 9999);
    expect(getAllConfig().api.timeout).toBe(9999);
  });
});

// ============================================
// mergeConfig
// ============================================

describe('mergeConfig', () => {
  it('deep merges without overwriting siblings', () => {
    mergeConfig({ api: { timeout: 5000 } });
    expect(getConfig('api.timeout')).toBe(5000);
    expect(getConfig('api.retries')).toBe(3);
  });

  it('adds new top-level keys', () => {
    mergeConfig({ custom: { key: 'value' } });
    expect(getConfig('custom.key')).toBe('value');
  });

  it('arrays replace (not concat)', () => {
    setConfig('testArray', [1, 2, 3]);
    mergeConfig({ testArray: [4, 5] });
    expect(getConfig('testArray')).toEqual([4, 5]);
  });

  it('empty object merge is a no-op', () => {
    const before = getAllConfig();
    mergeConfig({});
    expect(getAllConfig()).toEqual(before);
  });
});

// ============================================
// loadConfig
// ============================================

describe('loadConfig', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('fetches and merges config from URL', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ api: { timeout: 7777 } }),
    });

    await loadConfig('/config/test.json');
    expect(global.fetch).toHaveBeenCalledWith('/config/test.json');
    expect(getConfig('api.timeout')).toBe(7777);
  });

  it('returns current config on HTTP error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await loadConfig('/missing.json');
    expect(result).toHaveProperty('api');
    expect(getConfig('api.timeout')).toBe(30000);
  });

  it('returns current config on network error', async () => {
    global.fetch.mockRejectedValue(new Error('Network failed'));

    const result = await loadConfig('/broken.json');
    expect(result).toHaveProperty('api');
    expect(getConfig('api.timeout')).toBe(30000);
  });
});

// ============================================
// isFeatureEnabled
// ============================================

describe('isFeatureEnabled', () => {
  it('returns true for default-on features (audioFeedback)', () => {
    expect(isFeatureEnabled('audioFeedback')).toBe(true);
  });

  it('returns false for default-off features (offlineMode)', () => {
    expect(isFeatureEnabled('offlineMode')).toBe(false);
  });

  it('returns false for unknown features', () => {
    expect(isFeatureEnabled('nonexistent')).toBe(false);
  });

  it('reflects setConfig changes', () => {
    setConfig('features.offlineMode', true);
    expect(isFeatureEnabled('offlineMode')).toBe(true);
  });
});

// ============================================
// getTiming
// ============================================

describe('getTiming', () => {
  it('returns correct values for named timings', () => {
    expect(getTiming('fast')).toBe(300);
    expect(getTiming('medium')).toBe(500);
    expect(getTiming('slow')).toBe(800);
    expect(getTiming('tick')).toBe(100);
  });

  it('falls back to medium (500) for unknown timing', () => {
    expect(getTiming('nonexistent')).toBe(500);
  });

  it('reflects setConfig overrides', () => {
    setConfig('timing.fast', 999);
    expect(getTiming('fast')).toBe(999);
  });
});

// ============================================
// getPhi
// ============================================

describe('getPhi', () => {
  it('returns PHI for "value"', () => {
    expect(getPhi('value')).toBeCloseTo(1.618033988749895, 10);
  });

  it('returns inverse for "inverse"', () => {
    expect(getPhi('inverse')).toBeCloseTo(0.6180339887498949, 10);
  });

  it('returns squared for "squared"', () => {
    expect(getPhi('squared')).toBeCloseTo(2.618033988749895, 10);
  });

  it('defaults to PHI with no argument', () => {
    expect(getPhi()).toBeCloseTo(1.618033988749895, 10);
  });

  it('defaults to PHI for unknown type', () => {
    expect(getPhi('nonexistent')).toBeCloseTo(1.618033988749895, 10);
  });
});
