/**
 * WhaleWatch Renderer — DOM-based UI for split-screen dual game
 * @module games/engines/whalewatch/renderer
 */

'use strict';

const WhaleWatchRenderer = {
  /**
   * Create arena HTML structure
   */
  createArena(gameId) {
    return `
      <div class="ww-container">
        <!-- LEFT: Symbol Match with Legend -->
        <div class="ww-panel">
          <div class="ww-panel-header">
            <div class="ww-panel-title--gold">&#127919; SYMBOL MATCH</div>
            <div class="ww-stats-row">
              <span class="ww-stat-timer">&#9202; <span id="sm-timer">45</span>s</span>
              <span class="ww-stat-found"><span id="sm-found">0</span>/<span id="sm-total">0</span></span>
              <span class="ww-stat-mistakes">&#10060; <span id="sm-mistakes">0</span>/3</span>
              <button id="hint-btn" class="ww-hint-btn">&#128161; <span id="hints-left">2</span></button>
            </div>
          </div>
          <!-- Combo indicator -->
          <div id="combo-display" class="ww-combo-display">
            x<span id="combo-count">0</span> COMBO!
          </div>
          <!-- Legend -->
          <div id="symbol-legend" class="ww-legend"></div>
          <!-- Target description -->
          <div class="ww-target-box">
            <span class="ww-target-label">Find all: </span>
            <span id="sm-target-name" class="ww-target-name">Fire</span>
          </div>
          <div id="symbol-grid" class="ww-symbol-grid"></div>
        </div>
        <!-- RIGHT: Memory Game with Timer -->
        <div class="ww-panel ww-panel--relative">
          <div class="ww-panel-header">
            <div class="ww-panel-title--purple">&#129504; MEMORY SEQUENCE</div>
            <div class="ww-mem-stats">
              <span class="ww-mem-round">Round: <span id="mem-round">1</span></span>
            </div>
          </div>
          <!-- Input Timer Bar -->
          <div class="ww-timer-bar-track">
            <div id="mem-timer-bar" class="ww-timer-bar-fill"></div>
          </div>
          <div id="mem-status" class="ww-mem-status">Watch the sequence!</div>
          <div id="mem-timer-display" class="ww-mem-timer-display">10s</div>
          <div id="memory-buttons" class="ww-memory-buttons"></div>
        </div>
      </div>
      <div class="game-score-bar">
        <div class="game-score-badge game-score-badge--gold">
          <span class="ww-score-text">SCORE: <span id="ww-score">0</span></span>
        </div>
        <div class="game-score-badge game-score-badge--purple">
          <span class="ww-level-text">LEVEL: <span id="ww-level">1</span></span>
        </div>
      </div>
    `;
  },

  /**
   * Build symbol legend display
   */
  buildLegend(legend) {
    let html = '';
    legend.forEach(item => {
      html += `<div class="ww-legend-item"><span class="ww-legend-icon">${item.symbol}</span><span class="ww-legend-name">${item.name}</span></div>`;
    });
    return html;
  },

  /**
   * Create 3D flip card element
   */
  createFlipCard(symbol, index, onClickFn) {
    const card = document.createElement('div');
    card.className = 'flip-card';
    card.dataset.index = index;

    const cardInner = document.createElement('div');
    cardInner.className = 'flip-card-inner';

    const cardBack = document.createElement('div');
    cardBack.className = 'flip-card-back';
    cardBack.textContent = '❓';

    const cardFront = document.createElement('div');
    cardFront.className = 'flip-card-front';
    cardFront.innerHTML = symbol;

    cardInner.appendChild(cardBack);
    cardInner.appendChild(cardFront);
    card.appendChild(cardInner);
    card.onclick = onClickFn;

    return card;
  },

  /**
   * Flip card element (visual effect)
   */
  flipCard(cardElement) {
    const cardInner = cardElement.querySelector('.flip-card-inner');
    cardInner.classList.add('flipped');
  },

  /**
   * Unflip card element
   */
  unflipCard(cardElement) {
    const cardInner = cardElement.querySelector('.flip-card-inner');
    cardInner.classList.remove('flipped');
  },

  /**
   * Mark card as found (green styling)
   */
  markCardFound(cardElement) {
    const cardFront = cardElement.querySelector('.flip-card-front');
    cardFront.classList.remove('wrong');
    cardFront.classList.add('found');
  },

  /**
   * Mark card as wrong (red styling)
   */
  markCardWrong(cardElement) {
    const cardFront = cardElement.querySelector('.flip-card-front');
    cardFront.classList.remove('found');
    cardFront.classList.add('wrong');
  },

  /**
   * Reset card styling
   */
  resetCardStyle(cardElement) {
    const cardFront = cardElement.querySelector('.flip-card-front');
    cardFront.classList.remove('found', 'wrong');
  },

  /**
   * Flash memory button
   */
  flashButton(btnElement, on) {
    if (on) {
      btnElement.classList.add('ww-mem-btn--active');
    } else {
      btnElement.classList.remove('ww-mem-btn--active');
    }
  },

  /**
   * Update timer bar width (memory game)
   */
  updateTimerBar(barElement, percent) {
    const bucket = Math.max(0, Math.min(10, Math.ceil(percent / 10)));
    barElement.className = `ww-timer-bar-fill ww-timer-bar-fill--p${bucket}`;
  },

  /**
   * Render particles (DOM-based, simple approach)
   */
  renderParticles(containerSelector, particles) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // Clear existing particles
    const existing = container.querySelectorAll('.ww-particle');
    existing.forEach(el => el.remove());

    // Render new particles (dynamic values via CSSOM custom properties)
    particles.forEach(p => {
      const particle = document.createElement('div');
      particle.className = 'ww-particle';
      const s = particle.style;
      s.left = p.x + 'px';
      s.top = p.y + 'px';
      s.width = p.size + 'px';
      s.height = p.size + 'px';
      s.background = p.color;
      s.opacity = p.life / p.maxLife;
      container.appendChild(particle);
    });
  },
};

if (typeof window !== 'undefined') {
  window.WhaleWatchRenderer = WhaleWatchRenderer;
}
