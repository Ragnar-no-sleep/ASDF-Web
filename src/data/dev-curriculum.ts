// ============================================
// DEV TRACK CURRICULUM - "From Moldu to Architect"
// Philosophy: Don't trust. Verify. Build.
// ============================================

// ============================================
// TYPES
// ============================================

export type SkillStatus = 'locked' | 'available' | 'in_progress' | 'completed'
export type ContentType = 'theory' | 'code' | 'quiz' | 'challenge' | 'diagram' | 'video'
export type DifficultyLevel = 'moldu' | 'apprentice' | 'builder' | 'senior' | 'architect'

export interface MicroSkill {
  id: string
  name: string
  description: string
  xp: number
}

export interface ContentBlock {
  type: ContentType
  content: string // Markdown for theory, code string for code, etc.
  language?: string // For code blocks
  solution?: string // For challenges
  options?: QuizOption[] // For quizzes
  correctAnswer?: string | string[] // For quizzes
  diagramData?: DiagramData // For diagrams
}

export interface QuizOption {
  id: string
  text: string
  explanation?: string
}

export interface DiagramData {
  type: 'flow' | 'architecture' | 'sequence' | 'comparison'
  nodes: DiagramNode[]
  edges?: DiagramEdge[]
}

export interface DiagramNode {
  id: string
  label: string
  type?: 'start' | 'end' | 'process' | 'decision' | 'data'
  position?: { x: number; y: number }
}

export interface DiagramEdge {
  from: string
  to: string
  label?: string
}

export interface Lesson {
  id: string
  title: string
  subtitle: string
  description: string
  estimatedTime: number // minutes
  difficulty: DifficultyLevel
  skills: MicroSkill[]
  content: ContentBlock[]
  prerequisites?: string[] // lesson IDs
  xpReward?: number // Optional: Total XP (calculated from skills if not provided)
}

// Helper: Calculate XP reward from skills
export function getLessonXpReward(lesson: Lesson): number {
  return lesson.xpReward ?? lesson.skills.reduce((sum, s) => sum + s.xp, 0)
}

export interface SkillPack {
  id: string
  name: string
  description: string
  icon: string
  color: string
  lessons: Lesson[]
  milestone?: Milestone
}

export interface Milestone {
  id: string
  name: string
  description: string
  sbtMetadata: {
    name: string
    symbol: string
    description: string
    image: string // URI
    attributes: { trait_type: string; value: string }[]
  }
  requiredXp: number
}

export interface Module {
  id: string
  number: number
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  difficulty: DifficultyLevel
  skillPacks: SkillPack[]
  totalXp: number
  estimatedHours: number
}

// ============================================
// LEVELS & PROGRESSION
// ============================================

export const LEVELS: { name: string; minXp: number; icon: string; color: string }[] = [
  { name: 'Moldu', minXp: 0, icon: '🌱', color: '#666666' },
  { name: 'Apprentice', minXp: 500, icon: '🔥', color: '#ea4e33' },
  { name: 'Builder', minXp: 2000, icon: '⚒️', color: '#f59e0b' },
  { name: 'Senior', minXp: 5000, icon: '⚡', color: '#8b5cf6' },
  { name: 'Architect', minXp: 10000, icon: '👑', color: '#fbbf24' },
]

export const getLevel = (xp: number) => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i]
  }
  return LEVELS[0]
}

// ============================================
// MODULE 1: FOUNDATIONS
// "The Moldu's First Steps"
// ============================================

export const MODULE_1_FOUNDATIONS: Module = {
  id: 'foundations',
  number: 1,
  title: 'Foundations',
  subtitle: "The Moldu's First Steps",
  description: 'Understand blockchain fundamentals, set up your environment, and make your first Solana transaction. No prior experience needed.',
  icon: '🌱',
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
      icon: '🔗',
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
            { id: 'understand-distributed-ledger', name: 'Distributed Ledger', description: 'Understand how data is stored across multiple nodes', xp: 25 },
            { id: 'understand-consensus', name: 'Consensus Mechanisms', description: 'How networks agree on the truth', xp: 25 },
            { id: 'understand-immutability', name: 'Immutability', description: 'Why blockchain data cannot be changed', xp: 25 },
          ],
          content: [
            {
              type: 'theory',
              content: `# What is Blockchain?

## Don't Trust. Verify.

Imagine a world where you don't need to trust banks, governments, or corporations to verify that you own something. That's the promise of blockchain.

### The Problem with Traditional Systems

In traditional systems, we rely on **trusted intermediaries**:
- Banks verify your balance
- Governments verify your identity
- Companies verify your purchases

But what if these intermediaries:
- Make mistakes?
- Get hacked?
- Act against your interests?

### The Blockchain Solution

A blockchain is a **distributed ledger** - a database that's:

| Traditional Database | Blockchain |
|---------------------|------------|
| Stored in one place | Copied across thousands of computers |
| Controlled by one entity | Controlled by no one (or everyone) |
| Can be modified by admin | Immutable once written |
| Trust the operator | Trust the math |

> **This is fine.** 🐕‍🦺🔥
>
> Even if half the network burns down, your data survives.`,
            },
            {
              type: 'diagram',
              content: 'Blockchain vs Traditional Database',
              diagramData: {
                type: 'comparison',
                nodes: [
                  { id: 'trad-1', label: 'Central Server', type: 'data' },
                  { id: 'trad-2', label: 'Single Point of Failure', type: 'decision' },
                  { id: 'bc-1', label: 'Node A', type: 'data' },
                  { id: 'bc-2', label: 'Node B', type: 'data' },
                  { id: 'bc-3', label: 'Node C', type: 'data' },
                  { id: 'bc-4', label: 'Distributed & Redundant', type: 'process' },
                ],
                edges: [
                  { from: 'trad-1', to: 'trad-2', label: 'If fails...' },
                  { from: 'bc-1', to: 'bc-4' },
                  { from: 'bc-2', to: 'bc-4' },
                  { from: 'bc-3', to: 'bc-4' },
                ],
              },
            },
            {
              type: 'theory',
              content: `### How Does It Work?

1. **Transactions** are grouped into **blocks**
2. Each block contains a **hash** of the previous block
3. This creates a **chain** - hence "blockchain"
4. Changing one block would break all subsequent hashes
5. The network **rejects** invalid chains

\`\`\`
Block 1          Block 2          Block 3
┌──────────┐    ┌──────────┐    ┌──────────┐
│ Hash: A1 │◄───│ Prev: A1 │◄───│ Prev: B2 │
│ Data: TX │    │ Hash: B2 │    │ Hash: C3 │
│ Nonce: X │    │ Data: TX │    │ Data: TX │
└──────────┘    └──────────┘    └──────────┘
\`\`\`

### Consensus: How the Network Agrees

Different blockchains use different methods to agree on the truth:

- **Proof of Work (PoW)**: Miners solve puzzles (Bitcoin)
- **Proof of Stake (PoS)**: Validators stake tokens (Ethereum 2.0)
- **Proof of History (PoH)**: Cryptographic timestamps (Solana) ⚡

> Solana uses PoH + PoS for **sub-second finality** and **~400ms block times**.`,
            },
            {
              type: 'quiz',
              content: 'Knowledge Check',
              options: [
                { id: 'a', text: 'A database controlled by one company', explanation: 'No - that\'s a traditional database. Blockchain is distributed.' },
                { id: 'b', text: 'A distributed ledger stored across many computers', explanation: 'Correct! Blockchain is a distributed ledger with no single point of control.' },
                { id: 'c', text: 'A type of cryptocurrency', explanation: 'Cryptocurrency runs ON blockchain, but blockchain is the underlying technology.' },
                { id: 'd', text: 'A new programming language', explanation: 'No - blockchain is a data structure and network architecture.' },
              ],
              correctAnswer: 'b',
            },
            {
              type: 'quiz',
              content: 'Why is blockchain data considered "immutable"?',
              options: [
                { id: 'a', text: 'Because it\'s encrypted', explanation: 'Encryption protects data from being read, not from being changed.' },
                { id: 'b', text: 'Because changing one block breaks all subsequent block hashes', explanation: 'Correct! The chain of hashes makes tampering detectable.' },
                { id: 'c', text: 'Because only admins can modify it', explanation: 'There are no admins in a decentralized blockchain.' },
                { id: 'd', text: 'Because the data is backed up', explanation: 'Backups can be changed. Immutability comes from cryptographic chaining.' },
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
            { id: 'understand-poh', name: 'Proof of History', description: 'Solana\'s secret weapon for speed', xp: 30 },
            { id: 'understand-solana-arch', name: 'Solana Architecture', description: 'How Solana achieves 65k TPS', xp: 30 },
          ],
          content: [
            {
              type: 'theory',
              content: `# Why Solana?

## The Speed Problem

Most blockchains face a trilemma:

\`\`\`
      Security
         /\\
        /  \\
       /    \\
      /______\\
Decentralization  Scalability
\`\`\`

**Traditional blockchains** sacrifice scalability:
- Bitcoin: ~7 TPS (transactions per second)
- Ethereum: ~15-30 TPS

**Solana's approach**: Solve the trilemma with innovation.

### Proof of History (PoH) ⏱️

> "Time is the most decentralized resource we have."

Traditional consensus:
1. Validator receives transaction
2. Validator asks other validators: "What time did this happen?"
3. Everyone agrees on order
4. **Slow!**

Solana's PoH:
1. Cryptographic timestamps are built into each block
2. Validators can verify order **without communication**
3. **Fast!**

\`\`\`typescript
// Simplified PoH concept
const hash1 = sha256(previousHash + data1)
const hash2 = sha256(hash1 + data2)  // Proves data2 came after data1
const hash3 = sha256(hash2 + data3)  // Proves data3 came after data2
// This creates a verifiable sequence of time
\`\`\``,
            },
            {
              type: 'diagram',
              content: 'Solana vs Other Chains',
              diagramData: {
                type: 'comparison',
                nodes: [
                  { id: 'btc', label: 'Bitcoin: 7 TPS' },
                  { id: 'eth', label: 'Ethereum: 30 TPS' },
                  { id: 'sol', label: 'Solana: 65,000 TPS' },
                  { id: 'btc-time', label: '~10 min finality' },
                  { id: 'eth-time', label: '~12 sec finality' },
                  { id: 'sol-time', label: '~400ms finality' },
                ],
                edges: [],
              },
            },
            {
              type: 'theory',
              content: `### Solana's Key Innovations

| Innovation | What It Does |
|-----------|--------------|
| **Proof of History** | Cryptographic clock for ordering |
| **Tower BFT** | Optimized consensus using PoH |
| **Turbine** | Block propagation protocol |
| **Gulf Stream** | Mempool-less transaction forwarding |
| **Sealevel** | Parallel smart contract runtime |
| **Pipelining** | GPU-optimized transaction processing |
| **Cloudbreak** | Horizontally-scaled accounts database |
| **Archivers** | Distributed ledger storage |

### The Numbers

- **Block time**: ~400ms
- **Finality**: ~400ms (vs 6 minutes for Bitcoin)
- **Cost**: ~$0.00025 per transaction
- **TPS**: 65,000+ theoretical (3,000-5,000 practical)

> **This is fine.** Your transaction confirms before you can blink.`,
            },
            {
              type: 'quiz',
              content: 'What is Proof of History?',
              options: [
                { id: 'a', text: 'A record of all past transactions', explanation: 'That\'s the ledger itself, not PoH specifically.' },
                { id: 'b', text: 'A cryptographic way to prove the passage of time', explanation: 'Correct! PoH creates verifiable timestamps without network communication.' },
                { id: 'c', text: 'A consensus mechanism like Proof of Work', explanation: 'PoH is not a consensus mechanism - it works alongside Tower BFT consensus.' },
                { id: 'd', text: 'A way to store historical data', explanation: 'PoH is about time-ordering, not storage.' },
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
        sbtMetadata: {
          name: 'ASDF Blockchain Basics SBT',
          symbol: 'ASDF-BB',
          description: 'Proof of completing Blockchain Fundamentals in ASDF Journey',
          image: 'https://asdf.dev/sbt/blockchain-basics.png',
          attributes: [
            { trait_type: 'Track', value: 'Developer' },
            { trait_type: 'Module', value: 'Foundations' },
            { trait_type: 'Skill Pack', value: 'Blockchain Fundamentals' },
            { trait_type: 'XP Earned', value: '135' },
          ],
        },
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
      icon: '🛠️',
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
            { id: 'install-nodejs', name: 'Node.js Setup', description: 'Install and configure Node.js', xp: 20 },
            { id: 'install-rust', name: 'Rust Setup', description: 'Install Rust toolchain', xp: 25 },
            { id: 'install-solana-cli', name: 'Solana CLI', description: 'Install and configure Solana CLI', xp: 30 },
            { id: 'install-anchor', name: 'Anchor Framework', description: 'Install Anchor for smart contracts', xp: 25 },
          ],
          prerequisites: ['what-is-blockchain'],
          content: [
            {
              type: 'theory',
              content: `# Installing the Tools

## Your Solana Development Stack

Before we write any code, let's set up your environment. You'll need:

| Tool | Purpose | Required For |
|------|---------|--------------|
| **Node.js** | JavaScript runtime | Frontend, scripts, testing |
| **Rust** | Systems language | Writing Solana programs |
| **Solana CLI** | Command-line tools | Deploying, testing, managing |
| **Anchor** | Framework | Simplified program development |

### Step 1: Install Node.js

> Already have Node.js 18+? Skip to Step 2.

**macOS/Linux:**
\`\`\`bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install 20
nvm use 20
\`\`\`

**Windows:**
Download from [nodejs.org](https://nodejs.org) or use:
\`\`\`powershell
winget install OpenJS.NodeJS.LTS
\`\`\`

**Verify:**
\`\`\`bash
node --version  # Should be v18+
npm --version   # Should be v9+
\`\`\``,
            },
            {
              type: 'code',
              content: '# Verify your Node.js installation\nnode --version\nnpm --version',
              language: 'bash',
            },
            {
              type: 'theory',
              content: `### Step 2: Install Rust

Rust is required for writing Solana programs (smart contracts).

**All platforms:**
\`\`\`bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
\`\`\`

**Verify:**
\`\`\`bash
rustc --version  # Should be 1.70+
cargo --version
\`\`\`

### Step 3: Install Solana CLI

**macOS/Linux:**
\`\`\`bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
\`\`\`

**Windows:**
\`\`\`powershell
# Download and run the installer
curl https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe -o solana-install-init.exe
./solana-install-init.exe stable
\`\`\`

**Configure for Devnet:**
\`\`\`bash
solana config set --url devnet
solana config get
\`\`\``,
            },
            {
              type: 'code',
              content: '# Configure Solana CLI for Devnet\nsolana config set --url devnet\n\n# Verify configuration\nsolana config get\n\n# Expected output:\n# RPC URL: https://api.devnet.solana.com\n# WebSocket URL: wss://api.devnet.solana.com',
              language: 'bash',
            },
            {
              type: 'theory',
              content: `### Step 4: Install Anchor

Anchor is like "Ruby on Rails" for Solana - it handles the boilerplate.

\`\`\`bash
# Install Anchor Version Manager
cargo install --git https://github.com/coral-xyz/anchor avm --locked

# Install latest Anchor
avm install latest
avm use latest

# Verify
anchor --version  # Should be 0.29+
\`\`\`

### Pro Tip: Use Helius RPC

For better performance, use a Helius RPC endpoint instead of the public one:

\`\`\`bash
# Get your free API key at helius.dev
solana config set --url https://devnet.helius-rpc.com/?api-key=YOUR_KEY
\`\`\`

> **This is fine.** 🐕‍🦺🔥 Helius RPCs are 10x faster than public endpoints.`,
            },
            {
              type: 'challenge',
              content: 'Verify your installation by running all version checks:',
              language: 'bash',
              solution: `node --version
npm --version
rustc --version
cargo --version
solana --version
anchor --version
solana config get`,
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
            { id: 'understand-keypairs', name: 'Keypairs', description: 'Understand public and private keys', xp: 30 },
            { id: 'create-keypair-cli', name: 'CLI Keypair', description: 'Create a keypair using Solana CLI', xp: 25 },
            { id: 'understand-security', name: 'Key Security', description: 'Best practices for securing your keys', xp: 25 },
          ],
          prerequisites: ['install-tools'],
          content: [
            {
              type: 'theory',
              content: `# Creating Your First Wallet

## Keypairs: Your Digital Identity

On Solana, your identity is a **keypair**:

| Component | What It Is | Who Sees It |
|-----------|-----------|-------------|
| **Public Key** | Your address (like an email) | Everyone |
| **Private Key** | Your password (proves ownership) | **ONLY YOU** |

\`\`\`
Public Key:  7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
             ↑ Share freely - this is your "address"

Private Key: [64 bytes of secret data]
             ↑ NEVER share - this proves you own the wallet
\`\`\`

### How It Works (Simplified)

\`\`\`
Private Key ──[Math Magic]──► Public Key ──[Hash]──► Address
     │                              │
     │                              └── Anyone can see
     └── Only you know
\`\`\`

> **Critical**: If someone has your private key, they have your wallet. No recovery. No support ticket. It's gone.`,
            },
            {
              type: 'diagram',
              content: 'Public Key Cryptography',
              diagramData: {
                type: 'flow',
                nodes: [
                  { id: 'priv', label: 'Private Key', type: 'start' },
                  { id: 'math', label: 'Elliptic Curve Math', type: 'process' },
                  { id: 'pub', label: 'Public Key', type: 'data' },
                  { id: 'sign', label: 'Sign Transaction', type: 'process' },
                  { id: 'verify', label: 'Network Verifies', type: 'end' },
                ],
                edges: [
                  { from: 'priv', to: 'math', label: 'generates' },
                  { from: 'math', to: 'pub' },
                  { from: 'priv', to: 'sign', label: 'signs with' },
                  { from: 'pub', to: 'verify', label: 'verified by' },
                ],
              },
            },
            {
              type: 'theory',
              content: `### Creating a Keypair

**Option 1: Solana CLI (for development)**

\`\`\`bash
# Generate a new keypair
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json

# You'll see:
# Generating a new keypair
# Wrote new keypair to ~/.config/solana/devnet-wallet.json
# pubkey: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
#
# Save this seed phrase: word1 word2 word3 ... word12
\`\`\`

**Option 2: From seed phrase (recovery)**

\`\`\`bash
solana-keygen recover -o ~/.config/solana/recovered-wallet.json
# Enter your 12 or 24 word seed phrase
\`\`\`

### Set as Default Wallet

\`\`\`bash
solana config set --keypair ~/.config/solana/devnet-wallet.json
\`\`\`

### Check Your Address

\`\`\`bash
solana address
# Output: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
\`\`\``,
            },
            {
              type: 'code',
              content: `// Understanding keypairs in TypeScript
import { Keypair } from '@solana/web3.js';

// Generate a new random keypair
const keypair = Keypair.generate();

console.log('Public Key:', keypair.publicKey.toBase58());
console.log('Secret Key:', keypair.secretKey); // Uint8Array of 64 bytes

// NEVER log or expose the secret key in production!`,
              language: 'typescript',
            },
            {
              type: 'theory',
              content: `### Security Best Practices

| Do | Don't |
|----|-------|
| ✅ Use hardware wallets for real funds | ❌ Store keys in plain text |
| ✅ Keep seed phrase offline | ❌ Share seed phrase with anyone |
| ✅ Use separate wallets for dev/prod | ❌ Use mainnet wallet for testing |
| ✅ Back up to multiple secure locations | ❌ Take screenshots of seed phrase |

> **Don't trust. Verify.**
>
> Your devnet wallet is for **testing only**. Never put real SOL in it.`,
            },
            {
              type: 'challenge',
              content: 'Create a devnet wallet and display your public address:',
              language: 'bash',
              solution: `# Create new keypair for devnet
solana-keygen new --outfile ~/.config/solana/devnet-wallet.json --no-bip39-passphrase

# Set as default
solana config set --keypair ~/.config/solana/devnet-wallet.json

# Display your address
solana address`,
            },
            {
              type: 'quiz',
              content: 'What should you NEVER do with your private key?',
              options: [
                { id: 'a', text: 'Store it securely offline', explanation: 'This is actually what you SHOULD do!' },
                { id: 'b', text: 'Use it to sign transactions', explanation: 'This is the purpose of a private key.' },
                { id: 'c', text: 'Share it to receive payments', explanation: 'CORRECT! Never share your private key. Share your PUBLIC key to receive payments.' },
                { id: 'd', text: 'Back it up in multiple places', explanation: 'Backing up is good practice.' },
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
        sbtMetadata: {
          name: 'ASDF Environment Setup SBT',
          symbol: 'ASDF-ENV',
          description: 'Proof of completing Environment Setup in ASDF Journey',
          image: 'https://asdf.dev/sbt/environment-setup.png',
          attributes: [
            { trait_type: 'Track', value: 'Developer' },
            { trait_type: 'Module', value: 'Foundations' },
            { trait_type: 'Skill Pack', value: 'Environment Setup' },
            { trait_type: 'XP Earned', value: '180' },
          ],
        },
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
      icon: '⚡',
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
            { id: 'understand-devnet', name: 'Devnet vs Mainnet', description: 'Understand Solana networks', xp: 20 },
            { id: 'use-airdrop', name: 'Airdrop', description: 'Request free devnet SOL', xp: 25 },
            { id: 'check-balance', name: 'Check Balance', description: 'Query account balance', xp: 15 },
          ],
          prerequisites: ['create-wallet'],
          content: [
            {
              type: 'theory',
              content: `# Getting Devnet SOL

## Solana Networks

Solana has multiple networks for different purposes:

| Network | Purpose | SOL Value | Speed |
|---------|---------|-----------|-------|
| **Mainnet-beta** | Production | Real $$ | Fast |
| **Devnet** | Development | Free (fake) | Fast |
| **Testnet** | Validator testing | Free (fake) | Variable |
| **Localnet** | Local development | Free (fake) | Instant |

> **This is fine.** 🐕‍🦺🔥 Devnet SOL is free and unlimited. Break things!

### Getting Free SOL

**Method 1: CLI Airdrop**

\`\`\`bash
# Request 2 SOL airdrop
solana airdrop 2

# Check your balance
solana balance

# Output: 2 SOL
\`\`\`

**Method 2: Web Faucet**

Visit [faucet.solana.com](https://faucet.solana.com) and enter your address.

**Method 3: Helius Faucet (Recommended)**

\`\`\`bash
# More reliable, higher limits
curl -X POST https://api.helius.xyz/v0/airdrop?api-key=YOUR_KEY \\
  -H "Content-Type: application/json" \\
  -d '{"publicKey": "YOUR_ADDRESS", "amount": 1000000000}'
\`\`\``,
            },
            {
              type: 'code',
              content: `// Requesting airdrop with @solana/web3.js
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Connect to devnet (or use Helius RPC)
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Your wallet address
const publicKey = new PublicKey('YOUR_ADDRESS_HERE');

// Request 1 SOL airdrop
const signature = await connection.requestAirdrop(
  publicKey,
  1 * LAMPORTS_PER_SOL  // 1 SOL = 1,000,000,000 lamports
);

// Wait for confirmation
await connection.confirmTransaction(signature);

// Check balance
const balance = await connection.getBalance(publicKey);
console.log(\`Balance: \${balance / LAMPORTS_PER_SOL} SOL\`);`,
              language: 'typescript',
            },
            {
              type: 'theory',
              content: `### Understanding Lamports

SOL uses **lamports** as its smallest unit (like Bitcoin's satoshis):

\`\`\`
1 SOL = 1,000,000,000 lamports (10^9)
\`\`\`

Why? Floating point math is imprecise. Integers are exact.

\`\`\`typescript
// Bad: floating point errors
0.1 + 0.2 === 0.3  // false! (0.30000000000000004)

// Good: integer math
100_000_000 + 200_000_000 === 300_000_000  // true!
\`\`\`

> Always use lamports for calculations. Convert to SOL only for display.`,
            },
            {
              type: 'challenge',
              content: 'Get devnet SOL and check your balance:',
              language: 'bash',
              solution: `# Make sure you're on devnet
solana config set --url devnet

# Request airdrop
solana airdrop 2

# Check balance
solana balance

# View in explorer
echo "https://explorer.solana.com/address/$(solana address)?cluster=devnet"`,
            },
            {
              type: 'quiz',
              content: 'How many lamports are in 1 SOL?',
              options: [
                { id: 'a', text: '1,000 (one thousand)', explanation: 'Too few! That would make micro-transactions impossible.' },
                { id: 'b', text: '1,000,000 (one million)', explanation: 'Close, but not quite.' },
                { id: 'c', text: '1,000,000,000 (one billion)', explanation: 'Correct! 1 SOL = 10^9 lamports.' },
                { id: 'd', text: '100 (one hundred)', explanation: 'Way too few for precise calculations.' },
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
            { id: 'understand-tx-structure', name: 'Transaction Structure', description: 'Understand how transactions work', xp: 35 },
            { id: 'send-sol', name: 'Send SOL', description: 'Transfer SOL between wallets', xp: 40 },
            { id: 'verify-explorer', name: 'Explorer Verification', description: 'Verify transactions on explorer', xp: 20 },
          ],
          prerequisites: ['airdrop-sol'],
          content: [
            {
              type: 'theory',
              content: `# Sending Your First Transaction

## Transaction Anatomy

Every Solana transaction has these components:

\`\`\`
┌─────────────────────────────────────────┐
│              TRANSACTION                 │
├─────────────────────────────────────────┤
│  Signatures: [sig1, sig2, ...]          │ ← Proves authorization
│  Message:                                │
│    ├─ Header                            │ ← Metadata
│    ├─ Account Keys: [pubkey1, ...]      │ ← Who's involved
│    ├─ Recent Blockhash                  │ ← Prevents replay
│    └─ Instructions: [                   │ ← What to do
│         {                               │
│           programId: SystemProgram      │ ← Which program
│           keys: [from, to]              │ ← Accounts needed
│           data: [transfer, amount]      │ ← What action
│         }                               │
│       ]                                 │
└─────────────────────────────────────────┘
\`\`\`

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Instruction** | A single operation (transfer, mint, etc.) |
| **Program** | Smart contract that executes instructions |
| **Account** | Storage unit on Solana |
| **Blockhash** | Recent hash to prevent replay attacks |
| **Signature** | Cryptographic proof of authorization |`,
            },
            {
              type: 'diagram',
              content: 'Transaction Flow',
              diagramData: {
                type: 'flow',
                nodes: [
                  { id: 'create', label: 'Create Transaction', type: 'start' },
                  { id: 'sign', label: 'Sign with Private Key', type: 'process' },
                  { id: 'send', label: 'Send to RPC', type: 'process' },
                  { id: 'validate', label: 'Validators Process', type: 'process' },
                  { id: 'confirm', label: 'Confirmed!', type: 'end' },
                ],
                edges: [
                  { from: 'create', to: 'sign' },
                  { from: 'sign', to: 'send' },
                  { from: 'send', to: 'validate' },
                  { from: 'validate', to: 'confirm' },
                ],
              },
            },
            {
              type: 'theory',
              content: `### Sending SOL with CLI

\`\`\`bash
# Send 0.5 SOL to another address
solana transfer <RECIPIENT_ADDRESS> 0.5

# With confirmation level
solana transfer <RECIPIENT_ADDRESS> 0.5 --commitment confirmed

# Output:
# Signature: 5UfgJ...xyz
\`\`\`

### Sending SOL with TypeScript

\`\`\`typescript
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

// Connect to devnet (use Helius for better reliability)
const connection = new Connection(
  'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',
  'confirmed'
);

// Load your keypair (DON'T do this with real keys!)
const sender = Keypair.fromSecretKey(/* your secret key array */);
const recipient = new PublicKey('RECIPIENT_ADDRESS');

// Create transfer instruction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient,
    lamports: 0.5 * LAMPORTS_PER_SOL, // 0.5 SOL
  })
);

// Send and confirm
const signature = await sendAndConfirmTransaction(
  connection,
  transaction,
  [sender] // Signers
);

console.log('Transaction confirmed:', signature);
console.log(\`Explorer: https://explorer.solana.com/tx/\${signature}?cluster=devnet\`);
\`\`\``,
            },
            {
              type: 'code',
              content: `// Complete example: Transfer SOL
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';

async function transferSol() {
  // 1. Setup connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // 2. Create sender keypair (for demo - use proper key management in prod!)
  const sender = Keypair.generate();

  // 3. Airdrop some SOL to sender
  const airdropSig = await connection.requestAirdrop(sender.publicKey, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(airdropSig);

  // 4. Create recipient (another random address for demo)
  const recipient = Keypair.generate().publicKey;

  // 5. Build transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: 0.5 * LAMPORTS_PER_SOL,
    })
  );

  // 6. Send and confirm
  const signature = await sendAndConfirmTransaction(connection, transaction, [sender]);

  console.log('✅ Transfer successful!');
  console.log('Signature:', signature);

  return signature;
}

transferSol();`,
              language: 'typescript',
            },
            {
              type: 'theory',
              content: `### Verifying on Explorer

After sending, always verify:

1. Go to [explorer.solana.com](https://explorer.solana.com)
2. Switch to **Devnet** (top right)
3. Paste your signature
4. Check:
   - ✅ Status: Success
   - ✅ Fee: ~0.000005 SOL
   - ✅ From/To addresses match
   - ✅ Amount correct

> **Don't trust. Verify.** Always check the explorer.`,
            },
            {
              type: 'challenge',
              content: 'Send 0.1 SOL to this practice address and verify on explorer:',
              language: 'typescript',
              solution: `// Practice recipient (burns to this address for verification)
const PRACTICE_ADDRESS = 'ASDFburn1111111111111111111111111111111111';

// Your code here - implement the transfer!`,
            },
            {
              type: 'quiz',
              content: 'What prevents someone from replaying your transaction?',
              options: [
                { id: 'a', text: 'The signature', explanation: 'Signatures prove authorization but don\'t prevent replay.' },
                { id: 'b', text: 'The recent blockhash', explanation: 'Correct! Blockhashes expire after ~2 minutes, preventing replay attacks.' },
                { id: 'c', text: 'The amount being sent', explanation: 'Amount doesn\'t affect replay protection.' },
                { id: 'd', text: 'The recipient address', explanation: 'Address doesn\'t prevent replay.' },
              ],
              correctAnswer: 'b',
            },
          ],
        },
      ],
      milestone: {
        id: 'first-tx-complete',
        name: 'First Transaction',
        description: 'You\'ve sent your first Solana transaction!',
        sbtMetadata: {
          name: 'ASDF First Transaction SBT',
          symbol: 'ASDF-TX1',
          description: 'Proof of sending your first Solana transaction',
          image: 'https://asdf.dev/sbt/first-transaction.png',
          attributes: [
            { trait_type: 'Track', value: 'Developer' },
            { trait_type: 'Module', value: 'Foundations' },
            { trait_type: 'Skill Pack', value: 'First Transaction' },
            { trait_type: 'XP Earned', value: '155' },
          ],
        },
        requiredXp: 155,
      },
    },
  ],
}

// ============================================
// FULL DEV CURRICULUM
// ============================================

export const DEV_CURRICULUM: Module[] = [
  MODULE_1_FOUNDATIONS,
  // MODULE_2_CORE_CONCEPTS - Coming soon
  // MODULE_3_ANCHOR_PROGRAMS - Coming soon
  // MODULE_4_ADVANCED_PATTERNS - Coming soon
  // MODULE_5_PRODUCTION_READY - Coming soon
]

// Helper to get total XP for a module
export const getModuleTotalXp = (module: Module): number => {
  return module.skillPacks.reduce((total, pack) => {
    return total + pack.lessons.reduce((lessonTotal, lesson) => {
      return lessonTotal + lesson.skills.reduce((skillTotal, skill) => skillTotal + skill.xp, 0)
    }, 0)
  }, 0)
}

// Helper to get all skills in a module
export const getModuleSkills = (module: Module): MicroSkill[] => {
  return module.skillPacks.flatMap(pack => pack.lessons.flatMap(lesson => lesson.skills))
}
