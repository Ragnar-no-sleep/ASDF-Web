/**
 * Module Definitions
 * Learning modules with lessons for Learn & Build system
 *
 * @module learn-build/modules
 */

'use strict';

import { LESSON_TYPES } from '../module/index.js';

// ============================================
// DEVELOPER TRACK MODULES
// ============================================

export const DEV_MODULES = [
  {
    id: 'dev-fundamentals',
    track: 'dev',
    name: 'Web Dev Fundamentals',
    description: 'HTML, CSS, JavaScript essentials for blockchain development',
    icon: '\u{1F4BB}',
    duration: '1 week',
    difficulty: 'beginner',
    completionBonus: 200,
    prerequisites: [],
    lessons: [
      {
        id: 'lesson-html-basics',
        title: 'HTML Foundations',
        type: LESSON_TYPES.VIDEO,
        duration: '25 min',
        xp: 50,
        description: 'Learn the building blocks of web pages'
      },
      {
        id: 'lesson-css-styling',
        title: 'CSS Styling',
        type: LESSON_TYPES.VIDEO,
        duration: '28 min',
        xp: 50,
        description: 'Style your first web page'
      },
      {
        id: 'lesson-js-intro',
        title: 'JavaScript Introduction',
        type: LESSON_TYPES.VIDEO,
        duration: '40 min',
        xp: 75,
        description: 'Add interactivity to your pages'
      },
      {
        id: 'lesson-dom-manipulation',
        title: 'DOM Manipulation',
        type: LESSON_TYPES.ARTICLE,
        duration: '20 min',
        xp: 50,
        description: 'Interact with page elements using JavaScript'
      },
      {
        id: 'lesson-fundamentals-quiz',
        title: 'Fundamentals Quiz',
        type: LESSON_TYPES.QUIZ,
        duration: '15 min',
        xp: 100,
        description: 'Test your HTML, CSS, and JavaScript knowledge',
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
            text: 'How do you select an element by ID in JavaScript?',
            options: [
              'document.querySelector("#id")',
              'document.getElementById("id")',
              'document.getElement("id")',
              'Both A and B'
            ],
            correct: 3
          }
        ]
      }
    ]
  },
  {
    id: 'dev-solana-basics',
    track: 'dev',
    name: 'Solana Fundamentals',
    description: 'Understand how Solana works: accounts, transactions, programs',
    icon: '\u{26A1}',
    duration: '2 weeks',
    difficulty: 'intermediate',
    completionBonus: 300,
    prerequisites: ['dev-fundamentals'],
    lessons: [
      {
        id: 'lesson-solana-architecture',
        title: 'Solana Architecture',
        type: LESSON_TYPES.VIDEO,
        duration: '40 min',
        xp: 100,
        description: 'How Solana achieves high throughput'
      },
      {
        id: 'lesson-accounts-model',
        title: 'Accounts Model',
        type: LESSON_TYPES.VIDEO,
        duration: '35 min',
        xp: 100,
        description: 'Understanding Solana account structure'
      },
      {
        id: 'lesson-transactions',
        title: 'Transactions & Instructions',
        type: LESSON_TYPES.VIDEO,
        duration: '45 min',
        xp: 100,
        description: 'How transactions work on Solana'
      },
      {
        id: 'lesson-wallet-adapter',
        title: 'Wallet Adapter',
        type: LESSON_TYPES.ARTICLE,
        duration: '30 min',
        xp: 75,
        description: 'Connecting wallets to your dApp'
      },
      {
        id: 'lesson-connect-wallet-project',
        title: 'Connect Wallet Project',
        type: LESSON_TYPES.PROJECT,
        duration: '60 min',
        xp: 150,
        description: 'Build your first wallet connection',
        requirements: [
          'Create a new web page',
          'Add wallet adapter library',
          'Implement connect button',
          'Display connected wallet address'
        ]
      }
    ]
  },
  {
    id: 'dev-token-mastery',
    track: 'dev',
    name: 'Token Mastery',
    description: 'Create, manage, and burn SPL tokens with Token-2022',
    icon: '\u{1F4B0}',
    duration: '2 weeks',
    difficulty: 'intermediate',
    completionBonus: 400,
    prerequisites: ['dev-solana-basics'],
    lessons: [
      {
        id: 'lesson-spl-tokens',
        title: 'SPL Token Program',
        type: LESSON_TYPES.VIDEO,
        duration: '42 min',
        xp: 100,
        description: 'Understanding the Token Program'
      },
      {
        id: 'lesson-token-2022',
        title: 'Token-2022 Extensions',
        type: LESSON_TYPES.VIDEO,
        duration: '38 min',
        xp: 100,
        description: 'New features in Token-2022'
      },
      {
        id: 'lesson-metadata',
        title: 'Token Metadata',
        type: LESSON_TYPES.ARTICLE,
        duration: '25 min',
        xp: 75,
        description: 'Adding metadata to your tokens'
      },
      {
        id: 'lesson-create-token-project',
        title: 'Create Your Token',
        type: LESSON_TYPES.PROJECT,
        duration: '90 min',
        xp: 200,
        description: 'Deploy your first SPL token',
        requirements: [
          'Create a new token mint',
          'Set up metadata',
          'Mint tokens to your wallet',
          'Transfer tokens to another address'
        ]
      }
    ]
  }
];

// ============================================
// GAMING TRACK MODULES
// ============================================

export const GAMING_MODULES = [
  {
    id: 'gaming-fundamentals',
    track: 'gaming',
    name: 'Game Design Basics',
    description: 'Core principles of game design and player psychology',
    icon: '\u{1F3AE}',
    duration: '1 week',
    difficulty: 'beginner',
    completionBonus: 200,
    prerequisites: [],
    lessons: [
      {
        id: 'lesson-game-design-principles',
        title: 'Game Design Principles',
        type: LESSON_TYPES.VIDEO,
        duration: '28 min',
        xp: 50,
        description: 'Core game design concepts'
      },
      {
        id: 'lesson-player-psychology',
        title: 'Player Psychology',
        type: LESSON_TYPES.VIDEO,
        duration: '32 min',
        xp: 75,
        description: 'What motivates players'
      },
      {
        id: 'lesson-game-loops',
        title: 'Core Loops',
        type: LESSON_TYPES.ARTICLE,
        duration: '20 min',
        xp: 50,
        description: 'Designing engaging gameplay loops'
      },
      {
        id: 'lesson-game-design-quiz',
        title: 'Game Design Quiz',
        type: LESSON_TYPES.QUIZ,
        duration: '10 min',
        xp: 75,
        description: 'Test your game design knowledge',
        questions: [
          {
            id: 'q1',
            text: 'What is a "core loop" in game design?',
            options: [
              'The main menu screen',
              'The repeating cycle of primary gameplay',
              'A programming pattern',
              'The final boss fight'
            ],
            correct: 1
          },
          {
            id: 'q2',
            text: 'Which is NOT a type of player motivation?',
            options: ['Achievement', 'Exploration', 'Compilation', 'Socialization'],
            correct: 2
          }
        ]
      }
    ]
  },
  {
    id: 'gaming-canvas',
    track: 'gaming',
    name: 'Canvas Graphics',
    description: 'Build 2D games with HTML5 Canvas',
    icon: '\u{1F3A8}',
    duration: '2 weeks',
    difficulty: 'intermediate',
    completionBonus: 300,
    prerequisites: ['gaming-fundamentals'],
    lessons: [
      {
        id: 'lesson-canvas-intro',
        title: 'Canvas API Introduction',
        type: LESSON_TYPES.VIDEO,
        duration: '35 min',
        xp: 75,
        description: 'Drawing graphics with Canvas'
      },
      {
        id: 'lesson-game-loop',
        title: 'The Game Loop',
        type: LESSON_TYPES.VIDEO,
        duration: '40 min',
        xp: 100,
        description: 'Implementing a proper game loop'
      },
      {
        id: 'lesson-sprites',
        title: 'Sprites & Animation',
        type: LESSON_TYPES.VIDEO,
        duration: '45 min',
        xp: 100,
        description: 'Animating game characters'
      },
      {
        id: 'lesson-first-game-project',
        title: 'Build a Simple Game',
        type: LESSON_TYPES.PROJECT,
        duration: '120 min',
        xp: 200,
        description: 'Create your first browser game',
        requirements: [
          'Set up canvas and game loop',
          'Add player character',
          'Implement keyboard controls',
          'Add collision detection',
          'Display score'
        ]
      }
    ]
  }
];

// ============================================
// CONTENT TRACK MODULES
// ============================================

export const CONTENT_MODULES = [
  {
    id: 'content-fundamentals',
    track: 'content',
    name: 'Content Basics',
    description: 'Foundations of content creation for crypto',
    icon: '\u{1F4DD}',
    duration: '1 week',
    difficulty: 'beginner',
    completionBonus: 150,
    prerequisites: [],
    lessons: [
      {
        id: 'lesson-content-strategy',
        title: 'Content Strategy 101',
        type: LESSON_TYPES.VIDEO,
        duration: '22 min',
        xp: 50,
        description: 'Planning effective content'
      },
      {
        id: 'lesson-finding-voice',
        title: 'Finding Your Voice',
        type: LESSON_TYPES.VIDEO,
        duration: '20 min',
        xp: 50,
        description: 'Developing your unique style'
      },
      {
        id: 'lesson-audience',
        title: 'Understanding Your Audience',
        type: LESSON_TYPES.ARTICLE,
        duration: '15 min',
        xp: 50,
        description: 'Know who you\'re creating for'
      }
    ]
  },
  {
    id: 'content-storytelling',
    track: 'content',
    name: 'Storytelling',
    description: 'Craft compelling narratives for your project',
    icon: '\u{1F4D6}',
    duration: '2 weeks',
    difficulty: 'intermediate',
    completionBonus: 250,
    prerequisites: ['content-fundamentals'],
    lessons: [
      {
        id: 'lesson-crypto-narrative',
        title: 'Crypto Storytelling',
        type: LESSON_TYPES.VIDEO,
        duration: '30 min',
        xp: 75,
        description: 'Crafting compelling crypto narratives'
      },
      {
        id: 'lesson-thread-writing',
        title: 'Thread Writing',
        type: LESSON_TYPES.VIDEO,
        duration: '25 min',
        xp: 75,
        description: 'Writing viral Twitter threads'
      },
      {
        id: 'lesson-write-thread-project',
        title: 'Write Your First Thread',
        type: LESSON_TYPES.PROJECT,
        duration: '45 min',
        xp: 100,
        description: 'Create a viral-worthy Twitter thread',
        requirements: [
          'Choose a topic you\'re passionate about',
          'Write a 5-10 tweet thread',
          'Include hooks and CTAs',
          'Add relevant images or graphics'
        ]
      }
    ]
  },
  // Growth modules (merged into content track)
  {
    id: 'growth-fundamentals',
    track: 'content',
    name: 'Growth Fundamentals',
    description: 'Core concepts of product growth and user acquisition',
    icon: '\u{1F4C8}',
    duration: '1 week',
    difficulty: 'beginner',
    completionBonus: 200,
    prerequisites: ['content-fundamentals'],
    lessons: [
      {
        id: 'lesson-growth-mindset',
        title: 'Growth Mindset',
        type: LESSON_TYPES.VIDEO,
        duration: '28 min',
        xp: 75,
        description: 'Think like a growth hacker'
      },
      {
        id: 'lesson-metrics',
        title: 'Metrics That Matter',
        type: LESSON_TYPES.ARTICLE,
        duration: '20 min',
        xp: 50,
        description: 'Key metrics to track'
      }
    ]
  },
  {
    id: 'growth-community',
    track: 'content',
    name: 'Community Building',
    description: 'Build and engage crypto communities',
    icon: '\u{1F465}',
    duration: '2 weeks',
    difficulty: 'intermediate',
    completionBonus: 300,
    prerequisites: ['growth-fundamentals'],
    lessons: [
      {
        id: 'lesson-community-basics',
        title: 'Community Building Basics',
        type: LESSON_TYPES.VIDEO,
        duration: '35 min',
        xp: 100,
        description: 'Build and engage your community'
      },
      {
        id: 'lesson-discord-strategy',
        title: 'Discord Strategy',
        type: LESSON_TYPES.VIDEO,
        duration: '30 min',
        xp: 75,
        description: 'Running an effective Discord'
      },
      {
        id: 'lesson-community-playbook',
        title: 'Community Playbook',
        type: LESSON_TYPES.ARTICLE,
        duration: '25 min',
        xp: 50,
        description: 'Templates and best practices'
      }
    ]
  },
  {
    id: 'growth-viral-loops',
    track: 'content',
    name: 'Viral Mechanics',
    description: 'Design referral systems and viral loops',
    icon: '\u{1F525}',
    duration: '2 weeks',
    difficulty: 'intermediate',
    completionBonus: 300,
    prerequisites: ['growth-community'],
    lessons: [
      {
        id: 'lesson-viral-design',
        title: 'Viral Loop Design',
        type: LESSON_TYPES.VIDEO,
        duration: '38 min',
        xp: 100,
        description: 'Design content that spreads'
      },
      {
        id: 'lesson-case-studies',
        title: 'Viral Case Studies',
        type: LESSON_TYPES.ARTICLE,
        duration: '30 min',
        xp: 75,
        description: 'Learn from successful campaigns'
      }
    ]
  }
];

// ============================================
// ALL MODULES
// ============================================

export const ALL_MODULES = [
  ...DEV_MODULES,
  ...GAMING_MODULES,
  ...CONTENT_MODULES
];

export default ALL_MODULES;
