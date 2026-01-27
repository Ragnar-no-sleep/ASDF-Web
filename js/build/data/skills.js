/**
 * Skills Data - Real educational content for Yggdrasil skill nodes
 * Each skill represents a learnable ability with structured curriculum
 */

'use strict';

export const SKILLS_DATA = {
  // ═══════════════════════════════════════════════════════════════
  // DEV TRACK - Technical Skills
  // ═══════════════════════════════════════════════════════════════

  solana_basics: {
    id: 'solana_basics',
    name: 'Solana Fundamentals',
    track: 'dev',
    icon: '⚡',
    difficulty: 1,
    xpReward: 300,
    estimatedHours: 8,
    description:
      'Master the foundations of Solana blockchain development. Understand accounts, programs, transactions, and the unique architecture that makes Solana the fastest blockchain.',
    prerequisites: [],
    learningOutcomes: [
      'Explain Solana account model vs Ethereum storage model',
      'Describe how Proof of History enables 400ms block times',
      'Read and interpret Solana transaction signatures',
      'Use Solana CLI to interact with devnet/mainnet',
      'Understand rent, lamports, and SOL economics',
    ],
    topics: [
      {
        name: 'Account Model',
        duration: '2h',
        description:
          'Everything on Solana is an account. Learn the difference between executable (programs) and data accounts, how PDAs work, and why this model enables parallelization.',
      },
      {
        name: 'Proof of History',
        duration: '1.5h',
        description:
          "Solana's secret sauce. Understand how PoH creates a verifiable ordering of events without coordination, enabling sub-second finality.",
      },
      {
        name: 'Transactions & Instructions',
        duration: '2h',
        description:
          'Transactions are atomic bundles of instructions. Learn versioned transactions, compute units, priority fees, and how to read raw transaction data.',
      },
      {
        name: 'CLI & Tools',
        duration: '1.5h',
        description:
          'Hands-on with solana-cli, spl-token CLI, and explorer tools. Create wallets, airdrop devnet SOL, and inspect accounts.',
      },
      {
        name: 'Economics',
        duration: '1h',
        description:
          'Understand rent (storage fees), transaction fees, staking, and how inflation/deflation affects SOL supply.',
      },
    ],
    resources: [
      { type: 'docs', title: 'Solana Docs - Core Concepts', url: 'https://solana.com/docs/core' },
      {
        type: 'video',
        title: 'Solana Bootcamp',
        url: 'https://www.youtube.com/watch?v=0P8JeL3TURU',
      },
      { type: 'tool', title: 'Solana Explorer', url: 'https://explorer.solana.com' },
    ],
    projects: ['burns', 'holdex', 'forecast'],
  },

  web3_js: {
    id: 'web3_js',
    name: '@solana/kit',
    track: 'dev',
    icon: '🔗',
    difficulty: 2,
    xpReward: 400,
    estimatedHours: 12,
    description:
      'Build Solana dApps with the modern @solana/kit SDK. Learn to connect wallets, send transactions, and interact with programs from JavaScript/TypeScript.',
    prerequisites: ['solana_basics'],
    learningOutcomes: [
      'Set up a Solana dApp with wallet-standard adapters',
      'Create and sign transactions programmatically',
      'Fetch and deserialize account data',
      'Handle transaction confirmation and errors',
      'Implement optimistic UI updates',
    ],
    topics: [
      {
        name: 'Connection & RPC',
        duration: '2h',
        description:
          'Connecting to Solana clusters. Understanding RPC methods, rate limits, and when to use different providers (Helius, Triton, public RPC).',
      },
      {
        name: 'Wallet Adapters',
        duration: '2h',
        description:
          'wallet-standard integration. Support Phantom, Solflare, Backpack and more with a unified interface. Handle connection states and errors.',
      },
      {
        name: 'Transactions',
        duration: '3h',
        description:
          'Build transactions with TransactionMessage. Add instructions, set compute budget, handle versioned transactions and address lookup tables.',
      },
      {
        name: 'Account Fetching',
        duration: '2h',
        description:
          'getAccountInfo, getProgramAccounts, and account subscriptions. Deserialize data using Codama-generated types.',
      },
      {
        name: 'Error Handling',
        duration: '1.5h',
        description:
          'Transaction simulation, error parsing, and retry strategies. Build resilient dApps that handle network issues gracefully.',
      },
      {
        name: 'Testing',
        duration: '1.5h',
        description:
          'Unit testing with LiteSVM. Mocking wallets and RPC responses. Integration testing strategies.',
      },
    ],
    resources: [
      {
        type: 'docs',
        title: '@solana/kit Documentation',
        url: 'https://github.com/solana-labs/solana-web3.js',
      },
      { type: 'docs', title: 'Wallet Standard', url: 'https://wallet-standard.com' },
      { type: 'tool', title: 'Helius RPC', url: 'https://helius.dev' },
    ],
    projects: ['holdex', 'burns', 'forecast'],
  },

  anchor: {
    id: 'anchor',
    name: 'Anchor Framework',
    track: 'dev',
    icon: '⚓',
    difficulty: 3,
    xpReward: 600,
    estimatedHours: 20,
    description:
      'Build Solana programs with Anchor, the leading framework that abstracts low-level complexity. Write safe, readable Rust code with automatic account validation.',
    prerequisites: ['solana_basics'],
    learningOutcomes: [
      'Create Anchor programs with proper project structure',
      'Implement account constraints and validation',
      'Write CPIs (Cross-Program Invocations)',
      'Generate TypeScript clients with Codama',
      'Deploy and upgrade programs on devnet/mainnet',
    ],
    topics: [
      {
        name: 'Project Setup',
        duration: '2h',
        description:
          'anchor init, program structure, Anchor.toml configuration. Understanding the declare_id! macro and program modules.',
      },
      {
        name: 'Accounts & Constraints',
        duration: '4h',
        description:
          '#[account] attribute, space calculation, init/init_if_needed, has_one, seeds/bump for PDAs. The validation magic that makes Anchor safe.',
      },
      {
        name: 'Instructions',
        duration: '3h',
        description:
          'Defining instruction handlers, Context<T> pattern, accessing accounts, returning errors. Composing complex operations.',
      },
      {
        name: 'PDAs & Seeds',
        duration: '3h',
        description:
          'Program Derived Addresses in depth. Canonical bumps, seed patterns for different use cases, signing with PDAs.',
      },
      {
        name: 'CPIs',
        duration: '3h',
        description:
          'Cross-Program Invocations. Calling SPL Token, System Program, and custom programs. CPI context and signer seeds.',
      },
      {
        name: 'Testing & Deployment',
        duration: '3h',
        description:
          'anchor test with Bankrun, deployment commands, program upgrades, and authority management.',
      },
      {
        name: 'Client Generation',
        duration: '2h',
        description:
          'Codama IDL generation, TypeScript client usage, type-safe account fetching and instruction building.',
      },
    ],
    resources: [
      { type: 'docs', title: 'Anchor Book', url: 'https://book.anchor-lang.com' },
      {
        type: 'docs',
        title: 'Anchor Examples',
        url: 'https://github.com/coral-xyz/anchor/tree/master/examples',
      },
      {
        type: 'video',
        title: 'Anchor Tutorial Series',
        url: 'https://www.youtube.com/watch?v=cvW8EwGHw8U',
      },
    ],
    projects: ['burns'],
  },

  token_analysis: {
    id: 'token_analysis',
    name: 'Token Analysis',
    track: 'dev',
    icon: '📊',
    difficulty: 2,
    xpReward: 350,
    estimatedHours: 10,
    description:
      'Learn to analyze SPL tokens on Solana. Fetch metadata, track holder distribution, calculate metrics, and identify patterns in token economics.',
    prerequisites: ['solana_basics', 'web3_js'],
    learningOutcomes: [
      'Fetch token metadata from Metaplex',
      'Analyze holder distribution and concentration',
      'Calculate market cap, FDV, and liquidity metrics',
      'Identify suspicious token patterns (honeypots, rugs)',
      'Build token screening dashboards',
    ],
    topics: [
      {
        name: 'Token Metadata',
        duration: '2h',
        description:
          'Metaplex Token Metadata standard. Fetching name, symbol, URI, and off-chain JSON. Understanding token extensions.',
      },
      {
        name: 'Holder Analysis',
        duration: '2.5h',
        description:
          'getProgramAccounts for token accounts. Calculating top holders, concentration ratios, and distribution curves.',
      },
      {
        name: 'Market Metrics',
        duration: '2h',
        description:
          'Market cap vs FDV, circulating supply calculations, liquidity depth analysis using DEX pool data.',
      },
      {
        name: 'Red Flag Detection',
        duration: '2h',
        description:
          'Identifying honeypots, mint authority risks, freeze authority, and suspicious holder patterns.',
      },
      {
        name: 'Data Visualization',
        duration: '1.5h',
        description:
          'Building charts with Chart.js or D3. Displaying holder pie charts, price history, and volume analysis.',
      },
    ],
    resources: [
      { type: 'docs', title: 'Metaplex Docs', url: 'https://developers.metaplex.com' },
      { type: 'tool', title: 'Birdeye API', url: 'https://docs.birdeye.so' },
      { type: 'tool', title: 'DexScreener', url: 'https://dexscreener.com' },
    ],
    projects: ['holdex', 'forecast'],
  },

  smart_contracts: {
    id: 'smart_contracts',
    name: 'Smart Contract Security',
    track: 'dev',
    icon: '📜',
    difficulty: 3,
    xpReward: 500,
    estimatedHours: 15,
    description:
      'Write secure Solana programs. Learn common vulnerabilities, audit techniques, and best practices to protect user funds.',
    prerequisites: ['anchor'],
    learningOutcomes: [
      'Identify and prevent common Solana vulnerabilities',
      'Implement proper signer and owner checks',
      'Use secure arithmetic (checked_*, saturating_*)',
      'Audit programs for security issues',
      'Write comprehensive test coverage',
    ],
    topics: [
      {
        name: 'Common Vulnerabilities',
        duration: '3h',
        description:
          'Missing signer checks, owner confusion, integer overflow, reentrancy patterns, and PDA substitution attacks.',
      },
      {
        name: 'Secure Account Validation',
        duration: '2.5h',
        description:
          'Proper use of Anchor constraints. When to use has_one, constraint, and manual checks. Avoiding account confusion.',
      },
      {
        name: 'Arithmetic Safety',
        duration: '2h',
        description:
          'checked_add/sub/mul, saturating operations, and when to use each. Handling decimal precision in token amounts.',
      },
      {
        name: 'Access Control',
        duration: '2h',
        description:
          'Authority patterns, multi-sig requirements, timelock mechanisms, and upgrade authority best practices.',
      },
      {
        name: 'Audit Methodology',
        duration: '3h',
        description:
          'How to audit Solana programs. Tools (Soteria, cargo-audit), manual review checklist, and common audit findings.',
      },
      {
        name: 'Testing for Security',
        duration: '2.5h',
        description:
          'Fuzzing with Trident, property-based testing, and attack scenario simulation.',
      },
    ],
    resources: [
      {
        type: 'docs',
        title: 'Solana Security Best Practices',
        url: 'https://github.com/coral-xyz/sealevel-attacks',
      },
      {
        type: 'docs',
        title: 'Neodyme Audit Reports',
        url: 'https://github.com/neodyme-labs/solana-security-txt',
      },
      { type: 'tool', title: 'Soteria', url: 'https://www.soteria.dev' },
    ],
    projects: ['burns'],
  },

  api_integration: {
    id: 'api_integration',
    name: 'API Integration',
    track: 'dev',
    icon: '🔌',
    difficulty: 2,
    xpReward: 350,
    estimatedHours: 10,
    description:
      'Connect to external APIs and data sources. Build backends that aggregate blockchain and off-chain data for rich user experiences.',
    prerequisites: ['web3_js'],
    learningOutcomes: [
      'Integrate Helius, Jupiter, and Birdeye APIs',
      'Build rate-limited API clients',
      'Cache responses for performance',
      'Handle webhooks for real-time updates',
      'Design RESTful APIs for dApps',
    ],
    topics: [
      {
        name: 'Helius API',
        duration: '2h',
        description:
          'Enhanced RPC methods, DAS API for NFTs, transaction history, and webhooks for real-time events.',
      },
      {
        name: 'Jupiter Integration',
        duration: '2h',
        description:
          'Quote API, swap execution, route optimization, and handling slippage. Building swap interfaces.',
      },
      {
        name: 'Rate Limiting & Caching',
        duration: '2h',
        description:
          'Respecting API limits, implementing exponential backoff, and caching with Redis or in-memory stores.',
      },
      {
        name: 'Webhooks',
        duration: '2h',
        description:
          'Setting up webhook endpoints, verifying payloads, and processing real-time blockchain events.',
      },
      {
        name: 'API Design',
        duration: '2h',
        description:
          'RESTful best practices, versioning, authentication, and documentation with OpenAPI.',
      },
    ],
    resources: [
      { type: 'docs', title: 'Helius Docs', url: 'https://docs.helius.dev' },
      { type: 'docs', title: 'Jupiter API', url: 'https://station.jup.ag/docs' },
      { type: 'docs', title: 'Birdeye API', url: 'https://docs.birdeye.so' },
    ],
    projects: ['holdex', 'burns', 'forecast'],
  },

  data_viz: {
    id: 'data_viz',
    name: 'Data Visualization',
    track: 'dev',
    icon: '📈',
    difficulty: 2,
    xpReward: 300,
    estimatedHours: 8,
    description:
      'Transform blockchain data into compelling visualizations. Build charts, dashboards, and real-time displays that make complex data accessible.',
    prerequisites: ['web3_js'],
    learningOutcomes: [
      'Create interactive charts with Chart.js',
      'Build real-time updating dashboards',
      'Visualize token holder distributions',
      'Design effective data displays',
      'Optimize rendering for large datasets',
    ],
    topics: [
      {
        name: 'Chart.js Fundamentals',
        duration: '2h',
        description:
          'Line, bar, pie, and doughnut charts. Configuration, animations, and responsive design.',
      },
      {
        name: 'Real-time Updates',
        duration: '2h',
        description:
          'WebSocket connections for live data. Efficient chart updates without full redraws.',
      },
      {
        name: 'Dashboard Design',
        duration: '2h',
        description:
          'Layout principles, color theory for data, and building cohesive multi-chart dashboards.',
      },
      {
        name: 'Performance',
        duration: '2h',
        description:
          'Handling large datasets, data decimation, and canvas optimization techniques.',
      },
    ],
    resources: [
      { type: 'docs', title: 'Chart.js Docs', url: 'https://www.chartjs.org/docs' },
      {
        type: 'tool',
        title: 'TradingView Lightweight Charts',
        url: 'https://tradingview.github.io/lightweight-charts',
      },
    ],
    projects: ['holdex', 'burns', 'forecast'],
  },

  burn_mechanics: {
    id: 'burn_mechanics',
    name: 'Burn Mechanics',
    track: 'dev',
    icon: '🔥',
    difficulty: 3,
    xpReward: 500,
    estimatedHours: 12,
    description:
      'Master token burn mechanisms. Implement deflationary tokenomics, track burns on-chain, and build burn-integrated applications.',
    prerequisites: ['anchor', 'smart_contracts'],
    learningOutcomes: [
      'Implement SPL Token burn instructions',
      'Design automatic burn mechanisms',
      'Track and aggregate burn events',
      'Calculate deflation rates and projections',
      'Build burn-enabled applications',
    ],
    topics: [
      {
        name: 'SPL Token Burns',
        duration: '2h',
        description:
          'The burn instruction, authority requirements, and tracking burn transactions.',
      },
      {
        name: 'Automatic Burns',
        duration: '3h',
        description:
          'Implementing burns on transfer via CPI. Configurable rates, exemptions, and governance.',
      },
      {
        name: 'Burn Tracking',
        duration: '2.5h',
        description: 'Indexing burn events, calculating totals, and building historical analytics.',
      },
      {
        name: 'Deflation Economics',
        duration: '2h',
        description:
          'Modeling token supply over time, projecting burn impacts, and visualizing deflation.',
      },
      {
        name: 'Integration Patterns',
        duration: '2.5h',
        description: 'Burn-to-earn, burn-to-unlock, and other creative burn mechanisms.',
      },
    ],
    resources: [
      { type: 'docs', title: 'SPL Token Program', url: 'https://spl.solana.com/token' },
      {
        type: 'code',
        title: 'Burn Engine Source',
        url: 'https://github.com/asdf-ecosystem/burn-engine',
      },
    ],
    projects: ['burns'],
  },

  // ═══════════════════════════════════════════════════════════════
  // GAMES TRACK - Game Development Skills
  // ═══════════════════════════════════════════════════════════════

  game_design: {
    id: 'game_design',
    name: 'Game Design',
    track: 'games',
    icon: '🎲',
    difficulty: 2,
    xpReward: 400,
    estimatedHours: 12,
    description:
      'Learn the fundamentals of game design. Create engaging experiences through mechanics, loops, and player psychology.',
    prerequisites: [],
    learningOutcomes: [
      'Design core gameplay loops',
      'Create meaningful player choices',
      'Balance risk vs reward',
      'Write effective Game Design Documents',
      'Playtest and iterate on designs',
    ],
    topics: [
      {
        name: 'Core Loops',
        duration: '2.5h',
        description:
          'The action-reward-progression cycle. How to keep players engaged minute-to-minute and session-to-session.',
      },
      {
        name: 'Player Psychology',
        duration: '2h',
        description:
          'Motivation types (achievement, social, immersion), flow state, and ethical engagement design.',
      },
      {
        name: 'Mechanics & Dynamics',
        duration: '2.5h',
        description:
          'Rules vs emergent behavior. How simple mechanics create complex, interesting gameplay.',
      },
      {
        name: 'Balance & Economy',
        duration: '2.5h',
        description: 'Resource balancing, difficulty curves, and economy sinks/faucets.',
      },
      {
        name: 'Documentation',
        duration: '2.5h',
        description:
          'Writing GDDs, one-pagers, and pitch documents. Communicating design intent clearly.',
      },
    ],
    resources: [
      {
        type: 'book',
        title: 'The Art of Game Design',
        url: 'https://www.schellgames.com/art-of-game-design',
      },
      { type: 'video', title: 'GDC Vault', url: 'https://gdcvault.com' },
    ],
    projects: ['pumparena', 'arcade'],
  },

  pixel_art: {
    id: 'pixel_art',
    name: 'Pixel Art',
    track: 'games',
    icon: '🎨',
    difficulty: 1,
    xpReward: 250,
    estimatedHours: 8,
    description:
      'Create charming pixel art for games. Learn color theory, animation principles, and efficient sprite creation.',
    prerequisites: [],
    learningOutcomes: [
      'Create readable sprites at low resolutions',
      'Apply color theory for pixel art',
      'Animate characters and effects',
      'Design consistent tilesets',
      'Optimize assets for web performance',
    ],
    topics: [
      {
        name: 'Fundamentals',
        duration: '2h',
        description: 'Canvas size, pixel density, and the constraints that make pixel art unique.',
      },
      {
        name: 'Color Palettes',
        duration: '2h',
        description:
          'Limited palettes, color ramps, and how to create cohesive visual styles with few colors.',
      },
      {
        name: 'Character Sprites',
        duration: '2h',
        description: 'Designing readable characters. Silhouettes, contrast, and expressive poses.',
      },
      {
        name: 'Animation',
        duration: '2h',
        description:
          'Frame-by-frame animation, anticipation, follow-through, and making sprites feel alive.',
      },
    ],
    resources: [
      { type: 'tool', title: 'Aseprite', url: 'https://www.aseprite.org' },
      {
        type: 'tutorial',
        title: 'Pixel Art Tutorials',
        url: 'https://lospec.com/pixel-art-tutorials',
      },
    ],
    projects: ['arcade', 'pumparena'],
  },

  game_economy: {
    id: 'game_economy',
    name: 'Game Economy',
    track: 'games',
    icon: '💰',
    difficulty: 3,
    xpReward: 500,
    estimatedHours: 15,
    description:
      'Design sustainable game economies. Balance earning, spending, and trading to create engaging long-term gameplay.',
    prerequisites: ['game_design'],
    learningOutcomes: [
      'Design currency sinks and faucets',
      'Model economy simulations',
      'Prevent inflation and exploitation',
      'Integrate blockchain rewards sustainably',
      'Analyze player behavior economics',
    ],
    topics: [
      {
        name: 'Sinks & Faucets',
        duration: '3h',
        description:
          'Where currency enters and exits the economy. Balancing generation with consumption.',
      },
      {
        name: 'Economy Modeling',
        duration: '3h',
        description:
          'Spreadsheet simulations, Monte Carlo methods, and predicting long-term economy health.',
      },
      {
        name: 'Anti-Exploitation',
        duration: '3h',
        description:
          'Preventing bots, multi-accounting, and economic exploits without ruining legitimate play.',
      },
      {
        name: 'Blockchain Integration',
        duration: '3h',
        description:
          'Token rewards that do not destroy game balance. Separating on-chain and off-chain economies.',
      },
      {
        name: 'Analytics',
        duration: '3h',
        description:
          'Tracking economic health metrics, detecting issues early, and adjusting parameters.',
      },
    ],
    resources: [
      { type: 'article', title: 'Game Economy Design', url: 'https://www.gameanalytics.com' },
      { type: 'video', title: 'GDC Economy Talks', url: 'https://gdcvault.com' },
    ],
    projects: ['pumparena'],
  },

  multiplayer: {
    id: 'multiplayer',
    name: 'Multiplayer Systems',
    track: 'games',
    icon: '👥',
    difficulty: 3,
    xpReward: 500,
    estimatedHours: 16,
    description:
      'Build real-time multiplayer games. Handle networking, synchronization, and the unique challenges of competitive online play.',
    prerequisites: ['game_design'],
    learningOutcomes: [
      'Implement client-server architecture',
      'Handle network latency and prediction',
      'Design authoritative server logic',
      'Build matchmaking systems',
      'Prevent cheating in multiplayer',
    ],
    topics: [
      {
        name: 'Architecture',
        duration: '3h',
        description:
          'Client-server vs peer-to-peer. Why authoritative servers matter for competitive games.',
      },
      {
        name: 'WebSockets',
        duration: '3h',
        description:
          'Real-time communication with WebSockets. Message serialization, reconnection handling.',
      },
      {
        name: 'State Synchronization',
        duration: '3h',
        description:
          'Keeping game state consistent. Delta compression, interpolation, and client-side prediction.',
      },
      {
        name: 'Matchmaking',
        duration: '3h',
        description: 'Skill-based matchmaking (Elo, Glicko), queue systems, and lobby management.',
      },
      {
        name: 'Anti-Cheat',
        duration: '4h',
        description: 'Server-side validation, rate limiting, and detecting impossible game states.',
      },
    ],
    resources: [
      {
        type: 'article',
        title: 'Source Multiplayer Networking',
        url: 'https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking',
      },
      { type: 'docs', title: 'Socket.io Docs', url: 'https://socket.io/docs' },
    ],
    projects: ['pumparena'],
  },

  leaderboards: {
    id: 'leaderboards',
    name: 'Leaderboards & Rankings',
    track: 'games',
    icon: '🏆',
    difficulty: 2,
    xpReward: 350,
    estimatedHours: 10,
    description:
      'Implement competitive ranking systems. Build leaderboards that motivate players while preventing abuse.',
    prerequisites: ['game_design'],
    learningOutcomes: [
      'Design ranking algorithms',
      'Build scalable leaderboard backends',
      'Implement seasonal resets',
      'Prevent score manipulation',
      'Create engaging competition formats',
    ],
    topics: [
      {
        name: 'Ranking Systems',
        duration: '2.5h',
        description: 'Elo, Glicko-2, TrueSkill. When to use each and how to tune parameters.',
      },
      {
        name: 'Database Design',
        duration: '2.5h',
        description:
          'Redis sorted sets for real-time leaderboards. PostgreSQL for historical data.',
      },
      {
        name: 'Seasons & Resets',
        duration: '2h',
        description: 'Why seasons matter. Soft resets, placement matches, and reward distribution.',
      },
      {
        name: 'Anti-Abuse',
        duration: '3h',
        description: 'Score validation, rate limiting, and detecting boosting/win-trading.',
      },
    ],
    resources: [
      {
        type: 'article',
        title: 'Elo Rating System',
        url: 'https://en.wikipedia.org/wiki/Elo_rating_system',
      },
      {
        type: 'docs',
        title: 'Redis Sorted Sets',
        url: 'https://redis.io/docs/data-types/sorted-sets',
      },
    ],
    projects: ['arcade', 'pumparena'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CONTENT TRACK - Content Creation Skills
  // ═══════════════════════════════════════════════════════════════

  writing: {
    id: 'writing',
    name: 'Technical Writing',
    track: 'content',
    icon: '✍️',
    difficulty: 1,
    xpReward: 250,
    estimatedHours: 8,
    description:
      'Write clear, effective technical documentation. Learn to explain complex concepts to different audiences.',
    prerequisites: [],
    learningOutcomes: [
      'Structure documentation effectively',
      'Write for different technical levels',
      'Create useful code examples',
      'Edit for clarity and concision',
      'Maintain documentation over time',
    ],
    topics: [
      {
        name: 'Documentation Types',
        duration: '2h',
        description: 'Tutorials, how-tos, explanations, and references. When to use each format.',
      },
      {
        name: 'Audience Analysis',
        duration: '1.5h',
        description: 'Writing for beginners vs experts. Adjusting technical depth appropriately.',
      },
      {
        name: 'Code Examples',
        duration: '2h',
        description:
          'Writing examples that teach. Progressive complexity and real-world relevance.',
      },
      {
        name: 'Editing',
        duration: '2.5h',
        description: 'Cutting unnecessary words, improving flow, and maintaining consistency.',
      },
    ],
    resources: [
      { type: 'book', title: 'Docs for Developers', url: 'https://docsfordevelopers.com' },
      {
        type: 'guide',
        title: 'Google Developer Documentation Style Guide',
        url: 'https://developers.google.com/style',
      },
    ],
    projects: ['learn', 'manifesto'],
  },

  philosophy: {
    id: 'philosophy',
    name: 'Web3 Philosophy',
    track: 'content',
    icon: '🧠',
    difficulty: 2,
    xpReward: 350,
    estimatedHours: 10,
    description:
      'Understand the philosophical foundations of Web3. Explore decentralization, ownership, and the future of digital society.',
    prerequisites: [],
    learningOutcomes: [
      'Articulate the case for decentralization',
      'Explain token economics philosophically',
      'Discuss digital ownership implications',
      'Critique Web3 narratives constructively',
      'Write compelling vision documents',
    ],
    topics: [
      {
        name: 'Decentralization',
        duration: '2.5h',
        description:
          'Why decentralization matters. Trust minimization, censorship resistance, and coordination.',
      },
      {
        name: 'Digital Ownership',
        duration: '2h',
        description:
          'What does it mean to own digital assets? NFTs, tokens, and the nature of property.',
      },
      {
        name: 'Tokenomics Philosophy',
        duration: '2.5h',
        description: 'Tokens as coordination tools. Incentive alignment and game theory basics.',
      },
      {
        name: 'Critique & Nuance',
        duration: '3h',
        description:
          'Honest assessment of Web3 limitations. Avoiding maximalism while maintaining conviction.',
      },
    ],
    resources: [
      { type: 'article', title: 'Why Decentralization Matters', url: 'https://cdixon.org' },
      { type: 'book', title: 'The Network State', url: 'https://thenetworkstate.com' },
    ],
    projects: ['manifesto'],
  },

  teaching: {
    id: 'teaching',
    name: 'Educational Design',
    track: 'content',
    icon: '📚',
    difficulty: 2,
    xpReward: 350,
    estimatedHours: 10,
    description:
      'Design effective learning experiences. Create content that actually teaches, not just informs.',
    prerequisites: ['writing'],
    learningOutcomes: [
      'Apply learning science principles',
      'Design progressive curricula',
      'Create effective assessments',
      'Build engaging interactive content',
      'Measure learning outcomes',
    ],
    topics: [
      {
        name: 'Learning Science',
        duration: '2.5h',
        description:
          'How people actually learn. Spaced repetition, active recall, and cognitive load theory.',
      },
      {
        name: 'Curriculum Design',
        duration: '2.5h',
        description:
          'Sequencing content for optimal learning. Prerequisites, scaffolding, and learning paths.',
      },
      {
        name: 'Assessment',
        duration: '2h',
        description:
          'Quizzes, projects, and other ways to verify understanding. Formative vs summative.',
      },
      {
        name: 'Engagement',
        duration: '3h',
        description:
          'Gamification that works. Progress systems, achievements, and social learning.',
      },
    ],
    resources: [
      { type: 'book', title: 'Make It Stick', url: 'https://www.hup.harvard.edu' },
      {
        type: 'course',
        title: 'Learning How to Learn',
        url: 'https://www.coursera.org/learn/learning-how-to-learn',
      },
    ],
    projects: ['learn', 'journey'],
  },

  storytelling: {
    id: 'storytelling',
    name: 'Narrative Design',
    track: 'content',
    icon: '📖',
    difficulty: 2,
    xpReward: 350,
    estimatedHours: 10,
    description:
      'Craft compelling narratives for Web3 projects. Build worlds, characters, and stories that resonate.',
    prerequisites: [],
    learningOutcomes: [
      'Structure engaging narratives',
      'Create memorable characters',
      'Build consistent world lore',
      'Write for interactive media',
      'Integrate story with gameplay/UX',
    ],
    topics: [
      {
        name: 'Story Structure',
        duration: '2.5h',
        description:
          'Three-act structure, hero journey, and other frameworks. When to follow or break rules.',
      },
      {
        name: 'Character Development',
        duration: '2h',
        description: 'Creating characters users care about. Motivation, conflict, and growth.',
      },
      {
        name: 'World Building',
        duration: '2.5h',
        description:
          'Creating consistent, interesting worlds. Lore that enhances without overwhelming.',
      },
      {
        name: 'Interactive Narrative',
        duration: '3h',
        description:
          'Story in games and apps. Player agency, branching paths, and environmental storytelling.',
      },
    ],
    resources: [
      { type: 'book', title: 'Story', url: 'https://www.goodreads.com/book/show/48654.Story' },
      { type: 'video', title: 'GDC Narrative Talks', url: 'https://gdcvault.com' },
    ],
    projects: ['journey', 'manifesto'],
  },

  community: {
    id: 'community',
    name: 'Community Building',
    track: 'content',
    icon: '🤝',
    difficulty: 2,
    xpReward: 350,
    estimatedHours: 12,
    description:
      'Build and nurture thriving communities. Learn moderation, engagement, and sustainable growth strategies.',
    prerequisites: [],
    learningOutcomes: [
      'Design community structures',
      'Moderate effectively and fairly',
      'Create engagement programs',
      'Measure community health',
      'Handle conflicts constructively',
    ],
    topics: [
      {
        name: 'Community Design',
        duration: '2.5h',
        description:
          'Channels, roles, and structure. Creating spaces for different types of interaction.',
      },
      {
        name: 'Moderation',
        duration: '3h',
        description: 'Rules, enforcement, and building a healthy culture. Dealing with bad actors.',
      },
      {
        name: 'Engagement',
        duration: '3h',
        description:
          'Events, AMAs, and activities that bring people together. Sustainable vs extractive engagement.',
      },
      {
        name: 'Growth',
        duration: '2h',
        description: 'Organic growth strategies. Quality over quantity. Ambassador programs.',
      },
      {
        name: 'Analytics',
        duration: '1.5h',
        description:
          'Measuring community health. Engagement metrics, sentiment, and early warning signs.',
      },
    ],
    resources: [
      { type: 'book', title: 'The Art of Community', url: 'https://www.jonobacon.com' },
      { type: 'tool', title: 'Discord Best Practices', url: 'https://discord.com/safety' },
    ],
    projects: ['learn', 'journey'],
  },
};

/**
 * Get skill by ID
 */
export function getSkill(skillId) {
  return SKILLS_DATA[skillId] || null;
}

/**
 * Get skills by track
 */
export function getSkillsByTrack(trackId) {
  return Object.values(SKILLS_DATA).filter(s => s.track === trackId);
}

/**
 * Get skills for a project
 */
export function getSkillsForProject(projectSkillIds) {
  return projectSkillIds.map(id => SKILLS_DATA[id]).filter(Boolean);
}

export default SKILLS_DATA;
