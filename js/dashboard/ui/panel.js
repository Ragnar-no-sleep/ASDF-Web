/**
 * Yggdrasil Builder's Cosmos - Side Panel
 * Project details with Fire & Ice theme
 */

'use strict';

/**
 * Side panel for project details
 */
export const Panel = {
  element: null,
  isOpen: false,
  currentProject: null,

  /**
   * Initialize
   */
  init(container) {
    this.createElement(container);
    return this;
  },

  /**
   * Create panel element
   */
  createElement(container) {
    this.element = document.createElement('div');
    this.element.className = 'cosmos-panel';
    this.element.innerHTML = `
      <button class="panel-close">&times;</button>
      <div class="panel-track-indicator"></div>
      <div class="panel-header">
        <div class="panel-icon"></div>
        <div class="panel-title-group">
          <h2 class="panel-title"></h2>
          <span class="panel-track"></span>
        </div>
      </div>
      <div class="panel-status-bar">
        <span class="panel-status"></span>
        <span class="panel-kscore"></span>
      </div>
      <div class="panel-description"></div>
      <div class="panel-content">
        <div class="panel-section panel-actions">
          <h3>Actions</h3>
          <div class="panel-buttons"></div>
        </div>
      </div>
    `;

    Object.assign(this.element.style, {
      position: 'absolute',
      top: '0',
      right: '0',
      width: '340px',
      height: '100%',
      background: 'linear-gradient(180deg, rgba(10, 15, 30, 0.98), rgba(5, 10, 20, 0.98))',
      borderLeft: '1px solid rgba(255, 100, 50, 0.2)',
      transform: 'translateX(100%)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: '100',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#e0e0e0',
      overflow: 'hidden',
      boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
    });

    container.appendChild(this.element);
    this.styleElements();
    this.setupEvents();
  },

  /**
   * Style elements
   */
  styleElements() {
    const close = this.element.querySelector('.panel-close');
    Object.assign(close.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '36px',
      height: '36px',
      background: 'rgba(255, 255, 255, 0.1)',
      border: 'none',
      borderRadius: '50%',
      color: '#888',
      fontSize: '24px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10',
    });

    const trackIndicator = this.element.querySelector('.panel-track-indicator');
    Object.assign(trackIndicator.style, {
      height: '4px',
      background: 'linear-gradient(90deg, #ff4444, #ff6644)',
    });

    const header = this.element.querySelector('.panel-header');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '24px 20px 16px',
    });

    const icon = this.element.querySelector('.panel-icon');
    Object.assign(icon.style, {
      width: '56px',
      height: '56px',
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #ff4444, #ff6644)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      flexShrink: '0',
      boxShadow: '0 4px 20px rgba(255, 68, 68, 0.3)',
    });

    const titleGroup = this.element.querySelector('.panel-title-group');
    Object.assign(titleGroup.style, {
      flex: '1',
      minWidth: '0',
    });

    const title = this.element.querySelector('.panel-title');
    Object.assign(title.style, {
      margin: '0 0 4px',
      fontSize: '20px',
      fontWeight: '700',
      color: '#fff',
      lineHeight: '1.2',
    });

    const track = this.element.querySelector('.panel-track');
    Object.assign(track.style, {
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      color: '#ff6644',
    });

    const statusBar = this.element.querySelector('.panel-status-bar');
    Object.assign(statusBar.style, {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 20px',
      background: 'rgba(0, 0, 0, 0.2)',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    });

    const status = this.element.querySelector('.panel-status');
    Object.assign(status.style, {
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    });

    const kscore = this.element.querySelector('.panel-kscore');
    Object.assign(kscore.style, {
      fontSize: '12px',
      color: '#00d9ff',
      fontWeight: '600',
    });

    const description = this.element.querySelector('.panel-description');
    Object.assign(description.style, {
      padding: '16px 20px',
      fontSize: '14px',
      color: '#aaa',
      lineHeight: '1.6',
    });

    const content = this.element.querySelector('.panel-content');
    Object.assign(content.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '0 20px 20px',
    });

    const section = this.element.querySelector('.panel-section');
    Object.assign(section.style, {
      marginBottom: '20px',
    });

    const sectionTitle = this.element.querySelector('.panel-section h3');
    Object.assign(sectionTitle.style, {
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      color: '#666',
      margin: '0 0 12px',
    });

    const buttons = this.element.querySelector('.panel-buttons');
    Object.assign(buttons.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    });
  },

  /**
   * Setup events
   */
  setupEvents() {
    const close = this.element.querySelector('.panel-close');
    close.addEventListener('click', () => this.close());
    close.addEventListener('mouseenter', () => {
      close.style.background = 'rgba(255, 100, 100, 0.2)';
      close.style.color = '#ff6666';
    });
    close.addEventListener('mouseleave', () => {
      close.style.background = 'rgba(255, 255, 255, 0.1)';
      close.style.color = '#888';
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  /**
   * Open panel with project data
   */
  open(project) {
    if (!project) return;

    this.currentProject = project;
    this.updateContent(project);

    this.element.style.transform = 'translateX(0)';
    this.isOpen = true;
  },

  /**
   * Update panel content
   */
  updateContent(project) {
    const trackColors = {
      dev: { gradient: 'linear-gradient(90deg, #ff4444, #ff6644)', color: '#ff6644', icon: '⚡' },
      games: { gradient: 'linear-gradient(90deg, #9944ff, #bb66ff)', color: '#bb66ff', icon: '🎮' },
      content: {
        gradient: 'linear-gradient(90deg, #00d9ff, #00ffaa)',
        color: '#00d9ff',
        icon: '📚',
      },
    };

    const trackConfig = trackColors[project.track?.id || project.track] || trackColors.dev;

    // Track indicator
    const trackIndicator = this.element.querySelector('.panel-track-indicator');
    trackIndicator.style.background = trackConfig.gradient;

    // Icon
    const icon = this.element.querySelector('.panel-icon');
    icon.textContent = trackConfig.icon;
    icon.style.background = trackConfig.gradient;

    // Title
    const title = this.element.querySelector('.panel-title');
    title.textContent = project.name || 'Unknown';

    // Track name
    const track = this.element.querySelector('.panel-track');
    track.textContent = project.track?.name || project.track || '';
    track.style.color = trackConfig.color;

    // Status
    const status = this.element.querySelector('.panel-status');
    if (project.status === 'live') {
      status.innerHTML = '<span style="color: #00ff88;">● LIVE</span>';
    } else if (project.status === 'building') {
      status.innerHTML = '<span style="color: #ffaa00;">◐ IN DEVELOPMENT</span>';
    } else {
      status.textContent = project.status || '';
    }

    // K-Score
    const kscore = this.element.querySelector('.panel-kscore');
    kscore.textContent = project.kScore ? `K-Score: ${project.kScore}` : '';

    // Description
    const description = this.element.querySelector('.panel-description');
    description.textContent = project.description || '';

    // Buttons
    const buttons = this.element.querySelector('.panel-buttons');
    buttons.innerHTML = '';

    if (project.url) {
      const visitBtn = this.createButton('Visit Project →', trackConfig.gradient, () => {
        window.location.href = project.url;
      });
      buttons.appendChild(visitBtn);
    }

    if (project.status === 'live') {
      const learnBtn = this.createButton('Learn More', 'rgba(255, 255, 255, 0.1)', () => {
        // Navigate to learning content when implemented
      });
      buttons.appendChild(learnBtn);
    }
  },

  /**
   * Create button
   */
  createButton(text, background, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
      padding: '14px 20px',
      background: background,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'center',
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 4px 20px rgba(255, 100, 50, 0.2)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', onClick);

    return btn;
  },

  /**
   * Close panel
   */
  close() {
    this.element.style.transform = 'translateX(100%)';
    this.isOpen = false;
    this.currentProject = null;
  },

  /**
   * Toggle
   */
  toggle(project) {
    if (this.isOpen && this.currentProject?.id === project?.id) {
      this.close();
    } else {
      this.open(project);
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

export default Panel;
