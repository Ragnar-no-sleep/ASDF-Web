/**
 * Pump Arena RPG - Battle System
 * Combat encounters with ASDF Philosophy integration
 *
 * PHILOSOPHY: Combat reflects the crypto world
 * - Battles represent market challenges, FUD attacks, rug pulls
 * - Stats determine combat effectiveness
 * - Fibonacci-based damage and rewards
 * - Burns benefit everyone (burn tokens for combat buffs)
 *
 * Version: 1.0.0 - ASDF Philosophy Integration
 */

'use strict';

// ============================================
// BATTLE ANIMATIONS CSS (Injected on init)
// ============================================

function injectBattleStyles() {
  if (document.getElementById('pumparena-battle-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'pumparena-battle-styles';
  styles.textContent = `
        /* Battle Animations */
        @keyframes battleShake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes battleFlash {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(2) saturate(1.5); }
        }

        @keyframes battleCrit {
            0% { transform: scale(1); filter: brightness(1); }
            25% { transform: scale(1.15); filter: brightness(1.5) saturate(2); }
            50% { transform: scale(1.05); filter: brightness(2) saturate(2.5); }
            75% { transform: scale(1.1); filter: brightness(1.5); }
            100% { transform: scale(1); filter: brightness(1); }
        }

        @keyframes battleDeath {
            0% { transform: scale(1) rotate(0deg); opacity: 1; }
            50% { transform: scale(0.8) rotate(10deg); opacity: 0.7; }
            100% { transform: scale(0) rotate(45deg); opacity: 0; }
        }

        @keyframes damageFloat {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-40px) scale(1.5); opacity: 0; }
        }

        @keyframes healFloat {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-30px) scale(1.2); opacity: 0; }
        }

        @keyframes projectile {
            0% { transform: translateX(0) scale(1); opacity: 1; }
            50% { transform: translateX(100px) scale(1.2); opacity: 1; }
            100% { transform: translateX(200px) scale(0.5); opacity: 0; }
        }

        @keyframes projectileReverse {
            0% { transform: translateX(0) scale(1); opacity: 1; }
            50% { transform: translateX(-100px) scale(1.2); opacity: 1; }
            100% { transform: translateX(-200px) scale(0.5); opacity: 0; }
        }

        @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
        }

        @keyframes cardGlow {
            0%, 100% { box-shadow: 0 0 5px currentColor; }
            50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
        }

        @keyframes victoryBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }

        @keyframes particleExplode {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx, 30px), var(--ty, -30px)) scale(0); opacity: 0; }
        }

        .battle-shake { animation: battleShake 0.4s ease-in-out; }
        .battle-flash { animation: battleFlash 0.3s ease-in-out; }
        .battle-crit { animation: battleCrit 0.5s ease-out; }
        .battle-death { animation: battleDeath 0.6s ease-in forwards; }
        .battle-victory { animation: victoryBounce 0.5s ease-in-out 3; }
        .card-glow { animation: cardGlow 1s ease-in-out infinite; }

        .damage-number {
            position: absolute;
            font-weight: bold;
            font-size: 24px;
            color: #ef4444;
            text-shadow: 0 0 10px #ef4444, 2px 2px 0 #000;
            animation: damageFloat 0.8s ease-out forwards;
            pointer-events: none;
            z-index: 100;
        }

        .heal-number {
            position: absolute;
            font-weight: bold;
            font-size: 20px;
            color: #22c55e;
            text-shadow: 0 0 10px #22c55e, 2px 2px 0 #000;
            animation: healFloat 0.7s ease-out forwards;
            pointer-events: none;
            z-index: 100;
        }

        .crit-number {
            position: absolute;
            font-weight: bold;
            font-size: 32px;
            color: #fbbf24;
            text-shadow: 0 0 15px #fbbf24, 0 0 25px #f97316, 2px 2px 0 #000;
            animation: damageFloat 1s ease-out forwards;
            pointer-events: none;
            z-index: 100;
        }

        .projectile {
            position: absolute;
            font-size: 28px;
            animation: projectile 0.4s ease-in-out forwards;
            pointer-events: none;
            z-index: 50;
        }

        .projectile-reverse {
            animation: projectileReverse 0.4s ease-in-out forwards;
        }

        /* Responsive Battle UI */
        .battle-container {
            background: #12121a;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid #dc2626;
            max-height: calc(100vh - 120px);
            display: flex;
            flex-direction: column;
        }

        .battle-field {
            display: grid;
            grid-template-columns: 1fr 60px 1fr;
            gap: 10px;
            padding: 12px;
            background: linear-gradient(180deg, #0a0a0f, #12121a);
            align-items: stretch;
        }

        .battle-unit {
            background: linear-gradient(135deg, #1a2a1a, #0d200d);
            border: 2px solid #22c55e50;
            border-radius: 12px;
            padding: 10px;
            position: relative;
            overflow: hidden;
            min-height: 80px;
        }

        .battle-unit.enemy {
            background: linear-gradient(135deg, #2d1515, #200d0d);
            border-color: #ef444450;
        }

        .battle-cards {
            padding: 8px 12px;
            background: linear-gradient(180deg, #12121a, #1a1a24);
            overflow-x: auto;
            max-height: 160px;
        }

        .battle-card {
            min-width: 95px;
            max-width: 95px;
            padding: 6px;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            flex-shrink: 0;
        }

        .battle-card:hover:not([data-disabled]) {
            transform: translateY(-6px) scale(1.02);
            box-shadow: 0 8px 25px rgba(0,0,0,0.5);
            z-index: 10;
        }

        /* Compact arena */
        .battle-arena {
            position: relative;
            width: 100%;
            height: 130px;
            background: radial-gradient(circle at center, #0a0a0f 30%, #12121a 70%, #1a1a24 100%);
            border-radius: 50%;
            border: 2px solid #333;
            overflow: hidden;
        }

        /* Battle log compact */
        .battle-log {
            max-height: 60px;
            overflow-y: auto;
            padding: 8px 12px;
            background: linear-gradient(180deg, #0a0a0f, #05050a);
            border-top: 1px solid #222;
        }

        /* Laptop screens (1366x768 and similar) */
        @media (max-height: 800px) {
            .battle-container { max-height: calc(100vh - 100px); }
            .battle-field { padding: 8px; gap: 6px; }
            .battle-unit { padding: 8px; min-height: 70px; }
            .battle-cards { padding: 6px 10px; max-height: 130px; }
            .battle-card { min-width: 85px; max-width: 85px; padding: 5px; }
            .battle-arena { height: 100px; }
            .battle-log { max-height: 45px; padding: 6px 10px; }
        }

        /* Very small screens */
        @media (max-height: 700px) {
            .battle-container { max-height: calc(100vh - 80px); }
            .battle-field { padding: 6px; gap: 4px; }
            .battle-unit { padding: 6px; min-height: 60px; border-radius: 8px; }
            .battle-cards { padding: 5px 8px; max-height: 110px; }
            .battle-card { min-width: 75px; max-width: 75px; padding: 4px; border-radius: 8px; }
            .battle-arena { height: 80px; }
            .battle-log { max-height: 35px; padding: 4px 8px; }
        }

        @media (max-width: 1400px) {
            .battle-field { grid-template-columns: 1fr 50px 1fr; }
        }
    `;
  document.head.appendChild(styles);
}

// ============================================
// BATTLE ANIMATION HELPERS
// ============================================

/**
 * Show floating damage number on a target element
 * @param {Element} targetEl - The target element
 * @param {number} amount - Damage amount
 * @param {boolean} isCrit - Whether it's a critical hit
 */
function showDamageNumber(targetEl, amount, isCrit = false) {
  if (!targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const dmgEl = document.createElement('div');
  dmgEl.className = isCrit ? 'crit-number' : 'damage-number';
  dmgEl.textContent = isCrit ? `CRIT! -${amount}` : `-${amount}`;
  dmgEl.style.left = `${rect.left + rect.width / 2 + (Math.random() * 40 - 20)}px`;
  dmgEl.style.top = `${rect.top + rect.height / 3}px`;
  document.body.appendChild(dmgEl);

  setTimeout(() => dmgEl.remove(), 1000);
}

/**
 * Show floating heal number on a target element
 * @param {Element} targetEl - The target element
 * @param {number} amount - Heal amount
 */
function showHealNumber(targetEl, amount) {
  if (!targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const healEl = document.createElement('div');
  healEl.className = 'heal-number';
  healEl.textContent = `+${amount}`;
  healEl.style.left = `${rect.left + rect.width / 2}px`;
  healEl.style.top = `${rect.top + rect.height / 3}px`;
  document.body.appendChild(healEl);

  setTimeout(() => healEl.remove(), 800);
}

/**
 * Fire a projectile from source to target
 * @param {Element} sourceEl - The source element
 * @param {Element} targetEl - The target element
 * @param {string} emoji - The projectile emoji
 * @param {boolean} reverse - Direction (player to enemy or vice versa)
 */
function fireProjectile(sourceEl, targetEl, emoji = '💥', reverse = false) {
  if (!sourceEl || !targetEl) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const projEl = document.createElement('div');
  projEl.className = reverse ? 'projectile projectile-reverse' : 'projectile';
  projEl.textContent = emoji;
  projEl.style.left = `${sourceRect.left + sourceRect.width / 2}px`;
  projEl.style.top = `${sourceRect.top + sourceRect.height / 2}px`;
  document.body.appendChild(projEl);

  setTimeout(() => projEl.remove(), 500);
}

/**
 * Create particle explosion effect
 * @param {Element} targetEl - The target element
 * @param {string} color - Particle color
 * @param {number} count - Number of particles
 */
function createParticles(targetEl, color = '#ef4444', count = 8) {
  if (!targetEl) return;

  const rect = targetEl.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.style.cssText = `
            position: fixed;
            width: 8px;
            height: 8px;
            background: ${color};
            border-radius: 50%;
            left: ${centerX}px;
            top: ${centerY}px;
            pointer-events: none;
            z-index: 1000;
            --tx: ${(Math.random() - 0.5) * 100}px;
            --ty: ${(Math.random() - 0.5) * 100}px;
            animation: particleExplode 0.5s ease-out forwards;
        `;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 500);
  }
}

/**
 * Apply shake effect to element
 * @param {Element} el - Target element
 */
function shakeElement(el) {
  if (!el) return;
  el.classList.add('battle-shake');
  setTimeout(() => el.classList.remove('battle-shake'), 400);
}

/**
 * Apply flash effect to element
 * @param {Element} el - Target element
 */
function flashElement(el) {
  if (!el) return;
  el.classList.add('battle-flash');
  setTimeout(() => el.classList.remove('battle-flash'), 300);
}

/**
 * Apply critical hit effect to element
 * @param {Element} el - Target element
 */
function critElement(el) {
  if (!el) return;
  el.classList.add('battle-crit');
  setTimeout(() => el.classList.remove('battle-crit'), 500);
}

/**
 * Apply death animation to element
 * @param {Element} el - Target element
 */
function deathAnimation(el) {
  if (!el) return;
  el.classList.add('battle-death');
}

/**
 * Apply victory bounce animation
 * @param {Element} el - Target element
 */
function victoryAnimation(el) {
  if (!el) return;
  el.classList.add('battle-victory');
  setTimeout(() => el.classList.remove('battle-victory'), 1500);
}

// ============================================
// FIBONACCI HELPER (ASDF Philosophy)
// ============================================

const BATTLE_FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];

// ============================================
// BATTLE CONSTANTS (ASDF Philosophy - Fibonacci-based)
// ============================================

const BATTLE_CONSTANTS = Object.freeze({
  // Stat caps (fib[10] = 55)
  MAX_CRIT_CHANCE: 55,

  // Tier calculations (fib[6] = 8 levels per tier, fib[6]/100 = 8% bonus)
  LEVELS_PER_TIER: 8,
  TIER_BONUS_PERCENT: 0.08,

  // Damage multipliers (Golden ratio φ ≈ 1.618, fib[n+1]/fib[n])
  CRIT_MULTIPLIER: 1.618, // Golden ratio for critical hits
  DIAMOND_HANDS_BONUS: 1.34, // fib[8]/fib[7] = 21/13 ≈ 1.615, using 34% bonus
  LIFESTEAL_PERCENT: 0.34, // fib[9]/100 = 34%
  COUNTER_DAMAGE_PERCENT: 0.34, // fib[9]/100 = 34%

  // Win streak limits (fib[7] = 13)
  MAX_STREAK_BONUS: 13,

  // Drop chance base (fib[6] = 8)
  BASE_DROP_CHANCE: 8,
});

function getBattleFib(n) {
  if (n < 0) return 0;
  if (n < BATTLE_FIB.length) return BATTLE_FIB[n];
  // Calculate for larger indices
  let a = BATTLE_FIB[BATTLE_FIB.length - 2];
  let b = BATTLE_FIB[BATTLE_FIB.length - 1];
  for (let i = BATTLE_FIB.length; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// ============================================
// COMBAT STATS CALCULATION
// ============================================

/**
 * Combat roles derived from stats:
 * - ATK (Attack): DEV + STR (Technical + Strategic power)
 * - DEF (Defense): COM + CHA (Community shield + Influence)
 * - SPD (Speed): MKT + LCK (Initiative + Fortune)
 * - CRT (Critical): LCK + DEV (Lucky breaks + Precision)
 */
function calculateCombatStats() {
  const state = window.PumpArenaState?.get();
  if (!state) return null;

  const stats = state.stats;
  const tier = window.PumpArenaState.getCurrentTier();
  const tierBonus = 1 + tier.index * BATTLE_CONSTANTS.TIER_BONUS_PERCENT;

  // Base combat stats from character stats
  const baseAtk = Math.floor((stats.dev + stats.str) * tierBonus);
  const baseDef = Math.floor((stats.com + stats.cha) * tierBonus);
  const baseSpd = Math.floor((stats.mkt + stats.lck) * tierBonus);
  const baseCrt = Math.floor((stats.lck + stats.dev) / 2);

  // Health based on level + defense (Fibonacci scaling)
  const level = state.progression.level;
  const maxHp = getBattleFib(level + 5) + baseDef * 2;

  // Mana/Energy from influence
  const maxMp = state.resources.maxInfluence;

  return {
    atk: baseAtk,
    def: baseDef,
    spd: baseSpd,
    crt: Math.min(baseCrt, BATTLE_CONSTANTS.MAX_CRIT_CHANCE),
    maxHp,
    maxMp,
    level,
    tier: tier.name,
  };
}

// ============================================
// ENEMY DEFINITIONS (ASDF Philosophy)
// ============================================

const ENEMY_TYPES = {
  // Tier 1: EMBER enemies (levels 1-10)
  fud_bot: {
    id: 'fud_bot',
    name: 'FUD Bot',
    icon: '🤖',
    description: 'An automated fear-spreader',
    tier: 0,
    baseHp: getBattleFib(8), // 21
    baseAtk: getBattleFib(5), // 5
    baseDef: getBattleFib(4), // 3
    baseSpd: getBattleFib(6), // 8
    rewards: { xp: getBattleFib(7), tokens: getBattleFib(5) }, // 13 XP, 5 tokens
    drops: ['code_fragment'],
    critChance: 5,
  },
  paper_hands: {
    id: 'paper_hands',
    name: 'Paper Hands',
    icon: '📄',
    description: 'Panics at every dip',
    tier: 0,
    baseHp: getBattleFib(7), // 13
    baseAtk: getBattleFib(6), // 8
    baseDef: getBattleFib(3), // 2
    baseSpd: getBattleFib(7), // 13
    rewards: { xp: getBattleFib(6), tokens: getBattleFib(4) }, // 8 XP, 3 tokens
    drops: ['raw_silicon'],
    critChance: 10,
  },
  scam_token: {
    id: 'scam_token',
    name: 'Scam Token',
    icon: '💀',
    description: 'Honeypot in disguise',
    tier: 0,
    baseHp: getBattleFib(9), // 34
    baseAtk: getBattleFib(7), // 13
    baseDef: getBattleFib(5), // 5
    baseSpd: getBattleFib(5), // 5
    rewards: { xp: getBattleFib(8), tokens: getBattleFib(6) }, // 21 XP, 8 tokens
    drops: ['circuit_board'],
    critChance: 15,
  },

  // Tier 2: SPARK enemies (levels 11-20)
  whale_dumper: {
    id: 'whale_dumper',
    name: 'Whale Dumper',
    icon: '🐋',
    description: 'Massive sell pressure incoming',
    tier: 1,
    baseHp: getBattleFib(10), // 55
    baseAtk: getBattleFib(8), // 21
    baseDef: getBattleFib(6), // 8
    baseSpd: getBattleFib(4), // 3
    rewards: { xp: getBattleFib(9), tokens: getBattleFib(7) }, // 34 XP, 13 tokens
    drops: ['energy_cell', 'circuit_board'],
    critChance: 8,
  },
  mev_bot: {
    id: 'mev_bot',
    name: 'MEV Bot',
    icon: '⚡',
    description: 'Front-running your transactions',
    tier: 1,
    baseHp: getBattleFib(9), // 34
    baseAtk: getBattleFib(9), // 34
    baseDef: getBattleFib(4), // 3
    baseSpd: getBattleFib(10), // 55 - Very fast!
    rewards: { xp: getBattleFib(9), tokens: getBattleFib(8) }, // 34 XP, 21 tokens
    drops: ['code_fragment', 'code_fragment'],
    critChance: 20,
  },

  // Tier 3: FLAME enemies (levels 21-35)
  rug_puller: {
    id: 'rug_puller',
    name: 'Rug Puller',
    icon: '🧶',
    description: 'The liquidity is gone...',
    tier: 2,
    baseHp: getBattleFib(11), // 89
    baseAtk: getBattleFib(10), // 55
    baseDef: getBattleFib(7), // 13
    baseSpd: getBattleFib(8), // 21
    rewards: { xp: getBattleFib(10), tokens: getBattleFib(9) }, // 55 XP, 34 tokens
    drops: ['rare_alloy', 'energy_cell'],
    critChance: 12,
  },
  exploit_hacker: {
    id: 'exploit_hacker',
    name: 'Exploit Hacker',
    icon: '👨‍💻',
    description: 'Found a vulnerability in the contract',
    tier: 2,
    baseHp: getBattleFib(10), // 55
    baseAtk: getBattleFib(11), // 89 - High damage!
    baseDef: getBattleFib(5), // 5 - Glass cannon
    baseSpd: getBattleFib(9), // 34
    rewards: { xp: getBattleFib(10), tokens: getBattleFib(9) }, // 55 XP, 34 tokens
    drops: ['code_fragment', 'ancient_code'],
    critChance: 25,
  },

  // Tier 4: BLAZE enemies (levels 36-50)
  bear_market: {
    id: 'bear_market',
    name: 'Bear Market',
    icon: '🐻',
    description: 'Everything is down 90%',
    tier: 3,
    baseHp: getBattleFib(12), // 144
    baseAtk: getBattleFib(11), // 89
    baseDef: getBattleFib(9), // 34
    baseSpd: getBattleFib(6), // 8
    rewards: { xp: getBattleFib(11), tokens: getBattleFib(10) }, // 89 XP, 55 tokens
    drops: ['rare_alloy', 'quantum_chip'],
    critChance: 10,
  },
  sec_investigator: {
    id: 'sec_investigator',
    name: 'SEC Investigator',
    icon: '👔',
    description: 'Your token might be a security...',
    tier: 3,
    baseHp: getBattleFib(11), // 89
    baseAtk: getBattleFib(10), // 55
    baseDef: getBattleFib(11), // 89 - High defense!
    baseSpd: getBattleFib(5), // 5 - Slow bureaucracy
    rewards: { xp: getBattleFib(11), tokens: getBattleFib(10) }, // 89 XP, 55 tokens
    drops: ['legal_docs', 'rare_alloy'],
    critChance: 5,
  },

  // Tier 5: INFERNO bosses (level 50+)
  crypto_winter: {
    id: 'crypto_winter',
    name: 'Crypto Winter',
    icon: '❄️',
    description: 'The coldest season in memory',
    tier: 4,
    baseHp: getBattleFib(13), // 233
    baseAtk: getBattleFib(12), // 144
    baseDef: getBattleFib(10), // 55
    baseSpd: getBattleFib(7), // 13
    rewards: { xp: getBattleFib(12), tokens: getBattleFib(11) }, // 144 XP, 89 tokens
    drops: ['quantum_chip', 'ancient_code', 'legendary_core'],
    critChance: 15,
    isBoss: true,
  },
  exchange_collapse: {
    id: 'exchange_collapse',
    name: 'Exchange Collapse',
    icon: '💥',
    description: 'Your funds are not safu',
    tier: 4,
    baseHp: getBattleFib(14), // 377
    baseAtk: getBattleFib(13), // 233
    baseDef: getBattleFib(11), // 89
    baseSpd: getBattleFib(6), // 8
    rewards: { xp: getBattleFib(13), tokens: getBattleFib(12) }, // 233 XP, 144 tokens
    drops: ['legendary_core', 'legendary_core'],
    critChance: 20,
    isBoss: true,
  },
};

// SECURITY: Freeze constants to prevent runtime modification
Object.freeze(ENEMY_TYPES);
Object.values(ENEMY_TYPES).forEach(enemy => Object.freeze(enemy));

// ============================================
// CARD SYSTEM (ASDF Philosophy)
// ============================================

// Card rarities with Fibonacci-based draw weights
const CARD_RARITY = {
  common: { weight: getBattleFib(8), color: '#9ca3af', name: 'Common' }, // 21
  uncommon: { weight: getBattleFib(7), color: '#22c55e', name: 'Uncommon' }, // 13
  rare: { weight: getBattleFib(6), color: '#3b82f6', name: 'Rare' }, // 8
  epic: { weight: getBattleFib(5), color: '#a855f7', name: 'Epic' }, // 5
  legendary: { weight: getBattleFib(4), color: '#f97316', name: 'Legendary' }, // 3
};

// SECURITY: Freeze constants to prevent runtime modification
Object.freeze(CARD_RARITY);
Object.values(CARD_RARITY).forEach(rarity => Object.freeze(rarity));

// Action cards - player draws these each turn
const ACTION_CARDS = {
  // Common Attack Cards
  quick_strike: {
    id: 'quick_strike',
    name: 'Quick Strike',
    icon: '⚔️',
    description: 'A fast, basic attack',
    type: 'attack',
    rarity: 'common',
    mpCost: 0,
    damage: getBattleFib(6), // 8 base damage
    effects: [],
  },
  code_slash: {
    id: 'code_slash',
    name: 'Code Slash',
    icon: '💻',
    description: 'Attack with coding prowess',
    type: 'attack',
    rarity: 'common',
    mpCost: getBattleFib(4), // 3 MP
    damage: getBattleFib(7), // 13 base damage
    statBonus: 'dev',
    effects: [],
  },

  // Uncommon Attack Cards
  market_crash: {
    id: 'market_crash',
    name: 'Market Crash',
    icon: '📉',
    description: 'Cause a sudden market crash',
    type: 'attack',
    rarity: 'uncommon',
    mpCost: getBattleFib(5), // 5 MP
    damage: getBattleFib(8), // 21 base damage
    effects: ['weaken'], // Reduces enemy ATK
  },
  viral_post: {
    id: 'viral_post',
    name: 'Viral Post',
    icon: '📢',
    description: 'Your marketing goes viral',
    type: 'attack',
    rarity: 'uncommon',
    mpCost: getBattleFib(5),
    damage: getBattleFib(7),
    statBonus: 'mkt',
    effects: ['burn'], // DoT damage
  },

  // Rare Attack Cards
  whale_slam: {
    id: 'whale_slam',
    name: 'Whale Slam',
    icon: '🐋',
    description: 'Call a whale for massive impact',
    type: 'attack',
    rarity: 'rare',
    mpCost: getBattleFib(6), // 8 MP
    damage: getBattleFib(9), // 34 base damage
    effects: ['stun'], // Enemy skips next turn
  },
  token_burn: {
    id: 'token_burn',
    name: 'Token Burn',
    icon: '🔥',
    description: 'Burn tokens for massive damage',
    type: 'attack',
    rarity: 'rare',
    mpCost: getBattleFib(4),
    tokenCost: getBattleFib(6), // 8 tokens
    damage: getBattleFib(10), // 55 base damage
    effects: [],
  },

  // Epic Attack Cards
  fomo_frenzy: {
    id: 'fomo_frenzy',
    name: 'FOMO Frenzy',
    icon: '😱',
    description: 'Damage scales with missing HP',
    type: 'attack',
    rarity: 'epic',
    mpCost: getBattleFib(6),
    damage: getBattleFib(8),
    effects: ['fomo'], // Damage * (1 + missing HP%)
  },
  rug_pull: {
    id: 'rug_pull',
    name: 'Rug Pull',
    icon: '🧶',
    description: 'Pull the rug - devastating attack',
    type: 'attack',
    rarity: 'epic',
    mpCost: getBattleFib(7),
    damage: getBattleFib(10),
    effects: ['lifesteal'], // Heal for 50% damage dealt
  },

  // Legendary Attack Cards
  moon_shot: {
    id: 'moon_shot',
    name: 'Moon Shot',
    icon: '🚀',
    description: 'TO THE MOON! Ultimate attack',
    type: 'attack',
    rarity: 'legendary',
    mpCost: getBattleFib(8), // 21 MP
    damage: getBattleFib(11), // 89 base damage
    effects: ['pierce'], // Ignores defense
  },

  // Common Defense Cards
  basic_block: {
    id: 'basic_block',
    name: 'Basic Block',
    icon: '🛡️',
    description: 'Block incoming damage',
    type: 'defense',
    rarity: 'common',
    mpCost: 0,
    block: getBattleFib(6), // Block 8 damage
    effects: [],
  },
  community_wall: {
    id: 'community_wall',
    name: 'Community Wall',
    icon: '🧱',
    description: 'Rally community for defense',
    type: 'defense',
    rarity: 'common',
    mpCost: getBattleFib(4),
    block: getBattleFib(7), // Block 13 damage
    statBonus: 'com',
    effects: ['defense_buff'],
  },

  // Uncommon Defense Cards
  diamond_stance: {
    id: 'diamond_stance',
    name: 'Diamond Stance',
    icon: '💎',
    description: 'HODL position - strong defense',
    type: 'defense',
    rarity: 'uncommon',
    mpCost: getBattleFib(5),
    block: getBattleFib(8), // Block 21 damage
    effects: ['reflect'], // Reflect 25% damage
  },

  // Rare Defense Cards
  audit_shield: {
    id: 'audit_shield',
    name: 'Audit Shield',
    icon: '📋',
    description: 'Audited code protects you',
    type: 'defense',
    rarity: 'rare',
    mpCost: getBattleFib(6),
    block: getBattleFib(9), // Block 34 damage
    effects: ['immunity'], // Immune to effects this turn
  },

  // Common Support Cards
  quick_heal: {
    id: 'quick_heal',
    name: 'Quick Heal',
    icon: '💚',
    description: 'Heal a small amount',
    type: 'support',
    rarity: 'common',
    mpCost: getBattleFib(4),
    heal: getBattleFib(6), // Heal 8 HP
    effects: [],
  },
  energy_drink: {
    id: 'energy_drink',
    name: 'Energy Drink',
    icon: '⚡',
    description: 'Restore energy (MP)',
    type: 'support',
    rarity: 'common',
    mpCost: 0,
    mpRestore: getBattleFib(6), // Restore 8 MP
    effects: [],
  },

  // Uncommon Support Cards
  pump_it_up: {
    id: 'pump_it_up',
    name: 'Pump It Up',
    icon: '📈',
    description: 'Boost your next attack',
    type: 'support',
    rarity: 'uncommon',
    mpCost: getBattleFib(4),
    effects: ['attack_buff'], // +50% next attack
  },
  market_analysis: {
    id: 'market_analysis',
    name: 'Market Analysis',
    icon: '📊',
    description: 'Analyze enemy weaknesses',
    type: 'support',
    rarity: 'uncommon',
    mpCost: getBattleFib(5),
    effects: ['expose'], // Enemy takes +25% damage
  },

  // Rare Support Cards
  diamond_hands: {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    icon: '💎',
    description: 'Strong HODL - big heal',
    type: 'support',
    rarity: 'rare',
    mpCost: getBattleFib(6),
    heal: getBattleFib(8), // Heal 21 HP
    effects: ['defense_buff'],
  },

  // Epic Support Cards
  bull_run: {
    id: 'bull_run',
    name: 'Bull Run',
    icon: '🐂',
    description: 'Start a bull run - massive buffs',
    type: 'support',
    rarity: 'epic',
    mpCost: getBattleFib(7),
    effects: ['attack_buff', 'defense_buff', 'speed_buff'],
  },

  // Common Special Cards
  position_shift: {
    id: 'position_shift',
    name: 'Position Shift',
    icon: '🔄',
    description: 'Move to any adjacent position',
    type: 'special',
    rarity: 'common',
    mpCost: 0,
    effects: ['move'], // Free movement
  },

  // Uncommon Special Cards
  counter_trade: {
    id: 'counter_trade',
    name: 'Counter Trade',
    icon: '↩️',
    description: 'Counter the next attack',
    type: 'special',
    rarity: 'uncommon',
    mpCost: getBattleFib(5),
    effects: ['counter'], // Counter next attack
  },

  // Rare Special Cards
  flash_crash: {
    id: 'flash_crash',
    name: 'Flash Crash',
    icon: '💥',
    description: 'Instant position swap with enemy',
    type: 'special',
    rarity: 'rare',
    mpCost: getBattleFib(6),
    effects: ['swap_positions'],
  },

  // Legendary Special Card
  golden_bull: {
    id: 'golden_bull',
    name: 'Golden Bull',
    icon: '🏆',
    description: 'Ultimate card - attack + heal + buff',
    type: 'special',
    rarity: 'legendary',
    mpCost: getBattleFib(8),
    damage: getBattleFib(9),
    heal: getBattleFib(7),
    effects: ['attack_buff', 'defense_buff'],
  },
};

// SECURITY: Freeze constants to prevent runtime modification
Object.freeze(ACTION_CARDS);
Object.values(ACTION_CARDS).forEach(card => Object.freeze(card));

// Player's base deck (cards they start with)
const BASE_DECK = [
  'quick_strike',
  'quick_strike',
  'quick_strike',
  'code_slash',
  'code_slash',
  'basic_block',
  'basic_block',
  'community_wall',
  'quick_heal',
  'quick_heal',
  'energy_drink',
  'position_shift',
];

// SECURITY: Freeze constants to prevent runtime modification
Object.freeze(BASE_DECK);

/**
 * Initialize card deck for battle
 */
function initializeDeck() {
  const deck = [...BASE_DECK];

  // Add bonus cards based on player level
  const state = window.PumpArenaState?.get();
  const level = state?.progression.level || 1;

  // Add uncommon cards at level 5+
  if (level >= 5) {
    deck.push('market_crash', 'viral_post', 'diamond_stance', 'pump_it_up');
  }

  // Add rare cards at level 15+
  if (level >= 15) {
    deck.push('whale_slam', 'token_burn', 'audit_shield', 'diamond_hands', 'counter_trade');
  }

  // Add epic cards at level 25+
  if (level >= 25) {
    deck.push('fomo_frenzy', 'rug_pull', 'bull_run', 'flash_crash');
  }

  // Add legendary cards at level 40+
  if (level >= 40) {
    deck.push('moon_shot', 'golden_bull');
  }

  return shuffleDeck(deck);
}

/**
 * Shuffle deck (Fisher-Yates algorithm)
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw cards from deck
 */
function drawCards(count) {
  const drawn = [];
  for (let i = 0; i < count && battleState.deck.length > 0; i++) {
    drawn.push(battleState.deck.pop());
  }

  // If deck is empty, shuffle discard pile back
  if (battleState.deck.length === 0 && battleState.discardPile.length > 0) {
    battleState.deck = shuffleDeck(battleState.discardPile);
    battleState.discardPile = [];
    battleState.log.push('Deck reshuffled!');
  }

  return drawn;
}

// ============================================
// COMBAT SKILLS (Legacy - kept for compatibility)
// ============================================

const COMBAT_SKILLS = {
  // Basic attacks
  basic_attack: {
    id: 'basic_attack',
    name: 'Basic Attack',
    icon: '⚔️',
    description: 'A standard attack',
    type: 'attack',
    mpCost: 0,
    damageMultiplier: 1.0,
    cooldown: 0,
  },
  code_strike: {
    id: 'code_strike',
    name: 'Code Strike',
    icon: '💻',
    description: 'Attack with technical prowess',
    type: 'attack',
    mpCost: getBattleFib(5), // 5
    damageMultiplier: 1.5,
    statBonus: 'dev',
    cooldown: 1,
  },
  community_shield: {
    id: 'community_shield',
    name: 'Community Shield',
    icon: '🛡️',
    description: 'Rally the community for defense',
    type: 'defense',
    mpCost: getBattleFib(6), // 8
    damageMultiplier: 0,
    effect: 'defense_buff',
    buffAmount: getBattleFib(5), // +5 DEF
    duration: 3,
    cooldown: 3,
  },
  viral_campaign: {
    id: 'viral_campaign',
    name: 'Viral Campaign',
    icon: '📢',
    description: 'Marketing blitz damages all enemies',
    type: 'attack',
    mpCost: getBattleFib(7), // 13
    damageMultiplier: 0.8,
    aoe: true,
    statBonus: 'mkt',
    cooldown: 2,
  },
  diamond_hands: {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    icon: '💎',
    description: 'HODL through the pain, heal yourself',
    type: 'support',
    mpCost: getBattleFib(6), // 8
    damageMultiplier: 0,
    effect: 'heal',
    healAmount: getBattleFib(8), // 21 HP
    cooldown: 4,
  },
  burn_attack: {
    id: 'burn_attack',
    name: 'Token Burn',
    icon: '🔥',
    description: 'Burn tokens for massive damage (costs tokens)',
    type: 'attack',
    mpCost: getBattleFib(4), // 3
    tokenCost: getBattleFib(6), // 8 tokens
    damageMultiplier: 3.0,
    cooldown: 5,
  },
  lucky_trade: {
    id: 'lucky_trade',
    name: 'Lucky Trade',
    icon: '🍀',
    description: 'High risk, high reward attack',
    type: 'attack',
    mpCost: getBattleFib(5), // 5
    damageMultiplier: 2.5,
    accuracy: 60, // Only 60% hit chance
    statBonus: 'lck',
    cooldown: 2,
  },
  ultimate_pump: {
    id: 'ultimate_pump',
    name: 'Ultimate Pump',
    icon: '🚀',
    description: 'TO THE MOON! Ultimate attack',
    type: 'attack',
    mpCost: getBattleFib(8), // 21
    damageMultiplier: 5.0,
    cooldown: 8,
    requiresLevel: 20,
  },
  // New strategic skills
  market_analysis: {
    id: 'market_analysis',
    name: 'Market Analysis',
    icon: '📊',
    description: 'Analyze enemy weaknesses, boost next attack',
    type: 'support',
    mpCost: getBattleFib(5), // 5
    damageMultiplier: 0,
    effect: 'attack_buff',
    buffAmount: getBattleFib(6), // +8 ATK
    duration: 2,
    cooldown: 3,
  },
  whale_call: {
    id: 'whale_call',
    name: 'Whale Call',
    icon: '🐋',
    description: 'Call whale support for heavy damage',
    type: 'attack',
    mpCost: getBattleFib(7), // 13
    damageMultiplier: 2.2,
    cooldown: 4,
  },
  fomo_strike: {
    id: 'fomo_strike',
    name: 'FOMO Strike',
    icon: '😱',
    description: 'Fear of missing out - damage scales with missing HP',
    type: 'attack',
    mpCost: getBattleFib(6), // 8
    damageMultiplier: 1.0,
    effect: 'fomo', // Special: damage increases when low HP
    cooldown: 3,
  },
};

// SECURITY: Freeze constants to prevent runtime modification
Object.freeze(COMBAT_SKILLS);
Object.values(COMBAT_SKILLS).forEach(skill => Object.freeze(skill));

// ============================================
// CIRCULAR ARENA SYSTEM (9 positions)
// ============================================

// Arena layout: 9 positions in a circle
// Positions 0-2: Inner ring (CLOSE) - melee advantage
// Positions 3-5: Middle ring (MID) - balanced
// Positions 6-8: Outer ring (FAR) - ranged advantage

const ARENA_POSITIONS = {
  0: { id: 0, ring: 'close', name: 'Center', x: 50, y: 50, angle: 0 },
  1: { id: 1, ring: 'close', name: 'Inner Left', x: 30, y: 40, angle: 120 },
  2: { id: 2, ring: 'close', name: 'Inner Right', x: 70, y: 40, angle: 240 },
  3: { id: 3, ring: 'mid', name: 'Mid Top', x: 50, y: 20, angle: 0 },
  4: { id: 4, ring: 'mid', name: 'Mid Left', x: 20, y: 60, angle: 120 },
  5: { id: 5, ring: 'mid', name: 'Mid Right', x: 80, y: 60, angle: 240 },
  6: { id: 6, ring: 'far', name: 'Outer Top', x: 50, y: 5, angle: 0 },
  7: { id: 7, ring: 'far', name: 'Outer Left', x: 5, y: 75, angle: 120 },
  8: { id: 8, ring: 'far', name: 'Outer Right', x: 95, y: 75, angle: 240 },
};

// Adjacent positions for movement
const ARENA_ADJACENCY = {
  0: [1, 2, 3, 4, 5], // Center connects to inner and mid
  1: [0, 2, 4],
  2: [0, 1, 5],
  3: [0, 4, 5, 6],
  4: [1, 3, 5, 7],
  5: [2, 3, 4, 8],
  6: [3, 7, 8],
  7: [4, 6, 8],
  8: [5, 6, 7],
};

// Ring combat modifiers
const RING_MODIFIERS = {
  close: { melee: 1.3, ranged: 0.7, defense: 0.9 }, // Melee strong, ranged weak
  mid: { melee: 1.0, ranged: 1.0, defense: 1.0 }, // Balanced
  far: { melee: 0.7, ranged: 1.3, defense: 1.1 }, // Ranged strong, melee weak
};

// SECURITY: Freeze arena constants to prevent runtime modification
Object.freeze(ARENA_POSITIONS);
Object.values(ARENA_POSITIONS).forEach(pos => Object.freeze(pos));
Object.freeze(ARENA_ADJACENCY);
Object.values(ARENA_ADJACENCY).forEach(adj => Object.freeze(adj));
Object.freeze(RING_MODIFIERS);
Object.values(RING_MODIFIERS).forEach(mod => Object.freeze(mod));

/**
 * Calculate distance between two positions
 */
function getPositionDistance(pos1, pos2) {
  if (pos1 === pos2) return 0;
  const p1 = ARENA_POSITIONS[pos1];
  const p2 = ARENA_POSITIONS[pos2];
  if (p1.ring === p2.ring) return 1;
  if ((p1.ring === 'close' && p2.ring === 'far') || (p1.ring === 'far' && p2.ring === 'close')) {
    return 2;
  }
  return 1;
}

/**
 * Check if movement is valid
 */
function canMoveTo(fromPos, toPos) {
  return ARENA_ADJACENCY[fromPos]?.includes(toPos) || false;
}

// ============================================
// BATTLE STATE
// ============================================

let battleState = {
  active: false,
  player: null,
  enemy: null,
  turn: 0,
  phase: 'player', // 'player' or 'enemy' - turn-based system
  playerHp: 0,
  playerMp: 0,
  enemyHp: 0,
  playerPosition: 0, // Player starts at center
  enemyPosition: 6, // Enemy starts at outer top
  // Card system
  deck: [], // Draw pile
  hand: [], // Cards in hand (max 5)
  discardPile: [], // Used cards
  cardsPerTurn: 3, // Cards drawn each turn
  maxHandSize: 5, // Maximum cards in hand
  // Status effects
  buffs: [],
  debuffs: [],
  enemyDebuffs: [], // Debuffs on enemy
  // Block for this turn
  currentBlock: 0,
  // Special states
  isStunned: false, // Enemy stunned (skips turn)
  hasCounter: false, // Player has counter active
  isExposed: false, // Enemy takes extra damage
  cooldowns: {},
  log: [],
};

// ============================================
// BATTLE RATE LIMITER (Security by Design)
// ============================================

const BattleRateLimiter = {
  lastAction: 0,
  actionCount: 0,
  windowStart: Date.now(),

  checkAction() {
    const now = Date.now();

    // Minimum 500ms between actions (fib[5] * 100)
    if (now - this.lastAction < 500) {
      return { allowed: false, message: 'Too fast! Wait a moment.' };
    }

    // Max 30 actions per minute
    if (now - this.windowStart > 60000) {
      this.actionCount = 0;
      this.windowStart = now;
    }

    if (this.actionCount >= 30) {
      return { allowed: false, message: 'Rate limit reached. Wait a minute.' };
    }

    return { allowed: true };
  },

  recordAction() {
    this.lastAction = Date.now();
    this.actionCount++;
  },
};

// ============================================
// BATTLE UTILITY FUNCTIONS (DRY Helpers)
// ============================================

/**
 * Reduce all active cooldowns by 1 (DRY - extracted to prevent duplication)
 */
function reduceCooldowns() {
  Object.keys(battleState.cooldowns).forEach(key => {
    if (battleState.cooldowns[key] > 0) {
      battleState.cooldowns[key]--;
    }
  });
}

/**
 * Process buff durations and remove expired buffs
 */
function processBuffDurations() {
  battleState.buffs = battleState.buffs.filter(buff => {
    buff.duration--;
    return buff.duration > 0;
  });
}

// ============================================
// BATTLE INITIALIZATION
// ============================================

/**
 * Start a battle with an enemy
 * @param {string} enemyId - Enemy type ID
 * @returns {Object} Battle result
 */
function startBattle(enemyId) {
  // Input validation (Security by Design)
  if (typeof enemyId !== 'string' || !ENEMY_TYPES[enemyId]) {
    return { success: false, message: 'Invalid enemy type' };
  }

  if (battleState.active) {
    return { success: false, message: 'Already in battle' };
  }

  const playerStats = calculateCombatStats();
  if (!playerStats) {
    return { success: false, message: 'Could not load player stats' };
  }

  const enemyTemplate = ENEMY_TYPES[enemyId];
  const playerLevel = playerStats.level;

  // Scale enemy to player level (Fibonacci-based scaling)
  const levelDiff = Math.max(
    0,
    playerLevel - enemyTemplate.tier * BATTLE_CONSTANTS.LEVELS_PER_TIER
  );
  const levelScale = 1 + levelDiff * 0.05; // 5% per level

  const enemy = {
    ...enemyTemplate,
    hp: Math.floor(enemyTemplate.baseHp * levelScale),
    maxHp: Math.floor(enemyTemplate.baseHp * levelScale),
    atk: Math.floor(enemyTemplate.baseAtk * levelScale),
    def: Math.floor(enemyTemplate.baseDef * levelScale),
    spd: Math.floor(enemyTemplate.baseSpd * levelScale),
  };

  // Initialize battle state with arena positions
  // Player starts at center (0), enemy at outer ring based on enemy type
  const enemyStartPos = enemy.isBoss ? 6 : 3 + Math.floor(Math.random() * 3); // Bosses at far, others at mid

  // Initialize card deck
  const deck = initializeDeck();

  battleState = {
    active: true,
    player: playerStats,
    enemy: enemy,
    turn: 1,
    phase: 'player',
    playerHp: playerStats.maxHp,
    playerMp: playerStats.maxMp,
    enemyHp: enemy.hp,
    playerPosition: 0, // Player starts at center
    enemyPosition: enemyStartPos,
    // Card system
    deck: deck.slice(5), // Rest of deck after initial draw
    hand: deck.slice(0, 5), // Draw initial hand of 5 cards
    discardPile: [],
    cardsPerTurn: 3,
    maxHandSize: 5,
    // Status effects
    buffs: [],
    debuffs: [],
    enemyDebuffs: [],
    currentBlock: 0,
    isStunned: false,
    hasCounter: false,
    isExposed: false,
    cooldowns: {},
    log: [
      `Battle started against ${enemy.name}!`,
      `You are at ${ARENA_POSITIONS[0].name}, enemy at ${ARENA_POSITIONS[enemyStartPos].name}`,
      `Drew 5 cards - Choose wisely!`,
    ],
  };

  // Dispatch battle start event
  document.dispatchEvent(
    new CustomEvent('pumparena:battle-start', {
      detail: { enemy: enemy.name, enemyHp: enemy.hp },
    })
  );

  return {
    success: true,
    battle: getBattleState(),
  };
}

/**
 * Move player to a new position
 */
function movePlayer(targetPos) {
  if (!battleState.active) {
    return { success: false, message: 'No active battle' };
  }

  if (typeof targetPos !== 'number' || !ARENA_POSITIONS[targetPos]) {
    return { success: false, message: 'Invalid position' };
  }

  if (targetPos === battleState.playerPosition) {
    return { success: false, message: 'Already at this position' };
  }

  if (targetPos === battleState.enemyPosition) {
    return { success: false, message: 'Position occupied by enemy' };
  }

  if (!canMoveTo(battleState.playerPosition, targetPos)) {
    return { success: false, message: 'Cannot move there from current position' };
  }

  const oldPos = ARENA_POSITIONS[battleState.playerPosition];
  const newPos = ARENA_POSITIONS[targetPos];

  battleState.playerPosition = targetPos;
  battleState.log.push(`Moved from ${oldPos.name} to ${newPos.name}`);

  // Enemy gets a turn after player moves
  if (battleState.enemyHp > 0 && battleState.playerHp > 0) {
    const enemyResult = enemyTurn();
  }

  // Reduce cooldowns (DRY helper)
  reduceCooldowns();

  battleState.turn++;

  return {
    success: true,
    message: `Moved to ${newPos.name}`,
    state: getBattleState(),
  };
}

/**
 * Get current battle state (safe copy)
 */
function getBattleState() {
  if (!battleState.active) return null;

  const playerPos = ARENA_POSITIONS[battleState.playerPosition];
  const enemyPos = ARENA_POSITIONS[battleState.enemyPosition];
  const distance = getPositionDistance(battleState.playerPosition, battleState.enemyPosition);

  // Get full card objects for hand
  const handCards = battleState.hand
    .map(cardId => ({
      ...ACTION_CARDS[cardId],
      id: cardId,
    }))
    .filter(c => c.name); // Filter out invalid cards

  return {
    active: battleState.active,
    turn: battleState.turn,
    phase: battleState.phase,
    arena: {
      playerPosition: battleState.playerPosition,
      enemyPosition: battleState.enemyPosition,
      playerRing: playerPos?.ring || 'close',
      enemyRing: enemyPos?.ring || 'far',
      distance,
      validMoves:
        ARENA_ADJACENCY[battleState.playerPosition]?.filter(p => p !== battleState.enemyPosition) ||
        [],
    },
    player: {
      hp: battleState.playerHp,
      maxHp: battleState.player.maxHp,
      mp: battleState.playerMp,
      maxMp: battleState.player.maxMp,
      atk: battleState.player.atk,
      def: battleState.player.def,
      block: battleState.currentBlock,
      buffs: [...battleState.buffs],
      hasCounter: battleState.hasCounter,
    },
    enemy: {
      name: battleState.enemy.name,
      icon: battleState.enemy.icon,
      hp: battleState.enemyHp,
      maxHp: battleState.enemy.maxHp,
      atk: battleState.enemy.atk,
      def: battleState.enemy.def,
      spd: battleState.enemy.spd,
      isBoss: battleState.enemy.isBoss || false,
      isStunned: battleState.isStunned,
      isExposed: battleState.isExposed,
      debuffs: [...battleState.enemyDebuffs],
    },
    // Card system
    cards: {
      hand: handCards,
      handSize: battleState.hand.length,
      deckSize: battleState.deck.length,
      discardSize: battleState.discardPile.length,
    },
    cooldowns: { ...battleState.cooldowns },
    log: [...battleState.log.slice(-5)], // Last 5 log entries
  };
}

// ============================================
// CARD-BASED COMBAT ACTIONS
// ============================================

/**
 * Play a card from hand
 * @param {number} cardIndex - Index of card in hand to play
 * @param {number} targetPosition - Optional target position for movement cards
 * @returns {Object} Result of playing the card
 */
function playCard(cardIndex, targetPosition = null) {
  // Rate limiting
  const rateCheck = BattleRateLimiter.checkAction();
  if (!rateCheck.allowed) {
    return { success: false, message: rateCheck.message };
  }

  if (!battleState.active) {
    return { success: false, message: 'No active battle' };
  }

  if (battleState.phase !== 'player') {
    return { success: false, message: 'Not your turn!' };
  }

  if (cardIndex < 0 || cardIndex >= battleState.hand.length) {
    return { success: false, message: 'Invalid card selection' };
  }

  const cardId = battleState.hand[cardIndex];
  const card = ACTION_CARDS[cardId];

  if (!card) {
    return { success: false, message: 'Invalid card' };
  }

  // Check MP cost
  if (card.mpCost && battleState.playerMp < card.mpCost) {
    return { success: false, message: 'Not enough energy!' };
  }

  // Check token cost
  if (card.tokenCost) {
    const state = window.PumpArenaState?.get();
    if (!state || state.resources.tokens < card.tokenCost) {
      return { success: false, message: 'Not enough tokens!' };
    }
  }

  BattleRateLimiter.recordAction();

  // Deduct costs
  if (card.mpCost) {
    battleState.playerMp -= card.mpCost;
  }
  if (card.tokenCost) {
    window.PumpArenaState.addTokens(-card.tokenCost);
    battleState.log.push(`Burned ${card.tokenCost} tokens!`);
  }

  // Remove card from hand and add to discard pile
  battleState.hand.splice(cardIndex, 1);
  battleState.discardPile.push(cardId);

  // Execute card effect
  const result = executeCardEffect(card, targetPosition);

  battleState.log.push(`Played ${card.name}!`);

  // Check for battle end after player action
  if (battleState.enemyHp <= 0) {
    result.victory = true;
    result.rewards = endBattle(true);
    return { success: true, ...result, state: getBattleState() };
  }

  return { success: true, ...result, state: getBattleState() };
}

/**
 * Execute card effect
 */
function executeCardEffect(card, targetPosition) {
  const result = { damage: 0, healed: 0, blocked: 0, effects: [] };

  // Get position modifiers
  const playerRing = ARENA_POSITIONS[battleState.playerPosition]?.ring || 'mid';
  const ringMod = RING_MODIFIERS[playerRing];
  const distance = getPositionDistance(battleState.playerPosition, battleState.enemyPosition);

  // Handle damage
  if (card.damage) {
    let damage = card.damage;

    // Add player ATK
    damage += Math.floor(battleState.player.atk / 2);

    // Add stat bonus
    if (card.statBonus) {
      const state = window.PumpArenaState?.get();
      if (state) {
        damage += state.stats[card.statBonus] || 0;
      }
    }

    // Apply position modifiers (melee if close, ranged if far)
    const isMelee = distance <= 1;
    if (isMelee) {
      damage = Math.floor(damage * ringMod.melee);
    } else {
      damage = Math.floor(damage * ringMod.ranged);
    }

    // FOMO effect: damage scales with missing HP
    if (card.effects.includes('fomo')) {
      const missingHpPercent = 1 - battleState.playerHp / battleState.player.maxHp;
      const fomoBonus = 1 + missingHpPercent * 2;
      damage = Math.floor(damage * fomoBonus);
      if (missingHpPercent > 0.3) {
        battleState.log.push(`FOMO bonus! (+${Math.floor(missingHpPercent * 200)}%)`);
      }
    }

    // Expose effect: enemy takes extra damage (fib[9] = 34%)
    if (battleState.isExposed) {
      damage = Math.floor(damage * BATTLE_CONSTANTS.DIAMOND_HANDS_BONUS);
      battleState.log.push('Enemy exposed! (+34% damage)');
    }

    // Pierce effect: ignores defense
    if (!card.effects.includes('pierce')) {
      const defReduction = Math.floor(battleState.enemy.def / getBattleFib(5));
      damage = Math.max(1, damage - defReduction);
    } else {
      battleState.log.push('Piercing attack! Ignores defense');
    }

    // Critical hit check (Golden ratio multiplier φ ≈ 1.618)
    if (Math.random() * 100 < battleState.player.crt) {
      damage = Math.floor(damage * BATTLE_CONSTANTS.CRIT_MULTIPLIER);
      battleState.log.push('CRITICAL HIT!');
      result.critical = true;
    }

    // Apply damage
    battleState.enemyHp -= damage;
    battleState.enemyHp = Math.max(0, battleState.enemyHp);
    result.damage = damage;
    battleState.log.push(`Dealt ${damage} damage!`);

    // Lifesteal effect (fib[9]/100 = 34%)
    if (card.effects.includes('lifesteal')) {
      const healAmount = Math.floor(damage * BATTLE_CONSTANTS.LIFESTEAL_PERCENT);
      battleState.playerHp = Math.min(battleState.player.maxHp, battleState.playerHp + healAmount);
      result.healed = healAmount;
      battleState.log.push(`Lifesteal: +${healAmount} HP`);
    }
  }

  // Handle block
  if (card.block) {
    let blockAmount = card.block;

    // Add stat bonus
    if (card.statBonus) {
      const state = window.PumpArenaState?.get();
      if (state) {
        blockAmount += Math.floor((state.stats[card.statBonus] || 0) / 2);
      }
    }

    battleState.currentBlock += blockAmount;
    result.blocked = blockAmount;
    battleState.log.push(`Gained ${blockAmount} block`);
  }

  // Handle heal
  if (card.heal) {
    const healAmount = card.heal;
    battleState.playerHp = Math.min(battleState.player.maxHp, battleState.playerHp + healAmount);
    result.healed = (result.healed || 0) + healAmount;
    battleState.log.push(`Healed ${healAmount} HP`);
  }

  // Handle MP restore
  if (card.mpRestore) {
    battleState.playerMp = Math.min(
      battleState.player.maxMp,
      battleState.playerMp + card.mpRestore
    );
    battleState.log.push(`Restored ${card.mpRestore} energy`);
  }

  // Process card effects
  for (const effect of card.effects) {
    switch (effect) {
      case 'weaken':
        battleState.enemyDebuffs.push({ type: 'weaken', amount: getBattleFib(4), duration: 2 });
        battleState.log.push('Enemy weakened! (-ATK)');
        result.effects.push('weaken');
        break;

      case 'burn':
        battleState.enemyDebuffs.push({ type: 'burn', damage: getBattleFib(4), duration: 3 });
        battleState.log.push('Enemy burning! (DoT)');
        result.effects.push('burn');
        break;

      case 'stun':
        battleState.isStunned = true;
        battleState.log.push('Enemy stunned! (Skips next turn)');
        result.effects.push('stun');
        break;

      case 'defense_buff':
        battleState.buffs.push({ type: 'defense_buff', amount: getBattleFib(5), duration: 2 });
        battleState.log.push('Defense increased!');
        result.effects.push('defense_buff');
        break;

      case 'attack_buff':
        battleState.buffs.push({ type: 'attack_buff', amount: getBattleFib(5), duration: 2 });
        battleState.log.push('Attack increased!');
        result.effects.push('attack_buff');
        break;

      case 'speed_buff':
        battleState.buffs.push({ type: 'speed_buff', amount: getBattleFib(4), duration: 2 });
        battleState.log.push('Speed increased!');
        result.effects.push('speed_buff');
        break;

      case 'reflect':
        battleState.buffs.push({ type: 'reflect', amount: 0.25, duration: 1 });
        battleState.log.push('Reflecting damage!');
        result.effects.push('reflect');
        break;

      case 'immunity':
        battleState.buffs.push({ type: 'immunity', duration: 1 });
        battleState.log.push('Immune to effects!');
        result.effects.push('immunity');
        break;

      case 'expose':
        battleState.isExposed = true;
        battleState.log.push('Enemy exposed! (+25% damage taken)');
        result.effects.push('expose');
        break;

      case 'counter':
        battleState.hasCounter = true;
        battleState.log.push('Counter ready!');
        result.effects.push('counter');
        break;

      case 'move':
        // Movement card - handled separately
        if (targetPosition !== null && canMoveTo(battleState.playerPosition, targetPosition)) {
          const oldPos = ARENA_POSITIONS[battleState.playerPosition];
          const newPos = ARENA_POSITIONS[targetPosition];
          battleState.playerPosition = targetPosition;
          battleState.log.push(`Moved to ${newPos.name}`);
          result.effects.push('move');
        }
        break;

      case 'swap_positions':
        // Swap positions with enemy
        const tempPos = battleState.playerPosition;
        battleState.playerPosition = battleState.enemyPosition;
        battleState.enemyPosition = tempPos;
        battleState.log.push('Swapped positions with enemy!');
        result.effects.push('swap');
        break;
    }
  }

  return result;
}

/**
 * End player turn and start enemy turn
 */
function endPlayerTurn() {
  if (!battleState.active || battleState.phase !== 'player') {
    return { success: false, message: 'Cannot end turn now' };
  }

  battleState.phase = 'enemy';

  // Process burn damage on enemy
  battleState.enemyDebuffs = battleState.enemyDebuffs.filter(debuff => {
    if (debuff.type === 'burn' && debuff.damage) {
      battleState.enemyHp -= debuff.damage;
      battleState.log.push(`Burn deals ${debuff.damage} damage!`);
    }
    debuff.duration--;
    return debuff.duration > 0;
  });

  // Check if enemy died from burn
  if (battleState.enemyHp <= 0) {
    const rewards = endBattle(true);
    return { success: true, victory: true, rewards, state: getBattleState() };
  }

  // Enemy turn (if not stunned)
  let enemyResult = null;
  if (battleState.isStunned) {
    battleState.log.push(`${battleState.enemy.name} is stunned and skips their turn!`);
    battleState.isStunned = false;
  } else {
    enemyResult = enemyTurn();
  }

  // Check for player defeat
  if (battleState.playerHp <= 0) {
    endBattle(false);
    return { success: true, defeat: true, enemyAction: enemyResult, state: getBattleState() };
  }

  // Start new turn
  battleState.turn++;
  battleState.phase = 'player';

  // Reset block
  battleState.currentBlock = 0;

  // Reset counter
  battleState.hasCounter = false;

  // Reset exposed
  battleState.isExposed = false;

  // Process buff durations
  battleState.buffs = battleState.buffs.filter(buff => {
    buff.duration--;
    return buff.duration > 0;
  });

  // Draw cards (up to max hand size)
  const cardsToDraw = Math.min(
    battleState.cardsPerTurn,
    battleState.maxHandSize - battleState.hand.length
  );
  if (cardsToDraw > 0) {
    const newCards = drawCards(cardsToDraw);
    battleState.hand.push(...newCards);
    battleState.log.push(`Drew ${newCards.length} card${newCards.length > 1 ? 's' : ''}`);
  }

  // Regenerate some MP each turn
  const mpRegen = getBattleFib(4); // 3 MP per turn
  battleState.playerMp = Math.min(battleState.player.maxMp, battleState.playerMp + mpRegen);

  return { success: true, enemyAction: enemyResult, state: getBattleState() };
}

// ============================================
// LEGACY COMBAT ACTIONS (for compatibility)
// ============================================

/**
 * Execute a combat skill
 * @param {string} skillId - Skill to use
 * @returns {Object} Action result
 */
function useSkill(skillId) {
  // Rate limiting (Security by Design)
  const rateCheck = BattleRateLimiter.checkAction();
  if (!rateCheck.allowed) {
    return { success: false, message: rateCheck.message };
  }

  // Validation
  if (!battleState.active) {
    return { success: false, message: 'No active battle' };
  }

  if (typeof skillId !== 'string' || !COMBAT_SKILLS[skillId]) {
    return { success: false, message: 'Invalid skill' };
  }

  const skill = COMBAT_SKILLS[skillId];

  // Check level requirement
  if (skill.requiresLevel && battleState.player.level < skill.requiresLevel) {
    return { success: false, message: `Requires level ${skill.requiresLevel}` };
  }

  // Check cooldown
  if (battleState.cooldowns[skillId] > 0) {
    return { success: false, message: `On cooldown (${battleState.cooldowns[skillId]} turns)` };
  }

  // Check MP cost
  if (battleState.playerMp < skill.mpCost) {
    return { success: false, message: 'Not enough MP' };
  }

  // Check token cost (for burn attacks)
  if (skill.tokenCost) {
    const state = window.PumpArenaState?.get();
    if (!state || state.resources.tokens < skill.tokenCost) {
      return { success: false, message: 'Not enough tokens to burn' };
    }
  }

  BattleRateLimiter.recordAction();

  // Deduct costs
  battleState.playerMp -= skill.mpCost;
  if (skill.tokenCost) {
    window.PumpArenaState.addTokens(-skill.tokenCost);
    battleState.log.push(`Burned ${skill.tokenCost} tokens!`);
  }

  // Set cooldown
  if (skill.cooldown > 0) {
    battleState.cooldowns[skillId] = skill.cooldown;
  }

  // Execute skill effect
  const result = executeSkillEffect(skill);

  // Enemy turn (if battle not over)
  if (battleState.active && battleState.enemyHp > 0 && battleState.playerHp > 0) {
    const enemyResult = enemyTurn();
    result.enemyAction = enemyResult;
  }

  // Check battle end
  if (battleState.enemyHp <= 0) {
    result.victory = true;
    result.rewards = endBattle(true);
  } else if (battleState.playerHp <= 0) {
    result.defeat = true;
    endBattle(false);
  }

  // Reduce cooldowns and process buffs (DRY helpers)
  reduceCooldowns();
  processBuffDurations();

  battleState.turn++;

  return {
    success: true,
    ...result,
    state: getBattleState(),
  };
}

/**
 * Execute skill effect
 */
function executeSkillEffect(skill) {
  const result = { damage: 0, healed: 0, buffApplied: null };

  // Calculate base damage
  if (skill.damageMultiplier > 0) {
    let baseDamage = battleState.player.atk;

    // Add stat bonus
    if (skill.statBonus) {
      const state = window.PumpArenaState?.get();
      if (state) {
        baseDamage += state.stats[skill.statBonus] || 0;
      }
    }

    // Apply multiplier
    let damage = Math.floor(baseDamage * skill.damageMultiplier);

    // Apply position modifier based on attack type and ring
    const playerRing = ARENA_POSITIONS[battleState.playerPosition]?.ring || 'mid';
    const ringMod = RING_MODIFIERS[playerRing];
    const distance = getPositionDistance(battleState.playerPosition, battleState.enemyPosition);

    // Determine attack type: melee if close, ranged if far
    const isMelee = skill.type === 'attack' && distance <= 1;
    const isRanged = skill.type === 'attack' && distance > 1;

    if (isMelee) {
      damage = Math.floor(damage * ringMod.melee);
      if (ringMod.melee > 1) {
        battleState.log.push(`Close range bonus! (+${Math.floor((ringMod.melee - 1) * 100)}%)`);
      }
    } else if (isRanged) {
      damage = Math.floor(damage * ringMod.ranged);
      if (ringMod.ranged > 1) {
        battleState.log.push(`Long range bonus! (+${Math.floor((ringMod.ranged - 1) * 100)}%)`);
      }
    }

    // Distance penalty for melee attacks at far range
    if (isMelee && distance > 1) {
      const distancePenalty = 0.7;
      damage = Math.floor(damage * distancePenalty);
      battleState.log.push(`Distance penalty (-30%)`);
    }

    // FOMO effect: damage scales with missing HP
    if (skill.effect === 'fomo') {
      const missingHpPercent = 1 - battleState.playerHp / battleState.player.maxHp;
      const fomoBonus = 1 + missingHpPercent * 2; // Up to 3x damage at 1 HP
      damage = Math.floor(damage * fomoBonus);
      if (missingHpPercent > 0.5) {
        battleState.log.push(`FOMO intensifies! (${Math.floor(fomoBonus * 100)}% power)`);
      }
    }

    // Check accuracy
    if (skill.accuracy && Math.random() * 100 > skill.accuracy) {
      battleState.log.push(`${skill.name} missed!`);
      return { ...result, missed: true };
    }

    // Critical hit check (Golden ratio multiplier)
    if (Math.random() * 100 < battleState.player.crt) {
      damage = Math.floor(damage * BATTLE_CONSTANTS.CRIT_MULTIPLIER);
      battleState.log.push(`Critical hit!`);
      result.critical = true;
    }

    // Apply defense reduction (Fibonacci-based)
    const defReduction = Math.floor(battleState.enemy.def / getBattleFib(5));
    damage = Math.max(1, damage - defReduction);

    // Apply attack buffs
    const atkBuff = battleState.buffs.find(b => b.type === 'attack_buff');
    if (atkBuff) {
      damage = Math.floor(damage + atkBuff.amount);
      battleState.log.push(`Attack buff adds +${atkBuff.amount} damage!`);
    }

    battleState.enemyHp -= damage;
    battleState.enemyHp = Math.max(0, battleState.enemyHp);

    result.damage = damage;
    battleState.log.push(`${skill.name} dealt ${damage} damage!`);
  }

  // Apply heal
  if (skill.effect === 'heal') {
    const healAmount = skill.healAmount + Math.floor(battleState.player.def / 2);
    battleState.playerHp = Math.min(battleState.player.maxHp, battleState.playerHp + healAmount);
    result.healed = healAmount;
    battleState.log.push(`Healed for ${healAmount} HP!`);
  }

  // Apply defense buff
  if (skill.effect === 'defense_buff') {
    battleState.buffs.push({
      type: 'defense_buff',
      amount: skill.buffAmount,
      duration: skill.duration,
    });
    result.buffApplied = 'Defense Up';
    battleState.log.push(`Defense increased by ${skill.buffAmount}!`);
  }

  // Apply attack buff
  if (skill.effect === 'attack_buff') {
    battleState.buffs.push({
      type: 'attack_buff',
      amount: skill.buffAmount,
      duration: skill.duration,
    });
    result.buffApplied = 'Attack Up';
    battleState.log.push(`Attack increased by ${skill.buffAmount}!`);
  }

  return result;
}

/**
 * Enemy turn AI - Strategic behavior based on situation
 */
function enemyTurn() {
  const enemy = battleState.enemy;
  const playerHpPercent = battleState.playerHp / battleState.player.maxHp;
  const enemyHpPercent = battleState.enemyHp / enemy.maxHp;

  // Choose attack type based on situation
  let attackType = 'normal';
  let damageMultiplier = 1.0;
  let attackName = 'attacks';

  // Boss enemies have special attacks
  if (enemy.isBoss) {
    const roll = Math.random();
    if (enemyHpPercent < 0.3 && roll < 0.4) {
      // Desperate attack when low HP
      attackType = 'desperate';
      damageMultiplier = 1.8;
      attackName = 'unleashes a desperate attack';
    } else if (playerHpPercent < 0.3 && roll < 0.5) {
      // Finishing blow attempt
      attackType = 'finisher';
      damageMultiplier = 2.0;
      attackName = 'attempts a finishing blow';
    } else if (roll < 0.25) {
      // Special attack
      attackType = 'special';
      damageMultiplier = 1.5;
      attackName = 'uses a special attack';
    }
  } else {
    // Regular enemies have simpler AI
    const roll = Math.random();
    if (playerHpPercent < 0.2 && roll < 0.3) {
      attackType = 'aggressive';
      damageMultiplier = 1.3;
      attackName = 'attacks aggressively';
    } else if (roll < 0.15) {
      attackType = 'heavy';
      damageMultiplier = 1.4;
      attackName = 'uses a heavy attack';
    }
  }

  // Apply weaken debuff to enemy attack
  const weakenDebuff = battleState.enemyDebuffs.find(d => d.type === 'weaken');
  if (weakenDebuff) {
    damageMultiplier *= 1 - weakenDebuff.amount / 100;
  }

  // Calculate base damage
  let damage = Math.floor(enemy.atk * damageMultiplier);

  // Critical hit check (higher chance on special attacks, Golden ratio multiplier)
  let critical = false;
  const critChance =
    attackType === 'special'
      ? enemy.critChance * BATTLE_CONSTANTS.CRIT_MULTIPLIER
      : enemy.critChance;
  if (Math.random() * 100 < critChance) {
    damage = Math.floor(damage * BATTLE_CONSTANTS.CRIT_MULTIPLIER);
    critical = true;
  }

  // Apply player defense
  const defBuff = battleState.buffs.find(b => b.type === 'defense_buff');
  const totalDef = battleState.player.def + (defBuff ? defBuff.amount : 0);
  const defReduction = Math.floor(totalDef / getBattleFib(5));
  damage = Math.max(1, damage - defReduction);

  // Check for counter (fib[9]/100 = 34% counter damage)
  if (battleState.hasCounter) {
    const counterDamage = Math.floor(damage * BATTLE_CONSTANTS.COUNTER_DAMAGE_PERCENT);
    battleState.enemyHp -= counterDamage;
    battleState.log.push(`Counter! ${enemy.name} takes ${counterDamage} damage!`);
  }

  // Apply block first
  let blockedDamage = 0;
  if (battleState.currentBlock > 0) {
    blockedDamage = Math.min(damage, battleState.currentBlock);
    damage -= blockedDamage;
    battleState.currentBlock -= blockedDamage;
    if (blockedDamage > 0) {
      battleState.log.push(`Blocked ${blockedDamage} damage!`);
    }
  }

  // Check for reflect
  const reflectBuff = battleState.buffs.find(b => b.type === 'reflect');
  if (reflectBuff && damage > 0) {
    const reflectedDamage = Math.floor(damage * reflectBuff.amount);
    battleState.enemyHp -= reflectedDamage;
    battleState.log.push(`Reflected ${reflectedDamage} damage!`);
  }

  // Apply remaining damage to player
  if (damage > 0) {
    battleState.playerHp -= damage;
    battleState.playerHp = Math.max(0, battleState.playerHp);
  }

  let logMsg = '';
  if (critical) {
    logMsg = `${enemy.name} ${attackName} - CRITICAL HIT for ${damage + blockedDamage} damage!`;
  } else {
    logMsg = `${enemy.name} ${attackName} for ${damage + blockedDamage} damage!`;
  }

  battleState.log.push(logMsg);

  return {
    damage: damage + blockedDamage,
    actualDamage: damage,
    blocked: blockedDamage,
    critical,
    attackType,
  };
}

// ============================================
// BATTLE END
// ============================================

/**
 * End the battle
 * @param {boolean} victory - Did player win?
 * @returns {Object} Rewards if victory
 */
function endBattle(victory) {
  if (!battleState.active) return null;

  const enemy = battleState.enemy;
  let rewards = null;

  if (victory) {
    // Calculate rewards with Fibonacci tier bonus
    const tier = window.PumpArenaState?.getCurrentTier() || { index: 0 };
    const tierMultiplier = 1 + tier.index * 0.1;

    const xpReward = Math.floor(enemy.rewards.xp * tierMultiplier);
    const tokenReward = Math.floor(enemy.rewards.tokens * tierMultiplier);

    // Apply rewards
    window.PumpArenaState?.addXP(xpReward);
    window.PumpArenaState?.addTokens(tokenReward);

    // Drop items (Fibonacci-based chance)
    const droppedItems = [];
    if (enemy.drops && enemy.drops.length > 0) {
      enemy.drops.forEach(itemId => {
        // Drop chance: fib[6]/100 = 8% base, improved by luck
        const state = window.PumpArenaState?.get();
        const luckBonus = state ? state.stats.lck : 0;
        const dropChance = getBattleFib(6) + Math.floor(luckBonus / 2);

        if (Math.random() * 100 < dropChance) {
          droppedItems.push(itemId);
          // Add to inventory
          window.PumpArenaInventory?.addItem(itemId, 1);
        }
      });
    }

    // Calculate performance bonus for ranking
    const hpPercent = battleState.playerHp / battleState.player.maxHp;
    const performanceBonus = Math.floor(hpPercent * getBattleFib(5)); // Up to +5 bonus for high HP

    // Award ranking points
    const rankingResult = addRankingPoints(true, enemy, performanceBonus);

    rewards = {
      xp: xpReward,
      tokens: tokenReward,
      items: droppedItems,
      rankingPoints: rankingResult.pointsChange,
      newRankingTotal: rankingResult.newTotal,
      currentRank: rankingResult.currentRank,
    };

    battleState.log.push(
      `Victory! +${xpReward} XP, +${tokenReward} tokens, +${rankingResult.pointsChange} ranking!`
    );

    // Dispatch victory event
    document.dispatchEvent(
      new CustomEvent('pumparena:battle-victory', {
        detail: { enemy: enemy.name, rewards },
      })
    );
  } else {
    // Award negative ranking points for loss
    const rankingResult = addRankingPoints(false, enemy);

    battleState.log.push(
      `Defeated by ${enemy.name}... (${rankingResult.pointsChange} ranking pts)`
    );

    // Dispatch defeat event
    document.dispatchEvent(
      new CustomEvent('pumparena:battle-defeat', {
        detail: { enemy: enemy.name, rankingChange: rankingResult.pointsChange },
      })
    );
  }

  // Reset battle state
  battleState.active = false;

  return rewards;
}

/**
 * Flee from battle (costs influence)
 */
function fleeBattle() {
  if (!battleState.active) {
    return { success: false, message: 'No active battle' };
  }

  // Flee costs fib[5] = 5 influence
  const fleeCost = getBattleFib(5);
  const state = window.PumpArenaState?.get();

  if (!state || state.resources.influence < fleeCost) {
    return { success: false, message: `Need ${fleeCost} influence to flee` };
  }

  window.PumpArenaState.spendInfluence(fleeCost);

  battleState.log.push('Fled from battle!');
  battleState.active = false;

  document.dispatchEvent(
    new CustomEvent('pumparena:battle-flee', {
      detail: { enemy: battleState.enemy.name },
    })
  );

  return { success: true, message: 'Escaped successfully!' };
}

// ============================================
// BATTLE ENCOUNTERS
// ============================================

/**
 * Get random enemy for player's level
 */
function getRandomEnemy() {
  const state = window.PumpArenaState?.get();
  if (!state) return null;

  const playerLevel = state.progression.level;
  const playerTier = Math.floor(playerLevel / BATTLE_CONSTANTS.LEVELS_PER_TIER);

  // Filter enemies by tier
  const availableEnemies = Object.values(ENEMY_TYPES).filter(
    e => e.tier <= playerTier && e.tier >= Math.max(0, playerTier - 1)
  );

  if (availableEnemies.length === 0) {
    return Object.values(ENEMY_TYPES)[0]; // Fallback to first enemy
  }

  // Random selection
  return availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
}

/**
 * Start a random encounter
 */
function randomEncounter() {
  const enemy = getRandomEnemy();
  if (!enemy) {
    return { success: false, message: 'No enemies available' };
  }

  return startBattle(enemy.id);
}

// ============================================
// BATTLE UI RENDERER
// ============================================

function renderBattleUI(container) {
  // Inject battle styles on first render
  injectBattleStyles();

  const state = getBattleState();
  const combatStats = calculateCombatStats();

  if (!state) {
    // No active battle - show arena selection
    container.innerHTML = `
            <div style="background: #12121a; border-radius: 16px; overflow: hidden; border: 2px solid #dc2626;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1a1a24, #2d1515); padding: 20px; border-bottom: 1px solid #dc262640;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #dc2626, #991b1b); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">&#9876;</div>
                        <div>
                            <h3 style="color: #ffffff; margin: 0; font-size: 20px;">Battle Arena</h3>
                            <div style="color: #dc2626; font-size: 12px;">Test your skills against crypto threats!</div>
                        </div>
                    </div>
                </div>

                <!-- Combat Stats Overview -->
                <div style="padding: 15px 20px; background: #1a1a24; border-bottom: 1px solid #333;">
                    <div style="color: #9ca3af; font-size: 11px; margin-bottom: 8px; text-transform: uppercase;">Your Combat Stats</div>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #ef4444;">&#9876;</span>
                            <span style="color: #ef4444; font-weight: 600;">${combatStats?.atk || 0}</span>
                            <span style="color: #666; font-size: 11px;">ATK</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #3b82f6;">&#128737;</span>
                            <span style="color: #3b82f6; font-weight: 600;">${combatStats?.def || 0}</span>
                            <span style="color: #666; font-size: 11px;">DEF</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #22c55e;">&#9889;</span>
                            <span style="color: #22c55e; font-weight: 600;">${combatStats?.spd || 0}</span>
                            <span style="color: #666; font-size: 11px;">SPD</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #eab308;">&#9733;</span>
                            <span style="color: #eab308; font-weight: 600;">${combatStats?.crt || 0}%</span>
                            <span style="color: #666; font-size: 11px;">CRIT</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="color: #ec4899;">&#10084;</span>
                            <span style="color: #ec4899; font-weight: 600;">${combatStats?.maxHp || 0}</span>
                            <span style="color: #666; font-size: 11px;">HP</span>
                        </div>
                    </div>
                </div>

                <!-- How Combat Works -->
                <div style="padding: 15px 20px; background: linear-gradient(135deg, #1a1a24, #1a2020); border-bottom: 1px solid #333;">
                    <div style="color: #ffffff; font-size: 13px; font-weight: 600; margin-bottom: 10px;">&#128161; How Combat Works</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; color: #9ca3af;">
                        <div><span style="color: #ef4444;">ATK</span> = Development + Strategy</div>
                        <div><span style="color: #3b82f6;">DEF</span> = Community + Charisma</div>
                        <div><span style="color: #22c55e;">SPD</span> = Marketing + Luck</div>
                        <div><span style="color: #eab308;">CRIT</span> = (Luck + Dev) / 2</div>
                    </div>
                </div>

                <!-- Quick Battle -->
                <div style="padding: 20px;">
                    <button id="random-encounter-btn" style="
                        width: 100%; padding: 15px; margin-bottom: 20px;
                        background: linear-gradient(135deg, #dc2626, #991b1b);
                        border: 2px solid #ef4444; border-radius: 12px;
                        color: #fff; font-size: 16px; font-weight: 600;
                        cursor: pointer; transition: all 0.2s;
                        display: flex; align-items: center; justify-content: center; gap: 10px;
                    " onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 0 20px #dc262660';"
                       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                        <span style="font-size: 20px;">&#127922;</span>
                        Random Encounter
                    </button>

                    <!-- Enemy Selection -->
                    <div style="color: #ffffff; font-size: 14px; font-weight: 600; margin-bottom: 15px;">Choose Your Opponent</div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                        ${renderEnemyList()}
                    </div>
                </div>
            </div>
        `;

    container.querySelector('#random-encounter-btn')?.addEventListener('click', () => {
      const result = randomEncounter();
      if (result.success) {
        renderBattleUI(container);
      } else {
        showBattleNotification(result.message, 'error');
      }
    });

    container.querySelectorAll('.enemy-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const enemyId = btn.dataset.enemy;
        const result = startBattle(enemyId);
        if (result.success) {
          renderBattleUI(container);
        } else {
          showBattleNotification(result.message, 'error');
        }
      });
    });

    return;
  }

  // Active battle UI
  const playerHpPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  const playerMpPercent = Math.max(0, (state.player.mp / state.player.maxMp) * 100);
  const enemyHpPercent = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100);

  const hpColor = playerHpPercent > 50 ? '#22c55e' : playerHpPercent > 25 ? '#eab308' : '#ef4444';
  const enemyHpColor =
    enemyHpPercent > 50 ? '#ef4444' : enemyHpPercent > 25 ? '#eab308' : '#22c55e';

  // Strategic advice based on situation
  const playerAdvantage = state.player.hp > state.enemy.hp;
  const lowHealth = playerHpPercent < 30;
  const enemyLowHealth = enemyHpPercent < 30;
  let strategyTip = '';
  if (lowHealth) strategyTip = '⚠️ Low HP! Consider defending or using potions';
  else if (enemyLowHealth) strategyTip = '🎯 Enemy is weak! Go for the kill!';
  else if (playerAdvantage) strategyTip = '💪 You have the advantage! Keep attacking';
  else strategyTip = '⚔️ Stay focused and watch your timing';

  // Calculate estimated damage for skills
  const getSkillDamage = skill => {
    if (!skill.damageMultiplier || skill.damageMultiplier === 0) return 0;
    const baseDmg = (combatStats?.atk || 10) * skill.damageMultiplier;
    return Math.floor(baseDmg);
  };

  container.innerHTML = `
        <div class="battle-container" style="background: #12121a; border-radius: 12px; overflow: hidden; border: 2px solid #dc2626;">
            <!-- Battle Header -->
            <div style="background: linear-gradient(135deg, #1a1a24, #2d1515); padding: 8px 12px; border-bottom: 1px solid #dc262640;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 30px; height: 30px; background: linear-gradient(135deg, #dc2626, #991b1b); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                            <span style="font-size: 14px;">⚔️</span>
                        </div>
                        <div>
                            <div style="color: #ffffff; font-weight: 600; font-size: 13px;">Turn ${state.turn}</div>
                            <div style="color: #dc2626; font-size: 9px;">Your Move</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <div style="padding: 4px 8px; background: #22c55e15; border: 1px solid #22c55e40; border-radius: 6px; text-align: center;">
                            <span style="color: #22c55e; font-size: 12px; font-weight: bold;">${combatStats?.atk || 0}</span>
                            <span style="color: #22c55e80; font-size: 9px;">ATK</span>
                        </div>
                        <div style="padding: 4px 8px; background: #3b82f615; border: 1px solid #3b82f640; border-radius: 6px; text-align: center;">
                            <span style="color: #3b82f6; font-size: 12px; font-weight: bold;">${combatStats?.def || 0}</span>
                            <span style="color: #3b82f680; font-size: 9px;">DEF</span>
                        </div>
                        <button id="flee-btn" style="
                            padding: 4px 10px; background: linear-gradient(135deg, #374151, #1f2937); border: 1px solid #4b5563;
                            border-radius: 6px; color: #9ca3af; font-size: 10px; cursor: pointer; transition: all 0.2s;
                        " onmouseover="this.style.borderColor='#ef4444'; this.style.color='#ef4444';" onmouseout="this.style.borderColor='#4b5563'; this.style.color='#9ca3af';">
                            🏃 Flee
                        </button>
                    </div>
                </div>
            </div>

            <!-- Strategy Tip -->
            <div style="padding: 5px 12px; background: linear-gradient(90deg, #1a1a24, #0a0a0f); border-bottom: 1px solid #333;">
                <div style="color: #fbbf24; font-size: 10px; text-align: center;">${strategyTip}</div>
            </div>

            <!-- Battle Field -->
            <div class="battle-field" style="padding: 15px 12px; display: grid; grid-template-columns: 1fr 60px 1fr; gap: 10px; align-items: stretch; background: linear-gradient(180deg, #0a0a0f, #12121a);">
                <!-- Player Side -->
                <div id="battle-player-unit" class="battle-unit" style="background: linear-gradient(135deg, #1a2a1a, #0d200d); border: 2px solid #22c55e50; border-radius: 12px; padding: 12px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #22c55e, transparent);"></div>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 15px #22c55e40;">🧑‍💻</div>
                        <div style="flex: 1;">
                            <div style="color: #22c55e; font-weight: 700; font-size: 14px;">You</div>
                            <div style="color: #86efac; font-size: 10px;">Lv.${combatStats?.level || 1} • ${combatStats?.tier || 'EMBER'}</div>
                        </div>
                    </div>

                    <!-- HP Bar -->
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                            <span style="color: #22c55e; font-weight: 600;">❤️ HP</span>
                            <span style="color: ${hpColor}; font-weight: bold;">${state.player.hp}/${state.player.maxHp}</span>
                        </div>
                        <div style="height: 10px; background: #0d200d; border-radius: 5px; overflow: hidden; border: 1px solid #22c55e30;">
                            <div style="height: 100%; width: ${playerHpPercent}%; background: linear-gradient(90deg, ${hpColor}, ${hpColor}cc); transition: width 0.5s ease; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);"></div>
                            </div>
                        </div>
                    </div>

                    <!-- MP Bar -->
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px;">
                            <span style="color: #3b82f6;">⚡ Energy</span>
                            <span style="color: #3b82f6;">${state.player.mp}/${state.player.maxMp}</span>
                        </div>
                        <div style="height: 6px; background: #0d1520; border-radius: 3px; overflow: hidden; border: 1px solid #3b82f630;">
                            <div style="height: 100%; width: ${playerMpPercent}%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.3s;"></div>
                        </div>
                    </div>

                    ${
                      state.player.buffs?.length > 0
                        ? `
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #22c55e30; display: flex; gap: 4px; flex-wrap: wrap;">
                            ${state.player.buffs
                              .map(b => {
                                const buffInfo =
                                  b.type === 'defense_buff'
                                    ? { icon: '🛡️', color: '#3b82f6', name: 'DEF' }
                                    : b.type === 'attack_buff'
                                      ? { icon: '⚔️', color: '#ef4444', name: 'ATK' }
                                      : { icon: '✨', color: '#a855f7', name: 'BUFF' };
                                return `
                                    <span style="padding: 2px 6px; background: linear-gradient(135deg, ${buffInfo.color}30, ${buffInfo.color}10); border: 1px solid ${buffInfo.color}50; border-radius: 4px; font-size: 9px; color: ${buffInfo.color}; display: flex; align-items: center; gap: 3px;">
                                        ${buffInfo.icon}+${b.amount}(${b.duration})
                                    </span>
                                `;
                              })
                              .join('')}
                        </div>
                    `
                        : ''
                    }
                </div>

                <!-- VS Indicator -->
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #1a1a24, #0a0a0f); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #333; box-shadow: 0 0 20px rgba(0,0,0,0.5);">
                        <span style="color: #ef4444; font-weight: 900; font-size: 14px; text-shadow: 0 0 8px #ef444480;">VS</span>
                    </div>
                </div>

                <!-- Enemy Side -->
                <div id="battle-enemy-unit" class="battle-unit enemy" style="background: linear-gradient(135deg, #2d1515, #200d0d); border: 2px solid ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}50; border-radius: 12px; padding: 12px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}, transparent);"></div>
                    ${state.enemy.isBoss ? '<div style="position: absolute; top: 6px; right: 6px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; font-size: 8px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">👑 BOSS</div>' : ''}

                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <div style="width: 45px; height: 45px; background: linear-gradient(135deg, ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}, ${state.enemy.isBoss ? '#7c3aed' : '#dc2626'}); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 15px ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}40;">${state.enemy.icon}</div>
                        <div style="flex: 1;">
                            <div style="color: ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}; font-weight: 700; font-size: 14px;">${escapeHtml(state.enemy.name)}</div>
                            <div style="color: #f87171; font-size: 10px;">ATK:${state.enemy.atk} DEF:${state.enemy.def}</div>
                        </div>
                    </div>

                    <!-- Enemy HP Bar -->
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                            <span style="color: ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}; font-weight: 600;">❤️ HP</span>
                            <span style="color: ${enemyHpColor}; font-weight: bold;">${state.enemy.hp}/${state.enemy.maxHp}</span>
                        </div>
                        <div style="height: 10px; background: #200d0d; border-radius: 5px; overflow: hidden; border: 1px solid ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}30;">
                            <div style="height: 100%; width: ${enemyHpPercent}%; background: linear-gradient(90deg, ${enemyHpColor}, ${enemyHpColor}cc); transition: width 0.5s ease; position: relative;">
                                <div style="position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Circular Arena -->
            <div style="padding: 10px 12px; background: linear-gradient(180deg, #0a0a0f, #05050a); border-top: 1px solid #222;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="color: #666; font-size: 10px; text-transform: uppercase;">🏟️ Arena</div>
                    <div style="display: flex; gap: 8px; font-size: 9px;">
                        <span style="color: #22c55e;">●CLOSE</span>
                        <span style="color: #fbbf24;">●MID</span>
                        <span style="color: #3b82f6;">●FAR</span>
                    </div>
                </div>
                <div class="battle-arena" style="position: relative; width: 100%; height: 120px; background: radial-gradient(circle at center, #0a0a0f 30%, #12121a 70%, #1a1a24 100%); border-radius: 50%; border: 2px solid #333; overflow: hidden;">
                    <!-- Arena rings -->
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60%; height: 60%; border: 2px dashed #fbbf2430; border-radius: 50%;"></div>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 85%; height: 85%; border: 2px dashed #3b82f630; border-radius: 50%;"></div>

                    <!-- Position markers -->
                    ${Object.values(ARENA_POSITIONS)
                      .map(pos => {
                        const isPlayer = pos.id === state.arena.playerPosition;
                        const isEnemy = pos.id === state.arena.enemyPosition;
                        const canMoveHere = state.arena.validMoves.includes(pos.id);
                        const ringColor =
                          pos.ring === 'close'
                            ? '#22c55e'
                            : pos.ring === 'mid'
                              ? '#fbbf24'
                              : '#3b82f6';

                        let content = '';
                        let bgColor = '#1a1a24';
                        let borderColor = `${ringColor}30`;
                        let cursor = 'default';
                        let size = 28;

                        if (isPlayer) {
                          content = '🧑‍💻';
                          bgColor = 'linear-gradient(135deg, #22c55e, #16a34a)';
                          borderColor = '#22c55e';
                          size = 36;
                        } else if (isEnemy) {
                          content = state.enemy.icon;
                          bgColor = `linear-gradient(135deg, ${state.enemy.isBoss ? '#a855f7' : '#ef4444'}, ${state.enemy.isBoss ? '#7c3aed' : '#dc2626'})`;
                          borderColor = state.enemy.isBoss ? '#a855f7' : '#ef4444';
                          size = 36;
                        } else if (canMoveHere) {
                          content = '👆';
                          bgColor = `${ringColor}20`;
                          borderColor = `${ringColor}80`;
                          cursor = 'pointer';
                        } else {
                          content = '';
                          bgColor = '#12121a';
                        }

                        return `
                            <div class="${canMoveHere && !isPlayer && !isEnemy ? 'move-btn' : ''}"
                                 data-pos="${pos.id}"
                                 style="
                                     position: absolute;
                                     left: ${pos.x}%;
                                     top: ${pos.y}%;
                                     transform: translate(-50%, -50%);
                                     width: ${size}px;
                                     height: ${size}px;
                                     background: ${bgColor};
                                     border: 2px solid ${borderColor};
                                     border-radius: 50%;
                                     display: flex;
                                     align-items: center;
                                     justify-content: center;
                                     font-size: ${size * 0.5}px;
                                     cursor: ${cursor};
                                     transition: all 0.2s;
                                     z-index: ${isPlayer || isEnemy ? 10 : 5};
                                     ${canMoveHere && !isPlayer && !isEnemy ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
                                 "
                                 ${
                                   canMoveHere && !isPlayer && !isEnemy
                                     ? `
                                     onmouseover="this.style.transform='translate(-50%, -50%) scale(1.2)'; this.style.boxShadow='0 0 15px ${ringColor}';"
                                     onmouseout="this.style.transform='translate(-50%, -50%) scale(1)'; this.style.boxShadow='none';"
                                 `
                                     : ''
                                 }
                            >${content}</div>
                        `;
                      })
                      .join('')}

                    <!-- Ring labels (hidden for compact view) -->
                </div>

                <!-- Current position info -->
                <div style="display: flex; justify-content: space-between; margin-top: 6px; padding: 4px 8px; background: #1a1a24; border-radius: 6px; border: 1px solid #333; font-size: 10px;">
                    <span style="color: #fff;">You: <span style="color: ${state.arena.playerRing === 'close' ? '#22c55e' : state.arena.playerRing === 'mid' ? '#fbbf24' : '#3b82f6'}; font-weight: 600;">${state.arena.playerRing?.toUpperCase() || '?'}</span></span>
                    <span style="color: #a855f7; font-weight: 600;">Dist: ${state.arena.distance}</span>
                    <span style="color: #fff;">Enemy: <span style="color: ${state.arena.enemyRing === 'close' ? '#22c55e' : state.arena.enemyRing === 'mid' ? '#fbbf24' : '#3b82f6'}; font-weight: 600;">${state.arena.enemyRing?.toUpperCase() || '?'}</span></span>
                </div>
            </div>

            <!-- Battle Log -->
            <div class="battle-log" style="max-height: 55px; overflow-y: auto; padding: 6px 12px; background: linear-gradient(180deg, #0a0a0f, #05050a); border-top: 1px solid #222;">
                ${state.log
                  .slice(-3)
                  .map(
                    (msg, i) => `
                    <div style="color: ${i === state.log.slice(-3).length - 1 ? '#ffffff' : '#6b7280'}; font-size: 10px; padding: 1px 0; ${i < state.log.slice(-3).length - 1 ? 'opacity: 0.7;' : ''}">${i === state.log.slice(-3).length - 1 ? '→ ' : ''}${escapeHtml(msg)}</div>
                `
                  )
                  .join('')}
            </div>

            <!-- Card Hand Section -->
            <div class="battle-cards" style="padding: 10px 12px; background: linear-gradient(180deg, #12121a, #1a1a24);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="color: #ffffff; font-size: 12px; font-weight: 600;">🃏 Hand</div>
                        <div style="display: flex; gap: 4px;">
                            <div style="padding: 2px 6px; background: #1a1a2480; border: 1px solid #333; border-radius: 4px; font-size: 9px; color: #666;">
                                📚${state.cards?.deckSize || 0}
                            </div>
                            <div style="padding: 2px 6px; background: #1a1a2480; border: 1px solid #333; border-radius: 4px; font-size: 9px; color: #666;">
                                🗑️${state.cards?.discardSize || 0}
                            </div>
                            ${
                              state.player.block > 0
                                ? `
                                <div style="padding: 2px 6px; background: #3b82f620; border: 1px solid #3b82f6; border-radius: 4px; font-size: 9px; color: #3b82f6; font-weight: bold;">
                                    🛡️${state.player.block}
                                </div>
                            `
                                : ''
                            }
                            ${
                              state.player.hasCounter
                                ? `
                                <div style="padding: 2px 6px; background: #f9731620; border: 1px solid #f97316; border-radius: 4px; font-size: 9px; color: #f97316; font-weight: bold;">
                                    ↩️CTR
                                </div>
                            `
                                : ''
                            }
                        </div>
                    </div>
                    <button id="end-turn-btn" style="
                        padding: 6px 12px; background: linear-gradient(135deg, #f97316, #ea580c);
                        border: 2px solid #fb923c; border-radius: 6px;
                        color: #fff; font-size: 11px; font-weight: 600;
                        cursor: pointer; transition: all 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 0 15px #f9731660';"
                       onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';">
                        ⏭️ End Turn
                    </button>
                </div>

                <!-- Cards Display -->
                <div style="display: flex; gap: 8px; overflow-x: auto; padding: 4px 0;">
                    ${(state.cards?.hand || [])
                      .map((card, index) => {
                        const noMp = card.mpCost && state.player.mp < card.mpCost;
                        const noTokens =
                          card.tokenCost &&
                          (() => {
                            const playerState = window.PumpArenaState?.get();
                            return !playerState || playerState.resources.tokens < card.tokenCost;
                          })();
                        const disabled = noMp || noTokens;
                        const rarityColor = CARD_RARITY[card.rarity]?.color || '#666';
                        const cardTypeColor =
                          card.type === 'attack'
                            ? '#ef4444'
                            : card.type === 'defense'
                              ? '#3b82f6'
                              : card.type === 'support'
                                ? '#22c55e'
                                : '#a855f7';
                        const cardTypeLabel =
                          card.type === 'attack'
                            ? 'ATK'
                            : card.type === 'defense'
                              ? 'DEF'
                              : card.type === 'support'
                                ? 'SUP'
                                : 'SPL';

                        // Get card effect description
                        let effectDesc = '';
                        if (card.damage) {
                          effectDesc = `${card.damage} DMG`;
                        } else if (card.block) {
                          effectDesc = `${card.block} Block`;
                        } else if (card.heal) {
                          effectDesc = `+${card.heal} HP`;
                        } else if (card.mpRestore) {
                          effectDesc = `+${card.mpRestore} MP`;
                        } else if (card.effects?.length > 0) {
                          effectDesc = card.effects[0].replace('_', ' ');
                        }

                        return `
                            <div class="card-btn battle-card" data-card-index="${index}" data-card-type="${card.type}" ${disabled ? 'data-disabled="true"' : ''} style="
                                min-width: 85px; max-width: 85px;
                                background: linear-gradient(180deg, #1a1a24, #0a0a0f);
                                border: 2px solid ${disabled ? '#333' : rarityColor};
                                border-radius: 8px;
                                padding: 6px;
                                cursor: ${disabled ? 'not-allowed' : 'pointer'};
                                transition: all 0.2s;
                                opacity: ${disabled ? '0.5' : '1'};
                                position: relative;
                                flex-shrink: 0;
                            ">
                                <!-- Rarity indicator -->
                                <div style="position: absolute; top: -1px; left: 50%; transform: translateX(-50%); width: 40%; height: 2px; background: ${rarityColor}; border-radius: 0 0 2px 2px;"></div>

                                <!-- Card type + MP cost row -->
                                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                                    <div style="font-size: 7px; color: ${cardTypeColor}; background: ${cardTypeColor}20; padding: 1px 3px; border-radius: 2px; font-weight: bold;">${cardTypeLabel}</div>
                                    <div style="font-size: 7px; color: ${card.mpCost > 0 ? '#3b82f6' : '#22c55e'}; background: ${card.mpCost > 0 ? '#3b82f620' : '#22c55e20'}; padding: 1px 3px; border-radius: 2px; font-weight: bold;">
                                        ${card.mpCost > 0 ? `⚡${card.mpCost}` : '✓'}
                                    </div>
                                </div>

                                <!-- Card icon -->
                                <div style="text-align: center; margin: 4px 0;">
                                    <span style="font-size: 24px;">${card.icon}</span>
                                </div>

                                <!-- Card name -->
                                <div style="text-align: center; color: #fff; font-size: 9px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${card.name}</div>

                                <!-- Effect -->
                                <div style="text-align: center; color: ${cardTypeColor}; font-size: 9px; font-weight: 600;">${effectDesc}</div>

                                ${
                                  card.tokenCost
                                    ? `
                                    <div style="text-align: center; margin-top: 2px;">
                                        <span style="font-size: 8px; color: #f97316;">🪙${card.tokenCost}</span>
                                    </div>
                                `
                                    : ''
                                }
                            </div>
                        `;
                      })
                      .join('')}

                    ${
                      (state.cards?.hand || []).length === 0
                        ? `
                        <div style="flex: 1; text-align: center; color: #666; padding: 15px; font-size: 11px;">
                            No cards. End Turn to draw!
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        </div>
    `;

  // Card button handlers
  container.querySelectorAll('.card-btn:not([data-disabled])').forEach(btn => {
    // Add hover effects
    btn.addEventListener('mouseover', () => {
      btn.style.transform = 'translateY(-6px) scale(1.02)';
      btn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
      btn.style.zIndex = '10';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.transform = 'translateY(0) scale(1)';
      btn.style.boxShadow = 'none';
      btn.style.zIndex = '1';
    });

    btn.addEventListener('click', () => {
      const cardIndex = parseInt(btn.dataset.cardIndex, 10);
      const cardType = btn.dataset.cardType;
      const playerUnit = document.getElementById('battle-player-unit');
      const enemyUnit = document.getElementById('battle-enemy-unit');

      // Play card
      const result = playCard(cardIndex);

      if (result.success) {
        // Trigger animations based on card type and result
        if (cardType === 'attack' && result.damage > 0) {
          // Fire projectile from player to enemy
          fireProjectile(playerUnit, enemyUnit, result.critical ? '💥' : '⚔️', false);

          // Delay shake and damage number
          setTimeout(() => {
            shakeElement(enemyUnit);
            if (result.critical) {
              critElement(enemyUnit);
              createParticles(enemyUnit, '#fbbf24', 12);
            } else {
              createParticles(enemyUnit, '#ef4444', 6);
            }
            showDamageNumber(enemyUnit, result.damage, result.critical);

            // Check for enemy death
            if (result.victory) {
              setTimeout(() => {
                deathAnimation(enemyUnit);
                victoryAnimation(playerUnit);
              }, 200);
            }
          }, 350);
        } else if (cardType === 'defense') {
          // Defense animation
          flashElement(playerUnit);
          createParticles(playerUnit, '#3b82f6', 6);
        } else if (cardType === 'support') {
          // Support/heal animation
          if (result.healed > 0) {
            showHealNumber(playerUnit, result.healed);
            createParticles(playerUnit, '#22c55e', 8);
          }
          flashElement(playerUnit);
        }

        // Delay re-render to allow animations to play
        setTimeout(
          () => {
            renderBattleUI(container);

            if (result.victory) {
              showBattleNotification(
                `Victory! +${result.rewards.xp} XP, +${result.rewards.tokens} tokens`,
                'success'
              );
            }
          },
          result.victory ? 800 : 500
        );
      } else {
        showBattleNotification(result.message, 'error');
      }
    });
  });

  // End Turn button handler
  container.querySelector('#end-turn-btn')?.addEventListener('click', () => {
    const playerUnit = document.getElementById('battle-player-unit');
    const enemyUnit = document.getElementById('battle-enemy-unit');

    const result = endPlayerTurn();

    if (result.success) {
      // Get enemy damage from enemyAction
      const enemyDamage = result.enemyAction?.actualDamage || 0;
      const enemyCrit = result.enemyAction?.critical || false;

      // Show enemy attack animation if enemy dealt damage
      if (enemyDamage > 0) {
        // Fire projectile from enemy to player
        fireProjectile(enemyUnit, playerUnit, enemyCrit ? '💥' : '💢', true);

        // Delay player hit effects
        setTimeout(() => {
          shakeElement(playerUnit);
          if (enemyCrit) {
            critElement(playerUnit);
            createParticles(playerUnit, '#fbbf24', 10);
          } else {
            createParticles(playerUnit, '#ef4444', 6);
          }
          showDamageNumber(playerUnit, enemyDamage, enemyCrit);

          // Check for defeat
          if (result.defeat) {
            setTimeout(() => {
              deathAnimation(playerUnit);
            }, 200);
          }
        }, 350);

        // Delay re-render
        setTimeout(
          () => {
            renderBattleUI(container);

            if (result.defeat) {
              showBattleNotification('Defeated! Try again when stronger.', 'error');
            }
          },
          result.defeat ? 800 : 500
        );
      } else {
        // No damage taken, just re-render
        renderBattleUI(container);

        if (result.victory) {
          showBattleNotification(
            `Victory! +${result.rewards?.xp || 0} XP, +${result.rewards?.tokens || 0} tokens`,
            'success'
          );
        }
      }
    } else {
      showBattleNotification(result.message, 'error');
    }
  });

  // Flee button
  container.querySelector('#flee-btn')?.addEventListener('click', () => {
    const result = fleeBattle();
    if (result.success) {
      renderBattleUI(container);
      showBattleNotification('Escaped successfully!', 'info');
    } else {
      showBattleNotification(result.message, 'error');
    }
  });

  // Movement buttons (no longer trigger enemy turn - just preview)
  container.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // For movement, we need a movement card or use the move action
      // Show notification that movement requires a Position Shift card
      showBattleNotification('Use a Position Shift card to move!', 'info');
    });
  });
}

function renderEnemyList() {
  const state = window.PumpArenaState?.get();
  const playerLevel = state?.progression.level || 1;
  const playerTier = Math.floor(playerLevel / BATTLE_CONSTANTS.LEVELS_PER_TIER);

  const tierColors = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];
  const tierNames = ['EMBER', 'SPARK', 'FLAME', 'BLAZE', 'INFERNO'];

  return Object.values(ENEMY_TYPES)
    .filter(e => e.tier <= playerTier)
    .slice(0, 6) // Show max 6 enemies
    .map(enemy => {
      const tierColor = tierColors[enemy.tier] || '#666';
      const tierName = tierNames[enemy.tier] || '???';

      return `
                <div style="
                    background: linear-gradient(135deg, #1a1a24, ${tierColor}10);
                    border: 2px solid ${tierColor}40;
                    border-radius: 12px;
                    padding: 12px;
                    transition: all 0.2s;
                " onmouseover="this.style.borderColor='${tierColor}'; this.style.boxShadow='0 0 15px ${tierColor}30';"
                   onmouseout="this.style.borderColor='${tierColor}40'; this.style.boxShadow='none';">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${tierColor}, ${tierColor}80); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">${enemy.icon}</div>
                        <div style="flex: 1;">
                            <div style="color: #ffffff; font-weight: 600; font-size: 13px;">${escapeHtml(enemy.name)}</div>
                            <div style="color: ${tierColor}; font-size: 10px;">${tierName}</div>
                        </div>
                        ${enemy.isBoss ? '<div style="background: #a855f7; color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 4px;">BOSS</div>' : ''}
                    </div>
                    <div style="color: #888; font-size: 11px; margin-bottom: 10px; line-height: 1.4;">${escapeHtml(enemy.description)}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 8px; font-size: 10px; color: #666;">
                            <span>&#10084; ${enemy.baseHp}</span>
                            <span>&#9876; ${enemy.baseAtk}</span>
                        </div>
                        <button class="enemy-select-btn" data-enemy="${enemy.id}" style="
                            padding: 6px 14px; background: linear-gradient(135deg, ${tierColor}, ${tierColor}80);
                            border: none; border-radius: 6px; color: #fff; font-size: 11px; font-weight: 600;
                            cursor: pointer; transition: all 0.2s;
                        " onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">Fight</button>
                    </div>
                </div>
            `;
    })
    .join('');
}

function showBattleNotification(message, type) {
  // Use global notification if available
  if (typeof showNotification === 'function') {
    showNotification(message, type);
  } else {
    console.log(`[Battle ${type}] ${message}`);
  }
}

// Check if battle has ended after movement
function checkBattleEnd() {
  if (!battleState.active) return null;

  if (battleState.enemyHp <= 0) {
    // Victory
    const rewards = calculateRewards();
    applyRewards(rewards);
    battleState.active = false;
    return { victory: true, rewards };
  }

  if (battleState.playerHp <= 0) {
    // Defeat
    battleState.active = false;
    return { defeat: true };
  }

  return null;
}

// escapeHtml provided by utils.js (loaded first)

// ============================================
// RANKING/LADDER SYSTEM
// ============================================

// Ranking tiers with Fibonacci-based point thresholds
const RANKING_TIERS = {
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    icon: '🥉',
    minPoints: 0,
    color: '#cd7f32',
    rewards: { xp: getBattleFib(6), tokens: getBattleFib(5) },
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    icon: '🥈',
    minPoints: getBattleFib(10),
    color: '#c0c0c0',
    rewards: { xp: getBattleFib(7), tokens: getBattleFib(6) },
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    icon: '🥇',
    minPoints: getBattleFib(12),
    color: '#ffd700',
    rewards: { xp: getBattleFib(8), tokens: getBattleFib(7) },
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    icon: '💎',
    minPoints: getBattleFib(13),
    color: '#e5e4e2',
    rewards: { xp: getBattleFib(9), tokens: getBattleFib(8) },
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    icon: '💠',
    minPoints: getBattleFib(14),
    color: '#b9f2ff',
    rewards: { xp: getBattleFib(10), tokens: getBattleFib(9) },
  },
  champion: {
    id: 'champion',
    name: 'Champion',
    icon: '👑',
    minPoints: getBattleFib(15),
    color: '#ff6b6b',
    rewards: { xp: getBattleFib(11), tokens: getBattleFib(10) },
  },
  legend: {
    id: 'legend',
    name: 'Legend',
    icon: '🌟',
    minPoints: getBattleFib(16),
    color: '#fbbf24',
    rewards: { xp: getBattleFib(12), tokens: getBattleFib(11) },
  },
};

// Ranking rewards by tier (weekly rewards)
const RANKING_REWARDS = {
  bronze: { xp: getBattleFib(8), tokens: getBattleFib(6), materials: ['raw_silicon'] },
  silver: {
    xp: getBattleFib(9),
    tokens: getBattleFib(7),
    materials: ['raw_silicon', 'circuit_board'],
  },
  gold: {
    xp: getBattleFib(10),
    tokens: getBattleFib(8),
    materials: ['circuit_board', 'energy_cell'],
  },
  platinum: {
    xp: getBattleFib(11),
    tokens: getBattleFib(9),
    materials: ['energy_cell', 'code_fragment'],
    equipment: 'random_uncommon',
  },
  diamond: {
    xp: getBattleFib(12),
    tokens: getBattleFib(10),
    materials: ['rare_alloy', 'ancient_code'],
    equipment: 'random_rare',
  },
  champion: {
    xp: getBattleFib(13),
    tokens: getBattleFib(11),
    materials: ['quantum_chip', 'ancient_code'],
    equipment: 'random_epic',
    cosmetic: 'champion_aura',
  },
  legend: {
    xp: getBattleFib(14),
    tokens: getBattleFib(12),
    materials: ['legendary_core', 'quantum_chip'],
    equipment: 'random_legendary',
    cosmetic: 'legend_crown',
  },
};

// Ranking state
let rankingState = {
  points: 0,
  wins: 0,
  losses: 0,
  winStreak: 0,
  bestWinStreak: 0,
  totalBattles: 0,
  bossDefeated: 0,
  lastWeeklyReward: null,
  seasonStart: null,
};

// SECURITY: Validate ranking state data
function validateRankingState(data) {
  if (!data || typeof data !== 'object') return false;

  // Check for dangerous keys (prototype pollution prevention)
  const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.keys(data)) {
    if (DANGEROUS_KEYS.includes(key)) return false;
  }

  // Validate numeric fields
  const numericFields = [
    'points',
    'wins',
    'losses',
    'winStreak',
    'bestWinStreak',
    'totalBattles',
    'bossDefeated',
  ];
  for (const field of numericFields) {
    if (field in data) {
      if (typeof data[field] !== 'number' || !Number.isFinite(data[field]) || data[field] < 0) {
        return false;
      }
      // Cap values to prevent unrealistic numbers
      if (data[field] > 1000000) return false;
    }
  }

  // Validate date fields
  if (data.lastWeeklyReward !== null && data.lastWeeklyReward !== undefined) {
    if (typeof data.lastWeeklyReward !== 'string' && typeof data.lastWeeklyReward !== 'number') {
      return false;
    }
  }

  return true;
}

// Load ranking state
function loadRankingState() {
  try {
    const saved = localStorage.getItem('pumparena_ranking_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      // SECURITY: Validate before merging
      if (validateRankingState(parsed)) {
        rankingState = { ...rankingState, ...parsed };
      } else {
        console.warn('[Security] Invalid ranking state data, using defaults');
      }
    }
  } catch (e) {
    console.warn('Failed to load ranking state:', e);
  }
}

// Save ranking state
function saveRankingState() {
  try {
    localStorage.setItem('pumparena_ranking_v1', JSON.stringify(rankingState));
  } catch (e) {
    console.warn('Failed to save ranking state:', e);
  }
}

// Initialize ranking on load
loadRankingState();

/**
 * Get current rank based on points
 */
function getCurrentRank() {
  const tiers = Object.values(RANKING_TIERS).sort((a, b) => b.minPoints - a.minPoints);
  for (const tier of tiers) {
    if (rankingState.points >= tier.minPoints) {
      return tier;
    }
  }
  return RANKING_TIERS.bronze;
}

/**
 * Get next rank tier
 */
function getNextRank() {
  const current = getCurrentRank();
  const tiers = Object.values(RANKING_TIERS).sort((a, b) => a.minPoints - b.minPoints);
  const currentIndex = tiers.findIndex(t => t.id === current.id);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

/**
 * Add ranking points from battle
 */
function addRankingPoints(won, enemy, performanceBonus = 0) {
  let points = 0;

  if (won) {
    // Base points for winning
    points = getBattleFib(5); // 5 base points

    // Bonus for enemy tier
    points += enemy.tier * getBattleFib(4); // +3 per tier

    // Bonus for boss
    if (enemy.isBoss) {
      points += getBattleFib(7); // +13 for boss
      rankingState.bossDefeated++;
    }

    // Win streak bonus
    rankingState.winStreak++;
    if (rankingState.winStreak > rankingState.bestWinStreak) {
      rankingState.bestWinStreak = rankingState.winStreak;
    }
    points += Math.min(rankingState.winStreak, BATTLE_CONSTANTS.MAX_STREAK_BONUS) * getBattleFib(3); // +2 per streak (max fib[7]=13)

    // Performance bonus (based on HP remaining, critical hits, etc.)
    points += performanceBonus;

    rankingState.wins++;
  } else {
    // Lose points for losing (less than gained for winning)
    points = -getBattleFib(4); // -3 base

    // Can't go below 0
    rankingState.winStreak = 0;
    rankingState.losses++;
  }

  rankingState.points = Math.max(0, rankingState.points + points);
  rankingState.totalBattles++;

  saveRankingState();

  return {
    pointsChange: points,
    newTotal: rankingState.points,
    currentRank: getCurrentRank(),
    nextRank: getNextRank(),
  };
}

/**
 * Get ranking stats
 */
function getRankingStats() {
  const currentRank = getCurrentRank();
  const nextRank = getNextRank();
  const winRate =
    rankingState.totalBattles > 0
      ? Math.round((rankingState.wins / rankingState.totalBattles) * 100)
      : 0;

  return {
    points: rankingState.points,
    currentRank,
    nextRank,
    pointsToNextRank: nextRank ? nextRank.minPoints - rankingState.points : 0,
    wins: rankingState.wins,
    losses: rankingState.losses,
    winRate,
    winStreak: rankingState.winStreak,
    bestWinStreak: rankingState.bestWinStreak,
    totalBattles: rankingState.totalBattles,
    bossDefeated: rankingState.bossDefeated,
  };
}

/**
 * Claim weekly ranking rewards
 */
function claimWeeklyRewards() {
  const now = new Date();
  const lastClaim = rankingState.lastWeeklyReward ? new Date(rankingState.lastWeeklyReward) : null;

  // Check if a week has passed
  if (lastClaim) {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (now - lastClaim < weekMs) {
      const daysLeft = Math.ceil((weekMs - (now - lastClaim)) / (24 * 60 * 60 * 1000));
      return { success: false, message: `Wait ${daysLeft} days for next rewards` };
    }
  }

  const currentRank = getCurrentRank();
  const rewards = RANKING_REWARDS[currentRank.id];

  // Apply rewards
  window.PumpArenaState?.addXP(rewards.xp);
  window.PumpArenaState?.addTokens(rewards.tokens);

  // Add materials to inventory
  if (rewards.materials) {
    rewards.materials.forEach(materialId => {
      window.PumpArenaInventory?.addItem(materialId, 1);
    });
  }

  rankingState.lastWeeklyReward = now.toISOString();
  saveRankingState();

  return {
    success: true,
    rewards: rewards,
    rank: currentRank,
    message: `Claimed ${currentRank.name} rewards!`,
  };
}

/**
 * Render ranking panel UI
 */
function renderRankingPanel(container) {
  const stats = getRankingStats();
  const progressPercent = stats.nextRank
    ? Math.min(
        100,
        ((stats.points - stats.currentRank.minPoints) /
          (stats.nextRank.minPoints - stats.currentRank.minPoints)) *
          100
      )
    : 100;

  container.innerHTML = `
        <div style="background: #12121a; border-radius: 16px; overflow: hidden; border: 2px solid ${stats.currentRank.color};">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a1a24, ${stats.currentRank.color}20); padding: 20px; border-bottom: 1px solid ${stats.currentRank.color}40;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, ${stats.currentRank.color}, ${stats.currentRank.color}80); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; box-shadow: 0 0 20px ${stats.currentRank.color}40;">
                            ${stats.currentRank.icon}
                        </div>
                        <div>
                            <h3 style="color: ${stats.currentRank.color}; margin: 0; font-size: 20px;">${stats.currentRank.name}</h3>
                            <div style="color: #9ca3af; font-size: 12px;">${stats.points} Ranking Points</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #fbbf24; font-size: 14px; font-weight: 600;">${stats.winStreak} Win Streak</div>
                        <div style="color: #666; font-size: 11px;">Best: ${stats.bestWinStreak}</div>
                    </div>
                </div>

                <!-- Progress to next rank -->
                ${
                  stats.nextRank
                    ? `
                    <div style="margin-top: 15px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px;">
                            <span style="color: ${stats.currentRank.color};">${stats.currentRank.name}</span>
                            <span style="color: #666;">${stats.pointsToNextRank} points to ${stats.nextRank.name}</span>
                            <span style="color: ${stats.nextRank.color};">${stats.nextRank.name}</span>
                        </div>
                        <div style="height: 8px; background: #1a1a24; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, ${stats.currentRank.color}, ${stats.nextRank.color}); transition: width 0.5s;"></div>
                        </div>
                    </div>
                `
                    : `
                    <div style="margin-top: 15px; text-align: center; color: #fbbf24; font-size: 12px;">
                        🌟 Maximum Rank Achieved!
                    </div>
                `
                }
            </div>

            <!-- Stats Grid -->
            <div style="padding: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                <div style="text-align: center; padding: 15px; background: #22c55e10; border: 1px solid #22c55e30; border-radius: 10px;">
                    <div style="color: #22c55e; font-size: 24px; font-weight: bold;">${stats.wins}</div>
                    <div style="color: #22c55e80; font-size: 10px; text-transform: uppercase;">Wins</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #ef444410; border: 1px solid #ef444430; border-radius: 10px;">
                    <div style="color: #ef4444; font-size: 24px; font-weight: bold;">${stats.losses}</div>
                    <div style="color: #ef444480; font-size: 10px; text-transform: uppercase;">Losses</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #3b82f610; border: 1px solid #3b82f630; border-radius: 10px;">
                    <div style="color: #3b82f6; font-size: 24px; font-weight: bold;">${stats.winRate}%</div>
                    <div style="color: #3b82f680; font-size: 10px; text-transform: uppercase;">Win Rate</div>
                </div>
                <div style="text-align: center; padding: 15px; background: #a855f710; border: 1px solid #a855f730; border-radius: 10px;">
                    <div style="color: #a855f7; font-size: 24px; font-weight: bold;">${stats.bossDefeated}</div>
                    <div style="color: #a855f780; font-size: 10px; text-transform: uppercase;">Bosses</div>
                </div>
            </div>

            <!-- Weekly Rewards -->
            <div style="padding: 20px; background: linear-gradient(180deg, #0a0a0f, #12121a); border-top: 1px solid #333;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div style="color: #ffffff; font-size: 14px; font-weight: 600;">🎁 Weekly Rewards</div>
                    <div style="color: #666; font-size: 11px;">Based on your current rank</div>
                </div>

                <div style="background: linear-gradient(135deg, ${stats.currentRank.color}10, #1a1a24); border: 1px solid ${stats.currentRank.color}30; border-radius: 12px; padding: 15px;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                        <span style="font-size: 24px;">${stats.currentRank.icon}</span>
                        <div>
                            <div style="color: ${stats.currentRank.color}; font-weight: 600;">${stats.currentRank.name} Rewards</div>
                            <div style="color: #666; font-size: 11px;">Claim once per week</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
                        <div style="padding: 6px 12px; background: #22c55e20; border: 1px solid #22c55e40; border-radius: 6px; font-size: 11px; color: #22c55e;">
                            +${RANKING_REWARDS[stats.currentRank.id].xp} XP
                        </div>
                        <div style="padding: 6px 12px; background: #fbbf2420; border: 1px solid #fbbf2440; border-radius: 6px; font-size: 11px; color: #fbbf24;">
                            +${RANKING_REWARDS[stats.currentRank.id].tokens} Tokens
                        </div>
                        ${
                          RANKING_REWARDS[stats.currentRank.id].materials
                            ?.map(
                              m => `
                            <div style="padding: 6px 12px; background: #3b82f620; border: 1px solid #3b82f640; border-radius: 6px; font-size: 11px; color: #3b82f6;">
                                + ${m.replace('_', ' ')}
                            </div>
                        `
                            )
                            .join('') || ''
                        }
                        ${
                          RANKING_REWARDS[stats.currentRank.id].equipment
                            ? `
                            <div style="padding: 6px 12px; background: #a855f720; border: 1px solid #a855f740; border-radius: 6px; font-size: 11px; color: #a855f7;">
                                + Random Equipment
                            </div>
                        `
                            : ''
                        }
                    </div>

                    <button id="claim-rewards-btn" style="
                        width: 100%; padding: 12px;
                        background: linear-gradient(135deg, ${stats.currentRank.color}, ${stats.currentRank.color}80);
                        border: none; border-radius: 8px;
                        color: #fff; font-size: 13px; font-weight: 600;
                        cursor: pointer; transition: all 0.2s;
                    " onmouseover="this.style.transform='scale(1.02)';" onmouseout="this.style.transform='scale(1)';">
                        🎁 Claim Weekly Rewards
                    </button>
                </div>
            </div>

            <!-- All Ranks -->
            <div style="padding: 20px; border-top: 1px solid #333;">
                <div style="color: #ffffff; font-size: 14px; font-weight: 600; margin-bottom: 15px;">📊 All Ranks</div>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
                    ${Object.values(RANKING_TIERS)
                      .map(tier => {
                        const isCurrentRank = tier.id === stats.currentRank.id;
                        const isAchieved = stats.points >= tier.minPoints;
                        return `
                            <div style="
                                text-align: center; padding: 12px;
                                background: ${isCurrentRank ? `${tier.color}20` : '#1a1a24'};
                                border: 2px solid ${isCurrentRank ? tier.color : isAchieved ? `${tier.color}60` : '#333'};
                                border-radius: 10px;
                                opacity: ${isAchieved ? '1' : '0.5'};
                            ">
                                <div style="font-size: 24px; margin-bottom: 4px;">${tier.icon}</div>
                                <div style="color: ${tier.color}; font-size: 11px; font-weight: 600;">${tier.name}</div>
                                <div style="color: #666; font-size: 9px;">${tier.minPoints}+ pts</div>
                                ${isCurrentRank ? '<div style="color: #22c55e; font-size: 9px; margin-top: 4px;">Current</div>' : ''}
                            </div>
                        `;
                      })
                      .join('')}
                </div>
            </div>
        </div>
    `;

  // Claim rewards handler
  container.querySelector('#claim-rewards-btn')?.addEventListener('click', () => {
    const result = claimWeeklyRewards();
    if (result.success) {
      showBattleNotification(result.message, 'success');
      renderRankingPanel(container); // Re-render
    } else {
      showBattleNotification(result.message, 'error');
    }
  });
}

// ============================================
// EXPORTS
// ============================================

if (typeof window !== 'undefined') {
  window.PumpArenaBattle = {
    // Core functions
    start: startBattle,
    getState: getBattleState,
    useSkill,
    flee: fleeBattle,
    move: movePlayer,

    // Card system
    playCard,
    endTurn: endPlayerTurn,
    drawCards,
    CARDS: ACTION_CARDS,
    CARD_RARITY,

    // Encounters
    randomEncounter,
    getRandomEnemy,

    // Combat stats
    calculateCombatStats,

    // Arena system
    ARENA_POSITIONS,
    RING_MODIFIERS,
    getPositionDistance,
    canMoveTo,

    // Ranking system
    getRankingStats,
    getCurrentRank,
    getNextRank,
    claimWeeklyRewards,
    renderRankingPanel,
    RANKING_TIERS,
    RANKING_REWARDS,

    // UI
    renderPanel: renderBattleUI,

    // Animation helpers
    animations: {
      showDamageNumber,
      showHealNumber,
      fireProjectile,
      createParticles,
      shakeElement,
      flashElement,
      critElement,
      deathAnimation,
      victoryAnimation,
      injectStyles: injectBattleStyles,
    },

    // Constants
    ENEMIES: ENEMY_TYPES,
    SKILLS: COMBAT_SKILLS,
    getFib: getBattleFib,
  };
}
