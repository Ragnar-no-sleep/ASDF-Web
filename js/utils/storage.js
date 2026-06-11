/**
 * ASDF Central Storage Manager
 * Handles prefixing, versioning and migration of localStorage data
 */

'use strict';

const PREFIX = 'asdf:v1:';

const StorageManager = {
  /**
   * Get an item from storage with prefix and fallback migration
   * @param {string} key - The raw key (without prefix)
   * @param {any} defaultValue - Default value if not found
   * @returns {any}
   */
  get(key, defaultValue = null) {
    const prefixedKey = PREFIX + key;
    const stored = localStorage.getItem(prefixedKey);

    if (stored !== null) {
      try {
        return JSON.parse(stored);
      } catch (_e) {
        return stored;
      }
    }

    // *sniff* Migration logic: look for legacy keys
    const legacyKeys = ['asdf_' + key, 'asdf-' + key, key];

    for (const legacyKey of legacyKeys) {
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        this.set(key, legacyValue);
        // localStorage.removeItem(legacyKey); // We keep it for safety during transition
        try {
          return JSON.parse(legacyValue);
        } catch (_e) {
          return legacyValue;
        }
      }
    }

    return defaultValue;
  },

  /**
   * Set an item in storage with prefix
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    const prefixedKey = PREFIX + key;
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(prefixedKey, stringValue);
  },

  /**
   * Remove an item from storage
   * @param {string} key
   */
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  /**
   * Clear all ASDF related storage (v1 only)
   */
  clear() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },
};

export default StorageManager;
window.ASDF = window.ASDF || {};
window.ASDF.storage = StorageManager;
