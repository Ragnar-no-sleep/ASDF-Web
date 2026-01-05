/**
 * Pump Arena RPG - Effects Integration Layer
 * Connects premium effects, combat animations, and reward feedback
 * to existing game systems
 */

'use strict';

// ============================================
// EFFECTS INTEGRATION
// ============================================

const EffectsIntegration = {
    initialized: false,

    // ========================================
    // INITIALIZATION
    // ========================================

    init() {
        if (this.initialized) return;

        // Wait for DOM and other modules
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._setup());
        } else {
            this._setup();
        }
    },

    _setup() {
        this._hookBattleSystem();
        this._hookQuestSystem();
        this._hookAchievementSystem();
        this._hookLevelSystem();
        this._hookItemSystem();
        this._hookReputationSystem();
        this._hookSkillSystem();
        this._addUIEnhancements();

        this.initialized = true;
        console.log('✨ Effects Integration initialized');
    },

    // ========================================
    // BATTLE SYSTEM HOOKS
    // ========================================

    _hookBattleSystem() {
        // Hook into battle manager if available
        if (typeof window.PumpArenaBattle !== 'undefined') {
            const original = window.PumpArenaBattle;

            // Wrap battle result handlers
            if (original.handleVictory) {
                const origVictory = original.handleVictory.bind(original);
                original.handleVictory = (rewards) => {
                    this.onBattleVictory(rewards);
                    return origVictory(rewards);
                };
            }

            if (original.handleDefeat) {
                const origDefeat = original.handleDefeat.bind(original);
                original.handleDefeat = (message) => {
                    this.onBattleDefeat(message);
                    return origDefeat(message);
                };
            }
        }
    },

    onBattleVictory(rewards = {}) {
        // Victory overlay
        if (window.PremiumEffects) {
            window.PremiumEffects.victory(rewards);
        }

        // Reward feedback
        if (window.RewardFX && rewards) {
            setTimeout(() => {
                window.RewardFX.showRewardsBatch(rewards);
            }, 2000);
        }
    },

    onBattleDefeat(message) {
        if (window.PremiumEffects) {
            window.PremiumEffects.defeat(message);
        }
    },

    // Combat action effects
    onAttack(attacker, target, damage, type = 'physical', isCrit = false) {
        if (!window.CombatAnim) return;

        const targetEl = this._getUnitElement(target);
        const attackerEl = this._getUnitElement(attacker);

        if (attackerEl && targetEl) {
            // Use preset based on type
            const preset = window.BattleEffectPresets?.attacks[type];
            if (preset) {
                preset(window.CombatAnim, attackerEl, targetEl);
            }
        }

        // Show damage number
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            window.CombatAnim.showDamage(
                rect.left + rect.width / 2,
                rect.top,
                damage,
                type,
                isCrit
            );
        }
    },

    onHeal(target, amount) {
        if (!window.CombatAnim) return;

        const targetEl = this._getUnitElement(target);
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            window.CombatAnim.showHeal(rect.left + rect.width / 2, rect.top, amount);
            window.CombatAnim.applyBuff(targetEl);
        }
    },

    onMiss(target) {
        if (!window.CombatAnim) return;

        const targetEl = this._getUnitElement(target);
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            window.CombatAnim.showMiss(rect.left + rect.width / 2, rect.top);
            window.CombatAnim.dodge(targetEl);
        }
    },

    onBlock(target, amount) {
        if (!window.CombatAnim) return;

        const targetEl = this._getUnitElement(target);
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            window.CombatAnim.showBlocked(rect.left + rect.width / 2, rect.top, amount);
            window.CombatAnim.shield(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
    },

    onUnitDeath(unit) {
        if (!window.CombatAnim) return;

        const el = this._getUnitElement(unit);
        if (el) {
            window.CombatAnim.unitDeath(el);
        }
    },

    _getUnitElement(unit) {
        // Try to find element by unit ID or name
        if (typeof unit === 'string') {
            return document.querySelector(`[data-unit-id="${unit}"]`) ||
                   document.querySelector(`[data-unit="${unit}"]`);
        }
        if (unit?.element) return unit.element;
        if (unit?.id) return document.querySelector(`[data-unit-id="${unit.id}"]`);
        return null;
    },

    // ========================================
    // QUEST SYSTEM HOOKS
    // ========================================

    _hookQuestSystem() {
        // Hook PumpArenaQuestsExpanded if available
        if (typeof window.PumpArenaQuestsExpanded !== 'undefined') {
            const manager = window.PumpArenaQuestsExpanded;

            // Store original completeQuest if it exists
            if (manager.completeQuest) {
                const origComplete = manager.completeQuest.bind(manager);
                manager.completeQuest = (questId, choiceId) => {
                    const result = origComplete(questId, choiceId);
                    if (result) {
                        this.onQuestComplete(result);
                    }
                    return result;
                };
            }
        }
    },

    onQuestComplete(questData) {
        if (!window.RewardFX) return;

        const quest = questData.quest || questData;
        const rewards = questData.rewards || {};

        window.RewardFX.showQuestComplete(quest, rewards);

        // Show individual rewards after delay
        setTimeout(() => {
            if (rewards.items) {
                rewards.items.forEach((item, i) => {
                    setTimeout(() => {
                        window.RewardFX.showItemObtained(item);
                    }, i * 800);
                });
            }
        }, 1500);
    },

    // ========================================
    // ACHIEVEMENT SYSTEM HOOKS
    // ========================================

    _hookAchievementSystem() {
        if (typeof window.PumpArenaAchievements !== 'undefined') {
            const manager = window.PumpArenaAchievements;

            if (manager.unlockAchievement) {
                const origUnlock = manager.unlockAchievement.bind(manager);
                manager.unlockAchievement = (achievementId) => {
                    const result = origUnlock(achievementId);
                    if (result) {
                        this.onAchievementUnlock(result);
                    }
                    return result;
                };
            }
        }
    },

    onAchievementUnlock(achievement) {
        if (window.RewardFX) {
            window.RewardFX.showAchievementUnlock(achievement);
        }
    },

    // ========================================
    // LEVEL SYSTEM HOOKS
    // ========================================

    _hookLevelSystem() {
        // Hook the RPG state manager for level ups
        if (typeof window.RPGStateManager !== 'undefined') {
            const manager = window.RPGStateManager;

            // Watch for level changes
            if (manager.addXP) {
                const origAddXP = manager.addXP.bind(manager);
                manager.addXP = (amount) => {
                    const beforeLevel = manager.getState()?.level || 1;
                    const result = origAddXP(amount);
                    const afterLevel = manager.getState()?.level || 1;

                    // Show XP gain
                    this.onXPGain(amount);

                    // Check for level up
                    if (afterLevel > beforeLevel) {
                        this.onLevelUp(afterLevel, result?.bonuses);
                    }

                    return result;
                };
            }
        }
    },

    onXPGain(amount) {
        if (window.RewardFX) {
            const xpBar = document.querySelector('.xp-bar-fill, .xp-bar, [data-xp-bar]');
            window.RewardFX.showXPGain(amount, xpBar);
        }
    },

    onLevelUp(newLevel, bonuses = {}) {
        if (window.PremiumEffects) {
            window.PremiumEffects.levelUp(newLevel, bonuses);
        }
    },

    // ========================================
    // ITEM SYSTEM HOOKS
    // ========================================

    _hookItemSystem() {
        if (typeof window.PumpArenaInventory !== 'undefined') {
            const manager = window.PumpArenaInventory;

            if (manager.addItem) {
                const origAdd = manager.addItem.bind(manager);
                manager.addItem = (item) => {
                    const result = origAdd(item);
                    if (result) {
                        this.onItemObtained(item);
                    }
                    return result;
                };
            }
        }
    },

    onItemObtained(item) {
        if (window.RewardFX) {
            window.RewardFX.showItemObtained(item);
        }
    },

    // ========================================
    // REPUTATION SYSTEM HOOKS
    // ========================================

    _hookReputationSystem() {
        if (typeof window.PumpArenaFactions !== 'undefined') {
            const manager = window.PumpArenaFactions;

            if (manager.changeReputation) {
                const origChange = manager.changeReputation.bind(manager);
                manager.changeReputation = (factionId, amount) => {
                    const result = origChange(factionId, amount);
                    this.onReputationChange(factionId, amount);
                    return result;
                };
            }
        }
    },

    onReputationChange(faction, amount) {
        if (window.RewardFX && amount !== 0) {
            const factionName = this._getFactionName(faction);
            window.RewardFX.showReputationChange(factionName, amount);
        }
    },

    _getFactionName(factionId) {
        const names = {
            asdf: 'ASDF',
            safeyield: 'SafeYield',
            pixel_raiders: 'Pixel Raiders',
            based_collective: 'Based Collective',
            nodeforge: 'NodeForge',
            pump_lords: 'Pump Lords',
            bear_clan: 'Bear Clan',
            builders_guild: 'Builders Guild'
        };
        return names[factionId] || factionId;
    },

    // ========================================
    // SKILL SYSTEM HOOKS
    // ========================================

    _hookSkillSystem() {
        if (typeof window.PumpArenaFactionSkills !== 'undefined') {
            const manager = window.PumpArenaFactionSkills;

            if (manager.unlockSkill) {
                const origUnlock = manager.unlockSkill.bind(manager);
                manager.unlockSkill = (skillId) => {
                    const result = origUnlock(skillId);
                    if (result) {
                        const skill = manager.getAllSkills?.()[skillId];
                        if (skill) {
                            this.onSkillUnlock(skill);
                        }
                    }
                    return result;
                };
            }
        }
    },

    onSkillUnlock(skill) {
        if (window.RewardFX) {
            window.RewardFX.showSkillUnlock(skill);
        }
    },

    // ========================================
    // UI ENHANCEMENTS
    // ========================================

    _addUIEnhancements() {
        // Add ripple effect to buttons
        this._addRippleToButtons();

        // Add hover effects to cards
        this._addCardEffects();

        // Initialize audio on first interaction
        this._setupAudioInit();
    },

    _addRippleToButtons() {
        // Add ripple to game buttons
        document.querySelectorAll('.game-btn, .rpg-btn, .action-btn').forEach(btn => {
            if (window.PremiumEffects?.addRipple) {
                window.PremiumEffects.addRipple(btn);
            }
        });

        // Add click sounds
        document.addEventListener('click', (e) => {
            const isButton = e.target.matches('button, .btn, [role="button"]');
            if (isButton && window.PremiumEffects?.audio?.initialized) {
                window.PremiumEffects.audio.playClick();
            }
        });
    },

    _addCardEffects() {
        document.querySelectorAll('.card, .item-card, .skill-card').forEach(card => {
            card.classList.add('premium-card');
        });
    },

    _setupAudioInit() {
        const initAudio = () => {
            if (window.PremiumEffects?.initAudio) {
                window.PremiumEffects.initAudio();
            }
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        };

        document.addEventListener('click', initAudio, { once: true });
        document.addEventListener('keydown', initAudio, { once: true });
    },

    // ========================================
    // PUBLIC API - For manual triggers
    // ========================================

    // Token rewards
    showTokens(amount, isBurn = false) {
        if (window.RewardFX) {
            window.RewardFX.showTokenReward(amount, isBurn);
        }
    },

    // Burn tokens specifically
    burnTokens(amount) {
        if (window.RewardFX) {
            window.RewardFX.showBurnTokens(amount);
        }
    },

    // Show toast notification
    toast(message, type = 'info', title = '') {
        if (window.PremiumEffects?.toasts) {
            window.PremiumEffects.toasts.show({ message, type, title });
        }
    },

    // Success notification
    success(message, title = 'Success') {
        this.toast(message, 'success', title);
    },

    // Error notification
    error(message, title = 'Error') {
        this.toast(message, 'error', title);
    },

    // Warning notification
    warning(message, title = 'Warning') {
        this.toast(message, 'warning', title);
    },

    // Show loading screen
    showLoading(message = 'Loading...') {
        if (window.PremiumEffects?.loading) {
            window.PremiumEffects.loading.show(message);
        }
    },

    // Hide loading screen
    hideLoading() {
        if (window.PremiumEffects?.loading) {
            window.PremiumEffects.loading.hide();
        }
    },

    // Confetti celebration
    celebrate() {
        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.confetti({ count: 80 });
        }
    },

    // Fire effect
    fire(x, y, duration = 2000) {
        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.fire(x, y, duration);
        }
    },

    // Screen shake
    shake(intensity = 'normal') {
        if (window.PremiumEffects?.screen) {
            window.PremiumEffects.screen.shake(intensity);
        }
    },

    // Screen flash
    flash(type = 'damage') {
        if (window.PremiumEffects?.screen) {
            window.PremiumEffects.screen.flash(type);
        }
    },

    // Show streak
    showStreak(count, type = 'daily') {
        if (window.RewardFX) {
            window.RewardFX.showStreak(count, type);
        }
    },

    // Loot drop reveal
    showLoot(items) {
        if (window.PremiumEffects) {
            window.PremiumEffects.lootDrop(items);
        }
    },

    // ========================================
    // SETTINGS
    // ========================================

    setAnimationsEnabled(enabled) {
        if (window.PremiumEffects) {
            window.PremiumEffects.toggleAnimations(enabled);
        }
    },

    setAudioEnabled(enabled) {
        if (window.PremiumEffects) {
            window.PremiumEffects.toggleAudio(enabled);
        }
    },

    setMasterVolume(value) {
        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.setMasterVolume(value);
        }
    },

    setSFXVolume(value) {
        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.setSFXVolume(value);
        }
    }
};

// ============================================
// AUTO-INITIALIZE
// ============================================

EffectsIntegration.init();

// Global export
if (typeof window !== 'undefined') {
    window.EffectsIntegration = EffectsIntegration;
    window.GameFX = EffectsIntegration; // Shorthand alias
}
