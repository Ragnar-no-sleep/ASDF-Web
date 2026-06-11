import ASDF_ENDPOINTS from './config/endpoints.js';
import ASDFSolana from './solana/index.js';
import { soundSystem } from './utils/sound-system.js';

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

const AMPERSAND_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:inline-block; vertical-align:middle; margin:0 4px; opacity:0.8;"><path d="M17 19c-1.333-1-2-2.333-2-4 0-3 2-4 3-6s-2-4-4-4-5 3-5 6c0 2 1 4 3 5l-4 4c-1.333 1-2 2-2 3s1 2 3 2 4-2 5-4z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

class PersonalityEngine {
  constructor() {
    this.board = document.querySelector('.board-grid');
    this.gameView = document.getElementById('game-view');
    this.resultView = document.getElementById('result-view');

    this.userId = localStorage.getItem('asdf_user_id');
    if (!this.userId) {
      this.userId = 'u' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('asdf_user_id', this.userId);
    }

    this.init();
    this.initWallet();
    this.initAudio();
  }

  initAudio() {
    // *sniff* Sensory feedback (Axiome 5)
    const audioBtn = document.getElementById('audio-toggle');
    if (audioBtn) {
      const updateIcon = () => {
        audioBtn.textContent = soundSystem.enabled ? 'Sons: ON' : 'Sons: OFF';
        audioBtn.style.opacity = soundSystem.enabled ? '1' : '0.5';
      };
      updateIcon();
      audioBtn.addEventListener('click', () => {
        soundSystem.toggle(!soundSystem.enabled);
        updateIcon();
      });
    }
  }

  async initWallet() {
    try {
      await ASDFSolana.init({ cluster: 'mainnet-beta' });
      const connectBtn = document.getElementById('wallet-connect');
      if (connectBtn) {
        if (ASDFSolana.isConnected()) this.updateWalletUI(ASDFSolana.getAddress());
        connectBtn.addEventListener('click', async () => {
          soundSystem.play('click');
          if (ASDFSolana.isConnected()) {
            await ASDFSolana.disconnect();
            this.updateWalletUI(null);
          } else {
            const wallets = ASDFSolana.getWallets();
            if (wallets.length > 0) {
              const { address } = await ASDFSolana.connect(wallets[0].name);
              this.updateWalletUI(address);
              soundSystem.play('success');
            }
          }
        });
      }
    } catch (e) {
      console.warn('GROWL: Wallet offline', e);
    }
  }

  updateWalletUI(address) {
    const btn = document.getElementById('wallet-connect');
    if (!btn) return;
    if (address) {
      btn.textContent = address.substring(0, 4) + '...' + address.substring(address.length - 4);
      btn.classList.add('connected');
    } else {
      btn.textContent = 'Connecter';
      btn.classList.remove('connected');
    }
  }

  init() {
    this.renderBoard();
    const b = document.getElementById('chess-board');
    if (b) {
      b.addEventListener('click', () => {
        soundSystem.play('click');
        this.fetchIdentity();
      });
    }
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
      let isHolder = false;
      if (ASDFSolana.isConnected()) {
        const addr = ASDFSolana.getAddress();
        const bResp = await fetch(
          `https://blitz-and-chill-web.vercel.app/api/personality/badge?address=${addr}`
        );
        const bData = await bResp.json();
        isHolder = bData.isHolder;
      }
      this.renderResult({ ...d, isHolder });
    } catch (e) {
      setTimeout(() => {
        this.renderResult({
          archetype: ARCHETYPES.philosophe,
          confidence: 0.9,
          stats: ARCHETYPES.philosophe.stats,
          isHolder: false,
        });
      }, 1500);
    }
  }

  setupShare(d) {
    const b = document.getElementById('share-x');
    if (b) {
      b.onclick = () => {
        soundSystem.play('click');
        const shareUrl = window.location.origin + '/personality?u=' + this.userId;
        const text =
          'Je suis "' +
          d.archetype.name +
          '" sur Blitz & Chill. ' +
          d.archetype.tagline +
          ' ♟️✨\n\nDécouvre ton identité chess ici :';
        window.open(
          'https://twitter.com/intent/tweet?text=' +
            encodeURIComponent(text) +
            '&url=' +
            encodeURIComponent(shareUrl),
          '_blank'
        );
      };
    }
  }

  renderResult(d) {
    if (!this.gameView || !this.resultView) return;

    // *sniff* Pacing lent (Axiome 6) + Audio
    soundSystem.play('whoosh');

    this.gameView.classList.remove('active');
    this.resultView.classList.add('active');

    const c = d.confidence > 0.8 ? 'Révélé sur 12 parties' : 'Révélé sur 3 parties';

    // Staggered reveal for stats (Axiome 6)
    const renderStats = () => {
      return d.stats
        .map(
          (x, i) => `
        <div class="stat-item" style="animation: fadeIn 0.8s ease-out ${0.4 + i * 0.2}s both;">
          <div class="stat-info"><span>${x.label}</span><span>${x.displayValue || x.value}</span></div>
          <div class="stat-bar-container"><div class="stat-bar-fill" style="width: ${x.value}%; transition-delay: ${0.6 + i * 0.2}s;"></div></div>
        </div>
      `
        )
        .join('');
    };

    this.resultView.innerHTML = `
      <div class="personality-card">
        <div class="decorative-line"></div>
        <div class="card-content">
          <header style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h2 class="archetype-name">${d.archetype.name}</h2>
              <p class="archetype-tagline">"${d.archetype.tagline}"</p>
            </div>
            ${d.isHolder ? `<div class="asdf-badge" title="Membre $ASDF" style="border: 1px solid var(--amber-500); color: var(--amber-500); padding: 4px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">ASDF Member</div>` : ''}
          </header>
          <div class="stats-section">${renderStats()}</div>
          <footer class="card-footer">
            <span class="confidence-text">${c}</span>
            <div class="brand-signature">Blitz ${AMPERSAND_SVG} Chill</div>
          </footer>
        </div>
      </div>
      <div style="display:flex; gap:20px; margin-top:40px;">
        <button id="back-btn" style="background: transparent; border: 1px solid var(--forest-700); color: var(--amber-500); font-family: Fraunces, serif; padding: 10px 30px; cursor: pointer;">Retour au calme</button>
        <button id="share-x" style="background: #C89B5E; border: none; color: #0F1410; font-family: Fraunces, serif; font-weight: 600; padding: 10px 30px; cursor: pointer;">Partager mon âme</button>
      </div>
    `;

    document.getElementById('back-btn').onclick = () => {
      soundSystem.play('click');
      location.reload();
    };

    this.setupShare(d);
  }
}
new PersonalityEngine();
