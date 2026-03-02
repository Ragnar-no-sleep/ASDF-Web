/**
 * Store - Reactive State Management (Observer Pattern)
 * Manages application state with subscriber notifications
 *
 * Usage:
 * const store = new Store({ count: 0 });
 * store.subscribe((state) => console.log('Updated:', state));
 * store.dispatch({ type: 'increment', payload: 5 });
 *
 * @author CYNIC
 */

export class Store {
  constructor(initialState = {}) {
    this._state = JSON.parse(JSON.stringify(initialState)); // Deep copy
    this._subscribers = new Set();
    this._history = []; // For debugging/undo
    this._maxHistory = 50;
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback - Called with new state on each update
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }
    this._subscribers.add(callback);

    // Return unsubscribe function
    return () => this._subscribers.delete(callback);
  }

  /**
   * Get current state (immutable copy)
   * @returns {Object} Current state
   */
  getState() {
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * Dispatch an action to update state
   * @param {Object} action - { type: string, payload: any }
   */
  dispatch(action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('Action must have a string "type" property');
    }

    const previousState = this.getState();

    try {
      // Update state
      this._state = {
        ...this._state,
        [action.type]: action.payload,
      };

      // Store history for debugging
      this._history.push({
        action: action.type,
        previousState,
        newState: this.getState(),
        timestamp: Date.now(),
      });

      // Trim history
      if (this._history.length > this._maxHistory) {
        this._history.shift();
      }

      // Notify subscribers
      this._subscribers.forEach(callback => {
        try {
          callback(this.getState());
        } catch (error) {
          console.error('Subscriber error:', error);
        }
      });
    } catch (error) {
      throw new Error(`Failed to dispatch action '${action.type}': ${error.message}`, {
        cause: error,
      });
    }
  }

  /**
   * Update state with reducer function
   * @param {Function} reducer - (state) => newState
   */
  reduce(reducer) {
    if (typeof reducer !== 'function') {
      throw new TypeError('Reducer must be a function');
    }
    this._state = reducer(this.getState());
    this._subscribers.forEach(callback => callback(this.getState()));
  }

  /**
   * Get action history for debugging
   * @returns {Array} History entries
   */
  getHistory() {
    return [...this._history];
  }

  /**
   * Undo last action
   * @returns {boolean} Success
   */
  undo() {
    if (this._history.length === 0) return false;

    const { previousState } = this._history.pop();
    this._state = previousState;
    this._subscribers.forEach(callback => callback(this.getState()));
    return true;
  }

  /**
   * Clear all subscribers (for cleanup)
   */
  clear() {
    this._subscribers.clear();
    this._history = [];
  }

  /**
   * Get number of subscribers
   * @returns {number}
   */
  getSubscriberCount() {
    return this._subscribers.size;
  }
}
