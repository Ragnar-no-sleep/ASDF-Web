/**
 * ASDF Error Registry Unit Tests
 * Tests pure functions from js/core/errors.js
 */

import {
  errors,
  getError,
  createError,
  isASDFError,
  getSeverityColor,
  getSeverityIcon,
} from '../../../js/core/errors.js';

// ============================================
// errors catalog
// ============================================

describe('errors catalog', () => {
  it('contains wallet errors', () => {
    expect(errors.WALLET_NOT_CONNECTED.code).toBe('WALLET_NOT_CONNECTED');
    expect(errors.WALLET_NOT_CONNECTED.severity).toBe('warning');
  });

  it('contains network errors', () => {
    expect(errors.RPC_TIMEOUT.action).toBe('retry');
    expect(errors.RPC_RATE_LIMITED.action).toBe('wait');
  });

  it('contains transaction errors', () => {
    expect(errors.TX_FAILED.code).toBe('TX_FAILED');
    expect(errors.TX_INSUFFICIENT_FUNDS.severity).toBe('error');
  });

  it('contains game errors', () => {
    expect(errors.GAME_SESSION_EXPIRED.action).toBe('restart');
  });

  it('contains shop errors', () => {
    expect(errors.INSUFFICIENT_BALANCE.code).toBe('INSUFFICIENT_BALANCE');
    expect(errors.ITEM_ALREADY_OWNED.severity).toBe('info');
  });

  it('contains auth errors', () => {
    expect(errors.AUTH_EXPIRED.action).toBe('reconnect');
  });

  it('contains API errors', () => {
    expect(errors.API_ERROR.severity).toBe('error');
    expect(errors.API_NOT_FOUND.code).toBe('API_NOT_FOUND');
  });

  it('contains quest errors', () => {
    expect(errors.QUEST_NOT_FOUND.code).toBe('QUEST_NOT_FOUND');
    expect(errors.QUEST_SLOTS_FULL.severity).toBe('warning');
  });

  it('contains module errors', () => {
    expect(errors.MODULE_LOCKED.action).toBeNull();
  });

  it('contains generic errors', () => {
    expect(errors.UNKNOWN.code).toBe('UNKNOWN');
    expect(errors.OFFLINE.severity).toBe('warning');
    expect(errors.MAINTENANCE.action).toBe('wait');
  });

  it('all errors have required fields', () => {
    Object.values(errors).forEach(err => {
      expect(err).toHaveProperty('code');
      expect(err).toHaveProperty('name');
      expect(err).toHaveProperty('message');
      expect(err).toHaveProperty('severity');
    });
  });

  it('error codes match object keys', () => {
    Object.entries(errors).forEach(([key, err]) => {
      expect(err.code).toBe(key);
    });
  });
});

// ============================================
// getError
// ============================================

describe('getError', () => {
  it('returns error by code', () => {
    expect(getError('TX_FAILED')).toBe(errors.TX_FAILED);
  });

  it('returns UNKNOWN for invalid code', () => {
    expect(getError('NONEXISTENT')).toBe(errors.UNKNOWN);
  });

  it('returns UNKNOWN for undefined', () => {
    expect(getError(undefined)).toBe(errors.UNKNOWN);
  });
});

// ============================================
// createError
// ============================================

describe('createError', () => {
  it('creates error with context', () => {
    const err = createError('RPC_ERROR', { endpoint: 'mainnet' });
    expect(err.code).toBe('RPC_ERROR');
    expect(err.context.endpoint).toBe('mainnet');
    expect(err.timestamp).toBeGreaterThan(0);
  });

  it('falls back to UNKNOWN for invalid code', () => {
    const err = createError('INVALID_CODE');
    expect(err.code).toBe('UNKNOWN');
  });

  it('defaults context to empty object', () => {
    const err = createError('TX_FAILED');
    expect(err.context).toEqual({});
  });
});

// ============================================
// isASDFError
// ============================================

describe('isASDFError', () => {
  it('returns true for valid error objects', () => {
    expect(isASDFError(errors.TX_FAILED)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isASDFError(null)).toBeFalsy();
  });

  it('returns false for string', () => {
    expect(isASDFError('error')).toBeFalsy();
  });

  it('returns false for partial objects', () => {
    expect(isASDFError({ code: 'X' })).toBeFalsy();
    expect(isASDFError({ code: 'X', name: 'Y' })).toBeFalsy();
  });

  it('returns true for minimal valid object', () => {
    expect(isASDFError({ code: 'X', name: 'Y', message: 'Z' })).toBe(true);
  });
});

// ============================================
// getSeverityColor
// ============================================

describe('getSeverityColor', () => {
  it('returns color for info', () => {
    expect(getSeverityColor('info')).toContain('blue');
  });

  it('returns color for warning', () => {
    expect(getSeverityColor('warning')).toContain('gold');
  });

  it('returns color for error', () => {
    expect(getSeverityColor('error')).toContain('orange');
  });

  it('returns color for critical', () => {
    expect(getSeverityColor('critical')).toContain('red');
  });

  it('defaults to error color for unknown severity', () => {
    expect(getSeverityColor('unknown')).toContain('orange');
  });
});

// ============================================
// getSeverityIcon
// ============================================

describe('getSeverityIcon', () => {
  it('returns i for info', () => {
    expect(getSeverityIcon('info')).toBe('i');
  });

  it('returns ! for warning', () => {
    expect(getSeverityIcon('warning')).toBe('!');
  });

  it('returns x for error', () => {
    expect(getSeverityIcon('error')).toBe('x');
  });

  it('returns !! for critical', () => {
    expect(getSeverityIcon('critical')).toBe('!!');
  });

  it('defaults to error icon for unknown', () => {
    expect(getSeverityIcon('unknown')).toBe('x');
  });
});
