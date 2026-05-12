/**
 * WhaleWatch Game Engine — Dual cognitive game (Symbol Match + Memory Sequence)
 * Coordinator: GameKit + framework integration
 * @module games/engines/whalewatch
 */

'use strict';

const WhaleWatch = {
  gameId: 'whalewatch',
  version: '2.0.0', // Modular rewrite

  async start(gameId) {
    // Initialize game state
    this.state = WhaleWatchEntities.createGameState();
    this.timerInterval = null;
    this.memoryTimerInterval = null;
    this.particles = [];

    const arena = document.getElementById(`arena-${gameId}`);
    if (!arena) return;

    // Create arena HTML
    arena.innerHTML = WhaleWatchRenderer.createArena(gameId);

    // Build legend
    const legendEl = document.getElementById('symbol-legend');
    legendEl.innerHTML = WhaleWatchRenderer.buildLegend(WhaleWatchEntities.symbolLegend);

    // Setup both games
    this.setupSymbolHunt();
    this.setupMemoryGame();
    this.startSymbolTimer();

    // Register cleanup
    if (typeof activeGames !== 'undefined') {
      activeGames[gameId] = {
        cleanup: () => this.stop(),
      };
    }
  },

  async stop() {
    this.state.gameOver = true;
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.memoryTimerInterval) clearInterval(this.memoryTimerInterval);
  },

  /**
   * Setup symbol hunt (left side)
   */
  setupSymbolHunt() {
    const symbolGrid = document.getElementById('symbol-grid');
    const smTimerEl = document.getElementById('sm-timer');
    const smFoundEl = document.getElementById('sm-found');
    const smTotalEl = document.getElementById('sm-total');
    const smTargetNameEl = document.getElementById('sm-target-name');
    const smMistakesEl = document.getElementById('sm-mistakes');
    const hintsLeftEl = document.getElementById('hints-left');
    const hintBtn = document.getElementById('hint-btn');

    // Reset state
    this.state.symbolMatch.foundCount = 0;
    this.state.symbolMatch.completed = false;
    this.state.symbolMatch.mistakes = 0;
    this.state.symbolMatch.combo = 0;

    // Setup hint button
    if (hintBtn) {
      hintBtn.onclick = () => this.useHint();
      hintsLeftEl.textContent = this.state.symbolMatch.hintsRemaining;
      hintBtn.style.opacity = this.state.symbolMatch.hintsRemaining > 0 ? '1' : '0.5';
    }

    // Create grid
    const gridData = WhaleWatchEntities.createSymbolGrid(
      this.state.level,
      WhaleWatchEntities.symbolLegend
    );
    this.state.symbolMatch.grid = gridData.grid;
    this.state.symbolMatch.totalTargets = gridData.totalTargets;
    this.state.symbolMatch.cols = gridData.cols;
    this.state.symbolMatch.rows = gridData.rows;
    this.state.symbolMatch.targetIndex = gridData.targetIndex;
    this.state.symbolMatch.timer =
      WhaleWatchEntities.difficulty.timerPerLevel[Math.min(this.state.level - 1, 6)];

    // Update UI
    symbolGrid.style.gridTemplateColumns = `repeat(${gridData.cols}, 1fr)`;
    smTargetNameEl.textContent = gridData.target.name;
    smTotalEl.textContent = gridData.totalTargets;
    smFoundEl.textContent = '0';
    smTimerEl.textContent = this.state.symbolMatch.timer;
    smMistakesEl.textContent = '0';

    // Create cards
    symbolGrid.innerHTML = '';
    this.state.symbolMatch.grid.forEach((cell, idx) => {
      const card = WhaleWatchRenderer.createFlipCard(cell.symbol, idx, () => this.clickSymbol(idx));
      symbolGrid.appendChild(card);
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
    const comboDisplay = document.getElementById('combo-display');
    const comboCount = document.getElementById('combo-count');

    const cell = this.state.symbolMatch.grid[index];
    const cardContainer = symbolGrid.children[index];

    if (
      cell.found ||
      cardContainer.querySelector('.flip-card-inner').classList.contains('flipped')
    ) {
      return;
    }

    // Flip card
    WhaleWatchRenderer.flipCard(cardContainer);

    if (cell.isTarget) {
      cell.found = true;
      this.state.symbolMatch.foundCount++;
      smFoundEl.textContent = this.state.symbolMatch.foundCount;

      // Update combo
      const now = Date.now();
      if (now - this.state.symbolMatch.lastFindTime < this.state.symbolMatch.comboTimeout) {
        this.state.symbolMatch.combo++;
      } else {
        this.state.symbolMatch.combo = 1;
      }
      this.state.symbolMatch.lastFindTime = now;

      // Show combo
      if (this.state.symbolMatch.combo > 1) {
        comboCount.textContent = this.state.symbolMatch.combo;
        comboDisplay.style.display = 'block';
        comboDisplay.style.animation = 'none';
        comboDisplay.offsetHeight;
        comboDisplay.style.animation = 'pulse 0.3s ease-out';
      }

      // Mark card found
      WhaleWatchRenderer.markCardFound(cardContainer);
      cardContainer.style.transform = 'scale(1.1)';
      setTimeout(() => (cardContainer.style.transform = ''), 200);

      // Spawn particles
      const rect = cardContainer.getBoundingClientRect();
      this.particles.push(
        ...WhaleWatchEntities.spawnCelebration(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
      );

      // Score
      const bonus = WhaleWatchEntities.calculateSymbolScore(
        this.state.level,
        this.state.symbolMatch.combo
      );
      this.state.score += bonus;
      document.getElementById('ww-score').textContent = this.state.score;
      if (typeof recordScoreUpdate === 'function') {
        recordScoreUpdate(this.gameId, this.state.score, bonus);
      }

      // Check completion
      if (this.state.symbolMatch.foundCount >= this.state.symbolMatch.totalTargets) {
        this.state.symbolMatch.completed = true;
        const timeBonus = WhaleWatchEntities.calculateTimeBonus(this.state.symbolMatch.timer);
        this.state.score += timeBonus;
        document.getElementById('ww-score').textContent = this.state.score;

        // Celebration
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const x = 100 + Math.random() * 200;
            const y = 100 + Math.random() * 200;
            this.particles.push(...WhaleWatchEntities.spawnCelebration(x, y, 12));
          }, i * 100);
        }

        setTimeout(() => {
          comboDisplay.style.display = 'none';
          this.state.level++;
          document.getElementById('ww-level').textContent = this.state.level;
          this.setupSymbolHunt();
          if (this.state.memoryGame.completed) {
            this.startMemoryRound();
          }
        }, 1000);
      }
    } else {
      // Wrong card
      WhaleWatchRenderer.markCardWrong(cardContainer);

      this.state.symbolMatch.combo = 0;
      comboDisplay.style.display = 'none';

      setTimeout(() => {
        WhaleWatchRenderer.unflipCard(cardContainer);
        WhaleWatchRenderer.resetCardStyle(cardContainer);
      }, 500);

      this.state.score = Math.max(0, this.state.score - 5);
      document.getElementById('ww-score').textContent = this.state.score;

      this.state.symbolMatch.mistakes++;
      smMistakesEl.textContent = this.state.symbolMatch.mistakes;

      // Reset on max mistakes
      if (this.state.symbolMatch.mistakes >= this.state.symbolMatch.maxMistakes) {
        this.state.symbolMatch.mistakes = 0;
        smMistakesEl.textContent = '0';
        symbolGrid.style.boxShadow = '0 0 20px #ef4444';
        setTimeout(() => (symbolGrid.style.boxShadow = ''), 300);

        // Unflip all found cards
        this.state.symbolMatch.grid.forEach((cell, idx) => {
          if (cell.found && cell.isTarget) {
            cell.found = false;
            WhaleWatchRenderer.unflipCard(symbolGrid.children[idx]);
            WhaleWatchRenderer.resetCardStyle(symbolGrid.children[idx]);
          }
        });

        this.state.symbolMatch.foundCount = 0;
        smFoundEl.textContent = '0';

        this.state.score = Math.max(0, this.state.score - 20);
        document.getElementById('ww-score').textContent = this.state.score;
      }
    }

    if (typeof updateScore === 'function') updateScore(this.gameId, this.state.score);
  },

  /**
   * Use hint to reveal target
   */
  useHint() {
    if (this.state.symbolMatch.hintsRemaining <= 0 || this.state.symbolMatch.hintActive) return;

    const symbolGrid = document.getElementById('symbol-grid');
    const hintsLeftEl = document.getElementById('hints-left');
    const hintBtn = document.getElementById('hint-btn');

    // Find unfound target
    const unfoundIndex = this.state.symbolMatch.grid.findIndex(
      (cell, idx) =>
        cell.isTarget &&
        !cell.found &&
        !symbolGrid.children[idx].querySelector('.flip-card-inner').classList.contains('flipped')
    );

    if (unfoundIndex === -1) return;

    this.state.symbolMatch.hintsRemaining--;
    this.state.symbolMatch.hintActive = true;
    hintsLeftEl.textContent = this.state.symbolMatch.hintsRemaining;
    hintBtn.style.opacity = this.state.symbolMatch.hintsRemaining > 0 ? '1' : '0.5';

    // Reveal
    const cardInner = symbolGrid.children[unfoundIndex].querySelector('.flip-card-inner');
    cardInner.classList.add('flipped');
    symbolGrid.children[unfoundIndex].classList.add('ww-hint-glow');

    setTimeout(() => {
      if (!this.state.symbolMatch.grid[unfoundIndex].found) {
        cardInner.classList.remove('flipped');
      }
      symbolGrid.children[unfoundIndex].classList.remove('ww-hint-glow');
      this.state.symbolMatch.hintActive = false;
    }, 1500);
  },

  /**
   * Setup memory game (right side)
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

    buttonConfigs.forEach((config, idx) => {
      const btn = document.createElement('button');
      btn.dataset.index = idx;
      btn.dataset.name = config.name;
      btn.dataset.color = config.color;
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
      btn.onclick = () => this.playerPressButton(idx);
      memButtons.appendChild(btn);
      this.state.memoryGame.buttons.push({ el: btn, config });
    });

    this.startMemoryRound();
  },

  /**
   * Start memory round
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

    if (this.memoryTimerInterval) clearInterval(this.memoryTimerInterval);

    this.state.memoryGame.sequence = WhaleWatchEntities.nextMemorySequence(
      this.state.memoryGame.sequence
    );
    memRoundEl.textContent = this.state.memoryGame.round;

    this.state.memoryGame.inputTimeLimit = Math.max(
      4,
      10 - Math.floor(this.state.memoryGame.round / 3)
    );

    setTimeout(() => this.showMemorySequence(), 500);
  },

  /**
   * Show memory sequence
   */
  showMemorySequence() {
    this.state.memoryGame.showingSequence = true;
    this.state.memoryGame.currentShowIndex = 0;

    const showNext = () => {
      if (this.state.memoryGame.currentShowIndex >= this.state.memoryGame.sequence.length) {
        this.state.memoryGame.showingSequence = false;
        this.state.memoryGame.waitingForInput = true;
        document.getElementById('mem-status').textContent = 'Your turn!';
        document.getElementById('mem-status').style.color = '#22c55e';
        this.startMemoryInputTimer();
        return;
      }

      const btnIdx = this.state.memoryGame.sequence[this.state.memoryGame.currentShowIndex];
      WhaleWatchRenderer.flashButton(this.state.memoryGame.buttons[btnIdx].el, true);

      setTimeout(() => {
        WhaleWatchRenderer.flashButton(this.state.memoryGame.buttons[btnIdx].el, false);
        this.state.memoryGame.currentShowIndex++;
        setTimeout(showNext, 300);
      }, 500);
    };

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
    memTimerDisplayEl.textContent = Math.ceil(this.state.memoryGame.inputTimer) + 's';

    this.memoryTimerInterval = setInterval(() => {
      if (this.state.gameOver || !this.state.memoryGame.waitingForInput) {
        clearInterval(this.memoryTimerInterval);
        memTimerDisplayEl.style.display = 'none';
        return;
      }

      this.state.memoryGame.inputTimer -= 0.1;
      const timeLeft = Math.max(0, this.state.memoryGame.inputTimer);
      const percent = (timeLeft / this.state.memoryGame.inputTimeLimit) * 100;

      WhaleWatchRenderer.updateTimerBar(
        memTimerBarEl,
        percent,
        timeLeft,
        this.state.memoryGame.inputTimeLimit
      );
      memTimerDisplayEl.textContent = Math.ceil(timeLeft) + 's';

      if (timeLeft <= 0) {
        clearInterval(this.memoryTimerInterval);
        this.state.memoryGame.waitingForInput = false;
        document.getElementById('mem-status').textContent = "⏰ Time's up! Game Over";
        document.getElementById('mem-status').style.color = '#ef4444';
        this.state.gameOver = true;
        setTimeout(() => {
          if (typeof endGame === 'function') endGame(this.gameId, this.state.score);
        }, 1500);
      }
    }, 100);
  },

  /**
   * Handle player button press
   */
  playerPressButton(idx) {
    if (!this.state.memoryGame.waitingForInput || this.state.gameOver) return;

    const memStatusEl = document.getElementById('mem-status');
    const memTimerDisplayEl = document.getElementById('mem-timer-display');

    WhaleWatchRenderer.flashButton(this.state.memoryGame.buttons[idx].el, true);
    setTimeout(
      () => WhaleWatchRenderer.flashButton(this.state.memoryGame.buttons[idx].el, false),
      200
    );

    this.state.memoryGame.playerSequence.push(idx);
    const currentPos = this.state.memoryGame.playerSequence.length - 1;

    if (this.state.memoryGame.sequence[currentPos] !== idx) {
      memStatusEl.textContent = '❌ Wrong! Game Over';
      memStatusEl.style.color = '#ef4444';
      this.state.gameOver = true;
      setTimeout(() => {
        if (typeof endGame === 'function') endGame(this.gameId, this.state.score);
      }, 1500);
      return;
    }

    const bonus = 5 * this.state.memoryGame.round;
    this.state.score += bonus;
    document.getElementById('ww-score').textContent = this.state.score;
    if (typeof recordScoreUpdate === 'function') {
      recordScoreUpdate(this.gameId, this.state.score, bonus);
    }

    if (this.state.memoryGame.playerSequence.length === this.state.memoryGame.sequence.length) {
      if (this.memoryTimerInterval) clearInterval(this.memoryTimerInterval);
      memTimerDisplayEl.style.display = 'none';

      this.state.memoryGame.completed = true;
      this.state.memoryGame.waitingForInput = false;
      this.state.memoryGame.round++;

      const scores = WhaleWatchEntities.calculateMemoryScore(
        this.state.memoryGame.round,
        this.state.memoryGame.inputTimer
      );
      this.state.score += scores.roundBonus;
      document.getElementById('ww-score').textContent = this.state.score;

      memStatusEl.textContent = '✅ Perfect! Next round...';
      memStatusEl.style.color = '#22c55e';

      setTimeout(() => this.startMemoryRound(), 1500);
    }

    if (typeof updateScore === 'function') updateScore(this.gameId, this.state.score);
  },

  /**
   * Start symbol hunt timer
   */
  startSymbolTimer() {
    const smTimerEl = document.getElementById('sm-timer');

    this.timerInterval = setInterval(() => {
      if (this.state.gameOver || this.state.symbolMatch.completed) return;

      this.state.symbolMatch.timer--;
      smTimerEl.textContent = this.state.symbolMatch.timer;

      if (this.state.symbolMatch.timer <= 10) {
        smTimerEl.style.color = '#ef4444';
      }

      if (this.state.symbolMatch.timer <= 0) {
        this.state.symbolMatch.timer = Math.max(20, 45 - this.state.level * 3);
        smTimerEl.style.color = '';
        this.setupSymbolHunt();
      }
    }, 1000);
  },
};

// Spread GameEngineBase methods
if (typeof GameEngineBase !== 'undefined') {
  Object.assign(WhaleWatch, GameEngineBase);
}

// Register with framework
if (typeof GameRegistry !== 'undefined') {
  GameRegistry.register('whalewatch', WhaleWatch);
}

// Export
if (typeof window !== 'undefined') {
  window.WhaleWatch = WhaleWatch;
}
