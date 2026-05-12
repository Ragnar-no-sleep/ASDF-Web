/**
 * Ignition Controller Unit Tests
 * Tests pure functions exported from js/ignition.js
 */

import { pad } from '../../../js/ignition.js';

// ============================================
// pad
// ============================================

describe('pad', () => {
  it('pads single digit with leading zero', () => {
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
    expect(pad(9)).toBe('09');
  });

  it('does not pad double digits', () => {
    expect(pad(10)).toBe('10');
    expect(pad(59)).toBe('59');
    expect(pad(99)).toBe('99');
  });
});
