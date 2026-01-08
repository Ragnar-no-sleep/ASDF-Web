/**
 * Learn ASDF - Interactive Guide
 * Handles navigation, quizzes, XP, badges
 */

(function() {
    'use strict';

    // =============================================
    // STATE
    // =============================================
    let totalXP = parseInt(localStorage.getItem('asdf-learn-xp')) || 0;
    let currentLevel = 1;
    let perfectRun = true;
    let completedSections = JSON.parse(localStorage.getItem('asdf-learn-sections')) || [];
    let unlockedBadges = JSON.parse(localStorage.getItem('asdf-learn-badges')) || [];

    // =============================================
    // DOM ELEMENTS
    // =============================================
    const navXP = document.getElementById('nav-xp');
    const totalXPEl = document.getElementById('total-xp');
    const achievementPopup = document.getElementById('achievement-popup');

    // =============================================
    // UTILITY FUNCTIONS
    // =============================================

    // Update XP display
    function updateXP(amount) {
        totalXP += amount;
        if (navXP) navXP.textContent = totalXP + ' XP';
        if (totalXPEl) totalXPEl.textContent = totalXP + ' XP';
        localStorage.setItem('asdf-learn-xp', totalXP);
    }

    // Show achievement popup
    function showAchievement(icon, title, subtitle, xp) {
        if (!achievementPopup) return;

        document.getElementById('achievement-icon').innerHTML = icon;
        document.getElementById('achievement-title').textContent = title;
        document.getElementById('achievement-subtitle').textContent = subtitle;
        document.getElementById('achievement-xp').textContent = '+' + xp + ' XP';

        achievementPopup.classList.add('show');
        setTimeout(() => achievementPopup.classList.remove('show'), 4000);
    }

    // Unlock badge
    function unlockBadge(badgeId, showPopup = true) {
        const badge = document.getElementById(badgeId);
        if (badge && badge.classList.contains('locked')) {
            badge.classList.remove('locked');
            badge.classList.add('unlocked');

            if (!unlockedBadges.includes(badgeId)) {
                unlockedBadges.push(badgeId);
                localStorage.setItem('asdf-learn-badges', JSON.stringify(unlockedBadges));
            }

            if (showPopup) {
                const badgeName = badge.querySelector('.badge-name')?.textContent || 'Badge';
                showAchievement('🏆', badgeName + ' Unlocked!', 'You earned a new badge', 25);
                updateXP(25);
            }
        }
    }

    // Mark section as completed
    function completeSection(sectionId) {
        if (!completedSections.includes(sectionId)) {
            completedSections.push(sectionId);
            localStorage.setItem('asdf-learn-sections', JSON.stringify(completedSections));

            // Update progress step
            const step = document.querySelector(`.progress-step[data-section="${sectionId}"]`);
            if (step) {
                step.classList.add('completed');
            }
        }
    }

    // =============================================
    // VIEW SWITCHING
    // =============================================

    function switchView(viewId) {
        // Update tabs
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewId);
        });

        // Update sections
        document.querySelectorAll('.view-section').forEach(section => {
            const isActive = section.id === 'view-' + viewId;
            section.classList.toggle('active', isActive);
        });

        // Update sidebar progress
        document.querySelectorAll('.progress-step').forEach(step => {
            step.classList.toggle('active', step.dataset.section === viewId);
        });

        // Award XP for visiting new sections
        if (!completedSections.includes(viewId) && ['what', 'why', 'process'].includes(viewId)) {
            updateXP(25);
            completeSection(viewId);

            // Check for reader badge (visited all intro sections)
            if (completedSections.includes('what') && completedSections.includes('why') && completedSections.includes('process')) {
                unlockBadge('badge-reader');
            }
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Make switchView globally accessible
    window.switchView = switchView;

    // =============================================
    // QUIZ HANDLING
    // =============================================

    function startLevel(level) {
        document.querySelectorAll('.quiz-level').forEach(l => l.style.display = 'none');
        const levelEl = document.getElementById('quiz-level-' + level);
        if (levelEl) {
            levelEl.style.display = 'block';
            currentLevel = level;
        }
    }

    // Make startLevel globally accessible
    window.startLevel = startLevel;

    function handleQuizOption(optionsContainer, option) {
        if (optionsContainer.classList.contains('answered')) return;

        const isCorrect = option.dataset.correct === 'true';
        const feedbackId = optionsContainer.id.replace('-options', '-feedback');
        const feedback = document.getElementById(feedbackId);

        // Mark option
        option.classList.add(isCorrect ? 'correct' : 'wrong');
        optionsContainer.classList.add('answered');

        // Show correct answer if wrong
        if (!isCorrect) {
            perfectRun = false;
            optionsContainer.querySelectorAll('[data-correct="true"]').forEach(c => c.classList.add('correct'));
        }

        // Show feedback
        if (feedback) {
            feedback.textContent = isCorrect ? 'Correct! +25 XP' : 'Not quite. The correct answer is highlighted.';
            feedback.className = 'quiz-feedback show ' + (isCorrect ? 'success' : 'error');
        }

        // Award XP
        if (isCorrect) updateXP(25);

        // Progress quiz
        const quizId = optionsContainer.id;

        // Determine which question this is
        const levelMatch = quizId.match(/quiz-(\d+)/);
        const isSecondQuestion = quizId.includes('-2-');

        if (levelMatch) {
            const level = parseInt(levelMatch[1]);

            if (!isSecondQuestion) {
                // First question - show second question
                setTimeout(() => {
                    const nextQ = document.getElementById('quiz-' + level + '-2');
                    if (nextQ) nextQ.style.display = 'block';
                }, 1000);
            } else {
                // Second question - level complete
                setTimeout(() => {
                    const completeEl = document.getElementById('level-' + level + '-complete');
                    if (completeEl) completeEl.classList.add('show');

                    if (level === 3) {
                        // Final level complete
                        unlockBadge('badge-quiz');
                        completeSection('quiz');

                        // Unlock Play section
                        const playStep = document.querySelector('[data-section="play"]');
                        if (playStep) playStep.classList.remove('locked');

                        // Check for perfect badge
                        if (perfectRun) {
                            unlockBadge('badge-perfect');
                        }
                    }
                }, 1000);
            }
        }
    }

    // =============================================
    // FAQ ACCORDION
    // =============================================

    function toggleFAQ(questionEl) {
        const item = questionEl.closest('.faq-item');
        if (item) {
            item.classList.toggle('open');
        }
    }

    // =============================================
    // GLOSSARY SEARCH
    // =============================================

    function filterGlossary(searchTerm) {
        const term = searchTerm.toLowerCase();
        document.querySelectorAll('.glossary-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    }

    // =============================================
    // HOLDER JOURNEY
    // =============================================

    function startJourney() {
        const intro = document.getElementById('journey-intro');
        const game = document.getElementById('journey-game');

        if (intro && game) {
            intro.style.display = 'none';
            game.style.display = 'block';

            // Load journey game content
            loadJourneyGame();
        }
    }

    function loadJourneyGame() {
        // Simplified journey - can be expanded later
        const game = document.getElementById('journey-game');
        if (!game) return;

        game.innerHTML = `
            <div class="journey-game-container" style="max-width: 600px; margin: 0 auto;">
                <div class="journey-stats-bar" style="display: flex; justify-content: space-around; padding: var(--space-4); background: var(--bg-surface); border-radius: var(--radius-lg); margin-bottom: var(--space-6);">
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">💎</div>
                        <div style="font-family: var(--font-mono); color: var(--accent);" id="j-diamond">50</div>
                        <div style="font-size: 10px; color: var(--text-tertiary);">Diamond</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">🧠</div>
                        <div style="font-family: var(--font-mono); color: var(--accent);" id="j-knowledge">20</div>
                        <div style="font-size: 10px; color: var(--text-tertiary);">Knowledge</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">🤝</div>
                        <div style="font-family: var(--font-mono); color: var(--accent);" id="j-community">30</div>
                        <div style="font-size: 10px; color: var(--text-tertiary);">Community</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px;">💰</div>
                        <div style="font-family: var(--font-mono); color: var(--accent);" id="j-portfolio">1,000</div>
                        <div style="font-size: 10px; color: var(--text-tertiary);">ASDF</div>
                    </div>
                </div>

                <div class="journey-chapter" style="text-align: center; margin-bottom: var(--space-4);">
                    <span style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-tertiary);">CHAPTER <span id="j-chapter">1</span>/7</span>
                </div>

                <div class="journey-story" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: var(--space-8); margin-bottom: var(--space-6);">
                    <div style="font-size: 48px; text-align: center; margin-bottom: var(--space-4);" id="j-icon">🐕</div>
                    <h3 style="text-align: center; margin-bottom: var(--space-4);" id="j-title">The First Buy</h3>
                    <p style="color: var(--text-secondary); line-height: 1.7;" id="j-text">
                        You've just discovered ASDF on Twitter. The meme caught your eye - a dog sitting in a burning room, drinking coffee. "This is fine."
                        <br><br>
                        You have 1,000 USDC to invest. ASDF is at $0.001. The chart looks volatile, but the burn mechanism sounds interesting...
                    </p>
                </div>

                <div class="journey-choices" id="j-choices" style="display: flex; flex-direction: column; gap: var(--space-3);">
                    <button class="btn btn-secondary" style="width: 100%; text-align: left; padding: var(--space-4);" onclick="journeyChoice(1)">
                        🚀 Go all in! Buy 1,000,000 ASDF
                    </button>
                    <button class="btn btn-secondary" style="width: 100%; text-align: left; padding: var(--space-4);" onclick="journeyChoice(2)">
                        🧠 Research first - read the docs and check Solscan
                    </button>
                    <button class="btn btn-secondary" style="width: 100%; text-align: left; padding: var(--space-4);" onclick="journeyChoice(3)">
                        💎 Buy a small bag to test (100,000 ASDF)
                    </button>
                </div>
            </div>
        `;
    }

    // Journey story data
    const journeyStory = {
        1: {
            icon: '🐕',
            title: 'The First Buy',
            text: 'You\'ve just discovered ASDF on Twitter. The meme caught your eye - a dog sitting in a burning room, drinking coffee. "This is fine."<br><br>You have 1,000 USDC to invest. ASDF is at $0.001. The chart looks volatile, but the burn mechanism sounds interesting...',
            choices: [
                { text: '🚀 Go all in! Buy 1,000,000 ASDF', effects: { diamond: -20, portfolio: 1000000 } },
                { text: '🧠 Research first - read the docs and check Solscan', effects: { knowledge: +30, diamond: +10 } },
                { text: '💎 Buy a small bag to test (100,000 ASDF)', effects: { diamond: +10, portfolio: 100000 } }
            ]
        },
        2: {
            icon: '📉',
            title: 'The First Dip',
            text: 'A whale just dumped 50M tokens. The chart is -40% in an hour. Twitter is full of FUD. Your portfolio is down significantly.<br><br>What do you do?',
            choices: [
                { text: '😱 Panic sell everything!', effects: { diamond: -30, portfolio: -50, community: -20 } },
                { text: '🔥 Check if burns are still happening', effects: { knowledge: +20, diamond: +20 } },
                { text: '💎 Diamond hands - HODL and wait', effects: { diamond: +30 } }
            ]
        },
        3: {
            icon: '🔥',
            title: 'Burn Cycle',
            text: 'You notice a large burn just happened - 500K tokens permanently removed. The daemon is working. Some community members are celebrating.<br><br>How do you react?',
            choices: [
                { text: '🎉 Share the news and celebrate with community', effects: { community: +30, knowledge: +10 } },
                { text: '📊 Verify the burn on Solscan yourself', effects: { knowledge: +30, diamond: +10 } },
                { text: '🛒 Buy more during the excitement', effects: { diamond: -10, portfolio: 200000 } }
            ]
        },
        4: {
            icon: '🏗️',
            title: 'Ecosystem Growth',
            text: 'New tools are launching in the ecosystem - Forecast for predictions, HolDex for analytics. Each generates fees that fuel more burns.<br><br>What\'s your move?',
            choices: [
                { text: '🔨 Try building something yourself', effects: { knowledge: +40, community: +20 } },
                { text: '📈 Use the tools and provide feedback', effects: { community: +30, knowledge: +20 } },
                { text: '💰 Just hold and watch the burns', effects: { diamond: +20 } }
            ]
        },
        5: {
            icon: '🐋',
            title: 'Whale Alert',
            text: 'A massive wallet is accumulating. Speculation is rampant - is it an exchange? An insider? The community is divided.<br><br>What\'s your stance?',
            choices: [
                { text: '🏃 Follow the whale - buy more!', effects: { diamond: -20, portfolio: 300000 } },
                { text: '🧐 Analyze wallet history on-chain', effects: { knowledge: +30 } },
                { text: '🤝 Discuss with community, stay rational', effects: { community: +30, diamond: +20 } }
            ]
        },
        6: {
            icon: '🎢',
            title: 'Market Mania',
            text: 'Bull market is here! ASDF is up 500%. Your portfolio is worth more than you ever imagined. Everyone is euphoric.<br><br>This is fine... right?',
            choices: [
                { text: '🎰 FOMO buy at the top', effects: { diamond: -40, portfolio: 500000 } },
                { text: '💡 Take some profits, keep some', effects: { knowledge: +20, portfolio: -30 } },
                { text: '💎 HODL everything - true diamond hands', effects: { diamond: +40 } }
            ]
        },
        7: {
            icon: '🏆',
            title: 'The Final Test',
            text: 'After months of holding, learning, and participating, you\'ve seen it all. The burns continue. The ecosystem grows. The community strengthens.<br><br>What did you learn?',
            choices: [
                { text: '🔥 This is fine - trust the process', effects: { diamond: +50, knowledge: +50, community: +50 } },
                { text: '📚 DYOR is everything', effects: { knowledge: +100 } },
                { text: '🤝 Community makes the difference', effects: { community: +100 } }
            ]
        }
    };

    let journeyState = {
        chapter: 1,
        stats: { diamond: 50, knowledge: 20, community: 30, portfolio: 1000 }
    };

    window.journeyChoice = function(choiceIndex) {
        const chapter = journeyStory[journeyState.chapter];
        if (!chapter) return;

        const choice = chapter.choices[choiceIndex - 1];
        if (!choice) return;

        // Apply effects
        Object.keys(choice.effects).forEach(stat => {
            journeyState.stats[stat] = Math.max(0, Math.min(100, journeyState.stats[stat] + choice.effects[stat]));
        });

        // Update UI
        updateJourneyStats();

        // Next chapter or end
        journeyState.chapter++;

        if (journeyState.chapter > 7) {
            endJourney();
        } else {
            setTimeout(() => showJourneyChapter(journeyState.chapter), 500);
        }
    };

    function updateJourneyStats() {
        const diamond = document.getElementById('j-diamond');
        const knowledge = document.getElementById('j-knowledge');
        const community = document.getElementById('j-community');
        const portfolio = document.getElementById('j-portfolio');

        if (diamond) diamond.textContent = journeyState.stats.diamond;
        if (knowledge) knowledge.textContent = journeyState.stats.knowledge;
        if (community) community.textContent = journeyState.stats.community;
        if (portfolio) portfolio.textContent = journeyState.stats.portfolio.toLocaleString();
    }

    function showJourneyChapter(chapterNum) {
        const chapter = journeyStory[chapterNum];
        if (!chapter) return;

        document.getElementById('j-chapter').textContent = chapterNum;
        document.getElementById('j-icon').textContent = chapter.icon;
        document.getElementById('j-title').textContent = chapter.title;
        document.getElementById('j-text').innerHTML = chapter.text;

        const choicesEl = document.getElementById('j-choices');
        choicesEl.innerHTML = chapter.choices.map((c, i) => `
            <button class="btn btn-secondary" style="width: 100%; text-align: left; padding: var(--space-4);" onclick="journeyChoice(${i + 1})">
                ${c.text}
            </button>
        `).join('');
    }

    function endJourney() {
        const game = document.getElementById('journey-game');
        const stats = journeyState.stats;

        // Determine archetype
        let archetype = { icon: '🐕', name: 'Survivor', desc: 'You made it through the chaos.' };

        if (stats.diamond >= 80) {
            archetype = { icon: '💎', name: 'Diamond Hand Legend', desc: 'Unshakeable conviction. Nothing phases you.' };
        } else if (stats.knowledge >= 80) {
            archetype = { icon: '🧠', name: 'Scholar', desc: 'Knowledge is power. You understand the ecosystem deeply.' };
        } else if (stats.community >= 80) {
            archetype = { icon: '🤝', name: 'Community Leader', desc: 'The heart of the ecosystem. You bring people together.' };
        } else if (stats.portfolio >= 500000) {
            archetype = { icon: '🐋', name: 'Whale', desc: 'Massive bags. You believe in the vision.' };
        }

        game.innerHTML = `
            <div style="text-align: center; padding: var(--space-12);">
                <div style="font-size: 64px; margin-bottom: var(--space-4);">${archetype.icon}</div>
                <h2 style="margin-bottom: var(--space-2);">Journey Complete!</h2>
                <p style="color: var(--text-secondary); margin-bottom: var(--space-6);">${archetype.desc}</p>

                <div style="display: inline-block; padding: var(--space-6); background: var(--accent-soft); border: 1px solid var(--accent); border-radius: var(--radius-lg); margin-bottom: var(--space-6);">
                    <div style="font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-2);">Your Archetype</div>
                    <div style="font-size: var(--text-xl); font-weight: var(--font-bold); color: var(--accent);">${archetype.name}</div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); max-width: 500px; margin: 0 auto var(--space-8);">
                    <div style="padding: var(--space-4); background: var(--bg-surface); border-radius: var(--radius-md);">
                        <div style="font-size: 24px;">💎</div>
                        <div style="font-family: var(--font-mono); font-weight: bold;">${stats.diamond}</div>
                    </div>
                    <div style="padding: var(--space-4); background: var(--bg-surface); border-radius: var(--radius-md);">
                        <div style="font-size: 24px;">🧠</div>
                        <div style="font-family: var(--font-mono); font-weight: bold;">${stats.knowledge}</div>
                    </div>
                    <div style="padding: var(--space-4); background: var(--bg-surface); border-radius: var(--radius-md);">
                        <div style="font-size: 24px;">🤝</div>
                        <div style="font-family: var(--font-mono); font-weight: bold;">${stats.community}</div>
                    </div>
                    <div style="padding: var(--space-4); background: var(--bg-surface); border-radius: var(--radius-md);">
                        <div style="font-size: 24px;">💰</div>
                        <div style="font-family: var(--font-mono); font-weight: bold;">${stats.portfolio.toLocaleString()}</div>
                    </div>
                </div>

                <button class="btn btn-primary" onclick="location.reload()">Play Again</button>
            </div>
        `;

        // Award XP and badge
        updateXP(100);
        unlockBadge('badge-journey');
        completeSection('play');

        // Check for master badge
        if (unlockedBadges.length >= 5) {
            unlockBadge('badge-master');
        }
    }

    // =============================================
    // ANALYTICS - Live Data
    // =============================================

    async function loadAnalyticsData() {
        try {
            // Fetch burns data from API
            const response = await fetch('/api/burns/stats');
            if (!response.ok) throw new Error('Failed to fetch burns data');

            const data = await response.json();

            // Update stats
            const totalBurned = document.getElementById('stat-total-burned');
            const burnPct = document.getElementById('stat-burn-pct');
            const cycles = document.getElementById('stat-cycles');
            const lastBurn = document.getElementById('stat-last-burn');

            if (totalBurned && data.totalBurned) {
                totalBurned.textContent = formatNumber(data.totalBurned);
            }
            if (burnPct && data.burnPercentage) {
                burnPct.textContent = data.burnPercentage.toFixed(1) + '%';
            }
            if (cycles && data.cycleCount) {
                cycles.textContent = data.cycleCount;
            }
            if (lastBurn && data.lastBurnTime) {
                lastBurn.textContent = timeAgo(new Date(data.lastBurnTime));
            }

            // Load recent burns
            loadRecentBurns();
        } catch (err) {
            console.log('Analytics data not available:', err.message);
            // Show fallback data
            const totalBurned = document.getElementById('stat-total-burned');
            if (totalBurned) totalBurned.textContent = '~80M';
        }
    }

    async function loadRecentBurns() {
        try {
            const response = await fetch('/api/burns/recent?limit=5');
            if (!response.ok) throw new Error('Failed to fetch recent burns');

            const burns = await response.json();
            const container = document.getElementById('recent-burns-list');
            if (!container || !burns.length) return;

            container.innerHTML = burns.map(burn => `
                <div class="burn-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); background: var(--bg-hover); border-radius: var(--radius-md);">
                    <div style="display: flex; align-items: center; gap: var(--space-3);">
                        <span style="font-size: var(--text-xl);">&#128293;</span>
                        <div>
                            <div style="font-family: var(--font-mono); font-weight: var(--font-semibold);">${formatNumber(burn.amount)} ASDF</div>
                            <div style="font-size: var(--text-xs); color: var(--text-tertiary);">${timeAgo(new Date(burn.timestamp))}</div>
                        </div>
                    </div>
                    <a href="https://solscan.io/tx/${burn.signature}" target="_blank" rel="noopener" style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent); text-decoration: none;">
                        Verify &#8599;
                    </a>
                </div>
            `).join('');
        } catch (err) {
            console.log('Recent burns not available:', err.message);
        }
    }

    function formatNumber(num) {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toLocaleString();
    }

    function timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return seconds + 's';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + 'm';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + 'h';
        const days = Math.floor(hours / 24);
        return days + 'd';
    }

    // =============================================
    // INITIALIZATION
    // =============================================

    function init() {
        // Update XP display
        updateXP(0);

        // Load analytics data
        loadAnalyticsData();

        // Restore unlocked badges
        unlockedBadges.forEach(badgeId => {
            const badge = document.getElementById(badgeId);
            if (badge) {
                badge.classList.remove('locked');
                badge.classList.add('unlocked');
            }
        });

        // Restore completed sections
        completedSections.forEach(sectionId => {
            const step = document.querySelector(`.progress-step[data-section="${sectionId}"]`);
            if (step) step.classList.add('completed');
        });

        // If quiz completed, unlock play
        if (completedSections.includes('quiz')) {
            const playStep = document.querySelector('[data-section="play"]');
            if (playStep) playStep.classList.remove('locked');
        }

        // Tab click handlers
        document.querySelectorAll('.section-tab').forEach(tab => {
            tab.addEventListener('click', () => switchView(tab.dataset.view));
        });

        // Progress step click handlers
        document.querySelectorAll('.progress-step').forEach(step => {
            step.addEventListener('click', () => {
                if (!step.classList.contains('locked')) {
                    switchView(step.dataset.section);
                }
            });
        });

        // Quiz option handlers
        document.querySelectorAll('.quiz-options').forEach(optionsContainer => {
            optionsContainer.querySelectorAll('.quiz-option').forEach(option => {
                option.addEventListener('click', function() {
                    handleQuizOption(optionsContainer, this);
                });
            });
        });

        // FAQ accordion handlers
        document.querySelectorAll('.faq-question').forEach(q => {
            q.addEventListener('click', () => toggleFAQ(q));
        });

        // Glossary search handler
        const glossarySearch = document.getElementById('glossary-search');
        if (glossarySearch) {
            glossarySearch.addEventListener('input', function() {
                filterGlossary(this.value);
            });
        }

        // Journey start button
        const journeyBtn = document.getElementById('journey-start-btn');
        if (journeyBtn) {
            journeyBtn.addEventListener('click', startJourney);
        }
    }

    // Run init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
