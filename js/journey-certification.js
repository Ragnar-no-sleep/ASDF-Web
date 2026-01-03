/**
 * ASDF Journey - Complete Builder Certification
 * Final modules for production-ready certification
 * Following "THIS IS FINE" philosophy
 *
 * Security: Input validation, XSS prevention
 * Version: 1.0.0
 */

'use strict';

const JourneyCertification = (function() {

    // ============================================
    // ADVANCED CODE & DEV - COMPLETE CURRICULUM
    // ============================================

    const CODE_COMPLETE = {

        // ----------------------------------------
        // Advanced Architecture Patterns
        // ----------------------------------------
        architecture: {
            id: 'cert-code-architecture',
            title: 'Production Architecture Patterns',
            theme: 'fibonacci',
            description: 'Design scalable, maintainable systems for real-world dApps.',
            estimatedTime: '6-8 hours',

            lessons: [
                {
                    title: 'Microservices vs Monolith for dApps',
                    content: `
                        <h4>Choosing the Right Architecture</h4>

                        <div class="jm-comparison-table">
                            <div class="jm-compare-col">
                                <h5>Monolith</h5>
                                <div class="jm-pros">
                                    <strong>Pros:</strong>
                                    <ul>
                                        <li>Simpler deployment</li>
                                        <li>Easier debugging</li>
                                        <li>Lower operational overhead</li>
                                        <li>Good for small teams</li>
                                    </ul>
                                </div>
                                <div class="jm-cons">
                                    <strong>Cons:</strong>
                                    <ul>
                                        <li>Scaling challenges</li>
                                        <li>Technology lock-in</li>
                                        <li>Longer build times</li>
                                    </ul>
                                </div>
                            </div>
                            <div class="jm-compare-col">
                                <h5>Microservices</h5>
                                <div class="jm-pros">
                                    <strong>Pros:</strong>
                                    <ul>
                                        <li>Independent scaling</li>
                                        <li>Tech flexibility</li>
                                        <li>Fault isolation</li>
                                        <li>Team autonomy</li>
                                    </ul>
                                </div>
                                <div class="jm-cons">
                                    <strong>Cons:</strong>
                                    <ul>
                                        <li>Network complexity</li>
                                        <li>Data consistency</li>
                                        <li>Operational overhead</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <h4>ASDF Recommendation: Modular Monolith</h4>
                        <p>Start with a well-structured monolith, extract services when needed:</p>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Project Structure</div>
                            <pre><code>src/
├── modules/
│   ├── auth/           # Authentication module
│   │   ├── handlers/
│   │   ├── services/
│   │   └── index.ts
│   ├── wallet/         # Wallet interactions
│   │   ├── handlers/
│   │   ├── services/
│   │   └── index.ts
│   ├── trading/        # Trading logic
│   │   ├── handlers/
│   │   ├── services/
│   │   └── index.ts
│   └── analytics/      # Analytics & tracking
├── shared/             # Shared utilities
│   ├── database/
│   ├── cache/
│   └── logger/
├── api/                # API routes
└── app.ts              # Entry point</code></pre>
                        </div>

                        <div class="jm-tip">
                            <strong>Fibonacci Insight:</strong> Like the Fibonacci sequence, start small and grow organically. Each service should emerge from a real need, not speculation.
                        </div>
                    `,
                    keyPoints: [
                        'Start with modular monolith, extract later',
                        'Clear module boundaries enable future splitting',
                        'Don\'t over-engineer for scale you don\'t have'
                    ]
                },
                {
                    title: 'Event-Driven Architecture for Blockchain',
                    content: `
                        <h4>Why Events Matter in Crypto</h4>
                        <p>Blockchain is inherently event-driven. Your architecture should reflect this.</p>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Event System Architecture</div>
                            <pre><code>// events/types.ts
export type BlockchainEvent =
    | { type: 'TRANSACTION_CONFIRMED'; signature: string; slot: number }
    | { type: 'BALANCE_CHANGED'; wallet: string; mint: string; amount: bigint }
    | { type: 'PRICE_UPDATE'; mint: string; price: number }
    | { type: 'PROGRAM_EVENT'; programId: string; data: unknown };

// events/bus.ts
import { EventEmitter } from 'events';
import { TypedEmitter } from 'tiny-typed-emitter';

interface EventMap {
    'tx:confirmed': (event: TransactionConfirmedEvent) => void;
    'balance:changed': (event: BalanceChangedEvent) => void;
    'price:update': (event: PriceUpdateEvent) => void;
}

class EventBus extends TypedEmitter<EventMap> {
    private static instance: EventBus;

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    async publishWithRetry<K extends keyof EventMap>(
        event: K,
        data: Parameters<EventMap[K]>[0],
        retries = 3
    ) {
        for (let i = 0; i < retries; i++) {
            try {
                this.emit(event, data);
                return;
            } catch (err) {
                if (i === retries - 1) throw err;
                await sleep(100 * Math.pow(2, i)); // Exponential backoff
            }
        }
    }
}

export const eventBus = EventBus.getInstance();</code></pre>
                        </div>

                        <h4>WebSocket Integration</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Real-time Updates</div>
                            <pre><code>// services/websocket-listener.ts
import { Connection } from '@solana/web3.js';

export class WebSocketListener {
    private connection: Connection;
    private subscriptions: Map<string, number> = new Map();

    constructor(rpcUrl: string) {
        this.connection = new Connection(rpcUrl, {
            wsEndpoint: rpcUrl.replace('https', 'wss'),
            commitment: 'confirmed',
        });
    }

    subscribeToAccount(pubkey: PublicKey, callback: (data: AccountInfo) => void) {
        const subId = this.connection.onAccountChange(
            pubkey,
            (accountInfo, context) => {
                eventBus.emit('balance:changed', {
                    wallet: pubkey.toString(),
                    slot: context.slot,
                    data: accountInfo,
                });
                callback(accountInfo);
            },
            'confirmed'
        );
        this.subscriptions.set(pubkey.toString(), subId);
        return subId;
    }

    subscribeToProgram(programId: PublicKey, callback: (logs: Logs) => void) {
        return this.connection.onLogs(
            programId,
            (logs, context) => {
                eventBus.emit('program:log', {
                    programId: programId.toString(),
                    logs: logs.logs,
                    signature: logs.signature,
                    slot: context.slot,
                });
                callback(logs);
            },
            'confirmed'
        );
    }

    unsubscribe(pubkey: string) {
        const subId = this.subscriptions.get(pubkey);
        if (subId) {
            this.connection.removeAccountChangeListener(subId);
            this.subscriptions.delete(pubkey);
        }
    }
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Blockchain is event-driven by nature',
                        'Use typed event bus for safety',
                        'WebSocket for real-time updates'
                    ]
                },
                {
                    title: 'Database Design for Crypto Apps',
                    content: `
                        <h4>Choosing the Right Database</h4>

                        <table class="jm-table">
                            <tr>
                                <th>Use Case</th>
                                <th>Database</th>
                                <th>Why</th>
                            </tr>
                            <tr>
                                <td>User data, transactions</td>
                                <td>PostgreSQL</td>
                                <td>ACID, relations, JSON support</td>
                            </tr>
                            <tr>
                                <td>Session, cache</td>
                                <td>Redis</td>
                                <td>Speed, TTL, pub/sub</td>
                            </tr>
                            <tr>
                                <td>Analytics, logs</td>
                                <td>ClickHouse/TimescaleDB</td>
                                <td>Time-series optimized</td>
                            </tr>
                            <tr>
                                <td>Search</td>
                                <td>Elasticsearch/Meilisearch</td>
                                <td>Full-text, facets</td>
                            </tr>
                        </table>

                        <h4>Schema Design Example</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">schema.prisma</div>
                            <pre><code>// Prisma schema for crypto app

generator client {
    provider = "prisma-client-js"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

model User {
    id            String    @id @default(cuid())
    walletAddress String    @unique
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt

    // Relations
    transactions  Transaction[]
    balances      Balance[]
    preferences   UserPreference?

    @@index([walletAddress])
}

model Transaction {
    id          String    @id @default(cuid())
    signature   String    @unique
    userId      String
    type        TxType
    status      TxStatus  @default(PENDING)
    amount      Decimal   @db.Decimal(20, 9)
    mint        String
    slot        BigInt
    fee         BigInt
    createdAt   DateTime  @default(now())
    confirmedAt DateTime?

    user        User      @relation(fields: [userId], references: [id])

    @@index([userId, createdAt])
    @@index([signature])
    @@index([status])
}

model Balance {
    id            String   @id @default(cuid())
    userId        String
    mint          String
    amount        Decimal  @db.Decimal(20, 9)
    lastUpdated   DateTime @default(now())

    user          User     @relation(fields: [userId], references: [id])

    @@unique([userId, mint])
    @@index([userId])
}

enum TxType {
    TRANSFER
    SWAP
    STAKE
    BURN
}

enum TxStatus {
    PENDING
    CONFIRMED
    FAILED
}</code></pre>
                        </div>

                        <div class="jm-warning">
                            <strong>Critical:</strong> Never store private keys or seed phrases in your database. Use HSM or secure vaults.
                        </div>
                    `,
                    keyPoints: [
                        'Choose database based on use case',
                        'Index columns you query frequently',
                        'Use decimal for token amounts'
                    ]
                },
                {
                    title: 'API Design Best Practices',
                    content: `
                        <h4>RESTful API Design for dApps</h4>

                        <div class="jm-code-block">
                            <div class="jm-code-title">API Routes Structure</div>
                            <pre><code>// routes/index.ts
const router = express.Router();

// Wallet operations
router.get('/wallets/:address', walletController.getWallet);
router.get('/wallets/:address/balances', walletController.getBalances);
router.get('/wallets/:address/transactions', walletController.getTransactions);

// Token operations
router.get('/tokens/:mint', tokenController.getToken);
router.get('/tokens/:mint/price', tokenController.getPrice);
router.get('/tokens/:mint/holders', tokenController.getHolders);

// Transaction operations
router.post('/transactions', transactionController.submit);
router.get('/transactions/:signature', transactionController.getStatus);
router.get('/transactions/:signature/wait', transactionController.waitForConfirmation);

// Health & meta
router.get('/health', healthController.check);
router.get('/stats', statsController.getStats);</code></pre>
                        </div>

                        <h4>Response Format</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Consistent API Response</div>
                            <pre><code>// types/api.ts
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        cursor?: string;
    };
}

// middleware/response.ts
export function apiResponse<T>(res: Response, data: T, meta?: object) {
    return res.json({
        success: true,
        data,
        meta,
    });
}

export function apiError(res: Response, code: string, message: string, status = 400) {
    return res.status(status).json({
        success: false,
        error: { code, message },
    });
}

// Usage
app.get('/wallets/:address', async (req, res) => {
    try {
        const wallet = await walletService.getWallet(req.params.address);
        if (!wallet) {
            return apiError(res, 'WALLET_NOT_FOUND', 'Wallet not found', 404);
        }
        return apiResponse(res, wallet);
    } catch (err) {
        logger.error(err);
        return apiError(res, 'INTERNAL_ERROR', 'Internal server error', 500);
    }
});</code></pre>
                        </div>

                        <h4>Pagination for Large Datasets</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Cursor-based Pagination</div>
                            <pre><code>// Cursor pagination (better for real-time data)
app.get('/transactions', async (req, res) => {
    const { cursor, limit = 20 } = req.query;

    const where = cursor ? {
        createdAt: { lt: new Date(Buffer.from(cursor, 'base64').toString()) }
    } : {};

    const transactions = await prisma.transaction.findMany({
        where,
        take: Number(limit) + 1, // Fetch one extra to check if more exist
        orderBy: { createdAt: 'desc' },
    });

    const hasMore = transactions.length > limit;
    const items = hasMore ? transactions.slice(0, -1) : transactions;
    const nextCursor = hasMore
        ? Buffer.from(items[items.length - 1].createdAt.toISOString()).toString('base64')
        : null;

    return apiResponse(res, items, {
        cursor: nextCursor,
        hasMore,
    });
});</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Consistent response format across all endpoints',
                        'Use cursor pagination for real-time data',
                        'Clear error codes and messages'
                    ]
                }
            ],

            practicalProject: {
                title: 'Design a dApp Architecture',
                description: 'Create a complete architecture document for a DeFi application.',
                requirements: [
                    'System architecture diagram',
                    'Database schema design',
                    'API specification (OpenAPI/Swagger)',
                    'Event flow documentation',
                    'Scaling strategy document'
                ],
                evaluationCriteria: [
                    'Architecture is scalable and maintainable',
                    'Clear separation of concerns',
                    'Security considerations addressed',
                    'Documentation is complete and clear'
                ]
            }
        },

        // ----------------------------------------
        // Advanced Solana Optimization
        // ----------------------------------------
        solanaAdvanced: {
            id: 'cert-code-solana-advanced',
            title: 'Advanced Solana Development',
            theme: 'verify',
            description: 'Master advanced Solana patterns for production applications.',
            estimatedTime: '8-10 hours',

            lessons: [
                {
                    title: 'Account Compression & State Management',
                    content: `
                        <h4>Compressed NFTs (cNFTs)</h4>
                        <p>Reduce costs by 1000x using account compression:</p>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Creating Compressed NFT Collection</div>
                            <pre><code>import {
    createTree,
    mintToCollectionV1,
    mplBubblegum
} from '@metaplex-foundation/mpl-bubblegum';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

async function createCompressedCollection() {
    const umi = createUmi(rpcUrl).use(mplBubblegum());

    // Create merkle tree for compression
    const merkleTree = generateSigner(umi);
    const builder = await createTree(umi, {
        merkleTree,
        maxDepth: 14,      // 2^14 = 16,384 NFTs
        maxBufferSize: 64, // Concurrent mints
        public: false,
    });

    await builder.sendAndConfirm(umi);

    // Mint compressed NFT
    await mintToCollectionV1(umi, {
        merkleTree: merkleTree.publicKey,
        leafOwner: recipientAddress,
        collectionMint: collectionAddress,
        metadata: {
            name: 'ASDF Builder Badge',
            uri: 'https://asdf.com/metadata/badge.json',
            sellerFeeBasisPoints: 0,
            collection: { key: collectionAddress, verified: false },
            creators: [{ address: creatorAddress, verified: true, share: 100 }],
        },
    }).sendAndConfirm(umi);
}</code></pre>
                        </div>

                        <h4>Cost Comparison</h4>
                        <table class="jm-table">
                            <tr>
                                <th>NFT Type</th>
                                <th>Cost per NFT</th>
                                <th>10,000 NFTs</th>
                            </tr>
                            <tr>
                                <td>Standard NFT</td>
                                <td>~0.012 SOL</td>
                                <td>~120 SOL</td>
                            </tr>
                            <tr>
                                <td>Compressed NFT</td>
                                <td>~0.00001 SOL</td>
                                <td>~0.1 SOL</td>
                            </tr>
                        </table>

                        <div class="jm-tip">
                            <strong>Use Cases:</strong> Achievement badges, loyalty rewards, membership tokens, gaming items.
                        </div>
                    `,
                    keyPoints: [
                        'cNFTs reduce costs by 1000x',
                        'Merkle trees store state off-chain',
                        'Perfect for high-volume NFT use cases'
                    ]
                },
                {
                    title: 'Priority Fees & Transaction Optimization',
                    content: `
                        <h4>Dynamic Priority Fee Strategy</h4>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Smart Priority Fee Calculator</div>
                            <pre><code>import { Connection, ComputeBudgetProgram } from '@solana/web3.js';

interface FeeStrategy {
    level: 'low' | 'medium' | 'high' | 'urgent';
    maxMicroLamports: number;
}

const FEE_STRATEGIES: Record<string, FeeStrategy> = {
    low: { level: 'low', maxMicroLamports: 1_000 },
    medium: { level: 'medium', maxMicroLamports: 10_000 },
    high: { level: 'high', maxMicroLamports: 100_000 },
    urgent: { level: 'urgent', maxMicroLamports: 1_000_000 },
};

async function calculateOptimalFee(
    connection: Connection,
    strategy: keyof typeof FEE_STRATEGIES = 'medium'
): Promise<number> {
    // Get recent prioritization fees
    const recentFees = await connection.getRecentPrioritizationFees();

    if (recentFees.length === 0) {
        return FEE_STRATEGIES[strategy].maxMicroLamports;
    }

    // Calculate percentiles
    const fees = recentFees
        .map(f => f.prioritizationFee)
        .sort((a, b) => a - b);

    const percentileIndex = {
        low: Math.floor(fees.length * 0.25),
        medium: Math.floor(fees.length * 0.50),
        high: Math.floor(fees.length * 0.75),
        urgent: Math.floor(fees.length * 0.95),
    };

    const targetFee = fees[percentileIndex[strategy]];
    const { maxMicroLamports } = FEE_STRATEGIES[strategy];

    // Return fee within bounds
    return Math.min(targetFee * 1.1, maxMicroLamports);
}

async function buildOptimizedTransaction(
    connection: Connection,
    instructions: TransactionInstruction[],
    payer: PublicKey,
    strategy: keyof typeof FEE_STRATEGIES = 'medium'
) {
    // Get optimal compute units via simulation
    const testTx = new Transaction().add(...instructions);
    testTx.feePayer = payer;
    testTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const simulation = await connection.simulateTransaction(testTx);
    const unitsConsumed = simulation.value.unitsConsumed || 200_000;

    // Add 10% buffer
    const computeUnits = Math.ceil(unitsConsumed * 1.1);
    const priorityFee = await calculateOptimalFee(connection, strategy);

    // Build optimized transaction
    return new Transaction()
        .add(ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }))
        .add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }))
        .add(...instructions);
}</code></pre>
                        </div>

                        <h4>Transaction Retry with Escalating Fees</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Retry Strategy</div>
                            <pre><code>async function sendWithRetry(
    connection: Connection,
    transaction: Transaction,
    signers: Keypair[],
    maxRetries = 3
): Promise<string> {
    const strategies = ['medium', 'high', 'urgent'] as const;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const strategy = strategies[Math.min(attempt, strategies.length - 1)];

        try {
            // Rebuild with current strategy
            const optimizedTx = await buildOptimizedTransaction(
                connection,
                transaction.instructions,
                signers[0].publicKey,
                strategy
            );

            optimizedTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
            optimizedTx.sign(...signers);

            const signature = await connection.sendRawTransaction(
                optimizedTx.serialize(),
                { skipPreflight: false, maxRetries: 0 }
            );

            // Wait for confirmation
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(\`Transaction failed: \${JSON.stringify(confirmation.value.err)}\`);
            }

            return signature;

        } catch (err) {
            logger.warn({ attempt, strategy, error: err.message }, 'Transaction attempt failed');

            if (attempt === maxRetries - 1) {
                throw err;
            }

            // Wait before retry (exponential backoff)
            await sleep(1000 * Math.pow(2, attempt));
        }
    }

    throw new Error('Max retries exceeded');
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Dynamic fees based on network conditions',
                        'Escalating fee strategy for retries',
                        'Always simulate before sending'
                    ]
                },
                {
                    title: 'Jito & MEV Protection',
                    content: `
                        <h4>Understanding MEV on Solana</h4>
                        <p>MEV (Maximal Extractable Value) can front-run your transactions. Protect users with Jito bundles.</p>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Jito Bundle Submission</div>
                            <pre><code>import { SearcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';

const JITO_BLOCK_ENGINE_URL = 'https://mainnet.block-engine.jito.wtf';
const JITO_TIP_ACCOUNTS = [
    'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    // ... more tip accounts
];

async function submitJitoBundle(
    transactions: Transaction[],
    signers: Keypair[],
    tipAmount: number = 10_000 // lamports
) {
    const client = SearcherClient.connect(JITO_BLOCK_ENGINE_URL);

    // Select random tip account
    const tipAccount = new PublicKey(
        JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)]
    );

    // Add tip instruction to last transaction
    const tipIx = SystemProgram.transfer({
        fromPubkey: signers[0].publicKey,
        toPubkey: tipAccount,
        lamports: tipAmount,
    });

    transactions[transactions.length - 1].add(tipIx);

    // Sign all transactions
    const blockhash = (await connection.getLatestBlockhash()).blockhash;
    const signedTxs = transactions.map(tx => {
        tx.recentBlockhash = blockhash;
        tx.sign(...signers);
        return tx;
    });

    // Create and send bundle
    const bundle: Bundle = {
        transactions: signedTxs.map(tx => tx.serialize()),
    };

    const bundleId = await client.sendBundle(bundle);
    console.log('Bundle submitted:', bundleId);

    // Wait for bundle confirmation
    const result = await client.getBundleStatus(bundleId);
    return result;
}</code></pre>
                        </div>

                        <h4>When to Use Jito</h4>
                        <ul>
                            <li><strong>DEX Swaps:</strong> Protect against sandwich attacks</li>
                            <li><strong>NFT Mints:</strong> Ensure transaction ordering</li>
                            <li><strong>Liquidations:</strong> Time-sensitive transactions</li>
                            <li><strong>Arbitrage:</strong> Atomic multi-step transactions</li>
                        </ul>

                        <div class="jm-warning">
                            <strong>Cost Consideration:</strong> Jito tips add ~0.00001-0.001 SOL per bundle. Use for high-value transactions where MEV protection matters.
                        </div>
                    `,
                    keyPoints: [
                        'Jito bundles protect against MEV',
                        'Use for swaps, mints, time-sensitive txs',
                        'Tips go to validators for priority'
                    ]
                },
                {
                    title: 'Indexing & Data Infrastructure',
                    content: `
                        <h4>Building Your Own Indexer</h4>
                        <p>For production apps, relying solely on RPC can be limiting. Consider these options:</p>

                        <table class="jm-table">
                            <tr>
                                <th>Solution</th>
                                <th>Pros</th>
                                <th>Cons</th>
                            </tr>
                            <tr>
                                <td>Helius DAS API</td>
                                <td>Fast, managed, rich data</td>
                                <td>Cost at scale, dependency</td>
                            </tr>
                            <tr>
                                <td>Geyser Plugin</td>
                                <td>Real-time, customizable</td>
                                <td>Infrastructure required</td>
                            </tr>
                            <tr>
                                <td>Custom Indexer</td>
                                <td>Full control, optimized</td>
                                <td>Development time, maintenance</td>
                            </tr>
                        </table>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Helius Webhook Integration</div>
                            <pre><code>// Using Helius webhooks for real-time indexing
import express from 'express';
import { verifyHeliusWebhook } from './utils/helius';

const app = express();

app.post('/webhooks/helius', express.json(), async (req, res) => {
    // Verify webhook signature
    if (!verifyHeliusWebhook(req)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const events = req.body;

    for (const event of events) {
        switch (event.type) {
            case 'TRANSFER':
                await handleTransfer(event);
                break;
            case 'NFT_SALE':
                await handleNFTSale(event);
                break;
            case 'SWAP':
                await handleSwap(event);
                break;
            default:
                logger.debug({ type: event.type }, 'Unhandled event type');
        }
    }

    res.json({ received: true });
});

async function handleTransfer(event: HeliusTransferEvent) {
    await prisma.transaction.create({
        data: {
            signature: event.signature,
            type: 'TRANSFER',
            from: event.source,
            to: event.destination,
            amount: event.amount,
            mint: event.mint,
            slot: event.slot,
            timestamp: new Date(event.timestamp * 1000),
        },
    });

    // Update balances
    await updateBalances(event.source, event.destination, event.mint);

    // Emit event for real-time subscribers
    eventBus.emit('transfer', event);
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Use webhooks for real-time data',
                        'Choose indexing solution based on scale',
                        'Helius provides excellent DAS API'
                    ]
                }
            ],

            practicalProject: {
                title: 'Build Production Solana Backend',
                description: 'Create a complete backend for a Solana dApp.',
                requirements: [
                    'Transaction submission with retry and priority fees',
                    'WebSocket subscription system',
                    'Webhook handler for indexing',
                    'Rate limiting and caching',
                    'Comprehensive error handling'
                ],
                evaluationCriteria: [
                    'Handles network failures gracefully',
                    'Efficient RPC usage',
                    'Production-ready error handling',
                    'Well-documented code'
                ]
            }
        }
    };

    // ============================================
    // ADVANCED DESIGN - COMPLETE CURRICULUM
    // ============================================

    const DESIGN_COMPLETE = {

        motionDesign: {
            id: 'cert-design-motion',
            title: 'Motion Design for dApps',
            theme: 'fibonacci',
            description: 'Create fluid, purposeful animations that enhance UX.',
            estimatedTime: '4-5 hours',

            lessons: [
                {
                    title: 'Animation Principles for Crypto UI',
                    content: `
                        <h4>The 12 Principles Applied to dApps</h4>

                        <div class="jm-principles-grid">
                            <div class="jm-principle">
                                <h5>Timing</h5>
                                <p>Use Fibonacci-based durations: 100ms, 200ms, 300ms, 500ms</p>
                            </div>
                            <div class="jm-principle">
                                <h5>Easing</h5>
                                <p>ease-out for entrances, ease-in for exits</p>
                            </div>
                            <div class="jm-principle">
                                <h5>Anticipation</h5>
                                <p>Button press states before action</p>
                            </div>
                            <div class="jm-principle">
                                <h5>Follow Through</h5>
                                <p>Subtle bounce after movement</p>
                            </div>
                        </div>

                        <h4>CSS Animation Variables</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">animation-tokens.css</div>
                            <pre><code>:root {
    /* Durations (Fibonacci-based) */
    --duration-instant: 100ms;
    --duration-fast: 200ms;
    --duration-normal: 300ms;
    --duration-slow: 500ms;
    --duration-slower: 800ms;

    /* Easings */
    --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
    --ease-in: cubic-bezier(0.32, 0, 0.67, 0);
    --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
    --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
    --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);

    /* Common animations */
    --transition-default: all var(--duration-fast) var(--ease-out);
    --transition-slow: all var(--duration-normal) var(--ease-out);
}

/* Utility classes */
.animate-fade-in {
    animation: fadeIn var(--duration-normal) var(--ease-out);
}

.animate-slide-up {
    animation: slideUp var(--duration-normal) var(--ease-out);
}

.animate-scale-in {
    animation: scaleIn var(--duration-fast) var(--ease-bounce);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Use Fibonacci-based timing for natural rhythm',
                        'ease-out for entrances, ease-in for exits',
                        'Keep animations under 300ms for responsiveness'
                    ]
                },
                {
                    title: 'Transaction State Animations',
                    content: `
                        <h4>Visual Feedback for Blockchain States</h4>

                        <div class="jm-code-block">
                            <div class="jm-code-title">TransactionStatus.tsx</div>
                            <pre><code>const statusAnimations = {
    idle: '',
    pending: 'animate-pulse',
    confirming: 'animate-spin-slow',
    confirmed: 'animate-success-bounce',
    failed: 'animate-shake',
};

function TransactionStatus({ status, signature }) {
    return (
        <div className={\`tx-status \${statusAnimations[status]}\`}>
            <div className="tx-icon">
                {status === 'pending' && <Spinner />}
                {status === 'confirming' && <Clock />}
                {status === 'confirmed' && <CheckCircle />}
                {status === 'failed' && <XCircle />}
            </div>

            <div className="tx-details">
                <span className="tx-label">{statusLabels[status]}</span>
                {signature && (
                    <a
                        href={\`https://solscan.io/tx/\${signature}\`}
                        className="tx-link"
                        target="_blank"
                    >
                        View on Solscan ↗
                    </a>
                )}
            </div>

            {status === 'confirming' && (
                <div className="tx-progress">
                    <motion.div
                        className="tx-progress-bar"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 30, ease: 'linear' }}
                    />
                </div>
            )}
        </div>
    );
}</code></pre>
                        </div>

                        <h4>Success Celebration</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Confetti Effect</div>
                            <pre><code>import confetti from 'canvas-confetti';

function celebrateSuccess() {
    // Fire confetti from both sides
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = ['#f97316', '#fbbf24', '#22c55e'];

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Visual feedback for every transaction state',
                        'Progress indicators for waiting states',
                        'Celebrate successes to reinforce positive actions'
                    ]
                }
            ],

            practicalProject: {
                title: 'Design Animation System',
                description: 'Create a complete animation system for a dApp.',
                requirements: [
                    'Animation token system (durations, easings)',
                    'Reusable animation components',
                    'Transaction state animations',
                    'Loading/skeleton states',
                    'Success/error feedback animations'
                ],
                evaluationCriteria: [
                    'Animations are purposeful, not decorative',
                    'Performance is optimized (transforms/opacity only)',
                    'Consistent timing across the app',
                    'Accessible (respects reduced-motion)'
                ]
            }
        },

        criticalDesign: {
            id: 'cert-design-critical',
            title: 'Critical Design Review',
            theme: 'verify',
            description: 'Evaluate and improve designs systematically.',
            estimatedTime: '3-4 hours',

            lessons: [
                {
                    title: 'Design Audit Framework',
                    content: `
                        <h4>The ASDF Design Audit Checklist</h4>

                        <div class="jm-audit-section">
                            <h5>1. Usability (40%)</h5>
                            <ul>
                                <li>Can users complete primary tasks in < 3 clicks?</li>
                                <li>Are error states clear and actionable?</li>
                                <li>Is the navigation intuitive?</li>
                                <li>Are loading states informative?</li>
                            </ul>
                        </div>

                        <div class="jm-audit-section">
                            <h5>2. Accessibility (25%)</h5>
                            <ul>
                                <li>Color contrast meets WCAG AA (4.5:1)?</li>
                                <li>All interactive elements keyboard accessible?</li>
                                <li>Screen reader compatible?</li>
                                <li>Focus states visible?</li>
                            </ul>
                        </div>

                        <div class="jm-audit-section">
                            <h5>3. Consistency (20%)</h5>
                            <ul>
                                <li>Components follow design system?</li>
                                <li>Typography is consistent?</li>
                                <li>Spacing uses defined scale?</li>
                                <li>Icons are from same family?</li>
                            </ul>
                        </div>

                        <div class="jm-audit-section">
                            <h5>4. Performance (15%)</h5>
                            <ul>
                                <li>Images optimized?</li>
                                <li>Animations use GPU-friendly properties?</li>
                                <li>No layout thrashing?</li>
                                <li>Lazy loading implemented?</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Systematic evaluation prevents oversight',
                        'Weight categories by user impact',
                        'Document findings with screenshots'
                    ]
                }
            ]
        }
    };

    // ============================================
    // ADVANCED CONTENT - COMPLETE CURRICULUM
    // ============================================

    const CONTENT_COMPLETE = {

        videoContent: {
            id: 'cert-content-video',
            title: 'Video & Audio Content',
            theme: 'burn',
            description: 'Expand your content reach with multimedia.',
            estimatedTime: '4-5 hours',

            lessons: [
                {
                    title: 'Video Content Strategy for Crypto',
                    content: `
                        <h4>Video Content Types</h4>

                        <table class="jm-table">
                            <tr>
                                <th>Type</th>
                                <th>Length</th>
                                <th>Platform</th>
                                <th>Purpose</th>
                            </tr>
                            <tr>
                                <td>Shorts/Reels</td>
                                <td>15-60s</td>
                                <td>TikTok, YouTube, Twitter</td>
                                <td>Reach, virality</td>
                            </tr>
                            <tr>
                                <td>Tutorials</td>
                                <td>5-15min</td>
                                <td>YouTube</td>
                                <td>Education, SEO</td>
                            </tr>
                            <tr>
                                <td>Live streams</td>
                                <td>30-120min</td>
                                <td>YouTube, Twitch</td>
                                <td>Community, engagement</td>
                            </tr>
                            <tr>
                                <td>Podcasts</td>
                                <td>30-60min</td>
                                <td>Spotify, Apple</td>
                                <td>Thought leadership</td>
                            </tr>
                        </table>

                        <h4>Production Workflow</h4>
                        <ol>
                            <li><strong>Script:</strong> Write key points, not word-for-word</li>
                            <li><strong>Record:</strong> Good audio > good video</li>
                            <li><strong>Edit:</strong> Cut pauses, add graphics</li>
                            <li><strong>Optimize:</strong> Thumbnails, titles, descriptions</li>
                            <li><strong>Distribute:</strong> Repurpose across platforms</li>
                        </ol>

                        <div class="jm-tip">
                            <strong>ASDF Tip:</strong> One long-form video can become 10+ short clips. Create once, distribute everywhere.
                        </div>
                    `,
                    keyPoints: [
                        'Audio quality is more important than video',
                        'Repurpose content across platforms',
                        'Shorts/Reels for reach, long-form for depth'
                    ]
                }
            ]
        },

        multiPlatform: {
            id: 'cert-content-multiplatform',
            title: 'Multi-Platform Publishing',
            theme: 'fibonacci',
            description: 'Reach audiences across all platforms efficiently.',
            estimatedTime: '3-4 hours',

            lessons: [
                {
                    title: 'Platform-Specific Optimization',
                    content: `
                        <h4>Content Adaptation Matrix</h4>

                        <div class="jm-platform-matrix">
                            <div class="jm-platform">
                                <h5>Twitter/X</h5>
                                <ul>
                                    <li>280 chars or threads</li>
                                    <li>Images: 1200x675</li>
                                    <li>Video: < 2:20</li>
                                    <li>Best: News, takes, threads</li>
                                </ul>
                            </div>
                            <div class="jm-platform">
                                <h5>Discord</h5>
                                <ul>
                                    <li>Markdown supported</li>
                                    <li>Embeds for rich content</li>
                                    <li>Announcements + discussion</li>
                                    <li>Best: Updates, community</li>
                                </ul>
                            </div>
                            <div class="jm-platform">
                                <h5>YouTube</h5>
                                <ul>
                                    <li>Thumbnail: 1280x720</li>
                                    <li>Title: < 60 chars</li>
                                    <li>Description: Keywords first</li>
                                    <li>Best: Tutorials, deep dives</li>
                                </ul>
                            </div>
                            <div class="jm-platform">
                                <h5>Medium/Mirror</h5>
                                <ul>
                                    <li>Long-form articles</li>
                                    <li>SEO-optimized titles</li>
                                    <li>Header images</li>
                                    <li>Best: Technical content</li>
                                </ul>
                            </div>
                        </div>

                        <h4>Content Repurposing Flow</h4>
                        <div class="jm-flow">
                            <div class="jm-flow-step">Long Article</div>
                            <div class="jm-flow-arrow">→</div>
                            <div class="jm-flow-step">Twitter Thread</div>
                            <div class="jm-flow-arrow">→</div>
                            <div class="jm-flow-step">LinkedIn Post</div>
                            <div class="jm-flow-arrow">→</div>
                            <div class="jm-flow-step">Discord Announcement</div>
                            <div class="jm-flow-arrow">→</div>
                            <div class="jm-flow-step">Short Video</div>
                        </div>
                    `,
                    keyPoints: [
                        'Adapt content for each platform\'s format',
                        'Create once, repurpose everywhere',
                        'Track which platforms drive most engagement'
                    ]
                }
            ]
        }
    };

    // ============================================
    // ADVANCED COMMUNITY - COMPLETE CURRICULUM
    // ============================================

    const COMMUNITY_COMPLETE = {

        daoOperations: {
            id: 'cert-community-dao',
            title: 'DAO Operations & Governance',
            theme: 'burn',
            description: 'Run decentralized organizations effectively.',
            estimatedTime: '5-6 hours',

            lessons: [
                {
                    title: 'DAO Governance Models',
                    content: `
                        <h4>Governance Framework Comparison</h4>

                        <table class="jm-table">
                            <tr>
                                <th>Model</th>
                                <th>Pros</th>
                                <th>Cons</th>
                                <th>Best For</th>
                            </tr>
                            <tr>
                                <td>Token Voting</td>
                                <td>Simple, clear</td>
                                <td>Plutocratic</td>
                                <td>Protocol governance</td>
                            </tr>
                            <tr>
                                <td>Quadratic Voting</td>
                                <td>Fairer distribution</td>
                                <td>Sybil vulnerable</td>
                                <td>Community grants</td>
                            </tr>
                            <tr>
                                <td>Conviction Voting</td>
                                <td>Reduces manipulation</td>
                                <td>Complex UX</td>
                                <td>Treasury allocation</td>
                            </tr>
                            <tr>
                                <td>Optimistic Governance</td>
                                <td>Fast execution</td>
                                <td>Requires vigilance</td>
                                <td>Day-to-day ops</td>
                            </tr>
                        </table>

                        <h4>Proposal Lifecycle</h4>
                        <div class="jm-lifecycle">
                            <div class="jm-stage">
                                <span class="jm-stage-num">1</span>
                                <h5>Ideation</h5>
                                <p>Forum discussion, temperature check</p>
                            </div>
                            <div class="jm-stage">
                                <span class="jm-stage-num">2</span>
                                <h5>Draft</h5>
                                <p>Formal proposal with specs</p>
                            </div>
                            <div class="jm-stage">
                                <span class="jm-stage-num">3</span>
                                <h5>Review</h5>
                                <p>Community feedback period</p>
                            </div>
                            <div class="jm-stage">
                                <span class="jm-stage-num">4</span>
                                <h5>Vote</h5>
                                <p>On-chain or snapshot voting</p>
                            </div>
                            <div class="jm-stage">
                                <span class="jm-stage-num">5</span>
                                <h5>Execute</h5>
                                <p>Implementation or timelock</p>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Choose governance model based on use case',
                        'Clear proposal process reduces friction',
                        'Balance speed with decentralization'
                    ]
                },
                {
                    title: 'Treasury Management',
                    content: `
                        <h4>Treasury Best Practices</h4>

                        <div class="jm-treasury-guide">
                            <div class="jm-treasury-section">
                                <h5>Security</h5>
                                <ul>
                                    <li>Multisig (minimum 3/5)</li>
                                    <li>Geographically distributed signers</li>
                                    <li>Hardware wallets only</li>
                                    <li>Regular signer rotation</li>
                                </ul>
                            </div>
                            <div class="jm-treasury-section">
                                <h5>Diversification</h5>
                                <ul>
                                    <li>Native token: 40-60%</li>
                                    <li>Stablecoins: 20-30%</li>
                                    <li>Blue chips (SOL, ETH): 10-20%</li>
                                    <li>Operating reserves: 6-12 months runway</li>
                                </ul>
                            </div>
                            <div class="jm-treasury-section">
                                <h5>Reporting</h5>
                                <ul>
                                    <li>Monthly treasury reports</li>
                                    <li>Real-time dashboard</li>
                                    <li>Spending categorization</li>
                                    <li>Quarterly audits</li>
                                </ul>
                            </div>
                        </div>

                        <div class="jm-warning">
                            <strong>Critical:</strong> Never have single points of failure in treasury management. One compromised key should not drain funds.
                        </div>
                    `,
                    keyPoints: [
                        'Multisig is non-negotiable',
                        'Diversify to reduce volatility risk',
                        'Transparent reporting builds trust'
                    ]
                }
            ]
        },

        metricsKpis: {
            id: 'cert-community-metrics',
            title: 'Community Metrics & KPIs',
            theme: 'fibonacci',
            description: 'Measure community health with meaningful metrics.',
            estimatedTime: '3-4 hours',

            lessons: [
                {
                    title: 'Community Health Dashboard',
                    content: `
                        <h4>Key Community Metrics</h4>

                        <div class="jm-metrics-dashboard">
                            <div class="jm-metric-card">
                                <div class="jm-metric-name">DAU/MAU Ratio</div>
                                <div class="jm-metric-value">Target: > 20%</div>
                                <p>Measures stickiness</p>
                            </div>
                            <div class="jm-metric-card">
                                <div class="jm-metric-name">Retention Rate</div>
                                <div class="jm-metric-value">Target: > 40% D30</div>
                                <p>Users returning after 30 days</p>
                            </div>
                            <div class="jm-metric-card">
                                <div class="jm-metric-name">Active Contributors</div>
                                <div class="jm-metric-value">Target: > 5% of members</div>
                                <p>Members who contribute</p>
                            </div>
                            <div class="jm-metric-card">
                                <div class="jm-metric-name">Sentiment Score</div>
                                <div class="jm-metric-value">Target: > 70%</div>
                                <p>Positive vs negative messages</p>
                            </div>
                        </div>

                        <h4>Growth vs Health</h4>
                        <div class="jm-comparison">
                            <div class="jm-compare-item">
                                <h5>Vanity (Avoid)</h5>
                                <ul>
                                    <li>Total member count</li>
                                    <li>Follower count</li>
                                    <li>Total messages</li>
                                </ul>
                            </div>
                            <div class="jm-compare-item">
                                <h5>Health (Track)</h5>
                                <ul>
                                    <li>Active members %</li>
                                    <li>Retention rate</li>
                                    <li>Quality contributions</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Focus on engagement over size',
                        'DAU/MAU ratio shows real activity',
                        'Track trends, not just snapshots'
                    ]
                }
            ]
        }
    };

    // ============================================
    // FINAL CERTIFICATION MODULE
    // ============================================

    const CERTIFICATION_MODULE = {
        id: 'asdf-builder-certification',
        title: 'ASDF Certified Builder',
        theme: 'burn',
        description: 'Complete the final assessment to earn your certification.',
        estimatedTime: '10-15 hours',
        isCapstone: true,

        overview: {
            title: 'Certification Overview',
            content: `
                <div class="jm-cert-overview">
                    <div class="jm-cert-badge-large">🔥</div>
                    <h3>ASDF Certified Builder</h3>
                    <p>Demonstrate production-level skills across all disciplines to earn your certification.</p>

                    <div class="jm-cert-requirements">
                        <h4>Requirements</h4>
                        <ul>
                            <li>Complete all production modules</li>
                            <li>Pass the technical assessment (70%+)</li>
                            <li>Submit capstone project</li>
                            <li>Peer review approval</li>
                        </ul>
                    </div>

                    <div class="jm-cert-benefits">
                        <h4>Benefits</h4>
                        <ul>
                            <li>🏆 Verified on-chain credential (cNFT)</li>
                            <li>💼 Listed in ASDF Builder Directory</li>
                            <li>🎯 Priority access to ecosystem opportunities</li>
                            <li>👥 Join exclusive builder community</li>
                        </ul>
                    </div>
                </div>
            `
        },

        technicalAssessment: {
            title: 'Technical Assessment',
            description: 'Multi-part exam covering all production skills.',
            sections: [
                {
                    name: 'Code & Development',
                    weight: 30,
                    questions: [
                        {
                            type: 'multiple',
                            question: 'What is the correct order for a CPI with PDA signer?',
                            options: [
                                'CPI call → State update → Verify signer',
                                'State update → CPI call → Verify signer',
                                'Verify signer → State update → CPI call',
                                'Verify signer → CPI call → State update'
                            ],
                            correct: 2,
                            explanation: 'Always update state BEFORE making CPIs to prevent reentrancy.'
                        },
                        {
                            type: 'multiple',
                            question: 'Which testing strategy is most appropriate for smart contracts?',
                            options: [
                                '100% E2E tests',
                                '60% unit, 30% integration, 10% E2E',
                                'Manual testing only',
                                'Unit tests only'
                            ],
                            correct: 1,
                            explanation: 'The testing pyramid recommends 60% unit, 30% integration, 10% E2E.'
                        },
                        {
                            type: 'text',
                            question: 'What Solana feature reduces transaction costs by 1000x for NFTs?',
                            answer: 'compression',
                            alternateAnswers: ['compressed nfts', 'cnfts', 'account compression']
                        },
                        {
                            type: 'multiple',
                            question: 'What is the recommended minimum coverage for smart contract code?',
                            options: ['50%', '70%', '90%', '100%'],
                            correct: 3,
                            explanation: 'Smart contracts handle real funds and are immutable - 100% coverage is required.'
                        },
                        {
                            type: 'code',
                            question: 'What is wrong with this code?',
                            code: `let total = amount + fee; // Calculate total`,
                            answer: 'Integer overflow vulnerability - should use checked_add()',
                            options: [
                                'Missing type annotation',
                                'Integer overflow vulnerability',
                                'Variable naming',
                                'Nothing wrong'
                            ],
                            correct: 1
                        }
                    ]
                },
                {
                    name: 'Design & UX',
                    weight: 25,
                    questions: [
                        {
                            type: 'multiple',
                            question: 'What is the minimum color contrast ratio for WCAG AA compliance?',
                            options: ['2.5:1', '3:1', '4.5:1', '7:1'],
                            correct: 2,
                            explanation: 'WCAG AA requires 4.5:1 for normal text, 3:1 for large text.'
                        },
                        {
                            type: 'multiple',
                            question: 'Which animation duration feels most responsive for UI feedback?',
                            options: ['50ms', '150-200ms', '500ms', '1000ms'],
                            correct: 1,
                            explanation: '150-200ms feels immediate but visible. Longer feels sluggish.'
                        },
                        {
                            type: 'text',
                            question: 'What design methodology uses atoms, molecules, organisms, templates?',
                            answer: 'atomic design',
                            alternateAnswers: ['atomic']
                        }
                    ]
                },
                {
                    name: 'Content & Marketing',
                    weight: 20,
                    questions: [
                        {
                            type: 'multiple',
                            question: 'What is the recommended content ratio (education:culture:promotion)?',
                            options: ['20:30:50', '50:30:20', '33:33:33', '70:20:10'],
                            correct: 1,
                            explanation: '50% educational, 30% culture, 20% promotion builds trust first.'
                        },
                        {
                            type: 'multiple',
                            question: 'Which metric best indicates content quality?',
                            options: ['Impressions', 'Follower count', 'Saves/Bookmarks', 'Likes'],
                            correct: 2,
                            explanation: 'Saves indicate content valuable enough to revisit.'
                        }
                    ]
                },
                {
                    name: 'Community & Operations',
                    weight: 25,
                    questions: [
                        {
                            type: 'multiple',
                            question: 'What is the recommended moderation ratio for 10,000 members?',
                            options: ['1:100', '1:500', '1:1000', '1:2000'],
                            correct: 2,
                            explanation: 'For 10,000 members, 1:1000 (10 mods) is recommended.'
                        },
                        {
                            type: 'multiple',
                            question: 'In a crisis, what should happen first?',
                            options: [
                                'Full investigation',
                                'Public acknowledgment',
                                'Blame assessment',
                                'Silent monitoring'
                            ],
                            correct: 1,
                            explanation: 'Acknowledge within 15 minutes, investigate while updating.'
                        },
                        {
                            type: 'text',
                            question: 'What type of wallet setup is required for DAO treasuries?',
                            answer: 'multisig',
                            alternateAnswers: ['multi-sig', 'multi signature', 'multisignature']
                        }
                    ]
                }
            ]
        },

        capstoneProject: {
            title: 'Capstone Project',
            description: 'Build a complete, production-ready dApp demonstrating all skills.',

            options: [
                {
                    id: 'defi-app',
                    name: 'DeFi Application',
                    description: 'Build a token swap interface with wallet integration.',
                    requirements: [
                        'Smart contract integration (can use existing programs)',
                        'Complete UI with design system',
                        'Transaction handling with proper states',
                        'Error handling and recovery',
                        'Responsive design',
                        'Basic analytics tracking'
                    ],
                    deliverables: [
                        'GitHub repository with README',
                        'Live deployed application',
                        'Technical documentation',
                        'Video walkthrough (5 min)'
                    ]
                },
                {
                    id: 'nft-platform',
                    name: 'NFT Platform',
                    description: 'Build an NFT gallery/minting interface.',
                    requirements: [
                        'Display NFTs from wallet',
                        'Minting interface (can use existing programs)',
                        'Collection browsing',
                        'Responsive gallery design',
                        'Wallet connection flow',
                        'Transaction status handling'
                    ],
                    deliverables: [
                        'GitHub repository with README',
                        'Live deployed application',
                        'Technical documentation',
                        'Video walkthrough (5 min)'
                    ]
                },
                {
                    id: 'community-tool',
                    name: 'Community Tool',
                    description: 'Build a tool that helps crypto communities.',
                    requirements: [
                        'Solves a real community problem',
                        'User authentication/wallet connection',
                        'Clean, accessible UI',
                        'Mobile responsive',
                        'Clear documentation',
                        'Community feedback incorporated'
                    ],
                    deliverables: [
                        'GitHub repository with README',
                        'Live deployed application',
                        'User guide',
                        'Video walkthrough (5 min)'
                    ]
                }
            ],

            evaluationRubric: {
                technical: {
                    weight: 40,
                    criteria: [
                        'Code quality and organization',
                        'Error handling and edge cases',
                        'Security best practices',
                        'Performance optimization',
                        'Testing coverage'
                    ]
                },
                design: {
                    weight: 25,
                    criteria: [
                        'Visual consistency',
                        'User experience flow',
                        'Accessibility compliance',
                        'Responsive design',
                        'Animation and feedback'
                    ]
                },
                documentation: {
                    weight: 20,
                    criteria: [
                        'README completeness',
                        'Code comments',
                        'Setup instructions',
                        'Architecture explanation',
                        'API documentation'
                    ]
                },
                presentation: {
                    weight: 15,
                    criteria: [
                        'Clear explanation of features',
                        'Technical decisions justified',
                        'Demo of key functionality',
                        'Handling of questions'
                    ]
                }
            }
        },

        certification: {
            badge: {
                name: 'ASDF Certified Builder',
                symbol: '🔥',
                tier: 'INFERNO',
                description: 'Has demonstrated production-level skills across code, design, content, and community.',
                image: '/badges/certified-builder.png'
            },
            nft: {
                type: 'compressed',
                collection: 'ASDF Builder Credentials',
                attributes: [
                    { trait_type: 'Certification', value: 'ASDF Certified Builder' },
                    { trait_type: 'Level', value: 'Production Ready' },
                    { trait_type: 'Issued', value: 'Dynamic' },
                    { trait_type: 'Skills', value: 'Code, Design, Content, Community' }
                ],
                metadata: {
                    name: 'ASDF Certified Builder',
                    description: 'This builder has completed the ASDF production certification program.',
                    external_url: 'https://asdf.dev/builders'
                }
            },
            perks: [
                'Listed in ASDF Builder Directory',
                'Access to private builder channels',
                'Priority for ecosystem grants',
                'Invitation to builder events',
                'Direct line to core team'
            ]
        }
    };

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        CODE: CODE_COMPLETE,
        DESIGN: DESIGN_COMPLETE,
        CONTENT: CONTENT_COMPLETE,
        COMMUNITY: COMMUNITY_COMPLETE,
        CERTIFICATION: CERTIFICATION_MODULE,

        getAllModules() {
            return [
                ...Object.values(CODE_COMPLETE),
                ...Object.values(DESIGN_COMPLETE),
                ...Object.values(CONTENT_COMPLETE),
                ...Object.values(COMMUNITY_COMPLETE),
            ];
        },

        getModuleById(id) {
            const allModules = this.getAllModules();
            if (id === CERTIFICATION_MODULE.id) return CERTIFICATION_MODULE;
            return allModules.find(m => m.id === id);
        },

        getModulesForPillar(pillar) {
            switch (pillar) {
                case 'code': return Object.values(CODE_COMPLETE);
                case 'design': return Object.values(DESIGN_COMPLETE);
                case 'content': return Object.values(CONTENT_COMPLETE);
                case 'community': return Object.values(COMMUNITY_COMPLETE);
                default: return [];
            }
        },

        getCertificationModule() {
            return CERTIFICATION_MODULE;
        },

        getTotalCurriculum() {
            const modules = this.getAllModules();
            const totalHours = modules.reduce((sum, m) => {
                const [min, max] = (m.estimatedTime || '0-0').split('-').map(n => parseInt(n) || 0);
                return sum + ((min + max) / 2);
            }, 0);

            return {
                moduleCount: modules.length + 1, // +1 for certification
                estimatedHours: Math.round(totalHours) + 12, // +12 for certification
                pillars: ['code', 'design', 'content', 'community'],
                hasCertification: true
            };
        },

        // Check if user is eligible for certification
        checkCertificationEligibility(completedModules) {
            const requiredModules = this.getAllModules().map(m => m.id);
            const completed = new Set(completedModules);
            const missing = requiredModules.filter(id => !completed.has(id));

            return {
                eligible: missing.length === 0,
                completed: requiredModules.length - missing.length,
                total: requiredModules.length,
                missing: missing
            };
        }
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.JourneyCertification = JourneyCertification;
}
