/**
 * ASDF Shared - Progress Client
 * Handles user progress storage and retrieval
 *
 * @version 2.0.0
 * @location js/shared/data/progress-client.js
 *
 * Storage layers (priority order):
 * 1. API (when authenticated) - future
 * 2. Solana PDA (when wallet connected) - future
 * 3. localStorage (fallback)
 *
 * This client abstracts the storage layer so consumers
 * don't need to know where data is stored.
 */

'use strict';

import { FORMATION_MODULES } from './formations.js';

// ============================================
// CONFIGURATION
// ============================================

const STORAGE_KEYS = {
  PROGRESS: 'asdf_formation_progress',
  XP: 'asdf_user_xp',
  LEVEL: 'asdf_user_level',
};

const STORAGE_MODE = {
  LOCAL: 'local', // localStorage only
  API: 'api', // Backend API
  PDA: 'pda', // Solana PDA (future)
};

let currentMode = STORAGE_MODE.LOCAL;
let progressCache = null;
let xpCache = null;

// API base URL (for future use)
const API_BASE = '/api';

// ============================================
// FIBONACCI XP SYSTEM
// ============================================

const FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

function fib(n) {
  if (n < FIB.length) return FIB[n];
  let a = FIB[FIB.length - 2];
  let b = FIB[FIB.length - 1];
  for (let i = FIB.length; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

/**
 * Calculate XP required for a level
 * @param {number} level
 * @returns {number}
 */
function xpForLevel(level) {
  return fib(level + 4) * 100; // Level 1 = fib(5)*100 = 500 XP
}

/**
 * Calculate level from total XP
 * @param {number} totalXP
 * @returns {{level: number, currentXP: number, xpToNext: number, progress: number}}
 */
function calculateLevel(totalXP) {
  let level = 1;
  let remaining = totalXP;

  while (remaining >= xpForLevel(level) && level < 100) {
    remaining -= xpForLevel(level);
    level++;
  }

  const xpToNext = xpForLevel(level);
  const progress = Math.round((remaining / xpToNext) * 100);

  return {
    level,
    currentXP: remaining,
    xpToNext,
    progress,
  };
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn(`[ProgressClient] Failed to load ${key}:`, e);
    return null;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn(`[ProgressClient] Failed to save ${key}:`, e);
    return false;
  }
}

// ============================================
// API HELPERS (for future use)
// ============================================

async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// PROGRESS CLIENT
// ============================================

export const ProgressClient = {
  /**
   * Set storage mode
   * @param {'local'|'api'|'pda'} mode
   */
  setMode(mode) {
    if (Object.values(STORAGE_MODE).includes(mode)) {
      currentMode = mode;
      progressCache = null;
      xpCache = null;
      console.log('[ProgressClient] Mode:', mode);
    }
  },

  /**
   * Get current mode
   * @returns {string}
   */
  getMode() {
    return currentMode;
  },

  /**
   * Clear cache
   */
  clearCache() {
    progressCache = null;
    xpCache = null;
  },

  // ============================================
  // PROGRESS METHODS
  // ============================================

  /**
   * Load user progress
   * @param {string} [wallet] - Wallet address (for API/PDA modes)
   * @returns {Promise<Object>}
   */
  async loadProgress(wallet = null) {
    // Return cached if available
    if (progressCache) return progressCache;

    let progress = {};

    switch (currentMode) {
      case STORAGE_MODE.API:
        if (wallet) {
          try {
            const response = await fetchAPI(`/progress/${wallet}`);
            progress = response.progress || {};
          } catch (e) {
            console.warn('[ProgressClient] API fallback to local:', e);
            progress = loadFromStorage(STORAGE_KEYS.PROGRESS) || {};
          }
        } else {
          progress = loadFromStorage(STORAGE_KEYS.PROGRESS) || {};
        }
        break;

      case STORAGE_MODE.PDA:
        // Future: Load from Solana PDA
        console.log('[ProgressClient] PDA mode not yet implemented, using local');
        progress = loadFromStorage(STORAGE_KEYS.PROGRESS) || {};
        break;

      case STORAGE_MODE.LOCAL:
      default:
        progress = loadFromStorage(STORAGE_KEYS.PROGRESS) || {};
    }

    progressCache = progress;
    return progress;
  },

  /**
   * Save user progress
   * @param {Object} progress
   * @param {string} [wallet]
   * @returns {Promise<boolean>}
   */
  async saveProgress(progress, wallet = null) {
    progressCache = progress;

    switch (currentMode) {
      case STORAGE_MODE.API:
        if (wallet) {
          try {
            await fetchAPI(`/progress/${wallet}`, {
              method: 'POST',
              body: JSON.stringify({ progress }),
            });
            // Also save locally as backup
            saveToStorage(STORAGE_KEYS.PROGRESS, progress);
            return true;
          } catch (e) {
            console.warn('[ProgressClient] API save failed, saving locally:', e);
            return saveToStorage(STORAGE_KEYS.PROGRESS, progress);
          }
        }
        return saveToStorage(STORAGE_KEYS.PROGRESS, progress);

      case STORAGE_MODE.PDA:
        // Future: Save to Solana PDA
        console.log('[ProgressClient] PDA save not implemented, saving locally');
        return saveToStorage(STORAGE_KEYS.PROGRESS, progress);

      case STORAGE_MODE.LOCAL:
      default:
        return saveToStorage(STORAGE_KEYS.PROGRESS, progress);
    }
  },

  /**
   * Mark a module as completed
   * @param {string} trackId
   * @param {string} moduleId
   * @param {string} [wallet]
   * @returns {Promise<{success: boolean, xpAwarded?: number, newLevel?: Object}>}
   */
  async completeModule(trackId, moduleId, wallet = null) {
    const progress = await this.loadProgress(wallet);

    // Initialize track if needed
    if (!progress[trackId]) {
      progress[trackId] = { completed: [], startedAt: Date.now() };
    }

    // Check if already completed
    if (progress[trackId].completed.includes(moduleId)) {
      return { success: false, error: 'already_completed' };
    }

    // Mark as completed
    progress[trackId].completed.push(moduleId);
    progress[trackId].lastCompleted = moduleId;
    progress[trackId].lastCompletedAt = Date.now();

    // Award XP
    const module = FORMATION_MODULES[moduleId];
    const xpAwarded = module?.xpReward || 0;

    if (xpAwarded > 0) {
      await this.addXP(xpAwarded, wallet);
    }

    // Save progress
    await this.saveProgress(progress, wallet);

    // Get new level info
    const levelInfo = await this.getUserLevel(wallet);

    return {
      success: true,
      xpAwarded,
      newLevel: levelInfo,
    };
  },

  /**
   * Get completed modules for a track
   * @param {string} trackId
   * @param {string} [wallet]
   * @returns {Promise<string[]>}
   */
  async getCompletedModules(trackId, wallet = null) {
    const progress = await this.loadProgress(wallet);
    return progress[trackId]?.completed || [];
  },

  // ============================================
  // XP METHODS
  // ============================================

  /**
   * Get user's total XP
   * @param {string} [wallet]
   * @returns {Promise<number>}
   */
  async getUserXP(wallet = null) {
    if (xpCache !== null) return xpCache;

    let xp = 0;

    switch (currentMode) {
      case STORAGE_MODE.API:
        if (wallet) {
          try {
            const response = await fetchAPI(`/progress/${wallet}/xp`);
            xp = response.totalXP || 0;
          } catch (e) {
            xp = loadFromStorage(STORAGE_KEYS.XP) || 0;
          }
        } else {
          xp = loadFromStorage(STORAGE_KEYS.XP) || 0;
        }
        break;

      case STORAGE_MODE.PDA:
        // Future: Read from Solana PDA
        xp = loadFromStorage(STORAGE_KEYS.XP) || 0;
        break;

      case STORAGE_MODE.LOCAL:
      default:
        xp = loadFromStorage(STORAGE_KEYS.XP) || 0;
    }

    xpCache = xp;
    return xp;
  },

  /**
   * Add XP to user
   * @param {number} amount
   * @param {string} [wallet]
   * @returns {Promise<{totalXP: number, levelUp: boolean, newLevel?: Object}>}
   */
  async addXP(amount, wallet = null) {
    const currentXP = await this.getUserXP(wallet);
    const oldLevel = calculateLevel(currentXP);

    const newXP = currentXP + amount;
    xpCache = newXP;

    // Save
    switch (currentMode) {
      case STORAGE_MODE.API:
        if (wallet) {
          try {
            await fetchAPI(`/progress/${wallet}/xp`, {
              method: 'POST',
              body: JSON.stringify({ amount }),
            });
          } catch (e) {
            console.warn('[ProgressClient] API XP add failed:', e);
          }
        }
        saveToStorage(STORAGE_KEYS.XP, newXP);
        break;

      case STORAGE_MODE.PDA:
        // Future: Update Solana PDA
        saveToStorage(STORAGE_KEYS.XP, newXP);
        break;

      case STORAGE_MODE.LOCAL:
      default:
        saveToStorage(STORAGE_KEYS.XP, newXP);
    }

    const newLevel = calculateLevel(newXP);
    const levelUp = newLevel.level > oldLevel.level;

    return {
      totalXP: newXP,
      levelUp,
      newLevel: levelUp ? newLevel : undefined,
    };
  },

  /**
   * Get user level info
   * @param {string} [wallet]
   * @returns {Promise<Object>}
   */
  async getUserLevel(wallet = null) {
    const totalXP = await this.getUserXP(wallet);
    return calculateLevel(totalXP);
  },

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Reset all progress (dangerous!)
   * @param {string} [wallet]
   * @returns {Promise<boolean>}
   */
  async resetProgress(wallet = null) {
    progressCache = {};
    xpCache = 0;

    localStorage.removeItem(STORAGE_KEYS.PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.XP);
    localStorage.removeItem(STORAGE_KEYS.LEVEL);

    if (currentMode === STORAGE_MODE.API && wallet) {
      try {
        await fetchAPI(`/progress/${wallet}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('[ProgressClient] API reset failed:', e);
      }
    }

    return true;
  },

  /**
   * Export progress for backup
   * @param {string} [wallet]
   * @returns {Promise<Object>}
   */
  async exportProgress(wallet = null) {
    const progress = await this.loadProgress(wallet);
    const xp = await this.getUserXP(wallet);
    const level = calculateLevel(xp);

    return {
      exportedAt: new Date().toISOString(),
      wallet: wallet || 'local',
      progress,
      xp,
      level: level.level,
    };
  },

  /**
   * Import progress from backup
   * @param {Object} backup
   * @param {string} [wallet]
   * @returns {Promise<boolean>}
   */
  async importProgress(backup, wallet = null) {
    if (!backup || !backup.progress) {
      return false;
    }

    await this.saveProgress(backup.progress, wallet);

    if (backup.xp) {
      xpCache = backup.xp;
      saveToStorage(STORAGE_KEYS.XP, backup.xp);
    }

    return true;
  },
};

// ============================================
// EXPORTS
// ============================================

export { STORAGE_MODE, xpForLevel, calculateLevel };
export default ProgressClient;

// Browser global
if (typeof window !== 'undefined') {
  window.ProgressClient = ProgressClient;
}
