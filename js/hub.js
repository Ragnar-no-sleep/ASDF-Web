/**
 * ASDF Hub - Landing Page Interactions
 * Handles: Navigation, Tool Tabs, Stats, Animations
 */

(function() {
    'use strict';

    // ============================================
    // CONSTANTS
    // ============================================

    const API_BASE = 'https://asdf-api.onrender.com';
    const CACHE_DURATION = 60000; // 1 minute

    // ============================================
    // STATE
    // ============================================

    const state = {
        stats: null,
        statsLastFetch: 0,
        activeTool: 'holdex'
    };

    // ============================================
    // DOM ELEMENTS
    // ============================================

    const elements = {
        nav: document.getElementById('nav'),
        burnCounter: document.getElementById('burn-counter'),
        statSupply: document.getElementById('stat-supply'),
        statBuilders: document.getElementById('stat-builders'),
        totalBurned: document.getElementById('total-burned'),
        totalHolders: document.getElementById('total-holders'),
        toolTabs: document.querySelectorAll('.tool-tab'),
        toolContents: document.querySelectorAll('.tool-preview-content')
    };

    // ============================================
    // UTILITIES
    // ============================================

    /**
     * Format large numbers with K/M suffix
     */
    function formatNumber(num) {
        if (num === null || num === undefined || isNaN(num)) return '--';

        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(2) + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    /**
     * Animate number counter
     */
    function animateValue(element, start, end, duration = 1000) {
        if (!element) return;

        const startTime = performance.now();
        const startVal = start || 0;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (end - startVal) * easeProgress;

            element.textContent = formatNumber(Math.floor(current));

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // ============================================
    // NAVIGATION
    // ============================================

    function initNavigation() {
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            // Add/remove scrolled class
            if (currentScrollY > 50) {
                elements.nav?.classList.add('scrolled');
            } else {
                elements.nav?.classList.remove('scrolled');
            }

            lastScrollY = currentScrollY;
        }, { passive: true });

        // Mobile nav toggle
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (navToggle && navLinks) {
            navToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // ============================================
    // TOOL TABS
    // ============================================

    function initToolTabs() {
        elements.toolTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const toolId = tab.dataset.tool;
                if (!toolId || toolId === state.activeTool) return;

                // Update active tab
                elements.toolTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content
                elements.toolContents.forEach(content => {
                    if (content.dataset.tool === toolId) {
                        content.classList.add('active');
                    } else {
                        content.classList.remove('active');
                    }
                });

                state.activeTool = toolId;
            });
        });
    }

    // ============================================
    // STATS FETCHING
    // ============================================

    async function fetchStats() {
        const now = Date.now();

        // Use cache if fresh
        if (state.stats && (now - state.statsLastFetch) < CACHE_DURATION) {
            return state.stats;
        }

        try {
            const response = await fetch(`${API_BASE}/api/ecosystem/burns`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            state.stats = data;
            state.statsLastFetch = now;

            return data;
        } catch (error) {
            console.warn('Failed to fetch stats:', error.message);
            return null;
        }
    }

    async function updateStats() {
        const stats = await fetchStats();

        if (!stats) {
            // Show placeholder on error
            return;
        }

        // Extract values
        const totalBurned = stats.totalBurned || stats.total_burned || 0;
        const supplyLeft = stats.supplyRemaining || stats.supply_remaining || 0;
        const holders = stats.holders || stats.totalHolders || 0;
        const builders = stats.builders || stats.totalBuilders || 0;

        // Animate counters
        if (elements.burnCounter) {
            animateValue(elements.burnCounter, 0, totalBurned, 1500);
        }

        if (elements.statSupply) {
            elements.statSupply.textContent = formatNumber(supplyLeft);
        }

        if (elements.statBuilders) {
            elements.statBuilders.textContent = formatNumber(builders || 50);
        }

        if (elements.totalBurned) {
            animateValue(elements.totalBurned, 0, totalBurned, 1500);
        }

        if (elements.totalHolders) {
            elements.totalHolders.textContent = formatNumber(holders || 847);
        }
    }

    // ============================================
    // ANIMATIONS
    // ============================================

    function initAnimations() {
        // Intersection Observer for stagger animations
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observe stagger containers
        document.querySelectorAll('.stagger').forEach(el => {
            observer.observe(el);
        });

        // Observe individual animated elements
        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });
    }

    // ============================================
    // PILLAR CARDS HOVER EFFECT
    // ============================================

    function initPillarEffects() {
        const pillarCards = document.querySelectorAll('.pillar-card');

        pillarCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        });
    }

    // ============================================
    // KEYBOARD NAVIGATION
    // ============================================

    function initKeyboardNav() {
        document.addEventListener('keydown', (e) => {
            // Tool tabs: arrow keys
            if (document.activeElement?.classList.contains('tool-tab')) {
                const tabs = Array.from(elements.toolTabs);
                const currentIndex = tabs.indexOf(document.activeElement);

                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const nextIndex = (currentIndex + 1) % tabs.length;
                    tabs[nextIndex].focus();
                    tabs[nextIndex].click();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                    tabs[prevIndex].focus();
                    tabs[prevIndex].click();
                }
            }
        });
    }

    // ============================================
    // MOBILE DOCK
    // ============================================

    function initMobileDock() {
        const dock = document.querySelector('.mobile-dock');
        if (!dock) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const currentScrollY = window.scrollY;

                    // Hide dock when scrolling down, show when scrolling up
                    if (currentScrollY > lastScrollY && currentScrollY > 200) {
                        dock.style.transform = 'translateX(-50%) translateY(100px)';
                    } else {
                        dock.style.transform = 'translateX(-50%) translateY(0)';
                    }

                    lastScrollY = currentScrollY;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ============================================
    // PREFERS REDUCED MOTION
    // ============================================

    function checkReducedMotion() {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

        if (prefersReduced.matches) {
            document.documentElement.classList.add('reduce-motion');
        }

        prefersReduced.addEventListener('change', (e) => {
            if (e.matches) {
                document.documentElement.classList.add('reduce-motion');
            } else {
                document.documentElement.classList.remove('reduce-motion');
            }
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        // Check for reduced motion preference
        checkReducedMotion();

        // Initialize components
        initNavigation();
        initToolTabs();
        initAnimations();
        initPillarEffects();
        initKeyboardNav();
        initMobileDock();

        // Fetch and display stats
        updateStats();

        // Refresh stats periodically
        setInterval(updateStats, CACHE_DURATION);

        // Log ready
        console.log('%cASDF Hub Ready', 'color: #667eea; font-weight: bold;');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
