import ASDF_ENDPOINTS from './config/endpoints.js';

const ARCHETYPES = {
  philosophe: {
    name: 'Le Philosophe',
    tagline: 'Tu joues où les autres ne regardent pas encore.',
    stats: [
      { label: 'Réflexion', value: 85, displayValue: 'Profonde' },
      { label: 'Patience', value: 92, displayValue: 'Infatigable' },
      { label: 'Prise de risque', value: 15, displayValue: 'Nulle' },
    ],
  },
};

class PersonalityEngine {
  constructor() {
    this.board = document.querySelector('.board-grid');
    this.gameView = document.getElementById('game-view');
    this.resultView = document.getElementById('result-view');
    this.init();
  }

  init() {
    this.renderBoard();
    const b = document.getElementById('chess-board');
    if (b) b.addEventListener('click', () => this.fetchIdentity());
  }

  renderBoard() {
    if (!this.board) return;
    this.board.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('div');
      const isLight = (Math.floor(i / 4) + i) % 2 === 0;
      cell.className = 'cell ' + (isLight ? 'light' : 'dark');
      if (i === 5) cell.innerHTML = '<span class="piece">♞</span>';
      if (i === 10) cell.innerHTML = '<span class="piece">♟</span>';
      this.board.appendChild(cell);
    }
  }

  async fetchIdentity() {
    const bh = document.querySelector('.board-hint');
    if (bh) {
      bh.textContent = 'Analyse...';
      bh.style.opacity = '1';
    }

    try {
      const r = await fetch('https://blitz-and-chill-web.vercel.app/api/personality');
      if (!r.ok) throw new Error();
      const d = await r.json();
      this.renderResult(d);
    } catch (e) {
      setTimeout(() => {
        this.renderResult({
          archetype: ARCHETYPES.philosophe,
          confidence: 0.9,
          stats: ARCHETYPES.philosophe.stats,
        });
      }, 1500);
    }
  }

  setupShare(d) {
    const b = document.getElementById('share-x');
    if (b) {
      b.onclick = () => {
        const t =
          'Je suis "' + d.archetype.name + '" sur Blitz & Chill. ' + d.archetype.tagline + ' ♟️✨';
        window.open(
          'https://twitter.com/intent/tweet?text=' +
            encodeURIComponent(t) +
            '&url=' +
            encodeURIComponent(window.location.href),
          '_blank'
        );
      };
    }
  }

  renderResult(d) {
    if (!this.gameView || !this.resultView) return;
    this.gameView.classList.remove('active');
    this.resultView.classList.add('active');

    const c = d.confidence > 0.8 ? 'Révélé sur 12 parties' : 'Révélé sur 3 parties';

    const sHtml = d.stats
      .map(
        x => `
      <div class="stat-item">
        <div class="stat-info">
          <span>${x.label}</span>
          <span>${x.displayValue || x.value}</span>
        </div>
        <div class="stat-bar-container">
          <div class="stat-bar-fill" style="width: ${x.value}%"></div>
        </div>
      </div>
    `
      )
      .join('');

    this.resultView.innerHTML = `
      <div class="personality-card">
        <div class="decorative-line"></div>
        <div class="card-content">
          <header>
            <h2 class="archetype-name">${d.archetype.name}</h2>
            <p class="archetype-tagline">"${d.archetype.tagline}"</p>
          </header>
          <div class="stats-section">${sHtml}</div>
          <footer class="card-footer">
            <span class="confidence-text">${c}</span>
            <div class="brand-signature">Blitz & Chill</div>
          </footer>
        </div>
      </div>
      <div style="display:flex; gap:20px; margin-top:40px;">
        <button onclick="location.reload()" style="background: transparent; border: 1px solid var(--forest-700); color: var(--amber-500); font-family: Fraunces, serif; padding: 10px 30px; cursor: pointer;">Retour au calme</button>
        <button id="share-x" style="background: #C89B5E; border: none; color: #0F1410; font-family: Fraunces, serif; font-weight: 600; padding: 10px 30px; cursor: pointer;">Partager mon âme</button>
      </div>
    `;
    this.setupShare(d);
  }
}

new PersonalityEngine();
