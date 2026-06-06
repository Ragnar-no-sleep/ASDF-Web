/**
 * ASDF Sound Plugin
 * Modular audio management system for the Arcade Kernel.
 *
 * Responsibilities:
 * - Load sound assets (via AssetPipeline)
 * - Play/Pause/Stop tracks
 * - Global volume control
 * - Dynamic mixing (SFX vs Music)
 */

'use strict';

(function () {
  const SoundPlugin = {
    name: 'SoundPlugin',
    sounds: new Map(),
    music: null,
    masterVolume: 0.5,

    init(kernel) {
      this.kernel = kernel;
      kernel.registerService('sound', this);

      // Auto-attach to game events
      kernel.on('game:score', () => this.play('click', 0.2));
      kernel.on('game:error', () => this.play('error', 0.5));
    },

    /**
     * Play a sound effect
     * @param {string} id
     * @param {number} volume
     */
    play(id, volume = 1.0) {
      const sound = this.sounds.get(id);
      if (sound) {
        sound.volume = volume * this.masterVolume;
        sound.currentTime = 0;
        sound.play().catch(e => console.warn('[SoundPlugin] Autoplay blocked or failed:', e));
      }
    },

    /**
     * Register sounds from the pipeline
     */
    registerSounds(soundMap) {
      Object.entries(soundMap).forEach(([id, audio]) => {
        this.sounds.set(id, audio);
      });
    },

    setVolume(value) {
      this.masterVolume = Math.max(0, Math.min(1, value));
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.SoundPlugin = SoundPlugin;
})();
