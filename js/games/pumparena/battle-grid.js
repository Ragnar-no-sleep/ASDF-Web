/**
 * Pump Arena RPG - Tactical Battle Grid System
 *
 * 9x9 Grid Combat with strategic positioning
 * - Rows 0-2: Enemy Zone (boss + minions)
 * - Rows 3-5: Neutral Zone (tactical)
 * - Rows 6-8: Player Zone (player + allies + creatures)
 *
 * ASDF Philosophy: Fibonacci-based stats and golden ratio positioning
 */

// ============================================================
// GLOBAL MODULE ACCESSORS (legacy compatibility)
// ============================================================

// Battle module accessor
const BATTLE_CONSTANTS = () => window.PumpArenaBattle?.CONSTANTS || {
    ENERGY_PER_TURN: 3,
    MAX_CARDS_IN_HAND: 8
};

// ============================================================
// GRID CONSTANTS - Fibonacci/Golden Ratio based
// ============================================================

// ============================================================
// SECURITY UTILITIES
// ============================================================

/**
 * Deep freeze an object and all nested objects
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            deepFreeze(obj[key]);
        }
    });
    return Object.freeze(obj);
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
}

const GRID_CONSTANTS = deepFreeze({
    // Grid dimensions
    GRID_SIZE: 9,
    CELL_COUNT: 81, // 9x9

    // Zone definitions (row ranges)
    ZONES: {
        ENEMY: { startRow: 0, endRow: 2, name: 'enemy' },
        NEUTRAL: { startRow: 3, endRow: 5, name: 'neutral' },
        PLAYER: { startRow: 6, endRow: 8, name: 'player' }
    },

    // Cell sizes (responsive) - Fibonacci multiples
    CELL_SIZE: {
        DESKTOP: 40,  // 360px total grid
        TABLET: 35,   // 315px total grid
        MOBILE: 28    // 252px total grid
    },

    // Movement costs
    MOVEMENT: {
        NORMAL: 1,
        DIFFICULT: 2,
        BLOCKED: Infinity
    },

    // Movement range per unit type (Fibonacci)
    MOVEMENT_RANGE: {
        PLAYER: 2,
        CREATURE: 3,
        ALLY: 2,
        BOSS: 2,
        MINION: 3
    },

    // Attack ranges
    ATTACK_RANGE: {
        MELEE: 1,
        SHORT: 2,
        MID: 3,
        LONG: 5,
        RANGED: 8
    },

    // Distance bonuses (percentage) - Golden Ratio based
    DISTANCE_BONUS: {
        MELEE_CLOSE: 0.30,      // +30% for melee at range 1
        RANGED_FAR: 0.30,       // +30% for ranged at range 4+
        OPTIMAL_BONUS: 0.21,    // +21% at optimal range
        SUBOPTIMAL_PENALTY: -0.13 // -13% at suboptimal range
    },

    // Units per side
    UNITS_PER_SIDE: {
        LEADER: 1,      // Player or Boss
        CREATURES: 3,   // Summoned animals
        ALLIES: 3       // NPC companions
    },

    // Turn order
    TURN_PHASES: Object.freeze(['START', 'MOVEMENT', 'ACTION', 'END']),

    // Terrain types
    TERRAIN: {
        NORMAL: { id: 'normal', cost: 1, passable: true },
        DIFFICULT: { id: 'difficult', cost: 2, passable: true },
        HAZARD: { id: 'hazard', cost: 1, passable: true, damage: 5 },
        BLOCKED: { id: 'blocked', cost: Infinity, passable: false },
        COVER: { id: 'cover', cost: 1, passable: true, defenseBonus: 0.21 }
    }
});

// ============================================================
// GRID CELL CLASS
// ============================================================

class GridCell {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.id = `cell_${row}_${col}`;
        this.terrain = GRID_CONSTANTS.TERRAIN.NORMAL;
        this.unit = null;
        this.effects = []; // Temporary effects (fire, ice, etc.)
        this.highlighted = false;
        this.highlightType = null; // 'move', 'attack', 'ability'
    }

    get zone() {
        if (this.row <= GRID_CONSTANTS.ZONES.ENEMY.endRow) return 'enemy';
        if (this.row <= GRID_CONSTANTS.ZONES.NEUTRAL.endRow) return 'neutral';
        return 'player';
    }

    get isOccupied() {
        return this.unit !== null;
    }

    get movementCost() {
        return this.terrain.cost;
    }

    get isPassable() {
        return this.terrain.passable && !this.isOccupied;
    }

    setUnit(unit) {
        this.unit = unit;
        if (unit) {
            unit.position = { row: this.row, col: this.col };
        }
    }

    removeUnit() {
        const unit = this.unit;
        this.unit = null;
        return unit;
    }

    setTerrain(terrainType) {
        this.terrain = GRID_CONSTANTS.TERRAIN[terrainType] || GRID_CONSTANTS.TERRAIN.NORMAL;
    }

    addEffect(effect) {
        this.effects.push({
            ...effect,
            appliedAt: Date.now()
        });
    }

    removeEffect(effectId) {
        this.effects = this.effects.filter(e => e.id !== effectId);
    }

    clearHighlight() {
        this.highlighted = false;
        this.highlightType = null;
    }

    setHighlight(type) {
        this.highlighted = true;
        this.highlightType = type;
    }
}

// ============================================================
// BATTLE UNIT CLASS
// ============================================================

class BattleUnit {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.type = config.type; // 'player', 'creature', 'ally', 'boss', 'minion'
        this.team = config.team; // 'player' or 'enemy'

        // Stats (Fibonacci-based)
        this.maxHp = config.hp || 55;
        this.hp = this.maxHp;
        this.atk = config.atk || 13;
        this.def = config.def || 8;
        this.spd = config.spd || 21;
        this.lck = config.lck || 5;

        // Combat properties
        this.attackRange = config.attackRange || GRID_CONSTANTS.ATTACK_RANGE.MELEE;
        this.attackType = config.attackType || 'melee'; // 'melee', 'ranged', 'magic'
        this.movementRange = config.movementRange || GRID_CONSTANTS.MOVEMENT_RANGE[config.type?.toUpperCase()] || 2;

        // Position
        this.position = { row: 0, col: 0 };

        // State
        this.hasMovedThisTurn = false;
        this.hasActedThisTurn = false;
        this.isAlive = true;
        this.statusEffects = [];

        // Visuals
        this.icon = config.icon || '⚔️';
        this.color = config.color || '#ffffff';

        // Abilities
        this.abilities = config.abilities || [];

        // Reference to original data
        this.sourceData = config.sourceData || null;
    }

    get isDead() {
        return this.hp <= 0;
    }

    takeDamage(amount) {
        const actualDamage = Math.max(0, amount - this.def);
        this.hp = Math.max(0, this.hp - actualDamage);

        if (this.hp <= 0) {
            this.isAlive = false;
        }

        return actualDamage;
    }

    heal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - oldHp;
    }

    resetTurn() {
        this.hasMovedThisTurn = false;
        this.hasActedThisTurn = false;
    }

    canMove() {
        return this.isAlive && !this.hasMovedThisTurn;
    }

    canAct() {
        return this.isAlive && !this.hasActedThisTurn;
    }

    addStatusEffect(effect) {
        this.statusEffects.push({
            ...effect,
            appliedAt: Date.now(),
            turnsRemaining: effect.duration || 3
        });
    }

    processStatusEffects() {
        const expiredEffects = [];

        this.statusEffects.forEach(effect => {
            // Apply effect
            if (effect.onTurnStart) {
                effect.onTurnStart(this);
            }

            // Decrement duration
            effect.turnsRemaining--;

            if (effect.turnsRemaining <= 0) {
                expiredEffects.push(effect.id);
            }
        });

        // Remove expired effects
        this.statusEffects = this.statusEffects.filter(e => !expiredEffects.includes(e.id));

        return expiredEffects;
    }

    getStatModifier(stat) {
        let modifier = 0;

        this.statusEffects.forEach(effect => {
            if (effect.statModifiers && effect.statModifiers[stat]) {
                modifier += effect.statModifiers[stat];
            }
        });

        return modifier;
    }

    getEffectiveStat(stat) {
        const baseStat = this[stat] || 0;
        const modifier = this.getStatModifier(stat);
        return Math.max(0, baseStat + modifier);
    }
}

// ============================================================
// BATTLE GRID CLASS
// ============================================================

class BattleGrid {
    constructor() {
        this.cells = [];
        this.units = new Map(); // unitId -> BattleUnit
        this.playerTeam = [];
        this.enemyTeam = [];
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.turnPhase = 'START';
        this.turnNumber = 1;
        this.selectedUnit = null;
        this.selectedCell = null;
        this.battleLog = [];

        this.initializeGrid();
    }

    /**
     * Initialize 9x9 grid
     */
    initializeGrid() {
        this.cells = [];

        for (let row = 0; row < GRID_CONSTANTS.GRID_SIZE; row++) {
            this.cells[row] = [];
            for (let col = 0; col < GRID_CONSTANTS.GRID_SIZE; col++) {
                this.cells[row][col] = new GridCell(row, col);
            }
        }
    }

    /**
     * Get cell at position
     */
    getCell(row, col) {
        if (row < 0 || row >= GRID_CONSTANTS.GRID_SIZE ||
            col < 0 || col >= GRID_CONSTANTS.GRID_SIZE) {
            return null;
        }
        return this.cells[row][col];
    }

    /**
     * Add unit to grid
     */
    addUnit(unit, row, col) {
        const cell = this.getCell(row, col);
        if (!cell || cell.isOccupied) {
            console.warn(`Cannot place unit at ${row},${col}`);
            return false;
        }

        cell.setUnit(unit);
        this.units.set(unit.id, unit);

        if (unit.team === 'player') {
            this.playerTeam.push(unit);
        } else {
            this.enemyTeam.push(unit);
        }

        return true;
    }

    /**
     * Remove unit from grid
     */
    removeUnit(unitId) {
        const unit = this.units.get(unitId);
        if (!unit) return null;

        const cell = this.getCell(unit.position.row, unit.position.col);
        if (cell) {
            cell.removeUnit();
        }

        this.units.delete(unitId);
        this.playerTeam = this.playerTeam.filter(u => u.id !== unitId);
        this.enemyTeam = this.enemyTeam.filter(u => u.id !== unitId);

        return unit;
    }

    /**
     * Move unit to new position
     */
    moveUnit(unitId, targetRow, targetCol) {
        const unit = this.units.get(unitId);
        if (!unit || !unit.canMove()) return { success: false, reason: 'Cannot move' };

        const targetCell = this.getCell(targetRow, targetCol);
        if (!targetCell || !targetCell.isPassable) {
            return { success: false, reason: 'Invalid target' };
        }

        // Check movement range
        const distance = this.getDistance(unit.position.row, unit.position.col, targetRow, targetCol);
        if (distance > unit.movementRange) {
            return { success: false, reason: 'Out of range' };
        }

        // Check path exists
        const path = this.findPath(unit.position.row, unit.position.col, targetRow, targetCol, unit.movementRange);
        if (!path) {
            return { success: false, reason: 'No valid path' };
        }

        // Perform move
        const sourceCell = this.getCell(unit.position.row, unit.position.col);
        sourceCell.removeUnit();
        targetCell.setUnit(unit);
        unit.hasMovedThisTurn = true;

        // Apply terrain effects
        if (targetCell.terrain.damage) {
            unit.takeDamage(targetCell.terrain.damage);
        }

        this.addLog(`${unit.name} moved to (${targetRow}, ${targetCol})`);

        return { success: true, path, distance };
    }

    /**
     * Calculate distance between two cells (Chebyshev distance for 8-direction movement)
     */
    getDistance(row1, col1, row2, col2) {
        return Math.max(Math.abs(row2 - row1), Math.abs(col2 - col1));
    }

    /**
     * Calculate Manhattan distance
     */
    getManhattanDistance(row1, col1, row2, col2) {
        return Math.abs(row2 - row1) + Math.abs(col2 - col1);
    }

    /**
     * Get all cells within movement range
     */
    getMovementRange(unit) {
        const reachable = [];
        const { row: startRow, col: startCol } = unit.position;
        const range = unit.movementRange;

        for (let row = 0; row < GRID_CONSTANTS.GRID_SIZE; row++) {
            for (let col = 0; col < GRID_CONSTANTS.GRID_SIZE; col++) {
                if (row === startRow && col === startCol) continue;

                const cell = this.getCell(row, col);
                if (!cell.isPassable) continue;

                const distance = this.getDistance(startRow, startCol, row, col);
                if (distance <= range) {
                    // Verify path exists
                    const path = this.findPath(startRow, startCol, row, col, range);
                    if (path) {
                        reachable.push({ row, col, distance, path });
                    }
                }
            }
        }

        return reachable;
    }

    /**
     * Get all cells within attack range
     */
    getAttackRange(unit) {
        const targets = [];
        const { row: startRow, col: startCol } = unit.position;
        const range = unit.attackRange;

        for (let row = 0; row < GRID_CONSTANTS.GRID_SIZE; row++) {
            for (let col = 0; col < GRID_CONSTANTS.GRID_SIZE; col++) {
                if (row === startRow && col === startCol) continue;

                const cell = this.getCell(row, col);
                const distance = this.getDistance(startRow, startCol, row, col);

                if (distance <= range) {
                    targets.push({
                        row,
                        col,
                        distance,
                        hasEnemy: cell.unit && cell.unit.team !== unit.team,
                        hasAlly: cell.unit && cell.unit.team === unit.team,
                        isEmpty: !cell.unit
                    });
                }
            }
        }

        return targets;
    }

    /**
     * A* pathfinding
     */
    findPath(startRow, startCol, endRow, endCol, maxCost) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${startRow},${startCol}`;
        const endKey = `${endRow},${endCol}`;

        gScore.set(startKey, 0);
        fScore.set(startKey, this.getDistance(startRow, startCol, endRow, endCol));
        openSet.push({ row: startRow, col: startCol, f: fScore.get(startKey) });

        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        while (openSet.length > 0) {
            // Get node with lowest fScore
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = `${current.row},${current.col}`;

            if (currentKey === endKey) {
                // Reconstruct path
                const path = [];
                let key = endKey;
                while (key) {
                    const [r, c] = key.split(',').map(Number);
                    path.unshift({ row: r, col: c });
                    key = cameFrom.get(key);
                }
                return path;
            }

            closedSet.add(currentKey);

            for (const [dr, dc] of directions) {
                const newRow = current.row + dr;
                const newCol = current.col + dc;
                const neighborKey = `${newRow},${newCol}`;

                if (closedSet.has(neighborKey)) continue;

                const cell = this.getCell(newRow, newCol);
                if (!cell) continue;

                // Check if passable (or is destination)
                const isDestination = neighborKey === endKey;
                if (!isDestination && !cell.isPassable) continue;

                const moveCost = cell.movementCost;
                const tentativeG = gScore.get(currentKey) + moveCost;

                if (tentativeG > maxCost) continue;

                if (!gScore.has(neighborKey) || tentativeG < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, currentKey);
                    gScore.set(neighborKey, tentativeG);
                    const f = tentativeG + this.getDistance(newRow, newCol, endRow, endCol);
                    fScore.set(neighborKey, f);

                    if (!openSet.find(n => `${n.row},${n.col}` === neighborKey)) {
                        openSet.push({ row: newRow, col: newCol, f });
                    }
                }
            }
        }

        return null; // No path found
    }

    /**
     * Perform attack
     */
    performAttack(attackerId, targetRow, targetCol) {
        const attacker = this.units.get(attackerId);
        if (!attacker || !attacker.canAct()) {
            return { success: false, reason: 'Cannot act' };
        }

        const targetCell = this.getCell(targetRow, targetCol);
        if (!targetCell || !targetCell.unit) {
            return { success: false, reason: 'No target' };
        }

        const target = targetCell.unit;
        if (target.team === attacker.team) {
            return { success: false, reason: 'Cannot attack ally' };
        }

        // Check range
        const distance = this.getDistance(
            attacker.position.row, attacker.position.col,
            targetRow, targetCol
        );

        if (distance > attacker.attackRange) {
            return { success: false, reason: 'Out of range' };
        }

        // Calculate damage
        const damage = this.calculateDamage(attacker, target, distance);
        const actualDamage = target.takeDamage(damage.total);

        attacker.hasActedThisTurn = true;

        this.addLog(`${attacker.name} attacks ${target.name} for ${actualDamage} damage!`);

        const result = {
            success: true,
            attacker: attacker.id,
            target: target.id,
            damage: actualDamage,
            isCrit: damage.isCrit,
            distanceBonus: damage.distanceBonus,
            targetKilled: target.isDead
        };

        // Check for death
        if (target.isDead) {
            this.handleUnitDeath(target);
        }

        return result;
    }

    /**
     * Calculate damage with distance modifiers
     */
    calculateDamage(attacker, target, distance) {
        let baseDamage = attacker.getEffectiveStat('atk');
        let distanceBonus = 0;

        // Distance bonuses based on attack type
        if (attacker.attackType === 'melee') {
            if (distance === 1) {
                distanceBonus = GRID_CONSTANTS.DISTANCE_BONUS.MELEE_CLOSE;
            } else if (distance > 2) {
                distanceBonus = GRID_CONSTANTS.DISTANCE_BONUS.SUBOPTIMAL_PENALTY;
            }
        } else if (attacker.attackType === 'ranged') {
            if (distance >= 4) {
                distanceBonus = GRID_CONSTANTS.DISTANCE_BONUS.RANGED_FAR;
            } else if (distance === 1) {
                distanceBonus = GRID_CONSTANTS.DISTANCE_BONUS.SUBOPTIMAL_PENALTY;
            }
        } else if (attacker.attackType === 'magic') {
            // Magic has optimal mid-range
            if (distance >= 2 && distance <= 4) {
                distanceBonus = GRID_CONSTANTS.DISTANCE_BONUS.OPTIMAL_BONUS;
            }
        }

        // Apply distance bonus
        baseDamage = Math.floor(baseDamage * (1 + distanceBonus));

        // Crit check (Fibonacci-based)
        const critChance = Math.min(0.34, attacker.getEffectiveStat('lck') / 100);
        const isCrit = Math.random() < critChance;
        if (isCrit) {
            baseDamage = Math.floor(baseDamage * 1.618); // Golden ratio crit multiplier
        }

        // Apply target's cover bonus
        const targetCell = this.getCell(target.position.row, target.position.col);
        if (targetCell.terrain.defenseBonus) {
            baseDamage = Math.floor(baseDamage * (1 - targetCell.terrain.defenseBonus));
        }

        return {
            base: attacker.atk,
            distanceBonus,
            total: baseDamage,
            isCrit
        };
    }

    /**
     * Handle unit death
     */
    handleUnitDeath(unit) {
        unit.isAlive = false;
        this.addLog(`${unit.name} has fallen!`);

        // Remove from turn order
        this.turnOrder = this.turnOrder.filter(u => u.id !== unit.id);

        // Check win/lose conditions
        return this.checkBattleEnd();
    }

    /**
     * Check if battle has ended
     */
    checkBattleEnd() {
        // Player death = game over
        const player = this.playerTeam.find(u => u.type === 'player');
        if (player && !player.isAlive) {
            return { ended: true, result: 'defeat', reason: 'Player died' };
        }

        // All enemies dead = victory
        const aliveEnemies = this.enemyTeam.filter(u => u.isAlive);
        if (aliveEnemies.length === 0) {
            return { ended: true, result: 'victory', reason: 'All enemies defeated' };
        }

        // All player units dead = defeat
        const alivePlayerUnits = this.playerTeam.filter(u => u.isAlive);
        if (alivePlayerUnits.length === 0) {
            return { ended: true, result: 'defeat', reason: 'Party wiped' };
        }

        return { ended: false };
    }

    /**
     * Initialize turn order based on SPD
     */
    initializeTurnOrder() {
        const allUnits = [...this.playerTeam, ...this.enemyTeam].filter(u => u.isAlive);

        // Sort by SPD (highest first), with random tiebreaker
        this.turnOrder = allUnits.sort((a, b) => {
            const spdDiff = b.getEffectiveStat('spd') - a.getEffectiveStat('spd');
            if (spdDiff !== 0) return spdDiff;
            return Math.random() - 0.5;
        });

        this.currentTurnIndex = 0;
        this.turnNumber = 1;
        this.addLog(`Battle start! Turn order: ${this.turnOrder.map(u => u.name).join(', ')}`);
    }

    /**
     * Get current unit's turn
     */
    getCurrentUnit() {
        if (this.turnOrder.length === 0) return null;
        return this.turnOrder[this.currentTurnIndex];
    }

    /**
     * Advance to next turn
     */
    nextTurn() {
        const currentUnit = this.getCurrentUnit();
        if (currentUnit) {
            currentUnit.processStatusEffects();
        }

        this.currentTurnIndex++;

        // Wrap around and increment turn number
        if (this.currentTurnIndex >= this.turnOrder.length) {
            this.currentTurnIndex = 0;
            this.turnNumber++;

            // Reset all units for new round
            this.turnOrder.forEach(unit => unit.resetTurn());
            this.addLog(`--- Turn ${this.turnNumber} ---`);
        }

        // Skip dead units
        while (this.getCurrentUnit() && !this.getCurrentUnit().isAlive) {
            this.currentTurnIndex++;
            if (this.currentTurnIndex >= this.turnOrder.length) {
                this.currentTurnIndex = 0;
                this.turnNumber++;
            }
        }

        return this.getCurrentUnit();
    }

    /**
     * End current unit's turn
     */
    endCurrentTurn() {
        const unit = this.getCurrentUnit();
        if (unit) {
            unit.hasMovedThisTurn = true;
            unit.hasActedThisTurn = true;
        }
        return this.nextTurn();
    }

    /**
     * Highlight cells for movement
     */
    highlightMovement(unit) {
        this.clearAllHighlights();

        if (!unit.canMove()) return [];

        const movableCells = this.getMovementRange(unit);
        movableCells.forEach(({ row, col }) => {
            const cell = this.getCell(row, col);
            if (cell) {
                cell.setHighlight('move');
            }
        });

        return movableCells;
    }

    /**
     * Highlight cells for attack
     */
    highlightAttack(unit) {
        this.clearAllHighlights();

        if (!unit.canAct()) return [];

        const attackableCells = this.getAttackRange(unit);
        attackableCells.forEach(({ row, col, hasEnemy }) => {
            const cell = this.getCell(row, col);
            if (cell) {
                cell.setHighlight(hasEnemy ? 'attack' : 'range');
            }
        });

        return attackableCells;
    }

    /**
     * Clear all cell highlights
     */
    clearAllHighlights() {
        for (let row = 0; row < GRID_CONSTANTS.GRID_SIZE; row++) {
            for (let col = 0; col < GRID_CONSTANTS.GRID_SIZE; col++) {
                this.cells[row][col].clearHighlight();
            }
        }
    }

    /**
     * Add to battle log
     */
    addLog(message) {
        this.battleLog.push({
            turn: this.turnNumber,
            timestamp: Date.now(),
            message
        });

        // Keep log size manageable
        if (this.battleLog.length > 100) {
            this.battleLog.shift();
        }
    }

    /**
     * Get recent log entries
     */
    getRecentLog(count = 5) {
        return this.battleLog.slice(-count);
    }

    /**
     * Setup battle with player party and enemies
     */
    setupBattle(playerParty, enemyParty) {
        this.initializeGrid();
        this.units.clear();
        this.playerTeam = [];
        this.enemyTeam = [];
        this.battleLog = [];

        // Place player units (bottom zone, rows 6-8)
        this.placePlayerParty(playerParty);

        // Place enemy units (top zone, rows 0-2)
        this.placeEnemyParty(enemyParty);

        // Initialize turn order
        this.initializeTurnOrder();

        return this;
    }

    /**
     * Place player's party on grid
     */
    placePlayerParty(party) {
        // Player in center of back row
        if (party.player) {
            this.addUnit(new BattleUnit({
                ...party.player,
                id: 'player',
                type: 'player',
                team: 'player'
            }), 8, 4);
        }

        // Creatures spread in front (row 7)
        const creaturePositions = [[7, 2], [7, 4], [7, 6]];
        (party.creatures || []).forEach((creature, i) => {
            if (i < 3 && creature) {
                const [row, col] = creaturePositions[i];
                this.addUnit(new BattleUnit({
                    ...creature,
                    id: `creature_${i}`,
                    type: 'creature',
                    team: 'player'
                }), row, col);
            }
        });

        // Allies on flanks (row 8)
        const allyPositions = [[8, 1], [8, 7], [7, 0]];
        (party.allies || []).forEach((ally, i) => {
            if (i < 3 && ally) {
                const [row, col] = allyPositions[i];
                this.addUnit(new BattleUnit({
                    ...ally,
                    id: `ally_${i}`,
                    type: 'ally',
                    team: 'player'
                }), row, col);
            }
        });
    }

    /**
     * Place enemy party on grid
     */
    placeEnemyParty(party) {
        // Boss in center of back row
        if (party.boss) {
            this.addUnit(new BattleUnit({
                ...party.boss,
                id: 'boss',
                type: 'boss',
                team: 'enemy'
            }), 0, 4);
        }

        // Minions spread in front (rows 1-2)
        const minionPositions = [[1, 2], [1, 4], [1, 6], [2, 3], [2, 5], [2, 1]];
        (party.minions || []).forEach((minion, i) => {
            if (i < 6 && minion) {
                const [row, col] = minionPositions[i];
                this.addUnit(new BattleUnit({
                    ...minion,
                    id: `minion_${i}`,
                    type: 'minion',
                    team: 'enemy'
                }), row, col);
            }
        });
    }

    /**
     * Serialize grid state for saving
     */
    serialize() {
        return {
            cells: this.cells.map(row =>
                row.map(cell => ({
                    terrain: cell.terrain.id,
                    effects: cell.effects,
                    unitId: cell.unit?.id || null
                }))
            ),
            units: Array.from(this.units.entries()).map(([id, unit]) => ({
                id,
                hp: unit.hp,
                position: unit.position,
                hasMovedThisTurn: unit.hasMovedThisTurn,
                hasActedThisTurn: unit.hasActedThisTurn,
                statusEffects: unit.statusEffects,
                isAlive: unit.isAlive
            })),
            turnOrder: this.turnOrder.map(u => u.id),
            currentTurnIndex: this.currentTurnIndex,
            turnNumber: this.turnNumber,
            battleLog: this.battleLog.slice(-20)
        };
    }

    /**
     * Get grid state for rendering
     */
    getGridState() {
        return {
            cells: this.cells.map(row =>
                row.map(cell => ({
                    row: cell.row,
                    col: cell.col,
                    zone: cell.zone,
                    terrain: cell.terrain,
                    unit: cell.unit ? {
                        id: cell.unit.id,
                        name: cell.unit.name,
                        type: cell.unit.type,
                        team: cell.unit.team,
                        hp: cell.unit.hp,
                        maxHp: cell.unit.maxHp,
                        icon: cell.unit.icon,
                        color: cell.unit.color,
                        isAlive: cell.unit.isAlive
                    } : null,
                    highlighted: cell.highlighted,
                    highlightType: cell.highlightType,
                    effects: cell.effects
                }))
            ),
            currentUnit: this.getCurrentUnit()?.id,
            turnNumber: this.turnNumber,
            playerTeamAlive: this.playerTeam.filter(u => u.isAlive).length,
            enemyTeamAlive: this.enemyTeam.filter(u => u.isAlive).length
        };
    }
}

// ============================================================
// BATTLE GRID UI RENDERER
// ============================================================

class BattleGridRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.grid = null;
        this.cellSize = GRID_CONSTANTS.CELL_SIZE.DESKTOP;
        this.selectedUnit = null;

        this.updateCellSize();
        window.addEventListener('resize', () => this.updateCellSize());
    }

    /**
     * Update cell size based on viewport
     */
    updateCellSize() {
        const width = window.innerWidth;
        if (width < 480) {
            this.cellSize = GRID_CONSTANTS.CELL_SIZE.MOBILE;
        } else if (width < 768) {
            this.cellSize = GRID_CONSTANTS.CELL_SIZE.TABLET;
        } else {
            this.cellSize = GRID_CONSTANTS.CELL_SIZE.DESKTOP;
        }
    }

    /**
     * Bind grid to renderer
     */
    setGrid(grid) {
        this.grid = grid;
    }

    /**
     * Render the entire grid
     */
    render() {
        if (!this.container || !this.grid) return;

        const gridState = this.grid.getGridState();
        const gridSize = this.cellSize * GRID_CONSTANTS.GRID_SIZE;

        this.container.innerHTML = `
            <div class="battle-grid-container" style="width: ${gridSize}px;">
                <div class="battle-grid" style="
                    display: grid;
                    grid-template-columns: repeat(${GRID_CONSTANTS.GRID_SIZE}, ${this.cellSize}px);
                    grid-template-rows: repeat(${GRID_CONSTANTS.GRID_SIZE}, ${this.cellSize}px);
                    gap: 1px;
                    background: var(--color-border, #333);
                    border: 2px solid var(--color-border, #333);
                    border-radius: 4px;
                ">
                    ${this.renderCells(gridState.cells)}
                </div>
            </div>
        `;

        this.attachCellListeners();
    }

    /**
     * Render all cells
     */
    renderCells(cells) {
        return cells.flat().map(cell => this.renderCell(cell)).join('');
    }

    /**
     * Render a single cell (XSS-safe)
     */
    renderCell(cell) {
        const zoneColors = {
            enemy: 'rgba(239, 68, 68, 0.2)',
            neutral: 'rgba(156, 163, 175, 0.1)',
            player: 'rgba(34, 197, 94, 0.2)'
        };

        const highlightColors = {
            move: 'rgba(59, 130, 246, 0.4)',
            attack: 'rgba(239, 68, 68, 0.4)',
            range: 'rgba(234, 179, 8, 0.3)',
            ability: 'rgba(168, 85, 247, 0.4)'
        };

        let bgColor = zoneColors[cell.zone];
        if (cell.highlighted && cell.highlightType) {
            bgColor = highlightColors[cell.highlightType];
        }

        // Validate and sanitize unit data
        const safeTeam = cell.unit?.team === 'player' ? 'player' : 'enemy';
        const safeIcon = cell.unit ? escapeHtml(cell.unit.icon) : '';
        const safeHp = cell.unit ? Math.max(0, parseInt(cell.unit.hp, 10) || 0) : 0;
        const safeMaxHp = cell.unit ? Math.max(1, parseInt(cell.unit.maxHp, 10) || 1) : 1;

        const unitDisplay = cell.unit ? `
            <div class="grid-unit ${safeTeam}" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: ${this.cellSize * 0.6}px;
                opacity: ${cell.unit.isAlive ? 1 : 0.3};
            ">
                ${safeIcon}
            </div>
            <div class="unit-hp" style="
                position: absolute;
                bottom: 2px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 8px;
                color: ${safeTeam === 'player' ? '#22c55e' : '#ef4444'};
            ">
                ${safeHp}/${safeMaxHp}
            </div>
        ` : '';

        // Sanitize cell data
        const safeRow = Math.max(0, Math.min(8, parseInt(cell.row, 10) || 0));
        const safeCol = Math.max(0, Math.min(8, parseInt(cell.col, 10) || 0));
        const safeZone = ['enemy', 'neutral', 'player'].includes(cell.zone) ? cell.zone : 'neutral';

        return `
            <div
                class="grid-cell"
                data-row="${safeRow}"
                data-col="${safeCol}"
                data-zone="${safeZone}"
                style="
                    width: ${this.cellSize}px;
                    height: ${this.cellSize}px;
                    background: ${bgColor};
                    position: relative;
                    cursor: ${cell.highlighted ? 'pointer' : 'default'};
                    transition: background 0.2s;
                "
            >
                ${unitDisplay}
            </div>
        `;
    }

    /**
     * Attach click listeners to cells
     */
    attachCellListeners() {
        const cells = this.container.querySelectorAll('.grid-cell');

        cells.forEach(cellEl => {
            cellEl.addEventListener('click', (e) => {
                const row = parseInt(e.currentTarget.dataset.row);
                const col = parseInt(e.currentTarget.dataset.col);
                this.onCellClick(row, col);
            });
        });
    }

    /**
     * Handle cell click
     */
    onCellClick(row, col) {
        if (!this.grid) return;

        const cell = this.grid.getCell(row, col);
        if (!cell) return;

        // Emit event for game logic to handle
        const event = new CustomEvent('gridCellClick', {
            detail: { row, col, cell, unit: cell.unit }
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Render turn info bar (XSS-safe)
     */
    renderTurnInfo() {
        if (!this.grid) return '';

        const current = this.grid.getCurrentUnit();
        const state = this.grid.getGridState();

        // Sanitize values
        const safeTurnNumber = Math.max(1, parseInt(state.turnNumber, 10) || 1);
        const safeIcon = current ? escapeHtml(current.icon) : '';
        const safeName = current ? escapeHtml(current.name) : '';
        const safePlayerAlive = Math.max(0, parseInt(state.playerTeamAlive, 10) || 0);
        const safeEnemyAlive = Math.max(0, parseInt(state.enemyTeamAlive, 10) || 0);

        return `
            <div class="turn-info" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: var(--color-bg-secondary, #1a1a2e);
                border-radius: 4px;
                margin-bottom: 8px;
            ">
                <div class="turn-number">Tour ${safeTurnNumber}</div>
                <div class="current-unit">
                    ${current ? `${safeIcon} ${safeName}'s turn` : 'Battle Start'}
                </div>
                <div class="team-status">
                    🟢 ${safePlayerAlive} | 🔴 ${safeEnemyAlive}
                </div>
            </div>
        `;
    }

    /**
     * Render unit info panel (XSS-safe)
     */
    renderUnitInfo(unit) {
        if (!unit) return '';

        // Sanitize all unit values
        const safeHp = Math.max(0, parseInt(unit.hp, 10) || 0);
        const safeMaxHp = Math.max(1, parseInt(unit.maxHp, 10) || 1);
        const hpPercent = Math.min(100, (safeHp / safeMaxHp) * 100);
        const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#eab308' : '#ef4444';

        const safeIcon = escapeHtml(unit.icon);
        const safeName = escapeHtml(unit.name);
        const safeType = escapeHtml(String(unit.type || 'unknown').toUpperCase());
        const safeAtk = Math.max(0, parseInt(unit.atk, 10) || 0);
        const safeDef = Math.max(0, parseInt(unit.def, 10) || 0);
        const safeSpd = Math.max(0, parseInt(unit.spd, 10) || 0);
        const safeLck = Math.max(0, parseInt(unit.lck, 10) || 0);

        return `
            <div class="unit-info" style="
                padding: 8px;
                background: var(--color-bg-secondary, #1a1a2e);
                border-radius: 4px;
                margin-top: 8px;
            ">
                <div class="unit-header" style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 24px;">${safeIcon}</span>
                    <div>
                        <div style="font-weight: bold;">${safeName}</div>
                        <div style="font-size: 12px; color: var(--color-text-secondary, #888);">
                            ${safeType}
                        </div>
                    </div>
                </div>
                <div class="unit-hp-bar" style="
                    margin-top: 8px;
                    background: #333;
                    border-radius: 2px;
                    height: 8px;
                    overflow: hidden;
                ">
                    <div style="
                        width: ${hpPercent}%;
                        height: 100%;
                        background: ${hpColor};
                        transition: width 0.3s;
                    "></div>
                </div>
                <div style="font-size: 12px; text-align: center; margin-top: 4px;">
                    ${safeHp} / ${safeMaxHp} HP
                </div>
                <div class="unit-stats" style="
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 4px;
                    margin-top: 8px;
                    font-size: 11px;
                ">
                    <div>ATK: ${safeAtk}</div>
                    <div>DEF: ${safeDef}</div>
                    <div>SPD: ${safeSpd}</div>
                    <div>LCK: ${safeLck}</div>
                </div>
                <div class="unit-actions" style="
                    display: flex;
                    gap: 4px;
                    margin-top: 8px;
                ">
                    <button
                        class="btn-action move-btn"
                        ${!unit.canMove() ? 'disabled' : ''}
                        style="flex: 1; padding: 4px; font-size: 11px;"
                    >
                        Move${unit.hasMovedThisTurn ? ' ✓' : ''}
                    </button>
                    <button
                        class="btn-action attack-btn"
                        ${!unit.canAct() ? 'disabled' : ''}
                        style="flex: 1; padding: 4px; font-size: 11px;"
                    >
                        Attack${unit.hasActedThisTurn ? ' ✓' : ''}
                    </button>
                    <button
                        class="btn-action end-btn"
                        style="flex: 1; padding: 4px; font-size: 11px;"
                    >
                        End
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render battle log (XSS-safe)
     */
    renderBattleLog() {
        if (!this.grid) return '';

        const logs = this.grid.getRecentLog(3);

        return `
            <div class="battle-log" style="
                margin-top: 8px;
                padding: 4px 8px;
                background: var(--color-bg-tertiary, #0d0d1a);
                border-radius: 4px;
                font-size: 11px;
                max-height: 60px;
                overflow-y: auto;
            ">
                ${logs.map(log => `<div style="opacity: 0.8;">${escapeHtml(log.message)}</div>`).join('')}
            </div>
        `;
    }
}

// ============================================================
// EXPORTS
// ============================================================

export {
    GRID_CONSTANTS,
    GridCell,
    BattleUnit,
    BattleGrid,
    BattleGridRenderer
};

// Factory function
export function createBattleGrid() {
    return new BattleGrid();
}

export function createBattleGridRenderer(containerId) {
    return new BattleGridRenderer(containerId);
}

// ============================================================
// GLOBAL EXPORTS (legacy compatibility)
// ============================================================

window.PumpArenaBattleGrid = {
    GRID_CONSTANTS,
    GridCell,
    BattleUnit,
    BattleGrid,
    BattleGridRenderer,
    createBattleGrid,
    createBattleGridRenderer
};
