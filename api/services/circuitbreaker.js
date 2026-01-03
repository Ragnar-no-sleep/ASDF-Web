/**
 * ASDF API - Circuit Breaker Service
 *
 * Resilience patterns for external service calls:
 * - Circuit breaker with configurable thresholds
 * - Half-open state for recovery testing
 * - Fallback support
 * - Bulkhead pattern for isolation
 *
 * Security by Design:
 * - Error masking in responses
 * - Audit logging for state changes
 * - No sensitive data in metrics
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const CIRCUIT_CONFIG = {
    // Default thresholds
    failureThreshold: 5,           // Failures before opening
    successThreshold: 3,           // Successes in half-open before closing
    timeout: 30000,                // Time in open state before half-open (ms)

    // Timeouts
    callTimeout: 10000,            // Default call timeout (ms)
    maxCallTimeout: 60000,         // Maximum allowed timeout

    // Bulkhead
    maxConcurrent: 10,             // Max concurrent calls per circuit
    maxQueue: 50,                  // Max queued calls

    // Stats retention
    statsWindow: 60000,            // Window for stats calculation (1 min)
    statsRetention: 60 * 60 * 1000 // Keep stats for 1 hour
};

// Circuit states
const STATES = {
    CLOSED: 'closed',      // Normal operation
    OPEN: 'open',          // Failing, rejecting calls
    HALF_OPEN: 'half_open' // Testing if service recovered
};

// ============================================
// STORAGE
// ============================================

// Circuits by name
const circuits = new Map();

// Global stats
const globalStats = {
    totalCalls: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    circuitOpens: 0,
    circuitCloses: 0
};

// ============================================
// CIRCUIT BREAKER CLASS
// ============================================

class CircuitBreaker {
    /**
     * Create a circuit breaker
     * @param {string} name - Circuit name
     * @param {Object} options - Configuration options
     */
    constructor(name, options = {}) {
        this.name = name;
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.lastStateChange = Date.now();
        this.nextAttempt = 0;

        // Configuration
        this.failureThreshold = options.failureThreshold || CIRCUIT_CONFIG.failureThreshold;
        this.successThreshold = options.successThreshold || CIRCUIT_CONFIG.successThreshold;
        this.timeout = options.timeout || CIRCUIT_CONFIG.timeout;
        this.callTimeout = options.callTimeout || CIRCUIT_CONFIG.callTimeout;
        this.fallback = options.fallback || null;

        // Bulkhead
        this.maxConcurrent = options.maxConcurrent || CIRCUIT_CONFIG.maxConcurrent;
        this.maxQueue = options.maxQueue || CIRCUIT_CONFIG.maxQueue;
        this.activeCalls = 0;
        this.queuedCalls = [];

        // Stats
        this.callHistory = [];
        this.stats = {
            totalCalls: 0,
            failures: 0,
            successes: 0,
            rejections: 0,
            timeouts: 0,
            fallbacks: 0,
            avgResponseTime: 0
        };
    }

    /**
     * Execute a function through the circuit breaker
     * @param {Function} fn - Function to execute
     * @param {...any} args - Arguments to pass
     * @returns {Promise<any>}
     */
    async execute(fn, ...args) {
        // Check if circuit is open
        if (this.state === STATES.OPEN) {
            if (Date.now() < this.nextAttempt) {
                return this._handleRejection('Circuit is open');
            }
            // Transition to half-open
            this._transitionTo(STATES.HALF_OPEN);
        }

        // Check bulkhead capacity
        if (this.activeCalls >= this.maxConcurrent) {
            if (this.queuedCalls.length >= this.maxQueue) {
                return this._handleRejection('Circuit queue full');
            }
            // Queue the call
            return new Promise((resolve, reject) => {
                this.queuedCalls.push({ fn, args, resolve, reject });
            });
        }

        return this._executeCall(fn, args);
    }

    /**
     * Execute a queued or new call
     * @param {Function} fn - Function to execute
     * @param {Array} args - Arguments
     * @returns {Promise<any>}
     */
    async _executeCall(fn, args) {
        this.activeCalls++;
        this.stats.totalCalls++;
        globalStats.totalCalls++;

        const startTime = Date.now();

        try {
            // Execute with timeout
            const result = await this._withTimeout(fn(...args), this.callTimeout);

            const duration = Date.now() - startTime;
            this._recordSuccess(duration);

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            this._recordFailure(error, duration);

            // Try fallback
            if (this.fallback) {
                this.stats.fallbacks++;
                try {
                    return await this.fallback(error, ...args);
                } catch (fallbackError) {
                    throw fallbackError;
                }
            }

            throw error;

        } finally {
            this.activeCalls--;
            this._processQueue();
        }
    }

    /**
     * Wrap promise with timeout
     * @param {Promise} promise - Promise to wrap
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<any>}
     */
    _withTimeout(promise, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.stats.timeouts++;
                reject(new Error('Circuit breaker timeout'));
            }, Math.min(timeout, CIRCUIT_CONFIG.maxCallTimeout));

            promise
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    /**
     * Record successful call
     * @param {number} duration - Call duration
     */
    _recordSuccess(duration) {
        this.successCount++;
        this.stats.successes++;
        globalStats.totalSuccesses++;

        this._recordCallHistory(true, duration);
        this._updateAvgResponseTime(duration);

        // In half-open, check if we can close
        if (this.state === STATES.HALF_OPEN) {
            if (this.successCount >= this.successThreshold) {
                this._transitionTo(STATES.CLOSED);
            }
        }

        // Reset failure count on success in closed state
        if (this.state === STATES.CLOSED) {
            this.failureCount = 0;
        }
    }

    /**
     * Record failed call
     * @param {Error} error - Error that occurred
     * @param {number} duration - Call duration
     */
    _recordFailure(error, duration) {
        this.failureCount++;
        this.stats.failures++;
        globalStats.totalFailures++;
        this.lastFailureTime = Date.now();

        this._recordCallHistory(false, duration, error.message);

        // Check if we should open the circuit
        if (this.state === STATES.CLOSED) {
            if (this.failureCount >= this.failureThreshold) {
                this._transitionTo(STATES.OPEN);
            }
        }
        // In half-open, go back to open
        else if (this.state === STATES.HALF_OPEN) {
            this._transitionTo(STATES.OPEN);
        }
    }

    /**
     * Handle rejection when circuit is open
     * @param {string} reason - Rejection reason
     * @returns {Promise}
     */
    async _handleRejection(reason) {
        this.stats.rejections++;

        if (this.fallback) {
            this.stats.fallbacks++;
            return await this.fallback(new Error(reason));
        }

        throw new Error(reason);
    }

    /**
     * Transition to new state
     * @param {string} newState - New state
     */
    _transitionTo(newState) {
        const oldState = this.state;
        this.state = newState;
        this.lastStateChange = Date.now();

        if (newState === STATES.OPEN) {
            this.nextAttempt = Date.now() + this.timeout;
            this.successCount = 0;
            globalStats.circuitOpens++;
        } else if (newState === STATES.CLOSED) {
            this.failureCount = 0;
            this.successCount = 0;
            globalStats.circuitCloses++;
        } else if (newState === STATES.HALF_OPEN) {
            this.successCount = 0;
        }

        logAudit('circuit_state_change', {
            circuit: this.name,
            from: oldState,
            to: newState
        });

        console.log(`[CircuitBreaker] ${this.name}: ${oldState} -> ${newState}`);
    }

    /**
     * Record call in history
     * @param {boolean} success - Was successful
     * @param {number} duration - Call duration
     * @param {string} error - Error message if failed
     */
    _recordCallHistory(success, duration, error = null) {
        this.callHistory.push({
            timestamp: Date.now(),
            success,
            duration,
            error
        });

        // Trim old entries
        const cutoff = Date.now() - CIRCUIT_CONFIG.statsRetention;
        this.callHistory = this.callHistory.filter(h => h.timestamp > cutoff);
    }

    /**
     * Update average response time
     * @param {number} duration - New duration
     */
    _updateAvgResponseTime(duration) {
        const windowEntries = this.callHistory.filter(
            h => h.success && h.timestamp > Date.now() - CIRCUIT_CONFIG.statsWindow
        );

        if (windowEntries.length > 0) {
            const total = windowEntries.reduce((sum, h) => sum + h.duration, 0);
            this.stats.avgResponseTime = Math.round(total / windowEntries.length);
        }
    }

    /**
     * Process queued calls
     */
    _processQueue() {
        if (this.queuedCalls.length > 0 && this.activeCalls < this.maxConcurrent) {
            const { fn, args, resolve, reject } = this.queuedCalls.shift();
            this._executeCall(fn, args).then(resolve).catch(reject);
        }
    }

    /**
     * Force circuit to open state
     */
    forceOpen() {
        this._transitionTo(STATES.OPEN);
    }

    /**
     * Force circuit to closed state
     */
    forceClose() {
        this._transitionTo(STATES.CLOSED);
    }

    /**
     * Reset circuit state
     */
    reset() {
        this.state = STATES.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.lastStateChange = Date.now();
        this.nextAttempt = 0;
        this.callHistory = [];

        logAudit('circuit_reset', { circuit: this.name });
    }

    /**
     * Get circuit status
     * @returns {Object}
     */
    getStatus() {
        const recentCalls = this.callHistory.filter(
            h => h.timestamp > Date.now() - CIRCUIT_CONFIG.statsWindow
        );

        const recentFailures = recentCalls.filter(h => !h.success).length;
        const recentSuccesses = recentCalls.filter(h => h.success).length;

        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            lastStateChange: this.lastStateChange,
            nextAttempt: this.state === STATES.OPEN ? this.nextAttempt : null,
            activeCalls: this.activeCalls,
            queuedCalls: this.queuedCalls.length,
            stats: {
                ...this.stats,
                recentCalls: recentCalls.length,
                recentFailures,
                recentSuccesses,
                recentFailureRate: recentCalls.length > 0
                    ? ((recentFailures / recentCalls.length) * 100).toFixed(2) + '%'
                    : '0%'
            },
            config: {
                failureThreshold: this.failureThreshold,
                successThreshold: this.successThreshold,
                timeout: this.timeout,
                callTimeout: this.callTimeout,
                maxConcurrent: this.maxConcurrent
            }
        };
    }
}

// ============================================
// FACTORY FUNCTIONS
// ============================================

/**
 * Create or get a circuit breaker
 * @param {string} name - Circuit name
 * @param {Object} options - Configuration options
 * @returns {CircuitBreaker}
 */
function getCircuit(name, options = {}) {
    if (!circuits.has(name)) {
        circuits.set(name, new CircuitBreaker(name, options));
        console.log(`[CircuitBreaker] Created circuit: ${name}`);
    }
    return circuits.get(name);
}

/**
 * Execute function through named circuit
 * @param {string} name - Circuit name
 * @param {Function} fn - Function to execute
 * @param {...any} args - Arguments
 * @returns {Promise<any>}
 */
async function execute(name, fn, ...args) {
    const circuit = getCircuit(name);
    return circuit.execute(fn, ...args);
}

/**
 * Create a wrapped function that uses circuit breaker
 * @param {string} name - Circuit name
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Circuit options
 * @returns {Function}
 */
function wrap(name, fn, options = {}) {
    const circuit = getCircuit(name, options);

    return async function (...args) {
        return circuit.execute(fn, ...args);
    };
}

/**
 * Create circuit breaker for HTTP calls
 * @param {string} name - Circuit name
 * @param {Object} options - Options including baseURL
 * @returns {Object} HTTP client with circuit breaker
 */
function createHttpCircuit(name, options = {}) {
    const circuit = getCircuit(name, {
        callTimeout: options.timeout || 10000,
        ...options
    });

    return {
        async fetch(url, fetchOptions = {}) {
            return circuit.execute(async () => {
                const response = await fetch(url, {
                    ...fetchOptions,
                    signal: AbortSignal.timeout(circuit.callTimeout)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json();
            });
        },

        getCircuit: () => circuit
    };
}

// ============================================
// QUERIES
// ============================================

/**
 * Get all circuits
 * @returns {Object[]}
 */
function getAllCircuits() {
    const result = [];
    for (const circuit of circuits.values()) {
        result.push(circuit.getStatus());
    }
    return result;
}

/**
 * Get circuit by name
 * @param {string} name - Circuit name
 * @returns {Object|null}
 */
function getCircuitStatus(name) {
    const circuit = circuits.get(name);
    return circuit ? circuit.getStatus() : null;
}

/**
 * Force circuit state
 * @param {string} name - Circuit name
 * @param {string} state - 'open' or 'closed'
 * @returns {boolean}
 */
function forceCircuitState(name, state) {
    const circuit = circuits.get(name);
    if (!circuit) return false;

    if (state === 'open') {
        circuit.forceOpen();
    } else if (state === 'closed') {
        circuit.forceClose();
    } else {
        return false;
    }

    return true;
}

/**
 * Reset circuit
 * @param {string} name - Circuit name
 * @returns {boolean}
 */
function resetCircuit(name) {
    const circuit = circuits.get(name);
    if (!circuit) return false;

    circuit.reset();
    return true;
}

/**
 * Remove circuit
 * @param {string} name - Circuit name
 * @returns {boolean}
 */
function removeCircuit(name) {
    return circuits.delete(name);
}

// ============================================
// METRICS
// ============================================

/**
 * Get global statistics
 * @returns {Object}
 */
function getStats() {
    let openCount = 0;
    let halfOpenCount = 0;
    let closedCount = 0;

    for (const circuit of circuits.values()) {
        switch (circuit.state) {
            case STATES.OPEN:
                openCount++;
                break;
            case STATES.HALF_OPEN:
                halfOpenCount++;
                break;
            case STATES.CLOSED:
                closedCount++;
                break;
        }
    }

    return {
        ...globalStats,
        circuitCount: circuits.size,
        byState: {
            open: openCount,
            halfOpen: halfOpenCount,
            closed: closedCount
        },
        failureRate: globalStats.totalCalls > 0
            ? ((globalStats.totalFailures / globalStats.totalCalls) * 100).toFixed(2) + '%'
            : '0%'
    };
}

// ============================================
// PREDEFINED CIRCUITS
// ============================================

// Create common circuits
getCircuit('helius', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
    callTimeout: 15000,
    fallback: async (error) => {
        console.warn('[CircuitBreaker] Helius fallback triggered:', error.message);
        return { error: 'Service temporarily unavailable', fallback: true };
    }
});

getCircuit('solana-rpc', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000,
    callTimeout: 30000
});

getCircuit('external-api', {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    callTimeout: 10000,
    maxConcurrent: 20
});

module.exports = {
    // Class
    CircuitBreaker,

    // Factory
    getCircuit,
    execute,
    wrap,
    createHttpCircuit,

    // Management
    getAllCircuits,
    getCircuitStatus,
    forceCircuitState,
    resetCircuit,
    removeCircuit,

    // Metrics
    getStats,

    // Constants
    STATES,
    CIRCUIT_CONFIG
};
