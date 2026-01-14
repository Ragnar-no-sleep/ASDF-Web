/**
 * ASDF Hub - Organic Chaos Edition
 * Philosophy: Controlled chaos. Natural feel. Consumer-grade polish.
 */

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
      if (!isExpanded) {
        tools.classList.add('expanded');
        trigger.setAttribute('aria-expanded', 'true');
        isExpanded = true;
      }
    };

    const collapse = () => {
      closeTimeout = setTimeout(() => {
        tools.classList.remove('expanded');
        trigger.setAttribute('aria-expanded', 'false');
        isExpanded = false;
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
      if (isExpanded) {
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

  // --- Init ---
  const init = () => {
    checkReducedMotion();
    initParallax();
    initNodeGlow();
    initTools();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
