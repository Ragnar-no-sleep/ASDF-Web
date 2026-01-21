/**
 * ASDF Games - WhaleWatch Engine
 *
 * Split-screen cognitive game:
 * - Left: Symbol Match (find all matching symbols by name)
 * - Right: Memory Sequence (Simon-like pattern recall)
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const WhaleWatch = {
    version: '1.1.0', // Fibonacci timing
    gameId: 'whalewatch',
    state: null,
    timerInterval: null,
    memoryTimerInterval: null,

    // Symbol legend with names
    symbolLegend: [
        { symbol: '&#128293;', name: 'Fire' },
        { symbol: '&#128142;', name: 'Diamond' },
        { symbol: '&#128640;', name: 'Rocket' },
        { symbol: '&#128176;', name: 'Money' },
        { symbol: '&#11088;', name: 'Star' },
        { symbol: '&#127918;', name: 'Game' },
        { symbol: '&#127942;', name: 'Trophy' },
        { symbol: '&#128171;', name: 'Sparkle' },
    ],

    /**
     * Start the game
     */
    start(gameId) {
        this.gameId = gameId;
        const arena = document.getElementById(`arena-${gameId}`);
        if (!arena) return;

        this.state = {
            score: 0,
            level: 1,
            gameOver: false,
            // Symbol Match (left side)
            symbolMatch: {
                grid: [],
                targetIndex: 0,
                foundCount: 0,
                totalTargets: 0,
                timer: 55,        // fib[9]
                cols: 5,          // fib[4]
                rows: 5,          // fib[4]
                completed: false,
                mistakes: 0,
                maxMistakes: 3,
            },
            // Memory Game (right side)
            memoryGame: {
                sequence: [],
                playerSequence: [],
                showingSequence: false,
                currentShowIndex: 0,
                waitingForInput: false,
                inputTimer: 0,
                inputTimeLimit: 13,  // fib[6]
                buttons: [],
                round: 1,
                completed: false,
            },
            colors: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'],
        };

        this.createArena(arena);
        this.buildLegend();
        this.setupSymbolHunt();
        this.setupMemoryGame();
        this.startTimer();

        if (typeof activeGames !== 'undefined') {
            activeGames[gameId] = {
                cleanup: () => this.stop()
            };
        }
    },

    /**
     * Create arena HTML
     */
    createArena(arena) {
        arena.innerHTML = `
            <div style="width:100%;height:100%;display:flex;gap:15px;background:linear-gradient(180deg,#0a1628 0%,#1a2744 100%);padding:15px;box-sizing:border-box;">
                <!-- LEFT: Symbol Match with Legend -->
                <div style="flex:1;display:flex;flex-direction:column;background:rgba(0,0,0,0.3);border-radius:12px;padding:15px;border:2px solid #333;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-size:14px;font-weight:bold;color:var(--gold);">&#127919; SYMBOL MATCH</div>
                        <div style="display:flex;gap:10px;">
                            <span style="color:var(--accent-fire);font-size:12px;">&#9202; <span id="sm-timer">45</span>s</span>
                            <span style="color:var(--green);font-size:12px;"><span id="sm-found">0</span>/<span id="sm-total">0</span></span>
                            <span style="color:#ef4444;font-size:12px;">&#10060; <span id="sm-mistakes">0</span>/3</span>
                        </div>
                    </div>
                    <!-- Legend -->
                    <div id="symbol-legend" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px;padding:6px;background:rgba(0,0,0,0.4);border-radius:8px;font-size:10px;"></div>
                    <!-- Target description -->
                    <div style="text-align:center;margin-bottom:8px;padding:8px;background:rgba(251,191,36,0.2);border-radius:8px;">
                        <span style="font-size:11px;color:var(--text-muted);">Find all: </span>
                        <span id="sm-target-name" style="font-size:16px;font-weight:bold;color:var(--gold);">Fire</span>
                    </div>
                    <div id="symbol-grid" style="flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;"></div>
                </div>
                <!-- RIGHT: Memory Game with Timer -->
                <div style="flex:1;display:flex;flex-direction:column;background:rgba(0,0,0,0.3);border-radius:12px;padding:15px;border:2px solid #333;position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-size:14px;font-weight:bold;color:var(--purple);">&#129504; MEMORY SEQUENCE</div>
                        <div style="display:flex;gap:10px;">
                            <span style="color:var(--cyan);font-size:12px;">Round: <span id="mem-round">1</span></span>
                        </div>
                    </div>
                    <!-- Input Timer Bar -->
                    <div style="margin-bottom:8px;height:8px;background:rgba(0,0,0,0.5);border-radius:4px;overflow:hidden;">
                        <div id="mem-timer-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#fbbf24);transition:width 0.1s linear;"></div>
                    </div>
                    <div id="mem-status" style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:10px;">Watch the sequence!</div>
                    <div id="mem-timer-display" style="text-align:center;font-size:18px;font-weight:bold;color:var(--green);margin-bottom:10px;display:none;">10s</div>
                    <div id="memory-buttons" style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:15px;max-width:250px;margin:0 auto;"></div>
                </div>
            </div>
            <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:20px;z-index:10;">
                <div style="background:rgba(0,0,0,0.8);padding:8px 20px;border-radius:8px;border:2px solid var(--gold);">
                    <span style="color:var(--gold);font-size:16px;font-weight:bold;">SCORE: <span id="ww-score">0</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.8);padding:8px 20px;border-radius:8px;border:2px solid var(--purple);">
                    <span style="color:var(--purple);font-size:16px;font-weight:bold;">LEVEL: <span id="ww-level">1</span></span>
                </div>
            </div>
        `;
    },

    /**
     * Build legend display
     */
    buildLegend() {
        const legendEl = document.getElementById('symbol-legend');
        legendEl.innerHTML = '';
        this.symbolLegend.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.style.cssText = 'display:flex;align-items:center;gap:3px;padding:2px 4px;background:rgba(255,255,255,0.1);border-radius:4px;';
            legendItem.innerHTML = `<span style="font-size:14px;">${item.symbol}</span><span style="color:#9ca3af;">${item.name}</span>`;
            legendEl.appendChild(legendItem);
        });
    },

    /**
     * Setup Symbol Hunt game (left side)
     */
    setupSymbolHunt() {
        const symbolGrid = document.getElementById('symbol-grid');
        const smTimerEl = document.getElementById('sm-timer');
        const smFoundEl = document.getElementById('sm-found');
        const smTotalEl = document.getElementById('sm-total');
        const smTargetNameEl = document.getElementById('sm-target-name');
        const smMistakesEl = document.getElementById('sm-mistakes');

        this.state.symbolMatch.grid = [];
        this.state.symbolMatch.foundCount = 0;
        this.state.symbolMatch.completed = false;
        this.state.symbolMatch.mistakes = 0;
        smMistakesEl.textContent = '0';

        // Pick target from legend
        this.state.symbolMatch.targetIndex = Math.floor(Math.random() * this.symbolLegend.length);
        const target = this.symbolLegend[this.state.symbolMatch.targetIndex];
        smTargetNameEl.textContent = target.name;

        // Create grid
        const totalCells = this.state.symbolMatch.cols * this.state.symbolMatch.rows;
        this.state.symbolMatch.totalTargets = 3 + this.state.level;

        const gridSymbols = [];

        for (let i = 0; i < this.state.symbolMatch.totalTargets; i++) {
            gridSymbols.push({ symbol: target.symbol, isTarget: true, found: false });
        }

        for (let i = this.state.symbolMatch.totalTargets; i < totalCells; i++) {
            let randomItem;
            do {
                randomItem = this.symbolLegend[Math.floor(Math.random() * this.symbolLegend.length)];
            } while (randomItem.symbol === target.symbol);
            gridSymbols.push({ symbol: randomItem.symbol, isTarget: false, found: false });
        }

        this.state.symbolMatch.grid = gridSymbols.sort(() => Math.random() - 0.5);

        smTotalEl.textContent = this.state.symbolMatch.totalTargets;
        smFoundEl.textContent = '0';
        this.state.symbolMatch.timer = Math.max(20, 45 - this.state.level * 3);
        smTimerEl.textContent = this.state.symbolMatch.timer;

        symbolGrid.innerHTML = '';
        const self = this;
        this.state.symbolMatch.grid.forEach((cell, idx) => {
            const cellEl = document.createElement('div');
            cellEl.dataset.index = idx;
            cellEl.dataset.revealed = 'false';
            cellEl.style.cssText = `background:linear-gradient(135deg,#3b82f6,#1e40af);border:2px solid #60a5fa;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;transition:all 0.2s;`;
            cellEl.textContent = '❓';
            cellEl.onclick = () => self.clickSymbol(idx);
            symbolGrid.appendChild(cellEl);
        });
    },

    /**
     * Handle symbol click
     */
    clickSymbol(index) {
        if (this.state.symbolMatch.completed || this.state.gameOver) return;

        const symbolGrid = document.getElementById('symbol-grid');
        const smFoundEl = document.getElementById('sm-found');
        const smMistakesEl = document.getElementById('sm-mistakes');

        const cell = this.state.symbolMatch.grid[index];
        const cellEl = symbolGrid.children[index];

        if (cell.found) return;
        if (cellEl.dataset.revealed === 'true') return;

        cellEl.innerHTML = cell.symbol;
        cellEl.style.background = 'rgba(59,130,246,0.15)';

        if (cell.isTarget) {
            cell.found = true;
            cellEl.dataset.revealed = 'true';
            this.state.symbolMatch.foundCount++;
            smFoundEl.textContent = this.state.symbolMatch.foundCount;

            cellEl.style.background = 'rgba(34,197,94,0.5)';
            cellEl.style.borderColor = '#22c55e';
            cellEl.style.transform = 'scale(1.1)';
            setTimeout(() => (cellEl.style.transform = ''), 200);

            const bonus = 10 + this.state.level * 5;
            this.state.score += bonus;
            document.getElementById('ww-score').textContent = this.state.score;
            recordScoreUpdate(this.gameId, this.state.score, bonus);

            if (this.state.symbolMatch.foundCount >= this.state.symbolMatch.totalTargets) {
                this.state.symbolMatch.completed = true;
                const timeBonus = this.state.symbolMatch.timer * 3;
                this.state.score += timeBonus;
                document.getElementById('ww-score').textContent = this.state.score;

                const self = this;
                setTimeout(() => {
                    self.state.level++;
                    document.getElementById('ww-level').textContent = self.state.level;
                    self.setupSymbolHunt();
                    if (self.state.memoryGame.completed) {
                        self.startMemoryRound();
                    }
                }, 1000);
            }
        } else {
            cellEl.style.background = 'rgba(239,68,68,0.5)';
            cellEl.style.borderColor = '#ef4444';
            setTimeout(() => {
                cellEl.textContent = '❓';
                cellEl.style.background = 'linear-gradient(135deg,#3b82f6,#1e40af)';
                cellEl.style.borderColor = '#60a5fa';
            }, 500);

            this.state.score = Math.max(0, this.state.score - 5);
            document.getElementById('ww-score').textContent = this.state.score;

            this.state.symbolMatch.mistakes++;
            smMistakesEl.textContent = this.state.symbolMatch.mistakes;

            if (this.state.symbolMatch.mistakes >= this.state.symbolMatch.maxMistakes) {
                this.state.symbolMatch.mistakes = 0;
                smMistakesEl.textContent = '0';

                symbolGrid.style.boxShadow = '0 0 20px #ef4444';
                setTimeout(() => (symbolGrid.style.boxShadow = ''), 300);

                this.state.symbolMatch.grid.forEach((cell, idx) => {
                    if (cell.found && cell.isTarget) {
                        cell.found = false;
                        const cardEl = symbolGrid.children[idx];
                        cardEl.textContent = '❓';
                        cardEl.style.background = 'linear-gradient(135deg,#3b82f6,#1e40af)';
                        cardEl.style.borderColor = '#60a5fa';
                        cardEl.style.transform = '';
                        cardEl.dataset.revealed = 'false';
                    }
                });

                this.state.symbolMatch.foundCount = 0;
                smFoundEl.textContent = '0';

                this.state.score = Math.max(0, this.state.score - 20);
                document.getElementById('ww-score').textContent = this.state.score;
            }
        }

        updateScore(this.gameId, this.state.score);
    },

    /**
     * Setup Memory Game (right side)
     */
    setupMemoryGame() {
        const memButtons = document.getElementById('memory-buttons');
        const buttonConfigs = [
            { symbol: '&#129416;', name: 'shark', color: '#3b82f6' },
            { symbol: '&#128011;', name: 'whale', color: '#0ea5e9' },
            { symbol: '&#128031;', name: 'fish', color: '#22c55e' },
            { symbol: '&#128021;', name: 'dog', color: '#f59e0b' },
        ];

        memButtons.innerHTML = '';
        this.state.memoryGame.buttons = [];

        const self = this;
        buttonConfigs.forEach((config, idx) => {
            const btn = document.createElement('button');
            btn.dataset.index = idx;
            btn.dataset.name = config.name;
            btn.style.cssText = `
                background: linear-gradient(135deg, ${config.color}40, ${config.color}20);
                border: 4px solid ${config.color};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.15s;
                opacity: 0.7;
                min-height: 80px;
                font-size: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            btn.innerHTML = config.symbol;
            btn.onclick = () => self.playerPressButton(idx);
            memButtons.appendChild(btn);
            this.state.memoryGame.buttons.push({ el: btn, config });
        });

        this.startMemoryRound();
    },

    /**
     * Start a memory round
     */
    startMemoryRound() {
        const memStatusEl = document.getElementById('mem-status');
        const memTimerBarEl = document.getElementById('mem-timer-bar');
        const memTimerDisplayEl = document.getElementById('mem-timer-display');
        const memRoundEl = document.getElementById('mem-round');

        this.state.memoryGame.completed = false;
        this.state.memoryGame.playerSequence = [];
        this.state.memoryGame.waitingForInput = false;
        memStatusEl.textContent = 'Watch the sequence!';
        memStatusEl.style.color = '#a855f7';
        memTimerDisplayEl.style.display = 'none';
        memTimerBarEl.style.width = '100%';
        memTimerBarEl.style.background = 'linear-gradient(90deg,#22c55e,#fbbf24)';

        if (this.memoryTimerInterval) {
            clearInterval(this.memoryTimerInterval);
            this.memoryTimerInterval = null;
        }

        this.state.memoryGame.sequence.push(Math.floor(Math.random() * 4));
        memRoundEl.textContent = this.state.memoryGame.round;

        this.state.memoryGame.inputTimeLimit = Math.max(4, 10 - Math.floor(this.state.memoryGame.round / 3));

        setTimeout(() => this.showSequence(), 500);
    },

    /**
     * Show memory sequence
     */
    showSequence() {
        const self = this;
        this.state.memoryGame.showingSequence = true;
        this.state.memoryGame.currentShowIndex = 0;

        function showNext() {
            if (self.state.memoryGame.currentShowIndex >= self.state.memoryGame.sequence.length) {
                self.state.memoryGame.showingSequence = false;
                self.state.memoryGame.waitingForInput = true;
                document.getElementById('mem-status').textContent = 'Your turn!';
                document.getElementById('mem-status').style.color = '#22c55e';
                self.startMemoryInputTimer();
                return;
            }

            const btnIdx = self.state.memoryGame.sequence[self.state.memoryGame.currentShowIndex];
            self.flashButton(btnIdx, true);

            setTimeout(() => {
                self.flashButton(btnIdx, false);
                self.state.memoryGame.currentShowIndex++;
                setTimeout(showNext, 300);
            }, 500);
        }

        showNext();
    },

    /**
     * Start input timer for memory game
     */
    startMemoryInputTimer() {
        const memTimerBarEl = document.getElementById('mem-timer-bar');
        const memTimerDisplayEl = document.getElementById('mem-timer-display');

        this.state.memoryGame.inputTimer = this.state.memoryGame.inputTimeLimit;
        memTimerDisplayEl.style.display = 'block';
        memTimerDisplayEl.textContent = this.state.memoryGame.inputTimer + 's';

        const self = this;
        this.memoryTimerInterval = setInterval(() => {
            if (self.state.gameOver || !self.state.memoryGame.waitingForInput) {
                clearInterval(self.memoryTimerInterval);
                self.memoryTimerInterval = null;
                memTimerDisplayEl.style.display = 'none';
                return;
            }

            self.state.memoryGame.inputTimer -= 0.1;
            const timeLeft = Math.max(0, self.state.memoryGame.inputTimer);
            const percent = (timeLeft / self.state.memoryGame.inputTimeLimit) * 100;

            memTimerBarEl.style.width = percent + '%';
            memTimerDisplayEl.textContent = Math.ceil(timeLeft) + 's';

            if (percent < 30) {
                memTimerBarEl.style.background = '#ef4444';
                memTimerDisplayEl.style.color = '#ef4444';
            } else if (percent < 60) {
                memTimerBarEl.style.background = 'linear-gradient(90deg,#f59e0b,#ef4444)';
                memTimerDisplayEl.style.color = '#f59e0b';
            } else {
                memTimerDisplayEl.style.color = '#22c55e';
            }

            if (self.state.memoryGame.inputTimer <= 0) {
                clearInterval(self.memoryTimerInterval);
                self.memoryTimerInterval = null;
                self.state.memoryGame.waitingForInput = false;
                document.getElementById('mem-status').textContent = "⏰ Time's up! Game Over";
                document.getElementById('mem-status').style.color = '#ef4444';
                self.state.gameOver = true;
                setTimeout(() => endGame(self.gameId, self.state.score), 1500);
            }
        }, 100);
    },

    /**
     * Flash a memory button
     */
    flashButton(idx, on) {
        const button = this.state.memoryGame.buttons[idx];
        const btn = button.el;
        const config = button.config;
        if (on) {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1.1)';
            btn.style.borderColor = '#fff';
            btn.style.boxShadow = `0 0 20px ${config.color}`;
        } else {
            btn.style.opacity = '0.7';
            btn.style.transform = '';
            btn.style.borderColor = config.color;
            btn.style.boxShadow = '';
        }
    },

    /**
     * Handle player button press
     */
    playerPressButton(idx) {
        if (!this.state.memoryGame.waitingForInput || this.state.gameOver) return;

        const memStatusEl = document.getElementById('mem-status');
        const memTimerDisplayEl = document.getElementById('mem-timer-display');

        this.flashButton(idx, true);
        setTimeout(() => this.flashButton(idx, false), 200);

        this.state.memoryGame.playerSequence.push(idx);
        const currentPos = this.state.memoryGame.playerSequence.length - 1;

        if (this.state.memoryGame.sequence[currentPos] !== idx) {
            memStatusEl.textContent = '❌ Wrong! Game Over';
            memStatusEl.style.color = '#ef4444';
            this.state.gameOver = true;
            setTimeout(() => endGame(this.gameId, this.state.score), 1500);
            return;
        }

        const bonus = 5 * this.state.memoryGame.round;
        this.state.score += bonus;
        document.getElementById('ww-score').textContent = this.state.score;
        recordScoreUpdate(this.gameId, this.state.score, bonus);

        if (this.state.memoryGame.playerSequence.length === this.state.memoryGame.sequence.length) {
            if (this.memoryTimerInterval) {
                clearInterval(this.memoryTimerInterval);
                this.memoryTimerInterval = null;
            }
            memTimerDisplayEl.style.display = 'none';

            this.state.memoryGame.completed = true;
            this.state.memoryGame.waitingForInput = false;
            this.state.memoryGame.round++;

            const timeBonus = Math.floor(this.state.memoryGame.inputTimer * 5);
            const roundBonus = 20 * this.state.memoryGame.round + timeBonus;
            this.state.score += roundBonus;
            document.getElementById('ww-score').textContent = this.state.score;

            memStatusEl.textContent = '✅ Perfect! Next round...';
            memStatusEl.style.color = '#22c55e';

            setTimeout(() => this.startMemoryRound(), 1500);
        }

        updateScore(this.gameId, this.state.score);
    },

    /**
     * Start timer for symbol hunt
     */
    startTimer() {
        const smTimerEl = document.getElementById('sm-timer');
        const self = this;

        this.timerInterval = setInterval(() => {
            if (self.state.gameOver || self.state.symbolMatch.completed) return;

            self.state.symbolMatch.timer--;
            smTimerEl.textContent = self.state.symbolMatch.timer;

            if (self.state.symbolMatch.timer <= 10) {
                smTimerEl.style.color = '#ef4444';
            }

            if (self.state.symbolMatch.timer <= 0) {
                self.state.symbolMatch.timer = Math.max(20, 45 - self.state.level * 3);
                smTimerEl.style.color = '';
                self.setupSymbolHunt();
            }
        }, 1000);
    },

    /**
     * Stop the game
     */
    stop() {
        this.state.gameOver = true;
        clearInterval(this.timerInterval);
        if (this.memoryTimerInterval) {
            clearInterval(this.memoryTimerInterval);
        }
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.WhaleWatch = WhaleWatch;
}
