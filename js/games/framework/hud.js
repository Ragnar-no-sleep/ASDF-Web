/**
 * ASDF Game Framework — HUD Factory
 *
 * Declarative HUD configuration -> DOM elements
 * Replaces per-game DOM boilerplate for score, health bars, timers, etc.
 * CSS classes follow [gameid]-* convention
 *
 * @module games/framework/hud
 */

'use strict';

const HudFactory = {
  _elements: new Map(), // id -> HTMLElement
  _container: null,

  /**
   * Create HUD from manifest
   * @param {Object} config - Configuration
   * @param {string} config.gameId - Game ID for CSS prefix
   * @param {string} [config.container] - CSS selector for parent container
   * @param {Array<Object>} config.items - Array of HUD item configs
   * @returns {Object} HUD instance with update/destroy methods
   *
   * Item config:
   * {
   *   id: 'score',
   *   type: 'text' | 'bar' | 'timer' | 'label',
   *   className: 'my-custom-class',
   *   position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
   *   label: 'Score:', // for label type
   *   value: 0,
   *   max: 100, // for bar type
   * }
   */
  create(config = {}) {
    const { gameId = 'game', container, items = [] } = config;

    this._elements.clear();

    const containerEl = container ? document.querySelector(container) : document.body;

    if (!containerEl) {
      console.warn('[HudFactory] Container not found:', container);
      return { update: () => {}, destroy: () => {} };
    }

    // Create HUD container
    const hudContainer = document.createElement('div');
    hudContainer.className = `${gameId}-hud-container`;
    hudContainer.style.position = 'absolute';
    hudContainer.style.top = '0';
    hudContainer.style.left = '0';
    hudContainer.style.width = '100%';
    hudContainer.style.height = '100%';
    hudContainer.style.pointerEvents = 'none';

    containerEl.appendChild(hudContainer);
    this._container = hudContainer;

    // Create items
    for (const item of items) {
      this._createItem(gameId, hudContainer, item);
    }

    return {
      update: (id, value) => this.update(id, value),
      destroy: () => this.destroy(),
      get: id => this._elements.get(id),
    };
  },

  /**
   * Create a single HUD item
   * @private
   */
  _createItem(gameId, container, config = {}) {
    const {
      id,
      type = 'text',
      className,
      position = 'top-left',
      label,
      value = 0,
      max = 100,
    } = config;

    if (!id) return;

    const el = document.createElement('div');
    el.id = `${gameId}-${id}`;
    el.className = `${gameId}-hud-${type} ${className || ''}`;
    el.setAttribute('data-hud-id', id);
    el.setAttribute('data-hud-type', type);

    // Position classes
    el.classList.add(`hud-${position}`);

    switch (type) {
      case 'text':
        el.textContent = String(value);
        break;

      case 'label':
        el.textContent = label || id;
        break;

      case 'bar':
        el.innerHTML = `<div class="${gameId}-bar-bg"><div class="${gameId}-bar-fill" style="width: ${(value / max) * 100}%"></div></div>`;
        el.dataset.maxValue = max;
        break;

      case 'timer':
        el.textContent = this._formatTime(value);
        break;
    }

    container.appendChild(el);
    this._elements.set(id, el);
  },

  /**
   * Update a HUD element value
   * @param {string} id - Element ID
   * @param {number} value - New value
   */
  update(id, value) {
    const el = this._elements.get(id);
    if (!el) return;

    const type = el.getAttribute('data-hud-type');

    switch (type) {
      case 'text':
      case 'label':
        el.textContent = String(value);
        break;

      case 'bar':
        const max = parseFloat(el.dataset.maxValue) || 100;
        const fill = el.querySelector('[class*="-bar-fill"]');
        if (fill) {
          fill.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
        }
        break;

      case 'timer':
        el.textContent = this._formatTime(value);
        break;
    }
  },

  /**
   * Format seconds to MM:SS
   * @private
   */
  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  /**
   * Destroy all HUD elements
   */
  destroy() {
    if (this._container) {
      this._container.remove();
      this._container = null;
    }
    this._elements.clear();
  },

  /**
   * Get element by ID
   * @param {string} id - Element ID
   * @returns {HTMLElement|null}
   */
  get(id) {
    return this._elements.get(id) || null;
  },

  /**
   * Show/hide HUD
   * @param {boolean} visible - Show or hide
   */
  setVisible(visible) {
    if (this._container) {
      this._container.style.display = visible ? 'block' : 'none';
    }
  },
};

// Export for module systems
if (typeof window !== 'undefined') {
  window.HudFactory = HudFactory;
}
