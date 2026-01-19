/**
 * ASDF Games - Fibonacci/Phi Timing Configuration
 *
 * ALL timing values are derived from Fibonacci sequence:
 * 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610...
 *
 * Multiplied by base unit (100ms) for practical game timings.
 *
 * Philosophy: Natural rhythms feel better than arbitrary values.
 * "This is fine." - ASDF
 *
 * @version 1.0.0
 */

'use strict';

// ===========================================
// FIBONACCI SEQUENCE (first 20 numbers)
// ===========================================
const FIBONACCI = Object.freeze([
    1, 1, 2, 3, 5, 8, 13, 21, 34, 55,
    89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765
]);

// Golden ratio constant
const PHI = 1.618033988749895;
const PHI_INVERSE = 0.618033988749895;

// ===========================================
// GAME TIMING CONFIG (all values in ms)
// ===========================================
const GAME_TIMING = Object.freeze({
    // Effect durations (fibonacci * 100)
    EFFECT: {
        INSTANT: 0,
        VERY_FAST: 100,      // fib[1] * 100
        FAST: 200,           // fib[2] * 100
        QUICK: 300,          // fib[3] * 100
        NORMAL: 500,         // fib[4] * 100
        MEDIUM: 800,         // fib[5] * 100
        SLOW: 1300,          // fib[6] * 100
        VERY_SLOW: 2100,     // fib[7] * 100
        EXTENDED: 3400       // fib[8] * 100
    },

    // Animation stagger delays
    STAGGER: {
        FAST: 30,            // ~fib[3] * 10
        NORMAL: 50,          // fib[4] * 10
        PHI: 62,             // PHI_INVERSE * 100 (natural)
        SLOW: 80,            // fib[5] * 10
        VERY_SLOW: 130       // fib[6] * 10
    },

    // Update intervals for polling/refresh
    UPDATE: {
        REALTIME: 100,       // fib[1] * 100 (game loops)
        FAST: 500,           // fib[4] * 100
        NORMAL: 1300,        // fib[6] * 100
        SLOW: 2100,          // fib[7] * 100
        LAZY: 3400,          // fib[8] * 100
        BACKGROUND: 5500,    // fib[9] * 100
        PERIODIC: 13000,     // fib[6] * 1000 (13s)
        MINUTE: 55000        // fib[9] * 1000 (~1min)
    },

    // Cooldowns for rate limiting
    COOLDOWN: {
        ACTION: 300,         // fib[3] * 100 (fast actions)
        ABILITY: 800,        // fib[5] * 100
        SPELL: 1300,         // fib[6] * 100
        ULTIMATE: 2100,      // fib[7] * 100
        BURN: 2100,          // fib[7] * 100 (Solana burn)
        PURCHASE: 1300,      // fib[6] * 100
        RELATIONSHIP: 800    // fib[5] * 100
    },

    // Debounce timings
    DEBOUNCE: {
        INPUT: 50,           // fib[4] * 10
        SEARCH: 300,         // fib[3] * 100
        RESIZE: 130,         // fib[6] * 10
        SCROLL: 80           // fib[5] * 10
    },

    // Toast/notification durations
    TOAST: {
        SHORT: 2100,         // fib[7] * 100
        NORMAL: 3400,        // fib[8] * 100
        LONG: 5500           // fib[9] * 100
    }
});

// ===========================================
// ANIMATION EASING (phi-based)
// ===========================================
const GAME_EASING = Object.freeze({
    // CSS timing functions
    PHI_IN: 'cubic-bezier(0.618, 0, 1, 1)',
    PHI_OUT: 'cubic-bezier(0, 0, 0.382, 1)',
    PHI_IN_OUT: 'cubic-bezier(0.618, 0, 0.382, 1)',

    // Standard easings
    EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
    EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
    EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)'
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get fibonacci number at index
 * @param {number} n - Index (0-19)
 * @returns {number}
 */
function fib(n) {
    if (n < 0 || n >= FIBONACCI.length) return FIBONACCI[FIBONACCI.length - 1];
    return FIBONACCI[n];
}

/**
 * Calculate phi-based stagger delays for animations
 * @param {number} count - Number of items
 * @param {number} baseDelay - Base delay in ms (default: 50)
 * @returns {number[]} Array of delays
 */
function phiStagger(count, baseDelay = 50) {
    const delays = [];
    for (let i = 0; i < count; i++) {
        delays.push(Math.round(baseDelay * Math.pow(PHI_INVERSE, i / count) * i));
    }
    return delays;
}

/**
 * Get timing multiplied by phi
 * @param {number} value - Base value
 * @returns {number} Value * PHI
 */
function phiScale(value) {
    return Math.round(value * PHI);
}

// ===========================================
// EXPORT FOR BROWSER (global scope)
// ===========================================
if (typeof window !== 'undefined') {
    window.GAME_TIMING = GAME_TIMING;
    window.GAME_EASING = GAME_EASING;
    window.FIBONACCI = FIBONACCI;
    window.PHI = PHI;
    window.fib = fib;
    window.phiStagger = phiStagger;
    window.phiScale = phiScale;
}

// Log initialization (dev only)
if (typeof console !== 'undefined' && window.location?.hostname === 'localhost') {
    console.log('[ASDF Timing] Fibonacci config loaded. PHI =', PHI);
}
