/**
 * Authentication and User Routes
 * Extracted from api/index.js for better modularity
 */

const express = require('express');
const {
  generateChallenge,
  verifyAndAuthenticate,
  refreshToken,
  revokeToken,
  authMiddleware,
} = require('../services/auth');
const { getTokenBalance, isValidAddress } = require('../services/helius');
const { getInventory, getEquipped } = require('../services/shop');
const { logAudit } = require('../services/leaderboard');
const { setAuthCookie, clearAuthCookie, getAuthToken, sanitizeError } = require('./helpers');

// ============================================
// AUTH ROUTER (/api/auth/*)
// ============================================

const authRouter = express.Router();

/**
 * Request authentication challenge
 * POST /api/auth/challenge
 */
authRouter.post('/challenge', (req, res) => {
  try {
    const { wallet } = req.body;

    if (!wallet || !isValidAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const challenge = generateChallenge(wallet);
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'challenge') });
  }
});

/**
 * Verify signature and get JWT
 * POST /api/auth/verify
 * Sets JWT as httpOnly cookie for security
 */
authRouter.post('/verify', async (req, res) => {
  try {
    const { wallet, signature } = req.body;

    if (!wallet || !signature) {
      return res.status(400).json({ error: 'Wallet and signature required' });
    }

    const result = await verifyAndAuthenticate(wallet, signature);

    // Set JWT as httpOnly cookie
    setAuthCookie(res, result.token);

    // Return user info (token still included for backward compatibility during migration)
    res.json({
      success: true,
      user: result.user,
      // Token in response body is deprecated - will be removed in future version
      token: result.token,
    });
  } catch (error) {
    res.status(401).json({ error: sanitizeError(error, 'auth') });
  }
});

/**
 * Refresh JWT with updated balance
 * GET /api/auth/refresh
 * Updates the httpOnly cookie with new token
 */
authRouter.get('/refresh', authMiddleware, async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const result = await refreshToken(token);

    // Update cookie with new token
    setAuthCookie(res, result.token);

    res.json({
      success: true,
      user: result.user,
      // Token in response body is deprecated
      token: result.token,
    });
  } catch (error) {
    res.status(401).json({ error: sanitizeError(error, 'refresh') });
  }
});

/**
 * Logout - Revoke current JWT token and clear cookie
 * POST /api/auth/logout
 */
authRouter.post('/logout', authMiddleware, (req, res) => {
  try {
    const token = getAuthToken(req);
    if (token) {
      const result = revokeToken(token);
      if (!result.success) {
        // Log but don't fail - still clear cookie
        console.warn('[Auth] Token revocation failed:', result.error);
      }
    }

    // Always clear the cookie
    clearAuthCookie(res);

    logAudit('user_logout', { wallet: req.user?.wallet?.slice(0, 8) + '...' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    // Still clear cookie even on error
    clearAuthCookie(res);
    res.status(500).json({ error: sanitizeError(error, 'logout') });
  }
});

// ============================================
// USER ROUTER (/api/user/*)
// ============================================

const userRouter = express.Router();

/**
 * Get user profile
 * GET /api/user/profile
 */
userRouter.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { wallet } = req.user;

    // Get fresh balance
    const balanceInfo = await getTokenBalance(wallet);

    // Get inventory and equipped
    const inventory = await getInventory(wallet);
    const equipped = await getEquipped(wallet);

    res.json({
      wallet,
      balance: balanceInfo.balance,
      isHolder: balanceInfo.isHolder,
      tier: req.user.tier,
      tierIndex: req.user.tierIndex,
      inventory,
      equipped,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'profile') });
  }
});

// ============================================
// EXPORTS
// ============================================

module.exports = { authRouter, userRouter };
