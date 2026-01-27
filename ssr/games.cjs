/**
 * ASDF Games - SSR Renderer (Node.js)
 *
 * Renders the games landing page server-side.
 * Used for bots, crawlers, and JavaScript-disabled browsers.
 */

'use strict';

const { getContainer, generateHydrationScript } = require('./services.cjs');

/**
 * Escape HTML special characters
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Pad number with leading zeros
 */
function padZero(num, len = 2) {
  return String(num).padStart(len, '0');
}

/**
 * Render the games page
 * @returns {Promise<string>} Complete HTML page
 */
async function renderGamesPage() {
  const { config, games, leaderboard } = getContainer();

  // Fetch data for SSR
  const currentGame = games.getCurrentGame();
  const nextRotation = games.getNextRotationTime();
  const weeklyLeaderboard = await leaderboard.getWeekly(currentGame.id, 10);
  const cycleLeaderboard = await leaderboard.getCycle(10);

  // Calculate countdown
  const now = Date.now();
  const diff = Math.max(0, Math.floor((nextRotation.getTime() - now) / 1000));
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;

  // Render leaderboards HTML
  const weeklyHtml = leaderboard.renderHtml(weeklyLeaderboard.leaderboard || [], 'weekly');
  const cycleHtml = leaderboard.renderHtml(cycleLeaderboard.leaderboard || [], 'cycle');

  // Render games grid
  const gamesGridHtml = games
    .all()
    .map((game) => {
      const isFeatured = game.id === currentGame.id;
      return `
                <div class="game-card ${isFeatured ? 'featured' : ''}" data-game="${game.id}">
                    <div class="game-icon">${game.icon}</div>
                    <h3 class="game-name">${escapeHtml(game.name)}</h3>
                    <p class="game-type">${escapeHtml(game.type)}</p>
                    <button class="btn game-play-btn" data-action="open-game" data-game="${game.id}">
                        Play
                    </button>
                </div>`;
    })
    .join('');

  // Generate hydration script
  const hydrationScript = generateHydrationScript();

  return `<!DOCTYPE html>
<html lang="en" style="background:#020812">
<head>
    <style>html{background:#020812!important}body{background:transparent!important}</style>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game of the Week | ASDF Ecosystem</title>
    <meta name="description" content="Play weekly games and compete for top scores. Token-gated gaming for $asdfasdfa holders.">
    <link rel="canonical" href="https://alonisthe.dev/games">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://alonisthe.dev/games">
    <meta property="og:title" content="ASDF Game of the Week - ${escapeHtml(currentGame.name)}">
    <meta property="og:description" content="${escapeHtml(currentGame.description)}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="ASDF Game of the Week - ${escapeHtml(currentGame.name)}">
    <meta name="twitter:description" content="${escapeHtml(currentGame.description)}">

    <!-- Styles -->
    <link rel="stylesheet" href="/css/games.css">
    <link rel="stylesheet" href="/css/games-arcade.css">

    <!-- Hydration Script (before other JS) -->
    ${hydrationScript}
</head>
<body class="arcade-page">
    <!-- Skip Link -->
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <!-- SSR Content (visible immediately) -->
    <main id="main-content">
        <!-- Featured Game Section -->
        <section class="featured-section" aria-labelledby="featured-title">
            <h1 id="featured-title" class="sr-only">Game of the Week</h1>

            <div class="featured-game">
                <div class="featured-icon" id="featured-game-icon">${currentGame.icon}</div>
                <h2 class="featured-name" id="featured-game-name">${escapeHtml(currentGame.name)}</h2>
                <p class="featured-desc" id="featured-game-desc">${escapeHtml(currentGame.description)}</p>
            </div>

            <!-- Countdown (SSR initial values, JS will update) -->
            <div class="countdown" role="timer" aria-label="Time until next game rotation">
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-days">${days}</span>
                    <span class="countdown-label">Days</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-hours">${padZero(hours)}</span>
                    <span class="countdown-label">Hours</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-mins">${padZero(mins)}</span>
                    <span class="countdown-label">Minutes</span>
                </div>
                <div class="countdown-item">
                    <span class="countdown-value" id="countdown-secs">${padZero(secs)}</span>
                    <span class="countdown-label">Seconds</span>
                </div>
            </div>

            <button class="btn btn-primary featured-play-btn" data-action="play-featured">
                Play Now
            </button>
        </section>

        <!-- Leaderboard Section (SSR) -->
        <section class="leaderboard-section" aria-labelledby="leaderboard-title">
            <h2 id="leaderboard-title">Leaderboards</h2>

            <div class="leaderboard-tabs" role="tablist">
                <button class="leaderboard-tab active" data-period="weekly" role="tab" aria-selected="true">
                    Weekly
                </button>
                <button class="leaderboard-tab" data-period="cycle" role="tab" aria-selected="false">
                    Cycle
                </button>
            </div>

            <div class="leaderboard-list active" id="weekly-leaderboard" role="tabpanel">
                ${weeklyHtml}
            </div>

            <div class="leaderboard-list" id="cycle-leaderboard" role="tabpanel">
                ${cycleHtml}
            </div>
        </section>

        <!-- Games Grid (SSR) -->
        <section class="games-section" id="games-section" aria-labelledby="games-title">
            <h2 id="games-title">All Games</h2>

            <div class="games-grid" id="games-grid">
                ${gamesGridHtml}
            </div>
        </section>

        <!-- Noscript Fallback -->
        <noscript>
            <div class="noscript-warning" style="padding: 2rem; text-align: center; background: #1a1a2e; color: #fff; margin: 2rem;">
                <h2>JavaScript Required</h2>
                <p>Please enable JavaScript to play games. The leaderboards and game info above are available without JavaScript.</p>
            </div>
        </noscript>
    </main>

    <!-- Game Modals Container (JS will populate) -->
    <div id="game-modals"></div>

    <!-- JavaScript (progressive enhancement) -->
    <script src="/js/games/core/container.js"></script>
    <script src="/js/games/core/facades.js"></script>
    <script src="/js/games/core/bootstrap.js"></script>
    <script src="/js/games/utils.js"></script>
    <script src="/js/games/config.js"></script>
    <script src="/js/games/state.js"></script>
    <script src="/js/games/api.js"></script>
    <script src="/js/games/ui/rotation.js"></script>
    <script src="/js/games/ui/leaderboard.js"></script>
    <script src="/js/games/ui/competitive.js"></script>
    <script src="/js/games/ui/grid.js"></script>
    <script src="/js/games/ui/modal.js"></script>
    <script src="/js/games/ui/index.js"></script>
    <script src="/js/games/engine.js"></script>
    <script src="/js/games/main.js"></script>
</body>
</html>`;
}

module.exports = { renderGamesPage };
