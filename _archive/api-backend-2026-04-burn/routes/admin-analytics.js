/**
 * Admin Analytics Routes
 * Extracted from admin.js — zero cross-module dependencies
 *
 * Endpoints:
 *   GET /admin/analytics          — overview
 *   GET /admin/analytics/metrics  — aggregated metrics
 *   GET /admin/analytics/funnel/:name — funnel analysis
 */

'use strict';

const express = require('express');
const router = express.Router();

const { sanitizeError } = require('./helpers');
const { authMiddleware } = require('../services/auth');
const { requireAdmin } = require('../services/security');
const {
  getAggregatedMetrics,
  getFunnelAnalysis,
  getAnalyticsMetrics,
} = require('../services/analytics');

/**
 * Get analytics overview (admin only)
 * GET /admin/analytics
 */
router.get('/admin/analytics', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const metrics = getAnalyticsMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'analytics') });
  }
});

/**
 * Get aggregated metrics (admin only)
 * GET /admin/analytics/metrics
 */
router.get('/admin/analytics/metrics', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const interval = req.query.interval || 'hour';
    const count = Math.max(1, Math.min(parseInt(req.query.count) || 24, 168));

    const metrics = getAggregatedMetrics(interval, count);
    res.json({ interval, metrics });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'analytics-metrics') });
  }
});

/**
 * Get funnel analysis (admin only)
 * GET /admin/analytics/funnel/:name
 */
router.get('/admin/analytics/funnel/:name', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const analysis = getFunnelAnalysis(req.params.name);

    if (!analysis) {
      return res.status(404).json({ error: 'Funnel not found' });
    }

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'funnel-analysis') });
  }
});

module.exports = router;
