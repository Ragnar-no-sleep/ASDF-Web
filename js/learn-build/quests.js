/**
 * Quest Definitions
 * Sample quests for the Learn & Build system
 *
 * @module learn-build/quests
 */

'use strict';

// ============================================
// QUEST TYPES
// ============================================

export const QUEST_TYPES = {
  VIDEO: 'video',
  QUIZ: 'quiz',
  PROJECT: 'project',
  CHALLENGE: 'challenge'
};

// ============================================
// DEVELOPER TRACK QUESTS
// ============================================

export const DEV_QUESTS = [
  // Module: dev-fundamentals
  {
    id: 'quest-html-basics',
    name: 'HTML Foundations',
    description: 'Learn the building blocks of web pages',
    track: 'dev',
    module: 'dev-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 50,
    prerequisites: [],
    estimatedTime: 30,
    content: {
      videoUrl: '/content/dev/html-basics.mp4',
      duration: '25 min'
    }
  },
  {
    id: 'quest-css-styling',
    name: 'CSS Styling',
    description: 'Style your first web page',
    track: 'dev',
    module: 'dev-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 50,
    prerequisites: ['quest-html-basics'],
    estimatedTime: 30,
    content: {
      videoUrl: '/content/dev/css-styling.mp4',
      duration: '28 min'
    }
  },
  {
    id: 'quest-js-intro',
    name: 'JavaScript Introduction',
    description: 'Add interactivity to your pages',
    track: 'dev',
    module: 'dev-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 75,
    prerequisites: ['quest-css-styling'],
    estimatedTime: 45,
    content: {
      videoUrl: '/content/dev/js-intro.mp4',
      duration: '40 min'
    }
  },
  {
    id: 'quest-fundamentals-quiz',
    name: 'Web Fundamentals Quiz',
    description: 'Test your HTML, CSS, and JavaScript knowledge',
    track: 'dev',
    module: 'dev-fundamentals',
    type: QUEST_TYPES.QUIZ,
    xp: 100,
    prerequisites: ['quest-js-intro'],
    estimatedTime: 15,
    content: {
      questions: [
        {
          id: 'q1',
          text: 'What does HTML stand for?',
          options: [
            'Hyper Text Markup Language',
            'High Tech Modern Language',
            'Hyperlink Text Management Language',
            'Home Tool Markup Language'
          ],
          correct: 0
        },
        {
          id: 'q2',
          text: 'Which CSS property changes text color?',
          options: ['text-color', 'font-color', 'color', 'text-style'],
          correct: 2
        },
        {
          id: 'q3',
          text: 'How do you declare a variable in modern JavaScript?',
          options: ['var x = 1', 'let x = 1', 'const x = 1', 'Both B and C'],
          correct: 3
        }
      ]
    }
  },

  // Module: dev-solana-basics
  {
    id: 'quest-solana-architecture',
    name: 'Solana Architecture',
    description: 'Understand how Solana works under the hood',
    track: 'dev',
    module: 'dev-solana-basics',
    type: QUEST_TYPES.VIDEO,
    xp: 100,
    prerequisites: ['quest-fundamentals-quiz'],
    estimatedTime: 45,
    content: {
      videoUrl: '/content/dev/solana-architecture.mp4',
      duration: '40 min'
    }
  },
  {
    id: 'quest-accounts-model',
    name: 'Solana Accounts Model',
    description: 'Learn how data is stored on Solana',
    track: 'dev',
    module: 'dev-solana-basics',
    type: QUEST_TYPES.VIDEO,
    xp: 100,
    prerequisites: ['quest-solana-architecture'],
    estimatedTime: 40,
    content: {
      videoUrl: '/content/dev/accounts-model.mp4',
      duration: '35 min'
    }
  },
  {
    id: 'quest-connect-wallet',
    name: 'Connect a Wallet',
    description: 'Build your first wallet connection',
    track: 'dev',
    module: 'dev-solana-basics',
    type: QUEST_TYPES.PROJECT,
    xp: 150,
    prerequisites: ['quest-accounts-model'],
    estimatedTime: 60,
    content: {
      requirements: [
        'Create a new web page',
        'Add wallet adapter library',
        'Implement connect button',
        'Display connected wallet address'
      ]
    }
  },

  // Module: dev-token-mastery
  {
    id: 'quest-spl-tokens',
    name: 'SPL Token Program',
    description: 'Understand the Token Program',
    track: 'dev',
    module: 'dev-token-mastery',
    type: QUEST_TYPES.VIDEO,
    xp: 100,
    prerequisites: ['quest-connect-wallet'],
    estimatedTime: 45,
    content: {
      videoUrl: '/content/dev/spl-tokens.mp4',
      duration: '42 min'
    }
  },
  {
    id: 'quest-token-2022',
    name: 'Token-2022 Extensions',
    description: 'Learn about Token-2022 features',
    track: 'dev',
    module: 'dev-token-mastery',
    type: QUEST_TYPES.VIDEO,
    xp: 100,
    prerequisites: ['quest-spl-tokens'],
    estimatedTime: 40,
    content: {
      videoUrl: '/content/dev/token-2022.mp4',
      duration: '38 min'
    }
  },
  {
    id: 'quest-create-token',
    name: 'Create Your Token',
    description: 'Deploy your first SPL token',
    track: 'dev',
    module: 'dev-token-mastery',
    type: QUEST_TYPES.PROJECT,
    xp: 200,
    prerequisites: ['quest-token-2022'],
    estimatedTime: 90,
    content: {
      requirements: [
        'Create a new token mint',
        'Set up metadata',
        'Mint tokens to your wallet',
        'Transfer tokens to another address'
      ]
    }
  }
];

// ============================================
// GAMING TRACK QUESTS
// ============================================

export const GAMING_QUESTS = [
  // Module: gaming-fundamentals
  {
    id: 'quest-game-design-basics',
    name: 'Game Design Principles',
    description: 'Learn core game design concepts',
    track: 'gaming',
    module: 'gaming-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 50,
    prerequisites: [],
    estimatedTime: 30,
    content: {
      videoUrl: '/content/gaming/game-design-basics.mp4',
      duration: '28 min'
    }
  },
  {
    id: 'quest-player-psychology',
    name: 'Player Psychology',
    description: 'Understand what motivates players',
    track: 'gaming',
    module: 'gaming-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 75,
    prerequisites: ['quest-game-design-basics'],
    estimatedTime: 35,
    content: {
      videoUrl: '/content/gaming/player-psychology.mp4',
      duration: '32 min'
    }
  },

  // Module: gaming-canvas
  {
    id: 'quest-canvas-intro',
    name: 'Canvas API Introduction',
    description: 'Draw graphics with Canvas',
    track: 'gaming',
    module: 'gaming-canvas',
    type: QUEST_TYPES.VIDEO,
    xp: 75,
    prerequisites: ['quest-player-psychology'],
    estimatedTime: 40,
    content: {
      videoUrl: '/content/gaming/canvas-intro.mp4',
      duration: '35 min'
    }
  },
  {
    id: 'quest-game-loop',
    name: 'The Game Loop',
    description: 'Implement a proper game loop',
    track: 'gaming',
    module: 'gaming-canvas',
    type: QUEST_TYPES.VIDEO,
    xp: 100,
    prerequisites: ['quest-canvas-intro'],
    estimatedTime: 45,
    content: {
      videoUrl: '/content/gaming/game-loop.mp4',
      duration: '40 min'
    }
  },
  {
    id: 'quest-first-game',
    name: 'Build a Simple Game',
    description: 'Create your first browser game',
    track: 'gaming',
    module: 'gaming-canvas',
    type: QUEST_TYPES.PROJECT,
    xp: 200,
    prerequisites: ['quest-game-loop'],
    estimatedTime: 120,
    content: {
      requirements: [
        'Set up canvas and game loop',
        'Add player character',
        'Implement keyboard controls',
        'Add collision detection',
        'Display score'
      ]
    }
  }
];

// ============================================
// CONTENT TRACK QUESTS
// ============================================

export const CONTENT_QUESTS = [
  // Module: content-fundamentals
  {
    id: 'quest-content-strategy',
    name: 'Content Strategy 101',
    description: 'Learn to plan effective content',
    track: 'content',
    module: 'content-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 50,
    prerequisites: [],
    estimatedTime: 25,
    content: {
      videoUrl: '/content/creator/content-strategy.mp4',
      duration: '22 min'
    }
  },
  {
    id: 'quest-finding-voice',
    name: 'Finding Your Voice',
    description: 'Develop your unique content style',
    track: 'content',
    module: 'content-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 50,
    prerequisites: ['quest-content-strategy'],
    estimatedTime: 25,
    content: {
      videoUrl: '/content/creator/finding-voice.mp4',
      duration: '20 min'
    }
  },

  // Module: content-storytelling
  {
    id: 'quest-crypto-narrative',
    name: 'Crypto Storytelling',
    description: 'Craft compelling crypto narratives',
    track: 'content',
    module: 'content-storytelling',
    type: QUEST_TYPES.VIDEO,
    xp: 75,
    prerequisites: ['quest-finding-voice'],
    estimatedTime: 35,
    content: {
      videoUrl: '/content/creator/crypto-narrative.mp4',
      duration: '30 min'
    }
  },
  {
    id: 'quest-write-thread',
    name: 'Write Your First Thread',
    description: 'Create a viral-worthy Twitter thread',
    track: 'content',
    module: 'content-storytelling',
    type: QUEST_TYPES.PROJECT,
    xp: 100,
    prerequisites: ['quest-crypto-narrative'],
    estimatedTime: 45,
    content: {
      requirements: [
        'Choose a topic you\'re passionate about',
        'Write a 5-10 tweet thread',
        'Include hooks and CTAs',
        'Add relevant images or graphics'
      ]
    }
  },

  // Growth modules (merged into content)
  {
    id: 'quest-growth-mindset',
    name: 'Growth Mindset',
    description: 'Think like a growth hacker',
    track: 'content',
    module: 'growth-fundamentals',
    type: QUEST_TYPES.VIDEO,
    xp: 75,
    prerequisites: ['quest-finding-voice'],
    estimatedTime: 30,
    content: {
      videoUrl: '/content/growth/growth-mindset.mp4',
      duration: '28 min'
    }
  },
  {
    id: 'quest-community-building',
    name: 'Community Building Basics',
    description: 'Build and engage your community',
    track: 'content',
    module: 'growth-community',
    type: QUEST_TYPES.VIDEO,
    xp: 100,
    prerequisites: ['quest-growth-mindset'],
    estimatedTime: 40,
    content: {
      videoUrl: '/content/growth/community-building.mp4',
      duration: '35 min'
    }
  },
  {
    id: 'quest-viral-mechanics',
    name: 'Viral Mechanics',
    description: 'Design content that spreads',
    track: 'content',
    module: 'growth-viral-loops',
    type: QUEST_TYPES.VIDEO,
    xp: 100,
    prerequisites: ['quest-community-building'],
    estimatedTime: 40,
    content: {
      videoUrl: '/content/growth/viral-mechanics.mp4',
      duration: '38 min'
    }
  }
];

// ============================================
// ALL QUESTS
// ============================================

export const ALL_QUESTS = [
  ...DEV_QUESTS,
  ...GAMING_QUESTS,
  ...CONTENT_QUESTS
];

export default ALL_QUESTS;
