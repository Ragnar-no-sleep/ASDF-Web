/**
 * Yggdrasil Cosmos - Full Screen Immersive Controller
 * No columns, no scroll - pure 3D experience with sliding panel overlays
 */

'use strict';

import { Dashboard, TRACKS, ECOSYSTEM_PROJECTS } from '../dashboard/index.js';

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

  // Data
  projectsData: null,

  // State
  initialized: false,
  leftPanelOpen: false,
  rightPanelOpen: false,
  projectModalOpen: false,
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

    // Load projects data
    await this.loadProjectsData();

    // Show loading
    this.showLoading();

    // Build UI overlays
    this.buildPanelToggles();
    this.buildLeftPanel();
    this.buildRightPanel();
    this.buildBurnHud();
    this.buildProjectModal();
    this.buildLessonModal();

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

    // Skill click -> could open skill detail or formation panel
    this.dashboard.cosmos.on('skillClick', (skill, project) => {
      // For now, open the project modal with skill highlighted
      if (project) {
        this.openProjectModal(project.id, skill.id);
      }
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
    const mapping = {
      holdex: 'holdex',
      forecast: 'forecast',
      burns: 'burn-tracker',
      pumparena: 'games-platform',
      arcade: 'games-platform',
      manifesto: 'learn-platform',
      learn: 'learn-platform',
      journey: 'learn-platform',
    };
    return mapping[ecosystemId] || ecosystemId;
  },

  /**
   * Open project modal with details
   */
  openProjectModal(projectId, highlightSkillId = null) {
    const mappedId = this.mapProjectId(projectId);
    const project = this.projectsData[mappedId];
    if (!project) {
      // Fallback to ECOSYSTEM_PROJECTS basic data
      const basicProject = ECOSYSTEM_PROJECTS.find(p => p.id === projectId);
      if (!basicProject) return;

      this.projectModal.querySelector('.ygg-modal-body').innerHTML = `
                <div class="ygg-project-header">
                    <span class="ygg-project-icon">${basicProject.name.charAt(0)}</span>
                    <div class="ygg-project-title-group">
                        <h2>${basicProject.name}</h2>
                        <span class="ygg-project-track track-${basicProject.track}">${basicProject.track}</span>
                    </div>
                </div>
                <p class="ygg-project-description">${basicProject.description}</p>
                <div class="ygg-project-status">
                    <span class="status-badge status-${basicProject.status}">${basicProject.status}</span>
                    <span class="kscore-badge">K-Score: ${basicProject.kScore}</span>
                </div>
            `;
    } else {
      // Full project data from JSON
      const featuresHtml =
        project.features
          ?.map(
            f => `
                <div class="ygg-feature-card">
                    <h4>${f.name}</h4>
                    <p class="feature-what"><strong>What:</strong> ${f.what}</p>
                    <p class="feature-how"><strong>How:</strong> ${f.how}</p>
                    <p class="feature-why"><strong>Why:</strong> ${f.why}</p>
                </div>
            `
          )
          .join('') || '';

      const miniTreeHtml =
        project.miniTree
          ?.map(
            item => `
                <div class="ygg-minitree-item status-${item.status}">
                    <span class="minitree-icon">${item.icon}</span>
                    <div class="minitree-content">
                        <span class="minitree-name">${item.name}</span>
                        <span class="minitree-status">${item.status}</span>
                    </div>
                </div>
            `
          )
          .join('') || '';

      const roadmapHtml =
        project.roadmap
          ?.map(
            r => `
                <div class="ygg-roadmap-item">
                    <span class="roadmap-phase">${r.phase}</span>
                    <span class="roadmap-text">${r.text}</span>
                </div>
            `
          )
          .join('') || '';

      const techHtml = project.tech?.map(t => `<span class="tech-tag">${t}</span>`).join('') || '';

      // Contributors (L2b Project Timeline)
      const contributors = this.mockContributors[mappedId] || [];
      const contributorsHtml =
        contributors
          .map(
            c => `
                <div class="ygg-contributor-card">
                    <span class="contributor-avatar">${c.avatar}</span>
                    <div class="contributor-info">
                        <span class="contributor-name">${c.name}</span>
                        <span class="contributor-role">${c.role}</span>
                    </div>
                    <div class="contributor-stats">
                        <span class="contributor-commits">${c.commits} commits</span>
                        <span class="contributor-diff">
                            <span class="diff-add">+${this.formatNumber(c.additions)}</span>
                            <span class="diff-del">-${this.formatNumber(c.deletions)}</span>
                        </span>
                    </div>
                </div>
            `
          )
          .join('') || '';

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
                  project.features?.length
                    ? `
                <section class="ygg-project-section">
                    <h3>✨ Features</h3>
                    <div class="ygg-features-grid">
                        ${featuresHtml}
                    </div>
                </section>
                `
                    : ''
                }

                ${
                  project.miniTree?.length
                    ? `
                <section class="ygg-project-section">
                    <h3>🌳 Components</h3>
                    <div class="ygg-minitree-grid">
                        ${miniTreeHtml}
                    </div>
                </section>
                `
                    : ''
                }

                ${
                  project.roadmap?.length
                    ? `
                <section class="ygg-project-section">
                    <h3>🗺️ Roadmap</h3>
                    <div class="ygg-roadmap">
                        ${roadmapHtml}
                    </div>
                </section>
                `
                    : ''
                }

                ${
                  contributors.length
                    ? `
                <section class="ygg-project-section">
                    <h3>👥 Contributors</h3>
                    <div class="ygg-contributors-grid">
                        ${contributorsHtml}
                    </div>
                </section>
                `
                    : ''
                }

                <div class="ygg-project-actions">
                    ${project.demo ? `<a href="${project.demo}" target="_blank" class="ygg-btn ygg-btn-primary">View Demo</a>` : ''}
                    ${project.github ? `<a href="${project.github}" target="_blank" class="ygg-btn ygg-btn-secondary">GitHub</a>` : ''}
                </div>
            `;
    }

    this.projectModal.classList.add('open');
    this.projectModalOpen = true;
  },

  /**
   * Close project modal
   */
  closeProjectModal() {
    this.projectModal.classList.remove('open');
    this.projectModalOpen = false;
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
   * Show loading overlay
   */
  showLoading() {
    this.loadingEl = document.createElement('div');
    this.loadingEl.className = 'ygg-loading';
    this.loadingEl.innerHTML = `
            <div class="ygg-loading-icon">🔥</div>
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
    const moduleData = this.mockLessons[moduleId];
    if (!moduleData) {
      console.warn('[YggdrasilCosmos] No lessons found for module:', moduleId);
      return;
    }

    this.currentModule = moduleId;
    this.currentLessonIndex = 0;

    // Update sidebar
    const moduleInfo = this.lessonModal.querySelector('.ygg-lesson-module-info');
    moduleInfo.innerHTML = `
            <h2>${moduleData.title}</h2>
            <p>${moduleData.description}</p>
            <span class="ygg-lesson-count">${moduleData.lessons.length} lessons</span>
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
   * Show specific lesson
   */
  showLesson(index) {
    const moduleData = this.mockLessons[this.currentModule];
    if (!moduleData || !moduleData.lessons[index]) return;

    this.currentLessonIndex = index;
    const lesson = moduleData.lessons[index];

    // Update active state in list
    this.lessonModal.querySelectorAll('.ygg-lesson-item').forEach((item, i) => {
      item.classList.toggle('active', i === index);
    });

    // Update header
    const header = this.lessonModal.querySelector('.ygg-lesson-header');
    header.innerHTML = `
            <span class="lesson-badge">Lesson ${index + 1}</span>
            <h1>${lesson.title}</h1>
            <span class="lesson-meta">${lesson.duration}</span>
        `;

    // Update body
    const body = this.lessonModal.querySelector('.ygg-lesson-body');
    body.innerHTML = `
            <div class="lesson-content">
                <p>${lesson.content}</p>
            </div>
            <div class="lesson-placeholder">
                <div class="placeholder-icon">📖</div>
                <p>Full lesson content, interactive examples, and quizzes coming soon!</p>
            </div>
        `;

    // Update actions
    const actions = this.lessonModal.querySelector('.ygg-lesson-actions');
    const isFirst = index === 0;
    const isLast = index === moduleData.lessons.length - 1;

    actions.innerHTML = `
            <button class="ygg-btn ygg-btn-secondary lesson-prev" ${isFirst ? 'disabled' : ''}>
                ← Previous
            </button>
            <button class="ygg-btn ygg-btn-primary lesson-complete">
                Mark Complete
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
      this.completeLesson(index);
    });
  },

  /**
   * Mark lesson as complete
   */
  completeLesson(index) {
    const moduleData = this.mockLessons[this.currentModule];
    if (!moduleData) return;

    // Update UI
    const lessonItem = this.lessonModal.querySelector(`.ygg-lesson-item[data-index="${index}"]`);
    if (lessonItem) {
      lessonItem.querySelector('.lesson-status').textContent = '✓';
      lessonItem.classList.add('completed');
    }

    // Award XP
    this.profile.xp += 50;
    this.saveState();

    // Show XP notification
    this.showXPNotification(50);

    // Auto-advance if not last
    if (index < moduleData.lessons.length - 1) {
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
   * Render Builder Card
   */
  renderBuilderCard() {
    const p = this.profile;
    const level = this.calculateLevel(p.xp);
    const levelTitle = this.getLevelTitle(level);
    const walletDisplay = p.wallet ? `${p.wallet.slice(0, 4)}...${p.wallet.slice(-4)}` : null;

    // Top badges (show up to 5)
    const topBadges =
      p.badges.length > 0
        ? p.badges
            .slice(0, 5)
            .map(b => `<span class="ygg-badge" title="${b.name}">${b.icon}</span>`)
            .join('')
        : '<span class="ygg-badge-placeholder">No badges yet</span>';

    return `
            <div class="ygg-builder-card">
                <div class="ygg-builder-header">
                    <div class="ygg-avatar-large">
                        <span class="ygg-avatar-icon">🔥</span>
                        <span class="ygg-level-badge">${level}</span>
                    </div>
                    <div class="ygg-builder-info">
                        <div class="ygg-builder-name">${p.name}</div>
                        ${
                          walletDisplay
                            ? `<div class="ygg-wallet-addr">${walletDisplay}</div>`
                            : `<button class="ygg-connect-wallet">Connect Wallet</button>`
                        }
                    </div>
                </div>

                <div class="ygg-builder-level">
                    <span class="ygg-level-title">${levelTitle}</span>
                    <span class="ygg-total-xp">${this.formatNumber(p.xp)} XP</span>
                </div>

                <div class="ygg-badges-row">
                    ${topBadges}
                </div>

                <button class="ygg-stats-toggle ${this.profileExpanded ? 'expanded' : ''}">
                    <span>View Stats</span>
                    <span class="ygg-stats-arrow">${this.profileExpanded ? '▲' : '▼'}</span>
                </button>

                <div class="ygg-stats-expanded ${this.profileExpanded ? 'show' : ''}">
                    <div class="ygg-stats-section">
                        <h4>Statistics</h4>
                        <div class="ygg-stats-list">
                            <div class="ygg-stat-row">
                                <span>Quests Completed</span>
                                <span>${p.questsCompleted}</span>
                            </div>
                            <div class="ygg-stat-row">
                                <span>Modules Mastered</span>
                                <span>${p.modulesCompleted}</span>
                            </div>
                            <div class="ygg-stat-row">
                                <span>Projects Contributed</span>
                                <span>${p.projectsContributed}</span>
                            </div>
                            <div class="ygg-stat-row">
                                <span>PRs Merged</span>
                                <span>${p.prsMerged}</span>
                            </div>
                            <div class="ygg-stat-row">
                                <span>Tokens Burned</span>
                                <span>${this.formatNumber(p.burned)} ASDF</span>
                            </div>
                            <div class="ygg-stat-row">
                                <span>Streak</span>
                                <span>${p.streak} days 🔥</span>
                            </div>
                        </div>
                    </div>

                    <div class="ygg-stats-section">
                        <h4>Track Progress</h4>
                        <div class="ygg-track-progress-list">
                            ${Object.entries(this.tracksData)
                              .map(
                                ([id, track]) => `
                                <div class="ygg-track-progress-row">
                                    <span class="ygg-track-label" style="color: ${track.color}">${track.icon} ${track.name}</span>
                                    <div class="ygg-track-progress-bar">
                                        <div class="ygg-track-progress-fill" style="width: ${this.userProgress[id]}%; background: ${track.color}"></div>
                                    </div>
                                    <span class="ygg-track-percent">${this.userProgress[id]}%</span>
                                </div>
                            `
                              )
                              .join('')}
                        </div>
                    </div>

                    ${
                      p.memberSince
                        ? `
                        <div class="ygg-member-since">
                            Member since ${new Date(p.memberSince).toLocaleDateString()}
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        `;
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
