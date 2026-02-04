/**
 * ASDF - Cookie Consent Manager
 *
 * RGPD/GDPR compliant consent management:
 * - Blocks localStorage usage until consent given
 * - Remembers user preferences
 * - Provides API for checking consent status
 *
 * @version 1.0.0
 */

'use strict';

// Consent categories
const CONSENT_CATEGORIES = {
  NECESSARY: 'necessary', // Always allowed (auth, security)
  FUNCTIONAL: 'functional', // Game state, preferences
  ANALYTICS: 'analytics', // Usage tracking (future)
};

// Storage key for consent
const CONSENT_KEY = 'asdf_consent';
const CONSENT_VERSION = 1;

// Default state
let consentState = {
  version: CONSENT_VERSION,
  given: false,
  timestamp: null,
  categories: {
    necessary: true, // Always true
    functional: false,
    analytics: false,
  },
};

/**
 * Load consent state from localStorage
 */
function loadConsent() {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check version compatibility
      if (parsed.version === CONSENT_VERSION && parsed.given) {
        consentState = parsed;
        return true;
      }
    }
  } catch (e) {
    console.warn('[Consent] Failed to load consent state');
  }
  return false;
}

/**
 * Save consent state to localStorage
 */
function saveConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentState));
  } catch (e) {
    console.warn('[Consent] Failed to save consent state');
  }
}

/**
 * Check if consent has been given for a category
 * @param {string} category - Consent category
 * @returns {boolean}
 */
function hasConsent(category = CONSENT_CATEGORIES.FUNCTIONAL) {
  if (category === CONSENT_CATEGORIES.NECESSARY) return true;
  return consentState.given && consentState.categories[category];
}

/**
 * Check if any consent has been given
 * @returns {boolean}
 */
function hasGivenConsent() {
  return consentState.given;
}

/**
 * Accept all cookies
 */
function acceptAll() {
  consentState = {
    version: CONSENT_VERSION,
    given: true,
    timestamp: Date.now(),
    categories: {
      necessary: true,
      functional: true,
      analytics: true,
    },
  };
  saveConsent();
  hideBanner();
  dispatchConsentEvent();
}

/**
 * Accept only necessary cookies
 */
function acceptNecessaryOnly() {
  consentState = {
    version: CONSENT_VERSION,
    given: true,
    timestamp: Date.now(),
    categories: {
      necessary: true,
      functional: false,
      analytics: false,
    },
  };
  saveConsent();
  hideBanner();
  dispatchConsentEvent();
}

/**
 * Accept selected categories
 * @param {Object} categories - { functional: bool, analytics: bool }
 */
function acceptSelected(categories) {
  consentState = {
    version: CONSENT_VERSION,
    given: true,
    timestamp: Date.now(),
    categories: {
      necessary: true,
      functional: categories.functional || false,
      analytics: categories.analytics || false,
    },
  };
  saveConsent();
  hideBanner();
  dispatchConsentEvent();
}

/**
 * Dispatch consent change event
 */
function dispatchConsentEvent() {
  window.dispatchEvent(
    new CustomEvent('asdf:consent', {
      detail: { ...consentState.categories },
    })
  );
}

/**
 * Create and show the consent banner
 */
function showBanner() {
  // Don't show if already consented
  if (consentState.given) return;

  const banner = document.createElement('div');
  banner.id = 'consent-banner';
  banner.innerHTML = `
    <div class="consent-content">
      <div class="consent-text">
        <h3>Cookie Preferences</h3>
        <p>We use cookies to save your game progress and preferences.
           <a href="/privacy.html" target="_blank">Privacy Policy</a></p>
      </div>
      <div class="consent-actions">
        <button class="consent-btn consent-btn-secondary" id="consent-necessary">
          Necessary Only
        </button>
        <button class="consent-btn consent-btn-primary" id="consent-accept">
          Accept All
        </button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #consent-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(10, 10, 15, 0.98);
      border-top: 1px solid rgba(153, 69, 255, 0.3);
      padding: 16px 24px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .consent-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .consent-text h3 {
      color: #fff;
      margin: 0 0 4px 0;
      font-size: 16px;
    }
    .consent-text p {
      color: #a0a0a0;
      margin: 0;
      font-size: 14px;
    }
    .consent-text a {
      color: #9945FF;
      text-decoration: none;
    }
    .consent-text a:hover {
      text-decoration: underline;
    }
    .consent-actions {
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }
    .consent-btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .consent-btn-primary {
      background: linear-gradient(135deg, #9945FF 0%, #14F195 100%);
      color: #fff;
    }
    .consent-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(153, 69, 255, 0.4);
    }
    .consent-btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #a0a0a0;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .consent-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    @media (max-width: 600px) {
      .consent-content {
        flex-direction: column;
        text-align: center;
      }
      .consent-actions {
        width: 100%;
        justify-content: center;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);

  // Event listeners
  document.getElementById('consent-accept').addEventListener('click', acceptAll);
  document.getElementById('consent-necessary').addEventListener('click', acceptNecessaryOnly);
}

/**
 * Hide the consent banner
 */
function hideBanner() {
  const banner = document.getElementById('consent-banner');
  if (banner) {
    banner.style.animation = 'slideDown 0.3s ease-in forwards';
    setTimeout(() => banner.remove(), 300);
  }
}

/**
 * Revoke consent (for settings page)
 */
function revokeConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
    consentState = {
      version: CONSENT_VERSION,
      given: false,
      timestamp: null,
      categories: {
        necessary: true,
        functional: false,
        analytics: false,
      },
    };
    showBanner();
  } catch (e) {
    console.warn('[Consent] Failed to revoke consent');
  }
}

/**
 * Initialize consent manager
 * Call this on page load
 */
function init() {
  const hasExisting = loadConsent();
  if (!hasExisting) {
    // Show banner after a brief delay for better UX
    setTimeout(showBanner, 500);
  }
}

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONSENT_CATEGORIES,
    hasConsent,
    hasGivenConsent,
    acceptAll,
    acceptNecessaryOnly,
    acceptSelected,
    revokeConsent,
    init,
  };
}

// Export for browser usage
window.ASFConsent = {
  CATEGORIES: CONSENT_CATEGORIES,
  hasConsent,
  hasGivenConsent,
  acceptAll,
  acceptNecessaryOnly,
  acceptSelected,
  revokeConsent,
};
