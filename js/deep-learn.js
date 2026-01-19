'use strict';

// ============================================
// DEEP LEARN - Interactive Guide
// Extracted from inline script for CSP compliance
// ============================================

// State
let currentView = 'overview';

// ============================================
// VIEW SWITCHING
// ============================================

/**
 * Switch to a different view section
 * @param {string} viewId - The view to switch to
 */
function switchView(viewId) {
  // Update current view
  currentView = viewId;

  // Update tabs
  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewId);
  });

  // Update sidebar nav
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    const isActive = item.dataset.view === viewId;
    item.classList.toggle('active', isActive);
    item.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Update view sections
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.toggle('active', section.id === `view-${viewId}`);
  });

  // Scroll to top of content
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Tab click handlers
  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchView(tab.dataset.view);
    });
  });

  // Sidebar nav click handlers
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.dataset.view);
    });
  });

  // Navigation buttons (level-nav)
  document.querySelectorAll('[data-nav-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.navView);
    });
  });

  // FAQ Accordion
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      item.classList.toggle('open');
    });
  });

  // Glossary Search
  const glossarySearch = document.getElementById('glossary-search');
  if (glossarySearch) {
    glossarySearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.glossary-item').forEach(item => {
        const term = item.querySelector('.glossary-term').textContent.toLowerCase();
        const def = item.querySelector('.glossary-def').textContent.toLowerCase();
        const matches = term.includes(query) || def.includes(query);
        item.style.display = matches ? 'block' : 'none';
      });
    });
  }

  // Mobile Navigation Toggle
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    });
  }
}

// ============================================
// STATS LOADING
// ============================================

async function loadStats() {
  try {
    const response = await fetch('/api/burns/stats');
    if (response.ok) {
      const data = await response.json();
      const sidebarBurned = document.getElementById('sidebar-burned');
      const sidebarCycles = document.getElementById('sidebar-cycles');

      if (sidebarBurned && data.burnPercentage) {
        sidebarBurned.textContent = data.burnPercentage.toFixed(1) + '%';
      }
      if (sidebarCycles && data.totalCycles) {
        sidebarCycles.textContent = data.totalCycles;
      }
    }
  } catch (err) {
    // Silently fail - stats will show defaults
    console.log('Stats API not available');
  }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
  setupEventListeners();
  loadStats();

  // Check URL hash for direct section navigation
  const hash = window.location.hash.slice(1);
  if (hash && document.getElementById(`view-${hash}`)) {
    switchView(hash);
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for potential external use
window.switchView = switchView;
