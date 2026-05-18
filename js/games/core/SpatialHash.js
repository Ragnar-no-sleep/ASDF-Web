/**
 * ASDF Games - Spatial Hash
 * High-performance spatial partitioning for 2D collision detection.
 * Optimized for dynamic entities in ECS.
 */

'use strict';

(function () {
  class SpatialHash {
    /**
     * @param {number} cellSize - Size of each grid cell in pixels
     */
    constructor(cellSize = 100) {
      this.cellSize = cellSize;
      this.grid = new Map(); // key (string) -> Array of entity IDs
    }

    /**
     * Get grid key for coordinates (Integer Hash)
     * Using bitwise operations for speed.
     */
    _key(x, y) {
      const gx = (x / this.cellSize) | 0;
      const gy = (y / this.cellSize) | 0;
      // Using a simple but effective spatial hash function
      return (gx * 73856093) ^ (gy * 19349663);
    }

    /**
     * Clear the hash
     */
    clear() {
      // Reusing the map but clearing values to avoid re-allocating the Map itself
      this.grid.clear();
    }

    /**
     * Insert an entity into the hash based on its AABB
     */
    insert(id, x, y, w, h) {
      const startX = (x / this.cellSize) | 0;
      const startY = (y / this.cellSize) | 0;
      const endX = ((x + w) / this.cellSize) | 0;
      const endY = ((y + h) / this.cellSize) | 0;

      for (let gx = startX; gx <= endX; gx++) {
        for (let gy = startY; gy <= endY; gy++) {
          const key = (gx * 73856093) ^ (gy * 19349663);
          let cell = this.grid.get(key);
          if (!cell) {
            cell = [];
            this.grid.set(key, cell);
          }
          cell.push(id);
        }
      }
    }

    /**
     * Get all potential collision candidates for an entity (Zero-Allocation)
     * Fills the provided results array and returns the count of candidates found.
     * @param {number} x, y, w, h - AABB to query
     * @param {Uint32Array} results - Target array to fill
     * @returns {number} Number of candidates added to results
     */
    queryToArray(x, y, w, h, results) {
      let count = 0;
      const startX = (x / this.cellSize) | 0;
      const startY = (y / this.cellSize) | 0;
      const endX = ((x + w) / this.cellSize) | 0;
      const endY = ((y + h) / this.cellSize) | 0;

      const maxResults = results.length;

      for (let gx = startX; gx <= endX; gx++) {
        for (let gy = startY; gy <= endY; gy++) {
          const key = (gx * 73856093) ^ (gy * 19349663);
          const cell = this.grid.get(key);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              if (count < maxResults) {
                results[count++] = cell[i];
              } else {
                return count; // Buffer full
              }
            }
          }
        }
      }
      return count;
    }

    /**
     * Get all potential collision candidates for an entity (Legacy - Allocates Array)
     * @returns {number[]} Array of entity IDs
     */
    query(x, y, w, h) {
      const results = [];
      const startX = (x / this.cellSize) | 0;
      const startY = (y / this.cellSize) | 0;
      const endX = ((x + w) / this.cellSize) | 0;
      const endY = ((y + h) / this.cellSize) | 0;

      for (let gx = startX; gx <= endX; gx++) {
        for (let gy = startY; gy <= endY; gy++) {
          const key = (gx * 73856093) ^ (gy * 19349663);
          const cell = this.grid.get(key);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              results.push(cell[i]);
            }
          }
        }
      }
      return results;
    }
  }

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.SpatialHash = SpatialHash;
  }
})();
