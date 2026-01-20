/**
 * Timing Config Unit Tests
 * Tests Fibonacci/Phi timing utilities
 *
 * This is fine.
 */

// Mock window for browser globals
global.window = {
  location: { hostname: 'test' }
};

// Load the module (it exports to window)
require('../../js/games/shared/timing-config.js');

const { GAME_TIMING, GAME_EASING, FIBONACCI, PHI, fib, phiStagger, phiScale } = global.window;

describe('Timing Config', () => {
  describe('FIBONACCI constant', () => {
    it('should have correct first 10 Fibonacci numbers', () => {
      expect(FIBONACCI[0]).toBe(1);
      expect(FIBONACCI[1]).toBe(1);
      expect(FIBONACCI[2]).toBe(2);
      expect(FIBONACCI[3]).toBe(3);
      expect(FIBONACCI[4]).toBe(5);
      expect(FIBONACCI[5]).toBe(8);
      expect(FIBONACCI[6]).toBe(13);
      expect(FIBONACCI[7]).toBe(21);
      expect(FIBONACCI[8]).toBe(34);
      expect(FIBONACCI[9]).toBe(55);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(FIBONACCI)).toBe(true);
    });

    it('should have 20 numbers', () => {
      expect(FIBONACCI.length).toBe(20);
    });
  });

  describe('PHI constant', () => {
    it('should be approximately 1.618', () => {
      expect(PHI).toBeCloseTo(1.618, 3);
    });
  });

  describe('GAME_TIMING', () => {
    it('should have EFFECT timings based on Fibonacci', () => {
      expect(GAME_TIMING.EFFECT.VERY_FAST).toBe(100);  // fib[1] * 100
      expect(GAME_TIMING.EFFECT.FAST).toBe(200);       // fib[2] * 100
      expect(GAME_TIMING.EFFECT.QUICK).toBe(300);      // fib[3] * 100
      expect(GAME_TIMING.EFFECT.NORMAL).toBe(500);     // fib[4] * 100
      expect(GAME_TIMING.EFFECT.MEDIUM).toBe(800);     // fib[5] * 100
      expect(GAME_TIMING.EFFECT.SLOW).toBe(1300);      // fib[6] * 100
      expect(GAME_TIMING.EFFECT.VERY_SLOW).toBe(2100); // fib[7] * 100
      expect(GAME_TIMING.EFFECT.EXTENDED).toBe(3400);  // fib[8] * 100
    });

    it('should have STAGGER timings', () => {
      expect(GAME_TIMING.STAGGER.FAST).toBe(30);
      expect(GAME_TIMING.STAGGER.NORMAL).toBe(50);
      expect(GAME_TIMING.STAGGER.PHI).toBe(62);
    });

    it('should have COOLDOWN timings', () => {
      expect(GAME_TIMING.COOLDOWN.ACTION).toBe(300);
      expect(GAME_TIMING.COOLDOWN.BURN).toBe(2100);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(GAME_TIMING)).toBe(true);
      // Note: nested objects may not be frozen depending on implementation
    });
  });

  describe('GAME_EASING', () => {
    it('should have phi-based easing functions', () => {
      expect(GAME_EASING.PHI_IN).toContain('0.618');
      expect(GAME_EASING.PHI_OUT).toContain('0.382');
      expect(GAME_EASING.PHI_IN_OUT).toContain('0.618');
    });

    it('should have standard easings', () => {
      expect(GAME_EASING.EASE_OUT).toBeDefined();
      expect(GAME_EASING.EASE_IN).toBeDefined();
      expect(GAME_EASING.EASE_IN_OUT).toBeDefined();
    });
  });

  describe('fib() function', () => {
    it('should return correct Fibonacci number for valid index', () => {
      expect(fib(0)).toBe(1);
      expect(fib(1)).toBe(1);
      expect(fib(5)).toBe(8);
      expect(fib(10)).toBe(89);
    });

    it('should return last value for out-of-range index', () => {
      expect(fib(-1)).toBe(6765);
      expect(fib(100)).toBe(6765);
    });

    it('should return last value for index 19', () => {
      expect(fib(19)).toBe(6765);
    });
  });

  describe('phiStagger() function', () => {
    it('should return array of correct length', () => {
      const delays = phiStagger(5);
      expect(delays).toHaveLength(5);
    });

    it('should start with 0 for first item', () => {
      const delays = phiStagger(5);
      expect(delays[0]).toBe(0);
    });

    it('should produce increasing delays', () => {
      const delays = phiStagger(5, 50);
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
      }
    });

    it('should respect custom base delay', () => {
      const delays50 = phiStagger(3, 50);
      const delays100 = phiStagger(3, 100);
      // With higher base delay, values should be higher
      expect(delays100[2]).toBeGreaterThan(delays50[2]);
    });

    it('should return empty array for count 0', () => {
      const delays = phiStagger(0);
      expect(delays).toHaveLength(0);
    });
  });

  describe('phiScale() function', () => {
    it('should multiply by PHI', () => {
      expect(phiScale(100)).toBe(162); // 100 * 1.618 rounded
      expect(phiScale(1000)).toBe(1618);
    });

    it('should return 0 for 0', () => {
      expect(phiScale(0)).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(phiScale(-100)).toBe(-162);
    });
  });
});
