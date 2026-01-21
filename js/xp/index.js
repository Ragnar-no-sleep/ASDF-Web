/**
 * XP System
 * Central exports for experience points functionality
 *
 * @module xp
 *
 * @example
 * import { xpManager, LEVEL_THRESHOLDS } from './xp/index.js';
 *
 * await xpManager.init('wallet-address');
 * const profile = xpManager.getProfile();
 * console.log(`Level ${profile.level} - ${profile.rank}`);
 */

export {
  xpManager,
  LEVEL_THRESHOLDS,
  XP_CONFIG
} from './manager.js';

export { xpManager as default } from './manager.js';
