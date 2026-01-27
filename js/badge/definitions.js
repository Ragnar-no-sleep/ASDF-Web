/**
 * Badge Definitions
 * Predefined badges for Learn & Build system
 *
 * @module badge/definitions
 */

'use strict';

import { BADGE_TIERS, BADGE_CATEGORIES } from './manager.js';

// ============================================
// BADGE DEFINITIONS
// ============================================

export const BADGE_DEFINITIONS = [
  // ==========================================
  // QUEST BADGES
  // ==========================================
  {
    id: 'first-quest',
    name: 'First Steps',
    description: 'Complete your first quest',
    icon: '\u{1F3C1}', // Checkered flag
    tier: BADGE_TIERS.BRONZE,
    category: BADGE_CATEGORIES.QUEST,
    xpBonus: 50,
    criteria: {
      type: 'quest_count',
      count: 1
    }
  },
  {
    id: 'quest-hunter',
    name: 'Quest Hunter',
    description: 'Complete 10 quests',
    icon: '\u{1F3AF}', // Target
    tier: BADGE_TIERS.SILVER,
    category: BADGE_CATEGORIES.QUEST,
    xpBonus: 200,
    criteria: {
      type: 'quest_count',
      count: 10
    }
  },
  {
    id: 'quest-master',
    name: 'Quest Master',
    description: 'Complete 50 quests',
    icon: '\u{1F451}', // Crown
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.QUEST,
    xpBonus: 500,
    criteria: {
      type: 'quest_count',
      count: 50
    }
  },
  {
    id: 'quest-legend',
    name: 'Quest Legend',
    description: 'Complete 100 quests',
    icon: '\u{2B50}', // Star
    tier: BADGE_TIERS.PLATINUM,
    category: BADGE_CATEGORIES.QUEST,
    xpBonus: 1000,
    criteria: {
      type: 'quest_count',
      count: 100
    }
  },

  // ==========================================
  // MODULE BADGES
  // ==========================================
  {
    id: 'first-module',
    name: 'Student',
    description: 'Complete your first module',
    icon: '\u{1F4D6}', // Open book
    tier: BADGE_TIERS.BRONZE,
    category: BADGE_CATEGORIES.MODULE,
    xpBonus: 100,
    criteria: {
      type: 'module_count',
      count: 1
    }
  },
  {
    id: 'module-apprentice',
    name: 'Apprentice',
    description: 'Complete 5 modules',
    icon: '\u{1F4DA}', // Books
    tier: BADGE_TIERS.SILVER,
    category: BADGE_CATEGORIES.MODULE,
    xpBonus: 300,
    criteria: {
      type: 'module_count',
      count: 5
    }
  },
  {
    id: 'module-scholar',
    name: 'Scholar',
    description: 'Complete 15 modules',
    icon: '\u{1F393}', // Graduation cap
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.MODULE,
    xpBonus: 750,
    criteria: {
      type: 'module_count',
      count: 15
    }
  },

  // ==========================================
  // TRACK BADGES
  // ==========================================
  {
    id: 'track-dev-complete',
    name: 'Solana Developer',
    description: 'Complete the Developer track',
    icon: '\u{1F4BB}', // Laptop
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.TRACK,
    xpBonus: 1000,
    criteria: {
      type: 'track_complete',
      track: 'dev'
    }
  },
  {
    id: 'track-gaming-complete',
    name: 'Game Creator',
    description: 'Complete the Game Dev track',
    icon: '\u{1F3AE}', // Game controller
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.TRACK,
    xpBonus: 1000,
    criteria: {
      type: 'track_complete',
      track: 'gaming'
    }
  },
  {
    id: 'track-content-complete',
    name: 'Content Master',
    description: 'Complete the Creator track',
    icon: '\u{1F3AC}', // Clapper board
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.TRACK,
    xpBonus: 1000,
    criteria: {
      type: 'track_complete',
      track: 'content'
    }
  },
  {
    id: 'polymath',
    name: 'Polymath',
    description: 'Complete all three tracks',
    icon: '\u{1F30D}', // Globe
    tier: BADGE_TIERS.LEGENDARY,
    category: BADGE_CATEGORIES.TRACK,
    xpBonus: 5000,
    criteria: {
      type: 'custom',
      check: (ctx) => {
        const tracks = ctx.trackProgress || {};
        return tracks.dev >= 100 && tracks.gaming >= 100 && tracks.content >= 100;
      }
    }
  },

  // ==========================================
  // XP / LEVEL BADGES
  // ==========================================
  {
    id: 'level-5',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: '\u{2B50}', // Star
    tier: BADGE_TIERS.BRONZE,
    category: BADGE_CATEGORIES.XP,
    xpBonus: 100,
    criteria: {
      type: 'level',
      level: 5
    }
  },
  {
    id: 'level-10',
    name: 'Builder',
    description: 'Reach Level 10',
    icon: '\u{1F3D7}', // Building construction
    tier: BADGE_TIERS.SILVER,
    category: BADGE_CATEGORIES.XP,
    xpBonus: 250,
    criteria: {
      type: 'level',
      level: 10
    }
  },
  {
    id: 'level-25',
    name: 'Master Builder',
    description: 'Reach Level 25',
    icon: '\u{1F3F0}', // Castle
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.XP,
    xpBonus: 500,
    criteria: {
      type: 'level',
      level: 25
    }
  },
  {
    id: 'level-50',
    name: 'Mythic Builder',
    description: 'Reach Level 50',
    icon: '\u{1F525}', // Fire
    tier: BADGE_TIERS.LEGENDARY,
    category: BADGE_CATEGORIES.XP,
    xpBonus: 2000,
    criteria: {
      type: 'level',
      level: 50
    }
  },
  {
    id: 'xp-1000',
    name: 'Thousand Club',
    description: 'Earn 1,000 XP',
    icon: '\u{1F4B0}', // Money bag
    tier: BADGE_TIERS.BRONZE,
    category: BADGE_CATEGORIES.XP,
    xpBonus: 50,
    criteria: {
      type: 'xp_total',
      amount: 1000
    }
  },
  {
    id: 'xp-10000',
    name: 'XP Millionaire',
    description: 'Earn 10,000 XP',
    icon: '\u{1F48E}', // Gem
    tier: BADGE_TIERS.SILVER,
    category: BADGE_CATEGORIES.XP,
    xpBonus: 200,
    criteria: {
      type: 'xp_total',
      amount: 10000
    }
  },
  {
    id: 'xp-100000',
    name: 'XP Whale',
    description: 'Earn 100,000 XP',
    icon: '\u{1F433}', // Whale
    tier: BADGE_TIERS.PLATINUM,
    category: BADGE_CATEGORIES.XP,
    xpBonus: 1000,
    criteria: {
      type: 'xp_total',
      amount: 100000
    }
  },

  // ==========================================
  // STREAK BADGES
  // ==========================================
  {
    id: 'streak-3',
    name: 'Getting Warmed Up',
    description: '3-day learning streak',
    icon: '\u{1F525}', // Fire
    tier: BADGE_TIERS.BRONZE,
    category: BADGE_CATEGORIES.STREAK,
    xpBonus: 50,
    criteria: {
      type: 'streak',
      days: 3
    }
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: '7-day learning streak',
    icon: '\u{1F4AA}', // Flexed biceps
    tier: BADGE_TIERS.SILVER,
    category: BADGE_CATEGORIES.STREAK,
    xpBonus: 150,
    criteria: {
      type: 'streak',
      days: 7
    }
  },
  {
    id: 'streak-21',
    name: 'Habit Formed',
    description: '21-day learning streak',
    icon: '\u{1F9E0}', // Brain
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.STREAK,
    xpBonus: 500,
    criteria: {
      type: 'streak',
      days: 21
    }
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: '30-day learning streak',
    icon: '\u{1F4C5}', // Calendar
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.STREAK,
    xpBonus: 750,
    criteria: {
      type: 'streak',
      days: 30
    }
  },
  {
    id: 'streak-100',
    name: 'Centurion',
    description: '100-day learning streak',
    icon: '\u{1F3C6}', // Trophy
    tier: BADGE_TIERS.LEGENDARY,
    category: BADGE_CATEGORIES.STREAK,
    xpBonus: 3000,
    criteria: {
      type: 'streak',
      days: 100
    }
  },

  // ==========================================
  // SPECIAL / COMMUNITY BADGES
  // ==========================================
  {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'Joined during beta',
    icon: '\u{1F680}', // Rocket
    tier: BADGE_TIERS.PLATINUM,
    category: BADGE_CATEGORIES.SPECIAL,
    xpBonus: 500,
    criteria: {
      type: 'first_action',
      action: 'betaUser'
    }
  },
  {
    id: 'first-burn',
    name: 'First Burn',
    description: 'Participate in your first token burn',
    icon: '\u{1F525}', // Fire
    tier: BADGE_TIERS.BRONZE,
    category: BADGE_CATEGORIES.COMMUNITY,
    xpBonus: 100,
    criteria: {
      type: 'first_action',
      action: 'tokenBurn'
    }
  },
  {
    id: 'perfect-quiz',
    name: 'Perfect Score',
    description: 'Score 100% on any quiz',
    icon: '\u{1F4AF}', // 100
    tier: BADGE_TIERS.SILVER,
    category: BADGE_CATEGORIES.SPECIAL,
    xpBonus: 200,
    criteria: {
      type: 'first_action',
      action: 'perfectQuiz'
    }
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: 'Complete a module in under 1 hour',
    icon: '\u26A1', // Lightning
    tier: BADGE_TIERS.GOLD,
    category: BADGE_CATEGORIES.SPECIAL,
    xpBonus: 300,
    criteria: {
      type: 'first_action',
      action: 'speedModule'
    }
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete a quest between midnight and 5am',
    icon: '\u{1F989}', // Owl
    tier: BADGE_TIERS.BRONZE,
    category: BADGE_CATEGORIES.SPECIAL,
    xpBonus: 50,
    criteria: {
      type: 'first_action',
      action: 'nightOwl'
    }
  },
  {
    id: 'community-helper',
    name: 'Community Helper',
    description: 'Help another builder with their quest',
    icon: '\u{1F91D}', // Handshake
    tier: BADGE_TIERS.SILVER,
    category: BADGE_CATEGORIES.COMMUNITY,
    xpBonus: 200,
    criteria: {
      type: 'first_action',
      action: 'helpedOther'
    }
  }
];

// ============================================
// TIER METADATA
// ============================================

export const TIER_METADATA = {
  [BADGE_TIERS.BRONZE]: {
    name: 'Bronze',
    color: '#CD7F32',
    rarity: 'Common'
  },
  [BADGE_TIERS.SILVER]: {
    name: 'Silver',
    color: '#C0C0C0',
    rarity: 'Uncommon'
  },
  [BADGE_TIERS.GOLD]: {
    name: 'Gold',
    color: '#FFD700',
    rarity: 'Rare'
  },
  [BADGE_TIERS.PLATINUM]: {
    name: 'Platinum',
    color: '#E5E4E2',
    rarity: 'Epic'
  },
  [BADGE_TIERS.LEGENDARY]: {
    name: 'Legendary',
    color: '#FF6B35',
    rarity: 'Legendary'
  }
};

// ============================================
// CATEGORY METADATA
// ============================================

export const CATEGORY_METADATA = {
  [BADGE_CATEGORIES.QUEST]: {
    name: 'Quests',
    icon: '\u{1F3AF}',
    description: 'Earned by completing quests'
  },
  [BADGE_CATEGORIES.MODULE]: {
    name: 'Learning',
    icon: '\u{1F4DA}',
    description: 'Earned by completing modules'
  },
  [BADGE_CATEGORIES.TRACK]: {
    name: 'Tracks',
    icon: '\u{1F6E4}',
    description: 'Earned by completing entire tracks'
  },
  [BADGE_CATEGORIES.XP]: {
    name: 'Experience',
    icon: '\u{2B50}',
    description: 'Earned by gaining XP and levels'
  },
  [BADGE_CATEGORIES.STREAK]: {
    name: 'Streaks',
    icon: '\u{1F525}',
    description: 'Earned by maintaining daily streaks'
  },
  [BADGE_CATEGORIES.COMMUNITY]: {
    name: 'Community',
    icon: '\u{1F465}',
    description: 'Earned through community participation'
  },
  [BADGE_CATEGORIES.SPECIAL]: {
    name: 'Special',
    icon: '\u{2728}',
    description: 'Rare and unique achievements'
  }
};

export default BADGE_DEFINITIONS;
