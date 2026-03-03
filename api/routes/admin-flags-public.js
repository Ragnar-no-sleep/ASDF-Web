/**
 * Public Feature Flags Evaluation
 * Extracted from admin.js — client-facing, optional auth
 *
 * Endpoints:
 *   POST /flags/evaluate — evaluate flags for client context
 */

'use strict';

const express = require('express');
const router = express.Router();

const { sanitizeError } = require('./helpers');
const { optionalAuthMiddleware } = require('../services/auth');
const { evaluate: evaluateFlag } = require('../services/featureflags');

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Evaluate flag for context (public, for client-side feature checks)
 * POST /flags/evaluate
 */
router.post('/flags/evaluate', optionalAuthMiddleware, async (req, res) => {
  try {
    const { flags } = req.body;

    if (!Array.isArray(flags)) {
      return res.status(400).json({ error: 'flags array required' });
    }

    const context = {
      wallet: req.user?.wallet,
      tier: req.user?.tier,
      tierIndex: req.user?.tierIndex,
      environment: isProduction ? 'production' : 'development',
    };

    const results = {};
    for (const key of flags.slice(0, 50)) {
      // Limit to 50 flags per request
      results[key] = evaluateFlag(key, context);
    }

    res.json({ flags: results });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'evaluate-flags') });
  }
});

module.exports = router;
