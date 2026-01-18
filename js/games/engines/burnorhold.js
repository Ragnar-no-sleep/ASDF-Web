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
    gameId: 'burnorhold',
    canvas: null,
    ctx: null,
    state: null,
    startTime: null,

    OWNER: { NEUTRAL: 0, PLAYER: 1, ENEMY: 2 },
    CHAIN_NAMES: ['ETH', 'SOL', 'AVAX', 'MATIC', 'BNB', 'ARB', 'OP', 'BASE', 'FTM', 'ATOM'],
    CHAIN_COLORS: null,

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
            nodeRadius: 35,
            lastAIAttack: 0,
            aiAttackInterval: 1200,
            lastRegen: 0,
            regenInterval: 1000,
            playerCooldown: 0,
            attackCooldown: 150,
            regenAmount: 2,
        };

        this.createArena(arena);
        this.canvas = document.getElementById('cc-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.startTime = Date.now();

        this.resizeCanvas();
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
        const defenderPower = defender.validators;

        if (power > defenderPower) {
            const prevOwner = defender.owner;
            defender.owner = isPlayer ? this.OWNER.PLAYER : this.OWNER.ENEMY;
            defender.validators = Math.max(1, power - defenderPower);
            this.addEffect(defender.x, defender.y, 'CAPTURED!', isPlayer ? '#22c55e' : '#ef4444', 50);
            this.addParticles(defender.x, defender.y, isPlayer ? '#22c55e' : '#ef4444', 20);
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
     * AI attack logic
     */
    aiAttack() {
        const enemyNodes = this.state.nodes.filter(n => n.owner === this.OWNER.ENEMY && n.validators > 3);
        if (enemyNodes.length === 0) return;

        const attackCount = Math.min(1 + Math.floor(this.state.wave / 2), enemyNodes.length, 3);

        for (let a = 0; a < attackCount; a++) {
            const availableAttackers = enemyNodes.filter(n => n.validators > 3);
            if (availableAttackers.length === 0) break;

            const attacker = availableAttackers[Math.floor(Math.random() * availableAttackers.length)];

            const targets = [];
            for (const connId of attacker.connections) {
                const target = this.state.nodes.find(n => n.id === connId);
                if (target.owner !== this.OWNER.ENEMY) {
                    targets.push({ node: target, priority: target.owner === this.OWNER.PLAYER ? 2 : 1 });
                }
            }

            if (targets.length === 0) continue;

            targets.sort((a, b) => b.priority - a.priority);
            const target = Math.random() < 0.8 ? targets[0].node : targets[Math.floor(Math.random() * targets.length)].node;

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
     */
    update() {
        const now = Date.now();

        // Update particles
        this.state.particles = this.state.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life--;
            return p.life > 0;
        });

        // Update effects
        this.state.effects = this.state.effects.filter(e => {
            e.y += e.vy;
            e.life--;
            return e.life > 0;
        });

        if (this.state.waveTransitioning) {
            this.updateUI();
            return;
        }

        // Update attack projectiles
        const self = this;
        this.state.attacks = this.state.attacks.filter(atk => {
            const dx = atk.targetX - atk.x;
            const dy = atk.targetY - atk.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < atk.speed) {
                self.resolveAttack(atk);
                return false;
            }

            atk.x += (dx / dist) * atk.speed;
            atk.y += (dy / dist) * atk.speed;

            if (Math.random() < 0.3) {
                self.addParticles(atk.x, atk.y, atk.isPlayer ? '#22c55e' : '#ef4444', 1);
            }
            return true;
        });

        // AI attacks
        if (now - this.state.lastAIAttack > this.state.aiAttackInterval) {
            this.state.lastAIAttack = now;
            this.aiAttack();
        }

        // Regenerate validators
        if (now - this.state.lastRegen > this.state.regenInterval) {
            this.state.lastRegen = now;
            this.regenerateValidators();
        }

        this.checkWinLose();
        this.updateUI();
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        ctx.lineWidth = 2;
        for (const node of this.state.nodes) {
            for (const connId of node.connections) {
                if (connId > node.id) {
                    const other = this.state.nodes.find(n => n.id === connId);
                    ctx.strokeStyle = node.owner === other.owner && node.owner !== this.OWNER.NEUTRAL
                        ? this.CHAIN_COLORS[node.owner].border + '80'
                        : '#33335580';
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.stroke();
                }
            }
        }

        // Draw nodes
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
                ctx.arc(node.x, node.y, this.state.nodeRadius + 8 + Math.sin(Date.now() / 100) * 3, 0, Math.PI * 2);
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
                ctx.font = '14px Arial';
                ctx.fillText('👤', node.x, node.y - 25);
            } else if (node.owner === this.OWNER.ENEMY) {
                ctx.font = '14px Arial';
                ctx.fillText('👹', node.x, node.y - 25);
            }
        }

        // Draw attacks
        for (const atk of this.state.attacks) {
            ctx.beginPath();
            ctx.arc(atk.x, atk.y, 8 + atk.power / 3, 0, Math.PI * 2);
            ctx.fillStyle = atk.isPlayer ? '#22c55e' : '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = 'bold 10px Arial';
            ctx.fillStyle = '#fff';
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

        // Particles & effects
        for (const p of this.state.particles) {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        for (const e of this.state.effects) {
            ctx.globalAlpha = e.life / e.maxLife;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, e.x, e.y);
        }
        ctx.globalAlpha = 1;
    },

    /**
     * Game loop
     */
    gameLoop() {
        const self = this;
        function loop() {
            if (self.state.gameOver) return;
            self.update();
            self.draw();
            if (!self.state.waveTransitioning) {
                requestAnimationFrame(loop);
            }
        }
        loop();
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
