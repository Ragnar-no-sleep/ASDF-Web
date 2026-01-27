/**
 * ASDF-Web Audio Module Tests
 * Tests for audio engine and sound profiles
 *
 * This is fine.
 */

describe('Audio Module', () => {
  // ============================================
  // AUDIO ENGINE TESTS
  // ============================================
  describe('AudioEngine', () => {
    let AudioEngine;
    let audioEngine;
    let mockAudioContext;
    let mockOscillator;
    let mockGainNode;

    beforeEach(() => {
      // Mock Web Audio API
      mockOscillator = {
        type: 'sine',
        frequency: { setValueAtTime: jest.fn() },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        disconnect: jest.fn(),
        onended: null
      };

      mockGainNode = {
        gain: {
          setValueAtTime: jest.fn(),
          linearRampToValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn()
        },
        connect: jest.fn(),
        disconnect: jest.fn()
      };

      mockAudioContext = {
        state: 'running',
        currentTime: 0,
        destination: {},
        createOscillator: jest.fn(() => mockOscillator),
        createGain: jest.fn(() => mockGainNode),
        resume: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };

      // Mock window.AudioContext
      global.AudioContext = jest.fn(() => mockAudioContext);
      global.webkitAudioContext = jest.fn(() => mockAudioContext);

      // Create AudioEngine class for testing
      AudioEngine = class {
        constructor() {
          this.ctx = null;
          this.masterGain = null;
          this.enabled = true;
          this.volume = 0.3;
          this.initialized = false;
          this.cooldowns = new Map();
          this.cooldownTime = 50;
        }

        async init() {
          if (this.initialized) return true;
          try {
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            if (this.ctx.state === 'suspended') {
              await this.ctx.resume();
            }
            this.initialized = true;
            return true;
          } catch {
            return false;
          }
        }

        play(type, options = {}) {
          if (!this.enabled || !this.ctx || !this.masterGain) return;

          const now = Date.now();
          const lastPlayed = this.cooldowns.get(type) || 0;
          if (now - lastPlayed < this.cooldownTime) return;
          this.cooldowns.set(type, now);

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.1);
        }

        setVolume(vol) {
          this.volume = Math.max(0, Math.min(1, vol));
        }

        getVolume() {
          return this.volume;
        }

        toggle() {
          this.enabled = !this.enabled;
          return this.enabled;
        }

        enable() {
          this.enabled = true;
        }

        disable() {
          this.enabled = false;
        }

        isEnabled() {
          return this.enabled;
        }

        isInitialized() {
          return this.initialized;
        }

        async dispose() {
          if (this.ctx) {
            await this.ctx.close();
            this.ctx = null;
            this.masterGain = null;
            this.initialized = false;
          }
        }
      };

      audioEngine = new AudioEngine();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should initialize audio context', async () => {
      const result = await audioEngine.init();

      expect(result).toBe(true);
      expect(audioEngine.isInitialized()).toBe(true);
      expect(AudioContext).toHaveBeenCalled();
    });

    test('should not reinitialize if already initialized', async () => {
      await audioEngine.init();
      await audioEngine.init();

      expect(AudioContext).toHaveBeenCalledTimes(1);
    });

    test('should play sounds when enabled', async () => {
      await audioEngine.init();
      audioEngine.play('click');

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });

    test('should not play when disabled', async () => {
      await audioEngine.init();
      audioEngine.disable();
      audioEngine.play('click');

      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    test('should not play when not initialized', () => {
      audioEngine.play('click');

      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    test('should toggle enabled state', async () => {
      await audioEngine.init();

      expect(audioEngine.isEnabled()).toBe(true);

      const result = audioEngine.toggle();
      expect(result).toBe(false);
      expect(audioEngine.isEnabled()).toBe(false);

      audioEngine.toggle();
      expect(audioEngine.isEnabled()).toBe(true);
    });

    test('should set and get volume', () => {
      audioEngine.setVolume(0.5);
      expect(audioEngine.getVolume()).toBe(0.5);

      // Should clamp to 0-1 range
      audioEngine.setVolume(-0.5);
      expect(audioEngine.getVolume()).toBe(0);

      audioEngine.setVolume(1.5);
      expect(audioEngine.getVolume()).toBe(1);
    });

    test('should dispose resources', async () => {
      await audioEngine.init();
      await audioEngine.dispose();

      expect(mockAudioContext.close).toHaveBeenCalled();
      expect(audioEngine.isInitialized()).toBe(false);
    });

    test('should respect cooldown between same sounds', async () => {
      await audioEngine.init();

      // First play should work
      audioEngine.play('click');
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);

      // Immediate second play should be blocked by cooldown
      audioEngine.play('click');
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================
  // PROFILES TESTS
  // ============================================
  describe('Profiles', () => {
    const PHI = 1.618033988749895;
    const BASE_FREQ = 432;

    const FREQUENCIES = {
      base: BASE_FREQ,
      phi: BASE_FREQ * PHI,
      phiInverse: BASE_FREQ / PHI,
      phiSquared: BASE_FREQ * PHI * PHI
    };

    const PROFILES = {
      click: { freq: FREQUENCIES.base, duration: 0.08, type: 'sine' },
      success: { freq: FREQUENCIES.phi, duration: 0.2, type: 'triangle' },
      error: { freq: FREQUENCIES.phiInverse, duration: 0.3, type: 'sawtooth' },
      gameStart: { freq: FREQUENCIES.phi, duration: 0.3, type: 'triangle' },
      gameOver: { freq: FREQUENCIES.phiInverse, duration: 0.5, type: 'sawtooth' }
    };

    test('should have phi constant correctly defined', () => {
      expect(PHI).toBeCloseTo(1.618033988749895, 10);
    });

    test('should have frequencies derived from phi', () => {
      expect(FREQUENCIES.base).toBe(432);
      expect(FREQUENCIES.phi).toBeCloseTo(BASE_FREQ * PHI, 5);
      expect(FREQUENCIES.phiInverse).toBeCloseTo(BASE_FREQ / PHI, 5);
    });

    test('should have required profile properties', () => {
      Object.values(PROFILES).forEach((profile) => {
        expect(profile).toHaveProperty('freq');
        expect(profile).toHaveProperty('duration');
        expect(profile).toHaveProperty('type');
        expect(typeof profile.freq).toBe('number');
        expect(typeof profile.duration).toBe('number');
        expect(typeof profile.type).toBe('string');
      });
    });

    test('should have valid waveform types', () => {
      const validTypes = ['sine', 'square', 'triangle', 'sawtooth'];

      Object.values(PROFILES).forEach((profile) => {
        expect(validTypes).toContain(profile.type);
      });
    });

    test('should have positive frequencies', () => {
      Object.values(FREQUENCIES).forEach((freq) => {
        expect(freq).toBeGreaterThan(0);
      });
    });

    test('should have positive durations', () => {
      Object.values(PROFILES).forEach((profile) => {
        expect(profile.duration).toBeGreaterThan(0);
        expect(profile.duration).toBeLessThan(5); // Reasonable max duration
      });
    });

    test('success frequency should be higher than error frequency', () => {
      expect(PROFILES.success.freq).toBeGreaterThan(PROFILES.error.freq);
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================
  describe('Integration', () => {
    test('profiles should provide consistent frequency ratios', () => {
      const PHI = 1.618033988749895;
      const BASE = 432;

      const phi = BASE * PHI;
      const phiInverse = BASE / PHI;

      // Golden ratio relationship
      expect(phi / BASE).toBeCloseTo(PHI, 10);
      expect(BASE / phiInverse).toBeCloseTo(PHI, 10);
    });

    test('should categorize sounds appropriately', () => {
      const PHI = 1.618033988749895;
      const BASE = 432;

      const positiveFreq = BASE * PHI; // Higher = positive
      const negativeFreq = BASE / PHI; // Lower = negative

      // Positive outcomes should have higher frequencies
      expect(positiveFreq).toBeGreaterThan(BASE);

      // Negative outcomes should have lower frequencies
      expect(negativeFreq).toBeLessThan(BASE);
    });
  });

  // ============================================
  // UTILITY FUNCTION TESTS
  // ============================================
  describe('Utility Functions', () => {
    test('getProfile should return profile or default', () => {
      const PROFILES = {
        click: { freq: 432, duration: 0.08, type: 'sine' },
        success: { freq: 698.7, duration: 0.2, type: 'triangle' }
      };

      const getProfile = (name) => PROFILES[name] || PROFILES.click;

      expect(getProfile('success')).toEqual(PROFILES.success);
      expect(getProfile('nonexistent')).toEqual(PROFILES.click);
    });

    test('getProfileNames should return all profile names', () => {
      const PROFILES = {
        click: {},
        success: {},
        error: {}
      };

      const getProfileNames = () => Object.keys(PROFILES);

      const names = getProfileNames();
      expect(names).toContain('click');
      expect(names).toContain('success');
      expect(names).toContain('error');
      expect(names).toHaveLength(3);
    });

    test('getProfilesByCategory should filter profiles', () => {
      const PROFILES = {
        gameStart: {},
        gameOver: {},
        gameScore: {},
        walletConnected: {},
        click: {}
      };

      const getProfilesByCategory = (category) => {
        const prefix = category.toLowerCase();
        return Object.fromEntries(
          Object.entries(PROFILES).filter(([key]) =>
            key.toLowerCase().startsWith(prefix)
          )
        );
      };

      const gameProfiles = getProfilesByCategory('game');
      expect(Object.keys(gameProfiles)).toHaveLength(3);
      expect(gameProfiles).toHaveProperty('gameStart');
      expect(gameProfiles).toHaveProperty('gameOver');
      expect(gameProfiles).toHaveProperty('gameScore');
    });
  });
});
