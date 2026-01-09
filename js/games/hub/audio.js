/**
 * ASDF Hub - Valhalla Audio System
 *
 * Immersive audio with ambience, UI sounds, and notifications
 * Uses Web Audio API for low-latency playback
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// VALHALLA AUDIO MANAGER
// ============================================

const ValhallaAudio = {
    // Audio context
    context: null,

    // Master gain node
    masterGain: null,

    // Category gain nodes
    gains: {
        music: null,
        sfx: null,
        ambient: null
    },

    // Loaded audio buffers
    buffers: {},

    // Currently playing sources
    sources: {
        ambient: null,
        music: null
    },

    // Settings
    settings: {
        enabled: true,
        masterVolume: 0.7,
        musicVolume: 0.5,
        sfxVolume: 0.8,
        ambientVolume: 0.3
    },

    // Sound definitions
    sounds: {
        // UI Sounds
        click: { url: null, volume: 0.5, type: 'sfx' },
        hover: { url: null, volume: 0.2, type: 'sfx' },
        navigate: { url: null, volume: 0.6, type: 'sfx' },
        back: { url: null, volume: 0.5, type: 'sfx' },
        success: { url: null, volume: 0.7, type: 'sfx' },
        error: { url: null, volume: 0.6, type: 'sfx' },
        notification: { url: null, volume: 0.5, type: 'sfx' },

        // Game Sounds
        purchase: { url: null, volume: 0.8, type: 'sfx' },
        equip: { url: null, volume: 0.6, type: 'sfx' },
        achievement: { url: null, volume: 0.9, type: 'sfx' },
        levelUp: { url: null, volume: 1.0, type: 'sfx' },

        // Ambient
        ambient: { url: null, volume: 0.3, type: 'ambient', loop: true }
    },

    // Initialized flag
    initialized: false,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize audio system
     */
    init() {
        if (this.initialized) return;

        console.log('[ValhallaAudio] Initializing...');

        // Create audio context on user interaction (required by browsers)
        const initContext = () => {
            if (this.context) return;

            try {
                this.context = new (window.AudioContext || window.webkitAudioContext)();

                // Create master gain
                this.masterGain = this.context.createGain();
                this.masterGain.connect(this.context.destination);
                this.masterGain.gain.value = this.settings.masterVolume;

                // Create category gains
                this.gains.music = this.context.createGain();
                this.gains.music.connect(this.masterGain);
                this.gains.music.gain.value = this.settings.musicVolume;

                this.gains.sfx = this.context.createGain();
                this.gains.sfx.connect(this.masterGain);
                this.gains.sfx.gain.value = this.settings.sfxVolume;

                this.gains.ambient = this.context.createGain();
                this.gains.ambient.connect(this.masterGain);
                this.gains.ambient.gain.value = this.settings.ambientVolume;

                // Generate procedural sounds
                this.generateProceduralSounds();

                this.initialized = true;
                console.log('[ValhallaAudio] Context initialized');

            } catch (e) {
                console.error('[ValhallaAudio] Failed to create context:', e);
            }
        };

        // Initialize on first user interaction
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, initContext, { once: true });
        });

        // Load settings
        this.loadSettings();
    },

    /**
     * Generate procedural sound effects (no external files needed)
     */
    generateProceduralSounds() {
        // Click sound - short blip
        this.buffers.click = this.createToneBuffer(800, 0.05, 'sine', 0.5);

        // Hover sound - soft high tone
        this.buffers.hover = this.createToneBuffer(1200, 0.03, 'sine', 0.2);

        // Navigate sound - ascending sweep
        this.buffers.navigate = this.createSweepBuffer(400, 800, 0.15, 0.6);

        // Back sound - descending sweep
        this.buffers.back = this.createSweepBuffer(800, 400, 0.15, 0.5);

        // Success sound - happy chord
        this.buffers.success = this.createChordBuffer([523, 659, 784], 0.3, 0.7);

        // Error sound - dissonant
        this.buffers.error = this.createChordBuffer([200, 210], 0.2, 0.6);

        // Notification sound - bell-like
        this.buffers.notification = this.createBellBuffer(880, 0.4, 0.5);

        // Purchase sound - cash register
        this.buffers.purchase = this.createCashBuffer();

        // Equip sound - metallic
        this.buffers.equip = this.createMetallicBuffer();

        // Achievement sound - fanfare
        this.buffers.achievement = this.createFanfareBuffer();

        // Level up sound - ascending arpeggio
        this.buffers.levelUp = this.createArpeggioBuffer([262, 330, 392, 523], 0.5, 1.0);

        // Ambient - procedural wind/drone
        this.buffers.ambient = this.createAmbientBuffer(10);
    },

    // ============================================
    // PROCEDURAL SOUND GENERATION
    // ============================================

    /**
     * Create a simple tone buffer
     */
    createToneBuffer(freq, duration, type = 'sine', volume = 1) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 10); // Exponential decay

            let sample = 0;
            switch (type) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * freq * t);
                    break;
                case 'square':
                    sample = Math.sign(Math.sin(2 * Math.PI * freq * t));
                    break;
                case 'triangle':
                    sample = Math.asin(Math.sin(2 * Math.PI * freq * t)) * (2 / Math.PI);
                    break;
            }

            data[i] = sample * envelope * volume;
        }

        return buffer;
    },

    /**
     * Create frequency sweep buffer
     */
    createSweepBuffer(startFreq, endFreq, duration, volume = 1) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const progress = i / length;
            const freq = startFreq + (endFreq - startFreq) * progress;
            const envelope = Math.sin(Math.PI * progress); // Smooth envelope

            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
        }

        return buffer;
    },

    /**
     * Create chord buffer
     */
    createChordBuffer(frequencies, duration, volume = 1) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 5);

            let sample = 0;
            frequencies.forEach(freq => {
                sample += Math.sin(2 * Math.PI * freq * t);
            });

            data[i] = (sample / frequencies.length) * envelope * volume;
        }

        return buffer;
    },

    /**
     * Create bell-like buffer
     */
    createBellBuffer(freq, duration, volume = 1) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const harmonics = [1, 2, 2.4, 3, 4.2, 5.4];
        const amplitudes = [1, 0.6, 0.4, 0.25, 0.2, 0.15];

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 4);

            let sample = 0;
            harmonics.forEach((h, idx) => {
                sample += Math.sin(2 * Math.PI * freq * h * t) * amplitudes[idx];
            });

            data[i] = sample * envelope * volume * 0.3;
        }

        return buffer;
    },

    /**
     * Create cash register sound
     */
    createCashBuffer() {
        const sampleRate = this.context.sampleRate;
        const duration = 0.3;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 8);

            // Multiple metallic harmonics
            let sample = 0;
            sample += Math.sin(2 * Math.PI * 1800 * t) * 0.5;
            sample += Math.sin(2 * Math.PI * 2400 * t) * 0.3;
            sample += Math.sin(2 * Math.PI * 3200 * t) * 0.2;

            // Add click at start
            if (t < 0.02) {
                sample += (Math.random() * 2 - 1) * (1 - t / 0.02);
            }

            data[i] = sample * envelope * 0.5;
        }

        return buffer;
    },

    /**
     * Create metallic equip sound
     */
    createMetallicBuffer() {
        const sampleRate = this.context.sampleRate;
        const duration = 0.25;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 12);

            let sample = 0;
            sample += Math.sin(2 * Math.PI * 600 * t) * 0.4;
            sample += Math.sin(2 * Math.PI * 1200 * t) * 0.3;
            sample += Math.sin(2 * Math.PI * 2000 * t) * 0.2;
            sample += Math.sin(2 * Math.PI * 3500 * t) * 0.1;

            data[i] = sample * envelope * 0.6;
        }

        return buffer;
    },

    /**
     * Create fanfare for achievements
     */
    createFanfareBuffer() {
        const sampleRate = this.context.sampleRate;
        const duration = 0.8;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const notes = [
            { freq: 523, start: 0, dur: 0.15 },    // C5
            { freq: 659, start: 0.1, dur: 0.15 },  // E5
            { freq: 784, start: 0.2, dur: 0.15 },  // G5
            { freq: 1047, start: 0.3, dur: 0.4 }   // C6 (held)
        ];

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;

            notes.forEach(note => {
                if (t >= note.start && t < note.start + note.dur) {
                    const noteT = t - note.start;
                    const envelope = Math.sin(Math.PI * noteT / note.dur);
                    sample += Math.sin(2 * Math.PI * note.freq * noteT) * envelope * 0.3;
                }
            });

            data[i] = sample;
        }

        return buffer;
    },

    /**
     * Create arpeggio buffer
     */
    createArpeggioBuffer(frequencies, duration, volume = 1) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        const noteLength = duration / frequencies.length;

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const noteIndex = Math.min(Math.floor(t / noteLength), frequencies.length - 1);
            const noteT = t - (noteIndex * noteLength);
            const freq = frequencies[noteIndex];

            const envelope = Math.exp(-noteT * 4);
            data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * volume * 0.5;
        }

        return buffer;
    },

    /**
     * Create ambient drone buffer
     */
    createAmbientBuffer(duration) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(2, length, sampleRate); // Stereo
        const dataL = buffer.getChannelData(0);
        const dataR = buffer.getChannelData(1);

        // Low drone frequencies
        const baseFreq = 60;
        const freqs = [baseFreq, baseFreq * 1.5, baseFreq * 2];

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;

            let sampleL = 0;
            let sampleR = 0;

            freqs.forEach((freq, idx) => {
                // Slightly different frequencies for stereo width
                const freqL = freq * (1 + Math.sin(t * 0.1) * 0.01);
                const freqR = freq * (1 - Math.sin(t * 0.1) * 0.01);

                sampleL += Math.sin(2 * Math.PI * freqL * t) / (idx + 1);
                sampleR += Math.sin(2 * Math.PI * freqR * t) / (idx + 1);
            });

            // Add subtle noise
            const noise = (Math.random() * 2 - 1) * 0.02;

            // Slow amplitude modulation
            const mod = 0.8 + 0.2 * Math.sin(t * 0.3);

            dataL[i] = (sampleL * 0.15 + noise) * mod;
            dataR[i] = (sampleR * 0.15 + noise) * mod;
        }

        return buffer;
    },

    // ============================================
    // PLAYBACK
    // ============================================

    /**
     * Play a sound
     * @param {string} name - Sound name
     * @param {Object} options - Playback options
     */
    play(name, options = {}) {
        if (!this.initialized || !this.settings.enabled) return;
        if (!this.buffers[name]) {
            console.warn('[ValhallaAudio] Sound not found:', name);
            return;
        }

        const sound = this.sounds[name] || { volume: 1, type: 'sfx' };
        const gainNode = this.gains[sound.type] || this.gains.sfx;

        // Create source
        const source = this.context.createBufferSource();
        source.buffer = this.buffers[name];
        source.loop = options.loop || sound.loop || false;

        // Create gain for this sound
        const soundGain = this.context.createGain();
        soundGain.gain.value = (options.volume || sound.volume || 1);

        // Connect
        source.connect(soundGain);
        soundGain.connect(gainNode);

        // Play
        source.start(0);

        return source;
    },

    /**
     * Play ambient sound
     */
    playAmbient() {
        if (this.sources.ambient) return; // Already playing

        this.sources.ambient = this.play('ambient', { loop: true });
    },

    /**
     * Stop ambient sound
     */
    stopAmbient() {
        if (this.sources.ambient) {
            try {
                this.sources.ambient.stop();
            } catch (e) { /* intentionally empty */ }
            this.sources.ambient = null;
        }
    },

    // ============================================
    // VOLUME CONTROL
    // ============================================

    /**
     * Set volume for a category
     * @param {string} category - master, music, sfx, ambient
     * @param {number} value - 0 to 1
     */
    setVolume(category, value) {
        value = Math.max(0, Math.min(1, value));
        this.settings[category + 'Volume'] = value;

        if (category === 'master' && this.masterGain) {
            this.masterGain.gain.value = value;
        } else if (this.gains[category]) {
            this.gains[category].gain.value = value;
        }

        this.saveSettings();
    },

    /**
     * Get volume for a category
     */
    getVolume(category) {
        return this.settings[category + 'Volume'];
    },

    /**
     * Enable/disable audio
     */
    setEnabled(enabled) {
        this.settings.enabled = enabled;
        this.saveSettings();

        if (!enabled) {
            this.stopAmbient();
        }
    },

    /**
     * Check if audio is enabled
     */
    isEnabled() {
        return this.settings.enabled && this.initialized;
    },

    // ============================================
    // SETTINGS PERSISTENCE
    // ============================================

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem('asdf_audio_settings');
            if (stored) {
                Object.assign(this.settings, JSON.parse(stored));
            }
        } catch (e) {
            console.error('[ValhallaAudio] Failed to load settings:', e);
        }
    },

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('asdf_audio_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error('[ValhallaAudio] Failed to save settings:', e);
        }
    }
};

// Global export
if (typeof window !== 'undefined') {
    window.ValhallaAudio = ValhallaAudio;
}
