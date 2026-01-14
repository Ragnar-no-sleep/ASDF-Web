/**
 * build.js - Yggdrasil World Tree & Marketplace
 * 3-Level Documentation System: Summary → Doc → Deep Learn
 * Feature Modal with Pedagogical Explanations (What/How/Why)
 */

'use strict';

// ============================================
// SECURITY UTILITIES - XSS Protection
// ============================================

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

/**
 * Sanitize HTML content using DOMPurify
 */
function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'span',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'dl',
        'dt',
        'dd',
        'a',
        'img',
        'figure',
        'figcaption',
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'th',
        'td',
        'pre',
        'code',
        'blockquote',
        'hr',
        'svg',
        'path',
        'circle',
        'rect',
        'line',
        'g',
        'defs',
        'linearGradient',
        'radialGradient',
        'stop',
        'marker',
        'polygon',
        'text',
        'textPath',
        'use',
        'tspan',
      ],
      ALLOWED_ATTR: [
        'href',
        'src',
        'alt',
        'title',
        'class',
        'id',
        'style',
        'data-*',
        'type',
        'value',
        'placeholder',
        'disabled',
        'target',
        'rel',
        'width',
        'height',
        'viewBox',
        'd',
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-dasharray',
        'opacity',
        'transform',
        'preserveAspectRatio',
        'cx',
        'cy',
        'r',
        'x',
        'y',
        'x1',
        'y1',
        'x2',
        'y2',
        'font-family',
        'font-size',
        'font-weight',
        'text-anchor',
        'startOffset',
        'offset',
        'stop-color',
        'stop-opacity',
        'markerWidth',
        'markerHeight',
        'refX',
        'refY',
        'orient',
        'points',
        'rx',
        'ry',
      ],
      ALLOW_DATA_ATTR: true,
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });
  }
  console.warn('[Security] DOMPurify not loaded, using basic escaping');
  return escapeHtml(html);
}

/**
 * Safely set innerHTML with sanitization
 */
function safeInnerHTML(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHtml(html);
}

document.addEventListener('DOMContentLoaded', function () {
  // ============================================
  // PROJECT DATA - Complete Documentation
  // ============================================
  const projectsData = {
    'burn-engine': {
      icon: '🔥',
      title: 'Burn Engine',
      status: 'live',
      overview:
        'The core protocol that powers the entire ASDF ecosystem. Burn Engine implements the Optimistic Burn mechanism, automatically burning tokens on every transaction to create sustainable deflation.',
      features: [
        {
          name: 'Automatic burn on every transaction',
          what: 'Every time someone transfers, swaps, or interacts with ASDF tokens, a small percentage is automatically sent to a burn address, permanently removing it from circulation.',
          how: 'The smart contract hooks into the SPL Token transfer instruction using a Program Derived Address (PDA). Before completing any transfer, it calculates the burn amount and executes a CPI (Cross-Program Invocation) to the burn instruction.',
          why: 'This creates sustainable deflation without requiring user action. Unlike manual burns, this ensures consistent supply reduction with every transaction, increasing scarcity over time.',
        },
        {
          name: 'Configurable burn percentage',
          what: 'The burn rate can be adjusted by governance, allowing the community to fine-tune deflation based on market conditions.',
          how: 'The burn percentage is stored on-chain in a configuration account. Admin functions protected by multi-sig can update this value. The contract reads this value at execution time.',
          why: 'Flexibility is crucial for long-term sustainability. High burn rates work in bull markets but may be reduced during low activity periods to maintain healthy liquidity.',
        },
        {
          name: 'Real-time burn tracking',
          what: 'Every burn event is logged and indexed, providing transparent, verifiable data on total supply reduction.',
          how: 'The contract emits events after each burn. Helius webhooks capture these events and push them to the Burn Tracker service, which stores and aggregates the data.',
          why: 'Transparency builds trust. Users can verify that burns are happening as promised and track the cumulative impact on token supply.',
        },
        {
          name: 'On-chain transparency',
          what: 'All burn operations are recorded directly on the Solana blockchain, creating an immutable audit trail.',
          how: 'Each burn creates a transaction with the burn instruction. The transaction signature, amount, and timestamp are permanently stored on-chain and can be verified by anyone.',
          why: 'Blockchain transparency eliminates the need for trust. Anyone can independently verify burns without relying on third-party reports.',
        },
        {
          name: 'Multi-wallet support',
          what: 'The burn mechanism works across all wallets - hot wallets, hardware wallets, and program-owned accounts.',
          how: 'The burn instruction is wallet-agnostic. It only requires the token account to have sufficient balance. The burn authority is held by the program, not individual wallets.',
          why: 'Universality ensures no user is excluded. Whether using Phantom, Ledger, or a custom solution, the burn mechanism works identically.',
        },
      ],
      tech: ['Solana', 'Rust', 'Anchor', 'SPL Token'],
      dependencies:
        'Helius RPC for reliable transaction processing. Jupiter for swap integrations.',
      architecture:
        'The Burn Engine uses a Program Derived Address (PDA) to manage burn operations. Each transaction triggers a CPI call to the SPL Token burn instruction. The protocol maintains a registry of burn events indexed by Helius webhooks.',
      miniTree: [
        {
          icon: '🔧',
          name: 'Core Burn Logic',
          status: 'completed',
          what: 'The fundamental algorithm that calculates and executes token burns on every transaction.',
          how: 'Rust smart contract intercepts SPL Token transfers via CPI hooks. Calculates burn amount based on configurable rate (default 0.5%), executes burn instruction atomically with transfer.',
          why: 'Automatic, trustless deflation without user action. Every transaction strengthens the token economics without requiring manual burns.',
          future:
            'Dynamic burn rates based on market conditions. Governance-controlled rate adjustments.',
        },
        {
          icon: '📊',
          name: 'Transaction Parser',
          status: 'completed',
          what: 'Analyzes incoming transactions to identify burn-eligible operations and extract relevant data.',
          how: 'Parses Solana instruction data to identify token transfers. Extracts source/destination accounts, amounts, and computes burn calculations in real-time.',
          why: 'Accurate parsing ensures correct burn amounts. Prevents edge cases like failed burns or incorrect calculations.',
          future: 'Support for complex multi-instruction transactions. Batch burn optimization.',
        },
        {
          icon: '🔗',
          name: 'Helius Integration',
          status: 'completed',
          what: 'Connection to Helius RPC infrastructure for reliable transaction processing and event indexing.',
          how: 'Uses Helius Enhanced API for transaction simulation. Webhooks notify backend of burn events. DAS API for NFT metadata if needed.',
          why: 'Helius provides enterprise-grade reliability. Webhook system enables real-time tracking without constant polling.',
          future: 'Multi-provider fallback system. Geographic load balancing for global users.',
        },
        {
          icon: '📈',
          name: 'Analytics Module',
          status: 'completed',
          what: 'Collects and aggregates burn statistics for reporting and visualization.',
          how: 'Time-series database stores every burn event. Aggregation queries compute daily/weekly/monthly totals. Caching layer for frequently accessed metrics.',
          why: 'Transparent analytics build community trust. Data-driven insights help ecosystem decision-making.',
          future: 'Predictive analytics using ML. Anomaly detection for unusual burn patterns.',
        },
        {
          icon: '🛡️',
          name: 'Security Audit',
          status: 'in-progress',
          what: 'Comprehensive third-party security review of all smart contract code.',
          how: 'OtterSec conducting line-by-line code review. Fuzzing tests for edge cases. Formal verification of critical paths.',
          why: 'Security is paramount for DeFi. Audit provides confidence to users and partners. Required for serious integrations.',
          future:
            'Continuous audit program. Bug bounty expansion. Regular re-audits after major updates.',
        },
        {
          icon: '🌐',
          name: 'Cross-chain Bridge',
          status: 'planned',
          what: 'Enable burn mechanism to work across multiple blockchains beyond Solana.',
          how: 'Wormhole/LayerZero integration for cross-chain messaging. Burn on source chain, mint wrapped on destination (or vice versa).',
          why: 'Multi-chain presence expands reach. Users on Ethereum, Base can participate in the burn ecosystem.',
          future: 'Native bridges to EVM chains. Unified burn tracking across all chains.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Complete security audit with OtterSec' },
        { phase: 'Q2', text: 'Implement configurable burn rates per token' },
        { phase: 'Q3', text: 'Launch cross-chain burn synchronization' },
      ],
      integrations: ['Helius RPC', 'Jupiter', 'Raydium', 'Metaplex'],
      github: 'https://github.com/asdf-ecosystem/burn-engine',
      demo: null,
    },
    'burn-tracker': {
      icon: '📊',
      title: 'Burn Tracker',
      status: 'live',
      overview:
        'Real-time dashboard monitoring all burn transactions across the ecosystem. Aggregates data from on-chain events, calculates deflation metrics, and projects future supply based on historical burn rates.',
      features: [
        {
          name: 'Live burn feed with transaction details',
          what: 'A real-time stream showing every burn as it happens, including amount, wallet, and timestamp.',
          how: 'WebSocket connection to the backend receives push notifications from Helius webhooks. Each burn event is parsed and immediately displayed in the UI feed.',
          why: 'Immediate visibility creates engagement and trust. Users can watch burns happen in real-time, reinforcing the deflationary narrative.',
        },
        {
          name: 'Historical charts and analytics',
          what: 'Interactive charts showing burn trends over time - daily, weekly, monthly breakdowns with comparison tools.',
          how: 'PostgreSQL stores all historical burn data. The API aggregates this data into time-series buckets. Chart.js renders interactive visualizations on the frontend.',
          why: 'Historical data reveals patterns. Users can see if burn rates are increasing, correlate with price action, and make informed decisions.',
        },
        {
          name: 'Supply projection calculator',
          what: 'A tool that projects future token supply based on current burn rates and customizable assumptions.',
          how: 'Takes historical burn rate averages, applies user-defined growth assumptions, and calculates supply reduction curves using mathematical models.',
          why: 'Helps users understand long-term impact. Seeing projected supply in 1, 5, or 10 years makes the deflationary mechanism tangible.',
        },
        {
          name: 'Discord/Telegram alerts',
          what: 'Automated notifications when significant burns occur or milestones are reached.',
          how: 'Threshold-based alert system monitors burn amounts. When conditions are met, webhooks trigger messages to Discord and Telegram bots.',
          why: 'Keeps the community informed and engaged. Milestone alerts create shareable moments and drive social proof.',
        },
        {
          name: 'Public REST API',
          what: 'Open API allowing third parties to access burn data for their own applications.',
          how: 'Express.js API with rate limiting exposes endpoints for total burns, recent transactions, and aggregated statistics in JSON format.',
          why: 'Encourages ecosystem growth. Third-party tools, bots, and dashboards can integrate burn data without scraping.',
        },
      ],
      tech: ['Node.js', 'Express', 'WebSockets', 'PostgreSQL', 'Chart.js'],
      dependencies: 'Relies on Burn Engine events. Uses Helius webhooks for real-time updates.',
      architecture:
        'Backend service subscribes to Helius webhooks for burn events. PostgreSQL stores historical data with time-series optimization. WebSocket server pushes updates to connected clients. Rate-limited public API exposes burn statistics.',
      miniTree: [
        {
          icon: '📡',
          name: 'Webhook Listener',
          status: 'completed',
          what: 'A background service that receives and processes real-time burn event notifications from the blockchain.',
          how: 'Node.js server listens on a secure endpoint. Helius webhooks POST transaction data when burns occur. Events are validated, parsed, and queued for processing.',
          why: 'Real-time tracking without polling. Instant updates mean users see burns within seconds of on-chain confirmation.',
          future: 'Multi-chain webhook support. Priority queuing for large burns.',
        },
        {
          icon: '💾',
          name: 'Data Pipeline',
          status: 'completed',
          what: 'The system that transforms raw blockchain data into structured, queryable records.',
          how: 'Message queue (Bull) handles incoming events. Worker processes extract relevant fields, enrich with metadata, and insert into PostgreSQL with proper indexing.',
          why: 'Clean data enables powerful queries. Proper pipeline design ensures no burns are lost even during high traffic.',
          future: 'Real-time data validation. Automatic backfill for missed events.',
        },
        {
          icon: '📈',
          name: 'Analytics Engine',
          status: 'completed',
          what: 'Calculates aggregated statistics, trends, and projections from historical burn data.',
          how: 'Scheduled jobs compute daily/weekly/monthly aggregates. Moving averages, growth rates, and supply projections are cached in Redis for fast access.',
          why: 'Raw data is overwhelming. Analytics transforms numbers into meaningful insights like "5% supply burned this month".',
          future: 'ML-powered predictions. Anomaly detection for unusual patterns.',
        },
        {
          icon: '🌐',
          name: 'REST API',
          status: 'completed',
          what: 'Public endpoints allowing developers to access burn data programmatically.',
          how: 'Express.js API with versioned routes. Rate limiting via Redis. Responses in JSON with pagination support. OpenAPI documentation.',
          why: 'Opens the ecosystem to builders. Bots, dashboards, and tools can integrate burn data without special access.',
          future: 'GraphQL endpoint. Websocket subscriptions for real-time feeds.',
        },
        {
          icon: '📱',
          name: 'Embeddable Widget',
          status: 'in-progress',
          what: 'A plug-and-play component other websites can embed to show live burn stats.',
          how: 'Lightweight JavaScript bundle loads via CDN. Fetches data from API, renders customizable UI in an iframe or shadow DOM.',
          why: 'Expands visibility across the web. Partner sites can show burns without building custom integrations.',
          future: 'Theme customization. Interactive chart widgets.',
        },
        {
          icon: '🤖',
          name: 'Telegram Bot',
          status: 'planned',
          what: 'A Telegram bot providing burn notifications and on-demand statistics.',
          how: 'Node.js bot using telegraf library. Commands like /burns, /stats, /subscribe. Webhook integration for real-time alerts.',
          why: 'Meet users where they are. Telegram is huge in crypto - instant access to burn data via chat.',
          future: 'Group stats commands. Personalized watchlists. Multi-language support.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Launch embeddable widget for third-party sites' },
        { phase: 'Q2', text: 'ML-based burn rate predictions' },
        { phase: 'Q3', text: 'Multi-token comparison dashboard' },
      ],
      integrations: ['Burn Engine', 'Helius', 'Discord', 'Telegram'],
      github: 'https://github.com/asdf-ecosystem/burn-tracker',
      demo: 'https://alonisthe.dev/burns',
    },
    'token-launcher': {
      icon: '🚀',
      title: 'Token Launcher',
      status: 'live',
      overview:
        'One-click Solana SPL token deployment platform. Handles metadata creation via Metaplex, automatic liquidity pool setup on Raydium, and initial distribution configuration.',
      features: [
        {
          name: 'SPL Token creation wizard',
          what: 'Step-by-step interface guiding users through token creation without requiring coding knowledge.',
          how: 'React wizard component collects name, symbol, decimals, and supply. Backend validates inputs and constructs the create mint transaction using Solana Web3.js.',
          why: 'Democratizes token creation. Projects without technical teams can launch tokens in minutes, lowering barriers to entry.',
        },
        {
          name: 'Metaplex metadata setup',
          what: 'Automatic creation of on-chain metadata including name, symbol, logo, and description following Metaplex standards.',
          how: 'Metaplex SDK creates the metadata account linked to the mint. Logo is uploaded to Arweave for permanent storage. URI is generated and stored on-chain.',
          why: 'Metadata is essential for wallet and explorer display. Without it, tokens appear as unknown. Metaplex ensures compatibility across the ecosystem.',
        },
        {
          name: 'Auto Raydium pool creation',
          what: 'One-click liquidity pool setup on Raydium with customizable initial liquidity.',
          how: 'After token creation, the platform calls Raydium SDK to create an AMM pool. User provides initial SOL/token ratio. Pool ID is stored for tracking.',
          why: 'Liquidity is essential for trading. Without a pool, tokens cannot be exchanged. Auto-creation removes the complex manual process.',
        },
        {
          name: 'Initial distribution tools',
          what: 'Batch transfer functionality to distribute tokens to team, investors, or airdrop recipients.',
          how: 'CSV upload parses recipient addresses and amounts. Backend constructs versioned transactions with multiple transfer instructions, optimizing for compute budget.',
          why: 'Fair distribution is crucial for project credibility. Automated tools prevent manual errors and provide verifiable proof of distribution.',
        },
        {
          name: 'Token management dashboard',
          what: 'Post-launch interface to manage authorities, view holder distribution, and track pool metrics.',
          how: 'Dashboard queries on-chain data for mint authority status, holder count, and pool reserves. Actions like renouncing authority are one-click operations.',
          why: 'Projects need ongoing management tools. Renouncing authorities, monitoring distribution, and tracking liquidity are essential for credibility.',
        },
      ],
      tech: ['React', 'Solana Web3.js', 'Metaplex SDK', 'Raydium SDK'],
      dependencies:
        'Integrates with Burn Engine for burn-enabled tokens. Uses Metaplex for NFT metadata standard.',
      architecture:
        'Frontend wizard collects token parameters. Backend validates and queues deployment. Smart contract creates mint, assigns authorities, and initializes metadata. Raydium pool creation is triggered post-deployment with configurable liquidity.',
      miniTree: [
        {
          icon: '📝',
          name: 'Token Creation',
          status: 'completed',
          what: 'The core wizard that guides users through creating a new SPL token with custom parameters.',
          how: 'Step-by-step form collects name, symbol, decimals, supply, and metadata. Solana Web3.js creates the mint account and assigns initial distribution.',
          why: 'Token creation is complex. The wizard abstracts technical details, letting anyone launch a professional token in minutes.',
          future: 'Token cloning feature. Import existing token metadata.',
        },
        {
          icon: '🖼️',
          name: 'Metaplex Integration',
          status: 'completed',
          what: 'Connection to Metaplex standard for rich token metadata including images, descriptions, and social links.',
          how: 'Metaplex SDK creates on-chain metadata account linked to token mint. Images uploaded to Arweave for permanent storage.',
          why: 'Metadata makes tokens recognizable. Wallets and explorers display the logo, name, and info from Metaplex.',
          future: 'Dynamic metadata updates. NFT collection integration.',
        },
        {
          icon: '💧',
          name: 'Raydium Pools',
          status: 'completed',
          what: 'Automated liquidity pool creation on Raydium DEX for immediate trading after launch.',
          how: 'After token creation, users can allocate tokens and SOL for initial liquidity. Raydium SDK creates concentrated liquidity pool.',
          why: 'Tokens without liquidity are untradeable. Automatic pool creation ensures immediate market access.',
          future: 'Multi-DEX deployment. Liquidity locking integration.',
        },
        {
          icon: '📊',
          name: 'Management Dashboard',
          status: 'in-progress',
          what: 'Post-launch control panel for managing token authorities, minting, and monitoring metrics.',
          how: 'React dashboard fetches on-chain data for launched tokens. Actions like minting, freezing, or updating metadata are available to authorities.',
          why: 'Launch is just the beginning. Ongoing management tools help token creators maintain their project.',
          future: 'Holder analytics. Airdrop tools. Vesting schedule management.',
        },
        {
          icon: '🔐',
          name: 'Multi-sig Support',
          status: 'planned',
          what: 'Allow multiple signers to control token authorities for enhanced security and decentralization.',
          how: 'Integration with Squads Protocol for multi-signature wallets. Token authorities assigned to multi-sig PDAs.',
          why: 'Single points of failure are risky. Multi-sig prevents any one person from rugging or making unauthorized changes.',
          future: 'Governance-controlled authorities. Time-locked admin actions.',
        },
        {
          icon: '📋',
          name: 'Token Templates',
          status: 'planned',
          what: 'Pre-configured token setups for common use cases like memecoins, utility tokens, or governance tokens.',
          how: 'Templates define default parameters, burn rates, and distribution schedules. Users select a template and customize.',
          why: 'Best practices encoded in templates. New creators get professional configurations without deep expertise.',
          future: 'Community-submitted templates. Template marketplace.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Pre-configured token templates' },
        { phase: 'Q2', text: 'Multi-signature authority support' },
        { phase: 'Q3', text: 'Public API for integrations' },
      ],
      integrations: ['Burn Engine', 'Metaplex', 'Raydium', 'Jupiter'],
      github: 'https://github.com/asdf-ecosystem/launcher',
      demo: 'https://alonisthe.dev/ignition',
    },
    oracle: {
      icon: '🔮',
      title: 'ASDF Oracle',
      status: 'building',
      overview:
        'Proprietary oracle calculating the K-Metric, a composite health indicator for the ecosystem. Aggregates data from multiple on-chain and off-chain sources to provide actionable insights.',
      features: [
        {
          name: 'K-Metric calculation algorithm',
          what: 'A proprietary composite score that measures ecosystem health by weighing multiple factors like burn rate, volume, holder growth, and developer activity.',
          how: 'Python algorithm assigns weights to normalized metrics. Each factor is scored 0-100, then combined using the proprietary formula. The resulting K-Metric ranges from 0 (critical) to 100 (excellent).',
          why: 'Single metrics can be misleading. K-Metric provides a holistic view that considers multiple health indicators simultaneously.',
        },
        {
          name: 'Multi-source data aggregation',
          what: 'Collects data from Helius, Jupiter, Birdeye, GitHub, and internal services to build a comprehensive picture.',
          how: 'Scheduled collectors run every 5 minutes, fetching from various APIs. Data is normalized, validated for anomalies, and stored in InfluxDB for time-series analysis.',
          why: 'No single source tells the whole story. Aggregating from multiple sources provides resilience and accuracy.',
        },
        {
          name: 'Historical metrics storage',
          what: 'Time-series database storing all metric snapshots for trend analysis and backtesting.',
          how: 'InfluxDB stores metrics with timestamps. Retention policies manage storage costs. Continuous queries pre-aggregate data for common time ranges.',
          why: 'Historical context is essential for understanding trends. Comparing current metrics to historical baselines reveals meaningful changes.',
        },
        {
          name: 'Webhook alerts for thresholds',
          what: 'Automated alerts when K-Metric or individual components cross defined thresholds.',
          how: 'Alert rules defined in configuration specify thresholds and destinations. When crossed, webhook dispatcher sends notifications to Discord, Telegram, or custom endpoints.',
          why: 'Proactive monitoring prevents surprises. Teams can respond quickly to metric changes rather than discovering issues later.',
        },
        {
          name: 'Dashboard visualization',
          what: 'Grafana-powered dashboards showing real-time metrics, trends, and K-Metric breakdowns.',
          how: 'Grafana connects to InfluxDB as data source. Pre-built dashboards visualize K-Metric, component scores, and historical trends with customizable time ranges.',
          why: 'Visual data is more accessible than raw numbers. Dashboards make complex data understandable for all stakeholders.',
        },
      ],
      tech: ['Node.js', 'Python', 'Redis', 'InfluxDB', 'Grafana'],
      dependencies:
        'Pulls data from Helius, Jupiter price feeds, Birdeye volume data, and internal burn metrics.',
      architecture:
        'Data collectors run on schedule, fetching from various APIs. Python ML pipeline calculates K-Metric using weighted factors. InfluxDB stores time-series data. Grafana provides visualization. Webhook dispatcher handles alerts.',
      miniTree: [
        {
          icon: '📊',
          name: 'K-Metric Algorithm',
          status: 'completed',
          what: 'The proprietary formula that calculates ecosystem health by combining multiple weighted factors.',
          how: 'Python script normalizes each metric (burns, volume, holders, etc.) to 0-100 scale, applies weights based on importance, and computes final K-Metric score.',
          why: 'Single metrics mislead. K-Metric provides a holistic health score that considers multiple factors simultaneously.',
          future:
            'Community-adjustable weights. Sub-metrics for specific aspects like liquidity health or holder concentration.',
        },
        {
          icon: '🔗',
          name: 'Multi-source Aggregator',
          status: 'completed',
          what: 'Data collection system pulling from Helius, Jupiter, Birdeye, GitHub, and internal services.',
          how: 'Scheduled jobs fetch data every 5 minutes. Each source has a dedicated collector that handles authentication, rate limits, and data normalization.',
          why: 'Diverse data sources mean resilience and accuracy. If one source fails, others provide continuity.',
          future: 'Additional sources like Dune Analytics. Community-submitted data feeds.',
        },
        {
          icon: '📡',
          name: 'REST API',
          status: 'in-progress',
          what: 'Public endpoints exposing K-Metric and component data for third-party integrations.',
          how: 'Express.js API with versioned routes. Rate limiting based on API keys. Responses include current K-Metric, component breakdown, and historical snapshots.',
          why: 'Open data enables ecosystem growth. Traders, researchers, and builders can integrate K-Metric into their tools.',
          future: 'WebSocket for real-time updates. GraphQL for flexible queries.',
        },
        {
          icon: '🔔',
          name: 'Alert System',
          status: 'in-progress',
          what: 'Automated notifications when K-Metric or components cross critical thresholds.',
          how: 'Configurable alert rules specify conditions and destinations. AlertManager evaluates rules against incoming data, dispatches to Discord/Telegram.',
          why: 'Early warning prevents surprises. Teams can respond to metric changes before they become problems.',
          future: 'Custom user alerts. Alert history and analytics.',
        },
        {
          icon: '📈',
          name: 'Historical Data',
          status: 'planned',
          what: 'Long-term storage and analysis of K-Metric trends over months and years.',
          how: 'InfluxDB with tiered retention policies. Recent data at high resolution, older data aggregated. Query optimization for large time ranges.',
          why: 'Historical context reveals trends. Comparing current to historical baselines helps identify anomalies.',
          future: 'Public historical data exports. Backtesting tools for strategy development.',
        },
        {
          icon: '🧠',
          name: 'ML Predictions',
          status: 'planned',
          what: 'Machine learning models that predict future K-Metric values based on patterns.',
          how: 'Time-series forecasting using LSTM networks. Trained on historical data with feature engineering for crypto-specific patterns.',
          why: 'Prediction enables proactive decision-making. Knowing likely future states helps with planning and risk management.',
          future: 'Ensemble models. Confidence intervals. Anomaly prediction.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Public API with rate limiting' },
        { phase: 'Q2', text: 'On-chain oracle program' },
        { phase: 'Q3', text: 'ML-based prediction models' },
      ],
      integrations: ['Helius', 'Jupiter', 'Birdeye', 'Burn Tracker'],
      github: 'https://github.com/asdf-ecosystem/oracle',
      demo: null,
    },
    'learn-platform': {
      icon: '📚',
      title: 'Learn Platform',
      status: 'live',
      overview:
        'Gamified educational platform with 5 progressive levels. Users earn XP and badges by completing interactive tutorials and quizzes about the ASDF ecosystem.',
      features: [
        {
          name: '5 progressive learning levels',
          what: 'Structured curriculum from basics to advanced topics, each level building on previous knowledge.',
          how: 'Levels are unlocked sequentially as users complete requirements. Each level contains lessons, interactive examples, and assessments. Progress gates ensure understanding.',
          why: 'Progressive learning prevents overwhelm. Users build confidence through gradual complexity increase rather than information overload.',
        },
        {
          name: 'XP and badge system',
          what: 'Gamification elements that reward progress with experience points and collectible achievement badges.',
          how: 'Actions earn XP: lesson completion, quiz scores, streaks. Badges are awarded for milestones like completing levels or achieving perfect scores. All tracked client-side and synced.',
          why: 'Gamification increases engagement and retention. Visible progress and collectible achievements motivate continued learning.',
        },
        {
          name: 'Interactive quizzes',
          what: 'Knowledge checks with multiple choice, code completion, and scenario-based questions.',
          how: 'Quiz engine validates answers client-side with immediate feedback. Wrong answers provide explanations. Scores are calculated and stored for badge eligibility.',
          why: 'Active recall strengthens learning. Quizzes transform passive reading into active engagement, improving knowledge retention.',
        },
        {
          name: 'Progress persistence',
          what: 'Your progress is saved and restored across sessions, even without login.',
          how: 'LocalStorage saves completed lessons, XP, badges, and current position. On return, the app restores state and shows a personalized dashboard.',
          why: 'Nobody wants to start over. Persistent progress respects user time and encourages return visits.',
        },
        {
          name: 'Achievement notifications',
          what: 'Celebratory popups when users earn badges, complete levels, or hit milestones.',
          how: 'Event system triggers notifications on achievement events. CSS animations provide satisfying visual feedback. Sounds can be enabled for extra satisfaction.',
          why: 'Positive reinforcement works. Celebrating achievements creates dopamine hits that encourage continued engagement.',
        },
      ],
      tech: ['Vanilla JS', 'CSS3', 'LocalStorage', 'Service Worker'],
      dependencies:
        'Standalone platform. Optional wallet connection for NFT badge minting (future).',
      architecture:
        'Single-page application with vanilla JavaScript. LocalStorage persists progress across sessions. Service Worker enables offline access to completed lessons. Quiz validation happens client-side with server verification for badges.',
      miniTree: [
        {
          icon: '📖',
          name: '5 Learning Levels',
          status: 'completed',
          what: 'Progressive curriculum from basics to advanced concepts, organized into 5 difficulty tiers.',
          how: 'Content structured as levels, each unlocking after completing the previous. Topics progress from "What is ASDF?" to "Building on the Ecosystem".',
          why: 'Learning works best with structure. Progressive difficulty prevents overwhelm and builds confidence.',
          future: 'Expert-level content for developers. Certification tracks.',
        },
        {
          icon: '🏅',
          name: 'Badge System',
          status: 'completed',
          what: 'Visual achievements earned by completing levels, quizzes, and challenges.',
          how: 'Progress tracking awards badges at milestones. Badges stored in localStorage with unique designs per achievement type.',
          why: 'Gamification increases engagement. Badges provide tangible progress markers and social proof.',
          future: 'Rare achievement badges. Community-designed badge artwork.',
        },
        {
          icon: '✅',
          name: 'Quiz Engine',
          status: 'completed',
          what: 'Interactive knowledge checks with multiple-choice questions and immediate feedback.',
          how: 'JSON-defined quiz data with question pools. Random selection ensures variety. Client-side validation with detailed explanations for wrong answers.',
          why: 'Testing reinforces learning. Quizzes help identify knowledge gaps and confirm understanding.',
          future: 'Adaptive difficulty based on performance. Timed challenge modes.',
        },
        {
          icon: '💾',
          name: 'Progress Sync',
          status: 'completed',
          what: 'Persistent progress tracking across sessions using browser storage.',
          how: 'LocalStorage saves completed levels, quiz scores, and badges. Data structure versioned for future migrations.',
          why: 'Users should not lose progress. Persistence enables continuing where you left off.',
          future: 'Cloud sync with wallet authentication. Cross-device progress.',
        },
        {
          icon: '🌐',
          name: 'Multi-language',
          status: 'in-progress',
          what: 'Platform localization for non-English speakers including Spanish, French, and Chinese.',
          how: 'i18n framework with JSON translation files. Language detection from browser settings with manual override.',
          why: 'Crypto is global. Non-English content expands reach to massive markets.',
          future: 'Community translation contributions. RTL language support.',
        },
        {
          icon: '🎖️',
          name: 'NFT Badges',
          status: 'planned',
          what: 'On-chain NFT certificates proving course completion and achievements.',
          how: 'Wallet connection enables NFT minting after verification. Metaplex standard NFTs with achievement metadata.',
          why: 'On-chain credentials are verifiable and portable. Users can showcase achievements across platforms.',
          future: 'Soulbound tokens. Integration with job platforms and DAOs.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Spanish and French translations' },
        { phase: 'Q2', text: 'Community-contributed lessons' },
        { phase: 'Q3', text: 'On-chain certificate NFTs' },
      ],
      integrations: ['Community Hub', 'Ambassador Program'],
      github: 'https://github.com/asdf-ecosystem/learn',
      demo: 'https://alonisthe.dev/learn.html',
    },
    'rpc-monitor': {
      icon: '📡',
      title: 'RPC Monitor',
      status: 'live',
      overview:
        'Infrastructure health monitoring for all RPC endpoints. Tracks latency, uptime, and error rates with automatic alerting to Discord and Telegram.',
      features: [
        {
          name: 'Multi-endpoint health checks',
          what: 'Continuous monitoring of all RPC endpoints used by ecosystem services.',
          how: 'Cron job pings each endpoint every 30 seconds with a simple getHealth request. Response time and success/failure are recorded.',
          why: 'RPC reliability is critical. If endpoints go down, all services fail. Proactive monitoring catches issues before users notice.',
        },
        {
          name: 'Latency tracking',
          what: 'Measures response times for each endpoint, tracking trends and detecting performance degradation.',
          how: 'Each health check records response time in milliseconds. Data is stored in Prometheus for aggregation. Percentiles (p50, p95, p99) are calculated.',
          why: 'Slow RPCs degrade user experience. Tracking latency helps identify when to switch providers or scale capacity.',
        },
        {
          name: 'Uptime monitoring',
          what: 'Calculates and displays uptime percentages for each endpoint over various time windows.',
          how: 'Success/failure counts are aggregated into uptime percentages. Historical data allows comparison across days, weeks, and months.',
          why: 'Uptime is the primary SLA metric. Knowing historical reliability helps make infrastructure decisions.',
        },
        {
          name: 'Discord/Telegram alerts',
          what: 'Immediate notifications when endpoints go down or latency exceeds thresholds.',
          how: 'AlertManager rules trigger when conditions are met. Webhook integrations send formatted messages to Discord and Telegram channels.',
          why: 'Downtime costs money. Immediate alerts enable rapid response before users are significantly impacted.',
        },
        {
          name: 'Prometheus metrics export',
          what: 'Standard Prometheus format metrics for integration with existing monitoring infrastructure.',
          how: 'Node.js client exposes /metrics endpoint. Prometheus scrapes this endpoint. Standard naming conventions ensure compatibility.',
          why: 'Integration with industry-standard tools. Teams can add our metrics to existing Grafana dashboards and alert systems.',
        },
      ],
      tech: ['Node.js', 'Prometheus', 'Grafana', 'Docker'],
      dependencies: 'Monitors Helius and backup RPC endpoints used by all ecosystem services.',
      architecture:
        'Cron-based health checker pings RPC endpoints every 30 seconds. Results stored in Prometheus time-series database. Grafana dashboards visualize metrics. AlertManager triggers notifications on threshold breaches.',
      miniTree: [
        {
          icon: '💓',
          name: 'Health Checker',
          status: 'completed',
          what: 'Core monitoring service that verifies RPC endpoint availability and response times.',
          how: 'Node.js cron job sends getHealth requests to each endpoint every 30 seconds. Records success/failure and response latency.',
          why: 'First line of defense against outages. Immediate detection enables rapid response.',
          future: 'Custom health check types. Per-service endpoint configurations.',
        },
        {
          icon: '📊',
          name: 'Prometheus Export',
          status: 'completed',
          what: 'Metrics exposed in Prometheus format for integration with monitoring infrastructure.',
          how: 'Node.js prom-client library exposes /metrics endpoint. Standard naming conventions like rpc_latency_seconds, rpc_success_total.',
          why: 'Industry standard format. Teams can integrate with existing Prometheus/Grafana setups.',
          future: 'Custom metric labels. Histogram buckets optimization.',
        },
        {
          icon: '🔔',
          name: 'Alert Manager',
          status: 'completed',
          what: 'Automated notifications when endpoints fail or latency exceeds thresholds.',
          how: 'Alert rules specify conditions (e.g., latency > 500ms for 2 minutes). AlertManager evaluates and dispatches to Discord/Telegram.',
          why: 'Human attention is limited. Automated alerts ensure nothing slips through the cracks.',
          future: 'Escalation policies. On-call rotation integration.',
        },
        {
          icon: '📈',
          name: 'Grafana Dashboards',
          status: 'in-progress',
          what: 'Visual dashboards showing uptime, latency trends, and endpoint comparisons.',
          how: 'Pre-built Grafana dashboards query Prometheus. Panels show time-series graphs, status indicators, and historical comparisons.',
          why: 'Visualization makes data actionable. At-a-glance health status for all endpoints.',
          future: 'Public status page. Embeddable widgets.',
        },
        {
          icon: '🤖',
          name: 'Auto-failover',
          status: 'planned',
          what: 'Automatic switching to backup RPCs when primary endpoints fail.',
          how: 'Failover logic evaluates endpoint health scores. When primary drops below threshold, traffic automatically routes to backup.',
          why: 'Manual intervention is slow. Automatic failover maintains uptime during outages.',
          future: 'Weighted load balancing. Geographic routing.',
        },
        {
          icon: '🌍',
          name: 'Multi-region',
          status: 'planned',
          what: 'Monitoring from multiple geographic locations to detect regional issues.',
          how: 'Distributed checkers in NA, EU, and Asia. Results compared to identify location-specific problems.',
          why: 'RPC issues can be regional. Multi-region monitoring detects problems affecting specific user populations.',
          future: 'Edge-based monitoring. Latency-based routing recommendations.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Automated failover to backup RPCs' },
        { phase: 'Q2', text: 'Multi-region endpoint monitoring' },
        { phase: 'Q3', text: 'Cost tracking and optimization' },
      ],
      integrations: ['Helius', 'All Ecosystem Services'],
      github: 'https://github.com/asdf-ecosystem/rpc-monitor',
      demo: null,
    },
    holdex: {
      icon: '💹',
      title: 'HolDEX Terminal',
      status: 'live',
      overview:
        'Professional trading interface with TradingView charts, real-time order books, and technical analysis tools. Executes trades through Jupiter aggregator.',
      features: [
        {
          name: 'TradingView charting',
          what: 'Professional-grade charts with 100+ technical indicators and drawing tools.',
          how: 'TradingView widget integration with custom styling. Real-time price data feeds from Jupiter. User preferences (indicators, timeframes) saved locally.',
          why: 'Traders need professional tools. TradingView is industry standard, and familiar interface reduces learning curve.',
        },
        {
          name: 'Real-time order books',
          what: 'Live aggregated order book showing bids and asks across liquidity sources.',
          how: 'WebSocket connections to multiple DEXs aggregate order book data. Client-side merging creates unified view. Updates stream in real-time.',
          why: 'Order book depth reveals market sentiment. Traders use this to identify support/resistance and plan entries/exits.',
        },
        {
          name: 'Watchlists and alerts',
          what: 'Custom token watchlists with configurable price alerts.',
          how: 'User-created lists stored in PostgreSQL. Price monitoring service checks conditions. Push notifications via browser API or webhook.',
          why: 'No one can watch every token. Watchlists and alerts let traders focus while staying informed of important movements.',
        },
        {
          name: 'Whale wallet tracking',
          what: 'Monitor large wallet movements for tokens on your watchlist.',
          how: 'Helius webhooks track transfers above configurable thresholds. Whale transactions are flagged and displayed with transaction details.',
          why: 'Whale movements often precede price action. Early awareness of large transfers can inform trading decisions.',
        },
        {
          name: 'Portfolio analytics',
          what: 'Track your holdings, P&L, and portfolio allocation across all tokens.',
          how: 'Wallet connection reads token balances. Historical price data calculates P&L. Visualizations show allocation and performance over time.',
          why: 'Know your performance. Portfolio tracking turns scattered holdings into actionable insights about what is working.',
        },
      ],
      tech: ['React', 'TradingView', 'Jupiter SDK', 'PostgreSQL'],
      dependencies: 'Uses ASDF Oracle for K-Metric display. Jupiter for trade execution.',
      architecture:
        'React frontend with TradingView widget integration. WebSocket feeds for real-time price updates. Jupiter SDK handles swap routing and execution. PostgreSQL stores user watchlists and alert configurations.',
      miniTree: [
        {
          icon: '📈',
          name: 'TradingView Charts',
          status: 'completed',
          what: 'Professional-grade charting with 100+ indicators, drawing tools, and customizable layouts.',
          how: 'TradingView widget integration with custom theme matching HolDEX design. Real-time data from Jupiter price feeds.',
          why: 'Traders need professional tools. TradingView is the industry standard with a familiar interface.',
          future: 'Custom indicators. Social sharing of chart analyses.',
        },
        {
          icon: '📋',
          name: 'Watchlists',
          status: 'completed',
          what: 'Custom token lists to track favorites with quick access to charts and trading.',
          how: 'User-defined lists stored in PostgreSQL. Token metadata cached. Real-time price updates via WebSocket.',
          why: 'No one can watch the entire market. Watchlists focus attention on tokens that matter.',
          future: 'Shared watchlists. Community-curated lists.',
        },
        {
          icon: '🔔',
          name: 'Price Alerts',
          status: 'in-progress',
          what: 'Notifications when tokens hit specified price targets or percentage changes.',
          how: 'User-configured alert rules stored in database. Background job monitors prices, triggers push notifications or webhooks.',
          why: 'Cannot stare at screens 24/7. Alerts let users step away while staying informed of important moves.',
          future: 'Complex conditions (AND/OR). Alert templates for common strategies.',
        },
        {
          icon: '🐋',
          name: 'Whale Tracking',
          status: 'in-progress',
          what: 'Monitor large wallet movements for tokens on your watchlist.',
          how: 'Helius webhooks track transfers above configurable thresholds. Whale transactions displayed with wallet labels when known.',
          why: 'Whales often move before price action. Early awareness can inform trading decisions.',
          future: 'Whale wallet labeling. Flow analysis. Correlation with price movements.',
        },
        {
          icon: '🤖',
          name: 'Trading Bots',
          status: 'planned',
          what: 'Automated trading strategies like DCA, grid trading, and momentum following.',
          how: 'User configures strategy parameters. Bot service executes trades via Jupiter SDK. Risk limits enforce position sizing.',
          why: 'Automation removes emotion. Consistent strategy execution without manual intervention.',
          future: 'Strategy marketplace. Backtesting engine. Social copy trading.',
        },
        {
          icon: '📊',
          name: 'Portfolio View',
          status: 'planned',
          what: 'Comprehensive portfolio tracking with P&L, allocation charts, and performance metrics.',
          how: 'Wallet connection reads token balances. Historical prices calculate P&L. Visualizations show allocation and performance.',
          why: 'Know your performance. Portfolio view turns scattered holdings into actionable insights.',
          future: 'Tax reporting exports. Multi-wallet aggregation. DeFi position tracking.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Copy trading functionality' },
        { phase: 'Q2', text: 'Automated trading strategies' },
        { phase: 'Q3', text: 'DEX aggregation beyond Jupiter' },
      ],
      integrations: ['ASDF Oracle', 'Jupiter', 'Birdeye'],
      github: 'https://github.com/asdf-ecosystem/holdex',
      demo: null,
    },
    'games-platform': {
      icon: '🎮',
      title: 'Games Platform',
      status: 'live',
      overview:
        'Suite of browser-based mini-games with Solana wallet integration. Features weekly leaderboards, ticket system, and automatic reward distribution.',
      features: [
        {
          name: '9 unique mini-games',
          what: 'Collection of casual games including puzzles, arcade, and skill-based challenges.',
          how: 'Canvas API renders 2D games. Each game has its own scoring system. Games are modular and can be added/removed independently.',
          why: 'Variety keeps users engaged. Different game types appeal to different preferences, maximizing reach.',
        },
        {
          name: 'Weekly game rotation',
          what: 'Featured games rotate weekly to keep the experience fresh.',
          how: 'Backend configuration determines active games. Frontend fetches rotation schedule and highlights featured games with special styling.',
          why: 'Novelty drives engagement. Rotation creates urgency (play now before it changes) and gives all games spotlight time.',
        },
        {
          name: 'Leaderboard system',
          what: 'Global and weekly leaderboards showing top scores for each game.',
          how: 'Scores submitted to backend after anti-cheat validation. Redis sorted sets provide efficient leaderboard queries. Weekly boards reset automatically.',
          why: 'Competition drives engagement. Leaderboards turn individual play into social activity with bragging rights.',
        },
        {
          name: 'Ticket-based rewards',
          what: 'Players earn tickets based on performance that can be redeemed for prizes.',
          how: 'Score-to-ticket conversion formula runs server-side. Tickets accumulate in user account. Redemption catalog offers various reward tiers.',
          why: 'Tangible rewards increase engagement. Tickets provide clear incentive structure beyond just leaderboard position.',
        },
        {
          name: 'Wallet integration',
          what: 'Connect Solana wallet to claim on-chain rewards and participate in token-gated events.',
          how: 'Wallet adapter connects Phantom, Solflare, etc. Signature verification links wallet to game account. Smart contract handles reward distribution.',
          why: 'Bridges gaming with DeFi. Wallet integration enables real value transfer and connects to broader ecosystem.',
        },
      ],
      tech: ['Vanilla JS', 'Canvas API', 'Solana Web3.js', 'Express'],
      dependencies:
        'Uses ASDF Oracle for reward calculations. Burn Engine integration for play-to-burn mechanics.',
      architecture:
        'Microservices architecture with separate game engine and rewards service. Anti-cheat measures validate scores server-side. Redis stores session data and leaderboards. Smart contract handles reward distribution.',
      miniTree: [
        {
          icon: '🎲',
          name: '9 Mini-games',
          status: 'completed',
          what: 'Collection of unique casual games: puzzles, arcade, skill challenges, and more.',
          how: 'Canvas API renders 2D games. Each game has modular architecture with shared scoring system. Games can be added/updated independently.',
          why: 'Variety keeps users engaged. Different game types appeal to different preferences, maximizing player retention.',
          future: 'Community game submissions. Seasonal themed games. 3D WebGL games.',
        },
        {
          icon: '🏆',
          name: 'Leaderboards',
          status: 'completed',
          what: 'Weekly competitive rankings showing top performers across all games.',
          how: 'Redis stores sorted sets for real-time leaderboard updates. Weekly resets with historical archiving. Anti-cheat validated scores only.',
          why: 'Competition drives engagement. Leaderboards provide goals and recognition for top players.',
          future: 'All-time leaderboards. Per-game rankings. Friend leaderboards.',
        },
        {
          icon: '🎟️',
          name: 'Ticket System',
          status: 'completed',
          what: 'Entry tickets earned through gameplay or purchased, used for prize pools.',
          how: 'Tickets tracked per user session. Ticket cost varies by game mode. Pool contributions accumulate for weekly distribution.',
          why: 'Tickets create skin in the game. Prize pools funded by participation create real stakes.',
          future: 'Ticket marketplace. Bonus ticket events. VIP ticket tiers.',
        },
        {
          icon: '🎁',
          name: 'Auto Rewards',
          status: 'in-progress',
          what: 'Automated prize distribution to top performers at end of each week.',
          how: 'Smart contract holds prize pool. Weekly cron triggers distribution based on final leaderboard standings. Transactions sent automatically.',
          why: 'Manual distribution is slow and error-prone. Automation ensures fair, timely rewards.',
          future: 'Instant micro-rewards. Achievement-based bonuses. Streak rewards.',
        },
        {
          icon: '🛡️',
          name: 'Anti-cheat v2',
          status: 'in-progress',
          what: 'Enhanced cheat detection using server-side validation and pattern analysis.',
          how: 'Critical game state validated server-side. Statistical analysis flags anomalous scores. Machine learning identifies cheating patterns.',
          why: 'Cheaters ruin fair competition. Robust anti-cheat maintains integrity and player trust.',
          future: 'Real-time detection. Automated bans. Appeal system.',
        },
        {
          icon: '🏅',
          name: 'Tournaments',
          status: 'planned',
          what: 'Organized PvP competitions with brackets, scheduling, and prize pools.',
          how: 'Tournament creation defines format, timing, entry requirements. Bracket system manages matchups. Live spectating for finals.',
          why: 'Tournaments create events that drive engagement. High stakes competition attracts serious players.',
          future: 'Team tournaments. Sponsored prize pools. Streamer integrations.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'PvP tournament mode' },
        { phase: 'Q2', text: 'NFT reward integration' },
        { phase: 'Q3', text: 'Mobile companion app' },
      ],
      integrations: ['ASDF Oracle', 'Burn Engine', 'Wallet Adapters'],
      github: 'https://github.com/asdf-ecosystem/games',
      demo: 'https://alonisthe.dev/games.html',
    },
    'community-hub': {
      icon: '🏠',
      title: 'Community Hub',
      status: 'building',
      overview:
        'Centralized platform for community resources, events calendar, proposal system, and governance tools. Integrates with Discord for real-time sync.',
      features: [
        {
          name: 'Event calendar',
          what: 'Shared calendar showing AMAs, launches, community calls, and important dates.',
          how: 'Next.js renders calendar component. Events stored in PostgreSQL with timezone handling. Discord bot syncs events bidirectionally.',
          why: 'Centralized scheduling prevents missed events. Community members can plan around important dates.',
        },
        {
          name: 'Proposal system',
          what: 'Platform for community members to submit, discuss, and vote on improvement proposals.',
          how: 'Structured proposal form captures title, description, and implementation details. Discussion threads allow feedback. Voting happens off-chain with weighted token balances.',
          why: 'Community input shapes the project. Structured proposals ensure ideas are actionable and discussion is focused.',
        },
        {
          name: 'Resource library',
          what: 'Organized collection of guides, documentation, and community-created content.',
          how: 'Content management system organizes resources by category. Search functionality helps discovery. Community members can submit resources for review.',
          why: 'Information scattered across Discord is hard to find. Centralized library makes resources discoverable and maintainable.',
        },
        {
          name: 'Discord integration',
          what: 'Two-way sync between Hub and Discord for announcements, events, and proposals.',
          how: 'Discord.js bot monitors specific channels. New announcements are mirrored to Hub. Proposal updates are posted to Discord. Events sync bidirectionally.',
          why: 'Meet users where they are. Not everyone checks the Hub daily, but Discord notifications reach them instantly.',
        },
        {
          name: 'Governance voting',
          what: 'Token-weighted voting on approved proposals with transparent tallying.',
          how: 'Wallet connection captures token balance at snapshot time. Votes are signed messages proving ownership. Tallying weights votes by balance.',
          why: 'Fair representation requires weighted voting. Token holders proportionally influence decisions affecting their investment.',
        },
      ],
      tech: ['Next.js', 'Prisma', 'PostgreSQL', 'Discord.js'],
      dependencies:
        'Syncs with Discord server. Future integration with Ambassador Program for contribution tracking.',
      architecture:
        'Next.js app with server-side rendering. Prisma ORM connects to PostgreSQL. Discord bot syncs announcements and events bidirectionally. Proposal system uses off-chain voting with on-chain verification.',
      miniTree: [
        {
          icon: '📅',
          name: 'Event Calendar',
          status: 'completed',
          what: 'Shared calendar showing AMAs, launches, community calls, and ecosystem events.',
          how: 'Next.js calendar component with PostgreSQL backend. Events have timezone handling and recurrence support. Discord bot syncs bidirectionally.',
          why: 'Centralized scheduling prevents missed events. Community can plan around important dates.',
          future: 'Personal calendar exports. Event reminders. RSVPs with capacity limits.',
        },
        {
          icon: '📢',
          name: 'Announcements',
          status: 'completed',
          what: 'Official announcement feed mirrored from Discord with categorization and search.',
          how: 'Discord bot captures messages from announcement channels. Web interface displays with filtering by category. Full-text search.',
          why: 'Discord messages get buried. Hub provides persistent, searchable announcement history.',
          future: 'Newsletter subscriptions. Custom notification preferences.',
        },
        {
          icon: '🗳️',
          name: 'Proposal System',
          status: 'in-progress',
          what: 'Structured system for community proposals with discussion and voting.',
          how: 'Proposal form captures structured data. Discussion threads enable feedback. Voting with token-weighted balances.',
          why: 'Community input shapes direction. Structured proposals ensure actionable, focused discussion.',
          future: 'Proposal templates. Automatic implementation tracking.',
        },
        {
          icon: '📊',
          name: 'Community Metrics',
          status: 'planned',
          what: 'Dashboard showing community health: members, engagement, retention, and growth.',
          how: 'Aggregates data from Discord, Hub, and on-chain activity. Visualizations show trends over time.',
          why: 'Data-driven community management. Metrics reveal what is working and where to focus.',
          future: 'Predictive churn analysis. Engagement scoring.',
        },
        {
          icon: '🏛️',
          name: 'DAO Voting',
          status: 'planned',
          what: 'On-chain governance voting with delegation and transparent tallying.',
          how: 'Realms or custom SPL governance program. Token-weighted voting with snapshot. Delegation support.',
          why: 'True decentralization requires on-chain governance. Transparent, verifiable voting builds trust.',
          future: 'Quadratic voting options. Multi-sig execution of passed proposals.',
        },
        {
          icon: '💰',
          name: 'Treasury View',
          status: 'planned',
          what: 'Real-time dashboard of ecosystem treasury holdings and spending.',
          how: 'On-chain data fetched for treasury wallets. Historical tracking of flows. Spending categorization.',
          why: 'Transparency builds trust. Community should see how funds are managed.',
          future: 'Budget proposals. Spending approval workflows.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'On-chain proposal voting' },
        { phase: 'Q2', text: 'Delegation system' },
        { phase: 'Q3', text: 'Treasury management dashboard' },
      ],
      integrations: ['Discord', 'Ambassador Program', 'Learn Platform'],
      github: 'https://github.com/asdf-ecosystem/hub',
      demo: null,
    },
    'deploy-pipeline': {
      icon: '🔧',
      title: 'Deploy Pipeline',
      status: 'building',
      overview:
        'CI/CD automation for all ecosystem services. Handles testing, staging deployments, and production rollouts with blue-green strategy.',
      features: [
        {
          name: 'GitHub Actions workflows',
          what: 'Automated pipelines triggered by code changes for testing and deployment.',
          how: 'YAML workflow files define triggers (push, PR), jobs (test, build, deploy), and environments. Matrix builds test across configurations.',
          why: 'Manual deployment is error-prone. Automation ensures consistent, repeatable deployments with every code change.',
        },
        {
          name: 'Docker containerization',
          what: 'All services packaged as Docker containers for consistent deployment.',
          how: 'Dockerfiles define service images. Multi-stage builds optimize size. Images pushed to container registry with versioned tags.',
          why: 'Containers eliminate "works on my machine" problems. Identical environments from development to production.',
        },
        {
          name: 'Kubernetes deployment',
          what: 'Container orchestration managing service scaling, updates, and recovery.',
          how: 'Kubernetes manifests define deployments, services, and ingress. Helm charts template configurations. kubectl applies changes through GitHub Actions.',
          why: 'K8s provides self-healing, scaling, and rolling updates. Essential for maintaining uptime during deployments.',
        },
        {
          name: 'Blue-green deployments',
          what: 'Zero-downtime deployment strategy running old and new versions simultaneously.',
          how: 'New version deployed to "green" environment. Health checks verify functionality. Traffic switched from "blue" to "green" atomically.',
          why: 'Zero downtime is expected. Blue-green enables instant rollback if issues are discovered post-deployment.',
        },
        {
          name: 'Automated testing',
          what: 'Unit, integration, and end-to-end tests run automatically on every change.',
          how: 'Test suites execute in GitHub Actions. Coverage reports generated. Failed tests block deployment. Integration tests use test fixtures.',
          why: 'Tests catch bugs before production. Automated execution ensures tests are actually run, not skipped under time pressure.',
        },
      ],
      tech: ['GitHub Actions', 'Docker', 'Kubernetes', 'Terraform'],
      dependencies:
        'Deploys all ecosystem services. Uses RPC Monitor for post-deploy health checks.',
      architecture:
        'GitHub Actions trigger on PR merge. Docker builds pushed to registry. Terraform manages infrastructure. Kubernetes handles orchestration with blue-green deployment strategy. Post-deploy hooks verify service health.',
      miniTree: [
        {
          icon: '🔄',
          name: 'GitHub Actions',
          status: 'completed',
          what: 'Automated CI/CD workflows triggered by code changes.',
          how: 'YAML workflow files define triggers, jobs, and steps. Matrix builds test across configurations. Secrets managed securely.',
          why: 'Manual deployment is error-prone and slow. Automation ensures consistent, repeatable deployments.',
          future: 'Self-hosted runners. Workflow optimization.',
        },
        {
          icon: '🐳',
          name: 'Docker Builds',
          status: 'completed',
          what: 'All services packaged as Docker containers.',
          how: 'Dockerfiles define service images. Multi-stage builds optimize size. Images pushed to registry with versioned tags.',
          why: 'Containers eliminate environment inconsistencies. Same image runs identically everywhere.',
          future: 'Build cache optimization. Multi-arch images.',
        },
        {
          icon: '☸️',
          name: 'K8s Deployment',
          status: 'in-progress',
          what: 'Kubernetes orchestration for service management and scaling.',
          how: 'Manifests define deployments, services, ingress. Helm charts template configurations. kubectl applies through Actions.',
          why: 'K8s provides self-healing, scaling, and rolling updates. Essential for production reliability.',
          future: 'Horizontal pod autoscaling. Service mesh integration.',
        },
        {
          icon: '🔵',
          name: 'Blue-green Deploy',
          status: 'in-progress',
          what: 'Zero-downtime deployments with instant rollback capability.',
          how: 'Two identical environments (blue/green). New version deployed to inactive. Traffic switched after health verification.',
          why: 'Zero downtime during updates. Instant rollback if issues detected.',
          future: 'Automated traffic shifting. A/B testing capability.',
        },
        {
          icon: '📊',
          name: 'Post-deploy Monitor',
          status: 'planned',
          what: 'Automated health verification after deployments.',
          how: 'Post-deploy hooks run integration tests. RPC Monitor checks service health. Alerts trigger on anomalies.',
          why: 'Deployment is not done until verified healthy. Automated monitoring catches issues immediately.',
          future: 'Custom health check plugins. Performance baseline comparison.',
        },
        {
          icon: '🦜',
          name: 'Canary Releases',
          status: 'planned',
          what: 'Gradual rollout sending small traffic percentage to new version.',
          how: 'Traffic split between versions. Metrics compared. Percentage increased or rolled back based on results.',
          why: 'Limit blast radius of bad releases. Real production testing with minimal risk.',
          future: 'Automated promotion rules. Feature flag integration.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Canary deployment support' },
        { phase: 'Q2', text: 'Automated rollback triggers' },
        { phase: 'Q3', text: 'Cost tracking and optimization' },
      ],
      integrations: ['RPC Monitor', 'All Services'],
      github: 'https://github.com/asdf-ecosystem/pipeline',
      demo: null,
    },
    'ambassador-program': {
      icon: '🎖️',
      title: 'Ambassador Program',
      status: 'planned',
      overview:
        'Tiered contributor program with missions, ranks, and NFT badges. Tracks community contributions and automates reward distribution.',
      features: [
        {
          name: 'Mission system',
          what: 'Structured tasks that contributors complete to earn points and recognition.',
          how: 'Missions defined with requirements, points, and verification method. Some auto-verify (Twitter retweets), others require manual review.',
          why: 'Clear goals guide contribution. Missions ensure consistent, valuable community actions rather than random activity.',
        },
        {
          name: 'Rank progression',
          what: 'Tiered ambassador levels from Bronze to Diamond with increasing privileges.',
          how: 'Points accumulate from completed missions. Thresholds trigger rank upgrades. Each rank unlocks new missions and rewards.',
          why: 'Gamification drives long-term engagement. Visible progression creates goals and recognizes dedicated contributors.',
        },
        {
          name: 'Contribution tracking',
          what: 'Automated logging of all contributor activities across platforms.',
          how: 'Discord bot tracks server activity. Twitter API monitors mentions. GitHub tracks PRs and issues. All aggregated in contributor dashboard.',
          why: 'Fair rewards require accurate tracking. Automation prevents missed contributions and eliminates disputes.',
        },
        {
          name: 'NFT badges',
          what: 'On-chain achievement badges minted on rank promotions and special achievements.',
          how: 'Metaplex NFTs with custom artwork for each rank and achievement. Minting triggered automatically on qualification. Soulbound to prevent trading.',
          why: 'NFT badges provide permanent, verifiable proof of contribution. They are also collectible and shareable.',
        },
        {
          name: 'Automated rewards',
          what: 'Periodic token distribution based on contribution points.',
          how: 'Smart contract holds reward pool. Snapshot of points taken at distribution time. Pro-rata distribution executed on-chain.',
          why: 'Timely, fair rewards maintain motivation. Automation eliminates administrative burden and ensures consistency.',
        },
      ],
      tech: ['Next.js', 'Metaplex', 'PostgreSQL', 'Discord.js'],
      dependencies:
        'Integrates with Community Hub for contribution data. Uses Metaplex for NFT badge minting.',
      architecture:
        'Mission completion tracked via Discord bot and manual verification. Points accumulate toward rank progression. NFT badges minted on-chain for rank achievements. Reward distribution automated via smart contract.',
      miniTree: [
        {
          icon: '📋',
          name: 'Mission System',
          status: 'planned',
          what: 'Structured tasks that contributors complete to earn points and recognition.',
          how: 'Missions defined with requirements, points, and verification method. Some auto-verify via APIs, others need manual review.',
          why: 'Clear goals guide contribution. Missions ensure valuable, consistent community actions.',
          future: 'Community-submitted missions. Seasonal mission events.',
        },
        {
          icon: '🏆',
          name: 'Rank Progression',
          status: 'planned',
          what: 'Tiered ambassador levels from Bronze to Diamond with increasing privileges.',
          how: 'Points from missions accumulate. Thresholds trigger rank upgrades. Each rank unlocks new missions and rewards.',
          why: 'Gamification drives engagement. Visible progression recognizes dedicated contributors.',
          future: 'Rank-specific events. Leadership councils for top ranks.',
        },
        {
          icon: '📊',
          name: 'Contribution Tracking',
          status: 'planned',
          what: 'Automated logging of all contributor activities across platforms.',
          how: 'Discord bot tracks server activity. Twitter monitors mentions. GitHub tracks PRs. All aggregated in contributor dashboard.',
          why: 'Fair rewards require accurate tracking. Automation prevents missed contributions.',
          future: 'More platform integrations. Contribution analytics.',
        },
        {
          icon: '🎖️',
          name: 'NFT Badges',
          status: 'planned',
          what: 'On-chain achievement badges minted on rank promotions and special achievements.',
          how: 'Metaplex NFTs with custom artwork per rank. Minting triggered on qualification. Soulbound to prevent trading.',
          why: 'NFT badges are permanent, verifiable proof. Collectible and shareable recognition.',
          future: 'Dynamic badges that evolve. Special edition event badges.',
        },
        {
          icon: '💰',
          name: 'Auto Rewards',
          status: 'planned',
          what: 'Periodic token distribution based on contribution points.',
          how: 'Smart contract holds reward pool. Snapshot taken at distribution. Pro-rata distribution executed on-chain.',
          why: 'Timely rewards maintain motivation. Automation ensures consistency and fairness.',
          future: 'Bonus multipliers for streaks. Referral bonuses.',
        },
        {
          icon: '🌍',
          name: 'Regional Leads',
          status: 'planned',
          what: 'Geographic ambassador leadership structure for local community building.',
          how: 'Top ambassadors nominated for regional lead roles. Leads coordinate local events and recruit ambassadors.',
          why: 'Local presence builds stronger communities. Language and timezone alignment improves engagement.',
          future: 'Regional events budget. Local language content programs.',
        },
      ],
      roadmap: [
        { phase: 'Q2', text: 'Launch beta with core missions' },
        { phase: 'Q3', text: 'NFT badge minting' },
        { phase: 'Q4', text: 'Regional ambassador structure' },
      ],
      integrations: ['Community Hub', 'Metaplex', 'Discord'],
      github: null,
      demo: null,
    },
    'content-factory': {
      icon: '🎬',
      title: 'Content Factory',
      status: 'planned',
      overview:
        'Tools and templates for community content creators. Includes meme generator, post scheduler, and creator rewards program.',
      features: [
        {
          name: 'Template library',
          what: 'Pre-designed graphics templates for social media posts, memes, and announcements.',
          how: 'Templates stored in Cloudinary with editable text layers. React component renders preview. Export in multiple sizes for different platforms.',
          why: 'Not everyone is a designer. Templates lower the barrier to creating professional-looking content.',
        },
        {
          name: 'Meme generator',
          what: 'Easy-to-use tool for creating on-brand memes with custom text and images.',
          how: 'Canvas-based editor with drag-drop images. Text overlays with positioning and styling. Background removal and filters available.',
          why: 'Memes drive viral spread. Giving creators tools produces more content with consistent branding.',
        },
        {
          name: 'Post scheduler',
          what: 'Plan and schedule social media posts across multiple platforms.',
          how: 'Calendar interface for scheduling. Queue system stores posts. At scheduled time, posts to connected accounts via API.',
          why: 'Consistent posting requires planning. Scheduling prevents gaps and enables batch content creation.',
        },
        {
          name: 'Creator rewards',
          what: 'Performance-based rewards for content that drives engagement.',
          how: 'Engagement metrics tracked for shared content. Points awarded based on reach and interactions. Monthly distribution to top creators.',
          why: 'Incentives drive output. Rewarding successful content encourages quality and quantity.',
        },
        {
          name: 'Analytics dashboard',
          what: 'Track performance of your created content across platforms.',
          how: 'APIs pull engagement data. Dashboard aggregates views, likes, shares. Best-performing content highlighted for learning.',
          why: 'Data improves content. Understanding what works helps creators optimize their output.',
        },
      ],
      tech: ['React', 'Canvas API', 'Cloudinary', 'PostgreSQL'],
      dependencies:
        'Integrates with Ambassador Program for creator rewards. Discord bot for scheduled posting.',
      architecture:
        'React app with canvas-based image editor. Templates stored in Cloudinary. Scheduler uses queue system for cross-platform posting. Engagement metrics tracked for creator rewards calculation.',
      miniTree: [
        {
          icon: '🖼️',
          name: 'Template Library',
          status: 'planned',
          what: 'Pre-designed graphics templates for social posts, memes, and announcements.',
          how: 'Templates stored in Cloudinary with editable layers. React component renders preview. Export in multiple sizes.',
          why: 'Not everyone is a designer. Templates lower barrier to professional-looking content.',
          future: 'Community template submissions. Seasonal template packs.',
        },
        {
          icon: '🎨',
          name: 'Meme Generator',
          status: 'planned',
          what: 'Easy-to-use tool for creating on-brand memes with custom text.',
          how: 'Canvas-based editor with drag-drop images. Text overlays with styling. Background removal and filters.',
          why: 'Memes drive viral spread. Tools produce more content with consistent branding.',
          future: 'AI meme suggestions. Trending template detection.',
        },
        {
          icon: '📅',
          name: 'Post Scheduler',
          status: 'planned',
          what: 'Plan and schedule social media posts across platforms.',
          how: 'Calendar interface for scheduling. Queue system stores posts. Automated posting via platform APIs.',
          why: 'Consistent posting requires planning. Scheduling enables batch content creation.',
          future: 'Optimal time suggestions. Cross-posting optimization.',
        },
        {
          icon: '💰',
          name: 'Creator Rewards',
          status: 'planned',
          what: 'Performance-based rewards for content driving engagement.',
          how: 'Engagement metrics tracked. Points awarded for reach and interactions. Monthly distribution to top creators.',
          why: 'Incentives drive output. Rewarding successful content encourages quality.',
          future: 'Tiered creator program. Sponsored content matching.',
        },
        {
          icon: '📊',
          name: 'Analytics',
          status: 'planned',
          what: 'Track performance of your created content across platforms.',
          how: 'APIs pull engagement data. Dashboard aggregates views, likes, shares. Best-performing content highlighted.',
          why: 'Data improves content. Understanding what works helps creators optimize.',
          future: 'Competitor analysis. Trend predictions.',
        },
        {
          icon: '🤖',
          name: 'AI Suggestions',
          status: 'planned',
          what: 'AI-powered content ideas and caption generation.',
          how: 'LLM integration suggests topics, captions, and hashtags based on trending themes and past performance.',
          why: 'Creative blocks slow production. AI assistance keeps the content flowing.',
          future: 'Brand voice training. Multi-language generation.',
        },
      ],
      roadmap: [
        { phase: 'Q2', text: 'Launch template library' },
        { phase: 'Q3', text: 'Meme generator with AI' },
        { phase: 'Q4', text: 'Creator rewards program' },
      ],
      integrations: ['Ambassador Program', 'Discord', 'Twitter'],
      github: null,
      demo: null,
    },
    'security-audit': {
      icon: '🛡️',
      title: 'Security Audit',
      status: 'planned',
      overview:
        'Security scanning suite for smart contracts and APIs. Integrates Slither, Mythril, and OWASP ZAP with automated reporting.',
      features: [
        {
          name: 'Smart contract scanning',
          what: 'Automated analysis of Solana programs for common vulnerabilities.',
          how: 'Slither and custom Solana-specific analyzers parse program code. Pattern matching identifies known vulnerability classes. Reports detail findings with severity.',
          why: 'Smart contract bugs can be catastrophic. Automated scanning catches common issues before deployment.',
        },
        {
          name: 'API fuzzing',
          what: 'Automated testing of API endpoints with malformed and edge-case inputs.',
          how: 'OWASP ZAP generates test cases. Fuzzer sends requests and monitors responses. Unexpected behaviors flagged for review.',
          why: 'APIs are attack surfaces. Fuzzing discovers input validation issues that could be exploited.',
        },
        {
          name: 'Vulnerability reports',
          what: 'Detailed documentation of discovered issues with remediation guidance.',
          how: 'Findings compiled with severity, impact, and fix suggestions. Reports generated in PDF and JSON. Tracking system monitors fix status.',
          why: 'Discovery without documentation is useless. Clear reports enable developers to understand and fix issues.',
        },
        {
          name: 'Compliance checks',
          what: 'Verification against security best practices and standards.',
          how: 'Checklist system validates configuration and code patterns. Each check maps to security standards. Compliance score calculated.',
          why: 'Best practices prevent common issues. Compliance checks ensure nothing is overlooked.',
        },
        {
          name: 'Continuous monitoring',
          what: 'Ongoing security scanning as part of the CI/CD pipeline.',
          how: 'GitHub Actions integration runs scans on every PR. Blocking failures for critical issues. Dashboard shows security posture over time.',
          why: 'Security is not one-time. Continuous scanning catches regressions and new vulnerabilities.',
        },
      ],
      tech: ['Python', 'Slither', 'Mythril', 'OWASP ZAP'],
      dependencies:
        'Scans all ecosystem smart contracts. Integrates with Deploy Pipeline for pre-deploy checks.',
      architecture:
        'Python orchestration layer manages scanning tools. Slither and Mythril analyze Solana programs. OWASP ZAP handles API security testing. Reports generated in standardized format with severity scoring.',
      miniTree: [
        {
          icon: '🔍',
          name: 'Contract Scanner',
          status: 'planned',
          what: 'Automated analysis of Solana programs for common vulnerabilities.',
          how: 'Slither-style analyzers parse program code. Pattern matching identifies vulnerability classes. Reports detail findings with severity.',
          why: 'Smart contract bugs can be catastrophic. Automated scanning catches common issues before deployment.',
          future: 'Custom rule definitions. Coverage metrics.',
        },
        {
          icon: '🕷️',
          name: 'API Fuzzing',
          status: 'planned',
          what: 'Automated testing of API endpoints with malformed inputs.',
          how: 'OWASP ZAP generates test cases. Fuzzer sends requests and monitors responses. Unexpected behaviors flagged.',
          why: 'APIs are attack surfaces. Fuzzing discovers input validation issues that could be exploited.',
          future: 'Stateful fuzzing. Authentication bypass testing.',
        },
        {
          icon: '📋',
          name: 'Checklist System',
          status: 'planned',
          what: 'Structured security checklist for manual review of critical code.',
          how: 'Checklist items defined per project type. Reviewers mark items as checked/unchecked. Status tracked across reviews.',
          why: 'Not everything is automatable. Checklists ensure consistent manual review coverage.',
          future: 'Role-based checklists. Compliance mapping.',
        },
        {
          icon: '📝',
          name: 'Auto Reports',
          status: 'planned',
          what: 'Automated generation of security assessment reports.',
          how: 'Aggregates findings from all tools. Standardized format with severity scoring. PDF and markdown export.',
          why: 'Consistent reporting builds trust. Automated reports save time and ensure completeness.',
          future: 'Executive summary generation. Trend analysis.',
        },
        {
          icon: '🔔',
          name: 'Vuln Alerts',
          status: 'planned',
          what: 'Real-time notifications when new vulnerabilities are discovered.',
          how: 'Continuous scanning detects new issues. Alert rules specify severity thresholds. Discord/Telegram notifications.',
          why: 'Speed matters in security. Immediate alerts enable rapid response to vulnerabilities.',
          future: 'CVE monitoring for dependencies. Automated patching suggestions.',
        },
        {
          icon: '🏆',
          name: 'Bug Bounty',
          status: 'planned',
          what: 'Incentive program for external security researchers.',
          how: 'Bug submission portal with severity guidelines. Triage process validates reports. Rewards paid on confirmation.',
          why: 'External eyes find internal blind spots. Bug bounties leverage global security talent.',
          future: 'Leaderboard for researchers. Partnership with platforms like Immunefi.',
        },
      ],
      roadmap: [
        { phase: 'Q2', text: 'Basic contract scanning' },
        { phase: 'Q3', text: 'API security integration' },
        { phase: 'Q4', text: 'Bug bounty platform' },
      ],
      integrations: ['Deploy Pipeline', 'All Smart Contracts'],
      github: null,
      demo: null,
    },
    forecast: {
      icon: '📈',
      title: 'ASDForecast',
      status: 'live',
      overview:
        'Prediction market platform allowing users to forecast prices and market events. Place predictions on token prices, ecosystem milestones, and earn rewards for accurate forecasts.',
      features: [
        {
          name: 'Price predictions',
          what: 'Forecast token prices at specific dates and earn rewards for accuracy.',
          how: 'Users submit predictions with stake. Smart contract locks stakes until resolution. Oracle fetches actual price at target date and distributes rewards to accurate predictors.',
          why: 'Gamifies market analysis. Users can profit from their research and insights while contributing to collective price discovery.',
        },
        {
          name: 'Event markets',
          what: 'Predict ecosystem events like launches, partnerships, and milestone achievements.',
          how: 'Binary outcome markets created for specific events. Users buy Yes/No shares. Resolution determined by oracle or community consensus.',
          why: 'Extends prediction beyond price. Covers qualitative events that matter to the ecosystem.',
        },
        {
          name: 'Leaderboards',
          what: 'Track top forecasters with accuracy ratings and profit metrics.',
          how: 'Historical predictions tracked per user. Accuracy percentage calculated. Profit/loss aggregated. Rankings updated in real-time.',
          why: 'Recognition motivates participation. Leaderboards identify skilled forecasters whose predictions may be more valuable.',
        },
        {
          name: 'Reward distribution',
          what: 'Automatic payout of rewards to accurate predictors.',
          how: 'Smart contract calculates shares based on stake and accuracy. Rewards distributed proportionally. Failed predictions forfeit stake to winner pool.',
          why: 'Fair, transparent incentive structure. Accurate forecasters earn from their skill.',
        },
      ],
      tech: ['Solana', 'Rust', 'Anchor', 'React'],
      dependencies: 'Uses ASDF Oracle for price resolution. Helius for transaction monitoring.',
      architecture:
        'Prediction markets run on Solana smart contracts with PDA-based market accounts. Oracle integration for price resolution. React frontend for market creation and participation.',
      miniTree: [
        {
          icon: '🎯',
          name: 'Price Markets',
          status: 'completed',
          what: 'Markets for predicting token prices at future dates.',
          how: 'Smart contract manages stakes and calculates payouts based on prediction accuracy relative to actual price.',
          why: 'Core prediction functionality. Allows users to profit from accurate price forecasts.',
          future: 'Range predictions. Confidence intervals. Multi-token baskets.',
        },
        {
          icon: '📊',
          name: 'Event Markets',
          status: 'completed',
          what: 'Binary markets for ecosystem events and milestones.',
          how: 'Yes/No share trading with oracle or community resolution.',
          why: 'Captures predictions beyond price. Engages community in ecosystem developments.',
          future: 'Multi-outcome events. Community market creation.',
        },
        {
          icon: '🏆',
          name: 'Leaderboards',
          status: 'completed',
          what: 'Rankings of top forecasters by accuracy and profit.',
          how: 'Historical prediction tracking with accuracy calculations and profit aggregation.',
          why: 'Gamification and recognition. Identifies skilled forecasters.',
          future: 'Seasonal competitions. Pro forecaster badges.',
        },
        {
          icon: '🔮',
          name: 'Oracle Integration',
          status: 'in-progress',
          what: 'Reliable price feeds for market resolution.',
          how: 'ASDF Oracle integration with fallback to multiple sources.',
          why: 'Accurate resolution is critical for fair payouts.',
          future: 'Multi-oracle consensus. Custom resolution mechanisms.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Launch additional event markets' },
        { phase: 'Q2', text: 'Seasonal prediction tournaments' },
        { phase: 'Q3', text: 'Advanced analytics dashboard' },
      ],
      integrations: ['ASDF Oracle', 'Helius', 'Jupiter'],
      github: 'https://github.com/sollama58/ASDForecast',
      demo: null,
    },
    ignition: {
      icon: '🔥',
      title: 'Ignition',
      status: 'live',
      overview:
        'Token launch platform and incubator for the ASDF ecosystem. Provides fair launch mechanisms, vesting schedules, and early access for community members.',
      features: [
        {
          name: 'Fair launch mechanism',
          what: 'Equal opportunity token distribution without whale manipulation.',
          how: 'Time-weighted contribution system. Maximum contribution caps. Anti-bot measures. All participants get same price.',
          why: 'Fair launches build trust. Prevents early whales from dominating supply and dumping on retail.',
        },
        {
          name: 'Vesting schedules',
          what: 'Configurable token unlock schedules for team and investors.',
          how: 'Smart contract holds tokens with time-locked release. Cliff periods, linear vesting, or custom schedules supported.',
          why: 'Prevents immediate dumps. Aligns long-term incentives between team and community.',
        },
        {
          name: 'Project incubation',
          what: 'Support and resources for new projects launching in the ecosystem.',
          how: 'Application and review process. Accepted projects receive technical guidance, marketing support, and launch platform access.',
          why: 'Quality control for ecosystem. Incubation ensures launched projects meet standards.',
        },
        {
          name: 'Community allocation',
          what: 'Reserved token allocation for active community members.',
          how: 'Whitelist based on engagement metrics. Exclusive early access rounds. Community gets priority over public sale.',
          why: 'Rewards loyal community. Early supporters get first access to new opportunities.',
        },
      ],
      tech: ['Solana', 'Rust', 'Anchor', 'React'],
      dependencies: 'Burn Engine integration for launch burns. Oracle for price feeds.',
      architecture:
        'Launch contracts manage contribution collection and token distribution. Vesting contracts handle scheduled unlocks. React frontend for project browsing and participation.',
      miniTree: [
        {
          icon: '🚀',
          name: 'Launch Platform',
          status: 'completed',
          what: 'Core platform for fair token launches.',
          how: 'Smart contracts manage contributions, caps, and distribution. Anti-bot measures protect fairness.',
          why: 'Foundation of fair launches. Equal opportunity for all participants.',
          future: 'Dutch auctions. Bonding curve launches.',
        },
        {
          icon: '🔒',
          name: 'Vesting Contracts',
          status: 'completed',
          what: 'Time-locked token distribution with configurable schedules.',
          how: 'PDAs hold vested tokens. Claim function checks unlock schedule. Supports cliff and linear vesting.',
          why: 'Prevents immediate selling. Ensures long-term alignment.',
          future: 'Milestone-based vesting. Cancellable vesting for employees.',
        },
        {
          icon: '🌱',
          name: 'Incubator',
          status: 'in-progress',
          what: 'Project review and support program.',
          how: 'Application portal, team review, technical audit, launch preparation.',
          why: 'Quality control. Ensures launched projects are legitimate and prepared.',
          future: 'Mentor network. Funding partnerships.',
        },
        {
          icon: '📋',
          name: 'Whitelist System',
          status: 'completed',
          what: 'Community allocation and early access management.',
          how: 'Engagement-based scoring. Automatic whitelist qualification. Reserved allocation tiers.',
          why: 'Rewards active community. Fair distribution priority.',
          future: 'Dynamic whitelisting. Reputation system integration.',
        },
      ],
      roadmap: [
        { phase: 'Q1', text: 'Launch first incubated projects' },
        { phase: 'Q2', text: 'Introduce staking for allocation boost' },
        { phase: 'Q3', text: 'Cross-ecosystem launch partnerships' },
      ],
      integrations: ['Burn Engine', 'ASDF Oracle', 'Helius'],
      github: 'https://github.com/zeyxx',
      demo: null,
    },
  };

  // ============================================
  // VIEW SWITCHING
  // ============================================
  const viewSwitchBtns = document.querySelectorAll('.view-switch-btn');
  const viewSections = document.querySelectorAll('.view-section');

  viewSwitchBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetView = this.dataset.view;

      viewSwitchBtns.forEach(function (b) {
        b.classList.remove('active');
      });
      this.classList.add('active');

      viewSections.forEach(function (section) {
        section.classList.remove('active');
      });
      const targetSection = document.getElementById('view-' + targetView);
      if (targetSection) targetSection.classList.add('active');

      history.replaceState(null, '', '#' + targetView);
    });
  });

  // Check hash on load
  const hash = window.location.hash.replace('#', '');
  if (hash === 'yggdrasil' || hash === 'marketplace') {
    const btn = document.querySelector('.view-switch-btn[data-view="' + hash + '"]');
    if (btn) btn.click();
  }

  // ============================================
  // REALM CLICKS (Legacy Vertical Tree)
  // ============================================
  const realms = document.querySelectorAll('.realm');
  const coreRealm = document.querySelector('.core-realm');

  realms.forEach(function (realm) {
    realm.addEventListener('click', function () {
      const projectId = this.dataset.project;
      if (projectId) openDocModal(projectId);
    });
  });

  if (coreRealm) {
    coreRealm.addEventListener('click', function () {
      openDocModal('burn-engine');
    });
  }

  // ============================================
  // CANONICAL TREE CLICKS (New Structure)
  // ============================================
  const treeNodes = document.querySelectorAll('.tree-node');
  const treeHeart = document.querySelector('.tree-heart');

  treeNodes.forEach(function (node) {
    node.addEventListener('click', function () {
      const projectId = this.dataset.project;
      if (projectId) openDocModal(projectId);
    });
  });

  if (treeHeart) {
    treeHeart.addEventListener('click', function () {
      const projectId = this.dataset.project || 'burn-engine';
      openDocModal(projectId);
    });
  }

  // ============================================
  // STATUS FILTER (Yggdrasil)
  // ============================================
  const filterPills = document.querySelectorAll('.filter-pill');

  filterPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      const status = this.dataset.status;

      filterPills.forEach(function (p) {
        p.classList.remove('active');
      });
      this.classList.add('active');

      // Filter legacy realms
      realms.forEach(function (realm) {
        if (status === 'all' || realm.dataset.status === status) {
          realm.classList.remove('hidden');
        } else {
          realm.classList.add('hidden');
        }
      });

      // Filter new tree nodes
      treeNodes.forEach(function (node) {
        if (status === 'all' || node.dataset.status === status) {
          node.classList.remove('hidden');
        } else {
          node.classList.add('hidden');
        }
      });
    });
  });

  // ============================================
  // SKILLS FILTER (Marketplace)
  // ============================================
  const skillPills = document.querySelectorAll('.skill-pill');
  const builderCards = document.querySelectorAll('.builder-card');

  skillPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      const skill = this.dataset.skill;

      skillPills.forEach(function (p) {
        p.classList.remove('active');
      });
      this.classList.add('active');

      builderCards.forEach(function (card) {
        const skills = card.dataset.skills || '';
        if (skill === 'all' || skills.includes(skill)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  // ============================================
  // VIEW TREE FROM MARKETPLACE
  // ============================================
  const viewTreeBtns = document.querySelectorAll('[data-action="view-tree"]');

  viewTreeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const yggdrasilBtn = document.querySelector('.view-switch-btn[data-view="yggdrasil"]');
      if (yggdrasilBtn) yggdrasilBtn.click();

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // ============================================
  // DOC MODAL (Level 2)
  // ============================================
  const docModal = document.getElementById('doc-modal');
  const docModalBackdrop = docModal ? docModal.querySelector('.modal-backdrop') : null;
  const docModalClose = docModal ? docModal.querySelector('.modal-close') : null;

  let currentProjectId = null;

  function openDocModal(projectId) {
    const project = projectsData[projectId];
    if (!project || !docModal) return;

    currentProjectId = projectId;

    // Populate modal
    const icon = document.getElementById('doc-modal-icon');
    const title = document.getElementById('doc-modal-title');
    const status = document.getElementById('doc-modal-status');
    const overview = document.getElementById('doc-modal-overview');
    const features = document.getElementById('doc-modal-features');
    const tech = document.getElementById('doc-modal-tech');
    const deps = document.getElementById('doc-modal-deps');
    const github = document.getElementById('doc-modal-github');
    const demo = document.getElementById('doc-modal-demo');

    if (icon) icon.textContent = project.icon;
    if (title) title.textContent = project.title;
    if (status) {
      status.textContent = project.status.toUpperCase();
      status.className = 'modal-status ' + project.status;
    }
    if (overview) overview.textContent = project.overview;

    if (features) {
      features.innerHTML = '';
      project.features.forEach(function (f, index) {
        const li = document.createElement('li');
        li.textContent = typeof f === 'string' ? f : f.name;
        li.dataset.featureIndex = index;
        li.dataset.projectId = projectId;
        li.addEventListener('click', function (e) {
          e.stopPropagation();
          openFeatureModal(projectId, index);
        });
        features.appendChild(li);
      });
    }

    if (tech) {
      tech.innerHTML = '';
      project.tech.forEach(function (t) {
        const span = document.createElement('span');
        span.className = 'doc-tech-tag';
        span.textContent = t;
        tech.appendChild(span);
      });
    }

    if (deps) deps.textContent = project.dependencies;

    if (github) {
      if (project.github) {
        github.href = project.github;
        github.style.display = 'inline-flex';
      } else {
        github.style.display = 'none';
      }
    }

    if (demo) {
      if (project.demo) {
        demo.href = project.demo;
        demo.style.display = 'inline-flex';
      } else {
        demo.style.display = 'none';
      }
    }

    docModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDocModal() {
    if (docModal) {
      docModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (docModalClose) docModalClose.addEventListener('click', closeDocModal);
  if (docModalBackdrop) docModalBackdrop.addEventListener('click', closeDocModal);

  // ============================================
  // FEATURE MODAL (Pedagogical Explanations)
  // ============================================
  const featureModal = document.getElementById('feature-modal');
  const featureModalBackdrop = featureModal ? featureModal.querySelector('.modal-backdrop') : null;
  const featureModalClose = featureModal ? featureModal.querySelector('.modal-close') : null;

  function openFeatureModal(projectId, featureIndex) {
    const project = projectsData[projectId];
    if (!project || !featureModal) return;

    const feature = project.features[featureIndex];
    if (!feature || typeof feature === 'string') return;

    const title = document.getElementById('feature-modal-title');
    const whatEl = document.getElementById('feature-modal-what');
    const howEl = document.getElementById('feature-modal-how');
    const whyEl = document.getElementById('feature-modal-why');

    if (title) title.textContent = feature.name;
    if (whatEl) whatEl.textContent = feature.what;
    if (howEl) howEl.textContent = feature.how;
    if (whyEl) whyEl.textContent = feature.why;

    featureModal.classList.add('active');
  }

  function closeFeatureModal() {
    if (featureModal) {
      featureModal.classList.remove('active');
    }
  }

  if (featureModalClose) featureModalClose.addEventListener('click', closeFeatureModal);
  if (featureModalBackdrop) featureModalBackdrop.addEventListener('click', closeFeatureModal);

  // ============================================
  // COMPONENT MODAL (Feature Tree Documentation)
  // ============================================
  const componentModal = document.getElementById('component-modal');
  const componentModalBackdrop = componentModal
    ? componentModal.querySelector('.modal-backdrop')
    : null;
  const componentModalClose = componentModal ? componentModal.querySelector('.modal-close') : null;

  function openComponentModal(projectId, componentIndex) {
    const project = projectsData[projectId];
    if (!project || !componentModal) return;

    const component = project.miniTree[componentIndex];
    if (!component) return;

    const icon = document.getElementById('component-modal-icon');
    const title = document.getElementById('component-modal-title');
    const status = document.getElementById('component-modal-status');
    const whatEl = document.getElementById('component-modal-what');
    const howEl = document.getElementById('component-modal-how');
    const whyEl = document.getElementById('component-modal-why');
    const futureEl = document.getElementById('component-modal-future');

    if (icon) icon.textContent = component.icon;
    if (title) title.textContent = component.name;
    if (status) {
      status.textContent = component.status.replace('-', ' ').toUpperCase();
      status.className = 'component-status ' + component.status;
    }
    if (whatEl) whatEl.textContent = component.what || 'Documentation coming soon.';
    if (howEl) howEl.textContent = component.how || 'Implementation details coming soon.';
    if (whyEl) whyEl.textContent = component.why || 'Purpose explanation coming soon.';
    if (futureEl) futureEl.textContent = component.future || 'Future roadmap to be announced.';

    componentModal.classList.add('active');
  }

  function closeComponentModal() {
    if (componentModal) {
      componentModal.classList.remove('active');
    }
  }

  if (componentModalClose) componentModalClose.addEventListener('click', closeComponentModal);
  if (componentModalBackdrop) componentModalBackdrop.addEventListener('click', closeComponentModal);

  // ============================================
  // CODE LEARNING MODAL
  // ============================================
  const codeLearningModal = document.getElementById('code-learning-modal');
  const codeLearningBackdrop = codeLearningModal
    ? codeLearningModal.querySelector('.modal-backdrop')
    : null;
  const codeLearningClose = codeLearningModal
    ? codeLearningModal.querySelector('.modal-close')
    : null;
  const codeLearningBtn = document.getElementById('component-code-learning');

  let currentLearningProject = null;
  let currentLearningComponent = null;

  function openCodeLearningModal(projectId, componentIndex) {
    const project = projectsData[projectId];
    if (!project || !codeLearningModal) return;

    const component = project.miniTree[componentIndex];
    if (!component) return;

    currentLearningProject = projectId;
    currentLearningComponent = componentIndex;

    const icon = document.getElementById('code-learning-icon');
    const title = document.getElementById('code-learning-title');

    if (icon) icon.textContent = component.icon;
    if (title) title.textContent = component.name + ' - Code Learning';

    // Load learning content (placeholder for now)
    loadLearningContent(project, component);

    codeLearningModal.classList.add('active');
  }

  function loadLearningContent(project, component) {
    const conceptDiagram = document.getElementById('concept-diagram');
    const conceptExplanation = document.getElementById('concept-explanation');
    const codeExamples = document.getElementById('code-examples');
    const tipsList = document.getElementById('tips-list');
    const readmeContent = document.getElementById('readme-content');

    // Generate SVG diagram based on component type
    if (conceptDiagram) {
      safeInnerHTML(conceptDiagram, generateConceptDiagram(component, project));
    }

    if (conceptExplanation) {
      safeInnerHTML(conceptExplanation, generateConceptExplanation(component, project));
    }

    if (codeExamples) {
      safeInnerHTML(codeExamples, generateCodeExamples(component, project));
      // Attach copy button handler (replaces inline onclick)
      var copyBtn = codeExamples.querySelector('.copy-code-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var codeEl = codeExamples.querySelector('code');
          if (codeEl) {
            navigator.clipboard.writeText(codeEl.innerText).then(function () {
              copyBtn.textContent = '✓ Copied!';
              setTimeout(function () {
                copyBtn.textContent = '📋 Copy';
              }, 2000);
            });
          }
        });
      }
    }

    if (tipsList) {
      safeInnerHTML(tipsList, generateTips(component, project));
    }

    if (readmeContent) {
      safeInnerHTML(readmeContent, generateReadme(component, project));
    }
  }

  // Generate SVG concept diagram
  function generateConceptDiagram(component, project) {
    const name = sanitizeText(component.name);
    const icon = component.icon;
    const status = component.status;

    // Create flow diagram based on component type
    var diagramSvg =
      '<svg viewBox="0 0 500 250" style="width: 100%; max-width: 500px; height: auto;">' +
      '<defs>' +
      '<linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
      '<stop offset="0%" style="stop-color:#fb923c;stop-opacity:0.8"/>' +
      '<stop offset="100%" style="stop-color:#ea580c;stop-opacity:0.8"/>' +
      '</linearGradient>' +
      '<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">' +
      '<polygon points="0 0, 10 3.5, 0 7" fill="#fb923c"/>' +
      '</marker>' +
      '</defs>';

    // Input box
    diagramSvg +=
      '<rect x="10" y="100" width="100" height="50" rx="8" fill="rgba(74, 222, 128, 0.2)" stroke="#4ade80" stroke-width="2"/>' +
      '<text x="60" y="130" text-anchor="middle" fill="#4ade80" font-size="12" font-family="sans-serif">Input</text>';

    // Arrow 1
    diagramSvg +=
      '<line x1="115" y1="125" x2="165" y2="125" stroke="#fb923c" stroke-width="2" marker-end="url(#arrowhead)"/>';

    // Process box (main component)
    diagramSvg +=
      '<rect x="170" y="85" width="160" height="80" rx="12" fill="url(#flowGrad)" stroke="#ea580c" stroke-width="2"/>' +
      '<text x="250" y="115" text-anchor="middle" fill="white" font-size="11" font-family="sans-serif" font-weight="bold">' +
      icon +
      '</text>' +
      '<text x="250" y="135" text-anchor="middle" fill="white" font-size="13" font-family="sans-serif" font-weight="bold">' +
      name +
      '</text>' +
      '<text x="250" y="152" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="10" font-family="sans-serif">' +
      status.toUpperCase() +
      '</text>';

    // Arrow 2
    diagramSvg +=
      '<line x1="335" y1="125" x2="385" y2="125" stroke="#fb923c" stroke-width="2" marker-end="url(#arrowhead)"/>';

    // Output box
    diagramSvg +=
      '<rect x="390" y="100" width="100" height="50" rx="8" fill="rgba(139, 92, 246, 0.2)" stroke="#8b5cf6" stroke-width="2"/>' +
      '<text x="440" y="130" text-anchor="middle" fill="#8b5cf6" font-size="12" font-family="sans-serif">Output</text>';

    // Sub-processes
    diagramSvg +=
      '<rect x="170" y="185" width="70" height="35" rx="6" fill="rgba(251, 146, 60, 0.15)" stroke="#fb923c" stroke-width="1"/>' +
      '<text x="205" y="207" text-anchor="middle" fill="#fb923c" font-size="10" font-family="sans-serif">Parse</text>';
    diagramSvg +=
      '<rect x="250" y="185" width="70" height="35" rx="6" fill="rgba(251, 146, 60, 0.15)" stroke="#fb923c" stroke-width="1"/>' +
      '<text x="285" y="207" text-anchor="middle" fill="#fb923c" font-size="10" font-family="sans-serif">Process</text>';

    // Connection lines to sub-processes
    diagramSvg +=
      '<line x1="205" y1="165" x2="205" y2="182" stroke="#fb923c" stroke-width="1" stroke-dasharray="4,2"/>';
    diagramSvg +=
      '<line x1="285" y1="165" x2="285" y2="182" stroke="#fb923c" stroke-width="1" stroke-dasharray="4,2"/>';

    // Title
    diagramSvg +=
      '<text x="250" y="30" text-anchor="middle" fill="#e2e8f0" font-size="14" font-family="sans-serif" font-weight="bold">Data Flow Architecture</text>' +
      '<text x="250" y="50" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="sans-serif">' +
      sanitizeText(project.title) +
      '</text>';

    diagramSvg += '</svg>';

    return '<div style="text-align: center; padding: 20px 0;">' + diagramSvg + '</div>';
  }

  // Generate concept explanation
  function generateConceptExplanation(component, project) {
    var html = '<div style="display: flex; flex-direction: column; gap: 16px;">';

    html +=
      '<div>' +
      '<h4 style="color: var(--accent-fire); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">' +
      '<span>🎯</span> Core Concept</h4>' +
      '<p style="color: var(--text-muted); line-height: 1.6;">' +
      escapeHtml(component.what || 'This component handles a key function in the ecosystem.') +
      '</p>' +
      '</div>';

    html +=
      '<div>' +
      '<h4 style="color: var(--accent-fire); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">' +
      '<span>⚙️</span> Technical Implementation</h4>' +
      '<p style="color: var(--text-muted); line-height: 1.6;">' +
      escapeHtml(component.how || 'Implementation details for this component.') +
      '</p>' +
      '</div>';

    html +=
      '<div>' +
      '<h4 style="color: var(--accent-fire); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">' +
      '<span>💡</span> Why It Matters</h4>' +
      '<p style="color: var(--text-muted); line-height: 1.6;">' +
      escapeHtml(component.why || 'Understanding the importance of this component.') +
      '</p>' +
      '</div>';

    html += '</div>';
    return html;
  }

  // Generate code examples
  function generateCodeExamples(component, project) {
    const name = sanitizeText(component.name).replace(/\s+/g, '');
    const projectTitle = sanitizeText(project.title).replace(/\s+/g, '');

    // Determine language based on project tech
    var lang = 'TypeScript';
    if (project.tech && project.tech.includes('Rust')) lang = 'Rust';

    var code = '';

    if (lang === 'Rust') {
      code =
        '// ' +
        name +
        ' - ' +
        projectTitle +
        '\\n' +
        '// Solana Program Implementation\\n\\n' +
        'use anchor_lang::prelude::*;\\n' +
        'use anchor_spl::token::{self, Token, TokenAccount};\\n\\n' +
        '#[program]\\n' +
        'pub mod ' +
        name.toLowerCase() +
        ' {\\n' +
        '    use super::*;\\n\\n' +
        '    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {\\n' +
        '        // Initialize the ' +
        name +
        ' state\\n' +
        '        let state = &mut ctx.accounts.state;\\n' +
        '        state.authority = ctx.accounts.authority.key();\\n' +
        '        state.is_active = true;\\n' +
        '        msg!("' +
        name +
        ' initialized successfully");\\n' +
        '        Ok(())\\n' +
        '    }\\n\\n' +
        '    pub fn process(ctx: Context<Process>, amount: u64) -> Result<()> {\\n' +
        '        // Process logic for ' +
        name +
        '\\n' +
        '        require!(amount > 0, ErrorCode::InvalidAmount);\\n' +
        '        \\n' +
        '        // Execute the core logic\\n' +
        '        let result = execute_' +
        name.toLowerCase() +
        '(amount)?;\\n' +
        '        \\n' +
        '        emit!(ProcessEvent {\\n' +
        '            amount,\\n' +
        '            result,\\n' +
        '            timestamp: Clock::get()?.unix_timestamp,\\n' +
        '        });\\n' +
        '        \\n' +
        '        Ok(())\\n' +
        '    }\\n' +
        '}\\n\\n' +
        '#[derive(Accounts)]\\n' +
        "pub struct Initialize<'info> {\\n" +
        '    #[account(init, payer = authority, space = 8 + State::SIZE)]\\n' +
        "    pub state: Account<'info, State>,\\n" +
        '    #[account(mut)]\\n' +
        "    pub authority: Signer<'info>,\\n" +
        "    pub system_program: Program<'info, System>,\\n" +
        '}';
    } else {
      code =
        '// ' +
        name +
        ' - ' +
        projectTitle +
        '\\n' +
        '// TypeScript Implementation\\n\\n' +
        'import { Connection, PublicKey } from "@solana/web3.js";\\n' +
        'import { Program, AnchorProvider } from "@coral-xyz/anchor";\\n\\n' +
        'interface ' +
        name +
        'Config {\\n' +
        '  rpcEndpoint: string;\\n' +
        '  programId: PublicKey;\\n' +
        '  commitment?: "processed" | "confirmed" | "finalized";\\n' +
        '}\\n\\n' +
        'export class ' +
        name +
        ' {\\n' +
        '  private connection: Connection;\\n' +
        '  private program: Program;\\n\\n' +
        '  constructor(config: ' +
        name +
        'Config) {\\n' +
        '    this.connection = new Connection(\\n' +
        '      config.rpcEndpoint,\\n' +
        '      config.commitment || "confirmed"\\n' +
        '    );\\n' +
        '    // Initialize program...\\n' +
        '  }\\n\\n' +
        '  async initialize(): Promise<void> {\\n' +
        '    console.log("Initializing ' +
        name +
        '...");\\n' +
        '    // Initialization logic\\n' +
        '  }\\n\\n' +
        '  async process(data: ProcessInput): Promise<ProcessResult> {\\n' +
        '    // Validate input\\n' +
        '    this.validateInput(data);\\n' +
        '    \\n' +
        '    // Execute core logic\\n' +
        '    const result = await this.executeLogic(data);\\n' +
        '    \\n' +
        '    // Emit event\\n' +
        '    this.emit("processed", { data, result });\\n' +
        '    \\n' +
        '    return result;\\n' +
        '  }\\n\\n' +
        '  private validateInput(data: ProcessInput): void {\\n' +
        '    if (!data || !data.amount) {\\n' +
        '      throw new Error("Invalid input data");\\n' +
        '    }\\n' +
        '  }\\n' +
        '}';
    }

    return (
      '<div class="code-header">' +
      '<span class="code-lang">' +
      escapeHtml(lang) +
      '</span>' +
      '<button class="btn btn-sm copy-code-btn" style="padding: 4px 12px; font-size: 11px;">📋 Copy</button>' +
      '</div>' +
      '<pre style="margin: 0; padding: 20px; overflow-x: auto; font-size: 13px; line-height: 1.5;"><code style="color: #e2e8f0; font-family: \'JetBrains Mono\', monospace;">' +
      escapeHtml(code) +
      '</code></pre>'
    );
  }

  // Generate tips
  function generateTips(component, project) {
    var tips = [
      {
        icon: '💡',
        title: 'Understand the Data Flow',
        text:
          'Before implementing ' +
          sanitizeText(component.name) +
          ', trace the data flow from input to output. Understanding how data transforms at each step prevents debugging headaches later.',
      },
      {
        icon: '⚠️',
        title: 'Handle Edge Cases',
        text: 'Always validate inputs and handle edge cases like empty data, invalid formats, or network failures. Use try-catch blocks and provide meaningful error messages.',
      },
      {
        icon: '🔒',
        title: 'Security First',
        text: 'Never trust user input. Sanitize all data, validate signatures on-chain, and follow Solana security best practices. Consider getting an audit for production code.',
      },
      {
        icon: '🚀',
        title: 'Optimize for Performance',
        text: 'Minimize compute units by batching operations. Use PDAs efficiently and leverage Helius RPC for reliable transaction processing.',
      },
      {
        icon: '📊',
        title: 'Monitor and Log',
        text: 'Implement proper logging and monitoring. Track key metrics, set up alerts for anomalies, and maintain audit trails for debugging.',
      },
      {
        icon: '🧪',
        title: 'Test Thoroughly',
        text: 'Write unit tests, integration tests, and use devnet for testing. Simulate edge cases and stress test before mainnet deployment.',
      },
    ];

    var html = '';
    tips.forEach(function (tip) {
      html +=
        '<div class="tip-item">' +
        '<span class="tip-icon">' +
        tip.icon +
        '</span>' +
        '<div class="tip-content">' +
        '<h4>' +
        tip.title +
        '</h4>' +
        '<p>' +
        tip.text +
        '</p>' +
        '</div></div>';
    });

    return html;
  }

  // Generate README content
  function generateReadme(component, project) {
    const name = sanitizeText(component.name);
    const projectTitle = sanitizeText(project.title);

    var html =
      '<h2>' +
      escapeHtml(component.icon) +
      ' ' +
      name +
      '</h2>' +
      '<p style="font-size: 16px; color: var(--text-light); margin-bottom: 20px;">' +
      'Part of the <strong>' +
      projectTitle +
      '</strong> ecosystem component.' +
      '</p>';

    html +=
      '<h3>📋 Overview</h3>' +
      '<p>' +
      escapeHtml(
        component.what || 'This component provides essential functionality for the ecosystem.'
      ) +
      '</p>';

    html +=
      '<h3>⚙️ How It Works</h3>' +
      '<p>' +
      escapeHtml(component.how || 'Technical implementation details for this component.') +
      '</p>';

    html +=
      '<h3>🎯 Purpose</h3>' +
      '<p>' +
      escapeHtml(component.why || 'Understanding why this component is essential.') +
      '</p>';

    html +=
      '<h3>📦 Dependencies</h3>' +
      '<ul>' +
      '<li><code>@solana/web3.js</code> - Solana JavaScript SDK</li>' +
      '<li><code>@coral-xyz/anchor</code> - Anchor framework</li>';

    if (project.tech) {
      project.tech.forEach(function (tech) {
        html += '<li><code>' + escapeHtml(tech) + '</code></li>';
      });
    }
    html += '</ul>';

    html +=
      '<h3>🚀 Future Development</h3>' +
      '<p>' +
      escapeHtml(component.future || 'Future improvements and roadmap for this component.') +
      '</p>';

    html += '<h3>🔗 Related Components</h3>' + '<ul>';

    if (project.miniTree) {
      project.miniTree.forEach(function (item) {
        if (item.name !== component.name) {
          html +=
            '<li>' +
            escapeHtml(item.icon) +
            ' <strong>' +
            sanitizeText(item.name) +
            '</strong> - ' +
            '<span style="color: var(--text-muted);">' +
            escapeHtml(item.status) +
            '</span></li>';
        }
      });
    }
    html += '</ul>';

    html +=
      '<h3>📚 Additional Resources</h3>' +
      '<ul>' +
      '<li><a href="' +
      escapeHtml(project.github || '#') +
      '" target="_blank" style="color: var(--accent-fire);">GitHub Repository</a></li>' +
      '<li><a href="https://docs.solana.com" target="_blank" style="color: var(--accent-fire);">Solana Documentation</a></li>' +
      '<li><a href="https://www.anchor-lang.com" target="_blank" style="color: var(--accent-fire);">Anchor Framework Docs</a></li>' +
      '</ul>';

    return html;
  }

  function closeCodeLearningModal() {
    if (codeLearningModal) {
      codeLearningModal.classList.remove('active');
    }
  }

  // Code Learning button click handler
  if (codeLearningBtn) {
    codeLearningBtn.addEventListener('click', function () {
      // Get current component context from component modal
      const componentTitle = document.getElementById('component-modal-title');
      if (componentTitle && currentLearningProject !== null && currentLearningComponent !== null) {
        closeComponentModal();
        openCodeLearningModal(currentLearningProject, currentLearningComponent);
      }
    });
  }

  // Store current project/component when opening component modal
  const originalOpenComponentModal = openComponentModal;
  openComponentModal = function (projectId, componentIndex) {
    currentLearningProject = projectId;
    currentLearningComponent = componentIndex;
    originalOpenComponentModal(projectId, componentIndex);
  };

  if (codeLearningClose) codeLearningClose.addEventListener('click', closeCodeLearningModal);
  if (codeLearningBackdrop) codeLearningBackdrop.addEventListener('click', closeCodeLearningModal);

  // Learning tabs switching
  const learningTabs = document.querySelectorAll('.learning-tab');
  const learningContents = document.querySelectorAll('.learning-content');

  learningTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      const targetTab = this.dataset.tab;

      // Update tabs
      learningTabs.forEach(function (t) {
        t.classList.remove('active');
      });
      this.classList.add('active');

      // Update content
      learningContents.forEach(function (content) {
        content.classList.remove('active');
        if (content.id === 'learning-' + targetTab) {
          content.classList.add('active');
        }
      });
    });
  });

  // ============================================
  // DEEP LEARN MODAL (Level 3)
  // ============================================
  const deepModal = document.getElementById('deep-modal');
  const deepModalBackdrop = deepModal ? deepModal.querySelector('.modal-backdrop') : null;
  const deepModalClose = deepModal ? deepModal.querySelector('.modal-close') : null;
  const deepLearnBtn = document.getElementById('doc-modal-deep');

  function openDeepModal(projectId) {
    const project = projectsData[projectId];
    if (!project || !deepModal) return;

    const icon = document.getElementById('deep-modal-icon');
    const title = document.getElementById('deep-modal-title');
    const tree = document.getElementById('deep-modal-tree');
    const arch = document.getElementById('deep-modal-arch');
    const roadmap = document.getElementById('deep-modal-roadmap');
    const integrations = document.getElementById('deep-modal-integrations');

    if (icon) icon.textContent = project.icon;
    if (title) title.textContent = 'Deep Learn: ' + project.title;

    // Build mini Yggdrasil
    if (tree) {
      tree.innerHTML = '';

      // Core node
      const core = document.createElement('div');
      core.className = 'mini-tree-core';
      safeInnerHTML(
        core,
        '<span class="mini-tree-core-icon">' +
          escapeHtml(project.icon) +
          '</span>' +
          '<div class="mini-tree-core-info">' +
          '<div class="mini-tree-core-name">' +
          sanitizeText(project.title) +
          '</div>' +
          '<div class="mini-tree-core-desc">Click a component for details</div></div>'
      );
      tree.appendChild(core);

      // Branches
      const branches = document.createElement('div');
      branches.className = 'mini-tree-branches';

      project.miniTree.forEach(function (item, index) {
        const branch = document.createElement('div');
        branch.className = 'mini-tree-branch clickable';
        safeInnerHTML(
          branch,
          '<span class="mini-tree-branch-icon">' +
            escapeHtml(item.icon) +
            '</span>' +
            '<div class="mini-tree-branch-info">' +
            '<div class="mini-tree-branch-name">' +
            sanitizeText(item.name) +
            '</div></div>' +
            '<span class="mini-tree-branch-status ' +
            escapeHtml(item.status) +
            '">' +
            escapeHtml(item.status.replace('-', ' ').toUpperCase()) +
            '</span>'
        );

        // Make clickable if has documentation
        if (item.what || item.how || item.why) {
          branch.style.cursor = 'pointer';
          branch.dataset.projectId = projectId;
          branch.dataset.componentIndex = index;
          branch.addEventListener('click', function (e) {
            e.stopPropagation();
            openComponentModal(projectId, index);
          });
        }

        branches.appendChild(branch);
      });

      tree.appendChild(branches);
    }

    if (arch) arch.textContent = project.architecture;

    if (roadmap) {
      roadmap.innerHTML = '';
      project.roadmap.forEach(function (item) {
        const div = document.createElement('div');
        div.className = 'roadmap-item';
        safeInnerHTML(
          div,
          '<span class="roadmap-item-phase">' +
            escapeHtml(item.phase) +
            '</span>' +
            '<span class="roadmap-item-text">' +
            sanitizeText(item.text) +
            '</span>'
        );
        roadmap.appendChild(div);
      });
    }

    if (integrations) {
      integrations.innerHTML = '';
      project.integrations.forEach(function (i) {
        const span = document.createElement('span');
        span.className = 'integration-tag';
        span.textContent = i;
        integrations.appendChild(span);
      });
    }

    closeDocModal();
    deepModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDeepModal() {
    if (deepModal) {
      deepModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (deepLearnBtn) {
    deepLearnBtn.addEventListener('click', function () {
      if (currentProjectId) openDeepModal(currentProjectId);
    });
  }

  if (deepModalClose) deepModalClose.addEventListener('click', closeDeepModal);
  if (deepModalBackdrop) deepModalBackdrop.addEventListener('click', closeDeepModal);

  // Escape key closes modals
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeFeatureModal();
      closeDocModal();
      closeDeepModal();
    }
  });

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  function sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // ANIMATIONS
  // ============================================

  // Animate skill bars on scroll
  const skillFills = document.querySelectorAll('.skill-fill');
  const skillObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const fill = entry.target;
          const width = fill.style.width;
          fill.style.width = '0%';
          setTimeout(function () {
            fill.style.width = width;
          }, 100);
          skillObserver.unobserve(fill);
        }
      });
    },
    { threshold: 0.5 }
  );

  skillFills.forEach(function (fill) {
    skillObserver.observe(fill);
  });

  // Animate stat counters
  const statValues = document.querySelectorAll('.hero-stat-value');
  statValues.forEach(function (stat) {
    const text = stat.textContent;
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      const duration = 1500;
      let startTime = null;

      function animate(time) {
        if (!startTime) startTime = time;
        const progress = Math.min((time - startTime) / duration, 1);
        stat.textContent = Math.floor(progress * num);
        if (progress < 1) requestAnimationFrame(animate);
        else stat.textContent = num;
      }

      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              requestAnimationFrame(animate);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );

      observer.observe(stat);
    }
  });

  // Animate realm glow on scroll
  const realmGlows = document.querySelectorAll('.realm-glow');
  const realmObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
        } else {
          entry.target.style.animationPlayState = 'paused';
        }
      });
    },
    { threshold: 0.2 }
  );

  realmGlows.forEach(function (glow) {
    realmObserver.observe(glow);
  });

  // ============================================
  // FIND YOUR PATH - Quiz Logic
  // ============================================
  const TRACKS = {
    dev: {
      icon: '{ }',
      name: 'Developer',
      desc: 'Master Solana, Rust, TypeScript',
      color: '#ea4e33',
    },
    growth: {
      icon: '↗',
      name: 'Growth',
      desc: 'Distribution, hooks, viral loops',
      color: '#f59e0b',
    },
    gaming: {
      icon: '◈',
      name: 'Game Dev',
      desc: 'Unity, game design, tokenomics',
      color: '#8b5cf6',
    },
    content: { icon: '✦', name: 'Creator', desc: 'Narrative, video, community', color: '#06b6d4' },
  };

  let pathStep = 0;
  const pathAnswers = [];
  const pathQuestions = document.querySelectorAll('.path-question');
  const pathDots = document.querySelectorAll('.path-dot');
  const pathStepLabel = document.querySelector('.path-step-label');
  const pathResult = document.getElementById('path-result');
  const pathQuestionsContainer = document.getElementById('path-questions');

  document.querySelectorAll('.path-option').forEach(function (option) {
    option.addEventListener('click', function () {
      const track = this.dataset.track;
      pathAnswers.push(track);

      // Update dots
      if (pathDots[pathStep]) {
        pathDots[pathStep].classList.remove('active');
        pathDots[pathStep].classList.add('done');
      }

      if (pathStep < pathQuestions.length - 1) {
        // Next question
        pathQuestions[pathStep].classList.remove('active');
        pathStep++;
        pathQuestions[pathStep].classList.add('active');
        if (pathDots[pathStep]) pathDots[pathStep].classList.add('active');
        if (pathStepLabel) pathStepLabel.textContent = pathStep + 1 + ' of ' + pathQuestions.length;
      } else {
        // Show result
        const counts = {};
        pathAnswers.forEach(function (t) {
          counts[t] = (counts[t] || 0) + 1;
        });
        const winner = Object.entries(counts).sort(function (a, b) {
          return b[1] - a[1];
        })[0][0];
        const track = TRACKS[winner];

        document.getElementById('path-result-icon').textContent = track.icon;
        document.getElementById('path-result-icon').style.color = track.color;
        document.getElementById('path-result-icon').style.background = track.color + '20';
        document.getElementById('path-result-track').textContent = track.name;
        document.getElementById('path-result-track').style.color = track.color;
        document.getElementById('path-result-desc').textContent = track.desc;

        pathQuestionsContainer.style.display = 'none';
        document.querySelector('.path-progress').style.display = 'none';
        pathResult.classList.add('show');

        // Store result
        localStorage.setItem('asdf-path-track', winner);
      }
    });
  });

  // Retake quiz
  const retakeBtn = document.getElementById('path-retake');
  if (retakeBtn) {
    retakeBtn.addEventListener('click', function () {
      pathStep = 0;
      pathAnswers.length = 0;
      pathQuestions.forEach(function (q) {
        q.classList.remove('active');
      });
      pathQuestions[0].classList.add('active');
      pathDots.forEach(function (d) {
        d.classList.remove('done', 'active');
      });
      if (pathDots[0]) pathDots[0].classList.add('active');
      if (pathStepLabel) pathStepLabel.textContent = '1 of ' + pathQuestions.length;
      pathQuestionsContainer.style.display = 'block';
      document.querySelector('.path-progress').style.display = 'flex';
      pathResult.classList.remove('show');
    });
  }

  // Start journey from path result
  const startJourneyBtn = document.getElementById('path-start-journey');
  if (startJourneyBtn) {
    startJourneyBtn.addEventListener('click', function () {
      const savedTrack = localStorage.getItem('asdf-path-track') || 'dev';
      const journeyBtn = document.querySelector('.view-switch-btn[data-view="journey"]');
      if (journeyBtn) journeyBtn.click();

      // Activate the saved track
      setTimeout(function () {
        const trackBtn = document.querySelector('.journey-track[data-track="' + savedTrack + '"]');
        if (trackBtn) trackBtn.click();
      }, 100);
    });
  }

  // ============================================
  // YOUR JOURNEY - Track Selection
  // ============================================
  const journeyTracks = document.querySelectorAll('.journey-track');

  journeyTracks.forEach(function (trackBtn) {
    trackBtn.addEventListener('click', function () {
      const trackId = this.dataset.track;
      const track = TRACKS[trackId];
      if (!track) return;

      // Update active state
      journeyTracks.forEach(function (t) {
        t.classList.remove('active');
      });
      this.classList.add('active');

      // Update progress card
      const trackName = document.getElementById('journey-track-name');
      const trackDesc = document.getElementById('journey-track-desc');
      const trackIcon = document.getElementById('journey-track-icon');

      if (trackName) trackName.textContent = track.name;
      if (trackDesc) trackDesc.textContent = track.desc;
      if (trackIcon) {
        trackIcon.textContent = track.icon;
        trackIcon.style.color = track.color;
        trackIcon.style.background = track.color + '20';
      }

      // Update modules count display
      const modules = { dev: 12, growth: 10, gaming: 8, content: 9 };
      document.querySelectorAll('.journey-stat-value').forEach(function (val, i) {
        if (i === 1) val.textContent = '0/' + modules[trackId];
      });

      // Store selection
      localStorage.setItem('asdf-journey-track', trackId);
    });
  });

  // Load saved track on page load
  const savedJourneyTrack = localStorage.getItem('asdf-journey-track');
  if (savedJourneyTrack) {
    const trackBtn = document.querySelector(
      '.journey-track[data-track="' + savedJourneyTrack + '"]'
    );
    if (trackBtn) trackBtn.click();
  }
});
