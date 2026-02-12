/**
 * Game Routes Module
 *
 * Handles all game-related endpoints:
 * - Game validation: start sessions, submit scores
 * - Score tracking: best scores, all scores
 * - Achievements: unlock, progress, leaderboard, admin grant
 * - Daily challenges: active, claim, stats
 * - Progression: XP, streaks, leaderboard, events
 * - Anti-cheat: status, detections, sanctions
 * - Game analytics: realtime, funnels, experiments
 * - Game replay: stats
 */

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Helpers
const { sanitizeError } = require('./helpers');

// Services
const {
  startGameSession,
  submitScore,
  getPlayerStats,
  getValidationMetrics,
} = require('../services/gameValidation');
const {
  getUnlockedAchievements,
  getAchievementProgress,
  getDetailedAchievements,
  recordBurnForAchievements,
  recordGameForAchievements,
  updateStreak,
  grantAchievement,
  getAchievementLeaderboard,
  getAchievementMetrics,
} = require('../services/achievements');
const {
  getActiveChallenges,
  updateProgress: updateChallengeProgress,
  claimReward: claimChallengeReward,
  getChallengeStats,
} = require('../services/challenges');
const { logAudit, recordBurn } = require('../services/leaderboard');
const { isValidAddress } = require('../services/helius');
const { authMiddleware, optionalAuthMiddleware } = require('../services/auth');
const { requireAdmin, isAdmin } = require('../services/security');

// ============================================
// RATE LIMITERS
// ============================================

// Game session rate limiter (5 sessions per minute per wallet)
const gameSessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: req => req.user?.wallet || req.ip,
  message: { error: 'Too many game sessions, please wait' },
});

// Per-wallet rate limiter (30 requests per minute per wallet)
const walletRateLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  keyGenerator: req => req.user?.wallet || req.ip,
  message: { error: 'Rate limit exceeded' },
});

// ============================================
// LAZY-LOADED GAME SERVICES
// ============================================

let gameReplay = null;
let antiCheat = null;
let progression = null;
let gameAnalytics = null;

function getGameReplay() {
  if (!gameReplay) {
    gameReplay = require('../services/gameReplay');
  }
  return gameReplay;
}

function getAntiCheat() {
  if (!antiCheat) {
    antiCheat = require('../services/antiCheat');
  }
  return antiCheat;
}

function getProgression() {
  if (!progression) {
    progression = require('../services/progression');
  }
  return progression;
}

function getGameAnalytics() {
  if (!gameAnalytics) {
    gameAnalytics = require('../services/gameAnalytics');
  }
  return gameAnalytics;
}

// ============================================
// GAME VALIDATION ROUTES
// ============================================

/**
 * Start a new game session
 * POST /game/start
 */
router.post('/game/start', authMiddleware, gameSessionLimiter, async (req, res) => {
  try {
    const { gameType } = req.body;

    // Validate game type
    const validTypes = ['flappy', 'snake', 'default'];
    const type = validTypes.includes(gameType) ? gameType : 'default';

    const session = startGameSession(req.user.wallet, type);

    res.json({
      sessionId: session.sessionId,
      token: session.token,
      gameType: session.gameType,
      startTime: session.startTime,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'game-start') });
  }
});

/**
 * Submit game score
 * POST /game/submit
 */
router.post('/game/submit', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { sessionId, token, score, gameData } = req.body;

    if (!sessionId || !token || typeof score !== 'number') {
      return res.status(400).json({ error: 'Session ID, token, and score required' });
    }

    const result = submitScore(sessionId, token, score, gameData || {});

    if (!result.valid) {
      // Log suspicious activity
      if (result.suspicious) {
        logAudit('suspicious_score', {
          wallet: req.user.wallet.slice(0, 8) + '...',
          error: result.error,
        });
      }
      return res.status(400).json({ error: result.error, suspicious: result.suspicious });
    }

    // Check for achievement unlocks
    const newAchievements = recordGameForAchievements(req.user.wallet, result.score);

    res.json({
      success: true,
      score: result.score,
      duration: result.duration,
      percentile: result.percentile,
      newAchievements: newAchievements.map(a => ({
        id: a.id,
        name: a.name,
        rarity: a.rarity,
        xpReward: a.xpReward,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'game-submit') });
  }
});

/**
 * Submit score (simplified endpoint for frontend)
 * POST /scores/submit
 *
 * Accepts client-side anti-cheat data and validates scores
 * Returns achievements unlocked by this score
 */
router.post('/scores/submit', authMiddleware, walletRateLimiter, async (req, res) => {
  try {
    const { gameId, score, isCompetitive = false, sessionData } = req.body;
    const wallet = req.user.wallet;

    // Validate required fields
    if (!gameId || typeof score !== 'number') {
      return res.status(400).json({ error: 'gameId and score required' });
    }

    // Sanitize score
    const safeScore = Math.max(0, Math.min(999999999, Math.floor(score)));

    // Validate client-side anti-cheat data if provided
    let validationFlags = [];
    if (sessionData) {
      // Check for suspicious flags from client anti-cheat
      if (sessionData.flags && sessionData.flags.length > 0) {
        validationFlags = sessionData.flags;
        logAudit('client_anticheat_flags', {
          wallet: wallet.slice(0, 8) + '...',
          gameId,
          flags: validationFlags,
        });
      }

      // Validate score plausibility based on duration
      if (sessionData.duration && sessionData.duration > 0) {
        const scoreRate = safeScore / (sessionData.duration / 1000);
        // More than 20 points per second is suspicious for most games
        if (scoreRate > 20) {
          validationFlags.push('HIGH_SCORE_RATE');
        }
      }
    }

    // Record game for achievements (updates stats and checks unlocks)
    const newAchievements = recordGameForAchievements(wallet, safeScore);

    // Track best scores per game in a simple in-memory store
    // In production, this would use a database
    const bestScoreKey = `${wallet}:${gameId}:best`;
    const currentBest = global.bestScores?.get(bestScoreKey) || 0;
    const isNewBest = safeScore > currentBest;

    if (isNewBest) {
      if (!global.bestScores) global.bestScores = new Map();
      global.bestScores.set(bestScoreKey, safeScore);
    }

    // Update daily challenge progress
    const completedChallenges = updateChallengeProgress(wallet, {
      gameId,
      score: safeScore,
      isHighScore: isNewBest,
      isPerfect: sessionData?.isPerfect || false,
    });

    // Log the submission
    logAudit('score_submitted', {
      wallet: wallet.slice(0, 8) + '...',
      gameId,
      score: safeScore,
      isCompetitive,
      isNewBest,
      achievementsUnlocked: newAchievements.length,
    });

    res.json({
      success: true,
      score: safeScore,
      isNewBest,
      bestScore: isNewBest ? safeScore : currentBest,
      validationFlags,
      newAchievements: newAchievements.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        rarity: a.rarity,
        xpReward: a.xpReward,
        icon: a.icon,
      })),
      completedChallenges,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'scores-submit') });
  }
});

/**
 * Get best score for a game
 * GET /scores/best/:gameId
 */
router.get('/scores/best/:gameId', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const wallet = req.user.wallet;

    const bestScoreKey = `${wallet}:${gameId}:best`;
    const bestScore = global.bestScores?.get(bestScoreKey) || 0;

    res.json({
      gameId,
      bestScore,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'scores-best') });
  }
});

/**
 * Get all best scores for user
 * GET /scores/all
 */
router.get('/scores/all', authMiddleware, async (req, res) => {
  try {
    const wallet = req.user.wallet;
    const scores = {};

    // Iterate through best scores map for this wallet
    if (global.bestScores) {
      for (const [key, value] of global.bestScores.entries()) {
        if (key.startsWith(wallet)) {
          const gameId = key.split(':')[1];
          scores[gameId] = value;
        }
      }
    }

    res.json({ scores });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'scores-all') });
  }
});

/**
 * Get player's game statistics
 * GET /game/stats
 */
router.get('/game/stats', authMiddleware, async (req, res) => {
  try {
    const gameType = req.query.gameType || 'default';
    const stats = getPlayerStats(req.user.wallet, gameType);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'game-stats') });
  }
});

// ============================================
// ACHIEVEMENT ROUTES
// ============================================

/**
 * Get user's achievements
 * GET /achievements
 */
router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const detailed = req.query.detailed === 'true';

    if (detailed) {
      const achievements = getDetailedAchievements(req.user.wallet);
      res.json({ achievements });
    } else {
      const unlocked = getUnlockedAchievements(req.user.wallet);
      const progress = getAchievementProgress(req.user.wallet);
      res.json({ unlocked, progress });
    }
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'achievements') });
  }
});

/**
 * Get achievement leaderboard
 * GET /achievements/leaderboard
 */
router.get('/achievements/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const leaderboard = getAchievementLeaderboard(limit);

    res.json({
      entries: leaderboard,
      count: leaderboard.length,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'achievement-leaderboard') });
  }
});

// ============================================
// DAILY CHALLENGES ROUTES
// ============================================

/**
 * Get active daily challenges with progress
 * GET /games/challenges
 */
router.get('/games/challenges', authMiddleware, async (req, res) => {
  try {
    const challenges = getActiveChallenges(req.user.wallet);

    res.json({
      challenges,
      count: challenges.length,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'get-challenges') });
  }
});

/**
 * Claim challenge reward
 * POST /games/challenges/:id/claim
 */
router.post('/games/challenges/:id/claim', authMiddleware, async (req, res) => {
  try {
    const challengeId = req.params.id;
    const result = claimChallengeReward(req.user.wallet, challengeId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // TODO: Award XP via progression system when implemented
    // For now, XP is returned to client for display

    res.json({
      success: true,
      xpAwarded: result.xpAwarded,
      coinsAwarded: result.coinsAwarded,
      challenge: result.challenge,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'claim-challenge') });
  }
});

/**
 * Get challenge statistics (admin)
 * GET /games/challenges/stats
 */
router.get('/games/challenges/stats', authMiddleware, async (req, res) => {
  try {
    const stats = getChallengeStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'challenge-stats') });
  }
});

/**
 * Grant achievement (admin only)
 * POST /admin/achievements/grant
 */
router.post('/admin/achievements/grant', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { wallet, achievementId } = req.body;

    if (!wallet || !achievementId) {
      return res.status(400).json({ error: 'Wallet and achievementId required' });
    }

    if (!isValidAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const result = grantAchievement(wallet, achievementId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      achievement: result.achievement,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'grant-achievement') });
  }
});

// ============================================
// GAME SYSTEM ROUTES (lazy-loaded services)
// ============================================

/**
 * Get player progression
 * GET /progression/:wallet
 */
router.get('/progression/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!isValidAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const progress = getProgression().getProgress(wallet);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'progression') });
  }
});

/**
 * Update player streak
 * POST /progression/streak
 */
router.post('/progression/streak', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const result = getProgression().updateStreak(wallet);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'streak') });
  }
});

/**
 * Get XP table
 * GET /progression/xp-table
 */
router.get('/progression/xp-table', (req, res) => {
  try {
    const { maxLevel = 20 } = req.query;
    const table = getProgression().getXPTable(parseInt(maxLevel) || 20);
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'xp-table') });
  }
});

/**
 * Get progression leaderboard
 * GET /progression/leaderboard
 */
router.get('/progression/leaderboard', (req, res) => {
  try {
    const { limit = 100, sortBy = 'totalXP' } = req.query;
    const leaderboard = getProgression().getLeaderboard({
      limit: Math.min(parseInt(limit) || 100, 500),
      sortBy,
    });
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'progression-leaderboard') });
  }
});

/**
 * Check if player is banned
 * GET /anticheat/status/:wallet
 */
router.get('/anticheat/status/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!isValidAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const banStatus = getAntiCheat().checkBan(wallet);
    const profile = getAntiCheat().getProfile(wallet);

    res.json({
      ...banStatus,
      trustScore: profile.found ? profile.trustScore : null,
      status: profile.found ? profile.status : 'unknown',
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'anticheat-status') });
  }
});

/**
 * Get anti-cheat stats (admin)
 * GET /admin/anticheat/stats
 */
router.get('/admin/anticheat/stats', authMiddleware, requireAdmin, (req, res) => {
  try {
    const stats = getAntiCheat().getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'anticheat-stats') });
  }
});

/**
 * Get recent detections (admin)
 * GET /admin/anticheat/detections
 */
router.get('/admin/anticheat/detections', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const detections = getAntiCheat().getRecentDetections(parseInt(limit) || 50);
    res.json(detections);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'anticheat-detections') });
  }
});

/**
 * Lift sanction (admin)
 * POST /admin/anticheat/lift-sanction
 */
router.post('/admin/anticheat/lift-sanction', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { wallet, sanctionId, reason } = req.body;

    if (!wallet || !sanctionId) {
      return res.status(400).json({ error: 'Wallet and sanctionId required' });
    }

    const result = getAntiCheat().liftSanction(wallet, sanctionId, reason || 'Admin action');
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'lift-sanction') });
  }
});

/**
 * Get game analytics dashboard (admin)
 * GET /admin/analytics/realtime
 */
router.get('/admin/analytics/realtime', authMiddleware, requireAdmin, (req, res) => {
  try {
    const dashboard = getGameAnalytics().getRealtimeDashboard();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'analytics-realtime') });
  }
});

/**
 * Get game-specific analytics (admin)
 * GET /admin/analytics/game/:gameType
 */
router.get('/admin/analytics/game/:gameType', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { gameType } = req.params;
    const dashboard = getGameAnalytics().getGameDashboard(gameType);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'game-analytics') });
  }
});

/**
 * Get funnel analysis (admin)
 * GET /admin/analytics/funnel/:funnelId
 */
router.get('/admin/analytics/funnel/:funnelId', authMiddleware, requireAdmin, (req, res) => {
  try {
    const { funnelId } = req.params;
    const analysis = getGameAnalytics().getFunnelAnalysis(funnelId);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'funnel-analysis') });
  }
});

/**
 * Get experiment results (admin)
 * GET /admin/analytics/experiment/:experimentId
 */
router.get(
  '/admin/analytics/experiment/:experimentId',
  authMiddleware,
  requireAdmin,
  (req, res) => {
    try {
      const { experimentId } = req.params;
      const results = getGameAnalytics().getExperimentResults(experimentId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: sanitizeError(error, 'experiment-results') });
    }
  }
);

/**
 * Get analytics stats (admin)
 * GET /admin/analytics/stats
 */
router.get('/admin/analytics/stats', authMiddleware, requireAdmin, (req, res) => {
  try {
    const stats = getGameAnalytics().getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'analytics-stats') });
  }
});

/**
 * Get replay stats (admin)
 * GET /admin/replay/stats
 */
router.get('/admin/replay/stats', authMiddleware, requireAdmin, (req, res) => {
  try {
    const stats = getGameReplay().getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'replay-stats') });
  }
});

/**
 * Get progression stats (admin)
 * GET /admin/progression/stats
 */
router.get('/admin/progression/stats', authMiddleware, requireAdmin, (req, res) => {
  try {
    const stats = getProgression().getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'progression-stats') });
  }
});

/**
 * Start XP event (admin)
 * POST /admin/progression/event
 */
router.post('/admin/progression/event', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { eventId, multiplier, durationHours } = req.body;

    if (!eventId || !multiplier || !durationHours) {
      return res.status(400).json({ error: 'eventId, multiplier, and durationHours required' });
    }

    const event = getProgression().startEvent(
      eventId,
      parseFloat(multiplier),
      parseInt(durationHours) * 60 * 60 * 1000
    );

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'start-event') });
  }
});

module.exports = router;
