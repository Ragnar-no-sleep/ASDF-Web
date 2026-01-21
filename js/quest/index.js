/**
 * Quest Engine Module
 * Central exports for quest functionality
 *
 * @module quest
 *
 * @example
 * import { questManager, QUEST_STATES, ACTIONS } from './quest/index.js';
 *
 * // Initialize for user
 * await questManager.init('wallet-address');
 *
 * // Register quest definitions
 * questManager.registerQuests([...]);
 *
 * // Start a quest
 * await questManager.startQuest('quest-id');
 */

// State machine exports
export {
  QUEST_STATES,
  TRANSITIONS,
  ACTIONS,
  QuestStateMachine,
  getStateLabel,
  getStateColor,
  getStateIcon
} from './state-machine.js';

// Manager exports
export { questManager } from './manager.js';

// Default export
export { questManager as default } from './manager.js';
