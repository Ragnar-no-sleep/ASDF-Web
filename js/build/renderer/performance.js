/**
 * Build V2 - Performance Manager
 * Adaptive quality, LOD management, and FPS monitoring
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// PERFORMANCE CONFIGURATION
// ============================================

const PERF_CONFIG = {
  // FPS thresholds
  targetFps: 60,
  minFps: 30,
  criticalFps: 20,

  // Quality presets
  presets: {
    ultra: {
      particles: { fire: 3000, snow: 15000 },
      shadows: true,
      postProcessing: true,
      bloom: 1.0,
      antiAlias: true,
      pixelRatio: window.devicePixelRatio
    },
    high: {
      particles: { fire: 2000, snow: 10000 },
      shadows: true,
      postProcessing: true,
      bloom: 0.8,
      antiAlias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 2)
    },
    medium: {
      particles: { fire: 1000, snow: 5000 },
      shadows: false,
      postProcessing: true,
      bloom: 0.5,
      antiAlias: true,
      pixelRatio: Math.min(window.devicePixelRatio, 1.5)
    },
    low: {
      particles: { fire: 500, snow: 2000 },
      shadows: false,
      postProcessing: false,
      bloom: 0,
      antiAlias: false,
      pixelRatio: 1
    },
    minimal: {
      particles: { fire: 200, snow: 500 },
      shadows: false,
      postProcessing: false,
      bloom: 0,
      antiAlias: false,
      pixelRatio: 1
    }
  },

  // Adaptation settings
  adaptation: {
    sampleSize: 60,       // FPS samples to average
    checkInterval: 1000,  // How often to check (ms)
    downgradeThreshold: 0.8, // Downgrade if FPS below target * this
    upgradeThreshold: 0.95   // Upgrade if FPS above target * this
  }
};

// ============================================
// PERFORMANCE MANAGER
// ============================================

const PerformanceManager = {
  /**
   * Current quality preset
   */
  currentPreset: 'high',

  /**
   * FPS tracking
   */
  fps: {
    current: 60,
    samples: [],
    lastTime: 0
  },

  /**
   * Adaptation state
   */
  adaptation: {
    enabled: true,
    lastCheck: 0,
    stableCount: 0,
    qualityLocked: false
  },

  /**
   * Callbacks
   */
  callbacks: {
    onQualityChange: null
  },

  /**
   * Initialize performance manager
   * @param {Object} options
   */
  init(options = {}) {
    // Detect initial quality based on device
    this.currentPreset = this.detectOptimalPreset();

    // Apply options
    if (options.preset) {
      this.currentPreset = options.preset;
    }

    if (options.onQualityChange) {
      this.callbacks.onQualityChange = options.onQualityChange;
    }

    this.adaptation.enabled = options.adaptiveQuality !== false;

    console.log(`[Performance] Initialized with preset: ${this.currentPreset}`);

    return this.getSettings();
  },

  /**
   * Detect optimal preset based on device capabilities
   * @returns {string}
   */
  detectOptimalPreset() {
    // Check for mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      .test(navigator.userAgent);

    if (isMobile) {
      return 'low';
    }

    // Check device memory (if available)
    if (navigator.deviceMemory) {
      if (navigator.deviceMemory >= 8) return 'ultra';
      if (navigator.deviceMemory >= 4) return 'high';
      if (navigator.deviceMemory >= 2) return 'medium';
      return 'low';
    }

    // Check hardware concurrency (cores)
    if (navigator.hardwareConcurrency) {
      if (navigator.hardwareConcurrency >= 8) return 'high';
      if (navigator.hardwareConcurrency >= 4) return 'medium';
      return 'low';
    }

    // Default to medium
    return 'medium';
  },

  /**
   * Update FPS tracking (call every frame)
   * @param {number} timestamp
   */
  tick(timestamp) {
    if (this.fps.lastTime > 0) {
      const delta = timestamp - this.fps.lastTime;
      const fps = 1000 / delta;

      // Add to samples
      this.fps.samples.push(fps);

      // Keep only recent samples
      if (this.fps.samples.length > PERF_CONFIG.adaptation.sampleSize) {
        this.fps.samples.shift();
      }

      // Calculate average
      this.fps.current = this.fps.samples.reduce((a, b) => a + b, 0) /
        this.fps.samples.length;
    }

    this.fps.lastTime = timestamp;

    // Check for adaptation
    if (this.adaptation.enabled &&
        timestamp - this.adaptation.lastCheck > PERF_CONFIG.adaptation.checkInterval) {
      this.checkAdaptation();
      this.adaptation.lastCheck = timestamp;
    }
  },

  /**
   * Check if quality should be adapted
   */
  checkAdaptation() {
    if (this.adaptation.qualityLocked) return;

    const { targetFps } = PERF_CONFIG;
    const { downgradeThreshold, upgradeThreshold } = PERF_CONFIG.adaptation;
    const presetOrder = ['minimal', 'low', 'medium', 'high', 'ultra'];
    const currentIndex = presetOrder.indexOf(this.currentPreset);

    // Check for downgrade
    if (this.fps.current < targetFps * downgradeThreshold) {
      this.adaptation.stableCount = 0;

      if (currentIndex > 0) {
        const newPreset = presetOrder[currentIndex - 1];
        console.log(`[Performance] Downgrading: ${this.currentPreset} -> ${newPreset} (FPS: ${this.fps.current.toFixed(1)})`);
        this.setPreset(newPreset);
      }
    }
    // Check for upgrade
    else if (this.fps.current > targetFps * upgradeThreshold) {
      this.adaptation.stableCount++;

      // Wait for stable FPS before upgrading
      if (this.adaptation.stableCount >= 5 && currentIndex < presetOrder.length - 1) {
        const newPreset = presetOrder[currentIndex + 1];
        console.log(`[Performance] Upgrading: ${this.currentPreset} -> ${newPreset} (FPS: ${this.fps.current.toFixed(1)})`);
        this.setPreset(newPreset);
        this.adaptation.stableCount = 0;
      }
    }
  },

  /**
   * Set quality preset
   * @param {string} preset
   */
  setPreset(preset) {
    if (!PERF_CONFIG.presets[preset]) {
      console.warn(`[Performance] Unknown preset: ${preset}`);
      return;
    }

    const oldPreset = this.currentPreset;
    this.currentPreset = preset;

    // Notify callback
    if (this.callbacks.onQualityChange) {
      this.callbacks.onQualityChange({
        oldPreset,
        newPreset: preset,
        settings: this.getSettings()
      });
    }
  },

  /**
   * Get current settings
   * @returns {Object}
   */
  getSettings() {
    return { ...PERF_CONFIG.presets[this.currentPreset] };
  },

  /**
   * Get particle counts for current preset
   * @returns {Object}
   */
  getParticleCounts() {
    const settings = this.getSettings();
    return settings.particles || { fire: 1000, snow: 5000 };
  },

  /**
   * Check if feature is enabled in current preset
   * @param {string} feature
   * @returns {boolean}
   */
  isFeatureEnabled(feature) {
    const settings = this.getSettings();
    return Boolean(settings[feature]);
  },

  /**
   * Lock quality at current level (disable adaptation)
   * @param {boolean} locked
   */
  lockQuality(locked = true) {
    this.adaptation.qualityLocked = locked;
  },

  /**
   * Enable/disable adaptive quality
   * @param {boolean} enabled
   */
  setAdaptive(enabled) {
    this.adaptation.enabled = enabled;
  },

  /**
   * Get current FPS
   * @returns {number}
   */
  getFps() {
    return Math.round(this.fps.current);
  },

  /**
   * Get performance stats
   * @returns {Object}
   */
  getStats() {
    return {
      fps: Math.round(this.fps.current),
      preset: this.currentPreset,
      adaptiveEnabled: this.adaptation.enabled,
      qualityLocked: this.adaptation.qualityLocked,
      samples: this.fps.samples.length
    };
  },

  /**
   * Reset stats
   */
  reset() {
    this.fps.samples = [];
    this.fps.current = 60;
    this.fps.lastTime = 0;
    this.adaptation.stableCount = 0;
  }
};

// ============================================
// LOD MANAGER
// ============================================

const LODManager = {
  /**
   * Registered LOD objects
   */
  objects: new Map(),

  /**
   * Camera reference
   */
  camera: null,

  /**
   * Initialize LOD manager
   * @param {THREE.Camera} camera
   */
  init(camera) {
    this.camera = camera;
    console.log('[LOD] Initialized');
  },

  /**
   * Register a LOD object
   * @param {string} id
   * @param {THREE.Object3D} object
   * @param {Array} levels - [{distance: number, detail: 'high'|'medium'|'low'}]
   */
  register(id, object, levels) {
    this.objects.set(id, {
      object,
      levels: levels.sort((a, b) => a.distance - b.distance),
      currentLevel: -1
    });
  },

  /**
   * Unregister a LOD object
   * @param {string} id
   */
  unregister(id) {
    this.objects.delete(id);
  },

  /**
   * Update LOD levels based on camera distance
   */
  update() {
    if (!this.camera) return;

    const cameraPos = this.camera.position;

    for (const [id, entry] of this.objects) {
      if (!entry.object || !entry.object.position) continue;

      const distance = cameraPos.distanceTo(entry.object.position);
      let newLevel = 0;

      // Find appropriate level
      for (let i = entry.levels.length - 1; i >= 0; i--) {
        if (distance >= entry.levels[i].distance) {
          newLevel = i;
          break;
        }
      }

      // Update if level changed
      if (newLevel !== entry.currentLevel) {
        entry.currentLevel = newLevel;
        const detail = entry.levels[newLevel].detail;

        // Emit LOD change (let renderer handle it)
        if (entry.object.userData.onLODChange) {
          entry.object.userData.onLODChange(detail);
        }
      }
    }
  },

  /**
   * Clear all registered objects
   */
  clear() {
    this.objects.clear();
  }
};

// ============================================
// MEMORY MANAGER
// ============================================

const MemoryManager = {
  /**
   * Track disposable resources
   */
  resources: {
    geometries: new Set(),
    materials: new Set(),
    textures: new Set()
  },

  /**
   * Register geometry for tracking
   * @param {THREE.BufferGeometry} geometry
   */
  trackGeometry(geometry) {
    this.resources.geometries.add(geometry);
  },

  /**
   * Register material for tracking
   * @param {THREE.Material} material
   */
  trackMaterial(material) {
    this.resources.materials.add(material);
  },

  /**
   * Register texture for tracking
   * @param {THREE.Texture} texture
   */
  trackTexture(texture) {
    this.resources.textures.add(texture);
  },

  /**
   * Dispose all tracked resources
   */
  disposeAll() {
    this.resources.geometries.forEach(g => g.dispose());
    this.resources.materials.forEach(m => m.dispose());
    this.resources.textures.forEach(t => t.dispose());

    this.resources.geometries.clear();
    this.resources.materials.clear();
    this.resources.textures.clear();

    console.log('[Memory] Disposed all tracked resources');
  },

  /**
   * Get memory usage stats
   * @returns {Object}
   */
  getStats() {
    return {
      geometries: this.resources.geometries.size,
      materials: this.resources.materials.size,
      textures: this.resources.textures.size
    };
  }
};

// ============================================
// EXPORTS
// ============================================

export {
  PERF_CONFIG,
  PerformanceManager,
  LODManager,
  MemoryManager
};

export default PerformanceManager;
