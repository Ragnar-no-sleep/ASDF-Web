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
                },
                {
                    title: 'Conflict Resolution in DAOs',
                    content: `
                        <h4>Handling Community Conflicts</h4>

                        <div class="jm-conflict-framework">
                            <div class="jm-conflict-step">
                                <span class="jm-step-icon">👂</span>
                                <h5>1. Listen First</h5>
                                <p>Understand all perspectives before acting. Most conflicts stem from miscommunication.</p>
                            </div>
                            <div class="jm-conflict-step">
                                <span class="jm-step-icon">📋</span>
                                <h5>2. Document Everything</h5>
                                <p>Keep records of incidents, decisions, and reasoning for transparency.</p>
                            </div>
                            <div class="jm-conflict-step">
                                <span class="jm-step-icon">⚖️</span>
                                <h5>3. Apply Rules Consistently</h5>
                                <p>Fair enforcement builds trust. No special treatment.</p>
                            </div>
                            <div class="jm-conflict-step">
                                <span class="jm-step-icon">🤝</span>
                                <h5>4. Seek Resolution</h5>
                                <p>Focus on solutions, not blame. Enable parties to move forward.</p>
                            </div>
                        </div>

                        <h4>Escalation Path</h4>
                        <div class="jm-escalation">
                            <div class="jm-esc-level">Community Moderators</div>
                            <div class="jm-esc-arrow">↓</div>
                            <div class="jm-esc-level">Core Contributors</div>
                            <div class="jm-esc-arrow">↓</div>
                            <div class="jm-esc-level">Governance Council</div>
                            <div class="jm-esc-arrow">↓</div>
                            <div class="jm-esc-level">Community Vote</div>
                        </div>

                        <div class="jm-best-practice">
                            <h4>Prevention > Resolution</h4>
                            <ul>
                                <li>Clear community guidelines</li>
                                <li>Code of conduct</li>
                                <li>Regular mod training</li>
                                <li>Open communication channels</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Listen before acting',
                        'Document for transparency',
                        'Consistent rule enforcement',
                        'Focus on solutions'
                    ]
                },
                {
                    title: 'DAO Legal Considerations',
                    content: `
                        <h4>Legal Landscape for DAOs</h4>

                        <div class="jm-warning">
                            <strong>Disclaimer:</strong> This is educational content, not legal advice. Consult qualified legal counsel for your specific situation.
                        </div>

                        <h4>Common Legal Structures</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Structure</th>
                                <th>Jurisdiction</th>
                                <th>Use Case</th>
                            </tr>
                            <tr>
                                <td>Wyoming DAO LLC</td>
                                <td>USA (Wyoming)</td>
                                <td>US-based operations</td>
                            </tr>
                            <tr>
                                <td>Marshall Islands DAO</td>
                                <td>Marshall Islands</td>
                                <td>Global DAOs</td>
                            </tr>
                            <tr>
                                <td>Swiss Association</td>
                                <td>Switzerland</td>
                                <td>European operations</td>
                            </tr>
                            <tr>
                                <td>Cayman Foundation</td>
                                <td>Cayman Islands</td>
                                <td>Investment DAOs</td>
                            </tr>
                        </table>

                        <h4>Key Considerations</h4>
                        <ul>
                            <li><strong>Liability protection:</strong> Shield members from personal liability</li>
                            <li><strong>Tax obligations:</strong> Understand reporting requirements</li>
                            <li><strong>Securities laws:</strong> Token classification matters</li>
                            <li><strong>Contracts:</strong> How DAOs can enter legal agreements</li>
                        </ul>
                    `,
                    keyPoints: [
                        'Legal structure provides protection',
                        'Jurisdiction matters for compliance',
                        'Consult legal professionals',
                        'Plan for regulatory changes'
                    ]
                }
            ]
        },

        metricsKpis: {
            id: 'cert-community-metrics',
            title: 'Community Metrics & KPIs',
            theme: 'fibonacci',
            description: 'Measure community health with meaningful metrics.',

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
                },
                {
                    title: 'Community Analytics Tools',
                    content: `
                        <h4>Essential Analytics Stack</h4>

                        <div class="jm-tools-grid">
                            <div class="jm-tool-card">
                                <h5>Discord Analytics</h5>
                                <ul>
                                    <li>Statbot - server statistics</li>
                                    <li>Discord Analytics Bot</li>
                                    <li>Member activity tracking</li>
                                </ul>
                            </div>
                            <div class="jm-tool-card">
                                <h5>Twitter/X Analytics</h5>
                                <ul>
                                    <li>Native Twitter Analytics</li>
                                    <li>TweetDeck for monitoring</li>
                                    <li>Engagement rate tracking</li>
                                </ul>
                            </div>
                            <div class="jm-tool-card">
                                <h5>On-chain Analytics</h5>
                                <ul>
                                    <li>Dune Analytics dashboards</li>
                                    <li>Holder distribution</li>
                                    <li>Transaction patterns</li>
                                </ul>
                            </div>
                            <div class="jm-tool-card">
                                <h5>Survey Tools</h5>
                                <ul>
                                    <li>Typeform for feedback</li>
                                    <li>NPS surveys</li>
                                    <li>Quarterly community polls</li>
                                </ul>
                            </div>
                        </div>

                        <h4>Dashboard Template</h4>
                        <div class="jm-dashboard-template">
                            <div class="jm-dash-section">
                                <h5>Weekly Review</h5>
                                <ul>
                                    <li>New members vs churned</li>
                                    <li>Active conversation threads</li>
                                    <li>Support tickets resolved</li>
                                    <li>Content engagement rates</li>
                                </ul>
                            </div>
                            <div class="jm-dash-section">
                                <h5>Monthly Review</h5>
                                <ul>
                                    <li>DAU/MAU trend</li>
                                    <li>Top contributors</li>
                                    <li>Sentiment analysis</li>
                                    <li>Growth vs retention</li>
                                </ul>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Use multiple data sources',
                        'Create consistent dashboards',
                        'Review metrics regularly',
                        'Act on insights'
                    ]
                },
                {
                    title: 'Building Feedback Loops',
                    content: `
                        <h4>Continuous Improvement Cycle</h4>

                        <div class="jm-feedback-cycle">
                            <div class="jm-cycle-step">
                                <span class="jm-cycle-num">1</span>
                                <h5>Collect</h5>
                                <p>Gather feedback through surveys, discussions, support tickets</p>
                            </div>
                            <div class="jm-cycle-arrow">→</div>
                            <div class="jm-cycle-step">
                                <span class="jm-cycle-num">2</span>
                                <h5>Analyze</h5>
                                <p>Identify patterns, prioritize issues, spot opportunities</p>
                            </div>
                            <div class="jm-cycle-arrow">→</div>
                            <div class="jm-cycle-step">
                                <span class="jm-cycle-num">3</span>
                                <h5>Act</h5>
                                <p>Implement changes, communicate decisions</p>
                            </div>
                            <div class="jm-cycle-arrow">→</div>
                            <div class="jm-cycle-step">
                                <span class="jm-cycle-num">4</span>
                                <h5>Close Loop</h5>
                                <p>Share results, thank contributors, measure impact</p>
                            </div>
                        </div>

                        <h4>Feedback Channels</h4>
                        <ul>
                            <li><strong>#suggestions:</strong> Public feature requests</li>
                            <li><strong>AMA sessions:</strong> Direct team interaction</li>
                            <li><strong>Governance forum:</strong> Formal proposals</li>
                            <li><strong>Anonymous surveys:</strong> Honest feedback</li>
                            <li><strong>1:1 interviews:</strong> Deep user research</li>
                        </ul>

                        <div class="jm-best-practice">
                            <h4>Golden Rule</h4>
                            <p>Always close the loop. If you ask for feedback, report back what you did with it. Nothing kills engagement faster than feeling unheard.</p>
                        </div>
                    `,
                    keyPoints: [
                        'Create clear feedback channels',
                        'Analyze before acting',
                        'Always close the loop',
                        'Thank contributors publicly'
                    ]
                }
            ]
        },

        eventManagement: {
            id: 'cert-community-events',
            title: 'Community Events & Programs',
            theme: 'verify',
            description: 'Run successful community events and engagement programs.',

            lessons: [
                {
                    title: 'Planning Community Events',
                    content: `
                        <h4>Event Types for Crypto Communities</h4>

                        <div class="jm-event-types">
                            <div class="jm-event-type">
                                <h5>🎤 AMAs (Ask Me Anything)</h5>
                                <p>Direct team-community interaction. Great for updates and transparency.</p>
                                <div class="jm-event-tips">
                                    <strong>Tips:</strong> Collect questions beforehand, time-box, record for async viewing
                                </div>
                            </div>
                            <div class="jm-event-type">
                                <h5>🏆 Competitions & Hackathons</h5>
                                <p>Drive engagement and surface talent. Build with rewards.</p>
                                <div class="jm-event-tips">
                                    <strong>Tips:</strong> Clear rules, fair judging, meaningful prizes
                                </div>
                            </div>
                            <div class="jm-event-type">
                                <h5>📚 Educational Workshops</h5>
                                <p>Teach skills, increase competence. Builds loyalty.</p>
                                <div class="jm-event-tips">
                                    <strong>Tips:</strong> Record everything, provide resources, follow up
                                </div>
                            </div>
                            <div class="jm-event-type">
                                <h5>🎮 Social Events</h5>
                                <p>Game nights, meme contests, celebrations. Pure community fun.</p>
                                <div class="jm-event-tips">
                                    <strong>Tips:</strong> Keep it light, inclusive, celebrate wins
                                </div>
                            </div>
                        </div>

                        <h4>Event Planning Checklist</h4>
                        <div class="jm-checklist">
                            <div class="jm-check-item">☐ Define clear objectives</div>
                            <div class="jm-check-item">☐ Set date/time (consider timezones)</div>
                            <div class="jm-check-item">☐ Prepare content/speakers</div>
                            <div class="jm-check-item">☐ Promote 1-2 weeks ahead</div>
                            <div class="jm-check-item">☐ Test tech setup</div>
                            <div class="jm-check-item">☐ Have backup plans</div>
                            <div class="jm-check-item">☐ Record for archives</div>
                            <div class="jm-check-item">☐ Follow up with recap</div>
                        </div>
                    `,
                    keyPoints: [
                        'Match event type to goals',
                        'Plan with timezone awareness',
                        'Always record events',
                        'Follow up is crucial'
                    ]
                },
                {
                    title: 'Ambassador & Contributor Programs',
                    content: `
                        <h4>Building a Contributor Ecosystem</h4>

                        <div class="jm-contributor-tiers">
                            <div class="jm-tier">
                                <h5>🌱 Newcomers</h5>
                                <p>First-time contributors</p>
                                <ul>
                                    <li>Welcome resources</li>
                                    <li>Easy first tasks</li>
                                    <li>Mentorship pairing</li>
                                </ul>
                            </div>
                            <div class="jm-tier">
                                <h5>⭐ Active Contributors</h5>
                                <p>Regular participants</p>
                                <ul>
                                    <li>Specialized roles</li>
                                    <li>Access to resources</li>
                                    <li>Recognition badges</li>
                                </ul>
                            </div>
                            <div class="jm-tier">
                                <h5>🏅 Ambassadors</h5>
                                <p>Community leaders</p>
                                <ul>
                                    <li>Official representation</li>
                                    <li>Compensation/rewards</li>
                                    <li>Direct team access</li>
                                </ul>
                            </div>
                            <div class="jm-tier">
                                <h5>💎 Core Contributors</h5>
                                <p>Essential team members</p>
                                <ul>
                                    <li>Full-time engagement</li>
                                    <li>Decision-making power</li>
                                    <li>Token allocation</li>
                                </ul>
                            </div>
                        </div>

                        <h4>Ambassador Program Structure</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Component</th>
                                <th>Description</th>
                            </tr>
                            <tr>
                                <td>Application Process</td>
                                <td>Clear criteria, fair selection</td>
                            </tr>
                            <tr>
                                <td>Onboarding</td>
                                <td>Training, resources, expectations</td>
                            </tr>
                            <tr>
                                <td>Tasks & KPIs</td>
                                <td>Clear deliverables, measurable impact</td>
                            </tr>
                            <tr>
                                <td>Rewards</td>
                                <td>Tokens, merch, recognition, access</td>
                            </tr>
                            <tr>
                                <td>Evaluation</td>
                                <td>Regular reviews, feedback, growth paths</td>
                            </tr>
                        </table>
                    `,
                    keyPoints: [
                        'Create clear progression paths',
                        'Reward consistent contributors',
                        'Provide real responsibilities',
                        'Build genuine relationships'
                    ]
                }
            ]
        },

        crisisManagement: {
            id: 'cert-community-crisis',
            title: 'Crisis Management',
            theme: 'burn',
            description: 'Handle community crises and protect your project.',

            lessons: [
                {
                    title: 'Crisis Response Framework',
                    content: `
                        <h4>Types of Community Crises</h4>

                        <div class="jm-crisis-types">
                            <div class="jm-crisis">
                                <span class="jm-crisis-icon">🔐</span>
                                <h5>Security Incidents</h5>
                                <p>Hacks, exploits, vulnerabilities</p>
                            </div>
                            <div class="jm-crisis">
                                <span class="jm-crisis-icon">📉</span>
                                <h5>Market Events</h5>
                                <p>Price crashes, liquidity crises</p>
                            </div>
                            <div class="jm-crisis">
                                <span class="jm-crisis-icon">🗣️</span>
                                <h5>FUD Campaigns</h5>
                                <p>Coordinated attacks, misinformation</p>
                            </div>
                            <div class="jm-crisis">
                                <span class="jm-crisis-icon">⚠️</span>
                                <h5>Team Issues</h5>
                                <p>Departures, disputes, misconduct</p>
                            </div>
                        </div>

                        <h4>ASDF Crisis Response Protocol</h4>
                        <div class="jm-protocol">
                            <div class="jm-protocol-step critical">
                                <h5>🔴 IMMEDIATE (0-1 hour)</h5>
                                <ul>
                                    <li>Assess severity and scope</li>
                                    <li>Activate response team</li>
                                    <li>Secure assets if needed</li>
                                    <li>Draft initial statement</li>
                                </ul>
                            </div>
                            <div class="jm-protocol-step urgent">
                                <h5>🟠 SHORT-TERM (1-24 hours)</h5>
                                <ul>
                                    <li>Communicate to community</li>
                                    <li>Investigate root cause</li>
                                    <li>Implement immediate fixes</li>
                                    <li>Monitor sentiment</li>
                                </ul>
                            </div>
                            <div class="jm-protocol-step important">
                                <h5>🟡 MEDIUM-TERM (1-7 days)</h5>
                                <ul>
                                    <li>Detailed post-mortem</li>
                                    <li>Compensation if needed</li>
                                    <li>Process improvements</li>
                                    <li>Rebuild confidence</li>
                                </ul>
                            </div>
                        </div>

                        <div class="jm-warning">
                            <strong>Golden Rule:</strong> Communicate early, even if you don't have all the answers. Silence is worse than uncertainty.
                        </div>
                    `,
                    keyPoints: [
                        'Speed of response matters',
                        'Communicate transparently',
                        'Take responsibility',
                        'Learn and improve'
                    ]
                },
                {
                    title: 'Communication During Crisis',
                    content: `
                        <h4>Crisis Communication Framework</h4>

                        <div class="jm-comm-framework">
                            <div class="jm-comm-principle">
                                <h5>🎯 Be Direct</h5>
                                <p>State the facts clearly. No spin, no minimizing.</p>
                            </div>
                            <div class="jm-comm-principle">
                                <h5>⏰ Be Timely</h5>
                                <p>First update within 1 hour, even if just acknowledging.</p>
                            </div>
                            <div class="jm-comm-principle">
                                <h5>🔄 Be Consistent</h5>
                                <p>Same message across all channels. Single source of truth.</p>
                            </div>
                            <div class="jm-comm-principle">
                                <h5>❤️ Be Human</h5>
                                <p>Acknowledge impact on community. Show you care.</p>
                            </div>
                        </div>

                        <h4>Statement Template</h4>
                        <div class="jm-template">
                            <div class="jm-template-section">
                                <strong>1. Acknowledge:</strong>
                                <p>"We are aware of [situation] affecting [scope]."</p>
                            </div>
                            <div class="jm-template-section">
                                <strong>2. Current Status:</strong>
                                <p>"We are currently [actions being taken]."</p>
                            </div>
                            <div class="jm-template-section">
                                <strong>3. Impact:</strong>
                                <p>"This affects [who/what]. Funds are [safe/at risk]."</p>
                            </div>
                            <div class="jm-template-section">
                                <strong>4. Next Steps:</strong>
                                <p>"We will provide an update by [time]."</p>
                            </div>
                            <div class="jm-template-section">
                                <strong>5. Where to Follow:</strong>
                                <p>"Follow [official channel] for updates."</p>
                            </div>
                        </div>

                        <div class="jm-best-practice">
                            <h4>What NOT to Do</h4>
                            <ul>
                                <li>❌ Delete negative comments</li>
                                <li>❌ Blame others before investigation</li>
                                <li>❌ Make promises you can't keep</li>
                                <li>❌ Go silent for extended periods</li>
                                <li>❌ Let multiple people post conflicting info</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Speed beats perfection',
                        'Honesty builds trust',
                        'One voice, one message',
                        'Keep community updated'
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

// ============================================
// CERTIFICATION DATA TRACKER
// ============================================

const CertificationTracker = (function() {
    'use strict';

    const STORAGE_KEY = 'asdf_certification_data';
    const VERSION = '1.0.0';

    // Default data structure
    const defaultData = {
        version: VERSION,
        userId: null,
        walletAddress: null,
        startedAt: null,
        lastUpdated: null,

        // Module Progress
        moduleProgress: {
            code: { started: false, completedLessons: [], quizScores: [], timeSpent: 0 },
            design: { started: false, completedLessons: [], quizScores: [], timeSpent: 0 },
            content: { started: false, completedLessons: [], quizScores: [], timeSpent: 0 },
            community: { started: false, completedLessons: [], quizScores: [], timeSpent: 0 }
        },

        // Assessment Results
        assessment: {
            started: false,
            completedAt: null,
            sections: {
                code: { score: 0, maxScore: 0, answers: [], timeSpent: 0 },
                design: { score: 0, maxScore: 0, answers: [], timeSpent: 0 },
                content: { score: 0, maxScore: 0, answers: [], timeSpent: 0 },
                community: { score: 0, maxScore: 0, answers: [], timeSpent: 0 }
            },
            totalScore: 0,
            passed: false
        },

        // Capstone Project
        capstone: {
            selectedProject: null,
            submittedAt: null,
            projectUrl: null,
            repoUrl: null,
            demoUrl: null,
            description: null,
            rubricScores: {},
            feedback: null,
            status: 'not_started' // not_started, in_progress, submitted, approved, rejected
        },

        // Certification Status
        certification: {
            eligible: false,
            earnedAt: null,
            badgeId: null,
            nftMintAddress: null,
            txSignature: null
        },

        // Analytics
        analytics: {
            totalTimeSpent: 0,
            sessionsCount: 0,
            lastSessionStart: null,
            interactions: []
        }
    };

    // Validate data schema
    function validateData(data) {
        if (typeof data !== 'object' || data === null) return false;
        if (typeof data.version !== 'string') return false;
        if (typeof data.moduleProgress !== 'object') return false;
        if (typeof data.assessment !== 'object') return false;
        if (typeof data.capstone !== 'object') return false;
        if (typeof data.certification !== 'object') return false;
        return true;
    }

    // Load data from localStorage
    function loadData() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (validateData(parsed)) {
                    return { ...defaultData, ...parsed };
                }
                console.warn('Invalid certification data, resetting');
            }
            return { ...defaultData };
        } catch (e) {
            console.warn('Error loading certification data');
            return { ...defaultData };
        }
    }

    // Save data to localStorage
    function saveData(data) {
        try {
            data.lastUpdated = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.warn('Could not save certification data');
            return false;
        }
    }

    // Generate unique session ID
    function generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    return {
        // Initialize tracker
        init(userId = null, walletAddress = null) {
            const data = loadData();
            if (!data.startedAt) {
                data.startedAt = new Date().toISOString();
            }
            if (userId) data.userId = userId;
            if (walletAddress) data.walletAddress = walletAddress;
            data.analytics.sessionsCount++;
            data.analytics.lastSessionStart = new Date().toISOString();
            saveData(data);
            return data;
        },

        // Get current data
        getData() {
            return loadData();
        },

        // Set user info
        setUserInfo(userId, walletAddress) {
            const data = loadData();
            if (userId) data.userId = userId;
            if (walletAddress) data.walletAddress = walletAddress;
            saveData(data);
        },

        // ========== MODULE PROGRESS ==========

        startModule(pillar, moduleId) {
            const data = loadData();
            if (data.moduleProgress[pillar]) {
                data.moduleProgress[pillar].started = true;
                data.moduleProgress[pillar].startedAt = new Date().toISOString();
                this.trackInteraction('module_start', { pillar, moduleId });
            }
            saveData(data);
        },

        completeLesson(pillar, lessonId, timeSpent = 0) {
            const data = loadData();
            if (data.moduleProgress[pillar]) {
                if (!data.moduleProgress[pillar].completedLessons.includes(lessonId)) {
                    data.moduleProgress[pillar].completedLessons.push(lessonId);
                }
                data.moduleProgress[pillar].timeSpent += timeSpent;
                data.analytics.totalTimeSpent += timeSpent;
                this.trackInteraction('lesson_complete', { pillar, lessonId, timeSpent });
            }
            saveData(data);
        },

        recordQuizScore(pillar, quizId, score, maxScore, answers) {
            const data = loadData();
            if (data.moduleProgress[pillar]) {
                data.moduleProgress[pillar].quizScores.push({
                    quizId,
                    score,
                    maxScore,
                    percentage: Math.round((score / maxScore) * 100),
                    answers,
                    completedAt: new Date().toISOString()
                });
                this.trackInteraction('quiz_complete', { pillar, quizId, score, maxScore });
            }
            saveData(data);
        },

        // ========== ASSESSMENT ==========

        startAssessment() {
            const data = loadData();
            data.assessment.started = true;
            data.assessment.startedAt = new Date().toISOString();
            this.trackInteraction('assessment_start', {});
            saveData(data);
        },

        recordAssessmentSection(section, score, maxScore, answers, timeSpent) {
            const data = loadData();
            if (data.assessment.sections[section]) {
                data.assessment.sections[section] = {
                    score,
                    maxScore,
                    percentage: Math.round((score / maxScore) * 100),
                    answers,
                    timeSpent,
                    completedAt: new Date().toISOString()
                };
                this.trackInteraction('assessment_section_complete', { section, score, maxScore });
            }
            saveData(data);
        },

        completeAssessment() {
            const data = loadData();
            let totalScore = 0;
            let totalMax = 0;

            Object.values(data.assessment.sections).forEach(section => {
                totalScore += section.score || 0;
                totalMax += section.maxScore || 0;
            });

            data.assessment.totalScore = totalScore;
            data.assessment.totalMaxScore = totalMax;
            data.assessment.percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
            data.assessment.passed = data.assessment.percentage >= 70;
            data.assessment.completedAt = new Date().toISOString();

            this.trackInteraction('assessment_complete', {
                totalScore,
                totalMax,
                passed: data.assessment.passed
            });
            saveData(data);
            return data.assessment;
        },

        // ========== CAPSTONE PROJECT ==========

        selectCapstoneProject(projectId, projectName) {
            const data = loadData();
            data.capstone.selectedProject = { id: projectId, name: projectName };
            data.capstone.status = 'in_progress';
            data.capstone.selectedAt = new Date().toISOString();
            this.trackInteraction('capstone_select', { projectId, projectName });
            saveData(data);
        },

        updateCapstoneProgress(updates) {
            const data = loadData();
            Object.assign(data.capstone, updates);
            data.capstone.lastUpdated = new Date().toISOString();
            saveData(data);
        },

        submitCapstone(projectUrl, repoUrl, demoUrl, description) {
            const data = loadData();
            data.capstone.projectUrl = projectUrl;
            data.capstone.repoUrl = repoUrl;
            data.capstone.demoUrl = demoUrl;
            data.capstone.description = description;
            data.capstone.status = 'submitted';
            data.capstone.submittedAt = new Date().toISOString();
            this.trackInteraction('capstone_submit', { projectUrl, repoUrl });
            saveData(data);
            return data.capstone;
        },

        // ========== CERTIFICATION ==========

        checkAndUpdateEligibility() {
            const data = loadData();
            const JC = window.JourneyCertification;

            if (JC) {
                const allModules = JC.getAllModules().map(m => m.id);
                const completedModules = [];

                // Gather completed modules from all pillars
                Object.entries(data.moduleProgress).forEach(([pillar, progress]) => {
                    if (progress.completedLessons && progress.completedLessons.length > 0) {
                        completedModules.push(...progress.completedLessons);
                    }
                });

                const eligibility = JC.checkCertificationEligibility(completedModules);
                data.certification.eligible = eligibility.eligible && data.assessment.passed;
                data.certification.eligibilityCheck = {
                    modulesCompleted: eligibility.completed,
                    modulesTotal: eligibility.total,
                    assessmentPassed: data.assessment.passed,
                    checkedAt: new Date().toISOString()
                };
            }
            saveData(data);
            return data.certification;
        },

        earnCertification(badgeId, nftMintAddress = null, txSignature = null) {
            const data = loadData();
            data.certification.earned = true;
            data.certification.earnedAt = new Date().toISOString();
            data.certification.badgeId = badgeId;
            data.certification.nftMintAddress = nftMintAddress;
            data.certification.txSignature = txSignature;
            this.trackInteraction('certification_earned', { badgeId, nftMintAddress });
            saveData(data);
            return data.certification;
        },

        // ========== ANALYTICS ==========

        trackInteraction(type, details) {
            const data = loadData();
            data.analytics.interactions.push({
                type,
                details,
                timestamp: new Date().toISOString()
            });
            // Keep only last 500 interactions to prevent bloat
            if (data.analytics.interactions.length > 500) {
                data.analytics.interactions = data.analytics.interactions.slice(-500);
            }
            saveData(data);
        },

        updateTimeSpent(seconds) {
            const data = loadData();
            data.analytics.totalTimeSpent += seconds;
            saveData(data);
        },

        // ========== EXPORT FUNCTIONS ==========

        // Export all data as JSON
        exportJSON() {
            const data = loadData();
            return JSON.stringify(data, null, 2);
        },

        // Export as downloadable file
        downloadExport(filename = 'asdf-certification-data.json') {
            const json = this.exportJSON();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // Get summary for display
        getSummary() {
            const data = loadData();

            const moduleStats = {};
            Object.entries(data.moduleProgress).forEach(([pillar, progress]) => {
                moduleStats[pillar] = {
                    lessonsCompleted: progress.completedLessons.length,
                    quizzesCompleted: progress.quizScores.length,
                    averageQuizScore: progress.quizScores.length > 0
                        ? Math.round(progress.quizScores.reduce((sum, q) => sum + q.percentage, 0) / progress.quizScores.length)
                        : 0,
                    timeSpent: progress.timeSpent
                };
            });

            return {
                userId: data.userId,
                walletAddress: data.walletAddress,
                startedAt: data.startedAt,
                lastUpdated: data.lastUpdated,
                moduleStats,
                assessment: {
                    completed: !!data.assessment.completedAt,
                    score: data.assessment.percentage || 0,
                    passed: data.assessment.passed
                },
                capstone: {
                    status: data.capstone.status,
                    project: data.capstone.selectedProject?.name || null
                },
                certification: {
                    eligible: data.certification.eligible,
                    earned: data.certification.earned || false,
                    earnedAt: data.certification.earnedAt
                },
                totalTimeSpent: data.analytics.totalTimeSpent,
                sessionsCount: data.analytics.sessionsCount
            };
        },

        // Get raw data for API submission
        getSubmissionData() {
            const data = loadData();
            return {
                version: data.version,
                userId: data.userId,
                walletAddress: data.walletAddress,
                moduleProgress: data.moduleProgress,
                assessment: data.assessment,
                capstone: data.capstone,
                certification: data.certification,
                completedAt: data.certification.earnedAt || null
            };
        },

        // Reset all data
        reset() {
            localStorage.removeItem(STORAGE_KEY);
            return { ...defaultData };
        }
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.JourneyCertification = JourneyCertification;
    window.CertificationTracker = CertificationTracker;
}
