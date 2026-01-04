/**
 * Pump Arena RPG - Mini-Games System
 * Interactive challenges for XP and rewards
 */

'use strict';

// ============================================
// MINI-GAME DEFINITIONS
// ============================================

const MINIGAMES = {
    code_sprint: {
        id: 'code_sprint',
        name: 'Code Sprint',
        description: 'Type code snippets as fast as possible!',
        icon: '💻',
        color: '#3b82f6',
        influenceCost: 10,
        statBonus: 'dev',
        rewards: {
            base: { xp: 50, tokens: 20 },
            perfect: { xp: 150, tokens: 60 }
        }
    },
    chart_analysis: {
        id: 'chart_analysis',
        name: 'Chart Analysis',
        description: 'Identify the pattern before time runs out!',
        icon: '📈',
        color: '#22c55e',
        influenceCost: 10,
        statBonus: 'str',
        rewards: {
            base: { xp: 50, tokens: 25 },
            perfect: { xp: 150, tokens: 75 }
        }
    },
    shill_quiz: {
        id: 'shill_quiz',
        name: 'Crypto Quiz',
        description: 'Test your crypto knowledge!',
        icon: '🧠',
        color: '#a855f7',
        influenceCost: 5,
        statBonus: 'str',
        rewards: {
            base: { xp: 30, tokens: 15 },
            perfect: { xp: 100, tokens: 50 }
        }
    },
    raid_simulator: {
        id: 'raid_simulator',
        name: 'Raid Simulator',
        description: 'Hit the targets at the perfect moment!',
        icon: '🎯',
        color: '#f97316',
        influenceCost: 15,
        statBonus: 'com',
        rewards: {
            base: { xp: 60, tokens: 30 },
            perfect: { xp: 180, tokens: 100 }
        }
    },
    // NEW ASDF-ALIGNED MINI-GAMES
    fibonacci_trader: {
        id: 'fibonacci_trader',
        name: 'Fibonacci Trader',
        description: 'Buy and sell at Fibonacci retracement levels!',
        icon: '🌀',
        color: '#ec4899',
        influenceCost: 12,
        statBonus: 'lck',
        rewards: {
            base: { xp: 55, tokens: 30 },
            perfect: { xp: 165, tokens: 90 }
        }
    },
    hash_match: {
        id: 'hash_match',
        name: 'Hash Match',
        description: 'Match blockchain hashes in sequence!',
        icon: '🔗',
        color: '#06b6d4',
        influenceCost: 8,
        statBonus: 'dev',
        rewards: {
            base: { xp: 45, tokens: 22 },
            perfect: { xp: 135, tokens: 66 }
        }
    },
    token_catcher: {
        id: 'token_catcher',
        name: 'Token Catcher',
        description: 'Catch falling tokens, avoid the rugs!',
        icon: '🪙',
        color: '#fbbf24',
        influenceCost: 7,
        statBonus: 'lck',
        rewards: {
            base: { xp: 40, tokens: 35 },
            perfect: { xp: 120, tokens: 105 }
        }
    },
    gas_optimizer: {
        id: 'gas_optimizer',
        name: 'Gas Optimizer',
        description: 'Submit transactions at optimal gas prices!',
        icon: '⛽',
        color: '#84cc16',
        influenceCost: 10,
        statBonus: 'str',
        rewards: {
            base: { xp: 50, tokens: 28 },
            perfect: { xp: 150, tokens: 84 }
        }
    }
};

// Code Sprint - Code snippets to type
const CODE_SNIPPETS = [
    { code: 'const wallet = useWallet();', difficulty: 1 },
    { code: 'await contract.mint(1);', difficulty: 1 },
    { code: 'function swap(a, b) { return [b, a]; }', difficulty: 2 },
    { code: 'const balance = await token.balanceOf(addr);', difficulty: 2 },
    { code: 'require(msg.sender == owner, "Not authorized");', difficulty: 3 },
    { code: 'mapping(address => uint256) public balances;', difficulty: 3 },
    { code: 'emit Transfer(from, to, amount);', difficulty: 2 },
    { code: 'modifier onlyOwner() { require(owner == msg.sender); _; }', difficulty: 4 },
    { code: 'bytes32 hash = keccak256(abi.encodePacked(data));', difficulty: 4 },
    { code: 'interface IERC20 { function transfer(address to, uint256 amount) external; }', difficulty: 5 }
];

// Chart patterns
const CHART_PATTERNS = [
    { name: 'Double Bottom', pattern: '📉📉📈', answer: 'bullish', hint: 'Two lows followed by reversal' },
    { name: 'Head & Shoulders', pattern: '📈📈📈📉', answer: 'bearish', hint: 'Three peaks, middle highest' },
    { name: 'Cup & Handle', pattern: '📉〰️📈', answer: 'bullish', hint: 'U-shape with small dip' },
    { name: 'Rising Wedge', pattern: '📈📈📈', answer: 'bearish', hint: 'Converging upward lines' },
    { name: 'Falling Wedge', pattern: '📉📉📉', answer: 'bullish', hint: 'Converging downward lines' },
    { name: 'Bull Flag', pattern: '📈🚩', answer: 'bullish', hint: 'Sharp rise then consolidation' },
    { name: 'Bear Flag', pattern: '📉🚩', answer: 'bearish', hint: 'Sharp drop then consolidation' },
    { name: 'Triple Top', pattern: '📈📈📈📉', answer: 'bearish', hint: 'Three equal highs' }
];

// Quiz questions
const QUIZ_QUESTIONS = [
    { q: 'What does "HODL" mean?', a: ['Hold On for Dear Life', 'Buy More', 'Sell Now', 'Trade Often'], correct: 0 },
    { q: 'What is a "rug pull"?', a: ['Scam exit', 'Price increase', 'New launch', 'Burn event'], correct: 0 },
    { q: 'What does "WAGMI" stand for?', a: ["We're All Gonna Make It", 'Wait And Get More Info', 'Wallet Address Guide', 'Web3 Gaming'], correct: 0 },
    { q: 'What is "gas" in Ethereum?', a: ['Transaction fee', 'Token name', 'Wallet type', 'Exchange'], correct: 0 },
    { q: 'What does "DeFi" stand for?', a: ['Decentralized Finance', 'Digital Finance', 'Defined Interest', 'Derivative Fund'], correct: 0 },
    { q: 'What is a "whale" in crypto?', a: ['Large holder', 'New investor', 'Exchange', 'Developer'], correct: 0 },
    { q: 'What is "DYOR"?', a: ['Do Your Own Research', 'Digital Yield On Return', 'Dont Yield On Risk', 'Dynamic Output Rate'], correct: 0 },
    { q: 'What is a "bear market"?', a: ['Declining prices', 'Rising prices', 'Stable prices', 'No trading'], correct: 0 },
    { q: 'What does "FUD" mean?', a: ['Fear Uncertainty Doubt', 'Fund Under Development', 'First User Deposit', 'Future Update Date'], correct: 0 },
    { q: 'What is an "NFT"?', a: ['Non-Fungible Token', 'New Finance Tool', 'Network Fee Token', 'Next Fund Transfer'], correct: 0 },
    { q: 'What is "staking"?', a: ['Locking tokens for rewards', 'Selling tokens', 'Creating tokens', 'Burning tokens'], correct: 0 },
    { q: 'What is a "DEX"?', a: ['Decentralized Exchange', 'Digital Export', 'Data Exchange', 'Developer Experience'], correct: 0 }
];

// ============================================
// MINI-GAME STATE
// ============================================

let minigameState = {
    active: null,
    score: 0,
    startTime: null,
    gameData: null
};

// ============================================
// MINI-GAME FUNCTIONS
// ============================================

function canPlayMinigame(gameId) {
    const game = MINIGAMES[gameId];
    if (!game) return { canPlay: false, reason: 'Game not found' };

    const state = window.PumpArenaState.get();
    if (state.resources.influence < game.influenceCost) {
        return { canPlay: false, reason: `Need ${game.influenceCost} influence` };
    }

    return { canPlay: true };
}

function startMinigame(gameId, container) {
    const check = canPlayMinigame(gameId);
    if (!check.canPlay) {
        return { success: false, message: check.reason };
    }

    const game = MINIGAMES[gameId];

    // Deduct influence
    window.PumpArenaState.spendInfluence(game.influenceCost);

    minigameState = {
        active: gameId,
        score: 0,
        startTime: Date.now(),
        gameData: {}
    };

    // Render appropriate game
    switch (gameId) {
        case 'code_sprint':
            renderCodeSprint(container);
            break;
        case 'chart_analysis':
            renderChartAnalysis(container);
            break;
        case 'shill_quiz':
            renderShillQuiz(container);
            break;
        case 'raid_simulator':
            renderRaidSimulator(container);
            break;
        case 'fibonacci_trader':
            renderFibonacciTrader(container);
            break;
        case 'hash_match':
            renderHashMatch(container);
            break;
        case 'token_catcher':
            renderTokenCatcher(container);
            break;
        case 'gas_optimizer':
            renderGasOptimizer(container);
            break;
        default:
            return { success: false, message: 'Unknown game' };
    }

    return { success: true };
}

function endMinigame(container, finalScore, isPerfect = false) {
    const game = MINIGAMES[minigameState.active];
    const rewards = isPerfect ? game.rewards.perfect : game.rewards.base;

    // Apply stat bonus
    const state = window.PumpArenaState.get();
    const statBonus = state.stats[game.statBonus] || 5;
    const bonusMultiplier = 1 + (statBonus * 0.02);

    const finalXP = Math.floor(rewards.xp * bonusMultiplier * (finalScore / 100));
    const finalTokens = Math.floor(rewards.tokens * bonusMultiplier * (finalScore / 100));

    window.PumpArenaState.addXP(finalXP);
    window.PumpArenaState.addTokens(finalTokens);

    // Show results
    renderMinigameResult(container, {
        game,
        score: finalScore,
        isPerfect,
        xp: finalXP,
        tokens: finalTokens,
        timeTaken: Date.now() - minigameState.startTime
    });

    minigameState.active = null;

    return { xp: finalXP, tokens: finalTokens };
}

// ============================================
// CODE SPRINT GAME
// ============================================

function renderCodeSprint(container) {
    const state = window.PumpArenaState.get();
    const devStat = state.stats.dev || 5;

    // Select snippets based on dev stat
    const maxDifficulty = Math.min(5, Math.floor(devStat / 3) + 1);
    const availableSnippets = CODE_SNIPPETS.filter(s => s.difficulty <= maxDifficulty);
    const selectedSnippets = shuffleArray(availableSnippets).slice(0, 5);

    minigameState.gameData = {
        snippets: selectedSnippets,
        currentIndex: 0,
        correctChars: 0,
        totalChars: selectedSnippets.reduce((sum, s) => sum + s.code.length, 0),
        timeLimit: 60000
    };

    container.innerHTML = `
        <div class="minigame-container code-sprint">
            <div class="minigame-header">
                <h3>&#128187; Code Sprint</h3>
                <div class="minigame-timer">
                    <span class="timer-icon">&#9201;</span>
                    <span class="timer-value" id="sprint-timer">60</span>s
                </div>
            </div>

            <div class="sprint-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="sprint-progress" style="width: 0%"></div>
                </div>
                <span class="progress-text">0 / ${selectedSnippets.length}</span>
            </div>

            <div class="code-display">
                <div class="code-target" id="code-target">${selectedSnippets[0].code}</div>
                <div class="code-typed" id="code-typed"></div>
            </div>

            <input type="text" class="code-input" id="code-input" placeholder="Type the code above..." autofocus>

            <div class="sprint-stats">
                <div class="stat">Accuracy: <span id="accuracy">100</span>%</div>
                <div class="stat">WPM: <span id="wpm">0</span></div>
            </div>
        </div>
    `;

    const input = container.querySelector('#code-input');
    const targetEl = container.querySelector('#code-target');
    const typedEl = container.querySelector('#code-typed');
    const progressEl = container.querySelector('#sprint-progress');
    const timerEl = container.querySelector('#sprint-timer');
    const wpmEl = container.querySelector('#wpm');
    const accuracyEl = container.querySelector('#accuracy');

    let totalTyped = 0;
    let errors = 0;
    const startTime = Date.now();

    // Timer
    const timerInterval = setInterval(() => {
        const remaining = Math.max(0, 60 - Math.floor((Date.now() - startTime) / 1000));
        timerEl.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            const score = Math.floor((minigameState.gameData.correctChars / minigameState.gameData.totalChars) * 100);
            endMinigame(container, score, score >= 90);
        }

        // Update WPM
        const minutes = (Date.now() - startTime) / 60000;
        const wpm = Math.floor((totalTyped / 5) / Math.max(0.1, minutes));
        wpmEl.textContent = wpm;
    }, 1000);

    input.addEventListener('input', () => {
        const currentSnippet = minigameState.gameData.snippets[minigameState.gameData.currentIndex];
        const typed = input.value;
        const target = currentSnippet.code;

        totalTyped++;

        // Check accuracy
        let correct = '';
        let hasError = false;
        for (let i = 0; i < typed.length; i++) {
            if (typed[i] === target[i]) {
                correct += `<span class="correct">${escapeHtml(typed[i])}</span>`;
            } else {
                correct += `<span class="error">${escapeHtml(typed[i])}</span>`;
                hasError = true;
                errors++;
            }
        }
        typedEl.innerHTML = correct;

        // Update accuracy
        const accuracy = Math.max(0, Math.floor(((totalTyped - errors) / totalTyped) * 100));
        accuracyEl.textContent = accuracy;

        // Check if complete
        if (typed === target) {
            minigameState.gameData.correctChars += target.length;
            minigameState.gameData.currentIndex++;

            const progress = (minigameState.gameData.currentIndex / minigameState.gameData.snippets.length) * 100;
            progressEl.style.width = `${progress}%`;

            if (minigameState.gameData.currentIndex >= minigameState.gameData.snippets.length) {
                // All done!
                clearInterval(timerInterval);
                const score = Math.min(100, Math.floor(accuracy * (60000 / (Date.now() - startTime))));
                endMinigame(container, score, accuracy >= 95);
            } else {
                // Next snippet
                input.value = '';
                typedEl.innerHTML = '';
                targetEl.textContent = minigameState.gameData.snippets[minigameState.gameData.currentIndex].code;
            }
        }
    });

    input.focus();
}

// ============================================
// CHART ANALYSIS GAME
// ============================================

function renderChartAnalysis(container) {
    const patterns = shuffleArray([...CHART_PATTERNS]).slice(0, 5);
    minigameState.gameData = {
        patterns,
        currentIndex: 0,
        correct: 0,
        timeLimit: 45000
    };

    const currentPattern = patterns[0];

    container.innerHTML = `
        <div class="minigame-container chart-analysis">
            <div class="minigame-header">
                <h3>&#128200; Chart Analysis</h3>
                <div class="minigame-timer">
                    <span class="timer-icon">&#9201;</span>
                    <span class="timer-value" id="chart-timer">45</span>s
                </div>
            </div>

            <div class="chart-progress">
                <span id="chart-score">0</span> / ${patterns.length} correct
            </div>

            <div class="chart-display">
                <div class="pattern-visual" id="pattern-visual">${currentPattern.pattern}</div>
                <div class="pattern-name" id="pattern-name">${currentPattern.name}</div>
                <div class="pattern-hint" id="pattern-hint">${currentPattern.hint}</div>
            </div>

            <div class="chart-choices">
                <button class="choice-btn bullish" data-answer="bullish">
                    <span class="choice-icon">&#128994;</span>
                    <span class="choice-text">Bullish</span>
                </button>
                <button class="choice-btn bearish" data-answer="bearish">
                    <span class="choice-icon">&#128308;</span>
                    <span class="choice-text">Bearish</span>
                </button>
            </div>

            <div class="chart-feedback" id="chart-feedback"></div>
        </div>
    `;

    const startTime = Date.now();
    const timerEl = container.querySelector('#chart-timer');
    const scoreEl = container.querySelector('#chart-score');
    const feedbackEl = container.querySelector('#chart-feedback');

    const timerInterval = setInterval(() => {
        const remaining = Math.max(0, 45 - Math.floor((Date.now() - startTime) / 1000));
        timerEl.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            const score = Math.floor((minigameState.gameData.correct / patterns.length) * 100);
            endMinigame(container, score, score === 100);
        }
    }, 1000);

    container.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const answer = btn.dataset.answer;
            const current = minigameState.gameData.patterns[minigameState.gameData.currentIndex];
            const isCorrect = answer === current.answer;

            if (isCorrect) {
                minigameState.gameData.correct++;
                scoreEl.textContent = minigameState.gameData.correct;
                feedbackEl.innerHTML = '<span class="correct">&#10003; Correct!</span>';
                feedbackEl.className = 'chart-feedback show correct';
            } else {
                feedbackEl.innerHTML = `<span class="error">&#10007; Wrong! It was ${current.answer}</span>`;
                feedbackEl.className = 'chart-feedback show error';
            }

            minigameState.gameData.currentIndex++;

            setTimeout(() => {
                feedbackEl.className = 'chart-feedback';

                if (minigameState.gameData.currentIndex >= patterns.length) {
                    clearInterval(timerInterval);
                    const score = Math.floor((minigameState.gameData.correct / patterns.length) * 100);
                    endMinigame(container, score, score === 100);
                } else {
                    const next = minigameState.gameData.patterns[minigameState.gameData.currentIndex];
                    container.querySelector('#pattern-visual').textContent = next.pattern;
                    container.querySelector('#pattern-name').textContent = next.name;
                    container.querySelector('#pattern-hint').textContent = next.hint;
                }
            }, 800);
        });
    });
}

// ============================================
// SHILL QUIZ GAME
// ============================================

function renderShillQuiz(container) {
    const questions = shuffleArray([...QUIZ_QUESTIONS]).slice(0, 5);
    minigameState.gameData = {
        questions,
        currentIndex: 0,
        correct: 0,
        timeLimit: 30000
    };

    renderQuizQuestion(container, questions[0]);
}

function renderQuizQuestion(container, question) {
    const shuffledAnswers = question.a.map((a, i) => ({ text: a, isCorrect: i === question.correct }));
    shuffleArray(shuffledAnswers);

    const progressPercent = ((minigameState.gameData.currentIndex) / minigameState.gameData.questions.length) * 100;
    const answerColors = ['#3b82f6', '#22c55e', '#f97316', '#ec4899'];

    container.innerHTML = `
        <div class="minigame-container shill-quiz" style="background: #12121a; border-radius: 16px; overflow: hidden; border: 2px solid #a855f7;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a1a2e, #2d1b4e); padding: 20px; border-bottom: 1px solid #a855f740;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #a855f7, #7c3aed); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px;">&#129504;</div>
                        <div>
                            <h3 style="color: #ffffff; margin: 0; font-size: 18px;">Crypto Quiz</h3>
                            <div style="color: #a855f7; font-size: 12px;">Test your knowledge!</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #ffffff; font-size: 16px; font-weight: bold;">Q${minigameState.gameData.currentIndex + 1}/${minigameState.gameData.questions.length}</div>
                        <div style="color: #22c55e; font-size: 12px;">&#10003; ${minigameState.gameData.correct} correct</div>
                    </div>
                </div>
                <!-- Progress bar -->
                <div style="margin-top: 15px; height: 6px; background: #2a2a3a; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, #a855f7, #ec4899); transition: width 0.3s;"></div>
                </div>
            </div>

            <!-- Question -->
            <div style="padding: 25px;">
                <div style="background: linear-gradient(135deg, #1a1a24, #1f1f2e); border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <div style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">QUESTION</div>
                    <p style="color: #ffffff; font-size: 18px; margin: 0; line-height: 1.4;">${question.q}</p>
                </div>

                <!-- Answers -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    ${shuffledAnswers.map((a, i) => `
                        <button class="quiz-answer" data-correct="${a.isCorrect}" style="
                            background: linear-gradient(135deg, #1a1a24, ${answerColors[i]}15);
                            border: 2px solid ${answerColors[i]}60;
                            border-radius: 12px;
                            padding: 15px;
                            cursor: pointer;
                            transition: all 0.2s;
                            text-align: left;
                            display: flex;
                            align-items: center;
                            gap: 12px;
                        " onmouseover="this.style.borderColor='${answerColors[i]}'; this.style.transform='scale(1.02)';"
                           onmouseout="this.style.borderColor='${answerColors[i]}60'; this.style.transform='scale(1)';">
                            <span style="width: 32px; height: 32px; background: ${answerColors[i]}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px; flex-shrink: 0;">${String.fromCharCode(65 + i)}</span>
                            <span style="color: #ffffff; font-size: 14px;">${a.text}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- Feedback -->
                <div id="quiz-feedback" style="margin-top: 20px; text-align: center; min-height: 40px;"></div>
            </div>
        </div>
    `;

    const feedbackEl = container.querySelector('#quiz-feedback');

    container.querySelectorAll('.quiz-answer').forEach(btn => {
        btn.addEventListener('click', () => {
            const isCorrect = btn.dataset.correct === 'true';

            // Disable all buttons and show correct/wrong styling
            container.querySelectorAll('.quiz-answer').forEach(b => {
                b.disabled = true;
                b.style.cursor = 'default';
                b.onmouseover = null;
                b.onmouseout = null;

                if (b.dataset.correct === 'true') {
                    // Correct answer - highlight green
                    b.style.background = 'linear-gradient(135deg, #0d2d1a, #1a4d2e)';
                    b.style.borderColor = '#22c55e';
                    b.style.boxShadow = '0 0 15px #22c55e40';
                } else if (b === btn && !isCorrect) {
                    // Selected wrong answer - highlight red
                    b.style.background = 'linear-gradient(135deg, #2d0d0d, #4d1a1a)';
                    b.style.borderColor = '#ef4444';
                    b.style.boxShadow = '0 0 15px #ef444440';
                } else {
                    // Other wrong answers - dim
                    b.style.opacity = '0.4';
                }
            });

            if (isCorrect) {
                minigameState.gameData.correct++;
                feedbackEl.innerHTML = `
                    <div style="display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; background: linear-gradient(135deg, #0d2d1a, #1a4d2e); border: 2px solid #22c55e; border-radius: 25px;">
                        <span style="font-size: 20px;">&#10003;</span>
                        <span style="color: #22c55e; font-weight: 600;">Correct!</span>
                    </div>
                `;
            } else {
                feedbackEl.innerHTML = `
                    <div style="display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; background: linear-gradient(135deg, #2d0d0d, #4d1a1a); border: 2px solid #ef4444; border-radius: 25px;">
                        <span style="font-size: 20px;">&#10007;</span>
                        <span style="color: #ef4444; font-weight: 600;">Wrong!</span>
                    </div>
                `;
            }

            minigameState.gameData.currentIndex++;

            setTimeout(() => {
                if (minigameState.gameData.currentIndex >= minigameState.gameData.questions.length) {
                    const score = Math.floor((minigameState.gameData.correct / minigameState.gameData.questions.length) * 100);
                    endMinigame(container, score, score === 100);
                } else {
                    renderQuizQuestion(container, minigameState.gameData.questions[minigameState.gameData.currentIndex]);
                }
            }, 1200);
        });
    });
}

// ============================================
// RAID SIMULATOR GAME
// ============================================

function renderRaidSimulator(container) {
    minigameState.gameData = {
        targets: [],
        hits: 0,
        misses: 0,
        combo: 0,
        maxCombo: 0,
        timeLimit: 30000
    };

    container.innerHTML = `
        <div class="minigame-container raid-simulator">
            <div class="minigame-header">
                <h3>&#127919; Raid Simulator</h3>
                <div class="minigame-timer">
                    <span class="timer-icon">&#9201;</span>
                    <span class="timer-value" id="raid-timer">30</span>s
                </div>
            </div>

            <div class="raid-stats">
                <div class="stat">Hits: <span id="raid-hits">0</span></div>
                <div class="stat">Combo: <span id="raid-combo">0</span>x</div>
                <div class="stat">Score: <span id="raid-score">0</span></div>
            </div>

            <div class="raid-arena" id="raid-arena">
                <div class="raid-instruction">Click the targets as they appear!</div>
            </div>
        </div>
    `;

    const arena = container.querySelector('#raid-arena');
    const timerEl = container.querySelector('#raid-timer');
    const hitsEl = container.querySelector('#raid-hits');
    const comboEl = container.querySelector('#raid-combo');
    const scoreEl = container.querySelector('#raid-score');

    const startTime = Date.now();
    let score = 0;

    // Timer
    const timerInterval = setInterval(() => {
        const remaining = Math.max(0, 30 - Math.floor((Date.now() - startTime) / 1000));
        timerEl.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            clearInterval(spawnInterval);
            const finalScore = Math.min(100, Math.floor(score / 10));
            endMinigame(container, finalScore, minigameState.gameData.maxCombo >= 10);
        }
    }, 1000);

    // Spawn targets
    const spawnInterval = setInterval(() => {
        if (minigameState.gameData.targets.length < 5) {
            spawnTarget(arena, (hit, points) => {
                if (hit) {
                    minigameState.gameData.hits++;
                    minigameState.gameData.combo++;
                    if (minigameState.gameData.combo > minigameState.gameData.maxCombo) {
                        minigameState.gameData.maxCombo = minigameState.gameData.combo;
                    }
                    score += points * (1 + minigameState.gameData.combo * 0.1);
                } else {
                    minigameState.gameData.misses++;
                    minigameState.gameData.combo = 0;
                }

                hitsEl.textContent = minigameState.gameData.hits;
                comboEl.textContent = minigameState.gameData.combo;
                scoreEl.textContent = Math.floor(score);
            });
        }
    }, 600);
}

function spawnTarget(arena, callback) {
    const target = document.createElement('div');
    target.className = 'raid-target';

    // Random position
    const maxX = arena.clientWidth - 50;
    const maxY = arena.clientHeight - 50;
    const x = Math.floor(Math.random() * maxX);
    const y = Math.floor(Math.random() * maxY);

    target.style.left = `${x}px`;
    target.style.top = `${y}px`;

    // Random type
    const types = ['&#128640;', '&#127775;', '&#128293;', '&#9889;', '&#128176;'];
    const points = [10, 20, 15, 25, 30];
    const typeIndex = Math.floor(Math.random() * types.length);
    target.innerHTML = types[typeIndex];
    target.dataset.points = points[typeIndex];

    // Shrink animation
    target.style.animation = 'targetShrink 1.5s ease-in forwards';

    arena.appendChild(target);

    // Click handler
    target.addEventListener('click', () => {
        callback(true, parseInt(target.dataset.points));
        target.classList.add('hit');
        setTimeout(() => target.remove(), 200);
    });

    // Auto-remove after shrink
    setTimeout(() => {
        if (target.parentNode) {
            callback(false, 0);
            target.remove();
        }
    }, 1500);
}

// ============================================
// FIBONACCI TRADER
// ============================================

const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

function renderFibonacciTrader(container) {
    const game = MINIGAMES.fibonacci_trader;
    const targetLevel = FIBONACCI_LEVELS[Math.floor(Math.random() * 5) + 1]; // Skip 0 and 1
    const rounds = 5;

    minigameState.gameData = {
        round: 1,
        totalRounds: rounds,
        score: 0,
        targetLevel,
        price: 100,
        holdings: 0,
        cash: 1000
    };

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a24, #12121a); padding: 20px; border-radius: 16px; border: 2px solid ${game.color}40;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">${game.icon}</span>
                    <div>
                        <h3 style="color: ${game.color}; margin: 0;">${game.name}</h3>
                        <div style="color: #888; font-size: 12px;">Hit the Fibonacci levels!</div>
                    </div>
                </div>
                <div style="display: flex; gap: 15px;">
                    <div style="text-align: center; padding: 8px 12px; background: #1a1a24; border-radius: 8px; border: 1px solid #333;">
                        <div style="color: #fbbf24; font-size: 16px; font-weight: bold;" id="fib-cash">$${minigameState.gameData.cash}</div>
                        <div style="color: #888; font-size: 10px;">Cash</div>
                    </div>
                    <div style="text-align: center; padding: 8px 12px; background: #1a1a24; border-radius: 8px; border: 1px solid #333;">
                        <div style="color: #22c55e; font-size: 16px; font-weight: bold;" id="fib-holdings">0</div>
                        <div style="color: #888; font-size: 10px;">Holdings</div>
                    </div>
                </div>
            </div>

            <div style="position: relative; height: 200px; background: #12121a; border-radius: 12px; border: 1px solid #333; margin-bottom: 20px; overflow: hidden;" id="fib-chart">
                <div style="position: absolute; width: 100%; height: 2px; background: ${game.color}; top: 50%; transform: translateY(-50%); opacity: 0.3;"></div>
                ${FIBONACCI_LEVELS.slice(1, -1).map((level, i) => `
                    <div style="position: absolute; width: 100%; border-top: 1px dashed #444; top: ${(1 - level) * 100}%; left: 0;">
                        <span style="position: absolute; right: 5px; top: -10px; color: #666; font-size: 10px;">${level}</span>
                    </div>
                `).join('')}
                <div style="position: absolute; width: 20px; height: 20px; background: ${game.color}; border-radius: 50%; left: 50%; transform: translate(-50%, -50%); transition: top 0.5s ease;" id="fib-marker"></div>
            </div>

            <div style="text-align: center; margin-bottom: 20px;">
                <div style="color: #888; font-size: 12px;">Target Fib Level</div>
                <div style="color: ${game.color}; font-size: 24px; font-weight: bold;" id="fib-target">${targetLevel}</div>
                <div style="color: #666; font-size: 11px;">Current Price: $<span id="fib-price">100</span></div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="fib-buy" style="padding: 12px 30px; background: linear-gradient(135deg, #22c55e, #16a34a); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">BUY</button>
                <button id="fib-sell" style="padding: 12px 30px; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">SELL</button>
                <button id="fib-hold" style="padding: 12px 30px; background: linear-gradient(135deg, #6b7280, #4b5563); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">HOLD</button>
            </div>

            <div style="margin-top: 15px; text-align: center; color: #888; font-size: 12px;">
                Round <span id="fib-round">1</span>/${rounds}
            </div>
        </div>
    `;

    let priceInterval;
    const marker = container.querySelector('#fib-marker');
    const priceDisplay = container.querySelector('#fib-price');

    function updatePrice() {
        const data = minigameState.gameData;
        // Price moves randomly but tends toward Fibonacci levels
        const drift = (Math.random() - 0.5) * 20;
        data.price = Math.max(50, Math.min(150, data.price + drift));
        priceDisplay.textContent = Math.round(data.price);
        marker.style.top = `${(1 - (data.price - 50) / 100) * 100}%`;
    }

    priceInterval = setInterval(updatePrice, 500);

    function handleAction(action) {
        const data = minigameState.gameData;
        const currentFibLevel = (data.price - 50) / 100;
        const distanceToTarget = Math.abs(currentFibLevel - data.targetLevel);

        let points = 0;
        if (distanceToTarget < 0.05) points = 100;
        else if (distanceToTarget < 0.1) points = 75;
        else if (distanceToTarget < 0.2) points = 50;
        else points = 25;

        if (action === 'buy' && currentFibLevel < data.targetLevel) points *= 1.5;
        if (action === 'sell' && currentFibLevel > data.targetLevel) points *= 1.5;

        data.score += Math.round(points);
        data.round++;

        if (data.round > data.totalRounds) {
            clearInterval(priceInterval);
            const finalScore = Math.min(100, Math.round(data.score / data.totalRounds));
            endMinigame(container, finalScore, finalScore >= 90);
        } else {
            data.targetLevel = FIBONACCI_LEVELS[Math.floor(Math.random() * 5) + 1];
            container.querySelector('#fib-target').textContent = data.targetLevel;
            container.querySelector('#fib-round').textContent = data.round;
        }
    }

    container.querySelector('#fib-buy').addEventListener('click', () => handleAction('buy'));
    container.querySelector('#fib-sell').addEventListener('click', () => handleAction('sell'));
    container.querySelector('#fib-hold').addEventListener('click', () => handleAction('hold'));
}

// ============================================
// HASH MATCH
// ============================================

function renderHashMatch(container) {
    const game = MINIGAMES.hash_match;
    const hashes = generateHashPairs(6);

    minigameState.gameData = {
        hashes,
        matched: [],
        firstPick: null,
        attempts: 0,
        timeLeft: 45
    };

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a24, #12121a); padding: 20px; border-radius: 16px; border: 2px solid ${game.color}40;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">${game.icon}</span>
                    <div>
                        <h3 style="color: ${game.color}; margin: 0;">${game.name}</h3>
                        <div style="color: #888; font-size: 12px;">Match the blockchain hashes!</div>
                    </div>
                </div>
                <div style="padding: 8px 16px; background: ${game.color}20; border: 1px solid ${game.color}; border-radius: 8px;">
                    <span style="color: ${game.color}; font-size: 18px; font-weight: bold;" id="hash-timer">45s</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;" id="hash-grid">
                ${shuffleArray([...hashes, ...hashes]).map((hash, i) => `
                    <div class="hash-card" data-hash="${hash}" data-index="${i}" style="
                        aspect-ratio: 1; background: #12121a; border: 2px solid #333; border-radius: 12px;
                        display: flex; align-items: center; justify-content: center; cursor: pointer;
                        font-family: monospace; font-size: 11px; color: #666; transition: all 0.3s;
                        padding: 8px; text-align: center; word-break: break-all;
                    ">
                        <span style="color: ${game.color}; font-size: 24px;">?</span>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 15px; text-align: center; color: #888; font-size: 12px;">
                Matched: <span id="hash-matched">0</span>/6
            </div>
        </div>
    `;

    const timer = container.querySelector('#hash-timer');
    const matchedDisplay = container.querySelector('#hash-matched');

    const countdown = setInterval(() => {
        minigameState.gameData.timeLeft--;
        timer.textContent = `${minigameState.gameData.timeLeft}s`;

        if (minigameState.gameData.timeLeft <= 0) {
            clearInterval(countdown);
            const score = Math.round((minigameState.gameData.matched.length / 6) * 100);
            endMinigame(container, score, score >= 90);
        }
    }, 1000);

    container.querySelectorAll('.hash-card').forEach(card => {
        card.addEventListener('click', () => {
            const data = minigameState.gameData;
            const index = parseInt(card.dataset.index);
            const hash = card.dataset.hash;

            if (data.matched.includes(hash) || card.classList.contains('revealed')) return;

            card.innerHTML = hash;
            card.style.borderColor = game.color;
            card.classList.add('revealed');

            if (data.firstPick === null) {
                data.firstPick = { index, hash, card };
            } else {
                data.attempts++;
                if (data.firstPick.hash === hash && data.firstPick.index !== index) {
                    // Match!
                    data.matched.push(hash);
                    matchedDisplay.textContent = data.matched.length;
                    card.style.background = `${game.color}30`;
                    data.firstPick.card.style.background = `${game.color}30`;

                    if (data.matched.length === 6) {
                        clearInterval(countdown);
                        const timeBonus = Math.round(data.timeLeft * 2);
                        const score = Math.min(100, 70 + timeBonus - (data.attempts * 2));
                        endMinigame(container, score, score >= 90);
                    }
                } else {
                    // No match
                    const firstCard = data.firstPick.card;
                    setTimeout(() => {
                        card.innerHTML = `<span style="color: ${game.color}; font-size: 24px;">?</span>`;
                        card.style.borderColor = '#333';
                        card.classList.remove('revealed');
                        firstCard.innerHTML = `<span style="color: ${game.color}; font-size: 24px;">?</span>`;
                        firstCard.style.borderColor = '#333';
                        firstCard.classList.remove('revealed');
                    }, 800);
                }
                data.firstPick = null;
            }
        });
    });
}

function generateHashPairs(count) {
    const chars = '0123456789abcdef';
    const hashes = [];
    for (let i = 0; i < count; i++) {
        let hash = '0x';
        for (let j = 0; j < 6; j++) {
            hash += chars[Math.floor(Math.random() * chars.length)];
        }
        hashes.push(hash);
    }
    return hashes;
}

// ============================================
// TOKEN CATCHER
// ============================================

function renderTokenCatcher(container) {
    const game = MINIGAMES.token_catcher;

    minigameState.gameData = {
        score: 0,
        caught: 0,
        missed: 0,
        timeLeft: 30
    };

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a24, #12121a); padding: 20px; border-radius: 16px; border: 2px solid ${game.color}40;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">${game.icon}</span>
                    <div>
                        <h3 style="color: ${game.color}; margin: 0;">${game.name}</h3>
                        <div style="color: #888; font-size: 12px;">Catch tokens, avoid rugs!</div>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <div style="padding: 8px 12px; background: #22c55e20; border: 1px solid #22c55e; border-radius: 8px;">
                        <span style="color: #22c55e; font-weight: bold;" id="tc-score">0</span>
                    </div>
                    <div style="padding: 8px 12px; background: ${game.color}20; border: 1px solid ${game.color}; border-radius: 8px;">
                        <span style="color: ${game.color}; font-weight: bold;" id="tc-timer">30s</span>
                    </div>
                </div>
            </div>

            <div style="position: relative; height: 300px; background: #12121a; border-radius: 12px; border: 1px solid #333; overflow: hidden;" id="tc-arena">
            </div>

            <div style="margin-top: 15px; display: flex; justify-content: center; gap: 20px;">
                <div style="color: #22c55e; font-size: 14px;">🪙 Caught: <span id="tc-caught">0</span></div>
                <div style="color: #ef4444; font-size: 14px;">💀 Missed: <span id="tc-missed">0</span></div>
            </div>
        </div>
    `;

    const arena = container.querySelector('#tc-arena');
    const scoreDisplay = container.querySelector('#tc-score');
    const timerDisplay = container.querySelector('#tc-timer');
    const caughtDisplay = container.querySelector('#tc-caught');
    const missedDisplay = container.querySelector('#tc-missed');

    const spawnInterval = setInterval(() => spawnToken(arena), 800);

    const countdown = setInterval(() => {
        minigameState.gameData.timeLeft--;
        timerDisplay.textContent = `${minigameState.gameData.timeLeft}s`;

        if (minigameState.gameData.timeLeft <= 0) {
            clearInterval(countdown);
            clearInterval(spawnInterval);
            const data = minigameState.gameData;
            const total = data.caught + data.missed;
            const score = total > 0 ? Math.round((data.score / (total * 10)) * 100) : 0;
            endMinigame(container, Math.min(100, score), score >= 90);
        }
    }, 1000);

    function spawnToken(arena) {
        const isRug = Math.random() < 0.25;
        const token = document.createElement('div');
        token.style.cssText = `
            position: absolute;
            width: 40px; height: 40px;
            left: ${Math.random() * (arena.offsetWidth - 40)}px;
            top: -40px;
            font-size: 28px;
            cursor: pointer;
            transition: top 3s linear;
            z-index: 10;
        `;
        token.textContent = isRug ? '💀' : '🪙';
        token.dataset.isRug = isRug;

        arena.appendChild(token);

        setTimeout(() => {
            token.style.top = `${arena.offsetHeight + 40}px`;
        }, 50);

        token.addEventListener('click', () => {
            const data = minigameState.gameData;
            if (token.dataset.isRug === 'true') {
                data.score -= 15;
                data.missed++;
                token.style.transform = 'scale(1.5)';
                token.style.opacity = '0.5';
            } else {
                data.score += 10;
                data.caught++;
                token.style.transform = 'scale(1.5)';
            }
            scoreDisplay.textContent = Math.max(0, data.score);
            caughtDisplay.textContent = data.caught;
            missedDisplay.textContent = data.missed;
            setTimeout(() => token.remove(), 200);
        });

        setTimeout(() => {
            if (token.parentNode) {
                const data = minigameState.gameData;
                if (token.dataset.isRug === 'false') {
                    data.missed++;
                    missedDisplay.textContent = data.missed;
                }
                token.remove();
            }
        }, 3200);
    }
}

// ============================================
// GAS OPTIMIZER
// ============================================

function renderGasOptimizer(container) {
    const game = MINIGAMES.gas_optimizer;
    const rounds = 8;

    minigameState.gameData = {
        round: 1,
        totalRounds: rounds,
        score: 0,
        gasPrice: 50,
        targetRange: { min: 30, max: 50 }
    };

    container.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a24, #12121a); padding: 20px; border-radius: 16px; border: 2px solid ${game.color}40;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 28px;">${game.icon}</span>
                    <div>
                        <h3 style="color: ${game.color}; margin: 0;">${game.name}</h3>
                        <div style="color: #888; font-size: 12px;">Submit at optimal gas!</div>
                    </div>
                </div>
                <div style="padding: 8px 16px; background: #1a1a24; border: 1px solid #333; border-radius: 8px;">
                    <span style="color: #888; font-size: 12px;">Round </span>
                    <span style="color: ${game.color}; font-weight: bold;" id="gas-round">1</span>
                    <span style="color: #888; font-size: 12px;">/${rounds}</span>
                </div>
            </div>

            <div style="background: #12121a; border-radius: 12px; border: 1px solid #333; padding: 20px; margin-bottom: 20px;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <div style="color: #888; font-size: 12px;">Current Gas Price</div>
                    <div style="font-size: 48px; font-weight: bold; color: ${game.color};" id="gas-price">50</div>
                    <div style="color: #666; font-size: 11px;">gwei</div>
                </div>

                <div style="position: relative; height: 30px; background: linear-gradient(90deg, #22c55e, #fbbf24, #ef4444); border-radius: 15px; margin-bottom: 10px;">
                    <div style="position: absolute; width: 4px; height: 40px; background: white; top: -5px; transition: left 0.3s;" id="gas-marker"></div>
                    <div style="position: absolute; height: 100%; background: rgba(255,255,255,0.3); border-radius: 15px; transition: all 0.3s;" id="gas-target"></div>
                </div>

                <div style="display: flex; justify-content: space-between; color: #666; font-size: 10px;">
                    <span>10 gwei</span>
                    <span>Target Zone</span>
                    <span>100 gwei</span>
                </div>
            </div>

            <button id="gas-submit" style="
                width: 100%; padding: 15px;
                background: linear-gradient(135deg, ${game.color}, ${game.color}dd);
                border: none; border-radius: 10px;
                color: white; font-size: 16px; font-weight: bold;
                cursor: pointer; transition: all 0.2s;
            ">⚡ SUBMIT TRANSACTION</button>

            <div style="margin-top: 15px; text-align: center; color: #888; font-size: 12px;">
                Score: <span style="color: ${game.color};" id="gas-score">0</span>
            </div>
        </div>
    `;

    const priceDisplay = container.querySelector('#gas-price');
    const marker = container.querySelector('#gas-marker');
    const targetZone = container.querySelector('#gas-target');
    const roundDisplay = container.querySelector('#gas-round');
    const scoreDisplay = container.querySelector('#gas-score');

    function setTargetZone() {
        const data = minigameState.gameData;
        data.targetRange.min = 20 + Math.random() * 30;
        data.targetRange.max = data.targetRange.min + 15 + Math.random() * 15;

        const left = ((data.targetRange.min - 10) / 90) * 100;
        const width = ((data.targetRange.max - data.targetRange.min) / 90) * 100;
        targetZone.style.left = `${left}%`;
        targetZone.style.width = `${width}%`;
    }

    setTargetZone();

    const priceInterval = setInterval(() => {
        const data = minigameState.gameData;
        data.gasPrice += (Math.random() - 0.5) * 15;
        data.gasPrice = Math.max(10, Math.min(100, data.gasPrice));
        priceDisplay.textContent = Math.round(data.gasPrice);
        marker.style.left = `${((data.gasPrice - 10) / 90) * 100}%`;
    }, 200);

    container.querySelector('#gas-submit').addEventListener('click', () => {
        const data = minigameState.gameData;
        let points = 0;

        if (data.gasPrice >= data.targetRange.min && data.gasPrice <= data.targetRange.max) {
            // Perfect hit
            const center = (data.targetRange.min + data.targetRange.max) / 2;
            const distFromCenter = Math.abs(data.gasPrice - center);
            points = 100 - Math.round(distFromCenter * 2);
        } else {
            // Miss - give some points based on distance
            const distFromZone = data.gasPrice < data.targetRange.min
                ? data.targetRange.min - data.gasPrice
                : data.gasPrice - data.targetRange.max;
            points = Math.max(0, 50 - Math.round(distFromZone * 2));
        }

        data.score += points;
        scoreDisplay.textContent = data.score;
        data.round++;

        if (data.round > data.totalRounds) {
            clearInterval(priceInterval);
            const finalScore = Math.round(data.score / data.totalRounds);
            endMinigame(container, Math.min(100, finalScore), finalScore >= 90);
        } else {
            roundDisplay.textContent = data.round;
            setTargetZone();
        }
    });
}

// ============================================
// RESULT SCREEN
// ============================================

function renderMinigameResult(container, result) {
    const grade = result.score >= 90 ? 'S' :
                  result.score >= 80 ? 'A' :
                  result.score >= 70 ? 'B' :
                  result.score >= 50 ? 'C' : 'D';

    const gradeColors = { S: '#fbbf24', A: '#22c55e', B: '#3b82f6', C: '#f97316', D: '#ef4444' };

    container.innerHTML = `
        <div class="minigame-result">
            <div class="result-header">
                <span class="result-icon">${result.game.icon}</span>
                <h3>${result.game.name}</h3>
            </div>

            <div class="result-grade" style="color: ${gradeColors[grade]}">
                ${grade}
            </div>

            <div class="result-score">
                Score: ${result.score}%
                ${result.isPerfect ? '<span class="perfect-badge">PERFECT!</span>' : ''}
            </div>

            <div class="result-time">
                Time: ${Math.floor(result.timeTaken / 1000)}s
            </div>

            <div class="result-rewards">
                <div class="reward-item">&#10024; +${result.xp} XP</div>
                <div class="reward-item">&#128176; +${result.tokens} Tokens</div>
            </div>

            <button class="btn-primary btn-play-again" id="play-again-btn">Play Again</button>
            <button class="btn-secondary btn-close-game" id="close-game-btn">Close</button>
        </div>
    `;

    container.querySelector('#play-again-btn').addEventListener('click', () => {
        startMinigame(result.game.id, container);
    });

    container.querySelector('#close-game-btn').addEventListener('click', () => {
        container.innerHTML = '';
        document.dispatchEvent(new CustomEvent('pumparena:minigame-closed'));
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// MINI-GAMES PANEL
// ============================================

function renderMinigamesPanel(container) {
    const state = window.PumpArenaState.get();

    container.innerHTML = `
        <div class="minigames-panel">
            <div class="panel-header">
                <h3>&#127918; Mini-Games</h3>
                <div class="influence-display">
                    <span class="influence-icon">&#9889;</span>
                    <span class="influence-value">${state.resources.influence}</span>
                </div>
            </div>

            <div class="games-grid">
                ${Object.values(MINIGAMES).map(game => {
                    const canPlay = state.resources.influence >= game.influenceCost;
                    return `
                        <div class="game-card ${!canPlay ? 'locked' : ''}" style="--game-color: ${game.color}">
                            <div class="game-icon">${game.icon}</div>
                            <h4 class="game-name">${game.name}</h4>
                            <p class="game-desc">${game.description}</p>
                            <div class="game-cost">
                                <span class="cost-icon">&#9889;</span>
                                <span class="cost-value">${game.influenceCost}</span>
                            </div>
                            <div class="game-rewards">
                                <span>&#10024; ${game.rewards.base.xp}-${game.rewards.perfect.xp} XP</span>
                            </div>
                            <button class="btn-play" data-game="${game.id}" ${!canPlay ? 'disabled' : ''}>
                                ${canPlay ? 'Play' : 'Not enough &#9889;'}
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('.btn-play:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const gameId = btn.dataset.game;
            startMinigame(gameId, container);
        });
    });
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.PumpArenaMinigames = {
        MINIGAMES,
        canPlay: canPlayMinigame,
        start: startMinigame,
        renderPanel: renderMinigamesPanel,
        getActiveGame: () => minigameState.active
    };
}
