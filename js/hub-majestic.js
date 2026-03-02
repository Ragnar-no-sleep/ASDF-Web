/**
 * ASDF Hub - Organic Chaos Edition
 * Philosophy: Controlled chaos. Natural feel. Consumer-grade polish.
 */

import { initInteractions } from './utils/interactions.js';

(() => {
  'use strict';

  // --- Throttle for 60fps ---
  const throttle = (fn, ms = 16) => {
    let last = 0;
    return (...args) => {
      const now = performance.now();
      if (now - last >= ms) {
        last = now;
        fn(...args);
      }
    };
  };

  // --- Subtle parallax on background ---
  const initParallax = () => {
    const bg = document.querySelector('.hub-bg');
    if (!bg) return;

    const handleMove = throttle(e => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      bg.style.transform = `translate(${x}px, ${y}px)`;
    });

    document.addEventListener('mousemove', handleMove, { passive: true });
  };

  // --- Glow follow on nodes ---
  const initNodeGlow = () => {
    document.querySelectorAll('.hub-node:not(.hub-node--disabled)').forEach(node => {
      let rect = null;

      node.addEventListener('mouseenter', () => {
        rect = node.getBoundingClientRect();
      });

      node.addEventListener(
        'mousemove',
        throttle(e => {
          if (!rect) rect = node.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          node.style.setProperty('--glow-x', `${x}%`);
          node.style.setProperty('--glow-y', `${y}%`);
        }),
        { passive: true }
      );

      node.addEventListener('mouseleave', () => {
        rect = null;
        node.style.removeProperty('--glow-x');
        node.style.removeProperty('--glow-y');
      });
    });
  };

  // --- Tools interactive expansion ---
  const initTools = () => {
    const tools = document.getElementById('hubTools');
    const trigger = document.getElementById('toolsTrigger');
    if (!tools || !trigger) return;

    let isExpanded = false;
    let closeTimeout = null;

    const expand = () => {
      clearTimeout(closeTimeout);
      if (!isExpanded && tools && trigger) {
        tools.classList.add('expanded');
        trigger.setAttribute('aria-expanded', 'true');
        isExpanded = true;
      }
    };

    const collapse = () => {
      closeTimeout = setTimeout(() => {
        if (tools && trigger) {
          tools.classList.remove('expanded');
          trigger.setAttribute('aria-expanded', 'false');
          isExpanded = false;
        }
      }, 300);
    };

    // Expand on hover
    trigger.addEventListener('mouseenter', expand);
    tools.addEventListener('mouseenter', expand);

    // Collapse when leaving the tools area
    tools.addEventListener('mouseleave', collapse);

    // Also support click toggle for touch devices
    trigger.addEventListener('click', e => {
      e.preventDefault();
      if (isExpanded && tools && trigger) {
        clearTimeout(closeTimeout);
        tools.classList.remove('expanded');
        trigger.setAttribute('aria-expanded', 'false');
        isExpanded = false;
      } else {
        expand();
      }
    });
  };

  // --- Respect reduced motion ---
  const checkReducedMotion = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.style.setProperty('--ease', 'linear');
    }
  };

  // --- Fullscreen prompt (2 attempts max) ---
  const initFullscreenPrompt = async () => {
    const STORAGE_KEY = 'asdf_fullscreen_prompted';
    const MAX_ATTEMPTS = 2;

    const attempts = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    if (attempts >= MAX_ATTEMPTS) return; // Stop after 2 refusals

    // Wait for first user interaction (required by browsers)
    const waitForInteraction = () =>
      new Promise(resolve => {
        const handler = () => {
          document.removeEventListener('click', handler);
          document.removeEventListener('keydown', handler);
          resolve();
        };
        document.addEventListener('click', handler, { once: true });
        document.addEventListener('keydown', handler, { once: true });
      });

    await waitForInteraction();

    try {
      await document.documentElement.requestFullscreen();
      // Success - reset attempts
      localStorage.removeItem(STORAGE_KEY);
    } catch (_err) {
      // User refused or browser blocked
      const newAttempts = attempts + 1;
      localStorage.setItem(STORAGE_KEY, newAttempts.toString());

      if (newAttempts === 1) {
        // Show F11 hint after first refusal
        showF11Hint();
      }
      // After 2nd refusal, never ask again
    }
  };

  // --- F11 hint toast ---
  const showF11Hint = () => {
    const hint = document.createElement('div');
    hint.id = 'f11Hint';
    hint.className = 'f11-hint';
    hint.innerHTML = `
      <div class="f11-hint-text">
        <span class="f11-hint-title">Chill! This is fine.</span>
        <span class="f11-hint-subtitle">Press F11 for full immersion</span>
      </div>
      <button class="f11-hint-retry" id="f11Retry">Try again</button>
      <button class="f11-hint-close" id="f11Close" aria-label="Close">×</button>
    `;
    document.body.appendChild(hint);

    // Retry button
    document.getElementById('f11Retry').addEventListener('click', async () => {
      hint.remove();
      try {
        await document.documentElement.requestFullscreen();
        localStorage.removeItem('asdf_fullscreen_prompted');
      } catch (_err) {
        localStorage.setItem('asdf_fullscreen_prompted', '2'); // Max reached
      }
    });

    // Close button
    document.getElementById('f11Close').addEventListener('click', () => {
      hint.remove();
    });

    // Auto-dismiss after 8s (Fibonacci F6)
    setTimeout(() => hint.remove(), 8000);
  };

  // --- Easter Egg tracker (7 clics → unlock /terrier) ---
  const initEasterEgg = () => {
    const STORAGE_KEY = 'asdf_easter_clicks';
    const UNLOCK_KEY = 'asdf_terrier_unlocked';
    const TARGET_IDS = ['build', 'play', 'burns', 'forecast', 'holdex', 'staking', 'ignition'];
    const GLOW_PROGRESSION = [3, 5, 8, 13, 21, 34, 55]; // Fibonacci

    // Load progress
    const clicked = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    const unlocked = localStorage.getItem(UNLOCK_KEY) === 'true';

    if (unlocked) {
      showTerrierEntry();
      return;
    }

    // Apply existing glow to already-clicked items
    clicked.forEach(id => {
      const item = document.querySelector(`[data-orbit-id="${id}"]`);
      if (item) {
        item.dataset.easterClicked = 'true';
        item.style.setProperty('--easter-glow', `${GLOW_PROGRESSION[clicked.size - 1]}px`);
      }
    });

    // Listen to clicks on easter-egg items
    document.querySelectorAll('[data-easter-egg="true"]').forEach(item => {
      item.addEventListener('click', e => {
        const id = item.dataset.orbitId;
        if (!TARGET_IDS.includes(id)) return;
        if (clicked.has(id)) return; // Already clicked

        // Track click
        clicked.add(id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...clicked]));

        // Visual feedback (glow Fibonacci progression)
        const step = clicked.size;
        const glowSize = GLOW_PROGRESSION[step - 1];
        item.dataset.easterClicked = 'true';
        item.style.setProperty('--easter-glow', `${glowSize}px`);

        // Check unlock condition
        if (clicked.size === 7) {
          e.preventDefault(); // Don't navigate yet
          unlockTerrier();
        }
      });
    });
  };

  const unlockTerrier = () => {
    localStorage.setItem('asdf_terrier_unlocked', 'true');

    // Animation unlock (explosion 34px → collapse)
    const center = document.getElementById('orbitCenter');
    if (center) {
      center.classList.add('terrier-unlocked');

      setTimeout(() => {
        showTerrierEntry();
      }, 2000); // 2s for animation
    }
  };

  const showTerrierEntry = () => {
    // Add clickable portal to center
    const center = document.getElementById('orbitCenter');
    if (!center || center.querySelector('.terrier-portal')) return; // Already added

    const portal = document.createElement('a');
    portal.href = '/terrier';
    portal.className = 'terrier-portal';
    portal.innerHTML = '<span aria-hidden="true">🐕</span><span>Enter the Burrow</span>';
    center.appendChild(portal);
  };

  // --- View toggle: orbital ↔ grid ---
  const initViewToggle = () => {
    const KEY = 'asdf-hub-view';
    const toggle = document.getElementById('hubViewToggle');
    const icon = document.getElementById('hubToggleIcon');
    const label = document.getElementById('hubToggleLabel');
    const orbital = document.getElementById('main-hub');
    const grid = document.getElementById('hubGridView');

    const setView = view => {
      if (view === 'grid') {
        orbital.setAttribute('data-view', 'grid');
        grid.classList.add('is-active');
        icon.innerHTML = '&#9673;';
        label.textContent = 'Orbital View';
      } else {
        orbital.removeAttribute('data-view');
        grid.classList.remove('is-active');
        icon.innerHTML = '&#9638;';
        label.textContent = 'Grid View';
      }
      try {
        localStorage.setItem(KEY, view);
      } catch (_e) {
        /* private browsing */
      }
    };

    try {
      if (localStorage.getItem(KEY) === 'grid') setView('grid');
    } catch (_e) {
      /* private browsing */
    }

    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = grid.classList.contains('is-active') ? 'grid' : 'orbital';
        setView(current === 'grid' ? 'orbital' : 'grid');
      });
    }
  };

  // --- Init ---
  const init = () => {
    checkReducedMotion();
    initParallax();
    initNodeGlow();
    initTools();
    initViewToggle();
    initFullscreenPrompt();
    initEasterEgg();

    // Achievement init (deferred scripts loaded before DOMContentLoaded)
    if (window.AchievementToast) window.AchievementToast.init();
    if (window.AchievementEngine) window.AchievementEngine.autoArrival();

    // Init micro-interactions system
    initInteractions({
      ripples: true,
      haptics: true,
      hoverScale: true,
      parallax: false, // Using custom parallax above
      glowHover: true,
      ripplesSelector: '.hub-orbit-item, button, .terrier-portal',
      hapticsSelector: '.hub-orbit-item, button',
      hoverScaleSelector: '.hub-orbit-item, .terrier-portal',
      glowHoverSelector: '.hub-orbit-item',
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
