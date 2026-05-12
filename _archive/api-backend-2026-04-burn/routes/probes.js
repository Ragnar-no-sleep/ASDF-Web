/**
 * Kubernetes Probe Routes
 *
 * Extracted from index.js as proof-of-concept for route modularization.
 * These endpoints are used by Kubernetes/container orchestrators for health checks.
 *
 * @module routes/probes
 */

'use strict';

const router = require('express').Router();
const {
  livenessProbe,
  readinessProbe,
  startupProbe,
  getDetailedHealth,
  getHistory: getHealthHistory,
  getTrend: getHealthTrend,
} = require('../services/healthcheck');

/**
 * Liveness probe - Is the process alive?
 * GET /livez
 *
 * Used by Kubernetes to determine if container should be restarted.
 * Should return quickly and only check if process is responsive.
 */
router.get('/livez', (req, res) => {
  const result = livenessProbe();
  res.json(result);
});

/**
 * Readiness probe - Is the service ready to accept traffic?
 * GET /readyz
 *
 * Used by Kubernetes to determine if container should receive traffic.
 * Checks database connectivity and other dependencies.
 */
router.get('/readyz', async (req, res) => {
  try {
    const result = await readinessProbe();
    const status = result.ready ? 200 : 503;
    res.status(status).json(result);
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

/**
 * Startup probe - Has the service finished starting?
 * GET /startupz
 *
 * Used by Kubernetes to determine if container has finished initialization.
 * Allows for longer startup times without affecting liveness checks.
 */
router.get('/startupz', async (req, res) => {
  try {
    const result = await startupProbe();
    const status = result.started ? 200 : 503;
    res.status(status).json(result);
  } catch (error) {
    res.status(503).json({ started: false, error: error.message });
  }
});

module.exports = router;
