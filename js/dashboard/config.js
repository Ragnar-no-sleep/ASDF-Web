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
  COSMOS: 'cosmos', // Full tree overview
  PROJECT_TREE: 'project', // Single project with skills
  SKILL_FOCUS: 'skill', // Skill formation view
  TIMELINE: 'timeline', // Project timeline
};

/**
 * Camera configurations per view
 */
export const CAMERA_STATES = {
  COSMOS: {
    position: { x: 0, y: 15, z: 50 },
    target: { x: 0, y: 10, z: 0 },
    fov: 60,
  },
  PROJECT: {
    // Offset relative to island position - wider view to avoid visibility conflicts
    offset: { x: 8, y: 6, z: 18 },
    fov: 50,
  },
  PROJECT_TREE: {
    // Offset relative to island position - wider view
    offset: { x: 8, y: 6, z: 18 },
    fov: 50,
  },
  SKILL_FOCUS: {
    offset: { x: 0, y: 2, z: 8 },
    fov: 40,
  },
  TIMELINE: {
    offset: { x: 10, y: 2, z: 8 },
    fov: 50,
  },
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
      color: 0x2a1810, // Dark burnt wood
    },
    branches: {
      count: 13, // Sacred number
      baseHeight: 8, // Where branches start
      spread: 6, // Max horizontal distance
      color: 0x3d2817,
      thickness: 0.15,
    },
    roots: {
      count: 5,
      depth: 3,
      spread: 4,
      color: 0x1a0f08,
    },
  },

  // ===== BURN CORE (Heart of Yggdrasil) =====
  burnCore: {
    radius: 2.0,
    color: 0xff3300,
    glowColor: 0xff5500,
    innerColor: 0xffcc00, // Yellow-white hot center
    pulseSpeed: 2.0,
    pulseIntensity: 0.5,
    position: { x: 0, y: 5, z: 0 },
    // Ember particles rising from core
    embers: {
      count: 500,
      size: 0.25,
      speed: 3,
      spread: 2.5,
      colors: [0xff2200, 0xff4400, 0xff6600, 0xffaa00, 0xffcc00],
      lifetime: 3,
    },
  },

  // ===== FIRE PARTICLES (around trunk) =====
  fire: {
    count: 3000,
    size: 0.35,
    speed: 2.5,
    spread: 4,
    colors: [0xff2200, 0xff4400, 0xff6600, 0xff8800, 0xffaa00],
    lifetime: 2.5,
  },

  // ===== SNOWSTORM (Nordic blizzard) =====
  snowstorm: {
    count: 8000, // Dense blizzard
    size: 0.12,
    speed: 1.5, // Faster falling
    windSpeed: 3.0, // Strong gusts
    windVariation: 2.0, // Wind changes
    spread: 100,
    color: 0xeeffff, // Pure ice white
    opacity: 0.7,
    // Larger flakes layer
    largeFlakes: {
      count: 500,
      size: 0.4,
      speed: 0.8,
      opacity: 0.5,
    },
  },

  // ===== STONE ISLANDS =====
  islands: {
    orbitRadius: 12, // Distance from tree
    orbitHeight: { min: 6, max: 14 },
    size: { min: 1.5, max: 3 },
    rockColor: 0x4a4a5a,
    glowIntensity: 0.5,
    trackColors: {
      dev: 0xff4444, // Red
      games: 0x9944ff, // Purple
      content: 0x00d9ff, // Cyan
    },
  },

  // ===== SCENE =====
  scene: {
    background: 0x020812,
    fog: {
      color: 0x020812,
      near: 40,
      far: 120,
    },
  },

  // ===== LIGHTING =====
  lighting: {
    ambient: {
      color: 0x1a1a2e,
      intensity: 0.3,
    },
    fire: {
      color: 0xff6633,
      intensity: 1.5,
      distance: 30,
      position: { x: 0, y: 8, z: 0 },
    },
    ice: {
      color: 0x88aaff,
      intensity: 0.4,
      position: { x: 20, y: 20, z: 20 },
    },
    moon: {
      color: 0x8888ff,
      intensity: 0.3,
      position: { x: -15, y: 25, z: -10 },
    },
  },

  // ===== ANIMATIONS =====
  animation: {
    cameraTransition: 1.5,
    islandHover: 0.3,
    panelSlide: 0.4,
    easing: 'power2.inOut',
  },

  // ===== PERFORMANCE =====
  performance: {
    maxParticles: 5000,
    lodDistance: 40,
    targetFps: 60,
  },
};

/**
 * Skills definitions
 */
export const SKILLS = {
  // Dev skills
  solana_basics: {
    id: 'solana_basics',
    name: 'Solana Basics',
    track: 'dev',
    icon: '⚡',
    difficulty: 1,
  },
  web3_js: { id: 'web3_js', name: 'Web3.js', track: 'dev', icon: '🔗', difficulty: 2 },
  anchor: { id: 'anchor', name: 'Anchor Framework', track: 'dev', icon: '⚓', difficulty: 3 },
  token_analysis: {
    id: 'token_analysis',
    name: 'Token Analysis',
    track: 'dev',
    icon: '📊',
    difficulty: 2,
  },
  smart_contracts: {
    id: 'smart_contracts',
    name: 'Smart Contracts',
    track: 'dev',
    icon: '📜',
    difficulty: 3,
  },
  api_integration: {
    id: 'api_integration',
    name: 'API Integration',
    track: 'dev',
    icon: '🔌',
    difficulty: 2,
  },
  data_viz: { id: 'data_viz', name: 'Data Visualization', track: 'dev', icon: '📈', difficulty: 2 },
  burn_mechanics: {
    id: 'burn_mechanics',
    name: 'Burn Mechanics',
    track: 'dev',
    icon: '🔥',
    difficulty: 3,
  },

  // Games skills
  game_design: {
    id: 'game_design',
    name: 'Game Design',
    track: 'games',
    icon: '🎲',
    difficulty: 2,
  },
  pixel_art: { id: 'pixel_art', name: 'Pixel Art', track: 'games', icon: '🎨', difficulty: 1 },
  game_economy: {
    id: 'game_economy',
    name: 'Game Economy',
    track: 'games',
    icon: '💰',
    difficulty: 3,
  },
  multiplayer: {
    id: 'multiplayer',
    name: 'Multiplayer',
    track: 'games',
    icon: '👥',
    difficulty: 3,
  },
  leaderboards: {
    id: 'leaderboards',
    name: 'Leaderboards',
    track: 'games',
    icon: '🏆',
    difficulty: 2,
  },

  // Content skills
  writing: {
    id: 'writing',
    name: 'Technical Writing',
    track: 'content',
    icon: '✍️',
    difficulty: 1,
  },
  philosophy: { id: 'philosophy', name: 'Philosophy', track: 'content', icon: '🧠', difficulty: 2 },
  teaching: { id: 'teaching', name: 'Teaching', track: 'content', icon: '📚', difficulty: 2 },
  storytelling: {
    id: 'storytelling',
    name: 'Storytelling',
    track: 'content',
    icon: '📖',
    difficulty: 2,
  },
  community: {
    id: 'community',
    name: 'Community Building',
    track: 'content',
    icon: '🤝',
    difficulty: 2,
  },
};

/**
 * Ecosystem projects (Stone Islands)
 * 21 projects distributed across 3 tracks on Yggdrasil branches
 */
export const ECOSYSTEM_PROJECTS = [
  // ===== DEV TRACK (11 projects) =====
  {
    id: 'burn-engine',
    name: 'Burn Engine',
    track: 'dev',
    status: 'live',
    description: 'Core burn protocol',
    url: null,
    kScore: 95,
    skills: ['solana_basics', 'smart_contracts', 'rust_basics', 'token_economics'],
  },
  {
    id: 'burns',
    name: 'Burns Tracker',
    track: 'dev',
    status: 'live',
    description: 'Real-time burn analytics',
    url: '/burns.html',
    kScore: 90,
    skills: ['solana_basics', 'data_viz', 'api_integration', 'websockets'],
  },
  {
    id: 'holdex',
    name: 'HolDex',
    track: 'dev',
    status: 'live',
    description: 'Trading terminal',
    url: '/holdex.html',
    kScore: 85,
    skills: ['solana_basics', 'web3_js', 'token_analysis', 'data_viz'],
  },
  {
    id: 'oracle',
    name: 'ASDF Oracle',
    track: 'dev',
    status: 'building',
    description: 'Price feeds & K-Metric',
    url: null,
    kScore: 80,
    skills: ['solana_basics', 'smart_contracts', 'data_feeds', 'api_integration'],
  },
  {
    id: 'forecast',
    name: 'ASDForecast',
    track: 'dev',
    status: 'live',
    description: 'Prediction markets',
    url: '/forecast.html',
    kScore: 72,
    skills: ['solana_basics', 'smart_contracts', 'game_economy'],
  },
  {
    id: 'token-launcher',
    name: 'Token Launcher',
    track: 'dev',
    status: 'live',
    description: 'Fair launch platform',
    url: null,
    kScore: 75,
    skills: ['solana_basics', 'smart_contracts', 'token_economics'],
  },
  {
    id: 'ignition',
    name: 'Ignition',
    track: 'dev',
    status: 'live',
    description: 'Launchpad & incubator',
    url: null,
    kScore: 70,
    skills: ['solana_basics', 'smart_contracts', 'token_economics'],
  },
  {
    id: 'rpc-monitor',
    name: 'RPC Monitor',
    track: 'dev',
    status: 'live',
    description: 'Infrastructure health',
    url: null,
    kScore: 65,
    skills: ['api_integration', 'monitoring', 'devops'],
  },
  {
    id: 'deploy-pipeline',
    name: 'Deploy Pipeline',
    track: 'dev',
    status: 'building',
    description: 'CI/CD automation',
    url: null,
    kScore: 60,
    skills: ['devops', 'automation', 'testing'],
  },
  {
    id: 'security-audit',
    name: 'Security Audit',
    track: 'dev',
    status: 'planned',
    description: 'Smart contract security',
    url: null,
    kScore: 55,
    skills: ['smart_contracts', 'security', 'rust_basics'],
  },
  {
    id: 'burn-tracker',
    name: 'Burn Tracker API',
    track: 'dev',
    status: 'live',
    description: 'Burn data backend',
    url: null,
    kScore: 78,
    skills: ['api_integration', 'databases', 'websockets'],
  },

  // ===== GAMES TRACK (4 projects) =====
  {
    id: 'pumparena',
    name: 'Pump Arena',
    track: 'games',
    status: 'building',
    description: 'Competitive trading game',
    url: null,
    kScore: 45,
    skills: ['game_design', 'game_economy', 'multiplayer', 'canvas_basics'],
  },
  {
    id: 'arcade',
    name: 'ASDF Arcade',
    track: 'games',
    status: 'live',
    description: 'Casual mini-games',
    url: '/games.html',
    kScore: 68,
    skills: ['game_design', 'canvas_basics', 'leaderboards'],
  },
  {
    id: 'games-platform',
    name: 'Games Hub',
    track: 'games',
    status: 'live',
    description: 'Gaming portal',
    url: '/games.html',
    kScore: 70,
    skills: ['game_design', 'ui_ux', 'wallet_integration'],
  },
  {
    id: 'learn-platform',
    name: 'Game Academy',
    track: 'games',
    status: 'live',
    description: 'Game dev tutorials',
    url: '/learn.html',
    kScore: 65,
    skills: ['game_design', 'teaching', 'canvas_basics'],
  },

  // ===== CONTENT TRACK (6 projects) =====
  {
    id: 'manifesto',
    name: 'Manifesto',
    track: 'content',
    status: 'live',
    description: 'ASDF philosophy',
    url: '/manifesto.html',
    kScore: 95,
    skills: ['writing', 'storytelling', 'philosophy'],
  },
  {
    id: 'factory',
    name: 'Builder Factory',
    track: 'content',
    status: 'live',
    description: 'Education hub',
    url: '/build.html',
    kScore: 82,
    skills: ['teaching', 'writing', 'curriculum_design'],
  },
  {
    id: 'learn',
    name: 'Learn Platform',
    track: 'content',
    status: 'live',
    description: 'Course platform',
    url: '/learn.html',
    kScore: 78,
    skills: ['teaching', 'writing', 'community'],
  },
  {
    id: 'community-hub',
    name: 'Community Hub',
    track: 'content',
    status: 'building',
    description: 'Builder community',
    url: null,
    kScore: 60,
    skills: ['community', 'moderation', 'events'],
  },
  {
    id: 'ambassador-program',
    name: 'Ambassadors',
    track: 'content',
    status: 'planned',
    description: 'Global outreach',
    url: null,
    kScore: 50,
    skills: ['community', 'marketing', 'events'],
  },
  {
    id: 'content-factory',
    name: 'Content Factory',
    track: 'content',
    status: 'planned',
    description: 'Meme & media creation',
    url: null,
    kScore: 45,
    skills: ['writing', 'design', 'marketing'],
  },
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
    description: 'Build tools and infrastructure',
  },
  games: {
    id: 'games',
    name: 'Games',
    color: 0x9944ff,
    icon: '🎮',
    description: 'Create engaging experiences',
  },
  content: {
    id: 'content',
    name: 'Content',
    color: 0x00d9ff,
    icon: '📚',
    description: 'Educate and inspire',
  },
};

export default CONFIG;
