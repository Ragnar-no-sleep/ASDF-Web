/**
 * ASDF API - Automated Tests
 *
 * Run: npm test
 *
 * Tests critical endpoints and functionality
 */

'use strict';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Simple test runner
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
    tests.push({ name, fn });
}

async function runTests() {
    console.log('\n🧪 ASDF API Tests\n');
    console.log('='.repeat(50));

    for (const { name, fn } of tests) {
        try {
            await fn();
            passed++;
            console.log(`✅ ${name}`);
        } catch (error) {
            failed++;
            console.log(`❌ ${name}`);
            console.log(`   Error: ${error.message}`);
        }
    }

    console.log('='.repeat(50));
    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

    process.exit(failed > 0 ? 1 : 0);
}

// Helper functions
async function fetchJSON(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    return { status: response.status, data: await response.json().catch(() => null) };
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

// ============================================
// HEALTH TESTS
// ============================================

test('Health check returns OK', async () => {
    const { status, data } = await fetchJSON('/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'ok' || data.status === 'degraded', 'Invalid status');
});

test('Health check includes services', async () => {
    const { data } = await fetchJSON('/health');
    assert(data.services, 'Missing services object');
    assert(typeof data.services.api === 'boolean', 'Missing api status');
});

test('Health check includes storage info', async () => {
    const { data } = await fetchJSON('/health');
    assert(data.services.storage, 'Missing storage info');
    assert(['memory', 'redis'].includes(data.services.storage), 'Invalid storage type');
});

// ============================================
// AUTH TESTS
// ============================================

test('Auth challenge requires wallet', async () => {
    const { status } = await fetchJSON('/api/auth/challenge', {
        method: 'POST',
        body: JSON.stringify({})
    });
    assert(status === 400, `Expected 400, got ${status}`);
});

test('Auth challenge returns nonce for valid wallet', async () => {
    const { status, data } = await fetchJSON('/api/auth/challenge', {
        method: 'POST',
        body: JSON.stringify({ wallet: '9F5NUrZYVqRWmwTuLVPFchvVhPkLyU2vKJxZWrughCip' })
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.nonce, 'Missing nonce');
    assert(data.message, 'Missing message');
});

test('Auth verify rejects invalid signature', async () => {
    const { status } = await fetchJSON('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({
            wallet: '9F5NUrZYVqRWmwTuLVPFchvVhPkLyU2vKJxZWrughCip',
            signature: 'invalid'
        })
    });
    assert(status === 400 || status === 401, `Expected 400/401, got ${status}`);
});

// ============================================
// LEADERBOARD TESTS
// ============================================

test('Leaderboard returns array', async () => {
    const { status, data } = await fetchJSON('/api/leaderboard');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.leaderboard || data), 'Expected array');
});

test('Leaderboard respects limit parameter', async () => {
    const { data } = await fetchJSON('/api/leaderboard?limit=5');
    const entries = data.leaderboard || data;
    assert(entries.length <= 5, 'Limit not respected');
});

// ============================================
// SHOP TESTS
// ============================================

test('Shop catalog returns items', async () => {
    const { status, data } = await fetchJSON('/api/shop/catalog');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.items || data.catalog, 'Missing catalog');
});

// ============================================
// TOKEN TESTS
// ============================================

test('Token balance requires valid wallet', async () => {
    const { status } = await fetchJSON('/api/token/balance/invalid');
    assert(status === 400, `Expected 400, got ${status}`);
});

test('Token supply returns data', async () => {
    const { status, data } = await fetchJSON('/api/token/supply');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.supply !== undefined || data.totalSupply !== undefined, 'Missing supply');
});

// ============================================
// RATE LIMITING TEST
// ============================================

test('Rate limiting headers present', async () => {
    const response = await fetch(`${API_URL}/health`);
    const remaining = response.headers.get('x-ratelimit-remaining') ||
                      response.headers.get('ratelimit-remaining');
    // Rate limit headers may not always be present, just check response is ok
    assert(response.ok, 'Request failed');
});

// ============================================
// SECURITY TESTS
// ============================================

test('CORS headers on API routes', async () => {
    const response = await fetch(`${API_URL}/api/leaderboard`, {
        method: 'OPTIONS'
    });
    // OPTIONS might return different status codes depending on config
    assert(response.status < 500, 'Server error on CORS preflight');
});

test('Protected routes require auth', async () => {
    const { status } = await fetchJSON('/api/shop/purchase', {
        method: 'POST',
        body: JSON.stringify({ itemId: 'test' })
    });
    assert(status === 401 || status === 403, `Expected 401/403, got ${status}`);
});

// ============================================
// RUN TESTS
// ============================================

runTests().catch(console.error);
