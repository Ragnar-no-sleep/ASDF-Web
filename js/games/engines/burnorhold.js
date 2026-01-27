/**
 * ASDF Games - BurnOrHold (Chain Conquest) Engine
 *
 * Real-time chaos strategy game
 * Capture nodes by sending validators
 * Conquer all enemy nodes to win each wave
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const BurnOrHold = {
    version: '1.2.0', // Network viz + capture FX + AI difficulty + power-ups
    gameId: 'burnorhold',
    canvas: null,
    ctx: null,
    state: null,
    timing: null,
    juice: null,
    startTime: null,

    OWNER: { NEUTRAL: 0, PLAYER: 1, ENEMY: 2 },
    CHAIN_NAMES: ['ETH', 'SOL', 'AVAX', 'MATIC', 'BNB', 'ARB', 'OP', 'BASE', 'FTM', 'ATOM'],
    CHAIN_COLORS: null,

    // AI difficulty modes
    AI_MODES: {
        easy: { attackInterval: 2000, aggression: 0.5, priority: 0.6, maxSimultaneous: 1 },
        medium: { attackInterval: 1500, aggression: 0.7, priority: 0.8, maxSimultaneous: 2 },
        hard: { attackInterval: 1000, aggression: 0.9, priority: 0.9, maxSimultaneous: 3 },
    },

    // Power-up types
    POWER_UPS: {
        shield: { icon: '🛡️', name: 'SHIELD', color: '#3b82f6', duration: 300, desc: 'Block next attack' },
        blitz: { icon: '⚡', name: 'BLITZ', color: '#fbbf24', duration: 240, desc: 'Fast attacks' },
        reinforce: { icon: '🔥', name: 'REINFORCE', color: '#ef4444', duration: 0, desc: '+10 validators' },
        expand: { icon: '🌐', name: 'EXPAND', color: '#8b5cf6', duration: 0, desc: 'Capture neutral' },
    },

    /**
     * Preload sprites for performance
     */
    preloadSprites() {
        const sprites = [
            // Power-ups
            { emoji: '🛡️', size: 20 },
            { emoji: '⚡', size: 20 },
            { emoji: '🔥', size: 20 },
            { emoji: '🌐', size: 20 },
            // Node indicators
            { emoji: '👤', size: 14 },
            { emoji: '👹', size: 14 },
        ];
        SpriteCache.preload(sprites);
    },

    /**
     * Start the game
     */
    start(gameId) {
        this.gameId = gameId;
        const arena = document.getElementById(`arena-${gameId}`);
        if (!arena) return;

        this.CHAIN_COLORS = {
            [this.OWNER.NEUTRAL]: { bg: '#3a3a4a', border: '#555', text: '#888' },
            [this.OWNER.PLAYER]: { bg: '#1a4a2e', border: '#22c55e', text: '#4ade80' },
            [this.OWNER.ENEMY]: { bg: '#4a1a1a', border: '#ef4444', text: '#f87171' },
        };

        this.state = {
            score: 0,
            wave: 1,
            gameOver: false,
            waveTransitioning: false,
            nodes: [],
            selectedNode: null,
            attacks: [],
            effects: [],
            particles: [],
            nodeRadius: 34,       // fib[8]
            lastAIAttack: 0,
            aiAttackInterval: 1300, // fib[6] * 100
            lastRegen: 0,
            regenInterval: 1000,
            playerCooldown: 0,
            attackCooldown: 144,    // fib[11] (approx)
            regenAmount: 2,
            // AI difficulty
            aiDifficulty: 'easy',
            // Network visualization
            dataFlows: [],        // Animated data packets
            connectionPulse: 0,   // Pulse animation timer
            // Power-ups
            powerUps: [],         // Active power-up pickups
            activePowerUps: [],   // Player's active effects
            lastPowerUpSpawn: 0,
            powerUpSpawnInterval: 8000,
            // Capture animation
            captureAnimations: [], // Fire spread effects
            // Victory celebration
            victoryParticles: [],
            frameCount: 0,
        };

        this.createArena(arena);
        this.canvas = document.getElementById('cc-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startTime = Date.now();

        // Initialize timing for frame-independent movement
        this.timing = GameTiming.create();

        this.resizeCanvas();
        this.preloadSprites();
        this.setupInput();
        this.generateNodes();
        this.updateUI();
        this.showBanner('CHAIN CONQUEST', 'Conquer all nodes!');
        this.gameLoop();

        if (typeof activeGames !== 'undefined') {
            activeGames[gameId] = {
                cleanup: () => this.stop()
            };
        }
    },

    /**
     * Create arena HTML
     */
    createArena(arena) {
        arena.innerHTML = `
            <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a1a2e 100%);">
                <canvas id="cc-canvas" style="width:100%;height:100%;"></canvas>
                <div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;pointer-events:none;">
                    <div style="display:flex;gap:10px;">
                        <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;border:2px solid var(--green);">
                            <div style="color:var(--green);font-size:11px;">&#9876; YOUR NODES</div>
                            <div style="color:var(--green);font-size:18px;font-weight:bold;" id="cc-player-nodes">0</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;border:2px solid var(--accent-fire);">
                            <div style="color:var(--accent-fire);font-size:11px;">&#128121; ENEMY</div>
                            <div style="color:var(--accent-fire);font-size:18px;font-weight:bold;" id="cc-enemy-nodes">0</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;">
                            <div style="color:var(--gold);font-size:11px;">&#127919; SCORE</div>
                            <div style="color:var(--gold);font-size:18px;font-weight:bold;" id="cc-score">0</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;">
                            <div style="color:var(--purple);font-size:11px;">&#127754; WAVE</div>
                            <div style="color:var(--purple);font-size:18px;font-weight:bold;" id="cc-wave">1</div>
                        </div>
                    </div>
                    <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;">
                        <div style="color:var(--cyan);font-size:11px;">&#9202; TIME</div>
                        <div style="color:var(--cyan);font-size:18px;font-weight:bold;" id="cc-time">0:00</div>
                    </div>
                </div>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">
                    <div id="cc-banner" style="background:linear-gradient(90deg,transparent,rgba(0,0,0,0.9),transparent);padding:15px 60px;text-align:center;opacity:0;transition:opacity 0.3s;">
                        <div id="cc-banner-text" style="color:var(--gold);font-size:24px;font-weight:bold;text-transform:uppercase;letter-spacing:3px;"></div>
                        <div id="cc-banner-hint" style="color:var(--text-muted);font-size:12px;margin-top:5px;"></div>
                    </div>
                </div>
                <div style="position:absolute;bottom:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:flex-end;">
                    <div style="background:rgba(0,0,0,0.8);padding:10px 15px;border-radius:8px;max-width:320px;">
                        <div style="color:#ccc;font-size:11px;line-height:1.4;">&#128293; CHAOS WARFARE &#128293;<br>Click node &#8594; Click enemy = ATTACK!<br>SPAM CLICKS! Conquer or be conquered!</div>
                    </div>
                    <div style="pointer-events:auto;">
                        <button id="cc-next-wave" style="display:none;background:linear-gradient(135deg,#22c55e,#16a34a);border:2px solid #4ade80;color:#fff;padding:12px 30px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;box-shadow:0 0 20px rgba(34,197,94,0.5);">&#128640; NEXT WAVE &#8594;</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Resize canvas
     */
    resizeCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    },

    /**
     * Generate node positions
     */
    generateNodes() {
        this.state.nodes = [];
        const nodeCount = Math.min(10 + this.state.wave * 2, 18);
        const padding = 80;
        const usableWidth = this.canvas.width - padding * 2;
        const usableHeight = this.canvas.height - padding * 2 - 60;
        const cols = Math.ceil(Math.sqrt(nodeCount * 1.5));
        const rows = Math.ceil(nodeCount / cols);
        const cellW = usableWidth / cols;
        const cellH = usableHeight / rows;

        let id = 0;
        for (let row = 0; row < rows && this.state.nodes.length < nodeCount; row++) {
            for (let col = 0; col < cols && this.state.nodes.length < nodeCount; col++) {
                const offsetX = (row % 2) * (cellW / 2);
                const jitterX = (Math.random() - 0.5) * cellW * 0.3;
                const jitterY = (Math.random() - 0.5) * cellH * 0.3;
                this.state.nodes.push({
                    id: id++,
                    x: padding + col * cellW + cellW / 2 + offsetX + jitterX,
                    y: padding + 50 + row * cellH + cellH / 2 + jitterY,
                    name: this.CHAIN_NAMES[id % this.CHAIN_NAMES.length],
                    owner: this.OWNER.NEUTRAL,
                    validators: 5 + Math.floor(Math.random() * 5),
                    maxValidators: 20 + this.state.wave * 5,
                    connections: [],
                });
            }
        }

        // Create connections
        for (let i = 0; i < this.state.nodes.length; i++) {
            for (let j = i + 1; j < this.state.nodes.length; j++) {
                const dx = this.state.nodes[i].x - this.state.nodes[j].x;
                const dy = this.state.nodes[i].y - this.state.nodes[j].y;
                if (Math.sqrt(dx * dx + dy * dy) < cellW * 1.3 + cellH * 0.5) {
                    this.state.nodes[i].connections.push(j);
                    this.state.nodes[j].connections.push(i);
                }
            }
        }

        // Ensure all nodes connected
        for (const node of this.state.nodes) {
            if (node.connections.length === 0) {
                let nearest = null, minDist = Infinity;
                for (const other of this.state.nodes) {
                    if (other.id === node.id) continue;
                    const d = Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2);
                    if (d < minDist) {
                        minDist = d;
                        nearest = other;
                    }
                }
                if (nearest) {
                    node.connections.push(nearest.id);
                    nearest.connections.push(node.id);
                }
            }
        }

        // Assign territories
        const leftNodes = [...this.state.nodes].sort((a, b) => a.x - b.x);
        const rightNodes = [...this.state.nodes].sort((a, b) => b.x - a.x);

        const playerCount = this.state.wave >= 3 ? 3 : 2;
        for (let i = 0; i < playerCount && i < leftNodes.length; i++) {
            leftNodes[i].owner = this.OWNER.PLAYER;
            leftNodes[i].validators = 12 + this.state.wave * 2;
        }

        const enemyCount = Math.min(2 + Math.floor(this.state.wave / 2), 4);
        for (let i = 0; i < enemyCount && i < rightNodes.length; i++) {
            if (rightNodes[i].owner === this.OWNER.NEUTRAL) {
                rightNodes[i].owner = this.OWNER.ENEMY;
                rightNodes[i].validators = 12 + this.state.wave * 3;
            }
        }
    },

    /**
     * Update UI elements
     */
    updateUI() {
        const playerNodes = this.state.nodes.filter(n => n.owner === this.OWNER.PLAYER).length;
        const enemyNodes = this.state.nodes.filter(n => n.owner === this.OWNER.ENEMY).length;
        document.getElementById('cc-player-nodes').textContent = playerNodes;
        document.getElementById('cc-enemy-nodes').textContent = enemyNodes;
        document.getElementById('cc-score').textContent = this.state.score;
        document.getElementById('cc-wave').textContent = this.state.wave;
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        document.getElementById('cc-time').textContent = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
        updateScore(this.gameId, this.state.score);
    },

    /**
     * Show banner message
     */
    showBanner(text, hint) {
        const banner = document.getElementById('cc-banner');
        document.getElementById('cc-banner-text').textContent = text;
        document.getElementById('cc-banner-hint').textContent = hint;
        banner.style.opacity = '1';
        setTimeout(() => (banner.style.opacity = '0'), 1500);
    },

    /**
     * Add effect
     */
    addEffect(x, y, text, color, life = 40) {
        this.state.effects.push({ x, y, text, color, life, maxLife: life, vy: -1 });
    },

    /**
     * Add particles
     */
    addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            this.state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30,
                color,
            });
        }
    },

    /**
     * Spawn a power-up
     */
    spawnPowerUp() {
        const types = Object.keys(this.POWER_UPS);
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = this.POWER_UPS[type];

        // Spawn near neutral nodes or random position
        const neutralNodes = this.state.nodes.filter(n => n.owner === this.OWNER.NEUTRAL);
        let x, y;
        if (neutralNodes.length > 0 && Math.random() < 0.7) {
            const node = neutralNodes[Math.floor(Math.random() * neutralNodes.length)];
            x = node.x + (Math.random() - 0.5) * 60;
            y = node.y + (Math.random() - 0.5) * 60;
        } else {
            x = 100 + Math.random() * (this.canvas.width - 200);
            y = 100 + Math.random() * (this.canvas.height - 200);
        }

        this.state.powerUps.push({
            x, y,
            type,
            ...powerUp,
            pulse: 0,
            life: 600, // 10 seconds at 60fps
        });
    },

    /**
     * Collect power-up
     */
    collectPowerUp(powerUp) {
        const type = powerUp.type;
        const config = this.POWER_UPS[type];

        this.addEffect(powerUp.x, powerUp.y, config.icon + ' ' + config.name, config.color, 60);
        this.addParticles(powerUp.x, powerUp.y, config.color, 15);

        if (type === 'reinforce') {
            // Instant: Add validators to all player nodes
            this.state.nodes.forEach(n => {
                if (n.owner === this.OWNER.PLAYER) {
                    n.validators = Math.min(n.maxValidators, n.validators + 10);
                }
            });
            this.state.score += 50;
        } else if (type === 'expand') {
            // Instant: Capture nearest neutral
            const neutralNodes = this.state.nodes.filter(n => n.owner === this.OWNER.NEUTRAL);
            if (neutralNodes.length > 0) {
                const nearest = neutralNodes.reduce((a, b) => {
                    const da = Math.sqrt((a.x - powerUp.x) ** 2 + (a.y - powerUp.y) ** 2);
                    const db = Math.sqrt((b.x - powerUp.x) ** 2 + (b.y - powerUp.y) ** 2);
                    return da < db ? a : b;
                });
                nearest.owner = this.OWNER.PLAYER;
                nearest.validators = 8;
                this.startCaptureAnimation(nearest);
                this.state.score += 100;
            }
        } else {
            // Duration power-up
            this.state.activePowerUps.push({
                type,
                remaining: config.duration,
                ...config,
            });
        }
    },

    /**
     * Start capture animation (fire spread)
     */
    startCaptureAnimation(node) {
        const isPlayer = node.owner === this.OWNER.PLAYER;
        const color = isPlayer ? '#22c55e' : '#ef4444';

        // Ring expansion effect
        this.state.captureAnimations.push({
            x: node.x,
            y: node.y,
            radius: this.state.nodeRadius,
            maxRadius: this.state.nodeRadius * 3,
            color,
            alpha: 1,
            isPlayer,
        });

        // Fire particles spreading out
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            this.state.particles.push({
                x: node.x,
                y: node.y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                life: 40,
                color,
                size: 4 + Math.random() * 3,
            });
        }
    },

    /**
     * Spawn data flow packet
     */
    spawnDataFlow(fromNode, toNode) {
        if (fromNode.owner === this.OWNER.NEUTRAL || toNode.owner === this.OWNER.NEUTRAL) return;
        if (fromNode.owner !== toNode.owner) return;

        this.state.dataFlows.push({
            x: fromNode.x,
            y: fromNode.y,
            targetX: toNode.x,
            targetY: toNode.y,
            progress: 0,
            color: this.CHAIN_COLORS[fromNode.owner].border,
        });
    },

    /**
     * Get node at position
     */
    getNodeAt(x, y) {
        for (const node of this.state.nodes) {
            if (Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2) < this.state.nodeRadius) return node;
        }
        return null;
    },

    /**
     * Check if nodes are connected
     */
    areConnected(node1, node2) {
        return node1.connections.includes(node2.id);
    },

    /**
     * Launch attack
     */
    launchAttack(attacker, defender, isPlayer) {
        const power = Math.min(attacker.validators - 1, Math.floor(attacker.validators * 0.5));
        if (power < 1) return false;
        attacker.validators -= power;
        this.state.attacks.push({
            x: attacker.x,
            y: attacker.y,
            targetX: defender.x,
            targetY: defender.y,
            attacker,
            defender,
            power,
            isPlayer,
            speed: 8 + this.state.wave * 2,
        });
        this.addParticles(attacker.x, attacker.y, isPlayer ? '#22c55e' : '#ef4444', 8);
        return true;
    },

    /**
     * Resolve attack
     */
    resolveAttack(attack) {
        const { defender, power, isPlayer } = attack;
        let defenderPower = defender.validators;

        // Check for shield power-up
        if (isPlayer === false) {
            const shieldIdx = this.state.activePowerUps.findIndex(p => p.type === 'shield');
            if (shieldIdx >= 0 && defender.owner === this.OWNER.PLAYER) {
                // Shield absorbs one attack
                this.state.activePowerUps.splice(shieldIdx, 1);
                this.addEffect(defender.x, defender.y, '🛡️ BLOCKED!', '#3b82f6', 50);
                this.addParticles(defender.x, defender.y, '#3b82f6', 15);
                return;
            }
        }

        if (power > defenderPower) {
            const prevOwner = defender.owner;
            defender.owner = isPlayer ? this.OWNER.PLAYER : this.OWNER.ENEMY;
            defender.validators = Math.max(1, power - defenderPower);

            // Trigger capture animation
            this.startCaptureAnimation(defender);

            this.addEffect(defender.x, defender.y, 'CAPTURED!', isPlayer ? '#22c55e' : '#ef4444', 50);
            if (isPlayer && prevOwner === this.OWNER.ENEMY) {
                this.state.score += 150;
                this.addEffect(defender.x, defender.y - 30, '+150', '#fbbf24', 40);
            } else if (isPlayer) {
                this.state.score += 50;
                this.addEffect(defender.x, defender.y - 30, '+50', '#fbbf24', 40);
            }
        } else {
            defender.validators = Math.max(1, defenderPower - Math.floor(power * 0.7));
            this.addEffect(defender.x, defender.y, 'DEFENDED!', '#888', 40);
            this.addParticles(defender.x, defender.y, '#ff6b6b', 10);
        }
    },

    /**
     * AI attack logic with difficulty scaling
     */
    aiAttack() {
        const difficulty = this.AI_MODES[this.state.aiDifficulty];
        const enemyNodes = this.state.nodes.filter(n => n.owner === this.OWNER.ENEMY && n.validators > 3);
        if (enemyNodes.length === 0) return;

        // Decide if AI should attack (based on aggression)
        if (Math.random() > difficulty.aggression) return;

        const attackCount = Math.min(difficulty.maxSimultaneous, enemyNodes.length);

        for (let a = 0; a < attackCount; a++) {
            const availableAttackers = enemyNodes.filter(n => n.validators > 3);
            if (availableAttackers.length === 0) break;

            const attacker = availableAttackers[Math.floor(Math.random() * availableAttackers.length)];

            const targets = [];
            for (const connId of attacker.connections) {
                const target = this.state.nodes.find(n => n.id === connId);
                if (target.owner !== this.OWNER.ENEMY) {
                    // Strategic priority scoring
                    let priority = target.owner === this.OWNER.PLAYER ? 3 : 1;
                    // Prefer weaker targets
                    if (target.validators < attacker.validators * 0.5) priority += 2;
                    // Prefer connected to more enemy nodes (expansion)
                    const enemyConnections = target.connections.filter(id =>
                        this.state.nodes.find(n => n.id === id).owner === this.OWNER.ENEMY
                    ).length;
                    priority += enemyConnections * 0.5;
                    targets.push({ node: target, priority });
                }
            }

            if (targets.length === 0) continue;

            targets.sort((a, b) => b.priority - a.priority);
            // Smart targeting based on difficulty
            const target = Math.random() < difficulty.priority ? targets[0].node :
                targets[Math.floor(Math.random() * targets.length)].node;

            this.launchAttack(attacker, target, false);
        }
    },

    /**
     * Regenerate validators
     */
    regenerateValidators() {
        for (const node of this.state.nodes) {
            if (node.owner !== this.OWNER.NEUTRAL && node.validators < node.maxValidators) {
                const regen = node.owner === this.OWNER.PLAYER
                    ? this.state.regenAmount + Math.floor(this.state.wave / 2)
                    : Math.floor(this.state.regenAmount * 0.8) + Math.floor(this.state.wave / 3);
                node.validators = Math.min(node.maxValidators, node.validators + regen);
            }
        }
    },

    /**
     * Check win/lose conditions
     */
    checkWinLose() {
        if (this.state.waveTransitioning || this.state.gameOver) return;

        const playerNodes = this.state.nodes.filter(n => n.owner === this.OWNER.PLAYER).length;
        const enemyNodes = this.state.nodes.filter(n => n.owner === this.OWNER.ENEMY).length;

        if (enemyNodes === 0 && this.state.attacks.length === 0) {
            this.state.waveTransitioning = true;
            this.state.score += this.state.wave * 500;
            this.showBanner(`WAVE ${this.state.wave} COMPLETE!`, `+${this.state.wave * 500} bonus`);
            this.addEffect(this.canvas.width / 2, this.canvas.height / 2, `WAVE ${this.state.wave} COMPLETE!`, '#fbbf24', 100);

            const self = this;
            setTimeout(() => {
                self.state.wave++;
                self.state.aiAttackInterval = Math.max(800, 1500 - self.state.wave * 100);
                self.state.regenAmount = 2 + Math.floor(self.state.wave / 3);
                self.state.selectedNode = null;
                self.state.attacks = [];
                self.state.effects = [];
                self.state.particles = [];
                self.startTime = Date.now();
                self.generateNodes();
                self.state.waveTransitioning = false;
                self.showBanner('WAVE ' + self.state.wave, 'FIGHT!');
                self.gameLoop();
            }, 2500);
        } else if (playerNodes === 0) {
            this.state.gameOver = true;
            this.showBanner('GAME OVER', 'All nodes lost!');
            this.addEffect(this.canvas.width / 2, this.canvas.height / 2, 'GAME OVER', '#ef4444', 120);
            setTimeout(() => endGame(this.gameId, this.state.score), 2000);
        }
    },

    /**
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleClick = (e) => {
            if (self.state.gameOver) return;
            const now = Date.now();
            const rect = self.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (self.canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (self.canvas.height / rect.height);
            const clickedNode = self.getNodeAt(x, y);

            if (!clickedNode) {
                self.state.selectedNode = null;
                return;
            }

            if (!self.state.selectedNode) {
                if (clickedNode.owner === self.OWNER.PLAYER && clickedNode.validators > 1) {
                    self.state.selectedNode = clickedNode;
                    self.addParticles(clickedNode.x, clickedNode.y, '#22c55e', 5);
                }
            } else {
                if (clickedNode.owner === self.OWNER.PLAYER) {
                    if (clickedNode.validators > 1) {
                        self.state.selectedNode = clickedNode;
                        self.addParticles(clickedNode.x, clickedNode.y, '#22c55e', 5);
                    }
                } else if (self.areConnected(self.state.selectedNode, clickedNode)) {
                    if (now > self.state.playerCooldown) {
                        if (self.launchAttack(self.state.selectedNode, clickedNode, true)) {
                            self.state.playerCooldown = now + self.state.attackCooldown;
                        }
                    }
                } else {
                    self.addEffect(clickedNode.x, clickedNode.y, 'NOT CONNECTED', '#888', 30);
                }
            }
        };

        this.canvas.addEventListener('click', this.handleClick);
    },

    /**
     * Update game state
     * @param {number} dt - Delta time normalized to 60fps
     */
    update(dt) {
        const now = Date.now();
        const self = this;

        this.state.frameCount += dt;
        this.state.connectionPulse += 0.05 * dt;

        // Update particles
        this.state.particles = this.state.particles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 0.2 * dt;
            p.life -= dt;
            return p.life > 0;
        });

        // Update effects
        this.state.effects = this.state.effects.filter(e => {
            e.y += e.vy * dt;
            e.life -= dt;
            return e.life > 0;
        });

        // Update capture animations
        this.state.captureAnimations = this.state.captureAnimations.filter(anim => {
            anim.radius += 3 * dt;
            anim.alpha -= 0.03 * dt;
            return anim.alpha > 0 && anim.radius < anim.maxRadius;
        });

        // Update data flows
        this.state.dataFlows = this.state.dataFlows.filter(flow => {
            flow.progress += 0.03 * dt;
            flow.x = flow.x + (flow.targetX - flow.x) * 0.03 * dt;
            flow.y = flow.y + (flow.targetY - flow.y) * 0.03 * dt;
            return flow.progress < 1;
        });

        // Spawn random data flows between allied nodes
        if (Math.random() < 0.02 * dt) {
            const playerNodes = this.state.nodes.filter(n => n.owner === this.OWNER.PLAYER);
            const enemyNodes = this.state.nodes.filter(n => n.owner === this.OWNER.ENEMY);
            if (playerNodes.length >= 2 && Math.random() < 0.5) {
                const from = playerNodes[Math.floor(Math.random() * playerNodes.length)];
                const connectedAllies = from.connections
                    .map(id => this.state.nodes.find(n => n.id === id))
                    .filter(n => n.owner === this.OWNER.PLAYER);
                if (connectedAllies.length > 0) {
                    this.spawnDataFlow(from, connectedAllies[Math.floor(Math.random() * connectedAllies.length)]);
                }
            }
            if (enemyNodes.length >= 2 && Math.random() < 0.5) {
                const from = enemyNodes[Math.floor(Math.random() * enemyNodes.length)];
                const connectedAllies = from.connections
                    .map(id => this.state.nodes.find(n => n.id === id))
                    .filter(n => n.owner === this.OWNER.ENEMY);
                if (connectedAllies.length > 0) {
                    this.spawnDataFlow(from, connectedAllies[Math.floor(Math.random() * connectedAllies.length)]);
                }
            }
        }

        // Update power-ups
        this.state.powerUps = this.state.powerUps.filter(p => {
            p.pulse += 0.1 * dt;
            p.life -= dt;
            return p.life > 0;
        });

        // Update active power-ups duration
        this.state.activePowerUps = this.state.activePowerUps.filter(p => {
            p.remaining -= dt;
            return p.remaining > 0;
        });

        // Spawn power-ups periodically
        if (now - this.state.lastPowerUpSpawn > this.state.powerUpSpawnInterval) {
            this.state.lastPowerUpSpawn = now;
            if (this.state.powerUps.length < 2) {
                this.spawnPowerUp();
            }
        }

        if (this.state.waveTransitioning) {
            this.updateUI();
            return;
        }

        // Check power-up collection by player nodes
        this.state.powerUps = this.state.powerUps.filter(powerUp => {
            for (const node of this.state.nodes) {
                if (node.owner === this.OWNER.PLAYER) {
                    const dx = powerUp.x - node.x;
                    const dy = powerUp.y - node.y;
                    if (Math.sqrt(dx * dx + dy * dy) < this.state.nodeRadius + 20) {
                        this.collectPowerUp(powerUp);
                        return false;
                    }
                }
            }
            return true;
        });

        // Update attack projectiles
        this.state.attacks = this.state.attacks.filter(atk => {
            const dx = atk.targetX - atk.x;
            const dy = atk.targetY - atk.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < atk.speed * dt) {
                self.resolveAttack(atk);
                return false;
            }

            atk.x += (dx / dist) * atk.speed * dt;
            atk.y += (dy / dist) * atk.speed * dt;

            if (Math.random() < 0.3 * dt) {
                self.addParticles(atk.x, atk.y, atk.isPlayer ? '#22c55e' : '#ef4444', 1);
            }
            return true;
        });

        // AI difficulty scaling per wave
        if (this.state.wave <= 2) {
            this.state.aiDifficulty = 'easy';
        } else if (this.state.wave <= 5) {
            this.state.aiDifficulty = 'medium';
        } else {
            this.state.aiDifficulty = 'hard';
        }

        // Get current AI interval based on difficulty
        const aiMode = this.AI_MODES[this.state.aiDifficulty];
        const currentInterval = aiMode.attackInterval;

        // AI attacks
        if (now - this.state.lastAIAttack > currentInterval) {
            this.state.lastAIAttack = now;
            this.aiAttack();
        }

        // Regenerate validators
        if (now - this.state.lastRegen > this.state.regenInterval) {
            this.state.lastRegen = now;
            this.regenerateValidators();
        }

        // Check for blitz power-up (faster attack cooldown)
        const hasBlitz = this.state.activePowerUps.some(p => p.type === 'blitz');
        this.state.attackCooldown = hasBlitz ? 50 : 144;

        this.checkWinLose();
        this.updateUI();
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections with pulsing animation
        const pulseIntensity = 0.3 + Math.sin(this.state.connectionPulse) * 0.2;
        for (const node of this.state.nodes) {
            for (const connId of node.connections) {
                if (connId > node.id) {
                    const other = this.state.nodes.find(n => n.id === connId);
                    const isAllied = node.owner === other.owner && node.owner !== this.OWNER.NEUTRAL;

                    if (isAllied) {
                        // Allied connection (no shadowBlur for performance)
                        const color = this.CHAIN_COLORS[node.owner].border;
                        ctx.strokeStyle = color + Math.floor(pulseIntensity * 200).toString(16).padStart(2, '0');
                        ctx.lineWidth = 3;
                    } else {
                        ctx.strokeStyle = '#33335580';
                        ctx.lineWidth = 2;
                    }
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.stroke();
                }
            }
        }

        // Draw data flow packets (no shadowBlur for performance)
        for (const flow of this.state.dataFlows) {
            ctx.beginPath();
            ctx.arc(flow.x, flow.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = flow.color;
            ctx.fill();
        }

        // Draw capture animations (expanding rings)
        for (const anim of this.state.captureAnimations) {
            ctx.beginPath();
            ctx.arc(anim.x, anim.y, anim.radius, 0, Math.PI * 2);
            ctx.strokeStyle = anim.color;
            ctx.globalAlpha = anim.alpha;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Draw power-ups (no shadowBlur for performance)
        for (const powerUp of this.state.powerUps) {
            const pulse = 0.8 + Math.sin(powerUp.pulse) * 0.2;
            ctx.save();
            ctx.translate(powerUp.x, powerUp.y);
            ctx.scale(pulse, pulse);

            // Background circle
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fillStyle = powerUp.color + '40';
            ctx.fill();
            ctx.strokeStyle = powerUp.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Icon (cached sprite)
            SpriteCache.draw(ctx, powerUp.icon, 0, 0, 20);

            ctx.restore();
        }

        // Draw nodes (no shadowBlur for performance)
        for (const node of this.state.nodes) {
            const colors = this.CHAIN_COLORS[node.owner];
            const isSelected = this.state.selectedNode === node;

            ctx.beginPath();
            ctx.arc(node.x, node.y, this.state.nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = colors.bg;
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#fff' : colors.border;
            ctx.lineWidth = isSelected ? 4 : 2;
            ctx.stroke();

            if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, this.state.nodeRadius + 8 + Math.sin(this.state.frameCount * 0.1) * 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.fillStyle = colors.text;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(node.name, node.x, node.y - 8);
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#fff';
            ctx.fillText(node.validators, node.x, node.y + 10);

            if (node.owner === this.OWNER.PLAYER) {
                SpriteCache.draw(ctx, '👤', node.x, node.y - 25, 14);
            } else if (node.owner === this.OWNER.ENEMY) {
                SpriteCache.draw(ctx, '👹', node.x, node.y - 25, 14);
            }
        }

        // Draw attacks with trail effect
        for (const atk of this.state.attacks) {
            // Trail
            ctx.beginPath();
            const trailLen = 20;
            const dx = atk.targetX - atk.x;
            const dy = atk.targetY - atk.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const trailX = atk.x - (dx / dist) * trailLen;
            const trailY = atk.y - (dy / dist) * trailLen;
            const gradient = ctx.createLinearGradient(trailX, trailY, atk.x, atk.y);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, atk.isPlayer ? '#22c55e' : '#ef4444');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 6;
            ctx.moveTo(trailX, trailY);
            ctx.lineTo(atk.x, atk.y);
            ctx.stroke();

            // Main projectile (no shadowBlur for performance)
            ctx.beginPath();
            ctx.arc(atk.x, atk.y, 8 + atk.power / 3, 0, Math.PI * 2);
            ctx.fillStyle = atk.isPlayer ? '#22c55e' : '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(atk.power, atk.x, atk.y + 3);
        }

        // Draw attack preview
        if (this.state.selectedNode && !this.state.gameOver) {
            for (const connId of this.state.selectedNode.connections) {
                const target = this.state.nodes.find(n => n.id === connId);
                if (target.owner !== this.OWNER.PLAYER) {
                    ctx.setLineDash([5, 5]);
                    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(this.state.selectedNode.x, this.state.selectedNode.y);
                    ctx.lineTo(target.x, target.y);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // Particles
        for (const p of this.state.particles) {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Text effects (no shadowBlur for performance)
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        for (const e of this.state.effects) {
            ctx.globalAlpha = e.life / e.maxLife;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, e.x, e.y);
        }
        ctx.globalAlpha = 1;

        // Active power-ups HUD (bottom right)
        if (this.state.activePowerUps.length > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(this.canvas.width - 120, this.canvas.height - 80, 110, 70);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.canvas.width - 120, this.canvas.height - 80, 110, 70);

            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#fbbf24';
            ctx.textAlign = 'left';
            ctx.fillText('ACTIVE', this.canvas.width - 115, this.canvas.height - 65);

            this.state.activePowerUps.forEach((p, i) => {
                ctx.font = '14px Arial';
                ctx.fillStyle = p.color;
                ctx.fillText(`${p.icon} ${Math.ceil(p.remaining / 60)}s`, this.canvas.width - 115, this.canvas.height - 45 + i * 18);
            });
        }

        // AI difficulty indicator
        ctx.font = '10px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'right';
        ctx.fillText(`AI: ${this.state.aiDifficulty.toUpperCase()}`, this.canvas.width - 10, this.canvas.height - 10);
    },

    /**
     * Game loop
     */
    gameLoop() {
        const self = this;
        function loop(timestamp) {
            if (self.state.gameOver) return;
            const dt = self.timing.tick(timestamp);
            self.update(dt);
            self.draw();
            if (!self.state.waveTransitioning) {
                requestAnimationFrame(loop);
            }
        }
        requestAnimationFrame(loop);
    },

    /**
     * Stop the game
     */
    stop() {
        this.state.gameOver = true;
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.handleClick);
        }
        this.canvas = null;
        this.ctx = null;
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.BurnOrHold = BurnOrHold;
}
