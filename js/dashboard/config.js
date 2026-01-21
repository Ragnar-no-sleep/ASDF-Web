/**
 * Yggdrasil Builder's Cosmos - Configuration
 * Fire & Ice theme, multi-level navigation
 */

'use strict';

// Golden ratio constants
export const PHI = 1.618033988749895;
export const PHI_INV = 0.618033988749895;
export const GOLDEN_ANGLE = 2.399963229728653; // ~137.5 degrees in radians

/**
 * View levels for navigation
 */
export const VIEWS = {
  COSMOS: 'cosmos',           // Full tree overview
  PROJECT_TREE: 'project',    // Single project with skills
  SKILL_FOCUS: 'skill',       // Skill formation view
  TIMELINE: 'timeline'        // Project timeline
};

/**
 * Camera configurations per view
 */
export const CAMERA_STATES = {
  COSMOS: {
    position: { x: 0, y: 15, z: 50 },
    target: { x: 0, y: 10, z: 0 },
    fov: 60
  },
  PROJECT: {
    // Offset relative to island position
    offset: { x: 5, y: 3, z: 10 },
    fov: 45
  },
  PROJECT_TREE: {
    // Offset relative to island position
    offset: { x: 5, y: 3, z: 10 },
    fov: 45
  },
  SKILL_FOCUS: {
    offset: { x: 0, y: 2, z: 8 },
    fov: 40
  },
  TIMELINE: {
    offset: { x: 10, y: 2, z: 8 },
    fov: 50
  }
};

/**
 * Main configuration
 */
export const CONFIG = {
  // ===== YGGDRASIL TREE =====
  tree: {
    trunk: {
      height: 15,
      radiusBottom: 1.2,
      radiusTop: 0.6,
      segments: 12,
      color: 0x2a1810  // Dark burnt wood
    },
    branches: {
      count: 13,          // Sacred number
      baseHeight: 8,      // Where branches start
      spread: 6,          // Max horizontal distance
      color: 0x3d2817,
      thickness: 0.15
    },
    roots: {
      count: 5,
      depth: 3,
      spread: 4,
      color: 0x1a0f08
    }
  },

  // ===== BURN CORE =====
  burnCore: {
    radius: 1.5,
    color: 0xff4400,
    glowColor: 0xff6600,
    pulseSpeed: 1.5,
    pulseIntensity: 0.3,
    position: { x: 0, y: 5, z: 0 }
  },

  // ===== FIRE PARTICLES =====
  fire: {
    count: 2000,
    size: 0.3,
    speed: 2,
    spread: 3,
    colors: [0xff4400, 0xff6600, 0xff8800, 0xffaa00],
    lifetime: 2
  },

  // ===== SNOWSTORM =====
  snowstorm: {
    count: 3000,
    size: 0.15,
    speed: 0.5,
    windSpeed: 1,
    spread: 80,
    color: 0xaaccff,
    opacity: 0.6
  },

  // ===== STONE ISLANDS =====
  islands: {
    orbitRadius: 12,      // Distance from tree
    orbitHeight: { min: 6, max: 14 },
    size: { min: 1.5, max: 3 },
    rockColor: 0x4a4a5a,
    glowIntensity: 0.5,
    trackColors: {
      dev: 0xff4444,      // Red
      games: 0x9944ff,    // Purple
      content: 0x00d9ff   // Cyan
    }
  },

  // ===== SCENE =====
  scene: {
    background: 0x020812,
    fog: {
      color: 0x020812,
      near: 40,
      far: 120
    }
  },

  // ===== LIGHTING =====
  lighting: {
    ambient: {
      color: 0x1a1a2e,
      intensity: 0.3
    },
    fire: {
      color: 0xff6633,
      intensity: 1.5,
      distance: 30,
      position: { x: 0, y: 8, z: 0 }
    },
    ice: {
      color: 0x88aaff,
      intensity: 0.4,
      position: { x: 20, y: 20, z: 20 }
    },
    moon: {
      color: 0x8888ff,
      intensity: 0.3,
      position: { x: -15, y: 25, z: -10 }
    }
  },

  // ===== ANIMATIONS =====
  animation: {
    cameraTransition: 1.5,
    islandHover: 0.3,
    panelSlide: 0.4,
    easing: 'power2.inOut'
  },

  // ===== PERFORMANCE =====
  performance: {
    maxParticles: 5000,
    lodDistance: 40,
    targetFps: 60
  }
};

/**
 * Skills definitions
 */
export const SKILLS = {
  // Dev skills
  solana_basics: { id: 'solana_basics', name: 'Solana Basics', track: 'dev', icon: '⚡', difficulty: 1 },
  web3_js: { id: 'web3_js', name: 'Web3.js', track: 'dev', icon: '🔗', difficulty: 2 },
  anchor: { id: 'anchor', name: 'Anchor Framework', track: 'dev', icon: '⚓', difficulty: 3 },
  token_analysis: { id: 'token_analysis', name: 'Token Analysis', track: 'dev', icon: '📊', difficulty: 2 },
  smart_contracts: { id: 'smart_contracts', name: 'Smart Contracts', track: 'dev', icon: '📜', difficulty: 3 },
  api_integration: { id: 'api_integration', name: 'API Integration', track: 'dev', icon: '🔌', difficulty: 2 },
  data_viz: { id: 'data_viz', name: 'Data Visualization', track: 'dev', icon: '📈', difficulty: 2 },
  burn_mechanics: { id: 'burn_mechanics', name: 'Burn Mechanics', track: 'dev', icon: '🔥', difficulty: 3 },

  // Games skills
  game_design: { id: 'game_design', name: 'Game Design', track: 'games', icon: '🎲', difficulty: 2 },
  pixel_art: { id: 'pixel_art', name: 'Pixel Art', track: 'games', icon: '🎨', difficulty: 1 },
  game_economy: { id: 'game_economy', name: 'Game Economy', track: 'games', icon: '💰', difficulty: 3 },
  multiplayer: { id: 'multiplayer', name: 'Multiplayer', track: 'games', icon: '👥', difficulty: 3 },
  leaderboards: { id: 'leaderboards', name: 'Leaderboards', track: 'games', icon: '🏆', difficulty: 2 },

  // Content skills
  writing: { id: 'writing', name: 'Technical Writing', track: 'content', icon: '✍️', difficulty: 1 },
  philosophy: { id: 'philosophy', name: 'Philosophy', track: 'content', icon: '🧠', difficulty: 2 },
  teaching: { id: 'teaching', name: 'Teaching', track: 'content', icon: '📚', difficulty: 2 },
  storytelling: { id: 'storytelling', name: 'Storytelling', track: 'content', icon: '📖', difficulty: 2 },
  community: { id: 'community', name: 'Community Building', track: 'content', icon: '🤝', difficulty: 2 }
};

/**
 * Ecosystem projects (Stone Islands)
 */
export const ECOSYSTEM_PROJECTS = [
  {
    id: 'holdex',
    name: 'HolDex',
    track: 'dev',
    status: 'live',
    description: 'K-Score token analyzer',
    url: '/holdex.html',
    kScore: 85,
    skills: ['solana_basics', 'web3_js', 'token_analysis', 'data_viz', 'api_integration']
  },
  {
    id: 'forecast',
    name: 'Forecast',
    track: 'dev',
    status: 'live',
    description: 'Market predictions',
    url: '/forecast.html',
    kScore: 72,
    skills: ['solana_basics', 'data_viz', 'api_integration', 'token_analysis']
  },
  {
    id: 'burns',
    name: 'Burns Tracker',
    track: 'dev',
    status: 'live',
    description: 'Real-time burn analytics',
    url: '/burns.html',
    kScore: 90,
    skills: ['solana_basics', 'burn_mechanics', 'data_viz', 'api_integration', 'smart_contracts']
  },
  {
    id: 'pumparena',
    name: 'Pump Arena',
    track: 'games',
    status: 'building',
    description: 'Competitive trading game',
    url: null,
    kScore: 45,
    skills: ['game_design', 'game_economy', 'multiplayer', 'leaderboards', 'solana_basics']
  },
  {
    id: 'arcade',
    name: 'Arcade Games',
    track: 'games',
    status: 'live',
    description: 'Casual blockchain games',
    url: '/games.html',
    kScore: 68,
    skills: ['game_design', 'pixel_art', 'leaderboards', 'solana_basics']
  },
  {
    id: 'manifesto',
    name: 'Manifesto',
    track: 'content',
    status: 'live',
    description: 'ASDF philosophy',
    url: '/manifesto.html',
    kScore: 95,
    skills: ['philosophy', 'writing', 'storytelling']
  },
  {
    id: 'learn',
    name: 'Learn',
    track: 'content',
    status: 'live',
    description: 'Builder education',
    url: '/learn.html',
    kScore: 78,
    skills: ['teaching', 'writing', 'solana_basics', 'community']
  },
  {
    id: 'journey',
    name: 'Journey',
    track: 'content',
    status: 'live',
    description: 'Interactive learning path',
    url: '/journey.html',
    kScore: 82,
    skills: ['teaching', 'storytelling', 'game_design', 'community']
  }
];

/**
 * Track definitions
 */
export const TRACKS = {
  dev: {
    id: 'dev',
    name: 'Developer',
    color: 0xff4444,
    icon: '⚡',
    description: 'Build tools and infrastructure'
  },
  games: {
    id: 'games',
    name: 'Games',
    color: 0x9944ff,
    icon: '🎮',
    description: 'Create engaging experiences'
  },
  content: {
    id: 'content',
    name: 'Content',
    color: 0x00d9ff,
    icon: '📚',
    description: 'Educate and inspire'
  }
};

export default CONFIG;
