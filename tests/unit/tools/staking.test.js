/**
 * Staking Controller Unit Tests
 * Tests pure functions exported from js/staking.js
 */

// Mock heavy deps — staking.js runs init() at module load (readyState check)
jest.mock('../../../js/utils/fetch-retry.js', () => ({
  fetchWithRetry: jest.fn().mockRejectedValue(new Error('mocked')),
}));
jest.mock('../../../js/utils/audio-feedback.js', () => ({
  AudioFeedback: { init: jest.fn(), play: jest.fn() },
}));
jest.mock('../../../js/core/PageLifecycle.js', () => ({
  PageLifecycle: { registerTimer: jest.fn(), registerListener: jest.fn() },
}));

import {
  normalizeLock,
  getCachedData,
  setCachedData,
  getDemoLocks,
  formatDate,
  getProgress,
  getCountdown,
  STATUS_MAP,
} from '../../../js/staking.js';

// ============================================
// STATUS_MAP
// ============================================

describe('STATUS_MAP', () => {
  it('maps vesting to active', () => {
    expect(STATUS_MAP.vesting).toBe('active');
  });

  it('maps fully_unlocked to completed', () => {
    expect(STATUS_MAP.fully_unlocked).toBe('completed');
  });

  it('maps pending to pending', () => {
    expect(STATUS_MAP.pending).toBe('pending');
  });

  it('maps cancelled to cancelled', () => {
    expect(STATUS_MAP.cancelled).toBe('cancelled');
  });
});

// ============================================
// normalizeLock
// ============================================

describe('normalizeLock', () => {
  it('normalizes a full TVU lock object', () => {
    const raw = {
      id: 'abc123',
      contractName: 'Team Vest',
      recipient: 'wallet-A',
      sender: 'wallet-B',
      totalAmount: 5000,
      unlocked: 1000,
      status: 'vesting',
      startDate: '2026-01-01T00:00:00Z',
      endDate: '2027-01-01T00:00:00Z',
      unlockSchedule: [],
    };

    const result = normalizeLock(raw);
    expect(result.id).toBe('abc123');
    expect(result.title).toBe('Team Vest');
    expect(result.wallet).toBe('wallet-A');
    expect(result.sender).toBe('wallet-B');
    expect(result.amount).toBe(5000);
    expect(result.deposited).toBe(5000);
    expect(result.unlocked).toBe(1000);
    expect(result.status).toBe('active'); // vesting → active via STATUS_MAP
  });

  it('falls back to amount field when totalAmount missing', () => {
    const raw = { amount: 999 };
    expect(normalizeLock(raw).amount).toBe(999);
  });

  it('falls back to withdrawn for unlocked', () => {
    const raw = { totalAmount: 100, withdrawn: 25 };
    expect(normalizeLock(raw).unlocked).toBe(25);
  });

  it('uses defaults for missing fields', () => {
    const result = normalizeLock({});
    expect(result.id).toBe('');
    expect(result.title).toBe('Unnamed Lock');
    expect(result.wallet).toBe('');
    expect(result.amount).toBe(0);
    expect(result.unlocked).toBe(0);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.nextUnlock).toBeNull();
  });

  it('derives nextUnlock from unlockSchedule', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const raw = {
      totalAmount: 1000,
      unlockSchedule: [
        { date: '2020-01-01T00:00:00Z', amount: 100 }, // past
        { date: futureDate, amount: 200 }, // future
      ],
    };
    const result = normalizeLock(raw);
    expect(result.nextUnlock).toBeInstanceOf(Date);
    expect(result.nextUnlockAmount).toBe(200);
  });

  it('sets nextUnlock null when all schedule entries are past', () => {
    const raw = {
      totalAmount: 1000,
      unlockSchedule: [{ date: '2020-01-01T00:00:00Z', amount: 100 }],
    };
    expect(normalizeLock(raw).nextUnlock).toBeNull();
  });

  it('handles unknown status passthrough', () => {
    const raw = { status: 'exotic_status' };
    expect(normalizeLock(raw).status).toBe('exotic_status');
  });

  it('prefers name over title fallback', () => {
    const raw = { name: 'From Name' };
    expect(normalizeLock(raw).title).toBe('From Name');
  });
});

// ============================================
// getCachedData / setCachedData
// ============================================

describe('getCachedData / setCachedData', () => {
  let store;

  beforeEach(() => {
    // Make localStorage mock functional (setup.js provides jest.fn() stubs)
    store = {};
    localStorage.getItem.mockImplementation(key => store[key] ?? null);
    localStorage.setItem.mockImplementation((key, val) => {
      store[key] = String(val);
    });
    localStorage.removeItem.mockImplementation(key => {
      delete store[key];
    });
    localStorage.clear.mockImplementation(() => {
      for (const k in store) delete store[k];
    });
  });

  it('returns null when cache is empty', () => {
    expect(getCachedData()).toBeNull();
  });

  it('round-trips data through cache', () => {
    const data = [{ id: 'test' }];
    setCachedData(data);
    expect(getCachedData()).toEqual(data);
  });

  it('returns null for expired cache', () => {
    const old = { data: [1], ts: Date.now() - 999999999 };
    store['asdf_locks_v2'] = JSON.stringify(old);
    expect(getCachedData()).toBeNull();
  });

  it('returns null for corrupted cache', () => {
    store['asdf_locks_v2'] = 'not json';
    expect(getCachedData()).toBeNull();
  });
});

// ============================================
// getDemoLocks
// ============================================

describe('getDemoLocks', () => {
  it('returns 3 demo locks', () => {
    const demos = getDemoLocks();
    expect(demos).toHaveLength(3);
  });

  it('all demos have required fields', () => {
    getDemoLocks().forEach(lock => {
      expect(lock).toHaveProperty('id');
      expect(lock).toHaveProperty('title');
      expect(lock).toHaveProperty('wallet');
      expect(lock).toHaveProperty('amount');
      expect(lock).toHaveProperty('status');
    });
  });

  it('demo IDs start with demo-', () => {
    getDemoLocks().forEach(lock => {
      expect(lock.id).toMatch(/^demo-/);
    });
  });
});

// ============================================
// formatDate
// ============================================

describe('formatDate', () => {
  it('returns -- for null', () => {
    expect(formatDate(null)).toBe('--');
  });

  it('returns -- for undefined', () => {
    expect(formatDate(undefined)).toBe('--');
  });

  it('formats a date to en-US locale string', () => {
    const d = new Date('2026-06-15T00:00:00Z');
    const result = formatDate(d);
    expect(result).toContain('Jun');
    expect(result).toContain('2026');
  });
});

// ============================================
// getProgress
// ============================================

describe('getProgress', () => {
  it('returns 0 for no unlocked', () => {
    expect(getProgress({ amount: 1000, unlocked: 0 })).toBe(0);
  });

  it('returns 50 for half unlocked', () => {
    expect(getProgress({ amount: 1000, unlocked: 500 })).toBe(50);
  });

  it('caps at 100', () => {
    expect(getProgress({ amount: 100, unlocked: 200 })).toBe(100);
  });

  it('returns 0 when amount is 0', () => {
    expect(getProgress({ amount: 0, unlocked: 0 })).toBe(0);
  });
});

// ============================================
// getCountdown
// ============================================

describe('getCountdown', () => {
  it('returns -- for null', () => {
    expect(getCountdown(null)).toBe('--');
  });

  it('returns Now for past dates', () => {
    expect(getCountdown(new Date('2020-01-01'))).toBe('Now');
  });

  it('returns days and hours for future dates', () => {
    const future = new Date(Date.now() + 2 * 86400000 + 3600000); // ~2d 1h
    const result = getCountdown(future);
    expect(result).toMatch(/^\d+d \d+h$/);
  });

  it('returns just hours when less than a day', () => {
    const future = new Date(Date.now() + 3600000); // ~1h
    const result = getCountdown(future);
    expect(result).toMatch(/^\d+h$/);
  });
});
