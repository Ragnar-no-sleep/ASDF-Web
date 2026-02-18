/**
 * ASDF Hub Cosmos
 *
 * Listens to AchievementEngine events — applies data-stage to .hub.
 * CSS in orbital-patch.css reacts: outer ring + satellites appear progressively.
 *
 * Stages (Hero's Journey):
 *   void          — default, outer ring invisible
 *   newcomer      — LEARNED: ring faint, Learn star visible
 *   curious       — VERIFIED: ring visible, 2 stars
 *   believer      — BELIEVER: ring glowing, 3 stars
 *   builder       — BUILDER: full ring, all stars
 *   transcendence — THE_UNNAMEABLE: ring pulsing gold, stars bright
 */

(function () {
  'use strict';

  function applyStage(stage) {
    var hub = document.querySelector('.hub');
    if (!hub) return;
    hub.dataset.stage = stage || 'void';
  }

  function syncFromEngine() {
    if (!window.AchievementEngine) return;
    var progress = AchievementEngine.getProgress();
    applyStage(progress.stage);
  }

  function init() {
    // Restore persisted achievement state on load
    syncFromEngine();

    // React to future unlocks in this session
    document.addEventListener('asdf:achievement-unlocked', function (e) {
      applyStage(e.detail.progress.stage);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
