/**
 * Yggdrasil Dashboard - Formations Data
 * DEPRECATED: Now re-exports from shared/data/formations.js
 *
 * This file exists for backwards compatibility.
 * New code should import directly from:
 *   import { FORMATION_TRACKS } from '../../shared/data/formations.js';
 */

'use strict';

// Re-export everything from shared
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
  default,
} from '../../shared/data/formations.js';
