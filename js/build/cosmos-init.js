/**
 * Yggdrasil Cosmos Initializer
 * Extracted from inline script for CSP compliance
 */

import { YggdrasilCosmos } from './yggdrasil-unified.js';

document.addEventListener('DOMContentLoaded', () => {
  const cosmos = document.getElementById('yggdrasil-cosmos');
  const svgFallback = document.getElementById('yggdrasil-svg-fallback');

  if (!cosmos) return;

  // Check WebGL support
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) {
    cosmos.classList.add('webgl-fallback');
    if (svgFallback) svgFallback.style.display = 'flex';
    return;
  }

  // Hide SVG fallback
  if (svgFallback) svgFallback.style.display = 'none';

  // Initialize cosmos
  YggdrasilCosmos.init(cosmos).catch(err => {
    console.error('[Cosmos] Init failed:', err);
    cosmos.classList.add('webgl-fallback');
    if (svgFallback) svgFallback.style.display = 'flex';
  });
});
