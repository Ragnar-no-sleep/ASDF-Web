/**
 * The Burrow - K-Score Easter Egg
 * Hover D, O, L → reveal formula
 */

(() => {
  'use strict';

  const triggers = document.querySelectorAll('.k-trigger');
  const overlay = document.getElementById('kFormulaOverlay');
  const hovered = new Set();

  triggers.forEach(trigger => {
    trigger.addEventListener('mouseenter', () => {
      const k = trigger.dataset.k;
      hovered.add(k);
      trigger.classList.add('k-active'); // Show ∛ symbol

      // Check if all 3 triggered
      if (hovered.size === 3 && overlay) {
        overlay.classList.remove('hidden');
        localStorage.setItem('asdf_k_formula_found', 'true');
      }
    });
  });

  // Click overlay to close
  if (overlay) {
    overlay.addEventListener('click', () => {
      overlay.classList.add('hidden');
    });
  }

  // Check if already found (show immediately)
  if (localStorage.getItem('asdf_k_formula_found') === 'true' && overlay) {
    // Mark all triggers as active
    triggers.forEach(t => t.classList.add('k-active'));
  }
})();
