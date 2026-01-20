/**
 * ASDF-Web Audio Engine
 * Spatial audio feedback system using Web Audio API
 *
 * Pattern: Vibecraft + phi-derived frequencies
 * Philosophy: Every interaction deserves feedback. This is fine.
 *
 * @example
 * import { audio } from './audio/engine.js';
 *
 * // Initialize (call once on user interaction)
 * await audio.init();
 *
 * // Play sounds
 * audio.play('success');
 * audio.play('click', { volume: 0.5 });
 *
 * // Toggle audio
 * audio.toggle();
 *
 * @module audio/engine
 */

import { PROFILES, FREQUENCIES, PHI } from './profiles.js';

/**
 * AudioEngine class
 * Manages Web Audio synthesis for UI feedback
 */
class AudioEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;

    /** @type {GainNode|null} */
    this.masterGain = null;

    /** @type {boolean} */
    this.enabled = true;

    /** @type {number} Master volume (0-1) */
    this.volume = 0.3;

    /** @type {boolean} */
    this.initialized = false;

    /** @type {Map<string, number>} Cooldown tracking */
    this.cooldowns = new Map();

    /** @type {number} Minimum time between same sound (ms) */
    this.cooldownTime = 50;
  }

  /**
   * Initialize the audio context
   * Must be called after user interaction (browser policy)
   * @returns {Promise<boolean>} True if initialized successfully
   */
  async init() {
    if (this.initialized) return true;

    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Create master gain node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Handle autoplay policy
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.initialized = true;

      // Emit ready event if eventBus is available
      if (window.ASDF?.events) {
        window.ASDF.events.emit('audio:ready', { timestamp: Date.now() });
      }

      return true;
    } catch (error) {
      console.warn('[Audio] Failed to initialize:', error.message);
      return false;
    }
  }

  /**
   * Ensure audio context is running
   * Call this on user interaction to resume suspended context
   */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Play a sound by type
   * @param {string} type - Sound type (e.g., 'click', 'success', 'error')
   * @param {Object} options - Override options
   * @param {number} options.volume - Volume multiplier (0-1)
   * @param {number} options.freq - Override frequency
   * @param {number} options.duration - Override duration
   * @param {string} options.type - Override waveform type
   */
  play(type, options = {}) {
    // Early exit if disabled or not initialized
    if (!this.enabled || !this.ctx || !this.masterGain) {
      return;
    }

    // Check cooldown
    const now = Date.now();
    const lastPlayed = this.cooldowns.get(type) || 0;
    if (now - lastPlayed < this.cooldownTime) {
      return;
    }
    this.cooldowns.set(type, now);

    // Get profile or use defaults
    const profile = PROFILES[type] || PROFILES.click;

    // Merge options with profile
    const freq = options.freq || profile.freq;
    const duration = options.duration || profile.duration;
    const waveform = options.type || profile.type;
    const vol = (options.volume !== undefined ? options.volume : 1) * this.volume;

    // Create oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = waveform;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // ADSR envelope for natural sound
    const attackTime = 0.01;
    const decayTime = duration * 0.3;
    const sustainLevel = vol * 0.7;
    const releaseTime = duration * 0.5;

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + attackTime);
    gain.gain.linearRampToValueAtTime(
      sustainLevel,
      this.ctx.currentTime + attackTime + decayTime
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + duration
    );

    // Connect and play
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration + releaseTime);

    // Cleanup
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  /**
   * Play a sequence of notes
   * @param {Array<{type: string, delay: number}>} sequence - Notes to play
   */
  playSequence(sequence) {
    sequence.forEach(({ type, delay = 0 }) => {
      setTimeout(() => this.play(type), delay);
    });
  }

  /**
   * Play a chord (multiple notes at once)
   * @param {string[]} types - Array of sound types to play together
   * @param {Object} options - Options for all notes
   */
  playChord(types, options = {}) {
    types.forEach((type) => this.play(type, options));
  }

  /**
   * Set master volume
   * @param {number} vol - Volume level (0-1)
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Get current volume
   * @returns {number} Current volume (0-1)
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Toggle audio on/off
   * @returns {boolean} New enabled state
   */
  toggle() {
    this.enabled = !this.enabled;

    // Emit event if eventBus is available
    if (window.ASDF?.events) {
      window.ASDF.events.emit('audio:toggle', { enabled: this.enabled });
    }

    return this.enabled;
  }

  /**
   * Enable audio
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable audio
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Check if audio is enabled
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Check if audio is initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get audio context state
   * @returns {string} Context state ('suspended', 'running', 'closed')
   */
  getState() {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  /**
   * Cleanup resources
   */
  async dispose() {
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
      this.initialized = false;
    }
  }
}

// Singleton instance
export const audio = new AudioEngine();

// Export class for testing
export { AudioEngine };

// Export constants
export { PROFILES, FREQUENCIES, PHI };

// Global access for non-module scripts
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.audio = audio;

  // Auto-init on first user interaction
  const initOnInteraction = async () => {
    await audio.init();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('keydown', initOnInteraction);
    document.removeEventListener('touchstart', initOnInteraction);
  };

  document.addEventListener('click', initOnInteraction, { once: true });
  document.addEventListener('keydown', initOnInteraction, { once: true });
  document.addEventListener('touchstart', initOnInteraction, { once: true });
}
