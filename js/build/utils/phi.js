/**
 * Build V2 - Phi (Golden Ratio) Utilities
 * Mathematical helpers for harmonious positioning and scaling
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// CONSTANTS
// ============================================

/**
 * The Golden Ratio (φ)
 */
export const PHI = 1.618033988749895;

/**
 * Inverse Golden Ratio (1/φ)
 */
export const PHI_INVERSE = 0.618033988749895;

/**
 * Golden Angle in radians (2π/φ²)
 * Used for optimal distribution of points
 */
export const GOLDEN_ANGLE = 2.399963229728653; // ~137.5°

// ============================================
// POSITIONING FUNCTIONS
// ============================================

/**
 * Calculate positions in a phi spiral pattern
 * Perfect for distributing skills around a center point
 *
 * @param {Array} items - Array of items to position
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} baseRadius - Starting radius from center
 * @param {number} radiusStep - Radius increase per item
 * @returns {Array} Array of {x, y, item, angle, radius}
 */
export function calculatePhiPositions(items, centerX, centerY, baseRadius = 40, radiusStep = 8) {
  return items.map((item, index) => {
    const angle = index * GOLDEN_ANGLE;
    const radius = baseRadius + (index * radiusStep);

    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      item,
      angle,
      radius,
      index
    };
  });
}

/**
 * Calculate positions in a Fermat spiral (sunflower pattern)
 * More compact distribution for many items
 *
 * @param {Array} items - Array of items to position
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} scale - Scale factor for spiral
 * @returns {Array} Array of {x, y, item, angle, radius}
 */
export function calculateFermatSpiral(items, centerX, centerY, scale = 10) {
  return items.map((item, index) => {
    const n = index + 1; // Start from 1 to avoid center collision
    const angle = n * GOLDEN_ANGLE;
    const radius = scale * Math.sqrt(n);

    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      item,
      angle,
      radius,
      index
    };
  });
}

/**
 * Calculate orbital positions around a center
 * Items distributed at golden angle intervals on concentric rings
 *
 * @param {Array} items - Array of items to position
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} innerRadius - Inner ring radius
 * @param {number} outerRadius - Outer ring radius
 * @returns {Array} Array of {x, y, item, ring, angle}
 */
export function calculateOrbitalPositions(items, centerX, centerY, innerRadius = 60, outerRadius = 120) {
  const count = items.length;
  const rings = Math.ceil(Math.sqrt(count / PHI));
  const radiusStep = (outerRadius - innerRadius) / Math.max(1, rings - 1);

  const positions = [];
  let itemIndex = 0;

  for (let ring = 0; ring < rings && itemIndex < count; ring++) {
    const radius = innerRadius + (ring * radiusStep);
    const itemsInRing = Math.ceil(count / rings);

    for (let i = 0; i < itemsInRing && itemIndex < count; i++) {
      const angle = (i * GOLDEN_ANGLE) + (ring * Math.PI / 6); // Offset each ring

      positions.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        item: items[itemIndex],
        ring,
        angle,
        radius,
        index: itemIndex
      });

      itemIndex++;
    }
  }

  return positions;
}

// ============================================
// SCALING FUNCTIONS
// ============================================

/**
 * Generate a phi-based scale sequence
 * Each value is φ times the previous
 *
 * @param {number} base - Starting value
 * @param {number} count - Number of values to generate
 * @param {boolean} descending - If true, divide instead of multiply
 * @returns {Array<number>} Scale sequence
 */
export function phiScale(base, count, descending = false) {
  const scale = [base];
  const factor = descending ? PHI_INVERSE : PHI;

  for (let i = 1; i < count; i++) {
    scale.push(scale[i - 1] * factor);
  }

  return scale;
}

/**
 * Calculate phi-based spacing between elements
 *
 * @param {number} totalSpace - Total available space
 * @param {number} count - Number of elements
 * @returns {Object} { primary, secondary } spacing values
 */
export function phiSpacing(totalSpace, count) {
  const unit = totalSpace / (count + (count - 1) * PHI_INVERSE);

  return {
    primary: unit,
    secondary: unit * PHI_INVERSE
  };
}

// ============================================
// ANIMATION TIMING
// ============================================

/**
 * Generate phi-based animation delays
 * Creates natural-feeling staggered animations
 *
 * @param {number} count - Number of elements
 * @param {number} baseDuration - Base duration in ms
 * @returns {Array<number>} Array of delay values
 */
export function phiDelays(count, baseDuration = 100) {
  const delays = [];
  let cumulative = 0;

  for (let i = 0; i < count; i++) {
    delays.push(cumulative);
    cumulative += baseDuration * Math.pow(PHI_INVERSE, i * 0.5);
  }

  return delays;
}

/**
 * Phi-based easing function
 * Smooth deceleration curve
 *
 * @param {number} t - Progress (0 to 1)
 * @returns {number} Eased value
 */
export function phiEase(t) {
  return 1 - Math.pow(1 - t, PHI);
}

/**
 * Inverse phi easing (acceleration)
 *
 * @param {number} t - Progress (0 to 1)
 * @returns {number} Eased value
 */
export function phiEaseIn(t) {
  return Math.pow(t, PHI);
}

/**
 * Phi ease in-out
 *
 * @param {number} t - Progress (0 to 1)
 * @returns {number} Eased value
 */
export function phiEaseInOut(t) {
  return t < 0.5
    ? Math.pow(2 * t, PHI) / 2
    : 1 - Math.pow(2 * (1 - t), PHI) / 2;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Round to nearest phi-friendly value
 *
 * @param {number} value - Value to round
 * @param {number} base - Base unit
 * @returns {number} Rounded value
 */
export function phiRound(value, base = 1) {
  const phiMultiples = [1, PHI_INVERSE, PHI, PHI * PHI];
  const normalized = value / base;

  let closest = phiMultiples[0];
  let minDiff = Math.abs(normalized - closest);

  for (const multiple of phiMultiples) {
    const diff = Math.abs(normalized - multiple);
    if (diff < minDiff) {
      minDiff = diff;
      closest = multiple;
    }
  }

  return closest * base;
}

/**
 * Check if a ratio is close to phi
 *
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} tolerance - Acceptable deviation (default 0.05)
 * @returns {boolean}
 */
export function isPhiRatio(a, b, tolerance = 0.05) {
  const ratio = Math.max(a, b) / Math.min(a, b);
  return Math.abs(ratio - PHI) < tolerance;
}

// ============================================
// EXPORTS OBJECT
// ============================================

const PhiUtils = {
  PHI,
  PHI_INVERSE,
  GOLDEN_ANGLE,
  calculatePhiPositions,
  calculateFermatSpiral,
  calculateOrbitalPositions,
  phiScale,
  phiSpacing,
  phiDelays,
  phiEase,
  phiEaseIn,
  phiEaseInOut,
  phiRound,
  isPhiRatio
};

export { PhiUtils };
export default PhiUtils;

// Global export for browser
if (typeof window !== 'undefined') {
  window.PhiUtils = PhiUtils;
}
