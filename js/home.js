/**
 * ASDF Home - Onboarding Quiz & Dashboard Hub
 *
 * CSP Compliant - No inline scripts
 * Pattern: Hub Manager from js/games/hub/index.js
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// CONSTANTS
// ============================================

const ONBOARDING_STORAGE_KEY = 'asdf_onboarding_v1';
const API_BASE_URL = 'https://asdf-api.onrender.com';

// ============================================
// ONBOARDING STATE
// ============================================

const OnboardingState = {
    completed: false,
    skipped: false,
    cryptoLevel: null,    // beginner | intermediate | expert
    goal: null,           // hold | build | both
    completedAt: null
};

// ============================================
// ONBOARDING MANAGER
// ============================================

const Onboarding = {
    currentStep: 1,
    totalSteps: 2,
    initialized: false,

    /**
     * Initialize onboarding
     */
    init() {
        if (this.initialized) return;

        console.log('[Onboarding] Initializing...');

        // Load saved state
        this.loadState();

        // Setup event listeners
        this.setupEventListeners();

        // Check if should show quiz
        if (this.shouldShowQuiz()) {
            this.showOverlay();
        } else {
            this.hideOverlay();
        }

        this.initialized = true;
        console.log('[Onboarding] Ready');
    },

    /**
     * Setup event listeners (CSP compliant)
     */
    setupEventListeners() {
        // Skip button
        const skipBtn = document.getElementById('skip-onboarding');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skip());
        }

        // Quiz option cards
        document.querySelectorAll('.quiz-option-card').forEach(card => {
            card.addEventListener('click', () => {
                const step = parseInt(card.dataset.step, 10);
                const level = card.dataset.level;
                const goal = card.dataset.goal;

                // Visual feedback
                this.selectCard(card);

                // Process answer with delay for animation
                setTimeout(() => {
                    if (level) this.selectAnswer(step, level);
                    if (goal) this.selectAnswer(step, goal);
                }, 250);
            });
        });
    },

    /**
     * Visual selection of card
     */
    selectCard(card) {
        const step = card.dataset.step;
        // Remove selection from siblings
        document.querySelectorAll(`.quiz-option-card[data-step="${step}"]`).forEach(c => {
            c.classList.remove('selected');
        });
        // Add selection to clicked card
        card.classList.add('selected');
    },

    /**
     * Check if quiz should be shown
     */
    shouldShowQuiz() {
        return !OnboardingState.completed && !OnboardingState.skipped;
    },

    /**
     * Show quiz overlay
     */
    showOverlay() {
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Hide quiz overlay
     */
    hideOverlay() {
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
        }
    },

    /**
     * Select answer for current step
     */
    selectAnswer(step, value) {
        if (step === 1) {
            OnboardingState.cryptoLevel = value;
            this.goToStep(2);
        } else if (step === 2) {
            OnboardingState.goal = value;
            this.complete();
        }
    },

    /**
     * Go to specific step
     */
    goToStep(step) {
        this.currentStep = step;

        // Update progress UI
        document.querySelectorAll('.progress-step').forEach(el => {
            const stepNum = parseInt(el.dataset.step, 10);
            el.classList.remove('active', 'completed');
            if (stepNum < step) el.classList.add('completed');
            if (stepNum === step) el.classList.add('active');
        });

        // Update connector
        const connector = document.querySelector('.progress-connector');
        if (connector && step > 1) {
            connector.classList.add('active');
        }

        // Show correct step content
        document.querySelectorAll('.onboarding-step').forEach(el => {
            el.classList.remove('active');
        });
        const stepEl = document.getElementById('step-' + step);
        if (stepEl) stepEl.classList.add('active');
    },

    /**
     * Skip onboarding
     */
    skip() {
        OnboardingState.skipped = true;
        this.saveState();
        this.hideOverlay();
        console.log('[Onboarding] Skipped');
    },

    /**
     * Complete onboarding
     */
    complete() {
        OnboardingState.completed = true;
        OnboardingState.completedAt = new Date().toISOString();
        this.saveState();
        this.hideOverlay();

        console.log('[Onboarding] Completed:', OnboardingState);

        // Personalize dashboard based on answers
        Dashboard.personalize(OnboardingState);
    },

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                Object.assign(OnboardingState, parsed);
                console.log('[Onboarding] Loaded state:', OnboardingState);
            }
        } catch (e) {
            console.warn('[Onboarding] Failed to load state:', e);
        }
    },

    /**
     * Save state to localStorage
     */
    saveState() {
        try {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(OnboardingState));
        } catch (e) {
            console.warn('[Onboarding] Failed to save state:', e);
        }
    },

    /**
     * Reset onboarding (for testing)
     */
    reset() {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        OnboardingState.completed = false;
        OnboardingState.skipped = false;
        OnboardingState.cryptoLevel = null;
        OnboardingState.goal = null;
        OnboardingState.completedAt = null;
        location.reload();
    }
};

// ============================================
// DASHBOARD MANAGER
// ============================================

const Dashboard = {
    initialized: false,

    /**
     * Initialize dashboard
     */
    init() {
        if (this.initialized) return;

        console.log('[Dashboard] Initializing...');

        this.setupHubCards();
        this.setupNavScroll();
        this.fetchLiveStats();

        // Check if user already completed onboarding
        if (OnboardingState.completed && OnboardingState.goal) {
            this.personalize(OnboardingState);
        }

        this.initialized = true;
        console.log('[Dashboard] Ready');
    },

    /**
     * Setup hub card click handlers
     */
    setupHubCards() {
        document.querySelectorAll('.hub-card[data-hub-link]').forEach(card => {
            card.addEventListener('click', () => {
                const link = card.dataset.hubLink;
                if (link) {
                    // Check if it's an external link or internal
                    if (link.startsWith('http')) {
                        window.open(link, '_blank', 'noopener,noreferrer');
                    } else {
                        window.location.href = link;
                    }
                }
            });

            // Keyboard accessibility
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });
    },

    /**
     * Setup nav scroll effect
     */
    setupNavScroll() {
        const nav = document.querySelector('.nav-home');
        if (!nav) return;

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (window.scrollY > 50) {
                        nav.classList.add('scrolled');
                    } else {
                        nav.classList.remove('scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    },

    /**
     * Personalize dashboard based on onboarding answers
     */
    personalize(state) {
        console.log('[Dashboard] Personalizing for:', state.goal, state.cryptoLevel);

        // Highlight relevant sections based on goal
        if (state.goal === 'hold') {
            this.highlightCategory('HOLD');
        } else if (state.goal === 'build') {
            this.highlightCategory('BUILD');
        } else if (state.goal === 'both') {
            // Highlight both but HOLD first
            this.highlightCategory('HOLD');
        }

        // Adjust content visibility based on level
        if (state.cryptoLevel === 'beginner') {
            // Beginners should see Learn prominently
            this.highlightCategory('LEARN');
        }
    },

    /**
     * Highlight a category
     */
    highlightCategory(categoryName) {
        const categories = document.querySelectorAll('.hub-category');
        categories.forEach(cat => {
            const title = cat.querySelector('.hub-category-title');
            if (title && title.textContent.includes(categoryName)) {
                cat.classList.add('highlighted');
            }
        });
    },

    /**
     * Fetch live burn stats from API
     */
    async fetchLiveStats() {
        const burnedEl = document.getElementById('stat-burned-mini');
        const supplyEl = document.getElementById('stat-supply-mini');

        // Show loading state
        if (burnedEl) burnedEl.innerHTML = '<span class="loading-shimmer">&nbsp;</span>';
        if (supplyEl) supplyEl.innerHTML = '<span class="loading-shimmer">&nbsp;</span>';

        try {
            const response = await fetch(`${API_BASE_URL}/stats`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error('API error');

            const data = await response.json();
            this.updateStatsUI(data);
        } catch (e) {
            // Silent fail - show fallback
            console.log('[Dashboard] Stats API not available:', e.message);
            if (burnedEl) burnedEl.textContent = '--';
            if (supplyEl) supplyEl.textContent = '--';
        }
    },

    /**
     * Update stats UI with data
     */
    updateStatsUI(data) {
        const burnedEl = document.getElementById('stat-burned-mini');
        const supplyEl = document.getElementById('stat-supply-mini');

        if (burnedEl && data.cycles && data.cycles.totalTokensBurned) {
            const burned = data.cycles.totalTokensBurned;
            burnedEl.textContent = this.formatNumber(burned);
        }

        if (supplyEl && data.supplyRemaining) {
            supplyEl.textContent = this.formatNumber(data.supplyRemaining);
        }
    },

    /**
     * Format large numbers with K/M suffix
     */
    formatNumber(num) {
        if (!num && num !== 0) return '--';
        if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    }
};

// ============================================
// MOBILE NAV TOGGLE
// ============================================

const MobileNav = {
    init() {
        const toggle = document.querySelector('.nav-toggle');
        const links = document.querySelector('.nav-home-links');

        if (toggle && links) {
            toggle.addEventListener('click', () => {
                links.classList.toggle('mobile-open');
                toggle.setAttribute('aria-expanded',
                    links.classList.contains('mobile-open'));
            });
        }
    }
};

// ============================================
// AUTO INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[ASDF Home] Starting...');

    // Initialize in order
    Onboarding.init();
    Dashboard.init();
    MobileNav.init();

    console.log('[ASDF Home] All systems go!');
});

// ============================================
// GLOBAL EXPORTS (for debugging)
// ============================================

if (typeof window !== 'undefined') {
    window.Onboarding = Onboarding;
    window.Dashboard = Dashboard;
    window.OnboardingState = OnboardingState;

    // Dev helper
    window.resetOnboarding = () => Onboarding.reset();
}
