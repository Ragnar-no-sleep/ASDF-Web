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
            if (validViews.includes(viewName) && typeof switchView === 'function') {
                // Small delay to ensure DOM is fully ready
                setTimeout(function() {
                    switchView(viewName);
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
            switchView(viewName);
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
            if (level) goToLevel(level);
        });
    });

    // Reveal boxes
    document.querySelectorAll('.reveal-box').forEach(function(box) {
        box.addEventListener('click', function() {
            toggleReveal(this);
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
            checkAnswer(this, level, correct);
        });
    });

    // Unlock level buttons
    document.querySelectorAll('[id^="unlock-level-"]').forEach(function(btn) {
        const level = parseInt(btn.id.replace('unlock-level-', ''));
        btn.addEventListener('click', function() {
            unlockLevel(level);
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
                        goToLevel(currentLevel - 1);
                    });
                }
            }
        }
    });

    // Complete course button
    const completeCourseBtn = document.getElementById('complete-course');
    if (completeCourseBtn) {
        completeCourseBtn.addEventListener('click', completeCourse);
    }

    // Share completion button
    document.querySelectorAll('.btn-share').forEach(function(btn) {
        btn.addEventListener('click', shareCompletion);
    });

    // Reset progress button
    document.querySelectorAll('.btn').forEach(function(btn) {
        if (btn.textContent.includes('Reset Progress')) {
            btn.addEventListener('click', resetProgress);
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            const value = this.dataset.value;
            if (filter && value) filterProjects(filter, value);
        });
    });

    // Docs buttons
    document.querySelectorAll('.btn-docs').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const project = this.dataset.project || this.closest('.project-card')?.dataset.project;
            if (project) openDocs(project);
        });
    });

    // Close docs button
    document.querySelectorAll('.doc-close').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('#doc-modal');
            if (modal) closeDocs();
            const deepModal = this.closest('#deep-learn-modal');
            if (deepModal) closeDeepLearn();
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
                    closeDocs();
                    openDeepLearn(project);
                }
            }
        });
    }

    // Game cards
    document.querySelectorAll('.game-card').forEach(function(card) {
        const gameId = card.dataset.game;
        if (gameId) {
            card.addEventListener('click', function() {
                openGame(gameId);
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
                closeGame(gameId);
            }
        });
    });

    document.querySelectorAll('.game-refresh').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = this.closest('.game-modal');
            if (modal) {
                const gameId = modal.id.replace('game-', '');
                resetGame(gameId);
            }
        });
    });

    // Sequence buttons
    document.querySelectorAll('.sequence-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const step = this.dataset.step;
            if (step) sequenceClick(step);
        });
    });

    // Clicker upgrades
    document.querySelectorAll('.upgrade-btn').forEach(function(btn) {
        const upgradeId = btn.id.replace('upgrade-', '');
        if (upgradeId) {
            btn.addEventListener('click', function() {
                buyUpgrade(upgradeId);
            });
        }
    });

    // Burn clicker button
    const clickerBtn = document.getElementById('clicker-btn');
    if (clickerBtn) {
        clickerBtn.addEventListener('click', clickBurn);
    }

    // Blaster arena
    const blasterArena = document.getElementById('blaster-arena');
    if (blasterArena) {
        blasterArena.addEventListener('click', blasterShoot);
    }

    // Stacker area
    const stackerArea = document.getElementById('stacker-area');
    if (stackerArea) {
        stackerArea.addEventListener('click', stackerDrop);
    }

    // Defense tower buttons
    document.querySelectorAll('.defense-tower-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tower = this.id.replace('tower-', '');
            if (tower) selectTower(tower);
        });
    });

    // FAQ items
    document.querySelectorAll('.faq-item').forEach(function(item) {
        item.addEventListener('click', function() {
            toggleFaq(this);
        });
    });

    // Calculator - all inputs trigger calculateBurn
    const calcInputs = ['calc-position', 'calc-supply', 'calc-volume'];
    calcInputs.forEach(function(id) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calculateBurn);
        }
    });

    const calcPeriod = document.getElementById('calc-period');
    if (calcPeriod) {
        calcPeriod.addEventListener('change', calculateBurn);
    }

    // Glossary search
    const glossarySearch = document.getElementById('glossary-search');
    if (glossarySearch) {
        glossarySearch.addEventListener('input', filterGlossary);
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
            if (typeof showPillModal === 'function') {
                showPillModal();
            }
        });
    }

    // Pill "Yes" button - unlock home
    const pillYes = document.getElementById('pill-yes');
    if (pillYes) {
        pillYes.addEventListener('click', function() {
            if (typeof unlockHome === 'function') {
                unlockHome();
            }
        });
    }

    // Pill "No" button - reset progress
    const pillNo = document.getElementById('pill-no');
    if (pillNo) {
        pillNo.addEventListener('click', function() {
            if (typeof resetLearnProgress === 'function') {
                resetLearnProgress();
            }
        });
    }

    // Close pill modal on background click
    const pillModal = document.getElementById('pill-modal');
    if (pillModal) {
        pillModal.addEventListener('click', function(e) {
            if (e.target === pillModal && typeof hidePillModal === 'function') {
                hidePillModal();
            }
        });
    }

    // ============================================
    // GAMES - Leaderboard Tab Event Listeners
    // ============================================
    document.querySelectorAll('.leaderboard-tab').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const period = this.dataset.period;
            if (period && typeof switchLeaderboardTab === 'function') {
                switchLeaderboardTab(period);
            }
        });
    });
});
