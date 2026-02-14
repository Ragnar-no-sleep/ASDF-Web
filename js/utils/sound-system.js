/**
 * ASDF Sound System
 * Contextual audio feedback with Web Audio API
 *
 * Features:
 * - Synthesized sounds (no audio files needed)
 * - Volume control (0-100%)
 * - Global toggle (ON/OFF)
 * - Persistent settings (localStorage)
 * - Multiple sound types (click, hover, success, error, burn, stake)
 *
 * Usage:
 *   import { soundSystem } from './utils/sound-system.js';
 *   soundSystem.play('click');
 *   soundSystem.setVolume(50);
 *   soundSystem.toggle(false);
 */

class SoundSystem {
  constructor() {
    this.audioContext = null;
    this.enabled = this.loadSetting('enabled', false); // Default OFF
    this.volume = this.loadSetting('volume', 30); // Default 30%
    this.sounds = {};

    // Initialize on first user interaction (required by browsers)
    this.initialized = false;
    this.initOnInteraction();
  }

  /**
   * Initialize AudioContext on first user interaction
   */
  initOnInteraction() {
    const init = () => {
      if (!this.initialized) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;
        console.log('🔊 Sound system initialized');
      }
      document.removeEventListener('click', init);
      document.removeEventListener('keydown', init);
    };

    document.addEventListener('click', init, { once: true });
    document.addEventListener('keydown', init, { once: true });
  }

  /**
   * Load setting from localStorage
   */
  loadSetting(key, defaultValue) {
    const stored = localStorage.getItem(`asdf_sound_${key}`);
    return stored !== null ? JSON.parse(stored) : defaultValue;
  }

  /**
   * Save setting to localStorage
   */
  saveSetting(key, value) {
    localStorage.setItem(`asdf_sound_${key}`, JSON.stringify(value));
  }

  /**
   * Play a sound by type
   * @param {string} type - Sound type (click, hover, success, error, burn, stake)
   * @param {Object} options - Override options
   */
  play(type, options = {}) {
    if (!this.enabled || !this.initialized) return;

    const soundConfig = this.getSoundConfig(type);
    if (!soundConfig) {
      console.warn(`Unknown sound type: ${type}`);
      return;
    }

    const config = { ...soundConfig, ...options };
    this.playTone(config);
  }

  /**
   * Get sound configuration by type
   */
  getSoundConfig(type) {
    const configs = {
      // UI Interactions
      click: {
        frequency: 800,
        duration: 0.05,
        type: 'sine',
        volume: 0.3,
      },
      hover: {
        frequency: 600,
        duration: 0.03,
        type: 'sine',
        volume: 0.15,
      },

      // Feedback
      success: {
        frequencies: [523, 659, 784], // C-E-G chord
        duration: 0.15,
        type: 'sine',
        volume: 0.4,
        delay: 0.05,
      },
      error: {
        frequencies: [300, 250], // Dissonant
        duration: 0.1,
        type: 'square',
        volume: 0.3,
        delay: 0.05,
      },

      // Actions
      burn: {
        frequency: 200,
        duration: 0.3,
        type: 'sawtooth',
        volume: 0.35,
        sweep: { start: 200, end: 100 }, // Descending
      },
      stake: {
        frequency: 600,
        duration: 0.2,
        type: 'triangle',
        volume: 0.3,
        sweep: { start: 400, end: 800 }, // Ascending (lock)
      },
      unstake: {
        frequency: 800,
        duration: 0.2,
        type: 'triangle',
        volume: 0.3,
        sweep: { start: 800, end: 400 }, // Descending (unlock)
      },

      // Special
      notification: {
        frequencies: [659, 784], // E-G
        duration: 0.1,
        type: 'sine',
        volume: 0.35,
        delay: 0.1,
      },
      whoosh: {
        frequency: 1200,
        duration: 0.15,
        type: 'sine',
        volume: 0.2,
        sweep: { start: 1200, end: 400 },
      },
    };

    return configs[type];
  }

  /**
   * Play a tone with given configuration
   */
  playTone(config) {
    const now = this.audioContext.currentTime;
    const masterVolume = this.volume / 100;

    // Single frequency
    if (config.frequency) {
      this.playOscillator(config, now, masterVolume);
    }

    // Multiple frequencies (chord)
    if (config.frequencies) {
      config.frequencies.forEach((freq, index) => {
        const delay = config.delay ? index * config.delay : 0;
        this.playOscillator({ ...config, frequency: freq }, now + delay, masterVolume);
      });
    }
  }

  /**
   * Play a single oscillator
   */
  playOscillator(config, startTime, masterVolume) {
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = config.type || 'sine';
    oscillator.frequency.value = config.frequency;

    // Frequency sweep (if configured)
    if (config.sweep) {
      oscillator.frequency.setValueAtTime(config.sweep.start, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        config.sweep.end,
        startTime + config.duration
      );
    }

    // Volume envelope (fade in/out)
    const volume = (config.volume || 0.5) * masterVolume;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01); // Fast attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration); // Smooth decay

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + config.duration);
  }

  /**
   * Toggle sound system ON/OFF
   * @param {boolean} enabled - true to enable, false to disable
   */
  toggle(enabled) {
    this.enabled = enabled;
    this.saveSetting('enabled', enabled);
    console.log(`🔊 Sound ${enabled ? 'enabled' : 'disabled'}`);

    // Play confirmation sound when enabling
    if (enabled && this.initialized) {
      this.play('click');
    }
  }

  /**
   * Set volume (0-100)
   * @param {number} volume - Volume percentage
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(100, volume));
    this.saveSetting('volume', this.volume);
    console.log(`🔊 Volume set to ${this.volume}%`);
  }

  /**
   * Get current settings
   */
  getSettings() {
    return {
      enabled: this.enabled,
      volume: this.volume,
    };
  }
}

// Singleton instance
export const soundSystem = new SoundSystem();

// ============================================
// AUTO-INTEGRATION WITH INTERACTIONS
// ============================================

/**
 * Auto-attach sounds to interactive elements
 * @param {Object} options - Configuration
 */
export function initSounds(options = {}) {
  const defaults = {
    clickSelector: 'button, .btn, a, .ripple-trigger',
    hoverSelector: 'button, .btn, .card, .hover-scale',
    attachClick: true,
    attachHover: false, // Disabled by default (can be annoying)
  };

  const config = { ...defaults, ...options };

  // Click sounds
  if (config.attachClick) {
    document.addEventListener('click', e => {
      const target = e.target.closest(config.clickSelector);
      if (target) {
        soundSystem.play('click');
      }
    });
  }

  // Hover sounds (optional)
  if (config.attachHover) {
    document.querySelectorAll(config.hoverSelector).forEach(el => {
      el.addEventListener(
        'mouseenter',
        () => {
          soundSystem.play('hover');
        },
        { passive: true }
      );
    });
  }

  console.log('🔊 Sound system auto-integration active');
}

// ============================================
// SETTINGS UI COMPONENT
// ============================================

/**
 * Creates a settings control UI
 * @param {HTMLElement} container - Container to append to
 */
export function createSoundSettingsUI(container) {
  const settings = soundSystem.getSettings();

  const ui = document.createElement('div');
  ui.className = 'sound-settings';
  ui.innerHTML = `
    <div class="sound-settings-header">
      <span class="sound-settings-label">🔊 Sound Effects</span>
      <label class="sound-toggle">
        <input type="checkbox" id="soundToggle" ${settings.enabled ? 'checked' : ''}>
        <span class="sound-toggle-slider"></span>
      </label>
    </div>
    <div class="sound-settings-volume" ${!settings.enabled ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
      <label for="soundVolume">Volume: <span id="volumeValue">${settings.volume}%</span></label>
      <input type="range" id="soundVolume" min="0" max="100" value="${settings.volume}" step="5">
    </div>
  `;

  // Event listeners
  const toggle = ui.querySelector('#soundToggle');
  const volumeSlider = ui.querySelector('#soundVolume');
  const volumeValue = ui.querySelector('#volumeValue');
  const volumeContainer = ui.querySelector('.sound-settings-volume');

  toggle.addEventListener('change', e => {
    const enabled = e.target.checked;
    soundSystem.toggle(enabled);
    volumeContainer.style.opacity = enabled ? '1' : '0.5';
    volumeContainer.style.pointerEvents = enabled ? 'auto' : 'none';
  });

  volumeSlider.addEventListener('input', e => {
    const volume = parseInt(e.target.value, 10);
    soundSystem.setVolume(volume);
    volumeValue.textContent = `${volume}%`;
  });

  volumeSlider.addEventListener('change', () => {
    soundSystem.play('click'); // Preview sound at new volume
  });

  container.appendChild(ui);
}

// ============================================
// CSS INJECTION (for settings UI)
// ============================================

const style = document.createElement('style');
style.textContent = `
  .sound-settings {
    padding: 16px;
    background: var(--color-bg-surface, rgba(255, 255, 255, 0.05));
    border: 1px solid var(--color-border-default, rgba(255, 255, 255, 0.1));
    border-radius: 12px;
    font-family: 'Inter', sans-serif;
  }

  .sound-settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .sound-settings-label {
    font-weight: 600;
    font-size: 14px;
    color: var(--color-text-primary, #ffffff);
  }

  .sound-toggle {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 24px;
  }

  .sound-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .sound-toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.2);
    transition: 0.3s;
    border-radius: 24px;
  }

  .sound-toggle-slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  .sound-toggle input:checked + .sound-toggle-slider {
    background-color: #22c55e;
  }

  .sound-toggle input:checked + .sound-toggle-slider:before {
    transform: translateX(24px);
  }

  .sound-settings-volume {
    margin-top: 12px;
    transition: opacity 0.3s ease;
  }

  .sound-settings-volume label {
    display: block;
    font-size: 13px;
    color: var(--color-text-secondary, rgba(255, 255, 255, 0.7));
    margin-bottom: 8px;
  }

  .sound-settings-volume input[type="range"] {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.2);
    outline: none;
    -webkit-appearance: none;
  }

  .sound-settings-volume input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff4500;
    cursor: pointer;
  }

  .sound-settings-volume input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ff4500;
    cursor: pointer;
    border: none;
  }

  #volumeValue {
    font-weight: 600;
    color: var(--color-fire, #ff4500);
  }
`;
document.head.appendChild(style);
