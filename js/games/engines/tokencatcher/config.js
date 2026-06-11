/**
 * ASDF Games - TokenCatcher Configuration
 */

'use strict';

(function () {
  const TokenCatcherConfig = {
    laneHeight: 50,
    bottomMargin: 40,
    spawnIntervalBase: 65,
    spawnIntervalFloor: 22,
    difficultyRamp: 0.08,
    droneSpeed: 12,
    maxPowerUps: 4,
    powerUpDuration: 420,
    scamPenalty: 50,
    goodBonus: 10,
    enemyPoints: 25,
    initialTime: 34,
    jumpStrength: 8,
  };

  const POWER_UPS = [
    { type: 'SHIELD', icon: '🛡️', duration: 480 },
    { type: 'BOOST', icon: '⚡', duration: 320 },
    { type: 'MAGNET', icon: '🧲', duration: 420 },
    { type: 'FIRE', icon: '🔥', duration: 360 },
  ];

  window.ASDF = window.ASDF || {};
  window.ASDF.TokenCatcherConfig = TokenCatcherConfig;
  window.ASDF.TokenCatcherPowerUps = POWER_UPS;
})();
