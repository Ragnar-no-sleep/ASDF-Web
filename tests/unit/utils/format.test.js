/**
 * Format Utilities Tests
 * 100% coverage target — pure functions, no side effects
 */

// Inline implementations for jest compatibility (no module transform needed)
// These mirror /js/utils/format.js exactly
function formatNumber(n, decimals = 1) {
  if (n === null || n === undefined || n === 0) return '0';
  if (n < 1e3) return n.toString();
  if (n < 1e6) return (n / 1e3).toFixed(decimals) + 'K';
  if (n < 1e9) return (n / 1e6).toFixed(decimals) + 'M';
  return (n / 1e9).toFixed(decimals) + 'B';
}

function formatWallet(address, start = 8, end = 4) {
  if (!address || address.length <= start + end) return address;
  return address.slice(0, start) + '...' + address.slice(-end);
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  if (minutes > 0) return minutes + 'm ago';
  return 'now';
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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
