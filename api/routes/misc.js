/**
 * Miscellaneous Routes Module
 *
 * Handles all miscellaneous endpoints:
 * - Metrics: summary and Prometheus
 * - Security: nonce generation
 * - Streak tracking: daily activity
 * - Request batching
 * - API version info
 * - API documentation
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

// Helpers
const { sanitizeError } = require('./helpers');

// Services
const { authMiddleware } = require('../services/auth');
const { getSummaryMetrics, getPrometheusMetrics } = require('../services/metrics');
const { generateNonce } = require('../services/security');
const { updateStreak } = require('../services/achievements');
const { createBatchHandler } = require('../services/batching');
const { getVersionInfo } = require('../services/versioning');
const {
  generateSpec,
  serveDocumentation,
  serveSwaggerUI,
} = require('../services/openApiGenerator');

// Rate limiter
const walletRateLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  keyGenerator: req => req.user?.wallet || req.ip,
  message: { error: 'Rate limit exceeded' },
});

/**
 * Create the miscellaneous router
 * @param {Express.Application} app - Express app instance (needed for batch handler)
 * @returns {Express.Router} Configured router
 */
module.exports = function createMiscRouter(app) {
  const router = express.Router();

  // ============================================
  // METRICS ROUTES
  // ============================================

  /**
   * Get API metrics (public summary)
   * GET /metrics
   */
  router.get('/metrics', async (req, res) => {
    try {
      const metrics = getSummaryMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error, 'metrics') });
    }
  });

  /**
   * Get Prometheus metrics
   * GET /metrics/prometheus
   */
  router.get('/metrics/prometheus', async (req, res) => {
    try {
      const metrics = getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      res.status(500).send('# Error getting metrics');
    }
  });

  // ============================================
  // SECURITY ROUTES
  // ============================================

  /**
   * Generate a nonce for signed requests
   * GET /security/nonce
   */
  router.get('/security/nonce', authMiddleware, (req, res) => {
    try {
      const nonce = generateNonce();
      res.json({
        nonce,
        expiresIn: '10 minutes',
        usage: 'Include in X-ASDF-Nonce header for signed requests',
      });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error, 'nonce') });
    }
  });

  // ============================================
  // STREAK TRACKING
  // ============================================

  /**
   * Record daily activity (call on any user action)
   * POST /user/activity
   */
  router.post('/user/activity', authMiddleware, walletRateLimiter, async (req, res) => {
    try {
      const newAchievements = updateStreak(req.user.wallet);

      res.json({
        recorded: true,
        newAchievements: newAchievements.map(a => ({
          id: a.id,
          name: a.name,
          rarity: a.rarity,
          xpReward: a.xpReward,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error, 'record-activity') });
    }
  });

  // ============================================
  // REQUEST BATCHING
  // ============================================

  /**
   * Batch multiple API requests
   * POST /batch
   */
  router.post('/batch', authMiddleware, walletRateLimiter, createBatchHandler(app));

  // ============================================
  // API VERSION INFO
  // ============================================

  /**
   * Get API version information
   * GET /version
   */
  router.get('/version', (req, res) => {
    const versionInfo = getVersionInfo();
    res.json(versionInfo);
  });

  // ============================================
  // API DOCUMENTATION
  // ============================================

  /**
   * OpenAPI specification
   * GET /docs/openapi.json
   */
  router.get('/docs/openapi.json', (req, res) => {
    res.json(generateSpec());
  });

  /**
   * API Documentation page
   * GET /docs
   */
  router.get('/docs', serveDocumentation);

  /**
   * Swagger UI
   * GET /docs/swagger
   */
  router.get('/docs/swagger', serveSwaggerUI);

  return router;
};
