/**
 * ASDF-Web Audio Module
 * Central exports for audio functionality
 *
 * @module audio
 *
 * @example
 * // Import audio engine
 * import { audio } from './audio/index.js';
 *
 * // Initialize and play
 * await audio.init();
 * audio.play('success');
 *
 * // Or import profiles
 * import { PROFILES, FREQUENCIES, PHI } from './audio/index.js';
 */

// Audio Engine
export { audio, AudioEngine } from './engine.js';

// Sound Profiles
export {
  PROFILES,
  FREQUENCIES,
  PHI,
  getProfile,
  getProfileNames,
  getProfilesByCategory
} from './profiles.js';

/**
 * Quick play function for convenience
 * Auto-initializes if needed
 *
 * @param {string} type - Sound type to play
 * @param {Object} options - Play options
 * @returns {Promise<void>}
 */
export async function play(type, options = {}) {
  const { audio } = await import('./engine.js');

  if (!audio.isInitialized()) {
    await audio.init();
  }

  audio.play(type, options);
}

/**
 * Initialize audio system
 * @returns {Promise<boolean>} True if initialized
 */
export async function initAudio() {
  const { audio } = await import('./engine.js');
  return audio.init();
}

/**
 * Check if audio is ready
 * @returns {boolean} True if audio is initialized and enabled
 */
export function isAudioReady() {
  if (typeof window === 'undefined') return false;
  return window.ASDF?.audio?.isInitialized() && window.ASDF?.audio?.isEnabled();
}

// Version
export const VERSION = '1.0.0';
