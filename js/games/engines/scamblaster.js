/**
 * ASDF Games - Scam Blaster Engine
 *
 * Shooter game: Shoot down scam tokens and rug projects
 * Two modes: Fall mode (protect wallet) and Pop mode (click before vanish)
 *
 * Extracted from engine.js for modularity
 */

'use strict';

const ScamBlaster = {
    version: '1.2.0', // Boss waves + weapons + combo system
    gameId: 'scamblaster',
    state: null,
    canvas: null,
    ctx: null,
    timing: null,
    juice: null,

    // Enemy types with Fibonacci-based points: 8, 13, 21, 34, 55
    enemyTypes: [
        { icon: '🪙', name: 'SCAM COIN', points: 8, speed: 1, size: 34 },      // fib[5], fib[8]
        { icon: '🔴', name: 'RUG TOKEN', points: 13, speed: 1.2, size: 40 },   // fib[6]
        { icon: '💀', name: 'HONEYPOT', points: 21, speed: 1.4, size: 45 },    // fib[7]
        { icon: '🦠', name: 'MALWARE', points: 34, speed: 1.6, size: 34 },     // fib[8]
        { icon: '👤', name: 'FAKE DEV', points: 55, speed: 1.3, size: 55 },    // fib[9]
        // Shielded enemies (need 2 hits)
        { icon: '🛡️', name: 'SHIELDED', points: 89, speed: 0.8, size: 50, shield: true, hp: 2 },
        // Splitter enemies (split on hit)
        { icon: '🧬', name: 'SPLITTER', points: 34, speed: 1.1, size: 45, splitter: true }
    ],

    // Boss types (every 5th wave)
    bossTypes: [
        { icon: '👹', name: 'RUG LORD', points: 233, speed: 0.5, size: 80, hp: 5, patterns: ['zigzag'] },
        { icon: '🐙', name: 'KRAKEN', points: 377, speed: 0.4, size: 90, hp: 8, patterns: ['spiral', 'spawn'] },
        { icon: '🤖', name: 'BOT KING', points: 610, speed: 0.3, size: 100, hp: 13, patterns: ['laser', 'shield'] }
    ],

    // Weapon types
    weapons: {
        normal: { name: 'BLASTER', icon: '🔫', damage: 1, spread: 0, pierce: false, cooldown: 0 },
        spread: { name: 'SPREAD', icon: '🌟', damage: 1, spread: 3, pierce: false, cooldown: 8 },
        pierce: { name: 'PIERCE', icon: '⚡', damage: 1, spread: 0, pierce: true, cooldown: 13 },
        slow: { name: 'FREEZE', icon: '❄️', damage: 1, spread: 0, pierce: false, cooldown: 21, effect: 'slow' }
    },

    // Power-up types (dropped by enemies)
    powerUpTypes: [
        { icon: '❤️', name: 'LIFE', effect: 'life', chance: 0.05 },
        { icon: '🌟', name: 'SPREAD', effect: 'spread', chance: 0.08, duration: 300 },
        { icon: '⚡', name: 'PIERCE', effect: 'pierce', chance: 0.08, duration: 300 },
        { icon: '❄️', name: 'FREEZE', effect: 'slow', chance: 0.06, duration: 200 },
        { icon: '💰', name: 'BONUS', effect: 'score', chance: 0.1 }
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
            lives: 3,
            wave: 1,
            gameOver: false,
            phase: 'select',
            countdown: 3,
            gameMode: null,
            crosshair: { x: 0, y: 0 },
            enemies: [],
            explosions: [],
            powerUps: [],
            spawnTimer: 0,
            spawnRate: 89,         // fib[10]
            baseSpeed: 1.618,      // PHI
            enemySpeed: 1.618,
            frameCount: 0,
            // Wave difficulty scaling
            difficultyLevel: 0,
            // Boss system
            boss: null,
            bossPhase: false,
            bossDefeated: 0,
            // Weapon system
            weapon: 'normal',
            weaponTimer: 0,
            activeEffects: {
                spread: { active: false, endFrame: 0 },
                pierce: { active: false, endFrame: 0 },
                slow: { active: false, endFrame: 0 }
            },
            // Combo system (Fibonacci multipliers: 1, 1, 2, 3, 5)
            combo: 0,
            comboTimer: 0,
            maxComboTime: 89,      // fib[10] frames to maintain combo
            lastKillFrame: 0
        };

        this.createArena(arena);
        this.canvas = document.getElementById('sb-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();

        // Initialize timing for frame-independent movement
        this.timing = GameTiming.create();

        this.setupModeSelection();
        this.setupInput();
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
            <div style="width:100%;height:100%;position:relative;overflow:hidden;cursor:crosshair;">
                <canvas id="sb-canvas" style="width:100%;height:100%;"></canvas>
                <div id="sb-mode-select" style="position:absolute;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;">
                    <h2 style="color:var(--gold);font-size:28px;margin-bottom:10px;">&#127919; SCAM BLASTER</h2>
                    <p style="color:var(--text-muted);font-size:14px;margin-bottom:30px;">Choose your game mode:</p>
                    <div style="display:flex;gap:20px;">
                        <button id="sb-select-fall" style="padding:20px 30px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#16a34a);border:3px solid #4ade80;color:#fff;cursor:pointer;text-align:center;transition:transform 0.2s;">
                            <div style="font-size:40px;margin-bottom:8px;">&#128229;</div>
                            <div style="font-size:16px;font-weight:bold;">FALL MODE</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:5px;">Enemies fall down<br>Protect your wallet!</div>
                        </button>
                        <button id="sb-select-pop" style="padding:20px 30px;border-radius:12px;background:linear-gradient(135deg,#a855f7,#7c3aed);border:3px solid #c084fc;color:#fff;cursor:pointer;text-align:center;transition:transform 0.2s;">
                            <div style="font-size:40px;margin-bottom:8px;">&#128165;</div>
                            <div style="font-size:16px;font-weight:bold;">POP MODE</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:5px;">Enemies pop up anywhere<br>Click before they vanish!</div>
                        </button>
                    </div>
                </div>
                <div id="sb-hud" style="display:none;">
                    <div style="position:absolute;top:12px;left:12px;display:flex;gap:12px;">
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);">
                            <span style="color:#a78bfa;font-size:10px;">SCORE</span>
                            <div style="color:#fbbf24;font-size:18px;font-weight:bold;" id="sb-score">0</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);">
                            <span style="color:#a78bfa;font-size:10px;">WAVE</span>
                            <div style="color:#a855f7;font-size:18px;font-weight:bold;" id="sb-wave">1</div>
                        </div>
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);">
                            <span style="color:#a78bfa;font-size:10px;">COMBO</span>
                            <div style="color:#f97316;font-size:16px;font-weight:bold;" id="sb-combo">-</div>
                        </div>
                    </div>
                    <div style="position:absolute;top:12px;right:12px;display:flex;gap:10px;">
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);" id="sb-weapon">
                            <span style="font-size:16px;">&#128299;</span>
                        </div>
                        <div style="background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);" id="sb-lives">&#10084;&#10084;&#10084;</div>
                    </div>
                    <div id="sb-wallet" style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:85%;height:50px;background:linear-gradient(90deg,rgba(139,92,246,0.4),rgba(251,191,36,0.4));border:2px solid #fbbf24;border-radius:10px;display:none;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(251,191,36,0.3);">
                        <span style="font-size:22px;">&#128188;</span>
                        <span style="margin-left:8px;color:#fbbf24;font-weight:bold;">YOUR WALLET</span>
                    </div>
                    <div id="sb-boss-hud" style="display:none;position:absolute;top:50px;left:50%;transform:translateX(-50%);text-align:center;">
                        <div style="color:#ef4444;font-size:14px;font-weight:bold;" id="sb-boss-name">BOSS</div>
                        <div style="width:200px;height:12px;background:rgba(0,0,0,0.6);border-radius:6px;border:2px solid #ef4444;overflow:hidden;margin-top:4px;">
                            <div id="sb-boss-hp" style="width:100%;height:100%;background:linear-gradient(90deg,#ef4444,#f97316);transition:width 0.2s;"></div>
                        </div>
                    </div>
                </div>
                <div id="sb-countdown" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:72px;font-weight:bold;color:#fff;text-shadow:0 0 30px rgba(251,191,36,0.8);display:none;"></div>
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
        this.walletZone = { y: this.canvas.height - 90, height: 50 };
    },

    /**
     * Setup mode selection
     */
    setupModeSelection() {
        const self = this;
        document.getElementById('sb-select-fall').onclick = () => self.selectMode('fall');
        document.getElementById('sb-select-pop').onclick = () => self.selectMode('pop');
    },

    /**
     * Select game mode
     */
    selectMode(mode) {
        this.state.gameMode = mode;
        document.getElementById('sb-mode-select').style.display = 'none';
        document.getElementById('sb-hud').style.display = 'block';
        document.getElementById('sb-countdown').style.display = 'block';

        if (mode === 'fall') {
            document.getElementById('sb-wallet').style.display = 'flex';
        }

        this.state.phase = 'countdown';
        this.state.countdown = 3;
        document.getElementById('sb-countdown').textContent = '3';
    },

    /**
     * Setup input handlers
     */
    setupInput() {
        const self = this;

        this.handleMove = (e) => {
            const rect = self.canvas.getBoundingClientRect();
            const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
            const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
            self.state.crosshair.x = x * (self.canvas.width / rect.width);
            self.state.crosshair.y = y * (self.canvas.height / rect.height);
        };

        this.handleClick = (e) => {
            self.handleMove(e);
            self.shoot(self.state.crosshair.x, self.state.crosshair.y);
        };

        this.canvas.addEventListener('mousemove', this.handleMove);
        this.canvas.addEventListener('click', this.handleClick);
        this.canvas.addEventListener('touchmove', this.handleMove);
        this.canvas.addEventListener('touchstart', this.handleClick);
    },

    /**
     * Spawn enemy
     */
    spawnEnemy() {
        // Limit regular enemies - skip if too many (Fib-based limit)
        const maxEnemies = 13 + this.state.wave * 2;
        if (this.state.enemies.length >= maxEnemies) return;

        // Choose enemy type based on wave (higher waves unlock harder enemies)
        const maxTypeIndex = Math.min(this.state.wave + 2, this.enemyTypes.length - 1);
        const type = this.enemyTypes[Math.floor(Math.random() * (maxTypeIndex + 1))];

        const enemy = {
            ...type,
            hp: type.hp || 1,
            maxHp: type.hp || 1
        };

        if (this.state.gameMode === 'fall') {
            enemy.x = Math.random() * (this.canvas.width - 80) + 40;
            enemy.y = -50;
            enemy.vy = type.speed * this.state.enemySpeed;
            this.state.enemies.push(enemy);
        } else {
            enemy.x = 60 + Math.random() * (this.canvas.width - 120);
            enemy.y = 60 + Math.random() * (this.canvas.height - 180);
            enemy.vy = 0;
            enemy.lifespan = 90 + Math.random() * 60;
            enemy.maxLife = enemy.lifespan;
            this.state.enemies.push(enemy);
        }
    },

    /**
     * Spawn boss (every 5th wave)
     */
    spawnBoss() {
        const bossIndex = Math.min(Math.floor(this.state.wave / 5) - 1, this.bossTypes.length - 1);
        const bossType = this.bossTypes[bossIndex];

        this.state.boss = {
            ...bossType,
            x: this.canvas.width / 2,
            y: this.state.gameMode === 'fall' ? -80 : this.canvas.height / 3,
            hp: bossType.hp,
            maxHp: bossType.hp,
            phase: 0,
            patternTimer: 0,
            angle: 0
        };

        this.state.bossPhase = true;

        // Show boss HUD
        const bossHud = document.getElementById('sb-boss-hud');
        const bossName = document.getElementById('sb-boss-name');
        if (bossHud) bossHud.style.display = 'block';
        if (bossName) bossName.textContent = `👹 ${bossType.name}`;
    },

    /**
     * Calculate combo multiplier (Fibonacci sequence)
     */
    getComboMultiplier() {
        const fib = [1, 1, 2, 3, 5, 8, 13];
        return fib[Math.min(this.state.combo, fib.length - 1)];
    },

    /**
     * Update combo state
     */
    updateCombo(killed) {
        if (killed) {
            this.state.combo++;
            this.state.lastKillFrame = this.state.frameCount;
            // Update combo display
            const comboEl = document.getElementById('sb-combo');
            if (comboEl) {
                const mult = this.getComboMultiplier();
                comboEl.textContent = mult > 1 ? `x${mult}` : '-';
                comboEl.style.color = mult >= 5 ? '#ef4444' : mult >= 3 ? '#f97316' : '#fbbf24';
            }
        } else if (this.state.combo > 0) {
            // Check if combo expired
            if (this.state.frameCount - this.state.lastKillFrame > this.state.maxComboTime) {
                this.state.combo = 0;
                const comboEl = document.getElementById('sb-combo');
                if (comboEl) comboEl.textContent = '-';
            }
        }
    },

    /**
     * Maybe drop power-up from killed enemy
     */
    maybeDropPowerUp(x, y) {
        for (const powerUp of this.powerUpTypes) {
            if (Math.random() < powerUp.chance) {
                this.state.powerUps.push({
                    x, y,
                    vy: 1,
                    ...powerUp,
                    life: 300 // Fib[13] frames to collect
                });
                return; // Only one power-up per kill
            }
        }
    },

    /**
     * Collect power-up
     */
    collectPowerUp(powerUp) {
        switch (powerUp.effect) {
            case 'life':
                this.state.lives = Math.min(this.state.lives + 1, 5);
                document.getElementById('sb-lives').innerHTML = '❤️'.repeat(this.state.lives);
                break;
            case 'spread':
            case 'pierce':
            case 'slow':
                this.state.activeEffects[powerUp.effect] = {
                    active: true,
                    endFrame: this.state.frameCount + powerUp.duration
                };
                break;
            case 'score':
                this.state.score += 50 * this.getComboMultiplier();
                break;
        }
        this.state.explosions.push({ x: powerUp.x, y: powerUp.y, life: 20, icon: powerUp.icon });
    },

    /**
     * Spawn split enemies (from splitter type)
     */
    spawnSplitEnemies(x, y) {
        for (let i = 0; i < 2; i++) {
            const smallEnemy = {
                icon: '🔴',
                name: 'SPLIT',
                points: 8,
                speed: 1.5,
                size: 24,
                hp: 1,
                maxHp: 1,
                x: x + (i === 0 ? -20 : 20),
                y: y,
                vy: this.state.gameMode === 'fall' ? 2 : 0
            };
            if (this.state.gameMode === 'pop') {
                smallEnemy.lifespan = 60;
                smallEnemy.maxLife = 60;
            }
            this.state.enemies.push(smallEnemy);
        }
    },

    /**
     * Shoot at position
     */
    shoot(x, y) {
        if (this.state.gameOver || this.state.phase !== 'playing') return;

        // Check for active weapon effects
        const hasSpread = this.state.activeEffects.spread.active;
        const hasPierce = this.state.activeEffects.pierce.active;
        const hasSlow = this.state.activeEffects.slow.active;

        // Generate hit points (spread = multiple points)
        const hitPoints = [{ x, y }];
        if (hasSpread) {
            // Add spread shots in a fan pattern
            const spreadAngle = Math.PI / 8;
            for (let i = 1; i <= 2; i++) {
                hitPoints.push(
                    { x: x + Math.cos(spreadAngle * i) * 40, y: y + Math.sin(spreadAngle * i) * 40 },
                    { x: x + Math.cos(-spreadAngle * i) * 40, y: y + Math.sin(-spreadAngle * i) * 40 }
                );
            }
        }

        let totalHits = 0;
        const self = this;

        // Check boss hit first
        if (this.state.boss && !this.state.boss.defeated) {
            for (const point of hitPoints) {
                const dx = point.x - this.state.boss.x;
                const dy = point.y - this.state.boss.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.state.boss.size) {
                    this.state.boss.hp--;
                    totalHits++;
                    this.state.explosions.push({ x: this.state.boss.x, y: this.state.boss.y, life: 15, icon: '💥' });

                    // Update boss HP bar
                    const bossHpEl = document.getElementById('sb-boss-hp');
                    if (bossHpEl) {
                        bossHpEl.style.width = `${(this.state.boss.hp / this.state.boss.maxHp) * 100}%`;
                    }

                    // Check boss death
                    if (this.state.boss.hp <= 0) {
                        this.state.score += this.state.boss.points * this.getComboMultiplier();
                        this.state.explosions.push({ x: this.state.boss.x, y: this.state.boss.y, life: 40, icon: '🎆' });
                        this.state.bossDefeated++;
                        this.state.boss = null;
                        this.state.bossPhase = false;
                        document.getElementById('sb-boss-hud').style.display = 'none';
                    }

                    if (!hasPierce) break;
                }
            }
        }

        // Check enemy hits
        this.state.enemies = this.state.enemies.filter(enemy => {
            for (const point of hitPoints) {
                const dx = point.x - enemy.x;
                const dy = point.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < enemy.size) {
                    // Apply slow effect
                    if (hasSlow && !enemy.slowed) {
                        enemy.slowed = true;
                        enemy.vy *= 0.5;
                        if (enemy.lifespan) enemy.lifespan *= 1.5;
                    }

                    enemy.hp--;
                    totalHits++;

                    if (enemy.hp <= 0) {
                        // Enemy killed
                        const comboMult = self.getComboMultiplier();
                        self.state.score += enemy.points * comboMult;
                        self.state.explosions.push({ x: enemy.x, y: enemy.y, life: 20, icon: '💥' });

                        // Handle splitter
                        if (enemy.splitter) {
                            self.spawnSplitEnemies(enemy.x, enemy.y);
                        }

                        // Maybe drop power-up
                        self.maybeDropPowerUp(enemy.x, enemy.y);

                        // Update combo
                        self.updateCombo(true);

                        if (!hasPierce) return false;
                        return false; // Remove enemy
                    } else {
                        // Enemy damaged but not killed
                        self.state.explosions.push({ x: enemy.x, y: enemy.y, life: 10, icon: '✨' });
                        if (!hasPierce) return true;
                    }
                }
            }
            return true;
        });

        if (totalHits === 0) {
            this.state.explosions.push({ x, y, life: 10, icon: '💨' });
        }
    },

    /**
     * Update game state
     * @param {number} dt - Delta time normalized to 60fps
     */
    update(dt) {
        if (this.state.gameOver) return;
        if (this.state.phase === 'select') return;

        if (this.state.phase === 'countdown') {
            this.state.frameCount += dt;
            if (this.state.frameCount >= 60) {
                this.state.countdown--;
                this.state.frameCount = 0;
                if (this.state.countdown <= 0) {
                    this.state.phase = 'playing';
                    document.getElementById('sb-countdown').style.display = 'none';
                } else {
                    document.getElementById('sb-countdown').textContent = this.state.countdown;
                }
            }
            return;
        }

        this.state.frameCount += dt;

        const timeBonus = this.state.frameCount * 0.00003;
        this.state.enemySpeed = this.state.baseSpeed + this.state.wave * 0.4 + timeBonus;

        // Update combo timer
        this.updateCombo(false);

        // Update weapon effects expiration
        for (const effect of Object.keys(this.state.activeEffects)) {
            if (this.state.activeEffects[effect].active &&
                this.state.frameCount > this.state.activeEffects[effect].endFrame) {
                this.state.activeEffects[effect].active = false;
            }
        }

        // Update weapon display
        const weaponEl = document.getElementById('sb-weapon');
        if (weaponEl) {
            let icon = '🔫';
            if (this.state.activeEffects.spread.active) icon = '🌟';
            else if (this.state.activeEffects.pierce.active) icon = '⚡';
            else if (this.state.activeEffects.slow.active) icon = '❄️';
            weaponEl.innerHTML = `<span style="font-size:16px;">${icon}</span>`;
        }

        // Check for boss wave (every 5th wave)
        if (this.state.wave % 5 === 0 && !this.state.bossPhase && !this.state.boss) {
            // Clear remaining enemies before boss
            if (this.state.enemies.length === 0) {
                this.spawnBoss();
            }
        }

        // Update boss
        if (this.state.boss) {
            // Boss movement patterns
            this.state.boss.patternTimer += dt;
            this.state.boss.angle += 0.02 * dt;

            if (this.state.gameMode === 'fall') {
                // Move down slowly, zigzag
                if (this.state.boss.y < 100) {
                    this.state.boss.y += 0.5 * dt;
                }
                this.state.boss.x = this.canvas.width / 2 + Math.sin(this.state.boss.angle) * 100;
            } else {
                // Move around in pop mode
                this.state.boss.x = this.canvas.width / 2 + Math.sin(this.state.boss.angle) * 80;
                this.state.boss.y = this.canvas.height / 3 + Math.cos(this.state.boss.angle * 0.7) * 50;
            }
        }

        // Spawn enemies (not during boss phase)
        if (!this.state.bossPhase) {
            this.state.spawnTimer += dt;
            const dynamicSpawnRate = Math.max(25, this.state.spawnRate - this.state.wave * 8 - this.state.frameCount * 0.01);
            if (this.state.spawnTimer >= dynamicSpawnRate) {
                this.spawnEnemy();
                this.state.spawnTimer = 0;
            }
        }

        const livesEl = document.getElementById('sb-lives');
        const scoreEl = document.getElementById('sb-score');
        const waveEl = document.getElementById('sb-wave');
        const self = this;

        this.state.enemies = this.state.enemies.filter(enemy => {
            if (self.state.gameMode === 'fall') {
                enemy.y += enemy.vy * self.state.enemySpeed * dt;

                if (enemy.y > self.walletZone.y) {
                    self.state.lives--;
                    self.state.explosions.push({ x: enemy.x, y: enemy.y, life: 25, icon: '💔' });
                    if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

                    if (self.state.lives <= 0) {
                        self.state.gameOver = true;
                        endGame(self.gameId, self.state.score);
                    }
                    return false;
                }
            } else {
                enemy.lifespan -= self.state.enemySpeed * 0.5 * dt;
                if (enemy.lifespan <= 0) {
                    self.state.lives--;
                    self.state.explosions.push({ x: enemy.x, y: enemy.y, life: 25, icon: '💔' });
                    if (livesEl) livesEl.innerHTML = '❤️'.repeat(Math.max(0, self.state.lives));

                    if (self.state.lives <= 0) {
                        self.state.gameOver = true;
                        endGame(self.gameId, self.state.score);
                    }
                    return false;
                }
            }
            return true;
        });

        if (this.state.score >= this.state.wave * 300) {
            this.state.wave++;
            if (waveEl) waveEl.textContent = this.state.wave;
            this.state.baseSpeed += 0.3;
        }

        this.state.explosions = this.state.explosions.filter(exp => {
            exp.life -= dt;
            return exp.life > 0;
        });

        // Update power-ups
        const crosshair = this.state.crosshair;
        this.state.powerUps = this.state.powerUps.filter(powerUp => {
            powerUp.y += powerUp.vy * dt;
            powerUp.life -= dt;

            // Check collection (click near power-up)
            const dx = crosshair.x - powerUp.x;
            const dy = crosshair.y - powerUp.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 40) {
                self.collectPowerUp(powerUp);
                return false;
            }

            return powerUp.life > 0 && powerUp.y < this.canvas.height;
        });

        if (scoreEl) scoreEl.textContent = this.state.score;
        updateScore(this.gameId, this.state.score);
    },

    /**
     * Draw game
     */
    draw() {
        const ctx = this.ctx;

        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.5, '#151530');
        bgGrad.addColorStop(1, '#1a1a3a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw enemies
        this.state.enemies.forEach(enemy => {
            // Pop mode timer ring
            if (this.state.gameMode === 'pop' && enemy.lifespan !== undefined) {
                const progress = enemy.lifespan / enemy.maxLife;
                const radius = enemy.size + 8;

                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
                ctx.stroke();

                const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#fbbf24' : '#ef4444';
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
                ctx.stroke();
            }

            // Shield glow for shielded enemies
            if (enemy.shield || enemy.hp > 1) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#3b82f6';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // HP indicator
                if (enemy.maxHp > 1) {
                    ctx.fillStyle = '#3b82f6';
                    ctx.font = '12px Arial';
                    ctx.fillText(`${enemy.hp}/${enemy.maxHp}`, enemy.x, enemy.y + enemy.size * 0.6);
                }
            }

            // Slowed indicator
            if (enemy.slowed) {
                ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, enemy.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.font = `${enemy.size}px Arial`;
            ctx.fillText(enemy.icon, enemy.x, enemy.y);
        });

        // Draw boss
        if (this.state.boss) {
            const boss = this.state.boss;

            // Boss glow
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 30;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, boss.size * 0.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Boss icon
            ctx.font = `${boss.size}px Arial`;
            ctx.fillText(boss.icon, boss.x, boss.y);
        }

        // Draw power-ups
        this.state.powerUps.forEach(powerUp => {
            const pulse = Math.sin(this.state.frameCount * 0.1) * 0.2 + 1;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            ctx.font = `${24 * pulse}px Arial`;
            ctx.fillText(powerUp.icon, powerUp.x, powerUp.y);
            ctx.shadowBlur = 0;
        });

        this.state.explosions.forEach(exp => {
            ctx.globalAlpha = exp.life / 25;
            const scale = 1 + (25 - exp.life) * 0.06;
            ctx.font = `${35 * scale}px Arial`;
            ctx.fillText(exp.icon, exp.x, exp.y);
        });
        ctx.globalAlpha = 1;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.state.crosshair.x, this.state.crosshair.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.state.crosshair.x - 25, this.state.crosshair.y);
        ctx.lineTo(this.state.crosshair.x - 8, this.state.crosshair.y);
        ctx.moveTo(this.state.crosshair.x + 8, this.state.crosshair.y);
        ctx.lineTo(this.state.crosshair.x + 25, this.state.crosshair.y);
        ctx.moveTo(this.state.crosshair.x, this.state.crosshair.y - 25);
        ctx.lineTo(this.state.crosshair.x, this.state.crosshair.y - 8);
        ctx.moveTo(this.state.crosshair.x, this.state.crosshair.y + 8);
        ctx.lineTo(this.state.crosshair.x, this.state.crosshair.y + 25);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(this.state.crosshair.x, this.state.crosshair.y, 3, 0, Math.PI * 2);
        ctx.fill();
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

        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.handleMove);
            this.canvas.removeEventListener('click', this.handleClick);
            this.canvas.removeEventListener('touchmove', this.handleMove);
            this.canvas.removeEventListener('touchstart', this.handleClick);
        }

        this.canvas = null;
        this.ctx = null;
        this.state = null;
    }
};

// Export
if (typeof window !== 'undefined') {
    window.ScamBlaster = ScamBlaster;
}
