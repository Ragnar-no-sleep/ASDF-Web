/**
 * Helius RPC Layer — Error Classes
 *
 * Named errors for transport-level failures.
 * Enables catch differentiation by error type.
 *
 * @see docs/ARCH-HELIUS.md Section 4
 */

'use strict';

class HeliusError extends Error {
  constructor(message, code) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

class CircuitOpenError extends HeliusError {
  constructor(providerId) {
    super(`Circuit open for provider: ${providerId}`, 'CIRCUIT_OPEN');
    this.providerId = providerId;
  }
}

class NoProviderError extends HeliusError {
  constructor(capability) {
    super(`No healthy provider for capability: ${capability}`, 'NO_PROVIDER');
    this.capability = capability;
  }
}

class RateLimitError extends HeliusError {
  constructor(retryAfter) {
    super(`Rate limited${retryAfter ? `, retry after ${retryAfter}s` : ''}`, 'RATE_LIMITED');
    this.retryAfter = retryAfter ? Number(retryAfter) : null;
  }
}

class HttpError extends HeliusError {
  constructor(status) {
    super(`HTTP error: ${status}`, 'HTTP_ERROR');
    this.status = status;
  }
}

class RpcError extends HeliusError {
  constructor(message, rpcCode) {
    super(message, 'RPC_ERROR');
    this.rpcCode = rpcCode;
  }
}

module.exports = {
  HeliusError,
  CircuitOpenError,
  NoProviderError,
  RateLimitError,
  HttpError,
  RpcError,
};
