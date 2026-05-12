/**
 * Space Shooter - Procedural Web Audio System
 *
 * 8 synthesized sounds: shoot, shoot_spread, enemy_hit, enemy_die, boss_phase, player_hit, powerup, nuke
 * Lazy AudioContext init on first play() call
 *
 * @module games/engines/spaceshooter/audio
 */

'use strict';

const SpaceAudio = {
  /**
   * Create audio system
   * @returns {Object} Audio manager
   */
  create() {
    let audioContext = null;
    let engineOsc = null;
    let engineGain = null;
    let masterGain = null;
    let volume = 0.3;

    const durations = {
      shoot: 55, // fib[9]
      shoot_spread: 89, // fib[11]
      enemy_hit: 89,
      enemy_die: 144, // fib[12]
      boss_phase: 610, // fib[14]
      player_hit: 233, // fib[13]
      powerup: 377, // fib[13]
      nuke: 1300, // 2*fib[7]
    };

    function initAudioContext() {
      if (audioContext) return audioContext;
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(audioContext.destination);
      return audioContext;
    }

    return {
      /**
       * Play a sound
       * @param {string} soundName
       */
      play(soundName) {
        const ctx = initAudioContext();
        if (!durations[soundName]) return;

        const now = ctx.currentTime;
        const duration = durations[soundName] / 1000;

        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.connect(gain);
          gain.connect(masterGain);

          switch (soundName) {
            case 'shoot':
              osc.frequency.setValueAtTime(400, now);
              osc.frequency.exponentialRampToValueAtTime(200, now + duration);
              gain.gain.setValueAtTime(0.3, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;

            case 'shoot_spread':
              osc.frequency.setValueAtTime(600, now);
              osc.frequency.exponentialRampToValueAtTime(300, now + duration);
              gain.gain.setValueAtTime(0.25, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;

            case 'enemy_hit':
              osc.frequency.setValueAtTime(300, now);
              osc.frequency.exponentialRampToValueAtTime(150, now + duration);
              gain.gain.setValueAtTime(0.2, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;

            case 'enemy_die':
              osc.frequency.setValueAtTime(200, now);
              osc.frequency.exponentialRampToValueAtTime(50, now + duration);
              gain.gain.setValueAtTime(0.25, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;

            case 'boss_phase':
              osc.frequency.setValueAtTime(100, now);
              osc.frequency.exponentialRampToValueAtTime(300, now + duration * 0.5);
              osc.frequency.exponentialRampToValueAtTime(100, now + duration);
              gain.gain.setValueAtTime(0.3, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;

            case 'player_hit':
              osc.frequency.setValueAtTime(100, now);
              osc.frequency.exponentialRampToValueAtTime(50, now + duration);
              gain.gain.setValueAtTime(0.35, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;

            case 'powerup':
              osc.frequency.setValueAtTime(800, now);
              osc.frequency.exponentialRampToValueAtTime(400, now + duration * 0.5);
              osc.frequency.exponentialRampToValueAtTime(800, now + duration);
              gain.gain.setValueAtTime(0.2, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;

            case 'nuke':
              osc.frequency.setValueAtTime(50, now);
              osc.frequency.exponentialRampToValueAtTime(500, now + duration * 0.2);
              osc.frequency.exponentialRampToValueAtTime(50, now + duration);
              gain.gain.setValueAtTime(0.4, now);
              gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
              break;
          }

          osc.start(now);
          osc.stop(now + duration);
        } catch {
          // AudioContext not available, silently fail
        }
      },

      /**
       * Start engine loop (thruster hum)
       */
      startEngineLoop() {
        const ctx = initAudioContext();
        if (engineOsc) return; // Already running

        try {
          engineOsc = ctx.createOscillator();
          engineGain = ctx.createGain();

          engineOsc.frequency.setValueAtTime(55, ctx.currentTime);
          // 3Hz LFO for tremolo
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.value = 3;
          lfoGain.gain.value = 20;
          lfo.connect(lfoGain);
          lfoGain.connect(engineOsc.frequency);

          engineGain.gain.value = 0.15;
          engineOsc.connect(engineGain);
          engineGain.connect(masterGain);

          engineOsc.start();
          lfo.start();
        } catch {
          // Silently fail if audio not available
        }
      },

      /**
       * Stop engine loop
       */
      stopEngineLoop() {
        if (engineOsc) {
          try {
            engineOsc.stop();
            engineOsc.disconnect();
          } catch {
            // Already stopped
          }
          engineOsc = null;
          engineGain = null;
        }
      },

      /**
       * Set volume (0-1)
       * @param {number} v
       */
      setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (masterGain) {
          masterGain.gain.value = volume;
        }
      },

      /**
       * Suspend audio context
       */
      suspend() {
        if (audioContext && audioContext.state !== 'suspended') {
          audioContext.suspend().catch(() => {});
        }
      },

      /**
       * Resume audio context
       */
      resume() {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }
      },
    };
  },
};

if (typeof window !== 'undefined') {
  window.SpaceAudio = SpaceAudio;
}
