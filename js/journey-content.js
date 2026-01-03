/**
 * ASDF Journey - Educational Content
 * Pre-built lessons, quizzes, and assessments
 * Following "THIS IS FINE" philosophy
 *
 * Version: 1.0.0
 */

'use strict';

const JourneyContent = (function() {

    // ============================================
    // SKILL ASSESSMENT QUESTIONNAIRES
    // ============================================

    const SKILL_ASSESSMENTS = {
        // Initial skill assessment for new users
        onboarding: {
            id: 'onboarding-assessment',
            title: 'Discover Your Path',
            description: 'Answer a few questions to find your ideal learning journey.',
            categories: [
                {
                    id: 'code',
                    name: 'Technical Skills',
                    icon: '💻',
                    questions: [
                        {
                            question: 'How comfortable are you with JavaScript?',
                            options: [
                                { text: 'Never written code', emoji: '😬', points: 0 },
                                { text: 'Know the basics', emoji: '🙂', points: 1 },
                                { text: 'Built small projects', emoji: '😊', points: 2 },
                                { text: 'Professional level', emoji: '🔥', points: 3 },
                                { text: 'Expert developer', emoji: '⭐', points: 4 }
                            ]
                        },
                        {
                            question: 'Have you interacted with blockchain APIs?',
                            options: [
                                { text: 'What are APIs?', emoji: '😬', points: 0 },
                                { text: 'Used REST APIs before', emoji: '🙂', points: 1 },
                                { text: 'Built apps with APIs', emoji: '😊', points: 2 },
                                { text: 'Used Web3/Solana libs', emoji: '🔥', points: 3 },
                                { text: 'Built dApps', emoji: '⭐', points: 4 }
                            ]
                        },
                        {
                            question: 'How familiar are you with crypto wallets?',
                            options: [
                                { text: 'Never used one', emoji: '😬', points: 0 },
                                { text: 'Have a wallet, rarely use', emoji: '🙂', points: 1 },
                                { text: 'Use daily for transactions', emoji: '😊', points: 2 },
                                { text: 'Understand private keys', emoji: '🔥', points: 3 },
                                { text: 'Can explain keypairs', emoji: '⭐', points: 4 }
                            ]
                        }
                    ]
                },
                {
                    id: 'design',
                    name: 'Design Skills',
                    icon: '🎨',
                    questions: [
                        {
                            question: 'How would you rate your design abilities?',
                            options: [
                                { text: 'No design experience', emoji: '😬', points: 0 },
                                { text: 'Basic sense of aesthetics', emoji: '🙂', points: 1 },
                                { text: 'Can create decent layouts', emoji: '😊', points: 2 },
                                { text: 'Strong UI/UX sense', emoji: '🔥', points: 3 },
                                { text: 'Professional designer', emoji: '⭐', points: 4 }
                            ]
                        },
                        {
                            question: 'Experience with design tools?',
                            options: [
                                { text: 'Never used any', emoji: '😬', points: 0 },
                                { text: 'Basic image editing', emoji: '🙂', points: 1 },
                                { text: 'Figma/Sketch basics', emoji: '😊', points: 2 },
                                { text: 'Regular tool user', emoji: '🔥', points: 3 },
                                { text: 'Expert with all tools', emoji: '⭐', points: 4 }
                            ]
                        }
                    ]
                },
                {
                    id: 'content',
                    name: 'Content Creation',
                    icon: '✍️',
                    questions: [
                        {
                            question: 'How comfortable are you writing content?',
                            options: [
                                { text: 'Not a writer', emoji: '😬', points: 0 },
                                { text: 'Can write simple posts', emoji: '🙂', points: 1 },
                                { text: 'Regular blog/social posts', emoji: '😊', points: 2 },
                                { text: 'Content is my strength', emoji: '🔥', points: 3 },
                                { text: 'Professional writer', emoji: '⭐', points: 4 }
                            ]
                        },
                        {
                            question: 'Experience with video content?',
                            options: [
                                { text: 'Never made videos', emoji: '😬', points: 0 },
                                { text: 'Made a few clips', emoji: '🙂', points: 1 },
                                { text: 'Regular video creator', emoji: '😊', points: 2 },
                                { text: 'YouTube/TikTok presence', emoji: '🔥', points: 3 },
                                { text: 'Professional videographer', emoji: '⭐', points: 4 }
                            ]
                        }
                    ]
                },
                {
                    id: 'community',
                    name: 'Community Building',
                    icon: '🤝',
                    questions: [
                        {
                            question: 'Experience managing online communities?',
                            options: [
                                { text: 'Never done it', emoji: '😬', points: 0 },
                                { text: 'Participated actively', emoji: '🙂', points: 1 },
                                { text: 'Moderated small groups', emoji: '😊', points: 2 },
                                { text: 'Led communities', emoji: '🔥', points: 3 },
                                { text: 'Built large communities', emoji: '⭐', points: 4 }
                            ]
                        },
                        {
                            question: 'How do you handle conflict resolution?',
                            options: [
                                { text: 'Avoid conflicts', emoji: '😬', points: 0 },
                                { text: 'Can mediate basics', emoji: '🙂', points: 1 },
                                { text: 'Good at de-escalation', emoji: '😊', points: 2 },
                                { text: 'Strong mediator', emoji: '🔥', points: 3 },
                                { text: 'Expert in moderation', emoji: '⭐', points: 4 }
                            ]
                        }
                    ]
                }
            ]
        }
    };

    // ============================================
    // DRAG & DROP QUIZ CONTENT
    // ============================================

    const DRAG_DROP_QUIZZES = {
        // ASDF Concepts sorting
        asdfConcepts: {
            id: 'asdf-concepts-sort',
            title: 'Sort ASDF Concepts',
            instruction: 'Drag each concept to its correct category',
            items: [
                { label: 'Token Burning', icon: '🔥', zone: 'deflationary' },
                { label: 'Supply Reduction', icon: '📉', zone: 'deflationary' },
                { label: 'Fast Transactions', icon: '⚡', zone: 'solana' },
                { label: 'Low Fees', icon: '💰', zone: 'solana' },
                { label: 'Fibonacci Values', icon: '🌀', zone: 'philosophy' },
                { label: 'THIS IS FINE', icon: '🔥', zone: 'philosophy' },
                { label: 'Community Tools', icon: '🛠️', zone: 'community' },
                { label: 'Open Source', icon: '📖', zone: 'community' }
            ],
            zones: [
                { id: 'deflationary', name: 'Deflationary Mechanics', icon: '🔥' },
                { id: 'solana', name: 'Solana Benefits', icon: '⚡' },
                { id: 'philosophy', name: 'ASDF Philosophy', icon: '🌀' },
                { id: 'community', name: 'Community Values', icon: '🤝' }
            ]
        },

        // Wallet security concepts
        walletSecurity: {
            id: 'wallet-security-sort',
            title: 'Wallet Security Practices',
            instruction: 'Sort these items into safe vs dangerous practices',
            items: [
                { label: 'Share public address', icon: '📋', zone: 'safe' },
                { label: 'Share seed phrase', icon: '🔑', zone: 'danger' },
                { label: 'Use hardware wallet', icon: '🔐', zone: 'safe' },
                { label: 'Store keys in notes app', icon: '📱', zone: 'danger' },
                { label: 'Verify transactions', icon: '✅', zone: 'safe' },
                { label: 'Click unknown links', icon: '🔗', zone: 'danger' },
                { label: 'Bookmark official sites', icon: '⭐', zone: 'safe' },
                { label: 'Connect to any dApp', icon: '🌐', zone: 'danger' }
            ],
            zones: [
                { id: 'safe', name: 'Safe Practices', icon: '✅' },
                { id: 'danger', name: 'Dangerous Practices', icon: '⚠️' }
            ]
        },

        // Token types
        tokenTypes: {
            id: 'token-types-sort',
            title: 'Classify Token Types',
            instruction: 'Drag each token characteristic to its type',
            items: [
                { label: 'Fixed supply', icon: '🔒', zone: 'deflationary' },
                { label: 'Continuous minting', icon: '🏭', zone: 'inflationary' },
                { label: 'Burns reduce supply', icon: '🔥', zone: 'deflationary' },
                { label: 'Staking rewards', icon: '💎', zone: 'inflationary' },
                { label: 'Scarcity increases', icon: '📈', zone: 'deflationary' },
                { label: 'Dilution over time', icon: '📉', zone: 'inflationary' }
            ],
            zones: [
                { id: 'deflationary', name: 'Deflationary', icon: '🔥' },
                { id: 'inflationary', name: 'Inflationary', icon: '🏭' }
            ]
        }
    };

    // ============================================
    // MATCHING QUIZ CONTENT
    // ============================================

    const MATCHING_QUIZZES = {
        // ASDF Tiers
        asdfTiers: {
            id: 'asdf-tiers-match',
            title: 'Match ASDF Tiers',
            instruction: 'Connect each tier to its characteristics',
            pairs: [
                { left: 'EMBER', right: 'Starting tier, level 1+', leftIcon: '🔥', rightIcon: '🌱' },
                { left: 'SPARK', right: 'Level 10+, first milestone', leftIcon: '✨', rightIcon: '⬆️' },
                { left: 'FLAME', right: 'Level 20+, intermediate', leftIcon: '🔥', rightIcon: '📊' },
                { left: 'BLAZE', right: 'Level 35+, advanced', leftIcon: '🔥', rightIcon: '🎯' },
                { left: 'INFERNO', right: 'Level 50+, master tier', leftIcon: '🔥', rightIcon: '👑' }
            ]
        },

        // Blockchain concepts
        blockchainConcepts: {
            id: 'blockchain-match',
            title: 'Match Blockchain Terms',
            instruction: 'Connect each term to its definition',
            pairs: [
                { left: 'Block', right: 'Container of transactions', leftIcon: '📦', rightIcon: '📝' },
                { left: 'Hash', right: 'Unique digital fingerprint', leftIcon: '🔢', rightIcon: '🆔' },
                { left: 'Wallet', right: 'Stores your keys', leftIcon: '👛', rightIcon: '🔐' },
                { left: 'Transaction', right: 'Transfer of value', leftIcon: '💸', rightIcon: '↔️' },
                { left: 'Smart Contract', right: 'Self-executing code', leftIcon: '📜', rightIcon: '🤖' },
                { left: 'Validator', right: 'Confirms transactions', leftIcon: '✅', rightIcon: '🔍' }
            ]
        },

        // Fibonacci in ASDF
        fibonacciMatch: {
            id: 'fibonacci-match',
            title: 'Fibonacci in ASDF',
            instruction: 'Match each Fibonacci index to its value',
            pairs: [
                { left: 'fib[5]', right: '5', leftIcon: '🌀', rightIcon: '5️⃣' },
                { left: 'fib[7]', right: '13', leftIcon: '🌀', rightIcon: '1️⃣3️⃣' },
                { left: 'fib[10]', right: '55', leftIcon: '🌀', rightIcon: '5️⃣5️⃣' },
                { left: 'fib[12]', right: '144', leftIcon: '🌀', rightIcon: '1️⃣4️⃣4️⃣' },
                { left: 'fib[15]', right: '610', leftIcon: '🌀', rightIcon: '6️⃣1️⃣0️⃣' }
            ]
        }
    };

    // ============================================
    // TIMED CHALLENGE CONTENT
    // ============================================

    const TIMED_CHALLENGES = {
        // Quick ASDF facts
        asdfQuickFire: {
            id: 'asdf-quickfire',
            title: 'ASDF Quick Fire Challenge',
            instruction: 'Answer as fast as you can! Short answers only.',
            timeLimit: 60,
            questions: [
                { question: 'What blockchain is ASDF on?', answer: 'solana' },
                { question: 'What does burning tokens do to supply?', answer: 'decreases' },
                { question: 'Is ASDF inflationary or deflationary?', answer: 'deflationary' },
                { question: 'What currency pays Solana fees?', answer: 'sol' },
                { question: 'Can burned tokens be recovered?', answer: 'no' },
                { question: 'What is the ASDF motto?', answer: 'this is fine' },
                { question: 'What mathematical sequence does ASDF use?', answer: 'fibonacci' },
                { question: 'What is the highest ASDF tier?', answer: 'inferno' },
                { question: 'What is the lowest ASDF tier?', answer: 'ember' },
                { question: 'Solana transactions take about how many milliseconds?', answer: '400' }
            ]
        },

        // Fibonacci challenge
        fibonacciChallenge: {
            id: 'fibonacci-challenge',
            title: 'Fibonacci Speed Test',
            instruction: 'Calculate these Fibonacci values quickly!',
            timeLimit: 45,
            questions: [
                { question: 'fib[1] + fib[2] = ?', answer: '2' },
                { question: 'fib[5] = ?', answer: '5' },
                { question: 'fib[6] = ?', answer: '8' },
                { question: 'fib[7] = ?', answer: '13' },
                { question: 'fib[8] = ?', answer: '21' },
                { question: 'fib[10] = ?', answer: '55' },
                { question: 'fib[4] + fib[5] = ?', answer: '8' },
                { question: 'What comes after 21 in Fibonacci?', answer: '34' }
            ]
        },

        // Solana basics
        solanaBasics: {
            id: 'solana-basics',
            title: 'Solana Knowledge Check',
            instruction: 'Test your Solana knowledge!',
            timeLimit: 90,
            questions: [
                { question: 'What is Solana\'s consensus mechanism called?', answer: 'proof of history' },
                { question: 'What is the native token of Solana?', answer: 'sol' },
                { question: 'Are Solana fees high or low?', answer: 'low' },
                { question: 'Is Solana fast or slow?', answer: 'fast' },
                { question: 'What type of token standard does Solana use?', answer: 'spl' },
                { question: 'Can you run smart contracts on Solana?', answer: 'yes' },
                { question: 'What language are Solana programs often written in?', answer: 'rust' }
            ]
        }
    };

    // ============================================
    // THEMED LESSON CONTENT
    // ============================================

    const THEMED_LESSONS = {
        // THIS IS FINE introduction
        thisIsFineIntro: {
            id: 'this-is-fine-intro',
            theme: 'thisIsFine',
            title: 'Welcome to the Fire',
            content: `
                <p>In crypto, there's chaos. Markets pump and dump. FUD spreads like wildfire. Projects rise and fall overnight.</p>

                <p>But here's the thing: <strong>THIS IS FINE.</strong></p>

                <h4>Why "This is Fine"?</h4>
                <p>The ASDF community embraces the chaos. Instead of panicking, we build. Instead of worrying, we create. The fire around us isn't something to fear - it's fuel for innovation.</p>

                <h4>The Philosophy</h4>
                <p>Every ASDF project is built with these principles:</p>
                <ul>
                    <li><strong>Mathematical Harmony:</strong> All values come from the Fibonacci sequence</li>
                    <li><strong>Transparency:</strong> Everything is verifiable on-chain</li>
                    <li><strong>Community First:</strong> Burns benefit everyone equally</li>
                    <li><strong>Build Through the Fire:</strong> Create value regardless of market conditions</li>
                </ul>
            `,
            keyPoints: [
                'ASDF embraces chaos as an opportunity',
                'All values derive from Fibonacci sequence',
                'Transparency and verification are core',
                'Community benefits over individual gains'
            ],
            practicePrompt: 'Think about a time when chaos led to opportunity in your life. How could you apply that mindset to building in crypto?'
        },

        // Fibonacci philosophy
        fibonacciPhilosophy: {
            id: 'fibonacci-philosophy',
            theme: 'fibonacci',
            title: 'The Golden Sequence',
            content: `
                <p>The Fibonacci sequence appears everywhere in nature - from seashells to galaxies. ASDF uses this mathematical foundation for all its systems.</p>

                <h4>The Sequence</h4>
                <p>Each number is the sum of the two before it:</p>
                <p><code>0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...</code></p>

                <h4>Why Fibonacci?</h4>
                <ul>
                    <li><strong>No Magic Numbers:</strong> Every value has mathematical reasoning</li>
                    <li><strong>Natural Scaling:</strong> Growth feels organic, not arbitrary</li>
                    <li><strong>Predictability:</strong> Anyone can verify the formulas</li>
                    <li><strong>Harmony:</strong> The golden ratio (1.618) creates aesthetic balance</li>
                </ul>

                <h4>ASDF Applications</h4>
                <p>In ASDF, Fibonacci determines:</p>
                <ul>
                    <li>Tier thresholds (fib[5], fib[10], fib[15]...)</li>
                    <li>XP requirements per level</li>
                    <li>Reward scaling</li>
                    <li>Cooldown timers</li>
                    <li>Burn conversion rates</li>
                </ul>
            `,
            keyPoints: [
                'Fibonacci: each number = sum of previous two',
                'Creates natural, organic growth patterns',
                'Eliminates arbitrary "magic numbers"',
                'All ASDF values derive from this sequence'
            ],
            practicePrompt: 'Calculate the first 10 Fibonacci numbers. Then try to spot the pattern in real-world nature!'
        },

        // Burns benefit everyone
        burnPhilosophy: {
            id: 'burn-philosophy',
            theme: 'burn',
            title: 'Burns Benefit Everyone',
            content: `
                <p>Token burning is at the heart of ASDF's deflationary model. But it's not just about reducing supply - it's about creating shared value.</p>

                <h4>What is Burning?</h4>
                <p>Burning means sending tokens to an address that no one can access - ever. The tokens are permanently removed from circulation.</p>

                <h4>The Burn Address</h4>
                <p>Solana uses a special burn address:</p>
                <code>1111111111111111111111111111111111111111111</code>
                <p>Any tokens sent here are gone forever. No keys exist to retrieve them.</p>

                <h4>Why Burns Matter</h4>
                <ul>
                    <li><strong>Scarcity:</strong> Less supply = potential value increase for all holders</li>
                    <li><strong>Commitment:</strong> Burning shows long-term belief in the project</li>
                    <li><strong>Equality:</strong> Every holder benefits proportionally</li>
                    <li><strong>Transparency:</strong> All burns are visible on-chain</li>
                </ul>

                <h4>ASDF Burn Mechanics</h4>
                <p>Tokens can be burned through:</p>
                <ol>
                    <li>Trading activity fees</li>
                    <li>Game mechanics and activities</li>
                    <li>Community burn events</li>
                    <li>Voluntary contributions</li>
                </ol>
            `,
            keyPoints: [
                'Burning permanently removes tokens from circulation',
                'Creates shared value for all holders',
                'All burns are verifiable on-chain',
                'Multiple mechanisms contribute to burns'
            ],
            practicePrompt: 'Look up the ASDF token on Solscan and find a recent burn transaction. Can you verify the amount burned?'
        },

        // Verify everything
        verifyPhilosophy: {
            id: 'verify-philosophy',
            theme: 'verify',
            title: 'Trust, But Verify',
            content: `
                <p>In crypto, trust is earned through transparency. ASDF embraces this with a simple principle: <strong>verify everything</strong>.</p>

                <h4>Why Verification Matters</h4>
                <p>The blockchain is a public ledger. Anyone can see any transaction. This transparency is a feature, not a bug.</p>

                <h4>What You Can Verify</h4>
                <ul>
                    <li><strong>Token Burns:</strong> Every burn is recorded on-chain</li>
                    <li><strong>Supply:</strong> Current circulating supply is always visible</li>
                    <li><strong>Transactions:</strong> Every transfer has a signature</li>
                    <li><strong>Contract Code:</strong> Smart contracts can be audited</li>
                </ul>

                <h4>Verification Tools</h4>
                <ul>
                    <li><strong>Solscan:</strong> Block explorer for Solana</li>
                    <li><strong>Birdeye:</strong> Token analytics and charts</li>
                    <li><strong>SolanaFM:</strong> Transaction explorer</li>
                    <li><strong>ASDF Tools:</strong> Our community-built verification tools</li>
                </ul>

                <h4>Red Flags to Watch</h4>
                <p>Be cautious if a project:</p>
                <ul>
                    <li>Hides team wallets or transactions</li>
                    <li>Has unverified smart contracts</li>
                    <li>Makes claims without on-chain proof</li>
                    <li>Discourages independent verification</li>
                </ul>
            `,
            keyPoints: [
                'Blockchain transparency enables verification',
                'Always check burns and supply on-chain',
                'Use tools like Solscan for verification',
                'Be wary of unverifiable claims'
            ],
            practicePrompt: 'Use Solscan to look up the ASDF token. What is the current total supply? How many holders are there?'
        }
    };

    // ============================================
    // EXAMPLE LESSON GENERATOR
    // ============================================

    function generateExampleLesson(container) {
        if (!window.JourneyModules) {
            console.error('JourneyModules not loaded');
            return;
        }

        const JM = window.JourneyModules;

        // Create a demo lesson
        const lesson = JM.createThemedLesson(THEMED_LESSONS.thisIsFineIntro);
        container.appendChild(lesson);

        // Add Fibonacci spiral visualization
        const spiralContainer = document.createElement('div');
        spiralContainer.style.margin = '20px 0';
        spiralContainer.innerHTML = '<h4 style="color: #fbbf24; margin-bottom: 15px;">The Fibonacci Spiral</h4>';
        container.appendChild(spiralContainer);
        JM.createFibonacciSpiral(spiralContainer, { size: 280, showNumbers: true });

        // Add tier chart
        const tierContainer = document.createElement('div');
        tierContainer.style.margin = '20px 0';
        container.appendChild(tierContainer);
        JM.createTierChart(tierContainer, 150);

        // Add drag & drop quiz
        const dragDropConfig = DRAG_DROP_QUIZZES.asdfConcepts;
        const dragDropQuiz = JM.createDragDropQuiz({
            ...dragDropConfig,
            onComplete: (result) => {
                console.log('Drag & Drop Quiz completed:', result);
            }
        });
        container.appendChild(dragDropQuiz);

        // Add matching quiz
        const matchConfig = MATCHING_QUIZZES.asdfTiers;
        const matchQuiz = JM.createMatchingQuiz({
            ...matchConfig,
            onComplete: (result) => {
                console.log('Matching Quiz completed:', result);
            }
        });
        container.appendChild(matchQuiz);

        // Add timed challenge
        const timedConfig = TIMED_CHALLENGES.asdfQuickFire;
        const timedQuiz = JM.createTimedQuiz({
            ...timedConfig,
            onComplete: (result) => {
                console.log('Timed Challenge completed:', result);
            }
        });
        container.appendChild(timedQuiz);
    }

    function generateSkillAssessment(container, onComplete) {
        if (!window.JourneyModules) {
            console.error('JourneyModules not loaded');
            return;
        }

        const JM = window.JourneyModules;
        const assessment = SKILL_ASSESSMENTS.onboarding;

        const questionnaire = JM.createSkillQuestionnaire({
            ...assessment,
            onComplete: (result) => {
                console.log('Skill Assessment completed:', result);
                if (onComplete) onComplete(result);
            }
        });

        container.appendChild(questionnaire);
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Content data
        SKILL_ASSESSMENTS,
        DRAG_DROP_QUIZZES,
        MATCHING_QUIZZES,
        TIMED_CHALLENGES,
        THEMED_LESSONS,

        // Generators
        generateExampleLesson,
        generateSkillAssessment
    };
})();

// Export for global access
if (typeof window !== 'undefined') {
    window.JourneyContent = JourneyContent;
}
