/**
 * learn-init.js
 * Event listener initialization for learn.html
 * Migrates onclick handlers to addEventListener for CSP compliance
 */

'use strict';

// This script must be loaded AFTER learn.js (which contains all the functions)
// It attaches event listeners to replace inline onclick handlers

document.addEventListener('DOMContentLoaded', function() {
    // ============================================
    // HASH-BASED NAVIGATION
    // Handle navigation from external pages (e.g., games.html#view-tools)
    // ============================================
    function handleHashNavigation() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#view-')) {
            const viewName = hash.replace('#view-', '');
            // Valid views: learn, tools, build, play, games, faq-glossary
            const validViews = ['learn', 'tools', 'build', 'play', 'games', 'faq-glossary'];
            if (validViews.includes(viewName) && typeof window.switchView === 'function') {
                // Small delay to ensure DOM is fully ready
                setTimeout(function() {
                    window.switchView(viewName);
                    // Update nav-tab active state
                    document.querySelectorAll('.nav-tab').forEach(function(tab) {
                        tab.classList.remove('active');
                        const tabText = tab.textContent.toLowerCase().trim();
                        const tabViewName = tabText === 'faq/glossary' ? 'faq-glossary' : tabText;
                        if (tabViewName === viewName) {
                            tab.classList.add('active');
                        }
                    });
                }, 50);
            }
        }
    }

    // Handle hash on page load
    handleHashNavigation();

    // Handle hash changes (for browser back/forward)
    window.addEventListener('hashchange', handleHashNavigation);

    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(function(btn) {
        // Skip if it's a link (like Games which links to games.html)
        if (btn.tagName === 'A') return;

        // Skip if it's the Tools dropdown trigger
        if (btn.classList.contains('nav-tab-trigger')) return;

        let viewName = btn.textContent.toLowerCase().trim();

        // Handle special cases for view mapping
        const viewMap = {
            'faq/glossary': 'faq-glossary'
        };
        if (viewMap[viewName]) {
            viewName = viewMap[viewName];
        }

        btn.addEventListener('click', function() {
            if (typeof window.switchView === 'function') {
                window.switchView(viewName);
            }
        });
    });

    // FAQ/Glossary internal tabs
    document.querySelectorAll('.faq-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            // Update tab styles
            document.querySelectorAll('.faq-tab').forEach(function(t) {
                t.classList.remove('active');
                t.style.background = 'var(--bg-charred)';
                t.style.borderColor = 'var(--border-rust)';
                t.style.color = 'var(--text-muted)';
            });
            this.classList.add('active');
            this.style.background = 'var(--accent-fire)';
            this.style.borderColor = 'var(--accent-fire)';
            this.style.color = 'white';

            // Show/hide content
            document.querySelectorAll('.faq-tab-content').forEach(function(content) {
                content.style.display = 'none';
                content.classList.remove('active');
            });
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.style.display = 'block';
                targetContent.classList.add('active');
            }
        });
    });

    // Level navigation
    document.querySelectorAll('.nav-level').forEach(function(el) {
        el.addEventListener('click', function() {
            const level = parseInt(this.dataset.level);
            if (level && typeof window.goToLevel === 'function') window.goToLevel(level);
        });
    });

    // Reveal boxes
    document.querySelectorAll('.reveal-box').forEach(function(box) {
        box.addEventListener('click', function() {
            if (typeof window.toggleReveal === 'function') window.toggleReveal(this);
        });
    });

    // Quiz options - find level from parent .level-section
    document.querySelectorAll('.quiz-option').forEach(function(opt) {
        opt.addEventListener('click', function() {
            // Find the level from the parent .level-section (e.g., id="level-1" -> level 1)
            const levelSection = this.closest('.level-section');
            let level = 0;
            if (levelSection && levelSection.id) {
                const match = levelSection.id.match(/level-(\d+)/);
                if (match) level = parseInt(match[1]);
            }
            const correct = this.dataset.correct === 'true';
            if (typeof window.checkAnswer === 'function') window.checkAnswer(this, level, correct);
        });
    });

    // Unlock level buttons
    document.querySelectorAll('[id^="unlock-level-"]').forEach(function(btn) {
        const level = parseInt(btn.id.replace('unlock-level-', ''));
        btn.addEventListener('click', function() {
            if (typeof window.unlockLevel === 'function') window.unlockLevel(level);
        });
    });

    // Back buttons (go to previous level)
    document.querySelectorAll('.level-section .btn:not(.btn-primary):not(.btn-success)').forEach(function(btn) {
        if (btn.textContent.includes('Back')) {
            const section = btn.closest('.level-section');
            if (section) {
                const currentLevel = parseInt(section.id.replace('level-', ''));
                if (currentLevel > 1) {
                    btn.addEventListener('click', function() {
                        if (typeof window.goToLevel === 'function') window.goToLevel(currentLevel - 1);
                    });
                }
            }
        }
    });

    // Complete course button
    const completeCourseBtn = document.getElementById('complete-course');
    if (completeCourseBtn) {
        completeCourseBtn.addEventListener('click', function() {
            if (typeof window.completeCourse === 'function') window.completeCourse();
        });
    }

    // Share completion button
    document.querySelectorAll('.btn-share').forEach(function(btn) {
        btn.addEventListener('click', function() {
            if (typeof window.shareCompletion === 'function') window.shareCompletion();
        });
    });

    // Reset progress button
    document.querySelectorAll('.btn').forEach(function(btn) {
        if (btn.textContent.includes('Reset Progress')) {
            btn.addEventListener('click', function() {
                if (typeof window.resetProgress === 'function') window.resetProgress();
            });
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            const value = this.dataset.value;
            if (filter && value && typeof window.filterProjects === 'function') window.filterProjects(filter, value);
        });
    });

    // Docs buttons
    document.querySelectorAll('.btn-docs').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const project = this.dataset.project || this.closest('.project-card')?.dataset.project;
            if (project && typeof window.openDocs === 'function') window.openDocs(project);
        });
    });

    // Close docs button
    document.querySelectorAll('.doc-close').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('#doc-modal');
            if (modal && typeof window.closeDocs === 'function') window.closeDocs();
            const deepModal = this.closest('#deep-learn-modal');
            if (deepModal && typeof window.closeDeepLearn === 'function') window.closeDeepLearn();
        });
    });

    // Deep Learn button (dynamically created in doc modal) - use event delegation
    const docModal = document.getElementById('doc-modal');
    if (docModal) {
        docModal.addEventListener('click', function(e) {
            const deepLearnBtn = e.target.closest('.deep-learn');
            if (deepLearnBtn) {
                const project = deepLearnBtn.dataset.project;
                if (project) {
                    if (typeof window.closeDocs === 'function') window.closeDocs();
                    if (typeof window.openDeepLearn === 'function') window.openDeepLearn(project);
                }
            }
        });
    }

    // Game cards
    document.querySelectorAll('.game-card').forEach(function(card) {
        const gameId = card.dataset.game;
        if (gameId) {
            card.addEventListener('click', function() {
                if (typeof window.openGame === 'function') window.openGame(gameId);
            });
        }
    });

    // Game start buttons
    const gameStarts = {
        'catcher-start': 'startCatcher',
        'sequence-start': 'startSequence',
        'match-start': 'startMatch',
        'fighter-start': 'startFighter',
        'racer-start': 'startRacer',
        'blaster-start': 'startBlaster',
        'defense-start': 'startDefensePrep',
        'stacker-start': 'startStacker'
    };

    Object.entries(gameStarts).forEach(function([id, fn]) {
        const btn = document.getElementById(id);
        if (btn && typeof window[fn] === 'function') {
            btn.addEventListener('click', window[fn]);
        }
    });

    // Game close/refresh buttons
    document.querySelectorAll('.game-close').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('.game-modal');
            if (modal) {
                const gameId = modal.id.replace('game-', '');
                if (typeof window.closeGame === 'function') window.closeGame(gameId);
            }
        });
    });

    document.querySelectorAll('.game-refresh').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('.game-modal');
            if (modal) {
                const gameId = modal.id.replace('game-', '');
                if (typeof window.resetGame === 'function') window.resetGame(gameId);
            }
        });
    });

    // Sequence buttons
    document.querySelectorAll('.sequence-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const step = this.dataset.step;
            if (step && typeof window.sequenceClick === 'function') window.sequenceClick(step);
        });
    });

    // Clicker upgrades
    document.querySelectorAll('.upgrade-btn').forEach(function(btn) {
        const upgradeId = btn.id.replace('upgrade-', '');
        if (upgradeId) {
            btn.addEventListener('click', function() {
                if (typeof window.buyUpgrade === 'function') window.buyUpgrade(upgradeId);
            });
        }
    });

    // Burn clicker button
    const clickerBtn = document.getElementById('clicker-btn');
    if (clickerBtn) {
        clickerBtn.addEventListener('click', function() {
            if (typeof window.clickBurn === 'function') window.clickBurn();
        });
    }

    // Blaster arena
    const blasterArena = document.getElementById('blaster-arena');
    if (blasterArena) {
        blasterArena.addEventListener('click', function() {
            if (typeof window.blasterShoot === 'function') window.blasterShoot();
        });
    }

    // Stacker area
    const stackerArea = document.getElementById('stacker-area');
    if (stackerArea) {
        stackerArea.addEventListener('click', function() {
            if (typeof window.stackerDrop === 'function') window.stackerDrop();
        });
    }

    // Defense tower buttons
    document.querySelectorAll('.defense-tower-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tower = this.id.replace('tower-', '');
            if (tower && typeof window.selectTower === 'function') window.selectTower(tower);
        });
    });

    // FAQ items
    document.querySelectorAll('.faq-item').forEach(function(item) {
        item.addEventListener('click', function() {
            if (typeof window.toggleFaq === 'function') window.toggleFaq(this);
        });
    });

    // Calculator - all inputs trigger calculateBurn
    const calcInputs = ['calc-position', 'calc-supply', 'calc-volume'];
    calcInputs.forEach(function(id) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                if (typeof window.calculateBurn === 'function') window.calculateBurn();
            });
        }
    });

    const calcPeriod = document.getElementById('calc-period');
    if (calcPeriod) {
        calcPeriod.addEventListener('change', function() {
            if (typeof window.calculateBurn === 'function') window.calculateBurn();
        });
    }

    // Glossary search
    const glossarySearch = document.getElementById('glossary-search');
    if (glossarySearch) {
        glossarySearch.addEventListener('input', function() {
            if (typeof window.filterGlossary === 'function') window.filterGlossary();
        });
    }

    // Eco cards with URLs
    document.querySelectorAll('.eco-card').forEach(function(card) {
        const url = card.dataset.url;
        if (url) {
            card.addEventListener('click', function() {
                window.open(url, '_blank', 'noopener,noreferrer');
            });
        }
    });

    // ============================================
    // EASTER EGG - Pill System Event Listeners
    // ============================================

    // Completion badge opens pill modal
    const completionBadge = document.getElementById('completion-badge');
    if (completionBadge) {
        completionBadge.addEventListener('click', function() {
            if (typeof window.showPillModal === 'function') {
                window.showPillModal();
            }
        });
    }

    // Pill "Yes" button - unlock home
    const pillYes = document.getElementById('pill-yes');
    if (pillYes) {
        pillYes.addEventListener('click', function() {
            if (typeof window.unlockHome === 'function') {
                window.unlockHome();
            }
        });
    }

    // Pill "No" button - reset progress
    const pillNo = document.getElementById('pill-no');
    if (pillNo) {
        pillNo.addEventListener('click', function() {
            if (typeof window.resetLearnProgress === 'function') {
                window.resetLearnProgress();
            }
        });
    }

    // Close pill modal on background click
    const pillModal = document.getElementById('pill-modal');
    if (pillModal) {
        pillModal.addEventListener('click', function(e) {
            if (e.target === pillModal && typeof window.hidePillModal === 'function') {
                window.hidePillModal();
            }
        });
    }

    // ============================================
    // GAMES - Leaderboard Tab Event Listeners
    // ============================================
    document.querySelectorAll('.leaderboard-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const period = this.dataset.period;
            if (period && typeof window.switchLeaderboardTab === 'function') {
                window.switchLeaderboardTab(period);
            }
        });
    });

    // ============================================
    // PROJECT FINDER - Build Section Quiz
    // ============================================
    const projectFinderBtn = document.getElementById('project-finder-btn');
    if (projectFinderBtn) {
        projectFinderBtn.addEventListener('click', function() {
            if (typeof window.openProjectFinder === 'function') {
                window.openProjectFinder();
            }
        });
    }

    const projectFinderClose = document.getElementById('project-finder-close');
    if (projectFinderClose) {
        projectFinderClose.addEventListener('click', function() {
            if (typeof window.closeProjectFinder === 'function') {
                window.closeProjectFinder();
            }
        });
    }

    const projectFinderRestart = document.getElementById('pf-restart-btn');
    if (projectFinderRestart) {
        projectFinderRestart.addEventListener('click', function() {
            if (typeof window.restartProjectFinder === 'function') {
                window.restartProjectFinder();
            }
        });
    }

    // Start Your Journey from Project Finder result
    const pfJourneyBtn = document.getElementById('pf-journey-btn');
    if (pfJourneyBtn) {
        pfJourneyBtn.addEventListener('click', function() {
            if (typeof window.startJourneyFromFinder === 'function') {
                window.startJourneyFromFinder();
            }
        });
    }

    // Close modal on background click
    const projectFinderModal = document.getElementById('project-finder-modal');
    if (projectFinderModal) {
        projectFinderModal.addEventListener('click', function(e) {
            if (e.target === projectFinderModal && typeof window.closeProjectFinder === 'function') {
                window.closeProjectFinder();
            }
        });
    }

    // ============================================
    // YOUR JOURNEY - Builder Training Platform
    // ============================================
    const yourJourneyBtn = document.getElementById('your-journey-btn');
    if (yourJourneyBtn) {
        yourJourneyBtn.addEventListener('click', function() {
            if (typeof window.openYourJourney === 'function') {
                window.openYourJourney();
            }
        });
    }

    const yjClose = document.getElementById('yj-close');
    if (yjClose) {
        yjClose.addEventListener('click', function() {
            if (typeof window.closeYourJourney === 'function') {
                window.closeYourJourney();
            }
        });
    }

    // Pillar selection buttons
    document.querySelectorAll('.yj-pillar').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const pillar = this.dataset.pillar;
            if (pillar && typeof window.selectJourneyPillar === 'function') {
                window.selectJourneyPillar(pillar);
            }
        });
    });

    // Roadmap step navigation
    document.querySelectorAll('.yj-roadmap-step').forEach(function(step) {
        step.addEventListener('click', function() {
            const moduleIndex = parseInt(this.dataset.module);
            if (!isNaN(moduleIndex) && typeof window.goToJourneyModule === 'function') {
                window.goToJourneyModule(moduleIndex);
            }
        });
    });

    // Module navigation buttons
    const yjPrevModule = document.getElementById('yj-prev-module');
    if (yjPrevModule) {
        yjPrevModule.addEventListener('click', function() {
            if (typeof window.journeyPrevModule === 'function') {
                window.journeyPrevModule();
            }
        });
    }

    const yjNextModule = document.getElementById('yj-next-module');
    if (yjNextModule) {
        yjNextModule.addEventListener('click', function() {
            if (typeof window.journeyNextModule === 'function') {
                window.journeyNextModule();
            }
        });
    }

    // Close modal on background click
    const yourJourneyModal = document.getElementById('your-journey-modal');
    if (yourJourneyModal) {
        yourJourneyModal.addEventListener('click', function(e) {
            if (e.target === yourJourneyModal && typeof window.closeYourJourney === 'function') {
                window.closeYourJourney();
            }
        });
    }

    // Stats panel
    const statsBtn = document.getElementById('yj-stats-btn');
    if (statsBtn) {
        statsBtn.addEventListener('click', function() {
            if (typeof window.openStatsPanel === 'function') {
                window.openStatsPanel();
            }
        });
    }

    const statsClose = document.getElementById('yj-stats-close');
    if (statsClose) {
        statsClose.addEventListener('click', function() {
            if (typeof window.closeStatsPanel === 'function') {
                window.closeStatsPanel();
            }
        });
    }

    // ============================================
    // GAMES SUB-NAVIGATION
    // Handle Hub, Games, Shop, Profile, Settings sub-tabs
    // ============================================

    /**
     * Switch between games sub-sections
     * @param {string} subView - The sub-view to show (hub, play, shop, profile, settings)
     */
    function switchGamesSubView(subView) {
        // Hide all sub-sections
        document.querySelectorAll('.games-sub-section').forEach(function(section) {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        // Show the target sub-section
        const targetSection = document.getElementById('games-sub-' + subView);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
        }

        // Update sub-tab active states
        document.querySelectorAll('.games-sub-tab').forEach(function(tab) {
            tab.classList.remove('active');
            tab.style.background = 'transparent';
            tab.style.color = 'var(--text-muted)';
        });

        const activeTab = document.querySelector('.games-sub-tab[data-games-view="' + subView + '"]');
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.background = 'var(--accent-fire)';
            activeTab.style.color = '#fff';
        }

        // Initialize shop if switching to shop view
        if (subView === 'shop' && window.ShopV2 && !window.ShopV2.initialized) {
            window.ShopV2.init({ containerId: 'shop-container' });
        }
    }

    // Expose function globally
    window.switchGamesSubView = switchGamesSubView;

    // Games sub-tab click handlers
    document.querySelectorAll('.games-sub-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            const subView = this.dataset.gamesView;
            if (subView) {
                switchGamesSubView(subView);
            }
        });
    });

    // Hub navigation card click handlers
    document.querySelectorAll('.hub-nav-card').forEach(function(card) {
        card.addEventListener('click', function() {
            const subView = this.dataset.gamesView;
            if (subView) {
                switchGamesSubView(subView);
            }
        });

        // Hover effect
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.borderColor = 'var(--accent-fire)';
            this.style.boxShadow = '0 0 30px rgba(234, 88, 12, 0.3)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.borderColor = 'var(--border-rust)';
            this.style.boxShadow = '';
        });
    });
});
