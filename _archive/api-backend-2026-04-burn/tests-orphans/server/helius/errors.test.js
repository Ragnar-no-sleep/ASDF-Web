/**
 * Tests for api/services/helius/errors.js
 */

'use strict';

const {
  HeliusError,
  CircuitOpenError,
  NoProviderError,
  RateLimitError,
  HttpError,
  RpcError,
} = require('../../../../api/services/helius/errors');

describe('helius/errors', () => {
  it('HeliusError extends Error', () => {
    const err = new HeliusError('test', 'TEST_CODE');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('HeliusError');
    expect(err.message).toBe('test');
    expect(err.code).toBe('TEST_CODE');
  });

  it('CircuitOpenError has providerId and code', () => {
    const err = new CircuitOpenError('helius-gk');
    expect(err).toBeInstanceOf(HeliusError);
    expect(err.code).toBe('CIRCUIT_OPEN');
    expect(err.providerId).toBe('helius-gk');
    expect(err.message).toContain('helius-gk');
  });

  it('NoProviderError has capability and code', () => {
    const err = new NoProviderError('das');
    expect(err).toBeInstanceOf(HeliusError);
    expect(err.code).toBe('NO_PROVIDER');
    expect(err.capability).toBe('das');
  });

  it('RateLimitError parses retryAfter', () => {
    const err = new RateLimitError('5');
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryAfter).toBe(5);
  });

  it('RateLimitError handles null retryAfter', () => {
    const err = new RateLimitError(null);
    expect(err.retryAfter).toBeNull();
  });

  it('HttpError has status', () => {
    const err = new HttpError(502);
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.status).toBe(502);
  });

  it('RpcError has rpcCode', () => {
    const err = new RpcError('Method not found', -32601);
    expect(err.code).toBe('RPC_ERROR');
    expect(err.rpcCode).toBe(-32601);
    expect(err.message).toBe('Method not found');
  });

  it('all errors produce useful stack traces', () => {
    const errors = [
      new CircuitOpenError('test'),
      new NoProviderError('rpc'),
      new RateLimitError('3'),
      new HttpError(429),
      new RpcError('fail', -1),
    ];
    for (const err of errors) {
      expect(err.stack).toContain('errors.test.js');
    }
  });
});
