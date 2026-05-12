/**
 * PumpArena Handler Tracking — Empirical Verification
 *
 * Tests the track() / isConnected purge / cleanup() mechanism
 * that prevents listener leaks on game restart and phase transitions.
 *
 * Does NOT load the full 2800-line engine — isolates the 3-layer contract:
 *   1. track() registers addEventListener + pushes to _handlers
 *   2. showPhase() purges stale refs via isConnected
 *   3. cleanup() removes all remaining listeners
 */

'use strict';

describe('PumpArena handler tracking', () => {
  let state;
  let track;

  beforeEach(() => {
    state = {
      _handlers: [],
      _timeouts: [],
      gameOver: false,
    };

    // Exact replica of the track() helper in pumparena.js L64-67
    track = function (target, event, handler) {
      target.addEventListener(event, handler);
      state._handlers.push({ target, event, handler });
    };
  });

  // ============================================
  // track() — registration contract
  // ============================================

  describe('track()', () => {
    it('calls addEventListener on the target', () => {
      const el = document.createElement('div');
      const spy = jest.spyOn(el, 'addEventListener');
      const handler = jest.fn();

      track(el, 'click', handler);

      expect(spy).toHaveBeenCalledWith('click', handler);
      spy.mockRestore();
    });

    it('pushes handler entry to state._handlers', () => {
      const el = document.createElement('div');
      const handler = jest.fn();

      track(el, 'click', handler);

      expect(state._handlers).toHaveLength(1);
      expect(state._handlers[0]).toEqual({
        target: el,
        event: 'click',
        handler,
      });
    });

    it('accumulates multiple handlers', () => {
      const el = document.createElement('div');
      track(el, 'click', jest.fn());
      track(el, 'mouseenter', jest.fn());
      track(el, 'mouseleave', jest.fn());

      expect(state._handlers).toHaveLength(3);
    });
  });

  // ============================================
  // isConnected purge — mid-session cleanup
  // ============================================

  describe('isConnected purge (showPhase pattern)', () => {
    function purgeDisconnected() {
      // Exact replica of pumparena.js L1891
      state._handlers = state._handlers.filter(h => h.target.isConnected);
    }

    it('keeps handlers on connected DOM nodes', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const btn = document.createElement('button');
      container.appendChild(btn);
      track(btn, 'click', jest.fn());

      purgeDisconnected();

      expect(state._handlers).toHaveLength(1);

      document.body.removeChild(container);
    });

    it('purges handlers on disconnected nodes (innerHTML replacement)', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Phase 1: create buttons, track handlers
      container.innerHTML = '<button class="old">Old</button>';
      const oldBtn = container.querySelector('.old');
      track(oldBtn, 'click', jest.fn());
      track(oldBtn, 'mouseenter', jest.fn());

      expect(state._handlers).toHaveLength(2);
      expect(oldBtn.isConnected).toBe(true);

      // Phase 2: innerHTML replaces old nodes (simulates render*())
      container.innerHTML = '<button class="new">New</button>';

      // Old button is now disconnected
      expect(oldBtn.isConnected).toBe(false);

      // Purge — simulates showPhase() entry
      purgeDisconnected();

      // Stale handlers removed
      expect(state._handlers).toHaveLength(0);

      document.body.removeChild(container);
    });

    it('preserves permanent handlers while purging stale ones', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Permanent handler (refresh button — never re-rendered)
      const permanentBtn = document.createElement('button');
      container.appendChild(permanentBtn);
      track(permanentBtn, 'click', jest.fn());

      // Phase panel with dynamic content
      const panel = document.createElement('div');
      container.appendChild(panel);
      panel.innerHTML = '<button class="phase-btn">Phase</button>';
      const phaseBtn = panel.querySelector('.phase-btn');
      track(phaseBtn, 'click', jest.fn());
      track(phaseBtn, 'mouseenter', jest.fn());

      expect(state._handlers).toHaveLength(3);

      // Simulate phase transition: innerHTML replaces panel content
      panel.innerHTML = '<button class="new-phase">New</button>';

      // permanentBtn still connected, phaseBtn disconnected
      expect(permanentBtn.isConnected).toBe(true);
      expect(phaseBtn.isConnected).toBe(false);

      purgeDisconnected();

      // Only permanent handler survives
      expect(state._handlers).toHaveLength(1);
      expect(state._handlers[0].target).toBe(permanentBtn);

      document.body.removeChild(container);
    });

    it('handles multiple phase transitions without unbounded growth', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Permanent: 1 handler
      const refreshBtn = document.createElement('button');
      container.appendChild(refreshBtn);
      track(refreshBtn, 'click', jest.fn());

      const panel = document.createElement('div');
      container.appendChild(panel);

      // Simulate 10 phase transitions
      for (let i = 0; i < 10; i++) {
        purgeDisconnected(); // showPhase() entry

        panel.innerHTML = `<button class="btn-${i}">Phase ${i}</button>`;
        const btn = panel.querySelector(`[class="btn-${i}"]`);
        track(btn, 'click', jest.fn());
        track(btn, 'mouseenter', jest.fn());
        track(btn, 'mouseleave', jest.fn());
      }

      // Final purge (next showPhase would do this)
      purgeDisconnected();

      // Only permanent (1) + current phase (3) = 4
      // The 9 previous phases' handlers (27) were purged
      expect(state._handlers).toHaveLength(4);

      document.body.removeChild(container);
    });
  });

  // ============================================
  // cleanup() — game-end total removal
  // ============================================

  describe('cleanup() (game-end)', () => {
    function cleanup() {
      // Exact replica of pumparena.js L2863-2874
      state.gameOver = true;
      state._timeouts.forEach(id => clearTimeout(id));
      state._timeouts.length = 0;
      state._handlers.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
      });
      state._handlers.length = 0;
    }

    it('removes all event listeners and empties the array', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const btn = document.createElement('button');
      container.appendChild(btn);

      const clickHandler = jest.fn();
      const enterHandler = jest.fn();
      track(btn, 'click', clickHandler);
      track(btn, 'mouseenter', enterHandler);

      expect(state._handlers).toHaveLength(2);

      // Verify handlers fire before cleanup
      btn.click();
      btn.dispatchEvent(new Event('mouseenter'));
      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(enterHandler).toHaveBeenCalledTimes(1);

      cleanup();

      expect(state._handlers).toHaveLength(0);
      expect(state.gameOver).toBe(true);

      // Verify handlers no longer fire after cleanup
      btn.click();
      btn.dispatchEvent(new Event('mouseenter'));
      expect(clickHandler).toHaveBeenCalledTimes(1);
      expect(enterHandler).toHaveBeenCalledTimes(1);

      document.body.removeChild(container);
    });

    it('handles removeEventListener on disconnected nodes gracefully', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      container.innerHTML = '<button>Temp</button>';
      const btn = container.querySelector('button');
      track(btn, 'click', jest.fn());

      // Destroy the DOM node
      container.innerHTML = '';
      expect(btn.isConnected).toBe(false);

      // cleanup() should not throw on disconnected nodes
      expect(() => cleanup()).not.toThrow();
      expect(state._handlers).toHaveLength(0);

      document.body.removeChild(container);
    });

    it('clears tracked timeouts alongside handlers', () => {
      const timeoutId = setTimeout(() => {}, 10000);
      state._timeouts.push(timeoutId);

      const el = document.createElement('div');
      track(el, 'click', jest.fn());

      cleanup();

      expect(state._timeouts).toHaveLength(0);
      expect(state._handlers).toHaveLength(0);
    });
  });

  // ============================================
  // Full lifecycle: track → transitions → cleanup
  // ============================================

  describe('full lifecycle', () => {
    it('simulates game session: init → phase transitions → restart', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      function purgeDisconnected() {
        state._handlers = state._handlers.filter(h => h.target.isConnected);
      }

      function cleanup() {
        state.gameOver = true;
        state._timeouts.forEach(id => clearTimeout(id));
        state._timeouts.length = 0;
        state._handlers.forEach(({ target, event, handler }) => {
          target.removeEventListener(event, handler);
        });
        state._handlers.length = 0;
      }

      // Init: permanent refresh button
      const refreshBtn = document.createElement('button');
      container.appendChild(refreshBtn);
      const refreshHandler = jest.fn();
      track(refreshBtn, 'click', refreshHandler);

      // Init: 4 type buttons (permanent)
      const typePanel = document.createElement('div');
      container.appendChild(typePanel);
      for (let i = 0; i < 4; i++) {
        const btn = document.createElement('button');
        typePanel.appendChild(btn);
        track(btn, 'click', jest.fn());
        track(btn, 'mouseenter', jest.fn());
        track(btn, 'mouseleave', jest.fn());
      }

      // 13 permanent handlers
      expect(state._handlers).toHaveLength(13);

      // Phase: builder select
      const builderPanel = document.createElement('div');
      container.appendChild(builderPanel);

      purgeDisconnected();
      builderPanel.innerHTML = '<button class="b1">B1</button><button class="b2">B2</button>';
      builderPanel.querySelectorAll('button').forEach(btn => {
        track(btn, 'click', jest.fn());
        track(btn, 'mouseenter', jest.fn());
        track(btn, 'mouseleave', jest.fn());
      });

      // 13 permanent + 6 phase = 19
      expect(state._handlers).toHaveLength(19);

      // Phase transition: scenario
      purgeDisconnected(); // builder buttons still connected (innerHTML not replaced yet)
      builderPanel.innerHTML = '<button class="s1">S1</button>';
      // After innerHTML, old builder buttons are disconnected
      // Next purge will clean them — but for now we just add new ones
      const s1 = builderPanel.querySelector('.s1');
      track(s1, 'click', jest.fn());

      // 13 permanent + 6 stale (old builder) + 1 new = 20
      expect(state._handlers).toHaveLength(20);

      // Next phase transition purges the stale ones
      purgeDisconnected();
      expect(state._handlers).toHaveLength(14); // 13 permanent + 1 current

      // Game restart: cleanup removes everything
      cleanup();
      expect(state._handlers).toHaveLength(0);
      expect(state.gameOver).toBe(true);

      // Refresh button listener was actually removed
      refreshBtn.click();
      expect(refreshHandler).not.toHaveBeenCalled();

      document.body.removeChild(container);
    });
  });
});
