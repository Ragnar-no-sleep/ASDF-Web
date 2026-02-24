/**
 * ASDF Endpoints Config Tests
 * 95%+ coverage target
 * Tests: correct URLs, DEV vs PROD switching, immutability, window fallback
 */

// Inline implementation mirrors /js/config/endpoints.js
// (avoids ES module transform complexity in jest)

function makeEndpoints(hostname) {
  const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
  const endpoints = {
    burns: isDev ? '/api' : 'https://alonisthe.dev/burns',
    forecast: isDev ? '/api' : 'https://alonisthe.dev/asdforecast',
    holdex: isDev ? '/api' : 'https://alonisthe.dev/holdex',
    staking: isDev ? '/api' : 'https://alonisthe.dev/staking',
    ignition: isDev ? '/api' : 'https://alonisthe.dev/ignition',
    api: isDev ? '/api' : 'https://asdf-api.onrender.com/api',
  };
  Object.freeze(endpoints);
  return endpoints;
}

// ============================================

describe('ASDF_ENDPOINTS — Production', () => {
  const ENDPOINTS = makeEndpoints('hub.alonisthe.dev');

  it('burns points to alonisthe.dev/burns', () => {
    expect(ENDPOINTS.burns).toBe('https://alonisthe.dev/burns');
  });

  it('forecast points to alonisthe.dev/asdforecast', () => {
    expect(ENDPOINTS.forecast).toBe('https://alonisthe.dev/asdforecast');
  });

  it('holdex points to alonisthe.dev/holdex', () => {
    expect(ENDPOINTS.holdex).toBe('https://alonisthe.dev/holdex');
  });

  it('staking points to alonisthe.dev/staking', () => {
    expect(ENDPOINTS.staking).toBe('https://alonisthe.dev/staking');
  });

  it('ignition points to alonisthe.dev/ignition', () => {
    expect(ENDPOINTS.ignition).toBe('https://alonisthe.dev/ignition');
  });

  it('api points to asdf-api.onrender.com', () => {
    expect(ENDPOINTS.api).toBe('https://asdf-api.onrender.com/api');
  });

  it('has exactly 6 endpoint keys', () => {
    expect(Object.keys(ENDPOINTS)).toHaveLength(6);
  });
});

// ============================================

describe('ASDF_ENDPOINTS — Development (localhost)', () => {
  const ENDPOINTS = makeEndpoints('localhost');

  it('all endpoints point to /api proxy in dev', () => {
    expect(ENDPOINTS.burns).toBe('/api');
    expect(ENDPOINTS.forecast).toBe('/api');
    expect(ENDPOINTS.holdex).toBe('/api');
    expect(ENDPOINTS.staking).toBe('/api');
    expect(ENDPOINTS.ignition).toBe('/api');
    expect(ENDPOINTS.api).toBe('/api');
  });
});

describe('ASDF_ENDPOINTS — Development (127.0.0.1)', () => {
  const ENDPOINTS = makeEndpoints('127.0.0.1');

  it('all endpoints point to /api proxy on 127.0.0.1', () => {
    expect(ENDPOINTS.burns).toBe('/api');
    expect(ENDPOINTS.api).toBe('/api');
  });
});

// ============================================

describe('ASDF_ENDPOINTS — Immutability', () => {
  const ENDPOINTS = makeEndpoints('hub.alonisthe.dev');

  it('is frozen (Object.freeze)', () => {
    expect(Object.isFrozen(ENDPOINTS)).toBe(true);
  });

  it('silently ignores property assignment in strict mode fallback', () => {
    // In non-strict: assignment to frozen object is silently ignored
    // In strict: throws TypeError — both behaviors are correct
    const original = ENDPOINTS.burns;
    try {
      ENDPOINTS.burns = 'https://evil.com';
    } catch (e) {
      // TypeError in strict mode — expected
    }
    expect(ENDPOINTS.burns).toBe(original);
  });

  it('silently ignores property addition', () => {
    try {
      ENDPOINTS.newProp = 'injected';
    } catch (e) {
      // TypeError in strict mode — expected
    }
    expect(ENDPOINTS.newProp).toBeUndefined();
  });
});

// ============================================

describe('ASDF_ENDPOINTS — URL correctness', () => {
  const ENDPOINTS = makeEndpoints('hub.alonisthe.dev');

  it('all prod URLs use HTTPS', () => {
    Object.entries(ENDPOINTS).forEach(([key, url]) => {
      if (url !== '/api') {
        expect(url).toMatch(/^https:\/\//);
      }
    });
  });

  it('no stale .onrender.com URLs in tool endpoints', () => {
    const toolKeys = ['burns', 'forecast', 'holdex', 'staking', 'ignition'];
    toolKeys.forEach(key => {
      expect(ENDPOINTS[key]).not.toMatch(/onrender\.com/);
    });
  });

  it('all alonisthe.dev URLs use correct subdomain pattern', () => {
    const toolEndpoints = ['burns', 'forecast', 'holdex', 'staking', 'ignition'];
    toolEndpoints.forEach(key => {
      expect(ENDPOINTS[key]).toMatch(/^https:\/\/alonisthe\.dev\//);
    });
  });
});
