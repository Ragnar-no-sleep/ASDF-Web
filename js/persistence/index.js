/**
 * ASDF-Web Persistence Module
 * Central exports for persistence functionality
 *
 * @module persistence
 *
 * @example
 * import { sync } from './persistence/index.js';
 *
 * // Write with Redis sync
 * await sync.write('user:xp', 1000);
 *
 * // Read (Redis first, localStorage fallback)
 * const xp = await sync.read('user:xp', 0);
 */

export { sync } from './sync.js';
