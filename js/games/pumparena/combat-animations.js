/**
 * Pump Arena RPG - Combat Animations System
 * Advanced battle visual effects and feedback
 */

'use strict';

// ============================================
// COMBAT ANIMATION CSS
// ============================================

const COMBAT_ANIM_CSS = `
/* ============================================
   COMBAT ANIMATIONS CSS
   ============================================ */

/* Damage Numbers */
.damage-number {
    position: absolute;
    font-weight: bold;
    pointer-events: none;
    z-index: 1000;
    text-shadow: 2px 2px 0 #000, -1px -1px 0 #000;
    animation: damageFloat 1.2s ease-out forwards;
}

.damage-number.physical { color: #ef4444; font-size: 28px; }
.damage-number.magic { color: #a855f7; font-size: 28px; }
.damage-number.fire { color: #f97316; font-size: 28px; }
.damage-number.ice { color: #38bdf8; font-size: 28px; }
.damage-number.lightning { color: #fbbf24; font-size: 28px; }
.damage-number.heal { color: #22c55e; font-size: 26px; }
.damage-number.critical {
    font-size: 36px;
    color: #fbbf24;
    text-shadow: 0 0 10px #fbbf24, 2px 2px 0 #000;
}
.damage-number.miss {
    color: #6b7280;
    font-size: 22px;
    font-style: italic;
}
.damage-number.blocked {
    color: #3b82f6;
    font-size: 24px;
}

@keyframes damageFloat {
    0% {
        transform: translateY(0) scale(0.5);
        opacity: 0;
    }
    15% {
        transform: translateY(-10px) scale(1.2);
        opacity: 1;
    }
    30% {
        transform: translateY(-20px) scale(1);
    }
    100% {
        transform: translateY(-60px) scale(0.8);
        opacity: 0;
    }
}

@keyframes damageCritFloat {
    0% {
        transform: translateY(0) scale(0.3) rotate(-10deg);
        opacity: 0;
    }
    20% {
        transform: translateY(-15px) scale(1.5) rotate(5deg);
        opacity: 1;
    }
    40% {
        transform: translateY(-25px) scale(1.2) rotate(-3deg);
    }
    100% {
        transform: translateY(-80px) scale(1) rotate(0deg);
        opacity: 0;
    }
}

.damage-number.critical {
    animation: damageCritFloat 1.5s ease-out forwards;
}

/* Attack Animations */
.attack-slash {
    position: absolute;
    width: 100px;
    height: 100px;
    pointer-events: none;
    z-index: 999;
}

.attack-slash::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, transparent, #fff, transparent);
    top: 50%;
    transform: translateY(-50%) rotate(-45deg);
    animation: slashSwipe 0.3s ease-out forwards;
}

@keyframes slashSwipe {
    0% {
        transform: translateY(-50%) rotate(-45deg) scaleX(0);
        opacity: 0;
    }
    50% {
        transform: translateY(-50%) rotate(-45deg) scaleX(1);
        opacity: 1;
    }
    100% {
        transform: translateY(-50%) rotate(-45deg) scaleX(1);
        opacity: 0;
    }
}

/* Projectile */
.projectile {
    position: absolute;
    pointer-events: none;
    z-index: 999;
    transition: all 0.4s ease-out;
}

.projectile.fireball {
    width: 30px;
    height: 30px;
    background: radial-gradient(circle, #fef08a 0%, #f97316 40%, #ef4444 70%, transparent 100%);
    border-radius: 50%;
    box-shadow: 0 0 20px #f97316, 0 0 40px #ef4444;
    animation: fireballGlow 0.1s ease-in-out infinite alternate;
}

@keyframes fireballGlow {
    from { filter: brightness(1); }
    to { filter: brightness(1.3); }
}

.projectile.iceball {
    width: 25px;
    height: 25px;
    background: radial-gradient(circle, #fff 0%, #38bdf8 50%, #0ea5e9 100%);
    border-radius: 50%;
    box-shadow: 0 0 15px #38bdf8, 0 0 30px #0ea5e9;
}

.projectile.lightning {
    width: 40px;
    height: 8px;
    background: linear-gradient(90deg, #fbbf24, #fff, #fbbf24);
    box-shadow: 0 0 10px #fbbf24;
    animation: lightningFlicker 0.05s ease-in-out infinite;
}

@keyframes lightningFlicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.projectile.arrow {
    width: 40px;
    height: 4px;
    background: linear-gradient(90deg, #92400e, #d97706);
    position: relative;
}

.projectile.arrow::before {
    content: '';
    position: absolute;
    right: -8px;
    top: -4px;
    border: 6px solid transparent;
    border-left: 10px solid #92400e;
}

/* Shield Effect */
.shield-effect {
    position: absolute;
    width: 60px;
    height: 80px;
    pointer-events: none;
    z-index: 998;
    animation: shieldAppear 0.5s ease-out forwards;
}

.shield-effect::before {
    content: '🛡️';
    font-size: 50px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

@keyframes shieldAppear {
    0% {
        transform: scale(0.5);
        opacity: 0;
    }
    30% {
        transform: scale(1.2);
        opacity: 1;
    }
    60% {
        transform: scale(1);
        opacity: 1;
    }
    100% {
        transform: scale(1);
        opacity: 0;
    }
}

/* Dodge Effect */
.dodge-effect {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    animation: dodgeSlide 0.4s ease-out forwards;
}

@keyframes dodgeSlide {
    0% { transform: translateX(0); opacity: 1; }
    30% { transform: translateX(30px); opacity: 0.5; }
    60% { transform: translateX(-10px); opacity: 0.3; }
    100% { transform: translateX(0); opacity: 0; }
}

/* Status Effects */
.status-effect-icon {
    position: absolute;
    font-size: 20px;
    animation: statusPulse 1s ease-in-out infinite;
}

@keyframes statusPulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.2); opacity: 1; }
}

.status-effect-icon.burn { animation: burnEffect 0.5s ease-in-out infinite; }
@keyframes burnEffect {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.5) hue-rotate(10deg); }
}

.status-effect-icon.freeze { animation: freezeEffect 1s ease-in-out infinite; }
@keyframes freezeEffect {
    0%, 100% { filter: brightness(1) saturate(1); }
    50% { filter: brightness(1.2) saturate(1.5) hue-rotate(-20deg); }
}

.status-effect-icon.poison { animation: poisonEffect 0.8s ease-in-out infinite; }
@keyframes poisonEffect {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.3) hue-rotate(60deg); }
}

/* Combo Counter */
.combo-counter {
    position: fixed;
    top: 20%;
    right: 20px;
    font-size: 48px;
    font-weight: bold;
    color: #fbbf24;
    text-shadow: 0 0 20px #fbbf24, 3px 3px 0 #000;
    pointer-events: none;
    z-index: 1001;
    animation: comboPop 0.3s ease-out;
}

.combo-counter .combo-label {
    font-size: 18px;
    color: #9ca3af;
    display: block;
    text-transform: uppercase;
    letter-spacing: 2px;
}

@keyframes comboPop {
    0% { transform: scale(0.5); }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); }
}

/* Turn Indicator */
.turn-indicator {
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #000;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
    text-transform: uppercase;
    animation: turnBounce 0.5s ease-out infinite alternate;
    z-index: 100;
}

@keyframes turnBounce {
    from { transform: translateX(-50%) translateY(0); }
    to { transform: translateX(-50%) translateY(-5px); }
}

/* Unit Selection */
.unit-selected {
    position: relative;
}

.unit-selected::after {
    content: '';
    position: absolute;
    inset: -5px;
    border: 3px solid #fbbf24;
    border-radius: 8px;
    animation: selectionPulse 1s ease-in-out infinite;
}

@keyframes selectionPulse {
    0%, 100% {
        box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
        border-color: #fbbf24;
    }
    50% {
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
        border-color: #fef08a;
    }
}

/* Target Highlight */
.target-highlight {
    position: relative;
}

.target-highlight::before {
    content: '⚔️';
    position: absolute;
    top: -25px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 20px;
    animation: targetBob 0.8s ease-in-out infinite;
}

@keyframes targetBob {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50% { transform: translateX(-50%) translateY(-8px); }
}

/* HP Bar Animation */
.hp-bar-change {
    transition: width 0.5s ease-out;
}

.hp-bar-damage {
    animation: hpDamageFlash 0.3s ease-out;
}

@keyframes hpDamageFlash {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(2) saturate(2); }
}

/* Energy Gain Effect */
.energy-gain {
    animation: energyPulse 0.5s ease-out;
}

@keyframes energyPulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); filter: brightness(1.5); }
    100% { transform: scale(1); }
}

/* Skill Ready Indicator */
.skill-ready {
    position: relative;
    overflow: visible;
}

.skill-ready::after {
    content: '!';
    position: absolute;
    top: -10px;
    right: -10px;
    width: 20px;
    height: 20px;
    background: #ef4444;
    border-radius: 50%;
    color: white;
    font-size: 14px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: skillReadyBounce 0.6s ease-in-out infinite;
}

@keyframes skillReadyBounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
}

/* Death Animation */
.unit-death {
    animation: deathFade 1s ease-out forwards;
}

@keyframes deathFade {
    0% {
        transform: scale(1);
        opacity: 1;
        filter: grayscale(0);
    }
    50% {
        transform: scale(1.1) rotate(5deg);
        opacity: 0.7;
        filter: grayscale(0.5);
    }
    100% {
        transform: scale(0.8) rotate(-10deg) translateY(20px);
        opacity: 0;
        filter: grayscale(1);
    }
}

/* Buff/Debuff Apply Animation */
.buff-apply {
    animation: buffGlow 0.5s ease-out;
}

@keyframes buffGlow {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.5) drop-shadow(0 0 10px #22c55e); }
    100% { filter: brightness(1); }
}

.debuff-apply {
    animation: debuffGlow 0.5s ease-out;
}

@keyframes debuffGlow {
    0% { filter: brightness(1); }
    50% { filter: brightness(0.7) drop-shadow(0 0 10px #ef4444); }
    100% { filter: brightness(1); }
}

/* Impact Wave */
.impact-wave {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 3px solid;
    border-radius: 50%;
    pointer-events: none;
    animation: impactExpand 0.4s ease-out forwards;
}

.impact-wave.physical { border-color: #ef4444; }
.impact-wave.magic { border-color: #a855f7; }
.impact-wave.heal { border-color: #22c55e; }

@keyframes impactExpand {
    0% {
        transform: scale(0.5);
        opacity: 1;
    }
    100% {
        transform: scale(3);
        opacity: 0;
    }
}

/* Card Play Animation */
.card-play-effect {
    position: fixed;
    width: 100px;
    height: 140px;
    background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.3));
    border: 2px solid #fbbf24;
    border-radius: 8px;
    pointer-events: none;
    z-index: 999;
    animation: cardPlay 0.5s ease-out forwards;
}

@keyframes cardPlay {
    0% {
        transform: scale(1) translateY(0);
        opacity: 1;
    }
    50% {
        transform: scale(1.2) translateY(-50px);
        opacity: 0.8;
    }
    100% {
        transform: scale(0.5) translateY(-100px);
        opacity: 0;
    }
}

/* Victory Pose */
.victory-pose {
    animation: victoryJump 0.8s ease-out;
}

@keyframes victoryJump {
    0%, 100% { transform: translateY(0); }
    30% { transform: translateY(-20px); }
    50% { transform: translateY(-25px) rotate(5deg); }
    70% { transform: translateY(-15px) rotate(-5deg); }
}
`;

// Inject CSS
(function injectCombatAnimCSS() {
    if (document.getElementById('combat-anim-css')) return;
    const style = document.createElement('style');
    style.id = 'combat-anim-css';
    style.textContent = COMBAT_ANIM_CSS;
    document.head.appendChild(style);
})();

// ============================================
// COMBAT ANIMATIONS CLASS
// ============================================

class CombatAnimations {
    constructor() {
        this.container = null;
        this.comboCount = 0;
        this.comboTimer = null;
        this.init();
    }

    init() {
        // Create animation container
        this.container = document.createElement('div');
        this.container.id = 'combat-animations-container';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(this.container);
    }

    // ========================================
    // DAMAGE NUMBERS
    // ========================================

    showDamage(x, y, amount, type = 'physical', isCrit = false) {
        const el = document.createElement('div');
        el.className = `damage-number ${type}${isCrit ? ' critical' : ''}`;
        el.textContent = isCrit ? `${amount}!` : amount;

        // Random offset for variety
        const offsetX = (Math.random() - 0.5) * 30;
        el.style.left = `${x + offsetX}px`;
        el.style.top = `${y}px`;

        this.container.appendChild(el);

        // Sound effects
        if (window.PremiumEffects?.audio) {
            if (isCrit) {
                window.PremiumEffects.audio.playCrit();
            } else {
                window.PremiumEffects.audio.playHit();
            }
        }

        // Particles for crits
        if (isCrit && window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.burst(x, y, '#fbbf24', 8);
        }

        setTimeout(() => el.remove(), 1200);

        // Update combo
        if (type !== 'heal') {
            this.incrementCombo();
        }
    }

    showMiss(x, y) {
        const el = document.createElement('div');
        el.className = 'damage-number miss';
        el.textContent = 'MISS';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    }

    showBlocked(x, y, amount) {
        const el = document.createElement('div');
        el.className = 'damage-number blocked';
        el.textContent = `🛡️ ${amount}`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 1200);
    }

    showHeal(x, y, amount) {
        const el = document.createElement('div');
        el.className = 'damage-number heal';
        el.textContent = `+${amount}`;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        this.container.appendChild(el);

        if (window.PremiumEffects?.audio) {
            window.PremiumEffects.audio.playHeal();
        }

        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.sparkles(x, y, 5);
        }

        setTimeout(() => el.remove(), 1200);
    }

    // ========================================
    // ATTACK ANIMATIONS
    // ========================================

    slash(x, y, angle = -45) {
        const el = document.createElement('div');
        el.className = 'attack-slash';
        el.style.left = `${x - 50}px`;
        el.style.top = `${y - 50}px`;
        el.style.transform = `rotate(${angle}deg)`;
        this.container.appendChild(el);

        if (window.PremiumEffects?.screen) {
            window.PremiumEffects.screen.shake('normal');
        }

        setTimeout(() => el.remove(), 300);
    }

    projectile(startX, startY, endX, endY, type = 'fireball') {
        return new Promise(resolve => {
            const el = document.createElement('div');
            el.className = `projectile ${type}`;
            el.style.left = `${startX}px`;
            el.style.top = `${startY}px`;

            // Calculate angle for arrow/lightning
            const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
            if (type === 'arrow' || type === 'lightning') {
                el.style.transform = `rotate(${angle}deg)`;
            }

            this.container.appendChild(el);

            // Animate to target
            requestAnimationFrame(() => {
                el.style.left = `${endX}px`;
                el.style.top = `${endY}px`;
            });

            setTimeout(() => {
                el.remove();
                // Impact effect
                this.impactWave(endX, endY, type === 'fireball' ? 'fire' : 'magic');
                resolve();
            }, 400);
        });
    }

    impactWave(x, y, type = 'physical') {
        const el = document.createElement('div');
        el.className = `impact-wave ${type}`;
        el.style.left = `${x - 10}px`;
        el.style.top = `${y - 10}px`;
        this.container.appendChild(el);

        if (window.PremiumEffects?.screen) {
            window.PremiumEffects.screen.shake('normal');
        }

        setTimeout(() => el.remove(), 400);
    }

    // ========================================
    // DEFENSE ANIMATIONS
    // ========================================

    shield(x, y) {
        const el = document.createElement('div');
        el.className = 'shield-effect';
        el.style.left = `${x - 30}px`;
        el.style.top = `${y - 40}px`;
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 500);
    }

    dodge(element) {
        if (!element) return;
        element.classList.add('dodge-effect');
        setTimeout(() => element.classList.remove('dodge-effect'), 400);
    }

    // ========================================
    // STATUS EFFECTS
    // ========================================

    applyStatusEffect(element, status) {
        if (!element) return;

        const icons = {
            burn: '🔥',
            freeze: '❄️',
            poison: '☠️',
            stun: '💫',
            bleed: '🩸',
            shield: '🛡️',
            regen: '💚',
            attack_up: '⚔️',
            defense_up: '🛡️',
            speed_up: '💨'
        };

        const icon = document.createElement('span');
        icon.className = `status-effect-icon ${status}`;
        icon.textContent = icons[status] || '⭐';
        icon.style.top = '-20px';
        icon.style.right = '-10px';

        element.style.position = 'relative';
        element.appendChild(icon);

        return icon;
    }

    removeStatusEffect(icon) {
        if (icon) {
            icon.style.animation = 'none';
            icon.style.opacity = '0';
            icon.style.transform = 'scale(0)';
            icon.style.transition = 'all 0.3s ease-out';
            setTimeout(() => icon.remove(), 300);
        }
    }

    // ========================================
    // COMBO SYSTEM
    // ========================================

    incrementCombo() {
        this.comboCount++;
        this.updateComboDisplay();

        // Reset combo timer
        clearTimeout(this.comboTimer);
        this.comboTimer = setTimeout(() => {
            this.resetCombo();
        }, 3000);
    }

    updateComboDisplay() {
        let counter = document.getElementById('combo-counter');

        if (this.comboCount < 2) return;

        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'combo-counter';
            counter.className = 'combo-counter';
            document.body.appendChild(counter);
        }

        counter.innerHTML = `
            ${this.comboCount}
            <span class="combo-label">Combo</span>
        `;
        counter.style.animation = 'none';
        counter.offsetHeight; // Trigger reflow
        counter.style.animation = 'comboPop 0.3s ease-out';
    }

    resetCombo() {
        this.comboCount = 0;
        const counter = document.getElementById('combo-counter');
        if (counter) {
            counter.style.opacity = '0';
            counter.style.transform = 'scale(0.5)';
            counter.style.transition = 'all 0.3s ease-out';
            setTimeout(() => counter.remove(), 300);
        }
    }

    getComboMultiplier() {
        if (this.comboCount < 3) return 1;
        if (this.comboCount < 5) return 1.1;
        if (this.comboCount < 8) return 1.2;
        if (this.comboCount < 13) return 1.3; // Fibonacci!
        return 1.5;
    }

    // ========================================
    // UNIT EFFECTS
    // ========================================

    selectUnit(element) {
        // Remove previous selection
        document.querySelectorAll('.unit-selected').forEach(el => {
            el.classList.remove('unit-selected');
        });

        if (element) {
            element.classList.add('unit-selected');
        }
    }

    highlightTarget(element) {
        document.querySelectorAll('.target-highlight').forEach(el => {
            el.classList.remove('target-highlight');
        });

        if (element) {
            element.classList.add('target-highlight');
        }
    }

    showTurnIndicator(element) {
        // Remove previous indicators
        document.querySelectorAll('.turn-indicator').forEach(el => el.remove());

        if (!element) return;

        const indicator = document.createElement('div');
        indicator.className = 'turn-indicator';
        indicator.textContent = 'Your Turn';
        element.style.position = 'relative';
        element.appendChild(indicator);

        return indicator;
    }

    unitDeath(element) {
        if (!element) return;

        element.classList.add('unit-death');

        if (window.PremiumEffects?.screen) {
            window.PremiumEffects.screen.shake('heavy');
        }

        // Particles
        const rect = element.getBoundingClientRect();
        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.burst(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                '#ef4444',
                12
            );
        }
    }

    // ========================================
    // BUFF/DEBUFF ANIMATIONS
    // ========================================

    applyBuff(element) {
        if (!element) return;
        element.classList.add('buff-apply');
        setTimeout(() => element.classList.remove('buff-apply'), 500);

        const rect = element.getBoundingClientRect();
        if (window.PremiumEffects?.particles) {
            window.PremiumEffects.particles.sparkles(
                rect.left + rect.width / 2,
                rect.top,
                6
            );
        }
    }

    applyDebuff(element) {
        if (!element) return;
        element.classList.add('debuff-apply');
        setTimeout(() => element.classList.remove('debuff-apply'), 500);
    }

    // ========================================
    // HP BAR ANIMATIONS
    // ========================================

    animateHPChange(hpBar, newWidth, isDamage = true) {
        if (!hpBar) return;

        hpBar.classList.add('hp-bar-change');
        if (isDamage) {
            hpBar.classList.add('hp-bar-damage');
            setTimeout(() => hpBar.classList.remove('hp-bar-damage'), 300);
        }

        hpBar.style.width = `${newWidth}%`;
    }

    // ========================================
    // CARD ANIMATIONS
    // ========================================

    cardPlayEffect(x, y) {
        const el = document.createElement('div');
        el.className = 'card-play-effect';
        el.style.left = `${x - 50}px`;
        el.style.top = `${y - 70}px`;
        this.container.appendChild(el);
        setTimeout(() => el.remove(), 500);
    }

    // ========================================
    // VICTORY/DEFEAT HELPERS
    // ========================================

    victoryPose(element) {
        if (!element) return;
        element.classList.add('victory-pose');
        setTimeout(() => element.classList.remove('victory-pose'), 800);
    }

    // ========================================
    // SKILL READY INDICATOR
    // ========================================

    markSkillReady(element) {
        if (element) {
            element.classList.add('skill-ready');
        }
    }

    clearSkillReady(element) {
        if (element) {
            element.classList.remove('skill-ready');
        }
    }

    // ========================================
    // ENERGY ANIMATION
    // ========================================

    energyGain(element) {
        if (!element) return;
        element.classList.add('energy-gain');
        setTimeout(() => element.classList.remove('energy-gain'), 500);
    }
}

// ============================================
// BATTLE EFFECTS PRESETS
// ============================================

const BattleEffectPresets = {
    // Attack presets
    attacks: {
        melee_basic: async (anim, attacker, target) => {
            const rect = target.getBoundingClientRect();
            anim.slash(rect.left + rect.width / 2, rect.top + rect.height / 2);
        },

        melee_heavy: async (anim, attacker, target) => {
            const rect = target.getBoundingClientRect();
            anim.slash(rect.left + rect.width / 2, rect.top + rect.height / 2, -30);
            setTimeout(() => {
                anim.slash(rect.left + rect.width / 2, rect.top + rect.height / 2, -60);
            }, 100);
            if (window.PremiumEffects?.screen) {
                window.PremiumEffects.screen.shake('heavy');
            }
        },

        ranged_arrow: async (anim, attacker, target) => {
            const start = attacker.getBoundingClientRect();
            const end = target.getBoundingClientRect();
            await anim.projectile(
                start.left + start.width / 2,
                start.top + start.height / 2,
                end.left + end.width / 2,
                end.top + end.height / 2,
                'arrow'
            );
        },

        magic_fire: async (anim, attacker, target) => {
            const start = attacker.getBoundingClientRect();
            const end = target.getBoundingClientRect();
            await anim.projectile(
                start.left + start.width / 2,
                start.top + start.height / 2,
                end.left + end.width / 2,
                end.top + end.height / 2,
                'fireball'
            );
            if (window.PremiumEffects?.particles) {
                window.PremiumEffects.particles.fire(
                    end.left + end.width / 2,
                    end.top + end.height / 2,
                    500
                );
            }
        },

        magic_ice: async (anim, attacker, target) => {
            const start = attacker.getBoundingClientRect();
            const end = target.getBoundingClientRect();
            await anim.projectile(
                start.left + start.width / 2,
                start.top + start.height / 2,
                end.left + end.width / 2,
                end.top + end.height / 2,
                'iceball'
            );
        },

        magic_lightning: async (anim, attacker, target) => {
            const start = attacker.getBoundingClientRect();
            const end = target.getBoundingClientRect();
            await anim.projectile(
                start.left + start.width / 2,
                start.top + start.height / 2,
                end.left + end.width / 2,
                end.top + end.height / 2,
                'lightning'
            );
            if (window.PremiumEffects?.screen) {
                window.PremiumEffects.screen.flash('crit');
            }
        }
    },

    // Defense presets
    defense: {
        block: (anim, defender) => {
            const rect = defender.getBoundingClientRect();
            anim.shield(rect.left + rect.width / 2, rect.top + rect.height / 2);
        },

        dodge: (anim, defender) => {
            anim.dodge(defender);
        },

        parry: (anim, defender) => {
            const rect = defender.getBoundingClientRect();
            anim.shield(rect.left + rect.width / 2, rect.top + rect.height / 2);
            anim.slash(rect.left + rect.width / 2, rect.top + rect.height / 2, 45);
        }
    }
};

// ============================================
// GLOBAL INSTANCE
// ============================================

const CombatAnim = new CombatAnimations();

// Export
if (typeof window !== 'undefined') {
    window.CombatAnimations = CombatAnimations;
    window.CombatAnim = CombatAnim;
    window.BattleEffectPresets = BattleEffectPresets;
}
