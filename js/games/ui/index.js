/**
 * ASDF Games - UI Module Coordinator
 *
 * Aggregates all UI submodules:
 * - rotation.js - Game rotation cycle
 * - leaderboard.js - Leaderboard display
 * - competitive.js - Competitive mode timer
 * - grid.js - Games grid rendering
 * - modal.js - Game modal management
 */

'use strict';

const GameUI = {
  // Module references
  rotation: typeof GameRotation !== 'undefined' ? GameRotation : null,
  leaderboard: typeof LeaderboardUI !== 'undefined' ? LeaderboardUI : null,
  competitive: typeof CompetitiveUI !== 'undefined' ? CompetitiveUI : null,
  grid: typeof GridUI !== 'undefined' ? GridUI : null,
  modal: typeof ModalUI !== 'undefined' ? ModalUI : null,

  initialized: false,

  /**
   * Initialize all UI modules
   */
  init() {
    if (this.initialized) return;

    // Verify modules loaded
    if (typeof GameRotation !== 'undefined') {
      this.rotation = GameRotation;
    }
    if (typeof LeaderboardUI !== 'undefined') {
      this.leaderboard = LeaderboardUI;
    }
    if (typeof CompetitiveUI !== 'undefined') {
      this.competitive = CompetitiveUI;
    }
    if (typeof GridUI !== 'undefined') {
      this.grid = GridUI;
    }
    if (typeof ModalUI !== 'undefined') {
      this.modal = ModalUI;
    }

    this.initialized = true;
    console.log('[GameUI] Initialized with modules:', this.getLoadedModules());
  },

  /**
   * Get list of loaded UI modules
   * @returns {string[]} Module names
   */
  getLoadedModules() {
    const modules = [];
    if (this.rotation) modules.push('rotation');
    if (this.leaderboard) modules.push('leaderboard');
    if (this.competitive) modules.push('competitive');
    if (this.grid) modules.push('grid');
    if (this.modal) modules.push('modal');
    return modules;
  },

  /**
   * Check if all modules are loaded
   * @returns {boolean}
   */
  isComplete() {
    return (
      this.rotation !== null &&
      this.leaderboard !== null &&
      this.competitive !== null &&
      this.grid !== null &&
      this.modal !== null
    );
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.GameUI = GameUI;
}
