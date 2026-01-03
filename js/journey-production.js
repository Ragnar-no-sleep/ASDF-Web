/**
 * ASDF Journey - Production-Ready Builder Training
 * Complete curriculum for professional-level builders
 * Following "THIS IS FINE" philosophy
 *
 * Security: Input validation, XSS prevention
 * Version: 1.0.0
 */

'use strict';

const JourneyProduction = (function() {

    // ============================================
    // PRODUCTION CODE & DEV CURRICULUM
    // ============================================

    const PRODUCTION_CODE = {

        // ----------------------------------------
        // MODULE 1: Testing & Quality Assurance
        // ----------------------------------------
        testing: {
            id: 'prod-code-testing',
            title: 'Testing for Production',
            theme: 'verify',
            description: 'Build bulletproof code with comprehensive testing strategies.',
            prerequisites: ['code-adv-patterns'],

            lessons: [
                {
                    title: 'Testing Philosophy: Verify Everything',
                    content: `
                        <p>In the ASDF ecosystem, we follow <strong>"Verify Everything"</strong>. This applies directly to testing.</p>

                        <h4>The Testing Pyramid</h4>
                        <div class="jm-diagram">
                            <div class="jm-pyramid">
                                <div class="jm-pyramid-level e2e">E2E Tests (10%)</div>
                                <div class="jm-pyramid-level integration">Integration Tests (30%)</div>
                                <div class="jm-pyramid-level unit">Unit Tests (60%)</div>
                            </div>
                        </div>

                        <h4>Why This Matters for Crypto</h4>
                        <ul>
                            <li><strong>Immutability:</strong> Deployed contracts can't be easily fixed</li>
                            <li><strong>Real Money:</strong> Bugs cost users actual funds</li>
                            <li><strong>Trust:</strong> One failure can destroy community confidence</li>
                        </ul>

                        <div class="jm-warning">
                            <strong>Production Reality:</strong> Every line of untested code is a liability. In DeFi, untested code has led to billions in losses.
                        </div>
                    `,
                    keyPoints: [
                        'Testing is not optional for production code',
                        'Follow the testing pyramid for efficient coverage',
                        'Crypto amplifies the cost of bugs'
                    ]
                },
                {
                    title: 'Unit Testing Solana/Web3 Code',
                    content: `
                        <h4>Setting Up Your Test Environment</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">package.json - Test Dependencies</div>
                            <pre><code>{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@solana/web3.js": "^1.87.0",
    "@coral-xyz/anchor": "^0.29.0",
    "solana-bankrun": "^0.2.0"
  },
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}</code></pre>
                        </div>

                        <h4>Testing Pure Functions</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">utils.test.ts</div>
                            <pre><code>import { describe, it, expect } from 'vitest';
import { calculateBurnAmount, validateWallet } from './utils';

describe('calculateBurnAmount', () => {
    it('should calculate correct burn for standard tx', () => {
        const amount = 1000n;
        const burnRate = 0.01; // 1%
        expect(calculateBurnAmount(amount, burnRate)).toBe(10n);
    });

    it('should handle zero amount', () => {
        expect(calculateBurnAmount(0n, 0.01)).toBe(0n);
    });

    it('should throw on negative burn rate', () => {
        expect(() => calculateBurnAmount(1000n, -0.01))
            .toThrow('Burn rate must be positive');
    });
});

describe('validateWallet', () => {
    it('should accept valid Solana address', () => {
        const valid = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy';
        expect(validateWallet(valid)).toBe(true);
    });

    it('should reject invalid addresses', () => {
        expect(validateWallet('not-valid')).toBe(false);
        expect(validateWallet('')).toBe(false);
        expect(validateWallet(null)).toBe(false);
    });
});</code></pre>
                        </div>

                        <div class="jm-tip">
                            <strong>ASDF Pattern:</strong> Test edge cases first. Fibonacci thinking: the smallest cases often reveal the biggest issues.
                        </div>
                    `,
                    keyPoints: [
                        'Use vitest for fast, modern testing',
                        'Test edge cases: zero, negative, max values',
                        'Pure functions are easiest to test - write more of them'
                    ]
                },
                {
                    title: 'Integration Testing with Bankrun',
                    content: `
                        <h4>Why Bankrun?</h4>
                        <p>Bankrun simulates a Solana validator locally, giving you fast, deterministic tests without network issues.</p>

                        <div class="jm-code-block">
                            <div class="jm-code-title">program.integration.test.ts</div>
                            <pre><code>import { describe, it, expect, beforeAll } from 'vitest';
import { startAnchor, BankrunProvider } from 'solana-bankrun';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

describe('ASDF Token Integration', () => {
    let context;
    let provider;
    let program;
    let user;

    beforeAll(async () => {
        // Start local validator with your program
        context = await startAnchor(
            './programs/asdf-token',
            [],
            [] // Additional accounts to load
        );
        provider = new BankrunProvider(context);
        program = new Program(IDL, PROGRAM_ID, provider);

        // Create test user with SOL
        user = Keypair.generate();
        await context.setAccount(user.publicKey, {
            lamports: 10 * LAMPORTS_PER_SOL,
            data: Buffer.alloc(0),
            owner: SystemProgram.programId,
            executable: false
        });
    });

    it('should initialize token account', async () => {
        const [tokenAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from('token'), user.publicKey.toBuffer()],
            program.programId
        );

        await program.methods
            .initialize()
            .accounts({
                user: user.publicKey,
                tokenAccount,
                systemProgram: SystemProgram.programId
            })
            .signers([user])
            .rpc();

        const account = await program.account.tokenAccount.fetch(tokenAccount);
        expect(account.owner.toString()).toBe(user.publicKey.toString());
        expect(account.balance.toNumber()).toBe(0);
    });

    it('should handle burn correctly', async () => {
        // First mint some tokens
        await program.methods.mint(new BN(1000)).accounts({...}).rpc();

        // Then burn
        await program.methods.burn(new BN(100)).accounts({...}).rpc();

        const account = await program.account.tokenAccount.fetch(tokenAccount);
        expect(account.balance.toNumber()).toBe(900);
        expect(account.totalBurned.toNumber()).toBe(100);
    });
});</code></pre>
                        </div>

                        <h4>Testing Error Cases</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Testing Expected Failures</div>
                            <pre><code>it('should fail to burn more than balance', async () => {
    try {
        await program.methods
            .burn(new BN(999999)) // More than available
            .accounts({...})
            .rpc();
        expect.fail('Should have thrown');
    } catch (err) {
        expect(err.message).toContain('InsufficientBalance');
    }
});</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Bankrun provides fast, deterministic Solana testing',
                        'Test both success and failure paths',
                        'Integration tests catch issues unit tests miss'
                    ]
                },
                {
                    title: 'End-to-End Testing for dApps',
                    content: `
                        <h4>E2E Testing Stack</h4>
                        <ul>
                            <li><strong>Playwright:</strong> Browser automation</li>
                            <li><strong>Local Validator:</strong> Real Solana environment</li>
                            <li><strong>Test Wallets:</strong> Programmatic wallet control</li>
                        </ul>

                        <div class="jm-code-block">
                            <div class="jm-code-title">e2e/swap.spec.ts</div>
                            <pre><code>import { test, expect } from '@playwright/test';
import { setupTestWallet, fundWallet } from './helpers';

test.describe('Token Swap Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Inject test wallet
        const wallet = await setupTestWallet();
        await fundWallet(wallet, 5); // 5 SOL

        await page.goto('/swap');
        await page.evaluate((pubkey) => {
            window.__TEST_WALLET__ = pubkey;
        }, wallet.publicKey.toString());
    });

    test('complete swap transaction', async ({ page }) => {
        // Connect wallet
        await page.click('[data-testid="connect-wallet"]');
        await expect(page.locator('.wallet-connected')).toBeVisible();

        // Enter swap amount
        await page.fill('[data-testid="input-amount"]', '1');
        await page.selectOption('[data-testid="output-token"]', 'ASDF');

        // Wait for quote
        await expect(page.locator('.quote-amount')).not.toHaveText('--');

        // Execute swap
        await page.click('[data-testid="swap-button"]');

        // Confirm transaction
        await expect(page.locator('.tx-pending')).toBeVisible();
        await expect(page.locator('.tx-success')).toBeVisible({ timeout: 30000 });

        // Verify balance updated
        const balance = await page.locator('.asdf-balance').textContent();
        expect(parseFloat(balance)).toBeGreaterThan(0);
    });

    test('handle insufficient balance', async ({ page }) => {
        await page.fill('[data-testid="input-amount"]', '999999');

        await expect(page.locator('.error-insufficient')).toBeVisible();
        await expect(page.locator('[data-testid="swap-button"]')).toBeDisabled();
    });
});</code></pre>
                        </div>

                        <div class="jm-best-practice">
                            <h4>E2E Best Practices</h4>
                            <ul>
                                <li>Use data-testid attributes for stable selectors</li>
                                <li>Test the critical user paths only</li>
                                <li>Keep E2E tests independent (no shared state)</li>
                                <li>Use realistic timeouts for blockchain operations</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'E2E tests verify the complete user flow',
                        'Use test wallets with controlled funds',
                        'Focus on critical paths, not edge cases'
                    ]
                },
                {
                    title: 'Test Coverage & Quality Gates',
                    content: `
                        <h4>Coverage Requirements for Production</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Code Type</th>
                                <th>Min Coverage</th>
                                <th>Rationale</th>
                            </tr>
                            <tr>
                                <td>Smart Contracts</td>
                                <td>100%</td>
                                <td>Immutable, handles funds</td>
                            </tr>
                            <tr>
                                <td>Core Business Logic</td>
                                <td>90%</td>
                                <td>Critical for correctness</td>
                            </tr>
                            <tr>
                                <td>API Handlers</td>
                                <td>80%</td>
                                <td>User-facing, needs reliability</td>
                            </tr>
                            <tr>
                                <td>UI Components</td>
                                <td>70%</td>
                                <td>Visual, easier to catch bugs</td>
                            </tr>
                        </table>

                        <h4>Setting Up Quality Gates</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">vitest.config.ts</div>
                            <pre><code>import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80
            },
            exclude: [
                'node_modules/**',
                'tests/**',
                '**/*.d.ts',
                '**/types/**'
            ]
        }
    }
});</code></pre>
                        </div>

                        <div class="jm-code-block">
                            <div class="jm-code-title">.github/workflows/test.yml</div>
                            <pre><code>name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run test:coverage

      - name: Check Coverage Thresholds
        run: |
          npx nyc check-coverage --lines 80 --functions 80

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Set coverage thresholds based on code criticality',
                        'Enforce quality gates in CI/CD',
                        'Track coverage trends over time'
                    ]
                }
            ],

            practicalProject: {
                title: 'Build a Tested Token Utility',
                description: 'Create a fully tested token balance checker with unit, integration, and E2E tests.',
                requirements: [
                    'Implement balance fetching with retry logic',
                    'Write 10+ unit tests covering edge cases',
                    'Create integration tests with bankrun',
                    'Add one E2E test for the happy path',
                    'Achieve 90% code coverage'
                ],
                starterCode: `// Your starting point
export async function getTokenBalance(
    connection: Connection,
    wallet: PublicKey,
    mint: PublicKey
): Promise<bigint> {
    // TODO: Implement with proper error handling
}`,
                evaluationCriteria: [
                    'All tests pass',
                    'Coverage meets threshold',
                    'Edge cases handled',
                    'Clean, readable test code'
                ]
            },

            quiz: {
                type: 'mixed',
                questions: [
                    {
                        type: 'multiple',
                        question: 'What percentage of tests should be unit tests according to the testing pyramid?',
                        options: ['20%', '40%', '60%', '80%'],
                        correct: 2
                    },
                    {
                        type: 'multiple',
                        question: 'Why is 100% coverage required for smart contracts?',
                        options: [
                            'It looks good on reports',
                            'Contracts are immutable and handle real funds',
                            'Solana requires it',
                            'Unit tests are easy to write'
                        ],
                        correct: 1
                    },
                    {
                        type: 'text',
                        question: 'What testing tool provides a local Solana validator simulation?',
                        answer: 'bankrun'
                    }
                ]
            }
        },

        // ----------------------------------------
        // MODULE 2: CI/CD & Deployment
        // ----------------------------------------
        cicd: {
            id: 'prod-code-cicd',
            title: 'CI/CD for Solana Projects',
            theme: 'fibonacci',
            description: 'Automate your build, test, and deploy pipeline for reliable releases.',
            prerequisites: ['prod-code-testing'],

            lessons: [
                {
                    title: 'CI/CD Philosophy: Automate Everything',
                    content: `
                        <h4>The ASDF Release Pipeline</h4>
                        <div class="jm-pipeline">
                            <div class="jm-pipeline-stage">
                                <div class="jm-stage-icon">📥</div>
                                <div class="jm-stage-name">Commit</div>
                            </div>
                            <div class="jm-pipeline-arrow">→</div>
                            <div class="jm-pipeline-stage">
                                <div class="jm-stage-icon">🔍</div>
                                <div class="jm-stage-name">Lint</div>
                            </div>
                            <div class="jm-pipeline-arrow">→</div>
                            <div class="jm-pipeline-stage">
                                <div class="jm-stage-icon">🧪</div>
                                <div class="jm-stage-name">Test</div>
                            </div>
                            <div class="jm-pipeline-arrow">→</div>
                            <div class="jm-pipeline-stage">
                                <div class="jm-stage-icon">🔒</div>
                                <div class="jm-stage-name">Security</div>
                            </div>
                            <div class="jm-pipeline-arrow">→</div>
                            <div class="jm-pipeline-stage">
                                <div class="jm-stage-icon">📦</div>
                                <div class="jm-stage-name">Build</div>
                            </div>
                            <div class="jm-pipeline-arrow">→</div>
                            <div class="jm-pipeline-stage">
                                <div class="jm-stage-icon">🚀</div>
                                <div class="jm-stage-name">Deploy</div>
                            </div>
                        </div>

                        <h4>Key Principles</h4>
                        <ul>
                            <li><strong>Fast Feedback:</strong> Know within minutes if something broke</li>
                            <li><strong>Reproducible:</strong> Same inputs = same outputs, always</li>
                            <li><strong>Incremental:</strong> Small changes, frequent deploys</li>
                            <li><strong>Gated:</strong> No bypassing quality checks</li>
                        </ul>

                        <div class="jm-tip">
                            <strong>Fibonacci Insight:</strong> Like Fibonacci sequences, good CI/CD builds on previous steps. Each stage depends on the success of the one before.
                        </div>
                    `,
                    keyPoints: [
                        'Automate every repeatable task',
                        'Fast feedback loops catch issues early',
                        'Never skip quality gates'
                    ]
                },
                {
                    title: 'Complete GitHub Actions Workflow',
                    content: `
                        <div class="jm-code-block">
                            <div class="jm-code-title">.github/workflows/ci.yml</div>
                            <pre><code>name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  SOLANA_VERSION: '1.17.0'

jobs:
  # Stage 1: Code Quality
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  # Stage 2: Security Scan
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
      - name: Audit Dependencies
        run: npm audit --audit-level=high

  # Stage 3: Unit & Integration Tests
  test:
    runs-on: ubuntu-latest
    needs: [lint]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  # Stage 4: Solana Program Tests
  anchor-test:
    runs-on: ubuntu-latest
    needs: [lint]
    steps:
      - uses: actions/checkout@v4
      - uses: coral-xyz/anchor-ci@v0.29.0
      - run: anchor build
      - run: anchor test

  # Stage 5: Build
  build:
    runs-on: ubuntu-latest
    needs: [test, anchor-test, security]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/

  # Stage 6: Deploy (only on main)
  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: dist/
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Parallel jobs speed up the pipeline',
                        'Use environments for production deploys',
                        'Cache dependencies for faster builds'
                    ]
                },
                {
                    title: 'Solana Program Deployment',
                    content: `
                        <h4>Deployment Environments</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Environment</th>
                                <th>Purpose</th>
                                <th>Network</th>
                            </tr>
                            <tr>
                                <td>Development</td>
                                <td>Local testing</td>
                                <td>localhost</td>
                            </tr>
                            <tr>
                                <td>Staging</td>
                                <td>Pre-production testing</td>
                                <td>Devnet</td>
                            </tr>
                            <tr>
                                <td>Production</td>
                                <td>Live users</td>
                                <td>Mainnet-beta</td>
                            </tr>
                        </table>

                        <div class="jm-code-block">
                            <div class="jm-code-title">scripts/deploy.sh</div>
                            <pre><code>#!/bin/bash
set -e

NETWORK=\${1:-devnet}
PROGRAM_NAME="asdf_protocol"

echo "🔨 Building program..."
anchor build

echo "🔑 Loading deployer keypair..."
DEPLOYER_KEY="./keys/\${NETWORK}-deployer.json"

if [ ! -f "\$DEPLOYER_KEY" ]; then
    echo "❌ Deployer key not found: \$DEPLOYER_KEY"
    exit 1
fi

echo "📡 Deploying to \$NETWORK..."
solana config set --url \$NETWORK
solana program deploy \\
    --program-id ./target/deploy/\${PROGRAM_NAME}-keypair.json \\
    ./target/deploy/\${PROGRAM_NAME}.so \\
    --keypair \$DEPLOYER_KEY

echo "✅ Deployment complete!"
echo "Program ID: \$(solana address -k ./target/deploy/\${PROGRAM_NAME}-keypair.json)"

# Verify deployment
echo "🔍 Verifying..."
solana program show \$(solana address -k ./target/deploy/\${PROGRAM_NAME}-keypair.json)</code></pre>
                        </div>

                        <div class="jm-warning">
                            <strong>Security:</strong> Never commit deployer keypairs. Use GitHub Secrets or a secure vault.
                        </div>

                        <h4>Upgrade Strategy</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Anchor.toml - Upgradeable Config</div>
                            <pre><code>[programs.mainnet]
asdf_protocol = "ASdfProgram11111111111111111111111111111111"

[provider]
cluster = "mainnet"
wallet = "./keys/mainnet-deployer.json"

[scripts]
upgrade = "anchor upgrade target/deploy/asdf_protocol.so --program-id ASdfProgram..."</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Use separate keys per environment',
                        'Always verify deployments',
                        'Plan for upgrades from day one'
                    ]
                },
                {
                    title: 'Rollback & Recovery',
                    content: `
                        <h4>Rollback Strategies</h4>

                        <div class="jm-strategy-card">
                            <h5>1. Frontend Rollback</h5>
                            <p>Instant via Vercel/Netlify deployment history</p>
                            <div class="jm-code-block">
                                <pre><code># Vercel CLI rollback
vercel rollback [deployment-url]

# Or via dashboard: Deployments → ... → Promote to Production</code></pre>
                            </div>
                        </div>

                        <div class="jm-strategy-card">
                            <h5>2. API Rollback</h5>
                            <p>Blue-green deployment pattern</p>
                            <div class="jm-code-block">
                                <pre><code># Keep previous version running
# Switch load balancer to old version
# Debug new version
# Re-deploy when fixed</code></pre>
                            </div>
                        </div>

                        <div class="jm-strategy-card">
                            <h5>3. Program Rollback (Limited)</h5>
                            <p>Programs are upgradeable if designed for it</p>
                            <div class="jm-code-block">
                                <pre><code># Rollback to previous buffer
solana program deploy \\
    --buffer [previous-buffer-address] \\
    --program-id [program-id]

# Or use upgrade authority to pause
anchor idl set-authority --new-authority [PAUSE_AUTHORITY]</code></pre>
                            </div>
                        </div>

                        <div class="jm-warning">
                            <strong>Critical:</strong> For programs, implement a pause mechanism. You can't always rollback, but you can stop the bleeding.
                        </div>

                        <h4>Incident Response Checklist</h4>
                        <ol>
                            <li>Detect: Monitoring alerts you</li>
                            <li>Assess: What's affected? Users? Funds?</li>
                            <li>Contain: Pause if necessary</li>
                            <li>Communicate: Update community immediately</li>
                            <li>Fix: Deploy fix or rollback</li>
                            <li>Review: Post-mortem within 48h</li>
                        </ol>
                    `,
                    keyPoints: [
                        'Plan rollback strategies before you need them',
                        'Implement pause mechanisms in programs',
                        'Have an incident response playbook ready'
                    ]
                }
            ],

            practicalProject: {
                title: 'Set Up Production Pipeline',
                description: 'Create a complete CI/CD pipeline for a Solana dApp.',
                requirements: [
                    'Configure GitHub Actions with all stages',
                    'Set up Devnet deployment',
                    'Implement security scanning',
                    'Add deployment notifications to Discord',
                    'Document rollback procedures'
                ],
                evaluationCriteria: [
                    'Pipeline runs successfully',
                    'All quality gates enforced',
                    'Secrets properly managed',
                    'Documentation complete'
                ]
            }
        },

        // ----------------------------------------
        // MODULE 3: Error Handling & Monitoring
        // ----------------------------------------
        monitoring: {
            id: 'prod-code-monitoring',
            title: 'Production Monitoring & Observability',
            theme: 'thisIsFine',
            description: 'Know when things break before your users do.',
            prerequisites: ['prod-code-cicd'],

            lessons: [
                {
                    title: 'The Three Pillars of Observability',
                    content: `
                        <h4>Logs, Metrics, Traces</h4>

                        <div class="jm-pillars">
                            <div class="jm-pillar-card">
                                <div class="jm-pillar-icon">📝</div>
                                <h5>Logs</h5>
                                <p>What happened and when</p>
                                <ul>
                                    <li>Error messages</li>
                                    <li>User actions</li>
                                    <li>System events</li>
                                </ul>
                            </div>
                            <div class="jm-pillar-card">
                                <div class="jm-pillar-icon">📊</div>
                                <h5>Metrics</h5>
                                <p>How the system is performing</p>
                                <ul>
                                    <li>Request latency</li>
                                    <li>Error rates</li>
                                    <li>Resource usage</li>
                                </ul>
                            </div>
                            <div class="jm-pillar-card">
                                <div class="jm-pillar-icon">🔗</div>
                                <h5>Traces</h5>
                                <p>Request journey through system</p>
                                <ul>
                                    <li>Cross-service calls</li>
                                    <li>Bottleneck identification</li>
                                    <li>Dependency mapping</li>
                                </ul>
                            </div>
                        </div>

                        <div class="jm-tip">
                            <strong>This is Fine:</strong> Good observability means you know something's on fire before the room fills with smoke.
                        </div>
                    `,
                    keyPoints: [
                        'All three pillars work together',
                        'Logs tell you what, metrics tell you how much',
                        'Traces connect the dots across services'
                    ]
                },
                {
                    title: 'Structured Logging for Production',
                    content: `
                        <h4>Log Levels & When to Use Them</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Level</th>
                                <th>Use For</th>
                                <th>Example</th>
                            </tr>
                            <tr>
                                <td>ERROR</td>
                                <td>Failures needing attention</td>
                                <td>Transaction failed, API down</td>
                            </tr>
                            <tr>
                                <td>WARN</td>
                                <td>Potential issues</td>
                                <td>Retry attempt, deprecated use</td>
                            </tr>
                            <tr>
                                <td>INFO</td>
                                <td>Business events</td>
                                <td>User action, transaction sent</td>
                            </tr>
                            <tr>
                                <td>DEBUG</td>
                                <td>Development details</td>
                                <td>Variable values, flow tracing</td>
                            </tr>
                        </table>

                        <div class="jm-code-block">
                            <div class="jm-code-title">logger.ts - Production Logger</div>
                            <pre><code>import pino from 'pino';

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: () => \`,"time":"\${new Date().toISOString()}"\`,
    redact: ['password', 'privateKey', 'seed', 'mnemonic'],
});

// Structured logging examples
export function logTransaction(tx: TransactionResult) {
    logger.info({
        event: 'transaction_sent',
        signature: tx.signature,
        slot: tx.slot,
        fee: tx.fee,
        duration_ms: tx.duration,
    }, 'Transaction confirmed');
}

export function logError(error: Error, context: object) {
    logger.error({
        event: 'error',
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
        },
        ...context,
    }, 'Error occurred');
}

export function logUserAction(action: string, userId: string, data: object) {
    logger.info({
        event: 'user_action',
        action,
        userId,
        ...data,
    }, \`User \${action}\`);
}</code></pre>
                        </div>

                        <div class="jm-warning">
                            <strong>Never Log:</strong> Private keys, seed phrases, passwords, or full wallet addresses in production. Use redaction.
                        </div>
                    `,
                    keyPoints: [
                        'Use structured JSON logs for easy parsing',
                        'Redact sensitive data automatically',
                        'Include context with every log entry'
                    ]
                },
                {
                    title: 'Metrics & Alerting',
                    content: `
                        <h4>Key Metrics for Crypto Apps</h4>

                        <div class="jm-code-block">
                            <div class="jm-code-title">metrics.ts - Custom Metrics</div>
                            <pre><code>import { Counter, Histogram, Gauge } from 'prom-client';

// Transaction metrics
export const transactionCounter = new Counter({
    name: 'solana_transactions_total',
    help: 'Total Solana transactions',
    labelNames: ['status', 'type'],
});

export const transactionDuration = new Histogram({
    name: 'solana_transaction_duration_seconds',
    help: 'Transaction confirmation time',
    buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export const walletBalance = new Gauge({
    name: 'wallet_balance_sol',
    help: 'Hot wallet SOL balance',
    labelNames: ['wallet'],
});

// RPC health
export const rpcLatency = new Histogram({
    name: 'rpc_latency_seconds',
    help: 'RPC call latency',
    labelNames: ['method', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

// Usage example
async function sendTransaction(tx: Transaction) {
    const timer = transactionDuration.startTimer();
    try {
        const sig = await connection.sendTransaction(tx);
        transactionCounter.inc({ status: 'success', type: tx.type });
        return sig;
    } catch (err) {
        transactionCounter.inc({ status: 'error', type: tx.type });
        throw err;
    } finally {
        timer();
    }
}</code></pre>
                        </div>

                        <h4>Alert Thresholds</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">alerts.yml - Prometheus Rules</div>
                            <pre><code>groups:
  - name: asdf-alerts
    rules:
      - alert: HighTransactionFailureRate
        expr: |
          rate(solana_transactions_total{status="error"}[5m])
          / rate(solana_transactions_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High transaction failure rate"

      - alert: LowWalletBalance
        expr: wallet_balance_sol < 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Wallet balance below 1 SOL"

      - alert: RPCLatencyHigh
        expr: histogram_quantile(0.95, rpc_latency_seconds) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "RPC latency p95 above 2s"</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Track what matters: transactions, errors, latency',
                        'Set meaningful alert thresholds',
                        'Use labels for granular analysis'
                    ]
                },
                {
                    title: 'Dashboard & Visualization',
                    content: `
                        <h4>Essential Dashboard Panels</h4>

                        <div class="jm-dashboard-preview">
                            <div class="jm-panel">
                                <div class="jm-panel-title">Transaction Success Rate</div>
                                <div class="jm-panel-value">99.2%</div>
                                <div class="jm-panel-trend up">↑ 0.3%</div>
                            </div>
                            <div class="jm-panel">
                                <div class="jm-panel-title">Avg Confirmation Time</div>
                                <div class="jm-panel-value">1.2s</div>
                                <div class="jm-panel-trend down">↓ 0.1s</div>
                            </div>
                            <div class="jm-panel">
                                <div class="jm-panel-title">Active Users (24h)</div>
                                <div class="jm-panel-value">1,247</div>
                                <div class="jm-panel-trend up">↑ 12%</div>
                            </div>
                            <div class="jm-panel">
                                <div class="jm-panel-title">Error Rate</div>
                                <div class="jm-panel-value">0.8%</div>
                                <div class="jm-panel-trend neutral">—</div>
                            </div>
                        </div>

                        <h4>Grafana Dashboard JSON</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Key Panel Query</div>
                            <pre><code>// Success rate panel
sum(rate(solana_transactions_total{status="success"}[5m]))
/
sum(rate(solana_transactions_total[5m]))
* 100

// Latency heatmap
histogram_quantile(0.95,
  sum(rate(solana_transaction_duration_seconds_bucket[5m])) by (le)
)

// Error breakdown
sum by (error_type) (
  rate(solana_transactions_total{status="error"}[1h])
)</code></pre>
                        </div>

                        <div class="jm-best-practice">
                            <h4>Dashboard Best Practices</h4>
                            <ul>
                                <li>Put critical metrics at the top</li>
                                <li>Use consistent time ranges</li>
                                <li>Include comparison to previous period</li>
                                <li>Add links to runbooks for each alert</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Dashboard should answer: "Is everything OK?"',
                        'Show trends, not just current values',
                        'Link alerts to actionable runbooks'
                    ]
                }
            ],

            practicalProject: {
                title: 'Build Monitoring Stack',
                description: 'Set up complete observability for a dApp.',
                requirements: [
                    'Implement structured logging with pino',
                    'Add Prometheus metrics for key operations',
                    'Create Grafana dashboard with 5+ panels',
                    'Set up 3 meaningful alerts',
                    'Document incident response procedures'
                ],
                evaluationCriteria: [
                    'Logs are structured and redacted',
                    'Metrics cover critical paths',
                    'Alerts fire appropriately',
                    'Dashboard provides actionable insights'
                ]
            }
        },

        // ----------------------------------------
        // MODULE 4: Security Hardening
        // ----------------------------------------
        security: {
            id: 'prod-code-security',
            title: 'Production Security Hardening',
            theme: 'burn',
            description: 'Protect your users and their funds with defense in depth.',
            prerequisites: ['code-adv-security'],

            lessons: [
                {
                    title: 'Security Mindset: Assume Breach',
                    content: `
                        <h4>Defense in Depth</h4>
                        <p>Multiple layers of security, each independent:</p>

                        <div class="jm-security-layers">
                            <div class="jm-security-layer">
                                <span class="jm-layer-num">1</span>
                                <strong>Network:</strong> Firewall, WAF, DDoS protection
                            </div>
                            <div class="jm-security-layer">
                                <span class="jm-layer-num">2</span>
                                <strong>Application:</strong> Input validation, auth, rate limiting
                            </div>
                            <div class="jm-security-layer">
                                <span class="jm-layer-num">3</span>
                                <strong>Data:</strong> Encryption, access controls, backups
                            </div>
                            <div class="jm-security-layer">
                                <span class="jm-layer-num">4</span>
                                <strong>Smart Contract:</strong> Audits, formal verification, limits
                            </div>
                            <div class="jm-security-layer">
                                <span class="jm-layer-num">5</span>
                                <strong>Operational:</strong> Key management, access reviews, monitoring
                            </div>
                        </div>

                        <div class="jm-warning">
                            <strong>Burns Benefit Everyone:</strong> Security incidents burn trust faster than any deflationary mechanism. One hack can destroy years of community building.
                        </div>
                    `,
                    keyPoints: [
                        'No single point of security failure',
                        'Assume attackers will bypass some layers',
                        'Defense in depth buys you time'
                    ]
                },
                {
                    title: 'API Security Checklist',
                    content: `
                        <h4>Production API Security</h4>

                        <div class="jm-code-block">
                            <div class="jm-code-title">security-middleware.ts</div>
                            <pre><code>import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "https://*.solana.com"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded');
        res.status(429).json({ error: 'Too many requests' });
    },
});

// Stricter limit for sensitive endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    skipSuccessfulRequests: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Input validation
const validateTransaction = [
    body('recipient')
        .isString()
        .matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
        .withMessage('Invalid Solana address'),
    body('amount')
        .isFloat({ min: 0.000001, max: 1000000 })
        .withMessage('Amount out of range'),
    body('memo')
        .optional()
        .isString()
        .isLength({ max: 256 })
        .escape(),
];

app.post('/api/transaction', validateTransaction, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    // Process valid request
});</code></pre>
                        </div>

                        <h4>Security Headers Checklist</h4>
                        <table class="jm-table">
                            <tr><th>Header</th><th>Purpose</th></tr>
                            <tr><td>Content-Security-Policy</td><td>Prevent XSS, injection</td></tr>
                            <tr><td>Strict-Transport-Security</td><td>Force HTTPS</td></tr>
                            <tr><td>X-Content-Type-Options</td><td>Prevent MIME sniffing</td></tr>
                            <tr><td>X-Frame-Options</td><td>Prevent clickjacking</td></tr>
                            <tr><td>Referrer-Policy</td><td>Control referrer info</td></tr>
                        </table>
                    `,
                    keyPoints: [
                        'Always validate and sanitize inputs',
                        'Rate limit all endpoints, stricter for auth',
                        'Security headers are non-negotiable'
                    ]
                },
                {
                    title: 'Key Management',
                    content: `
                        <h4>Hot vs Cold Wallet Strategy</h4>

                        <div class="jm-wallet-strategy">
                            <div class="jm-wallet-type hot">
                                <h5>🔥 Hot Wallet</h5>
                                <p>For automated operations</p>
                                <ul>
                                    <li>Minimal funds (< 24h volume)</li>
                                    <li>Automated refills from cold</li>
                                    <li>Monitored 24/7</li>
                                    <li>Keys in HSM or secure vault</li>
                                </ul>
                            </div>
                            <div class="jm-wallet-type cold">
                                <h5>🧊 Cold Wallet</h5>
                                <p>For treasury/reserves</p>
                                <ul>
                                    <li>Multisig (3/5 minimum)</li>
                                    <li>Hardware wallets</li>
                                    <li>Manual transactions only</li>
                                    <li>Geographically distributed</li>
                                </ul>
                            </div>
                        </div>

                        <h4>Secure Key Storage</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Using AWS Secrets Manager</div>
                            <pre><code>import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Keypair } from '@solana/web3.js';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getHotWalletKeypair(): Promise<Keypair> {
    const command = new GetSecretValueCommand({
        SecretId: 'prod/hot-wallet-key',
        VersionStage: 'AWSCURRENT',
    });

    const response = await client.send(command);
    const secret = JSON.parse(response.SecretString!);

    // Key is stored as base58 or array
    return Keypair.fromSecretKey(
        Buffer.from(secret.privateKey, 'base64')
    );
}

// Never log the keypair!
const wallet = await getHotWalletKeypair();
logger.info({ publicKey: wallet.publicKey.toString() }, 'Hot wallet loaded');</code></pre>
                        </div>

                        <div class="jm-warning">
                            <strong>Never Ever:</strong>
                            <ul>
                                <li>Commit keys to git (even encrypted)</li>
                                <li>Store keys in environment variables on disk</li>
                                <li>Log private keys or seed phrases</li>
                                <li>Use single-sig for production funds</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Separate hot and cold wallets',
                        'Use HSM or cloud vaults for hot keys',
                        'Multisig for anything valuable'
                    ]
                },
                {
                    title: 'Smart Contract Security',
                    content: `
                        <h4>Pre-Deployment Checklist</h4>

                        <div class="jm-checklist">
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> All math uses checked operations
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> Account ownership validated
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> Signer checks on all mutations
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> PDA seeds include user pubkey
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> No hardcoded bump seeds
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> State updated before CPI
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> Pause mechanism implemented
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> Upgrade authority is multisig
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> Rate limits on critical ops
                            </div>
                            <div class="jm-check-item">
                                <input type="checkbox" disabled> Professional audit completed
                            </div>
                        </div>

                        <h4>Common Vulnerability Patterns</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Vulnerable vs Secure Code</div>
                            <pre><code>// ❌ VULNERABLE: Missing signer check
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    // Anyone can call this!
    transfer(vault, ctx.accounts.destination, amount)?;
    Ok(())
}

// ✅ SECURE: Proper authorization
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,
    #[account(signer)] // Must sign!
    pub authority: AccountInfo<'info>,
    // ...
}

// ❌ VULNERABLE: Integer overflow
let total = amount + fee; // Can overflow!

// ✅ SECURE: Checked math
let total = amount.checked_add(fee)
    .ok_or(ErrorCode::Overflow)?;</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Use the security checklist before every deploy',
                        'Get professional audits for production',
                        'Defense in depth applies to contracts too'
                    ]
                }
            ],

            practicalProject: {
                title: 'Security Audit Report',
                description: 'Perform a security review of a sample dApp.',
                requirements: [
                    'Review provided smart contract code',
                    'Identify 5+ potential vulnerabilities',
                    'Write remediation recommendations',
                    'Implement fixes for top 3 issues',
                    'Create security documentation'
                ],
                evaluationCriteria: [
                    'Vulnerabilities correctly identified',
                    'Fixes are secure and tested',
                    'Documentation is professional quality',
                    'Demonstrates security mindset'
                ]
            }
        },

        // ----------------------------------------
        // MODULE 5: Performance Optimization
        // ----------------------------------------
        performance: {
            id: 'prod-code-performance',
            title: 'Performance at Scale',
            theme: 'fibonacci',
            description: 'Build fast, efficient applications that scale.',
            prerequisites: ['prod-code-monitoring'],

            lessons: [
                {
                    title: 'Frontend Performance',
                    content: `
                        <h4>Core Web Vitals for dApps</h4>

                        <div class="jm-vitals">
                            <div class="jm-vital">
                                <div class="jm-vital-name">LCP</div>
                                <div class="jm-vital-target">&lt; 2.5s</div>
                                <p>Largest Contentful Paint</p>
                            </div>
                            <div class="jm-vital">
                                <div class="jm-vital-name">FID</div>
                                <div class="jm-vital-target">&lt; 100ms</div>
                                <p>First Input Delay</p>
                            </div>
                            <div class="jm-vital">
                                <div class="jm-vital-name">CLS</div>
                                <div class="jm-vital-target">&lt; 0.1</div>
                                <p>Cumulative Layout Shift</p>
                            </div>
                        </div>

                        <h4>Optimization Techniques</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Lazy Loading & Code Splitting</div>
                            <pre><code>// Lazy load heavy components
const SwapWidget = lazy(() => import('./SwapWidget'));
const ChartView = lazy(() => import('./ChartView'));

function App() {
    return (
        <Suspense fallback={<Skeleton />}>
            <SwapWidget />
        </Suspense>
    );
}

// Preload on hover for perceived performance
function NavLink({ to, children }) {
    const preload = () => {
        const route = routes.find(r => r.path === to);
        route?.component.preload?.();
    };

    return (
        <Link to={to} onMouseEnter={preload}>
            {children}
        </Link>
    );
}</code></pre>
                        </div>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Optimizing Web3 Data Loading</div>
                            <pre><code>// Use React Query for caching & deduplication
const { data: balance, isLoading } = useQuery({
    queryKey: ['balance', wallet, mint],
    queryFn: () => getTokenBalance(connection, wallet, mint),
    staleTime: 10_000, // 10 seconds
    refetchInterval: 30_000, // Refresh every 30s
    enabled: !!wallet, // Only fetch when wallet connected
});

// Batch multiple account fetches
const accounts = await connection.getMultipleAccountsInfo([
    userTokenAccount,
    poolTokenAccount,
    feeAccount,
]); // 1 RPC call instead of 3</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Lazy load non-critical components',
                        'Batch RPC calls to reduce latency',
                        'Cache aggressively with React Query'
                    ]
                },
                {
                    title: 'RPC Optimization',
                    content: `
                        <h4>RPC Strategy for Production</h4>

                        <div class="jm-code-block">
                            <div class="jm-code-title">connection-manager.ts</div>
                            <pre><code>import { Connection, Commitment } from '@solana/web3.js';

class ConnectionManager {
    private endpoints: string[];
    private currentIndex = 0;
    private connections: Map<string, Connection> = new Map();

    constructor(endpoints: string[]) {
        this.endpoints = endpoints;
        // Pre-create connections
        endpoints.forEach(ep => {
            this.connections.set(ep, new Connection(ep, {
                commitment: 'confirmed',
                wsEndpoint: ep.replace('https', 'wss'),
                confirmTransactionInitialTimeout: 60000,
            }));
        });
    }

    // Round-robin for load distribution
    getConnection(): Connection {
        const conn = this.connections.get(this.endpoints[this.currentIndex])!;
        this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
        return conn;
    }

    // Failover with retry
    async withRetry<T>(
        operation: (conn: Connection) => Promise<T>,
        maxRetries = 3
    ): Promise<T> {
        let lastError: Error | null = null;

        for (let i = 0; i < maxRetries; i++) {
            const conn = this.getConnection();
            try {
                return await operation(conn);
            } catch (err) {
                lastError = err as Error;
                logger.warn({
                    attempt: i + 1,
                    endpoint: conn.rpcEndpoint,
                    error: err.message
                }, 'RPC call failed, retrying');
            }
        }

        throw lastError;
    }
}

// Usage
const manager = new ConnectionManager([
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.rpc.extrnode.com',
    process.env.HELIUS_RPC_URL!,
]);

const balance = await manager.withRetry(conn =>
    conn.getBalance(publicKey)
);</code></pre>
                        </div>

                        <h4>Caching Layer</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">RPC Response Caching</div>
                            <pre><code>import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 10_000, // 10 second TTL
});

async function getCachedAccountInfo(pubkey: PublicKey) {
    const key = \`account:\${pubkey.toString()}\`;
    const cached = cache.get(key);
    if (cached) return cached;

    const info = await connection.getAccountInfo(pubkey);
    cache.set(key, info);
    return info;
}

// Invalidate on transaction confirm
function onTransactionConfirm(sig: string, accounts: PublicKey[]) {
    accounts.forEach(acc => cache.delete(\`account:\${acc}\`));
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Use multiple RPC endpoints for reliability',
                        'Implement automatic failover and retry',
                        'Cache RPC responses appropriately'
                    ]
                },
                {
                    title: 'Transaction Optimization',
                    content: `
                        <h4>Reducing Transaction Costs</h4>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Compute Unit Optimization</div>
                            <pre><code>import { ComputeBudgetProgram } from '@solana/web3.js';

async function buildOptimizedTransaction(
    instructions: TransactionInstruction[],
    payer: PublicKey
) {
    // Simulate to get actual CU usage
    const simulation = await connection.simulateTransaction(
        new Transaction().add(...instructions)
    );

    const unitsConsumed = simulation.value.unitsConsumed || 200_000;
    const buffer = 1.1; // 10% buffer
    const computeUnits = Math.ceil(unitsConsumed * buffer);

    // Add compute budget instructions
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits,
    });

    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: await getRecommendedPriorityFee(),
    });

    return new Transaction()
        .add(modifyComputeUnits)
        .add(addPriorityFee)
        .add(...instructions);
}

async function getRecommendedPriorityFee(): Promise<number> {
    const fees = await connection.getRecentPrioritizationFees();
    if (fees.length === 0) return 1000; // Default

    // Use median of recent fees
    const sorted = fees.map(f => f.prioritizationFee).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}</code></pre>
                        </div>

                        <h4>Batching Transactions</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Versioned Transactions with LUTs</div>
                            <pre><code>import {
    AddressLookupTableProgram,
    TransactionMessage,
    VersionedTransaction
} from '@solana/web3.js';

// Create LUT for frequently used accounts
async function createLookupTable(
    accounts: PublicKey[]
): Promise<PublicKey> {
    const [createIx, lookupTableAddress] =
        AddressLookupTableProgram.createLookupTable({
            authority: payer.publicKey,
            payer: payer.publicKey,
            recentSlot: await connection.getSlot(),
        });

    const extendIx = AddressLookupTableProgram.extendLookupTable({
        payer: payer.publicKey,
        authority: payer.publicKey,
        lookupTable: lookupTableAddress,
        addresses: accounts,
    });

    await sendAndConfirmTransaction(
        connection,
        new Transaction().add(createIx, extendIx),
        [payer]
    );

    return lookupTableAddress;
}

// Use LUT for smaller transactions
async function sendWithLUT(instructions: TransactionInstruction[]) {
    const lookupTable = await connection.getAddressLookupTable(lutAddress);

    const message = new TransactionMessage({
        payerKey: payer.publicKey,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions,
    }).compileToV0Message([lookupTable.value!]);

    const tx = new VersionedTransaction(message);
    tx.sign([payer]);

    return connection.sendTransaction(tx);
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Simulate to get accurate compute units',
                        'Use dynamic priority fees',
                        'Lookup tables reduce transaction size'
                    ]
                }
            ],

            practicalProject: {
                title: 'Performance Optimization Audit',
                description: 'Optimize a slow dApp to meet production standards.',
                requirements: [
                    'Profile the provided dApp',
                    'Achieve LCP < 2.5s',
                    'Reduce RPC calls by 50%',
                    'Implement connection pooling',
                    'Document optimization strategies'
                ],
                evaluationCriteria: [
                    'Core Web Vitals in green',
                    'RPC usage reduced measurably',
                    'Code changes are clean and documented',
                    'Performance monitoring added'
                ]
            }
        }
    };

    // ============================================
    // PRODUCTION DESIGN & UX CURRICULUM
    // ============================================

    const PRODUCTION_DESIGN = {

        designSystemComplete: {
            id: 'prod-design-system',
            title: 'Complete Design System',
            theme: 'fibonacci',
            description: 'Build a comprehensive design system for consistent, scalable UI.',

            lessons: [
                {
                    title: 'Design Tokens Architecture',
                    content: `
                        <h4>Token Hierarchy</h4>
                        <p>Design tokens are the atoms of your design system. They follow a Fibonacci-like progression from primitive to semantic.</p>

                        <div class="jm-token-hierarchy">
                            <div class="jm-token-level primitive">
                                <h5>Primitive Tokens</h5>
                                <p>Raw values, no semantic meaning</p>
                                <code>--color-orange-500: #f97316</code>
                            </div>
                            <div class="jm-token-level semantic">
                                <h5>Semantic Tokens</h5>
                                <p>Purpose-based naming</p>
                                <code>--color-accent: var(--color-orange-500)</code>
                            </div>
                            <div class="jm-token-level component">
                                <h5>Component Tokens</h5>
                                <p>Scoped to components</p>
                                <code>--button-bg: var(--color-accent)</code>
                            </div>
                        </div>

                        <div class="jm-code-block">
                            <div class="jm-code-title">tokens.css - ASDF Design Tokens</div>
                            <pre><code>:root {
    /* ====== PRIMITIVE TOKENS ====== */

    /* Colors - Fire Palette */
    --color-void: #0a0a0f;
    --color-charred: #1a1a1f;
    --color-smoke: #2a2a2f;
    --color-ash: #6b7280;
    --color-ember: #ea580c;
    --color-fire: #f97316;
    --color-spark: #fbbf24;
    --color-white: #f8fafc;

    /* Spacing - Fibonacci Scale */
    --space-1: 1px;
    --space-2: 2px;
    --space-3: 3px;
    --space-5: 5px;
    --space-8: 8px;
    --space-13: 13px;
    --space-21: 21px;
    --space-34: 34px;
    --space-55: 55px;
    --space-89: 89px;

    /* Typography Scale */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;

    /* ====== SEMANTIC TOKENS ====== */

    /* Backgrounds */
    --bg-primary: var(--color-void);
    --bg-secondary: var(--color-charred);
    --bg-elevated: var(--color-smoke);

    /* Text */
    --text-primary: var(--color-white);
    --text-secondary: var(--color-ash);
    --text-accent: var(--color-fire);

    /* Interactive */
    --color-accent: var(--color-fire);
    --color-accent-hover: var(--color-ember);
    --color-success: #22c55e;
    --color-error: #ef4444;
    --color-warning: var(--color-spark);

    /* Borders */
    --border-color: rgba(255, 255, 255, 0.1);
    --border-radius-sm: var(--space-3);
    --border-radius-md: var(--space-8);
    --border-radius-lg: var(--space-13);
}</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Primitive → Semantic → Component token hierarchy',
                        'Fibonacci scale creates natural visual rhythm',
                        'Semantic names enable easy theme switching'
                    ]
                },
                {
                    title: 'Component Library Architecture',
                    content: `
                        <h4>Atomic Design for Crypto UIs</h4>

                        <div class="jm-atomic-hierarchy">
                            <div class="jm-atomic-level">
                                <h5>Atoms</h5>
                                <p>Button, Input, Badge, Icon, Avatar</p>
                            </div>
                            <div class="jm-atomic-level">
                                <h5>Molecules</h5>
                                <p>TokenAmount, WalletButton, SearchField</p>
                            </div>
                            <div class="jm-atomic-level">
                                <h5>Organisms</h5>
                                <p>SwapCard, PortfolioTable, TransactionList</p>
                            </div>
                            <div class="jm-atomic-level">
                                <h5>Templates</h5>
                                <p>DashboardLayout, TradingLayout</p>
                            </div>
                        </div>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Button.tsx - Atom Component</div>
                            <pre><code>import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
    'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none',
    {
        variants: {
            variant: {
                primary: 'bg-fire text-white hover:bg-ember',
                secondary: 'bg-charred border border-border hover:bg-smoke',
                ghost: 'hover:bg-smoke',
                danger: 'bg-error text-white hover:bg-error/90',
            },
            size: {
                sm: 'h-8 px-3 text-sm rounded-sm',
                md: 'h-10 px-4 text-base rounded-md',
                lg: 'h-12 px-6 text-lg rounded-lg',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
);

interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
            VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={buttonVariants({ variant, size, className })}
                disabled={isLoading}
                {...props}
            >
                {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Atomic design scales from simple to complex',
                        'Use CVA for type-safe variants',
                        'Components should be composable'
                    ]
                },
                {
                    title: 'Accessibility (WCAG 2.1)',
                    content: `
                        <h4>Accessibility Checklist for Crypto UIs</h4>

                        <div class="jm-a11y-checklist">
                            <div class="jm-a11y-category">
                                <h5>Perceivable</h5>
                                <ul>
                                    <li>Color contrast ratio ≥ 4.5:1 for text</li>
                                    <li>Don't rely on color alone (use icons + text)</li>
                                    <li>All images have alt text</li>
                                    <li>Text is resizable to 200%</li>
                                </ul>
                            </div>
                            <div class="jm-a11y-category">
                                <h5>Operable</h5>
                                <ul>
                                    <li>All interactive elements keyboard accessible</li>
                                    <li>Focus indicators visible</li>
                                    <li>No keyboard traps</li>
                                    <li>Skip links for navigation</li>
                                </ul>
                            </div>
                            <div class="jm-a11y-category">
                                <h5>Understandable</h5>
                                <ul>
                                    <li>Error messages are clear and actionable</li>
                                    <li>Form labels associated with inputs</li>
                                    <li>Consistent navigation</li>
                                </ul>
                            </div>
                        </div>

                        <div class="jm-code-block">
                            <div class="jm-code-title">Accessible Token Amount Component</div>
                            <pre><code>function TokenAmount({ amount, symbol, usdValue, change }) {
    const changeLabel = change > 0 ? 'increased' : 'decreased';

    return (
        <div
            className="token-amount"
            role="group"
            aria-label={\`\${symbol} balance\`}
        >
            <span className="amount" aria-label="Amount">
                {formatNumber(amount)}
            </span>
            <span className="symbol" aria-hidden="true">
                {symbol}
            </span>
            <span className="sr-only">{symbol} tokens</span>

            <div
                className="usd-value"
                aria-label={\`Worth \${formatUSD(usdValue)}\`}
            >
                ≈ {formatUSD(usdValue)}
            </div>

            {change !== undefined && (
                <div
                    className={\`change \${change >= 0 ? 'positive' : 'negative'}\`}
                    aria-label={\`\${changeLabel} by \${Math.abs(change)}%\`}
                >
                    {/* Icon for visual users */}
                    <span aria-hidden="true">
                        {change >= 0 ? '↑' : '↓'}
                    </span>
                    {Math.abs(change).toFixed(2)}%
                </div>
            )}
        </div>
    );
}</code></pre>
                        </div>

                        <div class="jm-tip">
                            <strong>Test with real users:</strong> Screen reader testing with NVDA/VoiceOver catches issues automated tools miss.
                        </div>
                    `,
                    keyPoints: [
                        'Accessibility is a requirement, not a feature',
                        'Test with keyboard and screen readers',
                        'Use semantic HTML and ARIA correctly'
                    ]
                }
            ],

            practicalProject: {
                title: 'Build a Design System',
                description: 'Create a complete design system for a crypto application.',
                requirements: [
                    'Define complete token system (colors, spacing, typography)',
                    'Build 5 atom components with variants',
                    'Build 3 molecule components',
                    'Build 1 organism component',
                    'All components meet WCAG 2.1 AA',
                    'Document with Storybook'
                ],
                evaluationCriteria: [
                    'Tokens are well-organized and semantic',
                    'Components are reusable and composable',
                    'Accessibility audit passes',
                    'Documentation is complete'
                ]
            }
        },

        userResearch: {
            id: 'prod-design-research',
            title: 'User Research for Crypto Products',
            theme: 'verify',
            description: 'Validate designs with real users before building.',

            lessons: [
                {
                    title: 'Research Methods for Crypto',
                    content: `
                        <h4>Research Methods Comparison</h4>

                        <table class="jm-table">
                            <tr>
                                <th>Method</th>
                                <th>Best For</th>
                                <th>Sample Size</th>
                                <th>Time</th>
                            </tr>
                            <tr>
                                <td>User Interviews</td>
                                <td>Deep insights, pain points</td>
                                <td>5-10</td>
                                <td>2-3 weeks</td>
                            </tr>
                            <tr>
                                <td>Surveys</td>
                                <td>Quantitative validation</td>
                                <td>100+</td>
                                <td>1 week</td>
                            </tr>
                            <tr>
                                <td>Usability Testing</td>
                                <td>UI/flow validation</td>
                                <td>5-8</td>
                                <td>1-2 weeks</td>
                            </tr>
                            <tr>
                                <td>Analytics Analysis</td>
                                <td>Behavior patterns</td>
                                <td>All users</td>
                                <td>Ongoing</td>
                            </tr>
                            <tr>
                                <td>Community Feedback</td>
                                <td>Feature requests, bugs</td>
                                <td>Varies</td>
                                <td>Ongoing</td>
                            </tr>
                        </table>

                        <h4>Crypto-Specific Research Challenges</h4>
                        <ul>
                            <li><strong>Diverse experience levels:</strong> Degens to normies</li>
                            <li><strong>Trust issues:</strong> Users wary of sharing info</li>
                            <li><strong>Vocabulary gaps:</strong> Not everyone speaks crypto</li>
                            <li><strong>Global audience:</strong> Different cultures, regulations</li>
                        </ul>

                        <div class="jm-tip">
                            <strong>ASDF Approach:</strong> Verify with users, not assumptions. Even the best-designed feature fails if it doesn't solve a real problem.
                        </div>
                    `,
                    keyPoints: [
                        '5 users find 85% of usability issues',
                        'Mix qualitative and quantitative methods',
                        'Crypto users have unique research challenges'
                    ]
                },
                {
                    title: 'Running Usability Tests',
                    content: `
                        <h4>Usability Test Template</h4>

                        <div class="jm-test-template">
                            <h5>1. Preparation</h5>
                            <ul>
                                <li>Define 3-5 specific tasks to test</li>
                                <li>Prepare prototype or staging environment</li>
                                <li>Create test wallet with tokens</li>
                                <li>Set up screen recording</li>
                            </ul>

                            <h5>2. Task Examples</h5>
                            <div class="jm-code-block">
                                <pre><code>Task 1: "Connect your wallet to the application"
Success criteria: Wallet connected in < 60 seconds

Task 2: "Find how much SOL you have"
Success criteria: User identifies correct balance

Task 3: "Swap 0.1 SOL for ASDF tokens"
Success criteria: Transaction submitted successfully

Task 4: "Find your transaction history"
Success criteria: User locates tx list within 30 seconds</code></pre>
                            </div>

                            <h5>3. Observation Guide</h5>
                            <ul>
                                <li>Where do users hesitate?</li>
                                <li>What do they click first?</li>
                                <li>What questions do they ask?</li>
                                <li>What errors do they encounter?</li>
                            </ul>
                        </div>

                        <h4>Analyzing Results</h4>
                        <div class="jm-metrics">
                            <div class="jm-metric">
                                <span class="jm-metric-name">Task Success Rate</span>
                                <span class="jm-metric-target">Target: > 80%</span>
                            </div>
                            <div class="jm-metric">
                                <span class="jm-metric-name">Time on Task</span>
                                <span class="jm-metric-target">Compare to baseline</span>
                            </div>
                            <div class="jm-metric">
                                <span class="jm-metric-name">Error Rate</span>
                                <span class="jm-metric-target">Target: < 10%</span>
                            </div>
                            <div class="jm-metric">
                                <span class="jm-metric-name">User Satisfaction</span>
                                <span class="jm-metric-target">SUS Score > 70</span>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Define success criteria before testing',
                        'Observe behavior, not just outcomes',
                        'Quantify with task success rate and time'
                    ]
                }
            ],

            practicalProject: {
                title: 'Conduct User Research',
                description: 'Research and validate a feature design.',
                requirements: [
                    'Create research plan with objectives',
                    'Conduct 5 usability tests',
                    'Document findings with video clips',
                    'Create recommendations report',
                    'Present findings to stakeholders'
                ],
                evaluationCriteria: [
                    'Research plan is well-structured',
                    'Findings are evidence-based',
                    'Recommendations are actionable',
                    'Presentation is clear and compelling'
                ]
            }
        }
    };

    // ============================================
    // PRODUCTION CONTENT CURRICULUM
    // ============================================

    const PRODUCTION_CONTENT = {

        contentStrategy: {
            id: 'prod-content-strategy',
            title: 'Content Strategy for Crypto',
            theme: 'burn',
            description: 'Build a content engine that grows your community.',

            lessons: [
                {
                    title: 'Content Strategy Framework',
                    content: `
                        <h4>The Content Flywheel</h4>

                        <div class="jm-flywheel">
                            <div class="jm-flywheel-step">
                                <span class="jm-step-num">1</span>
                                <strong>Create</strong>
                                <p>Valuable content</p>
                            </div>
                            <div class="jm-flywheel-arrow">→</div>
                            <div class="jm-flywheel-step">
                                <span class="jm-step-num">2</span>
                                <strong>Distribute</strong>
                                <p>Right channels</p>
                            </div>
                            <div class="jm-flywheel-arrow">→</div>
                            <div class="jm-flywheel-step">
                                <span class="jm-step-num">3</span>
                                <strong>Engage</strong>
                                <p>Community interaction</p>
                            </div>
                            <div class="jm-flywheel-arrow">→</div>
                            <div class="jm-flywheel-step">
                                <span class="jm-step-num">4</span>
                                <strong>Analyze</strong>
                                <p>What worked?</p>
                            </div>
                            <div class="jm-flywheel-arrow">↩</div>
                        </div>

                        <h4>Content Pillars for Crypto Projects</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Pillar</th>
                                <th>Purpose</th>
                                <th>Examples</th>
                            </tr>
                            <tr>
                                <td>Educational</td>
                                <td>Build trust, attract newcomers</td>
                                <td>Guides, tutorials, explainers</td>
                            </tr>
                            <tr>
                                <td>Updates</td>
                                <td>Keep community informed</td>
                                <td>Changelogs, roadmaps, reports</td>
                            </tr>
                            <tr>
                                <td>Culture</td>
                                <td>Build identity, memes</td>
                                <td>Memes, behind-scenes, philosophy</td>
                            </tr>
                            <tr>
                                <td>Engagement</td>
                                <td>Drive interaction</td>
                                <td>Polls, AMAs, contests</td>
                            </tr>
                        </table>

                        <div class="jm-tip">
                            <strong>ASDF Ratio:</strong> Follow the 5-3-2 rule: 50% educational, 30% culture, 20% promotion.
                        </div>
                    `,
                    keyPoints: [
                        'Content is a flywheel, not a campaign',
                        'Balance content types strategically',
                        'Education builds trust, culture builds loyalty'
                    ]
                },
                {
                    title: 'Content Calendar & Operations',
                    content: `
                        <h4>Weekly Content Calendar Template</h4>

                        <div class="jm-calendar">
                            <div class="jm-calendar-day">
                                <h5>Monday</h5>
                                <p>🔥 Weekly Update Thread</p>
                                <span class="jm-platform">Twitter</span>
                            </div>
                            <div class="jm-calendar-day">
                                <h5>Tuesday</h5>
                                <p>📚 Educational Content</p>
                                <span class="jm-platform">Twitter + Blog</span>
                            </div>
                            <div class="jm-calendar-day">
                                <h5>Wednesday</h5>
                                <p>🎭 Meme Day</p>
                                <span class="jm-platform">Twitter</span>
                            </div>
                            <div class="jm-calendar-day">
                                <h5>Thursday</h5>
                                <p>📊 Data/Analytics Post</p>
                                <span class="jm-platform">Twitter</span>
                            </div>
                            <div class="jm-calendar-day">
                                <h5>Friday</h5>
                                <p>🎉 Community Spotlight</p>
                                <span class="jm-platform">Twitter + Discord</span>
                            </div>
                            <div class="jm-calendar-day">
                                <h5>Weekend</h5>
                                <p>🌐 Engagement Posts</p>
                                <span class="jm-platform">All platforms</span>
                            </div>
                        </div>

                        <h4>Content Operations Checklist</h4>
                        <ul>
                            <li><strong>Before publishing:</strong> Review for accuracy, check links, proofread</li>
                            <li><strong>At publishing:</strong> Optimal time, correct hashtags, tag relevant accounts</li>
                            <li><strong>After publishing:</strong> Engage with replies for 2 hours, track metrics</li>
                            <li><strong>Weekly:</strong> Review analytics, adjust strategy</li>
                        </ul>
                    `,
                    keyPoints: [
                        'Consistency beats intensity',
                        'Plan content in advance',
                        'Engage actively after publishing'
                    ]
                }
            ]
        },

        analyticsGrowth: {
            id: 'prod-content-analytics',
            title: 'Analytics & Growth Hacking',
            theme: 'fibonacci',
            description: 'Measure what matters and grow strategically.',

            lessons: [
                {
                    title: 'Key Metrics for Crypto Content',
                    content: `
                        <h4>Metrics Hierarchy</h4>

                        <div class="jm-metrics-pyramid">
                            <div class="jm-metrics-level vanity">
                                <h5>Vanity Metrics</h5>
                                <p>Followers, Likes, Impressions</p>
                                <span class="jm-metric-warning">Track but don't optimize for</span>
                            </div>
                            <div class="jm-metrics-level engagement">
                                <h5>Engagement Metrics</h5>
                                <p>Replies, Quotes, Saves, Shares</p>
                                <span class="jm-metric-good">Shows content quality</span>
                            </div>
                            <div class="jm-metrics-level conversion">
                                <h5>Conversion Metrics</h5>
                                <p>Discord joins, Wallet connects, Transactions</p>
                                <span class="jm-metric-best">Real business impact</span>
                            </div>
                        </div>

                        <h4>Tracking Setup</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Analytics Events</div>
                            <pre><code>// Track content funnel
analytics.track('content_view', {
    content_type: 'educational',
    content_id: 'pda-guide-01',
    source: 'twitter',
});

analytics.track('cta_click', {
    content_id: 'pda-guide-01',
    cta_type: 'discord_join',
});

analytics.track('wallet_connect', {
    content_id: 'pda-guide-01',
    referrer: 'twitter',
});

analytics.track('first_transaction', {
    content_id: 'pda-guide-01',
    tx_type: 'swap',
    value_usd: 50,
});</code></pre>
                        </div>
                    `,
                    keyPoints: [
                        'Focus on conversion, not vanity metrics',
                        'Track the full funnel from content to action',
                        'Attribute value to content pieces'
                    ]
                },
                {
                    title: 'Growth Tactics That Work',
                    content: `
                        <h4>Proven Crypto Growth Tactics</h4>

                        <div class="jm-tactic-card">
                            <h5>🧵 Thread Takeovers</h5>
                            <p>Collaborate with aligned accounts for mutual reach.</p>
                            <div class="jm-tactic-example">
                                <em>"RT this and I'll give alpha on..."</em>
                            </div>
                        </div>

                        <div class="jm-tactic-card">
                            <h5>🎁 Incentivized Engagement</h5>
                            <p>Reward quality participation, not just retweets.</p>
                            <div class="jm-tactic-example">
                                <em>"Best question in the AMA wins..."</em>
                            </div>
                        </div>

                        <div class="jm-tactic-card">
                            <h5>📊 Original Data/Research</h5>
                            <p>Create shareable insights others can't find.</p>
                            <div class="jm-tactic-example">
                                <em>"We analyzed 10,000 transactions..."</em>
                            </div>
                        </div>

                        <div class="jm-tactic-card">
                            <h5>🔧 Free Tools</h5>
                            <p>Build useful tools that drive organic discovery.</p>
                            <div class="jm-tactic-example">
                                <em>Calculators, dashboards, alerts</em>
                            </div>
                        </div>

                        <div class="jm-warning">
                            <strong>What Doesn't Work:</strong> Fake engagement, bot followers, spam tags, engagement pods. These hurt more than help.
                        </div>
                    `,
                    keyPoints: [
                        'Quality engagement beats quantity',
                        'Provide unique value others can\'t replicate',
                        'Build tools that drive organic discovery'
                    ]
                }
            ]
        }
    };

    // ============================================
    // PRODUCTION COMMUNITY CURRICULUM
    // ============================================

    const PRODUCTION_COMMUNITY = {

        communityOps: {
            id: 'prod-community-ops',
            title: 'Community Operations at Scale',
            theme: 'thisIsFine',
            description: 'Manage large communities efficiently and effectively.',

            lessons: [
                {
                    title: 'Scaling Moderation',
                    content: `
                        <h4>Moderation Tiers</h4>

                        <table class="jm-table">
                            <tr>
                                <th>Community Size</th>
                                <th>Mod Ratio</th>
                                <th>Tools Needed</th>
                            </tr>
                            <tr>
                                <td>< 1,000</td>
                                <td>2-3 mods</td>
                                <td>Basic bots</td>
                            </tr>
                            <tr>
                                <td>1,000 - 10,000</td>
                                <td>1:500</td>
                                <td>Automod, logs, tickets</td>
                            </tr>
                            <tr>
                                <td>10,000 - 50,000</td>
                                <td>1:1000</td>
                                <td>Full mod suite, escalation</td>
                            </tr>
                            <tr>
                                <td>50,000+</td>
                                <td>1:2000</td>
                                <td>AI tools, dedicated team</td>
                            </tr>
                        </table>

                        <h4>Moderation Escalation Matrix</h4>
                        <div class="jm-escalation">
                            <div class="jm-escalation-level">
                                <span class="jm-level-badge l1">L1</span>
                                <strong>Auto-handled</strong>
                                <p>Spam, known scam links, banned words</p>
                            </div>
                            <div class="jm-escalation-level">
                                <span class="jm-level-badge l2">L2</span>
                                <strong>Junior Mod</strong>
                                <p>Minor rule violations, warnings</p>
                            </div>
                            <div class="jm-escalation-level">
                                <span class="jm-level-badge l3">L3</span>
                                <strong>Senior Mod</strong>
                                <p>Bans, complex disputes, appeals</p>
                            </div>
                            <div class="jm-escalation-level">
                                <span class="jm-level-badge l4">L4</span>
                                <strong>Community Lead</strong>
                                <p>Policy decisions, incidents, PR</p>
                            </div>
                        </div>
                    `,
                    keyPoints: [
                        'Scale moderation before you need it',
                        'Automate L1 to free mods for complex issues',
                        'Clear escalation paths prevent chaos'
                    ]
                },
                {
                    title: 'Crisis Communication',
                    content: `
                        <h4>Crisis Response Protocol</h4>

                        <div class="jm-crisis-timeline">
                            <div class="jm-crisis-step">
                                <span class="jm-time">0-15 min</span>
                                <h5>Acknowledge</h5>
                                <p>"We're aware of an issue and investigating."</p>
                            </div>
                            <div class="jm-crisis-step">
                                <span class="jm-time">15-60 min</span>
                                <h5>Assess</h5>
                                <p>What happened? Who's affected? What's the impact?</p>
                            </div>
                            <div class="jm-crisis-step">
                                <span class="jm-time">1-2 hours</span>
                                <h5>Update</h5>
                                <p>Share what you know, what you don't, and next steps.</p>
                            </div>
                            <div class="jm-crisis-step">
                                <span class="jm-time">Ongoing</span>
                                <h5>Communicate</h5>
                                <p>Regular updates until resolved.</p>
                            </div>
                            <div class="jm-crisis-step">
                                <span class="jm-time">Post-crisis</span>
                                <h5>Post-mortem</h5>
                                <p>What happened, why, and how to prevent it.</p>
                            </div>
                        </div>

                        <h4>Crisis Communication Template</h4>
                        <div class="jm-code-block">
                            <div class="jm-code-title">Initial Statement</div>
                            <pre><code>🚨 [SITUATION] UPDATE

We're aware that [brief description of issue].

Current status:
• [What we know]
• [What we're doing]

What you should do:
• [Clear action if any]
• [What to avoid]

We'll update in [timeframe].

Questions? [Where to ask]</code></pre>
                        </div>

                        <div class="jm-warning">
                            <strong>Don'ts:</strong>
                            <ul>
                                <li>Don't go silent</li>
                                <li>Don't blame others initially</li>
                                <li>Don't speculate</li>
                                <li>Don't delete without archiving</li>
                            </ul>
                        </div>
                    `,
                    keyPoints: [
                        'Speed of acknowledgment matters most',
                        'Honesty builds trust even in crisis',
                        'Post-mortems prevent repeat incidents'
                    ]
                }
            ]
        },

        ambassadorProgram: {
            id: 'prod-community-ambassadors',
            title: 'Ambassador & Contributor Programs',
            theme: 'burn',
            description: 'Scale community through empowered contributors.',

            lessons: [
                {
                    title: 'Ambassador Program Design',
                    content: `
                        <h4>Ambassador Tiers</h4>

                        <div class="jm-ambassador-tiers">
                            <div class="jm-ambassador-tier">
                                <div class="jm-tier-icon">🌱</div>
                                <h5>Contributor</h5>
                                <p>Active community members</p>
                                <ul>
                                    <li>Help answer questions</li>
                                    <li>Report issues</li>
                                    <li>Create content</li>
                                </ul>
                                <div class="jm-tier-rewards">
                                    <strong>Rewards:</strong> Recognition, exclusive role
                                </div>
                            </div>
                            <div class="jm-ambassador-tier">
                                <div class="jm-tier-icon">🔥</div>
                                <h5>Ambassador</h5>
                                <p>Official representatives</p>
                                <ul>
                                    <li>Lead regional communities</li>
                                    <li>Host events/AMAs</li>
                                    <li>Create tutorials</li>
                                </ul>
                                <div class="jm-tier-rewards">
                                    <strong>Rewards:</strong> Monthly stipend, tokens, merch
                                </div>
                            </div>
                            <div class="jm-ambassador-tier">
                                <div class="jm-tier-icon">⭐</div>
                                <h5>Core</h5>
                                <p>Leadership team</p>
                                <ul>
                                    <li>Set community strategy</li>
                                    <li>Manage ambassador program</li>
                                    <li>Direct project access</li>
                                </ul>
                                <div class="jm-tier-rewards">
                                    <strong>Rewards:</strong> Significant allocation, salary
                                </div>
                            </div>
                        </div>

                        <h4>Ambassador KPIs</h4>
                        <table class="jm-table">
                            <tr>
                                <th>Metric</th>
                                <th>Target</th>
                                <th>Measurement</th>
                            </tr>
                            <tr>
                                <td>Community Growth</td>
                                <td>+100 members/month</td>
                                <td>Tracked referrals</td>
                            </tr>
                            <tr>
                                <td>Content Created</td>
                                <td>4 pieces/month</td>
                                <td>Submissions log</td>
                            </tr>
                            <tr>
                                <td>Engagement Rate</td>
                                <td>>5% on posts</td>
                                <td>Social analytics</td>
                            </tr>
                            <tr>
                                <td>Support Resolution</td>
                                <td>>90% satisfaction</td>
                                <td>Feedback surveys</td>
                            </tr>
                        </table>
                    `,
                    keyPoints: [
                        'Clear tiers with progression path',
                        'Rewards match responsibilities',
                        'Track KPIs to ensure value'
                    ]
                }
            ]
        }
    };

    // ============================================
    // CAPSTONE PROJECTS
    // ============================================

    const CAPSTONE_PROJECTS = {
        fullStackDapp: {
            id: 'capstone-dapp',
            title: 'Full-Stack dApp Capstone',
            description: 'Build a complete production-ready dApp from scratch.',

            requirements: [
                'Smart contract with full test coverage',
                'Frontend with complete design system',
                'CI/CD pipeline with all quality gates',
                'Monitoring and alerting setup',
                'Security audit documentation',
                'User documentation and tutorials'
            ],

            evaluationCriteria: [
                'Code quality and architecture',
                'Test coverage > 90%',
                'Security best practices followed',
                'Performance meets standards',
                'Documentation complete',
                'Successfully deployed to devnet'
            ],

            certification: {
                name: 'ASDF Certified Builder',
                badge: '🏆',
                description: 'Has demonstrated production-level skills across all disciplines.'
            }
        },

        communityProject: {
            id: 'capstone-community',
            title: 'Community Building Capstone',
            description: 'Launch and grow a crypto community from zero.',

            requirements: [
                'Community strategy document',
                'Discord server with full setup',
                'Content calendar (1 month)',
                'Ambassador program design',
                'Crisis communication playbook',
                'Growth to 500+ members'
            ],

            evaluationCriteria: [
                'Strategy is comprehensive',
                'Discord follows best practices',
                'Content plan is sustainable',
                'Community is engaged (not just member count)',
                'Documentation is professional'
            ],

            certification: {
                name: 'ASDF Community Leader',
                badge: '👑',
                description: 'Has demonstrated ability to build and manage crypto communities.'
            }
        }
    };

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        CODE: PRODUCTION_CODE,
        DESIGN: PRODUCTION_DESIGN,
        CONTENT: PRODUCTION_CONTENT,
        COMMUNITY: PRODUCTION_COMMUNITY,
        CAPSTONE: CAPSTONE_PROJECTS,

        getAllModules() {
            return [
                ...Object.values(PRODUCTION_CODE),
                ...Object.values(PRODUCTION_DESIGN),
                ...Object.values(PRODUCTION_CONTENT),
                ...Object.values(PRODUCTION_COMMUNITY),
            ];
        },

        getModuleById(id) {
            return this.getAllModules().find(m => m.id === id);
        },

        getModulesForPillar(pillar) {
            switch (pillar) {
                case 'code': return Object.values(PRODUCTION_CODE);
                case 'design': return Object.values(PRODUCTION_DESIGN);
                case 'content': return Object.values(PRODUCTION_CONTENT);
                case 'community': return Object.values(PRODUCTION_COMMUNITY);
                default: return [];
            }
        },

        getCapstoneProjects() {
            return Object.values(CAPSTONE_PROJECTS);
        },

        getTotalCurriculum() {
            const modules = this.getAllModules();
            const totalHours = modules.reduce((sum, m) => {
                const [min, max] = (m.estimatedTime || '0-0').split('-').map(n => parseInt(n) || 0);
                return sum + ((min + max) / 2);
            }, 0);

            return {
                moduleCount: modules.length,
                estimatedHours: Math.round(totalHours),
                pillars: ['code', 'design', 'content', 'community'],
                capstones: Object.keys(CAPSTONE_PROJECTS).length
            };
        }
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.JourneyProduction = JourneyProduction;
}
