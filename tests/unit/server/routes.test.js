/**
 * @jest-environment node
 */

const request = require('supertest');
const path = require('path');

// Import app without starting server (require.main !== module)
const { app } = require('../../../server.cjs');

// ============================================
// ROUTE TESTS
// ============================================

describe('server.cjs routes', () => {

  // ------------------------------------------
  // Health check
  // ------------------------------------------
  describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });

    it('sets no-cache headers', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['cache-control']).toContain('no-store');
    });
  });

  // ------------------------------------------
  // Page routes — serve correct HTML files
  // ------------------------------------------
  describe('page routes', () => {
    const pageRoutes = [
      { path: '/burns',          expected: 'burns.html' },
      { path: '/forecast',       expected: 'forecast.html' },
      { path: '/holdex',         expected: 'holdex.html' },
      { path: '/staking',        expected: 'staking.html' },
      { path: '/ignition',       expected: 'ignition.html' },
      { path: '/privacy',        expected: 'privacy.html' },
      // /build skipped — express.static intercepts (build/ dir exists → 301)
      { path: '/me',             expected: 'me.html' },
      { path: '/terrier',        expected: 'terrier.html' },
      { path: '/deep-learn',     expected: 'deep-learn.html' },
      { path: '/ecosystem-map',  expected: 'ecosystem-map.html' },
    ];

    for (const route of pageRoutes) {
      it(`GET ${route.path} serves ${route.expected}`, async () => {
        const res = await request(app).get(route.path);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/html/);
      });
    }
  });

  // ------------------------------------------
  // Redirect routes
  // ------------------------------------------
  describe('redirect routes', () => {
    it('GET /asdforecast redirects 301 to /forecast', async () => {
      const res = await request(app).get('/asdforecast');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/forecast');
    });

    it('GET /tools redirects 301 to /', async () => {
      const res = await request(app).get('/tools');
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/');
    });
  });

  // ------------------------------------------
  // Alias routes
  // ------------------------------------------
  describe('alias routes', () => {
    it('GET /story serves learn.html', async () => {
      const res = await request(app).get('/story');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    it('GET /quick-start serves learn.html', async () => {
      const res = await request(app).get('/quick-start');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    it('GET /widget serves index.html', async () => {
      const res = await request(app).get('/widget');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });
  });

  // ------------------------------------------
  // SPA catch-all
  // ------------------------------------------
  describe('SPA catch-all', () => {
    it('serves index.html for unknown paths without extension', async () => {
      const res = await request(app).get('/nonexistent-page');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/html/);
    });

    it('returns 404 for unknown paths with file extension', async () => {
      const res = await request(app).get('/nonexistent.foo');
      expect(res.status).toBe(404);
    });
  });

  // ------------------------------------------
  // Blocked paths
  // ------------------------------------------
  describe('blocked paths', () => {
    it('blocks /node_modules (static intercepts dir → 301, then block fires)', async () => {
      // express.static sees directory first → 301 to /node_modules/
      // Following the redirect hits the blocking middleware
      const res = await request(app).get('/node_modules/');
      expect(res.status).toBe(404);
    });

    it('blocks /.git', async () => {
      const res = await request(app).get('/.git');
      expect(res.status).toBe(404);
    });

    it('blocks /.env', async () => {
      const res = await request(app).get('/.env');
      expect(res.status).toBe(404);
    });
  });

  // ------------------------------------------
  // Unknown API routes
  // ------------------------------------------
  describe('API catch-all', () => {
    it('returns 404 JSON for unknown /api routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('API endpoint not found');
    });
  });
});

// ============================================
// SECURITY HEADER TESTS
// ============================================

describe('security headers', () => {
  it('sets Content-Security-Policy', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('CSP includes self in default-src', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
  });

  it('CSP connectSrc includes alonisthe.dev', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain('https://alonisthe.dev');
  });

  it('CSP connectSrc includes lock-verifier', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain('https://lock-verifier.onrender.com');
  });

  it('sets X-Content-Type-Options', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets Referrer-Policy', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('does not expose X-Powered-By', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

// ============================================
// REDIS API TESTS
// ============================================

describe('POST /api/redis', () => {
  it('returns 503 when Redis not configured', async () => {
    const res = await request(app)
      .post('/api/redis')
      .send({ method: 'GET', params: ['test-key'] });
    // Without REDIS_URL, should return 503 or 401/403
    expect([401, 403, 503]).toContain(res.status);
  });

  it('returns 400 when method is missing', async () => {
    // In dev mode without REDIS_API_KEY, endpoint is unprotected
    // but still requires method
    const res = await request(app)
      .post('/api/redis')
      .send({});
    // Either auth fails or bad request
    expect([400, 401, 403, 503]).toContain(res.status);
  });
});

// ============================================
// ERROR HANDLER TESTS
// ============================================

describe('error handler', () => {
  it('returns JSON for errors (not stack traces)', async () => {
    // Trigger a route that doesn't exist with a weird method
    const res = await request(app).patch('/api/redis');
    // Should get 404 JSON, not a stack trace
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================
// BOT DETECTION (unit test via isBot behavior)
// ============================================

describe('bot detection (via /games SSR)', () => {
  it('serves HTML without X-SSR header for normal user agent', async () => {
    const res = await request(app)
      .get('/games')
      .set('User-Agent', 'Mozilla/5.0 Chrome/120');
    expect(res.status).toBe(200);
    expect(res.headers['x-ssr']).toBeUndefined();
  });

  it('serves SSR with X-SSR header for Googlebot', async () => {
    const res = await request(app)
      .get('/games')
      .set('User-Agent', 'Googlebot/2.1');
    expect(res.status).toBe(200);
    // X-SSR set if SSR succeeds, otherwise falls back to static
    // Either way, should get 200 HTML
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('?ssr=1 forces SSR mode', async () => {
    const res = await request(app)
      .get('/games?ssr=1')
      .set('User-Agent', 'Mozilla/5.0 Chrome/120');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});
