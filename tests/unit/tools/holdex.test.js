/**
 * HolDex Controller Unit Tests
 * Tests pure functions exported from js/holdex.js
 */

import {
  getKRank,
  getCreditRating,
  formatUSD,
  formatPrice,
  formatPercent,
  formatHolders,
} from '../../../js/holdex.js';

// ============================================
// getKRank
// ============================================

describe('getKRank', () => {
  it('returns Diamond for score >= 90', () => {
    expect(getKRank(90)).toEqual({ name: 'Diamond', css: 'diamond' });
    expect(getKRank(100)).toEqual({ name: 'Diamond', css: 'diamond' });
  });

  it('returns Platinum for score >= 80', () => {
    expect(getKRank(80)).toEqual({ name: 'Platinum', css: 'platinum' });
    expect(getKRank(89)).toEqual({ name: 'Platinum', css: 'platinum' });
  });

  it('returns Gold for score >= 70', () => {
    expect(getKRank(70)).toEqual({ name: 'Gold', css: 'gold' });
  });

  it('returns Silver for score >= 60', () => {
    expect(getKRank(60)).toEqual({ name: 'Silver', css: 'silver' });
  });

  it('returns Bronze for score >= 50', () => {
    expect(getKRank(50)).toEqual({ name: 'Bronze', css: 'bronze' });
  });

  it('returns Copper for score >= 40', () => {
    expect(getKRank(40)).toEqual({ name: 'Copper', css: 'copper' });
  });

  it('returns Iron for score >= 20', () => {
    expect(getKRank(20)).toEqual({ name: 'Iron', css: 'iron' });
  });

  it('returns Rust for score < 20', () => {
    expect(getKRank(19)).toEqual({ name: 'Rust', css: 'rust' });
    expect(getKRank(0)).toEqual({ name: 'Rust', css: 'rust' });
  });
});

// ============================================
// getCreditRating
// ============================================

describe('getCreditRating', () => {
  it('returns A1 for score >= 90', () => {
    expect(getCreditRating(90)).toEqual({ grade: 'A1', css: 'a1' });
  });

  it('returns A2 for score >= 75', () => {
    expect(getCreditRating(75)).toEqual({ grade: 'A2', css: 'a2' });
  });

  it('returns B1 for score >= 60', () => {
    expect(getCreditRating(60)).toEqual({ grade: 'B1', css: 'b1' });
  });

  it('returns B2 for score >= 45', () => {
    expect(getCreditRating(45)).toEqual({ grade: 'B2', css: 'b2' });
  });

  it('returns C for score >= 30', () => {
    expect(getCreditRating(30)).toEqual({ grade: 'C', css: 'c' });
  });

  it('returns D for score < 30', () => {
    expect(getCreditRating(29)).toEqual({ grade: 'D', css: 'd' });
    expect(getCreditRating(0)).toEqual({ grade: 'D', css: 'd' });
  });
});

// ============================================
// formatUSD
// ============================================

describe('formatUSD', () => {
  it('formats billions', () => {
    expect(formatUSD(1_000_000_000)).toBe('$1.00B');
    expect(formatUSD(2_500_000_000)).toBe('$2.50B');
  });

  it('formats millions', () => {
    expect(formatUSD(1_000_000)).toBe('$1.00M');
    expect(formatUSD(24_700_000)).toBe('$24.70M');
  });

  it('formats thousands', () => {
    expect(formatUSD(1_000)).toBe('$1.00K');
    expect(formatUSD(5_500)).toBe('$5.50K');
  });

  it('formats small numbers with locale', () => {
    const result = formatUSD(999);
    expect(result).toMatch(/^\$999/);
  });
});

// ============================================
// formatPrice
// ============================================

describe('formatPrice', () => {
  it('uses 8 decimals for very small prices', () => {
    expect(formatPrice(0.00001234)).toBe('$0.00001234');
  });

  it('uses 6 decimals for small prices', () => {
    expect(formatPrice(0.0042)).toBe('$0.004200');
  });

  it('uses 4 decimals for sub-dollar prices', () => {
    expect(formatPrice(0.5)).toBe('$0.5000');
  });

  it('uses 2 decimals for >= $1', () => {
    expect(formatPrice(1.5)).toBe('$1.50');
    expect(formatPrice(100)).toBe('$100.00');
  });
});

// ============================================
// formatPercent
// ============================================

describe('formatPercent', () => {
  it('adds + sign for positive', () => {
    expect(formatPercent(12.5)).toBe('+12.50%');
  });

  it('adds - sign for negative', () => {
    expect(formatPercent(-3.14)).toBe('-3.14%');
  });

  it('adds + sign for zero', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

// ============================================
// formatHolders
// ============================================

describe('formatHolders', () => {
  it('formats millions', () => {
    expect(formatHolders(1_500_000)).toBe('1.5M');
  });

  it('formats thousands', () => {
    expect(formatHolders(1_200)).toBe('1.2K');
  });

  it('formats small numbers with locale', () => {
    const result = formatHolders(999);
    expect(result).toMatch(/999/);
  });
});
