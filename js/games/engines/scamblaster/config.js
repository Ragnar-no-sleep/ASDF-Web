/**
 * ASDF Games - ScamBlaster Configuration
 */

'use strict';

(function () {
  const ScamBlasterConfig = {
    spawnIntervalBase: 58,
    spawnIntervalFloor: 18,
    baseMaxThreats: 14,
    laneCount: 8,
    lanePadding: 0.04,
    minThreatRadius: 30,
    popBaseLife: 88,
    popLifeLossPerWave: 2.1,
    baseSpeedScale: 0.038,
    iconFont: 'Orbitron, sans-serif',
    countdownSeconds: 3,
    waveScale: 6.5,
    popScoreScale: 1.18,
    gridCell: 62,
    entityPulseSpeed: 0.0025,
  };

  const SCAM_LABELS = ['SCAM', 'RUG', 'BOT', 'FAKE', 'PHISH', 'DRIFT'];

  const THREAT_THEMES = [
    {
      primary: '#f43f5e',
      secondary: '#3b120b',
      glow: '#fff2b3',
      accent: '#ffcc00',
      level: 'critical',
      shape: 'hex',
      pulse: 1.2,
    },
    {
      primary: '#ff6b35',
      secondary: '#3b120b',
      glow: '#fff2b3',
      accent: '#ffcc00',
      level: 'elevated',
      shape: 'shield',
      pulse: 1.1,
    },
    {
      primary: '#ff2d95',
      secondary: '#2a0718',
      glow: '#fff2b3',
      accent: '#ff6b35',
      level: 'high',
      shape: 'diamond',
      pulse: 1.08,
    },
    {
      primary: '#f97316',
      secondary: '#311006',
      glow: '#fff2b3',
      accent: '#ffcc00',
      level: 'low',
      shape: 'plate',
      pulse: 1.05,
    },
    {
      primary: '#fff2b3',
      secondary: '#3b120b',
      glow: '#ffcc00',
      accent: '#ff6b35',
      level: 'low',
      shape: 'plate',
      pulse: 1.06,
    },
    {
      primary: '#f43f5e',
      secondary: '#9f1239',
      glow: '#fda4af',
      accent: '#fb7185',
      level: 'critical',
      shape: 'hex',
      pulse: 1.18,
    },
  ];

  window.ASDF = window.ASDF || {};
  window.ASDF.ScamBlasterConfig = ScamBlasterConfig;
  window.ASDF.ScamBlasterLabels = SCAM_LABELS;
  window.ASDF.ScamBlasterThemes = THREAT_THEMES;
})();
