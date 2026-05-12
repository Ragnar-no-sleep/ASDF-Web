/**
 * PageController Unit Tests
 * Tests the REAL source at js/core/PageController.js
 *
 * Covers: constructor, cacheElements, fetch+cache, loadData,
 * on/onDelegate, setText/setHTML, destroy, handleError, getState, onStateChange
 */

import { PageController } from '../../../js/core/PageController.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="stats"></div><div id="table"></div>';
  global.fetch = jest.fn();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

// ============================================
// constructor
// ============================================

describe('constructor', () => {
  it('sets routes, selectors, and defaults', () => {
    const ctrl = new PageController({ stats: '/api/stats' }, { card: '#stats' });
    expect(ctrl.routes).toEqual({ stats: '/api/stats' });
    expect(ctrl.selectors).toEqual({ card: '#stats' });
    expect(ctrl.cacheTtl).toBe(600000);
    expect(ctrl.debug).toBe(false);
    expect(ctrl.listeners).toEqual([]);
  });

  it('respects options overrides', () => {
    const ctrl = new PageController({}, {}, { cache: 5000, debug: true });
    expect(ctrl.cacheTtl).toBe(5000);
    expect(ctrl.debug).toBe(true);
  });

  it('creates a Store instance with default state', () => {
    const ctrl = new PageController();
    const state = ctrl.getState();
    expect(state).toHaveProperty('isLoading', false);
    expect(state).toHaveProperty('error', null);
    expect(state).toHaveProperty('data');
  });
});

// ============================================
// cacheElements
// ============================================

describe('cacheElements', () => {
  it('caches elements from selectors', () => {
    const ctrl = new PageController({}, { stats: '#stats', table: '#table' });
    ctrl.cacheElements();
    expect(ctrl.elements.stats).toBe(document.getElementById('stats'));
    expect(ctrl.elements.table).toBe(document.getElementById('table'));
  });

  it('warns on missing selectors', () => {
    const ctrl = new PageController({}, { missing: '#nonexistent' });
    ctrl.cacheElements();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('#nonexistent'));
    expect(ctrl.elements.missing).toBeNull();
  });
});

// ============================================
// getCached / setCached
// ============================================

describe('getCached / setCached', () => {
  it('round-trips data through cache', () => {
    const ctrl = new PageController();
    ctrl.setCached('key', { data: 42 });
    expect(ctrl.getCached('key')).toEqual({ data: 42 });
  });

  it('returns null for missing keys', () => {
    const ctrl = new PageController();
    expect(ctrl.getCached('missing')).toBeNull();
  });

  it('returns null for expired entries', () => {
    const ctrl = new PageController({}, {}, { cache: 100 });
    ctrl.setCached('key', 'value');

    // Fast-forward time
    const original = Date.now;
    Date.now = () => original() + 200;
    expect(ctrl.getCached('key')).toBeNull();
    Date.now = original;
  });
});

// ============================================
// fetch
// ============================================

describe('fetch', () => {
  it('throws for unknown route key', async () => {
    const ctrl = new PageController({ stats: '/api/stats' });
    await expect(ctrl.fetch('missing')).rejects.toThrow("Route 'missing' not found");
  });

  it('returns cached data if present', async () => {
    const ctrl = new PageController({ stats: '/api/stats' });
    ctrl.setCached('stats', { cached: true });
    const result = await ctrl.fetch('stats');
    expect(result).toEqual({ cached: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls global fetch and caches result', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ fresh: true }),
    });

    const ctrl = new PageController({ stats: '/api/stats' });
    const result = await ctrl.fetch('stats');
    expect(result).toEqual({ fresh: true });
    expect(global.fetch).toHaveBeenCalledWith('/api/stats', expect.any(Object));
    expect(ctrl.getCached('stats')).toEqual({ fresh: true });
  });

  it('returns null on fetch error', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));
    const ctrl = new PageController({ stats: '/api/stats' });
    const result = await ctrl.fetch('stats');
    expect(result).toBeNull();
  });

  it('returns null on non-OK response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });
    const ctrl = new PageController({ stats: '/api/stats' });
    const result = await ctrl.fetch('stats');
    expect(result).toBeNull();
  });
});

// ============================================
// on (event listener tracking)
// ============================================

describe('on', () => {
  it('adds event listener and tracks it', () => {
    const ctrl = new PageController();
    const el = document.getElementById('stats');
    const handler = jest.fn();
    const addSpy = jest.spyOn(el, 'addEventListener');

    ctrl.on(el, 'click', handler);
    expect(addSpy).toHaveBeenCalledWith('click', handler);
    expect(ctrl.listeners).toHaveLength(1);
  });

  it('no-ops for null element', () => {
    const ctrl = new PageController();
    ctrl.on(null, 'click', jest.fn());
    expect(ctrl.listeners).toHaveLength(0);
  });
});

// ============================================
// setText / setHTML
// ============================================

describe('setText', () => {
  it('sets textContent on cached element', () => {
    const ctrl = new PageController({}, { stats: '#stats' });
    ctrl.cacheElements();
    ctrl.setText('stats', 'Hello');
    expect(document.getElementById('stats').textContent).toBe('Hello');
  });

  it('no-ops for missing element key', () => {
    const ctrl = new PageController();
    ctrl.cacheElements();
    expect(() => ctrl.setText('missing', 'value')).not.toThrow();
  });
});

describe('setHTML', () => {
  it('sets innerHTML on cached element', () => {
    const ctrl = new PageController({}, { stats: '#stats' });
    ctrl.cacheElements();
    ctrl.setHTML('stats', '<b>Bold</b>');
    expect(document.getElementById('stats').innerHTML).toBe('<b>Bold</b>');
  });
});

// ============================================
// destroy
// ============================================

describe('destroy', () => {
  it('removes all tracked event listeners', () => {
    const ctrl = new PageController();
    const el = document.getElementById('stats');
    const handler = jest.fn();
    const removeSpy = jest.spyOn(el, 'removeEventListener');

    ctrl.on(el, 'click', handler);
    ctrl.destroy();

    expect(removeSpy).toHaveBeenCalledWith('click', handler);
    expect(ctrl.listeners).toEqual([]);
  });

  it('clears the cache', () => {
    const ctrl = new PageController();
    ctrl.setCached('key', 'value');
    ctrl.destroy();
    expect(ctrl.getCached('key')).toBeNull();
  });
});

// ============================================
// handleError
// ============================================

describe('handleError', () => {
  it('logs to console.error and dispatches to store', () => {
    const ctrl = new PageController();
    ctrl.handleError(new Error('test failure'), 'init');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('test failure'));
    expect(ctrl.getState().error).toBeTruthy();
    expect(ctrl.getState().error.context).toBe('init');
  });

  it('includes detail in message', () => {
    const ctrl = new PageController();
    ctrl.handleError(new Error('oops'), 'fetch', 'stats');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('fetch:stats'));
  });
});

// ============================================
// onStateChange
// ============================================

describe('onStateChange', () => {
  it('calls render when not loading and data exists', () => {
    const ctrl = new PageController();
    ctrl.render = jest.fn();
    ctrl.onStateChange({ isLoading: false, data: { stats: {} } });
    expect(ctrl.render).toHaveBeenCalledTimes(1);
  });

  it('does not call render when loading', () => {
    const ctrl = new PageController();
    ctrl.render = jest.fn();
    ctrl.onStateChange({ isLoading: true, data: null });
    expect(ctrl.render).not.toHaveBeenCalled();
  });
});

// ============================================
// getState
// ============================================

describe('getState', () => {
  it('returns store state', () => {
    const ctrl = new PageController();
    const state = ctrl.getState();
    expect(state).toHaveProperty('isLoading');
    expect(state).toHaveProperty('error');
    expect(state).toHaveProperty('data');
  });
});
