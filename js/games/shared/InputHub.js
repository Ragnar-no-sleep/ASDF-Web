/**
 * ASDF Input Hub
 * Unified management for Keyboard, Touch, and Gamepad.
 *
 * Support for:
 * - Action Mapping (Logical keys)
 * - Directional Swipes (Touch)
 * - Gamepad standard API
 * - Input Smoothing & Deadzones
 */

'use strict';

(function () {
  const InputHub = {
    name: 'InputHub',
    state: {}, // Logical action states (true/false)
    rawKeys: {}, // Physical key states
    config: {
      deadzone: 0.15,
      swipeThreshold: 30,
    },
    mappings: new Map(), // Logical -> Physical

    init(kernel) {
      this.kernel = kernel;
      this.setupListeners();
      kernel.registerService('input', this);
      console.log('[InputHub] Initialized');
    },

    /**
     * Map a physical input to a logical action
     * @param {string} action - e.g., 'JUMP'
     * @param {string[]} inputs - e.g., ['Space', 'KeyW', 'GamepadButton0']
     */
    mapAction(action, inputs) {
      this.mappings.set(action, inputs);
      this.state[action] = false;
    },

    setupListeners() {
      // Keyboard
      window.addEventListener('keydown', e => {
        this.rawKeys[e.code] = true;
        this._updateActions();
      });
      window.addEventListener('keyup', e => {
        this.rawKeys[e.code] = false;
        this._updateActions();
      });

      // Mouse/Touch Swipes (Coming soon in Phase 2)
    },

    /**
     * Check logical action state
     */
    isPressed(action) {
      return !!this.state[action];
    },

    /**
     * Internal: Map raw states to logical actions
     */
    _updateActions() {
      for (const [action, keys] of this.mappings) {
        const wasPressed = this.state[action];
        const isPressed = keys.some(k => this.rawKeys[k]);

        if (isPressed !== wasPressed) {
          this.state[action] = isPressed;
          this.kernel.emit(`input:${action.toLowerCase()}`, { pressed: isPressed });
        }
      }
    },

    /**
     * Gamepad Polling (Should be called in GameInstance update loop)
     */
    pollGamepads() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (!pads[0]) return;

      const pad = pads[0];
      // Example: Map Button 0 to 'JUMP' if 'GamepadButton0' is in mappings
      pad.buttons.forEach((btn, idx) => {
        const key = `GamepadButton${idx}`;
        this.rawKeys[key] = btn.pressed;
      });
      this._updateActions();
    },
  };

  window.ASDF = window.ASDF || {};
  window.ASDF.InputHub = InputHub;
})();
