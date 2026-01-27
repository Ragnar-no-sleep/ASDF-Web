/**
 * ASDF-Web Audio Profiles
 * Sound profiles and phi-derived frequencies for audio feedback
 *
 * Philosophy: Harmony through mathematics. All frequencies derive from phi.
 *
 * @module audio/profiles
 */

/**
 * Golden Ratio constant
 */
export const PHI = 1.618033988749895;

/**
 * Base frequency (A4 = 432Hz - natural tuning)
 */
const BASE_FREQ = 432;

/**
 * Phi-derived frequency scale
 * Each frequency is mathematically related through golden ratio
 */
export const FREQUENCIES = {
  // Base frequencies
  base: BASE_FREQ, // 432 Hz
  phi: BASE_FREQ * PHI, // 698.7 Hz
  phiInverse: BASE_FREQ / PHI, // 267.0 Hz
  phiSquared: BASE_FREQ * PHI * PHI, // 1130.5 Hz
  phiSquaredInverse: BASE_FREQ / (PHI * PHI), // 165.0 Hz

  // Musical scale approximations via phi
  low: BASE_FREQ * 0.5, // 216 Hz
  lowMid: BASE_FREQ * 0.75, // 324 Hz
  mid: BASE_FREQ, // 432 Hz
  highMid: BASE_FREQ * 1.25, // 540 Hz
  high: BASE_FREQ * PHI, // 698.7 Hz
  higher: BASE_FREQ * PHI * 1.25, // 873.4 Hz
  highest: BASE_FREQ * PHI * PHI // 1130.5 Hz
};

/**
 * Sound profiles for different UI actions
 * Each profile defines the complete sound parameters
 *
 * @typedef {Object} SoundProfile
 * @property {number} freq - Frequency in Hz
 * @property {number} duration - Duration in seconds
 * @property {string} type - Oscillator type (sine, square, triangle, sawtooth)
 * @property {string} [description] - Human-readable description
 */

/**
 * Sound profiles catalog
 * @type {Object<string, SoundProfile>}
 */
export const PROFILES = {
  // ============================================
  // UI FEEDBACK
  // ============================================

  /**
   * Click - Standard button/link interaction
   */
  click: {
    freq: FREQUENCIES.base,
    duration: 0.08,
    type: 'sine',
    description: 'Standard click feedback'
  },

  /**
   * Hover - Mouse hover on interactive element
   */
  hover: {
    freq: FREQUENCIES.highMid,
    duration: 0.05,
    type: 'sine',
    description: 'Subtle hover feedback'
  },

  /**
   * Focus - Element receives focus
   */
  focus: {
    freq: FREQUENCIES.mid,
    duration: 0.06,
    type: 'sine',
    description: 'Focus indicator'
  },

  /**
   * Toggle On - Switch/checkbox enabled
   */
  toggleOn: {
    freq: FREQUENCIES.high,
    duration: 0.1,
    type: 'triangle',
    description: 'Toggle to on state'
  },

  /**
   * Toggle Off - Switch/checkbox disabled
   */
  toggleOff: {
    freq: FREQUENCIES.lowMid,
    duration: 0.1,
    type: 'triangle',
    description: 'Toggle to off state'
  },

  // ============================================
  // STATUS FEEDBACK
  // ============================================

  /**
   * Success - Positive outcome
   */
  success: {
    freq: FREQUENCIES.phi,
    duration: 0.2,
    type: 'triangle',
    description: 'Success confirmation'
  },

  /**
   * Error - Negative outcome
   */
  error: {
    freq: FREQUENCIES.phiInverse,
    duration: 0.3,
    type: 'sawtooth',
    description: 'Error alert'
  },

  /**
   * Warning - Caution needed
   */
  warning: {
    freq: FREQUENCIES.base,
    duration: 0.15,
    type: 'square',
    description: 'Warning alert'
  },

  /**
   * Info - Informational notification
   */
  info: {
    freq: FREQUENCIES.high,
    duration: 0.12,
    type: 'sine',
    description: 'Information notification'
  },

  // ============================================
  // WALLET / TRANSACTION
  // ============================================

  /**
   * Wallet Connected - Successful wallet connection
   */
  walletConnected: {
    freq: FREQUENCIES.phi,
    duration: 0.25,
    type: 'triangle',
    description: 'Wallet connected'
  },

  /**
   * Wallet Disconnected - Wallet disconnection
   */
  walletDisconnected: {
    freq: FREQUENCIES.phiInverse,
    duration: 0.2,
    type: 'sine',
    description: 'Wallet disconnected'
  },

  /**
   * Transaction Pending - Transaction submitted
   */
  txPending: {
    freq: FREQUENCIES.mid,
    duration: 0.15,
    type: 'triangle',
    description: 'Transaction pending'
  },

  /**
   * Transaction Confirmed - Transaction successful
   */
  txConfirmed: {
    freq: FREQUENCIES.phiSquared,
    duration: 0.3,
    type: 'triangle',
    description: 'Transaction confirmed'
  },

  /**
   * Transaction Failed - Transaction error
   */
  txFailed: {
    freq: FREQUENCIES.phiSquaredInverse,
    duration: 0.35,
    type: 'sawtooth',
    description: 'Transaction failed'
  },

  // ============================================
  // GAME SOUNDS
  // ============================================

  /**
   * Score - Points earned
   */
  score: {
    freq: FREQUENCIES.phi,
    duration: 0.1,
    type: 'triangle',
    description: 'Score points'
  },

  /**
   * Bonus - Bonus points
   */
  bonus: {
    freq: FREQUENCIES.higher,
    duration: 0.15,
    type: 'sine',
    description: 'Bonus points'
  },

  /**
   * Level Up - Level advancement
   */
  levelUp: {
    freq: FREQUENCIES.phiSquared,
    duration: 0.4,
    type: 'sine',
    description: 'Level up'
  },

  /**
   * Game Start - Game begins
   */
  gameStart: {
    freq: FREQUENCIES.high,
    duration: 0.3,
    type: 'triangle',
    description: 'Game start'
  },

  /**
   * Game Over - Game ends
   */
  gameOver: {
    freq: FREQUENCIES.phiSquaredInverse,
    duration: 0.5,
    type: 'sawtooth',
    description: 'Game over'
  },

  /**
   * Countdown - Timer tick
   */
  countdown: {
    freq: FREQUENCIES.mid,
    duration: 0.08,
    type: 'square',
    description: 'Countdown tick'
  },

  /**
   * Collect - Item collected
   */
  collect: {
    freq: FREQUENCIES.highMid,
    duration: 0.1,
    type: 'sine',
    description: 'Item collected'
  },

  /**
   * Miss - Missed target
   */
  miss: {
    freq: FREQUENCIES.low,
    duration: 0.15,
    type: 'triangle',
    description: 'Missed target'
  },

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Navigate - Page/section navigation
   */
  navigate: {
    freq: FREQUENCIES.mid,
    duration: 0.1,
    type: 'sine',
    description: 'Navigation'
  },

  /**
   * Tab Change - Tab switching
   */
  tabChange: {
    freq: FREQUENCIES.highMid,
    duration: 0.08,
    type: 'sine',
    description: 'Tab change'
  },

  /**
   * Modal Open - Modal appears
   */
  modalOpen: {
    freq: FREQUENCIES.high,
    duration: 0.12,
    type: 'sine',
    description: 'Modal open'
  },

  /**
   * Modal Close - Modal dismissed
   */
  modalClose: {
    freq: FREQUENCIES.lowMid,
    duration: 0.1,
    type: 'sine',
    description: 'Modal close'
  },

  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * Notify - General notification
   */
  notify: {
    freq: FREQUENCIES.phi,
    duration: 0.15,
    type: 'sine',
    description: 'Notification'
  },

  /**
   * Achievement - Achievement unlocked
   */
  achievement: {
    freq: FREQUENCIES.phiSquared,
    duration: 0.35,
    type: 'triangle',
    description: 'Achievement unlocked'
  },

  /**
   * Message - New message received
   */
  message: {
    freq: FREQUENCIES.high,
    duration: 0.1,
    type: 'sine',
    description: 'New message'
  },

  // ============================================
  // SHOP
  // ============================================

  /**
   * Purchase - Item purchased
   */
  purchase: {
    freq: FREQUENCIES.phiSquared,
    duration: 0.3,
    type: 'triangle',
    description: 'Purchase complete'
  },

  /**
   * Equip - Item equipped
   */
  equip: {
    freq: FREQUENCIES.phi,
    duration: 0.15,
    type: 'sine',
    description: 'Item equipped'
  },

  // ============================================
  // BURN (Special sounds for burn events)
  // ============================================

  /**
   * Burn - Token burned
   */
  burn: {
    freq: FREQUENCIES.phi,
    duration: 0.4,
    type: 'triangle',
    description: 'Token burn'
  },

  /**
   * Burn Massive - Large burn event
   */
  burnMassive: {
    freq: FREQUENCIES.phiSquared,
    duration: 0.6,
    type: 'triangle',
    description: 'Massive burn event'
  }
};

/**
 * Get a sound profile by name
 * @param {string} name - Profile name
 * @returns {SoundProfile} Sound profile or default click
 */
export function getProfile(name) {
  return PROFILES[name] || PROFILES.click;
}

/**
 * Get all profile names
 * @returns {string[]} Array of profile names
 */
export function getProfileNames() {
  return Object.keys(PROFILES);
}

/**
 * Get profiles by category
 * @param {string} category - Category prefix (e.g., 'game', 'wallet', 'tx')
 * @returns {Object<string, SoundProfile>} Filtered profiles
 */
export function getProfilesByCategory(category) {
  const prefix = category.toLowerCase();
  return Object.fromEntries(
    Object.entries(PROFILES).filter(([key]) =>
      key.toLowerCase().startsWith(prefix)
    )
  );
}

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.audioProfiles = PROFILES;
  window.ASDF.audioFrequencies = FREQUENCIES;
}
