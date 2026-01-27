/**
 * ASDF Hub - Settings Module
 *
 * User preferences, notifications, and configuration
 *
 * @version 1.0.1
 * @security Data validation for settings
 */

'use strict';

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate a setting value against its expected type
 * @param {string} key - Setting key
 * @param {*} value - Value to validate
 * @param {Object} defaults - Default settings object
 * @returns {*} Validated value or default
 */
function validateSettingValue(key, value, defaults) {
  const defaultValue = defaults[key];
  if (defaultValue === undefined) {
    return undefined; // Unknown key
  }

  const expectedType = typeof defaultValue;

  switch (expectedType) {
    case 'boolean':
      return typeof value === 'boolean' ? value : defaultValue;

    case 'number':
      const num = Number(value);
      if (!Number.isFinite(num)) return defaultValue;
      // For volume settings, clamp to 0-1
      if (key.includes('Volume')) {
        return Math.max(0, Math.min(1, num));
      }
      return num;

    case 'string':
      if (typeof value !== 'string') return defaultValue;
      // Validate language codes
      if (key === 'language') {
        const validLangs = ['en', 'fr', 'es', 'de', 'jp'];
        return validLangs.includes(value) ? value : 'en';
      }
      // Validate theme
      if (key === 'theme') {
        const validThemes = ['dark', 'light'];
        return validThemes.includes(value) ? value : 'dark';
      }
      // Validate default currency
      if (key === 'defaultCurrency') {
        const validCurrencies = ['burn', 'coins'];
        return validCurrencies.includes(value) ? value : 'burn';
      }
      // Limit string length for safety
      return value.slice(0, 50);

    default:
      return defaultValue;
  }
}

// ============================================
// SETTINGS MANAGER
// ============================================

const Settings = {
  // Storage key
  STORAGE_KEY: 'asdf_settings',

  // Default settings
  defaults: {
    // Visual
    theme: 'dark',
    animations: true,
    particles: true,
    reducedMotion: false,

    // Audio
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    ambientEnabled: true,
    uiSoundsEnabled: true,

    // Notifications
    notifyGameEvents: true,
    notifyShopDeals: true,
    notifyAchievements: true,
    notifySystem: true,

    // Gameplay
    autoSave: true,
    showTutorials: true,

    // Shop & Cosmetics
    confirmPurchases: true,
    shopParticles: true,
    autoEquipPurchases: false,
    defaultCurrency: 'burn',

    // Privacy
    shareStats: false,
    analyticsEnabled: true,

    // Language
    language: 'en',
  },

  // Current settings
  current: {},

  // DOM elements
  elements: {},

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Initialize settings
   */
  init() {
    console.log('[Settings] Initializing...');

    // Load settings
    this.load();

    // Cache elements
    this.cacheElements();

    // Setup event listeners
    this.setupEvents();

    // Apply settings
    this.applyAll();

    // Render UI
    this.render();
  },

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      container: document.getElementById('settings-section'),
    };

    // Cache all setting controls
    document.querySelectorAll('[data-setting]').forEach(el => {
      const key = el.dataset.setting;
      this.elements[key] = el;
    });
  },

  /**
   * Setup event listeners
   */
  setupEvents() {
    // Toggle switches
    document.querySelectorAll('.toggle-switch[data-setting]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.dataset.setting;
        const newValue = this.toggle(key);
        el.classList.toggle('active');
        // Update ARIA state for accessibility
        el.setAttribute('aria-checked', String(newValue));
        this.playFeedback();
      });
      // Handle keyboard activation (Enter/Space)
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.click();
        }
      });
    });

    // Sliders
    document.querySelectorAll('.settings-slider[data-setting]').forEach(el => {
      el.addEventListener('input', e => {
        const key = el.dataset.setting;
        const value = parseFloat(e.target.value);
        this.set(key, value);
        // Update ARIA state for accessibility
        el.setAttribute('aria-valuenow', String(value));
      });

      el.addEventListener('change', () => {
        this.playFeedback();
      });
    });

    // Selects
    document.querySelectorAll('.settings-select[data-setting]').forEach(el => {
      el.addEventListener('change', e => {
        const key = el.dataset.setting;
        this.set(key, e.target.value);
        this.playFeedback();
      });
    });

    // Reset button
    const resetBtn = document.getElementById('settings-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset all settings to defaults?')) {
          this.resetAll();
        }
      });
    }

    // Export data button
    const exportBtn = document.getElementById('settings-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportData();
      });
    }

    // Clear data button
    const clearBtn = document.getElementById('settings-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('This will delete all your local data. Are you sure?')) {
          this.clearAllData();
        }
      });
    }
  },

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  /**
   * Load settings from localStorage with validation
   */
  load() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        let parsed;
        try {
          parsed = JSON.parse(stored);
        } catch (parseError) {
          console.warn('[Settings] Corrupted settings data, using defaults');
          localStorage.removeItem(this.STORAGE_KEY);
          this.current = { ...this.defaults };
          return;
        }

        // Validate each setting
        this.current = { ...this.defaults };
        if (parsed && typeof parsed === 'object') {
          for (const key of Object.keys(this.defaults)) {
            if (key in parsed) {
              const validatedValue = validateSettingValue(key, parsed[key], this.defaults);
              if (validatedValue !== undefined) {
                this.current[key] = validatedValue;
              }
            }
          }
        }
      } else {
        this.current = { ...this.defaults };
      }
    } catch (e) {
      console.error('[Settings] Failed to load:', e);
      this.current = { ...this.defaults };
    }

    console.log('[Settings] Loaded (validated):', this.current);
  },

  /**
   * Save settings to localStorage
   */
  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.current));
      console.log('[Settings] Saved');
    } catch (e) {
      console.error('[Settings] Failed to save:', e);
    }
  },

  /**
   * Get a setting value
   */
  get(key) {
    // Only allow known keys
    if (!(key in this.defaults)) {
      console.warn('[Settings] Unknown setting key:', key);
      return undefined;
    }
    return this.current[key] ?? this.defaults[key];
  },

  /**
   * Set a setting value (with validation)
   */
  set(key, value) {
    // Only allow known keys
    if (!(key in this.defaults)) {
      console.warn('[Settings] Cannot set unknown key:', key);
      return false;
    }

    // Validate value
    const validatedValue = validateSettingValue(key, value, this.defaults);
    if (validatedValue === undefined) {
      console.warn('[Settings] Invalid value for', key);
      return false;
    }

    this.current[key] = validatedValue;
    this.save();
    this.apply(key, validatedValue);
    return true;
  },

  /**
   * Toggle a boolean setting
   */
  toggle(key) {
    const current = this.get(key);
    this.set(key, !current);
    return !current;
  },

  /**
   * Reset all settings to defaults
   */
  resetAll() {
    this.current = { ...this.defaults };
    this.save();
    this.applyAll();
    this.render();

    if (window.Hub) {
      window.Hub.showNotification('Settings reset to defaults', 'info');
    }
  },

  // ============================================
  // APPLY SETTINGS
  // ============================================

  /**
   * Apply all settings
   */
  applyAll() {
    Object.keys(this.current).forEach(key => {
      this.apply(key, this.current[key]);
    });
  },

  /**
   * Apply a single setting
   */
  apply(key, value) {
    switch (key) {
      case 'theme':
        document.documentElement.setAttribute('data-theme', value);
        break;

      case 'animations':
        document.body.classList.toggle('no-animations', !value);
        break;

      case 'particles':
        const particles = document.querySelector('.valhalla-particles');
        if (particles) {
          particles.style.display = value ? 'block' : 'none';
        }
        break;

      case 'reducedMotion':
        document.body.classList.toggle('reduced-motion', value);
        break;

      case 'masterVolume':
      case 'musicVolume':
      case 'sfxVolume':
        if (window.ValhallaAudio) {
          window.ValhallaAudio.setVolume(key.replace('Volume', ''), value);
        }
        break;

      case 'ambientEnabled':
        if (window.ValhallaAudio) {
          if (value) {
            window.ValhallaAudio.playAmbient();
          } else {
            window.ValhallaAudio.stopAmbient();
          }
        }
        break;

      case 'language':
        document.documentElement.setAttribute('lang', value);
        // Trigger language change event
        window.dispatchEvent(new CustomEvent('languagechange', { detail: value }));
        break;

      case 'shopParticles':
        // Toggle shop particle effects
        document.body.classList.toggle('no-shop-particles', !value);
        break;

      case 'confirmPurchases':
      case 'autoEquipPurchases':
      case 'defaultCurrency':
        // These are read by the shop module when needed
        // Dispatch event for shop to react
        window.dispatchEvent(
          new CustomEvent('settingschange', {
            detail: { key, value },
          })
        );
        break;
    }
  },

  // ============================================
  // RENDERING
  // ============================================

  /**
   * Render settings UI
   */
  render() {
    // Update all controls to match current values
    Object.keys(this.current).forEach(key => {
      const el = this.elements[key] || document.querySelector(`[data-setting="${key}"]`);
      if (!el) return;

      const value = this.current[key];

      if (el.classList.contains('toggle-switch')) {
        el.classList.toggle('active', value);
        // Update ARIA state for accessibility
        el.setAttribute('aria-checked', String(value));
      } else if (el.classList.contains('settings-slider')) {
        el.value = value;
        // Update ARIA state for accessibility
        el.setAttribute('aria-valuenow', String(value));
      } else if (el.classList.contains('settings-select')) {
        el.value = value;
      }
    });
  },

  /**
   * Generate settings HTML
   */
  generateHTML() {
    return `
            <!-- Visual Settings -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">🎨</span>
                    <h3 class="settings-group-title">Visual</h3>
                </div>
                <div class="settings-group-body">
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Animations</div>
                            <div class="settings-item-desc">Enable UI animations and transitions</div>
                        </div>
                        <div class="toggle-switch ${this.get('animations') ? 'active' : ''}" data-setting="animations"></div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Background Particles</div>
                            <div class="settings-item-desc">Floating embers and mist effects</div>
                        </div>
                        <div class="toggle-switch ${this.get('particles') ? 'active' : ''}" data-setting="particles"></div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Reduced Motion</div>
                            <div class="settings-item-desc">Minimize motion for accessibility</div>
                        </div>
                        <div class="toggle-switch ${this.get('reducedMotion') ? 'active' : ''}" data-setting="reducedMotion"></div>
                    </div>
                </div>
            </div>

            <!-- Audio Settings -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">🔊</span>
                    <h3 class="settings-group-title">Audio</h3>
                </div>
                <div class="settings-group-body">
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Master Volume</div>
                            <div class="settings-item-desc">Overall audio level</div>
                        </div>
                        <input type="range" class="settings-slider" data-setting="masterVolume" min="0" max="1" step="0.1" value="${this.get('masterVolume')}">
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Music Volume</div>
                            <div class="settings-item-desc">Background music level</div>
                        </div>
                        <input type="range" class="settings-slider" data-setting="musicVolume" min="0" max="1" step="0.1" value="${this.get('musicVolume')}">
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Sound Effects</div>
                            <div class="settings-item-desc">UI and game sound effects</div>
                        </div>
                        <input type="range" class="settings-slider" data-setting="sfxVolume" min="0" max="1" step="0.1" value="${this.get('sfxVolume')}">
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Ambient Sounds</div>
                            <div class="settings-item-desc">Background ambience and atmosphere</div>
                        </div>
                        <div class="toggle-switch ${this.get('ambientEnabled') ? 'active' : ''}" data-setting="ambientEnabled"></div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">UI Sounds</div>
                            <div class="settings-item-desc">Click, hover, and navigation sounds</div>
                        </div>
                        <div class="toggle-switch ${this.get('uiSoundsEnabled') ? 'active' : ''}" data-setting="uiSoundsEnabled"></div>
                    </div>
                </div>
            </div>

            <!-- Notification Settings -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">🔔</span>
                    <h3 class="settings-group-title">Notifications</h3>
                </div>
                <div class="settings-group-body">
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Game Events</div>
                            <div class="settings-item-desc">New games, tournaments, leaderboard updates</div>
                        </div>
                        <div class="toggle-switch ${this.get('notifyGameEvents') ? 'active' : ''}" data-setting="notifyGameEvents"></div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Shop Deals</div>
                            <div class="settings-item-desc">Sales, new items, limited offers</div>
                        </div>
                        <div class="toggle-switch ${this.get('notifyShopDeals') ? 'active' : ''}" data-setting="notifyShopDeals"></div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Achievements</div>
                            <div class="settings-item-desc">When you unlock achievements</div>
                        </div>
                        <div class="toggle-switch ${this.get('notifyAchievements') ? 'active' : ''}" data-setting="notifyAchievements"></div>
                    </div>
                </div>
            </div>

            <!-- Data & Privacy -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">🔒</span>
                    <h3 class="settings-group-title">Data & Privacy</h3>
                </div>
                <div class="settings-group-body">
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Export Data</div>
                            <div class="settings-item-desc">Download all your data as JSON</div>
                        </div>
                        <button class="btn-valhalla-secondary" id="settings-export-btn">Export</button>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Clear All Data</div>
                            <div class="settings-item-desc">Delete all local data (cannot be undone)</div>
                        </div>
                        <button class="btn-valhalla-secondary" id="settings-clear-btn" style="border-color: #ef4444; color: #ef4444;">Clear</button>
                    </div>
                </div>
            </div>

            <!-- Language -->
            <div class="settings-group">
                <div class="settings-group-header">
                    <span class="settings-group-icon">🌐</span>
                    <h3 class="settings-group-title">Language</h3>
                </div>
                <div class="settings-group-body">
                    <div class="settings-item">
                        <div class="settings-item-info">
                            <div class="settings-item-label">Display Language</div>
                            <div class="settings-item-desc">Choose your preferred language</div>
                        </div>
                        <select class="settings-select" data-setting="language">
                            <option value="en" ${this.get('language') === 'en' ? 'selected' : ''}>English</option>
                            <option value="fr" ${this.get('language') === 'fr' ? 'selected' : ''}>Français</option>
                            <option value="es" ${this.get('language') === 'es' ? 'selected' : ''}>Español</option>
                            <option value="de" ${this.get('language') === 'de' ? 'selected' : ''}>Deutsch</option>
                            <option value="jp" ${this.get('language') === 'jp' ? 'selected' : ''}>日本語</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Reset -->
            <div style="text-align: center; padding: 20px;">
                <button class="btn-valhalla-secondary" id="settings-reset-btn">Reset All Settings</button>
            </div>
        `;
  },

  // ============================================
  // DATA EXPORT
  // ============================================

  /**
   * Export all user data
   */
  exportData() {
    const data = {
      exportDate: new Date().toISOString(),
      settings: this.current,
      profile: {},
      shop: {},
      games: {},
    };

    // Collect all localStorage data
    const keys = [
      'asdf_shop_state',
      'asdf_engage',
      'asdf_history',
      'asdf_achievements',
      'pumpArenaStats',
      'pumpArenaRPG',
    ];
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
    });

    // Download as JSON
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asdf-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (window.Hub) {
      window.Hub.showNotification('Data exported successfully', 'success');
    }
  },

  /**
   * Clear all local data
   */
  clearAllData() {
    // List of keys to clear
    const keys = [
      'asdf_settings',
      'asdf_shop_state',
      'asdf_shop_favorites',
      'asdf_currency',
      'asdf_engage',
      'asdf_history',
      'asdf_achievements',
      'pumpArenaStats',
      'pumpArenaRPG',
      'connectedWallet',
    ];

    keys.forEach(key => localStorage.removeItem(key));

    if (window.Hub) {
      window.Hub.showNotification('All data cleared', 'info');
    }

    // Reload page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  },

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Play feedback sound
   */
  playFeedback() {
    if (this.get('uiSoundsEnabled') && window.ValhallaAudio) {
      window.ValhallaAudio.play('click');
    }
  },
};

// ============================================
// AUTO INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  Settings.init();
});

// Global export
if (typeof window !== 'undefined') {
  window.Settings = Settings;
}
