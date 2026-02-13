/**
 * ASDF Games - PumpArena Engine
 *
 * Builder strategy game: Support builders, make decisions, build reputation
 * Features partnership system, scenario choices, and collaborative roadmap
 *
 * Extracted from engine.js for modularity
 *
 * External dependencies (loaded via script tags before this file):
 *   - activeGames (engine.js) - shared game session registry
 *   - updateScore() (engine.js) - score update + persist
 *   - endGame() (lifecycle.js) - game end handler
 *   - escapeHtml() (shared/security.js) - XSS protection
 *   - GAME_TIMING (timing-config.js) - timing constants
 *   - appState, saveState() (state.js) - app state persistence
 *
 * @version 1.0.0
 */

'use strict';

function startPumpArena(gameId) {
  const arena = document.getElementById(`arena-${gameId}`);

  // Override overflow:hidden from .game-arena CSS to allow scrolling
  arena.style.overflow = 'auto';

  // Project Builder - Community Builder Partnership Game
  // Join projects, contribute to teams, build together, grow your influence
  const state = {
    score: 0,
    round: 1,
    maxRounds: 10,
    gameOver: false,
    phase: 'select', // select, builder, roadmap, scenario, result
    influence: 100, // Your community influence points
    reputation: 0, // Your builder reputation
    joinedProject: false, // Has the player committed to a project?
    scenarioIndex: 0, // Current scenario in the project storyline
    selectedType: null,
    selectedBuilder: null,
    selectedBuilderIdx: 0,
    particles: [],
    history: [],
    // Partnership tracking
    contributionsByBuilder: {}, // Track contributions per builder
    partnership: null,
    isPartner: false,
    skills: {
      dev: 0, // Development skill
      community: 0, // Community building
      marketing: 0, // Marketing & growth
      strategy: 0, // Strategic planning
    },
    // Scenario system
    currentScenario: null,
    selectedChoice: null,
    usedScenarios: {}, // Track used scenarios per category
  };

  // Project roadmap templates per category
  const roadmapTemplates = {
    defi: [
      {
        phase: 'Q1',
        title: 'Protocol Launch',
        tasks: ['Smart contract audit', 'Mainnet deployment', 'Initial liquidity provision'],
      },
      {
        phase: 'Q2',
        title: 'Growth Phase',
        tasks: ['CEX listings', 'Yield optimization', 'Governance token launch'],
      },
      {
        phase: 'Q3',
        title: 'Expansion',
        tasks: ['Cross-chain bridges', 'Institutional partnerships', 'Advanced strategies'],
      },
      {
        phase: 'Q4',
        title: 'Maturity',
        tasks: ['DAO transition', 'Protocol upgrades', 'Ecosystem grants'],
      },
    ],
    gaming: [
      {
        phase: 'Q1',
        title: 'Alpha Release',
        tasks: ['Core gameplay mechanics', 'NFT minting', 'Closed beta testing'],
      },
      {
        phase: 'Q2',
        title: 'Public Beta',
        tasks: ['Token economy launch', 'Marketplace integration', 'Community tournaments'],
      },
      {
        phase: 'Q3',
        title: 'Full Launch',
        tasks: ['Mobile version', 'Esports partnerships', 'In-game governance'],
      },
      {
        phase: 'Q4',
        title: 'Metaverse',
        tasks: ['Cross-game assets', 'Virtual land sales', 'Creator tools'],
      },
    ],
    community: [
      {
        phase: 'W1',
        title: 'Community Formation',
        tasks: ['Core team assembly', 'Values definition', 'First members'],
      },
      {
        phase: 'W2',
        title: 'Growth Phase',
        tasks: ['Content creation', 'Social presence', 'Partnerships'],
      },
      {
        phase: 'W3',
        title: 'Value Creation',
        tasks: ['Member benefits', 'Exclusive content', 'Events'],
      },
      {
        phase: 'W4',
        title: 'Sustainability',
        tasks: ['Revenue streams', 'Governance', 'Long-term vision'],
      },
    ],
    infra: [
      {
        phase: 'Q1',
        title: 'Technical Foundation',
        tasks: ['Architecture design', 'Security audit', 'Testnet launch'],
      },
      {
        phase: 'Q2',
        title: 'Network Growth',
        tasks: ['Node operator incentives', 'SDK release', 'Developer grants'],
      },
      {
        phase: 'Q3',
        title: 'Enterprise Adoption',
        tasks: ['B2B partnerships', 'SLA guarantees', 'Premium tiers'],
      },
      {
        phase: 'Q4',
        title: 'Decentralization',
        tasks: ['Token distribution', 'Governance launch', 'Community nodes'],
      },
    ],
  };

  // 4 Project Categories with 3 Teams each (different visions/needs)
  const projectTypes = {
    defi: {
      name: 'DeFi Builders',
      icon: '🏦',
      color: '#3b82f6',
      desc: 'Build the future of decentralized finance together',
      builders: [
        {
          name: 'SafeYield DAO',
          vision: 'Security-first DeFi for everyone',
          potential: 0.8,
          needs: ['Smart contract review', 'Community education', 'Documentation'],
          team: '15 builders',
          community: '2.5K members',
          stage: 'Growing',
        },
        {
          name: 'FlashDAO',
          vision: 'Democratizing advanced DeFi',
          potential: 0.6,
          needs: ['Frontend dev', 'Marketing', 'User testing'],
          team: '8 builders',
          community: '500 members',
          stage: 'Early',
        },
        {
          name: 'StableCore',
          vision: 'Stable value for unstable times',
          potential: 0.75,
          needs: ['Governance design', 'Partnerships', 'Analytics'],
          team: '12 builders',
          community: '1.2K members',
          stage: 'Scaling',
        },
      ],
    },
    gaming: {
      name: 'GameFi Creators',
      icon: '🎮',
      color: '#a855f7',
      desc: 'Create immersive gaming experiences with the community',
      builders: [
        {
          name: 'PixelWorld Studio',
          vision: 'Games that everyone can enjoy',
          potential: 0.7,
          needs: ['Game testing', 'Art creation', 'Lore writing'],
          team: '20 creators',
          community: '3K players',
          stage: 'Beta',
        },
        {
          name: 'BattleForge',
          vision: 'Competitive gaming redefined',
          potential: 0.65,
          needs: ['Tournament org', 'Balance testing', 'Streaming'],
          team: '12 builders',
          community: '800 players',
          stage: 'Alpha',
        },
        {
          name: 'MetaLands Collective',
          vision: 'Build your world, your way',
          potential: 0.8,
          needs: ['World building', 'Events hosting', 'Onboarding'],
          team: '25 creators',
          community: '4K members',
          stage: 'Live',
        },
      ],
    },
    community: {
      name: 'Community Projects',
      icon: '🤝',
      color: '#f59e0b',
      desc: 'Grassroots movements powered by passionate builders',
      builders: [
        {
          name: 'ASDF Army',
          vision: 'Strongest community in crypto',
          potential: 0.9,
          needs: ['Meme creation', 'Raid coordination', 'Vibes'],
          team: 'The community',
          community: '10K+ degens',
          stage: 'Viral',
        },
        {
          name: 'BuilderDAO',
          vision: 'Builders helping builders',
          potential: 0.75,
          needs: ['Mentorship', 'Resource sharing', 'Networking'],
          team: '50 mentors',
          community: '2K builders',
          stage: 'Growing',
        },
        {
          name: 'CryptoEducators',
          vision: 'Making crypto accessible',
          potential: 0.7,
          needs: ['Content creation', 'Translation', 'Teaching'],
          team: '30 educators',
          community: '5K learners',
          stage: 'Scaling',
        },
      ],
    },
    infra: {
      name: 'Infrastructure',
      icon: '⚡',
      color: '#22c55e',
      desc: 'Build the backbone of the decentralized future',
      builders: [
        {
          name: 'OpenNode Collective',
          vision: 'Decentralized infrastructure for all',
          potential: 0.8,
          needs: ['Node operation', 'Documentation', 'Support'],
          team: '30 engineers',
          community: '1K operators',
          stage: 'Production',
        },
        {
          name: 'BridgeBuilders',
          vision: 'Connecting all chains seamlessly',
          potential: 0.7,
          needs: ['Security review', 'Integration help', 'Testing'],
          team: '18 devs',
          community: '600 testers',
          stage: 'Mainnet',
        },
        {
          name: 'DataDAO',
          vision: 'Your data, your control',
          potential: 0.75,
          needs: ['Storage nodes', 'SDK feedback', 'Use cases'],
          team: '22 builders',
          community: '900 users',
          stage: 'Growing',
        },
      ],
    },
  };

  // Partnership collaboration options per category
  const collabOptions = {
    defi: [
      {
        title: 'Community Governance',
        desc: 'How should decisions be made?',
        options: ['Token voting', 'Reputation-based', 'Quadratic voting'],
      },
      {
        title: 'Builder Onboarding',
        desc: 'New contributors want to join',
        options: ['Open doors to all', 'Skill-based selection', 'Mentorship program'],
      },
      {
        title: 'Protocol Direction',
        desc: 'What should we prioritize?',
        options: ['Security & audits', 'New features', 'User experience'],
      },
      {
        title: 'Community Event',
        desc: 'How to engage the community?',
        options: ['Hackathon', 'AMA series', 'Builder workshop'],
      },
    ],
    gaming: [
      {
        title: 'Player Feedback',
        desc: 'Community has strong opinions',
        options: ['Implement top requests', 'Stay true to vision', 'Community vote'],
      },
      {
        title: 'Content Creation',
        desc: 'How to grow the player base?',
        options: ['Streamer partnerships', 'UGC tools', 'Competitive leagues'],
      },
      {
        title: 'Economy Balance',
        desc: 'Players report issues',
        options: ['Community council', 'Data-driven changes', 'Test server first'],
      },
      {
        title: 'New Feature',
        desc: 'What should we build next?',
        options: ['Social features', 'New game mode', 'Mobile version'],
      },
    ],
    community: [
      {
        title: 'Growth Strategy',
        desc: 'How to expand the community?',
        options: ['Organic memes', 'Collab with others', 'Content raids'],
      },
      {
        title: 'Builder Recognition',
        desc: 'How to reward contributors?',
        options: ['Public shoutouts', 'Exclusive roles', 'Builder rewards'],
      },
      {
        title: 'Community Challenge',
        desc: 'Internal disagreement arose',
        options: ['Open discussion', 'Core team decides', 'Community vote'],
      },
      {
        title: 'Partnership Offer',
        desc: 'Another project wants to collab',
        options: ['Full collaboration', 'Limited partnership', 'Friendly competition'],
      },
    ],
    infra: [
      {
        title: 'Documentation Sprint',
        desc: 'Docs need improvement',
        options: ['Community bounty', 'Core team focus', 'Video tutorials'],
      },
      {
        title: 'Node Operators',
        desc: 'How to grow the network?',
        options: ['Easy setup guides', 'Operator incentives', 'Enterprise outreach'],
      },
      {
        title: 'Open Source',
        desc: 'Should we open source more?',
        options: ['Full transparency', 'Gradual release', 'Keep core private'],
      },
      {
        title: 'Developer Experience',
        desc: 'Devs struggle with integration',
        options: ['SDK improvements', 'Office hours', 'Example projects'],
      },
    ],
  };

  // ===== BUILDER-SPECIFIC STORYLINES =====
  // Each builder has 10 unique scenarios forming a narrative arc
  const builderStorylines = {
    // ===== DEFI BUILDERS =====
    'SafeYield DAO': [
      {
        title: 'Premier Jour',
        narrative:
          "Tu rejoins SafeYield DAO. L'équipe t'accueille dans le Discord. Le lead dev Marcus te demande: 'On a besoin d'aide pour la documentation du smart contract. Par où veux-tu commencer?'",
        choices: [
          {
            text: '📝 Documenter les fonctions de base',
            approach: 'methodical',
            desc: 'Commencer par les fondamentaux',
          },
          {
            text: '🔍 Auditer le code en documentant',
            approach: 'security',
            desc: 'Chercher des failles en même temps',
          },
          {
            text: '💬 Demander à la communauté ce qui manque',
            approach: 'community',
            desc: 'Impliquer les utilisateurs',
          },
        ],
        outcomes: {
          methodical: {
            repBonus: 1.2,
            infBonus: 1.0,
            message: 'Marcus apprécie ton approche structurée.',
          },
          security: {
            repBonus: 1.4,
            infBonus: 0.9,
            message: 'Tu trouves un edge case non documenté!',
          },
          community: {
            repBonus: 1.1,
            infBonus: 1.3,
            message: "Les users sont contents d'être consultés.",
          },
        },
      },
      {
        title: 'La Faille',
        narrative:
          'En documentant, tu découvres une faille potentielle dans le mécanisme de retrait. Rien de critique, mais ça pourrait être exploité. Que fais-tu?',
        choices: [
          {
            text: '🚨 Alerter Marcus immédiatement en privé',
            approach: 'private',
            desc: 'Garder ça confidentiel',
          },
          {
            text: '🔬 Créer un PoC pour prouver le risque',
            approach: 'prove',
            desc: 'Démontrer concrètement',
          },
          {
            text: '📋 Documenter et proposer un fix',
            approach: 'solution',
            desc: 'Arriver avec la solution',
          },
        ],
        outcomes: {
          private: {
            repBonus: 1.3,
            infBonus: 1.0,
            message: 'Marcus te remercie pour la discrétion.',
          },
          prove: {
            repBonus: 1.5,
            infBonus: 0.8,
            message: "L'équipe est impressionnée par ta rigueur.",
          },
          solution: {
            repBonus: 1.4,
            infBonus: 1.1,
            message: "Tu gagnes le respect de toute l'équipe.",
          },
        },
      },
      {
        title: 'Le Vote',
        narrative:
          "La faille est fixée. L'équipe veut te remercier publiquement. Un membre propose de te donner des tokens. Un autre suggère un rôle officiel. Qu'est-ce qui t'intéresse?",
        choices: [
          {
            text: '🏷️ Le rôle de Security Reviewer',
            approach: 'role',
            desc: 'Responsabilité officielle',
          },
          { text: '💰 Les tokens, je les stake', approach: 'tokens', desc: 'Skin in the game' },
          {
            text: '🤝 Juste la reconnaissance publique',
            approach: 'recognition',
            desc: 'La réputation avant tout',
          },
        ],
        outcomes: {
          role: {
            repBonus: 1.5,
            infBonus: 1.0,
            message: 'Tu deviens le Security Reviewer officiel!',
          },
          tokens: {
            repBonus: 1.0,
            infBonus: 1.4,
            message: 'Ton stake montre ton engagement long terme.',
          },
          recognition: {
            repBonus: 1.3,
            infBonus: 1.2,
            message: 'La communauté respecte ton humilité.',
          },
        },
      },
      {
        title: "L'Audit",
        narrative:
          "Un audit externe arrive. L'auditeur Certik demande des clarifications sur le code. Marcus est en vacances. Tu es le seul à connaître les détails.",
        choices: [
          {
            text: '📞 Appeler Marcus malgré ses vacances',
            approach: 'escalate',
            desc: "C'est trop important",
          },
          {
            text: '💪 Gérer seul avec ta documentation',
            approach: 'handle',
            desc: 'Tu connais le code maintenant',
          },
          {
            text: '⏸️ Demander un délai à Certik',
            approach: 'delay',
            desc: 'Attendre le retour de Marcus',
          },
        ],
        outcomes: {
          escalate: {
            repBonus: 1.0,
            infBonus: 1.1,
            message: 'Marcus comprend, mais aurait préféré que tu gères.',
          },
          handle: {
            repBonus: 1.6,
            infBonus: 1.0,
            message: 'Tu gères parfaitement! Marcus est impressionné à son retour.',
          },
          delay: {
            repBonus: 0.9,
            infBonus: 1.2,
            message: 'Certik accepte, mais ça retarde le lancement.',
          },
        },
      },
      {
        title: 'Le Lancement',
        narrative:
          "L'audit est passé! Le lancement approche. L'équipe débat: lancer maintenant avec le buzz actuel, ou attendre d'avoir plus de liquidité initiale?",
        choices: [
          { text: '🚀 Lancer maintenant', approach: 'now', desc: 'Le momentum est là' },
          { text: '💧 Attendre plus de liquidité', approach: 'wait', desc: 'Sécurité avant tout' },
          {
            text: '🎯 Soft launch pour les early supporters',
            approach: 'soft',
            desc: "Récompenser les fidèles d'abord",
          },
        ],
        outcomes: {
          now: {
            repBonus: 1.2,
            infBonus: 1.3,
            message: 'Le lancement fait du bruit! TVL monte vite.',
          },
          wait: {
            repBonus: 1.3,
            infBonus: 1.0,
            message: 'La liquidité rassure les gros déposants.',
          },
          soft: {
            repBonus: 1.4,
            infBonus: 1.1,
            message: 'Les early supporters deviennent des ambassadeurs.',
          },
        },
      },
      {
        title: 'La Whale',
        narrative:
          "Une whale dépose 500k. Le TVL explose mais elle représente 40% du pool. La communauté s'inquiète de la centralisation.",
        choices: [
          {
            text: "🐋 L'accueillir et la rassurer",
            approach: 'welcome',
            desc: 'Un gros déposant = confiance',
          },
          { text: '⚖️ Proposer des caps par wallet', approach: 'cap', desc: 'Limiter les risques' },
          {
            text: '📢 Lancer une campagne pour diversifier',
            approach: 'diversify',
            desc: 'Attirer plus de petits déposants',
          },
        ],
        outcomes: {
          welcome: {
            repBonus: 1.0,
            infBonus: 1.4,
            message: "La whale reste et en parle à d'autres gros.",
          },
          cap: {
            repBonus: 1.4,
            infBonus: 0.9,
            message: 'La whale réduit mais la communauté approuve.',
          },
          diversify: {
            repBonus: 1.3,
            infBonus: 1.2,
            message: 'La campagne attire 200 nouveaux déposants!',
          },
        },
      },
      {
        title: 'Le Hack',
        narrative:
          "Un protocole similaire se fait hack. Panique dans le Discord. Certains retirent leurs fonds. L'équipe doit communiquer.",
        choices: [
          {
            text: '🔒 Publier une analyse comparative détaillée',
            approach: 'technical',
            desc: 'Montrer pourquoi vous êtes différents',
          },
          {
            text: "🎥 Faire un AMA d'urgence",
            approach: 'ama',
            desc: 'Répondre en direct aux questions',
          },
          {
            text: '🤫 Rester calme et factuel',
            approach: 'calm',
            desc: 'Ne pas alimenter la panique',
          },
        ],
        outcomes: {
          technical: {
            repBonus: 1.5,
            infBonus: 1.0,
            message: "L'analyse rassure les technicals. Peu de retraits.",
          },
          ama: {
            repBonus: 1.3,
            infBonus: 1.3,
            message: "L'AMA crée de la confiance. Certains redéposent!",
          },
          calm: { repBonus: 1.1, infBonus: 1.1, message: 'La situation se calme naturellement.' },
        },
      },
      {
        title: 'La Gouvernance',
        narrative:
          'Le protocole grandit. Il est temps de décentraliser la gouvernance. Comment structurer le pouvoir de vote?',
        choices: [
          {
            text: '🗳️ 1 token = 1 vote classique',
            approach: 'classic',
            desc: 'Simple et compréhensible',
          },
          {
            text: '⏱️ Vote pondéré par durée de stake',
            approach: 'weighted',
            desc: 'Récompenser la fidélité',
          },
          {
            text: '🎓 Quadratic voting',
            approach: 'quadratic',
            desc: 'Limiter le pouvoir des whales',
          },
        ],
        outcomes: {
          classic: {
            repBonus: 1.1,
            infBonus: 1.2,
            message: 'Facile à comprendre, adoption rapide.',
          },
          weighted: { repBonus: 1.4, infBonus: 1.0, message: 'Les long-term holders sont ravis.' },
          quadratic: {
            repBonus: 1.3,
            infBonus: 1.1,
            message: 'Innovation saluée par la communauté DeFi.',
          },
        },
      },
      {
        title: "L'Expansion",
        narrative:
          'Aave propose une intégration. Ça doublerait le TVL mais ajouterait de la complexité et des risques de dépendance.',
        choices: [
          { text: "✅ Accepter l'intégration", approach: 'accept', desc: 'Opportunité trop belle' },
          {
            text: '🔄 Négocier une intégration limitée',
            approach: 'negotiate',
            desc: 'Garder le contrôle',
          },
          {
            text: '❌ Rester indépendant',
            approach: 'decline',
            desc: "Focus sur l'identité propre",
          },
        ],
        outcomes: {
          accept: {
            repBonus: 1.1,
            infBonus: 1.5,
            message: "TVL x3! Mais la roadmap doit s'adapter.",
          },
          negotiate: {
            repBonus: 1.4,
            infBonus: 1.2,
            message: 'Deal équilibré. Best of both worlds.',
          },
          decline: {
            repBonus: 1.5,
            infBonus: 0.9,
            message: "La communauté admire l'indépendance.",
          },
        },
      },
      {
        title: 'Le Futur',
        narrative:
          'Un an après ton arrivée. SafeYield est un succès. Marcus te propose de devenir co-lead du protocole. Grande responsabilité.',
        choices: [
          {
            text: '🎯 Accepter le rôle de co-lead',
            approach: 'accept',
            desc: 'Tu as mérité cette place',
          },
          {
            text: '🌱 Préférer rester contributeur',
            approach: 'contributor',
            desc: 'Moins de politique, plus de building',
          },
          {
            text: '🚀 Proposer de lancer un nouveau produit',
            approach: 'innovate',
            desc: 'Utiliser ton influence pour innover',
          },
        ],
        outcomes: {
          accept: { repBonus: 1.6, infBonus: 1.2, message: 'Tu deviens co-lead de SafeYield DAO!' },
          contributor: {
            repBonus: 1.3,
            infBonus: 1.3,
            message: 'Respecté pour ton humilité et ta constance.',
          },
          innovate: {
            repBonus: 1.4,
            infBonus: 1.4,
            message: 'Tu lances SafeYield V2 avec de nouvelles features!',
          },
        },
      },
    ],

    // ===== GAMEFI CREATORS =====
    'PixelWorld Studio': [
      {
        title: 'Bienvenue dans le Studio',
        narrative:
          "Tu rejoins PixelWorld Studio comme community builder. Le game designer Léa t'accueille: 'On lance la beta dans 2 semaines. On a besoin d'organiser les playtesters. Comment tu veux t'y prendre?'",
        choices: [
          {
            text: '📋 Créer un formulaire de candidature',
            approach: 'formal',
            desc: 'Sélectionner les meilleurs testeurs',
          },
          {
            text: '🎮 Ouvrir à tous les membres Discord',
            approach: 'open',
            desc: 'Maximum de feedback',
          },
          {
            text: '🏆 Organiser un concours pour les places',
            approach: 'contest',
            desc: "Créer de l'engagement",
          },
        ],
        outcomes: {
          formal: {
            repBonus: 1.2,
            infBonus: 1.0,
            message: 'Les testeurs sélectionnés sont très engagés.',
          },
          open: {
            repBonus: 1.0,
            infBonus: 1.4,
            message: 'Énorme participation! Beaucoup de feedback.',
          },
          contest: { repBonus: 1.3, infBonus: 1.2, message: 'Le concours fait le buzz!' },
        },
      },
      {
        title: 'Le Bug Critique',
        narrative:
          'Premier jour de beta. Un bug permet de dupliquer les items rares. Certains joueurs en ont déjà profité. Que recommandes-tu?',
        choices: [
          {
            text: '🔄 Reset complet de la beta',
            approach: 'reset',
            desc: 'Repartir sur des bases saines',
          },
          {
            text: '🔨 Fix + retirer les items dupliqués',
            approach: 'fix',
            desc: 'Corriger sans tout effacer',
          },
          {
            text: '🎁 Fix + compensation pour tous',
            approach: 'compensate',
            desc: 'Transformer le problème en opportunité',
          },
        ],
        outcomes: {
          reset: { repBonus: 1.1, infBonus: 0.9, message: "Certains râlent mais c'est propre." },
          fix: { repBonus: 1.3, infBonus: 1.1, message: 'Solution équilibrée, bien reçue.' },
          compensate: {
            repBonus: 1.4,
            infBonus: 1.2,
            message: 'Les joueurs adorent! Bonne ambiance.',
          },
        },
      },
      {
        title: 'Le Streamer',
        narrative:
          "Un streamer avec 50k viewers veut jouer à PixelWorld. Il demande des items exclusifs en échange de visibilité. L'équipe est divisée.",
        choices: [
          {
            text: '✅ Lui donner les items exclusifs',
            approach: 'give',
            desc: 'La visibilité vaut le coup',
          },
          {
            text: '🤝 Proposer un partenariat officiel',
            approach: 'partner',
            desc: 'Cadrer la collaboration',
          },
          {
            text: '❌ Refuser le traitement de faveur',
            approach: 'refuse',
            desc: 'Égalité pour tous les joueurs',
          },
        ],
        outcomes: {
          give: {
            repBonus: 0.9,
            infBonus: 1.5,
            message: 'Gros boost de visibilité! Mais la communauté grogne.',
          },
          partner: { repBonus: 1.3, infBonus: 1.3, message: 'Partenariat win-win bien structuré.' },
          refuse: { repBonus: 1.5, infBonus: 0.9, message: "La communauté applaudit l'intégrité." },
        },
      },
      {
        title: "L'Économie",
        narrative:
          "Les joueurs hardcore accumulent trop de gold. L'inflation menace l'économie du jeu. Il faut agir.",
        choices: [
          {
            text: '🔥 Ajouter des sinks (items cosmétiques)',
            approach: 'sinks',
            desc: 'Créer des raisons de dépenser',
          },
          { text: '⚖️ Réduire les drops de gold', approach: 'reduce', desc: 'Traiter la cause' },
          {
            text: '🏦 Créer un système de staking in-game',
            approach: 'stake',
            desc: 'Immobiliser le gold',
          },
        ],
        outcomes: {
          sinks: { repBonus: 1.3, infBonus: 1.2, message: 'Les cosmétiques cartonnent!' },
          reduce: {
            repBonus: 1.1,
            infBonus: 1.0,
            message: 'Équilibre rétabli, mais certains râlent.',
          },
          stake: { repBonus: 1.4, infBonus: 1.1, message: 'Innovation qui plaît aux holders!' },
        },
      },
      {
        title: 'Le Mode Compétitif',
        narrative:
          'La communauté demande un mode PvP ranked. Léa hésite: ça demande beaucoup de ressources et risque de toxifier la communauté.',
        choices: [
          {
            text: '🏆 Lancer un ranked complet',
            approach: 'full',
            desc: 'Donner ce que les joueurs veulent',
          },
          {
            text: '⚔️ Commencer par des tournois ponctuels',
            approach: 'tournaments',
            desc: "Tester l'appétit progressivement",
          },
          {
            text: "🎮 Focus sur le PvE d'abord",
            approach: 'pve',
            desc: 'Consolider avant de diversifier',
          },
        ],
        outcomes: {
          full: {
            repBonus: 1.2,
            infBonus: 1.3,
            message: 'Le ranked attire de nouveaux joueurs compétitifs!',
          },
          tournaments: {
            repBonus: 1.4,
            infBonus: 1.1,
            message: 'Les tournois créent des moments forts!',
          },
          pve: {
            repBonus: 1.3,
            infBonus: 1.0,
            message: "Le PvE s'enrichit, les joueurs apprécient.",
          },
        },
      },
      {
        title: 'Le Fork',
        narrative:
          "Un dev quitte l'équipe et fork le jeu. Il lance une copie avec des 'améliorations'. Certains joueurs sont tentés de partir.",
        choices: [
          {
            text: '⚔️ Attaquer publiquement le fork',
            approach: 'attack',
            desc: 'Défendre votre territoire',
          },
          {
            text: '🚀 Accélérer votre propre roadmap',
            approach: 'accelerate',
            desc: 'Être meilleur, pas amer',
          },
          {
            text: '🤷 Ignorer et continuer',
            approach: 'ignore',
            desc: "Ne pas leur donner d'attention",
          },
        ],
        outcomes: {
          attack: {
            repBonus: 0.9,
            infBonus: 1.1,
            message: "La drama attire l'attention mais divise.",
          },
          accelerate: {
            repBonus: 1.5,
            infBonus: 1.2,
            message: 'Les nouvelles features écrasent la compétition!',
          },
          ignore: { repBonus: 1.2, infBonus: 1.0, message: 'Le fork meurt naturellement. Classe.' },
        },
      },
      {
        title: 'Le Mobile',
        narrative:
          'Un publisher mobile propose de porter PixelWorld sur iOS/Android. Gros potentiel mais ils veulent des pubs intégrées.',
        choices: [
          {
            text: '📱 Accepter avec les pubs',
            approach: 'ads',
            desc: 'Accès à des millions de joueurs',
          },
          {
            text: '💰 Négocier un modèle premium',
            approach: 'premium',
            desc: 'Payer pour jouer, sans pubs',
          },
          {
            text: '🔧 Porter en interne sans publisher',
            approach: 'internal',
            desc: 'Garder le contrôle total',
          },
        ],
        outcomes: {
          ads: {
            repBonus: 0.9,
            infBonus: 1.4,
            message: 'Explosion du nombre de joueurs! Mais certains vétérans partent.',
          },
          premium: { repBonus: 1.3, infBonus: 1.2, message: 'Moins de joueurs mais plus engagés.' },
          internal: { repBonus: 1.4, infBonus: 1.0, message: 'Port réussi, communauté ravie!' },
        },
      },
      {
        title: "L'Esport",
        narrative:
          "Une org esport veut sponsoriser une ligue PixelWorld. 100k$ de cashprize. Mais ils demandent l'exclusivité sur les tournois officiels.",
        choices: [
          {
            text: "✅ Accepter l'exclusivité",
            approach: 'exclusive',
            desc: 'Professionnaliser la scène',
          },
          {
            text: '🤝 Négocier une co-organisation',
            approach: 'coop',
            desc: 'Garder de la flexibilité',
          },
          {
            text: '🏆 Lancer votre propre ligue',
            approach: 'own',
            desc: "Contrôle total de l'esport",
          },
        ],
        outcomes: {
          exclusive: { repBonus: 1.1, infBonus: 1.4, message: 'La scène pro décolle!' },
          coop: { repBonus: 1.4, infBonus: 1.2, message: 'Partenariat équilibré et durable.' },
          own: { repBonus: 1.5, infBonus: 1.0, message: 'Votre ligue devient la référence!' },
        },
      },
      {
        title: 'La Crise',
        narrative:
          "Scandale: un modérateur est accusé de favoritisme dans les ban. Le drama explose sur Twitter. Les médias gaming s'en mêlent.",
        choices: [
          {
            text: '🎤 Communiqué officiel transparent',
            approach: 'transparent',
            desc: 'Tout expliquer publiquement',
          },
          {
            text: "🔍 Investigation interne d'abord",
            approach: 'investigate',
            desc: 'Vérifier avant de parler',
          },
          { text: "⚡ Virer le modo et s'excuser", approach: 'fire', desc: 'Action immédiate' },
        ],
        outcomes: {
          transparent: { repBonus: 1.4, infBonus: 1.1, message: 'La transparence est saluée.' },
          investigate: {
            repBonus: 1.3,
            infBonus: 1.2,
            message: "L'enquête révèle la vérité, situation clarifiée.",
          },
          fire: {
            repBonus: 1.1,
            infBonus: 1.0,
            message: 'Action rapide mais perçue comme précipitée.',
          },
        },
      },
      {
        title: 'Le Futur de PixelWorld',
        narrative:
          "Deux ans plus tard. PixelWorld a 500k joueurs actifs. Léa te propose de devenir Creative Director. Tu façonnerais l'avenir du jeu.",
        choices: [
          {
            text: '🎯 Accepter Creative Director',
            approach: 'accept',
            desc: 'Tu as construit cette communauté',
          },
          {
            text: "🌍 Proposer d'ouvrir un studio satellite",
            approach: 'expand',
            desc: 'Étendre la vision',
          },
          {
            text: '🎮 Rester proche des joueurs',
            approach: 'community',
            desc: 'Garder les pieds sur terre',
          },
        ],
        outcomes: {
          accept: {
            repBonus: 1.6,
            infBonus: 1.2,
            message: 'Tu deviens Creative Director de PixelWorld!',
          },
          expand: { repBonus: 1.4, infBonus: 1.4, message: 'Tu ouvres PixelWorld Asia!' },
          community: {
            repBonus: 1.5,
            infBonus: 1.3,
            message: 'Tu restes le cœur de la communauté.',
          },
        },
      },
    ],

    // ===== COMMUNITY PROJECTS =====
    'ASDF Army': [
      {
        title: 'Enrôlement',
        narrative:
          "Tu rejoins l'ASDF Army. Le général Chad t'accueille: 'Bienvenue soldat! On a besoin de troupes pour le raid de ce soir sur le tweet de CZ. Quelle est ta spécialité?'",
        choices: [
          { text: '🎨 Je suis un meme lord', approach: 'memes', desc: 'Les memes sont ma langue' },
          {
            text: "📊 Je fais de l'analyse et du thread",
            approach: 'analysis',
            desc: 'Contenu éducatif',
          },
          { text: '🔥 Je suis là pour le chaos', approach: 'chaos', desc: 'Engagement maximum' },
        ],
        outcomes: {
          memes: { repBonus: 1.3, infBonus: 1.2, message: 'Tes memes font mouche!' },
          analysis: {
            repBonus: 1.4,
            infBonus: 1.0,
            message: 'Ton thread est RT par des influenceurs.',
          },
          chaos: { repBonus: 1.1, infBonus: 1.4, message: "Tu ramènes l'énergie!" },
        },
      },
      {
        title: 'Le Raid',
        narrative:
          "Le raid commence. CZ a posté sur les memecoins. L'Army doit répondre en force. Comment tu participes?",
        choices: [
          {
            text: '💬 Reply avec le meilleur meme ASDF',
            approach: 'reply',
            desc: 'Être en première ligne',
          },
          {
            text: '🔄 RT et amplifie les meilleurs posts',
            approach: 'amplify',
            desc: 'Soutenir les troupes',
          },
          {
            text: '📝 Créer un thread expliquant ASDF',
            approach: 'educate',
            desc: 'Convertir les curieux',
          },
        ],
        outcomes: {
          reply: { repBonus: 1.3, infBonus: 1.3, message: 'Ton meme est liké par CZ!' },
          amplify: {
            repBonus: 1.1,
            infBonus: 1.2,
            message: "Tu aides l'Army à dominer les replies.",
          },
          educate: {
            repBonus: 1.4,
            infBonus: 1.1,
            message: 'Ton thread amène de nouveaux membres!',
          },
        },
      },
      {
        title: 'La Victoire',
        narrative:
          'Le raid est un succès! ASDF trend sur Twitter. Chad propose de te donner un grade. Lequel veux-tu?',
        choices: [
          {
            text: '🎖️ Capitaine des Memes',
            approach: 'meme_captain',
            desc: 'Diriger les créatifs',
          },
          { text: '📢 Lieutenant de Communication', approach: 'comms', desc: 'Gérer les annonces' },
          { text: '🛡️ Sergent de la Modération', approach: 'mod', desc: 'Protéger la communauté' },
        ],
        outcomes: {
          meme_captain: {
            repBonus: 1.4,
            infBonus: 1.2,
            message: "Tu diriges maintenant l'escouade meme!",
          },
          comms: { repBonus: 1.3, infBonus: 1.3, message: 'Tu deviens la voix officielle!' },
          mod: { repBonus: 1.5, infBonus: 1.0, message: "Tu protèges l'Army des scammers!" },
        },
      },
      {
        title: "L'Infiltration",
        narrative:
          'Un compte suspect rejoint le Discord. Il pose beaucoup de questions sur les wallets des membres. FUD ou curiosité légitime?',
        choices: [
          { text: '🔨 Ban immédiat, pas de risque', approach: 'ban', desc: 'Tolérance zéro' },
          { text: '👀 Surveiller discrètement', approach: 'watch', desc: 'Collecter des preuves' },
          {
            text: "💬 L'interroger publiquement",
            approach: 'confront',
            desc: 'Exposer ses intentions',
          },
        ],
        outcomes: {
          ban: { repBonus: 1.2, infBonus: 1.0, message: "C'était bien un scammer. Bien joué!" },
          watch: { repBonus: 1.4, infBonus: 1.1, message: 'Tu découvres tout un réseau de scam!' },
          confront: {
            repBonus: 1.3,
            infBonus: 1.2,
            message: 'Il avoue et part. La communauté te respecte.',
          },
        },
      },
      {
        title: 'Le FUD',
        narrative:
          "Un thread viral accuse ASDF d'être un rug. C'est faux mais ça fait du dégât. Comment l'Army répond?",
        choices: [
          {
            text: '📊 Contre-thread avec preuves on-chain',
            approach: 'facts',
            desc: 'Les données ne mentent pas',
          },
          { text: '😂 Transformer le FUD en meme', approach: 'meme', desc: "Retourner l'attaque" },
          {
            text: "🤝 Inviter l'auteur à un débat public",
            approach: 'debate',
            desc: 'Confrontation directe',
          },
        ],
        outcomes: {
          facts: {
            repBonus: 1.4,
            infBonus: 1.1,
            message: 'Les preuves sont irréfutables. FUD détruit.',
          },
          meme: {
            repBonus: 1.2,
            infBonus: 1.4,
            message: 'Le meme devient viral. Le FUDer est ridiculisé.',
          },
          debate: {
            repBonus: 1.5,
            infBonus: 1.0,
            message: "Tu l'écrases dans le débat. Respect gagné.",
          },
        },
      },
      {
        title: "L'Alliance",
        narrative:
          'Une autre communauté (PEPE Army) propose une alliance pour un mega raid. Mais ils ont une réputation de toxicité.',
        choices: [
          { text: "🤝 Accepter l'alliance", approach: 'ally', desc: "L'union fait la force" },
          {
            text: '⚔️ Décliner et les défier',
            approach: 'challenge',
            desc: "Prouver qu'ASDF est supérieur",
          },
          {
            text: '🎯 Alliance ponctuelle uniquement',
            approach: 'limited',
            desc: "Collaborer sans s'engager",
          },
        ],
        outcomes: {
          ally: { repBonus: 1.1, infBonus: 1.5, message: 'Le raid combiné fait trembler CT!' },
          challenge: { repBonus: 1.4, infBonus: 1.1, message: "La rivalité motive l'Army!" },
          limited: {
            repBonus: 1.3,
            infBonus: 1.3,
            message: 'Collaboration réussie, indépendance préservée.',
          },
        },
      },
      {
        title: 'Le Listing',
        narrative:
          "Une rumeur de listing Binance circule. L'excitation monte. Chad veut organiser quelque chose. Quoi?",
        choices: [
          { text: '🚀 Campagne de hype maximum', approach: 'hype', desc: "Pump l'anticipation" },
          { text: '🤫 Rester discret et préparer', approach: 'stealth', desc: 'Ne pas jinx' },
          {
            text: '📚 Thread éducatif sur ce que ça signifie',
            approach: 'educate',
            desc: 'Informer les nouveaux',
          },
        ],
        outcomes: {
          hype: { repBonus: 1.1, infBonus: 1.5, message: "L'excitation est à son comble!" },
          stealth: { repBonus: 1.3, infBonus: 1.1, message: 'La surprise sera encore meilleure.' },
          educate: {
            repBonus: 1.4,
            infBonus: 1.2,
            message: 'Les nouveaux sont prêts et informés.',
          },
        },
      },
      {
        title: 'La Confirmation',
        narrative: "C'est officiel: Binance liste ASDF! Le Discord explose. Comment célébrer?",
        choices: [
          {
            text: '🎉 Mega giveaway pour les OG',
            approach: 'giveaway',
            desc: 'Récompenser les fidèles',
          },
          {
            text: "📢 Campagne d'accueil des nouveaux",
            approach: 'welcome',
            desc: 'Onboarder les newbies',
          },
          { text: '🔥 Burning event communautaire', approach: 'burn', desc: 'Sacrifice collectif' },
        ],
        outcomes: {
          giveaway: { repBonus: 1.4, infBonus: 1.2, message: 'Les OG sont aux anges!' },
          welcome: { repBonus: 1.3, infBonus: 1.4, message: 'Afflux massif de nouveaux membres!' },
          burn: { repBonus: 1.5, infBonus: 1.1, message: 'Le burn devient légendaire!' },
        },
      },
      {
        title: 'La Crise',
        narrative:
          'Un core member est accusé de dump ses tokens pendant le pump. La communauté est en colère. Chad te demande de gérer.',
        choices: [
          {
            text: '🔍 Investigation transparente',
            approach: 'investigate',
            desc: 'Vérifier les faits',
          },
          {
            text: '⚡ Défendre le membre accusé',
            approach: 'defend',
            desc: "Présomption d'innocence",
          },
          {
            text: "🚪 L'éjecter pour protéger l'image",
            approach: 'eject',
            desc: "La communauté d'abord",
          },
        ],
        outcomes: {
          investigate: {
            repBonus: 1.5,
            infBonus: 1.1,
            message: "L'enquête révèle la vérité. Justice rendue.",
          },
          defend: {
            repBonus: 1.1,
            infBonus: 1.2,
            message: 'Il était innocent! Ta loyauté est remarquée.',
          },
          eject: {
            repBonus: 1.2,
            infBonus: 1.0,
            message: 'Action rapide mais tu as peut-être eu tort...',
          },
        },
      },
      {
        title: 'Le Général',
        narrative:
          "Chad veut passer le flambeau. Il te propose de devenir le nouveau Général de l'ASDF Army. C'est une immense responsabilité.",
        choices: [
          { text: '⭐ Accepter le commandement', approach: 'accept', desc: "Tu ES l'ASDF Army" },
          {
            text: '🤝 Proposer un conseil de généraux',
            approach: 'council',
            desc: 'Leadership partagé',
          },
          {
            text: '🎖️ Rester Capitaine, mentor le prochain',
            approach: 'mentor',
            desc: 'Former la relève',
          },
        ],
        outcomes: {
          accept: {
            repBonus: 1.6,
            infBonus: 1.3,
            message: "Tu deviens le Général de l'ASDF Army!",
          },
          council: { repBonus: 1.4, infBonus: 1.4, message: 'Le conseil décentralise le pouvoir!' },
          mentor: { repBonus: 1.5, infBonus: 1.2, message: 'Tu formes la prochaine génération!' },
        },
      },
    ],

    // ===== INFRASTRUCTURE =====
    'OpenNode Collective': [
      {
        title: 'Premier Node',
        narrative:
          "Tu rejoins OpenNode Collective. L'ingénieur lead Sarah te guide: 'On a besoin de plus d'opérateurs de nodes. Tu veux commencer comment?'",
        choices: [
          {
            text: "🖥️ Monter mon propre node d'abord",
            approach: 'hands_on',
            desc: 'Apprendre en faisant',
          },
          {
            text: '📚 Améliorer la documentation',
            approach: 'docs',
            desc: 'Aider les autres à rejoindre',
          },
          {
            text: '🎓 Créer des tutoriels vidéo',
            approach: 'tutorials',
            desc: 'Rendre accessible',
          },
        ],
        outcomes: {
          hands_on: { repBonus: 1.3, infBonus: 1.0, message: 'Ton node tourne parfaitement!' },
          docs: { repBonus: 1.4, infBonus: 1.1, message: 'La doc attire de nouveaux opérateurs.' },
          tutorials: { repBonus: 1.2, infBonus: 1.4, message: 'Tes tutos sont partagés partout!' },
        },
      },
      {
        title: 'Le Bug',
        narrative:
          'Un bug dans le client cause des désync entre nodes. Certains opérateurs perdent leurs rewards. Que faire en priorité?',
        choices: [
          { text: '🔧 Aider au debug du client', approach: 'debug', desc: 'Résoudre la cause' },
          {
            text: '📢 Communiquer avec les opérateurs',
            approach: 'communicate',
            desc: "Gérer l'urgence humaine",
          },
          {
            text: '📊 Documenter les pertes pour compensation',
            approach: 'document',
            desc: 'Préparer le remboursement',
          },
        ],
        outcomes: {
          debug: { repBonus: 1.5, infBonus: 1.0, message: 'Tu trouves le bug! Fix déployé.' },
          communicate: {
            repBonus: 1.3,
            infBonus: 1.3,
            message: 'Les opérateurs gardent confiance.',
          },
          document: {
            repBonus: 1.2,
            infBonus: 1.2,
            message: 'Compensation fluide, pas de départ.',
          },
        },
      },
      {
        title: 'La Décentralisation',
        narrative:
          "70% des nodes sont chez AWS. C'est un point de défaillance centralisé. Comment diversifier?",
        choices: [
          {
            text: '💰 Incentives pour nodes hors-AWS',
            approach: 'incentives',
            desc: 'Récompenser la diversité',
          },
          {
            text: '📋 Guide pour setup home node',
            approach: 'guide',
            desc: "Démocratiser l'accès",
          },
          {
            text: "🤝 Partenariats avec d'autres clouds",
            approach: 'partners',
            desc: 'Négocier des deals',
          },
        ],
        outcomes: {
          incentives: { repBonus: 1.3, infBonus: 1.2, message: 'Les opérateurs migrent!' },
          guide: { repBonus: 1.5, infBonus: 1.0, message: 'Vague de home nodes!' },
          partners: { repBonus: 1.2, infBonus: 1.4, message: 'OVH et Hetzner rejoignent!' },
        },
      },
      {
        title: "L'Attaque",
        narrative:
          'Attaque DDoS sur le réseau. Certains nodes tombent. Les autres sont surchargés. Sarah te met en charge de la réponse.',
        choices: [
          {
            text: "🛡️ Activer les protections d'urgence",
            approach: 'protect',
            desc: 'Défense immédiate',
          },
          {
            text: "🔍 Tracer l'origine de l'attaque",
            approach: 'trace',
            desc: "Identifier l'attaquant",
          },
          {
            text: '📢 Coordonner les opérateurs',
            approach: 'coordinate',
            desc: 'Effort collectif',
          },
        ],
        outcomes: {
          protect: { repBonus: 1.4, infBonus: 1.1, message: 'Réseau stabilisé rapidement!' },
          trace: { repBonus: 1.3, infBonus: 1.2, message: 'Attaquant identifié et signalé.' },
          coordinate: { repBonus: 1.5, infBonus: 1.0, message: 'La communauté résiste ensemble!' },
        },
      },
      {
        title: 'Le SDK',
        narrative:
          "Des devs demandent un SDK plus simple. Ça permettrait plus d'adoption mais demanderait beaucoup de ressources.",
        choices: [
          {
            text: '🔨 Développer un SDK from scratch',
            approach: 'new_sdk',
            desc: 'La qualité avant tout',
          },
          {
            text: "📦 Wrapper l'existant en plus simple",
            approach: 'wrapper',
            desc: 'Solution rapide',
          },
          {
            text: '👥 Bounty communautaire',
            approach: 'bounty',
            desc: 'Laisser la communauté créer',
          },
        ],
        outcomes: {
          new_sdk: { repBonus: 1.4, infBonus: 1.0, message: 'SDK parfait, adoption massive!' },
          wrapper: { repBonus: 1.2, infBonus: 1.3, message: 'Livré vite, devs contents.' },
          bounty: { repBonus: 1.3, infBonus: 1.4, message: '3 SDK émergent de la communauté!' },
        },
      },
      {
        title: "L'Entreprise",
        narrative:
          'Une banque veut utiliser OpenNode pour son infrastructure. Ils demandent un SLA garanti et du support 24/7.',
        choices: [
          {
            text: '✅ Accepter et créer une offre enterprise',
            approach: 'accept',
            desc: 'Revenue + légitimité',
          },
          {
            text: '🔄 Proposer un partenariat co-développé',
            approach: 'partner',
            desc: 'Garder le contrôle',
          },
          {
            text: '❌ Rester focus communauté',
            approach: 'decline',
            desc: 'Ne pas dévier de la mission',
          },
        ],
        outcomes: {
          accept: { repBonus: 1.1, infBonus: 1.5, message: 'Deal signé! Crédibilité boostée.' },
          partner: { repBonus: 1.4, infBonus: 1.2, message: 'Partenariat équilibré!' },
          decline: { repBonus: 1.5, infBonus: 0.9, message: 'La communauté applaudit le focus.' },
        },
      },
      {
        title: 'La Gouvernance',
        narrative:
          "Le réseau grandit. Il faut décider comment les décisions techniques seront prises à l'avenir.",
        choices: [
          {
            text: '🗳️ DAO avec vote des opérateurs',
            approach: 'dao',
            desc: 'Décentralisation max',
          },
          { text: '👥 Conseil technique élu', approach: 'council', desc: 'Expertise guidée' },
          { text: '📋 Processus RFC ouvert', approach: 'rfc', desc: 'Débat technique transparent' },
        ],
        outcomes: {
          dao: { repBonus: 1.3, infBonus: 1.3, message: 'La DAO engage tous les opérateurs!' },
          council: {
            repBonus: 1.4,
            infBonus: 1.1,
            message: 'Le conseil prend des décisions rapides.',
          },
          rfc: { repBonus: 1.5, infBonus: 1.0, message: 'Les RFC attirent des experts externes!' },
        },
      },
      {
        title: "L'Incident",
        narrative:
          "Un opérateur majeur (10% du réseau) annonce qu'il arrête. Panique potentielle. Comment réagir?",
        choices: [
          {
            text: '💰 Lui proposer de meilleurs incentives',
            approach: 'negotiate',
            desc: 'Le garder à tout prix',
          },
          {
            text: '🔄 Plan de migration de charge',
            approach: 'migrate',
            desc: 'Se préparer à son départ',
          },
          {
            text: '📢 Communication transparente',
            approach: 'transparent',
            desc: 'Expliquer la situation',
          },
        ],
        outcomes: {
          negotiate: {
            repBonus: 1.1,
            infBonus: 1.3,
            message: 'Il reste! Mais ça crée un précédent.',
          },
          migrate: { repBonus: 1.4, infBonus: 1.1, message: 'Migration fluide, réseau résilient!' },
          transparent: {
            repBonus: 1.3,
            infBonus: 1.2,
            message: 'La communauté répond en montant des nodes!',
          },
        },
      },
      {
        title: "L'Open Source",
        narrative:
          'Décision majeure: open-sourcer tout le code core, ou garder certains composants propriétaires?',
        choices: [
          { text: '🔓 Open source complet', approach: 'full_open', desc: 'Transparence totale' },
          {
            text: '📦 Core open, tools propriétaires',
            approach: 'partial',
            desc: 'Équilibre stratégique',
          },
          {
            text: "⏰ Roadmap d'ouverture progressive",
            approach: 'gradual',
            desc: 'Open source par étapes',
          },
        ],
        outcomes: {
          full_open: { repBonus: 1.6, infBonus: 1.0, message: 'Contributions externes explosent!' },
          partial: { repBonus: 1.3, infBonus: 1.3, message: 'Best of both worlds.' },
          gradual: {
            repBonus: 1.4,
            infBonus: 1.2,
            message: "Chaque release crée de l'engagement!",
          },
        },
      },
      {
        title: "L'Avenir",
        narrative:
          'OpenNode est maintenant une infrastructure critique. Sarah te propose de devenir CTO. Tu dirigerais le développement.',
        choices: [
          {
            text: '🎯 Accepter le rôle de CTO',
            approach: 'accept',
            desc: 'Tu as prouvé ta valeur',
          },
          { text: '🔬 Créer un lab R&D', approach: 'lab', desc: "Focus sur l'innovation" },
          {
            text: '🌍 Lancer OpenNode Foundation',
            approach: 'foundation',
            desc: 'Pérenniser le projet',
          },
        ],
        outcomes: {
          accept: { repBonus: 1.6, infBonus: 1.2, message: "Tu deviens CTO d'OpenNode!" },
          lab: {
            repBonus: 1.4,
            infBonus: 1.3,
            message: 'Le lab produit des innovations majeures!',
          },
          foundation: { repBonus: 1.5, infBonus: 1.4, message: "La Foundation assure l'avenir!" },
        },
      },
    ],
  };

  // Map builders to their storylines (using first builder of each category as example, others use category scenarios)
  function getBuilderStoryline(builderName, categoryKey) {
    if (builderStorylines[builderName]) {
      return builderStorylines[builderName];
    }
    // For builders without specific storylines, generate based on category
    return generateCategoryStoryline(builderName, categoryKey);
  }

  function generateCategoryStoryline(builderName, categoryKey) {
    // Generate 10 scenarios based on category themes
    const templates = {
      defi: [
        'Premier Jour',
        'La Découverte',
        'Le Défi',
        'La Crise',
        "L'Opportunité",
        'Le Choix',
        'Le Pivot',
        "L'Expansion",
        'La Gouvernance',
        "L'Avenir",
      ],
      gaming: [
        'Bienvenue',
        'Le Bug',
        'Le Feedback',
        "L'Équilibre",
        'Le Contenu',
        'La Compétition',
        'Le Mobile',
        "L'Esport",
        'La Crise',
        'Le Futur',
      ],
      community: [
        "L'Arrivée",
        'Le Raid',
        'Le Grade',
        "L'Infiltré",
        'Le FUD',
        "L'Alliance",
        'Le Buzz',
        'La Victoire',
        'Le Drame',
        'Le Leadership',
      ],
      infra: [
        'Premier Node',
        'Le Bug',
        'La Décentralisation',
        "L'Attaque",
        'Le SDK',
        "L'Entreprise",
        'La Gouvernance',
        "L'Incident",
        "L'Open Source",
        "L'Avenir",
      ],
    };

    const baseStoryline =
      builderStorylines[
        Object.keys(builderStorylines).find(k =>
          k.includes(
            categoryKey === 'defi'
              ? 'Yield'
              : categoryKey === 'gaming'
                ? 'Pixel'
                : categoryKey === 'community'
                  ? 'ASDF'
                  : 'Node'
          )
        )
      ] || builderStorylines['SafeYield DAO'];

    // Clone and customize for this builder
    return baseStoryline.map((scenario, idx) => ({
      ...scenario,
      narrative: scenario.narrative.replace(
        /SafeYield DAO|PixelWorld|ASDF Army|OpenNode/g,
        builderName
      ),
    }));
  }

  arena.innerHTML = `
        <div style="width:100%;min-height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#0a0a1a 0%,#0f1a2a 100%);box-sizing:border-box;">

            <!-- Top Bar -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background:rgba(0,0,0,0.6);border-bottom:1px solid #333;">
                <div style="display:flex;gap:20px;align-items:center;">
                    <button id="pa-refresh-btn" style="padding:6px 10px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid #444;color:#9ca3af;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px;" title="Restart Game">
                        🔄 Restart
                    </button>
                    <div style="width:1px;height:30px;background:#333;"></div>
                    <div>
                        <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Influence</span>
                        <div style="color:#fbbf24;font-size:20px;font-weight:bold;font-family:monospace;" id="pa-influence">⚡ 100</div>
                    </div>
                    <div style="width:1px;height:30px;background:#333;"></div>
                    <div>
                        <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Reputation</span>
                        <div style="color:#22c55e;font-size:20px;font-weight:bold;font-family:monospace;" id="pa-reputation">⭐ 0</div>
                    </div>
                </div>
                <div style="display:flex;gap:20px;align-items:center;">
                    <div id="pa-partner-badge" style="display:none;padding:4px 10px;background:linear-gradient(90deg,#a855f7,#6366f1);border-radius:12px;font-size:11px;color:#fff;font-weight:bold;">
                        🤝 CORE BUILDER
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Build Cycle</span>
                        <div style="color:#a855f7;font-size:18px;font-weight:bold;"><span id="pa-round">1</span> / ${state.maxRounds}</div>
                    </div>
                </div>
            </div>

            <!-- Main Game Area -->
            <div style="flex:1;display:flex;flex-direction:column;padding:15px;padding-bottom:30px;">
                <!-- Instructions -->
                <div id="pa-instructions" style="text-align:center;margin-bottom:15px;"></div>

                <!-- Project Type Selection -->
                <div id="pa-type-select" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:600px;margin:0 auto;width:100%;">
                    ${Object.entries(projectTypes)
                      .map(
                        ([key, type]) => `
                        <button class="type-btn" data-type="${key}" style="
                            padding:15px;border-radius:8px;cursor:pointer;
                            background:rgba(0,0,0,0.5);
                            border:2px solid ${type.color};transition:all 0.2s;text-align:left;display:flex;gap:12px;align-items:center;color:#fff;font-family:inherit;">
                            <div style="font-size:32px;width:50px;text-align:center;">${type.icon}</div>
                            <div style="flex:1;">
                                <div style="font-size:14px;font-weight:bold;color:${type.color};margin-bottom:3px;">${type.name}</div>
                                <div style="font-size:11px;color:#9ca3af;line-height:1.3;">${type.desc}</div>
                            </div>
                        </button>
                    `
                      )
                      .join('')}
                </div>

                <!-- Builder Selection (hidden initially) -->
                <div id="pa-builder-select" style="display:none;flex:1;"></div>

                <!-- Roadmap Display (hidden initially) -->
                <div id="pa-roadmap" style="display:none;max-width:700px;margin:0 auto;width:100%;padding-bottom:20px;"></div>

                <!-- Contribution Selection (hidden initially) -->
                <div id="pa-contribute-select" style="display:none;text-align:center;max-width:500px;margin:0 auto;"></div>

                <!-- Scenario/Narrative Display (hidden initially) -->
                <div id="pa-scenario" style="display:none;max-width:600px;margin:0 auto;width:100%;"></div>

                <!-- Result Display (hidden initially) -->
                <div id="pa-result" style="display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;">
                    <div id="pa-result-icon" style="font-size:60px;margin-bottom:12px;"></div>
                    <div id="pa-result-text" style="font-size:24px;font-weight:bold;margin-bottom:8px;"></div>
                    <div id="pa-result-detail" style="font-size:14px;color:#6b7280;margin-bottom:20px;text-align:center;max-width:400px;"></div>
                    <button id="pa-next-btn" class="btn" style="padding:10px 30px;font-size:14px;background:#fbbf24;border-color:#fbbf24;color:#000;">
                        Continue
                    </button>
                </div>

                <!-- Partnership Offer (hidden initially) -->
                <div id="pa-partnership-offer" style="display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;max-width:500px;margin:0 auto;"></div>

                <!-- Partnership View - Roadmap Collaboration (hidden initially) -->
                <div id="pa-partnership-view" style="display:none;flex:1;max-width:700px;margin:0 auto;width:100%;"></div>

                <!-- Collaboration Decision (hidden initially) -->
                <div id="pa-collab" style="display:none;flex:1;max-width:500px;margin:0 auto;width:100%;"></div>
            </div>

            <canvas id="pa-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas>
        </div>
    `;

  const canvas = document.getElementById('pa-canvas');
  const ctx = canvas.getContext('2d');

  // Helper: convert hex color to rgba
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function resizeCanvas() {
    const rect = arena.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  resizeCanvas();

  // UI Elements
  const influenceEl = document.getElementById('pa-influence');
  const reputationEl = document.getElementById('pa-reputation');
  const roundEl = document.getElementById('pa-round');
  const instructionsEl = document.getElementById('pa-instructions');
  const typeSelectEl = document.getElementById('pa-type-select');
  const builderSelectEl = document.getElementById('pa-builder-select');
  const roadmapEl = document.getElementById('pa-roadmap');
  const contributeSelectEl = document.getElementById('pa-contribute-select');
  const scenarioEl = document.getElementById('pa-scenario');
  const resultEl = document.getElementById('pa-result');
  const resultIconEl = document.getElementById('pa-result-icon');
  const resultTextEl = document.getElementById('pa-result-text');
  const resultDetailEl = document.getElementById('pa-result-detail');
  const nextBtn = document.getElementById('pa-next-btn');
  const partnerBadgeEl = document.getElementById('pa-partner-badge');
  const partnershipOfferEl = document.getElementById('pa-partnership-offer');
  const partnershipViewEl = document.getElementById('pa-partnership-view');
  const collabEl = document.getElementById('pa-collab');
  const refreshBtn = document.getElementById('pa-refresh-btn');

  // Refresh button - restart game
  refreshBtn.addEventListener('click', () => {
    if (confirm('Restart? All progress will be lost.')) {
      stopGame(gameId);
      startPumpArena(gameId);
    }
  });

  function updateUI() {
    influenceEl.textContent = '⚡ ' + state.influence;
    reputationEl.textContent = '⭐ ' + state.reputation;
    reputationEl.style.color = state.reputation > 0 ? '#22c55e' : '#9ca3af';
    roundEl.textContent = state.round;
    partnerBadgeEl.style.display = state.isPartner ? 'block' : 'none';
  }

  function showPhase(phase) {
    state.phase = phase;
    typeSelectEl.style.display = 'none';
    builderSelectEl.style.display = 'none';
    roadmapEl.style.display = 'none';
    contributeSelectEl.style.display = 'none';
    scenarioEl.style.display = 'none';
    resultEl.style.display = 'none';
    partnershipOfferEl.style.display = 'none';
    partnershipViewEl.style.display = 'none';
    collabEl.style.display = 'none';

    if (phase === 'select') {
      // If partner, go directly to partnership view
      if (state.isPartner) {
        showPhase('partnership');
        return;
      }
      instructionsEl.innerHTML = `
                <div style="font-size:18px;color:#fbbf24;font-weight:600;margin-bottom:6px;">🏗️ Choose a Project Category</div>
                <div style="font-size:13px;color:#9ca3af;">Find teams to support and build with</div>
            `;
      typeSelectEl.style.display = 'grid';
    } else if (phase === 'builder') {
      const type = projectTypes[state.selectedType];
      instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">${type.icon} ${type.name}</div>
                <div style="font-size:12px;color:#6b7280;">Review teams and find where you can contribute</div>
            `;
      builderSelectEl.style.display = 'block';
      renderBuilders();
    } else if (phase === 'roadmap') {
      const type = projectTypes[state.selectedType];
      const builder = state.selectedBuilder;
      instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">${builder.name}</div>
                <div style="font-size:12px;color:#6b7280;">Review the roadmap and see how you can help</div>
            `;
      roadmapEl.style.display = 'block';
      renderRoadmap();
    } else if (phase === 'contribute') {
      const type = projectTypes[state.selectedType];
      instructionsEl.innerHTML = `
                <div style="font-size:16px;color:#fbbf24;font-weight:600;margin-bottom:4px;">🤝 Contribution Level</div>
                <div style="font-size:12px;color:#6b7280;">${state.selectedBuilder.name} • Potential: ${Math.round(state.selectedBuilder.potential * 100)}%</div>
            `;
      contributeSelectEl.style.display = 'block';
      renderContributeOptions();
    } else if (phase === 'scenario') {
      const type = projectTypes[state.selectedType];
      instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">📖 ${state.selectedBuilder.name}</div>
                <div style="font-size:12px;color:#6b7280;">A situation has emerged. Your choice matters.</div>
            `;
      scenarioEl.style.display = 'block';
      renderScenario();
    } else if (phase === 'result') {
      instructionsEl.innerHTML = '';
      resultEl.style.display = 'flex';
    } else if (phase === 'partnership-offer') {
      instructionsEl.innerHTML = '';
      partnershipOfferEl.style.display = 'flex';
      renderPartnershipOffer();
    } else if (phase === 'partnership') {
      const type = projectTypes[state.partnership.type];
      instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">🤝 ${state.partnership.builder.name} - Core Builder</div>
                <div style="font-size:12px;color:#6b7280;">You are shaping the project's future together</div>
            `;
      partnershipViewEl.style.display = 'block';
      renderPartnershipView();
    } else if (phase === 'collab') {
      const type = projectTypes[state.partnership.type];
      instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">📋 Team Decision</div>
                <div style="font-size:12px;color:#6b7280;">Your input will shape the project's direction</div>
            `;
      collabEl.style.display = 'block';
      renderCollabDecision();
    }
  }

  function renderBuilders() {
    const type = projectTypes[state.selectedType];
    builderSelectEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:10px;max-width:600px;margin:0 auto;">
                ${type.builders
                  .map((builder, idx) => {
                    const potentialPct = Math.round(builder.potential * 100);
                    const stageColor =
                      builder.stage === 'Early' || builder.stage === 'Alpha'
                        ? '#f59e0b'
                        : builder.stage === 'Growing' || builder.stage === 'Beta'
                          ? '#3b82f6'
                          : '#22c55e';
                    return `
                        <button class="builder-btn" data-idx="${idx}" style="
                            padding:12px 15px;border-radius:8px;cursor:pointer;
                            background:rgba(0,0,0,0.4);
                            border:1px solid ${type.color}30;transition:all 0.2s;text-align:left;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                                <div>
                                    <div style="font-size:15px;font-weight:bold;color:#fff;margin-bottom:2px;">${builder.name}</div>
                                    <div style="font-size:11px;color:#9ca3af;font-style:italic;">"${builder.vision}"</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:12px;padding:3px 8px;background:${stageColor}30;border-radius:4px;color:${stageColor};font-weight:bold;">${builder.stage}</div>
                                </div>
                            </div>
                            <div style="display:flex;gap:15px;font-size:10px;color:#9ca3af;flex-wrap:wrap;margin-bottom:8px;">
                                <span>👥 ${builder.team}</span>
                                <span>🌐 ${builder.community}</span>
                            </div>
                            <div style="font-size:10px;color:#6b7280;margin-bottom:8px;">
                                <span style="color:#a855f7;">Needs:</span> ${builder.needs.join(' • ')}
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="flex:1;height:4px;background:#1f2937;border-radius:2px;overflow:hidden;">
                                    <div style="width:${potentialPct}%;height:100%;background:linear-gradient(90deg,#22c55e,#fbbf24);"></div>
                                </div>
                                <span style="font-size:10px;color:#22c55e;font-weight:bold;">${potentialPct}% potential</span>
                            </div>
                        </button>
                    `;
                  })
                  .join('')}
                <button id="pa-back-type" style="margin-top:5px;padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#6b7280;cursor:pointer;font-size:12px;">
                    ← Back to categories
                </button>
            </div>
        `;

    builderSelectEl.querySelectorAll('.builder-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        state.selectedBuilderIdx = idx;
        state.selectedBuilder = projectTypes[state.selectedType].builders[idx];
        showPhase('roadmap');
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = type.color;
        btn.style.background = 'rgba(0,0,0,0.6)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = type.color + '30';
        btn.style.background = 'rgba(0,0,0,0.4)';
      });
    });

    document.getElementById('pa-back-type').addEventListener('click', () => showPhase('select'));
  }

  function renderRoadmap() {
    const type = projectTypes[state.selectedType];
    const builder = state.selectedBuilder;
    const roadmap = roadmapTemplates[state.selectedType];
    const potentialPct = Math.round(builder.potential * 100);
    const stageColor =
      builder.stage === 'Early' || builder.stage === 'Alpha'
        ? '#f59e0b'
        : builder.stage === 'Growing' || builder.stage === 'Beta'
          ? '#3b82f6'
          : '#22c55e';

    roadmapEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;border:1px solid ${type.color}30;overflow:hidden;">
                <!-- Project Header -->
                <div style="padding:12px 15px;background:linear-gradient(135deg,${type.color}20,transparent);border-bottom:1px solid ${type.color}20;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:28px;">${type.icon}</span>
                            <div>
                                <div style="font-size:16px;font-weight:bold;color:#fff;">${builder.name}</div>
                                <div style="font-size:11px;color:${type.color};">${type.name}</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:12px;padding:4px 10px;background:${stageColor}30;border-radius:6px;color:${stageColor};font-weight:bold;">${builder.stage}</div>
                        </div>
                    </div>
                </div>

                <!-- Project Stats -->
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#1f2937;border-bottom:1px solid #1f2937;">
                    <div style="padding:10px;background:#0a0a1a;text-align:center;">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">TEAM</div>
                        <div style="font-size:11px;color:#fff;">${builder.team}</div>
                    </div>
                    <div style="padding:10px;background:#0a0a1a;text-align:center;">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">COMMUNITY</div>
                        <div style="font-size:11px;color:#22c55e;font-weight:bold;">${builder.community}</div>
                    </div>
                    <div style="padding:10px;background:#0a0a1a;text-align:center;">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">POTENTIAL</div>
                        <div style="font-size:11px;color:#fbbf24;font-weight:bold;">${potentialPct}%</div>
                    </div>
                </div>

                <!-- What They Need -->
                <div style="padding:12px 15px;background:rgba(168,85,247,0.1);border-bottom:1px solid #1f2937;">
                    <div style="font-size:11px;color:#a855f7;font-weight:bold;margin-bottom:8px;">🎯 HOW YOU CAN HELP</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${builder.needs
                          .map(
                            need => `
                            <span style="padding:4px 10px;background:rgba(255,255,255,0.1);border-radius:12px;font-size:10px;color:#d1d5db;">${need}</span>
                        `
                          )
                          .join('')}
                    </div>
                </div>

                <!-- Roadmap Timeline -->
                <div style="padding:12px 15px;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Project Roadmap</div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                        ${roadmap
                          .map(
                            (phase, idx) => `
                            <div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:10px;border-left:2px solid ${type.color}${idx === 0 ? '' : '40'};">
                                <div style="font-size:10px;color:${type.color};font-weight:bold;margin-bottom:4px;">${phase.phase}</div>
                                <div style="font-size:11px;color:#fff;font-weight:500;margin-bottom:6px;">${phase.title}</div>
                                <ul style="margin:0;padding-left:12px;font-size:9px;color:#9ca3af;line-height:1.5;">
                                    ${phase.tasks.map(task => `<li>${task}</li>`).join('')}
                                </ul>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div style="display:flex;gap:10px;margin-top:12px;margin-bottom:20px;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;">
                <button id="pa-back-builder" style="flex:1;padding:12px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid #555;color:#fff;cursor:pointer;font-size:13px;font-weight:500;">
                    ← Back
                </button>
                <button id="pa-join-btn" style="flex:2;padding:12px;border-radius:6px;background:linear-gradient(135deg,${type.color},${type.color}cc);border:none;color:#fff;cursor:pointer;font-size:14px;font-weight:bold;box-shadow:0 4px 15px ${type.color}40;">
                    🤝 Join ${builder.name}
                </button>
            </div>
        `;

    document
      .getElementById('pa-back-builder')
      .addEventListener('click', () => showPhase('builder'));
    document.getElementById('pa-join-btn').addEventListener('click', () => showPhase('contribute'));
  }

  function renderContributeOptions() {
    const type = projectTypes[state.selectedType];
    const builder = state.selectedBuilder;

    // Contribution levels based on influence
    const contributions = [
      {
        level: 'Light',
        influence: 10,
        desc: 'Casual help - share, like, spread the word',
        icon: '💬',
      },
      {
        level: 'Active',
        influence: 25,
        desc: 'Regular contributor - join discussions, give feedback',
        icon: '🔧',
      },
      {
        level: 'Dedicated',
        influence: 50,
        desc: 'Serious builder - contribute skills and time',
        icon: '⚡',
      },
      {
        level: 'All-In',
        influence: state.influence,
        desc: 'Go all-in - become a core part of the team',
        icon: '🚀',
      },
    ].filter(c => c.influence <= state.influence);

    // Check previous contributions
    const builderKey = `${state.selectedType}_${builder.name}`;
    const previousContribs = state.contributionsByBuilder[builderKey] || 0;

    contributeSelectEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;padding:15px;border:1px solid #333;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding-bottom:12px;border-bottom:1px solid #1f2937;">
                    <div style="text-align:left;">
                        <div style="font-size:12px;color:#6b7280;">Contributing to</div>
                        <div style="font-size:14px;color:#fff;font-weight:bold;">${builder.name}</div>
                        ${previousContribs > 0 ? `<div style="font-size:10px;color:#a855f7;margin-top:2px;">Previous contributions: ${previousContribs}</div>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px;color:#6b7280;">Your Influence</div>
                        <div style="font-size:16px;color:#fbbf24;font-weight:bold;">⚡ ${state.influence}</div>
                    </div>
                </div>

                <div style="font-size:11px;color:#6b7280;margin-bottom:10px;text-align:left;">Choose your contribution level:</div>

                <!-- Contribution levels -->
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                    ${contributions
                      .map(
                        contrib => `
                        <button class="contrib-btn" data-influence="${contrib.influence}" data-level="${contrib.level}" style="
                            padding:12px 15px;border-radius:8px;cursor:pointer;
                            background:${contrib.level === 'All-In' ? 'linear-gradient(135deg,#a855f7,#6366f1)' : 'rgba(255,255,255,0.05)'};
                            border:1px solid ${contrib.level === 'All-In' ? '#a855f7' : '#333'};
                            color:white;font-size:12px;transition:all 0.2s;text-align:left;display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">${contrib.icon}</span>
                            <div style="flex:1;">
                                <div style="font-size:14px;font-weight:bold;margin-bottom:2px;">${contrib.level}</div>
                                <div style="font-size:10px;color:#9ca3af;">${contrib.desc}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:14px;font-weight:bold;color:#fbbf24;">⚡ ${contrib.influence}</div>
                            </div>
                        </button>
                    `
                      )
                      .join('')}
                </div>

                <button id="pa-back-roadmap" style="width:100%;padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#6b7280;cursor:pointer;font-size:11px;">
                    ← Back to project details
                </button>
            </div>
        `;

    // Contribution buttons
    contributeSelectEl.querySelectorAll('.contrib-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentContribution = parseInt(btn.dataset.influence);
        // Select a random scenario for this category
        const categoryScenarios = scenarios[state.selectedType];
        const usedInCategory = state.usedScenarios[state.selectedType] || [];
        const availableScenarios = categoryScenarios.filter(
          (_, idx) => !usedInCategory.includes(idx)
        );

        if (availableScenarios.length === 0) {
          // Reset if all scenarios used
          state.usedScenarios[state.selectedType] = [];
          state.currentScenario =
            categoryScenarios[Math.floor(Math.random() * categoryScenarios.length)];
        } else {
          const randomIdx = Math.floor(Math.random() * availableScenarios.length);
          state.currentScenario = availableScenarios[randomIdx];
          const originalIdx = categoryScenarios.indexOf(state.currentScenario);
          state.usedScenarios[state.selectedType] = [...usedInCategory, originalIdx];
        }

        showPhase('scenario');
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.02)';
        btn.style.borderColor = type.color;
      });
      btn.addEventListener('mouseleave', () => {
        const isAllIn = btn.dataset.level === 'All-In';
        btn.style.transform = 'scale(1)';
        btn.style.borderColor = isAllIn ? '#a855f7' : '#333';
      });
    });

    document
      .getElementById('pa-back-roadmap')
      .addEventListener('click', () => showPhase('roadmap'));
  }

  function renderScenario() {
    const type = projectTypes[state.selectedType];
    const scenario = state.currentScenario;
    const builder = state.selectedBuilder;

    scenarioEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.5);border-radius:12px;border:1px solid ${type.color}40;overflow:hidden;">
                <!-- Scenario Header -->
                <div style="padding:20px;background:linear-gradient(135deg,${type.color}20,transparent);border-bottom:1px solid ${type.color}20;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:15px;">
                        <span style="font-size:32px;">${type.icon}</span>
                        <div>
                            <div style="font-size:11px;color:${type.color};text-transform:uppercase;letter-spacing:1px;">${builder.name}</div>
                            <div style="font-size:18px;font-weight:bold;color:#fff;">${scenario.title}</div>
                        </div>
                    </div>
                    <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0;padding:15px;background:rgba(0,0,0,0.3);border-radius:8px;border-left:3px solid ${type.color};">
                        ${scenario.narrative}
                    </p>
                </div>

                <!-- Choices -->
                <div style="padding:20px;">
                    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px;">
                        What do you recommend?
                    </div>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        ${scenario.choices
                          .map(
                            (choice, idx) => `
                            <button class="scenario-choice" data-approach="${choice.approach}" style="
                                padding:15px;border-radius:8px;cursor:pointer;
                                background:rgba(255,255,255,0.05);
                                border:1px solid #333;
                                transition:all 0.2s;text-align:left;
                                display:flex;flex-direction:column;gap:5px;">
                                <div style="font-size:14px;font-weight:600;color:#fff;">${choice.text}</div>
                                <div style="font-size:11px;color:#9ca3af;">${choice.desc}</div>
                            </button>
                        `
                          )
                          .join('')}
                    </div>
                </div>

                <!-- Contribution Info -->
                <div style="padding:15px 20px;background:rgba(0,0,0,0.3);border-top:1px solid #1f2937;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:12px;color:#6b7280;">Your contribution</span>
                        <span style="font-size:14px;font-weight:bold;color:#fbbf24;">⚡ ${state.currentContribution} influence</span>
                    </div>
                </div>
            </div>
        `;

    // Choice button handlers
    scenarioEl.querySelectorAll('.scenario-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedChoice = btn.dataset.approach;
        playRound();
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = type.color;
        btn.style.background = hexToRgba(type.color, 0.15);
        btn.style.transform = 'translateX(5px)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = '#333';
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.transform = 'translateX(0)';
      });
    });
  }

  function playRound() {
    const builder = state.selectedBuilder;
    const type = projectTypes[state.selectedType];
    const scenario = state.currentScenario;
    const chosenApproach = state.selectedChoice;
    const outcome = scenario.outcomes[chosenApproach];

    // Spend influence to contribute
    state.influence -= state.currentContribution;

    // Track contributions to this builder
    const builderKey = `${state.selectedType}_${builder.name}`;
    state.contributionsByBuilder[builderKey] = (state.contributionsByBuilder[builderKey] || 0) + 1;
    const contributionCount = state.contributionsByBuilder[builderKey];

    updateUI();

    // Calculate impact based on choice outcome bonuses
    const baseRep = state.currentContribution;
    const baseInf = Math.floor(state.currentContribution * 0.5);

    // Apply scenario outcome bonuses
    const reputationGain = Math.floor(baseRep * outcome.repBonus);
    const influenceGain = Math.floor(baseInf * outcome.infBonus);

    state.reputation += reputationGain;
    state.influence += influenceGain;

    // Determine result presentation based on bonuses
    let resultIcon, resultText;
    const isGreatOutcome = outcome.repBonus >= 1.3 || outcome.infBonus >= 1.3;
    const isGoodOutcome = outcome.repBonus >= 1.0 && outcome.infBonus >= 1.0;

    if (isGreatOutcome) {
      resultIcon = '🚀';
      resultText = 'Excellent Decision!';
      // Success particles
      for (let i = 0; i < 12; i++) {
        state.particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: -4 - Math.random() * 4,
          icon: ['⭐', '🤝', '✨', '🚀'][Math.floor(Math.random() * 4)],
          life: 50,
        });
      }
    } else if (isGoodOutcome) {
      resultIcon = '✨';
      resultText = 'Good Call!';
      // Good particles
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 5,
          vy: -3 - Math.random() * 3,
          icon: ['⭐', '✨'][Math.floor(Math.random() * 2)],
          life: 40,
        });
      }
    } else {
      resultIcon = '💭';
      resultText = 'Trade-off Made';
      // Neutral particles
      for (let i = 0; i < 5; i++) {
        state.particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 2,
          icon: ['💭', '📝'][Math.floor(Math.random() * 2)],
          life: 35,
        });
      }
    }

    const resultDetail = `${outcome.message}\n\n+${reputationGain} reputation • +${influenceGain} influence`;

    state.history.push({
      round: state.round,
      type: state.selectedType,
      builder: builder.name,
      scenario: scenario.title,
      choice: chosenApproach,
      contribution: state.currentContribution,
      reputationGain: reputationGain,
      influenceGain: influenceGain,
    });

    state.score = state.reputation;
    updateScore(gameId, state.score);
    updateUI();

    // Show result
    resultIconEl.textContent = resultIcon;
    resultTextEl.textContent = resultText;
    resultTextEl.style.color = isGreatOutcome ? '#22c55e' : isGoodOutcome ? '#3b82f6' : '#f59e0b';
    resultDetailEl.innerHTML = resultDetail.replace('\n\n', '<br><br>');

    // Check for core builder offer (after 2 contributions to same builder with good outcome)
    const shouldOfferPartnership =
      contributionCount >= 2 && isGoodOutcome && !state.isPartner && state.influence > 0;

    if (state.round >= state.maxRounds || state.influence <= 0) {
      nextBtn.textContent = state.influence <= 0 ? 'Out of Influence' : 'View Your Journey';
      nextBtn.style.background = state.influence <= 0 ? '#f59e0b' : '#fbbf24';
      nextBtn.onclick = () => {
        state.gameOver = true;
        endGame(gameId, state.score);
      };
    } else if (shouldOfferPartnership) {
      // Offer core builder position
      nextBtn.textContent = '🤝 Core Builder Invite!';
      nextBtn.style.background = 'linear-gradient(135deg,#a855f7,#6366f1)';
      nextBtn.onclick = () => {
        state.round++;
        showPhase('partnership-offer');
      };
    } else {
      nextBtn.textContent = 'Continue Building →';
      nextBtn.style.background = '#fbbf24';
      nextBtn.onclick = nextRound;
    }

    showPhase('result');
  }

  function nextRound() {
    state.round++;
    state.selectedType = null;
    state.selectedBuilder = null;
    state.currentContribution = 0;
    updateUI();
    showPhase('select');
  }

  // ===== PARTNERSHIP SYSTEM =====

  function renderPartnershipOffer() {
    const type = projectTypes[state.selectedType];
    const builder = state.selectedBuilder;

    // SECURITY: Validate color format (hex only) and escape builder name
    const safeColor = /^#[0-9A-Fa-f]{6}$/.test(type.color) ? type.color : '#6366f1';
    const safeName = escapeHtml(builder.name);

    partnershipOfferEl.innerHTML = `
            <div style="background:linear-gradient(135deg,${safeColor}20,rgba(0,0,0,0.6));border-radius:12px;padding:25px;border:2px solid ${safeColor};text-align:center;">
                <div style="font-size:50px;margin-bottom:15px;">🏗️</div>
                <h3 style="color:${safeColor};font-size:20px;margin-bottom:10px;">Core Builder Invitation</h3>
                <p style="color:#9ca3af;font-size:13px;margin-bottom:20px;line-height:1.6;">
                    The ${safeName} team has noticed your consistent contributions.<br>
                    They're inviting you to become a <strong style="color:#fbbf24;">Core Builder</strong>!
                </p>

                <div style="background:rgba(0,0,0,0.4);border-radius:8px;padding:15px;margin-bottom:20px;text-align:left;">
                    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:10px;">What this means</div>
                    <ul style="margin:0;padding-left:20px;color:#d1d5db;font-size:12px;line-height:1.8;">
                        <li>Help shape the project's direction together</li>
                        <li>Make key strategic decisions as a team</li>
                        <li>Gain significant reputation for your commitment</li>
                        <li><span style="color:#f59e0b;">⚠️ You'll focus only on this project</span></li>
                        <li>You can step back anytime to explore other projects</li>
                    </ul>
                </div>

                <div style="display:flex;gap:12px;">
                    <button id="pa-decline-partnership" style="flex:1;padding:12px;border-radius:6px;background:transparent;border:1px solid #444;color:#9ca3af;cursor:pointer;font-size:13px;">
                        Keep Exploring
                    </button>
                    <button id="pa-accept-partnership" style="flex:1;padding:12px;border-radius:6px;background:linear-gradient(135deg,${safeColor},${safeColor}aa);border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">
                        🏗️ Become Core Builder
                    </button>
                </div>
            </div>
        `;

    document.getElementById('pa-decline-partnership').addEventListener('click', () => {
      showPhase('select');
    });

    document.getElementById('pa-accept-partnership').addEventListener('click', () => {
      // Create partnership
      state.isPartner = true;
      state.partnership = {
        type: state.selectedType,
        builderIdx: state.selectedBuilderIdx,
        builder: state.selectedBuilder,
        roadmapProgress: 2, // Start at Q3 (phases 0,1 already done)
        collabChoices: [],
        decisionsRemaining: 2, // 2 strategic decisions to make
      };
      updateUI();

      // Celebration particles
      for (let i = 0; i < 15; i++) {
        state.particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: -4 - Math.random() * 4,
          icon: ['🤝', '🎉', '✨', '🚀'][Math.floor(Math.random() * 4)],
          life: 60,
        });
      }

      showPhase('partnership');
    });
  }

  function renderPartnershipView() {
    const type = projectTypes[state.partnership.type];
    const builder = state.partnership.builder;
    const roadmap = roadmapTemplates[state.partnership.type];
    const progress = state.partnership.roadmapProgress;
    const decisionsRemaining = state.partnership.decisionsRemaining;

    partnershipViewEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;border:1px solid ${type.color}40;overflow:hidden;">
                <!-- Partner Header -->
                <div style="padding:15px;background:linear-gradient(135deg,${type.color}30,transparent);border-bottom:1px solid ${type.color}20;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:36px;">${type.icon}</span>
                            <div>
                                <div style="font-size:18px;font-weight:bold;color:#fff;">${builder.name}</div>
                                <div style="font-size:12px;color:${type.color};">🤝 You are a Partner</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px;color:#6b7280;">Strategic Decisions Left</div>
                            <div style="font-size:24px;font-weight:bold;color:#fbbf24;">${decisionsRemaining}</div>
                        </div>
                    </div>
                </div>

                <!-- Collaborative Roadmap -->
                <div style="padding:15px;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:10px;text-transform:uppercase;">Collaborative Roadmap</div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                        ${roadmap
                          .map((phase, idx) => {
                            const isCompleted = idx < progress;
                            const isCurrent = idx === progress;
                            const isCollabPhase = idx >= 2; // Q3 & Q4 are collab phases
                            let statusIcon = '';
                            if (isCompleted) statusIcon = '✅';
                            else if (isCurrent) statusIcon = '🔨';
                            else statusIcon = '⏳';

                            return `
                                <div style="background:${isCompleted ? 'rgba(34,197,94,0.1)' : isCurrent ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)'};
                                    border-radius:6px;padding:10px;
                                    border:2px solid ${isCompleted ? '#22c55e40' : isCurrent ? '#fbbf24' : isCollabPhase ? type.color + '40' : '#33333380'};
                                    ${isCurrent ? 'box-shadow:0 0 15px rgba(251,191,36,0.2);' : ''}">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                        <span style="font-size:10px;color:${type.color};font-weight:bold;">${phase.phase}</span>
                                        <span style="font-size:14px;">${statusIcon}</span>
                                    </div>
                                    <div style="font-size:11px;color:#fff;font-weight:500;margin-bottom:4px;">${phase.title}</div>
                                    ${isCollabPhase ? '<div style="font-size:9px;color:#a855f7;font-style:italic;">🤝 Co-built</div>' : ''}
                                </div>
                            `;
                          })
                          .join('')}
                    </div>
                </div>

                <!-- Previous Choices -->
                ${
                  state.partnership.collabChoices.length > 0
                    ? `
                    <div style="padding:0 15px 15px;">
                        <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Your Decisions</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${state.partnership.collabChoices
                              .map(
                                choice => `
                                <span style="padding:4px 10px;background:rgba(168,85,247,0.2);border-radius:12px;font-size:10px;color:#a855f7;">
                                    ${choice}
                                </span>
                            `
                              )
                              .join('')}
                        </div>
                    </div>
                `
                    : ''
                }

                <!-- Actions -->
                <div style="padding:15px;background:rgba(0,0,0,0.3);border-top:1px solid #1f2937;display:flex;gap:10px;">
                    <button id="pa-leave-partnership" style="flex:1;padding:10px;border-radius:6px;background:transparent;border:1px solid #ef444480;color:#ef4444;cursor:pointer;font-size:12px;">
                        ❌ Leave Partnership
                    </button>
                    ${
                      decisionsRemaining > 0
                        ? `
                        <button id="pa-make-decision" style="flex:2;padding:10px;border-radius:6px;background:linear-gradient(135deg,${type.color},${type.color}cc);border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">
                            📋 Make Strategic Decision
                        </button>
                    `
                        : `
                        <button id="pa-finish-partnership" style="flex:2;padding:10px;border-radius:6px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">
                            🏆 Complete Partnership
                        </button>
                    `
                    }
                </div>
            </div>
        `;

    document.getElementById('pa-leave-partnership').addEventListener('click', () => {
      if (confirm('Leave the partnership? You will return to being a regular investor.')) {
        state.isPartner = false;
        state.partnership = null;
        updateUI();
        showPhase('select');
      }
    });

    if (decisionsRemaining > 0) {
      document.getElementById('pa-make-decision').addEventListener('click', () => {
        showPhase('collab');
      });
    } else {
      document.getElementById('pa-finish-partnership').addEventListener('click', () => {
        // Partnership completed successfully - bonus reward
        const bonus = Math.floor(state.cash * 0.5);
        state.cash += bonus;
        state.score = Math.max(0, state.cash - 1000);
        updateScore(gameId, state.score);
        updateUI();

        // Big celebration
        for (let i = 0; i < 20; i++) {
          state.particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: -5 - Math.random() * 5,
            icon: ['🏆', '💰', '🚀', '✨', '🎉'][Math.floor(Math.random() * 5)],
            life: 70,
          });
        }

        // End game as successful partner
        state.gameOver = true;
        endGame(gameId, state.score);
      });
    }
  }

  function renderCollabDecision() {
    const type = projectTypes[state.partnership.type];
    const options = collabOptions[state.partnership.type];
    const decisionIndex = 2 - state.partnership.decisionsRemaining; // 0 or 1
    const decision = options[decisionIndex] || options[0];

    collabEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;padding:20px;border:1px solid ${type.color}40;">
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="font-size:40px;margin-bottom:10px;">📋</div>
                    <h3 style="color:#fff;font-size:18px;margin-bottom:6px;">${decision.title}</h3>
                    <p style="color:#9ca3af;font-size:12px;">${decision.desc}</p>
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:15px;">
                    ${decision.options
                      .map(
                        (option, idx) => `
                        <button class="collab-option" data-choice="${option}" style="
                            padding:14px;border-radius:8px;cursor:pointer;
                            background:rgba(255,255,255,0.05);
                            border:1px solid #333;color:#fff;font-size:13px;
                            text-align:left;transition:all 0.2s;">
                            <span style="color:${type.color};margin-right:8px;">${idx + 1}.</span>
                            ${option}
                        </button>
                    `
                      )
                      .join('')}
                </div>

                <button id="pa-back-to-partnership" style="width:100%;padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#6b7280;cursor:pointer;font-size:11px;">
                    ← Back to partnership view
                </button>
            </div>
        `;

    collabEl.querySelectorAll('.collab-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.choice;
        state.partnership.collabChoices.push(choice);
        state.partnership.decisionsRemaining--;
        state.partnership.roadmapProgress++;
        state.round++;

        // Random outcome based on choice
        const outcomeRoll = Math.random();
        let bonus = 0;
        if (outcomeRoll > 0.3) {
          // Good outcome
          bonus = Math.floor(state.cash * (0.1 + Math.random() * 0.2));
          state.cash += bonus;
        }

        state.score = Math.max(0, state.cash - 1000);
        updateUI();
        updateScore(gameId, state.score);

        // Show outcome briefly then return to partnership view
        collabEl.innerHTML = `
                    <div style="text-align:center;padding:30px;">
                        <div style="font-size:50px;margin-bottom:15px;">${bonus > 0 ? '✅' : '🤔'}</div>
                        <div style="font-size:18px;color:${bonus > 0 ? '#22c55e' : '#f59e0b'};font-weight:bold;margin-bottom:10px;">
                            ${bonus > 0 ? 'Great Decision!' : 'Time Will Tell...'}
                        </div>
                        <div style="font-size:13px;color:#9ca3af;margin-bottom:8px;">
                            You chose: "${choice}"
                        </div>
                        ${bonus > 0 ? `<div style="font-size:16px;color:#22c55e;font-weight:bold;">+$${bonus.toLocaleString()} bonus</div>` : ''}
                    </div>
                `;

        setTimeout(() => {
          showPhase('partnership');
        }, GAME_TIMING.EFFECT.VERY_SLOW);
      });

      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = type.color;
        btn.style.background = hexToRgba(type.color, 0.15);
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = '#333';
        btn.style.background = 'rgba(255,255,255,0.05)';
      });
    });

    document.getElementById('pa-back-to-partnership').addEventListener('click', () => {
      showPhase('partnership');
    });
  }

  // Type selection event listeners
  const typeButtons = typeSelectEl.querySelectorAll('.type-btn');
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedType = btn.dataset.type;
      showPhase('builder');
    });
    btn.addEventListener('mouseenter', () => {
      const type = projectTypes[btn.dataset.type];
      btn.style.borderColor = type.color;
      btn.style.background = hexToRgba(type.color, 0.2);
      btn.style.transform = 'scale(1.02)';
    });
    btn.addEventListener('mouseleave', () => {
      const type = projectTypes[btn.dataset.type];
      btn.style.borderColor = type.color;
      btn.style.background = 'rgba(0,0,0,0.5)';
      btn.style.transform = 'scale(1)';
    });
  });

  function update() {
    if (state.gameOver) return;

    // Particles
    state.particles = state.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life--;
      return p.life > 0;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life / 50;
      ctx.fillText(p.icon, p.x, p.y);
    });
    ctx.globalAlpha = 1;
  }

  function gameLoop() {
    if (state.gameOver) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  updateUI();
  showPhase('select');
  gameLoop();

  activeGames[gameId] = {
    cleanup: () => {
      state.gameOver = true;
    },
  };
}

// Pump Arena RPG
let pumpArenaMode = 'rpg';

function openPumpArena(mode = 'rpg') {
  pumpArenaMode = mode;

  // Open modal
  const modal = document.getElementById('modal-pumparena');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Initialize RPG mode
    if (window.PumpArenaRPG) {
      // Small delay to ensure modal is visible
      setTimeout(() => {
        window.PumpArenaRPG.init('arena-pumparena');
      }, 100);
    } else {
      console.warn('[PumpArena] RPG module not loaded, falling back to classic');
      startPumpArena('pumparena');
    }
  }
}

function closePumpArena() {
  const modal = document.getElementById('modal-pumparena');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Clean up RPG
    if (window.PumpArenaRPG) {
      window.PumpArenaRPG.close();
    }
  }
}

// ============================================
// MODULE EXPORT
// ============================================

/**
 * PumpArena engine module for GameEngines coordinator
 */
const PumpArena = {
  version: '1.0.0',
  gameId: 'pumparena',

  /**
   * Start the game (classic builder mode)
   * @param {string} gameId - The game ID
   */
  start(gameId) {
    startPumpArena(gameId);
  },

  /**
   * Stop the game
   * @param {string} gameId - The game ID
   */
  stop(gameId) {
    if (typeof activeGames !== 'undefined' && activeGames[gameId]) {
      activeGames[gameId].cleanup();
      delete activeGames[gameId];
    }
  },

  /**
   * Open PumpArena modal (RPG or classic mode)
   * @param {string} mode - 'rpg' or 'classic'
   */
  open(mode) {
    openPumpArena(mode);
  },

  /**
   * Close PumpArena modal
   */
  close() {
    closePumpArena();
  },
};

// Export
if (typeof window !== 'undefined') {
  window.ASDF = window.ASDF || {};
  window.ASDF.PumpArena = PumpArena;
  window.PumpArena = window.ASDF.PumpArena;
}
