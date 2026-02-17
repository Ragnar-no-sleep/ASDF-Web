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

  var PAGE_TOOLS = {
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

  var UNIVERSE_LINKS = [
    { icon: '\u{1F3AE}', label: 'Games', desc: 'Mini-jeux', href: '/games' },
    { icon: '\u{1F528}', label: 'Build', desc: 'Builder hub', href: '/build' },
  ];

  var PAGE_ORDER = { burns: 0, forecast: 1, holdex: 2, staking: 3, ignition: 4 };

  var DIR_KEY = 'eco-nav-direction';

  var DENSITY_LABELS = {
    minimal: { label: '\u00C9pur\u00E9', desc: 'Dashboard pur' },
    detailed: { label: 'Pr\u00E9cis', desc: '+ guides & contexte' },
    full: { label: 'Compl\u00E8te', desc: '+ effets & animations' },
  };

  var GLOBAL_THEME_KEY = 'asdf-global-theme';
  var GLOBAL_THEMES = [
    { id: 'auto', label: 'Auto', desc: 'Page default' },
    { id: 'console', label: 'Console', desc: 'Terminal CRT' },
  ];

  // ============================================
  // PAGE DETECTION
  // ============================================

  function getCurrentPage() {
    var path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '');
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
    var globalTheme = getGlobalTheme();

    if (globalTheme !== 'auto') {
      // Global override active
      document.documentElement.setAttribute('data-theme', globalTheme);
      return globalTheme;
    }

    // Auto mode — use page default
    var page = getCurrentPage();
    var tool = PAGE_TOOLS[page];
    var theme = tool ? tool.defaultTheme : 'arcade';
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  // ============================================
  // DENSITY
  // ============================================

  function getDensity(page) {
    var tool = PAGE_TOOLS[page];
    if (!tool) return 'minimal';
    return localStorage.getItem(tool.densityKey) || 'minimal';
  }

  function setDensity(page, density) {
    var tool = PAGE_TOOLS[page];
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
    var page = getCurrentPage();
    var density = getDensity(page);
    if (density !== 'minimal') {
      document.documentElement.setAttribute('data-density', density);
    }
  }

  // ============================================
  // VARIANT (color)
  // ============================================

  function getVariant(page) {
    var tool = PAGE_TOOLS[page];
    if (!tool) return '1';
    return localStorage.getItem(tool.variantKey) || '1';
  }

  function setVariant(page, variant) {
    var tool = PAGE_TOOLS[page];
    if (!tool) return;
    localStorage.setItem(tool.variantKey, variant);
    if (getCurrentPage() === page) {
      document.documentElement.setAttribute('data-variant', variant);
    }
    updateToolCards();
  }

  function applyVariant() {
    var page = getCurrentPage();
    var variant = getVariant(page);
    document.documentElement.setAttribute('data-variant', variant);
  }

  // ============================================
  // NAVIGATION — SLIDING PILL
  // ============================================

  function updateNavPill() {
    var nav = document.querySelector('.eco-nav-links');
    var pill = document.querySelector('.eco-nav-pill');
    var activeLink = document.querySelector('.eco-nav-link.active');
    if (!nav || !pill || !activeLink) return;
    var navRect = nav.getBoundingClientRect();
    var linkRect = activeLink.getBoundingClientRect();
    pill.style.left = linkRect.left - navRect.left + 'px';
    pill.style.width = linkRect.width + 'px';
  }

  // ============================================
  // VIEW TRANSITIONS — DIRECTION
  // ============================================

  function applyNavDirection() {
    var dir = sessionStorage.getItem(DIR_KEY);
    if (dir) {
      document.documentElement.setAttribute('data-eco-dir', dir);
      sessionStorage.removeItem(DIR_KEY);
    }
  }

  function handleNavClick(e) {
    var link = e.target.closest('.eco-nav-link');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;
    var target = href.replace(/^\//, '');
    var current = getCurrentPage();
    var currentIdx = PAGE_ORDER[current];
    var targetIdx = PAGE_ORDER[target];
    if (currentIdx !== undefined && targetIdx !== undefined && currentIdx !== targetIdx) {
      var direction = targetIdx > currentIdx ? 'left' : 'right';
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
    var body = document.querySelector('.eco-drawer-body');
    if (!body) return;
    body.innerHTML = '';

    // Global Theme section (Console toggle)
    var themeTitle = document.createElement('div');
    themeTitle.className = 'eco-drawer-section-title';
    themeTitle.textContent = 'Global Theme';
    body.appendChild(themeTitle);

    var themeToggle = document.createElement('div');
    themeToggle.className = 'eco-theme-toggle';
    body.appendChild(themeToggle);

    var currentGlobalTheme = getGlobalTheme();
    GLOBAL_THEMES.forEach(function (theme) {
      var btn = document.createElement('button');
      btn.className = 'eco-theme-toggle-btn' + (theme.id === currentGlobalTheme ? ' active' : '');
      btn.setAttribute('data-theme-id', theme.id);
      btn.textContent = theme.label;
      btn.title = theme.desc;
      themeToggle.appendChild(btn);
    });

    themeToggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.eco-theme-toggle-btn');
      if (!btn) return;
      var themeId = btn.getAttribute('data-theme-id');
      setGlobalTheme(themeId);
      // Update active state
      themeToggle.querySelectorAll('.eco-theme-toggle-btn').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-theme-id') === themeId);
      });
    });

    // Live theme preview on the actual page: hover = temp apply, click = save
    themeToggle.addEventListener('mouseover', function (e) {
      var btn = e.target.closest('.eco-theme-toggle-btn');
      if (!btn) return;
      var themeId = btn.getAttribute('data-theme-id');
      var resolved =
        themeId === 'auto' ? (PAGE_TOOLS[getCurrentPage()] || {}).defaultTheme || 'ember' : themeId;
      document.documentElement.setAttribute('data-theme', resolved);
    });

    themeToggle.addEventListener('mouseleave', function () {
      applyTheme(); // Restore saved theme
    });

    // Tools section
    var toolsTitle = document.createElement('div');
    toolsTitle.className = 'eco-drawer-section-title';
    toolsTitle.textContent = 'Tools';
    body.appendChild(toolsTitle);

    var toolsList = document.createElement('div');
    toolsList.className = 'eco-tools-list';
    body.appendChild(toolsList);

    Object.keys(PAGE_TOOLS).forEach(function (key) {
      toolsList.appendChild(createToolCard(key, PAGE_TOOLS[key]));
    });

    // Universe section
    var uniTitle = document.createElement('div');
    uniTitle.className = 'eco-drawer-section-title eco-universe-title';
    uniTitle.textContent = 'Univers';
    body.appendChild(uniTitle);

    var uniList = document.createElement('div');
    uniList.className = 'eco-universe-list';
    body.appendChild(uniList);

    UNIVERSE_LINKS.forEach(function (link) {
      uniList.appendChild(createUniverseLink(link));
    });
  }

  function createToolCard(key, tool) {
    var currentPage = getCurrentPage();
    var density = getDensity(key);
    var variant = getVariant(key);

    var card = document.createElement('div');
    card.className = 'eco-tool-card' + (key === currentPage ? ' current' : '');
    card.setAttribute('data-tool', key);

    // Header row (always visible)
    var header = document.createElement('div');
    header.className = 'eco-tool-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-label', tool.label);

    var icon = document.createElement('span');
    icon.className = 'eco-tool-icon';
    icon.textContent = tool.icon;

    var label = document.createElement('span');
    label.className = 'eco-tool-label';
    label.textContent = tool.label;

    var badge = document.createElement('span');
    badge.className = 'eco-tool-badge';
    badge.textContent = DENSITY_LABELS[density].label;

    var chevron = document.createElement('span');
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
      var panel = document.getElementById('ecoPagePreview');
      if (!panel) return;
      var iframe = panel.querySelector('.eco-page-preview-iframe');
      var toolPath = '/' + key;
      // Toggle: if same tool already showing, hide
      if (panel.classList.contains('visible') && iframe.dataset.lastSrc === toolPath) {
        panel.classList.remove('visible');
        return;
      }
      // Load tool page in iframe
      var onLoad = function () {
        try {
          var doc = iframe.contentDocument;
          if (!doc) return;
          var theme = getGlobalTheme();
          var resolved = theme === 'auto' ? (PAGE_TOOLS[key] || {}).defaultTheme || 'ember' : theme;
          doc.documentElement.setAttribute('data-theme', resolved);
          var iframeDrawer = doc.querySelector('.eco-drawer');
          if (iframeDrawer) iframeDrawer.style.display = 'none';
          var iframeBtn = doc.querySelector('.eco-style-btn');
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
    var expand = document.createElement('div');
    expand.className = 'eco-tool-expand';

    // — Density picker
    var dLabel = document.createElement('div');
    dLabel.className = 'eco-expand-label';
    dLabel.textContent = 'Densit\u00E9';
    expand.appendChild(dLabel);

    var dPicker = document.createElement('div');
    dPicker.className = 'eco-density-picker';
    ['minimal', 'detailed', 'full'].forEach(function (d) {
      var opt = document.createElement('button');
      opt.className = 'eco-density-option' + (d === density ? ' active' : '');
      opt.setAttribute('data-density', d);
      opt.textContent = DENSITY_LABELS[d].label;
      opt.title = DENSITY_LABELS[d].desc;
      dPicker.appendChild(opt);
    });
    expand.appendChild(dPicker);

    // — Color picker
    var cLabel = document.createElement('div');
    cLabel.className = 'eco-expand-label';
    cLabel.textContent = 'Couleur';
    expand.appendChild(cLabel);

    var cPicker = document.createElement('div');
    cPicker.className = 'eco-color-picker';
    tool.variants.names.forEach(function (name, i) {
      var v = String(i + 1);
      var sw = document.createElement('button');
      sw.className =
        'eco-color-swatch ' + (tool.variants.swatches[i] || '') + (v === variant ? ' active' : '');
      sw.setAttribute('data-variant', v);
      sw.title = name;
      sw.setAttribute('aria-label', name);
      cPicker.appendChild(sw);
    });
    expand.appendChild(cPicker);

    // — Actions
    var actions = document.createElement('div');
    actions.className = 'eco-tool-actions';

    var goBtn = document.createElement('a');
    goBtn.className = 'eco-tool-go';
    goBtn.href = tool.href;
    goBtn.textContent = '\u2192 ' + tool.label;

    var stayBtn = document.createElement('button');
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
      var opt = e.target.closest('.eco-density-option');
      if (opt) setDensity(key, opt.getAttribute('data-density'));
    });
    cPicker.addEventListener('click', function (e) {
      var sw = e.target.closest('.eco-color-swatch');
      if (sw) setVariant(key, sw.getAttribute('data-variant'));
    });
    stayBtn.addEventListener('click', closeDrawer);

    return card;
  }

  function toggleToolCard(card) {
    var wasExpanded = card.classList.contains('expanded');

    // Collapse all (accordion)
    document.querySelectorAll('.eco-tool-card.expanded').forEach(function (c) {
      c.classList.remove('expanded');
      var h = c.querySelector('.eco-tool-header');
      if (h) h.setAttribute('aria-expanded', 'false');
    });

    if (!wasExpanded) {
      card.classList.add('expanded');
      var h = card.querySelector('.eco-tool-header');
      if (h) h.setAttribute('aria-expanded', 'true');
    }
  }

  function updateToolCards() {
    document.querySelectorAll('.eco-tool-card').forEach(function (card) {
      var key = card.getAttribute('data-tool');
      if (!key) return;
      var density = getDensity(key);
      var variant = getVariant(key);

      var badge = card.querySelector('.eco-tool-badge');
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
    var el = document.createElement('a');
    el.className = 'eco-universe-link';
    el.href = link.href;

    var icon = document.createElement('span');
    icon.className = 'eco-universe-icon';
    icon.textContent = link.icon;

    var info = document.createElement('div');
    info.className = 'eco-universe-info';

    var label = document.createElement('span');
    label.className = 'eco-universe-label';
    label.textContent = link.label;

    var desc = document.createElement('span');
    desc.className = 'eco-universe-desc';
    desc.textContent = link.desc;

    info.appendChild(label);
    info.appendChild(desc);

    var arrow = document.createElement('span');
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
    var page = getCurrentPage();
    document.querySelectorAll('.eco-nav-link').forEach(function (link) {
      var href = link.getAttribute('href').replace(/^\//, '');
      link.classList.toggle('active', href === page);
    });

    // Pill position
    requestAnimationFrame(updateNavPill);
    window.addEventListener('resize', updateNavPill);

    // Nav clicks — store direction
    var navLinks = document.querySelector('.eco-nav-links');
    if (navLinks) navLinks.addEventListener('click', handleNavClick);

    // Style button opens drawer
    var styleBtn = document.querySelector('.eco-style-btn');
    if (styleBtn) {
      styleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDrawer();
      });
    }

    // Drawer close + backdrop
    var closeBtn = document.querySelector('.eco-drawer-close');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    var backdrop = document.querySelector('.eco-drawer-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    // Render tool drawer
    initToolDrawer();

    // Create floating page preview panel (right of drawer)
    if (!document.getElementById('ecoPagePreview')) {
      var panel = document.createElement('div');
      panel.id = 'ecoPagePreview';
      panel.className = 'eco-page-preview';
      panel.innerHTML =
        '<iframe class="eco-page-preview-iframe" src="" sandbox="allow-scripts allow-same-origin" title="Page preview"></iframe>';
      document.body.appendChild(panel);
    }

    // Escape closes drawer AND preview panel
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDrawer();
        var preview = document.getElementById('ecoPagePreview');
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
