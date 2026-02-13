/**
 * ASDF Ecosystem Shell
 * Navigation, theme management, View Transitions, style drawer
 * Zero intersection with page-specific JS
 */

(function () {
  'use strict';

  // Page order for direction-aware sliding
  const PAGE_ORDER = {
    burns: 0,
    asdforecast: 1,
    holdex: 2,
    staking: 3,
    ignition: 4,
  };

  // Default theme per page (applied if no user preference)
  const PAGE_THEMES = {
    burns: 'ember',
    asdforecast: 'matrix',
    holdex: 'holdex',
    staking: 'delegate',
    ignition: 'arcade',
  };

  // Variant config per page: name, dot colors, drawer metadata
  const PAGE_VARIANTS = {
    burns: {
      key: 'asdf-variant-burns',
      dots: ['#c9a227', '#dc2626', '#94a3b8'],
      names: ['Gold', 'Inferno', 'Ash'],
      swatches: [
        'eco-variant-swatch--gold',
        'eco-variant-swatch--inferno',
        'eco-variant-swatch--ash',
      ],
    },
    asdforecast: {
      key: 'asdf-variant-forecast',
      dots: ['#00ff41', '#3b82f6', '#f472b6'],
      names: ['Matrix', 'Bloomberg', 'Synthwave'],
      swatches: [
        'eco-variant-swatch--matrix',
        'eco-variant-swatch--bloomberg',
        'eco-variant-swatch--synthwave',
      ],
    },
    holdex: {
      key: 'asdf-variant-holdex',
      dots: ['#4ade80', '#38bdf8', '#f59e0b'],
      names: ['Emerald', 'Crystal', 'Vintage'],
      swatches: [
        'eco-variant-swatch--emerald',
        'eco-variant-swatch--crystal',
        'eco-variant-swatch--vintage',
      ],
    },
    staking: {
      key: 'asdf-variant-staking',
      dots: ['#7b93ff', '#eab308', '#2dd4bf'],
      names: ['Cosmos', 'Vault', 'Aurora'],
      swatches: [
        'eco-variant-swatch--cosmos',
        'eco-variant-swatch--vault',
        'eco-variant-swatch--aurora',
      ],
    },
    ignition: {
      key: 'asdf-variant-ignition',
      dots: ['#ea580c', '#e879f9', '#22c55e'],
      names: ['Ember', 'Neon', 'Pixel'],
      swatches: [
        'eco-variant-swatch--ember-ig',
        'eco-variant-swatch--neon',
        'eco-variant-swatch--pixel',
      ],
    },
  };

  const THEME_KEY = 'asdf-theme';
  const DIR_KEY = 'eco-nav-direction';

  // ============================================
  // THEME MANAGER
  // ============================================

  function getCurrentPage() {
    const path = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '');
    // Map /games to ignition
    if (path === 'games') return 'ignition';
    return path || 'burns';
  }

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || null;
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeCards(theme);
    updateNavPill();
  }

  function applyTheme() {
    const saved = getTheme();
    const page = getCurrentPage();
    const theme = saved || PAGE_THEMES[page] || 'arcade';
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  // ============================================
  // NAVIGATION - SLIDING PILL
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
  // VIEW TRANSITIONS - DIRECTION
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
  // VARIANT MANAGER
  // ============================================

  function getVariant(page) {
    var cfg = PAGE_VARIANTS[page];
    if (!cfg) return '1';
    return localStorage.getItem(cfg.key) || '1';
  }

  function setVariant(page, variant) {
    var cfg = PAGE_VARIANTS[page];
    if (!cfg) return;
    localStorage.setItem(cfg.key, variant);
    document.documentElement.setAttribute('data-variant', variant);
    updateVariantDots(variant);
    updateVariantCards(variant);
  }

  function applyVariant() {
    var page = getCurrentPage();
    var variant = getVariant(page);
    document.documentElement.setAttribute('data-variant', variant);
    return variant;
  }

  function updateVariantDots(activeVariant) {
    document.querySelectorAll('.variant-dot').forEach(function (dot) {
      dot.classList.toggle('active', dot.getAttribute('data-variant') === activeVariant);
    });
  }

  function initVariantSwitcher() {
    var page = getCurrentPage();
    var cfg = PAGE_VARIANTS[page];
    if (!cfg) return;

    var switcher = document.querySelector('.variant-switcher');
    if (!switcher) return;

    var variant = getVariant(page);
    updateVariantDots(variant);

    switcher.addEventListener('click', function (e) {
      var dot = e.target.closest('.variant-dot');
      if (!dot) return;
      var v = dot.getAttribute('data-variant');
      if (v) setVariant(page, v);
    });
  }

  // ============================================
  // VARIANT DRAWER (in-drawer picker)
  // ============================================

  function updateVariantCards(activeVariant) {
    document.querySelectorAll('.eco-variant-card').forEach(function (card) {
      card.classList.toggle('active', card.getAttribute('data-variant') === activeVariant);
    });
  }

  function initVariantDrawer() {
    var picker = document.querySelector('.eco-variant-picker');
    if (!picker) return;

    var page = getCurrentPage();
    var cfg = PAGE_VARIANTS[page];
    if (!cfg || !cfg.names) return;

    var variant = getVariant(page);

    // Render variant cards
    picker.innerHTML = '';
    cfg.names.forEach(function (name, i) {
      var v = String(i + 1);
      var card = document.createElement('div');
      card.className = 'eco-variant-card' + (v === variant ? ' active' : '');
      card.setAttribute('data-variant', v);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', name + ' style');

      var swatch = document.createElement('div');
      swatch.className = 'eco-variant-swatch ' + (cfg.swatches[i] || '');

      var label = document.createElement('div');
      label.className = 'eco-variant-name';
      label.textContent = name;

      var check = document.createElement('div');
      check.className = 'eco-variant-check';
      check.innerHTML = '&#10003;';

      card.appendChild(swatch);
      card.appendChild(label);
      card.appendChild(check);
      picker.appendChild(card);
    });

    // Click handler
    picker.addEventListener('click', function (e) {
      var card = e.target.closest('.eco-variant-card');
      if (!card) return;
      var v = card.getAttribute('data-variant');
      if (v) setVariant(page, v);
    });

    // Keyboard handler (Enter/Space)
    picker.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('.eco-variant-card');
      if (!card) return;
      e.preventDefault();
      var v = card.getAttribute('data-variant');
      if (v) setVariant(page, v);
    });
  }

  // ============================================
  // STYLE DRAWER
  // ============================================

  function openDrawer() {
    document.body.classList.add('eco-drawer-open');
  }

  function closeDrawer() {
    document.body.classList.remove('eco-drawer-open');
  }

  function toggleDrawer() {
    document.body.classList.toggle('eco-drawer-open');
  }

  function updateThemeCards(activeTheme) {
    document.querySelectorAll('.eco-theme-card').forEach(function (card) {
      const theme = card.getAttribute('data-theme');
      card.classList.toggle('active', theme === activeTheme);
    });
  }

  // ============================================
  // INIT
  // ============================================

  function init() {
    // Apply direction from previous navigation
    applyNavDirection();

    // Apply theme
    const activeTheme = applyTheme();

    // Apply variant
    applyVariant();

    // Set active nav link
    const page = getCurrentPage();
    document.querySelectorAll('.eco-nav-link').forEach(function (link) {
      const href = link.getAttribute('href').replace(/^\//, '');
      link.classList.toggle('active', href === page);
    });

    // Pill position (defer to let layout settle)
    requestAnimationFrame(function () {
      updateNavPill();
    });

    // Recalculate pill on resize
    window.addEventListener('resize', updateNavPill);

    // Nav link clicks — store direction
    const navLinks = document.querySelector('.eco-nav-links');
    if (navLinks) {
      navLinks.addEventListener('click', handleNavClick);
    }

    // Style button
    var styleBtn = document.querySelector('.eco-style-btn');
    if (styleBtn) {
      styleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDrawer();
      });
    }

    // Drawer close button
    var closeBtn = document.querySelector('.eco-drawer-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    // Drawer backdrop click
    var backdrop = document.querySelector('.eco-drawer-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeDrawer);
    }

    // Theme cards
    document.querySelectorAll('.eco-theme-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var theme = this.getAttribute('data-theme');
        if (theme) setTheme(theme);
      });
    });

    // Update active states
    updateThemeCards(activeTheme);

    // Variant switcher (floating dots — backward compat)
    initVariantSwitcher();

    // Variant drawer (in-drawer picker)
    initVariantDrawer();

    // Escape key closes drawer
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
