/**
 * ASDF Games - Rewards Module
 *
 * Handles achievement notifications and XP display
 * Fibonacci-based reward values throughout
 *
 * @version 1.0.0
 */

'use strict';

// Fibonacci sequence for reward calculations
const REWARD_FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];

/**
 * Get Fibonacci number at index
 * @param {number} n - Index
 * @returns {number}
 */
function getFib(n) {
    if (n < 0) return 0;
    if (n < REWARD_FIB.length) return REWARD_FIB[n];
    return REWARD_FIB[REWARD_FIB.length - 1];
}

// ============================================
// RARITY CONFIGURATION
// ============================================

const RARITY_CONFIG = {
    common: {
        color: '#9CA3AF',
        glow: 'rgba(156, 163, 175, 0.4)',
        label: 'Common',
        icon: ''
    },
    uncommon: {
        color: '#22C55E',
        glow: 'rgba(34, 197, 94, 0.4)',
        label: 'Uncommon',
        icon: ''
    },
    rare: {
        color: '#3B82F6',
        glow: 'rgba(59, 130, 246, 0.5)',
        label: 'Rare',
        icon: ''
    },
    epic: {
        color: '#A855F7',
        glow: 'rgba(168, 85, 247, 0.5)',
        label: 'Epic',
        icon: ''
    },
    legendary: {
        color: '#F59E0B',
        glow: 'rgba(245, 158, 11, 0.6)',
        label: 'Legendary',
        icon: ''
    }
};

// ============================================
// ACHIEVEMENT NOTIFICATION QUEUE
// ============================================

const achievementQueue = [];
let isShowingAchievement = false;

/**
 * Show achievement notification
 * @param {Object} achievement - Achievement data
 */
function showAchievementNotification(achievement) {
    achievementQueue.push(achievement);

    if (!isShowingAchievement) {
        processAchievementQueue();
    }
}

/**
 * Process achievement notification queue
 */
function processAchievementQueue() {
    if (achievementQueue.length === 0) {
        isShowingAchievement = false;
        return;
    }

    isShowingAchievement = true;
    const achievement = achievementQueue.shift();
    const rarity = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,40,0.95) 100%);
        border: 2px solid ${rarity.color};
        border-radius: 12px;
        padding: 16px 20px;
        min-width: 300px;
        max-width: 400px;
        z-index: 10000;
        box-shadow: 0 0 30px ${rarity.glow}, 0 4px 20px rgba(0,0,0,0.5);
        transform: translateX(120%);
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: 'Inter', sans-serif;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, ${rarity.color}20 0%, ${rarity.color}40 100%);
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                border: 1px solid ${rarity.color}60;
            ">
                ${getAchievementIcon(achievement.icon)}
            </div>
            <div style="flex: 1;">
                <div style="
                    font-size: 11px;
                    font-weight: 600;
                    color: ${rarity.color};
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 4px;
                ">
                    ${rarity.icon} Achievement Unlocked!
                </div>
                <div style="
                    font-size: 16px;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 2px;
                ">
                    ${achievement.name}
                </div>
                <div style="
                    font-size: 12px;
                    color: #9CA3AF;
                ">
                    ${achievement.description || ''}
                </div>
            </div>
            ${achievement.xpReward ? `
                <div style="
                    background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                    color: #000;
                    padding: 6px 10px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 14px;
                ">
                    +${achievement.xpReward} XP
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
    });

    // Play sound if available
    if (typeof GameJuice !== 'undefined' && GameJuice.playSound) {
        const soundType = achievement.rarity === 'legendary' ? 'levelUp' :
                         achievement.rarity === 'epic' ? 'combo' : 'collect';
        GameJuice.playSound(soundType);
    }

    // Remove after delay (Fibonacci: 3.4 seconds)
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        setTimeout(() => {
            notification.remove();
            processAchievementQueue();
        }, 500);
    }, 3400);
}

/**
 * Get icon for achievement type
 * @param {string} iconType - Icon type
 * @returns {string} Emoji/icon
 */
function getAchievementIcon(iconType) {
    const icons = {
        // Burn icons
        flame: '',
        fire: '',
        bonfire: '',
        inferno: '',
        phoenix: '',
        diamond_flame: '',
        mega_flame: '',
        legendary_flame: '',

        // Game icons
        controller: '',
        gamepad: '',
        arcade: '',
        trophy: '',
        star: '',
        star_gold: '',
        crown: '',

        // Streak icons
        calendar: '',
        calendar_week: '',
        calendar_fire: '',
        eternal_flame: '',

        // Tier icons
        tier_spark: '',
        tier_flame: '',
        tier_blaze: '',
        tier_inferno: '',
        tier_phoenix: '',

        // Special icons
        badge_early: '',
        badge_og: '',
        shopping_bag: '',
        collection: '',

        // Default
        default: ''
    };

    return icons[iconType] || icons.default;
}

// ============================================
// XP NOTIFICATION
// ============================================

/**
 * Show XP gained notification
 * @param {number} xpGained - Amount of XP gained
 * @param {string} gameId - Game that awarded the XP
 * @param {Object} options - Additional options
 */
function showXpNotification(xpGained, gameId = null, options = {}) {
    if (xpGained <= 0) return;

    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,165,0,0.15) 100%);
        border: 1px solid rgba(255,215,0,0.4);
        border-radius: 8px;
        padding: 10px 16px;
        z-index: 9999;
        transform: translateX(120%);
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: 'Inter', sans-serif;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;"></span>
            <span style="
                color: #FFD700;
                font-weight: 700;
                font-size: 16px;
            ">+${xpGained} XP</span>
            ${options.multiplier ? `
                <span style="
                    background: rgba(255,215,0,0.2);
                    color: #FFD700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                ">${options.multiplier}x</span>
            ` : ''}
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
    });

    // Float up and fade out after 2.1 seconds (Fibonacci)
    setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 400);
    }, 2100);
}

// ============================================
// COMBO NOTIFICATION
// ============================================

/**
 * Show combo notification
 * @param {number} combo - Current combo count
 * @param {number} multiplier - Combo multiplier
 */
function showComboNotification(combo, multiplier) {
    // Remove existing combo notification
    const existing = document.querySelector('.combo-notification');
    if (existing) existing.remove();

    if (combo < 3) return;

    const notification = document.createElement('div');
    notification.className = 'combo-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%) scale(0.5);
        background: linear-gradient(135deg, rgba(255,100,0,0.9) 0%, rgba(255,50,0,0.9) 100%);
        border-radius: 12px;
        padding: 12px 24px;
        z-index: 9998;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-family: 'Inter', sans-serif;
        text-align: center;
    `;

    notification.innerHTML = `
        <div style="
            font-size: 24px;
            font-weight: 900;
            color: #fff;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
        ">
             ${combo}x COMBO!
        </div>
        <div style="
            font-size: 14px;
            color: rgba(255,255,255,0.8);
            margin-top: 4px;
        ">
            ${multiplier}x Multiplier
        </div>
    `;

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) scale(1)';
    });

    // Remove after 1.3 seconds (Fibonacci)
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) scale(0.8)';
        setTimeout(() => notification.remove(), 300);
    }, 1300);
}

// ============================================
// GAME OVER ACHIEVEMENTS DISPLAY
// ============================================

/**
 * Create achievements section for game over screen
 * @param {Object[]} achievements - Array of unlocked achievements
 * @returns {HTMLElement}
 */
function createGameOverAchievements(achievements) {
    if (!achievements || achievements.length === 0) return null;

    const container = document.createElement('div');
    container.className = 'game-over-achievements';
    container.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: rgba(255,215,0,0.1);
        border: 1px solid rgba(255,215,0,0.3);
        border-radius: 8px;
    `;

    container.innerHTML = `
        <div style="
            font-size: 12px;
            font-weight: 600;
            color: #FFD700;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        ">
             Achievements Unlocked
        </div>
        ${achievements.map(a => {
            const rarity = RARITY_CONFIG[a.rarity] || RARITY_CONFIG.common;
            return `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                ">
                    <span style="font-size: 16px;">${getAchievementIcon(a.icon)}</span>
                    <div style="flex: 1;">
                        <div style="
                            font-size: 13px;
                            font-weight: 600;
                            color: ${rarity.color};
                        ">${a.name}</div>
                    </div>
                    ${a.xpReward ? `
                        <span style="
                            color: #FFD700;
                            font-weight: 600;
                            font-size: 12px;
                        ">+${a.xpReward} XP</span>
                    ` : ''}
                </div>
            `;
        }).join('')}
    `;

    return container;
}

// ============================================
// REWARD PROCESSING
// ============================================

/**
 * Process score submission response
 * Handles achievements and XP from API response
 * @param {Object} response - API response from score submission
 * @param {string} gameId - Game ID
 */
function processScoreResponse(response, gameId) {
    // Show achievement notifications
    if (response.newAchievements && response.newAchievements.length > 0) {
        response.newAchievements.forEach((achievement, index) => {
            // Stagger notifications with Fibonacci delay
            setTimeout(() => {
                showAchievementNotification(achievement);
            }, index * getFib(7) * 100); // 1300ms between each
        });
    }

    // Return achievements for game over screen
    return response.newAchievements || [];
}

// ============================================
// CSS INJECTION
// ============================================

function injectRewardStyles() {
    if (document.getElementById('reward-styles')) return;

    const style = document.createElement('style');
    style.id = 'reward-styles';
    style.textContent = `
        @keyframes achievementPulse {
            0%, 100% { box-shadow: 0 0 20px var(--glow-color, rgba(255,215,0,0.3)); }
            50% { box-shadow: 0 0 40px var(--glow-color, rgba(255,215,0,0.5)); }
        }

        @keyframes xpFloat {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-20px); opacity: 0; }
        }

        .achievement-notification {
            animation: achievementPulse 2s ease-in-out infinite;
        }

        .game-over-achievements {
            animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;

    document.head.appendChild(style);
}

// Initialize styles on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectRewardStyles);
    } else {
        injectRewardStyles();
    }
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
    window.GameRewards = {
        // Notifications
        showAchievementNotification,
        showXpNotification,
        showComboNotification,

        // Game over
        createGameOverAchievements,

        // Processing
        processScoreResponse,

        // Utilities
        getAchievementIcon,
        getFib,

        // Config
        RARITY_CONFIG
    };
}
