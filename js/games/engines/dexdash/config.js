/**
 * ASDF Games - DexDash Configuration
 */

'use strict';

(function () {
  const DexDashConfig = {
    lanes: 4,
    roadWidthRatio: 0.78,
    roadMinWidth: 420,
    roadMaxWidth: 1700,
    playerYRatio: 0.84,
    playerWidth: 72,
    playerHeight: 96,
    obstacleWidth: 64,
    obstacleHeight: 76,
    trackLookaheadPadding: 108,
    roadCeilingHeight: 0.014,
    boostSize: 44,
    anticipationScaleBySpeed: 0.015,
    horizonDistance: 0.008,

    speedStart: 3.8,
    speedCap: 19.6,
    acceleration: 0.02,
    worldSpeedBase: 2.18,
    worldSpeedScale: 0.82,

    spawnBaseMs: 62,
    spawnMinMs: 16,
    spawnSlope: 1.9,
    spawnLeadHeightScale: 3.35,
    trackSpanReserve: 2.45,
    boostChanceBase: 0.15,
    boostChanceGrowth: 0.005,
    boostChanceMax: 0.32,

    laneColor: '#e2e8f0',
    laneDashLength: 40,
    roadFade: 0.2,
    horizonYRatio: 0.006,
    roadNarrowRatio: 0.16,
    nearRoadBoost: 1.02,
    perspectivePower: 0.9,
    spawnLeadScale: 2.2,
    worldStretch: 1.12,

    distancePerLevel: 300,
    collisionPenalty: 80,
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.DexDashConfig = DexDashConfig;
})();
