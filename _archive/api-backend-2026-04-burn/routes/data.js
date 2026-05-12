/**
 * Data Management Routes Module
 *
 * Handles all data management and compliance endpoints:
 * - Data Export (GDPR Right to Access)
 * - Data Deletion (GDPR Right to Erasure)
 * - Session Management (active sessions, device tracking)
 */

'use strict';

const express = require('express');
const router = express.Router();

// Helpers
const { sanitizeError } = require('./helpers');

// Services
const { authMiddleware } = require('../services/auth');
const {
  requestExport,
  downloadExport,
  requestDeletion,
  getRequestStatus: getExportRequestStatus,
  getWalletRequests,
} = require('../services/dataExport');
const {
  revokeSession,
  revokeAllUserSessions,
  getUserSessions,
  getUserDevices,
  blockDevice,
  trustDevice,
} = require('../services/sessionManager');
const { logAudit } = require('../services/leaderboard');

// ============================================
// DATA MANAGEMENT & COMPLIANCE
// ============================================

/**
 * Request data export (GDPR Right to Access)
 * POST /data/export
 */
router.post('/data/export', authMiddleware, async (req, res) => {
  try {
    const result = requestExport(req.user.wallet, req.body);
    if (!result.success) {
      return res.status(429).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'data-export') });
  }
});

/**
 * Get export request status
 * GET /data/export/:requestId
 */
router.get('/data/export/:requestId', authMiddleware, async (req, res) => {
  try {
    const status = getExportRequestStatus(req.params.requestId, req.user.wallet);
    if (!status) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'export-status') });
  }
});

/**
 * Download exported data
 * GET /data/export/:requestId/download
 */
router.get('/data/export/:requestId/download', authMiddleware, async (req, res) => {
  try {
    const status = getExportRequestStatus(req.params.requestId, req.user.wallet);
    if (!status || !status.downloadAvailable) {
      return res.status(404).json({ error: 'Download not available' });
    }
    const result = downloadExport(req.params.requestId, req.user.wallet);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'download-export') });
  }
});

/**
 * Request data deletion (GDPR Right to Erasure)
 * POST /data/delete
 */
router.post('/data/delete', authMiddleware, async (req, res) => {
  try {
    const result = requestDeletion(req.user.wallet, req.body);
    if (!result.success) {
      return res.status(result.confirmationRequired ? 200 : 429).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'data-delete') });
  }
});

/**
 * Get user's data requests
 * GET /data/requests
 */
router.get('/data/requests', authMiddleware, async (req, res) => {
  try {
    const requests = getWalletRequests(req.user.wallet);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'data-requests') });
  }
});

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Get user's active sessions
 * GET /sessions
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const sessions = getUserSessions(req.user.wallet);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-sessions') });
  }
});

/**
 * Revoke a specific session
 * DELETE /sessions/:sessionId
 */
router.delete('/sessions/:sessionId', authMiddleware, async (req, res) => {
  try {
    const result = revokeSession(req.params.sessionId, req.user.wallet);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'revoke-session') });
  }
});

/**
 * Revoke all sessions (logout everywhere)
 * DELETE /sessions
 */
router.delete('/sessions', authMiddleware, async (req, res) => {
  try {
    const result = revokeAllUserSessions(req.user.wallet);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'revoke-all-sessions') });
  }
});

/**
 * Get user's devices
 * GET /devices
 */
router.get('/devices', authMiddleware, async (req, res) => {
  try {
    const devices = getUserDevices(req.user.wallet);
    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-devices') });
  }
});

/**
 * Block a device
 * POST /devices/:deviceId/block
 */
router.post('/devices/:deviceId/block', authMiddleware, async (req, res) => {
  try {
    const result = blockDevice(req.user.wallet, req.params.deviceId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'block-device') });
  }
});

/**
 * Trust a device
 * POST /devices/:deviceId/trust
 */
router.post('/devices/:deviceId/trust', authMiddleware, async (req, res) => {
  try {
    const result = trustDevice(req.user.wallet, req.params.deviceId);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'trust-device') });
  }
});

module.exports = router;
