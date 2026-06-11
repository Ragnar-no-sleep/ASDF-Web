/**
 * ASDF Games - Typed Object Pool
 * Performance: Zero-allocation pooling using TypedArrays for maximum Cache Locality
 * Best Practice 2026 for 2D HTML5 Games
 */

'use strict';

class TypedObjectPool {
  /**
   * @param {number} capacity - Maximum number of objects in the pool
   * @param {number} itemSize - Number of attributes per object (e.g. x, y, vx, vy, life = 5)
   */
  constructor(capacity, itemSize) {
    this.capacity = capacity;
    this.itemSize = itemSize;
    // Single contiguous block of memory for all attributes of all objects
    this.data = new Float32Array(capacity * itemSize);
    // Parallel array to track active status (0 = inactive, 1 = active)
    this.active = new Uint8Array(capacity);
    this.activeCount = 0;
    this.nextFreeIndex = 0; // Optimization: start search from here
  }

  /**
   * Acquire a free object index
   * @returns {number} Index of the free object, or -1 if pool is full
   */
  acquire() {
    if (this.activeCount >= this.capacity) return -1;

    // Find first inactive slot starting from nextFreeIndex
    for (let i = 0; i < this.capacity; i++) {
      const idx = (this.nextFreeIndex + i) % this.capacity;
      if (this.active[idx] === 0) {
        this.active[idx] = 1;
        this.activeCount++;
        this.nextFreeIndex = (idx + 1) % this.capacity;
        return idx;
      }
    }
    return -1;
  }

  /**
   * Release an object back to the pool
   * @param {number} index
   */
  release(index) {
    if (index < 0 || index >= this.capacity) return;

    if (this.active[index] === 1) {
      this.active[index] = 0;
      this.activeCount--;
      // We don't necessarily zero out the data for performance,
      // the next acquire/init should overwrite it.
    }
  }

  /**
   * Iterate over all active objects (high performance)
   * @param {Function} callback - function(index, dataArray, offset)
   */
  forEach(callback) {
    for (let i = 0; i < this.capacity; i++) {
      if (this.active[i] === 1) {
        callback(i, this.data, i * this.itemSize);
      }
    }
  }

  /**
   * Reset the entire pool
   */
  clear() {
    this.active.fill(0);
    this.activeCount = 0;
    this.nextFreeIndex = 0;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.TypedObjectPool = TypedObjectPool;
  window.TypedObjectPool = TypedObjectPool;
}
