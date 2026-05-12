/**
 * @jest-environment node
 *
 * Server Coverage Tests
 * Targets uncovered lines in server.cjs:
 *   - L430-481: POST /api/redis (auth, method validation)
 *   - L484-486: Unknown /api/* route -> 404
 *   - L598-604: Global error handler -> 500 JSON
 */

const request = require('supertest');
const { app } = require('../../../server.cjs');

// ============================================
// POST /api/redis — auth + validation
// ============================================

describe('POST /api/redis — auth and validation', () => {
  const ORIGINAL_KEY = process.env.REDIS_API_KEY;

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) {
      delete process.env.REDIS_API_KEY;
    } else {
      process.env.REDIS_API_KEY = ORIGINAL_KEY;
    }
  });

  it('returns 403 when REDIS_API_KEY env var is not set', async () => {
    delete process.env.REDIS_API_KEY;
    const res = await request(app)
      .post('/api/redis')
      .send({ method: 'GET', params: ['key'] });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Redis API disabled/i);
  });

  it('returns 401 when X-Redis-API-Key header does not match', async () => {
    process.env.REDIS_API_KEY = 'correct-key';
    const res = await request(app)
      .post('/api/redis')
      .set('X-Redis-API-Key', 'wrong-key')
      .send({ method: 'GET', params: ['key'] });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Invalid or missing/i);
  });

  it('returns 401 when X-Redis-API-Key header is absent', async () => {
    process.env.REDIS_API_KEY = 'correct-key';
    const res = await request(app)
      .post('/api/redis')
      .send({ method: 'GET', params: ['key'] });
    expect(res.status).toBe(401);
  });

  it('returns 503 when auth passes but Redis is not configured', async () => {
    process.env.REDIS_API_KEY = 'correct-key';
    const res = await request(app)
      .post('/api/redis')
      .set('X-Redis-API-Key', 'correct-key')
      .send({ method: 'GET', params: ['key'] });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/Redis not configured/i);
  });
});

// ============================================
// /api catch-all 404
// ============================================

describe('/api catch-all', () => {
  it('GET /api/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'API endpoint not found');
  });

  it('POST /api/unknown returns 404', async () => {
    const res = await request(app).post('/api/unknown').send({ data: 'test' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'API endpoint not found');
  });

  it('DELETE /api/anything returns 404', async () => {
    const res = await request(app).delete('/api/anything');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'API endpoint not found');
  });
});

// ============================================
// Global error handler — no stack trace leakage
// ============================================

describe('global error handler', () => {
  it('returns JSON for unhandled errors (no stack trace)', async () => {
    const res = await request(app).patch('/api/redis');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('error');
    expect(JSON.stringify(res.body)).not.toMatch(/at Object\.|at Module\.|\.cjs:/);
  });
});
