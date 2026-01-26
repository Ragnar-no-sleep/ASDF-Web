/**
 * Timing Constants
 * Mirrors CSS --duration-* tokens for JS consistency
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// PHI-BASED TIMING CONSTANTS
// ============================================

/**
 * Base timing unit in milliseconds
 * All other timings are derived from this using φ ratios
 */
const BASE_MS = 200;

/**
 * Golden ratio for timing calculations
 */
const PHI = 1.618033988749895;

// ============================================
// DURATION TOKENS (match CSS --duration-*)
// ============================================

export const DURATION = {
  /** Instant feedback (100ms) */
  INSTANT: Math.round(BASE_MS / PHI),

  /** Fast transitions (200ms) - hover, micro-interactions */
  FAST: BASE_MS,

  /** Normal transitions (300ms) - standard animations */
  NORMAL: Math.round(BASE_MS * 1.5),

  /** Slow transitions (500ms) - emphasis, complex animations */
  SLOW: Math.round(BASE_MS * PHI * 1.5),

  /** Extra slow (800ms) - page transitions, loading states */
  SLOWER: Math.round(BASE_MS * PHI * PHI),
};

// ============================================
// ANIMATION PRESETS
// ============================================

export const ANIMATION = {
  /** Fade in/out duration */
  FADE: DURATION.NORMAL,

  /** Modal open/close */
  MODAL: DURATION.NORMAL,

  /** Slide panel animations */
  SLIDE: DURATION.SLOW,

  /** Toast notification display */
  TOAST_SHOW: DURATION.NORMAL,

  /** Camera/3D transitions */
  CAMERA: 1000,

  /** Camera complex moves */
  CAMERA_SLOW: 1500,

  /** Level-up celebration */
  CELEBRATION: 2000,
};

// ============================================
// DELAY TOKENS
// ============================================

export const DELAY = {
  /** Debounce for input (150ms) */
  DEBOUNCE: 150,

  /** Tooltip show delay */
  TOOLTIP: DURATION.FAST,

  /** Stagger between sequential items */
  STAGGER: 50,

  /** Sequential animation offset */
  SEQUENCE: DURATION.SLOW,

  /** Auto-advance delay (lessons, slides) */
  AUTO_ADVANCE: DURATION.SLOW,
};

// ============================================
// INTERVAL TOKENS
// ============================================

export const INTERVAL = {
  /** UI update tick (1s) */
  TICK: 1000,

  /** Countdown/timer update (1min) */
  COUNTDOWN: 60000,

  /** Auto-save interval (30s) */
  AUTO_SAVE: 30000,

  /** Health check interval (5min) */
  HEALTH_CHECK: 300000,
};

// ============================================
// NOTIFICATION DURATIONS
// ============================================

export const NOTIFICATION = {
  /** Brief toast (2s) */
  TOAST: 2000,

  /** Standard notification (3s) */
  STANDARD: 3000,

  /** Important notification (5s) */
  IMPORTANT: 5000,

  /** Persistent until dismissed */
  PERSISTENT: 0,
};

// ============================================
// XP/GAMIFICATION TIMING
// ============================================

export const GAMIFICATION = {
  /** XP fly-up animation duration */
  XP_FLYUP: 1500,

  /** Level-up announcement */
  LEVEL_UP: 2000,

  /** Bonus text delay after XP */
  BONUS_DELAY: DURATION.SLOW,

  /** Celebration effect duration */
  CELEBRATION: 2000,

  /** Achievement unlock display */
  ACHIEVEMENT: 3000,
};

// ============================================
// COMBINED EXPORT
// ============================================

export const TIMING = {
  DURATION,
  ANIMATION,
  DELAY,
  INTERVAL,
  NOTIFICATION,
  GAMIFICATION,
};

export default TIMING;
