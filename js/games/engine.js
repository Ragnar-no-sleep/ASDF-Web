/**
 * ASDF Games - Game Engine
 * Core game logic and implementations
 *
 * SECURITY: Integrates with AntiCheat system for score validation
 */

'use strict';

let activeGames = {};
// activeGameModes is defined in state.js (loaded before engine.js)
const activeGameSessions = {}; // Anti-cheat session tracking

/**
 * Sanitize number for security
 */
function sanitizeNumber(value, min, max, defaultValue) {
    const num = Number(value);
    if (!Number.isFinite(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
}

function startGame(gameId) {
    if (!isValidGameId(gameId)) return;

    // Check if starting in competitive mode
    const isCompetitive = activeGameModes[gameId] === 'competitive';
    if (isCompetitive) {
        // Verify we can still play competitive and start session
        if (!canPlayCompetitive(gameId)) {
            alert('Mode compétitif non disponible. Basculement vers le mode entraînement.');
            activeGameModes[gameId] = 'practice';
            const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);
            const practiceBtn = document.getElementById(`practice-btn-${gameId}`);
            if (competitiveBtn) competitiveBtn.classList.remove('active');
            if (practiceBtn) practiceBtn.classList.add('active');
        } else {
            // Start competitive session timer
            if (!startCompetitiveSession()) {
                alert('Temps compétitif épuisé pour aujourd\'hui! Basculement vers le mode entraînement.');
                activeGameModes[gameId] = 'practice';
                const competitiveBtn = document.getElementById(`competitive-btn-${gameId}`);
                const practiceBtn = document.getElementById(`practice-btn-${gameId}`);
                if (competitiveBtn) competitiveBtn.classList.remove('active');
                if (practiceBtn) practiceBtn.classList.add('active');
            }
        }
    }

    // Start anti-cheat session
    if (typeof AntiCheat !== 'undefined') {
        const session = AntiCheat.startSession(gameId);
        activeGameSessions[gameId] = session.id;
    }

    const overlay = document.getElementById(`overlay-${gameId}`);
    if (overlay) overlay.classList.add('hidden');

    requestAnimationFrame(() => {
        initializeGame(gameId);
    });
}

/**
 * Record a game action for anti-cheat tracking
 */
function recordGameAction(gameId, actionType, data = {}) {
    const sessionId = activeGameSessions[gameId];
    if (sessionId && typeof AntiCheat !== 'undefined') {
        AntiCheat.recordAction(sessionId, actionType, data);
    }
}

/**
 * Record a score update for anti-cheat tracking
 */
function recordScoreUpdate(gameId, score, delta) {
    const sessionId = activeGameSessions[gameId];
    if (sessionId && typeof AntiCheat !== 'undefined') {
        AntiCheat.recordScore(sessionId, score, delta);
    }
}

function initializeGame(gameId) {
    switch(gameId) {
        case 'tokencatcher':
            startTokenCatcher(gameId);
            break;
        case 'burnrunner':
            startBurnRunner(gameId);
            break;
        case 'scamblaster':
            startScamBlaster(gameId);
            break;
        case 'cryptoheist':
            startCryptoHeist(gameId);
            break;
        case 'pumparena':
            startPumpArena(gameId);
            break;
        case 'whalewatch':
            startWhaleWatch(gameId);
            break;
        case 'stakestacker':
            startStakeStacker(gameId);
            break;
        case 'dexdash':
            startDexDash(gameId);
            break;
        case 'burnorhold':
            startBurnOrHold(gameId);
            break;
        case 'liquiditymaze':
            startLiquidityMaze(gameId);
            break;
        default:
            // Game not implemented
    }
}

function stopGame(gameId) {
    if (activeGames[gameId]) {
        if (activeGames[gameId].interval) {
            clearInterval(activeGames[gameId].interval);
        }
        if (activeGames[gameId].cleanup) {
            activeGames[gameId].cleanup();
        }
        delete activeGames[gameId];
    }
}

function updateScore(gameId, score) {
    const scoreEl = document.getElementById(`score-${gameId}`);
    if (scoreEl) scoreEl.textContent = score;

    if (score > (appState.practiceScores[gameId] || 0)) {
        appState.practiceScores[gameId] = score;
        const bestEl = document.getElementById(`best-${gameId}`);
        if (bestEl) bestEl.textContent = score;
        saveState();
    }
}

async function endGame(gameId, finalScore) {
    if (!isValidGameId(gameId)) return;

    const safeScore = sanitizeNumber(finalScore, 0, 999999999, 0);
    updateScore(gameId, safeScore);
    stopGame(gameId);

    const isCompetitive = activeGameModes[gameId] === 'competitive';

    // End anti-cheat session and get validation data
    let sessionData = null;
    const sessionId = activeGameSessions[gameId];
    if (sessionId && typeof AntiCheat !== 'undefined') {
        sessionData = AntiCheat.endSession(sessionId, safeScore);
        delete activeGameSessions[gameId];

        if (sessionData && !sessionData.valid) {
            console.warn(`Session flagged for ${gameId}:`, sessionData.flags);
        }
    }

    let apiResult = null;
    let submitError = null;

    if (appState.wallet) {
        try {
            // Include anti-cheat session data with score submission
            apiResult = await ApiClient.submitScore(gameId, safeScore, isCompetitive, sessionData);
            if (apiResult.isNewBest) {
                appState.practiceScores[gameId] = apiResult.bestScore;
                saveState();
                document.getElementById(`best-${gameId}`).textContent = apiResult.bestScore;
            }
        } catch (error) {
            console.error('Failed to submit score:', error);
            submitError = error.message;
            if (safeScore > (appState.practiceScores[gameId] || 0)) {
                appState.practiceScores[gameId] = safeScore;
                saveState();
            }
        }
    } else {
        if (safeScore > (appState.practiceScores[gameId] || 0)) {
            appState.practiceScores[gameId] = safeScore;
            saveState();
        }
    }

    const arena = document.getElementById(`arena-${gameId}`);
    if (arena) {
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = `gameover-${gameId}`;
        gameOverDiv.className = 'game-over-overlay';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'game-over-title';
        titleDiv.textContent = 'GAME OVER';

        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'game-over-score';
        scoreDiv.textContent = `Score: ${safeScore.toLocaleString()}`;

        if (apiResult?.isNewBest) {
            const newBestDiv = document.createElement('div');
            newBestDiv.className = 'game-over-new-best';
            newBestDiv.textContent = 'NEW BEST SCORE!';
            gameOverDiv.appendChild(titleDiv);
            gameOverDiv.appendChild(newBestDiv);
        } else {
            gameOverDiv.appendChild(titleDiv);
        }

        gameOverDiv.appendChild(scoreDiv);

        if (isCompetitive && apiResult?.rank) {
            const rankDiv = document.createElement('div');
            rankDiv.className = 'game-over-rank';
            rankDiv.textContent = `Weekly Rank: #${apiResult.rank}`;
            gameOverDiv.appendChild(rankDiv);
        }

        if (submitError) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'game-over-error';
            errorDiv.textContent = `(Score saved locally - ${submitError})`;
            gameOverDiv.appendChild(errorDiv);
        }

        const restartBtn = document.createElement('button');
        restartBtn.className = 'btn btn-primary game-over-restart';
        restartBtn.textContent = 'PLAY AGAIN';
        restartBtn.addEventListener('click', () => restartGame(gameId));

        gameOverDiv.appendChild(restartBtn);
        arena.appendChild(gameOverDiv);
    }
}

// ============================================
// GAME IMPLEMENTATIONS - Placeholder stubs
// Full implementations are in games-impl.js
// ============================================

function startTokenCatcher(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        timeLeft: 30,
        gameOver: false,
        basketPos: 50,
        basketLane: 1, // 0=top, 1=middle, 2=bottom (3 lanes)
        moveDirection: 0,
        moveSpeed: 5, // Reduced from 8
        moveAccel: 0,
        maxAccel: 12, // Reduced from 20
        tokens: [],
        projectiles: [], // Player shots
        enemies: [], // Multi-hit enemies
        effects: [],
        keys: { left: false, right: false, up: false, down: false },
        lastShot: 0,
        shootCooldown: 250, // ms between shots
        mouseX: 0,
        mouseY: 0
    };

    const goodTokens = ['🔥', '💰', '⭐', '💎', '🪙'];
    const scamTokens = ['🚨', '❌', '🦠']; // Shootable malus
    const skullToken = '💀'; // Instant death (not shootable)

    // Enemies that require multiple hits
    const enemyTypes = [
        { icon: '👾', name: 'INVADER', hp: 3, points: 50, speed: 1.5 },
        { icon: '🤖', name: 'BOT', hp: 3, points: 40, speed: 1.8 },
        { icon: '👹', name: 'DEMON', hp: 3, points: 60, speed: 1.2 }
    ];

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 50%,#1a1a2e 100%);">
            <canvas id="tc-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:15px;display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:12px;">SCORE</span>
                    <div style="color:var(--gold);font-size:20px;font-weight:bold;" id="tc-score">0</div>
                </div>
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:12px;">TIME</span>
                    <div style="color:var(--accent-fire);font-size:20px;font-weight:bold;" id="tc-time">30</div>
                </div>
            </div>
            <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:10px;text-align:center;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;">
                QZSD/Arrows: Move | SPACE/Click: Shoot | 💀 = Death!
            </div>
        </div>
    `;

    const canvas = document.getElementById('tc-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('tc-score');
    const timeEl = document.getElementById('tc-time');

    let moveInterval = null;
    const basketWidth = 80;
    const basketHeight = 40;
    let laneHeight = 0; // Will be calculated based on canvas height
    let lanePositions = []; // Y positions for 3 lanes

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // Calculate 3 lane positions (bottom area of screen)
        laneHeight = 50;
        const bottomMargin = 40;
        lanePositions = [
            canvas.height - bottomMargin - laneHeight * 2.5,  // Lane 0 (top)
            canvas.height - bottomMargin - laneHeight * 1.5,  // Lane 1 (middle)
            canvas.height - bottomMargin - laneHeight * 0.5   // Lane 2 (bottom)
        ];
    }
    resizeCanvas();

    function spawnToken() {
        if (state.gameOver) return;
        const roll = Math.random();

        if (roll < 0.1) {
            // 10% chance: Skull (instant death)
            state.tokens.push({
                x: 30 + Math.random() * (canvas.width - 60),
                y: -30,
                icon: skullToken,
                isSkull: true,
                isScam: false,
                speed: 3 + Math.random() * 2 // Faster
            });
        } else if (roll < 0.25) {
            // 15% chance: Scam token (shootable)
            state.tokens.push({
                x: 30 + Math.random() * (canvas.width - 60),
                y: -30,
                icon: scamTokens[Math.floor(Math.random() * scamTokens.length)],
                isSkull: false,
                isScam: true,
                speed: 3.5 + Math.random() * 2.5 // Faster
            });
        } else {
            // 75% chance: Good token
            state.tokens.push({
                x: 30 + Math.random() * (canvas.width - 60),
                y: -30,
                icon: goodTokens[Math.floor(Math.random() * goodTokens.length)],
                isSkull: false,
                isScam: false,
                speed: 3 + Math.random() * 2.5 // Faster
            });
        }
    }

    function spawnEnemy() {
        if (state.gameOver) return;
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        state.enemies.push({
            x: 30 + Math.random() * (canvas.width - 60),
            y: -40,
            ...type,
            currentHp: type.hp,
            speed: type.speed + Math.random() * 0.5
        });
    }

    function shoot(targetX, targetY) {
        const now = Date.now();
        if (now - state.lastShot < state.shootCooldown) return;
        state.lastShot = now;

        const basketY = lanePositions[state.basketLane];
        const startX = state.basketPos;
        const startY = basketY - 30;

        // Calculate direction towards target (mouse position)
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.hypot(dx, dy);

        // Normalize and set speed
        const speed = 14;
        const vx = dist > 0 ? (dx / dist) * speed : 0;
        const vy = dist > 0 ? (dy / dist) * speed : -speed; // Default up if no target

        state.projectiles.push({
            x: startX,
            y: startY,
            vx: vx,
            vy: vy
        });
        addEffect(startX, startY, '•', '#fbbf24');
    }

    function moveBasket() {
        // Horizontal movement with acceleration (reduced speed)
        if (state.keys.left || state.keys.right) {
            state.moveAccel = Math.min(state.moveAccel + 0.6, state.maxAccel);
            const step = state.moveSpeed + state.moveAccel;
            if (state.keys.left) state.basketPos -= step;
            if (state.keys.right) state.basketPos += step;
            state.basketPos = Math.max(basketWidth / 2, Math.min(canvas.width - basketWidth / 2, state.basketPos));
        } else {
            state.moveAccel = 0;
        }
    }

    function addEffect(x, y, text, color) {
        state.effects.push({ x, y, text, color, life: 30, vy: -2 });
    }

    function update() {
        if (state.gameOver) return;

        // Move basket
        moveBasket();

        const basketX = state.basketPos;
        const basketY = lanePositions[state.basketLane];

        // Update projectiles
        state.projectiles = state.projectiles.filter(proj => {
            // Move projectile in its direction
            proj.x += proj.vx;
            proj.y += proj.vy;

            // Check collision with scam tokens (shootable)
            for (let i = state.tokens.length - 1; i >= 0; i--) {
                const token = state.tokens[i];
                if (token.isScam && !token.isSkull) {
                    const dist = Math.hypot(proj.x - token.x, proj.y - token.y);
                    if (dist < 25) {
                        state.tokens.splice(i, 1);
                        state.score += 15;
                        addEffect(token.x, token.y, '+15', '#a855f7');
                        scoreEl.textContent = state.score;
                        updateScore(gameId, state.score);
                        return false;
                    }
                }
            }

            // Check collision with enemies
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                const enemy = state.enemies[i];
                const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
                if (dist < 30) {
                    enemy.currentHp--;
                    addEffect(enemy.x, enemy.y, `-${enemy.currentHp > 0 ? '1' : enemy.points}`, enemy.currentHp > 0 ? '#f59e0b' : '#22c55e');
                    if (enemy.currentHp <= 0) {
                        state.enemies.splice(i, 1);
                        state.score += enemy.points;
                        addEffect(enemy.x, enemy.y - 20, `+${enemy.points}`, '#22c55e');
                        scoreEl.textContent = state.score;
                        updateScore(gameId, state.score);
                    }
                    return false;
                }
            }

            // Remove if out of bounds (any direction)
            return proj.y > -10 && proj.y < canvas.height + 10 && proj.x > -10 && proj.x < canvas.width + 10;
        });

        // Update tokens
        state.tokens = state.tokens.filter(token => {
            token.y += token.speed;

            // Check collision with basket
            if (token.y + 15 >= basketY - basketHeight / 2 &&
                token.y - 15 <= basketY + basketHeight / 2 &&
                token.x >= basketX - basketWidth / 2 &&
                token.x <= basketX + basketWidth / 2) {

                if (token.isSkull) {
                    // Skull = instant game over!
                    addEffect(token.x, token.y, 'GAME OVER!', '#ef4444');
                    recordGameAction(gameId, 'catch_skull', { score: state.score });
                    state.gameOver = true;
                    setTimeout(() => endGame(gameId, state.score), 500);
                    return false;
                } else if (token.isScam) {
                    state.score = Math.max(0, state.score - 20);
                    addEffect(token.x, token.y, '-20', '#ef4444');
                    recordGameAction(gameId, 'catch_scam', { score: state.score });
                } else {
                    state.score += 10;
                    addEffect(token.x, token.y, '+10', '#22c55e');
                    recordGameAction(gameId, 'catch_token', { score: state.score });
                }
                recordScoreUpdate(gameId, state.score, token.isScam ? -20 : 10);
                scoreEl.textContent = state.score;
                updateScore(gameId, state.score);
                return false;
            }

            return token.y < canvas.height + 30;
        });

        // Update enemies
        state.enemies = state.enemies.filter(enemy => {
            enemy.y += enemy.speed;

            // Check collision with basket
            if (enemy.y + 20 >= basketY - basketHeight / 2 &&
                enemy.y - 20 <= basketY + basketHeight / 2 &&
                enemy.x >= basketX - basketWidth / 2 &&
                enemy.x <= basketX + basketWidth / 2) {
                // Enemy collision = damage
                state.score = Math.max(0, state.score - 30);
                addEffect(enemy.x, enemy.y, '-30', '#ef4444');
                scoreEl.textContent = state.score;
                updateScore(gameId, state.score);
                return false;
            }

            return enemy.y < canvas.height + 40;
        });

        // Update effects
        state.effects = state.effects.filter(e => {
            e.y += e.vy;
            e.life--;
            return e.life > 0;
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw lane indicators (subtle lines)
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        lanePositions.forEach((y, i) => {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
            // Lane indicator on left
            ctx.fillStyle = i === state.basketLane ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.1)';
            ctx.fillRect(0, y - laneHeight / 2, 5, laneHeight);
        });

        // Draw projectiles
        ctx.fillStyle = '#fbbf24';
        state.projectiles.forEach(proj => {
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
            ctx.fill();
            // Trail effect
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y + 8, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Draw falling tokens
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.tokens.forEach(token => {
            // Skull has red glow
            if (token.isSkull) {
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 15;
            } else if (token.isScam) {
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 10;
            }
            ctx.fillText(token.icon, token.x, token.y);
            ctx.shadowBlur = 0;
        });

        // Draw enemies with HP indicator
        ctx.font = '35px Arial';
        state.enemies.forEach(enemy => {
            ctx.fillText(enemy.icon, enemy.x, enemy.y);
            // HP bar
            const barWidth = 30;
            const barHeight = 4;
            const hpRatio = enemy.currentHp / enemy.hp;
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(enemy.x - barWidth / 2, enemy.y + 22, barWidth, barHeight);
            ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#f59e0b' : '#ef4444';
            ctx.fillRect(enemy.x - barWidth / 2, enemy.y + 22, barWidth * hpRatio, barHeight);
            // HP text
            ctx.font = '10px Arial';
            ctx.fillStyle = '#fff';
            ctx.fillText(`${enemy.currentHp}/${enemy.hp}`, enemy.x, enemy.y + 35);
            ctx.font = '35px Arial';
        });

        // Draw basket (player)
        const basketX = state.basketPos;
        const basketY = lanePositions[state.basketLane];

        ctx.fillStyle = '#ffffff';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧺', basketX, basketY);

        // Draw current lane highlight under basket
        ctx.fillStyle = 'rgba(251,191,36,0.15)';
        ctx.fillRect(basketX - basketWidth / 2, basketY - laneHeight / 2, basketWidth, laneHeight);

        // Draw aiming line to mouse cursor
        if (state.mouseX > 0 || state.mouseY > 0) {
            ctx.strokeStyle = 'rgba(251,191,36,0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(basketX, basketY - 30);
            ctx.lineTo(state.mouseX, state.mouseY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Crosshair at mouse position
            ctx.strokeStyle = 'rgba(251,191,36,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(state.mouseX, state.mouseY, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(state.mouseX - 15, state.mouseY);
            ctx.lineTo(state.mouseX + 15, state.mouseY);
            ctx.moveTo(state.mouseX, state.mouseY - 15);
            ctx.lineTo(state.mouseX, state.mouseY + 15);
            ctx.stroke();
        }

        // Draw effects
        ctx.font = 'bold 18px Arial';
        state.effects.forEach(e => {
            ctx.globalAlpha = e.life / 30;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, e.x, e.y);
        });
        ctx.globalAlpha = 1;
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Spawn tokens periodically
    const spawnInterval = setInterval(() => {
        if (!state.gameOver) spawnToken();
    }, 500);

    // Timer countdown
    const timerInterval = setInterval(() => {
        if (state.gameOver) return;
        state.timeLeft--;
        timeEl.textContent = state.timeLeft;
        if (state.timeLeft <= 0) {
            state.gameOver = true;
            endGame(gameId, state.score);
        }
    }, 1000);

    // Keyboard controls (QZSD for AZERTY + Arrow keys)
    function handleKeyDown(e) {
        if (state.gameOver) return;
        const key = e.key.toLowerCase();

        // Horizontal movement: Q/ArrowLeft = left, D/ArrowRight = right
        if (key === 'q' || key === 'arrowleft') {
            state.keys.left = true;
            e.preventDefault();
        } else if (key === 'd' || key === 'arrowright') {
            state.keys.right = true;
            e.preventDefault();
        }

        // Vertical movement: Z/ArrowUp = up lane, S/ArrowDown = down lane
        if (key === 'z' || key === 'arrowup') {
            if (state.basketLane > 0) {
                state.basketLane--;
                recordGameAction(gameId, 'lane_change', { lane: state.basketLane });
            }
            e.preventDefault();
        } else if (key === 's' || key === 'arrowdown') {
            if (state.basketLane < 2) {
                state.basketLane++;
                recordGameAction(gameId, 'lane_change', { lane: state.basketLane });
            }
            e.preventDefault();
        }

        // Shooting: SPACE - shoots toward mouse position
        if (key === ' ' || key === 'space') {
            shoot(state.mouseX, state.mouseY);
            recordGameAction(gameId, 'shoot', { x: state.basketPos, lane: state.basketLane, targetX: state.mouseX, targetY: state.mouseY });
            e.preventDefault();
        }
    }

    function handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === 'q' || key === 'arrowleft') {
            state.keys.left = false;
        } else if (key === 'd' || key === 'arrowright') {
            state.keys.right = false;
        }
    }

    // Mouse move - track cursor position for aiming
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    // Touch/Click controls
    function handleTouch(e) {
        if (state.gameOver) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        state.basketPos = (touch.clientX - rect.left) * (canvas.width / rect.width);
        state.basketPos = Math.max(basketWidth / 2, Math.min(canvas.width - basketWidth / 2, state.basketPos));
    }

    // Click to shoot toward cursor
    function handleClick(e) {
        if (state.gameOver) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        shoot(clickX, clickY);
        recordGameAction(gameId, 'shoot_click', { x: state.basketPos, lane: state.basketLane, targetX: clickX, targetY: clickY });
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('click', handleClick);

    // Initialize basket position
    state.basketPos = canvas.width / 2;

    gameLoop();

    // Spawn enemies periodically (every 3-5 seconds)
    const enemySpawnInterval = setInterval(() => {
        if (!state.gameOver && Math.random() < 0.6) spawnEnemy();
    }, 3000);

    activeGames[gameId] = {
        interval: spawnInterval,
        cleanup: () => {
            state.gameOver = true;
            clearInterval(spawnInterval);
            clearInterval(timerInterval);
            clearInterval(enemySpawnInterval);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('touchmove', handleTouch);
            canvas.removeEventListener('touchstart', handleTouch);
            canvas.removeEventListener('click', handleClick);
        }
    };
}

function startBurnRunner(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    // Game state with double jump and abilities
    const state = {
        score: 0,
        distance: 0,
        tokens: 0,
        speed: 4,
        baseSpeed: 4,
        gravity: 0.4,
        jumpForce: -9,
        jumpsLeft: 2,
        maxJumps: 2,
        isJumping: false,
        gameOver: false,
        player: { x: 80, y: 0, vy: 0, width: 40, height: 50 },
        ground: 0,
        obstacles: [],
        platforms: [], // Jumpable platforms (ground + aerial)
        collectibles: [],
        bonusItems: [], // Bonus collectibles
        malusItems: [], // Malus items
        particles: [],
        clouds: [],
        buildings: [],
        lastObstacle: 0,
        lastPlatform: 0,
        lastAerialPlatform: 0,
        lastBrickStructure: 0,
        lastCollectible: 0,
        lastBonus: 0,
        lastMalus: 0,
        frameCount: 0,
        // Abilities
        dash: {
            active: false,
            endTime: 0,
            lastUsed: 0,
            cooldown: 3500, // 3.5 seconds
            duration: 300,  // 0.3 seconds dash
            speed: 15       // Dash speed boost
        },
        abilityShield: {
            active: false,
            endTime: 0,
            lastUsed: 0,
            cooldown: 10000, // 10 seconds
            duration: 1500   // 1.5 seconds
        },
        // Active effects
        effects: {
            shield: false,
            shieldEnd: 0,
            slow: false,
            slowEnd: 0,
            speedBoost: false,
            speedBoostEnd: 0,
            freeze: false,
            freezeEnd: 0
        }
    };

    // Render game UI
    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;">
            <canvas id="br-canvas" style="width:100%;height:100%;"></canvas>
            <!-- Stats and Abilities (left side, stacked vertically) -->
            <div style="position:absolute;top:15px;left:15px;display:flex;flex-direction:column;gap:10px;">
                <!-- Stats Row -->
                <div style="display:flex;gap:12px;">
                    <div style="background:rgba(0,0,0,0.6);padding:8px 16px;border-radius:8px;backdrop-filter:blur(4px);">
                        <span style="color:#a78bfa;font-size:11px;">DISTANCE</span>
                        <div style="color:#fbbf24;font-size:18px;font-weight:bold;" id="br-distance">0m</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.6);padding:8px 16px;border-radius:8px;backdrop-filter:blur(4px);">
                        <span style="color:#a78bfa;font-size:11px;">TOKENS</span>
                        <div style="color:#f97316;font-size:18px;font-weight:bold;" id="br-tokens">0 🔥</div>
                    </div>
                </div>
                <!-- Abilities Row (below stats) -->
                <div style="display:flex;gap:10px;">
                    <div id="br-dash-ability" style="background:rgba(0,0,0,0.7);padding:6px 10px;border-radius:8px;border:2px solid #3b82f6;min-width:55px;text-align:center;">
                        <div style="font-size:16px;">💨</div>
                        <div style="font-size:8px;color:#3b82f6;font-weight:bold;">DASH [LMB]</div>
                        <div id="br-dash-cd" style="font-size:10px;color:#22c55e;">READY</div>
                    </div>
                    <div id="br-shield-ability" style="background:rgba(0,0,0,0.7);padding:6px 10px;border-radius:8px;border:2px solid #a855f7;min-width:55px;text-align:center;">
                        <div style="font-size:16px;">🛡️</div>
                        <div style="font-size:8px;color:#a855f7;font-weight:bold;">SHIELD [RMB]</div>
                        <div id="br-shield-cd" style="font-size:10px;color:#22c55e;">READY</div>
                    </div>
                </div>
            </div>
            <!-- Jumps (right side) -->
            <div style="position:absolute;top:15px;right:15px;display:flex;gap:10px;">
                <div style="background:rgba(0,0,0,0.6);padding:6px 12px;border-radius:8px;backdrop-filter:blur(4px);">
                    <span style="color:#a78bfa;font-size:11px;">JUMPS</span>
                    <div id="br-jumps" style="font-size:16px;">⬆️⬆️</div>
                </div>
            </div>
            <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#a78bfa;font-size:11px;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:4px;">
                SPACE: Jump (x2) | Left Click: Dash | Right Click: Shield
            </div>
        </div>
    `;

    const canvas = document.getElementById('br-canvas');
    const ctx = canvas.getContext('2d');
    const distanceEl = document.getElementById('br-distance');
    const tokensEl = document.getElementById('br-tokens');
    const jumpsEl = document.getElementById('br-jumps');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // Ground higher to leave space for UI at bottom
        state.ground = canvas.height - 80;
        state.player.y = state.ground - state.player.height;
        initBackground();
    }

    function initBackground() {
        // Create clouds
        state.clouds = [];
        for (let i = 0; i < 5; i++) {
            state.clouds.push({
                x: Math.random() * canvas.width,
                y: 20 + Math.random() * 60,
                size: 20 + Math.random() * 30,
                speed: 0.2 + Math.random() * 0.3
            });
        }
        // Create background buildings
        state.buildings = [];
        for (let i = 0; i < 8; i++) {
            state.buildings.push({
                x: i * (canvas.width / 6),
                width: 40 + Math.random() * 60,
                height: 60 + Math.random() * 80,
                color: `hsl(${260 + Math.random() * 20}, 40%, ${15 + Math.random() * 10}%)`
            });
        }
    }
    resizeCanvas();

    // Deadly obstacles (kill on touch) - More variety!
    const obstacleTypes = [
        { icon: '💀', name: 'SCAM', width: 35, height: 40, deadly: true },
        { icon: '🚫', name: 'RUG', width: 35, height: 35, deadly: true },
        { icon: '📉', name: 'FUD', width: 35, height: 35, deadly: true },
        { icon: '🦠', name: 'VIRUS', width: 30, height: 35, deadly: true },
        { icon: '🔥', name: 'BURN', width: 32, height: 38, deadly: true },
        { icon: '⚠️', name: 'DANGER', width: 35, height: 35, deadly: true },
        { icon: '💣', name: 'BOMB', width: 32, height: 34, deadly: true },
        { icon: '⚡', name: 'SHOCK', width: 28, height: 40, deadly: true },
        { icon: '🕳️', name: 'HOLE', width: 45, height: 20, deadly: true },
        { icon: '🗡️', name: 'SPIKE', width: 30, height: 45, deadly: true },
        { icon: '🧨', name: 'TNT', width: 35, height: 35, deadly: true },
        { icon: '☠️', name: 'SKULL', width: 38, height: 38, deadly: true },
        { icon: '🌋', name: 'LAVA', width: 40, height: 30, deadly: true },
        { icon: '🐍', name: 'SNAKE', width: 40, height: 30, deadly: true },
        { icon: '🦂', name: 'SCORPION', width: 35, height: 28, deadly: true },
        { icon: '🕷️', name: 'SPIDER', width: 32, height: 32, deadly: true }
    ];

    // Jumpable platforms (can land on top OR run through for bonus)
    const platformTypes = [
        // Ground-level platforms
        { icon: '📦', name: 'CRATE', width: 45, height: 35, points: 15 },
        { icon: '🧱', name: 'BLOCK', width: 50, height: 30, points: 10 },
        { icon: '🎁', name: 'GIFT', width: 40, height: 40, points: 25, bonus: true },
        { icon: '🏠', name: 'HOUSE', width: 50, height: 45, points: 20 },
        { icon: '🚗', name: 'CAR', width: 55, height: 35, points: 12 },
        // Additional platforms for variety
        { icon: '🏗️', name: 'SCAFFOLD', width: 60, height: 25, points: 18 },
        { icon: '🛒', name: 'CART', width: 45, height: 30, points: 14 },
        { icon: '🗄️', name: 'CABINET', width: 40, height: 50, points: 22 },
        { icon: '📺', name: 'TV', width: 45, height: 35, points: 16 },
        { icon: '🎰', name: 'SLOT', width: 40, height: 45, points: 20 },
        { icon: '🛢️', name: 'BARREL', width: 35, height: 40, points: 12 },
        { icon: '⬛', name: 'CUBE', width: 40, height: 40, points: 15 }
    ];

    // Brick construction blocks - for building structures
    const brickTypes = [
        { icon: '🧱', name: 'BRICK', width: 40, height: 25, points: 8, brick: true },
        { icon: '🟫', name: 'BROWN', width: 35, height: 25, points: 8, brick: true },
        { icon: '🟧', name: 'ORANGE', width: 35, height: 25, points: 10, brick: true },
        { icon: '⬜', name: 'WHITE', width: 35, height: 25, points: 8, brick: true },
        { icon: '🟨', name: 'YELLOW', width: 35, height: 25, points: 10, brick: true },
        { icon: '🟦', name: 'BLUE', width: 35, height: 25, points: 12, brick: true },
        { icon: '🟩', name: 'GREEN', width: 35, height: 25, points: 10, brick: true },
        { icon: '🟥', name: 'RED', width: 35, height: 25, points: 10, brick: true }
    ];

    // Aerial/floating platforms
    const aerialPlatformTypes = [
        { icon: '☁️', name: 'CLOUD', width: 70, height: 25, points: 30, floating: true },
        { icon: '🎈', name: 'BALLOON', width: 45, height: 35, points: 25, floating: true },
        { icon: '🛸', name: 'UFO', width: 55, height: 25, points: 35, floating: true },
        { icon: '🌙', name: 'MOON', width: 50, height: 30, points: 40, floating: true },
        { icon: '⭐', name: 'STAR', width: 45, height: 30, points: 35, floating: true },
        { icon: '🪂', name: 'PARA', width: 50, height: 30, points: 28, floating: true },
        { icon: '🚁', name: 'HELI', width: 60, height: 30, points: 32, floating: true },
        { icon: '🎪', name: 'TENT', width: 55, height: 35, points: 30, floating: true },
        { icon: '💎', name: 'GEM', width: 40, height: 35, points: 45, bonus: true, floating: true },
        { icon: '🌈', name: 'RAINBOW', width: 80, height: 20, points: 50, floating: true }
    ];

    // Bonus collectibles (run through to collect)
    const bonusTypes = [
        { icon: '💎', name: 'DIAMOND', width: 28, height: 28, points: 50, effect: 'score' },
        { icon: '⚡', name: 'ENERGY', width: 25, height: 30, points: 30, effect: 'speed' },
        { icon: '🌟', name: 'STAR', width: 28, height: 28, points: 25, effect: 'score' },
        { icon: '🍀', name: 'LUCK', width: 26, height: 26, points: 35, effect: 'score' },
        { icon: '🛡️', name: 'SHIELD', width: 28, height: 30, points: 20, effect: 'shield' },
        { icon: '💰', name: 'BAG', width: 30, height: 28, points: 40, effect: 'score' }
    ];

    // Malus items (run through = negative effect)
    const malusTypes = [
        { icon: '🐌', name: 'SLOW', width: 30, height: 25, effect: 'slow', duration: 2000 },
        { icon: '❄️', name: 'FREEZE', width: 28, height: 28, effect: 'freeze', duration: 500 },
        { icon: '🌀', name: 'DIZZY', width: 26, height: 26, effect: 'dizzy', duration: 1500 },
        { icon: '💨', name: 'WIND', width: 30, height: 25, effect: 'pushback', duration: 0 }
    ];

    function jump() {
        if (state.gameOver) return;
        if (state.jumpsLeft > 0) {
            state.player.vy = state.jumpForce;
            state.isJumping = true;
            state.jumpsLeft--;
            updateJumpsDisplay();
            // Double jump particle effect
            if (state.jumpsLeft === 0) {
                addJumpParticles(state.player.x + state.player.width / 2, state.player.y + state.player.height);
            }
        }
    }

    function updateJumpsDisplay() {
        jumpsEl.textContent = '⬆️'.repeat(state.jumpsLeft) + '⬛'.repeat(state.maxJumps - state.jumpsLeft);
    }

    function addJumpParticles(x, y) {
        for (let i = 0; i < 5; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 2,
                life: 20,
                icon: '💨',
                size: 12
            });
        }
    }

    function spawnObstacle() {
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        state.obstacles.push({
            x: canvas.width + 50,
            y: state.ground - type.height,
            ...type
        });
    }

    function spawnPlatform() {
        const type = platformTypes[Math.floor(Math.random() * platformTypes.length)];
        state.platforms.push({
            x: canvas.width + 50,
            y: state.ground - type.height,
            scored: false, // Track if player already got points
            collected: false, // Track if collected by running through
            ...type
        });
    }

    function spawnAerialPlatform() {
        const type = aerialPlatformTypes[Math.floor(Math.random() * aerialPlatformTypes.length)];
        // Random height in the air (between 40% and 75% of screen height from ground)
        const minHeight = state.ground * 0.25;
        const maxHeight = state.ground * 0.60;
        const y = minHeight + Math.random() * (maxHeight - minHeight);

        state.platforms.push({
            x: canvas.width + 50,
            y: y,
            scored: false,
            collected: false,
            bobOffset: Math.random() * Math.PI * 2, // For floating animation
            ...type
        });
    }

    // Spawn stacked platforms (ground + mid-air combo)
    function spawnStackedPlatforms() {
        // Ground platform
        const groundType = platformTypes[Math.floor(Math.random() * platformTypes.length)];
        state.platforms.push({
            x: canvas.width + 50,
            y: state.ground - groundType.height,
            scored: false,
            collected: false,
            ...groundType
        });

        // Platform on top (if ground platform is tall enough)
        if (groundType.height >= 35 && Math.random() > 0.5) {
            const topType = platformTypes[Math.floor(Math.random() * 5)]; // Smaller platforms
            state.platforms.push({
                x: canvas.width + 50 + (groundType.width - topType.width) / 2,
                y: state.ground - groundType.height - topType.height - 5,
                scored: false,
                collected: false,
                ...topType
            });
        }
    }

    // === BRICK CONSTRUCTION STRUCTURES ===

    // Spawn brick stairs (ascending or descending)
    function spawnBrickStairs() {
        const ascending = Math.random() > 0.5;
        const steps = 3 + Math.floor(Math.random() * 3); // 3-5 steps
        const brickType = brickTypes[Math.floor(Math.random() * brickTypes.length)];
        const stepWidth = brickType.width + 5;
        const stepHeight = brickType.height;
        const startX = canvas.width + 50;

        for (let i = 0; i < steps; i++) {
            const stepIndex = ascending ? i : (steps - 1 - i);
            const x = startX + i * stepWidth;
            const heightFromGround = (stepIndex + 1) * stepHeight;

            state.platforms.push({
                x: x,
                y: state.ground - heightFromGround,
                scored: false,
                collected: false,
                ...brickType,
                points: brickType.points + stepIndex * 2 // More points for higher steps
            });
        }

        // Add bonus collectible at the top of stairs
        if (Math.random() > 0.5) {
            const topStep = ascending ? steps - 1 : 0;
            const bonusX = startX + topStep * stepWidth + brickType.width / 2;
            const bonusY = state.ground - (steps * stepHeight) - 30;
            state.collectibles.push({
                x: bonusX,
                y: bonusY,
                width: 25,
                height: 25,
                icon: '🪙'
            });
        }
    }

    // Spawn brick tower (vertical stack)
    function spawnBrickTower() {
        const height = 2 + Math.floor(Math.random() * 4); // 2-5 bricks tall
        const brickType = brickTypes[Math.floor(Math.random() * brickTypes.length)];
        const startX = canvas.width + 50;

        for (let i = 0; i < height; i++) {
            state.platforms.push({
                x: startX,
                y: state.ground - (i + 1) * brickType.height,
                scored: false,
                collected: false,
                ...brickType,
                points: brickType.points + i * 3 // More points for higher bricks
            });
        }

        // Add aerial platform or bonus on top
        if (Math.random() > 0.4) {
            const topY = state.ground - (height + 1) * brickType.height - 20;
            if (Math.random() > 0.5) {
                // Add gift on top
                state.platforms.push({
                    x: startX,
                    y: topY,
                    scored: false,
                    collected: false,
                    icon: '🎁',
                    name: 'GIFT',
                    width: 40,
                    height: 40,
                    points: 30,
                    bonus: true
                });
            } else {
                // Add collectible
                state.collectibles.push({
                    x: startX + brickType.width / 2,
                    y: topY,
                    width: 25,
                    height: 25,
                    icon: '💎'
                });
            }
        }
    }

    // Spawn brick wall (horizontal with gaps)
    function spawnBrickWall() {
        const width = 2 + Math.floor(Math.random() * 3); // 2-4 bricks wide
        const height = 1 + Math.floor(Math.random() * 2); // 1-2 bricks tall
        const brickType = brickTypes[Math.floor(Math.random() * brickTypes.length)];
        const startX = canvas.width + 50;
        const gapIndex = Math.floor(Math.random() * width); // Random gap

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                // Skip one brick to create a gap/passage
                if (row === 0 && col === gapIndex) continue;

                state.platforms.push({
                    x: startX + col * (brickType.width + 2),
                    y: state.ground - (row + 1) * brickType.height,
                    scored: false,
                    collected: false,
                    ...brickType
                });
            }
        }
    }

    // Spawn brick pyramid
    function spawnBrickPyramid() {
        const baseWidth = 3 + Math.floor(Math.random() * 2); // 3-4 bricks base
        const brickType = brickTypes[Math.floor(Math.random() * brickTypes.length)];
        const startX = canvas.width + 50;

        for (let row = 0; row < baseWidth; row++) {
            const bricksInRow = baseWidth - row;
            const rowOffset = row * (brickType.width / 2); // Center each row

            for (let col = 0; col < bricksInRow; col++) {
                state.platforms.push({
                    x: startX + rowOffset + col * (brickType.width + 2),
                    y: state.ground - (row + 1) * brickType.height,
                    scored: false,
                    collected: false,
                    ...brickType,
                    points: brickType.points + row * 4 // More points for higher rows
                });
            }
        }

        // Crown the pyramid with a special item
        if (Math.random() > 0.3) {
            const topX = startX + (baseWidth - 1) * (brickType.width / 2) + brickType.width / 2;
            const topY = state.ground - baseWidth * brickType.height - 35;
            state.bonusItems.push({
                x: topX,
                y: topY,
                icon: '👑',
                name: 'CROWN',
                width: 30,
                height: 30,
                points: 50,
                effect: 'score'
            });
        }
    }

    // Spawn multi-level platform complex
    function spawnMultiLevelComplex() {
        const brickType = brickTypes[Math.floor(Math.random() * brickTypes.length)];
        const startX = canvas.width + 50;

        // Level 1: Ground platform (wide)
        for (let i = 0; i < 3; i++) {
            state.platforms.push({
                x: startX + i * (brickType.width + 2),
                y: state.ground - brickType.height,
                scored: false,
                collected: false,
                ...brickType
            });
        }

        // Level 2: Mid platform (offset)
        for (let i = 0; i < 2; i++) {
            state.platforms.push({
                x: startX + 60 + i * (brickType.width + 2),
                y: state.ground - brickType.height * 3,
                scored: false,
                collected: false,
                ...brickType,
                points: brickType.points + 5
            });
        }

        // Level 3: Top platform (small)
        state.platforms.push({
            x: startX + 30,
            y: state.ground - brickType.height * 5,
            scored: false,
            collected: false,
            ...brickType,
            points: brickType.points + 10
        });

        // Add collectibles at each level
        state.collectibles.push({
            x: startX + 45,
            y: state.ground - brickType.height - 30,
            width: 25,
            height: 25,
            icon: '🪙'
        });
        state.collectibles.push({
            x: startX + 90,
            y: state.ground - brickType.height * 3 - 30,
            width: 25,
            height: 25,
            icon: '🪙'
        });
        state.collectibles.push({
            x: startX + 50,
            y: state.ground - brickType.height * 5 - 35,
            width: 28,
            height: 28,
            icon: '💎'
        });
    }

    function spawnCollectible() {
        const height = 40 + Math.random() * 70;
        state.collectibles.push({
            x: canvas.width + 50,
            y: state.ground - height - 25,
            width: 25,
            height: 25,
            icon: '🪙'
        });
    }

    function spawnBonus() {
        const type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
        const height = 50 + Math.random() * 80;
        state.bonusItems.push({
            x: canvas.width + 50,
            y: state.ground - height - type.height,
            ...type
        });
    }

    function spawnMalus() {
        const type = malusTypes[Math.floor(Math.random() * malusTypes.length)];
        const height = 20 + Math.random() * 50;
        state.malusItems.push({
            x: canvas.width + 50,
            y: state.ground - height - type.height,
            ...type
        });
    }

    function applyEffect(effect, duration) {
        const now = Date.now();
        switch (effect) {
            case 'shield':
                state.effects.shield = true;
                state.effects.shieldEnd = now + 3000;
                addEffectParticles(state.player.x, state.player.y, '🛡️');
                break;
            case 'speed':
                state.effects.speedBoost = true;
                state.effects.speedBoostEnd = now + 3000;
                addEffectParticles(state.player.x, state.player.y, '⚡');
                break;
            case 'slow':
                state.effects.slow = true;
                state.effects.slowEnd = now + duration;
                break;
            case 'freeze':
                state.effects.freeze = true;
                state.effects.freezeEnd = now + duration;
                break;
            case 'pushback':
                state.player.vy = -5;
                addEffectParticles(state.player.x, state.player.y, '💨');
                break;
            case 'dizzy':
                state.effects.slow = true;
                state.effects.slowEnd = now + duration;
                break;
        }
    }

    function updateEffects() {
        const now = Date.now();
        if (state.effects.shield && now > state.effects.shieldEnd) state.effects.shield = false;
        if (state.effects.speedBoost && now > state.effects.speedBoostEnd) state.effects.speedBoost = false;
        if (state.effects.slow && now > state.effects.slowEnd) state.effects.slow = false;
        if (state.effects.freeze && now > state.effects.freezeEnd) state.effects.freeze = false;
    }

    // Ability system
    const dashCdEl = document.getElementById('br-dash-cd');
    const shieldCdEl = document.getElementById('br-shield-cd');
    const dashAbilityEl = document.getElementById('br-dash-ability');
    const shieldAbilityEl = document.getElementById('br-shield-ability');

    function activateDash() {
        const now = Date.now();
        if (now - state.dash.lastUsed < state.dash.cooldown) return false;

        state.dash.active = true;
        state.dash.endTime = now + state.dash.duration;
        state.dash.lastUsed = now;

        // Dash particles
        for (let i = 0; i < 10; i++) {
            state.particles.push({
                x: state.player.x,
                y: state.player.y + state.player.height / 2,
                vx: -3 - Math.random() * 3,
                vy: (Math.random() - 0.5) * 2,
                life: 25,
                icon: '💨',
                size: 20
            });
        }
        return true;
    }

    function activateShield() {
        const now = Date.now();
        if (now - state.abilityShield.lastUsed < state.abilityShield.cooldown) return false;

        state.abilityShield.active = true;
        state.abilityShield.endTime = now + state.abilityShield.duration;
        state.abilityShield.lastUsed = now;

        // Shield activation particles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            state.particles.push({
                x: state.player.x + state.player.width / 2 + Math.cos(angle) * 30,
                y: state.player.y + state.player.height / 2 + Math.sin(angle) * 30,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                life: 30,
                icon: '✨',
                size: 16
            });
        }
        return true;
    }

    function updateAbilities() {
        const now = Date.now();

        // End dash if duration expired
        if (state.dash.active && now > state.dash.endTime) {
            state.dash.active = false;
        }

        // End ability shield if duration expired
        if (state.abilityShield.active && now > state.abilityShield.endTime) {
            state.abilityShield.active = false;
        }
    }

    function updateAbilityCooldowns() {
        const now = Date.now();

        // Dash cooldown display
        const dashRemaining = Math.max(0, state.dash.cooldown - (now - state.dash.lastUsed));
        if (dashRemaining > 0) {
            dashCdEl.textContent = (dashRemaining / 1000).toFixed(1) + 's';
            dashCdEl.style.color = '#ef4444';
            dashAbilityEl.style.opacity = '0.6';
        } else {
            dashCdEl.textContent = state.dash.active ? 'ACTIVE' : 'READY';
            dashCdEl.style.color = state.dash.active ? '#3b82f6' : '#22c55e';
            dashAbilityEl.style.opacity = '1';
        }

        // Shield cooldown display
        const shieldRemaining = Math.max(0, state.abilityShield.cooldown - (now - state.abilityShield.lastUsed));
        if (shieldRemaining > 0) {
            shieldCdEl.textContent = (shieldRemaining / 1000).toFixed(1) + 's';
            shieldCdEl.style.color = '#ef4444';
            shieldAbilityEl.style.opacity = '0.6';
        } else {
            shieldCdEl.textContent = state.abilityShield.active ? 'ACTIVE' : 'READY';
            shieldCdEl.style.color = state.abilityShield.active ? '#a855f7' : '#22c55e';
            shieldAbilityEl.style.opacity = '1';
        }
    }

    function addEffectParticles(x, y, icon) {
        for (let i = 0; i < 6; i++) {
            state.particles.push({
                x: x + state.player.width / 2,
                y: y + state.player.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: -Math.random() * 5 - 2,
                life: 40,
                icon: icon,
                size: 18
            });
        }
    }

    function addBurnParticles(x, y) {
        for (let i = 0; i < 8; i++) {
            state.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 4 - 2,
                life: 30,
                icon: ['🔥', '✨', '💫'][Math.floor(Math.random() * 3)],
                size: 16
            });
        }
    }

    function checkCollision(a, b) {
        const padding = 5;
        return a.x + padding < b.x + b.width - padding &&
               a.x + a.width - padding > b.x + padding &&
               a.y + padding < b.y + b.height &&
               a.y + a.height > b.y + padding;
    }

    function update() {
        if (state.gameOver) return;

        // Check freeze effect
        if (state.effects.freeze) {
            updateEffects();
            updateAbilityCooldowns();
            return;
        }

        state.frameCount++;

        // Update effects
        updateEffects();
        updateAbilities();
        updateAbilityCooldowns();

        // Calculate effective speed with effects
        let effectiveSpeed = state.baseSpeed + state.distance * 0.0015;
        effectiveSpeed = Math.min(12, effectiveSpeed);
        if (state.effects.slow) effectiveSpeed *= 0.5;
        if (state.effects.speedBoost) effectiveSpeed *= 1.5;
        // Dash speed boost
        if (state.dash.active) effectiveSpeed = state.dash.speed;
        state.speed = effectiveSpeed;

        // Update distance
        state.distance += state.speed * 0.1;

        // Player physics (smoother jump)
        state.player.vy += state.gravity;
        state.player.y += state.player.vy;

        if (state.player.y >= state.ground - state.player.height) {
            state.player.y = state.ground - state.player.height;
            state.player.vy = 0;
            state.isJumping = false;
            state.jumpsLeft = state.maxJumps;
            updateJumpsDisplay();
        }

        // Update clouds
        state.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x < -cloud.size) {
                cloud.x = canvas.width + cloud.size;
                cloud.y = 20 + Math.random() * 60;
            }
        });

        // Spawn obstacles (more frequent)
        if (state.distance - state.lastObstacle > 80 + Math.random() * 60) {
            spawnObstacle();
            state.lastObstacle = state.distance;
        }

        // Spawn ground platforms (more frequent)
        if (state.distance - state.lastPlatform > 70 + Math.random() * 50) {
            // 30% chance to spawn stacked platforms
            if (Math.random() < 0.3) {
                spawnStackedPlatforms();
            } else {
                spawnPlatform();
            }
            state.lastPlatform = state.distance;
        }

        // Spawn aerial platforms
        if (state.distance - state.lastAerialPlatform > 90 + Math.random() * 70) {
            spawnAerialPlatform();
            state.lastAerialPlatform = state.distance;
        }

        // Spawn brick structures (stairs, towers, pyramids, multi-level)
        if (state.distance - state.lastBrickStructure > 150 + Math.random() * 100) {
            const structureType = Math.random();
            if (structureType < 0.25) {
                spawnBrickStairs();
            } else if (structureType < 0.45) {
                spawnBrickTower();
            } else if (structureType < 0.60) {
                spawnBrickWall();
            } else if (structureType < 0.80) {
                spawnBrickPyramid();
            } else {
                spawnMultiLevelComplex();
            }
            state.lastBrickStructure = state.distance;
        }

        // Spawn collectibles (more frequent)
        if (state.distance - state.lastCollectible > 40 + Math.random() * 30) {
            spawnCollectible();
            state.lastCollectible = state.distance;
        }

        // Spawn bonus items
        if (state.distance - state.lastBonus > 120 + Math.random() * 100) {
            spawnBonus();
            state.lastBonus = state.distance;
        }

        // Spawn malus items (less frequent)
        if (state.distance - state.lastMalus > 200 + Math.random() * 150) {
            spawnMalus();
            state.lastMalus = state.distance;
        }

        // Update platforms (solid blocks - can land on top, blocked from sides)
        state.platforms = state.platforms.filter(plat => {
            plat.x -= state.speed;

            // Floating animation for aerial platforms
            if (plat.floating && plat.bobOffset !== undefined) {
                plat.bobOffset += 0.05;
                plat.renderY = plat.y + Math.sin(plat.bobOffset) * 8;
            } else {
                plat.renderY = plat.y;
            }

            const platY = plat.renderY || plat.y;
            const playerBottom = state.player.y + state.player.height;
            const playerTop = state.player.y;
            const playerLeft = state.player.x;
            const playerRight = state.player.x + state.player.width;
            const playerCenterX = state.player.x + state.player.width / 2;
            const platBottom = platY + plat.height;
            const platRight = plat.x + plat.width;

            // Check if player lands on top
            const onTopOf = playerBottom >= platY - 5 &&
                            playerBottom <= platY + 15 &&
                            playerCenterX > plat.x &&
                            playerCenterX < platRight &&
                            state.player.vy >= 0;

            if (onTopOf) {
                // Land on platform
                state.player.y = platY - state.player.height;
                state.player.vy = 0;
                state.isJumping = false;
                state.jumpsLeft = state.maxJumps;
                updateJumpsDisplay();

                // Give points once for landing (more points for aerial platforms)
                if (!plat.scored) {
                    plat.scored = true;
                    const pointMultiplier = plat.floating ? 2 : 1;
                    state.tokens += Math.ceil(plat.points / 10) * pointMultiplier;
                    addBurnParticles(plat.x + plat.width / 2, platY);
                }
            }

            // Solid collision - block player from passing through (non-floating platforms only)
            if (!plat.floating && !plat.bonus) {
                // Check horizontal collision (player hitting left side of block)
                const horizontalOverlap = playerRight > plat.x && playerLeft < platRight;
                const verticalOverlap = playerBottom > platY + 5 && playerTop < platBottom - 5;

                if (horizontalOverlap && verticalOverlap && !onTopOf) {
                    // Player is colliding with the side of the block
                    // Push player back (block is moving left, so push player left with it)
                    if (playerRight > plat.x && playerLeft < plat.x) {
                        // Player hitting right side - shouldn't happen often since blocks move left
                    }
                    // If player is inside the block, push them on top or game over
                    if (playerBottom > platY + 10 && playerTop < platBottom) {
                        // Check if player can be pushed on top
                        if (state.player.vy >= 0 && playerBottom - platY < 25) {
                            // Close enough to top - push up
                            state.player.y = platY - state.player.height;
                            state.player.vy = 0;
                            state.isJumping = false;
                            state.jumpsLeft = state.maxJumps;
                            updateJumpsDisplay();
                        } else if (!state.dash.active && !state.abilityShield.active) {
                            // Crushed by block - game over
                            state.gameOver = true;
                            const finalScore = Math.floor(state.distance) + state.tokens * 10;
                            endGame(gameId, finalScore);
                        }
                    }
                }
            }

            // Check if running through (gift/bonus platforms only)
            if (plat.bonus && !plat.collected && checkCollision(state.player, { ...plat, y: platY })) {
                plat.collected = true;
                state.tokens += Math.ceil(plat.points / 5);
                addBurnParticles(plat.x + plat.width / 2, platY + plat.height / 2);
            }

            return plat.x > -60;
        });

        // Update obstacles (deadly, unless shield or ability shield active)
        state.obstacles = state.obstacles.filter(obs => {
            obs.x -= state.speed;

            if (checkCollision(state.player, obs)) {
                // Check for any active shield (item shield or ability shield)
                if (state.effects.shield || state.abilityShield.active) {
                    // Shield absorbs hit
                    if (state.effects.shield) state.effects.shield = false;
                    addEffectParticles(obs.x, obs.y, '💥');
                    return false; // Remove obstacle
                } else if (state.dash.active) {
                    // Dash makes you invincible
                    addEffectParticles(obs.x, obs.y, '💨');
                    return false;
                } else {
                    state.gameOver = true;
                    const finalScore = Math.floor(state.distance) + state.tokens * 10;
                    endGame(gameId, finalScore);
                }
            }

            return obs.x > -50;
        });

        // Update collectibles
        state.collectibles = state.collectibles.filter(col => {
            col.x -= state.speed;

            if (checkCollision(state.player, col)) {
                state.tokens++;
                addBurnParticles(col.x, col.y);
                return false;
            }

            return col.x > -50;
        });

        // Update bonus items
        state.bonusItems = state.bonusItems.filter(item => {
            item.x -= state.speed;

            if (checkCollision(state.player, item)) {
                state.tokens += Math.ceil(item.points / 10);
                addEffectParticles(item.x, item.y, item.icon);
                if (item.effect !== 'score') {
                    applyEffect(item.effect, 0);
                }
                return false;
            }

            return item.x > -50;
        });

        // Update malus items
        state.malusItems = state.malusItems.filter(item => {
            item.x -= state.speed;

            if (checkCollision(state.player, item)) {
                applyEffect(item.effect, item.duration);
                addEffectParticles(item.x, item.y, item.icon);
                return false;
            }

            return item.x > -50;
        });

        // Update particles
        state.particles = state.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life--;
            return p.life > 0;
        });

        // Update UI
        distanceEl.textContent = Math.floor(state.distance) + 'm';
        tokensEl.textContent = state.tokens + ' 🔥';
        state.score = Math.floor(state.distance) + state.tokens * 10;
        updateScore(gameId, state.score);
    }

    function draw() {
        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGrad.addColorStop(0, '#0f0a1e');
        skyGrad.addColorStop(0.4, '#1a1030');
        skyGrad.addColorStop(0.7, '#2d1b4e');
        skyGrad.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw stars
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 30; i++) {
            const sx = (i * 73 + state.frameCount * 0.1) % canvas.width;
            const sy = (i * 37) % (canvas.height * 0.5);
            const size = (i % 3) + 1;
            ctx.globalAlpha = 0.3 + (Math.sin(state.frameCount * 0.05 + i) + 1) * 0.2;
            ctx.fillRect(sx, sy, size, size);
        }
        ctx.globalAlpha = 1;

        // Draw clouds
        ctx.fillStyle = 'rgba(100, 80, 140, 0.3)';
        state.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 0.6, cloud.y - 5, cloud.size * 0.7, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.size * 1.2, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw background buildings
        state.buildings.forEach((b, i) => {
            const bx = (b.x - state.distance * 0.5) % (canvas.width + 100);
            ctx.fillStyle = b.color;
            ctx.fillRect(bx, state.ground - b.height, b.width, b.height);
            // Windows
            ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
            for (let wy = state.ground - b.height + 10; wy < state.ground - 20; wy += 20) {
                for (let wx = bx + 8; wx < bx + b.width - 8; wx += 15) {
                    if (Math.random() > 0.3) ctx.fillRect(wx, wy, 6, 8);
                }
            }
        });

        // Draw ground with gradient
        const groundGrad = ctx.createLinearGradient(0, state.ground, 0, canvas.height);
        groundGrad.addColorStop(0, '#4a3070');
        groundGrad.addColorStop(1, '#2a1a40');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, state.ground, canvas.width, 50);

        // Animated ground lines
        ctx.strokeStyle = '#6b4d9a';
        ctx.lineWidth = 2;
        const offset = (state.distance * 5) % 60;
        for (let x = -offset; x < canvas.width + 60; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, state.ground);
            ctx.lineTo(x + 30, state.ground + 50);
            ctx.stroke();
        }

        // Draw platforms (jumpable obstacles) - draw before player
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.platforms.forEach(plat => {
            const platY = plat.renderY || plat.y;

            // Glow effect for floating platforms
            if (plat.floating) {
                ctx.shadowColor = '#a78bfa';
                ctx.shadowBlur = 15;
                ctx.font = '38px Arial';
            } else {
                ctx.shadowBlur = 0;
                ctx.font = '36px Arial';
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillText(plat.icon, plat.x + plat.width / 2, platY + plat.height / 2);
        });
        ctx.shadowBlur = 0;

        // Draw player with proper orientation
        ctx.fillStyle = '#ffffff';
        ctx.font = '38px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const playerCenterX = state.player.x + state.player.width / 2;
        const playerCenterY = state.player.y + state.player.height / 2;

        // Player shadow
        const shadowScale = Math.max(0.3, 1 - (state.ground - state.player.y - state.player.height) / 150);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(playerCenterX, state.ground + 5, 18 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw runner character (dog flipped to face right)
        ctx.fillStyle = '#ffffff';
        ctx.save();
        const bounce = state.isJumping ? 0 : Math.sin(state.distance * 0.4) * 2;
        const tilt = state.isJumping ? state.player.vy * 0.02 : Math.sin(state.distance * 0.4) * 0.1;
        ctx.translate(playerCenterX, playerCenterY + bounce);
        ctx.rotate(tilt);
        ctx.scale(-1, 1); // Flip horizontally to face right
        ctx.fillText('🐕', 0, 0);
        ctx.restore();

        // Trail effect when running fast or dashing
        if (state.speed > 7 || state.dash.active) {
            ctx.save();
            ctx.globalAlpha = state.dash.active ? 0.4 : 0.25;
            ctx.translate(playerCenterX - 18, playerCenterY + bounce);
            ctx.scale(-1, 1);
            ctx.fillText('🐕', 0, 0);
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = state.dash.active ? 0.2 : 0.1;
            ctx.translate(playerCenterX - 36, playerCenterY + bounce);
            ctx.scale(-1, 1);
            ctx.fillText('🐕', 0, 0);
            ctx.restore();
            if (state.dash.active) {
                ctx.save();
                ctx.globalAlpha = 0.1;
                ctx.translate(playerCenterX - 54, playerCenterY + bounce);
                ctx.scale(-1, 1);
                ctx.fillText('🐕', 0, 0);
                ctx.restore();
            }
        }
        ctx.globalAlpha = 1;

        // Draw dash effect (blue glow)
        if (state.dash.active) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw ability shield effect (purple bubble)
        if (state.abilityShield.active) {
            const shieldPulse = Math.sin(Date.now() * 0.01) * 0.15 + 0.85;
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, 35 * shieldPulse, 0, Math.PI * 2);
            ctx.stroke();
            // Inner glow
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, 32 * shieldPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        }

        // Draw deadly obstacles
        ctx.font = '32px Arial';
        state.obstacles.forEach(obs => {
            ctx.fillStyle = '#ffffff';
            ctx.fillText(obs.icon, obs.x + obs.width / 2, obs.y + obs.height / 2);
        });

        // Draw collectibles with glow
        state.collectibles.forEach(col => {
            const float = Math.sin(Date.now() * 0.005 + col.x) * 4;
            // Glow effect
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            ctx.font = '24px Arial';
            ctx.fillText(col.icon, col.x + col.width / 2, col.y + col.height / 2 + float);
            ctx.shadowBlur = 0;
        });

        // Draw bonus items with glow
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.bonusItems.forEach(item => {
            const float = Math.sin(Date.now() * 0.006 + item.x) * 5;
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 18;
            ctx.font = '28px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.icon, item.x + item.width / 2, item.y + item.height / 2 + float);
            ctx.shadowBlur = 0;
        });

        // Draw malus items with warning glow
        state.malusItems.forEach(item => {
            const float = Math.sin(Date.now() * 0.008 + item.x) * 3;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
            ctx.font = '26px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(item.icon, item.x + item.width / 2, item.y + item.height / 2 + float);
            ctx.shadowBlur = 0;
        });

        // Draw shield effect around player if active
        if (state.effects.shield) {
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.3;
            ctx.beginPath();
            ctx.arc(playerCenterX, playerCenterY, 30, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Draw speed boost effect
        if (state.effects.speedBoost) {
            ctx.globalAlpha = 0.4;
            ctx.font = '16px Arial';
            for (let i = 1; i <= 3; i++) {
                ctx.fillText('⚡', playerCenterX - 25 - i * 12, playerCenterY);
            }
            ctx.globalAlpha = 1;
        }

        // Draw slow effect
        if (state.effects.slow) {
            ctx.globalAlpha = 0.5;
            ctx.font = '20px Arial';
            ctx.fillText('🐌', playerCenterX, playerCenterY - 30);
            ctx.globalAlpha = 1;
        }

        // Draw particles
        state.particles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.font = `${p.size || 16}px Arial`;
            ctx.fillText(p.icon, p.x, p.y);
        });
        ctx.globalAlpha = 1;
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Event listeners
    function handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            jump();
        }
    }

    // Left click = Dash
    function handleClick(e) {
        e.preventDefault();
        activateDash();
    }

    // Right click = Shield
    function handleContextMenu(e) {
        e.preventDefault();
        activateShield();
    }

    // Touch = Jump (mobile)
    function handleTouch(e) {
        e.preventDefault();
        jump();
    }

    document.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouch);

    // Start game loop
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleKeyDown);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('contextmenu', handleContextMenu);
            canvas.removeEventListener('touchstart', handleTouch);
        }
    };
}

function startScamBlaster(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        lives: 3,
        wave: 1,
        gameOver: false,
        phase: 'select', // 'select', 'countdown', 'playing'
        countdown: 3,
        gameMode: null,
        crosshair: { x: 0, y: 0 },
        enemies: [],
        explosions: [],
        spawnTimer: 0,
        spawnRate: 80,
        baseSpeed: 1.5,
        enemySpeed: 1.5,
        frameCount: 0
    };

    const enemyTypes = [
        { icon: '🪙', name: 'SCAM COIN', points: 10, speed: 1, size: 40 },
        { icon: '🔴', name: 'RUG TOKEN', points: 25, speed: 1.2, size: 45 },
        { icon: '💀', name: 'HONEYPOT', points: 50, speed: 1.4, size: 50 },
        { icon: '🦠', name: 'MALWARE', points: 75, speed: 1.6, size: 40 },
        { icon: '👤', name: 'FAKE DEV', points: 100, speed: 1.3, size: 55 }
    ];

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;cursor:crosshair;">
            <canvas id="sb-canvas" style="width:100%;height:100%;"></canvas>

            <!-- MODE SELECTION SCREEN -->
            <div id="sb-mode-select" style="position:absolute;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:10;">
                <h2 style="color:var(--gold);font-size:28px;margin-bottom:10px;">🎯 SCAM BLASTER</h2>
                <p style="color:var(--text-muted);font-size:14px;margin-bottom:30px;">Choose your game mode:</p>
                <div style="display:flex;gap:20px;">
                    <button id="sb-select-fall" style="padding:20px 30px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#16a34a);border:3px solid #4ade80;color:#fff;cursor:pointer;text-align:center;transition:transform 0.2s;">
                        <div style="font-size:40px;margin-bottom:8px;">📥</div>
                        <div style="font-size:16px;font-weight:bold;">FALL MODE</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:5px;">Enemies fall down<br>Protect your wallet!</div>
                    </button>
                    <button id="sb-select-pop" style="padding:20px 30px;border-radius:12px;background:linear-gradient(135deg,#a855f7,#7c3aed);border:3px solid #c084fc;color:#fff;cursor:pointer;text-align:center;transition:transform 0.2s;">
                        <div style="font-size:40px;margin-bottom:8px;">💥</div>
                        <div style="font-size:16px;font-weight:bold;">POP MODE</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:5px;">Enemies pop up anywhere<br>Click before they vanish!</div>
                    </button>
                </div>
            </div>

            <!-- GAME HUD -->
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
                        <span style="color:#a78bfa;font-size:10px;">SPEED</span>
                        <div style="color:#22c55e;font-size:14px;font-weight:bold;" id="sb-speed">1.0x</div>
                    </div>
                </div>
                <div style="position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.7);padding:6px 14px;border-radius:8px;backdrop-filter:blur(4px);" id="sb-lives">❤️❤️❤️</div>
                <div id="sb-wallet" style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:85%;height:50px;background:linear-gradient(90deg,rgba(139,92,246,0.4),rgba(251,191,36,0.4));border:2px solid #fbbf24;border-radius:10px;display:none;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(251,191,36,0.3);">
                    <span style="font-size:22px;">💼</span>
                    <span style="margin-left:8px;color:#fbbf24;font-weight:bold;">YOUR WALLET</span>
                </div>
            </div>

            <div id="sb-countdown" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:72px;font-weight:bold;color:#fff;text-shadow:0 0 30px rgba(251,191,36,0.8);display:none;"></div>
        </div>
    `;

    const canvas = document.getElementById('sb-canvas');
    const ctx = canvas.getContext('2d');
    const modeSelectEl = document.getElementById('sb-mode-select');
    const hudEl = document.getElementById('sb-hud');
    const countdownEl = document.getElementById('sb-countdown');
    const walletEl = document.getElementById('sb-wallet');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();

    const walletZone = { y: canvas.height - 90, height: 50 };

    // Mode selection buttons
    document.getElementById('sb-select-fall').onclick = () => selectMode('fall');
    document.getElementById('sb-select-pop').onclick = () => selectMode('pop');

    function selectMode(mode) {
        state.gameMode = mode;
        modeSelectEl.style.display = 'none';
        hudEl.style.display = 'block';
        countdownEl.style.display = 'block';

        if (mode === 'fall') {
            walletEl.style.display = 'flex';
        }

        state.phase = 'countdown';
        state.countdown = 3;
        countdownEl.textContent = '3';
    }

    function spawnEnemy() {
        const type = enemyTypes[Math.min(Math.floor(Math.random() * (state.wave + 1)), enemyTypes.length - 1)];

        if (state.gameMode === 'fall') {
            state.enemies.push({
                x: Math.random() * (canvas.width - 80) + 40,
                y: -50,
                vy: type.speed * state.enemySpeed,
                ...type
            });
        } else {
            // Pop mode: appear anywhere and disappear after time
            state.enemies.push({
                x: 60 + Math.random() * (canvas.width - 120),
                y: 60 + Math.random() * (canvas.height - 180),
                vy: 0,
                lifespan: 90 + Math.random() * 60, // 1.5-2.5 seconds
                maxLife: 90 + Math.random() * 60,
                ...type
            });
        }
    }

    function shoot(x, y) {
        if (state.gameOver || state.phase !== 'playing') return;

        let hit = false;
        state.enemies = state.enemies.filter(enemy => {
            const dx = x - enemy.x;
            const dy = y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < enemy.size) {
                state.score += enemy.points;
                hit = true;
                state.explosions.push({ x: enemy.x, y: enemy.y, life: 20, icon: '💥' });
                return false;
            }
            return true;
        });

        if (!hit) {
            state.explosions.push({ x, y, life: 10, icon: '💨' });
        }
    }

    function update() {
        if (state.gameOver) return;

        // Phase handling
        if (state.phase === 'select') return;

        if (state.phase === 'countdown') {
            state.frameCount++;
            if (state.frameCount % 60 === 0) {
                state.countdown--;
                if (state.countdown <= 0) {
                    state.phase = 'playing';
                    countdownEl.style.display = 'none';
                    state.frameCount = 0;
                } else {
                    countdownEl.textContent = state.countdown;
                }
            }
            return;
        }

        // Playing phase
        state.frameCount++;

        // Progressive speed increase (accelerates over time!)
        const timeBonus = state.frameCount * 0.00003;
        state.enemySpeed = state.baseSpeed + (state.wave * 0.4) + timeBonus;

        // Update speed display
        const speedEl = document.getElementById('sb-speed');
        if (speedEl) speedEl.textContent = state.enemySpeed.toFixed(1) + 'x';

        state.spawnTimer++;
        // Faster spawn rate as game progresses
        const dynamicSpawnRate = Math.max(25, state.spawnRate - state.wave * 8 - state.frameCount * 0.01);
        if (state.spawnTimer >= dynamicSpawnRate) {
            spawnEnemy();
            state.spawnTimer = 0;
        }

        const livesEl = document.getElementById('sb-lives');
        const scoreEl = document.getElementById('sb-score');
        const waveEl = document.getElementById('sb-wave');

        // Update enemies
        state.enemies = state.enemies.filter(enemy => {
            if (state.gameMode === 'fall') {
                enemy.y += enemy.vy * state.enemySpeed;

                // Hit wallet
                if (enemy.y > walletZone.y) {
                    state.lives--;
                    state.explosions.push({ x: enemy.x, y: enemy.y, life: 25, icon: '💔' });
                    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, state.lives));

                    if (state.lives <= 0) {
                        state.gameOver = true;
                        endGame(gameId, state.score);
                    }
                    return false;
                }
            } else {
                // Pop mode: decrease lifespan faster as speed increases
                enemy.lifespan -= state.enemySpeed * 0.5;
                if (enemy.lifespan <= 0) {
                    state.lives--;
                    state.explosions.push({ x: enemy.x, y: enemy.y, life: 25, icon: '💔' });
                    if (livesEl) livesEl.textContent = '❤️'.repeat(Math.max(0, state.lives));

                    if (state.lives <= 0) {
                        state.gameOver = true;
                        endGame(gameId, state.score);
                    }
                    return false;
                }
            }
            return true;
        });

        // Wave progression every 300 points (faster waves)
        if (state.score >= state.wave * 300) {
            state.wave++;
            if (waveEl) waveEl.textContent = state.wave;
            // Base speed boost per wave
            state.baseSpeed += 0.3;
        }

        // Update explosions
        state.explosions = state.explosions.filter(exp => {
            exp.life--;
            return exp.life > 0;
        });

        if (scoreEl) scoreEl.textContent = state.score;
        updateScore(gameId, state.score);
    }

    function draw() {
        // Background gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGrad.addColorStop(0, '#0a0a1a');
        bgGrad.addColorStop(0.5, '#151530');
        bgGrad.addColorStop(1, '#1a1a3a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid pattern
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw enemies
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.enemies.forEach(enemy => {
            // In pop mode, show timer ring
            if (state.gameMode === 'pop' && enemy.lifespan !== undefined) {
                const progress = enemy.lifespan / enemy.maxLife;
                const radius = enemy.size + 8;

                // Background ring
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
                ctx.stroke();

                // Progress ring
                const color = progress > 0.5 ? '#22c55e' : progress > 0.25 ? '#fbbf24' : '#ef4444';
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
                ctx.stroke();
            }

            ctx.font = `${enemy.size}px Arial`;
            ctx.fillText(enemy.icon, enemy.x, enemy.y);
        });

        // Draw explosions
        state.explosions.forEach(exp => {
            ctx.globalAlpha = exp.life / 25;
            const scale = 1 + (25 - exp.life) * 0.06;
            ctx.font = `${35 * scale}px Arial`;
            ctx.fillText(exp.icon, exp.x, exp.y);
        });
        ctx.globalAlpha = 1;

        // Draw crosshair
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.crosshair.x, state.crosshair.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(state.crosshair.x - 25, state.crosshair.y);
        ctx.lineTo(state.crosshair.x - 8, state.crosshair.y);
        ctx.moveTo(state.crosshair.x + 8, state.crosshair.y);
        ctx.lineTo(state.crosshair.x + 25, state.crosshair.y);
        ctx.moveTo(state.crosshair.x, state.crosshair.y - 25);
        ctx.lineTo(state.crosshair.x, state.crosshair.y - 8);
        ctx.moveTo(state.crosshair.x, state.crosshair.y + 8);
        ctx.lineTo(state.crosshair.x, state.crosshair.y + 25);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(state.crosshair.x, state.crosshair.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
        state.crosshair.x = x * (canvas.width / rect.width);
        state.crosshair.y = y * (canvas.height / rect.height);
    }

    function handleClick(e) {
        handleMove(e);
        shoot(state.crosshair.x, state.crosshair.y);
    }

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchstart', handleClick);

    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            canvas.removeEventListener('mousemove', handleMove);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('touchmove', handleMove);
            canvas.removeEventListener('touchstart', handleClick);
        }
    };
}


function startCryptoHeist(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    // Crypto Heist - Top-down shooter survival
    // Enemies rush at player, player can shoot, enemies spawn continuously
    const state = {
        score: 0,
        wave: 1,
        kills: 0,
        gameOver: false,
        player: { x: 0, y: 0, size: 20, speed: 5, angle: 0 },
        enemies: [],
        bullets: [],
        tokens: [],
        effects: [],
        keys: { up: false, down: false, left: false, right: false },
        mouseX: 0,
        mouseY: 0,
        lastShot: 0,
        shootCooldown: 150, // ms between shots
        spawnTimer: 0,
        spawnRate: 70, // frames between spawns (faster = more enemies)
        enemySpeed: 1.8
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a0a2e 100%);cursor:crosshair;">
            <canvas id="ch-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:15px;display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--gold);font-size:14px;">💰 SCORE: <span id="ch-score">0</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--red);font-size:14px;">💀 KILLS: <span id="ch-kills">0</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--purple);font-size:14px;">🌊 WAVE <span id="ch-wave">1</span></span>
                </div>
            </div>
            <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:11px;text-align:center;">
                WASD to move | AIM with mouse | CLICK to shoot | Survive the enemy waves!
            </div>
        </div>
    `;

    const canvas = document.getElementById('ch-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        state.player.x = canvas.width / 2;
        state.player.y = canvas.height / 2;
    }
    resizeCanvas();

    function spawnEnemy() {
        // Spawn from edges
        const side = Math.floor(Math.random() * 4);
        let x, y;
        switch(side) {
            case 0: x = -30; y = Math.random() * canvas.height; break; // left
            case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break; // right
            case 2: x = Math.random() * canvas.width; y = -30; break; // top
            case 3: x = Math.random() * canvas.width; y = canvas.height + 30; break; // bottom
        }

        const types = [
            { icon: '👾', health: 1, speed: state.enemySpeed, value: 10, size: 18 },
            { icon: '👹', health: 2, speed: state.enemySpeed * 0.8, value: 20, size: 22 },
            { icon: '🤖', health: 3, speed: state.enemySpeed * 0.6, value: 30, size: 25 }
        ];

        // More dangerous enemies as waves progress
        const typeIndex = Math.min(Math.floor(Math.random() * Math.min(state.wave, 3)), types.length - 1);
        const type = types[typeIndex];

        state.enemies.push({
            x, y,
            ...type,
            maxHealth: type.health
        });
    }

    function spawnToken(x, y) {
        if (Math.random() < 0.3) { // 30% chance to drop token
            state.tokens.push({
                x, y,
                size: 12,
                value: 5 + state.wave * 2,
                life: 300 // disappears after 5 seconds
            });
        }
    }

    function shoot() {
        const now = Date.now();
        if (now - state.lastShot < state.shootCooldown) return;
        state.lastShot = now;

        const angle = Math.atan2(state.mouseY - state.player.y, state.mouseX - state.player.x);
        state.bullets.push({
            x: state.player.x,
            y: state.player.y,
            vx: Math.cos(angle) * 12,
            vy: Math.sin(angle) * 12,
            size: 5
        });
        recordGameAction(gameId, 'shoot', { angle });
    }

    function addEffect(x, y, text, color) {
        state.effects.push({ x, y, text, color, life: 30, vy: -2 });
    }

    function update() {
        if (state.gameOver) return;

        // Player movement
        let dx = 0, dy = 0;
        if (state.keys.up) dy -= 1;
        if (state.keys.down) dy += 1;
        if (state.keys.left) dx -= 1;
        if (state.keys.right) dx += 1;

        if (dx || dy) {
            const len = Math.sqrt(dx * dx + dy * dy);
            state.player.x += (dx / len) * state.player.speed;
            state.player.y += (dy / len) * state.player.speed;
        }

        // Bounds (with extra margin at bottom for UI)
        const bottomMargin = 50; // Keep player away from bottom UI
        state.player.x = Math.max(state.player.size, Math.min(canvas.width - state.player.size, state.player.x));
        state.player.y = Math.max(state.player.size, Math.min(canvas.height - state.player.size - bottomMargin, state.player.y));

        // Player angle towards mouse
        state.player.angle = Math.atan2(state.mouseY - state.player.y, state.mouseX - state.player.x);

        // Spawn enemies continuously
        state.spawnTimer++;
        if (state.spawnTimer >= state.spawnRate) {
            state.spawnTimer = 0;
            spawnEnemy();
        }

        // Update enemies - rush towards player
        state.enemies.forEach(enemy => {
            const dx = state.player.x - enemy.x;
            const dy = state.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }

            // Check collision with player
            if (dist < state.player.size + enemy.size) {
                state.gameOver = true;
                addEffect(state.player.x, state.player.y, 'GAME OVER!', '#ef4444');
                setTimeout(() => endGame(gameId, state.score), 500);
            }
        });

        // Update bullets
        state.bullets = state.bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Check collision with enemies
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                const enemy = state.enemies[i];
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < bullet.size + enemy.size) {
                    enemy.health--;
                    if (enemy.health <= 0) {
                        // Enemy killed
                        state.kills++;
                        state.score += enemy.value;
                        document.getElementById('ch-kills').textContent = state.kills;
                        document.getElementById('ch-score').textContent = state.score;
                        addEffect(enemy.x, enemy.y, '+' + enemy.value, '#22c55e');
                        spawnToken(enemy.x, enemy.y);
                        state.enemies.splice(i, 1);
                        recordScoreUpdate(gameId, state.score, enemy.value);

                        // Wave progression
                        if (state.kills > 0 && state.kills % 10 === 0) {
                            state.wave++;
                            state.spawnRate = Math.max(40, state.spawnRate - 10);
                            state.enemySpeed += 0.2;
                            document.getElementById('ch-wave').textContent = state.wave;
                            addEffect(canvas.width / 2, canvas.height / 2, 'WAVE ' + state.wave + '!', '#a855f7');
                        }
                    } else {
                        addEffect(enemy.x, enemy.y, '-1', '#fbbf24');
                    }
                    return false; // Remove bullet
                }
            }

            // Remove if off screen
            return bullet.x > -10 && bullet.x < canvas.width + 10 &&
                   bullet.y > -10 && bullet.y < canvas.height + 10;
        });

        // Update tokens
        state.tokens = state.tokens.filter(token => {
            token.life--;
            const dx = token.x - state.player.x;
            const dy = token.y - state.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < state.player.size + token.size) {
                state.score += token.value;
                document.getElementById('ch-score').textContent = state.score;
                addEffect(token.x, token.y, '+' + token.value, '#fbbf24');
                recordScoreUpdate(gameId, state.score, token.value);
                return false;
            }
            return token.life > 0;
        });

        // Update effects
        state.effects = state.effects.filter(e => {
            e.y += e.vy;
            e.life--;
            return e.life > 0;
        });

        updateScore(gameId, state.score);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#1a1a3e';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Draw tokens
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        state.tokens.forEach(token => {
            ctx.globalAlpha = token.life > 60 ? 1 : token.life / 60;
            ctx.fillText('🪙', token.x, token.y);
        });
        ctx.globalAlpha = 1;

        // Draw bullets
        ctx.fillStyle = '#fbbf24';
        state.bullets.forEach(bullet => {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw enemies with health bars
        state.enemies.forEach(enemy => {
            ctx.font = `${enemy.size * 1.5}px Arial`;
            ctx.fillText(enemy.icon, enemy.x, enemy.y);

            // Health bar
            if (enemy.health < enemy.maxHealth) {
                const barWidth = enemy.size * 1.5;
                const barHeight = 4;
                ctx.fillStyle = '#333';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10, barWidth, barHeight);
                ctx.fillStyle = enemy.health > 1 ? '#22c55e' : '#ef4444';
                ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 10,
                    barWidth * (enemy.health / enemy.maxHealth), barHeight);
            }
        });

        // Draw player with direction indicator
        ctx.save();
        ctx.translate(state.player.x, state.player.y);
        ctx.rotate(state.player.angle);

        // Direction line
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(40, 0);
        ctx.stroke();

        ctx.restore();

        ctx.font = '28px Arial';
        ctx.fillText('🦹', state.player.x, state.player.y);

        // Draw effects
        ctx.font = 'bold 18px Arial';
        state.effects.forEach(e => {
            ctx.globalAlpha = e.life / 30;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, e.x, e.y);
        });
        ctx.globalAlpha = 1;
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleKeyDown(e) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) { state.keys.up = true; e.preventDefault(); }
        if (['ArrowDown', 'KeyS'].includes(e.code)) { state.keys.down = true; e.preventDefault(); }
        if (['ArrowLeft', 'KeyA'].includes(e.code)) { state.keys.left = true; e.preventDefault(); }
        if (['ArrowRight', 'KeyD'].includes(e.code)) { state.keys.right = true; e.preventDefault(); }
    }

    function handleKeyUp(e) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) state.keys.up = false;
        if (['ArrowDown', 'KeyS'].includes(e.code)) state.keys.down = false;
        if (['ArrowLeft', 'KeyA'].includes(e.code)) state.keys.left = false;
        if (['ArrowRight', 'KeyD'].includes(e.code)) state.keys.right = false;
    }

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        state.mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        state.mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function handleClick(e) {
        if (!state.gameOver) {
            shoot();
        }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    // Spawn initial enemies
    for (let i = 0; i < 3; i++) {
        spawnEnemy();
    }

    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('click', handleClick);
        }
    };
}

function startPumpArena(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    // Override overflow:hidden from .game-arena CSS to allow scrolling
    arena.style.overflow = 'auto';

    // Project Builder - CCM Community Builder Partnership Game
    // Join projects, contribute to teams, build together, grow your influence
    const state = {
        score: 0,
        round: 1,
        maxRounds: 10,
        gameOver: false,
        phase: 'select', // select, builder, roadmap, scenario, result
        influence: 100,        // Your community influence points
        reputation: 0,         // Your builder reputation
        joinedProject: false,  // Has the player committed to a project?
        scenarioIndex: 0,      // Current scenario in the project storyline
        selectedType: null,
        selectedBuilder: null,
        selectedBuilderIdx: 0,
        particles: [],
        history: [],
        // Partnership tracking
        contributionsByBuilder: {}, // Track contributions per builder
        partnership: null,
        isPartner: false,
        skills: {
            dev: 0,      // Development skill
            community: 0, // Community building
            marketing: 0, // Marketing & growth
            strategy: 0   // Strategic planning
        },
        // Scenario system
        currentScenario: null,
        selectedChoice: null,
        usedScenarios: {} // Track used scenarios per category
    };

    // Project roadmap templates per category
    const roadmapTemplates = {
        defi: [
            { phase: 'Q1', title: 'Protocol Launch', tasks: ['Smart contract audit', 'Mainnet deployment', 'Initial liquidity provision'] },
            { phase: 'Q2', title: 'Growth Phase', tasks: ['CEX listings', 'Yield optimization', 'Governance token launch'] },
            { phase: 'Q3', title: 'Expansion', tasks: ['Cross-chain bridges', 'Institutional partnerships', 'Advanced strategies'] },
            { phase: 'Q4', title: 'Maturity', tasks: ['DAO transition', 'Protocol upgrades', 'Ecosystem grants'] }
        ],
        gaming: [
            { phase: 'Q1', title: 'Alpha Release', tasks: ['Core gameplay mechanics', 'NFT minting', 'Closed beta testing'] },
            { phase: 'Q2', title: 'Public Beta', tasks: ['Token economy launch', 'Marketplace integration', 'Community tournaments'] },
            { phase: 'Q3', title: 'Full Launch', tasks: ['Mobile version', 'Esports partnerships', 'In-game governance'] },
            { phase: 'Q4', title: 'Metaverse', tasks: ['Cross-game assets', 'Virtual land sales', 'Creator tools'] }
        ],
        community: [
            { phase: 'W1', title: 'Community Formation', tasks: ['Core team assembly', 'Values definition', 'First members'] },
            { phase: 'W2', title: 'Growth Phase', tasks: ['Content creation', 'Social presence', 'Partnerships'] },
            { phase: 'W3', title: 'Value Creation', tasks: ['Member benefits', 'Exclusive content', 'Events'] },
            { phase: 'W4', title: 'Sustainability', tasks: ['Revenue streams', 'Governance', 'Long-term vision'] }
        ],
        infra: [
            { phase: 'Q1', title: 'Technical Foundation', tasks: ['Architecture design', 'Security audit', 'Testnet launch'] },
            { phase: 'Q2', title: 'Network Growth', tasks: ['Node operator incentives', 'SDK release', 'Developer grants'] },
            { phase: 'Q3', title: 'Enterprise Adoption', tasks: ['B2B partnerships', 'SLA guarantees', 'Premium tiers'] },
            { phase: 'Q4', title: 'Decentralization', tasks: ['Token distribution', 'Governance launch', 'Community nodes'] }
        ]
    };

    // 4 Project Categories with 3 Teams each (different visions/needs)
    const projectTypes = {
        defi: {
            name: 'DeFi Builders',
            icon: '🏦',
            color: '#3b82f6',
            desc: 'Build the future of decentralized finance together',
            builders: [
                { name: 'SafeYield DAO', vision: 'Security-first DeFi for everyone', potential: 0.8, needs: ['Smart contract review', 'Community education', 'Documentation'], team: '15 builders', community: '2.5K members', stage: 'Growing' },
                { name: 'FlashDAO', vision: 'Democratizing advanced DeFi', potential: 0.6, needs: ['Frontend dev', 'Marketing', 'User testing'], team: '8 builders', community: '500 members', stage: 'Early' },
                { name: 'StableCore', vision: 'Stable value for unstable times', potential: 0.75, needs: ['Governance design', 'Partnerships', 'Analytics'], team: '12 builders', community: '1.2K members', stage: 'Scaling' }
            ]
        },
        gaming: {
            name: 'GameFi Creators',
            icon: '🎮',
            color: '#a855f7',
            desc: 'Create immersive gaming experiences with the community',
            builders: [
                { name: 'PixelWorld Studio', vision: 'Games that everyone can enjoy', potential: 0.7, needs: ['Game testing', 'Art creation', 'Lore writing'], team: '20 creators', community: '3K players', stage: 'Beta' },
                { name: 'BattleForge', vision: 'Competitive gaming redefined', potential: 0.65, needs: ['Tournament org', 'Balance testing', 'Streaming'], team: '12 builders', community: '800 players', stage: 'Alpha' },
                { name: 'MetaLands Collective', vision: 'Build your world, your way', potential: 0.8, needs: ['World building', 'Events hosting', 'Onboarding'], team: '25 creators', community: '4K members', stage: 'Live' }
            ]
        },
        community: {
            name: 'Community Projects',
            icon: '🤝',
            color: '#f59e0b',
            desc: 'Grassroots movements powered by passionate builders',
            builders: [
                { name: 'ASDF Army', vision: 'Strongest community in crypto', potential: 0.9, needs: ['Meme creation', 'Raid coordination', 'Vibes'], team: 'The community', community: '10K+ degens', stage: 'Viral' },
                { name: 'BuilderDAO', vision: 'Builders helping builders', potential: 0.75, needs: ['Mentorship', 'Resource sharing', 'Networking'], team: '50 mentors', community: '2K builders', stage: 'Growing' },
                { name: 'CryptoEducators', vision: 'Making crypto accessible', potential: 0.7, needs: ['Content creation', 'Translation', 'Teaching'], team: '30 educators', community: '5K learners', stage: 'Scaling' }
            ]
        },
        infra: {
            name: 'Infrastructure',
            icon: '⚡',
            color: '#22c55e',
            desc: 'Build the backbone of the decentralized future',
            builders: [
                { name: 'OpenNode Collective', vision: 'Decentralized infrastructure for all', potential: 0.8, needs: ['Node operation', 'Documentation', 'Support'], team: '30 engineers', community: '1K operators', stage: 'Production' },
                { name: 'BridgeBuilders', vision: 'Connecting all chains seamlessly', potential: 0.7, needs: ['Security review', 'Integration help', 'Testing'], team: '18 devs', community: '600 testers', stage: 'Mainnet' },
                { name: 'DataDAO', vision: 'Your data, your control', potential: 0.75, needs: ['Storage nodes', 'SDK feedback', 'Use cases'], team: '22 builders', community: '900 users', stage: 'Growing' }
            ]
        }
    };

    // Partnership collaboration options per category
    const collabOptions = {
        defi: [
            { title: 'Community Governance', desc: 'How should decisions be made?', options: ['Token voting', 'Reputation-based', 'Quadratic voting'] },
            { title: 'Builder Onboarding', desc: 'New contributors want to join', options: ['Open doors to all', 'Skill-based selection', 'Mentorship program'] },
            { title: 'Protocol Direction', desc: 'What should we prioritize?', options: ['Security & audits', 'New features', 'User experience'] },
            { title: 'Community Event', desc: 'How to engage the community?', options: ['Hackathon', 'AMA series', 'Builder workshop'] }
        ],
        gaming: [
            { title: 'Player Feedback', desc: 'Community has strong opinions', options: ['Implement top requests', 'Stay true to vision', 'Community vote'] },
            { title: 'Content Creation', desc: 'How to grow the player base?', options: ['Streamer partnerships', 'UGC tools', 'Competitive leagues'] },
            { title: 'Economy Balance', desc: 'Players report issues', options: ['Community council', 'Data-driven changes', 'Test server first'] },
            { title: 'New Feature', desc: 'What should we build next?', options: ['Social features', 'New game mode', 'Mobile version'] }
        ],
        community: [
            { title: 'Growth Strategy', desc: 'How to expand the community?', options: ['Organic memes', 'Collab with others', 'Content raids'] },
            { title: 'Builder Recognition', desc: 'How to reward contributors?', options: ['Public shoutouts', 'Exclusive roles', 'Builder rewards'] },
            { title: 'Community Challenge', desc: 'Internal disagreement arose', options: ['Open discussion', 'Core team decides', 'Community vote'] },
            { title: 'Partnership Offer', desc: 'Another project wants to collab', options: ['Full collaboration', 'Limited partnership', 'Friendly competition'] }
        ],
        infra: [
            { title: 'Documentation Sprint', desc: 'Docs need improvement', options: ['Community bounty', 'Core team focus', 'Video tutorials'] },
            { title: 'Node Operators', desc: 'How to grow the network?', options: ['Easy setup guides', 'Operator incentives', 'Enterprise outreach'] },
            { title: 'Open Source', desc: 'Should we open source more?', options: ['Full transparency', 'Gradual release', 'Keep core private'] },
            { title: 'Developer Experience', desc: 'Devs struggle with integration', options: ['SDK improvements', 'Office hours', 'Example projects'] }
        ]
    };

    // ===== BUILDER-SPECIFIC STORYLINES =====
    // Each builder has 10 unique scenarios forming a narrative arc
    const builderStorylines = {
        // ===== DEFI BUILDERS =====
        'SafeYield DAO': [
            { title: "Premier Jour", narrative: "Tu rejoins SafeYield DAO. L'équipe t'accueille dans le Discord. Le lead dev Marcus te demande: 'On a besoin d'aide pour la documentation du smart contract. Par où veux-tu commencer?'", choices: [
                { text: "📝 Documenter les fonctions de base", approach: "methodical", desc: "Commencer par les fondamentaux" },
                { text: "🔍 Auditer le code en documentant", approach: "security", desc: "Chercher des failles en même temps" },
                { text: "💬 Demander à la communauté ce qui manque", approach: "community", desc: "Impliquer les utilisateurs" }
            ], outcomes: { methodical: { repBonus: 1.2, infBonus: 1.0, message: "Marcus apprécie ton approche structurée." }, security: { repBonus: 1.4, infBonus: 0.9, message: "Tu trouves un edge case non documenté!" }, community: { repBonus: 1.1, infBonus: 1.3, message: "Les users sont contents d'être consultés." }}},
            { title: "La Faille", narrative: "En documentant, tu découvres une faille potentielle dans le mécanisme de retrait. Rien de critique, mais ça pourrait être exploité. Que fais-tu?", choices: [
                { text: "🚨 Alerter Marcus immédiatement en privé", approach: "private", desc: "Garder ça confidentiel" },
                { text: "🔬 Créer un PoC pour prouver le risque", approach: "prove", desc: "Démontrer concrètement" },
                { text: "📋 Documenter et proposer un fix", approach: "solution", desc: "Arriver avec la solution" }
            ], outcomes: { private: { repBonus: 1.3, infBonus: 1.0, message: "Marcus te remercie pour la discrétion." }, prove: { repBonus: 1.5, infBonus: 0.8, message: "L'équipe est impressionnée par ta rigueur." }, solution: { repBonus: 1.4, infBonus: 1.1, message: "Tu gagnes le respect de toute l'équipe." }}},
            { title: "Le Vote", narrative: "La faille est fixée. L'équipe veut te remercier publiquement. Un membre propose de te donner des tokens. Un autre suggère un rôle officiel. Qu'est-ce qui t'intéresse?", choices: [
                { text: "🏷️ Le rôle de Security Reviewer", approach: "role", desc: "Responsabilité officielle" },
                { text: "💰 Les tokens, je les stake", approach: "tokens", desc: "Skin in the game" },
                { text: "🤝 Juste la reconnaissance publique", approach: "recognition", desc: "La réputation avant tout" }
            ], outcomes: { role: { repBonus: 1.5, infBonus: 1.0, message: "Tu deviens le Security Reviewer officiel!" }, tokens: { repBonus: 1.0, infBonus: 1.4, message: "Ton stake montre ton engagement long terme." }, recognition: { repBonus: 1.3, infBonus: 1.2, message: "La communauté respecte ton humilité." }}},
            { title: "L'Audit", narrative: "Un audit externe arrive. L'auditeur Certik demande des clarifications sur le code. Marcus est en vacances. Tu es le seul à connaître les détails.", choices: [
                { text: "📞 Appeler Marcus malgré ses vacances", approach: "escalate", desc: "C'est trop important" },
                { text: "💪 Gérer seul avec ta documentation", approach: "handle", desc: "Tu connais le code maintenant" },
                { text: "⏸️ Demander un délai à Certik", approach: "delay", desc: "Attendre le retour de Marcus" }
            ], outcomes: { escalate: { repBonus: 1.0, infBonus: 1.1, message: "Marcus comprend, mais aurait préféré que tu gères." }, handle: { repBonus: 1.6, infBonus: 1.0, message: "Tu gères parfaitement! Marcus est impressionné à son retour." }, delay: { repBonus: 0.9, infBonus: 1.2, message: "Certik accepte, mais ça retarde le lancement." }}},
            { title: "Le Lancement", narrative: "L'audit est passé! Le lancement approche. L'équipe débat: lancer maintenant avec le buzz actuel, ou attendre d'avoir plus de liquidité initiale?", choices: [
                { text: "🚀 Lancer maintenant", approach: "now", desc: "Le momentum est là" },
                { text: "💧 Attendre plus de liquidité", approach: "wait", desc: "Sécurité avant tout" },
                { text: "🎯 Soft launch pour les early supporters", approach: "soft", desc: "Récompenser les fidèles d'abord" }
            ], outcomes: { now: { repBonus: 1.2, infBonus: 1.3, message: "Le lancement fait du bruit! TVL monte vite." }, wait: { repBonus: 1.3, infBonus: 1.0, message: "La liquidité rassure les gros déposants." }, soft: { repBonus: 1.4, infBonus: 1.1, message: "Les early supporters deviennent des ambassadeurs." }}},
            { title: "La Whale", narrative: "Une whale dépose 500k. Le TVL explose mais elle représente 40% du pool. La communauté s'inquiète de la centralisation.", choices: [
                { text: "🐋 L'accueillir et la rassurer", approach: "welcome", desc: "Un gros déposant = confiance" },
                { text: "⚖️ Proposer des caps par wallet", approach: "cap", desc: "Limiter les risques" },
                { text: "📢 Lancer une campagne pour diversifier", approach: "diversify", desc: "Attirer plus de petits déposants" }
            ], outcomes: { welcome: { repBonus: 1.0, infBonus: 1.4, message: "La whale reste et en parle à d'autres gros." }, cap: { repBonus: 1.4, infBonus: 0.9, message: "La whale réduit mais la communauté approuve." }, diversify: { repBonus: 1.3, infBonus: 1.2, message: "La campagne attire 200 nouveaux déposants!" }}},
            { title: "Le Hack", narrative: "Un protocole similaire se fait hack. Panique dans le Discord. Certains retirent leurs fonds. L'équipe doit communiquer.", choices: [
                { text: "🔒 Publier une analyse comparative détaillée", approach: "technical", desc: "Montrer pourquoi vous êtes différents" },
                { text: "🎥 Faire un AMA d'urgence", approach: "ama", desc: "Répondre en direct aux questions" },
                { text: "🤫 Rester calme et factuel", approach: "calm", desc: "Ne pas alimenter la panique" }
            ], outcomes: { technical: { repBonus: 1.5, infBonus: 1.0, message: "L'analyse rassure les technicals. Peu de retraits." }, ama: { repBonus: 1.3, infBonus: 1.3, message: "L'AMA crée de la confiance. Certains redéposent!" }, calm: { repBonus: 1.1, infBonus: 1.1, message: "La situation se calme naturellement." }}},
            { title: "La Gouvernance", narrative: "Le protocole grandit. Il est temps de décentraliser la gouvernance. Comment structurer le pouvoir de vote?", choices: [
                { text: "🗳️ 1 token = 1 vote classique", approach: "classic", desc: "Simple et compréhensible" },
                { text: "⏱️ Vote pondéré par durée de stake", approach: "weighted", desc: "Récompenser la fidélité" },
                { text: "🎓 Quadratic voting", approach: "quadratic", desc: "Limiter le pouvoir des whales" }
            ], outcomes: { classic: { repBonus: 1.1, infBonus: 1.2, message: "Facile à comprendre, adoption rapide." }, weighted: { repBonus: 1.4, infBonus: 1.0, message: "Les long-term holders sont ravis." }, quadratic: { repBonus: 1.3, infBonus: 1.1, message: "Innovation saluée par la communauté DeFi." }}},
            { title: "L'Expansion", narrative: "Aave propose une intégration. Ça doublerait le TVL mais ajouterait de la complexité et des risques de dépendance.", choices: [
                { text: "✅ Accepter l'intégration", approach: "accept", desc: "Opportunité trop belle" },
                { text: "🔄 Négocier une intégration limitée", approach: "negotiate", desc: "Garder le contrôle" },
                { text: "❌ Rester indépendant", approach: "decline", desc: "Focus sur l'identité propre" }
            ], outcomes: { accept: { repBonus: 1.1, infBonus: 1.5, message: "TVL x3! Mais la roadmap doit s'adapter." }, negotiate: { repBonus: 1.4, infBonus: 1.2, message: "Deal équilibré. Best of both worlds." }, decline: { repBonus: 1.5, infBonus: 0.9, message: "La communauté admire l'indépendance." }}},
            { title: "Le Futur", narrative: "Un an après ton arrivée. SafeYield est un succès. Marcus te propose de devenir co-lead du protocole. Grande responsabilité.", choices: [
                { text: "🎯 Accepter le rôle de co-lead", approach: "accept", desc: "Tu as mérité cette place" },
                { text: "🌱 Préférer rester contributeur", approach: "contributor", desc: "Moins de politique, plus de building" },
                { text: "🚀 Proposer de lancer un nouveau produit", approach: "innovate", desc: "Utiliser ton influence pour innover" }
            ], outcomes: { accept: { repBonus: 1.6, infBonus: 1.2, message: "Tu deviens co-lead de SafeYield DAO!" }, contributor: { repBonus: 1.3, infBonus: 1.3, message: "Respecté pour ton humilité et ta constance." }, innovate: { repBonus: 1.4, infBonus: 1.4, message: "Tu lances SafeYield V2 avec de nouvelles features!" }}}
        ],

        // ===== GAMEFI CREATORS =====
        'PixelWorld Studio': [
            { title: "Bienvenue dans le Studio", narrative: "Tu rejoins PixelWorld Studio comme community builder. Le game designer Léa t'accueille: 'On lance la beta dans 2 semaines. On a besoin d'organiser les playtesters. Comment tu veux t'y prendre?'", choices: [
                { text: "📋 Créer un formulaire de candidature", approach: "formal", desc: "Sélectionner les meilleurs testeurs" },
                { text: "🎮 Ouvrir à tous les membres Discord", approach: "open", desc: "Maximum de feedback" },
                { text: "🏆 Organiser un concours pour les places", approach: "contest", desc: "Créer de l'engagement" }
            ], outcomes: { formal: { repBonus: 1.2, infBonus: 1.0, message: "Les testeurs sélectionnés sont très engagés." }, open: { repBonus: 1.0, infBonus: 1.4, message: "Énorme participation! Beaucoup de feedback." }, contest: { repBonus: 1.3, infBonus: 1.2, message: "Le concours fait le buzz!" }}},
            { title: "Le Bug Critique", narrative: "Premier jour de beta. Un bug permet de dupliquer les items rares. Certains joueurs en ont déjà profité. Que recommandes-tu?", choices: [
                { text: "🔄 Reset complet de la beta", approach: "reset", desc: "Repartir sur des bases saines" },
                { text: "🔨 Fix + retirer les items dupliqués", approach: "fix", desc: "Corriger sans tout effacer" },
                { text: "🎁 Fix + compensation pour tous", approach: "compensate", desc: "Transformer le problème en opportunité" }
            ], outcomes: { reset: { repBonus: 1.1, infBonus: 0.9, message: "Certains râlent mais c'est propre." }, fix: { repBonus: 1.3, infBonus: 1.1, message: "Solution équilibrée, bien reçue." }, compensate: { repBonus: 1.4, infBonus: 1.2, message: "Les joueurs adorent! Bonne ambiance." }}},
            { title: "Le Streamer", narrative: "Un streamer avec 50k viewers veut jouer à PixelWorld. Il demande des items exclusifs en échange de visibilité. L'équipe est divisée.", choices: [
                { text: "✅ Lui donner les items exclusifs", approach: "give", desc: "La visibilité vaut le coup" },
                { text: "🤝 Proposer un partenariat officiel", approach: "partner", desc: "Cadrer la collaboration" },
                { text: "❌ Refuser le traitement de faveur", approach: "refuse", desc: "Égalité pour tous les joueurs" }
            ], outcomes: { give: { repBonus: 0.9, infBonus: 1.5, message: "Gros boost de visibilité! Mais la communauté grogne." }, partner: { repBonus: 1.3, infBonus: 1.3, message: "Partenariat win-win bien structuré." }, refuse: { repBonus: 1.5, infBonus: 0.9, message: "La communauté applaudit l'intégrité." }}},
            { title: "L'Économie", narrative: "Les joueurs hardcore accumulent trop de gold. L'inflation menace l'économie du jeu. Il faut agir.", choices: [
                { text: "🔥 Ajouter des sinks (items cosmétiques)", approach: "sinks", desc: "Créer des raisons de dépenser" },
                { text: "⚖️ Réduire les drops de gold", approach: "reduce", desc: "Traiter la cause" },
                { text: "🏦 Créer un système de staking in-game", approach: "stake", desc: "Immobiliser le gold" }
            ], outcomes: { sinks: { repBonus: 1.3, infBonus: 1.2, message: "Les cosmétiques cartonnent!" }, reduce: { repBonus: 1.1, infBonus: 1.0, message: "Équilibre rétabli, mais certains râlent." }, stake: { repBonus: 1.4, infBonus: 1.1, message: "Innovation qui plaît aux holders!" }}},
            { title: "Le Mode Compétitif", narrative: "La communauté demande un mode PvP ranked. Léa hésite: ça demande beaucoup de ressources et risque de toxifier la communauté.", choices: [
                { text: "🏆 Lancer un ranked complet", approach: "full", desc: "Donner ce que les joueurs veulent" },
                { text: "⚔️ Commencer par des tournois ponctuels", approach: "tournaments", desc: "Tester l'appétit progressivement" },
                { text: "🎮 Focus sur le PvE d'abord", approach: "pve", desc: "Consolider avant de diversifier" }
            ], outcomes: { full: { repBonus: 1.2, infBonus: 1.3, message: "Le ranked attire de nouveaux joueurs compétitifs!" }, tournaments: { repBonus: 1.4, infBonus: 1.1, message: "Les tournois créent des moments forts!" }, pve: { repBonus: 1.3, infBonus: 1.0, message: "Le PvE s'enrichit, les joueurs apprécient." }}},
            { title: "Le Fork", narrative: "Un dev quitte l'équipe et fork le jeu. Il lance une copie avec des 'améliorations'. Certains joueurs sont tentés de partir.", choices: [
                { text: "⚔️ Attaquer publiquement le fork", approach: "attack", desc: "Défendre votre territoire" },
                { text: "🚀 Accélérer votre propre roadmap", approach: "accelerate", desc: "Être meilleur, pas amer" },
                { text: "🤷 Ignorer et continuer", approach: "ignore", desc: "Ne pas leur donner d'attention" }
            ], outcomes: { attack: { repBonus: 0.9, infBonus: 1.1, message: "La drama attire l'attention mais divise." }, accelerate: { repBonus: 1.5, infBonus: 1.2, message: "Les nouvelles features écrasent la compétition!" }, ignore: { repBonus: 1.2, infBonus: 1.0, message: "Le fork meurt naturellement. Classe." }}},
            { title: "Le Mobile", narrative: "Un publisher mobile propose de porter PixelWorld sur iOS/Android. Gros potentiel mais ils veulent des pubs intégrées.", choices: [
                { text: "📱 Accepter avec les pubs", approach: "ads", desc: "Accès à des millions de joueurs" },
                { text: "💰 Négocier un modèle premium", approach: "premium", desc: "Payer pour jouer, sans pubs" },
                { text: "🔧 Porter en interne sans publisher", approach: "internal", desc: "Garder le contrôle total" }
            ], outcomes: { ads: { repBonus: 0.9, infBonus: 1.4, message: "Explosion du nombre de joueurs! Mais certains vétérans partent." }, premium: { repBonus: 1.3, infBonus: 1.2, message: "Moins de joueurs mais plus engagés." }, internal: { repBonus: 1.4, infBonus: 1.0, message: "Port réussi, communauté ravie!" }}},
            { title: "L'Esport", narrative: "Une org esport veut sponsoriser une ligue PixelWorld. 100k$ de cashprize. Mais ils demandent l'exclusivité sur les tournois officiels.", choices: [
                { text: "✅ Accepter l'exclusivité", approach: "exclusive", desc: "Professionnaliser la scène" },
                { text: "🤝 Négocier une co-organisation", approach: "coop", desc: "Garder de la flexibilité" },
                { text: "🏆 Lancer votre propre ligue", approach: "own", desc: "Contrôle total de l'esport" }
            ], outcomes: { exclusive: { repBonus: 1.1, infBonus: 1.4, message: "La scène pro décolle!" }, coop: { repBonus: 1.4, infBonus: 1.2, message: "Partenariat équilibré et durable." }, own: { repBonus: 1.5, infBonus: 1.0, message: "Votre ligue devient la référence!" }}},
            { title: "La Crise", narrative: "Scandale: un modérateur est accusé de favoritisme dans les ban. Le drama explose sur Twitter. Les médias gaming s'en mêlent.", choices: [
                { text: "🎤 Communiqué officiel transparent", approach: "transparent", desc: "Tout expliquer publiquement" },
                { text: "🔍 Investigation interne d'abord", approach: "investigate", desc: "Vérifier avant de parler" },
                { text: "⚡ Virer le modo et s'excuser", approach: "fire", desc: "Action immédiate" }
            ], outcomes: { transparent: { repBonus: 1.4, infBonus: 1.1, message: "La transparence est saluée." }, investigate: { repBonus: 1.3, infBonus: 1.2, message: "L'enquête révèle la vérité, situation clarifiée." }, fire: { repBonus: 1.1, infBonus: 1.0, message: "Action rapide mais perçue comme précipitée." }}},
            { title: "Le Futur de PixelWorld", narrative: "Deux ans plus tard. PixelWorld a 500k joueurs actifs. Léa te propose de devenir Creative Director. Tu façonnerais l'avenir du jeu.", choices: [
                { text: "🎯 Accepter Creative Director", approach: "accept", desc: "Tu as construit cette communauté" },
                { text: "🌍 Proposer d'ouvrir un studio satellite", approach: "expand", desc: "Étendre la vision" },
                { text: "🎮 Rester proche des joueurs", approach: "community", desc: "Garder les pieds sur terre" }
            ], outcomes: { accept: { repBonus: 1.6, infBonus: 1.2, message: "Tu deviens Creative Director de PixelWorld!" }, expand: { repBonus: 1.4, infBonus: 1.4, message: "Tu ouvres PixelWorld Asia!" }, community: { repBonus: 1.5, infBonus: 1.3, message: "Tu restes le cœur de la communauté." }}}
        ],

        // ===== COMMUNITY PROJECTS =====
        'ASDF Army': [
            { title: "Enrôlement", narrative: "Tu rejoins l'ASDF Army. Le général Chad t'accueille: 'Bienvenue soldat! On a besoin de troupes pour le raid de ce soir sur le tweet de CZ. Quelle est ta spécialité?'", choices: [
                { text: "🎨 Je suis un meme lord", approach: "memes", desc: "Les memes sont ma langue" },
                { text: "📊 Je fais de l'analyse et du thread", approach: "analysis", desc: "Contenu éducatif" },
                { text: "🔥 Je suis là pour le chaos", approach: "chaos", desc: "Engagement maximum" }
            ], outcomes: { memes: { repBonus: 1.3, infBonus: 1.2, message: "Tes memes font mouche!" }, analysis: { repBonus: 1.4, infBonus: 1.0, message: "Ton thread est RT par des influenceurs." }, chaos: { repBonus: 1.1, infBonus: 1.4, message: "Tu ramènes l'énergie!" }}},
            { title: "Le Raid", narrative: "Le raid commence. CZ a posté sur les memecoins. L'Army doit répondre en force. Comment tu participes?", choices: [
                { text: "💬 Reply avec le meilleur meme ASDF", approach: "reply", desc: "Être en première ligne" },
                { text: "🔄 RT et amplifie les meilleurs posts", approach: "amplify", desc: "Soutenir les troupes" },
                { text: "📝 Créer un thread expliquant ASDF", approach: "educate", desc: "Convertir les curieux" }
            ], outcomes: { reply: { repBonus: 1.3, infBonus: 1.3, message: "Ton meme est liké par CZ!" }, amplify: { repBonus: 1.1, infBonus: 1.2, message: "Tu aides l'Army à dominer les replies." }, educate: { repBonus: 1.4, infBonus: 1.1, message: "Ton thread amène de nouveaux membres!" }}},
            { title: "La Victoire", narrative: "Le raid est un succès! ASDF trend sur Twitter. Chad propose de te donner un grade. Lequel veux-tu?", choices: [
                { text: "🎖️ Capitaine des Memes", approach: "meme_captain", desc: "Diriger les créatifs" },
                { text: "📢 Lieutenant de Communication", approach: "comms", desc: "Gérer les annonces" },
                { text: "🛡️ Sergent de la Modération", approach: "mod", desc: "Protéger la communauté" }
            ], outcomes: { meme_captain: { repBonus: 1.4, infBonus: 1.2, message: "Tu diriges maintenant l'escouade meme!" }, comms: { repBonus: 1.3, infBonus: 1.3, message: "Tu deviens la voix officielle!" }, mod: { repBonus: 1.5, infBonus: 1.0, message: "Tu protèges l'Army des scammers!" }}},
            { title: "L'Infiltration", narrative: "Un compte suspect rejoint le Discord. Il pose beaucoup de questions sur les wallets des membres. FUD ou curiosité légitime?", choices: [
                { text: "🔨 Ban immédiat, pas de risque", approach: "ban", desc: "Tolérance zéro" },
                { text: "👀 Surveiller discrètement", approach: "watch", desc: "Collecter des preuves" },
                { text: "💬 L'interroger publiquement", approach: "confront", desc: "Exposer ses intentions" }
            ], outcomes: { ban: { repBonus: 1.2, infBonus: 1.0, message: "C'était bien un scammer. Bien joué!" }, watch: { repBonus: 1.4, infBonus: 1.1, message: "Tu découvres tout un réseau de scam!" }, confront: { repBonus: 1.3, infBonus: 1.2, message: "Il avoue et part. La communauté te respecte." }}},
            { title: "Le FUD", narrative: "Un thread viral accuse ASDF d'être un rug. C'est faux mais ça fait du dégât. Comment l'Army répond?", choices: [
                { text: "📊 Contre-thread avec preuves on-chain", approach: "facts", desc: "Les données ne mentent pas" },
                { text: "😂 Transformer le FUD en meme", approach: "meme", desc: "Retourner l'attaque" },
                { text: "🤝 Inviter l'auteur à un débat public", approach: "debate", desc: "Confrontation directe" }
            ], outcomes: { facts: { repBonus: 1.4, infBonus: 1.1, message: "Les preuves sont irréfutables. FUD détruit." }, meme: { repBonus: 1.2, infBonus: 1.4, message: "Le meme devient viral. Le FUDer est ridiculisé." }, debate: { repBonus: 1.5, infBonus: 1.0, message: "Tu l'écrases dans le débat. Respect gagné." }}},
            { title: "L'Alliance", narrative: "Une autre communauté (PEPE Army) propose une alliance pour un mega raid. Mais ils ont une réputation de toxicité.", choices: [
                { text: "🤝 Accepter l'alliance", approach: "ally", desc: "L'union fait la force" },
                { text: "⚔️ Décliner et les défier", approach: "challenge", desc: "Prouver qu'ASDF est supérieur" },
                { text: "🎯 Alliance ponctuelle uniquement", approach: "limited", desc: "Collaborer sans s'engager" }
            ], outcomes: { ally: { repBonus: 1.1, infBonus: 1.5, message: "Le raid combiné fait trembler CT!" }, challenge: { repBonus: 1.4, infBonus: 1.1, message: "La rivalité motive l'Army!" }, limited: { repBonus: 1.3, infBonus: 1.3, message: "Collaboration réussie, indépendance préservée." }}},
            { title: "Le Listing", narrative: "Une rumeur de listing Binance circule. L'excitation monte. Chad veut organiser quelque chose. Quoi?", choices: [
                { text: "🚀 Campagne de hype maximum", approach: "hype", desc: "Pump l'anticipation" },
                { text: "🤫 Rester discret et préparer", approach: "stealth", desc: "Ne pas jinx" },
                { text: "📚 Thread éducatif sur ce que ça signifie", approach: "educate", desc: "Informer les nouveaux" }
            ], outcomes: { hype: { repBonus: 1.1, infBonus: 1.5, message: "L'excitation est à son comble!" }, stealth: { repBonus: 1.3, infBonus: 1.1, message: "La surprise sera encore meilleure." }, educate: { repBonus: 1.4, infBonus: 1.2, message: "Les nouveaux sont prêts et informés." }}},
            { title: "La Confirmation", narrative: "C'est officiel: Binance liste ASDF! Le Discord explose. Comment célébrer?", choices: [
                { text: "🎉 Mega giveaway pour les OG", approach: "giveaway", desc: "Récompenser les fidèles" },
                { text: "📢 Campagne d'accueil des nouveaux", approach: "welcome", desc: "Onboarder les newbies" },
                { text: "🔥 Burning event communautaire", approach: "burn", desc: "Sacrifice collectif" }
            ], outcomes: { giveaway: { repBonus: 1.4, infBonus: 1.2, message: "Les OG sont aux anges!" }, welcome: { repBonus: 1.3, infBonus: 1.4, message: "Afflux massif de nouveaux membres!" }, burn: { repBonus: 1.5, infBonus: 1.1, message: "Le burn devient légendaire!" }}},
            { title: "La Crise", narrative: "Un core member est accusé de dump ses tokens pendant le pump. La communauté est en colère. Chad te demande de gérer.", choices: [
                { text: "🔍 Investigation transparente", approach: "investigate", desc: "Vérifier les faits" },
                { text: "⚡ Défendre le membre accusé", approach: "defend", desc: "Présomption d'innocence" },
                { text: "🚪 L'éjecter pour protéger l'image", approach: "eject", desc: "La communauté d'abord" }
            ], outcomes: { investigate: { repBonus: 1.5, infBonus: 1.1, message: "L'enquête révèle la vérité. Justice rendue." }, defend: { repBonus: 1.1, infBonus: 1.2, message: "Il était innocent! Ta loyauté est remarquée." }, eject: { repBonus: 1.2, infBonus: 1.0, message: "Action rapide mais tu as peut-être eu tort..." }}},
            { title: "Le Général", narrative: "Chad veut passer le flambeau. Il te propose de devenir le nouveau Général de l'ASDF Army. C'est une immense responsabilité.", choices: [
                { text: "⭐ Accepter le commandement", approach: "accept", desc: "Tu ES l'ASDF Army" },
                { text: "🤝 Proposer un conseil de généraux", approach: "council", desc: "Leadership partagé" },
                { text: "🎖️ Rester Capitaine, mentor le prochain", approach: "mentor", desc: "Former la relève" }
            ], outcomes: { accept: { repBonus: 1.6, infBonus: 1.3, message: "Tu deviens le Général de l'ASDF Army!" }, council: { repBonus: 1.4, infBonus: 1.4, message: "Le conseil décentralise le pouvoir!" }, mentor: { repBonus: 1.5, infBonus: 1.2, message: "Tu formes la prochaine génération!" }}}
        ],

        // ===== INFRASTRUCTURE =====
        'OpenNode Collective': [
            { title: "Premier Node", narrative: "Tu rejoins OpenNode Collective. L'ingénieur lead Sarah te guide: 'On a besoin de plus d'opérateurs de nodes. Tu veux commencer comment?'", choices: [
                { text: "🖥️ Monter mon propre node d'abord", approach: "hands_on", desc: "Apprendre en faisant" },
                { text: "📚 Améliorer la documentation", approach: "docs", desc: "Aider les autres à rejoindre" },
                { text: "🎓 Créer des tutoriels vidéo", approach: "tutorials", desc: "Rendre accessible" }
            ], outcomes: { hands_on: { repBonus: 1.3, infBonus: 1.0, message: "Ton node tourne parfaitement!" }, docs: { repBonus: 1.4, infBonus: 1.1, message: "La doc attire de nouveaux opérateurs." }, tutorials: { repBonus: 1.2, infBonus: 1.4, message: "Tes tutos sont partagés partout!" }}},
            { title: "Le Bug", narrative: "Un bug dans le client cause des désync entre nodes. Certains opérateurs perdent leurs rewards. Que faire en priorité?", choices: [
                { text: "🔧 Aider au debug du client", approach: "debug", desc: "Résoudre la cause" },
                { text: "📢 Communiquer avec les opérateurs", approach: "communicate", desc: "Gérer l'urgence humaine" },
                { text: "📊 Documenter les pertes pour compensation", approach: "document", desc: "Préparer le remboursement" }
            ], outcomes: { debug: { repBonus: 1.5, infBonus: 1.0, message: "Tu trouves le bug! Fix déployé." }, communicate: { repBonus: 1.3, infBonus: 1.3, message: "Les opérateurs gardent confiance." }, document: { repBonus: 1.2, infBonus: 1.2, message: "Compensation fluide, pas de départ." }}},
            { title: "La Décentralisation", narrative: "70% des nodes sont chez AWS. C'est un point de défaillance centralisé. Comment diversifier?", choices: [
                { text: "💰 Incentives pour nodes hors-AWS", approach: "incentives", desc: "Récompenser la diversité" },
                { text: "📋 Guide pour setup home node", approach: "guide", desc: "Démocratiser l'accès" },
                { text: "🤝 Partenariats avec d'autres clouds", approach: "partners", desc: "Négocier des deals" }
            ], outcomes: { incentives: { repBonus: 1.3, infBonus: 1.2, message: "Les opérateurs migrent!" }, guide: { repBonus: 1.5, infBonus: 1.0, message: "Vague de home nodes!" }, partners: { repBonus: 1.2, infBonus: 1.4, message: "OVH et Hetzner rejoignent!" }}},
            { title: "L'Attaque", narrative: "Attaque DDoS sur le réseau. Certains nodes tombent. Les autres sont surchargés. Sarah te met en charge de la réponse.", choices: [
                { text: "🛡️ Activer les protections d'urgence", approach: "protect", desc: "Défense immédiate" },
                { text: "🔍 Tracer l'origine de l'attaque", approach: "trace", desc: "Identifier l'attaquant" },
                { text: "📢 Coordonner les opérateurs", approach: "coordinate", desc: "Effort collectif" }
            ], outcomes: { protect: { repBonus: 1.4, infBonus: 1.1, message: "Réseau stabilisé rapidement!" }, trace: { repBonus: 1.3, infBonus: 1.2, message: "Attaquant identifié et signalé." }, coordinate: { repBonus: 1.5, infBonus: 1.0, message: "La communauté résiste ensemble!" }}},
            { title: "Le SDK", narrative: "Des devs demandent un SDK plus simple. Ça permettrait plus d'adoption mais demanderait beaucoup de ressources.", choices: [
                { text: "🔨 Développer un SDK from scratch", approach: "new_sdk", desc: "La qualité avant tout" },
                { text: "📦 Wrapper l'existant en plus simple", approach: "wrapper", desc: "Solution rapide" },
                { text: "👥 Bounty communautaire", approach: "bounty", desc: "Laisser la communauté créer" }
            ], outcomes: { new_sdk: { repBonus: 1.4, infBonus: 1.0, message: "SDK parfait, adoption massive!" }, wrapper: { repBonus: 1.2, infBonus: 1.3, message: "Livré vite, devs contents." }, bounty: { repBonus: 1.3, infBonus: 1.4, message: "3 SDK émergent de la communauté!" }}},
            { title: "L'Entreprise", narrative: "Une banque veut utiliser OpenNode pour son infrastructure. Ils demandent un SLA garanti et du support 24/7.", choices: [
                { text: "✅ Accepter et créer une offre enterprise", approach: "accept", desc: "Revenue + légitimité" },
                { text: "🔄 Proposer un partenariat co-développé", approach: "partner", desc: "Garder le contrôle" },
                { text: "❌ Rester focus communauté", approach: "decline", desc: "Ne pas dévier de la mission" }
            ], outcomes: { accept: { repBonus: 1.1, infBonus: 1.5, message: "Deal signé! Crédibilité boostée." }, partner: { repBonus: 1.4, infBonus: 1.2, message: "Partenariat équilibré!" }, decline: { repBonus: 1.5, infBonus: 0.9, message: "La communauté applaudit le focus." }}},
            { title: "La Gouvernance", narrative: "Le réseau grandit. Il faut décider comment les décisions techniques seront prises à l'avenir.", choices: [
                { text: "🗳️ DAO avec vote des opérateurs", approach: "dao", desc: "Décentralisation max" },
                { text: "👥 Conseil technique élu", approach: "council", desc: "Expertise guidée" },
                { text: "📋 Processus RFC ouvert", approach: "rfc", desc: "Débat technique transparent" }
            ], outcomes: { dao: { repBonus: 1.3, infBonus: 1.3, message: "La DAO engage tous les opérateurs!" }, council: { repBonus: 1.4, infBonus: 1.1, message: "Le conseil prend des décisions rapides." }, rfc: { repBonus: 1.5, infBonus: 1.0, message: "Les RFC attirent des experts externes!" }}},
            { title: "L'Incident", narrative: "Un opérateur majeur (10% du réseau) annonce qu'il arrête. Panique potentielle. Comment réagir?", choices: [
                { text: "💰 Lui proposer de meilleurs incentives", approach: "negotiate", desc: "Le garder à tout prix" },
                { text: "🔄 Plan de migration de charge", approach: "migrate", desc: "Se préparer à son départ" },
                { text: "📢 Communication transparente", approach: "transparent", desc: "Expliquer la situation" }
            ], outcomes: { negotiate: { repBonus: 1.1, infBonus: 1.3, message: "Il reste! Mais ça crée un précédent." }, migrate: { repBonus: 1.4, infBonus: 1.1, message: "Migration fluide, réseau résilient!" }, transparent: { repBonus: 1.3, infBonus: 1.2, message: "La communauté répond en montant des nodes!" }}},
            { title: "L'Open Source", narrative: "Décision majeure: open-sourcer tout le code core, ou garder certains composants propriétaires?", choices: [
                { text: "🔓 Open source complet", approach: "full_open", desc: "Transparence totale" },
                { text: "📦 Core open, tools propriétaires", approach: "partial", desc: "Équilibre stratégique" },
                { text: "⏰ Roadmap d'ouverture progressive", approach: "gradual", desc: "Open source par étapes" }
            ], outcomes: { full_open: { repBonus: 1.6, infBonus: 1.0, message: "Contributions externes explosent!" }, partial: { repBonus: 1.3, infBonus: 1.3, message: "Best of both worlds." }, gradual: { repBonus: 1.4, infBonus: 1.2, message: "Chaque release crée de l'engagement!" }}},
            { title: "L'Avenir", narrative: "OpenNode est maintenant une infrastructure critique. Sarah te propose de devenir CTO. Tu dirigerais le développement.", choices: [
                { text: "🎯 Accepter le rôle de CTO", approach: "accept", desc: "Tu as prouvé ta valeur" },
                { text: "🔬 Créer un lab R&D", approach: "lab", desc: "Focus sur l'innovation" },
                { text: "🌍 Lancer OpenNode Foundation", approach: "foundation", desc: "Pérenniser le projet" }
            ], outcomes: { accept: { repBonus: 1.6, infBonus: 1.2, message: "Tu deviens CTO d'OpenNode!" }, lab: { repBonus: 1.4, infBonus: 1.3, message: "Le lab produit des innovations majeures!" }, foundation: { repBonus: 1.5, infBonus: 1.4, message: "La Foundation assure l'avenir!" }}}
        ]
    };

    // Map builders to their storylines (using first builder of each category as example, others use category scenarios)
    function getBuilderStoryline(builderName, categoryKey) {
        if (builderStorylines[builderName]) {
            return builderStorylines[builderName];
        }
        // For builders without specific storylines, generate based on category
        return generateCategoryStoryline(builderName, categoryKey);
    }

    function generateCategoryStoryline(builderName, categoryKey) {
        // Generate 10 scenarios based on category themes
        const templates = {
            defi: ["Premier Jour", "La Découverte", "Le Défi", "La Crise", "L'Opportunité", "Le Choix", "Le Pivot", "L'Expansion", "La Gouvernance", "L'Avenir"],
            gaming: ["Bienvenue", "Le Bug", "Le Feedback", "L'Équilibre", "Le Contenu", "La Compétition", "Le Mobile", "L'Esport", "La Crise", "Le Futur"],
            community: ["L'Arrivée", "Le Raid", "Le Grade", "L'Infiltré", "Le FUD", "L'Alliance", "Le Buzz", "La Victoire", "Le Drame", "Le Leadership"],
            infra: ["Premier Node", "Le Bug", "La Décentralisation", "L'Attaque", "Le SDK", "L'Entreprise", "La Gouvernance", "L'Incident", "L'Open Source", "L'Avenir"]
        };

        const baseStoryline = builderStorylines[Object.keys(builderStorylines).find(k => k.includes(categoryKey === 'defi' ? 'Yield' : categoryKey === 'gaming' ? 'Pixel' : categoryKey === 'community' ? 'ASDF' : 'Node'))] || builderStorylines['SafeYield DAO'];

        // Clone and customize for this builder
        return baseStoryline.map((scenario, idx) => ({
            ...scenario,
            narrative: scenario.narrative.replace(/SafeYield DAO|PixelWorld|ASDF Army|OpenNode/g, builderName)
        }));
    }

    arena.innerHTML = `
        <div style="width:100%;min-height:100%;display:flex;flex-direction:column;background:linear-gradient(180deg,#0a0a1a 0%,#0f1a2a 100%);box-sizing:border-box;">

            <!-- Top Bar -->
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 20px;background:rgba(0,0,0,0.6);border-bottom:1px solid #333;">
                <div style="display:flex;gap:20px;align-items:center;">
                    <button id="pa-refresh-btn" style="padding:6px 10px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid #444;color:#9ca3af;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px;" title="Restart Game">
                        🔄 Restart
                    </button>
                    <div style="width:1px;height:30px;background:#333;"></div>
                    <div>
                        <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Influence</span>
                        <div style="color:#fbbf24;font-size:20px;font-weight:bold;font-family:monospace;" id="pa-influence">⚡ 100</div>
                    </div>
                    <div style="width:1px;height:30px;background:#333;"></div>
                    <div>
                        <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Reputation</span>
                        <div style="color:#22c55e;font-size:20px;font-weight:bold;font-family:monospace;" id="pa-reputation">⭐ 0</div>
                    </div>
                </div>
                <div style="display:flex;gap:20px;align-items:center;">
                    <div id="pa-partner-badge" style="display:none;padding:4px 10px;background:linear-gradient(90deg,#a855f7,#6366f1);border-radius:12px;font-size:11px;color:#fff;font-weight:bold;">
                        🤝 CORE BUILDER
                    </div>
                    <div style="text-align:right;">
                        <span style="color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Build Cycle</span>
                        <div style="color:#a855f7;font-size:18px;font-weight:bold;"><span id="pa-round">1</span> / ${state.maxRounds}</div>
                    </div>
                </div>
            </div>

            <!-- Main Game Area -->
            <div style="flex:1;display:flex;flex-direction:column;padding:15px;padding-bottom:30px;">
                <!-- Instructions -->
                <div id="pa-instructions" style="text-align:center;margin-bottom:15px;"></div>

                <!-- Project Type Selection -->
                <div id="pa-type-select" style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:600px;margin:0 auto;width:100%;">
                    ${Object.entries(projectTypes).map(([key, type]) => `
                        <button class="type-btn" data-type="${key}" style="
                            padding:15px;border-radius:8px;cursor:pointer;
                            background:rgba(0,0,0,0.5);
                            border:2px solid ${type.color};transition:all 0.2s;text-align:left;display:flex;gap:12px;align-items:center;color:#fff;font-family:inherit;">
                            <div style="font-size:32px;width:50px;text-align:center;">${type.icon}</div>
                            <div style="flex:1;">
                                <div style="font-size:14px;font-weight:bold;color:${type.color};margin-bottom:3px;">${type.name}</div>
                                <div style="font-size:11px;color:#9ca3af;line-height:1.3;">${type.desc}</div>
                            </div>
                        </button>
                    `).join('')}
                </div>

                <!-- Builder Selection (hidden initially) -->
                <div id="pa-builder-select" style="display:none;flex:1;"></div>

                <!-- Roadmap Display (hidden initially) -->
                <div id="pa-roadmap" style="display:none;max-width:700px;margin:0 auto;width:100%;padding-bottom:20px;"></div>

                <!-- Contribution Selection (hidden initially) -->
                <div id="pa-contribute-select" style="display:none;text-align:center;max-width:500px;margin:0 auto;"></div>

                <!-- Scenario/Narrative Display (hidden initially) -->
                <div id="pa-scenario" style="display:none;max-width:600px;margin:0 auto;width:100%;"></div>

                <!-- Result Display (hidden initially) -->
                <div id="pa-result" style="display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;">
                    <div id="pa-result-icon" style="font-size:60px;margin-bottom:12px;"></div>
                    <div id="pa-result-text" style="font-size:24px;font-weight:bold;margin-bottom:8px;"></div>
                    <div id="pa-result-detail" style="font-size:14px;color:#6b7280;margin-bottom:20px;text-align:center;max-width:400px;"></div>
                    <button id="pa-next-btn" class="btn" style="padding:10px 30px;font-size:14px;background:#fbbf24;border-color:#fbbf24;color:#000;">
                        Continue
                    </button>
                </div>

                <!-- Partnership Offer (hidden initially) -->
                <div id="pa-partnership-offer" style="display:none;flex:1;flex-direction:column;align-items:center;justify-content:center;max-width:500px;margin:0 auto;"></div>

                <!-- Partnership View - Roadmap Collaboration (hidden initially) -->
                <div id="pa-partnership-view" style="display:none;flex:1;max-width:700px;margin:0 auto;width:100%;"></div>

                <!-- Collaboration Decision (hidden initially) -->
                <div id="pa-collab" style="display:none;flex:1;max-width:500px;margin:0 auto;width:100%;"></div>
            </div>

            <canvas id="pa-canvas" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas>
        </div>
    `;

    const canvas = document.getElementById('pa-canvas');
    const ctx = canvas.getContext('2d');

    // Helper: convert hex color to rgba
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function resizeCanvas() {
        const rect = arena.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();

    // UI Elements
    const influenceEl = document.getElementById('pa-influence');
    const reputationEl = document.getElementById('pa-reputation');
    const roundEl = document.getElementById('pa-round');
    const instructionsEl = document.getElementById('pa-instructions');
    const typeSelectEl = document.getElementById('pa-type-select');
    const builderSelectEl = document.getElementById('pa-builder-select');
    const roadmapEl = document.getElementById('pa-roadmap');
    const contributeSelectEl = document.getElementById('pa-contribute-select');
    const scenarioEl = document.getElementById('pa-scenario');
    const resultEl = document.getElementById('pa-result');
    const resultIconEl = document.getElementById('pa-result-icon');
    const resultTextEl = document.getElementById('pa-result-text');
    const resultDetailEl = document.getElementById('pa-result-detail');
    const nextBtn = document.getElementById('pa-next-btn');
    const partnerBadgeEl = document.getElementById('pa-partner-badge');
    const partnershipOfferEl = document.getElementById('pa-partnership-offer');
    const partnershipViewEl = document.getElementById('pa-partnership-view');
    const collabEl = document.getElementById('pa-collab');
    const refreshBtn = document.getElementById('pa-refresh-btn');

    // Refresh button - restart game
    refreshBtn.addEventListener('click', () => {
        if (confirm('Restart? All progress will be lost.')) {
            stopGame(gameId);
            startPumpArena(gameId);
        }
    });

    function updateUI() {
        influenceEl.textContent = '⚡ ' + state.influence;
        reputationEl.textContent = '⭐ ' + state.reputation;
        reputationEl.style.color = state.reputation > 0 ? '#22c55e' : '#9ca3af';
        roundEl.textContent = state.round;
        partnerBadgeEl.style.display = state.isPartner ? 'block' : 'none';
    }

    function showPhase(phase) {
        state.phase = phase;
        typeSelectEl.style.display = 'none';
        builderSelectEl.style.display = 'none';
        roadmapEl.style.display = 'none';
        contributeSelectEl.style.display = 'none';
        scenarioEl.style.display = 'none';
        resultEl.style.display = 'none';
        partnershipOfferEl.style.display = 'none';
        partnershipViewEl.style.display = 'none';
        collabEl.style.display = 'none';

        if (phase === 'select') {
            // If partner, go directly to partnership view
            if (state.isPartner) {
                showPhase('partnership');
                return;
            }
            instructionsEl.innerHTML = `
                <div style="font-size:18px;color:#fbbf24;font-weight:600;margin-bottom:6px;">🏗️ Choose a Project Category</div>
                <div style="font-size:13px;color:#9ca3af;">Find teams to support and build with</div>
            `;
            typeSelectEl.style.display = 'grid';
        } else if (phase === 'builder') {
            const type = projectTypes[state.selectedType];
            instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">${type.icon} ${type.name}</div>
                <div style="font-size:12px;color:#6b7280;">Review teams and find where you can contribute</div>
            `;
            builderSelectEl.style.display = 'block';
            renderBuilders();
        } else if (phase === 'roadmap') {
            const type = projectTypes[state.selectedType];
            const builder = state.selectedBuilder;
            instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">${builder.name}</div>
                <div style="font-size:12px;color:#6b7280;">Review the roadmap and see how you can help</div>
            `;
            roadmapEl.style.display = 'block';
            renderRoadmap();
        } else if (phase === 'contribute') {
            const type = projectTypes[state.selectedType];
            instructionsEl.innerHTML = `
                <div style="font-size:16px;color:#fbbf24;font-weight:600;margin-bottom:4px;">🤝 Contribution Level</div>
                <div style="font-size:12px;color:#6b7280;">${state.selectedBuilder.name} • Potential: ${Math.round(state.selectedBuilder.potential * 100)}%</div>
            `;
            contributeSelectEl.style.display = 'block';
            renderContributeOptions();
        } else if (phase === 'scenario') {
            const type = projectTypes[state.selectedType];
            instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">📖 ${state.selectedBuilder.name}</div>
                <div style="font-size:12px;color:#6b7280;">A situation has emerged. Your choice matters.</div>
            `;
            scenarioEl.style.display = 'block';
            renderScenario();
        } else if (phase === 'result') {
            instructionsEl.innerHTML = '';
            resultEl.style.display = 'flex';
        } else if (phase === 'partnership-offer') {
            instructionsEl.innerHTML = '';
            partnershipOfferEl.style.display = 'flex';
            renderPartnershipOffer();
        } else if (phase === 'partnership') {
            const type = projectTypes[state.partnership.type];
            instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">🤝 ${state.partnership.builder.name} - Core Builder</div>
                <div style="font-size:12px;color:#6b7280;">You are shaping the project's future together</div>
            `;
            partnershipViewEl.style.display = 'block';
            renderPartnershipView();
        } else if (phase === 'collab') {
            const type = projectTypes[state.partnership.type];
            instructionsEl.innerHTML = `
                <div style="font-size:16px;color:${type.color};font-weight:600;margin-bottom:4px;">📋 Team Decision</div>
                <div style="font-size:12px;color:#6b7280;">Your input will shape the project's direction</div>
            `;
            collabEl.style.display = 'block';
            renderCollabDecision();
        }
    }

    function renderBuilders() {
        const type = projectTypes[state.selectedType];
        builderSelectEl.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:10px;max-width:600px;margin:0 auto;">
                ${type.builders.map((builder, idx) => {
                    const potentialPct = Math.round(builder.potential * 100);
                    const stageColor = builder.stage === 'Early' || builder.stage === 'Alpha' ? '#f59e0b' :
                                       builder.stage === 'Growing' || builder.stage === 'Beta' ? '#3b82f6' : '#22c55e';
                    return `
                        <button class="builder-btn" data-idx="${idx}" style="
                            padding:12px 15px;border-radius:8px;cursor:pointer;
                            background:rgba(0,0,0,0.4);
                            border:1px solid ${type.color}30;transition:all 0.2s;text-align:left;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                                <div>
                                    <div style="font-size:15px;font-weight:bold;color:#fff;margin-bottom:2px;">${builder.name}</div>
                                    <div style="font-size:11px;color:#9ca3af;font-style:italic;">"${builder.vision}"</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:12px;padding:3px 8px;background:${stageColor}30;border-radius:4px;color:${stageColor};font-weight:bold;">${builder.stage}</div>
                                </div>
                            </div>
                            <div style="display:flex;gap:15px;font-size:10px;color:#9ca3af;flex-wrap:wrap;margin-bottom:8px;">
                                <span>👥 ${builder.team}</span>
                                <span>🌐 ${builder.community}</span>
                            </div>
                            <div style="font-size:10px;color:#6b7280;margin-bottom:8px;">
                                <span style="color:#a855f7;">Needs:</span> ${builder.needs.join(' • ')}
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="flex:1;height:4px;background:#1f2937;border-radius:2px;overflow:hidden;">
                                    <div style="width:${potentialPct}%;height:100%;background:linear-gradient(90deg,#22c55e,#fbbf24);"></div>
                                </div>
                                <span style="font-size:10px;color:#22c55e;font-weight:bold;">${potentialPct}% potential</span>
                            </div>
                        </button>
                    `;
                }).join('')}
                <button id="pa-back-type" style="margin-top:5px;padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#6b7280;cursor:pointer;font-size:12px;">
                    ← Back to categories
                </button>
            </div>
        `;

        builderSelectEl.querySelectorAll('.builder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                state.selectedBuilderIdx = idx;
                state.selectedBuilder = projectTypes[state.selectedType].builders[idx];
                showPhase('roadmap');
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = type.color;
                btn.style.background = 'rgba(0,0,0,0.6)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = type.color + '30';
                btn.style.background = 'rgba(0,0,0,0.4)';
            });
        });

        document.getElementById('pa-back-type').addEventListener('click', () => showPhase('select'));
    }

    function renderRoadmap() {
        const type = projectTypes[state.selectedType];
        const builder = state.selectedBuilder;
        const roadmap = roadmapTemplates[state.selectedType];
        const potentialPct = Math.round(builder.potential * 100);
        const stageColor = builder.stage === 'Early' || builder.stage === 'Alpha' ? '#f59e0b' :
                           builder.stage === 'Growing' || builder.stage === 'Beta' ? '#3b82f6' : '#22c55e';

        roadmapEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;border:1px solid ${type.color}30;overflow:hidden;">
                <!-- Project Header -->
                <div style="padding:12px 15px;background:linear-gradient(135deg,${type.color}20,transparent);border-bottom:1px solid ${type.color}20;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:28px;">${type.icon}</span>
                            <div>
                                <div style="font-size:16px;font-weight:bold;color:#fff;">${builder.name}</div>
                                <div style="font-size:11px;color:${type.color};">${type.name}</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:12px;padding:4px 10px;background:${stageColor}30;border-radius:6px;color:${stageColor};font-weight:bold;">${builder.stage}</div>
                        </div>
                    </div>
                </div>

                <!-- Project Stats -->
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#1f2937;border-bottom:1px solid #1f2937;">
                    <div style="padding:10px;background:#0a0a1a;text-align:center;">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">TEAM</div>
                        <div style="font-size:11px;color:#fff;">${builder.team}</div>
                    </div>
                    <div style="padding:10px;background:#0a0a1a;text-align:center;">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">COMMUNITY</div>
                        <div style="font-size:11px;color:#22c55e;font-weight:bold;">${builder.community}</div>
                    </div>
                    <div style="padding:10px;background:#0a0a1a;text-align:center;">
                        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">POTENTIAL</div>
                        <div style="font-size:11px;color:#fbbf24;font-weight:bold;">${potentialPct}%</div>
                    </div>
                </div>

                <!-- What They Need -->
                <div style="padding:12px 15px;background:rgba(168,85,247,0.1);border-bottom:1px solid #1f2937;">
                    <div style="font-size:11px;color:#a855f7;font-weight:bold;margin-bottom:8px;">🎯 HOW YOU CAN HELP</div>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        ${builder.needs.map(need => `
                            <span style="padding:4px 10px;background:rgba(255,255,255,0.1);border-radius:12px;font-size:10px;color:#d1d5db;">${need}</span>
                        `).join('')}
                    </div>
                </div>

                <!-- Roadmap Timeline -->
                <div style="padding:12px 15px;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;">Project Roadmap</div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                        ${roadmap.map((phase, idx) => `
                            <div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:10px;border-left:2px solid ${type.color}${idx === 0 ? '' : '40'};">
                                <div style="font-size:10px;color:${type.color};font-weight:bold;margin-bottom:4px;">${phase.phase}</div>
                                <div style="font-size:11px;color:#fff;font-weight:500;margin-bottom:6px;">${phase.title}</div>
                                <ul style="margin:0;padding-left:12px;font-size:9px;color:#9ca3af;line-height:1.5;">
                                    ${phase.tasks.map(task => `<li>${task}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div style="display:flex;gap:10px;margin-top:12px;margin-bottom:20px;padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;">
                <button id="pa-back-builder" style="flex:1;padding:12px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid #555;color:#fff;cursor:pointer;font-size:13px;font-weight:500;">
                    ← Back
                </button>
                <button id="pa-join-btn" style="flex:2;padding:12px;border-radius:6px;background:linear-gradient(135deg,${type.color},${type.color}cc);border:none;color:#fff;cursor:pointer;font-size:14px;font-weight:bold;box-shadow:0 4px 15px ${type.color}40;">
                    🤝 Join ${builder.name}
                </button>
            </div>
        `;

        document.getElementById('pa-back-builder').addEventListener('click', () => showPhase('builder'));
        document.getElementById('pa-join-btn').addEventListener('click', () => showPhase('contribute'));
    }

    function renderContributeOptions() {
        const type = projectTypes[state.selectedType];
        const builder = state.selectedBuilder;

        // Contribution levels based on influence
        const contributions = [
            { level: 'Light', influence: 10, desc: 'Casual help - share, like, spread the word', icon: '💬' },
            { level: 'Active', influence: 25, desc: 'Regular contributor - join discussions, give feedback', icon: '🔧' },
            { level: 'Dedicated', influence: 50, desc: 'Serious builder - contribute skills and time', icon: '⚡' },
            { level: 'All-In', influence: state.influence, desc: 'Go all-in - become a core part of the team', icon: '🚀' }
        ].filter(c => c.influence <= state.influence);

        // Check previous contributions
        const builderKey = `${state.selectedType}_${builder.name}`;
        const previousContribs = state.contributionsByBuilder[builderKey] || 0;

        contributeSelectEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;padding:15px;border:1px solid #333;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;padding-bottom:12px;border-bottom:1px solid #1f2937;">
                    <div style="text-align:left;">
                        <div style="font-size:12px;color:#6b7280;">Contributing to</div>
                        <div style="font-size:14px;color:#fff;font-weight:bold;">${builder.name}</div>
                        ${previousContribs > 0 ? `<div style="font-size:10px;color:#a855f7;margin-top:2px;">Previous contributions: ${previousContribs}</div>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px;color:#6b7280;">Your Influence</div>
                        <div style="font-size:16px;color:#fbbf24;font-weight:bold;">⚡ ${state.influence}</div>
                    </div>
                </div>

                <div style="font-size:11px;color:#6b7280;margin-bottom:10px;text-align:left;">Choose your contribution level:</div>

                <!-- Contribution levels -->
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
                    ${contributions.map(contrib => `
                        <button class="contrib-btn" data-influence="${contrib.influence}" data-level="${contrib.level}" style="
                            padding:12px 15px;border-radius:8px;cursor:pointer;
                            background:${contrib.level === 'All-In' ? 'linear-gradient(135deg,#a855f7,#6366f1)' : 'rgba(255,255,255,0.05)'};
                            border:1px solid ${contrib.level === 'All-In' ? '#a855f7' : '#333'};
                            color:white;font-size:12px;transition:all 0.2s;text-align:left;display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">${contrib.icon}</span>
                            <div style="flex:1;">
                                <div style="font-size:14px;font-weight:bold;margin-bottom:2px;">${contrib.level}</div>
                                <div style="font-size:10px;color:#9ca3af;">${contrib.desc}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:14px;font-weight:bold;color:#fbbf24;">⚡ ${contrib.influence}</div>
                            </div>
                        </button>
                    `).join('')}
                </div>

                <button id="pa-back-roadmap" style="width:100%;padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#6b7280;cursor:pointer;font-size:11px;">
                    ← Back to project details
                </button>
            </div>
        `;

        // Contribution buttons
        contributeSelectEl.querySelectorAll('.contrib-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentContribution = parseInt(btn.dataset.influence);
                // Select a random scenario for this category
                const categoryScenarios = scenarios[state.selectedType];
                const usedInCategory = state.usedScenarios[state.selectedType] || [];
                const availableScenarios = categoryScenarios.filter((_, idx) => !usedInCategory.includes(idx));

                if (availableScenarios.length === 0) {
                    // Reset if all scenarios used
                    state.usedScenarios[state.selectedType] = [];
                    state.currentScenario = categoryScenarios[Math.floor(Math.random() * categoryScenarios.length)];
                } else {
                    const randomIdx = Math.floor(Math.random() * availableScenarios.length);
                    state.currentScenario = availableScenarios[randomIdx];
                    const originalIdx = categoryScenarios.indexOf(state.currentScenario);
                    state.usedScenarios[state.selectedType] = [...usedInCategory, originalIdx];
                }

                showPhase('scenario');
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.02)';
                btn.style.borderColor = type.color;
            });
            btn.addEventListener('mouseleave', () => {
                const isAllIn = btn.dataset.level === 'All-In';
                btn.style.transform = 'scale(1)';
                btn.style.borderColor = isAllIn ? '#a855f7' : '#333';
            });
        });

        document.getElementById('pa-back-roadmap').addEventListener('click', () => showPhase('roadmap'));
    }

    function renderScenario() {
        const type = projectTypes[state.selectedType];
        const scenario = state.currentScenario;
        const builder = state.selectedBuilder;

        scenarioEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.5);border-radius:12px;border:1px solid ${type.color}40;overflow:hidden;">
                <!-- Scenario Header -->
                <div style="padding:20px;background:linear-gradient(135deg,${type.color}20,transparent);border-bottom:1px solid ${type.color}20;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:15px;">
                        <span style="font-size:32px;">${type.icon}</span>
                        <div>
                            <div style="font-size:11px;color:${type.color};text-transform:uppercase;letter-spacing:1px;">${builder.name}</div>
                            <div style="font-size:18px;font-weight:bold;color:#fff;">${scenario.title}</div>
                        </div>
                    </div>
                    <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0;padding:15px;background:rgba(0,0,0,0.3);border-radius:8px;border-left:3px solid ${type.color};">
                        ${scenario.narrative}
                    </p>
                </div>

                <!-- Choices -->
                <div style="padding:20px;">
                    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:15px;">
                        What do you recommend?
                    </div>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        ${scenario.choices.map((choice, idx) => `
                            <button class="scenario-choice" data-approach="${choice.approach}" style="
                                padding:15px;border-radius:8px;cursor:pointer;
                                background:rgba(255,255,255,0.05);
                                border:1px solid #333;
                                transition:all 0.2s;text-align:left;
                                display:flex;flex-direction:column;gap:5px;">
                                <div style="font-size:14px;font-weight:600;color:#fff;">${choice.text}</div>
                                <div style="font-size:11px;color:#9ca3af;">${choice.desc}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Contribution Info -->
                <div style="padding:15px 20px;background:rgba(0,0,0,0.3);border-top:1px solid #1f2937;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span style="font-size:12px;color:#6b7280;">Your contribution</span>
                        <span style="font-size:14px;font-weight:bold;color:#fbbf24;">⚡ ${state.currentContribution} influence</span>
                    </div>
                </div>
            </div>
        `;

        // Choice button handlers
        scenarioEl.querySelectorAll('.scenario-choice').forEach(btn => {
            btn.addEventListener('click', () => {
                state.selectedChoice = btn.dataset.approach;
                playRound();
            });
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = type.color;
                btn.style.background = hexToRgba(type.color, 0.15);
                btn.style.transform = 'translateX(5px)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = '#333';
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.transform = 'translateX(0)';
            });
        });
    }

    function playRound() {
        const builder = state.selectedBuilder;
        const type = projectTypes[state.selectedType];
        const scenario = state.currentScenario;
        const chosenApproach = state.selectedChoice;
        const outcome = scenario.outcomes[chosenApproach];

        // Spend influence to contribute
        state.influence -= state.currentContribution;

        // Track contributions to this builder
        const builderKey = `${state.selectedType}_${builder.name}`;
        state.contributionsByBuilder[builderKey] = (state.contributionsByBuilder[builderKey] || 0) + 1;
        const contributionCount = state.contributionsByBuilder[builderKey];

        updateUI();

        // Calculate impact based on choice outcome bonuses
        const baseRep = state.currentContribution;
        const baseInf = Math.floor(state.currentContribution * 0.5);

        // Apply scenario outcome bonuses
        const reputationGain = Math.floor(baseRep * outcome.repBonus);
        const influenceGain = Math.floor(baseInf * outcome.infBonus);

        state.reputation += reputationGain;
        state.influence += influenceGain;

        // Determine result presentation based on bonuses
        let resultIcon, resultText;
        const isGreatOutcome = outcome.repBonus >= 1.3 || outcome.infBonus >= 1.3;
        const isGoodOutcome = outcome.repBonus >= 1.0 && outcome.infBonus >= 1.0;

        if (isGreatOutcome) {
            resultIcon = '🚀';
            resultText = 'Excellent Decision!';
            // Success particles
            for (let i = 0; i < 12; i++) {
                state.particles.push({
                    x: canvas.width / 2, y: canvas.height / 2,
                    vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 4,
                    icon: ['⭐', '🤝', '✨', '🚀'][Math.floor(Math.random() * 4)], life: 50
                });
            }
        } else if (isGoodOutcome) {
            resultIcon = '✨';
            resultText = 'Good Call!';
            // Good particles
            for (let i = 0; i < 8; i++) {
                state.particles.push({
                    x: canvas.width / 2, y: canvas.height / 2,
                    vx: (Math.random() - 0.5) * 5, vy: -3 - Math.random() * 3,
                    icon: ['⭐', '✨'][Math.floor(Math.random() * 2)], life: 40
                });
            }
        } else {
            resultIcon = '💭';
            resultText = 'Trade-off Made';
            // Neutral particles
            for (let i = 0; i < 5; i++) {
                state.particles.push({
                    x: canvas.width / 2, y: canvas.height / 2,
                    vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 2,
                    icon: ['💭', '📝'][Math.floor(Math.random() * 2)], life: 35
                });
            }
        }

        const resultDetail = `${outcome.message}\n\n+${reputationGain} reputation • +${influenceGain} influence`;

        state.history.push({
            round: state.round,
            type: state.selectedType,
            builder: builder.name,
            scenario: scenario.title,
            choice: chosenApproach,
            contribution: state.currentContribution,
            reputationGain: reputationGain,
            influenceGain: influenceGain
        });

        state.score = state.reputation;
        updateScore(gameId, state.score);
        updateUI();

        // Show result
        resultIconEl.textContent = resultIcon;
        resultTextEl.textContent = resultText;
        resultTextEl.style.color = isGreatOutcome ? '#22c55e' : isGoodOutcome ? '#3b82f6' : '#f59e0b';
        resultDetailEl.innerHTML = resultDetail.replace('\n\n', '<br><br>');

        // Check for core builder offer (after 2 contributions to same builder with good outcome)
        const shouldOfferPartnership = contributionCount >= 2 && isGoodOutcome && !state.isPartner && state.influence > 0;

        if (state.round >= state.maxRounds || state.influence <= 0) {
            nextBtn.textContent = state.influence <= 0 ? 'Out of Influence' : 'View Your Journey';
            nextBtn.style.background = state.influence <= 0 ? '#f59e0b' : '#fbbf24';
            nextBtn.onclick = () => {
                state.gameOver = true;
                endGame(gameId, state.score);
            };
        } else if (shouldOfferPartnership) {
            // Offer core builder position
            nextBtn.textContent = '🤝 Core Builder Invite!';
            nextBtn.style.background = 'linear-gradient(135deg,#a855f7,#6366f1)';
            nextBtn.onclick = () => {
                state.round++;
                showPhase('partnership-offer');
            };
        } else {
            nextBtn.textContent = 'Continue Building →';
            nextBtn.style.background = '#fbbf24';
            nextBtn.onclick = nextRound;
        }

        showPhase('result');
    }

    function nextRound() {
        state.round++;
        state.selectedType = null;
        state.selectedBuilder = null;
        state.currentContribution = 0;
        updateUI();
        showPhase('select');
    }

    // ===== PARTNERSHIP SYSTEM =====

    function renderPartnershipOffer() {
        const type = projectTypes[state.selectedType];
        const builder = state.selectedBuilder;

        partnershipOfferEl.innerHTML = `
            <div style="background:linear-gradient(135deg,${type.color}20,rgba(0,0,0,0.6));border-radius:12px;padding:25px;border:2px solid ${type.color};text-align:center;">
                <div style="font-size:50px;margin-bottom:15px;">🏗️</div>
                <h3 style="color:${type.color};font-size:20px;margin-bottom:10px;">Core Builder Invitation</h3>
                <p style="color:#9ca3af;font-size:13px;margin-bottom:20px;line-height:1.6;">
                    The ${builder.name} team has noticed your consistent contributions.<br>
                    They're inviting you to become a <strong style="color:#fbbf24;">Core Builder</strong>!
                </p>

                <div style="background:rgba(0,0,0,0.4);border-radius:8px;padding:15px;margin-bottom:20px;text-align:left;">
                    <div style="font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:10px;">What this means</div>
                    <ul style="margin:0;padding-left:20px;color:#d1d5db;font-size:12px;line-height:1.8;">
                        <li>Help shape the project's direction together</li>
                        <li>Make key strategic decisions as a team</li>
                        <li>Gain significant reputation for your commitment</li>
                        <li><span style="color:#f59e0b;">⚠️ You'll focus only on this project</span></li>
                        <li>You can step back anytime to explore other projects</li>
                    </ul>
                </div>

                <div style="display:flex;gap:12px;">
                    <button id="pa-decline-partnership" style="flex:1;padding:12px;border-radius:6px;background:transparent;border:1px solid #444;color:#9ca3af;cursor:pointer;font-size:13px;">
                        Keep Exploring
                    </button>
                    <button id="pa-accept-partnership" style="flex:1;padding:12px;border-radius:6px;background:linear-gradient(135deg,${type.color},${type.color}aa);border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">
                        🏗️ Become Core Builder
                    </button>
                </div>
            </div>
        `;

        document.getElementById('pa-decline-partnership').addEventListener('click', () => {
            showPhase('select');
        });

        document.getElementById('pa-accept-partnership').addEventListener('click', () => {
            // Create partnership
            state.isPartner = true;
            state.partnership = {
                type: state.selectedType,
                builderIdx: state.selectedBuilderIdx,
                builder: state.selectedBuilder,
                roadmapProgress: 2, // Start at Q3 (phases 0,1 already done)
                collabChoices: [],
                decisionsRemaining: 2 // 2 strategic decisions to make
            };
            updateUI();

            // Celebration particles
            for (let i = 0; i < 15; i++) {
                state.particles.push({
                    x: canvas.width / 2, y: canvas.height / 2,
                    vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 4,
                    icon: ['🤝', '🎉', '✨', '🚀'][Math.floor(Math.random() * 4)], life: 60
                });
            }

            showPhase('partnership');
        });
    }

    function renderPartnershipView() {
        const type = projectTypes[state.partnership.type];
        const builder = state.partnership.builder;
        const roadmap = roadmapTemplates[state.partnership.type];
        const progress = state.partnership.roadmapProgress;
        const decisionsRemaining = state.partnership.decisionsRemaining;

        partnershipViewEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;border:1px solid ${type.color}40;overflow:hidden;">
                <!-- Partner Header -->
                <div style="padding:15px;background:linear-gradient(135deg,${type.color}30,transparent);border-bottom:1px solid ${type.color}20;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:36px;">${type.icon}</span>
                            <div>
                                <div style="font-size:18px;font-weight:bold;color:#fff;">${builder.name}</div>
                                <div style="font-size:12px;color:${type.color};">🤝 You are a Partner</div>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px;color:#6b7280;">Strategic Decisions Left</div>
                            <div style="font-size:24px;font-weight:bold;color:#fbbf24;">${decisionsRemaining}</div>
                        </div>
                    </div>
                </div>

                <!-- Collaborative Roadmap -->
                <div style="padding:15px;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:10px;text-transform:uppercase;">Collaborative Roadmap</div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                        ${roadmap.map((phase, idx) => {
                            const isCompleted = idx < progress;
                            const isCurrent = idx === progress;
                            const isCollabPhase = idx >= 2; // Q3 & Q4 are collab phases
                            let statusIcon = '';
                            if (isCompleted) statusIcon = '✅';
                            else if (isCurrent) statusIcon = '🔨';
                            else statusIcon = '⏳';

                            return `
                                <div style="background:${isCompleted ? 'rgba(34,197,94,0.1)' : isCurrent ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)'};
                                    border-radius:6px;padding:10px;
                                    border:2px solid ${isCompleted ? '#22c55e40' : isCurrent ? '#fbbf24' : isCollabPhase ? type.color + '40' : '#33333380'};
                                    ${isCurrent ? 'box-shadow:0 0 15px rgba(251,191,36,0.2);' : ''}">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                                        <span style="font-size:10px;color:${type.color};font-weight:bold;">${phase.phase}</span>
                                        <span style="font-size:14px;">${statusIcon}</span>
                                    </div>
                                    <div style="font-size:11px;color:#fff;font-weight:500;margin-bottom:4px;">${phase.title}</div>
                                    ${isCollabPhase ? '<div style="font-size:9px;color:#a855f7;font-style:italic;">🤝 Co-built</div>' : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Previous Choices -->
                ${state.partnership.collabChoices.length > 0 ? `
                    <div style="padding:0 15px 15px;">
                        <div style="font-size:11px;color:#6b7280;margin-bottom:8px;">Your Decisions</div>
                        <div style="display:flex;flex-wrap:wrap;gap:6px;">
                            ${state.partnership.collabChoices.map(choice => `
                                <span style="padding:4px 10px;background:rgba(168,85,247,0.2);border-radius:12px;font-size:10px;color:#a855f7;">
                                    ${choice}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Actions -->
                <div style="padding:15px;background:rgba(0,0,0,0.3);border-top:1px solid #1f2937;display:flex;gap:10px;">
                    <button id="pa-leave-partnership" style="flex:1;padding:10px;border-radius:6px;background:transparent;border:1px solid #ef444480;color:#ef4444;cursor:pointer;font-size:12px;">
                        ❌ Leave Partnership
                    </button>
                    ${decisionsRemaining > 0 ? `
                        <button id="pa-make-decision" style="flex:2;padding:10px;border-radius:6px;background:linear-gradient(135deg,${type.color},${type.color}cc);border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">
                            📋 Make Strategic Decision
                        </button>
                    ` : `
                        <button id="pa-finish-partnership" style="flex:2;padding:10px;border-radius:6px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:bold;">
                            🏆 Complete Partnership
                        </button>
                    `}
                </div>
            </div>
        `;

        document.getElementById('pa-leave-partnership').addEventListener('click', () => {
            if (confirm('Leave the partnership? You will return to being a regular investor.')) {
                state.isPartner = false;
                state.partnership = null;
                updateUI();
                showPhase('select');
            }
        });

        if (decisionsRemaining > 0) {
            document.getElementById('pa-make-decision').addEventListener('click', () => {
                showPhase('collab');
            });
        } else {
            document.getElementById('pa-finish-partnership').addEventListener('click', () => {
                // Partnership completed successfully - bonus reward
                const bonus = Math.floor(state.cash * 0.5);
                state.cash += bonus;
                state.score = Math.max(0, state.cash - 1000);
                updateScore(gameId, state.score);
                updateUI();

                // Big celebration
                for (let i = 0; i < 20; i++) {
                    state.particles.push({
                        x: canvas.width / 2, y: canvas.height / 2,
                        vx: (Math.random() - 0.5) * 10, vy: -5 - Math.random() * 5,
                        icon: ['🏆', '💰', '🚀', '✨', '🎉'][Math.floor(Math.random() * 5)], life: 70
                    });
                }

                // End game as successful partner
                state.gameOver = true;
                endGame(gameId, state.score);
            });
        }
    }

    function renderCollabDecision() {
        const type = projectTypes[state.partnership.type];
        const options = collabOptions[state.partnership.type];
        const decisionIndex = 2 - state.partnership.decisionsRemaining; // 0 or 1
        const decision = options[decisionIndex] || options[0];

        collabEl.innerHTML = `
            <div style="background:rgba(0,0,0,0.4);border-radius:10px;padding:20px;border:1px solid ${type.color}40;">
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="font-size:40px;margin-bottom:10px;">📋</div>
                    <h3 style="color:#fff;font-size:18px;margin-bottom:6px;">${decision.title}</h3>
                    <p style="color:#9ca3af;font-size:12px;">${decision.desc}</p>
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:15px;">
                    ${decision.options.map((option, idx) => `
                        <button class="collab-option" data-choice="${option}" style="
                            padding:14px;border-radius:8px;cursor:pointer;
                            background:rgba(255,255,255,0.05);
                            border:1px solid #333;color:#fff;font-size:13px;
                            text-align:left;transition:all 0.2s;">
                            <span style="color:${type.color};margin-right:8px;">${idx + 1}.</span>
                            ${option}
                        </button>
                    `).join('')}
                </div>

                <button id="pa-back-to-partnership" style="width:100%;padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#6b7280;cursor:pointer;font-size:11px;">
                    ← Back to partnership view
                </button>
            </div>
        `;

        collabEl.querySelectorAll('.collab-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const choice = btn.dataset.choice;
                state.partnership.collabChoices.push(choice);
                state.partnership.decisionsRemaining--;
                state.partnership.roadmapProgress++;
                state.round++;

                // Random outcome based on choice
                const outcomeRoll = Math.random();
                let bonus = 0;
                if (outcomeRoll > 0.3) {
                    // Good outcome
                    bonus = Math.floor(state.cash * (0.1 + Math.random() * 0.2));
                    state.cash += bonus;
                }

                state.score = Math.max(0, state.cash - 1000);
                updateUI();
                updateScore(gameId, state.score);

                // Show outcome briefly then return to partnership view
                collabEl.innerHTML = `
                    <div style="text-align:center;padding:30px;">
                        <div style="font-size:50px;margin-bottom:15px;">${bonus > 0 ? '✅' : '🤔'}</div>
                        <div style="font-size:18px;color:${bonus > 0 ? '#22c55e' : '#f59e0b'};font-weight:bold;margin-bottom:10px;">
                            ${bonus > 0 ? 'Great Decision!' : 'Time Will Tell...'}
                        </div>
                        <div style="font-size:13px;color:#9ca3af;margin-bottom:8px;">
                            You chose: "${choice}"
                        </div>
                        ${bonus > 0 ? `<div style="font-size:16px;color:#22c55e;font-weight:bold;">+$${bonus.toLocaleString()} bonus</div>` : ''}
                    </div>
                `;

                setTimeout(() => {
                    showPhase('partnership');
                }, 2000);
            });

            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = type.color;
                btn.style.background = hexToRgba(type.color, 0.15);
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = '#333';
                btn.style.background = 'rgba(255,255,255,0.05)';
            });
        });

        document.getElementById('pa-back-to-partnership').addEventListener('click', () => {
            showPhase('partnership');
        });
    }

    // Type selection event listeners
    const typeButtons = typeSelectEl.querySelectorAll('.type-btn');
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.selectedType = btn.dataset.type;
            showPhase('builder');
        });
        btn.addEventListener('mouseenter', () => {
            const type = projectTypes[btn.dataset.type];
            btn.style.borderColor = type.color;
            btn.style.background = hexToRgba(type.color, 0.2);
            btn.style.transform = 'scale(1.02)';
        });
        btn.addEventListener('mouseleave', () => {
            const type = projectTypes[btn.dataset.type];
            btn.style.borderColor = type.color;
            btn.style.background = 'rgba(0,0,0,0.5)';
            btn.style.transform = 'scale(1)';
        });
    });

    function update() {
        if (state.gameOver) return;

        // Particles
        state.particles = state.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12;
            p.life--;
            return p.life > 0;
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        state.particles.forEach(p => {
            ctx.globalAlpha = p.life / 50;
            ctx.fillText(p.icon, p.x, p.y);
        });
        ctx.globalAlpha = 1;
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    updateUI();
    showPhase('select');
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => { state.gameOver = true; }
    };
}

function startWhaleWatch(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    // Symbol legend with names
    const symbolLegend = [
        { symbol: '🔥', name: 'Fire' },
        { symbol: '💎', name: 'Diamond' },
        { symbol: '🚀', name: 'Rocket' },
        { symbol: '💰', name: 'Money' },
        { symbol: '⭐', name: 'Star' },
        { symbol: '🎮', name: 'Game' },
        { symbol: '🏆', name: 'Trophy' },
        { symbol: '💫', name: 'Sparkle' }
    ];

    // Split screen: Symbol Match (left) + Memory Game (right)
    const state = {
        score: 0,
        level: 1,
        gameOver: false,
        // Symbol Match (left side) - Match symbol with description
        symbolMatch: {
            grid: [],
            targetIndex: 0, // Index in symbolLegend
            foundCount: 0,
            totalTargets: 0,
            timer: 45,
            cols: 5,
            rows: 5,
            completed: false,
            mistakes: 0, // Track mistakes - 3 mistakes flips correct cards back
            maxMistakes: 3
        },
        // Memory Game (right side) with input timer
        memoryGame: {
            sequence: [],
            playerSequence: [],
            showingSequence: false,
            currentShowIndex: 0,
            waitingForInput: false,
            inputTimer: 0,
            inputTimeLimit: 10,
            buttons: [],
            round: 1,
            completed: false
        },
        colors: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899']
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;display:flex;gap:15px;background:linear-gradient(180deg,#0a1628 0%,#1a2744 100%);padding:15px;box-sizing:border-box;">
            <!-- LEFT: Symbol Match with Legend -->
            <div style="flex:1;display:flex;flex-direction:column;background:rgba(0,0,0,0.3);border-radius:12px;padding:15px;border:2px solid #333;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-size:14px;font-weight:bold;color:var(--gold);">🎯 SYMBOL MATCH</div>
                    <div style="display:flex;gap:10px;">
                        <span style="color:var(--accent-fire);font-size:12px;">⏱️ <span id="sm-timer">45</span>s</span>
                        <span style="color:var(--green);font-size:12px;"><span id="sm-found">0</span>/<span id="sm-total">0</span></span>
                        <span style="color:#ef4444;font-size:12px;">❌ <span id="sm-mistakes">0</span>/3</span>
                    </div>
                </div>
                <!-- Legend replaces "Find all" -->
                <div id="symbol-legend" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px;padding:6px;background:rgba(0,0,0,0.4);border-radius:8px;font-size:10px;"></div>
                <!-- Target description -->
                <div style="text-align:center;margin-bottom:8px;padding:8px;background:rgba(251,191,36,0.2);border-radius:8px;">
                    <span style="font-size:11px;color:var(--text-muted);">Find all: </span>
                    <span id="sm-target-name" style="font-size:16px;font-weight:bold;color:var(--gold);">Fire</span>
                </div>
                <div id="symbol-grid" style="flex:1;display:grid;grid-template-columns:repeat(5,1fr);gap:4px;"></div>
            </div>
            <!-- RIGHT: Memory Game with Timer -->
            <div style="flex:1;display:flex;flex-direction:column;background:rgba(0,0,0,0.3);border-radius:12px;padding:15px;border:2px solid #333;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-size:14px;font-weight:bold;color:var(--purple);">🧠 MEMORY SEQUENCE</div>
                    <div style="display:flex;gap:10px;">
                        <span style="color:var(--cyan);font-size:12px;">Round: <span id="mem-round">1</span></span>
                    </div>
                </div>
                <!-- Input Timer Bar -->
                <div style="margin-bottom:8px;height:8px;background:rgba(0,0,0,0.5);border-radius:4px;overflow:hidden;">
                    <div id="mem-timer-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#fbbf24);transition:width 0.1s linear;"></div>
                </div>
                <div id="mem-status" style="text-align:center;font-size:12px;color:var(--text-muted);margin-bottom:10px;">Watch the sequence!</div>
                <div id="mem-timer-display" style="text-align:center;font-size:18px;font-weight:bold;color:var(--green);margin-bottom:10px;display:none;">10s</div>
                <div id="memory-buttons" style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:15px;max-width:250px;margin:0 auto;"></div>
            </div>
        </div>
        <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:20px;z-index:10;">
            <div style="background:rgba(0,0,0,0.8);padding:8px 20px;border-radius:8px;border:2px solid var(--gold);">
                <span style="color:var(--gold);font-size:16px;font-weight:bold;">SCORE: <span id="ww-score">0</span></span>
            </div>
            <div style="background:rgba(0,0,0,0.8);padding:8px 20px;border-radius:8px;border:2px solid var(--purple);">
                <span style="color:var(--purple);font-size:16px;font-weight:bold;">LEVEL: <span id="ww-level">1</span></span>
            </div>
        </div>
    `;

    const symbolGrid = document.getElementById('symbol-grid');
    const legendEl = document.getElementById('symbol-legend');
    const smTimerEl = document.getElementById('sm-timer');
    const smFoundEl = document.getElementById('sm-found');
    const smTotalEl = document.getElementById('sm-total');
    const smTargetNameEl = document.getElementById('sm-target-name');
    const smMistakesEl = document.getElementById('sm-mistakes');
    const memButtons = document.getElementById('memory-buttons');
    const memStatusEl = document.getElementById('mem-status');
    const memRoundEl = document.getElementById('mem-round');
    const memTimerBarEl = document.getElementById('mem-timer-bar');
    const memTimerDisplayEl = document.getElementById('mem-timer-display');

    // Build legend display
    function buildLegend() {
        legendEl.innerHTML = '';
        symbolLegend.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.style.cssText = 'display:flex;align-items:center;gap:3px;padding:2px 4px;background:rgba(255,255,255,0.1);border-radius:4px;';
            legendItem.innerHTML = `<span style="font-size:14px;">${item.symbol}</span><span style="color:#9ca3af;">${item.name}</span>`;
            legendEl.appendChild(legendItem);
        });
    }
    buildLegend();

    // ============ SYMBOL MATCH (LEFT) ============
    function setupSymbolHunt() {
        state.symbolMatch.grid = [];
        state.symbolMatch.foundCount = 0;
        state.symbolMatch.completed = false;
        state.symbolMatch.mistakes = 0;
        smMistakesEl.textContent = '0';

        // Pick target from legend (by name, not symbol)
        state.symbolMatch.targetIndex = Math.floor(Math.random() * symbolLegend.length);
        const target = symbolLegend[state.symbolMatch.targetIndex];
        smTargetNameEl.textContent = target.name;

        // Create grid with symbols
        const totalCells = state.symbolMatch.cols * state.symbolMatch.rows;
        state.symbolMatch.totalTargets = 3 + state.level; // More targets per level

        const gridSymbols = [];

        // Add target symbols
        for (let i = 0; i < state.symbolMatch.totalTargets; i++) {
            gridSymbols.push({ symbol: target.symbol, isTarget: true, found: false });
        }

        // Fill rest with random symbols from legend
        for (let i = state.symbolMatch.totalTargets; i < totalCells; i++) {
            let randomItem;
            do {
                randomItem = symbolLegend[Math.floor(Math.random() * symbolLegend.length)];
            } while (randomItem.symbol === target.symbol);
            gridSymbols.push({ symbol: randomItem.symbol, isTarget: false, found: false });
        }

        // Shuffle
        state.symbolMatch.grid = gridSymbols.sort(() => Math.random() - 0.5);

        smTotalEl.textContent = state.symbolMatch.totalTargets;
        smFoundEl.textContent = '0';
        state.symbolMatch.timer = Math.max(20, 45 - state.level * 3);
        smTimerEl.textContent = state.symbolMatch.timer;

        // Render grid - cards start hidden (face down)
        symbolGrid.innerHTML = '';
        state.symbolMatch.grid.forEach((cell, idx) => {
            const cellEl = document.createElement('div');
            cellEl.dataset.index = idx;
            cellEl.dataset.revealed = 'false';
            cellEl.style.cssText = `background:linear-gradient(135deg,#3b82f6,#1e40af);border:2px solid #60a5fa;border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:22px;transition:all 0.2s;`;
            cellEl.textContent = '❓'; // Hidden card
            cellEl.onclick = () => clickSymbol(idx);
            symbolGrid.appendChild(cellEl);
        });
    }

    function clickSymbol(index) {
        if (state.symbolMatch.completed || state.gameOver) return;

        const cell = state.symbolMatch.grid[index];
        const cellEl = symbolGrid.children[index];

        if (cell.found) return;
        if (cellEl.dataset.revealed === 'true') return; // Already revealed and wrong

        // Reveal the card
        cellEl.textContent = cell.symbol;
        cellEl.style.background = 'rgba(59,130,246,0.15)';

        if (cell.isTarget) {
            // Found target!
            cell.found = true;
            cellEl.dataset.revealed = 'true';
            state.symbolMatch.foundCount++;
            smFoundEl.textContent = state.symbolMatch.foundCount;

            cellEl.style.background = 'rgba(34,197,94,0.5)';
            cellEl.style.borderColor = '#22c55e';
            cellEl.style.transform = 'scale(1.1)';
            setTimeout(() => cellEl.style.transform = '', 200);

            const bonus = 10 + state.level * 5;
            state.score += bonus;
            document.getElementById('ww-score').textContent = state.score;
            recordScoreUpdate(gameId, state.score, bonus);

            // Check if all found
            if (state.symbolMatch.foundCount >= state.symbolMatch.totalTargets) {
                state.symbolMatch.completed = true;
                const timeBonus = state.symbolMatch.timer * 3;
                state.score += timeBonus;
                document.getElementById('ww-score').textContent = state.score;

                // Next level
                setTimeout(() => {
                    state.level++;
                    document.getElementById('ww-level').textContent = state.level;
                    setupSymbolHunt();
                    // Also advance memory game
                    if (state.memoryGame.completed) {
                        startMemoryRound();
                    }
                }, 1000);
            }
        } else {
            // Wrong! Show briefly then hide again
            cellEl.style.background = 'rgba(239,68,68,0.5)';
            cellEl.style.borderColor = '#ef4444';
            setTimeout(() => {
                cellEl.textContent = '❓';
                cellEl.style.background = 'linear-gradient(135deg,#3b82f6,#1e40af)';
                cellEl.style.borderColor = '#60a5fa';
            }, 500);

            state.score = Math.max(0, state.score - 5);
            document.getElementById('ww-score').textContent = state.score;

            // Track mistakes
            state.symbolMatch.mistakes++;
            smMistakesEl.textContent = state.symbolMatch.mistakes;

            // 3 mistakes = flip all correct cards back to hidden!
            if (state.symbolMatch.mistakes >= state.symbolMatch.maxMistakes) {
                state.symbolMatch.mistakes = 0;
                smMistakesEl.textContent = '0';

                // Flash warning
                symbolGrid.style.boxShadow = '0 0 20px #ef4444';
                setTimeout(() => symbolGrid.style.boxShadow = '', 300);

                // Flip all found cards back to hidden
                state.symbolMatch.grid.forEach((cell, idx) => {
                    if (cell.found && cell.isTarget) {
                        cell.found = false;
                        const cardEl = symbolGrid.children[idx];
                        cardEl.textContent = '❓';
                        cardEl.style.background = 'linear-gradient(135deg,#3b82f6,#1e40af)';
                        cardEl.style.borderColor = '#60a5fa';
                        cardEl.style.transform = '';
                        cardEl.dataset.revealed = 'false';
                    }
                });

                // Reset found count
                state.symbolMatch.foundCount = 0;
                smFoundEl.textContent = '0';

                // Penalty score
                state.score = Math.max(0, state.score - 20);
                document.getElementById('ww-score').textContent = state.score;
            }
        }

        updateScore(gameId, state.score);
    }

    // ============ MEMORY GAME (RIGHT) ============
    function setupMemoryGame() {
        // Create 4 symbol buttons (shark, whale, fish, dog)
        const buttonConfigs = [
            { symbol: '🦈', name: 'shark', color: '#3b82f6' },
            { symbol: '🐋', name: 'whale', color: '#0ea5e9' },
            { symbol: '🐟', name: 'fish', color: '#22c55e' },
            { symbol: '🐕', name: 'dog', color: '#f59e0b' }
        ];

        memButtons.innerHTML = '';
        state.memoryGame.buttons = [];

        buttonConfigs.forEach((config, idx) => {
            const btn = document.createElement('button');
            btn.dataset.index = idx;
            btn.dataset.name = config.name;
            btn.style.cssText = `
                background: linear-gradient(135deg, ${config.color}40, ${config.color}20);
                border: 4px solid ${config.color};
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.15s;
                opacity: 0.7;
                min-height: 80px;
                font-size: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            btn.textContent = config.symbol;
            btn.onclick = () => playerPressButton(idx);
            memButtons.appendChild(btn);
            state.memoryGame.buttons.push({ el: btn, config });
        });

        startMemoryRound();
    }

    let memoryTimerInterval = null;

    function startMemoryRound() {
        state.memoryGame.completed = false;
        state.memoryGame.playerSequence = [];
        state.memoryGame.waitingForInput = false;
        memStatusEl.textContent = 'Watch the sequence!';
        memStatusEl.style.color = '#a855f7';
        memTimerDisplayEl.style.display = 'none';
        memTimerBarEl.style.width = '100%';
        memTimerBarEl.style.background = 'linear-gradient(90deg,#22c55e,#fbbf24)';

        // Clear any existing timer
        if (memoryTimerInterval) {
            clearInterval(memoryTimerInterval);
            memoryTimerInterval = null;
        }

        // Add one more to sequence
        state.memoryGame.sequence.push(Math.floor(Math.random() * 4));
        memRoundEl.textContent = state.memoryGame.round;

        // Calculate time limit (less time for higher rounds)
        state.memoryGame.inputTimeLimit = Math.max(4, 10 - Math.floor(state.memoryGame.round / 3));

        // Show sequence
        setTimeout(() => showSequence(), 500);
    }

    function showSequence() {
        state.memoryGame.showingSequence = true;
        state.memoryGame.currentShowIndex = 0;

        function showNext() {
            if (state.memoryGame.currentShowIndex >= state.memoryGame.sequence.length) {
                state.memoryGame.showingSequence = false;
                state.memoryGame.waitingForInput = true;
                memStatusEl.textContent = 'Your turn!';
                memStatusEl.style.color = '#22c55e';
                // Start input timer
                startMemoryInputTimer();
                return;
            }

            const btnIdx = state.memoryGame.sequence[state.memoryGame.currentShowIndex];
            flashButton(btnIdx, true);

            setTimeout(() => {
                flashButton(btnIdx, false);
                state.memoryGame.currentShowIndex++;
                setTimeout(showNext, 300);
            }, 500);
        }

        showNext();
    }

    function startMemoryInputTimer() {
        state.memoryGame.inputTimer = state.memoryGame.inputTimeLimit;
        memTimerDisplayEl.style.display = 'block';
        memTimerDisplayEl.textContent = state.memoryGame.inputTimer + 's';

        memoryTimerInterval = setInterval(() => {
            if (state.gameOver || !state.memoryGame.waitingForInput) {
                clearInterval(memoryTimerInterval);
                memoryTimerInterval = null;
                memTimerDisplayEl.style.display = 'none';
                return;
            }

            state.memoryGame.inputTimer -= 0.1;
            const timeLeft = Math.max(0, state.memoryGame.inputTimer);
            const percent = (timeLeft / state.memoryGame.inputTimeLimit) * 100;

            memTimerBarEl.style.width = percent + '%';
            memTimerDisplayEl.textContent = Math.ceil(timeLeft) + 's';

            // Change color based on time left
            if (percent < 30) {
                memTimerBarEl.style.background = '#ef4444';
                memTimerDisplayEl.style.color = '#ef4444';
            } else if (percent < 60) {
                memTimerBarEl.style.background = 'linear-gradient(90deg,#f59e0b,#ef4444)';
                memTimerDisplayEl.style.color = '#f59e0b';
            } else {
                memTimerDisplayEl.style.color = '#22c55e';
            }

            if (state.memoryGame.inputTimer <= 0) {
                // Time's up!
                clearInterval(memoryTimerInterval);
                memoryTimerInterval = null;
                state.memoryGame.waitingForInput = false;
                memStatusEl.textContent = '⏰ Time\'s up! Game Over';
                memStatusEl.style.color = '#ef4444';
                state.gameOver = true;
                setTimeout(() => endGame(gameId, state.score), 1500);
            }
        }, 100);
    }

    function flashButton(idx, on) {
        const button = state.memoryGame.buttons[idx];
        const btn = button.el;
        const config = button.config;
        if (on) {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1.1)';
            btn.style.borderColor = '#fff';
            btn.style.boxShadow = `0 0 20px ${config.color}`;
        } else {
            btn.style.opacity = '0.7';
            btn.style.transform = '';
            btn.style.borderColor = config.color;
            btn.style.boxShadow = '';
        }
    }

    function playerPressButton(idx) {
        if (!state.memoryGame.waitingForInput || state.gameOver) return;

        flashButton(idx, true);
        setTimeout(() => flashButton(idx, false), 200);

        state.memoryGame.playerSequence.push(idx);
        const currentPos = state.memoryGame.playerSequence.length - 1;

        if (state.memoryGame.sequence[currentPos] !== idx) {
            // Wrong!
            memStatusEl.textContent = '❌ Wrong! Game Over';
            memStatusEl.style.color = '#ef4444';
            state.gameOver = true;
            setTimeout(() => endGame(gameId, state.score), 1500);
            return;
        }

        // Correct so far
        const bonus = 5 * state.memoryGame.round;
        state.score += bonus;
        document.getElementById('ww-score').textContent = state.score;
        recordScoreUpdate(gameId, state.score, bonus);

        if (state.memoryGame.playerSequence.length === state.memoryGame.sequence.length) {
            // Completed sequence! Stop the timer
            if (memoryTimerInterval) {
                clearInterval(memoryTimerInterval);
                memoryTimerInterval = null;
            }
            memTimerDisplayEl.style.display = 'none';

            state.memoryGame.completed = true;
            state.memoryGame.waitingForInput = false;
            state.memoryGame.round++;

            // Time bonus for fast completion
            const timeBonus = Math.floor(state.memoryGame.inputTimer * 5);
            const roundBonus = 20 * state.memoryGame.round + timeBonus;
            state.score += roundBonus;
            document.getElementById('ww-score').textContent = state.score;

            memStatusEl.textContent = '✅ Perfect! Next round...';
            memStatusEl.style.color = '#22c55e';

            setTimeout(startMemoryRound, 1500);
        }

        updateScore(gameId, state.score);
    }

    // ============ TIMER FOR SYMBOL HUNT ============
    let timerInterval;

    function startTimer() {
        timerInterval = setInterval(() => {
            if (state.gameOver || state.symbolMatch.completed) return;

            state.symbolMatch.timer--;
            smTimerEl.textContent = state.symbolMatch.timer;

            if (state.symbolMatch.timer <= 10) {
                smTimerEl.style.color = '#ef4444';
            }

            if (state.symbolMatch.timer <= 0) {
                // Time's up for symbol hunt - reset with new symbols
                state.symbolMatch.timer = Math.max(20, 45 - state.level * 3);
                smTimerEl.style.color = '';
                setupSymbolHunt();
            }
        }, 1000);
    }

    // Initialize both games
    setupSymbolHunt();
    setupMemoryGame();
    startTimer();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            clearInterval(timerInterval);
            if (memoryTimerInterval) {
                clearInterval(memoryTimerInterval);
            }
        }
    };
}

function startStakeStacker(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    const state = {
        score: 0,
        level: 1,
        gameOver: false,
        blocks: [],
        currentBlock: null,
        baseWidth: 220, // Bigger blocks
        blockHeight: 35, // Taller blocks
        direction: 1,
        speed: 5, // Faster base speed
        perfectStreak: 0,
        cameraOffset: 0 // For scrolling from 7th block
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 50%,#1a1a2e 100%);">
            <canvas id="ss-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:20px;">
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--gold);">Score: <span id="ss-score">0</span></span>
                </div>
                <div style="background:rgba(0,0,0,0.5);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--purple);">Height: <span id="ss-level">0</span></span>
                </div>
            </div>
            <div style="position:absolute;bottom:15px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:12px;">
                CLICK or SPACE to drop block
            </div>
        </div>
    `;

    const canvas = document.getElementById('ss-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    function initGame() {
        state.blocks = [];
        state.level = 0;
        state.score = 0;
        state.gameOver = false;
        state.perfectStreak = 0;

        // Ensure canvas is sized
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
        }

        // Base block (centered at bottom)
        const baseX = (canvas.width - state.baseWidth) / 2;
        const baseY = canvas.height - 60;

        state.blocks.push({
            x: baseX,
            y: baseY,
            width: state.baseWidth,
            height: state.blockHeight,
            color: getBlockColor(0)
        });

        document.getElementById('ss-score').textContent = '0';
        document.getElementById('ss-level').textContent = '0';

        spawnBlock();
    }

    function getBlockColor(index) {
        const colors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];
        return colors[index % colors.length];
    }

    function spawnBlock() {
        const lastBlock = state.blocks[state.blocks.length - 1];
        state.level++;

        state.currentBlock = {
            x: 0,
            y: lastBlock.y - state.blockHeight - 5,
            width: lastBlock.width,
            height: state.blockHeight,
            color: getBlockColor(state.level)
        };

        state.direction = 1;
        state.speed = Math.min(12, 5 + state.level * 0.5); // Faster speed progression

        document.getElementById('ss-level').textContent = state.level;

        // From the 7th block, progressively scroll camera up
        if (state.level >= 7) {
            const targetOffset = (state.level - 6) * (state.blockHeight + 5);
            state.cameraOffset = targetOffset;
        }
    }

    function dropBlock() {
        if (!state.currentBlock || state.gameOver) return;

        const current = state.currentBlock;
        const last = state.blocks[state.blocks.length - 1];

        // Calculate overlap
        const overlapStart = Math.max(current.x, last.x);
        const overlapEnd = Math.min(current.x + current.width, last.x + last.width);
        const overlapWidth = overlapEnd - overlapStart;

        if (overlapWidth <= 0) {
            // Missed completely
            state.gameOver = true;
            endGame(gameId, state.score);
            return;
        }

        // Perfect or partial?
        const isPerfect = Math.abs(current.x - last.x) < 5;

        if (isPerfect) {
            state.perfectStreak++;
            state.score += 50 + state.perfectStreak * 10;
            current.x = last.x;
            current.width = last.width;
        } else {
            state.perfectStreak = 0;
            state.score += Math.floor(overlapWidth / 2);
            current.x = overlapStart;
            current.width = overlapWidth;
        }

        state.blocks.push({ ...current });
        document.getElementById('ss-score').textContent = state.score;
        updateScore(gameId, state.score);

        if (current.width < 10) {
            state.gameOver = true;
            endGame(gameId, state.score);
            return;
        }

        spawnBlock();
    }

    function update() {
        if (state.gameOver || !state.currentBlock) return;

        state.currentBlock.x += state.speed * state.direction;

        if (state.currentBlock.x + state.currentBlock.width > canvas.width) {
            state.direction = -1;
        } else if (state.currentBlock.x < 0) {
            state.direction = 1;
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply camera offset (scroll up from 7th block)
        ctx.save();
        ctx.translate(0, state.cameraOffset);

        // Draw stacked blocks
        state.blocks.forEach((block, i) => {
            ctx.fillStyle = block.color;
            ctx.fillRect(block.x, block.y, block.width, block.height);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.strokeRect(block.x, block.y, block.width, block.height);

            // APY label (bigger font for bigger blocks)
            if (i > 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`${(i * 2.5).toFixed(1)}% APY`, block.x + block.width / 2, block.y + 22);
            }
        });

        // Draw current block
        if (state.currentBlock) {
            ctx.fillStyle = state.currentBlock.color;
            ctx.globalAlpha = 0.8;
            ctx.fillRect(state.currentBlock.x, state.currentBlock.y, state.currentBlock.width, state.currentBlock.height);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(state.currentBlock.x, state.currentBlock.y, state.currentBlock.width, state.currentBlock.height);
        }

        ctx.restore(); // Restore from camera offset

        // Perfect streak indicator (fixed position, not affected by camera)
        if (state.perfectStreak > 1) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 ${state.perfectStreak}x PERFECT!`, canvas.width / 2, 80);
        }

        // Height indicator
        if (state.level >= 7) {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Tower Height: ${state.level} blocks`, canvas.width / 2, canvas.height - 40);
        }
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleInput(e) {
        if (e.type === 'keydown' && e.code !== 'Space') return;
        e.preventDefault();
        dropBlock();
    }

    // Initialize with small delay to ensure DOM is ready
    resizeCanvas();
    setTimeout(() => {
        resizeCanvas();
        initGame();
        gameLoop();
    }, 50);

    document.addEventListener('keydown', handleInput);
    canvas.addEventListener('click', handleInput);

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleInput);
            canvas.removeEventListener('click', handleInput);
        }
    };
}

function startDexDash(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    // Dex Dash - Smooth movement racing game with enhanced speed effects
    // Progressive difficulty - moderate scaling
    const state = {
        score: 0,
        gameOver: false,
        player: { x: 0, y: 0, vx: 0, vy: 0, speed: 2 },
        obstacles: [],
        boosts: [],
        deathTraps: [], // Game over objects
        distance: 0,
        baseMaxSpeed: 6, // Starting max speed
        maxSpeed: 6,
        acceleration: 0.025, // Moderate acceleration
        roadOffset: 0,
        keys: { left: false, right: false, up: false, down: false },
        effects: [],
        // Speed effects
        speedParticles: [], // Trailing particles behind player
        windParticles: [], // Side wind effect
        screenShake: 0,
        turboFlash: 0,
        lastTrailTime: 0,
        // Difficulty scaling
        difficultyMultiplier: 1
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a1a3a 100%);">
            <canvas id="dd-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:15px;left:50%;transform:translateX(-50%);display:flex;gap:15px;">
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:10px;">DISTANCE</span>
                    <div style="color:var(--gold);font-size:16px;font-weight:bold;" id="dd-distance">0m</div>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:10px;">SCORE</span>
                    <div style="color:var(--green);font-size:16px;font-weight:bold;" id="dd-score">0</div>
                </div>
                <div style="background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;">
                    <span style="color:var(--text-muted);font-size:10px;">SPEED</span>
                    <div style="color:var(--purple);font-size:16px;font-weight:bold;" id="dd-speed">0</div>
                </div>
            </div>
            <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:var(--text-muted);font-size:10px;background:rgba(0,0,0,0.5);padding:8px 15px;border-radius:8px;">
                WASD or Arrows = Move | 🦄 Boost | 🚧 Slow | 💀 Game Over
            </div>
        </div>
    `;

    const canvas = document.getElementById('dd-canvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        state.player.x = canvas.width / 2;
        state.player.y = canvas.height - 80;
    }
    resizeCanvas();

    const roadWidth = 380; // Wider road
    const roadLeft = () => (canvas.width - roadWidth) / 2;
    const roadRight = () => roadLeft() + roadWidth;

    const dexLogos = ['🦄', '🥞', '🍣', '☀️', '🌊', '💎'];
    const obstacleTypes = [
        { icon: '🚧', slowdown: 2 },
        { icon: '⛔', slowdown: 3 },
        { icon: '🐌', slowdown: 1.5 }
    ];

    function spawnObstacle() {
        const x = roadLeft() + 40 + Math.random() * (roadWidth - 80);
        const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        state.obstacles.push({
            x, y: -40,
            size: 35,
            fallSpeed: 1.2 + Math.random() * 0.8,
            ...type
        });
    }

    function spawnBoost() {
        const x = roadLeft() + 40 + Math.random() * (roadWidth - 80);
        state.boosts.push({
            x, y: -40,
            icon: dexLogos[Math.floor(Math.random() * dexLogos.length)],
            size: 30,
            fallSpeed: 0.9 + Math.random() * 0.5,
            value: 25 + Math.floor(state.distance / 100) * 5
        });
    }

    function spawnDeathTrap() {
        const x = roadLeft() + 50 + Math.random() * (roadWidth - 100);
        state.deathTraps.push({
            x, y: -40,
            icon: '💀',
            size: 40,
            fallSpeed: 0.7 + Math.random() * 0.4,
            pulse: 0
        });
    }

    function addEffect(x, y, text, color) {
        state.effects.push({ x, y, text, color, life: 40, vy: -1.5 });
    }

    function update() {
        if (state.gameOver) return;

        // Progressive difficulty scaling - moderate increase over distance
        state.difficultyMultiplier = 1 + (state.distance / 800) * 0.3; // +30% difficulty every 800m
        state.maxSpeed = state.baseMaxSpeed + Math.floor(state.distance / 500) * 0.5; // +0.5 max speed every 500m
        state.maxSpeed = Math.min(12, state.maxSpeed); // Cap at 12

        // Gradual speed increase
        const dynamicAccel = state.acceleration * (1 + state.distance / 3000);
        state.player.speed = Math.min(state.maxSpeed, state.player.speed + dynamicAccel);
        state.distance += state.player.speed * 0.3;
        state.roadOffset = (state.roadOffset + state.player.speed * 2) % 40;

        // Smooth movement (horizontal + vertical)
        const moveSpeed = 7; // Faster movement
        const friction = 0.90;

        // Horizontal
        if (state.keys.left) state.player.vx -= moveSpeed * 0.2;
        if (state.keys.right) state.player.vx += moveSpeed * 0.2;
        state.player.vx *= friction;
        state.player.vx = Math.max(-moveSpeed, Math.min(moveSpeed, state.player.vx));
        state.player.x += state.player.vx;

        // Vertical movement
        if (state.keys.up) state.player.vy -= moveSpeed * 0.15;
        if (state.keys.down) state.player.vy += moveSpeed * 0.15;
        state.player.vy *= friction;
        state.player.vy = Math.max(-moveSpeed * 0.7, Math.min(moveSpeed * 0.7, state.player.vy));
        state.player.y += state.player.vy;

        // Horizontal boundary collision
        const playerHalfWidth = 20;
        if (state.player.x < roadLeft() + playerHalfWidth) {
            state.player.x = roadLeft() + playerHalfWidth;
            state.player.vx = Math.abs(state.player.vx) * 0.3;
            state.player.speed = Math.max(1, state.player.speed - 0.5);
        }
        if (state.player.x > roadRight() - playerHalfWidth) {
            state.player.x = roadRight() - playerHalfWidth;
            state.player.vx = -Math.abs(state.player.vx) * 0.3;
            state.player.speed = Math.max(1, state.player.speed - 0.5);
        }

        // Vertical boundary (stay on screen)
        const minY = 100; // Don't go too high
        const maxY = canvas.height - 50; // Don't go too low
        state.player.y = Math.max(minY, Math.min(maxY, state.player.y));

        // Spawn objects - spawn rates increase moderately with distance
        const spawnMod = Math.min(2.5, 1 + state.distance * 0.0004);
        if (Math.random() < 0.008 * spawnMod) spawnObstacle();
        if (Math.random() < 0.004 * spawnMod) spawnBoost();
        if (state.distance > 250 && Math.random() < 0.003 * spawnMod) spawnDeathTrap();

        // Update obstacles - speed increases with game progression
        state.obstacles = state.obstacles.filter(obs => {
            obs.y += (state.player.speed + obs.fallSpeed * state.difficultyMultiplier);

            // Collision check (circular)
            const dx = obs.x - state.player.x;
            const dy = obs.y - state.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < obs.size / 2 + 20) {
                state.player.speed = Math.max(0.5, state.player.speed - obs.slowdown);
                state.score = Math.max(0, state.score - 15);
                addEffect(obs.x, obs.y, '-15', '#ef4444');
                return false;
            }

            return obs.y < canvas.height + 50;
        });

        // Update boosts - speed increases with game progression
        state.boosts = state.boosts.filter(boost => {
            boost.y += (state.player.speed + boost.fallSpeed * state.difficultyMultiplier);

            const dx = boost.x - state.player.x;
            const dy = boost.y - state.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < boost.size / 2 + 20) {
                state.score += boost.value;
                state.player.speed = Math.min(state.maxSpeed, state.player.speed + 0.5);
                addEffect(boost.x, boost.y, '+' + boost.value, '#22c55e');
                recordScoreUpdate(gameId, state.score, boost.value);
                // Trigger turbo flash effect
                state.turboFlash = 1;
                // Extra speed particles burst
                for (let j = 0; j < 10; j++) {
                    state.speedParticles.push({
                        x: state.player.x + (Math.random() - 0.5) * 30,
                        y: state.player.y + (Math.random() - 0.5) * 30,
                        size: 4 + Math.random() * 6,
                        life: 30,
                        color: '#22c55e',
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5
                    });
                }
                return false;
            }

            return boost.y < canvas.height + 50;
        });

        // Update death traps - speed increases with game progression
        state.deathTraps = state.deathTraps.filter(trap => {
            trap.y += (state.player.speed * 0.7 + trap.fallSpeed * state.difficultyMultiplier);
            trap.pulse = (trap.pulse + 0.15) % (Math.PI * 2);

            const dx = trap.x - state.player.x;
            const dy = trap.y - state.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < trap.size / 2 + 15) {
                // Game over!
                state.gameOver = true;
                addEffect(state.player.x, state.player.y, 'GAME OVER!', '#ef4444');
                setTimeout(() => endGame(gameId, state.score), 800);
                return false;
            }

            return trap.y < canvas.height + 50;
        });

        // Update effects
        state.effects = state.effects.filter(e => {
            e.y += e.vy;
            e.life--;
            return e.life > 0;
        });

        // === SPEED EFFECTS ===

        // Spawn speed trail particles at high speed
        const now = Date.now();
        if (state.player.speed > 3 && now - state.lastTrailTime > 50) {
            state.lastTrailTime = now;
            // Trail behind player
            for (let i = 0; i < Math.floor(state.player.speed / 2); i++) {
                state.speedParticles.push({
                    x: state.player.x + (Math.random() - 0.5) * 20,
                    y: state.player.y + 20,
                    size: 3 + Math.random() * 4,
                    life: 20 + Math.random() * 15,
                    color: state.player.speed > 5 ? '#fbbf24' : '#8b5cf6',
                    vx: (Math.random() - 0.5) * 2,
                    vy: 2 + state.player.speed * 0.5
                });
            }
        }

        // Spawn wind particles on sides at high speed
        if (state.player.speed > 4 && Math.random() < 0.3) {
            const side = Math.random() < 0.5 ? -1 : 1;
            state.windParticles.push({
                x: side < 0 ? roadLeft() + 10 : roadRight() - 10,
                y: Math.random() * canvas.height,
                length: 20 + state.player.speed * 8,
                life: 15,
                alpha: 0.3 + state.player.speed * 0.05
            });
        }

        // Update speed particles
        state.speedParticles = state.speedParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.size *= 0.95;
            return p.life > 0 && p.size > 0.5;
        });

        // Update wind particles
        state.windParticles = state.windParticles.filter(p => {
            p.y += state.player.speed * 3;
            p.life--;
            return p.life > 0 && p.y < canvas.height + 50;
        });

        // Screen shake at very high speed
        if (state.player.speed > 5) {
            state.screenShake = (state.player.speed - 5) * 2;
        } else {
            state.screenShake *= 0.9;
        }

        // Turbo flash effect when boosting
        if (state.turboFlash > 0) {
            state.turboFlash -= 0.05;
        }

        // Update UI
        document.getElementById('dd-distance').textContent = Math.floor(state.distance) + 'm';
        document.getElementById('dd-speed').textContent = Math.floor(state.player.speed * 20) + ' km/h';
        document.getElementById('dd-score').textContent = state.score;
        state.score = Math.max(state.score, Math.floor(state.distance / 2));
        updateScore(gameId, state.score);
    }

    function draw() {
        // Apply screen shake
        ctx.save();
        if (state.screenShake > 0.5) {
            const shakeX = (Math.random() - 0.5) * state.screenShake;
            const shakeY = (Math.random() - 0.5) * state.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);

        const rLeft = roadLeft();
        const rRight = roadRight();

        // Background gradient - more intense at high speed
        const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        const speedIntensity = Math.min(1, state.player.speed / 6);
        bgGrad.addColorStop(0, `rgb(${10 + speedIntensity * 20}, ${10 + speedIntensity * 10}, ${42 + speedIntensity * 30})`);
        bgGrad.addColorStop(1, `rgb(${26 + speedIntensity * 30}, ${26 + speedIntensity * 15}, ${74 + speedIntensity * 40})`);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);

        // Turbo flash overlay
        if (state.turboFlash > 0) {
            ctx.fillStyle = `rgba(34, 197, 94, ${state.turboFlash * 0.3})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw wind particles (behind everything)
        state.windParticles.forEach(p => {
            ctx.strokeStyle = `rgba(139, 92, 246, ${p.alpha * (p.life / 15)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y + p.length);
            ctx.stroke();
        });

        // Road
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(rLeft, 0, roadWidth, canvas.height);

        // Road markings (center line) - animate faster at high speed
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        const dashLength = 25 - state.player.speed * 2; // Shorter dashes = faster feel
        ctx.setLineDash([Math.max(10, dashLength), 15]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, -state.roadOffset);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        // Road edges with glow - more intense at speed
        const edgeGlow = 10 + state.player.speed * 3;
        ctx.shadowColor = state.player.speed > 5 ? '#fbbf24' : '#8b5cf6';
        ctx.shadowBlur = edgeGlow;
        ctx.strokeStyle = state.player.speed > 5 ? '#fbbf24' : '#8b5cf6';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(rLeft, 0);
        ctx.lineTo(rLeft, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rRight, 0);
        ctx.lineTo(rRight, canvas.height);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '35px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw obstacles
        state.obstacles.forEach(obs => {
            ctx.fillText(obs.icon, obs.x, obs.y);
        });

        // Draw boosts with floating animation
        state.boosts.forEach(boost => {
            const float = Math.sin(Date.now() * 0.005 + boost.y * 0.1) * 4;
            ctx.fillText(boost.icon, boost.x, boost.y + float);
        });

        // Draw death traps with pulsing glow
        state.deathTraps.forEach(trap => {
            const scale = 1 + Math.sin(trap.pulse) * 0.15;
            ctx.save();
            ctx.translate(trap.x, trap.y);
            ctx.scale(scale, scale);
            // Red glow
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15 + Math.sin(trap.pulse) * 10;
            ctx.font = `${trap.size}px Arial`;
            ctx.fillText(trap.icon, 0, 0);
            ctx.restore();
        });
        ctx.shadowBlur = 0;

        // Draw speed trail particles (behind player)
        state.speedParticles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Draw player car with tilt and glow
        ctx.save();
        ctx.translate(state.player.x, state.player.y);
        ctx.rotate(state.player.vx * 0.05); // Slight tilt

        // Glow effect at high speed
        if (state.player.speed > 4) {
            ctx.shadowColor = state.player.speed > 5 ? '#fbbf24' : '#8b5cf6';
            ctx.shadowBlur = 10 + (state.player.speed - 4) * 5;
        }

        ctx.font = '40px Arial';
        ctx.fillText('🏎️', 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();

        // Speed lines at high speed - more intense
        if (state.player.speed > 3) {
            const lineCount = Math.floor(state.player.speed * 2);
            const lineOpacity = (state.player.speed - 3) * 0.15;
            ctx.strokeStyle = `rgba(251,191,36,${Math.min(0.6, lineOpacity)})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < lineCount; i++) {
                const x = rLeft + Math.random() * roadWidth;
                const startY = Math.random() * canvas.height;
                const len = 40 + state.player.speed * 15 + Math.random() * 40;
                ctx.beginPath();
                ctx.moveTo(x, startY);
                ctx.lineTo(x + (Math.random() - 0.5) * 5, startY + len);
                ctx.stroke();
            }
        }

        // Motion blur lines behind player at very high speed
        if (state.player.speed > 5) {
            ctx.strokeStyle = `rgba(139, 92, 246, ${(state.player.speed - 5) * 0.2})`;
            ctx.lineWidth = 3;
            for (let i = 0; i < 5; i++) {
                const offsetX = (Math.random() - 0.5) * 30;
                ctx.beginPath();
                ctx.moveTo(state.player.x + offsetX, state.player.y + 20);
                ctx.lineTo(state.player.x + offsetX, state.player.y + 60 + state.player.speed * 8);
                ctx.stroke();
            }
        }

        // Draw effects
        ctx.font = 'bold 16px Arial';
        state.effects.forEach(e => {
            ctx.globalAlpha = e.life / 40;
            ctx.fillStyle = e.color;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = 10;
            ctx.fillText(e.text, e.x, e.y);
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Restore from screen shake
        ctx.restore();

        // Speed vignette at high speed (drawn outside shake context)
        if (state.player.speed > 4) {
            const vignetteAlpha = (state.player.speed - 4) * 0.1;
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
                canvas.width / 2, canvas.height / 2, canvas.height * 0.8
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(139, 92, 246, ${Math.min(0.4, vignetteAlpha)})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function handleKeyDown(e) {
        if (state.gameOver) return;
        if (['ArrowLeft', 'KeyA'].includes(e.code)) { state.keys.left = true; e.preventDefault(); }
        if (['ArrowRight', 'KeyD'].includes(e.code)) { state.keys.right = true; e.preventDefault(); }
        if (['ArrowUp', 'KeyW'].includes(e.code)) { state.keys.up = true; e.preventDefault(); }
        if (['ArrowDown', 'KeyS'].includes(e.code)) { state.keys.down = true; e.preventDefault(); }
    }

    function handleKeyUp(e) {
        if (['ArrowLeft', 'KeyA'].includes(e.code)) state.keys.left = false;
        if (['ArrowRight', 'KeyD'].includes(e.code)) state.keys.right = false;
        if (['ArrowUp', 'KeyW'].includes(e.code)) state.keys.up = false;
        if (['ArrowDown', 'KeyS'].includes(e.code)) state.keys.down = false;
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Touch controls - drag to steer
    let touchX = null;
    function handleTouchStart(e) {
        touchX = e.touches[0].clientX;
    }
    function handleTouchMove(e) {
        if (touchX === null || state.gameOver) return;
        e.preventDefault();
        const currentX = e.touches[0].clientX;
        const diff = currentX - touchX;
        state.player.vx = diff * 0.05;
        touchX = currentX;
    }
    function handleTouchEnd() {
        touchX = null;
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    state.player.speed = 1.5;
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        }
    };
}

function startBurnOrHold(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    // Chain Conquest - Real-Time Chaos Strategy Game
    const OWNER = { NEUTRAL: 0, PLAYER: 1, ENEMY: 2 };
    const CHAIN_NAMES = ['ETH', 'SOL', 'AVAX', 'MATIC', 'BNB', 'ARB', 'OP', 'BASE', 'FTM', 'ATOM'];
    const CHAIN_COLORS = {
        [OWNER.NEUTRAL]: { bg: '#3a3a4a', border: '#555', text: '#888' },
        [OWNER.PLAYER]: { bg: '#1a4a2e', border: '#22c55e', text: '#4ade80' },
        [OWNER.ENEMY]: { bg: '#4a1a1a', border: '#ef4444', text: '#f87171' }
    };

    const state = {
        score: 0,
        wave: 1,
        gameOver: false,
        waveTransitioning: false, // Prevent multiple wave transitions!
        nodes: [],
        selectedNode: null,
        attacks: [], // Active attack animations
        effects: [],
        particles: [],
        nodeRadius: 35,
        lastAIAttack: 0,
        aiAttackInterval: 1200, // AI attacks every 1.2 seconds
        lastRegen: 0,
        regenInterval: 1000, // Regen every 1 second
        playerCooldown: 0,
        attackCooldown: 150, // 150ms between player attacks
        regenAmount: 2 // Base regen per tick
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;position:relative;overflow:hidden;background:linear-gradient(180deg,#0a0a1a 0%,#1a1a2e 100%);">
            <canvas id="cc-canvas" style="width:100%;height:100%;"></canvas>
            <div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;pointer-events:none;">
                <div style="display:flex;gap:10px;">
                    <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;border:2px solid var(--green);">
                        <div style="color:var(--green);font-size:11px;">⚔️ YOUR NODES</div>
                        <div style="color:var(--green);font-size:18px;font-weight:bold;" id="cc-player-nodes">0</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;border:2px solid var(--accent-fire);">
                        <div style="color:var(--accent-fire);font-size:11px;">👹 ENEMY</div>
                        <div style="color:var(--accent-fire);font-size:18px;font-weight:bold;" id="cc-enemy-nodes">0</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;">
                        <div style="color:var(--gold);font-size:11px;">🎯 SCORE</div>
                        <div style="color:var(--gold);font-size:18px;font-weight:bold;" id="cc-score">0</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;">
                        <div style="color:var(--purple);font-size:11px;">🌊 WAVE</div>
                        <div style="color:var(--purple);font-size:18px;font-weight:bold;" id="cc-wave">1</div>
                    </div>
                </div>
                <div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;">
                    <div style="color:var(--cyan);font-size:11px;">⏱️ TIME</div>
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
                    <div style="color:#ccc;font-size:11px;line-height:1.4;">🔥 CHAOS WARFARE 🔥<br>Click node → Click enemy = ATTACK!<br>SPAM CLICKS! Conquer or be conquered!</div>
                </div>
                <div style="pointer-events:auto;">
                    <button id="cc-next-wave" style="display:none;background:linear-gradient(135deg,#22c55e,#16a34a);border:2px solid #4ade80;color:#fff;padding:12px 30px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:16px;box-shadow:0 0 20px rgba(34,197,94,0.5);">🚀 NEXT WAVE →</button>
                </div>
            </div>
        </div>
    `;

    const canvas = document.getElementById('cc-canvas');
    const ctx = canvas.getContext('2d');
    const nextWaveBtn = document.getElementById('cc-next-wave');
    let startTime = Date.now();

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();

    // Generate node positions
    function generateNodes() {
        state.nodes = [];
        // Limit nodes: 10 at wave 1, max 18 at wave 5+
        const nodeCount = Math.min(10 + state.wave * 2, 18);
        const padding = 80;
        const usableWidth = canvas.width - padding * 2;
        const usableHeight = canvas.height - padding * 2 - 60;
        const cols = Math.ceil(Math.sqrt(nodeCount * 1.5));
        const rows = Math.ceil(nodeCount / cols);
        const cellW = usableWidth / cols;
        const cellH = usableHeight / rows;

        let id = 0;
        for (let row = 0; row < rows && state.nodes.length < nodeCount; row++) {
            for (let col = 0; col < cols && state.nodes.length < nodeCount; col++) {
                const offsetX = (row % 2) * (cellW / 2);
                const jitterX = (Math.random() - 0.5) * cellW * 0.3;
                const jitterY = (Math.random() - 0.5) * cellH * 0.3;
                state.nodes.push({
                    id: id++,
                    x: padding + col * cellW + cellW / 2 + offsetX + jitterX,
                    y: padding + 50 + row * cellH + cellH / 2 + jitterY,
                    name: CHAIN_NAMES[id % CHAIN_NAMES.length],
                    owner: OWNER.NEUTRAL,
                    validators: 5 + Math.floor(Math.random() * 5),
                    maxValidators: 20 + state.wave * 5,
                    connections: []
                });
            }
        }
        // Create connections
        for (let i = 0; i < state.nodes.length; i++) {
            for (let j = i + 1; j < state.nodes.length; j++) {
                const dx = state.nodes[i].x - state.nodes[j].x;
                const dy = state.nodes[i].y - state.nodes[j].y;
                if (Math.sqrt(dx * dx + dy * dy) < cellW * 1.3 + cellH * 0.5) {
                    state.nodes[i].connections.push(j);
                    state.nodes[j].connections.push(i);
                }
            }
        }
        // Ensure all nodes connected
        for (const node of state.nodes) {
            if (node.connections.length === 0) {
                let nearest = null, minDist = Infinity;
                for (const other of state.nodes) {
                    if (other.id === node.id) continue;
                    const d = Math.sqrt((node.x - other.x) ** 2 + (node.y - other.y) ** 2);
                    if (d < minDist) { minDist = d; nearest = other; }
                }
                if (nearest) { node.connections.push(nearest.id); nearest.connections.push(node.id); }
            }
        }
        // Assign territories - BALANCED
        const leftNodes = [...state.nodes].sort((a, b) => a.x - b.x);
        const rightNodes = [...state.nodes].sort((a, b) => b.x - a.x);

        // Player starts with 2 nodes (3 from wave 3+)
        const playerCount = state.wave >= 3 ? 3 : 2;
        for (let i = 0; i < playerCount && i < leftNodes.length; i++) {
            leftNodes[i].owner = OWNER.PLAYER;
            leftNodes[i].validators = 12 + state.wave * 2;
        }

        // Enemy: 2 nodes wave 1, scaling up
        const enemyCount = Math.min(2 + Math.floor(state.wave / 2), 4);
        for (let i = 0; i < enemyCount && i < rightNodes.length; i++) {
            if (rightNodes[i].owner === OWNER.NEUTRAL) {
                rightNodes[i].owner = OWNER.ENEMY;
                rightNodes[i].validators = 12 + state.wave * 3; // More starting power
            }
        }
    }

    function updateUI() {
        const playerNodes = state.nodes.filter(n => n.owner === OWNER.PLAYER).length;
        const enemyNodes = state.nodes.filter(n => n.owner === OWNER.ENEMY).length;
        document.getElementById('cc-player-nodes').textContent = playerNodes;
        document.getElementById('cc-enemy-nodes').textContent = enemyNodes;
        document.getElementById('cc-score').textContent = state.score;
        document.getElementById('cc-wave').textContent = state.wave;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        document.getElementById('cc-time').textContent = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
        updateScore(gameId, state.score);
    }

    function showBanner(text, hint) {
        const banner = document.getElementById('cc-banner');
        document.getElementById('cc-banner-text').textContent = text;
        document.getElementById('cc-banner-hint').textContent = hint;
        banner.style.opacity = '1';
        setTimeout(() => banner.style.opacity = '0', 1500);
    }

    function addEffect(x, y, text, color, life = 40) {
        state.effects.push({ x, y, text, color, life, maxLife: life, vy: -1 });
    }

    function addParticles(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            state.particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 30, color });
        }
    }

    function getNodeAt(x, y) {
        for (const node of state.nodes) {
            if (Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2) < state.nodeRadius) return node;
        }
        return null;
    }

    function areConnected(node1, node2) { return node1.connections.includes(node2.id); }

    // Launch attack projectile - FAST & FURIOUS
    function launchAttack(attacker, defender, isPlayer) {
        const power = Math.min(attacker.validators - 1, Math.floor(attacker.validators * 0.5));
        if (power < 1) return false;
        attacker.validators -= power;
        state.attacks.push({
            x: attacker.x, y: attacker.y,
            targetX: defender.x, targetY: defender.y,
            attacker, defender, power, isPlayer,
            speed: 8 + state.wave * 2 // FASTER projectiles!
        });
        addParticles(attacker.x, attacker.y, isPlayer ? '#22c55e' : '#ef4444', 8);
        return true;
    }

    // Process attack hitting target
    function resolveAttack(attack) {
        const { defender, power, isPlayer } = attack;
        const defenderPower = defender.validators;

        // Combat resolution
        if (power > defenderPower) {
            // Attacker wins - capture node
            const prevOwner = defender.owner;
            defender.owner = isPlayer ? OWNER.PLAYER : OWNER.ENEMY;
            defender.validators = Math.max(1, power - defenderPower);
            addEffect(defender.x, defender.y, 'CAPTURED!', isPlayer ? '#22c55e' : '#ef4444', 50);
            addParticles(defender.x, defender.y, isPlayer ? '#22c55e' : '#ef4444', 20);
            if (isPlayer && prevOwner === OWNER.ENEMY) {
                state.score += 150;
                addEffect(defender.x, defender.y - 30, '+150', '#fbbf24', 40);
            } else if (isPlayer) {
                state.score += 50;
                addEffect(defender.x, defender.y - 30, '+50', '#fbbf24', 40);
            }
        } else {
            // Defender holds
            defender.validators = Math.max(1, defenderPower - Math.floor(power * 0.7));
            addEffect(defender.x, defender.y, 'DEFENDED!', '#888', 40);
            addParticles(defender.x, defender.y, '#ff6b6b', 10);
        }
    }

    // AI attacks automatically - AGGRESSIVE
    function aiAttack() {
        const enemyNodes = state.nodes.filter(n => n.owner === OWNER.ENEMY && n.validators > 3);
        if (enemyNodes.length === 0) return;

        // 1-3 attacks per interval based on wave
        const attackCount = Math.min(1 + Math.floor(state.wave / 2), enemyNodes.length, 3);

        for (let a = 0; a < attackCount; a++) {
            const availableAttackers = enemyNodes.filter(n => n.validators > 3);
            if (availableAttackers.length === 0) break;

            const attacker = availableAttackers[Math.floor(Math.random() * availableAttackers.length)];

            // Find targets
            const targets = [];
            for (const connId of attacker.connections) {
                const target = state.nodes.find(n => n.id === connId);
                if (target.owner !== OWNER.ENEMY) {
                    targets.push({ node: target, priority: target.owner === OWNER.PLAYER ? 2 : 1 });
                }
            }

            if (targets.length === 0) continue;

            // 80% chance to attack player nodes
            targets.sort((a, b) => b.priority - a.priority);
            const target = Math.random() < 0.8 ? targets[0].node : targets[Math.floor(Math.random() * targets.length)].node;

            launchAttack(attacker, target, false);
        }
    }

    // Regenerate validators over time
    function regenerateValidators() {
        for (const node of state.nodes) {
            if (node.owner !== OWNER.NEUTRAL && node.validators < node.maxValidators) {
                // Player regens slightly faster than enemy
                const regen = node.owner === OWNER.PLAYER
                    ? state.regenAmount + Math.floor(state.wave / 2)
                    : Math.floor(state.regenAmount * 0.8) + Math.floor(state.wave / 3); // Enemy 20% slower
                node.validators = Math.min(node.maxValidators, node.validators + regen);
            }
        }
    }

    function checkWinLose() {
        // Prevent checking during transition
        if (state.waveTransitioning || state.gameOver) return;

        const playerNodes = state.nodes.filter(n => n.owner === OWNER.PLAYER).length;
        const enemyNodes = state.nodes.filter(n => n.owner === OWNER.ENEMY).length;

        if (enemyNodes === 0 && state.attacks.length === 0) {
            // WAVE COMPLETE - lock to prevent re-triggering
            state.waveTransitioning = true;
            state.score += state.wave * 500;
            showBanner(`WAVE ${state.wave} COMPLETE!`, `+${state.wave * 500} bonus`);
            addEffect(canvas.width / 2, canvas.height / 2, `WAVE ${state.wave} COMPLETE!`, '#fbbf24', 100);

            setTimeout(() => {
                state.wave++;
                // AI gets slightly faster each wave (min 800ms)
                state.aiAttackInterval = Math.max(800, 1500 - state.wave * 100);
                state.regenAmount = 2 + Math.floor(state.wave / 3);
                state.selectedNode = null;
                state.attacks = [];
                state.effects = [];
                state.particles = [];
                startTime = Date.now();
                generateNodes();
                state.waveTransitioning = false; // Unlock
                showBanner('WAVE ' + state.wave, 'FIGHT!');
                gameLoop(); // Restart the loop
            }, 2500);
        } else if (playerNodes === 0) {
            state.gameOver = true;
            showBanner('GAME OVER', 'All nodes lost!');
            addEffect(canvas.width / 2, canvas.height / 2, 'GAME OVER', '#ef4444', 120);
            setTimeout(() => endGame(gameId, state.score), 2000);
        }
    }

    function handleClick(e) {
        if (state.gameOver) return;
        const now = Date.now();
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        const clickedNode = getNodeAt(x, y);

        if (!clickedNode) { state.selectedNode = null; return; }

        if (!state.selectedNode) {
            // Select a player node
            if (clickedNode.owner === OWNER.PLAYER && clickedNode.validators > 1) {
                state.selectedNode = clickedNode;
                addParticles(clickedNode.x, clickedNode.y, '#22c55e', 5);
            }
        } else {
            if (clickedNode.owner === OWNER.PLAYER) {
                // Switch selection
                if (clickedNode.validators > 1) {
                    state.selectedNode = clickedNode;
                    addParticles(clickedNode.x, clickedNode.y, '#22c55e', 5);
                }
            } else if (areConnected(state.selectedNode, clickedNode)) {
                // Attack! (with cooldown)
                if (now > state.playerCooldown) {
                    if (launchAttack(state.selectedNode, clickedNode, true)) {
                        state.playerCooldown = now + state.attackCooldown;
                    }
                }
            } else {
                addEffect(clickedNode.x, clickedNode.y, 'NOT CONNECTED', '#888', 30);
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw connections
        ctx.lineWidth = 2;
        for (const node of state.nodes) {
            for (const connId of node.connections) {
                if (connId > node.id) {
                    const other = state.nodes.find(n => n.id === connId);
                    ctx.strokeStyle = (node.owner === other.owner && node.owner !== OWNER.NEUTRAL)
                        ? CHAIN_COLORS[node.owner].border + '80' : '#33335580';
                    ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(other.x, other.y); ctx.stroke();
                }
            }
        }

        // Draw nodes
        for (const node of state.nodes) {
            const colors = CHAIN_COLORS[node.owner];
            const isSelected = state.selectedNode === node;

            // Node circle
            ctx.beginPath(); ctx.arc(node.x, node.y, state.nodeRadius, 0, Math.PI * 2);
            ctx.fillStyle = colors.bg; ctx.fill();
            ctx.strokeStyle = isSelected ? '#fff' : colors.border;
            ctx.lineWidth = isSelected ? 4 : 2; ctx.stroke();

            // Selection glow
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, state.nodeRadius + 8 + Math.sin(Date.now() / 100) * 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'; ctx.lineWidth = 2; ctx.stroke();
            }

            // Node text
            ctx.fillStyle = colors.text; ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(node.name, node.x, node.y - 8);
            ctx.font = 'bold 16px Arial'; ctx.fillStyle = '#fff';
            ctx.fillText(node.validators, node.x, node.y + 10);

            // Owner icon
            if (node.owner === OWNER.PLAYER) { ctx.font = '14px Arial'; ctx.fillText('👤', node.x, node.y - 25); }
            else if (node.owner === OWNER.ENEMY) { ctx.font = '14px Arial'; ctx.fillText('👹', node.x, node.y - 25); }
        }

        // Draw attack projectiles
        for (const atk of state.attacks) {
            ctx.beginPath();
            ctx.arc(atk.x, atk.y, 8 + atk.power / 3, 0, Math.PI * 2);
            ctx.fillStyle = atk.isPlayer ? '#22c55e' : '#ef4444';
            ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
            ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#fff';
            ctx.fillText(atk.power, atk.x, atk.y + 3);
        }

        // Draw attack preview
        if (state.selectedNode && !state.gameOver) {
            for (const connId of state.selectedNode.connections) {
                const target = state.nodes.find(n => n.id === connId);
                if (target.owner !== OWNER.PLAYER) {
                    ctx.setLineDash([5, 5]);
                    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'; ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(state.selectedNode.x, state.selectedNode.y);
                    ctx.lineTo(target.x, target.y); ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // Particles & effects
        for (const p of state.particles) {
            ctx.globalAlpha = p.life / 30; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center';
        for (const e of state.effects) {
            ctx.globalAlpha = e.life / e.maxLife; ctx.fillStyle = e.color;
            ctx.fillText(e.text, e.x, e.y);
        }
        ctx.globalAlpha = 1;
    }

    function update() {
        const now = Date.now();

        // Update particles
        state.particles = state.particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;
            return p.life > 0;
        });

        // Update effects
        state.effects = state.effects.filter(e => {
            e.y += e.vy; e.life--;
            return e.life > 0;
        });

        // Skip game logic during transition
        if (state.waveTransitioning) {
            updateUI();
            return;
        }

        // Update attack projectiles
        state.attacks = state.attacks.filter(atk => {
            const dx = atk.targetX - atk.x;
            const dy = atk.targetY - atk.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < atk.speed) {
                // Hit target
                resolveAttack(atk);
                return false;
            }

            // Move towards target
            atk.x += (dx / dist) * atk.speed;
            atk.y += (dy / dist) * atk.speed;

            // Trail particles
            if (Math.random() < 0.3) {
                addParticles(atk.x, atk.y, atk.isPlayer ? '#22c55e' : '#ef4444', 1);
            }
            return true;
        });

        // AI attacks
        if (now - state.lastAIAttack > state.aiAttackInterval) {
            state.lastAIAttack = now;
            aiAttack();
        }

        // Regenerate validators
        if (now - state.lastRegen > state.regenInterval) {
            state.lastRegen = now;
            regenerateValidators();
        }

        // Check win/lose
        checkWinLose();

        // Update UI
        updateUI();
    }

    function gameLoop() {
        // Stop only on true game over (player lost)
        if (state.gameOver) return;
        update();
        draw();
        // Continue loop unless transitioning (will restart after)
        if (!state.waveTransitioning) {
            requestAnimationFrame(gameLoop);
        }
    }

    canvas.addEventListener('click', handleClick);

    generateNodes();
    updateUI();
    showBanner('CHAIN CONQUEST', 'Conquer all nodes!');
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            canvas.removeEventListener('click', handleClick);
        }
    };
}

function startLiquidityMaze(gameId) {
    const arena = document.getElementById(`arena-${gameId}`);

    // Enhanced Liquidity Maze - Harder mazes, useful power-ups
    const state = {
        score: 0,
        level: 1,
        gameOver: false,
        player: { x: 0, y: 0, speed: 1, hasKey: false, frozen: false },
        goal: { x: 0, y: 0, locked: true },
        maze: [],
        cellSize: 30, // Smaller cells = bigger maze
        cols: 0,
        rows: 0,
        // Items
        liquidityPools: [],
        feeTraps: [],
        keys: [],
        speedBoosts: [],
        reveals: [],
        enemies: [],
        // State
        visited: new Set(),
        revealed: new Set(),
        startTime: 0,
        timeLimit: 90, // seconds per level
        moveKeys: { up: false, down: false, left: false, right: false },
        effects: []
    };

    arena.innerHTML = `
        <div style="width:100%;height:100%;display:flex;overflow:hidden;background:linear-gradient(180deg,#0a1628 0%,#1a2744 100%);">
            <!-- Game Area -->
            <div style="flex:1;position:relative;overflow:hidden;">
                <canvas id="lm-canvas" style="width:100%;height:100%;"></canvas>
                <div id="lm-key-indicator" style="position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.7);padding:6px 12px;border-radius:8px;display:none;">
                    <span style="color:var(--green);font-size:14px;">🔑 KEY</span>
                </div>
            </div>
            <!-- Stats Sidebar (right of game) -->
            <div style="width:100px;background:rgba(0,0,0,0.6);padding:15px 10px;display:flex;flex-direction:column;gap:15px;border-left:2px solid #333;">
                <div style="text-align:center;">
                    <span style="color:var(--text-muted);font-size:10px;">LIQUIDITY</span>
                    <div style="color:var(--gold);font-size:18px;font-weight:bold;" id="lm-score">0</div>
                </div>
                <div style="text-align:center;">
                    <span style="color:var(--text-muted);font-size:10px;">LEVEL</span>
                    <div style="color:var(--purple);font-size:18px;font-weight:bold;" id="lm-level">1</div>
                </div>
                <div style="text-align:center;">
                    <span style="color:var(--text-muted);font-size:10px;">TIME</span>
                    <div style="color:var(--accent-fire);font-size:18px;font-weight:bold;" id="lm-time">1:30</div>
                </div>
                <div style="margin-top:auto;font-size:9px;color:var(--text-muted);text-align:center;line-height:1.6;">
                    🌊 +LP<br>
                    ⚠️ -LP<br>
                    🔑 Key<br>
                    ⚡ Speed<br>
                    👁️ Reveal<br>
                    👾 Enemy<br>
                    🏁 Exit
                </div>
            </div>
        </div>
    `;

    const canvas = document.getElementById('lm-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('lm-score');
    const levelEl = document.getElementById('lm-level');
    const timeEl = document.getElementById('lm-time');
    const keyIndicator = document.getElementById('lm-key-indicator');

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // Calculate cell size based on level (harder = smaller cells = bigger maze)
        state.cellSize = Math.max(22, 38 - state.level * 2);

        // Calculate how many cells fit, leaving margin for visibility
        const marginX = 10;
        const marginY = 10;
        const usableWidth = canvas.width - marginX * 2;
        const usableHeight = canvas.height - marginY * 2;

        state.cols = Math.floor(usableWidth / state.cellSize);
        state.rows = Math.floor(usableHeight / state.cellSize);

        // Ensure odd dimensions for maze algorithm
        if (state.cols % 2 === 0) state.cols--;
        if (state.rows % 2 === 0) state.rows--;

        // Clamp to reasonable limits
        state.cols = Math.max(11, Math.min(state.cols, 25));
        state.rows = Math.max(9, Math.min(state.rows, 17)); // Reduced max rows to prevent overflow
    }
    resizeCanvas();

    function generateMaze() {
        resizeCanvas();
        state.maze = [];
        for (let y = 0; y < state.rows; y++) {
            state.maze[y] = [];
            for (let x = 0; x < state.cols; x++) {
                state.maze[y][x] = 1;
            }
        }

        // Recursive backtracking with complexity adjustments
        const stack = [];
        const startX = 1, startY = 1;
        state.maze[startY][startX] = 0;
        stack.push({ x: startX, y: startY });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];

            const directions = [
                { dx: 0, dy: -2 }, { dx: 2, dy: 0 },
                { dx: 0, dy: 2 }, { dx: -2, dy: 0 }
            ];

            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                if (nx > 0 && nx < state.cols - 1 && ny > 0 && ny < state.rows - 1 && state.maze[ny][nx] === 1) {
                    neighbors.push({ x: nx, y: ny, dx: dir.dx / 2, dy: dir.dy / 2 });
                }
            }

            if (neighbors.length > 0) {
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                state.maze[current.y + next.dy][current.x + next.dx] = 0;
                state.maze[next.y][next.x] = 0;
                stack.push({ x: next.x, y: next.y });
            } else {
                stack.pop();
            }
        }

        // Add extra paths for higher levels (create loops)
        const extraPaths = Math.floor(state.level * 1.5);
        for (let i = 0; i < extraPaths; i++) {
            const x = 2 + Math.floor(Math.random() * (state.cols - 4));
            const y = 2 + Math.floor(Math.random() * (state.rows - 4));
            if (state.maze[y][x] === 1) {
                const adjacent = [
                    state.maze[y-1]?.[x] === 0,
                    state.maze[y+1]?.[x] === 0,
                    state.maze[y]?.[x-1] === 0,
                    state.maze[y]?.[x+1] === 0
                ].filter(Boolean).length;
                if (adjacent >= 2) state.maze[y][x] = 0;
            }
        }

        // Player and goal
        state.player = { x: 1, y: 1, speed: 1, hasKey: false, frozen: false };
        state.goal = { x: state.cols - 2, y: state.rows - 2, locked: state.level >= 3 };
        state.maze[state.goal.y][state.goal.x] = 0;

        // Clear items
        state.liquidityPools = [];
        state.feeTraps = [];
        state.keys = [];
        state.speedBoosts = [];
        state.reveals = [];
        state.enemies = [];
        state.visited = new Set();
        state.revealed = new Set();
        state.effects = [];

        // Spawn items based on level
        const poolCount = 4 + state.level;
        const trapCount = 3 + state.level;
        const enemyCount = Math.floor(state.level / 2);

        for (let i = 0; i < poolCount; i++) {
            const pos = getRandomEmptyCell();
            if (pos) state.liquidityPools.push({ ...pos, value: 30 + state.level * 15 });
        }

        for (let i = 0; i < trapCount; i++) {
            const pos = getRandomEmptyCell();
            if (pos) state.feeTraps.push({ ...pos, penalty: 20 + state.level * 10 });
        }

        // Key required from level 3+
        if (state.level >= 3) {
            const keyPos = getRandomEmptyCell();
            if (keyPos) state.keys.push(keyPos);
            keyIndicator.style.display = 'none';
        }

        // Speed boosts
        for (let i = 0; i < 2; i++) {
            const pos = getRandomEmptyCell();
            if (pos) state.speedBoosts.push({ ...pos, duration: 300 }); // 5 seconds
        }

        // Reveal items (show nearby maze)
        if (state.level >= 2) {
            const pos = getRandomEmptyCell();
            if (pos) state.reveals.push({ ...pos, radius: 5 });
        }

        // Enemies (patrol the maze) - spawn far from player
        for (let i = 0; i < enemyCount; i++) {
            const pos = getRandomEmptyCellFarFromPlayer(6); // At least 6 cells away
            if (pos) {
                state.enemies.push({
                    ...pos,
                    dir: Math.floor(Math.random() * 4),
                    speed: 0.012 + state.level * 0.002, // Slower enemies
                    moveTimer: 0,
                    patrolDir: 1, // For predictable back-and-forth patrol
                    patrolSteps: 0
                });
            }
        }

        state.startTime = Date.now();
        state.timeLimit = Math.max(45, 90 - state.level * 5);
    }

    function getRandomEmptyCell() {
        for (let tries = 0; tries < 100; tries++) {
            const x = 1 + Math.floor(Math.random() * (state.cols - 2));
            const y = 1 + Math.floor(Math.random() * (state.rows - 2));
            if (state.maze[y][x] === 0 &&
                !(x === state.player.x && y === state.player.y) &&
                !(x === state.goal.x && y === state.goal.y) &&
                !state.liquidityPools.some(p => p.x === x && p.y === y) &&
                !state.feeTraps.some(t => t.x === x && t.y === y) &&
                !state.keys.some(k => k.x === x && k.y === y) &&
                !state.speedBoosts.some(s => s.x === x && s.y === y) &&
                !state.reveals.some(r => r.x === x && r.y === y) &&
                !state.enemies.some(e => Math.floor(e.x) === x && Math.floor(e.y) === y)) {
                return { x, y };
            }
        }
        return null;
    }

    function getRandomEmptyCellFarFromPlayer(minDistance) {
        for (let tries = 0; tries < 150; tries++) {
            const x = 1 + Math.floor(Math.random() * (state.cols - 2));
            const y = 1 + Math.floor(Math.random() * (state.rows - 2));
            const distFromPlayer = Math.abs(x - state.player.x) + Math.abs(y - state.player.y);
            if (state.maze[y][x] === 0 &&
                distFromPlayer >= minDistance &&
                !(x === state.goal.x && y === state.goal.y) &&
                !state.liquidityPools.some(p => p.x === x && p.y === y) &&
                !state.feeTraps.some(t => t.x === x && t.y === y) &&
                !state.keys.some(k => k.x === x && k.y === y) &&
                !state.enemies.some(e => Math.floor(e.x) === x && Math.floor(e.y) === y)) {
                return { x, y };
            }
        }
        return getRandomEmptyCell(); // Fallback
    }

    function addEffect(x, y, text, color) {
        state.effects.push({ x, y, text, color, life: 40, vy: -1 });
    }

    function update() {
        if (state.gameOver) return;

        // Update time
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        const remaining = state.timeLimit - elapsed;
        const mins = Math.floor(Math.max(0, remaining) / 60);
        const secs = Math.max(0, remaining) % 60;
        timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        timeEl.style.color = remaining <= 15 ? '#ef4444' : '';

        if (remaining <= 0) {
            state.gameOver = true;
            addEffect(state.player.x, state.player.y, 'TIME UP!', '#ef4444');
            setTimeout(() => endGame(gameId, state.score), 1000);
            return;
        }

        // Movement (with speed boost)
        if (!state.player.frozen) {
            let dx = 0, dy = 0;
            if (state.moveKeys.up) dy = -1;
            if (state.moveKeys.down) dy = 1;
            if (state.moveKeys.left) dx = -1;
            if (state.moveKeys.right) dx = 1;

            if (dx !== 0 || dy !== 0) {
                const newX = state.player.x + dx;
                const newY = state.player.y + dy;

                if (newX >= 0 && newX < state.cols && newY >= 0 && newY < state.rows && state.maze[newY][newX] === 0) {
                    state.player.x = newX;
                    state.player.y = newY;
                    state.visited.add(`${newX},${newY}`);

                    // Check all collectibles
                    checkCollisions(newX, newY);
                }
            }
        }

        // Update enemies - predictable patrol movement
        state.enemies.forEach(enemy => {
            enemy.moveTimer += enemy.speed;
            if (enemy.moveTimer >= 1) {
                enemy.moveTimer = 0;
                const dirs = [[0,-1], [1,0], [0,1], [-1,0]];
                const [dx, dy] = dirs[enemy.dir];
                const nx = Math.floor(enemy.x) + dx;
                const ny = Math.floor(enemy.y) + dy;

                if (nx > 0 && nx < state.cols - 1 && ny > 0 && ny < state.rows - 1 && state.maze[ny][nx] === 0) {
                    enemy.x = nx;
                    enemy.y = ny;
                    enemy.patrolSteps++;
                    // After 3-5 steps in same direction, try to turn
                    if (enemy.patrolSteps >= 3 + Math.floor(Math.random() * 3)) {
                        enemy.patrolSteps = 0;
                        // Try to turn left or right (more predictable)
                        const turnDir = enemy.patrolDir > 0 ? (enemy.dir + 1) % 4 : (enemy.dir + 3) % 4;
                        const [tdx, tdy] = dirs[turnDir];
                        const tnx = Math.floor(enemy.x) + tdx;
                        const tny = Math.floor(enemy.y) + tdy;
                        if (tnx > 0 && tnx < state.cols - 1 && tny > 0 && tny < state.rows - 1 && state.maze[tny][tnx] === 0) {
                            enemy.dir = turnDir;
                        }
                    }
                } else {
                    // Hit wall - reverse direction (predictable)
                    enemy.dir = (enemy.dir + 2) % 4;
                    enemy.patrolDir *= -1;
                    enemy.patrolSteps = 0;
                }

                // Check collision with player
                if (Math.floor(enemy.x) === state.player.x && Math.floor(enemy.y) === state.player.y) {
                    state.score = Math.max(0, state.score - 30); // Reduced penalty
                    scoreEl.textContent = state.score;
                    addEffect(state.player.x, state.player.y, '-30', '#ef4444');
                    state.player.frozen = true;
                    setTimeout(() => { state.player.frozen = false; }, 800);
                }
            }
        });

        // Update effects
        state.effects = state.effects.filter(e => {
            e.y += e.vy;
            e.life--;
            return e.life > 0;
        });
    }

    function checkCollisions(x, y) {
        // Liquidity pools
        const poolIdx = state.liquidityPools.findIndex(p => p.x === x && p.y === y);
        if (poolIdx !== -1) {
            const pool = state.liquidityPools.splice(poolIdx, 1)[0];
            state.score += pool.value;
            scoreEl.textContent = state.score;
            addEffect(x, y, '+' + pool.value, '#22c55e');
            recordScoreUpdate(gameId, state.score, pool.value);
        }

        // Fee traps
        const trapIdx = state.feeTraps.findIndex(t => t.x === x && t.y === y);
        if (trapIdx !== -1) {
            const trap = state.feeTraps.splice(trapIdx, 1)[0];
            state.score = Math.max(0, state.score - trap.penalty);
            scoreEl.textContent = state.score;
            addEffect(x, y, '-' + trap.penalty, '#ef4444');
            state.player.frozen = true;
            setTimeout(() => { state.player.frozen = false; }, 500);
        }

        // Keys
        const keyIdx = state.keys.findIndex(k => k.x === x && k.y === y);
        if (keyIdx !== -1) {
            state.keys.splice(keyIdx, 1);
            state.player.hasKey = true;
            state.goal.locked = false;
            keyIndicator.style.display = 'block';
            addEffect(x, y, 'KEY!', '#fbbf24');
        }

        // Speed boosts
        const speedIdx = state.speedBoosts.findIndex(s => s.x === x && s.y === y);
        if (speedIdx !== -1) {
            state.speedBoosts.splice(speedIdx, 1);
            state.score += 25;
            scoreEl.textContent = state.score;
            addEffect(x, y, 'SPEED!', '#3b82f6');
        }

        // Reveals
        const revealIdx = state.reveals.findIndex(r => r.x === x && r.y === y);
        if (revealIdx !== -1) {
            const reveal = state.reveals.splice(revealIdx, 1)[0];
            // Reveal area around
            for (let dy = -reveal.radius; dy <= reveal.radius; dy++) {
                for (let dx = -reveal.radius; dx <= reveal.radius; dx++) {
                    state.revealed.add(`${x + dx},${y + dy}`);
                }
            }
            addEffect(x, y, 'REVEALED!', '#a855f7');
        }

        // Goal
        if (x === state.goal.x && y === state.goal.y) {
            if (state.goal.locked) {
                addEffect(x, y, 'NEED KEY!', '#fbbf24');
            } else {
                const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
                const timeBonus = Math.max(0, state.timeLimit - elapsed) * 3;
                const levelBonus = state.level * 100;
                const poolBonus = state.liquidityPools.length === 0 ? 200 : 0;
                const totalBonus = timeBonus + levelBonus + poolBonus;

                state.score += totalBonus;
                scoreEl.textContent = state.score;
                updateScore(gameId, state.score);
                recordScoreUpdate(gameId, state.score, totalBonus);

                state.level++;
                levelEl.textContent = state.level;
                generateMaze();
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const offsetX = (canvas.width - state.cols * state.cellSize) / 2;
        const offsetY = (canvas.height - state.rows * state.cellSize) / 2;

        // Draw maze
        for (let y = 0; y < state.rows; y++) {
            for (let x = 0; x < state.cols; x++) {
                const px = offsetX + x * state.cellSize;
                const py = offsetY + y * state.cellSize;
                const key = `${x},${y}`;
                const isVisible = state.visited.has(key) || state.revealed.has(key) ||
                    (Math.abs(x - state.player.x) <= 3 && Math.abs(y - state.player.y) <= 3);

                if (state.maze[y][x] === 1) {
                    ctx.fillStyle = isVisible ? '#1a1a4e' : '#0a0a1e';
                    ctx.fillRect(px, py, state.cellSize, state.cellSize);
                } else {
                    ctx.fillStyle = state.visited.has(key) ? 'rgba(59,130,246,0.15)' :
                                   isVisible ? 'rgba(30,30,60,0.8)' : 'rgba(10,10,30,0.9)';
                    ctx.fillRect(px, py, state.cellSize, state.cellSize);
                }
            }
        }

        ctx.font = `${state.cellSize * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw items (only if visible)
        const isVisible = (item) => {
            return state.visited.has(`${item.x},${item.y}`) ||
                   state.revealed.has(`${item.x},${item.y}`) ||
                   (Math.abs(item.x - state.player.x) <= 3 && Math.abs(item.y - state.player.y) <= 3);
        };

        state.liquidityPools.filter(isVisible).forEach(pool => {
            const px = offsetX + pool.x * state.cellSize + state.cellSize / 2;
            const py = offsetY + pool.y * state.cellSize + state.cellSize / 2;
            ctx.fillText('🌊', px, py);
        });

        state.feeTraps.filter(isVisible).forEach(trap => {
            const px = offsetX + trap.x * state.cellSize + state.cellSize / 2;
            const py = offsetY + trap.y * state.cellSize + state.cellSize / 2;
            ctx.fillText('⚠️', px, py);
        });

        state.keys.filter(isVisible).forEach(key => {
            const px = offsetX + key.x * state.cellSize + state.cellSize / 2;
            const py = offsetY + key.y * state.cellSize + state.cellSize / 2;
            ctx.fillText('🔑', px, py);
        });

        state.speedBoosts.filter(isVisible).forEach(boost => {
            const px = offsetX + boost.x * state.cellSize + state.cellSize / 2;
            const py = offsetY + boost.y * state.cellSize + state.cellSize / 2;
            ctx.fillText('⚡', px, py);
        });

        state.reveals.filter(isVisible).forEach(reveal => {
            const px = offsetX + reveal.x * state.cellSize + state.cellSize / 2;
            const py = offsetY + reveal.y * state.cellSize + state.cellSize / 2;
            ctx.fillText('👁️', px, py);
        });

        // Draw enemies with warning indicator when close
        state.enemies.forEach(enemy => {
            const px = offsetX + enemy.x * state.cellSize + state.cellSize / 2;
            const py = offsetY + enemy.y * state.cellSize + state.cellSize / 2;
            const distToPlayer = Math.abs(Math.floor(enemy.x) - state.player.x) + Math.abs(Math.floor(enemy.y) - state.player.y);

            // Warning glow when enemy is within 3 cells
            if (distToPlayer <= 3) {
                const pulse = 0.3 + Math.sin(Date.now() / 150) * 0.2;
                ctx.beginPath();
                ctx.arc(px, py, state.cellSize * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
                ctx.fill();
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillText('👾', px, py);
        });

        // Draw goal
        const gx = offsetX + state.goal.x * state.cellSize + state.cellSize / 2;
        const gy = offsetY + state.goal.y * state.cellSize + state.cellSize / 2;
        ctx.fillText(state.goal.locked ? '🔒' : '🏁', gx, gy);

        // Draw player
        const ppx = offsetX + state.player.x * state.cellSize + state.cellSize / 2;
        const ppy = offsetY + state.player.y * state.cellSize + state.cellSize / 2;
        ctx.globalAlpha = state.player.frozen ? 0.5 : 1;
        ctx.fillText('🧑‍💻', ppx, ppy);
        ctx.globalAlpha = 1;

        // Draw effects
        ctx.font = 'bold 14px Arial';
        state.effects.forEach(e => {
            const ex = offsetX + e.x * state.cellSize + state.cellSize / 2;
            const ey = offsetY + e.y * state.cellSize + e.vy * (40 - e.life);
            ctx.globalAlpha = e.life / 40;
            ctx.fillStyle = e.color;
            ctx.fillText(e.text, ex, ey);
        });
        ctx.globalAlpha = 1;
    }

    function gameLoop() {
        if (state.gameOver) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    let moveTimeout = null;
    function handleKeyDown(e) {
        if (state.gameOver) return;
        if (['ArrowUp', 'KeyW'].includes(e.code)) { state.moveKeys.up = true; e.preventDefault(); }
        if (['ArrowDown', 'KeyS'].includes(e.code)) { state.moveKeys.down = true; e.preventDefault(); }
        if (['ArrowLeft', 'KeyA'].includes(e.code)) { state.moveKeys.left = true; e.preventDefault(); }
        if (['ArrowRight', 'KeyD'].includes(e.code)) { state.moveKeys.right = true; e.preventDefault(); }

        if (!moveTimeout) {
            moveTimeout = setTimeout(() => {
                state.moveKeys = { up: false, down: false, left: false, right: false };
                moveTimeout = null;
            }, 120);
        }
    }

    function handleKeyUp(e) {
        if (['ArrowUp', 'KeyW'].includes(e.code)) state.moveKeys.up = false;
        if (['ArrowDown', 'KeyS'].includes(e.code)) state.moveKeys.down = false;
        if (['ArrowLeft', 'KeyA'].includes(e.code)) state.moveKeys.left = false;
        if (['ArrowRight', 'KeyD'].includes(e.code)) state.moveKeys.right = false;
    }

    let touchStart = null;
    function handleTouchStart(e) { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    function handleTouchMove(e) {
        if (!touchStart || state.gameOver) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        if (Math.abs(dx) > 25 || Math.abs(dy) > 25) {
            if (Math.abs(dx) > Math.abs(dy)) {
                state.moveKeys = { up: false, down: false, left: dx < 0, right: dx > 0 };
            } else {
                state.moveKeys = { up: dy < 0, down: dy > 0, left: false, right: false };
            }
            touchStart = { x: touch.clientX, y: touch.clientY };
            setTimeout(() => { state.moveKeys = { up: false, down: false, left: false, right: false }; }, 80);
        }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    generateMaze();
    gameLoop();

    activeGames[gameId] = {
        cleanup: () => {
            state.gameOver = true;
            if (moveTimeout) clearTimeout(moveTimeout);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
        }
    };
}

// Pump Arena
let pumpArenaMode = 'classic';

function openPumpArena(mode = 'classic') {
    pumpArenaMode = 'classic'; // Force classic mode only
    // Open modal directly (pumparena is not in GAMES array)
    const modal = document.getElementById('modal-pumparena');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Export functions to window for main.js access
window.openPumpArena = openPumpArena;
window.startGame = startGame;
window.openGame = openGame;
window.closeGame = closeGame;
