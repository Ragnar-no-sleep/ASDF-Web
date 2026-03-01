/**
 * ASDF Ecosystem Shell
 * Tool drawer, density modes, variant colors, navigation
 * Zero intersection with page-specific JS
 */

(function () {
  'use strict';

  // ============================================
  // CONFIG
  // ============================================

  const PAGE_TOOLS = {
    burns: {
      icon: '\u{1F525}',
      label: 'Burns',
      href: '/burns',
      defaultTheme: 'ember',
      densityKey: 'asdf-density-burns',
      variantKey: 'asdf-variant-burns',
      variants: {
        names: ['Gold', 'Inferno', 'Ash'],
        swatches: [
          'eco-variant-swatch--gold',
          'eco-variant-swatch--inferno',
          'eco-variant-swatch--ash',
        ],
      },
    },
    forecast: {
      icon: '\u{1F3AF}',
      label: 'Forecast',
      href: '/forecast',
      defaultTheme: 'matrix',
      densityKey: 'asdf-density-forecast',
      variantKey: 'asdf-variant-forecast',
      variants: {
        names: ['Matrix', 'Bloomberg', 'Synthwave'],
        swatches: [
          'eco-variant-swatch--matrix',
          'eco-variant-swatch--bloomberg',
          'eco-variant-swatch--synthwave',
        ],
      },
    },
    holdex: {
      icon: '\u{1F4C8}',
      label: 'HolDex',
      href: '/holdex',
      defaultTheme: 'holdex',
      densityKey: 'asdf-density-holdex',
      variantKey: 'asdf-variant-holdex',
      variants: {
        names: ['Emerald', 'Crystal', 'Vintage'],
        swatches: [
          'eco-variant-swatch--emerald',
          'eco-variant-swatch--crystal',
          'eco-variant-swatch--vintage',
        ],
      },
    },
    staking: {
      icon: '\u{1F512}',
      label: 'Staking',
      href: '/staking',
      defaultTheme: 'delegate',
      densityKey: 'asdf-density-staking',
      variantKey: 'asdf-variant-staking',
      variants: {
        names: ['Cosmos', 'Vault', 'Aurora'],
        swatches: [
          'eco-variant-swatch--cosmos',
          'eco-variant-swatch--vault',
          'eco-variant-swatch--aurora',
        ],
      },
    },
    ignition: {
      icon: '\u{1F680}',
      label: 'Ignition',
      href: '/ignition',
      defaultTheme: 'arcade',
      densityKey: 'asdf-density-ignition',
      variantKey: 'asdf-variant-ignition',
      variants: {
        names: ['Ember', 'Neon', 'Pixel'],
        swatches: [
          'eco-variant-swatch--ember-ig',
          'eco-variant-swatch--neon',
          'eco-variant-swatch--pixel',
        ],
      },
    },
  };

  const UNIVERSE_LINKS = [
    { icon: '\u{1F3AE}', label: 'Games', desc: 'Mini-jeux', href: '/games' },
    { icon: '\u{1F528}', label: 'Build', desc: 'Builder hub', href: '/build' },
  ];

  const PAGE_ORDER = { burns: 0, forecast: 1, holdex: 2, staking: 3, ignition: 4 };

  const DIR_KEY = 'eco-nav-direction';

  const DENSITY_LABELS = {
    minimal: { label: 'Minimal', desc: 'Clean dashboard' },
    detailed: { label: 'Detailed', desc: '+ guides & context' },
    full: { label: 'Full', desc: '+ effects & animations' },
  };

  const GLOBAL_THEME_KEY = 'asdf-global-theme';
  const GLOBAL_THEMES = [
    { id: 'auto', label: 'Auto', desc: 'Page default' },
    { id: 'console', label: 'Console', desc: 'Terminal CRT' },
  ];

  // ============================================
  // PAGE DETECTION
  // ============================================

  function getCurrentPage() {
    const path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '');
    return path || 'burns';
  }

  // ============================================
  // THEME (global override or auto per page)
  // ============================================

  function getGlobalTheme() {
    return localStorage.getItem(GLOBAL_THEME_KEY) || 'auto';
  }

  function setGlobalTheme(themeId) {
    localStorage.setItem(GLOBAL_THEME_KEY, themeId);
    applyTheme();
  }

  function applyTheme() {
    const globalTheme = getGlobalTheme();

    if (globalTheme !== 'auto') {
      // Global override active
      document.documentElement.setAttribute('data-theme', globalTheme);
      return globalTheme;
    }

    // Auto mode — use page default
    const page = getCurrentPage();
    const tool = PAGE_TOOLS[page];
    const theme = tool ? tool.defaultTheme : 'arcade';
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  // ============================================
  // DENSITY
  // ============================================

  function getDensity(page) {
    const tool = PAGE_TOOLS[page];
    if (!tool) return 'minimal';
    return localStorage.getItem(tool.densityKey) || 'minimal';
  }

  function setDensity(page, density) {
    const tool = PAGE_TOOLS[page];
    if (!tool) return;
    localStorage.setItem(tool.densityKey, density);
    if (getCurrentPage() === page) {
      if (density === 'minimal') {
        document.documentElement.removeAttribute('data-density');
      } else {
        document.documentElement.setAttribute('data-density', density);
      }
    }
    updateToolCards();
  }

  function applyDensity() {
    const page = getCurrentPage();
    const density = getDensity(page);
    if (density !== 'minimal') {
      document.documentElement.setAttribute('data-density', density);
    }
  }

  // ============================================
  // VARIANT (color)
  // ============================================

  function getVariant(page) {
    const tool = PAGE_TOOLS[page];
    if (!tool) return '1';
    return localStorage.getItem(tool.variantKey) || '1';
  }

  function setVariant(page, variant) {
    const tool = PAGE_TOOLS[page];
    if (!tool) return;
    localStorage.setItem(tool.variantKey, variant);
    if (getCurrentPage() === page) {
      document.documentElement.setAttribute('data-variant', variant);
    }
    updateToolCards();
  }

  function applyVariant() {
    const page = getCurrentPage();
    const variant = getVariant(page);
    document.documentElement.setAttribute('data-variant', variant);
  }

  // ============================================
  // NAVIGATION — SLIDING PILL
  // ============================================

  function updateNavPill() {
    const nav = document.querySelector('.eco-nav-links');
    const pill = document.querySelector('.eco-nav-pill');
    const activeLink = document.querySelector('.eco-nav-link.active');
    if (!nav || !pill || !activeLink) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    pill.style.left = linkRect.left - navRect.left + 'px';
    pill.style.width = linkRect.width + 'px';
  }

  // ============================================
  // VIEW TRANSITIONS — DIRECTION
  // ============================================

  function applyNavDirection() {
    const dir = sessionStorage.getItem(DIR_KEY);
    if (dir) {
      document.documentElement.setAttribute('data-eco-dir', dir);
      sessionStorage.removeItem(DIR_KEY);
    }
  }

  function handleNavClick(e) {
    const link = e.target.closest('.eco-nav-link');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;
    const target = href.replace(/^\//, '');
    const current = getCurrentPage();
    const currentIdx = PAGE_ORDER[current];
    const targetIdx = PAGE_ORDER[target];
    if (currentIdx !== undefined && targetIdx !== undefined && currentIdx !== targetIdx) {
      const direction = targetIdx > currentIdx ? 'left' : 'right';
      sessionStorage.setItem(DIR_KEY, direction);
    }
  }

  // ============================================
  // DRAWER — OPEN / CLOSE
  // ============================================

  function openDrawer() {
    document.body.classList.add('eco-drawer-open');
  }

  function closeDrawer() {
    document.body.classList.remove('eco-drawer-open');
  }

  // ============================================
  // TOOL DRAWER — RENDER
  // ============================================

  function initToolDrawer() {
    const body = document.querySelector('.eco-drawer-body');
    if (!body) return;
    body.innerHTML = '';

    // Global Theme section (Console toggle)
    const themeTitle = document.createElement('div');
    themeTitle.className = 'eco-drawer-section-title';
    themeTitle.textContent = 'Global Theme';
    body.appendChild(themeTitle);

    const themeToggle = document.createElement('div');
    themeToggle.className = 'eco-theme-toggle';
    body.appendChild(themeToggle);

    const currentGlobalTheme = getGlobalTheme();
    GLOBAL_THEMES.forEach(function (theme) {
      const btn = document.createElement('button');
      btn.className = 'eco-theme-toggle-btn' + (theme.id === currentGlobalTheme ? ' active' : '');
      btn.setAttribute('data-theme-id', theme.id);
      btn.textContent = theme.label;
      btn.title = theme.desc;
      themeToggle.appendChild(btn);
    });

    themeToggle.addEventListener('click', function (e) {
      const btn = e.target.closest('.eco-theme-toggle-btn');
      if (!btn) return;
      const themeId = btn.getAttribute('data-theme-id');
      setGlobalTheme(themeId);
      // Update active state
      themeToggle.querySelectorAll('.eco-theme-toggle-btn').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-theme-id') === themeId);
      });
    });

    // Live theme preview on the actual page: hover = temp apply, click = save
    themeToggle.addEventListener('mouseover', function (e) {
      const btn = e.target.closest('.eco-theme-toggle-btn');
      if (!btn) return;
      const themeId = btn.getAttribute('data-theme-id');
      const resolved =
        themeId === 'auto' ? (PAGE_TOOLS[getCurrentPage()] || {}).defaultTheme || 'ember' : themeId;
      document.documentElement.setAttribute('data-theme', resolved);
    });

    themeToggle.addEventListener('mouseleave', function () {
      applyTheme(); // Restore saved theme
    });

    // Tools section
    const toolsTitle = document.createElement('div');
    toolsTitle.className = 'eco-drawer-section-title';
    toolsTitle.textContent = 'Tools';
    body.appendChild(toolsTitle);

    const toolsList = document.createElement('div');
    toolsList.className = 'eco-tools-list';
    body.appendChild(toolsList);

    Object.keys(PAGE_TOOLS).forEach(function (key) {
      toolsList.appendChild(createToolCard(key, PAGE_TOOLS[key]));
    });

    // Universe section
    const uniTitle = document.createElement('div');
    uniTitle.className = 'eco-drawer-section-title eco-universe-title';
    uniTitle.textContent = 'Univers';
    body.appendChild(uniTitle);

    const uniList = document.createElement('div');
    uniList.className = 'eco-universe-list';
    body.appendChild(uniList);

    UNIVERSE_LINKS.forEach(function (link) {
      uniList.appendChild(createUniverseLink(link));
    });
  }

  function createToolCard(key, tool) {
    const currentPage = getCurrentPage();
    const density = getDensity(key);
    const variant = getVariant(key);

    const card = document.createElement('div');
    card.className = 'eco-tool-card' + (key === currentPage ? ' current' : '');
    card.setAttribute('data-tool', key);

    // Header row (always visible)
    const header = document.createElement('div');
    header.className = 'eco-tool-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-label', tool.label);

    const icon = document.createElement('span');
    icon.className = 'eco-tool-icon';
    icon.textContent = tool.icon;

    const label = document.createElement('span');
    label.className = 'eco-tool-label';
    label.textContent = tool.label;

    const badge = document.createElement('span');
    badge.className = 'eco-tool-badge';
    badge.textContent = DENSITY_LABELS[density].label;

    const chevron = document.createElement('span');
    chevron.className = 'eco-tool-chevron';
    chevron.innerHTML = '&#9662;';

    header.appendChild(icon);
    header.appendChild(label);
    header.appendChild(badge);
    header.appendChild(chevron);
    card.appendChild(header);

    // Preview on click: show floating panel with this tool's page
    card.addEventListener('click', function (e) {
      // Don't intercept link clicks inside the card
      if (e.target.closest('a')) return;
      const panel = document.getElementById('ecoPagePreview');
      if (!panel) return;
      const iframe = panel.querySelector('.eco-page-preview-iframe');
      const toolPath = '/' + key;
      // Toggle: if same tool already showing, hide
      if (panel.classList.contains('visible') && iframe.dataset.lastSrc === toolPath) {
        panel.classList.remove('visible');
        return;
      }
      // Load tool page in iframe
      const onLoad = function () {
        try {
          const doc = iframe.contentDocument;
          if (!doc) return;
          const theme = getGlobalTheme();
          const resolved =
            theme === 'auto' ? (PAGE_TOOLS[key] || {}).defaultTheme || 'ember' : theme;
          doc.documentElement.setAttribute('data-theme', resolved);
          const iframeDrawer = doc.querySelector('.eco-drawer');
          if (iframeDrawer) iframeDrawer.style.display = 'none';
          const iframeBtn = doc.querySelector('.eco-style-btn');
          if (iframeBtn) iframeBtn.style.display = 'none';
        } catch (err) {}
        iframe.removeEventListener('load', onLoad);
      };
      if (iframe.dataset.lastSrc !== toolPath) {
        iframe.addEventListener('load', onLoad);
        iframe.src = toolPath;
        iframe.dataset.lastSrc = toolPath;
      }
      panel.classList.add('visible');
    });

    // Expandable content
    const expand = document.createElement('div');
    expand.className = 'eco-tool-expand';

    // — Density picker
    const dLabel = document.createElement('div');
    dLabel.className = 'eco-expand-label';
    dLabel.textContent = 'Densit\u00E9';
    expand.appendChild(dLabel);

    const dPicker = document.createElement('div');
    dPicker.className = 'eco-density-picker';
    ['minimal', 'detailed', 'full'].forEach(function (d) {
      const opt = document.createElement('button');
      opt.className = 'eco-density-option' + (d === density ? ' active' : '');
      opt.setAttribute('data-density', d);
      opt.textContent = DENSITY_LABELS[d].label;
      opt.title = DENSITY_LABELS[d].desc;
      dPicker.appendChild(opt);
    });
    expand.appendChild(dPicker);

    // — Color picker
    const cLabel = document.createElement('div');
    cLabel.className = 'eco-expand-label';
    cLabel.textContent = 'Couleur';
    expand.appendChild(cLabel);

    const cPicker = document.createElement('div');
    cPicker.className = 'eco-color-picker';
    tool.variants.names.forEach(function (name, i) {
      const v = String(i + 1);
      const sw = document.createElement('button');
      sw.className =
        'eco-color-swatch ' + (tool.variants.swatches[i] || '') + (v === variant ? ' active' : '');
      sw.setAttribute('data-variant', v);
      sw.title = name;
      sw.setAttribute('aria-label', name);
      cPicker.appendChild(sw);
    });
    expand.appendChild(cPicker);

    // — Actions
    const actions = document.createElement('div');
    actions.className = 'eco-tool-actions';

    const goBtn = document.createElement('a');
    goBtn.className = 'eco-tool-go';
    goBtn.href = tool.href;
    goBtn.textContent = '\u2192 ' + tool.label;

    const stayBtn = document.createElement('button');
    stayBtn.className = 'eco-tool-stay';
    stayBtn.textContent = 'Rester';

    actions.appendChild(goBtn);
    actions.appendChild(stayBtn);
    expand.appendChild(actions);

    card.appendChild(expand);

    // — Events
    header.addEventListener('click', function () {
      toggleToolCard(card);
    });
    header.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleToolCard(card);
      }
    });
    dPicker.addEventListener('click', function (e) {
      const opt = e.target.closest('.eco-density-option');
      if (opt) setDensity(key, opt.getAttribute('data-density'));
    });
    cPicker.addEventListener('click', function (e) {
      const sw = e.target.closest('.eco-color-swatch');
      if (sw) setVariant(key, sw.getAttribute('data-variant'));
    });
    stayBtn.addEventListener('click', closeDrawer);

    return card;
  }

  function toggleToolCard(card) {
    const wasExpanded = card.classList.contains('expanded');

    // Collapse all (accordion)
    document.querySelectorAll('.eco-tool-card.expanded').forEach(function (c) {
      c.classList.remove('expanded');
      const h = c.querySelector('.eco-tool-header');
      if (h) h.setAttribute('aria-expanded', 'false');
    });

    if (!wasExpanded) {
      card.classList.add('expanded');
      const h = card.querySelector('.eco-tool-header');
      if (h) h.setAttribute('aria-expanded', 'true');
    }
  }

  function updateToolCards() {
    document.querySelectorAll('.eco-tool-card').forEach(function (card) {
      const key = card.getAttribute('data-tool');
      if (!key) return;
      const density = getDensity(key);
      const variant = getVariant(key);

      const badge = card.querySelector('.eco-tool-badge');
      if (badge) badge.textContent = DENSITY_LABELS[density].label;

      card.querySelectorAll('.eco-density-option').forEach(function (opt) {
        opt.classList.toggle('active', opt.getAttribute('data-density') === density);
      });
      card.querySelectorAll('.eco-color-swatch').forEach(function (sw) {
        sw.classList.toggle('active', sw.getAttribute('data-variant') === variant);
      });
    });
  }

  function createUniverseLink(link) {
    const el = document.createElement('a');
    el.className = 'eco-universe-link';
    el.href = link.href;

    const icon = document.createElement('span');
    icon.className = 'eco-universe-icon';
    icon.textContent = link.icon;

    const info = document.createElement('div');
    info.className = 'eco-universe-info';

    const label = document.createElement('span');
    label.className = 'eco-universe-label';
    label.textContent = link.label;

    const desc = document.createElement('span');
    desc.className = 'eco-universe-desc';
    desc.textContent = link.desc;

    info.appendChild(label);
    info.appendChild(desc);

    const arrow = document.createElement('span');
    arrow.className = 'eco-universe-arrow';
    arrow.innerHTML = '&#8594;';

    el.appendChild(icon);
    el.appendChild(info);
    el.appendChild(arrow);
    return el;
  }

  // ============================================
  // INIT
  // ============================================

  function init() {
    applyNavDirection();
    applyTheme();
    applyVariant();
    applyDensity();

    // Active nav link
    const page = getCurrentPage();
    document.querySelectorAll('.eco-nav-link').forEach(function (link) {
      const href = link.getAttribute('href').replace(/^\//, '');
      link.classList.toggle('active', href === page);
    });

    // Pill position
    requestAnimationFrame(updateNavPill);
    window.addEventListener('resize', updateNavPill);

    // Nav clicks — store direction
    const navLinks = document.querySelector('.eco-nav-links');
    if (navLinks) navLinks.addEventListener('click', handleNavClick);

    // Style button opens drawer
    const styleBtn = document.querySelector('.eco-style-btn');
    if (styleBtn) {
      styleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDrawer();
      });
    }

    // Drawer close + backdrop
    const closeBtn = document.querySelector('.eco-drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    const backdrop = document.querySelector('.eco-drawer-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Render tool drawer
    initToolDrawer();

    // Create floating page preview panel (right of drawer)
    if (!document.getElementById('ecoPagePreview')) {
      const panel = document.createElement('div');
      panel.id = 'ecoPagePreview';
      panel.className = 'eco-page-preview';
      panel.innerHTML =
        '<iframe class="eco-page-preview-iframe" src="" sandbox="allow-scripts allow-same-origin allow-forms" title="Page preview"></iframe>';
      document.body.appendChild(panel);
    }

    // Escape closes drawer AND preview panel
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDrawer();
        const preview = document.getElementById('ecoPagePreview');
        if (preview) preview.classList.remove('visible');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
