/**
 * ASDF Hub - Central Navigation System
 *
 * Valhalla-themed hub with Games, Shop, Profile, Settings
 *
 * @version 1.0.0
 */

'use strict';

// ============================================
// HUB MANAGER
// ============================================

const Hub = {
    // Current view
    currentView: 'hub',

    // Views
    VIEWS: {
        HUB: 'hub',
        GAMES: 'games',
        SHOP: 'shop',
        PROFILE: 'profile',
        SETTINGS: 'settings'
    },

    // Section elements cache
    sections: {},

    // Initialized flag
    initialized: false,

    // Audio system reference
    audio: null,

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize the Hub
     */
    init() {
        if (this.initialized) return;

        console.log('[Hub] Initializing...');

        // Cache section elements
        this.cacheSections();

        // Setup navigation
        this.setupNavigation();

        // Setup hub cards
        this.setupHubCards();

        // Initialize particles
        this.initParticles();

        // Initialize audio
        if (window.ValhallaAudio) {
            this.audio = window.ValhallaAudio;
            this.audio.init();
        }

        // Check URL hash for initial view
        this.handleHashChange();

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleHashChange());

        this.initialized = true;
        console.log('[Hub] Initialized');
    },

    /**
     * Cache section elements
     */
    cacheSections() {
        this.sections = {
            hub: document.getElementById('hub-section'),
            games: document.getElementById('games-section'),
            shop: document.getElementById('shop-section'),
            profile: document.getElementById('profile-section'),
            settings: document.getElementById('settings-section'),
            hero: document.querySelector('.hero'),
            accessBar: document.querySelector('.access-bar'),
            pumpArena: document.querySelector('.pump-arena-section')
        };
    },

    /**
     * Setup navigation event listeners
     */
    setupNavigation() {
        // Nav tabs
        document.querySelectorAll('[data-hub-view]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const view = el.dataset.hubView;
                this.navigateTo(view);
                this.playSound('click');
            });
        });

        // Back buttons
        document.querySelectorAll('[data-hub-back]').forEach(el => {
            el.addEventListener('click', () => {
                this.navigateTo('hub');
                this.playSound('back');
            });
        });
    },

    /**
     * Setup hub card click handlers
     */
    setupHubCards() {
        document.querySelectorAll('.hub-card').forEach(card => {
            const view = card.dataset.hubView;
            if (!view) return;

            card.addEventListener('click', () => {
                this.navigateTo(view);
                this.playSound('navigate');
            });

            // Hover sounds
            card.addEventListener('mouseenter', () => {
                this.playSound('hover');
            });
        });
    },

    // ============================================
    // NAVIGATION
    // ============================================

    /**
     * Navigate to a view
     * @param {string} view - View to navigate to
     */
    navigateTo(view) {
        if (!this.VIEWS[view.toUpperCase()]) {
            console.warn('[Hub] Unknown view:', view);
            return;
        }

        console.log('[Hub] Navigating to:', view);

        // Hide all sections
        this.hideAllSections();

        // Show target section
        this.showSection(view);

        // Update current view
        this.currentView = view;

        // Update URL hash
        window.history.pushState(null, '', `#${view}`);

        // Update nav tabs
        this.updateNavTabs(view);

        // Trigger view-specific init
        this.onViewEnter(view);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Handle URL hash change
     */
    handleHashChange() {
        const hash = window.location.hash.slice(1) || 'hub';
        const view = hash.replace('-section', '').replace('view-', '');

        if (this.VIEWS[view.toUpperCase()]) {
            this.navigateTo(view);
        } else {
            this.navigateTo('hub');
        }
    },

    /**
     * Hide all sections
     */
    hideAllSections() {
        Object.values(this.sections).forEach(section => {
            if (section) {
                section.style.display = 'none';
                section.classList.remove('active');
            }
        });
    },

    /**
     * Show a section
     * @param {string} view - View to show
     */
    showSection(view) {
        const section = this.sections[view];
        if (section) {
            section.style.display = 'block';
            section.classList.add('active');

            // Trigger animation
            section.querySelectorAll('.valhalla-fade-in').forEach((el, i) => {
                el.style.animationDelay = `${i * 0.1}s`;
            });
        }

        // For games view, also show legacy sections
        if (view === 'games') {
            if (this.sections.hero) this.sections.hero.style.display = 'block';
            if (this.sections.accessBar) this.sections.accessBar.style.display = 'flex';
            if (this.sections.pumpArena) this.sections.pumpArena.style.display = 'block';
        }
    },

    /**
     * Update nav tabs active state
     */
    updateNavTabs(view) {
        document.querySelectorAll('.nav-tab, [data-hub-view]').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.hubView === view || tab.getAttribute('href')?.includes(view)) {
                tab.classList.add('active');
            }
        });
    },

    /**
     * Called when entering a view
     */
    onViewEnter(view) {
        switch (view) {
            case 'shop':
                if (window.ShopV2 && !window.ShopV2.initialized) {
                    window.ShopV2.init();
                }
                break;
            case 'profile':
                if (window.Profile) {
                    window.Profile.refresh();
                }
                break;
            case 'settings':
                if (window.Settings) {
                    window.Settings.load();
                }
                break;
        }
    },

    // ============================================
    // PARTICLES
    // ============================================

    /**
     * Initialize background particles
     */
    initParticles() {
        const container = document.querySelector('.valhalla-particles');
        if (!container) return;

        // Create ember particles
        for (let i = 0; i < 30; i++) {
            const ember = document.createElement('div');
            ember.className = 'particle-ember';
            ember.style.left = `${Math.random() * 100}%`;
            ember.style.animationDelay = `${Math.random() * 8}s`;
            ember.style.animationDuration = `${6 + Math.random() * 4}s`;
            container.appendChild(ember);
        }

        // Create mist particles
        for (let i = 0; i < 5; i++) {
            const mist = document.createElement('div');
            mist.className = 'particle-mist';
            mist.style.left = `${Math.random() * 100}%`;
            mist.style.top = `${Math.random() * 100}%`;
            mist.style.animationDelay = `${Math.random() * 10}s`;
            container.appendChild(mist);
        }
    },

    // ============================================
    // AUDIO
    // ============================================

    /**
     * Play sound effect
     * @param {string} sound - Sound name
     */
    playSound(sound) {
        if (this.audio && this.audio.isEnabled()) {
            this.audio.play(sound);
        }
    },

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Get current view
     */
    getCurrentView() {
        return this.currentView;
    },

    /**
     * Check if view is active
     */
    isViewActive(view) {
        return this.currentView === view;
    }
};

// ============================================
// AUTO INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    Hub.init();
});

// Global export
if (typeof window !== 'undefined') {
    window.Hub = Hub;
}
