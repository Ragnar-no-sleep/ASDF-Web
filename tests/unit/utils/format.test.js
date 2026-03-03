/**
 * Format Utilities Tests
 * Tests the REAL source at js/utils/format.js (not inline copies)
 */

import {
  formatNumber,
  formatWallet,
  formatTimeAgo,
  formatDuration,
  formatPeriod,
  formatTimeLeft,
} from '../../../js/utils/format.js';

// ============================================

describe('formatNumber', () => {
  it('returns "0" for 0', () => expect(formatNumber(0)).toBe('0'));
  it('returns "0" for null', () => expect(formatNumber(null)).toBe('0'));
  it('returns "0" for undefined', () => expect(formatNumber(undefined)).toBe('0'));

  it('returns raw string for < 1K', () => {
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('formats millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
    expect(formatNumber(7393300)).toBe('7.4M');
    expect(formatNumber(999999999)).toBe('1000.0M');
  });

  it('formats billions with B suffix', () => {
    expect(formatNumber(1000000000)).toBe('1.0B');
    expect(formatNumber(1000000000000)).toBe('1000.0B');
  });

  it('respects custom decimals param', () => {
    expect(formatNumber(1500000, 2)).toBe('1.50M');
    expect(formatNumber(1500000, 0)).toBe('2M');
  });
});

// ============================================

describe('formatWallet', () => {
  const longAddr = '1234567890123456'; // 16 chars

  it('truncates long addresses with ellipsis', () => {
    const result = formatWallet(longAddr);
    expect(result).toBe('12345678...3456');
  });

  it('returns short addresses unchanged', () => {
    expect(formatWallet('abc')).toBe('abc');
    expect(formatWallet('123456789012')).toBe('123456789012'); // exactly start+end=12
  });

  it('returns falsy address as-is', () => {
    expect(formatWallet(null)).toBeNull();
    expect(formatWallet(undefined)).toBeUndefined();
    expect(formatWallet('')).toBe('');
  });

  it('respects custom start/end params', () => {
    expect(formatWallet('ABCDEFGHIJKLMNOP', 4, 4)).toBe('ABCD...MNOP');
  });
});

// ============================================

describe('formatTimeAgo', () => {
  const now = Date.now();

  it('returns "now" for very recent timestamps', () => {
    expect(formatTimeAgo(now - 5000)).toBe('now'); // 5s ago
  });

  it('returns minutes ago', () => {
    expect(formatTimeAgo(now - 90 * 1000)).toBe('1m ago');
    expect(formatTimeAgo(now - 5 * 60 * 1000)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(formatTimeAgo(now - 2 * 60 * 60 * 1000)).toBe('2h ago');
    expect(formatTimeAgo(now - 23 * 60 * 60 * 1000)).toBe('23h ago');
  });

  it('returns days ago', () => {
    expect(formatTimeAgo(now - 1 * 24 * 60 * 60 * 1000)).toBe('1d ago');
    expect(formatTimeAgo(now - 5 * 24 * 60 * 60 * 1000)).toBe('5d ago');
  });

  it('accepts ISO 8601 string timestamps', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago');
  });
});

// ============================================

describe('formatDuration', () => {
  it('returns "0:00" for 0ms', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds correctly', () => {
    expect(formatDuration(1000)).toBe('0:01');
    expect(formatDuration(30000)).toBe('0:30');
    expect(formatDuration(59000)).toBe('0:59');
  });

  it('formats minutes correctly', () => {
    expect(formatDuration(60000)).toBe('1:00');
    expect(formatDuration(305000)).toBe('5:05');
    expect(formatDuration(3661000)).toBe('61:01');
  });

  it('zero-pads seconds', () => {
    expect(formatDuration(65000)).toBe('1:05');
    expect(formatDuration(120000)).toBe('2:00');
  });
});

// ============================================

describe('formatPeriod', () => {
  it('formats days and hours', () => {
    expect(formatPeriod(90000)).toBe('1d 1h');
  });

  it('formats hours only', () => {
    expect(formatPeriod(7200)).toBe('2h');
  });

  it('formats minutes for < 1 hour', () => {
    expect(formatPeriod(300)).toBe('5m');
  });
});

// ============================================

describe('formatTimeLeft', () => {
  it('returns "Now" for 0 or negative', () => {
    expect(formatTimeLeft(0)).toBe('Now');
    expect(formatTimeLeft(-1000)).toBe('Now');
  });

  it('formats days + hours + minutes', () => {
    expect(formatTimeLeft(90061000)).toBe('1d 1h 1m');
  });

  it('formats hours + minutes', () => {
    expect(formatTimeLeft(3660000)).toBe('1h 1m');
  });

  it('formats minutes only', () => {
    expect(formatTimeLeft(300000)).toBe('5m');
  });
});
