/**
 * Yggdrasil Cosmos - Full Screen Immersive Controller
 * No columns, no scroll - pure 3D experience with sliding panel overlays
 */

'use strict';

import { Dashboard, TRACKS, ECOSYSTEM_PROJECTS } from '../dashboard/index.js';
import { getCourse } from './data/courses.js';
import { SKILLS_DATA, getSkill } from './data/skills.js';
import { ProgressTracker, GENERALIST_TRACKS } from './progress-tracker.js';

/**
 * Promise with timeout wrapper
 */
function withTimeout(promise, ms, message = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

/**
 * Full Screen Cosmos Controller
 */
const YggdrasilCosmos = {
  // Core
  container: null,
  dashboard: null,

  // UI Elements
  loadingEl: null,
  leftPanel: null,
  rightPanel: null,
  burnHud: null,
  ctaHint: null,
  projectModal: null,
  skillModal: null,
  componentModal: null,
  filterLegend: null,

  // Data
  projectsData: null,
  skillsData: SKILLS_DATA,

  // State
  initialized: false,
  leftPanelOpen: false,
  rightPanelOpen: false,
  projectModalOpen: false,
  skillModalOpen: false,
  componentModalOpen: false,

  // Filter state
  filters: {
    tracks: { dev: true, games: true, content: true },
    status: { live: true, building: true, planned: true },
  },
  quizState: {
    currentQuestion: 0,
    answers: [],
    completed: false,
    result: null,
  },
  profileExpanded: false,

  // Quiz questions (from config)
  quizQuestions: [
    {
      id: 'q1',
      text: 'What excites you most?',
      options: [
        { track: 'dev', text: 'Building systems that scale', icon: '🔧' },
        { track: 'games', text: 'Creating immersive experiences', icon: '🎮' },
        { track: 'content', text: 'Growing communities & stories', icon: '📈' },
      ],
    },
    {
      id: 'q2',
      text: 'Your ideal Friday night?',
      options: [
        { track: 'dev', text: 'Debugging a tricky issue', icon: '🐛' },
        { track: 'games', text: 'Playtesting new mechanics', icon: '🎲' },
        { track: 'content', text: 'Editing content & metrics', icon: '🎥' },
      ],
    },
    {
      id: 'q3',
      text: 'Pick your superpower',
      options: [
        { track: 'dev', text: 'Read any codebase instantly', icon: '⚡' },
        { track: 'games', text: 'Design perfect game loops', icon: '🔄' },
        { track: 'content', text: 'Predict viral content', icon: '🔮' },
      ],
    },
  ],

  // Track data (from formations.json)
  tracksData: {
    dev: {
      id: 'dev',
      name: 'Developer Track',
      icon: '💻',
      color: '#9945FF',
      duration: '12 weeks',
      modules: [
        { id: 'solana-fundamentals', title: 'Solana Fundamentals', lessons: 4, xp: 500 },
        { id: 'anchor-framework', title: 'Anchor Framework', lessons: 4, xp: 800 },
        { id: 'spl-tokens', title: 'SPL Tokens', lessons: 3, xp: 600 },
        { id: 'asdf-integration', title: 'ASDF Integration', lessons: 3, xp: 1000 },
      ],
    },
    games: {
      id: 'games',
      name: 'Games Track',
      icon: '🎮',
      color: '#F97316',
      duration: '10 weeks',
      modules: [
        { id: 'game-fundamentals', title: 'Game Dev Fundamentals', lessons: 3, xp: 400 },
        { id: 'asdf-game-engine', title: 'ASDF Game Engine', lessons: 3, xp: 600 },
        { id: 'build-mini-game', title: 'Build a Mini-Game', lessons: 3, xp: 1000 },
      ],
    },
    content: {
      id: 'content',
      name: 'Content Creator',
      icon: '🎨',
      color: '#10B981',
      duration: '8 weeks',
      modules: [
        { id: 'content-fundamentals', title: 'Content Fundamentals', lessons: 3, xp: 300 },
        { id: 'technical-writing', title: 'Technical Writing', lessons: 3, xp: 500 },
        { id: 'community-growth', title: 'Community & Growth', lessons: 3, xp: 400 },
      ],
    },
  },

  // User progress (from localStorage)
  userProgress: {
    dev: 0,
    games: 0,
    content: 0,
  },

  // Builder profile
  profile: {
    name: 'Builder',
    wallet: null,
    xp: 0,
    level: 1,
    burned: 0,
    streak: 0,
    badges: [],
    questsCompleted: 0,
    modulesCompleted: 0,
    projectsContributed: 0,
    prsMerged: 0,
    memberSince: null,
  },

  mockBurnStats: {
    total: 847392145,
    daily: 12500000,
    apy: 12.5,
  },

  // Mock lesson content for modules
  mockLessons: {
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
          id: 'spl-1',
          title: 'Creating Token Mints',
          duration: '18 min',
          content:
            'Learn to create token mints with configurable decimals, freeze authority, and mint authority.',
        },
        {
          id: 'spl-2',
          title: 'Token Accounts & ATAs',
          duration: '20 min',
          content:
            'Understand token accounts, Associated Token Accounts (ATAs), and the getOrCreateAssociatedTokenAccount pattern.',
        },
        {
          id: 'spl-3',
          title: 'Token Metadata',
          duration: '15 min',
          content:
            'Add rich metadata to tokens using Metaplex Token Metadata standard: name, symbol, image, and attributes.',
        },
      ],
    },
    'asdf-integration': {
      title: 'ASDF Integration',
      description: 'Integrate with the ASDF ecosystem and burn mechanism.',
      lessons: [
        {
          id: 'asdf-1',
          title: 'Burn Engine Overview',
          duration: '20 min',
          content:
            'Understand the ASDF burn mechanism: automatic burns on transfers, configurable rates, and CPI calls.',
        },
        {
          id: 'asdf-2',
          title: 'Integrating Burns',
          duration: '25 min',
          content:
            'Add burn functionality to your programs using cross-program invocations (CPI) to the Burn Engine.',
        },
        {
          id: 'asdf-3',
          title: 'K-Metric & Oracle',
          duration: '18 min',
          content:
            'Use the ASDF Oracle to fetch ecosystem health metrics and K-Scores in your applications.',
        },
      ],
    },
    'game-fundamentals': {
      title: 'Game Dev Fundamentals',
      description: 'Learn the basics of browser-based game development.',
      lessons: [
        {
          id: 'gf-1',
          title: 'Canvas API Basics',
          duration: '20 min',
          content:
            'The HTML5 Canvas API is the foundation of 2D browser games. Learn rendering, animation loops, and sprite management.',
        },
        {
          id: 'gf-2',
          title: 'Game Loop Pattern',
          duration: '15 min',
          content:
            'Implement a fixed timestep game loop with update() and render() methods for consistent physics.',
        },
        {
          id: 'gf-3',
          title: 'Input Handling',
          duration: '18 min',
          content:
            'Handle keyboard, mouse, and touch input with event normalization for cross-platform compatibility.',
        },
      ],
    },
    'asdf-game-engine': {
      title: 'ASDF Game Engine',
      description: 'Build games with the ASDF game engine.',
      lessons: [
        {
          id: 'age-1',
          title: 'Engine Architecture',
          duration: '22 min',
          content:
            'Understand the component-based architecture of the ASDF game engine: entities, components, and systems.',
        },
        {
          id: 'age-2',
          title: 'Wallet Integration',
          duration: '20 min',
          content: 'Connect wallets to games for player identity and on-chain rewards.',
        },
        {
          id: 'age-3',
          title: 'Leaderboard System',
          duration: '18 min',
          content:
            'Implement server-verified scores and anti-cheat measures for competitive integrity.',
        },
      ],
    },
    'build-mini-game': {
      title: 'Build a Mini-Game',
      description: 'Create a complete mini-game from scratch.',
      lessons: [
        {
          id: 'bmg-1',
          title: 'Game Design Document',
          duration: '15 min',
          content: 'Plan your game: mechanics, art style, progression, and technical requirements.',
        },
        {
          id: 'bmg-2',
          title: 'Core Gameplay',
          duration: '45 min',
          content: 'Implement the main game loop, player controls, and core mechanics.',
        },
        {
          id: 'bmg-3',
          title: 'Polish & Submission',
          duration: '30 min',
          content: 'Add juice (particles, sounds, screen shake), test, and submit for review.',
        },
      ],
    },
    'content-fundamentals': {
      title: 'Content Fundamentals',
      description: 'Learn the basics of creating engaging content.',
      lessons: [
        {
          id: 'cf-1',
          title: 'Understanding Your Audience',
          duration: '15 min',
          content:
            'Identify your target audience, their pain points, and what content resonates with them.',
        },
        {
          id: 'cf-2',
          title: 'Content Formats',
          duration: '18 min',
          content:
            'Explore different content formats: threads, tutorials, videos, memes, and infographics.',
        },
        {
          id: 'cf-3',
          title: 'Platform Optimization',
          duration: '12 min',
          content: 'Optimize content for Twitter, Discord, YouTube, and other platforms.',
        },
      ],
    },
    'technical-writing': {
      title: 'Technical Writing',
      description: 'Write clear documentation and tutorials.',
      lessons: [
        {
          id: 'tw-1',
          title: 'Documentation Structure',
          duration: '20 min',
          content:
            'Organize documentation: quickstart, concepts, tutorials, API reference, and troubleshooting.',
        },
        {
          id: 'tw-2',
          title: 'Writing for Developers',
          duration: '18 min',
          content: 'Write concise, accurate technical content with code examples and diagrams.',
        },
        {
          id: 'tw-3',
          title: 'Maintenance & Updates',
          duration: '15 min',
          content:
            'Keep documentation up-to-date with version control and contribution guidelines.',
        },
      ],
    },
    'community-growth': {
      title: 'Community & Growth',
      description: 'Build and grow engaged communities.',
      lessons: [
        {
          id: 'cg-1',
          title: 'Community Building',
          duration: '20 min',
          content: 'Create welcoming spaces, establish culture, and foster meaningful connections.',
        },
        {
          id: 'cg-2',
          title: 'Engagement Tactics',
          duration: '18 min',
          content: 'Drive engagement through events, challenges, AMAs, and collaborative projects.',
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
  },

  // Lesson modal state
  lessonModal: null,
  currentModule: null,
  currentLessonIndex: 0,

  // Mock contributors data (L2b Project Timeline)
  mockContributors: {
    'burn-engine': [
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Core Dev',
        commits: 127,
        additions: 4521,
        deletions: 892,
      },
      {
        name: 'zeyxx',
        avatar: '🔥',
        role: 'Smart Contracts',
        commits: 89,
        additions: 2340,
        deletions: 445,
      },
      {
        name: 'cryptobuilder',
        avatar: '🛠️',
        role: 'Testing',
        commits: 45,
        additions: 1200,
        deletions: 320,
      },
    ],
    'burn-tracker': [
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Backend',
        commits: 67,
        additions: 2100,
        deletions: 340,
      },
      {
        name: 'webdev42',
        avatar: '🌐',
        role: 'Frontend',
        commits: 52,
        additions: 1800,
        deletions: 290,
      },
    ],
    'token-launcher': [
      {
        name: 'zeyxx',
        avatar: '🔥',
        role: 'Lead Dev',
        commits: 98,
        additions: 3200,
        deletions: 580,
      },
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Integration',
        commits: 34,
        additions: 920,
        deletions: 150,
      },
    ],
    'games-platform': [
      {
        name: 'gamedev_mike',
        avatar: '🎮',
        role: 'Game Engine',
        commits: 156,
        additions: 8200,
        deletions: 1450,
      },
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Backend',
        commits: 78,
        additions: 2800,
        deletions: 420,
      },
      {
        name: 'pixelartist',
        avatar: '🎨',
        role: 'Assets',
        commits: 23,
        additions: 450,
        deletions: 80,
      },
    ],
    'learn-platform': [
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Content',
        commits: 89,
        additions: 5600,
        deletions: 890,
      },
      {
        name: 'techwriter',
        avatar: '📝',
        role: 'Documentation',
        commits: 45,
        additions: 2300,
        deletions: 340,
      },
    ],
    holdex: [
      {
        name: 'tradingpro',
        avatar: '📈',
        role: 'Trading Logic',
        commits: 112,
        additions: 4100,
        deletions: 670,
      },
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Integration',
        commits: 56,
        additions: 1900,
        deletions: 290,
      },
    ],
    forecast: [
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Contracts',
        commits: 78,
        additions: 2900,
        deletions: 410,
      },
      {
        name: 'oracledev',
        avatar: '🔮',
        role: 'Oracle',
        commits: 34,
        additions: 1200,
        deletions: 180,
      },
    ],
    oracle: [
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Lead Dev',
        commits: 145,
        additions: 5200,
        deletions: 890,
      },
      {
        name: 'dataengineer',
        avatar: '📊',
        role: 'Data Pipeline',
        commits: 67,
        additions: 2400,
        deletions: 350,
      },
    ],
    ignition: [
      {
        name: 'zeyxx',
        avatar: '🔥',
        role: 'Lead Dev',
        commits: 134,
        additions: 4800,
        deletions: 720,
      },
      {
        name: 'sollama58',
        avatar: '🦙',
        role: 'Contracts',
        commits: 56,
        additions: 1800,
        deletions: 290,
      },
    ],
  },

  /**
   * Initialize cosmos
   */
  async init(containerSelector) {
    this.container =
      typeof containerSelector === 'string'
        ? document.querySelector(containerSelector)
        : containerSelector;

    if (!this.container) {
      console.error('[YggdrasilCosmos] Container not found');
      return false;
    }

    // Load saved state from localStorage
    this.loadSavedState();

    // Initialize progress tracker
    ProgressTracker.init();
    this.setupProgressListeners();

    // Load projects data
    await this.loadProjectsData();

    // Show loading
    this.showLoading();

    // Build UI overlays
    this.buildPanelToggles();
    this.buildLeftPanel();
    this.buildRightPanel();
    this.buildBurnHud();
    this.buildFilterLegend();
    this.buildProjectModal();
    this.buildSkillModal();
    this.buildLessonModal();
    this.buildComponentModal();

    try {
      // Initialize Three.js dashboard with 5s timeout
      this.dashboard = await withTimeout(
        Dashboard.init(this.container),
        5000,
        'Three.js initialization timed out'
      );

      // Setup cosmos event callbacks
      this.setupCosmosCallbacks();

      // Hide loading
      this.hideLoading();

      // Show CTA hint
      this.showCTAHint();

      this.initialized = true;

      // Emit ready
      window.dispatchEvent(
        new CustomEvent('cosmos:ready', {
          detail: { cosmos: this },
        })
      );

      return true;
    } catch (error) {
      console.error('[YggdrasilCosmos] Init failed:', error);
      this.showError(error);
      return false;
    }
  },

  /**
   * Load projects data from JSON
   */
  async loadProjectsData() {
    try {
      const response = await fetch('./js/build/data/projects.json');
      this.projectsData = await response.json();
    } catch (e) {
      console.warn('[YggdrasilCosmos] Failed to load projects data:', e);
      this.projectsData = {};
    }
  },

  /**
   * Setup cosmos event callbacks for island/skill clicks
   */
  setupCosmosCallbacks() {
    if (!this.dashboard?.cosmos) return;

    // Island (project) click -> open project modal
    this.dashboard.cosmos.on('islandClick', project => {
      this.openProjectModal(project.id);
    });

    // Skill click -> open skill detail modal
    this.dashboard.cosmos.on('skillClick', skill => {
      this.openSkillModal(skill.id);
    });
  },

  /**
   * Build project detail modal
   */
  buildProjectModal() {
    this.projectModal = document.createElement('div');
    this.projectModal.className = 'ygg-project-modal';
    this.projectModal.innerHTML = `
            <div class="ygg-modal-backdrop"></div>
            <div class="ygg-modal-content">
                <button class="ygg-modal-close">&times;</button>
                <div class="ygg-modal-body"></div>
            </div>
        `;
    document.body.appendChild(this.projectModal);

    // Close events
    this.projectModal
      .querySelector('.ygg-modal-backdrop')
      .addEventListener('click', () => this.closeProjectModal());
    this.projectModal
      .querySelector('.ygg-modal-close')
      .addEventListener('click', () => this.closeProjectModal());

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.projectModalOpen) {
        this.closeProjectModal();
      }
    });
  },

  /**
   * Map ECOSYSTEM_PROJECTS IDs to projects.json IDs
   */
  mapProjectId(ecosystemId) {
    // Direct mapping - all 21 projects use matching IDs in projects.json
    const mapping = {
      // Dev track (11)
      'burn-engine': 'burn-engine',
      burns: 'burns',
      holdex: 'holdex',
      oracle: 'oracle',
      forecast: 'forecast',
      'token-launcher': 'token-launcher',
      ignition: 'ignition',
      'rpc-monitor': 'rpc-monitor',
      'deploy-pipeline': 'deploy-pipeline',
      'security-audit': 'security-audit',
      'burn-tracker': 'burn-tracker',
      // Games track (4)
      pumparena: 'pumparena',
      arcade: 'arcade',
      'games-platform': 'games-platform',
      'learn-platform': 'learn-platform',
      // Content track (6)
      manifesto: 'manifesto',
      factory: 'factory',
      learn: 'learn',
      'community-hub': 'community-hub',
      'ambassador-program': 'ambassador-program',
      'content-factory': 'content-factory',
    };
    return mapping[ecosystemId] || ecosystemId;
  },

  /**
   * Open project modal with details
   */
  openProjectModal(projectId, highlightSkillId = null) {
    const mappedId = this.mapProjectId(projectId);
    const project = this.projectsData[mappedId];
    const ecosystemProject = ECOSYSTEM_PROJECTS.find(p => p.id === projectId);

    if (!project) {
      // Fallback to ECOSYSTEM_PROJECTS basic data
      if (!ecosystemProject) return;

      this.projectModal.querySelector('.ygg-modal-body').innerHTML = `
                <div class="ygg-project-header">
                    <span class="ygg-project-icon">${ecosystemProject.name.charAt(0)}</span>
                    <div class="ygg-project-title-group">
                        <h2>${ecosystemProject.name}</h2>
                        <span class="ygg-project-track track-${ecosystemProject.track}">${ecosystemProject.track}</span>
                    </div>
                </div>
                <p class="ygg-project-description">${ecosystemProject.description}</p>
                <div class="ygg-project-status">
                    <span class="status-badge status-${ecosystemProject.status}">${ecosystemProject.status}</span>
                    <span class="kscore-badge">K-Score: ${ecosystemProject.kScore}</span>
                </div>
            `;
    } else {
      // Tech tags
      const techHtml = project.tech?.map(t => `<span class="tech-tag">${t}</span>`).join('') || '';

      // Components (miniTree) - clickable with details
      const componentsHtml =
        project.miniTree
          ?.map(
            (item, idx) => `
                <div class="ygg-component-card" data-component-idx="${idx}" data-project-id="${mappedId}" data-component-name="${item.name}">
                    <div class="ygg-component-header">
                        <span class="component-icon">${item.icon}</span>
                        <span class="component-name">${item.name}</span>
                        <span class="component-status status-${item.status}">${item.status}</span>
                    </div>
                    <div class="ygg-component-preview">${item.what || ''}</div>
                    <div class="ygg-component-details" style="display: none;">
                        <div class="component-detail-row">
                            <span class="detail-label">What</span>
                            <p>${item.what || 'N/A'}</p>
                        </div>
                        <div class="component-detail-row">
                            <span class="detail-label">How</span>
                            <p>${item.how || 'N/A'}</p>
                        </div>
                        <div class="component-detail-row">
                            <span class="detail-label">Why</span>
                            <p>${item.why || 'N/A'}</p>
                        </div>
                        ${
                          item.future
                            ? `
                        <div class="component-detail-row">
                            <span class="detail-label">Future</span>
                            <p>${item.future}</p>
                        </div>
                        `
                            : ''
                        }
                    </div>
                </div>
            `
          )
          .join('') || '';

      // Contributors from projects.json
      const contributors = project.contributors || [];
      const contributorsHtml =
        contributors
          .map(
            c => `
                <a href="https://github.com/${c.github}" target="_blank" rel="noopener" class="ygg-builder-card">
                    <img src="${c.avatar}" alt="${c.name}" class="builder-avatar" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2240%22 fill=%22%23fff%22>${c.name.charAt(0)}</text></svg>'">
                    <div class="builder-info">
                        <span class="builder-name">${c.name}</span>
                        <span class="builder-role">${c.role}</span>
                    </div>
                    <span class="builder-github">@${c.github}</span>
                </a>
            `
          )
          .join('') || '<p class="no-contributors">No contributors listed</p>';

      // Skills associated with this project (from ecosystem)
      const projectSkills = ecosystemProject?.skills || [];
      const skillsPreviewHtml = projectSkills
        .slice(0, 4)
        .map(skillId => {
          const skill = getSkill(skillId);
          return skill
            ? `<span class="skill-preview-tag">${skill.icon || '📚'} ${skill.name}</span>`
            : '';
        })
        .join('');

      this.projectModal.querySelector('.ygg-modal-body').innerHTML = `
                <div class="ygg-project-header">
                    <span class="ygg-project-icon">${project.icon}</span>
                    <div class="ygg-project-title-group">
                        <h2>${project.title}</h2>
                        <span class="ygg-project-track track-${project.category}">${project.category}</span>
                    </div>
                    <span class="status-badge status-${project.status}">${project.status}</span>
                </div>

                <p class="ygg-project-overview">${project.overview}</p>

                <div class="ygg-project-tech">
                    ${techHtml}
                </div>

                ${
                  project.miniTree?.length
                    ? `
                <section class="ygg-project-section">
                    <h3>🧩 Components</h3>
                    <p class="section-hint">Click a component for details</p>
                    <div class="ygg-components-grid">
                        ${componentsHtml}
                    </div>
                </section>
                `
                    : ''
                }

                ${
                  contributors.length
                    ? `
                <section class="ygg-project-section">
                    <h3>👥 Builders</h3>
                    <div class="ygg-builders-grid">
                        ${contributorsHtml}
                    </div>
                </section>
                `
                    : ''
                }

                <section class="ygg-project-section ygg-deeplearn-section">
                    <h3>🎓 Deep Learn</h3>
                    <p class="deeplearn-desc">Master this project from A to Z with a specialized learning track.</p>
                    ${skillsPreviewHtml ? `<div class="deeplearn-skills-preview">${skillsPreviewHtml}</div>` : ''}
                    <button class="ygg-btn ygg-btn-deeplearn" data-project="${mappedId}">
                        <span class="deeplearn-icon">🚀</span>
                        Start Learning Track
                    </button>
                </section>

                <div class="ygg-project-actions">
                    ${project.demo ? `<a href="${project.demo}" target="_blank" class="ygg-btn ygg-btn-primary">View Demo</a>` : ''}
                    ${project.github ? `<a href="${project.github}" target="_blank" class="ygg-btn ygg-btn-secondary">GitHub</a>` : ''}
                </div>
            `;

      // Bind component click events
      this.projectModal.querySelectorAll('.ygg-component-card').forEach(card => {
        card.addEventListener('click', () => {
          const details = card.querySelector('.ygg-component-details');
          const isOpen = card.classList.contains('expanded');

          // Close all other cards
          this.projectModal.querySelectorAll('.ygg-component-card.expanded').forEach(c => {
            c.classList.remove('expanded');
            c.querySelector('.ygg-component-details').style.display = 'none';
          });

          if (!isOpen) {
            card.classList.add('expanded');
            details.style.display = 'block';

            // Track specialized progress - component explored
            const projectId = card.dataset.projectId;
            const componentName = card.dataset.componentName;
            if (projectId && componentName) {
              ProgressTracker.completeProjectComponent(projectId, componentName);
              this.refreshProfilePanel();
            }
          }
        });
      });

      // Bind deep learn button
      const deepLearnBtn = this.projectModal.querySelector('.ygg-btn-deeplearn');
      if (deepLearnBtn) {
        deepLearnBtn.addEventListener('click', () => {
          this.startProjectLearningTrack(mappedId, projectSkills);
        });
      }
    }

    this.projectModal.classList.add('open');
    this.projectModalOpen = true;

    // Track project exploration
    ProgressTracker.exploreProject(projectId);
    this.refreshProfilePanel();
  },

  /**
   * Start a project-specific learning track
   */
  startProjectLearningTrack(projectId, skillIds) {
    this.closeProjectModal();

    // If skills are available, open the first skill
    if (skillIds && skillIds.length > 0) {
      const firstSkill = skillIds[0];
      setTimeout(() => {
        this.openSkillModal(firstSkill);
      }, 300);
    } else {
      // Fallback: open the module related to this project
      const projectToCourse = {
        // Dev track → Solana courses
        'burn-engine': 'solana-fundamentals',
        burns: 'solana-fundamentals',
        holdex: 'asdf-integration',
        oracle: 'solana-fundamentals',
        forecast: 'asdf-integration',
        'token-launcher': 'spl-tokens',
        ignition: 'spl-tokens',
        'rpc-monitor': 'asdf-integration',
        'deploy-pipeline': 'anchor-framework',
        'security-audit': 'anchor-framework',
        'burn-tracker': 'asdf-integration',
        // Games track → Game design courses
        pumparena: 'asdf-game-engine',
        arcade: 'game-fundamentals',
        'games-platform': 'game-fundamentals',
        'learn-platform': 'build-mini-game',
        // Content track → Content courses
        manifesto: 'technical-writing',
        factory: 'content-fundamentals',
        learn: 'content-fundamentals',
        'community-hub': 'community-growth',
        'ambassador-program': 'community-growth',
        'content-factory': 'technical-writing',
      };
      const courseId = projectToCourse[projectId];
      if (courseId) {
        setTimeout(() => {
          this.openModule(courseId);
        }, 300);
      }
    }
  },

  /**
   * Close project modal
   */
  closeProjectModal() {
    this.projectModal.classList.remove('open');
    this.projectModalOpen = false;
  },

  /**
   * Build skill detail modal
   */
  buildSkillModal() {
    this.skillModal = document.createElement('div');
    this.skillModal.className = 'ygg-skill-modal';
    this.skillModal.innerHTML = `
      <div class="ygg-modal-backdrop"></div>
      <div class="ygg-modal-content">
        <button class="ygg-modal-close">&times;</button>
        <div class="ygg-modal-body"></div>
      </div>
    `;
    document.body.appendChild(this.skillModal);

    // Close events
    this.skillModal
      .querySelector('.ygg-modal-backdrop')
      .addEventListener('click', () => this.closeSkillModal());
    this.skillModal
      .querySelector('.ygg-modal-close')
      .addEventListener('click', () => this.closeSkillModal());
  },

  /**
   * Open skill modal with detailed content
   */
  openSkillModal(skillId) {
    const skill = getSkill(skillId);
    if (!skill) {
      console.warn('[YggdrasilCosmos] Skill not found:', skillId);
      return;
    }

    const track = TRACKS[skill.track];
    const trackColor = track?.color ? `#${track.color.toString(16).padStart(6, '0')}` : '#ff6644';

    // Build topics HTML
    const topicsHtml =
      skill.topics
        ?.map(
          (topic, i) => `
        <div class="ygg-skill-topic">
          <div class="ygg-skill-topic-header">
            <span class="ygg-skill-topic-num">${i + 1}</span>
            <span class="ygg-skill-topic-name">${topic.name}</span>
            <span class="ygg-skill-topic-duration">${topic.duration}</span>
          </div>
          <p class="ygg-skill-topic-desc">${topic.description}</p>
        </div>
      `
        )
        .join('') || '';

    // Build outcomes HTML
    const outcomesHtml =
      skill.learningOutcomes?.map(outcome => `<li>${outcome}</li>`).join('') || '';

    // Build resources HTML
    const resourcesHtml =
      skill.resources
        ?.map(
          r => `
        <a href="${r.url}" target="_blank" rel="noopener" class="ygg-skill-resource">
          <span class="ygg-resource-type">${r.type}</span>
          <span class="ygg-resource-title">${r.title}</span>
        </a>
      `
        )
        .join('') || '';

    // Build prerequisites HTML
    const prereqsHtml = skill.prerequisites?.length
      ? skill.prerequisites
          .map(prereqId => {
            const prereq = getSkill(prereqId);
            return prereq
              ? `<span class="ygg-skill-prereq" data-skill="${prereqId}">${prereq.icon} ${prereq.name}</span>`
              : '';
          })
          .join('')
      : '<span class="ygg-skill-prereq-none">None - start here!</span>';

    // Build related projects HTML
    const projectsHtml =
      skill.projects
        ?.map(projectId => {
          const project = ECOSYSTEM_PROJECTS.find(p => p.id === projectId);
          return project
            ? `<span class="ygg-skill-project" data-project="${projectId}">${project.name}</span>`
            : '';
        })
        .join('') || '';

    this.skillModal.querySelector('.ygg-modal-body').innerHTML = `
      <div class="ygg-skill-header" style="border-color: ${trackColor}">
        <span class="ygg-skill-icon">${skill.icon}</span>
        <div class="ygg-skill-title-group">
          <h2 class="ygg-skill-title">${skill.name}</h2>
          <div class="ygg-skill-meta">
            <span class="ygg-skill-track" style="color: ${trackColor}">${track?.name || skill.track}</span>
            <span class="ygg-skill-difficulty">Difficulty: ${'★'.repeat(skill.difficulty)}${'☆'.repeat(3 - skill.difficulty)}</span>
          </div>
        </div>
      </div>

      <div class="ygg-skill-stats">
        <div class="ygg-skill-stat">
          <span class="ygg-stat-value">${skill.estimatedHours}h</span>
          <span class="ygg-stat-label">Duration</span>
        </div>
        <div class="ygg-skill-stat">
          <span class="ygg-stat-value">${skill.xpReward}</span>
          <span class="ygg-stat-label">XP Reward</span>
        </div>
        <div class="ygg-skill-stat">
          <span class="ygg-stat-value">${skill.topics?.length || 0}</span>
          <span class="ygg-stat-label">Topics</span>
        </div>
      </div>

      <p class="ygg-skill-description">${skill.description}</p>

      <section class="ygg-skill-section">
        <h3>📋 Prerequisites</h3>
        <div class="ygg-skill-prereqs">${prereqsHtml}</div>
      </section>

      <section class="ygg-skill-section">
        <h3>🎯 Learning Outcomes</h3>
        <ul class="ygg-skill-outcomes">${outcomesHtml}</ul>
      </section>

      ${
        topicsHtml
          ? `
      <section class="ygg-skill-section">
        <h3>📚 Topics Covered</h3>
        <div class="ygg-skill-topics">${topicsHtml}</div>
      </section>
      `
          : ''
      }

      ${
        resourcesHtml
          ? `
      <section class="ygg-skill-section">
        <h3>🔗 Resources</h3>
        <div class="ygg-skill-resources">${resourcesHtml}</div>
      </section>
      `
          : ''
      }

      ${
        projectsHtml
          ? `
      <section class="ygg-skill-section">
        <h3>🏝️ Used in Projects</h3>
        <div class="ygg-skill-projects">${projectsHtml}</div>
      </section>
      `
          : ''
      }

      <div class="ygg-skill-actions">
        <button class="ygg-btn ygg-btn-primary" onclick="YggdrasilCosmos.startSkillLearning('${skillId}')">
          Start Learning
        </button>
      </div>
    `;

    // Bind prereq clicks
    this.skillModal.querySelectorAll('.ygg-skill-prereq[data-skill]').forEach(el => {
      el.addEventListener('click', () => {
        this.openSkillModal(el.dataset.skill);
      });
    });

    // Bind project clicks
    this.skillModal.querySelectorAll('.ygg-skill-project[data-project]').forEach(el => {
      el.addEventListener('click', () => {
        this.closeSkillModal();
        this.showProjectModal(el.dataset.project);
      });
    });

    this.skillModal.classList.add('open');
    this.skillModalOpen = true;
  },

  /**
   * Close skill modal
   */
  closeSkillModal() {
    this.skillModal.classList.remove('open');
    this.skillModalOpen = false;
  },

  /**
   * Start learning a skill - find related course module
   */
  startSkillLearning(skillId) {
    this.closeSkillModal();

    // Map skills to course modules
    const skillToCourse = {
      solana_basics: 'solana-fundamentals',
      web3_js: 'solana-fundamentals',
      anchor: 'anchor-framework',
      token_analysis: 'spl-tokens',
      smart_contracts: 'anchor-framework',
      api_integration: 'asdf-integration',
      data_viz: 'asdf-integration',
      burn_mechanics: 'asdf-integration',
      game_design: 'game-fundamentals',
      pixel_art: 'game-fundamentals',
      game_economy: 'asdf-game-engine',
      multiplayer: 'asdf-game-engine',
      leaderboards: 'asdf-game-engine',
      writing: 'technical-writing',
      philosophy: 'content-fundamentals',
      teaching: 'technical-writing',
      storytelling: 'content-fundamentals',
      community: 'community-growth',
    };

    const courseId = skillToCourse[skillId];
    if (courseId) {
      this.openModule(courseId);
    } else {
      this.showNotification('Course content coming soon!', 'info');
    }
  },

  /**
   * Load saved state from localStorage
   */
  loadSavedState() {
    try {
      const saved = localStorage.getItem('asdf_build_v2');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.quizResult) {
          this.quizState.completed = true;
          this.quizState.result = data.quizResult;
        }
        if (data.progress) {
          this.userProgress = { ...this.userProgress, ...data.progress };
        }
        if (data.profile) {
          this.profile = { ...this.profile, ...data.profile };
        }
      }
    } catch (e) {
      console.warn('[YggdrasilCosmos] Failed to load saved state:', e);
    }
  },

  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      const data = {
        version: 1,
        quizResult: this.quizState.result,
        progress: this.userProgress,
        profile: this.profile,
      };
      localStorage.setItem('asdf_build_v2', JSON.stringify(data));
    } catch (e) {
      console.warn('[YggdrasilCosmos] Failed to save state:', e);
    }
  },

  /**
   * Show loading overlay with branded fire animation
   */
  showLoading() {
    this.loadingEl = document.createElement('div');
    this.loadingEl.className = 'ygg-loading';
    this.loadingEl.innerHTML = `
      <div class="ygg-loading-emblem">
        <div class="ygg-loading-ring"></div>
        <div class="ygg-loading-ring"></div>
        <div class="ygg-loading-ring"></div>
        <div class="ygg-loading-fire">🔥</div>
      </div>
      <div class="ygg-loading-particles">
        <div class="ygg-particle"></div>
        <div class="ygg-particle"></div>
        <div class="ygg-particle"></div>
        <div class="ygg-particle"></div>
        <div class="ygg-particle"></div>
        <div class="ygg-particle"></div>
        <div class="ygg-particle"></div>
        <div class="ygg-particle"></div>
      </div>
      <div class="ygg-loading-text">Igniting Yggdrasil</div>
      <div class="ygg-loading-bar">
        <div class="ygg-loading-bar-inner"></div>
      </div>
    `;
    this.container.appendChild(this.loadingEl);
  },

  /**
   * Hide loading
   */
  hideLoading() {
    if (this.loadingEl) {
      this.loadingEl.classList.add('fade-out');
      setTimeout(() => this.loadingEl?.remove(), 800);
    }
  },

  /**
   * Show error state
   */
  showError(error) {
    if (this.loadingEl) {
      this.loadingEl.innerHTML = `
                <div class="ygg-loading-icon">⚠️</div>
                <div class="ygg-loading-text">WebGL Error</div>
                <div style="color: #666; font-size: 12px; margin-top: 8px;">
                    ${error.message || 'Unknown error'}
                </div>
            `;
    }
    this.container.classList.add('webgl-fallback');
  },

  /**
   * Build panel toggle buttons
   */
  buildPanelToggles() {
    // Left toggle (Tracks)
    const leftToggle = document.createElement('button');
    leftToggle.className = 'ygg-toggle-btn left';
    leftToggle.innerHTML = '📚';
    leftToggle.title = 'Learning Tracks';
    leftToggle.addEventListener('click', () => this.toggleLeftPanel());
    document.body.appendChild(leftToggle);

    // Right toggle (Profile)
    const rightToggle = document.createElement('button');
    rightToggle.className = 'ygg-toggle-btn right';
    rightToggle.innerHTML = '👤';
    rightToggle.title = 'Builder Profile';
    rightToggle.addEventListener('click', () => this.toggleRightPanel());
    document.body.appendChild(rightToggle);
  },

  /**
   * Build left panel (Tracks + Find Your Path)
   */
  buildLeftPanel() {
    this.leftPanel = document.getElementById('ygg-panel-tracks');
    if (!this.leftPanel) {
      this.leftPanel = document.createElement('aside');
      this.leftPanel.className = 'ygg-panel-overlay ygg-panel-left';
      this.leftPanel.id = 'ygg-panel-tracks';
      document.body.appendChild(this.leftPanel);
    }

    this.leftPanel.innerHTML = `
            <div class="ygg-panel-header">
                <span class="ygg-panel-title">🔥 Your Path</span>
                <button class="ygg-panel-close">&times;</button>
            </div>
            <div class="ygg-panel-content">
                ${this.renderQuizSection()}
                <div class="ygg-section-divider"></div>
                <h3 class="ygg-section-title">Learning Tracks</h3>
                <div class="ygg-tracks-list">
                    ${this.renderTracksWithModules()}
                </div>
            </div>
        `;

    // Close button
    this.leftPanel.querySelector('.ygg-panel-close').addEventListener('click', () => {
      this.toggleLeftPanel(false);
    });

    // Quiz option clicks
    this.leftPanel.querySelectorAll('.ygg-quiz-option').forEach(opt => {
      opt.addEventListener('click', e => {
        const track = e.currentTarget.dataset.track;
        this.answerQuiz(track);
      });
    });

    // Retake quiz button
    const retakeBtn = this.leftPanel.querySelector('.ygg-quiz-retake');
    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => this.resetQuiz());
    }

    // Track cards
    this.leftPanel.querySelectorAll('.ygg-track-card').forEach(card => {
      card.addEventListener('click', () => {
        const trackId = card.dataset.track;
        this.selectTrack(trackId);
      });
    });

    // Module cards - expand/collapse
    this.leftPanel.querySelectorAll('.ygg-module-card').forEach(card => {
      card.addEventListener('click', e => {
        e.stopPropagation();
        const moduleId = card.dataset.module;
        this.openModule(moduleId);
      });
    });
  },

  /**
   * Render Quiz section (Find Your Path)
   */
  renderQuizSection() {
    if (this.quizState.completed && this.quizState.result) {
      const track = this.tracksData[this.quizState.result];
      return `
                <div class="ygg-quiz-result">
                    <div class="ygg-quiz-result-header">
                        <span class="ygg-quiz-result-icon" style="color: ${track.color}">${track.icon}</span>
                        <div class="ygg-quiz-result-text">
                            <span class="ygg-quiz-result-label">Your Path</span>
                            <span class="ygg-quiz-result-track" style="color: ${track.color}">${track.name}</span>
                        </div>
                    </div>
                    <p class="ygg-quiz-result-desc">Focus on ${track.name} to maximize your builder potential.</p>
                    <button class="ygg-quiz-retake">Retake Quiz</button>
                </div>
            `;
    }

    const q = this.quizQuestions[this.quizState.currentQuestion];
    const progress = (this.quizState.currentQuestion / this.quizQuestions.length) * 100;

    return `
            <div class="ygg-quiz-section">
                <div class="ygg-quiz-header">
                    <span class="ygg-quiz-title">🧭 Find Your Path</span>
                    <span class="ygg-quiz-step">${this.quizState.currentQuestion + 1}/${this.quizQuestions.length}</span>
                </div>
                <div class="ygg-quiz-progress">
                    <div class="ygg-quiz-progress-fill" style="width: ${progress}%"></div>
                </div>
                <p class="ygg-quiz-question">${q.text}</p>
                <div class="ygg-quiz-options">
                    ${q.options
                      .map(
                        opt => `
                        <button class="ygg-quiz-option" data-track="${opt.track}">
                            <span class="ygg-quiz-option-icon">${opt.icon}</span>
                            <span class="ygg-quiz-option-text">${opt.text}</span>
                        </button>
                    `
                      )
                      .join('')}
                </div>
            </div>
        `;
  },

  /**
   * Render tracks with their modules
   */
  renderTracksWithModules() {
    return Object.values(this.tracksData)
      .map(track => {
        const progress = this.userProgress[track.id] || 0;
        const totalXP = track.modules.reduce((sum, m) => sum + m.xp, 0);
        const isRecommended = this.quizState.result === track.id;

        return `
                <div class="ygg-track-card ${isRecommended ? 'recommended' : ''}" data-track="${track.id}">
                    <div class="ygg-track-header">
                        <span class="ygg-track-icon" style="color: ${track.color}">${track.icon}</span>
                        <div class="ygg-track-info">
                            <div class="ygg-track-name">${track.name}</div>
                            <div class="ygg-track-meta">
                                <span>${track.modules.length} modules</span>
                                <span>·</span>
                                <span>${track.duration}</span>
                                <span>·</span>
                                <span>${this.formatNumber(totalXP)} XP</span>
                            </div>
                        </div>
                        ${isRecommended ? '<span class="ygg-track-badge">Recommended</span>' : ''}
                    </div>
                    <div class="ygg-progress-bar">
                        <div class="ygg-progress-fill ${track.id}" style="width: ${progress}%"></div>
                    </div>
                    <div class="ygg-track-modules">
                        ${track.modules
                          .map(
                            (m, i) => `
                            <div class="ygg-module-card" data-module="${m.id}">
                                <span class="ygg-module-number">${i + 1}</span>
                                <div class="ygg-module-info">
                                    <span class="ygg-module-title">${m.title}</span>
                                    <span class="ygg-module-meta">${m.lessons} lessons · ${m.xp} XP</span>
                                </div>
                                <span class="ygg-module-status">○</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            `;
      })
      .join('');
  },

  /**
   * Answer quiz question
   */
  answerQuiz(track) {
    this.quizState.answers.push(track);

    if (this.quizState.currentQuestion < this.quizQuestions.length - 1) {
      this.quizState.currentQuestion++;
      this.updateQuizUI();
    } else {
      // Quiz complete - calculate result
      const counts = { dev: 0, games: 0, content: 0 };
      this.quizState.answers.forEach(t => counts[t]++);
      const result = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

      this.quizState.completed = true;
      this.quizState.result = result;
      this.saveState();
      this.updateQuizUI();
    }
  },

  /**
   * Reset quiz
   */
  resetQuiz() {
    this.quizState = {
      currentQuestion: 0,
      answers: [],
      completed: false,
      result: null,
    };
    this.saveState();
    this.updateQuizUI();
  },

  /**
   * Update quiz UI without rebuilding entire panel
   */
  updateQuizUI() {
    const quizContainer = this.leftPanel.querySelector('.ygg-quiz-section, .ygg-quiz-result');
    if (quizContainer) {
      const parent = quizContainer.parentNode;
      const newHtml = this.renderQuizSection();
      const temp = document.createElement('div');
      temp.innerHTML = newHtml;
      parent.replaceChild(temp.firstElementChild, quizContainer);

      // Re-bind events
      this.leftPanel.querySelectorAll('.ygg-quiz-option').forEach(opt => {
        opt.addEventListener('click', e => {
          const track = e.currentTarget.dataset.track;
          this.answerQuiz(track);
        });
      });
      const retakeBtn = this.leftPanel.querySelector('.ygg-quiz-retake');
      if (retakeBtn) {
        retakeBtn.addEventListener('click', () => this.resetQuiz());
      }
    }

    // Also update tracks to show recommended badge
    const tracksList = this.leftPanel.querySelector('.ygg-tracks-list');
    if (tracksList) {
      tracksList.innerHTML = this.renderTracksWithModules();
      this.leftPanel.querySelectorAll('.ygg-track-card').forEach(card => {
        card.addEventListener('click', () => {
          const trackId = card.dataset.track;
          this.selectTrack(trackId);
        });
      });
      this.leftPanel.querySelectorAll('.ygg-module-card').forEach(card => {
        card.addEventListener('click', e => {
          e.stopPropagation();
          this.openModule(card.dataset.module);
        });
      });
    }
  },

  /**
   * Build lesson modal
   */
  buildLessonModal() {
    this.lessonModal = document.createElement('div');
    this.lessonModal.className = 'ygg-lesson-modal';
    this.lessonModal.innerHTML = `
            <div class="ygg-modal-backdrop"></div>
            <div class="ygg-lesson-content">
                <button class="ygg-modal-close">&times;</button>
                <div class="ygg-lesson-sidebar">
                    <div class="ygg-lesson-module-info"></div>
                    <div class="ygg-lesson-list"></div>
                </div>
                <div class="ygg-lesson-main">
                    <div class="ygg-lesson-header"></div>
                    <div class="ygg-lesson-body"></div>
                    <div class="ygg-lesson-actions"></div>
                </div>
            </div>
        `;
    document.body.appendChild(this.lessonModal);

    // Close events
    this.lessonModal
      .querySelector('.ygg-modal-backdrop')
      .addEventListener('click', () => this.closeLessonModal());
    this.lessonModal
      .querySelector('.ygg-modal-close')
      .addEventListener('click', () => this.closeLessonModal());
  },

  /**
   * Open module with lesson content
   */
  openModule(moduleId) {
    // Try COURSES first, fallback to mockLessons
    const courseData = getCourse(moduleId);
    const moduleData = courseData || this.mockLessons[moduleId];

    if (!moduleData) {
      console.warn('[YggdrasilCosmos] No lessons found for module:', moduleId);
      return;
    }

    this.currentModule = moduleId;
    this.currentLessonIndex = 0;

    // Calculate total XP for the module
    const totalXP =
      moduleData.xpReward || moduleData.lessons.reduce((sum, l) => sum + (l.xp || 50), 0);

    // Update sidebar
    const moduleInfo = this.lessonModal.querySelector('.ygg-lesson-module-info');
    moduleInfo.innerHTML = `
      <h2>${moduleData.title}</h2>
      <p>${moduleData.description}</p>
      <div class="ygg-lesson-meta">
        <span class="ygg-lesson-count">${moduleData.lessons.length} lessons</span>
        <span class="ygg-lesson-xp">+${totalXP} XP</span>
      </div>
    `;

    // Update lesson list
    const lessonList = this.lessonModal.querySelector('.ygg-lesson-list');
    lessonList.innerHTML = moduleData.lessons
      .map(
        (lesson, i) => `
          <div class="ygg-lesson-item ${i === 0 ? 'active' : ''}" data-index="${i}">
            <span class="lesson-number">${i + 1}</span>
            <div class="lesson-info">
              <span class="lesson-title">${lesson.title}</span>
              <span class="lesson-duration">${lesson.duration}</span>
            </div>
            <span class="lesson-status">○</span>
          </div>
        `
      )
      .join('');

    // Bind lesson click events
    lessonList.querySelectorAll('.ygg-lesson-item').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        this.showLesson(index);
      });
    });

    // Show first lesson
    this.showLesson(0);

    // Open modal
    this.lessonModal.classList.add('open');

    // Close left panel
    this.toggleLeftPanel(false);
  },

  /**
   * Show specific lesson with rich content
   */
  showLesson(index) {
    // Try COURSES first, fallback to mockLessons
    const courseData = getCourse(this.currentModule);
    const moduleData = courseData || this.mockLessons[this.currentModule];
    if (!moduleData || !moduleData.lessons[index]) return;

    this.currentLessonIndex = index;
    const lesson = moduleData.lessons[index];

    // Update active state in list
    this.lessonModal.querySelectorAll('.ygg-lesson-item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });

    // Update header
    const header = this.lessonModal.querySelector('.ygg-lesson-header');
    const typeIcon = this.getLessonTypeIcon(lesson.type);
    header.innerHTML = `
      <div class="lesson-badge-row">
        <span class="lesson-badge">${typeIcon} ${this.capitalize(lesson.type || 'Lesson')}</span>
        <span class="lesson-xp">+${lesson.xp || 50} XP</span>
      </div>
      <h1>${lesson.title}</h1>
      <span class="lesson-meta">${lesson.duration}</span>
    `;

    // Update body with rich content
    const body = this.lessonModal.querySelector('.ygg-lesson-body');
    body.innerHTML = this.renderLessonContent(lesson);

    // Bind interactive elements
    this.bindLessonInteractions(body, lesson);

    // Update actions
    const actions = this.lessonModal.querySelector('.ygg-lesson-actions');
    const isFirst = index === 0;
    const isLast = index === moduleData.lessons.length - 1;

    actions.innerHTML = `
      <button class="ygg-btn ygg-btn-secondary lesson-prev" ${isFirst ? 'disabled' : ''}>
        ← Previous
      </button>
      <button class="ygg-btn ygg-btn-primary lesson-complete">
        ${lesson.type === 'quiz' ? 'Submit Quiz' : 'Mark Complete'}
      </button>
      <button class="ygg-btn ygg-btn-secondary lesson-next" ${isLast ? 'disabled' : ''}>
        Next →
      </button>
    `;

    // Bind action events
    actions.querySelector('.lesson-prev')?.addEventListener('click', () => {
      if (!isFirst) this.showLesson(index - 1);
    });
    actions.querySelector('.lesson-next')?.addEventListener('click', () => {
      if (!isLast) this.showLesson(index + 1);
    });
    actions.querySelector('.lesson-complete')?.addEventListener('click', () => {
      if (lesson.type === 'quiz') {
        this.submitQuiz(lesson);
      } else {
        this.completeLesson(index);
      }
    });
  },

  /**
   * Get icon for lesson type
   */
  getLessonTypeIcon(type) {
    const icons = {
      lesson: '📖',
      quiz: '❓',
      project: '🔨',
      video: '🎥',
      article: '📄',
    };
    return icons[type] || '📖';
  },

  /**
   * Capitalize string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Render rich lesson content
   */
  renderLessonContent(lesson) {
    let html = '<div class="lesson-content-rich">';

    // Render content sections if available
    if (lesson.content?.sections) {
      html += lesson.content.sections.map(section => this.renderSection(section)).join('');
    } else if (typeof lesson.content === 'string') {
      // Fallback for simple string content
      html += `<div class="lesson-section lesson-intro"><p>${lesson.content}</p></div>`;
    }

    // Render exercise if present
    if (lesson.exercise) {
      html += this.renderExercise(lesson.exercise);
    }

    // Render quiz if present
    if (lesson.quiz) {
      html += this.renderQuiz(lesson.quiz);
    }

    // Render project if present
    if (lesson.project) {
      html += this.renderProject(lesson.project);
    }

    // Render resources
    if (lesson.resources?.length) {
      html += this.renderResources(lesson.resources);
    }

    html += '</div>';
    return html;
  },

  /**
   * Render a content section
   */
  renderSection(section) {
    switch (section.type) {
      case 'intro':
        return `<div class="lesson-section lesson-intro">${this.parseMarkdown(section.text)}</div>`;

      case 'diagram':
        return `
          <div class="lesson-section lesson-diagram">
            ${section.title ? `<h3>${section.title}</h3>` : ''}
            <pre class="diagram-ascii">${this.escapeHtml(section.content)}</pre>
          </div>`;

      case 'concept':
        return `
          <div class="lesson-section lesson-concept">
            <h3>${section.title}</h3>
            ${this.parseMarkdown(section.text)}
          </div>`;

      case 'note':
        const noteClass = section.variant || 'info';
        const noteIcon = { tip: '💡', warning: '⚠️', info: 'ℹ️' }[noteClass] || 'ℹ️';
        return `
          <div class="lesson-section lesson-note lesson-note-${noteClass}">
            <span class="note-icon">${noteIcon}</span>
            ${this.parseMarkdown(section.text)}
          </div>`;

      default:
        return `<div class="lesson-section">${this.parseMarkdown(section.text || '')}</div>`;
    }
  },

  /**
   * Render exercise
   */
  renderExercise(exercise) {
    if (exercise.type === 'quiz') {
      return this.renderInlineQuiz(exercise);
    }

    if (exercise.type === 'code') {
      return `
        <div class="lesson-section lesson-exercise">
          <h3>🔧 Exercice: ${exercise.title}</h3>
          <p class="exercise-instructions">${exercise.instructions}</p>
          <div class="code-editor-container">
            <pre class="code-starter"><code>${this.escapeHtml(exercise.starterCode || '')}</code></pre>
            <textarea class="code-input" placeholder="Écris ton code ici...">${exercise.starterCode || ''}</textarea>
          </div>
          ${
            exercise.hints
              ? `
            <details class="exercise-hints">
              <summary>💡 Indices</summary>
              <ul>${exercise.hints.map(h => `<li>${h}</li>`).join('')}</ul>
            </details>
          `
              : ''
          }
          <button class="ygg-btn ygg-btn-secondary check-exercise">Vérifier</button>
        </div>`;
    }

    if (exercise.type === 'project-mini') {
      return `
        <div class="lesson-section lesson-exercise">
          <h3>🛠️ Mini-Projet: ${exercise.title}</h3>
          <p class="exercise-instructions">${exercise.instructions}</p>
          ${
            exercise.verification
              ? `
            <div class="verification-input">
              <label>${exercise.verification}</label>
              <input type="text" class="verify-input" placeholder="Colle ta réponse ici...">
              <button class="ygg-btn ygg-btn-secondary verify-exercise">Vérifier</button>
            </div>
          `
              : ''
          }
        </div>`;
    }

    return '';
  },

  /**
   * Render inline quiz (within a lesson)
   */
  renderInlineQuiz(exercise) {
    return `
      <div class="lesson-section lesson-quiz-inline">
        <h3>✅ ${exercise.title}</h3>
        <div class="quiz-questions">
          ${exercise.questions
            .map(
              (q, i) => `
            <div class="quiz-question" data-index="${i}" data-correct="${q.correct}">
              <p class="question-text">${q.q}</p>
              <div class="question-options">
                ${q.options
                  .map(
                    (opt, j) => `
                  <label class="option-label">
                    <input type="radio" name="q${i}" value="${j}">
                    <span class="option-text">${opt}</span>
                  </label>
                `
                  )
                  .join('')}
              </div>
              ${q.explanation ? `<p class="question-explanation hidden">${q.explanation}</p>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
        <button class="ygg-btn ygg-btn-secondary check-inline-quiz">Vérifier les réponses</button>
      </div>`;
  },

  /**
   * Render final quiz
   */
  renderQuiz(quiz) {
    return `
      <div class="lesson-section lesson-quiz-final">
        <div class="quiz-info">
          <span class="quiz-passing">Score requis: ${Math.round(quiz.passingScore * 100)}%</span>
        </div>
        <div class="quiz-questions">
          ${quiz.questions
            .map(
              (q, i) => `
            <div class="quiz-question" data-index="${i}" data-correct="${q.correct}">
              <p class="question-number">Question ${i + 1}/${quiz.questions.length}</p>
              <p class="question-text">${q.q}</p>
              <div class="question-options">
                ${q.options
                  .map(
                    (opt, j) => `
                  <label class="option-label">
                    <input type="radio" name="final-q${i}" value="${j}">
                    <span class="option-text">${opt}</span>
                  </label>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>`;
  },

  /**
   * Render project section
   */
  renderProject(project) {
    return `
      <div class="lesson-section lesson-project">
        <h3>🚀 Projet</h3>

        ${
          project.requirements
            ? `
          <div class="project-requirements">
            <h4>Prérequis</h4>
            <ul>${project.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
          </div>
        `
            : ''
        }

        ${
          project.steps
            ? `
          <div class="project-steps">
            <h4>Étapes</h4>
            ${project.steps
              .map(
                (step, i) => `
              <div class="project-step">
                <h5>Étape ${i + 1}: ${step.title}</h5>
                ${this.parseMarkdown(step.instructions)}
              </div>
            `
              )
              .join('')}
          </div>
        `
            : ''
        }

        ${
          project.rubric
            ? `
          <div class="project-rubric">
            <h4>Critères d'évaluation</h4>
            <table>
              <thead><tr><th>Critère</th><th>Points</th></tr></thead>
              <tbody>
                ${project.rubric.map(r => `<tr><td>${r.criterion}</td><td>${r.points}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        `
            : ''
        }

        <div class="project-submission">
          <p>Soumission via: <strong>${project.submission || 'github'}</strong></p>
          <input type="text" class="project-url-input" placeholder="URL de ton projet (GitHub, etc.)">
          <button class="ygg-btn ygg-btn-primary submit-project">Soumettre le projet</button>
        </div>
      </div>`;
  },

  /**
   * Render resources section
   */
  renderResources(resources) {
    return `
      <div class="lesson-section lesson-resources">
        <h3>📚 Ressources Complémentaires</h3>
        <div class="resources-list">
          ${resources
            .map(r => {
              const icon = { docs: '📄', video: '🎥', article: '📰', github: '🐙' }[r.type] || '🔗';
              return `
              <a href="${r.url}" target="_blank" rel="noopener" class="resource-link">
                <span class="resource-icon">${icon}</span>
                <span class="resource-title">${r.title}</span>
                <span class="resource-external">↗</span>
              </a>`;
            })
            .join('')}
        </div>
      </div>`;
  },

  /**
   * Parse simple markdown
   */
  parseMarkdown(text) {
    if (!text) return '';
    return (
      text
        // Code blocks
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Tables
        .replace(/\|(.+)\|/g, match => {
          const cells = match.split('|').filter(c => c.trim());
          if (cells.every(c => c.trim().match(/^-+$/))) {
            return ''; // Skip separator row
          }
          const isHeader = !this._tableStarted;
          this._tableStarted = true;
          const tag = isHeader ? 'th' : 'td';
          return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
        })
        // Wrap tables
        .replace(/(<tr>.*<\/tr>)+/g, '<table class="lesson-table">$&</table>')
        // Paragraphs
        .replace(/\n\n/g, '</p><p>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')
    );
  },

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Bind interactive elements in lesson
   */
  bindLessonInteractions(container, lesson) {
    // Check exercise button
    container.querySelector('.check-exercise')?.addEventListener('click', () => {
      const textarea = container.querySelector('.code-input');
      if (textarea && lesson.exercise?.validation) {
        const code = textarea.value;
        const isValid = lesson.exercise.validation(code);
        if (isValid) {
          this.showNotification('✅ Correct!', 'success');
        } else {
          this.showNotification('❌ Pas tout à fait. Vérifie les indices.', 'error');
        }
      }
    });

    // Check inline quiz
    container.querySelector('.check-inline-quiz')?.addEventListener('click', () => {
      this.checkInlineQuiz(container);
    });

    // Verify mini-project
    container.querySelector('.verify-exercise')?.addEventListener('click', () => {
      const input = container.querySelector('.verify-input');
      const pattern = lesson.exercise?.validationPattern;
      if (input && pattern) {
        const regex = new RegExp(pattern);
        if (regex.test(input.value)) {
          this.showNotification('✅ Valide! Bien joué.', 'success');
        } else {
          this.showNotification('❌ Format invalide. Vérifie ton input.', 'error');
        }
      }
    });

    // Submit project
    container.querySelector('.submit-project')?.addEventListener('click', () => {
      const input = container.querySelector('.project-url-input');
      if (input?.value) {
        this.showNotification('📬 Projet soumis! Review en cours...', 'success');
        // TODO: Actually submit to backend
      }
    });
  },

  /**
   * Check inline quiz answers
   */
  checkInlineQuiz(container) {
    const questions = container.querySelectorAll('.quiz-question');
    let correct = 0;

    questions.forEach(q => {
      const correctAnswer = parseInt(q.dataset.correct);
      const selected = q.querySelector('input:checked');
      const explanation = q.querySelector('.question-explanation');

      if (selected) {
        const answer = parseInt(selected.value);
        if (answer === correctAnswer) {
          q.classList.add('correct');
          q.classList.remove('incorrect');
          correct++;
        } else {
          q.classList.add('incorrect');
          q.classList.remove('correct');
        }
      }

      if (explanation) {
        explanation.classList.remove('hidden');
      }
    });

    const total = questions.length;
    const percent = Math.round((correct / total) * 100);
    this.showNotification(
      `Score: ${correct}/${total} (${percent}%)`,
      percent >= 66 ? 'success' : 'warning'
    );
  },

  /**
   * Submit final quiz
   */
  submitQuiz(lesson) {
    const container = this.lessonModal.querySelector('.ygg-lesson-body');
    const questions = container.querySelectorAll('.quiz-question');
    let correct = 0;

    questions.forEach(q => {
      const correctAnswer = parseInt(q.dataset.correct);
      const selected = q.querySelector('input:checked');

      if (selected && parseInt(selected.value) === correctAnswer) {
        q.classList.add('correct');
        correct++;
      } else {
        q.classList.add('incorrect');
      }
    });

    const total = questions.length;
    const percent = correct / total;
    const passed = percent >= (lesson.quiz?.passingScore || 0.66);

    if (passed) {
      this.showNotification(`🎉 Quiz réussi! ${Math.round(percent * 100)}%`, 'success');
      this.completeLesson(this.currentLessonIndex);
    } else {
      this.showNotification(
        `❌ Score: ${Math.round(percent * 100)}%. Il faut ${Math.round((lesson.quiz?.passingScore || 0.66) * 100)}%`,
        'error'
      );
    }
  },

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `ygg-notification ygg-notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  /**
   * Mark lesson as complete
   */
  completeLesson(index) {
    // Try COURSES first, fallback to mockLessons
    const courseData = getCourse(this.currentModule);
    const moduleData = courseData || this.mockLessons[this.currentModule];
    if (!moduleData) return;

    const lesson = moduleData.lessons[index];
    if (!lesson) return;

    // Update UI
    const lessonItem = this.lessonModal.querySelector(`.ygg-lesson-item[data-index="${index}"]`);
    if (lessonItem) {
      lessonItem.querySelector('.lesson-status').textContent = '✓';
      lessonItem.classList.add('completed');
    }

    // Track completion with ProgressTracker
    const lessonId = lesson.id || `lesson-${index}`;
    const result = ProgressTracker.completeLesson(this.currentModule, lessonId);

    // Show XP notification if XP was earned
    if (result.xp > 0) {
      this.showXPNotification(result.xp);
    }

    // Sync with local profile state
    this.profile.xp = ProgressTracker.data.totalXp;
    this.saveState();

    // Check if all lessons are complete → mark module complete
    const totalLessons = moduleData.lessons.length;
    const completedInModule = ProgressTracker.data.completedLessons.filter(l =>
      l.startsWith(`${this.currentModule}:`)
    ).length;
    if (completedInModule >= totalLessons) {
      ProgressTracker.completeModule(this.currentModule);
    }

    // Refresh profile panel
    this.refreshProfilePanel();

    // Auto-advance if not last
    if (index < totalLessons - 1) {
      setTimeout(() => this.showLesson(index + 1), 500);
    }
  },

  /**
   * Show XP notification
   */
  showXPNotification(amount) {
    const notification = document.createElement('div');
    notification.className = 'ygg-xp-notification';
    notification.innerHTML = `+${amount} XP`;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 1500);
    }, 10);
  },

  /**
   * Close lesson modal
   */
  closeLessonModal() {
    this.lessonModal.classList.remove('open');
    this.currentModule = null;
    this.currentLessonIndex = 0;
  },

  /**
   * Build right panel (Builder Profile Card)
   */
  buildRightPanel() {
    this.rightPanel = document.getElementById('ygg-panel-profile');
    if (!this.rightPanel) {
      this.rightPanel = document.createElement('aside');
      this.rightPanel.className = 'ygg-panel-overlay ygg-panel-right';
      this.rightPanel.id = 'ygg-panel-profile';
      document.body.appendChild(this.rightPanel);
    }

    this.rightPanel.innerHTML = `
            <div class="ygg-panel-header">
                <span class="ygg-panel-title">❄️ Builder Profile</span>
                <button class="ygg-panel-close">&times;</button>
            </div>
            <div class="ygg-panel-content">
                ${this.renderBuilderCard()}
            </div>
        `;

    this.rightPanel.querySelector('.ygg-panel-close').addEventListener('click', () => {
      this.toggleRightPanel(false);
    });

    // Stats toggle
    const statsToggle = this.rightPanel.querySelector('.ygg-stats-toggle');
    if (statsToggle) {
      statsToggle.addEventListener('click', () => this.toggleStats());
    }

    // Connect wallet button
    const connectBtn = this.rightPanel.querySelector('.ygg-connect-wallet');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connectWallet());
    }
  },

  /**
   * Setup progress tracker event listeners
   */
  setupProgressListeners() {
    // Listen for XP gains
    ProgressTracker.on('levelUp', data => {
      this.showNotification(
        `Level Up! You're now ${data.title} (Level ${data.newLevel})`,
        'success'
      );
      this.refreshProfilePanel();
    });

    // Listen for badge awards
    ProgressTracker.on('badgeEarned', data => {
      this.showNotification(`Badge Earned: ${data.badge.icon} ${data.badge.name}`, 'success');
      this.refreshProfilePanel();
    });

    // Listen for streak updates
    ProgressTracker.on('streakUpdate', data => {
      if (data.streak > 1 && data.streak % 7 === 0) {
        this.showNotification(`🔥 ${data.streak} day streak! Keep it up!`, 'info');
      }
    });

    // Sync with profile on module completion
    ProgressTracker.on('moduleComplete', () => {
      this.refreshProfilePanel();
    });
  },

  /**
   * Refresh profile panel with latest data
   */
  refreshProfilePanel() {
    if (this.rightPanel) {
      const content = this.rightPanel.querySelector('.ygg-panel-content');
      if (content) {
        content.innerHTML = this.renderBuilderCard();
        // Re-attach event listeners
        const statsToggle = this.rightPanel.querySelector('.ygg-stats-toggle');
        if (statsToggle) {
          statsToggle.addEventListener('click', () => this.toggleStats());
        }
        const connectBtn = this.rightPanel.querySelector('.ygg-connect-wallet');
        if (connectBtn) {
          connectBtn.addEventListener('click', () => this.connectWallet());
        }
      }
    }
  },

  /**
   * Render Builder Card with ProgressTracker data
   */
  renderBuilderCard() {
    const stats = ProgressTracker.getStats();
    const levelProgress = stats.levelProgress;
    const badges = ProgressTracker.getEarnedBadges();
    const walletDisplay = this.profile.wallet
      ? `${this.profile.wallet.slice(0, 4)}...${this.profile.wallet.slice(-4)}`
      : null;

    // Top badges (show up to 5)
    const topBadges =
      badges.length > 0
        ? badges
            .slice(0, 5)
            .map(b => `<span class="ygg-badge" title="${b.name}: ${b.desc}">${b.icon}</span>`)
            .join('')
        : '<span class="ygg-badge-placeholder">Complete lessons to earn badges</span>';

    // XP progress bar
    const xpPercent = levelProgress.next ? levelProgress.progress : 100;

    return `
      <div class="ygg-builder-card">
        <div class="ygg-builder-header">
          <div class="ygg-avatar-large">
            <span class="ygg-avatar-icon">🔥</span>
            <span class="ygg-level-badge">${stats.level}</span>
          </div>
          <div class="ygg-builder-info">
            <div class="ygg-builder-name">${this.profile.name}</div>
            ${
              walletDisplay
                ? `<div class="ygg-wallet-addr">${walletDisplay}</div>`
                : `<button class="ygg-connect-wallet">Connect Wallet</button>`
            }
          </div>
        </div>

        <div class="ygg-builder-level">
          <span class="ygg-level-title">${levelProgress.current.title}</span>
          <span class="ygg-total-xp">${this.formatNumber(stats.totalXp)} XP</span>
        </div>

        <div class="ygg-xp-progress">
          <div class="ygg-xp-bar">
            <div class="ygg-xp-fill" style="width: ${xpPercent}%"></div>
          </div>
          ${
            levelProgress.next
              ? `<span class="ygg-xp-to-next">${this.formatNumber(levelProgress.xpToNext)} XP to ${levelProgress.next.title}</span>`
              : `<span class="ygg-xp-to-next">Max Level Reached!</span>`
          }
        </div>

        <div class="ygg-streak-display ${stats.streak > 0 ? 'active' : ''}">
          <span class="streak-icon">🔥</span>
          <span class="streak-count">${stats.streak}</span>
          <span class="streak-label">day streak</span>
        </div>

        <div class="ygg-badges-row">
          ${topBadges}
          ${badges.length > 5 ? `<span class="ygg-badge-more">+${badges.length - 5}</span>` : ''}
        </div>

        <button class="ygg-stats-toggle ${this.profileExpanded ? 'expanded' : ''}">
          <span>View Progress</span>
          <span class="ygg-stats-arrow">${this.profileExpanded ? '▲' : '▼'}</span>
        </button>

        <div class="ygg-stats-expanded ${this.profileExpanded ? 'show' : ''}">
          <div class="ygg-stats-section">
            <h4>Learning Stats</h4>
            <div class="ygg-stats-grid">
              <div class="ygg-stat-card">
                <span class="stat-value">${stats.lessonsCompleted}</span>
                <span class="stat-label">Lessons</span>
              </div>
              <div class="ygg-stat-card">
                <span class="stat-value">${stats.modulesCompleted}</span>
                <span class="stat-label">Modules</span>
              </div>
              <div class="ygg-stat-card">
                <span class="stat-value">${stats.projectsExplored}</span>
                <span class="stat-label">Projects</span>
              </div>
              <div class="ygg-stat-card">
                <span class="stat-value">${stats.badgesEarned}</span>
                <span class="stat-label">Badges</span>
              </div>
            </div>
          </div>

          <div class="ygg-stats-section">
            <h4>Generalist Tracks</h4>
            <div class="ygg-track-progress-list">
              ${Object.entries(GENERALIST_TRACKS)
                .map(
                  ([id, track]) => `
                  <div class="ygg-track-progress-row">
                    <span class="ygg-track-label" style="color: ${track.color}">${track.icon} ${track.name}</span>
                    <div class="ygg-track-progress-bar">
                      <div class="ygg-track-progress-fill" style="width: ${stats.trackProgress[id]}%; background: ${track.color}"></div>
                    </div>
                    <span class="ygg-track-percent">${stats.trackProgress[id]}%</span>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>

          <div class="ygg-stats-section">
            <h4>Specialized Tracks</h4>
            <div class="ygg-specialized-list">
              ${this.renderSpecializedProgress()}
            </div>
          </div>

          <div class="ygg-stats-section">
            <h4>Streaks</h4>
            <div class="ygg-stats-list">
              <div class="ygg-stat-row">
                <span>Current Streak</span>
                <span>${stats.streak} days 🔥</span>
              </div>
              <div class="ygg-stat-row">
                <span>Longest Streak</span>
                <span>${stats.longestStreak} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render specialized project track progress
   */
  renderSpecializedProgress() {
    const explored = ProgressTracker.data.exploredProjects;
    if (explored.length === 0) {
      return '<p class="ygg-no-progress">Explore projects to start specialized tracks</p>';
    }

    return explored
      .slice(0, 5)
      .map(projectId => {
        const project = this.projectsData[projectId];
        const progress = ProgressTracker.getSpecializedProgress(
          projectId,
          project?.miniTree?.length || 6
        );
        const ecosystemProject = ECOSYSTEM_PROJECTS.find(p => p.id === projectId);
        const trackColor =
          ecosystemProject?.track === 'dev'
            ? '#ff4444'
            : ecosystemProject?.track === 'games'
              ? '#aa44ff'
              : '#44aaff';

        return `
          <div class="ygg-specialized-row" data-project="${projectId}">
            <span class="specialized-name">${project?.title || projectId}</span>
            <div class="ygg-track-progress-bar small">
              <div class="ygg-track-progress-fill" style="width: ${progress.percent}%; background: ${trackColor}"></div>
            </div>
            <span class="ygg-track-percent">${progress.percent}%</span>
          </div>
        `;
      })
      .join('');
  },

  /**
   * Calculate level from XP (Fibonacci-based)
   */
  calculateLevel(xp) {
    const thresholds = [0, 100, 200, 400, 700, 1200, 2000, 3300, 5400, 8800, 14300];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (xp >= thresholds[i]) return i + 1;
    }
    return 1;
  },

  /**
   * Get level title
   */
  getLevelTitle(level) {
    const titles = [
      'Novice',
      'Apprentice',
      'Builder',
      'Craftsman',
      'Artisan',
      'Expert',
      'Master',
      'Grandmaster',
      'Architect',
      'Legend',
      'Mythic',
    ];
    return titles[Math.min(level - 1, titles.length - 1)];
  },

  /**
   * Toggle stats expansion
   */
  toggleStats() {
    this.profileExpanded = !this.profileExpanded;
    const card = this.rightPanel.querySelector('.ygg-builder-card');
    if (card) {
      card.innerHTML = '';
      const temp = document.createElement('div');
      temp.innerHTML = this.renderBuilderCard();
      card.replaceWith(temp.firstElementChild);

      // Re-bind events
      const statsToggle = this.rightPanel.querySelector('.ygg-stats-toggle');
      if (statsToggle) {
        statsToggle.addEventListener('click', () => this.toggleStats());
      }
      const connectBtn = this.rightPanel.querySelector('.ygg-connect-wallet');
      if (connectBtn) {
        connectBtn.addEventListener('click', () => this.connectWallet());
      }
    }
  },

  /**
   * Connect wallet (placeholder)
   */
  connectWallet() {
    console.log('[YggdrasilCosmos] Connect wallet requested');
    window.dispatchEvent(new CustomEvent('wallet:connect'));
  },

  /**
   * Build burn stats HUD
   */
  buildBurnHud() {
    this.burnHud = document.createElement('div');
    this.burnHud.className = 'ygg-burn-hud';

    const s = this.mockBurnStats;
    this.burnHud.innerHTML = `
            <div class="ygg-burn-metric">
                <span class="ygg-burn-metric-label">Total Burned</span>
                <span class="ygg-burn-metric-value">${this.formatNumber(s.total)}</span>
            </div>
            <div class="ygg-burn-metric">
                <span class="ygg-burn-metric-label">24h Burned</span>
                <span class="ygg-burn-metric-value">${this.formatNumber(s.daily)}</span>
            </div>
            <div class="ygg-live-indicator">
                <div class="ygg-live-dot"></div>
            </div>
            <div class="ygg-burn-metric">
                <span class="ygg-burn-metric-label">APY</span>
                <span class="ygg-burn-metric-value">${s.apy}%</span>
            </div>
        `;

    document.body.appendChild(this.burnHud);
  },

  /**
   * Build filter & legend panel
   */
  buildFilterLegend() {
    this.filterLegend = document.createElement('div');
    this.filterLegend.className = 'ygg-filter-legend';
    this.filterLegend.innerHTML = `
      <div class="ygg-legend-header">
        <span class="legend-title">🗺️ Legend</span>
        <button class="legend-toggle">−</button>
      </div>
      <div class="ygg-legend-content">
        <div class="legend-section">
          <span class="legend-section-title">Tracks</span>
          <label class="legend-filter" data-filter="track" data-value="dev">
            <input type="checkbox" checked>
            <span class="legend-color" style="background: #ff4444;"></span>
            <span class="legend-label">Dev</span>
            <span class="legend-count" data-track="dev">11</span>
          </label>
          <label class="legend-filter" data-filter="track" data-value="games">
            <input type="checkbox" checked>
            <span class="legend-color" style="background: #aa44ff;"></span>
            <span class="legend-label">Games</span>
            <span class="legend-count" data-track="games">4</span>
          </label>
          <label class="legend-filter" data-filter="track" data-value="content">
            <input type="checkbox" checked>
            <span class="legend-color" style="background: #44aaff;"></span>
            <span class="legend-label">Content</span>
            <span class="legend-count" data-track="content">6</span>
          </label>
        </div>
        <div class="legend-section">
          <span class="legend-section-title">Status</span>
          <label class="legend-filter" data-filter="status" data-value="live">
            <input type="checkbox" checked>
            <span class="legend-icon">●</span>
            <span class="legend-label">Live</span>
          </label>
          <label class="legend-filter" data-filter="status" data-value="building">
            <input type="checkbox" checked>
            <span class="legend-icon pulse">◐</span>
            <span class="legend-label">Building</span>
          </label>
          <label class="legend-filter" data-filter="status" data-value="planned">
            <input type="checkbox" checked>
            <span class="legend-icon dim">○</span>
            <span class="legend-label">Planned</span>
          </label>
        </div>
        <div class="legend-section legend-phi">
          <span class="legend-section-title">Φ Harmony</span>
          <div class="phi-indicator">
            <span class="phi-symbol">φ</span>
            <span class="phi-value">1.618</span>
          </div>
          <p class="phi-desc">Projects positioned using golden angle (137.5°)</p>
        </div>
      </div>
    `;

    document.body.appendChild(this.filterLegend);

    // Toggle collapse
    this.filterLegend.querySelector('.legend-toggle').addEventListener('click', () => {
      this.filterLegend.classList.toggle('collapsed');
      const btn = this.filterLegend.querySelector('.legend-toggle');
      btn.textContent = this.filterLegend.classList.contains('collapsed') ? '+' : '−';
    });

    // Filter checkboxes
    this.filterLegend.querySelectorAll('.legend-filter input').forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const label = e.target.closest('.legend-filter');
        const filterType = label.dataset.filter;
        const value = label.dataset.value;

        if (filterType === 'track') {
          this.filters.tracks[value] = e.target.checked;
        } else if (filterType === 'status') {
          this.filters.status[value] = e.target.checked;
        }

        this.applyFilters();
      });
    });
  },

  /**
   * Apply filters to Yggdrasil islands
   */
  applyFilters() {
    if (!this.dashboard?.cosmos?.islands) return;

    const islands = this.dashboard.cosmos.islands;
    islands.forEach((islandData, projectId) => {
      const project = ECOSYSTEM_PROJECTS.find(p => p.id === projectId);
      if (!project) return;

      const trackVisible = this.filters.tracks[project.track];
      const statusVisible = this.filters.status[project.status];
      const visible = trackVisible && statusVisible;

      islandData.mesh.visible = visible;
    });
  },

  /**
   * Build component detail modal
   */
  buildComponentModal() {
    this.componentModal = document.createElement('div');
    this.componentModal.className = 'ygg-component-modal';
    this.componentModal.innerHTML = `
      <div class="ygg-modal-backdrop"></div>
      <div class="ygg-modal-content ygg-component-content">
        <button class="ygg-modal-close">&times;</button>
        <div class="ygg-modal-body"></div>
      </div>
    `;
    document.body.appendChild(this.componentModal);

    // Close events
    this.componentModal
      .querySelector('.ygg-modal-backdrop')
      .addEventListener('click', () => this.closeComponentModal());
    this.componentModal
      .querySelector('.ygg-modal-close')
      .addEventListener('click', () => this.closeComponentModal());
  },

  /**
   * Open component modal
   */
  openComponentModal(projectId, component) {
    const project = this.projectsData[projectId];
    const projectTitle = project?.title || projectId;

    this.componentModal.querySelector('.ygg-modal-body').innerHTML = `
      <div class="ygg-component-modal-header">
        <span class="component-modal-icon">${component.icon}</span>
        <div class="component-modal-titles">
          <h2>${component.name}</h2>
          <span class="component-modal-project">Part of ${projectTitle}</span>
        </div>
        <span class="component-modal-status status-${component.status}">${component.status}</span>
      </div>

      <div class="component-modal-grid">
        <div class="component-modal-section">
          <h3>What</h3>
          <p>${component.what || 'N/A'}</p>
        </div>
        <div class="component-modal-section">
          <h3>How</h3>
          <p>${component.how || 'N/A'}</p>
        </div>
        <div class="component-modal-section">
          <h3>Why</h3>
          <p>${component.why || 'N/A'}</p>
        </div>
        ${
          component.future
            ? `
        <div class="component-modal-section future">
          <h3>Future</h3>
          <p>${component.future}</p>
        </div>
        `
            : ''
        }
      </div>

      <div class="component-modal-actions">
        <button class="ygg-btn ygg-btn-primary" onclick="YggdrasilCosmos.openProjectModal('${projectId}')">
          View Full Project
        </button>
        ${
          project?.demo
            ? `
        <a href="${project.demo}" target="_blank" class="ygg-btn ygg-btn-secondary">
          Open Demo
        </a>
        `
            : ''
        }
      </div>
    `;

    this.componentModal.classList.add('open');
    this.componentModalOpen = true;
  },

  /**
   * Close component modal
   */
  closeComponentModal() {
    this.componentModal.classList.remove('open');
    this.componentModalOpen = false;
  },

  /**
   * Show CTA hint
   */
  showCTAHint() {
    this.ctaHint = document.createElement('div');
    this.ctaHint.className = 'ygg-cta-hint';
    this.ctaHint.textContent = '👆 Click an island to explore';
    document.body.appendChild(this.ctaHint);

    // Hide on first click
    this.container.addEventListener(
      'click',
      () => {
        if (this.ctaHint) {
          this.ctaHint.style.opacity = '0';
          setTimeout(() => this.ctaHint?.remove(), 300);
          this.ctaHint = null;
        }
      },
      { once: true }
    );
  },

  /**
   * Toggle left panel
   */
  toggleLeftPanel(open = !this.leftPanelOpen) {
    this.leftPanelOpen = open;
    this.leftPanel.classList.toggle('open', open);
  },

  /**
   * Toggle right panel
   */
  toggleRightPanel(open = !this.rightPanelOpen) {
    this.rightPanelOpen = open;
    this.rightPanel.classList.toggle('open', open);
  },

  /**
   * Select track
   */
  selectTrack(trackId) {
    // Update active state
    this.leftPanel.querySelectorAll('.ygg-track-card').forEach(card => {
      card.classList.toggle('active', card.dataset.track === trackId);
    });

    // Close panel and focus camera
    this.toggleLeftPanel(false);

    // TODO: Animate camera to track's projects
    console.log('[YggdrasilCosmos] Selected track:', trackId);
  },

  /**
   * Format number
   */
  formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  },

  /**
   * Dispose
   */
  dispose() {
    this.dashboard?.dispose();
    this.loadingEl?.remove();
    this.burnHud?.remove();
    this.ctaHint?.remove();
    document.querySelectorAll('.ygg-toggle-btn').forEach(el => el.remove());
    this.initialized = false;
  },
};

// Export
export { YggdrasilCosmos };
export default YggdrasilCosmos;

// Global
if (typeof window !== 'undefined') {
  window.YggdrasilCosmos = YggdrasilCosmos;
}
