/**
 * Yggdrasil Cosmos - Mock Data
 * Extracted from yggdrasil-unified.js for modularity
 *
 * Mock/placeholder data for development and testing:
 * - Burn statistics
 * - Lesson content for learning tracks
 * - Contributor timelines for projects
 *
 * TODO: Replace with real API data in production
 */

'use strict';

/**
 * Mock burn statistics
 */
export const MOCK_BURN_STATS = {
  total: 847392145,
  daily: 12500000,
  apy: 12.5,
};

/**
 * Mock lesson content for learning modules
 * Organized by module ID with lessons array
 */
export const MOCK_LESSONS = {
  'solana-fundamentals': {
    title: 'Solana Fundamentals',
    description: 'Learn the core concepts of Solana blockchain development.',
    lessons: [
      {
        id: 'sf-1',
        title: 'Introduction to Solana',
        duration: '15 min',
        content:
          'Solana is a high-performance blockchain supporting up to 65,000 TPS. Learn about its unique architecture including Proof of History (PoH), Tower BFT consensus, and Gulf Stream transaction forwarding.',
      },
      {
        id: 'sf-2',
        title: 'Accounts & Programs',
        duration: '20 min',
        content:
          'Everything on Solana is an account. Programs are stateless and store data in separate accounts. Learn about the account model, rent, and program-derived addresses (PDAs).',
      },
      {
        id: 'sf-3',
        title: 'Transactions & Instructions',
        duration: '18 min',
        content:
          'Transactions contain instructions that call programs. Learn about signers, fee payers, and how to construct and send transactions.',
      },
      {
        id: 'sf-4',
        title: 'SPL Token Standard',
        duration: '22 min',
        content:
          'The Solana Program Library (SPL) Token is the standard for fungible and non-fungible tokens. Learn to mint, transfer, and manage tokens.',
      },
    ],
  },
  'anchor-framework': {
    title: 'Anchor Framework',
    description: 'Master the Anchor framework for Solana smart contract development.',
    lessons: [
      {
        id: 'af-1',
        title: 'Anchor Setup & Basics',
        duration: '20 min',
        content:
          'Anchor provides a Rust framework for writing Solana programs. Install Anchor CLI, create your first project, and understand the project structure.',
      },
      {
        id: 'af-2',
        title: 'Account Constraints',
        duration: '25 min',
        content:
          "Learn Anchor's declarative account validation: #[account], init, mut, has_one, seeds, and constraint attributes.",
      },
      {
        id: 'af-3',
        title: 'Error Handling & Events',
        duration: '18 min',
        content:
          'Define custom errors with #[error_code] and emit events for off-chain indexing using emit!() macro.',
      },
      {
        id: 'af-4',
        title: 'Testing with Anchor',
        duration: '22 min',
        content:
          "Write integration tests in TypeScript using Anchor's testing framework. Mock accounts, simulate transactions, and verify state changes.",
      },
    ],
  },
  'spl-tokens': {
    title: 'SPL Tokens',
    description: 'Deep dive into Solana token creation and management.',
    lessons: [
      {
        id: 'st-1',
        title: 'Token Mint & Accounts',
        duration: '18 min',
        content:
          'Learn to create token mints and associated token accounts using SPL Token program.',
      },
      {
        id: 'st-2',
        title: 'Transfer & Burn',
        duration: '15 min',
        content:
          'Execute token transfers and burns. Understand authority models and delegate permissions.',
      },
      {
        id: 'st-3',
        title: 'Metadata Standard',
        duration: '20 min',
        content:
          'Add metadata to tokens using Metaplex Token Metadata program for NFTs and enhanced fungibles.',
      },
    ],
  },
  'asdf-integration': {
    title: 'ASDF Integration',
    description: 'Integrate your project with the ASDF burn ecosystem.',
    lessons: [
      {
        id: 'ai-1',
        title: 'ASDF Protocol Overview',
        duration: '20 min',
        content: 'Understand the ASDF burn mechanics, token economics, and ecosystem incentives.',
      },
      {
        id: 'ai-2',
        title: 'Burn Engine Integration',
        duration: '25 min',
        content:
          'Integrate ASDF Burn Engine into your Solana program. Configure burn rates and track events.',
      },
      {
        id: 'ai-3',
        title: 'Frontend Integration',
        duration: '22 min',
        content:
          'Connect your dApp to ASDF services. Display burn stats, leaderboards, and user achievements.',
      },
    ],
  },
  'game-fundamentals': {
    title: 'Game Dev Fundamentals',
    description: 'Core concepts for building blockchain games.',
    lessons: [
      {
        id: 'gf-1',
        title: 'Game Loop Architecture',
        duration: '18 min',
        content:
          'Design efficient game loops for web-based games. Handle input, update state, and render consistently.',
      },
      {
        id: 'gf-2',
        title: 'State Management',
        duration: '20 min',
        content:
          'Manage complex game state. Use reducers, immutability patterns, and serialization.',
      },
      {
        id: 'gf-3',
        title: 'Blockchain Integration',
        duration: '22 min',
        content: 'Connect games to Solana. Store scores, NFT rewards, and on-chain leaderboards.',
      },
    ],
  },
  'asdf-game-engine': {
    title: 'ASDF Game Engine',
    description: 'Build games with the ASDF platform game engine.',
    lessons: [
      {
        id: 'age-1',
        title: 'Engine Overview',
        duration: '15 min',
        content:
          'Explore ASDF Game Engine features: physics, rendering, input handling, and blockchain hooks.',
      },
      {
        id: 'age-2',
        title: 'Creating Game Modes',
        duration: '20 min',
        content:
          'Implement practice and competitive modes. Handle session tracking and anti-cheat.',
      },
      {
        id: 'age-3',
        title: 'Rewards & Achievements',
        duration: '18 min',
        content: 'Integrate XP systems, unlockables, and NFT rewards. Track player progression.',
      },
    ],
  },
  'build-mini-game': {
    title: 'Build a Mini-Game',
    description: 'Hands-on project: build and deploy your own mini-game.',
    lessons: [
      {
        id: 'bmg-1',
        title: 'Game Design Document',
        duration: '20 min',
        content: 'Plan your game mechanics, art style, and blockchain integration points.',
      },
      {
        id: 'bmg-2',
        title: 'Implementation Sprint',
        duration: '45 min',
        content: 'Build your game using ASDF Engine. Implement core loop, scoring, and UI.',
      },
      {
        id: 'bmg-3',
        title: 'Testing & Deployment',
        duration: '25 min',
        content: 'Test gameplay balance, deploy to ASDF platform, and submit for review.',
      },
    ],
  },
  'content-creation': {
    title: 'Content Creation Basics',
    description: 'Learn to create engaging content for Web3 communities.',
    lessons: [
      {
        id: 'cc-1',
        title: 'Storytelling for Web3',
        duration: '18 min',
        content:
          'Craft narratives that resonate with crypto audiences. Balance technical depth with accessibility.',
      },
      {
        id: 'cc-2',
        title: 'Multi-Platform Strategy',
        duration: '20 min',
        content:
          'Adapt content for Twitter, Discord, YouTube, and blogs. Optimize for each platform.',
      },
      {
        id: 'cc-3',
        title: 'Community Engagement',
        duration: '15 min',
        content:
          'Build authentic relationships. Respond to feedback, moderate discussions, and foster growth.',
      },
    ],
  },
  'community-growth': {
    title: 'Community Growth',
    description: 'Strategies for growing and managing Web3 communities.',
    lessons: [
      {
        id: 'cg-1',
        title: 'Discord Server Setup',
        duration: '20 min',
        content: 'Configure channels, roles, and bots. Create welcoming onboarding flows.',
      },
      {
        id: 'cg-2',
        title: 'Event Planning',
        duration: '18 min',
        content:
          'Organize AMAs, contests, and community calls. Drive participation and excitement.',
      },
      {
        id: 'cg-3',
        title: 'Growth Metrics',
        duration: '15 min',
        content:
          'Track meaningful metrics: retention, engagement rate, and community health indicators.',
      },
    ],
  },
};

/**
 * Mock contributors data for project timelines
 * Organized by project ID with contributor arrays
 */
export const MOCK_CONTRIBUTORS = {
  'burn-engine': [
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Core Dev',
      commits: 127,
      additions: 4521,
      deletions: 892,
    },
    {
      name: 'zeyxx',
      avatar: '&#x1F525;',
      role: 'Smart Contracts',
      commits: 89,
      additions: 2340,
      deletions: 445,
    },
    {
      name: 'cryptobuilder',
      avatar: '&#x1F6E0;&#xFE0F;',
      role: 'Testing',
      commits: 45,
      additions: 1200,
      deletions: 320,
    },
  ],
  'burn-tracker': [
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Backend',
      commits: 67,
      additions: 2100,
      deletions: 340,
    },
    {
      name: 'webdev42',
      avatar: '&#x1F310;',
      role: 'Frontend',
      commits: 52,
      additions: 1800,
      deletions: 290,
    },
  ],
  'token-launcher': [
    {
      name: 'zeyxx',
      avatar: '&#x1F525;',
      role: 'Lead Dev',
      commits: 98,
      additions: 3200,
      deletions: 580,
    },
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Integration',
      commits: 34,
      additions: 920,
      deletions: 150,
    },
  ],
  'games-platform': [
    {
      name: 'gamedev_mike',
      avatar: '&#x1F3AE;',
      role: 'Game Engine',
      commits: 156,
      additions: 8200,
      deletions: 1450,
    },
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Backend',
      commits: 78,
      additions: 2800,
      deletions: 420,
    },
    {
      name: 'pixelartist',
      avatar: '&#x1F3A8;',
      role: 'Assets',
      commits: 23,
      additions: 450,
      deletions: 80,
    },
  ],
  'learn-platform': [
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Full Stack',
      commits: 142,
      additions: 5200,
      deletions: 890,
    },
    {
      name: 'educator_jen',
      avatar: '&#x1F4DA;',
      role: 'Content',
      commits: 67,
      additions: 2100,
      deletions: 340,
    },
  ],
  holdex: [
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Lead Dev',
      commits: 98,
      additions: 3600,
      deletions: 620,
    },
    {
      name: 'ui_designer',
      avatar: '&#x1F3A8;',
      role: 'UI/UX',
      commits: 34,
      additions: 890,
      deletions: 150,
    },
  ],
  forecast: [
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Backend',
      commits: 76,
      additions: 2800,
      deletions: 450,
    },
    {
      name: 'stats_wizard',
      avatar: '&#x1F4CA;',
      role: 'Analytics',
      commits: 45,
      additions: 1500,
      deletions: 280,
    },
  ],
  'token-factory': [
    {
      name: 'zeyxx',
      avatar: '&#x1F525;',
      role: 'Smart Contracts',
      commits: 112,
      additions: 4200,
      deletions: 710,
    },
    {
      name: 'sollama58',
      avatar: '&#x1F999;',
      role: 'Integration',
      commits: 45,
      additions: 1300,
      deletions: 220,
    },
  ],
};

// Browser global export for debugging
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.MOCK_BURN_STATS = MOCK_BURN_STATS;
  window.ASDF.MOCK_LESSONS = MOCK_LESSONS;
  window.ASDF.MOCK_CONTRIBUTORS = MOCK_CONTRIBUTORS;
}
