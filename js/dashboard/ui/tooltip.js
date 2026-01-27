/**
 * Yggdrasil Builder's Cosmos - Tooltip
 * Fire & Ice themed tooltips for island hover
 */

'use strict';

/**
 * Tooltip manager
 */
export const Tooltip = {
  element: null,
  visible: false,

  /**
   * Initialize
   */
  init() {
    this.createElement();
    return this;
  },

  /**
   * Create tooltip element
   */
  createElement() {
    this.element = document.createElement('div');
    this.element.className = 'cosmos-tooltip';
    this.element.innerHTML = `
      <div class="tooltip-track"></div>
      <div class="tooltip-header">
        <span class="tooltip-name"></span>
        <span class="tooltip-status"></span>
      </div>
      <div class="tooltip-description"></div>
      <div class="tooltip-footer">
        <span class="tooltip-kscore"></span>
      </div>
    `;

    Object.assign(this.element.style, {
      position: 'fixed',
      zIndex: '1000',
      background: 'linear-gradient(135deg, rgba(10, 15, 30, 0.95), rgba(20, 25, 40, 0.95))',
      border: '1px solid rgba(255, 100, 50, 0.3)',
      borderRadius: '12px',
      padding: '0',
      minWidth: '200px',
      maxWidth: '280px',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'translateY(10px) scale(0.95)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#e0e0e0',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 100, 50, 0.1)',
      overflow: 'hidden',
    });

    document.body.appendChild(this.element);
    this.styleElements();
  },

  /**
   * Style inner elements
   */
  styleElements() {
    const track = this.element.querySelector('.tooltip-track');
    Object.assign(track.style, {
      height: '3px',
      background: 'linear-gradient(90deg, #ff4444, #ff6644)',
      marginBottom: '0',
    });

    const header = this.element.querySelector('.tooltip-header');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px 8px',
      gap: '12px',
    });

    const name = this.element.querySelector('.tooltip-name');
    Object.assign(name.style, {
      fontSize: '15px',
      fontWeight: '600',
      color: '#ffffff',
    });

    const status = this.element.querySelector('.tooltip-status');
    Object.assign(status.style, {
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      padding: '3px 8px',
      borderRadius: '10px',
      background: 'rgba(0, 255, 136, 0.2)',
      color: '#00ff88',
    });

    const description = this.element.querySelector('.tooltip-description');
    Object.assign(description.style, {
      padding: '0 16px 12px',
      fontSize: '12px',
      color: '#999',
      lineHeight: '1.4',
    });

    const footer = this.element.querySelector('.tooltip-footer');
    Object.assign(footer.style, {
      padding: '8px 16px',
      background: 'rgba(0, 0, 0, 0.2)',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    });

    const kscore = this.element.querySelector('.tooltip-kscore');
    Object.assign(kscore.style, {
      fontSize: '12px',
      color: '#00d9ff',
    });
  },

  /**
   * Show tooltip
   */
  show(data, x, y) {
    if (!data) {
      this.hide();
      return;
    }

    // Track color
    const track = this.element.querySelector('.tooltip-track');
    const trackColors = {
      dev: 'linear-gradient(90deg, #ff4444, #ff6644)',
      games: 'linear-gradient(90deg, #9944ff, #bb66ff)',
      content: 'linear-gradient(90deg, #00d9ff, #00ffaa)',
    };
    track.style.background = trackColors[data.track?.toLowerCase()] || trackColors.dev;

    // Name
    const name = this.element.querySelector('.tooltip-name');
    name.textContent = data.name || 'Unknown';

    // Status
    const status = this.element.querySelector('.tooltip-status');
    if (data.status === 'live') {
      status.textContent = '● LIVE';
      status.style.background = 'rgba(0, 255, 136, 0.2)';
      status.style.color = '#00ff88';
    } else if (data.status === 'building') {
      status.textContent = '◐ BUILDING';
      status.style.background = 'rgba(255, 170, 0, 0.2)';
      status.style.color = '#ffaa00';
    } else {
      status.textContent = data.status || '';
      status.style.background = 'rgba(255, 255, 255, 0.1)';
      status.style.color = '#888';
    }

    // Description
    const description = this.element.querySelector('.tooltip-description');
    description.textContent = data.description || '';

    // K-Score
    const kscore = this.element.querySelector('.tooltip-kscore');
    if (data.kScore !== undefined) {
      kscore.textContent = `K-Score: ${data.kScore}`;
      kscore.style.display = 'block';
    } else {
      kscore.style.display = 'none';
    }

    // Position
    this.position(x, y);

    // Show
    this.element.style.opacity = '1';
    this.element.style.transform = 'translateY(0) scale(1)';
    this.visible = true;
  },

  /**
   * Position tooltip
   */
  position(x, y) {
    const padding = 15;
    const rect = this.element.getBoundingClientRect();

    let left = x + padding;
    let top = y + padding;

    if (left + rect.width > window.innerWidth - padding) {
      left = x - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = y - rect.height - padding;
    }

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  },

  /**
   * Hide tooltip
   */
  hide() {
    this.element.style.opacity = '0';
    this.element.style.transform = 'translateY(10px) scale(0.95)';
    this.visible = false;
  },

  /**
   * Update position
   */
  updatePosition(x, y) {
    if (this.visible) {
      this.position(x, y);
    }
  },

  /**
   * Dispose
   */
  dispose() {
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  },
};

export default Tooltip;
