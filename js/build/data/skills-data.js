/**
 * Build V2 - Skills Data
 * Skill definitions and mappings per project
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// SKILL CATEGORIES
// ============================================

export const SKILL_CATEGORIES = {
  blockchain: {
    id: 'blockchain',
    name: 'Blockchain',
    icon: '\u26D3',  // Chain
    color: '#8b5cf6'
  },
  frontend: {
    id: 'frontend',
    name: 'Frontend',
    icon: '\u{1F3A8}',
    color: '#06b6d4'
  },
  backend: {
    id: 'backend',
    name: 'Backend',
    icon: '\u2699',  // Gear
    color: '#22c55e'
  },
  data: {
    id: 'data',
    name: 'Data',
    icon: '\u{1F4CA}',
    color: '#f59e0b'
  },
  security: {
    id: 'security',
    name: 'Security',
    icon: '\u{1F6E1}',
    color: '#ef4444'
  },
  devops: {
    id: 'devops',
    name: 'DevOps',
    icon: '\u2601',  // Cloud
    color: '#3b82f6'
  },
  design: {
    id: 'design',
    name: 'Design',
    icon: '\u2728',
    color: '#ec4899'
  },
  gaming: {
    id: 'gaming',
    name: 'Gaming',
    icon: '\u{1F3AE}',
    color: '#a855f7'
  }
};

// ============================================
// SKILL DEFINITIONS
// ============================================

export const SKILLS = {
  // Blockchain Skills
  'solana-basics': {
    id: 'solana-basics',
    name: 'Solana Basics',
    category: 'blockchain',
    level: 1,
    description: 'Understand Solana architecture, accounts, and transactions',
    prerequisites: []
  },
  'anchor-framework': {
    id: 'anchor-framework',
    name: 'Anchor Framework',
    category: 'blockchain',
    level: 2,
    description: 'Build Solana programs with Anchor',
    prerequisites: ['solana-basics']
  },
  'token-program': {
    id: 'token-program',
    name: 'SPL Token Program',
    category: 'blockchain',
    level: 2,
    description: 'Create and manage SPL tokens',
    prerequisites: ['solana-basics']
  },
  'token-2022': {
    id: 'token-2022',
    name: 'Token-2022',
    category: 'blockchain',
    level: 3,
    description: 'Advanced token features with Token-2022',
    prerequisites: ['token-program']
  },
  'helius-rpc': {
    id: 'helius-rpc',
    name: 'Helius RPC',
    category: 'blockchain',
    level: 2,
    description: 'Use Helius enhanced RPC and webhooks',
    prerequisites: ['solana-basics']
  },
  'metaplex': {
    id: 'metaplex',
    name: 'Metaplex NFTs',
    category: 'blockchain',
    level: 3,
    description: 'Create and manage NFTs with Metaplex',
    prerequisites: ['token-program']
  },

  // Frontend Skills
  'html-css': {
    id: 'html-css',
    name: 'HTML/CSS',
    category: 'frontend',
    level: 1,
    description: 'Build responsive web layouts',
    prerequisites: []
  },
  'javascript': {
    id: 'javascript',
    name: 'JavaScript',
    category: 'frontend',
    level: 1,
    description: 'Core JavaScript programming',
    prerequisites: []
  },
  'dom-manipulation': {
    id: 'dom-manipulation',
    name: 'DOM Manipulation',
    category: 'frontend',
    level: 2,
    description: 'Dynamic UI updates and interactions',
    prerequisites: ['javascript']
  },
  'threejs': {
    id: 'threejs',
    name: 'Three.js',
    category: 'frontend',
    level: 3,
    description: '3D graphics in the browser',
    prerequisites: ['javascript']
  },
  'gsap': {
    id: 'gsap',
    name: 'GSAP Animation',
    category: 'frontend',
    level: 2,
    description: 'Professional web animations',
    prerequisites: ['javascript']
  },
  'wallet-adapter': {
    id: 'wallet-adapter',
    name: 'Wallet Adapter',
    category: 'frontend',
    level: 2,
    description: 'Integrate Solana wallets',
    prerequisites: ['javascript', 'solana-basics']
  },

  // Backend Skills
  'nodejs': {
    id: 'nodejs',
    name: 'Node.js',
    category: 'backend',
    level: 1,
    description: 'Server-side JavaScript',
    prerequisites: ['javascript']
  },
  'express': {
    id: 'express',
    name: 'Express.js',
    category: 'backend',
    level: 2,
    description: 'Build REST APIs with Express',
    prerequisites: ['nodejs']
  },
  'webhooks': {
    id: 'webhooks',
    name: 'Webhooks',
    category: 'backend',
    level: 2,
    description: 'Handle real-time events',
    prerequisites: ['nodejs']
  },
  'caching': {
    id: 'caching',
    name: 'Caching Strategies',
    category: 'backend',
    level: 3,
    description: 'Redis, memory caching, CDN',
    prerequisites: ['nodejs']
  },

  // Data Skills
  'data-analysis': {
    id: 'data-analysis',
    name: 'Data Analysis',
    category: 'data',
    level: 2,
    description: 'Analyze on-chain and off-chain data',
    prerequisites: ['javascript']
  },
  'chart-visualization': {
    id: 'chart-visualization',
    name: 'Data Visualization',
    category: 'data',
    level: 2,
    description: 'Create charts and dashboards',
    prerequisites: ['javascript']
  },
  'metrics-tracking': {
    id: 'metrics-tracking',
    name: 'Metrics Tracking',
    category: 'data',
    level: 2,
    description: 'Track and display real-time metrics',
    prerequisites: ['data-analysis']
  },

  // Security Skills
  'security-basics': {
    id: 'security-basics',
    name: 'Security Basics',
    category: 'security',
    level: 1,
    description: 'Web security fundamentals',
    prerequisites: []
  },
  'smart-contract-security': {
    id: 'smart-contract-security',
    name: 'Smart Contract Security',
    category: 'security',
    level: 3,
    description: 'Audit and secure Solana programs',
    prerequisites: ['anchor-framework', 'security-basics']
  },
  'wallet-security': {
    id: 'wallet-security',
    name: 'Wallet Security',
    category: 'security',
    level: 2,
    description: 'Secure wallet integrations',
    prerequisites: ['wallet-adapter', 'security-basics']
  },

  // Gaming Skills
  'game-design': {
    id: 'game-design',
    name: 'Game Design',
    category: 'gaming',
    level: 1,
    description: 'Core game design principles',
    prerequisites: []
  },
  'game-loops': {
    id: 'game-loops',
    name: 'Game Loops',
    category: 'gaming',
    level: 2,
    description: 'Implement game update and render loops',
    prerequisites: ['javascript', 'game-design']
  },
  'canvas-graphics': {
    id: 'canvas-graphics',
    name: 'Canvas Graphics',
    category: 'gaming',
    level: 2,
    description: '2D graphics with HTML5 Canvas',
    prerequisites: ['javascript']
  },
  'tokenomics': {
    id: 'tokenomics',
    name: 'Game Tokenomics',
    category: 'gaming',
    level: 3,
    description: 'Design token economies for games',
    prerequisites: ['game-design', 'token-program']
  }
};

// ============================================
// PROJECT SKILL MAPPINGS
// ============================================

export const PROJECT_SKILLS = {
  'burn-engine': {
    primary: ['token-2022', 'helius-rpc', 'webhooks'],
    secondary: ['solana-basics', 'anchor-framework', 'nodejs'],
    teaches: ['token-2022', 'webhooks', 'caching']
  },
  'burn-tracker': {
    primary: ['data-analysis', 'chart-visualization', 'helius-rpc'],
    secondary: ['javascript', 'dom-manipulation', 'metrics-tracking'],
    teaches: ['chart-visualization', 'metrics-tracking', 'helius-rpc']
  },
  'token-launcher': {
    primary: ['token-program', 'token-2022', 'wallet-adapter'],
    secondary: ['solana-basics', 'javascript', 'security-basics'],
    teaches: ['token-program', 'token-2022', 'wallet-security']
  },
  'learn-platform': {
    primary: ['html-css', 'javascript', 'gsap'],
    secondary: ['dom-manipulation', 'game-design'],
    teaches: ['html-css', 'javascript', 'game-loops']
  },
  'games-platform': {
    primary: ['game-loops', 'canvas-graphics', 'gsap'],
    secondary: ['javascript', 'game-design', 'dom-manipulation'],
    teaches: ['game-loops', 'canvas-graphics', 'game-design']
  },
  'holdex': {
    primary: ['data-analysis', 'helius-rpc', 'chart-visualization'],
    secondary: ['javascript', 'dom-manipulation', 'caching'],
    teaches: ['data-analysis', 'helius-rpc', 'metrics-tracking']
  },
  'forecast': {
    primary: ['data-analysis', 'chart-visualization', 'metrics-tracking'],
    secondary: ['javascript', 'nodejs', 'caching'],
    teaches: ['data-analysis', 'chart-visualization']
  },
  'ignition': {
    primary: ['token-program', 'anchor-framework', 'smart-contract-security'],
    secondary: ['solana-basics', 'security-basics'],
    teaches: ['anchor-framework', 'smart-contract-security']
  },
  'oracle': {
    primary: ['helius-rpc', 'webhooks', 'data-analysis'],
    secondary: ['nodejs', 'express', 'caching'],
    teaches: ['helius-rpc', 'webhooks']
  },
  'rpc-monitor': {
    primary: ['helius-rpc', 'metrics-tracking', 'nodejs'],
    secondary: ['express', 'caching', 'chart-visualization'],
    teaches: ['helius-rpc', 'metrics-tracking']
  },
  'community-hub': {
    primary: ['html-css', 'javascript', 'dom-manipulation'],
    secondary: ['gsap', 'game-design'],
    teaches: ['dom-manipulation', 'gsap']
  },
  'deploy-pipeline': {
    primary: ['nodejs', 'express', 'security-basics'],
    secondary: ['caching', 'webhooks'],
    teaches: ['nodejs', 'express', 'security-basics']
  },
  'security-audit': {
    primary: ['smart-contract-security', 'security-basics', 'anchor-framework'],
    secondary: ['solana-basics', 'token-program'],
    teaches: ['smart-contract-security', 'wallet-security']
  },
  'ambassador-program': {
    primary: ['html-css', 'javascript'],
    secondary: ['dom-manipulation', 'gsap'],
    teaches: ['html-css', 'javascript']
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get skill by ID
 * @param {string} skillId
 * @returns {Object|null}
 */
export function getSkill(skillId) {
  return SKILLS[skillId] || null;
}

/**
 * Get skills for a project
 * @param {string} projectId
 * @returns {Object}
 */
export function getProjectSkills(projectId) {
  const mapping = PROJECT_SKILLS[projectId];
  if (!mapping) return { primary: [], secondary: [], teaches: [] };

  return {
    primary: mapping.primary.map(id => SKILLS[id]).filter(Boolean),
    secondary: mapping.secondary.map(id => SKILLS[id]).filter(Boolean),
    teaches: mapping.teaches.map(id => SKILLS[id]).filter(Boolean)
  };
}

/**
 * Get all skills in a category
 * @param {string} categoryId
 * @returns {Array}
 */
export function getSkillsByCategory(categoryId) {
  return Object.values(SKILLS).filter(skill => skill.category === categoryId);
}

/**
 * Get skill prerequisites tree
 * @param {string} skillId
 * @returns {Array}
 */
export function getSkillPrerequisites(skillId) {
  const skill = SKILLS[skillId];
  if (!skill || !skill.prerequisites.length) return [];

  const prereqs = [];
  const visited = new Set();

  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);

    const s = SKILLS[id];
    if (s) {
      prereqs.push(s);
      s.prerequisites.forEach(traverse);
    }
  }

  skill.prerequisites.forEach(traverse);
  return prereqs;
}

// ============================================
// EXPORTS
// ============================================

export default {
  SKILL_CATEGORIES,
  SKILLS,
  PROJECT_SKILLS,
  getSkill,
  getProjectSkills,
  getSkillsByCategory,
  getSkillPrerequisites
};
