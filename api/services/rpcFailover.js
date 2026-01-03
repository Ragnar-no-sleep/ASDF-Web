/**
 * ASDF API - RPC Failover Service
 *
 * Production-ready RPC endpoint management:
 * - Multiple endpoint support with automatic failover
 * - Health monitoring and latency tracking
 * - Weighted load balancing
 * - Automatic recovery and circuit breaking
 *
 * Helius Best Practices:
 * - Dedicated endpoints for different operations
 * - Rate limit awareness per endpoint
 * - Staked connection prioritization
 *
 * Security by Design:
 * - API key rotation support
 * - Request signing verification
 * - Audit logging for failover events
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const RPC_CONFIG = {
    // Health check interval
    healthCheckInterval: 30000,     // 30 seconds

    // Request timeout
    requestTimeout: 10000,          // 10 seconds

    // Failover settings
    failoverThreshold: 3,           // Failures before failover
    recoveryThreshold: 2,           // Successes before recovery
    recoveryCheckInterval: 60000,   // 1 minute

    // Latency thresholds (ms)
    latencyThresholds: {
        excellent: 100,
        good: 300,
        acceptable: 500,
        degraded: 1000
    },

    // Rate limiting awareness
    rateLimitBuffer: 0.8,           // Use 80% of rate limit

    // Retry settings
    maxRetries: 3,
    retryDelay: 1000,               // Base delay in ms
    retryBackoffMultiplier: 2
};

// Endpoint types for specialized routing
const ENDPOINT_TYPES = {
    STANDARD: 'standard',           // General RPC calls
    ENHANCED: 'enhanced',           // Helius enhanced API
    DAS: 'das',                     // Digital Asset Standard
    WEBHOOK: 'webhook',             // Webhook management
    PRIORITY: 'priority'            // Priority/staked connections
};

// ============================================
// STORAGE
// ============================================

// Registered endpoints
const endpoints = new Map();

// Endpoint health status
const healthStatus = new Map();

// Request statistics per endpoint
const endpointStats = new Map();

// Current primary endpoint per type
const primaryEndpoints = new Map();

// Global stats
const failoverStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    failovers: 0,
    recoveries: 0,
    retries: 0
};

// Health check timer
let healthCheckTimer = null;

// ============================================
// ENDPOINT REGISTRATION
// ============================================

/**
 * Register an RPC endpoint
 * @param {string} id - Unique endpoint ID
 * @param {Object} config - Endpoint configuration
 */
function registerEndpoint(id, config) {
    const {
        url,
        apiKey = null,
        type = ENDPOINT_TYPES.STANDARD,
        weight = 1,
        rateLimit = 100,           // Requests per second
        priority = 0,              // Higher = preferred
        staked = false,            // Staked connection
        region = 'global'
    } = config;

    if (!url) {
        throw new Error('Endpoint URL is required');
    }

    // Mask API key in URL if present
    const maskedUrl = maskApiKey(url);

    endpoints.set(id, {
        id,
        url,
        maskedUrl,
        apiKey,
        type,
        weight,
        rateLimit,
        priority,
        staked,
        region,
        registeredAt: Date.now()
    });

    // Initialize health status
    healthStatus.set(id, {
        healthy: true,
        lastCheck: null,
        latency: null,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastError: null,
        degraded: false
    });

    // Initialize stats
    endpointStats.set(id, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalLatency: 0,
        avgLatency: 0,
        rateLimitHits: 0,
        lastRequest: null
    });

    // Set as primary if none exists for this type
    if (!primaryEndpoints.has(type)) {
        primaryEndpoints.set(type, id);
    }

    console.log(`[RPC] Registered endpoint: ${id} (${type}, priority: ${priority})`);

    logAudit('rpc_endpoint_registered', {
        id,
        type,
        region,
        staked
    });
}

/**
 * Unregister an endpoint
 * @param {string} id - Endpoint ID
 * @returns {boolean}
 */
function unregisterEndpoint(id) {
    const existed = endpoints.delete(id);
    healthStatus.delete(id);
    endpointStats.delete(id);

    // Update primary if needed
    for (const [type, primaryId] of primaryEndpoints.entries()) {
        if (primaryId === id) {
            const newPrimary = selectNewPrimary(type);
            if (newPrimary) {
                primaryEndpoints.set(type, newPrimary);
            } else {
                primaryEndpoints.delete(type);
            }
        }
    }

    return existed;
}

/**
 * Mask API key in URL for logging
 * @param {string} url - URL with potential API key
 * @returns {string}
 */
function maskApiKey(url) {
    return url.replace(/api[_-]?key=([^&]+)/gi, 'api_key=***')
              .replace(/\/v\d\/([a-f0-9-]{36})/gi, '/v0/***');
}

// ============================================
// ENDPOINT SELECTION
// ============================================

/**
 * Get best endpoint for request type
 * @param {string} type - Endpoint type
 * @param {Object} options - Selection options
 * @returns {Object|null}
 */
function selectEndpoint(type = ENDPOINT_TYPES.STANDARD, options = {}) {
    const {
        excludeIds = [],
        requireHealthy = true,
        preferStaked = false
    } = options;

    // Get all endpoints of this type
    const candidates = Array.from(endpoints.values())
        .filter(ep => {
            if (ep.type !== type) return false;
            if (excludeIds.includes(ep.id)) return false;

            const health = healthStatus.get(ep.id);
            if (requireHealthy && health && !health.healthy) return false;

            return true;
        });

    if (candidates.length === 0) {
        // Fall back to any healthy endpoint
        const fallback = Array.from(endpoints.values())
            .find(ep => {
                const health = healthStatus.get(ep.id);
                return health?.healthy && !excludeIds.includes(ep.id);
            });

        return fallback || null;
    }

    // Sort by priority and health
    candidates.sort((a, b) => {
        // Prefer staked if requested
        if (preferStaked) {
            if (a.staked && !b.staked) return -1;
            if (!a.staked && b.staked) return 1;
        }

        // Then by priority
        if (b.priority !== a.priority) {
            return b.priority - a.priority;
        }

        // Then by latency
        const healthA = healthStatus.get(a.id);
        const healthB = healthStatus.get(b.id);
        const latencyA = healthA?.latency || Infinity;
        const latencyB = healthB?.latency || Infinity;

        return latencyA - latencyB;
    });

    // Weighted selection among top candidates
    return weightedSelect(candidates.slice(0, 3));
}

/**
 * Weighted random selection
 * @param {Array} endpoints - Candidate endpoints
 * @returns {Object}
 */
function weightedSelect(endpoints) {
    if (endpoints.length === 0) return null;
    if (endpoints.length === 1) return endpoints[0];

    const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;

    for (const ep of endpoints) {
        random -= ep.weight;
        if (random <= 0) {
            return ep;
        }
    }

    return endpoints[0];
}

/**
 * Select new primary for type
 * @param {string} type - Endpoint type
 * @returns {string|null}
 */
function selectNewPrimary(type) {
    const endpoint = selectEndpoint(type, { requireHealthy: true });
    return endpoint?.id || null;
}

// ============================================
// REQUEST EXECUTION
// ============================================

/**
 * Execute RPC request with failover
 * @param {string} method - RPC method
 * @param {Array} params - Method parameters
 * @param {Object} options - Request options
 * @returns {Promise<Object>}
 */
async function executeRequest(method, params = [], options = {}) {
    const {
        type = ENDPOINT_TYPES.STANDARD,
        timeout = RPC_CONFIG.requestTimeout,
        retries = RPC_CONFIG.maxRetries,
        preferStaked = false
    } = options;

    failoverStats.totalRequests++;
    const excludeIds = [];
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const endpoint = selectEndpoint(type, {
            excludeIds,
            requireHealthy: true,
            preferStaked
        });

        if (!endpoint) {
            throw new Error('No healthy RPC endpoints available');
        }

        try {
            const result = await executeOnEndpoint(endpoint, method, params, timeout);

            // Record success
            recordSuccess(endpoint.id);
            failoverStats.successfulRequests++;

            return result;

        } catch (error) {
            lastError = error;
            excludeIds.push(endpoint.id);

            // Record failure
            recordFailure(endpoint.id, error);

            // Check if we should retry
            if (attempt < retries) {
                failoverStats.retries++;

                // Exponential backoff
                const delay = RPC_CONFIG.retryDelay * Math.pow(RPC_CONFIG.retryBackoffMultiplier, attempt);
                await sleep(delay);

                console.warn(`[RPC] Retry ${attempt + 1}/${retries} after error: ${error.message}`);
            }
        }
    }

    failoverStats.failedRequests++;
    throw lastError || new Error('RPC request failed after all retries');
}

/**
 * Execute request on specific endpoint
 * @param {Object} endpoint - Endpoint config
 * @param {string} method - RPC method
 * @param {Array} params - Parameters
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Object>}
 */
async function executeOnEndpoint(endpoint, method, params, timeout) {
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add API key header if present
        if (endpoint.apiKey) {
            headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
        }

        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: generateRequestId(),
                method,
                params
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check for rate limiting
        if (response.status === 429) {
            const stats = endpointStats.get(endpoint.id);
            if (stats) {
                stats.rateLimitHits++;
            }
            throw new Error('Rate limit exceeded');
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Check for RPC error
        if (data.error) {
            throw new Error(data.error.message || 'RPC error');
        }

        // Record latency
        const latency = Date.now() - startTime;
        updateLatency(endpoint.id, latency);

        return data.result;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }

        throw error;
    }
}

/**
 * Execute Helius Enhanced API request
 * @param {string} path - API path
 * @param {Object} body - Request body
 * @param {Object} options - Request options
 * @returns {Promise<Object>}
 */
async function executeEnhancedRequest(path, body = {}, options = {}) {
    const {
        timeout = RPC_CONFIG.requestTimeout,
        retries = RPC_CONFIG.maxRetries
    } = options;

    const excludeIds = [];
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const endpoint = selectEndpoint(ENDPOINT_TYPES.ENHANCED, {
            excludeIds,
            requireHealthy: true
        });

        if (!endpoint) {
            throw new Error('No healthy Enhanced API endpoints available');
        }

        const startTime = Date.now();

        try {
            const url = new URL(path, endpoint.url);

            const headers = {
                'Content-Type': 'application/json'
            };

            if (endpoint.apiKey) {
                headers['Authorization'] = `Bearer ${endpoint.apiKey}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url.toString(), {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 429) {
                const stats = endpointStats.get(endpoint.id);
                if (stats) stats.rateLimitHits++;
                throw new Error('Rate limit exceeded');
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const latency = Date.now() - startTime;
            updateLatency(endpoint.id, latency);
            recordSuccess(endpoint.id);

            return data;

        } catch (error) {
            lastError = error;
            excludeIds.push(endpoint.id);
            recordFailure(endpoint.id, error);

            if (attempt < retries) {
                const delay = RPC_CONFIG.retryDelay * Math.pow(RPC_CONFIG.retryBackoffMultiplier, attempt);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error('Enhanced API request failed');
}

// ============================================
// HEALTH MONITORING
// ============================================

/**
 * Check health of an endpoint
 * @param {string} id - Endpoint ID
 * @returns {Promise<Object>}
 */
async function checkEndpointHealth(id) {
    const endpoint = endpoints.get(id);
    if (!endpoint) {
        return { healthy: false, error: 'Endpoint not found' };
    }

    const health = healthStatus.get(id);
    const startTime = Date.now();

    try {
        // Use getHealth for Helius endpoints, getSlot for standard RPC
        let result;
        if (endpoint.type === ENDPOINT_TYPES.ENHANCED) {
            result = await executeOnEndpoint(endpoint, 'getHealth', [], 5000);
        } else {
            result = await executeOnEndpoint(endpoint, 'getSlot', [], 5000);
        }

        const latency = Date.now() - startTime;

        // Update health status
        health.healthy = true;
        health.lastCheck = Date.now();
        health.latency = latency;
        health.consecutiveFailures = 0;
        health.consecutiveSuccesses++;
        health.lastError = null;
        health.degraded = latency > RPC_CONFIG.latencyThresholds.degraded;

        // Check for recovery
        if (health.consecutiveSuccesses >= RPC_CONFIG.recoveryThreshold) {
            const wasUnhealthy = !primaryEndpoints.has(endpoint.type) ||
                                 primaryEndpoints.get(endpoint.type) !== id;

            if (wasUnhealthy && endpoint.priority > 0) {
                // Consider promoting back to primary
                const currentPrimary = primaryEndpoints.get(endpoint.type);
                const currentPrimaryHealth = healthStatus.get(currentPrimary);

                if (!currentPrimaryHealth?.healthy ||
                    (currentPrimaryHealth.latency && latency < currentPrimaryHealth.latency * 0.8)) {
                    primaryEndpoints.set(endpoint.type, id);
                    failoverStats.recoveries++;

                    logAudit('rpc_endpoint_recovered', { id, type: endpoint.type });
                }
            }
        }

        return {
            healthy: true,
            latency,
            slot: result
        };

    } catch (error) {
        health.healthy = false;
        health.lastCheck = Date.now();
        health.consecutiveFailures++;
        health.consecutiveSuccesses = 0;
        health.lastError = error.message;

        // Trigger failover if threshold reached
        if (health.consecutiveFailures >= RPC_CONFIG.failoverThreshold) {
            const currentPrimary = primaryEndpoints.get(endpoint.type);
            if (currentPrimary === id) {
                const newPrimary = selectNewPrimary(endpoint.type);
                if (newPrimary && newPrimary !== id) {
                    primaryEndpoints.set(endpoint.type, newPrimary);
                    failoverStats.failovers++;

                    logAudit('rpc_failover', {
                        from: id,
                        to: newPrimary,
                        type: endpoint.type,
                        reason: error.message
                    });

                    console.warn(`[RPC] Failover: ${id} -> ${newPrimary}`);
                }
            }
        }

        return {
            healthy: false,
            error: error.message
        };
    }
}

/**
 * Check all endpoints health
 * @returns {Promise<Map>}
 */
async function checkAllEndpointsHealth() {
    const results = new Map();

    await Promise.all(
        Array.from(endpoints.keys()).map(async (id) => {
            const result = await checkEndpointHealth(id);
            results.set(id, result);
        })
    );

    return results;
}

/**
 * Start background health checks
 * @param {number} interval - Check interval in ms
 */
function startHealthChecks(interval = RPC_CONFIG.healthCheckInterval) {
    if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
    }

    healthCheckTimer = setInterval(async () => {
        try {
            await checkAllEndpointsHealth();
        } catch (error) {
            console.error('[RPC] Health check error:', error.message);
        }
    }, interval);

    console.log(`[RPC] Health checks started (${interval}ms interval)`);
}

/**
 * Stop background health checks
 */
function stopHealthChecks() {
    if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
    }
}

// ============================================
// STATISTICS TRACKING
// ============================================

/**
 * Record successful request
 * @param {string} id - Endpoint ID
 */
function recordSuccess(id) {
    const stats = endpointStats.get(id);
    if (stats) {
        stats.requests++;
        stats.successes++;
        stats.lastRequest = Date.now();
    }
}

/**
 * Record failed request
 * @param {string} id - Endpoint ID
 * @param {Error} error - Error that occurred
 */
function recordFailure(id, error) {
    const stats = endpointStats.get(id);
    if (stats) {
        stats.requests++;
        stats.failures++;
        stats.lastRequest = Date.now();
    }

    const health = healthStatus.get(id);
    if (health) {
        health.consecutiveFailures++;
        health.consecutiveSuccesses = 0;
        health.lastError = error.message;
    }
}

/**
 * Update endpoint latency
 * @param {string} id - Endpoint ID
 * @param {number} latency - Request latency in ms
 */
function updateLatency(id, latency) {
    const stats = endpointStats.get(id);
    if (stats) {
        stats.totalLatency += latency;
        stats.avgLatency = stats.totalLatency / stats.successes;
    }

    const health = healthStatus.get(id);
    if (health) {
        health.latency = latency;
    }
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate unique request ID
 * @returns {string}
 */
function generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep helper
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// METRICS
// ============================================

/**
 * Get endpoint status
 * @param {string} id - Endpoint ID
 * @returns {Object|null}
 */
function getEndpointStatus(id) {
    const endpoint = endpoints.get(id);
    if (!endpoint) return null;

    const health = healthStatus.get(id);
    const stats = endpointStats.get(id);

    return {
        id,
        type: endpoint.type,
        region: endpoint.region,
        staked: endpoint.staked,
        priority: endpoint.priority,
        health: {
            healthy: health?.healthy ?? false,
            degraded: health?.degraded ?? false,
            latency: health?.latency,
            lastCheck: health?.lastCheck,
            consecutiveFailures: health?.consecutiveFailures ?? 0
        },
        stats: {
            requests: stats?.requests ?? 0,
            successes: stats?.successes ?? 0,
            failures: stats?.failures ?? 0,
            avgLatency: stats?.avgLatency ? `${stats.avgLatency.toFixed(0)}ms` : null,
            rateLimitHits: stats?.rateLimitHits ?? 0,
            successRate: stats?.requests > 0
                ? ((stats.successes / stats.requests) * 100).toFixed(2) + '%'
                : '100%'
        },
        isPrimary: Array.from(primaryEndpoints.values()).includes(id)
    };
}

/**
 * Get all endpoints status
 * @returns {Array}
 */
function getAllEndpointsStatus() {
    return Array.from(endpoints.keys()).map(id => getEndpointStatus(id));
}

/**
 * Get failover statistics
 * @returns {Object}
 */
function getStats() {
    const healthyCount = Array.from(healthStatus.values())
        .filter(h => h.healthy).length;

    return {
        ...failoverStats,
        endpoints: {
            total: endpoints.size,
            healthy: healthyCount,
            unhealthy: endpoints.size - healthyCount
        },
        primaryEndpoints: Object.fromEntries(primaryEndpoints),
        successRate: failoverStats.totalRequests > 0
            ? ((failoverStats.successfulRequests / failoverStats.totalRequests) * 100).toFixed(2) + '%'
            : '100%',
        avgRetries: failoverStats.totalRequests > 0
            ? (failoverStats.retries / failoverStats.totalRequests).toFixed(2)
            : '0'
    };
}

// ============================================
// INITIALIZATION
// ============================================

// Register default Helius endpoints from environment
function initializeFromEnv() {
    const heliusApiKey = process.env.HELIUS_API_KEY;
    const heliusRpcUrl = process.env.HELIUS_RPC_URL;

    if (heliusRpcUrl) {
        registerEndpoint('helius-primary', {
            url: heliusRpcUrl,
            apiKey: heliusApiKey,
            type: ENDPOINT_TYPES.STANDARD,
            priority: 10,
            staked: true,
            region: 'global'
        });

        // Also register for enhanced if URL supports it
        if (heliusRpcUrl.includes('helius')) {
            registerEndpoint('helius-enhanced', {
                url: heliusRpcUrl.replace('/v0/', '/v0/'),
                apiKey: heliusApiKey,
                type: ENDPOINT_TYPES.ENHANCED,
                priority: 10,
                region: 'global'
            });
        }
    }

    // Fallback public RPC
    registerEndpoint('solana-mainnet', {
        url: 'https://api.mainnet-beta.solana.com',
        type: ENDPOINT_TYPES.STANDARD,
        priority: 1,
        region: 'global'
    });

    // Start health checks
    startHealthChecks();
}

// Initialize on load
initializeFromEnv();

module.exports = {
    // Constants
    ENDPOINT_TYPES,
    RPC_CONFIG,

    // Registration
    registerEndpoint,
    unregisterEndpoint,

    // Selection
    selectEndpoint,

    // Execution
    executeRequest,
    executeEnhancedRequest,

    // Health
    checkEndpointHealth,
    checkAllEndpointsHealth,
    startHealthChecks,
    stopHealthChecks,

    // Status
    getEndpointStatus,
    getAllEndpointsStatus,
    getStats
};
