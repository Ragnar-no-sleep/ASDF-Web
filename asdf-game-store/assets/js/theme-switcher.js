/**
 * ASDF Store - Theme Switcher
 * Permet de basculer entre différents thèmes visuels
 */

const themes = {
  terminal: {
    name: 'Terminal Phosphor',
    vars: {
      '--bg-primary': '#0a0e14',
      '--bg-secondary': '#151a23',
      '--bg-tertiary': '#1f2632',
      '--accent': '#00ff88',
      '--accent-glow': 'rgba(0, 255, 136, 0.4)',
      '--accent-dark': '#00cc6a',
      '--accent-secondary': '#00e5ff',
      '--text-primary': '#e8edf4',
      '--text-secondary': '#94a3b8',
    },
  },
  cyber: {
    name: 'Cyber Neon',
    vars: {
      '--bg-primary': '#0d0221',
      '--bg-secondary': '#1a0b3f',
      '--bg-tertiary': '#2d1652',
      '--accent': '#ff006e',
      '--accent-glow': 'rgba(255, 0, 110, 0.4)',
      '--accent-dark': '#cc0058',
      '--accent-secondary': '#8338ec',
      '--text-primary': '#f8f9fa',
      '--text-secondary': '#b4a7d6',
    },
  },
  ocean: {
    name: 'Deep Ocean',
    vars: {
      '--bg-primary': '#03045e',
      '--bg-secondary': '#0a1f44',
      '--bg-tertiary': '#134074',
      '--accent': '#00b4d8',
      '--accent-glow': 'rgba(0, 180, 216, 0.4)',
      '--accent-dark': '#0096c7',
      '--accent-secondary': '#90e0ef',
      '--text-primary': '#caf0f8',
      '--text-secondary': '#90c2d8',
    },
  },
  sunset: {
    name: 'Sunset Glow',
    vars: {
      '--bg-primary': '#1a0b2e',
      '--bg-secondary': '#2d1b3d',
      '--bg-tertiary': '#3e2d4d',
      '--accent': '#ff6b35',
      '--accent-glow': 'rgba(255, 107, 53, 0.4)',
      '--accent-dark': '#e35d2f',
      '--accent-secondary': '#f7931e',
      '--text-primary': '#fef9ef',
      '--text-secondary': '#d4c5b9',
    },
  },
  matrix: {
    name: 'Matrix Code',
    vars: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#0a0f0a',
      '--bg-tertiary': '#0f1e0f',
      '--accent': '#00ff41',
      '--accent-glow': 'rgba(0, 255, 65, 0.4)',
      '--accent-dark': '#00cc34',
      '--accent-secondary': '#39ff14',
      '--text-primary': '#e0ffe0',
      '--text-secondary': '#90c090',
    },
  },
};

class ThemeSwitcher {
  constructor() {
    this.currentThemeKey = localStorage.getItem('asdf-theme') || 'terminal';
    this.themeBtn = document.getElementById('theme-switcher');
    this.themeKeys = Object.keys(themes);
    this.currentIndex = this.themeKeys.indexOf(this.currentThemeKey);

    this.init();
  }

  init() {
    // Apply saved theme
    this.applyTheme(this.currentThemeKey);

    // Add event listener
    if (this.themeBtn) {
      this.themeBtn.addEventListener('click', () => this.cycleTheme());

      // Add hover effect
      this.themeBtn.addEventListener('mouseenter', () => {
        this.themeBtn.style.borderColor = 'var(--accent)';
        this.themeBtn.style.color = 'var(--accent)';
        this.themeBtn.style.boxShadow = '0 0 20px var(--accent-glow)';
      });

      this.themeBtn.addEventListener('mouseleave', () => {
        this.themeBtn.style.borderColor = 'var(--border)';
        this.themeBtn.style.color = 'var(--text-secondary)';
        this.themeBtn.style.boxShadow = 'none';
      });
    }
  }

  cycleTheme() {
    // Move to next theme
    this.currentIndex = (this.currentIndex + 1) % this.themeKeys.length;
    this.currentThemeKey = this.themeKeys[this.currentIndex];

    this.applyTheme(this.currentThemeKey);

    // Show notification
    this.showNotification(themes[this.currentThemeKey].name);
  }

  applyTheme(themeKey) {
    const theme = themes[themeKey];
    if (!theme) return;

    const root = document.documentElement;

    // Apply CSS variables with smooth transition
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Save preference
    localStorage.setItem('asdf-theme', themeKey);
    this.currentThemeKey = themeKey;

    // Add transition class
    document.body.style.transition = 'background-color 0.6s ease, color 0.6s ease';
  }

  showNotification(themeName) {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = `Thème: ${themeName}`;
    notification.style.cssText = `
            position: fixed;
            top: 6rem;
            right: 2rem;
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            color: var(--accent);
            padding: 1rem 1.5rem;
            border-radius: 12px;
            border: 1px solid var(--border-glow);
            box-shadow: var(--shadow-lg), var(--shadow-glow);
            font-family: var(--font-display);
            font-weight: 600;
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    // Animate out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 400);
    }, 2000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ThemeSwitcher());
} else {
  new ThemeSwitcher();
}
