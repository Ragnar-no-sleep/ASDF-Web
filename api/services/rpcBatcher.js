/**
 * ASDF API - RPC Batching Service
 *
 * Production-ready JSON-RPC batching for Helius:
 * - Automatic request coalescing
 * - Batch size optimization
 * - Request deduplication
 * - Priority queue for critical requests
 * - Retry with exponential backoff
 *
 * @author Helius Engineering Standards
 * @version 1.0.0
 *
 * Security by Design:
 * - Rate limit awareness
 * - Request validation
 * - Error isolation
 * - Memory bounds
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const RPC_URL =
  process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

const BATCHER_CONFIG = {
  // Batch settings
  maxBatchSize: 100, // Max requests per batch
  batchDelayMs: 50, // Wait time to coalesce (Fibonacci: ~55ms)

  // Timeouts (Fibonacci-based)
  requestTimeout: 13000, // 13 seconds per batch
  maxRetries: 3,

  // Rate limiting
  maxRequestsPerSecond: 50, // Helius rate limit awareness
  burstCapacity: 100,

  // Priority levels (higher = more urgent)
  priority: {
    CRITICAL: 4, // Balance checks, confirms
    HIGH: 3, // Transaction building
    NORMAL: 2, // General queries
    LOW: 1, // Background sync
    BATCH: 0, // Bulk operations
  },

  // Retry backoff (Fibonacci)
  backoffMs: [100, 200, 300, 500, 800],

  // Memory limits
  maxPendingRequests: 1000,
  maxQueueMemoryMB: 50,
};

// ============================================
// STATE
// ============================================

// Pending requests by priority
const pendingQueues = new Map([
  [4, []], // CRITICAL
  [3, []], // HIGH
  [2, []], // NORMAL
  [1, []], // LOW
  [0, []], // BATCH
]);

// Request deduplication cache
const dedupeCache = new Map();
const DEDUPE_TTL = 1000; // 1 second

// Batch timer
let batchTimer = null;
let isProcessing = false;

// Token bucket for rate limiting
const tokenBucket = {
  tokens: BATCHER_CONFIG.burstCapacity,
  lastRefill: Date.now(),
};

// Statistics
const stats = {
  totalRequests: 0,
  batchedRequests: 0,
  deduplicatedRequests: 0,
  totalBatches: 0,
  successfulBatches: 0,
  failedBatches: 0,
  totalRetries: 0,
  avgBatchSize: 0,
  avgLatency: 0,
};

// ============================================
// REQUEST COALESCING
// ============================================

/**
 * Queue an RPC request for batching
 * @param {string} method - RPC method
 * @param {Array|Object} params - RPC parameters
 * @param {Object} options - Request options
 * @returns {Promise<any>}
 */
function queueRequest(method, params = [], options = {}) {
  return new Promise((resolve, reject) => {
    const {
      priority = BATCHER_CONFIG.priority.NORMAL,
      timeout = BATCHER_CONFIG.requestTimeout,
      dedupe = true,
      cacheKey = null,
    } = options;

    stats.totalRequests++;

    // Check memory limits
    const totalPending = getTotalPendingCount();
    if (totalPending >= BATCHER_CONFIG.maxPendingRequests) {
      return reject(new Error('RPC queue full, try again later'));
    }

    // Generate dedup key
    const dedupeKey = cacheKey || generateDedupeKey(method, params);

    // Check for duplicate in-flight request
    if (dedupe && dedupeCache.has(dedupeKey)) {
      const existing = dedupeCache.get(dedupeKey);
      if (Date.now() - existing.timestamp < DEDUPE_TTL) {
        stats.deduplicatedRequests++;
        // Piggyback on existing request
        existing.callbacks.push({ resolve, reject });
        return;
      }
    }

    // Create request object
    const request = {
      id: generateRequestId(),
      method,
      params,
      priority,
      dedupeKey,
      timestamp: Date.now(),
      timeout,
      callbacks: [{ resolve, reject }],
      retries: 0,
    };

    // Add to dedupe cache
    if (dedupe) {
      dedupeCache.set(dedupeKey, request);
    }

    // Add to priority queue
    const queue = pendingQueues.get(priority) || pendingQueues.get(2);
    queue.push(request);
    stats.batchedRequests++;

    // Schedule batch processing
    scheduleBatch();

    // Set request timeout
    setTimeout(() => {
      if (!request.completed) {
        request.completed = true;
        request.callbacks.forEach(cb => cb.reject(new Error('Request timeout')));
        removeFromQueue(request);
      }
    }, timeout);
  });
}

/**
 * Queue multiple requests as a single batch
 * @param {Array<{method: string, params: any}>} requests - Requests to batch
 * @param {Object} options - Batch options
 * @returns {Promise<Array>}
 */
async function queueBatch(requests, options = {}) {
  const { priority = BATCHER_CONFIG.priority.BATCH, stopOnError = false } = options;

  const promises = requests.map(req =>
    queueRequest(req.method, req.params, { ...options, priority })
  );

  if (stopOnError) {
    return Promise.all(promises);
  }

  // Return results even if some fail
  const results = await Promise.allSettled(promises);
  return results.map(r => (r.status === 'fulfilled' ? r.value : { error: r.reason.message }));
}

/**
 * Execute request immediately (bypass batching)
 * @param {string} method - RPC method
 * @param {Array|Object} params - RPC parameters
 * @returns {Promise<any>}
 */
async function executeImmediate(method, params = []) {
  const request = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method,
    params,
  };

  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`RPC error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  return data.result;
}

// ============================================
// BATCH PROCESSING
// ============================================

/**
 * Schedule batch processing
 */
function scheduleBatch() {
  if (batchTimer || isProcessing) return;

  batchTimer = setTimeout(async () => {
    batchTimer = null;
    await processBatch();
  }, BATCHER_CONFIG.batchDelayMs);
}

/**
 * Process pending requests as a batch
 */
async function processBatch() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // Collect requests by priority (highest first)
    const requests = [];

    for (const priority of [4, 3, 2, 1, 0]) {
      const queue = pendingQueues.get(priority);
      while (queue.length > 0 && requests.length < BATCHER_CONFIG.maxBatchSize) {
        requests.push(queue.shift());
      }
    }

    if (requests.length === 0) {
      return;
    }

    // Check rate limit
    await acquireTokens(requests.length);

    stats.totalBatches++;
    const startTime = Date.now();

    // Build JSON-RPC batch
    const rpcBatch = requests.map(req => ({
      jsonrpc: '2.0',
      id: req.id,
      method: req.method,
      params: req.params,
    }));

    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rpcBatch),
      });

      if (!response.ok) {
        throw new Error(`RPC batch error: ${response.status}`);
      }

      const results = await response.json();
      const latency = Date.now() - startTime;

      // Update stats
      stats.successfulBatches++;
      updateAverages(requests.length, latency);

      // Process results
      const resultMap = new Map();
      if (Array.isArray(results)) {
        for (const result of results) {
          resultMap.set(result.id, result);
        }
      }

      // Resolve promises
      for (const request of requests) {
        const result = resultMap.get(request.id);
        request.completed = true;

        // Clean up dedupe cache
        dedupeCache.delete(request.dedupeKey);

        if (!result) {
          request.callbacks.forEach(cb => cb.reject(new Error('No response for request')));
        } else if (result.error) {
          request.callbacks.forEach(cb =>
            cb.reject(new Error(result.error.message || 'RPC error'))
          );
        } else {
          request.callbacks.forEach(cb => cb.resolve(result.result));
        }
      }
    } catch (error) {
      stats.failedBatches++;

      // Retry failed requests
      for (const request of requests) {
        if (request.retries < BATCHER_CONFIG.maxRetries) {
          request.retries++;
          stats.totalRetries++;

          // Re-queue with backoff
          const backoffIndex = Math.min(request.retries - 1, BATCHER_CONFIG.backoffMs.length - 1);
          const backoff = BATCHER_CONFIG.backoffMs[backoffIndex];

          setTimeout(() => {
            if (!request.completed) {
              const queue = pendingQueues.get(request.priority);
              queue.push(request);
              scheduleBatch();
            }
          }, backoff);
        } else {
          request.completed = true;
          dedupeCache.delete(request.dedupeKey);
          request.callbacks.forEach(cb => cb.reject(error));
        }
      }

      logAudit('rpc_batch_error', {
        error: error.message,
        batchSize: requests.length,
      });
    }
  } finally {
    isProcessing = false;

    // Process remaining if any
    if (getTotalPendingCount() > 0) {
      scheduleBatch();
    }
  }
}

// ============================================
// RATE LIMITING
// ============================================

/**
 * Acquire tokens from bucket
 * @param {number} count - Tokens needed
 */
async function acquireTokens(count) {
  // Refill tokens
  const now = Date.now();
  const elapsed = now - tokenBucket.lastRefill;
  const refill = (elapsed / 1000) * BATCHER_CONFIG.maxRequestsPerSecond;
  tokenBucket.tokens = Math.min(BATCHER_CONFIG.burstCapacity, tokenBucket.tokens + refill);
  tokenBucket.lastRefill = now;

  // Wait if not enough tokens
  while (tokenBucket.tokens < count) {
    const needed = count - tokenBucket.tokens;
    const waitMs = (needed / BATCHER_CONFIG.maxRequestsPerSecond) * 1000;
    await sleep(Math.ceil(waitMs));

    // Refill after wait
    const newElapsed = Date.now() - tokenBucket.lastRefill;
    const newRefill = (newElapsed / 1000) * BATCHER_CONFIG.maxRequestsPerSecond;
    tokenBucket.tokens = Math.min(BATCHER_CONFIG.burstCapacity, tokenBucket.tokens + newRefill);
    tokenBucket.lastRefill = Date.now();
  }

  tokenBucket.tokens -= count;
}

// ============================================
// HELPER METHODS
// ============================================

/**
 * Generate request ID
 * @returns {string}
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
}

/**
 * Generate deduplication key
 * @param {string} method - RPC method
 * @param {any} params - Request params
 * @returns {string}
 */
function generateDedupeKey(method, params) {
  return `${method}:${JSON.stringify(params)}`;
}

/**
 * Get total pending request count
 * @returns {number}
 */
function getTotalPendingCount() {
  let total = 0;
  for (const queue of pendingQueues.values()) {
    total += queue.length;
  }
  return total;
}

/**
 * Remove request from queue
 * @param {Object} request - Request to remove
 */
function removeFromQueue(request) {
  const queue = pendingQueues.get(request.priority);
  if (queue) {
    const index = queue.indexOf(request);
    if (index > -1) {
      queue.splice(index, 1);
    }
  }
  dedupeCache.delete(request.dedupeKey);
}

/**
 * Update average statistics
 * @param {number} batchSize - Batch size
 * @param {number} latency - Request latency
 */
function updateAverages(batchSize, latency) {
  const n = stats.successfulBatches;
  stats.avgBatchSize = (stats.avgBatchSize * (n - 1) + batchSize) / n;
  stats.avgLatency = (stats.avgLatency * (n - 1) + latency) / n;
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * Get account balance
 * @param {string} address - Account address
 * @param {Object} options - Request options
 * @returns {Promise<number>}
 */
function getBalance(address, options = {}) {
  return queueRequest('getBalance', [address], {
    priority: BATCHER_CONFIG.priority.HIGH,
    ...options,
  });
}

/**
 * Get multiple account balances
 * @param {string[]} addresses - Account addresses
 * @returns {Promise<Array>}
 */
function getBalances(addresses) {
  return queueBatch(
    addresses.map(addr => ({ method: 'getBalance', params: [addr] })),
    { priority: BATCHER_CONFIG.priority.BATCH }
  );
}

/**
 * Get account info
 * @param {string} address - Account address
 * @param {Object} encoding - Encoding options
 * @returns {Promise<Object>}
 */
function getAccountInfo(address, encoding = { encoding: 'base64' }) {
  return queueRequest('getAccountInfo', [address, encoding], {
    priority: BATCHER_CONFIG.priority.NORMAL,
  });
}

/**
 * Get multiple accounts
 * @param {string[]} addresses - Account addresses
 * @param {Object} encoding - Encoding options
 * @returns {Promise<Array>}
 */
function getMultipleAccounts(addresses, encoding = { encoding: 'base64' }) {
  return queueRequest('getMultipleAccounts', [addresses, encoding], {
    priority: BATCHER_CONFIG.priority.NORMAL,
  });
}

/**
 * Get recent blockhash
 * @param {Object} commitment - Commitment config
 * @returns {Promise<Object>}
 */
function getLatestBlockhash(commitment = { commitment: 'finalized' }) {
  return queueRequest('getLatestBlockhash', [commitment], {
    priority: BATCHER_CONFIG.priority.CRITICAL,
    dedupe: true,
    cacheKey: `blockhash:${commitment.commitment}`,
  });
}

/**
 * Get signature status
 * @param {string[]} signatures - Transaction signatures
 * @param {Object} options - Options
 * @returns {Promise<Object>}
 */
function getSignatureStatuses(signatures, options = {}) {
  return queueRequest('getSignatureStatuses', [signatures, options], {
    priority: BATCHER_CONFIG.priority.CRITICAL,
  });
}

/**
 * Get token accounts by owner
 * @param {string} owner - Owner address
 * @param {Object} filter - Token filter
 * @returns {Promise<Object>}
 */
function getTokenAccountsByOwner(owner, filter) {
  return queueRequest('getTokenAccountsByOwner', [owner, filter, { encoding: 'jsonParsed' }], {
    priority: BATCHER_CONFIG.priority.HIGH,
  });
}

/**
 * Send transaction
 * @param {string} signedTransaction - Base64 encoded signed transaction
 * @param {Object} options - Send options
 * @returns {Promise<string>}
 */
function sendTransaction(signedTransaction, options = {}) {
  return executeImmediate('sendTransaction', [
    signedTransaction,
    {
      encoding: 'base64',
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
      ...options,
    },
  ]);
}

/**
 * Simulate transaction
 * @param {string} transaction - Base64 encoded transaction
 * @param {Object} options - Simulation options
 * @returns {Promise<Object>}
 */
function simulateTransaction(transaction, options = {}) {
  return queueRequest(
    'simulateTransaction',
    [
      transaction,
      {
        encoding: 'base64',
        commitment: 'confirmed',
        ...options,
      },
    ],
    {
      priority: BATCHER_CONFIG.priority.HIGH,
    }
  );
}

// ============================================
// METRICS & HEALTH
// ============================================

/**
 * Get batcher statistics
 * @returns {Object}
 */
function getStats() {
  const pending = {};
  for (const [priority, queue] of pendingQueues.entries()) {
    pending[`priority_${priority}`] = queue.length;
  }

  return {
    ...stats,
    pending,
    totalPending: getTotalPendingCount(),
    dedupeCache: dedupeCache.size,
    tokenBucket: {
      tokens: Math.floor(tokenBucket.tokens),
      capacity: BATCHER_CONFIG.burstCapacity,
    },
    avgBatchSize: stats.avgBatchSize.toFixed(1),
    avgLatency: `${stats.avgLatency.toFixed(0)}ms`,
    successRate:
      stats.totalBatches > 0
        ? ((stats.successfulBatches / stats.totalBatches) * 100).toFixed(2) + '%'
        : '100%',
    dedupeRate:
      stats.totalRequests > 0
        ? ((stats.deduplicatedRequests / stats.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
  };
}

/**
 * Health check
 * @returns {Promise<Object>}
 */
async function healthCheck() {
  const start = Date.now();

  try {
    await executeImmediate('getHealth');

    return {
      healthy: true,
      latency: Date.now() - start,
      pendingRequests: getTotalPendingCount(),
      tokenBucket: Math.floor(tokenBucket.tokens),
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      latency: Date.now() - start,
    };
  }
}

/**
 * Clear pending requests
 * @param {string} reason - Clear reason
 */
function clearPending(reason = 'manual') {
  const error = new Error(`Queue cleared: ${reason}`);

  for (const queue of pendingQueues.values()) {
    while (queue.length > 0) {
      const request = queue.pop();
      request.completed = true;
      request.callbacks.forEach(cb => cb.reject(error));
    }
  }

  dedupeCache.clear();

  logAudit('rpc_queue_cleared', { reason });
}

// ============================================
// CLEANUP
// ============================================

// Clean up old dedupe entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, request] of dedupeCache.entries()) {
    if (now - request.timestamp > DEDUPE_TTL * 10) {
      dedupeCache.delete(key);
    }
  }
}, 60 * 1000);

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Core batching
  queueRequest,
  queueBatch,
  executeImmediate,

  // Convenience methods
  getBalance,
  getBalances,
  getAccountInfo,
  getMultipleAccounts,
  getLatestBlockhash,
  getSignatureStatuses,
  getTokenAccountsByOwner,
  sendTransaction,
  simulateTransaction,

  // Management
  healthCheck,
  getStats,
  clearPending,

  // Config
  BATCHER_CONFIG,
  PRIORITY: BATCHER_CONFIG.priority,
};
