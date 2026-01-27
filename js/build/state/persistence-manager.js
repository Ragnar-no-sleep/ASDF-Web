/**
 * Build V2 - Persistence Manager
 * localStorage save/load with validation and migration
 *
 * @version 1.0.0
 */

'use strict';

import { STORAGE_KEY, STORAGE_VERSION } from '../config.js';

/**
 * Persistence Manager - Handles localStorage operations
 */
const PersistenceManager = {
  /**
   * Storage key
   */
  key: STORAGE_KEY,

  /**
   * Current version
   */
  version: STORAGE_VERSION,

  /**
   * Save data to localStorage
   * @param {Object} data - Data to save
   * @returns {boolean} Success status
   */
  save(data) {
    try {
      const payload = {
        version: this.version,
        ...data,
        lastSaved: Date.now(),
      };
      localStorage.setItem(this.key, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[PersistenceManager] Failed to save:', e);
      return false;
    }
  },

  /**
   * Load data from localStorage
   * @returns {Object|null} Loaded data or null
   */
  load() {
    try {
      const saved = localStorage.getItem(this.key);
      if (!saved) return null;

      let data;
      try {
        data = JSON.parse(saved);
      } catch (parseError) {
        console.warn('[PersistenceManager] Corrupted data, clearing');
        this.clear();
        return null;
      }

      // Version check
      if (!data || data.version !== this.version) {
        console.log('[PersistenceManager] Version mismatch, migrating...');
        return this._migrate(data);
      }

      return data;
    } catch (e) {
      console.warn('[PersistenceManager] Failed to load:', e);
      return null;
    }
  },

  /**
   * Clear localStorage
   */
  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch (e) {
      console.warn('[PersistenceManager] Failed to clear:', e);
    }
  },

  /**
   * Migrate old storage format
   * @param {Object} oldData
   * @returns {Object|null}
   * @private
   */
  _migrate(oldData) {
    const migrated = {
      version: this.version,
      currentState: null,
      previousState: null,
      data: {},
    };

    // Migrate from legacy keys
    try {
      const legacyTrack = localStorage.getItem('asdf-path-track');
      const legacyJourney = localStorage.getItem('asdf-journey-track');

      if (legacyTrack && this._isValidTrackId(legacyTrack)) {
        migrated.data.quizResult = legacyTrack;
        migrated.data.selectedTrack = legacyTrack;
      }
      if (legacyJourney && this._isValidTrackId(legacyJourney)) {
        migrated.data.selectedTrack = legacyJourney;
      }

      // Clean up legacy keys
      localStorage.removeItem('asdf-path-track');
      localStorage.removeItem('asdf-journey-track');

      // Try to preserve some data from old format
      if (oldData && oldData.data) {
        if (oldData.data.selectedProject && this._isValidProjectId(oldData.data.selectedProject)) {
          migrated.data.selectedProject = oldData.data.selectedProject;
        }
        if (oldData.data.selectedTrack && this._isValidTrackId(oldData.data.selectedTrack)) {
          migrated.data.selectedTrack = oldData.data.selectedTrack;
        }
        if (typeof oldData.data.introCompleted === 'boolean') {
          migrated.data.introCompleted = oldData.data.introCompleted;
        }
        if (Array.isArray(oldData.data.completedProjects)) {
          migrated.data.completedProjects = oldData.data.completedProjects
            .filter(this._isValidProjectId)
            .slice(0, 100);
        }
      }

      // Save migrated data
      this.save(migrated);
      console.log('[PersistenceManager] Migration complete');

      return migrated;
    } catch (e) {
      console.warn('[PersistenceManager] Migration failed:', e);
      return null;
    }
  },

  /**
   * Validate track ID
   * @param {string} trackId
   * @returns {boolean}
   * @private
   */
  _isValidTrackId(trackId) {
    if (typeof trackId !== 'string') return false;
    return /^[a-z]{2,20}$/.test(trackId);
  },

  /**
   * Validate project ID
   * @param {string} projectId
   * @returns {boolean}
   * @private
   */
  _isValidProjectId(projectId) {
    if (typeof projectId !== 'string') return false;
    return /^[a-z0-9-]{2,50}$/.test(projectId);
  },

  /**
   * Check if storage is available
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
};

export { PersistenceManager };
export default PersistenceManager;
