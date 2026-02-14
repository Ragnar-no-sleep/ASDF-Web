/**
 * ASDF Audio Feedback System
 * Phase 1: Visceral Feedback - Audio Component
 *
 * Provides auditory feedback for user interactions:
 * - Mechanical sounds (click, hover, whoosh)
 * - Success/error/warning chimes
 * - Volume control (0-100%)
 * - Global enable/disable toggle
 *
 * Usage:
 *   import { AudioFeedback } from './audio-feedback.js';
 *   AudioFeedback.play('click');
 *   AudioFeedback.setVolume(50);
 *   AudioFeedback.toggle(false);
 */

'use strict';

/**
 * Audio Context and Settings
 */
const AudioState = {
  enabled: true,
  volume: 70, // 0-100
  context: null,
  masterGain: null,
};

/**
 * Initialize Web Audio API
 * @returns {boolean} Success status
 */
function initAudioContext() {
  if (AudioState.context) return true;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    AudioState.context = new AudioContext();
    AudioState.masterGain = AudioState.context.createGain();
    AudioState.masterGain.connect(AudioState.context.destination);
    updateMasterVolume();
    return true;
  } catch (err) {
    console.warn('Web Audio API not supported:', err);
    return false;
  }
}

/**
 * Update master gain node volume
 */
function updateMasterVolume() {
  if (!AudioState.masterGain) return;
  // Convert 0-100 to 0-1, with exponential curve for better perception
  const normalizedVolume = AudioState.volume / 100;
  AudioState.masterGain.gain.value = normalizedVolume * normalizedVolume;
}

/**
 * Sound Synthesis Functions
 * Using Web Audio API to generate sounds procedurally (no external files needed)
 */

/**
 * Play a click sound (mechanical, sharp)
 * @param {AudioContext} ctx - Audio context
 * @param {GainNode} destination - Destination node
 */
function playClick(ctx, destination) {
  const now = ctx.currentTime;

  // White noise burst for click
  const bufferSize = ctx.sampleRate * 0.05; // 50ms
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 10;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  noise.start(now);
  noise.stop(now + 0.05);
}

/**
 * Play a hover sound (soft whoosh)
 * @param {AudioContext} ctx - Audio context
 * @param {GainNode} destination - Destination node
 */
function playHover(ctx, destination) {
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

/**
 * Play a whoosh sound (fast swipe)
 * @param {AudioContext} ctx - Audio context
 * @param {GainNode} destination - Destination node
 */
function playWhoosh(ctx, destination) {
  const now = ctx.currentTime;

  // Sweep from high to low
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(2000, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.2);
  filter.Q.value = 5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Play a success chime (ascending, bright)
 * @param {AudioContext} ctx - Audio context
 * @param {GainNode} destination - Destination node
 */
function playSuccess(ctx, destination) {
  const now = ctx.currentTime;

  // Three-note ascending chord
  const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const startTime = now + i * 0.08;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + 0.3);
  });
}

/**
 * Play an error chime (descending, ominous)
 * @param {AudioContext} ctx - Audio context
 * @param {GainNode} destination - Destination node
 */
function playError(ctx, destination) {
  const now = ctx.currentTime;

  // Two-note descending interval
  const frequencies = [392.0, 293.66]; // G4, D4

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    const startTime = now + i * 0.12;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

/**
 * Play a warning chime (neutral, attention-grabbing)
 * @param {AudioContext} ctx - Audio context
 * @param {GainNode} destination - Destination node
 */
function playWarning(ctx, destination) {
  const now = ctx.currentTime;

  // Single sustained note with vibrato
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 440; // A4

  const vibrato = ctx.createOscillator();
  vibrato.type = 'sine';
  vibrato.frequency.value = 5; // 5 Hz vibrato

  const vibratoGain = ctx.createGain();
  vibratoGain.gain.value = 10;

  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  osc.connect(gain);
  gain.connect(destination);

  vibrato.start(now);
  osc.start(now);
  vibrato.stop(now + 0.5);
  osc.stop(now + 0.5);
}

/**
 * Play a burn sound (crackling fire)
 * @param {AudioContext} ctx - Audio context
 * @param {GainNode} destination - Destination node
 */
function playBurn(ctx, destination) {
  const now = ctx.currentTime;

  // Filtered noise for crackling effect
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 3;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);

  noise.start(now);
  noise.stop(now + 0.3);
}

/**
 * Sound type mapping
 */
const SOUNDS = {
  click: playClick,
  hover: playHover,
  whoosh: playWhoosh,
  success: playSuccess,
  error: playError,
  warning: playWarning,
  burn: playBurn,
};

/**
 * Audio Feedback Public API
 */
export const AudioFeedback = {
  /**
   * Play a sound
   * @param {string} soundType - Type of sound (click, hover, success, error, etc.)
   * @returns {boolean} Success status
   */
  play(soundType) {
    if (!AudioState.enabled) return false;
    if (!SOUNDS[soundType]) {
      console.warn(`Unknown sound type: ${soundType}`);
      return false;
    }

    if (!initAudioContext()) return false;

    // Resume audio context if suspended (browser autoplay policy)
    if (AudioState.context.state === 'suspended') {
      AudioState.context.resume();
    }

    SOUNDS[soundType](AudioState.context, AudioState.masterGain);
    return true;
  },

  /**
   * Set volume (0-100)
   * @param {number} volume - Volume level (0-100)
   */
  setVolume(volume) {
    AudioState.volume = Math.max(0, Math.min(100, volume));
    updateMasterVolume();
    this.saveSettings();
  },

  /**
   * Get current volume
   * @returns {number} Current volume (0-100)
   */
  getVolume() {
    return AudioState.volume;
  },

  /**
   * Enable or disable audio
   * @param {boolean} enabled - Enable state
   */
  toggle(enabled) {
    AudioState.enabled = enabled;
    this.saveSettings();
  },

  /**
   * Check if audio is enabled
   * @returns {boolean} Enabled state
   */
  isEnabled() {
    return AudioState.enabled;
  },

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      localStorage.setItem(
        'asdf-audio-settings',
        JSON.stringify({
          enabled: AudioState.enabled,
          volume: AudioState.volume,
        })
      );
    } catch (err) {
      console.warn('Failed to save audio settings:', err);
    }
  },

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('asdf-audio-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        AudioState.enabled = settings.enabled !== undefined ? settings.enabled : true;
        AudioState.volume = settings.volume !== undefined ? settings.volume : 70;
        updateMasterVolume();
      }
    } catch (err) {
      console.warn('Failed to load audio settings:', err);
    }
  },

  /**
   * Initialize audio system with user interaction
   * Call this on first user click/touch to unlock audio
   */
  init() {
    this.loadSettings();
    initAudioContext();
  },
};

// Auto-load settings on module import
AudioFeedback.loadSettings();

// Browser global export for debugging
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.AudioFeedback = AudioFeedback;
}

export default AudioFeedback;
