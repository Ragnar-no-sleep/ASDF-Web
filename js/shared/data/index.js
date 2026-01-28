/**
 * ASDF Shared Data - Index
 * Central export for all shared data modules
 *
 * @location js/shared/data/index.js
 *
 * Usage:
 *   import { DataAdapter, FORMATION_TRACKS } from '../shared/data/index.js';
 *   // or
 *   import { DataAdapter } from '../shared/data/index.js';
 */

'use strict';

// Re-export everything from formations
export {
  FORMATION_TRACKS,
  FORMATION_MODULES,
  getFormationTrack,
  getFormationModule,
  getTrackModules,
  calculateTrackProgress,
  getNextModule,
  getTrackTotalXP,
  getTrackIds,
  getModuleIds,
} from './formations.js';

// Re-export adapter
export { DataAdapter, DATA_SOURCES } from './adapter.js';

// Re-export progress client
export { ProgressClient, STORAGE_MODE, xpForLevel, calculateLevel } from './progress-client.js';

// Default export is the DataAdapter
export { default } from './adapter.js';
