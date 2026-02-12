/**
 * Formations Routes Module
 *
 * Handles all formation-related endpoints:
 * - Formation tracks (dev, games, content)
 * - Module catalog and details
 * - User progress tracking
 * - Module completion with XP rewards
 * - Next module recommendations
 */

'use strict';

const express = require('express');
const router = express.Router();

// Helpers
const { sanitizeError } = require('./helpers');

// Services
const { authMiddleware } = require('../services/auth');
const { isValidAddress } = require('../services/helius');
const {
  log: auditLog,
  EVENT_TYPES: AUDIT_EVENTS,
  SEVERITY: AUDIT_SEVERITY,
} = require('../services/audit');

// Lazy-loaded progression service
let progression = null;
function getProgression() {
  if (!progression) {
    progression = require('../services/progression');
  }
  return progression;
}

// Formation tracks and modules data (static, no DB needed)
const formationsData = {
  tracks: {
    dev: {
      id: 'dev',
      name: 'Developer',
      icon: '{ }',
      color: '#ff4444',
      description: 'Master Solana development from basics to advanced smart contracts',
      duration: '12 weeks',
      difficulty: 'intermediate',
      modules: [
        'dev-fundamentals',
        'dev-solana-basics',
        'dev-token-mastery',
        'dev-anchor-deep',
        'dev-helius-integration',
        'dev-security-audit',
      ],
    },
    games: {
      id: 'games',
      name: 'Game Developer',
      icon: '\u25C8',
      color: '#9944ff',
      description: 'Build web3 games with blockchain integration',
      duration: '10 weeks',
      difficulty: 'intermediate',
      modules: [
        'gaming-fundamentals',
        'gaming-canvas',
        'gaming-mechanics',
        'gaming-web3',
        'gaming-tokenomics',
      ],
    },
    content: {
      id: 'content',
      name: 'Creator',
      icon: '\u2726',
      color: '#00d9ff',
      description: 'Create content, build communities, and drive growth',
      duration: '12 weeks',
      difficulty: 'beginner',
      modules: [
        'content-fundamentals',
        'content-storytelling',
        'content-video',
        'content-community',
        'growth-fundamentals',
        'growth-analytics',
        'growth-viral-loops',
        'growth-community',
        'growth-tokenomics',
      ],
    },
  },
  modules: {
    'dev-fundamentals': {
      id: 'dev-fundamentals',
      track: 'dev',
      name: 'Web Dev Fundamentals',
      xpReward: 100,
      prerequisites: [],
    },
    'dev-solana-basics': {
      id: 'dev-solana-basics',
      track: 'dev',
      name: 'Solana Fundamentals',
      xpReward: 200,
      prerequisites: ['dev-fundamentals'],
    },
    'dev-token-mastery': {
      id: 'dev-token-mastery',
      track: 'dev',
      name: 'Token Mastery',
      xpReward: 300,
      prerequisites: ['dev-solana-basics'],
    },
    'dev-anchor-deep': {
      id: 'dev-anchor-deep',
      track: 'dev',
      name: 'Anchor Deep Dive',
      xpReward: 500,
      prerequisites: ['dev-token-mastery'],
    },
    'dev-helius-integration': {
      id: 'dev-helius-integration',
      track: 'dev',
      name: 'Helius Integration',
      xpReward: 250,
      prerequisites: ['dev-solana-basics'],
    },
    'dev-security-audit': {
      id: 'dev-security-audit',
      track: 'dev',
      name: 'Security & Auditing',
      xpReward: 400,
      prerequisites: ['dev-anchor-deep'],
    },
    'gaming-fundamentals': {
      id: 'gaming-fundamentals',
      track: 'games',
      name: 'Game Design Basics',
      xpReward: 100,
      prerequisites: [],
    },
    'gaming-canvas': {
      id: 'gaming-canvas',
      track: 'games',
      name: 'Canvas Graphics',
      xpReward: 200,
      prerequisites: ['gaming-fundamentals'],
    },
    'gaming-mechanics': {
      id: 'gaming-mechanics',
      track: 'games',
      name: 'Game Mechanics',
      xpReward: 250,
      prerequisites: ['gaming-canvas'],
    },
    'gaming-web3': {
      id: 'gaming-web3',
      track: 'games',
      name: 'Web3 Integration',
      xpReward: 400,
      prerequisites: ['gaming-mechanics'],
    },
    'gaming-tokenomics': {
      id: 'gaming-tokenomics',
      track: 'games',
      name: 'Game Tokenomics',
      xpReward: 300,
      prerequisites: ['gaming-web3'],
    },
    'content-fundamentals': {
      id: 'content-fundamentals',
      track: 'content',
      name: 'Content Basics',
      xpReward: 80,
      prerequisites: [],
    },
    'content-storytelling': {
      id: 'content-storytelling',
      track: 'content',
      name: 'Storytelling',
      xpReward: 150,
      prerequisites: ['content-fundamentals'],
    },
    'content-video': {
      id: 'content-video',
      track: 'content',
      name: 'Video Production',
      xpReward: 200,
      prerequisites: ['content-storytelling'],
    },
    'content-community': {
      id: 'content-community',
      track: 'content',
      name: 'Community Content',
      xpReward: 120,
      prerequisites: ['content-fundamentals'],
    },
    'growth-fundamentals': {
      id: 'growth-fundamentals',
      track: 'content',
      name: 'Growth Fundamentals',
      xpReward: 100,
      prerequisites: ['content-fundamentals'],
    },
    'growth-analytics': {
      id: 'growth-analytics',
      track: 'content',
      name: 'Analytics & Metrics',
      xpReward: 180,
      prerequisites: ['growth-fundamentals'],
    },
    'growth-viral-loops': {
      id: 'growth-viral-loops',
      track: 'content',
      name: 'Viral Mechanics',
      xpReward: 220,
      prerequisites: ['growth-analytics'],
    },
    'growth-community': {
      id: 'growth-community',
      track: 'content',
      name: 'Community Building',
      xpReward: 180,
      prerequisites: ['growth-fundamentals'],
    },
    'growth-tokenomics': {
      id: 'growth-tokenomics',
      track: 'content',
      name: 'Growth Tokenomics',
      xpReward: 150,
      prerequisites: ['growth-viral-loops'],
    },
  },
};

// In-memory formation progress (will be replaced by PostgreSQL later)
const formationProgress = new Map();

/**
 * Get all formation tracks
 * GET /formations/tracks
 */
router.get('/formations/tracks', (req, res) => {
  res.json(formationsData.tracks);
});

/**
 * Get specific track with modules
 * GET /formations/tracks/:trackId
 */
router.get('/formations/tracks/:trackId', (req, res) => {
  const { trackId } = req.params;
  const track = formationsData.tracks[trackId];

  if (!track) {
    return res.status(404).json({ error: 'Track not found' });
  }

  // Enrich with full module data
  const modules = track.modules.map(id => formationsData.modules[id]).filter(Boolean);

  res.json({
    ...track,
    moduleDetails: modules,
  });
});

/**
 * Get all modules
 * GET /formations/modules
 */
router.get('/formations/modules', (req, res) => {
  const { track } = req.query;

  if (track) {
    const filtered = Object.values(formationsData.modules).filter(m => m.track === track);
    return res.json(filtered);
  }

  res.json(formationsData.modules);
});

/**
 * Get specific module
 * GET /formations/modules/:moduleId
 */
router.get('/formations/modules/:moduleId', (req, res) => {
  const { moduleId } = req.params;
  const module = formationsData.modules[moduleId];

  if (!module) {
    return res.status(404).json({ error: 'Module not found' });
  }

  res.json(module);
});

/**
 * Get user's formation progress
 * GET /formations/progress/:wallet
 */
router.get('/formations/progress/:wallet', async (req, res) => {
  try {
    const { wallet } = req.params;

    if (!isValidAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const progress = formationProgress.get(wallet) || {};

    // Calculate progress percentages for each track
    const trackProgress = {};
    for (const [trackId, track] of Object.entries(formationsData.tracks)) {
      const completed = progress[trackId]?.completed || [];
      const total = track.modules.length;
      trackProgress[trackId] = {
        completed: completed.length,
        total,
        percentage: Math.round((completed.length / total) * 100),
        modules: completed,
      };
    }

    res.json({
      wallet,
      progress: trackProgress,
      raw: progress,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'formation-progress') });
  }
});

/**
 * Complete a module
 * POST /formations/progress/complete
 */
router.post('/formations/progress/complete', authMiddleware, async (req, res) => {
  try {
    const wallet = req.wallet;
    const { trackId, moduleId } = req.body;

    // Validate module exists
    const module = formationsData.modules[moduleId];
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Validate track matches
    if (module.track !== trackId) {
      return res.status(400).json({ error: 'Module does not belong to specified track' });
    }

    // Get or create progress
    let progress = formationProgress.get(wallet);
    if (!progress) {
      progress = {};
      formationProgress.set(wallet, progress);
    }

    if (!progress[trackId]) {
      progress[trackId] = { completed: [], startedAt: Date.now() };
    }

    // Check if already completed
    if (progress[trackId].completed.includes(moduleId)) {
      return res.status(400).json({ error: 'Module already completed' });
    }

    // Check prerequisites
    const prereqsMet = module.prerequisites.every(prereq =>
      progress[trackId].completed.includes(prereq)
    );

    if (!prereqsMet) {
      return res.status(400).json({
        error: 'Prerequisites not met',
        required: module.prerequisites,
      });
    }

    // Mark as completed
    progress[trackId].completed.push(moduleId);
    progress[trackId].lastCompleted = moduleId;
    progress[trackId].lastCompletedAt = Date.now();

    // Award XP via progression system
    const xpResult = getProgression().awardXP(wallet, 'achievement', {
      rarity: module.xpReward >= 400 ? 'rare' : module.xpReward >= 200 ? 'uncommon' : 'common',
    });

    // Log completion
    auditLog(
      AUDIT_EVENTS.USER_ACTION,
      {
        wallet: wallet.slice(0, 8) + '...',
        action: 'module_completed',
        trackId,
        moduleId,
        xpAwarded: xpResult.xpAwarded,
      },
      { severity: AUDIT_SEVERITY.LOW }
    );

    res.json({
      success: true,
      moduleId,
      trackId,
      xpAwarded: xpResult.xpAwarded,
      levelUp: xpResult.levelUp,
      newLevel: xpResult.newLevel,
      trackProgress: {
        completed: progress[trackId].completed.length,
        total: formationsData.tracks[trackId].modules.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'complete-module') });
  }
});

/**
 * Get next available module in a track
 * GET /formations/next/:wallet/:trackId
 */
router.get('/formations/next/:wallet/:trackId', async (req, res) => {
  try {
    const { wallet, trackId } = req.params;

    if (!isValidAddress(wallet)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const track = formationsData.tracks[trackId];
    if (!track) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const progress = formationProgress.get(wallet) || {};
    const completed = progress[trackId]?.completed || [];

    // Find next module where prerequisites are met
    for (const moduleId of track.modules) {
      if (completed.includes(moduleId)) continue;

      const module = formationsData.modules[moduleId];
      const prereqsMet = module.prerequisites.every(p => completed.includes(p));

      if (prereqsMet) {
        return res.json({
          nextModule: module,
          completedCount: completed.length,
          totalCount: track.modules.length,
        });
      }
    }

    // Track completed
    res.json({
      nextModule: null,
      completedCount: completed.length,
      totalCount: track.modules.length,
      trackCompleted: true,
    });
  } catch (error) {
    res.status(500).json({ error: sanitizeError(error, 'next-module') });
  }
});

module.exports = router;
