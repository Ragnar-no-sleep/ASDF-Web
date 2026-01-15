// ============================================
// DEV TRACK CURRICULUM - "From Moldu to Architect"
// Philosophy: Don't trust. Verify. Build.
// Converted from React/TypeScript to Vanilla JS
// ============================================

/* eslint-disable no-unused-vars */

// ============================================
// LEVELS & PROGRESSION
// ============================================

var JOURNEY_LEVELS = [
  { name: 'Moldu', minXp: 0, icon: '&#127793;', color: '#666666' },
  { name: 'Apprentice', minXp: 500, icon: '&#128293;', color: '#ea4e33' },
  { name: 'Builder', minXp: 2000, icon: '&#9874;', color: '#f59e0b' },
  { name: 'Senior', minXp: 5000, icon: '&#9889;', color: '#8b5cf6' },
  { name: 'Architect', minXp: 10000, icon: '&#128081;', color: '#fbbf24' },
];

function getJourneyLevel(xp) {
  for (var i = JOURNEY_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= JOURNEY_LEVELS[i].minXp) return JOURNEY_LEVELS[i];
  }
  return JOURNEY_LEVELS[0];
}

function getLessonXpReward(lesson) {
  if (lesson.xpReward) return lesson.xpReward;
  return lesson.skills.reduce(function (sum, s) {
    return sum + s.xp;
  }, 0);
}

// ============================================
// MODULE 1: FOUNDATIONS
// "The Moldu's First Steps"
// ============================================

var MODULE_1_FOUNDATIONS = {
  id: 'foundations',
  number: 1,
  title: 'Foundations',
  subtitle: "The Moldu's First Steps",
  description:
    'Understand blockchain fundamentals, set up your environment, and make your first Solana transaction. No prior experience needed.',
  icon: '&#127793;',
  color: '#4ade80',
  difficulty: 'moldu',
  totalXp: 800,
  estimatedHours: 4,
  skillPacks: [
    // ========================================
    // SKILL PACK 1: Blockchain Fundamentals
    // ========================================
    {
      id: 'blockchain-fundamentals',
      name: 'Blockchain Fundamentals',
      description: 'Understand what makes blockchain special and why Solana is different.',
      icon: '&#128279;',
      color: '#22c55e',
      lessons: [
        {
          id: 'what-is-blockchain',
          title: 'What is Blockchain?',
          subtitle: 'The foundation of trustless systems',
          description: 'Learn the core concepts that power decentralized networks.',
          estimatedTime: 15,
          difficulty: 'moldu',
          skills: [
            {
              id: 'understand-distributed-ledger',
              name: 'Distributed Ledger',
              description: 'Understand how data is stored across multiple nodes',
              xp: 25,
            },
            {
              id: 'understand-consensus',
              name: 'Consensus Mechanisms',
              description: 'How networks agree on the truth',
              xp: 25,
            },
            {
              id: 'understand-immutability',
              name: 'Immutability',
              description: 'Why blockchain data cannot be changed',
              xp: 25,
            },
          ],
          content: [
            {
              type: 'theory',
              content:
                '# What is Blockchain?\n\n## Don\'t Trust. Verify.\n\nImagine a world where you don\'t need to trust banks, governments, or corporations to verify that you own something. That\'s the promise of blockchain.\n\n### The Problem with Traditional Systems\n\nIn traditional systems, we rely on **trusted intermediaries**:\n- Banks verify your balance\n- Governments verify your identity\n- Companies verify your purchases\n\nBut what if these intermediaries:\n- Make mistakes?\n- Get hacked?\n- Act against your interests?\n\n### The Blockchain Solution\n\nA blockchain is a **distributed ledger** - a database that\'s:\n\n| Traditional Database | Blockchain |\n|---------------------|------------|\n| Stored in one place | Copied across thousands of computers |\n| Controlled by one entity | Controlled by no one (or everyone) |\n| Can be modified by admin | Immutable once written |\n| Trust the operator | Trust the math |\n\n> **This is fine.** &#128021;&#128293;\n>\n> Even if half the network burns down, your data survives.',
            },
            {
              type: 'theory',
              content:
                '### How Does It Work?\n\n1. **Transactions** are grouped into **blocks**\n2. Each block contains a **hash** of the previous block\n3. This creates a **chain** - hence "blockchain"\n4. Changing one block would break all subsequent hashes\n5. The network **rejects** invalid chains\n\n```\nBlock 1          Block 2          Block 3\n+-----------+    +-----------+    +-----------+\n| Hash: A1  |<---| Prev: A1  |<---| Prev: B2  |\n| Data: TX  |    | Hash: B2  |    | Hash: C3  |\n| Nonce: X  |    | Data: TX  |    | Data: TX  |\n+-----------+    +-----------+    +-----------+\n```\n\n### Consensus: How the Network Agrees\n\nDifferent blockchains use different methods to agree on the truth:\n\n- **Proof of Work (PoW)**: Miners solve puzzles (Bitcoin)\n- **Proof of Stake (PoS)**: Validators stake tokens (Ethereum 2.0)\n- **Proof of History (PoH)**: Cryptographic timestamps (Solana) &#9889;\n\n> Solana uses PoH + PoS for **sub-second finality** and **~400ms block times**.',
            },
            {
              type: 'quiz',
              id: 'quiz-blockchain-def',
              content: 'What is a blockchain?',
              options: [
                {
                  id: 'a',
                  text: 'A database controlled by one company',
                  explanation: "No - that's a traditional database. Blockchain is distributed.",
                },
                {
                  id: 'b',
                  text: 'A distributed ledger stored across many computers',
                  explanation:
                    'Correct! Blockchain is a distributed ledger with no single point of control.',
                },
                {
                  id: 'c',
                  text: 'A type of cryptocurrency',
                  explanation:
                    'Cryptocurrency runs ON blockchain, but blockchain is the underlying technology.',
                },
                {
                  id: 'd',
                  text: 'A new programming language',
                  explanation: 'No - blockchain is a data structure and network architecture.',
                },
              ],
              correctAnswer: 'b',
            },
            {
              type: 'quiz',
              id: 'quiz-immutability',
              content: 'Why is blockchain data considered "immutable"?',
              options: [
                {
                  id: 'a',
                  text: "Because it's encrypted",
                  explanation: 'Encryption protects data from being read, not from being changed.',
                },
                {
                  id: 'b',
                  text: 'Because changing one block breaks all subsequent block hashes',
                  explanation: 'Correct! The chain of hashes makes tampering detectable.',
                },
                {
                  id: 'c',
                  text: 'Because only admins can modify it',
                  explanation: 'There are no admins in a decentralized blockchain.',
                },
                {
                  id: 'd',
                  text: 'Because the data is backed up',
                  explanation:
                    'Backups can be changed. Immutability comes from cryptographic chaining.',
                },
              ],
              correctAnswer: 'b',
            },
          ],
        },
        {
          id: 'why-solana',
          title: 'Why Solana?',
          subtitle: 'Speed, scale, and the future',
          description: 'Understand what makes Solana unique among blockchains.',
          estimatedTime: 12,
          difficulty: 'moldu',
          skills: [
            {
              id: 'understand-poh',
              name: 'Proof of History',
              description: "Solana's secret weapon for speed",
              xp: 30,
            },
            {
              id: 'understand-solana-arch',
              name: 'Solana Architecture',
              description: 'How Solana achieves 65k TPS',
              xp: 30,
            },
          ],
          content: [
            {
              type: 'theory',
              content:
                "# Why Solana?\n\n## The Speed Problem\n\nMost blockchains face a trilemma:\n\n```\n      Security\n         /\\\n        /  \\\n       /    \\\n      /______\\\nDecentralization  Scalability\n```\n\n**Traditional blockchains** sacrifice scalability:\n- Bitcoin: ~7 TPS (transactions per second)\n- Ethereum: ~15-30 TPS\n\n**Solana's approach**: Solve the trilemma with innovation.\n\n### Proof of History (PoH) &#9200;\n\n> \"Time is the most decentralized resource we have.\"\n\nTraditional consensus:\n1. Validator receives transaction\n2. Validator asks other validators: \"What time did this happen?\"\n3. Everyone agrees on order\n4. **Slow!**\n\nSolana's PoH:\n1. Cryptographic timestamps are built into each block\n2. Validators can verify order **without communication**\n3. **Fast!**",
            },
            {
              type: 'theory',
              content:
                "### Solana's Key Innovations\n\n| Innovation | What It Does |\n|-----------|--------------|\n| **Proof of History** | Cryptographic clock for ordering |\n| **Tower BFT** | Optimized consensus using PoH |\n| **Turbine** | Block propagation protocol |\n| **Gulf Stream** | Mempool-less transaction forwarding |\n| **Sealevel** | Parallel smart contract runtime |\n| **Pipelining** | GPU-optimized transaction processing |\n| **Cloudbreak** | Horizontally-scaled accounts database |\n| **Archivers** | Distributed ledger storage |\n\n### The Numbers\n\n- **Block time**: ~400ms\n- **Finality**: ~400ms (vs 6 minutes for Bitcoin)\n- **Cost**: ~$0.00025 per transaction\n- **TPS**: 65,000+ theoretical (3,000-5,000 practical)\n\n> **This is fine.** Your transaction confirms before you can blink.",
            },
            {
              type: 'quiz',
              id: 'quiz-poh',
              content: 'What is Proof of History?',
              options: [
                {
                  id: 'a',
                  text: 'A record of all past transactions',
                  explanation: "That's the ledger itself, not PoH specifically.",
                },
                {
                  id: 'b',
                  text: 'A cryptographic way to prove the passage of time',
                  explanation:
                    'Correct! PoH creates verifiable timestamps without network communication.',
                },
                {
                  id: 'c',
                  text: 'A consensus mechanism like Proof of Work',
                  explanation:
                    "PoH is not a consensus mechanism - it works alongside Tower BFT consensus.",
                },
                {
                  id: 'd',
                  text: 'A way to store historical data',
                  explanation: "PoH is about time-ordering, not storage.",
                },
              ],
              correctAnswer: 'b',
            },
          ],
        },
      ],
      milestone: {
        id: 'blockchain-basics-complete',
        name: 'Blockchain Basics',
        description: 'You understand the fundamentals of blockchain and why Solana is special.',
        requiredXp: 135,
      },
    },

    // ========================================
    // SKILL PACK 2: Environment Setup
    // ========================================
    {
      id: 'environment-setup',
      name: 'Environment Setup',
      description: 'Get your development environment ready for Solana.',
      icon: '&#128736;',
      color: '#f59e0b',
      lessons: [
        {
          id: 'install-tools',
          title: 'Installing the Tools',
          subtitle: 'Your Solana toolkit',
          description: 'Install Node.js, Rust, Solana CLI, and Anchor.',
          estimatedTime: 20,
          difficulty: 'moldu',
          skills: [
            {
              id: 'install-nodejs',
              name: 'Node.js Setup',
              description: 'Install and configure Node.js',
              xp: 20,
            },
            {
              id: 'install-rust',
              name: 'Rust Setup',
              description: 'Install Rust toolchain',
              xp: 25,
            },
            {
              id: 'install-solana-cli',
              name: 'Solana CLI',
              description: 'Install and configure Solana CLI',
              xp: 30,
            },
            {
              id: 'install-anchor',
              name: 'Anchor Framework',
              description: 'Install Anchor for smart contracts',
              xp: 25,
            },
          ],
          prerequisites: ['what-is-blockchain'],
          content: [
            {
              type: 'theory',
              content:
                "# Installing the Tools\n\n## Your Solana Development Stack\n\nBefore we write any code, let's set up your environment. You'll need:\n\n| Tool | Purpose | Required For |\n|------|---------|------|\n| **Node.js** | JavaScript runtime | Frontend, scripts, testing |\n| **Rust** | Systems language | Writing Solana programs |\n| **Solana CLI** | Command-line tools | Deploying, testing, managing |\n| **Anchor** | Framework | Simplified program development |\n\n### Step 1: Install Node.js\n\n> Already have Node.js 18+? Skip to Step 2.\n\n**macOS/Linux:**\n```bash\n# Using nvm (recommended)\ncurl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash\nsource ~/.bashrc  # or ~/.zshrc\nnvm install 20\nnvm use 20\n```\n\n**Windows:**\nDownload from nodejs.org or use:\n```powershell\nwinget install OpenJS.NodeJS.LTS\n```\n\n**Verify:**\n```bash\nnode --version  # Should be v18+\nnpm --version   # Should be v9+\n```",
            },
            {
              type: 'theory',
              content:
                '### Step 2: Install Rust\n\nRust is required for writing Solana programs (smart contracts).\n\n**All platforms:**\n```bash\ncurl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh\nsource ~/.cargo/env\n```\n\n**Verify:**\n```bash\nrustc --version  # Should be 1.70+\ncargo --version\n```\n\n### Step 3: Install Solana CLI\n\n**macOS/Linux:**\n```bash\nsh -c "$(curl -sSfL https://release.solana.com/stable/install)"\nexport PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"\n```\n\n**Configure for Devnet:**\n```bash\nsolana config set --url devnet\nsolana config get\n```\n\n### Step 4: Install Anchor\n\nAnchor is like "Ruby on Rails" for Solana - it handles the boilerplate.\n\n```bash\n# Install Anchor Version Manager\ncargo install --git https://github.com/coral-xyz/anchor avm --locked\n\n# Install latest Anchor\navm install latest\navm use latest\n\n# Verify\nanchor --version  # Should be 0.29+\n```',
            },
            {
              type: 'challenge',
              id: 'challenge-verify-install',
              content: 'Verify your installation by running all version checks:',
              language: 'bash',
              solution:
                'node --version\nnpm --version\nrustc --version\ncargo --version\nsolana --version\nanchor --version\nsolana config get',
            },
          ],
        },
        {
          id: 'create-wallet',
          title: 'Creating Your First Wallet',
          subtitle: 'Your identity on Solana',
          description: 'Generate a keypair and understand public/private keys.',
          estimatedTime: 15,
          difficulty: 'moldu',
          skills: [
            {
              id: 'understand-keypairs',
              name: 'Keypairs',
              description: 'Understand public and private keys',
              xp: 30,
            },
            {
              id: 'create-keypair-cli',
              name: 'CLI Keypair',
              description: 'Create a keypair using Solana CLI',
              xp: 25,
            },
            {
              id: 'understand-security',
              name: 'Key Security',
              description: 'Best practices for securing your keys',
              xp: 25,
            },
          ],
          prerequisites: ['install-tools'],
          content: [
            {
              type: 'theory',
              content:
                '# Creating Your First Wallet\n\n## Keypairs: Your Digital Identity\n\nOn Solana, your identity is a **keypair**:\n\n| Component | What It Is | Who Sees It |\n|-----------|-----------|-------------|\n| **Public Key** | Your address (like an email) | Everyone |\n| **Private Key** | Your password (proves ownership) | **ONLY YOU** |\n\n```\nPublic Key:  7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\n             ^ Share freely - this is your "address"\n\nPrivate Key: [64 bytes of secret data]\n             ^ NEVER share - this proves you own the wallet\n```\n\n> **Critical**: If someone has your private key, they have your wallet. No recovery. No support ticket. It\'s gone.',
            },
            {
              type: 'theory',
              content:
                '### Creating a Keypair\n\n**Option 1: Solana CLI (for development)**\n\n```bash\n# Generate a new keypair\nsolana-keygen new --outfile ~/.config/solana/devnet-wallet.json\n\n# You\'ll see:\n# Generating a new keypair\n# Wrote new keypair to ~/.config/solana/devnet-wallet.json\n# pubkey: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\n#\n# Save this seed phrase: word1 word2 word3 ... word12\n```\n\n### Set as Default Wallet\n\n```bash\nsolana config set --keypair ~/.config/solana/devnet-wallet.json\n```\n\n### Check Your Address\n\n```bash\nsolana address\n# Output: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU\n```\n\n### Security Best Practices\n\n| Do | Don\'t |\n|----|-------|\n| &#10004; Use hardware wallets for real funds | &#10008; Store keys in plain text |\n| &#10004; Keep seed phrase offline | &#10008; Share seed phrase with anyone |\n| &#10004; Use separate wallets for dev/prod | &#10008; Use mainnet wallet for testing |',
            },
            {
              type: 'quiz',
              id: 'quiz-private-key',
              content: 'What should you NEVER do with your private key?',
              options: [
                {
                  id: 'a',
                  text: 'Store it securely offline',
                  explanation: 'This is actually what you SHOULD do!',
                },
                {
                  id: 'b',
                  text: 'Use it to sign transactions',
                  explanation: 'This is the purpose of a private key.',
                },
                {
                  id: 'c',
                  text: 'Share it to receive payments',
                  explanation:
                    'CORRECT! Never share your private key. Share your PUBLIC key to receive payments.',
                },
                {
                  id: 'd',
                  text: 'Back it up in multiple places',
                  explanation: 'Backing up is good practice.',
                },
              ],
              correctAnswer: 'c',
            },
          ],
        },
      ],
      milestone: {
        id: 'environment-ready',
        name: 'Environment Ready',
        description: 'Your Solana development environment is fully configured.',
        requiredXp: 180,
      },
    },

    // ========================================
    // SKILL PACK 3: First Transaction
    // ========================================
    {
      id: 'first-transaction',
      name: 'Your First Transaction',
      description: 'Get devnet SOL and send your first transaction.',
      icon: '&#9889;',
      color: '#8b5cf6',
      lessons: [
        {
          id: 'airdrop-sol',
          title: 'Getting Devnet SOL',
          subtitle: 'Free tokens for testing',
          description: 'Use the faucet to get SOL on devnet.',
          estimatedTime: 10,
          difficulty: 'moldu',
          skills: [
            {
              id: 'understand-devnet',
              name: 'Devnet vs Mainnet',
              description: 'Understand Solana networks',
              xp: 20,
            },
            {
              id: 'use-airdrop',
              name: 'Airdrop',
              description: 'Request free devnet SOL',
              xp: 25,
            },
            {
              id: 'check-balance',
              name: 'Check Balance',
              description: 'Query account balance',
              xp: 15,
            },
          ],
          prerequisites: ['create-wallet'],
          content: [
            {
              type: 'theory',
              content:
                '# Getting Devnet SOL\n\n## Solana Networks\n\nSolana has multiple networks for different purposes:\n\n| Network | Purpose | SOL Value | Speed |\n|---------|---------|-----------|-------|\n| **Mainnet-beta** | Production | Real $$ | Fast |\n| **Devnet** | Development | Free (fake) | Fast |\n| **Testnet** | Validator testing | Free (fake) | Variable |\n| **Localnet** | Local development | Free (fake) | Instant |\n\n> **This is fine.** &#128021;&#128293; Devnet SOL is free and unlimited. Break things!\n\n### Getting Free SOL\n\n**Method 1: CLI Airdrop**\n\n```bash\n# Request 2 SOL airdrop\nsolana airdrop 2\n\n# Check your balance\nsolana balance\n\n# Output: 2 SOL\n```\n\n**Method 2: Web Faucet**\n\nVisit faucet.solana.com and enter your address.',
            },
            {
              type: 'theory',
              content:
                "### Understanding Lamports\n\nSOL uses **lamports** as its smallest unit (like Bitcoin's satoshis):\n\n```\n1 SOL = 1,000,000,000 lamports (10^9)\n```\n\nWhy? Floating point math is imprecise. Integers are exact.\n\n```javascript\n// Bad: floating point errors\n0.1 + 0.2 === 0.3  // false! (0.30000000000000004)\n\n// Good: integer math\n100000000 + 200000000 === 300000000  // true!\n```\n\n> Always use lamports for calculations. Convert to SOL only for display.",
            },
            {
              type: 'quiz',
              id: 'quiz-lamports',
              content: 'How many lamports are in 1 SOL?',
              options: [
                {
                  id: 'a',
                  text: '1,000 (one thousand)',
                  explanation: 'Too few! That would make micro-transactions impossible.',
                },
                {
                  id: 'b',
                  text: '1,000,000 (one million)',
                  explanation: 'Close, but not quite.',
                },
                {
                  id: 'c',
                  text: '1,000,000,000 (one billion)',
                  explanation: 'Correct! 1 SOL = 10^9 lamports.',
                },
                { id: 'd', text: '100 (one hundred)', explanation: 'Way too few.' },
              ],
              correctAnswer: 'c',
            },
          ],
        },
        {
          id: 'send-transaction',
          title: 'Sending Your First Transaction',
          subtitle: 'Move SOL like a pro',
          description: 'Send SOL to another address and understand transaction structure.',
          estimatedTime: 20,
          difficulty: 'moldu',
          skills: [
            {
              id: 'understand-tx-structure',
              name: 'Transaction Structure',
              description: 'Understand how transactions work',
              xp: 35,
            },
            {
              id: 'send-sol',
              name: 'Send SOL',
              description: 'Transfer SOL between wallets',
              xp: 40,
            },
            {
              id: 'verify-explorer',
              name: 'Explorer Verification',
              description: 'Verify transactions on explorer',
              xp: 20,
            },
          ],
          prerequisites: ['airdrop-sol'],
          content: [
            {
              type: 'theory',
              content:
                '# Sending Your First Transaction\n\n## Transaction Anatomy\n\nEvery Solana transaction has these components:\n\n```\n+------------------------------------------+\n|              TRANSACTION                  |\n+------------------------------------------+\n|  Signatures: [sig1, sig2, ...]           | <- Proves authorization\n|  Message:                                 |\n|    +-- Header                            | <- Metadata\n|    +-- Account Keys: [pubkey1, ...]      | <- Who\'s involved\n|    +-- Recent Blockhash                  | <- Prevents replay\n|    +-- Instructions: [                   | <- What to do\n|         {                                |\n|           programId: SystemProgram       | <- Which program\n|           keys: [from, to]               | <- Accounts needed\n|           data: [transfer, amount]       | <- What action\n|         }                                |\n|       ]                                  |\n+------------------------------------------+\n```\n\n### Key Concepts\n\n| Concept | Description |\n|---------|-------------|\n| **Instruction** | A single operation (transfer, mint, etc.) |\n| **Program** | Smart contract that executes instructions |\n| **Account** | Storage unit on Solana |\n| **Blockhash** | Recent hash to prevent replay attacks |\n| **Signature** | Cryptographic proof of authorization |',
            },
            {
              type: 'theory',
              content:
                '### Sending SOL with CLI\n\n```bash\n# Send 0.5 SOL to another address\nsolana transfer <RECIPIENT_ADDRESS> 0.5\n\n# With confirmation level\nsolana transfer <RECIPIENT_ADDRESS> 0.5 --commitment confirmed\n\n# Output:\n# Signature: 5UfgJ...xyz\n```\n\n### Verifying on Explorer\n\nAfter sending, always verify:\n\n1. Go to explorer.solana.com\n2. Switch to **Devnet** (top right)\n3. Paste your signature\n4. Check:\n   - &#10004; Status: Success\n   - &#10004; Fee: ~0.000005 SOL\n   - &#10004; From/To addresses match\n   - &#10004; Amount correct\n\n> **Don\'t trust. Verify.** Always check the explorer.',
            },
            {
              type: 'quiz',
              id: 'quiz-replay',
              content: 'What prevents someone from replaying your transaction?',
              options: [
                {
                  id: 'a',
                  text: 'The signature',
                  explanation: "Signatures prove authorization but don't prevent replay.",
                },
                {
                  id: 'b',
                  text: 'The recent blockhash',
                  explanation:
                    'Correct! Blockhashes expire after ~2 minutes, preventing replay attacks.',
                },
                {
                  id: 'c',
                  text: 'The amount being sent',
                  explanation: "Amount doesn't affect replay protection.",
                },
                {
                  id: 'd',
                  text: 'The recipient address',
                  explanation: "Address doesn't prevent replay.",
                },
              ],
              correctAnswer: 'b',
            },
          ],
        },
      ],
      milestone: {
        id: 'first-tx-complete',
        name: 'First Transaction',
        description: "You've sent your first Solana transaction!",
        requiredXp: 155,
      },
    },
  ],
};

// ============================================
// FULL DEV CURRICULUM
// ============================================

var DEV_CURRICULUM = [
  MODULE_1_FOUNDATIONS,
  // MODULE_2_CORE_CONCEPTS - Coming soon
  // MODULE_3_ANCHOR_PROGRAMS - Coming soon
  // MODULE_4_ADVANCED_PATTERNS - Coming soon
  // MODULE_5_PRODUCTION_READY - Coming soon
];

// Helper to get total XP for a module
function getModuleTotalXp(module) {
  return module.skillPacks.reduce(function (total, pack) {
    return (
      total +
      pack.lessons.reduce(function (lessonTotal, lesson) {
        return (
          lessonTotal +
          lesson.skills.reduce(function (skillTotal, skill) {
            return skillTotal + skill.xp;
          }, 0)
        );
      }, 0)
    );
  }, 0);
}

// Helper to get all skills in a module
function getModuleSkills(module) {
  var skills = [];
  module.skillPacks.forEach(function (pack) {
    pack.lessons.forEach(function (lesson) {
      lesson.skills.forEach(function (skill) {
        skills.push(skill);
      });
    });
  });
  return skills;
}
