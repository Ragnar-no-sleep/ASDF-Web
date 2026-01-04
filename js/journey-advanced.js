/**
 * ASDF Journey - Advanced Educational Content
 * Deep technical modules for expert builders
 * Following "THIS IS FINE" philosophy
 *
 * Security: Input validation, XSS prevention
 * Version: 1.0.0
 */

'use strict';

const JourneyAdvanced = (function() {

    // ============================================
    // ADVANCED CODE & DEV MODULES
    // ============================================

    const ADVANCED_CODE = {
        // Module: Advanced Solana Patterns
        solanaPatterns: {
            id: 'code-adv-patterns',
            title: 'Advanced Solana Patterns',
            theme: 'fibonacci',
            description: 'Master complex Solana development patterns used in production.',

            lessons: [
                {
                    title: 'Program Derived Addresses (PDAs)',
                    content: `
                        <p><strong>PDAs</strong> are deterministic addresses that programs can sign for. They're fundamental to Solana's security model.</p>

                        <h4>Why PDAs Matter</h4>
                        <ul>
                            <li>Allow programs to "own" accounts without private keys</li>
                            <li>Create deterministic addresses from seeds</li>
                            <li>Enable secure cross-program invocations</li>
                        </ul>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Deriving a PDA</div>
                            <pre><code>import { PublicKey } from '@solana/web3.js';

// Derive a PDA for a user's account
const [pda, bump] = PublicKey.findProgramAddressSync(
    [
        Buffer.from('user-account'),
        userPubkey.toBuffer(),
    ],
    programId
);

// The bump ensures the address is off the ed25519 curve
console.log('PDA:', pda.toString());
console.log('Bump:', bump);</code></pre>
                        </div>

                        <div class="jm-tip">
                            <strong>ASDF Pattern:</strong> Store the bump seed on-chain to avoid recalculating it. This saves compute units (Fibonacci efficiency!).
                        </div>
                    `,
                    keyPoints: [
                        'PDAs are deterministic - same seeds = same address',
                        'Programs can sign for PDAs they own',
                        'Bump seeds push addresses off the curve',
                        'Cache bump seeds for efficiency'
                    ]
                },
                {
                    title: 'Cross-Program Invocations (CPI)',
                    content: `
                        <p><strong>CPIs</strong> let programs call other programs. This is how composability works on Solana.</p>

                        <h4>CPI Security Considerations</h4>
                        <ul>
                            <li>Verify the program you're calling is authentic</li>
                            <li>Signer privileges are inherited through CPI</li>
                            <li>PDAs can sign for nested CPIs</li>
                        </ul>

                        <div class="jm-code-block">
                            <div class="jm-code-title">CPI with PDA Signer</div>
                            <pre><code>// In your Anchor program
use anchor_lang::prelude::*;

pub fn transfer_with_pda(ctx: Context<Transfer>, amount: u64) -> Result<()> {
    let seeds = &[
        b"vault",
        ctx.accounts.user.key().as_ref(),
        &[ctx.accounts.vault.bump],
    ];
    let signer = &[&seeds[..]];

    // CPI to token program with PDA as signer
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_token.to_account_info(),
            to: ctx.accounts.user_token.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        signer,
    );

    token::transfer(cpi_ctx, amount)
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'CPIs enable program composability',
                        'Always verify called program authenticity',
                        'PDA signers work through CPI chains'
                    ]
                },
                {
                    title: 'Account Validation Patterns',
                    content: `
                        <p>Proper account validation prevents exploits. These patterns are essential for secure programs.</p>

                        <h4>Anchor Constraints</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Secure Account Validation</div>
                            <pre><code>#[derive(Accounts)]
pub struct SecureInstruction<'info> {
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_account.bump,
        has_one = authority @ ErrorCode::InvalidAuthority,
        constraint = user_account.is_active @ ErrorCode::AccountInactive
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Validated by constraint
    #[account(
        constraint = vault.key() == user_account.vault @ ErrorCode::InvalidVault
    )]
    pub vault: AccountInfo<'info>,
}</code></pre>
                        </div>

                        <div class="jm-warning">
                            <strong>Security Checklist:</strong>
                            <ul>
                                <li>Always verify account ownership</li>
                                <li>Check PDAs match expected seeds</li>
                                <li>Validate signer permissions</li>
                                <li>Use has_one for linked accounts</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Account validation prevents exploits',
                        'Use Anchor constraints for declarative validation',
                        'Always verify ownership and permissions'
                    ]
                }
            ],

            quiz: {
                id: 'adv-solana-quiz',
                title: 'Solana Patterns Mastery',
                questions: [
                    {
                        question: 'What does a PDA bump seed do?',
                        options: [
                            'Encrypts the address',
                            'Pushes the address off the ed25519 curve',
                            'Speeds up transactions',
                            'Reduces fees'
                        ],
                        correct: 1,
                        explanation: 'The bump ensures the derived address is not a valid public key, allowing programs to sign for it.'
                    },
                    {
                        question: 'In a CPI, what happens to signer privileges?',
                        options: [
                            'They are removed',
                            'They are inherited by the called program',
                            'They require re-signing',
                            'They double'
                        ],
                        correct: 1,
                        explanation: 'Signer privileges flow through CPI chains, enabling composability.'
                    },
                    {
                        question: 'Why should you cache PDA bump seeds on-chain?',
                        options: [
                            'For security',
                            'To save compute units',
                            'To change the address',
                            'For encryption'
                        ],
                        correct: 1,
                        explanation: 'Finding PDAs costs compute units. Caching the bump avoids recalculation.'
                    }
                ]
            },

            challenge: {
                id: 'pda-challenge',
                type: 'code',
                title: 'PDA Derivation Challenge',
                instruction: 'Derive the correct PDA for an ASDF user vault.',
                starterCode: `const { PublicKey } = require('@solana/web3.js');

const PROGRAM_ID = new PublicKey('ASdfProgram111111111111111111111111111111');
const USER = new PublicKey('User1111111111111111111111111111111111111');

// Derive PDA for user vault
// Seeds: ["vault", user_pubkey]
function deriveVaultPDA(user, programId) {
    // Your code here

}

const [vaultPDA, bump] = deriveVaultPDA(USER, PROGRAM_ID);
console.log('Vault PDA:', vaultPDA.toString());`,
                solution: `function deriveVaultPDA(user, programId) {
    return PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), user.toBuffer()],
        programId
    );
}`,
                hints: [
                    'Use PublicKey.findProgramAddressSync()',
                    'Seeds must be Buffer arrays',
                    'Buffer.from() converts strings to buffers'
                ]
            }
        },

        // Module: DeFi Integration
        defiIntegration: {
            id: 'code-adv-defi',
            title: 'DeFi Protocol Integration',
            theme: 'burn',
            description: 'Learn to integrate with Solana DeFi protocols.',

            lessons: [
                {
                    title: 'Understanding AMMs',
                    content: `
                        <p><strong>Automated Market Makers (AMMs)</strong> power decentralized trading. Understanding them is crucial for DeFi development.</p>

                        <h4>The Constant Product Formula</h4>
                        <p>Most AMMs use: <code>x * y = k</code></p>
                        <ul>
                            <li><strong>x</strong> = Reserve of token A</li>
                            <li><strong>y</strong> = Reserve of token B</li>
                            <li><strong>k</strong> = Constant (changes only on deposits/withdrawals)</li>
                        </ul>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Calculate Swap Output</div>
                            <pre><code>function calculateSwapOutput(
    amountIn,
    reserveIn,
    reserveOut,
    feeBps = 30 // 0.3% fee
) {
    // Apply fee
    const amountInWithFee = amountIn * (10000 - feeBps) / 10000;

    // Constant product formula
    // (reserveIn + amountIn) * (reserveOut - amountOut) = k
    // Solving for amountOut:
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;

    return Math.floor(numerator / denominator);
}

// Example: Swap 100 tokens
const output = calculateSwapOutput(100, 10000, 5000);
console.log('Output:', output); // ~49 tokens</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'x * y = k is the fundamental AMM formula',
                        'Larger trades have more slippage',
                        'Fees are deducted before calculation'
                    ]
                },
                {
                    title: 'Reading Pool Data',
                    content: `
                        <p>To build trading tools, you need to read pool data from Solana.</p>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Fetch Pool Reserves</div>
                            <pre><code>async function getPoolReserves(connection, poolAddress) {
    // Fetch the pool account
    const accountInfo = await connection.getAccountInfo(
        new PublicKey(poolAddress)
    );

    if (!accountInfo) {
        throw new Error('Pool not found');
    }

    // Parse based on pool layout (varies by DEX)
    // This example assumes a simple layout
    const data = accountInfo.data;

    // Read token reserves (positions vary by DEX)
    const tokenAReserve = data.readBigUInt64LE(72);
    const tokenBReserve = data.readBigUInt64LE(80);

    return {
        tokenA: Number(tokenAReserve),
        tokenB: Number(tokenBReserve),
        price: Number(tokenBReserve) / Number(tokenAReserve)
    };
}

// Calculate price impact
function calculatePriceImpact(amountIn, reserveIn, reserveOut) {
    const spotPrice = reserveOut / reserveIn;
    const output = calculateSwapOutput(amountIn, reserveIn, reserveOut);
    const executionPrice = output / amountIn;

    return ((spotPrice - executionPrice) / spotPrice) * 100;
}</code></pre>
                        </div>

                        <div class="jm-tip">
                            <strong>ASDF Tip:</strong> Price impact above 1% is usually too high. Consider splitting into multiple smaller trades.
                        </div>
                    `,
                    keyPoints: [
                        'Each DEX has different account layouts',
                        'Always calculate price impact before trading',
                        'Monitor liquidity depth'
                    ]
                },
                {
                    title: 'Building a Price Monitor',
                    content: `
                        <p>Real-time price monitoring is essential for trading bots and analytics.</p>

                        <div class="jm-code-block">
                            <div class="jm-code-title">WebSocket Price Monitor</div>
                            <pre><code>class PriceMonitor {
    constructor(connection, poolAddress) {
        this.connection = connection;
        this.poolAddress = new PublicKey(poolAddress);
        this.subscriptionId = null;
        this.callbacks = [];
    }

    async subscribe(callback) {
        this.callbacks.push(callback);

        if (this.subscriptionId) return;

        // Subscribe to account changes
        this.subscriptionId = this.connection.onAccountChange(
            this.poolAddress,
            async (accountInfo) => {
                const reserves = this.parseReserves(accountInfo.data);
                const price = reserves.tokenB / reserves.tokenA;

                // Notify all callbacks
                this.callbacks.forEach(cb => cb({
                    price,
                    reserves,
                    timestamp: Date.now()
                }));
            },
            'confirmed'
        );
    }

    unsubscribe() {
        if (this.subscriptionId) {
            this.connection.removeAccountChangeListener(this.subscriptionId);
            this.subscriptionId = null;
        }
    }

    parseReserves(data) {
        // DEX-specific parsing
        return {
            tokenA: data.readBigUInt64LE(72),
            tokenB: data.readBigUInt64LE(80)
        };
    }
}

// Usage
const monitor = new PriceMonitor(connection, 'PoolAddress...');
monitor.subscribe(({ price, timestamp }) =&gt; {
    console.log(\`[&#36;{new Date(timestamp).toISOString()}] Price: &#36;{price}\`);
});</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'WebSocket subscriptions enable real-time updates',
                        'Parse account data based on DEX layout',
                        'Handle connection drops gracefully'
                    ]
                }
            ],

            quiz: {
                id: 'defi-integration-quiz',
                title: 'DeFi Integration Mastery',
                questions: [
                    {
                        question: 'In the AMM formula x*y=k, what happens to k during a swap?',
                        options: [
                            'It increases',
                            'It decreases',
                            'It stays constant',
                            'It fluctuates'
                        ],
                        correct: 2,
                        explanation: 'During swaps, k remains constant. It only changes during liquidity additions/removals.'
                    },
                    {
                        question: 'Why do larger trades have more price impact?',
                        options: [
                            'Higher fees',
                            'The curve becomes steeper with less remaining liquidity',
                            'Network congestion',
                            'Token supply increases'
                        ],
                        correct: 1,
                        explanation: 'As you trade more, you move further along the curve where each unit costs more.'
                    }
                ]
            }
        },

        // Module: Security & Auditing
        securityAuditing: {
            id: 'code-adv-security',
            title: 'Security & Smart Contract Auditing',
            theme: 'verify',
            description: 'Learn to identify and prevent common vulnerabilities.',

            lessons: [
                {
                    title: 'Common Vulnerabilities',
                    content: `
                        <p>Understanding attack vectors is the first step to building secure programs.</p>

                        <h4>Top Solana Vulnerabilities</h4>
                        <div class="jm-vulnerability-list">
                            <div class="jm-vuln-item jm-vuln-critical">
                                <span class="jm-vuln-severity">CRITICAL</span>
                                <strong>Missing Signer Checks</strong>
                                <p>Not verifying that critical accounts are signers.</p>
                                <code>// BAD: No signer check
#[account(mut)]
pub authority: AccountInfo<'info>,

// GOOD: Require signature
#[account(mut)]
pub authority: Signer<'info>,</code>
                            </div>

                            <div class="jm-vuln-item jm-vuln-critical">
                                <span class="jm-vuln-severity">CRITICAL</span>
                                <strong>Missing Owner Checks</strong>
                                <p>Not verifying account owners match expected programs.</p>
                                <code>// Always verify owner
require!(
    account.owner == &expected_program,
    ErrorCode::InvalidOwner
);</code>
                            </div>

                            <div class="jm-vuln-item jm-vuln-high">
                                <span class="jm-vuln-severity">HIGH</span>
                                <strong>Integer Overflow/Underflow</strong>
                                <p>Arithmetic operations without bounds checking.</p>
                                <code>// Use checked arithmetic
let result = amount.checked_add(fee)
    .ok_or(ErrorCode::Overflow)?;</code>
                            </div>

                            <div class="jm-vuln-item jm-vuln-medium">
                                <span class="jm-vuln-severity">MEDIUM</span>
                                <strong>Reentrancy</strong>
                                <p>State changes after external calls.</p>
                                <code>// Update state BEFORE CPI
user.balance = user.balance.checked_sub(amount)?;
// THEN make external call
token::transfer(ctx, amount)?;</code>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Always verify signers and owners',
                        'Use checked arithmetic for all math',
                        'Update state before external calls'
                    ]
                },
                {
                    title: 'Audit Checklist',
                    content: `
                        <p>Use this checklist when reviewing Solana programs.</p>

                        <div class="jm-checklist">
                            <h4>Access Control</h4>
                            <ul>
                                <li>All privileged functions require proper signers</li>
                                <li>Authority accounts are validated</li>
                                <li>PDAs use correct seeds and bumps</li>
                            </ul>

                            <h4>Account Validation</h4>
                            <ul>
                                <li>All accounts have owner checks</li>
                                <li>Account types match expectations</li>
                                <li>Account data sizes are validated</li>
                            </ul>

                            <h4>Arithmetic</h4>
                            <ul>
                                <li>All math uses checked operations</li>
                                <li>Division by zero is prevented</li>
                                <li>Token decimals are handled correctly</li>
                            </ul>

                            <h4>Logic</h4>
                            <ul>
                                <li>State updates occur before CPIs</li>
                                <li>All edge cases are handled</li>
                                <li>Error messages are descriptive</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Follow the checklist for every audit',
                        'Document all findings',
                        'Test edge cases thoroughly'
                    ]
                }
            ],

            challenge: {
                id: 'security-audit',
                type: 'matching',
                title: 'Vulnerability Identification',
                instruction: 'Match each vulnerability to its fix.',
                pairs: [
                    { left: 'Missing signer check', right: 'Use Signer<\'info> type', leftIcon: '🔓', rightIcon: '🔐' },
                    { left: 'Integer overflow', right: 'Use checked_add/sub/mul', leftIcon: '📈', rightIcon: '✅' },
                    { left: 'Reentrancy', right: 'Update state before CPI', leftIcon: '🔄', rightIcon: '1️⃣' },
                    { left: 'Wrong owner', right: 'Validate account.owner', leftIcon: '❓', rightIcon: '👤' },
                    { left: 'PDA mismatch', right: 'Verify seeds and bump', leftIcon: '🎲', rightIcon: '🌱' }
                ]
            }
        }
    };

    // ============================================
    // ADVANCED DESIGN & UX MODULES
    // ============================================

    const ADVANCED_DESIGN = {
        // Module: Design Systems
        designSystems: {
            id: 'design-adv-systems',
            title: 'Building Scalable Design Systems',
            theme: 'fibonacci',
            description: 'Create consistent, maintainable design systems for crypto projects.',

            lessons: [
                {
                    title: 'Token-Based Design',
                    content: `
                        <p>Design tokens are the atoms of your design system. ASDF uses Fibonacci-based tokens.</p>

                        <h4>ASDF Token Structure</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">design-tokens.css</div>
                            <pre><code>:root {
    /* Fibonacci Spacing (3, 5, 8, 13, 21, 34, 55) */
    --space-xs: 3px;
    --space-sm: 5px;
    --space-md: 8px;
    --space-lg: 13px;
    --space-xl: 21px;
    --space-2xl: 34px;
    --space-3xl: 55px;

    /* Fire Palette */
    --color-ember: #6b7280;
    --color-spark: #fbbf24;
    --color-flame: #f97316;
    --color-blaze: #ef4444;
    --color-inferno: #dc2626;

    /* Typography Scale (Fibonacci ratios) */
    --font-xs: 0.75rem;   /* 12px */
    --font-sm: 0.875rem;  /* 14px */
    --font-base: 1rem;    /* 16px */
    --font-lg: 1.25rem;   /* 20px */
    --font-xl: 1.625rem;  /* 26px - ~golden ratio */
    --font-2xl: 2.625rem; /* 42px */

    /* Border Radius (Fibonacci) */
    --radius-sm: 5px;
    --radius-md: 8px;
    --radius-lg: 13px;
    --radius-xl: 21px;
}</code></pre>
                        </div>

                        <div class="jm-tip">
                            <strong>Why Fibonacci?</strong> The golden ratio (1.618) creates naturally pleasing proportions. It appears throughout nature and art.
                        </div>
                    `,
                    keyPoints: [
                        'Design tokens ensure consistency',
                        'Fibonacci creates natural harmony',
                        'Document all tokens thoroughly'
                    ]
                },
                {
                    title: 'Component Architecture',
                    content: `
                        <p>Build components from atoms to organisms following atomic design principles.</p>

                        <h4>ASDF Component Hierarchy</h4>
                        <div class="jm-hierarchy">
                            <div class="jm-hier-level">
                                <span class="jm-hier-type">Atoms</span>
                                <span class="jm-hier-examples">Buttons, Inputs, Icons, Labels</span>
                            </div>
                            <div class="jm-hier-arrow">↓</div>
                            <div class="jm-hier-level">
                                <span class="jm-hier-type">Molecules</span>
                                <span class="jm-hier-examples">Search bars, Stat cards, Token badges</span>
                            </div>
                            <div class="jm-hier-arrow">↓</div>
                            <div class="jm-hier-level">
                                <span class="jm-hier-type">Organisms</span>
                                <span class="jm-hier-examples">Navigation, Token panels, Burn trackers</span>
                            </div>
                            <div class="jm-hier-arrow">↓</div>
                            <div class="jm-hier-level">
                                <span class="jm-hier-type">Templates</span>
                                <span class="jm-hier-examples">Dashboard layout, Trade interface</span>
                            </div>
                            <div class="jm-hier-arrow">↓</div>
                            <div class="jm-hier-level">
                                <span class="jm-hier-type">Pages</span>
                                <span class="jm-hier-examples">Home, Learn, Games, Tools</span>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Start with atoms, build up',
                        'Components should be reusable',
                        'Document component APIs'
                    ]
                },
                {
                    title: 'Motion Design System',
                    content: `
                        <p>Consistent motion makes interfaces feel alive and polished.</p>

                        <h4>ASDF Animation Tokens</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">animation-tokens.css</div>
                            <pre><code>:root {
    /* Durations (Fibonacci-inspired: 0.1, 0.2, 0.3, 0.5) */
    --duration-instant: 0.1s;
    --duration-fast: 0.2s;
    --duration-normal: 0.3s;
    --duration-slow: 0.5s;

    /* Easings */
    --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
    --ease-in: cubic-bezier(0.4, 0.0, 1, 1);
    --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
    --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Standard transitions */
.btn {
    transition:
        transform var(--duration-fast) var(--ease-out),
        background var(--duration-fast) var(--ease-out);
}

.btn:hover {
    transform: translateY(-2px);
}

/* Fire animation for burns */
@keyframes burn-pulse {
    0%, 100% {
        box-shadow: 0 0 20px var(--color-flame);
        transform: scale(1);
    }
    50% {
        box-shadow: 0 0 40px var(--color-inferno);
        transform: scale(1.02);
    }
}

.burn-active {
    animation: burn-pulse 1s var(--ease-in-out) infinite;
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Consistent timing creates rhythm',
                        'Use appropriate easing curves',
                        'Motion should enhance, not distract'
                    ]
                }
            ],

            quiz: {
                id: 'design-systems-quiz',
                title: 'Design Systems Mastery',
                questions: [
                    {
                        question: 'What is the golden ratio approximately?',
                        options: ['1.414', '1.618', '2.0', '3.14'],
                        correct: 1,
                        explanation: 'The golden ratio is approximately 1.618 and appears in Fibonacci sequences.'
                    },
                    {
                        question: 'In atomic design, what comes between atoms and organisms?',
                        options: ['Templates', 'Molecules', 'Pages', 'Systems'],
                        correct: 1,
                        explanation: 'The hierarchy is: Atoms → Molecules → Organisms → Templates → Pages'
                    }
                ]
            }
        },

        // Module: Data Visualization
        dataVisualization: {
            id: 'design-adv-dataviz',
            title: 'Crypto Data Visualization',
            theme: 'verify',
            description: 'Design clear, accurate visualizations for blockchain data.',

            lessons: [
                {
                    title: 'Chart Design Principles',
                    content: `
                        <p>Good data visualization tells a story honestly and clearly.</p>

                        <h4>The Data-Ink Ratio</h4>
                        <p>Maximize the data-to-ink ratio. Remove chartjunk:</p>
                        <ul>
                            <li>No 3D effects</li>
                            <li>Minimal gridlines</li>
                            <li>Direct labels over legends when possible</li>
                            <li>No decorative elements</li>
                        </ul>

                        <h4>Color for Data</h4>
                        <ul>
                            <li><strong>Sequential:</strong> Low to high values (light to dark)</li>
                            <li><strong>Diverging:</strong> Negative to positive (red to green)</li>
                            <li><strong>Categorical:</strong> Distinct hues for categories</li>
                        </ul>

                        <div class="jm-tip">
                            <strong>ASDF Standard:</strong> Use green for gains, red for losses, orange for neutral/burns.
                        </div>
                    `,
                    keyPoints: [
                        'Maximize data-ink ratio',
                        'Choose appropriate color schemes',
                        'Label clearly and directly'
                    ]
                },
                {
                    title: 'Real-Time Data Displays',
                    content: `
                        <p>Crypto moves fast. Design for real-time updates without causing anxiety.</p>

                        <h4>Update Strategies</h4>
                        <ul>
                            <li><strong>Smooth transitions:</strong> Animate value changes</li>
                            <li><strong>Highlight changes:</strong> Brief flash on update</li>
                            <li><strong>History context:</strong> Show recent trend, not just current</li>
                            <li><strong>Rate limiting:</strong> Don't update faster than humans can read</li>
                        </ul>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Smooth Number Animation</div>
                            <pre><code>function animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out curve
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (range * eased);

        element.textContent = formatNumber(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Animate transitions smoothly',
                        'Provide context with history',
                        'Rate limit visual updates'
                    ]
                }
            ]
        }
    };

    // ============================================
    // ADVANCED CONTENT CREATION MODULES
    // ============================================

    const ADVANCED_CONTENT = {
        // Module: Thread Mastery
        threadMastery: {
            id: 'content-adv-threads',
            title: 'Viral Thread Engineering',
            theme: 'thisIsFine',
            description: 'Craft threads that educate and spread.',

            lessons: [
                {
                    title: 'Thread Architecture',
                    content: `
                        <p>Great threads follow a proven structure optimized for engagement.</p>

                        <h4>The ASDF Thread Formula</h4>
                        <div class="jm-thread-structure">
                            <div class="jm-thread-part">
                                <span class="jm-thread-num">1</span>
                                <strong>Hook (Tweet 1)</strong>
                                <p>Bold claim or question. Creates curiosity.</p>
                                <em>"Most people don't understand why ASDF burns tokens. Here's the math that changed my mind 🧵"</em>
                            </div>
                            <div class="jm-thread-part">
                                <span class="jm-thread-num">2-3</span>
                                <strong>Context</strong>
                                <p>Set the stage. What problem are we solving?</p>
                            </div>
                            <div class="jm-thread-part">
                                <span class="jm-thread-num">4-8</span>
                                <strong>Core Content</strong>
                                <p>The meat. One point per tweet. Use visuals.</p>
                            </div>
                            <div class="jm-thread-part">
                                <span class="jm-thread-num">9</span>
                                <strong>Summary</strong>
                                <p>Recap key points in bullet format.</p>
                            </div>
                            <div class="jm-thread-part">
                                <span class="jm-thread-num">10</span>
                                <strong>Call to Action</strong>
                                <p>What should readers do next? Follow, RT, join?</p>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Hook must create immediate curiosity',
                        'One concept per tweet',
                        'Always end with a clear CTA'
                    ]
                },
                {
                    title: 'Visual Content for Threads',
                    content: `
                        <p>Threads with visuals get 2-3x more engagement. Here's what works.</p>

                        <h4>High-Performing Visual Types</h4>
                        <ul>
                            <li><strong>Comparison charts:</strong> Before/after, us vs them</li>
                            <li><strong>Process diagrams:</strong> How something works</li>
                            <li><strong>Data visualizations:</strong> Proof with numbers</li>
                            <li><strong>Screenshots with annotations:</strong> Proof of concept</li>
                            <li><strong>Memes:</strong> Humor that makes a point</li>
                        </ul>

                        <h4>ASDF Visual Standards</h4>
                        <ul>
                            <li>Fire palette colors (orange, red, yellow)</li>
                            <li>Dark backgrounds (#0a0a0f or similar)</li>
                            <li>1200x675px for Twitter cards</li>
                            <li>High contrast text (white on dark)</li>
                            <li>Include ASDF branding subtly</li>
                        </ul>
                    `,
                    keyPoints: [
                        'Visuals dramatically boost engagement',
                        'Keep consistent brand styling',
                        'Size images for platform specs'
                    ]
                }
            ],

            challenge: {
                id: 'thread-structure',
                type: 'drag-drop',
                title: 'Build a Thread',
                instruction: 'Arrange these elements in the correct thread order.',
                items: [
                    { label: 'Call to Action', icon: '🎯', zone: 'z10' },
                    { label: 'Hook Question', icon: '🪝', zone: 'z1' },
                    { label: 'Key Point 1', icon: '1️⃣', zone: 'z4' },
                    { label: 'Summary', icon: '📋', zone: 'z9' },
                    { label: 'Context Setting', icon: '📖', zone: 'z2' },
                    { label: 'Key Point 2', icon: '2️⃣', zone: 'z5' }
                ],
                zones: [
                    { id: 'z1', name: 'Position 1', icon: '1️⃣' },
                    { id: 'z2', name: 'Position 2-3', icon: '2️⃣' },
                    { id: 'z4', name: 'Position 4', icon: '4️⃣' },
                    { id: 'z5', name: 'Position 5', icon: '5️⃣' },
                    { id: 'z9', name: 'Position 9', icon: '9️⃣' },
                    { id: 'z10', name: 'Position 10', icon: '🔟' }
                ]
            }
        },

        // Module: Educational Content
        educationalContent: {
            id: 'content-adv-edu',
            title: 'Creating Educational Series',
            theme: 'fibonacci',
            description: 'Build comprehensive learning experiences.',

            lessons: [
                {
                    title: 'Curriculum Design',
                    content: `
                        <p>Structure your educational content like a journey, not random facts.</p>

                        <h4>The Learning Pyramid</h4>
                        <div class="jm-pyramid">
                            <div class="jm-pyr-level jm-pyr-1">
                                <strong>Remember</strong>
                                <span>Definitions, terms, facts</span>
                            </div>
                            <div class="jm-pyr-level jm-pyr-2">
                                <strong>Understand</strong>
                                <span>Explain concepts in own words</span>
                            </div>
                            <div class="jm-pyr-level jm-pyr-3">
                                <strong>Apply</strong>
                                <span>Use knowledge in new situations</span>
                            </div>
                            <div class="jm-pyr-level jm-pyr-4">
                                <strong>Analyze</strong>
                                <span>Break down complex problems</span>
                            </div>
                            <div class="jm-pyr-level jm-pyr-5">
                                <strong>Evaluate</strong>
                                <span>Make judgments, compare solutions</span>
                            </div>
                            <div class="jm-pyr-level jm-pyr-6">
                                <strong>Create</strong>
                                <span>Build something new</span>
                            </div>
                        </div>

                        <div class="jm-tip">
                            <strong>ASDF Approach:</strong> Each module should progress through these levels. Start with remembering terms, end with creating tools.
                        </div>
                    `,
                    keyPoints: [
                        'Progress from simple to complex',
                        'Include practice at each level',
                        'End with creation/application'
                    ]
                }
            ]
        }
    };

    // ============================================
    // ADVANCED COMMUNITY BUILDING MODULES
    // ============================================

    const ADVANCED_COMMUNITY = {
        // Module: Governance
        governance: {
            id: 'community-adv-gov',
            title: 'Community Governance',
            theme: 'verify',
            description: 'Design fair, effective governance systems.',

            lessons: [
                {
                    title: 'Governance Models',
                    content: `
                        <p>Different governance models suit different community needs.</p>

                        <h4>Model Comparison</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Model</th>
                                <th>Speed</th>
                                <th>Inclusivity</th>
                                <th>Best For</th>
                            </tr>
                            <tr>
                                <td><strong>Token Voting</strong></td>
                                <td>Fast</td>
                                <td>Plutocratic</td>
                                <td>Treasury decisions</td>
                            </tr>
                            <tr>
                                <td><strong>Quadratic</strong></td>
                                <td>Medium</td>
                                <td>More equal</td>
                                <td>Public goods</td>
                            </tr>
                            <tr>
                                <td><strong>Conviction</strong></td>
                                <td>Slow</td>
                                <td>Patient holders</td>
                                <td>Long-term planning</td>
                            </tr>
                            <tr>
                                <td><strong>Council</strong></td>
                                <td>Fast</td>
                                <td>Delegated</td>
                                <td>Quick decisions</td>
                            </tr>
                        </table>

                        <div class="jm-tip">
                            <strong>ASDF Style:</strong> Hybrid approaches work best. Use token voting for budgets, council for day-to-day, community polls for direction.
                        </div>
                    `,
                    keyPoints: [
                        'No single model is perfect',
                        'Match model to decision type',
                        'Transparency builds trust'
                    ]
                },
                {
                    title: 'Proposal Frameworks',
                    content: `
                        <p>Good proposals get support. Great proposals get enthusiastic support.</p>

                        <h4>ASDF Proposal Template</h4>
                        <div class="jm-proposal-template">
                            <div class="jm-prop-section">
                                <strong>Title</strong>
                                <p>Clear, action-oriented (e.g., "Implement Weekly Burn Events")</p>
                            </div>
                            <div class="jm-prop-section">
                                <strong>Summary</strong>
                                <p>2-3 sentences. What and why.</p>
                            </div>
                            <div class="jm-prop-section">
                                <strong>Background</strong>
                                <p>Context. Why is this needed now?</p>
                            </div>
                            <div class="jm-prop-section">
                                <strong>Specification</strong>
                                <p>Detailed plan. Who, what, when, how much?</p>
                            </div>
                            <div class="jm-prop-section">
                                <strong>Benefits</strong>
                                <p>What does the community gain?</p>
                            </div>
                            <div class="jm-prop-section">
                                <strong>Risks & Mitigations</strong>
                                <p>What could go wrong? How do we prevent it?</p>
                            </div>
                            <div class="jm-prop-section">
                                <strong>Success Metrics</strong>
                                <p>How do we know it worked?</p>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Clear proposals reduce friction',
                        'Address concerns proactively',
                        'Define success metrics upfront'
                    ]
                }
            ],

            quiz: {
                id: 'governance-quiz',
                title: 'Governance Mastery',
                questions: [
                    {
                        question: 'Which voting model gives more weight to smaller holders?',
                        options: ['Token voting', 'Quadratic voting', 'Council voting', 'None'],
                        correct: 1,
                        explanation: 'Quadratic voting costs increase with vote power, giving smaller holders relatively more influence.'
                    },
                    {
                        question: 'What should a proposal include to reduce resistance?',
                        options: ['Only benefits', 'Risks and mitigations', 'Threats', 'Nothing'],
                        correct: 1,
                        explanation: 'Addressing risks proactively shows thorough thinking and builds trust.'
                    }
                ]
            }
        },

        // Module: Ecosystem Building
        ecosystemBuilding: {
            id: 'community-adv-ecosystem',
            title: 'Building Ecosystem Partnerships',
            theme: 'burn',
            description: 'Create strategic alliances that benefit everyone.',

            lessons: [
                {
                    title: 'Partnership Strategy',
                    content: `
                        <p>Strategic partnerships multiply community reach and value.</p>

                        <h4>Partnership Value Matrix</h4>
                        <div class="jm-matrix">
                            <div class="jm-matrix-row">
                                <span></span>
                                <span>Low Effort</span>
                                <span>High Effort</span>
                            </div>
                            <div class="jm-matrix-row">
                                <span>High Value</span>
                                <span class="jm-cell jm-cell-green">DO FIRST<br/>Co-marketing, AMAs</span>
                                <span class="jm-cell jm-cell-yellow">PLAN<br/>Integrations, Tools</span>
                            </div>
                            <div class="jm-matrix-row">
                                <span>Low Value</span>
                                <span class="jm-cell jm-cell-yellow">MAYBE<br/>Mentions, Likes</span>
                                <span class="jm-cell jm-cell-red">AVOID<br/>Complex collabs</span>
                            </div>
                        </div>

                        <h4>ASDF Partnership Criteria</h4>
                        <ul>
                            <li><strong>Aligned Values:</strong> Community-first, transparent</li>
                            <li><strong>Complementary:</strong> What they have + what we have = better</li>
                            <li><strong>Active:</strong> Not dead or dying projects</li>
                            <li><strong>Mutual:</strong> Both sides benefit clearly</li>
                        </ul>
                    `,
                    keyPoints: [
                        'Prioritize high-value, low-effort first',
                        'Ensure value alignment',
                        'Both sides must benefit'
                    ]
                }
            ]
        }
    };

    // ============================================
    // ADVANCED CHALLENGES & QUIZZES
    // ============================================

    const ADVANCED_CHALLENGES = {
        // Master challenge combining all skills
        masterChallenge: {
            id: 'master-challenge',
            title: 'ASDF Master Builder Challenge',
            timeLimit: 180,
            questions: [
                { question: 'What formula do AMMs use?', answer: 'x * y = k' },
                { question: 'What does PDA stand for?', answer: 'program derived address' },
                { question: 'Which Fibonacci number is fib[12]?', answer: '144' },
                { question: 'What is the golden ratio approximately?', answer: '1.618' },
                { question: 'Which voting model uses square root cost?', answer: 'quadratic' },
                { question: 'What should happen before a CPI?', answer: 'state update' },
                { question: 'What framework simplifies Solana development?', answer: 'anchor' },
                { question: 'What data structure describes program interfaces?', answer: 'idl' },
                { question: 'What is the ASDF highest tier?', answer: 'inferno' },
                { question: 'What ratio is data-ink about?', answer: 'data to ink' }
            ]
        },

        // Security audit challenge
        securityChallenge: {
            id: 'security-challenge',
            title: 'Vulnerability Hunt',
            type: 'matching',
            pairs: [
                { left: 'AccountInfo without check', right: 'Missing owner validation' },
                { left: 'amount + fee without check', right: 'Integer overflow' },
                { left: 'CPI before state update', right: 'Reentrancy risk' },
                { left: 'Authority not Signer', right: 'Missing signer check' },
                { left: 'Hardcoded bump seed', right: 'PDA derivation issue' }
            ]
        }
    };

    // ============================================
    // MODULE RENDERER
    // ============================================

    function renderAdvancedModule(container, moduleData) {
        if (!window.JourneyModules) {
            console.error('JourneyModules not loaded');
            return;
        }

        const JM = window.JourneyModules;

        // Clear container
        container.innerHTML = '';

        // Module header
        const header = document.createElement('div');
        header.className = 'jm-adv-header';
        header.innerHTML = `
            <h2>${JM.escapeHtml(moduleData.title)}</h2>
            <p>${JM.escapeHtml(moduleData.description)}</p>
        `;
        container.appendChild(header);

        // Render lessons
        if (moduleData.lessons) {
            moduleData.lessons.forEach((lesson, index) => {
                const lessonCard = JM.createThemedLesson({
                    id: `${moduleData.id}-lesson-${index}`,
                    theme: moduleData.theme || 'thisIsFine',
                    title: lesson.title,
                    content: lesson.content,
                    keyPoints: lesson.keyPoints,
                    practicePrompt: lesson.practicePrompt
                });
                container.appendChild(lessonCard);
            });
        }

        // Render quiz
        if (moduleData.quiz && moduleData.quiz.questions) {
            const quizContainer = document.createElement('div');
            quizContainer.className = 'jm-adv-quiz-section';
            quizContainer.innerHTML = `<h3>Knowledge Check</h3>`;

            // Create quiz based on type
            if (moduleData.quiz.type === 'matching' || moduleData.challenge?.type === 'matching') {
                const matchData = moduleData.quiz.pairs ? moduleData.quiz : moduleData.challenge;
                const matchQuiz = JM.createMatchingQuiz({
                    id: matchData.id,
                    title: matchData.title,
                    instruction: matchData.instruction || 'Match the items correctly.',
                    pairs: matchData.pairs,
                    onComplete: (result) => {
                        console.log('Quiz completed:', result);
                    }
                });
                quizContainer.appendChild(matchQuiz);
            }

            container.appendChild(quizContainer);
        }

        // Render challenge
        if (moduleData.challenge) {
            const challengeContainer = document.createElement('div');
            challengeContainer.className = 'jm-adv-challenge-section';
            challengeContainer.innerHTML = `<h3>Practice Challenge</h3>`;

            if (moduleData.challenge.type === 'drag-drop') {
                const dragQuiz = JM.createDragDropQuiz({
                    ...moduleData.challenge,
                    onComplete: (result) => {
                        console.log('Challenge completed:', result);
                    }
                });
                challengeContainer.appendChild(dragQuiz);
            } else if (moduleData.challenge.type === 'timed') {
                const timedQuiz = JM.createTimedQuiz({
                    ...moduleData.challenge,
                    onComplete: (result) => {
                        console.log('Timed challenge completed:', result);
                    }
                });
                challengeContainer.appendChild(timedQuiz);
            }

            container.appendChild(challengeContainer);
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Module collections
        CODE: ADVANCED_CODE,
        DESIGN: ADVANCED_DESIGN,
        CONTENT: ADVANCED_CONTENT,
        COMMUNITY: ADVANCED_COMMUNITY,
        CHALLENGES: ADVANCED_CHALLENGES,

        // Renderer
        renderAdvancedModule,

        // Get all modules for a pillar
        getModulesForPillar(pillar) {
            switch (pillar) {
                case 'code': return Object.values(ADVANCED_CODE);
                case 'design': return Object.values(ADVANCED_DESIGN);
                case 'content': return Object.values(ADVANCED_CONTENT);
                case 'community': return Object.values(ADVANCED_COMMUNITY);
                default: return [];
            }
        },

        // Get module by ID
        getModuleById(id) {
            const allModules = [
                ...Object.values(ADVANCED_CODE),
                ...Object.values(ADVANCED_DESIGN),
                ...Object.values(ADVANCED_CONTENT),
                ...Object.values(ADVANCED_COMMUNITY)
            ];
            return allModules.find(m => m.id === id);
        }
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.JourneyAdvanced = JourneyAdvanced;
}
