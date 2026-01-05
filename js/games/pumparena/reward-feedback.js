/**
 * Pump Arena RPG - Reward Feedback System
 * Visual and audio feedback for rewards, achievements, and progression
 */

'use strict';

// ============================================
// REWARD FEEDBACK CSS
// ============================================

const REWARD_FEEDBACK_CSS = `
/* ============================================
   REWARD FEEDBACK CSS
   ============================================ */

/* XP Bar Progress */
.xp-bar-container {
    position: relative;
    width: 100%;
    height: 20px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid rgba(168, 85, 247, 0.3);
}

.xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #7c3aed, #a855f7);
    border-radius: 8px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
}

.xp-bar-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
    border-radius: 8px 8px 0 0;
}

.xp-bar-glow {
    animation: xpGlow 1s ease-out;
}

@keyframes xpGlow {
    0% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
    100% { box-shadow: none; }
}

.xp-gain-popup {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: #a855f7;
    font-weight: bold;
    font-size: 14px;
    animation: xpPopup 1.5s ease-out forwards;
}

@keyframes xpPopup {
    0% { opacity: 0; transform: translateY(-50%) translateX(20px); }
    20% { opacity: 1; transform: translateY(-50%) translateX(0); }
    80% { opacity: 1; }
    100% { opacity: 0; }
}

/* Token Reward Animation */
.token-reward-splash {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10006;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: tokenSplash 2s ease-out forwards;
}

@keyframes tokenSplash {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
    }
    20% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 1;
    }
    40% {
        transform: translate(-50%, -50%) scale(1);
    }
    80% {
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -50%) scale(0.8);
        opacity: 0;
    }
}

.token-icon-large {
    font-size: 80px;
    animation: tokenSpin 1s ease-out;
}

@keyframes tokenSpin {
    0% { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
}

.token-amount-large {
    font-size: 48px;
    font-weight: bold;
    color: #fbbf24;
    text-shadow: 0 0 20px #fbbf24, 3px 3px 0 #000;
    margin-top: 10px;
}

/* Achievement Unlock */
.achievement-unlock-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10007;
    animation: achievementFadeIn 0.5s ease-out;
}

@keyframes achievementFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.achievement-unlock-card {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 3px solid #fbbf24;
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    max-width: 400px;
    animation: achievementCardPop 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    box-shadow: 0 0 50px rgba(251, 191, 36, 0.3);
}

@keyframes achievementCardPop {
    0% { transform: scale(0) rotate(-10deg); }
    100% { transform: scale(1) rotate(0deg); }
}

.achievement-unlock-title {
    font-size: 18px;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 20px;
}

.achievement-unlock-icon {
    font-size: 80px;
    margin: 20px 0;
    animation: achievementIconBounce 0.8s ease-out infinite;
}

@keyframes achievementIconBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

.achievement-unlock-name {
    font-size: 28px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 10px;
}

.achievement-unlock-desc {
    font-size: 14px;
    color: #9ca3af;
    margin-bottom: 20px;
}

.achievement-unlock-rewards {
    display: flex;
    gap: 20px;
    justify-content: center;
    margin-top: 20px;
}

.achievement-reward-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
}

.achievement-reward-item .icon { font-size: 20px; }
.achievement-reward-item .value {
    color: #fbbf24;
    font-weight: bold;
}

/* Item Obtained */
.item-obtained-popup {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 20, 30, 0.95));
    border: 2px solid;
    border-radius: 16px;
    padding: 20px 30px;
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 10005;
    animation: itemPopupSlide 3s ease-out forwards;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.item-obtained-popup.common { border-color: #6b7280; }
.item-obtained-popup.uncommon { border-color: #22c55e; }
.item-obtained-popup.rare { border-color: #3b82f6; }
.item-obtained-popup.epic { border-color: #a855f7; }
.item-obtained-popup.legendary {
    border-color: #fbbf24;
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.3), 0 10px 40px rgba(0, 0, 0, 0.5);
}

@keyframes itemPopupSlide {
    0% {
        transform: translateX(-50%) translateY(50px);
        opacity: 0;
    }
    15% {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    85% {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    100% {
        transform: translateX(-50%) translateY(-20px);
        opacity: 0;
    }
}

.item-obtained-icon {
    font-size: 48px;
    animation: itemIconPulse 1s ease-in-out infinite;
}

@keyframes itemIconPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.item-obtained-info { flex: 1; }

.item-obtained-label {
    font-size: 12px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.item-obtained-name {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
}

.item-obtained-rarity {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.item-obtained-rarity.common { color: #6b7280; }
.item-obtained-rarity.uncommon { color: #22c55e; }
.item-obtained-rarity.rare { color: #3b82f6; }
.item-obtained-rarity.epic { color: #a855f7; }
.item-obtained-rarity.legendary { color: #fbbf24; }

/* Quest Complete Banner */
.quest-complete-banner {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(20, 20, 30, 0.95));
    border: 2px solid #22c55e;
    border-radius: 16px;
    padding: 20px 40px;
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 10004;
    animation: questBannerSlide 4s ease-out forwards;
    box-shadow: 0 10px 40px rgba(34, 197, 94, 0.2);
}

@keyframes questBannerSlide {
    0% {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
    }
    15% {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    85% {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    100% {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
    }
}

.quest-complete-icon {
    font-size: 40px;
    animation: questIconSpin 0.6s ease-out;
}

@keyframes questIconSpin {
    from { transform: rotate(0deg) scale(0); }
    to { transform: rotate(360deg) scale(1); }
}

.quest-complete-text {
    flex: 1;
}

.quest-complete-label {
    font-size: 12px;
    color: #22c55e;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.quest-complete-name {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
}

.quest-complete-rewards {
    display: flex;
    gap: 15px;
}

.quest-reward-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 15px;
    font-size: 14px;
}

.quest-reward-chip .icon { font-size: 16px; }
.quest-reward-chip .value { color: #fbbf24; font-weight: bold; }

/* Streak Counter */
.streak-display {
    position: fixed;
    top: 20px;
    left: 20px;
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(20, 20, 30, 0.95));
    border: 2px solid #ef4444;
    border-radius: 16px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 100;
    animation: streakPulse 2s ease-in-out infinite;
}

@keyframes streakPulse {
    0%, 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
    50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.6); }
}

.streak-icon { font-size: 32px; }
.streak-count {
    font-size: 28px;
    font-weight: bold;
    color: #ef4444;
}
.streak-label {
    font-size: 10px;
    color: #9ca3af;
    text-transform: uppercase;
}

/* Burn Token Animation */
.burn-token-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0.3) 0%, rgba(0, 0, 0, 0.9) 70%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10008;
    animation: burnOverlayFade 3s ease-out forwards;
}

@keyframes burnOverlayFade {
    0% { opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; }
}

.burn-token-icon {
    font-size: 100px;
    animation: burnTokenFlame 0.3s ease-in-out infinite alternate;
}

@keyframes burnTokenFlame {
    from { filter: brightness(1); transform: scale(1); }
    to { filter: brightness(1.3); transform: scale(1.05); }
}

.burn-token-amount {
    font-size: 48px;
    font-weight: bold;
    color: #ef4444;
    text-shadow: 0 0 30px #ef4444;
    margin-top: 20px;
}

.burn-token-text {
    font-size: 24px;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: 4px;
    margin-top: 10px;
}

/* Reputation Change */
.rep-change-indicator {
    position: fixed;
    bottom: 20px;
    left: 20px;
    padding: 12px 20px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10003;
    animation: repSlide 3s ease-out forwards;
}

.rep-change-indicator.positive {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(20, 20, 30, 0.95));
    border: 2px solid #22c55e;
}

.rep-change-indicator.negative {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(20, 20, 30, 0.95));
    border: 2px solid #ef4444;
}

@keyframes repSlide {
    0% {
        transform: translateX(-100px);
        opacity: 0;
    }
    15% {
        transform: translateX(0);
        opacity: 1;
    }
    85% {
        transform: translateX(0);
        opacity: 1;
    }
    100% {
        transform: translateX(-100px);
        opacity: 0;
    }
}

.rep-change-icon { font-size: 24px; }
.rep-change-value {
    font-size: 20px;
    font-weight: bold;
}
.rep-change-value.positive { color: #22c55e; }
.rep-change-value.negative { color: #ef4444; }

.rep-change-faction {
    font-size: 12px;
    color: #9ca3af;
}

/* Skill Unlock */
.skill-unlock-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(20, 20, 30, 0.98));
    border: 3px solid #a855f7;
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    z-index: 10007;
    animation: skillUnlockPop 2.5s ease-out forwards;
    box-shadow: 0 0 50px rgba(168, 85, 247, 0.5);
}

@keyframes skillUnlockPop {
    0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
    }
    20% {
        transform: translate(-50%, -50%) scale(1.1);
        opacity: 1;
    }
    30% {
        transform: translate(-50%, -50%) scale(1);
    }
    80% {
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0;
    }
}

.skill-unlock-title {
    font-size: 14px;
    color: #a855f7;
    text-transform: uppercase;
    letter-spacing: 3px;
}

.skill-unlock-icon {
    font-size: 60px;
    margin: 20px 0;
}

.skill-unlock-name {
    font-size: 24px;
    font-weight: bold;
    color: #fff;
}

.skill-unlock-desc {
    font-size: 14px;
    color: #9ca3af;
    margin-top: 10px;
    max-width: 300px;
}
`;

// Inject CSS
(function injectRewardFeedbackCSS() {
    if (document.getElementById('reward-feedback-css')) return;
    const style = document.createElement('style');
    style.id = 'reward-feedback-css';
    style.textContent = REWARD_FEEDBACK_CSS;
    document.head.appendChild(style);
})();

// ============================================
// REWARD FEEDBACK CLASS
// ============================================

class RewardFeedback {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    // ========================================
    // XP REWARDS
    // ========================================

    showXPGain(amount, xpBar = null) {
        // Floating text
        if (window.PremiumEffects) {
            const x = window.innerWidth - 200;
            const y = 100;
            window.PremiumEffects.floatingReward(x, y, amount, 'xp');
        }

        // XP bar animation
        if (xpBar) {
            xpBar.classList.add('xp-bar-glow');
            setTimeout(() => xpBar.classList.remove('xp-bar-glow'), 1000);

            const popup = document.createElement('span');
            popup.className = 'xp-gain-popup';
            popup.textContent = `+${amount} XP`;
            xpBar.parentElement.style.position = 'relative';
            xpBar.parentElement.appendChild(popup);
            setTimeout(() => popup.remove(), 1500);
        }

        // Sound
        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.playSuccess();
        }
    }

    // ========================================
    // TOKEN REWARDS
    // ========================================

    showTokenReward(amount, isBurn = false) {
        if (isBurn) {
            this.showBurnTokens(amount);
            return;
        }

        const splash = document.createElement('div');
        splash.className = 'token-reward-splash';
        splash.innerHTML = `
            <span class="token-icon-large">🪙</span>
            <span class="token-amount-large">+${amount.toLocaleString()}</span>
        `;
        document.body.appendChild(splash);

        // Particles
        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.confetti({
                colors: ['#fbbf24', '#f59e0b', '#d97706'],
                count: 30
            });
        }

        // Sound
        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.playCoins();
        }

        setTimeout(() => splash.remove(), 2000);
    }

    showBurnTokens(amount) {
        const overlay = document.createElement('div');
        overlay.className = 'burn-token-overlay';
        overlay.innerHTML = `
            <span class="burn-token-icon">🔥</span>
            <span class="burn-token-amount">${amount.toLocaleString()}</span>
            <span class="burn-token-text">Tokens Burned</span>
        `;
        document.body.appendChild(overlay);

        // Fire particles
        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.fire(
                window.innerWidth / 2,
                window.innerHeight / 2,
                2500
            );
        }

        // Screen effects
        if (window.PremiumEffects?.screen) {
            window.PremiumEffects.screen.flash('damage');
        }

        setTimeout(() => overlay.remove(), 3000);
    }

    // ========================================
    // ACHIEVEMENT UNLOCK
    // ========================================

    showAchievementUnlock(achievement) {
        const overlay = document.createElement('div');
        overlay.className = 'achievement-unlock-overlay';

        const rewardsHtml = [];
        if (achievement.rewards?.tokens) {
            rewardsHtml.push(`
                <div class="achievement-reward-item">
                    <span class="icon">🪙</span>
                    <span class="value">+${achievement.rewards.tokens}</span>
                </div>
            `);
        }
        if (achievement.rewards?.xp) {
            rewardsHtml.push(`
                <div class="achievement-reward-item">
                    <span class="icon">⭐</span>
                    <span class="value">+${achievement.rewards.xp} XP</span>
                </div>
            `);
        }

        overlay.innerHTML = `
            <div class="achievement-unlock-card">
                <div class="achievement-unlock-title">Achievement Unlocked!</div>
                <div class="achievement-unlock-icon">${achievement.icon || '🏆'}</div>
                <div class="achievement-unlock-name">${achievement.name}</div>
                <div class="achievement-unlock-desc">${achievement.description || ''}</div>
                <div class="achievement-unlock-rewards">${rewardsHtml.join('')}</div>
            </div>
        `;

        overlay.addEventListener('click', () => {
            overlay.style.animation = 'achievementFadeIn 0.3s ease-out reverse';
            setTimeout(() => overlay.remove(), 300);
        });

        document.body.appendChild(overlay);

        // Effects
        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.confetti({
                colors: ['#fbbf24', '#a855f7', '#22c55e'],
                count: 60
            });
        }

        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.playVictory();
        }
    }

    // ========================================
    // ITEM OBTAINED
    // ========================================

    showItemObtained(item) {
        const rarity = item.rarity || 'common';
        const popup = document.createElement('div');
        popup.className = `item-obtained-popup ${rarity}`;
        popup.innerHTML = `
            <span class="item-obtained-icon">${item.icon || '📦'}</span>
            <div class="item-obtained-info">
                <div class="item-obtained-label">Item Obtained</div>
                <div class="item-obtained-name">${item.name}</div>
                <div class="item-obtained-rarity ${rarity}">${rarity}</div>
            </div>
        `;

        document.body.appendChild(popup);

        // Sound based on rarity
        if (window.PremiumEffects?.audio) {
            if (rarity === 'legendary') {
                window.PremiumEffects.audio.playVictory();
            } else if (rarity === 'epic' || rarity === 'rare') {
                window.PremiumEffects.audio.playSuccess();
            } else {
                window.PremiumEffects.audio.playDrop();
            }
        }

        // Particles for rare+
        if (rarity !== 'common' && rarity !== 'uncommon' && window.PremiumEffects?.particles) {
            const colors = {
                rare: ['#3b82f6', '#60a5fa'],
                epic: ['#a855f7', '#c084fc'],
                legendary: ['#fbbf24', '#f59e0b']
            };
            window.PremiumEffects.particles.confetti({
                colors: colors[rarity] || ['#fff'],
                count: rarity === 'legendary' ? 40 : 20,
                y: window.innerHeight - 150
            });
        }

        setTimeout(() => popup.remove(), 3000);
    }

    // ========================================
    // QUEST COMPLETE
    // ========================================

    showQuestComplete(quest, rewards = {}) {
        const banner = document.createElement('div');
        banner.className = 'quest-complete-banner';

        const rewardChips = [];
        if (rewards.tokens) {
            rewardChips.push(`
                <div class="quest-reward-chip">
                    <span class="icon">🪙</span>
                    <span class="value">+${rewards.tokens}</span>
                </div>
            `);
        }
        if (rewards.xp) {
            rewardChips.push(`
                <div class="quest-reward-chip">
                    <span class="icon">⭐</span>
                    <span class="value">+${rewards.xp}</span>
                </div>
            `);
        }
        if (rewards.reputation) {
            rewardChips.push(`
                <div class="quest-reward-chip">
                    <span class="icon">📈</span>
                    <span class="value">+${rewards.reputation}</span>
                </div>
            `);
        }

        banner.innerHTML = `
            <span class="quest-complete-icon">✅</span>
            <div class="quest-complete-text">
                <div class="quest-complete-label">Quest Complete</div>
                <div class="quest-complete-name">${quest.name || quest}</div>
            </div>
            <div class="quest-complete-rewards">${rewardChips.join('')}</div>
        `;

        document.body.appendChild(banner);

        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.playSuccess();
        }

        setTimeout(() => banner.remove(), 4000);
    }

    // ========================================
    // REPUTATION CHANGE
    // ========================================

    showReputationChange(faction, amount) {
        const isPositive = amount > 0;
        const indicator = document.createElement('div');
        indicator.className = `rep-change-indicator ${isPositive ? 'positive' : 'negative'}`;
        indicator.innerHTML = `
            <span class="rep-change-icon">${isPositive ? '📈' : '📉'}</span>
            <span class="rep-change-value ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '+' : ''}${amount}
            </span>
            <span class="rep-change-faction">${faction} Rep</span>
        `;

        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 3000);
    }

    // ========================================
    // SKILL UNLOCK
    // ========================================

    showSkillUnlock(skill) {
        const popup = document.createElement('div');
        popup.className = 'skill-unlock-popup';
        popup.innerHTML = `
            <div class="skill-unlock-title">New Skill Unlocked!</div>
            <div class="skill-unlock-icon">${skill.icon || '⚡'}</div>
            <div class="skill-unlock-name">${skill.name}</div>
            <div class="skill-unlock-desc">${skill.description || ''}</div>
        `;

        document.body.appendChild(popup);

        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.sparkles(
                window.innerWidth / 2,
                window.innerHeight / 2 - 50,
                10
            );
        }

        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.playLevelUp();
        }

        setTimeout(() => popup.remove(), 2500);
    }

    // ========================================
    // STREAK DISPLAY
    // ========================================

    showStreak(count, type = 'daily') {
        let display = document.getElementById('streak-display');
        if (!display) {
            display = document.createElement('div');
            display.id = 'streak-display';
            display.className = 'streak-display';
            document.body.appendChild(display);
        }

        const icons = {
            daily: '🔥',
            win: '⚔️',
            combo: '💥'
        };

        const labels = {
            daily: 'Day Streak',
            win: 'Win Streak',
            combo: 'Combo'
        };

        display.innerHTML = `
            <span class="streak-icon">${icons[type] || '🔥'}</span>
            <div>
                <span class="streak-count">${count}</span>
                <span class="streak-label">${labels[type] || 'Streak'}</span>
            </div>
        `;

        // Refresh animation
        display.style.animation = 'none';
        display.offsetHeight; // Trigger reflow
        display.style.animation = 'streakPulse 2s ease-in-out infinite';
    }

    hideStreak() {
        const display = document.getElementById('streak-display');
        if (display) {
            display.remove();
        }
    }

    // ========================================
    // MULTI-REWARD BATCH
    // ========================================

    async showRewardsBatch(rewards) {
        const delay = (ms) => new Promise(r => setTimeout(r, ms));

        if (rewards.xp) {
            this.showXPGain(rewards.xp);
            await delay(500);
        }

        if (rewards.tokens) {
            this.showTokenReward(rewards.tokens);
            await delay(800);
        }

        if (rewards.burnTokens) {
            this.showBurnTokens(rewards.burnTokens);
            await delay(1500);
        }

        if (rewards.items && rewards.items.length) {
            for (const item of rewards.items) {
                this.showItemObtained(item);
                await delay(1000);
            }
        }

        if (rewards.reputation) {
            for (const [faction, amount] of Object.entries(rewards.reputation)) {
                this.showReputationChange(faction, amount);
                await delay(500);
            }
        }

        if (rewards.skills && rewards.skills.length) {
            for (const skill of rewards.skills) {
                this.showSkillUnlock(skill);
                await delay(1200);
            }
        }

        if (rewards.achievements && rewards.achievements.length) {
            for (const achievement of rewards.achievements) {
                this.showAchievementUnlock(achievement);
                await delay(2000);
            }
        }
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

const RewardFX = new RewardFeedback();

// Export
if (typeof window !== 'undefined') {
    window.RewardFeedback = RewardFeedback;
    window.RewardFX = RewardFX;
}
