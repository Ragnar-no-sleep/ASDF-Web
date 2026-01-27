/**
 * Module System
 * Central exports for learning module functionality
 *
 * @module module
 *
 * @example
 * import { moduleManager, ModulePlayer, MODULE_STATES } from './module/index.js';
 *
 * // Initialize for user
 * await moduleManager.init('wallet-address');
 *
 * // Create player instance
 * const player = new ModulePlayer('#player-container');
 * await player.loadLesson('dev-solana-basics', 'lesson-1');
 */

// Manager exports
export {
  moduleManager,
  MODULE_STATES,
  LESSON_TYPES
} from './manager.js';

// Player exports
export { ModulePlayer } from './player.js';

// Default export
export { moduleManager as default } from './manager.js';
