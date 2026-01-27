/**
 * Pump Arena RPG - Combat Tutorial System
 *
 * Interactive 5-step tutorial teaching tactical grid combat
 * 1. Movement (30s) - Grid zones and movement
 * 2. Cards & Actions (45s) - Hand, energy, card types
 * 3. Summons (45s) - Creatures and abilities
 * 4. Positioning (30s) - Distance bonuses
 * 5. Win Condition (20s) - Victory/defeat rules
 *
 * Total: ~3 minutes, fits on screen without scroll
 */

// ============================================================
// GLOBAL MODULE ACCESSORS (legacy compatibility)
// ============================================================

// Battle Grid accessors
const getGridConstants = () => window.PumpArenaBattleGrid?.GRID_CONSTANTS || {};
const _createBattleGridTutorial = () => window.PumpArenaBattleGrid?.createBattleGrid?.() || null;
const _BattleUnitTutorial = window.PumpArenaBattleGrid?.BattleUnit || class _BattleUnitTutorial { constructor(c) { Object.assign(this, c); } };

// Deck Builder accessors
const getDeckConstants = () => window.PumpArenaDeckBuilder?.DECK_CONSTANTS || {};
const getCards = () => window.PumpArenaDeckBuilder?.CARDS || {};
const createBattleHand = (deck) => window.PumpArenaDeckBuilder?.createBattleHand?.(deck) || null;

// Summons accessors
const getCreatures = () => window.PumpArenaSummons?.CREATURES || {};
const getCreatureAbilities = () => window.PumpArenaSummons?.CREATURE_ABILITIES || {};

// ============================================================
// SECURITY UTILITIES - use global from utils.js
// ============================================================
// deepFreeze and escapeHtml are defined in js/games/utils.js

// ============================================================
// TUTORIAL CONSTANTS
// ============================================================

const TUTORIAL_CONSTANTS = deepFreeze({
    // Step durations (ms)
    STEP_DURATIONS: {
        MOVEMENT: 30000,
        CARDS: 45000,
        SUMMONS: 45000,
        POSITIONING: 30000,
        WIN_CONDITION: 20000
    },

    // Tutorial rewards
    REWARDS: {
        COMPLETION_XP: 100,
        COMPLETION_TOKENS: 50,
        BONUS_CARD: 'tutorial_graduate',
        STARTER_CREATURE: 'stone_turtle'
    },

    // Tutorial enemy
    TUTORIAL_ENEMY: {
        id: 'tutorial_dummy',
        name: 'Training Dummy',
        icon: '🎯',
        hp: 55,
        atk: 5,
        def: 0,
        spd: 1,
        type: 'boss',
        team: 'enemy'
    },

    // Tutorial minions
    TUTORIAL_MINIONS: [
        { id: 'minion_1', name: 'Weak Bot', icon: '🤖', hp: 13, atk: 3, def: 0, spd: 5 },
        { id: 'minion_2', name: 'Weak Bot', icon: '🤖', hp: 13, atk: 3, def: 0, spd: 5 }
    ]
});

// ============================================================
// TUTORIAL STEPS
// ============================================================

const TUTORIAL_STEPS = [
    // ===== STEP 1: MOVEMENT =====
    {
        id: 'movement',
        title: 'Step 1: Movement',
        duration: TUTORIAL_CONSTANTS.STEP_DURATIONS.MOVEMENT,
        icon: '🏃',

        introduction: {
            title: 'The Battle Grid',
            text: `Welcome to tactical combat! The battlefield is a 9×9 grid divided into 3 zones:

• 🔴 Top 3 rows: ENEMY ZONE - Where enemies start
• ⚪ Middle 3 rows: NEUTRAL ZONE - Tactical ground
• 🟢 Bottom 3 rows: YOUR ZONE - Where you start

Your goal: Defeat the enemy boss while keeping yourself alive!`,
            highlight: 'zones'
        },

        instructions: [
            {
                text: 'Click on your character to select them',
                action: 'select_player',
                highlight: 'player_unit'
            },
            {
                text: 'Blue highlighted cells show where you can move',
                action: 'show_movement',
                highlight: 'movement_range'
            },
            {
                text: 'Click a blue cell to move there',
                action: 'move_player',
                targetCell: { row: 7, col: 4 },
                highlight: 'target_cell'
            },
            {
                text: 'Great! You can move up to 2 cells per turn',
                action: 'complete',
                highlight: null
            }
        ],

        tips: [
            'You can move in 8 directions (including diagonals)',
            'Moving doesn\'t cost energy or cards',
            'Plan your position before attacking!'
        ]
    },

    // ===== STEP 2: CARDS & ACTIONS =====
    {
        id: 'cards',
        title: 'Step 2: Cards & Energy',
        duration: TUTORIAL_CONSTANTS.STEP_DURATIONS.CARDS,
        icon: '🃏',

        introduction: {
            title: 'Your Hand of Cards',
            text: `Combat uses cards! Look at the bottom of the screen:

• 🃏 Your hand shows 5 cards
• ⚡ Energy (top right) limits what you can play
• Each card has a cost in the top corner

Card types:
⚔️ Attack - Deal damage to enemies
🛡️ Defense - Block incoming damage
💚 Support - Heal, buff, draw cards
🏃 Movement - Special movement abilities
🐾 Summon - Control your creatures`,
            highlight: 'hand_area'
        },

        instructions: [
            {
                text: 'Look at your hand - you have 5 cards',
                action: 'show_hand',
                highlight: 'hand'
            },
            {
                text: 'Your energy is shown as ⚡3/3',
                action: 'show_energy',
                highlight: 'energy_display'
            },
            {
                text: 'Select the "Quick Strike" card (costs 1⚡)',
                action: 'select_card',
                cardId: 'quick_strike',
                highlight: 'card_quick_strike'
            },
            {
                text: 'Red cells show enemies you can attack. Click one!',
                action: 'attack_enemy',
                highlight: 'attack_range'
            },
            {
                text: 'You dealt damage! Cards go to discard after use.',
                action: 'complete',
                highlight: null
            }
        ],

        tips: [
            'Start each turn with 3 energy, increasing over time',
            'You draw 2 cards at the start of each turn',
            'Unused energy doesn\'t carry over!'
        ]
    },

    // ===== STEP 3: SUMMONS =====
    {
        id: 'summons',
        title: 'Step 3: Creatures & Allies',
        duration: TUTORIAL_CONSTANTS.STEP_DURATIONS.SUMMONS,
        icon: '🐾',

        introduction: {
            title: 'Your Battle Party',
            text: `You fight alongside creatures and allies!

Party composition (7 units total):
• 👤 You (the leader) - If you die, it's GAME OVER
• 🦎🐺🐢 3 Creatures - Elemental animals you've tamed
• 🛡️⚡🌬️ 3 Allies - NPC friends who fight with you

Each has unique abilities and roles:
• Tank creatures absorb damage
• DPS creatures deal high damage
• Support allies heal and buff`,
            highlight: 'party_display'
        },

        instructions: [
            {
                text: 'Your Stone Turtle 🐢 is placed on the grid',
                action: 'show_creature',
                highlight: 'creature_unit'
            },
            {
                text: 'Click the creature to select it',
                action: 'select_creature',
                highlight: 'creature_unit'
            },
            {
                text: 'Creatures can move AND use abilities each turn',
                action: 'show_creature_abilities',
                highlight: 'ability_panel'
            },
            {
                text: 'Use "Shell Bash" on the Training Dummy!',
                action: 'use_creature_ability',
                abilityId: 'shell_bash',
                highlight: 'ability_button'
            },
            {
                text: 'Excellent! Creatures level up and evolve with XP.',
                action: 'complete',
                highlight: null
            }
        ],

        tips: [
            'Protect your player character at all costs!',
            'Creatures can enter the enemy zone, you cannot',
            'Allies unlock at high affinity with NPCs'
        ]
    },

    // ===== STEP 4: POSITIONING =====
    {
        id: 'positioning',
        title: 'Step 4: Distance Matters',
        duration: TUTORIAL_CONSTANTS.STEP_DURATIONS.POSITIONING,
        icon: '📍',

        introduction: {
            title: 'Strategic Positioning',
            text: `Position affects damage!

Distance bonuses:
• ⚔️ Melee attacks: +30% damage at range 1
• 🎯 Ranged attacks: +30% damage at range 4+
• ✨ Magic attacks: +21% at optimal range (2-4)

Cover and terrain:
• 🪨 Cover cells give +21% defense
• ⚠️ Hazard cells deal 5 damage when entered
• 🚫 Blocked cells cannot be crossed`,
            highlight: 'distance_indicators'
        },

        instructions: [
            {
                text: 'Notice the distance indicator when selecting attack',
                action: 'show_distance',
                highlight: 'distance_display'
            },
            {
                text: 'Move your melee creature adjacent to the enemy',
                action: 'position_creature',
                targetDistance: 1,
                highlight: 'optimal_position'
            },
            {
                text: 'Attack now for the melee bonus!',
                action: 'attack_with_bonus',
                highlight: 'bonus_indicator'
            },
            {
                text: 'See the +30% bonus in the damage number!',
                action: 'complete',
                highlight: 'damage_popup'
            }
        ],

        tips: [
            'Always position melee units close before attacking',
            'Keep ranged units far back for their bonus',
            'Use the neutral zone for tactical advantage'
        ]
    },

    // ===== STEP 5: WIN CONDITION =====
    {
        id: 'win_condition',
        title: 'Step 5: Victory & Defeat',
        duration: TUTORIAL_CONSTANTS.STEP_DURATIONS.WIN_CONDITION,
        icon: '🏆',

        introduction: {
            title: 'How to Win',
            text: `Battle outcomes:

🏆 VICTORY conditions:
• Defeat the enemy boss
• Defeat all enemy units

💀 DEFEAT conditions:
• YOUR CHARACTER DIES (most important!)
• All your units are defeated

CRITICAL: Even if your creatures and allies survive,
if YOU die, the battle is LOST. Protect yourself!

After battle:
• Earn XP for all surviving units
• Collect token rewards
• Find card drops from enemies`,
            highlight: 'health_bars'
        },

        instructions: [
            {
                text: 'Your health bar is shown at the top',
                action: 'show_player_health',
                highlight: 'player_health'
            },
            {
                text: 'The enemy boss health is shown above the grid',
                action: 'show_boss_health',
                highlight: 'boss_health'
            },
            {
                text: 'Finish off the Training Dummy to complete the tutorial!',
                action: 'defeat_boss',
                highlight: 'boss_unit'
            }
        ],

        tips: [
            'Always keep an eye on your health',
            'Use defense cards when low on HP',
            'Retreat to safety if needed - survival first!'
        ]
    }
];

// Deep freeze all tutorial steps
deepFreeze(TUTORIAL_STEPS);

// ============================================================
// TUTORIAL MANAGER CLASS
// ============================================================

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.currentInstruction = 0;
        this.isActive = false;
        this.isComplete = false;
        this.tutorialGrid = null;
        this.tutorialHand = null;
        this.stepStartTime = 0;
        this.onComplete = null;
        this.onStepComplete = null;
    }

    /**
     * Start the tutorial
     */
    start(callbacks = {}) {
        this.currentStep = 0;
        this.currentInstruction = 0;
        this.isActive = true;
        this.isComplete = false;
        this.onComplete = callbacks.onComplete || null;
        this.onStepComplete = callbacks.onStepComplete || null;

        // Setup tutorial battle
        this.setupTutorialBattle();

        // Start first step
        this.startStep(0);

        return this.getState();
    }

    /**
     * Setup the tutorial battle grid
     */
    setupTutorialBattle() {
        this.tutorialGrid = _createBattleGridTutorial();

        // Create player
        const player = new _BattleUnitTutorial({
            id: 'player',
            name: 'You',
            type: 'player',
            team: 'player',
            icon: '🧑',
            hp: 100,
            atk: 15,
            def: 10,
            spd: 15,
            attackRange: 2,
            attackType: 'melee',
            movementRange: 2
        });

        // Create tutorial creature (using local data to avoid dependency timing issues)
        const stoneTurtleData = getCreatures().stone_turtle || {
            name: 'Stone Turtle',
            icon: '🐢',
            hp: 55,
            atk: 8,
            def: 21,
            spd: 5,
            attackRange: 1,
            movementRange: 2
        };
        const creature = new _BattleUnitTutorial({
            ...stoneTurtleData,
            id: 'creature_0',
            type: 'creature',
            team: 'player'
        });

        // Create tutorial enemy
        const enemy = new _BattleUnitTutorial({
            ...TUTORIAL_CONSTANTS.TUTORIAL_ENEMY
        });

        // Create minions
        const minions = TUTORIAL_CONSTANTS.TUTORIAL_MINIONS.map((m, i) => new _BattleUnitTutorial({
            ...m,
            id: `minion_${i}`,
            type: 'minion',
            team: 'enemy'
        }));

        // Place units
        this.tutorialGrid.addUnit(player, 8, 4);
        this.tutorialGrid.addUnit(creature, 7, 3);
        this.tutorialGrid.addUnit(enemy, 0, 4);
        minions.forEach((m, i) => {
            this.tutorialGrid.addUnit(m, 1, 3 + i * 2);
        });

        // Setup tutorial hand (with fallback card data)
        const allCards = getCards();
        const tutorialDeck = [
            'quick_strike', 'quick_strike', 'power_attack',
            'guard', 'heal', 'draw_power',
            'summon_creature', 'creature_command'
        ].map(id => ({ cardId: id, ...(allCards[id] || { id, name: id, cost: 1, type: 'attack' }) }));

        this.tutorialHand = createBattleHand(tutorialDeck);
        this.tutorialHand.drawStartingHand();

        // Initialize turn order
        this.tutorialGrid.initializeTurnOrder();
    }

    /**
     * Start a specific step
     */
    startStep(stepIndex) {
        if (stepIndex >= TUTORIAL_STEPS.length) {
            this.completeTutorial();
            return;
        }

        this.currentStep = stepIndex;
        this.currentInstruction = 0;
        this.stepStartTime = Date.now();

        const step = TUTORIAL_STEPS[stepIndex];

        return {
            step,
            introduction: step.introduction,
            instructions: step.instructions,
            tips: step.tips
        };
    }

    /**
     * Advance to next instruction
     */
    nextInstruction() {
        const step = TUTORIAL_STEPS[this.currentStep];

        if (this.currentInstruction < step.instructions.length - 1) {
            this.currentInstruction++;
            return {
                instruction: step.instructions[this.currentInstruction],
                isLastInstruction: this.currentInstruction === step.instructions.length - 1
            };
        }

        return this.completeStep();
    }

    /**
     * Complete current step
     */
    completeStep() {
        const completedStep = TUTORIAL_STEPS[this.currentStep];

        if (this.onStepComplete) {
            this.onStepComplete(completedStep);
        }

        // Move to next step
        const nextStepIndex = this.currentStep + 1;

        if (nextStepIndex >= TUTORIAL_STEPS.length) {
            return this.completeTutorial();
        }

        return this.startStep(nextStepIndex);
    }

    /**
     * Complete the entire tutorial
     */
    completeTutorial() {
        this.isComplete = true;
        this.isActive = false;

        const rewards = {
            xp: TUTORIAL_CONSTANTS.REWARDS.COMPLETION_XP,
            tokens: TUTORIAL_CONSTANTS.REWARDS.COMPLETION_TOKENS,
            items: [TUTORIAL_CONSTANTS.REWARDS.BONUS_CARD],
            creatures: [TUTORIAL_CONSTANTS.REWARDS.STARTER_CREATURE]
        };

        if (this.onComplete) {
            this.onComplete(rewards);
        }

        return {
            complete: true,
            rewards,
            message: 'Tutorial Complete! You\'re ready for real battles!'
        };
    }

    /**
     * Handle player action during tutorial
     */
    handleAction(actionType, data) {
        if (!this.isActive) return null;

        const step = TUTORIAL_STEPS[this.currentStep];
        const instruction = step.instructions[this.currentInstruction];

        // Check if action matches expected action
        if (instruction.action === actionType) {
            // Validate target if needed
            if (instruction.targetCell) {
                if (data.row !== instruction.targetCell.row ||
                    data.col !== instruction.targetCell.col) {
                    return {
                        valid: false,
                        message: `Try clicking the highlighted cell at row ${instruction.targetCell.row + 1}`
                    };
                }
            }

            // Action is valid, advance
            return {
                valid: true,
                ...this.nextInstruction()
            };
        }

        // Wrong action
        return {
            valid: false,
            message: `Not quite! ${instruction.text}`,
            expectedAction: instruction.action
        };
    }

    /**
     * Skip to specific step (for testing)
     */
    skipToStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= TUTORIAL_STEPS.length) return null;
        return this.startStep(stepIndex);
    }

    /**
     * Skip entire tutorial
     */
    skip() {
        return this.completeTutorial();
    }

    /**
     * Get current state
     */
    getState() {
        if (!this.isActive && !this.isComplete) {
            return { status: 'not_started' };
        }

        if (this.isComplete) {
            return { status: 'complete' };
        }

        const step = TUTORIAL_STEPS[this.currentStep];
        const instruction = step.instructions[this.currentInstruction];
        const elapsed = Date.now() - this.stepStartTime;

        return {
            status: 'active',
            currentStep: this.currentStep,
            totalSteps: TUTORIAL_STEPS.length,
            stepTitle: step.title,
            stepIcon: step.icon,
            instruction: instruction.text,
            instructionIndex: this.currentInstruction,
            totalInstructions: step.instructions.length,
            highlight: instruction.highlight,
            tips: step.tips,
            elapsed,
            duration: step.duration,
            grid: this.tutorialGrid?.getGridState(),
            hand: this.tutorialHand?.getHandState()
        };
    }

    /**
     * Get step progress as percentage
     */
    getProgress() {
        const stepProgress = (this.currentStep / TUTORIAL_STEPS.length) * 100;
        const instructionProgress = TUTORIAL_STEPS[this.currentStep]
            ? (this.currentInstruction / TUTORIAL_STEPS[this.currentStep].instructions.length) * (100 / TUTORIAL_STEPS.length)
            : 0;

        return Math.round(stepProgress + instructionProgress);
    }
}

// ============================================================
// TUTORIAL UI RENDERER
// ============================================================

class TutorialUIRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tutorialManager = null;
    }

    /**
     * Bind tutorial manager
     */
    setManager(manager) {
        this.tutorialManager = manager;
    }

    /**
     * Render tutorial overlay
     */
    render() {
        if (!this.container || !this.tutorialManager) return;

        const state = this.tutorialManager.getState();

        if (state.status === 'not_started') {
            this.renderStartScreen();
        } else if (state.status === 'complete') {
            this.renderCompleteScreen();
        } else {
            this.renderTutorialStep(state);
        }
    }

    /**
     * Render start screen
     */
    renderStartScreen() {
        this.container.innerHTML = `
            <div class="tutorial-start" style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                color: white;
                padding: 20px;
            ">
                <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚔️ Combat Tutorial</h1>
                <p style="max-width: 400px; text-align: center; margin-bottom: 2rem; opacity: 0.8;">
                    Learn the tactical grid combat system in 5 quick steps.
                    Takes about 3 minutes to complete.
                </p>
                <div style="display: flex; gap: 1rem;">
                    <button id="start-tutorial" style="
                        padding: 12px 24px;
                        font-size: 1.1rem;
                        background: #f97316;
                        border: none;
                        border-radius: 8px;
                        color: white;
                        cursor: pointer;
                    ">Start Tutorial</button>
                    <button id="skip-tutorial" style="
                        padding: 12px 24px;
                        font-size: 1.1rem;
                        background: transparent;
                        border: 1px solid #666;
                        border-radius: 8px;
                        color: #888;
                        cursor: pointer;
                    ">Skip</button>
                </div>
            </div>
        `;

        document.getElementById('start-tutorial')?.addEventListener('click', () => {
            this.tutorialManager.start();
            this.render();
        });

        document.getElementById('skip-tutorial')?.addEventListener('click', () => {
            this.tutorialManager.skip();
            this.render();
        });
    }

    /**
     * Render active tutorial step (XSS-safe)
     */
    renderTutorialStep(state) {
        const progress = Math.min(100, Math.max(0, this.tutorialManager.getProgress()));

        // Sanitize all user-displayable content
        const safeStepIcon = escapeHtml(state.stepIcon);
        const safeStepTitle = escapeHtml(state.stepTitle);
        const safeInstruction = escapeHtml(state.instruction);
        const safeCurrentStep = Math.max(0, parseInt(state.currentStep, 10) || 0);
        const safeTotalSteps = Math.max(1, parseInt(state.totalSteps, 10) || 1);
        const safeInstructionIndex = Math.max(0, parseInt(state.instructionIndex, 10) || 0);
        const safeTotalInstructions = Math.max(1, parseInt(state.totalInstructions, 10) || 1);
        const safeTips = (state.tips || []).map(tip => escapeHtml(tip));

        this.container.innerHTML = `
            <div class="tutorial-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: rgba(0,0,0,0.95);
                padding: 10px 20px;
                z-index: 1000;
                color: white;
            ">
                <!-- Progress bar -->
                <div style="
                    height: 4px;
                    background: #333;
                    border-radius: 2px;
                    margin-bottom: 10px;
                ">
                    <div style="
                        height: 100%;
                        width: ${progress}%;
                        background: #f97316;
                        border-radius: 2px;
                        transition: width 0.3s;
                    "></div>
                </div>

                <!-- Step header -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.5rem;">${safeStepIcon}</span>
                        <span style="font-weight: bold;">${safeStepTitle}</span>
                        <span style="opacity: 0.6; font-size: 0.9rem;">
                            (${safeCurrentStep + 1}/${safeTotalSteps})
                        </span>
                    </div>
                    <button id="skip-step" style="
                        padding: 4px 12px;
                        background: transparent;
                        border: 1px solid #666;
                        border-radius: 4px;
                        color: #888;
                        cursor: pointer;
                        font-size: 0.8rem;
                    ">Skip Step</button>
                </div>

                <!-- Instruction -->
                <div style="
                    margin-top: 10px;
                    padding: 10px;
                    background: rgba(249, 115, 22, 0.2);
                    border-left: 3px solid #f97316;
                    border-radius: 4px;
                ">
                    <span style="opacity: 0.6; font-size: 0.8rem;">
                        Step ${safeInstructionIndex + 1}/${safeTotalInstructions}:
                    </span>
                    <p style="margin: 4px 0 0 0; font-size: 1rem;">${safeInstruction}</p>
                </div>
            </div>

            <!-- Tips panel (bottom) -->
            <div style="
                position: fixed;
                bottom: 120px;
                left: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                padding: 10px;
                border-radius: 8px;
                z-index: 1000;
                color: white;
            ">
                <div style="font-size: 0.8rem; opacity: 0.6; margin-bottom: 4px;">💡 Tips:</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem;">
                    ${safeTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        `;

        document.getElementById('skip-step')?.addEventListener('click', () => {
            this.tutorialManager.completeStep();
            this.render();
        });
    }

    /**
     * Render completion screen (XSS-safe)
     */
    renderCompleteScreen() {
        const rewards = TUTORIAL_CONSTANTS.REWARDS;

        // Sanitize numeric values
        const safeXP = Math.max(0, parseInt(rewards.COMPLETION_XP, 10) || 0);
        const safeTokens = Math.max(0, parseInt(rewards.COMPLETION_TOKENS, 10) || 0);

        this.container.innerHTML = `
            <div class="tutorial-complete" style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.95);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                color: white;
                padding: 20px;
            ">
                <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                <h1 style="font-size: 2rem; margin-bottom: 0.5rem;">Tutorial Complete!</h1>
                <p style="opacity: 0.8; margin-bottom: 2rem;">
                    You've mastered the basics of tactical combat!
                </p>

                <div style="
                    background: rgba(249, 115, 22, 0.2);
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 2rem;
                    text-align: center;
                ">
                    <h3 style="margin: 0 0 10px 0;">🎁 Rewards Earned:</h3>
                    <div style="display: flex; gap: 20px; justify-content: center;">
                        <div>
                            <div style="font-size: 1.5rem;">⭐</div>
                            <div>${safeXP} XP</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem;">🪙</div>
                            <div>${safeTokens} Tokens</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem;">🃏</div>
                            <div>Tutorial Graduate Card</div>
                        </div>
                        <div>
                            <div style="font-size: 1.5rem;">🐢</div>
                            <div>Stone Turtle</div>
                        </div>
                    </div>
                </div>

                <button id="finish-tutorial" style="
                    padding: 12px 32px;
                    font-size: 1.2rem;
                    background: #f97316;
                    border: none;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                ">Continue to Battle!</button>
            </div>
        `;

        document.getElementById('finish-tutorial')?.addEventListener('click', () => {
            this.container.innerHTML = '';
            // Emit completion event
            const event = new CustomEvent('tutorialComplete', {
                detail: { rewards }
            });
            this.container.dispatchEvent(event);
        });
    }

    /**
     * Add highlight overlay to element
     */
    addHighlight(elementId, type = 'pulse') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.add('tutorial-highlight', `highlight-${type}`);
    }

    /**
     * Remove all highlights
     */
    clearHighlights() {
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight', 'highlight-pulse', 'highlight-glow');
        });
    }
}

// ============================================================
// TUTORIAL CSS STYLES
// ============================================================

const TUTORIAL_STYLES = `
.tutorial-highlight {
    position: relative;
    z-index: 100;
}

.tutorial-highlight.highlight-pulse {
    animation: tutorial-pulse 1.5s infinite;
}

.tutorial-highlight.highlight-glow {
    box-shadow: 0 0 20px rgba(249, 115, 22, 0.8);
}

@keyframes tutorial-pulse {
    0%, 100% {
        box-shadow: 0 0 10px rgba(249, 115, 22, 0.5);
    }
    50% {
        box-shadow: 0 0 30px rgba(249, 115, 22, 0.8);
    }
}

.tutorial-arrow {
    position: absolute;
    font-size: 2rem;
    animation: tutorial-bounce 0.5s infinite alternate;
}

@keyframes tutorial-bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-10px); }
}
`;

// Inject styles
function injectTutorialStyles() {
    if (document.getElementById('tutorial-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'tutorial-styles';
    styleEl.textContent = TUTORIAL_STYLES;
    document.head.appendChild(styleEl);
}

// ============================================================
// SINGLETON INSTANCE & EXPORTS
// ============================================================

const tutorialManager = new TutorialManager();

// ============================================================
// GLOBAL EXPORTS (legacy compatibility)
// ============================================================

window.PumpArenaTutorial = {
    TUTORIAL_CONSTANTS,
    TUTORIAL_STEPS,
    TutorialManager,
    TutorialUIRenderer,
    tutorialManager,
    injectTutorialStyles,
    startTutorial: (cb) => { injectTutorialStyles(); return tutorialManager.start(cb); },
    getTutorialState: () => tutorialManager.getState(),
    handleTutorialAction: (t, d) => tutorialManager.handleAction(t, d),
    skipTutorial: () => tutorialManager.skip(),
    isTutorialComplete: () => tutorialManager.isComplete,
    isTutorialActive: () => tutorialManager.isActive
};
