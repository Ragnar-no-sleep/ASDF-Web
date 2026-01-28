/**
 * Yggdrasil Dashboard - Data Adapter
 * DEPRECATED: Now re-exports from shared/data/adapter.js
 *
 * This file exists for backwards compatibility.
 * New code should import directly from:
 *   import { DataAdapter } from '../../shared/data/adapter.js';
 */

'use strict';

// Re-export everything from shared
export { DataAdapter, DATA_SOURCES, default } from '../../shared/data/adapter.js';

// Also re-export ProgressClient for direct access
export { ProgressClient, STORAGE_MODE } from '../../shared/data/progress-client.js';
