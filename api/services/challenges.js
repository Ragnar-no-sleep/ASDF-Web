/**
 * ASDF API - Daily Challenges Service
 *
 * Gamification through daily/weekly challenges:
 * - Score targets per game
 * - Games played targets
 * - Streak challenges
 * - Special event challenges
 *
 * Security by Design:
 * - Server-side challenge validation
 * - Progress tracking per wallet
 * - Anti-gaming measures
 */

'use strict';

// ============================================
// FIBONACCI CONSTANTS
// ============================================

const PHI = 1.618033988749895;
const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// ============================================
// CHALLENGE DEFINITIONS
// ============================================

const CHALLENGE_TYPES = {
  SCORE: 'score',           // Reach a score in a specific game
  GAMES_PLAYED: 'games_played', // Play X games
  TOTAL_SCORE: 'total_score',   // Accumulate X total score
  STREAK: 'streak',         // Play X days in a row
  PERFECT: 'perfect',       // Complete X perfect rounds
  HIGH_SCORE: 'high_score', // Beat your high score
  BURN: 'burn'              // Burn X tokens
};

const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  LEGENDARY: 'legendary'
};

// Challenge templates - rotated daily
const CHALLENGE_TEMPLATES = [
  // Easy challenges
  {
    type: CHALLENGE_TYPES.GAMES_PLAYED,
    difficulty: DIFFICULTY.EASY,
    target: 3,
    xpReward: 100,
    coinsReward: 20,
    name: 'Warm Up',
    description: 'Play 3 games today'
  },
  {
    type: CHALLENGE_TYPES.SCORE,
    difficulty: DIFFICULTY.EASY,
    target: 500,
    xpReward: 150,
    coinsReward: 30,
    name: 'Score Seeker',
    description: 'Score 500 points in any game'
  },
  {
    type: CHALLENGE_TYPES.TOTAL_SCORE,
    difficulty: DIFFICULTY.EASY,
    target: 1000,
    xpReward: 200,
    coinsReward: 40,
    name: 'Point Collector',
    description: 'Accumulate 1000 total points today'
  },

  // Medium challenges
  {
    type: CHALLENGE_TYPES.GAMES_PLAYED,
    difficulty: DIFFICULTY.MEDIUM,
    target: 5,
    xpReward: 250,
    coinsReward: 50,
    name: 'Dedicated Player',
    description: 'Play 5 games today'
  },
  {
    type: CHALLENGE_TYPES.SCORE,
    difficulty: DIFFICULTY.MEDIUM,
    target: 1000,
    xpReward: 300,
    coinsReward: 60,
    name: 'Score Hunter',
    description: 'Score 1000 points in a single game'
  },
  {
    type: CHALLENGE_TYPES.TOTAL_SCORE,
    difficulty: DIFFICULTY.MEDIUM,
    target: 3000,
    xpReward: 350,
    coinsReward: 70,
    name: 'Score Stacker',
    description: 'Accumulate 3000 total points today'
  },
  {
    type: CHALLENGE_TYPES.HIGH_SCORE,
    difficulty: DIFFICULTY.MEDIUM,
    target: 1,
    xpReward: 400,
    coinsReward: 80,
    name: 'Personal Best',
    description: 'Beat your high score in any game'
  },

  // Hard challenges
  {
    type: CHALLENGE_TYPES.GAMES_PLAYED,
    difficulty: DIFFICULTY.HARD,
    target: 8,
    xpReward: 500,
    coinsReward: 100,
    name: 'Marathon Runner',
    description: 'Play 8 games today'
  },
  {
    type: CHALLENGE_TYPES.SCORE,
    difficulty: DIFFICULTY.HARD,
    target: 2000,
    xpReward: 600,
    coinsReward: 120,
    name: 'Score Master',
    description: 'Score 2000 points in a single game'
  },
  {
    type: CHALLENGE_TYPES.PERFECT,
    difficulty: DIFFICULTY.HARD,
    target: 1,
    xpReward: 750,
    coinsReward: 150,
    name: 'Flawless',
    description: 'Complete a perfect round (no mistakes)'
  },

  // Legendary challenges
  {
    type: CHALLENGE_TYPES.SCORE,
    difficulty: DIFFICULTY.LEGENDARY,
    target: 5000,
    xpReward: 1000,
    coinsReward: 200,
    name: 'Score Legend',
    description: 'Score 5000 points in a single game'
  },
  {
    type: CHALLENGE_TYPES.TOTAL_SCORE,
    difficulty: DIFFICULTY.LEGENDARY,
    target: 10000,
    xpReward: 1500,
    coinsReward: 300,
    name: 'Point Emperor',
    description: 'Accumulate 10000 total points today'
  }
];

// ============================================
// IN-MEMORY STORAGE (Replace with DB later)
// ============================================

// Active challenges per day
const activeChallenges = new Map(); // date -> challenges[]

// User progress
const userProgress = new Map(); // wallet -> { date, challenges: { id: progress } }

// Claimed rewards
const claimedRewards = new Map(); // wallet -> Set(challengeId)

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get today's date string (UTC)
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get challenge expiration time (end of day UTC)
 */
function getChallengeExpiration(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Generate daily challenges using seeded random
 */
function generateDailyChallenges(date) {
  // Use date as seed for consistent daily challenges
  const seed = date.split('-').reduce((acc, n) => acc + parseInt(n), 0);
  const seededRandom = (max) => {
    const x = Math.sin(seed * max) * 10000;
    return Math.floor((x - Math.floor(x)) * max);
  };

  // Select 3 challenges: 1 easy, 1 medium, 1 hard/legendary
  const easy = CHALLENGE_TEMPLATES.filter(c => c.difficulty === DIFFICULTY.EASY);
  const medium = CHALLENGE_TEMPLATES.filter(c => c.difficulty === DIFFICULTY.MEDIUM);
  const hardLegendary = CHALLENGE_TEMPLATES.filter(c =>
    c.difficulty === DIFFICULTY.HARD || c.difficulty === DIFFICULTY.LEGENDARY
  );

  const challenges = [
    { ...easy[seededRandom(easy.length)], id: `${date}_easy` },
    { ...medium[seededRandom(medium.length)], id: `${date}_medium` },
    { ...hardLegendary[seededRandom(hardLegendary.length)], id: `${date}_hard` }
  ];

  // Add expiration
  const expiration = getChallengeExpiration(date);
  challenges.forEach(c => {
    c.expiresAt = expiration;
  });

  return challenges;
}

/**
 * Get or generate today's challenges
 */
function getTodayChallenges() {
  const today = getTodayDate();

  if (!activeChallenges.has(today)) {
    activeChallenges.set(today, generateDailyChallenges(today));

    // Clean up old challenges (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    for (const [date] of activeChallenges) {
      if (date < cutoff) {
        activeChallenges.delete(date);
      }
    }
  }

  return activeChallenges.get(today);
}

/**
 * Get user's progress for today
 */
function getUserProgress(wallet) {
  const today = getTodayDate();
  let progress = userProgress.get(wallet);

  // Reset if new day
  if (!progress || progress.date !== today) {
    progress = {
      date: today,
      challenges: {},
      gamesPlayed: 0,
      totalScore: 0,
      highScoresBeaten: 0,
      perfectRounds: 0
    };
    userProgress.set(wallet, progress);
  }

  return progress;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Get active challenges with user progress
 */
function getActiveChallenges(wallet) {
  const challenges = getTodayChallenges();
  const progress = getUserProgress(wallet);
  const claimed = claimedRewards.get(wallet) || new Set();

  return challenges.map(challenge => {
    const challengeProgress = progress.challenges[challenge.id] || { current: 0, completed: false };

    return {
      ...challenge,
      progress: challengeProgress.current,
      completed: challengeProgress.completed,
      claimed: claimed.has(challenge.id)
    };
  });
}

/**
 * Update challenge progress after game completion
 */
function updateProgress(wallet, gameResult) {
  const { gameId, score, isHighScore, isPerfect } = gameResult;
  const progress = getUserProgress(wallet);
  const challenges = getTodayChallenges();

  progress.gamesPlayed++;
  progress.totalScore += score;
  if (isHighScore) progress.highScoresBeaten++;
  if (isPerfect) progress.perfectRounds++;

  const newlyCompleted = [];

  challenges.forEach(challenge => {
    if (!progress.challenges[challenge.id]) {
      progress.challenges[challenge.id] = { current: 0, completed: false };
    }

    const cp = progress.challenges[challenge.id];
    if (cp.completed) return;

    let newValue = cp.current;

    switch (challenge.type) {
      case CHALLENGE_TYPES.GAMES_PLAYED:
        newValue = progress.gamesPlayed;
        break;

      case CHALLENGE_TYPES.SCORE:
        newValue = Math.max(newValue, score);
        break;

      case CHALLENGE_TYPES.TOTAL_SCORE:
        newValue = progress.totalScore;
        break;

      case CHALLENGE_TYPES.HIGH_SCORE:
        if (isHighScore) newValue++;
        break;

      case CHALLENGE_TYPES.PERFECT:
        if (isPerfect) newValue++;
        break;

      default:
        break;
    }

    cp.current = newValue;

    if (newValue >= challenge.target && !cp.completed) {
      cp.completed = true;
      newlyCompleted.push({
        id: challenge.id,
        name: challenge.name,
        xpReward: challenge.xpReward,
        coinsReward: challenge.coinsReward
      });
    }
  });

  userProgress.set(wallet, progress);

  return newlyCompleted;
}

/**
 * Claim reward for completed challenge
 */
function claimReward(wallet, challengeId) {
  const progress = getUserProgress(wallet);
  const challenges = getTodayChallenges();
  const claimed = claimedRewards.get(wallet) || new Set();

  // Find challenge
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) {
    return { success: false, error: 'Challenge not found' };
  }

  // Check if completed
  const cp = progress.challenges[challengeId];
  if (!cp || !cp.completed) {
    return { success: false, error: 'Challenge not completed' };
  }

  // Check if already claimed
  if (claimed.has(challengeId)) {
    return { success: false, error: 'Reward already claimed' };
  }

  // Mark as claimed
  claimed.add(challengeId);
  claimedRewards.set(wallet, claimed);

  return {
    success: true,
    xpAwarded: challenge.xpReward,
    coinsAwarded: challenge.coinsReward,
    challenge: {
      id: challenge.id,
      name: challenge.name
    }
  };
}

/**
 * Get challenge statistics
 */
function getChallengeStats() {
  const today = getTodayDate();
  let totalCompleted = 0;
  let totalClaimed = 0;

  for (const [wallet, progress] of userProgress) {
    if (progress.date === today) {
      for (const cp of Object.values(progress.challenges)) {
        if (cp.completed) totalCompleted++;
      }
    }
  }

  for (const claimed of claimedRewards.values()) {
    totalClaimed += claimed.size;
  }

  return {
    activeChallenges: getTodayChallenges().length,
    totalCompletedToday: totalCompleted,
    totalClaimedAllTime: totalClaimed
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Types
  CHALLENGE_TYPES,
  DIFFICULTY,

  // API
  getActiveChallenges,
  updateProgress,
  claimReward,
  getChallengeStats,

  // Helpers (for testing)
  getTodayDate,
  generateDailyChallenges
};
