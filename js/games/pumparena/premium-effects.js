/**
 * Pump Arena RPG - Premium Effects System
 * Deluxe UI/UX animations, particles, audio, and visual feedback
 * Makes the game MEMORABLE
 */

'use strict';

// ============================================
// CONFIGURATION
// ============================================

const PREMIUM_CONFIG = {
    // Animation settings
    enableAnimations: true,
    enableParticles: true,
    enableScreenShake: true,
    enableAudio: true,

    // Performance
    maxParticles: 100,
    particleLifetime: 2000,

    // Audio volumes
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.5,

    // Respect user preferences
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
};

// ============================================
// FIBONACCI CONSTANTS (ASDF Philosophy)
// ============================================

const PREMIUM_FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

// ============================================
// INJECT PREMIUM CSS
// ============================================

const PREMIUM_CSS = `
/* ============================================
   PREMIUM EFFECTS CSS
   ============================================ */

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* ============================================
   PARTICLE CONTAINER
   ============================================ */
.premium-particles-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
}

/* ============================================
   CONFETTI PARTICLES
   ============================================ */
.confetti-particle {
    position: absolute;
    width: 10px;
    height: 10px;
    opacity: 1;
    animation: confettiFall var(--fall-duration, 3s) ease-out forwards;
}

.confetti-particle.square { border-radius: 2px; }
.confetti-particle.circle { border-radius: 50%; }
.confetti-particle.star {
    clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

@keyframes confettiFall {
    0% {
        transform: translateY(0) rotate(0deg) scale(1);
        opacity: 1;
    }
    100% {
        transform: translateY(var(--fall-distance, 100vh)) rotate(var(--rotation, 720deg)) scale(0.5);
        opacity: 0;
    }
}

/* ============================================
   FLOATING REWARDS
   ============================================ */
.floating-reward {
    position: fixed;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5), 0 0 20px currentColor;
    pointer-events: none;
    z-index: 10000;
    animation: floatUp 1.5s ease-out forwards;
}

.floating-reward.tokens { color: #fbbf24; }
.floating-reward.xp { color: #a855f7; }
.floating-reward.rep { color: #22c55e; }
.floating-reward.item { color: #60a5fa; }
.floating-reward.crit { color: #ef4444; font-size: 32px; }

@keyframes floatUp {
    0% {
        transform: translateY(0) scale(0.5);
        opacity: 0;
    }
    20% {
        transform: translateY(-20px) scale(1.2);
        opacity: 1;
    }
    100% {
        transform: translateY(-100px) scale(1);
        opacity: 0;
    }
}

/* ============================================
   SCREEN EFFECTS
   ============================================ */
.screen-flash {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9998;
    animation: screenFlash 0.3s ease-out forwards;
}

.screen-flash.damage { background: radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%); }
.screen-flash.heal { background: radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%); }
.screen-flash.crit { background: radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%); }
.screen-flash.levelup { background: radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%); }
.screen-flash.victory { background: radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 80%); }

@keyframes screenFlash {
    0% { opacity: 1; }
    100% { opacity: 0; }
}

/* Screen Shake */
.screen-shake {
    animation: screenShake var(--shake-duration, 0.4s) ease-out;
}

@keyframes screenShake {
    0%, 100% { transform: translateX(0); }
    10% { transform: translateX(-5px) rotate(-0.5deg); }
    20% { transform: translateX(5px) rotate(0.5deg); }
    30% { transform: translateX(-4px) rotate(-0.3deg); }
    40% { transform: translateX(4px) rotate(0.3deg); }
    50% { transform: translateX(-3px); }
    60% { transform: translateX(3px); }
    70% { transform: translateX(-2px); }
    80% { transform: translateX(2px); }
    90% { transform: translateX(-1px); }
}

.screen-shake-heavy {
    animation: screenShakeHeavy 0.6s ease-out;
}

@keyframes screenShakeHeavy {
    0%, 100% { transform: translateX(0) translateY(0); }
    10% { transform: translateX(-10px) translateY(-5px) rotate(-1deg); }
    20% { transform: translateX(10px) translateY(5px) rotate(1deg); }
    30% { transform: translateX(-8px) translateY(-4px) rotate(-0.8deg); }
    40% { transform: translateX(8px) translateY(4px) rotate(0.8deg); }
    50% { transform: translateX(-6px) translateY(-3px); }
    60% { transform: translateX(6px) translateY(3px); }
    70% { transform: translateX(-4px) translateY(-2px); }
    80% { transform: translateX(4px) translateY(2px); }
}

/* ============================================
   VICTORY / DEFEAT OVERLAYS
   ============================================ */
.victory-overlay, .defeat-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10001;
    opacity: 0;
    animation: overlayFadeIn 0.5s ease-out forwards;
}

.victory-overlay {
    background: radial-gradient(ellipse at center, rgba(251,191,36,0.3) 0%, rgba(0,0,0,0.9) 70%);
}

.defeat-overlay {
    background: radial-gradient(ellipse at center, rgba(239,68,68,0.3) 0%, rgba(0,0,0,0.9) 70%);
}

@keyframes overlayFadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
}

.victory-text, .defeat-text {
    font-size: 72px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 8px;
    animation: victoryTextPop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

.victory-text {
    color: #fbbf24;
    text-shadow: 0 0 30px #fbbf24, 0 0 60px #f59e0b, 0 4px 0 #b45309;
}

.defeat-text {
    color: #ef4444;
    text-shadow: 0 0 30px #ef4444, 0 0 60px #dc2626, 0 4px 0 #991b1b;
}

@keyframes victoryTextPop {
    0% { transform: scale(0) rotate(-10deg); opacity: 0; }
    50% { transform: scale(1.2) rotate(5deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.victory-subtext, .defeat-subtext {
    font-size: 24px;
    color: #9ca3af;
    margin-top: 20px;
    opacity: 0;
    animation: subtextSlide 0.5s ease-out 0.5s forwards;
}

@keyframes subtextSlide {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

.victory-rewards {
    display: flex;
    gap: 30px;
    margin-top: 40px;
    opacity: 0;
    animation: rewardsReveal 0.6s ease-out 0.8s forwards;
}

@keyframes rewardsReveal {
    0% { transform: translateY(30px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

.reward-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 30px;
    background: rgba(255,255,255,0.1);
    border-radius: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    backdrop-filter: blur(10px);
}

.reward-icon { font-size: 36px; margin-bottom: 8px; }
.reward-value { font-size: 28px; font-weight: bold; color: #fff; }
.reward-label { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }

.victory-button {
    margin-top: 50px;
    padding: 16px 48px;
    font-size: 18px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 2px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border: none;
    border-radius: 30px;
    color: #000;
    cursor: pointer;
    opacity: 0;
    animation: buttonReveal 0.5s ease-out 1.2s forwards;
    transition: all 0.3s ease;
}

.victory-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 30px rgba(251,191,36,0.5);
}

@keyframes buttonReveal {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

/* ============================================
   LEVEL UP CELEBRATION
   ============================================ */
.levelup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at center, rgba(168,85,247,0.4) 0%, rgba(0,0,0,0.95) 70%);
    z-index: 10002;
    animation: levelupPulse 2s ease-in-out infinite;
}

@keyframes levelupPulse {
    0%, 100% { background: radial-gradient(ellipse at center, rgba(168,85,247,0.4) 0%, rgba(0,0,0,0.95) 70%); }
    50% { background: radial-gradient(ellipse at center, rgba(168,85,247,0.6) 0%, rgba(0,0,0,0.95) 70%); }
}

.levelup-badge {
    width: 150px;
    height: 150px;
    background: linear-gradient(135deg, #a855f7, #7c3aed);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: bold;
    color: #fff;
    box-shadow: 0 0 50px rgba(168,85,247,0.8), inset 0 0 30px rgba(255,255,255,0.2);
    animation: levelupBadgePop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes levelupBadgePop {
    0% { transform: scale(0) rotate(-180deg); }
    100% { transform: scale(1) rotate(0deg); }
}

.levelup-title {
    font-size: 48px;
    font-weight: bold;
    color: #a855f7;
    text-transform: uppercase;
    letter-spacing: 4px;
    margin-top: 30px;
    text-shadow: 0 0 20px rgba(168,85,247,0.8);
    animation: levelupTitle 0.5s ease-out 0.3s both;
}

@keyframes levelupTitle {
    0% { transform: translateY(-20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

.levelup-stats {
    display: flex;
    gap: 20px;
    margin-top: 30px;
    animation: levelupStats 0.5s ease-out 0.6s both;
}

@keyframes levelupStats {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
}

.levelup-stat {
    padding: 12px 24px;
    background: rgba(168,85,247,0.2);
    border: 1px solid rgba(168,85,247,0.5);
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
}

.levelup-stat-value {
    font-size: 20px;
    font-weight: bold;
    color: #a855f7;
}

/* ============================================
   LOOT DROP ANIMATION
   ============================================ */
.loot-drop-container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10003;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.loot-chest {
    font-size: 80px;
    animation: chestBounce 0.6s ease-out, chestOpen 0.4s ease-out 1s forwards;
}

@keyframes chestBounce {
    0% { transform: translateY(-100px) scale(0); opacity: 0; }
    60% { transform: translateY(20px) scale(1.1); opacity: 1; }
    100% { transform: translateY(0) scale(1); }
}

@keyframes chestOpen {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1.1); filter: brightness(1.5); }
}

.loot-items {
    display: flex;
    gap: 15px;
    margin-top: 30px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 400px;
}

.loot-item {
    padding: 15px;
    background: rgba(0,0,0,0.8);
    border-radius: 12px;
    border: 2px solid;
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0;
    animation: lootItemReveal 0.4s ease-out forwards;
    animation-delay: var(--delay, 1.2s);
}

.loot-item.common { border-color: #6b7280; }
.loot-item.uncommon { border-color: #22c55e; }
.loot-item.rare { border-color: #3b82f6; }
.loot-item.epic { border-color: #a855f7; }
.loot-item.legendary {
    border-color: #fbbf24;
    box-shadow: 0 0 20px rgba(251,191,36,0.5);
}

@keyframes lootItemReveal {
    0% { transform: translateY(-30px) scale(0.5); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
}

.loot-item-icon { font-size: 32px; margin-bottom: 8px; }
.loot-item-name { font-size: 12px; color: #fff; text-align: center; }

/* ============================================
   RIPPLE EFFECT
   ============================================ */
.ripple-container {
    position: relative;
    overflow: hidden;
}

.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
    transform: scale(0);
    animation: rippleEffect 0.6s ease-out forwards;
    pointer-events: none;
}

@keyframes rippleEffect {
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
}

/* ============================================
   TOAST NOTIFICATIONS STACK
   ============================================ */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 10004;
    pointer-events: none;
}

.premium-toast {
    padding: 16px 24px;
    background: rgba(18, 18, 26, 0.95);
    border-radius: 12px;
    border-left: 4px solid;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    max-width: 400px;
    pointer-events: auto;
    animation: toastSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

.premium-toast.exiting {
    animation: toastSlideOut 0.3s ease-in forwards;
}

.premium-toast.success { border-color: #22c55e; }
.premium-toast.error { border-color: #ef4444; }
.premium-toast.warning { border-color: #eab308; }
.premium-toast.info { border-color: #3b82f6; }
.premium-toast.legendary {
    border-color: #fbbf24;
    background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(18,18,26,0.95));
}

@keyframes toastSlideIn {
    0% { transform: translateX(100%) scale(0.8); opacity: 0; }
    100% { transform: translateX(0) scale(1); opacity: 1; }
}

@keyframes toastSlideOut {
    0% { transform: translateX(0) scale(1); opacity: 1; }
    100% { transform: translateX(100%) scale(0.8); opacity: 0; }
}

.toast-icon { font-size: 24px; }
.toast-content { flex: 1; }
.toast-title { font-size: 14px; font-weight: bold; color: #fff; margin-bottom: 2px; }
.toast-message { font-size: 12px; color: #9ca3af; }
.toast-close {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
    transition: color 0.2s;
}
.toast-close:hover { color: #fff; }

/* ============================================
   LOADING SPINNER
   ============================================ */
.premium-loader {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.loader-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(251,191,36,0.2);
    border-top-color: #fbbf24;
    border-radius: 50%;
    animation: spinnerRotate 1s linear infinite;
}

@keyframes spinnerRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loader-text {
    color: #9ca3af;
    font-size: 14px;
    animation: loaderPulse 1.5s ease-in-out infinite;
}

@keyframes loaderPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
}

/* ============================================
   BUTTON EFFECTS
   ============================================ */
.premium-btn {
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.premium-btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
}

.premium-btn:active::before {
    width: 300px;
    height: 300px;
}

.premium-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.premium-btn:active {
    transform: translateY(0);
}

/* ============================================
   GLOW EFFECTS
   ============================================ */
.glow-gold {
    box-shadow: 0 0 20px rgba(251,191,36,0.5),
                0 0 40px rgba(251,191,36,0.3),
                0 0 60px rgba(251,191,36,0.1);
}

.glow-purple {
    box-shadow: 0 0 20px rgba(168,85,247,0.5),
                0 0 40px rgba(168,85,247,0.3),
                0 0 60px rgba(168,85,247,0.1);
}

.glow-fire {
    box-shadow: 0 0 20px rgba(239,68,68,0.5),
                0 0 40px rgba(239,68,68,0.3),
                0 0 60px rgba(239,68,68,0.1);
    animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.2); }
}

/* ============================================
   NUMBER COUNTER ANIMATION
   ============================================ */
.counter-animate {
    display: inline-block;
    animation: counterPop 0.3s ease-out;
}

@keyframes counterPop {
    0% { transform: scale(1); }
    50% { transform: scale(1.3); color: #fbbf24; }
    100% { transform: scale(1); }
}

/* ============================================
   CARD HOVER EFFECTS
   ============================================ */
.premium-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.premium-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.premium-card.legendary:hover {
    box-shadow: 0 20px 40px rgba(251,191,36,0.3);
}

/* ============================================
   TYPEWRITER EFFECT
   ============================================ */
.typewriter {
    overflow: hidden;
    border-right: 2px solid;
    white-space: nowrap;
    animation: typewriter 2s steps(40) forwards, blink 0.7s step-end infinite;
}

@keyframes typewriter {
    from { width: 0; }
    to { width: 100%; }
}

@keyframes blink {
    50% { border-color: transparent; }
}

/* ============================================
   SHINE EFFECT
   ============================================ */
.shine-effect {
    position: relative;
    overflow: hidden;
}

.shine-effect::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
        to right,
        transparent 0%,
        rgba(255,255,255,0.1) 50%,
        transparent 100%
    );
    transform: rotate(30deg);
    animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
    0% { transform: translateX(-100%) rotate(30deg); }
    100% { transform: translateX(100%) rotate(30deg); }
}
`;

// Inject CSS
(function injectPremiumCSS() {
    if (document.getElementById('premium-effects-css')) return;
    const style = document.createElement('style');
    style.id = 'premium-effects-css';
    style.textContent = PREMIUM_CSS;
    document.head.appendChild(style);
})();

// ============================================
// PARTICLES SYSTEM
// ============================================

class ParticleSystem {
    constructor() {
        this.container = null;
        this.particles = [];
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'premium-particles-container';
        this.container.id = 'premium-particles';
        document.body.appendChild(this.container);
    }

    // Confetti explosion
    confetti(options = {}) {
        if (PREMIUM_CONFIG.reducedMotion || !PREMIUM_CONFIG.enableParticles) return;

        const {
            x = window.innerWidth / 2,
            y = window.innerHeight / 2,
            count = 50,
            colors = ['#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'],
            spread = 360,
            duration = 3000
        } = options;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'confetti-particle';

            // Random shape
            const shapes = ['square', 'circle', 'star'];
            particle.classList.add(shapes[Math.floor(Math.random() * shapes.length)]);

            // Random color
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            // Random size (Fibonacci-based)
            const size = PREMIUM_FIB[Math.floor(Math.random() * 4) + 2];
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            // Position
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            // Animation variables
            const angle = (spread / count) * i + Math.random() * 30;
            const velocity = 300 + Math.random() * 500;
            const fallDistance = window.innerHeight + 200;

            particle.style.setProperty('--fall-distance', `${fallDistance}px`);
            particle.style.setProperty('--fall-duration', `${duration / 1000}s`);
            particle.style.setProperty('--rotation', `${720 + Math.random() * 720}deg`);
            particle.style.transform = `translateX(${Math.cos(angle * Math.PI / 180) * velocity}px)`;

            this.container.appendChild(particle);

            // Cleanup
            setTimeout(() => particle.remove(), duration);
        }
    }

    // Burst particles at point
    burst(x, y, color = '#fbbf24', count = 12) {
        if (PREMIUM_CONFIG.reducedMotion || !PREMIUM_CONFIG.enableParticles) return;

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 8px;
                height: 8px;
                background: ${color};
                border-radius: 50%;
                left: ${x}px;
                top: ${y}px;
                pointer-events: none;
            `;

            const angle = (360 / count) * i;
            const distance = 50 + Math.random() * 50;
            const tx = Math.cos(angle * Math.PI / 180) * distance;
            const ty = Math.sin(angle * Math.PI / 180) * distance;

            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
            ], {
                duration: 500,
                easing: 'ease-out'
            });

            this.container.appendChild(particle);
            setTimeout(() => particle.remove(), 500);
        }
    }

    // Rising sparkles
    sparkles(x, y, count = 8) {
        if (PREMIUM_CONFIG.reducedMotion || !PREMIUM_CONFIG.enableParticles) return;

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.innerHTML = '✨';
                sparkle.style.cssText = `
                    position: absolute;
                    left: ${x + (Math.random() - 0.5) * 40}px;
                    top: ${y}px;
                    font-size: ${12 + Math.random() * 12}px;
                    pointer-events: none;
                `;

                sparkle.animate([
                    { transform: 'translateY(0) scale(0)', opacity: 0 },
                    { transform: 'translateY(-20px) scale(1)', opacity: 1, offset: 0.2 },
                    { transform: 'translateY(-80px) scale(0.5)', opacity: 0 }
                ], {
                    duration: 1000,
                    easing: 'ease-out'
                });

                this.container.appendChild(sparkle);
                setTimeout(() => sparkle.remove(), 1000);
            }, i * 100);
        }
    }

    // Fire particles
    fire(x, y, duration = 2000) {
        if (PREMIUM_CONFIG.reducedMotion || !PREMIUM_CONFIG.enableParticles) return;

        const colors = ['#ef4444', '#f97316', '#fbbf24', '#fef08a'];
        const interval = setInterval(() => {
            const particle = document.createElement('div');
            particle.innerHTML = '🔥';
            particle.style.cssText = `
                position: absolute;
                left: ${x + (Math.random() - 0.5) * 30}px;
                top: ${y}px;
                font-size: ${16 + Math.random() * 16}px;
                pointer-events: none;
                filter: hue-rotate(${Math.random() * 30}deg);
            `;

            particle.animate([
                { transform: 'translateY(0) scale(1)', opacity: 1 },
                { transform: `translateY(-${50 + Math.random() * 50}px) scale(0.5)`, opacity: 0 }
            ], {
                duration: 800,
                easing: 'ease-out'
            });

            this.container.appendChild(particle);
            setTimeout(() => particle.remove(), 800);
        }, 50);

        setTimeout(() => clearInterval(interval), duration);
    }
}

// ============================================
// AUDIO SYSTEM
// ============================================

class AudioSystem {
    constructor() {
        this.context = null;
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized || !PREMIUM_CONFIG.enableAudio) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = PREMIUM_CONFIG.masterVolume;

            this.sfxGain = this.context.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = PREMIUM_CONFIG.sfxVolume;

            this.musicGain = this.context.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = PREMIUM_CONFIG.musicVolume;

            this.initialized = true;
        } catch (e) {
            console.warn('Audio system initialization failed:', e);
        }
    }

    // Generate procedural sound effects
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.initialized) this.init();
        if (!this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(volume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    }

    // Predefined sound effects
    playClick() {
        this.playTone(800, 0.05, 'square', 0.1);
    }

    playSuccess() {
        this.playTone(523.25, 0.1, 'sine', 0.2); // C5
        setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.2), 100); // E5
        setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.2), 200); // G5
    }

    playError() {
        this.playTone(200, 0.2, 'sawtooth', 0.15);
    }

    playHit() {
        this.playTone(150, 0.1, 'square', 0.2);
        this.playTone(100, 0.15, 'sawtooth', 0.1);
    }

    playCrit() {
        this.playTone(600, 0.05, 'square', 0.2);
        setTimeout(() => this.playTone(800, 0.1, 'sine', 0.3), 50);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.2), 100);
    }

    playHeal() {
        this.playTone(400, 0.1, 'sine', 0.15);
        setTimeout(() => this.playTone(500, 0.1, 'sine', 0.15), 100);
        setTimeout(() => this.playTone(600, 0.15, 'sine', 0.15), 200);
    }

    playLevelUp() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.25), i * 150);
        });
    }

    playVictory() {
        const melody = [
            { freq: 523.25, dur: 0.15 }, // C5
            { freq: 659.25, dur: 0.15 }, // E5
            { freq: 783.99, dur: 0.15 }, // G5
            { freq: 1046.50, dur: 0.3 }, // C6
            { freq: 783.99, dur: 0.15 }, // G5
            { freq: 1046.50, dur: 0.4 }  // C6
        ];

        let time = 0;
        melody.forEach(note => {
            setTimeout(() => this.playTone(note.freq, note.dur, 'sine', 0.2), time * 1000);
            time += note.dur;
        });
    }

    playDefeat() {
        const notes = [400, 350, 300, 250];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.3, 'sawtooth', 0.15), i * 200);
        });
    }

    playCoins() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(1200 + Math.random() * 400, 0.05, 'sine', 0.1);
            }, i * 50);
        }
    }

    playDrop() {
        this.playTone(800, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(600, 0.15, 'sine', 0.15), 100);
    }

    setMasterVolume(value) {
        PREMIUM_CONFIG.masterVolume = value;
        if (this.masterGain) this.masterGain.gain.value = value;
    }

    setSFXVolume(value) {
        PREMIUM_CONFIG.sfxVolume = value;
        if (this.sfxGain) this.sfxGain.gain.value = value;
    }

    setMusicVolume(value) {
        PREMIUM_CONFIG.musicVolume = value;
        if (this.musicGain) this.musicGain.gain.value = value;
    }
}

// ============================================
// SCREEN EFFECTS
// ============================================

class ScreenEffects {
    constructor() {
        this.shakeElement = document.body;
    }

    // Screen flash
    flash(type = 'damage') {
        if (PREMIUM_CONFIG.reducedMotion) return;

        const flash = document.createElement('div');
        flash.className = `screen-flash ${type}`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    // Screen shake
    shake(intensity = 'normal') {
        if (PREMIUM_CONFIG.reducedMotion || !PREMIUM_CONFIG.enableScreenShake) return;

        const className = intensity === 'heavy' ? 'screen-shake-heavy' : 'screen-shake';
        this.shakeElement.classList.add(className);
        setTimeout(() => this.shakeElement.classList.remove(className), 600);
    }

    // Floating reward number
    floatingReward(x, y, value, type = 'tokens') {
        if (PREMIUM_CONFIG.reducedMotion) return;

        const el = document.createElement('div');
        el.className = `floating-reward ${type}`;

        const prefix = type === 'tokens' ? '+' : type === 'xp' ? '+' : type === 'rep' ? '+' : '';
        const suffix = type === 'xp' ? ' XP' : type === 'rep' ? ' REP' : '';
        el.textContent = `${prefix}${value}${suffix}`;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1500);
    }
}

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================

class ToastSystem {
    constructor() {
        this.container = null;
        this.toasts = [];
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.id = 'premium-toasts';
        document.body.appendChild(this.container);
    }

    show(options = {}) {
        const {
            title = '',
            message = '',
            type = 'info',
            icon = null,
            duration = 4000,
            sound = true
        } = options;

        const toast = document.createElement('div');
        toast.className = `premium-toast ${type}`;

        const defaultIcons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            legendary: '👑'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icon || defaultIcons[type] || '📢'}</span>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.dismiss(toast);
        });

        this.container.appendChild(toast);
        this.toasts.push(toast);

        // Play sound
        if (sound && PremiumEffects.audio) {
            if (type === 'success' || type === 'legendary') {
                PremiumEffects.audio.playSuccess();
            } else if (type === 'error') {
                PremiumEffects.audio.playError();
            } else {
                PremiumEffects.audio.playClick();
            }
        }

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    }

    dismiss(toast) {
        if (!toast || toast.classList.contains('exiting')) return;

        toast.classList.add('exiting');
        setTimeout(() => {
            toast.remove();
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    success(message, title = 'Success') {
        return this.show({ message, title, type: 'success' });
    }

    error(message, title = 'Error') {
        return this.show({ message, title, type: 'error' });
    }

    warning(message, title = 'Warning') {
        return this.show({ message, title, type: 'warning' });
    }

    info(message, title = '') {
        return this.show({ message, title, type: 'info' });
    }

    legendary(message, title = 'Legendary!') {
        return this.show({ message, title, type: 'legendary', icon: '👑', duration: 6000 });
    }
}

// ============================================
// OVERLAY SCREENS
// ============================================

class OverlayScreens {
    // Victory screen
    static showVictory(rewards = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.id = 'victory-overlay';

        const rewardsHtml = Object.entries(rewards).map(([key, value]) => {
            const icons = { xp: '⭐', tokens: '🪙', reputation: '📈', items: '🎁' };
            const labels = { xp: 'Experience', tokens: 'Tokens', reputation: 'Reputation', items: 'Items' };
            return `
                <div class="reward-item">
                    <span class="reward-icon">${icons[key] || '🎁'}</span>
                    <span class="reward-value">+${value}</span>
                    <span class="reward-label">${labels[key] || key}</span>
                </div>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="victory-text">Victory!</div>
            <div class="victory-subtext">You have emerged triumphant</div>
            <div class="victory-rewards">${rewardsHtml}</div>
            <button class="victory-button" onclick="PremiumEffects.overlays.closeVictory()">Continue</button>
        `;

        document.body.appendChild(overlay);

        // Effects
        PremiumEffects.particles.confetti({ count: 100 });
        PremiumEffects.screen.flash('victory');
        PremiumEffects.audio?.playVictory();

        return overlay;
    }

    static closeVictory() {
        const overlay = document.getElementById('victory-overlay');
        if (overlay) {
            overlay.style.animation = 'overlayFadeIn 0.3s ease-out reverse forwards';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Defeat screen
    static showDefeat(message = 'Better luck next time') {
        const overlay = document.createElement('div');
        overlay.className = 'defeat-overlay';
        overlay.id = 'defeat-overlay';

        overlay.innerHTML = `
            <div class="defeat-text">Defeat</div>
            <div class="defeat-subtext">${message}</div>
            <button class="victory-button" style="background: linear-gradient(135deg, #ef4444, #dc2626);"
                    onclick="PremiumEffects.overlays.closeDefeat()">Try Again</button>
        `;

        document.body.appendChild(overlay);

        PremiumEffects.screen.flash('damage');
        PremiumEffects.screen.shake('heavy');
        PremiumEffects.audio?.playDefeat();

        return overlay;
    }

    static closeDefeat() {
        const overlay = document.getElementById('defeat-overlay');
        if (overlay) {
            overlay.style.animation = 'overlayFadeIn 0.3s ease-out reverse forwards';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Level up celebration
    static showLevelUp(newLevel, bonuses = {}) {
        const overlay = document.createElement('div');
        overlay.className = 'levelup-overlay';
        overlay.id = 'levelup-overlay';

        const bonusesHtml = Object.entries(bonuses).map(([stat, value]) => `
            <div class="levelup-stat">
                <div class="levelup-stat-value">+${value}</div>
                ${stat.toUpperCase()}
            </div>
        `).join('');

        overlay.innerHTML = `
            <div class="levelup-badge">${newLevel}</div>
            <div class="levelup-title">Level Up!</div>
            <div class="levelup-stats">${bonusesHtml}</div>
            <button class="victory-button" style="background: linear-gradient(135deg, #a855f7, #7c3aed); animation-delay: 1s;"
                    onclick="PremiumEffects.overlays.closeLevelUp()">Awesome!</button>
        `;

        document.body.appendChild(overlay);

        // Center confetti
        PremiumEffects.particles.confetti({
            colors: ['#a855f7', '#7c3aed', '#c084fc', '#fbbf24'],
            count: 80
        });
        PremiumEffects.screen.flash('levelup');
        PremiumEffects.audio?.playLevelUp();

        return overlay;
    }

    static closeLevelUp() {
        const overlay = document.getElementById('levelup-overlay');
        if (overlay) {
            overlay.style.animation = 'overlayFadeIn 0.3s ease-out reverse forwards';
            setTimeout(() => overlay.remove(), 300);
        }
    }

    // Loot drop reveal
    static showLootDrop(items = []) {
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.id = 'loot-overlay';

        const itemsHtml = items.map((item, i) => `
            <div class="loot-item ${item.rarity || 'common'}" style="--delay: ${1.2 + i * 0.2}s">
                <span class="loot-item-icon">${item.icon || '📦'}</span>
                <span class="loot-item-name">${item.name || 'Item'}</span>
            </div>
        `).join('');

        overlay.innerHTML = `
            <div class="loot-drop-container">
                <div class="loot-chest">🎁</div>
                <div class="loot-items">${itemsHtml}</div>
                <button class="victory-button" style="animation-delay: ${1.5 + items.length * 0.2}s;"
                        onclick="PremiumEffects.overlays.closeLoot()">Collect</button>
            </div>
        `;

        document.body.appendChild(overlay);

        PremiumEffects.audio?.playDrop();
        setTimeout(() => {
            PremiumEffects.particles.sparkles(window.innerWidth / 2, window.innerHeight / 2 - 50, 12);
            PremiumEffects.audio?.playCoins();
        }, 1000);

        return overlay;
    }

    static closeLoot() {
        const overlay = document.getElementById('loot-overlay');
        if (overlay) {
            overlay.style.animation = 'overlayFadeIn 0.3s ease-out reverse forwards';
            setTimeout(() => overlay.remove(), 300);
        }
    }
}

// ============================================
// LOADING STATES
// ============================================

class LoadingSystem {
    static show(message = 'Loading...') {
        let loader = document.getElementById('premium-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'premium-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10005;
            `;
            document.body.appendChild(loader);
        }

        loader.innerHTML = `
            <div class="premium-loader">
                <div class="loader-spinner"></div>
                <div class="loader-text">${message}</div>
            </div>
        `;
        loader.style.display = 'flex';

        return loader;
    }

    static hide() {
        const loader = document.getElementById('premium-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    static update(message) {
        const text = document.querySelector('#premium-loader .loader-text');
        if (text) text.textContent = message;
    }
}

// ============================================
// RIPPLE EFFECT HELPER
// ============================================

function addRippleEffect(element) {
    element.classList.add('ripple-container');

    element.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}

// ============================================
// COUNTER ANIMATION
// ============================================

function animateCounter(element, startValue, endValue, duration = 1000) {
    const start = performance.now();
    const diff = endValue - startValue;

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        // Easing
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startValue + diff * eased);

        element.textContent = current.toLocaleString();
        element.classList.add('counter-animate');

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            setTimeout(() => element.classList.remove('counter-animate'), 300);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// MAIN PREMIUM EFFECTS OBJECT
// ============================================

const PremiumEffects = {
    config: PREMIUM_CONFIG,
    particles: new ParticleSystem(),
    audio: new AudioSystem(),
    screen: new ScreenEffects(),
    toasts: new ToastSystem(),
    overlays: OverlayScreens,
    loading: LoadingSystem,

    // Helpers
    addRipple: addRippleEffect,
    animateCounter: animateCounter,

    // Quick access methods
    confetti: (opts) => PremiumEffects.particles.confetti(opts),
    burst: (x, y, color, count) => PremiumEffects.particles.burst(x, y, color, count),
    sparkles: (x, y, count) => PremiumEffects.particles.sparkles(x, y, count),
    fire: (x, y, duration) => PremiumEffects.particles.fire(x, y, duration),

    flash: (type) => PremiumEffects.screen.flash(type),
    shake: (intensity) => PremiumEffects.screen.shake(intensity),
    floatingReward: (x, y, value, type) => PremiumEffects.screen.floatingReward(x, y, value, type),

    toast: (opts) => PremiumEffects.toasts.show(opts),

    victory: (rewards) => PremiumEffects.overlays.showVictory(rewards),
    defeat: (msg) => PremiumEffects.overlays.showDefeat(msg),
    levelUp: (level, bonuses) => PremiumEffects.overlays.showLevelUp(level, bonuses),
    lootDrop: (items) => PremiumEffects.overlays.showLootDrop(items),

    // Initialize audio on first user interaction
    initAudio: () => {
        if (!PremiumEffects.audio.initialized) {
            PremiumEffects.audio.init();
        }
    },

    // Settings
    setReducedMotion: (value) => {
        PREMIUM_CONFIG.reducedMotion = value;
    },

    toggleAnimations: (enabled) => {
        PREMIUM_CONFIG.enableAnimations = enabled;
        PREMIUM_CONFIG.enableParticles = enabled;
        PREMIUM_CONFIG.enableScreenShake = enabled;
    },

    toggleAudio: (enabled) => {
        PREMIUM_CONFIG.enableAudio = enabled;
    }
};

// Initialize audio on first click
document.addEventListener('click', () => PremiumEffects.initAudio(), { once: true });

// Global export
if (typeof window !== 'undefined') {
    window.PremiumEffects = PremiumEffects;
}
