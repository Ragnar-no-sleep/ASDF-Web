'use strict';

// ============================================
// ASDF Learn - Interactive Learning Platform
// Extracted from learn.html for CSP compliance
// ============================================

// ============================================
// SECURITY UTILITIES
// ============================================

// Escape HTML to prevent XSS attacks
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Sanitize URL to prevent javascript: protocol attacks
function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

/**
 * Sanitize HTML content using DOMPurify
 * Prevents XSS attacks while allowing safe HTML
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - DOMPurify options
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
  if (typeof html !== 'string') return '';

  // Use DOMPurify if available
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'b',
        'em',
        'i',
        'u',
        'span',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'dl',
        'dt',
        'dd',
        'a',
        'img',
        'figure',
        'figcaption',
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'th',
        'td',
        'pre',
        'code',
        'blockquote',
        'hr',
        'input',
        'button',
        'label',
        'select',
        'option',
        'svg',
        'path',
        'circle',
        'rect',
        'line',
        'g',
      ],
      ALLOWED_ATTR: [
        'href',
        'src',
        'alt',
        'title',
        'class',
        'id',
        'style',
        'data-*',
        'type',
        'value',
        'placeholder',
        'disabled',
        'checked',
        'name',
        'for',
        'colspan',
        'rowspan',
        'target',
        'rel',
        'width',
        'height',
        'viewBox',
        'd',
        'fill',
        'stroke',
        'stroke-width',
        'cx',
        'cy',
        'r',
        'x',
        'y',
        'x1',
        'y1',
        'x2',
        'y2',
      ],
      ALLOW_DATA_ATTR: true,
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });
  }

  // Fallback: basic HTML escaping if DOMPurify not loaded
  console.warn('[Security] DOMPurify not loaded, using basic escaping');
  return escapeHtml(html);
}

/**
 * Safely set innerHTML with sanitization
 * @param {Element} element - DOM element
 * @param {string} html - HTML content
 */
function safeInnerHTML(element, html) {
  if (!element) return;
  element.innerHTML = sanitizeHtml(html);
}

// ============================================
// STATE MANAGEMENT
// ============================================

const STORAGE_KEY = 'asdf_learn_v2';

const defaultState = {
  currentLevel: 1,
  completedLevels: [],
  completedQuizzes: [], // Track which quizzes have been answered correctly
  totalXP: 0,
  startTime: null,
  wrongAnswers: 0,
  badges: [],
  courseCompleted: false,
  homeUnlocked: false,
};

// Security: Validate localStorage data schema to prevent tampering
function validateState(data) {
  if (typeof data !== 'object' || data === null) return false;
  if (typeof data.currentLevel !== 'number' || data.currentLevel < 1 || data.currentLevel > 5) {
    return false;
  }
  if (!Array.isArray(data.completedLevels)) return false;
  if (typeof data.totalXP !== 'number' || data.totalXP < 0 || data.totalXP > 100000) return false;
  if (typeof data.wrongAnswers !== 'number' || data.wrongAnswers < 0) return false;
  if (!Array.isArray(data.badges)) return false;
  if (typeof data.courseCompleted !== 'boolean') return false;
  // homeUnlocked is optional for backwards compatibility
  if (data.homeUnlocked !== undefined && typeof data.homeUnlocked !== 'boolean') return false;
  // completedQuizzes is optional for backwards compatibility
  if (data.completedQuizzes !== undefined && !Array.isArray(data.completedQuizzes)) return false;
  // Validate array contents
  if (!data.completedLevels.every(l => typeof l === 'number' && l >= 1 && l <= 5)) return false;
  if (!data.badges.every(b => typeof b === 'string' && b.length < 50)) return false;
  if (
    data.completedQuizzes &&
    !data.completedQuizzes.every(q => typeof q === 'number' && q >= 1 && q <= 5)
  ) {
    return false;
  }
  return true;
}

function getState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = { ...defaultState, ...parsed };
      // Validate schema before returning
      if (validateState(merged)) {
        return merged;
      }
      console.warn('Invalid state schema, resetting to default');
      localStorage.removeItem(STORAGE_KEY);
    }
    return { ...defaultState };
  } catch (e) {
    console.warn('Error reading state, resetting to default');
    localStorage.removeItem(STORAGE_KEY);
    return { ...defaultState };
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save state');
  }
}

// ============================================
// XP SYSTEM
// ============================================

const XP_VALUES = {
  level1: 100,
  level2: 150,
  level3: 200,
  level4: 250,
  level5: 300,
  quiz: 25,
  speedBonus: 100,
  perfectBonus: 150,
};

function addXP(amount) {
  const state = getState();
  state.totalXP += amount;
  saveState(state);
  updateXPDisplay();
}

function updateXPDisplay() {
  const state = getState();
  document.getElementById('total-xp').textContent = state.totalXP + ' XP';
}

// ============================================
// BADGES SYSTEM
// ============================================

const BADGE_DEFINITIONS = {
  spark: { id: 'spark', icon: '🔥', name: 'The Spark', condition: 'Complete Level 1' },
  flames: { id: 'flames', icon: '🌋', name: 'The Flames', condition: 'Complete Level 2' },
  engine: { id: 'engine', icon: '⚙️', name: 'The Engine', condition: 'Complete Level 3' },
  forge: { id: 'forge', icon: '🛠️', name: 'The Forge', condition: 'Complete Level 4' },
  core: { id: 'core', icon: '💎', name: 'The Core', condition: 'Complete Level 5' },
  speed: { id: 'speed', icon: '⚡', name: 'Speed Runner', condition: 'Finish in <10 min' },
  perfect: { id: 'perfect', icon: '🎯', name: 'Perfect Score', condition: 'No wrong answers' },
  master: { id: 'master', icon: '👑', name: 'ASDF Master', condition: 'Earn all badges' },
};

function earnBadge(badgeId) {
  const state = getState();
  if (state.badges.includes(badgeId)) return;

  state.badges.push(badgeId);
  saveState(state);

  // Update UI
  const badgeEl = document.getElementById('badge-' + badgeId);
  if (badgeEl) {
    badgeEl.classList.remove('locked');
    badgeEl.classList.add('earned');
  }

  // Show popup
  showAchievement(BADGE_DEFINITIONS[badgeId]);

  // Check for master badge
  if (state.badges.length === 7 && !state.badges.includes('master')) {
    setTimeout(() => earnBadge('master'), 2000);
  }
}

function showAchievement(badge) {
  const popup = document.getElementById('achievement-popup');
  document.getElementById('achievement-icon').textContent = badge.icon;
  document.getElementById('achievement-title').textContent = badge.name;
  document.getElementById('achievement-subtitle').textContent = badge.condition;
  document.getElementById('achievement-xp').textContent = '+50 XP';

  popup.classList.add('show');
  addXP(50);

  setTimeout(() => {
    popup.classList.remove('show');
  }, 6000);
}

function updateBadges() {
  const state = getState();
  state.badges.forEach(badgeId => {
    const badgeEl = document.getElementById('badge-' + badgeId);
    if (badgeEl) {
      badgeEl.classList.remove('locked');
      badgeEl.classList.add('earned');
    }
  });
}

// ============================================
// NAVIGATION
// ============================================

function updateNavigation() {
  const state = getState();
  const navLevels = document.querySelectorAll('.nav-level');
  const connectors = document.querySelectorAll('.nav-connector');

  navLevels.forEach((el, index) => {
    const level = index + 1;
    el.classList.remove('completed', 'current', 'locked');

    if (state.completedLevels.includes(level)) {
      el.classList.add('completed');
    } else if (level === state.currentLevel) {
      el.classList.add('current');
    } else if (level > state.currentLevel) {
      el.classList.add('locked');
    }
  });

  connectors.forEach((el, index) => {
    el.classList.toggle('active', state.completedLevels.includes(index + 1));
  });
}

function goToLevel(level, skipCheck) {
  const state = getState();

  // Skip the check if called from unlockLevel (which already validated)
  if (!skipCheck && level > state.currentLevel && !state.completedLevels.includes(level)) {
    return;
  }

  document.querySelectorAll('.level-section').forEach(el => el.classList.remove('active'));
  const targetSection = document.getElementById('level-' + level);
  if (targetSection) targetSection.classList.add('active');

  state.currentLevel = level;
  saveState(state);
  updateNavigation();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function unlockLevel(level) {
  const state = getState();
  const prevLevel = level - 1;

  if (!state.completedLevels.includes(prevLevel)) {
    state.completedLevels.push(prevLevel);
    addXP(XP_VALUES['level' + prevLevel]);

    // Earn badge
    const badgeMap = { 1: 'spark', 2: 'flames', 3: 'engine', 4: 'forge', 5: 'core' };
    if (badgeMap[prevLevel]) {
      earnBadge(badgeMap[prevLevel]);
    }
  }

  state.currentLevel = level;
  saveState(state);
  updateNavigation();
  goToLevel(level, true); // skipCheck=true since we already updated state
}

function completeCourse() {
  const state = getState();

  if (!state.completedLevels.includes(5)) {
    state.completedLevels.push(5);
    addXP(XP_VALUES.level5);
    earnBadge('core');
  }

  // Check speed bonus
  if (state.startTime) {
    const elapsed = (Date.now() - state.startTime) / 1000 / 60;
    if (elapsed < 10 && !state.badges.includes('speed')) {
      earnBadge('speed');
      addXP(XP_VALUES.speedBonus);
    }
  }

  // Check perfect score
  if (state.wrongAnswers === 0 && !state.badges.includes('perfect')) {
    earnBadge('perfect');
    addXP(XP_VALUES.perfectBonus);
  }

  state.courseCompleted = true;
  saveState(state);

  // Show completion banner
  document.getElementById('completion-banner').style.display = 'block';
  document.getElementById('level-5-actions').style.display = 'none';

  // Easter Egg: Show the completion badge
  showCompletionBadge();

  updateLeaderboard();
}

// ============================================
// EASTER EGG - Pill System
// ============================================

function showCompletionBadge() {
  const badge = document.getElementById('completion-badge');
  const state = getState();

  // Only show if home is not already unlocked
  if (badge && !state.homeUnlocked) {
    badge.classList.add('unlocked');
  }
}

function hideCompletionBadge() {
  const badge = document.getElementById('completion-badge');
  if (badge) {
    badge.classList.remove('unlocked');
  }
}

function showPillModal() {
  const modal = document.getElementById('pill-modal');
  modal.classList.add('active');
}

function hidePillModal() {
  const modal = document.getElementById('pill-modal');
  modal.classList.remove('active');
}

function unlockHome() {
  const state = getState();
  state.homeUnlocked = true;
  saveState(state);

  // Show the home link
  const homeLink = document.getElementById('nav-home-link');
  homeLink.classList.add('unlocked');

  // Hide the badge
  hideCompletionBadge();
  hidePillModal();

  // Show achievement after modal closes
  setTimeout(() => {
    showAchievement({
      icon: '🏠',
      name: 'The Secret',
      condition: 'You took the pill',
    });
  }, 300);
}

function resetLearnProgress() {
  const state = getState();

  // Reset learn-related state but keep other progress
  state.currentLevel = 1;
  state.completedLevels = [];
  state.courseCompleted = false;
  state.wrongAnswers = 0;
  state.startTime = Date.now();

  // Remove level badges
  ['spark', 'flames', 'engine', 'forge', 'core', 'speed', 'perfect'].forEach(badge => {
    const index = state.badges.indexOf(badge);
    if (index > -1) {
      state.badges.splice(index, 1);
      const badgeEl = document.getElementById('badge-' + badge);
      if (badgeEl) {
        badgeEl.classList.remove('earned');
        badgeEl.classList.add('locked');
      }
    }
  });

  // Remove master badge if present
  const masterIndex = state.badges.indexOf('master');
  if (masterIndex > -1) {
    state.badges.splice(masterIndex, 1);
    const masterEl = document.getElementById('badge-master');
    if (masterEl) {
      masterEl.classList.remove('earned');
      masterEl.classList.add('locked');
    }
  }

  saveState(state);

  // Hide badge and modal
  hideCompletionBadge();
  hidePillModal();

  // Reset UI
  document.getElementById('completion-banner').style.display = 'none';
  document.getElementById('level-5-actions').style.display = 'flex';

  // Re-enable first unlock button, disable others
  for (let i = 2; i <= 5; i++) {
    const btn = document.getElementById('unlock-level-' + i);
    if (btn) btn.disabled = true;
  }
  const completeBtn = document.getElementById('complete-course');
  if (completeBtn) completeBtn.disabled = true;

  // Reset quiz feedbacks
  for (let i = 1; i <= 5; i++) {
    const feedback = document.getElementById('quiz-feedback-' + i);
    if (feedback) {
      feedback.style.display = 'none';
      feedback.textContent = '';
    }
    // Reset quiz options
    document.querySelectorAll('#level-' + i + ' .quiz-option').forEach(opt => {
      opt.classList.remove('correct', 'wrong');
      opt.style.pointerEvents = 'auto';
    });
  }

  // Update navigation and XP
  updateNavigation();
  updateXPDisplay();

  // Go back to level 1
  goToLevel(1);

  // Show notification after modal closes
  setTimeout(() => {
    showAchievement({
      icon: '🔄',
      name: 'Start Again',
      condition: 'You chose to stay in the Matrix',
    });
  }, 300);
}

function checkHomeUnlocked() {
  const state = getState();
  const homeLink = document.getElementById('nav-home-link');

  // Always ensure home link is hidden by default
  if (homeLink) {
    homeLink.classList.remove('unlocked');
  }

  // Only show if explicitly unlocked
  if (state.homeUnlocked === true) {
    if (homeLink) homeLink.classList.add('unlocked');
  }

  // Show badge if course completed but home not unlocked
  if (state.courseCompleted && !state.homeUnlocked) {
    showCompletionBadge();
  }
}

function resetProgress() {
  if (confirm('Reset all progress?')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

// ============================================
// VIEW SWITCHING
// ============================================

function switchView(view) {
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  const viewEl = document.getElementById('view-' + view);
  if (viewEl) {
    viewEl.classList.add('active');
  }

  // Update nav-tab active state (handles both click events and programmatic calls)
  document.querySelectorAll('.nav-tab').forEach(tab => {
    const tabText = tab.textContent.toLowerCase().trim();
    const tabViewName = tabText === 'faq/glossary' ? 'faq-glossary' : tabText;
    if (tabViewName === view) {
      tab.classList.add('active');
    }
  });

  // Hide sidebar for games view (full-width layout)
  const mainLayout = document.querySelector('.main-layout');
  if (mainLayout) {
    mainLayout.classList.toggle('games-active', view === 'games');
  }
}

// ============================================
// BUILD VIEW - Project Filters (Multi-dimensional)
// ============================================
const activeFilters = { status: 'all', skill: 'all', type: 'all' };

function filterProjects(filterType, value) {
  activeFilters[filterType] = value;

  // Update active filter buttons
  document.querySelectorAll(`.filter-btn[data-filter="${filterType}"]`).forEach(btn => {
    const isActive = btn.dataset.value === value;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  // Filter project cards based on all active filters
  document.querySelectorAll('.project-card').forEach(card => {
    const statusMatch =
      activeFilters.status === 'all' || card.dataset.status === activeFilters.status;
    const skillMatch =
      activeFilters.skill === 'all' ||
      (card.dataset.skills && card.dataset.skills.includes(activeFilters.skill));
    const typeMatch = activeFilters.type === 'all' || card.dataset.type === activeFilters.type;

    const isVisible = statusMatch && skillMatch && typeMatch;
    card.classList.toggle('hidden', !isVisible);
    card.setAttribute('aria-hidden', !isVisible ? 'true' : 'false');
  });
}

// ============================================
// TECHNICAL DOCUMENTATION
// ============================================
const projectDocs = {
  'burn-engine': {
    title: '🔥 ASDF Burn Engine',
    sections: [
      {
        title: '📖 Overview',
        content:
          'Autonomous protocol that converts ecosystem activity into permanent token burns. The core deflationary mechanism of ASDF.',
      },
      {
        title: '🏗️ Architecture',
        content: `<ul>
                            <li><strong>Trading Volume:</strong> Pump.fun trades generate creator fees → automatic buyback → token burn</li>
                            <li><strong>Ecosystem Apps:</strong> Apps deposit SOL or $ASDF tokens → automatic or manual burn cycles</li>
                            <li><strong>Token Hierarchy:</strong> Secondary tokens contribute 44.8% of fees to root treasury</li>
                        </ul>`,
      },
      {
        title: '🛠️ Tech Stack',
        content: 'TypeScript (74.1%), Rust (14.5%), JavaScript, Solana (Anchor framework)',
      },
      {
        title: '📁 Project Structure',
        content: `<div class="doc-code"><pre>/programs/asdf-burn-engine/ - Solana smart contract
/dashboard/ - Web interface
/docs/ - Developer guides (API Reference, Architecture)
/scripts/ - Automation tools
/tests/ - Test suite</pre></div>`,
      },
      {
        title: '⚙️ Installation',
        content: `<div class="doc-code"><pre>git clone https://github.com/zeyxx/asdf-burn-engine
cd asdf-burn-engine
cp .env.template .env
# Configure environment variables
npm install
anchor build</pre></div>`,
      },
      {
        title: '🔗 Key Info',
        content:
          'Program ID: <code>ASDFc5hkEM2MF8mrAAtCPieV6x6h1B5BwjgztFt7Xbui</code><br>Philosophy: "Creation, not extraction. Flush. Burn. Verify."',
      },
    ],
    contributors: [{ name: 'zeyxx', url: 'https://github.com/zeyxx' }],
    github: 'https://github.com/zeyxx/asdf-burn-engine',
  },
  validator: {
    title: '✅ ASDF Validator',
    sections: [
      {
        title: '📖 Overview',
        content:
          'Real-time fee tracking system for Pump.fun token creators on Solana blockchain with WebSocket-based live updates (~400ms latency).',
      },
      {
        title: '✨ Features',
        content: `<ul>
                            <li>Real-time tracking via WebSocket</li>
                            <li>Per-token fee attribution and auto-discovery</li>
                            <li>Proof-of-History SHA-256 chain verification</li>
                            <li>Web dashboard with analytics</li>
                            <li>Dual vault monitoring (Bonding Curve + AMM)</li>
                        </ul>`,
      },
      {
        title: '🛠️ Tech Stack',
        content: 'TypeScript (85.8%), JavaScript, Node.js, Express.js, Jest, React dashboard',
      },
      {
        title: '📁 Project Structure',
        content: `<div class="doc-code"><pre>asdf-validator/
├── cli.ts / daemon.ts / index.ts (entry points)
├── lib/
│   ├── fee-tracker.ts
│   ├── realtime-tracker.ts
│   ├── history-manager.ts
│   ├── token-manager.ts
│   └── websocket-manager.ts
├── dashboard/ (Express server + frontend)
└── tests/</pre></div>`,
      },
      {
        title: '⚙️ Installation & Usage',
        content: `<div class="doc-code"><pre># Install
npm install && npm run build

# CLI Mode
npx ts-node cli.ts --creator YOUR_CREATOR_ADDRESS

# Dashboard
npx ts-node dashboard/server.ts CREATOR_ADDRESS [RPC_URL] [PORT]
# Access: http://localhost:3000</pre></div>`,
      },
    ],
    contributors: [{ name: 'zeyxx', url: 'https://github.com/zeyxx' }],
    github: 'https://github.com/zeyxx/asdf-validator',
  },
  'vanity-grinder': {
    title: '🎯 Vanity Grinder',
    sections: [
      {
        title: '📖 Overview',
        content:
          'High-performance Rust implementation for generating vanity Solana addresses with custom prefixes.',
      },
      {
        title: '🛠️ Tech Stack',
        content: 'Rust (95.1%), Shell (4.9%)',
      },
      {
        title: '⚙️ Usage',
        content: `<div class="doc-code"><pre># Clone and build
git clone https://github.com/zeyxx/asdf-vanity-grinder
cd asdf-vanity-grinder
cargo build --release

# Run
./start_grinder.sh</pre></div>`,
      },
    ],
    contributors: [{ name: 'zeyxx', url: 'https://github.com/zeyxx' }],
    github: 'https://github.com/zeyxx/asdf-vanity-grinder',
  },
  holdex: {
    title: '📊 HolDex',
    sections: [
      {
        title: '📖 Overview',
        content:
          'An open-source DexScreener alternative, powered by ASDFASDFA. Track tokens, view charts, and monitor the ecosystem.',
      },
      {
        title: '🛠️ Tech Stack',
        content: 'HTML (66.1%), JavaScript (33.5%), Docker support',
      },
      {
        title: '📁 Project Structure',
        content: `<div class="doc-code"><pre>HolDex/
├── src/ (application code)
├── homepage.html
├── submissions.html
├── package.json
├── Dockerfile
└── docker-compose.yml</pre></div>`,
      },
      {
        title: '⚙️ Installation',
        content: `<div class="doc-code"><pre># Using Docker
docker-compose up -d

# Or manual
npm install
npm start</pre></div>`,
      },
    ],
    contributors: [{ name: 'sollama58', url: 'https://github.com/sollama58' }],
    github: 'https://github.com/sollama58/HolDex',
  },
  asdforecast: {
    title: '🔮 ASDForecast',
    sections: [
      {
        title: '📖 Overview',
        content:
          'Prediction market for Solana, built for ASDFASDFA. Fees go towards ASDF buybacks and burns.',
      },
      {
        title: '🛠️ Tech Stack',
        content: 'HTML (70%), JavaScript (30%), Node.js',
      },
      {
        title: '📁 Project Structure',
        content: `<div class="doc-code"><pre>ASDForecast/
├── frontend.html (main app)
├── control_panel.html
├── burnMonitorFrontend.html
├── status_monitor_widget.html
├── server.js
└── package.json</pre></div>`,
      },
      {
        title: '⚙️ Installation',
        content: `<div class="doc-code"><pre>npm install
node server.js
# Open frontend.html in browser</pre></div>`,
      },
    ],
    contributors: [
      { name: 'sollama58', url: 'https://github.com/sollama58' },
      { name: 'zeyxx', url: 'https://github.com/zeyxx' },
    ],
    github: 'https://github.com/sollama58/ASDForecast',
  },
  burntracker: {
    title: '📈 ASDFBurnTracker',
    sections: [
      {
        title: '📖 Overview',
        content:
          'Tracks ASDF BuyBacks and Burns in real-time. Visual proof of the deflationary mechanism at work.',
      },
      {
        title: '🛠️ Tech Stack',
        content: 'HTML (59.3%), JavaScript (40.7%), Node.js',
      },
      {
        title: '📁 Project Structure',
        content: `<div class="doc-code"><pre>ASDFBurnTracker/
├── originalHTMLwidget.html
├── server.js
└── package.json</pre></div>`,
      },
      {
        title: '⚙️ Installation',
        content: `<div class="doc-code"><pre>npm install
node server.js</pre></div>`,
      },
    ],
    contributors: [{ name: 'sollama58', url: 'https://github.com/sollama58' }],
    github: 'https://github.com/sollama58/ASDFBurnTracker',
  },
  asdev: {
    title: '🚀 ASDev',
    sections: [
      {
        title: '📖 Overview',
        content:
          'Token launcher for Solana. Ships tokens that end with "ASDF". Built-in burn mechanics and holder tracking.',
      },
      {
        title: '✨ Features',
        content: `<ul>
                            <li>Token deployment queuing</li>
                            <li>Vanity address generation (ASDF suffix)</li>
                            <li>Metadata upload to IPFS via Pinata</li>
                            <li>Built-in burn mechanics</li>
                            <li>Holder tracking (top 50 per token)</li>
                            <li>Leaderboard by volume</li>
                            <li>Real-time launch feed</li>
                        </ul>`,
      },
      {
        title: '🛠️ Tech Stack',
        content: 'Node.js 18+, Rust (vanity grinder), Redis, Solana Web3.js, Express.js',
      },
      {
        title: '🔒 Security',
        content: `<ul>
                            <li>Rate limiting (100 req/15min on API, 3/min on deployment)</li>
                            <li>Helmet security headers</li>
                            <li>CORS configuration</li>
                            <li>Input validation for Solana addresses</li>
                            <li>Admin authentication for debug endpoints</li>
                        </ul>`,
      },
      {
        title: '⚙️ Installation',
        content: `<div class="doc-code"><pre># Clone
git clone https://github.com/sollama58/ASDev
cd ASDev

# Install dependencies
npm install

# Install Rust for vanity grinder
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Configure environment
cp .env.template .env
# Edit .env with your settings

# Start
npm start</pre></div>`,
      },
    ],
    contributors: [
      { name: 'sollama58', url: 'https://github.com/sollama58' },
      { name: 'zeyxx', url: 'https://github.com/zeyxx' },
    ],
    github: 'https://github.com/sollama58/ASDev',
  },
  grinder: {
    title: '⚙️ asdf_grinder',
    sections: [
      {
        title: '📖 Overview',
        content:
          'Grinder for ASDF pubkeys. Generate vanity Solana addresses with custom prefixes. Docker support included.',
      },
      {
        title: '🛠️ Tech Stack',
        content: 'Rust (89.5%), Docker (5.9%), Shell (4.6%)',
      },
      {
        title: '⚙️ Installation',
        content: `<div class="doc-code"><pre># Clone
git clone https://github.com/sollama58/asdf_grinder
cd asdf_grinder

# Build with Cargo
cargo build --release

# Or use Docker
docker build -t asdf-grinder .
docker run asdf-grinder

# Run
./start_grinder.sh</pre></div>`,
      },
    ],
    contributors: [{ name: 'sollama58', url: 'https://github.com/sollama58' }],
    github: 'https://github.com/sollama58/asdf_grinder',
  },
};

function openDocs(projectId) {
  const doc = projectDocs[projectId];
  if (!doc) return;

  const modal = document.getElementById('doc-modal');
  const title = document.getElementById('doc-modal-title');
  const body = document.getElementById('doc-modal-body');

  title.textContent = doc.title;

  let html = '';
  doc.sections.forEach(section => {
    html += `<div class="doc-section">
                    <h3>${escapeHtml(section.title)}</h3>
                    <p>${escapeHtml(section.content)}</p>
                </div>`;
  });

  html += '<div class="doc-section"><h3>👥 Contributors</h3><div class="doc-contributors">';
  doc.contributors.forEach(c => {
    const safeUrl = sanitizeUrl(c.url);
    const safeName = escapeHtml(c.name);
    html += `<div class="doc-contributor">
                    <img src="https://github.com/${safeName}.png" alt="${safeName}">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a>
                </div>`;
  });
  html += '</div></div>';

  html += `<div class="doc-links">
                <a href="${escapeHtml(doc.github)}" class="doc-link" target="_blank" rel="noopener noreferrer">View on GitHub</a>
                <button class="doc-link deep-learn" data-project="${escapeHtml(projectId)}">🎓 Deep Learn</button>
                <a href="${escapeHtml(doc.github)}/issues/new" class="doc-link secondary" target="_blank" rel="noopener noreferrer">Report Issue</a>
            </div>`;

  safeInnerHTML(body, html);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDocs() {
  document.getElementById('doc-modal').classList.remove('active');
  document.body.style.overflow = '';
}

// ============================================
// DEEP LEARN - Complete Technical Documentation
// ============================================
const deepLearnDocs = {
  'burn-engine': {
    title: '🔥 ASDF Burn Engine - Deep Learn',
    tabs: [
      'Introduction',
      'Architecture',
      'Smart Contract',
      'Integration',
      'API Reference',
      'Deployment',
    ],
    content: {
      Introduction: `
                        <h3>What is the ASDF Burn Engine?</h3>
                        <p>The ASDF Burn Engine is an <strong>autonomous protocol</strong> that converts ecosystem activity into permanent token burns. It's the core deflationary mechanism that powers the entire ASDF ecosystem.</p>

                        <h4>Philosophy</h4>
                        <p>"Creation, not extraction. Flush. Burn. Verify." - Unlike traditional fee mechanisms that extract value from users, the Burn Engine creates value by permanently reducing token supply.</p>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">The Deflationary Flywheel</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Trading Activity</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Fees Collected</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Auto Buyback</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Token Burn</div>
                            </div>
                        </div>

                        <h4>Key Benefits</h4>
                        <ul>
                            <li><strong>No staking required</strong> - Holders benefit automatically</li>
                            <li><strong>Zero inflation</strong> - Pure deflationary mechanics</li>
                            <li><strong>Transparent</strong> - All burns verifiable on-chain</li>
                            <li><strong>Autonomous</strong> - No manual intervention needed</li>
                        </ul>

                        <div class="deep-tip">
                            <strong>Pro Tip:</strong> Every transaction in the ASDF ecosystem contributes to burns. The more activity, the more tokens burned.
                        </div>
                    `,
      Architecture: `
                        <h3>System Architecture</h3>
                        <p>The Burn Engine operates through three distinct burn channels, each contributing to the deflationary mechanism.</p>

                        <h4>1. Trading Volume Channel</h4>
                        <p>When tokens are traded on Pump.fun, creator fees are automatically collected. These fees trigger an automatic buyback of ASDF tokens, which are then burned.</p>
                        <div class="deep-code">
<span class="comment">// Trading Flow</span>
User trades on Pump.fun
    → Creator fee (1%) collected
    → Fee sent to Burn Engine
    → Engine swaps SOL → ASDF
    → ASDF sent to burn address
    → Supply permanently reduced</div>

                        <h4>2. Ecosystem Apps Channel</h4>
                        <p>Third-party applications integrated with ASDF can deposit SOL or ASDF tokens directly into the burn cycle.</p>
                        <div class="deep-code">
<span class="comment">// For SOL deposits</span>
<span class="function">depositFeeSOL</span>(amount) {
    <span class="comment">// 100% converted to ASDF and burned</span>
}

<span class="comment">// For ASDF deposits</span>
<span class="function">depositFeeASDF</span>(amount) {
    <span class="comment">// 99.448% burned, 0.552% user rebate</span>
}</div>

                        <h4>3. Token Hierarchy Channel</h4>
                        <p>Secondary tokens in the ecosystem contribute a portion of their fees to the root treasury.</p>
                        <table class="deep-table">
                            <tr><th>Destination</th><th>Percentage</th></tr>
                            <tr><td>Root Treasury (Burns)</td><td>44.8%</td></tr>
                            <tr><td>Token's Own Burns</td><td>55.2%</td></tr>
                        </table>

                        <h4>Component Diagram</h4>
                        <div class="deep-code">
┌─────────────────────────────────────────────────────┐
│                   BURN ENGINE                        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Daemon    │  │   Smart     │  │  Dashboard  │ │
│  │  (Node.js)  │  │  Contract   │  │   (React)   │ │
│  │             │  │  (Anchor)   │  │             │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │        │
│         └────────────────┼────────────────┘        │
│                          │                          │
│                    ┌─────▼─────┐                   │
│                    │  Solana   │                   │
│                    │ Blockchain│                   │
│                    └───────────┘                   │
└─────────────────────────────────────────────────────┘</div>
                    `,
      'Smart Contract': `
                        <h3>Smart Contract Deep Dive</h3>
                        <p>The Burn Engine smart contract is built using the <strong>Anchor framework</strong> on Solana.</p>

                        <h4>Program ID</h4>
                        <div class="deep-code">ASDFc5hkEM2MF8mrAAtCPieV6x6h1B5BwjgztFt7Xbui</div>

                        <h4>Core Instructions</h4>
                        <div class="deep-code">
<span class="keyword">pub mod</span> burn_engine {
    <span class="keyword">use</span> anchor_lang::prelude::*;

    <span class="comment">// Initialize the burn engine</span>
    <span class="keyword">pub fn</span> <span class="function">initialize</span>(ctx: Context<Initialize>) -> Result<()> {
        <span class="comment">// Sets up treasury accounts and config</span>
    }

    <span class="comment">// Deposit SOL for burning</span>
    <span class="keyword">pub fn</span> <span class="function">deposit_sol</span>(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        <span class="comment">// Swaps SOL to ASDF via Jupiter</span>
        <span class="comment">// Burns the ASDF tokens</span>
    }

    <span class="comment">// Deposit ASDF for burning</span>
    <span class="keyword">pub fn</span> <span class="function">deposit_asdf</span>(ctx: Context<DepositAsdf>, amount: u64) -> Result<()> {
        <span class="comment">// 99.448% burned</span>
        <span class="comment">// 0.552% returned as rebate</span>
    }

    <span class="comment">// Execute burn cycle</span>
    <span class="keyword">pub fn</span> <span class="function">execute_burn</span>(ctx: Context<ExecuteBurn>) -> Result<()> {
        <span class="comment">// Triggers accumulated burns</span>
    }
}</div>

                        <h4>Account Structure</h4>
                        <table class="deep-table">
                            <tr><th>Account</th><th>Purpose</th><th>Size</th></tr>
                            <tr><td>BurnConfig</td><td>Global configuration</td><td>128 bytes</td></tr>
                            <tr><td>Treasury</td><td>Holds pending burns</td><td>PDA</td></tr>
                            <tr><td>BurnHistory</td><td>Records all burns</td><td>Dynamic</td></tr>
                        </table>

                        <div class="deep-warning">
                            <strong>Security Note:</strong> The burn address has no private key. Tokens sent there are permanently irrecoverable.
                        </div>
                    `,
      Integration: `
                        <h3>Integrating with the Burn Engine</h3>
                        <p>Any application can integrate with the Burn Engine to contribute to the deflationary mechanism.</p>

                        <h4>JavaScript SDK</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { BurnEngine } <span class="keyword">from</span> <span class="string">'@asdf/burn-engine-sdk'</span>;

<span class="comment">// Initialize</span>
<span class="keyword">const</span> engine = <span class="keyword">new</span> <span class="function">BurnEngine</span>({
    rpcUrl: <span class="string">'https://api.mainnet-beta.solana.com'</span>,
    wallet: yourWallet
});

<span class="comment">// Deposit SOL for burning</span>
<span class="keyword">await</span> engine.<span class="function">depositSOL</span>({
    amount: 0.1, <span class="comment">// SOL</span>
    memo: <span class="string">'App fee contribution'</span>
});

<span class="comment">// Deposit ASDF for burning</span>
<span class="keyword">await</span> engine.<span class="function">depositASDF</span>({
    amount: 1000, <span class="comment">// ASDF tokens</span>
    memo: <span class="string">'User burn'</span>
});

<span class="comment">// Check burn stats</span>
<span class="keyword">const</span> stats = <span class="keyword">await</span> engine.<span class="function">getStats</span>();
console.log('Total burned: ' + stats.totalBurned);</div>

                        <h4>Direct RPC Integration</h4>
                        <div class="deep-code">
<span class="comment">// Build transaction manually</span>
<span class="keyword">const</span> tx = <span class="keyword">new</span> Transaction().<span class="function">add</span>(
    <span class="keyword">await</span> program.methods
        .<span class="function">depositSol</span>(<span class="keyword">new</span> BN(amount))
        .<span class="function">accounts</span>({
            depositor: wallet.publicKey,
            treasury: treasuryPDA,
            systemProgram: SystemProgram.programId
        })
        .<span class="function">instruction</span>()
);

<span class="keyword">await</span> <span class="function">sendAndConfirmTransaction</span>(connection, tx, [wallet]);</div>

                        <h4>Integration Checklist</h4>
                        <ul>
                            <li>Install the SDK: <code>npm install @asdf/burn-engine-sdk</code></li>
                            <li>Configure your RPC endpoint</li>
                            <li>Set up wallet connection</li>
                            <li>Implement deposit calls in your fee logic</li>
                            <li>Display burn contribution to users (optional)</li>
                        </ul>

                        <div class="deep-tip">
                            <strong>Best Practice:</strong> Show users their contribution to burns. It builds trust and community engagement.
                        </div>
                    `,
      'API Reference': `
                        <h3>API Reference</h3>
                        <p>The Burn Engine daemon exposes public APIs for monitoring and verification.</p>

                        <h4>Endpoints</h4>
                        <table class="deep-table">
                            <tr><th>Endpoint</th><th>Method</th><th>Description</th></tr>
                            <tr><td>/stats</td><td>GET</td><td>Current burn statistics</td></tr>
                            <tr><td>/health</td><td>GET</td><td>Daemon health check</td></tr>
                            <tr><td>/burns</td><td>GET</td><td>Recent burn history</td></tr>
                            <tr><td>/burns/:txId</td><td>GET</td><td>Specific burn details</td></tr>
                        </table>

                        <h4>GET /stats</h4>
                        <div class="deep-code">
<span class="comment">// Response</span>
{
    <span class="string">"totalBurned"</span>: <span class="string">"1,234,567,890"</span>,
    <span class="string">"totalBurnedUSD"</span>: <span class="string">"$45,678"</span>,
    <span class="string">"burnCount"</span>: 1547,
    <span class="string">"last24hBurned"</span>: <span class="string">"12,345,678"</span>,
    <span class="string">"avgBurnSize"</span>: <span class="string">"798,432"</span>,
    <span class="string">"supplyReduction"</span>: <span class="string">"2.34%"</span>
}</div>

                        <h4>GET /burns</h4>
                        <div class="deep-code">
<span class="comment">// Query parameters</span>
?limit=50         <span class="comment">// Max results (default 50)</span>
&offset=0         <span class="comment">// Pagination offset</span>
&from=1703980800  <span class="comment">// Unix timestamp start</span>
&to=1704067200    <span class="comment">// Unix timestamp end</span>

<span class="comment">// Response</span>
{
    <span class="string">"burns"</span>: [
        {
            <span class="string">"txId"</span>: <span class="string">"5Kj2..."</span>,
            <span class="string">"amount"</span>: <span class="string">"1,000,000"</span>,
            <span class="string">"source"</span>: <span class="string">"trading"</span>,
            <span class="string">"timestamp"</span>: 1703980800,
            <span class="string">"verified"</span>: <span class="keyword">true</span>
        }
    ],
    <span class="string">"total"</span>: 1547,
    <span class="string">"hasMore"</span>: <span class="keyword">true</span>
}</div>

                        <h4>Verification</h4>
                        <p>All burns can be independently verified on Solscan:</p>
                        <div class="deep-code">https://solscan.io/tx/{txId}</div>
                    `,
      Deployment: `
                        <h3>Deployment Guide</h3>
                        <p>How to deploy and run the Burn Engine components.</p>

                        <h4>Prerequisites</h4>
                        <ul>
                            <li>Node.js 18+</li>
                            <li>Rust & Cargo (latest stable)</li>
                            <li>Solana CLI tools</li>
                            <li>Anchor CLI v0.29+</li>
                        </ul>

                        <h4>1. Clone & Setup</h4>
                        <div class="deep-code">
git clone https://github.com/zeyxx/asdf-burn-engine
cd asdf-burn-engine
cp .env.template .env
<span class="comment"># Edit .env with your configuration</span></div>

                        <h4>2. Environment Variables</h4>
                        <div class="deep-code">
<span class="comment"># Required</span>
RPC_URL=https://api.mainnet-beta.solana.com
WALLET_PATH=/path/to/keypair.json

<span class="comment"># Optional</span>
BURN_INTERVAL=300000  <span class="comment"># 5 minutes</span>
MIN_BURN_AMOUNT=1000  <span class="comment"># Minimum tokens to trigger burn</span>
LOG_LEVEL=info</div>

                        <h4>3. Build Smart Contract</h4>
                        <div class="deep-code">
anchor build
anchor test  <span class="comment"># Run tests</span>
anchor deploy --provider.cluster mainnet</div>

                        <h4>4. Run Daemon</h4>
                        <div class="deep-code">
npm install
npm run build
npm run start:daemon</div>

                        <h4>5. Run Dashboard</h4>
                        <div class="deep-code">
cd dashboard
npm install
npm run build
npm run start</div>

                        <div class="deep-warning">
                            <strong>Production Warning:</strong> Always test on devnet first. Mainnet deployments involve real funds.
                        </div>

                        <h4>Monitoring</h4>
                        <p>The daemon exposes Prometheus metrics at <code>/metrics</code> for monitoring with Grafana.</p>
                    `,
    },
  },
  validator: {
    title: '✅ ASDF Validator - Deep Learn',
    tabs: ['Introduction', 'How It Works', 'Installation', 'CLI Usage', 'Dashboard', 'API'],
    content: {
      Introduction: `
                        <h3>What is the ASDF Validator?</h3>
                        <p>The ASDF Validator is a <strong>real-time fee tracking system</strong> for Pump.fun token creators on the Solana blockchain. It provides WebSocket-based live updates with approximately 400ms latency.</p>

                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Real-time tracking</strong> via WebSocket subscriptions</li>
                            <li><strong>Per-token fee attribution</strong> with auto-discovery</li>
                            <li><strong>Proof-of-History</strong> SHA-256 chain verification</li>
                            <li><strong>Web dashboard</strong> with analytics</li>
                            <li><strong>Dual vault monitoring</strong> (Bonding Curve + AMM)</li>
                        </ul>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">Data Flow</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Solana RPC</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">WebSocket</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Fee Tracker</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Dashboard</div>
                            </div>
                        </div>

                        <h4>Use Cases</h4>
                        <ul>
                            <li>Track creator earnings in real-time</li>
                            <li>Verify fee distributions</li>
                            <li>Build analytics dashboards</li>
                            <li>Integrate with burn mechanisms</li>
                        </ul>
                    `,
      'How It Works': `
                        <h3>Technical Architecture</h3>

                        <h4>WebSocket Subscription</h4>
                        <p>The validator subscribes to account changes on Solana using WebSocket connections:</p>
                        <div class="deep-code">
<span class="comment">// Subscribe to vault account changes</span>
connection.<span class="function">onAccountChange</span>(vaultPubkey, (accountInfo) => {
    <span class="comment">// Detect balance modifications</span>
    <span class="keyword">const</span> newBalance = accountInfo.lamports;
    <span class="keyword">if</span> (newBalance > previousBalance) {
        <span class="comment">// Fee detected!</span>
        <span class="function">processFeeEvent</span>(newBalance - previousBalance);
    }
});</div>

                        <h4>Fee Attribution</h4>
                        <p>When a fee is detected, the system:</p>
                        <ul>
                            <li>Fetches the full transaction data</li>
                            <li>Parses token balances and transfers</li>
                            <li>Attributes the fee to specific token mints</li>
                            <li>Records with cryptographic hash chain</li>
                        </ul>

                        <h4>Proof-of-History Chain</h4>
                        <div class="deep-code">
<span class="keyword">interface</span> FeeRecord {
    txId: <span class="keyword">string</span>;
    amount: <span class="keyword">number</span>;
    tokenMint: <span class="keyword">string</span>;
    timestamp: <span class="keyword">number</span>;
    previousHash: <span class="keyword">string</span>;
    hash: <span class="keyword">string</span>;  <span class="comment">// SHA-256(txId + amount + previousHash)</span>
}

<span class="comment">// Each record links to the previous, creating tamper-proof history</span></div>

                        <h4>Component Overview</h4>
                        <table class="deep-table">
                            <tr><th>Component</th><th>File</th><th>Purpose</th></tr>
                            <tr><td>Fee Tracker</td><td>fee-tracker.ts</td><td>Core tracking logic</td></tr>
                            <tr><td>Realtime Tracker</td><td>realtime-tracker.ts</td><td>WebSocket handler</td></tr>
                            <tr><td>History Manager</td><td>history-manager.ts</td><td>Proof-of-History chain</td></tr>
                            <tr><td>Token Manager</td><td>token-manager.ts</td><td>Token discovery</td></tr>
                            <tr><td>RPC Manager</td><td>rpc-manager.ts</td><td>Connection handling</td></tr>
                        </table>
                    `,
      Installation: `
                        <h3>Installation Guide</h3>

                        <h4>Prerequisites</h4>
                        <ul>
                            <li>Node.js 18 or higher</li>
                            <li>npm or yarn</li>
                            <li>A Solana RPC endpoint (mainnet)</li>
                        </ul>

                        <h4>Quick Start</h4>
                        <div class="deep-code">
<span class="comment"># Clone the repository</span>
git clone https://github.com/zeyxx/asdf-validator
cd asdf-validator

<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Build the project</span>
npm run build

<span class="comment"># Run tests</span>
npm test</div>

                        <h4>Environment Configuration</h4>
                        <div class="deep-code">
<span class="comment"># Create .env file</span>
RPC_URL=https://api.mainnet-beta.solana.com
<span class="comment"># Or use a private RPC for better performance:</span>
<span class="comment"># RPC_URL=https://your-rpc-provider.com</span></div>

                        <div class="deep-tip">
                            <strong>Performance Tip:</strong> Use a dedicated RPC endpoint (Helius, QuickNode, etc.) for production. Public endpoints have rate limits.
                        </div>

                        <h4>Project Structure</h4>
                        <div class="deep-code">
asdf-validator/
├── cli.ts              <span class="comment"># Command-line interface</span>
├── daemon.ts           <span class="comment"># Background service</span>
├── index.ts            <span class="comment"># Library exports</span>
├── lib/
│   ├── fee-tracker.ts
│   ├── realtime-tracker.ts
│   ├── history-manager.ts
│   ├── token-manager.ts
│   ├── rpc-manager.ts
│   └── websocket-manager.ts
├── dashboard/
│   ├── server.ts       <span class="comment"># Express server</span>
│   └── public/         <span class="comment"># Frontend assets</span>
└── tests/</div>
                    `,
      'CLI Usage': `
                        <h3>Command Line Interface</h3>

                        <h4>Basic Usage</h4>
                        <div class="deep-code">
<span class="comment"># Track a specific creator address</span>
npx ts-node cli.ts --creator YOUR_CREATOR_ADDRESS

<span class="comment"># With verbose output</span>
npx ts-node cli.ts -c ADDRESS -v

<span class="comment"># Save history to file</span>
npx ts-node cli.ts -c ADDRESS -H history.json</div>

                        <h4>CLI Options</h4>
                        <table class="deep-table">
                            <tr><th>Option</th><th>Alias</th><th>Description</th></tr>
                            <tr><td>--creator</td><td>-c</td><td>Creator address to track (required)</td></tr>
                            <tr><td>--history</td><td>-H</td><td>Path to save/load history JSON</td></tr>
                            <tr><td>--verbose</td><td>-v</td><td>Enable verbose logging</td></tr>
                            <tr><td>--rpc</td><td>-r</td><td>Custom RPC endpoint</td></tr>
                        </table>

                        <h4>Example Output</h4>
                        <div class="deep-code">
$ npx ts-node cli.ts -c 7xKX...abc -v

[INFO] Connecting to Solana mainnet...
[INFO] Subscribing to creator: 7xKX...abc
[INFO] Found 3 active tokens

[FEE] Token: ASDF | Amount: 0.125 SOL | Tx: 5Kj2...
[FEE] Token: PUMP | Amount: 0.089 SOL | Tx: 8Mn4...

<span class="comment">--- Running totals ---</span>
Total fees collected: 2.456 SOL
Tokens tracked: 3
Uptime: 4h 32m</div>

                        <h4>Daemon Mode</h4>
                        <div class="deep-code">
<span class="comment"># Run as background daemon</span>
npx ts-node daemon.ts CREATOR_ADDRESS

<span class="comment"># With PM2 for production</span>
pm2 start daemon.ts -- CREATOR_ADDRESS</div>
                    `,
      Dashboard: `
                        <h3>Web Dashboard</h3>
                        <p>The validator includes a React-based web dashboard for visualizing fee data.</p>

                        <h4>Starting the Dashboard</h4>
                        <div class="deep-code">
<span class="comment"># Start dashboard server</span>
npx ts-node dashboard/server.ts CREATOR_ADDRESS [RPC_URL] [PORT]

<span class="comment"># Example</span>
npx ts-node dashboard/server.ts 7xKX...abc https://api.mainnet-beta.solana.com 3000

<span class="comment"># Access at http://localhost:3000</span></div>

                        <h4>Dashboard Features</h4>
                        <ul>
                            <li><strong>Real-time feed</strong> - Live fee events as they happen</li>
                            <li><strong>Charts</strong> - Historical fee visualization</li>
                            <li><strong>Token breakdown</strong> - Per-token fee attribution</li>
                            <li><strong>Export</strong> - Download data as CSV/JSON</li>
                        </ul>

                        <h4>Customization</h4>
                        <p>The dashboard is built with React and can be customized:</p>
                        <div class="deep-code">
cd dashboard
npm install
<span class="comment"># Edit components in src/</span>
npm run build</div>

                        <div class="deep-tip">
                            <strong>Embedding:</strong> The dashboard can be embedded in other applications via iframe or integrated as a React component.
                        </div>
                    `,
      API: `
                        <h3>Programmatic API</h3>
                        <p>Use the validator as a library in your own applications.</p>

                        <h4>Basic Usage</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { ValidatorDaemon } <span class="keyword">from</span> <span class="string">'./daemon'</span>;

<span class="keyword">const</span> daemon = <span class="keyword">new</span> <span class="function">ValidatorDaemon</span>({
    creatorAddress: <span class="string">'7xKX...abc'</span>,
    rpcUrl: <span class="string">'https://api.mainnet-beta.solana.com'</span>,
    onFeeDetected: (fee) => {
        console.log('Fee: ' + fee.amount + ' SOL from ' + fee.tokenMint);
    },
    onError: (error) => {
        console.error(<span class="string">'Error:'</span>, error);
    }
});

<span class="keyword">await</span> daemon.<span class="function">start</span>();

<span class="comment">// Later...</span>
<span class="keyword">await</span> daemon.<span class="function">stop</span>();</div>

                        <h4>RealtimeTracker Class</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { RealtimeTracker } <span class="keyword">from</span> <span class="string">'./lib/realtime-tracker'</span>;

<span class="keyword">const</span> tracker = <span class="keyword">new</span> <span class="function">RealtimeTracker</span>(connection, creatorPubkey);

tracker.<span class="function">on</span>(<span class="string">'fee'</span>, (event) => {
    console.log(event.amount, event.tokenMint, event.txId);
});

tracker.<span class="function">on</span>(<span class="string">'newToken'</span>, (mint) => {
    console.log(<span class="string">'New token discovered:'</span>, mint);
});

<span class="keyword">await</span> tracker.<span class="function">subscribe</span>();</div>

                        <h4>HistoryManager Class</h4>
                        <div class="deep-code">
<span class="keyword">import</span> { HistoryManager } <span class="keyword">from</span> <span class="string">'./lib/history-manager'</span>;

<span class="keyword">const</span> history = <span class="keyword">new</span> <span class="function">HistoryManager</span>(<span class="string">'./history.json'</span>);

<span class="comment">// Add record with automatic hash chaining</span>
history.<span class="function">addRecord</span>({
    txId: <span class="string">'5Kj2...'</span>,
    amount: 0.125,
    tokenMint: <span class="string">'ASDF...'</span>
});

<span class="comment">// Verify chain integrity</span>
<span class="keyword">const</span> isValid = history.<span class="function">verifyChain</span>();
console.log(<span class="string">'History valid:'</span>, isValid);</div>
                    `,
    },
  },
  'vanity-grinder': {
    title: '🎯 Vanity Grinder - Deep Learn',
    tabs: ['Introduction', 'How It Works', 'Usage', 'Performance'],
    content: {
      Introduction: `
                        <h3>What is the Vanity Grinder?</h3>
                        <p>The Vanity Grinder is a high-performance <strong>Rust application</strong> for generating Solana keypairs with custom prefixes (vanity addresses).</p>

                        <h4>What are Vanity Addresses?</h4>
                        <p>A vanity address is a cryptocurrency address that contains a specific pattern or prefix. For example:</p>
                        <div class="deep-code">
<span class="comment">// Normal Solana address</span>
7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6rMnCp

<span class="comment">// Vanity address with "ASDF" prefix</span>
ASDF7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6</div>

                        <h4>Use Cases</h4>
                        <ul>
                            <li><strong>Branding</strong> - Create memorable project addresses</li>
                            <li><strong>Verification</strong> - Easily identify official addresses</li>
                            <li><strong>Integration</strong> - Required for ASDev token launches</li>
                        </ul>
                    `,
      'How It Works': `
                        <h3>Technical Details</h3>

                        <h4>Generation Process</h4>
                        <p>The grinder uses brute-force generation with parallel processing:</p>
                        <div class="deep-code">
<span class="keyword">loop</span> {
    <span class="comment">// 1. Generate random keypair</span>
    <span class="keyword">let</span> keypair = Keypair::<span class="function">new</span>();

    <span class="comment">// 2. Get base58 public key</span>
    <span class="keyword">let</span> pubkey = keypair.pubkey().<span class="function">to_string</span>();

    <span class="comment">// 3. Check if it matches target prefix</span>
    <span class="keyword">if</span> pubkey.<span class="function">starts_with</span>(<span class="string">"ASDF"</span>) {
        <span class="comment">// Found! Save and exit</span>
        <span class="function">save_keypair</span>(keypair);
        <span class="keyword">break</span>;
    }
}</div>

                        <h4>Probability</h4>
                        <p>Solana addresses use Base58 encoding (58 possible characters). The probability of finding a match:</p>
                        <table class="deep-table">
                            <tr><th>Prefix Length</th><th>Probability</th><th>Avg. Attempts</th></tr>
                            <tr><td>1 char</td><td>1/58</td><td>~58</td></tr>
                            <tr><td>2 chars</td><td>1/3,364</td><td>~3,364</td></tr>
                            <tr><td>3 chars</td><td>1/195,112</td><td>~195K</td></tr>
                            <tr><td>4 chars (ASDF)</td><td>1/11,316,496</td><td>~11.3M</td></tr>
                        </table>

                        <div class="deep-warning">
                            <strong>Time Warning:</strong> Finding a 4-character prefix can take minutes to hours depending on hardware.
                        </div>
                    `,
      Usage: `
                        <h3>Using the Grinder</h3>

                        <h4>Installation</h4>
                        <div class="deep-code">
<span class="comment"># Clone repository</span>
git clone https://github.com/zeyxx/asdf-vanity-grinder
cd asdf-vanity-grinder

<span class="comment"># Build with optimizations</span>
cargo build --release</div>

                        <h4>Running</h4>
                        <div class="deep-code">
<span class="comment"># Using the start script</span>
./start_grinder.sh

<span class="comment"># Or directly</span>
./target/release/asdf-vanity-grinder --prefix ASDF</div>

                        <h4>Output</h4>
                        <p>When a matching keypair is found, it's saved to a JSON file:</p>
                        <div class="deep-code">
{
    "publicKey": "ASDF7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6",
    "secretKey": [/* 64 bytes */]
}</div>

                        <div class="deep-warning">
                            <strong>Security:</strong> Never share your secret key! Store it securely and back it up.
                        </div>
                    `,
      Performance: `
                        <h3>Performance Optimization</h3>

                        <h4>Hardware Requirements</h4>
                        <ul>
                            <li><strong>CPU:</strong> Multi-core recommended (scales with threads)</li>
                            <li><strong>RAM:</strong> Minimal (~100MB)</li>
                            <li><strong>Storage:</strong> Minimal</li>
                        </ul>

                        <h4>Expected Performance</h4>
                        <table class="deep-table">
                            <tr><th>CPU</th><th>Keys/Second</th><th>4-char Time</th></tr>
                            <tr><td>4-core laptop</td><td>~50,000</td><td>~4 minutes</td></tr>
                            <tr><td>8-core desktop</td><td>~150,000</td><td>~75 seconds</td></tr>
                            <tr><td>32-core server</td><td>~500,000</td><td>~23 seconds</td></tr>
                        </table>

                        <h4>Tips</h4>
                        <ul>
                            <li>Use <code>--release</code> build for 10x+ speedup</li>
                            <li>Run on a server for long prefix searches</li>
                            <li>Case-insensitive matching is faster</li>
                        </ul>

                        <div class="deep-tip">
                            <strong>Cloud Option:</strong> For very long prefixes, consider renting a high-CPU cloud instance temporarily.
                        </div>
                    `,
    },
  },
  holdex: {
    title: '📊 HolDex - Deep Learn',
    tabs: ['Introduction', 'Architecture', 'Setup', 'Customization'],
    content: {
      Introduction: `
                        <h3>What is HolDex?</h3>
                        <p>HolDex is an <strong>open-source DexScreener alternative</strong> built for the ASDF ecosystem. It provides token tracking, charts, and ecosystem monitoring.</p>

                        <h4>Features</h4>
                        <ul>
                            <li>Real-time token price tracking</li>
                            <li>Interactive price charts</li>
                            <li>Token search and discovery</li>
                            <li>Ecosystem overview dashboard</li>
                            <li>Docker deployment support</li>
                        </ul>

                        <h4>Why HolDex?</h4>
                        <p>Unlike centralized alternatives, HolDex is:</p>
                        <ul>
                            <li><strong>Open source</strong> - Full transparency</li>
                            <li><strong>Self-hostable</strong> - Run your own instance</li>
                            <li><strong>ASDF-integrated</strong> - Native ecosystem support</li>
                            <li><strong>No tracking</strong> - Privacy-respecting</li>
                        </ul>
                    `,
      Architecture: `
                        <h3>Technical Architecture</h3>

                        <h4>Stack Overview</h4>
                        <table class="deep-table">
                            <tr><th>Layer</th><th>Technology</th></tr>
                            <tr><td>Frontend</td><td>HTML, CSS, JavaScript</td></tr>
                            <tr><td>Backend</td><td>Node.js (optional)</td></tr>
                            <tr><td>Data Source</td><td>Solana RPC, Jupiter API</td></tr>
                            <tr><td>Deployment</td><td>Docker, Static hosting</td></tr>
                        </table>

                        <h4>File Structure</h4>
                        <div class="deep-code">
HolDex/
├── src/
│   ├── js/
│   │   ├── app.js        <span class="comment"># Main application</span>
│   │   ├── charts.js     <span class="comment"># Chart rendering</span>
│   │   └── api.js        <span class="comment"># Data fetching</span>
│   └── css/
│       └── styles.css
├── homepage.html         <span class="comment"># Main page</span>
├── submissions.html      <span class="comment"># Token submissions</span>
├── package.json
├── Dockerfile
└── docker-compose.yml</div>

                        <h4>Data Flow</h4>
                        <div class="deep-diagram">
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">User Request</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Jupiter/RPC API</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Process Data</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Render UI</div>
                            </div>
                        </div>
                    `,
      Setup: `
                        <h3>Setup Guide</h3>

                        <h4>Option 1: Docker (Recommended)</h4>
                        <div class="deep-code">
<span class="comment"># Clone the repository</span>
git clone https://github.com/sollama58/HolDex
cd HolDex

<span class="comment"># Start with Docker Compose</span>
docker-compose up -d

<span class="comment"># Access at http://localhost:3000</span></div>

                        <h4>Option 2: Manual Setup</h4>
                        <div class="deep-code">
<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Start development server</span>
npm run dev

<span class="comment"># Or build for production</span>
npm run build</div>

                        <h4>Option 3: Static Hosting</h4>
                        <p>HolDex can run as static files on any web server:</p>
                        <div class="deep-code">
<span class="comment"># Just serve the HTML files</span>
npx serve .

<span class="comment"># Or upload to Vercel, Netlify, GitHub Pages, etc.</span></div>

                        <div class="deep-tip">
                            <strong>Quick Deploy:</strong> Fork the repo and connect to Vercel for instant deployment.
                        </div>
                    `,
      Customization: `
                        <h3>Customizing HolDex</h3>

                        <h4>Theming</h4>
                        <p>Modify CSS variables in <code>styles.css</code>:</p>
                        <div class="deep-code">
:root {
    --primary-color: #ea580c;  <span class="comment">/* ASDF orange */</span>
    --bg-color: #0a0a0f;
    --text-color: #ffedd5;
    <span class="comment">/* ... more variables */</span>
}</div>

                        <h4>Adding Tokens</h4>
                        <p>Edit the token list in <code>src/js/tokens.js</code>:</p>
                        <div class="deep-code">
<span class="keyword">export const</span> tokens = [
    {
        symbol: <span class="string">'ASDF'</span>,
        mint: <span class="string">'ASDF...'</span>,
        name: <span class="string">'ASDFASDFA'</span>,
        logo: <span class="string">'/images/asdf.png'</span>
    },
    <span class="comment">// Add more tokens...</span>
];</div>

                        <h4>API Integration</h4>
                        <p>To use different data sources, modify <code>src/js/api.js</code>:</p>
                        <div class="deep-code">
<span class="keyword">export async function</span> <span class="function">getPrice</span>(mint) {
    <span class="comment">// Default: Jupiter Price API</span>
    <span class="keyword">const</span> response = <span class="keyword">await</span> <span class="function">fetch</span>(
        'https://price.jup.ag/v4/price?ids=' + mint
    );
    <span class="keyword">return</span> response.<span class="function">json</span>();
}</div>
                    `,
    },
  },
  asdforecast: {
    title: '🔮 ASDForecast - Deep Learn',
    tabs: ['Introduction', 'How It Works', 'Setup', 'Creating Markets'],
    content: {
      Introduction: `
                        <h3>What is ASDForecast?</h3>
                        <p>ASDForecast is a <strong>prediction market platform</strong> built on Solana for the ASDF ecosystem. All trading fees contribute to ASDF buybacks and burns.</p>

                        <h4>How Prediction Markets Work</h4>
                        <ul>
                            <li>Users bet on future outcomes (Yes/No questions)</li>
                            <li>Prices reflect the crowd's probability estimates</li>
                            <li>Winners receive payouts; losers lose their stakes</li>
                            <li>Platform fees go to ASDF burns</li>
                        </ul>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">Market Lifecycle</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Create Market</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Trading Open</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Resolution</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Payout</div>
                            </div>
                        </div>

                        <h4>Fee Structure</h4>
                        <table class="deep-table">
                            <tr><th>Action</th><th>Fee</th><th>Destination</th></tr>
                            <tr><td>Trade</td><td>1%</td><td>ASDF BBB</td></tr>
                            <tr><td>Market Creation</td><td>0.1 SOL</td><td>ASDF BBB</td></tr>
                            <tr><td>Payout</td><td>0%</td><td>N/A</td></tr>
                        </table>
                    `,
      'How It Works': `
                        <h3>Technical Details</h3>

                        <h4>Market Mechanics</h4>
                        <p>Each market has two outcome tokens: YES and NO. Their prices are determined by an automated market maker (AMM).</p>
                        <div class="deep-code">
<span class="comment">// Price formula (CPMM-like)</span>
YES_price = YES_pool / (YES_pool + NO_pool)
NO_price = NO_pool / (YES_pool + NO_pool)

<span class="comment">// Always: YES_price + NO_price = 1</span></div>

                        <h4>Trading Example</h4>
                        <div class="deep-code">
<span class="comment">// Initial state</span>
YES_pool: 1000, NO_pool: 1000
YES_price: 0.50 (50%), NO_price: 0.50 (50%)

<span class="comment">// User buys 100 YES tokens</span>
YES_pool: 1100, NO_pool: 909  <span class="comment">// Constant product</span>
YES_price: 0.55 (55%), NO_price: 0.45 (45%)</div>

                        <h4>Resolution</h4>
                        <p>Markets are resolved by designated oracles or admin after the event occurs:</p>
                        <ul>
                            <li><strong>YES wins:</strong> YES holders get full payout</li>
                            <li><strong>NO wins:</strong> NO holders get full payout</li>
                            <li><strong>Invalid:</strong> All stakes returned</li>
                        </ul>
                    `,
      Setup: `
                        <h3>Running ASDForecast</h3>

                        <h4>Installation</h4>
                        <div class="deep-code">
<span class="comment"># Clone repository</span>
git clone https://github.com/sollama58/ASDForecast
cd ASDForecast

<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Start the server</span>
node server.js</div>

                        <h4>File Overview</h4>
                        <table class="deep-table">
                            <tr><th>File</th><th>Purpose</th></tr>
                            <tr><td>frontend.html</td><td>Main trading interface</td></tr>
                            <tr><td>control_panel.html</td><td>Admin controls</td></tr>
                            <tr><td>burnMonitorFrontend.html</td><td>Fee tracking widget</td></tr>
                            <tr><td>server.js</td><td>Backend API server</td></tr>
                        </table>

                        <h4>Configuration</h4>
                        <div class="deep-code">
<span class="comment">// In server.js</span>
<span class="keyword">const</span> config = {
    port: 3000,
    rpcUrl: <span class="string">'https://api.mainnet-beta.solana.com'</span>,
    burnEngineAddress: <span class="string">'ASDF...'</span>,
    adminWallet: <span class="string">'YOUR_ADMIN_WALLET'</span>
};</div>

                        <div class="deep-warning">
                            <strong>Note:</strong> The control panel requires admin wallet authentication.
                        </div>
                    `,
      'Creating Markets': `
                        <h3>Creating Prediction Markets</h3>

                        <h4>Via Control Panel</h4>
                        <ol>
                            <li>Open <code>control_panel.html</code></li>
                            <li>Connect admin wallet</li>
                            <li>Fill in market details:
                                <ul>
                                    <li>Question (e.g., "Will BTC reach $100k in 2025?")</li>
                                    <li>Resolution date</li>
                                    <li>Initial liquidity</li>
                                </ul>
                            </li>
                            <li>Submit and sign transaction</li>
                        </ol>

                        <h4>Programmatically</h4>
                        <div class="deep-code">
<span class="keyword">const</span> market = <span class="keyword">await</span> <span class="function">createMarket</span>({
    question: <span class="string">"Will ASDF burn 1B tokens by EOY?"</span>,
    resolutionDate: <span class="keyword">new</span> Date(<span class="string">'2025-12-31'</span>),
    initialLiquidity: 10, <span class="comment">// SOL</span>
    oracle: adminWallet.publicKey
});

console.log(<span class="string">'Market created:'</span>, market.address);</div>

                        <h4>Best Practices</h4>
                        <ul>
                            <li>Use clear, unambiguous questions</li>
                            <li>Set realistic resolution dates</li>
                            <li>Provide sufficient initial liquidity</li>
                            <li>Choose trusted oracles for resolution</li>
                        </ul>
                    `,
    },
  },
  burntracker: {
    title: '📈 ASDFBurnTracker - Deep Learn',
    tabs: ['Introduction', 'Setup', 'Embedding', 'API'],
    content: {
      Introduction: `
                        <h3>What is ASDFBurnTracker?</h3>
                        <p>ASDFBurnTracker is a real-time monitoring widget that <strong>tracks ASDF buybacks and burns</strong>. It provides visual proof of the deflationary mechanism in action.</p>

                        <h4>Features</h4>
                        <ul>
                            <li>Live burn event feed</li>
                            <li>Total burned counter</li>
                            <li>24-hour statistics</li>
                            <li>Embeddable widget</li>
                        </ul>

                        <h4>Data Sources</h4>
                        <p>The tracker monitors:</p>
                        <ul>
                            <li>Burn Engine transactions</li>
                            <li>Burn address balance changes</li>
                            <li>Trading fee accumulation</li>
                        </ul>
                    `,
      Setup: `
                        <h3>Running the Tracker</h3>

                        <h4>Quick Start</h4>
                        <div class="deep-code">
<span class="comment"># Clone repository</span>
git clone https://github.com/sollama58/ASDFBurnTracker
cd ASDFBurnTracker

<span class="comment"># Install dependencies</span>
npm install

<span class="comment"># Start server</span>
node server.js

<span class="comment"># Open in browser</span>
<span class="comment"># http://localhost:3000</span></div>

                        <h4>Project Files</h4>
                        <table class="deep-table">
                            <tr><th>File</th><th>Description</th></tr>
                            <tr><td>server.js</td><td>Backend server with WebSocket</td></tr>
                            <tr><td>originalHTMLwidget.html</td><td>Widget frontend</td></tr>
                            <tr><td>package.json</td><td>Dependencies</td></tr>
                        </table>
                    `,
      Embedding: `
                        <h3>Embedding the Widget</h3>
                        <p>Add the burn tracker to your website with a simple iframe:</p>

                        <h4>Basic Embed</h4>
                        <div class="deep-code">
&lt;iframe
    src="https://your-tracker-url.com/widget"
    width="400"
    height="300"
    frameborder="0"
&gt;&lt;/iframe&gt;</div>

                        <h4>Responsive Embed</h4>
                        <div class="deep-code">
&lt;div style="position: relative; padding-bottom: 75%; height: 0;"&gt;
    &lt;iframe
        src="https://your-tracker-url.com/widget"
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
        frameborder="0"
    &gt;&lt;/iframe&gt;
&lt;/div&gt;</div>

                        <h4>Customization Parameters</h4>
                        <div class="deep-code">
<span class="comment">// URL parameters</span>
?theme=dark      <span class="comment">// dark or light</span>
&compact=true    <span class="comment">// minimal mode</span>
&showTotal=true  <span class="comment">// show total burned</span></div>
                    `,
      API: `
                        <h3>API Endpoints</h3>

                        <h4>GET /stats</h4>
                        <div class="deep-code">
{
    "totalBurned": "1,234,567,890",
    "burned24h": "12,345,678",
    "burnCount": 1547,
    "lastBurnTime": 1703980800
}</div>

                        <h4>GET /burns</h4>
                        <div class="deep-code">
{
    "burns": [
        {
            "txId": "5Kj2...",
            "amount": "1,000,000",
            "timestamp": 1703980800
        }
    ]
}</div>

                        <h4>WebSocket</h4>
                        <div class="deep-code">
<span class="keyword">const</span> ws = <span class="keyword">new</span> <span class="function">WebSocket</span>(<span class="string">'wss://your-tracker-url.com/ws'</span>);

ws.<span class="function">onmessage</span> = (event) => {
    <span class="keyword">const</span> burn = JSON.<span class="function">parse</span>(event.data);
    console.log(<span class="string">'New burn:'</span>, burn.amount);
};</div>
                    `,
    },
  },
  asdev: {
    title: '🚀 ASDev - Deep Learn',
    tabs: [
      'Introduction',
      'Architecture',
      'Installation',
      'Token Launch',
      'API Reference',
      'Security',
    ],
    content: {
      Introduction: `
                        <h3>What is ASDev?</h3>
                        <p>ASDev is a <strong>token launcher platform for Solana</strong> that creates tokens with addresses ending in "ASDF". It includes built-in burn mechanics and holder tracking.</p>

                        <h4>Key Features</h4>
                        <ul>
                            <li><strong>Vanity addresses</strong> - All tokens end with "ASDF"</li>
                            <li><strong>Burn mechanics</strong> - Automatic token burns</li>
                            <li><strong>Holder tracking</strong> - Top 50 holders per token</li>
                            <li><strong>Leaderboards</strong> - Volume-based rankings</li>
                            <li><strong>Real-time feed</strong> - Live launch notifications</li>
                        </ul>

                        <div class="deep-diagram">
                            <p style="margin-bottom: 16px; color: var(--text-cream);">Launch Flow</p>
                            <div class="deep-diagram-flow">
                                <div class="deep-diagram-box">Submit</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Queue</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Grind Key</div>
                                <span class="deep-diagram-arrow">→</span>
                                <div class="deep-diagram-box">Deploy</div>
                            </div>
                        </div>
                    `,
      Architecture: `
                        <h3>System Architecture</h3>

                        <h4>Components</h4>
                        <table class="deep-table">
                            <tr><th>Component</th><th>Technology</th><th>Purpose</th></tr>
                            <tr><td>API Server</td><td>Node.js/Express</td><td>Handle requests</td></tr>
                            <tr><td>Vanity Grinder</td><td>Rust</td><td>Generate ASDF keys</td></tr>
                            <tr><td>Job Queue</td><td>Redis</td><td>Manage deployments</td></tr>
                            <tr><td>Frontend</td><td>HTML/JS</td><td>User interface</td></tr>
                        </table>

                        <h4>Directory Structure</h4>
                        <div class="deep-code">
ASDev/
├── src/
│   ├── index.js           <span class="comment"># Entry point</span>
│   ├── config/            <span class="comment"># Configuration</span>
│   ├── services/
│   │   ├── solana.js      <span class="comment"># Blockchain ops</span>
│   │   ├── redis.js       <span class="comment"># Cache/queue</span>
│   │   └── grinder.js     <span class="comment"># Vanity service</span>
│   ├── routes/            <span class="comment"># API endpoints</span>
│   └── tasks/             <span class="comment"># Background jobs</span>
├── grinder/               <span class="comment"># Rust vanity grinder</span>
├── public/                <span class="comment"># Frontend</span>
└── docker-compose.yml</div>

                        <h4>Request Flow</h4>
                        <div class="deep-code">
1. User submits token launch request
2. Request validated and added to Redis queue
3. Background worker picks up job
4. Rust grinder generates ASDF keypair
5. Token deployed to Solana
6. Metadata uploaded to IPFS (Pinata)
7. User notified of success</div>
                    `,
      Installation: `
                        <h3>Installation Guide</h3>

                        <h4>Prerequisites</h4>
                        <ul>
                            <li>Node.js 18+</li>
                            <li>Rust (latest stable)</li>
                            <li>Redis</li>
                            <li>Solana CLI</li>
                        </ul>

                        <h4>Step 1: Clone & Dependencies</h4>
                        <div class="deep-code">
git clone https://github.com/sollama58/ASDev
cd ASDev
npm install</div>

                        <h4>Step 2: Build Grinder</h4>
                        <div class="deep-code">
<span class="comment"># Install Rust if needed</span>
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

<span class="comment"># Build grinder</span>
cd grinder
cargo build --release
cd ..</div>

                        <h4>Step 3: Configure Environment</h4>
                        <div class="deep-code">
cp .env.template .env

<span class="comment"># Edit .env with your settings:</span>
RPC_URL=https://api.mainnet-beta.solana.com
REDIS_URL=redis://localhost:6379
PINATA_JWT=your_pinata_jwt
DEPLOYER_WALLET=/path/to/keypair.json</div>

                        <h4>Step 4: Start Services</h4>
                        <div class="deep-code">
<span class="comment"># Start Redis (if not running)</span>
redis-server

<span class="comment"># Start ASDev</span>
npm start

<span class="comment"># Or with Docker</span>
docker-compose up -d</div>
                    `,
      'Token Launch': `
                        <h3>Launching Tokens</h3>

                        <h4>Via Web Interface</h4>
                        <ol>
                            <li>Navigate to the ASDev frontend</li>
                            <li>Connect your Solana wallet</li>
                            <li>Fill in token details:
                                <ul>
                                    <li>Name</li>
                                    <li>Symbol</li>
                                    <li>Description</li>
                                    <li>Image</li>
                                    <li>Initial supply</li>
                                </ul>
                            </li>
                            <li>Submit and wait for ASDF keypair generation</li>
                            <li>Confirm deployment transaction</li>
                        </ol>

                        <h4>Via API</h4>
                        <div class="deep-code">
<span class="keyword">const</span> response = <span class="keyword">await</span> <span class="function">fetch</span>(<span class="string">'/api/launch'</span>, {
    method: <span class="string">'POST'</span>,
    headers: { <span class="string">'Content-Type'</span>: <span class="string">'application/json'</span> },
    body: JSON.<span class="function">stringify</span>({
        name: <span class="string">'My Token'</span>,
        symbol: <span class="string">'MTK'</span>,
        description: <span class="string">'A cool token'</span>,
        image: imageFile, <span class="comment">// Base64 or URL</span>
        supply: 1000000000,
        creator: walletAddress
    })
});

<span class="keyword">const</span> { jobId } = <span class="keyword">await</span> response.<span class="function">json</span>();

<span class="comment">// Poll for status</span>
<span class="keyword">const</span> status = <span class="keyword">await</span> <span class="function">fetch</span>('/api/status/' + jobId);</div>

                        <h4>Launch Statuses</h4>
                        <table class="deep-table">
                            <tr><th>Status</th><th>Meaning</th></tr>
                            <tr><td>queued</td><td>Waiting in queue</td></tr>
                            <tr><td>grinding</td><td>Generating ASDF keypair</td></tr>
                            <tr><td>deploying</td><td>Submitting to Solana</td></tr>
                            <tr><td>complete</td><td>Token live!</td></tr>
                            <tr><td>failed</td><td>Error occurred</td></tr>
                        </table>
                    `,
      'API Reference': `
                        <h3>API Reference</h3>

                        <h4>POST /api/launch</h4>
                        <p>Submit a new token launch request.</p>
                        <div class="deep-code">
<span class="comment">// Request</span>
{
    "name": "Token Name",
    "symbol": "TKN",
    "description": "Description",
    "image": "https://... or base64",
    "supply": 1000000000,
    "creator": "wallet_address"
}

<span class="comment">// Response</span>
{
    "jobId": "job_abc123",
    "status": "queued",
    "position": 5
}</div>

                        <h4>GET /api/status/:jobId</h4>
                        <div class="deep-code">
{
    "jobId": "job_abc123",
    "status": "complete",
    "tokenAddress": "ASDF...",
    "txId": "5Kj2..."
}</div>

                        <h4>GET /api/leaderboard</h4>
                        <div class="deep-code">
{
    "tokens": [
        {
            "address": "ASDF...",
            "name": "Top Token",
            "volume24h": 50000,
            "rank": 1
        }
    ]
}</div>

                        <h4>GET /api/holders/:tokenAddress</h4>
                        <div class="deep-code">
{
    "holders": [
        {
            "address": "7xKX...",
            "balance": 1000000,
            "percentage": 10.5
        }
    ],
    "total": 50
}</div>
                    `,
      Security: `
                        <h3>Security Measures</h3>

                        <h4>Rate Limiting</h4>
                        <table class="deep-table">
                            <tr><th>Endpoint</th><th>Limit</th></tr>
                            <tr><td>API routes</td><td>100 req / 15 min</td></tr>
                            <tr><td>Token deployment</td><td>3 req / min</td></tr>
                            <tr><td>Admin endpoints</td><td>10 req / min</td></tr>
                        </table>

                        <h4>Input Validation</h4>
                        <ul>
                            <li>All Solana addresses validated</li>
                            <li>Token names sanitized (DOMPurify)</li>
                            <li>Image size/type restrictions</li>
                            <li>Supply limits enforced</li>
                        </ul>

                        <h4>Authentication</h4>
                        <div class="deep-code">
<span class="comment">// Admin endpoints require API key</span>
headers: {
    <span class="string">'X-API-Key'</span>: process.env.ADMIN_API_KEY
}</div>

                        <div class="deep-warning">
                            <strong>Security:</strong> Never expose your admin API key or deployer wallet in client-side code.
                        </div>

                        <h4>Best Practices</h4>
                        <ul>
                            <li>Use environment variables for secrets</li>
                            <li>Run behind a reverse proxy (nginx)</li>
                            <li>Enable HTTPS in production</li>
                            <li>Monitor logs for suspicious activity</li>
                            <li>Keep dependencies updated</li>
                        </ul>
                    `,
    },
  },
  grinder: {
    title: '⚙️ asdf_grinder - Deep Learn',
    tabs: ['Introduction', 'Installation', 'Usage', 'Docker'],
    content: {
      Introduction: `
                        <h3>What is asdf_grinder?</h3>
                        <p>asdf_grinder is a <strong>Rust-based vanity address generator</strong> for Solana. It creates keypairs with custom prefixes, particularly "ASDF" for ecosystem projects.</p>

                        <h4>Features</h4>
                        <ul>
                            <li>High-performance Rust implementation</li>
                            <li>Multi-threaded processing</li>
                            <li>Docker support</li>
                            <li>Simple CLI interface</li>
                        </ul>

                        <h4>Performance</h4>
                        <p>The grinder leverages Rust's speed and multi-threading to maximize key generation rate.</p>
                    `,
      Installation: `
                        <h3>Installation</h3>

                        <h4>From Source</h4>
                        <div class="deep-code">
<span class="comment"># Install Rust</span>
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

<span class="comment"># Clone and build</span>
git clone https://github.com/sollama58/asdf_grinder
cd asdf_grinder
cargo build --release</div>

                        <h4>Binary Location</h4>
                        <div class="deep-code">./target/release/asdf_grinder</div>

                        <div class="deep-tip">
                            <strong>Important:</strong> Always use <code>--release</code> for production. Debug builds are 10-50x slower.
                        </div>
                    `,
      Usage: `
                        <h3>Using the Grinder</h3>

                        <h4>Basic Usage</h4>
                        <div class="deep-code">
<span class="comment"># Run with start script</span>
./start_grinder.sh

<span class="comment"># Or run binary directly</span>
./target/release/asdf_grinder</div>

                        <h4>Output</h4>
                        <p>When a matching keypair is found:</p>
                        <div class="deep-code">
Found matching keypair!
Public Key: ASDF7xKXmR5qN8vZT3wP2LkB9sFgYc1dHjE4aUoW6
Saved to: keypair.json

<span class="comment"># keypair.json contains the full keypair</span>
{
    "publicKey": "ASDF...",
    "secretKey": [/* 64 bytes */]
}</div>

                        <div class="deep-warning">
                            <strong>Security:</strong> The keypair.json file contains your private key. Store it securely!
                        </div>
                    `,
      Docker: `
                        <h3>Docker Deployment</h3>

                        <h4>Build Image</h4>
                        <div class="deep-code">
docker build -t asdf-grinder .</div>

                        <h4>Run Container</h4>
                        <div class="deep-code">
<span class="comment"># Run and output to current directory</span>
docker run -v $(pwd):/output asdf-grinder

<span class="comment"># Run in background</span>
docker run -d -v $(pwd):/output asdf-grinder</div>

                        <h4>Dockerfile</h4>
                        <div class="deep-code">
FROM rust:latest as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:slim
COPY --from=builder /app/target/release/asdf_grinder /usr/local/bin/
CMD ["asdf_grinder"]</div>

                        <div class="deep-tip">
                            <strong>Cloud Deployment:</strong> For faster results, run on a high-CPU cloud instance (AWS c5.4xlarge, etc.).
                        </div>
                    `,
    },
  },
};

let currentDeepLearnProject = null;

function openDeepLearn(projectId) {
  const doc = deepLearnDocs[projectId];
  if (!doc) return;

  currentDeepLearnProject = projectId;

  const modal = document.getElementById('deep-learn-modal');
  const title = document.getElementById('deep-learn-title');
  const nav = document.getElementById('deep-learn-nav');
  const body = document.getElementById('deep-learn-body');

  title.textContent = doc.title;

  // Build navigation tabs
  let navHtml = '';
  doc.tabs.forEach((tab, index) => {
    const safeTab = escapeHtml(tab);
    const safeProjectId = escapeHtml(projectId);
    navHtml += `<button class="deep-nav-btn ${index === 0 ? 'active' : ''}" onclick="switchDeepTab('${safeProjectId}', '${safeTab}')">${safeTab}</button>`;
  });
  safeInnerHTML(nav, navHtml);

  // Build content sections
  let contentHtml = '';
  doc.tabs.forEach((tab, index) => {
    contentHtml += `<div class="deep-section ${index === 0 ? 'active' : ''}" id="deep-section-${tab.replace(/\s+/g, '-')}">${doc.content[tab]}</div>`;
  });
  safeInnerHTML(body, contentHtml);

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function switchDeepTab(projectId, tabName) {
  const doc = deepLearnDocs[projectId];
  if (!doc) return;

  // Update nav buttons
  document.querySelectorAll('.deep-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === tabName);
  });

  // Update sections
  doc.tabs.forEach(tab => {
    const section = document.getElementById(`deep-section-${tab.replace(/\s+/g, '-')}`);
    if (section) {
      section.classList.toggle('active', tab === tabName);
    }
  });
}

function closeDeepLearn() {
  document.getElementById('deep-learn-modal').classList.remove('active');
  document.body.style.overflow = '';
  currentDeepLearnProject = null;
}

// Close modals on escape or click outside
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeDocs();
    closeDeepLearn();
  }
});

document.getElementById('doc-modal')?.addEventListener('click', e => {
  if (e.target.id === 'doc-modal') closeDocs();
});

document.getElementById('deep-learn-modal')?.addEventListener('click', e => {
  if (e.target.id === 'deep-learn-modal') closeDeepLearn();
});

// ============================================
// INTERACTIVE ELEMENTS
// ============================================

function toggleReveal(element) {
  element.classList.toggle('open');
}

function toggleFaq(element) {
  element.classList.toggle('open');
}

function checkAnswer(element, level, isCorrect) {
  const state = getState();
  const container = element.closest('.quiz-container');
  const options = container.querySelectorAll('.quiz-option');
  const feedback =
    container.querySelector('.quiz-feedback') || document.getElementById('quiz-feedback-' + level);

  options.forEach(opt => (opt.style.pointerEvents = 'none'));

  if (isCorrect) {
    element.classList.add('correct');
    feedback.className = 'quiz-feedback show success';
    feedback.textContent = '✓ Correct! +25 XP';
    addXP(XP_VALUES.quiz);

    // Save completed quiz to persist across page refresh
    if (!state.completedQuizzes) state.completedQuizzes = [];
    if (!state.completedQuizzes.includes(level)) {
      state.completedQuizzes.push(level);
      saveState(state);
    }

    const nextBtn =
      document.getElementById('unlock-level-' + (level + 1)) ||
      document.getElementById('complete-course');
    if (nextBtn) nextBtn.disabled = false;
  } else {
    element.classList.add('wrong');
    feedback.className = 'quiz-feedback show error';
    feedback.textContent = '✗ Try again!';
    state.wrongAnswers++;
    saveState(state);

    setTimeout(() => {
      options.forEach(opt => {
        opt.style.pointerEvents = 'auto';
        opt.classList.remove('wrong');
      });
      feedback.classList.remove('show');
    }, 1500);
  }
}

// ============================================
// GLOSSARY FILTER
// ============================================

function filterGlossary() {
  const search = document.getElementById('glossary-search').value.toLowerCase();
  const items = document.querySelectorAll('.glossary-item');

  items.forEach(item => {
    const term = item.getAttribute('data-term').toLowerCase();
    // Only search by title (data-term), not full text content
    item.style.display = term.includes(search) ? 'block' : 'none';
  });
}

// ============================================
// UTILITIES
// ============================================

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toLocaleString();
}

// ============================================
// LEADERBOARD
// ============================================

function updateLeaderboard() {
  const state = getState();
  const leaderboardData = [
    { name: 'diamond_hands.sol', xp: 1250, you: false },
    { name: 'fire_believer.sol', xp: 1100, you: false },
    { name: 'burn_master.sol', xp: 950, you: false },
    { name: 'asdf_fan.sol', xp: 875, you: false },
    { name: 'You', xp: state.totalXP, you: true },
  ];

  leaderboardData.sort((a, b) => b.xp - a.xp);

  const container = document.getElementById('leaderboard-list');
  if (!container) return; // Element not found, skip
  // Security: Use DOM API instead of innerHTML to prevent XSS
  container.textContent = '';
  leaderboardData.slice(0, 5).forEach((entry, index) => {
    const rankClass =
      index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'normal';

    const item = document.createElement('div');
    item.className = 'leaderboard-item' + (entry.you ? ' you' : '');

    const rank = document.createElement('div');
    rank.className = 'leaderboard-rank ' + rankClass;
    rank.textContent = index + 1;

    const name = document.createElement('div');
    name.className = 'leaderboard-name';
    name.textContent = entry.you ? '🔥 You' : entry.name;

    const xp = document.createElement('div');
    xp.className = 'leaderboard-xp';
    xp.textContent = entry.xp + ' XP';

    item.appendChild(rank);
    item.appendChild(name);
    item.appendChild(xp);
    container.appendChild(item);
  });
}

// ============================================
// SOCIAL SHARING
// ============================================

function shareCompletion() {
  const state = getState();
  const text = `🔥 I just completed the ASDF Learning Path and earned ${state.badges.length} badges with ${state.totalXP} XP!\n\nLearn about the Optimistic Burn Protocol:\n`;
  const url = window.location.href;
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

// ============================================
// MINI-GAMES SYSTEM
// ============================================

const GAMES_STORAGE_KEY = 'asdf_games_v1';

// Security: Validate game state schema to prevent tampering
function validateGameState(data, defaultState) {
  if (typeof data !== 'object' || data === null) return false;
  // Validate highScores
  if (typeof data.highScores !== 'object' || data.highScores === null) return false;
  const validScoreKeys = Object.keys(defaultState.highScores);
  for (const key of validScoreKeys) {
    if (
      typeof data.highScores[key] !== 'number' ||
      data.highScores[key] < 0 ||
      data.highScores[key] > 1e9
    ) {
      return false;
    }
  }
  // Validate numeric fields with reasonable limits
  if (typeof data.totalClicks !== 'number' || data.totalClicks < 0 || data.totalClicks > 1e12) {
    return false;
  }
  if (typeof data.clickerPower !== 'number' || data.clickerPower < 1 || data.clickerPower > 1000) {
    return false;
  }
  if (typeof data.clickerMulti !== 'number' || data.clickerMulti < 1 || data.clickerMulti > 100) {
    return false;
  }
  if (typeof data.hasAuto !== 'boolean') return false;
  if (
    typeof data.dailyXPEarned !== 'number' ||
    data.dailyXPEarned < 0 ||
    data.dailyXPEarned > 10000
  ) {
    return false;
  }
  if (typeof data.streak !== 'number' || data.streak < 0 || data.streak > 1000) return false;
  return true;
}

function getGameState() {
  const defaultState = {
    highScores: {
      catcher: 0,
      sequence: 0,
      match: 999,
      clicker: 0,
      fighter: 0,
      racer: 0,
      blaster: 0,
      defense: 0,
      stacker: 0,
    },
    totalClicks: 0,
    clickerPower: 1,
    clickerMulti: 1,
    hasAuto: false,
    dailyXPEarned: 0,
    lastPlayDate: null,
    streak: 0,
  };
  try {
    const saved = localStorage.getItem(GAMES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults for new properties
      const merged = {
        ...defaultState,
        ...parsed,
        highScores: { ...defaultState.highScores, ...parsed.highScores },
      };
      // Validate schema before returning
      if (validateGameState(merged, defaultState)) {
        return merged;
      }
      console.warn('Invalid game state schema, resetting to default');
      localStorage.removeItem(GAMES_STORAGE_KEY);
      return defaultState;
    }
    return defaultState;
  } catch (e) {
    return defaultState;
  }
}

function saveGameState(state) {
  try {
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* ignore */
  }
}

function openGame(gameId) {
  document.getElementById('game-' + gameId).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeGame(gameId) {
  document.getElementById('game-' + gameId).classList.remove('active');
  document.body.style.overflow = '';
  // Reset game states
  stopGameById(gameId);
}

function stopGameById(gameId) {
  if (gameId === 'catcher') stopCatcher();
  if (gameId === 'sequence') stopSequence();
  if (gameId === 'match') stopMatch();
  if (gameId === 'fighter') {
    fighterActive = false;
    clearInterval(fighterInterval);
    document.removeEventListener('keydown', fighterKeyHandler);
    document.removeEventListener('keyup', fighterKeyUpHandler);
    const a = document.getElementById('fighter-arena');
    if (a) a.removeEventListener('mousedown', fighterMouseHandler);
  }
  if (gameId === 'racer') {
    racerActive = false;
    clearInterval(racerInterval);
    clearInterval(racerSpawnInterval);
    clearInterval(racerMoveInterval);
    racerMoveInterval = null;
    document.removeEventListener('keydown', racerKeyDown);
    document.removeEventListener('keyup', racerKeyUp);
  }
  if (gameId === 'blaster') {
    blasterActive = false;
    clearInterval(blasterSpawnInterval);
  }
  if (gameId === 'defense') {
    defenseActive = false;
    defensePrepPhase = false;
    clearInterval(defenseInterval);
    clearInterval(defensePrepTimer);
  }
  if (gameId === 'stacker') {
    stackerActive = false;
    clearInterval(stackerInterval);
    document.removeEventListener('keydown', stackerKeyHandler);
  }
}

function resetGame(gameId) {
  // Stop current game
  stopGameById(gameId);

  // Reset UI and start fresh
  switch (gameId) {
    case 'catcher':
      document.querySelectorAll('.falling-token').forEach(t => t.remove());
      document.getElementById('catcher-start').style.display = 'block';
      document.getElementById('catcher-start').textContent = 'START GAME';
      document.getElementById('catcher-score').textContent = '0';
      document.getElementById('catcher-time').textContent = '30';
      break;
    case 'sequence':
      document.getElementById('sequence-start').style.display = 'block';
      document.getElementById('sequence-start').textContent = 'START GAME';
      document.getElementById('sequence-level').textContent = '1';
      document.getElementById('sequence-score').textContent = '0';
      document.getElementById('sequence-display').textContent = 'Press START to begin';
      break;
    case 'match':
      document.getElementById('match-start').style.display = 'block';
      document.getElementById('match-start').textContent = 'START GAME';
      document.getElementById('match-pairs').textContent = '0/8';
      document.getElementById('match-time').textContent = '0:00';
      document.getElementById('match-grid').innerHTML = '';
      break;
    case 'clicker': {
      // Clicker - refresh display from saved state
      document.querySelectorAll('.click-effect').forEach(e => e.remove());
      initClicker();
      // Flash effect to show refresh happened
      const clickerBtn = document.getElementById('clicker-btn');
      if (clickerBtn) {
        clickerBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
          clickerBtn.style.transform = '';
        }, 200);
      }
      break;
    }
    case 'fighter':
      document.querySelectorAll('.fighter-attack').forEach(a => a.remove());
      document.getElementById('fighter-start').style.display = 'block';
      document.getElementById('fighter-start').textContent = 'START FIGHT';
      document.getElementById('fighter-wave').textContent = '1';
      document.getElementById('fighter-combo').textContent = '0';
      document.getElementById('fighter-player-health').style.width = '100%';
      document.getElementById('fighter-enemy-health').style.width = '100%';
      break;
    case 'racer':
      racerMoveDir = 0;
      racerCarPos = 50;
      document.querySelectorAll('.racer-obstacle, .racer-coin').forEach(o => o.remove());
      document.getElementById('racer-start').style.display = 'block';
      document.getElementById('racer-start').textContent = 'START RACE';
      document.getElementById('racer-distance').textContent = '0m';
      document.getElementById('racer-coins').textContent = '0';
      document.getElementById('racer-speed').textContent = '0 km/h';
      document.getElementById('racer-car').style.left = 'calc(50% - 20px)';
      break;
    case 'blaster':
      document.querySelectorAll('.blaster-target').forEach(t => t.remove());
      document.getElementById('blaster-start').style.display = 'block';
      document.getElementById('blaster-start').textContent = 'START BLASTING';
      document.getElementById('blaster-score').textContent = '0';
      document.getElementById('blaster-wave').textContent = '1';
      document.getElementById('blaster-wave-display').textContent = '1';
      break;
    case 'defense':
      document
        .querySelectorAll('.defense-enemy, .defense-projectile, .damage-number')
        .forEach(e => e.remove());
      defenseGrid.fill(null);
      defenseTowers = [];
      defenseEnemies = [];
      initDefenseField();
      document.getElementById('defense-start').style.display = 'block';
      document.getElementById('defense-start').textContent = 'START DEFENSE';
      document.getElementById('defense-start').disabled = false;
      document.getElementById('defense-wave').textContent = '1';
      document.getElementById('defense-gold').textContent = '150';
      safeInnerHTML(
        document.getElementById('defense-lives'),
        '<span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span>'
      );
      break;
    case 'stacker': {
      const viewport = document.getElementById('stacker-viewport');
      if (viewport) {
        viewport.style.transform = '';
        document
          .querySelectorAll('.stacker-block, .stacker-moving, .stacker-perfect-text')
          .forEach(b => b.remove());
      }
      document.getElementById('stacker-start').style.display = 'block';
      document.getElementById('stacker-start').textContent = 'START STACKING';
      document.getElementById('stacker-height').textContent = '0';
      document.getElementById('stacker-height-display').textContent = '0';
      document.getElementById('stacker-score').textContent = '0';
      break;
    }
  }
}

function updateHighScores() {
  const gs = getGameState();
  // Sidebar scores
  document.getElementById('hs-catcher').textContent = gs.highScores.catcher;
  document.getElementById('hs-sequence').textContent = 'Lvl ' + gs.highScores.sequence;
  document.getElementById('hs-match').textContent =
    gs.highScores.match === 999 ? '--' : gs.highScores.match + 's';
  document.getElementById('hs-clicker').textContent = formatNumber(gs.totalClicks);
  document.getElementById('hs-fighter').textContent = 'Wave ' + gs.highScores.fighter;
  document.getElementById('hs-racer').textContent = gs.highScores.racer + 'm';
  document.getElementById('hs-blaster').textContent = 'Wave ' + gs.highScores.blaster;
  document.getElementById('hs-defense').textContent = 'Wave ' + gs.highScores.defense;
  document.getElementById('hs-stacker').textContent = gs.highScores.stacker;
  // Play section scores
  const updates = {
    'play-hs-catcher': gs.highScores.catcher,
    'play-hs-sequence': gs.highScores.sequence,
    'play-hs-match': gs.highScores.match === 999 ? '--' : gs.highScores.match + 's',
    'play-hs-clicker': formatNumber(gs.totalClicks),
    'play-hs-fighter': gs.highScores.fighter,
    'play-hs-racer': gs.highScores.racer,
    'play-hs-blaster': gs.highScores.blaster,
    'play-hs-defense': gs.highScores.defense,
    'play-hs-stacker': gs.highScores.stacker,
  };
  for (const [id, value] of Object.entries(updates)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
}

// ============================================
// TOKEN CATCHER GAME
// ============================================

let catcherInterval, catcherTimer, catcherScore, catcherTimeLeft;
let basketPos = 50;
let moveDirection = 0;
let moveInterval = null;
const tokens = ['🔥', '💰', '⭐', '💎', '🪙'];
const scamTokens = ['💀', '🚨', '❌'];

function startCatcher() {
  catcherScore = 0;
  catcherTimeLeft = 30;
  basketPos = 50;
  moveDirection = 0;
  document.getElementById('catcher-score').textContent = '0';
  document.getElementById('catcher-time').textContent = '30';
  document.getElementById('catcher-start').style.display = 'none';

  const basket = document.getElementById('catcher-basket');
  basket.style.left = 'calc(50% - 40px)';

  // Spawn tokens
  catcherInterval = setInterval(spawnToken, 600);

  // Timer
  catcherTimer = setInterval(() => {
    catcherTimeLeft--;
    document.getElementById('catcher-time').textContent = catcherTimeLeft;
    if (catcherTimeLeft <= 0) {
      endCatcher();
    }
  }, 1000);

  // Key controls - continuous movement
  document.addEventListener('keydown', catcherKeyDown);
  document.addEventListener('keyup', catcherKeyUp);
  document.getElementById('catcher-area').addEventListener('touchmove', touchMoveCatcher);
}

function catcherKeyDown(e) {
  if (e.key === 'ArrowLeft' && moveDirection !== -1) {
    moveDirection = -1;
    startContinuousMove();
  } else if (e.key === 'ArrowRight' && moveDirection !== 1) {
    moveDirection = 1;
    startContinuousMove();
  }
}

function catcherKeyUp(e) {
  if (
    (e.key === 'ArrowLeft' && moveDirection === -1) ||
    (e.key === 'ArrowRight' && moveDirection === 1)
  ) {
    moveDirection = 0;
    stopContinuousMove();
  }
}

function startContinuousMove() {
  if (moveInterval) clearInterval(moveInterval);
  // Move immediately on first press
  moveBasket();
  // Then continue moving every 16ms (60fps) for smooth movement
  moveInterval = setInterval(moveBasket, 16);
}

function stopContinuousMove() {
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
}

function moveBasket() {
  const step = 2; // Smaller step for smoother movement at 60fps
  basketPos += moveDirection * step;
  basketPos = Math.max(5, Math.min(95, basketPos));

  const basket = document.getElementById('catcher-basket');
  basket.style.left = `calc(${basketPos}% - 40px)`;
  checkCatch();
}

function spawnToken() {
  const area = document.getElementById('catcher-area');
  const token = document.createElement('div');
  token.className = 'falling-token';

  // 20% chance of scam token
  const isScam = Math.random() < 0.2;
  token.textContent = isScam
    ? scamTokens[Math.floor(Math.random() * scamTokens.length)]
    : tokens[Math.floor(Math.random() * tokens.length)];
  token.dataset.scam = isScam;

  const xPos = Math.random() * (area.offsetWidth - 40);
  token.style.left = xPos + 'px';
  token.style.animationDuration = 2 + Math.random() + 's';

  area.appendChild(token);

  // Check for catch
  token.addEventListener('animationend', () => token.remove());
}

function touchMoveCatcher(e) {
  e.preventDefault();
  const area = document.getElementById('catcher-area');
  const basket = document.getElementById('catcher-basket');
  const touch = e.touches[0];
  const rect = area.getBoundingClientRect();
  basketPos = ((touch.clientX - rect.left) / rect.width) * 100;
  basketPos = Math.max(5, Math.min(95, basketPos));
  basket.style.left = `calc(${basketPos}% - 40px)`;
  checkCatch();
}

function checkCatch() {
  const basket = document.getElementById('catcher-basket');
  const basketRect = basket.getBoundingClientRect();
  const tokens = document.querySelectorAll('.falling-token');

  tokens.forEach(token => {
    const tokenRect = token.getBoundingClientRect();
    if (
      tokenRect.bottom >= basketRect.top &&
      tokenRect.top <= basketRect.bottom &&
      tokenRect.right >= basketRect.left &&
      tokenRect.left <= basketRect.right
    ) {
      if (token.dataset.scam === 'true') {
        catcherScore = Math.max(0, catcherScore - 20);
        showCatchEffect(token, '-20', '#ef4444');
      } else {
        catcherScore += 10;
        showCatchEffect(token, '+10', '#22c55e');
      }
      document.getElementById('catcher-score').textContent = catcherScore;
      token.remove();
    }
  });
}

function showCatchEffect(element, text, color) {
  const effect = document.createElement('div');
  effect.className = 'click-effect';
  effect.textContent = text;
  effect.style.color = color;
  effect.style.left = element.style.left;
  effect.style.top = element.offsetTop + 'px';
  document.getElementById('catcher-area').appendChild(effect);
  setTimeout(() => effect.remove(), 800);
}

function endCatcher() {
  stopCatcher();
  const gs = getGameState();

  if (catcherScore > gs.highScores.catcher) {
    gs.highScores.catcher = catcherScore;
    saveGameState(gs);
  }

  // Award XP
  const xpEarned = Math.min(50, Math.floor(catcherScore / 10) * 5);
  if (xpEarned > 0) addXP(xpEarned);

  // Check badge
  if (catcherScore >= 500) {
    const state = getState();
    if (!state.badges.includes('catcher')) earnBadge('catcher');
  }

  updateHighScores();
  document.getElementById('catcher-start').textContent =
    `Score: ${catcherScore} (+${xpEarned} XP) - PLAY AGAIN`;
  document.getElementById('catcher-start').style.display = 'block';
}

function stopCatcher() {
  clearInterval(catcherInterval);
  clearInterval(catcherTimer);
  stopContinuousMove();
  moveDirection = 0;
  document.removeEventListener('keydown', catcherKeyDown);
  document.removeEventListener('keyup', catcherKeyUp);
  document.querySelectorAll('.falling-token').forEach(t => t.remove());
}

// ============================================
// BURN SEQUENCE GAME (Simon Says)
// ============================================

let sequencePattern = [];
let playerPattern = [];
let sequenceLevel = 1;
let sequenceScore = 0;
let isShowingSequence = false;
let sequenceTimeout;
const steps = ['collect', 'swap', 'burn', 'verify'];

function startSequence() {
  sequenceLevel = 1;
  sequenceScore = 0;
  sequencePattern = [];
  document.getElementById('sequence-level').textContent = '1';
  document.getElementById('sequence-score').textContent = '0';
  document.getElementById('sequence-start').style.display = 'none';
  nextSequenceRound();
}

function nextSequenceRound() {
  playerPattern = [];
  sequencePattern.push(steps[Math.floor(Math.random() * steps.length)]);
  document.getElementById('sequence-display').textContent = 'Watch carefully...';
  isShowingSequence = true;

  setTimeout(() => showSequence(0), 500);
}

function showSequence(index) {
  if (index >= sequencePattern.length) {
    isShowingSequence = false;
    document.getElementById('sequence-display').textContent = 'Your turn! Repeat the sequence';
    return;
  }

  const step = sequencePattern[index];
  const btn = document.querySelector(`.sequence-btn[data-step="${step}"]`);
  btn.classList.add('flash');

  setTimeout(() => {
    btn.classList.remove('flash');
    setTimeout(() => showSequence(index + 1), 300);
  }, 500);
}

function sequenceClick(step) {
  if (isShowingSequence) return;

  const btn = document.querySelector(`.sequence-btn[data-step="${step}"]`);
  btn.classList.add('flash');
  setTimeout(() => btn.classList.remove('flash'), 200);

  playerPattern.push(step);
  const currentIndex = playerPattern.length - 1;

  if (playerPattern[currentIndex] !== sequencePattern[currentIndex]) {
    // Wrong!
    endSequence();
    return;
  }

  if (playerPattern.length === sequencePattern.length) {
    // Correct sequence!
    sequenceScore += sequenceLevel * 10;
    sequenceLevel++;
    document.getElementById('sequence-level').textContent = sequenceLevel;
    document.getElementById('sequence-score').textContent = sequenceScore;
    document.getElementById('sequence-display').textContent = 'Correct! Level ' + sequenceLevel;

    setTimeout(nextSequenceRound, 1000);
  }
}

function endSequence() {
  document.getElementById('sequence-display').textContent = `Game Over! Level ${sequenceLevel}`;

  const gs = getGameState();
  if (sequenceLevel > gs.highScores.sequence) {
    gs.highScores.sequence = sequenceLevel;
    saveGameState(gs);
  }

  // Award XP
  const xpEarned = Math.min(75, sequenceLevel * 5);
  if (xpEarned > 0) addXP(xpEarned);

  // Check badge
  if (sequenceLevel >= 10) {
    const state = getState();
    if (!state.badges.includes('memory')) earnBadge('memory');
  }

  updateHighScores();
  document.getElementById('sequence-start').textContent =
    `Level ${sequenceLevel} (+${xpEarned} XP) - PLAY AGAIN`;
  document.getElementById('sequence-start').style.display = 'block';
}

function stopSequence() {
  clearTimeout(sequenceTimeout);
  sequencePattern = [];
  playerPattern = [];
  isShowingSequence = false;
}

// ============================================
// SPEED MATCH GAME
// ============================================

const matchPairs = [
  { term: '🔥', meaning: 'Burn' },
  { term: '💰', meaning: 'Fees' },
  { term: '🔄', meaning: 'Cycle' },
  { term: '🤖', meaning: 'Daemon' },
  { term: '🏦', meaning: 'Treasury' },
  { term: '💱', meaning: 'Swap' },
  { term: '📉', meaning: 'Deflation' },
  { term: '🔍', meaning: 'Verify' },
];

let matchCards = [];
let flippedCards = [];
let matchedPairs = 0;
let matchStartTime;
let matchTimerInterval;

function startMatch() {
  matchedPairs = 0;
  flippedCards = [];
  document.getElementById('match-pairs').textContent = '0/8';
  document.getElementById('match-time').textContent = '0:00';
  document.getElementById('match-start').style.display = 'none';

  // Create cards array (terms + meanings)
  matchCards = [];
  matchPairs.forEach((pair, i) => {
    matchCards.push({ id: i, type: 'term', content: pair.term, pairId: i });
    matchCards.push({ id: i + 8, type: 'meaning', content: pair.meaning, pairId: i });
  });

  // Shuffle
  matchCards.sort(() => Math.random() - 0.5);

  // Render - Security: Use DOM API instead of innerHTML to prevent XSS
  const grid = document.getElementById('match-grid');
  grid.textContent = '';
  matchCards.forEach((card, idx) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'match-card';
    cardDiv.dataset.index = idx;
    cardDiv.dataset.pair = card.pairId;
    cardDiv.onclick = () => flipCard(idx);

    const front = document.createElement('span');
    front.className = 'card-front';
    front.textContent = '?';

    const back = document.createElement('span');
    back.className = 'card-back';
    back.textContent = card.content;

    cardDiv.appendChild(front);
    cardDiv.appendChild(back);
    grid.appendChild(cardDiv);
  });

  matchStartTime = Date.now();
  matchTimerInterval = setInterval(updateMatchTimer, 100);
}

function updateMatchTimer() {
  const elapsed = Math.floor((Date.now() - matchStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  document.getElementById('match-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function flipCard(index) {
  const card = document.querySelector(`.match-card[data-index="${index}"]`);
  if (
    card.classList.contains('flipped') ||
    card.classList.contains('matched') ||
    flippedCards.length >= 2
  ) {
    return;
  }

  card.classList.add('flipped');
  flippedCards.push({ index, pairId: matchCards[index].pairId, element: card });

  if (flippedCards.length === 2) {
    setTimeout(checkMatch, 500);
  }
}

function checkMatch() {
  const [card1, card2] = flippedCards;

  if (card1.pairId === card2.pairId) {
    // Match!
    card1.element.classList.add('matched');
    card2.element.classList.add('matched');
    matchedPairs++;
    document.getElementById('match-pairs').textContent = `${matchedPairs}/8`;

    if (matchedPairs === 8) {
      endMatch();
    }
  } else {
    // No match
    card1.element.classList.remove('flipped');
    card2.element.classList.remove('flipped');
  }

  flippedCards = [];
}

function endMatch() {
  clearInterval(matchTimerInterval);
  const elapsed = Math.floor((Date.now() - matchStartTime) / 1000);

  const gs = getGameState();
  if (elapsed < gs.highScores.match) {
    gs.highScores.match = elapsed;
    saveGameState(gs);
  }

  // Award XP based on time
  let xpEarned = 60;
  if (elapsed > 30) xpEarned = 40;
  if (elapsed > 60) xpEarned = 20;
  if (elapsed > 90) xpEarned = 10;
  addXP(xpEarned);

  updateHighScores();
  document.getElementById('match-start').textContent =
    `Time: ${elapsed}s (+${xpEarned} XP) - PLAY AGAIN`;
  document.getElementById('match-start').style.display = 'block';
}

function stopMatch() {
  clearInterval(matchTimerInterval);
}

// ============================================
// BURN CLICKER GAME
// ============================================

let clickerCount = 0;
let clickerPower = 1;
let clickerMulti = 1;
let hasAutoClicker = false;
let autoClickerInterval;
let frenzyActive = false;
let clickerXPAwarded = 0;

function initClicker() {
  const gs = getGameState();
  clickerCount = gs.totalClicks || 0;
  clickerPower = gs.clickerPower || 1;
  clickerMulti = gs.clickerMulti || 1;
  hasAutoClicker = gs.hasAuto || false;

  document.getElementById('clicker-count').textContent = formatNumber(clickerCount);
  updateUpgradeButtons();

  if (hasAutoClicker && !autoClickerInterval) {
    autoClickerInterval = setInterval(() => {
      addClicks(clickerPower * clickerMulti);
    }, 1000);
  }
}

function clickBurn(e) {
  const power = clickerPower * clickerMulti * (frenzyActive ? 5 : 1);
  addClicks(power);

  // Click effect
  const effect = document.createElement('div');
  effect.className = 'click-effect';
  effect.textContent = '+' + power;
  effect.style.left = (e.offsetX || 75) + 'px';
  effect.style.top = (e.offsetY || 75) + 'px';
  document.getElementById('clicker-btn').appendChild(effect);
  setTimeout(() => effect.remove(), 800);
}

function addClicks(amount) {
  clickerCount += amount;
  document.getElementById('clicker-count').textContent = formatNumber(clickerCount);

  const gs = getGameState();
  gs.totalClicks = clickerCount;
  saveGameState(gs);

  updateUpgradeButtons();

  // Award XP every 100 burns
  const xpMilestones = Math.floor(clickerCount / 100);
  if (xpMilestones > clickerXPAwarded && clickerXPAwarded < 10) {
    addXP(10);
    clickerXPAwarded = xpMilestones;
  }

  updateHighScores();
}

function buyUpgrade(type) {
  const gs = getGameState();

  if (type === 'power' && clickerCount >= 50) {
    clickerCount -= 50;
    clickerPower++;
    gs.clickerPower = clickerPower;
  } else if (type === 'auto' && clickerCount >= 200 && !hasAutoClicker) {
    clickerCount -= 200;
    hasAutoClicker = true;
    gs.hasAuto = true;
    autoClickerInterval = setInterval(() => {
      addClicks(clickerPower * clickerMulti);
    }, 1000);
  } else if (type === 'multi' && clickerCount >= 500 && clickerMulti < 4) {
    clickerCount -= 500;
    clickerMulti *= 2;
    gs.clickerMulti = clickerMulti;
  } else if (type === 'frenzy' && clickerCount >= 1000 && !frenzyActive) {
    clickerCount -= 1000;
    frenzyActive = true;
    document.getElementById('clicker-btn').style.background =
      'radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b, #d97706)';
    setTimeout(() => {
      frenzyActive = false;
      document.getElementById('clicker-btn').style.background = '';
    }, 10000);
  }

  gs.totalClicks = clickerCount;
  saveGameState(gs);
  document.getElementById('clicker-count').textContent = formatNumber(clickerCount);
  updateUpgradeButtons();
}

function updateUpgradeButtons() {
  document.getElementById('upgrade-power').disabled = clickerCount < 50;
  document.getElementById('upgrade-auto').disabled = clickerCount < 200 || hasAutoClicker;
  document.getElementById('upgrade-multi').disabled = clickerCount < 500 || clickerMulti >= 4;
  document.getElementById('upgrade-frenzy').disabled = clickerCount < 1000 || frenzyActive;

  if (hasAutoClicker) {
    document.querySelector('#upgrade-auto .up-name').textContent = 'Auto Burner ✓';
  }
  if (clickerMulti >= 4) {
    document.querySelector('#upgrade-multi .up-name').textContent = `${clickerMulti}x MAX`;
  }
}

// ============================================
// BURN FIGHTER GAME (2D Combat)
// ============================================

let fighterActive = false;
let fighterWave = 1;
let fighterCombo = 0;
let fighterPlayerHP = 100;
let fighterEnemyHP = 100;
let fighterPlayerPos = 50;
let fighterEnemyPos = 50;
let fighterSpecialReady = true;
let fighterJumping = false;
let fighterBlocking = false;
let fighterFacing = 'right';
let fighterInterval;

function startFighter() {
  fighterActive = true;
  fighterWave = 1;
  fighterCombo = 0;
  fighterPlayerHP = 100;
  fighterEnemyHP = 100;
  fighterPlayerPos = 50;
  fighterEnemyPos = 50;
  fighterSpecialReady = true;
  fighterJumping = false;
  fighterBlocking = false;
  fighterFacing = 'right';

  document.getElementById('fighter-wave').textContent = fighterWave;
  document.getElementById('fighter-combo').textContent = fighterCombo;
  document.getElementById('fighter-player-health').style.width = '100%';
  document.getElementById('fighter-enemy-health').style.width = '100%';
  document.getElementById('fighter-start').style.display = 'none';

  const player = document.getElementById('fighter-player');
  const enemy = document.getElementById('fighter-enemy');
  player.textContent = '🐕';
  player.style.left = '50px';
  player.style.transform = 'scaleX(1)';
  enemy.textContent = '🐱';
  enemy.style.right = '50px';
  enemy.style.transform = 'scaleX(-1)';

  document.addEventListener('keydown', fighterKeyHandler);
  document.addEventListener('keyup', fighterKeyUpHandler);

  // Mouse controls
  const arena = document.getElementById('fighter-arena');
  arena.addEventListener('mousedown', fighterMouseHandler);
  arena.addEventListener('contextmenu', e => e.preventDefault());

  // Enemy AI
  fighterInterval = setInterval(fighterEnemyAI, 1500);
}

function fighterKeyHandler(e) {
  if (!fighterActive) return;
  // AZERTY controls: Z=jump, Q=left, D=right, F=block
  if (e.key === 'q' || e.key === 'Q') fighterMove(-1);
  if (e.key === 'd' || e.key === 'D') fighterMove(1);
  if (e.key === 'z' || e.key === 'Z') fighterJump();
  if (e.key === 'f' || e.key === 'F') fighterBlock();
}

function fighterKeyUpHandler(e) {
  if (!fighterActive) return;
  if (e.key === 'f' || e.key === 'F') {
    fighterBlocking = false;
    document.getElementById('fighter-player').classList.remove('blocking');
  }
}

function fighterMouseHandler(e) {
  if (!fighterActive) return;
  e.preventDefault();
  // Update facing before attack to ensure correct direction
  fighterUpdateFacing();
  if (e.button === 0) {
    // Left click = attack in facing direction
    fighterAttack(fighterFacing);
  } else if (e.button === 2) {
    // Right click = special
    fighterSpecial();
  }
}

function fighterMove(dir) {
  if (!fighterActive || fighterBlocking) return;
  fighterPlayerPos = Math.max(20, Math.min(350, fighterPlayerPos + dir * 30));
  const player = document.getElementById('fighter-player');
  player.style.left = fighterPlayerPos + 'px';

  // Update facing direction based on enemy position
  fighterUpdateFacing();
}

function fighterUpdateFacing() {
  const player = document.getElementById('fighter-player');
  const enemy = document.getElementById('fighter-enemy');
  const enemyX = 500 - fighterEnemyPos;

  // Player faces enemy
  if (fighterPlayerPos < enemyX) {
    fighterFacing = 'right';
    player.style.transform = 'scaleX(1)';
  } else {
    fighterFacing = 'left';
    player.style.transform = 'scaleX(-1)';
  }

  // Enemy faces player
  if (enemyX > fighterPlayerPos) {
    enemy.style.transform = 'scaleX(-1)';
  } else {
    enemy.style.transform = 'scaleX(1)';
  }
}

function fighterJump() {
  if (!fighterActive || fighterJumping || fighterBlocking) return;
  fighterJumping = true;
  const player = document.getElementById('fighter-player');
  player.classList.add('jumping');
  setTimeout(() => {
    player.classList.remove('jumping');
    fighterJumping = false;
  }, 500);
}

function fighterBlock() {
  if (!fighterActive || fighterJumping) return;
  fighterBlocking = true;
  document.getElementById('fighter-player').classList.add('blocking');
}

function fighterAttack(direction = 'right') {
  if (!fighterActive || fighterBlocking) return;

  // Calculate distance between player and enemy
  const playerCenterX = fighterPlayerPos + 20;
  const enemyCenterX = 500 - fighterEnemyPos - 20;
  const dist = Math.abs(playerCenterX - enemyCenterX);

  // Show attack effect in facing direction (toward enemy)
  const attack = document.createElement('div');
  attack.className = 'fighter-attack ' + direction;
  attack.textContent = '💥';

  // Position attack between player and enemy
  if (direction === 'left') {
    attack.style.left = fighterPlayerPos - 25 + 'px';
  } else {
    attack.style.left = fighterPlayerPos + 45 + 'px';
  }
  attack.style.bottom = fighterJumping ? '110px' : '55px';

  document.getElementById('fighter-arena').appendChild(attack);
  setTimeout(() => attack.remove(), 300);

  // Simple hit detection - player always faces enemy, so just check range
  const hitRange = 200;
  if (dist < hitRange) {
    const damage = 12 + Math.floor(Math.random() * 10) + (fighterJumping ? 5 : 0);
    fighterEnemyHP = Math.max(0, fighterEnemyHP - damage);
    fighterCombo++;
    document.getElementById('fighter-combo').textContent = fighterCombo;
    updateFighterHealth();

    // Show hit effect on enemy
    const hitMarker = document.createElement('div');
    hitMarker.className = 'fighter-attack';
    hitMarker.textContent = '💢';
    hitMarker.style.left = enemyCenterX + 'px';
    hitMarker.style.bottom = '75px';
    document.getElementById('fighter-arena').appendChild(hitMarker);
    setTimeout(() => hitMarker.remove(), 200);

    if (fighterEnemyHP <= 0) {
      fighterNextWave();
    }
  }
}

function fighterSpecial() {
  if (!fighterActive || !fighterSpecialReady || fighterBlocking) return;
  fighterSpecialReady = false;

  // Calculate distance
  const playerCenterX = fighterPlayerPos + 20;
  const enemyCenterX = 500 - fighterEnemyPos - 20;
  const dist = Math.abs(playerCenterX - enemyCenterX);

  const attack = document.createElement('div');
  attack.className = 'fighter-attack ' + fighterFacing;
  attack.textContent = '🔥';

  // Position special attack in facing direction
  if (fighterFacing === 'left') {
    attack.style.left = fighterPlayerPos - 35 + 'px';
  } else {
    attack.style.left = fighterPlayerPos + 50 + 'px';
  }
  attack.style.bottom = fighterJumping ? '110px' : '60px';
  attack.style.fontSize = '48px';
  document.getElementById('fighter-arena').appendChild(attack);
  setTimeout(() => attack.remove(), 400);

  // Special has longer range (250px)
  if (dist < 250) {
    const damage = 25 + Math.floor(Math.random() * 15);
    fighterEnemyHP = Math.max(0, fighterEnemyHP - damage);
    fighterCombo += 3;
    document.getElementById('fighter-combo').textContent = fighterCombo;
    updateFighterHealth();

    // Show hit effect on enemy
    const hitMarker = document.createElement('div');
    hitMarker.className = 'fighter-attack';
    hitMarker.textContent = '💥';
    hitMarker.style.left = enemyCenterX + 'px';
    hitMarker.style.bottom = '75px';
    hitMarker.style.fontSize = '32px';
    document.getElementById('fighter-arena').appendChild(hitMarker);
    setTimeout(() => hitMarker.remove(), 300);

    if (fighterEnemyHP <= 0) {
      fighterNextWave();
    }
  }

  setTimeout(() => {
    fighterSpecialReady = true;
  }, 3000);
}

function fighterEnemyAI() {
  if (!fighterActive) return;

  // Move towards player
  const playerX = fighterPlayerPos;
  const enemyX = 500 - fighterEnemyPos;
  if (playerX < enemyX - 100) {
    fighterEnemyPos = Math.min(450, fighterEnemyPos + 25);
  } else if (playerX > enemyX + 100) {
    fighterEnemyPos = Math.max(50, fighterEnemyPos - 25);
  }
  document.getElementById('fighter-enemy').style.right = fighterEnemyPos + 'px';

  // Update facing after enemy moves
  fighterUpdateFacing();

  // Attack if close
  if (Math.abs(playerX - enemyX) < 120) {
    // Show enemy attack effect
    const attack = document.createElement('div');
    attack.className = 'fighter-attack left';
    attack.textContent = '😾';
    attack.style.right = fighterEnemyPos + 'px';
    attack.style.bottom = '60px';
    document.getElementById('fighter-arena').appendChild(attack);
    setTimeout(() => attack.remove(), 300);

    // Check if player is blocking
    if (fighterBlocking) {
      // Blocked! Reduced damage
      const damage = Math.floor((5 + fighterWave * 2) * 0.2);
      fighterPlayerHP = Math.max(0, fighterPlayerHP - damage);
    } else if (fighterJumping) {
      // Dodged by jumping!
    } else {
      const damage = 5 + fighterWave * 2;
      fighterPlayerHP = Math.max(0, fighterPlayerHP - damage);
      fighterCombo = 0;
      document.getElementById('fighter-combo').textContent = fighterCombo;
    }
    updateFighterHealth();

    if (fighterPlayerHP <= 0) {
      endFighter();
    }
  }
}

function updateFighterHealth() {
  const playerBar = document.getElementById('fighter-player-health');
  const enemyBar = document.getElementById('fighter-enemy-health');
  playerBar.style.width = fighterPlayerHP + '%';
  enemyBar.style.width = fighterEnemyHP + '%';
  if (fighterPlayerHP < 30) playerBar.classList.add('low');
  else playerBar.classList.remove('low');
}

function fighterNextWave() {
  fighterWave++;
  fighterEnemyHP = 100 + fighterWave * 20;
  fighterEnemyPos = 50; // Reset to right side (style.right = 50px)
  document.getElementById('fighter-wave').textContent = fighterWave;
  document.getElementById('fighter-enemy-health').style.width = '100%';

  // Reset enemy position and appearance
  const enemy = document.getElementById('fighter-enemy');
  enemy.style.right = fighterEnemyPos + 'px';
  enemy.style.transform = 'scaleX(-1)'; // Face left (towards player)

  // Change enemy appearance - all cats!
  const enemies = ['🐱', '😺', '😸', '😼', '🙀'];
  enemy.textContent = enemies[fighterWave % enemies.length];

  // Update facing directions
  fighterUpdateFacing();
}

function endFighter() {
  fighterActive = false;
  clearInterval(fighterInterval);
  document.removeEventListener('keydown', fighterKeyHandler);
  document.removeEventListener('keyup', fighterKeyUpHandler);
  const arena = document.getElementById('fighter-arena');
  if (arena) arena.removeEventListener('mousedown', fighterMouseHandler);

  const gs = getGameState();
  if (fighterWave > gs.highScores.fighter) {
    gs.highScores.fighter = fighterWave;
    saveGameState(gs);
  }

  const xpEarned = Math.min(80, fighterWave * 10 + fighterCombo);
  if (xpEarned > 0) addXP(xpEarned);

  updateHighScores();
  document.getElementById('fighter-start').textContent =
    `Wave ${fighterWave} (+${xpEarned} XP) - FIGHT AGAIN`;
  document.getElementById('fighter-start').style.display = 'block';
}

// ============================================
// TOKEN RACER GAME (Car Game)
// ============================================

let racerActive = false;
let racerDistance = 0;
let racerCoins = 0;
let racerSpeed = 0;
let racerCarPos = 50;
let racerInterval;
let racerSpawnInterval;
let racerMoveDir = 0;
let racerMoveInterval;
let racerSpawnRate = 800;

function startRacer() {
  racerActive = true;
  racerDistance = 0;
  racerCoins = 0;
  racerSpeed = 60;
  racerCarPos = 50;
  racerMoveDir = 0;
  racerSpawnRate = 800;

  document.getElementById('racer-distance').textContent = '0m';
  document.getElementById('racer-coins').textContent = '0';
  document.getElementById('racer-speed').textContent = '60 km/h';
  document.getElementById('racer-car').style.left = 'calc(50% - 20px)';
  document.getElementById('racer-start').style.display = 'none';

  // Clear existing obstacles
  document.querySelectorAll('.racer-obstacle, .racer-coin').forEach(e => e.remove());

  document.addEventListener('keydown', racerKeyDown);
  document.addEventListener('keyup', racerKeyUp);

  racerInterval = setInterval(racerUpdate, 50);
  racerSpawnInterval = setInterval(racerSpawn, racerSpawnRate);
}

function racerKeyDown(e) {
  if (!racerActive) return;
  if (e.key === 'ArrowLeft' && racerMoveDir !== -1) {
    racerMoveDir = -1;
    if (!racerMoveInterval) racerMoveInterval = setInterval(racerMoveCar, 16);
  }
  if (e.key === 'ArrowRight' && racerMoveDir !== 1) {
    racerMoveDir = 1;
    if (!racerMoveInterval) racerMoveInterval = setInterval(racerMoveCar, 16);
  }
}

function racerKeyUp(e) {
  if (
    (e.key === 'ArrowLeft' && racerMoveDir === -1) ||
    (e.key === 'ArrowRight' && racerMoveDir === 1)
  ) {
    racerMoveDir = 0;
    clearInterval(racerMoveInterval);
    racerMoveInterval = null;
  }
}

function racerMoveCar() {
  const moveSpeed = 1.5 + racerSpeed / 100;
  // Keep car within road boundaries (road is 200px wide, centered)
  // Road spans roughly 35% to 65% of the container
  racerCarPos = Math.max(36, Math.min(64, racerCarPos + racerMoveDir * moveSpeed));
  document.getElementById('racer-car').style.left = `calc(${racerCarPos}% - 20px)`;
}

function racerUpdate() {
  if (!racerActive) return;

  // Progressive speed increase (more noticeable acceleration)
  racerSpeed = Math.min(400, racerSpeed + 0.4);
  racerDistance += Math.floor(racerSpeed / 20);

  document.getElementById('racer-distance').textContent = racerDistance + 'm';
  document.getElementById('racer-speed').textContent = Math.floor(racerSpeed) + ' km/h';

  // Update spawn rate based on speed
  const newSpawnRate = Math.max(300, 800 - racerSpeed * 2);
  if (Math.abs(newSpawnRate - racerSpawnRate) > 50) {
    racerSpawnRate = newSpawnRate;
    clearInterval(racerSpawnInterval);
    racerSpawnInterval = setInterval(racerSpawn, racerSpawnRate);
  }

  // Check collisions
  racerCheckCollisions();
}

function racerSpawn() {
  if (!racerActive) return;
  const track = document.getElementById('racer-track');
  const isObstacle = Math.random() < 0.35;
  const item = document.createElement('div');
  item.className = isObstacle ? 'racer-obstacle' : 'racer-coin';
  item.textContent = isObstacle ? (Math.random() < 0.5 ? '🚨' : '💀') : '🪙';
  item.dataset.type = isObstacle ? 'obstacle' : 'coin';

  const xPos = 30 + Math.random() * 40;
  item.style.left = `calc(${xPos}% - 14px)`;

  // Faster animation as speed increases
  const animDuration = Math.max(0.6, 2.5 - racerSpeed / 120);
  item.style.animationDuration = animDuration + 's';

  track.appendChild(item);
  item.addEventListener('animationend', () => item.remove());
}

function racerCheckCollisions() {
  const car = document.getElementById('racer-car');
  const carRect = car.getBoundingClientRect();

  // Shrink hitbox by margin (10px on each side)
  const margin = 10;
  const carHitbox = {
    left: carRect.left + margin,
    right: carRect.right - margin,
    top: carRect.top + margin,
    bottom: carRect.bottom - margin,
  };

  document.querySelectorAll('.racer-obstacle, .racer-coin').forEach(item => {
    const itemRect = item.getBoundingClientRect();
    // Also shrink obstacle hitbox
    const itemMargin = item.dataset.type === 'obstacle' ? 8 : 0;
    const itemHitbox = {
      left: itemRect.left + itemMargin,
      right: itemRect.right - itemMargin,
      top: itemRect.top + itemMargin,
      bottom: itemRect.bottom - itemMargin,
    };

    if (
      carHitbox.left < itemHitbox.right &&
      carHitbox.right > itemHitbox.left &&
      carHitbox.top < itemHitbox.bottom &&
      carHitbox.bottom > itemHitbox.top
    ) {
      if (item.dataset.type === 'obstacle') {
        endRacer();
      } else {
        racerCoins += 10;
        document.getElementById('racer-coins').textContent = racerCoins;
        item.remove();
      }
    }
  });
}

function endRacer() {
  racerActive = false;
  clearInterval(racerInterval);
  clearInterval(racerSpawnInterval);
  clearInterval(racerMoveInterval);
  racerMoveInterval = null;
  document.removeEventListener('keydown', racerKeyDown);
  document.removeEventListener('keyup', racerKeyUp);

  const gs = getGameState();
  if (racerDistance > gs.highScores.racer) {
    gs.highScores.racer = racerDistance;
    saveGameState(gs);
  }

  const xpEarned = Math.min(70, Math.floor(racerDistance / 100) * 5 + racerCoins / 2);
  if (xpEarned > 0) addXP(xpEarned);

  updateHighScores();
  document.getElementById('racer-start').textContent =
    `${racerDistance}m (+${Math.floor(xpEarned)} XP) - RACE AGAIN`;
  document.getElementById('racer-start').style.display = 'block';
}

// ============================================
// SCAM BLASTER GAME (Shooting)
// ============================================

let blasterActive = false;
let blasterScore = 0;
let blasterWave = 1;
let blasterTargets = 0;
let blasterMisses = 0;
let blasterSpawnInterval;

function startBlaster() {
  blasterActive = true;
  blasterScore = 0;
  blasterWave = 1;
  blasterTargets = 0;
  blasterMisses = 0;
  blasterMultiplier = 1;

  document.getElementById('blaster-score').textContent = '0';
  document.getElementById('blaster-wave').textContent = '1';
  document.getElementById('blaster-wave-display').textContent = '1';
  document.getElementById('blaster-start').style.display = 'none';

  document.querySelectorAll('.blaster-target').forEach(t => t.remove());

  blasterSpawnTargets();
  blasterSpawnInterval = setInterval(blasterCheckWave, 500);
}

let blasterMultiplier = 1;

function blasterSpawnTargets() {
  const arena = document.getElementById('blaster-arena');
  const count = 3 + blasterWave * 2;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (!blasterActive) return;
      const target = document.createElement('div');
      target.className = 'blaster-target';

      // 3 types: skull (danger), flame (multiplier), rug (points)
      const rand = Math.random();
      let type;
      if (rand < 0.25) {
        type = 'skull';
        target.textContent = '💀';
      } else if (rand < 0.45) {
        type = 'flame';
        target.textContent = '🔥';
      } else {
        type = 'rug';
        target.textContent = '🚨';
      }
      target.dataset.type = type;

      target.style.left = 20 + Math.random() * 60 + '%';
      target.style.top = 20 + Math.random() * 60 + '%';
      target.style.animationDelay = Math.random() * 0.5 + 's';

      target.onclick = e => {
        e.stopPropagation();
        blasterHitTarget(target);
      };

      arena.appendChild(target);
      blasterTargets++;

      // Auto-escape after time - rugs that escape = miss
      setTimeout(
        () => {
          if (target.parentNode && blasterActive) {
            if (target.dataset.type === 'rug') {
              blasterMisses++;
              if (blasterMisses >= 5) endBlaster();
            }
            target.remove();
            blasterTargets--;
          }
        },
        3000 - blasterWave * 200
      );
    }, i * 300);
  }
}

function blasterShoot(e) {
  if (!blasterActive) return;
  // Show explosion at click point
  const arena = document.getElementById('blaster-arena');
  const rect = arena.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const explosion = document.createElement('div');
  explosion.className = 'blaster-explosion';
  explosion.textContent = '💨';
  explosion.style.left = x + 'px';
  explosion.style.top = y + 'px';
  arena.appendChild(explosion);
  setTimeout(() => explosion.remove(), 400);
}

function blasterHitTarget(target) {
  if (!blasterActive) return;
  const type = target.dataset.type;

  const explosion = document.createElement('div');
  explosion.className = 'blaster-explosion';
  explosion.style.left = target.style.left;
  explosion.style.top = target.style.top;
  target.parentNode.appendChild(explosion);

  if (type === 'skull') {
    // Skull = GAME OVER!
    explosion.textContent = '💀💥';
    explosion.style.fontSize = '48px';
    setTimeout(() => explosion.remove(), 600);
    target.remove();
    blasterTargets--;
    endBlaster();
    return;
  } else if (type === 'flame') {
    // Flame = multiplier boost
    explosion.textContent = '🔥x2';
    blasterMultiplier = Math.min(8, blasterMultiplier + 1);
    document.getElementById('blaster-score').textContent =
      blasterScore + ' (x' + blasterMultiplier + ')';
  } else {
    // Rug = normal points
    explosion.textContent = '💥';
    const points = 10 * blasterWave * blasterMultiplier;
    blasterScore += points;
    document.getElementById('blaster-score').textContent =
      blasterScore + (blasterMultiplier > 1 ? ' (x' + blasterMultiplier + ')' : '');
  }

  setTimeout(() => explosion.remove(), 400);
  target.remove();
  blasterTargets--;
}

function blasterCheckWave() {
  if (!blasterActive) return;
  const rugTargets = document.querySelectorAll('.blaster-target[data-type="rug"]');
  const remainingTargets = document.querySelectorAll('.blaster-target');
  // Advance wave when all rugs are eliminated
  if (rugTargets.length === 0 && remainingTargets.length <= 2) {
    blasterWave++;
    document.getElementById('blaster-wave').textContent = blasterWave;
    document.getElementById('blaster-wave-display').textContent = blasterWave;
    // Clear remaining targets
    remainingTargets.forEach(t => t.remove());
    blasterTargets = 0;
    blasterSpawnTargets();
  }
}

function endBlaster() {
  blasterActive = false;
  clearInterval(blasterSpawnInterval);
  document.querySelectorAll('.blaster-target').forEach(t => t.remove());

  const gs = getGameState();
  if (blasterWave > gs.highScores.blaster) {
    gs.highScores.blaster = blasterWave;
    saveGameState(gs);
  }

  const xpEarned = Math.min(65, blasterWave * 8 + Math.floor(blasterScore / 50));
  if (xpEarned > 0) addXP(xpEarned);

  updateHighScores();
  document.getElementById('blaster-start').textContent =
    `Wave ${blasterWave} (+${xpEarned} XP) - BLAST AGAIN`;
  document.getElementById('blaster-start').style.display = 'block';
}

// ============================================
// TREASURY DEFENSE GAME (Strategy)
// ============================================

let defenseActive = false;
let defensePrepPhase = false;
let defenseWave = 1;
let defenseGold = 150;
let defenseLives = 5;
let defenseSelectedTower = 'fire';
let defenseTowers = [];
let defenseEnemies = [];
let defenseInterval;
let defensePrepTimer = null;
const defenseGrid = Array(48).fill(null);
// Grid 8x6: indices 0-7 (row1), 8-15 (row2), etc.
let defensePath = [];
const towerCosts = { fire: 40, ice: 60, lightning: 80 };
const towerDamage = { fire: 25, ice: 15, lightning: 40 };

// Generate a random path from left edge to treasury (bottom-right)
function generateDefensePath() {
  const path = [];
  const cols = 8,
    rows = 6;

  // Start from a random row on the left edge
  let row = Math.floor(Math.random() * rows);
  let col = 0;
  path.push(row * cols + col);

  // Move towards the treasury at position 47 (row 5, col 7)
  while (col < 7 || row < 5) {
    const possibleMoves = [];

    // Prefer moving right
    if (col < 7) {
      possibleMoves.push({ r: row, c: col + 1, weight: 3 });
    }
    // Can move down if not at bottom
    if (row < 5 && col > 0) {
      possibleMoves.push({ r: row + 1, c: col, weight: 1 });
    }
    // Can move up if not at top and we're past the first column
    if (row > 0 && col > 0 && col < 6) {
      possibleMoves.push({ r: row - 1, c: col, weight: 1 });
    }

    // If we're at the right edge, must go down to treasury
    if (col === 7 && row < 5) {
      possibleMoves.length = 0;
      possibleMoves.push({ r: row + 1, c: col, weight: 1 });
    }

    // Pick a move (weighted random)
    const totalWeight = possibleMoves.reduce((sum, m) => sum + m.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = possibleMoves[0];
    for (const move of possibleMoves) {
      rand -= move.weight;
      if (rand <= 0) {
        chosen = move;
        break;
      }
    }

    row = chosen.r;
    col = chosen.c;
    const cellIndex = row * cols + col;

    // Avoid revisiting cells
    if (!path.includes(cellIndex)) {
      path.push(cellIndex);
    }

    // Safety check
    if (path.length > 20) break;
  }

  // Ensure treasury is the last cell
  if (path[path.length - 1] !== 47) {
    path.push(47);
  }

  return path;
}

function initDefenseField() {
  // Generate a new random path each game
  defensePath = generateDefensePath();
  const startCell = defensePath[0];

  const field = document.getElementById('defense-field');
  field.innerHTML = '';
  for (let i = 0; i < 48; i++) {
    const cell = document.createElement('div');
    cell.className = 'defense-cell';
    if (defensePath.includes(i)) cell.classList.add('path');
    if (i === 47) {
      cell.classList.add('treasury');
      cell.textContent = '🏦';
    }
    if (i === startCell) {
      cell.classList.add('start');
      cell.textContent = '🚪';
    }
    cell.dataset.index = i;
    cell.onclick = () => placeTower(i);
    field.appendChild(cell);
  }
}

function selectTower(type) {
  defenseSelectedTower = type;
  document.querySelectorAll('.defense-tower-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('tower-' + type).classList.add('selected');
}

function placeTower(index) {
  // Can place during prep phase or active phase
  if (!defensePrepPhase && !defenseActive) return;
  if (defensePath.includes(index) || defenseGrid[index]) return;
  const cost = towerCosts[defenseSelectedTower];
  if (defenseGold < cost) return;

  defenseGold -= cost;
  document.getElementById('defense-gold').textContent = defenseGold;

  const cell = document.querySelector(`.defense-cell[data-index="${index}"]`);
  cell.classList.add('tower');
  cell.textContent =
    defenseSelectedTower === 'fire' ? '🔥' : defenseSelectedTower === 'ice' ? '❄️' : '⚡';

  defenseGrid[index] = { type: defenseSelectedTower, damage: towerDamage[defenseSelectedTower] };
  defenseTowers.push({ index, type: defenseSelectedTower });
}

function startDefensePrep() {
  if (defenseActive || defensePrepPhase) return;
  defensePrepPhase = true;
  let countdown = 10;
  document.getElementById('defense-start').textContent = `PREP: ${countdown}s - Place towers!`;
  document.getElementById('defense-start').disabled = true;

  defensePrepTimer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(defensePrepTimer);
      defensePrepPhase = false;
      startDefenseWave();
    } else {
      document.getElementById('defense-start').textContent = `PREP: ${countdown}s - Place towers!`;
    }
  }, 1000);
}

function startDefenseWave() {
  defenseActive = true;
  document.getElementById('defense-start').textContent = 'WAVE ' + defenseWave + ' IN PROGRESS...';

  // Spawn enemies with delay
  const enemyCount = 3 + defenseWave;
  for (let i = 0; i < enemyCount; i++) {
    setTimeout(() => {
      if (!defenseActive) return;
      spawnDefenseEnemy();
    }, i * 1200);
  }

  defenseInterval = setInterval(defenseUpdate, 150);
}

function spawnDefenseEnemy() {
  const field = document.getElementById('defense-field');
  const enemy = document.createElement('div');
  enemy.className = 'defense-enemy';
  enemy.textContent = ['💀', '👹', '🚨'][Math.floor(Math.random() * 3)];
  enemy.dataset.hp = 80 + defenseWave * 15;
  enemy.dataset.maxHp = enemy.dataset.hp;
  enemy.dataset.pathIndex = 0;
  enemy.dataset.slowTimer = 0;

  positionEnemyOnPath(enemy, 0, field);
  field.appendChild(enemy);
  defenseEnemies.push(enemy);
}

function positionEnemyOnPath(enemy, pathIdx, field) {
  const fieldRect = field.getBoundingClientRect();
  const cellIndex = defensePath[pathIdx];
  const cell = field.children[cellIndex];
  if (!cell) return;
  const cellRect = cell.getBoundingClientRect();
  enemy.style.left = cellRect.left - fieldRect.left + cellRect.width / 2 - 12 + 'px';
  enemy.style.top = cellRect.top - fieldRect.top + cellRect.height / 2 - 12 + 'px';
}

function defenseUpdate() {
  if (!defenseActive) return;
  const field = document.getElementById('defense-field');

  // Move enemies along path
  defenseEnemies.forEach((enemy, idx) => {
    if (!enemy.parentNode) return;

    // Check if slowed
    const slowTimer = parseInt(enemy.dataset.slowTimer) || 0;
    if (slowTimer > 0) {
      enemy.dataset.slowTimer = slowTimer - 1;
      if (slowTimer % 2 === 0) return; // Skip every other update when slowed
    }

    let pathIdx = parseInt(enemy.dataset.pathIndex);
    if (pathIdx < defensePath.length - 1) {
      pathIdx++;
      enemy.dataset.pathIndex = pathIdx;
      positionEnemyOnPath(enemy, pathIdx, field);
    } else {
      // Reached treasury
      enemy.remove();
      defenseEnemies.splice(idx, 1);
      defenseLives--;
      updateDefenseLives();
      if (defenseLives <= 0) endDefense();
    }
  });

  // Tower attacks with visual effects
  const now = Date.now();
  const fieldRect = field.getBoundingClientRect();
  defenseTowers.forEach(tower => {
    // Check cooldown (faster for lightning)
    const cooldown = tower.type === 'lightning' ? 300 : 600;
    if (tower.lastShot && now - tower.lastShot < cooldown) return;

    const towerCell = field.children[tower.index];
    if (!towerCell) return;
    const towerRect = towerCell.getBoundingClientRect();
    const towerX = towerRect.left - fieldRect.left + towerRect.width / 2;
    const towerY = towerRect.top - fieldRect.top + towerRect.height / 2;

    // Find closest enemy in range (increased range)
    let closestEnemy = null;
    let closestDist = Infinity;
    const range = tower.type === 'lightning' ? 100 : 80;

    defenseEnemies.forEach(enemy => {
      if (!enemy.parentNode) return;
      const enemyRect = enemy.getBoundingClientRect();
      const enemyX = enemyRect.left - fieldRect.left + enemyRect.width / 2;
      const enemyY = enemyRect.top - fieldRect.top + enemyRect.height / 2;
      const dist = Math.hypot(towerX - enemyX, towerY - enemyY);

      if (dist < range && dist < closestDist) {
        closestDist = dist;
        closestEnemy = { el: enemy, x: enemyX, y: enemyY };
      }
    });

    if (closestEnemy) {
      tower.lastShot = now;
      const towerData = defenseGrid[tower.index];

      // Create projectile
      const projectile = document.createElement('div');
      projectile.className = 'defense-projectile ' + tower.type;
      projectile.textContent = tower.type === 'fire' ? '🔥' : tower.type === 'ice' ? '❄️' : '⚡';
      projectile.style.left = closestEnemy.x + 'px';
      projectile.style.top = closestEnemy.y + 'px';
      field.appendChild(projectile);
      setTimeout(() => projectile.remove(), 300);

      // Deal damage
      const hp = parseInt(closestEnemy.el.dataset.hp) - towerData.damage;
      closestEnemy.el.dataset.hp = hp;

      // Show damage number
      const dmgText = document.createElement('div');
      dmgText.className = 'defense-damage';
      dmgText.textContent = '-' + towerData.damage;
      dmgText.style.left = closestEnemy.x + 'px';
      dmgText.style.top = closestEnemy.y + 'px';
      field.appendChild(dmgText);
      setTimeout(() => dmgText.remove(), 600);

      // Ice tower slows enemy
      if (tower.type === 'ice') {
        closestEnemy.el.dataset.slowTimer = 10;
        closestEnemy.el.style.filter = 'hue-rotate(180deg)';
        setTimeout(() => {
          if (closestEnemy.el.parentNode) {
            closestEnemy.el.style.filter = '';
          }
        }, 1500);
      }

      if (hp <= 0) {
        closestEnemy.el.remove();
        defenseEnemies = defenseEnemies.filter(e => e !== closestEnemy.el);
        defenseGold += 15 + defenseWave * 3;
        document.getElementById('defense-gold').textContent = defenseGold;
      }
    }
  });

  // Check wave complete
  if (defenseEnemies.length === 0 && document.querySelectorAll('.defense-enemy').length === 0) {
    defenseActive = false;
    clearInterval(defenseInterval);
    defenseWave++;
    // Bonus gold for completing wave
    defenseGold += 50 + defenseWave * 10;
    document.getElementById('defense-gold').textContent = defenseGold;
    document.getElementById('defense-wave').textContent = defenseWave;
    document.getElementById('defense-start').textContent = 'PREP WAVE ' + defenseWave;
    document.getElementById('defense-start').disabled = false;
  }
}

function updateDefenseLives() {
  const livesEl = document.getElementById('defense-lives');
  livesEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.textContent = i < defenseLives ? '❤️' : '🖤';
    livesEl.appendChild(span);
  }
}

function endDefense() {
  defenseActive = false;
  defensePrepPhase = false;
  clearInterval(defenseInterval);
  clearInterval(defensePrepTimer);
  defenseEnemies.forEach(e => e.remove());
  defenseEnemies = [];

  const gs = getGameState();
  if (defenseWave > gs.highScores.defense) {
    gs.highScores.defense = defenseWave;
    saveGameState(gs);
  }

  const xpEarned = Math.min(90, defenseWave * 12);
  if (xpEarned > 0) addXP(xpEarned);

  updateHighScores();
  document.getElementById('defense-start').textContent =
    `Wave ${defenseWave} (+${xpEarned} XP) - RESTART`;
  document.getElementById('defense-start').disabled = false;
  document.getElementById('defense-start').onclick = () => {
    defenseWave = 1;
    defenseGold = 150;
    defenseLives = 5;
    defenseTowers = [];
    defenseGrid.fill(null);
    document.getElementById('defense-wave').textContent = '1';
    document.getElementById('defense-gold').textContent = '150';
    updateDefenseLives();
    initDefenseField();
    document.getElementById('defense-start').textContent = 'START PREP';
    document.getElementById('defense-start').onclick = startDefensePrep;
  };
}

// ============================================
// TOKEN STACKER GAME (Build)
// ============================================

let stackerActive = false;
let stackerHeight = 0;
let stackerScore = 0;
let stackerBlocks = [];
let stackerMovingBlock = null;
let stackerDirection = 1;
let stackerSpeed = 3;
let stackerBlockWidth = 80;
let stackerInterval;

let stackerViewportOffset = 0;

function startStacker() {
  stackerActive = true;
  stackerHeight = 0;
  stackerScore = 0;
  stackerBlocks = [];
  stackerBlockWidth = 80;
  stackerSpeed = 3;
  stackerViewportOffset = 0;

  document.getElementById('stacker-height').textContent = '0';
  document.getElementById('stacker-height-display').textContent = '0';
  document.getElementById('stacker-score').textContent = '0';
  document.getElementById('stacker-start').style.display = 'none';

  // Reset viewport
  const viewport = document.getElementById('stacker-viewport');
  viewport.style.transform = 'translateY(0)';

  // Clear blocks
  document
    .querySelectorAll('.stacker-block, .stacker-moving, .stacker-perfect-text')
    .forEach(b => b.remove());

  document.addEventListener('keydown', stackerKeyHandler);
  spawnStackerBlock();
}

function stackerKeyHandler(e) {
  if (e.code === 'Space' && stackerActive) {
    e.preventDefault();
    stackerDrop();
  }
}

function spawnStackerBlock() {
  const viewport = document.getElementById('stacker-viewport');
  const block = document.createElement('div');
  block.className = 'stacker-moving';
  block.style.width = stackerBlockWidth + 'px';
  block.style.left = '0px';
  block.textContent = '🔥';

  // Position at landing height (on top of the current tower)
  const landingHeight = 20 + stackerHeight * 32;
  block.style.bottom = landingHeight + 'px';

  viewport.appendChild(block);
  stackerMovingBlock = block;
  stackerDirection = 1;

  stackerInterval = setInterval(moveStackerBlock, 16);
}

function moveStackerBlock() {
  if (!stackerMovingBlock) return;
  let left = parseFloat(stackerMovingBlock.style.left);
  const maxLeft = document.getElementById('stacker-viewport').offsetWidth - stackerBlockWidth;

  left += stackerDirection * stackerSpeed;
  if (left >= maxLeft) {
    left = maxLeft;
    stackerDirection = -1;
  }
  if (left <= 0) {
    left = 0;
    stackerDirection = 1;
  }

  stackerMovingBlock.style.left = left + 'px';
}

function stackerDrop() {
  if (!stackerActive || !stackerMovingBlock) return;
  clearInterval(stackerInterval);

  const area = document.getElementById('stacker-area');
  const viewport = document.getElementById('stacker-viewport');
  const areaWidth = area.offsetWidth;
  const blockLeft = parseFloat(stackerMovingBlock.style.left);
  const blockWidth = stackerBlockWidth;

  let newWidth = blockWidth;
  let newLeft = blockLeft;
  let isPerfect = false;

  if (stackerHeight === 0) {
    // First block - center it
    const centerLeft = (areaWidth - 80) / 2;
    if (Math.abs(blockLeft - centerLeft) < 5) {
      isPerfect = true;
      newLeft = centerLeft;
    }
  } else {
    // Compare with previous block
    const prevBlock = stackerBlocks[stackerBlocks.length - 1];
    const overlap =
      Math.min(blockLeft + blockWidth, prevBlock.left + prevBlock.width) -
      Math.max(blockLeft, prevBlock.left);

    if (overlap <= 0) {
      // Miss!
      stackerMovingBlock.remove();
      endStacker();
      return;
    }

    newWidth = overlap;
    newLeft = Math.max(blockLeft, prevBlock.left);
    isPerfect = overlap >= blockWidth - 2;
  }

  // Create placed block in viewport
  const placedBlock = document.createElement('div');
  placedBlock.className = 'stacker-block placed' + (isPerfect ? ' perfect' : '');
  placedBlock.style.width = newWidth + 'px';
  placedBlock.style.left = newLeft + 'px';
  placedBlock.style.bottom = 20 + stackerHeight * 32 + 'px';
  placedBlock.textContent = '🔥';
  viewport.appendChild(placedBlock);

  stackerBlocks.push({ left: newLeft, width: newWidth });
  stackerMovingBlock.remove();
  stackerMovingBlock = null;

  stackerHeight++;
  stackerScore += isPerfect ? 20 : 10;
  stackerBlockWidth = newWidth;
  stackerSpeed = Math.min(8, 3 + stackerHeight * 0.3);

  document.getElementById('stacker-height').textContent = stackerHeight;
  document.getElementById('stacker-height-display').textContent = stackerHeight;
  document.getElementById('stacker-score').textContent = stackerScore;

  if (isPerfect) {
    const text = document.createElement('div');
    text.className = 'stacker-perfect-text';
    text.textContent = 'PERFECT!';
    text.style.top = 320 - stackerHeight * 32 + 'px';
    area.appendChild(text);
    setTimeout(() => text.remove(), 800);
    stackerBlockWidth = Math.min(80, stackerBlockWidth + 5);
  }

  // Check if too narrow
  if (stackerBlockWidth < 10) {
    endStacker();
    return;
  }

  // Scroll viewport to follow the tower growth starting at level 7
  if (stackerHeight >= 7) {
    stackerViewportOffset = (stackerHeight - 6) * 32;
    viewport.style.transform = `translateY(${stackerViewportOffset}px)`;
  }

  spawnStackerBlock();
}

function endStacker() {
  stackerActive = false;
  clearInterval(stackerInterval);
  document.removeEventListener('keydown', stackerKeyHandler);
  document.getElementById('stacker-viewport').style.transform = '';

  const gs = getGameState();
  if (stackerHeight > gs.highScores.stacker) {
    gs.highScores.stacker = stackerHeight;
    saveGameState(gs);
  }

  const xpEarned = Math.min(55, stackerHeight * 3 + Math.floor(stackerScore / 10));
  if (xpEarned > 0) addXP(xpEarned);

  updateHighScores();
  document.getElementById('stacker-start').textContent =
    `${stackerHeight} floors (+${xpEarned} XP) - STACK AGAIN`;
  document.getElementById('stacker-start').style.display = 'block';
}

// ============================================
// JOURNEY DU HOLDER - RPG EDUCATIF
// ============================================

const JOURNEY_STORAGE_KEY = 'asdf_journey_v1';

// Journey State
const JourneyState = {
  stats: { diamond: 50, knowledge: 20, community: 30, portfolio: 1000 },
  chapter: 1,
  choicesMade: [],
  lessonsLearned: [],
  completed: false,
};

// Chapter Data - Educational Content with Choices
const JOURNEY_CHAPTERS = [
  {
    chapter: 1,
    title: 'The First Buy',
    visual: '🐕',
    text: `<p>You've heard whispers about <strong>$ASDF</strong> on crypto Twitter. A memecoin with "This is Fine" vibes and something about automated burns.</p>
                       <p>The dog in the burning room. That's their thing.</p>
                       <p><em>You have 1,000 SOL worth of stablecoins. Time to make a decision...</em></p>`,
    choices: [
      {
        id: 'a',
        icon: '📚',
        text: 'Read the docs first',
        hint: 'Knowledge is power',
        effects: { diamond: 0, knowledge: +15, community: +5, portfolio: 0 },
        outcome: `<p>You spend an hour reading the whitepaper and learning about the <strong>Optimistic Burn Protocol</strong>.</p>
                                  <p>Creator fees from Pump.fun get collected, used to buyback $ASDF, and then burned forever. The supply decreases while demand stays constant.</p>
                                  <p><em>This actually makes sense...</em></p>`,
        lesson: 'DYOR (Do Your Own Research) before investing',
      },
      {
        id: 'b',
        icon: '🚀',
        text: 'Ape in immediately',
        hint: 'WAGMI mentality',
        effects: { diamond: +10, knowledge: -5, community: 0, portfolio: -100 },
        outcome: `<p>You buy at the top. The price immediately dumps 10%.</p>
                                  <p><em>"This is fine"</em>, you tell yourself.</p>
                                  <p>At least you're in now. But you still don't fully understand what you bought...</p>`,
        lesson: 'FOMO often leads to buying high',
      },
      {
        id: 'c',
        icon: '🎯',
        text: 'Ask the community',
        hint: 'Join the Discord',
        effects: { diamond: +5, knowledge: +10, community: +15, portfolio: 0 },
        outcome: `<p>You join the Discord and ask questions. The community explains the burn mechanics patiently.</p>
                                  <p><strong>Creator fees → Buyback → Burn → Less supply</strong></p>
                                  <p>You make some friends along the way. They seem genuinely helpful.</p>`,
        lesson: 'Good communities educate, not pump',
      },
    ],
  },
  {
    chapter: 2,
    title: 'The First Dip',
    visual: '📉',
    text: `<p>A week later. Your portfolio is down <strong>40%</strong>.</p>
                       <p>FUD is spreading. Someone on Twitter claims the project is dead. Another says the dev rugged.</p>
                       <p>But you check - the burn mechanism is still running. Fees are still being collected. Burns are still happening.</p>
                       <p><em>What do you do?</em></p>`,
    choices: [
      {
        id: 'a',
        icon: '💎',
        text: 'HODL - This is fine',
        hint: 'Diamond hands activated',
        effects: { diamond: +20, knowledge: +5, community: +5, portfolio: 0 },
        outcome: `<p>You hold through the chaos. The burns continue regardless of price action.</p>
                                  <p>You learn that volatility is normal in crypto, and fundamentals matter more than daily charts.</p>
                                  <p>Two weeks later, price recovers. <strong>Your patience is rewarded.</strong></p>`,
        lesson: 'Price volatility is temporary, burns are permanent',
      },
      {
        id: 'b',
        icon: '😱',
        text: 'Panic sell everything',
        hint: 'Cut losses',
        effects: { diamond: -20, knowledge: 0, community: -10, portfolio: -400 },
        outcome: `<p>You sell at the bottom. The price pumps 50% the next day.</p>
                                  <p>Your portfolio takes a 40% realized loss. The emotional pain is worse than the financial loss.</p>
                                  <p><em>Selling added fees to the burn mechanism. At least your loss helped others...</em></p>`,
        lesson: 'Panic selling locks in losses',
      },
      {
        id: 'c',
        icon: '🧐',
        text: 'Verify the FUD claims',
        hint: 'Check on-chain data',
        effects: { diamond: +10, knowledge: +20, community: 0, portfolio: 0 },
        outcome: `<p>You check Solscan. The daemon is running. Burns are happening. Treasury is transparent.</p>
                                  <p>The FUD was baseless. You learn to <strong>verify before believing</strong>.</p>
                                  <p>Knowledge protects you from manipulation.</p>`,
        lesson: 'Verify claims with on-chain data',
      },
    ],
  },
  {
    chapter: 3,
    title: 'The Scam DM',
    visual: '🎣',
    text: `<p>You receive a DM: <em>"Hey! I'm an admin from $ASDF. We're doing an airdrop! Send 0.1 SOL to verify your wallet and receive 10,000 $ASDF!"</em></p>
                       <p>The profile picture looks legit. They have followers.</p>
                       <p><em>But something feels off...</em></p>`,
    choices: [
      {
        id: 'a',
        icon: '🛡️',
        text: 'Report and block',
        hint: 'Trust no DMs',
        effects: { diamond: +5, knowledge: +15, community: +10, portfolio: 0 },
        outcome: `<p>You recognize the classic scam patterns: unsolicited DMs, urgency, requests to send crypto.</p>
                                  <p>You report the account and warn others in the community.</p>
                                  <p><strong>Legit projects never DM first asking for funds.</strong></p>`,
        lesson: 'Admins will never DM you first',
      },
      {
        id: 'b',
        icon: '🤔',
        text: 'Ask in official Discord',
        hint: 'Verify with community',
        effects: { diamond: +5, knowledge: +10, community: +15, portfolio: 0 },
        outcome: `<p>You screenshot and share in the official Discord. The mods confirm it's a scam.</p>
                                  <p>Other community members thank you for the warning. Your reputation grows.</p>
                                  <p><em>When in doubt, verify through official channels.</em></p>`,
        lesson: 'When in doubt, ask the official community',
      },
      {
        id: 'c',
        icon: '💸',
        text: 'Send the SOL',
        hint: 'YOLO...',
        effects: { diamond: -10, knowledge: +5, community: -5, portfolio: -200 },
        outcome: `<p>You send 0.1 SOL. The account blocks you immediately.</p>
                                  <p><strong>Lesson learned the hard way.</strong> You lost money but gained wisdom.</p>
                                  <p>You share your experience to help others avoid the same mistake.</p>`,
        lesson: 'Never send crypto to verify your wallet',
      },
    ],
  },
  {
    chapter: 4,
    title: 'The Burn Event',
    visual: '🔥',
    text: `<p>A massive burn just happened! <strong>500,000 $ASDF</strong> permanently removed from circulation.</p>
                       <p>The community is celebrating. Price pumped 20%. Everyone's posting fire emojis.</p>
                       <p>You now understand: the flywheel works. Trading fees → Buybacks → Burns → Less supply → Value accrual.</p>
                       <p><em>How do you celebrate?</em></p>`,
    choices: [
      {
        id: 'a',
        icon: '📢',
        text: 'Share on social media',
        hint: 'Spread the word',
        effects: { diamond: 0, knowledge: +5, community: +20, portfolio: 0 },
        outcome: `<p>You create a thread explaining how the burn mechanism works.</p>
                                  <p>It goes viral. New holders join because they finally understand the value proposition.</p>
                                  <p><strong>Education > Shilling</strong></p>`,
        lesson: 'Educating others builds real community',
      },
      {
        id: 'b',
        icon: '💰',
        text: 'Take some profits',
        hint: 'Secure gains',
        effects: { diamond: -5, knowledge: +5, community: 0, portfolio: +200 },
        outcome: `<p>You sell 20% of your position at a profit. Smart risk management.</p>
                                  <p>Even if price drops, you've secured some gains. The rest continues to benefit from burns.</p>
                                  <p><em>Taking profits isn't paper-handing, it's strategy.</em></p>`,
        lesson: 'Taking profits is valid risk management',
      },
      {
        id: 'c',
        icon: '🏗️',
        text: 'Build something',
        hint: 'Contribute to ecosystem',
        effects: { diamond: +10, knowledge: +15, community: +20, portfolio: 0 },
        outcome: `<p>Inspired by the burn event, you start building a tracker tool for the community.</p>
                                  <p>It helps holders see burns in real-time. The community loves it.</p>
                                  <p><strong>You become a builder, not just a holder.</strong></p>`,
        lesson: 'Building adds more value than just holding',
      },
    ],
  },
  {
    chapter: 5,
    title: 'The Community Test',
    visual: '🤝',
    text: `<p>A new holder in Discord is spreading misinformation. They're aggressive and dismissive.</p>
                       <p>"This is just another pump and dump! The devs will rug!"</p>
                       <p>They clearly haven't done research. The community looks to you - you've been here a while now.</p>
                       <p><em>How do you respond?</em></p>`,
    choices: [
      {
        id: 'a',
        icon: '🎓',
        text: 'Educate patiently',
        hint: 'Be the bigger person',
        effects: { diamond: +5, knowledge: +5, community: +25, portfolio: 0 },
        outcome: `<p>You calmly explain the mechanics. Point to on-chain data. Share resources.</p>
                                  <p>The person apologizes and becomes curious. They do their research and stay.</p>
                                  <p><strong>Patience converts skeptics into allies.</strong></p>`,
        lesson: 'Patient education builds stronger communities',
      },
      {
        id: 'b',
        icon: '⚔️',
        text: 'Attack them back',
        hint: 'Defend the project',
        effects: { diamond: +5, knowledge: -5, community: -15, portfolio: 0 },
        outcome: `<p>You fire back aggressively. The argument escalates. The person leaves angry.</p>
                                  <p>Other community members are uncomfortable. The vibe is ruined.</p>
                                  <p><em>Toxicity drives people away, even if you're "right".</em></p>`,
        lesson: 'Toxicity hurts communities more than FUD',
      },
      {
        id: 'c',
        icon: '🔇',
        text: 'Ignore and let mods handle',
        hint: 'Not your problem',
        effects: { diamond: 0, knowledge: 0, community: +5, portfolio: 0 },
        outcome: `<p>You let the moderators handle it. They respond professionally.</p>
                                  <p>The situation is resolved, but a teaching moment was missed.</p>
                                  <p><em>Sometimes stepping back is okay, but active participation builds stronger bonds.</em></p>`,
        lesson: "Community health is everyone's responsibility",
      },
    ],
  },
  {
    chapter: 6,
    title: 'The Creator Dilemma',
    visual: '🏛️',
    text: `<p>You discover the <strong>ASDF vision</strong>.</p>
                       <p>The idea: support creators who build real value, not pump-and-dumpers who extract it.</p>
                       <p>A new project launches. The founder promises 100x. No product, just hype.</p>
                       <p>Meanwhile, another creator quietly builds useful tools for the ecosystem.</p>
                       <p><em>Where do you put your support?</em></p>`,
    choices: [
      {
        id: 'a',
        icon: '🛠️',
        text: 'Support the builder',
        hint: 'Value over hype',
        effects: { diamond: +15, knowledge: +15, community: +15, portfolio: +150 },
        outcome: `<p>You support the builder. Their tools gain adoption. Real utility creates real value.</p>
                                  <p>The hype project rugs within a month. Your judgment was correct.</p>
                                  <p><strong>ASDF mindset: reward creation, not extraction.</strong></p>`,
        lesson: 'Support builders who create lasting value',
      },
      {
        id: 'b',
        icon: '🎰',
        text: 'Chase the hype',
        hint: 'High risk, high reward?',
        effects: { diamond: -15, knowledge: +5, community: -10, portfolio: -300 },
        outcome: `<p>You ape into the hype project. It pumps 3x... then rugs completely.</p>
                                  <p>Your portfolio takes a hit. Another lesson learned.</p>
                                  <p><em>Hype without substance is a house of cards.</em></p>`,
        lesson: 'Hype without product usually ends badly',
      },
      {
        id: 'c',
        icon: '⚖️',
        text: 'Diversify both',
        hint: 'Hedge your bets',
        effects: { diamond: +5, knowledge: +10, community: +5, portfolio: -50 },
        outcome: `<p>You split your investment. The hype project rugs, but your builder bet pays off.</p>
                                  <p>Net result: small loss, but balanced approach.</p>
                                  <p><em>Diversification reduces risk but also reduces learning from conviction.</em></p>`,
        lesson: 'Diversification reduces risk but dilutes conviction',
      },
    ],
  },
];

// Chapter 7: Final Test Scenarios
const FINAL_TEST_SCENARIOS = [
  // Scam detection
  {
    icon: '📩',
    text: '"Hey! Admin here. Send 0.1 SOL to verify your wallet for airdrop!"',
    correct: false,
    category: 'scam',
  },
  {
    icon: '🎁',
    text: '"Free 10,000 $ASDF! Just connect wallet to this site!"',
    correct: false,
    category: 'scam',
  },
  {
    icon: '🔗',
    text: '"Click here to claim your rewards before they expire!"',
    correct: false,
    category: 'scam',
  },
  {
    icon: '👤',
    text: 'DM from "official support" asking for your seed phrase',
    correct: false,
    category: 'scam',
  },
  {
    icon: '💰',
    text: '"Guaranteed 100x! Dev is doxxed!" (no product, just hype)',
    correct: false,
    category: 'scam',
  },

  // Good practices
  { icon: '📚', text: 'Reading the whitepaper before investing', correct: true, category: 'dyor' },
  {
    icon: '🔍',
    text: 'Verifying burns on Solscan before believing FUD',
    correct: true,
    category: 'dyor',
  },
  {
    icon: '💬',
    text: 'Asking questions in official Discord',
    correct: true,
    category: 'community',
  },
  { icon: '🎓', text: 'Educating new holders patiently', correct: true, category: 'community' },
  { icon: '🛠️', text: 'Building tools for the ecosystem', correct: true, category: 'building' },

  // Market behavior
  {
    icon: '📉',
    text: 'Price dropped 40%: panic sell everything',
    correct: false,
    category: 'market',
  },
  {
    icon: '💎',
    text: 'Price dropped but burns still happening: HODL',
    correct: true,
    category: 'market',
  },
  { icon: '📈', text: 'Taking some profits after a pump', correct: true, category: 'market' },
  {
    icon: '🚀',
    text: 'FOMO buying at all-time high without research',
    correct: false,
    category: 'market',
  },
  {
    icon: '🔥',
    text: 'Understanding: sells also contribute to burns',
    correct: true,
    category: 'knowledge',
  },

  // ASDF values
  {
    icon: '🏗️',
    text: 'Supporting a creator who builds useful tools',
    correct: true,
    category: 'asdf',
  },
  { icon: '🎰', text: 'Chasing hype project with no product', correct: false, category: 'asdf' },
  {
    icon: '🤝',
    text: 'Sharing knowledge with the community',
    correct: true,
    category: 'community',
  },
  { icon: '⚔️', text: 'Attacking FUDders aggressively', correct: false, category: 'community' },
  { icon: '🧐', text: 'Verifying claims with on-chain data', correct: true, category: 'dyor' },

  // More scenarios
  {
    icon: '🔄',
    text: 'Creator fees → Buyback → Burn = deflation',
    correct: true,
    category: 'knowledge',
  },
  {
    icon: '🐋',
    text: 'Blaming whales for every price drop',
    correct: false,
    category: 'community',
  },
  { icon: '📊', text: 'Checking treasury transparency regularly', correct: true, category: 'dyor' },
  {
    icon: '😱',
    text: 'Believing anonymous FUD without verification',
    correct: false,
    category: 'dyor',
  },
  {
    icon: '🏛️',
    text: 'ASDF vision: Reward creation, not extraction',
    correct: true,
    category: 'asdf',
  },
];

// Final Test Game State
let finalTestState = {
  active: false,
  timer: 30,
  timerInterval: null,
  score: 0,
  correct: 0,
  wrong: 0,
  streak: 0,
  bestStreak: 0,
  currentScenario: null,
  usedScenarios: [],
};

// Archetypes based on final stats
const JOURNEY_ARCHETYPES = [
  {
    id: 'diamond_legend',
    badge: '💎',
    name: 'Diamond Hand Legend',
    desc: 'Unshakeable conviction. You held through chaos and emerged stronger. The market bends to your will.',
    condition: stats => stats.diamond >= 80,
  },
  {
    id: 'sage',
    badge: '🧙',
    name: 'Ecosystem Sage',
    desc: 'Knowledge is your weapon. You understand the mechanics, verify the data, and make informed decisions.',
    condition: stats => stats.knowledge >= 80,
  },
  {
    id: 'community_pillar',
    badge: '🏛️',
    name: 'Community Pillar',
    desc: 'You build bridges, not walls. Your reputation precedes you. Others look to you for guidance.',
    condition: stats => stats.community >= 80,
  },
  {
    id: 'whale',
    badge: '🐋',
    name: 'Portfolio Whale',
    desc: 'Your portfolio speaks for itself. Smart decisions compounded over time.',
    condition: stats => stats.portfolio >= 1500,
  },
  {
    id: 'survivor',
    badge: '🔥',
    name: 'Burn Survivor',
    desc: 'You made it through. Not perfect, but still standing. This is fine.',
    condition: stats => true, // Default
  },
];

// Final Test Game Functions
function startFinalTest() {
  const state = getJourneyState();
  state.chapter = 7;
  saveJourneyState(state);

  // Reset test state
  finalTestState = {
    active: true,
    timer: 30,
    timerInterval: null,
    score: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    currentScenario: null,
    usedScenarios: [],
  };

  // Hide story, show final test
  document.getElementById('journey-story').style.display = 'none';
  document.getElementById('journey-final-test').style.display = 'block';
  document.getElementById('final-test-results').style.display = 'none';
  document.querySelector('.final-test-arena').style.display = 'block';

  // Update chapter dots
  updateJourneyStats(state);

  // Setup button listeners
  document.getElementById('test-btn-accept').onclick = () => handleTestAnswer(true);
  document.getElementById('test-btn-reject').onclick = () => handleTestAnswer(false);
  document.getElementById('final-test-continue').onclick = () => endJourney();

  // Keyboard support
  document.addEventListener('keydown', finalTestKeyHandler);

  // Start the game
  updateTestUI();
  loadNextScenario();
  startTestTimer();
}

function finalTestKeyHandler(e) {
  if (!finalTestState.active) return;

  // Left arrow or A = Reject, Right arrow or D = Accept
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    e.preventDefault();
    handleTestAnswer(false);
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    handleTestAnswer(true);
  }
}

function startTestTimer() {
  const timerBar = document.getElementById('test-timer-bar');
  const timerText = document.getElementById('test-timer-text');

  finalTestState.timerInterval = setInterval(() => {
    finalTestState.timer -= 0.1;

    if (finalTestState.timer <= 0) {
      finalTestState.timer = 0;
      endFinalTest();
      return;
    }

    // Update timer UI
    const percent = (finalTestState.timer / 30) * 100;
    timerBar.style.width = percent + '%';
    timerText.textContent = Math.ceil(finalTestState.timer) + 's';

    // Warning colors
    timerText.classList.remove('warning', 'danger');
    if (finalTestState.timer <= 5) {
      timerText.classList.add('danger');
    } else if (finalTestState.timer <= 10) {
      timerText.classList.add('warning');
    }
  }, 100);
}

function loadNextScenario() {
  // Get unused scenarios
  const available = FINAL_TEST_SCENARIOS.filter(
    (_, i) => !finalTestState.usedScenarios.includes(i)
  );

  if (available.length === 0) {
    // Reset if we've used all
    finalTestState.usedScenarios = [];
    loadNextScenario();
    return;
  }

  // Pick random scenario
  const randomIndex = Math.floor(Math.random() * available.length);
  const originalIndex = FINAL_TEST_SCENARIOS.indexOf(available[randomIndex]);
  finalTestState.usedScenarios.push(originalIndex);
  finalTestState.currentScenario = available[randomIndex];

  // Update UI
  document.getElementById('scenario-icon').textContent = finalTestState.currentScenario.icon;
  document.getElementById('scenario-text').textContent = finalTestState.currentScenario.text;

  // Reset scenario appearance
  const scenarioEl = document.getElementById('test-scenario');
  scenarioEl.classList.remove('correct', 'wrong');
}

function handleTestAnswer(playerSaidAccept) {
  if (!finalTestState.active || !finalTestState.currentScenario) return;

  const isCorrect = playerSaidAccept === finalTestState.currentScenario.correct;
  const scenarioEl = document.getElementById('test-scenario');
  const feedbackEl = document.getElementById('test-feedback');

  if (isCorrect) {
    // Correct answer
    finalTestState.correct++;
    finalTestState.streak++;
    if (finalTestState.streak > finalTestState.bestStreak) {
      finalTestState.bestStreak = finalTestState.streak;
    }

    // Score: base + streak bonus
    const points = 10 + finalTestState.streak * 2;
    finalTestState.score += points;

    // Bonus time for streaks
    if (finalTestState.streak >= 3) {
      finalTestState.timer = Math.min(30, finalTestState.timer + 1);
    }

    scenarioEl.classList.add('correct');
    feedbackEl.textContent = `+${points} points! ${finalTestState.streak >= 3 ? '🔥 +1s!' : ''}`;
    feedbackEl.className = 'test-feedback correct';
  } else {
    // Wrong answer
    finalTestState.wrong++;
    finalTestState.streak = 0;

    // Lose time
    finalTestState.timer = Math.max(0, finalTestState.timer - 2);

    scenarioEl.classList.add('wrong');
    feedbackEl.textContent = `-2s! ${finalTestState.currentScenario.correct ? 'This was GOOD!' : 'This was BAD!'}`;
    feedbackEl.className = 'test-feedback wrong';
  }

  updateTestUI();

  // Load next scenario after brief delay
  setTimeout(() => {
    if (finalTestState.active && finalTestState.timer > 0) {
      loadNextScenario();
      feedbackEl.textContent = '';
    }
  }, 600);
}

function updateTestUI() {
  document.getElementById('test-score').textContent = finalTestState.score;
  document.getElementById('test-streak').textContent = finalTestState.streak;
}

function endFinalTest() {
  finalTestState.active = false;
  clearInterval(finalTestState.timerInterval);

  // Remove keyboard handler
  document.removeEventListener('keydown', finalTestKeyHandler);

  // Hide arena, show results
  document.querySelector('.final-test-arena').style.display = 'none';
  document.getElementById('final-test-results').style.display = 'block';

  // Update results
  document.getElementById('result-correct').textContent = finalTestState.correct;
  document.getElementById('result-wrong').textContent = finalTestState.wrong;
  document.getElementById('result-streak').textContent = finalTestState.bestStreak;
  document.getElementById('result-score').textContent = finalTestState.score;

  // Determine result icon and title
  const accuracy = finalTestState.correct / (finalTestState.correct + finalTestState.wrong) || 0;
  let icon, title;

  if (accuracy >= 0.9 && finalTestState.score >= 150) {
    icon = '🏆';
    title = 'LEGENDARY!';
  } else if (accuracy >= 0.8 && finalTestState.score >= 100) {
    icon = '⭐';
    title = 'Excellent!';
  } else if (accuracy >= 0.6) {
    icon = '👍';
    title = 'Well Done!';
  } else {
    icon = '📚';
    title = 'Keep Learning!';
  }

  document.getElementById('results-icon').textContent = icon;
  document.getElementById('results-title').textContent = title;

  // Bonus stats for journey
  const state = getJourneyState();
  const bonusPoints = Math.floor(finalTestState.score / 10);

  state.stats.diamond += Math.floor(bonusPoints * 0.3);
  state.stats.knowledge += Math.floor(bonusPoints * 0.4);
  state.stats.community += Math.floor(bonusPoints * 0.3);

  // Clamp
  state.stats.diamond = Math.min(100, state.stats.diamond);
  state.stats.knowledge = Math.min(100, state.stats.knowledge);
  state.stats.community = Math.min(100, state.stats.community);

  saveJourneyState(state);

  // Show bonus
  const bonusEl = document.getElementById('results-bonus');
  safeInnerHTML(
    bonusEl,
    `💎 +${Math.floor(bonusPoints * 0.3)} | 🧠 +${Math.floor(bonusPoints * 0.4)} | 🤝 +${Math.floor(bonusPoints * 0.3)}`
  );
}

function getJourneyState() {
  try {
    const saved = localStorage.getItem(JOURNEY_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return JSON.parse(JSON.stringify(JourneyState));
  } catch {
    return JSON.parse(JSON.stringify(JourneyState));
  }
}

function saveJourneyState(state) {
  try {
    localStorage.setItem(JOURNEY_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save journey state');
  }
}

function initJourney() {
  const state = getJourneyState();

  // Check for existing journey
  if (state.chapter > 1 && !state.completed) {
    document.getElementById('journey-continue').style.display = 'block';
  }

  // Event listeners
  document.getElementById('journey-start-btn').addEventListener('click', startNewJourney);
  document.getElementById('journey-continue-btn')?.addEventListener('click', continueJourney);
  document.getElementById('journey-restart-btn')?.addEventListener('click', startNewJourney);
  document.getElementById('outcome-continue-btn')?.addEventListener('click', nextChapter);
  document.getElementById('journey-replay-btn')?.addEventListener('click', startNewJourney);
  document.getElementById('journey-share-btn')?.addEventListener('click', shareJourneyResults);
}

function startNewJourney() {
  const freshState = JSON.parse(JSON.stringify(JourneyState));
  saveJourneyState(freshState);

  // Clear any running timer
  if (finalTestState.timerInterval) {
    clearInterval(finalTestState.timerInterval);
  }

  document.getElementById('journey-intro').style.display = 'none';
  document.getElementById('journey-end').style.display = 'none';
  document.getElementById('journey-game').style.display = 'block';
  document.getElementById('journey-story').style.display = 'block';
  document.getElementById('journey-final-test').style.display = 'none';

  updateJourneyStats(freshState);
  loadChapter(1);
}

function continueJourney() {
  const state = getJourneyState();

  document.getElementById('journey-intro').style.display = 'none';
  document.getElementById('journey-end').style.display = 'none';
  document.getElementById('journey-game').style.display = 'block';

  // Reset visibility - loadChapter will set correct visibility
  document.getElementById('journey-story').style.display = 'block';
  document.getElementById('journey-final-test').style.display = 'none';

  updateJourneyStats(state);
  loadChapter(state.chapter);
}

function updateJourneyStats(state) {
  const stats = state.stats;

  // Update stat bars
  document.getElementById('stat-diamond').style.width =
    Math.min(100, Math.max(0, stats.diamond)) + '%';
  document.getElementById('stat-knowledge').style.width =
    Math.min(100, Math.max(0, stats.knowledge)) + '%';
  document.getElementById('stat-community').style.width =
    Math.min(100, Math.max(0, stats.community)) + '%';

  document.getElementById('stat-diamond-val').textContent = Math.max(0, stats.diamond);
  document.getElementById('stat-knowledge-val').textContent = Math.max(0, stats.knowledge);
  document.getElementById('stat-community-val').textContent = Math.max(0, stats.community);

  document.getElementById('stat-portfolio').textContent =
    stats.portfolio.toLocaleString() + ' ASDF';

  // Update chapter dots
  const dots = document.querySelectorAll('.chapter-dot');
  const connectors = document.querySelectorAll('.chapter-connector');

  dots.forEach((dot, i) => {
    dot.classList.remove('active', 'completed');
    if (i + 1 < state.chapter) {
      dot.classList.add('completed');
    } else if (i + 1 === state.chapter) {
      dot.classList.add('active');
    }
  });

  connectors.forEach((conn, i) => {
    conn.classList.toggle('active', i + 1 < state.chapter);
  });
}

function loadChapter(chapterNum) {
  // Chapter 7 is the Final Test (gamified)
  if (chapterNum === 7) {
    startFinalTest();
    return;
  }

  if (chapterNum > JOURNEY_CHAPTERS.length) {
    endJourney();
    return;
  }

  const chapter = JOURNEY_CHAPTERS[chapterNum - 1];
  const state = getJourneyState();
  state.chapter = chapterNum;
  saveJourneyState(state);

  document.getElementById('story-chapter').textContent = 'Chapter ' + chapterNum;
  document.getElementById('story-title').textContent = chapter.title;
  document.getElementById('scene-visual').textContent = chapter.visual;
  safeInnerHTML(document.getElementById('scene-text'), chapter.text);

  // Hide outcome, show choices
  document.getElementById('story-outcome').style.display = 'none';
  const choicesContainer = document.getElementById('story-choices');
  choicesContainer.style.display = 'flex';
  choicesContainer.innerHTML = '';

  chapter.choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'story-choice';
    safeInnerHTML(
      btn,
      `
                    <span class="choice-icon">${escapeHtml(choice.icon)}</span>
                    <div class="choice-content">
                        <div class="choice-text">${escapeHtml(choice.text)}</div>
                        <div class="choice-hint">${escapeHtml(choice.hint)}</div>
                    </div>
                    <span class="choice-arrow">→</span>
                `
    );
    btn.addEventListener('click', () => makeChoice(chapterNum, choice));
    choicesContainer.appendChild(btn);
  });

  updateJourneyStats(state);
}

function makeChoice(chapterNum, choice) {
  const state = getJourneyState();

  // Apply effects
  state.stats.diamond += choice.effects.diamond;
  state.stats.knowledge += choice.effects.knowledge;
  state.stats.community += choice.effects.community;
  state.stats.portfolio += choice.effects.portfolio;

  // Clamp stats to 0-100
  state.stats.diamond = Math.max(0, Math.min(100, state.stats.diamond));
  state.stats.knowledge = Math.max(0, Math.min(100, state.stats.knowledge));
  state.stats.community = Math.max(0, Math.min(100, state.stats.community));

  // Record choice and lesson
  state.choicesMade.push({ chapter: chapterNum, choiceId: choice.id });
  if (choice.lesson && !state.lessonsLearned.includes(choice.lesson)) {
    state.lessonsLearned.push(choice.lesson);
  }

  saveJourneyState(state);
  updateJourneyStats(state);

  // Show outcome
  document.getElementById('story-choices').style.display = 'none';
  const outcomeEl = document.getElementById('story-outcome');
  outcomeEl.style.display = 'block';

  safeInnerHTML(document.getElementById('outcome-content'), choice.outcome);

  // Show stat changes
  const statsHtml = [];
  if (choice.effects.diamond !== 0) {
    statsHtml.push(
      `<span class="outcome-stat ${choice.effects.diamond > 0 ? 'positive' : 'negative'}">💎 ${choice.effects.diamond > 0 ? '+' : ''}${choice.effects.diamond}</span>`
    );
  }
  if (choice.effects.knowledge !== 0) {
    statsHtml.push(
      `<span class="outcome-stat ${choice.effects.knowledge > 0 ? 'positive' : 'negative'}">🧠 ${choice.effects.knowledge > 0 ? '+' : ''}${choice.effects.knowledge}</span>`
    );
  }
  if (choice.effects.community !== 0) {
    statsHtml.push(
      `<span class="outcome-stat ${choice.effects.community > 0 ? 'positive' : 'negative'}">🤝 ${choice.effects.community > 0 ? '+' : ''}${choice.effects.community}</span>`
    );
  }
  if (choice.effects.portfolio !== 0) {
    statsHtml.push(
      `<span class="outcome-stat ${choice.effects.portfolio > 0 ? 'positive' : 'negative'}">💰 ${choice.effects.portfolio > 0 ? '+' : ''}${choice.effects.portfolio}</span>`
    );
  }
  safeInnerHTML(document.getElementById('outcome-stats'), statsHtml.join(''));
}

function nextChapter() {
  const state = getJourneyState();
  loadChapter(state.chapter + 1);
}

function endJourney() {
  const state = getJourneyState();
  state.completed = true;
  saveJourneyState(state);

  document.getElementById('journey-game').style.display = 'none';
  document.getElementById('journey-end').style.display = 'block';

  // Determine archetype
  const archetype =
    JOURNEY_ARCHETYPES.find(a => a.condition(state.stats)) ||
    JOURNEY_ARCHETYPES[JOURNEY_ARCHETYPES.length - 1];

  document.getElementById('archetype-badge').textContent = archetype.badge;
  document.getElementById('archetype-name').textContent = archetype.name;
  document.getElementById('archetype-desc').textContent = archetype.desc;

  // Final stats
  document.getElementById('final-diamond').textContent = state.stats.diamond;
  document.getElementById('final-knowledge').textContent = state.stats.knowledge;
  document.getElementById('final-community').textContent = state.stats.community;
  document.getElementById('final-portfolio').textContent = state.stats.portfolio.toLocaleString();

  // Lessons learned
  const lessonsList = document.getElementById('lessons-list');
  lessonsList.innerHTML = '';
  state.lessonsLearned.forEach(lesson => {
    const li = document.createElement('li');
    li.textContent = lesson;
    lessonsList.appendChild(li);
  });

  // XP reward based on performance
  const totalScore = state.stats.diamond + state.stats.knowledge + state.stats.community;
  const xpReward = Math.floor(50 + totalScore / 3);
  document.getElementById('journey-xp-reward').textContent = '+' + xpReward + ' XP';
  addXP(xpReward);
}

function shareJourneyResults() {
  const state = getJourneyState();
  const archetype =
    JOURNEY_ARCHETYPES.find(a => a.condition(state.stats)) ||
    JOURNEY_ARCHETYPES[JOURNEY_ARCHETYPES.length - 1];

  const text = `I completed Journey du Holder! ${archetype.badge}

My archetype: ${archetype.name}
💎 Diamond Hands: ${state.stats.diamond}
🧠 Knowledge: ${state.stats.knowledge}
🤝 Community: ${state.stats.community}

Play at alonisthe.dev/learn #ASDF #ThisIsFine`;

  const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ============================================
// DAILY STREAK
// ============================================

function updateStreak() {
  const gs = getGameState();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (gs.lastPlayDate === today) {
    // Already played today
  } else if (gs.lastPlayDate === yesterday) {
    // Streak continues
    gs.streak = Math.min(7, gs.streak + 1);
    gs.lastPlayDate = today;
    saveGameState(gs);
  } else if (gs.lastPlayDate) {
    // Streak broken
    gs.streak = 1;
    gs.lastPlayDate = today;
    saveGameState(gs);
  } else {
    // First time
    gs.streak = 1;
    gs.lastPlayDate = today;
    saveGameState(gs);
  }

  // Update UI
  const streakDays = document.querySelectorAll('.streak-day');
  streakDays.forEach((day, i) => {
    day.classList.remove('active', 'today');
    if (i < gs.streak) day.classList.add('active');
    if (i === gs.streak - 1) day.classList.add('today');
  });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const state = getState();

  // Set start time if not set
  if (!state.startTime) {
    state.startTime = Date.now();
    saveState(state);
  }

  updateNavigation();
  updateXPDisplay();
  updateBadges();
  updateLeaderboard();
  updateHighScores();
  updateStreak();
  initClicker();
  initDefenseField();
  initJourney();
  initPathSelector();

  // Go to current level
  goToLevel(state.currentLevel);

  // Re-enable buttons for completed quizzes (from completedQuizzes or completedLevels)
  const quizzesToRestore = new Set([...(state.completedQuizzes || []), ...state.completedLevels]);
  quizzesToRestore.forEach(level => {
    const nextBtn = document.getElementById('unlock-level-' + (level + 1));
    if (nextBtn) nextBtn.disabled = false;
  });
  // Also enable complete-course button if level 5 quiz was completed
  if (quizzesToRestore.has(5)) {
    const completeBtn = document.getElementById('complete-course');
    if (completeBtn) completeBtn.disabled = false;
  }

  // Show completion if already done
  if (state.courseCompleted) {
    document.getElementById('completion-banner').style.display = 'block';
    document.getElementById('level-5-actions').style.display = 'none';
  }

  // Easter Egg: Check if home is unlocked or badge should show
  checkHomeUnlocked();

  // Easter Egg: Badge click opens pill modal
  const completionBadge = document.getElementById('completion-badge');
  if (completionBadge) {
    completionBadge.addEventListener('click', showPillModal);
  }

  // Easter Egg: Pill modal buttons
  const pillYes = document.getElementById('pill-yes');
  const pillNo = document.getElementById('pill-no');

  if (pillYes) {
    pillYes.addEventListener('click', unlockHome);
  }

  if (pillNo) {
    pillNo.addEventListener('click', resetLearnProgress);
  }

  // Share on X button
  const shareBtn = document.querySelector('.btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareCompletion);
  }

  // Easter Egg: Close pill modal on background click
  const pillModal = document.getElementById('pill-modal');
  if (pillModal) {
    pillModal.addEventListener('click', e => {
      if (e.target === pillModal) {
        hidePillModal();
      }
    });
  }

  // Catch check interval for Token Catcher
  setInterval(() => {
    if (document.getElementById('game-catcher').classList.contains('active')) {
      checkCatch();
    }
  }, 50);

  // Nav-tab click handlers for view switching
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      const text = this.textContent.toLowerCase().trim();
      // Skip dropdown triggers and Tools dropdown
      if (this.classList.contains('nav-tab-trigger')) return;

      // Map button text to view names
      const viewMap = {
        learn: 'learn',
        build: 'build',
        play: 'play',
        games: 'games',
        'faq/glossary': 'faq-glossary',
      };

      const viewName = viewMap[text];
      if (viewName) {
        switchView(viewName);
      }
    });
  });

  // Handle URL hash for direct linking
  function handleHashChange() {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('view-')) {
      const viewName = hash.replace('view-', '');
      switchView(viewName);
    } else if (hash === 'find-your-path') {
      // Switch to build view and open Project Finder modal
      switchView('build');
      setTimeout(() => {
        const projectFinderBtn = document.getElementById('project-finder-btn');
        if (projectFinderBtn) projectFinderBtn.click();
      }, 100);
    } else if (hash === 'your-journey') {
      // Switch to build view and open Your Journey modal
      switchView('build');
      setTimeout(() => {
        const yourJourneyBtn = document.getElementById('your-journey-btn');
        if (yourJourneyBtn) yourJourneyBtn.click();
      }, 100);
    }
  }
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
});

// ============================================
// PROJECT FINDER - Build Section Quiz
// ============================================

const PROJECT_FINDER_STORAGE = 'asdf_project_finder_data';

const PROJECT_FINDER_QUESTIONS = [
  {
    id: 'skill',
    question: "What's your skill level?",
    subtitle: "Be honest - we'll find the right fit",
    options: [
      { id: 'beginner', icon: '🌱', label: 'Beginner', desc: 'New to crypto/coding' },
      { id: 'intermediate', icon: '🌿', label: 'Intermediate', desc: 'Some experience' },
      { id: 'advanced', icon: '🌳', label: 'Advanced', desc: 'Experienced builder' },
    ],
  },
  {
    id: 'interest',
    question: 'What interests you most?',
    subtitle: 'Pick your main area of focus',
    options: [
      { id: 'code', icon: '💻', label: 'Code & Dev', desc: 'Smart contracts, bots, tools' },
      { id: 'design', icon: '🎨', label: 'Design & UX', desc: 'Visuals, interfaces, branding' },
      { id: 'content', icon: '✍️', label: 'Content', desc: 'Writing, videos, education' },
      { id: 'community', icon: '🤝', label: 'Community', desc: 'Moderation, support, growth' },
    ],
  },
  {
    id: 'time',
    question: 'How much time can you invest?',
    subtitle: 'Weekly commitment',
    options: [
      { id: 'minimal', icon: '⏰', label: '1-2 hours', desc: 'Light involvement' },
      { id: 'moderate', icon: '📅', label: '5-10 hours', desc: 'Regular contributor' },
      { id: 'dedicated', icon: '🔥', label: '10+ hours', desc: 'Dedicated builder' },
    ],
  },
  {
    id: 'goal',
    question: "What's your main goal?",
    subtitle: 'What do you want to achieve?',
    options: [
      { id: 'learn', icon: '📚', label: 'Learn', desc: 'Gain new skills' },
      { id: 'contribute', icon: '🛠️', label: 'Contribute', desc: 'Help existing projects' },
      { id: 'create', icon: '🚀', label: 'Create', desc: 'Build something new' },
      { id: 'earn', icon: '💰', label: 'Earn', desc: 'Monetize skills' },
    ],
  },
];

const PROJECT_RECOMMENDATIONS = {
  // Beginner paths
  'beginner-content-minimal-learn': {
    icon: '📝',
    name: 'Content Creator Starter',
    desc: 'Start by creating simple educational content - tweets, threads, or memes about ASDF. Perfect for learning while contributing.',
    tags: ['Low commitment', 'Creative', 'Learning'],
    link: 'build.html#marketplace',
    pillar: 'content',
    level: 'beginner',
  },
  'beginner-community-minimal-learn': {
    icon: '💬',
    name: 'Community Helper',
    desc: 'Join Discord and help answer questions from newcomers. Great way to learn the ecosystem while building reputation.',
    tags: ['Social', 'Supportive', 'Flexible'],
    link: 'build.html#marketplace',
    pillar: 'community',
    level: 'beginner',
  },
  'beginner-code-moderate-learn': {
    icon: '🎓',
    name: 'Dev Academy Path',
    desc: 'Follow our tutorials to learn Solana development. Start with simple scripts and work your way up to smart contracts.',
    tags: ['Educational', 'Structured', 'Technical'],
    link: 'build.html#yggdrasil',
    pillar: 'code',
    level: 'beginner',
  },
  'beginner-design-minimal-contribute': {
    icon: '🎨',
    name: 'Meme Factory',
    desc: 'Create memes and visual content for the community. Low barrier, high impact, and lots of fun.',
    tags: ['Creative', 'Fun', 'Community'],
    link: 'build.html#marketplace',
    pillar: 'design',
    level: 'beginner',
  },

  // Intermediate paths
  'intermediate-code-moderate-contribute': {
    icon: '🔧',
    name: 'Tool Contributor',
    desc: 'Help improve existing ASDF tools - fix bugs, add features, or optimize performance. Real impact, real learning.',
    tags: ['Technical', 'Collaborative', 'Impactful'],
    link: 'build.html#yggdrasil',
    pillar: 'code',
    level: 'intermediate',
  },
  'intermediate-code-dedicated-create': {
    icon: '🤖',
    name: 'Bot Builder',
    desc: 'Build Discord bots, trading tools, or automation scripts for the ecosystem. High demand, high visibility.',
    tags: ['Technical', 'Creative', 'In-demand'],
    link: 'build.html#yggdrasil',
    pillar: 'code',
    level: 'intermediate',
  },
  'intermediate-design-moderate-create': {
    icon: '🖼️',
    name: 'UI/UX Designer',
    desc: 'Design interfaces for ASDF apps and tools. Help make the ecosystem more beautiful and user-friendly.',
    tags: ['Creative', 'Visual', 'User-focused'],
    link: 'build.html#marketplace',
    pillar: 'design',
    level: 'intermediate',
  },
  'intermediate-content-dedicated-earn': {
    icon: '📹',
    name: 'Content Producer',
    desc: 'Create tutorials, reviews, and educational videos. Build an audience while earning through content.',
    tags: ['Creative', 'Educational', 'Monetizable'],
    link: 'build.html#marketplace',
    pillar: 'content',
    level: 'intermediate',
  },

  // Advanced paths
  'advanced-code-dedicated-create': {
    icon: '⚡',
    name: 'Core Developer',
    desc: 'Build new tools, smart contracts, or infrastructure for the ASDF ecosystem. Shape the future.',
    tags: ['Technical', 'Leadership', 'High-impact'],
    link: 'build.html#yggdrasil',
    pillar: 'code',
    level: 'advanced',
  },
  'advanced-code-dedicated-earn': {
    icon: '💎',
    name: 'Protocol Engineer',
    desc: 'Work on DeFi integrations, advanced trading systems, or protocol improvements. Premium opportunities.',
    tags: ['Expert', 'DeFi', 'Lucrative'],
    link: 'build.html#yggdrasil',
    pillar: 'code',
    level: 'advanced',
  },
  'advanced-community-dedicated-contribute': {
    icon: '👑',
    name: 'Community Leader',
    desc: 'Lead initiatives, organize events, and help grow the ASDF community. Become a pillar of the ecosystem.',
    tags: ['Leadership', 'Strategic', 'Influential'],
    link: 'build.html#marketplace',
    pillar: 'community',
    level: 'advanced',
  },

  // Default fallback
  default: {
    icon: '🧭',
    name: 'Explorer Path',
    desc: "Browse the Yggdrasil tree and Marketplace to discover projects that match your unique profile. There's something for everyone.",
    tags: ['Flexible', 'Discovery', 'Open-ended'],
    link: 'build.html#yggdrasil',
    pillar: 'code',
    level: 'beginner',
  },
};

let projectFinderState = {
  currentQuestion: 0,
  answers: {},
  recommendation: null,
};

function openProjectFinder() {
  const modal = document.getElementById('project-finder-modal');
  if (modal) {
    projectFinderState = { currentQuestion: 0, answers: {} };
    modal.classList.add('active');
    document.getElementById('project-finder-body').style.display = 'block';
    document.getElementById('project-finder-result').style.display = 'none';
    renderProjectFinderQuestion();
  }
}

function closeProjectFinder() {
  const modal = document.getElementById('project-finder-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function renderProjectFinderQuestion() {
  const q = PROJECT_FINDER_QUESTIONS[projectFinderState.currentQuestion];
  const total = PROJECT_FINDER_QUESTIONS.length;
  const progress = ((projectFinderState.currentQuestion + 1) / total) * 100;

  // Update progress
  document.getElementById('pf-progress-bar').style.width = progress + '%';
  document.getElementById('pf-progress-text').textContent =
    `Question ${projectFinderState.currentQuestion + 1}/${total}`;

  // Render question
  safeInnerHTML(
    document.getElementById('pf-question'),
    `
                <h3>${escapeHtml(q.question)}</h3>
                <p>${escapeHtml(q.subtitle)}</p>
            `
  );

  // Render options
  const optionsHtml = q.options
    .map(
      opt => `
                <div class="pf-option" data-question="${q.id}" data-value="${opt.id}">
                    <span class="pf-option-icon">${opt.icon}</span>
                    <div class="pf-option-text">
                        <strong>${opt.label}</strong>
                        <span>${opt.desc}</span>
                    </div>
                </div>
            `
    )
    .join('');

  safeInnerHTML(document.getElementById('pf-options'), optionsHtml);

  // Attach click handlers
  document.querySelectorAll('.pf-option').forEach(opt => {
    opt.addEventListener('click', function () {
      selectProjectFinderOption(this.dataset.question, this.dataset.value);
    });
  });
}

function selectProjectFinderOption(questionId, value) {
  projectFinderState.answers[questionId] = value;

  if (projectFinderState.currentQuestion < PROJECT_FINDER_QUESTIONS.length - 1) {
    projectFinderState.currentQuestion++;
    renderProjectFinderQuestion();
  } else {
    showProjectFinderResult();
  }
}

function showProjectFinderResult() {
  const answers = projectFinderState.answers;

  // Save data for analytics
  saveProjectFinderData(answers);

  // Build recommendation key
  const key = `${answers.skill}-${answers.interest}-${answers.time}-${answers.goal}`;
  let recommendation = PROJECT_RECOMMENDATIONS[key];

  // Try partial matches if exact match not found
  if (!recommendation) {
    const partialKey = `${answers.skill}-${answers.interest}-${answers.time}-${answers.goal}`;
    for (const recKey in PROJECT_RECOMMENDATIONS) {
      if (recKey.includes(answers.skill) && recKey.includes(answers.interest)) {
        recommendation = PROJECT_RECOMMENDATIONS[recKey];
        break;
      }
    }
  }

  // Fallback to default
  if (!recommendation) {
    recommendation = PROJECT_RECOMMENDATIONS['default'];
  }

  // Store recommendation for journey start
  projectFinderState.recommendation = recommendation;

  // Hide questions, show result
  document.getElementById('project-finder-body').style.display = 'none';
  const resultDiv = document.getElementById('project-finder-result');
  resultDiv.style.display = 'block';

  document.getElementById('pf-result-icon').textContent = recommendation.icon;
  safeInnerHTML(
    document.getElementById('pf-result-project'),
    `
                <h4>${escapeHtml(recommendation.icon)} ${escapeHtml(recommendation.name)}</h4>
                <p>${escapeHtml(recommendation.desc)}</p>
                <div class="pf-result-tags">
                    ${recommendation.tags.map(tag => `<span class="pf-result-tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            `
  );

  // Update explore button link
  document.getElementById('pf-explore-btn').href = recommendation.link;
}

function startJourneyFromFinder() {
  const rec = projectFinderState.recommendation;
  if (rec && rec.pillar) {
    closeProjectFinder();
    // Open Your Journey with the recommended pillar
    openYourJourney(rec.pillar, rec.level);
  }
}

function saveProjectFinderData(answers) {
  try {
    const existingData = JSON.parse(localStorage.getItem(PROJECT_FINDER_STORAGE) || '[]');
    const entry = {
      timestamp: new Date().toISOString(),
      answers: answers,
      userAgent: navigator.userAgent.substring(0, 100),
    };
    existingData.push(entry);
    // Keep only last 50 entries
    if (existingData.length > 50) {
      existingData.shift();
    }
    localStorage.setItem(PROJECT_FINDER_STORAGE, JSON.stringify(existingData));
  } catch (e) {
    console.warn('Could not save project finder data');
  }
}

function restartProjectFinder() {
  projectFinderState = { currentQuestion: 0, answers: {} };
  document.getElementById('project-finder-body').style.display = 'block';
  document.getElementById('project-finder-result').style.display = 'none';
  renderProjectFinderQuestion();
}

// ============================================
// YOUR JOURNEY - Builder Training Platform
// ============================================

const YJ_STORAGE_KEY = 'asdf_your_journey';

// Learning flow steps
const LEARNING_STEPS = {
  ENTRY_QUIZ: 'entry-quiz',
  COURSE: 'course',
  KNOWLEDGE_QUIZ: 'knowledge-quiz',
  DEEP_CONTENT: 'deep-content',
  PRACTICE: 'practice',
};

const JOURNEY_PILLARS = {
  code: {
    icon: '💻',
    name: 'Code & Dev',
    levels: ['beginner', 'intermediate', 'advanced'],
    modules: {
      beginner: [
        {
          id: 'code-b1',
          title: 'Welcome to ASDF Development',

          // STEP 1: Entry Quiz - Assess current knowledge
          entryQuiz: {
            intro: "Let's see what you already know! This helps us personalize your learning.",
            questions: [
              {
                question: 'Have you ever used a crypto wallet?',
                options: ['Yes, I use one regularly', "I've tried it once or twice", 'No, never'],
                type: 'assessment', // No right/wrong, just gauging experience
              },
              {
                question: 'What is a blockchain?',
                options: [
                  'A distributed database shared across computers',
                  'A type of cryptocurrency',
                  'A website for trading',
                  "I'm not sure",
                ],
                correct: 0,
              },
              {
                question: "What does 'deflationary' mean for a token?",
                options: [
                  'Supply increases over time',
                  'Supply decreases over time',
                  'Price always goes up',
                  "I don't know yet",
                ],
                correct: 1,
              },
            ],
          },

          // STEP 2: Core Course Content
          course: [
            {
              title: 'Welcome to Your Journey',
              content: `
                                        <p>Welcome to the ASDF developer path! Whether you're completely new to coding or just new to blockchain, this journey will take you from zero to building real tools.</p>
                                        <div class="yj-objectives">
                                            <h4>🎯 What You'll Learn</h4>
                                            <ul>
                                                <li>Blockchain basics and how Solana works</li>
                                                <li>JavaScript fundamentals for blockchain</li>
                                                <li>How to interact with the Solana network</li>
                                                <li>Building your first ASDF tool</li>
                                            </ul>
                                        </div>
                                    `,
            },
            {
              title: 'What is ASDF?',
              content: `
                                        <p><strong>ASDF</strong> is a deflationary token on Solana. Here's what makes it unique:</p>
                                        <div class="yj-feature-cards">
                                            <div class="yj-feature-card">
                                                <span>🔥</span>
                                                <strong>Deflationary</strong>
                                                <p>Tokens are burned regularly, reducing supply</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>👥</span>
                                                <strong>Community-Driven</strong>
                                                <p>Built by builders, for builders</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🔍</span>
                                                <strong>Transparent</strong>
                                                <p>All burns verifiable on-chain</p>
                                            </div>
                                        </div>
                                        <div class="yj-key-concept">
                                            <strong>🔥 Token Burning</strong>
                                            <p>Burning means sending tokens to an inaccessible address, permanently removing them from circulation. This reduces total supply over time.</p>
                                        </div>
                                    `,
            },
            {
              title: 'Why Solana?',
              content: `
                                        <p>ASDF chose <strong>Solana</strong> for its speed and low costs:</p>
                                        <table class="yj-comparison-table">
                                            <tr><th></th><th>Solana</th><th>Ethereum</th></tr>
                                            <tr><td>Speed</td><td class="highlight">~400ms</td><td>~12 sec</td></tr>
                                            <tr><td>Cost</td><td class="highlight">~$0.00025</td><td>$1-50+</td></tr>
                                            <tr><td>TPS</td><td class="highlight">65,000+</td><td>~15</td></tr>
                                        </table>
                                        <p>This makes Solana perfect for frequent burns, real-time bots, and micro-transactions.</p>
                                    `,
            },
          ],

          // STEP 3: Knowledge Quiz - Validate learning
          quiz: {
            intro: "Let's check what you've learned!",
            passingScore: 70,
            questions: [
              {
                question: 'What blockchain does ASDF run on?',
                options: ['Ethereum', 'Solana', 'Bitcoin', 'Polygon'],
                correct: 1,
                explanation: 'ASDF is built on Solana for its speed and low transaction costs.',
              },
              {
                question: "What does 'burning' tokens mean?",
                options: [
                  'Selling them quickly',
                  'Sending them to an inaccessible address permanently',
                  'Converting them to another token',
                  'Staking them for rewards',
                ],
                correct: 1,
                explanation:
                  'Burning permanently removes tokens from circulation by sending them to an address no one can access.',
              },
              {
                question: "Why is ASDF called 'deflationary'?",
                options: [
                  'The price always decreases',
                  'The total supply decreases over time',
                  "It's related to inflation rates",
                  'Transactions cost less over time',
                ],
                correct: 1,
                explanation: 'Deflationary means the total supply shrinks as tokens are burned.',
              },
            ],
          },

          // STEP 4: Deep Content - Advanced material
          deepContent: [
            {
              title: 'Solana Technical Deep Dive',
              content: `
                                        <h4>How Solana Achieves Speed</h4>
                                        <p>Solana uses several innovations:</p>
                                        <ul>
                                            <li><strong>Proof of History (PoH):</strong> A cryptographic clock that timestamps transactions before consensus</li>
                                            <li><strong>Tower BFT:</strong> A optimized version of PBFT that leverages PoH</li>
                                            <li><strong>Gulf Stream:</strong> Mempool-less transaction forwarding</li>
                                            <li><strong>Turbine:</strong> Block propagation protocol</li>
                                        </ul>
                                        <h4>SPL Token Standard</h4>
                                        <p>ASDF is an <strong>SPL Token</strong> (Solana Program Library Token). This is Solana's equivalent to Ethereum's ERC-20 standard.</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">ASDF Token Details</div>
                                            <pre><code>Mint Address: 2P2Apwbo6jPsGDJ6YKEhGxkgibMVnL9p6mLbx8hPump
Decimals: 6
Total Supply: Dynamic (decreasing via burns)</code></pre>
                                        </div>
                                    `,
            },
            {
              title: 'Understanding Token Economics',
              content: `
                                        <h4>Supply & Demand Dynamics</h4>
                                        <p>In traditional economics:</p>
                                        <ul>
                                            <li><strong>Inflationary:</strong> More units created → each unit worth less</li>
                                            <li><strong>Deflationary:</strong> Units destroyed → remaining units potentially worth more</li>
                                        </ul>
                                        <h4>ASDF Burn Mechanics</h4>
                                        <p>Tokens can be burned through:</p>
                                        <ol>
                                            <li>Trading activity fees</li>
                                            <li>Community burn events</li>
                                            <li>Game mechanics and activities</li>
                                            <li>Voluntary contributions</li>
                                        </ol>
                                        <div class="yj-warning">
                                            <strong>⚠️ Note:</strong> Deflationary mechanics don't guarantee price increases. Value depends on many factors including utility and demand.
                                        </div>
                                    `,
            },
          ],

          // STEP 5: Practice Exercises - Hands-on learning
          practice: [
            {
              type: 'fill-blank',
              id: 'practice-1',
              title: 'Complete the Concept',
              instruction: 'Fill in the blanks to test your understanding:',
              questions: [
                {
                  text: 'ASDF is a _____ token, meaning the supply _____ over time.',
                  blanks: ['deflationary', 'decreases'],
                  hints: ['Opposite of inflationary', 'Gets smaller'],
                },
                {
                  text: 'Token burning sends tokens to an _____ address, permanently _____ them from circulation.',
                  blanks: ['inaccessible', 'removing'],
                  hints: ['No one can access it', 'Taking away'],
                },
              ],
            },
            {
              type: 'explorer',
              id: 'practice-2',
              title: 'Explore the Blockchain',
              instruction: 'Use Solscan to explore real ASDF data:',
              tasks: [
                {
                  task: 'Find the ASDF token on Solscan',
                  hint: 'Go to solscan.io and search for the mint address',
                  verification: 'screenshot',
                },
                {
                  task: 'Look at recent token transfers',
                  hint: 'Check the "Transfers" tab',
                  verification: 'answer',
                  question: 'Approximately how many transfers happened in the last hour?',
                },
              ],
            },
            {
              type: 'quiz-challenge',
              id: 'practice-3',
              title: 'Speed Challenge',
              instruction: 'Answer as many as you can in 60 seconds!',
              timeLimit: 60,
              questions: [
                { q: 'Solana or Ethereum - which is faster?', a: 'Solana' },
                { q: 'What does burning tokens do to supply?', a: 'Decreases it' },
                { q: 'Is ASDF inflationary or deflationary?', a: 'Deflationary' },
                { q: 'What currency pays Solana fees?', a: 'SOL' },
                { q: 'Can burned tokens be recovered?', a: 'No' },
              ],
            },
          ],
        },
        {
          id: 'code-b2',
          title: 'Understanding Blockchain Basics',
          sections: [
            {
              title: 'What is a Blockchain?',
              content: `
                                        <p>A <strong>blockchain</strong> is a distributed ledger - think of it as a shared database that everyone can read but no single person controls.</p>
                                        <div class="yj-diagram">
                                            <div class="yj-diagram-block">Block 1<br><small>Transactions 1-100</small></div>
                                            <div class="yj-diagram-arrow">→</div>
                                            <div class="yj-diagram-block">Block 2<br><small>Transactions 101-200</small></div>
                                            <div class="yj-diagram-arrow">→</div>
                                            <div class="yj-diagram-block">Block 3<br><small>Transactions 201-300</small></div>
                                        </div>
                                        <p>Each block contains:</p>
                                        <ul>
                                            <li>A list of transactions</li>
                                            <li>A timestamp</li>
                                            <li>A reference to the previous block (creating the "chain")</li>
                                            <li>A cryptographic hash (unique fingerprint)</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Transactions',
              content: `
                                        <p><strong>Transactions</strong> are the actions recorded on the blockchain. On Solana, every action is a transaction:</p>
                                        <ul>
                                            <li><strong>Transfer:</strong> Send tokens from one wallet to another</li>
                                            <li><strong>Burn:</strong> Send tokens to an inaccessible address</li>
                                            <li><strong>Swap:</strong> Exchange one token for another</li>
                                            <li><strong>Mint:</strong> Create new tokens (for NFTs)</li>
                                        </ul>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Example Transaction</div>
                                            <pre><code>{
  "from": "ABC123...xyz",
  "to": "DEF456...uvw",
  "amount": 1000,
  "token": "ASDF",
  "fee": 0.000005,
  "signature": "5xY9..."
}</code></pre>
                                        </div>
                                        <p>Every transaction requires a small fee (paid in SOL) to compensate the network validators.</p>
                                    `,
            },
            {
              title: 'Wallets & Keys',
              content: `
                                        <p>Your <strong>wallet</strong> is your identity on the blockchain. It's controlled by cryptographic keys:</p>
                                        <div class="yj-key-diagram">
                                            <div class="yj-key-box yj-key-public">
                                                <strong>🔓 Public Key (Address)</strong>
                                                <p>Like your email address</p>
                                                <ul>
                                                    <li>Safe to share</li>
                                                    <li>Others use it to send you tokens</li>
                                                    <li>Example: <code>7xKX...9Pq2</code></li>
                                                </ul>
                                            </div>
                                            <div class="yj-key-box yj-key-private">
                                                <strong>🔐 Private Key / Seed Phrase</strong>
                                                <p>Like your password</p>
                                                <ul>
                                                    <li><strong>NEVER share!</strong></li>
                                                    <li>Proves you own the wallet</li>
                                                    <li>12-24 random words</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="yj-warning"><strong>⚠️ Critical Security Rule:</strong> Never share your private key or seed phrase with anyone! No legitimate service will ever ask for it. Anyone with your seed phrase can steal all your funds.</div>
                                    `,
            },
            {
              title: 'Smart Contracts & Tokens',
              content: `
                                        <p><strong>Smart Contracts</strong> (called "Programs" on Solana) are code that runs on the blockchain. They enable:</p>
                                        <ul>
                                            <li>Automated token transfers based on rules</li>
                                            <li>Decentralized exchanges (DEXs)</li>
                                            <li>NFT minting and trading</li>
                                            <li>DeFi protocols (lending, staking)</li>
                                        </ul>
                                        <p><strong>Tokens</strong> are digital assets created using smart contracts. ASDF is an <strong>SPL Token</strong> (Solana Program Library Token), the standard token format on Solana.</p>
                                        <div class="yj-info"><strong>📝 Note:</strong> You don't need to write smart contracts to build useful tools! Most ASDF tools just read blockchain data and display it.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What controls access to your blockchain wallet?',
            options: [
              'Email and password',
              'Private key / Seed phrase',
              'Username',
              'Phone number',
            ],
            correct: 1,
          },
        },
        {
          id: 'code-b3',
          title: 'Setting Up Your Dev Environment',
          sections: [
            {
              title: 'Tools Overview',
              content: `
                                        <p>Before writing code, you need to set up your development environment. Here's what you'll install:</p>
                                        <div class="yj-tools-grid">
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">📦</span>
                                                <strong>Node.js</strong>
                                                <p>JavaScript runtime that lets you run JS outside the browser</p>
                                            </div>
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">📝</span>
                                                <strong>VS Code</strong>
                                                <p>Code editor with great extensions for web development</p>
                                            </div>
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">🔀</span>
                                                <strong>Git</strong>
                                                <p>Version control to track changes and collaborate</p>
                                            </div>
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">👻</span>
                                                <strong>Phantom</strong>
                                                <p>Solana wallet browser extension for testing</p>
                                            </div>
                                        </div>
                                    `,
            },
            {
              title: 'Installing Node.js',
              content: `
                                        <p><strong>Node.js</strong> is essential - it lets you run JavaScript code on your computer.</p>
                                        <h4>Step-by-step installation:</h4>
                                        <ol class="yj-steps">
                                            <li>Go to <code>nodejs.org</code></li>
                                            <li>Download the <strong>LTS</strong> (Long Term Support) version</li>
                                            <li>Run the installer and follow the prompts</li>
                                            <li>Restart your terminal/command prompt</li>
                                        </ol>
                                        <h4>Verify installation:</h4>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Terminal</div>
                                            <pre><code>node --version
# Should output: v20.x.x or higher

npm --version
# Should output: 10.x.x or higher</code></pre>
                                        </div>
                                        <div class="yj-tip"><strong>💡 What is npm?</strong> npm (Node Package Manager) comes with Node.js. It lets you install libraries (packages) that other developers have created.</div>
                                    `,
            },
            {
              title: 'Installing VS Code',
              content: `
                                        <p><strong>Visual Studio Code</strong> is a free, powerful code editor:</p>
                                        <ol class="yj-steps">
                                            <li>Go to <code>code.visualstudio.com</code></li>
                                            <li>Download for your operating system</li>
                                            <li>Run the installer</li>
                                        </ol>
                                        <h4>Recommended Extensions:</h4>
                                        <p>After installing VS Code, add these extensions (click the puzzle piece icon in the sidebar):</p>
                                        <ul>
                                            <li><strong>ESLint</strong> - Catches errors in your JavaScript</li>
                                            <li><strong>Prettier</strong> - Auto-formats your code</li>
                                            <li><strong>GitLens</strong> - Better Git integration</li>
                                        </ul>
                                        <div class="yj-info"><strong>🎨 Pro Tip:</strong> Try the "One Dark Pro" or "GitHub Dark" themes for a better coding experience!</div>
                                    `,
            },
            {
              title: 'Installing Phantom Wallet',
              content: `
                                        <p><strong>Phantom</strong> is the most popular Solana wallet. You'll use it to:</p>
                                        <ul>
                                            <li>Test your applications</li>
                                            <li>View token balances</li>
                                            <li>Sign transactions during development</li>
                                        </ul>
                                        <h4>Installation:</h4>
                                        <ol class="yj-steps">
                                            <li>Go to <code>phantom.app</code></li>
                                            <li>Click "Download" and select your browser</li>
                                            <li>Add the extension to your browser</li>
                                            <li>Create a new wallet (or import existing)</li>
                                            <li><strong>Save your seed phrase securely!</strong></li>
                                        </ol>
                                        <div class="yj-warning"><strong>⚠️ Security:</strong> Write your seed phrase on paper and store it safely. Never save it digitally or share it with anyone!</div>
                                        <h4>Getting Test SOL:</h4>
                                        <p>For development, you can use Solana's devnet (test network). Get free test SOL from a "faucet" - search "Solana devnet faucet" to find one.</p>
                                    `,
            },
            {
              title: 'Your First Project',
              content: `
                                        <p>Let's create your first project folder and verify everything works:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Terminal Commands</div>
                                            <pre><code># Create a new folder for ASDF projects
mkdir asdf-projects
cd asdf-projects

# Create your first project
mkdir my-first-tool
cd my-first-tool

# Initialize a Node.js project
npm init -y

# Install Solana Web3 library
npm install @solana/web3.js</code></pre>
                                        </div>
                                        <p>If all commands succeed without errors, congratulations! 🎉 Your development environment is ready!</p>
                                        <div class="yj-tip"><strong>💡 Next Steps:</strong> In the next module, we'll write our first code to connect to the Solana blockchain!</div>
                                    `,
            },
          ],
          quiz: {
            question: 'Which tool is used as a Solana wallet for testing?',
            options: ['MetaMask', 'Phantom', 'VS Code', 'Node.js'],
            correct: 1,
          },
        },
      ],
      intermediate: [
        {
          id: 'code-i1',
          title: 'Working with Solana Web3.js',
          sections: [
            {
              title: 'Introduction to Web3.js',
              content: `
                                        <p><strong>@solana/web3.js</strong> is the official JavaScript library for interacting with the Solana blockchain. It allows you to:</p>
                                        <ul>
                                            <li>Connect to Solana nodes (mainnet, devnet, testnet)</li>
                                            <li>Read blockchain data (balances, transactions, accounts)</li>
                                            <li>Send transactions</li>
                                            <li>Subscribe to real-time updates</li>
                                        </ul>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Installation</div>
                                            <pre><code>npm install @solana/web3.js</code></pre>
                                        </div>
                                    `,
            },
            {
              title: 'Connecting to Solana',
              content: `
                                        <p>The first step is creating a <strong>Connection</strong> object:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">connection.js</div>
                                            <pre><code>import { Connection, clusterApiUrl } from '@solana/web3.js';

// Connect to different networks
const mainnet = new Connection(clusterApiUrl('mainnet-beta'));
const devnet = new Connection(clusterApiUrl('devnet'));

// Or use a custom RPC endpoint (recommended for production)
const customRpc = new Connection('https://your-rpc-provider.com');

// Check connection
const version = await mainnet.getVersion();
console.log('Connected! Version:', version);</code></pre>
                                        </div>
                                        <div class="yj-info"><strong>💡 RPC Providers:</strong> For production apps, use a dedicated RPC provider like Helius, QuickNode, or Alchemy for better reliability and higher rate limits.</div>
                                    `,
            },
            {
              title: 'Working with Public Keys',
              content: `
                                        <p>Every Solana address is a <strong>PublicKey</strong>. Here's how to work with them:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">publickeys.js</div>
                                            <pre><code>import { PublicKey } from '@solana/web3.js';

// Create from a string (base58 encoded address)
const address = new PublicKey('7xKX9PqoSfMGUb7Bz...9Pq2');

// Validate an address
function isValidAddress(addr) {
    try {
        new PublicKey(addr);
        return true;
    } catch {
        return false;
    }
}

// Convert to string
console.log(address.toBase58()); // '7xKX9PqoSfMGUb7Bz...9Pq2'
console.log(address.toString()); // Same as toBase58()</code></pre>
                                        </div>
                                    `,
            },
            {
              title: 'Reading Account Data',
              content: `
                                        <p>Let's fetch data from the blockchain:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">read-data.js</div>
                                            <pre><code>import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const connection = new Connection(clusterApiUrl('mainnet-beta'));

// Get SOL balance
async function getSOLBalance(address) {
    const pubkey = new PublicKey(address);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
}

// Get account info
async function getAccountInfo(address) {
    const pubkey = new PublicKey(address);
    const info = await connection.getAccountInfo(pubkey);

    if (info) {
        console.log('Owner:', info.owner.toBase58());
        console.log('Lamports:', info.lamports);
        console.log('Data length:', info.data.length);
    }
    return info;
}

// Example usage
const balance = await getSOLBalance('your-wallet-address');
console.log('Balance: ' + balance + ' SOL');</code></pre>
                                        </div>
                                        <div class="yj-tip"><strong>💡 Lamports:</strong> 1 SOL = 1,000,000,000 lamports. Always divide by LAMPORTS_PER_SOL when displaying SOL amounts.</div>
                                    `,
            },
            {
              title: 'Error Handling Best Practices',
              content: `
                                        <p>Network requests can fail. Always use proper error handling:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">error-handling.js</div>
                                            <pre><code>async function safeGetBalance(address) {
    try {
        const pubkey = new PublicKey(address);
        const balance = await connection.getBalance(pubkey);
        return { success: true, balance: balance / LAMPORTS_PER_SOL };
    } catch (error) {
        if (error.message.includes('Invalid public key')) {
            return { success: false, error: 'Invalid wallet address' };
        }
        if (error.message.includes('429')) {
            return { success: false, error: 'Rate limited. Try again later.' };
        }
        return { success: false, error: 'Network error. Check connection.' };
    }
}

// Usage
const result = await safeGetBalance(userInput);
if (result.success) {
    console.log('Balance: ' + result.balance + ' SOL');
} else {
    console.error(result.error);
}</code></pre>
                                        </div>
                                        <div class="yj-warning"><strong>⚠️ Important:</strong> Never expose raw error messages to users - they may contain sensitive information.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What library is used to interact with Solana in JavaScript?',
            options: ['ethers.js', '@solana/web3.js', 'web3.py', 'solana-sdk'],
            correct: 1,
          },
        },
        {
          id: 'code-i2',
          title: 'Reading Token Data',
          sections: [
            {
              title: 'Understanding SPL Tokens',
              content: `
                                        <p><strong>SPL Tokens</strong> (Solana Program Library Tokens) are the standard token format on Solana. ASDF is an SPL token.</p>
                                        <p>Key concepts:</p>
                                        <ul>
                                            <li><strong>Mint:</strong> The "factory" that defines a token (supply, decimals, authority)</li>
                                            <li><strong>Token Account:</strong> A wallet's balance for a specific token</li>
                                            <li><strong>Associated Token Account (ATA):</strong> The default token account for a wallet</li>
                                        </ul>
                                        <div class="yj-diagram">
                                            <div class="yj-diagram-block">Mint<br><small>Token definition</small></div>
                                            <div class="yj-diagram-arrow">→</div>
                                            <div class="yj-diagram-block">Token Account<br><small>Wallet A: 1000 ASDF</small></div>
                                            <div class="yj-diagram-arrow">→</div>
                                            <div class="yj-diagram-block">Token Account<br><small>Wallet B: 500 ASDF</small></div>
                                        </div>
                                    `,
            },
            {
              title: 'Installing SPL Token Library',
              content: `
                                        <p>Install the SPL Token library to work with tokens:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Installation</div>
                                            <pre><code>npm install @solana/spl-token</code></pre>
                                        </div>
                                        <p>This library provides functions to:</p>
                                        <ul>
                                            <li>Read mint information (supply, decimals)</li>
                                            <li>Get token account balances</li>
                                            <li>Find associated token accounts</li>
                                            <li>Create and transfer tokens</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Reading Mint Information',
              content: `
                                        <p>The <strong>Mint</strong> contains the token's core information:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">read-mint.js</div>
                                            <pre><code>import { getMint } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');

// ASDF token mint address
const ASDF_MINT = new PublicKey('2P2Apwbo6jPsGDJ6YKEhGxkgibMVnL9p6mLbx8hPump');

async function getTokenInfo() {
    const mint = await getMint(connection, ASDF_MINT);

    console.log('=== ASDF Token Info ===');
    console.log('Decimals:', mint.decimals);
    console.log('Supply:', Number(mint.supply) / Math.pow(10, mint.decimals));
    console.log('Mint Authority:', mint.mintAuthority?.toBase58() || 'None (fixed supply)');
    console.log('Freeze Authority:', mint.freezeAuthority?.toBase58() || 'None');

    return mint;
}

getTokenInfo();</code></pre>
                                        </div>
                                        <div class="yj-info"><strong>📝 Note:</strong> Supply is returned as a BigInt in the smallest unit. Divide by 10^decimals to get the human-readable amount.</div>
                                    `,
            },
            {
              title: 'Getting Token Balances',
              content: `
                                        <p>To check how much of a token a wallet holds:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">token-balance.js</div>
                                            <pre><code>import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

async function getTokenBalance(walletAddress, mintAddress) {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(mintAddress);

    // Find the Associated Token Account
    const ata = await getAssociatedTokenAddress(mint, wallet);

    try {
        const tokenAccount = await getAccount(connection, ata);
        const mintInfo = await getMint(connection, mint);

        // Convert to human-readable
        const balance = Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals);

        return {
            address: ata.toBase58(),
            balance: balance,
            rawAmount: tokenAccount.amount.toString()
        };
    } catch (error) {
        // Account doesn't exist = 0 balance
        if (error.name === 'TokenAccountNotFoundError') {
            return { address: ata.toBase58(), balance: 0 };
        }
        throw error;
    }
}

// Usage
const result = await getTokenBalance('wallet-address', ASDF_MINT);
console.log('ASDF Balance: ' + result.balance.toLocaleString());</code></pre>
                                        </div>
                                    `,
            },
            {
              title: 'Practical Example: ASDF Tracker',
              content: `
                                        <p>Let's build a complete token tracker:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">asdf-tracker.js</div>
                                            <pre><code>import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

const ASDF_MINT = '2P2Apwbo6jPsGDJ6YKEhGxkgibMVnL9p6mLbx8hPump';
const BURN_ADDRESS = '1nc1nerator11111111111111111111111111111111';

class ASDFTracker {
    constructor(rpcUrl) {
        this.connection = new Connection(rpcUrl);
        this.mint = new PublicKey(ASDF_MINT);
    }

    async getSupplyInfo() {
        const mint = await getMint(this.connection, this.mint);
        const decimals = mint.decimals;
        const totalSupply = Number(mint.supply) / Math.pow(10, decimals);

        // Get burned amount
        const burnAta = await getAssociatedTokenAddress(
            this.mint,
            new PublicKey(BURN_ADDRESS)
        );

        let burned = 0;
        try {
            const burnAccount = await getAccount(this.connection, burnAta);
            burned = Number(burnAccount.amount) / Math.pow(10, decimals);
        } catch {}

        return {
            totalSupply,
            burned,
            circulating: totalSupply - burned,
            burnPercentage: ((burned / totalSupply) * 100).toFixed(2)
        };
    }
}

// Usage
const tracker = new ASDFTracker('https://api.mainnet-beta.solana.com');
const info = await tracker.getSupplyInfo();
console.log('Circulating: ' + info.circulating.toLocaleString() + ' ASDF');
console.log('Burned: ' + info.burnPercentage + '%');</code></pre>
                                        </div>
                                    `,
            },
          ],
          quiz: {
            question: 'What function gets token supply information?',
            options: ['getBalance', 'getMint', 'getToken', 'fetchSupply'],
            correct: 1,
          },
        },
        {
          id: 'code-i3',
          title: 'Building a Monitoring Bot',
          sections: [
            {
              title: 'Real-Time Subscriptions',
              content: `
                                        <p>Solana allows you to subscribe to real-time updates using <strong>WebSocket connections</strong>:</p>
                                        <ul>
                                            <li><strong>onAccountChange:</strong> Triggers when an account's data changes</li>
                                            <li><strong>onLogs:</strong> Triggers when logs are emitted by a program</li>
                                            <li><strong>onProgramAccountChange:</strong> Triggers for any account owned by a program</li>
                                        </ul>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Basic Subscription</div>
                                            <pre><code>// Subscribe to changes on any account
const subscriptionId = connection.onAccountChange(
    accountPublicKey,
    (accountInfo, context) => {
        console.log('Account changed!');
        console.log('Slot:', context.slot);
        console.log('New data:', accountInfo.data);
    },
    'confirmed' // commitment level
);

// Later: unsubscribe when done
await connection.removeAccountChangeListener(subscriptionId);</code></pre>
                                        </div>
                                    `,
            },
            {
              title: 'Monitoring ASDF Burns',
              content: `
                                        <p>Let's build a bot that detects when ASDF tokens are burned:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">burn-monitor.js</div>
                                            <pre><code>import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const ASDF_MINT = new PublicKey('2P2Apwbo6jPsGDJ6YKEhGxkgibMVnL9p6mLbx8hPump');
const BURN_ADDRESS = new PublicKey('1nc1nerator11111111111111111111111111111111');

class BurnMonitor {
    constructor(rpcUrl) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.lastKnownBurn = 0;
        this.subscriptionId = null;
    }

    async start(onBurnDetected) {
        // Get the burn wallet's token account
        const burnAta = await getAssociatedTokenAddress(ASDF_MINT, BURN_ADDRESS);

        // Get initial balance
        try {
            const account = await getAccount(this.connection, burnAta);
            this.lastKnownBurn = Number(account.amount);
        } catch {
            this.lastKnownBurn = 0;
        }

        console.log('Starting burn monitor...');
        console.log('Initial burn amount:', this.lastKnownBurn);

        // Subscribe to changes
        this.subscriptionId = this.connection.onAccountChange(
            burnAta,
            (accountInfo) => {
                // Parse the new balance
                const newAmount = Number(accountInfo.data.readBigUInt64LE(64));
                const burnedNow = newAmount - this.lastKnownBurn;

                if (burnedNow > 0) {
                    onBurnDetected({
                        amount: burnedNow / 1e6, // Adjust for decimals
                        totalBurned: newAmount / 1e6,
                        timestamp: new Date()
                    });
                }

                this.lastKnownBurn = newAmount;
            }
        );
    }

    async stop() {
        if (this.subscriptionId) {
            await this.connection.removeAccountChangeListener(this.subscriptionId);
        }
    }
}

// Usage
const monitor = new BurnMonitor('wss://api.mainnet-beta.solana.com');
monitor.start((burn) => {
    console.log('🔥 BURN DETECTED: ' + burn.amount.toLocaleString() + ' ASDF');
    console.log('Total burned: ' + burn.totalBurned.toLocaleString() + ' ASDF');
});</code></pre>
                                        </div>
                                    `,
            },
            {
              title: 'Adding Discord Notifications',
              content: `
                                        <p>Now let's send burn alerts to Discord using webhooks:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">discord-alert.js</div>
                                            <pre><code>// Discord webhook notification
async function sendDiscordAlert(webhookUrl, burnData) {
    const embed = {
        title: '🔥 ASDF Burn Detected!',
        color: 0xff6600, // Orange
        fields: [
            {
                name: 'Amount Burned',
                value: burnData.amount.toLocaleString() + ' ASDF',
                inline: true
            },
            {
                name: 'Total Burned',
                value: burnData.totalBurned.toLocaleString() + ' ASDF',
                inline: true
            }
        ],
        timestamp: burnData.timestamp.toISOString(),
        footer: { text: 'ASDF Burn Monitor' }
    };

    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] })
    });
}

// Integrate with monitor
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/...';

monitor.start(async (burn) => {
    console.log('🔥 Burn: ' + burn.amount + ' ASDF');
    await sendDiscordAlert(DISCORD_WEBHOOK, burn);
});</code></pre>
                                        </div>
                                        <div class="yj-tip"><strong>💡 Getting a Webhook URL:</strong> In Discord, go to Server Settings → Integrations → Webhooks → New Webhook, then copy the URL.</div>
                                    `,
            },
            {
              title: 'Production Considerations',
              content: `
                                        <p>Before deploying your bot, consider these best practices:</p>
                                        <h4>1. Reconnection Logic</h4>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">reconnect.js</div>
                                            <pre><code>async function startWithReconnect() {
    while (true) {
        try {
            await monitor.start(handleBurn);
            // Keep running
            await new Promise(() => {});
        } catch (error) {
            console.error('Connection lost:', error.message);
            console.log('Reconnecting in 5 seconds...');
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}</code></pre>
                                        </div>
                                        <h4>2. Environment Variables</h4>
                                        <pre><code># .env file
RPC_URL=https://your-rpc-provider.com
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...</code></pre>
                                        <h4>3. Rate Limiting</h4>
                                        <p>Don't spam Discord - add a cooldown between notifications if burns are frequent.</p>
                                        <div class="yj-warning"><strong>⚠️ Never commit</strong> your .env file or webhook URLs to public repositories!</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What method subscribes to account changes in real-time?',
            options: ['watchAccount', 'onAccountChange', 'subscribeAccount', 'listenAccount'],
            correct: 1,
          },
        },
      ],
      advanced: [
        {
          id: 'code-a1',
          title: 'Smart Contract Integration',
          sections: [
            {
              title: 'Understanding Solana Programs',
              content: `
                                        <p>On Solana, smart contracts are called <strong>Programs</strong>. They're different from Ethereum contracts:</p>
                                        <table class="yj-table">
                                            <tr><th>Aspect</th><th>Solana Programs</th><th>Ethereum Contracts</th></tr>
                                            <tr><td>Language</td><td>Rust (primarily)</td><td>Solidity</td></tr>
                                            <tr><td>State Storage</td><td>Separate accounts</td><td>Within contract</td></tr>
                                            <tr><td>Upgradability</td><td>Built-in (optional)</td><td>Proxy patterns</td></tr>
                                            <tr><td>Execution</td><td>Parallel</td><td>Sequential</td></tr>
                                        </table>
                                        <div class="yj-info"><strong>📝 Good News:</strong> You don't need to write Rust to interact with programs! JavaScript/TypeScript is enough for most use cases.</div>
                                    `,
            },
            {
              title: 'The Anchor Framework',
              content: `
                                        <p><strong>Anchor</strong> is the most popular framework for Solana development. It provides:</p>
                                        <ul>
                                            <li>IDL (Interface Description Language) for easy client integration</li>
                                            <li>Automatic serialization/deserialization</li>
                                            <li>Type-safe program interactions</li>
                                        </ul>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Installation</div>
                                            <pre><code>npm install @coral-xyz/anchor @solana/web3.js</code></pre>
                                        </div>
                                        <p>Most Solana programs you'll interact with use Anchor, including many DeFi protocols.</p>
                                    `,
            },
            {
              title: 'Reading Program Accounts',
              content: `
                                        <p>Programs store state in separate accounts. Here's how to read them:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">read-program.js</div>
                                            <pre><code>import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

// Load the program's IDL (Interface Description Language)
import idl from './idl.json';

async function readProgramData() {
    const connection = new Connection('https://api.mainnet-beta.solana.com');

    // Create a read-only provider (no wallet needed for reading)
    const provider = new AnchorProvider(
        connection,
        {}, // Empty wallet for read-only
        { commitment: 'confirmed' }
    );

    const programId = new PublicKey('YourProgramId...');
    const program = new Program(idl, programId, provider);

    // Fetch an account
    const accountPubkey = new PublicKey('AccountAddress...');
    const accountData = await program.account.yourAccountType.fetch(accountPubkey);

    console.log('Account data:', accountData);
    return accountData;
}</code></pre>
                                        </div>
                                        <div class="yj-tip"><strong>💡 Finding IDLs:</strong> Many programs publish their IDL on-chain. You can also find them on GitHub or use anchor idl fetch &lt;program-id&gt;.</div>
                                    `,
            },
            {
              title: 'Calling Program Instructions',
              content: `
                                        <p>To modify state, you need to send transactions with signed instructions:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">call-instruction.js</div>
                                            <pre><code>import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

async function callProgram() {
    // Load your wallet (NEVER hardcode private keys!)
    const wallet = new Wallet(Keypair.fromSecretKey(/* from env */));

    const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed'
    });

    const program = new Program(idl, programId, provider);

    // Call a program instruction
    const tx = await program.methods
        .yourInstructionName(arg1, arg2) // Instruction arguments
        .accounts({
            user: wallet.publicKey,
            someAccount: accountPubkey,
            systemProgram: SystemProgram.programId,
        })
        .rpc(); // Sends and confirms the transaction

    console.log('Transaction signature:', tx);
}</code></pre>
                                        </div>
                                        <div class="yj-warning"><strong>⚠️ Security:</strong> Calling instructions can spend tokens or modify state. Always audit the program code before interacting with it!</div>
                                    `,
            },
            {
              title: 'Practical Example: DEX Integration',
              content: `
                                        <p>Here's how you might read data from a DEX like Raydium:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">dex-example.js</div>
                                            <pre><code>// Simplified example - actual DEX integration is more complex
async function getPoolInfo(poolAddress) {
    const accountInfo = await connection.getAccountInfo(
        new PublicKey(poolAddress)
    );

    if (!accountInfo) {
        throw new Error('Pool not found');
    }

    // Parse pool data based on the DEX's structure
    // Each DEX has its own account layout
    const data = accountInfo.data;

    // Example: Reading reserves from pool data
    const baseReserve = data.readBigUInt64LE(offset1);
    const quoteReserve = data.readBigUInt64LE(offset2);

    // Calculate price
    const price = Number(quoteReserve) / Number(baseReserve);

    return { baseReserve, quoteReserve, price };
}</code></pre>
                                        </div>
                                        <div class="yj-info"><strong>📚 Next Steps:</strong> To go deeper into Solana program development, check out the official Solana Cookbook and Anchor documentation. You now have the foundation to explore!</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What are Solana smart contracts called?',
            options: ['Contracts', 'Programs', 'Scripts', 'Modules'],
            correct: 1,
          },
        },
      ],
    },
  },
  design: {
    icon: '🎨',
    name: 'Design & UX',
    levels: ['beginner', 'intermediate', 'advanced'],
    modules: {
      beginner: [
        {
          id: 'design-b1',
          title: 'Foundations of Crypto Design',

          // STEP 1: Entry Quiz
          entryQuiz: {
            intro: "Let's discover your design background and customize your learning path!",
            questions: [
              {
                question: 'Have you used any design tools before?',
                options: [
                  "Yes, I'm experienced with Figma/Photoshop",
                  "I've tried Canva or similar tools",
                  "No, I'm completely new to design",
                ],
                type: 'assessment',
              },
              {
                question: 'What is the primary purpose of good design in crypto?',
                options: [
                  'Building trust and clarity',
                  'Making things look pretty',
                  'Using trendy effects',
                  "I'm not sure yet",
                ],
                correct: 0,
                explanation:
                  'Good design in crypto builds trust and communicates complex ideas clearly.',
              },
              {
                question: "Which design principle helps guide the viewer's eye?",
                options: [
                  'Visual hierarchy',
                  'Maximum colors',
                  'Complex patterns',
                  'Dense layouts',
                ],
                correct: 0,
                explanation:
                  'Visual hierarchy uses size, color, and placement to guide attention to important elements first.',
              },
            ],
          },

          // STEP 2: Course Content
          course: [
            {
              title: 'Welcome to ASDF Design',
              content: `
                                        <p>Welcome to the Design path! As an ASDF designer, you'll create visuals that build trust, explain concepts, and unite our community.</p>
                                        <div class="yj-objectives">
                                            <h4>What You'll Learn</h4>
                                            <ul>
                                                <li>Core design principles for crypto</li>
                                                <li>The ASDF brand identity and visual language</li>
                                                <li>Tools and workflows for creating graphics</li>
                                                <li>Creating memes that resonate and spread</li>
                                            </ul>
                                        </div>
                                        <div class="yj-key-concept">
                                            <strong>The Designer's Mission</strong>
                                            <p>In crypto, design isn't just aesthetics - it's communication. Your work helps people understand, trust, and connect with ASDF.</p>
                                        </div>
                                    `,
            },
            {
              title: 'Why Design Matters in Crypto',
              content: `
                                        <p>In a space full of scams and complexity, design serves critical functions:</p>
                                        <div class="yj-feature-cards">
                                            <div class="yj-feature-card">
                                                <span>🛡️</span>
                                                <strong>Trust</strong>
                                                <p>Professional design signals legitimacy and care</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🎯</span>
                                                <strong>Clarity</strong>
                                                <p>Complex concepts become understandable visuals</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🤝</span>
                                                <strong>Community</strong>
                                                <p>Shared visual language creates belonging</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>📣</span>
                                                <strong>Virality</strong>
                                                <p>Great memes spread ideas organically</p>
                                            </div>
                                        </div>
                                        <table class="yj-comparison-table">
                                            <tr><th></th><th>Good Design</th><th>Poor Design</th></tr>
                                            <tr><td>First Impression</td><td class="highlight">Trust</td><td>Suspicion</td></tr>
                                            <tr><td>Information</td><td class="highlight">Clear</td><td>Confusing</td></tr>
                                            <tr><td>Sharing</td><td class="highlight">Likely</td><td>Unlikely</td></tr>
                                        </table>
                                    `,
            },
            {
              title: 'The CRAP Design Principles',
              content: `
                                        <p>Every great design follows these four principles (yes, it spells CRAP!):</p>
                                        <h4>C - Contrast</h4>
                                        <p>Make important elements stand out. If things are different, make them VERY different.</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Examples</div>
                                            <pre>Good: White text on dark background
Good: Large headline with small body text
Bad: Light gray text on white background
Bad: Two similar font sizes competing</pre>
                                        </div>
                                        <h4>R - Repetition</h4>
                                        <p>Repeat visual elements throughout. Consistent colors, fonts, and styles create unity.</p>
                                        <h4>A - Alignment</h4>
                                        <p>Nothing should be placed arbitrarily. Every element should have a visual connection to something else.</p>
                                        <h4>P - Proximity</h4>
                                        <p>Group related items together. Items near each other are perceived as related.</p>
                                        <div class="yj-tip"><strong>Golden Rule:</strong> When in doubt, simplify. Remove elements until your design breaks, then add one back.</div>
                                    `,
            },
            {
              title: 'Essential Design Tools',
              content: `
                                        <p>Here's your design toolkit - all free to start:</p>
                                        <div class="yj-tools-grid">
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">🎨</span>
                                                <strong>Figma</strong>
                                                <p>Professional design tool. Best for UI, graphics, and collaboration.</p>
                                            </div>
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">🖼️</span>
                                                <strong>Canva</strong>
                                                <p>Quick graphics, social media posts, templates.</p>
                                            </div>
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">✂️</span>
                                                <strong>Remove.bg</strong>
                                                <p>Instant background removal from any image.</p>
                                            </div>
                                            <div class="yj-tool-item">
                                                <span class="yj-tool-icon">🎬</span>
                                                <strong>Kapwing</strong>
                                                <p>Meme maker, video editing, GIF creation.</p>
                                            </div>
                                        </div>
                                        <div class="yj-info"><strong>Start Here:</strong> Begin with Canva for quick wins, then graduate to Figma as you grow.</div>
                                    `,
            },
            {
              title: 'ASDF Brand Identity',
              content: `
                                        <p>Understanding our brand is essential for creating cohesive ASDF designs.</p>
                                        <h4>The ASDF Story</h4>
                                        <p>ASDF is inspired by the "This is Fine" meme - staying calm while everything burns. This represents:</p>
                                        <ul>
                                            <li>Resilience in volatile markets</li>
                                            <li>Finding humor in chaos</li>
                                            <li>Self-awareness about crypto's wild nature</li>
                                            <li>Building real value despite the flames</li>
                                        </ul>
                                        <h4>Color Palette</h4>
                                        <div class="yj-color-palette">
                                            <div class="yj-color-swatch" style="background: #ff6b35;"><span>Fire Orange</span><code>#ff6b35</code></div>
                                            <div class="yj-color-swatch" style="background: #ffd93d;"><span>Flame Yellow</span><code>#ffd93d</code></div>
                                            <div class="yj-color-swatch" style="background: #1a1a1a; color: #fff;"><span>Charred Black</span><code>#1a1a1a</code></div>
                                            <div class="yj-color-swatch" style="background: #2d2d2d; color: #fff;"><span>Smoke Grey</span><code>#2d2d2d</code></div>
                                        </div>
                                        <div class="yj-key-concept">
                                            <strong>Brand Personality</strong>
                                            <p>We embrace the chaos. Designs should feel controlled but on fire - professional with a spark of meme energy.</p>
                                        </div>
                                    `,
            },
          ],

          // STEP 3: Knowledge Quiz
          quiz: {
            intro: "Let's check what you've learned about design fundamentals!",
            passingScore: 70,
            questions: [
              {
                question: 'What does CRAP stand for in design?',
                options: [
                  'Contrast, Repetition, Alignment, Proximity',
                  'Color, Resolution, Art, Pixels',
                  'Create, Review, Apply, Publish',
                  "I don't remember",
                ],
                correct: 0,
                explanation:
                  'CRAP stands for Contrast, Repetition, Alignment, and Proximity - the four fundamental design principles.',
              },
              {
                question: 'What is the primary color of the ASDF brand?',
                options: ['Blue', 'Fire Orange (#ff6b35)', 'Green', 'Purple'],
                correct: 1,
                explanation:
                  "ASDF's primary color is Fire Orange (#ff6b35), inspired by flames and our 'This is Fine' theme.",
              },
              {
                question: 'Which tool is recommended for beginners?',
                options: ['Photoshop', 'Illustrator', 'Canva', 'After Effects'],
                correct: 2,
                explanation:
                  'Canva is perfect for beginners with its templates and easy interface. Graduate to Figma as you improve.',
              },
              {
                question: 'What does the ASDF brand represent?',
                options: [
                  'Aggressive growth',
                  'Resilience and humor in chaos',
                  'Serious finance',
                  'Technical complexity',
                ],
                correct: 1,
                explanation:
                  "ASDF embraces resilience and finding humor in crypto's volatility, inspired by the 'This is Fine' meme.",
              },
            ],
          },

          // STEP 4: Deep Content
          deepContent: [
            {
              title: 'Advanced Color Theory for Crypto',
              content: `
                                        <h4>The Psychology of Colors</h4>
                                        <p>Colors evoke specific emotions and associations in crypto:</p>
                                        <ul>
                                            <li><strong>Green:</strong> Profit, growth, success (use for positive metrics)</li>
                                            <li><strong>Red:</strong> Loss, danger, urgency (use for warnings, decreases)</li>
                                            <li><strong>Orange/Yellow:</strong> Energy, excitement, caution (ASDF's signature)</li>
                                            <li><strong>Blue:</strong> Trust, stability (common in DeFi)</li>
                                            <li><strong>Purple:</strong> Premium, innovative (NFT/Web3 vibes)</li>
                                        </ul>
                                        <h4>Color Accessibility</h4>
                                        <p>Ensure your designs work for everyone:</p>
                                        <ul>
                                            <li>Maintain 4.5:1 contrast ratio for text</li>
                                            <li>Don't rely solely on color to convey meaning</li>
                                            <li>Test with colorblind simulators</li>
                                        </ul>
                                        <div class="yj-warning"><strong>Pro Tip:</strong> Use WebAIM's contrast checker to verify your color combinations are accessible.</div>
                                    `,
            },
            {
              title: 'Typography Deep Dive',
              content: `
                                        <h4>Font Pairing Rules</h4>
                                        <p>Great typography follows these patterns:</p>
                                        <ul>
                                            <li><strong>Contrast:</strong> Pair a decorative header font with a simple body font</li>
                                            <li><strong>Limit:</strong> Use maximum 2-3 fonts per design</li>
                                            <li><strong>Hierarchy:</strong> Establish clear size relationships</li>
                                        </ul>
                                        <h4>Recommended Font Stacks for ASDF</h4>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Font Hierarchy</div>
                                            <pre>Headlines: Space Grotesk (bold, techy)
Subheads: Inter (semi-bold)
Body: Inter (regular)
Code: Space Mono (monospace)</pre>
                                        </div>
                                        <h4>Size Scale (Desktop)</h4>
                                        <p>Use a consistent scale for visual rhythm:</p>
                                        <ul>
                                            <li>H1: 48-64px (hero statements)</li>
                                            <li>H2: 32-40px (section headers)</li>
                                            <li>H3: 24-28px (subsections)</li>
                                            <li>Body: 16-18px (readable paragraphs)</li>
                                            <li>Caption: 12-14px (supporting text)</li>
                                        </ul>
                                    `,
            },
          ],

          // STEP 5: Practice
          practice: [
            {
              type: 'fill-blank',
              id: 'design-practice-1',
              title: 'Design Principles Check',
              instruction: 'Complete these design fundamentals:',
              questions: [
                {
                  text: 'CRAP stands for Contrast, _____, Alignment, and _____.',
                  blanks: ['Repetition', 'Proximity'],
                  hints: ['Repeating visual elements', 'Grouping related items'],
                },
                {
                  text: 'The primary ASDF brand color is Fire _____ with hex code #ff6b35.',
                  blanks: ['Orange'],
                  hints: ['A warm color between red and yellow'],
                },
              ],
            },
            {
              type: 'explorer',
              id: 'design-practice-2',
              title: 'Design Tool Setup',
              instruction: 'Set up your design environment:',
              tasks: [
                {
                  task: 'Create a free Figma account',
                  hint: 'Go to figma.com and sign up',
                  verification: 'checkbox',
                },
                {
                  task: 'Create a free Canva account',
                  hint: 'Go to canva.com and sign up',
                  verification: 'checkbox',
                },
                {
                  task: 'Create a simple graphic using ASDF colors',
                  hint: 'Use #ff6b35 and #1a1a1a as your main colors',
                  verification: 'checkbox',
                },
              ],
            },
            {
              type: 'quiz-challenge',
              id: 'design-practice-3',
              title: 'Design Speed Round',
              description: 'Test your design knowledge quickly!',
              timeLimit: 45,
              questions: [
                { q: 'What does the C in CRAP stand for?', a: 'Contrast' },
                { q: 'What tool is best for beginners?', a: 'Canva' },
                { q: 'What is the ASDF primary color hex?', a: '#ff6b35' },
                { q: 'Maximum fonts per design?', a: '3' },
                { q: 'Which principle groups related items?', a: 'Proximity' },
              ],
            },
          ],
        },
        {
          id: 'design-b2',
          title: 'ASDF Brand Identity',
          sections: [
            {
              title: 'The ASDF Visual Language',
              content: `
                                        <p>Understanding our brand is key to creating cohesive designs that feel authentically ASDF.</p>
                                        <h4>Our Story</h4>
                                        <p>ASDF is inspired by the "This is Fine" meme - the dog sitting calmly while everything burns around him. This represents:</p>
                                        <ul>
                                            <li>Staying calm in volatile markets</li>
                                            <li>Finding humor in chaos</li>
                                            <li>Being self-aware about crypto's wild nature</li>
                                            <li>Building real value despite the flames</li>
                                        </ul>
                                        <div class="yj-info"><strong>🔥 Brand Personality:</strong> We embrace the chaos - our designs should feel controlled but on fire.</div>
                                    `,
            },
            {
              title: 'Color Palette',
              content: `
                                        <p>The ASDF color palette is inspired by fire and charcoal:</p>
                                        <div class="yj-color-palette">
                                            <div class="yj-color-swatch" style="background: #ff6b35;">
                                                <span>Primary Fire</span>
                                                <code>#ff6b35</code>
                                            </div>
                                            <div class="yj-color-swatch" style="background: #ff8c42;">
                                                <span>Ember Glow</span>
                                                <code>#ff8c42</code>
                                            </div>
                                            <div class="yj-color-swatch" style="background: #1a1a1a; color: #fff;">
                                                <span>Charred Black</span>
                                                <code>#1a1a1a</code>
                                            </div>
                                            <div class="yj-color-swatch" style="background: #2d2d2d; color: #fff;">
                                                <span>Smoke Grey</span>
                                                <code>#2d2d2d</code>
                                            </div>
                                            <div class="yj-color-swatch" style="background: #ffd93d;">
                                                <span>Flame Yellow</span>
                                                <code>#ffd93d</code>
                                            </div>
                                        </div>
                                        <h4>Usage Guidelines</h4>
                                        <ul>
                                            <li><strong>Primary Fire:</strong> CTAs, highlights, important elements</li>
                                            <li><strong>Charred Black:</strong> Backgrounds, text on light</li>
                                            <li><strong>Flame Yellow:</strong> Accents, warnings, celebrations</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Typography',
              content: `
                                        <p>Typography is crucial for readability and brand recognition:</p>
                                        <h4>Primary Font: Bold Sans-Serif</h4>
                                        <p>For headlines, logos, and emphasis. Options:</p>
                                        <ul>
                                            <li>Inter (free, excellent readability)</li>
                                            <li>Montserrat (free, modern feel)</li>
                                            <li>Space Grotesk (free, techy vibe)</li>
                                        </ul>
                                        <h4>Body Font: Clean Sans-Serif</h4>
                                        <p>For longer text and descriptions:</p>
                                        <ul>
                                            <li>Inter (works great for both)</li>
                                            <li>Open Sans (classic, highly readable)</li>
                                        </ul>
                                        <h4>Type Hierarchy</h4>
                                        <div class="yj-type-demo">
                                            <p style="font-size: 2em; font-weight: 800;">H1: Bold Statement</p>
                                            <p style="font-size: 1.5em; font-weight: 700;">H2: Section Title</p>
                                            <p style="font-size: 1.2em; font-weight: 600;">H3: Subsection</p>
                                            <p style="font-size: 1em;">Body: Regular text for reading.</p>
                                            <p style="font-size: 0.85em; opacity: 0.7;">Small: Captions and fine print</p>
                                        </div>
                                    `,
            },
            {
              title: 'Logo Usage',
              content: `
                                        <p>The ASDF logo and mascot have specific usage guidelines:</p>
                                        <h4>Do's ✓</h4>
                                        <ul>
                                            <li>Use official logo assets when available</li>
                                            <li>Maintain proportions (don't stretch)</li>
                                            <li>Ensure adequate contrast with background</li>
                                            <li>Leave breathing room around the logo</li>
                                        </ul>
                                        <h4>Don'ts ✗</h4>
                                        <ul>
                                            <li>Don't alter colors arbitrarily</li>
                                            <li>Don't add effects that obscure the logo</li>
                                            <li>Don't use low-resolution versions</li>
                                            <li>Don't place on busy backgrounds</li>
                                        </ul>
                                        <div class="yj-warning"><strong>⚠️ Important:</strong> The "This is Fine" dog image has copyright considerations. For official use, refer to community-created ASDF-specific artwork.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What is the ASDF mascot?',
            options: ['A rocket', 'The "This is Fine" dog', 'A phoenix', 'A bull'],
            correct: 1,
          },
        },
        {
          id: 'design-b3',
          title: 'Creating Effective Memes',
          sections: [
            {
              title: 'The Art of Crypto Memes',
              content: `
                                        <p>Memes are the currency of crypto culture. They spread ideas faster than any marketing campaign.</p>
                                        <h4>Why Memes Work</h4>
                                        <ul>
                                            <li><strong>Relatability:</strong> People share what resonates with their experience</li>
                                            <li><strong>Simplicity:</strong> Complex ideas in digestible format</li>
                                            <li><strong>Community:</strong> Inside jokes create belonging</li>
                                            <li><strong>Shareability:</strong> Easy to forward, screenshot, repost</li>
                                        </ul>
                                        <div class="yj-info"><strong>🎯 Goal:</strong> Make people feel understood, then laugh, then share.</div>
                                    `,
            },
            {
              title: 'Anatomy of a Good Meme',
              content: `
                                        <p>Every effective meme has these elements:</p>
                                        <h4>1. Hook (First 0.5 seconds)</h4>
                                        <p>Familiar format or image that catches attention.</p>
                                        <h4>2. Setup (1-2 seconds)</h4>
                                        <p>Brief context that everyone recognizes.</p>
                                        <h4>3. Punchline (The moment)</h4>
                                        <p>The unexpected twist that makes it funny.</p>
                                        <h4>4. ASDF Connection</h4>
                                        <p>Subtle brand tie-in that doesn't feel forced.</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Example Structure</div>
                                            <pre>Format: "This is Fine" dog template
Setup: Market dumping -30%
Punchline: "This is fine, I'm buying more ASDF"
Why it works: Relatable situation + our mascot + calm confidence</pre>
                                        </div>
                                    `,
            },
            {
              title: 'Meme Formats That Work',
              content: `
                                        <p>These formats consistently perform well:</p>
                                        <h4>Comparison Memes</h4>
                                        <p>"How I started vs How it's going" - Show growth</p>
                                        <h4>Reaction Memes</h4>
                                        <p>Character reacting to crypto situations (burns, price moves)</p>
                                        <h4>Caption Memes</h4>
                                        <p>Existing image + new crypto-relevant caption</p>
                                        <h4>Timeline Memes</h4>
                                        <p>"Me explaining to my friends why I'm excited about a deflationary dog token"</p>
                                        <h4>Educational Memes</h4>
                                        <p>Complex concepts explained through humor</p>
                                        <div class="yj-tip"><strong>💡 Pro Tip:</strong> Study what's trending on crypto Twitter. Adapt popular formats quickly while they're hot.</div>
                                    `,
            },
            {
              title: 'What to Avoid',
              content: `
                                        <p>Some content can harm the community:</p>
                                        <div class="yj-warning-box">
                                            <h4>❌ Never Include:</h4>
                                            <ul>
                                                <li><strong>Price predictions:</strong> "ASDF to $1!" - This is speculation</li>
                                                <li><strong>Financial advice:</strong> "Buy now before it moons!"</li>
                                                <li><strong>Attacks on other projects:</strong> Stay positive</li>
                                                <li><strong>Misleading claims:</strong> Don't promise what can't be delivered</li>
                                                <li><strong>Low-effort spam:</strong> Quality over quantity</li>
                                            </ul>
                                        </div>
                                        <h4>✓ Safe Topics:</h4>
                                        <ul>
                                            <li>Burn mechanics and deflation</li>
                                            <li>Community moments and milestones</li>
                                            <li>General crypto humor (not price-focused)</li>
                                            <li>"This is Fine" dog in relatable situations</li>
                                            <li>Building and development progress</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Creating Your First Meme',
              content: `
                                        <p>Let's walk through creating an ASDF meme:</p>
                                        <h4>Step 1: Choose Your Format</h4>
                                        <p>Pick a trending template or use the "This is Fine" dog.</p>
                                        <h4>Step 2: Identify the Relatable Moment</h4>
                                        <p>What's happening in crypto that people are talking about?</p>
                                        <h4>Step 3: Write Your Copy</h4>
                                        <p>Keep it short. If you need more than 10 words, simplify.</p>
                                        <h4>Step 4: Design</h4>
                                        <ul>
                                            <li>Bold, readable text (Impact or similar)</li>
                                            <li>High contrast (white text with black outline works everywhere)</li>
                                            <li>Don't cover the focal point of the image</li>
                                        </ul>
                                        <h4>Step 5: Test</h4>
                                        <p>Show a friend. If you have to explain it, rework it.</p>
                                        <div class="yj-info"><strong>🚀 Ready?</strong> Create a meme and share it in the ASDF community for feedback!</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What should you avoid in crypto memes?',
            options: [
              'Humor',
              'Relatability',
              'Price predictions and financial advice',
              'Brand colors',
            ],
            correct: 2,
          },
        },
      ],
      intermediate: [
        {
          id: 'design-i1',
          title: 'UI Design for Crypto Apps',
          sections: [
            {
              title: 'Crypto UX Challenges',
              content: `
                                        <p>Crypto interfaces have unique challenges that traditional apps don't face:</p>
                                        <ul>
                                            <li><strong>Irreversibility:</strong> Transactions can't be undone</li>
                                            <li><strong>Complexity:</strong> Users must understand wallets, gas, signatures</li>
                                            <li><strong>Trust:</strong> Users are entrusting their money to your interface</li>
                                            <li><strong>Jargon:</strong> Technical terms can confuse newcomers</li>
                                        </ul>
                                        <div class="yj-info"><strong>🎯 Goal:</strong> Make users feel safe and informed at every step.</div>
                                    `,
            },
            {
              title: 'Essential UI Patterns',
              content: `
                                        <h4>1. Clear Transaction Preview</h4>
                                        <p>Always show exactly what will happen before confirmation:</p>
                                        <ul>
                                            <li>Amount being sent/received</li>
                                            <li>Recipient address (truncated with copy option)</li>
                                            <li>Transaction fee estimate</li>
                                            <li>Total cost breakdown</li>
                                        </ul>
                                        <h4>2. Confirmation Steps</h4>
                                        <p>For irreversible actions, use multi-step confirmation:</p>
                                        <ol>
                                            <li>Review details</li>
                                            <li>Explicit checkbox ("I understand this is irreversible")</li>
                                            <li>Final confirm button</li>
                                        </ol>
                                        <h4>3. Loading States</h4>
                                        <p>Blockchain transactions take time. Show progress:</p>
                                        <ul>
                                            <li>Pending → Confirming → Confirmed</li>
                                            <li>Link to block explorer</li>
                                            <li>Estimated time remaining</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Information Hierarchy',
              content: `
                                        <p>In crypto UIs, prioritize information correctly:</p>
                                        <h4>Primary (Most Visible)</h4>
                                        <ul>
                                            <li>Current balance / portfolio value</li>
                                            <li>Active actions (send, receive, swap)</li>
                                            <li>Connection status (wallet connected?)</li>
                                        </ul>
                                        <h4>Secondary (Easily Accessible)</h4>
                                        <ul>
                                            <li>Transaction history</li>
                                            <li>Token details</li>
                                            <li>Settings</li>
                                        </ul>
                                        <h4>Tertiary (Available on Request)</h4>
                                        <ul>
                                            <li>Contract addresses</li>
                                            <li>Technical details</li>
                                            <li>Advanced options</li>
                                        </ul>
                                        <div class="yj-tip"><strong>💡 Rule:</strong> Beginners should never need tertiary info to complete basic tasks.</div>
                                    `,
            },
            {
              title: 'Error Handling',
              content: `
                                        <h4>Good Error Messages Include:</h4>
                                        <ol>
                                            <li><strong>What happened:</strong> "Transaction failed"</li>
                                            <li><strong>Why:</strong> "Insufficient SOL for gas fee"</li>
                                            <li><strong>How to fix:</strong> "Add at least 0.01 SOL to your wallet"</li>
                                        </ol>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Bad vs Good Error</div>
                                            <pre>❌ Bad: "Error: 0x1"

✓ Good: "Transaction Failed
Your wallet doesn't have enough SOL to pay the
network fee (0.00001 SOL needed).

[Add SOL] [Learn More]"</pre>
                                        </div>
                                        <h4>Common Errors to Handle:</h4>
                                        <ul>
                                            <li>Wallet not connected</li>
                                            <li>Insufficient balance</li>
                                            <li>Transaction rejected by user</li>
                                            <li>Network congestion</li>
                                            <li>Invalid address</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Mobile Considerations',
              content: `
                                        <p>Many crypto users are mobile-first. Design for small screens:</p>
                                        <h4>Touch Targets</h4>
                                        <p>Buttons should be at least 44x44 pixels. Larger for important actions.</p>
                                        <h4>Address Display</h4>
                                        <p>Show truncated addresses with copy functionality:</p>
                                        <div class="yj-code-example">
                                            <pre>7xKX...9Pq2 [Copy icon]</pre>
                                        </div>
                                        <h4>Bottom Navigation</h4>
                                        <p>Keep primary actions within thumb reach (bottom of screen).</p>
                                        <h4>Input Fields</h4>
                                        <p>Use appropriate keyboard types (numeric for amounts).</p>
                                        <div class="yj-tip"><strong>💡 Test:</strong> Always test your designs on actual mobile devices, not just browser dev tools.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What is most important in crypto UI design?',
            options: ['Animations', 'Clarity and trust', 'Dark mode', 'Minimalism'],
            correct: 1,
          },
        },
      ],
      advanced: [
        {
          id: 'design-a1',
          title: 'Building Design Systems',
          sections: [
            {
              title: 'What is a Design System?',
              content: `
                                        <p>A <strong>design system</strong> is a collection of reusable components and guidelines that ensure consistency across products.</p>
                                        <h4>Components of a Design System:</h4>
                                        <ul>
                                            <li><strong>Design Tokens:</strong> Colors, typography, spacing values</li>
                                            <li><strong>Component Library:</strong> Buttons, inputs, cards, modals</li>
                                            <li><strong>Patterns:</strong> Common UI solutions (forms, navigation)</li>
                                            <li><strong>Documentation:</strong> How and when to use each element</li>
                                        </ul>
                                        <div class="yj-info"><strong>🎯 Benefits:</strong> Faster design, consistent UX, easier handoff to developers, scalable products.</div>
                                    `,
            },
            {
              title: 'Design Tokens',
              content: `
                                        <p>Design tokens are the atomic values of your system:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Example Token Structure</div>
                                            <pre><code>// Colors
--color-primary: #ff6b35;
--color-primary-hover: #ff8142;
--color-background: #1a1a1a;
--color-surface: #2d2d2d;
--color-text: #ffffff;
--color-text-muted: #888888;
--color-success: #22c55e;
--color-error: #ef4444;

// Spacing (8px base unit)
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;

// Typography
--font-family: 'Inter', sans-serif;
--font-size-sm: 14px;
--font-size-md: 16px;
--font-size-lg: 20px;
--font-size-xl: 24px;

// Border Radius
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 16px;
--radius-full: 9999px;</code></pre>
                                        </div>
                                        <div class="yj-tip"><strong>💡 Tip:</strong> Use semantic names (--color-primary) rather than descriptive (--color-orange). This makes theme changes easier.</div>
                                    `,
            },
            {
              title: 'Component Library',
              content: `
                                        <p>Build reusable components for consistency:</p>
                                        <h4>Essential Components:</h4>
                                        <ul>
                                            <li><strong>Button:</strong> Primary, Secondary, Ghost, Disabled states</li>
                                            <li><strong>Input:</strong> Text, Number, Address (with validation)</li>
                                            <li><strong>Card:</strong> Container for content blocks</li>
                                            <li><strong>Modal:</strong> For confirmations and forms</li>
                                            <li><strong>Toast:</strong> Success/error notifications</li>
                                            <li><strong>Tooltip:</strong> Contextual help</li>
                                            <li><strong>Badge:</strong> Status indicators</li>
                                            <li><strong>Skeleton:</strong> Loading placeholders</li>
                                        </ul>
                                        <h4>Component States:</h4>
                                        <p>Each component needs designs for:</p>
                                        <ul>
                                            <li>Default</li>
                                            <li>Hover</li>
                                            <li>Focus</li>
                                            <li>Active/Pressed</li>
                                            <li>Disabled</li>
                                            <li>Loading</li>
                                            <li>Error</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Documentation',
              content: `
                                        <p>A design system is only useful if people know how to use it:</p>
                                        <h4>What to Document:</h4>
                                        <ul>
                                            <li><strong>When to use:</strong> "Use primary button for main CTA, secondary for alternatives"</li>
                                            <li><strong>When NOT to use:</strong> "Don't use ghost buttons for important actions"</li>
                                            <li><strong>Anatomy:</strong> Label each part of the component</li>
                                            <li><strong>Spacing:</strong> How much room to leave around it</li>
                                            <li><strong>Accessibility:</strong> Keyboard navigation, screen reader support</li>
                                        </ul>
                                        <h4>Example Documentation:</h4>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Button Component</div>
                                            <pre>## Button

### Variants
- **Primary:** Main actions, one per view
- **Secondary:** Alternative actions
- **Ghost:** Tertiary actions, low emphasis

### Sizes
- **Large:** 48px height, for primary CTAs
- **Medium:** 40px height, default
- **Small:** 32px height, for tight spaces

### Usage Guidelines
✓ Use clear, action-oriented labels ("Connect Wallet")
✗ Don't use vague labels ("Click Here")</pre>
                                        </div>
                                    `,
            },
            {
              title: 'Implementing in Figma',
              content: `
                                        <p>Figma is ideal for building and maintaining design systems:</p>
                                        <h4>Setup Structure:</h4>
                                        <ol>
                                            <li><strong>Foundations File:</strong> Colors, typography, icons</li>
                                            <li><strong>Components File:</strong> All reusable components</li>
                                            <li><strong>Patterns File:</strong> Common layouts and flows</li>
                                            <li><strong>Documentation:</strong> Guidelines and examples</li>
                                        </ol>
                                        <h4>Figma Features to Use:</h4>
                                        <ul>
                                            <li><strong>Variables:</strong> For design tokens (colors, spacing)</li>
                                            <li><strong>Components:</strong> For reusable elements</li>
                                            <li><strong>Variants:</strong> For component states</li>
                                            <li><strong>Auto Layout:</strong> For responsive components</li>
                                            <li><strong>Team Libraries:</strong> Share across projects</li>
                                        </ul>
                                        <div class="yj-tip"><strong>💡 Pro Tip:</strong> Start small. Build what you need now, expand as patterns emerge. Don't try to design everything upfront.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What ensures consistent design across a project?',
            options: ['One designer', 'Design system', 'More meetings', 'Strict deadlines'],
            correct: 1,
          },
        },
      ],
    },
  },
  content: {
    icon: '✍️',
    name: 'Content',
    levels: ['beginner', 'intermediate', 'advanced'],
    modules: {
      beginner: [
        {
          id: 'content-b1',
          title: 'Mastering Crypto Content Creation',

          // STEP 1: Entry Quiz
          entryQuiz: {
            intro: "Let's discover your content creation background and style preferences!",
            questions: [
              {
                question: 'What content have you created before?',
                options: [
                  'I regularly write/post on social media',
                  "I've written a few things",
                  "I'm new to content creation",
                ],
                type: 'assessment',
              },
              {
                question: 'What makes crypto content effective?',
                options: [
                  'Educating while entertaining',
                  'Using complex jargon',
                  'Making price predictions',
                  'Posting frequently without research',
                ],
                correct: 0,
                explanation:
                  "The best crypto content educates AND entertains. Pure information is boring; pure entertainment doesn't build value.",
              },
              {
                question: 'Before writing about a topic, you should:',
                options: [
                  'Research and verify facts',
                  'Copy what others said',
                  'Write immediately without planning',
                  'Skip checking sources',
                ],
                correct: 0,
                explanation:
                  'Always research and verify facts. Inaccurate information damages trust and can spread harmful misinformation.',
              },
            ],
          },

          // STEP 2: Course Content
          course: [
            {
              title: 'Welcome to Content Creation',
              content: `
                                        <p>Welcome to the Content Creator path! You're the storytellers of the ASDF ecosystem - you help people understand, engage, and believe in what we're building.</p>
                                        <div class="yj-objectives">
                                            <h4>What You'll Learn</h4>
                                            <ul>
                                                <li>How to create engaging crypto content</li>
                                                <li>Understanding and writing for different audiences</li>
                                                <li>Mastering Twitter threads and social media</li>
                                                <li>Building your personal brand as a creator</li>
                                            </ul>
                                        </div>
                                        <div class="yj-feature-cards">
                                            <div class="yj-feature-card">
                                                <span>📚</span>
                                                <strong>Educational</strong>
                                                <p>Tutorials, explainers, guides</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🐦</span>
                                                <strong>Social</strong>
                                                <p>Tweets, threads, engagement</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🎬</span>
                                                <strong>Video</strong>
                                                <p>YouTube, TikTok, Shorts</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>✍️</span>
                                                <strong>Written</strong>
                                                <p>Articles, docs, newsletters</p>
                                            </div>
                                        </div>
                                    `,
            },
            {
              title: 'Understanding Your Audience',
              content: `
                                        <p>Different audiences need different content approaches:</p>
                                        <div class="yj-audience-grid">
                                            <div class="yj-audience-card">
                                                <h4>Crypto Newcomers</h4>
                                                <ul>
                                                    <li>Explain everything, assume nothing</li>
                                                    <li>Avoid jargon or define it immediately</li>
                                                    <li>Focus on "why" before "how"</li>
                                                    <li>Use analogies to familiar concepts</li>
                                                </ul>
                                            </div>
                                            <div class="yj-audience-card">
                                                <h4>Crypto Natives</h4>
                                                <ul>
                                                    <li>Skip basics, get to the point</li>
                                                    <li>Use community language naturally</li>
                                                    <li>Focus on what makes ASDF unique</li>
                                                    <li>Provide technical depth and data</li>
                                                </ul>
                                            </div>
                                        </div>
                                        <div class="yj-key-concept">
                                            <strong>The Audience Check</strong>
                                            <p>Before every piece: Who am I writing for? What do they already know? What do they want to learn?</p>
                                        </div>
                                    `,
            },
            {
              title: 'Content Planning Framework',
              content: `
                                        <p>Great content starts with planning. Use the HOOK framework:</p>
                                        <h4>H - Hook</h4>
                                        <p>Start with something that grabs attention. A question, surprising stat, or bold statement.</p>
                                        <h4>O - Outline</h4>
                                        <p>Structure your main points (3-5 key ideas) before writing.</p>
                                        <h4>O - Offer Value</h4>
                                        <p>Every piece should teach, entertain, or inspire action.</p>
                                        <h4>K - Kick to Action</h4>
                                        <p>End with a clear call-to-action: follow, share, try something, or discuss.</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Example Thread Structure</div>
                                            <pre>Tweet 1: Hook - "ASDF just burned 500M tokens. Here's why that matters..."
Tweet 2-4: Main points with data
Tweet 5: Why this is bullish
Tweet 6: Call to action - "Follow for more ASDF alpha"</pre>
                                        </div>
                                        <div class="yj-warning"><strong>Research First:</strong> Never make claims you can't verify. Check on-chain data, cite sources.</div>
                                    `,
            },
            {
              title: 'Writing for Crypto',
              content: `
                                        <p>Crypto is full of jargon. Great content makes complex ideas simple:</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Complex vs Simple</div>
                                            <pre>Bad: "ASDF implements a deflationary tokenomic
model whereby a percentage of transaction volume
is algorithmically allocated to a provably
inaccessible burn address."

Good: "Every time ASDF is traded, some tokens
are permanently destroyed. The total supply
keeps shrinking over time."</pre>
                                        </div>
                                        <h4>Key Writing Rules</h4>
                                        <ul>
                                            <li><strong>Lead with value:</strong> Don't bury the important stuff</li>
                                            <li><strong>One idea per sentence:</strong> Keep sentences short</li>
                                            <li><strong>Use active voice:</strong> "The contract burned tokens" not "Tokens were burned"</li>
                                            <li><strong>Show, don't tell:</strong> Use specific numbers and examples</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Finding Your Voice',
              content: `
                                        <p>Your unique voice makes you memorable. Consider these elements:</p>
                                        <table class="yj-comparison-table">
                                            <tr><th>Element</th><th>Options</th><th>Examples</th></tr>
                                            <tr><td>Tone</td><td>Casual / Formal</td><td>"LFG!" vs "Let's examine..."</td></tr>
                                            <tr><td>Perspective</td><td>Expert / Learner</td><td>"I discovered..." vs "Here's what we know..."</td></tr>
                                            <tr><td>Length</td><td>Quick hits / Deep dives</td><td>Single tweets vs long threads</td></tr>
                                        </table>
                                        <h4>Content Types to Try</h4>
                                        <ul>
                                            <li><strong>Educational threads:</strong> Explain concepts step by step</li>
                                            <li><strong>News commentary:</strong> React to updates with insights</li>
                                            <li><strong>Data analysis:</strong> Share on-chain metrics and trends</li>
                                            <li><strong>Community highlights:</strong> Showcase member achievements</li>
                                            <li><strong>Behind-the-scenes:</strong> Show your journey and process</li>
                                        </ul>
                                        <div class="yj-tip"><strong>Authenticity beats imitation.</strong> Don't copy someone else's style - develop your own through experimentation.</div>
                                    `,
            },
            {
              title: 'Twitter/X Mastery',
              content: `
                                        <p>Twitter/X is the heart of crypto discourse. Master these formats:</p>
                                        <h4>Thread Anatomy</h4>
                                        <ul>
                                            <li><strong>Tweet 1 (Hook):</strong> Make them stop scrolling</li>
                                            <li><strong>Tweet 2-N (Body):</strong> Deliver value, one point per tweet</li>
                                            <li><strong>Final Tweet (CTA):</strong> What should they do next?</li>
                                        </ul>
                                        <h4>Engagement Tips</h4>
                                        <ul>
                                            <li>Post when your audience is active (test different times)</li>
                                            <li>Reply to comments within the first hour</li>
                                            <li>Use relevant hashtags sparingly (1-2 max)</li>
                                            <li>Quote tweet with added value, not just "this"</li>
                                        </ul>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Hook Examples</div>
                                            <pre>Question: "What if I told you ASDF burned more tokens this week than most projects burn in a year?"

Stat: "2.5 billion ASDF tokens. Gone forever. Here's the story..."

Bold claim: "Most deflationary tokens are scams. ASDF is different. Here's why..."</pre>
                                        </div>
                                    `,
            },
          ],

          // STEP 3: Knowledge Quiz
          quiz: {
            intro: "Let's check what you've learned about content creation!",
            passingScore: 70,
            questions: [
              {
                question: 'What does the HOOK framework stand for?',
                options: [
                  'Hook, Outline, Offer value, Kick to action',
                  'Help, Organize, Optimize, Keep',
                  'How, Open, Order, Know',
                  'None of these',
                ],
                correct: 0,
                explanation:
                  'HOOK = Hook (grab attention), Outline (structure), Offer value (teach/entertain), Kick to action (CTA).',
              },
              {
                question: 'When writing for crypto newcomers, you should:',
                options: [
                  'Use lots of technical jargon',
                  'Explain terms and use analogies',
                  'Skip explanations to save time',
                  'Only share price predictions',
                ],
                correct: 1,
                explanation:
                  'For newcomers, explain everything and use analogies to familiar concepts. Never assume knowledge.',
              },
              {
                question: 'Which is the better writing approach?',
                options: [
                  'Complex, technical language',
                  'Simple, clear explanations',
                  'As many words as possible',
                  'No structure needed',
                ],
                correct: 1,
                explanation:
                  'The best writers understand complex topics so well they can explain them simply.',
              },
              {
                question: 'The first tweet in a thread should:',
                options: [
                  'Be forgettable',
                  'Hook the reader to stop scrolling',
                  'Include all details',
                  'Ask for follows immediately',
                ],
                correct: 1,
                explanation:
                  'The first tweet is your hook - it must grab attention and make people want to read more.',
              },
            ],
          },

          // STEP 4: Deep Content
          deepContent: [
            {
              title: 'Advanced Thread Strategies',
              content: `
                                        <h4>The Thread Formula</h4>
                                        <p>High-performing threads follow patterns:</p>
                                        <ul>
                                            <li><strong>Numbers hook:</strong> "7 reasons why..." performs well</li>
                                            <li><strong>Story threads:</strong> Narrative structure keeps readers engaged</li>
                                            <li><strong>Controversial takes:</strong> Thoughtful disagreement gets engagement</li>
                                            <li><strong>Data threads:</strong> On-chain analysis with charts</li>
                                        </ul>
                                        <h4>Optimal Thread Length</h4>
                                        <ul>
                                            <li>5-7 tweets: Quick educational content</li>
                                            <li>10-15 tweets: Standard deep dive</li>
                                            <li>20+ tweets: Comprehensive guides (use sparingly)</li>
                                        </ul>
                                        <div class="yj-warning"><strong>Quality over quantity.</strong> A 5-tweet thread with great content beats a 20-tweet thread with fluff.</div>
                                    `,
            },
            {
              title: 'Building Your Content Brand',
              content: `
                                        <h4>Personal Branding Elements</h4>
                                        <ul>
                                            <li><strong>Consistent handle:</strong> Same username across platforms</li>
                                            <li><strong>Recognizable avatar:</strong> PFP that stands out</li>
                                            <li><strong>Clear bio:</strong> What you do, who you help</li>
                                            <li><strong>Content niche:</strong> What are you known for?</li>
                                        </ul>
                                        <h4>Content Calendar</h4>
                                        <p>Consistency beats intensity:</p>
                                        <ul>
                                            <li>Post at least 3-5x per week minimum</li>
                                            <li>One thread per week builds authority</li>
                                            <li>Engage with others daily (replies matter)</li>
                                            <li>Track what performs and do more of that</li>
                                        </ul>
                                        <div class="yj-key-concept">
                                            <strong>The 80/20 Rule</strong>
                                            <p>80% of your content should provide value (educate, entertain). 20% can promote ASDF directly.</p>
                                        </div>
                                    `,
            },
          ],

          // STEP 5: Practice
          practice: [
            {
              type: 'fill-blank',
              id: 'content-practice-1',
              title: 'Content Framework Check',
              instruction: 'Complete these content creation concepts:',
              questions: [
                {
                  text: 'HOOK stands for Hook, Outline, Offer value, and _____ to action.',
                  blanks: ['Kick'],
                  hints: ['A call to do something'],
                },
                {
                  text: 'For crypto newcomers, you should avoid _____ and use _____ instead.',
                  blanks: ['jargon', 'analogies'],
                  hints: ['Technical language', 'Comparisons to familiar things'],
                },
              ],
            },
            {
              type: 'explorer',
              id: 'content-practice-2',
              title: 'Content Creation Challenge',
              instruction: 'Create your first ASDF content:',
              tasks: [
                {
                  task: 'Write a hook tweet about ASDF burns',
                  hint: 'Use a surprising stat or question format',
                  verification: 'checkbox',
                },
                {
                  task: 'Create a 3-tweet thread outline about why you joined ASDF',
                  hint: 'Hook -> Story -> Call to action',
                  verification: 'checkbox',
                },
                {
                  task: 'Find and share a recent ASDF metric with your insight',
                  hint: 'Check burn tracker or on-chain data',
                  verification: 'checkbox',
                },
              ],
            },
            {
              type: 'quiz-challenge',
              id: 'content-practice-3',
              title: 'Content Speed Round',
              description: 'Test your content creation knowledge!',
              timeLimit: 45,
              questions: [
                { q: 'What does the H in HOOK stand for?', a: 'Hook' },
                { q: 'How many tweets in a quick educational thread?', a: '5-7' },
                { q: 'What % of content should provide value?', a: '80' },
                { q: 'What should the first tweet in a thread do?', a: 'Hook' },
                { q: 'Complex or simple writing for crypto?', a: 'Simple' },
              ],
            },
          ],
        },
        {
          id: 'content-b2',
          title: 'Writing for Crypto',
          sections: [
            {
              title: 'Clear Communication',
              content: `
                                        <p>Crypto is full of jargon. Great content makes complex ideas simple:</p>
                                        <h4>The Complexity Paradox:</h4>
                                        <p>The best writers understand complex topics so well that they can explain them simply.</p>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Complex vs Simple</div>
                                            <pre>❌ Complex:
"ASDF implements a deflationary tokenomic model
whereby a percentage of transaction volume is
algorithmically allocated to a provably
inaccessible burn address."

✓ Simple:
"Every time ASDF is traded, some tokens are
permanently destroyed. This means the total
supply keeps shrinking over time."</pre>
                                        </div>
                                    `,
            },
            {
              title: 'Writing Techniques',
              content: `
                                        <h4>1. Lead with Value</h4>
                                        <p>Don't bury the important stuff. Start with the key takeaway.</p>
                                        <h4>2. One Idea Per Sentence</h4>
                                        <p>Long sentences with multiple clauses confuse readers. Keep it simple.</p>
                                        <h4>3. Use Active Voice</h4>
                                        <div class="yj-code-example">
                                            <pre>❌ Passive: "The tokens were burned by the contract."
✓ Active: "The contract burned the tokens."</pre>
                                        </div>
                                        <h4>4. Show, Don't Tell</h4>
                                        <div class="yj-code-example">
                                            <pre>❌ Telling: "ASDF has burned a lot of tokens."
✓ Showing: "ASDF has burned 2.5 billion tokens -
   that's 25% of the original supply, gone forever."</pre>
                                        </div>
                                        <h4>5. Use Concrete Numbers</h4>
                                        <p>Replace vague words with specific data when possible.</p>
                                    `,
            },
            {
              title: 'Explaining Crypto Concepts',
              content: `
                                        <p>Use the "What → Why → How" framework:</p>
                                        <h4>Example: Explaining Token Burns</h4>
                                        <div class="yj-framework">
                                            <div class="yj-framework-step">
                                                <strong>1. WHAT (Definition)</strong>
                                                <p>"A token burn permanently removes tokens from circulation by sending them to an inaccessible wallet."</p>
                                            </div>
                                            <div class="yj-framework-step">
                                                <strong>2. WHY (Purpose)</strong>
                                                <p>"Burns reduce supply, which can increase the value of remaining tokens - basic economics."</p>
                                            </div>
                                            <div class="yj-framework-step">
                                                <strong>3. HOW (Mechanism)</strong>
                                                <p>"ASDF burns happen automatically when tokens are traded. You can verify burns on-chain at any time."</p>
                                            </div>
                                        </div>
                                        <div class="yj-tip"><strong>💡 Analogy Tip:</strong> Compare to familiar concepts. "A burn address is like a shredder for money - once tokens go in, they can never come out."</div>
                                    `,
            },
            {
              title: 'What to Avoid',
              content: `
                                        <h4>Never Include:</h4>
                                        <div class="yj-warning-box">
                                            <ul>
                                                <li><strong>Price predictions:</strong> "ASDF will 10x" - You don't know this</li>
                                                <li><strong>Financial advice:</strong> "You should buy/sell" - You're not licensed</li>
                                                <li><strong>Unverified claims:</strong> Always fact-check</li>
                                                <li><strong>FOMO tactics:</strong> "Buy before it's too late!"</li>
                                                <li><strong>Attacks on others:</strong> Stay positive and constructive</li>
                                            </ul>
                                        </div>
                                        <h4>Always Include:</h4>
                                        <ul>
                                            <li><strong>Disclaimers:</strong> "This is not financial advice"</li>
                                            <li><strong>Sources:</strong> Link to on-chain data, official announcements</li>
                                            <li><strong>Balance:</strong> Acknowledge limitations or risks</li>
                                        </ul>
                                        <div class="yj-info"><strong>📝 Credibility Rule:</strong> It's better to say "I don't know" than to guess. Admitting uncertainty builds trust.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What should great crypto content do?',
            options: [
              'Use as much jargon as possible',
              'Make complex ideas simple',
              'Focus only on price',
              'Be as long as possible',
            ],
            correct: 1,
          },
        },
      ],
      intermediate: [
        {
          id: 'content-i1',
          title: 'Building an Audience',
          sections: [
            {
              title: 'Growing Your Reach',
              content: `
                                        <p>Quality content is nothing without distribution. Here's how to build an audience:</p>
                                        <h4>The Audience Growth Formula:</h4>
                                        <div class="yj-formula">
                                            <span>Consistency</span>
                                            <span>+</span>
                                            <span>Value</span>
                                            <span>+</span>
                                            <span>Engagement</span>
                                            <span>=</span>
                                            <span>Growth</span>
                                        </div>
                                        <p>All three elements are required. Missing one will stall your growth.</p>
                                    `,
            },
            {
              title: 'Consistency',
              content: `
                                        <p>Regular posting trains the algorithm and your audience to expect content from you.</p>
                                        <h4>Posting Schedule Examples:</h4>
                                        <ul>
                                            <li><strong>Twitter/X:</strong> 1-3 tweets per day minimum</li>
                                            <li><strong>Threads:</strong> 2-3 per week</li>
                                            <li><strong>YouTube:</strong> 1-2 videos per week</li>
                                            <li><strong>Articles:</strong> 1 per week</li>
                                        </ul>
                                        <h4>Tips for Staying Consistent:</h4>
                                        <ul>
                                            <li><strong>Batch create:</strong> Write multiple pieces at once</li>
                                            <li><strong>Content calendar:</strong> Plan ahead</li>
                                            <li><strong>Repurpose:</strong> Turn threads into articles, videos into clips</li>
                                            <li><strong>Templates:</strong> Create formats you can reuse</li>
                                        </ul>
                                        <div class="yj-warning"><strong>⚠️ Reality Check:</strong> Start with a schedule you can maintain. It's better to post twice a week consistently than daily for a month then burn out.</div>
                                    `,
            },
            {
              title: 'Providing Value',
              content: `
                                        <p>Every piece of content should give something to the reader:</p>
                                        <h4>Types of Value:</h4>
                                        <ul>
                                            <li><strong>Educational:</strong> Teach something new</li>
                                            <li><strong>Informational:</strong> Share news or updates</li>
                                            <li><strong>Entertainment:</strong> Make them laugh or feel something</li>
                                            <li><strong>Inspiration:</strong> Motivate action or thought</li>
                                            <li><strong>Connection:</strong> Make them feel part of a community</li>
                                        </ul>
                                        <h4>The Value Test:</h4>
                                        <p>Before posting, ask: "Would I save/share this if I saw it from someone else?"</p>
                                        <p>If no, either improve it or don't post it.</p>
                                        <div class="yj-tip"><strong>💡 80/20 Rule:</strong> 80% of your content should give value. Only 20% should be promotional or about yourself.</div>
                                    `,
            },
            {
              title: 'Engagement',
              content: `
                                        <p>Social media is social. You need to engage, not just broadcast:</p>
                                        <h4>Engagement Activities:</h4>
                                        <ul>
                                            <li><strong>Reply to comments:</strong> On your posts and others'</li>
                                            <li><strong>Quote tweet:</strong> Add your take to others' content</li>
                                            <li><strong>Ask questions:</strong> Invite discussion</li>
                                            <li><strong>Participate in spaces:</strong> Join Twitter Spaces, Discord calls</li>
                                            <li><strong>Collaborate:</strong> Work with other creators</li>
                                        </ul>
                                        <h4>Engagement Tips:</h4>
                                        <ul>
                                            <li>Be genuinely helpful, not self-promotional</li>
                                            <li>Respond within the first hour of posting</li>
                                            <li>Engage with accounts similar to or larger than yours</li>
                                            <li>Add value to conversations, don't just agree</li>
                                        </ul>
                                        <div class="yj-info"><strong>🎯 Goal:</strong> Build relationships, not just followers. 100 engaged fans beat 10,000 silent followers.</div>
                                    `,
            },
            {
              title: 'Platform-Specific Tips',
              content: `
                                        <h4>Twitter/X</h4>
                                        <ul>
                                            <li>First line is crucial - it determines if people click "more"</li>
                                            <li>Use line breaks for readability</li>
                                            <li>End threads with a CTA (follow, like, share)</li>
                                        </ul>
                                        <h4>YouTube</h4>
                                        <ul>
                                            <li>Thumbnail and title matter more than content quality</li>
                                            <li>First 30 seconds determine if people stay</li>
                                            <li>Encourage comments to boost algorithm</li>
                                        </ul>
                                        <h4>Discord/Telegram</h4>
                                        <ul>
                                            <li>Be helpful in community channels</li>
                                            <li>Share exclusive content or early access</li>
                                            <li>Build 1-on-1 relationships</li>
                                        </ul>
                                        <div class="yj-tip"><strong>💡 Focus:</strong> Master one platform before expanding to others. Spreading too thin hurts growth everywhere.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What is key to building an audience?',
            options: [
              'Posting once a month',
              'Consistency and engagement',
              'Only promoting yourself',
              'Avoiding replies',
            ],
            correct: 1,
          },
        },
      ],
      advanced: [
        {
          id: 'content-a1',
          title: 'Monetizing Content',
          sections: [
            {
              title: 'Sustainable Creation',
              content: `
                                        <p>Turning your content into income allows you to create full-time:</p>
                                        <h4>Revenue Streams for Creators:</h4>
                                        <ul>
                                            <li><strong>Sponsorships:</strong> Paid mentions or content</li>
                                            <li><strong>Affiliate marketing:</strong> Commission on referrals</li>
                                            <li><strong>Products:</strong> Courses, guides, tools</li>
                                            <li><strong>Services:</strong> Consulting, ghostwriting</li>
                                            <li><strong>Platform rewards:</strong> YouTube ads, creator funds</li>
                                            <li><strong>Memberships:</strong> Premium content for subscribers</li>
                                        </ul>
                                        <div class="yj-info"><strong>📊 Income Diversity:</strong> Don't rely on one source. Multiple streams provide stability.</div>
                                    `,
            },
            {
              title: 'Sponsored Content',
              content: `
                                        <p>Brands will pay for access to your audience. Here's how to do it right:</p>
                                        <h4>Requirements:</h4>
                                        <ul>
                                            <li><strong>Clear disclosure:</strong> Always mark content as sponsored</li>
                                            <li><strong>Authentic alignment:</strong> Only promote what you'd use yourself</li>
                                            <li><strong>Editorial control:</strong> You decide the message, not the sponsor</li>
                                        </ul>
                                        <h4>Pricing Factors:</h4>
                                        <ul>
                                            <li>Follower count and engagement rate</li>
                                            <li>Content format (tweet vs video vs article)</li>
                                            <li>Exclusivity and usage rights</li>
                                            <li>Your reputation and niche expertise</li>
                                        </ul>
                                        <div class="yj-warning"><strong>⚠️ Critical:</strong> Never promote scams, even for money. One bad sponsorship can destroy your reputation permanently.</div>
                                    `,
            },
            {
              title: 'Educational Products',
              content: `
                                        <h4>Product Ideas:</h4>
                                        <ul>
                                            <li><strong>Courses:</strong> In-depth learning on specific topics</li>
                                            <li><strong>E-books/Guides:</strong> Written resources</li>
                                            <li><strong>Templates:</strong> Reusable tools and frameworks</li>
                                            <li><strong>Communities:</strong> Paid access to group + content</li>
                                        </ul>
                                        <h4>Creating a Course:</h4>
                                        <ol>
                                            <li><strong>Validate demand:</strong> Survey your audience first</li>
                                            <li><strong>Outline curriculum:</strong> Clear learning outcomes</li>
                                            <li><strong>Create content:</strong> Video, text, or both</li>
                                            <li><strong>Choose platform:</strong> Gumroad, Teachable, own site</li>
                                            <li><strong>Launch:</strong> Start with your existing audience</li>
                                        </ol>
                                        <div class="yj-tip"><strong>💡 Start Small:</strong> Your first product should be simple. A $20 guide is better than an unfinished $200 course.</div>
                                    `,
            },
            {
              title: 'Legal Considerations',
              content: `
                                        <p>As you grow, legal compliance becomes critical:</p>
                                        <h4>Disclosure Requirements:</h4>
                                        <ul>
                                            <li>FTC requires disclosure of paid partnerships</li>
                                            <li>Use clear language: "Ad" "Sponsored" "Paid partnership"</li>
                                            <li>Disclosure must be visible, not hidden</li>
                                        </ul>
                                        <h4>Financial Content:</h4>
                                        <ul>
                                            <li>Include "Not financial advice" disclaimers</li>
                                            <li>Don't guarantee returns or profits</li>
                                            <li>Disclose if you hold the assets you discuss</li>
                                        </ul>
                                        <h4>Taxes:</h4>
                                        <ul>
                                            <li>Creator income is taxable</li>
                                            <li>Track all revenue streams</li>
                                            <li>Consult a tax professional</li>
                                        </ul>
                                        <div class="yj-warning"><strong>⚠️ Important:</strong> Laws vary by country. Understand the rules where you live.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What must you do with sponsored content?',
            options: ['Hide it', 'Disclose it clearly', 'Deny it', 'Ignore regulations'],
            correct: 1,
          },
        },
      ],
    },
  },
  community: {
    icon: '🤝',
    name: 'Community',
    levels: ['beginner', 'intermediate', 'advanced'],
    modules: {
      beginner: [
        {
          id: 'community-b1',
          title: 'Mastering Community Building',

          // STEP 1: Entry Quiz
          entryQuiz: {
            intro: "Let's discover your community experience and engagement style!",
            questions: [
              {
                question: 'What experience do you have with online communities?',
                options: [
                  "I'm active in several Discord/Telegram groups",
                  "I've participated casually",
                  "I'm new to crypto communities",
                ],
                type: 'assessment',
              },
              {
                question: "What's the most important quality of a community builder?",
                options: [
                  'Helping others succeed',
                  'Promoting the token price',
                  'Being the loudest voice',
                  'Excluding newcomers',
                ],
                correct: 0,
                explanation:
                  "Great community builders think 'How can I help?' before 'What can I get?' - helping others succeed builds lasting communities.",
              },
              {
                question: "When someone asks 'Is this a scam?' you should:",
                options: [
                  'Respond patiently with facts and resources',
                  'Get angry and defensive',
                  'Ignore them',
                  'Call them FUD spreaders',
                ],
                correct: 0,
                explanation:
                  'New members often have trust concerns. Responding with patience and verified information builds trust and grows the community.',
              },
            ],
          },

          // STEP 2: Course Content
          course: [
            {
              title: 'Welcome to Community Building',
              content: `
                                        <p>Welcome to the Community Builder path! Community is what makes crypto projects survive and thrive. As a community builder, you're essential to ASDF's success.</p>
                                        <div class="yj-objectives">
                                            <h4>What You'll Learn</h4>
                                            <ul>
                                                <li>How to welcome and support newcomers</li>
                                                <li>Managing community platforms effectively</li>
                                                <li>Handling FUD and protecting from scams</li>
                                                <li>Building genuine connections and culture</li>
                                            </ul>
                                        </div>
                                        <div class="yj-feature-cards">
                                            <div class="yj-feature-card">
                                                <span>👋</span>
                                                <strong>Welcoming</strong>
                                                <p>Help newcomers feel at home</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🤝</span>
                                                <strong>Supporting</strong>
                                                <p>Answer questions patiently</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🛡️</span>
                                                <strong>Protecting</strong>
                                                <p>Keep the community safe</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>🔗</span>
                                                <strong>Connecting</strong>
                                                <p>Bring people together</p>
                                            </div>
                                        </div>
                                        <div class="yj-key-concept">
                                            <strong>The Golden Rule</strong>
                                            <p>Always ask "How can I help?" before "What can I get?" - this mindset builds lasting communities.</p>
                                        </div>

                                        <div class="yj-skill-tree">
                                            <div class="yj-chart-title">🌳 Your Community Builder Journey</div>
                                            <div class="yj-skill-level">
                                                <div class="yj-skill-node current">
                                                    <span class="yj-skill-icon">🌱</span>
                                                    <span class="yj-skill-name">Basics</span>
                                                </div>
                                            </div>
                                            <div class="yj-skill-level">
                                                <div class="yj-skill-node">
                                                    <span class="yj-skill-icon">👋</span>
                                                    <span class="yj-skill-name">Welcome</span>
                                                </div>
                                                <div class="yj-skill-node">
                                                    <span class="yj-skill-icon">🛡️</span>
                                                    <span class="yj-skill-name">Protect</span>
                                                </div>
                                            </div>
                                            <div class="yj-skill-level">
                                                <div class="yj-skill-node">
                                                    <span class="yj-skill-icon">🎯</span>
                                                    <span class="yj-skill-name">Events</span>
                                                </div>
                                                <div class="yj-skill-node">
                                                    <span class="yj-skill-icon">📈</span>
                                                    <span class="yj-skill-name">Growth</span>
                                                </div>
                                            </div>
                                            <div class="yj-skill-level">
                                                <div class="yj-skill-node">
                                                    <span class="yj-skill-icon">👑</span>
                                                    <span class="yj-skill-name">Leader</span>
                                                </div>
                                            </div>
                                        </div>
                                    `,
            },
            {
              title: 'Understanding Our Platforms',
              content: `
                                        <p>ASDF community exists across multiple platforms, each with its own culture:</p>

                                        <div class="yj-chart-container">
                                            <div class="yj-chart-title">📊 Community Engagement by Platform</div>
                                            <div class="yj-bar-chart">
                                                <div class="yj-bar-item">
                                                    <span class="yj-bar-label">Discord</span>
                                                    <div class="yj-bar-track">
                                                        <div class="yj-bar-fill purple" style="width: 85%;">85%</div>
                                                    </div>
                                                </div>
                                                <div class="yj-bar-item">
                                                    <span class="yj-bar-label">Telegram</span>
                                                    <div class="yj-bar-track">
                                                        <div class="yj-bar-fill blue" style="width: 65%;">65%</div>
                                                    </div>
                                                </div>
                                                <div class="yj-bar-item">
                                                    <span class="yj-bar-label">Twitter/X</span>
                                                    <div class="yj-bar-track">
                                                        <div class="yj-bar-fill orange" style="width: 75%;">75%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="yj-platform-grid">
                                            <div class="yj-platform-card">
                                                <h4>Discord</h4>
                                                <p>Main hub for deep discussions, support, and announcements.</p>
                                                <ul>
                                                    <li>Real-time chat with organized channels</li>
                                                    <li>Voice channels for calls</li>
                                                    <li>Roles and permissions</li>
                                                </ul>
                                            </div>
                                            <div class="yj-platform-card">
                                                <h4>Telegram</h4>
                                                <p>Quick updates and casual community chat.</p>
                                                <ul>
                                                    <li>Mobile-first experience</li>
                                                    <li>Fast notifications</li>
                                                    <li>Easy for newcomers</li>
                                                </ul>
                                            </div>
                                            <div class="yj-platform-card">
                                                <h4>Twitter/X</h4>
                                                <p>Public face and content distribution.</p>
                                                <ul>
                                                    <li>News and updates</li>
                                                    <li>Memes and viral content</li>
                                                    <li>Broader reach</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div class="yj-diagram">
                                            <div class="yj-diagram-block">
                                                Newcomer<small>Joins via X</small>
                                            </div>
                                            <span class="yj-diagram-arrow">→</span>
                                            <div class="yj-diagram-block">
                                                Telegram<small>Quick questions</small>
                                            </div>
                                            <span class="yj-diagram-arrow">→</span>
                                            <div class="yj-diagram-block">
                                                Discord<small>Deep engagement</small>
                                            </div>
                                            <span class="yj-diagram-arrow">→</span>
                                            <div class="yj-diagram-block">
                                                Active Member<small>Contributing</small>
                                            </div>
                                        </div>

                                        <div class="yj-tip"><strong>Pro Tip:</strong> Each platform has different norms. What works on Telegram may not work on Discord. Adapt your approach.</div>
                                    `,
            },
            {
              title: 'Being an Excellent Community Member',
              content: `
                                        <p>Your behavior sets the tone for the entire community. Lead by example:</p>
                                        <h4>The Do's ✓</h4>
                                        <ul>
                                            <li><strong>Be welcoming:</strong> Greet newcomers, answer basic questions</li>
                                            <li><strong>Be patient:</strong> Not everyone knows what you know</li>
                                            <li><strong>Be helpful:</strong> Point people to resources proactively</li>
                                            <li><strong>Be positive:</strong> Celebrate wins, support during dips</li>
                                            <li><strong>Be honest:</strong> Admit when you don't know something</li>
                                        </ul>
                                        <h4>The Don'ts ✗</h4>
                                        <ul>
                                            <li><strong>Don't spread FUD:</strong> Panic helps no one</li>
                                            <li><strong>Don't attack:</strong> Disagree respectfully</li>
                                            <li><strong>Don't spam:</strong> Quality over quantity</li>
                                            <li><strong>Don't shill:</strong> Avoid price pumping language</li>
                                            <li><strong>Don't DM unsolicited:</strong> Respect boundaries</li>
                                        </ul>
                                        <table class="yj-comparison-table">
                                            <tr><th>Scenario</th><th>Bad Response</th><th>Good Response</th></tr>
                                            <tr><td>Price drop</td><td>"We're all gonna make it!!!"</td><td>"Focus on the burns - fundamentals are strong"</td></tr>
                                            <tr><td>FUD post</td><td>"FUD! Ban this person!"</td><td>"Here's the on-chain data that addresses this concern"</td></tr>
                                        </table>
                                    `,
            },
            {
              title: 'Welcoming Newcomers',
              content: `
                                        <p>New members are the lifeblood of community growth. Make their first experience positive:</p>
                                        <h4>Common Newcomer Questions</h4>
                                        <ol>
                                            <li>"What is ASDF?" - Explain the project simply</li>
                                            <li>"How do I buy?" - Guide them step by step</li>
                                            <li>"Is this legit?" - Provide verifiable proof</li>
                                            <li>"When moon?" - Redirect to fundamentals</li>
                                        </ol>
                                        <h4>The CARE Framework</h4>
                                        <ul>
                                            <li><strong>C - Connect:</strong> Greet them warmly by name</li>
                                            <li><strong>A - Answer:</strong> Address their actual question</li>
                                            <li><strong>R - Resource:</strong> Link to helpful guides</li>
                                            <li><strong>E - Encourage:</strong> Invite them to ask more</li>
                                        </ul>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Example Welcome Response</div>
                                            <pre>Hey @NewUser, welcome! Great question.

ASDF is a deflationary token on Solana - tokens
get burned regularly, shrinking the supply.

Here's our beginner guide: [link]

Feel free to ask anything else - we're
happy to help!</pre>
                                        </div>
                                    `,
            },
            {
              title: 'Understanding FUD',
              content: `
                                        <p><strong>FUD</strong> = Fear, Uncertainty, and Doubt. But not all criticism is FUD:</p>
                                        <div class="yj-feature-cards">
                                            <div class="yj-feature-card">
                                                <span>🤔</span>
                                                <strong>Legitimate Concerns</strong>
                                                <p>Real questions deserving honest answers</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>❓</span>
                                                <strong>Misinformation</strong>
                                                <p>Wrong facts spread unintentionally</p>
                                            </div>
                                            <div class="yj-feature-card">
                                                <span>👎</span>
                                                <strong>Deliberate FUD</strong>
                                                <p>Intentional attacks to harm the project</p>
                                            </div>
                                        </div>

                                        <div class="yj-scenario-container" id="fud-scenario-1" data-scenario-id="fud-scenario-1">
                                            <div class="yj-scenario-header">
                                                <span class="yj-scenario-icon">🎯</span>
                                                <span class="yj-scenario-title">Interactive Scenario</span>
                                            </div>
                                            <p class="yj-scenario-text">
                                                Someone posts in chat: "This project is dead! No updates in weeks, devs abandoned it!"
                                                <br><br>
                                                How should you respond?
                                            </p>
                                            <div class="yj-scenario-options">
                                                <div class="yj-scenario-option" data-option="0" data-correct="false">
                                                    <span class="yj-scenario-option-icon">😤</span>
                                                    <span class="yj-scenario-option-text">"Stop spreading FUD! Get out of here!"</span>
                                                </div>
                                                <div class="yj-scenario-option" data-option="1" data-correct="true">
                                                    <span class="yj-scenario-option-icon">🤝</span>
                                                    <span class="yj-scenario-option-text">"I understand the concern. Here are the latest commits/burns from this week: [link]"</span>
                                                </div>
                                                <div class="yj-scenario-option" data-option="2" data-correct="false">
                                                    <span class="yj-scenario-option-icon">🙈</span>
                                                    <span class="yj-scenario-option-text">Ignore it completely</span>
                                                </div>
                                            </div>
                                            <div class="yj-scenario-feedback" id="fud-scenario-1-feedback"></div>
                                        </div>

                                        <h4>The CALM Framework for Responding</h4>
                                        <ul>
                                            <li><strong>C - Consider:</strong> Is this legitimate concern or bad faith?</li>
                                            <li><strong>A - Acknowledge:</strong> Show you've heard them</li>
                                            <li><strong>L - Link to facts:</strong> Provide on-chain data or official sources</li>
                                            <li><strong>M - Move on:</strong> Don't get into endless arguments</li>
                                        </ul>
                                        <div class="yj-warning"><strong>Key Insight:</strong> Sometimes criticism is valid. Dismissing all concerns as "FUD" makes us look like we're hiding something.</div>
                                    `,
            },
            {
              title: 'Protecting Against Scams',
              content: `
                                        <p>Scammers aggressively target crypto communities. Learn to protect yourself and others:</p>

                                        <div class="yj-chart-container">
                                            <div class="yj-chart-title">🚨 Scam Types by Frequency</div>
                                            <div class="yj-bar-chart">
                                                <div class="yj-bar-item">
                                                    <span class="yj-bar-label">Fake DMs</span>
                                                    <div class="yj-bar-track">
                                                        <div class="yj-bar-fill orange" style="width: 90%;">90%</div>
                                                    </div>
                                                </div>
                                                <div class="yj-bar-item">
                                                    <span class="yj-bar-label">Phishing</span>
                                                    <div class="yj-bar-track">
                                                        <div class="yj-bar-fill purple" style="width: 75%;">75%</div>
                                                    </div>
                                                </div>
                                                <div class="yj-bar-item">
                                                    <span class="yj-bar-label">Fake Airdrops</span>
                                                    <div class="yj-bar-track">
                                                        <div class="yj-bar-fill blue" style="width: 60%;">60%</div>
                                                    </div>
                                                </div>
                                                <div class="yj-bar-item">
                                                    <span class="yj-bar-label">Giveaways</span>
                                                    <div class="yj-bar-track">
                                                        <div class="yj-bar-fill gold" style="width: 45%;">45%</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <h4>Common Scam Types</h4>
                                        <ul>
                                            <li><strong>Fake Admin DMs:</strong> "Admin" asking for wallet/funds</li>
                                            <li><strong>Phishing Links:</strong> Fake websites stealing credentials</li>
                                            <li><strong>Airdrop Scams:</strong> "Send X to receive Y" offers</li>
                                            <li><strong>Impersonation:</strong> Fake accounts mimicking real people</li>
                                            <li><strong>Giveaway Scams:</strong> "Send ETH for double back"</li>
                                        </ul>

                                        <h4>Red Flags to Watch For</h4>
                                        <ul>
                                            <li>Unsolicited DMs (admins never DM first!)</li>
                                            <li>Urgency tactics ("Act now or miss out!")</li>
                                            <li>Too good to be true offers</li>
                                            <li>Requests for private keys or seed phrases</li>
                                            <li>Slightly misspelled usernames</li>
                                        </ul>

                                        <div class="yj-flashcard" data-interactive="flashcard">
                                            <div class="yj-flashcard-inner">
                                                <div class="yj-flashcard-front">
                                                    <h3>Click to reveal the Golden Rule</h3>
                                                    <span class="hint">Tap to flip</span>
                                                </div>
                                                <div class="yj-flashcard-back">
                                                    <p><strong>NEVER</strong> share your seed phrase or private key. No legitimate admin, support, or airdrop will <strong>EVER</strong> ask for it.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="yj-key-concept">
                                            <strong>Remember</strong>
                                            <p>If something seems too good to be true, it probably is. When in doubt, ask in the public chat first.</p>
                                        </div>
                                    `,
            },
          ],

          // STEP 3: Knowledge Quiz
          quiz: {
            intro: "Let's check what you've learned about community building!",
            passingScore: 70,
            questions: [
              {
                question: 'What does CARE stand for in the newcomer welcome framework?',
                options: [
                  'Connect, Answer, Resource, Encourage',
                  'Call, Ask, Reply, End',
                  'Chat, Announce, Read, Exit',
                  'None of these',
                ],
                correct: 0,
                explanation:
                  'CARE = Connect (greet warmly), Answer (their question), Resource (link guides), Encourage (invite more questions).',
              },
              {
                question: 'When someone posts criticism of ASDF, you should:',
                options: [
                  'Immediately call it FUD',
                  'Use the CALM framework to respond appropriately',
                  'Ignore all criticism',
                  'Get angry and defensive',
                ],
                correct: 1,
                explanation:
                  "Use CALM: Consider if it's valid, Acknowledge their concern, Link to facts, Move on. Not all criticism is FUD.",
              },
              {
                question: 'What is a major red flag for a scam?',
                options: [
                  'An admin DMs you first asking for your wallet',
                  'Someone asks a question in the public chat',
                  'A member shares a meme',
                  'An announcement in the official channel',
                ],
                correct: 0,
                explanation:
                  'Real admins NEVER DM first asking for wallet info or private keys. This is always a scam.',
              },
              {
                question: 'The best mindset for community building is:',
                options: [
                  'How can I help?',
                  'What can I get?',
                  'How can I be famous?',
                  'When will price go up?',
                ],
                correct: 0,
                explanation:
                  "Great community builders always ask 'How can I help?' first. This mindset builds trust and lasting communities.",
              },
            ],
          },

          // STEP 4: Deep Content
          deepContent: [
            {
              title: 'Advanced Community Management',
              content: `
                                        <h4>Building Community Culture</h4>
                                        <p>Culture isn't created by rules - it's created by consistent behavior:</p>
                                        <ul>
                                            <li><strong>Model the behavior:</strong> Be what you want to see</li>
                                            <li><strong>Recognize good actors:</strong> Highlight helpful members</li>
                                            <li><strong>Address bad behavior quickly:</strong> But fairly</li>
                                            <li><strong>Create traditions:</strong> Regular events, memes, inside jokes</li>
                                        </ul>
                                        <h4>Handling Difficult Situations</h4>
                                        <ul>
                                            <li><strong>Price dumps:</strong> Acknowledge the situation, focus on fundamentals</li>
                                            <li><strong>Internal conflicts:</strong> Mediate privately when possible</li>
                                            <li><strong>Coordinated attacks:</strong> Document, report, don't engage</li>
                                            <li><strong>Member leaving:</strong> Wish them well, don't burn bridges</li>
                                        </ul>
                                        <div class="yj-tip"><strong>Leadership Tip:</strong> How you handle hard times defines community culture more than how you handle good times.</div>
                                    `,
            },
            {
              title: 'Scaling Your Impact',
              content: `
                                        <h4>From Member to Leader</h4>
                                        <p>As you grow, your impact should scale:</p>
                                        <ul>
                                            <li><strong>Level 1:</strong> Help individuals (answer questions)</li>
                                            <li><strong>Level 2:</strong> Create resources (FAQs, guides)</li>
                                            <li><strong>Level 3:</strong> Mentor others (train new helpers)</li>
                                            <li><strong>Level 4:</strong> Shape culture (set standards)</li>
                                        </ul>
                                        <h4>Documentation</h4>
                                        <p>Create resources that help at scale:</p>
                                        <ul>
                                            <li>FAQ documents for common questions</li>
                                            <li>Welcome message templates</li>
                                            <li>Response frameworks for different situations</li>
                                            <li>Onboarding guides for new community helpers</li>
                                        </ul>
                                        <div class="yj-key-concept">
                                            <strong>10x Impact</strong>
                                            <p>Teaching 10 people to answer questions is better than answering 100 questions yourself.</p>
                                        </div>
                                    `,
            },
          ],

          // STEP 5: Practice
          practice: [
            {
              type: 'fill-blank',
              id: 'community-practice-1',
              title: 'Community Frameworks',
              instruction: 'Complete these community building concepts:',
              questions: [
                {
                  text: 'CARE stands for Connect, Answer, _____, and Encourage.',
                  blanks: ['Resource'],
                  hints: ['Providing helpful links or guides'],
                },
                {
                  text: 'CALM stands for Consider, Acknowledge, Link to facts, and _____.',
                  blanks: ['Move on'],
                  hints: ['Dont continue arguing endlessly'],
                },
              ],
            },
            {
              type: 'explorer',
              id: 'community-practice-2',
              title: 'Community Participation',
              instruction: 'Practice being an excellent community member:',
              tasks: [
                {
                  task: 'Join the ASDF Discord and introduce yourself',
                  hint: 'Use the introduction channel',
                  verification: 'checkbox',
                },
                {
                  task: 'Help answer a newcomer question in chat',
                  hint: 'Use the CARE framework',
                  verification: 'checkbox',
                },
                {
                  task: 'Report a suspicious message or scam attempt',
                  hint: 'Use the report feature or tag a mod',
                  verification: 'checkbox',
                },
              ],
            },
            {
              type: 'quiz-challenge',
              id: 'community-practice-3',
              title: 'Community Speed Round',
              description: 'Test your community building knowledge!',
              timeLimit: 45,
              questions: [
                { q: 'What does FUD stand for?', a: 'Fear Uncertainty Doubt' },
                { q: 'What does the C in CARE stand for?', a: 'Connect' },
                { q: 'Should admins DM you first?', a: 'No' },
                { q: 'What mindset should you have?', a: 'How can I help' },
                { q: 'What does the M in CALM mean?', a: 'Move on' },
              ],
            },
          ],
        },
        {
          id: 'community-b2',
          title: 'Handling FUD and Scams',
          sections: [
            {
              title: 'Understanding FUD',
              content: `
                                        <p><strong>FUD</strong> stands for Fear, Uncertainty, and Doubt. It's negative information that may or may not be accurate.</p>
                                        <h4>Types of FUD:</h4>
                                        <ul>
                                            <li><strong>Legitimate concerns:</strong> Real questions that deserve answers</li>
                                            <li><strong>Misinformation:</strong> Incorrect facts spread unintentionally</li>
                                            <li><strong>Deliberate FUD:</strong> Intentional attacks to manipulate price or sentiment</li>
                                        </ul>
                                        <div class="yj-info"><strong>📝 Important:</strong> Not all criticism is FUD. Sometimes concerns are valid and deserve honest discussion.</div>
                                    `,
            },
            {
              title: 'Responding to FUD',
              content: `
                                        <h4>The CALM Framework:</h4>
                                        <ol>
                                            <li><strong>C - Consider:</strong> Is this legitimate concern or bad faith?</li>
                                            <li><strong>A - Acknowledge:</strong> Show you've heard them</li>
                                            <li><strong>L - Link to facts:</strong> Provide on-chain data or official sources</li>
                                            <li><strong>M - Move on:</strong> Don't get into endless arguments</li>
                                        </ol>
                                        <div class="yj-code-example">
                                            <div class="yj-code-title">Example Response to FUD</div>
                                            <pre>FUD: "ASDF is a scam, devs are dumping!"

Response: "I understand the concern - trust is
important in crypto. Here's the burn wallet
showing all burns are verifiable on-chain:
[explorer link]

The contract is also verified. Happy to
answer specific questions about the
tokenomics if you have them."</pre>
                                        </div>
                                        <div class="yj-warning"><strong>⚠️ Don't:</strong> Get emotional, call names, or feed trolls. If someone is arguing in bad faith, provide facts once and disengage.</div>
                                    `,
            },
            {
              title: 'Recognizing Scams',
              content: `
                                        <p>Scammers target crypto communities aggressively. Learn to spot them:</p>
                                        <h4>Common Scam Tactics:</h4>
                                        <ul>
                                            <li><strong>Fake admin DMs:</strong> "Admin" messages asking for wallet/funds</li>
                                            <li><strong>Phishing links:</strong> Fake websites that steal credentials</li>
                                            <li><strong>Airdrop scams:</strong> "Send X to receive Y" offers</li>
                                            <li><strong>Impersonation:</strong> Fake accounts mimicking real people</li>
                                            <li><strong>Giveaway scams:</strong> "Send ETH to receive double back"</li>
                                        </ul>
                                        <h4>Red Flags:</h4>
                                        <ul>
                                            <li>Unsolicited DMs</li>
                                            <li>Urgency ("Act now!")</li>
                                            <li>Too good to be true</li>
                                            <li>Requests for private keys or seed phrases</li>
                                            <li>Slightly misspelled usernames</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Protecting the Community',
              content: `
                                        <h4>When You Spot a Scam:</h4>
                                        <ol>
                                            <li><strong>Don't engage:</strong> Don't click links or reply</li>
                                            <li><strong>Report:</strong> Use platform reporting tools</li>
                                            <li><strong>Alert mods:</strong> Tag moderators in Discord/Telegram</li>
                                            <li><strong>Warn others:</strong> "PSA: This is a scam, don't click"</li>
                                        </ol>
                                        <h4>Educate the Community:</h4>
                                        <ul>
                                            <li>Remind people: "Admins will NEVER DM you first"</li>
                                            <li>Share: "Never share your seed phrase with anyone"</li>
                                            <li>Post: "Always verify links before clicking"</li>
                                        </ul>
                                        <div class="yj-tip"><strong>💡 Pro Tip:</strong> Create a pinned message with common scams and how to avoid them. Reference it whenever new scams appear.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'How should you respond to FUD?',
            options: ['Ignore it', 'Get angry', 'Counter with facts calmly', 'Leave the community'],
            correct: 2,
          },
        },
      ],
      intermediate: [
        {
          id: 'community-i1',
          title: 'Organizing Events',
          sections: [
            {
              title: 'Building Engagement',
              content: `
                                        <p>Events keep communities active and growing. They create memorable moments that bond members together.</p>
                                        <h4>Types of Community Events:</h4>
                                        <ul>
                                            <li><strong>AMAs:</strong> Q&A sessions with team or guests</li>
                                            <li><strong>Contests:</strong> Meme competitions, trading challenges</li>
                                            <li><strong>Education:</strong> Workshops, tutorials, deep dives</li>
                                            <li><strong>Celebrations:</strong> Milestone parties, anniversaries</li>
                                            <li><strong>Games:</strong> Trivia, scavenger hunts, tournaments</li>
                                        </ul>
                                        <div class="yj-info"><strong>🎯 Goal:</strong> Create reasons for people to show up, engage, and come back.</div>
                                    `,
            },
            {
              title: 'Planning an Event',
              content: `
                                        <h4>Event Planning Checklist:</h4>
                                        <ol>
                                            <li><strong>Define purpose:</strong> What do you want to achieve?</li>
                                            <li><strong>Pick format:</strong> Live audio, text, video?</li>
                                            <li><strong>Set date/time:</strong> Consider different time zones</li>
                                            <li><strong>Prepare content:</strong> Questions, prizes, materials</li>
                                            <li><strong>Promote:</strong> Announce across all channels</li>
                                            <li><strong>Execute:</strong> Run the event</li>
                                            <li><strong>Follow up:</strong> Share recap, thank participants</li>
                                        </ol>
                                        <h4>Timeline:</h4>
                                        <ul>
                                            <li><strong>1 week before:</strong> First announcement</li>
                                            <li><strong>2-3 days before:</strong> Reminder + details</li>
                                            <li><strong>Day of:</strong> Final reminder 1 hour before</li>
                                            <li><strong>After:</strong> Recap within 24 hours</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Running an AMA',
              content: `
                                        <p>AMAs (Ask Me Anything) are great for transparency and engagement:</p>
                                        <h4>Before the AMA:</h4>
                                        <ul>
                                            <li>Collect questions in advance (reduces dead air)</li>
                                            <li>Prepare answers to likely questions</li>
                                            <li>Test audio/tech setup</li>
                                            <li>Brief the speaker(s) on format and timing</li>
                                        </ul>
                                        <h4>During the AMA:</h4>
                                        <ul>
                                            <li>Start with introductions and ground rules</li>
                                            <li>Mix pre-collected questions with live ones</li>
                                            <li>Keep answers concise (2-3 minutes max)</li>
                                            <li>Have a moderator filter questions</li>
                                            <li>End with call to action</li>
                                        </ul>
                                        <h4>After the AMA:</h4>
                                        <ul>
                                            <li>Post transcript or recording</li>
                                            <li>Share key takeaways</li>
                                            <li>Follow up on any open items</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Contest Ideas',
              content: `
                                        <h4>Easy to Run:</h4>
                                        <ul>
                                            <li><strong>Meme contest:</strong> Best ASDF meme wins</li>
                                            <li><strong>Trivia:</strong> Questions about ASDF/crypto</li>
                                            <li><strong>Caption contest:</strong> Funniest caption for an image</li>
                                            <li><strong>Prediction game:</strong> Guess burn amounts (not price!)</li>
                                        </ul>
                                        <h4>More Complex:</h4>
                                        <ul>
                                            <li><strong>Trading competition:</strong> Best % gains (risky - be careful)</li>
                                            <li><strong>Art contest:</strong> Best ASDF artwork</li>
                                            <li><strong>Builder challenge:</strong> Create a tool or content</li>
                                            <li><strong>Referral contest:</strong> Bring new community members</li>
                                        </ul>
                                        <h4>Prize Considerations:</h4>
                                        <ul>
                                            <li>ASDF tokens (if available)</li>
                                            <li>NFTs or exclusive roles</li>
                                            <li>Merchandise</li>
                                            <li>Recognition (featured content, shoutouts)</li>
                                        </ul>
                                        <div class="yj-tip"><strong>💡 Tip:</strong> Clear rules prevent disputes. Specify eligibility, judging criteria, and prize distribution upfront.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What keeps a community active?',
            options: [
              'Silence',
              'Regular events and engagement',
              'Strict rules only',
              'Price talk only',
            ],
            correct: 1,
          },
        },
      ],
      advanced: [
        {
          id: 'community-a1',
          title: 'Community Leadership',
          sections: [
            {
              title: 'Leading by Example',
              content: `
                                        <p>Senior community members shape the culture through their actions:</p>
                                        <h4>Leadership Behaviors:</h4>
                                        <ul>
                                            <li><strong>Model tone:</strong> Stay calm during volatility</li>
                                            <li><strong>Show consistency:</strong> Be present regularly</li>
                                            <li><strong>Admit mistakes:</strong> Shows authenticity</li>
                                            <li><strong>Celebrate others:</strong> Lift up community members</li>
                                            <li><strong>Handle conflict gracefully:</strong> Mediate, don't escalate</li>
                                        </ul>
                                        <div class="yj-info"><strong>🎯 Key Insight:</strong> People follow behavior, not rules. How you act sets the standard for everyone.</div>
                                    `,
            },
            {
              title: 'Mentoring New Moderators',
              content: `
                                        <p>Building a strong mod team is essential for scaling:</p>
                                        <h4>Selecting Moderators:</h4>
                                        <ul>
                                            <li>Look for consistent, positive contributors</li>
                                            <li>Prioritize judgment over availability</li>
                                            <li>Diversity in time zones and perspectives</li>
                                            <li>Start with a trial period</li>
                                        </ul>
                                        <h4>Training Moderators:</h4>
                                        <ol>
                                            <li>Shadow experienced mods first</li>
                                            <li>Document guidelines and common scenarios</li>
                                            <li>Start with limited permissions</li>
                                            <li>Regular check-ins and feedback</li>
                                            <li>Gradually increase responsibility</li>
                                        </ol>
                                        <h4>Mod Guidelines to Document:</h4>
                                        <ul>
                                            <li>What warrants a warning vs ban</li>
                                            <li>How to handle specific situations</li>
                                            <li>Escalation procedures</li>
                                            <li>Communication standards</li>
                                        </ul>
                                    `,
            },
            {
              title: 'Crisis Management',
              content: `
                                        <p>Every community faces crises. How you handle them defines trust:</p>
                                        <h4>Types of Crises:</h4>
                                        <ul>
                                            <li>Major price drops</li>
                                            <li>Technical issues or exploits</li>
                                            <li>Coordinated FUD attacks</li>
                                            <li>Team member departures</li>
                                            <li>Regulatory news</li>
                                        </ul>
                                        <h4>Crisis Response Framework:</h4>
                                        <ol>
                                            <li><strong>Acknowledge:</strong> Don't hide or ignore</li>
                                            <li><strong>Gather facts:</strong> Before speaking, know what's true</li>
                                            <li><strong>Communicate:</strong> Share what you know and don't know</li>
                                            <li><strong>Take action:</strong> What's being done to address it</li>
                                            <li><strong>Update:</strong> Keep community informed as situation evolves</li>
                                        </ol>
                                        <div class="yj-warning"><strong>⚠️ Never:</strong> Lie, hide problems, or blame others. Transparency builds trust even in hard times.</div>
                                    `,
            },
            {
              title: 'Strategic Growth',
              content: `
                                        <p>Sustainable growth requires strategy, not just activity:</p>
                                        <h4>Growth Metrics to Track:</h4>
                                        <ul>
                                            <li><strong>Member count:</strong> Total community size</li>
                                            <li><strong>Active members:</strong> Daily/weekly active participants</li>
                                            <li><strong>Engagement rate:</strong> Messages per member</li>
                                            <li><strong>Retention:</strong> How many new members stay active</li>
                                            <li><strong>Sentiment:</strong> Overall community mood</li>
                                        </ul>
                                        <h4>Growth Strategies:</h4>
                                        <ul>
                                            <li><strong>Content:</strong> Valuable content attracts new members</li>
                                            <li><strong>Partnerships:</strong> Collaborate with aligned communities</li>
                                            <li><strong>Events:</strong> Give people reasons to invite friends</li>
                                            <li><strong>Recognition:</strong> Highlight active members</li>
                                            <li><strong>Onboarding:</strong> Make first experience excellent</li>
                                        </ul>
                                        <div class="yj-tip"><strong>💡 Quality Over Quantity:</strong> 1,000 engaged members beat 10,000 inactive ones. Focus on engagement, not just numbers.</div>
                                    `,
            },
          ],
          quiz: {
            question: 'What shapes community culture?',
            options: ['Rules alone', 'Leadership by example', 'Punishments', 'Silence'],
            correct: 1,
          },
        },
      ],
    },
  },
};

// ============================================
// BADGES / ACHIEVEMENTS SYSTEM
// ============================================
const JOURNEY_BADGES = {
  // First steps badges
  'first-step': {
    id: 'first-step',
    icon: '🌱',
    name: 'First Step',
    desc: 'Complete your first module',
    check: state => state.completedModules.length >= 1,
  },
  'curious-mind': {
    id: 'curious-mind',
    icon: '🔍',
    name: 'Curious Mind',
    desc: 'Complete 5 modules',
    check: state => state.completedModules.length >= 5,
  },
  'dedicated-learner': {
    id: 'dedicated-learner',
    icon: '📚',
    name: 'Dedicated Learner',
    desc: 'Complete 10 modules',
    check: state => state.completedModules.length >= 10,
  },
  // Level completion badges
  'beginner-code': {
    id: 'beginner-code',
    icon: '💻',
    name: 'Code Initiate',
    desc: 'Complete Code & Dev Beginner level',
    check: state => state.completedLevels.includes('code-beginner'),
  },
  'beginner-design': {
    id: 'beginner-design',
    icon: '🎨',
    name: 'Design Initiate',
    desc: 'Complete Design & UX Beginner level',
    check: state => state.completedLevels.includes('design-beginner'),
  },
  'beginner-content': {
    id: 'beginner-content',
    icon: '✍️',
    name: 'Content Initiate',
    desc: 'Complete Content Beginner level',
    check: state => state.completedLevels.includes('content-beginner'),
  },
  'beginner-community': {
    id: 'beginner-community',
    icon: '🤝',
    name: 'Community Initiate',
    desc: 'Complete Community Beginner level',
    check: state => state.completedLevels.includes('community-beginner'),
  },
  // Intermediate badges
  'intermediate-any': {
    id: 'intermediate-any',
    icon: '⬆️',
    name: 'Level Up',
    desc: 'Complete any Intermediate level',
    check: state => state.completedLevels.some(l => l.includes('intermediate')),
  },
  // Advanced badges
  'advanced-any': {
    id: 'advanced-any',
    icon: '🌟',
    name: 'Rising Star',
    desc: 'Complete any Advanced level',
    check: state => state.completedLevels.some(l => l.includes('advanced')),
  },
  // Multi-pillar badges
  explorer: {
    id: 'explorer',
    icon: '🧭',
    name: 'Explorer',
    desc: 'Start modules in 2 different pillars',
    check: state => {
      const pillars = new Set(state.completedModules.map(m => m.split('-')[0]));
      return pillars.size >= 2;
    },
  },
  polymath: {
    id: 'polymath',
    icon: '🎯',
    name: 'Polymath',
    desc: 'Complete beginner level in all 4 pillars',
    check: state => {
      const required = [
        'code-beginner',
        'design-beginner',
        'content-beginner',
        'community-beginner',
      ];
      return required.every(l => state.completedLevels.includes(l));
    },
  },
  // Mastery badges
  'code-master': {
    id: 'code-master',
    icon: '👨‍💻',
    name: 'Code Master',
    desc: 'Complete all Code & Dev levels',
    check: state =>
      ['code-beginner', 'code-intermediate', 'code-advanced'].every(l =>
        state.completedLevels.includes(l)
      ),
  },
  'design-master': {
    id: 'design-master',
    icon: '🎭',
    name: 'Design Master',
    desc: 'Complete all Design & UX levels',
    check: state =>
      ['design-beginner', 'design-intermediate', 'design-advanced'].every(l =>
        state.completedLevels.includes(l)
      ),
  },
  'content-master': {
    id: 'content-master',
    icon: '📝',
    name: 'Content Master',
    desc: 'Complete all Content levels',
    check: state =>
      ['content-beginner', 'content-intermediate', 'content-advanced'].every(l =>
        state.completedLevels.includes(l)
      ),
  },
  'community-master': {
    id: 'community-master',
    icon: '👑',
    name: 'Community Master',
    desc: 'Complete all Community levels',
    check: state =>
      ['community-beginner', 'community-intermediate', 'community-advanced'].every(l =>
        state.completedLevels.includes(l)
      ),
  },
  // Ultimate badge
  'asdf-legend': {
    id: 'asdf-legend',
    icon: '🏆',
    name: 'ASDF Legend',
    desc: 'Master all 4 pillars',
    check: state => {
      const allMasters = ['code-master', 'design-master', 'content-master', 'community-master'];
      return allMasters.every(b => state.unlockedBadges && state.unlockedBadges.includes(b));
    },
  },
};

let journeyState = {
  currentPillar: null,
  currentLevel: 'beginner',
  currentModuleIndex: 0,
  currentStep: LEARNING_STEPS.ENTRY_QUIZ, // Current learning step
  currentSubIndex: 0, // Index within current step (for sections, questions, etc.)
  completedModules: [],
  completedLevels: [],
  unlockedBadges: [],
  quizPassed: {},
  entryQuizResults: {}, // Store entry quiz results for personalization
  moduleProgress: {}, // Track progress within each module
};

function loadJourneyState() {
  try {
    const saved = localStorage.getItem(YJ_STORAGE_KEY);
    if (saved) {
      journeyState = { ...journeyState, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not load journey state');
  }
}

function saveYourJourneyState() {
  try {
    localStorage.setItem(YJ_STORAGE_KEY, JSON.stringify(journeyState));
    checkForNewBadges();
  } catch (e) {
    console.warn('Could not save journey state');
  }
}

function checkForNewBadges() {
  const newBadges = [];
  for (const [badgeId, badge] of Object.entries(JOURNEY_BADGES)) {
    if (!journeyState.unlockedBadges.includes(badgeId) && badge.check(journeyState)) {
      journeyState.unlockedBadges.push(badgeId);
      newBadges.push(badge);
    }
  }
  if (newBadges.length > 0) {
    localStorage.setItem(YJ_STORAGE_KEY, JSON.stringify(journeyState));
    newBadges.forEach((badge, i) => {
      setTimeout(() => showBadgeNotification(badge), i * 1500);
    });
  }
}

function showBadgeNotification(badge) {
  // Remove existing notification
  const existing = document.querySelector('.yj-badge-notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = 'yj-badge-notification';
  safeInnerHTML(
    notification,
    `
                <div class="yj-badge-notif-content">
                    <span class="yj-badge-notif-icon">${escapeHtml(badge.icon)}</span>
                    <div class="yj-badge-notif-text">
                        <span class="yj-badge-notif-label">Badge Unlocked!</span>
                        <span class="yj-badge-notif-name">${escapeHtml(badge.name)}</span>
                    </div>
                </div>
            `
  );
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 50);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

function getJourneyBadges() {
  return Object.entries(JOURNEY_BADGES).map(([id, badge]) => ({
    ...badge,
    unlocked: journeyState.unlockedBadges.includes(id),
  }));
}

function openYourJourney(pillar, level) {
  loadJourneyState();
  const modal = document.getElementById('your-journey-modal');
  if (modal) {
    modal.classList.add('active');

    if (pillar && JOURNEY_PILLARS[pillar]) {
      journeyState.currentPillar = pillar;
      journeyState.currentLevel = level || 'beginner';
      journeyState.currentModuleIndex = 0;
      showJourneyContent();
    } else if (journeyState.currentPillar) {
      showJourneyContent();
    } else {
      showJourneyWelcome();
    }
  }
}

function closeYourJourney() {
  const modal = document.getElementById('your-journey-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function showJourneyWelcome() {
  document.getElementById('yj-welcome').style.display = 'block';
  document.getElementById('yj-module').style.display = 'none';
  document.getElementById('yj-quiz').style.display = 'none';
  document.getElementById('yj-path-selector').style.display = 'none';
  document.getElementById('yj-change-path-btn').style.display = 'none';
  document.getElementById('yj-level-selector').style.display = 'none';
  renderJourneyRoadmap();
}

function showJourneyContent() {
  document.getElementById('yj-welcome').style.display = 'none';
  document.getElementById('yj-module').style.display = 'block';
  document.getElementById('yj-quiz').style.display = 'none';
  document.getElementById('yj-path-selector').style.display = 'none';

  // Show change path button and level selector
  document.getElementById('yj-change-path-btn').style.display = 'flex';
  document.getElementById('yj-level-selector').style.display = 'block';

  // Update level tabs
  updateLevelTabs();

  updateJourneyProfile();
  renderJourneyRoadmap();
  renderCurrentModule();
}

function updateLevelTabs() {
  const tabs = document.querySelectorAll('.yj-level-tab');
  tabs.forEach(tab => {
    const level = tab.dataset.level;
    tab.classList.remove('active');
    if (level === journeyState.currentLevel) {
      tab.classList.add('active');
    }
  });
}

function updateJourneyProfile() {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  if (!pillar) return;

  document.getElementById('yj-profile-icon').textContent = pillar.icon;
  document.getElementById('yj-profile-name').textContent = pillar.name;
  document.getElementById('yj-profile-level').textContent =
    journeyState.currentLevel.charAt(0).toUpperCase() + journeyState.currentLevel.slice(1);

  // Update progress
  const modules = pillar.modules[journeyState.currentLevel] || [];
  const completed = journeyState.completedModules.filter(m =>
    modules.some(mod => mod.id === m)
  ).length;
  const progress = modules.length > 0 ? (completed / modules.length) * 100 : 0;

  document.getElementById('yj-overall-progress').style.width = progress + '%';
  document.getElementById('yj-progress-text').textContent =
    `${completed}/${modules.length} modules`;
}

function renderJourneyRoadmap() {
  const roadmap = document.getElementById('yj-roadmap');
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];

  if (!pillar) {
    safeInnerHTML(
      roadmap,
      '<h4>📍 Roadmap</h4><p style="color: var(--text-muted); font-size: 12px;">Select a pillar to see your roadmap</p>'
    );
    return;
  }

  const modules = pillar.modules[journeyState.currentLevel] || [];
  let html = '<h4>📍 Roadmap</h4>';

  modules.forEach((mod, index) => {
    const isCompleted = journeyState.completedModules.includes(mod.id);
    const isActive = index === journeyState.currentModuleIndex;
    const isLocked = index > journeyState.currentModuleIndex && !isCompleted;

    html += `
                    <div class="yj-roadmap-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}"
                         data-module-index="${index}" ${isLocked ? '' : 'onclick="goToJourneyModule(' + index + ')"'}>
                        <div class="yj-roadmap-check"></div>
                        <div class="yj-roadmap-info">
                            <strong>Module ${index + 1}</strong>
                            <span>${mod.title}</span>
                        </div>
                    </div>
                `;
  });

  safeInnerHTML(roadmap, html);
}

// Learning flow step labels
const STEP_LABELS = {
  [LEARNING_STEPS.ENTRY_QUIZ]: { icon: '🎯', label: 'Assessment', short: '1' },
  [LEARNING_STEPS.COURSE]: { icon: '📚', label: 'Course', short: '2' },
  [LEARNING_STEPS.KNOWLEDGE_QUIZ]: { icon: '✓', label: 'Quiz', short: '3' },
  [LEARNING_STEPS.DEEP_CONTENT]: { icon: '🔬', label: 'Deep Dive', short: '4' },
  [LEARNING_STEPS.PRACTICE]: { icon: '🛠️', label: 'Practice', short: '5' },
};

const STEPS_ORDER = [
  LEARNING_STEPS.ENTRY_QUIZ,
  LEARNING_STEPS.COURSE,
  LEARNING_STEPS.KNOWLEDGE_QUIZ,
  LEARNING_STEPS.DEEP_CONTENT,
  LEARNING_STEPS.PRACTICE,
];

function renderCurrentModule() {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  if (!pillar) return;

  const modules = pillar.modules[journeyState.currentLevel] || [];
  const mod = modules[journeyState.currentModuleIndex];
  if (!mod) return;

  // Check if module uses new 5-step format or old format
  const hasNewFormat = mod.entryQuiz || mod.course || mod.practice;

  if (hasNewFormat) {
    renderNewFormatModule(mod, modules);
  } else {
    renderLegacyModule(mod, modules);
  }
}

function renderNewFormatModule(mod, modules) {
  const step = journeyState.currentStep;
  const subIndex = journeyState.currentSubIndex;

  // Update header
  document.getElementById('yj-module-badge').textContent =
    `Module ${journeyState.currentModuleIndex + 1}`;
  document.getElementById('yj-module-title').textContent = mod.title;

  let contentHtml = '';

  // Learning flow progress bar
  contentHtml += renderLearningFlowProgress(mod, step);

  // Render content based on current step
  switch (step) {
    case LEARNING_STEPS.ENTRY_QUIZ:
      contentHtml += renderEntryQuiz(mod, subIndex);
      break;
    case LEARNING_STEPS.COURSE:
      contentHtml += renderCourse(mod, subIndex);
      break;
    case LEARNING_STEPS.KNOWLEDGE_QUIZ:
      contentHtml += renderKnowledgeQuiz(mod, subIndex);
      break;
    case LEARNING_STEPS.DEEP_CONTENT:
      contentHtml += renderDeepContent(mod, subIndex);
      break;
    case LEARNING_STEPS.PRACTICE:
      contentHtml += renderPractice(mod, subIndex);
      break;
  }

  safeInnerHTML(document.getElementById('yj-module-content'), contentHtml);

  // Initialize interactive elements (flashcards, scenarios)
  initInteractiveElements();

  // Attach event handlers
  attachStepHandlers(mod, modules);

  // Hide main nav buttons (we use step navigation instead)
  document.getElementById('yj-prev-module').style.display = 'none';
  document.getElementById('yj-next-module').style.display = 'none';
}

function renderLearningFlowProgress(mod, currentStep) {
  const currentIndex = STEPS_ORDER.indexOf(currentStep);
  const moduleProgress = journeyState.moduleProgress[mod.id] || {};

  return `
                <div class="yj-flow-progress">
                    ${STEPS_ORDER.map((step, i) => {
                      const stepInfo = STEP_LABELS[step];
                      const isActive = step === currentStep;
                      const isCompleted = moduleProgress[step] === 'completed';
                      const isAccessible = i <= currentIndex || isCompleted;

                      return `
                            <div class="yj-flow-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isAccessible ? 'accessible' : ''}"
                                 data-step="${step}" title="${stepInfo.label}">
                                <span class="yj-flow-icon">${isCompleted ? '✓' : stepInfo.icon}</span>
                                <span class="yj-flow-label">${stepInfo.label}</span>
                            </div>
                            ${i < STEPS_ORDER.length - 1 ? '<div class="yj-flow-connector"></div>' : ''}
                        `;
                    }).join('')}
                </div>
            `;
}

function renderEntryQuiz(mod, questionIndex) {
  if (!mod.entryQuiz) {
    // Skip to course if no entry quiz
    journeyState.currentStep = LEARNING_STEPS.COURSE;
    journeyState.currentSubIndex = 0;
    return renderCourse(mod, 0);
  }

  const quiz = mod.entryQuiz;
  const questions = quiz.questions || [];

  if (questionIndex >= questions.length) {
    // All questions answered, show results and continue
    return renderEntryQuizComplete(mod);
  }

  const q = questions[questionIndex];
  const isAssessment = q.type === 'assessment';

  return `
                <div class="yj-step-content yj-entry-quiz">
                    <div class="yj-quiz-header">
                        <span class="yj-quiz-badge">Assessment ${questionIndex + 1}/${questions.length}</span>
                        <p class="yj-quiz-intro">${quiz.intro || "Let's see what you know!"}</p>
                    </div>
                    <div class="yj-quiz-question">
                        <h3>${q.question}</h3>
                        <div class="yj-quiz-options">
                            ${q.options
                              .map(
                                (opt, i) => `
                                <button class="yj-quiz-option" data-index="${i}" data-correct="${q.correct === i}">
                                    ${opt}
                                </button>
                            `
                              )
                              .join('')}
                        </div>
                        <div class="yj-quiz-feedback" id="yj-quiz-feedback" style="display: none;"></div>
                    </div>
                    ${isAssessment ? '<p class="yj-quiz-note">No wrong answers here - we just want to know your experience level!</p>' : ''}
                </div>
            `;
}

function renderEntryQuizComplete(mod) {
  const results = journeyState.entryQuizResults[mod.id] || { score: 0, total: 0 };
  const percentage = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;

  let message, recommendation;
  if (percentage >= 80) {
    message = 'Excellent! You already have a strong foundation.';
    recommendation =
      'Feel free to skim the course or jump straight to the Deep Dive for advanced content.';
  } else if (percentage >= 50) {
    message = 'Good start! You have some knowledge to build on.';
    recommendation = 'The course will reinforce what you know and fill in the gaps.';
  } else {
    message = 'Perfect starting point!';
    recommendation = "The course is designed exactly for where you are. Let's learn together!";
  }

  return `
                <div class="yj-step-content yj-entry-complete">
                    <div class="yj-result-card">
                        <div class="yj-result-icon">${percentage >= 50 ? '🌟' : '🚀'}</div>
                        <h3>${message}</h3>
                        <p>${recommendation}</p>
                        <div class="yj-result-score">
                            <span class="yj-score-value">${percentage}%</span>
                            <span class="yj-score-label">prior knowledge</span>
                        </div>
                    </div>
                    <button class="yj-continue-btn btn btn-primary" data-action="start-course">
                        Start Learning →
                    </button>
                </div>
            `;
}

function renderCourse(mod, sectionIndex) {
  const sections = mod.course || [];
  if (sections.length === 0) {
    // Skip to quiz if no course content
    journeyState.currentStep = LEARNING_STEPS.KNOWLEDGE_QUIZ;
    journeyState.currentSubIndex = 0;
    return renderKnowledgeQuiz(mod, 0);
  }

  const section = sections[sectionIndex] || sections[0];
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex >= sections.length - 1;

  return `
                <div class="yj-step-content yj-course">
                    <div class="yj-course-progress">
                        ${sections
                          .map(
                            (s, i) => `
                            <div class="yj-course-dot ${i === sectionIndex ? 'active' : ''} ${i < sectionIndex ? 'completed' : ''}"
                                 data-section="${i}" title="${s.title}"></div>
                        `
                          )
                          .join('')}
                    </div>
                    <div class="yj-course-header">
                        <h3>${section.title}</h3>
                    </div>
                    <div class="yj-course-content">
                        ${section.content}
                    </div>
                    <div class="yj-course-nav">
                        <button class="yj-nav-prev btn btn-secondary" ${isFirst ? 'disabled' : ''} data-action="prev-section">
                            ← Previous
                        </button>
                        <span class="yj-nav-indicator">${sectionIndex + 1} / ${sections.length}</span>
                        <button class="yj-nav-next btn ${isLast ? 'btn-primary' : 'btn-secondary'}" data-action="next-section">
                            ${isLast ? 'Take Quiz →' : 'Next →'}
                        </button>
                    </div>
                </div>
            `;
}

function renderKnowledgeQuiz(mod, questionIndex) {
  const quiz = mod.quiz || {};
  const questions = quiz.questions || [];

  if (questions.length === 0) {
    // No quiz, skip to deep content
    journeyState.currentStep = LEARNING_STEPS.DEEP_CONTENT;
    journeyState.currentSubIndex = 0;
    return renderDeepContent(mod, 0);
  }

  if (questionIndex >= questions.length) {
    return renderQuizComplete(mod);
  }

  const q = questions[questionIndex];

  return `
                <div class="yj-step-content yj-knowledge-quiz">
                    <div class="yj-quiz-header">
                        <span class="yj-quiz-badge">Question ${questionIndex + 1}/${questions.length}</span>
                        <p class="yj-quiz-intro">${quiz.intro || "Let's check what you've learned!"}</p>
                    </div>
                    <div class="yj-quiz-question">
                        <h3>${q.question}</h3>
                        <div class="yj-quiz-options">
                            ${q.options
                              .map(
                                (opt, i) => `
                                <button class="yj-quiz-option" data-index="${i}" data-correct="${q.correct === i}">
                                    ${opt}
                                </button>
                            `
                              )
                              .join('')}
                        </div>
                        <div class="yj-quiz-feedback" id="yj-quiz-feedback" style="display: none;"></div>
                    </div>
                </div>
            `;
}

function renderQuizComplete(mod) {
  const results = journeyState.quizPassed[mod.id] || { score: 0, total: 0 };
  const percentage = results.total > 0 ? Math.round((results.score / results.total) * 100) : 0;
  const passed = percentage >= (mod.quiz?.passingScore || 70);

  return `
                <div class="yj-step-content yj-quiz-complete">
                    <div class="yj-result-card ${passed ? 'success' : 'retry'}">
                        <div class="yj-result-icon">${passed ? '🎉' : '📖'}</div>
                        <h3>${passed ? 'Great job!' : 'Almost there!'}</h3>
                        <p>${passed ? 'You passed the quiz!' : 'Review the course and try again.'}</p>
                        <div class="yj-result-score">
                            <span class="yj-score-value">${percentage}%</span>
                            <span class="yj-score-label">(${results.score}/${results.total} correct)</span>
                        </div>
                    </div>
                    <div class="yj-quiz-actions">
                        ${
                          passed
                            ? `
                            <button class="yj-continue-btn btn btn-primary" data-action="continue-deep">
                                Continue to Deep Dive →
                            </button>
                            <button class="yj-skip-btn btn btn-secondary" data-action="skip-to-practice">
                                Skip to Practice →
                            </button>
                        `
                            : `
                            <button class="yj-retry-btn btn btn-primary" data-action="retry-quiz">
                                Review & Retry →
                            </button>
                        `
                        }
                    </div>
                </div>
            `;
}

function renderDeepContent(mod, sectionIndex) {
  const sections = mod.deepContent || [];
  if (sections.length === 0) {
    // Skip to practice if no deep content
    journeyState.currentStep = LEARNING_STEPS.PRACTICE;
    journeyState.currentSubIndex = 0;
    return renderPractice(mod, 0);
  }

  const section = sections[sectionIndex] || sections[0];
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex >= sections.length - 1;

  return `
                <div class="yj-step-content yj-deep-content">
                    <div class="yj-deep-header">
                        <span class="yj-deep-badge">🔬 Deep Dive</span>
                        <h3>${section.title}</h3>
                    </div>
                    <div class="yj-deep-body">
                        ${section.content}
                    </div>
                    <div class="yj-deep-nav">
                        <button class="yj-nav-prev btn btn-secondary" ${isFirst ? 'disabled' : ''} data-action="prev-deep">
                            ← Previous
                        </button>
                        <span class="yj-nav-indicator">${sectionIndex + 1} / ${sections.length}</span>
                        <button class="yj-nav-next btn ${isLast ? 'btn-primary' : 'btn-secondary'}" data-action="next-deep">
                            ${isLast ? 'Start Practice →' : 'Next →'}
                        </button>
                    </div>
                </div>
            `;
}

function renderPractice(mod, exerciseIndex) {
  const exercises = mod.practice || [];
  if (exercises.length === 0) {
    return renderModuleComplete(mod);
  }

  if (exerciseIndex >= exercises.length) {
    return renderModuleComplete(mod);
  }

  const ex = exercises[exerciseIndex];

  let exerciseHtml = '';
  switch (ex.type) {
    case 'fill-blank':
      exerciseHtml = renderFillBlankExercise(ex);
      break;
    case 'explorer':
      exerciseHtml = renderExplorerExercise(ex);
      break;
    case 'quiz-challenge':
      exerciseHtml = renderQuizChallengeExercise(ex);
      break;
    default:
      exerciseHtml = `<p>Unknown exercise type: ${ex.type}</p>`;
  }

  const isLast = exerciseIndex >= exercises.length - 1;

  return `
                <div class="yj-step-content yj-practice">
                    <div class="yj-practice-header">
                        <span class="yj-practice-badge">🛠️ Practice ${exerciseIndex + 1}/${exercises.length}</span>
                        <h3>${ex.title}</h3>
                        <p>${ex.instruction}</p>
                    </div>
                    <div class="yj-practice-body">
                        ${exerciseHtml}
                    </div>
                    <div class="yj-practice-nav">
                        <button class="yj-nav-prev btn btn-secondary" ${exerciseIndex === 0 ? 'disabled' : ''} data-action="prev-practice">
                            ← Previous
                        </button>
                        <button class="yj-nav-next btn btn-primary" data-action="next-practice">
                            ${isLast ? 'Complete Module →' : 'Next Exercise →'}
                        </button>
                    </div>
                </div>
            `;
}

function renderFillBlankExercise(ex) {
  return `
                <div class="yj-fill-blank-exercise">
                    ${ex.questions
                      .map(
                        (q, i) => `
                        <div class="yj-fill-blank-item" data-index="${i}">
                            <p class="yj-fill-text">${q.text.replace(/_____/g, '<input type="text" class="yj-blank-input" placeholder="...">')}</p>
                            <div class="yj-fill-hints">
                                ${q.hints.map((h, j) => `<span class="yj-hint" title="Hint ${j + 1}">${h}</span>`).join('')}
                            </div>
                            <div class="yj-fill-feedback"></div>
                        </div>
                    `
                      )
                      .join('')}
                    <button class="yj-check-btn btn btn-primary" data-action="check-blanks">Check Answers</button>
                </div>
            `;
}

function renderExplorerExercise(ex) {
  return `
                <div class="yj-explorer-exercise">
                    ${ex.tasks
                      .map(
                        (t, i) => `
                        <div class="yj-explorer-task" data-index="${i}">
                            <div class="yj-task-header">
                                <span class="yj-task-num">${i + 1}</span>
                                <span class="yj-task-text">${t.task}</span>
                            </div>
                            <p class="yj-task-hint">💡 ${t.hint}</p>
                            ${
                              t.verification === 'answer'
                                ? `
                                <input type="text" class="yj-task-answer" placeholder="${t.question || 'Your answer...'}" />
                            `
                                : `
                                <button class="yj-task-done btn btn-secondary" data-action="mark-done">✓ Done</button>
                            `
                            }
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `;
}

function renderQuizChallengeExercise(ex) {
  return `
                <div class="yj-quiz-challenge">
                    <div class="yj-challenge-header">
                        <div class="yj-challenge-info">
                            <h3>${ex.title || 'Speed Challenge'}</h3>
                            <p>${ex.description || 'Answer as many questions as you can before time runs out!'}</p>
                        </div>
                        <div class="yj-challenge-stats">
                            <div class="yj-challenge-timer">
                                <span class="yj-timer-icon">⏱️</span>
                                <span class="yj-timer-value">${ex.timeLimit || 60}</span>
                                <span class="yj-timer-label">sec</span>
                            </div>
                            <div class="yj-challenge-score">
                                <span class="yj-score-icon">✓</span>
                                <span class="yj-score-value">0</span>
                                <span class="yj-score-label">/ ${ex.questions.length}</span>
                            </div>
                        </div>
                    </div>
                    <div class="yj-challenge-body">
                        <div class="yj-challenge-progress">Question 1/${ex.questions.length}</div>
                        <div class="yj-challenge-question" data-total="${ex.questions.length}">
                            <p class="yj-challenge-q">Press Start to begin...</p>
                            <input type="text" class="yj-challenge-input" placeholder="Type your answer and press Enter..." disabled />
                        </div>
                        <button class="yj-start-challenge btn btn-primary" data-action="start-challenge">
                            Start Challenge
                        </button>
                    </div>
                </div>
            `;
}

function renderModuleComplete(mod) {
  return `
                <div class="yj-step-content yj-module-complete">
                    <div class="yj-complete-card">
                        <div class="yj-complete-icon">🎉</div>
                        <h2>Module Complete!</h2>
                        <p>Congratulations! You've completed "${mod.title}"</p>
                    </div>
                    <button class="yj-continue-btn btn btn-primary" data-action="next-module">
                        Continue to Next Module →
                    </button>
                </div>
            `;
}

function attachStepHandlers(mod, modules) {
  const content = document.getElementById('yj-module-content');

  // Flow step navigation
  content.querySelectorAll('.yj-flow-step.accessible').forEach(step => {
    step.addEventListener('click', function () {
      const targetStep = this.dataset.step;
      if (targetStep && STEPS_ORDER.includes(targetStep)) {
        journeyState.currentStep = targetStep;
        journeyState.currentSubIndex = 0;
        renderCurrentModule();
      }
    });
  });

  // Quiz option clicks
  content.querySelectorAll('.yj-quiz-option').forEach(opt => {
    opt.addEventListener('click', function () {
      handleQuizOptionClick(this, mod);
    });
  });

  // Course section dots
  content.querySelectorAll('.yj-course-dot').forEach(dot => {
    dot.addEventListener('click', function () {
      const idx = parseInt(this.dataset.section);
      if (!isNaN(idx) && idx <= journeyState.currentSubIndex) {
        journeyState.currentSubIndex = idx;
        renderCurrentModule();
      }
    });
  });

  // Navigation buttons
  content.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', function () {
      handleActionClick(this.dataset.action, mod, modules);
    });
  });
}

function handleQuizOptionClick(optionEl, mod) {
  const questionContainer = optionEl.closest('.yj-quiz-question');
  const options = optionEl.parentElement.querySelectorAll('.yj-quiz-option');
  const isCorrect = optionEl.dataset.correct === 'true';
  const step = journeyState.currentStep;
  const selectedIndex = parseInt(optionEl.dataset.index);

  // Disable all options
  options.forEach(o => {
    o.classList.add('disabled');
    o.style.pointerEvents = 'none';
  });

  // Show result
  optionEl.classList.add(isCorrect ? 'correct' : 'incorrect');
  options.forEach(o => {
    if (o.dataset.correct === 'true') o.classList.add('correct');
  });

  // Track results with detailed answers
  if (step === LEARNING_STEPS.ENTRY_QUIZ) {
    if (!journeyState.entryQuizResults[mod.id]) {
      journeyState.entryQuizResults[mod.id] = { score: 0, total: 0, answers: [] };
    }
    // Ensure answers array exists (for older localStorage data)
    if (!journeyState.entryQuizResults[mod.id].answers) {
      journeyState.entryQuizResults[mod.id].answers = [];
    }
    journeyState.entryQuizResults[mod.id].total++;
    if (isCorrect) journeyState.entryQuizResults[mod.id].score++;
    journeyState.entryQuizResults[mod.id].answers.push({
      questionIndex: journeyState.currentSubIndex,
      selectedIndex: selectedIndex,
      isCorrect: isCorrect,
    });
  } else if (step === LEARNING_STEPS.KNOWLEDGE_QUIZ) {
    if (!journeyState.quizPassed[mod.id]) {
      journeyState.quizPassed[mod.id] = { score: 0, total: 0, answers: [] };
    }
    // Ensure answers array exists (for older localStorage data)
    if (!journeyState.quizPassed[mod.id].answers) {
      journeyState.quizPassed[mod.id].answers = [];
    }
    journeyState.quizPassed[mod.id].total++;
    if (isCorrect) journeyState.quizPassed[mod.id].score++;
    journeyState.quizPassed[mod.id].answers.push({
      questionIndex: journeyState.currentSubIndex,
      selectedIndex: selectedIndex,
      isCorrect: isCorrect,
    });
  }

  // Show explanation if available
  const quiz = step === LEARNING_STEPS.ENTRY_QUIZ ? mod.entryQuiz : mod.quiz;
  const questions = quiz?.questions || [];
  const currentQuestion = questions[journeyState.currentSubIndex];

  if (currentQuestion?.explanation) {
    const feedbackEl =
      document.getElementById('yj-quiz-feedback') ||
      questionContainer.querySelector('.yj-quiz-feedback');
    if (feedbackEl) {
      safeInnerHTML(
        feedbackEl,
        `
                        <div class="yj-quiz-explanation ${isCorrect ? 'correct' : 'incorrect'}">
                            <span class="yj-explanation-icon">${isCorrect ? '✓' : '✗'}</span>
                            <span class="yj-explanation-text">${escapeHtml(currentQuestion.explanation)}</span>
                        </div>
                    `
      );
      feedbackEl.style.display = 'block';
    }
  } else {
    // Show simple feedback if no explanation
    const feedbackEl =
      document.getElementById('yj-quiz-feedback') ||
      questionContainer.querySelector('.yj-quiz-feedback');
    if (feedbackEl) {
      safeInnerHTML(
        feedbackEl,
        `
                        <div class="yj-quiz-explanation ${isCorrect ? 'correct' : 'incorrect'}">
                            <span class="yj-explanation-icon">${isCorrect ? '✓' : '✗'}</span>
                            <span class="yj-explanation-text">${isCorrect ? 'Correct!' : 'Incorrect. The correct answer is highlighted above.'}</span>
                        </div>
                    `
      );
      feedbackEl.style.display = 'block';
    }
  }

  // Auto-advance after delay (longer to read explanation)
  setTimeout(() => {
    journeyState.currentSubIndex++;
    renderCurrentModule();
  }, 2000);
}

function handleActionClick(action, mod, modules) {
  switch (action) {
    case 'start-course':
      journeyState.currentStep = LEARNING_STEPS.COURSE;
      journeyState.currentSubIndex = 0;
      markStepComplete(mod.id, LEARNING_STEPS.ENTRY_QUIZ);
      break;

    case 'prev-section':
      if (journeyState.currentSubIndex > 0) {
        journeyState.currentSubIndex--;
      }
      break;

    case 'next-section':
      const courseLen = (mod.course || []).length;
      if (journeyState.currentSubIndex < courseLen - 1) {
        journeyState.currentSubIndex++;
      } else {
        journeyState.currentStep = LEARNING_STEPS.KNOWLEDGE_QUIZ;
        journeyState.currentSubIndex = 0;
        markStepComplete(mod.id, LEARNING_STEPS.COURSE);
      }
      break;

    case 'continue-deep':
      journeyState.currentStep = LEARNING_STEPS.DEEP_CONTENT;
      journeyState.currentSubIndex = 0;
      markStepComplete(mod.id, LEARNING_STEPS.KNOWLEDGE_QUIZ);
      break;

    case 'skip-to-practice':
      journeyState.currentStep = LEARNING_STEPS.PRACTICE;
      journeyState.currentSubIndex = 0;
      markStepComplete(mod.id, LEARNING_STEPS.KNOWLEDGE_QUIZ);
      markStepComplete(mod.id, LEARNING_STEPS.DEEP_CONTENT);
      break;

    case 'retry-quiz':
      journeyState.currentStep = LEARNING_STEPS.COURSE;
      journeyState.currentSubIndex = 0;
      journeyState.quizPassed[mod.id] = { score: 0, total: 0 };
      break;

    case 'prev-deep':
      if (journeyState.currentSubIndex > 0) {
        journeyState.currentSubIndex--;
      }
      break;

    case 'next-deep':
      const deepLen = (mod.deepContent || []).length;
      if (journeyState.currentSubIndex < deepLen - 1) {
        journeyState.currentSubIndex++;
      } else {
        journeyState.currentStep = LEARNING_STEPS.PRACTICE;
        journeyState.currentSubIndex = 0;
        markStepComplete(mod.id, LEARNING_STEPS.DEEP_CONTENT);
      }
      break;

    case 'prev-practice':
      if (journeyState.currentSubIndex > 0) {
        journeyState.currentSubIndex--;
      }
      break;

    case 'next-practice':
      const practiceLen = (mod.practice || []).length;
      if (journeyState.currentSubIndex < practiceLen - 1) {
        journeyState.currentSubIndex++;
      } else {
        markStepComplete(mod.id, LEARNING_STEPS.PRACTICE);
        completeModule(mod, modules);
        return; // Don't render again, completeModule handles it
      }
      break;

    case 'next-module':
      if (journeyState.currentModuleIndex < modules.length - 1) {
        journeyState.currentModuleIndex++;
        journeyState.currentStep = LEARNING_STEPS.ENTRY_QUIZ;
        journeyState.currentSubIndex = 0;
        showJourneyContent();
        return;
      }
      break;

    case 'check-blanks':
      // Handle fill-in-blank checking
      checkFillBlanks(mod);
      return;

    case 'start-challenge':
      // Handle quiz challenge start
      startQuizChallenge(mod);
      return;
  }

  renderCurrentModule();
}

function markStepComplete(moduleId, step) {
  if (!journeyState.moduleProgress[moduleId]) {
    journeyState.moduleProgress[moduleId] = {};
  }
  journeyState.moduleProgress[moduleId][step] = 'completed';
  saveYourJourneyState();
}

function completeModule(mod, modules) {
  if (!journeyState.completedModules.includes(mod.id)) {
    journeyState.completedModules.push(mod.id);
  }
  saveYourJourneyState();
  checkAndAwardBadges();

  // Check if level complete
  const allModuleIds = modules.map(m => m.id);
  const allComplete = allModuleIds.every(id => journeyState.completedModules.includes(id));

  if (allComplete) {
    showLevelCompletion();
  } else {
    renderCurrentModule();
  }
}

function checkFillBlanks(mod) {
  const container = document.querySelector('.yj-fill-blank-exercise');
  if (!container) return;

  const exercise = mod.practice[journeyState.currentSubIndex];
  let allCorrect = true;

  container.querySelectorAll('.yj-fill-blank-item').forEach((item, i) => {
    const inputs = item.querySelectorAll('.yj-blank-input');
    const expected = exercise.questions[i].blanks;
    const feedback = item.querySelector('.yj-fill-feedback');

    let itemCorrect = true;
    inputs.forEach((input, j) => {
      const userAnswer = input.value.trim().toLowerCase();
      const correctAnswer = expected[j].toLowerCase();
      if (userAnswer === correctAnswer) {
        input.classList.add('correct');
        input.classList.remove('incorrect');
      } else {
        input.classList.add('incorrect');
        input.classList.remove('correct');
        itemCorrect = false;
        allCorrect = false;
      }
    });

    feedback.textContent = itemCorrect ? '✓ Correct!' : '✗ Try again';
    feedback.className = 'yj-fill-feedback ' + (itemCorrect ? 'correct' : 'incorrect');
  });

  if (allCorrect) {
    setTimeout(() => {
      journeyState.currentSubIndex++;
      renderCurrentModule();
    }, 1500);
  }
}

function startQuizChallenge(mod) {
  const exercise = mod.practice[journeyState.currentSubIndex];
  const container = document.querySelector('.yj-quiz-challenge');
  if (!container) return;

  const timerEl = container.querySelector('.yj-timer-value');
  const scoreEl = container.querySelector('.yj-score-value');
  const questionEl = container.querySelector('.yj-challenge-q');
  const inputEl = container.querySelector('.yj-challenge-input');
  const startBtn = container.querySelector('.yj-start-challenge');
  const progressEl = container.querySelector('.yj-challenge-progress');

  startBtn.style.display = 'none';
  inputEl.disabled = false;
  inputEl.focus();

  let timeLeft = exercise.timeLimit || 60;
  let score = 0;
  let currentQ = 0;
  const userAnswers = [];
  let timerInterval = null;

  const updateProgress = () => {
    if (progressEl) {
      progressEl.textContent = `Question ${currentQ + 1}/${exercise.questions.length}`;
    }
  };

  const showQuestion = () => {
    if (currentQ >= exercise.questions.length) {
      // All questions answered - show results
      endChallenge('completed');
      return;
    }
    questionEl.textContent = exercise.questions[currentQ].q;
    inputEl.value = '';
    inputEl.focus();
    updateProgress();
  };

  const endChallenge = reason => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    inputEl.disabled = true;

    // Generate detailed results
    const percentage = Math.round((score / exercise.questions.length) * 100);
    const passed = percentage >= 70;

    const resultsHtml = `
                    <div class="yj-challenge-results">
                        <div class="yj-result-header ${passed ? 'success' : 'retry'}">
                            <div class="yj-result-icon">${passed ? '🎉' : '📖'}</div>
                            <h3>${reason === 'timeout' ? "Time's Up!" : 'Challenge Complete!'}</h3>
                            <div class="yj-result-score-big">
                                <span class="yj-score-number">${score}</span>
                                <span class="yj-score-separator">/</span>
                                <span class="yj-score-total">${exercise.questions.length}</span>
                            </div>
                            <p class="yj-result-percentage">${percentage}% correct</p>
                        </div>

                        <div class="yj-answers-review">
                            <h4>Review Your Answers</h4>
                            <div class="yj-answers-list">
                                ${exercise.questions
                                  .map((q, i) => {
                                    const userAnswer = userAnswers[i] || {
                                      answer: '(no answer)',
                                      isCorrect: false,
                                    };
                                    // Escape user input to prevent XSS
                                    const safeUserAnswer = escapeHtml(
                                      userAnswer.answer || '(skipped)'
                                    );
                                    const safeQuestion = escapeHtml(q.q);
                                    const safeCorrectAnswer = escapeHtml(q.a);
                                    return `
                                        <div class="yj-answer-item ${userAnswer.isCorrect ? 'correct' : 'incorrect'}">
                                            <div class="yj-answer-status">
                                                ${userAnswer.isCorrect ? '✓' : '✗'}
                                            </div>
                                            <div class="yj-answer-content">
                                                <div class="yj-answer-question">${safeQuestion}</div>
                                                <div class="yj-answer-user">
                                                    <span class="yj-label">Your answer:</span>
                                                    <span class="yj-value ${userAnswer.isCorrect ? '' : 'wrong'}">${safeUserAnswer}</span>
                                                </div>
                                                ${
                                                  !userAnswer.isCorrect
                                                    ? `
                                                    <div class="yj-answer-correct">
                                                        <span class="yj-label">Correct answer:</span>
                                                        <span class="yj-value">${safeCorrectAnswer}</span>
                                                    </div>
                                                `
                                                    : ''
                                                }
                                            </div>
                                        </div>
                                    `;
                                  })
                                  .join('')}
                            </div>
                        </div>

                        <div class="yj-challenge-actions">
                            <button class="yj-btn btn btn-secondary" data-action="retry-challenge">
                                Retry Challenge
                            </button>
                            <button class="yj-btn btn btn-primary" data-action="next-practice">
                                Continue →
                            </button>
                        </div>
                    </div>
                `;

    safeInnerHTML(container, resultsHtml);

    // Attach new event handlers
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', function () {
        const action = this.dataset.action;
        if (action === 'retry-challenge') {
          renderCurrentModule();
        } else {
          handleActionClick(action, mod, getCurrentModules());
        }
      });
    });
  };

  showQuestion();

  // Input handler for answers
  const handleAnswer = function (e) {
    if (e.key === 'Enter' && currentQ < exercise.questions.length) {
      const userAnswer = this.value.trim();
      const correctAnswer = exercise.questions[currentQ].a;
      const userAnswerLower = userAnswer.toLowerCase();
      const correctLower = correctAnswer.toLowerCase();

      // Check if answer is correct (flexible matching)
      const isCorrect =
        userAnswerLower === correctLower ||
        userAnswerLower.includes(correctLower) ||
        correctLower.includes(userAnswerLower);

      // Store the answer
      userAnswers[currentQ] = {
        answer: userAnswer,
        isCorrect: isCorrect,
      };

      if (isCorrect) {
        score++;
        scoreEl.textContent = score;
        // Visual feedback for correct
        inputEl.classList.add('correct-flash');
        setTimeout(() => inputEl.classList.remove('correct-flash'), 300);
      } else {
        // Visual feedback for incorrect
        inputEl.classList.add('incorrect-flash');
        setTimeout(() => inputEl.classList.remove('incorrect-flash'), 300);
      }

      currentQ++;
      showQuestion();
    }
  };

  inputEl.addEventListener('keypress', handleAnswer);

  // Timer
  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    // Add warning classes
    if (timeLeft <= 10) {
      timerEl.parentElement.classList.add('danger');
      timerEl.parentElement.classList.remove('warning');
    } else if (timeLeft <= 20) {
      timerEl.parentElement.classList.add('warning');
    }

    if (timeLeft <= 0) {
      // Mark remaining questions as unanswered
      for (let i = currentQ; i < exercise.questions.length; i++) {
        if (!userAnswers[i]) {
          userAnswers[i] = { answer: '', isCorrect: false };
        }
      }
      endChallenge('timeout');
    }
  }, 1000);
}

function getCurrentModules() {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  if (!pillar) return [];
  const levelModules = pillar.modules[journeyState.currentLevel];
  return levelModules || [];
}

// ============================================
// ADVANCED INTERACTIVE CONTENT RENDERER
// ============================================
function renderAdvancedInteractiveContent(mod) {
  const container = document.getElementById('yj-advanced-interactive');
  if (!container) return;

  const JA = window.JourneyAdvanced;
  const JP = window.JourneyProduction;
  const JC = window.JourneyCertification;
  const JM = window.JourneyModules;
  const pillar = journeyState.currentPillar;

  // Check if any advanced module system is available
  if (!JA && !JP && !JC) return;

  // Map module IDs to JourneyAdvanced content (using actual module IDs)
  const advancedMapping = {
    // Code & Dev Advanced
    'code-a1': ['code-adv-patterns'],
    'code-a2': ['code-adv-defi'],
    'code-a3': ['code-adv-security'],
    // Design & UX Advanced
    'design-a1': ['design-adv-systems'],
    'design-a2': ['design-adv-dataviz'],
    // Content Advanced
    'content-a1': ['content-adv-threads'],
    'content-a2': ['content-adv-edu'],
    // Community Advanced
    'community-a1': ['community-adv-gov'],
    'community-a2': ['community-adv-ecosystem'],
  };

  // Map module IDs to JourneyProduction content
  const productionMapping = {
    // Code & Dev Advanced → Production modules
    'code-a1': ['prod-code-testing', 'prod-code-cicd'],
    'code-a2': ['prod-code-performance'],
    'code-a3': ['prod-code-security', 'prod-code-monitoring'],
    // Design & UX Advanced → Production modules
    'design-a1': ['prod-design-system'],
    'design-a2': ['prod-design-research'],
    // Content Advanced → Production modules
    'content-a1': ['prod-content-strategy'],
    'content-a2': ['prod-content-analytics'],
    // Community Advanced → Production modules
    'community-a1': ['prod-community-ops'],
    'community-a2': ['prod-community-ambassadors'],
  };

  // Map module IDs to JourneyCertification content
  const certificationMapping = {
    // Code & Dev → Certification modules
    'code-a1': ['cert-code-architecture'],
    'code-a2': ['cert-code-architecture'],
    'code-a3': ['cert-code-solana-advanced'],
    // Design & UX → Certification modules
    'design-a1': ['cert-design-motion'],
    'design-a2': ['cert-design-critical'],
    // Content → Certification modules
    'content-a1': ['cert-content-video'],
    'content-a2': ['cert-content-multiplatform'],
    // Community → Certification modules
    'community-a1': ['cert-community-dao'],
    'community-a2': ['cert-community-metrics'],
  };

  const advancedKeys = advancedMapping[mod.id] || [];
  const productionKeys = productionMapping[mod.id] || [];
  const certificationKeys = certificationMapping[mod.id] || [];

  if (advancedKeys.length === 0 && productionKeys.length === 0 && certificationKeys.length === 0) {
    return;
  }

  // Get the corresponding module data
  const advancedModules = JA
    ? JA.getModulesForPillar(pillar).filter(m => advancedKeys.includes(m.id))
    : [];
  const productionModules = JP
    ? JP.getModulesForPillar(pillar).filter(m => productionKeys.includes(m.id))
    : [];
  const certificationModules = JC
    ? JC.getModulesForPillar(pillar).filter(m => certificationKeys.includes(m.id))
    : [];

  if (
    advancedModules.length === 0 &&
    productionModules.length === 0 &&
    certificationModules.length === 0
  ) {
    return;
  }

  // Build interactive content with tabs
  container.innerHTML = `
                <div class="jm-curriculum-section">
                    <div class="jm-curriculum-header">
                        <h3>🔥 Builder Curriculum</h3>
                        <p>Master production-level skills with comprehensive modules.</p>
                    </div>

                    <div class="jm-curriculum-tabs">
                        <button class="jm-tab active" data-tab="advanced">
                            <span class="jm-tab-icon">⚡</span> Deep Dive
                        </button>
                        <button class="jm-tab" data-tab="production">
                            <span class="jm-tab-icon">🚀</span> Production Ready
                        </button>
                        <button class="jm-tab" data-tab="certification">
                            <span class="jm-tab-icon">🏅</span> Certification
                        </button>
                    </div>

                    <div class="jm-curriculum-content">
                        <div class="jm-tab-panel active" id="tab-advanced">
                            <div class="jm-advanced-modules" id="jm-advanced-modules-list"></div>
                        </div>
                        <div class="jm-tab-panel" id="tab-production">
                            <div class="jm-production-modules" id="jm-production-modules-list"></div>
                        </div>
                        <div class="jm-tab-panel" id="tab-certification">
                            <div class="jm-certification-modules" id="jm-certification-modules-list"></div>
                        </div>
                    </div>
                </div>
            `;

  // Tab switching
  container.querySelectorAll('.jm-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      container.querySelectorAll('.jm-tab').forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.jm-tab-panel').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
      container.querySelector(`#tab-${this.dataset.tab}`).classList.add('active');
    });
  });

  // Render Advanced modules
  const advancedList = container.querySelector('#jm-advanced-modules-list');
  advancedModules.forEach(advModule => {
    renderModuleCard(advancedList, advModule, 'advanced', JA, JM);
  });

  // Render Production modules
  const productionList = container.querySelector('#jm-production-modules-list');
  productionModules.forEach(prodModule => {
    renderProductionModuleCard(productionList, prodModule, JM);
  });

  // Render Certification modules
  const certificationList = container.querySelector('#jm-certification-modules-list');
  certificationModules.forEach(certModule => {
    renderCertificationModuleCard(certificationList, certModule, JM);
  });

  // Add final certification section
  if (JC) {
    renderFinalCertificationSection(certificationList, JC, JM);
  }

  // Add master challenge
  if (JA && JA.CHALLENGES && JA.CHALLENGES.masterChallenge && JM) {
    renderMasterChallenge(container, JA, JM);
  }

  // Add capstone projects if production modules exist
  if (JP && productionModules.length > 0) {
    renderCapstoneSection(container, JP);
  }
}

// Helper: Render a module card
function renderModuleCard(container, module, type, JA, JM) {
  const moduleCard = document.createElement('div');
  moduleCard.className = 'jm-advanced-module-card';
  const safeTitle = JM ? JM.escapeHtml(module.title) : module.title;
  const safeDesc = JM ? JM.escapeHtml(module.description) : module.description;

  moduleCard.innerHTML = `
                <div class="jm-module-card-header">
                    <h4>${safeTitle}</h4>
                    <p>${safeDesc}</p>
                </div>
                <button class="jm-expand-module btn btn-secondary" data-module-id="${module.id}">
                    Explore Module →
                </button>
                <div class="jm-module-expanded-content" id="expanded-${module.id}" style="display: none;"></div>
            `;
  container.appendChild(moduleCard);

  const expandBtn = moduleCard.querySelector('.jm-expand-module');
  expandBtn.addEventListener('click', function () {
    const expandedContent = moduleCard.querySelector('.jm-module-expanded-content');
    const isExpanded = expandedContent.style.display !== 'none';

    if (isExpanded) {
      expandedContent.style.display = 'none';
      this.textContent = 'Explore Module →';
    } else {
      expandedContent.style.display = 'block';
      this.textContent = 'Collapse ↑';
      if (JA && JA.renderAdvancedModule) {
        JA.renderAdvancedModule(expandedContent, module);
      }
    }
  });
}

// Helper: Render a production module card with detailed structure
function renderProductionModuleCard(container, module, JM) {
  const moduleCard = document.createElement('div');
  moduleCard.className = 'jm-production-module-card';
  const safeTitle = JM ? JM.escapeHtml(module.title) : module.title;
  const safeDesc = JM ? JM.escapeHtml(module.description) : module.description;

  const lessonsCount = module.lessons ? module.lessons.length : 0;
  const hasProject = module.practicalProject ? true : false;
  const hasQuiz = module.quiz ? true : false;

  moduleCard.innerHTML = `
                <div class="jm-prod-card-header">
                    <div class="jm-prod-badge">${module.theme === 'verify' ? '✓' : module.theme === 'fibonacci' ? '🌀' : module.theme === 'burn' ? '🔥' : '📚'}</div>
                    <div class="jm-prod-title-area">
                        <h4>${safeTitle}</h4>
                        <p>${safeDesc}</p>
                    </div>
                </div>
                <div class="jm-prod-meta">
                    <span class="jm-prod-meta-item">
                        <span class="jm-meta-icon">📖</span> ${lessonsCount} lessons
                    </span>
                    ${hasProject ? '<span class="jm-prod-meta-item"><span class="jm-meta-icon">🛠️</span> Project</span>' : ''}
                    ${hasQuiz ? '<span class="jm-prod-meta-item"><span class="jm-meta-icon">📝</span> Quiz</span>' : ''}
                </div>
                <button class="jm-start-module btn btn-primary" data-module-id="${module.id}">
                    Start Learning →
                </button>
                <div class="jm-prod-module-content" id="prod-content-${module.id}" style="display: none;"></div>
            `;
  container.appendChild(moduleCard);

  const startBtn = moduleCard.querySelector('.jm-start-module');
  startBtn.addEventListener('click', function () {
    const contentArea = moduleCard.querySelector('.jm-prod-module-content');
    const isExpanded = contentArea.style.display !== 'none';

    if (isExpanded) {
      contentArea.style.display = 'none';
      this.textContent = 'Start Learning →';
    } else {
      contentArea.style.display = 'block';
      this.textContent = 'Close Module ↑';
      renderProductionModuleContent(contentArea, module, JM);
    }
  });
}

// Helper: Render production module content
function renderProductionModuleContent(container, module, JM) {
  if (container.dataset.loaded === 'true') return;
  container.dataset.loaded = 'true';

  let html = '<div class="jm-prod-lessons">';

  // Render lessons
  if (module.lessons) {
    module.lessons.forEach((lesson, index) => {
      const safeTitle = JM ? JM.escapeHtml(lesson.title) : lesson.title;
      html += `
                        <div class="jm-prod-lesson">
                            <div class="jm-lesson-header" data-lesson="${index}">
                                <span class="jm-lesson-num">${index + 1}</span>
                                <h5>${safeTitle}</h5>
                                <span class="jm-lesson-toggle">▼</span>
                            </div>
                            <div class="jm-lesson-content" id="lesson-${module.id}-${index}" style="display: none;">
                                ${lesson.content}
                                ${
                                  lesson.keyPoints
                                    ? `
                                    <div class="jm-key-points">
                                        <h6>Key Takeaways:</h6>
                                        <ul>
                                            ${lesson.keyPoints.map(p => `<li>${JM ? JM.escapeHtml(p) : p}</li>`).join('')}
                                        </ul>
                                    </div>
                                `
                                    : ''
                                }
                            </div>
                        </div>
                    `;
    });
  }

  html += '</div>';

  // Render practical project
  if (module.practicalProject) {
    const proj = module.practicalProject;
    html += `
                    <div class="jm-practical-project">
                        <div class="jm-project-header">
                            <span class="jm-project-icon">🛠️</span>
                            <h5>${JM ? JM.escapeHtml(proj.title) : proj.title}</h5>
                        </div>
                        <p>${JM ? JM.escapeHtml(proj.description) : proj.description}</p>

                        <div class="jm-project-requirements">
                            <h6>Requirements:</h6>
                            <ul>
                                ${proj.requirements.map(r => `<li>${JM ? JM.escapeHtml(r) : r}</li>`).join('')}
                            </ul>
                        </div>

                        ${
                          proj.starterCode
                            ? `
                            <div class="jm-code-block">
                                <div class="jm-code-title">Starter Code</div>
                                <pre><code>${JM ? JM.escapeHtml(proj.starterCode) : proj.starterCode}</code></pre>
                            </div>
                        `
                            : ''
                        }

                        <div class="jm-evaluation-criteria">
                            <h6>Evaluation Criteria:</h6>
                            <ul>
                                ${proj.evaluationCriteria.map(c => `<li>${JM ? JM.escapeHtml(c) : c}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
  }

  container.innerHTML = html;

  // Add lesson toggle handlers
  container.querySelectorAll('.jm-lesson-header').forEach(header => {
    header.addEventListener('click', function () {
      const lessonIndex = this.dataset.lesson;
      const content = container.querySelector(`#lesson-${module.id}-${lessonIndex}`);
      const toggle = this.querySelector('.jm-lesson-toggle');

      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲';
        this.classList.add('expanded');
      } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
        this.classList.remove('expanded');
      }
    });
  });
}

// Helper: Render master challenge section
function renderMasterChallenge(container, JA, JM) {
  const challengeSection = document.createElement('div');
  challengeSection.className = 'jm-master-challenge-section';
  challengeSection.innerHTML = `
                <div class="jm-challenge-teaser">
                    <div class="jm-challenge-icon">🏆</div>
                    <div class="jm-challenge-info">
                        <h4>ASDF Master Challenge</h4>
                        <p>Test all your advanced skills in a timed challenge!</p>
                    </div>
                    <button class="jm-start-master-challenge btn btn-primary" id="start-master-challenge">
                        Start Challenge
                    </button>
                </div>
                <div class="jm-master-challenge-container" id="master-challenge-container" style="display: none;"></div>
            `;
  container.appendChild(challengeSection);

  document.getElementById('start-master-challenge').addEventListener('click', function () {
    const challengeContainer = document.getElementById('master-challenge-container');
    challengeContainer.style.display = 'block';
    this.style.display = 'none';

    const challenge = JA.CHALLENGES.masterChallenge;
    const timedQuiz = JM.createTimedQuiz({
      id: challenge.id,
      title: challenge.title,
      timeLimit: challenge.timeLimit,
      questions: challenge.questions,
      onComplete: result => {
        console.log('Master challenge completed:', result);
        if (result.percentage >= 70) {
          addXP(200);
          showAchievement('🏆', 'Master Builder', 'Completed the advanced challenge!');
        }
      },
    });
    challengeContainer.appendChild(timedQuiz);
  });
}

// Helper: Render capstone projects section
function renderCapstoneSection(container, JP) {
  const capstones = JP.getCapstoneProjects();
  if (!capstones || capstones.length === 0) return;

  const capstoneSection = document.createElement('div');
  capstoneSection.className = 'jm-capstone-section';

  let html = `
                <div class="jm-capstone-header">
                    <h3>🎓 Capstone Projects</h3>
                    <p>Complete a capstone to earn your certification.</p>
                </div>
                <div class="jm-capstone-grid">
            `;

  capstones.forEach(cap => {
    html += `
                    <div class="jm-capstone-card">
                        <div class="jm-capstone-badge">${cap.certification.badge}</div>
                        <h4>${cap.title}</h4>
                        <p>${cap.description}</p>
                        <div class="jm-capstone-cert">
                            <strong>Certification:</strong> ${cap.certification.name}
                        </div>
                    </div>
                `;
  });

  html += '</div>';
  capstoneSection.innerHTML = html;
  container.appendChild(capstoneSection);
}

// Helper: Render certification module card
function renderCertificationModuleCard(container, module, JM) {
  const moduleCard = document.createElement('div');
  moduleCard.className = 'jm-certification-module-card';
  const safeTitle = JM ? JM.escapeHtml(module.title) : module.title;
  const safeDesc = JM ? JM.escapeHtml(module.description) : module.description;

  const lessonsCount = module.lessons ? module.lessons.length : 0;
  const themeIcon =
    module.theme === 'verify'
      ? '✓'
      : module.theme === 'fibonacci'
        ? '🌀'
        : module.theme === 'burn'
          ? '🔥'
          : '🏅';

  // Determine pillar from module ID
  const pillar = module.id.includes('code')
    ? 'code'
    : module.id.includes('design')
      ? 'design'
      : module.id.includes('content')
        ? 'content'
        : 'community';

  moduleCard.innerHTML = `
                <div class="jm-cert-card-header">
                    <div class="jm-cert-badge">${themeIcon}</div>
                    <div class="jm-cert-title-area">
                        <h4>${safeTitle}</h4>
                        <p>${safeDesc}</p>
                    </div>
                </div>
                <div class="jm-cert-meta">
                    <span class="jm-cert-meta-item">
                        <span class="jm-meta-icon">📖</span> ${lessonsCount} lessons
                    </span>
                    <span class="jm-cert-meta-item cert-level">
                        <span class="jm-meta-icon">🎯</span> Expert Level
                    </span>
                </div>
                <button class="jm-start-cert-module btn btn-primary" data-module-id="${module.id}" data-pillar="${pillar}">
                    Master This Skill →
                </button>
                <div class="jm-cert-module-content" id="cert-content-${module.id}" style="display: none;"></div>
            `;
  container.appendChild(moduleCard);

  const startBtn = moduleCard.querySelector('.jm-start-cert-module');
  startBtn.addEventListener('click', function () {
    const contentArea = moduleCard.querySelector('.jm-cert-module-content');
    const isExpanded = contentArea.style.display !== 'none';

    if (isExpanded) {
      contentArea.style.display = 'none';
      this.textContent = 'Master This Skill →';
    } else {
      contentArea.style.display = 'block';
      this.textContent = 'Close Module ↑';

      // Track module start
      if (window.CertificationTracker) {
        window.CertificationTracker.startModule(pillar, module.id);
      }

      renderCertificationModuleContent(contentArea, module, JM, pillar);
    }
  });
}

// Helper: Render certification module content
function renderCertificationModuleContent(container, module, JM, pillar) {
  if (container.dataset.loaded === 'true') return;
  container.dataset.loaded = 'true';

  // Determine pillar if not passed
  const modulePillar =
    pillar ||
    (module.id.includes('code')
      ? 'code'
      : module.id.includes('design')
        ? 'design'
        : module.id.includes('content')
          ? 'content'
          : 'community');

  let html = '<div class="jm-cert-lessons">';

  // Render lessons
  if (module.lessons) {
    module.lessons.forEach((lesson, index) => {
      const safeTitle = JM ? JM.escapeHtml(lesson.title) : lesson.title;
      const lessonId = `${module.id}-lesson-${index}`;
      html += `
                        <div class="jm-cert-lesson" data-lesson-id="${lessonId}">
                            <div class="jm-cert-lesson-header" data-lesson="${index}" data-lesson-id="${lessonId}">
                                <span class="jm-lesson-num">${index + 1}</span>
                                <h5>${safeTitle}</h5>
                                <span class="jm-lesson-toggle">▼</span>
                            </div>
                            <div class="jm-cert-lesson-content" id="cert-lesson-${module.id}-${index}" style="display: none;">
                                ${lesson.content}
                                ${
                                  lesson.keyPoints
                                    ? `
                                    <div class="jm-key-points cert-key-points">
                                        <h6>🎯 Key Takeaways:</h6>
                                        <ul>
                                            ${lesson.keyPoints.map(p => `<li>${JM ? JM.escapeHtml(p) : p}</li>`).join('')}
                                        </ul>
                                    </div>
                                `
                                    : ''
                                }
                                <button class="jm-mark-complete btn btn-secondary" data-lesson-id="${lessonId}" data-pillar="${modulePillar}">
                                    ✓ Mark as Complete
                                </button>
                            </div>
                        </div>
                    `;
    });
  }

  html += '</div>';
  container.innerHTML = html;

  // Track lesson open times for time spent calculation
  const lessonStartTimes = {};

  // Add lesson toggle handlers
  container.querySelectorAll('.jm-cert-lesson-header').forEach(header => {
    header.addEventListener('click', function () {
      const lessonIndex = this.dataset.lesson;
      const lessonId = this.dataset.lessonId;
      const content = container.querySelector(`#cert-lesson-${module.id}-${lessonIndex}`);
      const toggle = this.querySelector('.jm-lesson-toggle');

      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.textContent = '▲';
        this.classList.add('expanded');
        // Track lesson start time
        lessonStartTimes[lessonId] = Date.now();
      } else {
        content.style.display = 'none';
        toggle.textContent = '▼';
        this.classList.remove('expanded');
      }
    });
  });

  // Add mark complete handlers
  container.querySelectorAll('.jm-mark-complete').forEach(btn => {
    btn.addEventListener('click', function () {
      const lessonId = this.dataset.lessonId;
      const lessonPillar = this.dataset.pillar;

      // Calculate time spent
      const startTime = lessonStartTimes[lessonId] || Date.now();
      const timeSpent = Math.round((Date.now() - startTime) / 1000);

      // Track completion
      if (window.CertificationTracker) {
        window.CertificationTracker.completeLesson(lessonPillar, lessonId, timeSpent);
      }

      // Update UI
      this.textContent = '✓ Completed';
      this.disabled = true;
      this.classList.add('completed');
      this.closest('.jm-cert-lesson').classList.add('lesson-completed');

      // Show feedback
      showAchievement('📚', 'Lesson Complete', 'Progress saved!');
    });
  });
}

// Helper: Render final certification section
function renderFinalCertificationSection(container, JC, JM) {
  const cert = JC.getCertificationModule();
  if (!cert) return;

  const certSection = document.createElement('div');
  certSection.className = 'jm-final-certification-section';

  const badge = cert.certification.badge;
  const assessment = cert.technicalAssessment;
  const capstone = cert.capstoneProject;

  certSection.innerHTML = `
                <div class="jm-final-cert-header">
                    <div class="jm-cert-flame">${badge.symbol}</div>
                    <div class="jm-cert-title-block">
                        <h3>${JM ? JM.escapeHtml(badge.name) : badge.name}</h3>
                        <p class="jm-cert-tier">Tier: ${badge.tier}</p>
                        <p>${JM ? JM.escapeHtml(badge.description) : badge.description}</p>
                    </div>
                </div>

                <div class="jm-cert-requirements">
                    <h4>📋 Certification Requirements</h4>
                    <div class="jm-cert-req-grid">
                        <div class="jm-cert-req-card">
                            <div class="jm-req-icon">📝</div>
                            <h5>Technical Assessment</h5>
                            <p>Pass a comprehensive ${assessment.sections.length}-section exam covering all pillars.</p>
                            <ul>
                                ${assessment.sections.map(s => `<li>${JM ? JM.escapeHtml(s.name) : s.name} (${s.questions} questions)</li>`).join('')}
                            </ul>
                            <div class="jm-pass-score">Pass: ${assessment.passingScore}%</div>
                        </div>

                        <div class="jm-cert-req-card">
                            <div class="jm-req-icon">🛠️</div>
                            <h5>Capstone Project</h5>
                            <p>Complete one of ${capstone.options.length} project options:</p>
                            <ul>
                                ${capstone.options.map(o => `<li><strong>${JM ? JM.escapeHtml(o.name) : o.name}</strong>: ${JM ? JM.escapeHtml(o.description) : o.description}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <div class="jm-cert-perks">
                    <h4>🎁 Certification Perks</h4>
                    <div class="jm-perks-list">
                        ${cert.certification.perks
                          .map(
                            perk => `
                            <div class="jm-perk-item">
                                <span class="jm-perk-check">✓</span>
                                ${JM ? JM.escapeHtml(perk) : perk}
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>

                <div class="jm-cert-nft">
                    <h4>🏆 NFT Badge Credential</h4>
                    <div class="jm-nft-preview">
                        <div class="jm-nft-card">
                            <div class="jm-nft-badge-icon">${badge.symbol}</div>
                            <div class="jm-nft-info">
                                <p class="jm-nft-collection">${cert.certification.nft.collection}</p>
                                <p class="jm-nft-name">${cert.certification.nft.metadata.name}</p>
                            </div>
                            <div class="jm-nft-attributes">
                                ${cert.certification.nft.attributes
                                  .map(
                                    attr => `
                                    <span class="jm-nft-attr">${attr.trait_type}: ${attr.value}</span>
                                `
                                  )
                                  .join('')}
                            </div>
                        </div>
                        <p class="jm-nft-type">Compressed NFT on Solana</p>
                    </div>
                </div>

                <div class="jm-cert-cta">
                    <button class="jm-start-certification btn btn-primary btn-lg" id="start-certification-btn">
                        🔥 Begin Certification Journey
                    </button>
                    <p class="jm-cert-note">Complete all pillar modules before starting certification</p>
                </div>
            `;

  container.appendChild(certSection);

  // Add certification button handler
  const certBtn = certSection.querySelector('#start-certification-btn');
  certBtn.addEventListener('click', function () {
    // Check eligibility
    const state = getState();
    const eligibility = JC.checkCertificationEligibility(state.completedModules || []);

    if (!eligibility.eligible) {
      showAchievement(
        '⚠️',
        'Not Ready Yet',
        `Complete ${eligibility.total - eligibility.completed} more modules first!`
      );
    } else {
      showAchievement('🔥', 'Ready for Certification!', 'You can now take the certification exam.');
      // In a full implementation, this would open the certification exam
    }
  });
}

// Legacy module rendering (for old format modules)
function renderLegacyModule(mod, modules) {
  const hasSections = mod.sections && mod.sections.length > 0;

  document.getElementById('yj-module-badge').textContent =
    `Module ${journeyState.currentModuleIndex + 1}`;
  document.getElementById('yj-module-title').textContent = mod.title;

  let contentHtml = '';

  // Check if this is an advanced level module with interactive content
  const isAdvancedLevel = journeyState.currentLevel === 'advanced';
  const hasAdvancedInteractives = isAdvancedLevel && typeof window.JourneyAdvanced !== 'undefined';

  if (hasSections) {
    const sectionIndex = journeyState.currentSubIndex;
    const section = mod.sections[sectionIndex];

    contentHtml = `
                    <div class="yj-section-progress">
                        ${mod.sections
                          .map(
                            (s, i) => `
                            <div class="yj-section-dot ${i === sectionIndex ? 'active' : ''} ${i < sectionIndex ? 'completed' : ''}"
                                 data-section="${i}" title="${s.title}"></div>
                        `
                          )
                          .join('')}
                    </div>
                    <div class="yj-section-content">${section.content}</div>
                    ${
                      hasAdvancedInteractives
                        ? `
                        <div class="yj-advanced-interactive-container" id="yj-advanced-interactive"></div>
                    `
                        : ''
                    }
                    <div class="yj-section-nav">
                        <button class="yj-section-prev btn btn-secondary" ${sectionIndex === 0 ? 'disabled' : ''}>← Previous</button>
                        <span>${sectionIndex + 1} / ${mod.sections.length}</span>
                        <button class="yj-section-next btn btn-primary">${sectionIndex >= mod.sections.length - 1 ? 'Quiz →' : 'Next →'}</button>
                    </div>
                `;
  } else {
    contentHtml = mod.content || '';
    if (hasAdvancedInteractives) {
      contentHtml +=
        '<div class="yj-advanced-interactive-container" id="yj-advanced-interactive"></div>';
    }
  }

  safeInnerHTML(document.getElementById('yj-module-content'), contentHtml);

  // Render advanced interactive content if available
  if (hasAdvancedInteractives) {
    renderAdvancedInteractiveContent(mod);
  }

  // Initialize interactive elements (flashcards, scenarios)
  initInteractiveElements();

  // Attach legacy handlers for section navigation
  if (hasSections) {
    const prevBtn = document.querySelector('.yj-section-prev');
    const nextBtn = document.querySelector('.yj-section-next');
    const dots = document.querySelectorAll('.yj-section-dot');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (journeyState.currentSubIndex > 0) {
          journeyState.currentSubIndex--;
          renderCurrentModule();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const sectionIndex = journeyState.currentSubIndex;
        if (sectionIndex >= mod.sections.length - 1) {
          // Last section - go to quiz or complete module
          if (mod.quiz) {
            showJourneyQuiz();
          } else {
            completeCurrentModule();
          }
        } else {
          journeyState.currentSubIndex++;
          renderCurrentModule();
        }
      });
    }

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        journeyState.currentSubIndex = i;
        renderCurrentModule();
      });
    });
  }

  // Show main nav buttons for legacy modules
  document.getElementById('yj-prev-module').style.display =
    journeyState.currentModuleIndex > 0 ? 'inline-flex' : 'none';
  document.getElementById('yj-next-module').style.display = 'inline-flex';
}

function completeCurrentModule() {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  const modules = pillar.modules[journeyState.currentLevel] || [];
  const mod = modules[journeyState.currentModuleIndex];

  if (!journeyState.completedModules.includes(mod.id)) {
    journeyState.completedModules.push(mod.id);
    addXP(50);
    saveYourJourneyState();
  }

  // Check if level complete
  const allComplete = modules.every(m => journeyState.completedModules.includes(m.id));
  if (allComplete) {
    showLevelComplete();
  } else if (journeyState.currentModuleIndex < modules.length - 1) {
    journeyState.currentModuleIndex++;
    journeyState.currentSubIndex = 0;
    showJourneyContent();
  }
}

function goToJourneyModule(index) {
  journeyState.currentModuleIndex = index;
  journeyState.currentSectionIndex = 0; // Reset section index
  showJourneyContent();
}

function journeyPrevModule() {
  // If in a section, go back to first section first
  if (journeyState.currentSectionIndex > 0) {
    journeyState.currentSectionIndex = 0;
    renderCurrentModule();
  } else if (journeyState.currentModuleIndex > 0) {
    journeyState.currentModuleIndex--;
    journeyState.currentSectionIndex = 0;
    showJourneyContent();
  }
}

function journeyNextModule() {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  const modules = pillar.modules[journeyState.currentLevel] || [];
  const mod = modules[journeyState.currentModuleIndex];

  if (journeyState.completedModules.includes(mod.id)) {
    if (journeyState.currentModuleIndex < modules.length - 1) {
      journeyState.currentModuleIndex++;
      showJourneyContent();
    }
  } else {
    showJourneyQuiz();
  }
}

// ============================================
// INTERACTIVE SCENARIO HANDLER
// ============================================
function checkScenario(scenarioId, optionIndex, isCorrect) {
  // Input validation
  if (typeof scenarioId !== 'string' || !scenarioId) return;
  if (typeof optionIndex !== 'number' || optionIndex < 0) return;

  const container = document.getElementById(scenarioId);
  if (!container) return;

  const options = container.querySelectorAll('.yj-scenario-option');
  if (optionIndex >= options.length) return;

  const feedback = document.getElementById(scenarioId + '-feedback');

  // Reset all options
  options.forEach((opt, i) => {
    opt.classList.remove('correct', 'wrong', 'selected');
    if (i === optionIndex) {
      opt.classList.add(isCorrect ? 'correct' : 'wrong');
    }
  });

  // Show feedback
  if (feedback) {
    feedback.className = 'yj-scenario-feedback show ' + (isCorrect ? 'success' : 'error');
    if (isCorrect) {
      safeInnerHTML(
        feedback,
        '<strong>Correct!</strong> Responding with facts and empathy builds trust and addresses concerns effectively.'
      );
      // Award XP for correct scenario
      addXP(15);
    } else {
      safeInnerHTML(
        feedback,
        '<strong>Not quite.</strong> This approach might escalate the situation. Try using the CALM framework: acknowledge, provide facts, and move on.'
      );
    }
  }
}

// Initialize interactive educational elements (CSP compliant)
function initInteractiveElements() {
  // Flashcards
  document.querySelectorAll('.yj-flashcard, [data-interactive="flashcard"]').forEach(card => {
    if (card.dataset.initialized) return;
    card.dataset.initialized = 'true';
    card.addEventListener('click', function () {
      this.classList.toggle('flipped');
    });
  });

  // Scenario options
  document.querySelectorAll('.yj-scenario-container').forEach(container => {
    if (container.dataset.initialized) return;
    container.dataset.initialized = 'true';
    const scenarioId = container.dataset.scenarioId || container.id;

    container.querySelectorAll('.yj-scenario-option').forEach(option => {
      option.addEventListener('click', function () {
        const optionIndex = parseInt(this.dataset.option, 10);
        const isCorrect = this.dataset.correct === 'true';
        checkScenario(scenarioId, optionIndex, isCorrect);
      });
    });
  });
}

// Legacy alias for backwards compatibility
function initFlashcards() {
  initInteractiveElements();
}

function showJourneyQuiz() {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  const modules = pillar.modules[journeyState.currentLevel] || [];
  const mod = modules[journeyState.currentModuleIndex];
  if (!mod || !mod.quiz) return;

  document.getElementById('yj-module').style.display = 'none';
  document.getElementById('yj-quiz').style.display = 'block';

  document.getElementById('yj-quiz-title').textContent = mod.title + ' Quiz';
  document.getElementById('yj-quiz-question').textContent = mod.quiz.question;

  const optionsHtml = mod.quiz.options
    .map((opt, i) => `<div class="yj-quiz-option" data-index="${i}">${opt}</div>`)
    .join('');
  safeInnerHTML(document.getElementById('yj-quiz-options'), optionsHtml);
  document.getElementById('yj-quiz-feedback').className = 'yj-quiz-feedback';
  document.getElementById('yj-quiz-feedback').textContent = '';

  // Attach handlers
  document.querySelectorAll('.yj-quiz-option').forEach(opt => {
    opt.addEventListener('click', function () {
      handleJourneyQuizAnswer(parseInt(this.dataset.index));
    });
  });
}

function handleJourneyQuizAnswer(selectedIndex) {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  const modules = pillar.modules[journeyState.currentLevel] || [];
  const mod = modules[journeyState.currentModuleIndex];
  if (!mod || !mod.quiz) return;

  const options = document.querySelectorAll('.yj-quiz-option');
  const feedback = document.getElementById('yj-quiz-feedback');

  options.forEach(opt => (opt.style.pointerEvents = 'none'));

  if (selectedIndex === mod.quiz.correct) {
    options[selectedIndex].classList.add('correct');
    feedback.className = 'yj-quiz-feedback show success';
    feedback.textContent = '✓ Correct! Module completed.';

    if (!journeyState.completedModules.includes(mod.id)) {
      journeyState.completedModules.push(mod.id);
      saveYourJourneyState();
    }

    setTimeout(() => {
      if (journeyState.currentModuleIndex < modules.length - 1) {
        journeyState.currentModuleIndex++;
        showJourneyContent();
      } else {
        // Level completed - show completion screen
        showLevelCompletion();
      }
    }, 1500);
  } else {
    options[selectedIndex].classList.add('wrong');
    options[mod.quiz.correct].classList.add('correct');
    feedback.className = 'yj-quiz-feedback show error';
    feedback.textContent = '✗ Not quite. Review the module and try again.';

    setTimeout(() => {
      options.forEach(opt => {
        opt.style.pointerEvents = 'auto';
        opt.classList.remove('wrong', 'correct');
      });
      feedback.className = 'yj-quiz-feedback';
    }, 2000);
  }
}

function showLevelCompletion() {
  const pillar = JOURNEY_PILLARS[journeyState.currentPillar];
  const currentLevel = journeyState.currentLevel;
  const levels = ['beginner', 'intermediate', 'advanced'];
  const currentLevelIndex = levels.indexOf(currentLevel);
  const hasNextLevel = currentLevelIndex < levels.length - 1;
  const nextLevel = hasNextLevel ? levels[currentLevelIndex + 1] : null;

  // Mark level as completed
  const levelKey = `${journeyState.currentPillar}-${currentLevel}`;
  if (!journeyState.completedLevels) journeyState.completedLevels = [];
  if (!journeyState.completedLevels.includes(levelKey)) {
    journeyState.completedLevels.push(levelKey);
    saveYourJourneyState();
  }

  // Hide other sections, show completion
  document.getElementById('yj-welcome').style.display = 'none';
  document.getElementById('yj-module').style.display = 'none';
  document.getElementById('yj-quiz').style.display = 'none';
  document.getElementById('yj-level-complete').style.display = 'block';

  // Update completion content
  const levelName = currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1);
  document.getElementById('yj-complete-title').textContent =
    `${pillar.icon} ${levelName} Complete!`;
  document.getElementById('yj-complete-message').textContent =
    `Congratulations! You've completed all ${levelName} modules in ${pillar.name}.`;

  // Build action buttons
  let actionsHtml = '';

  if (hasNextLevel) {
    const nextLevelName = nextLevel.charAt(0).toUpperCase() + nextLevel.slice(1);
    actionsHtml += `
                    <button class="yj-complete-btn yj-complete-btn-primary" data-action="next-level">
                        Continue to ${nextLevelName} →
                    </button>
                `;
  }

  // Show other pillars to switch to
  const otherPillars = Object.entries(JOURNEY_PILLARS).filter(
    ([key]) => key !== journeyState.currentPillar
  );

  actionsHtml += `
                <div class="yj-complete-divider">
                    <span>or explore another path</span>
                </div>
                <div class="yj-complete-pillars">
            `;

  otherPillars.forEach(([key, p]) => {
    actionsHtml += `
                    <button class="yj-complete-pillar" data-pillar="${key}">
                        <span class="yj-complete-pillar-icon">${p.icon}</span>
                        <span class="yj-complete-pillar-name">${p.name}</span>
                    </button>
                `;
  });

  actionsHtml += '</div>';

  safeInnerHTML(document.getElementById('yj-complete-actions'), actionsHtml);

  // Attach event handlers
  const nextLevelBtn = document.querySelector('[data-action="next-level"]');
  if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', function () {
      journeyState.currentLevel = nextLevel;
      journeyState.currentModuleIndex = 0;
      saveYourJourneyState();
      document.getElementById('yj-level-complete').style.display = 'none';
      showJourneyContent();
    });
  }

  document.querySelectorAll('.yj-complete-pillar').forEach(btn => {
    btn.addEventListener('click', function () {
      const newPillar = this.dataset.pillar;
      journeyState.currentPillar = newPillar;
      journeyState.currentLevel = 'beginner';
      journeyState.currentModuleIndex = 0;
      saveYourJourneyState();
      document.getElementById('yj-level-complete').style.display = 'none';
      showJourneyContent();
    });
  });

  renderJourneyRoadmap();
}

function selectJourneyPillar(pillar) {
  journeyState.currentPillar = pillar;
  journeyState.currentModuleIndex = 0;
  saveYourJourneyState();
  showJourneyContent();
}

// ============================================
// PATH SELECTOR - Change Path at Any Time
// ============================================

function showPathSelector() {
  document.getElementById('yj-welcome').style.display = 'none';
  document.getElementById('yj-module').style.display = 'none';
  document.getElementById('yj-quiz').style.display = 'none';
  document.getElementById('yj-level-complete').style.display = 'none';
  document.getElementById('yj-path-selector').style.display = 'block';

  // Update progress for each path card
  updatePathCardProgress();

  // Mark current path
  const pathCards = document.querySelectorAll('.yj-path-card');
  pathCards.forEach(card => {
    card.classList.remove('current');
    if (card.dataset.pillar === journeyState.currentPillar) {
      card.classList.add('current');
    }
  });
}

function hidePathSelector() {
  document.getElementById('yj-path-selector').style.display = 'none';
  if (journeyState.currentPillar) {
    showJourneyContent();
  } else {
    showJourneyWelcome();
  }
}

function updatePathCardProgress() {
  Object.keys(JOURNEY_PILLARS).forEach(pillarKey => {
    const pillar = JOURNEY_PILLARS[pillarKey];
    const progressEl = document.getElementById(`yj-path-progress-${pillarKey}`);
    if (!progressEl) return;

    // Count total and completed modules across all levels
    let totalModules = 0;
    let completedModules = 0;

    ['beginner', 'intermediate', 'advanced'].forEach(level => {
      const modules = pillar.modules[level] || [];
      totalModules += modules.length;
      modules.forEach(mod => {
        if (journeyState.completedModules.includes(mod.id)) {
          completedModules++;
        }
      });
    });

    const progress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
    progressEl.style.setProperty('--progress', `${progress}%`);
  });
}

function changeToPath(pillar) {
  if (!JOURNEY_PILLARS[pillar]) return;

  journeyState.currentPillar = pillar;
  journeyState.currentLevel = 'beginner';
  journeyState.currentModuleIndex = 0;
  journeyState.currentStep = LEARNING_STEPS.ENTRY_QUIZ;
  journeyState.currentSubIndex = 0;
  saveYourJourneyState();

  hidePathSelector();
}

function changeLevel(level) {
  if (!['beginner', 'intermediate', 'advanced'].includes(level)) return;

  journeyState.currentLevel = level;
  journeyState.currentModuleIndex = 0;
  journeyState.currentStep = LEARNING_STEPS.ENTRY_QUIZ;
  journeyState.currentSubIndex = 0;
  saveYourJourneyState();

  updateLevelTabs();
  updateJourneyProfile();
  renderJourneyRoadmap();
  renderCurrentModule();
}

// Initialize path selector event listeners
function initPathSelector() {
  // Change path button
  const changePathBtn = document.getElementById('yj-change-path-btn');
  if (changePathBtn) {
    changePathBtn.addEventListener('click', showPathSelector);
  }

  // Path cancel button
  const pathCancelBtn = document.getElementById('yj-path-cancel');
  if (pathCancelBtn) {
    pathCancelBtn.addEventListener('click', hidePathSelector);
  }

  // Path cards
  document.querySelectorAll('.yj-path-card').forEach(card => {
    card.addEventListener('click', function () {
      const pillar = this.dataset.pillar;
      changeToPath(pillar);
    });
  });

  // Level tabs
  document.querySelectorAll('.yj-level-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      const level = this.dataset.level;
      changeLevel(level);
    });
  });
}

// ============================================
// STATS PANEL
// ============================================
function openStatsPanel() {
  loadJourneyState();
  const panel = document.getElementById('yj-stats-panel');
  if (panel) {
    panel.style.display = 'block';
    renderStatsPanel();
  }
}

function closeStatsPanel() {
  const panel = document.getElementById('yj-stats-panel');
  if (panel) {
    panel.style.display = 'none';
  }
}

function renderStatsPanel() {
  // Calculate global stats
  const totalModules = Object.values(JOURNEY_PILLARS).reduce((sum, p) => {
    return sum + Object.values(p.modules).reduce((s, mods) => s + mods.length, 0);
  }, 0);
  const completedModules = journeyState.completedModules.length;
  const totalLevels = 12; // 4 pillars x 3 levels
  const completedLevels = journeyState.completedLevels.length;
  const totalBadges = Object.keys(JOURNEY_BADGES).length;
  const unlockedBadges = journeyState.unlockedBadges.length;

  // Global stats
  safeInnerHTML(
    document.getElementById('yj-stats-global'),
    `
                <div class="yj-stats-row">
                    <div class="yj-stat-card">
                        <span class="yj-stat-value">${completedModules}</span>
                        <span class="yj-stat-label">Modules Completed</span>
                        <div class="yj-stat-bar">
                            <div class="yj-stat-bar-fill" style="width: ${(completedModules / totalModules) * 100}%"></div>
                        </div>
                    </div>
                    <div class="yj-stat-card">
                        <span class="yj-stat-value">${completedLevels}/${totalLevels}</span>
                        <span class="yj-stat-label">Levels Completed</span>
                        <div class="yj-stat-bar">
                            <div class="yj-stat-bar-fill" style="width: ${(completedLevels / totalLevels) * 100}%"></div>
                        </div>
                    </div>
                    <div class="yj-stat-card">
                        <span class="yj-stat-value">${unlockedBadges}/${totalBadges}</span>
                        <span class="yj-stat-label">Badges Earned</span>
                        <div class="yj-stat-bar">
                            <div class="yj-stat-bar-fill" style="width: ${(unlockedBadges / totalBadges) * 100}%"></div>
                        </div>
                    </div>
                </div>
            `
  );

  // Pillar progress
  let pillarsHtml = '';
  Object.entries(JOURNEY_PILLARS).forEach(([key, pillar]) => {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const levelStatus = levels
      .map(level => {
        const isCompleted = journeyState.completedLevels.includes(`${key}-${level}`);
        return `<span class="yj-pillar-level ${isCompleted ? 'completed' : ''}">${level.charAt(0).toUpperCase()}</span>`;
      })
      .join('');

    const totalPillarModules = Object.values(pillar.modules).reduce((s, m) => s + m.length, 0);
    const completedPillarModules = journeyState.completedModules.filter(m =>
      m.startsWith(key)
    ).length;
    const progress =
      totalPillarModules > 0 ? (completedPillarModules / totalPillarModules) * 100 : 0;

    pillarsHtml += `
                    <div class="yj-pillar-stat">
                        <div class="yj-pillar-stat-header">
                            <span class="yj-pillar-stat-icon">${pillar.icon}</span>
                            <span class="yj-pillar-stat-name">${pillar.name}</span>
                        </div>
                        <div class="yj-pillar-levels">${levelStatus}</div>
                        <div class="yj-pillar-bar">
                            <div class="yj-pillar-bar-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="yj-pillar-progress">${completedPillarModules}/${totalPillarModules} modules</span>
                    </div>
                `;
  });
  safeInnerHTML(document.getElementById('yj-stats-pillars'), pillarsHtml);

  // Badges
  let badgesHtml = '';
  Object.entries(JOURNEY_BADGES).forEach(([id, badge]) => {
    const isUnlocked = journeyState.unlockedBadges.includes(id);
    badgesHtml += `
                    <div class="yj-badge ${isUnlocked ? 'unlocked' : 'locked'}" title="${badge.desc}">
                        <span class="yj-badge-icon">${badge.icon}</span>
                        <span class="yj-badge-name">${badge.name}</span>
                    </div>
                `;
  });
  safeInnerHTML(document.getElementById('yj-stats-badges'), badgesHtml);
}

// ============================================
// EXPOSE GLOBAL FUNCTIONS FOR CSP COMPLIANCE
// ============================================
window.openProjectFinder = openProjectFinder;
window.closeProjectFinder = closeProjectFinder;
window.restartProjectFinder = restartProjectFinder;
window.startJourneyFromFinder = startJourneyFromFinder;
window.openYourJourney = openYourJourney;
window.closeYourJourney = closeYourJourney;
window.selectJourneyPillar = selectJourneyPillar;
window.showPathSelector = showPathSelector;
window.hidePathSelector = hidePathSelector;
window.changeToPath = changeToPath;
window.changeLevel = changeLevel;
window.openStatsPanel = openStatsPanel;
window.closeStatsPanel = closeStatsPanel;
window.goToJourneyModule = goToJourneyModule;
window.journeyPrevModule = journeyPrevModule;
window.journeyNextModule = journeyNextModule;
window.checkScenario = checkScenario;
window.initFlashcards = initFlashcards;
window.initInteractiveElements = initInteractiveElements;
window.showPillModal = showPillModal;
window.hidePillModal = hidePillModal;
window.unlockHome = unlockHome;
window.resetLearnProgress = resetLearnProgress;
window.showCompletionBadge = showCompletionBadge;
window.hideCompletionBadge = hideCompletionBadge;
window.checkHomeUnlocked = checkHomeUnlocked;
window.switchView = switchView;
window.goToLevel = goToLevel;
window.unlockLevel = unlockLevel;
window.completeCourse = completeCourse;
window.resetProgress = resetProgress;
window.toggleReveal = toggleReveal;
window.checkAnswer = checkAnswer;
window.filterProjects = filterProjects;
window.openDocs = openDocs;
window.closeDocs = closeDocs;
window.openDeepLearn = openDeepLearn;
window.closeDeepLearn = closeDeepLearn;
window.shareCompletion = shareCompletion;
window.filterGlossary = filterGlossary;
window.toggleFaq = toggleFaq;

// Journey du Holder exports
window.initJourney = initJourney;
window.startNewJourney = startNewJourney;
window.continueJourney = continueJourney;
window.shareJourneyResults = shareJourneyResults;
