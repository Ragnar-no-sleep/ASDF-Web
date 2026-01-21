/**
 * Badge System
 * Central exports for achievement badges
 *
 * @module badge
 *
 * @example
 * import {
 *   badgeManager,
 *   BADGE_DEFINITIONS,
 *   BADGE_TIERS,
 *   BADGE_CATEGORIES
 * } from './badge/index.js';
 *
 * // Register default badges
 * badgeManager.registerBadges(BADGE_DEFINITIONS);
 *
 * // Initialize for user
 * await badgeManager.init('wallet-address');
 *
 * // Check achievements
 * await badgeManager.checkAchievements(context);
 */

// Manager exports
export {
  badgeManager,
  BADGE_TIERS,
  BADGE_CATEGORIES
} from './manager.js';

// Definition exports
export {
  BADGE_DEFINITIONS,
  TIER_METADATA,
  CATEGORY_METADATA
} from './definitions.js';

// Default export
export { badgeManager as default } from './manager.js';
