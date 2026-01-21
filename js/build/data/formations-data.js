/**
 * Build V2 - Formations Data
 * Learning tracks and module definitions
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// FORMATION TRACKS
// ============================================

// Note: Growth track merged into Content as of 2026-01-21
export const TRACKS = {
  dev: {
    id: 'dev',
    name: 'Developer',
    icon: '{ }',
    color: '#ea4e33',
    description: 'Master Solana development from basics to advanced smart contracts',
    duration: '12 weeks',
    difficulty: 'intermediate',
    modules: [
      'dev-fundamentals',
      'dev-solana-basics',
      'dev-token-mastery',
      'dev-anchor-deep',
      'dev-helius-integration',
      'dev-security-audit'
    ]
  },
  gaming: {
    id: 'gaming',
    name: 'Game Developer',
    icon: '\u25C8',
    color: '#8b5cf6',
    description: 'Build web3 games with blockchain integration',
    duration: '10 weeks',
    difficulty: 'intermediate',
    modules: [
      'gaming-fundamentals',
      'gaming-canvas',
      'gaming-mechanics',
      'gaming-web3',
      'gaming-tokenomics'
    ]
  },
  content: {
    id: 'content',
    name: 'Creator',
    icon: '\u2726',
    color: '#06b6d4',
    description: 'Create content, build communities, and drive growth',
    duration: '12 weeks',
    difficulty: 'beginner',
    modules: [
      // Original content modules
      'content-fundamentals',
      'content-storytelling',
      'content-video',
      'content-community',
      // Growth modules (merged)
      'growth-fundamentals',
      'growth-analytics',
      'growth-viral-loops',
      'growth-community',
      'growth-tokenomics'
    ]
  }
};

// ============================================
// MODULE DEFINITIONS
// ============================================

export const MODULES = {
  // Developer Track
  'dev-fundamentals': {
    id: 'dev-fundamentals',
    track: 'dev',
    name: 'Web Dev Fundamentals',
    description: 'HTML, CSS, JavaScript essentials for blockchain development',
    duration: '1 week',
    lessons: 5,
    projects: 1,
    skills: ['html-css', 'javascript', 'dom-manipulation'],
    prerequisites: [],
    resources: [
      { type: 'video', title: 'HTML/CSS Crash Course', duration: '2h' },
      { type: 'article', title: 'JavaScript Essentials', duration: '45min' },
      { type: 'project', title: 'Build a Token Dashboard', duration: '3h' }
    ]
  },
  'dev-solana-basics': {
    id: 'dev-solana-basics',
    track: 'dev',
    name: 'Solana Fundamentals',
    description: 'Understand how Solana works: accounts, transactions, programs',
    duration: '2 weeks',
    lessons: 8,
    projects: 2,
    skills: ['solana-basics', 'wallet-adapter'],
    prerequisites: ['dev-fundamentals'],
    resources: [
      { type: 'video', title: 'Solana Architecture Deep Dive', duration: '3h' },
      { type: 'article', title: 'Understanding Accounts', duration: '1h' },
      { type: 'project', title: 'Connect Wallet & Read Data', duration: '4h' }
    ]
  },
  'dev-token-mastery': {
    id: 'dev-token-mastery',
    track: 'dev',
    name: 'Token Mastery',
    description: 'Create, manage, and burn SPL tokens with Token-2022',
    duration: '2 weeks',
    lessons: 10,
    projects: 2,
    skills: ['token-program', 'token-2022'],
    prerequisites: ['dev-solana-basics'],
    resources: [
      { type: 'video', title: 'SPL Token Program Explained', duration: '2h' },
      { type: 'article', title: 'Token-2022 Features', duration: '1h' },
      { type: 'project', title: 'Build a Token Launcher', duration: '6h' }
    ]
  },
  'dev-anchor-deep': {
    id: 'dev-anchor-deep',
    track: 'dev',
    name: 'Anchor Deep Dive',
    description: 'Build production-ready Solana programs with Anchor',
    duration: '3 weeks',
    lessons: 12,
    projects: 3,
    skills: ['anchor-framework', 'smart-contract-security'],
    prerequisites: ['dev-token-mastery'],
    resources: [
      { type: 'video', title: 'Anchor Framework Masterclass', duration: '5h' },
      { type: 'article', title: 'Testing Anchor Programs', duration: '1.5h' },
      { type: 'project', title: 'Build a Staking Program', duration: '8h' }
    ]
  },
  'dev-helius-integration': {
    id: 'dev-helius-integration',
    track: 'dev',
    name: 'Helius Integration',
    description: 'Use Helius RPC, webhooks, and APIs for production apps',
    duration: '2 weeks',
    lessons: 8,
    projects: 2,
    skills: ['helius-rpc', 'webhooks'],
    prerequisites: ['dev-solana-basics'],
    resources: [
      { type: 'video', title: 'Helius RPC Features', duration: '2h' },
      { type: 'article', title: 'Setting Up Webhooks', duration: '45min' },
      { type: 'project', title: 'Real-time Transaction Monitor', duration: '5h' }
    ]
  },
  'dev-security-audit': {
    id: 'dev-security-audit',
    track: 'dev',
    name: 'Security & Auditing',
    description: 'Secure your programs and learn audit techniques',
    duration: '2 weeks',
    lessons: 8,
    projects: 1,
    skills: ['smart-contract-security', 'security-basics'],
    prerequisites: ['dev-anchor-deep'],
    resources: [
      { type: 'video', title: 'Common Solana Vulnerabilities', duration: '3h' },
      { type: 'article', title: 'Security Checklist', duration: '1h' },
      { type: 'project', title: 'Audit a Sample Program', duration: '4h' }
    ]
  },

  // Growth Modules (merged into Content track as of 2026-01-21)
  'growth-fundamentals': {
    id: 'growth-fundamentals',
    track: 'content',
    name: 'Growth Fundamentals',
    description: 'Core concepts of product growth and user acquisition',
    duration: '1 week',
    lessons: 5,
    projects: 1,
    skills: ['growth-strategy'],
    prerequisites: ['content-fundamentals'],
    resources: [
      { type: 'video', title: 'Growth Mindset', duration: '1h' },
      { type: 'article', title: 'Metrics That Matter', duration: '30min' }
    ]
  },
  'growth-analytics': {
    id: 'growth-analytics',
    track: 'content',
    name: 'Analytics & Metrics',
    description: 'Track, measure, and analyze user behavior',
    duration: '2 weeks',
    lessons: 6,
    projects: 1,
    skills: ['data-analysis', 'metrics-tracking'],
    prerequisites: ['growth-fundamentals'],
    resources: [
      { type: 'video', title: 'Setting Up Analytics', duration: '2h' },
      { type: 'project', title: 'Build a Metrics Dashboard', duration: '4h' }
    ]
  },
  'growth-viral-loops': {
    id: 'growth-viral-loops',
    track: 'content',
    name: 'Viral Mechanics',
    description: 'Design referral systems and viral loops',
    duration: '2 weeks',
    lessons: 6,
    projects: 1,
    skills: ['viral-marketing'],
    prerequisites: ['growth-analytics'],
    resources: [
      { type: 'video', title: 'Viral Loop Design', duration: '2h' },
      { type: 'article', title: 'Case Studies', duration: '1h' }
    ]
  },
  'growth-community': {
    id: 'growth-community',
    track: 'content',
    name: 'Community Building',
    description: 'Build and engage crypto communities',
    duration: '2 weeks',
    lessons: 5,
    projects: 1,
    skills: ['community-management'],
    prerequisites: ['growth-fundamentals'],
    resources: [
      { type: 'video', title: 'Discord & Twitter Strategy', duration: '2h' },
      { type: 'article', title: 'Community Playbook', duration: '45min' }
    ]
  },
  'growth-tokenomics': {
    id: 'growth-tokenomics',
    track: 'content',
    name: 'Growth Tokenomics',
    description: 'Use tokens to drive growth and retention',
    duration: '1 week',
    lessons: 4,
    projects: 1,
    skills: ['tokenomics'],
    prerequisites: ['growth-viral-loops'],
    resources: [
      { type: 'video', title: 'Token Incentive Design', duration: '2h' },
      { type: 'project', title: 'Design a Token Model', duration: '3h' }
    ]
  },

  // Gaming Track
  'gaming-fundamentals': {
    id: 'gaming-fundamentals',
    track: 'gaming',
    name: 'Game Design Basics',
    description: 'Core principles of game design and player psychology',
    duration: '1 week',
    lessons: 5,
    projects: 1,
    skills: ['game-design'],
    prerequisites: [],
    resources: [
      { type: 'video', title: 'Game Design Fundamentals', duration: '2h' },
      { type: 'article', title: 'Player Motivation', duration: '30min' }
    ]
  },
  'gaming-canvas': {
    id: 'gaming-canvas',
    track: 'gaming',
    name: 'Canvas Graphics',
    description: 'Build 2D games with HTML5 Canvas',
    duration: '2 weeks',
    lessons: 8,
    projects: 2,
    skills: ['canvas-graphics', 'game-loops'],
    prerequisites: ['gaming-fundamentals'],
    resources: [
      { type: 'video', title: 'Canvas API Deep Dive', duration: '3h' },
      { type: 'project', title: 'Build Snake Game', duration: '4h' }
    ]
  },
  'gaming-mechanics': {
    id: 'gaming-mechanics',
    track: 'gaming',
    name: 'Game Mechanics',
    description: 'Implement physics, collision, and game states',
    duration: '2 weeks',
    lessons: 8,
    projects: 2,
    skills: ['game-loops'],
    prerequisites: ['gaming-canvas'],
    resources: [
      { type: 'video', title: 'Physics for Games', duration: '2h' },
      { type: 'project', title: 'Build Platformer', duration: '6h' }
    ]
  },
  'gaming-web3': {
    id: 'gaming-web3',
    track: 'gaming',
    name: 'Web3 Integration',
    description: 'Add blockchain features to your games',
    duration: '3 weeks',
    lessons: 10,
    projects: 2,
    skills: ['wallet-adapter', 'token-program'],
    prerequisites: ['gaming-mechanics'],
    resources: [
      { type: 'video', title: 'Web3 Gaming Patterns', duration: '3h' },
      { type: 'project', title: 'Add NFT Rewards', duration: '5h' }
    ]
  },
  'gaming-tokenomics': {
    id: 'gaming-tokenomics',
    track: 'gaming',
    name: 'Game Tokenomics',
    description: 'Design sustainable game economies',
    duration: '2 weeks',
    lessons: 6,
    projects: 1,
    skills: ['tokenomics'],
    prerequisites: ['gaming-web3'],
    resources: [
      { type: 'video', title: 'Game Economy Design', duration: '2h' },
      { type: 'project', title: 'Design Token Economy', duration: '4h' }
    ]
  },

  // Content Track
  'content-fundamentals': {
    id: 'content-fundamentals',
    track: 'content',
    name: 'Content Basics',
    description: 'Foundations of content creation for crypto',
    duration: '1 week',
    lessons: 4,
    projects: 1,
    skills: [],
    prerequisites: [],
    resources: [
      { type: 'video', title: 'Content Strategy 101', duration: '1h' },
      { type: 'article', title: 'Finding Your Voice', duration: '30min' }
    ]
  },
  'content-storytelling': {
    id: 'content-storytelling',
    track: 'content',
    name: 'Storytelling',
    description: 'Craft compelling narratives for your project',
    duration: '2 weeks',
    lessons: 5,
    projects: 1,
    skills: [],
    prerequisites: ['content-fundamentals'],
    resources: [
      { type: 'video', title: 'Crypto Storytelling', duration: '2h' },
      { type: 'project', title: 'Write Project Story', duration: '3h' }
    ]
  },
  'content-video': {
    id: 'content-video',
    track: 'content',
    name: 'Video Production',
    description: 'Create engaging video content',
    duration: '2 weeks',
    lessons: 6,
    projects: 2,
    skills: [],
    prerequisites: ['content-storytelling'],
    resources: [
      { type: 'video', title: 'Video Editing Basics', duration: '3h' },
      { type: 'project', title: 'Create Explainer Video', duration: '5h' }
    ]
  },
  'content-community': {
    id: 'content-community',
    track: 'content',
    name: 'Community Content',
    description: 'Content that builds and engages communities',
    duration: '1 week',
    lessons: 4,
    projects: 1,
    skills: [],
    prerequisites: ['content-fundamentals'],
    resources: [
      { type: 'video', title: 'Community Engagement', duration: '1.5h' },
      { type: 'article', title: 'Content Calendar', duration: '30min' }
    ]
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get track by ID
 * @param {string} trackId
 * @returns {Object|null}
 */
export function getTrack(trackId) {
  return TRACKS[trackId] || null;
}

/**
 * Get module by ID
 * @param {string} moduleId
 * @returns {Object|null}
 */
export function getModule(moduleId) {
  return MODULES[moduleId] || null;
}

/**
 * Get all modules for a track
 * @param {string} trackId
 * @returns {Array}
 */
export function getTrackModules(trackId) {
  const track = TRACKS[trackId];
  if (!track) return [];

  return track.modules.map(id => MODULES[id]).filter(Boolean);
}

/**
 * Calculate track progress
 * @param {string} trackId
 * @param {Array} completedModules - IDs of completed modules
 * @returns {number} 0-100
 */
export function calculateTrackProgress(trackId, completedModules = []) {
  const track = TRACKS[trackId];
  if (!track) return 0;

  const completed = track.modules.filter(id => completedModules.includes(id)).length;
  return Math.round((completed / track.modules.length) * 100);
}

/**
 * Get next available module in track
 * @param {string} trackId
 * @param {Array} completedModules
 * @returns {Object|null}
 */
export function getNextModule(trackId, completedModules = []) {
  const modules = getTrackModules(trackId);

  for (const module of modules) {
    if (completedModules.includes(module.id)) continue;

    // Check if prerequisites are met
    const prereqsMet = module.prerequisites.every(prereq =>
      completedModules.includes(prereq)
    );

    if (prereqsMet) {
      return module;
    }
  }

  return null;
}

// ============================================
// EXPORTS
// ============================================

export default {
  TRACKS,
  MODULES,
  getTrack,
  getModule,
  getTrackModules,
  calculateTrackProgress,
  getNextModule
};
