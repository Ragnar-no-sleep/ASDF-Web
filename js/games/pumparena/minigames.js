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
        icon: '&#128187;',
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
        icon: '&#128200;',
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
        icon: '&#129504;',
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
        icon: '&#127919;',
        color: '#f97316',
        influenceCost: 15,
        statBonus: 'com',
        rewards: {
            base: { xp: 60, tokens: 30 },
            perfect: { xp: 180, tokens: 100 }
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
    { q: 'What is a "rug pull"?', a: ['Scam exit', 'Price increase', 'New launch', 'Airdrop'], correct: 0 },
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
    window.PumpArenaState.useInfluence(game.influenceCost);

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

    container.innerHTML = `
        <div class="minigame-container shill-quiz">
            <div class="minigame-header">
                <h3>&#129504; Crypto Quiz</h3>
                <div class="quiz-progress">
                    Question ${minigameState.gameData.currentIndex + 1} / ${minigameState.gameData.questions.length}
                </div>
            </div>

            <div class="quiz-score">
                Score: <span id="quiz-score">${minigameState.gameData.correct}</span>
            </div>

            <div class="quiz-question">
                <p>${question.q}</p>
            </div>

            <div class="quiz-answers">
                ${shuffledAnswers.map((a, i) => `
                    <button class="quiz-answer" data-correct="${a.isCorrect}">
                        <span class="answer-letter">${String.fromCharCode(65 + i)}</span>
                        <span class="answer-text">${a.text}</span>
                    </button>
                `).join('')}
            </div>

            <div class="quiz-feedback" id="quiz-feedback"></div>
        </div>
    `;

    const feedbackEl = container.querySelector('#quiz-feedback');
    const scoreEl = container.querySelector('#quiz-score');

    container.querySelectorAll('.quiz-answer').forEach(btn => {
        btn.addEventListener('click', () => {
            const isCorrect = btn.dataset.correct === 'true';

            // Disable all buttons
            container.querySelectorAll('.quiz-answer').forEach(b => {
                b.disabled = true;
                if (b.dataset.correct === 'true') {
                    b.classList.add('correct');
                } else if (b === btn && !isCorrect) {
                    b.classList.add('wrong');
                }
            });

            if (isCorrect) {
                minigameState.gameData.correct++;
                scoreEl.textContent = minigameState.gameData.correct;
                feedbackEl.innerHTML = '<span class="correct">&#10003; Correct!</span>';
            } else {
                feedbackEl.innerHTML = '<span class="error">&#10007; Wrong!</span>';
            }
            feedbackEl.classList.add('show');

            minigameState.gameData.currentIndex++;

            setTimeout(() => {
                if (minigameState.gameData.currentIndex >= minigameState.gameData.questions.length) {
                    const score = Math.floor((minigameState.gameData.correct / minigameState.gameData.questions.length) * 100);
                    endMinigame(container, score, score === 100);
                } else {
                    renderQuizQuestion(container, minigameState.gameData.questions[minigameState.gameData.currentIndex]);
                }
            }, 1000);
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
