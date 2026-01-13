/**
 * ASDF API - Request Batching Service
 *
 * Production-ready request batching:
 * - Multiple requests in single HTTP call
 * - Parallel execution within batch
 * - Error isolation per request
 * - Size and timeout limits
 *
 * Security by Design:
 * - Per-request authentication
 * - Batch size limits to prevent abuse
 * - Request validation
 * - Audit logging for batch operations
 */

'use strict';

const { logAudit } = require('./leaderboard');

// ============================================
// CONFIGURATION
// ============================================

const BATCHING_CONFIG = {
  // Limits
  maxBatchSize: 25, // Max requests per batch
  maxPayloadSize: 1024 * 1024, // 1MB max total payload
  maxRequestSize: 256 * 1024, // 256KB max per request

  // Timeouts
  batchTimeout: 30000, // 30 seconds total
  requestTimeout: 10000, // 10 seconds per request

  // Execution
  parallelLimit: 10, // Max parallel requests
  continueOnError: true, // Continue batch on individual errors

  // Allowed methods
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],

  // Paths that cannot be batched (security-critical)
  excludedPaths: [
    '/admin',
    '/auth/logout',
    '/batch', // Prevent nested batching
  ],
};

// ============================================
// STORAGE
// ============================================

// Stats
const batchStats = {
  totalBatches: 0,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  avgBatchSize: 0,
  avgResponseTime: 0,
};

// Running batches for monitoring
const runningBatches = new Map();

// ============================================
// REQUEST VALIDATION
// ============================================

/**
 * Validate batch request
 * @param {Object} batch - Batch request body
 * @returns {{valid: boolean, error?: string, requests?: Array}}
 */
function validateBatch(batch) {
  // Check if batch is array
  if (!Array.isArray(batch)) {
    if (batch?.requests && Array.isArray(batch.requests)) {
      batch = batch.requests;
    } else {
      return { valid: false, error: 'Batch must be an array of requests' };
    }
  }

  // Check batch size
  if (batch.length === 0) {
    return { valid: false, error: 'Batch cannot be empty' };
  }

  if (batch.length > BATCHING_CONFIG.maxBatchSize) {
    return {
      valid: false,
      error: `Batch size ${batch.length} exceeds maximum ${BATCHING_CONFIG.maxBatchSize}`,
    };
  }

  // Validate each request
  const validatedRequests = [];
  for (let i = 0; i < batch.length; i++) {
    const req = batch[i];
    const validation = validateRequest(req, i);

    if (!validation.valid) {
      return {
        valid: false,
        error: `Request ${i}: ${validation.error}`,
      };
    }

    validatedRequests.push(validation.request);
  }

  return { valid: true, requests: validatedRequests };
}

/**
 * Validate individual request in batch
 * @param {Object} req - Request object
 * @param {number} index - Request index
 * @returns {{valid: boolean, error?: string, request?: Object}}
 */
function validateRequest(req, index) {
  if (!req || typeof req !== 'object') {
    return { valid: false, error: 'Request must be an object' };
  }

  // Require path
  if (!req.path || typeof req.path !== 'string') {
    return { valid: false, error: 'Request must have a path' };
  }

  // Normalize path
  let path = req.path;
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Check excluded paths
  for (const excluded of BATCHING_CONFIG.excludedPaths) {
    if (path.startsWith(excluded)) {
      return { valid: false, error: `Path ${path} cannot be batched` };
    }
  }

  // Validate method
  const method = (req.method || 'GET').toUpperCase();
  if (!BATCHING_CONFIG.allowedMethods.includes(method)) {
    return { valid: false, error: `Method ${method} not allowed in batch` };
  }

  // Check request size
  const bodySize = req.body ? JSON.stringify(req.body).length : 0;
  if (bodySize > BATCHING_CONFIG.maxRequestSize) {
    return {
      valid: false,
      error: `Request body size ${bodySize} exceeds maximum ${BATCHING_CONFIG.maxRequestSize}`,
    };
  }

  // Build validated request
  return {
    valid: true,
    request: {
      id: req.id || `req_${index}`,
      method,
      path,
      headers: req.headers || {},
      query: req.query || {},
      body: req.body || null,
    },
  };
}

// ============================================
// BATCH EXECUTION
// ============================================

/**
 * Execute batch of requests
 * @param {Array} requests - Validated requests
 * @param {Object} parentReq - Parent HTTP request (for auth context)
 * @param {Object} app - Express app instance
 * @returns {Promise<Object>}
 */
async function executeBatch(requests, parentReq, app) {
  const batchId = generateBatchId();
  const startTime = Date.now();

  batchStats.totalBatches++;
  batchStats.totalRequests += requests.length;

  runningBatches.set(batchId, {
    id: batchId,
    startTime,
    requestCount: requests.length,
    completed: 0,
  });

  logAudit('batch_started', {
    batchId,
    requestCount: requests.length,
    wallet: parentReq.wallet,
  });

  try {
    // Execute requests with parallel limit
    const results = await executeWithLimit(
      requests,
      BATCHING_CONFIG.parallelLimit,
      async request => {
        return executeRequest(request, parentReq, app, batchId);
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Count successes/failures
    let successful = 0;
    let failed = 0;
    for (const result of results) {
      if (result.status < 400) {
        successful++;
      } else {
        failed++;
      }
    }

    batchStats.successfulRequests += successful;
    batchStats.failedRequests += failed;

    // Update average batch size
    batchStats.avgBatchSize =
      (batchStats.avgBatchSize * (batchStats.totalBatches - 1) + requests.length) /
      batchStats.totalBatches;

    // Update average response time
    batchStats.avgResponseTime =
      (batchStats.avgResponseTime * (batchStats.totalBatches - 1) + duration) /
      batchStats.totalBatches;

    logAudit('batch_completed', {
      batchId,
      duration,
      successful,
      failed,
    });

    return {
      batchId,
      timestamp: new Date().toISOString(),
      duration,
      results,
      summary: {
        total: requests.length,
        successful,
        failed,
      },
    };
  } finally {
    runningBatches.delete(batchId);
  }
}

/**
 * Execute single request within batch
 * @param {Object} request - Request to execute
 * @param {Object} parentReq - Parent request for context
 * @param {Object} app - Express app
 * @param {string} batchId - Batch identifier
 * @returns {Promise<Object>}
 */
async function executeRequest(request, parentReq, app, batchId) {
  const startTime = Date.now();

  try {
    // Create mock request
    const mockReq = createMockRequest(request, parentReq);

    // Create mock response
    const { mockRes, getResult } = createMockResponse();

    // Execute through Express
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, BATCHING_CONFIG.requestTimeout);

      mockRes.on('finish', () => {
        clearTimeout(timeout);
        resolve();
      });

      // Route the request
      app.handle(mockReq, mockRes, err => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    const result = getResult();
    const duration = Date.now() - startTime;

    // Update batch progress
    const batch = runningBatches.get(batchId);
    if (batch) {
      batch.completed++;
    }

    return {
      id: request.id,
      status: result.status,
      headers: result.headers,
      body: result.body,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      id: request.id,
      status: 500,
      headers: {},
      body: {
        error: 'Internal Error',
        message: error.message,
      },
      duration,
      error: true,
    };
  }
}

/**
 * Execute array of tasks with parallel limit
 * @param {Array} items - Items to process
 * @param {number} limit - Parallel limit
 * @param {Function} executor - Async executor function
 * @returns {Promise<Array>}
 */
async function executeWithLimit(items, limit, executor) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await executor(items[currentIndex]);
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}

// ============================================
// MOCK REQUEST/RESPONSE
// ============================================

/**
 * Create mock Express request
 * @param {Object} request - Batch request
 * @param {Object} parentReq - Parent request
 * @returns {Object}
 */
function createMockRequest(request, parentReq) {
  // Parse query string from path
  let path = request.path;
  const query = { ...request.query };

  const queryIndex = path.indexOf('?');
  if (queryIndex > -1) {
    const queryString = path.substring(queryIndex + 1);
    path = path.substring(0, queryIndex);

    // Parse query string
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params) {
      query[key] = value;
    }
  }

  return {
    method: request.method,
    url: request.path,
    originalUrl: request.path,
    path,
    query,
    params: {},
    body: request.body,
    headers: {
      ...parentReq.headers,
      ...request.headers,
    },
    // Inherit auth context from parent
    wallet: parentReq.wallet,
    user: parentReq.user,
    session: parentReq.session,
    // Batch context
    isBatchRequest: true,
    batchParent: parentReq,
    // Mock socket
    socket: parentReq.socket,
    connection: parentReq.connection,
    // Express helpers
    get: function (header) {
      return this.headers[header.toLowerCase()];
    },
    is: function (type) {
      const contentType = this.get('content-type') || '';
      return contentType.includes(type);
    },
  };
}

/**
 * Create mock Express response
 * @returns {{mockRes: Object, getResult: Function}}
 */
function createMockResponse() {
  const EventEmitter = require('events');

  let statusCode = 200;
  let responseBody = null;
  const responseHeaders = {};

  const mockRes = new EventEmitter();

  mockRes.status = code => {
    statusCode = code;
    return mockRes;
  };

  mockRes.statusCode = 200;

  mockRes.setHeader = (name, value) => {
    responseHeaders[name.toLowerCase()] = value;
    return mockRes;
  };

  mockRes.set = mockRes.setHeader;
  mockRes.header = mockRes.setHeader;

  mockRes.getHeader = name => {
    return responseHeaders[name.toLowerCase()];
  };

  mockRes.get = mockRes.getHeader;

  mockRes.removeHeader = name => {
    delete responseHeaders[name.toLowerCase()];
    return mockRes;
  };

  mockRes.json = body => {
    responseBody = body;
    responseHeaders['content-type'] = 'application/json';
    mockRes.emit('finish');
    return mockRes;
  };

  mockRes.send = body => {
    if (typeof body === 'object') {
      return mockRes.json(body);
    }
    responseBody = body;
    mockRes.emit('finish');
    return mockRes;
  };

  mockRes.end = data => {
    if (data) {
      responseBody = data;
    }
    mockRes.emit('finish');
    return mockRes;
  };

  mockRes.redirect = url => {
    statusCode = 302;
    responseHeaders['location'] = url;
    mockRes.emit('finish');
    return mockRes;
  };

  // Track end
  mockRes.finished = false;
  mockRes.on('finish', () => {
    mockRes.finished = true;
    mockRes.statusCode = statusCode;
  });

  const getResult = () => ({
    status: statusCode,
    headers: responseHeaders,
    body: responseBody,
  });

  return { mockRes, getResult };
}

// ============================================
// EXPRESS ENDPOINT
// ============================================

/**
 * Create batch endpoint handler
 * @param {Object} app - Express app instance
 * @returns {Function} Express handler
 */
function createBatchHandler(app) {
  return async (req, res) => {
    try {
      // Validate batch
      const validation = validateBatch(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid Batch',
          message: validation.error,
        });
      }

      // Execute batch with timeout
      const result = await Promise.race([
        executeBatch(validation.requests, req, app),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Batch timeout')), BATCHING_CONFIG.batchTimeout)
        ),
      ]);

      // Determine overall status
      const hasErrors = result.summary.failed > 0;
      const allFailed = result.summary.successful === 0 && result.summary.failed > 0;

      const statusCode = allFailed ? 500 : hasErrors ? 207 : 200;

      res.status(statusCode).json(result);
    } catch (error) {
      logAudit('batch_error', {
        error: error.message,
      });

      res.status(500).json({
        error: 'Batch Error',
        message: error.message,
      });
    }
  };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Generate batch ID
 * @returns {string}
 */
function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// METRICS
// ============================================

/**
 * Get batching statistics
 * @returns {Object}
 */
function getStats() {
  return {
    ...batchStats,
    runningBatches: runningBatches.size,
    avgBatchSize: batchStats.avgBatchSize.toFixed(2),
    avgResponseTime: `${batchStats.avgResponseTime.toFixed(0)}ms`,
    successRate:
      batchStats.totalRequests > 0
        ? ((batchStats.successfulRequests / batchStats.totalRequests) * 100).toFixed(2) + '%'
        : '100%',
  };
}

/**
 * Get running batches info
 * @returns {Array}
 */
function getRunningBatches() {
  return Array.from(runningBatches.values()).map(batch => ({
    ...batch,
    elapsed: Date.now() - batch.startTime,
    progress: `${batch.completed}/${batch.requestCount}`,
  }));
}

module.exports = {
  // Config
  BATCHING_CONFIG,

  // Validation
  validateBatch,
  validateRequest,

  // Execution
  executeBatch,

  // Handler
  createBatchHandler,

  // Stats
  getStats,
  getRunningBatches,
};
