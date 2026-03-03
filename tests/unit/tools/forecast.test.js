/**
 * Forecast Controller Unit Tests
 * Tests pure functions exported from js/forecast.js
 */

import { formatCompact, formatTime } from '../../../js/forecast.js';

// ============================================
// formatCompact
// ============================================

describe('formatCompact', () => {
  it('formats millions', () => {
    expect(formatCompact(1_000_000)).toBe('1.00M');
    expect(formatCompact(2_500_000)).toBe('2.50M');
  });

  it('formats thousands', () => {
    expect(formatCompact(1_000)).toBe('1.00K');
    expect(formatCompact(50_000)).toBe('50.00K');
  });

  it('formats small numbers with locale', () => {
    const result = formatCompact(999);
    expect(result).toMatch(/999/);
  });

  it('formats exact boundary (1M)', () => {
    expect(formatCompact(1_000_000)).toBe('1.00M');
  });

  it('formats exact boundary (1K)', () => {
    expect(formatCompact(1_000)).toBe('1.00K');
  });
});

// ============================================
// formatTime
// ============================================

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('pads single digit minutes and seconds', () => {
    expect(formatTime(61)).toBe('01:01');
  });

  it('handles large values', () => {
    expect(formatTime(3600)).toBe('60:00');
  });
});
