/**
 * ASDF Games - Crypto Heist Engine
 *
 * Top-down shooter survival game
 * Navigate the crypto underworld, steal tokens, evade enemies
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const CryptoHeist = {
    version: '1.2.0', // Lighting + stealth + loot rarity
    gameId: 'cryptoheist',
    state: null,
    canvas: null,
    ctx: null,
    timing: null,
    juice: null,

    // Loot rarity system (Fibonacci-based values)
    lootRarities: {
        common:    { icon: '🪙', color: '#9ca3af', chance: 0.50, value: 5,  glow: false },
        uncommon:  { icon: '💎', color: '#22c55e', chance: 0.25, value: 13, glow: false },
        rare:      { icon: '💠', color: '#3b82f6', chance: 0.15, value: 34, glow: true },
        epic:      { icon: '🔮', color: '#a855f7', chance: 0.08, value: 89, glow: true },
        legendary: { icon: '👑', color: '#fbbf24', chance: 0.02, value: 233, glow: true }
    },

    // Trap types
    trapTypes: [
        { icon: '⚡', name: 'SHOCK', damage: 'stun', radius: 30, duration: 60 },
        { icon: '🔥', name: 'FIRE', damage: 'dot', radius: 40, duration: 120 },
        { icon: '🕸️', name: 'WEB', damage: 'slow', radius: 35, duration: 90 }
    ],

    /**
     * Start the game
     */
    start(gameId) {
        this.gameId = gameId;
        const arena = document.getElementById(`arena-${gameId}`);
        if (!arena) return;

        this.state = {
            score: 0,
            wave: 1,
            kills: 0,
            gameOver: false,
            player: { x: 0, y: 0, size: 21, speed: 5, angle: 0 }, // fib[7], fib[4]
            enemies: [],
            bullets: [],
            tokens: [],
            effects: [],
            traps: [],
            keys: { up: false, down: false, left: false, right: false },
            mouseX: 0,
            mouseY: 0,
            lastShot: 0,
            shootCooldown: 144,   // fib[11]
            spawnTimer: 0,
            spawnRate: 89,        // fib[10]
            enemySpeed: 1.618,    // PHI
            // Lighting system
            flashlightAngle: Math.PI / 4, // 45 degree cone
            flashlightRange: 200,
            ambientLight: 0.15,    // Base visibility
            // Stealth system
            stealth: {
                visibility: 0,     // 0 = hidden, 1 = fully visible
                lastSeen: 0,       // Frame when last spotted
                alertLevel: 0      // 0 = none, 1 = suspicious, 2 = alert
            },
            // Player status effects
            statusEffects: {
                stunned: false,
                stunEnd: 0,
                slowed: false,
                slowEnd: 0,
                burning: false,
                burnEnd: 0,
                burnDamage: 0
            }
        };

        this.createArena(arena);
        this.canvas = document.getElementById('ch-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Initialize timing for frame-independent movement
        this.timing = GameTiming.create();

        this.setupInput();

        // Spawn initial enemies
        for (let i = 0; i < 3; i++) {
            this.spawnEnemy();
        }

        this.preloadSprites();
        this.gameLoop();

        if (typeof activeGames !== 'undefined') {
            activeGames[gameId] = {
                cleanup: () => this.stop()
            };
        }
    },

    /**
     * Preload sprites for performance
     */
    preloadSprites() {
        const sprites = [
            // Player
            { emoji: '🤠', size: 30 },
            // Loot rarities
            { emoji: '🪙', size: 20 },
            { emoji: '💎', size: 20 },
            { emoji: '💠', size: 20 },
            { emoji: '🔮', size: 20 },
            { emoji: '👑', size: 20 },
            // Enemies
            { emoji: '👮', size: 30 },
            { emoji: '🤖', size: 30 },
            { emoji: '👹', size: 30 },
            // Traps
            { emoji: '⚡', size: 20 },
            { emoji: '🔥', size: 20 },
            { emoji: '🕸️', size: 20 },
        ];
        SpriteCache.preload(sprites);
    },

    /**
     * Create arena HTML
     */
    createArena(arena) {
        arena.innerHTML = `
            <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a0a2e 100%);cursor:crosshair;">
                <canvas id="ch-canvas" style="width:100%;height:100%;"></canvas>
                <div style="position:absolute;top:15px;left:15px;display:flex;gap:12px;">
                    <div style="background:rgba(0,0,0,0.7);padding:8px 14px;border-radius:8px;">
                        <span style="color:var(--gold);font-size:13px;">&#128176; <span id="ch-score">0</span></span>
                    </div>
                    <div style="background:rgba(0,0,0,0.7);padding:8px 14px;border-radius:8px;">
                        <span style="color:var(--red);font-size:13px;">&#128128; <span id="ch-kills">0</span></span>
                    </div>
                    <div style="background:rgba(0,0,0,0.7);padding:8px 14px;border-radius:8px;">
                        <span style="color:var(--purple);font-size:13px;">&#127754; <span id="ch-wave">1</span></span>
                    </div>
                </div>
                <div style="position:absolute;top:15px;right:15px;background:rgba(0,0,0,0.7);padding:8px 14px;border-radius:8px;">
                    <div style="font-size:10px;color:#a78bfa;margin-bottom:4px;">STEALTH</div>
                    <div style="width:80px;height:8px;background:rgba(255,255,255,0.2);border-radius:4px;overflow:hidden;">
                        <div id="ch-stealth-bar" style="width:0%;height:100%;background:linear-gradient(90deg,#22c55e,#fbbf24,#ef4444);transition:width 0.2s;"></div>
                    </div>
                    <div id="ch-alert" style="font-size:10px;color:#22c55e;margin-top:2px;text-align:center;">HIDDEN</div>
                </div>
                <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:11px;text-align:center;">
                    WASD to move | AIM with mouse | CLICK to shoot | Survive the enemy waves!
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
        this.state.player.x = this.canvas.width / 2;
        this.state.player.y = this.canvas.height / 2;
    },

    /**
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleKeyDown = (e) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) {
                self.state.keys.up = true;
                e.preventDefault();
            }
            if (['ArrowDown', 'KeyS'].includes(e.code)) {
                self.state.keys.down = true;
                e.preventDefault();
            }
            if (['ArrowLeft', 'KeyA'].includes(e.code)) {
                self.state.keys.left = true;
                e.preventDefault();
            }
            if (['ArrowRight', 'KeyD'].includes(e.code)) {
                self.state.keys.right = true;
                e.preventDefault();
            }
        };

        this.handleKeyUp = (e) => {
            if (['ArrowUp', 'KeyW'].includes(e.code)) self.state.keys.up = false;
            if (['ArrowDown', 'KeyS'].includes(e.code)) self.state.keys.down = false;
            if (['ArrowLeft', 'KeyA'].includes(e.code)) self.state.keys.left = false;
            if (['ArrowRight', 'KeyD'].includes(e.code)) self.state.keys.right = false;
        };

        this.handleMouseMove = (e) => {
            const rect = self.canvas.getBoundingClientRect();
            self.state.mouseX = (e.clientX - rect.left) * (self.canvas.width / rect.width);
            self.state.mouseY = (e.clientY - rect.top) * (self.canvas.height / rect.height);
        };

        this.handleClick = (e) => {
            if (!self.state.gameOver) {
                self.shoot();
            }
        };

        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('click', this.handleClick);
    },

    /**
     * Spawn enemy with patrol behavior
     */
    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        switch (side) {
            case 0: x = -30; y = Math.random() * this.canvas.height; break;
            case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = -30; break;
            case 3: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
        }

        const types = [
            { icon: '👾', health: 1, speed: this.state.enemySpeed, value: 13, size: 18, visionRange: 120 },
            { icon: '👹', health: 2, speed: this.state.enemySpeed * 0.8, value: 21, size: 22, visionRange: 150 },
            { icon: '🤖', health: 3, speed: this.state.enemySpeed * 0.6, value: 34, size: 25, visionRange: 180 },
            { icon: '🕵️', health: 1, speed: this.state.enemySpeed * 1.2, value: 21, size: 20, visionRange: 200, stealth: true }
        ];

        const maxType = Math.min(this.state.wave, types.length);
        const typeIndex = Math.floor(Math.random() * maxType);
        const type = types[typeIndex];

        // Patrol patterns
        const patterns = ['chase', 'patrol', 'ambush'];
        const pattern = this.state.wave >= 3 ? patterns[Math.floor(Math.random() * patterns.length)] : 'chase';

        // Generate patrol points for patrol behavior
        const patrolPoints = [];
        if (pattern === 'patrol') {
            const centerX = 100 + Math.random() * (this.canvas.width - 200);
            const centerY = 100 + Math.random() * (this.canvas.height - 200);
            const radius = 50 + Math.random() * 50;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                patrolPoints.push({
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                });
            }
        }

        this.state.enemies.push({
            x, y,
            ...type,
            maxHealth: type.health,
            // AI state
            behavior: pattern,
            state: 'idle',           // idle, patrol, chase, search
            patrolPoints: patrolPoints,
            patrolIndex: 0,
            lastSeenPlayer: null,    // Last known player position
            searchTimer: 0,
            alertLevel: 0            // 0-100
        });
    },

    /**
     * Spawn token with rarity system
     */
    spawnToken(x, y) {
        if (Math.random() > 0.4) return; // 40% chance to drop

        // Roll for rarity (weighted random)
        const roll = Math.random();
        let cumulative = 0;
        let selectedRarity = 'common';

        for (const [rarity, data] of Object.entries(this.lootRarities)) {
            cumulative += data.chance;
            if (roll <= cumulative) {
                selectedRarity = rarity;
                break;
            }
        }

        const rarityData = this.lootRarities[selectedRarity];
        const waveBonus = Math.floor(this.state.wave * 1.618); // PHI scaling

        this.state.tokens.push({
            x, y,
            size: 14,
            value: rarityData.value + waveBonus,
            rarity: selectedRarity,
            icon: rarityData.icon,
            color: rarityData.color,
            glow: rarityData.glow,
            life: 300,
            bobOffset: Math.random() * Math.PI * 2
        });

        // Announce rare+ drops
        if (selectedRarity !== 'common' && selectedRarity !== 'uncommon') {
            this.addEffect(x, y - 20, selectedRarity.toUpperCase() + '!', rarityData.color);
        }
    },

    /**
     * Spawn environmental trap
     */
    spawnTrap() {
        const type = this.trapTypes[Math.floor(Math.random() * this.trapTypes.length)];
        const margin = 80;

        this.state.traps.push({
            x: margin + Math.random() * (this.canvas.width - margin * 2),
            y: margin + Math.random() * (this.canvas.height - margin * 2),
            ...type,
            active: true,
            triggered: false,
            cooldown: 0
        });
    },

    /**
     * Shoot
     */
    shoot() {
        const now = Date.now();
        if (now - this.state.lastShot < this.state.shootCooldown) return;
        this.state.lastShot = now;

        const angle = Math.atan2(this.state.mouseY - this.state.player.y, this.state.mouseX - this.state.player.x);
        this.state.bullets.push({
            x: this.state.player.x,
            y: this.state.player.y,
            vx: Math.cos(angle) * 12,
            vy: Math.sin(angle) * 12,
            size: 5
        });
        recordGameAction(this.gameId, 'shoot', { angle });
    },

    /**
     * Add effect
     */
    addEffect(x, y, text, color) {
        this.state.effects.push({ x, y, text, color, life: 30, vy: -2 });
    },

    /**
     * Check if point is in player's flashlight cone
     */
    isInFlashlight(x, y) {
        const dx = x - this.state.player.x;
        const dy = y - this.state.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > this.state.flashlightRange) return false;

        const angleToPoint = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToPoint - this.state.player.angle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        return angleDiff < this.state.flashlightAngle / 2;
    },

    /**
     * Calculate visibility of player from enemy perspective
     */
    calculateVisibility(enemy) {
        const dx = this.state.player.x - enemy.x;
        const dy = this.state.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Base visibility decreases with distance
        let visibility = Math.max(0, 1 - dist / enemy.visionRange);

        // Player is more visible when shooting (muzzle flash)
        const timeSinceShot = Date.now() - this.state.lastShot;
        if (timeSinceShot < 200) {
            visibility = Math.min(1, visibility + 0.5);
        }

        // Player is more visible when moving
        if (this.state.keys.up || this.state.keys.down || this.state.keys.left || this.state.keys.right) {
            visibility = Math.min(1, visibility + 0.2);
        }

        return visibility;
    },

    /**
     * Update enemy AI state
     */
    updateEnemyAI(enemy, dt) {
        const visibility = this.calculateVisibility(enemy);
        const canSeePlayer = visibility > 0.3;

        // Update enemy alert level
        if (canSeePlayer) {
            enemy.alertLevel = Math.min(100, enemy.alertLevel + visibility * 3 * dt);
            enemy.lastSeenPlayer = { x: this.state.player.x, y: this.state.player.y };
            enemy.searchTimer = 180; // 3 seconds to search
        } else {
            enemy.alertLevel = Math.max(0, enemy.alertLevel - 1 * dt);
            if (enemy.searchTimer > 0) enemy.searchTimer -= dt;
        }

        // Determine behavior state
        if (enemy.alertLevel > 80) {
            enemy.state = 'chase';
        } else if (enemy.alertLevel > 30 || enemy.searchTimer > 0) {
            enemy.state = 'search';
        } else if (enemy.behavior === 'patrol' && enemy.patrolPoints.length > 0) {
            enemy.state = 'patrol';
        } else {
            enemy.state = 'idle';
        }

        // Get target position based on state
        let targetX, targetY;
        switch (enemy.state) {
            case 'chase':
                targetX = this.state.player.x;
                targetY = this.state.player.y;
                break;
            case 'search':
                if (enemy.lastSeenPlayer) {
                    targetX = enemy.lastSeenPlayer.x + (Math.random() - 0.5) * 50;
                    targetY = enemy.lastSeenPlayer.y + (Math.random() - 0.5) * 50;
                }
                break;
            case 'patrol':
                const point = enemy.patrolPoints[enemy.patrolIndex];
                targetX = point.x;
                targetY = point.y;
                // Check if reached patrol point
                const distToPoint = Math.sqrt(Math.pow(enemy.x - point.x, 2) + Math.pow(enemy.y - point.y, 2));
                if (distToPoint < 10) {
                    enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
                }
                break;
            default:
                // Idle - wander slightly
                targetX = enemy.x + (Math.random() - 0.5) * 20;
                targetY = enemy.y + (Math.random() - 0.5) * 20;
        }

        // Move toward target
        if (targetX !== undefined && targetY !== undefined) {
            const dx = targetX - enemy.x;
            const dy = targetY - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                const speedMod = enemy.state === 'chase' ? 1.2 : (enemy.state === 'search' ? 0.8 : 0.5);
                enemy.x += (dx / dist) * enemy.speed * speedMod * dt;
                enemy.y += (dy / dist) * enemy.speed * speedMod * dt;
            }
        }

        return canSeePlayer;
    },

    /**
     * Update player status effects
     */
    updateStatusEffects(dt, frameCount) {
        const effects = this.state.statusEffects;

        // Stun effect
        if (effects.stunned && frameCount > effects.stunEnd) {
            effects.stunned = false;
        }

        // Slow effect
        if (effects.slowed && frameCount > effects.slowEnd) {
            effects.slowed = false;
        }

        // Burn damage over time
        if (effects.burning) {
            if (frameCount > effects.burnEnd) {
                effects.burning = false;
            } else {
                // Apply periodic damage (every 30 frames)
                if (frameCount % 30 === 0) {
                    this.addEffect(this.state.player.x, this.state.player.y - 20, '-1', '#ef4444');
                }
            }
        }
    },

    /**
     * Check and apply trap effects
     */
    checkTraps(dt, frameCount) {
        const player = this.state.player;

        this.state.traps.forEach(trap => {
            if (!trap.active || trap.cooldown > 0) {
                trap.cooldown -= dt;
                return;
            }

            const dx = player.x - trap.x;
            const dy = player.y - trap.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < trap.radius) {
                trap.triggered = true;
                trap.cooldown = 180; // 3 second cooldown

                switch (trap.damage) {
                    case 'stun':
                        this.state.statusEffects.stunned = true;
                        this.state.statusEffects.stunEnd = frameCount + trap.duration;
                        this.addEffect(player.x, player.y, 'STUNNED!', '#fbbf24');
                        break;
                    case 'slow':
                        this.state.statusEffects.slowed = true;
                        this.state.statusEffects.slowEnd = frameCount + trap.duration;
                        this.addEffect(player.x, player.y, 'SLOWED!', '#3b82f6');
                        break;
                    case 'dot':
                        this.state.statusEffects.burning = true;
                        this.state.statusEffects.burnEnd = frameCount + trap.duration;
                        this.addEffect(player.x, player.y, 'BURNING!', '#ef4444');
                        break;
                }
            } else {
                trap.triggered = false;
            }
        });
    },

    /**
     * Update game state
     * @param {number} dt - Delta time normalized to 60fps
     */
    update(dt) {
        if (this.state.gameOver) return;

        // Track frame count for status effects
        if (!this.state.frameCount) this.state.frameCount = 0;
        this.state.frameCount += dt;

        // Update status effects
        this.updateStatusEffects(dt, this.state.frameCount);

        // Check traps
        this.checkTraps(dt, this.state.frameCount);

        // Skip movement if stunned
        if (this.state.statusEffects.stunned) {
            // Still update enemies and other systems
        } else {
            // Player movement
            let dx = 0, dy = 0;
            if (this.state.keys.up) dy -= 1;
            if (this.state.keys.down) dy += 1;
            if (this.state.keys.left) dx -= 1;
            if (this.state.keys.right) dx += 1;

            if (dx || dy) {
                const len = Math.sqrt(dx * dx + dy * dy);
                let speed = this.state.player.speed;
                if (this.state.statusEffects.slowed) speed *= 0.5;
                this.state.player.x += (dx / len) * speed * dt;
                this.state.player.y += (dy / len) * speed * dt;
            }
        }

        const bottomMargin = 50;
        this.state.player.x = Math.max(this.state.player.size, Math.min(this.canvas.width - this.state.player.size, this.state.player.x));
        this.state.player.y = Math.max(this.state.player.size, Math.min(this.canvas.height - this.state.player.size - bottomMargin, this.state.player.y));

        this.state.player.angle = Math.atan2(this.state.mouseY - this.state.player.y, this.state.mouseX - this.state.player.x);

        // Spawn enemies
        this.state.spawnTimer += dt;
        if (this.state.spawnTimer >= this.state.spawnRate) {
            this.state.spawnTimer = 0;
            this.spawnEnemy();
        }

        // Spawn traps every new wave
        if (this.state.kills > 0 && this.state.kills % 10 === 0 && this.state.traps.length < this.state.wave + 2) {
            this.spawnTrap();
        }

        const self = this;

        // Update stealth system
        let maxVisibility = 0;
        let anyChasing = false;

        // Update enemies with AI
        this.state.enemies.forEach(enemy => {
            const canSee = self.updateEnemyAI(enemy, dt);
            if (canSee) {
                const vis = self.calculateVisibility(enemy);
                maxVisibility = Math.max(maxVisibility, vis);
            }
            if (enemy.state === 'chase') anyChasing = true;

            // Collision with player
            const dx = self.state.player.x - enemy.x;
            const dy = self.state.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < self.state.player.size + enemy.size) {
                self.state.gameOver = true;
                self.addEffect(self.state.player.x, self.state.player.y, 'GAME OVER!', '#ef4444');
                setTimeout(() => endGame(self.gameId, self.state.score), 500);
            }
        });

        // Update stealth UI
        this.state.stealth.visibility = maxVisibility;
        const stealthBar = document.getElementById('ch-stealth-bar');
        const alertText = document.getElementById('ch-alert');
        if (stealthBar) stealthBar.style.width = `${maxVisibility * 100}%`;
        if (alertText) {
            if (anyChasing) {
                alertText.textContent = 'ALERT!';
                alertText.style.color = '#ef4444';
            } else if (maxVisibility > 0.3) {
                alertText.textContent = 'SPOTTED';
                alertText.style.color = '#fbbf24';
            } else {
                alertText.textContent = 'HIDDEN';
                alertText.style.color = '#22c55e';
            }
        }

        // Update bullets
        this.state.bullets = this.state.bullets.filter(bullet => {
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            for (let i = self.state.enemies.length - 1; i >= 0; i--) {
                const enemy = self.state.enemies[i];
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < bullet.size + enemy.size) {
                    enemy.health--;
                    if (enemy.health <= 0) {
                        self.state.kills++;
                        self.state.score += enemy.value;
                        document.getElementById('ch-kills').textContent = self.state.kills;
                        document.getElementById('ch-score').textContent = self.state.score;
                        self.addEffect(enemy.x, enemy.y, '+' + enemy.value, '#22c55e');
                        self.spawnToken(enemy.x, enemy.y);
                        self.state.enemies.splice(i, 1);
                        recordScoreUpdate(self.gameId, self.state.score, enemy.value);

                        if (self.state.kills > 0 && self.state.kills % 10 === 0) {
                            self.state.wave++;
                            self.state.spawnRate = Math.max(40, self.state.spawnRate - 10);
                            self.state.enemySpeed += 0.2;
                            document.getElementById('ch-wave').textContent = self.state.wave;
                            self.addEffect(self.canvas.width / 2, self.canvas.height / 2, 'WAVE ' + self.state.wave + '!', '#a855f7');
                        }
                    } else {
                        self.addEffect(enemy.x, enemy.y, '-1', '#fbbf24');
                    }
                    return false;
                }
            }

            return bullet.x > -10 && bullet.x < self.canvas.width + 10 && bullet.y > -10 && bullet.y < self.canvas.height + 10;
        });

        // Update tokens
        this.state.tokens = this.state.tokens.filter(token => {
            token.life -= dt;
            const dx = token.x - self.state.player.x;
            const dy = token.y - self.state.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < self.state.player.size + token.size) {
                self.state.score += token.value;
                document.getElementById('ch-score').textContent = self.state.score;
                self.addEffect(token.x, token.y, '+' + token.value, '#fbbf24');
                recordScoreUpdate(self.gameId, self.state.score, token.value);
                return false;
            }
            return token.life > 0;
        });

        // Update effects
        this.state.effects = this.state.effects.filter(e => {
            e.y += e.vy * dt;
            e.life -= dt;
            return e.life > 0;
        });

        updateScore(this.gameId, this.state.score);
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Dark background (affected by lighting)
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid (dim)
        ctx.strokeStyle = 'rgba(26, 26, 62, 0.5)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Draw flashlight cone (illuminated area)
        ctx.save();
        ctx.translate(this.state.player.x, this.state.player.y);
        ctx.rotate(this.state.player.angle);

        // Flashlight gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.state.flashlightRange);
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
        gradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.15)');
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.state.flashlightRange, -this.state.flashlightAngle / 2, this.state.flashlightAngle / 2);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();

        // Ambient light around player
        const ambientGrad = ctx.createRadialGradient(
            this.state.player.x, this.state.player.y, 0,
            this.state.player.x, this.state.player.y, 80
        );
        ambientGrad.addColorStop(0, 'rgba(139, 92, 246, 0.2)');
        ambientGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = ambientGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw traps
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        this.state.traps.forEach(trap => {
            // Trap warning zone
            if (trap.triggered) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
            } else {
                ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
            }
            ctx.beginPath();
            ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
            ctx.fill();

            // Trap icon
            const pulse = trap.triggered ? 1.3 : 1 + Math.sin(this.state.frameCount * 0.1) * 0.1;
            const trapAlpha = trap.cooldown > 0 ? 0.3 : 0.8;
            SpriteCache.drawTransformed(ctx, trap.icon, trap.x, trap.y, 20, {
                scaleX: pulse,
                scaleY: pulse,
                alpha: trapAlpha
            });
        });

        // Tokens with rarity system (cached sprites)
        this.state.tokens.forEach(token => {
            const tokenAlpha = token.life > 60 ? 1 : token.life / 60;
            // Bob animation
            const bob = Math.sin(token.bobOffset + this.state.frameCount * 0.08) * 3;
            SpriteCache.drawTransformed(ctx, token.icon, token.x, token.y + bob, 20, { alpha: tokenAlpha });
        });

        // Bullets
        ctx.fillStyle = '#fbbf24';
        this.state.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Enemies with alert indicators
        this.state.enemies.forEach(enemy => {
            // Visibility based on flashlight
            const inLight = this.isInFlashlight(enemy.x, enemy.y);
            const enemyAlpha = inLight ? 1 : 0.4;

            // Alert indicator above enemy
            if (enemy.alertLevel > 0) {
                const alertHeight = 15 + enemy.alertLevel / 10;
                if (enemy.state === 'chase') {
                    SpriteCache.drawTransformed(ctx, '!', enemy.x, enemy.y - enemy.size - alertHeight, 14, {
                        alpha: enemyAlpha,
                        color: '#ef4444'
                    });
                } else if (enemy.state === 'search') {
                    SpriteCache.drawTransformed(ctx, '?', enemy.x, enemy.y - enemy.size - alertHeight, 14, {
                        alpha: enemyAlpha,
                        color: '#fbbf24'
                    });
                }

                // Alert meter
                const meterWidth = 20;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(enemy.x - meterWidth / 2, enemy.y - enemy.size - 8, meterWidth, 3);
                ctx.fillStyle = enemy.alertLevel > 80 ? '#ef4444' : enemy.alertLevel > 30 ? '#fbbf24' : '#22c55e';
                ctx.fillRect(enemy.x - meterWidth / 2, enemy.y - enemy.size - 8, meterWidth * (enemy.alertLevel / 100), 3);
            }

            // Vision cone indicator (when in search/patrol)
            if (enemy.state !== 'chase' && enemy.visionRange) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.1)';
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.visionRange, 0, Math.PI * 2);
                ctx.stroke();
            }

            SpriteCache.drawTransformed(ctx, enemy.icon, enemy.x, enemy.y, enemy.size * 1.5, { alpha: enemyAlpha });

            if (enemy.health < enemy.maxHealth) {
                const barWidth = enemy.size * 1.5;
                const barHeight = 4;
                ctx.fillStyle = '#333';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth, barHeight);
                ctx.fillStyle = enemy.health > 1 ? '#22c55e' : '#ef4444';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth * (enemy.health / enemy.maxHealth), barHeight);
            }
        });

        // Player
        ctx.save();
        ctx.translate(this.state.player.x, this.state.player.y);
        ctx.rotate(this.state.player.angle);

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(40, 0);
        ctx.stroke();

        ctx.restore();

        SpriteCache.draw(ctx, '🧙', this.state.player.x, this.state.player.y, 28);

        // Effects (text-based, keep as is for dynamic text)
        ctx.font = 'bold 18px Arial';
        this.state.effects.forEach(e => {
            ctx.globalAlpha = e.life / 30;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, e.x, e.y);
        });
        ctx.globalAlpha = 1;
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
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
    },

    /**
     * Stop the game
     */
    stop() {
        this.state.gameOver = true;

        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.handleMouseMove);
            this.canvas.removeEventListener('click', this.handleClick);
        }

        this.canvas = null;
        this.ctx = null;
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.CryptoHeist = CryptoHeist;
}
